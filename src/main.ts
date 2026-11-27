// Controlador de interfaz: pantallas, panel de mejoras, HUD, tutorial y bucle principal.
import { levelOf, runXp, levelCoral, SKINS, BEAMS, STREAK, CHEST_HOURS, CREATURES, DEFS, tabName, branchName, BLESSINGS, PERM, BRANCHES, TABS, ZONES, MPOOL, DAILY_BONUS, UNLOCK_WAVE, HINTS, ACHIEVEMENTS, permCost, Zone } from './data';
import {
  load, persist, ensureDaily, track, zoneUnlocked, readyMissions, checkAchievements,
  researchTotal, zonesOpen, challengeZone, challengeSeed, today, chestState,
} from './save';
import { Game, GEvent, AIMS, TAP_MAX } from './game';
import '@fontsource/lilita-one/latin-400.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import '@fontsource/nunito/latin-900.css';
import { draw, camFocus, view, lastCam, setBeam, setSkin, skinnedFaro } from './render';
import { ICONS, TAB_ICONS } from './icons';
import { menuArt, bossArt } from './art';
import { initAudio, setMuted, sfx } from './audio';
import { startMusic, setMusicEnabled, setMusicLevel } from './music';
import { getBoard, Row } from './leaderboard';
import { setLang, detectLang, lang, t, L, num } from './i18n';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const save = load();
// #lang=en en la dirección sirve aunque no haya almacenamiento local
setLang(detectLang(/lang=(es|en)/.exec(location.hash)?.[1] || save.lang));
document.documentElement.lang = lang;
translateDom();
applyCosmetics();
setMuted(save.muted);
setMusicEnabled(save.music);
let g: Game | null = null;
let runZone: Zone = ZONES[0];
let introT = 0, introWave = -1;
/** Récord de la zona al empezar la partida (para avisar cuando se supera). */
let recordFrom = 0;
let comboShown = 0;
let tab = 0, rtab = 0, speed = 1, paused = false, last = 0, hudT = 0, bannerT = 0;
const cv = $<HTMLCanvasElement>('c'), ctx = cv.getContext('2d')!, stage = $('stage');
let vw = 360, vh = 400, dpr = 1;

const zone = () => ZONES.find(z => z.id === save.zone) || ZONES[0];
const best = () => Math.max(g?.daily ? 0 : save.zoneBest[runZone.id] || 0, g ? g.wave : 0);

function resize() {
  const r = stage.getBoundingClientRect();
  dpr = Math.min(2, window.devicePixelRatio || 1);
  vw = Math.max(1, r.width); vh = Math.max(1, r.height);
  cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
}
const spawnR = () => Math.hypot(vw, vh) / 2 / (Math.min(vw, vh) / 400) + 16;

/** Traduce los textos fijos de index.html (escritos en español). */
function translateDom() {
  if (lang === 'es') return;
  document.title = t('Faro en la Tormenta');
  const walk = (n: Node) => {
    if (n.nodeType === 3) { const v = n.nodeValue!.trim(); if (v) { const tr = t(v); if (tr !== v) n.nodeValue = n.nodeValue!.replace(v, tr); } }
    else n.childNodes.forEach(walk);
  };
  walk(document.body);
  document.querySelectorAll<HTMLInputElement>('[placeholder]').forEach(el => { el.placeholder = t(el.placeholder); });
  const h1 = document.querySelector('#menu h1');
  if (h1) h1.innerHTML = 'LIGHTHOUSE IN<br><em>THE STORM</em>';
}

function vibrate(ms: number) { try { navigator.vibrate?.(ms); } catch { /* sin vibración */ } }
function audio() { initAudio(); startMusic(); }

function banner(text: string, dur = 1.5) {
  const [head, ...rest] = text.split('\n');
  const b = $('banner');
  b.innerHTML = esc(head) + (rest.length ? '<small>' + esc(rest.join(' ')) + '</small>' : '');
  b.classList.add('on');
  bannerT = dur;
}

function toast(title: string, sub: string) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = esc(title) + '<small>' + esc(sub) + '</small>';
  const box = $('toasts');
  box.appendChild(t);
  while (box.children.length > 3) box.firstElementChild!.remove();
  setTimeout(() => t.remove(), 3200);
}

function achievements() {
  for (const a of checkAchievements(save)) { toast('🏆 ' + a.name, a.desc + ' · +' + a.reward + ' ◆'); sfx.ach(); }
  persist(save);
}

function onEvent(e: GEvent, d?: number) {
  switch (e) {
    case 'shot': sfx.shot(); break;
    case 'crit': sfx.crit(); break;
    case 'kill': sfx.kill(); break;
    case 'hurt': sfx.hurt(); vibrate(15); break;
    case 'wave': if (g && !g.daily && d && recordFrom > 0 && d === recordFrom + 1) { setTimeout(() => { banner(t('¡NUEVO RÉCORD!')); sfx.ach(); vibrate(60); }, 1300); }
      banner(t('OLEADA') + ' ' + d + (g?.mod ? '\n' + g.mod.name : '')); sfx.wave(); tutorialFor(d || 0); break;
    case 'boss': sfx.boss(); vibrate(150); break;
    case 'bossdown': banner(t('¡JEFE DERROTADO!')); sfx.bossdown(); vibrate(80); break;
    case 'flash': sfx.flash(); vibrate(40); break;
    case 'buy': sfx.buy(); break;
    case 'thunder': sfx.thunder(); break;
    case 'boom': sfx.boom(); vibrate(90); break;
    case 'enrage': sfx.enrage(); banner(L('¡' + runZone.boss + ' FURIOSO!', runZone.boss + ' ENRAGED!')); vibrate(200); break;
    case 'elite': sfx.elite(); break;
    case 'harpoon': sfx.harpoon(); break;
    case 'net': sfx.net(); break;
    case 'slam': sfx.slam(); break;
    case 'zap': sfx.zap(); vibrate(25); break;
    case 'charge': sfx.charge(); break;
    case 'bite': sfx.bite(); break;
    case 'tap': sfx.tap(); vibrate(8); break;
    case 'combo': sfx.coin(); vibrate(20); break;
    case 'reveal': {
      const ups = DEFS.filter(x => x.at === d && g && !g.lv[x.id]);
      ups.forEach(x => freshUps.add(x.id));
      const newTab = ups.some(x => DEFS.filter(y => y.tab === x.tab).every(y => y.at >= (d || 0)));
      setTimeout(() => {
        toast('🆕 ' + (ups.length > 1 ? t('NUEVAS MEJORAS') : t('NUEVA MEJORA')), ups.map(x => x.name).join(' · '));
        sfx.card();
        if (newTab) $('dock').classList.remove('closed');
        updatePanel();
      }, 1500);
      break;
    }
    case 'tapmiss': sfx.tapmiss(); break;
    case 'heal': sfx.heal(); break;
    case 'crack': sfx.crack(); vibrate(30); break;
    case 'fire': sfx.fire(); break;
    case 'poison': sfx.poison(); break;
    case 'newtype': newCreature(d || 0); break;
    case 'frostwarn': sfx.warn(); $('frostw').style.display = 'block'; break;
    case 'frost': sfx.frost(); $('frostw').style.display = 'none'; vibrate(60); break;
    case 'erupt': sfx.erupt(); vibrate(30); break;
    case 'revive': sfx.revive(); banner(t('¡SEGUNDA LLAMA!')); vibrate(200); break;
    case 'cards': showCards(); break;
    case 'over': endRun(); break;
  }
}

