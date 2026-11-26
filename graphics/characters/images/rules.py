# How trace.py reads images' sheets: which material each pixel is, and the head's blink


def kind(r, g, b, h, s, v, L, y, top):
    if L < 36:
        return 'line'
    # The boot cuffs share the hair's indigo and the hair's lock the coat's turquoise, so each takes that material
    if 0.6 < h < 0.8 and s > 0.12:
        return 'hair'
    if 0.38 < h < 0.6:
        # The coat's dark folds are drawn as lines, so the arms stay apart from the body
        return 'line' if y > top + 22 and L < 56 else 'coat'
    if h > 0.86 and s > 0.25:
        return 'plum'
    # The boots' warm highlights pass for skin, so nothing below the hands is skin
    if 0.045 < h < 0.085 and s > 0.3 and v > 0.5 and y <= top + 56:
        return 'skin'
    # The neck's shadow under the jaw is skin though as deep as leather
    if 0.035 < h < 0.085 and s > 0.3 and v > 0.45 and y <= top + 28:
        return 'skin'
    if 0.075 <= h < 0.15 and s > 0.45 and v > 0.55:
        return 'gold'
    if s < 0.32 and v > 0.6:
        return 'ivory'
    if s < 0.32:
        return 'legs'
    return 'leather'


SPEC = {
    'thin': {'gold'},
    'eyes': [(15, 18, 11, 14), (15, 18, 5, 7)],
    'skin': (19, 9),
    'closed': {('cast-loop', 2)},
}
