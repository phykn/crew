# How trace.py reads librarian's sheets: which material each pixel is, and the head's blink


def kind(r, g, b, h, s, v, L, y, top):
    plum = h > 0.75 or h < 0.01
    # The hair's dark strands stay hair, since as outline they read as specks
    if L < 30 and not (plum and y <= top + 23 and L > 18):
        return 'line'
    # Plum hair above the jaw; below it the same hue is the burgundy sash
    if y <= top + 23:
        return 'hair' if plum else 'skin'
    if s < 0.3 and v > 0.6:
        return 'ivory'
    if plum and s >= 0.4:
        return 'sash'
    # Boot tops share the hands' bright brown, so only hands' rows count as skin
    if 0.04 <= h < 0.07 and s >= 0.4 and v >= 0.65 and y <= top + 58:
        return 'skin'
    if 0.07 <= h < 0.1 and s >= 0.45 and v >= 0.45:
        return 'book'
    if 0.1 <= h < 0.135 and s >= 0.4 and v >= 0.4:
        return 'gold'
    if 0.085 <= h < 0.35:
        return 'coat'
    if v < 0.5 and s < 0.4:
        return 'legs'
    return 'leather'


SPEC = {
    'thin': {'gold'},
    'eyes': [(14, 17, 11, 13), (14, 17, 5, 6)],
    'skin': (19, 8),
    'closed': {('cast-loop', 2)},
}
