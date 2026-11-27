// Fase 2: isla con faro, torretas (base fija + cabeza en 16 direcciones con disparo),
// red, arpón y jefes (16 direcciones × 4 cuadros). Misma cámara del juego: 32° de elevación.
// Convención de los modelos: +Y arriba, frente hacia +Z, origen en la base, tamaño 1.0.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const TAU = Math.PI * 2;
const loader = new GLTFLoader();

/* ---------- Animaciones por pieza (fase 0..1) ---------- */
const base = new Map();
function rest(n) { if (!base.has(n)) base.set(n, { r: n.rotation.clone(), p: n.position.clone(), s: n.scale.clone() }); return base.get(n); }
function node(o, name) { const n = o.getObjectByName(name); if (n) rest(n); return n; }
function rot(o, name, ax, v) { const n = node(o, name); if (n) n.rotation[ax] = base.get(n).r[ax] + v; }
function mov(o, name, ax, v) { const n = node(o, name); if (n) n.position[ax] = base.get(n).p[ax] + v; }
function scl(o, name, k) { const n = node(o, name); if (n) { const b = base.get(n).s; n.scale.set(b.x * k, b.y * k, b.z * k); } }

const ANIM = {
  // Jefes: ciclo de 4 cuadros mientras nadan
  'jefe-kraken'(o, p) {
    for (let i = 1; i <= 8; i++) {
      rot(o, `Tentacle_${i}`, 'y', 0.22 * Math.sin(p * TAU + i * 0.8));
      rot(o, `Tentacle_${i}`, 'x', 0.08 * Math.sin(p * TAU + i * 1.3));
    }
    mov(o, 'Mantle', 'y', 0.012 * Math.sin(p * TAU));
  },
  'jefe-rey-cangrejo'(o, p) {
    const s = Math.sin(p * TAU);
    rot(o, 'Legs_L', 'z', 0.12 * s); rot(o, 'Legs_R', 'z', -0.12 * s);
    rot(o, 'Claw_L', 'y', 0.16 * Math.sin(p * TAU + 1)); rot(o, 'Claw_R', 'y', -0.16 * Math.sin(p * TAU + 1));
    for (const n of ['Carapace', 'Crown']) mov(o, n, 'y', 0.01 * s);
  },
  // Spikes es un solo nodo: las espiras no se mueven por separado para no despegarlas
  'jefe-serpiente-hielo'(o, p) {
    const s = Math.sin(p * TAU);
    rot(o, 'Head', 'y', 0.1 * s); rot(o, 'Jaw', 'y', 0.1 * s);
    rot(o, 'Jaw', 'x', 0.12 + 0.12 * Math.sin(p * TAU + 1.2));
    for (const n of ['Head', 'Jaw']) mov(o, n, 'y', 0.01 * Math.sin(p * TAU + 0.5));
  },
  'jefe-titan-magma'(o, p) {
    const s = Math.sin(p * TAU);
    rot(o, 'Arm_L', 'x', 0.18 * s); rot(o, 'Arm_R', 'x', -0.18 * s);
    rot(o, 'Head', 'y', 0.08 * Math.sin(p * TAU + 0.7));
    for (const n of ['Torso', 'Lava', 'Head', 'Arm_L', 'Arm_R']) mov(o, n, 'y', 0.01 * Math.abs(s));
  },
  'jefe-leviatan'(o, p) {
    const s = Math.sin(p * TAU);
    rot(o, 'Head', 'y', 0.1 * s); rot(o, 'Jaw', 'y', 0.1 * s); rot(o, 'Body_1', 'y', 0.1 * s);
    rot(o, 'Jaw', 'x', 0.12 + 0.12 * Math.sin(p * TAU + 1.2));
    for (let i = 2; i <= 5; i++) mov(o, `Body_${i}`, 'y', 0.012 * Math.sin(p * TAU - i * 0.9));
  },
  // Torretas: cuadro 0 = en reposo, 1..3 = disparo y regreso
  'torreta-arponero'(o, p) {
    const k = [0, 1, 0.55, 0.2][Math.round(p * 4) % 4];
    rot(o, 'Bow_L', 'y', -0.35 * k); rot(o, 'Bow_R', 'y', 0.35 * k);
    mov(o, 'Harpoon', 'z', -0.12 * k); rot(o, 'Head', 'x', -0.05 * k);
  },
  'torreta-lanzarredes'(o, p) {
    const k = [0, 1, 0.6, 0.25][Math.round(p * 4) % 4];
    rot(o, 'Arm', 'x', 0.9 * k);
    const nb = node(o, 'Net_Bundle'); if (nb) nb.visible = k < 0.5;
  },
  'torreta-ancla'(o, p) {
    const k = [0, 1, 0.6, 0.25][Math.round(p * 4) % 4];
    mov(o, 'Anchor', 'y', -0.2 * k);
    rot(o, 'Chain', 'x', 0.12 * k);
  },
};

