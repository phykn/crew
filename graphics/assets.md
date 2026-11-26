# Camp Asset Candidates

Art-only deliverables generated with the built-in image tool. No application integration, commits, or pushes. The character pilot is listed separately below. Prompt files preserve the exact generation briefs and source measurements.

## Latest batch

| Asset | PNG | Prompt | Export | Review |
| --- | --- | --- | --- | --- |
| Lantern Body | [Image](props/lantern-body.png) | [Brief](props/lantern-body.md) | 1024 × 1536 | Complete stake and lantern cage are present. Soft brown outer halo remains; cage opening transparency needs a later compositing check. |
| Lantern Light Insert | [Image](props/lantern-light.png) | [Brief](props/lantern-light.md) | 1536 × 1024 | Separate amber insert produced. External glow exceeds the requested hard boundary. |
| Torch Body | [Image](props/torch-body.png) | [Brief](props/torch-body.md) | 887 × 1774 | Unlit pole and cup read clearly; cup is taller/deeper than the minimalist source head. |
| Torch Flame Frames | [Image](props/torch-flames.png) | [Brief](props/torch-flames.md) | 2172 × 724 | Four states are visible in one row. Export is 2172 × 724: four equal slices would be 543 × 724, so the requested square cells were not produced. Exact root alignment, frame boundaries, and looping have not been validated. |
| Campfire Hearth | [Image](props/hearth.png) | [Brief](props/hearth.md) | 1774 × 887 | Low stone ring and three overlapping logs are present. Minor colored edge artifacts remain. |
| Campfire Flame Frames | [Image](props/campfire-flames.png) | [Brief](props/campfire-flames.md) | 2172 × 724 | Four states are visible in one row. Export is 2172 × 724: four equal slices would be 543 × 724, so the requested square cells were not produced. Exact root alignment, frame boundaries, and looping have not been validated. Stray edge flecks remain around some tongues. |
| Smoke Frames | [Image](props/smoke.png) | [Brief](props/smoke.md) | 2172 × 724 | Four states are visible in one row. Export is 2172 × 724: four equal slices would be 543 × 724, so the requested square cells were not produced. Exact root alignment, frame boundaries, and looping have not been validated. Smoke is lighter and smoother than the requested subdued pixel clusters, with edge artifacts. |
| Ember Frames | [Image](props/sparks.png) | [Brief](props/sparks.md) | 2172 × 724 | Four states are visible in one row. Export is 2172 × 724: four equal slices would be 543 × 724, so the requested square cells were not produced. Exact root alignment, frame boundaries, and looping have not been validated. The last particle remains bright rather than clearly faint. |
| Grass Ground Texture | [Image](props/ground-grass.png) | [Brief](props/ground-grass.md) | 1254 × 1254 | Fully filled opaque square texture. Seamless repetition has not been verified. |
| Dirt Ground Texture | [Image](props/ground-dirt.png) | [Brief](props/ground-dirt.md) | 1254 × 1254 | Fully filled opaque square texture. Seamless repetition has not been verified. |
| Worn Ground Texture | [Image](props/ground-worn.png) | [Brief](props/ground-worn.md) | 1254 × 1254 | Fully filled opaque square texture, visually close to the dirt candidate. Material separation is weaker than requested; repetition unverified. |
| Grass–Dirt Edge Overlay | [Image](props/ground-edge.png) | [Brief](props/ground-edge.md) | 1254 × 1254 | Transparent upper region and earthy lower region produced. Boundary has a more continuous olive band than requested; horizontal repeat unverified. |
| Wooden Bench — World Y | [Image](props/bench-cross.png) | [Brief](props/bench-cross.md) | 1774 × 887 | Perpendicular wooden variant has the requested upper-right/lower-left long axis. Four legs and clear seat surface are visible; sitting alignment untested. |
| Stone Bench | [Image](props/bench-stone.png) | [Brief](props/bench-stone.md) | 1672 × 941 | Long slab, two supports, and two tiny moss accents are visible. Source-facing orientation agrees; seating alignment untested. |

## Earlier exports

Approved crate: [Image](props/crate.png) · [Brief](props/crate.md). All other images remain candidates; acceptance in conversation has not been converted into production integration.

- [barrel](props/barrel.png) · [Brief](props/barrel.md)
- [bench](props/bench.png) · [Brief](props/bench.md)
- [fern](props/fern.png) · [Brief](props/fern.md)
- [grass](props/grass.png) · [Brief](props/grass.md)
- [hay](props/hay.png) · [Brief](props/hay.md)
- [log](props/log.png) · [Brief](props/log.md)
- [pine](props/pine.png) · [Brief](props/pine.md)
- [rock](props/rock.png) · [Brief](props/rock.md)
- [tent](props/tent.png) · [Brief](props/tent.md)
- [wagon](props/wagon.png) · [Brief](props/wagon.md)
- [well](props/well.png) · [Brief](props/well.md)
- [woodpile](props/woodpile.png) · [Brief](props/woodpile.md)

## Integration limits

Transparent props carry alpha channels; this alone does not establish clean cutouts. Opaque ground tiles intentionally have no alpha. Visual deviations are recorded above and in each brief. Frame slicing/anchors, terrain repeat seams, actual display size, compositing, and seating alignment remain for the later integration phase. No automatic regeneration was performed.

## Character pilot

- [Basic adventurer — standing](characters/candidates/adventurer-v1.png) · [Detailed brief](characters/adventurer-prompt.md). Concept candidate, approval pending. Visible outer halo remains; not a production-ready cutout or animation.

- [Cute adventurer — chibi revision](characters/candidates/adventurer-chibi-v1.png) · [Detailed brief](characters/adventurer-chibi-prompt.md). New cute/anime direction, approval pending; halo and front-facing camera remain review items.

## Researcher animation pilot

[Base, six motion candidates and separate magic overlay](characters/researcher.md). Includes exact briefs and visual deviations. Unapproved generated artwork; normalization, alpha cleanup and playback validation remain.

[Character production lessons and next-step checklist](characters/character-workflow.md). Read before the next character or animation request.

## Adventurer — classic fantasy proportion revision

[Standing candidate](characters/candidates/adventurer-classic-v1.png) · [Detailed prompt and review](characters/adventurer-classic-prompt.md) · [User proportion reference](characters/reference/adventurer-proportions.jpg). Attachment supplies body balance and overall classic fantasy appeal only; pixel medium and camp camera remain project-specific. Green travel tunic, red neckerchief and a pale-teal belt wardstone distinguish this practical adventurer mage from the researcher. Appearance accepted; [the full motion delivery](characters/adventurer.md) now includes all six character actions and a separate ground-effect layer. No runtime integration.

## Shared casting circle

[Approved common effect and metadata](characters/shared-magic.md): reuse the same rising-light ward circle for every character. Canonical PNG is `characters/exports/shared/ward-circle.png`; no per-role effect generation.

## Conductor mage — complete motion pack

[Standing master candidate](characters/candidates/conductor-base-v1.png) · [Detailed prompt and review](characters/conductor-prompt.md) · [Role index](characters/conductor.md). Navy/ivory/plum female coordination mage with compact blue bob and one belt-mounted short wand; same physical family as the accepted adventurer. [Full six-action delivery](characters/conductor.md), [combined GIF](characters/previews/conductor-motion.gif) and [complete motion prompts](characters/conductor-motion-prompts.md). Uses [the shared ground effect](characters/shared-magic.md); no separate effect generation.

## Current role roster

[All ten characters, motion progress and remaining jobs](characters/characters.md). The older researcher animation pilot above is historical; the current design and exports are in [characters/researcher-pack.md](characters/researcher-pack.md).
