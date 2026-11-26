# tester

## Code figure

Made like the others (see graphics/README.md "캐릭터 만들기"): `trace.py tester` traces every sheet at its own size and repaints each material in three flat shades.

- Materials: sandy hair and tan skin share one warm hue and are parted by hue, saturation, and value within 21 rows of the crown; mustard vest, ivory shirt (its greyer tan shadows down to the cuffs), petrol-blue scarf, olive trousers, brown boots and belt as leather, and the turquoise vial.
- The trousers' darker olive folds and seams are drawn as outline, so the cloth stays clean.
- The vial is too small for three shades of glass, so its near-black rim joins it: rim, teal, glare. It is one-pixel thin.
- `head.png` is `head.py tester 23 11 20 4 18`, then by hand: the sheet's own eyes put back pixel for pixel (head.py took their browns for hair), the pale locks framing the face made hair again (head.py took them for skin), two forehead specks cleared, thin soft brows a row over each eye, and the jaw's and locks' other sheet pixels snapped to the cleaned shades to fit the letters. Both eyes share the lid row; the far eye's lash flick is inside its blink box.

## master

### Tester / Field Alchemist

Use case: stylized-concept. Asset type: original classic fantasy camp character master, matching the accepted pixel-art family.
INPUT REFERENCES: image1 adventurer supplies ONLY actual head/body balance, substantial compact anatomy, original coarse pixel grouping, warm face appeal and elevated lower-left camera. Image2 conductor supplies the same female/male family scale and crisp material craft. Do NOT copy either character's face, hairstyle, outfit or props.
CHARACTER DESIGN: An energetic young adult female field alchemist with medium brown skin, short sandy-blond hair in a tiny stubby ponytail, hazel eyes and a confident cheerful face. Muted mustard short practical vest over an ivory broad-cuffed shirt, petrol-blue neckerchief, dark olive trousers, brown sturdy boots and simple brown belt. One tiny CLOSED turquoise test-vial holder at SCREEN-RIGHT belt, vial stays sealed and attached. No goggles over eyes, armor, large bag or hat.
CAMERA AND PROPORTION: full body, front THREE-QUARTER facing LOWER-LEFT, elevated 20-25 degrees, BOTH eyes visible, far eye narrower, see chest front and narrow side plane, crown, shoulder tops and boot tops. One coherent head/chest/pelvis/knee/toe heading. Roughly 3 to 3.5 heads, match actual refs; head moderately enlarged but not baby/giant chibi. Visible short neck, substantial torso, actual knees, sturdy boots, cute expressive adult JRPG appeal. No realistic long limbs or angular portrait face. Standing relaxed, BOTH hands EMPTY down beside body, feet planted naturally.
COSTUME/PROP LOCK: use exactly listed clothing cuts, palette and one attached small role prop. The prop is secured at SCREEN-RIGHT belt and remains there for later walking/resting/casting; magic is chanted using empty hands. Do not hold or duplicate it. No extra weapons, staff, floating books, familiar or accessories. Keep silhouettes compact for camp readability.
PIXEL ART: deliberate chunky stepped contours, coherent coarse pixel grid, grouped colors and neutral upper-left material shading. Cute classic fantasy sprite, readable at 96x96 logical cell. No glossy 3D, smooth painted anime portrait, fine-texture noise, dithering fog, thick sticker border or giant eyes/highlights. Warm approachable face.
FRAMING AND CUTOUT: exactly ONE complete character, generous transparent margins, crown around 7% height, feet near90%, entire silhouette inside. Actual transparent RGBA outside body and inside limb gaps, opaque body. No backdrop, shadow, floor, pedestal, labels, captions, grids, checkerboard drawing or watermark. No aura, light, magic circle, sparks or emitted magic: shared effect is a separate layer. No colored fringe or contour blur.

## idle

### Tester / Field Alchemist — idle

