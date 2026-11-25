# Camp Rock

## Status

One candidate generated with the built-in image tool and saved as `candidates/rock-v1.png`. Approval is pending. Keep the approved crate unchanged.

## Renderer measurements

The existing `rock` in `src/frontend/camp/art/decor.js` spans x = -13 to 13 and y = -13 to 4 at size 1: a 26 × 17 scene-unit silhouette, before the separately drawn shadow. Its base anchor is (0, 0). The projection uses 32 × 16 world tiles. Existing rocks scale this silhouette through `d.size`.

The source uses warm gray `#55524a`, light gray `#706b60`, dark gray `#3a3833`, and two small moss marks in `#4a5a2c`. These are palette anchors rather than a requirement for exact generated pixel values.

The following art direction preserves the broad, squat silhouette while adding a few readable facets. Normalized coordinates below are proposed drawing guidance, not source coordinates. Export resolution is separate from intended scene size.

## Reference roles

1. `approved/crate.png`: approved pixel treatment, restrained detail, light direction, and material contrast. Do not reproduce the crate or its wooden structure.
2. `reference/camp.png`: camp camera, subdued woodland palette, and relative prop scale. Do not reproduce the scene, firelight, ground, characters, or interface.

## Generation prompt

Create ONE production candidate: an isolated, squat woodland boulder sprite for the existing isometric pixel-art camp. Output a single transparent PNG with actual alpha. The only visible subject is the rock, including its tiny attached moss accents.

REFERENCE ROLES
Image 1 is the approved wooden crate. Match its deliberate pixel clusters, crisp stepped silhouette, restrained color count, upper-left light direction, and warm muted game-art finish. Change the subject completely to natural stone: no wood grain, planks, braces, metal, or box geometry. Image 2 is the existing camp: use its elevated orthographic viewpoint, warm gray stone family, low prop height, and quiet woodland mood. Do not include anything from the surrounding scene.

SUBJECT AND SILHOUETTE
One solid, low, naturally weathered boulder, wider than tall. Its visible silhouette should have an approximate width-to-height ratio of 26:17, excluding transparent margins. It is a compact uneven mass with a flattened ground contact, an off-center highest point slightly left of center, a gently sloping upper-right shoulder, and a short darker front face. It must read as a single heavy rock at tiny game scale, not a pile of pebbles, mountain, crystal, cube, floating slab, or tall standing stone.

As a composition guide on a conceptual 64 × 64 pixel grid, occupy roughly x=6..58 and y=15..49. Follow a loose irregular contour through (6,43), (8,31), (18,19), (34,15), (48,21), (58,33), (56,45), (40,49), and (18,49). These points describe an organic stepped silhouette; do not draw a diagram, polygon wireframe, or visible construction marks. Keep the lowest edge short, stable, and slightly uneven. Leave generous clear transparent margins without cropping any edge.

CAMERA AND FACETS
Elevated three-quarter orthographic view compatible with a 2:1 isometric camp floor: clearly see the top and two shallow side regions; no perspective convergence or wide-angle lens. The top is broad and gently domed with angular weathered planes rather than a smooth sphere. Establish about five to seven major readable planes: a small upper-left light facet, a broad muted top plane, a midtone left shoulder, a right shoulder slightly darker than the top, a broad dark front plane, and one or two small transition facets. Keep plane boundaries irregular and asymmetric. Do not divide the rock into a uniform triangular mesh. The top occupies most of the mass; the low front face gives it weight.

MATERIAL AND PALETTE
Dry matte warm gray stone with a subtle brown/olive undertone. Anchor the main planes near #55524a, highlights near #706b60, and recessed/front planes near #3a3833. Use a restrained palette of approximately six to nine stone shades, plus two closely related muted olive moss shades near #4a5a2c. Avoid cool blue, purple, bright white, shiny edges, glossy stone, or dramatic orange firelight. Plane lighting should be readable but subdued enough to sit beside the approved crate in a dim camp.

SURFACE DETAIL
Keep broad planes mostly quiet. Add only a few short broken stepped fissures, one or two chipped corners, and sparse small color clusters. Fissures belong within the stone, never as deep black gaps separating it into several pieces. Avoid all-over speckles, gravel texture, sand, tiny random dots, heavy dithering, marble veins, and photographic grain. Add exactly two very small flat moss accents attached near the lower front/left and lower front/right areas, consistent with the source's sparse moss marks. Together they should cover less than five percent of the rock. No grass blades, trailing vines, mushrooms, soil skirt, or detached vegetation.

PIXEL EXECUTION
Hand-authored pixel-art appearance consistent with the approved crate. Use a coherent coarse logical pixel grid with deliberate stair-step edges and clustered color blocks, even if exported at a larger resolution. A source-scale silhouette is only about 26 × 17 scene units: spend detail on mass and plane separation, not microtexture. No blurry edges, smooth vector curves, soft brushwork, photorealism, 3D render polish, ambient haze, or antialiased halo. No thick black cartoon outline; define the lower edge using the darkest stone shade.

LIGHTING AND TRANSPARENCY
Soft neutral light from upper-left: top-left planes lighter, front/lower-right planes darker. Shading is contained inside the rock. No cast shadow, drop shadow, contact-shadow ellipse, ambient floor glow, reflection, ground plane, pedestal, backdrop, or background gradient. Pixels outside the object must be truly transparent, not a painted checkerboard, white background, or dark rectangle. The camp renderer will supply ground shadows and scene lighting later.

DELIVERABLE AND EXCLUSIONS
One centered rock only, complete silhouette, transparent PNG. No sprite sheet, alternate views, variants, reference board, labels, text, watermark, border, frame, interface, scene reconstruction, crate, barrel, or other prop. Prioritize a convincing squat stone silhouette, quiet broad facets, clean pixel clusters, and compatibility with both references.

## Review criteria

- One wide, low rock; broad top and shallow sides remain legible at camp scale.
- Warm gray palette and upper-left lighting agree with the approved crate and camp.
- Sparse attached moss; no ground, cast shadow, or extra objects.
- Crisp pixel clusters, intact silhouette, actual transparent background.
- Save as `candidates/rock-v1.png`; wait for the user before approval or another generation.
