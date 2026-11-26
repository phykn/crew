# Grass–Dirt Edge Overlay

## Status

One candidate generated with the built-in image tool; approval pending. Output: `ground-edge.png`.

## Source and mapping

Existing clearing uses a broad radial dirt fade onto grass. This candidate is a straight reusable terrain-edge strip for later masking/rotation, not a complete replacement clearing image.

## Generation prompt

ONE square transparent terrain-edge overlay for blending a dirt clearing into woodland grass. View is flat orthographic ground material, no perspective or horizon. The LOWER third contains opaque packed dark earth near #4f4330 with quiet #45392a clusters and continues to the lower canvas edge. Across the MIDDLE third, the dirt edge breaks into a few irregular small interlocking stepped patches and sparse low olive grass clusters near #263021/#313d27/#3f3d29. The UPPER third is fully transparent with no pixels. Make a subtle irregular boundary, not a smooth blurry fade, hard straight line, continuous bright grass ridge, or decorative fringe. Left/right boundary heights and color clusters should connect when repeated horizontally. No perspective diamond, soil cross-section, raised ledge, rocks, plants standing upright, flowers, shadow, glow, outline, center path, frame, text, or scenery. Conceptual 64x64 logical tile. Opaque dirt below and real alpha gaps above are essential; do not paint a checkerboard, black area, or green opaque background where transparency is specified.

REFERENCE ROLES
Image 1: approved crate, defining hand-authored stepped pixel contours, restrained warm material shading, and detail density. Image 2: accepted rock, defining subdued natural materials. Image 3: current camp, defining elevated orthographic 2:1 floor projection, relative sizes, and woodland palette. Use only these aspects; never reproduce the surrounding scene or UI.

VISUAL CONTRACT
One consistent logical pixel grid, deliberate pixel clusters, readable silhouette at tiny scene scale, limited coordinated shades. Large export resolution does not justify painted microdetail. Solid materials use subdued upper-left lighting, dark undersides, and matte surfaces. No photographic noise, glossy 3D render, vector-smooth contours, heavy dithering, decorative black outlines, text, labels, watermark, frame, scenery, characters, or unrequested objects. Do not bake scene firelight into non-emissive materials.

OUTPUT CONTRACT
Follow the subject-specific layout and alpha requirement exactly. For transparent objects, everything outside actual material must be alpha zero, including holes and spaces between parts. No painted checkerboard, black background, floor, pedestal, cast-shadow ellipse, backdrop, colored haze, glow, or soft outline. Keep complete silhouettes inside generous clear margins. Explicit smoke alpha is the sole exception to hard-edged object treatment. Fully filled ground textures instead cover the entire image edge to edge. No automatic variants beyond the specified frames.

## Validation limits

Standalone art only. Frame alignment, seamless repeat, actual scene scale, anchors, and layer compositing need validation during later integration. Record deviations without automatic regeneration.

## Export

1254 × 1254 pixels; PNG color type 6. Saved as `ground-edge.png`.

## Candidate review

Transparent upper region and earthy lower region produced. Boundary has a more continuous olive band than requested; horizontal repeat unverified.
