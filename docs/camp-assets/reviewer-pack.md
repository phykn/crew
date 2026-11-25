# Reviewer / Ward Inspector

Status: all six actions exported. 22 body frames. [Roster status](characters.md).

[Standing master](candidates/reviewer-master-v1.png) · [Full motion GIF](previews/reviewer-motion.gif) · [All poses](previews/reviewer-contact.png).

A calm adult male inspector with warm tan skin, straight charcoal hair swept back in short layers, subtle gray streak at one temple, violet-brown eyes, slightly angular eyebrows and kindly composed expression; no beard. Deep aubergine short coat with muted silver edging over ash-ivory shirt, dark teal waist sash, charcoal trousers and dark brown boots. One SMALL rectangular sealed silver inspection token fixed at SCREEN-RIGHT belt. No armor, weapon, hood or cape.

Work gesture: One open palm faces gently outward near chest as if testing a ward; other open hand low and relaxed. All props stay attached; hands remain empty. Uses the exact [shared circle](shared-magic.md).

## Production inputs

[Master prompt](reviewer-master-prompt.md) · [Master provenance](reviewer-master-generation.json).

- idle: [prompt](reviewer-idle-pack-prompt.md), [source](candidates/reviewer-idle-pack-v1.png), [provenance](reviewer-idle-pack-generation.json), [strip](exports/reviewer/idle.png).
- walk: [prompt](reviewer-walk-pack-prompt.md), [source](candidates/reviewer-walk-pack-v1.png), [provenance](reviewer-walk-pack-generation.json), [strip](exports/reviewer/walk.png).
- sit: [prompt](reviewer-sit-pack-prompt.md), [source](candidates/reviewer-sit-pack-v1.png), [provenance](reviewer-sit-pack-generation.json), [strip](exports/reviewer/sit.png).
- cast-start: [prompt](reviewer-cast-start-pack-prompt.md), [source](candidates/reviewer-cast-start-pack-v1.png), [provenance](reviewer-cast-start-pack-generation.json), [strip](exports/reviewer/cast-start.png).
- cast-loop: [prompt](reviewer-cast-loop-pack-prompt.md), [source](candidates/reviewer-cast-loop-pack-v1.png), [provenance](reviewer-cast-loop-pack-generation.json), [strip](exports/reviewer/cast-loop.png).
- cast-end: [prompt](reviewer-cast-end-pack-prompt.md), [source](candidates/reviewer-cast-end-pack-v1.png), [provenance](reviewer-cast-end-pack-generation.json), [strip](exports/reviewer/cast-end.png).

## Export

[Configuration](reviewer-export.json) · [Manifest](exports/reviewer/manifest.json) · [Validation](exports/reviewer/validation.json).

Rebuild existing sources: `uv run --with pillow python docs/camp-assets/scripts/export-characters.py reviewer`.

96px body cells; right walk mirrors the left strip. The common circle stays separate. Cropping, uniform sheet scaling, nearest-neighbor export and boundary-frame reuse do not replace missing artwork. Generated clothing, face and camera variations remain subject to visual approval. Application integration is outside this asset pass.
