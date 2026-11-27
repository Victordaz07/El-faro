# Faro en la Tormenta

Juego de defensa por oleadas para celular. El faro dispara solo y tú eliges las mejoras.
Stack: Vite + TypeScript + Canvas, empaquetado para Android con Capacitor.

## Correr en la compu
```bash
npm install
npm run dev        # abre la URL que sale (con --host también desde el celular en tu Wi-Fi)
npm run sim        # bot que juega partidas para revisar el balance
npm run build      # genera dist/index.html (un solo archivo)
```

## Android
Requisitos: Android Studio (trae el SDK y Java).
```bash
npm install
npm run android:sync   # compila y copia el juego a android/
npm run android:open   # abre Android Studio → botón ▶ Run, o Build > Build APK
```
- ID de la app: `com.victordiaz.farotormenta` (en `capacitor.config.ts`).
- Ya está fija en vertical y con permiso de vibración.
- Para Play Store: Build > Generate Signed Bundle (AAB).

## Estructura
| Archivo | Qué hace |
|---|---|
| `src/data.ts` | Números de diseño: mejoras, taller, zonas, misiones. **Aquí se balancea.** |
| `src/game.ts` | Lógica pura de la partida (sin DOM) |
| `src/render.ts` | Dibujo: mar, lluvia, rayos, faro, criaturas, efectos |
| `src/audio.ts` | Sonidos sintetizados (sin archivos de audio) |
| `src/save.ts` | Guardado local, misiones diarias, desbloqueo de zonas |
| `src/main.ts` | Interfaz, pantallas y bucle principal |
| `tests/sim.ts` | Simulación de balance |

## Contenido
- 3 zonas: Bahía Tranquila → Arrecife Rojo → El Abismo (se abren al llegar a la oleada 15)
- 8 criaturas: cangrejo, medusa (se divide en 2 desde la oleada 6), sardinas (cardumen rápido), anguila (dispara de lejos), pez globo (explota al llegar), tortuga (tanque), ermitaño (coraza que reduce cada golpe) y un jefe por zona
- Élites doradas desde la oleada 12 (×3 vida, ×3 recompensa)
- Jefes cada 10 oleadas: invocan esbirros y se enfurecen a los 40 s
- Condiciones de oleada desde la 6: Niebla, Corriente, Marea alta, Frenesí, Caparazón, Calma
- Modos de objetivo: Cercano, Peligro, Fuerte, Débil
- Destello: habilidad activa que aturde y daña todo alrededor
- 18 mejoras por partida (Luz / Muralla / Mareas), incluidas Alcance, Rebote, Espinas, Vida por baja e Interés
- 7 mejoras permanentes en el Taller, 3 misiones diarias + cofre del día
