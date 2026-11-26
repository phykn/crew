# adventurer

## Code figure

Made like the others (see graphics/README.md "캐릭터 만들기"): `trace.py coder` traces every sheet at its own size and repaints each material in three flat shades.

- Materials: chestnut hair, sage tunic, ivory sleeves, brick scarf, skin, leather (belt and boots), cocoa trousers, and the pale-teal wardstone, kept as thin so the held stone survives the cleanup.
- Hair and trousers share one chestnut, so the rows part them (hair to 22 rows below the crown); the far boot is shaded as dark as the trousers, so it is leather from 62 rows down.
- The tunic's dark folds are drawn as outline, and the sleeves' warm grey shadows stay ivory rather than leather.
- `head.png` is `head.py coder 24 14 22 5 17`: the sheet's own face with skin in flat shades, then by hand the far eye moved down a row to sit level with the near one (lid, iris, glint), thin brows a row above each lid, the sheet's blush, a stray speck cleared, and the bright hair locks one shade above the cleaned hair.
- `sit.png` now rests cross-legged on the ground. Only the image asset was replaced; the app's generated coder figure still needs the other agent's trace/apply pass.

## master

### Adventurer — Classic Fantasy Proportions

#### Direction and scope

One new standing master candidate. Mix only the attachment's compact classic-JRPG proportions and approachable character feel into the camp's established pixel style. Do not copy any specific pictured character, costume, 3D rendering, scene or group composition. The user requested a fresh adventurer; previous adventurer and researcher masters do not fix this character's face or silhouette.

Reference 1: `reference/adventurer-proportions.jpg`, retained from the user attachment. Proportions and overall character appeal only.
Reference 2: `../props/crate.png`. Pixel craft and restrained warm material harmony only.
Reference 3: `reference/camp.png`. Elevated woodland-camp camera/context only.

Apply the reference-role separation, camera checks, restrained head size, clean alpha and staged production approach from `researcher-production-prompt.md`. Motion sheets follow only after this appearance is reviewed. New master remains a mage: a practical wandering ward-caster, with one small belt-mounted wardstone instead of the researcher's orb.

#### Generation prompt

Use case: stylized-concept.
Asset: ONE complete full-body standing pixel-art sprite, transparent cutout, a NEW friendly fantasy adventurer for a woodland camp. Establish one clear master character, not an animation, lineup or reference board.

INPUT ROLES — COMBINE ONLY THE REQUESTED QUALITIES
Image 1 supplies compact classic-JRPG character proportions and the approachable, storybook-adventure appeal of its shorter party members. Borrow the balance between a gently enlarged expressive head and a substantial, readable little body: real torso length, visible knees, sturdy boots, simple layered fantasy clothes. Do NOT reproduce a particular person, exact hairstyle, green hood, specific costume, facial identity, wolf, scenery, companions, camera framing or the image's smooth 3D cinematic medium. This is an original adventurer, not a pixel conversion of a pictured figure.
Image 2 supplies deliberate stepped pixel contours, warm grouped material colors and matte sprite craftsmanship. Do not draw a crate, add wood texture to skin, or turn the face into rigid box geometry.
Image 3 supplies elevated orthographic woodland-camp context and the need to read at small display size. Do not copy its existing characters' rectangular frontal construction or draw its scene, props, labels or interface.

BODY TARGET — CUTE, WITH A PROPER LITTLE BODY
Approximately THREE AND A HALF HEADS from hair crown to boot soles; head including hair around 28–30 percent of the full height. This is a proportion target to render visibly, not text to print. Charming young-adult fantasy companion, softly stylized rather than an infant or a realistic adult. A rounded head only slightly wider than shoulders, a short visible neck, compact but distinct chest and waist, sturdy short legs with actual thigh/knee/shin sections, and reassuringly solid boots. Hair must not balloon until it occupies almost half the figure. Keep hands small but readable and separate from the torso. Not a two-head baby mascot, pin-legged bobblehead, large floating face, lanky model, muscular hero or square-jawed adult. The reference's miniature storybook solidity matters more than copying any detail.