/* ---------- Partida ---------- */
function start(daily = false) {
  stopHold();
  audio();
  hideAll();
  paused = false; $('pause').textContent = 'II';
  resize();
  comboShown = 0; $('combo').classList.remove('on');
  freshUps.clear(); tab = 0;
  if (daily) {
    if (save.challenge?.date === today()) return showMenu();
    runZone = challengeZone();
    save.challenge = { date: today(), score: 0, wave: 0, zone: runZone.id };
    persist(save);
    g = new Game(save, runZone, onEvent, spawnR, { daily: true, seed: challengeSeed() });
    recordFrom = 0;
  } else {
    recordFrom = save.zoneBest[zone().id] || 0;
    runZone = zone();
    g = new Game(save, runZone, onEvent, spawnR);
  }
  for (const id of ['flash', 'aim', 'taps']) $(id).style.display = '';
  $('frostw').style.display = 'none';
  $('aim').querySelector('span')!.textContent = AIMS[0].name;
  tab = 0;
  $('dock').classList.remove('closed');
  setMusicLevel(1);
  introT = 0; introWave = -1; camFocus.x = camFocus.y = 0; camFocus.z = 1; stage.classList.remove('cine');
  updatePanel(); updateHud();
  if (save.tut === 0) setTimeout(() => tutorialFor(0), 400);
}

function endRun() {
  stopHold();
  if (!g) return;
  const z = runZone, zi = ZONES.indexOf(z);
  const nextWasOpen = zi + 1 < ZONES.length && zoneUnlocked(save, zi + 1);
  const prevBest = g.daily ? 0 : save.zoneBest[z.id] || 0;
  const S = save.stats;
  save.coral += g.earned;
  if (!g.daily) save.zoneBest[z.id] = Math.max(prevBest, g.wave);
  save.runs++;
  S.runs++; S.kills += g.kills; S.bosses += g.bosses; S.elites += g.elites; S.puffers += g.puffers;
  S.crits += g.crits; S.cards += g.cards; S.flashes += g.flashes; S.time += g.t;
  S.bestWave = Math.max(S.bestWave, g.daily ? 0 : g.wave);
  if (g.wave > 10 && g.hpLost10 === 0) S.noScratch10 = true;
  if (g.allTurrets) S.allTurrets = true;
  track(save, 'kills', g.kills); track(save, 'boss', g.bosses); track(save, 'buys', g.buys);
  track(save, 'crits', g.crits); track(save, 'flash', g.flashes); track(save, 'runs', 1);
  track(save, 'wave', g.wave, true);
  if (g.daily && save.challenge) {
    save.challenge.score = g.score; save.challenge.wave = g.wave;
    S.dailyDone++;
  }
  persist(save);
  sfx.over();
  setMusicLevel(0);
  $('flash').style.display = 'none';
  $('aim').style.display = 'none';
  $('taps').style.display = 'none';
  $('frostw').style.display = 'none';
  let html: string;
  if (g.daily) {
    $('overtitle').textContent = t('DESAFÍO TERMINADO');
    html = L(`${z.name} · oleada <b>${g.wave}</b> · ${g.kills} criaturas<br>Puntuación: <b style="color:#ffd166">${num(g.score)}</b><br>Mañana hay un desafío nuevo.`,
      `${z.name} · wave <b>${g.wave}</b> · ${g.kills} creatures<br>Score: <b style="color:#ffd166">${num(g.score)}</b><br>A new challenge comes tomorrow.`);
  } else {
    $('overtitle').textContent = t('EL FARO SE APAGÓ');
    html = L(`${z.name} · llegaste a la <b>oleada ${g.wave}</b>`, `${z.name} · you reached <b>wave ${g.wave}</b>`) +
      (g.wave > prevBest ? L(' <b style="color:#35e0b0">¡nuevo récord!</b>', ' <b style="color:#35e0b0">new best!</b>') : L(`<br>Récord: ${prevBest}`, `<br>Best: ${prevBest}`));
  }
  if (!g.daily && g.wave <= prevBest && prevBest - g.wave <= 3)
    html += L(`<br><b style="color:#7ff0e0">¡Te faltaron ${prevBest - g.wave + 1} oleada${prevBest - g.wave ? 's' : ''} para tu récord!</b>`, `<br><b style="color:#7ff0e0">Just ${prevBest - g.wave + 1} more wave${prevBest - g.wave ? 's' : ''} to beat your best!</b>`);
  html += L(`<br>${g.kills} criaturas · ${g.bosses} jefes · ${g.elites} élites · combo máximo ×${g.bestCombo}` +
    `<br>Coral ganado: <b style="color:#ffb35c">+<span id="overcoral">0</span> ◆</b>`,
    `<br>${g.kills} creatures · ${g.bosses} bosses · ${g.elites} elites · best combo ×${g.bestCombo}` +
    `<br>Coral earned: <b style="color:#ffb35c">+<span id="overcoral">0</span> ◆</b>`);
  // Experiencia del farero y desbloqueos
  const before = levelOf(save.xp || 0), gained = runXp(g.wave, g.kills, g.bosses);
  save.xp = (save.xp || 0) + gained;
  const after = levelOf(save.xp);
  let lvCoral = 0;
  const unlocked: string[] = [];
  for (let lv = before.lv + 1; lv <= after.lv; lv++) {
    lvCoral += levelCoral(lv);
    for (const k of [...SKINS, ...BEAMS]) if (k.lv === lv) unlocked.push(k.name);
  }
  save.coral += lvCoral;
  persist(save);
  html += `<div class="xpbox" style="margin:10px auto 0">${L('Farero', 'Keeper')} · <b>${L('Nivel', 'Level')} ${after.lv}</b> · +${gained} XP` +
    `<div class="prog"><div id="overxp" style="width:${after.lv > before.lv ? 0 : (before.rest / before.need) * 100}%"></div></div>` +
    (after.lv > before.lv ? `<div class="unl">⬆ ${L('¡Subiste al nivel', 'Level up!')} ${after.lv}${L('!', '')} +${lvCoral} ◆` +
      (unlocked.length ? `<br>🔓 ${L('Desbloqueaste', 'Unlocked')}: ${unlocked.map(esc).join(', ')}` : '') + '</div>'
    : `<div style="margin-top:6px">${L('Siguiente nivel en', 'Next level in')} ${after.need - after.rest} XP</div>`) + '</div>';
  if (!g.daily && !nextWasOpen && zi + 1 < ZONES.length && zoneUnlocked(save, zi + 1))
    html += L(`<br><br><b style="color:#ffe27a">🗺️ ¡Desbloqueaste ${ZONES[zi + 1].name}!</b>`, `<br><br><b style="color:#ffe27a">🗺️ You unlocked ${ZONES[zi + 1].name}!</b>`);
  const ready = readyMissions(save);
  if (ready) html += L(`<br><br>🎯 ${ready} misión${ready > 1 ? 'es' : ''} lista${ready > 1 ? 's' : ''} para reclamar`, `<br><br>🎯 ${ready} mission${ready > 1 ? 's' : ''} ready to claim`);
  $('overinfo').innerHTML = html;
  setTimeout(() => {
    const oc = document.getElementById('overcoral'); if (oc) countUp(oc, g ? g.earned : 0);
    const ox = document.getElementById('overxp'); if (ox) ox.style.width = (after.rest / after.need) * 100 + '%';
    if (after.lv > before.lv) { sfx.ach(); vibrate(60); }
  }, 800);
  updateBadges();
  achievements();
  submitScore();
  setTimeout(() => $('over').classList.add('on'), 700);
}

