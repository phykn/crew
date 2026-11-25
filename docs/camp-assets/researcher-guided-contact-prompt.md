# Skeleton-guided opposite contact

## Generation prompt

Use case: identity-preserve, with sketch-to-render pose control.
Asset: one full-body pixel-art walk keyframe of the existing researcher mage, facing lower-left in an elevated front three-quarter view.

INPUT CONTRACT
Image 1 supplies face, hair, costume, material colors and camera ONLY. Its leg phase, oversized hair mass and brown halo are not things to preserve. Image 2 supplies the anatomical pose: a code-projected three-dimensional skeleton with fixed left/right limb ownership. Render the character over this skeleton's geometry rather than copying Image 1's walking silhouette. The guide is a construction reference, not part of the output. No colored bones, guide text, arrows, grid or paper background in the result.

THE ONE CHANGE THAT MUST BE VISIBLE
The NEAR leg is the leg belonging to the character's visible orb-bearing side, starting at the screen-right hip. It must reach FORWARD toward lower-left, crossing in front of the far leg. Its continuous thigh, knee, shin and cuff must visibly connect the screen-right hip to the front/lower-left boot. This foreground trouser leg is a warmer/lighter cocoa. The FAR leg starts at the screen-left hip and extends BEHIND toward upper-right, partly occluded by the near thigh; it is a darker cocoa. Its heel lifts, rear toe contacts. The near heel lands in front with toe slightly lifted. Do not leave the screen-left hip's leg in front again. Do not draw the same previous silhouette with different arm positions. Do not mirror the character.

GUIDE INTERPRETATION
Pink = near anatomical arm and leg, teal = far anatomical arm and leg. Replace pink/teal with the actual cream sleeves, cocoa trousers and brown boots while preserving bone connections and crossings. Near shoulder is at screen-right, near arm swings BACK toward upper-right; far shoulder at screen-left, far arm swings FORWARD toward lower-left. Shoulders and pelvis share a lower-left heading. The pose is an ordinary modest walking contact, not a run, hop, kick or legs crossing sideways. Both feet remain on two narrow parallel tracks in depth. The knee bends along the travel direction. Far limb renders behind torso and foreground limb. No detached boot, extra leg, hidden missing limb or impossible knee.

CAMERA AND IDENTITY LOCK
Keep Image 1's elevated front three-quarter camera: both brown eyes visible, smaller far eye, nose slightly left of facial center, both sage vest front panels visible, right side plane narrower than chest front. Show a little hair crown and boot tops. All head/chest/pelvis/knee/boot axes face the same diagonal lower-left heading. Never a side profile or frontal torso with sideways legs. Keep the warm cute anime face, chestnut layered hair, rosy cheeks, gentle smile, cream tunic and sleeves, short ochre mantle with one round clasp, sage vest, brown belt and single amber orb in the same screen-right cradle. No hat, staff, book, armor, long cloak or extra orb. Follow the guide's roughly three-head full height: reduce the reference hair/head volume while keeping the cute face. Do not enlarge the head at the expense of the knees and boots.

PIXEL STYLE AND CUTOUT
Crisp stepped pixel silhouettes, coherent coarse pixel grid, flat grouped color clusters, warm neutral upper-left material shading, small readable sprite detail. Full figure with generous empty margin around crown, sleeves and soles. One pose only, no comparison sheet. Truly transparent outside and in limb gaps: alpha zero. The reference's brown atmospheric haze is a defect: remove it completely; no brown outline cloud, semitransparent halo, drop shadow, floor, magic, checkerboard drawing, gray studio gradient, labels, border or watermark. Keep pixel edges hard and clean, no painted blur, smooth 3D, photorealism or high-frequency texture.

## Acceptance

Inspect actual near-hip-to-forward-boot continuity, opposite arm swing, both-eye camera, unchanged orb ownership and clean alpha. Only then expand into eight frames.

## Result

`candidates/researcher-guided-contact-v1.png` preserves the two-eye elevated camera, reduces hair/head volume, and more clearly connects the foreground thigh across toward the lower-left boot with the near sleeve back. This is a pose-control candidate, not an approved replacement master. The stride is long and a brown halo persists; the cycle brief requests a modest stride and clean transparency.
