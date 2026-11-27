// Genera hojas de sprites de enemigos desde modelos .glb:
// 16 direcciones (filas) × 4 cuadros de animación (columnas), cámara del juego a 32°.
// Convención de los modelos: +Y arriba, frente hacia +Z, origen en el suelo, largo 1.0.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const TAU = Math.PI * 2;
/** Animaciones por criatura: reciben la escena del modelo y la fase (0..1) del ciclo. */
const ANIM = {
  cangrejo(o, p) {
    const s = Math.sin(p * TAU);
    rot(o, 'Legs_L', 'z', 0.18 * s); rot(o, 'Legs_R', 'z', -0.18 * s);
    rot(o, 'Claw_L', 'y', 0.22 * Math.sin(p * TAU + 1)); rot(o, 'Claw_R', 'y', -0.22 * Math.sin(p * TAU + 1));
    bob(o, 'Body', 0.015 * s);
  },
  medusa(o, p) {
    const s = Math.sin(p * TAU);
    scl(o, 'Bell', 1 + 0.08 * s, 1 - 0.1 * s, 1 + 0.08 * s);
    rot(o, 'Tentacles_Front', 'x', 0.25 * s); rot(o, 'Tentacles_Back', 'x', -0.3 * s);
  },
  anguila(o, p) {
    ['Head', 'Seg_1', 'Seg_2', 'Seg_3', 'Seg_4', 'Seg_5'].forEach((n, i) => rot(o, n, 'y', 0.28 * Math.sin(p * TAU - i * 0.9) * (i ? 1 : 0.4)));
  },
  'pez-globo'(o, p) {
    const s = Math.sin(p * TAU);
    rot(o, 'Fin_L', 'y', 0.5 * s); rot(o, 'Fin_R', 'y', -0.5 * s); rot(o, 'Tail', 'y', 0.4 * s);
    scl(o, 'Spikes', 1 + 0.05 * s, 1 + 0.05 * s, 1 + 0.05 * s);
    bob(o, 'Body', 0.02 * s);
  },
  tortuga(o, p) {
    const s = Math.sin(p * TAU);
    rot(o, 'Flipper_FL', 'y', 0.45 * s); rot(o, 'Flipper_FR', 'y', -0.45 * s);
    rot(o, 'Flipper_BL', 'y', -0.3 * s); rot(o, 'Flipper_BR', 'y', 0.3 * s);
  },
  ermitano(o, p) {
    const s = Math.sin(p * TAU);
    rot(o, 'Claw_L', 'y', 0.25 * s); rot(o, 'Claw_R', 'y', -0.25 * s); rot(o, 'Legs', 'x', 0.1 * s);
    bob(o, 'Shell', 0.012 * Math.abs(s));
  },
  sardina(o, p) { rot(o, 'Tail', 'y', 0.6 * Math.sin(p * TAU)); rot(o, 'Body', 'y', 0.08 * Math.sin(p * TAU + 1)); },
  // ---- Barcos y objetos de los modos nuevos ----
  'barco-jugador'(o, p) { const s = Math.sin(p * TAU); rot(o, 'Sail', 'y', 0.05 * s); rot(o, 'Flag', 'y', 0.35 * Math.sin(p * TAU + 1)); bob(o, 'Hull', 0.006 * s); },
  'barco-suministros'(o, p) { const s = Math.sin(p * TAU); rot(o, 'Sail', 'y', 0.05 * s); rot(o, 'Flag', 'y', 0.35 * Math.sin(p * TAU + 1)); bob(o, 'Hull', 0.006 * s); },
  'barco-pirata'(o, p) { const s = Math.sin(p * TAU); rot(o, 'Sail_Fore', 'y', 0.05 * s); rot(o, 'Sail_Main', 'y', -0.05 * s); rot(o, 'Flag', 'y', 0.4 * Math.sin(p * TAU + 1)); },
  'barco-capitan'(o, p) { const s = Math.sin(p * TAU); rot(o, 'Sail_1', 'y', 0.04 * s); rot(o, 'Sail_2', 'y', -0.04 * s); rot(o, 'Sail_3', 'y', 0.04 * s); rot(o, 'Pennant', 'y', 0.4 * Math.sin(p * TAU + 1)); },
  'barco-abordador'(o, p) { const s = Math.sin(p * TAU); rot(o, 'Oar_L1', 'y', 0.35 * s); rot(o, 'Oar_L2', 'y', 0.35 * s); rot(o, 'Oar_R1', 'y', -0.35 * s); rot(o, 'Oar_R2', 'y', -0.35 * s); bob(o, 'Crew', 0.008 * Math.abs(s)); },
  'objeto-cofre'(o, p) { const s = Math.sin(p * TAU); scl(o, 'Glow', 1, 1 + 0.25 * s, 1); bob(o, 'Coins', 0.01 * s); rot(o, 'Lid', 'x', -0.04 * s); },
  'objeto-restos'(o, p) { bob(o, 'Cloth', 0.006 * Math.sin(p * TAU)); },
  // ---- Decoración de la Bahía (fija; se mece o parpadea suavemente) ----
  'deco-boya'(o, p) {
    const s = Math.sin(p * TAU);
    for (const n of ['Buoy', 'Lamp', 'Chain']) bob(o, n, 0.008 * s);
    const lamp = o.getObjectByName('Lamp');
    if (lamp) lamp.traverse(m => { if (m.material) m.material.emissiveIntensity = 1.1 + 0.5 * s; });
  },
  'deco-red'(o, p) { o.rotation.x = 0.025 * Math.sin(p * TAU); o.rotation.z = 0.02 * Math.cos(p * TAU); },
  'deco-bote-hundido'(o, p) { o.rotation.z = 0.03 * Math.sin(p * TAU); bob(o, 'Rope', 0.006 * Math.sin(p * TAU)); },
};
const base = new Map();
function rest(n) { if (!base.has(n)) base.set(n, { r: n.rotation.clone(), p: n.position.clone(), s: n.scale.clone() }); return base.get(n); }
function node(o, name) { const n = o.getObjectByName(name); if (n) rest(n); return n; }
function rot(o, name, ax, v) { const n = node(o, name); if (n) n.rotation[ax] = base.get(n).r[ax] + v; }
function bob(o, name, v) { const n = node(o, name); if (n) n.position.y = base.get(n).p.y + v; }
function scl(o, name, x, y, z) { const n = node(o, name); if (n) { const b = base.get(n).s; n.scale.set(b.x * x, b.y * y, b.z * z); } }