NEW ADVENTURER IDENTITY
An upbeat, capable wandering ward-mage who explores paths and protects the camp. Warm light-medium skin, expressive dark hazel-brown eyes, gentle eyebrows, subtle tiny cheek warmth and a small relaxed confident smile. Both eyes read clearly but occupy a modest fraction of the face; no enormous glassy doll eyes, giant blush circles or portrait-level eyelashes. Short lightly tousled dark chestnut hair, low crown volume, three or four broad locks and a small side-swept fringe with a little forehead visible. Avoid the researcher's large fluffy hair mass and exact face. No hat, hood, helmet, beard or glasses. Calm approachable personality, ready for a journey rather than posing for combat.

ROLE-READABLE CLOTHING
A muted forest/sage-green short travel tunic ending at upper thigh, over an ivory long-sleeved underlayer. Simple open neckline, understated darker-green edge accents, sleeves slightly loose with neat cream cuffs. A small faded brick-red neckerchief tucked close to the neck supplies one clean adventure accent: no long trailing scarf or cape. Narrow worn brown leather waist belt, cocoa trousers, sturdy warm brown leather boots with clear cuffs and toes. Use large readable color masses, matte cloth and quiet leather highlights, no dense seams, metallic armor or costume clutter.
One SMALL FLAT pale-teal wardstone in a simple leather tab on the character's visible near-side/screen-right belt. It is a restrained magical tool and later physical focus, not a large luminous sphere, book or weapon. Exactly one wardstone, securely attached, ordinary material highlights only. Both hands empty and visible. No researcher's amber orb, ochre mantle or duplicate equipment. No sword, shield, staff, backpack, satchel, huge buckle, extra pouches, ornate trim, long robe hiding legs, recognizable emblem or lettering. Practical classic-fantasy adventure silhouette, distinct from the diviner researcher.

BASE POSE AND CAMERA
ONE relaxed grounded idle pose. Both boots planted, slightly separated in narrow depth tracks; knees easy, weight balanced, no wide military stance. Arms down with a little breathing space between hands and tunic; fingers simplified and readable. No walking step, raised knee, waving, pointing, sitting, spellcasting, crossed arms or dramatic head tilt.
Elevated FRONT THREE-QUARTER facing screen LOWER-LEFT, roughly 40–45 degrees from frontal, with camera gently above around 20–25 degrees. Both eyes visible; far eye somewhat narrower, nose a little left of facial center rather than at the left silhouette. Show front chest plane and a narrower side plane, a little crown and shoulder top, boot tops and toes. Face/chest/pelvis/knees/toes share exactly the same heading. Not one-eye profile, straight frontal portrait, sideways feet under a frontal body, strong overhead squashing or perspective lens distortion. The near anatomical shoulder/hip is screen-right; keep limb connections coherent. The near boot is slightly nearer/lower in projection, not an exaggerated split stride.

PIXEL LANGUAGE
Hand-authored small game-sprite look. A coherent coarse grid, crisp stair-step outlines, deliberate connected clusters, restrained coordinated colors with two or three useful shades per material. Target readability in a 96 × 96 logical cell during later export; the high-resolution image itself is not claimed to be a native 96-pixel sprite. Facial charm comes from purposeful clusters rather than tiny polished portrait detail. Neutral upper-left material shading, face and cream sleeves a little brighter than trousers. No smooth 3D rendering from Image 1, painted anime illustration, photorealism, pixelation filter over a painting, noisy dithering, fabric weave, individual hair strands, glossy gradients, motion blur or heavy uniform black sticker border.

