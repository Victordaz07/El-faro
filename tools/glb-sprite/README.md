# Modelo 3D → sprite del juego

Convierte un modelo `.glb` (Tripo, ChatGPT, Blender…) en un sprite con fondo transparente,
visto con la misma elevación que la cámara 2.5D del juego, y calcula dónde caen la base
y la linterna para alinearlo.

1. Copia el modelo junto a `sprite.html` (ej. `modelo.glb`).
2. `npx esbuild tools/glb-sprite/sprite.js --bundle --format=iife --outfile=tools/glb-sprite/sprite.bundle.js`
3. Abre `sprite.html` en Chrome con `--allow-file-access-from-files` y ejecuta en la consola:
   `await makeSprite('modelo.glb', 32, 25, 640)` → devuelve el PNG (data URL) y las anclas `origin` y `lamp`.
   (`sprite.py` hace lo mismo automáticamente con Playwright.)
4. Recorta, guarda como WebP en `assets/art/` y actualiza su `.json` de anclas.

## Revisar materiales antes de usar un modelo
Muchos exportadores omiten `metallicFactor`; el estándar glTF lo toma como **1.0 (metal)** y la
pieza se ve negra donde no le da la luz directa. Eso le pasaba a `assets/models/faro-isla.glb`
(ya corregido: yeso y roca en 0.0, hierro y latón en ~0.6).
