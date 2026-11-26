# How trace.py reads writer's sheets: which material each pixel is, and the head's blink


def kind(r, g, b, h, s, v, L, y, top):
    skin = 0.055 < h < 0.09 and s > 0.35 and v > 0.92
    torso = top + 23 <= y <= top + 56
    # The coat's and hair's dark folds and strands are drawn as lines, so the parts around them stay clean
    if L < 40 or (torso and L < 60 and not skin) or (y <= top + 29 and L < 68 and not skin):
        return 'line'
    if skin:
        return 'skin'
    if s < 0.32 and v > 0.7:
        return 'ivory'
    if h > 0.85 and s > 0.3:
        return 'sash'
    # Copper hair and brick coat are near in hue; the hair is a touch yellower, and only the braid falls past the jaw
    if y <= top + 22:
        return 'hair'
    if y <= top + 29 and 0.019 < h < 0.06 and s > 0.58:
        return 'hair'
    if y > top + 63:
        return 'leather'
    # Tan trim and the brass pin run one pixel along the coat
    if y <= top + 56 and 0.055 < h < 0.13 and s > 0.4 and v > 0.7:
        return 'gold'
    if (h < 0.019 or h > 0.95) and s > 0.5:
        return 'coat'
    if top + 37 <= y <= top + 45 and 0.04 < h < 0.1:
        return 'leather'
    # Trousers are a dull dark brown; boots, belt, and pen case are the warmer tan
    if y > top + 46 and h < 0.045 and (v < 0.45 or s < 0.47):
        return 'legs'
    if 0.035 < h < 0.1 and s > 0.4 and v > 0.4:
        return 'leather'
    return 'coat'


SPEC = {
    'thin': {'gold'},
    'eyes': [(14, 17, 12, 16), (14, 17, 6, 8)],
    'skin': (19, 10),
    'closed': {('cast-loop', 2)},
}