Use case: identity-preserve. Production transparent pixel-art body sprites for the EXACT existing character in image1.
IDENTITY LOCK: An energetic young adult female field alchemist with medium brown skin, short sandy-blond hair in a tiny stubby ponytail, hazel eyes and a confident cheerful face. Muted mustard short practical vest over an ivory broad-cuffed shirt, petrol-blue neckerchief, dark olive trousers, brown sturdy boots and simple brown belt. One tiny CLOSED turquoise test-vial holder at SCREEN-RIGHT belt, vial stays sealed and attached. No goggles over eyes, armor, large bag or hat. Match image1's actual accepted face, hair silhouette, head/body balance, proportions, clothes cut, material colors, cuffs, belt, boots and attached small role prop in EVERY frame. This is an animation of the SAME person, not a new outfit/concept. Adult cute JRPG appeal, moderately enlarged head, visible short neck, substantial compact torso, real knees and sturdy boots. Do not inflate head or add hair volume, portrait detail, long limbs or new accessories.
EMPTY-HAND MAGIC: All physical role props remain SECURED at their original screen-RIGHT belt mount or collar throughout EVERY action, including casting. No drawing, handing over, stowing or duplicating tools. Both hands stay EMPTY. Magic is spoken/gestured; all emitted light and the shared ground circle are separate assets. No orb or physical object magically appears between palms. Fingers should read as simple small coherent pixel clusters.
CAMERA/ANATOMY: Elevated FRONT THREE-QUARTER, facing LOWER-LEFT throughout. BOTH eyes visible, far eye narrower, front of chest and narrow side plane visible, hair crown and boot tops. Head, chest, pelvis, knees and toes share the heading. No one-eye profile, frontal torso with sideways legs, camera rotation or mirroring within sheet. NEAR shoulder/hip begins SCREEN-RIGHT, FAR begins SCREEN-LEFT and goes behind on overlap. Trace continuous shoulder→elbow→hand and hip→knee→ankle→boot; sides keep ownership through crossings. Use slightly lighter near trousers and darker far trousers without changing palette.
LAYOUT: exact action count and equal cells, row-major order. One whole body per cell, fixed dimensions, head width, limb lengths, camera, neutral pelvis/root position. Crown around7% and planted soles around90% of each standing cell, generous side margins, all fingers/boots/hair inside cell. Small walk bob only. No independent silhouette re-centering or scaling to fill cells. Lifted feet stay lifted; seated figure is shorter than standing, NEVER enlarged. Planted poses hold boot/root anchors steady.
PIXEL CUTOUT: Crisp stepped contours, deliberate grouped colors and coherent coarse grid, upper-left neutral material shading, readable at96×96 logical cells. Opaque body pixels, actual transparent RGBA outside and in limb gaps. No smooth anime painting, glossy3D, fine texture noise, blur, halo, colored fringe, outline sticker or translucent body. No shadow, floor, pedestal, scenery, backdrop, checkerboard drawing, labels, numbers, captions, gridlines, borders or watermark. ABSOLUTELY NO light, sparks, aura, magic circles or effect pixels baked into the sheet. Image2 when supplied is specifically described in ACTION: use it only for that role, not extra costumes or guide marks.

ACTION:
FOUR frames, 2×2 equal SQUARE cells. Standing IDLE:1 canonical relaxed standing, friendly open eyes, hands down EMPTY, role prop secured;2 subtle exhale and slightly lowered eyelids;3 brief natural closed-eye blink;4 open eyes and small return breath toward1. Same soles, belt/root, neck base and arm placements, very small motion only. No touching tool, waving, turning or swaying.

## walk

### Tester Walk — Opposite Contact Repair

