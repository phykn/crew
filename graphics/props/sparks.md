# Ember Frames

## Status

One candidate generated with the built-in image tool; approval pending. Output: `sparks.png`.

## Source and mapping

Source sparks use small warm moving points and additive blending. Proposed four-state art sheet; their travel remains a later runtime responsibility.

## Generation prompt

One horizontal FOUR-FRAME sprite sheet of a SINGLE tiny ember particle in each equal square cell, four cells only, no labels or dividers. Same center, scale and grid in each cell: this is intensity/lifetime art, not travel positions. Frame 1 a tiny compact pale-amber 2x2 logical-pixel ember; frame 2 amber 2x2 with a slightly irregular edge; frame 3 orange 1x2; frame 4 a faint deep-orange 1x1. Maintain the particle center so runtime movement can be added later. Solid stepped tiny clusters, colors related to #fff1b8/#ffb347/#ff8c2e. The sprite should remain small inside generous clear margins. No sparkle star rays, trails, smoke, surrounding glow or haze, fire tongues, multiple particles within one cell, campfire, ground, background, text, or numbers. True transparent PNG.

REFERENCE ROLES
Image 1: approved crate, defining hand-authored stepped pixel contours, restrained warm material shading, and detail density. Image 2: accepted rock, defining subdued natural materials. Image 3: current camp, defining elevated orthographic 2:1 floor projection, relative sizes, and woodland palette. Use only these aspects; never reproduce the surrounding scene or UI.

VISUAL CONTRACT
One consistent logical pixel grid, deliberate pixel clusters, readable silhouette at tiny scene scale, limited coordinated shades. Large export resolution does not justify painted microdetail. Solid materials use subdued upper-left lighting, dark undersides, and matte surfaces. No photographic noise, glossy 3D render, vector-smooth contours, heavy dithering, decorative black outlines, text, labels, watermark, frame, scenery, characters, or unrequested objects. Do not bake scene firelight into non-emissive materials.

OUTPUT CONTRACT
Follow the subject-specific layout and alpha requirement exactly. For transparent objects, everything outside actual material must be alpha zero, including holes and spaces between parts. No painted checkerboard, black background, floor, pedestal, cast-shadow ellipse, backdrop, colored haze, glow, or soft outline. Keep complete silhouettes inside generous clear margins. Explicit smoke alpha is the sole exception to hard-edged object treatment. Fully filled ground textures instead cover the entire image edge to edge. No automatic variants beyond the specified frames.

## Validation limits

Standalone art only. Frame alignment, seamless repeat, actual scene scale, anchors, and layer compositing need validation during later integration. Record deviations without automatic regeneration.

## Export

2172 × 724 pixels; PNG color type 6. Saved as `sparks.png`.

## Candidate review

Four states are visible in one row. Export is 2172 × 724: four equal slices would be 543 × 724, so the requested square cells were not produced. Exact root alignment, frame boundaries, and looping have not been validated. The last particle remains bright rather than clearly faint.
