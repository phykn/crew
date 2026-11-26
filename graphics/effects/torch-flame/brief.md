# Torch Flame

Reference: `image.png`, four states of one flame. Code: `createFlames` in `stage/effects.ts`, on each torch's cup.

## Shared style

- One logical pixel = one scene unit; every rect is snapped to whole units, so edges step like the props.
- Broad, deliberate clusters in two or three flat shades; shapes change by whole pixels on slow, separate beats.
- Calm and restrained: no busy texture, no random strokes or jitter, no glow halo, no gradients, no outline.
- Colors only from `src/frontend/camp/palette.js`; drawn every frame in `src/frontend/camp/stage/effects.ts`.
- The light map (`stage/light.ts`) gives the warmth around a flame; the effect itself never paints light on the ground.

## Parts

- One teardrop tongue about 7 wide and 7 to 10 high, rooted on the cup; its bottom row is narrower, its widest rows sit low, and it steps in to a one-pixel tip.
- The tip leans a pixel or two left and right on a slow beat; the root never moves.
- Inner body: the same drop one pixel narrower each side and lower.
- Core: a small pale drop at the root, 3 wide.

## Shades

- Outer: `flameDeep`. Inner: `flame`. Core: `flameCore`.

## Avoid

A curved vector tongue, a split or detached tip, glow, gradients, flicker faster than the campfire's.
