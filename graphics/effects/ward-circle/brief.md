# Ward Circle

Reference: `image.png`, four states of the casting circle. Code: `drawWard` in `stage/effects.ts`, drawn at a casting member's feet.

## Shared style

- One logical pixel = one scene unit; every rect is snapped to whole units, so edges step like the props.
- Broad, deliberate clusters in two or three flat shades; shapes change by whole pixels on slow, separate beats.
- Calm and restrained: no busy texture, no random strokes or jitter, no glow halo, no gradients, no outline.
- Colors only from `src/frontend/camp/palette.js`; drawn every frame in `src/frontend/camp/stage/effects.ts`.
- The light map (`stage/light.ts`) gives the warmth around a flame; the effect itself never paints light on the ground.

## Parts

- Outer ring: a one-pixel stepped ellipse on the ground, 2:1 like the floor, about 32 wide.
- Gold ring inside it, with eight small diamond nodes that turn slowly.
- Faint ivory inner ring; the middle stays empty ground.
- Rays: a few one-pixel vertical lines rising from the outer ring's sides, each growing and fading on its own slow beat.
- Glints: a few single pixels rising from the ring and fading.

## Shades

- Outer ring: `ward`. Gold ring and nodes: `wardGold`. Inner ring, rays, glints: `wardLight`.

## Avoid

Ornate tracery at this size, liquid ribbons, filled discs, pulsing halos, expanding shock rings, fast spin.
