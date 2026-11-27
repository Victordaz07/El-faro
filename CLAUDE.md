# Faro en la Tormenta

Juego de defensa por oleadas para celular (web primero, Android con Capacitor después).
Idioma de la interfaz y de los comentarios: **español**.

## Comandos
- `npm install`
- `npm run dev` — servidor local (con `--host` para probar desde el celular)
- `npm run build` — typecheck + `dist/index.html` en un solo archivo
- `npm run sim` — bot que juega partidas en todas las zonas; úsalo después de cualquier cambio de balance
- `npm run android:sync` / `npm run android:open` — Capacitor

## Estructura
- `src/data.ts` — números de diseño: mejoras, torretas, investigación, bendiciones, zonas, misiones, logros. **El balance se toca aquí y en `scale()` de game.ts.**
- `src/game.ts` — lógica pura sin DOM (se simula en Node). Todo lo de la partida vive aquí.
- `src/render.ts` — canvas: agua, faro 2.5D, criaturas (sprites cacheados), efectos, clima por zona.
- `src/audio.ts` / `src/music.ts` — sonido y música generados con Web Audio (sin archivos con derechos).
- `src/save.ts` — guardado local, misiones diarias, logros, desafío diario.
- `src/leaderboard.ts` — ranking: Claude DB (artifact) → Firebase (`src/firebase.config.ts`) → local.
- `src/main.ts` — interfaz, pantallas, tutorial y bucle.

## Reglas
- La lógica de juego no toca el DOM (para que `npm run sim` siga funcionando).
- El azar de oleadas y cartas usa la semilla (`mulberry`) para que el desafío diario sea igual para todos.
- Arte, nombres y mecánicas son propios: no copiar recursos de otros juegos.
- Objetivo de dificultad: comprando al azar se muere ~oleada 6; un bot perfecto sin investigación llega a ~26-31.
