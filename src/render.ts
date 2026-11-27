// Dibujo en canvas: agua animada, faro 2.5D, criaturas sombreadas, efectos y clima.
import { Game, Enemy, EType, LAMP_Y, TURRET_POS, Ship, Pickup } from './game';
import type { Zone, SkinDef } from './data';
import { MODE_RULES, COSTA, WEAPONS } from './data';
import { L } from './i18n';
import { Water } from './water';
import { ready, sheetFor, Sheet, islaArt, faroArt, redArt, arponArt, turretArt, bossSheet, boatSheet, decoSheet, Still } from './art';

let water: Water | null | undefined;

/** Foco de cámara para cinemáticas: punto del mundo y acercamiento (1 = normal). */
export const camFocus = { x: 0, y: 0, z: 1 };
/** Desplazamiento vertical del centro de la vista (px), para que el faro quede en la zona visible entre el HUD y el dock. */
export const view = { offY: 0, /** Modo Costa: y (px) donde queda la muralla en pantalla. */ costaY: 0 };

/* Calidad automática: si el dispositivo no alcanza ~25 FPS se baja la resolución
   del mar y de la luz, y el mar pierde el detalle fino. El mar 2D solo se usa sin WebGL. */
let quality = 2, lastNow = 0, slow = 0, ema = 1 / 60;
function adaptQuality(now: number) {
  const dt = now - lastNow;
  lastNow = now;
  if (dt <= 0 || dt > 0.5) return;
  ema = ema * 0.95 + dt * 0.05;
  slow = ema > 0.04 ? slow + dt : Math.max(0, slow - dt * 0.5);
  if (slow > 3 && quality > 0) { quality--; slow = 0; ema = 1 / 60; }
}
/** Color de la luz del faro (colección) y faro recoloreado. */
let BEAM = '255,236,160';
export function setBeam(rgb: string) { BEAM = rgb; }
let skinDef: SkinDef | null = null;
const skinCache = new Map<string, HTMLCanvasElement>();
export function setSkin(s: SkinDef) { skinDef = s; }
/** Copia del sprite del faro con las franjas rojas en otro color (se calcula una vez por faro). */
export function skinnedFaro(s: SkinDef | null = skinDef): CanvasImageSource {
  const src = faroArt.img;
  if (!s || s.id === 'clasico' || !ready(src)) return src;
  let c = skinCache.get(s.id);
  if (!c) {
    c = document.createElement('canvas');
    c.width = src.naturalWidth; c.height = src.naturalHeight;
    const x = c.getContext('2d', { willReadFrequently: true })!;
    x.drawImage(src, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height), px = d.data;
    for (let i = 0; i < px.length; i += 4) {
      const r = px[i] / 255, g = px[i + 1] / 255, b = px[i + 2] / 255;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, dd = mx - mn;
      if (dd < 0.18 || mx !== r) continue; // solo los rojos saturados (franjas y techo)
      let h = ((g - b) / dd) * 60; if (h < 0) h += 360;
      if (h > 25 && h < 335) continue;
      const sat = Math.min(1, (dd / (1 - Math.abs(2 * l - 1))) * s.sat), lum = Math.min(0.95, l * s.lum);
      const C = (1 - Math.abs(2 * lum - 1)) * sat, X = C * (1 - Math.abs(((s.hue / 60) % 2) - 1)), m = lum - C / 2;
      const k = Math.floor(s.hue / 60) % 6;
      const [R, G, B] = [[C, X, 0], [X, C, 0], [0, C, X], [0, X, C], [X, 0, C], [C, 0, X]][k];
      px[i] = (R + m) * 255; px[i + 1] = (G + m) * 255; px[i + 2] = (B + m) * 255;
    }
    x.putImageData(d, 0, 0);
    skinCache.set(s.id, c);
  }
  return c;
}
/** Cámara del último cuadro (para convertir un toque en pantalla a coordenadas del juego). */
export const lastCam = { x: 0, y: 0, s: 1 };
export function setQuality(q: number) { quality = q; }

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
  const costa = !!g && g.mode === 'costa';
  const cam = costa
    ? { x: vw / 2 + sx, y: (view.costaY || vh * 0.7) + sy, s: sc }
    : g
    ? { x: vw / 2 + sx - fx * sc * z, y: vh / 2 + view.offY + sy - fy * sc * z, s: sc * z }
    : { x: vw / 2, y: vh * 0.3, s: sc * 1.45 };
  lastCam.x = cam.x; lastCam.y = cam.y; lastCam.s = cam.s;
  const lampA = g ? g.lamp : now * 0.6;

  // Fondo y agua: shader en la GPU, o patrón 2D si no hay WebGL
  if (water === undefined) water = Water.create();
  if (water) {
    const c = water.render(vw, vh, quality === 2 ? Math.min(1, dpr * 0.6) : quality === 1 ? 0.45 : 0.3, zone, now, cam.x, cam.y, cam.s, lampA, costa ? 0 : 1, g ? g.lightning : 0, quality, BEAM, g?.mode === 'travesia' ? g.voyage : 0, costa ? 2 : g?.mode === 'travesia');
    ctx.drawImage(c, 0, 0, vw, vh);
  } else {
    ctx.fillStyle = radial(ctx, vw / 2, vh / 2, Math.max(vw, vh) * 0.8, [[0, zone.sky0], [1, zone.sky1]]);
    ctx.fillRect(0, 0, vw, vh);
    // Sin WebGL: líneas de oleaje largas que avanzan con el viento (sin mosaico que se repita)
    ctx.save();
    ctx.translate(vw / 2, vh / 2);
    ctx.rotate(0.55 + Math.PI / 2);
    const span = Math.hypot(vw, vh);
    ctx.lineCap = 'round';
    for (let i = 0; i < 34; i++) {
      const y0 = ((hash(i) * span * 1.4 + now * (8 + hash(i + 3) * 6)) % (span * 1.4)) - span * 0.7;
      const len = 60 + hash(i + 5) * 160, x0 = (hash(i + 9) - 0.5) * span;
      ctx.strokeStyle = `rgba(${zone.ring},${0.05 + hash(i + 7) * 0.07})`;
      ctx.lineWidth = 1 + hash(i + 2) * 2;
      ctx.beginPath();
      for (let k = 0; k <= 12; k++) { const x = x0 - len / 2 + (len * k) / 12, y = y0 + Math.sin(k * 0.6 + now * 0.8 + i) * 3; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
    }
    ctx.restore();
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
    } else if (f.kind === 'netfly') {
      const p = 1 - k, tx = f.tx ?? f.x, ty = f.ty ?? f.y;
      const nx = f.x + (tx - f.x) * p, ny = f.y + (ty - f.y) * p - Math.sin(p * Math.PI) * 45;
      ctx.strokeStyle = 'rgba(201,164,106,.6)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.quadraticCurveTo((f.x + nx) / 2, Math.min(f.y, ny) - 20, nx, ny); ctx.stroke();
      ctx.fillStyle = `rgba(0,10,25,${0.25 * p})`;
      ctx.beginPath(); ctx.ellipse(f.x + (tx - f.x) * p, f.y + (ty - f.y) * p, (f.r || 40) * (0.2 + 0.7 * p), (f.r || 40) * (0.15 + 0.5 * p), 0, 0, TAU); ctx.fill();
      drawNet(ctx, nx, ny, (f.r || 40) * (0.2 + 0.8 * p), f.c, (1 - p) * 2.5);
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

  // Criaturas hundiéndose al morir
  if (g) for (const f of g.fx) {
    if (f.kind !== 'sink' || !f.et) continue;
    const sh = sheetFor(f.et);
    if (!sh) continue;
    const k = f.t / f.max, sc2 = (f.r || 10) * sh.len * 1.18 / sh.ppu * (0.55 + 0.45 * k);
    const dir = Math.round(((((f.h || 0) % TAU) + TAU) % TAU) / (TAU / sh.dirs)) % sh.dirs;
    ctx.save();
    ctx.translate(f.x, f.y + (1 - k) * 5);
    ctx.rotate((1 - k) * 0.9);
    ctx.globalAlpha = k * k;
    ctx.drawImage(tinted(sh, zone), 0, dir * sh.px, sh.px, sh.px, -sh.ox * sc2, -sh.oy * sc2, sh.px * sc2, sh.px * sc2);
    ctx.restore();
    ctx.fillStyle = `rgba(210,240,255,${k * 0.6})`;
    for (let i = 0; i < 4; i++) { const a = i * 1.7 + f.x; ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * (f.r || 8) * (1.4 - k), f.y + Math.sin(a) * (f.r || 8) * 0.6 * (1.4 - k), 1.2 + (1 - k) * 1.5, 0, TAU); ctx.fill(); }
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
  if (costa) drawCostaBase(ctx, g!, t, now);
  else if (!g || g.mode !== 'travesia') drawIsland(ctx, t);
  if (g) for (const p of g.pickups) drawPickup(ctx, p, t);

  // Profundidad: lo que está "detrás" del faro se dibuja antes
  const layers: { y: number; draw: () => void }[] = costa ? [] : [{ y: 2, draw: () => drawTower(ctx, t, g) }];
  // Adornos de la Bahía: fijos, sin colisión; se ordenan por profundidad con las criaturas
  if (SHOW_DECO && zone.id === 'bahia' && !(g && (g.mode === 'travesia' || g.mode === 'escolta' || g.mode === 'asedio')))
    for (const d of BAHIA_DECO) layers.push({ y: d.y, draw: () => drawDeco(ctx, d, t) });
  if (g?.ship && g.ship.phase !== 'gap') { const sh = g.ship; layers.push({ y: sh.y, draw: () => drawSupplyShip(ctx, sh, t) }); }
  if (g) {
    for (const e of g.enemies) layers.push({ y: e.y, draw: () => drawEnemy(ctx, e, t, zone, g) });
    for (const k of ['tA', 'tR', 'tN'] as const) if (g.lv[k] > 0) layers.push({ y: TURRET_POS[k].y + 0.5, draw: () => drawTurret(ctx, g, k, t) });
  }
  layers.sort((a, b) => a.y - b.y);
  for (const l of layers) l.draw();
  if (costa) drawCostaFront(ctx, g!, t, now);
  if (g && g.frozen > 0) {
    ctx.fillStyle = `rgba(190,235,255,${Math.min(0.32, g.frozen * 0.2)})`;
    ctx.beginPath(); ctx.ellipse(0, -24, 20, 36, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 6, LAMP_Y + Math.sin(a) * 6); ctx.lineTo(Math.cos(a) * 14, LAMP_Y + Math.sin(a) * 14); ctx.stroke(); }
  }
  if (g) for (const b of g.bolts) {
    if (b.kind !== 'harpoon') continue;
    const a = Math.atan2(b.y - b.py, b.x - b.px);
    const tp = TURRET_POS.tA, mx = (tp.x + b.x) / 2, my = (tp.y - 8 + b.y) / 2 + 10;
    ctx.strokeStyle = 'rgba(201,164,106,.75)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(tp.x, tp.y - 8); ctx.quadraticCurveTo(mx, my, b.x, b.y); ctx.stroke();
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(a);
    if (ready(arponArt.img)) {
      const k = arponArt.k * 22; // 22 px de largo
      ctx.drawImage(arponArt.img, -6 - arponArt.ox * k, -arponArt.oy * k, arponArt.w * k, arponArt.h * k);
    } else {
      ctx.strokeStyle = '#6b4a2c'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(0, 0); ctx.stroke();
      ctx.fillStyle = '#d9d2c3'; ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-2, -3.5); ctx.lineTo(-2, 3.5); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  // Iluminación: la escena queda en penumbra salvo donde hay luz
  ctx.restore();
  lighting(ctx, g, zone, vw, vh, dpr, cam, lampA, now);
  ctx.save();
  ctx.translate(cam.x, cam.y);
  ctx.scale(cam.s, cam.s);
  if (!costa) beamDust(ctx, lampA, now);
  if (!costa) flare(ctx, now);

  if (g) {
    // Niebla
    if (g.mod?.id === 'niebla') {
      ctx.fillStyle = radial(ctx, 0, 0, g.range * 1.5, [[0, 'rgba(150,170,190,0)'], [0.6, 'rgba(150,170,190,0)'], [1, 'rgba(120,140,160,.8)']]);
      ctx.fillRect(-600, -600, 1200, 1200);
    }
    ctx.globalCompositeOperation = 'lighter';
    // Haz del faro (en la costa, los haces salen de las luces de la muralla)
    if (costa) drawCostaBeams(ctx, g);
    else {
    ctx.save();
    ctx.translate(0, LAMP_Y);
    ctx.rotate(g.lamp);
    for (const [len, w, a] of [[300, 50, 0.13], [280, 24, 0.22]] as const) {
      const bg = ctx.createLinearGradient(0, 0, len, 0);
      bg.addColorStop(0, `rgba(${BEAM},${a})`); bg.addColorStop(1, `rgba(${BEAM},0)`);
      ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(len, -w); ctx.lineTo(len, w); ctx.lineTo(0, 3); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    }

    // Efectos de luz
    for (const f of g.fx) {
      const k = f.t / f.max;
      if (f.kind === 'ring') {
        ctx.strokeStyle = f.c; ctx.globalAlpha = k; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(f.x, f.y, 30 + (1 - k) * 120, 0, TAU); ctx.stroke();
      } else if (f.kind === 'nova') {
        const r = 30 + (1 - k) * 240;
        ctx.globalAlpha = k;
        ctx.fillStyle = radial(ctx, 0, LAMP_Y * 0.5, r, [[0, `rgba(${BEAM},0)`], [0.75, `rgba(${BEAM},.15)`], [1, `rgba(${BEAM},.7)`]]);
        ctx.beginPath(); ctx.arc(0, LAMP_Y * 0.5, r, 0, TAU); ctx.fill();
      } else if (f.kind === 'zap') {
        const tx = f.tx ?? 0, ty = f.ty ?? 0, segs = 9;
        const pts: [number, number][] = [];
        const nx = -(ty - f.y), ny = tx - f.x, nl = Math.hypot(nx, ny) || 1;
        for (let i = 0; i <= segs; i++) {
          const p = i / segs, j = i === 0 || i === segs ? 0 : (Math.random() - 0.5) * 16;
          pts.push([f.x + (tx - f.x) * p + (nx / nl) * j, f.y + (ty - f.y) * p + (ny / nl) * j]);
        }
        for (const [w, col] of [[7, `rgba(80,240,160,${0.35 * k})`], [2.2, `rgba(230,255,245,${k})`]] as const) {
          ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineJoin = 'round';
          ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
        }
        ctx.strokeStyle = `rgba(160,255,210,${0.7 * k})`; ctx.lineWidth = 1;
        for (let i = 2; i < segs - 1; i += 3) {
          const [x, y] = pts[i];
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (Math.random() - 0.5) * 18, y + (Math.random() - 0.5) * 18); ctx.stroke();
        }
      } else if (f.kind === 'bite') {
        const r = (f.r || 8) * 0.9, c = 1 - k, h = f.h || 0;
        ctx.strokeStyle = `rgba(255,240,230,${k})`; ctx.lineWidth = 2; ctx.lineCap = 'round';
        for (const sgn of [-1, 1]) {
          const ang = h + Math.PI + sgn * (0.9 - c * 0.8);
          ctx.beginPath(); ctx.arc(f.x, f.y, r, ang - 0.5, ang + 0.5); ctx.stroke();
        }
        ctx.fillStyle = `rgba(255,220,200,${k})`;
        for (let i = 0; i < 4; i++) { const aa = i * 1.6 + h; ctx.fillRect(f.x + Math.cos(aa) * r * c * 1.6, f.y + Math.sin(aa) * r * c * 1.6, 2, 2); }
      } else if (f.kind === 'sting') {
        ctx.strokeStyle = `rgba(230,170,255,${k})`; ctx.lineWidth = 1.4;
        for (let i = 0; i < 5; i++) {
          const aa = Math.random() * TAU, rr = 6 + (1 - k) * 14;
          ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x + Math.cos(aa) * rr * 0.5 + (Math.random() - 0.5) * 5, f.y + Math.sin(aa) * rr * 0.5); ctx.lineTo(f.x + Math.cos(aa) * rr, f.y + Math.sin(aa) * rr); ctx.stroke();
        }
      } else if (f.kind === 'bash') {
        ctx.strokeStyle = `rgba(220,240,255,${k * 0.9})`; ctx.lineWidth = 3 * k + 0.5;
        const r = 6 + (1 - k) * 20;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, r, r * 0.7, 0, 0, TAU); ctx.stroke();
      } else if (f.kind === 'tap') {
        const rr = (f.r || 6) * (0.8 + (1 - k) * 1.4);
        ctx.strokeStyle = f.c; ctx.globalAlpha = k; ctx.lineWidth = 2.2 * k + 0.5;
        ctx.beginPath(); ctx.arc(f.x, f.y, rr, 0, TAU); ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (f.kind === 'heal') {
        const rr = (f.r || 80) * (0.3 + (1 - k) * 0.7);
        ctx.strokeStyle = `rgba(126,240,192,${k * 0.7})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, rr, rr * 0.8, 0, 0, TAU); ctx.stroke();
        ctx.fillStyle = `rgba(180,255,220,${k})`;
        for (let i = 0; i < 6; i++) { const aa = i * 1.05 + f.x, px = f.x + Math.cos(aa) * rr * 0.6, py = f.y + Math.sin(aa) * rr * 0.5 - (1 - k) * 12; ctx.fillRect(px - 2.5, py - 0.6, 5, 1.2); ctx.fillRect(px - 0.6, py - 2.5, 1.2, 5); }
      } else if (f.kind === 'cannon') {
        const h = f.h || 0, mx = f.x + Math.cos(h) * (f.r || 12), my = f.y + Math.sin(h) * (f.r || 12);
        ctx.fillStyle = `rgba(255,200,120,${k})`; ctx.beginPath(); ctx.arc(mx, my, 4 * k + 1, 0, TAU); ctx.fill();
        ctx.fillStyle = `rgba(200,205,215,${0.4 * k})`;
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(mx + Math.cos(h + i) * (1 - k) * 12, my + Math.sin(h + i) * (1 - k) * 12 - (1 - k) * 8, 3 + (1 - k) * 6, 0, TAU); ctx.fill(); }
      } else if (f.kind === 'crack') {
        ctx.strokeStyle = `rgba(255,210,190,${k})`; ctx.lineWidth = 1.6;
        for (let i = 0; i < 7; i++) { const aa = (i / 7) * TAU + f.x, r0 = (f.r || 10) * 0.6, r1 = r0 + (1 - k) * 22; ctx.beginPath(); ctx.moveTo(f.x + Math.cos(aa) * r0, f.y + Math.sin(aa) * r0); ctx.lineTo(f.x + Math.cos(aa) * r1, f.y + Math.sin(aa) * r1); ctx.stroke(); }
      } else if (f.kind === 'spray') {
        ctx.fillStyle = f.c; ctx.globalAlpha = Math.min(1, k * 1.6);
        ctx.beginPath(); ctx.arc(f.x, f.y, 1.3 + k, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
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
      if (b.kind !== 'light') continue;
      const tx = b.px - (b.x - b.px) * 2, ty = b.py - (b.y - b.py) * 2;
      const col = b.crit ? '255,214,90' : b.bounce ? '140,220,255' : BEAM;
      ctx.strokeStyle = `rgba(${col},.25)`; ctx.lineWidth = b.crit ? 10 : 7;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.strokeStyle = `rgba(${col},1)`; ctx.lineWidth = b.crit ? 3.5 : 2.2;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    // Modo Costa: balas de cañón, virotes y bombas de mortero (se dibujan normal, no aditivas)
    if (costa) {
      ctx.globalCompositeOperation = 'source-over';
      for (const b of g.bolts) {
        if (b.kind === 'cball') {
          const dx = b.x - b.px, dy = b.y - b.py;
          for (let i = 1; i <= 4; i++) { ctx.fillStyle = `rgba(190,195,205,${0.32 - i * 0.06})`; ctx.beginPath(); ctx.arc(b.x - dx * i * 1.6, b.y - dy * i * 1.6, 3.4 - i * 0.4, 0, TAU); ctx.fill(); }
          ctx.fillStyle = radial(ctx, b.x - 1.2, b.y - 1.2, 5.5, [[0, '#9aa3b2'], [1, '#1d2129']]);
          ctx.beginPath(); ctx.arc(b.x, b.y, 4.2, 0, TAU); ctx.fill();
        } else if (b.kind === 'quarrel') {
          const a = Math.atan2(b.y - b.py, b.x - b.px);
          ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(a);
          ctx.strokeStyle = '#8a6a3c'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(2, 0); ctx.stroke();
          ctx.fillStyle = '#d9dde6'; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(1, -2.2); ctx.lineTo(1, 2.2); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
      }
      for (const sh of g.shells) {
        const p = g.shellPos(sh), k = Math.min(1, sh.t / sh.max);
        ctx.strokeStyle = `rgba(255,170,80,${0.25 + 0.4 * k})`; ctx.lineWidth = 1.4; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.ellipse(sh.tx, sh.ty, sh.R * (0.5 + 0.5 * k), sh.R * (0.5 + 0.5 * k) * 0.7, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(0,10,25,.3)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 4, 2, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = radial(ctx, p.x - 1, p.y - p.h - 1, 6, [[0, '#ffb35c'], [0.5, '#7a4a2a'], [1, '#1d2129']]);
        ctx.beginPath(); ctx.arc(p.x, p.y - p.h, 4.6, 0, TAU); ctx.fill();
      }
      ctx.globalCompositeOperation = 'lighter';
    }
    // Disparos de anguila
    for (const s of g.eshots) {
      ctx.fillStyle = radial(ctx, s.x, s.y, 9, [[0, 'rgba(220,255,230,1)'], [0.35, 'rgba(74,222,128,.8)'], [1, 'rgba(74,222,128,0)']]);
      ctx.beginPath(); ctx.arc(s.x, s.y, 9, 0, TAU); ctx.fill();
    }
    // Bolas de fuego del pez ígneo: sombra en el agua y bola en el aire
    for (const f of g.fireballs) {
      if (f.t < 0) continue;
      const p = g.fireballPos(f), y = p.y - p.h;
      if (f.ball) {
        // Bala de cañón: hierro oscuro con estela de humo (se dibuja normal, no aditiva)
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(0,10,25,.3)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 5, 2.5, 0, 0, TAU); ctx.fill();
        for (let i = 1; i <= 4; i++) { const q = g.fireballPos({ ...f, t: Math.max(0, f.t - i * 0.06) }); ctx.fillStyle = `rgba(190,195,205,${0.35 - i * 0.07})`; ctx.beginPath(); ctx.arc(q.x, q.y - q.h, 3 + i, 0, TAU); ctx.fill(); }
        ctx.fillStyle = radial(ctx, p.x - 1.5, y - 1.5, 6, [[0, '#8a93a3'], [1, '#1d2129']]);
        ctx.beginPath(); ctx.arc(p.x, y, 4.5, 0, TAU); ctx.fill();
        ctx.globalCompositeOperation = 'lighter';
        continue;
      }
      ctx.fillStyle = radial(ctx, p.x, y, 14, [[0, 'rgba(255,250,220,1)'], [0.3, 'rgba(255,160,60,.95)'], [1, 'rgba(255,70,20,0)']]);
      ctx.beginPath(); ctx.arc(p.x, y, 14, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,120,40,.35)';
      for (let i = 1; i <= 3; i++) { const q = g.fireballPos({ ...f, t: Math.max(0, f.t - i * 0.05) }); ctx.beginPath(); ctx.arc(q.x, q.y - q.h, 5 - i, 0, TAU); ctx.fill(); }
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
    bg.addColorStop(0, `rgba(${BEAM},.3)`); bg.addColorStop(1, `rgba(${BEAM},0)`);
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

/** Dibuja una imagen fija con su origen en (x, y); k extra multiplica la escala. */
function drawStill(ctx: CanvasRenderingContext2D, a: Still, x: number, y: number, k = 1) {
  const s = a.k * k;
  ctx.drawImage(a.img, x - a.ox * s, y - a.oy * s, a.w * s, a.h * s);
}

function drawIsland(ctx: CanvasRenderingContext2D, t: number) {
  if (ready(islaArt.img)) {
    // Isla renderizada desde isla-base.glb: espuma que rompe en la orilla y la roca encima
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.5 + i / 3) % 1;
      ctx.strokeStyle = `rgba(230,245,255,${(1 - ph) * 0.35})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, 3, 41 + ph * 20, (41 + ph * 20) * 0.6, 0, 0, TAU); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(0,10,25,.3)';
    ctx.beginPath(); ctx.ellipse(3, 6, 42, 25, 0, 0, TAU); ctx.fill();
    drawStill(ctx, islaArt, 0, 0);
    return;
  }
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
  const tw = sprite('tower', 72, c => {
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
  if (g?.mode === 'travesia') drawPlayerShip(ctx, t);
  else if (ready(faroArt.img)) {
    // Faro renderizado desde faro-solo.glb, parado en el claro de la isla (linterna en LAMP_Y)
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath(); ctx.ellipse(9, -3, 17, 6, -0.3, 0, TAU); ctx.fill();
    { const k = faroArt.k; ctx.drawImage(skinnedFaro(), -faroArt.ox * k, -faroArt.oy * k, faroArt.w * k, faroArt.h * k); }
  } else blit(ctx, tw, 72, 1);
  // resplandor de la linterna
  const pulse = 0.75 + 0.25 * Math.sin(t * 6);
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = radial(ctx, 0, LAMP_Y, 30, [[0, `rgba(${BEAM},${0.85 * pulse})`], [1, `rgba(${BEAM},0)`]]);
  ctx.beginPath(); ctx.arc(0, LAMP_Y, 30, 0, TAU); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  // barrera
  if (g && g.shield > 0) {
    const k = g.shield / Math.max(1, g.st.bar);
    ctx.strokeStyle = `rgba(125,211,252,${0.25 + 0.55 * k})`;
    ctx.lineWidth = 2.5; ctx.setLineDash([7, 5]); ctx.lineDashOffset = -t * 20;
    ctx.beginPath(); ctx.ellipse(0, -20, 44, 46, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
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

/** Radio base de cada criatura (el dibujo por código está hecho a ese tamaño). */
const BASE_R: Record<EType, number> = {
  crab: 10, jelly: 9, mini: 9, sardine: 5, eel: 9, puffer: 11, turtle: 13, hermit: 11, boss: 32,
  seahorse: 9, star: 10, starlet: 10, lobster: 12, lionfish: 9, narwhal: 12, seal: 10, firefish: 9,
  volturtle: 14, lavacrab: 10, angler: 11, ghost: 9, pirate: 16, raider: 8, captain: 26,
};
/** Criaturas nuevas que, mientras llegan sus modelos, usan la hoja de otra con un tinte propio. */
const BORROW: Partial<Record<EType, [string, string, number, number]>> = {
  lavacrab: ['crab', '255,110,40', 0.5, 2.8], ghost: ['jelly', '235,232,255', 0.6, 2.7], volturtle: ['turtle', '48,32,26', 0.72, 2.8],
};

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, time: number, zone: Zone, g: Game) {
  const a = e.hd, t = time + e.wob, k = e.r / BASE_R[e.type];
  const dist = Math.hypot(e.x, e.y);
  ctx.save();
  const lunge = e.lungeT > 0 ? Math.sin((1 - e.lungeT / 0.24) * Math.PI) * e.r * 0.75 : 0;
  ctx.translate(e.x + Math.cos(a) * lunge, e.y + Math.sin(a) * lunge);
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
  if (e.type === 'seal' && e.under) {
    // Bajo el agua: solo una silueta oscura y burbujas
    ctx.fillStyle = 'rgba(0,15,30,.45)';
    ctx.beginPath(); ctx.ellipse(0, 2, e.r * 1.2, e.r * 0.6, a, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(210,240,255,.7)';
    for (let i = 0; i < 3; i++) { const p = (t * 1.5 + i / 3) % 1; ctx.beginPath(); ctx.arc(Math.sin(i * 2.1 + t) * 4, -p * 12, 1 + p, 0, TAU); ctx.fill(); }
    ctx.restore();
    return;
  }
  if (g.phased(e)) ctx.globalAlpha = 0.28;
  const borrow = BORROW[e.type];
  const sheet = e.type === 'boss' ? bossSheet(zone.id) : borrow ? sheetFor(borrow[0]) : sheetFor(e.type);
  if (sheet) drawFromSheet(ctx, e, borrow ? { ...sheet, len: borrow[3] } : sheet, t, dist, a, zone, borrow);
  else {
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
    case 'seahorse': {
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#2fa57a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-3, 0); ctx.quadraticCurveTo(-10, 2, -9, 7); ctx.arc(-6.5, 7, 2.5, Math.PI, Math.PI * 2.6); ctx.stroke();
      ctx.fillStyle = radial(ctx, 0, -2, 9, [[0, '#c9ffe6'], [0.5, '#5fd8a5'], [1, '#1f7a5a']]);
      ctx.beginPath(); ctx.ellipse(0, 0, 6, 4.5, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(6, -1, 3.5, 2.6, -0.2, 0, TAU); ctx.fill();
      ctx.fillRect(8, -1.6, 4, 1.8);
      ctx.strokeStyle = 'rgba(200,255,230,.8)'; ctx.lineWidth = 1;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 1.8, -4); ctx.lineTo(i * 1.8 - 1, -6.5 + Math.sin(t * 8 + i)); ctx.stroke(); }
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(6.5, -2, 0.9, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(126,240,192,${0.3 + 0.2 * Math.sin(t * 4)})`; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(0, 0, 11 + Math.sin(t * 4) * 1.5, 0, TAU); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      break;
    }
    case 'star': case 'starlet': {
      ctx.rotate(t * 0.8 - a);
      const star = new Path2D();
      for (let i = 0; i < 10; i++) { const rr = i % 2 ? 4.2 : 10, aa = (i / 10) * TAU - Math.PI / 2; i ? star.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr) : star.moveTo(Math.cos(aa) * rr, Math.sin(aa) * rr); }
      star.closePath();
      ctx.fillStyle = radial(ctx, -2, -2, 11, [[0, '#ffd9b3'], [0.5, '#ff9f6b'], [1, '#c2461f']]);
      ctx.fill(star); ctx.strokeStyle = '#8a2f12'; ctx.lineWidth = 1; ctx.stroke(star);
      ctx.fillStyle = 'rgba(255,235,210,.8)';
      for (let i = 0; i < 5; i++) { const aa = (i / 5) * TAU - Math.PI / 2; for (const d of [3, 6]) { ctx.beginPath(); ctx.arc(Math.cos(aa) * d, Math.sin(aa) * d, 0.8, 0, TAU); ctx.fill(); } }
      break;
    }
    case 'lobster': {
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#a3261a'; ctx.lineWidth = 1;
      for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(8, sg * 2); ctx.quadraticCurveTo(16, sg * 10, 22, sg * (14 + Math.sin(t * 3) * 2)); ctx.stroke(); }
      for (const sg of [-1, 1]) {
        ctx.strokeStyle = '#b3301f'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(4, sg * 4); ctx.lineTo(10, sg * 9); ctx.stroke();
        ctx.fillStyle = radial(ctx, 13, sg * 10, 6, [[0, '#ff8a6b'], [1, '#a3261a']]);
        ctx.beginPath(); ctx.ellipse(14 + Math.sin(t * 4 + sg) * 0.8, sg * 10, 5.5, 3.6, sg * 0.3, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = '#c23a26';
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(-5 - i * 3.6, 0, 3.6 - i * 0.4, 4.6 - i * 0.6, 0, 0, TAU); ctx.fill(); }
      ctx.beginPath(); ctx.moveTo(-17, 0); ctx.lineTo(-21, -4); ctx.lineTo(-21, 4); ctx.closePath(); ctx.fill();
      const sh = e.shellMax > 0 ? e.shell / e.shellMax : 0;
      ctx.fillStyle = radial(ctx, 0, -2, 10, sh > 0 ? [[0, '#ffc2a8'], [0.5, '#e0442e'], [1, '#6a140b']] : [[0, '#ff9d86'], [1, '#b3301f']]);
      ctx.beginPath(); ctx.ellipse(1, 0, 8, 6, 0, 0, TAU); ctx.fill();
      if (sh > 0) {
        ctx.strokeStyle = 'rgba(255,230,210,.85)'; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.ellipse(1, 0, 8.5, 6.5, 0, 0, TAU); ctx.stroke();
        ctx.strokeStyle = 'rgba(60,10,5,.8)'; ctx.lineWidth = 0.8;
        if (sh < 0.66) { ctx.beginPath(); ctx.moveTo(-2, -5); ctx.lineTo(1, -1); ctx.lineTo(-1, 3); ctx.stroke(); }
        if (sh < 0.33) { ctx.beginPath(); ctx.moveTo(5, -4); ctx.lineTo(3, 0); ctx.lineTo(6, 4); ctx.stroke(); }
      }
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(7, -2.5, 1, 0, TAU); ctx.arc(7, 2.5, 1, 0, TAU); ctx.fill();
      break;
    }
    case 'lionfish': {
      ctx.lineCap = 'round';
      for (let i = 0; i < 9; i++) {
        const aa = Math.PI * 0.55 + (i / 8) * Math.PI * 0.9 + Math.sin(t * 3 + i) * 0.06;
        for (const sg of [-1, 1]) {
          ctx.strokeStyle = i % 2 ? '#fff1e6' : '#d9481f'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(-1, 0); ctx.lineTo(Math.cos(aa) * 13 - 1, sg * Math.sin(aa) * 13); ctx.stroke();
        }
      }
      const lg = ctx.createLinearGradient(-8, 0, 8, 0);
      for (let i = 0; i <= 8; i++) lg.addColorStop(i / 8, i % 2 ? '#fff1e6' : '#e0582c');
      ctx.fillStyle = lg; ctx.beginPath(); ctx.ellipse(0, 0, 8, 3.8, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#e0582c'; ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-12, -3.5 + Math.sin(t * 9)); ctx.lineTo(-12, 3.5 + Math.sin(t * 9)); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(5.5, -1.2, 0.9, 0, TAU); ctx.fill();
      break;
    }
    case 'narwhal': {
      ctx.fillStyle = '#b8c9d6';
      ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-17, -5 + Math.sin(t * 4) * 1.5); ctx.lineTo(-15, 0); ctx.lineTo(-17, 5 + Math.sin(t * 4) * 1.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = radial(ctx, 0, -3, 14, [[0, '#f2f8fc'], [0.55, '#9fb6c6'], [1, '#4c6273']]);
      ctx.beginPath(); ctx.ellipse(0, 0, 12, 6.5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(60,80,95,.45)';
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(-6 + hash(i) * 12, -3 + hash(i + 3) * 6, 0.9, 0, TAU); ctx.fill(); }
      ctx.strokeStyle = '#f5ecd6'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(27, 0); ctx.stroke();
      ctx.strokeStyle = 'rgba(150,130,100,.7)'; ctx.lineWidth = 0.7;
      for (let x = 13; x < 26; x += 2.2) { ctx.beginPath(); ctx.moveTo(x, -0.9); ctx.lineTo(x + 1.2, 0.9); ctx.stroke(); }
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(8, -3, 0.9, 0, TAU); ctx.arc(8, 3, 0.9, 0, TAU); ctx.fill();
      break;
    }
    case 'seal': {
      ctx.fillStyle = '#6d7f8d';
      for (const sg of [-1, 1]) { ctx.beginPath(); ctx.ellipse(1, sg * 7, 4, 1.8, sg * 0.5 + Math.sin(t * 5) * 0.2 * sg, 0, TAU); ctx.fill(); }
      ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-14, -4); ctx.lineTo(-13, 0); ctx.lineTo(-14, 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = radial(ctx, 2, -2, 12, [[0, '#d4dde4'], [0.5, '#8c9eac'], [1, '#4a5a66']]);
      ctx.beginPath(); ctx.ellipse(0, 0, 10, 5.5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(50,60,70,.5)';
      for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(-6 + hash(i + 9) * 12, -3 + hash(i + 2) * 6, 0.8, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(7, -2.2, 1.1, 0, TAU); ctx.arc(7, 2.2, 1.1, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.arc(9.6, 0, 0.9, 0, TAU); ctx.fill();
      break;
    }
    case 'firefish': {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = radial(ctx, -9, 0, 9, [[0, 'rgba(255,200,80,.8)'], [1, 'rgba(255,80,20,0)']]);
      ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-16, -5 + Math.sin(t * 12) * 2); ctx.lineTo(-13, 0); ctx.lineTo(-16, 5 + Math.sin(t * 12 + 1) * 2); ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = radial(ctx, 1, -1, 10, [[0, '#ffe7a3'], [0.45, '#ff8a3d'], [1, '#8a2a10']]);
      ctx.beginPath(); ctx.ellipse(0, 0, 8, 5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#c23a14'; ctx.beginPath(); ctx.moveTo(-2, -4); ctx.lineTo(2, -8 + Math.sin(t * 8)); ctx.lineTo(4, -4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff6d0'; ctx.beginPath(); ctx.arc(5, -1.5, 1.4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(5.3, -1.5, 0.7, 0, TAU); ctx.fill();
      break;
    }
    case 'angler': {
      // Farolillo colgando delante
      const lx = 15, ly = -9 + Math.sin(t * 3) * 1.5;
      ctx.strokeStyle = '#3d4a5c'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(4, -5); ctx.quadraticCurveTo(10, -14, lx, ly); ctx.stroke();
      ctx.fillStyle = radial(ctx, -1, -2, 13, [[0, '#4a5a70'], [0.6, '#232c3b'], [1, '#0c1018']]);
      ctx.beginPath(); ctx.ellipse(0, 0, 11, 8, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#0c1018'; ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-15, -4); ctx.lineTo(-15, 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#05070b'; ctx.beginPath(); ctx.ellipse(7, 1, 4.5, 4, 0, -1.2, 1.2); ctx.fill();
      ctx.fillStyle = '#e9edf2';
      for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(8.5, i * 1.2); ctx.lineTo(10.5, i * 1.2 + 0.4); ctx.lineTo(8.5, i * 1.2 + 0.8); ctx.fill(); }
      ctx.fillStyle = '#b8f7ff'; ctx.beginPath(); ctx.arc(3, -4, 1.1, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = radial(ctx, lx, ly, 9, [[0, 'rgba(230,255,255,1)'], [0.3, 'rgba(94,231,255,.8)'], [1, 'rgba(94,231,255,0)']]);
      ctx.beginPath(); ctx.arc(lx, ly, 9, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      break;
    }
    case 'pirate': case 'captain': {
      const big = e.type === 'captain';
      ctx.rotate(Math.sin(t * 1.3) * 0.04);
      // casco
      ctx.fillStyle = big ? '#2a1d14' : '#3b2a1c';
      ctx.beginPath(); ctx.moveTo(22, 0); ctx.quadraticCurveTo(12, -10, -16, -9); ctx.lineTo(-20, 0); ctx.lineTo(-16, 9); ctx.quadraticCurveTo(12, 10, 22, 0); ctx.fill();
      ctx.fillStyle = big ? '#5a3c22' : '#6b4a2c';
      ctx.beginPath(); ctx.moveTo(17, 0); ctx.quadraticCurveTo(9, -7, -13, -6); ctx.lineTo(-15, 0); ctx.lineTo(-13, 6); ctx.quadraticCurveTo(9, 7, 17, 0); ctx.fill();
      // cañones a los costados
      ctx.fillStyle = '#15181d';
      for (const x of big ? [-8, -1, 6] : [-4, 4]) for (const sg of [-1, 1]) ctx.fillRect(x - 1.5, sg * 9.5 - 1, 3, 2);
      // mástiles y velas oscuras
      for (const mx of big ? [-8, 2, 11] : [-3, 7]) {
        ctx.fillStyle = big ? '#1b1b22' : '#26262e';
        ctx.beginPath(); ctx.ellipse(mx, 0, 3, big ? 11 : 9, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#2b1a10'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(mx, -11); ctx.lineTo(mx, 11); ctx.stroke();
      }
      // emblema: calavera simple en la vela mayor
      const ex = big ? 2 : 7;
      ctx.fillStyle = '#e9e4d6'; ctx.beginPath(); ctx.arc(ex, -1, 2.1, 0, TAU); ctx.fill();
      ctx.fillRect(ex - 1.3, 0.6, 2.6, 1.4);
      ctx.strokeStyle = '#e9e4d6'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(ex - 3, 2.5); ctx.lineTo(ex + 3, 5); ctx.moveTo(ex + 3, 2.5); ctx.lineTo(ex - 3, 5); ctx.stroke();
      if (big) { ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(-26, -3); ctx.lineTo(-26, 3); ctx.closePath(); ctx.fill(); }
      break;
    }
    case 'raider': {
      ctx.rotate(Math.sin(t * 6) * 0.06);
      ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
      const o = Math.sin(t * 9) * 3;
      for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-2, sg * 4); ctx.lineTo(-6 + o, sg * 11); ctx.stroke(); }
      ctx.fillStyle = '#7a5434'; ctx.beginPath(); ctx.moveTo(11, 0); ctx.quadraticCurveTo(6, -5, -9, -4); ctx.lineTo(-10, 0); ctx.lineTo(-9, 4); ctx.quadraticCurveTo(6, 5, 11, 0); ctx.fill();
      ctx.fillStyle = '#a0764a'; ctx.beginPath(); ctx.ellipse(0, 0, 8, 2.8, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2b2b33'; for (const x of [-4, 3]) { ctx.beginPath(); ctx.arc(x, 0, 2, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(3, 0, 1.1, 0, TAU); ctx.fill();
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
  }
  if (e.type === 'eel' && e.chargeT > 0) {
    const k = 1 - e.chargeT / 0.5, hx = Math.cos(a) * e.r * 1.7, hy = Math.sin(a) * e.r * 1.7 - 4;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = radial(ctx, hx, hy, 6 + 12 * k, [[0, `rgba(220,255,240,${0.9 * k})`], [0.4, `rgba(80,240,160,${0.6 * k})`], [1, 'rgba(80,240,160,0)']]);
    ctx.beginPath(); ctx.arc(hx, hy, 6 + 12 * k, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(200,255,230,${0.8 * k})`; ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const aa = Math.random() * TAU, rr = 6 + 8 * k;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + Math.cos(aa) * rr * 0.5 + (Math.random() - 0.5) * 4, hy + Math.sin(aa) * rr * 0.5); ctx.lineTo(hx + Math.cos(aa) * rr, hy + Math.sin(aa) * rr); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  if (e.hitT > 0 && !sheet) {
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
    ctx.globalAlpha = Math.min(1, e.slowT) * 0.6;
    drawNet(ctx, e.x, e.y, e.type === 'boss' ? e.r * 0.75 : e.r + 3, '#e8d9b0');
    ctx.globalAlpha = 1;
  }
  if (e.stun > 0) {
    ctx.fillStyle = '#fff3b0';
    for (let i = 0; i < 3; i++) { const aa = t * 5 + (i * TAU) / 3; ctx.beginPath(); ctx.arc(e.x + Math.cos(aa) * (e.r + 4), e.y - e.r - 5 + Math.sin(aa) * 3, 1.8, 0, TAU); ctx.fill(); }
  }
  if (e.type === 'narwhal' && e.mode === 1) {
    // Apunta: línea roja hacia el faro que se llena mientras carga
    const k = 1 - e.chargeT, d = Math.hypot(e.x, e.y) || 1;
    ctx.strokeStyle = `rgba(255,80,80,${0.35 + 0.45 * k})`; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.lineDashOffset = -t * 30;
    ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo((e.x / d) * 30, (e.y / d) * 30 - 6); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = `rgba(255,120,120,${0.6 + 0.4 * Math.sin(t * 20)})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 5, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke();
  }
  if (e.shell > 0) {
    const w = Math.max(14, e.r * 2);
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(e.x - w / 2 - 1, e.y - e.r - 14, w + 2, 4);
    ctx.fillStyle = '#ffb08a'; ctx.fillRect(e.x - w / 2, e.y - e.r - 13, w * (e.shell / e.shellMax), 2);
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
function drawNet(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c: string, spin = 0) {
  if (ready(redArt.img)) {
    // Red renderizada desde red.glb (diámetro 2r)
    ctx.save(); ctx.translate(x, y); if (spin) ctx.rotate(spin);
    drawStill(ctx, redArt, 0, 0, 2 * r);
    ctx.restore();
    return;
  }
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

/** Una torreta: base fija en su plataforma y cabeza que gira hacia el blanco (16 direcciones)
 *  con 4 cuadros: reposo y disparo. Sin arte, se dibuja la versión por código. */
function drawTurret(ctx: CanvasRenderingContext2D, g: Game, key: 'tA' | 'tR' | 'tN', t: number) {
  const p = TURRET_POS[key], art = turretArt(key);
  if (!art) { drawTurretOld(ctx, g, key, t); return; }
  let aim: number, fire: number;
  if (key === 'tN') {
    // El ancla mira a la criatura más cercana; su golpe dura 0.5 s
    let best: Enemy | null = null, bd = 1e9;
    for (const e of g.enemies) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (!e.dead && d < bd) { bd = d; best = e; } }
    aim = best ? Math.atan2(best.y - p.y, best.x - p.x) : Math.PI / 2;
    fire = g.slamT > 0 ? 1 - g.slamT / 0.5 : -1;
  } else {
    aim = g.tAim[key];
    fire = g.tFire[key] > 0 ? 1 - g.tFire[key] / (key === 'tA' ? 0.3 : 0.36) : -1;
  }
  const dir = Math.round((((aim % TAU) + TAU) % TAU) / (TAU / art.dirs)) % art.dirs;
  const frame = fire < 0 ? 0 : Math.min(art.frames - 1, 1 + Math.floor(fire * (art.frames - 1)));
  const k = art.k, w = art.px * k;
  ctx.fillStyle = 'rgba(0,10,25,.3)';
  ctx.beginPath(); ctx.ellipse(p.x + 2, p.y + 2, 8, 3.5, 0, 0, TAU); ctx.fill();
  ctx.drawImage(art.base, p.x - art.ox * k, p.y - art.oy * k, w, w);
  ctx.drawImage(art.head, frame * art.px, dir * art.px, art.px, art.px, p.x - art.ox * k, p.y - art.oy * k, w, w);
  // Nivel: puntitos bajo la plataforma
  ctx.fillStyle = '#7ff0e0';
  for (let i = 0, n = Math.min(g.lv[key], 5); i < n; i++) { ctx.beginPath(); ctx.arc(p.x - (n - 1) * 1.5 + i * 3, p.y + 6, 0.9, 0, TAU); ctx.fill(); }
}

function drawTurretOld(ctx: CanvasRenderingContext2D, g: Game, key: 'tA' | 'tR' | 'tN', t: number) {
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
  if (key === 'tA') {
    const p = TURRET_POS.tA, a = g.tAim.tA;
    base(p.x, p.y, '#6c7586');
    ctx.save(); ctx.translate(p.x, p.y - 6); ctx.rotate(a);
    ctx.fillStyle = '#b08a3e'; ctx.fillRect(-3, -2.5, 14, 5);
    ctx.fillStyle = '#e0c27a'; ctx.fillRect(9, -3, 3, 6);
    ctx.fillStyle = '#8a6a2c'; ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, TAU); ctx.fill();
    ctx.restore();
    dots(p.x, p.y, g.lv.tA);
  }
  if (key === 'tR') {
    const p = TURRET_POS.tR, a = g.tAim.tR;
    base(p.x, p.y, '#7a5a3a');
    ctx.save(); ctx.translate(p.x, p.y - 6); ctx.rotate(a);
    ctx.strokeStyle = '#6b4a2c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(11, 0); ctx.stroke();
    ctx.fillStyle = '#e8d9b0'; ctx.beginPath(); ctx.arc(12, 0, 3.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#a08a5a'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(9, -3); ctx.lineTo(15, 3); ctx.moveTo(9, 3); ctx.lineTo(15, -3); ctx.stroke();
    ctx.restore();
    dots(p.x, p.y, g.lv.tR);
  }
  if (key === 'tN') {
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

/** Travesía: tu barco, con el farol en lo alto del mástil (donde estaría la linterna del faro). */
function drawPlayerShip(ctx: CanvasRenderingContext2D, t: number) {
  const sp = boatSheet('jugador');
  if (sp) { drawPlayerShipSprite(ctx, sp, t); return; }
  const rock = Math.sin(t * 1.4) * 0.04;
  ctx.save(); ctx.rotate(rock);
  // estela
  ctx.strokeStyle = 'rgba(225,242,255,.35)'; ctx.lineWidth = 2;
  for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sg * 10, 14); ctx.quadraticCurveTo(sg * 20, 40, sg * 34, 80); ctx.stroke(); }
  ctx.fillStyle = 'rgba(0,10,25,.35)'; ctx.beginPath(); ctx.ellipse(3, 6, 19, 26, 0, 0, TAU); ctx.fill();
  // casco visto desde atrás y arriba
  const hull = new Path2D();
  hull.moveTo(0, -30); hull.quadraticCurveTo(17, -16, 15, 6); hull.quadraticCurveTo(13, 20, 0, 22); hull.quadraticCurveTo(-13, 20, -15, 6); hull.quadraticCurveTo(-17, -16, 0, -30);
  ctx.fillStyle = '#5a3a22'; ctx.fill(hull);
  ctx.save(); ctx.clip(hull);
  ctx.fillStyle = '#8a5a34'; ctx.beginPath(); ctx.ellipse(0, -2, 11, 22, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(60,35,18,.6)'; ctx.lineWidth = 0.8;
  for (let x = -9; x <= 9; x += 3) { ctx.beginPath(); ctx.moveTo(x, -24); ctx.lineTo(x, 22); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle = '#2f1d10'; ctx.lineWidth = 1.4; ctx.stroke(hull);
  // cajas en cubierta
  ctx.fillStyle = '#b08a52'; ctx.fillRect(-8, 6, 6, 6); ctx.fillRect(3, 8, 5, 5);
  ctx.strokeStyle = '#6b4a2c'; ctx.lineWidth = 0.7; ctx.strokeRect(-8, 6, 6, 6); ctx.strokeRect(3, 8, 5, 5);
  // mástil, vela y farol
  ctx.strokeStyle = '#3b2a1c'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(0, LAMP_Y + 6); ctx.stroke();
  const sw = Math.sin(t * 2) * 1.5;
  ctx.fillStyle = '#efe6d2'; ctx.beginPath(); ctx.moveTo(-15, -34); ctx.quadraticCurveTo(0, -30 + sw, 15, -34); ctx.lineTo(13, -12); ctx.quadraticCurveTo(0, -8 + sw, -13, -12); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#c9bfa6'; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.strokeStyle = '#3b2a1c'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-16, -34); ctx.lineTo(16, -34); ctx.stroke();
  ctx.fillStyle = '#2a2f3a'; ctx.fillRect(-4, LAMP_Y - 3, 8, 8);
  ctx.fillStyle = '#ffe58a'; ctx.fillRect(-3, LAMP_Y - 2, 6, 6);
  ctx.restore();
}

/** Dibuja una imagen de la hoja: dirección (rumbo en radianes del juego) y cuadro de animación. */
function blitSheet(ctx: CanvasRenderingContext2D, sp: Sheet, heading: number, frame: number, k: number, dy = 0) {
  const dir = Math.round((((heading % TAU) + TAU) % TAU) / (TAU / sp.dirs)) % sp.dirs;
  const w = sp.px * k;
  ctx.drawImage(sp.img, (frame % sp.frames) * sp.px, dir * sp.px, sp.px, sp.px, -sp.ox * k, -sp.oy * k + dy, w, w);
}

/** Travesía: el barco visto desde atrás; el faro de la proa queda en LAMP_Y, de donde sale la luz. */
function drawPlayerShipSprite(ctx: CanvasRenderingContext2D, sp: Sheet, t: number) {
  const rock = Math.sin(t * 1.4) * 0.04;
  ctx.save(); ctx.rotate(rock);
  ctx.strokeStyle = 'rgba(225,242,255,.35)'; ctx.lineWidth = 2;
  for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sg * 10, 14); ctx.quadraticCurveTo(sg * 20, 40, sg * 34, 80); ctx.stroke(); }
  ctx.fillStyle = 'rgba(0,10,25,.35)'; ctx.beginPath(); ctx.ellipse(3, 6, 19, 26, 0, 0, TAU); ctx.fill();
  blitSheet(ctx, sp, -Math.PI / 2, Math.floor(t * sp.fps), sp.len / sp.ppu, 4);
  // asta con el farol en lo alto (de ahí sale el haz)
  ctx.strokeStyle = '#3b2a1c'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, LAMP_Y + 14); ctx.lineTo(0, LAMP_Y + 6); ctx.stroke();
  ctx.fillStyle = '#2a2f3a'; ctx.fillRect(-4, LAMP_Y - 3, 8, 8);
  ctx.fillStyle = '#ffe58a'; ctx.fillRect(-3, LAMP_Y - 2, 6, 6);
  ctx.restore();
}

/** Escolta: barco de suministros con su barra de vida y la descarga. */
function drawSupplyShip(ctx: CanvasRenderingContext2D, s: Ship, t: number) {
  const h = s.phase === 'out' ? s.ang : s.ang + Math.PI;
  const sp = boatSheet('suministros');
  if (sp) {
    ctx.save(); ctx.translate(s.x, s.y + Math.sin(t * 1.5) * 0.8);
    ctx.fillStyle = 'rgba(0,10,25,.35)'; ctx.beginPath(); ctx.ellipse(2, 5, 26, 11, 0, 0, TAU); ctx.fill();
    const k = sp.len / sp.ppu, fr = Math.floor(t * sp.fps);
    blitSheet(ctx, sp, h, fr, k, 3);
    if (s.hitT > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, s.hitT * 3); blitSheet(ctx, sp, h, fr, k, 3); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore();
  } else {
  ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(h + Math.sin(t * 1.5) * 0.03);
  ctx.fillStyle = 'rgba(0,10,25,.35)'; ctx.beginPath(); ctx.ellipse(2, 3, 26, 11, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#5a3a22'; ctx.beginPath(); ctx.moveTo(26, 0); ctx.quadraticCurveTo(16, -12, -20, -10); ctx.lineTo(-24, 0); ctx.lineTo(-20, 10); ctx.quadraticCurveTo(16, 12, 26, 0); ctx.fill();
  ctx.fillStyle = '#9a6a3c'; ctx.beginPath(); ctx.moveTo(20, 0); ctx.quadraticCurveTo(12, -8, -17, -7); ctx.lineTo(-19, 0); ctx.lineTo(-17, 7); ctx.quadraticCurveTo(12, 8, 20, 0); ctx.fill();
  // carga: cajas, barriles y sacos de comida
  const crates: [number, number, string][] = [[-12, -3, '#c49a5c'], [-6, 2, '#b08a52'], [0, -3, '#c49a5c'], [6, 2, '#a8803e']];
  for (const [x, y, c] of crates) { ctx.fillStyle = c; ctx.fillRect(x - 2.5, y - 2.5, 5, 5); ctx.strokeStyle = '#6b4a2c'; ctx.lineWidth = 0.6; ctx.strokeRect(x - 2.5, y - 2.5, 5, 5); }
  ctx.fillStyle = '#7a5434'; for (const [x, y] of [[-12, 4], [10, -3]]) { ctx.beginPath(); ctx.arc(x, y, 2.4, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#e9dcc0'; ctx.beginPath(); ctx.ellipse(13, 3, 2.6, 2, 0, 0, TAU); ctx.fill();
  // vela
  ctx.fillStyle = '#efe6d2'; ctx.beginPath(); ctx.ellipse(3, 0, 3.5, 13, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#3b2a1c'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(3, -13); ctx.lineTo(3, 13); ctx.stroke();
  if (s.hitT > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,120,100,${s.hitT * 3})`; ctx.beginPath(); ctx.ellipse(0, 0, 24, 11, 0, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
  ctx.restore();
  }
  // barra de vida y descarga
  const w = 46, x0 = s.x - w / 2, y0 = s.y - 30;
  ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x0 - 1, y0 - 1, w + 2, 6);
  const k = Math.max(0, s.hp / s.max);
  ctx.fillStyle = k > 0.5 ? '#35e0b0' : k > 0.25 ? '#ffd166' : '#ff5c7a'; ctx.fillRect(x0, y0, w * k, 4);
  if (s.phase === 'dock') {
    const u = 1 - s.t / MODE_RULES.escolta.unload;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x0 - 1, y0 + 6, w + 2, 4);
    ctx.fillStyle = '#8fe9ff'; ctx.fillRect(x0, y0 + 7, w * Math.min(1, u), 2);
    // cajas volando al muelle
    const p = (t * 1.3) % 1, bx = s.x + (0 - s.x) * p * 0.6, by = s.y + (0 - s.y) * p * 0.6 - Math.sin(p * Math.PI) * 14;
    ctx.fillStyle = '#c49a5c'; ctx.fillRect(bx - 2, by - 2, 4, 4);
  }
}

/** Travesía: barriles, restos de naufragios y cofres a la deriva (se recogen tocándolos). */
/** Adornos de la Bahía: tipo, posición y rumbo (0-7) fijos para que todos vean lo mismo.
 *  Las rocas con algas (deco-rocas) están horneadas pero fuera: de lejos parecen una criatura. */
/** Apagado: en partida estorba y confunde. Los sprites, modelos y el código quedan para usarlos de otra forma. */
const SHOW_DECO = false;
const BAHIA_DECO = [
  { k: 'muelle', x: -66, y: 30, d: 1 }, { k: 'nasa', x: -34, y: 62, d: 6 }, { k: 'bote', x: 128, y: 22, d: 5 },
  { k: 'boya', x: -152, y: 64, d: 0 },
  { k: 'boya', x: 146, y: -92, d: 3 }, { k: 'red', x: -96, y: 112, d: 4 },
];
function drawDeco(ctx: CanvasRenderingContext2D, d: { k: string; x: number; y: number; d: number }, t: number) {
  const sp = decoSheet(d.k);
  if (!sp) return;
  const bob = Math.sin(t * 1.3 + d.x) * (d.k === 'muelle' || d.k === 'rocas' ? 0 : 0.8);
  ctx.save(); ctx.translate(d.x, d.y + bob);
  ctx.fillStyle = 'rgba(0,10,25,.28)'; ctx.beginPath(); ctx.ellipse(1, 3, sp.len * 0.42, sp.len * 0.22, 0, 0, TAU); ctx.fill();
  if (d.k === 'rocas') {
    // Espuma que rompe en la base: así se lee como arrecife y no como una criatura
    for (let i = 0; i < 2; i++) {
      const ph = (t * 0.45 + i * 0.5 + d.x * 0.01) % 1;
      ctx.strokeStyle = `rgba(230,245,255,${(1 - ph) * 0.45})`; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.ellipse(0, 5, sp.len * (0.4 + ph * 0.18), sp.len * (0.2 + ph * 0.09), 0, 0, TAU); ctx.stroke();
    }
  }
  blitSheet(ctx, sp, (d.d / sp.dirs) * TAU, Math.floor(t * sp.fps + d.x * 0.05), sp.len / sp.ppu);
  ctx.restore();
}

function drawPickup(ctx: CanvasRenderingContext2D, p: Pickup, t: number) {
  const bob = Math.sin(t * 2.4 + p.id) * 1.5;
  ctx.save(); ctx.translate(p.x, p.y + bob);
  ctx.strokeStyle = `rgba(255,226,140,${0.45 + 0.3 * Math.sin(t * 4 + p.id)})`; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(0, 3, 15, 8, 0, 0, TAU); ctx.stroke();
  ctx.strokeStyle = 'rgba(225,242,255,.4)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(0, 4, 11, 5, 0, 0.2, Math.PI - 0.2); ctx.stroke();
  const sp = boatSheet(p.kind);
  if (sp) {
    const k = sp.len / sp.ppu;
    blitSheet(ctx, sp, t * 0.35 + p.id * 1.7, Math.floor(t * sp.fps + p.id), k, 3);
  } else if (p.kind === 'barril') {
    ctx.rotate(0.5 + Math.sin(t + p.id) * 0.2);
    ctx.fillStyle = '#8a5a30'; ctx.beginPath(); ctx.ellipse(0, 0, 9, 6, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#3b2a1c'; ctx.lineWidth = 1.4;
    for (const x of [-5, 5]) { ctx.beginPath(); ctx.moveTo(x, -5.5); ctx.lineTo(x, 5.5); ctx.stroke(); }
    ctx.fillStyle = '#b07a44'; ctx.beginPath(); ctx.ellipse(-1, -2, 5, 2, 0, 0, TAU); ctx.fill();
  } else if (p.kind === 'restos') {
    ctx.rotate(Math.sin(t * 0.7 + p.id) * 0.3);
    ctx.fillStyle = '#6b4a2c';
    ctx.fillRect(-11, -3, 22, 4); ctx.save(); ctx.rotate(0.7); ctx.fillRect(-8, -2, 16, 3.5); ctx.restore();
    ctx.fillStyle = '#d9cdb4'; ctx.beginPath(); ctx.moveTo(-4, -2); ctx.lineTo(6, -9); ctx.lineTo(7, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#b08a52'; ctx.fillRect(2, 1, 5, 5);
  } else {
    ctx.fillStyle = '#7a4a22'; ctx.fillRect(-8, -5, 16, 10);
    ctx.fillStyle = '#9a6430'; ctx.fillRect(-8, -7, 16, 4);
    ctx.fillStyle = '#ffd27a'; ctx.fillRect(-8, -1, 16, 1.6); ctx.fillRect(-1.5, -3, 3, 4);
  }
  ctx.restore();
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
  const costa = !!g && g.mode === 'costa';
  if (costa) {
    // Luz de luna difusa sobre el mar y la muralla
    light(0, -150, 330, '120,150,215', 0.4); light(-170, -70, 220, '110,140,205', 0.3); light(170, -70, 220, '110,140,205', 0.3); light(0, 20, 300, '150,160,190', 0.35);
    // Antorchas entre los huecos y luz en cada arma abierta
    for (const x of COSTA.slotX) for (const dx of [26, -26]) if (Math.abs(x + dx) < 190 && (x + dx) % 52 !== 0) light(x + dx, -8, 46, '255,176,96', 0.5 + 0.12 * Math.sin(now * 9 + x + dx));
    for (const s of g!.slots) {
      if (!s.open) continue;
      light(s.x, -12, s.w === 'luz' ? 80 : 46, s.w === 'luz' ? '255,236,170' : '255,200,140', s.w === 'luz' ? 0.8 : 0.4);
      if (s.fire > 0) light(s.x + Math.cos(s.aim) * 16, -8 + Math.sin(s.aim) * 16, 52, '255,190,110', s.fire * 4);
    }
  } else {
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
  }
  if (g) {
    for (const b of g.bolts) if (b.kind === 'light') light(b.x, b.y, b.crit ? 46 : 30, b.crit ? '255,210,90' : BEAM, 0.55);
    for (const s of g.eshots) light(s.x, s.y, 32, '90,240,150', 0.55);
    for (const s of g.slots) if (s.on) { light(s.tx, s.ty, 60, '255,236,170', 0.7); }
    for (const sh of g.shells) { const p = g.shellPos(sh); light(p.x, p.y - p.h, 30, '255,160,70', 0.5); }
    for (const f of g.fireballs) { if (f.ball || f.t < 0) continue; const p = g.fireballPos(f); light(p.x, p.y - p.h, 40, '255,140,50', 0.6); }
    for (const p of g.pickups) light(p.x, p.y, 30, '255,220,140', 0.4);
    if (g.ship && g.ship.phase !== 'gap') light(g.ship.x, g.ship.y, 46, '255,220,160', 0.45);
    for (const e of g.enemies) {
      if (e.type === 'angler') { const aa = Math.atan2(-e.y, -e.x); light(e.x + Math.cos(aa) * 16, e.y + Math.sin(aa) * 16 - 8, 34, '94,231,255', 0.55); }
      else if (e.type === 'firefish' || e.type === 'lavacrab' || e.type === 'volturtle') light(e.x, e.y, e.type === 'volturtle' ? 34 : 26, '255,120,40', 0.4);
      else if (e.type === 'seahorse') light(e.x, e.y, 22, '126,240,192', 0.3);
    }
    for (const h of g.hazards) light(h.x, h.y, h.r * 2.2, '255,110,40', 0.35 + 0.35 * (1 - h.t / 1.3));
    for (const f of g.fx) {
      const k = f.t / f.max;
      if (f.kind === 'boom') light(f.x, f.y, (f.r || 40) * 2.4, '255,150,60', k);
      else if (f.kind === 'nova') light(0, LAMP_Y * 0.5, 260, '255,240,180', k * 0.9);
      else if (f.kind === 'strike') light(f.x, f.y, 90, '200,220,255', k);
      else if (f.kind === 'ring') light(f.x, f.y, 120, '255,200,140', k * 0.4);
      else if (f.kind === 'slam') light(f.x, f.y, (f.r || 80), '255,220,170', k * 0.25);
      else if (f.kind === 'zap') { const tx = f.tx ?? 0, ty = f.ty ?? 0; for (const p of [0, 0.5, 1]) light(f.x + (tx - f.x) * p, f.y + (ty - f.y) * p, 55, '120,255,190', k * 0.8); }
      else if (f.kind === 'sting') light(f.x, f.y, 40, '210,140,255', k * 0.6);
    }
    for (const e of g.enemies) {
      if (e.burnT > 0) light(e.x, e.y, e.r * 3, '255,130,40', 0.45);
      if (e.elite) light(e.x, e.y, e.r * 3, '255,210,120', 0.3);
      if (e.type === 'jelly' || e.type === 'mini') light(e.x, e.y, e.r * 3, '200,120,255', 0.28);
      if (e.type === 'eel' && e.chargeT > 0) light(e.x, e.y, 50, '100,255,180', 0.8 * (1 - e.chargeT / 0.5));
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

/** Dibuja una criatura desde su hoja de sprites: fila = dirección (16), columna = cuadro de animación. */
function drawFromSheet(ctx: CanvasRenderingContext2D, e: Enemy, sh: Sheet, t: number, dist: number, heading: number, zone: Zone, borrow?: [string, string, number, number]) {
  const dir = Math.round((((heading % TAU) + TAU) % TAU) / (TAU / sh.dirs)) % sh.dirs;
  const moving = e.stun <= 0;
  const frame = moving ? Math.floor(t * sh.fps * (e.slowT > 0 ? 0.5 : 1)) % sh.frames : 0;
  let k = (e.r * sh.len * 1.18) / sh.ppu; // unidades del mundo por píxel de la hoja
  if (e.type === 'puffer' && dist < 95) k *= 1 + ((95 - dist) / 95) * 0.45 + 0.04 * Math.sin(t * 20);
  // Al aparecer: crece y se vuelve opaca en 0.35 s
  const born = Math.min(1, e.age / 0.35);
  const a0 = ctx.globalAlpha;
  if (born < 1) { k *= 0.5 + 0.5 * born; ctx.globalAlpha = born * a0; }
  const sx = frame * sh.px, sy = dir * sh.px, w = sh.px * k;
  ctx.drawImage(e.type === 'boss' || e.type === 'pirate' || e.type === 'captain' || e.type === 'raider' ? sh.img : borrow ? tintedWith(sh, borrow[1], borrow[2]) : tinted(sh, zone), sx, sy, sh.px, sh.px, -sh.ox * k, -sh.oy * k, w, w);
  ctx.globalAlpha = a0;
  if (e.hitT > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, e.hitT * 6);
    ctx.drawImage(sh.img, sx, sy, sh.px, sh.px, -sh.ox * k, -sh.oy * k, w, w);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}

/* Tinte por zona: escarcha en Mar Helado, brasas en Volcán, frío violeta en el Abismo.
   Se calcula una vez por hoja y zona, y se guarda. */
const TINT: Record<string, [string, number] | undefined> = {
  ice: ['200,235,255', 0.28], lava: ['255,120,50', 0.2], dark: ['130,100,220', 0.18],
};
const tintCache = new Map<string, HTMLCanvasElement>();
function tinted(sh: Sheet, zone: Zone): CanvasImageSource {
  const t = TINT[zone.mech];
  return t ? tintedWith(sh, t[0], t[1]) : sh.img;
}
function tintedWith(sh: Sheet, rgb: string, alpha: number): CanvasImageSource {
  const t = [rgb, alpha] as const;
  const key = sh.img.src.length + ':' + sh.img.src.slice(-40) + rgb + alpha;
  let c = tintCache.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = sh.img.naturalWidth; c.height = sh.img.naturalHeight;
    const x = c.getContext('2d')!;
    x.drawImage(sh.img, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = `rgba(${t[0]},${t[1]})`;
    x.fillRect(0, 0, c.width, c.height);
    tintCache.set(key, c);
  }
  return c;
}


/* ---------- Modo Costa: muralla abajo, el mar arriba ---------- */
/** Adornos subtiles de la franja de tierra (modelos deco-*.glb); las rocas con algas quedan fuera. */
const COSTA_DECO = [{ k: 'red', x: -128, y: 62, d: 3 }, { k: 'nasa', x: -66, y: 70, d: 5 }, { k: 'bote', x: 112, y: 64, d: 6 }, { k: 'boya', x: 168, y: 72, d: 0 }];

/** Tierra, cara de la muralla (hacia nosotros) y espuma en su base. Va antes que las criaturas. */
function drawCostaBase(ctx: CanvasRenderingContext2D, g: Game, t: number, now: number) {
  const X = 720;
  // Espuma del mar rompiendo contra la base norte de la muralla
  ctx.lineCap = 'round';
  for (let k = 0; k < 2; k++) {
    ctx.strokeStyle = `rgba(235,246,255,${0.5 - k * 0.22})`; ctx.lineWidth = 2.4 - k;
    ctx.setLineDash([22, 14 + k * 10]); ctx.lineDashOffset = -now * (8 + k * 5);
    ctx.beginPath();
    for (let x = -X; x <= X; x += 12) { const y = -27 - k * 5 + Math.sin(x * 0.045 + now * 1.4 + k) * 1.8; x === -X ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // Tierra detrás
  const land = ctx.createLinearGradient(0, 10, 0, 240);
  land.addColorStop(0, '#6d7258'); land.addColorStop(0.4, '#5b6648'); land.addColorStop(1, '#46513a');
  ctx.fillStyle = land; ctx.fillRect(-X, 30, X * 2, 600);
  // Camino de tierra a lo largo de la muralla
  ctx.fillStyle = 'rgba(176,158,112,.5)'; ctx.fillRect(-X, 40, X * 2, 14);
  // Cara de la muralla (se ve desde atrás): sillares
  const face = ctx.createLinearGradient(0, 8, 0, 34);
  face.addColorStop(0, '#6b717e'); face.addColorStop(1, '#4a505c');
  ctx.fillStyle = face; ctx.fillRect(-X, 8, X * 2, 26);
  ctx.strokeStyle = 'rgba(20,24,32,.35)'; ctx.lineWidth = 1;
  for (let r = 0; r < 2; r++) {
    const y = 8 + 13 * r;
    ctx.beginPath(); ctx.moveTo(-X, y + 13); ctx.lineTo(X, y + 13); ctx.stroke();
    for (let x = -X + (r ? 13 : 0); x < X; x += 26) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 13); ctx.stroke(); }
  }
  // Contrafuertes bajo cada hueco
  for (const x of COSTA.slotX) { ctx.fillStyle = '#585e6b'; ctx.fillRect(x - 6, 8, 12, 28); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(x - 6, 8, 3, 28); }
  // Sombra de la muralla sobre la tierra
  const sh = ctx.createLinearGradient(0, 34, 0, 52); sh.addColorStop(0, 'rgba(0,8,20,.45)'); sh.addColorStop(1, 'rgba(0,8,20,0)');
  ctx.fillStyle = sh; ctx.fillRect(-X, 34, X * 2, 18);
  // Adornos de la costa (sutiles)
  ctx.globalAlpha = 0.92;
  for (const d of COSTA_DECO) {
    const sp = decoSheet(d.k);
    if (!sp) continue;
    ctx.save(); ctx.translate(d.x, d.y);
    ctx.fillStyle = 'rgba(0,10,25,.28)'; ctx.beginPath(); ctx.ellipse(1, 3, sp.len * 0.42, sp.len * 0.2, 0, 0, TAU); ctx.fill();
    blitSheet(ctx, sp, (d.d / sp.dirs) * TAU, Math.floor(now * sp.fps + d.x * 0.05), sp.len / sp.ppu);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  void g; void t;
}

/** Pasillo de la muralla, parapeto, antorchas, huecos y armas. Va después de las criaturas (ellas quedan al otro lado). */
function drawCostaFront(ctx: CanvasRenderingContext2D, g: Game, t: number, now: number) {
  const X = 720;
  // Parapeto (almenas) en el borde del mar
  ctx.fillStyle = '#7b8190'; ctx.fillRect(-X, -22, X * 2, 8);
  ctx.fillStyle = '#9097a6';
  for (let x = -X; x < X; x += 20) ctx.fillRect(x, -26, 12, 6);
  ctx.fillStyle = 'rgba(20,24,32,.35)'; ctx.fillRect(-X, -14, X * 2, 1.4);
  // Pasillo superior
  const walk = ctx.createLinearGradient(0, -14, 0, 8);
  walk.addColorStop(0, '#a3aab8'); walk.addColorStop(1, '#838a98');
  ctx.fillStyle = walk; ctx.fillRect(-X, -14, X * 2, 22);
  ctx.strokeStyle = 'rgba(30,36,46,.28)'; ctx.lineWidth = 1;
  for (let x = -X; x < X; x += 26) { ctx.beginPath(); ctx.moveTo(x, -14); ctx.lineTo(x, 8); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(-X, -14, X * 2, 1.6);
  // Antorchas entre huecos
  for (const sx of COSTA.slotX) for (const dx of [26, -26]) {
    const x = sx + dx;
    if (Math.abs(x) > 190 || x % 52 === 0) continue;
    ctx.fillStyle = '#3a2a1c'; ctx.fillRect(x - 1.2, -14, 2.4, 9);
    const f = 1 + 0.25 * Math.sin(now * 11 + x);
    ctx.fillStyle = radial(ctx, x, -17, 7 * f, [[0, 'rgba(255,240,170,1)'], [0.5, 'rgba(255,150,50,.9)'], [1, 'rgba(255,90,20,0)']]);
    ctx.beginPath(); ctx.arc(x, -17, 7 * f, 0, TAU); ctx.fill();
  }
  // Huecos
  for (let i = 0; i < g.slots.length; i++) drawSlot(ctx, g, i, t, now);
}

function drawSlot(ctx: CanvasRenderingContext2D, g: Game, i: number, t: number, now: number) {
  const s = g.slots[i], x = s.x, y = -3;
  const avail = g.slotAvail(i);
  // Base de piedra
  ctx.fillStyle = 'rgba(0,8,20,.3)'; ctx.beginPath(); ctx.ellipse(x + 1, y + 5, 19, 9, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = s.open ? '#6b7280' : '#5d6370'; ctx.beginPath(); ctx.ellipse(x, y + 2, 18, 9.5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = s.open ? '#a7aebb' : '#7d8492'; ctx.beginPath(); ctx.ellipse(x, y, 15, 7.8, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(30,36,46,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, 15, 7.8, 0, 0, TAU); ctx.stroke();
  if (s.open && s.w) { drawWeapon(ctx, s, x, y, t); return; }
  ctx.textAlign = 'center';
  if (avail) {
    const p = 0.5 + 0.5 * Math.sin(now * 4 + i);
    ctx.strokeStyle = `rgba(63,215,196,${0.55 + 0.4 * p})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y, 15 + p * 2, 7.8 + p, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = `rgba(190,255,245,${0.8 + 0.2 * p})`; ctx.fillRect(x - 5, y - 1, 10, 2); ctx.fillRect(x - 1, y - 5, 2, 10);
    ctx.font = '900 9px system-ui'; ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(0,10,20,.75)';
    const c = String(Math.min(...WEAPONS.map(w => g.openCost(i, w.id)))); ctx.strokeText(c, x, y + 20); ctx.fillStyle = '#8fe9ff'; ctx.fillText(c, x, y + 20);
  } else {
    // Hueco todavía cerrado: candado y la oleada en que se abre
    ctx.fillStyle = 'rgba(30,36,46,.55)'; ctx.fillRect(x - 4.5, y - 1, 9, 6.5);
    ctx.strokeStyle = 'rgba(30,36,46,.55)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y - 1, 3, Math.PI, 0); ctx.stroke();
    ctx.font = '900 8.5px system-ui'; ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(0,10,20,.75)';
    const c = L('Ola ', 'Wave ') + COSTA.slotWave[i]; ctx.strokeText(c, x, y + 20); ctx.fillStyle = 'rgba(210,220,235,.8)'; ctx.fillText(c, x, y + 20);
  }
}

function drawWeapon(ctx: CanvasRenderingContext2D, s: Game['slots'][number], x: number, y: number, t: number) {
  const W = WEAPONS.find(w => w.id === s.w)!, k = 1 + 0.07 * (s.lv - 1), rec = s.fire > 0 ? s.fire / 0.22 : 0;
  ctx.save(); ctx.translate(x, y - 3); ctx.scale(k, k);
  if (s.w === 'canon') {
    ctx.fillStyle = '#3a2a1c'; ctx.beginPath(); ctx.arc(-6, 3, 3.6, 0, TAU); ctx.arc(6, 3, 3.6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#7a5230'; ctx.beginPath(); ctx.moveTo(-9, 2); ctx.lineTo(9, 2); ctx.lineTo(6, -5); ctx.lineTo(-6, -5); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.translate(0, -7); ctx.rotate(s.aim);
    const L1 = 16 - rec * 4;
    const bg = ctx.createLinearGradient(0, -4, 0, 4); bg.addColorStop(0, '#6a7282'); bg.addColorStop(0.5, '#3b414d'); bg.addColorStop(1, '#262a33');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(-5 - rec * 4, -3.6); ctx.lineTo(L1, -3.1); ctx.lineTo(L1, 3.1); ctx.lineTo(-5 - rec * 4, 3.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8a93a3'; ctx.fillRect(L1 - 3, -3.9, 3, 7.8);
    ctx.fillStyle = '#20242c'; ctx.beginPath(); ctx.arc(-5 - rec * 4, 0, 4, 0, TAU); ctx.fill();
    if (rec > 0.45) { ctx.fillStyle = `rgba(255,214,140,${rec})`; ctx.beginPath(); ctx.arc(L1 + 3, 0, 5 * rec + 1, 0, TAU); ctx.fill(); }
    ctx.restore();
  } else if (s.w === 'ballesta') {
    ctx.fillStyle = '#5b4026'; ctx.fillRect(-2, -3, 4, 7);
    ctx.save(); ctx.translate(0, -7); ctx.rotate(s.aim);
    ctx.strokeStyle = '#8a6a3c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(14, 0); ctx.stroke();
    ctx.strokeStyle = '#6b4a2c'; ctx.lineWidth = 2.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(6, -10); ctx.quadraticCurveTo(13, 0, 6, 10); ctx.stroke();
    const pull = rec > 0 ? 0 : 3.5;
    ctx.strokeStyle = 'rgba(235,225,200,.9)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(6, -10); ctx.lineTo(6 - pull, 0); ctx.lineTo(6, 10); ctx.stroke();
    if (rec === 0) { ctx.strokeStyle = '#d9b37a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(3 - pull, 0); ctx.lineTo(15, 0); ctx.stroke(); ctx.fillStyle = '#e6e9ef'; ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(14, -2.2); ctx.lineTo(14, 2.2); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  } else if (s.w === 'mortero') {
    ctx.fillStyle = '#4a4f5a'; ctx.beginPath(); ctx.ellipse(0, 2, 11, 4.6, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(0, -2); ctx.rotate(-Math.PI / 2 + Math.cos(s.aim) * 0.32);
    const bg = ctx.createLinearGradient(0, -6, 0, 6); bg.addColorStop(0, '#6f5a48'); bg.addColorStop(0.5, '#3d3128'); bg.addColorStop(1, '#241c16');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(-3 + rec * 2, -6); ctx.lineTo(13 - rec * 3, -7.5); ctx.lineTo(13 - rec * 3, 7.5); ctx.lineTo(-3 + rec * 2, 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff9a52'; ctx.fillRect(11 - rec * 3, -8, 3, 16);
    ctx.fillStyle = '#16120e'; ctx.beginPath(); ctx.ellipse(14 - rec * 3, 0, 1.8, 6.2, 0, 0, TAU); ctx.fill();
    if (rec > 0.3) { ctx.fillStyle = `rgba(190,190,200,${rec * 0.7})`; ctx.beginPath(); ctx.arc(17, 0, 4 + (1 - rec) * 6, 0, TAU); ctx.fill(); }
    ctx.restore();
  } else {
    // Luz de costa: torre baja con lámpara
    ctx.fillStyle = '#8a8f9c'; ctx.fillRect(-6, -14, 12, 17);
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(1, -14, 5, 17);
    ctx.fillStyle = '#5a5f6c'; ctx.fillRect(-7, -15, 14, 3);
    const p = 0.8 + 0.2 * Math.sin(t * 5 + s.x);
    ctx.fillStyle = radial(ctx, 0, -20, 11, [[0, `rgba(255,248,200,${p})`], [1, 'rgba(255,214,120,0)']]); ctx.beginPath(); ctx.arc(0, -20, 11, 0, TAU); ctx.fill();
    ctx.fillStyle = s.on ? '#fff6c8' : '#ffe9a8'; ctx.beginPath(); ctx.arc(0, -20, 4.6, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#3b414d'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, -20, 5.4, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#3b414d'; ctx.beginPath(); ctx.moveTo(-6, -24); ctx.lineTo(0, -30); ctx.lineTo(6, -24); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // Nivel: puntos bajo el hueco
  const n = s.lv;
  for (let i = 0; i < n; i++) { ctx.fillStyle = W.col; ctx.strokeStyle = 'rgba(0,10,20,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x + (i - (n - 1) / 2) * 5.4, y + 13, 1.9, 0, TAU); ctx.stroke(); ctx.fill(); }
}

/** Haces de las luces de costa (en la pasada aditiva). */
function drawCostaBeams(ctx: CanvasRenderingContext2D, g: Game) {
  for (const s of g.slots) {
    if (!s.on || s.w !== 'luz') continue;
    const sy = COSTA.gunY - 12, dx = s.tx - s.x, dy = s.ty - sy, d = Math.hypot(dx, dy) || 1, a = Math.atan2(dy, dx);
    ctx.save(); ctx.translate(s.x, sy); ctx.rotate(a);
    const w = 5 + s.lv * 1.5;
    const bg = ctx.createLinearGradient(0, 0, d, 0); bg.addColorStop(0, 'rgba(255,240,180,.5)'); bg.addColorStop(1, 'rgba(255,240,180,.22)');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(d, -w * 1.8); ctx.lineTo(d, w * 1.8); ctx.lineTo(0, 2); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = radial(ctx, s.tx, s.ty, 24 + s.lv * 3, [[0, 'rgba(255,246,200,.7)'], [1, 'rgba(255,230,150,0)']]);
    ctx.beginPath(); ctx.arc(s.tx, s.ty, 24 + s.lv * 3, 0, TAU); ctx.fill();
  }
}
