# graphics

Working files for drawing the camp. The app never reads this folder, so it runs with the folder deleted; the final code is in `src/frontend/camp/`.

## Folders

One folder per thing, holding one `brief.md` and its pictures only.

- `props/<thing>/`: props placed in the camp. One picture is `image.png`; several are named by how they differ (lantern: `image.png`, `light.png`).
- `ground/<kind>/`: ground textures (grass, dirt, worn, edge)
- `effects/<effect>/`: flames, smoke, sparks, the ward
- `characters/<role>/`: the final picture of each motion (`idle`, `walk`, `sit`, `cast-start`, `cast-loop`, `cast-end`), and `brief.md`, which holds the master prompt, the motion prompts, and notes
- `characters/head.py`: makes the first `head.png` from the standing pose's first frame
- `characters/trace.py`: turns all of a role's motion pictures into the letter pictures in `src/frontend/camp/art/people/<role>.js` (`python graphics/characters/trace.py interpreter`)
- `characters/<role>/head.png`: the head, finished by hand and put on every frame
- `characters/<role>/rules.py`: the role's material rules (`kind`), blink, and thin materials (`SPEC`), read by `trace.py`
- `preview.html`: a page that draws props with the app's own code

Names carry no version (`v1`) and no tails such as `-prompt` or `-pack`. Candidate pictures and old prompts live only in git history.

## Preview

Start a server at the repository root.

```powershell
python -m http.server 8766 --bind 127.0.0.1
```

- Everything: http://127.0.0.1:8766/graphics/preview.html
- One kind: `?kind=wagon` (kinds: hearth, rug, crates, drum, hay, log, well, wagon, tent, lantern, torch, pine, fern, tuft, rock, woodpile)
- Zoom: `&zoom=6`
- The whole camp, ground and props: `?ground` (ground alone: `?ground&bare`)
- People: `?figure=interpreter` (a row per motion: the first frame moving, then every frame)

Each prop is drawn where it stands in the camp, so it takes the fire's light just as in the app.

## Code

`src/frontend/camp/art/`:

- `solids.js`: the 3D prop renderer. Shapes are signed distance functions (SDF), and a ray is cast per pixel through the camp's own projection. It handles:
  - toon shading
  - each material's shades (WOOD, BARK, IRON, ROCK, HAY, CANVAS, WATER, BLAZE, RUG, SAND, SAGE)
  - the light of the fire and the torches (ground shadows belong to the light map)
- `props.js`: one function per prop. Parts (`box`, `round`, `rod`, `facets`) are combined and colored by `paint`.
- `ground.js`: the ground, the hearth, and the rugs people sit on
- `figures.js`: the camp's people. Paints the letter pictures in `people/<role>.js` (a letter a pixel) and warms the edge toward the fire
- `finish.js`: touches up baked props (rim light, grain)
- `casters.js`: what blocks the fire's and the torches' light (for long shadows)

Colors are in `src/frontend/camp/palette.js`, places in `layout.js`, and the projection in `projection.js`.

## Order of work

1. Pick one thing.
2. Write the brief first: shape, parts, shades, what to avoid.
3. Reference pictures set only the mood. Fitting the whole camp comes first.
4. Check that thing alone in `preview.html`.

Avoid:

- messy grain, random lines
- lumpy or lacy edges
- bright stripes on iron bands
- cracks and moss on rocks

## Making characters

The way settled while making the interpreter. Other roles follow the same order.

### Order

Show only that stage's pictures at each stage, and go on once they are approved.

1. Check the concept
   - 6 sheets (`idle`, `walk`, `sit`, `cast-start`, `cast-loop`, `cast-end`) and their frame counts
   - every sheet's sole line is the same
   - `sit` sits on the ground
2. Brief
   - Write materials, colors, face, and what to avoid in `brief.md`'s "Code figure" first.
