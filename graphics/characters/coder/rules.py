# How trace.py reads coder's sheets: which material each pixel is, and the head's blink


def kind(r, g, b, h, s, v, L, y, top):
    skin = 0.045 < h < 0.095 and s > 0.25 and v > 0.78
    if L < 36:
        return 'line'
    # Hair and trousers share one chestnut, so the rows part them
    if y <= top + 22:
        return 'skin' if skin else 'hair'
    # The neck's shade under the jaw is skin in shadow, not leather
    if y <= top + 26 and 0.045 < h < 0.09 and v > 0.5 and s < 0.7:
        return 'skin'
    if g > r and b > r:
        return 'stone'
    if s < 0.3 and v > 0.62:
        return 'ivory'
    if skin:
        return 'skin'
    # The sleeves' shadows are pale warm greys, greyer than skin and paler than leather
    if 0.06 < h < 0.1 and s < 0.45 and v > 0.5:
        return 'ivory'
    if h < 0.035 and s > 0.55 and v > 0.5:
        return 'scarf'
    if 0.085 <= h < 0.2 and s > 0.15:
        # The tunic's dark folds are drawn as lines, so the cloth around them stays clean
        return 'line' if L < 60 else 'tunic'
    # The far boot is shaded as dark as the trousers, so below the shins it is told by rows
    if y >= top + 64 or (y >= top + 62 and (v >= 0.4 or h >= 0.05)):
        return 'leather'
    # Boots and belt are a redder, more saturated brown than the trousers
    if s >= 0.58 or v >= 0.55:
        return 'leather'
    return 'legs'


SPEC = {
    'thin': {'stone'},
    'eyes': [(16, 19, 12, 15), (16, 19, 6, 7)],
    'skin': (21, 10),
    'closed': {('cast-loop', 2)},
}
