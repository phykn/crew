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

# Per role: each eye's box in head.png (top, bottom, left, right), the rows below the head's top where the scarf sits,
# and which cells of the moving sheets have closed eyes
ROLES = {
    'interpreter': {
        'eyes': [(15, 17, 6, 8), (15, 17, 11, 14)],
        'scarf': (15, 29),
        'closed': {('cast-loop', 2)},
    },
}
SHEETS = [('idle', 4), ('walk', 4), ('cast-start', 4), ('cast-loop', 4), ('cast-end', 4)]
# A seated person's hips rest on the plank (figure.js SEAT_Z, 8 world px up) and their feet stand on the ground half a
# tile in front of it (4 world px lower on screen, 8 forward), so in the picture's pixels (2 to a world px) the hips
# are 24 above the soles and the thighs carry the feet 16 forward
SEAT = 24
REACH = 16
SHADES = 3
LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

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
        L = lum[y, x]
        if L < 42:
            m = 'line'
        elif g > r + 4 and b > r:
            m = 'coat'
        elif y <= top + 17:
            m = 'skin' if s > 0.33 and h < 0.1 else 'hair'
        elif b >= r and L < 85:
            m = 'legs'
        elif h < 0.045 and s > 0.5 and r > 150 and top + spec['scarf'][0] <= y <= top + spec['scarf'][1]:
            m = 'scarf'
        elif s > 0.3 and v > 0.6 and h < 0.073:
            m = 'skin'
        elif s > 0.45 and v > 0.6:
            m = 'gold'
        # The shirt's shadows are warm greys, paler and greyer than the leather's browns
        elif s < 0.45 and v > 0.42:
            m = 'ivory'
        else:
            m = 'leather'
        M[y, x] = m
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
            if n and n.count(M[y, x]) <= 1:
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
    skin = h[19, hw // 2, :3].copy()
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


def seated(a):
    # Seated on a bench: the boots stand on the ground in front of the plank, and the standing upper body sinks until
    # its hips rest on the plank, hands on its lap. Between them the thighs are one solid mass running down to the
    # knees, lit along its top edge and shaded along its bottom
    # Room on the left for the feet carried forward
    a = np.pad(a, ((0, 0), (REACH, 0), (0, 0)))
    img, mask = paint(a)
    M, _ = materials(a)
    H, W = mask.shape
    legs = [y for y in range(H) if (M[y] == 'legs').sum() >= 4]
    hip = legs[0]
    boots = max(y for y in range(H) if (M[y] == 'legs').sum() >= 2) + 1
    left, right = (lambda xs: (xs.min(), xs.max()))(np.nonzero(M[hip] == 'legs')[0])
    sink = (H - SEAT) - hip
    out, om = np.zeros_like(img), np.zeros_like(mask)

    def put(y, row, keep, shift):
        for x in np.nonzero(keep)[0]:
            if 0 <= y < H and 0 <= x - shift < W:
                out[y, x - shift], om[y, x - shift] = row[x], True

    for y in range(boots, H):
        put(y, img[y], mask[y], REACH)
    thigh = np.zeros((H, W), bool)
    rows = boots + 2 - (H - SEAT)
    for r in range(rows):
        shift = round(REACH * r / (rows - 1))
        # Each row reaches past the hips' width, so the thighs read as thick as the legs they are
        thigh[H - SEAT + r, max(0, left - shift) : right - shift + 5] = True
    _, shades = ramps['legs']
    for y, x in zip(*np.nonzero(thigh)):
        up, down = thigh[y - 1, x], y + 1 < H and thigh[y + 1, x]
        out[y, x], om[y, x] = shades[2 if not up else 0 if not down else 1], True
    for y in range(hip):
        put(y + sink, img[y], mask[y], 0)
    return out, om


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
frames['bench'] = []
for k in range(2):
    img, mask = seated(cells['idle'][0])
    place_head(img, mask, k == 1)
    frames['bench'].append((img, mask))

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
for sheet in [s for s, _ in SHEETS] + ['bench']:
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
