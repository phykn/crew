# Researcher Diviner — Complete Pose Prompt Pack

This is the current production brief for **this researcher character**, including every requested pose. It supersedes earlier character-generation instructions where they conflict. The accepted four-frame walk is the visual and motion reference; other pose sheets remain candidates until reviewed. Writing this pack does not authorize image generation.

## Use and reference preparation

For each requested image, send **the common character prompt plus exactly one action block** below. The ground-effect block now describes reuse of the approved shared asset; do not send it to image generation. Do not send every action block in one image-generation request or combine all motions into an atlas before validation.

Available references:

- `candidates/researcher-walk-final.png`: accepted four-frame walking review sheet, logical cells 96 × 96, order near contact / far passing / far contact / near passing.
- `candidates/researcher-guided-walk-v1.png`: high-resolution source, eight square cells in a 4 × 2 layout. The delivered four-frame walk uses source cells **1, 3, 5, 7**. Use these, not the rejected rig or older walking candidates.
- `candidates/researcher-guided-contact-v1.png`: supporting face/costume reference. Its long stride and brown halo are defects, not requirements.
- `reference/walk-guide-1.png`, `walk-guide-3.png`, `walk-guide-5.png`, `walk-guide-7.png`: code-projected near contact / far passing / far contact / near passing. `scripts/walk-guide.py` and `reference/walk-guide.json` contain their construction and coordinates.

Before a future generation, extract a high-resolution single character from the accepted walk source as the identity reference; use the exact equal-cell boundaries, not a tight silhouette crop that changes registration. Review it before passing it to the generator. For a four-frame walk, compose the four listed guide cells into a **2 × 2** guide in that order. The existing eight-pose guide is historical; do not request another eight-frame output just to discard half of it.

Reference roles for the character prompts:

1. **Image 1 — identity master:** one selected full-body character from the accepted walk source. Supplies exact face, hair, proportions, costume, palette and camera. Supplies only the identity when its action differs from the requested pose.
2. **Image 2 — pose/registration guide, when present:** supplies the requested anatomy, near/far ownership and fixed root. For walking, use the four-pose guide. For seated art, use a seated skeleton or seat-height guide at the same body scale, rather than reusing a standing leg skeleton.
3. **Boundary references, when needed:** explicitly name the relevant already-selected transition endpoint, such as cast-start frame 4. They supply hand/orb coordinates and expression, not a second character design.

Never silently substitute an older large-head, frontal or side-profile source as the new master. Once a standing idle master is selected, use it consistently for subsequent non-walking poses. Generate only the action the user requested.

## Common character prompt

