# Camp Asset Upgrade

## Goal

Create reusable image assets that replace the camp's procedurally drawn artwork within its existing composition. Use the current scene as the placement and scale reference. Deliver each element as an individual asset that Claude Code can connect to its existing scene object.

## Existing implementation

- `src/frontend/camp/layout.js` defines object positions, footprints, obstacle radii, bench seats, tents, and the surrounding forest.
- `src/frontend/camp/projection.js` defines the scene projection.
- `src/frontend/camp/art/props.js` draws static objects.
- `src/frontend/camp/art/ground.js` draws the ground.
- `src/frontend/camp/art/sprites.js` builds character poses from appearance parts. Its current base character canvas is 16 × 26 pixels.
- `src/frontend/camp/stage/scene.ts` assembles baked textures and sorts objects by depth.
- `src/frontend/camp/stage/people.ts` animates character sprites.
- `src/frontend/camp/stage/light.ts` and `effects.ts` handle scene lighting and animated effects.

## Asset groups

| Group | Elements | Delivery |
| --- | --- | --- |
| Small props | Crates, barrels, rocks, logs, firewood, hay | One transparent PNG per object or variant |
| Plants | Pines, ferns, grass tufts | Transparent PNGs with consistent ground anchors |
| Structures | Tents, well, wagon | Transparent PNGs matching their existing footprint and facing |
| Seating | Bench orientations and material variants | Transparent PNGs aligned to existing seat positions |
| Ground | Dirt, grass, worn paths and their transitions | Repeatable textures and edge masks suited to the existing ground renderer |
| Characters | Existing appearance parts and supported poses | Aligned sprite frames or sheets that retain appearance customization |
| Animated objects | Campfire, torches, lanterns | Separate base artwork and animation frames where the renderer needs them |

Inventory the actual renderer inputs before making every variant. Some instances reuse the same artwork at different scales.

## Shared visual contract

Use an original, coherent pixel-art style that fits the current elevated camp view. Establish the palette, pixel density, material treatment, and outline weight with the first approved prop.

For each asset, record its source canvas dimensions, visible bounds, in-scene display dimensions, ground-contact anchor, facing, and world footprint. Measure these from the current renderer before choosing export sizes. Preview every candidate at its actual display size.

Export isolated objects with a true transparent background and clean alpha edges. Keep the full silhouette inside the canvas. Ground textures should fill their intended tile or mask area.

Keep lighting treatment consistent with the renderer. Generate readable base materials with restrained shading and let the scene apply its firelight, haze, and cast shadows. During integration, check the existing drawing routines for embedded shadows to avoid applying them twice.

Align every animation frame to the same canvas and ground anchor. Character frames must share a stable foot position. Preserve the distinction between visual bounds, collision footprints, and seating coordinates.

## Production sequence

### 1. Capture and measure

Capture the existing camp and enlarged crops of its objects. Record projection, display scale, palette, ground anchors, and relevant dimensions. Store these references in `reference/`.

### 2. Make one pilot prop

Start with a crate because it is static, compact, and has a recognizable footprint. Generate one transparent PNG using the existing crate crop as a reference. Save candidates in `candidates/` and the selected export in `approved/`.

Judge the result inside a crop of the current camp at actual scale. Confirm the silhouette, perspective, material detail, and pixel density before extending the style to other objects.

### 3. Produce static assets in batches

Create small props first, then vegetation, structures, and seating. Reuse the approved pilot and relevant existing object crops as visual references in every generation request.

Review each batch together for consistent scale and perspective. Check bench art against seat coordinates and tree art against character visibility.

### 4. Produce ground and animated assets

Derive ground textures from the approved palette and test repeat seams and transition edges. Review them under the scene's lighting.

For characters, inventory the current appearance parts, poses, facing behavior, and role colors before deciding sheet layouts. Review frame alignment and character identity across poses. Make fire and torch frames independently from the supporting object artwork.

### 5. Integrate through Claude Code

Give Claude Code the approved images, their dimensions and anchor specifications, the reference crops, and the existing source files listed above.

Replace each object's artwork at its current world position. Connect texture bounds and anchors to the existing projection and depth sorting. Carry forward obstacle radii, bench seats, movement, labels, and role customization through the replacement.

Integrate the pilot first, then review each asset batch in the running app before proceeding to the next batch.

## Generation brief template

For each image request, specify the existing object being replaced, attach its crop and the approved style reference, and state the required facing, silhouette, proportions, palette, pixel treatment, canvas dimensions, transparency, and lighting treatment.

Request a single isolated object per export. For animation, specify the exact poses, frame order, shared dimensions, and shared anchor. Check generated frames individually before assembling the sheet.

## Review criteria

- The asset fits its existing position and footprint at actual display size.
- Perspective and pixel density agree across neighboring objects.
- Alpha edges remain clean against both bright and dark ground.
- Materials remain readable under the current lighting.
- Depth sorting works as characters move behind and in front of objects.
- Seated characters meet the bench surface.
- Animation frames hold their anchors without visible jitter.
- Names, status labels, and selection indicators remain readable.
- Texture loading and reuse fit the existing scene lifecycle.

## Working files

Keep this plan and image working files together under `graphics/`: prop references and briefs in `props/`, character work in `characters/`. Record the selected filename, dimensions, anchor, and renderer mapping alongside each approved batch.

The first deliverable is this plan. Image generation follows once the asset direction and pilot brief are agreed.
