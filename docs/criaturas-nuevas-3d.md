# Faro en la Tormenta: modelos 3D de las 10 criaturas nuevas

Ya están en el juego, dibujadas por código mientras tanto. Con estos prompts ChatGPT hace sus modelos 3D, y yo los convierto en sprites animados como los demás enemigos.

## Cómo hacerlo

1. Abre un chat nuevo en ChatGPT **por cada criatura**.
2. Pega el **prompt maestro** completo y espera a que responda con la lista de reglas.
3. Pega el **prompt de la criatura**.
4. Revisa la imagen de vista previa y el reporte de verificación (lista de revisión al final).
5. Descarga el `.glb` con el nombre que dice el prompt.
6. Cuando tengas varios, mándamelos en un zip.

Los prompts van en inglés porque ChatGPT es más preciso con términos técnicos de 3D. Si ya tienes un chat con el prompt maestro, puedes hacer varias criaturas en el mismo, una tras otra.

| Mundo | Criatura | Archivo | Qué hace en el juego |
|---|---|---|---|
| Bahía Tranquila | Caballito sanador | `enemigo-caballito.glb` | Cura a las criaturas cercanas desde lejos. |
| Bahía Tranquila | Estrella de mar | `enemigo-estrella.glb` | Al hundirse se parte en dos (el juego usa el mismo modelo, más pequeño). |
| Arrecife Rojo | Langosta acorazada | `enemigo-langosta.glb` | Su caparazón resiste la luz; se rompe con toques o con torretas. |
| Arrecife Rojo | Pez león | `enemigo-pez-leon.glb` | Envenena el faro con sus púas. |
| Mar Helado | Narval | `enemigo-narval.glb` | Apunta y embiste; se aturde si lo tocas mientras apunta. |
| Mar Helado | Foca | `enemigo-foca.glb` | Se sumerge y la luz no la alcanza. |
| Volcán Submarino | Pez ígneo | `enemigo-pez-igneo.glb` | Lanza bolas de fuego desde lejos. |
| Volcán Submarino | Tortuga volcánica | `enemigo-tortuga-volcanica.glb` | Muy resistente; suelta cangrejitos de lava al hundirse. |
| El Abismo | Rape abisal | `enemigo-rape.glb` | Su farolillo debilita la luz del faro. |
| El Abismo | Medusa fantasma | `enemigo-medusa-fantasma.glb` | A ratos se vuelve intangible. |

> El cangrejito de lava usa el modelo del cangrejo teñido de naranja, y la estrella pequeña usa el modelo de la estrella a menor tamaño. No necesitan modelo propio.

---

## Prompt maestro

Pégalo una vez al inicio de cada chat.

