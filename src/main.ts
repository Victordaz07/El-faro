// Controlador de interfaz: pantallas, panel de mejoras, HUD, tutorial y bucle principal.
import { DEFS, TABS, PERM, BRANCHES, ZONES, MPOOL, DAILY_BONUS, UNLOCK_WAVE, HINTS, ACHIEVEMENTS, permCost, Zone } from './data';
import {
  load, persist, ensureDaily, track, zoneUnlocked, readyMissions, checkAchievements,
  researchTotal, zonesOpen, challengeZone, challengeSeed, today,
} from './save';
import { Game, GEvent, AIMS } from './game';
import { draw, camFocus } from './render';
import { ICONS, TAB_ICONS } from './icons';
import { menuArt, bossArt } from './art';
import { initAudio, setMuted, sfx } from './audio';
import { startMusic, setMusicEnabled, setMusicLevel } from './music';
import { getBoard, Row } from './leaderboard';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const save = load();
setMuted(save.muted);
setMusicEnabled(save.music);
let g: Game | null = null;
let runZone: Zone = ZONES[0];
let introT = 0, introWave = -1;
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
    case 'wave': banner('OLEADA ' + d + (g?.mod ? '\n' + g.mod.name : '')); sfx.wave(); tutorialFor(d || 0); break;
    case 'boss': sfx.boss(); vibrate(150); break;
    case 'bossdown': banner('¡JEFE DERROTADO!'); sfx.bossdown(); vibrate(80); break;
    case 'flash': sfx.flash(); vibrate(40); break;
    case 'buy': sfx.buy(); break;
    case 'thunder': sfx.thunder(); break;
    case 'boom': sfx.boom(); vibrate(90); break;
    case 'enrage': sfx.enrage(); banner('¡' + runZone.boss + ' FURIOSO!'); vibrate(200); break;
    case 'elite': sfx.elite(); break;
    case 'harpoon': sfx.harpoon(); break;
    case 'net': sfx.net(); break;
    case 'slam': sfx.slam(); break;
    case 'frostwarn': sfx.warn(); $('frostw').style.display = 'block'; break;
    case 'frost': sfx.frost(); $('frostw').style.display = 'none'; vibrate(60); break;
    case 'erupt': sfx.erupt(); vibrate(30); break;
    case 'revive': sfx.revive(); banner('¡SEGUNDA LLAMA!'); vibrate(200); break;
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
  if (daily) {
    if (save.challenge?.date === today()) return showMenu();
    runZone = challengeZone();
    save.challenge = { date: today(), score: 0, wave: 0, zone: runZone.id };
    persist(save);
    g = new Game(save, runZone, onEvent, spawnR, { daily: true, seed: challengeSeed() });
  } else {
    runZone = zone();
    g = new Game(save, runZone, onEvent, spawnR);
  }
  for (const id of ['flash', 'aim']) $(id).style.display = '';
  $('frostw').style.display = 'none';
  $('aim').querySelector('span')!.textContent = AIMS[0].name;
  tab = 0;
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
  $('frostw').style.display = 'none';
  let html: string;
  if (g.daily) {
    $('overtitle').textContent = 'DESAFÍO TERMINADO';
    html = `${z.name} · oleada <b>${g.wave}</b> · ${g.kills} criaturas<br>Puntuación: <b style="color:#ffd166">${g.score.toLocaleString('es')}</b><br>Mañana hay un desafío nuevo.`;
  } else {
    $('overtitle').textContent = 'EL FARO SE APAGÓ';
    html = `${z.name} · llegaste a la <b>oleada ${g.wave}</b>` +
      (g.wave > prevBest ? ' <b style="color:#35e0b0">¡nuevo récord!</b>' : `<br>Récord: ${prevBest}`);
  }
  html += `<br>${g.kills} criaturas · ${g.bosses} jefes · ${g.elites} élites · ${g.cards} ${g.cards === 1 ? 'bendición' : 'bendiciones'}` +
    `<br>Coral ganado: <b style="color:#ffb35c">+${g.earned} ◆</b>`;
  if (!g.daily && !nextWasOpen && zi + 1 < ZONES.length && zoneUnlocked(save, zi + 1))
    html += `<br><br><b style="color:#ffe27a">🗺️ ¡Desbloqueaste ${ZONES[zi + 1].name}!</b>`;
  const ready = readyMissions(save);
  if (ready) html += `<br><br>🎯 ${ready} misión${ready > 1 ? 'es' : ''} lista${ready > 1 ? 's' : ''} para reclamar`;
  $('overinfo').innerHTML = html;
  updateBadges();
  achievements();
  submitScore();
  setTimeout(() => $('over').classList.add('on'), 700);
}