/* ---------- Progresión: nivel de farero, colección, premio diario y cofre ---------- */
function applyCosmetics() {
  setSkin(SKINS.find(k => k.id === save.skin) || SKINS[0]);
  setBeam((BEAMS.find(b => b.id === save.beam) || BEAMS[0]).rgb);
}
const unlockedCount = (lv: number) => SKINS.filter(k => k.lv <= lv).length + BEAMS.filter(b => b.lv <= lv).length;
function levelUI() {
  const L0 = levelOf(save.xp || 0);
  $('lvlnum').textContent = String(L0.lv);
  $('lvltxt').textContent = L('FARERO · NIVEL ', 'KEEPER · LEVEL ') + L0.lv;
  $('lvlbar').style.width = (L0.rest / L0.need) * 100 + '%';
  const seenC = (save.seen || []).filter(x => x.startsWith('c:')).length;
  const b = $('collbadge'), n = unlockedCount(L0.lv) - Math.max(2, seenC);
  b.textContent = n > 0 ? String(n) : ''; b.classList.toggle('on', n > 0);
}
function chestUI() {
  const c = chestState(save), btn = $('chest');
  btn.classList.toggle('ready', c.coral >= 5);
  $('chesttxt').textContent = L('Cofre del faro: ', 'Lighthouse chest: ') + c.coral + ' / ' + c.max + ' ◆';
  const h = Math.floor(c.left), m = Math.floor((c.left - h) * 60);
  $('chestsub').textContent = c.full ? L('¡Lleno! Tócalo para abrirlo', 'Full! Tap to open it')
    : c.coral >= 5 ? L(`Tócalo para abrirlo · se llena en ${h}h ${m}m`, `Tap to open it · full in ${h}h ${m}m`)
    : L(`Junta coral mientras no juegas · se llena en ${h}h ${m}m`, `Fills up while you're away · full in ${h}h ${m}m`);
  $('chestbar').style.width = Math.min(100, (c.coral / Math.max(1, c.max)) * 100) + '%';
}
setInterval(() => { if ($('menu').classList.contains('on')) chestUI(); }, 5000);
$('chest').addEventListener('click', () => {
  audio();
  const c = chestState(save);
  if (c.coral < 5) { sfx.click(); toast('🎁 ' + t('Cofre del faro'), L('Todavía está casi vacío. Vuelve en un rato.', 'Still almost empty. Come back later.')); return; }
  save.coral += c.coral; save.chestFrom = Date.now(); persist(save);
  sfx.coin(); vibrate(30);
  toast('🎁 +' + c.coral + ' ◆', L('El faro juntó coral mientras no estabas', 'The lighthouse gathered coral while you were away'));
  showMenu();
});

/** Premio diario: 7 días que se repiten. Se muestra una vez al día al abrir el menú. */
function dailyPending() { return (save.streak?.last || '') !== today(); }
function showDaily() {
  const st = save.streak || { day: 0, last: '' };
  const box = $('days'); box.innerHTML = '';
  STREAK.forEach((v, i) => {
    const d = document.createElement('div');
    d.className = (i < st.day ? 'done' : i === st.day ? 'now' : '') + (i === 6 ? ' big7' : '');
    d.innerHTML = `${L('DÍA', 'DAY')} ${i + 1}<b>${i === 6 ? '🎁 ' : ''}${v} ◆</b>`;
    box.appendChild(d);
  });
  $('dailyrwinfo').textContent = L('Vuelve cada día: el premio crece hasta el día 7. Si faltas un día no pierdes tu avance.', 'Come back every day: the reward grows until day 7. Missing a day does not reset your progress.');
  hideAll(); $('dailyrw').classList.add('on');
}
$('dailyclaim').addEventListener('click', () => {
  audio();
  const st = save.streak || { day: 0, last: '' };
  if (st.last !== today()) {
    const v = STREAK[st.day];
    save.coral += v;
    save.streak = { day: (st.day + 1) % STREAK.length, last: today() };
    persist(save);
    sfx.ach(); vibrate(40);
    toast('🎁 +' + v + ' ◆', L(`Premio del día ${st.day + 1}`, `Day ${st.day + 1} reward`));
  }
  showMenu();
});

/** Colección: faros y colores de luz que se desbloquean por nivel. */
function buildColl() {
  const lv = levelOf(save.xp || 0).lv;
  $('collinfo').innerHTML = L(`Sube de nivel jugando para desbloquear más. Nivel actual: <b>${lv}</b>`, `Level up by playing to unlock more. Current level: <b>${lv}</b>`);
  save.seen = save.seen || [];
  const mark = (id: string) => { if (!save.seen!.includes('c:' + id)) save.seen!.push('c:' + id); };
  const sg = $('skingrid'); sg.innerHTML = '';
  for (const k of SKINS) {
    const open = k.lv <= lv, on = (save.skin || 'clasico') === k.id;
    if (open) mark(k.id);
    const b = document.createElement('button');
    b.className = (on ? 'on' : '') + (open ? '' : ' lock');
    const cv2 = document.createElement('canvas'); cv2.width = 104; cv2.height = 128;
    b.appendChild(cv2);
    const draw2 = () => {
      const x = cv2.getContext('2d')!, img = skinnedFaro(k) as HTMLImageElement | HTMLCanvasElement;
      const w = (img as HTMLImageElement).naturalWidth || (img as HTMLCanvasElement).width, h = (img as HTMLImageElement).naturalHeight || (img as HTMLCanvasElement).height;
      if (!w) return;
      const sc = Math.min(100 / w, 124 / h);
      x.clearRect(0, 0, 104, 128); x.drawImage(img, (104 - w * sc) / 2, 128 - h * sc, w * sc, h * sc);
    };
    draw2(); setTimeout(draw2, 300);
    b.insertAdjacentHTML('beforeend', `${esc(k.name)}<small>${open ? (on ? L('En uso', 'In use') : L('Elegir', 'Choose')) : '🔒 ' + L('Nivel ', 'Level ') + k.lv}</small>`);
    b.addEventListener('click', () => { if (!open) { sfx.click(); return; } save.skin = k.id; persist(save); applyCosmetics(); sfx.card(); buildColl(); });
    sg.appendChild(b);
  }
  const bg = $('beamgrid'); bg.innerHTML = '';
  for (const k of BEAMS) {
    const open = k.lv <= lv, on = (save.beam || 'calida') === k.id;
    if (open) mark(k.id);
    const b = document.createElement('button');
    b.className = (on ? 'on' : '') + (open ? '' : ' lock');
    b.innerHTML = `<i class="sw" style="background:radial-gradient(circle,rgb(${k.rgb}) 0%,rgba(${k.rgb},.55) 35%,rgba(${k.rgb},0) 70%)"></i>${esc(k.name)}<small>${open ? (on ? L('En uso', 'In use') : L('Elegir', 'Choose')) : '🔒 ' + L('Nivel ', 'Level ') + k.lv}</small>`;
    b.addEventListener('click', () => { if (!open) { sfx.click(); return; } save.beam = k.id; persist(save); applyCosmetics(); sfx.card(); buildColl(); });
    bg.appendChild(b);
  }
  persist(save);
  levelUI();
}
$('collbtn').addEventListener('click', () => { buildColl(); open('coll'); });

