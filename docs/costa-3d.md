# Faro en la Tormenta: modelos 3D del Modo Costa

Muralla, hueco y armas del Modo Costa. Hoy se dibujan por código (`drawCostaBase`, `drawSlot`, `drawWeapon` en render.ts); con estos prompts ChatGPT hace los modelos y se convierten en sprites igual que las torretas de la fase 2.

## Cómo hacerlo

1. Chat nuevo en ChatGPT **por cada modelo**, pega el **prompt maestro**, espera el checklist.
2. Pega el **prompt del modelo**, revisa la vista previa y el reporte.
3. Descarga el `.glb` con el nombre indicado y mándalos en un zip.

Prompts en inglés (ChatGPT es más preciso con 3D). Los de arma van **igual que las torretas del faro**: base fija + cabeza que gira (el juego la renderiza en 16 direcciones × 4 cuadros: 0 = reposo, 1-3 = disparo/retroceso).

| Modelo | Archivo | Qué es | Tamaño en pantalla |
|---|---|---|---|
| Tramo de muralla | `costa-muralla.glb` | Pieza que se repite a lo ancho (cara hacia nosotros + pasillo + almenas) | ~52 px de ancho |
| Base del hueco | `costa-hueco.glb` | Plataforma de piedra donde se monta cada arma | ~36 px |
| Cañón | `arma-canon.glb` | Hueco nivel 1; sube de nivel 1-6 | ~34 px |
| Ballesta | `arma-ballesta.glb` | Dispara rápido, 2 virotes desde nivel 3 | ~34 px |
| Mortero | `arma-mortero.glb` | Bomba en arco, área | ~34 px |
| Luz de costa | `arma-luz.glb` | Torre baja con lámpara; el haz lo dibuja el juego | ~30 px |
| Antorcha | `costa-antorcha.glb` | Se repite entre huecos (la llama la anima el juego) | ~14 px |

Las armas se ven **desde atrás y arriba** (estamos del lado de tierra mirando al mar), con la cámara a ~32°. El frente (+Z) es hacia donde apunta el arma en reposo.

---

## Prompt maestro

```
You are a careful 3D technical artist. Over this chat you will build ONE low-poly game asset (a part of a coastal stone fort wall, or a weapon mounted on it) for a mobile tower-defense game called "Faro en la Tormenta" (a lighthouse defending itself from sea creatures and pirates at night). Build it with Python (trimesh + numpy, and PIL for textures), export it as a single binary .glb file, and let me download it.

FOLLOW EVERY RULE BELOW. Before writing code, reply with a short checklist confirming each rule. After exporting, run the verification step and show me its report.

STYLE
- Stylized, hand-painted, chunky, toy-like. Readable mobile-game asset, not realistic.
- The camera sees it from ABOVE at about 32 degrees and very small on screen (20 to 60 pixels). So: strong simple silhouette, big readable shapes, saturated colors, clear light/dark contrast. Avoid thin details smaller than 3% of the asset size (masts, ropes and oars must be at least that thick).
- The TOP of the asset matters most (deck, sails from above, lid). Give the top surfaces the most color detail.
- Original design only. Do not copy any existing game, film or brand.

GEOMETRY
- glTF axes: +Y is up. The FRONT (bow of a boat, or the main face of an object) points toward +Z.
- Origin (0,0,0) at the bottom center: the lowest point touches y = 0, centered on X and Z.
- Wall pieces and weapons sit on a flat bottom at y = 0 (no ground, no water).
- Size: the longest horizontal dimension is exactly 1.0 unit.
- Triangle budget: 2,000 to 6,500 triangles total. Never more than 8,000.
- Closed meshes, all normals pointing OUTWARD, no inverted or duplicated faces. Include a NORMAL attribute on every mesh (smooth shading on round parts, flat on planks and boxes).

PARTS (for animation)
- Split moving parts into SEPARATE meshes, each one its own node with a clear English name (I will name the exact parts per asset).
- Each moving part's node origin (pivot) must sit at its joint (where it attaches), so rotating the node moves it naturally.

MATERIALS (critical)
- At most 6 materials, each with a descriptive English name.
- EVERY material MUST explicitly set pbrMetallicRoughness.metallicFactor. Use 0.0 for wood, cloth, rope and anything organic. Only real metal (cannon barrels, crossbow fittings) may go above 0.0, and never above 0.3.
- EVERY material MUST explicitly set roughnessFactor between 0.45 and 0.9 (wood 0.8, cloth 0.9, metal 0.5).
- Glowing parts (lanterns, gold shine) use emissiveFactor with the glow color, plus the same color as baseColor.
- If you use a texture, embed it inside the .glb (no external files), 512x512 or 1024x1024 PNG, with soft hand-painted wood grain and cloth variation, not flat noise. Vertex colors are also fine.
- Opaque materials only (alphaMode OPAQUE). Sails are solid thin shells, double-thickness, not transparent.

DO NOT INCLUDE
- No lights, cameras, ground plane, water surface, background, text, logos or animations in the file.
- No people unless I ask for them.

VERIFICATION (run after exporting and show me the output)
1. Reload the .glb with trimesh and print: total triangles, bounding box min/max, list of node names, and for every material its name, metallicFactor, roughnessFactor, emissiveFactor.
2. Confirm: lowest y is 0.0 (within 0.01), longest horizontal size is 1.0 (within 0.02), every metallicFactor is explicitly set, triangles are within budget.
3. Render a preview image from above-front at 32 degrees elevation on a dark blue background so I can check the look.
If any check fails, fix it and run the verification again before giving me the file.

Reply now only with the checklist; I will send the asset description next.
```