Use case: identity-preserve with anatomical pose guidance. Correct the existing TESTER walk sheet. Image1 is tester-master-v1.png, exact identity/camera/clothes. Image2 is adventurer-walk-guide.png, code-projected four-pose joint ownership, pink=near and teal=far; never render these marks. Image3 is tester-walk-pack-v1.png, rejected gait reference. Keep its face, costume, scale, camera and attached sealed turquoise vial. FOUR frames in equal 2x2 cells, row-major. This is a targeted leg/arm phase repair, not a redesign.
The old contact frames1/3 repeat the same leading-leg impression and arm phase. Preserve modest forward-down-left depth travel and fix phase3 to visibly lead with the OTHER anatomical leg. Near hip begins SCREEN-RIGHT, far hip SCREEN-LEFT. Identify those origins before drawing; ownership persists through crossing.
1 NEAR contact: near leg from right hip reaches down-left heel, far leg trails up-right toe, NEAR arm back FAR arm forward.
2 FAR passing: near leg supports under pelvis, FAR boot lifts past support shin, arms pass neutral.
3 FAR contact: FAR leg from LEFT hip now reaches down-left heel IN FRONT of the near leg; near leg from RIGHT hip trails up-right toe. NEAR arm visibly forward, FAR arm visibly back. Do not copy frame1 legs or arm phase.
4 NEAR passing: FAR leg supports, NEAR knee/boot lifts beside it, opposite lifted limb from2.
Head/chest/pelvis/knees/toes face the same lower-left direction. Both eyes and chest front remain visible. No lateral straddle, crab walk, kicks, backward knees, torso rotation or mirroring a whole character. Same substantial compact body and actual master head ratio, tiny bob only, one shared scale/root, crown7%, soles90%, all figures inside cells. Keep both hands empty, vial secured throughout. Crisp grouped pixel art, real transparent RGBA background, opaque body, no floor/shadow/text/grid/guide colors/halo/effects. No procedural cutout limb repairs. Later select v2 only after contact/passing alternation is visually confirmed.

## sit

### Tester / Field Alchemist — sit

Use case: identity-preserve. Production transparent pixel-art body sprites for the EXACT existing character in image1.
IDENTITY LOCK: An energetic young adult female field alchemist with medium brown skin, short sandy-blond hair in a tiny stubby ponytail, hazel eyes and a confident cheerful face. Muted mustard short practical vest over an ivory broad-cuffed shirt, petrol-blue neckerchief, dark olive trousers, brown sturdy boots and simple brown belt. One tiny CLOSED turquoise test-vial holder at SCREEN-RIGHT belt, vial stays sealed and attached. No goggles over eyes, armor, large bag or hat. Match image1's actual accepted face, hair silhouette, head/body balance, proportions, clothes cut, material colors, cuffs, belt, boots and attached small role prop in EVERY frame. This is an animation of the SAME person, not a new outfit/concept. Adult cute JRPG appeal, moderately enlarged head, visible short neck, substantial compact torso, real knees and sturdy boots. Do not inflate head or add hair volume, portrait detail, long limbs or new accessories.
EMPTY-HAND MAGIC: All physical role props remain SECURED at their original screen-RIGHT belt mount or collar throughout EVERY action, including casting. No drawing, handing over, stowing or duplicating tools. Both hands stay EMPTY. Magic is spoken/gestured; all emitted light and the shared ground circle are separate assets. No orb or physical object magically appears between palms. Fingers should read as simple small coherent pixel clusters.
CAMERA/ANATOMY: Elevated FRONT THREE-QUARTER, facing LOWER-LEFT throughout. BOTH eyes visible, far eye narrower, front of chest and narrow side plane visible, hair crown and boot tops. Head, chest, pelvis, knees and toes share the heading. No one-eye profile, frontal torso with sideways legs, camera rotation or mirroring within sheet. NEAR shoulder/hip begins SCREEN-RIGHT, FAR begins SCREEN-LEFT and goes behind on overlap. Trace continuous shoulder→elbow→hand and hip→knee→ankle→boot; sides keep ownership through crossings. Use slightly lighter near trousers and darker far trousers without changing palette.
LAYOUT: exact action count and equal cells, row-major order. One whole body per cell, fixed dimensions, head width, limb lengths, camera, neutral pelvis/root position. Crown around7% and planted soles around90% of each standing cell, generous side margins, all fingers/boots/hair inside cell. Small walk bob only. No independent silhouette re-centering or scaling to fill cells. Lifted feet stay lifted; seated figure is shorter than standing, NEVER enlarged. Planted poses hold boot/root anchors steady.
PIXEL CUTOUT: Crisp stepped contours, deliberate grouped colors and coherent coarse grid, upper-left neutral material shading, readable at96×96 logical cells. Opaque body pixels, actual transparent RGBA outside and in limb gaps. No smooth anime painting, glossy3D, fine texture noise, blur, halo, colored fringe, outline sticker or translucent body. No shadow, floor, pedestal, scenery, backdrop, checkerboard drawing, labels, numbers, captions, gridlines, borders or watermark. ABSOLUTELY NO light, sparks, aura, magic circles or effect pixels baked into the sheet. Image2 when supplied is specifically described in ACTION: use it only for that role, not extra costumes or guide marks.

