# How trace.py reads conductor's sheets: which material each pixel is, and the head's blink


def kind(r, g, b, h, s, v, L, y, top):
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
    # The blouse's, cuffs', and wand's grey folds are drawn as lines, so the three stay apart where they overlap
    if s < 0.32 and top + 22 <= y <= top + 42:
        return 'line'
    if s < 0.45 and v < 0.45:
        return 'legs'
    return 'leather'


SPEC = {
    'thin': {'gold'},
    'eyes': [(14, 16, 10, 12), (14, 16, 5, 6)],
    'skin': (18, 8),
    'closed': {('cast-loop', 2)},
    # The wand held to the chest has the ochre cravat beside it, which with the blouse reads as one pale wedge
    'fix': {('cast-start', 2): [(28, 34, 25, 27, 'gold', 'line')]},
}
