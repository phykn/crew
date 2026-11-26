# conductor

## Code figure

Made like the interpreter (see graphics/README.md "캐릭터 만들기"): `trace.py conductor` traces every sheet at its own size and repaints each material in three flat shades.

- Materials: hair and coat share the ink blue and part at the jaw line (23 rows below the crown); plum sash, ivory blouse, cuffs, and wand, gold piping and clip, charcoal-brown trousers, brown leather belt and boots.
- The gold piping is one pixel wide, so the cleanup keeps it wherever any of it touches.
- `head.png` keeps the sheet's own face: every eye and clip pixel as drawn, the skin snapped to three flat shades, the face's other pixels (lines, cheeks, mouth) in six colors, round the cleaned hair with its sheen. Two hand edits on top: the far eye drops a row to sit level with the near one, two pixels wide with the same lid, iris, and glint, since the sheet's higher, smudged far eye read as mismatched eyes; and thin soft brows sit a row above each lid, low at the inner end. A hand-redrawn face (flat brows, lash flick, reshaped chin) read as someone else and was dropped.
- The wand reaches past the body in the cast sheets, so the shared box is 50 pixels wide.

## master

### Conductor Mage — Standing Master

#### Concept and scope

Next role after the accepted adventurer: `conductor`, the crew member who plans tasks and coordinates the team. New character: a kind, capable female coordination mage, navy/ivory/plum costume, compact dark-blue bob and one short ivory/brass directing wand. Preserve the accepted adventurer's cute classic-JRPG physical proportions and pixel medium, but create a different face, hair, silhouette and tool.

Generate one standing master first. Review identity before making motion sheets. Later motion set follows the existing idle / four-frame walk / seated / cast-start / chant-loop / cast-end contract. The short wand changes casting hand mechanics; never copy the researcher's cupped orb grip. All work uses the exact shared ground effect at `exports/shared/ward-circle.png`; do not generate another circle with this character.

#### Generation prompt

Use case: stylized-concept.
Deliverable: ONE full-body transparent standing pixel-art master of a NEW friendly CONDUCTOR MAGE for the same woodland crew as Image 1. One original character, one relaxed idle pose. No sheet, lineup, scenery or animation.

REFERENCE ROLES
Image 1 is the accepted green-clad adventurer. Match the same family of cute compact classic-JRPG proportions, physical character height, usable torso/leg length, readable boots/hands, coarse pixel craft, warm material shading and gently elevated front-three-quarter camera. It is NOT this new person's identity: do not copy its boy face, brown fluffy hair, green travel tunic, red scarf or teal belt stone. Create a visibly distinct team member, not the same person with a blue recolor.
Image 2 is the user's classic fantasy party reference. It supplies only the appealing compact character-to-head balance, substantial little body and simple layered fantasy costume feeling. Do not reproduce a pictured face, hairstyle, exact outfit, green hood, wolf, party arrangement, scenic background or smooth 3D cinematic medium. The output remains a pixel sprite.
Image 3 is approved camp material artwork. Use only clean stepped pixel clusters, restrained coordinated material shades and neutral upper-left illumination. No crate, wood texture on skin or rigid rectangular anatomy.

ROLE AND PERSONALITY
A young-adult female planning/coordinating mage, calm, observant and reassuring, the person who gently organizes a party's work. Cute, capable and approachable rather than regal, stern, seductive or childlike. Friendly small confident smile, soft expressive plum-brown eyes with one restrained highlight each, delicate ordinary eyebrows, subtle warm cheeks and a rounded face with a small chin. Eye size is charming but modest, consistent with Image 1; no enormous portrait eyes, huge blush stamps, long eyelashes or realistic face detail. No makeup emphasis, crown, glasses, beard, animal ears or fantasy appendages.

