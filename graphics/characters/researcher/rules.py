# How trace.py reads researcher's sheets: which material each pixel is, and the head's blink


def kind(r, g, b, h, s, v, L, y, top):
    skin = 0.055 < h < 0.09 and s > 0.3 and v > 0.8
    torso = top + 23 <= y <= top + 48
    # The amber lens is the only vivid orange below the mantle, so it is caught before its dark cradle turns to line
    if torso and y > top + 38 and 0.075 <= h < 0.15 and s > 0.75 and v > 0.7:
        return 'gold'
    # The mantle's and tunic's dark folds are drawn as lines, so the cloth around them stays clean; the belt's red-brown
    # leather is darker than the cloth, so only its darkest edge is line
    belt = torso and y > top + 36 and h < 0.07 and s > 0.42
    if L < 36 or (torso and L < (46 if belt else 62) and not skin):
        return 'line'
    # Hair, trousers, and boots share one chestnut, so the rows part them
    if y <= top + 22:
        return 'skin' if skin else 'hair'
    if s < 0.3 and v > 0.6:
        return 'ivory'
    if skin:
        return 'skin'
    # The sleeves' shadows are pale warm greys, greyer than the belt's leather
    if torso and s < 0.4 and v > 0.5 and h < 0.088:
        return 'ivory'
    # The olive tunic is yellower and far less saturated than the ochre mantle, light folds and hem trim included
    if 0.088 <= h < 0.25 and 0.3 <= s < 0.62 and L < 186 and y > top + 30:
        return 'tunic'
    if y <= top + 38 and 0.04 <= h < 0.11 and s > 0.5 and v > 0.45:
        return 'mantle'
    # The belt and the lens's bronze cradle are leather; the tunic's hem hangs to the trousers
    if y > top + 63:
        return 'leather'
    if y > top + 49:
        return 'legs'
    return 'leather'


SPEC = {
    'thin': {'gold'},
    'eyes': [(16, 18, 11, 13), (16, 18, 5, 7)],
    'skin': (20, 9),
    'closed': {('cast-loop', 2)},
}
