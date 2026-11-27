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

## Contenido (v0.4)
- **5 zonas** con mecánica propia: Bahía Tranquila → Arrecife Rojo → Mar Helado (la escarcha congela el faro) → Volcán Submarino (erupciones) → El Abismo (solo ves lo que alumbra el faro). Se abren al llegar a la oleada 15.
- **8 criaturas**: cangrejo, medusa (se divide), sardinas, anguila (dispara), pez globo (explota), tortuga, ermitaño (coraza) y un jefe por zona que invoca esbirros y se enfurece.
- **Torretas** en la isla: Arponero, Lanzarredes y Ancla.
- **16 bendiciones**: cada 5 oleadas eliges 1 de 3 cartas.
- **Investigación**: árbol de 3 ramas con habilidades (Segunda llama, Planos del arponero, Cartógrafo…).
- **Logros** (19), estadísticas, misiones diarias, **desafío diario** con semilla (un intento, igual para todos) y **ranking**.
- **Tutorial** en las primeras oleadas. Música y sonidos generados por código.

## Ranking online (Firebase, opcional)
1. Crea un proyecto en console.firebase.google.com.
2. Authentication → Sign-in method → activa **Anónimo**.
3. Firestore Database → créala y usa estas reglas:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{db}/documents {
       match /scores/{uid} {
         allow read: if true;
         allow write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```
4. Configuración del proyecto → Tus apps → Web: copia `apiKey` y `projectId` en `src/firebase.config.ts`.

Sin Firebase, el ranking funciona solo en el dispositivo. Publicado como artifact de Claude, usa la base de datos compartida de Claude.