```
You are a careful 3D technical artist. Over this chat you will build ONE low-poly game creature for a mobile tower-defense game called "Faro en la Tormenta" (a lighthouse defending itself from sea creatures at night). Build it with Python (trimesh + numpy, and PIL for textures), export it as a single binary .glb file, and let me download it.

FOLLOW EVERY RULE BELOW. Before writing code, reply with a short checklist confirming each rule. After exporting, run the verification step and show me its report.

STYLE
- Stylized, hand-painted, chunky, toy-like. Think readable mobile-game creature, not realistic.
- The camera sees it from ABOVE at about 32 degrees and very small on screen (40 to 80 pixels). So: strong simple silhouette, big readable shapes, exaggerated eyes, saturated colors, clear light/dark contrast. Avoid thin details smaller than 3% of the body size.
- The TOP of the creature matters most (that is what the camera sees). Give the top surface the most color detail.
- Original design only. Do not copy any existing game, film or brand character.

GEOMETRY
- glTF axes: +Y is up. The creature's FRONT (face, eyes, claws) points toward +Z.
- Origin (0,0,0) at the bottom center: the lowest point of the body touches y = 0, centered on X and Z.
- Size: the longest horizontal dimension is exactly 1.0 unit.
- Triangle budget: 2,000 to 6,000 triangles total. Never more than 8,000.
- Closed meshes, all normals pointing OUTWARD, no inverted or duplicated faces. Include a NORMAL attribute on every mesh (smooth shading on round parts, flat on hard parts).

PARTS (for animation)
- Split moving parts into SEPARATE meshes, each one its own node with a clear English name (for example Body, Eye_L, Eye_R, Claw_L, Claw_R, Legs_L, Legs_R, Tail, Tentacles). I will name the exact parts per creature.
- Each moving part's node origin (pivot) must sit at its joint, where it attaches to the body, so rotating the node moves it naturally.

MATERIALS (critical)
- At most 6 materials, each with a descriptive English name.
- EVERY material MUST explicitly set pbrMetallicRoughness.metallicFactor. Use 0.0 for anything organic (shell, skin, eyes, slime). Only real metal may go above 0.0.
- EVERY material MUST explicitly set roughnessFactor between 0.45 and 0.9 (shiny wet parts 0.45, matte shell 0.85).
- Glowing parts (eyes, bioluminescent spots) use emissiveFactor with the glow color, plus the same color as baseColor.
- If you use a texture, embed it inside the .glb (no external files), 512x512 or 1024x1024 PNG, painted with soft hand-painted variation, not flat noise. Vertex colors are also fine.
- Opaque materials only (alphaMode OPAQUE), unless I say a part is translucent.

DO NOT INCLUDE
- No lights, cameras, ground plane, water surface, background, text, logos or animations in the file.

VERIFICATION (run after exporting and show me the output)
1. Reload the .glb with trimesh and print: total triangles, bounding box min/max, list of node names, and for every material its name, metallicFactor, roughnessFactor, emissiveFactor.
2. Confirm: lowest y is 0.0 (within 0.01), longest horizontal size is 1.0 (within 0.02), every metallicFactor is explicitly set, triangles are within budget.
3. Render a preview image from above-front at 32 degrees elevation on a dark blue background so I can check the look.
If any check fails, fix it and run the verification again before giving me the file.

Reply now only with the checklist; I will send the creature description next.
```

---

## Prompts por criatura

### 1. Caballito sanador (Bahía Tranquila)

```
Creature: "Caballito sanador" (healer seahorse), a support enemy that floats back and heals other creatures. File name: enemigo-caballito.glb
- Shape: a chunky upright seahorse leaning forward toward +Z: big rounded head with a long tube snout pointing +Z, curved belly, tail curling into a spiral at the back (-Z). Small fan-shaped back fin. A soft crest of 4 to 5 little frills on top of the head. Because the camera looks from above, make the head, crest and back the most readable parts; the tail spiral should be visible from above.
- Colors: mint green #5FD8A5 body with pale belly #C9FFE6 and darker green #1F7A5A ridges; glowing turquoise spots #7EF0C0 (emissive) along the back like a healing aura; eyes glossy black with a white highlight.
- Separate parts (pivot at the joint): Body, Head, Tail, Fin, Crest.
- Triangles: about 3,000.
```

### 2. Estrella de mar (Bahía Tranquila)

```
Creature: "Estrella de mar" (starfish), splits in two when defeated. File name: enemigo-estrella.glb
- Shape: a thick five-armed starfish lying flat, arms slightly curled up at the tips, one arm pointing toward +Z. Domed center. Rows of round bumps along the top of each arm. Two small cute eyes on the top center near the +Z arm.
- Colors: warm orange #FF9F6B on top with lighter peach #FFD9B3 bumps, darker burnt orange #C2461F underside and edges; eyes glossy black with a white highlight.
- Separate parts (pivot at the joint): Body, Arm_1, Arm_2, Arm_3, Arm_4, Arm_5 (Arm_1 is the one pointing +Z; pivot where each arm meets the center).
- Height: low, about 0.25 tall. Triangles: about 2,500.
```

### 3. Langosta acorazada (Arrecife Rojo)

