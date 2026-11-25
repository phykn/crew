# Wooden Crate Pilot

## Production strategy

Settle the silhouette, construction, palette, and actual display scale before another generation request. Use one carefully specified crate as the visual standard for the next prop.

The current renderer places three crates in a stack. Generate a single reusable crate, then assemble the existing stack in code. This keeps each contact point and overlap controllable.

Use the existing camp capture as the primary reference. The user selected the image generated from the detailed prompt below. The approved asset is `approved/crate.png`.

Review the prompt before requesting another image.

## Measurements from the current renderer

The camp projection uses a 32 × 16 diamond for one world tile. Each current crate has a 0.6 × 0.6 tile footprint and a vertical height of 10 scene units.

Its projected top is approximately 19.2 scene units wide and 9.6 units deep. The full body is approximately 19.6 units high before outlines and lighting. These are scene-space dimensions. The final screen dimensions depend on the camp camera scale.

Use those proportions to judge a generated candidate. Export resolution and in-scene display size are separate values.

The current palette provides these material references.

| Surface | Existing color |
| --- | --- |
| Top wood | `#6b4a2c` |
| Left wood | `#4a321d` |
| Right wood and frame definition | `#3d2918` |
| Iron | `#3a3834` |

Treat these as color-family anchors. Allow a restrained increase in readability while keeping the finished sprite compatible with the dim woodland camp.

## Reference inputs

- `reference/camp.png` supplies the current scene, view angle, relative scale, and surrounding materials. Its firelight is a scene effect.
- An enlarged crop of an existing crate should accompany the camp reference in the next request.
- `approved/crate.png` is the selected crate asset and the style reference for subsequent props.

## Proposed generation prompt

Create one original wooden supply crate sprite for the existing pixel-art woodland camp shown in the attached reference. The output will become a reusable object texture in a PixiJS scene.

### Object and construction

Show one closed square wooden crate in an elevated orthographic view. Show its top and two side faces. Give it a compact, sturdy silhouette with ordinary timber proportions and a recognizable box volume.

Build each visible side from three broad horizontal planks inside a narrow timber frame. Use slim vertical corner posts and slim upper and lower rails. Keep the frame close to the plank surface so the object reads as a practical shipping crate.

Add one diagonal wooden brace to the left visible face, running from its upper-left region toward its lower-right region. Fit both ends into that face's frame. The brace follows the face plane and has consistent physical thickness.

Build the closed top from three simple boards. Keep the lid flush with the side walls. Use small, dark, square nail marks at a few structural joints.

### Projection and proportions

Use an exact 2-to-1 isometric ground diamond. All ground-plane edges follow consistent slopes of one vertical unit for every two horizontal units. Vertical edges remain vertical. Parallel edges retain the same slope.

Make the left and right visible faces equally wide. The top diamond is half as tall as it is wide. The vertical side-wall height is approximately half the full object width. Consequently, the complete silhouette is approximately as tall as it is wide.

Use this normalized 64 × 64 construction guide to establish the volume. Coordinates refer to the logical pixel canvas, with x increasing rightward and y increasing downward.

| Vertex | x | y |
| --- | --- | --- |
| Rear top corner | 32 | 8 |
| Right top corner | 56 | 20 |
| Front top corner | 32 | 32 |
| Left top corner | 8 | 20 |
| Right ground corner | 56 | 45 |
| Front ground corner | 32 | 57 |
| Left ground corner | 8 | 45 |

Connect the four top vertices into a closed diamond. Connect each visible top corner straight down to its corresponding ground corner. Use the resulting planes for every plank, rail, brace, and nail. Retain the guide's proportions when exporting at a larger resolution.

### Pixel language

Draw as a deliberately authored low-resolution game sprite on one consistent square-pixel grid. Keep silhouette diagonals in a regular two-across, one-down staircase rhythm.

Use broad, stable color clusters. Let the silhouette and three main planes explain the volume first. Let the frame and brace explain the construction next. Reserve small accents for the final layer of detail.

Keep the contour approximately one logical pixel thick. Use a lighter outline only where a lit edge needs separation. Leave most plank surfaces calm. Add a few short grain marks aligned with the length of their boards. Keep each mark several logical pixels away from its neighbors.

At a small display size, the top, two side faces, frame, and brace should remain individually readable. Texture should support that structure.

### Materials and palette

Use weathered walnut-brown wood with muted tan edge accents. Reference the camp's wood colors around #6b4a2c, #4a321d, and #3d2918. Use charcoal iron around #3a3834 for nail heads.

Limit the sprite to a small, coordinated palette of roughly eight to twelve opaque colors. Give the top a moderately lighter value, the left face a medium value, and the right face a darker value.

Suggest age with a few subdued edge chips and small variations between boards. Keep the timber structurally straight and sound.

### Lighting

Use restrained local surface shading that preserves the separation of the three planes. Keep highlights subdued.

The camp renderer will add location-dependent firelight, cast shadows, and atmospheric effects. Leave external glow, cast shadows, and surrounding illumination to that renderer.

### Canvas and transparency

Place the complete crate silhouette inside a square transparent canvas with clear padding on every side. Preserve the shape's ground-contact vertices. Use true alpha transparency outside the object.

Keep opaque interior wood surfaces. Keep boundary pixels crisp. Export the enlarged artwork with consistent square pixel blocks so a later pixel-grid cleanup can recover the intended logical sprite.

Deliver exactly one standalone crate asset.

### Exclusions

Exclude scenery, ground tiles, other crates, characters, labels, lettering, logos, watermarks, decorative icons, and framing graphics.

Exclude perspective convergence, bulging boards, warped corners, overhanging lid slabs, oversized bevels, smooth painted gradients, gloss, lens effects, dense scratches, and randomly sized pixel clusters.

## Acceptance checks

1. Compare the top diamond and vertical sides with the construction guide.
2. Check the silhouette at the current renderer's display scale.
3. Check that the brace sits within one face and that all timber follows the same projection.
4. Inspect alpha edges against light and dark backgrounds.
5. Check readability beside the current barrels and tents.
6. Record the actual exported dimensions and ground anchor after inspection.
7. Assemble three instances in the existing stack to check overlaps during integration.

Image generation may approximate coordinates and pixel grids. Verify them on the actual output before declaring the sprite ready for integration.

## Current status

The user approved `approved/crate.png`. Earlier candidates and duplicate generated originals were deleted at the user’s request. Generate further images only when the user explicitly requests generation.