FRAMING AND TRUE CUTOUT
ONE full-body figure, crown, fingertips, wardstone and boot soles fully visible within generous empty margins. Center the standing body/root consistently within the canvas, preserving room for future animation. Only the character: no extra views, clones, character sheet, pose numbers or captions. Actual zero alpha outside the hair/body/clothing silhouette and inside the gaps between arms/torso and between legs. Opaque crisp character pixels, not a translucent person. No brown/green halo, colored fringe, ambient cloud, drop shadow, contact shadow, floor, pedestal, reflection, rim glow, magic particles, checkerboard drawing, gray gradient, solid background, scene, border, text or watermark. The belt wardstone is physical and unlit; future conspicuous work magic belongs in a separate ground-effect layer.

#### Review gate

Check the attachment influence through proportion and overall appeal, not copied identity. Check head/body balance near 3.5 heads, two-eye elevated three-quarter camera, complete limb connections, distinct adventurer costume, exactly one belt wardstone, actual transparency and readable pixel groups. Record deviations and preserve earlier sources. One requested candidate only; no automatic roster, animation, regeneration, application integration or Git push.

#### Generated candidate review

Generated once with the built-in image tool. Saved at `candidates/adventurer-classic-v1.png`, 1086 × 1448, RGBA, alpha extrema (0, 255). One complete standing adventurer, warm brown hair, both eyes visible, green travel tunic, ivory sleeves, red neckerchief, brown belt/trousers/boots and one pale-teal belt wardstone. Clearer body/leg length and less baby-like head balance than the earlier large-head adventurer. Front three-quarter face and planted feet are visible; camera elevation is subtle. Head including hair still occupies roughly a third of the silhouette rather than a verified 28–30 percent, so the requested 3.5-head ratio is not exact. No broad brown halo is apparent, but small colored edge speckles remain; alpha extrema alone do not establish a production-clean cutout. The user accepted this appearance and authorized the full motion set; see `adventurer.md`. This original PNG remains unchanged.

## idle

### Adventurer — Idle

#### Generation prompt

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

FOUR frames, 2×2 equal square cells, row-major, restrained standing IDLE LOOP. Image 1 is the accepted adventurer master. Both hands empty and relaxed beside torso, boots planted, single pale-teal stone secured at near-side belt. Preserve the master standing silhouette.
1: eyes open, friendly neutral smile, relaxed shoulders. This is canonical idle.
2: subtle inhale, shoulders at most one logical pixel higher, belt/feet stable.
3: gentle blink, original torso height; hands/tool unchanged.
4: eyes reopen, tiny settling toward frame 1. No wave, head turn, step or big bob.
Keep all four frames the same height/scale and root; frame 4→1 changes gently. Frame 1 will be reused as the exact cast-start and cast-end boundary.

## walk

### Adventurer — Walk

#### Generation prompt

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

FOUR frames only, 2×2 equal square cells, row-major WALK LOOP. Image 1 fixes accepted adventurer identity. Image 2 is the four-pose code-projected skeleton; use its actual near/far connections and opposite arm swing, remove all guide colors and marks. Ordinary modest walking, one lower-left direction, wardstone secured.
1 NEAR CONTACT: lighter near leg from screen-right hip crosses toward forward/lower-left boot, heel lands. Darker far leg trails upper-right with heel lifted/toe contacting. Near arm back, far arm forward.
2 FAR PASSING: near foot supports beneath pelvis; darker far knee advances and lifted boot passes beside support shin. Arms pass neutral. Narrow leg projection, not another open contact stride.
3 FAR CONTACT: darker far leg from screen-left hip now leads lower-left, heel lands. Lighter near leg trails upper-right, rear heel lifted. Near arm forward, far arm back. Actual opposite anatomical lead to frame 1, not just different arms.
4 NEAR PASSING: far foot supports, lighter near knee/boot lifts and passes beside it; arms pass neutral toward frame 1. Opposite lifted leg to frame 2.
Whole head/chest/pelvis/knees/toes face lower-left. Feet move left AND toward viewer when forward, right AND away when back, on two narrow parallel depth tracks. No crab walk, lateral splits, backwards knees, kicks, running or airborne whole body. Only small body bob, scarf/hair stable, no camera changes. Last→first continues same gait. Output four useful poses directly; no eight-frame sheet, extra down/up poses or duplicated figures. Later export timing is 220ms per frame, 880ms per loop, never text in the art.

