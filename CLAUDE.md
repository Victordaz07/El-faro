# Faro en la Tormenta

Juego de defensa por oleadas para celular (web primero, Android con Capacitor después).
Idiomas del juego: **español e inglés** (`src/i18n.ts`). Comentarios del código: español.

## Comandos
- `npm install`
- `npm run dev` — servidor local (con `--host` para probar desde el celular)
- `npm run build` — typecheck + `dist/index.html` en un solo archivo
- `npm run sim` — bot que juega partidas en todas las zonas; úsalo después de cualquier cambio de balance
- `npm test` — verifica que las perlas cuadren (iniciales + ganadas − gastadas) en partidas completas y que todo texto tenga traducción al inglés (`tests/i18n.ts`)
- `npm run android:sync` / `npm run android:open` — Capacitor

## Estructura
- `src/data.ts` — números de diseño: mejoras, torretas, investigación, bendiciones, zonas, misiones, logros. **El balance se toca aquí y en `scale()` de game.ts.**
- `src/game.ts` — lógica pura sin DOM (se simula en Node). Todo lo de la partida vive aquí.
- `src/water.ts` — mar con shader WebGL: oleaje de 7 olas direccionales con crestas afiladas (`swell`) y deformación lenta para que no se repita, reflejo del cielo (Fresnel), camino de luna, espuma en crestas y orilla (elipse de la isla), vetas de viento, nubes, hielo y lava. Ruido con hash sin seno (el seno se ve en bloques en GPUs de celular) y sin detalle más fino que un píxel. Con poca potencia baja la resolución y quita los rizos (`uQ`), pero nunca se apaga; el mar 2D (líneas de oleaje, sin mosaico) es solo para equipos sin WebGL.
- `src/render.ts` — canvas: faro 2.5D, criaturas (sprites cacheados), efectos, clima por zona e **iluminación** (lightmap a media resolución que se multiplica sobre la escena). Tiene calidad automática (`adaptQuality`).
- `src/audio.ts` / `src/music.ts` — sonido y música generados con Web Audio (sin archivos con derechos).
- `src/save.ts` — guardado local, misiones diarias, logros, desafío diario.
- `src/leaderboard.ts` — ranking: Claude DB (artifact) → Firebase (`src/firebase.config.ts`) → local.
- `src/main.ts` — interfaz, pantallas, tutorial y bucle.
- `src/i18n.ts` — idiomas. El texto se escribe en español en el código; `t('texto')` lo traduce con el diccionario `EN`, `L(es, en)` para frases con números, y `localize()` (al final de data.ts) convierte los nombres y descripciones de los datos en getters. index.html se traduce al arrancar (`translateDom` en main.ts). Idioma: el guardado (`save.lang`), `#lang=en` en la dirección o el del dispositivo; el botón ES/EN del menú lo cambia y recarga.
- `src/icons.ts` — íconos SVG propios de mejoras y pestañas.
- Interfaz: tema de vidrio marino oscuro con acento turquesa (`--acc`) en index.html; sin dorado. Tipografías incrustadas Lilita One y Nunito. El mar ocupa toda la pantalla; HUD y barra inferior flotan encima. Barra inferior compacta (`#bar`): 4 pestañas en cuadrícula 2×2 + fila deslizable de mejoras (`#sheet`); tocar la pestaña activa la cierra. Compra: toque = 1, dedo quieto 0.38 s = repetida, deslizar = mover la fila. `view.offY` en render.ts centra el faro en la zona visible.
- `assets/` — `icon.png` (ícono de la app) y `thumb.png` (portada). `assets/art/`: arte en WebP que se incrusta en el build (fondo del menú y retratos de jefes por zona); originales en `assets/art/originales/`. `assets/art/fase2/`: isla, faro, torretas, red, arpón y jefes renderizados desde `assets/models/` + `meta.json` con anclas.
- `src/art.ts` — carga ese arte; si una imagen no carga, se usa el dibujo por código.
- `tools/glb-sprite/` — convierte modelos 3D (.glb) en sprites. `bake-enemies.py` genera las hojas de enemigos (16 direcciones × 4 cuadros, cámara a 32°) desde `assets/models/enemigo-*.glb`; las animaciones por pieza están en `sheet.js` (`ANIM`). Resultado en `assets/art/enemigos/` (+ `meta.json`).
- Enemigos: si hay hoja de sprites se usa `drawFromSheet` en render.ts; si no, el dibujo por código. Emergen al aparecer, se hunden al morir (fx `sink`) y se tiñen por zona (`tinted`, tabla `TINT`). Los jefes usan su propia hoja por zona (`bossSheet`, sin tinte).
- Fase 2 (`tools/glb-sprite/fase2.js` + `bake-fase2.py`): isla (`isla-base.glb`, recortada al nivel del agua) y faro (`faro-solo.glb` en Y=0.22) por separado para que las criaturas pasen detrás del faro; escala 1 unidad = 40 px del juego. `LAMP_Y` y `TURRET_POS` salen de las anclas de ese render: si se cambia la isla, hay que recalcularlos. Torretas: base fija + cabeza en 16 direcciones × 4 cuadros (0 = reposo, 1-3 = disparo; `g.tFire`, `g.slamT`); se ordenan por profundidad junto con criaturas y faro. Red y arpón usan sus modelos. Si una imagen no carga, se usa el dibujo por código.
- Ataques: la anguila se carga (`chargeT`, 0.5 s) y lanza una descarga instantánea (`zap()`, fx `zap` en zigzag); cuerpo a cuerpo con embestida (`lungeT`) y fx `bite`/`sting`/`bash`; la red vuela en arco (`nets` + fx `netfly`) y se aplica al caer; el ancla y el pez globo lanzan `spray` con gravedad. `eshots` ya no se usa.
- Criaturas por mundo (`TABLE` en game.ts: tipo, oleada, peso, mundo): cada mundo suma 2 propias y conserva las anteriores; las oleadas crecen 10% por mundo. Bahía: caballito (cura), estrella (se parte en `starlet`). Arrecife: langosta (`shell`: la luz hace 25%, el toque 200%), pez león (veneno `poisonT`). Helado: narval (`mode` 0-3: apunta 1 s y embiste; tocarlo mientras apunta lo aturde), foca (`under`: bucea y no se apunta). Volcán: pez ígneo (`fireballs` en arco, se apagan tocándolas), tortuga volcánica (suelta 4 `lavacrab`). Abismo: rape (`dim`: el faro dispara más lento), medusa fantasma (`phased`: solo la dañan toques y áreas). `damage()` recibe la fuente ('beam' | 'turret' | 'tap' | 'area'). La primera vez que aparece cada una se muestra su ficha (`CREATURES` en data.ts, `save.seen`).
- Dibujo de las criaturas nuevas: por código en `drawEnemy` (casos nuevos) mientras llegan sus modelos; cangrejito de lava, medusa fantasma y tortuga volcánica usan la hoja de cangrejo, medusa y tortuga con tinte (`BORROW` en render.ts). Prompts para ChatGPT en `docs/criaturas-nuevas-3d.md`.
- Toque: tocar el mar llama a `g.tapAt(x, y)` (main.ts convierte con `lastCam` de render.ts). Cargas `taps` (máx. `TAP_MAX` = 5) que se recargan cada `st.tapCd`; daño `st.tap`; mejora `tap` en LUZ. Los puntos sobre OBJETIVO muestran las cargas. El bot de `npm run sim` no compra Toque; la columna "tocando" es un bot que sí toca.
- Modelos de la fase 2 ya integrados (paquete TODO_3D). Serpiente de hielo: `Spikes` es un solo nodo, por eso sus espiras no se animan por separado.
- Guía para pedir modelos a ChatGPT: https://claude.ai/artifact/AGMa1dhbwEqj1UVswy85cL (prompt maestro + prompt por criatura).

## Reglas
- Todo texto nuevo visible pasa por `t()` o `L()` y lleva su traducción en `EN`; `npm test` falla si falta alguna.
- Las perlas solo entran por `gain()` y solo salen por `buy()` en game.ts; nunca modificar `pearls` directamente.
- Comprar manteniendo presionado usa una sola repetición global (`holdStop` en main.ts) que se detiene al soltar, al fallar una compra o con otro toque.
- La lógica de juego no toca el DOM (para que `npm run sim` siga funcionando).
- El azar de oleadas y cartas usa la semilla (`mulberry`) para que el desafío diario sea igual para todos.
- Arte, nombres y mecánicas son propios: no copiar recursos de otros juegos. El arte con IA (ChatGPT) es original y se guarda en `assets/art/`.
- Retratos de jefes: los 5 son ilustraciones pintadas con ChatGPT (originales de 1024 px en `assets/art/originales/`, WebP de 512 px en `assets/art/`). Un retrato nuevo sigue el estilo del Kraken, con la cabeza al centro porque se recorta en círculo. `bake-fase2.py` no los toca si existe el original.
- Objetivo de dificultad: comprando al azar se muere ~oleada 6; un bot perfecto sin investigación llega a ~26-31.
