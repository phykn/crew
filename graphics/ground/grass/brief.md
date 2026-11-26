# Grass Ground Texture

## Status

One candidate generated with the built-in image tool; approval pending. Output: `ground-grass.png`.

## Source and mapping

Source grass ground fills the view with #263021 and varied #1c2418/#313d27/#3f3d29 clusters. No square tile dimensions exist in the renderer; proposed logical sample is 64 × 64 before world mapping.

## Generation prompt

ONE seamless square woodland ground texture, fully opaque and filled edge to edge. Orthographic flat surface material sample, no perspective diamond, no scene or horizon. Dark muted grassy earth based on #263021 with broad quiet variation #1c2418 and #313d27 and sparse dry olive #3f3d29 clusters. Suggest short flattened grass through a few two- or three-pixel directional groups, not upright blades, bushes, ferns, rocks, roots, or flowers. Design for a conceptual 64x64 logical pixel tile: coarse deliberate clusters, low contrast, quiet enough behind people and props. No distinctive central landmark or repeated obvious stripe. Match left/right and top/bottom borders for seamless repeating; avoid a frame, edge fade, vignette, perimeter shadow, lighting gradient, tile grid, or isometric border. Use only surface material values, no baked shadows or firelight. Opaque texture is intentional, no transparency anywhere. Output one flat square tile, not a tiled preview or material sphere.

REFERENCE ROLES
Image 1: approved crate, defining hand-authored stepped pixel contours, restrained warm material shading, and detail density. Image 2: accepted rock, defining subdued natural materials. Image 3: current camp, defining elevated orthographic 2:1 floor projection, relative sizes, and woodland palette. Use only these aspects; never reproduce the surrounding scene or UI.

VISUAL CONTRACT
One consistent logical pixel grid, deliberate pixel clusters, readable silhouette at tiny scene scale, limited coordinated shades. Large export resolution does not justify painted microdetail. Solid materials use subdued upper-left lighting, dark undersides, and matte surfaces. No photographic noise, glossy 3D render, vector-smooth contours, heavy dithering, decorative black outlines, text, labels, watermark, frame, scenery, characters, or unrequested objects. Do not bake scene firelight into non-emissive materials.

OUTPUT CONTRACT
Follow the subject-specific layout and alpha requirement exactly. For transparent objects, everything outside actual material must be alpha zero, including holes and spaces between parts. No painted checkerboard, black background, floor, pedestal, cast-shadow ellipse, backdrop, colored haze, glow, or soft outline. Keep complete silhouettes inside generous clear margins. Explicit smoke alpha is the sole exception to hard-edged object treatment. Fully filled ground textures instead cover the entire image edge to edge. No automatic variants beyond the specified frames.

## Validation limits

Standalone art only. Frame alignment, seamless repeat, actual scene scale, anchors, and layer compositing need validation during later integration. Record deviations without automatic regeneration.

## Export

1254 × 1254 pixels; PNG color type 2. Saved as `ground-grass.png`.

## Candidate review

Fully filled opaque square texture. Seamless repetition has not been verified.
