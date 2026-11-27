# Faro en la Tormenta: decoración 3D de la Bahía Tranquila

Objetos de ambiente para dar identidad a la primera zona. No son enemigos ni se tocan: se quedan flotando o posados en el mar alrededor de la isla, fuera del camino de las criaturas, y se mecen suavemente.

## Cómo hacerlo

1. Abre un chat nuevo en ChatGPT **por cada objeto** (o reutiliza uno que ya tenga el prompt maestro).
2. Pega el **mismo prompt maestro** de `barcos-y-objetos-3d.md` (el de "Barcos y objetos") y espera la lista de reglas.
3. Pega el prompt del objeto de abajo.
4. Revisa la vista previa y el reporte de verificación.
5. Descarga el `.glb` con el nombre indicado y mándalos en un zip.

Estos objetos son **decorado**: no llevan personas ni animales y no necesitan piezas animadas, salvo las que se indican (el brillo de la boya y la red). Si ChatGPT pregunta por el agua o el fondo, no los incluyas.

| Objeto | Archivo | Para qué sirve | Tamaño en pantalla |
|---|---|---|---|
| Boya con luz | `deco-boya.glb` | Boya de señal que parpadea, da ambiente de puerto | ~22 px |
| Rocas con algas | `deco-rocas.glb` | Islotes pequeños con algas colgando | ~34 px |
| Red de pesca flotante | `deco-red.glb` | Red enredada con corchos | ~36 px |
| Muelle roto | `deco-muelle.glb` | Restos de un embarcadero | ~46 px |
| Nasa de langosta | `deco-nasa.glb` | Jaula de pesca con boya de cuerda | ~20 px |
| Bote hundido | `deco-bote-hundido.glb` | Bote volcado con medio casco fuera del agua | ~38 px |

---

## Prompts por objeto

### 1. Boya con luz

```
Asset: "Boya con luz" (signal buoy with a blinking lamp, harbor ambience decoration). File name: deco-boya.glb
- Shape: a chunky conical buoy with a wide rounded base, narrowing to a small platform on top with a tiny cage-like frame holding a lamp. A short mooring chain loop hangs from a ring at the front (+Z). It floats upright, slightly dented and weathered. No text or numbers.
- Colors: body painted in two bands, red #D6402F and cream #EFE6D2; rim and frame dark iron #3A3F48 (metallicFactor at most 0.2); lamp glass warm yellow #FFE27A (emissive, glowing); chain pale grey #9AA3AD; a few small rust spots #7A3B22.
- Separate parts (pivot at the joint): Buoy (body, rim and frame), Lamp (the glowing glass, pivot at its center), Chain.
- Height is the longest dimension here: make the buoy about 1.0 tall and about 0.55 wide. Triangles: about 1,800.
```

### 2. Rocas con algas

```
Asset: "Rocas con algas" (small rock islet with seaweed). File name: deco-rocas.glb
- Shape: a cluster of three chunky rounded rocks of different sizes, the biggest in the middle, with flat bottoms at y = 0 (they sit at the waterline). Ribbons of seaweed drape over the sides and float outward from the base like leafy strips. A few small barnacle bumps and a little starfish-free, animal-free surface. Readable from above: rocks as soft rounded blobs, seaweed as flat curved ribbons at least 3% of the size thick.
- Colors: rocks cool grey #6F7C86 with darker cracks #3F4A52 and lighter top highlights #A9B6BF; seaweed olive-green #5B8A3A and darker green #2F5A2A with a few lighter tips #8DB75A; wet dark band near the base #33404A.
- Separate parts: Rocks, Seaweed.
- Longest horizontal dimension 1.0; height about 0.35. Triangles: about 3,000.
```

### 3. Red de pesca flotante

```
Asset: "Red de pesca flotante" (floating tangled fishing net). File name: deco-red.glb
- Shape: a flat, wide, irregular mat of fishing net lying on the water: a thick open-grid mesh (square holes big enough to read from above, about 6 by 6 cells, bars at least 3% of the size thick), with ruffled, curled and torn edges and a few folds. Round cork floats are tied along the border, and a short loose rope end trails out toward +Z. Very low and flat.
- Colors: net rope tan #C9AE7C with darker twists #8A7248; cork floats orange-red #E0562C and cream #F2E6CB, alternating; rope end #D9CDB4.
- Separate parts: Net, Floats, Rope.
- Longest horizontal dimension 1.0; height about 0.12. Triangles: about 3,500.
```

