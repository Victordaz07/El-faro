# Faro en la Tormenta: modelos 3D de barcos y objetos de los modos nuevos

Barcos y objetos de Escolta, Travesía y Asedio pirata. Hoy se dibujan por código; con estos prompts ChatGPT hace sus modelos 3D y luego se convierten en sprites, igual que los enemigos.

## Cómo hacerlo

1. Abre un chat nuevo en ChatGPT **por cada modelo** (o reutiliza uno que ya tenga el prompt maestro).
2. Pega el **prompt maestro** completo y espera la lista de reglas.
3. Pega el **prompt del modelo**.
4. Revisa la imagen de vista previa y el reporte de verificación.
5. Descarga el `.glb` con el nombre indicado y mándalos en un zip.

Los prompts van en inglés porque ChatGPT es más preciso con términos de 3D.

| Modo | Modelo | Archivo | Para qué sirve | Tamaño en pantalla |
|---|---|---|---|---|
| Travesía | Barco del jugador | `barco-jugador.glb` | Tu barco; se ve desde atrás y arriba | ~55 px |
| Escolta | Barco de suministros | `barco-suministros.glb` | El barco que debes proteger | ~50 px |
| Asedio | Barco pirata | `barco-pirata.glb` | Dispara cañonazos en arco | ~42 px |
| Asedio | Galeón del Capitán | `barco-capitan.glb` | Jefe del asedio | ~55 px |
| Asedio | Bote abordador | `barco-abordador.glb` | Intenta abordar el faro | ~22 px |
| Travesía | Barril a la deriva | `objeto-barril.glb` | Se toca para mejorar el barco | ~20 px |
| Travesía | Restos de naufragio | `objeto-restos.glb` | Da 2 mejoras | ~24 px |
| Travesía | Cofre | `objeto-cofre.glb` | Da mejora de daño | ~22 px |

---

## Prompt maestro

