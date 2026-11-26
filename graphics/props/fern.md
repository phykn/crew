# Fern

## Status

One candidate generated with the built-in image tool; approval pending. Output: `fern.png`.

## Renderer measurements

`fern` draws six fronds fanning from one projected base, with initial angles -150,-128,-105,-75,-52,-30 degrees. Frond lengths are about 11.5..15.1 source scene units and arch through a quadratic droop term. Leaflets are paired, decrease in length toward each tip, and use leafDark #212b1b, leaf #33402a, mossDark #4a5a2c. Ground anchor: the shared frond root at iso(d.x,d.y). This is one compact fern, not the separate `tuft` grass object.

## Generation prompt

Create one compact woodland fern plant sprite for the camp: exactly six primary arching fronds emerging from one tight basal crown. Clearly recognizable as a fern, not a grass tuft, palm, aloe, broad-leaf houseplant, or generic shrub.

FROND STRUCTURE
Six long curved central stems fan outward: two lower spreading fronds, two intermediate arching fronds, and two more upright central fronds, with slight natural asymmetry. Each frond has paired tapered leaflets arranged along both sides of its central stem. Leaflets are longer near the lower-middle section, progressively smaller toward the tapered tip, and angled outward in a feather-like rhythm. Do not represent a frond as a bare stick with isolated dots or equally spaced blocky comb teeth. Tips arch outward and gently droop; avoid rigid straight spikes. The fronds remain connected at one small root crown, with no detached leaves.

VIEW AND COMPOSITION
Elevated orthographic camp camera: see a little of the upper surfaces, with the farther central fronds rising behind the low front pair. Make a compact low fan, wider than tall, centered with the basal root near the lower center of the silhouette. The original fronds are only around 12 to 15 scene units long, so keep it small and readable. Overlap is controlled: preserve some transparent negative spaces between the six fronds so the plant does not collapse into a solid green blob. Do not force exact bilateral symmetry.

COLOR AND PIXEL CRAFT
Dark woodland greens anchored to #33402a and #212b1b, with sparse muted olive accents near #4a5a2c. Soft upper-left illumination means a few upper leaflet faces are lighter, while overlaps and the basal crown are darker. Use approximately five to eight quiet shades. Thin stems are continuous stepped lines; leaflets are small coherent pointed pixel clusters rather than fuzzy feathering or individual photorealistic veins. Broad material shading is subordinate to the six recognizable feathered fronds. No neon green, bright lime rim, pale glowing outlines, wet gloss, flowers, red berries, mushrooms, pot, roots, soil mound, grass, or rocks.

TRANSPARENT EDGES
Keep the crown and every tip fully inside the canvas with margins. Export only the connected fern, without any ground shadow or soft green/brown haze around leaflets. Actual alpha gaps between fronds and leaflets are essential for placing it over the existing camp ground.

REFERENCE ROLES
Image 1, the approved crate, supplies the hand-crafted pixel treatment, muted material palette, upper-left light, and controlled detail. Image 2, the accepted rock, supplies quiet natural-material clusters. Image 3 is the existing camp: use its elevated orthographic camera and scale. These are references, not subjects to copy into the deliverable.

STYLE AND SCALE
Coherent original pixel-art game sprite with deliberate stair-step contours, a consistent logical pixel grid, broad flat color clusters, and a restrained palette. The large export should look like enlarged carefully drawn pixel art, not a high-resolution painting with a pixel filter. Prioritize silhouette and structural readability at the measured scene size. Neutral upper-left light only, contained inside the object. No baked orange firelight, glow, bloom, soft outer halo, atmospheric haze, blur, smooth vector outlines, photographic grain, random speckles, glossy highlights, thick black cartoon borders, or excessive dithering.

DELIVERY
Exactly ONE complete isolated prop with genuine alpha transparency. Center the complete object with clear margins; preserve thin structural details without cropping. Everything outside the actual object must be fully transparent. No ground plane, contact-shadow patch, cast shadow, floor glow, scenery, characters, extra props, labels, text, watermark, border, alternate views, or sprite sheet. Transparent gaps within the structure must remain open. Do not paint a checkerboard or black backdrop. The camp renderer will supply lighting and shadows.

## Review criteria

Check source-facing geometry, subject count, structural connections, scale, palette, full silhouette, and actual alpha. Document deviations; do not generate unrequested alternatives. In-scene anchors and interactions require later integration validation.

## Candidate review

Export: 1536 × 1024, PNG color type 6 (RGBA). Six feathered fronds share a common crown. A pronounced soft green halo remains around and between fronds, contrary to the clean-edge brief; cleanup is needed before production use.

Standalone art only. In-scene scale, anchor, occlusion, and interactions have not been integrated or tested.
