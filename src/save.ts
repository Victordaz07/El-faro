// Guardado local, misiones diarias y desbloqueo de zonas.
import { MPOOL, MKind, ZONES, UNLOCK_WAVE, ACHIEVEMENTS, PERM, LifeStats, LEVELS_PER_WORLD } from './data';

export interface Mission {
  kind: MKind;
  goal: number;
  reward: number;
  prog: number;
  claimed: boolean;
}

export interface Save {
  coral: number;
  zone: string;
  zoneBest: Record<string, number>;
  perm: Record<string, number>;
  muted: boolean;
  music: boolean;
  runs: number;
  daily: { date: string; list: Mission[]; bonus: boolean };
  stats: LifeStats;
  ach: string[];
  tut: number;
  name: string;
  challenge: { date: string; score: number; wave: number; zone: string } | null;
  /** Idioma elegido ('es' | 'en'); vacío = el del dispositivo. */
  lang?: string;
  /** Criaturas especiales cuya ficha ya se mostró. */
  seen?: string[];
  /** Experiencia total del farero. */
  xp?: number;
  /** Faro y luz elegidos en la colección. */
  skin?: string; beam?: string;
  /** Premio diario: próximo día de la racha (0-6) y fecha del último reclamado. */
  streak?: { day: number; last: string };
  /** Cofre del faro: momento (ms) desde que junta coral. */
  chestFrom?: number;
  /** Campaña: estrellas por nivel ('mundo-nivel', ej. '0-3'). */
  camp?: Record<string, number>;
  /** Récords de los modos: mejor resultado y estrellas. */
  modes?: Record<string, { best: number; stars: number }>;
}

const KEY = 'faro_tormenta_v2';

export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function rng(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/** Las mismas 3 misiones para todos en un día dado (semilla = fecha). */
export function makeDaily(date: string): Mission[] {
  const r = rng(date);
  const pool = [...MPOOL];
  const out: Mission[] = [];
  for (let i = 0; i < 3; i++) {
    const m = pool.splice(Math.floor(r() * pool.length), 1)[0];
    const g = Math.floor(r() * m.goals.length);
    out.push({ kind: m.kind, goal: m.goals[g], reward: m.rewards[g], prog: 0, claimed: false });
  }
  return out;
}

export function fresh(): Save {
  return {
    coral: 0, zone: 'bahia', zoneBest: {}, perm: {}, muted: false, music: true, runs: 0,
    daily: { date: '', list: [], bonus: false },
    stats: freshStats(), ach: [], tut: 0, name: '', challenge: null,
  };
}

export function load(): Save {
  const s = fresh();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      Object.assign(s, JSON.parse(raw));
      s.stats = Object.assign(freshStats(), s.stats || {});
      if (!s.stats.bestWave) s.stats.bestWave = Math.max(0, ...Object.values(s.zoneBest));
      if (s.runs > 0 && !s.tut) s.tut = 99; // jugador existente: sin tutorial
    } else {
      // migrar la versión 1 del prototipo
      const v1 = JSON.parse(localStorage.getItem('faro_tormenta_v1') || 'null');
      if (v1) {
        s.coral = +v1.coral || 0;
        s.zoneBest.bahia = +v1.best || 0;
        const p = v1.perm || {};
        for (const k of ['dmg', 'pearl', 'coral', 'start']) s.perm[k] = +p[k] || 0;
        s.perm.hull = +p.hull || 0;
      }
    }
  } catch { /* sin almacenamiento: se juega igual */ }
  ensureDaily(s);
  if (!s.chestFrom) s.chestFrom = Date.now();
  if (!s.camp) {
    // Jugadores que ya tenían récords: los mundos donde llegaron a la oleada 15 cuentan como superados
    s.camp = {};
    ZONES.forEach((z, i) => { if ((s.zoneBest[z.id] || 0) >= UNLOCK_WAVE) for (let n = 1; n <= LEVELS_PER_WORLD; n++) s.camp![i + '-' + n] = 1; });
  }
  return s;
}

export function persist(s: Save) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignorar */ }
}

export function ensureDaily(s: Save) {
  const d = today();
  if (s.daily.date !== d) s.daily = { date: d, list: makeDaily(d), bonus: false };
}

