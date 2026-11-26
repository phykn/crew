# Starts a role's head.png from its first idle frame: the cleaned hair round the sheet's own face, to finish by hand
# (brows, level eyes; see graphics/README.md). Inside the face box (head.png rows and columns) every pixel is the
# sheet's (eyes, glasses, brows, mouth) but skin, snapped to the cleaned skin shades, and hair, which takes the cleaned
# hair. Usage: python graphics/characters/head.py <role> <rows> <face top> <face bottom> <face left> <face right>
import colorsys
import sys

import numpy as np
from PIL import Image

role, H, t, b, l, r = sys.argv[1], *map(int, sys.argv[2:7])
# trace.py's cleanup, run up to where it pastes heads
src = open('graphics/characters/trace.py', encoding='utf-8').read()
src = src[: src.index("head = np.asarray")]
sys.argv = ['trace.py', role]
g = {'__file__': 'graphics/characters/trace.py'}
exec(src, g)
a = g['cells']['idle'][0]
img, mask = g['paint'](a)
M, _ = g['materials'](a)
top = np.nonzero(mask.any(1))[0][0]
xs = np.nonzero(mask[top:top + H].any(0))[0]
x0, x1 = xs.min(), xs.max() + 1
orig = a[top:top + H, x0:x1]
out = np.dstack([img[top:top + H, x0:x1], mask[top:top + H, x0:x1] * 255.0])
Mh = M[top:top + H, x0:x1]
cuts, skins = g['ramps']['skin']
hair_shades = np.array(g['ramps']['hair'][1])
lum = lambda c: c[:3] @ [0.3, 0.59, 0.11]
for y in range(t, b + 1):
    for x in range(l, r + 1):
        o = orig[y, x]
        if o[3] <= 127:
            continue
        h, s, v = colorsys.rgb_to_hsv(*(o[:3] / 255))
        # Decided by the sheet's own color, since the cleanup's map takes small face marks for their neighbours
        if 0.05 < h < 0.1 and s > 0.3 and v > 0.75:
            out[y, x, :3] = skins[min(int(np.digitize(lum(o), cuts)), len(skins) - 1)]
        elif y < b - 2 and v > 0.25 and s > 0.35 and abs(h - 0.04) < 0.03:
            out[y, x, :3] = hair_shades[np.argmin(abs(hair_shades @ [0.3, 0.59, 0.11] - lum(o)))]
        else:
            out[y, x, :3] = o[:3]
        out[y, x, 3] = 255
Image.fromarray(out.astype(np.uint8)).save(f'graphics/characters/{role}/head.png')
print('head', out.shape, 'sheet origin', g['box'][0] + top, g['box'][2] + x0)
