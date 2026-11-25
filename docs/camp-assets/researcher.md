Current roster work: [Researcher full motion pack](researcher-pack.md). This page preserves the earlier animation pilot.

# Researcher Diviner Motion Candidates

Current brief: [complete researcher pose prompt pack](researcher-production-prompt.md). It includes idle, four-frame walk, seated rest, cast start/loop/end, separate ground magic, reference preparation and export checks. Earlier briefs below describe generation history.

One pilot character: cute divination mage with reduced head volume, short ochre mantle and amber crystal orb. These are generated art candidates, not normalized production sprites. All exact briefs are saved alongside this index.

[Base sprite](candidates/researcher-base-v1.png) · [Base brief](researcher-prompt.md)

## Sheets

Frame order is left-to-right, then top-to-bottom. Master direction is lower-left front three-quarter; right-facing art is intended to use horizontal flipping later. No mirrored exports were created.

| Motion | Frames | Requested layout | Actual export | Candidate | Review |
| --- | --- | --- | --- | --- | --- |
| Idle loop | 4 | 2 × 2 | 1247 × 1261 | [PNG](candidates/researcher-idle-v1.png) · [Brief](researcher-idle-prompt.md) | Four intended states visible, including blink. No broad halo in preview, but colored edge speckles remain. Some feature/foot offsets vary; exact anchor consistency unverified. Export dimensions are not divisible by the requested grid; equal-cell slicing requires normalization. |
| Walk loop | 6 | 3 × 2 | 1536 × 1024 | [PNG](candidates/researcher-walk-v1.png) · [Brief](researcher-walk-prompt.md) | Six poses show stride changes. Brown halo remains and poses do not clearly establish a fully balanced alternating cycle; actual playback unverified. |
| Seated rest | 2 | 2 × 1 | 1774 × 887 | [PNG](candidates/researcher-sit-v1.png) · [Brief](researcher-sit-prompt.md) | Two seated poses, one blinking, with both legs and boots visible and no bench. Mantle length and orb placement differ slightly from the base. Bench seat/foot alignment unverified. |
| Casting start | 4 | 2 × 2 | 1024 × 1536 | [PNG](candidates/researcher-cast-start-v1.png) · [Brief](researcher-cast-start-prompt.md) | Four poses show idle, reaching, lifting and holding the orb; the empty belt cradle is visible once lifted. Halo remains. Head and orb centers vary; final held-orb height differs from the loop candidate. |
| Casting loop | 4 | 2 × 2 | 1246 × 1263 | [PNG](candidates/researcher-cast-loop-v1.png) · [Brief](researcher-cast-loop-prompt.md) | Four chanting states including half-closed eyes. Belt cradle is omitted in some poses rather than retained empty. Colored edge artifacts and pose/feature shifts remain; orb and root alignment unverified. Export dimensions are not divisible by the requested grid; equal-cell slicing requires normalization. |
| Casting end | 4 | 2 × 2 | 1024 × 1536 | [PNG](candidates/researcher-cast-end-v1.png) · [Brief](researcher-cast-end-prompt.md) | Four poses lower and reattach the single orb before returning to idle. Brown halo remains; connection to loop/idle needs pose and scale normalization. |
| Divination effect overlay | 4 | 2 × 2 | 1246 × 1263 | [PNG](candidates/researcher-magic-v1.png) · [Brief](researcher-magic-prompt.md) | Four effect-only states, no character. Sparse amber rings and glyphs are present; pronounced colored edge artifacts remain. Orb-relative overlay alignment is unverified. Export dimensions are not divisible by the requested grid; equal-cell slicing requires normalization. |

## Follow-through before production

- Select/approve the pilot proportions and role design before extending to other roles.
- Normalize character scale, cell dimensions, foot and seated anchors, and physical orb position across sheets.
- Remove outer halos and colored edge artifacts.
- Confirm the master faces left clearly enough and check horizontal flips of equipment.
- Verify walk/cast loops and start-to-loop-to-end transitions in playback.
- Register the separate magic overlay to the held orb after pose normalization.

No application code, runtime animation, character placement, or bench behavior was changed. No additional generations or retries were made.

## GIF previews

- [All motions](previews/researcher-motion.gif): idle, left/right walk, seated rest, cast start, chant with separate effect, cast end, idle.
- [Walking loop](previews/researcher-walk.gif).
- [Chanting loop](previews/researcher-chant.gif).

