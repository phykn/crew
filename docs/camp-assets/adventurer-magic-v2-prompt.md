# Adventurer Ward Circle — Elaborate Active Casting

## Direction

The user finds the first circle too small and sparse. Redesign only the effect: a large, ornate, continuously active protective ward, with architectural rings, readable glyph clusters and tall peripheral light. Preserve the accepted character and its motion assets. Four-frame loop, separate transparent layer, grounded camera. Proposed effect cell increases to 128 × 128 while character cells remain 96 × 96.

## Generation prompt

Use case: stylized-concept animation overlay.
Deliverable: ONE EFFECTS-ONLY transparent pixel-art sprite sheet, exactly FOUR related animation frames in TWO columns by TWO rows of equal square cells, row-major order. A MAGNIFICENT, POWERFUL PROTECTIVE WARD CIRCLE activated on the ground beneath a woodland adventurer mage. No character, human silhouette, hands, boots, tool, stone or scenery in ANY cell.

REFERENCE ROLES
Image 1 is the previous small effect. Preserve only its pale-turquoise, warm-white and gold palette and shallow ground-plane projection. Replace its sparse simple ring design with a substantially richer, more impressive ritual structure. Do not copy its stray colored alpha-edge noise or its low visual density. Image 2 is the accepted adventurer and supplies physical scale/camera only. Do not draw the character, copy the standing pose, or make this a character-plus-circle sheet. The character will be composited later and remains unchanged.

SCALE AND VISUAL PRIORITY
This is the unmistakable ACTIVE WORK state, visible at a glance in a dark forest camp, not a tiny ankle bracelet, a few weak sparkles or a quiet buff icon. Make the main ring approximately as wide as the tiny character is tall, three to four times the boot footprint width. A broad, dense, bright ritual ellipse with three distinct concentric structures fills most of the cell width. Use the same ground camera throughout: shallow ellipse near 2:1 width to depth, front arc lower and rear arc higher. The ring lies ON THE GROUND, not a vertical halo, chest ring, tilted floating disk or screen-facing flat circular logo.

CONCENTRIC STRUCTURE
1. OUTER WARD: broad segmented luminous turquoise outer arc, paired bright edge strokes, eight strong cardinal/intercardinal rune anchors with short outward points. The anchors feel engineered and deliberate, not a random explosion or thorny noise.
2. ROTATING GLYPH BAND: twelve readable geometric ward sigils spaced around a separate gold-white orbital band. Each sigil is a compact diamond/square/chevron cluster with purposeful gaps. Give the band actual depth projection; far glyphs are a little compressed, near glyphs larger. Keep separation between glyph band and outer arc so the detail reads at sprite scale.
3. INNER SEAL: fine warm-white inner ellipse with interlocking angular polygon chords and a restrained eight-point compass/ward geometry. Empty transparent areas remain between the strokes. A few short radial connectors link inner seal to the glyph band. Keep the central boot area mostly transparent; never fill the seal as a solid glowing dinner plate.

VERTICAL PRESENCE AND PARTICLES
At the outer LEFT and RIGHT flanks, raise two or three short tapered pillars/curved ribbons of pale turquoise light, with small bright diamond caps and sparse rising sparks. The taller accents remain outside the central character silhouette: a peripheral magical enclosure, not a central beam hiding the face or tool. Their height reaches approximately the character's waist/lower-chest level in the later composite, not over the head. Include six to ten purposeful clustered glints with different rising heights, a few orbiting diamond motes and concentrated bright highlights around the strongest anchors. More substantial than the old two tiny streaks. Avoid noisy confetti, smoke, flames, giant opaque columns or a fully enclosing sphere.

