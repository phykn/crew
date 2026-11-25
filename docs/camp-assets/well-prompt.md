# Stone Well

## Status

One candidate generated with the built-in image tool; approval pending. Output: `candidates/well-v1.png`.

## Renderer measurements

`well` uses outer ellipse radii 24 and 12, wall height 12, three masonry courses, and an open rim with inner radii 19 and 9.5. Two wooden posts rise 34 units above the wall top, a 48-unit-wide beam sits 36 units above it, and a bucket hangs centrally from a rope. Overall source body extends roughly from y=-48 to y=12 relative to iso(d.x,d.y), excluding shadows. No roof is drawn. Palette anchors: rock #55524a, rockLight #706b60, rockDark #3a3833, woodDark #4a321d, pole #3d2b1a, water #141e24. Ground anchor: center of the masonry base.

## Generation prompt

Create one small traditional open stone well with a simple wooden hoist frame and hanging bucket, preserving the current camp design. Exactly one structure: a circular stone wall, two timber uprights, one crossbeam, a short rope, and one small wooden bucket. No roof.

FORM AND VIEW
Elevated orthographic camp camera. Circular masonry appears as a 2:1 horizontal ellipse: outer width 48 and projected depth 24 scene units. The masonry wall is 12 units tall, low and substantial, with exactly three staggered courses. The open top must read as a thick continuous stone ring, with a lighter upper rim, darker inner shaft, and a small muted blue-black water surface deep inside. Do not fill the opening with a stone disk or turn the cylinder into a square box. The front wall partly occludes the opening appropriately.

HOIST FRAME
Two simple dark wooden uprights, one at each side of the opening, rise about 34 scene units above the rim; one straight horizontal crossbeam spans them. Keep the frame square and mechanically plausible. A thin rope descends from the middle of the beam and supports a single small tapered wooden bucket centrally above the shaft. Bucket mouth is a shallow ellipse, sides narrow slightly toward the foot, and one dark metal band wraps the body. Keep it small enough that the stone opening remains visible. Rope is continuous; bucket does not float. No roof, crank wheel, ornate pulley machinery, extra ropes, hanging lantern, flowers, or decorative handle assembly.

STONE AND WOOD
Weathered warm-gray stone near #55524a, upper rim #706b60, joints/inner face #3a3833; stay compatible with the accepted rock. Use broad uneven but fitted blocks with thin dark staggered mortar seams that follow the curved courses. No perfect brick grid, random rubble pile, deep black gaps, bright white mortar, blue stone, or moss covering the opening. Timber near #3d2b1a and #4a321d, with restrained grain; bucket slightly warmer, water near #141e24 without a glow or dramatic reflection.

SMALL-SCALE READABILITY
Overall source is around 48 wide by 60 high scene units. Prioritize continuous open rim, three low courses, two posts, one beam, and one hanging bucket. Keep the interior legible without dense microtexture. All spaces under the beam and between posts are transparent except where actual well parts lie behind them.

REFERENCE ROLES
Image 1, the approved crate, supplies the hand-crafted pixel treatment, muted material palette, upper-left light, and controlled detail. Image 2, the accepted rock, supplies quiet natural-material clusters. Image 3 is the existing camp: use its elevated orthographic camera and scale. These are references, not subjects to copy into the deliverable.

STYLE AND SCALE
Coherent original pixel-art game sprite with deliberate stair-step contours, a consistent logical pixel grid, broad flat color clusters, and a restrained palette. The large export should look like enlarged carefully drawn pixel art, not a high-resolution painting with a pixel filter. Prioritize silhouette and structural readability at the measured scene size. Neutral upper-left light only, contained inside the object. No baked orange firelight, glow, bloom, soft outer halo, atmospheric haze, blur, smooth vector outlines, photographic grain, random speckles, glossy highlights, thick black cartoon borders, or excessive dithering.

DELIVERY
Exactly ONE complete isolated prop with genuine alpha transparency. Center the complete object with clear margins; preserve thin structural details without cropping. Everything outside the actual object must be fully transparent. No ground plane, contact-shadow patch, cast shadow, floor glow, scenery, characters, extra props, labels, text, watermark, border, alternate views, or sprite sheet. Transparent gaps within the structure must remain open. Do not paint a checkerboard or black backdrop. The camp renderer will supply lighting and shadows.

## Review criteria

Check source-facing geometry, subject count, structural connections, scale, palette, full silhouette, and actual alpha. Document deviations; do not generate unrequested alternatives. In-scene anchors and interactions require later integration validation.

## Candidate review

Export: 1312 × 1199, PNG color type 6 (RGBA). Open stone ring, two posts, beam, rope, and bucket are present. Colored edge artifacts are visible around the rope and some stone/wood edges; cleanup is needed before production use.

Standalone art only. In-scene scale, anchor, occlusion, and interactions have not been integrated or tested.