### 4. Muelle roto

```
Asset: "Muelle roto" (broken pier remains). File name: deco-muelle.glb
- Shape: the remains of a small wooden pier jutting out toward +Z: a short row of deck planks (about 5 planks wide, with gaps and missing planks), supported by 4 to 6 thick posts of uneven height, a couple of posts snapped off and leaning, one railing section tilted and broken, a coil of rope hanging from a post. The far end (+Z) is splintered and jagged. Everything stays above the waterline, with flat post bottoms at y = 0. Make the planks and posts thick and chunky so they read from above.
- Colors: weathered wood #7A5A38 with grey bleached planks #A39A86 and dark wet posts #3D2F22; splinter tips pale #D8C9A6; iron nails and straps dark #3A3F48 (metallicFactor at most 0.2); rope #D9CDB4.
- Separate parts: Planks, Posts, Rail, Rope.
- Longest horizontal dimension 1.0; height about 0.3. Triangles: about 3,500.
```

### 5. Nasa de langosta

```
Asset: "Nasa de langosta" (floating lobster trap with a rope buoy). File name: deco-nasa.glb
- Shape: a small half-cylinder lobster trap made of wooden slats over a curved wire frame, with a round funnel opening on the front (+Z) and a rope tied to the top that ends in a small round float on a short loop. Slats thick enough to read, gaps between them. Half-submerged look: the flat bottom sits at y = 0.
- Colors: wood slats #8A6A44 with darker gaps #2E2418; frame dark iron #3A3F48 (metallicFactor at most 0.2); rope #E9DCC0; float bright orange #FF8A3D with a cream band #F2E6CB.
- Separate parts: Trap, Rope, Float.
- Longest horizontal dimension 1.0; height about 0.5. Triangles: about 2,500.
```

### 6. Bote hundido

```
Asset: "Bote hundido" (capsized small rowboat, half out of the water). File name: deco-bote-hundido.glb
- Shape: a small rowboat flipped upside down and tilted, bow raised toward +Z, with the curved keel and ribs showing on top, some planks broken at the stern, one oar floating alongside, and a short frayed rope. Flat cut at y = 0 for the waterline. The upturned hull is the main readable shape from above.
- Colors: outer hull planks #6B4A2C and #8A5A34 with a faded stripe #3CD6C0; keel and ribs darker #3B2A1C; broken plank ends pale #C9A878; oar #C9A878; rope #D9CDB4.
- Separate parts: Hull, Oar, Rope.
- Longest horizontal dimension 1.0; height about 0.3. Triangles: about 3,000.
```

---

## Lista de revisión antes de mandármelos

- [ ] El `.glb` tiene el nombre exacto de la tabla.
- [ ] Triángulos dentro del presupuesto (menos de 8,000).
- [ ] El punto más bajo está en y = 0 y el lado más largo mide 1.0 (la boya mide 1.0 de alto).
- [ ] Todos los materiales tienen `metallicFactor` escrito (0.0 salvo metal real, nunca más de 0.2).
- [ ] La luz de la boya es emisiva y está en su propia pieza (`Lamp`).
- [ ] Sin agua, fondo, personas ni animales dentro del archivo.
- [ ] La vista previa se lee bien aun pequeña.

## Si algo sale mal

- **Se ve negro desde algún ángulo**: `Revise every material: metallicFactor must be explicitly 0.0 for wood, rock and rope, and set roughnessFactor. Re-export and show the verification again.`
- **La red se ve como un bloque sólido**: `The net must have clearly open square holes, about 6 by 6 cells, with thick rope bars. Rebuild the grid so you can see through it from above.`
- **Algas demasiado finas**: `Make the seaweed ribbons thicker, at least 3% of the model size, with fewer but bigger strips.`
- **Orientación equivocada**: `Rotate the whole model so the front points toward +Z with +Y up, then re-place the origin at the bottom center and re-run the verification.`


## Nota de integración (v0.10.1)
`deco-rocas` está horneada (`assets/art/deco/`) pero **no se dibuja en la partida**: con las algas largas la silueta parece una criatura (pulpo/araña) y confunde. Para usarla, pedir una versión **sin algas largas** (solo roca gris con musgo bajo y algún percebe), silueta compacta y redondeada, que no tenga nada que parezca patas.