```text
Use case: identity-preserve, with sketch-to-render pose control when a skeleton is supplied.
Asset: transparent pixel-art animation of the EXISTING researcher/diviner mage from Image 1. This is the same individual in a new action, not a redesign or a new role.

REFERENCE CONTRACT
Image 1 fixes identity and the elevated front-three-quarter camera. Image 2, if supplied and identified as a pose guide, fixes anatomical connections and registration for the requested action. Any additional image has an explicitly named transition-reference role. Copy neither a reference's wrong action nor its external halo. Guide colors, text, arrows and bones never appear in the rendered asset. Change only the action specified in the action block.

IDENTITY AND PROPORTIONS
Cute anime-influenced young-adult woodland researcher, approximately three heads tall at the accepted walking proportions. Preserve the accepted head-to-torso and thigh-to-shin ratios; do not grow the hair/head between frames. Soft layered chestnut hair with the same tuft and fringe pattern, large warm brown eyes with restrained highlights, small rosy cheeks, gentle rounded face and small expressive mouth. Cute rounded hands, short sturdy limbs, readable cuffs and boots. Preserve the same face and apparent age in every pose; no realistic square jaw, muscular adult body or oversized baby head.

Cream tunic and sleeves, sage open vest with the same two front panels, short ochre shoulder mantle with one round clasp, cocoa trousers, brown cuffed boots, brown belt and a SINGLE amber crystal orb in its screen-right/near-side belt cradle. Keep cuts, hem lengths, palette, orb size and physical attachment consistent. The belt cradle is a persistent object: it stays attached and visibly empty when the orb is held. No hat, staff, book, satchel, weapon, armor, long cloak, extra pocket, extra orb or new decoration.

CAMERA AND HEADING
Same gently elevated front-three-quarter view throughout, facing screen LOWER-LEFT. A heading around 40–45 degrees from frontal and camera elevation around 20–25 degrees are visual guides, not a guarantee. Both eyes must remain visible, with the far eye narrower; nose slightly left of face center, not on a profile silhouette. Show both vest front panels and a narrower near-side plane, a little hair crown, shoulder tops and boot tops. Head, chest, pelvis, knees and toes share one coherent forward heading. Never rotate to one-eye profile, face straight forward, turn toward camera in one frame, or attach sideways-moving legs to a frontal torso.

NEAR/FAR OWNERSHIP
The visible orb-bearing side is the NEAR anatomical side. Its shoulder and hip start at screen-right. Its limbs keep that identity even when a hand or foot moves across the silhouette. The FAR shoulder and hip start at screen-left, with natural depth occlusion. Use slightly lighter/warmer near trousers and slightly darker far trousers consistently so the lead leg can be traced. These are material shades, not colored stripes. Pink in a skeleton means near; teal means far; render actual clothing colors instead. Never infer ownership solely from which foot happens to be farthest left on screen. Draw continuous hip→thigh→knee→shin→boot and shoulder→elbow→hand connections.

REGISTRATION
One camera, one body scale, one pixel density and equal cell size for every frame. Use the supplied guide's common root; if no guide is supplied, preserve the selected master's root. Keep crown, sleeves and soles fully inside each cell with empty margin. Preserve actual hand/prop/foot anchor positions at transition boundaries. A lifted foot may move above the floor; do not force every boot's lowest pixel onto the same baseline. Seated poses keep the same head and limb sizes and use a seat anchor; do not enlarge them to fill a standing-height box. No independent per-frame zoom, tight cropping, silhouette centering or stretching. Mild breathing is allowed only where the action specifies it.

PIXEL CRAFT
Crisp stepped contours, deliberate small color clusters, a coherent coarse pixel grid and a restrained warm palette with neutral upper-left material shading. Readable at the delivered 96 × 96 logical cell size. Keep face and costume detail subordinate to silhouette readability. No smooth portrait rendering, glossy 3D, photorealism, soft contour blur, noisy dithering or changing light direction. Do not claim a larger generated image is already a pixel-perfect 96 × 96 sprite; logical export happens after inspection.

CHARACTER CUTOUT
True alpha-zero empty space outside the body and inside limb gaps. No brown halo, atmospheric haze, drop shadow, cast shadow, floor, pedestal, drawn checkerboard, gray gradient, thick sticker outline, colored edge speckles, text, labels, cell borders or watermark. No magic rings, beams, sparks or luminous haze baked into character pixels. The amber orb is a physical object with ordinary material highlights; conspicuous magic is a separate ground-effect layer. Every cell contains exactly one complete figure. No limbs crossing cell boundaries.
```

## A — Standing idle: four frames

```text
ACTION: STANDING IDLE LOOP. Exactly FOUR equal square cells, 2 columns × 2 rows, row-major order. Same complete figure in every cell. Calm friendly researcher at rest; orb secured in the belt cradle, both hands relaxed at sides, soles planted at the shared root.

1. Neutral, eyes open, small gentle smile, shoulders relaxed.
2. Subtle inhale: torso/shoulders rise at most one logical pixel, hair and mantle nearly still; eyes stay open.
3. Small blink: eyelids closed naturally, original body height, same smile, hands and orb unchanged.
4. Eyes reopen and return toward frame 1; mantle settles without changing its silhouette or length.

No walking stride, hand wave, reaching for the orb, bouncing whole body, head swivel or foot shuffle. Frame 4→1 is a quiet continuation. Frame 1 becomes the canonical idle endpoint used by casting start and end. Character scale and foot positions do not drift.
```

## B — Walking: four frames

```text
ACTION: WALK LOOP. Exactly FOUR equal square cells, 2 columns × 2 rows, row-major order. Use the four-pose skeleton in the SAME order. One direction only: lower-left. This is the accepted contact/passing cadence, not an eight-phase walk, run or exaggerated marching cycle.

1 — NEAR CONTACT. The lighter NEAR leg runs continuously from the screen-right hip across toward the front/lower-left boot; near heel lands, toe slightly raised. Darker FAR leg trails upper-right, heel lifted, toe contacting. Near arm swings backward, far arm forward.
2 — FAR PASSING. Near leg supports below the pelvis. Darker FAR knee advances; its boot lifts and passes beside the supporting shin. Feet come close in projection, not another wide contact stride. Hands pass near neutral. The far boot is visibly airborne; the supporting foot remains grounded.
3 — FAR CONTACT. Darker FAR leg now reaches forward/lower-left from the screen-left hip, heel landing. Lighter NEAR leg trails upper-right from the screen-right hip, rear heel lifted. Near arm forward, far arm back. This must reverse the actual leading anatomical leg from frame 1, not merely change arm poses.
4 — NEAR PASSING. Darker far leg supports. Lighter NEAR knee advances with its boot lifted beside the support shin. Arms pass neutral, continuing toward frame 1. This must lift the opposite anatomical leg from frame 2.

Head/chest/pelvis/knees/toes face the same lower-left heading. Forward steps move left AND slightly toward the viewer/lower on screen; rear steps move right AND away/higher. Two narrow parallel depth tracks, ordinary modest stride, naturally forward-bending knees. No sideways spread, crab walk, kick, skating, crouch, hopping or dramatic body bob. Keep hair, mantle, eyes, belt and orb stable; the orb remains secured. Do not mirror frames halfway through.

Keep four distinct useful poses. Do not add down/up phases, duplicate contacts or additional figures. The later GIF uses 220 ms per frame, 880 ms per complete loop; timing is an export instruction, not printed text. Last→first continues the same stride direction. Check frames 1 versus 3 for opposite leads and 2 versus 4 for opposite lifted legs.
```

