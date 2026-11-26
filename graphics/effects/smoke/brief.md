# Smoke Frames

## Status

One candidate generated with the built-in image tool; approval pending. Output: `smoke.png`.

## Source and mapping

Source smoke is runtime puffs with gray tint #9a948c and changing alpha. This is a proposed four-frame overlay candidate; not source sprite frames.

## Generation prompt

One horizontal FOUR-FRAME sprite sheet of quiet campfire smoke only, four equal transparent square cells with no lines or labels. A single small sparse smoke wisp in each cell, same logical pixel scale and source root centered near local (50%,85%). Use subdued warm gray near #9a948c, low opacity and intentional alpha fading. Frame 1 short narrow connected wisp, frame 2 rising slightly taller and bending left, frame 3 taller fading irregular puff with a slight rightward bend, frame 4 very faint dispersing upper puff while a small new lower wisp begins. Keep movement restrained and the base position stable; this is subtle smoke, not a large plume. Pixel-cluster silhouettes with gentle opacity steps rather than smooth photographic clouds. Smoke itself may be translucent; outside the actual puff boundary is alpha zero. No dark filled backdrop, luminous halo, flames, sparks, logs, stones, ground, steam pot, text, or scenery. Separate four cells cleanly with clear margins, no puff crossing cell boundaries.

REFERENCE ROLES
Image 1: approved crate, defining hand-authored stepped pixel contours, restrained warm material shading, and detail density. Image 2: accepted rock, defining subdued natural materials. Image 3: current camp, defining elevated orthographic 2:1 floor projection, relative sizes, and woodland palette. Use only these aspects; never reproduce the surrounding scene or UI.

VISUAL CONTRACT
One consistent logical pixel grid, deliberate pixel clusters, readable silhouette at tiny scene scale, limited coordinated shades. Large export resolution does not justify painted microdetail. Solid materials use subdued upper-left lighting, dark undersides, and matte surfaces. No photographic noise, glossy 3D render, vector-smooth contours, heavy dithering, decorative black outlines, text, labels, watermark, frame, scenery, characters, or unrequested objects. Do not bake scene firelight into non-emissive materials.

OUTPUT CONTRACT
Follow the subject-specific layout and alpha requirement exactly. For transparent objects, everything outside actual material must be alpha zero, including holes and spaces between parts. No painted checkerboard, black background, floor, pedestal, cast-shadow ellipse, backdrop, colored haze, glow, or soft outline. Keep complete silhouettes inside generous clear margins. Explicit smoke alpha is the sole exception to hard-edged object treatment. Fully filled ground textures instead cover the entire image edge to edge. No automatic variants beyond the specified frames.

## Validation limits

Standalone art only. Frame alignment, seamless repeat, actual scene scale, anchors, and layer compositing need validation during later integration. Record deviations without automatic regeneration.

## Export

2172 × 724 pixels; PNG color type 6. Saved as `smoke.png`.

## Candidate review

Four states are visible in one row. Export is 2172 × 724: four equal slices would be 543 × 724, so the requested square cells were not produced. Exact root alignment, frame boundaries, and looping have not been validated. Smoke is lighter and smoother than the requested subdued pixel clusters, with edge artifacts.
