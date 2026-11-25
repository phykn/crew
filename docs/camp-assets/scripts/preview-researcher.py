from pathlib import Path
from statistics import median
import math
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
out = root / 'previews'
font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 22)
small = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 14)
layouts = {'idle': (2, 2), 'walk': (3, 2), 'sit': (2, 1), 'cast-start': (2, 2), 'cast-loop': (2, 2), 'cast-end': (2, 2), 'magic': (2, 2)}
frames = {}
measurements = {}
for name, (cols, rows) in layouts.items():
    filename = 'researcher-ground-magic-v1.png' if name == 'magic' else f'researcher-{name}-v1.png'
    sheet = Image.open(root / 'candidates' / filename).convert('RGBA')
    cells = []
    for row in range(rows):
        for col in range(cols):
            cell = sheet.crop((round(col * sheet.width / cols), round(row * sheet.height / rows), round((col + 1) * sheet.width / cols), round((row + 1) * sheet.height / rows)))
            mask = cell.getchannel('A').point(lambda a: 255 if a >= 220 else 0)
            box = mask.getbbox()
            if box is None:
                raise ValueError(f'Empty frame: {name} {row} {col}')
            cell.putalpha(mask)
            cells.append((cell, box))
    height = median(box[3] - box[1] for _, box in cells)
    scale = (220 if name == 'sit' else 250) / height
    if name == 'magic':
        scale = 180 / median(box[2] - box[0] for _, box in cells)
    normalized = []
    for cell, box in cells:
        sprite = cell.crop(box)
        sprite = sprite.resize((round(sprite.width * scale), round(sprite.height * scale)), Image.Resampling.NEAREST)
        normalized.append(sprite)
    frames[name] = normalized
    measurements[name] = {'count': len(cells), 'scale': round(scale, 4), 'bounds': [list(b) for _, b in cells]}


def place_limb(canvas, part, anchor, start, end):
    dx, dy = end[0] - start[0], end[1] - start[1]
    angle = math.atan2(-dx, dy)
    co, si = math.cos(angle), math.sin(angle)
    scale = math.hypot(dx, dy) / part.height
    matrix = (co, si, anchor[0] - co * start[0] - si * start[1], -si / scale, co / scale, (si * start[0] - co * start[1]) / scale)
    layer = part.transform(canvas.size, Image.Transform.AFFINE, matrix, Image.Resampling.NEAREST)
    canvas.alpha_composite(layer)


def build_walk():
    base = frames['idle'][0]
    cx = base.width / 2
    split = round(cx)
    hip_y, knee_y, floor_y = 173, 210, 250
    parts = [(20, split + 1, 40), (split, 98, 76)]
    cycle = []
    for step in range(8):
        phase = step * math.tau / 8
        canvas = Image.new('RGBA', (153, 260))
        bob = round(abs(math.sin(phase)))
        for leg in [1, 0]:
            left, right, x = parts[leg]
            t = phase + leg * math.pi
            stride = -8 * math.cos(t)
            lift = max(0, -math.sin(t)) * 7
            hip = (x + 20, hip_y - bob)
            knee = (x + 20 + stride * 0.4 - lift * 0.25, knee_y - lift * 0.45)
            foot = (x + 20 + stride, floor_y - lift)
            thigh = base.crop((left, hip_y, right, knee_y + 3))
            shin = base.crop((left, knee_y, right, floor_y))
            place_limb(canvas, thigh, (x - left, 0), hip, knee)
            place_limb(canvas, shin, (x - left, 0), knee, foot)
        torso = base.crop((0, 0, base.width, 178))
        canvas.alpha_composite(torso, (20, -bob))
        cycle.append(canvas.crop((0, 0, 153, 250)))
    return cycle


