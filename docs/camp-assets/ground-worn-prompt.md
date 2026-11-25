# Worn Ground Texture

## Status

One candidate generated with the built-in image tool; approval pending. Output: `candidates/ground-worn-v1.png`.

## Source and mapping

Source center uses dirtWorn #45392a at partial alpha over dirt and barkDark #281c12 near the fire. Proposed material sample, not a replacement clearing layout.

## Generation prompt

ONE seamless square texture of heavily trodden dark camp earth, fully opaque, flat orthographic surface sample. This is the subtle darker smoother material for the center of the camp, not a road layout or isolated stain. Main #45392a, small broad muted brown patches toward #4f4330 and restrained dark #3a3023. Less grass and less granular detail than the dirt texture; a handful of compacted short pixel streaks only. Conceptual 64x64 logical tile, approximately five to seven shades, low contrast and no meaningful directional light. No charcoal ring, central burn crater, footprints, cobbles, debris, flowers, puddles, smoke, fire, circular gradient, black scorch disk, or scenery. Match opposite edges for seamless horizontal and vertical repeat. No perimeter, vignette, tile grid, visible lighting gradient, or transparent margin. Fill the full square with material, not a perspective plane or tiled preview.

REFERENCE ROLES
Image 1: approved crate, defining hand-authored stepped pixel contours, restrained warm material shading, and detail density. Image 2: accepted rock, defining subdued natural materials. Image 3: current camp, defining elevated orthographic 2:1 floor projection, relative sizes, and woodland palette. Use only these aspects; never reproduce the surrounding scene or UI.

VISUAL CONTRACT
One consistent logical pixel grid, deliberate pixel clusters, readable silhouette at tiny scene scale, limited coordinated shades. Large export resolution does not justify painted microdetail. Solid materials use subdued upper-left lighting, dark undersides, and matte surfaces. No photographic noise, glossy 3D render, vector-smooth contours, heavy dithering, decorative black outlines, text, labels, watermark, frame, scenery, characters, or unrequested objects. Do not bake scene firelight into non-emissive materials.

OUTPUT CONTRACT
Follow the subject-specific layout and alpha requirement exactly. For transparent objects, everything outside actual material must be alpha zero, including holes and spaces between parts. No painted checkerboard, black background, floor, pedestal, cast-shadow ellipse, backdrop, colored haze, glow, or soft outline. Keep complete silhouettes inside generous clear margins. Explicit smoke alpha is the sole exception to hard-edged object treatment. Fully filled ground textures instead cover the entire image edge to edge. No automatic variants beyond the specified frames.

## Validation limits

Standalone art only. Frame alignment, seamless repeat, actual scene scale, anchors, and layer compositing need validation during later integration. Record deviations without automatic regeneration.

## Export

1254 × 1254 pixels; PNG color type 2. Saved as `candidates/ground-worn-v1.png`.

## Candidate review

Fully filled opaque square texture, visually close to the dirt candidate. Material separation is weaker than requested; repetition unverified.