Notas para todos los prompts: no incluir agua, suelo ni personas; la paleta general es piedra gris azulada (`#6b717e`-`#a3aab8`), madera cálida (`#7a5230`), hierro oscuro (`#3b414d`) y un acento turquesa (`#3fd7c4`) solo en detalles pequeños.

---

## Prompts por modelo

### 1. Tramo de muralla (`costa-muralla.glb`)

```
Asset: costa-muralla.glb - ONE modular segment of a coastal stone fort wall that repeats left to right.
Size: width (X) exactly 1.0 unit; depth (Z) about 0.55; height (Y) about 0.35. Origin at bottom center. FRONT (+Z) is the SEA side.
Design: chunky blue-grey stone blocks. The sea side has a crenellated parapet (3 merlons with gaps) along the top front edge. A flat walkway on top, wide enough to mount weapons (about 60% of the depth). The land-side face (-Z) is a plain block wall with two buttress pillars at the left and right ends. Left and right faces must be flat and identical so copies tile seamlessly with no gap.
Materials (max 4): light stone top, mid stone sides, dark mortar lines (painted, not geometry), moss green tiny accents.
Parts: single mesh "Wall" only, no moving parts.
Triangle budget: 800 to 2,000.
```

### 2. Base del hueco (`costa-hueco.glb`)

```
Asset: costa-hueco.glb - a round stone platform (weapon emplacement) set into the wall walkway.
Size: diameter exactly 1.0 unit, height about 0.18. Origin at bottom center. 
Design: low octagonal stone dais with a slightly raised rim and a shallow recessed center, a few worn blocks, small iron ring bolts at 4 points around the rim.
Materials (max 3): stone, darker stone recess, dark iron.
Parts: single mesh "Dais". Triangle budget: 500 to 1,200.
```

### 3. Cañón (`arma-canon.glb`)

```
Asset: arma-canon.glb - a heavy iron cannon on a wooden carriage, level-1 version.
Size: longest dimension 1.0 unit (barrel length). Origin at bottom center of the carriage. FRONT (+Z) is the muzzle direction.
Parts (separate nodes, English names, pivots at the joint):
- "Base": the wooden carriage with two thick wheels, fixed.
- "Head": the swivel mount that rotates around the Y axis at the center of the Base.
- "Barrel": child of Head, the iron barrel with a reinforced muzzle ring and a cascabel knob at the back; pivot at the trunnions so it can recoil backward along -Z.
Design: chunky, a bit oversized barrel (toy-like), dark iron with a lighter muzzle ring, warm wood carriage with iron bands.
Materials (max 5): dark iron (metallic 0.25), light iron, wood, dark wood, a small orange accent for the fuse hole.
Triangle budget: 2,000 to 4,500.
```

