# Camp characters

**All ten role appearances and six-action motion packs are exported: 220 body frames.**

[Full motion GIF](previews/characters-motion.gif) · [Casting GIF](previews/characters-working.gif) · [Standing overview](previews/characters.png) · [Machine-readable status](exports/characters.json).

| Role | Body frames | Pack |
|---|---:|---|
| interpreter | 22 | [Details](interpreter-pack.md) |
| conductor | 22 | [Details](conductor.md) |
| researcher | 22 | [Details](researcher-pack.md) |
| coder | 22 | [Details](adventurer-classic-prompt.md) |
| writer | 22 | [Details](writer-pack.md) |
| reviewer | 22 | [Details](reviewer-pack.md) |
| proofreader | 22 | [Details](proofreader-pack.md) |
| tester | 22 | [Details](tester-pack.md) |
| images | 22 | [Details](images-pack.md) |
| librarian | 22 | [Details](librarian-pack.md) |

## Motions and validation

Each role has idle4, walk4, sit2, cast-start4, cast-loop4 and cast-end4 in 96px logical body cells. Right walk mirrors the same strip. The full overview runs 60 frames / 16.32 seconds; walking loops at 880ms and casting at 720ms.

All body frames passed binary-alpha and interior-bounds checks. New casting packs reuse canonical whole boundary frames between idle, start, loop and end. Every role references the identical separate shared circle; its SHA-256 remains `02979a11f104e5c801fcd8b658afcbff420f8e67b1642bc08a7593323a944b79`. Source artwork and exported casting contact sheets were inspected for pose progression and empty-hand prop continuity. Small generated variations in face, clothing and perspective remain; this does not establish pixel-identical animation or in-app placement.

Tester walk v2 replaces the repeated contact arm phase with distinct opposite phases. Tester cast-end v1 had a textured backdrop and shadow; v2 was regenerated with alpha transparency. Both earlier candidates remain preserved.

## Rebuild

For each of the eight newly created roles: `uv run --with pillow python docs/camp-assets/scripts/export-characters.py reviewer` (substitute the role ID). Then run `uv run --with pillow python docs/camp-assets/scripts/characters-gallery.py`. Existing adventurer/coder and conductor packs retain their original exporters.

[Production contract](characters-motion-contract.json) · [Role designs](characters-plan.json) · [Completed jobs and prompts](characters-pending.json) · [Workflow lessons](character-workflow.md) · [Shared effect](shared-magic.md).

Generation used the built-in image tool. All originals, exact prompts, provenance, strips and previews are saved locally under `docs/camp-assets`. The prior usage limit cleared; no pending sheets or repairs remain. No application integration, commit or push was performed.