/** Cuenta un número hacia arriba en un elemento (pantalla final). */
function countUp(el: HTMLElement, to: number, ms = 900) {
  const t0 = performance.now();
  const step = (now: number) => {
    const k = Math.min(1, (now - t0) / ms);
    el.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 3))));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------- Criaturas nuevas: ficha la primera vez que aparecen ---------- */
let tipKind: 'tut' | 'creature' = 'tut';
function newCreature(i: number) {
  const c = CREATURES[i];
  if (!c || !g) return;
  save.seen = save.seen || [];
  if (save.seen.includes(c.id)) return;
  save.seen.push(c.id); persist(save);
  sfx.newtype();
  if ($('tip').classList.contains('on')) { toast('🆕 ' + c.name, c.desc); return; }
  tipKind = 'creature';
  showTip(t('NUEVA CRIATURA') + ': ' + c.name, c.desc, '');
}

/* ---------- Tocar criaturas ---------- */
cv.addEventListener('pointerdown', ev => {
  if (!g || paused || g.over || introT > 0) return;
  const r = cv.getBoundingClientRect();
  const x = (ev.clientX - r.left - lastCam.x) / lastCam.s, y = (ev.clientY - r.top - lastCam.y) / lastCam.s;
  audio();
  g.tapAt(x, y);
});
const tapDots: HTMLElement[] = [];
for (let i = 0; i < TAP_MAX; i++) { const d = document.createElement('i'); $('taps').appendChild(d); tapDots.push(d); }

/* ---------- Tutorial ---------- */
const TUT: { title: string; text: string; target: string; at: number }[] = [
  { at: 0, title: 'Las perlas ● compran mejoras', text: 'Tu faro dispara solo. Toca una mejora para comprarla; mantén presionado para comprar varias.', target: '#sheet' },
  { at: 1, title: '¡Toca a las criaturas!', text: 'Tú también puedes golpear: toca una criatura. Los puntos sobre OBJETIVO son tus toques; se recargan solos.', target: '#aim' },
  { at: 2, title: 'El Destello ⚡', text: 'Aturde y daña a todo lo que esté cerca. Guárdalo para cuando te rodeen o para el jefe.', target: '#flash' },
  { at: 3, title: 'Elige a quién disparar', text: 'Toca OBJETIVO para cambiar. PELIGRO prioriza peces globo, anguilas, élites y jefes.', target: '#aim' },
  { at: 5, title: 'Bendiciones', text: 'Cada 5 oleadas eliges una carta que dura toda la partida. Combínalas con tus mejoras.', target: '' },
  { at: 6, title: 'Torretas en la isla', text: 'En la pestaña ISLA construyes un Arponero, un Lanzarredes y un Ancla que disparan solos.', target: '#tabs' },
];
function tutorialFor(wave: number) {
  if (!g || g.daily) return;
  if (save.tut >= TUT.length) {
    // Jugadores que ya hicieron el tutorial: aviso único del toque
    save.seen = save.seen || [];
    if (wave >= 1 && !save.seen.includes('_tap')) {
      save.seen.push('_tap'); persist(save);
      tipKind = 'creature';
      showTip(TUT[1].title, TUT[1].text, TUT[1].target);
    }
    return;
  }
  const step = TUT[save.tut];
  tipKind = 'tut';
  if (step.at > wave || step.at === 5) return;
  showTip(step.title, step.text, step.target);
}
function showTip(title: string, text: string, target: string) {
  paused = true;
  const tip = $('tip');
  $('tiptitle').textContent = t(title);
  $('tiptext').textContent = t(text);
  tip.classList.add('on');
  tip.classList.remove('up', 'down');
  const app = $('app').getBoundingClientRect();
  const el = target ? document.querySelector(target) : null;
  if (el) {
    const r = el.getBoundingClientRect();
    const th = tip.offsetHeight || 130;
    const above = r.top - app.top > th + 20;
    tip.style.top = (above ? r.top - app.top - th - 12 : r.bottom - app.top + 12) + 'px';
    tip.classList.add(above ? 'down' : 'up');
    tip.style.setProperty('--ax', Math.max(20, Math.min(app.width - 44, r.left - app.left + r.width / 2 - 12)) + 'px');
  } else tip.style.top = '30%';
}
$('tipok').addEventListener('click', () => {
  $('tip').classList.remove('on');
  if (tipKind === 'tut') save.tut++;
  tipKind = 'tut';
  persist(save);
  paused = false;
  sfx.click();
});

/* ---------- Cartas ---------- */
function showCards() {
  if (!g) return;
  sfx.card();
  const list = $('cardlist'); list.innerHTML = '';
  for (const b of g.cardOpts) {
    const el = document.createElement('button');
    el.className = 'bcard';
    const lv = g.bl[b.id];
    el.innerHTML = `<div class="ic">${b.icon}</div><div><b>${esc(b.name)}</b><span>${esc(b.desc)}</span>${lv ? `<br><em>${L(`YA TIENES ${lv} · SE ACUMULA`, `YOU HAVE ${lv} · STACKS`)}</em>` : ''}</div>`;
    el.addEventListener('click', () => {
      if (!g) return;
      g.pickCard(b.id); sfx.buy();
      $('cards').classList.remove('on');
      toast(b.icon + ' ' + b.name, t('Bendición activa'));
      if (TUT[save.tut]?.at === 5) { save.tut++; persist(save); }
      updatePanel(); updateHud();
    });
    list.appendChild(el);
  }
  const rr = $('reroll');
  rr.style.display = g.rerolls > 0 ? '' : 'none';
  rr.textContent = `${t('RE-TIRAR')} (${g.rerolls})`;
  $('cards').classList.add('on');
}
$('reroll').addEventListener('click', () => { if (g?.reroll()) showCards(); });

/* ---------- Panel de mejoras ---------- */
interface Btn { id: string; tab: number; el: HTMLElement; n: HTMLElement; lv: HTMLElement; v: HTMLElement; k: HTMLElement; }
const btns: Btn[] = [];