PROPORTIONS AND NEW HAIR SILHOUETTE
Same accepted adventurer's physical scale and head/body balance, around three to three-and-a-half head lengths overall. Use the actual visible reference ratio rather than stretching to an exact numerical count. Head only moderately enlarged, small visible neck, distinct compact chest/waist, real thigh/knee/shin lengths and sturdy boots. Never a two-head infant mascot, pin legs, narrow fashion-model limbs or giant hair ball. Hair is a COMPACT DEEP INK-BLUE BOB, ending at jaw/nape, one soft side-swept fringe exposing a little forehead, few broad grouped locks. A small plain brass side clip holds the fringe; no giant bow, tall crest, fluffy brown adventurer spikes, long trailing hair or large hat. Shoulder silhouette and lower legs stay readable beneath the bob.

COORDINATOR COSTUME
A practical short NAVY-BLUE mage coat to upper thigh, worn over a warm IVORY high-neck blouse. Open front exposes the ivory center panel; small brass collar fastener and two understated gold piping clusters identify an organized guild coordinator. Coat hem has two clean short front panels and a modest back split, no long cloak or dress hiding both legs. Deep muted PLUM waist sash under a narrow brown leather belt; charcoal-brown fitted practical trousers; short sturdy brown boots with small navy cuff accents and readable toes/soles. Ivory sleeve cuffs emerge from the navy sleeves; hands separate clearly from the dark coat. Keep the navy bright enough to read against a dark camp, with broad blue midtone planes and dark-blue edge shades, not an almost-black silhouette.
Costume is fully practical and covered, neither ornate armor nor a formal ballroom outfit. No shoulder plates, royal cape, oversized epaulettes, medals, necktie, red adventure scarf, green tunic, ochre researcher mantle, backpack, book, orb, shield or large weapon. The face and ivory panel provide clear light/dark hierarchy; gold is a restrained role accent, not dense jewelry.

ONE DISTINCT MAGICAL TOOL
One SHORT SLENDER IVORY DIRECTING WAND with a small plain brass grip, secured in a narrow leather loop at the near-side/screen-right belt. Shorter than a forearm, straight and simple with a small tapered tip, no oversized crystal, orb, starburst finial or long staff shaft. Keep it close to the hip, clear of the boots and inside the silhouette margin. Exactly one wand; both hands EMPTY at rest. It suggests a magical conductor's baton, used later for deliberate precise ward gestures. Do not hold it out in this standing master and do not generate a second wand in either hand. No tool glow or effect pixels.

IDLE POSE AND MASTER CAMERA
Relaxed upright stance, both boots planted slightly apart in narrow depth tracks, weight balanced, knees easy. Arms down with a little empty space beside coat panels, small hands clearly visible. No pointing, directing gesture, crossed arms, wave, walking step, raised boot, spellcasting or sitting. Body faces screen LOWER-LEFT in a gently elevated FRONT THREE-QUARTER, matching Image 1. Both eyes visible, far eye a little narrower; nose slightly left of face center, not on a one-eye profile silhouette. Show chest-front planes with a narrower near-side plane, a little hair crown/shoulder tops/boot tops. Head, shoulders, pelvis, knees and toes all face the SAME lower-left heading; no frontal torso and sideways legs. Orthographic feel, no lens convergence or extreme top-down squashing.

ANATOMICAL OWNERSHIP AND READABILITY
Near shoulder and near hip start at screen-right, on the wand side. Far limbs sit behind the body where appropriate; trace continuous shoulder/elbow/hand and hip/knee/ankle/boot connections. Both hands and both complete boots present; no hidden missing limb, extra finger cluster, tangled coat hem, intersecting belt/tool or fused boot gap. Preserve small empty gaps around arms and between the lower legs. The reference's sturdy little anatomy matters more than decorative detail.

PIXEL ART
Purposeful hand-authored game sprite look, coherent coarse grid, crisp stepped contours, grouped material colors with two or three useful shades each. Warm neutral upper-left material lighting like the accepted sprite, no portrait rendering or shiny sculpted toy. Readable at later 96×96 logical cell export; generated high-resolution pixels are not assumed to be native 96-pixel art. No noisy dithering, tiny fabric weave, individual hair strands, airbrush gradients, smooth painted anime illustration, glossy 3D, photo texture, thick black sticker outline or a painting with a pixelation filter. Maintain face/hand/boot readability and simple role silhouette.

