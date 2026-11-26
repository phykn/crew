# Images / Illusion Painter

Status: all six actions exported. 22 body frames. [Roster status](characters.md).

[Standing master](candidates/images-master-v1.png) · [Full motion GIF](previews/images-motion.gif) · [All poses](previews/images-contact.png).

A playful young adult male illusion painter with golden tan skin, short tousled dark indigo hair with one muted turquoise lock, warm plum eyes and slight charming smile. Muted turquoise short open coat with plum lining, ivory shirt and cuffs, ochre narrow sash, charcoal trousers, brown/navy cuffed boots. One SMALL capped paintbrush inside a CLOSED narrow leather belt case at SCREEN-RIGHT; never held. No beret, huge brush, cape or paint splashes.

Work gesture: Two open hands frame a small imagined composition in empty air at lower chest, tiny wrist changes; no drawing, image panel or emitted trail. All props stay attached; hands remain empty. Uses the exact [shared circle](shared-magic.md).

## Production inputs

[Master prompt](images-master-prompt.md) · [Master provenance](images-master-generation.json).

- idle: [prompt](images-idle-pack-prompt.md), [source](candidates/images-idle-pack-v1.png), [provenance](images-idle-pack-generation.json), [strip](exports/images/idle.png).
- walk: [prompt](images-walk-pack-prompt.md), [source](candidates/images-walk-pack-v1.png), [provenance](images-walk-pack-generation.json), [strip](exports/images/walk.png).
- sit: [prompt](images-sit-pack-prompt.md), [source](candidates/images-sit-pack-v1.png), [provenance](images-sit-pack-generation.json), [strip](exports/images/sit.png).
- cast-start: [prompt](images-cast-start-pack-prompt.md), [source](candidates/images-cast-start-pack-v1.png), [provenance](images-cast-start-pack-generation.json), [strip](exports/images/cast-start.png).
- cast-loop: [prompt](images-cast-loop-pack-prompt.md), [source](candidates/images-cast-loop-pack-v1.png), [provenance](images-cast-loop-pack-generation.json), [strip](exports/images/cast-loop.png).
- cast-end: [prompt](images-cast-end-pack-prompt.md), [source](candidates/images-cast-end-pack-v1.png), [provenance](images-cast-end-pack-generation.json), [strip](exports/images/cast-end.png).

## Export

[Configuration](images-export.json) · [Manifest](exports/images/manifest.json) · [Validation](exports/images/validation.json).

Rebuild existing sources: `uv run --with pillow python docs/camp-assets/scripts/export-characters.py images`.

96px body cells; right walk mirrors the left strip. The common circle stays separate. Cropping, uniform sheet scaling, nearest-neighbor export and boundary-frame reuse do not replace missing artwork. Generated clothing, face and camera variations remain subject to visual approval. Application integration is outside this asset pass.