/*
 * Mantener presionado para comprar varias veces.
 * Solo existe UNA repetición activa en todo el juego: un toque nuevo (otro dedo,
 * doble toque) detiene la anterior. La repetición también se detiene sola si una
 * compra falla, si la tarjeta deja de verse, al soltar en cualquier parte, al
 * perder el foco o tras unos segundos. Así nunca puede quedar comprando sola.
 */
let holdStop: (() => void) | null = null;
const stopHold = () => holdStop?.();

function holdToBuy(el: HTMLElement, onPress: () => void, buyOnce: () => boolean) {
  // Toque = una compra · deslizar = mover la fila · dedo quieto 0.38 s = compra repetida
  el.addEventListener('pointerdown', ev => {
    stopHold();
    audio();
    const x0 = ev.clientX, y0 = ev.clientY;
    let to = 0, iv = 0, n = 0, repeating = false, moved = false;
    const stop = () => {
      clearTimeout(to);
      clearInterval(iv);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      if (holdStop === stop) holdStop = null;
    };
    const move = (e: PointerEvent) => { if (Math.hypot(e.clientX - x0, e.clientY - y0) > 8) { moved = true; if (!repeating) stop(); } };
    const up = () => { if (!repeating && !moved) { onPress(); buyOnce(); } stop(); };
    holdStop = stop;
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    to = window.setTimeout(() => {
      if (moved) return;
      repeating = true;
      onPress();
      if (!buyOnce()) return stop();
      iv = window.setInterval(() => {
        if (++n > 60 || el.offsetParent === null || !buyOnce()) stop();
      }, 90);
    }, 380);
  });
  for (const t of ['pointercancel', 'lostpointercapture', 'pointerleave']) el.addEventListener(t, stopHold);
}
for (const t of ['pointerup', 'pointercancel', 'blur']) window.addEventListener(t, stopHold);
document.addEventListener('visibilitychange', stopHold);

let hintTo = 0;
function showHint(html: string) {
  const h = $('hint');
  h.innerHTML = html;
  h.classList.add('show');
  clearTimeout(hintTo);
  hintTo = window.setTimeout(() => h.classList.remove('show'), 2200);
}

function buildPanel() {
  const grid = $('grid');
  for (const d of DEFS) {
    const el = document.createElement('button');
    el.className = 'up t' + d.tab;
    el.innerHTML = '<div class="top"><div class="ic">' + (ICONS[d.id] || '') + '<em class="lv"></em></div><div class="n"></div></div><div class="v"></div><div class="k"></div>';
    holdToBuy(el, () => {
      showHint('<b>' + d.name + ':</b> ' + (HINTS[d.id] || L('mejora de ', 'upgrade: ') + tabName(d.tab).toLowerCase()));
    }, () => {
      if (!g || paused || g.over) return false;
      const ok = g.buy(d.id);
      if (ok) { freshUps.delete(d.id); updatePanel(); updateHud(); }
      return ok;
    });
    el.style.display = d.tab === 0 ? '' : 'none';
    grid.appendChild(el);
    const q = (sel: string) => el.querySelector(sel) as HTMLElement;
    btns.push({ id: d.id, tab: d.tab, el, n: q('.n'), lv: q('.lv'), v: q('.v'), k: q('.k') });
  }
  TABS.forEach((_, i) => {
    const b = document.createElement('button');
    b.className = 'tab'; b.innerHTML = TAB_ICONS[i] + '<span>' + tabName(i) + '</span><span class="dot"></span>';
    b.addEventListener('click', () => {
      stopHold();
      sfx.click();
      const dock = $('dock');
      if (!tabOpen(i)) return;
      for (const d of DEFS) if (d.tab === tab && tab !== i) freshUps.delete(d.id);
      if (tab === i && !dock.classList.contains('closed')) dock.classList.add('closed');
      else { tab = i; dock.classList.remove('closed'); }
      updatePanel();
    });
    $('tabs').appendChild(b);
  });
}

/** Mejoras que acaban de aparecer (llevan la etiqueta NUEVO hasta que se compran o se mira su pestaña). */
const freshUps = new Set<string>();
const tabOpen = (i: number) => !!g && DEFS.some(d => d.tab === i && g!.isOpen(d.id));

function updatePanel() {
  if (!g) return;
  if (!tabOpen(tab)) tab = 0;
  for (const o of btns) {
    const show = o.tab === tab && g.isOpen(o.id);
    o.el.classList.toggle('new', freshUps.has(o.id));
    o.el.style.display = show ? '' : 'none';
    if (!show) continue;
    const d = DEFS.find(x => x.id === o.id)!;
    const key = d.id as keyof typeof g.st;
    const c = g.cost(d.id);
    o.n.textContent = d.name;
    o.lv.textContent = g.lv[d.id] ? String(g.lv[d.id]) : '';
    o.v.innerHTML = d.fmt(g.st[key]) + ' <i>→ ' + d.fmt(g.preview(d.id)[key]) + '</i>';
    o.k.textContent = String(c);
    o.el.classList.toggle('off', g.pearls < c);
    o.el.classList.toggle('ready', g.pearls >= c);
  }
  [...$('tabs').children].forEach((el, i) => {
    el.classList.toggle('on', i === tab);
    const open = tabOpen(i);
    el.classList.toggle('hid', !open);
    const can = open && DEFS.some(d => d.tab === i && g!.isOpen(d.id) && g!.pearls >= g!.cost(d.id));
    const isNew = DEFS.some(d => d.tab === i && freshUps.has(d.id));
    el.querySelector('.dot')!.classList.toggle('on', (can || isNew) && i !== tab);
  });
}

function updateHud() {
  if (!g) return;
  $('wave').firstChild!.nodeValue = t('OLEADA') + ' ' + Math.max(1, g.wave);
  $('best').textContent = (g.daily ? L('⭐ Desafío · ', '⭐ Challenge · ') : '') + runZone.name + (g.daily ? ' · ' + num(g.score) + ' pts' : L(' · Récord ', ' · Best ') + best());
  $('pearls').textContent = String(g.pearls);
  tapDots.forEach((d, i) => d.classList.toggle('off', i >= Math.floor(g!.taps)));
  const cb = $('combo');
  if (g.combo >= 3) {
    if (g.combo !== comboShown) { cb.textContent = 'COMBO ×' + g.combo; cb.classList.remove('pop'); void cb.offsetWidth; cb.classList.add('pop'); comboShown = g.combo; }
    cb.classList.add('on');
  } else { cb.classList.remove('on'); comboShown = 0; }
  $('coral').textContent = String(Math.floor(g.coral));
  const st = g.st, p = Math.max(0, g.hp) / st.hp;
  $('hpfill').style.width = p * 100 + '%';
  $('hpfill').className = p > 0.6 ? 'ok' : p > 0.3 ? 'mid' : '';
  $('hpt').textContent = L('Faro ', 'Lighthouse ') + Math.ceil(Math.max(0, g.hp)) + ' / ' + Math.round(st.hp);
  $('sht').textContent = st.bar > 0 ? t('Barrera') + ' ' + Math.ceil(g.shield) + ' / ' + Math.round(st.bar) : '';
  $('shfill').style.width = st.bar > 0 ? (g.shield / st.bar) * 100 + '%' : '0';
  $('wprog').style.width = g.waveProgress * 100 + '%';
  const md = $('mod');
  if (g.mod) { md.style.display = 'block'; md.className = g.mod.good ? 'good' : ''; md.innerHTML = g.mod.name + ' <i>· ' + g.mod.desc + '</i>'; } else md.style.display = 'none';
  const boss = g.boss;
  $('boss').style.display = boss ? 'block' : 'none';
  $('boss').classList.toggle('on', !!boss);
  if (boss) { $('bossname').textContent = runZone.boss + (boss.enraged ? L(' · FURIOSO', ' · ENRAGED') : ''); $('bossfill').style.width = Math.max(0, (boss.hp / boss.max) * 100) + '%'; }
  setMusicLevel(boss ? 2 : 1);
  const fb = $('flash');
  fb.style.setProperty('--p', String(1 - g.flashCd / g.flashMax));
  fb.classList.toggle('cd', g.flashCd > 0);
  fb.querySelector('small')!.textContent = g.flashCd > 0 ? Math.ceil(g.flashCd) + 's' : 'DESTELLO';
}