```
Creature: "Langosta acorazada" (armored lobster), a tank whose shell must be cracked. File name: enemigo-langosta.glb
- Shape: long lobster body, two huge crushing claws held forward toward +Z, segmented tail fanning out at the back (-Z), two long antennae curving forward and outward, four thin legs per side. A thick, plated armor SHELL over the head and back with raised edges and rivet-like bumps: it must look much harder and heavier than the rest of the body.
- Colors: deep crimson body #C23A26, armor shell darker red #6A140B with bright edge highlights #FFC2A8; claws #E0442E with pale tips #FFD2C0; eyes glossy black.
- Separate parts (pivot at the joint): Body, Shell (sits on top of Body; I will hide or crack it in the game), Claw_L, Claw_R, Tail, Legs_L, Legs_R, Antennae.
- Triangles: about 4,500.
```

### 4. Pez león (Arrecife Rojo)

```
Creature: "Pez león" (lionfish), a poisonous enemy. File name: enemigo-pez-leon.glb
- Shape: compact fish swimming toward +Z, with a dramatic crown of long venomous fin spines fanning out on top and to both sides like feathers (this crown is the main silhouette from above, so make it big and readable), fan-shaped side fins, small tail at -Z.
- Colors: bold stripes alternating orange-red #E0582C and cream #FFF1E6 across the body and along every spine; spine tips dark red #8A1F10; eyes glossy black with a white highlight.
- Separate parts (pivot at the joint): Body, Spines (the crown), Fin_L, Fin_R, Tail.
- Keep spines thick enough to read (at least 3% of the body size). Triangles: about 4,000.
```

### 5. Narval (Mar Helado)

```
Creature: "Narval" (narwhal), a charging enemy that rams the lighthouse. File name: enemigo-narval.glb
- Shape: chunky stylized narwhal swimming toward +Z: rounded torpedo body, short side flippers, wide tail flukes at -Z, and a LONG straight spiral tusk pointing forward along +Z (about 40% of the total length, included in the 1.0 size). The tusk is its signature, make it thick and readable.
- Colors: pale blue-grey back #9FB6C6 fading to white belly #F2F8FC, darker grey spots #4C6273 on top; tusk ivory #F5ECD6 with a darker spiral groove #96825F; eyes glossy black.
- Separate parts (pivot at the joint): Body, Tusk, Flipper_L, Flipper_R, Tail.
- Triangles: about 3,000.
```

### 6. Foca (Mar Helado)

```
Creature: "Foca" (seal), a diving enemy. File name: enemigo-foca.glb
- Shape: plump sleek seal swimming toward +Z, round head with big dark eyes and whiskers, front flippers on the sides, rear flippers forming a tail at -Z. Slightly arched back.
- Colors: silver-grey back #8C9EAC with dark speckles #4A5A66, lighter belly #D4DDE4, flippers #6D7F8D; eyes big glossy black with a white highlight; nose dark #2B2B2B.
- Separate parts (pivot at the joint): Body, Head, Flipper_L, Flipper_R, Tail.
- Triangles: about 3,000.
```

### 7. Pez ígneo (Volcán Submarino)

```
Creature: "Pez ígneo" (firefish), a ranged enemy that spits fireballs. File name: enemigo-pez-igneo.glb
- Shape: a round, angry fish swimming toward +Z, big mouth slightly open, spiky dorsal fin shaped like flames, flame-shaped tail at -Z. Its body has cracks that glow from inside like hot coals.
- Colors: body dark charcoal red #8A2A10 with glowing orange-yellow cracks #FF8A3D and a bright core #FFE7A3 (emissive on cracks, mouth and tail); fins flame orange #FF6A1A (emissive); eyes pale yellow #FFF6D0 with a black pupil.
- Separate parts (pivot at the joint): Body, Mouth, Dorsal, Tail.
- Triangles: about 3,000.
```

### 8. Tortuga volcánica (Volcán Submarino)

