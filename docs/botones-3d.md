# Faro en la Tormenta: botones de habilidad en 3D (ChatGPT)

Tres botones: **Destello**, **Buque** y **Andanada**. Cada uno es un objeto 3D suelto, **sin círculo, placa ni fondo**: la imagen misma es el botón.

## Cómo hacerlo

1. Abre un chat nuevo en ChatGPT por cada botón.
2. Pega el **prompt maestro** y luego el **prompt del botón**.
3. Si la imagen sale con fondo, pide: *"same image, fully transparent background, PNG"*.
4. Descarga el PNG con el nombre indicado y mándame los 3 en un zip.

**La animación la pongo yo en el juego**, no hace falta pedirla:
- flota suave arriba y abajo;
- brilla y late cuando está listo;
- un destello de luz cruza el objeto cada pocos segundos;
- suelta partículas: chispas en el rayo, espuma en el barco y brasas en la explosión;
- se aplasta y rebota al tocarlo;
- mientras recarga se ve en gris y se va "llenando de color" desde abajo.

Por eso cada imagen tiene que ser **un solo objeto limpio, centrado y sin efectos pegados al borde**.

---

## Prompt maestro

```
You are creating a 3D game UI icon for a mobile tower-defense game called "Faro en la Tormenta" (a lighthouse defending against sea monsters at night, in a storm).

Rules for the image:
- ONE single 3D object, centered, filling about 80% of the canvas, with a little empty margin on every side.
- Square 1024x1024 PNG with a FULLY TRANSPARENT background. No circle, no badge, no button plate, no frame, no ground, no shadow on a floor, no text, no letters, no numbers.
- Style: stylized, chunky, premium mobile-game 3D (soft clay/toy look with crisp bevels), like high-end casual game icons. Smooth shapes, slightly exaggerated proportions.
- Lighting: soft key light from the top-left, a strong cool rim light around the silhouette, gentle inner glow on the magic/energy parts. High contrast so it reads at 60 pixels wide on a dark navy background.
- Camera: slight 3/4 view from a bit above, the object tilted a little toward the viewer, dynamic but readable.
- Palette of the game: deep navy night sea, turquoise accent (#3fd7c4), warm lamp light (#ffe9a8). Do not use gold.
- Keep any glow or particles INSIDE the object area (they must not touch the image edges), because the game adds its own animated effects.

Reply first with a short checklist of these rules, then wait for the asset description.
```

---

## Prompts por botón

### 1. Destello (`boton-destello.png`)

```
Asset: boton-destello.png - a chunky 3D lightning bolt made of glowing turquoise crystal energy (#3fd7c4 core fading to bright white-cyan #eafffb at the edges), with a thin dark navy metallic outline/bevel so it reads on dark backgrounds. Small crackles of electricity wrap around it, tightly hugging the bolt. The bolt is thick and bold, angled diagonally, with a faceted crystal surface catching the rim light. Inner glow, no outer haze touching the edges. Transparent background.
```

### 2. Buque de guerra (`boton-buque.png`)

```
Asset: boton-buque.png - a small chunky 3D toy-like warship (a sturdy wooden galleon of the lighthouse keepers), seen in 3/4 view from the front-left and slightly above. Dark polished wood hull with a turquoise stripe (#3fd7c4) along the side, three little bronze-dark cannons poking out of the side, one tall mast with a cream sail bulging with wind, a small turquoise pennant flag on top, a tiny warm lantern (#ffe9a8) glowing at the stern. A small curl of white sea foam splashing at the bow, staying close to the hull. Cute but powerful, oversized cannons, very readable silhouette. Transparent background.
```

### 3. Andanada (`boton-andanada.png`)

```
Asset: boton-andanada.png - a dramatic 3D cannon blast: a chunky black-iron cannonball bursting out of a stylized fiery explosion. The explosion is a compact star-shaped burst of orange and warm yellow (#ff9a52 to #ffe9a8) with a few chunky smoke puffs in grey-blue and small ember sparks, all kept compact around the cannonball. The cannonball has a glossy highlight and a turquoise rim light. Bold, punchy, readable at small size. Transparent background.
```

---

## Si ChatGPT entrega el objeto con fondo o recortado

- Pide: *"Regenerate with the full object visible, more empty margin, and a fully transparent background."*
- Si no logra la transparencia, mándalo igual: yo recorto el fondo.

## Cuando lleguen

Guardo los PNG en `assets/art/botones/` y los convierto a WebP de 256 px. En `index.html` reemplazan las siluetas SVG de los botones `.abil` (`#flash`, `#fleetbtn`, `#volley`), con las animaciones de arriba hechas en CSS y canvas. Si una imagen no carga, se usa la silueta SVG actual.

---

## Herramientas del Arsenal que faltan (`boton-barril.png`, `boton-red.png`)

Usa el mismo prompt maestro. Mientras no lleguen, el juego usa una silueta.

### Barril explosivo (`boton-barril.png`)
```
Asset: boton-barril.png - a chunky 3D wooden powder barrel floating slightly tilted, dark oak staves with thick iron hoops, a bright red band with a small white skull-free warning mark (just a simple white diamond), a short lit fuse on top throwing a few compact orange sparks, a little ring of white sea foam around its base. Transparent background.
```

### Red gigante (`boton-red.png`)
```
Asset: boton-red.png - a chunky 3D bundle of fishing net being thrown, spreading open in a rounded shape, thick cream-colored rope knots (#e8d9b0) with small turquoise floats (#3fd7c4) along the edge and two small dark iron weights hanging from corners. Dynamic, mid-throw, readable at small size. Transparent background.
```
