# Campfire Flame Frames

## Status

One candidate generated with the built-in image tool; approval pending. Output: `campfire-flames.png`.

## Source and mapping

Source effects.ts: four flame columns occupy about 16 scene units width, heights 5..13, with separate small pale core. Proposed four-frame sheet, not validated playback.

## Generation prompt

One horizontal FOUR-FRAME sprite sheet of a small campfire's FLAMES ONLY. Four equal square transparent cells in one row, no labels, grid lines, borders, or extra views. Shared base center in each cell at local (50% width,80% height), same scale and pixel grid. Each flame cluster is roughly 16 scene units wide and 9..15 high, with four broad overlapping irregular tongues and a small connected pale core near the center. Frame 1: left-medium center-tall right-low. Frame 2: left-high center-medium right-medium. Frame 3: left-low center-high right-tall. Frame 4: left-medium center-low right-high. Small silhouette changes loop gently while the shared base stays fixed. Use orange #ff8c2e, amber #ffb347, pale core #fff1b8 and one restrained deeper orange. Deliberate stepped opaque clusters, a readable fire shape, not four detached vertical bars or an explosion. No hearth, rocks, logs, ground, shadow, smoke, sparks, detached embers, external glow, or gradients. Identical framing for every cell; all flames remain inside cells with alpha between them.

REFERENCE ROLES
Image 1: approved crate, defining hand-authored stepped pixel contours, restrained warm material shading, and detail density. Image 2: accepted rock, defining subdued natural materials. Image 3: current camp, defining elevated orthographic 2:1 floor projection, relative sizes, and woodland palette. Use only these aspects; never reproduce the surrounding scene or UI.

VISUAL CONTRACT
One consistent logical pixel grid, deliberate pixel clusters, readable silhouette at tiny scene scale, limited coordinated shades. Large export resolution does not justify painted microdetail. Solid materials use subdued upper-left lighting, dark undersides, and matte surfaces. No photographic noise, glossy 3D render, vector-smooth contours, heavy dithering, decorative black outlines, text, labels, watermark, frame, scenery, characters, or unrequested objects. Do not bake scene firelight into non-emissive materials.

OUTPUT CONTRACT
Follow the subject-specific layout and alpha requirement exactly. For transparent objects, everything outside actual material must be alpha zero, including holes and spaces between parts. No painted checkerboard, black background, floor, pedestal, cast-shadow ellipse, backdrop, colored haze, glow, or soft outline. Keep complete silhouettes inside generous clear margins. Explicit smoke alpha is the sole exception to hard-edged object treatment. Fully filled ground textures instead cover the entire image edge to edge. No automatic variants beyond the specified frames.

## Validation limits

Standalone art only. Frame alignment, seamless repeat, actual scene scale, anchors, and layer compositing need validation during later integration. Record deviations without automatic regeneration.

## Export

2172 × 724 pixels; PNG color type 6. Saved as `campfire-flames.png`.

## Candidate review

Four states are visible in one row. Export is 2172 × 724: four equal slices would be 543 × 724, so the requested square cells were not produced. Exact root alignment, frame boundaries, and looping have not been validated. Stray edge flecks remain around some tongues.