/* ---------- Pantallas ---------- */
const OVS = ['menu', 'over', 'shop', 'map', 'missions', 'pauseov', 'cards', 'achs', 'rank', 'coll', 'dailyrw'];
let backTo = 'menu';
function hideAll() { OVS.forEach(i => $(i).classList.remove('on')); }
function open(id: string, from = 'menu') { audio(); sfx.click(); hideAll(); backTo = from; $(id).classList.add('on'); }

function showMenu() {
  g = null;
  introT = 0; camFocus.x = camFocus.y = 0; camFocus.z = 1; stage.classList.remove('cine');
  setMusicLevel(0);
  for (const id of ['flash', 'aim', 'taps', 'frostw', 'mod', 'boss']) $(id).style.display = 'none';
  const z = zone();
  $('menuinfo').innerHTML = `${L('Zona', 'Zone')}: <b>${z.name}</b> · ${L('Récord', 'Best')}: <b>${save.zoneBest[z.id] || 0}</b> · Coral: <b style="color:#ffb35c">${Math.floor(save.coral)} ◆</b>`;
  $('mute').textContent = save.muted ? '🔇' : '🔊';
    $('mus').style.opacity = save.music ? '1' : '.5';
  const cz = challengeZone(), done = save.challenge?.date === today();
  const dbtn = $<HTMLButtonElement>('daily');
  dbtn.disabled = done;
  $('dailyinfo').textContent = done
    ? L(`Hoy: oleada ${save.challenge!.wave} · ${num(save.challenge!.score)} pts · vuelve mañana`, `Today: wave ${save.challenge!.wave} · ${num(save.challenge!.score)} pts · come back tomorrow`)
    : L(`${cz.name} · un solo intento · igual para todos`, `${cz.name} · one try · same for everyone`);
  updateBadges();
  levelUI();
  chestUI();
  hideAll();
  $('menu').classList.add('on');
  if (dailyPending() && save.runs > 0) setTimeout(() => { if ($('menu').classList.contains('on')) showDaily(); }, 500);
}

function updateBadges() {
  ensureDaily(save);
  const n = readyMissions(save);
  for (const id of ['misbadge', 'misbadge2']) { const b = $(id); b.textContent = String(n); b.classList.toggle('on', n > 0); }
}

function buildShop() {
  $('shopcoral').innerHTML = `${L('Coral disponible', 'Coral available')}: <b style="color:#ffb35c">${Math.floor(save.coral)} ◆</b>`;
  const tabs = $('rtabs'); tabs.innerHTML = '';
  BRANCHES.forEach((_, i) => {
    const el = document.createElement('button');
    el.textContent = branchName(i); el.className = i === rtab ? 'on' : '';
    el.addEventListener('click', () => { rtab = i; sfx.click(); buildShop(); });
    tabs.appendChild(el);
  });
  const list = $('shoplist'); list.innerHTML = '';
  for (const p of PERM.filter(x => x.branch === rtab)) {
    const lv = save.perm[p.id] || 0, maxed = lv >= p.max, c = permCost(p, lv);
    const req = p.req ? PERM.find(x => x.id === p.req)! : null;
    const locked = !!req && !(save.perm[req.id] > 0);
    const row = document.createElement('div');
    row.className = 'card' + (p.req ? ' node' : '') + (p.big ? ' big1' : '') + (locked ? ' lock' : '');
    row.innerHTML = `<div><b>${p.big ? '★ ' : ''}${p.name} · ${lv}/${p.max}</b><span>${locked ? L('🔒 Requiere ', '🔒 Requires ') + req!.name : p.desc + (p.max > 1 ? L(' por nivel', ' per level') : '')}</span></div>`;
    const b = document.createElement('button');
    b.textContent = maxed ? 'MÁX' : '◆ ' + c;
    b.disabled = maxed || locked || save.coral < c;
    b.addEventListener('click', () => {
      if (save.coral < c || maxed || locked) return;
      save.coral -= c; save.perm[p.id] = lv + 1; persist(save); sfx.buy();
      achievements(); buildShop();
    });
    row.appendChild(b); list.appendChild(row);
  }
}

function buildMap() {
  const list = $('maplist'); list.innerHTML = '';
  ZONES.forEach((z, i) => {
    const op = zoneUnlocked(save, i), sel = z.id === save.zone;
    const row = document.createElement('div');
    row.className = 'card' + (sel ? ' sel' : '') + (op ? '' : ' lock');
    row.innerHTML = `<div><b>${op ? '' : '🔒 '}${z.name}</b><span>${op ? z.desc + L(' · Récord ', ' · Best ') + (save.zoneBest[z.id] || 0) : L('Llega a la oleada ' + UNLOCK_WAVE + ' en ' + ZONES[i - 1].name, 'Reach wave ' + UNLOCK_WAVE + ' in ' + ZONES[i - 1].name)}</span></div>`;
    const b = document.createElement('button'); b.className = 'g';
    b.textContent = sel ? 'ELEGIDA' : 'ELEGIR'; b.disabled = !op || sel;
    b.addEventListener('click', () => { save.zone = z.id; persist(save); sfx.click(); buildMap(); });
    row.appendChild(b); list.appendChild(row);
  });
}

