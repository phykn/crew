# Writer / Storyweaver

Status: all six actions exported. 22 body frames. [Roster status](characters.md).

[Standing master](candidates/writer-master-v1.png) · [Full motion GIF](previews/writer-motion.gif) · [All poses](previews/writer-contact.png).

A bright young adult female storyweaver with warm light-medium skin, copper-red hair in one short low side braid, green eyes and friendly smile. Muted brick-red knee-above split coat, cream blouse with rolled broad cuffs, plum waist sash, dark brown trousers, tan cuffed boots. One short ivory quill tucked firmly into a small CLOSED leather belt pen case at SCREEN-RIGHT, never held. Small round brass collar pin. No dress, tall hat or long flowing hair.

Work gesture: One open hand makes a tiny tracing gesture in empty air at chest height, other hand supports at waist. No letters or ink trails. All props stay attached; hands remain empty. Uses the exact [shared circle](shared-magic.md).

## Production inputs

[Master prompt](writer-master-prompt.md) · [Master provenance](writer-master-generation.json).

- idle: [prompt](writer-idle-pack-prompt.md), [source](candidates/writer-idle-pack-v1.png), [provenance](writer-idle-pack-generation.json), [strip](exports/writer/idle.png).
- walk: [prompt](writer-walk-pack-prompt.md), [source](candidates/writer-walk-pack-v1.png), [provenance](writer-walk-pack-generation.json), [strip](exports/writer/walk.png).
- sit: [prompt](writer-sit-pack-prompt.md), [source](candidates/writer-sit-pack-v1.png), [provenance](writer-sit-pack-generation.json), [strip](exports/writer/sit.png).
- cast-start: [prompt](writer-cast-start-pack-prompt.md), [source](candidates/writer-cast-start-pack-v1.png), [provenance](writer-cast-start-pack-generation.json), [strip](exports/writer/cast-start.png).
- cast-loop: [prompt](writer-cast-loop-pack-prompt.md), [source](candidates/writer-cast-loop-pack-v1.png), [provenance](writer-cast-loop-pack-generation.json), [strip](exports/writer/cast-loop.png).
- cast-end: [prompt](writer-cast-end-pack-prompt.md), [source](candidates/writer-cast-end-pack-v1.png), [provenance](writer-cast-end-pack-generation.json), [strip](exports/writer/cast-end.png).

## Export

[Configuration](writer-export.json) · [Manifest](exports/writer/manifest.json) · [Validation](exports/writer/validation.json).

Rebuild existing sources: `uv run --with pillow python docs/camp-assets/scripts/export-characters.py writer`.

96px body cells; right walk mirrors the left strip. The common circle stays separate. Cropping, uniform sheet scaling, nearest-neighbor export and boundary-frame reuse do not replace missing artwork. Generated clothing, face and camera variations remain subject to visual approval. Application integration is outside this asset pass.