ACTION:
TWO frames, 2 columns×1 row of equal SQUARE cells, wide sheet. Seated rest on invisible ground, comfortably folded bent legs in front, empty hands resting on thighs, role prop still secured.1 friendly relaxed open eyes;2 brief calm closed-eye blink with tiny breathing motion. Keep SAME physical head/body dimensions as master; naturally lower crown than standing, do NOT enlarge to fill cell. Same lower-left three-quarter camera. No chair, stump, cushions, floor or added objects.

## cast-start

### Tester / Field Alchemist — cast-start

Use case: identity-preserve. Production transparent pixel-art body sprites for the EXACT existing character in image1.
IDENTITY LOCK: An energetic young adult female field alchemist with medium brown skin, short sandy-blond hair in a tiny stubby ponytail, hazel eyes and a confident cheerful face. Muted mustard short practical vest over an ivory broad-cuffed shirt, petrol-blue neckerchief, dark olive trousers, brown sturdy boots and simple brown belt. One tiny CLOSED turquoise test-vial holder at SCREEN-RIGHT belt, vial stays sealed and attached. No goggles over eyes, armor, large bag or hat. Match image1's actual accepted face, hair silhouette, head/body balance, proportions, clothes cut, material colors, cuffs, belt, boots and attached small role prop in EVERY frame. This is an animation of the SAME person, not a new outfit/concept. Adult cute JRPG appeal, moderately enlarged head, visible short neck, substantial compact torso, real knees and sturdy boots. Do not inflate head or add hair volume, portrait detail, long limbs or new accessories.
EMPTY-HAND MAGIC: All physical role props remain SECURED at their original screen-RIGHT belt mount or collar throughout EVERY action, including casting. No drawing, handing over, stowing or duplicating tools. Both hands stay EMPTY. Magic is spoken/gestured; all emitted light and the shared ground circle are separate assets. No orb or physical object magically appears between palms. Fingers should read as simple small coherent pixel clusters.
CAMERA/ANATOMY: Elevated FRONT THREE-QUARTER, facing LOWER-LEFT throughout. BOTH eyes visible, far eye narrower, front of chest and narrow side plane visible, hair crown and boot tops. Head, chest, pelvis, knees and toes share the heading. No one-eye profile, frontal torso with sideways legs, camera rotation or mirroring within sheet. NEAR shoulder/hip begins SCREEN-RIGHT, FAR begins SCREEN-LEFT and goes behind on overlap. Trace continuous shoulder→elbow→hand and hip→knee→ankle→boot; sides keep ownership through crossings. Use slightly lighter near trousers and darker far trousers without changing palette.
LAYOUT: exact action count and equal cells, row-major order. One whole body per cell, fixed dimensions, head width, limb lengths, camera, neutral pelvis/root position. Crown around7% and planted soles around90% of each standing cell, generous side margins, all fingers/boots/hair inside cell. Small walk bob only. No independent silhouette re-centering or scaling to fill cells. Lifted feet stay lifted; seated figure is shorter than standing, NEVER enlarged. Planted poses hold boot/root anchors steady.
PIXEL CUTOUT: Crisp stepped contours, deliberate grouped colors and coherent coarse grid, upper-left neutral material shading, readable at96×96 logical cells. Opaque body pixels, actual transparent RGBA outside and in limb gaps. No smooth anime painting, glossy3D, fine texture noise, blur, halo, colored fringe, outline sticker or translucent body. No shadow, floor, pedestal, scenery, backdrop, checkerboard drawing, labels, numbers, captions, gridlines, borders or watermark. ABSOLUTELY NO light, sparks, aura, magic circles or effect pixels baked into the sheet. Image2 when supplied is specifically described in ACTION: use it only for that role, not extra costumes or guide marks.

