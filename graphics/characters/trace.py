# Turns one cell of a character's sheet into the letter picture src/frontend/camp/art/figures.js draws.
# Usage: python graphics/characters/trace.py <role> <sheet> <cell> [cells across]
#   e.g. python graphics/characters/trace.py interpreter idle 0 4
# The sheets are painted with flecks, which read as jitter at the camp's size, so each pixel is sorted into a material
# (hair, skin, coat, ...) and each material is repainted in a few flat shades that follow its smoothed light; the
# outline, the eyes, and the brows keep their own pixels; the nose and mouth, too faint to survive, are drawn after. Prints the colors and rows to paste into PEOPLE[role].
import colorsys
import sys
from collections import Counter
from pathlib import Path

import numpy as np
from PIL import Image

# Where a role's small parts sit in its idle frame (rows and columns of the cropped cell), so they are told apart from
# the larger parts of the same color
PLACES = {
    'interpreter': {'head': 24, 'eyes': (14, 17, 6, 15), 'scarf': (22, 36, 9, 19), 'hands': (44, 8, 21)},
}
SHADES = 3

role, sheet, cell = sys.argv[1], sys.argv[2], int(sys.argv[3])
across = int(sys.argv[4]) if len(sys.argv) > 4 else 4
place = PLACES[role]
here = Path(__file__).parent / role
im = Image.open(here / f'{sheet}.png').convert('RGBA')
w = im.width // across
im = im.crop((cell * w, 0, cell * w + w, im.height))
# Every cell is cut to the idle frame's box, so frames keep their place against each other
box = Image.open(here / 'idle.png').convert('RGBA').crop((0, 0, w, im.height)).getchannel('A').getbbox()
im = im.crop(box)
a = np.asarray(im).astype(float)
H, W = a.shape[:2]
mask = a[..., 3] > 127
lum = a[..., :3] @ [0.3, 0.59, 0.11]


def material(y, x):
    r, g, b = a[y, x, :3]
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    L = lum[y, x]
    y0, y1, x0, x1 = place['eyes']
    if y0 <= y <= y1 and x0 <= x <= x1 and (L > 225 or (s > 0.7 and h < 0.1)):
        return 'eye'
    # The brows are a few dark brown pixels just above the eyes; left to the cleanup they would melt into the skin
    if y0 - 2 <= y < y0 and x0 <= x <= x1 and L < 130 and s > 0.3:
        return 'eye'
    if L < 42:
        return 'line'
    if g > r + 4 and b > r:
        return 'coat'
    if b >= r and L < 85 and y >= place['head']:
        return 'legs'
    if y <= place['head']:
        return 'skin' if s > 0.33 and h < 0.1 else 'hair'
    y0, y1, x0, x1 = place['scarf']
    if h < 0.05 and s > 0.5 and y0 <= y <= y1 and x0 <= x <= x1 and r > 150:
        return 'scarf'
    top, left, right = place['hands']
    if y >= top and (x <= left or x >= right) and s > 0.3 and v > 0.55:
        return 'skin'
    if s > 0.45 and v > 0.6:
        return 'gold'
    if s < 0.4 and v > 0.55:
        return 'ivory'
    return 'leather'


M = np.full((H, W), '', dtype='<U8')
for y, x in zip(*np.nonzero(mask)):
    M[y, x] = material(y, x)
# A pixel alone in its material takes its neighbours', so every part has a clean edge
for _ in range(2):
    M2 = M.copy()
    for y, x in zip(*np.nonzero(mask)):
        if M[y, x] in ('eye', 'line'):
            continue
        n = [
            M[y + dy, x + dx]
            for dy in (-1, 0, 1)
            for dx in (-1, 0, 1)
            if (dy or dx) and 0 <= y + dy < H and 0 <= x + dx < W and M[y + dy, x + dx] not in ('', 'eye')
        ]
        if n and n.count(M[y, x]) <= 1:
            M2[y, x] = Counter(n).most_common(1)[0][0]
    M = M2

colors, grid = [], np.full((H, W), -1)
for m in sorted(set(M[mask])):
    sel = M == m
    if m == 'eye':
        for y, x in zip(*np.nonzero(sel)):
            colors.append(a[y, x, :3])
            grid[y, x] = len(colors) - 1
        continue
    # Light smoothed over the part, so its shades follow its form rather than the painting's flecks
    smooth = np.zeros((H, W))
    for y, x in zip(*np.nonzero(sel)):
        ys, xs = slice(max(0, y - 1), y + 2), slice(max(0, x - 1), x + 2)
        smooth[y, x] = (lum[ys, xs] * sel[ys, xs]).sum() / sel[ys, xs].sum()
    n = 1 if m == 'line' else SHADES
    band = np.digitize(smooth, np.quantile(smooth[sel], np.linspace(0, 1, n + 1)[1:-1])) if n > 1 else np.zeros((H, W), int)
    for k in range(n):
        part = sel & (band == k)
        if part.any():
            colors.append(np.median(a[part, :3], 0))
            grid[part] = len(colors) - 1

# Shades are listed darkest first, and the same color is listed once
hexes = ['#%02x%02x%02x' % tuple(np.round(c).astype(int)) for c in colors]
order = sorted(set(hexes), key=lambda h: sum(int(h[i : i + 2], 16) for i in (1, 3, 5)))
letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
print('colors: [' + ', '.join(f"'{h}'" for h in order) + '],')
print('rows: [')
for y in range(H):
    print("  '" + ''.join('.' if grid[y, x] < 0 else letters[order.index(hexes[grid[y, x]])] for x in range(W)) + "',")
print('],')
