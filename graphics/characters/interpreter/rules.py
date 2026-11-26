# How trace.py reads interpreter's sheets: which material each pixel is, and the head's blink


def kind(r, g, b, h, s, v, L, y, top):
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


SPEC = {
    'eyes': [(15, 17, 6, 8), (15, 17, 11, 14)],
    'skin': (19, 14),
    'closed': {('cast-loop', 2)},
}
