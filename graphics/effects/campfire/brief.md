# Campfire Flames

Reference: `image.png`, four states of one fire. Code: `createFlames` in `stage/effects.ts`.

## Shared style

- One logical pixel = one scene unit; every rect is snapped to whole units, so edges step like the props.
- Broad, deliberate clusters in two or three flat shades; shapes change by whole pixels on slow, separate beats.
- Calm and restrained: no busy texture, no random strokes or jitter, no glow halo, no gradients, no outline.
- Colors only from `src/frontend/camp/palette.js`; drawn every frame in `src/frontend/camp/stage/effects.ts`.
- The light map (`stage/light.ts`) gives the warmth around a flame; the effect itself never paints light on the ground.

## Parts

- Silhouette: about 15 wide and up to 13 high over the hearth, a flat base whose bottom row is one pixel narrower each side.
- Four broad tongues side by side, each a stepped peak; their heights rise and fall on their own slow beats, so the tallest moves across the fire like the four reference states.
- Inner body: the silhouette inset one pixel at the sides and two at the top.
- Core: a small pale stepped mound at the base center, 5 wide and 3 high, never above the inner body.

## Shades

- Outer: `flameDeep`; lowest outer corners: `flameDark`.
- Inner: `flame`.
- Core: `flameCore`.

## Avoid

Four detached bars, thin needle tips, stray flecks, fast flicker, glow, gradients, smoke or sparks drawn as part of the flame.
