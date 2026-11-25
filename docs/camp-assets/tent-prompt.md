# Canvas Tent

## Status

One candidate generated using the built-in image tool; approval pending. Output: `candidates/tent-v1.png`.

## Renderer measurements

The existing `tent` has length L=1.9, width W=1.6 world tiles and ridge height H=26 scene units. `along(d,L)` maps (u,v,z) to iso(d.x+v,d.y-L/2+u,z), so the ridge runs along world y. The opening is at u=L, projecting toward lower-left. Relative to iso(d.x,d.y), rear/front ridge endpoints are (15.2,-33.6) and (-15.2,-18.4); near-side ground corners are (28,-1.2) and (-2.4,14); the far front ground corner is (-28,1.2). The fabric body spans 56 × 47.6 scene units before poles and ropes. Two ropes extend from the front ridge to stakes beyond the entrance. Anchor: iso(d.x,d.y), the footprint center. Source canvas colors: #b8a98a, #8f8166, #6b604b; poles #3d2b1a; doorway #2a2118. The original interior glow is a scene treatment and should not be baked into this base image.

## Generation prompt

Create one complete small traditional A-frame canvas camp tent, matching the current camp's exact facing and footprint. This is a static replacement structure, not a scene illustration or a modern dome tent.

GEOMETRY AND FACING
A rectangular tent with a straight ridge, two sloping canvas roof/walls reaching the ground, and a triangular open entrance at the near end. World footprint length 1.9 tiles, width 1.6 tiles; ridge height 26 scene units with a 32 by 16 tile projection. The ridge runs from screen UPPER-RIGHT rear toward screen LOWER-LEFT entrance, descending to the left at the same 2:1 projected world-axis slope. The entrance triangle is on the LEFT/front end; the large visible sloping canvas panel extends to the RIGHT/back. This facing is mandatory: do not mirror it, turn the door to the right, make a frontal symmetrical view, or use perspective convergence.

PROJECTION GUIDE
For clarity on a conceptual 96 × 96 canvas, place the footprint-center anchor near (48,55). Rear ridge peak near (63,21), front ridge peak near (33,37), near-side rear ground corner near (76,54), near-side front ground corner near (46,69), far-side front ground corner near (20,56). These guide points reproduce the source projection, not a drawing to include. The broad near canvas plane joins (76,54), (46,69), (33,37), (63,21). The entrance triangle joins (20,56), (46,69), (33,37). A narrow far canvas portion may be visible where geometrically appropriate. Preserve a low, broad shelter, not a tall narrow spire. Keep full rope/stake and pole extents inside transparent margins.

CLOTH CONSTRUCTION
Muted oatmeal/khaki heavy woven canvas anchored to #b8a98a for the near panel, #8f8166 for seams and hem, #6b604b for the far/deep fabric. Two quiet seam divisions down the large panel around one-third and two-thirds along the ridge. Show a narrow darker hem along the ground edge, slight fabric sag between supports, and a few angular folds concentrated at ridge, seam, and entrance tie points. Keep the large panel calm and readable at about 56 by 48 scene units. No all-over woven noise, decorative patchwork, ragged tears, numerous ropes, flags, logos, camouflage, stripes, windows, plastic zippers, poles crossing outside the fabric, or a rigid wooden hut appearance.

DOOR AND SUPPORTS
One triangular entrance recessed in dark warm brown near #2a2118. Two narrow canvas flaps are tied back to the sides, framing a single clearly open doorway; the center stays dark and uncluttered. No interior furniture, people, lantern, flame, emissive orange triangle, or visible floor extending out of the tent. Two short dark wooden ridge-pole tips subtly protrude above the end peaks. Exactly two slender muted brown guy ropes run from the FRONT ridge apex outward to two small dark wooden stakes beyond the entrance, one on each side. The stakes and ropes are part of the asset; no soil attached to stakes. Draw ropes in thin continuous stepped pixel segments that remain subordinate to the tent silhouette, without a web of extra rigging.

COLOR AND LIGHT
Subdued warm neutral upper-left light. The near panel is readable warm khaki, the doorway and far fold are darker, with only narrow restrained seam highlights. Avoid brilliant white canvas, bright yellow, saturated orange, strong spotlights, gradients, deep black outlines, or baked firelight/glow. Use approximately eight to twelve coordinated cloth/wood shades; the style should belong beside the approved crate and accepted rock. No surrounding camping equipment, sleeping bag, separate campfire, grass, terrain, scenery, cast shadow, or atmospheric haze.

REFERENCE ROLES
Image 1 is the approved crate: match its restrained warm palette, crisp stepped edges, deliberate pixel clusters, upper-left lighting, and readable material planes. Image 2 is the accepted rock direction: match the quiet detail density and subdued contrast. Image 3 is the existing camp: match its elevated orthographic view and relative prop scale. These are style/context references only. Do not reproduce the crate, rock, scene, characters, ground, fire, or interface.

SHARED EXECUTION
An original isometric pixel-art game asset, intentionally legible at the small scene scale stated below. Use a coherent logical pixel grid with deliberate stair steps and solid color clusters. A large export must look like enlarged pixel art, not a detailed painting with a pixel filter. Keep silhouette and major material planes readable before fine texture. Restrained upper-left light, darker front/right and undersides. No dramatic firelight or baked scene effects. No photographic grain, glossy 3D rendering, smooth vector edges, soft brushwork, random single-pixel noise, excessive dithering, or thick black cartoon border.

TRANSPARENCY AND DELIVERY
ONE isolated object, centered and fully inside the canvas with transparent margins. Actual transparent PNG alpha outside its complete silhouette, including between detached-looking structural details that remain part of the object. No ground, dirt patch, pedestal, cast shadow, contact-shadow ellipse, ambient floor glow, reflection, background color, painted checkerboard, gradient, scene, label, text, watermark, frame, alternate views, multiple variants, or sprite sheet. Object shading stays inside the silhouette; the camp supplies cast shadows and lighting. Preserve all intended pieces without cropping.

## Review criteria

Verify subject count, source-facing geometry, small-scale readability, shared pixel treatment, intact margins, and actual alpha. Keep this candidate separate from approved exports. Do not automatically generate alternatives.

## Candidate review

Export: 1536 × 1024, PNG color type 6 (RGBA). Entrance faces lower-left with the main canvas panel extending upper-right, matching the source. Visible soft halo around cloth and guy ropes violates the clean-edge brief. Candidate requires edge correction before integration.

This is a standalone art candidate. In-scene display scale and anchoring have not been integrated or tested.