## sit

### Cross-legged ground rest

Use case: identity-preserve, single-action sprite replacement.
Create ONLY the CODER's seated-rest animation sheet for an existing woodland camp game. Replace the implied-bench sitting with CROSS-LEGGED GROUND SITTING (양반다리 / simple tailor's seat).

REFERENCE ROLES
Image1 is coder/idle.png: exact character identity, actual moderate head/body ratio, short tousled chestnut hair, warm skin, hazel eyes, muted sage green travel tunic, ivory sleeves and cuffs, short brick-red neckerchief, brown belt, cocoa trousers and cuffed brown boots. The SMALL flat pale-teal wardstone stays secured on SCREEN-RIGHT belt. Preserve these exact features; no new costume or accessories. Image2 is coder/head.png: existing hand-finished face and hair reference ONLY, never enlarge the head or reproduce it as a separate floating portrait. Image3 is researcher/sit.png: use ONLY its cross-legged ground pose and compact seated silhouette, not its face, hair, clothing, glasses or prop.

LAYOUT AND CONTINUITY
Exactly TWO complete-body frames in a HORIZONTAL strip of TWO EQUAL SQUARE CELLS. Reading left to right: frame1 open-eyed calm resting smile, frame2 a quiet closed-eye blink. Both bodies have IDENTICAL position, dimensions, hands, clothes, belt prop and crossed legs; only eyelids change. Do not move the head, breathe by scaling, tilt the torso, shift the mouth or vary the silhouette between frames. Generous transparent margins in each cell; entire hair, hands, knees and boot soles inside their own cell. No overlap between cells, lines, numbering or captions.

ANATOMY AND POSE
Character rests directly on invisible flat ground with weight on pelvis. Thighs open comfortably to the sides; both knees bend outward and stay LOW, near the ground. BOTH shins fold inward across the front of the pelvis; ankles cross and boot toes tuck below/opposite knees. A clear broad shallow triangular lower-body silhouette, stable crossed boot overlap in front. Both boots remain attached continuously through shin to knee and thigh; no detached feet, straight dangling calves, standing legs, hover squat, kneeling, lotus feet on thighs, chair or stool pose. Boots are substantial but must not hide the entire crossed-shin structure.
Torso upright and relaxed. Empty hands rest on their respective thighs, elbows bent softly, shoulders relaxed. Exactly two hands, two knees, two legs, two boots. The tunic folds naturally above the crossed legs; belt and stone remain in their normal attachment, never held.
Use the SAME physical head width and upper-body dimensions as standing coder, so seated body is naturally shorter, approximately 60–70% of standing silhouette height. Do NOT inflate head, shrink torso to a baby, or enlarge sitting figure to fill the full standing height.

CAMERA AND STYLE
Elevated orthographic FRONT THREE-QUARTER facing screen LOWER-LEFT, camera above around20–25degrees. BOTH eyes visible when open, far eye narrower. See crown, chest front and narrow side plane, tops of shoulders, thighs and crossed boots. Face, chest, pelvis and knees share coherent orientation. Never pure profile or straight-on flat portrait. Preserve coder's original friendly young-adult classic-JRPG appeal.
Crisp grouped pixel art suitable for later96x96 cells: stepped contours, restrained matte colors, neutral upper-left material shading, coherent clusters, readable fingers and clothing masses. No glossy3D, smooth painting, fine texture noise, dithering, fuzzy outline or sticker border.

CUTOUT INVARIANTS
Genuine transparent RGBA outside character and in limb gaps. Opaque solid body; no white/gray background, checkerboard drawing, paper texture, ground, shadow, pedestal, chair, bench, cushion, scene, border, text, watermark, aura, glow, sparks or magic circle. Output contains exactly the two seated coder bodies and nothing else.

#### Saved result

