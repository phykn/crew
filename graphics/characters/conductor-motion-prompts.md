# Conductor — Complete Motion Contract

Standing master: `candidates/conductor-base-v1.png`. Built-in image generation; exact historical prompts and source provenance are indexed in `conductor-generation.json`. Body sheets have no magic artwork. Reuse `exports/shared/ward-circle.png` unchanged.

## Common identity and registration

Use case: identity-preserve. Production transparent pixel-art sprite sheet for the EXISTING conductor mage from image 1. This reference is the exact accepted identity, not inspiration for redesign.
IDENTITY: Keep the ink-blue compact bob and original fringe, brass hair clip, warm skin, plum-brown expressive modest eyes, friendly adult feminine face, original head/body ratio (roughly 3 to 3.5 heads, never inflate the head), visible neck, compact substantial torso, actual knees and sturdy boots. Match exact navy short coat, gold piping and small chest clasps, ivory blouse and broad cuffs, plum sash, brown belt, charcoal trousers, brown/navy cuffed boots. No hat, cape, skirt, armor or additional accessories. Same palette, pixel groups, hair silhouette and clothes in EVERY frame.
ONE TOOL: exactly ONE slender ivory baton with brass grip, at the visible near/screen-right belt loop when not held. Keep size and attachment as master. On drawing the baton, loop remains EMPTY and visible, never duplicate tool, never erase belt loop. No orb. Empty hands outside casting.
CAMERA: same slightly elevated front THREE-QUARTER facing LOWER-LEFT, both eyes visible, far eye narrower, show chest front and narrow side, crown and boot tops. Head, chest, pelvis, knees, toes all share this heading. No profile/frontal camera changes, mirroring or rotating within sheet. Near limb starts screen-right; far starts screen-left and is occluded behind. Preserve shoulder-elbow-hand and hip-knee-ankle-boot anatomical ownership, especially crossing limbs.
REGISTRATION: exact requested equal cells in row-major order. One whole figure per cell. Identical body dimensions, head width, limb lengths, neutral pelvis position and camera. Standing crown near 7% cell height, soles near 90%; leave margin, no cropping. Pose changes must not trigger scale changes. Seated figure is naturally shorter, not enlarged. Small walk bob permitted; never independently recenter moving silhouettes or lower lifted feet to floor.
MEDIUM: crisp deliberately grouped pixel art, stepped contours, coherent coarse grid readable at 96x96 logical cells, neutral upper-left shading. Actual transparent RGBA background, opaque body pixels and transparent limb gaps. No floor/shadow, gradient, checkerboard drawing, captions, grids, text, watermarks, guide bones/colors, smooth painterly/3D shading, fringe/colored noise. ABSOLUTELY NO magic circles, light, sparks, aura or effects in body sheets: common ward circle is separate. Keep face and physical hand/tool contacts legible.

## idle

FOUR frames, 2x2 square cells. Standing idle: 1 canonical relaxed stance exactly like master, both eyes open, both hands relaxed empty, baton secured; 2 same planted stance, gentle exhale and slightly lowered eyelids; 3 brief natural closed-eye blink, same skeleton; 4 eyes open again, faint breath returns to 1. Tiny movement only, no waving, touching baton, arm swing or hair growth. Soles, belt and head base remain fixed.

## walk

FOUR frames, 2x2 square cells. Image 2 is a code-projected anatomy guide ONLY; copy phases and joint ownership, never colors or labels. Lower-left ordinary WALK, baton secured. 1 NEAR CONTACT: near leg from screen-right hip leads down-left, heel lands, far leg trails up-right toe contact. Near arm back, far arm forward. 2 FAR PASSING: near support below pelvis, FAR knee advances and boot lifts beside support shin; arms pass neutral. 3 FAR CONTACT: FAR leg from screen-left hip leads down-left, near leg trails up-right. Opposite anatomical lead from frame1, near arm forward far arm back. 4 NEAR PASSING: far foot supports, NEAR knee advances with lifted boot passing support shin. Opposite lifted limb from2. Narrow parallel depth tracks, forward includes left AND toward viewer; backward includes right AND away. No crab walk, sideways straddle, kicks, backwards knees, whole-body jumping, running. Modest stride, tiny bob, stable hair and coat. Exactly contact/pass/opposite contact/opposite pass.