/* ---------- Tutorial ---------- */
const TUT: { title: string; text: string; target: string; at: number }[] = [
  { at: 0, title: 'Las perlas ● compran mejoras', text: 'Tu faro dispara solo. Toca una mejora para comprarla; mantén presionado para comprar varias.', target: '#grid' },
  { at: 2, title: 'El Destello ⚡', text: 'Aturde y daña a todo lo que esté cerca. Guárdalo para cuando te rodeen o para el jefe.', target: '#flash' },
  { at: 3, title: 'Elige a quién disparar', text: 'Toca OBJETIVO para cambiar. PELIGRO prioriza peces globo, anguilas, élites y jefes.', target: '#aim' },
  { at: 4, title: 'Torretas en la isla', text: 'En la pestaña ISLA construyes un Arponero, un Lanzarredes y un Ancla que disparan solos.', target: '#tabs' },
  { at: 5, title: 'Bendiciones', text: 'Cada 5 oleadas eliges una carta que dura toda la partida. Combínalas con tus mejoras.', target: '' },
];
function tutorialFor(wave: number) {
  if (save.tut >= TUT.length || !g || g.daily) return;
  const step = TUT[save.tut];
  if (step.at > wave || step.at === 5) return;
  showTip(step.title, step.text, step.target);
}
function showTip(title: string, text: string, target: string) {
  paused = true;
  const tip = $('tip');
  $('tiptitle').textContent = title;
  $('tiptext').textContent = text;
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
  save.tut++; persist(save);
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
    el.innerHTML = `<div class="ic">${b.icon}</div><div><b>${esc(b.name)}</b><span>${esc(b.desc)}</span>${lv ? `<br><em>YA TIENES ${lv} · SE ACUMULA</em>` : ''}</div>`;
    el.addEventListener('click', () => {
      if (!g) return;
      g.pickCard(b.id); sfx.buy();
      $('cards').classList.remove('on');
      toast(b.icon + ' ' + b.name, 'Bendición activa');
      if (save.tut === 4) { save.tut = 5; persist(save); }
      updatePanel(); updateHud();
    });
    list.appendChild(el);
  }
  const rr = $('reroll');
  rr.style.display = g.rerolls > 0 ? '' : 'none';
  rr.textContent = `RE-TIRAR (${g.rerolls})`;
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
  el.addEventListener('pointerdown', ev => {
    ev.preventDefault();
    stopHold();
    audio();
    onPress();
    if (!buyOnce()) return;
    try { el.setPointerCapture(ev.pointerId); } catch { /* sin captura */ }
    let to = 0, iv = 0, n = 0;
    const stop = () => {
      clearTimeout(to);
      clearInterval(iv);
      if (holdStop === stop) holdStop = null;
    };
    holdStop = stop;
    to = window.setTimeout(() => {
      iv = window.setInterval(() => {
        if (++n > 60 || el.offsetParent === null || !buyOnce()) stop();
      }, 90);
    }, 380);
  });
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture', 'pointerleave']) el.addEventListener(t, stopHold);
}
for (const t of ['pointerup', 'pointercancel', 'blur']) window.addEventListener(t, stopHold);
document.addEventListener('visibilitychange', stopHold);

function buildPanel() {
  const grid = $('grid');
  for (const d of DEFS) {
    const el = document.createElement('button');
    el.className = 'up t' + d.tab;
    el.innerHTML = '<div class="n"><span></span><span></span></div><div class="v"></div><div class="k"></div><div class="ic">' + (ICONS[d.id] || '') + '</div>';
    holdToBuy(el, () => {
      $('hint').innerHTML = '<b>' + d.name + ':</b> ' + (HINTS[d.id] || 'mejora de ' + TABS[d.tab].toLowerCase());
    }, () => {
      if (!g || paused || g.over) return false;
      const ok = g.buy(d.id);
      if (ok) { updatePanel(); updateHud(); }
      return ok;
    });
    el.style.display = d.tab === 0 ? '' : 'none';
    grid.appendChild(el);
    const n = el.children[0] as HTMLElement;
    btns.push({ id: d.id, tab: d.tab, el, n: n.children[0] as HTMLElement, lv: n.children[1] as HTMLElement, v: el.children[1] as HTMLElement, k: el.children[2] as HTMLElement });
  }
  TABS.forEach((t, i) => {
    const b = document.createElement('button');
    b.className = 'tab'; b.innerHTML = TAB_ICONS[i] + '<span>' + t + '</span><span class="dot"></span>';
    b.addEventListener('click', () => { stopHold(); tab = i; sfx.click(); updatePanel(); });
    $('tabs').appendChild(b);
  });
}