Generated with the built-in image tool on 2026-11-26. `sit-source.png` preserves the original two-frame transparent sheet. `sit.png` contains two 96px square cells (192×96 RGBA), uniformly scaled from the source using the existing idle head width, aligned to the same bottom baseline, with nearest-neighbor sampling and alpha threshold 220. Both poses have crossed legs and hands on thighs; the second closes its eyes. No bench, floor or magic is drawn. Small generated clothing and face variations remain.

This delivery changes image assets and this brief only. `src/frontend/camp/art/people/coder.js` has not been regenerated; applying the pose to the app belongs to the other agent.

## cast-start

### Adventurer — Cast-start

#### Generation prompt

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

FOUR chronological frames, 2×2 equal square cells, CASTING START played once. Image 1 supplies canonical idle from the generated idle sheet; Image 2 supplies the original accepted appearance. Feet planted at idle root, same camera/scale, calm protective ward magic, not combat.
1 MATCH canonical idle: both hands down, stone secured in the leather belt tab.
2 near hand reaches across the belt to unclip the SAME flat pale-teal wardstone; far hand begins rising to support. Stone transfers physically, no copy.
3 near hand lifts that stone to upper belly, far palm supports underneath; belt leather tab remains attached and visibly EMPTY.
4 hold the stone upright at LOWER CHEST between near fingers and far supporting palm, elbows comfortably bent, focused open eyes and tiny chanting mouth. Stone remains its original small flat size, not a ball. Keep fingers around the edge so the teal face stays visible.
Frame 4 fixes exact hand/stone center and grip for chant-loop and cast-end entry. Single stone only. Do not leave a second teal gem on the belt, erase leather tab, levitate the stone, clasp empty hands or emit body effects. No stepping or large head/torso translation.

## cast-loop

### Chant loop — Remove baked floor art

#### Generation prompt

Use case: precise-object-edit, background-extraction.
Image 1 is the four-frame character sheet to edit. Image 2 is the original accepted appearance and is an identity check only.

Edit ONLY the unwanted non-character pixels. In EACH of the four cells, completely erase the bright cyan/white circular floor graphic surrounding/beneath the boots, including every ring stroke, star/diamond, radiance, arc and colored fringe. Replace those removed areas with real alpha-zero transparency, including the gap between the boots. There must be NO floor graphic, circle, shadow, glow, platform, pedestal or surrounding colored mark anywhere in the output. Do not redraw a replacement graphic.

Preserve the entire character above and including both boot silhouettes, exactly as in Image 1: same face, brown hair, green tunic, cream sleeves, red neckerchief, cocoa trousers, boots, empty belt attachment, single small flat teal stone held at lower chest and identical hand grip. Keep the four facial states and their row-major order: focused open eyes, tiny syllable/inhale change, softly closed eyes, open again. Do not revert the prop to the belt, duplicate it or change its size. Keep the existing elevated front-three-quarter lower-left camera, character body scale, pose and each cell's position. No additional figure, symbols or body light. Feet remain complete, opaque and correctly attached to the legs; never erase the boot toes with the surrounding graphic.

Output one transparent FOUR-FRAME 2×2 equal-square-cell CHARACTER-ONLY sheet. All empty space outside and between limbs is alpha zero. Crisp pixel cutout, preserve original character colors, no brown halo, checkerboard drawing, fringe noise, backdrop, grid, labels, captions, borders or watermark. The result contains four complete isolated people and nothing beneath their boots. Do not reinterpret this cleanup request as a new scene or a new action.

## cast-end

### Adventurer — Cast-end

#### Generation prompt

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