## C — Seated rest: two frames

```text
ACTION: SEATED REST LOOP. Exactly TWO equal square cells side by side. Same character, same elevated lower-left camera, same physical body scale as standing. Draw the CHARACTER ONLY: no bench, stool, ground or environment. A supplied seat guide is geometry only and must disappear from the output.

Pelvis rests on an implied horizontal bench seat; thighs extend naturally toward the front/lower-left, knees bend downward, shins hang in the correct depth order and BOTH boots are fully visible. Preserve believable thigh/shin lengths and a stable hip/seat anchor. Hands rest gently on thighs without hiding the orb or merging into clothing. Orb stays secured in the belt-side cradle. Mantle rests above the seat contact without becoming a long cape. Do not squat, kneel, float in a standing pose, or draw a bench into the sprite.

1. Calm seated pose, eyes open, soft relaxed smile.
2. Same pelvis, knees, boots, hands and orb coordinates; tiny blink and at most a subtle chest breath.

Keep empty margins. Do not resize the shorter seated silhouette to standing height. Seat/root alignment is validated later against the actual bench; a generated pose alone does not establish that it fits the renderer.
```

## D — Casting start: four frames

```text
ACTION: CASTING START, played ONCE. Exactly FOUR equal square cells, 2 × 2, chronological row-major order. Feet planted at the canonical idle root, no stepping or camera change. If supplied, the idle boundary reference fixes frame 1 exactly.

1. Match canonical idle: orb secured in belt cradle, hands down, eyes open.
2. Near hand reaches to the SAME orb; far hand rises to support it. Keep orb ownership physically continuous and fingers readable.
3. Both hands lift that single orb to upper belly. Belt cradle remains attached, visibly EMPTY. No orb left behind at the belt.
4. Both hands cup the orb at LOWER CHEST, elbows bent comfortably, attentive eyes and a tiny open chanting mouth. Feet, shoulders and head retain the shared registration.

Frame 4 defines the canonical held-orb pose and the exact hand/orb coordinates for casting loop frame 1 and casting end frame 1. Select that endpoint before generating those later sheets; do not independently reinterpret its height. No levitation, empty praying hands, thrown orb, second orb, combat gesture or body magic. The ground effect is separate.
```

## E — Working / chanting loop: four frames

```text
ACTION: WORKING IS MAGIC CHANTING. Exactly FOUR equal square cells, 2 × 2, row-major loop. Use the selected casting-start frame 4 as the transition boundary. All frames retain both hands cupping the SAME orb at the SAME lower-chest center; belt cradle stays present and empty. Feet planted. Calm concentrated magical research, not combat.

1. Match the selected held-orb endpoint: focused open eyes, tiny open chanting mouth.
2. Mouth changes slightly as a syllable is spoken, small inhale in shoulders; hands/orb center stay registered, no lifting the prop with every breath.
3. Eyes soften to half-closed concentration, another small mouth shape, mantle edge settles. Preserve orb size, lower-chest height and complete empty cradle.
4. Eyes open and mouth returns toward frame 1, original torso height, same hand/prop registration.

Movement is legible but restrained: expression, eyelids and slight breathing, not arm flailing or a bobbing head. Do not return to belt-held idle in any loop frame. Do not make the orb vanish, levitate, enlarge or duplicate. No light rings around hands/chest; conspicuous work-status magic is drawn separately beneath the feet. Frame 4→1 must be a small continuation. The selected neutral loop pose also supplies casting-end frame 1.
```

## F — Casting end: four frames

```text
ACTION: CASTING END, played ONCE. Exactly FOUR equal square cells, 2 × 2, chronological row-major order. Use the selected neutral chanting pose and canonical idle as boundary references. Same foot/root anchor throughout.

1. Match neutral chanting: orb held in both hands at its established lower-chest center; belt cradle attached and empty.
2. Mouth closes into a gentle content smile. Hands lower the SAME orb toward upper belly, with no abrupt change of size or grip.
3. Near hand seats the orb securely into the persistent belt cradle while the supporting far hand releases and relaxes downward. Single orb only, no copy still in the hands.
4. Match canonical idle frame 1: orb secured at belt, both hands down, eyes open, original body height and silhouette.

Quiet return from work to rest, no celebration or step. Check end 1 against loop neutral and end 4 against idle 1 at identical scale and root. Do not generate a new idle design for the last frame. No magic baked into body pixels.
```

