# Turns one cell of a character's sheet into the letter picture src/frontend/camp/art/figures.js draws.
# Usage: python graphics/characters/trace.py <role> <sheet> <cell> [cells across]
#   e.g. python graphics/characters/trace.py interpreter idle 0 4
# Prints the colors and rows to paste into PEOPLE[role]; colors are grouped so the picture keeps a calm palette, and a
# color the grouping would lose (an eye, a buckle) keeps a shade of its own.
import sys
from pathlib import Path

import numpy as np
from PIL import Image

role, sheet, cell = sys.argv[1], sys.argv[2], int(sys.argv[3])
across = int(sys.argv[4]) if len(sys.argv) > 4 else 4
im = Image.open(Path(__file__).parent / role / f'{sheet}.png').convert('RGBA')
w = im.width // across
im = im.crop((cell * w, 0, cell * w + w, im.height))
# Every cell of a sheet is cut to the same box, so frames keep their place against each other
box = Image.open(Path(__file__).parent / role / 'idle.png').convert('RGBA').crop((0, 0, w, im.height)).getchannel('A').getbbox()
im = im.crop((box[0] - 1, box[1], box[2] + 1, box[3]))
a = np.asarray(im).astype(float)
mask = a[..., 3] > 127
X = a[mask][:, :3]

rng = np.random.default_rng(0)


def group(X, k, fixed):
    C = list(fixed) or [X[rng.integers(len(X))]]
    while len(C) < k:
        d = np.min(((X[:, None] - np.array(C)[None]) ** 2).sum(-1), 1)
        C.append(X[rng.choice(len(X), p=d / d.sum())])
    C = np.array(C, float)
    for _ in range(40):
        l = np.argmin(((X[:, None] - C[None]) ** 2).sum(-1), 1)
        C = np.array([C[i] if i < len(fixed) or not (l == i).any() else X[l == i].mean(0) for i in range(k)])
    return C, l


fixed, k = [], 20
while True:
    C, l = group(X, k + len(fixed), fixed)
    far = np.sqrt(((X - C[l]) ** 2).sum(1))
    if far.max() < 35 or len(fixed) >= 6:
        break
    fixed.append(X[far.argmax()])

order = np.argsort(C.sum(1))
rank = {int(o): n for n, o in enumerate(order)}
letters = 'abcdefghijklmnopqrstuvwxyz'
H, W = mask.shape
grid = np.full((H, W), '.', dtype='<U1')
grid[mask] = [letters[rank[int(i)]] for i in l]
print('colors: [' + ', '.join("'#%02x%02x%02x'" % tuple(C[o].round().astype(int)) for o in order) + '],')
print('rows: [')
for r in grid:
    print(f"  '{''.join(r)}',")
print('],')
