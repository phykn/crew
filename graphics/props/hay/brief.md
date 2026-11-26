# Hay Bale

## Status

One candidate generated with the built-in image tool; approval pending. Output: `hay.png`.

## Renderer measurements

The source `hay` draws ONE rectangular tied bale, not a loose haystack. The footprint is 1 × 0.6 world tiles, centered at d.x,d.y, with height z=10. Under the 32 × 16 projection, the top diamond bounds are 25.6 × 12.8 scene units; total body height is about 22.8 before shadow. Two twine loops occur at 0.3 and 0.7 along world x, crossing the top and descending the near side. Anchor: iso(d.x,d.y), centered ground footprint. Palette: hay #a68e4c, hayDark #7c6a38, hayDeep #5a4c28. Straw is indicated by a few short lines, not dense noise.

## Generation prompt

Create one compact rectangular bale of dry hay bound by exactly two plain twine loops, matching the source camp prop. Although called a hay pile conversationally, the actual object is a tied block-shaped bale. Do not make a conical haystack, round rolled bale, straw mound, or several stacked bales.

SHAPE AND PROJECTION
Footprint 1 world tile long by 0.6 deep, height 10 scene units in a 32 × 16 isometric floor projection. Elevated orthographic view shows the top and two sides. Long axis runs world x, projecting toward screen lower-right; the short axis projects toward lower-left. Top projected width about 25.6 scene units, diamond depth about 12.8, total body around 22.8 high. It is a compact squat compressed bundle, with nearly rectangular mass but slightly softened irregular straw corners. Do not turn it into a perfectly clean manufactured cube, wooden crate, brick, cushion, or sponge.

BINDING
Exactly two narrow dark brown twine loops wrap around the depth and height, positioned about thirty and seventy percent along the long dimension. Each continuous loop crosses the top along the short ground axis and descends the visible long near face. Twine follows the bale volume, lightly compressing the straw at its contact lines. No broad iron bands, four loops, crossed decorative cord, handle, label, bow, or conspicuous loose rope tails. Keep rope readable at small size, thinner than the straw's structural shading.

STRAW MATERIAL
Muted dry ochre anchored to #a68e4c, side shading near #7c6a38 and deep creases #5a4c28. Subtle darker brown twine related to #3d2918. Top lighter than near side, far/end side darkest. Straw is compressed and aligned in a few short broken directional clusters, with just a handful of tiny stepped ends at the silhouette. The bundle should read as fibrous hay from these clusters and edge irregularity, not all-over photographic hair strands. Avoid bright lemon yellow, saturated orange, white highlights, black dotted pores, or dense scratchy noise.

COMPOSITION
One centered bale, complete silhouette, no loose hay scattering beyond it. Approximately six to ten grouped straw/twine shades. Keep the three large planes clear at roughly 26 scene units wide. No pitchfork, fence, grass, flowers, animals, dirt base, cast shadow, or ambient golden haze.

REFERENCE ROLES
Image 1 is the approved crate: use its restrained warm pixel-art material treatment, deliberate stair steps, and upper-left illumination. Image 2 is the accepted rock direction: use quiet natural material clusters and subdued contrast. Image 3 is the existing camp: match its elevated orthographic viewpoint and small prop scale. References establish style and context; do not reproduce their subjects or scene.

PIXEL EXECUTION
Draw on one coherent coarse logical pixel grid. Use deliberate stepped edges and small grouped color blocks, with flat material planes and limited shades. A large PNG must read like enlarged hand-authored pixel art, not a painting under a pixel filter. Prioritize the silhouette and material separation at the source scale over tiny texture. Keep upper-left lighting within the object. No photorealism, vector-smooth contours, blur, random speckles, detailed noise, heavy dithering, thick black cartoon border, glossy 3D finish, or bright white rim highlights.

ALPHA DELIVERY — ESSENTIAL
ONE complete isolated object, fully visible with generous transparent margins. Export actual transparent PNG alpha. Outside the hard stepped object boundary, alpha is zero: no soft colored pixels, haze, bloom, glow, aura, gradient, ground shadow, contact-shadow ellipse, floor, soil patch, backdrop, or painted checkerboard. Gaps inside the silhouette must also be clean transparency where no material exists. Use opaque color clusters for the object rather than semi-transparent painted edge clouds. The scene renderer adds lighting and shadows later. No text, watermark, border, scene reconstruction, characters, extra objects, alternate versions, or sprite sheet.

## Review criteria

Check subject count, source orientation and proportions, material readability, clean alpha, and complete silhouette. Record deviations without automatically generating alternatives. Art only: no application integration or scene-scale validation in this task.

## Candidate review

Export: 1536 × 1024, PNG color type 6 (RGBA). One rectangular straw bale with two bindings. Soft golden outer halo remains. The long face appears to slope up-right rather than the requested down-right world-x orientation; retain as a candidate deviation.

Art files only. No application code changed, and no scene integration or actual-scale validation performed.