ACTION:
FOUR frames, 2×2 equal SQUARE cells. Begin empty-handed chanting; feet planted, belt/root fixed, attached props stay secured.1 exact canonical empty-handed standing idle;2 elbows begin bending, EMPTY hands lift from sides toward waist, eyes focus;3 hands continue toward this role's specific working gesture;4 fully established held chanting pose: Palms held asymmetrically at waist and chest as if carefully testing a spell, small focused finger changes. Both hands EMPTY, simple fingers. No prop removal, touching belt, duplicated tool or new object. No glow or magic drawn into body. Keep endpoint clear and comfortable at waist/lower chest, below face. Frame4 is canonical reference for later loop/end.

## cast-loop

### Tester / Field Alchemist — cast-loop

Use case: identity-preserve. Production transparent pixel-art body sprites for the EXACT existing character in image1.
IDENTITY LOCK: An energetic young adult female field alchemist with medium brown skin, short sandy-blond hair in a tiny stubby ponytail, hazel eyes and a confident cheerful face. Muted mustard short practical vest over an ivory broad-cuffed shirt, petrol-blue neckerchief, dark olive trousers, brown sturdy boots and simple brown belt. One tiny CLOSED turquoise test-vial holder at SCREEN-RIGHT belt, vial stays sealed and attached. No goggles over eyes, armor, large bag or hat. Match image1's actual accepted face, hair silhouette, head/body balance, proportions, clothes cut, material colors, cuffs, belt, boots and attached small role prop in EVERY frame. This is an animation of the SAME person, not a new outfit/concept. Adult cute JRPG appeal, moderately enlarged head, visible short neck, substantial compact torso, real knees and sturdy boots. Do not inflate head or add hair volume, portrait detail, long limbs or new accessories.
EMPTY-HAND MAGIC: All physical role props remain SECURED at their original screen-RIGHT belt mount or collar throughout EVERY action, including casting. No drawing, handing over, stowing or duplicating tools. Both hands stay EMPTY. Magic is spoken/gestured; all emitted light and the shared ground circle are separate assets. No orb or physical object magically appears between palms. Fingers should read as simple small coherent pixel clusters.
CAMERA/ANATOMY: Elevated FRONT THREE-QUARTER, facing LOWER-LEFT throughout. BOTH eyes visible, far eye narrower, front of chest and narrow side plane visible, hair crown and boot tops. Head, chest, pelvis, knees and toes share the heading. No one-eye profile, frontal torso with sideways legs, camera rotation or mirroring within sheet. NEAR shoulder/hip begins SCREEN-RIGHT, FAR begins SCREEN-LEFT and goes behind on overlap. Trace continuous shoulder→elbow→hand and hip→knee→ankle→boot; sides keep ownership through crossings. Use slightly lighter near trousers and darker far trousers without changing palette.
LAYOUT: exact action count and equal cells, row-major order. One whole body per cell, fixed dimensions, head width, limb lengths, camera, neutral pelvis/root position. Crown around7% and planted soles around90% of each standing cell, generous side margins, all fingers/boots/hair inside cell. Small walk bob only. No independent silhouette re-centering or scaling to fill cells. Lifted feet stay lifted; seated figure is shorter than standing, NEVER enlarged. Planted poses hold boot/root anchors steady.
PIXEL CUTOUT: Crisp stepped contours, deliberate grouped colors and coherent coarse grid, upper-left neutral material shading, readable at96×96 logical cells. Opaque body pixels, actual transparent RGBA outside and in limb gaps. No smooth anime painting, glossy3D, fine texture noise, blur, halo, colored fringe, outline sticker or translucent body. No shadow, floor, pedestal, scenery, backdrop, checkerboard drawing, labels, numbers, captions, gridlines, borders or watermark. ABSOLUTELY NO light, sparks, aura, magic circles or effect pixels baked into the sheet. Image2 when supplied is specifically described in ACTION: use it only for that role, not extra costumes or guide marks.

