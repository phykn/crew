# How trace.py reads reviewer's sheets: which material each pixel is, and the head's blink


def kind(r, g, b, h, s, v, L, y, top):
    if L < 36:
        return 'line'
    skin = 0.04 < h < 0.1 and s > 0.35 and v > 0.75
    if skin:
        return 'skin'
    # Hair and trousers share the charcoal, so the jaw line parts them
    if y <= top + 22:
        return 'streak' if s < 0.3 and v > 0.5 else 'hair'
    # Shirt, cuffs, the coat's silver edging, and the token share one ash ivory
    if s < 0.3 and v > 0.55:
        return 'ivory'
    if 0.45 < h < 0.65:
        return 'sash'
    # The aubergine's shadows turn red-brown; the trousers' charcoal is greyer, which keeps a seated lap apart
    if y <= top + 52 and s > 0.3 and (h > 0.8 or h < 0.03):
        return 'coat'
    if 0.02 <= h < 0.12 and s > 0.38:
        return 'leather'
    return 'legs'


SPEC = {
    'thin': {'ivory'},
    'eyes': [(15, 17, 10, 13), (15, 17, 4, 6)],
    'skin': (18, 8),
    'closed': {('cast-loop', 2)},
}