FRAMING AND TRANSPARENCY
ONE complete isolated full-body standing character with generous transparent margins around hair, hands, wand and soles. Same full-body framing as Image 1, no enlarged portrait crop. True alpha zero outside the figure and inside limb gaps; character itself opaque and crisp. Do not copy reference fringe defects. No brown/green haze, colored speckle cloud, shadow, floor, pedestal, reflection, solid backdrop, drawn checkerboard, gray gradient, rim light, aura, spark, beam, magic circle, labels, text, watermark or frame. The ground circle is an existing SHARED asset composited later: render NO part of it here. One new conductor character only.

#### Review gate

Review a distinct readable conductor identity, family scale/proportion matching adventurer, two-eye elevated three-quarter camera, complete limbs, exactly one belt-mounted short wand, practical navy/ivory/plum clothing and actual transparency. This is a master candidate awaiting appearance review; no unrequested motion roster, character variants, application integration or push.

#### Generated candidate review

Generated once using built-in image generation. `candidates/conductor-base-v1.png`: 1086 × 1448, RGBA, alpha extrema 0–255. One full-body coordinator with compact ink-blue bob, brass clip, plum-brown eyes, navy/ivory coat, plum sash, trousers, cuffed boots and a single ivory wand secured through the near-side belt loop. Both hands are empty; both eyes and chest front visible. Overall physical framing and proportion family agree with the adventurer, with subtle camera elevation. Gold coat/cuff detail is more elaborate than minimal piping, and the wand is close to forearm length rather than clearly shorter. Small low-alpha colored fringe persists; raw RGBA is not proof of a production-clean cutout. Appearance candidate for review; no motion generation or application integration in this step. Shared effect was reused from the existing exact PNG, not generated again.

## cast-start

### Rejected Screen-right Hand Repair

Use case: identity-preserve. Production transparent pixel-art sprite sheet for the EXISTING conductor mage from image 1. This reference is the exact accepted identity, not inspiration for redesign.
IDENTITY: Keep the ink-blue compact bob and original fringe, brass hair clip, warm skin, plum-brown expressive modest eyes, friendly adult feminine face, original head/body ratio (roughly 3 to 3.5 heads, never inflate the head), visible neck, compact substantial torso, actual knees and sturdy boots. Match exact navy short coat, gold piping and small chest clasps, ivory blouse and broad cuffs, plum sash, brown belt, charcoal trousers, brown/navy cuffed boots. No hat, cape, skirt, armor or additional accessories. Same palette, pixel groups, hair silhouette and clothes in EVERY frame.
ONE TOOL: exactly ONE slender ivory baton with brass grip, at the visible near/screen-right belt loop when not held. Keep size and attachment as master. On drawing the baton, loop remains EMPTY and visible, never duplicate tool, never erase belt loop. No orb. Empty hands outside casting.
CAMERA: same slightly elevated front THREE-QUARTER facing LOWER-LEFT, both eyes visible, far eye narrower, show chest front and narrow side, crown and boot tops. Head, chest, pelvis, knees, toes all share this heading. No profile/frontal camera changes, mirroring or rotating within sheet. Near limb starts screen-right; far starts screen-left and is occluded behind. Preserve shoulder-elbow-hand and hip-knee-ankle-boot anatomical ownership, especially crossing limbs.
REGISTRATION: exact requested equal cells in row-major order. One whole figure per cell. Identical body dimensions, head width, limb lengths, neutral pelvis position and camera. Standing crown near 7% cell height, soles near 90%; leave margin, no cropping. Pose changes must not trigger scale changes. Seated figure is naturally shorter, not enlarged. Small walk bob permitted; never independently recenter moving silhouettes or lower lifted feet to floor.
MEDIUM: crisp deliberately grouped pixel art, stepped contours, coherent coarse grid readable at 96x96 logical cells, neutral upper-left shading. Actual transparent RGBA background, opaque body pixels and transparent limb gaps. No floor/shadow, gradient, checkerboard drawing, captions, grids, text, watermarks, guide bones/colors, smooth painterly/3D shading, fringe/colored noise. ABSOLUTELY NO magic circles, light, sparks, aura or effects in body sheets: common ward circle is separate. Keep face and physical hand/tool contacts legible.

