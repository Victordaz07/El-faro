// Arte importado: isla, faro, torretas y jefes renderizados desde modelos 3D, fondo del
// menú y retratos de jefes. Si una imagen no carga, el juego usa el dibujo por código.
import menuUrl from '../assets/art/menu-fondo.webp';
import krakenUrl from '../assets/art/jefe-kraken.webp';
import reyUrl from '../assets/art/jefe-rey-cangrejo.webp';
import serpienteUrl from '../assets/art/jefe-serpiente-hielo.webp';
import titanUrl from '../assets/art/jefe-titan-magma.webp';
import leviatanUrl from '../assets/art/jefe-leviatan.webp';

function img(src: string) {
  const i = new Image();
  i.decoding = 'async';
  i.src = src;
  return i;
}

export const menuArt = menuUrl;
/** Retrato por zona (id de zona → imagen). Las zonas sin retrato no lo muestran. */
export const bossArt: Record<string, string> = {
  bahia: krakenUrl,
  arrecife: reyUrl,
  helado: serpienteUrl,
  volcan: titanUrl,
  abismo: leviatanUrl,
};
export const ready = (i: HTMLImageElement) => i.complete && i.naturalWidth > 0;

/* ---------- Enemigos renderizados desde modelos 3D ---------- */
import cangrejoUrl from '../assets/art/enemigos/cangrejo.webp';
import medusaUrl from '../assets/art/enemigos/medusa.webp';
import anguilaUrl from '../assets/art/enemigos/anguila.webp';
import pezGloboUrl from '../assets/art/enemigos/pez-globo.webp';
import tortugaUrl from '../assets/art/enemigos/tortuga.webp';
import ermitanoUrl from '../assets/art/enemigos/ermitano.webp';
import sardinaUrl from '../assets/art/enemigos/sardina.webp';
import sheetMeta from '../assets/art/enemigos/meta.json';

export interface Sheet {
  img: HTMLImageElement;
  px: number; dirs: number; frames: number; ox: number; oy: number; ppu: number;
  /** Largo del modelo (1.0) en múltiplos del radio de la criatura. */
  len: number;
  /** Cuadros de animación por segundo. */
  fps: number;
}
const mk = (url: string, key: keyof typeof sheetMeta, len: number, fps: number): Sheet => ({ img: img(url), ...sheetMeta[key], len, fps });
const SHEETS: Record<string, Sheet> = {
  crab: mk(cangrejoUrl, 'cangrejo', 2.8, 9),
  jelly: mk(medusaUrl, 'medusa', 2.7, 5),
  mini: mk(medusaUrl, 'medusa', 2.9, 7),
  eel: mk(anguilaUrl, 'anguila', 5.2, 8),
  puffer: mk(pezGloboUrl, 'pez-globo', 2.5, 6),
  turtle: mk(tortugaUrl, 'tortuga', 2.8, 4),
  hermit: mk(ermitanoUrl, 'ermitano', 2.9, 6),
  sardine: mk(sardinaUrl, 'sardina', 3.2, 12),
};
/** Hoja de sprites lista para un tipo de criatura, o null para usar el dibujo por código. */
export function sheetFor(type: string): Sheet | null {
  const s = SHEETS[type] || (type === 'pirate' || type === 'captain' || type === 'raider' ? BARCOS[type] : undefined);
  return s && ready(s.img) ? s : null;
}

/* ---------- Fase 2: isla, faro, torretas, red, arpón y jefes (desde modelos 3D) ---------- */
import f2 from '../assets/art/fase2/meta.json';
import islaUrl from '../assets/art/fase2/isla.webp';
import faroUrl from '../assets/art/fase2/faro.webp';
import redUrl from '../assets/art/fase2/red.webp';
import arponUrl from '../assets/art/fase2/arpon.webp';
import tABaseUrl from '../assets/art/fase2/torreta-arponero-base.webp';
import tAUrl from '../assets/art/fase2/torreta-arponero.webp';
import tRBaseUrl from '../assets/art/fase2/torreta-lanzarredes-base.webp';
import tRUrl from '../assets/art/fase2/torreta-lanzarredes.webp';
import tNBaseUrl from '../assets/art/fase2/torreta-ancla-base.webp';
import tNUrl from '../assets/art/fase2/torreta-ancla.webp';
import bKraken from '../assets/art/fase2/jefe-kraken.webp';
import bRey from '../assets/art/fase2/jefe-rey-cangrejo.webp';
import bSerpiente from '../assets/art/fase2/jefe-serpiente-hielo.webp';
import bTitan from '../assets/art/fase2/jefe-titan-magma.webp';
import bLeviatan from '../assets/art/fase2/jefe-leviatan.webp';

