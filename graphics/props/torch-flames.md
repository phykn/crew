# Torch Flame Frames

## Status

One candidate generated with the built-in image tool; approval pending. Output: `torch-flames.png`.

## Source and mapping

Source tongue: width about 6.4 scene units, height varies 5..9, with sway up to 1.2. Proposed four-frame art sheet; existing code uses procedural animation.

## Generation prompt

A single horizontal FOUR-FRAME sprite sheet of torch FLAMES ONLY. Exactly four equally sized square transparent cells side by side, one flame per cell, no borders, gutters, labels, or numbers. All four cells use the same pixel grid, scale, baseline, and base center: flame root at each cell local (50% width,80% height). Silhouette spans about 6.4 wide by 5..9 high logical scene units, with small rhythmic tip sway. Frame order: nearly upright medium tongue; slightly left-leaning taller tongue; shorter split-tipped tongue; slightly right-leaning medium tongue. Changes are subtle and support a looping flicker without moving the root. Outer orange #ff8c2e, inner amber #ffb347, small pale core #fff1b8. Crisp stepped opaque pixel clusters; no glow or gradients outside the flame. No torch cup, stick, ground, smoke, detached embers, surrounding halo, reflection, or scenery. Identical cell extents, no cropped flame, no varying zoom between frames. This deliverable is one four-cell strip, not four separate pictures or a perspective presentation.

REFERENCE ROLES
Image 1: approved crate, defining hand-authored stepped pixel contours, restrained warm material shading, and detail density. Image 2: accepted rock, defining subdued natural materials. Image 3: current camp, defining elevated orthographic 2:1 floor projection, relative sizes, and woodland palette. Use only these aspects; never reproduce the surrounding scene or UI.

VISUAL CONTRACT
One consistent logical pixel grid, deliberate pixel clusters, readable silhouette at tiny scene scale, limited coordinated shades. Large export resolution does not justify painted microdetail. Solid materials use subdued upper-left lighting, dark undersides, and matte surfaces. No photographic noise, glossy 3D render, vector-smooth contours, heavy dithering, decorative black outlines, text, labels, watermark, frame, scenery, characters, or unrequested objects. Do not bake scene firelight into non-emissive materials.

OUTPUT CONTRACT
Follow the subject-specific layout and alpha requirement exactly. For transparent objects, everything outside actual material must be alpha zero, including holes and spaces between parts. No painted checkerboard, black background, floor, pedestal, cast-shadow ellipse, backdrop, colored haze, glow, or soft outline. Keep complete silhouettes inside generous clear margins. Explicit smoke alpha is the sole exception to hard-edged object treatment. Fully filled ground textures instead cover the entire image edge to edge. No automatic variants beyond the specified frames.

## Validation limits

Standalone art only. Frame alignment, seamless repeat, actual scene scale, anchors, and layer compositing need validation during later integration. Record deviations without automatic regeneration.

## Export

2172 × 724 pixels; PNG color type 6. Saved as `torch-flames.png`.

## Candidate review

Four states are visible in one row. Export is 2172 × 724: four equal slices would be 543 × 724, so the requested square cells were not produced. Exact root alignment, frame boundaries, and looping have not been validated.