Generated from existing sheets without new image generation. Original PNGs remain unchanged. Previews threshold alpha at 220 and use nearest-neighbor scaling. Walking now uses an eight-phase two-bone preview rig derived from the idle art, with fixed hips and alternating stance/swing legs. The generated walk sheets remain archived as candidates because their leg alternation was insufficient. The new bright ground magic is centered under the boot midpoint and composited behind the character. Seated scale and cross-sheet pose registration remain approximate. No runtime integration.

Rebuild with `uv run --with pillow python docs/camp-assets/scripts/preview-researcher.py`. Measurements and timings are in `previews/researcher-preview.json`.

## Walk and ground-effect revision

- [Eight-phase walk GIF](previews/researcher-walk.gif) · [Derived rig sheet](candidates/researcher-walk-rig-v1.png). This preview reuses idle artwork with two leg segments per side; upper body has only a slight bob. It is a controlled motion study, not a newly hand-drawn production walk.
- [Ground casting GIF](previews/researcher-chant.gif) · [Effect sheet](candidates/researcher-ground-magic-v1.png) · [Effect brief](researcher-ground-magic-prompt.md). Bright double amber rings, pale glyphs, turquoise accents, and intermittent side lights; behind the boots, not around the held orb.
- [Generated walk v2](candidates/researcher-walk-v2.png) · [Brief](researcher-walk-v2-prompt.md). Retained for review but not used: the same leg still leads too often and colored alpha-edge artifacts persist. No additional generation retry.

## Left-facing walk v3

[Generated sheet](candidates/researcher-walk-v3.png) · [Detailed brief](researcher-walk-v3-prompt.md). Entire figure redrawn facing left; no procedural leg rig used. Background/soft shadows remain a defect, and opposite-leg progression needs validation. Existing GIFs are not replaced by this unapproved candidate.

## Two-contact breakdown

- [First contact pair](candidates/researcher-walk-contacts-v1.png) · [Brief](researcher-walk-contacts-prompt.md). The two figures repeated the same lead-leg configuration.
- [Separately generated opposite contact](candidates/researcher-walk-opposite-v1.png) · [Brief](researcher-walk-opposite-prompt.md). Near sleeve swings forward; near leg trails behind and darker far leg reaches ahead. Identity/volume drift and halo remain. Use these as contact-pose candidates for review before drawing passing poses. No full-cycle generation or GIF replacement in this step.

## Front three-quarter camera correction

- [Camera candidate A](candidates/researcher-quarter-contact-a-v1.png) · [Detailed brief and review](researcher-quarter-contact-a-prompt.md). Both eyes and vest front now visible, improving on the near-profile view. Large head, brown halo and arm-phase ambiguity remain.
- [Contact attempt B](candidates/researcher-quarter-contact-b-v1.png) · [Detailed brief and review](researcher-quarter-contact-b-prompt.md). Camera remains close to A and arms change, but leg silhouette repeats A. Not accepted as the opposite contact.
- [Production lessons and next-character workflow](character-workflow.md). The pair is not a completed walk cycle; existing GIFs remain previous motion studies. No further generation, application integration or Git push.

## Current four-frame walk delivery

[Walk GIF](previews/researcher-walk-final.gif) · [Transparent 4 × 1 sheet](candidates/researcher-walk-final.png) · [Contact strip](previews/researcher-walk-final-contact.png) · [Detailed generation brief and result](researcher-guided-walk-prompt.md) · [Skeleton guide](reference/walk-guide.png).

A code-projected skeleton constrains near/far limb ownership and forward/back depth. The built-in generated eight-pose source is retained at `candidates/researcher-guided-walk-v1.png`; per the user's reduction request, export uses only **1, 3, 5, 7**, with no further generation. Four frames, 220 ms each, 880 ms loop; logical cell 96 × 96, transparent sheet 384 × 96, GIF 384 × 384. Shared cell transform and alpha threshold 220, no leg rig or per-pose rescaling. Both contact and passing pairs differ, with smaller drawing/registration variation remaining. This supersedes the earlier rig GIF as the current walking review asset.

Rebuild with `uv run --with pillow python docs/camp-assets/scripts/export-researcher-walk.py`. Source image, prompt, skeleton coordinates, generation script and export report are saved locally. No application integration, commit or push.