/** Imagen fija con su punto de anclaje (o = origen del mundo) en píxeles y su escala:
 *  k = píxeles del juego por píxel de imagen. */
export interface Still { img: HTMLImageElement; w: number; h: number; ox: number; oy: number; k: number; lamp?: number[] }
const still = (url: string, m: { w: number; h: number; o: number[]; lamp?: number[] }, k: number): Still => ({ img: img(url), w: m.w, h: m.h, ox: m.o[0], oy: m.o[1], k, lamp: m.lamp });
export const islaArt = still(islaUrl, f2.isla, 1 / f2.ppu);
export const faroArt = still(faroUrl, f2.faro, 1 / f2.ppu);
/** Red: k para un diámetro de 1 px del juego (se multiplica por el diámetro deseado). */
export const redArt = still(redUrl, f2.red, 1 / f2.red.ppu);
/** Arpón: k para un largo de 1 px del juego. */
export const arponArt = still(arponUrl, f2.arpon, 1 / f2.arpon.ppu);

export interface TurretArt { base: HTMLImageElement; head: HTMLImageElement; px: number; dirs: number; frames: number; ox: number; oy: number; k: number }
const tur = (b: string, h: string, m: typeof f2.tA): TurretArt => ({ base: img(b), head: img(h), px: m.px, dirs: m.dirs, frames: m.frames, ox: m.ox, oy: m.oy, k: (40 * m.scale) / m.ppu });
const TURRET_ART = { tA: tur(tABaseUrl, tAUrl, f2.tA), tR: tur(tRBaseUrl, tRUrl, f2.tR), tN: tur(tNBaseUrl, tNUrl, f2.tN) };
export function turretArt(k: 'tA' | 'tR' | 'tN'): TurretArt | null {
  const t = TURRET_ART[k];
  return ready(t.base) && ready(t.head) ? t : null;
}

const BOSS_URL: Record<string, string> = { bahia: bKraken, arrecife: bRey, helado: bSerpiente, volcan: bTitan, abismo: bLeviatan };
const BOSS_SHEETS: Record<string, Sheet> = {};
/** Hoja de sprites del jefe de una zona (se carga solo cuando hace falta). */
export function bossSheet(zone: string): Sheet | null {
  let s = BOSS_SHEETS[zone];
  if (!s) {
    const m = (f2.jefes as Record<string, { px: number; dirs: number; frames: number; ox: number; oy: number; ppu: number }>)[zone];
    if (!m || !BOSS_URL[zone]) return null;
    s = BOSS_SHEETS[zone] = { img: img(BOSS_URL[zone]), ...m, len: 2.7, fps: 5 };
  }
  return ready(s.img) ? s : null;
}

/* ---------- Barcos y objetos de los modos nuevos (desde modelos 3D, ver tools/glb-sprite/bake-barcos.py) ---------- */
import barcosMeta from '../assets/art/barcos/meta.json';
import bJugadorUrl from '../assets/art/barcos/barco-jugador.webp';
import bSuministrosUrl from '../assets/art/barcos/barco-suministros.webp';
import bPirataUrl from '../assets/art/barcos/barco-pirata.webp';
import bCapitanUrl from '../assets/art/barcos/barco-capitan.webp';
import bAbordadorUrl from '../assets/art/barcos/barco-abordador.webp';
import oBarrilUrl from '../assets/art/barcos/objeto-barril.webp';
import oRestosUrl from '../assets/art/barcos/objeto-restos.webp';
import oCofreUrl from '../assets/art/barcos/objeto-cofre.webp';

const mkB = (url: string, key: keyof typeof barcosMeta, len: number, fps: number): Sheet => ({ img: img(url), ...barcosMeta[key], len, fps });
/** Barcos y objetos sueltos: len = largo del modelo en píxeles del juego (no en radios). */
const BARCOS: Record<string, Sheet> = {
  jugador: mkB(bJugadorUrl, 'barco-jugador', 52, 6),
  suministros: mkB(bSuministrosUrl, 'barco-suministros', 54, 6),
  pirate: mkB(bPirataUrl, 'barco-pirata', 2.35, 6),
  captain: mkB(bCapitanUrl, 'barco-capitan', 2.05, 5),
  raider: mkB(bAbordadorUrl, 'barco-abordador', 2.6, 8),
  barril: mkB(oBarrilUrl, 'objeto-barril', 22, 1),
  restos: mkB(oRestosUrl, 'objeto-restos', 28, 2),
  cofre: mkB(oCofreUrl, 'objeto-cofre', 24, 5),
};
/** Hoja de un barco u objeto, o null (dibujo por código) mientras la imagen no cargue. */
export function boatSheet(k: string): Sheet | null {
  const s = BARCOS[k];
  return s && ready(s.img) ? s : null;
}

