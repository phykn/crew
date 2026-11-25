# Librarian / Archive Keeper

Status: all six actions exported. 22 body frames. [Roster status](characters.md).

[Standing master](candidates/librarian-master-v1.png) · [Full motion GIF](previews/librarian-motion.gif) · [All poses](previews/librarian-contact.png).

A gentle adult female archive keeper with warm dark brown skin, dark plum hair in a compact low bun with two short cheek locks, amber eyes and small round brass spectacles with clearly visible eyes. Deep moss-green short split coat over ivory high-collar blouse with wide cuffs, muted burgundy sash, dark brown trousers, sturdy brown boots. One SMALL CLOSED tan book secured flush in a leather SCREEN-RIGHT belt cradle, no loose pages. Calm soft smile. No robe, giant book, hat or flowing cape.

Work gesture: Open palms held comfortably like supporting an invisible open book at waist, but no physical book or orb appears in hands. All props stay attached; hands remain empty. Uses the exact [shared circle](shared-magic.md).

## Production inputs

[Master prompt](librarian-master-prompt.md) · [Master provenance](librarian-master-generation.json).

- idle: [prompt](librarian-idle-pack-prompt.md), [source](candidates/librarian-idle-pack-v1.png), [provenance](librarian-idle-pack-generation.json), [strip](exports/librarian/idle.png).
- walk: [prompt](librarian-walk-pack-prompt.md), [source](candidates/librarian-walk-pack-v1.png), [provenance](librarian-walk-pack-generation.json), [strip](exports/librarian/walk.png).
- sit: [prompt](librarian-sit-pack-prompt.md), [source](candidates/librarian-sit-pack-v1.png), [provenance](librarian-sit-pack-generation.json), [strip](exports/librarian/sit.png).
- cast-start: [prompt](librarian-cast-start-pack-prompt.md), [source](candidates/librarian-cast-start-pack-v1.png), [provenance](librarian-cast-start-pack-generation.json), [strip](exports/librarian/cast-start.png).
- cast-loop: [prompt](librarian-cast-loop-pack-prompt.md), [source](candidates/librarian-cast-loop-pack-v1.png), [provenance](librarian-cast-loop-pack-generation.json), [strip](exports/librarian/cast-loop.png).
- cast-end: [prompt](librarian-cast-end-pack-prompt.md), [source](candidates/librarian-cast-end-pack-v1.png), [provenance](librarian-cast-end-pack-generation.json), [strip](exports/librarian/cast-end.png).

## Export

[Configuration](librarian-export.json) · [Manifest](exports/librarian/manifest.json) · [Validation](exports/librarian/validation.json).

Rebuild existing sources: `uv run --with pillow python docs/camp-assets/scripts/export-characters.py librarian`.

96px body cells; right walk mirrors the left strip. The common circle stays separate. Cropping, uniform sheet scaling, nearest-neighbor export and boundary-frame reuse do not replace missing artwork. Generated clothing, face and camera variations remain subject to visual approval. Application integration is outside this asset pass.
