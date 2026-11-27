// Dibujo en canvas: agua animada, faro 2.5D, criaturas sombreadas, efectos y clima.
import { Game, Enemy, LAMP_Y, TURRET_POS } from './game';
import type { Zone } from './data';
import { Water } from './water';

let water: Water | null | undefined;

/** Foco de cámara para cinemáticas: punto del mundo y acercamiento (1 = normal). */
export const camFocus = { x: 0, y: 0, z: 1 };

/* Calidad automática: si el dispositivo no alcanza ~25 FPS se baja la resolución
   del mar y de la luz; si aún así no alcanza, se usa el mar 2D. */
let quality = 2, lastNow = 0, slow = 0, ema = 1 / 60;
function adaptQuality(now: number) {
  const dt = now - lastNow;
  lastNow = now;
  if (dt <= 0 || dt > 0.5) return;
  ema = ema * 0.95 + dt * 0.05;
  slow = ema > 0.04 ? slow + dt : Math.max(0, slow - dt * 0.5);
  if (slow > 3 && quality > 0) { quality--; slow = 0; ema = 1 / 60; if (quality === 0) water = null; }
}
export function setQuality(q: number) { quality = q; if (q === 0) water = null; }

const TAU = Math.PI * 2;
const SS = 3; // superresolución de sprites

/* ---------- Utilidades ---------- */
const sprites = new Map<string, HTMLCanvasElement>();
function sprite(key: string, size: number, fn: (c: CanvasRenderingContext2D) => void) {
  let c = sprites.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = c.height = Math.ceil(size * 2 * SS);
    const x = c.getContext('2d')!;
    x.scale(SS, SS);
    x.translate(size, size);
    fn(x);
    sprites.set(key, c);
  }
  return c;
}
function blit(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, size: number, k = 1) {
  ctx.drawImage(c, -size * k, -size * k, size * 2 * k, size * 2 * k);
}
function radial(c: CanvasRenderingContext2D, x: number, y: number, r: number, stops: [number, string][]) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  for (const [o, col] of stops) g.addColorStop(o, col);
  return g;
}
const hash = (n: number) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };

/* ---------- Agua ---------- */
const waterCache = new Map<string, CanvasPattern>();
function waterPattern(ctx: CanvasRenderingContext2D, zone: Zone) {
  let p = waterCache.get(zone.id);
  if (!p) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d')!;
    for (let i = 0; i < 70; i++) {
      const px = hash(i) * 256, py = hash(i + 50) * 256, r = 8 + hash(i + 99) * 26;
      for (const [ox, oy] of [[0, 0], [256, 0], [-256, 0], [0, 256], [0, -256]]) {
        x.strokeStyle = `rgba(${zone.ring},${0.05 + hash(i + 7) * 0.08})`;
        x.lineWidth = 1 + hash(i + 3) * 1.5;
        x.beginPath();
        x.ellipse(px + ox, py + oy, r, r * 0.45, hash(i + 11) * 3, 0, TAU);
        x.stroke();
      }
    }
    p = ctx.createPattern(c, 'repeat')!;
    waterCache.set(zone.id, p);
  }
  return p;
}

