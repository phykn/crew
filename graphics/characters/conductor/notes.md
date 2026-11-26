# Conductor Mage

[Full motion GIF](previews/conductor-motion.gif) · [All poses](previews/conductor-contact.png) · [Casting GIF](previews/conductor-cast-loop.gif) · [Complete production prompt](conductor-motion-prompts.md).

Original coordination mage for the project's conductor role: compact ink-blue bob, brass clip, navy/ivory coat, plum sash and one ivory/brass baton. Same physical family and elevated lower-left three-quarter camera as the accepted adventurer.

## Delivered assets

Body strips in `exports/conductor/`, 96 × 96 RGBA cells, left-to-right frame order:

| Action | Frames | Duration |
| --- | --- | --- |
| idle | 4 | 1880 ms |
| walk | 4 | 880 ms |
| sit | 2 | 1130 ms |
| cast-start | 4 | 1000 ms |
| cast-loop | 4 | 720 ms |
| cast-end | 4 | 1140 ms |

Use horizontal mirroring for rightward movement. [Both-direction walk preview](previews/conductor-walk-both.gif). Start/end are one-shot actions; idle, walk, sit and casting are loops.

The [full GIF](previews/conductor-motion.gif) is 440 × 440, 60 frames, 16320 ms: idle, left walk, right walk, rest, draw baton, conduct with shared circle, stow baton, idle. Repetitions demonstrate loops; transitions run once.

## Tool continuity and shared magic

The SCREEN-LEFT arm reaches across the sash to draw the single baton from the SCREEN-RIGHT belt loop. The same hand conducts and returns it; the other hand opens in support. The loop stays empty while the baton is held. Cast-start v1/v2 switched hands and are rejected. Selected v3 corrects the cross-body draw.

Use the exact [shared circle](shared-magic.md), `exports/shared/ward-circle.png`: four 128px cells, 180 ms each, ground anchor (64,86), behind the character. It is not duplicated into this pack. Body sheets remain effect-free.

Whole canonical frames are reused: idle1 = start1 = end4; start4 = loop1 = end1. This makes transition boundaries identical without rebuilding limbs.

## Sources, reproduction and validation

[Generation provenance](conductor-generation.json) indexes eight built-in calls: six action sheets plus two targeted start corrections. [Master appearance prompt](conductor-prompt.md), [complete motion contract](conductor-motion-prompts.md), [final casting prompts](conductor-casting-prompts.md), [selected cross-body edit](conductor-cross-draw-prompt.md). Original sources are kept alongside selected candidates.

Rebuild with `uv run --with pillow python docs/camp-assets/scripts/export-conductor.py`. [Export config](conductor-export.json) selects source revisions. [Manifest](exports/conductor/manifest.json) records transforms/timing; [validation](exports/conductor/validation.json) records bounds, binary body alpha, identical transition boundaries and unchanged shared-effect hash.

Export inspection covered all six actions on dark and light backgrounds, selected casting poses with the shared effect, and GIF frame counts/durations. All body frames fit their cells. Normalization uses one scale per source sheet and grid origin registration; no per-pose scaling or limb reconstruction. Small generated changes in coat details, hair and expression remain between drawings; four-frame movement is intentionally stepped. Runtime integration remains a separate stage.
