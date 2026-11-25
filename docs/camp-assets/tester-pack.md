# Tester / Field Alchemist

Status: all six actions exported. 22 body frames. [Roster status](characters.md).

[Standing master](candidates/tester-master-v1.png) · [Full motion GIF](previews/tester-motion.gif) · [All poses](previews/tester-contact.png).

An energetic young adult female field alchemist with medium brown skin, short sandy-blond hair in a tiny stubby ponytail, hazel eyes and a confident cheerful face. Muted mustard short practical vest over an ivory broad-cuffed shirt, petrol-blue neckerchief, dark olive trousers, brown sturdy boots and simple brown belt. One tiny CLOSED turquoise test-vial holder at SCREEN-RIGHT belt, vial stays sealed and attached. No goggles over eyes, armor, large bag or hat.

Work gesture: Palms held asymmetrically at waist and chest as if carefully testing a spell, small focused finger changes. All props stay attached; hands remain empty. Uses the exact [shared circle](shared-magic.md).

## Production inputs

[Master prompt](tester-master-prompt.md) · [Master provenance](tester-master-generation.json).

- idle: [prompt](tester-idle-pack-prompt.md), [source](candidates/tester-idle-pack-v1.png), [provenance](tester-idle-pack-generation.json), [strip](exports/tester/idle.png).
- walk: [prompt](tester-walk-pack-prompt.md), [source](candidates/tester-walk-pack-v2.png), [provenance](tester-walk-pack-v2-generation.json), [strip](exports/tester/walk.png).
- sit: [prompt](tester-sit-pack-prompt.md), [source](candidates/tester-sit-pack-v1.png), [provenance](tester-sit-pack-generation.json), [strip](exports/tester/sit.png).
- cast-start: [prompt](tester-cast-start-pack-prompt.md), [source](candidates/tester-cast-start-pack-v1.png), [provenance](tester-cast-start-pack-generation.json), [strip](exports/tester/cast-start.png).
- cast-loop: [prompt](tester-cast-loop-pack-prompt.md), [source](candidates/tester-cast-loop-pack-v1.png), [provenance](tester-cast-loop-pack-generation.json), [strip](exports/tester/cast-loop.png).
- cast-end: [prompt](tester-cast-end-pack-prompt.md), [source](candidates/tester-cast-end-pack-v2.png), [provenance](tester-cast-end-pack-v2-generation.json), [strip](exports/tester/cast-end.png).

Tester walk v2 uses the [opposite-contact repair prompt](tester-walk-pack-repair-prompt.md); contact arm phases and passing-foot silhouettes are now distinct. Small cross-frame perspective variation remains.

## Export

[Configuration](tester-export.json) · [Manifest](exports/tester/manifest.json) · [Validation](exports/tester/validation.json).

Rebuild existing sources: `uv run --with pillow python docs/camp-assets/scripts/export-characters.py tester`.

96px body cells; right walk mirrors the left strip. The common circle stays separate. Cropping, uniform sheet scaling, nearest-neighbor export and boundary-frame reuse do not replace missing artwork. Generated clothing, face and camera variations remain subject to visual approval. Application integration is outside this asset pass.

Tester casting-end v1 had an opaque textured backdrop and shadow and is rejected. [v2 prompt](tester-cast-end-pack-v2-prompt.md) removes that background.