/* ---------- Escena ---------- */
export function draw(ctx: CanvasRenderingContext2D, g: Game | null, zone: Zone, vw: number, vh: number, dpr: number, now: number) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  const sc = Math.min(vw, vh) / 400;
  const t = g ? g.t : now;
  adaptQuality(now);

  let sx = 0, sy = 0;
  if (g && g.shake > 0) { const k = g.shake * 22; sx = (Math.random() - 0.5) * k; sy = (Math.random() - 0.5) * k; }
  const z = camFocus.z, fx = camFocus.x, fy = camFocus.y;
  const cam = g
    ? { x: vw / 2 + sx - fx * sc * z, y: vh / 2 + sy - fy * sc * z, s: sc * z }
    : { x: vw / 2, y: vh * 0.3, s: sc * 1.45 };
  const lampA = g ? g.lamp : now * 0.6;

  // Fondo y agua: shader en la GPU, o patrón 2D si no hay WebGL
  if (water === undefined) water = Water.create();
  if (water) {
    const c = water.render(vw, vh, quality === 2 ? Math.min(1, dpr * 0.6) : 0.4, zone, now, cam.x, cam.y, cam.s, lampA, 1, g ? g.lightning : 0);
    ctx.drawImage(c, 0, 0, vw, vh);
  } else {
    ctx.fillStyle = radial(ctx, vw / 2, vh / 2, Math.max(vw, vh) * 0.8, [[0, zone.sky0], [1, zone.sky1]]);
    ctx.fillRect(0, 0, vw, vh);
    const pat = waterPattern(ctx, zone);
    for (const [sp, a, k] of [[14, 0.9, 1], [-9, 0.6, 1.6]] as const) {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate((now * sp) % 256, (now * sp * 0.6) % 256);
      ctx.scale(k * sc, k * sc * 0.9);
      ctx.fillStyle = pat;
      ctx.fillRect(-512, -512, vw / sc + 1024, vh / sc + 1024);
      ctx.restore();
    }
  }

  ctx.save();
  ctx.translate(cam.x, cam.y);
  ctx.scale(cam.s, cam.s);

  // Gotas cayendo al mar
  ctx.strokeStyle = 'rgba(200,225,255,.25)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 26; i++) {
    const cyc = now * 1.1 + i * 0.377, ph = cyc % 1, n = Math.floor(cyc);
    const x = (hash(i * 13 + n) - 0.5) * (vw / sc), y = (hash(i * 7 + n + 3) - 0.5) * (vh / sc);
    ctx.globalAlpha = 1 - ph;
    ctx.beginPath(); ctx.ellipse(x, y, 1 + ph * 7, (1 + ph * 7) * 0.5, 0, 0, TAU); ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Alcance
  if (g) {
    ctx.strokeStyle = `rgba(${zone.ring},.16)`;
    ctx.setLineDash([3, 9]);
    ctx.lineDashOffset = -t * 8;
    ctx.beginPath(); ctx.arc(0, 0, g.range, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
  }

  // Estelas y salpicaduras (bajo todo)
  if (g) for (const f of g.fx) {
    const k = f.t / f.max;
    if (f.kind === 'wake') {
      ctx.strokeStyle = `rgba(210,235,255,${k * 0.22})`; ctx.lineWidth = 1.2;
      const r = (f.r || 8) * (1.1 + (1 - k) * 1.3);
      ctx.beginPath(); ctx.ellipse(f.x, f.y, r, r * 0.55, 0, 0, TAU); ctx.stroke();
    } else if (f.kind === 'net') {
      ctx.globalAlpha = Math.min(1, k * 2.5);
      drawNet(ctx, f.x, f.y, f.r || 40, f.c);
      ctx.globalAlpha = 1;
    } else if (f.kind === 'slam') {
      const r = (f.r || 80) * (0.3 + (1 - k) * 0.7);
      ctx.strokeStyle = `rgba(201,164,106,${k})`; ctx.lineWidth = 6 * k + 1;
      ctx.beginPath(); ctx.ellipse(f.x, f.y, r, r * 0.85, 0, 0, TAU); ctx.stroke();
      ctx.strokeStyle = `rgba(230,245,255,${k * 0.6})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(f.x, f.y, r * 0.8, r * 0.68, 0, 0, TAU); ctx.stroke();
    } else if (f.kind === 'splash') {
      ctx.strokeStyle = `rgba(220,240,255,${k * 0.7})`; ctx.lineWidth = 2;
      const r = (f.r || 8) * (1 + (1 - k) * 2.2);
      ctx.beginPath(); ctx.ellipse(f.x, f.y, r, r * 0.6, 0, 0, TAU); ctx.stroke();
    }
  }

  if (g) for (const h of g.hazards) {
    const k = 1 - h.t / 1.3, pulse = 0.5 + 0.5 * Math.sin(now * 20);
    ctx.fillStyle = `rgba(255,90,30,${0.12 + 0.2 * k})`;
    ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r, h.r * 0.7, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(255,140,60,${0.5 + 0.5 * pulse})`; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r, h.r * 0.7, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = `rgba(255,200,120,${k})`;
    ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r * k, h.r * 0.7 * k, 0, 0, TAU); ctx.fill();
  }

  if (!g) { drawBoat(ctx, now); drawGulls(ctx, now); }
  drawIsland(ctx, t);

  // Profundidad: lo que está "detrás" del faro se dibuja antes
  const enemies = g ? [...g.enemies].sort((a, b) => a.y - b.y) : [];
  for (const e of enemies) if (e.y < 2) drawEnemy(ctx, e, t, zone, g!);
  drawTower(ctx, t, g);
  if (g) drawTurrets(ctx, g, t);
  for (const e of enemies) if (e.y >= 2) drawEnemy(ctx, e, t, zone, g!);
  if (g && g.frozen > 0) {
    ctx.fillStyle = `rgba(190,235,255,${Math.min(0.32, g.frozen * 0.2)})`;
    ctx.beginPath(); ctx.ellipse(0, -18, 26, 44, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 6, LAMP_Y + Math.sin(a) * 6); ctx.lineTo(Math.cos(a) * 14, LAMP_Y + Math.sin(a) * 14); ctx.stroke(); }
  }
  if (g) for (const b of g.bolts) {
    if (b.kind !== 'harpoon') continue;
    const a = Math.atan2(b.y - b.py, b.x - b.px);
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(a);
    ctx.strokeStyle = '#6b4a2c'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(0, 0); ctx.stroke();
    ctx.fillStyle = '#d9d2c3'; ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-2, -3.5); ctx.lineTo(-2, 3.5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // Iluminación: la escena queda en penumbra salvo donde hay luz
  ctx.restore();
  lighting(ctx, g, zone, vw, vh, dpr, cam, lampA, now);
  ctx.save();
  ctx.translate(cam.x, cam.y);
  ctx.scale(cam.s, cam.s);
  beamDust(ctx, lampA, now);
  flare(ctx, now);

  if (g) {
    // Niebla
    if (g.mod?.id === 'niebla') {
      ctx.fillStyle = radial(ctx, 0, 0, g.range * 1.5, [[0, 'rgba(150,170,190,0)'], [0.6, 'rgba(150,170,190,0)'], [1, 'rgba(120,140,160,.8)']]);
      ctx.fillRect(-600, -600, 1200, 1200);
    }
    ctx.globalCompositeOperation = 'lighter';
    // Haz del faro
    ctx.save();
    ctx.translate(0, LAMP_Y);
    ctx.rotate(g.lamp);
    for (const [len, w, a] of [[300, 50, 0.13], [280, 24, 0.22]] as const) {
      const bg = ctx.createLinearGradient(0, 0, len, 0);
      bg.addColorStop(0, `rgba(255,236,160,${a})`); bg.addColorStop(1, 'rgba(255,236,160,0)');
      ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(len, -w); ctx.lineTo(len, w); ctx.lineTo(0, 3); ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    // Efectos de luz
    for (const f of g.fx) {
      const k = f.t / f.max;
      if (f.kind === 'ring') {
        ctx.strokeStyle = f.c; ctx.globalAlpha = k; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(f.x, f.y, 30 + (1 - k) * 120, 0, TAU); ctx.stroke();
      } else if (f.kind === 'nova') {
        const r = 30 + (1 - k) * 240;
        ctx.globalAlpha = k;
        ctx.fillStyle = radial(ctx, 0, LAMP_Y * 0.5, r, [[0, 'rgba(255,243,176,0)'], [0.75, 'rgba(255,243,176,.15)'], [1, 'rgba(255,243,176,.7)']]);
        ctx.beginPath(); ctx.arc(0, LAMP_Y * 0.5, r, 0, TAU); ctx.fill();
      } else if (f.kind === 'strike') {
        ctx.globalAlpha = k;
        ctx.fillStyle = radial(ctx, f.x, f.y, (f.r || 30) * 1.5, [[0, 'rgba(240,245,255,1)'], [1, 'rgba(160,190,255,0)']]);
        ctx.beginPath(); ctx.arc(f.x, f.y, (f.r || 30) * 1.5, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(230,240,255,.9)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(f.x + 6, f.y - 120); ctx.lineTo(f.x - 4, f.y - 60); ctx.lineTo(f.x + 5, f.y - 40); ctx.lineTo(f.x, f.y); ctx.stroke();
      } else if (f.kind === 'boom') {
        const r = (f.r || 40) * (0.4 + (1 - k) * 0.9);
        ctx.globalAlpha = k;
        ctx.fillStyle = radial(ctx, f.x, f.y, r, [[0, 'rgba(255,240,180,1)'], [0.4, 'rgba(255,160,60,.8)'], [1, 'rgba(255,80,20,0)']]);
        ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, TAU); ctx.fill();
      } else if (f.kind === 'p') {
        ctx.globalAlpha = k; ctx.fillStyle = f.c;
        const s = 1.2 + k * 2.4;
        ctx.fillRect(f.x - s / 2, f.y - s / 2, s, s);
      }
    }
    ctx.globalAlpha = 1;

    // Rayos del faro
    ctx.lineCap = 'round';
    for (const b of g.bolts) {
      if (b.kind === 'harpoon') continue;
      const tx = b.px - (b.x - b.px) * 2, ty = b.py - (b.y - b.py) * 2;
      const col = b.crit ? '255,214,90' : b.bounce ? '140,220,255' : '255,246,200';
      ctx.strokeStyle = `rgba(${col},.25)`; ctx.lineWidth = b.crit ? 10 : 7;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.strokeStyle = `rgba(${col},1)`; ctx.lineWidth = b.crit ? 3.5 : 2.2;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    // Disparos de anguila
    for (const s of g.eshots) {
      ctx.fillStyle = radial(ctx, s.x, s.y, 9, [[0, 'rgba(220,255,230,1)'], [0.35, 'rgba(74,222,128,.8)'], [1, 'rgba(74,222,128,0)']]);
      ctx.beginPath(); ctx.arc(s.x, s.y, 9, 0, TAU); ctx.fill();
    }
    // Relámpago
    if (g.lightning > 0.15 && g.bolt.length) {
      for (const [w, a] of [[9, 0.25], [2.5, 1]] as const) {
        ctx.strokeStyle = `rgba(220,230,255,${a})`; ctx.lineWidth = w;
        ctx.beginPath(); g.bolt.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';

    // Textos
    ctx.textAlign = 'center';
    for (const x of g.texts) {
      const age = x.max - x.t, pop = age < 0.12 ? 1 + (0.12 - age) * 4 : 1;
      ctx.font = `900 ${Math.round((x.big ? 15 : 11) * pop)}px system-ui`;
      ctx.globalAlpha = Math.min(1, x.t * 2.5);
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,10,20,.7)'; ctx.strokeText(x.s, x.x, x.y);
      ctx.fillStyle = x.c; ctx.fillText(x.s, x.x, x.y);
    }
    ctx.globalAlpha = 1;
  } else {
    // Menú: el faro gira solo
    ctx.globalCompositeOperation = 'lighter';
    ctx.save(); ctx.translate(0, LAMP_Y); ctx.rotate(now * 0.6);
    const bg = ctx.createLinearGradient(0, 0, 300, 0);
    bg.addColorStop(0, 'rgba(255,236,160,.3)'); bg.addColorStop(1, 'rgba(255,236,160,0)');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(300, -40); ctx.lineTo(300, 40); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();

  drawWeather(ctx, zone, vw, vh, now);

  // Viñeta
  ctx.fillStyle = radial(ctx, vw / 2, vh / 2, Math.max(vw, vh) * 0.75, [[0.55, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.55)']]);
  ctx.fillRect(0, 0, vw, vh);

  if (g && g.lightning > 0) {
    ctx.fillStyle = `rgba(215,228,255,${Math.min(0.5, g.lightning * 1.4) * (Math.random() < 0.3 ? 0.4 : 1)})`;
    ctx.fillRect(0, 0, vw, vh);
  }
  if (g && g.frozen > 0) {
    ctx.fillStyle = radial(ctx, vw / 2, vh / 2, Math.max(vw, vh) * 0.7, [[0.5, 'rgba(180,230,255,0)'], [1, `rgba(200,240,255,${Math.min(0.5, g.frozen * 0.2)})`]]);
    ctx.fillRect(0, 0, vw, vh);
  }
  if (g && g.hurtT > 0) {
    ctx.fillStyle = radial(ctx, vw / 2, vh / 2, Math.max(vw, vh) * 0.7, [[0.45, 'rgba(255,0,0,0)'], [1, `rgba(255,30,40,${g.hurtT * 1.2})`]]);
    ctx.fillRect(0, 0, vw, vh);
  }
}

/* ---------- Isla y faro ---------- */
const rockShape = Array.from({ length: 14 }, (_, i) => 33 + Math.sin(i * 2.7) * 4 + hash(i + 5) * 4);

function drawIsland(ctx: CanvasRenderingContext2D, t: number) {
  // Espuma
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.5 + i / 3) % 1;
    ctx.strokeStyle = `rgba(230,245,255,${(1 - ph) * 0.35})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 4, 40 + ph * 22, (40 + ph * 22) * 0.8, 0, 0, TAU); ctx.stroke();
  }
  const isl = sprite('island', 44, c => {
    c.fillStyle = 'rgba(0,0,0,.35)';
    c.beginPath(); c.ellipse(3, 7, 40, 32, 0, 0, TAU); c.fill();
    c.beginPath();
    rockShape.forEach((r, i) => { const a = (i / rockShape.length) * TAU; const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.82 + 4; i ? c.lineTo(x, y) : c.moveTo(x, y); });
    c.closePath();
    c.fillStyle = radial(c, -8, -6, 44, [[0, '#7d8798'], [0.6, '#4a5263'], [1, '#2a303b']]);
    c.fill();
    c.strokeStyle = '#1c2129'; c.lineWidth = 1.5; c.stroke();
    for (let i = 0; i < 9; i++) {
      const a = hash(i + 30) * TAU, d = 12 + hash(i + 40) * 18, r = 3 + hash(i + 50) * 5;
      const x = Math.cos(a) * d, y = Math.sin(a) * d * 0.8 + 4;
      c.fillStyle = radial(c, x - r * 0.3, y - r * 0.4, r, [[0, '#8f99aa'], [1, '#3a414e']]);
      c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    }
    c.fillStyle = 'rgba(80,160,90,.35)';
    for (let i = 0; i < 6; i++) { const a = hash(i + 70) * TAU; c.beginPath(); c.arc(Math.cos(a) * 26, Math.sin(a) * 20 + 4, 2 + hash(i) * 3, 0, TAU); c.fill(); }
  });
  blit(ctx, isl, 44);
}

function drawTower(ctx: CanvasRenderingContext2D, t: number, g: Game | null) {
  const tw = sprite('tower', 40, c => {
    const top = LAMP_Y + 9, bot = 4;
    // sombra proyectada
    c.fillStyle = 'rgba(0,0,0,.3)';
    c.beginPath(); c.ellipse(9, bot + 1, 16, 6, -0.3, 0, TAU); c.fill();
    // cuerpo
    const body = new Path2D();
    body.moveTo(-12, bot); body.lineTo(-7.5, top); body.lineTo(7.5, top); body.lineTo(12, bot);
    body.ellipse(0, bot, 12, 4, 0, 0, Math.PI); body.closePath();
    const lg = c.createLinearGradient(-12, 0, 12, 0);
    lg.addColorStop(0, '#b9b2a3'); lg.addColorStop(0.35, '#fffaf0'); lg.addColorStop(1, '#8e8778');
    c.fillStyle = lg; c.fill(body);
    c.save(); c.clip(body);
    const rg = c.createLinearGradient(-12, 0, 12, 0);
    rg.addColorStop(0, '#9e2b25'); rg.addColorStop(0.35, '#e5483f'); rg.addColorStop(1, '#7a1f1a');
    c.fillStyle = rg;
    for (const y of [-8, -30]) { c.beginPath(); c.ellipse(0, y + 6, 14, 3.5, 0, 0, TAU); c.rect(-14, y, 28, 6); c.fill(); }
    c.restore();
    // puerta y ventanas
    c.fillStyle = '#3b2a20'; c.beginPath(); c.moveTo(-3, bot + 3); c.lineTo(-3, bot - 5); c.arc(0, bot - 5, 3, Math.PI, 0); c.lineTo(3, bot + 3); c.fill();
    c.fillStyle = '#ffe9a0'; c.fillRect(-1.5, -20, 3, 4); c.fillRect(-1.2, -40, 2.4, 3);
    // galería
    c.fillStyle = '#2a2f3a'; c.beginPath(); c.ellipse(0, top, 11, 3.2, 0, 0, TAU); c.fill();
    c.strokeStyle = '#4d5566'; c.lineWidth = 0.8;
    for (let i = -9; i <= 9; i += 3) { c.beginPath(); c.moveTo(i, top); c.lineTo(i, top - 3.5); c.stroke(); }
    c.beginPath(); c.ellipse(0, top - 3.5, 10.5, 2.8, 0, Math.PI, TAU); c.stroke();
    // linterna (vidrio)
    c.fillStyle = '#ffe58a'; c.fillRect(-5.5, LAMP_Y - 4, 11, 9);
    c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(-4.5, LAMP_Y - 3, 2, 7);
    c.strokeStyle = '#2a2f3a'; c.lineWidth = 0.9;
    for (const x of [-5.5, 0, 5.5]) { c.beginPath(); c.moveTo(x, LAMP_Y - 4); c.lineTo(x, LAMP_Y + 5); c.stroke(); }
    // cúpula
    c.fillStyle = radial(c, -2, LAMP_Y - 8, 8, [[0, '#ff7a6e'], [1, '#8a1f19']]);
    c.beginPath(); c.ellipse(0, LAMP_Y - 4, 7, 6, 0, Math.PI, TAU); c.fill();
    c.fillStyle = '#2a2f3a'; c.beginPath(); c.arc(0, LAMP_Y - 10.5, 1.4, 0, TAU); c.fill();
  });
  blit(ctx, tw, 40, 1);
  // resplandor de la linterna
  const pulse = 0.75 + 0.25 * Math.sin(t * 6);
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = radial(ctx, 0, LAMP_Y, 30, [[0, `rgba(255,236,150,${0.85 * pulse})`], [1, 'rgba(255,236,150,0)']]);
  ctx.beginPath(); ctx.arc(0, LAMP_Y, 30, 0, TAU); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  // barrera
  if (g && g.shield > 0) {
    const k = g.shield / Math.max(1, g.st.bar);
    ctx.strokeStyle = `rgba(125,211,252,${0.25 + 0.55 * k})`;
    ctx.lineWidth = 2.5; ctx.setLineDash([7, 5]); ctx.lineDashOffset = -t * 20;
    ctx.beginPath(); ctx.ellipse(0, -18, 46, 52, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = `rgba(125,211,252,${0.06 * k})`; ctx.fill();
  }
}

/* ---------- Criaturas ---------- */
const BODY: Record<string, (c: CanvasRenderingContext2D) => void> = {
  crab: c => {
    c.fillStyle = radial(c, -3, -3, 12, [[0, '#ffa184'], [0.55, '#e0533d'], [1, '#8f2618']]);
    c.beginPath(); c.ellipse(0, 0, 10, 8, 0, 0, TAU); c.fill();
    c.strokeStyle = '#5c160c'; c.lineWidth = 1; c.stroke();
    c.fillStyle = 'rgba(255,220,200,.5)'; c.beginPath(); c.arc(-3, -3, 2, 0, TAU); c.arc(1, -4, 1.2, 0, TAU); c.fill();
    c.fillStyle = '#111'; c.beginPath(); c.arc(6, -3, 1.6, 0, TAU); c.arc(6, 3, 1.6, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(6.5, -3.5, 0.6, 0, TAU); c.arc(6.5, 2.5, 0.6, 0, TAU); c.fill();
  },
  jelly: c => {
    c.fillStyle = radial(c, -2, -3, 11, [[0, 'rgba(255,220,255,.95)'], [0.5, 'rgba(206,120,255,.85)'], [1, 'rgba(120,50,190,.75)']]);
    c.beginPath(); c.arc(0, 0, 9, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(255,200,255,.8)'; c.lineWidth = 1; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(-2.5, -3, 3, 2, -0.5, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(255,170,255,.6)'; c.beginPath(); c.arc(0, 0, 4.5, 0, TAU); c.stroke();
  },
  sardine: c => {
    c.fillStyle = '#8fa9bf'; c.beginPath(); c.moveTo(-5, 0); c.lineTo(-10, -4); c.lineTo(-10, 4); c.closePath(); c.fill();
    const lg = c.createLinearGradient(0, -3, 0, 3); lg.addColorStop(0, '#5f7f9b'); lg.addColorStop(0.5, '#e9f5ff'); lg.addColorStop(1, '#aac3d6');
    c.fillStyle = lg; c.beginPath(); c.ellipse(0, 0, 6.5, 2.8, 0, 0, TAU); c.fill();
    c.fillStyle = '#111'; c.beginPath(); c.arc(4, -0.6, 0.8, 0, TAU); c.fill();
  },
  eelhead: c => {
    c.fillStyle = radial(c, 0, -2, 10, [[0, '#7ff0b5'], [0.6, '#2fbf7f'], [1, '#14603f']]);
    c.beginPath(); c.ellipse(0, 0, 9, 7, 0, 0, TAU); c.fill();
    c.fillStyle = '#fffbe0'; c.beginPath(); c.arc(4, -3, 2, 0, TAU); c.arc(4, 3, 2, 0, TAU); c.fill();
    c.fillStyle = '#111'; c.beginPath(); c.arc(4.6, -3, 1, 0, TAU); c.arc(4.6, 3, 1, 0, TAU); c.fill();
  },
  puffer: c => {
    c.strokeStyle = '#a8701a'; c.lineWidth = 1.4;
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; c.beginPath(); c.moveTo(Math.cos(a) * 8, Math.sin(a) * 8); c.lineTo(Math.cos(a) * 13, Math.sin(a) * 13); c.stroke(); }
    c.fillStyle = radial(c, -3, -3, 12, [[0, '#fff1b8'], [0.55, '#ffcf4d'], [1, '#c4851a']]);
    c.beginPath(); c.arc(0, 0, 10, 0, TAU); c.fill();
    c.fillStyle = 'rgba(160,100,20,.35)';
    for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(hash(i) * 10 - 5, hash(i + 9) * 10 - 5, 1.4, 0, TAU); c.fill(); }
    c.fillStyle = '#fff'; c.beginPath(); c.arc(-3, -3, 2.6, 0, TAU); c.arc(3, -3, 2.6, 0, TAU); c.fill();
    c.fillStyle = '#111'; c.beginPath(); c.arc(-3, -2.5, 1.3, 0, TAU); c.arc(3, -2.5, 1.3, 0, TAU); c.fill();
    c.strokeStyle = '#7a4a10'; c.lineWidth = 1; c.beginPath(); c.arc(0, 3, 2, 0.2, Math.PI - 0.2); c.stroke();
  },
  turtle: c => {
    c.fillStyle = radial(c, -3, -3, 15, [[0, '#8fd16a'], [0.6, '#4d7f33'], [1, '#253f18']]);
    c.beginPath(); c.ellipse(0, 0, 13, 12, 0, 0, TAU); c.fill();
    c.strokeStyle = '#1b2e11'; c.lineWidth = 1.2; c.stroke();
    c.strokeStyle = 'rgba(200,240,150,.6)'; c.lineWidth = 1.1;
    const hex = (x: number, y: number, r: number) => { c.beginPath(); for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; i ? c.lineTo(px, py) : c.moveTo(px, py); } c.closePath(); c.stroke(); };
    hex(0, 0, 4.5);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + TAU / 12; hex(Math.cos(a) * 8.5, Math.sin(a) * 8, 3.2); }
  },
  hermit: c => {
    c.fillStyle = radial(c, -3, -4, 14, [[0, '#fff0dc'], [0.5, '#e2b98c'], [1, '#8d6440']]);
    c.beginPath(); c.arc(-2, 0, 11, 0, TAU); c.fill();
    c.strokeStyle = '#6b4a2c'; c.lineWidth = 1.4;
    c.beginPath();
    for (let a = 0; a < TAU * 2.3; a += 0.2) { const r = 1 + a * 1.35; const x = -2 + Math.cos(a) * r, y = Math.sin(a) * r; a ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-6, -5, 3, 1.6, -0.6, 0, TAU); c.fill();
  },
};

function bossBody(zone: Zone) {
  return sprite('boss-' + zone.id, 36, c => {
    c.fillStyle = radial(c, -8, -10, 40, [[0, '#ffffff55'], [0.15, zone.tint], [1, '#05030a']]);
    c.beginPath(); c.arc(0, 0, 32, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 2; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.12)';
    for (let i = 0; i < 10; i++) { const a = hash(i) * TAU, d = hash(i + 4) * 22; c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d, 1.5 + hash(i + 8) * 3, 0, TAU); c.fill(); }
    for (const y of [-10, 10]) {
      c.fillStyle = radial(c, 15, y, 7, [[0, '#fff4c2'], [0.6, '#ffc94d'], [1, '#a36b00']]);
      c.beginPath(); c.ellipse(15, y, 7, 5.5, 0, 0, TAU); c.fill();
      c.fillStyle = '#1a0b00'; c.beginPath(); c.ellipse(17, y, 1.8, 4, 0, 0, TAU); c.fill();
    }
  });
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, time: number, zone: Zone, g: Game) {
  const a = Math.atan2(-e.y, -e.x), t = time + e.wob, k = e.r / { crab: 10, jelly: 9, mini: 9, sardine: 5, eel: 9, puffer: 11, turtle: 13, hermit: 11, boss: 32 }[e.type];
  const dist = Math.hypot(e.x, e.y);
  ctx.save();
  ctx.translate(e.x, e.y);
  // sombra en el agua
  ctx.fillStyle = 'rgba(0,10,25,.35)';
  ctx.beginPath(); ctx.ellipse(2, 4, e.r * 1.05, e.r * 0.7, 0, 0, TAU); ctx.fill();
  if (e.type !== 'boss') {
    const bob = Math.sin(t * 3 + e.wob);
    ctx.strokeStyle = `rgba(225,242,255,${0.28 + 0.12 * bob})`; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(0, 2, e.r * (1.15 + 0.08 * bob), e.r * (0.62 + 0.05 * bob), 0, 0.15, Math.PI - 0.15); ctx.stroke();
  }
  if (e.elite) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = radial(ctx, 0, 0, e.r * 2, [[0.4, 'rgba(255,210,122,.45)'], [1, 'rgba(255,210,122,0)']]);
    ctx.beginPath(); ctx.arc(0, 0, e.r * 2, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  if (e.type === 'boss' && e.enraged) {
    ctx.fillStyle = `rgba(255,60,90,${0.25 + 0.2 * Math.sin(t * 10)})`;
    ctx.beginPath(); ctx.arc(0, 0, e.r + 22, 0, TAU); ctx.fill();
  }
  ctx.rotate(a);
  ctx.scale(k, k);

  switch (e.type) {
    case 'crab': {
      ctx.strokeStyle = '#a93a2a'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (let i = -1; i <= 1; i++) for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(-1 + i * 3, s * 6); ctx.lineTo(-3 + i * 4 + Math.sin(t * 9 + i) * 1.5, s * 12); ctx.stroke();
      }
      for (const s of [-1, 1]) {
        ctx.fillStyle = radial(ctx, 11, s * 9, 5, [[0, '#ffa184'], [1, '#b8361f']]);
        ctx.beginPath(); ctx.arc(12 + Math.sin(t * 5 + s) * 1, s * 9, 4.5, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#5c160c'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(13, s * 9); ctx.lineTo(16, s * 9); ctx.stroke();
      }
      blit(ctx, sprite('crab', 12, BODY.crab), 12);
      break;
    }
    case 'jelly': case 'mini': {
      ctx.strokeStyle = 'rgba(220,150,255,.65)'; ctx.lineWidth = 1.4;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(-3, i * 2.6); ctx.quadraticCurveTo(-12, i * 3 + Math.sin(t * 7 + i) * 4, -20, i * 4 + Math.sin(t * 5 + i) * 2); ctx.stroke(); }
      ctx.scale(1 + 0.08 * Math.sin(t * 6), 1 - 0.06 * Math.sin(t * 6));
      blit(ctx, sprite('jelly', 11, BODY.jelly), 11);
      break;
    }
    case 'sardine': {
      ctx.rotate(Math.sin(t * 14) * 0.15);
      blit(ctx, sprite('sardine', 11, BODY.sardine), 11);
      break;
    }
    case 'eel': {
      for (let i = 6; i >= 1; i--) {
        const y = Math.sin(t * 6 - i * 0.8) * 3;
        ctx.fillStyle = i % 2 ? '#24a56b' : '#2fbf7f';
        ctx.beginPath(); ctx.arc(-i * 6, y, 8 - i * 0.9, 0, TAU); ctx.fill();
      }
      blit(ctx, sprite('eelhead', 10, BODY.eelhead), 10);
      break;
    }
    case 'puffer': {
      ctx.rotate(-a + Math.sin(t * 2) * 0.2);
      const puff = dist < 95 ? 1 + (95 - dist) / 95 * 0.45 + 0.05 * Math.sin(t * 20) : 1;
      ctx.scale(puff, puff);
      blit(ctx, sprite('puffer', 14, BODY.puffer), 14);
      break;
    }
    case 'turtle': {
      ctx.fillStyle = '#7fae55';
      for (const [fx, fy] of [[7, -12], [7, 12], [-8, -11], [-8, 11]]) {
        ctx.beginPath(); ctx.ellipse(fx, fy + Math.sin(t * 3 + fx) * 1.5, 5, 3, fx > 0 ? 0.5 * Math.sign(fy) : -0.5 * Math.sign(fy), 0, TAU); ctx.fill();
      }
      ctx.fillStyle = radial(ctx, 15, -1, 6, [[0, '#a5d47e'], [1, '#5b8a3c']]);
      ctx.beginPath(); ctx.ellipse(15, 0, 5.5, 4.5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(17, -2, 0.9, 0, TAU); ctx.arc(17, 2, 0.9, 0, TAU); ctx.fill();
      blit(ctx, sprite('turtle', 15, BODY.turtle), 15);
      break;
    }
    case 'hermit': {
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#d2452f';
        ctx.beginPath(); ctx.ellipse(10 + Math.sin(t * 6 + s) * 1.2, s * 6, 4.5, 3, s * 0.3, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(9, -2, 1.2, 0, TAU); ctx.arc(9, 2, 1.2, 0, TAU); ctx.fill();
      blit(ctx, sprite('hermit', 13, BODY.hermit), 13);
      break;
    }
    case 'boss': {
      ctx.lineCap = 'round';
      for (let i = 0; i < 8; i++) {
        const aa = (i / 8) * TAU + Math.sin(t * 1.6 + i) * 0.25;
        for (const [w, col] of [[8, '#05030a'], [5, zone.tint]] as const) {
          ctx.strokeStyle = col; ctx.lineWidth = w;
          ctx.beginPath(); ctx.moveTo(Math.cos(aa) * 22, Math.sin(aa) * 22);
          ctx.quadraticCurveTo(Math.cos(aa + 0.35) * 40, Math.sin(aa + 0.35) * 40, Math.cos(aa + Math.sin(t * 2 + i) * 0.3) * 54, Math.sin(aa + Math.sin(t * 2 + i) * 0.3) * 54);
          ctx.stroke();
        }
      }
      blit(ctx, bossBody(zone), 36);
      break;
    }
  }
  if (e.hitT > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, e.hitT * 6);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, 0, e.type === 'boss' ? 30 : 9, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();

  if (e.elite) {
    ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 4, t * 2, t * 2 + 4.5); ctx.stroke();
  }
  if (e.slowT > 0) {
    ctx.globalAlpha = Math.min(1, e.slowT);
    drawNet(ctx, e.x, e.y, e.r + 3, '#e8d9b0');
    ctx.globalAlpha = 1;
  }
  if (e.stun > 0) {
    ctx.fillStyle = '#fff3b0';
    for (let i = 0; i < 3; i++) { const aa = t * 5 + (i * TAU) / 3; ctx.beginPath(); ctx.arc(e.x + Math.cos(aa) * (e.r + 4), e.y - e.r - 5 + Math.sin(aa) * 3, 1.8, 0, TAU); ctx.fill(); }
  }
  if (e.hp < e.max && e.type !== 'boss') {
    const w = Math.max(14, e.r * 2);
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(e.x - w / 2 - 1, e.y - e.r - 9, w + 2, 4);
    ctx.fillStyle = e.elite ? '#ffd27a' : e.armor ? '#e8c39e' : '#ff6b6b';
    ctx.fillRect(e.x - w / 2, e.y - e.r - 8, w * Math.max(0, e.hp / e.max), 2);
  }
  void g;
}

/* ---------- Extras ---------- */
function drawNet(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.8, 0, 0, TAU); ctx.clip();
  ctx.strokeStyle = c; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = -r; i <= r; i += 7) { ctx.moveTo(i - r, -r); ctx.lineTo(i + r, r); ctx.moveTo(i + r, -r); ctx.lineTo(i - r, r); }
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = c; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.8, 0, 0, TAU); ctx.stroke();
}

function drawTurrets(ctx: CanvasRenderingContext2D, g: Game, t: number) {
  const dots = (x: number, y: number, n: number) => {
    ctx.fillStyle = '#ffe27a';
    for (let i = 0; i < Math.min(n, 5); i++) { ctx.beginPath(); ctx.arc(x - 6 + i * 3, y + 9, 1.1, 0, TAU); ctx.fill(); }
  };
  const base = (x: number, y: number, top: string) => {
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x + 2, y + 4, 9, 4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#4a5263'; ctx.fillRect(x - 7, y - 4, 14, 7);
    ctx.fillStyle = top; ctx.beginPath(); ctx.ellipse(x, y - 4, 7, 3, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3a414e'; ctx.beginPath(); ctx.ellipse(x, y + 3, 7, 3, 0, 0, Math.PI); ctx.fill();
  };
  if (g.lv.tA > 0) {
    const p = TURRET_POS.tA, a = g.tAim.tA;
    base(p.x, p.y, '#6c7586');
    ctx.save(); ctx.translate(p.x, p.y - 6); ctx.rotate(a);
    ctx.fillStyle = '#b08a3e'; ctx.fillRect(-3, -2.5, 14, 5);
    ctx.fillStyle = '#e0c27a'; ctx.fillRect(9, -3, 3, 6);
    ctx.fillStyle = '#8a6a2c'; ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, TAU); ctx.fill();
    ctx.restore();
    dots(p.x, p.y, g.lv.tA);
  }
  if (g.lv.tR > 0) {
    const p = TURRET_POS.tR, a = g.tAim.tR;
    base(p.x, p.y, '#7a5a3a');
    ctx.save(); ctx.translate(p.x, p.y - 6); ctx.rotate(a);
    ctx.strokeStyle = '#6b4a2c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(11, 0); ctx.stroke();
    ctx.fillStyle = '#e8d9b0'; ctx.beginPath(); ctx.arc(12, 0, 3.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#a08a5a'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(9, -3); ctx.lineTo(15, 3); ctx.moveTo(9, 3); ctx.lineTo(15, -3); ctx.stroke();
    ctx.restore();
    dots(p.x, p.y, g.lv.tR);
  }
  if (g.lv.tN > 0) {
    const p = TURRET_POS.tN, k = g.slamT > 0 ? Math.sin((g.slamT / 0.5) * Math.PI) : 0;
    base(p.x, p.y, '#5c6679');
    ctx.save(); ctx.translate(p.x, p.y - 10 + k * 5); ctx.rotate(Math.sin(t * 2) * 0.1);
    ctx.strokeStyle = '#2a2f3a'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, 6); ctx.moveTo(-4, -3); ctx.lineTo(4, -3); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 2, 6, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -7.5, 1.8, 0, TAU); ctx.stroke();
    ctx.restore();
    dots(p.x, p.y, g.lv.tN);
  }
}

function drawBoat(ctx: CanvasRenderingContext2D, now: number) {
  const x = ((now * 16) % 760) - 380, y = 58 + Math.sin(now * 1.2) * 2, rock = Math.sin(now * 1.6) * 0.06;
  ctx.strokeStyle = 'rgba(220,240,255,.25)'; ctx.lineWidth = 1.5;
  for (let i = 1; i <= 4; i++) { ctx.beginPath(); ctx.ellipse(x - i * 14, y + 6, 6 + i * 3, 2 + i, 0, 0, TAU); ctx.stroke(); }
  ctx.save(); ctx.translate(x, y); ctx.rotate(rock);
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(2, 7, 20, 4, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#6b3f22'; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(20, 0); ctx.lineTo(14, 7); ctx.lineTo(-14, 7); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#8a5530'; ctx.fillRect(-18, -1, 38, 2.5);
  ctx.strokeStyle = '#3b2a20'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -30); ctx.stroke();
  ctx.fillStyle = '#efe6d2'; ctx.beginPath(); ctx.moveTo(1, -28); ctx.quadraticCurveTo(14 + Math.sin(now * 2) * 2, -16, 1, -3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#d9cdb4'; ctx.beginPath(); ctx.moveTo(-1, -24); ctx.lineTo(-12, -4); ctx.lineTo(-1, -4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(12, -3, 1.4, 0, TAU); ctx.fill();
  ctx.restore();
}

function drawWeather(ctx: CanvasRenderingContext2D, zone: Zone, vw: number, vh: number, now: number) {
  if (zone.weather === 'rain') {
    ctx.strokeStyle = 'rgba(190,215,255,.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 90; i++) {
      const s = 0.6 + hash(i) * 0.9;
      const y = ((hash(i + 200) + now * 0.9 * s) % 1) * vh;
      const x = ((hash(i + 400) + now * 0.06 * s) % 1) * vw;
      ctx.moveTo(x, y); ctx.lineTo(x - 4 * s, y + 14 * s);
    }
    ctx.stroke();
  } else if (zone.weather === 'snow') {
    ctx.fillStyle = 'rgba(240,248,255,.8)';
    for (let i = 0; i < 80; i++) {
      const s = 0.4 + hash(i) * 0.8;
      const y = ((hash(i + 200) + now * 0.12 * s) % 1) * vh;
      const x = (((hash(i + 400) + Math.sin(now * 0.8 + i) * 0.02) % 1) + 1) % 1 * vw;
      ctx.beginPath(); ctx.arc(x, y, 0.8 + s * 1.6, 0, TAU); ctx.fill();
    }
  } else {
    for (let i = 0; i < 70; i++) {
      const s = 0.4 + hash(i) * 0.8;
      const y = ((hash(i + 200) + now * 0.05 * s) % 1) * vh;
      const x = (((hash(i + 400) + now * 0.02 * s + Math.sin(now + i) * 0.01) % 1) + 1) % 1 * vw;
      const hot = i % 5 === 0;
      ctx.fillStyle = hot ? `rgba(255,140,60,${0.5 + 0.4 * Math.sin(now * 5 + i)})` : 'rgba(170,160,150,.45)';
      ctx.fillRect(x, y, hot ? 2 : 1.6, hot ? 2 : 1.6);
    }
  }
}

/* ---------- Iluminación ---------- */
let lm: HTMLCanvasElement | null = null;
let lctx: CanvasRenderingContext2D | null = null;
let LM_RES = 0.5;
const AMBIENT: Record<string, string> = {
  none: 'rgb(112,126,162)', ice: 'rgb(140,156,186)', lava: 'rgb(140,104,96)', dark: 'rgb(24,22,44)',
};

function lighting(ctx: CanvasRenderingContext2D, g: Game | null, zone: Zone, vw: number, vh: number, dpr: number, cam: { x: number; y: number; s: number }, lamp: number, now: number) {
  LM_RES = quality === 2 ? 0.5 : 0.33;
  const W = Math.max(1, Math.round(vw * LM_RES)), H = Math.max(1, Math.round(vh * LM_RES));
  if (!lm) { lm = document.createElement('canvas'); lctx = lm.getContext('2d'); }
  if (!lctx) return;
  if (lm.width !== W || lm.height !== H) { lm.width = W; lm.height = H; }
  const c = lctx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'source-over';
  c.fillStyle = g || zone.mech === 'dark' ? AMBIENT[zone.mech] : AMBIENT.none;
  c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'lighter';
  c.setTransform(LM_RES * cam.s, 0, 0, LM_RES * cam.s, LM_RES * cam.x, LM_RES * cam.y);
  const light = (x: number, y: number, r: number, rgb: string, a: number) => {
    if (a <= 0.01) return;
    c.fillStyle = radial(c, x, y, r, [[0, `rgba(${rgb},${a})`], [1, `rgba(${rgb},0)`]]);
    c.fillRect(x - r, y - r, r * 2, r * 2);
  };
  const pulse = 0.85 + 0.15 * Math.sin(now * 6);
  light(0, LAMP_Y, 150, '255,214,150', 0.75 * pulse);
  light(0, 0, 95, '255,200,150', 0.35);
  if (g && zone.mech === 'dark') light(0, 0, g.range * 0.95, '90,80,140', 0.35);
  // cono del haz
  c.save();
  c.translate(0, LAMP_Y);
  c.rotate(lamp);
  const bg = c.createLinearGradient(0, 0, 330, 0);
  bg.addColorStop(0, 'rgba(255,232,170,.85)'); bg.addColorStop(1, 'rgba(255,232,170,0)');
  c.fillStyle = bg;
  c.beginPath(); c.moveTo(0, -6); c.lineTo(330, -78); c.lineTo(330, 78); c.lineTo(0, 6); c.closePath(); c.fill();
  c.restore();
  if (g) {
    for (const b of g.bolts) if (b.kind === 'light') light(b.x, b.y, b.crit ? 46 : 30, b.crit ? '255,210,90' : '255,240,200', 0.55);
    for (const s of g.eshots) light(s.x, s.y, 32, '90,240,150', 0.55);
    for (const h of g.hazards) light(h.x, h.y, h.r * 2.2, '255,110,40', 0.35 + 0.35 * (1 - h.t / 1.3));
    for (const f of g.fx) {
      const k = f.t / f.max;
      if (f.kind === 'boom') light(f.x, f.y, (f.r || 40) * 2.4, '255,150,60', k);
      else if (f.kind === 'nova') light(0, LAMP_Y * 0.5, 260, '255,240,180', k * 0.9);
      else if (f.kind === 'strike') light(f.x, f.y, 90, '200,220,255', k);
      else if (f.kind === 'ring') light(f.x, f.y, 120, '255,200,140', k * 0.4);
      else if (f.kind === 'slam') light(f.x, f.y, (f.r || 80), '255,220,170', k * 0.25);
    }
    for (const e of g.enemies) {
      if (e.burnT > 0) light(e.x, e.y, e.r * 3, '255,130,40', 0.45);
      if (e.elite) light(e.x, e.y, e.r * 3, '255,210,120', 0.3);
      if (e.type === 'jelly' || e.type === 'mini') light(e.x, e.y, e.r * 3, '200,120,255', 0.28);
    }
    if (g.lightning > 0) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.fillStyle = `rgba(200,215,255,${Math.min(0.9, g.lightning * 2.4)})`;
      c.fillRect(0, 0, W, H);
    }
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(lm, 0, 0, vw, vh);
  ctx.globalCompositeOperation = 'source-over';
}

/** Polvo y gotas brillando dentro del haz. */
function beamDust(ctx: CanvasRenderingContext2D, lamp: number, now: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(0, LAMP_Y);
  ctx.rotate(lamp);
  for (let i = 0; i < 34; i++) {
    const d = (hash(i) * 280 + now * (10 + hash(i + 3) * 14)) % 280 + 20;
    const off = (hash(i + 9) - 0.5) * d * 0.42 + Math.sin(now * 1.5 + i) * 3;
    const a = (1 - d / 300) * (0.35 + 0.35 * Math.sin(now * 3 + i * 1.7));
    if (a <= 0) continue;
    ctx.fillStyle = `rgba(255,240,200,${a})`;
    ctx.fillRect(d, off, 1.6, 1.6);
  }
  ctx.restore();
}

/** Destello de lente en la linterna. */
function flare(ctx: CanvasRenderingContext2D, now: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const p = 0.8 + 0.2 * Math.sin(now * 6);
  for (const [w, h, a] of [[70, 1.6, 0.55], [26, 1, 0.4]] as const) {
    const lg = ctx.createLinearGradient(-w, 0, w, 0);
    lg.addColorStop(0, 'rgba(255,230,170,0)'); lg.addColorStop(0.5, `rgba(255,240,200,${a * p})`); lg.addColorStop(1, 'rgba(255,230,170,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(-w, LAMP_Y - h / 2, w * 2, h);
  }
  ctx.fillStyle = radial(ctx, 0, LAMP_Y, 9, [[0, `rgba(255,255,240,${0.95 * p})`], [1, 'rgba(255,240,200,0)']]);
  ctx.beginPath(); ctx.arc(0, LAMP_Y, 9, 0, TAU); ctx.fill();
  ctx.strokeStyle = `rgba(255,210,150,${0.18 * p})`; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, LAMP_Y, 16 + Math.sin(now * 2) * 1.5, 0, TAU); ctx.stroke();
  ctx.restore();
}

/** Gaviotas en la pantalla de inicio. */
function drawGulls(ctx: CanvasRenderingContext2D, now: number) {
  ctx.strokeStyle = 'rgba(235,240,250,.85)';
  ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const sp = 14 + i * 3, x = ((now * sp + i * 170) % 620) - 310, y = -130 + i * 22 + Math.sin(now * 0.8 + i * 2) * 8;
    const flap = Math.sin(now * (6 + i) + i) * 3.5, s = 0.8 + hash(i) * 0.5;
    ctx.beginPath();
    ctx.moveTo(x - 7 * s, y - flap * s); ctx.quadraticCurveTo(x - 3 * s, y - 3 * s, x, y);
    ctx.quadraticCurveTo(x + 3 * s, y - 3 * s, x + 7 * s, y - flap * s);
    ctx.stroke();
  }
}
