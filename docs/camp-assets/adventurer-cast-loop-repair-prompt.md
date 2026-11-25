# Chant loop — Remove baked floor art

## Generation prompt

Use case: precise-object-edit, background-extraction.
Image 1 is the four-frame character sheet to edit. Image 2 is the original accepted appearance and is an identity check only.

Edit ONLY the unwanted non-character pixels. In EACH of the four cells, completely erase the bright cyan/white circular floor graphic surrounding/beneath the boots, including every ring stroke, star/diamond, radiance, arc and colored fringe. Replace those removed areas with real alpha-zero transparency, including the gap between the boots. There must be NO floor graphic, circle, shadow, glow, platform, pedestal or surrounding colored mark anywhere in the output. Do not redraw a replacement graphic.

Preserve the entire character above and including both boot silhouettes, exactly as in Image 1: same face, brown hair, green tunic, cream sleeves, red neckerchief, cocoa trousers, boots, empty belt attachment, single small flat teal stone held at lower chest and identical hand grip. Keep the four facial states and their row-major order: focused open eyes, tiny syllable/inhale change, softly closed eyes, open again. Do not revert the prop to the belt, duplicate it or change its size. Keep the existing elevated front-three-quarter lower-left camera, character body scale, pose and each cell's position. No additional figure, symbols or body light. Feet remain complete, opaque and correctly attached to the legs; never erase the boot toes with the surrounding graphic.

Output one transparent FOUR-FRAME 2×2 equal-square-cell CHARACTER-ONLY sheet. All empty space outside and between limbs is alpha zero. Crisp pixel cutout, preserve original character colors, no brown halo, checkerboard drawing, fringe noise, backdrop, grid, labels, captions, borders or watermark. The result contains four complete isolated people and nothing beneath their boots. Do not reinterpret this cleanup request as a new scene or a new action.
