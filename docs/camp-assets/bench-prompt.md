# Wooden Bench

## Status

One candidate generated with the built-in image tool; approval pending. Output: `candidates/bench-v1.png`.

## Renderer measurements

The wooden branch of `bench` uses a 2.2 × 0.6 or 0.6 × 2.2 world-tile footprint, four 0.18 × 0.18 legs of height 6, and a seat slab between z=6 and z=8 (`SEAT_Z=8`). A 2.2 × 0.6 seat projects to 44.8 × 22.4 scene units, with 8 additional units to the floor. This candidate uses the 2.2 × 0.6 orientation. The source also has a stone bench and a perpendicular wooden bench; those are separate future variants, not included in this generation. Anchor for eventual mapping: projected footprint center on the ground. Preserve the top seat plane at z=8 so existing seated hips can align.

## Generation prompt

Create a single low rustic backless wooden bench, matching the wooden bench in the camp. It must be usable as a seat for the existing characters, not a dining table or ornate garden seat.

STRUCTURE AND PROPORTIONS
One long sturdy seat plank/slab, four short square timber legs at its four corners, no backrest and no armrests. Footprint length 2.2 world tiles and depth 0.6; seat top height 8 scene units with a 32 × 16 ground tile. The seat is only 2 scene units thick; legs reach from floor to its underside at height 6. Keep these squat proportions. Do not raise the seat into a table, thicken it into a massive beam, replace legs with stone supports, or add diagonal X-braces. The slab is long and narrow; slightly worn corners and small natural irregularities are welcome without breaking the usable flat top.

FACING AND CAMERA
Elevated orthographic 2:1 camp projection, no perspective convergence. Long axis is world x, projecting from screen upper-left to lower-right at a 2:1 horizontal-to-vertical run. Short axis projects toward lower-left. Show the broad top plane, the long near apron edge, the short right end, and legs below. Four legs must exist in sensible corner positions; far legs can be partially hidden by the slab. Keep open transparent space between legs. Do not arrange all four legs in a frontal row or mirror the bench into the other long-axis orientation.

MATERIAL
Match the approved crate's muted warm brown wood: top near #6b4a2c, long side near #4a321d, end/undersides near #3d2918, legs in dark timber near #281c12. One restrained long grain groove and two or three short broken grain clusters on top; a tiny knot is enough. No busy swirls, screws, large iron brackets, upholstery, moss, rope, items on the seat, or decorative carving. Clearly separate top, thin side faces, and short legs through value rather than heavy black outlines.

COMPOSITION
Entire bench centered with generous transparent margins, floor contacts intact. Keep a clear, quiet flat seat surface for later character placement. Actual projected seat is about 45 scene units wide, so fine grain is subordinate to its top plane and corners.

REFERENCE ROLES
Image 1, the approved crate, supplies the hand-crafted pixel treatment, muted material palette, upper-left light, and controlled detail. Image 2, the accepted rock, supplies quiet natural-material clusters. Image 3 is the existing camp: use its elevated orthographic camera and scale. These are references, not subjects to copy into the deliverable.

STYLE AND SCALE
Coherent original pixel-art game sprite with deliberate stair-step contours, a consistent logical pixel grid, broad flat color clusters, and a restrained palette. The large export should look like enlarged carefully drawn pixel art, not a high-resolution painting with a pixel filter. Prioritize silhouette and structural readability at the measured scene size. Neutral upper-left light only, contained inside the object. No baked orange firelight, glow, bloom, soft outer halo, atmospheric haze, blur, smooth vector outlines, photographic grain, random speckles, glossy highlights, thick black cartoon borders, or excessive dithering.

DELIVERY
Exactly ONE complete isolated prop with genuine alpha transparency. Center the complete object with clear margins; preserve thin structural details without cropping. Everything outside the actual object must be fully transparent. No ground plane, contact-shadow patch, cast shadow, floor glow, scenery, characters, extra props, labels, text, watermark, border, alternate views, or sprite sheet. Transparent gaps within the structure must remain open. Do not paint a checkerboard or black backdrop. The camp renderer will supply lighting and shadows.

## Review criteria

Check source-facing geometry, subject count, structural connections, scale, palette, full silhouette, and actual alpha. Document deviations; do not generate unrequested alternatives. In-scene anchors and interactions require later integration validation.

## Candidate review

Export: 1774 × 887, PNG color type 6 (RGBA). Long-axis facing, backless slab, and four legs are visible. Character seating alignment is untested. Only the wooden x-axis variant is included.

Standalone art only. In-scene scale, anchor, occlusion, and interactions have not been integrated or tested.
