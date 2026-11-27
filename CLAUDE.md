# Faro en la Tormenta

Juego de defensa por oleadas para celular (web primero, Android con Capacitor después).
Idioma de la interfaz y de los comentarios: **español**.

## Comandos
- `npm install`
- `npm run dev` — servidor local (con `--host` para probar desde el celular)
- `npm run build` — typecheck + `dist/index.html` en un solo archivo
- `npm run sim` — bot que juega partidas en todas las zonas; úsalo después de cualquier cambio de balance
- `npm test` — verifica que las perlas cuadren (iniciales + ganadas − gastadas) en partidas completas
- `npm run android:sync` / `npm run android:open` — Capacitor

## Estructura
- `src/data.ts` — números de diseño: mejoras, torretas, investigación, bendiciones, zonas, misiones, logros. **El balance se toca aquí y en `scale()` de game.ts.**
- `src/game.ts` — lógica pura sin DOM (se simula en Node). Todo lo de la partida vive aquí.
- `src/water.ts` — mar con shader WebGL (olas, cáusticas, nubes, espuma, reflejo del haz, hielo, lava). Si no hay WebGL se usa el mar 2D.
- `src/render.ts` — canvas: faro 2.5D, criaturas (sprites cacheados), efectos, clima por zona e **iluminación** (lightmap a media resolución que se multiplica sobre la escena). Tiene calidad automática (`adaptQuality`).
- `src/audio.ts` / `src/music.ts` — sonido y música generados con Web Audio (sin archivos con derechos).
- `src/save.ts` — guardado local, misiones diarias, logros, desafío diario.
- `src/leaderboard.ts` — ranking: Claude DB (artifact) → Firebase (`src/firebase.config.ts`) → local.
- `src/main.ts` — interfaz, pantallas, tutorial y bucle.
- `src/icons.ts` — íconos SVG propios de mejoras y pestañas.
- Interfaz: tema de vidrio marino oscuro con acento turquesa (`--acc`) en index.html; sin dorado. Tipografías incrustadas Lilita One y Nunito. El mar ocupa toda la pantalla; HUD y barra inferior flotan encima. Barra inferior compacta (`#bar`): 4 pestañas en cuadrícula 2×2 + fila deslizable de mejoras (`#sheet`); tocar la pestaña activa la cierra. Compra: toque = 1, dedo quieto 0.38 s = repetida, deslizar = mover la fila. `view.offY` en render.ts centra el faro en la zona visible.
- `assets/` — `icon.png` (ícono de la app) y `thumb.png` (portada). `assets/art/`: arte en WebP que se incrusta en el build (fondo del menú, retratos de jefes por zona, sprite del faro renderizado desde `assets/models/faro-isla.glb`); originales en `assets/art/originales/`.
- `src/art.ts` — carga ese arte; si una imagen no carga, se usa el dibujo por código.
- `tools/glb-sprite/` — convierte modelos 3D (.glb) en sprites. `bake-enemies.py` genera las hojas de enemigos (16 direcciones × 4 cuadros, cámara a 32°) desde `assets/models/enemigo-*.glb`; las animaciones por pieza están en `sheet.js` (`ANIM`). Resultado en `assets/art/enemigos/` (+ `meta.json`).
- Enemigos: si hay hoja de sprites se usa `drawFromSheet` en render.ts; si no, el dibujo por código. Emergen al aparecer, se hunden al morir (fx `sink`) y se tiñen por zona (`tinted`, tabla `TINT`). Los jefes siguen dibujados por código.
- Pendiente de modelos (fase 2 de la guía): isla con 3 plataformas (`isla-base.glb`), torretas con nodos Base/Head (`torreta-arponero/lanzarredes/ancla.glb`), `red.glb`, `arpon.glb` y los 5 jefes. Medidas y nombres de nodos están en la guía; las plataformas corresponden a `TURRET_POS` (mundo ÷ 40).
- Guía para pedir modelos a ChatGPT: https://claude.ai/artifact/AGMa1dhbwEqj1UVswy85cL (prompt maestro + prompt por criatura).

## Reglas
- Las perlas solo entran por `gain()` y solo salen por `buy()` en game.ts; nunca modificar `pearls` directamente.
- Comprar manteniendo presionado usa una sola repetición global (`holdStop` en main.ts) que se detiene al soltar, al fallar una compra o con otro toque.
- La lógica de juego no toca el DOM (para que `npm run sim` siga funcionando).
- El azar de oleadas y cartas usa la semilla (`mulberry`) para que el desafío diario sea igual para todos.
- Arte, nombres y mecánicas son propios: no copiar recursos de otros juegos. El arte con IA (ChatGPT) es original y se guarda en `assets/art/`.
- Faltan retratos para Mar Helado, Volcán y Abismo: agrégalos en `bossArt` de art.ts con el mismo estilo.
- Objetivo de dificultad: comprando al azar se muere ~oleada 6; un bot perfecto sin investigación llega a ~26-31.
