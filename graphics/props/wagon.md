# Covered Wagon

## Status

One candidate generated with the built-in image tool; approval pending. Output: `wagon.png`.

## Renderer measurements

`wagon` uses length 2.4 and width 1.1 world tiles through `along(d,L)`; the long axis runs along world y, so the near end faces lower-left. Bed sides span z=6..15, canvas rises to z=26 at the shoulders and z=32 at the center ridge. Four wheels have horizontal/vertical radii 5/7 and centers at z=7, at u=0.4 and L-0.4 on both sides. One drawbar extends from u=L to L+0.9. The canopy end has a dark opening. Palette: canvas #b8a98a/#8f8166, wood #6b4a2c/#4a321d/#3d2918, iron #3a3834. Anchor: center of bed footprint on the ground. No animal is part of the source.

## Generation prompt

Create one small rustic covered wooden camp wagon: four wheels, a low wooden cargo bed, a rounded canvas bonnet, a dark open near end, and a single projecting drawbar. Preserve the camp's wagon silhouette rather than making a modern caravan or stagecoach.

FACING
Elevated orthographic 2:1 camp projection. Long axis is world y, so the wagon's open near end faces screen LOWER-LEFT and the long visible side extends toward UPPER-RIGHT. Match the tent's general long-axis direction, but use a round covered-wagon canopy rather than triangular tent roof. No perspective convergence. Far wheels are naturally partly hidden; two near wheels must read clearly at opposite ends of the long near side. Do not mirror the opening to the right.

STRUCTURAL PROPORTIONS
Bed footprint 2.4 by 1.1 world tiles, with a low undercarriage, sides between heights 6 and 15 scene units. Canopy shoulders reach height 26, roof crown 32. Canvas is draped over a sequence of shallow wooden arch hoops, forming a rounded tunnel above the rectangular wooden bed. The near opening is a dark arch under the canopy lip, smaller than the end outline; it should not look like a painted solid oval or house doorway with a door. Three quiet hoop/seam divisions articulate the long side. Keep canvas fitted to the bed, without a ground-reaching skirt.

WHEELS AND DRAWBAR
Exactly four wooden spoked wheels on two axles. Two visible near-side wheels are approximately 10 wide by 14 high scene units, with dark rims, simple cross spokes, small iron hubs, and transparent gaps. Far-side wheels may be occluded by the bed but sit at matching axle positions. Wheels meet the ground, do not float or overlap impossibly. One narrow dark wooden drawbar projects from the near lower-left end beyond the bed, tapering slightly toward its tip. No horses, harness, second wagon, detached wheels, sacks, passengers, or stacked cargo.

MATERIALS AND FINISH
Wood matches the approved crate: muted warm #6b4a2c with #4a321d and #3d2918 shadows; modest plank seams and sparse grain. Canvas matches the tent family: oatmeal/khaki #b8a98a, darker folds #8f8166 and #6b604b. A few controlled folds around hoops and opening; no noisy fabric weave. Iron is matte #3a3834. Read the bed, canopy, wheel rims, and drawbar at small scene scale without bright outlines or polished metal. No ornate trim, painted panels, red wheels, windows, chimney, lettering, or camping equipment outside the object.

REFERENCE ROLES
Image 1, the approved crate, supplies the hand-crafted pixel treatment, muted material palette, upper-left light, and controlled detail. Image 2, the accepted rock, supplies quiet natural-material clusters. Image 3 is the existing camp: use its elevated orthographic camera and scale. These are references, not subjects to copy into the deliverable.

STYLE AND SCALE
Coherent original pixel-art game sprite with deliberate stair-step contours, a consistent logical pixel grid, broad flat color clusters, and a restrained palette. The large export should look like enlarged carefully drawn pixel art, not a high-resolution painting with a pixel filter. Prioritize silhouette and structural readability at the measured scene size. Neutral upper-left light only, contained inside the object. No baked orange firelight, glow, bloom, soft outer halo, atmospheric haze, blur, smooth vector outlines, photographic grain, random speckles, glossy highlights, thick black cartoon borders, or excessive dithering.

DELIVERY
Exactly ONE complete isolated prop with genuine alpha transparency. Center the complete object with clear margins; preserve thin structural details without cropping. Everything outside the actual object must be fully transparent. No ground plane, contact-shadow patch, cast shadow, floor glow, scenery, characters, extra props, labels, text, watermark, border, alternate views, or sprite sheet. Transparent gaps within the structure must remain open. Do not paint a checkerboard or black backdrop. The camp renderer will supply lighting and shadows.

## Review criteria

Check source-facing geometry, subject count, structural connections, scale, palette, full silhouette, and actual alpha. Document deviations; do not generate unrequested alternatives. In-scene anchors and interactions require later integration validation.

## Candidate review

Export: 1774 × 887, PNG color type 6 (RGBA). Near opening faces lower-left and two near wheels read clearly; far-wheel geometry is mostly occluded and cannot be fully verified from the image. Colored edge artifacts occur along the canopy and wheel gaps.

Standalone art only. In-scene scale, anchor, occlusion, and interactions have not been integrated or tested.
