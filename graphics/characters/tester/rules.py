# How trace.py reads tester's sheets: which material each pixel is, and the head's blink


def kind(r, g, b, h, s, v, L, y, top):
    # The neckerchief's petrol blue and the vial's turquoise are the only cool colors
    # The vial's near-black rim joins its glass, so its three shades are rim, teal, and glare
    if top + 36 < y < top + 52 and ((0.35 < h < 0.53 and s > 0.03) or (y > top + 42 and v < 0.2 and s < 0.3)):
        return 'vial'
    if 0.4 < h < 0.65 and s > 0.08:
        return 'scarf' if v > 0.22 else 'line'
    # The trousers' darker olive draws their folds and seams as outline
    if y > top + 41 and h >= 0.09 and s < 0.45:
        return 'legs' if L > 66 else 'line'
    if L < 68:
        return 'line'
    # Hair and skin share one warm tan, so hue, saturation, and rows part them
    if y <= top + 21:
        return 'skin' if y >= top + 9 and 0.055 < h < 0.074 and s > 0.48 and v > 0.78 else 'hair'
    # The shirt's shadows are a greyer tan than the hands' skin
    if (s < 0.38 and v > 0.55) or (y <= top + 43 and 0.06 < h < 0.09 and s < 0.45 and v > 0.38):
        return 'ivory'
    if 0.05 < h < 0.075 and s > 0.38 and v > 0.6 and y < top + 60:
        return 'skin'
    if 0.075 <= h < 0.13 and s > 0.45:
        return 'vest'
    return 'leather'


SPEC = {
    'thin': {'vial'},
    'eyes': [(14, 16, 11, 14), (13, 17, 5, 7)],
    'skin': (18, 8),
    'closed': {('cast-loop', 2)},
}