## sit

TWO frames, 2 columns x1 row, wide sheet with equal SQUARE cells. Resting seated directly on invisible ground, folded bent legs comfortably in front, upper body same head/body dimensions as standing, crown lower in cell because seated. Same lower-left 3/4 camera. Belt baton secured; hands empty resting naturally on thighs. 1 relaxed open eyes gentle smile; 2 short calm closed-eye blink with subtle breath. No chair, stump, cushions, floor, props or floating feet. Do not scale up seated body to fill cell.

## cast-start

FOUR frames, 2x2 equal cells. Fixed planted feet and lower-left three-quarter camera. Screen-LEFT arm owns the baton for the entire sequence. 1 canonical empty-handed idle, baton secured at screen-RIGHT belt. 2 screen-LEFT hand reaches ACROSS plum sash toward screen-RIGHT baton brass grip; screen-right hand remains empty relaxed. 3 same screen-left hand lifts baton clear to chest; screen-right belt loop now EMPTY; other palm opens at screen-right waist. 4 screen-left hand extends forward holding baton angled up-left, screen-right palm open. No transfer between hands. Match canonical held reference. Historical generated sources v1/v2 switched hands; v3 edits cell2 into this cross-body draw. Exact edit prompt is in conductor-cross-draw-prompt.md.

## cast-loop


FOUR frames, 2x2 equal cells. Image2 is EXACT canonical held casting pose: hand on SCREEN-LEFT grips single baton, hand on SCREEN-RIGHT is open supporting palm; screen-RIGHT belt loop EMPTY. Keep that tool-hand ownership in every frame. Feet planted, head and pelvis fixed. Gentle conducting loop: 1 exact reference held stance; 2 small downbeat of left-side wrist and slightly open chanting mouth; 3 small upbeat, eyelids slightly lowered; 4 return toward1, mouth softly closes. Baton tip moves only a small arc, no whole-body swing or shoulder rotation. No second baton, orb, effect or light. Same body dimensions and camera as references. Do not revert to opposite tool hand from standing.

## cast-end


FOUR frames, 2x2 equal cells. Image2 is canonical held casting pose. One wand held in SCREEN-LEFT hand throughout returning, screen-RIGHT hand supports empty. 1 exact reference held stance, baton at screen-left, EMPTY screen-right belt holder. 2 SCREEN-LEFT arm bends inward, lowering wand toward belly; right-side hand relaxes empty. 3 SAME SCREEN-LEFT arm reaches ACROSS the front of plum sash to SCREEN-RIGHT belt holder, seats baton shaft downward into loop; baton brass grip visible above holder, sleeve/hand across waist, right-side hand stays empty at side. 4 both hands empty at sides, one baton secured in its original screen-right belt holder, canonical standing idle as image1. Never switch holding hands, never duplicate baton. Fixed soles/root, same camera and body size, no effects.

## Source and export rules

Initial exact input: `conductor-motion-initial-prompts.md`. Rejected repair: `conductor-cast-start-repair-prompt.md`. Selected cross-body edit: `conductor-cross-draw-prompt.md`. Exact continuation calls: `conductor-casting-prompts.md`.

Export at 96px square body cells using a uniform scale per sheet, matching original master standing height or seated head width. Grid-origin registration fixes source placement without changing anatomy or scale per pose. Walk keeps shared offsets and depth. Nearest-neighbor resampling and alpha threshold 220 remove low-alpha fringe; no limb reconstruction. Reuse whole canonical frames: idle1 = start1 = end4, start4 = loop1 = end1. Shared circle uses four 128px cells at 180ms each, anchored at (64,86) behind body. Horizontal flip gives the opposite walk direction; do not generate a second camera view.
