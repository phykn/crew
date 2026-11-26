# Interpreter / Envoy Mage

Status: all six actions exported. 22 body frames. [Roster status](characters.md).

[Standing master](candidates/interpreter-master-v1.png) · [Full motion GIF](previews/interpreter-motion.gif) · [All poses](previews/interpreter-contact.png).

An approachable young adult male envoy with warm chestnut skin, short soft silver hair swept to one side, expressive amber eyes and a small kind smile. Teal short travel coat with ivory collar and sleeves, muted coral neck scarf, dark navy trousers, brown boots. One small brass speech-shell brooch on upper chest and a tiny CLOSED message-scroll case fixed at the SCREEN-RIGHT belt. No large cape or hat. Lean gentle face but same substantial compact body.

Work gesture: Open palms toward an unseen listener, gentle conversational chanting. All props stay attached; hands remain empty. Uses the exact [shared circle](shared-magic.md).

## Production inputs

[Master prompt](interpreter-master-prompt.md) · [Master provenance](interpreter-master-generation.json).

- idle: [prompt](interpreter-idle-pack-prompt.md), [source](candidates/interpreter-idle-pack-v1.png), [provenance](interpreter-idle-pack-generation.json), [strip](exports/interpreter/idle.png).
- walk: [prompt](interpreter-walk-pack-prompt.md), [source](candidates/interpreter-walk-pack-v1.png), [provenance](interpreter-walk-pack-generation.json), [strip](exports/interpreter/walk.png).
- sit: [prompt](interpreter-sit-pack-prompt.md), [source](candidates/interpreter-sit-pack-v1.png), [provenance](interpreter-sit-pack-generation.json), [strip](exports/interpreter/sit.png).
- cast-start: [prompt](interpreter-cast-start-pack-prompt.md), [source](candidates/interpreter-cast-start-pack-v1.png), [provenance](interpreter-cast-start-pack-generation.json), [strip](exports/interpreter/cast-start.png).
- cast-loop: [prompt](interpreter-cast-loop-pack-prompt.md), [source](candidates/interpreter-cast-loop-pack-v1.png), [provenance](interpreter-cast-loop-pack-generation.json), [strip](exports/interpreter/cast-loop.png).
- cast-end: [prompt](interpreter-cast-end-pack-prompt.md), [source](candidates/interpreter-cast-end-pack-v1.png), [provenance](interpreter-cast-end-pack-generation.json), [strip](exports/interpreter/cast-end.png).

## Export

[Configuration](interpreter-export.json) · [Manifest](exports/interpreter/manifest.json) · [Validation](exports/interpreter/validation.json).

Rebuild existing sources: `uv run --with pillow python docs/camp-assets/scripts/export-characters.py interpreter`.

96px body cells; right walk mirrors the left strip. The common circle stays separate. Cropping, uniform sheet scaling, nearest-neighbor export and boundary-frame reuse do not replace missing artwork. Generated clothing, face and camera variations remain subject to visual approval. Application integration is outside this asset pass.
