# Character Production Notes

For the next requested generation of this researcher, use [the complete pose prompt pack](researcher-production-prompt.md). It consolidates the shared identity/camera contract and all action-specific briefs; this file records the lessons behind it.

## Current target

Cute anime-influenced woodland mage guild. Reduced hair/head volume near three-head height, warm expressive face, readable hands and boots. Roles use distinct clothing silhouettes and a restrained magical tool. Work is chanting. Active work uses a conspicuous separate ground magic circle, not a tiny chest effect. Left/right variants use a shared front-three-quarter master where appropriate.

The desired view is gently elevated, showing both eyes and the chest front. A yaw around 40–45 degrees from frontal is a prompt guide; judge the image, not the number. The 70–90-degree near-profile fix solved directional ambiguity but lost the user's requested composition.

## Shared work effect — approved for all roles

Use [the canonical shared casting circle](shared-magic.md), `exports/shared/ward-circle.png`, for every character. Four 128-pixel cells, 180 ms each, ground anchor (64,86), separate layer behind the body. Reuse the exact ornate teal/gold circle with straight rising light; do not generate another effect or revert to liquid-shaped ribbons for the next role. Character-specific art includes only the person, clothing and physical tool.

## What failed and what to change

| Evidence | Next action |
| --- | --- |
| Frontal torso plus laterally moving legs looked like crab walking. | Lock head/chest/pelvis/knee/toe heading together. Move feet forward/back along that heading, with depth occlusion. |
| Rotating too far produced a one-eye profile. | Specify visible near and far eyes, both vest-front panels, and a narrower side plane; use visual acceptance checks before motion expansion. |
| Eight-frame sheets repeated the same leading leg. | Establish two separately generated opposite-contact poses first. Identify near/far anatomical sides, their consistent shading, and opposite arm swing. Do not equate figure count with a completed cycle. |
| The two-pose sheet also repeated the same phase. | Generate the missing opposite contact independently using the successful pose as the identity/camera reference. |
| Procedural cutout legs alternated mechanically but still read as crab walking. | Do not substitute an improvised leg rig for correct full-body drawing. Label rig previews as motion studies, not repaired sprite art. |
| Scaling/cropping each pose independently introduced drift. | Use shared scale, body/root/foot coordinates and source cell boundaries. Do not align a swinging foot to the floor on every frame. |
| Detailed prompts did not guarantee exact alpha, frame cells or anatomy. | Inspect actual pixels and silhouettes. RGBA presence alone is not proof of a clean cutout. |
| References carried brown halos or nearly opaque checkerboards into new art. | Explicitly separate identity/style reference from defects. Validate alpha extrema and edge quality before calling an asset production-ready. |
| Mantle, hair, head and belt cradle changed across sheets. | Reuse one approved master, list invariants and change only the current variable. Keep physical orb ownership continuous across cast transitions. |
| Small orb-level effects did not clearly show active work. | Use a large bright ground ellipse behind the boots, double rings, readable moving glyphs and restrained rising accents; keep body readable. |

## Order for the next character

1. Read the accepted concept and the exact current references; distinguish user-approved style from unapproved generated candidates.
2. Write and save the detailed English prompt before any requested generation. Name each reference's role and the single intended change.
3. Establish one full-body master at the desired camera and display proportions. Check face, front/side planes, head size, complete silhouette and actual alpha.
4. Produce the two opposite walking contact poses separately, using the master to lock identity/camera. Verify the near limb changes front/back and arm swing reverses without mirroring the whole character.
5. Once opposite contacts are established, add the two passing poses for a minimal four-frame cycle. The user requested fewer frames in the latest revision; start with four for later walking work. Add down/up poses only when needed and requested.
6. Assemble a GIF from the real drawings with fixed scale/root coordinates. Examine forward direction, foot contacts, leg alternation, loop transitions and identity drift. Do not hide source defects with per-frame rescaling or call a key-pose toggle a finished walk.
7. Extend the accepted master to idle, seated and cast start/loop/end; keep character and effect layers separate. Align seat and foot anchors to the renderer during the later integration phase.
8. Document what actually passed and what remains a candidate. Do not report a generation attempt as a completed fix.

## Latest camera correction review

The new contact A improves both-eye and vest-front visibility, but still carries a brown halo and a larger-than-target head. Its arm phase is not reliable enough to declare the anatomical contact solved. A good camera correction does not automatically approve proportions, limb ownership, or alpha. Keep these checks separate and report their actual outcome.

The separately requested contact B retained the camera but repeated the same forward/back boot silhouette; arm movement alone does not verify leg alternation. Two independent calls also do not guarantee opposite contacts. Before another paid attempt, simplify to an explicit anatomical pose reference (clearly labeled near/far limb ownership), keep the approved camera as a separate reference, and obtain the user's generation request. That unguided pair must not be expanded into passing poses or a GIF.

## Generation and scope

Generate images only when the user requests it; do not automatically produce variants, retries, complete role rosters or new animations. If the requested deliverable is clearly missing one pose, identify that failure and target only that missing part. Preserve approved originals and label rejected candidates in the index. Asset work does not authorize application integration or pushing local docs to Git.

These are project-local lessons from the current session. No cross-project user wiki rules were changed.

## Skeleton-guided follow-through

The user subsequently authorized detailed prompts and a code-built skeleton to finish the walk. `scripts/walk-guide.py` defines actual 3D leg joints and projects them into the shared lower-left camera. Pink/teal side ownership, opposite arm swing, and contact/passing phases made the generated poses more distinct than prose-only instructions. One pose first established the foreground crossing; the full guide then yielded an eight-pose source. A skeleton remains guidance, not hard control: inspect the rendered anatomy and registration.

The latest user preference is a **four-frame** walk, exported from source 1/3/5/7 at an unchanged 880 ms cycle. Use the minimum useful contact/passing cycle before paying for additional phases. Export from shared cell coordinates and keep the source unchanged; do not repair gait by independently fitting silhouettes or moving cutout legs.
