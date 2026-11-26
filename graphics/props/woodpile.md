# Firewood Stack

## Status

One candidate generated using the built-in image tool; approval pending. Output: `woodpile.png`.

## Renderer measurements

The existing `woodpile` uses a 0.5 × 1.2 world-tile prism of height 12 with five front-facing circular ends: three at z=3 and two at z=9. End centers are at x=d.x+0.25 and y=d.y-0.6+t for t=0.2,0.6,1.0 (bottom) and 0.4,0.8 (top). Log axes run along world x, projecting down-right toward the visible cut ends. The prism projects to 27.2 units wide before circular end overhang. Cut end radii are 3.2, inner wood 2.4. The ground anchor is iso(d.x,d.y). Palette anchors: bark #3e2c1d, barkDark #281c12, wood #6b4a2c, woodDark #4a321d. The generated object should clarify the separate round logs instead of reproducing the source's solid support prism.

## Generation prompt

Create one compact firewood stack made of exactly FIVE short round logs, arranged three on the bottom and two resting in their gaps above. It is one reusable camp prop, not five detached inventory icons.

ARRANGEMENT AND WEIGHT
Three parallel logs lie on the ground shoulder to shoulder; two more lie securely in the two valleys above. Every log has the same direction and comparable diameter, with small natural differences in length and cut shape. All five near cut faces are visible and countable: bottom three, upper two. The stack has no sixth top log and no rectangular backing block. Keep it low and broad, approximately 1.5 to 1.8 times as wide as tall in the final projected silhouette, including depth. The two upper logs settle into the lower row with believable contact and deep but narrow overlap seams. Avoid floating logs, perfect circles separated by gaps, a wall of timber, tied bundles, pallets, crates, supports, axes, stumps, or kindling scattered outside the object.

FACING AND PROJECTION
Use the camp's elevated 2:1 orthographic world projection. The logs' long axes run along world x, so the visible near ends sit toward screen LOWER-RIGHT, and the bodies recede toward screen UPPER-LEFT. The row of three ends runs along the other ground axis, diagonally down-left in screen space. Show the front cut ends plus the upper bark surfaces extending behind them. Keep all axes parallel, no perspective convergence. End disks are small slightly irregular round/oval cut surfaces; avoid strong horizontal squash or square ends. Do not rotate the bundle to face straight at the viewer as a flat symmetric triangle.

MATERIAL AND DETAIL
Dark dry bark near #3e2c1d and #281c12, with muted warmer lit ridges. Cut wood near #6b4a2c, a little lighter and more muted than the bark; avoid yellow-orange candy colors or bright cream. Each cut end has a dark bark rim enclosing a solid wood disk, one broken growth-ring arc and at most one short radial split. Do not use dense concentric target rings, central bolt-like squares, or hollow holes. Bark uses just a few longitudinal broken pixel bands and modest chipped patches. Keep the five logs distinguishable through overlap and end placement, not thick black outlines.

COMPOSITION AND SCALE
Keep the entire stack centered with clear margins and a stable two-row silhouette. This is a tiny prop whose source support footprint projects to only about 27 scene units wide: large bark planes and five clear end disks matter more than microtexture. Approximately eight to twelve coordinated brown shades; quieter and darker than the crate, consistent with unprocessed bark. No green moss, rope, nails, metal, flames, smoke, ground shadow, extra debris, or surrounding scenery.

REFERENCE ROLES
Image 1 is the approved crate: match its restrained warm palette, crisp stepped edges, deliberate pixel clusters, upper-left lighting, and readable material planes. Image 2 is the accepted rock direction: match the quiet detail density and subdued contrast. Image 3 is the existing camp: match its elevated orthographic view and relative prop scale. These are style/context references only. Do not reproduce the crate, rock, scene, characters, ground, fire, or interface.

SHARED EXECUTION
An original isometric pixel-art game asset, intentionally legible at the small scene scale stated below. Use a coherent logical pixel grid with deliberate stair steps and solid color clusters. A large export must look like enlarged pixel art, not a detailed painting with a pixel filter. Keep silhouette and major material planes readable before fine texture. Restrained upper-left light, darker front/right and undersides. No dramatic firelight or baked scene effects. No photographic grain, glossy 3D rendering, smooth vector edges, soft brushwork, random single-pixel noise, excessive dithering, or thick black cartoon border.

TRANSPARENCY AND DELIVERY
ONE isolated object, centered and fully inside the canvas with transparent margins. Actual transparent PNG alpha outside its complete silhouette, including between detached-looking structural details that remain part of the object. No ground, dirt patch, pedestal, cast shadow, contact-shadow ellipse, ambient floor glow, reflection, background color, painted checkerboard, gradient, scene, label, text, watermark, frame, alternate views, multiple variants, or sprite sheet. Object shading stays inside the silhouette; the camp supplies cast shadows and lighting. Preserve all intended pieces without cropping.

## Review criteria

Verify subject count, source-facing geometry, small-scale readability, shared pixel treatment, intact margins, and actual alpha. Keep this candidate separate from approved exports. Do not automatically generate alternatives.

## Candidate review

Export: 1536 × 1024, PNG color type 6 (RGBA). Five logs with three below and two above; facing agrees with the source. Visible soft brown halo around the stack violates the clean-edge brief. Candidate requires edge correction before integration.

This is a standalone art candidate. In-scene display scale and anchoring have not been integrated or tested.
