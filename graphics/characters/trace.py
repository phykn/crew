# Turns a role's approved sheets into the letter pictures src/frontend/camp/art/figures.js draws, and writes them to
# src/frontend/camp/art/people/<role>.js.
# Usage: python graphics/characters/trace.py <role>
#
# The sheets are painted with flecks, which jitter at the camp's size, so each pixel is sorted into a material (hair,
# skin, coat, ...) and each material is repainted in three flat shades. The shades and their light cut points come from
# the first idle frame and hold for every frame, so colors never shimmer between frames. The face, too small for the
# cleanup, is the hand-finished head.png, pasted where each frame's head is; frames with closed eyes get it blinking.
# Every frame is cut to one box shared by all sheets, so the feet stay put.
import colorsys
import sys
from collections import Counter
from pathlib import Path

import numpy as np
from PIL import Image


def interpreter(r, g, b, h, s, v, L, y, top):
    if L < 42:
        return 'line'
    if g > r + 4 and b > r:
        return 'coat'
    if y <= top + 17:
        return 'skin' if s > 0.33 and h < 0.1 else 'hair'
    if b >= r and L < 85:
        return 'legs'
    if h < 0.045 and s > 0.5 and r > 150 and top + 15 <= y <= top + 29:
        return 'scarf'
    if s > 0.3 and v > 0.6 and h < 0.073:
        return 'skin'
    if s > 0.45 and v > 0.6:
        return 'gold'
    # The shirt's shadows are warm greys, paler and greyer than the leather's browns
    if s < 0.45 and v > 0.42:
        return 'ivory'
    return 'leather'


def conductor(r, g, b, h, s, v, L, y, top):
    if L < 36:
        return 'line'
    # Hair and coat share the ink blue, so the jaw line parts them
    if 0.55 < h < 0.8 and s > 0.15:
        return 'hair' if y <= top + 23 else 'coat'
    if h > 0.85 and s > 0.3:
        return 'sash'
    if 0.04 < h < 0.1 and s > 0.35 and v > 0.85:
        return 'skin'
    if 0.085 <= h < 0.17 and s > 0.5 and v > 0.5:
        return 'gold'
    if s < 0.32 and v > 0.6:
        return 'ivory'
    if s < 0.45 and v < 0.45:
        return 'legs'
    return 'leather'


def researcher(r, g, b, h, s, v, L, y, top):
    skin = 0.055 < h < 0.09 and s > 0.3 and v > 0.8
    torso = top + 23 <= y <= top + 48
    # The mantle's and tunic's dark folds are drawn as lines, so the cloth around them stays clean
    if L < 36 or (torso and L < 62 and not skin):
        return 'line'
    # Hair, trousers, and boots share one chestnut, so the rows part them
    if y <= top + 22:
        return 'skin' if skin else 'hair'
    if s < 0.3 and v > 0.6:
        return 'ivory'
    if skin:
        return 'skin'
    if h >= 0.11 and s > 0.7 and v > 0.8:
        return 'gold'
    if 0.1 <= h < 0.25 and v < 0.6:
        return 'tunic'
    if y <= top + 34 and 0.04 <= h < 0.11 and s > 0.5 and v > 0.45:
        return 'mantle'
    if y > top + 63:
        return 'leather'
    if y > top + 46:
        return 'legs'
    return 'leather'


# Per role: which material a sheet pixel is (from its color, its row, and the frame's top row), each eye's box in
# head.png (top, bottom, left, right) and a skin pixel there for blinking, and which cells of the moving sheets have
# closed eyes
ROLES = {
    'interpreter': {
        'kind': interpreter,
        'eyes': [(15, 17, 6, 8), (15, 17, 11, 14)],
        'skin': (19, 14),
        'closed': {('cast-loop', 2)},
    },
    'researcher': {
        'kind': researcher,
        'thin': {'gold'},
        'eyes': [(16, 17, 11, 14), (16, 17, 5, 7)],
        'skin': (20, 9),
        'closed': {('cast-loop', 2)},
    },
    'conductor': {
        'kind': conductor,
        'thin': {'gold'},
        'eyes': [(15, 17, 8, 10), (15, 17, 3, 4)],
        'skin': (19, 9),
        'closed': {('cast-loop', 2)},
    },
}
SHEETS = [('idle', 4), ('walk', 4), ('sit', 2), ('cast-start', 4), ('cast-loop', 4), ('cast-end', 4)]
SHADES = 3
LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

