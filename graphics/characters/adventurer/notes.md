# Adventurer Ward Mage — Motion Delivery

Accepted appearance: [original standing master](candidates/adventurer-classic-v1.png). Complete requested motion set generated with the built-in image tool, based on [the character-specific production prompt](adventurer-production-prompt.md). Scope is local asset production and previews. The user subsequently approved [this circle as the common effect for all characters](shared-magic.md).

[Full motion GIF](previews/adventurer-motion.gif) · [All frame contact sheet](previews/adventurer-contact.png) · [Casting contact sheet](previews/adventurer-cast-contact.png) · [Light-background boundary review](previews/adventurer-boundaries-light.png).

## Delivered files

Logical character cells are 96 × 96; the upgraded ground effect uses 128 × 128 cells. Exported PNGs are horizontal strips; source layouts are listed below. GIFs are 440 × 440, with extra lower margin for the larger circle. The full preview includes left and horizontally mirrored right walking, seated rest and the idle→start→chant→end→idle sequence: **60 frames, 16.32 seconds**.

| Action | Frames / source layout | Logical strip | Preview duration | Source | Exact prompt |
| --- | --- | --- | --- | --- | --- |
| Idle | 4 / 2 × 2 | [PNG](exports/adventurer/idle.png) | [GIF](previews/adventurer-idle.gif), 1.88 s | [PNG](candidates/adventurer-idle-v1.png) | [Prompt](adventurer-idle-prompt.md) |
| Walk | 4 / 2 × 2 | [PNG](exports/adventurer/walk.png) | [GIF](previews/adventurer-walk.gif), 0.88 s | [PNG](candidates/adventurer-walk-v1.png) | [Prompt](adventurer-walk-prompt.md) |
| Seated rest | 2 / 2 × 1 | [PNG](exports/adventurer/sit.png) | [GIF](previews/adventurer-sit.gif), 1.13 s | [PNG](candidates/adventurer-sit-v1.png) | [Prompt](adventurer-sit-prompt.md) |
| Casting start | 4 / 2 × 2 | [PNG](exports/adventurer/cast-start.png) | [GIF](previews/adventurer-cast-start.gif), 1.00 s, once | [PNG](candidates/adventurer-cast-start-v1.png) | [Prompt](adventurer-cast-start-prompt.md) |
| Working chant | 4 / 2 × 2 | [PNG](exports/adventurer/cast-loop.png) | [GIF with separate effect](previews/adventurer-cast-loop.gif), 0.72 s | [Corrected PNG](candidates/adventurer-cast-loop-v2.png) | [Initial prompt](adventurer-cast-loop-prompt.md), [targeted cleanup](adventurer-cast-loop-repair-prompt.md) |
| Casting end | 4 / 2 × 2 | [PNG](exports/adventurer/cast-end.png) | [GIF](previews/adventurer-cast-end.gif), 1.14 s, once | [PNG](candidates/adventurer-cast-end-v1.png) | [Prompt](adventurer-cast-end-prompt.md) |
| Ground ward effect | 4 / 2 × 2 | [PNG](exports/adventurer/magic.png) | [Effect-only GIF](previews/adventurer-magic.gif), 0.72 s | [PNG](candidates/adventurer-magic-v3.png) | [Prompt](adventurer-magic-v3-prompt.md) |

## Identity and tool continuity

Green short tunic, cream sleeves, red neckerchief, brown belt/trousers/boots and the same small flat teal wardstone. Idle/walk/seated keep the stone attached. Casting start unclips it, leaving the leather tab present and empty. Chant holds it at lower chest. Casting end returns that single tool to the same attachment. Colored tool pixels move from approximately logical (51,55) at belt to (45,42–43) when held, then back; these measured centers are a color check, not a semantic object counter.

Walking uses [the four-pose skeleton](reference/adventurer-walk-guide.png) derived from the existing projected joint data in `reference/walk-guide.json`: near contact, far passing, far contact, near passing. Both contact and passing pairs visibly change anatomical lead/lifted side. The third pose has a slightly different torso turn; small drawing and perspective variation remains.