/* ---------- Escena común ---------- */
function setup(px, pxH, half, halfH, elevDeg, lookY, opts = {}) {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1); r.setSize(px, pxH); r.outputColorSpace = THREE.SRGBColorSpace; r.setClearColor(0, 0);
  r.localClippingEnabled = true;
  const scene = new THREE.Scene();
  // Luz neutra: el juego oscurece y colorea encima con su iluminación nocturna
  scene.add(new THREE.HemisphereLight(0xe6eeff, 0x40485a, opts.hemi ?? 1.5));
  const key = new THREE.DirectionalLight(0xfff4e6, opts.key ?? 1.7); key.position.set(-3, 6, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xa8c4ff, opts.rim ?? 0.7); rim.position.set(3, 2.5, -4); scene.add(rim);
  const cam = new THREE.OrthographicCamera(-half, half, halfH, -halfH, 0.01, 60);
  const e = elevDeg * Math.PI / 180, az = (opts.az || 0) * Math.PI / 180;
  cam.position.set(Math.sin(az) * Math.cos(e) * 20, Math.sin(e) * 20 + lookY, Math.cos(az) * Math.cos(e) * 20);
  cam.lookAt(0, lookY, 0); cam.updateMatrixWorld();
  const toPx = v => { const q = v.clone().project(cam); return [(q.x + 1) / 2 * px, (1 - q.y) / 2 * pxH]; };
  return { r, scene, cam, toPx };
}
// Recorte a nivel del agua: lo que queda bajo y=cut no se dibuja
function clipBelow(obj, cut) {
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -cut);
  obj.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.material.clippingPlanes = [plane]; } });
}

/** Imagen fija con varias piezas; devuelve el PNG y dónde caen los puntos pedidos. */
window.bakeStatic = async ({ parts, ppu, w, h, elev = 32, lookY = 0, az = 0, cut = null, points = {}, hide = [], light }) => {
  const { r, scene, cam, toPx } = setup(Math.round(w * ppu), Math.round(h * ppu), w / 2, h / 2, elev, lookY, { az, ...(light || {}) });
  for (const p of parts) {
    const m = (await loader.loadAsync(p.url)).scene;
    if (p.pos) m.position.fromArray(p.pos);
    if (p.scale) m.scale.setScalar(p.scale);
    if (p.rot) m.rotation.set(...p.rot);
    for (const n of hide) { const o = m.getObjectByName(n); if (o) o.visible = false; }
    if (p.only) { m.traverse(o => { if (o.isMesh) o.visible = false; }); for (const n of p.only) { const o = m.getObjectByName(n); if (o) o.traverse(q => { q.visible = true; }); } }
    if (cut !== null) clipBelow(m, cut);
    scene.add(m);
  }
  r.render(scene, cam);
  const pts = {};
  for (const [k, v] of Object.entries(points)) pts[k] = toPx(new THREE.Vector3(...v));
  // Linterna: centro del vidrio, si lo hay
  scene.traverse(o => { if (o.isMesh && /Glass/.test(o.material.name)) { const b = new THREE.Box3().setFromObject(o); pts.lamp = toPx(b.getCenter(new THREE.Vector3())); } });
  return { png: r.domElement.toDataURL('image/png'), pts };
};

/** Hoja de sprites: 16 direcciones (filas) × 4 cuadros. only = nodos a dibujar (ej. Head). */
window.bakeSheet = async ({ url, kind, px, half = 0.72, lookY = 0.18, dirs = 16, frames = 4, elev = 32, only = null, hide = [], scale = 1 }) => {
  base.clear();
  const { r, scene, cam, toPx } = setup(px, px, half, half, elev, lookY);
  const model = (await loader.loadAsync(url)).scene;
  model.scale.setScalar(scale);
  for (const n of hide) { const o = model.getObjectByName(n); if (o) o.visible = false; }
  if (only) { model.traverse(o => { if (o.isMesh) o.visible = false; }); for (const n of only) { const o = model.getObjectByName(n); if (o) o.traverse(q => { if (q.isMesh) q.visible = true; }); } }
  const pivot = new THREE.Group(); pivot.add(model); scene.add(pivot);
  const sheet = document.createElement('canvas'); sheet.width = px * frames; sheet.height = px * dirs;
  const g = sheet.getContext('2d');
  const anim = ANIM[kind] || (() => {});
  for (let d = 0; d < dirs; d++) {
    // Rumbo en coordenadas del juego (x a la derecha, y hacia abajo): h = d·360/dirs
    pivot.rotation.y = Math.PI / 2 - (d / dirs) * TAU; // +Z del modelo apunta al rumbo
    for (let f = 0; f < frames; f++) {
      anim(model, f / frames);
      r.render(scene, cam);
      g.drawImage(r.domElement, f * px, d * px);
    }
  }
  const [ox, oy] = toPx(new THREE.Vector3(0, 0, 0));
  return { png: sheet.toDataURL('image/png'), meta: { px, dirs, frames, ox, oy, ppu: px / (2 * half) } };
};
