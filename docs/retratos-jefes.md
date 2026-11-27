# Faro en la Tormenta: retratos pintados de los jefes

Estos prompts sirven para pedirle a ChatGPT los retratos que faltan: **Serpiente de Hielo**, **Titán de Magma** y **Leviatán**. Así combinan con los del Kraken y el Rey Cangrejo. Los retratos aparecen en un círculo durante la cinemática de entrada de cada jefe.

## Cómo hacerlo

Haz **un chat nuevo por jefe** y sube dos imágenes en cada uno:

1. **`estilo-kraken.png`**: la referencia de estilo, para que copie la pintura del Kraken.
2. **`diseno-jefe-….png`** de ese jefe: la referencia de diseño, para que pinte la misma criatura que aparece en el juego.

Después pega el prompt del jefe. Los prompts están en inglés porque ChatGPT sigue mejor las instrucciones de imagen en ese idioma.

| Jefe | Imagen de diseño | Nombre del archivo que me mandas |
|---|---|---|
| Serpiente de Hielo | `diseno-jefe-serpiente-hielo.png` | `jefe-serpiente-hielo.png` |
| Titán de Magma | `diseno-jefe-titan-magma.png` | `jefe-titan-magma.png` |
| Leviatán | `diseno-jefe-leviatan.png` | `jefe-leviatan.png` |

---

## 1. Serpiente de Hielo

Sube `estilo-kraken.png` y `diseno-jefe-serpiente-hielo.png`.

```
Create a square 1:1 painted illustration (1024×1024) for the boss intro of my mobile game. Image 1 (the kraken) is the STYLE reference: copy its dark, moody digital-painting look exactly — dramatic rim light, high contrast, glowing eyes as the focal point, stormy night sea with crashing foam at the bottom, and a tiny lighthouse with a warm beam far away in the lower-left for scale. Image 2 is the DESIGN reference: paint that same creature, but painted like image 1, not like a 3D render.

Boss: the ICE SERPENT, a colossal sea serpent rising from a freezing night sea among broken ice floes. Blue dragon-like head with tall pale-white ice-crystal horns and a ridge of ice spikes down its coiled spine, deep blue scales #2F7FA6 frosted with pale blue #BFE8FF, heavy dark brows over glowing cyan eyes, open jaws with white fangs, frost breath, snow falling.

Composition: the head and eyes centered and filling the middle of the frame, looking at the viewer. The game crops the image into a circle, so keep everything important inside the central 70%. No text, no logo, no border, no frame.
```

## 2. Titán de Magma

Sube `estilo-kraken.png` y `diseno-jefe-titan-magma.png`.

```
Create a square 1:1 painted illustration (1024×1024) for the boss intro of my mobile game. Image 1 (the kraken) is the STYLE reference: copy its dark, moody digital-painting look exactly — dramatic rim light, high contrast, glowing eyes as the focal point, stormy night sea with crashing foam at the bottom, and a tiny lighthouse with a warm beam far away in the lower-left for scale. Image 2 is the DESIGN reference: paint that same creature, but painted like image 1, not like a 3D render.

Boss: the MAGMA TITAN, a colossal golem rising waist-deep from a boiling sea above an undersea volcano. Body built from cracked black basalt boulders #2A2420 with bright molten lava #FF7A1A glowing through the cracks, a horned rocky head with glowing yellow eyes and small fangs, two enormous rock fists slamming the water, steam, embers and falling ash.

Composition: the head and eyes centered and filling the middle of the frame, looking at the viewer. The game crops the image into a circle, so keep everything important inside the central 70%. No text, no logo, no border, no frame.
```

## 3. Leviatán

Sube `estilo-kraken.png` y `diseno-jefe-leviatan.png`.

```
Create a square 1:1 painted illustration (1024×1024) for the boss intro of my mobile game. Image 1 (the kraken) is the STYLE reference: copy its dark, moody digital-painting look exactly — dramatic rim light, high contrast, glowing eyes as the focal point, stormy night sea with crashing foam at the bottom, and a tiny lighthouse with a warm beam far away in the lower-left for scale. Image 2 is the DESIGN reference: paint that same creature, but painted like image 1, not like a 3D render.

Boss: the LEVIATHAN, an ancient abyssal sea dragon surfacing from pitch-black water. Dark teal eel-dragon head and arching body #1F6F6A, long black horns, rows of glowing cyan bioluminescent spots along the body, heavy brows over glowing violet-pink eyes, open jaws with pale needle fangs, near-black indigo sky, only lit by its own glow and the distant lighthouse beam.

Composition: the head and eyes centered and filling the middle of the frame, looking at the viewer. The game crops the image into a circle, so keep everything important inside the central 70%. No text, no logo, no border, no frame.
```

---

## Si algo sale mal

Pega la frase que corresponda en el mismo chat:

| Problema | Frase para pegar |
|---|---|
| Se ve como un render 3D | `Repaint it in the painterly style of image 1, not as a 3D render.` |
| La criatura quedó muy pequeña o cortada | `Zoom in: the head should fill the center of the square.` |
| Puso texto, letras o un marco | `Remove all text and borders.` |
| No se parece al jefe del juego | `Keep the creature's design from image 2: same horns, eyes, colors and spikes.` |
| Salió rectangular | `Make it a perfect square, 1:1.` |

## Revisión antes de mandármelo

- [ ] Es cuadrado.
- [ ] Los ojos y la cabeza están en el centro, porque el juego lo recorta en círculo.
- [ ] Se ve pintado como el Kraken, no como un modelo 3D.
- [ ] Los colores y la forma coinciden con el jefe del juego.
- [ ] No tiene texto, logo ni marco.

Cuando tengas los 3, mándamelos y reemplazo los retratos provisionales en `assets/art/`.
