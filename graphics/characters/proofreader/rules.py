# How trace.py reads proofreader's sheets: which material each pixel is, and the head's blink


def kind(r, g, b, h, s, v, L, y, top):
    rose = (h > 0.95 or h < 0.017) and s > 0.33
    skin = 0.035 <= h < 0.1 and s > 0.3 and v > 0.75
    # The neck's shadow under the jaw is a dull peach that would otherwise read as hair or leather
    neck = top + 19 <= y <= top + 27 and 0.03 <= h < 0.1 and s > 0.3 and v > 0.45
    # Only the sitting sheet's head starts this low in the shared box; its crossed legs fill the rows under the lap
    sitting = top > 12
    lap = sitting and y > top + 43
    # Dark folds of hair and cloth are drawn as lines, so the parts around them stay clean
    if L < 56 or (not skin and L < 62 and top + 23 <= y <= top + 50):
        return 'line'
    # Hair and sash share one dusty rose, so the jaw line parts them
    if y <= top + 22:
        if skin or neck:
            return 'skin'
        if s < 0.32 and v > 0.7:
            return 'ivory'
        return 'hair'
    # The hands' shaded fingers are as brown as leather: below the belt by rows, at the belt by being lighter
    hand = 0.02 <= h < 0.1 and s > 0.3 and (v > 0.6 if y < top + 45 else s > 0.5 and v > 0.5)
    # No hand or sash reaches the knees, where lit boots and trousers would pass for them
    knees = y > top + 56
    if (skin and not knees) or neck or (top + 28 <= y <= top + 56 and not lap and hand):
        return 'skin'
    if s < 0.32 and v > 0.7:
        return 'ivory'
    if rose and v > 0.4 and not knees:
        return 'sash'
    if 0.05 <= h < 0.25 and s < 0.3:
        return 'coat'
    # Trousers and boots share one brown, so the boot tops part them; a foot raised mid-step, or crossed on the lap,
    # is a yellower, fuller brown
    if lap:
        return 'legs' if s < 0.47 and v < 0.5 else 'leather'
    if y > top + 62:
        return 'leather'
    if y > top + 46:
        return 'leather' if h >= 0.033 and s >= 0.4 else 'legs'
    return 'leather'


SPEC = {
    'thin': {'ivory'},
    'eyes': [(14, 16, 11, 13), (14, 16, 5, 7)],
    'skin': (19, 8),
    'closed': {('cast-loop', 2)},
}