FOUR frames, 2x2 square cells. Begin chanting, feet planted at fixed ground/root. 1 exact canonical standing empty-handed idle, baton secured in near belt loop. 2 near hand reaches down and closes fingers around baton brass grip while far hand stays relaxed; tool still seated in loop. 3 near hand has lifted the SAME baton clear, elbow bent near waist; belt loop now empty. Far hand begins open supporting gesture. 4 established casting stance: near hand holds baton by brass grip at lower chest height, pointing diagonally forward/upper-left; relaxed elbow below wrist, tool clearly separated from face. Far palm gently open near waist, not cupping an orb. Eyes focused, mouth a small chanting shape. One baton only, straight consistent length, no light effect. Hold this endpoint as later loop reference.
TARGETED ANATOMY CORRECTION: Image 2 is the flawed previous cast-start sheet. Preserve identity, camera, frame layout, feet, scale and outfit, but CORRECT tool-hand ownership in frames 3 and 4. Use the hand physically starting on SCREEN-RIGHT of the torso in ALL four cells to reach its adjacent SCREEN-RIGHT belt loop and hold the baton. The gripping wrist remains screen-right of the torso centerline, with its elbow beside the right coat edge. In frame4 baton grip is at screen-right lower chest, shaft angles UP AND LEFT over empty air above the torso; shaft must not pass through the head or face. The OTHER hand, physically starting on SCREEN-LEFT, opens palm at SCREEN-LEFT waist. Do not transfer the wand to the screen-left hand. Explicit chain: rightmost shoulder -> rightmost elbow -> rightmost wrist -> brass grip in frames2,3,4. Exactly one tool; vacated belt holder remains EMPTY. Maintain lower-left 3/4 heading and original body scale. No magical effect. Output a corrected complete FOUR-frame 2x2 sheet, not a comparison.

## motions

### Conductor — Complete Motion Contract

Standing master: `candidates/conductor-base-v1.png`. Built-in image generation; exact historical prompts and source provenance are indexed in `conductor-generation.json`. Body sheets have no magic artwork. Reuse `exports/shared/ward-circle.png` unchanged.

#### Common identity and registration

Use case: identity-preserve. Production transparent pixel-art sprite sheet for the EXISTING conductor mage from image 1. This reference is the exact accepted identity, not inspiration for redesign.
IDENTITY: Keep the ink-blue compact bob and original fringe, brass hair clip, warm skin, plum-brown expressive modest eyes, friendly adult feminine face, original head/body ratio (roughly 3 to 3.5 heads, never inflate the head), visible neck, compact substantial torso, actual knees and sturdy boots. Match exact navy short coat, gold piping and small chest clasps, ivory blouse and broad cuffs, plum sash, brown belt, charcoal trousers, brown/navy cuffed boots. No hat, cape, skirt, armor or additional accessories. Same palette, pixel groups, hair silhouette and clothes in EVERY frame.
ONE TOOL: exactly ONE slender ivory baton with brass grip, at the visible near/screen-right belt loop when not held. Keep size and attachment as master. On drawing the baton, loop remains EMPTY and visible, never duplicate tool, never erase belt loop. No orb. Empty hands outside casting.
CAMERA: same slightly elevated front THREE-QUARTER facing LOWER-LEFT, both eyes visible, far eye narrower, show chest front and narrow side, crown and boot tops. Head, chest, pelvis, knees, toes all share this heading. No profile/frontal camera changes, mirroring or rotating within sheet. Near limb starts screen-right; far starts screen-left and is occluded behind. Preserve shoulder-elbow-hand and hip-knee-ankle-boot anatomical ownership, especially crossing limbs.
REGISTRATION: exact requested equal cells in row-major order. One whole figure per cell. Identical body dimensions, head width, limb lengths, neutral pelvis position and camera. Standing crown near 7% cell height, soles near 90%; leave margin, no cropping. Pose changes must not trigger scale changes. Seated figure is naturally shorter, not enlarged. Small walk bob permitted; never independently recenter moving silhouettes or lower lifted feet to floor.
MEDIUM: crisp deliberately grouped pixel art, stepped contours, coherent coarse grid readable at 96x96 logical cells, neutral upper-left shading. Actual transparent RGBA background, opaque body pixels and transparent limb gaps. No floor/shadow, gradient, checkerboard drawing, captions, grids, text, watermarks, guide bones/colors, smooth painterly/3D shading, fringe/colored noise. ABSOLUTELY NO magic circles, light, sparks, aura or effects in body sheets: common ward circle is separate. Keep face and physical hand/tool contacts legible.