## G — Shared ground magic: reuse the existing asset

The user subsequently approved one circle for every character. Reuse [the shared effect](shared-magic.md) at `exports/shared/ward-circle.png`; do not generate the researcher's earlier separate gold effect. Historical effect prompts remain generation records only.

```text
PRODUCER / COMPOSITOR INSTRUCTION — NOT AN IMAGE-GENERATION REQUEST
Load the existing shared ward-circle.png: four 128×128 cells, horizontal strip, 180ms each, loop720ms. Align local ground anchor(64,86) to the researcher's ground-contact midpoint and draw behind the body. Preserve the exact teal/ivory/gold ground design and straight rising light; no recoloring or role-specific redesign. Keep face, held orb and hands legible. Body sprites contain no circle. The researcher still uses its own single physical orb, with the existing cradle/hand-transfer rules.
```

## Review and export contract

These instructions are for the producer/exporter, not visual text to draw into an image.

1. Generate only after the user requests it. Save the exact assembled prompt and name every input image's role. Do not create the next role, variations or another motion merely because this pack contains its brief.
2. Inspect each source before extending it. Check two-eye camera, consistent head/body ratio, hair/mantle/cuffs, persistent cradle, full limbs and actual pose changes. A skeleton is guidance, not a hard constraint. Distinguish a visible arm change from a true lead-leg change.
3. Check layout and actual alpha. RGBA and alpha extrema 0–255 do not prove clean edges or empty limb gaps. Inspect the sprite against dark and light backgrounds. Brown haze, opaque checkerboard pixels, colored fringes and missing limb parts are failures even if the cell count is right.
4. If the anatomy is wrong, correct the intended pose/reference and target the missing contact. Do not reconstruct moving legs from a static sprite as a substitute for accepted drawings. Do not expand a wrong contact into more frames.
5. Accept a master before extending identity to other poses. For cast transitions, freeze the actual selected boundary frame, then reuse it. Check single-orb ownership and empty-cradle persistence across the entire idle→start→loop→end→idle sequence.
6. Slice by equal source-cell coordinates. Verify aspect ratio and cell boundaries first; fractional boundaries may need a single uniform extent transform, as in the current walk exporter. A 2 × 2 four-frame source can be repacked into a 4 × 1 runtime strip without changing frame scale. Requested dimensions are not verified dimensions.
7. Target 96 × 96 logical character cells, matching the delivered walk. Preserve uniform scale, camera and body-root coordinates across actions, not merely within each sheet. Nearest-neighbor export, no independent silhouette fitting or rescaling per pose. Seated hips use a separate seat anchor at the same physical scale. If normalization is needed, document the actual transform and compare to the master.
8. Preserve source PNGs. Current walk export uses an alpha threshold of 220 for hard-edged cutouts; this is an observed export setting, not a universal repair for every source. Check that it does not erase outline/limbs. Effect transparency keeps intentional luminous falloff; do not blindly apply the character threshold to it.
9. Walking is four frames at 220 ms each, 880 ms total. Do not change speed just because frames were removed. Choose and record other action timings after reviewing their motion; do not treat all actions as the same cadence. Start/end play once, idle/walk/seated/chant/effect loop. Preview 4→1 and all transition boundaries. No frame interpolation that invents limbs or changes identity.
10. Initially deliver only the lower-left master. Opposite direction can be a later whole-animation horizontal flip, preserving anatomical prop ownership. Do not mirror individual frames within a loop. Verify asymmetric equipment, lighting and glyph appearance before runtime reuse; readable symbols must not depend on a single direction.
11. Preview chanting with the separate ground effect centered under the feet and drawn behind the character. Confirm the effect is conspicuous while the face, hands and body remain legible. Do not enlarge/move the character just to fit the effect.
12. Record what passed and what remains a candidate. Source sheets, logical exports and GIF previews are different deliverables. A successful generation is not proof of production readiness. Asset preparation does not authorize app integration, commits or pushing these local notes.

## Reuse for the next character

Finish and review this researcher's requested pose set before changing roles. For another character, explicitly establish a new role, face/hair, costume silhouette, palette, tool and tool attachment/transfer rules. Preserve the accepted camera, relative guild scale, four-frame walking grammar, code-guide ownership and separate ground-effect principle. Replace the researcher's orb-specific action blocks if the new tool cannot be handled the same way; do not accidentally give every mage this researcher's face, mantle or orb.