function updatePanel() {
  if (!g) return;
  for (const o of btns) {
    const show = o.tab === tab;
    o.el.style.display = show ? '' : 'none';
    if (!show) continue;
    const d = DEFS.find(x => x.id === o.id)!;
    const key = d.id as keyof typeof g.st;
    const c = g.cost(d.id);
    o.n.textContent = d.name;
    o.lv.textContent = d.tab === 3 && !g.lv[d.id] ? '' : 'Nv ' + g.lv[d.id];
    o.v.innerHTML = d.fmt(g.st[key]) + '<i>→ ' + d.fmt(g.preview(d.id)[key]) + '</i>';
    o.k.textContent = '● ' + c;
    o.el.classList.toggle('off', g.pearls < c);
    o.el.classList.toggle('ready', g.pearls >= c);
  }
  [...$('tabs').children].forEach((el, i) => {
    el.classList.toggle('on', i === tab);
    const can = !!g && DEFS.some(d => d.tab === i && g!.pearls >= g!.cost(d.id));
    el.querySelector('.dot')!.classList.toggle('on', can && i !== tab);
  });
}

function updateHud() {
  if (!g) return;
  $('wave').firstChild!.nodeValue = 'OLEADA ' + Math.max(1, g.wave);
  $('best').textContent = (g.daily ? '⭐ Desafío · ' : '') + runZone.name + (g.daily ? ' · ' + g.score.toLocaleString('es') + ' pts' : ' · Récord ' + best());
  $('pearls').textContent = String(g.pearls);
  $('coral').textContent = String(Math.floor(g.coral));
  const st = g.st, p = Math.max(0, g.hp) / st.hp;
  $('hpfill').style.width = p * 100 + '%';
  $('hpt').textContent = 'Faro ' + Math.ceil(Math.max(0, g.hp)) + ' / ' + Math.round(st.hp);
  $('sht').textContent = st.bar > 0 ? 'Barrera ' + Math.ceil(g.shield) + ' / ' + Math.round(st.bar) : '';
  $('shfill').style.width = st.bar > 0 ? (g.shield / st.bar) * 100 + '%' : '0';
  $('wprog').style.width = g.waveProgress * 100 + '%';
  const md = $('mod');
  if (g.mod) { md.style.display = 'block'; md.className = g.mod.good ? 'good' : ''; md.innerHTML = g.mod.name + ' <i>· ' + g.mod.desc + '</i>'; } else md.style.display = 'none';
  const boss = g.boss;
  $('boss').style.display = boss ? 'block' : 'none';
  $('boss').classList.toggle('on', !!boss);
  if (boss) { $('bossname').textContent = runZone.boss + (boss.enraged ? ' · FURIOSO' : ''); $('bossfill').style.width = Math.max(0, (boss.hp / boss.max) * 100) + '%'; }
  setMusicLevel(boss ? 2 : 1);
  const fb = $('flash');
  fb.style.setProperty('--p', String(1 - g.flashCd / g.flashMax));
  fb.classList.toggle('cd', g.flashCd > 0);
  fb.querySelector('small')!.textContent = g.flashCd > 0 ? Math.ceil(g.flashCd) + 's' : 'DESTELLO';
}

/* ---------- Pantallas ---------- */
const OVS = ['menu', 'over', 'shop', 'map', 'missions', 'pauseov', 'cards', 'achs', 'rank'];
let backTo = 'menu';
function hideAll() { OVS.forEach(i => $(i).classList.remove('on')); }
function open(id: string, from = 'menu') { audio(); sfx.click(); hideAll(); backTo = from; $(id).classList.add('on'); }

function showMenu() {
  g = null;
  introT = 0; camFocus.x = camFocus.y = 0; camFocus.z = 1; stage.classList.remove('cine');
  setMusicLevel(0);
  for (const id of ['flash', 'aim', 'frostw', 'mod', 'boss']) $(id).style.display = 'none';
  const z = zone();
  $('menuinfo').innerHTML = `Zona: <b>${z.name}</b> · Récord: <b>${save.zoneBest[z.id] || 0}</b> · Coral: <b style="color:#ffb35c">${Math.floor(save.coral)} ◆</b>`;
  $('mute').textContent = save.muted ? '🔇' : '🔊';
  $('mus').textContent = save.music ? '🎵' : '🎵̸';
  $('mus').style.opacity = save.music ? '1' : '.5';
  const cz = challengeZone(), done = save.challenge?.date === today();
  const dbtn = $<HTMLButtonElement>('daily');
  dbtn.disabled = done;
  $('dailyinfo').textContent = done
    ? `Hoy: oleada ${save.challenge!.wave} · ${save.challenge!.score.toLocaleString('es')} pts · vuelve mañana`
    : `${cz.name} · un solo intento · igual para todos`;
  updateBadges();
  hideAll();
  $('menu').classList.add('on');
}

function updateBadges() {
  ensureDaily(save);
  const n = readyMissions(save);
  for (const id of ['misbadge', 'misbadge2']) { const b = $(id); b.textContent = String(n); b.classList.toggle('on', n > 0); }
}

