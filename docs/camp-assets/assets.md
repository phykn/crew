# Camp Asset Candidates

Art-only deliverables generated with the built-in image tool. No application integration, commits, or pushes. The character pilot is listed separately below. Prompt files preserve the exact generation briefs and source measurements.

## Latest batch

| Asset | PNG | Prompt | Export | Review |
| --- | --- | --- | --- | --- |
| Lantern Body | [Image](candidates/lantern-body-v1.png) | [Brief](lantern-body-prompt.md) | 1024 × 1536 | Complete stake and lantern cage are present. Soft brown outer halo remains; cage opening transparency needs a later compositing check. |
| Lantern Light Insert | [Image](candidates/lantern-light-v1.png) | [Brief](lantern-light-prompt.md) | 1536 × 1024 | Separate amber insert produced. External glow exceeds the requested hard boundary. |
| Torch Body | [Image](candidates/torch-body-v1.png) | [Brief](torch-body-prompt.md) | 887 × 1774 | Unlit pole and cup read clearly; cup is taller/deeper than the minimalist source head. |
| Torch Flame Frames | [Image](candidates/torch-flames-v1.png) | [Brief](torch-flames-prompt.md) | 2172 × 724 | Four states are visible in one row. Export is 2172 × 724: four equal slices would be 543 × 724, so the requested square cells were not produced. Exact root alignment, frame boundaries, and looping have not been validated. |
| Campfire Hearth | [Image](candidates/hearth-v1.png) | [Brief](hearth-prompt.md) | 1774 × 887 | Low stone ring and three overlapping logs are present. Minor colored edge artifacts remain. |
| Campfire Flame Frames | [Image](candidates/campfire-flames-v1.png) | [Brief](campfire-flames-prompt.md) | 2172 × 724 | Four states are visible in one row. Export is 2172 × 724: four equal slices would be 543 × 724, so the requested square cells were not produced. Exact root alignment, frame boundaries, and looping have not been validated. Stray edge flecks remain around some tongues. |
| Smoke Frames | [Image](candidates/smoke-v1.png) | [Brief](smoke-prompt.md) | 2172 × 724 | Four states are visible in one row. Export is 2172 × 724: four equal slices would be 543 × 724, so the requested square cells were not produced. Exact root alignment, frame boundaries, and looping have not been validated. Smoke is lighter and smoother than the requested subdued pixel clusters, with edge artifacts. |
| Ember Frames | [Image](candidates/sparks-v1.png) | [Brief](sparks-prompt.md) | 2172 × 724 | Four states are visible in one row. Export is 2172 × 724: four equal slices would be 543 × 724, so the requested square cells were not produced. Exact root alignment, frame boundaries, and looping have not been validated. The last particle remains bright rather than clearly faint. |
| Grass Ground Texture | [Image](candidates/ground-grass-v1.png) | [Brief](ground-grass-prompt.md) | 1254 × 1254 | Fully filled opaque square texture. Seamless repetition has not been verified. |
| Dirt Ground Texture | [Image](candidates/ground-dirt-v1.png) | [Brief](ground-dirt-prompt.md) | 1254 × 1254 | Fully filled opaque square texture. Seamless repetition has not been verified. |
| Worn Ground Texture | [Image](candidates/ground-worn-v1.png) | [Brief](ground-worn-prompt.md) | 1254 × 1254 | Fully filled opaque square texture, visually close to the dirt candidate. Material separation is weaker than requested; repetition unverified. |
| Grass–Dirt Edge Overlay | [Image](candidates/ground-edge-v1.png) | [Brief](ground-edge-prompt.md) | 1254 × 1254 | Transparent upper region and earthy lower region produced. Boundary has a more continuous olive band than requested; horizontal repeat unverified. |
| Wooden Bench — World Y | [Image](candidates/bench-cross-v1.png) | [Brief](bench-cross-prompt.md) | 1774 × 887 | Perpendicular wooden variant has the requested upper-right/lower-left long axis. Four legs and clear seat surface are visible; sitting alignment untested. |
| Stone Bench | [Image](candidates/bench-stone-v1.png) | [Brief](bench-stone-prompt.md) | 1672 × 941 | Long slab, two supports, and two tiny moss accents are visible. Source-facing orientation agrees; seating alignment untested. |

