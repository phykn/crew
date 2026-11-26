# Shared Casting Circle

The user approved the rising-light ward circle for **all camp mage characters**. Reuse the exact existing effect. Roles differ through their face, clothes, tool and chanting gestures; do not generate or recolor a separate ground circle per role.

- Canonical export: ward-circle.png.
- Atlas/timing/anchor metadata: ward-circle.json.
- High-resolution source: adventurer-magic-v3.png.
- Exact historical generation brief: rising light.
- Appearance/animation preview: current chanting GIF.

Four 128 × 128 RGBA cells in a horizontal 512 × 128 strip, 180 ms each, 720 ms loop. Ground anchor is local (64,86); draw behind the character and align this anchor to its ground-contact midpoint. This is an effect anchor, not its visible-bounds center or its brightest pillar. Keep meaningful local glow and the transparent ring interior. Same physical scale across the guild; the current characters use 96 × 96 logical body cells at comparable physical height.

The approved look is the ornate teal/ivory/gold ground geometry plus straight upward white/gold rays and rising glints. No liquid ribbons, curved water jets, chest-level circles, character pixels or new tool artwork. Never bake this layer into a character sprite. Seated/idle/walk assets contain no circle; active-work previews compose it as an independent layer.

`exports/adventurer/magic.png` is the existing character-pack export snapshot and currently has the same SHA-256 as the canonical shared PNG. New character packs reference the shared path instead of copying/repainting the effect. If the user later requests an effect change, update the shared asset and its metadata together, then refresh existing composites. No runtime integration was performed when establishing this shared asset.