COLOR, BRIGHTNESS AND PIXEL CRAFT
Pale turquoise #83e0d2 and deeper luminous teal structure, near-white mint highlights on the brightest ridges, warm ivory #fff4c4 and amber-gold sigil accents. High contrast against a dark forest, bright ring edges and readable layered geometry in every frame. Purposeful crisp stepped pixel clusters with enough area to draw real symbols, not thin smooth vector lines reduced into mush. Controlled local bloom is allowed immediately adjacent to luminous strokes and pillar cores; beyond that narrow falloff, actual alpha ZERO. Keep the center open and the outer empty margins clean. No whole-cell washed-out haze, thick black rim, neon RGB speckles, opaque colored background, realistic volumetric fog, gray studio shading or texture noise.

FOUR-PHASE LOOP
All frames retain EXACT same ring center, camera, ring width/depth and position. The structural ground ellipse does not wobble, grow, shrink or rotate in screen space. Animation comes from shifting glyph clusters along the SAME projected orbit, alternating anchor highlights, a restrained power pulse, and rising side accents.
Frame 1: full bright three-ring structure, balanced anchors; low left motes begin, right pillars medium height; clockwise glyph band at its first phase.
Frame 2: glyph band advances a small fraction of one glyph spacing along the projected orbit; left pillars strengthen, highlights travel to the next anchors; existing motes rise, new low motes appear.
Frame 3: glyph progression continues; opposite/right anchors and pillars peak, inner seal remains crisp; a few diamond motes reach the upper flanks while lower replacements begin. Preserve the same structural footprint and clear center.
Frame 4: glyphs continue toward the cyclic equivalent of frame 1; left/right light balance settles toward frame 1, high motes fade into new lower ones. Every frame remains conspicuously illuminated, no nearly empty/off state.
Use repeating geometric sigils so the last-to-first orbit transition continues naturally rather than jumping unrelated symbols. Suggest about a quarter of one repeating glyph interval per frame; do not rotate the entire ellipse like a flat logo. Four deliberate animation poses of ONE design, not four different magic circles.

COMPOSITING GEOMETRY
Proposed logical effect cell 128×128, ground center (64,92). Main outer ring around x=19..109 and y=70..114; peripheral sigils and sparks stay within x=8..120, y=22..120. Higher side pillars stay in the LEFT/RIGHT flank zones, approximately x=10..33 and x=95..118, never the central face/hand column. These are compositing guides, not labels to print. Leave clean safety margins on all sides, no clipped outer glyphs, no cross-cell pixels. The later compositor aligns (64,92) under the caster's foot midpoint and draws this effect BEHIND the entire character. Do not bake any boot cutout or character-shaped hole into the effect; it must also work as a standalone layer.

OUTPUT EXCLUSIONS
Four complete isolated EFFECT cutouts only. Real transparent PNG and transparent interior gaps, no drawn checkerboard, solid backdrop, floor tile, pedestal, cast shadow, gridlines, frame labels, numbers, letters, captions, watermark, recognizable emblem, additional figures or character pixels. Do not render a weak minimal ring. The result should feel like a small but spectacular ritual engine visibly running under an active mage.

## Review

Verify that the new design adds readable structure and vertical accents rather than just enlarging blur. Inspect against dark/light backgrounds after compositing. Keep character export hashes unchanged. Confirm all four effects fit the larger logical cell, retain a stable grounded center, and remain visible while face and hand-held wardstone stay unobscured.

## Delivered result

Generated once using built-in image generation. Source `candidates/adventurer-magic-v2.png`: 1261 × 1247 RGBA, alpha extrema 0–255. Four states show the richer layered ring and tall peripheral ribbons. Raw low-alpha RGB noise remains outside emission; export alpha floor 8 removes near-invisible speckles without the character's hard threshold. Normalized strip `exports/adventurer/magic.png`: 512 × 128, four 128-pixel cells. Shared bright-core width target 100, actual logical effect bounds about x=13..115 and y=40..113. Ground-center target adjusted from proposed (64,92) to (64,86) for cell safety. Per-frame central ground strokes fix the anchor instead of including raised side lights in the center estimate. Preview is 440 × 440; all visible effect bounds fit. Six existing character PNGs have unchanged SHA-256 hashes. Chant GIF is four frames, 720 ms, using the separate effect behind the existing character.