## Earlier exports

Approved crate: [Image](approved/crate.png) · [Brief](crate-prompt.md). All other images remain candidates; acceptance in conversation has not been converted into production integration.

- [barrel](candidates/barrel-v1.png) · [Brief](barrel-prompt.md)
- [bench](candidates/bench-v1.png) · [Brief](bench-prompt.md)
- [fern](candidates/fern-v1.png) · [Brief](fern-prompt.md)
- [grass](candidates/grass-v1.png) · [Brief](grass-prompt.md)
- [hay](candidates/hay-v1.png) · [Brief](hay-prompt.md)
- [log](candidates/log-v1.png) · [Brief](log-prompt.md)
- [pine](candidates/pine-v1.png) · [Brief](pine-prompt.md)
- [rock](candidates/rock-v1.png) · [Brief](rock-prompt.md)
- [tent](candidates/tent-v1.png) · [Brief](tent-prompt.md)
- [wagon](candidates/wagon-v1.png) · [Brief](wagon-prompt.md)
- [well](candidates/well-v1.png) · [Brief](well-prompt.md)
- [woodpile](candidates/woodpile-v1.png) · [Brief](woodpile-prompt.md)

## Integration limits

Transparent props carry alpha channels; this alone does not establish clean cutouts. Opaque ground tiles intentionally have no alpha. Visual deviations are recorded above and in each brief. Frame slicing/anchors, terrain repeat seams, actual display size, compositing, and seating alignment remain for the later integration phase. No automatic regeneration was performed.

## Character pilot

- [Basic adventurer — standing](candidates/adventurer-v1.png) · [Detailed brief](adventurer-prompt.md). Concept candidate, approval pending. Visible outer halo remains; not a production-ready cutout or animation.

- [Cute adventurer — chibi revision](candidates/adventurer-chibi-v1.png) · [Detailed brief](adventurer-chibi-prompt.md). New cute/anime direction, approval pending; halo and front-facing camera remain review items.

## Researcher animation pilot

[Base, six motion candidates and separate magic overlay](researcher.md). Includes exact briefs and visual deviations. Unapproved generated artwork; normalization, alpha cleanup and playback validation remain.

[Character production lessons and next-step checklist](character-workflow.md). Read before the next character or animation request.

## Adventurer — classic fantasy proportion revision

[Standing candidate](candidates/adventurer-classic-v1.png) · [Detailed prompt and review](adventurer-classic-prompt.md) · [User proportion reference](reference/adventurer-proportions.jpg). Attachment supplies body balance and overall classic fantasy appeal only; pixel medium and camp camera remain project-specific. Green travel tunic, red neckerchief and a pale-teal belt wardstone distinguish this practical adventurer mage from the researcher. Appearance accepted; [the full motion delivery](adventurer.md) now includes all six character actions and a separate ground-effect layer. No runtime integration.

## Shared casting circle

[Approved common effect and metadata](shared-magic.md): reuse the same rising-light ward circle for every character. Canonical PNG is `exports/shared/ward-circle.png`; no per-role effect generation.

## Conductor mage — complete motion pack

[Standing master candidate](candidates/conductor-base-v1.png) · [Detailed prompt and review](conductor-prompt.md) · [Role index](conductor.md). Navy/ivory/plum female coordination mage with compact blue bob and one belt-mounted short wand; same physical family as the accepted adventurer. [Full six-action delivery](conductor.md), [combined GIF](previews/conductor-motion.gif) and [complete motion prompts](conductor-motion-prompts.md). Uses [the shared ground effect](shared-magic.md); no separate effect generation.

## Current role roster

[All ten characters, motion progress and remaining jobs](characters.md). The older researcher animation pilot above is historical; the current design and exports are in [researcher-pack.md](researcher-pack.md).