FOUR chronological frames, 2×2 equal square cells, CASTING END played once. Image 1 fixes held-stone neutral from casting start, Image 2 fixes canonical idle, Image 3 supplies original appearance. Same scale/root/camera throughout.
1 MATCH held-stone neutral: both hands at lower chest around one small flat teal stone, belt tab empty and attached.
2 mouth closes into gentle smile, hands lower SAME stone toward upper belly.
3 near hand reseats and clips stone into the persistent near-side belt tab while far hand releases. No second gem remaining in hands, no vanished mounting leather.
4 MATCH idle boundary: one stone secured at belt, both empty hands relaxed down, eyes open, original root and silhouette.
Quiet physical return to rest, no step, new grip height, celebration, outfit change, magical body emission or camera turn. Frame 1 matches neutral cast-loop entry and frame 4 matches idle frame 1 at identical scale. Preserve the same stone shape during hand-to-belt transfer.

## magic

### Ward Circle — Rising Light, Not Liquid

#### Direction

Targeted edit of the accepted ornate ward circle. Keep the ground design, width, density, palette and four-frame structure. Replace only the curved liquid-looking flank ribbons with unequivocally luminous upright rays and rising glints. Character assets and compositing scale stay fixed.

#### Generation prompt

Use case: precise-object-edit.
Image 1 is the existing transparent four-frame EFFECT-ONLY ward-circle sheet. Edit this sheet, preserving the rich ground circle. Exactly FOUR effects, 2 columns × 2 rows, equal square cells, same row-major sequence. No character or scenery.

KEEP THE ACCEPTED GROUND STRUCTURE
Preserve the broad shallow ground ellipse, its 2:1 projection, three concentric rings, turquoise outer perimeter, ivory/gold glyph band, angular polygon chords, inner compass geometry, crisp star/diamond anchor points, central open space, overall width and placement. Keep the design elaborate, bright and substantial. Do not simplify it to a small ring, redesign its symbols, turn it vertical or move the ground center. Keep all four cells at the same scale and aligned center. Preserve warm gold/ivory and pale teal ground colors.

REPLACE ONLY THE UPRIGHT FLANK EFFECTS
The existing curved turquoise uprights resemble water jets or liquid tendrils. REMOVE those thick curved bodies, sweeping S-shaped ribbons, rounded bulb tips and droplet-looking caps. Replace them with clearly visible STRAIGHT VERTICAL SHAFTS OF RADIANT LIGHT at the left and right outer ring anchors. Each flank has two or three slender upright rays with staggered heights, extending up to approximately the same waist-height envelope as the old accents. Rays rise in screen-up direction, not curling outward, bending into waves or arcing back down.

MAKE THEM READ AS LIGHT
Near-white/ivory luminous cores with narrow pale-gold inner edges and a very restrained pale-teal aura. Their brightness is concentrated in fine straight axial strokes. Add short disconnected vertical light dashes rising along each shaft, tiny four-point star glints, and sparse small angular gold/white motes. End the rays with a tapered fading streak or a tiny cross-shaped flare, never a round liquid bead. The ray edge is optically soft only in a narrow local glow; the inner core and pixel clusters stay crisp. The rays have no material thickness, fluid volume, wet surface, blue cylindrical tube or smoke-like body. Do not replace liquid with flames, vines, tentacles, fabric, feathers or thick neon slabs. White/gold light must be visibly distinct from the turquoise floor ring.

FOUR-FRAME UPWARD MOTION
Keep the ground circle anchored and its existing glyph-band progression. The vertical rays remain straight at the same flank anchor positions. Frame 1: low light dashes and small glints begin near ring edges, medium steady bright cores. Frame 2: those dashes/glints rise along the shafts, thin upper portions brighten. Frame 3: higher glints briefly flare; new low dashes appear, opposite flank highlights strengthen slightly. Frame 4: higher dashes fade into transparency and new low ones continue toward frame 1. Continuous magical light ascending, not splashing liquid, falling droplets or bending stalks. Ring diameter and viewpoint never wobble. Every state remains conspicuously illuminated; no empty/off frame.

LAYER AND FRAMING
Effects only: NO person, boots, hands, wardstone, ground tile, floor plane, shadow or pedestal. Keep the central character/face/hand column clear of tall emission, without cutting a person-shaped hole into the art. Tall rays belong at the LEFT and RIGHT flanks; do not add a central beam hiding the later character. Preserve complete outer glyphs and safe empty cell margins, no cross-cell content or clipping. Proposed logical export remains 128×128 per effect with the same ground anchor; generated resolution may differ but the four cells must stay equal.