role = sys.argv[1]
spec = ROLES[role]
here = Path(__file__).parent / role
cells = {}
for sheet, n in SHEETS:
    im = Image.open(here / f'{sheet}.png').convert('RGBA')
    w = im.width // n
    cells[sheet] = [np.asarray(im.crop((k * w, 0, k * w + w, im.height))).astype(float) for k in range(n)]
# One box round everything any cell draws
alpha = np.max([c[..., 3] > 127 for frames in cells.values() for c in frames], 0)
ys, xs = np.nonzero(alpha)
box = (ys.min(), ys.max() + 1, xs.min(), xs.max() + 1)
cells = {s: [c[box[0] : box[1], box[2] : box[3]] for c in frames] for s, frames in cells.items()}


def materials(a):
    H, W = a.shape[:2]
    mask = a[..., 3] > 127
    lum = a[..., :3] @ [0.3, 0.59, 0.11]
    top = np.nonzero(mask.any(1))[0][0]
    M = np.full((H, W), '', dtype='<U8')
    for y, x in zip(*np.nonzero(mask)):
        r, g, b = a[y, x, :3]
        h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        M[y, x] = spec['kind'](r, g, b, h, s, v, lum[y, x], y, top)
    # A pixel alone in its material takes its neighbours', so every part has a clean edge
    for _ in range(2):
        M2 = M.copy()
        for y, x in zip(*np.nonzero(mask)):
            if M[y, x] == 'line':
                continue
            n = [
                M[y + dy, x + dx]
                for dy in (-1, 0, 1)
                for dx in (-1, 0, 1)
                if (dy or dx) and 0 <= y + dy < H and 0 <= x + dx < W and M[y + dy, x + dx]
            ]
            # A thin material, such as piping one pixel wide, gives way only when nothing of it touches
            if n and n.count(M[y, x]) <= (0 if M[y, x] in spec.get('thin', ()) else 1):
                M2[y, x] = Counter(n).most_common(1)[0][0]
        M = M2
    # Light smoothed over each part, so its shades follow its form rather than the painting's flecks
    smooth = np.zeros((H, W))
    for y, x in zip(*np.nonzero(mask)):
        ys, xs = slice(max(0, y - 1), y + 2), slice(max(0, x - 1), x + 2)
        same = M[ys, xs] == M[y, x]
        smooth[y, x] = (lum[ys, xs] * same).sum() / same.sum()
    return M, smooth


# The first idle frame sets each material's cut points and shades
first = cells['idle'][0]
M0, L0 = materials(first)
ramps = {}
for m in sorted(set(M0[M0 != ''])):
    sel = M0 == m
    n = 1 if m == 'line' else SHADES
    cuts = np.quantile(L0[sel], np.linspace(0, 1, n + 1)[1:-1]) if n > 1 else np.array([])
    band = np.digitize(L0, cuts)
    ramps[m] = (cuts, [np.median(first[sel & (band == k), :3], 0) for k in range(n)])


def paint(a):
    M, Lm = materials(a)
    out = np.zeros(a.shape[:2] + (3,))
    for y, x in zip(*np.nonzero(M != '')):
        cuts, shades = ramps.get(M[y, x], ramps['leather'])
        out[y, x] = shades[min(int(np.digitize(Lm[y, x], cuts)), len(shades) - 1)]
    return out, M != ''


