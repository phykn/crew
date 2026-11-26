# Smoke

Reference: `image.png`, four states of one wisp. Code: `createFlames` (smoke) in `stage/effects.ts`.

## Shared style

- One logical pixel = one scene unit; every rect is snapped to whole units, so edges step like the props.
- Broad, deliberate clusters in two or three flat shades; shapes change by whole pixels on slow, separate beats.
- Calm and restrained: no busy texture, no random strokes or jitter, no glow halo, no gradients, no outline.
- Colors only from `src/frontend/camp/palette.js`; drawn every frame in `src/frontend/camp/stage/effects.ts`.
- The light map (`stage/light.ts`) gives the warmth around a flame; the effect itself never paints light on the ground.

## Parts

- One thin wisp rising from the fire's top, about 40 high, built of stacked two-row blocks.
- Blocks are 2 wide at the root and 4 wide at the top; their sideways offset follows one S wave that travels upward, so the wisp bends one way and then the other as it rises.
- It fades with height and thins in slow bands that rise with it, so puffs seem to part from the top.

## Shades

- `smoke` near the root, `smokeLight` higher up, both translucent; the only effect with soft alpha.

## Avoid

Round blurred puffs, a big plume, a dark backdrop, many wisps, glow.