PIXEL OUTPUT AND TRANSPARENCY
Crisp purposeful pixel clusters, deliberate bright cores, restrained local glow, no smooth vector-poster redesign or painterly texture. True transparent PNG: alpha zero outside actual luminous strokes and their narrow falloff, including the inner gaps. No baked black/gray backdrop, opaque checkerboard, RGB speckle cloud, surrounding haze, labels, frame lines, digits, text, watermark or additional figures. Preserve all accepted ground-ring detail and change only the flank language from curved teal liquid shapes to upward-flowing white/gold LIGHT.

#### Review

Inspect raw art and composited GIF for straight rays, upward glints, retained ornate circle, no fluid-shaped uprights, stable floor center and unclipped luminous bounds. Keep all six character strip hashes unchanged. Source output, prompt and the refreshed previews remain local assets.

#### Delivered result

Generated once with the built-in image tool. `candidates/adventurer-magic-v3.png`: 1261 × 1247 RGBA. Curved turquoise flank bodies are replaced by straight narrow ivory/gold rays, cross-shaped light flares and rising dashes; the three-ring floor composition remains visually consistent. Export retains four 128-pixel effect cells, common brightness scale and registered ground center (64,86). Normalized strip is `exports/adventurer/magic.png`; current GIF is `previews/adventurer-cast-loop-v3.gif`, four frames, 720 ms, 440 × 440. Entire luminous bounds remain inside both effect cells and preview. All six character strip SHA-256 hashes are unchanged. Canonical chanting/effect/full motion previews were rebuilt with the new effect.

## notes

### Adventurer Ward Mage — Motion Delivery

Accepted appearance: original standing master. Complete requested motion set generated with the built-in image tool, based on the character-specific production prompt. Scope is local asset production and previews. The user subsequently approved this circle as the common effect for all characters.

Full motion GIF · All frame contact sheet · Casting contact sheet · Light-background boundary review.

#### Delivered files

Logical character cells are 96 × 96; the upgraded ground effect uses 128 × 128 cells. Exported PNGs are horizontal strips; source layouts are listed below. GIFs are 440 × 440, with extra lower margin for the larger circle. The full preview includes left and horizontally mirrored right walking, seated rest and the idle→start→chant→end→idle sequence: **60 frames, 16.32 seconds**.

| Action             | Frames / source layout | Logical strip | Preview duration                 | Source        | Exact prompt                     |
| ------------------ | ---------------------- | ------------- | -------------------------------- | ------------- | -------------------------------- |
| Idle               | 4 / 2 × 2              | PNG           | GIF, 1.88 s                      | PNG           | Prompt                           |
| Walk               | 4 / 2 × 2              | PNG           | GIF, 0.88 s                      | PNG           | Prompt                           |
| Seated rest        | 2 / 2 × 1              | PNG           | GIF, 1.13 s                      | PNG           | Prompt                           |
| Casting start      | 4 / 2 × 2              | PNG           | GIF, 1.00 s, once                | PNG           | Prompt                           |
| Working chant      | 4 / 2 × 2              | PNG           | GIF with separate effect, 0.72 s | Corrected PNG | Initial prompt, targeted cleanup |
| Casting end        | 4 / 2 × 2              | PNG           | GIF, 1.14 s, once                | PNG           | Prompt                           |
| Ground ward effect | 4 / 2 × 2              | PNG           | Effect-only GIF, 0.72 s          | PNG           | Prompt                           |

#### Identity and tool continuity

Green short tunic, cream sleeves, red neckerchief, brown belt/trousers/boots and the same small flat teal wardstone. Idle/walk/seated keep the stone attached. Casting start unclips it, leaving the leather tab present and empty. Chant holds it at lower chest. Casting end returns that single tool to the same attachment. Colored tool pixels move from approximately logical (51,55) at belt to (45,42–43) when held, then back; these measured centers are a color check, not a semantic object counter.