function buildMissions() {
  ensureDaily(save);
  const now = new Date(), end = new Date(now); end.setHours(24, 0, 0, 0);
  const h = Math.floor((+end - +now) / 3600000), m = Math.floor(((+end - +now) % 3600000) / 60000);
  $('misinfo').innerHTML = `${L('Nuevas misiones en', 'New missions in')} ${h}h ${m}m · Coral: <b style="color:#ffb35c">${Math.floor(save.coral)} ◆</b>`;
  const list = $('mislist'); list.innerHTML = '';
  for (const ms of save.daily.list) {
    const def = MPOOL.find(p => p.kind === ms.kind)!;
    const done = ms.prog >= ms.goal;
    const row = document.createElement('div'); row.className = 'card';
    row.innerHTML = `<div style="flex:1"><b>${def.text(ms.goal)}</b><span>${Math.min(ms.prog, ms.goal)} / ${ms.goal}</span><div class="prog"><div style="width:${Math.min(100, (ms.prog / ms.goal) * 100)}%"></div></div></div>`;
    const b = document.createElement('button');
    b.textContent = ms.claimed ? '✓' : '◆ ' + ms.reward; b.disabled = ms.claimed || !done;
    b.addEventListener('click', () => {
      if (ms.claimed || ms.prog < ms.goal) return;
      ms.claimed = true; save.coral += ms.reward; persist(save); sfx.coin(); buildMissions(); updateBadges();
    });
    row.appendChild(b); list.appendChild(row);
  }
  const all = save.daily.list.every(x => x.claimed);
  const row = document.createElement('div'); row.className = 'card';
  row.innerHTML = `<div><b>${t('🎁 Cofre del día')}</b><span>${t('Completa las 3 misiones')}</span></div>`;
  const b = document.createElement('button'); b.className = 'g';
  b.textContent = save.daily.bonus ? '✓' : '◆ ' + DAILY_BONUS; b.disabled = save.daily.bonus || !all;
  b.addEventListener('click', () => {
    if (save.daily.bonus || !all) return;
    save.daily.bonus = true; save.coral += DAILY_BONUS; persist(save); sfx.bossdown(); buildMissions(); updateBadges();
  });
  row.appendChild(b); list.appendChild(row);
}

function buildAchs() {
  const S = save.stats;
  const hrs = Math.floor(S.time / 3600), mins = Math.floor((S.time % 3600) / 60);
  const cells: [string, string][] = [
    [t('Mejor oleada'), String(S.bestWave)], [t('Partidas'), String(S.runs)],
    [t('Criaturas'), num(S.kills)], [t('Jefes'), String(S.bosses)],
    [t('Élites'), String(S.elites)], [t('Críticos'), num(S.crits)],
    [t('Bendiciones'), String(S.cards)], [t('Tiempo jugado'), hrs ? `${hrs}h ${mins}m` : `${mins}m`],
  ];
  $('statgrid').innerHTML = cells.map(([k, v]) => `<div>${k}<b>${v}</b></div>`).join('');
  const x = { research: researchTotal(save), zones: zonesOpen(save) };
  const list = $('achlist'); list.innerHTML = '';
  const got = ACHIEVEMENTS.filter(a => save.ach.includes(a.id)).length;
  const head = document.createElement('p'); head.textContent = `${got} de ${ACHIEVEMENTS.length} logros`; list.appendChild(head);
  for (const a of ACHIEVEMENTS) {
    const done = save.ach.includes(a.id), [v, goal] = a.prog(S, x);
    const row = document.createElement('div');
    row.className = 'card' + (done ? ' sel' : '');
    row.innerHTML = `<div style="flex:1"><b>${done ? '🏆 ' : ''}${a.name}</b><span>${a.desc}${goal > 1 && !done ? ` · ${v}/${goal}` : ''}</span>${!done && goal > 1 ? `<div class="prog"><div style="width:${(v / goal) * 100}%"></div></div>` : ''}</div><span style="font-weight:900;color:#ffb35c">${done ? '✓' : '+' + a.reward + ' ◆'}</span>`;
    list.appendChild(row);
  }
}

/* ---------- Ranking ---------- */
let rankKind: 'best' | 'daily' = 'best';
function entry() {
  let bz = 'bahia', bw = 0;
  for (const z of ZONES) if ((save.zoneBest[z.id] || 0) >= bw) { bw = save.zoneBest[z.id] || 0; bz = z.id; }
  const ch = save.challenge?.date === today() && save.challenge.score > 0 ? save.challenge : null;
  return { name: save.name, best: save.stats.bestWave, zone: bz, daily: ch ? { date: ch.date, score: ch.score, wave: ch.wave } : null };
}
async function submitScore() {
  try { const b = await getBoard(); if (save.stats.bestWave > 0 || save.challenge) await b.submit(entry()); } catch { /* sin conexión */ }
}
async function buildRank() {
  const status = $('rankstatus'), list = $('ranklist');
  [...$('ranktabs').children].forEach(el => el.classList.toggle('on', (el as HTMLElement).dataset.k === rankKind));
  status.textContent = t('Cargando…');
  list.innerHTML = '';
  const b = await getBoard();
  $('namebox').style.display = b.needsName ? '' : 'none';
  $<HTMLInputElement>('nameinput').value = save.name;
  let rows: Row[] = [];
  try {
    await b.submit(entry());
    rows = await b.list();
    status.textContent = t(b.label);
  } catch {
    status.textContent = t('No se pudo cargar el ranking ahora. Inténtalo más tarde.');
  }
  const d = today();
  const shown = rankKind === 'best'
    ? rows.filter(r => r.best > 0).sort((a, c) => c.best - a.best)
    : rows.filter(r => r.dailyDate === d && r.daily > 0).sort((a, c) => c.daily - a.daily);
  if (!shown.length) {
    const p = document.createElement('p');
    p.textContent = t(rankKind === 'daily' ? 'Nadie ha jugado el desafío de hoy todavía.' : 'Aún no hay puntuaciones.');
    list.appendChild(p);
  }
  shown.slice(0, 50).forEach((r, i) => {
    const row = document.createElement('div');
    row.className = 'rrow' + (r.me ? ' me' : '');
    const pos = document.createElement('span'); pos.className = 'pos'; pos.textContent = ['🥇', '🥈', '🥉'][i] || String(i + 1);
    const nm = document.createElement('span'); nm.className = 'nm';
    const zn = ZONES.find(z => z.id === r.zone)?.name || '';
    nm.textContent = (r.me ? (b.needsName ? r.name || t('Tú') : r.name + L(' (tú)', ' (you)')) : r.name) + (rankKind === 'best' && zn ? ' · ' + zn : '');
    const sc = document.createElement('span'); sc.className = 'sc';
    sc.textContent = rankKind === 'best' ? L('Oleada ', 'Wave ') + r.best : num(r.daily) + ' pts';
    row.append(pos, nm, sc);
    list.appendChild(row);
  });
}
$('ranktabs').addEventListener('click', ev => {
  const k = (ev.target as HTMLElement).dataset.k as 'best' | 'daily' | undefined;
  if (k) { rankKind = k; sfx.click(); buildRank(); }
});
$('namesave').addEventListener('click', () => {
  save.name = $<HTMLInputElement>('nameinput').value.trim().slice(0, 16);
  persist(save); sfx.buy(); buildRank();
});