#### idle

FOUR frames, 2x2 square cells. Standing idle: 1 canonical relaxed stance exactly like master, both eyes open, both hands relaxed empty, baton secured; 2 same planted stance, gentle exhale and slightly lowered eyelids; 3 brief natural closed-eye blink, same skeleton; 4 eyes open again, faint breath returns to 1. Tiny movement only, no waving, touching baton, arm swing or hair growth. Soles, belt and head base remain fixed.

#### walk

FOUR frames, 2x2 square cells. Image 2 is a code-projected anatomy guide ONLY; copy phases and joint ownership, never colors or labels. Lower-left ordinary WALK, baton secured. 1 NEAR CONTACT: near leg from screen-right hip leads down-left, heel lands, far leg trails up-right toe contact. Near arm back, far arm forward. 2 FAR PASSING: near support below pelvis, FAR knee advances and boot lifts beside support shin; arms pass neutral. 3 FAR CONTACT: FAR leg from screen-left hip leads down-left, near leg trails up-right. Opposite anatomical lead from frame1, near arm forward far arm back. 4 NEAR PASSING: far foot supports, NEAR knee advances with lifted boot passing support shin. Opposite lifted limb from2. Narrow parallel depth tracks, forward includes left AND toward viewer; backward includes right AND away. No crab walk, sideways straddle, kicks, backwards knees, whole-body jumping, running. Modest stride, tiny bob, stable hair and coat. Exactly contact/pass/opposite contact/opposite pass.

#### sit

TWO frames, 2 columns x1 row, wide sheet with equal SQUARE cells. Resting seated directly on invisible ground, folded bent legs comfortably in front, upper body same head/body dimensions as standing, crown lower in cell because seated. Same lower-left 3/4 camera. Belt baton secured; hands empty resting naturally on thighs. 1 relaxed open eyes gentle smile; 2 short calm closed-eye blink with subtle breath. No chair, stump, cushions, floor, props or floating feet. Do not scale up seated body to fill cell.

#### cast-start

FOUR frames, 2x2 equal cells. Fixed planted feet and lower-left three-quarter camera. Screen-LEFT arm owns the baton for the entire sequence. 1 canonical empty-handed idle, baton secured at screen-RIGHT belt. 2 screen-LEFT hand reaches ACROSS plum sash toward screen-RIGHT baton brass grip; screen-right hand remains empty relaxed. 3 same screen-left hand lifts baton clear to chest; screen-right belt loop now EMPTY; other palm opens at screen-right waist. 4 screen-left hand extends forward holding baton angled up-left, screen-right palm open. No transfer between hands. Match canonical held reference. Historical generated sources v1/v2 switched hands; v3 edits cell2 into this cross-body draw. Exact edit prompt is in conductor-cross-draw-prompt.md.

#### cast-loop


