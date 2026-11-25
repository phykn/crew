# Skeleton-guided walk cycle

## Generation prompt

Use case: identity-preserve and sketch-to-render.
Asset: one complete eight-frame transparent pixel-art WALK CYCLE sprite sheet for the existing cute researcher mage. Eight distinct anatomical poses, one identity, one camera, constant scale and anchors. Target canvas ratio 2:1, 4 columns by 2 rows of equal square cells, ideally 1536 × 768. Read row-major: 1 2 3 4 / 5 6 7 8. Render exactly one whole character per cell. No text or lines.

REFERENCE PRIORITY
Image 1 is the corrected character reference. Keep its face, hair shape, costume colors, orb-side ownership and elevated front-three-quarter camera. Image 2 is a code-built eight-pose skeleton: use its near/far limb connectivity, projected forward/back motion, knee bends, arm counter-swing and constant body root, not a repeated copy of Image 1. Pink bones identify the NEAR anatomical side; teal identifies FAR. These are guidance colors only: output actual cream sleeves/cocoa trousers/brown boots. Remove the guide's numbers, labels, arrows, colored bones and beige background. Render all eight poses of the SAME individual, not eight different characters.

CRITICAL ANATOMY CONTRACT
The NEAR leg begins at the screen-right/visible-orb-side hip, regardless of where its foot moves. Keep its trouser tone slightly lighter/warmer than the far leg throughout. The FAR leg begins at the screen-left hip, with a darker trouser tone and depth occlusion. For frames 1 and 5, these hip-to-knee-to-boot connections MUST reverse which leg leads. Do not merely swap arm positions while keeping the same leg silhouette. Near shoulder and near hip belong to the same screen-right side. Arms counter-swing opposite their corresponding leg. No whole-character mirroring or camera rotation between phases. Head, chest, pelvis, knees and toes all share the same lower-left heading. Knees bend forward in that heading. Use two narrow parallel foot tracks in depth, not legs spreading sideways from a frontal torso.

FRAME-BY-FRAME ACTION
1 — NEAR CONTACT: lighter near leg reaches forward toward lower-left from the right hip, passing in front of the darker far thigh; near heel lands. Darker far leg trails upper-right, heel raised, toe contacts. Near arm back; far arm forward.
2 — NEAR DOWN: near leg supports weight with a gently flexed knee and flat sole, pelvis slightly lower. Far foot releases from its trailing toe and begins swinging forward with a bent knee. Near arm starts returning toward neutral. Both legs are not straight frozen copies of frame 1.
3 — FAR PASSING: near foot supports below the pelvis, near leg relatively straight. Darker far knee comes forward and its lifted boot passes beside the support shin, clearly off the ground. Both hands pass near the torso sides. Legs come close rather than maintaining an open contact stride.
4 — FAR UP: near support heel rises behind the pelvis, pushing off. Far thigh swings forward, far knee extends toward the next landing, boot remains airborne. Pelvis slightly higher. Near arm forward; far arm back.
5 — FAR CONTACT: darker FAR leg now reaches forward/lower-left from the left hip; its heel lands. Lighter NEAR leg visibly trails upper-right from the right hip, near rear heel raised/toe contact. This is the opposite anatomical lead to frame 1. Near arm forward; far arm back. Keep face, orb cradle and camera unchanged.
6 — FAR DOWN: far leg supports with a flexed knee and flat sole; near leg lifts from its trailing toe, beginning the forward recovery. Pelvis slightly lower. Do not retain frame 5's straight stride.
7 — NEAR PASSING: darker far leg supports below the pelvis; lighter near knee advances and its boot passes beside the support shin, lifted off ground. Arms cross neutral. This is the near-side passing phase, not another contact pose.
8 — NEAR UP: far heel pushes off behind; lighter near leg extends forward in preparation for frame 1 heel landing. Near arm back; far arm forward. Pelvis slightly higher. Last-to-first transition is a small continuation, not a sudden direction change.

CAMERA AND CHARACTER
Cute young-adult miniature woodland diviner, approximately three heads tall, reduced head/hair volume without losing large warm brown anime eyes and small rosy cheeks, gentle smile, chestnut layered hair. Elevated front three-quarter facing lower-left: both eyes plainly visible, far eye narrower, both front sage vest panels visible, narrow near-side plane, some hair crown and boot tops. Cream tunic and sleeves, short ochre shoulder mantle with round clasp, sage open vest, cocoa trousers, cuffed brown boots, single amber orb in brown screen-right belt cradle. Orb stays secured at the SAME anatomical side in every phase. No hat, staff, weapon, book, extra orb, long cloak or new accessories. Walk calmly with a modest natural stride, not a run, hop, kick or squat. Only a small two-pixel logical body bob; mantle/hair follow gently rather than changing design. Keep eyes open for walking.

REGISTRATION AND PIXEL CRAFT
The guide provides equal cells and a fixed root near cell (50%,87%). Keep the body center aligned to this root in every cell; don't separately center each pose's changing silhouette. Same head width, limb lengths, camera, hair cluster pattern, orb size and physical scale across all cells. Leave crown, hands and soles inside their own cells with safe margins. Each cell remains square. Crisp hand-authored pixel sprite look, stepped contours, flat grouped warm palette, coherent coarse grid, neutral upper-left material shading. No high-resolution painted texture, photorealism, smooth 3D, antialiased contour blur, thick sticker edge or dithering cloud.

TRANSPARENCY
True alpha-zero empty space outside and between limbs. No cast shadow, brown haze, rim-light halo, gray gradient, checkerboard drawn into pixels, floor, pedestal, glow or magic. The reference's atmospheric brown halo is a defect, never part of the character. No labels, frame numbers, gridlines, divider marks, captions, watermark or additional figures. Eight isolated cutouts only.

## Review gate

Check 1 versus 5 for actual anatomical leg alternation and 3 versus 7 for different lifted passing legs. Review eight-frame playback, including 8→1, at constant sheet scale and root. A correctly sized sheet is not proof of correct gait. Keep raw output and document any remaining defects.

## Delivered result

Built-in image generation produced `candidates/researcher-guided-walk-v1.png`, 1774 × 887 RGBA, alpha extrema 0–255. Eight distinguishable poses establish light-near versus dark-far leading legs and separate passing poses; the large brown halo from the single-pose sources is absent, with residual edge color noise. Exact requested pixel dimensions were not followed, but the aspect ratio provides equal square source cells.

The user then requested fewer frames. The delivered cycle uses source frames **1, 3, 5, 7**: near contact, far passing, far contact, near passing. `candidates/researcher-walk-final.png` is a four-cell 384 × 96 transparent sheet. `previews/researcher-walk-final.gif` is four frames at 220 ms each, 880 ms total, 384 × 384 on a dark background. Native cells are 96 × 96; one uniform source-cell transform preserves relative scale and position. Alpha is thresholded at 220 for hard-edged export. No procedural limb deformation or per-pose silhouette fitting. Pose registration and silhouette differences remain visible; this is the current asset delivery, not an application integration or user approval.

Rebuild: `uv run --with pillow python docs/camp-assets/scripts/export-researcher-walk.py`. Export measurements are in `previews/researcher-walk-final.json`.
