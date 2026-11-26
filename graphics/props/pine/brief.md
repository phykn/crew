# Pine Tree

## Status

One candidate generated with the built-in image tool; approval pending. Output: `pine.png`.

## Renderer measurements

`pine` at size=1 draws a trunk about 4 × 10 scene units and three stepped foliage tiers. Tier heights are 20; their starting heights are 28, 42, and 56 units above the base, and half-width parameters are 16, 12, and 8. Source maximum lower canopy width is about 32 and total height about 56 scene units. Instances scale through d.size. Palette: leaf #33402a, leafDark #212b1b, barkDark #281c12. Ground anchor: center of the exposed trunk foot. The generated foliage can add natural branch clumps while retaining three main tiers.

## Generation prompt

Create one complete small woodland pine tree sprite for the camp forest, with a single visible trunk and three major layered evergreen foliage tiers. It must match the same quiet pixel-art world as the crate and rock rather than a realistic botanical illustration.

SILHOUETTE
Upright conifer about 56 scene units tall and 32 wide at its widest lower tier: tall but compact, slightly asymmetric, with a small pointed crown, a medium middle skirt, and a broad lower skirt. Three major foliage tiers overlap naturally; they are not three detached perfect triangles. Use small stepped branch projections and a few shallow notches to suggest downward hanging pine boughs while keeping the outer silhouette coherent and readable. Avoid a smooth cone, Christmas-tree icon, lollipop shape, perfectly mirrored zigzag, fluffy round bush, or elaborate bare branches extending beyond the canopy.

VIEW AND MASS
Elevated orthographic camp view. Show modest top-facing branch planes along the upper-left of each tier; darker underside pockets create depth beneath the skirts. Foliage is a volumetric conifer crown around one vertical trunk, not a flat symmetrical symbol. The bottom skirt leaves a short dark trunk visible, about 10 scene units high; the trunk ends in a simple narrow stable foot. No root disk, soil clump, grass skirt, or sprawling exposed roots. Keep the entire crown and trunk within clear transparent margins.

PALETTE AND DETAIL
Very restrained forest greens: main #33402a, deep shadow #212b1b, a little muted lighter olive for upper-left branch clusters. Dark brown trunk near #281c12 with one subdued brown edge. Prefer about six to nine foliage values grouped into broad deliberate clusters. The camp is dim woodland: no electric green, teal, blue spruce, yellow glow, snow, fruit, cones rendered as ornaments, flowers, lights, or decorations. Suggest needles through grouped short stepped tips, not thousands of individual hairlines or random dots. Keep the three large tiers stronger than the small texture.

SCALE AND ISOLATION
This is reusable small scenery, approximately 32 by 56 source scene units before instance scaling. Preserve a clear ground anchor at the trunk foot and quiet detail density when reduced. No neighboring trees, forest background, horizon, rocks, fog, fallen needles, ground shadow, or atmosphere. Transparent gaps between bough tips stay clean; do not add a soft green aura.

REFERENCE ROLES
Image 1, the approved crate, supplies the hand-crafted pixel treatment, muted material palette, upper-left light, and controlled detail. Image 2, the accepted rock, supplies quiet natural-material clusters. Image 3 is the existing camp: use its elevated orthographic camera and scale. These are references, not subjects to copy into the deliverable.

STYLE AND SCALE
Coherent original pixel-art game sprite with deliberate stair-step contours, a consistent logical pixel grid, broad flat color clusters, and a restrained palette. The large export should look like enlarged carefully drawn pixel art, not a high-resolution painting with a pixel filter. Prioritize silhouette and structural readability at the measured scene size. Neutral upper-left light only, contained inside the object. No baked orange firelight, glow, bloom, soft outer halo, atmospheric haze, blur, smooth vector outlines, photographic grain, random speckles, glossy highlights, thick black cartoon borders, or excessive dithering.

DELIVERY
Exactly ONE complete isolated prop with genuine alpha transparency. Center the complete object with clear margins; preserve thin structural details without cropping. Everything outside the actual object must be fully transparent. No ground plane, contact-shadow patch, cast shadow, floor glow, scenery, characters, extra props, labels, text, watermark, border, alternate views, or sprite sheet. Transparent gaps within the structure must remain open. Do not paint a checkerboard or black backdrop. The camp renderer will supply lighting and shadows.

## Review criteria

Check source-facing geometry, subject count, structural connections, scale, palette, full silhouette, and actual alpha. Document deviations; do not generate unrequested alternatives. In-scene anchors and interactions require later integration validation.

## Candidate review

Export: 948 × 1659, PNG color type 6 (RGBA). Dark conifer silhouette and exposed trunk are present. The generated crown has more visually distinct branch skirts than the requested three main tiers; retain as a candidate deviation.

Standalone art only. In-scene scale, anchor, occlusion, and interactions have not been integrated or tested.