FOUR frames, 2x2 equal cells. Image2 is EXACT canonical held casting pose: hand on SCREEN-LEFT grips single baton, hand on SCREEN-RIGHT is open supporting palm; screen-RIGHT belt loop EMPTY. Keep that tool-hand ownership in every frame. Feet planted, head and pelvis fixed. Gentle conducting loop: 1 exact reference held stance; 2 small downbeat of left-side wrist and slightly open chanting mouth; 3 small upbeat, eyelids slightly lowered; 4 return toward1, mouth softly closes. Baton tip moves only a small arc, no whole-body swing or shoulder rotation. No second baton, orb, effect or light. Same body dimensions and camera as references. Do not revert to opposite tool hand from standing.

#### cast-end


FOUR frames, 2x2 equal cells. Image2 is canonical held casting pose. One wand held in SCREEN-LEFT hand throughout returning, screen-RIGHT hand supports empty. 1 exact reference held stance, baton at screen-left, EMPTY screen-right belt holder. 2 SCREEN-LEFT arm bends inward, lowering wand toward belly; right-side hand relaxes empty. 3 SAME SCREEN-LEFT arm reaches ACROSS the front of plum sash to SCREEN-RIGHT belt holder, seats baton shaft downward into loop; baton brass grip visible above holder, sleeve/hand across waist, right-side hand stays empty at side. 4 both hands empty at sides, one baton secured in its original screen-right belt holder, canonical standing idle as image1. Never switch holding hands, never duplicate baton. Fixed soles/root, same camera and body size, no effects.

#### Source and export rules

Initial exact input: `conductor-motion-initial-prompts.md`. Rejected repair: `conductor-cast-start-repair-prompt.md`. Selected cross-body edit: `conductor-cross-draw-prompt.md`. Exact continuation calls: `conductor-casting-prompts.md`.

Export at 96px square body cells using a uniform scale per sheet, matching original master standing height or seated head width. Grid-origin registration fixes source placement without changing anatomy or scale per pose. Walk keeps shared offsets and depth. Nearest-neighbor resampling and alpha threshold 220 remove low-alpha fringe; no limb reconstruction. Reuse whole canonical frames: idle1 = start1 = end4, start4 = loop1 = end1. Shared circle uses four 128px cells at 180ms each, anchored at (64,86) behind body. Horizontal flip gives the opposite walk direction; do not generate a second camera view.

## casting

### Final Casting Continuations

Image 1: original conductor standing master. Image 2: `reference/conductor-held-boundary.png`, cropped from the fourth cell of cast-start v2. Cast-start v3 corrects the draw hand in cell 2; export uses its cell 4 as the canonical held boundary. Cast-loop and cast-end use the screen-left gripping hand and screen-right open supporting hand.

#### Cast-loop