3. Material rules
   - In the role's `rules.py`, set `kind` and sample the concept's pixels for each material's color range. Use another role's `rules.py` as the model.
   - Put a material map (a loud color per material) beside the concept, and fix it until every part takes its own material.
   - One-pixel trims (the conductor's gold line) go in `thin`, which the clean-up keeps.
   - Note the closed-eye frames in `SPEC`.
4. Clean up standing
   - Take only the standing first frame and set it beside the concept.
   - Fix the material rules until there is no fizz and every part is clear.
5. Face
   - `python graphics/characters/head.py <role> <rows> <face top> <bottom> <left> <right>` makes the first `head.png`, because the clean-up erases small face pixels.
   - Inside the face box the concept's pixels stay as they are. Only skin is set to 3 flat shades; eyes, glasses, and hairpins keep every pixel. Hair takes the cleaned colors.
   - Then finish by hand: erase stray dots on the forehead and add the brows.
   - Always add brows, even faint ones, as in the concept. Without them the face looks wrong. Add a nose and mouth only when the concept has none.
   - Both eyes sit on one row with the same build (lid, pupil, glint); only the far eye is narrower. Different rows or a glint on one side looks mismatched.
   - Hair shine keeps the concept's bright spots one shade lighter.
   - Note in `SPEC` the eye boxes in head.png and one skin pixel (for blinking). An eye box takes in the row under the eye (the lower lashes), or a dot stays under the closed eye.
   - `head.py`'s hair test is made for chestnut hair. Other hair colors turn eyes, glasses, or skin into hair, or leave hair as it is, so match it to the concept pixel by pixel.
   - After changing `rules.py`, run `head.py` again first: the skin shades change and the color count grows.
6. Every motion
   - `python graphics/characters/trace.py <role>`
   - Add the role to `PEOPLE` in `figures.js`.
   - Play it at `?figure=<role>` and fix frames that look off: a head out of place, a broken hand or foot, a flashing color.
7. Finish
   - Show the motion GIFs and the sitting picture.
   - Add what was learned to this README and the brief.
   - Commit

### Motion

- Every sheet is cut with one box, so the feet stay in place.
- Standing and sitting use one body, the first frame's, and only the eyes blink. The concept's still frames shift a pixel or two and look shaky.
- Walking and casting use every concept frame, and each frame's head goes where it best fits the silhouette.
- When the concept sways the whole body a few pixels a frame (conductor, images), the moving frames are shifted sideways so the head stays where it stands. `trace.py` does it.
- The standing first frame's shades and borders are used for every frame, so colors never flash between frames.
- Every sheet faces screen-left. The camp flips them for walking right.
- Where color alone cannot split two parts (the conductor's wand against the chest), `SPEC`'s `fix` sets the material inside a box on that frame.
- Sitting is cross-legged on the ground, as in the concept's `sit`, on a free rug round the fire (`RUGS` in `layout.js`). There is no bench: a bench seat made from the standing picture had awkward legs.

### Size

- The concept's own size (about 28×82), shown a little over 1:1 on the camp screen. People are drawn a little larger than the props would make them (`BIG` in `figure.js`), so faces and poses read.
- Cut to 26×42, the face is 9×8 pixels and holds no expression.
- 3D solids lose the face and the clothes' trims.

### Clean-up (`trace.py`)

- The concept is painted in brush-like dots, so used as is it fizzes.
- Each pixel gets a material: hair, skin, coat, shirt and sleeves, scarf, gold, leather, trousers, outline.
- A pixel alone inside a material takes the material around it.
- Each material is painted again in 3 flat shades. The outline is one color.
- The face is not cleaned; `head.png` goes on top.
- Materials that share colors are split by place: the interpreter's grey hair and ivory shirt, the conductor's hair and navy coat (above and below the chin line).
- Saturation is measured in HSV. HLS rates light grey as saturated and splits hair into skin.

### Face

- Eyes are clear when a dark lid covers their top. A thin one looks blank.
- Brows sit on the row right above the eyes. Floating ones look blank.
- Brows follow the concept's shape (interpreter: low inside, rising in the middle, falling outside). Avoid straight ones.
- Nose: one dark skin pixel on the near cheek.
- Mouth: a short line of 2 pixels. Avoid smiling corners and a dark mouth.
- Erase black dots left between the eyes or on the cheeks. Check first that they are not part of a brow.
- The face must look like the concept. Brows, chin, and blush redrawn by hand add up to someone else (the conductor's first fix).
- When colors pass the letter count (62), reduce only the face pixels outside the eyes and hairpins to a few colors.

### Firelight

- On the fire's side, the three pixels inside the outline warm less the further in (0.2, 0.13, 0.06).
- The outline and the darkest shade never warm.
- Raising the shade looks like a band, so only the color warms.

### Avoid

- hair in two symmetric points like cat ears
- hair in one lump like a helmet
- a gold stripe across the body
- a bright vertical stripe down the shirt
- cuffs lighter than the body
