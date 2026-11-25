# Adventurer — Complete Motion Production

The user accepted `candidates/adventurer-classic-v1.png` and requested this character's full motion set. Generate only this character: idle 4, walk 4, seated 2, cast start 4, chant loop 4, cast end 4, ground effect 4. All character sheets use the selected appearance and lower-left elevated three-quarter camera. Ground effects remain separate. Asset preparation and previews only; no application integration or Git push.

## Common character prompt

```text
Use case: identity-preserve with anatomical pose guidance.
Create the EXISTING adventurer ward-mage in the requested action. The original master reference is the exact identity, not inspiration for a redesign. Preserve its actual accepted head/body ratio rather than trying to enforce an earlier numerical ideal.

IDENTITY LOCK
Same short tousled dark-chestnut hair with the same fringe and broad locks, warm tan/light-medium skin, expressive hazel-brown eyes with modest highlights, gentle eyebrows, small confident friendly smile. Same moderately enlarged head, visible short neck, substantial compact torso, actual knees and sturdy boots. No growing hair volume or baby head, new face, realistic jaw or lanky limbs. Same sage/olive-green short travel tunic with its split upper-thigh hem, ivory sleeves and broad cuffs, close-fitting faded brick-red neckerchief, narrow brown belt, cocoa trousers and brown cuffed boots. Maintain clothing cuts, hems, palette, scale and pixel density. No hood, hat, cape, armor, staff, sword, bag, researcher mantle or amber orb.

ONE PHYSICAL TOOL
Exactly one small flat pale-teal wardstone in the existing leather attachment at the visible screen-right/near-side belt. Match its actual size and shape. In idle/walk/seated, keep it secured. During casting, the near hand unclips that SAME stone while the persistent leather tab stays attached and visibly EMPTY, then returns it at the end. Never duplicate a stone between hands and belt or erase the attachment. It is not a round crystal ball. Physical tool highlights are subdued; all emitted magic is a separate ground layer.

CAMERA AND ANATOMY
Same gently elevated FRONT THREE-QUARTER toward screen LOWER-LEFT. Both eyes visible, far eye narrower; show chest front and narrower near-side plane, some hair crown, shoulder tops and boot tops. Do not copy a frontal body with sideways feet. Head/chest/pelvis/knees/toes share one lower-left heading; no one-eye profile, camera rotation or whole-character mirror within a sheet. Near anatomical shoulder and hip start at screen-right on the wardstone side. Near limbs keep ownership when crossing the silhouette. Far limbs start screen-left and render behind where occluded. Slightly warmer/lighter near trousers, darker far trousers. Trace continuous hip→knee→ankle→boot and shoulder→elbow→hand connections. Guide pink=near and teal=far; replace guide colors with actual clothes, never print bones or text.

SHEET AND REGISTRATION
Follow the action block's exact frame count, equal cells and row-major order. One complete figure per cell, no extra views. Same body dimensions, head width, limb lengths, camera and ground-root position. Standing crown approximately 7% from cell top and boot soles around 90%, generous side margins; these are layout guides, not permission to stretch the body. A supplied skeleton controls joint connections and phase, not a new face/outfit. Never center each changing silhouette independently or enlarge a seated figure to standing height. Lifted feet stay lifted; don't align every boot to the floor. Planted poses retain consistent soles and belt/root anchors. Keep sleeves, hands, crown and boots within each cell.

PIXEL CUTOUT
Crisp stepped edges and deliberate grouped warm colors on a coherent coarse pixel grid, neutral upper-left material shading, readable in a later 96×96 logical cell. No smooth painted anime portrait, glossy 3D, skin texture, fabric noise, dithering cloud, contour blur or heavy sticker border. Actual transparent PNG, zero alpha outside the body and inside limb gaps. Opaque character pixels, no translucent body. No brown/green halo, colored edge noise, shadow, floor, pedestal, drawn checkerboard, gradient backdrop, labels, numbers, gridlines, border, watermark or scenery. No glow, particles, light rays or magic circles baked into the character. Preserve the face and readable hand/prop contacts.
```

## Idle