## Corrections and export

Ten built-in generations: seven initial sheets, one targeted chant cleanup, one ground-circle redesign, and one targeted change from fluid-shaped flank ribbons to rising light. The first [chant sheet](candidates/adventurer-cast-loop-v1.png) incorrectly baked a ground circle into the body artwork; it is retained as rejected history and is not used by the exporter. The correction removes that floor art while keeping the character. The separately generated teal/gold effect is composited behind the boots at their ground midpoint, never at the chest.

Source sheets vary in canvas size and character position. Export uses one uniform scale for each complete source sheet, matching the master standing height; seated scale uses master head width so the shorter silhouette is not enlarged to standing height. For planted poses, source-grid column origins align median head centers and row origins align planted boot baselines. This corrects the cast-start sheet's large column displacement without stretching limbs or fitting every pose's silhouette. Walk keeps one shared offset to preserve stride depth. Character alpha is thresholded at 220, removing low-alpha colored fringes; effects keep intentional translucent luminous falloff. Raw PNGs remain unchanged.

Whole canonical drawings are reused at four boundaries, with exact pixel equality:

- cast-start 1 = idle 1;
- cast-loop 1 = cast-start 4;
- cast-end 1 = cast-start 4;
- cast-end 4 = idle 1.

The exported sheets have 22 character frames in 96-pixel cells plus 4 effect frames in 128-pixel cells. All are nonempty and remain inside their own cells, without edge clipping. Character alpha is binary 0/255; exported PNGs contain no baked floor circle. Walk GIF is four frames at 220 ms each. Start/end GIFs have no loop extension and play once; full preview cycles the complete demonstration. Checks and actual transforms/timings are recorded in [validation](exports/adventurer/validation.json) and [manifest](exports/adventurer/manifest.json). Dark/light review images show the cutouts at display scale; this is not a claim of pixel-identical identity across every generated drawing.

## Rebuild and later integration

`uv run --with pillow python docs/camp-assets/scripts/export-adventurer.py`

Settings: [adventurer-export.json](adventurer-export.json). Exact generation input/output paths: [generation record](adventurer-generation.json). Boundary source crops are `reference/adventurer-idle-boundary.png` and `reference/adventurer-held-boundary.png`.

No application code or runtime atlas registration was changed. Before later integration, check actual bench seat anchors, in-world display scale, flipped equipment/lighting and the remaining small facial/hand/torso drawing differences. The PNG strips and timing metadata are supplied for that phase. No commit or push.

## Upgraded ground circle

[Updated chanting GIF](previews/adventurer-cast-loop-v3.gif) · [Effect strip](exports/adventurer/magic.png) · [High-resolution source](candidates/adventurer-magic-v3.png) · [Current light revision prompt](adventurer-magic-v3-prompt.md) · [Ground design brief](adventurer-magic-v2-prompt.md).

User requested a more impressive circle. The redesign adds three concentric structures, a dense gold/white glyph band, polygon chords, larger turquoise perimeter accents, straight ivory/gold flank rays and rising glints. The user approved the ornate ground design but requested replacing the water-like curved ribbons; v3 makes that targeted change. Bright-core export width increases from 58 to 100 logical pixels. Effect cells are 128 × 128, with ground center (64,86); character cells/PNGs are unchanged, verified by SHA-256 for all six action strips.

The earlier effect anchor used all bright pixels, so side pillars could bias the ground center. Revised export finds each frame's central ground-stroke median, excluding flank pillars, and registers that center under the feet at a shared uniform scale. Alpha below 8 is discarded as near-invisible speckle; meaningful luminous falloff is retained. Preview height increases from 420 to 440 to keep the entire larger front arc visible, while the character position and floor anchor stay fixed. All four effect bounds fit inside both the 128-pixel cell and the stage; face and hand-held tool remain clear. Effect/chant timing remains four frames, 720 ms. Full motion GIF was rebuilt with the new effect.