ACTION:
FOUR frames, 2×2 equal SQUARE cells. Image2 is the canonical casting-start endpoint; preserve its EXACT arm/hand placement and physical scale. Hold role-specific gesture: Palms held asymmetrically at waist and chest as if carefully testing a spell, small focused finger changes. Both EMPTY hands remain anatomically connected, all physical props stay secured at belt/collar.1 exact held endpoint;2 small wrist/finger downbeat and slightly open chanting mouth;3 tiny upbeat, eyelids briefly lower;4 return close to1, mouth softens. Feet, pelvis, neck and head base fixed. Very small gestures, no torso rotation, arm waving or hand swaps. No physical orb/book/tool appears between palms. No effect, circle, glow or emitted strokes in body sheet.

## cast-end

### Tester / Field Alchemist — cast-end

Use case: identity-preserve. Production transparent pixel-art body sprites for the EXACT existing character in image1.
IDENTITY LOCK: An energetic young adult female field alchemist with medium brown skin, short sandy-blond hair in a tiny stubby ponytail, hazel eyes and a confident cheerful face. Muted mustard short practical vest over an ivory broad-cuffed shirt, petrol-blue neckerchief, dark olive trousers, brown sturdy boots and simple brown belt. One tiny CLOSED turquoise test-vial holder at SCREEN-RIGHT belt, vial stays sealed and attached. No goggles over eyes, armor, large bag or hat. Match image1's actual accepted face, hair silhouette, head/body balance, proportions, clothes cut, material colors, cuffs, belt, boots and attached small role prop in EVERY frame. This is an animation of the SAME person, not a new outfit/concept. Adult cute JRPG appeal, moderately enlarged head, visible short neck, substantial compact torso, real knees and sturdy boots. Do not inflate head or add hair volume, portrait detail, long limbs or new accessories.
EMPTY-HAND MAGIC: All physical role props remain SECURED at their original screen-RIGHT belt mount or collar throughout EVERY action, including casting. No drawing, handing over, stowing or duplicating tools. Both hands stay EMPTY. Magic is spoken/gestured; all emitted light and the shared ground circle are separate assets. No orb or physical object magically appears between palms. Fingers should read as simple small coherent pixel clusters.
CAMERA/ANATOMY: Elevated FRONT THREE-QUARTER, facing LOWER-LEFT throughout. BOTH eyes visible, far eye narrower, front of chest and narrow side plane visible, hair crown and boot tops. Head, chest, pelvis, knees and toes share the heading. No one-eye profile, frontal torso with sideways legs, camera rotation or mirroring within sheet. NEAR shoulder/hip begins SCREEN-RIGHT, FAR begins SCREEN-LEFT and goes behind on overlap. Trace continuous shoulder→elbow→hand and hip→knee→ankle→boot; sides keep ownership through crossings. Use slightly lighter near trousers and darker far trousers without changing palette.
LAYOUT: exact action count and equal cells, row-major order. One whole body per cell, fixed dimensions, head width, limb lengths, camera, neutral pelvis/root position. Crown around7% and planted soles around90% of each standing cell, generous side margins, all fingers/boots/hair inside cell. Small walk bob only. No independent silhouette re-centering or scaling to fill cells. Lifted feet stay lifted; seated figure is shorter than standing, NEVER enlarged. Planted poses hold boot/root anchors steady.
PIXEL CUTOUT: Crisp stepped contours, deliberate grouped colors and coherent coarse grid, upper-left neutral material shading, readable at96×96 logical cells. Opaque body pixels, actual transparent RGBA outside and in limb gaps. No smooth anime painting, glossy3D, fine texture noise, blur, halo, colored fringe, outline sticker or translucent body. No shadow, floor, pedestal, scenery, backdrop, checkerboard drawing, labels, numbers, captions, gridlines, borders or watermark. ABSOLUTELY NO light, sparks, aura, magic circles or effect pixels baked into the sheet. Image2 when supplied is specifically described in ACTION: use it only for that role, not extra costumes or guide marks.