frames['walk'] = build_walk()
walk_sheet = Image.new('RGBA', (153 * 4, 250 * 2))
for i, pose in enumerate(frames['walk']):
    walk_sheet.alpha_composite(pose, ((i % 4) * 153, (i // 4) * 250))
walk_sheet.save(root / 'candidates' / 'researcher-walk-rig-v1.png')
measurements['walk'] = {'count': 8, 'method': 'Two-bone leg preview rig from idle art; alternating support/swing halves, fixed hip/root, no per-frame recentering. Generated walk-v2 is retained as a rejected candidate, not used.'}
magic_centers = []
for rune in frames['magic']:
    bright = [(x, y) for y in range(rune.height) for x in range(rune.width) if rune.getpixel((x, y))[3] and rune.getpixel((x, y))[0] > 180 and rune.getpixel((x, y))[1] > 110]
    magic_centers.append((round(median(x for x, y in bright)), round(median(y for x, y in bright))))


def draw_frame(name, idx, label, flip=False, effect=None):
    canvas = Image.new('RGB', (440, 420), '#20271f')
    draw = ImageDraw.Draw(canvas)
    draw.text((24, 20), 'RESEARCHER / DIVINER', font=small, fill='#afa88f')
    draw.text((24, 46), label, font=font, fill='#e8dec5')
    draw.line((40, 353, 400, 353), fill='#3b4437', width=1)
    sprite = frames[name][idx]
    if flip:
        sprite = sprite.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    if effect is not None:
        rune = frames['magic'][effect]
        center = magic_centers[effect]
        canvas.paste(rune, (220 - center[0], 350 - center[1]), rune)
    canvas.paste(sprite, (220 - sprite.width // 2, 350 - sprite.height), sprite)
    draw.text((24, 386), 'Generated motion study / aligned preview', font=small, fill='#92967f')
    return canvas


sequence = []
durations = []

def append_motion(name, label, repeats, delay, flip=False, magic=False):
    for _ in range(repeats):
        for i in range(len(frames[name])):
            sequence.append(draw_frame(name, i, label, flip, i if magic else None))
            durations.append(delay)

append_motion('idle', 'Idle', 3, 200)
append_motion('walk', 'Walk / left', 3, 110)
append_motion('walk', 'Walk / right', 3, 110, flip=True)
append_motion('sit', 'Seated rest', 3, 450)
append_motion('cast-start', 'Begin chanting', 1, 230)
append_motion('cast-loop', 'Divination chant', 4, 200, magic=True)
append_motion('cast-end', 'Finish chanting', 1, 230)
append_motion('idle', 'Idle', 1, 200)
sequence[0].save(out / 'researcher-motion.gif', save_all=True, append_images=sequence[1:], duration=durations, loop=0, disposal=2, optimize=False)

walk = [draw_frame('walk', i, 'Walk / left') for i in range(len(frames['walk']))]
walk[0].save(out / 'researcher-walk.gif', save_all=True, append_images=walk[1:], duration=110, loop=0, disposal=2, optimize=False)
chant = [draw_frame('cast-loop', i, 'Divination chant', effect=i) for i in range(4)]
chant[0].save(out / 'researcher-chant.gif', save_all=True, append_images=chant[1:], duration=200, loop=0, disposal=2, optimize=False)
contact = Image.new('RGB', (880, 840))
for slot, (name, idx, label, effect) in enumerate([('idle', 0, 'Idle', None), ('walk', 0, 'Walk', None), ('sit', 0, 'Sit', None), ('cast-loop', 0, 'Chant', 0)]):
    contact.paste(draw_frame(name, idx, label, effect=effect), ((slot % 2) * 440, (slot // 2) * 420))
contact.save(out / 'researcher-contact.png')
import json
(out / 'researcher-preview.json').write_text(json.dumps({'duration_ms': sum(durations), 'frames': len(sequence), 'measurements': measurements, 'processing': 'Source PNGs unchanged. Preview alpha threshold 220, per-sheet median-height scale, per-frame bounds centered at shared floor baseline. Seated height is independently proposed. Ground magic is registered by its bright ring center at the foot anchor and drawn behind the body. Walking uses an articulated preview rig from the idle sprite; source walk sheets remain unchanged.'}, indent=2))
for path in sorted(out.glob('researcher-*.gif')):
    im = Image.open(path)
    print(path.name, im.size, 'frames:', im.n_frames, 'bytes:', path.stat().st_size)

walk_contact = Image.new('RGB', (880, 420))
for i in range(8):
    frame = draw_frame('walk', i, f'Walk / phase {i + 1}')
    walk_contact.paste(frame.resize((220, 210)), ((i % 4) * 220, (i // 4) * 210))
walk_contact.save(out / 'researcher-walk-contact.png')
