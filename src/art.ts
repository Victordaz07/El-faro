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