Walking uses the four-pose skeleton derived from the existing projected joint data in `reference/walk-guide.json`: near contact, far passing, far contact, near passing. Both contact and passing pairs visibly change anatomical lead/lifted side. The third pose has a slightly different torso turn; small drawing and perspective variation remains.

#### Corrections and export

Ten built-in generations: seven initial sheets, one targeted chant cleanup, one ground-circle redesign, and one targeted change from fluid-shaped flank ribbons to rising light. The first chant sheet incorrectly baked a ground circle into the body artwork; it is retained as rejected history and is not used by the exporter. The correction removes that floor art while keeping the character. The separately generated teal/gold effect is composited behind the boots at their ground midpoint, never at the chest.

Source sheets vary in canvas size and character position. Export uses one uniform scale for each complete source sheet, matching the master standing height; seated scale uses master head width so the shorter silhouette is not enlarged to standing height. For planted poses, source-grid column origins align median head centers and row origins align planted boot baselines. This corrects the cast-start sheet's large column displacement without stretching limbs or fitting every pose's silhouette. Walk keeps one shared offset to preserve stride depth. Character alpha is thresholded at 220, removing low-alpha colored fringes; effects keep intentional translucent luminous falloff. Raw PNGs remain unchanged.

Whole canonical drawings are reused at four boundaries, with exact pixel equality:

- cast-start 1 = idle 1;
- cast-loop 1 = cast-start 4;
- cast-end 1 = cast-start 4;
- cast-end 4 = idle 1.

The exported sheets have 22 character frames in 96-pixel cells plus 4 effect frames in 128-pixel cells. All are nonempty and remain inside their own cells, without edge clipping. Character alpha is binary 0/255; exported PNGs contain no baked floor circle. Walk GIF is four frames at 220 ms each. Start/end GIFs have no loop extension and play once; full preview cycles the complete demonstration. Checks and actual transforms/timings are recorded in validation and manifest. Dark/light review images show the cutouts at display scale; this is not a claim of pixel-identical identity across every generated drawing.

#### Rebuild and later integration

`uv run --with pillow python docs/camp-assets/scripts/export-adventurer.py`

Settings: adventurer-export.json. Exact generation input/output paths: generation record. Boundary source crops are `reference/adventurer-idle-boundary.png` and `reference/adventurer-held-boundary.png`.

No application code or runtime atlas registration was changed. Before later integration, check actual bench seat anchors, in-world display scale, flipped equipment/lighting and the remaining small facial/hand/torso drawing differences. The PNG strips and timing metadata are supplied for that phase. No commit or push.

#### Upgraded ground circle

Updated chanting GIF · Effect strip · High-resolution source · Current light revision prompt · Ground design brief.

User requested a more impressive circle. The redesign adds three concentric structures, a dense gold/white glyph band, polygon chords, larger turquoise perimeter accents, straight ivory/gold flank rays and rising glints. The user approved the ornate ground design but requested replacing the water-like curved ribbons; v3 makes that targeted change. Bright-core export width increases from 58 to 100 logical pixels. Effect cells are 128 × 128, with ground center (64,86); character cells/PNGs are unchanged, verified by SHA-256 for all six action strips.

The earlier effect anchor used all bright pixels, so side pillars could bias the ground center. Revised export finds each frame's central ground-stroke median, excluding flank pillars, and registers that center under the feet at a shared uniform scale. Alpha below 8 is discarded as near-invisible speckle; meaningful luminous falloff is retained. Preview height increases from 420 to 440 to keep the entire larger front arc visible, while the character position and floor anchor stay fixed. All four effect bounds fit inside both the 128-pixel cell and the stage; face and hand-held tool remain clear. Effect/chant timing remains four frames, 720 ms. Full motion GIF was rebuilt with the new effect.
