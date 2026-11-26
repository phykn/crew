# How trace.py reads researcher's sheets: which material each pixel is, and the head's blink


def kind(r, g, b, h, s, v, L, y, top):
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


SPEC = {
    'thin': {'gold'},
    'eyes': [(16, 18, 11, 13), (16, 18, 5, 7)],
    'skin': (20, 9),
    'closed': {('cast-loop', 2)},
}
