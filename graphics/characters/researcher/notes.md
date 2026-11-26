# Researcher / Diviner

Status: all six actions exported. 22 body frames. [Roster status](characters.md).

[Standing master](candidates/researcher-master-v1.png) · [Full motion GIF](previews/researcher-motion.gif) · [All poses](previews/researcher-contact.png).

A curious young adult male diviner with medium warm skin, chestnut wavy short hair, moss-hazel eyes, rounded modest spectacles with visible eyes. Ochre short shoulder mantle ending above elbows over an ivory blouse and olive sleeveless tunic, cocoa trousers, sturdy dark boots. One SMALL amber lens in a bronze CLOSED belt cradle at SCREEN-RIGHT, always attached. No held orb, no giant hat. Thoughtful friendly expression.

Work gesture: Palms frame a small empty space before waist, gazing thoughtfully; no orb drawn. All props stay attached; hands remain empty. Uses the exact [shared circle](shared-magic.md).

## Production inputs

[Master prompt](researcher-master-prompt.md) · [Master provenance](researcher-master-generation.json).

- idle: [prompt](researcher-idle-pack-prompt.md), [source](candidates/researcher-idle-pack-v1.png), [provenance](researcher-idle-pack-generation.json), [strip](exports/researcher/idle.png).
- walk: [prompt](researcher-walk-pack-prompt.md), [source](candidates/researcher-walk-pack-v1.png), [provenance](researcher-walk-pack-generation.json), [strip](exports/researcher/walk.png).
- sit: [prompt](researcher-sit-pack-prompt.md), [source](candidates/researcher-sit-pack-v1.png), [provenance](researcher-sit-pack-generation.json), [strip](exports/researcher/sit.png).
- cast-start: [prompt](researcher-cast-start-pack-prompt.md), [source](candidates/researcher-cast-start-pack-v1.png), [provenance](researcher-cast-start-pack-generation.json), [strip](exports/researcher/cast-start.png).
- cast-loop: [prompt](researcher-cast-loop-pack-prompt.md), [source](candidates/researcher-cast-loop-pack-v1.png), [provenance](researcher-cast-loop-pack-generation.json), [strip](exports/researcher/cast-loop.png).
- cast-end: [prompt](researcher-cast-end-pack-prompt.md), [source](candidates/researcher-cast-end-pack-v1.png), [provenance](researcher-cast-end-pack-generation.json), [strip](exports/researcher/cast-end.png).

## Export

[Configuration](researcher-export.json) · [Manifest](exports/researcher/manifest.json) · [Validation](exports/researcher/validation.json).

Rebuild existing sources: `uv run --with pillow python docs/camp-assets/scripts/export-characters.py researcher`.

96px body cells; right walk mirrors the left strip. The common circle stays separate. Cropping, uniform sheet scaling, nearest-neighbor export and boundary-frame reuse do not replace missing artwork. Generated clothing, face and camera variations remain subject to visual approval. Application integration is outside this asset pass.