```text
FOUR frames, 2×2 equal square cells, row-major, restrained standing IDLE LOOP. Image 1 is the accepted adventurer master. Both hands empty and relaxed beside torso, boots planted, single pale-teal stone secured at near-side belt. Preserve the master standing silhouette.
1: eyes open, friendly neutral smile, relaxed shoulders. This is canonical idle.
2: subtle inhale, shoulders at most one logical pixel higher, belt/feet stable.
3: gentle blink, original torso height; hands/tool unchanged.
4: eyes reopen, tiny settling toward frame 1. No wave, head turn, step or big bob.
Keep all four frames the same height/scale and root; frame 4→1 changes gently. Frame 1 will be reused as the exact cast-start and cast-end boundary.
```

## Walk

```text
FOUR frames only, 2×2 equal square cells, row-major WALK LOOP. Image 1 fixes accepted adventurer identity. Image 2 is the four-pose code-projected skeleton; use its actual near/far connections and opposite arm swing, remove all guide colors and marks. Ordinary modest walking, one lower-left direction, wardstone secured.
1 NEAR CONTACT: lighter near leg from screen-right hip crosses toward forward/lower-left boot, heel lands. Darker far leg trails upper-right with heel lifted/toe contacting. Near arm back, far arm forward.
2 FAR PASSING: near foot supports beneath pelvis; darker far knee advances and lifted boot passes beside support shin. Arms pass neutral. Narrow leg projection, not another open contact stride.
3 FAR CONTACT: darker far leg from screen-left hip now leads lower-left, heel lands. Lighter near leg trails upper-right, rear heel lifted. Near arm forward, far arm back. Actual opposite anatomical lead to frame 1, not just different arms.
4 NEAR PASSING: far foot supports, lighter near knee/boot lifts and passes beside it; arms pass neutral toward frame 1. Opposite lifted leg to frame 2.
Whole head/chest/pelvis/knees/toes face lower-left. Feet move left AND toward viewer when forward, right AND away when back, on two narrow parallel depth tracks. No crab walk, lateral splits, backwards knees, kicks, running or airborne whole body. Only small body bob, scarf/hair stable, no camera changes. Last→first continues same gait. Output four useful poses directly; no eight-frame sheet, extra down/up poses or duplicated figures. Later export timing is 220ms per frame, 880ms per loop, never text in the art.
```

## Sit

```text
TWO frames side by side in equal square cells, SEATED REST. Image 1 fixes the accepted adventurer identity and physical size. Character only, NO bench, stool, floor or environment. Sit naturally on an implied horizontal bench: pelvis seated, thighs extend toward front/lower-left, both knees bend downward and both complete boots hang/read below them. Preserve actual thigh/shin proportions and the near/far depth order. Hands rest lightly on thighs, single stone secured at belt. Green tunic hem folds around upper thighs, never hides both legs or becomes a long robe.
1 relaxed seated pose with eyes open, gentle smile.
2 same hip/seat anchor, knees, hands, stone and boots; tiny natural blink.
Same head width and body scale as standing, shorter total silhouette. Do not enlarge to fill the cell, squat, kneel or depict a standing figure with bent knees. Clean empty space below/around figure; leave room for later bench composition. Seat fit remains a later integration check.
```

## Cast-start

```text
FOUR chronological frames, 2×2 equal square cells, CASTING START played once. Image 1 supplies canonical idle from the generated idle sheet; Image 2 supplies the original accepted appearance. Feet planted at idle root, same camera/scale, calm protective ward magic, not combat.
1 MATCH canonical idle: both hands down, stone secured in the leather belt tab.
2 near hand reaches across the belt to unclip the SAME flat pale-teal wardstone; far hand begins rising to support. Stone transfers physically, no copy.
3 near hand lifts that stone to upper belly, far palm supports underneath; belt leather tab remains attached and visibly EMPTY.
4 hold the stone upright at LOWER CHEST between near fingers and far supporting palm, elbows comfortably bent, focused open eyes and tiny chanting mouth. Stone remains its original small flat size, not a ball. Keep fingers around the edge so the teal face stays visible.
Frame 4 fixes exact hand/stone center and grip for chant-loop and cast-end entry. Single stone only. Do not leave a second teal gem on the belt, erase leather tab, levitate the stone, clasp empty hands or emit body effects. No stepping or large head/torso translation.
```