Use case: identity-preserve. Production transparent pixel-art sprite sheet for the EXISTING conductor mage from image 1. This reference is the exact accepted identity, not inspiration for redesign.
IDENTITY: Keep the ink-blue compact bob and original fringe, brass hair clip, warm skin, plum-brown expressive modest eyes, friendly adult feminine face, original head/body ratio (roughly 3 to 3.5 heads, never inflate the head), visible neck, compact substantial torso, actual knees and sturdy boots. Match exact navy short coat, gold piping and small chest clasps, ivory blouse and broad cuffs, plum sash, brown belt, charcoal trousers, brown/navy cuffed boots. No hat, cape, skirt, armor or additional accessories. Same palette, pixel groups, hair silhouette and clothes in EVERY frame.
ONE TOOL: exactly ONE slender ivory baton with brass grip, at the visible near/screen-right belt loop when not held. Keep size and attachment as master. On drawing the baton, loop remains EMPTY and visible, never duplicate tool, never erase belt loop. No orb. Empty hands outside casting.
CAMERA: same slightly elevated front THREE-QUARTER facing LOWER-LEFT, both eyes visible, far eye narrower, show chest front and narrow side, crown and boot tops. Head, chest, pelvis, knees, toes all share this heading. No profile/frontal camera changes, mirroring or rotating within sheet. Near limb starts screen-right; far starts screen-left and is occluded behind. Preserve shoulder-elbow-hand and hip-knee-ankle-boot anatomical ownership, especially crossing limbs.
REGISTRATION: exact requested equal cells in row-major order. One whole figure per cell. Identical body dimensions, head width, limb lengths, neutral pelvis position and camera. Standing crown near 7% cell height, soles near 90%; leave margin, no cropping. Pose changes must not trigger scale changes. Seated figure is naturally shorter, not enlarged. Small walk bob permitted; never independently recenter moving silhouettes or lower lifted feet to floor.
MEDIUM: crisp deliberately grouped pixel art, stepped contours, coherent coarse grid readable at 96x96 logical cells, neutral upper-left shading. Actual transparent RGBA background, opaque body pixels and transparent limb gaps. No floor/shadow, gradient, checkerboard drawing, captions, grids, text, watermarks, guide bones/colors, smooth painterly/3D shading, fringe/colored noise. ABSOLUTELY NO magic circles, light, sparks, aura or effects in body sheets: common ward circle is separate. Keep face and physical hand/tool contacts legible.

FOUR frames, 2x2 equal cells. Image2 is EXACT canonical held casting pose: hand on SCREEN-LEFT grips single baton, hand on SCREEN-RIGHT is open supporting palm; screen-RIGHT belt loop EMPTY. Keep that tool-hand ownership in every frame. Feet planted, head and pelvis fixed. Gentle conducting loop: 1 exact reference held stance; 2 small downbeat of left-side wrist and slightly open chanting mouth; 3 small upbeat, eyelids slightly lowered; 4 return toward1, mouth softly closes. Baton tip moves only a small arc, no whole-body swing or shoulder rotation. No second baton, orb, effect or light. Same body dimensions and camera as references. Do not revert to opposite tool hand from standing.
#### Cast-end

Use case: identity-preserve. Production transparent pixel-art sprite sheet for the EXISTING conductor mage from image 1. This reference is the exact accepted identity, not inspiration for redesign.
IDENTITY: Keep the ink-blue compact bob and original fringe, brass hair clip, warm skin, plum-brown expressive modest eyes, friendly adult feminine face, original head/body ratio (roughly 3 to 3.5 heads, never inflate the head), visible neck, compact substantial torso, actual knees and sturdy boots. Match exact navy short coat, gold piping and small chest clasps, ivory blouse and broad cuffs, plum sash, brown belt, charcoal trousers, brown/navy cuffed boots. No hat, cape, skirt, armor or additional accessories. Same palette, pixel groups, hair silhouette and clothes in EVERY frame.
ONE TOOL: exactly ONE slender ivory baton with brass grip, at the visible near/screen-right belt loop when not held. Keep size and attachment as master. On drawing the baton, loop remains EMPTY and visible, never duplicate tool, never erase belt loop. No orb. Empty hands outside casting.
CAMERA: same slightly elevated front THREE-QUARTER facing LOWER-LEFT, both eyes visible, far eye narrower, show chest front and narrow side, crown and boot tops. Head, chest, pelvis, knees, toes all share this heading. No profile/frontal camera changes, mirroring or rotating within sheet. Near limb starts screen-right; far starts screen-left and is occluded behind. Preserve shoulder-elbow-hand and hip-knee-ankle-boot anatomical ownership, especially crossing limbs.
REGISTRATION: exact requested equal cells in row-major order. One whole figure per cell. Identical body dimensions, head width, limb lengths, neutral pelvis position and camera. Standing crown near 7% cell height, soles near 90%; leave margin, no cropping. Pose changes must not trigger scale changes. Seated figure is naturally shorter, not enlarged. Small walk bob permitted; never independently recenter moving silhouettes or lower lifted feet to floor.
MEDIUM: crisp deliberately grouped pixel art, stepped contours, coherent coarse grid readable at 96x96 logical cells, neutral upper-left shading. Actual transparent RGBA background, opaque body pixels and transparent limb gaps. No floor/shadow, gradient, checkerboard drawing, captions, grids, text, watermarks, guide bones/colors, smooth painterly/3D shading, fringe/colored noise. ABSOLUTELY NO magic circles, light, sparks, aura or effects in body sheets: common ward circle is separate. Keep face and physical hand/tool contacts legible.

