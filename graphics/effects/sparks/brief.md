# Sparks

Reference: `image.png`, one ember through its life. Code: `createFlames` (sparks) in `stage/effects.ts`.

## Shared style

- One logical pixel = one scene unit; every rect is snapped to whole units, so edges step like the props.
- Broad, deliberate clusters in two or three flat shades; shapes change by whole pixels on slow, separate beats.
- Calm and restrained: no busy texture, no random strokes or jitter, no glow halo, no gradients, no outline.
- Colors only from `src/frontend/camp/palette.js`; drawn every frame in `src/frontend/camp/stage/effects.ts`.
- The light map (`stage/light.ts`) gives the warmth around a flame; the effect itself never paints light on the ground.

## Parts

- A few embers (eight) rising from the fire on their own slow paths, each drifting a little to one side.
- Each ember shrinks and cools through four stages: 2x2 pale, 2x2 amber, 1x2 orange, 1x1 deep orange and faint.

## Shades

- `flameCore`, `flame`, `flameDeep`, `flameDark`, in that order; drawn opaque with normal blending.

## Avoid

Star rays, trails, additive glow, jittering paths, many tiny dots.