/* ---------- Decoración de la Bahía (modelos deco-*.glb, ver tools/glb-sprite/bake-deco.py) ---------- */
import decoMeta from '../assets/art/deco/meta.json';
import dBoyaUrl from '../assets/art/deco/deco-boya.webp';
import dRocasUrl from '../assets/art/deco/deco-rocas.webp';
import dRedUrl from '../assets/art/deco/deco-red.webp';
import dMuelleUrl from '../assets/art/deco/deco-muelle.webp';
import dNasaUrl from '../assets/art/deco/deco-nasa.webp';
import dBoteUrl from '../assets/art/deco/deco-bote-hundido.webp';

const mkD = (url: string, key: keyof typeof decoMeta, len: number, fps: number): Sheet => ({ img: img(url), ...decoMeta[key], len, fps });
/** len = tamaño del modelo en píxeles del juego. */
const DECO: Record<string, Sheet> = {
  boya: mkD(dBoyaUrl, 'deco-boya', 22, 3),
  rocas: mkD(dRocasUrl, 'deco-rocas', 40, 1),
  red: mkD(dRedUrl, 'deco-red', 36, 2),
  muelle: mkD(dMuelleUrl, 'deco-muelle', 46, 1),
  nasa: mkD(dNasaUrl, 'deco-nasa', 20, 1),
  bote: mkD(dBoteUrl, 'deco-bote-hundido', 38, 1.5),
};
/** Hoja de un adorno de la Bahía, o null (no se dibuja) mientras la imagen no cargue. */
export function decoSheet(k: string): Sheet | null {
  const s = DECO[k];
  return s && ready(s.img) ? s : null;
}

/* ---------- Modo Costa (modelos costa-*.glb y arma-*.glb, ver tools/glb-sprite/bake-costa.py) ---------- */
import costaMeta from '../assets/art/costa/meta.json';
import cMuralla from '../assets/art/costa/costa-muralla.webp';
import cHueco from '../assets/art/costa/costa-hueco.webp';
import cAntorcha from '../assets/art/costa/costa-antorcha.webp';
import wCanonB from '../assets/art/costa/arma-canon-base.webp';
import wCanon from '../assets/art/costa/arma-canon.webp';
import wBallestaB from '../assets/art/costa/arma-ballesta-base.webp';
import wBallesta from '../assets/art/costa/arma-ballesta.webp';
import wMorteroB from '../assets/art/costa/arma-mortero-base.webp';
import wMortero from '../assets/art/costa/arma-mortero.webp';
import wLuzB from '../assets/art/costa/arma-luz-base.webp';
import wLuz from '../assets/art/costa/arma-luz.webp';

type PieceMeta = { w: number; h: number; ppu: number; o: number[] };
/** Pieza fija: k = píxeles del juego por unidad del modelo / ppu de la imagen. */
const piece = (url: string, m: PieceMeta, units: number): Still => ({ img: img(url), w: m.w, h: m.h, ox: m.o[0], oy: m.o[1], k: units / m.ppu });
const CM = costaMeta as unknown as Record<string, PieceMeta & { px: number; dirs: number; frames: number; ox: number; oy: number; ppu: number }>;
/** Tamaños en píxeles del juego por unidad del modelo. */
export const costaArt = {
  muralla: piece(cMuralla, CM['costa-muralla'], 64),
  hueco: piece(cHueco, CM['costa-hueco'], 40),
  antorcha: piece(cAntorcha, CM['costa-antorcha'], 20),
};
export function costaPiece(k: keyof typeof costaArt): Still | null { const s = costaArt[k]; return ready(s.img) ? s : null; }

const wep = (b: string, h: string, key: string, len: number): TurretArt => { const m = CM[key]; return { base: img(b), head: img(h), px: m.px, dirs: m.dirs, frames: m.frames, ox: m.ox, oy: m.oy, k: len / m.ppu }; };
const WEAPON_ART: Record<string, TurretArt> = {
  canon: wep(wCanonB, wCanon, 'arma-canon', 36),
  ballesta: wep(wBallestaB, wBallesta, 'arma-ballesta', 38),
  mortero: wep(wMorteroB, wMortero, 'arma-mortero', 32),
  luz: wep(wLuzB, wLuz, 'arma-luz', 36),
};
/** Arte de un arma del Modo Costa (base fija + cabeza en 16 direcciones × 4 cuadros), o null mientras no cargue. */
export function weaponArt(id: string): TurretArt | null {
  const t = WEAPON_ART[id];
  return t && ready(t.base) && ready(t.head) ? t : null;
}