## Cast-loop

```text
FOUR frames, 2×2 equal square cells, WORKING/CHANTING LOOP. Image 1 is selected cast-start frame 4 and fixes held-stone pose; Image 2 supplies accepted appearance. Feet remain planted. Both hands hold SAME single small flat pale-teal stone at exact established LOWER-CHEST center. Near fingers grip edges, far palm supports. Leather belt tab remains attached and EMPTY, not erased or refilled.
1 MATCH held-stone boundary: focused open eyes, tiny chanting mouth.
2 small mouth syllable change, subtle inhale; no moving stone center or hands with body bob.
3 eyes gently half closed in concentration, second small mouth shape, scarf settles.
4 eyes reopen, torso and mouth return toward frame 1. No neutral belt-stone idle frame inside this loop.
Restrained living expression and breath, no arm flailing, floating prop, growing head, duplicating gem or combat casting. Keep exact stone width/height and hand positions across frames. Work status is shown by a separate conspicuous GROUND CIRCLE under feet, never rings/beams around chest. Last→first is a quiet continuation.
```

## Cast-end

```text
FOUR chronological frames, 2×2 equal square cells, CASTING END played once. Image 1 fixes held-stone neutral from casting start, Image 2 fixes canonical idle, Image 3 supplies original appearance. Same scale/root/camera throughout.
1 MATCH held-stone neutral: both hands at lower chest around one small flat teal stone, belt tab empty and attached.
2 mouth closes into gentle smile, hands lower SAME stone toward upper belly.
3 near hand reseats and clips stone into the persistent near-side belt tab while far hand releases. No second gem remaining in hands, no vanished mounting leather.
4 MATCH idle boundary: one stone secured at belt, both empty hands relaxed down, eyes open, original root and silhouette.
Quiet physical return to rest, no step, new grip height, celebration, outfit change, magical body emission or camera turn. Frame 1 matches neutral cast-loop entry and frame 4 matches idle frame 1 at identical scale. Preserve the same stone shape during hand-to-belt transfer.
```

## Magic — shared existing effect

Use [the approved shared circle](shared-magic.md), `exports/shared/ward-circle.png`, for the adventurer and all later roles. Historical generation/cleanup briefs are retained in `adventurer-magic-prompt.md`, `adventurer-magic-v2-prompt.md` and `adventurer-magic-v3-prompt.md`; do not regenerate them per character.

```text
PRODUCER / COMPOSITOR INSTRUCTION — NO IMAGE GENERATION
Reuse the existing horizontal 512×128 RGBA ward-circle.png. Four128×128 frames, 180ms each, loop720ms, local ground anchor(64,86), layer behind the body. Same ornate turquoise/ivory/gold geometry and straight ascending light rays. Align beneath the caster's feet, never the held tool or chest. Preserve physical scale and transparent center; keep face/hands visible. No new circle design, recolor or circle pixels inside character sheets.
```

## Production and review

Adapted from `researcher-production-prompt.md`. Character generation uses common + one action, saved separately. The magic block is now an asset-reuse instruction, not a generation request. Use accepted idle and held-tool endpoints as dependent references. Keep source PNGs unchanged; export equal-cell logical sheets at shared scale/root, then GIFs. Verify actual anatomy, frame progression, visible single-tool transfer, alpha and edges; RGBA alone proves none of these. No independent per-frame silhouette fitting, procedural leg cutouts or camera corrections hidden by rescaling. Record actual export dimensions/timing and remaining deviations. Current master has small edge artifacts; avoid copying them.

## Delivered set

See [motion delivery and review](adventurer.md) for all source/normalized sheets, GIFs and checks. The generated chant initially violated layer separation; one targeted cleanup removed the baked floor circle. Four transition boundary frames reuse the canonical whole drawings in export. Full input/output provenance is in `adventurer-generation.json`.