/* ---------- Ajustes ---------- */
function toggleMute() {
  audio();
  save.muted = !save.muted; setMuted(save.muted); persist(save);
  $('mute').textContent = save.muted ? '🔇' : '🔊';
  $('pmute').textContent = L(save.muted ? 'SONIDO: NO' : 'SONIDO: SÍ', save.muted ? 'SOUND: OFF' : 'SOUND: ON');
}
function toggleMusic() {
  audio();
  save.music = !save.music; setMusicEnabled(save.music); persist(save);
  $('mus').style.opacity = save.music ? '1' : '.5';
  $('pmus').textContent = L(save.music ? 'MÚSICA: SÍ' : 'MÚSICA: NO', save.music ? 'MUSIC: ON' : 'MUSIC: OFF');
}

function setPaused(p: boolean) {
  stopHold();
  if (!g || g.over || g.state === 'cards') return;
  paused = p;
  $('pause').textContent = p ? '▶' : 'II';
  $('pmute').textContent = L(save.muted ? 'SONIDO: NO' : 'SONIDO: SÍ', save.muted ? 'SOUND: OFF' : 'SOUND: ON');
  $('pmus').textContent = L(save.music ? 'MÚSICA: SÍ' : 'MÚSICA: NO', save.music ? 'MUSIC: ON' : 'MUSIC: OFF');
  const bl = Object.entries(g.bl).filter(([, v]) => v > 0);
  $('pauseinfo').textContent = bl.length ? t('Bendiciones') + ': ' + bl.map(([k, v]) => (BLESSINGS.find(b => b.id === k)?.name || k) + (v > 1 ? ' ×' + v : '')).join(', ') : '';
  $('pauseov').classList.toggle('on', p);
}

/* ---------- Eventos ---------- */
$('play').addEventListener('click', () => start(false));
// Idioma: se guarda y se recarga para que todo el texto quede en el idioma nuevo
$('langbtn').textContent = lang.toUpperCase();
$('langbtn').addEventListener('click', () => {
  save.lang = lang === 'es' ? 'en' : 'es';
  persist(save);
  location.hash = 'lang=' + save.lang;
  location.reload();
});
$('daily').addEventListener('click', () => start(true));
$('again').addEventListener('click', () => start(false));
$('tomenu').addEventListener('click', () => { sfx.click(); showMenu(); });
$('mapbtn').addEventListener('click', () => { buildMap(); open('map'); });
$('shopbtn').addEventListener('click', () => { buildShop(); open('shop'); });
$('misbtn').addEventListener('click', () => { buildMissions(); open('missions'); });
$('achbtn').addEventListener('click', () => { buildAchs(); open('achs'); });
$('rankbtn').addEventListener('click', () => { open('rank'); buildRank(); });
$('overshop').addEventListener('click', () => { buildShop(); open('shop', 'over'); });
$('overmis').addEventListener('click', () => { buildMissions(); open('missions', 'over'); });
document.querySelectorAll('.back').forEach(b => b.addEventListener('click', () => {
  sfx.click();
  if (backTo === 'over') { hideAll(); updateBadges(); $('over').classList.add('on'); } else showMenu();
}));
$('mute').addEventListener('click', toggleMute);
$('pmute').addEventListener('click', toggleMute);
$('mus').addEventListener('click', toggleMusic);
$('pmus').addEventListener('click', toggleMusic);
$('spd').addEventListener('click', () => { speed = speed === 1 ? 2 : 1; $('spd').textContent = '×' + speed; sfx.click(); });
$('pause').addEventListener('click', () => setPaused(!paused));
$('resume').addEventListener('click', () => setPaused(false));
$('quit').addEventListener('click', () => { if (!g) return; $('pauseov').classList.remove('on'); paused = false; g.abandon(); });
$('flash').addEventListener('click', () => { audio(); if (g && !paused) g.useFlash(); });
$('aim').addEventListener('click', () => {
  if (!g) return;
  g.cycleAim(); sfx.click();
  $('aim').querySelector('span')!.textContent = AIMS.find(a => a.id === g!.aim)!.name;
  const tips: Record<string, string> = { cerca: 'dispara a lo más cercano', peligro: 'prioriza peces globo, anguilas, élites y jefes', fuerte: 'prioriza a quien tenga más vida', debil: 'remata a los más débiles' };
  showHint('<b>' + t('Objetivo:') + '</b> ' + t(tips[g.aim]));
});
window.addEventListener('resize', resize);
if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);
document.addEventListener('visibilitychange', () => { if (document.hidden && g && !g.over) setPaused(true); });
document.addEventListener('pointerdown', () => audio(), { once: true });

/* ---------- Bucle ---------- */
function loop(nowMs: number) {
  const now = nowMs / 1000;
  const dt = Math.min(0.05, now - last || 0);
  last = now;
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').classList.remove('on'); }
  if (g && !paused && !g.over) {
    // Cinemática de entrada del jefe: cámara lenta, acercamiento y franjas
    const boss = g.boss;
    if (boss && introWave !== g.wave) {
      introWave = g.wave; introT = 2.6;
      stage.classList.add('cine');
      const art = bossArt[runZone.id];
      stage.classList.toggle('art', !!art);
      if (art) { $<HTMLImageElement>('bossart').querySelector('img')!.src = art; $('bossart').classList.add('on'); }
      banner(runZone.boss + '\n' + runZone.bossTitle, 2.6);
    }
    let slow = 1;
    if (introT > 0) {
      introT -= dt;
      const t = 2.6 - introT, k = Math.min(1, t / 0.6, Math.max(0, introT) / 0.7);
      const e = k * k * (3 - 2 * k);
      const bx = boss ? boss.x : camFocus.x / 0.75, by = boss ? boss.y : camFocus.y / 0.75;
      camFocus.x = bx * 0.75 * e; camFocus.y = by * 0.75 * e; camFocus.z = 1 + 0.75 * e;
      slow = 0.25 + 0.75 * (1 - e);
      if (introT <= 0.5) $('bossart').classList.remove('on');
      if (introT <= 0) { stage.classList.remove('cine', 'art'); camFocus.x = camFocus.y = 0; camFocus.z = 1; }
    }
    let acc = dt * speed * slow;
    while (acc > 0) { const h = Math.min(acc, 1 / 60); g.update(h); acc -= h; if (g.over || g.state === 'cards') break; }
    hudT -= dt;
    if (hudT <= 0) { hudT = 0.1; updateHud(); updatePanel(); }
  }
  if (g) {
    const hudH = $('hud').getBoundingClientRect().height, dockH = $('dock').getBoundingClientRect().height + 40;
    const target = Math.max(-140, Math.min(60, (hudH - dockH) / 2));
    view.offY += (target - view.offY) * Math.min(1, dt * 8);
  } else view.offY = 0;
  draw(ctx, g, g ? runZone : zone(), vw, vh, dpr, now);
  requestAnimationFrame(loop);
}

// acceso para pruebas automáticas
(window as unknown as { __faro: () => Game | null }).__faro = () => g;
(window as unknown as { __cam: typeof camFocus }).__cam = camFocus;
(window as unknown as { __zone: (id: string) => void }).__zone = (id: string) => { runZone = ZONES.find(z => z.id === id)!; if (g) g.zone = runZone; };

$('menu').style.setProperty('--art', `url(${menuArt})`);
buildPanel();
showMenu();
resize();
requestAnimationFrame(loop);
achievements();
