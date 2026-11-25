# Wooden Barrel

## Status

One candidate generated using the built-in image tool; approval pending. Output: `candidates/barrel-v1.png`.

## Renderer measurements

The existing `drum` in `src/frontend/camp/art/decor.js` has h=20, top ellipse radii 7 and 3, a slightly bulging body, and two hoops at z=16 and z=5. Its cap-to-foot extent is about 26 scene units including ellipse depth. Its ground anchor is `iso(d.x, d.y)` at the center of the bottom ellipse. The palette is wood #6b4a2c, woodDark #4a321d, woodDeep #3d2918, and iron #3a3834. The renderer draws a dark recessed top; a mostly closed wooden lid is the proposed material clarification for this candidate, not an additional measured source feature.

## Generation prompt

Create one upright wooden storage barrel sprite for the camp. This replaces the existing `drum`, which is a wooden stave barrel, not a modern metal oil drum.

FORM AND PROPORTIONS
One compact cylindrical coopered barrel with a narrower head and foot and a gently swelling middle. Overall visible width-to-height approximately 16:26. The silhouette must be round and weighty rather than a rectangle, bucket, pot, crate, or thin straight cylinder. On a conceptual 64 × 64 grid, keep the barrel approximately x=15..49 and y=7..59; cap centered around (32,13), front rim around y=19, belly widest around y=34, foot around y=54..59. Coordinates are composition guidance, not visible geometry. Both sides curve in deliberate pixel steps. The bottom rests evenly, never tapers to a point.

VIEW AND CONSTRUCTION
Elevated orthographic three-quarter camp view; the circular top reads as a shallow horizontal ellipse with roughly 7:3 radii, no perspective convergence. Show the whole front body and top. Use six to eight readable vertical wooden staves across the visible front, their seams following the bowed body. Two dark iron hoops only: one just below the head and one just above the foot, around 20% and 80% down the body. Each hoop wraps around the volume as a shallow elliptical band; it must not read as a straight horizontal belt glued to a flat rectangle. Keep the upper and lower rim treatment understated so it cannot be mistaken for four heavy hoops. The cap is mostly closed weathered planks inside a thin recessed dark wooden rim: two or three quiet seams, no deep open black hole, handle, tap, label, rope, or loose lid.

MATERIALS
Warm weathered brown wood anchored to #6b4a2c, #4a321d, #3d2918. Top lighter than front; left front softly lighter than right. A few broad stave color changes, two short broken grain marks, and at most one small knot. Match the crate's material family without copying its diagonal brace. Hoops are matte charcoal iron near #3a3834 with a restrained upper-left highlight; avoid shiny silver, large rivets, rust streaks, high contrast white glints, or bright orange wood. Approximately eight to twelve carefully grouped colors are enough.

SMALL-SCALE PRIORITIES
A scene barrel is only roughly 16 by 26 scene units. Prioritize bulged silhouette, elliptical cap, two wrapping hoops, and a few stave separations. No all-over hairline grain, ornate carving, decorative bands, moss, attached foliage, stacked barrels, spills, contents, or other props.

REFERENCE ROLES
Image 1 is the approved crate: match its restrained warm palette, crisp stepped edges, deliberate pixel clusters, upper-left lighting, and readable material planes. Image 2 is the accepted rock direction: match the quiet detail density and subdued contrast. Image 3 is the existing camp: match its elevated orthographic view and relative prop scale. These are style/context references only. Do not reproduce the crate, rock, scene, characters, ground, fire, or interface.

SHARED EXECUTION
An original isometric pixel-art game asset, intentionally legible at the small scene scale stated below. Use a coherent logical pixel grid with deliberate stair steps and solid color clusters. A large export must look like enlarged pixel art, not a detailed painting with a pixel filter. Keep silhouette and major material planes readable before fine texture. Restrained upper-left light, darker front/right and undersides. No dramatic firelight or baked scene effects. No photographic grain, glossy 3D rendering, smooth vector edges, soft brushwork, random single-pixel noise, excessive dithering, or thick black cartoon border.

TRANSPARENCY AND DELIVERY
ONE isolated object, centered and fully inside the canvas with transparent margins. Actual transparent PNG alpha outside its complete silhouette, including between detached-looking structural details that remain part of the object. No ground, dirt patch, pedestal, cast shadow, contact-shadow ellipse, ambient floor glow, reflection, background color, painted checkerboard, gradient, scene, label, text, watermark, frame, alternate views, multiple variants, or sprite sheet. Object shading stays inside the silhouette; the camp supplies cast shadows and lighting. Preserve all intended pieces without cropping.

## Review criteria

Verify subject count, source-facing geometry, small-scale readability, shared pixel treatment, intact margins, and actual alpha. Keep this candidate separate from approved exports. Do not automatically generate alternatives.

## Candidate review

Export: 984 × 1599, PNG color type 6 (RGBA). Bulged barrel, closed cap, and two hoops read clearly. No obvious outer glow in the rendered preview.

This is a standalone art candidate. In-scene display scale and anchoring have not been integrated or tested.