FOUR frames, 2x2 equal cells. Image2 is canonical held casting pose. One wand held in SCREEN-LEFT hand throughout returning, screen-RIGHT hand supports empty. 1 exact reference held stance, baton at screen-left, EMPTY screen-right belt holder. 2 SCREEN-LEFT arm bends inward, lowering wand toward belly; right-side hand relaxes empty. 3 SAME SCREEN-LEFT arm reaches ACROSS the front of plum sash to SCREEN-RIGHT belt holder, seats baton shaft downward into loop; baton brass grip visible above holder, sleeve/hand across waist, right-side hand stays empty at side. 4 both hands empty at sides, one baton secured in its original screen-right belt holder, canonical standing idle as image1. Never switch holding hands, never duplicate baton. Fixed soles/root, same camera and body size, no effects.

## notes

### Conductor Mage

Full motion GIF · All poses · Casting GIF · Complete production prompt.

Original coordination mage for the project's conductor role: compact ink-blue bob, brass clip, navy/ivory coat, plum sash and one ivory/brass baton. Same physical family and elevated lower-left three-quarter camera as the accepted adventurer.

#### Delivered assets

Body strips in `exports/conductor/`, 96 × 96 RGBA cells, left-to-right frame order:

| Action | Frames | Duration |
| --- | --- | --- |
| idle | 4 | 1880 ms |
| walk | 4 | 880 ms |
| sit | 2 | 1130 ms |
| cast-start | 4 | 1000 ms |
| cast-loop | 4 | 720 ms |
| cast-end | 4 | 1140 ms |

Use horizontal mirroring for rightward movement. Both-direction walk preview. Start/end are one-shot actions; idle, walk, sit and casting are loops.

The full GIF is 440 × 440, 60 frames, 16320 ms: idle, left walk, right walk, rest, draw baton, conduct with shared circle, stow baton, idle. Repetitions demonstrate loops; transitions run once.

#### Tool continuity and shared magic

The SCREEN-LEFT arm reaches across the sash to draw the single baton from the SCREEN-RIGHT belt loop. The same hand conducts and returns it; the other hand opens in support. The loop stays empty while the baton is held. Cast-start v1/v2 switched hands and are rejected. Selected v3 corrects the cross-body draw.

Use the exact shared circle, `exports/shared/ward-circle.png`: four 128px cells, 180 ms each, ground anchor (64,86), behind the character. It is not duplicated into this pack. Body sheets remain effect-free.

Whole canonical frames are reused: idle1 = start1 = end4; start4 = loop1 = end1. This makes transition boundaries identical without rebuilding limbs.

#### Sources, reproduction and validation

Generation provenance indexes eight built-in calls: six action sheets plus two targeted start corrections. Master appearance prompt, complete motion contract, final casting prompts, selected cross-body edit. Original sources are kept alongside selected candidates.

Rebuild with `uv run --with pillow python docs/camp-assets/scripts/export-conductor.py`. Export config selects source revisions. Manifest records transforms/timing; validation records bounds, binary body alpha, identical transition boundaries and unchanged shared-effect hash.

Export inspection covered all six actions on dark and light backgrounds, selected casting poses with the shared effect, and GIF frame counts/durations. All body frames fit their cells. Normalization uses one scale per source sheet and grid origin registration; no per-pose scaling or limb reconstruction. Small generated changes in coat details, hair and expression remain between drawings; four-frame movement is intentionally stepped. Runtime integration remains a separate stage.
