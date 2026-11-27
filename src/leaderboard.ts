// Ranking con tres modos, en este orden:
// 1) Compartido en Claude (cuando el juego corre como artifact y la base de datos está disponible)
// 2) Firebase (cuando llenas src/firebase.config.ts: pensado para la app de Android/web propia)
// 3) Local (solo este dispositivo)
import { FIREBASE } from './firebase.config';

export interface Entry {
  name: string;
  best: number;
  zone: string;
  daily: { date: string; score: number; wave: number } | null;
}
export interface Row {
  id: string; name: string; best: number; zone: string;
  dailyDate: string; daily: number; dailyWave: number; me: boolean;
}
export interface Board {
  kind: 'claude' | 'firebase' | 'local';
  label: string;
  needsName: boolean;
  submit(e: Entry): Promise<void>;
  list(): Promise<Row[]>;
}

const num = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : 0);
const str = (v: unknown) => (typeof v === 'string' ? v.slice(0, 40) : '');

/* ---------- 1) Claude ---------- */
interface ClaudeDB {
  doc(p: string): { set(d: Record<string, unknown>): Promise<void> };
  collection(p: string): { limit(n: number): { get(): Promise<{ docs: { id: string; data(): Record<string, unknown> | undefined }[] }> } };
}
interface ClaudeUser { id(): Promise<string | null>; profiles(ids: string[]): Promise<Record<string, { name?: string }>>; }

async function claudeBoard(): Promise<Board | null> {
  const c = (window as unknown as { claude?: { use(n: string): Promise<unknown> } }).claude;
  if (!c || typeof c.use !== 'function') return null;
  const wait = <T>(p: Promise<T>) => Promise.race([p, new Promise<null>(r => setTimeout(() => r(null), 6000))]);
  try {
    const db = (await wait(c.use('db'))) as ClaudeDB | null;
    const user = (await wait(c.use('user'))) as ClaudeUser | null;
    if (!db || !user) return null;
    const me = await user.id();
    if (!me) return null;
    let last = '';
    return {
      kind: 'claude', label: 'Ranking compartido con quienes tienen este juego', needsName: false,
      async submit(e) {
        const body = { best: e.best, zone: e.zone, dailyDate: e.daily?.date || '', daily: e.daily?.score || 0, dailyWave: e.daily?.wave || 0 };
        const key = JSON.stringify(body);
        if (key === last) return; // escribir solo si cambió
        await db.doc('scores/' + me).set(body);
        last = key;
      },
      async list() {
        const snap = await db.collection('scores').limit(500).get();
        const ids = snap.docs.map(d => d.id);
        const ps = ids.length ? await user.profiles(ids).catch(() => ({} as Record<string, { name?: string }>)) : {};
        return snap.docs.map(d => {
          const v = d.data() || {};
          return {
            id: d.id, name: ps[d.id]?.name || 'Farero', best: num(v.best), zone: str(v.zone),
            dailyDate: str(v.dailyDate), daily: num(v.daily), dailyWave: num(v.dailyWave), me: d.id === me,
          };
        });
      },
    };
  } catch { return null; }
}

/* ---------- 2) Firebase (REST, sin SDK) ---------- */
const FB_KEY = 'faro_fb_auth';
async function fbAuth(): Promise<{ uid: string; token: string } | null> {
  try {
    const saved = JSON.parse(localStorage.getItem(FB_KEY) || 'null') as { uid: string; token: string; refresh: string; exp: number } | null;
    if (saved && saved.exp > Date.now() + 60000) return saved;
    let r: Response;
    if (saved?.refresh) {
      r = await fetch(`https://securetoken.googleapis.com/v1/token?key=${FIREBASE.apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(saved.refresh)}`,
      });
      const j = await r.json();
      if (!j.id_token) return null;
      const a = { uid: j.user_id, token: j.id_token, refresh: j.refresh_token, exp: Date.now() + Number(j.expires_in) * 1000 };
      localStorage.setItem(FB_KEY, JSON.stringify(a));
      return a;
    }
    r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE.apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }),
    });
    const j = await r.json();
    if (!j.idToken) return null;
    const a = { uid: j.localId, token: j.idToken, refresh: j.refreshToken, exp: Date.now() + Number(j.expiresIn) * 1000 };
    localStorage.setItem(FB_KEY, JSON.stringify(a));
    return a;
  } catch { return null; }
}

function firebaseBoard(): Board | null {
  if (!FIREBASE.apiKey || !FIREBASE.projectId) return null;
  const base = `https://firestore.googleapis.com/v1/projects/${FIREBASE.projectId}/databases/(default)/documents/scores`;
  type FV = { stringValue?: string; integerValue?: string; doubleValue?: number };
  const val = (f: FV | undefined) => (f?.integerValue ? Number(f.integerValue) : f?.doubleValue ?? 0);
  let me = '';
  return {
    kind: 'firebase', label: 'Ranking online (Firebase)', needsName: true,
    async submit(e) {
      const a = await fbAuth();
      if (!a) return;
      me = a.uid;
      const fields = {
        name: { stringValue: e.name.slice(0, 20) || 'Farero' }, best: { integerValue: String(e.best) }, zone: { stringValue: e.zone },
        dailyDate: { stringValue: e.daily?.date || '' }, daily: { integerValue: String(e.daily?.score || 0) }, dailyWave: { integerValue: String(e.daily?.wave || 0) },
      };
      await fetch(`${base}/${a.uid}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + a.token }, body: JSON.stringify({ fields }) });
    },
    async list() {
      const a = await fbAuth();
      if (a) me = a.uid;
      const r = await fetch(`${base}?pageSize=300`, { headers: a ? { Authorization: 'Bearer ' + a.token } : {} });
      const j = await r.json();
      return (j.documents || []).map((d: { name: string; fields: Record<string, FV> }) => {
        const id = d.name.split('/').pop()!, f = d.fields || {};
        return {
          id, name: str(f.name?.stringValue) || 'Farero', best: val(f.best), zone: str(f.zone?.stringValue),
          dailyDate: str(f.dailyDate?.stringValue), daily: val(f.daily), dailyWave: val(f.dailyWave), me: id === me,
        };
      });
    },
  };
}

/* ---------- 3) Local ---------- */
function localBoard(): Board {
  const KEY = 'faro_local_board';
  return {
    kind: 'local', label: 'Solo en este dispositivo', needsName: true,
    async submit(e) {
      try { localStorage.setItem(KEY, JSON.stringify(e)); } catch { /* ignorar */ }
    },
    async list() {
      try {
        const e = JSON.parse(localStorage.getItem(KEY) || 'null') as Entry | null;
        if (!e) return [];
        return [{ id: 'me', name: e.name || 'Tú', best: e.best, zone: e.zone, dailyDate: e.daily?.date || '', daily: e.daily?.score || 0, dailyWave: e.daily?.wave || 0, me: true }];
      } catch { return []; }
    },
  };
}

let boardP: Promise<Board> | null = null;
export function getBoard(): Promise<Board> {
  if (!boardP) boardP = (async () => (await claudeBoard()) || firebaseBoard() || localBoard())();
  return boardP;
}
