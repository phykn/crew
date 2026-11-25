# Fallen Log

## Status

One candidate generated with the built-in image tool; approval pending. Output: `candidates/log-v1.png`.

## Renderer measurements

The source `log` in `src/frontend/camp/art/decor.js` uses a w=1.6, h=0.5 instance in layout.js. Its centerline runs along world x at y=d.y+h/2 and z=5. Projection is 32 × 16 per world tile, so the centerline moves 25.6 screen units right and 12.8 down from far to near end. A thick 10-unit bark stroke forms the trunk; the visible near cut end has ellipse radii 3.5 horizontally and 5 vertically. Two small moss marks sit on top. Ground anchor for later placement: projected center of its footprint on the ground. Bark colors #3e2c1d/#281c12, cut wood #4a321d/#6b4a2c, moss #4a5a2c.

## Generation prompt

Create one short fallen cut tree trunk lying on its side, a single thick round woodland log for the existing camp. This is one complete log, not the five-piece firewood stack.

FORM AND CAMERA
An irregular cylindrical trunk with intact bark, broad enough to feel heavy but short enough to be a small camp prop. The centerline runs along world x in the camp's elevated orthographic 2:1 projection: far end at screen UPPER-LEFT, visible near cut end at LOWER-RIGHT. The axis slopes down-right at one vertical unit per two horizontal units, with no perspective convergence. Source centerline spans roughly 25.6 by 12.8 scene units with a trunk thickness near 10. Preserve those proportions: not a long thin stick, upright stump, rectangular beam, or broad flat plank.

ENDS AND VOLUME
The near end is clearly sawn across the trunk, a small vertical oval with approximate horizontal-to-vertical radii 3.5:5. Dark irregular bark rim surrounds a warm muted wood disk. Show one broken growth-ring arc, one darker center cluster, and at most one short radial crack. Avoid target-like concentric rings, perfectly machined circular edges, bolt-shaped square centers, hollow tubes, or pitch-black holes. The far end is mostly the receding rounded bark edge, not a second cut disk facing the viewer. The upper bark surface is readable and the underside darker, consistent with a round cross-section lying on the ground.

MATERIAL AND DETAIL
Bark anchored near #3e2c1d and #281c12, with sparse warmer ridges near #4a321d. End wood near #4a321d with restrained #6b4a2c lighter clusters. Use only a few broken longitudinal bark strips and one or two chipped patches, following the long axis. Add exactly two small low muted-olive moss patches near #4a5a2c attached to the upper bark; combined area under ten percent. No trailing vines, leafy twigs, side branches, mushrooms, grass, loose chips, detached bark, roots, axe, rope, or metal.

COMPOSITION AND SCALE
Center the complete trunk diagonally with both ends and all moss inside the canvas. Preserve a quiet broad bark mass that survives display at only a few dozen scene units across. Approximate eight to twelve coordinated brown and olive shades. The bottom contour rests stably; do not draw any supporting terrain, cast shadow, or brown halo around it.

REFERENCE ROLES
Image 1 is the approved crate: use its restrained warm pixel-art material treatment, deliberate stair steps, and upper-left illumination. Image 2 is the accepted rock direction: use quiet natural material clusters and subdued contrast. Image 3 is the existing camp: match its elevated orthographic viewpoint and small prop scale. References establish style and context; do not reproduce their subjects or scene.

PIXEL EXECUTION
Draw on one coherent coarse logical pixel grid. Use deliberate stepped edges and small grouped color blocks, with flat material planes and limited shades. A large PNG must read like enlarged hand-authored pixel art, not a painting under a pixel filter. Prioritize the silhouette and material separation at the source scale over tiny texture. Keep upper-left lighting within the object. No photorealism, vector-smooth contours, blur, random speckles, detailed noise, heavy dithering, thick black cartoon border, glossy 3D finish, or bright white rim highlights.

ALPHA DELIVERY — ESSENTIAL
ONE complete isolated object, fully visible with generous transparent margins. Export actual transparent PNG alpha. Outside the hard stepped object boundary, alpha is zero: no soft colored pixels, haze, bloom, glow, aura, gradient, ground shadow, contact-shadow ellipse, floor, soil patch, backdrop, or painted checkerboard. Gaps inside the silhouette must also be clean transparency where no material exists. Use opaque color clusters for the object rather than semi-transparent painted edge clouds. The scene renderer adds lighting and shadows later. No text, watermark, border, scene reconstruction, characters, extra objects, alternate versions, or sprite sheet.

## Review criteria

Check subject count, source orientation and proportions, material readability, clean alpha, and complete silhouette. Record deviations without automatically generating alternatives. Art only: no application integration or scene-scale validation in this task.

## Candidate review

Export: 1536 × 1024, PNG color type 6 (RGBA). One log with the cut end lower-right and two attached moss patches. Soft brown outer halo remains, violating the clean-edge brief.

Art files only. No application code changed, and no scene integration or actual-scale validation performed.