window.makeSheet = async (url, kind, px, dirs = 16, frames = 4, elevDeg = 32, half = 0.72) => {
  base.clear();
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1); r.setSize(px, px); r.outputColorSpace = THREE.SRGBColorSpace; r.setClearColor(0, 0);
  const scene = new THREE.Scene();
  const model = (await new GLTFLoader().loadAsync(url)).scene;
  const pivot = new THREE.Group(); pivot.add(model); scene.add(pivot);
  // Luz neutra: el juego oscurece y colorea encima con su iluminación nocturna
  scene.add(new THREE.HemisphereLight(0xe6eeff, 0x40485a, 1.5));
  const key = new THREE.DirectionalLight(0xfff4e6, 1.7); key.position.set(-3, 6, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xa8c4ff, 0.7); rim.position.set(3, 2.5, -4); scene.add(rim);
  const cam = new THREE.OrthographicCamera(-half, half, half, -half, 0.01, 50);
  const e = elevDeg * Math.PI / 180;
  cam.position.set(0, Math.sin(e) * 10 + 0.18, Math.cos(e) * 10);
  cam.lookAt(0, 0.18, 0); cam.updateMatrixWorld();
  const sheet = document.createElement('canvas'); sheet.width = px * frames; sheet.height = px * dirs;
  const g = sheet.getContext('2d');
  const anim = ANIM[kind] || (() => {});
  for (let d = 0; d < dirs; d++) {
    // Rumbo en coordenadas del juego (x a la derecha, y hacia abajo): h = d·360/dirs
    const h = (d / dirs) * TAU;
    pivot.rotation.y = Math.PI / 2 - h; // +Z del modelo apunta al rumbo
    for (let f = 0; f < frames; f++) {
      anim(model, f / frames);
      r.render(scene, cam);
      g.drawImage(r.domElement, f * px, d * px);
    }
  }
  const o = new THREE.Vector3(0, 0, 0).project(cam);
  return {
    png: sheet.toDataURL('image/png'),
    meta: { px, dirs, frames, half, ox: (o.x + 1) / 2 * px, oy: (1 - o.y) / 2 * px, ppu: px / (2 * half) },
  };
};