```
Creature: "Tortuga volcánica" (volcanic turtle), a heavy tank that releases lava crabs when defeated. File name: enemigo-tortuga-volcanica.glb
- Shape: big sea turtle swimming toward +Z whose shell is a small VOLCANO: rough basalt plates rising to a crater on top with glowing lava inside, and a few little lava crabs peeking out of cracks. Four flippers, head forward at +Z.
- Colors: shell black basalt #2A2420 and dark brown #4E3C30, glowing lava #FF7A1A in the crater and cracks (emissive); skin dark grey-brown #5C4E44; eyes glowing orange #FFB35C (emissive).
- Separate parts (pivot at the joint): Shell, Body, Flipper_FL, Flipper_FR, Flipper_BL, Flipper_BR, Head.
- Triangles: about 5,000.
```

### 9. Rape abisal (El Abismo)

```
Creature: "Rape abisal" (abyssal anglerfish), a support enemy whose lure weakens the lighthouse. File name: enemigo-rape.glb
- Shape: round, heavy anglerfish swimming toward +Z with a huge mouth full of needle teeth, small fins, short tail at -Z. A long curved stalk rises from its forehead and hangs a glowing lure bulb in front of the mouth (the lure must be clearly visible from above).
- Colors: dark slate body #232C3B with lighter bumps #4A5A70; teeth bone white #E9EDF2; lure bulb glowing cyan #5EE7FF with a white core (emissive); small eyes pale cyan #B8F7FF (emissive).
- Separate parts (pivot at the joint): Body, Jaw, Lure (stalk + bulb, pivot on the forehead), Fin_L, Fin_R, Tail.
- Triangles: about 4,000.
```

### 10. Medusa fantasma (El Abismo)

```
Creature: "Medusa fantasma" (ghost jelly), a jellyfish that turns intangible. File name: enemigo-medusa-fantasma.glb
- Shape: tall bell-shaped jellyfish with a softly scalloped rim, long trailing ribbon tentacles flowing toward -Z, a glowing heart-like core inside the bell. Slightly eerie face: two hollow glowing eyes on the front of the bell (+Z).
- Colors: pale lavender-white bell #E8E6FF, faint violet edges #9C8CFF, ribbons #CFC8FF; core and eyes glowing pale violet #B9A8FF (emissive). The game makes it transparent by itself, so keep materials OPAQUE.
- Separate parts (pivot at the joint): Bell, Core, Tentacles_Front, Tentacles_Back.
- Triangles: about 3,500.
```

---

## Lista de revisión antes de mandármelo

- [ ] El reporte dice que el punto más bajo está en y = 0 y que el largo mayor es 1.0.
- [ ] Cada material tiene `metallicFactor` escrito (0.0 en todo lo que no sea metal). Si falta, el modelo sale negro.
- [ ] Los nombres de las piezas son exactamente los del prompt (por ejemplo `Claw_L`, no `claw left`).
- [ ] El frente (cara, pinzas, colmillo) mira hacia +Z.
- [ ] En la vista previa se reconoce desde arriba: silueta clara y colores fuertes.
- [ ] Triángulos dentro del rango (2,000 a 6,000).

## Si algo sale mal

Pega la frase que corresponda en el mismo chat:

| Problema | Frase para pegar |
|---|---|
| Sale negro u oscuro | `Set metallicFactor to 0.0 on every non-metal material and export again.` |
| Mira hacia otro lado | `Rotate the model so its face points toward +Z, then re-run the verification.` |
| Muy grande o flotando | `Scale it so the longest horizontal size is exactly 1.0 and move it so the lowest point is at y = 0.` |
| Piezas pegadas en una sola malla | `Split the parts into separate nodes with the exact names I gave, each pivot at its joint.` |
| Se ve plano o sin detalle desde arriba | `Add more color detail and shape to the TOP surface; that is what the game camera sees.` |
| Demasiados triángulos | `Reduce to under 6,000 triangles while keeping the silhouette.` |