```
You are a careful 3D technical artist. Over this chat you will build ONE low-poly game asset (a boat or a floating object) for a mobile tower-defense game called "Faro en la Tormenta" (a lighthouse defending itself from sea creatures and pirates at night). Build it with Python (trimesh + numpy, and PIL for textures), export it as a single binary .glb file, and let me download it.

FOLLOW EVERY RULE BELOW. Before writing code, reply with a short checklist confirming each rule. After exporting, run the verification step and show me its report.

STYLE
- Stylized, hand-painted, chunky, toy-like. Readable mobile-game asset, not realistic.
- The camera sees it from ABOVE at about 32 degrees and very small on screen (20 to 60 pixels). So: strong simple silhouette, big readable shapes, saturated colors, clear light/dark contrast. Avoid thin details smaller than 3% of the asset size (masts, ropes and oars must be at least that thick).
- The TOP of the asset matters most (deck, sails from above, lid). Give the top surfaces the most color detail.
- Original design only. Do not copy any existing game, film or brand.

GEOMETRY
- glTF axes: +Y is up. The FRONT (bow of a boat, or the main face of an object) points toward +Z.
- Origin (0,0,0) at the bottom center: the lowest point touches y = 0, centered on X and Z.
- BOATS: model only the part above the waterline. The hull bottom is flat and sits at y = 0 (no underwater keel, no water).
- Size: the longest horizontal dimension is exactly 1.0 unit.
- Triangle budget: 2,000 to 6,500 triangles total. Never more than 8,000.
- Closed meshes, all normals pointing OUTWARD, no inverted or duplicated faces. Include a NORMAL attribute on every mesh (smooth shading on round parts, flat on planks and boxes).

PARTS (for animation)
- Split moving parts into SEPARATE meshes, each one its own node with a clear English name (I will name the exact parts per asset).
- Each moving part's node origin (pivot) must sit at its joint (where it attaches), so rotating the node moves it naturally.

MATERIALS (critical)
- At most 6 materials, each with a descriptive English name.
- EVERY material MUST explicitly set pbrMetallicRoughness.metallicFactor. Use 0.0 for wood, cloth, rope and anything organic. Only real metal (cannons, chest bands) may go above 0.0, and never above 0.3.
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

---

## Prompts por modelo

### 1. Barco del jugador (Travesía)

```
Asset: "Barco del jugador" (player's small sailing ship). File name: barco-jugador.glb
- Shape: a sturdy little wooden sailing ship with a rounded bow pointing +Z, wide deck, one tall mast in the middle with one big square sail, a small stern cabin at the back (-Z) with a lantern hanging on a short post. The game shows it mostly from behind and above, so the sail, the deck with stacked crates and the lantern must read clearly from that angle. Friendly and heroic, not menacing.
- Colors: hull warm brown #8A5A34 with darker planks #5A3A22 and a thin cream stripe #E9DCC0 along the rail; sail cream #EFE6D2 with one turquoise stripe #3CD6C0 across the middle; deck lighter wood #B08A52; small crates #C49A5C; lantern warm yellow #FFE27A (emissive).
- Separate parts (pivot at the joint): Hull, Mast, Sail (pivot at the top of the mast), Flag (small turquoise pennant at the mast top), Lantern (glowing), Cargo (crates and barrels on the deck).
- Triangles: about 4,500.
```

### 2. Barco de suministros (Escolta)

```
Asset: "Barco de suministros" (supply ship the player must protect). File name: barco-suministros.glb
- Shape: a wide, round-bellied merchant ship, slow and heavy, bow pointing +Z. One mast with a big cream sail, a raised stern. The deck is piled with cargo so it reads as "full of supplies": wooden crates, round barrels and cloth sacks, with a bright green cross-marked crate on top to suggest food and medicine. Peaceful look, no weapons.
- Colors: hull warm brown #9A6A3C with darker keel line #5A3A22; sail cream #EFE6D2 with a small green patch #35E0B0; crates #C49A5C and #B08A52; barrels #7A5434 with dark bands #3B2A1C; sacks off-white #E9DCC0; green cross crate #35E0B0.
- Separate parts (pivot at the joint): Hull, Mast, Sail (pivot at the top of the mast), Cargo (all crates, barrels and sacks as one mesh), Flag.
- Triangles: about 5,000.
```

### 3. Barco pirata (Asedio)

```
Asset: "Barco pirata" (pirate ship that fires cannonballs). File name: barco-pirata.glb
- Shape: a lean, fast two-masted pirate sloop, sharp bow pointing +Z, two cannons visible on each side of the deck and hull. Two dark square sails, the main one with a simple original skull-and-crossed-bones emblem painted on it, readable from above. Menacing but toy-like and chunky.
- Colors: hull very dark brown #3B2A1C with lighter deck #6B4A2C; sails charcoal #26262E with off-white emblem #E9E4D6; cannons iron #15181D; a small red pennant #C0392B at the top of the front mast.
- Separate parts (pivot at the joint): Hull, Sail_Fore, Sail_Main, Cannons, Flag.
- Triangles: about 4,500.
```

### 4. Galeón del Capitán (Asedio, jefe)

```
Asset: "Galeón del Capitán" (pirate captain's galleon, the boss of the siege). File name: barco-capitan.glb
- Shape: a big, intimidating three-masted galleon, bow pointing +Z with a carved beak, tall raised stern castle at the back (-Z), three cannons per side. Three large dark sails; the center one has a bigger original skull emblem. A long red pennant flies from the stern. It should look clearly bigger and more dangerous than a normal pirate sloop, with a strong silhouette from above.
- Colors: hull very dark #2A1D14 with deck #5A3C22 and thin gold-brown trim #8A6A2C; sails #1B1B22 with off-white emblem #E9E4D6; cannons iron #15181D; red pennant #C0392B; two small lanterns on the stern, warm orange #FFB35C (emissive).
- Separate parts (pivot at the joint): Hull, Sail_1, Sail_2, Sail_3, Cannons, Pennant, Lantern_L, Lantern_R.
- Triangles: about 6,000.
```

### 5. Bote abordador (Asedio)

```
Asset: "Bote abordador" (small boarding rowboat). File name: barco-abordador.glb
- Shape: a small narrow rowboat, pointed bow toward +Z, with two crew members as simple chunky figures (round heads with red bandanas, no faces needed besides two dark dots for eyes) seated on benches, and four oars (two per side) sticking out diagonally and slightly backward. A small red lantern at the bow. It is tiny on screen (about 22 pixels), so exaggerate the oars and the red bandanas.
- Colors: hull warm brown #7A5434 with lighter inside #A0764A; oars pale wood #C9A878; crew skin #E0B48A, clothes dark #2B2B33, bandanas red #C0392B; lantern red #FF5C4A (emissive).
- Separate parts (pivot at the joint): Hull, Crew (both figures as one mesh), Oar_L1, Oar_L2, Oar_R1, Oar_R2 (pivot at each oarlock on the side of the hull), Lantern.
- Triangles: about 3,000.
```

### 6. Barril a la deriva (Travesía)

```
Asset: "Barril a la deriva" (floating barrel pickup). File name: objeto-barril.glb
- Shape: a chunky wooden barrel lying on its side, slightly tilted, with a little rope loop on one end and a few broken plank splinters stuck to it, as if it floated away from a wreck. Slightly dented. Longest dimension is the barrel length.
- Colors: wood #8A5A30 with lighter top highlights #B07A44; three dark iron bands #3B2A1C; rope #D9CDB4; end caps #6B4A2C.
- Separate parts: Barrel (one mesh with the bands), Rope.
- Triangles: about 1,800.
```

### 7. Restos de naufragio (Travesía)

```
Asset: "Restos de naufragio" (shipwreck debris pickup). File name: objeto-restos.glb
- Shape: a small floating pile of wreckage: two or three crossed broken planks, a piece of torn cream sail cloth draped over them, and a small crate tied on with rope. Flat and wide so it reads as drifting debris from above, with jagged broken plank ends.
- Colors: planks #6B4A2C and #8A5A30 with pale broken ends #C9A878; sail cloth #D9CDB4 with a darker tear edge #A89A7C; crate #B08A52; rope #E9DCC0.
- Separate parts: Planks, Cloth, Crate.
- Height: low, about 0.3 tall. Triangles: about 2,200.
```

### 8. Cofre del tesoro (Travesía)

```
Asset: "Cofre del tesoro" (treasure chest pickup, the best one). File name: objeto-cofre.glb
- Shape: a chunky wooden treasure chest with a rounded lid, iron corner plates and a big golden lock on the front (+Z). The lid is slightly ajar (a thin gap) and a soft golden glow shape shines out of the gap. A couple of gold coins stick out of the gap.
- Colors: wood #7A4A22 with darker planks #5A3516; iron bands #4A4F58; lock and coins gold #FFD27A (emissive, glowing); glow inside the gap #FFE9A8 (emissive).
- Separate parts (pivot at the joint): Body, Lid (pivot at the back hinge), Coins, Glow.
- Triangles: about 2,200.
```

---

## Lista de revisión antes de mandármelos

- [ ] El `.glb` tiene el nombre exacto de la tabla.
- [ ] Triángulos dentro del presupuesto (menos de 8,000).
- [ ] El punto más bajo está en y = 0 y el lado más largo mide 1.0.
- [ ] Todos los materiales tienen `metallicFactor` escrito (0.0 salvo metal real).
- [ ] La proa o cara principal mira hacia +Z.
- [ ] Las piezas móviles tienen los nombres pedidos y su pivote en la articulación.
- [ ] La vista previa se lee bien aun pequeña: velas, cañones y remos se distinguen.
- [ ] Barcos: casco plano abajo, sin quilla ni agua.

## Si algo sale mal

- **Se ve negro desde algún ángulo** (error ya visto con el faro): `Revise every material: metallicFactor must be explicitly 0.0 for wood and cloth, and set roughnessFactor. Re-export and show the verification again.`
- **Piezas mezcladas en un solo bloque**: `The parts Hull, Sail and Mast are fused into one mesh. Split them into separate nodes with the exact names I gave, with pivots at the joints.`
- **Muy detallado o pesado**: `Reduce to about N triangles by simplifying small details, keeping the silhouette and the named parts.`
- **Orientación equivocada**: `Rotate the whole model so the bow points toward +Z with +Y up, then re-place the origin at the bottom center and re-run the verification.`