function buildShop() {
  $('shopcoral').innerHTML = `Coral disponible: <b style="color:#ffb35c">${Math.floor(save.coral)} ◆</b>`;
  const tabs = $('rtabs'); tabs.innerHTML = '';
  BRANCHES.forEach((b, i) => {
    const el = document.createElement('button');
    el.textContent = b; el.className = i === rtab ? 'on' : '';
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
    row.innerHTML = `<div><b>${p.big ? '★ ' : ''}${p.name} · ${lv}/${p.max}</b><span>${locked ? '🔒 Requiere ' + req!.name : p.desc + (p.max > 1 ? ' por nivel' : '')}</span></div>`;
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
    row.innerHTML = `<div><b>${op ? '' : '🔒 '}${z.name}</b><span>${op ? z.desc + ' · Récord ' + (save.zoneBest[z.id] || 0) : 'Llega a la oleada ' + UNLOCK_WAVE + ' en ' + ZONES[i - 1].name}</span></div>`;
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
  $('misinfo').innerHTML = `Nuevas misiones en ${h}h ${m}m · Coral: <b style="color:#ffb35c">${Math.floor(save.coral)} ◆</b>`;
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
  row.innerHTML = `<div><b>🎁 Cofre del día</b><span>Completa las 3 misiones</span></div>`;
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
    ['Mejor oleada', String(S.bestWave)], ['Partidas', String(S.runs)],
    ['Criaturas', S.kills.toLocaleString('es')], ['Jefes', String(S.bosses)],
    ['Élites', String(S.elites)], ['Críticos', S.crits.toLocaleString('es')],
    ['Bendiciones', String(S.cards)], ['Tiempo jugado', hrs ? `${hrs}h ${mins}m` : `${mins}m`],
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
  status.textContent = 'Cargando…';
  list.innerHTML = '';
  const b = await getBoard();
  $('namebox').style.display = b.needsName ? '' : 'none';
  $<HTMLInputElement>('nameinput').value = save.name;
  let rows: Row[] = [];
  try {
    await b.submit(entry());
    rows = await b.list();
    status.textContent = b.label;
  } catch {
    status.textContent = 'No se pudo cargar el ranking ahora. Inténtalo más tarde.';
  }
  const d = today();
  const shown = rankKind === 'best'
    ? rows.filter(r => r.best > 0).sort((a, c) => c.best - a.best)
    : rows.filter(r => r.dailyDate === d && r.daily > 0).sort((a, c) => c.daily - a.daily);
  if (!shown.length) {
    const p = document.createElement('p');
    p.textContent = rankKind === 'daily' ? 'Nadie ha jugado el desafío de hoy todavía.' : 'Aún no hay puntuaciones.';
    list.appendChild(p);
  }
  shown.slice(0, 50).forEach((r, i) => {
    const row = document.createElement('div');
    row.className = 'rrow' + (r.me ? ' me' : '');
    const pos = document.createElement('span'); pos.className = 'pos'; pos.textContent = ['🥇', '🥈', '🥉'][i] || String(i + 1);
    const nm = document.createElement('span'); nm.className = 'nm';
    const zn = ZONES.find(z => z.id === r.zone)?.name || '';
    nm.textContent = (r.me ? (b.needsName ? r.name || 'Tú' : r.name + ' (tú)') : r.name) + (rankKind === 'best' && zn ? ' · ' + zn : '');
    const sc = document.createElement('span'); sc.className = 'sc';
    sc.textContent = rankKind === 'best' ? 'Oleada ' + r.best : r.daily.toLocaleString('es') + ' pts';
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
  $('pmute').textContent = save.muted ? 'SONIDO: NO' : 'SONIDO: SÍ';
}
function toggleMusic() {
  audio();
  save.music = !save.music; setMusicEnabled(save.music); persist(save);
  $('mus').style.opacity = save.music ? '1' : '.5';
  $('pmus').textContent = save.music ? 'MÚSICA: SÍ' : 'MÚSICA: NO';
}

function setPaused(p: boolean) {
  stopHold();
  if (!g || g.over || g.state === 'cards') return;
  paused = p;
  $('pause').textContent = p ? '▶' : 'II';
  $('pmute').textContent = save.muted ? 'SONIDO: NO' : 'SONIDO: SÍ';
  $('pmus').textContent = save.music ? 'MÚSICA: SÍ' : 'MÚSICA: NO';
  const bl = Object.entries(g.bl).filter(([, v]) => v > 0);
  $('pauseinfo').textContent = bl.length ? 'Bendiciones: ' + bl.map(([k, v]) => k + (v > 1 ? ' ×' + v : '')).join(', ') : '';
  $('pauseov').classList.toggle('on', p);
}

/* ---------- Eventos ---------- */
$('play').addEventListener('click', () => start(false));
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
  $('hint').innerHTML = '<b>Objetivo:</b> ' + tips[g.aim];
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