export function track(s: Save, kind: MKind, amount: number, isMax = false) {
  ensureDaily(s);
  for (const m of s.daily.list) {
    if (m.kind !== kind || m.claimed) continue;
    m.prog = isMax ? Math.max(m.prog, amount) : m.prog + amount;
  }
}

export const readyMissions = (s: Save) =>
  s.daily.list.filter(m => !m.claimed && m.prog >= m.goal).length +
  (!s.daily.bonus && s.daily.list.every(m => m.claimed) ? 1 : 0);

export function zoneUnlocked(s: Save, i: number) {
  return i === 0 || (s.zoneBest[ZONES[i - 1].id] || 0) >= UNLOCK_WAVE || levelUnlocked(s, i, 1);
}

/* ---------- Campaña ---------- */
export const starsOf = (s: Save, zi: number, n: number) => s.camp?.[zi + '-' + n] || 0;
/** Un nivel se abre al superar el anterior; el nivel 1 de un mundo, al superar el 10 del anterior. */
export function levelUnlocked(s: Save, zi: number, n: number): boolean {
  if (zi === 0 && n === 1) return true;
  return n === 1 ? starsOf(s, zi - 1, LEVELS_PER_WORLD) > 0 : starsOf(s, zi, n - 1) > 0;
}
/** Siguiente nivel por jugar: el primero abierto sin estrellas (o el último si ya están todos). */
export function nextLevel(s: Save) {
  for (let zi = 0; zi < ZONES.length; zi++) for (let n = 1; n <= LEVELS_PER_WORLD; n++)
    if (levelUnlocked(s, zi, n) && !starsOf(s, zi, n)) return { zi, n };
  return { zi: ZONES.length - 1, n: LEVELS_PER_WORLD };
}
/** El modo infinito se abre al superar el primer mundo. */
export const endlessUnlocked = (s: Save) => starsOf(s, 0, LEVELS_PER_WORLD) > 0;
export const totalStars = (s: Save) => Object.values(s.camp || {}).reduce((a, b) => a + b, 0);

export function freshStats(): LifeStats {
  return { kills: 0, bosses: 0, elites: 0, puffers: 0, crits: 0, runs: 0, cards: 0, time: 0, bestWave: 0, flashes: 0, dailyDone: 0, noScratch10: false, allTurrets: false };
}

export const researchTotal = (s: Save) => PERM.reduce((a, p) => a + (s.perm[p.id] || 0), 0);
export const zonesOpen = (s: Save) => ZONES.filter((_, i) => zoneUnlocked(s, i)).length;

/** Revisa logros nuevos, da su coral y devuelve los que se acaban de lograr. */
export function checkAchievements(s: Save) {
  const x = { research: researchTotal(s), zones: zonesOpen(s) };
  const got = [];
  for (const a of ACHIEVEMENTS) {
    if (s.ach.includes(a.id)) continue;
    const [v, g] = a.prog(s.stats, x);
    if (v >= g) { s.ach.push(a.id); s.coral += a.reward; got.push(a); }
  }
  return got;
}

/** Zona del desafío diario: rota entre las 3 primeras, igual para todos. */
export function challengeZone(date = today()) {
  let h = 0;
  for (const c of date) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return ZONES[h % 3];
}
export function challengeSeed(date = today()) {
  let h = 7;
  for (const c of date) h = (h * 131 + c.charCodeAt(0)) >>> 0;
  return h;
}

/* ---------- Cofre del faro ---------- */
import { chestRate, CHEST_HOURS } from './data';
/** Coral acumulado en el cofre, cuánto falta para llenarse (horas) y si está lleno. */
export function chestState(s: Save, now = Date.now()) {
  const h = Math.max(0, (now - (s.chestFrom || now)) / 3.6e6);
  const rate = chestRate(s.stats.bestWave || 0);
  const coral = Math.floor(Math.min(h, CHEST_HOURS) * rate);
  return { coral, full: h >= CHEST_HOURS, left: Math.max(0, CHEST_HOURS - h), max: Math.floor(CHEST_HOURS * rate) };
}
