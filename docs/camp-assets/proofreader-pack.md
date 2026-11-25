# Proofreader / Rune Corrector

Status: all six actions exported. 22 body frames. [Roster status](characters.md).

[Standing master](candidates/proofreader-master-v1.png) · [Full motion GIF](previews/proofreader-motion.gif) · [All poses](previews/proofreader-contact.png).

A meticulous young adult female rune corrector with pale warm skin, dusty rose short hair with neat rounded side locks and a small cream hair ribbon, expressive muted blue eyes, thin oval brass spectacles with clear eyes. Sage-gray short tunic coat with ivory cuffs, dusty rose waist sash, brown fitted trousers, cocoa boots. One tiny CLOSED wooden correction-stamp case fixed at SCREEN-RIGHT belt; nothing held. Gentle attentive expression. No school uniform, giant bow, skirt or hat.

Work gesture: Open hands make small precise pinching gestures near lower chest without touching; both palms visible, no held object. All props stay attached; hands remain empty. Uses the exact [shared circle](shared-magic.md).

## Production inputs

[Master prompt](proofreader-master-prompt.md) · [Master provenance](proofreader-master-generation.json).

- idle: [prompt](proofreader-idle-pack-prompt.md), [source](candidates/proofreader-idle-pack-v1.png), [provenance](proofreader-idle-pack-generation.json), [strip](exports/proofreader/idle.png).
- walk: [prompt](proofreader-walk-pack-prompt.md), [source](candidates/proofreader-walk-pack-v1.png), [provenance](proofreader-walk-pack-generation.json), [strip](exports/proofreader/walk.png).
- sit: [prompt](proofreader-sit-pack-prompt.md), [source](candidates/proofreader-sit-pack-v1.png), [provenance](proofreader-sit-pack-generation.json), [strip](exports/proofreader/sit.png).
- cast-start: [prompt](proofreader-cast-start-pack-prompt.md), [source](candidates/proofreader-cast-start-pack-v1.png), [provenance](proofreader-cast-start-pack-generation.json), [strip](exports/proofreader/cast-start.png).
- cast-loop: [prompt](proofreader-cast-loop-pack-prompt.md), [source](candidates/proofreader-cast-loop-pack-v1.png), [provenance](proofreader-cast-loop-pack-generation.json), [strip](exports/proofreader/cast-loop.png).
- cast-end: [prompt](proofreader-cast-end-pack-prompt.md), [source](candidates/proofreader-cast-end-pack-v1.png), [provenance](proofreader-cast-end-pack-generation.json), [strip](exports/proofreader/cast-end.png).

## Export

[Configuration](proofreader-export.json) · [Manifest](exports/proofreader/manifest.json) · [Validation](exports/proofreader/validation.json).

Rebuild existing sources: `uv run --with pillow python docs/camp-assets/scripts/export-characters.py proofreader`.

96px body cells; right walk mirrors the left strip. The common circle stays separate. Cropping, uniform sheet scaling, nearest-neighbor export and boundary-frame reuse do not replace missing artwork. Generated clothing, face and camera variations remain subject to visual approval. Application integration is outside this asset pass.