### 4. Ballesta (`arma-ballesta.glb`)

```
Asset: arma-ballesta.glb - a large fixed-post siege crossbow (ballista) with a loaded bolt.
Size: longest dimension 1.0 unit (bow width). Origin at bottom center of the post. FRONT (+Z) is the firing direction.
Parts: "Base" (wooden post and tripod, fixed), "Head" (rotates around Y, holds the stock), "Bow" (child of Head; the two curved limbs with a visible string as a thin double-sided strip, pivot at the center so it can flex), "Bolt" (child of Head; a long bolt with a metal tip lying in the groove, pivot at its center).
Design: chunky warm wood with dark iron fittings and a pale cord string, bolt tip silver. Limbs must be thick (at least 4% of the size).
Materials (max 5): wood, dark wood, iron (metallic 0.2), cord, bolt metal.
Triangle budget: 1,800 to 4,000.
```

### 5. Mortero (`arma-mortero.glb`)

```
Asset: arma-mortero.glb - a short squat mortar pointing up at about 55 degrees.
Size: longest dimension 1.0 unit. Origin at bottom center of the base plate. FRONT (+Z) is the firing direction.
Parts: "Base" (square iron-bound wooden plate, fixed), "Head" (rotates around Y), "Tube" (child of Head, the fat short barrel tilted 55 degrees up, with a glowing orange rim; pivot at the bottom so it can recoil downward).
Design: very chunky and stubby, dark bronze-brown barrel with two thick iron rings and a bright orange glowing muzzle rim (emissive).
Materials (max 5): wood, iron (metallic 0.25), bronze, orange emissive rim, dark interior of the tube.
Triangle budget: 1,500 to 3,500.
```

### 6. Luz de costa (`arma-luz.glb`)

```
Asset: arma-luz.glb - a low stone coastal light tower with a big lantern on top.
Size: height exactly 1.0 unit, width about 0.5. Origin at bottom center. FRONT (+Z) is where the light points.
Parts: "Tower" (fixed round stone tower with a small base ledge and an iron gallery ring), "Lamp" (child; the lantern room with a glowing warm-yellow glass sphere, emissive, and a reflector hood on the +Z side; pivot at the center of the lantern, rotates around Y), "Roof" (small conical cap on top, fixed).
Design: stone body blue-grey, iron ring dark, lantern glass bright warm yellow (#ffe9a8) emissive, roof dark slate with a tiny turquoise ornament.
Materials (max 5): stone, dark stone, iron, glowing lamp glass, slate roof.
Triangle budget: 1,200 to 3,000.
```

### 7. Antorcha (`costa-antorcha.glb`)

```
Asset: costa-antorcha.glb - a wall torch on a short iron post (the game draws the flame itself, so DO NOT model fire).
Size: height exactly 1.0 unit, width about 0.3. Origin at bottom center.
Design: a short wooden post with an iron bracket and an empty iron cup on top holding a charred wrapped bundle (dark brown); a small warm emissive ember dot at the top of the bundle.
Materials (max 3): wood, iron, charred cloth plus ember (emissive).
Parts: single mesh "Torch". Triangle budget: 300 to 800.
```

---

## Cuando lleguen

Pasar los `.glb` a `assets/models/` y avisar: se hornean con `tools/glb-sprite/` (nuevo `bake-costa.py` + entradas en `ANIM` de `sheet.js`: retroceso de `Barrel`/`Tube`, flexión de `Bow`, giro de `Lamp`), se cargan desde `art.ts` y `drawCostaBase/Front` dibujan el sprite si existe y el código si no.