ACTION:
FOUR frames, 2×2 equal SQUARE cells. Image2 is canonical casting-start endpoint; start from EXACT same held arm pose and scale.1 established EMPTY-handed chanting gesture;2 relax fingers and begin lowering hands toward waist;3 arms lower almost to natural sides, chanting mouth closes;4 canonical friendly open-eyed idle matching standing master, both hands EMPTY down at sides. Physical role prop remains secured at original belt/collar throughout, never moved. Feet/root fixed; no stepping, bowing or rotating. No magic effect in body. End connects exactly to idle.

CORRECTION: Previous result had opaque white textured paper, drop shadow and shadowed bottom edge. REMOVE ALL backdrop and shadows. Deliver only the four character bodies on real alpha transparency. No white fill, gray fill, glow, vignette, shadow or surface. Preserve pose identities.

## notes

### Tester / Field Alchemist

Status: all six actions exported. 22 body frames. Roster status.

Standing master · Full motion GIF · All poses.

An energetic young adult female field alchemist with medium brown skin, short sandy-blond hair in a tiny stubby ponytail, hazel eyes and a confident cheerful face. Muted mustard short practical vest over an ivory broad-cuffed shirt, petrol-blue neckerchief, dark olive trousers, brown sturdy boots and simple brown belt. One tiny CLOSED turquoise test-vial holder at SCREEN-RIGHT belt, vial stays sealed and attached. No goggles over eyes, armor, large bag or hat.

Work gesture: Palms held asymmetrically at waist and chest as if carefully testing a spell, small focused finger changes. All props stay attached; hands remain empty. Uses the exact shared circle.

#### Production inputs

Master prompt · Master provenance.

- idle: prompt, source, provenance, strip.
- walk: prompt, source, provenance, strip.
- sit: prompt, source, provenance, strip.
- cast-start: prompt, source, provenance, strip.
- cast-loop: prompt, source, provenance, strip.
- cast-end: prompt, source, provenance, strip.

Tester walk v2 uses the opposite-contact repair prompt; contact arm phases and passing-foot silhouettes are now distinct. Small cross-frame perspective variation remains.

#### Export

Configuration · Manifest · Validation.

Rebuild existing sources: `uv run --with pillow python docs/camp-assets/scripts/export-characters.py tester`.

96px body cells; right walk mirrors the left strip. The common circle stays separate. Cropping, uniform sheet scaling, nearest-neighbor export and boundary-frame reuse do not replace missing artwork. Generated clothing, face and camera variations remain subject to visual approval. Application integration is outside this asset pass.

Tester casting-end v1 had an opaque textured backdrop and shadow and is rejected. v2 prompt removes that background.
