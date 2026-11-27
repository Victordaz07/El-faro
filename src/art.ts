// Arte pintado e importado: sprite del faro (renderizado desde un modelo 3D),
// fondo del menú y retratos de jefes. Si una imagen no carga, el juego usa el
// dibujo por código de siempre.
import faroUrl from '../assets/art/faro-sprite.webp';
import faroMeta from '../assets/art/faro-sprite.json';
import menuUrl from '../assets/art/menu-fondo.webp';
import krakenUrl from '../assets/art/jefe-kraken.webp';
import reyUrl from '../assets/art/jefe-rey-cangrejo.webp';

function img(src: string) {
  const i = new Image();
  i.decoding = 'async';
  i.src = src;
  return i;
}

export const faroSprite = { img: img(faroUrl), ...faroMeta };
export const menuArt = menuUrl;
/** Retrato por zona (id de zona → imagen). Las zonas sin retrato no lo muestran. */
export const bossArt: Record<string, string> = {
  bahia: krakenUrl,
  arrecife: reyUrl,
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
  const s = SHEETS[type];
  return s && ready(s.img) ? s : null;
}