head = np.asarray(Image.open(here / 'head.png').convert('RGBA')).astype(float)
hmask = head[..., 3] > 127
hh, hw = hmask.shape


def blink(h):
    # Closed eyes: each eye becomes a dark lid line across its middle row, skin above and below
    h = h.copy()
    skin = h[spec['skin']][:3].copy()
    lid = np.array([0x52, 0x30, 0x26], float)
    for t, b, l, r in spec['eyes']:
        for y in range(t, b + 1):
            for x in range(l, r + 1):
                h[y, x, :3] = lid if y == (t + b) // 2 else skin
    return h


def place_head(img, mask, closed):
    # The head lands where this frame's own head silhouette fits it best
    H, W = mask.shape
    top = np.nonzero(mask.any(1))[0][0]
    best = None
    for dy in range(top - 3, top + 4):
        for dx in range(-4, W - hw + 5):
            score = 0
            for y in range(hh - 6):
                for x in range(hw):
                    yy, xx = y + dy, x + dx
                    inside = 0 <= yy < H and 0 <= xx < W and mask[yy, xx]
                    score += inside == hmask[y, x]
            if best is None or score > best[0]:
                best = (score, dy, dx)
    _, dy, dx = best
    h = blink(head) if closed else head
    # The frame's own pixels in the head's rows give way, so no old face shows round the new one
    for y in range(hh):
        for x in range(W):
            yy = y + dy
            if 0 <= yy < H and mask[yy, x] and (y < hh - 4 or (0 <= x - dx < hw and hmask[y, x - dx])):
                mask[yy, x] = False
    for y in range(hh):
        for x in range(hw):
            yy, xx = y + dy, x + dx
            if hmask[y, x] and 0 <= yy < H and 0 <= xx < W:
                img[yy, xx] = h[y, x, :3]
                mask[yy, xx] = True


# Standing and sitting still keep one body and only blink, since the sheets' still frames drift a pixel or two and
# would jitter; the moving sheets keep every frame
STILL = {'idle', 'sit'}
frames = {}
for sheet, _ in SHEETS:
    frames[sheet] = []
    for k, a in enumerate(cells[sheet][:1] * 2 if sheet in STILL else cells[sheet]):
        img, mask = paint(a)
        place_head(img, mask, k == 1 if sheet in STILL else (sheet, k) in spec['closed'])
        frames[sheet].append((img, mask))

hex_of = lambda c: '#%02x%02x%02x' % tuple(np.round(c).astype(int))
hexes = sorted(
    {hex_of(img[y, x]) for fs in frames.values() for img, m in fs for y, x in zip(*np.nonzero(m))},
    key=lambda h: sum(int(h[i : i + 2], 16) for i in (1, 3, 5)),
)
assert len(hexes) <= len(LETTERS), f'{len(hexes)} shades'
index = {h: LETTERS[i] for i, h in enumerate(hexes)}


def rows(img, mask):
    H, W = mask.shape
    return [''.join(index[hex_of(img[y, x])] if mask[y, x] else '.' for x in range(W)) for y in range(H)]


name = lambda s: s.split('-')[0] + ''.join(p.title() for p in s.split('-')[1:])
out = [f'// Made by graphics/characters/trace.py from graphics/characters/{role}/; run it again rather than editing', 'export default {']
out.append('  colors: [' + ', '.join(f"'{h}'" for h in hexes) + '],')
out.append('  poses: {')
for sheet, _ in SHEETS:
    out.append(f'    {name(sheet)}: [')
    for img, mask in frames[sheet]:
        out.append('      [')
        out += [f"        '{r}'," for r in rows(img, mask)]
        out.append('      ],')
    out.append('    ],')
out += ['  },', '};', '']
target = Path(__file__).parents[2] / 'src' / 'frontend' / 'camp' / 'art' / 'people' / f'{role}.js'
target.parent.mkdir(exist_ok=True)
target.write_text('\n'.join(out), encoding='utf-8', newline='\n')
print(target, len(hexes), 'shades', box)
