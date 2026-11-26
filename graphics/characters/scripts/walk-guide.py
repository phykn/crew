import json
import math
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
size = 256
near = '#ce4f99'
far = '#329ca6'
phases = ['near contact', 'near down', 'far passing', 'far up', 'far contact', 'far down', 'near passing', 'near up']


def project(x, y, z):
    return (128 + .82 * x - .66 * y, 223 + .26 * x + .33 * y - .93 * z)


def leg(x, step, bob):
    y = 28 * math.cos(step)
    lift = 13 * max(0, -math.sin(step))
    hip = (x, 0, 58 + bob)
    foot = (x, y, lift)
    dy, dz = y, lift - hip[2]
    length = math.hypot(dy, dz)
    bend = math.sqrt(33 ** 2 - length ** 2 / 4)
    knee = (x, y / 2 - dz / length * bend, (hip[2] + lift) / 2 + dy / length * bend)
    return [project(*p) for p in [hip, knee, foot]], foot


sheet = Image.new('RGB', (size * 4, size * 2), '#f5f1e5')
records = []
for i, name in enumerate(phases):
    pose = Image.new('RGB', (size, size), '#f5f1e5')
    draw = ImageDraw.Draw(pose)
    step = i * math.tau / 8
    bob = -2 * math.sin(step * 2)
    limbs = {}
    for side, x, phase, color in [('far', -8, step + math.pi, far), ('near', 8, step, near)]:
        points, foot = leg(x, phase, bob)
        limbs[side] = {'hip': points[0], 'knee': points[1], 'ankle': points[2], 'lift': foot[2]}
        draw.line(points, fill=color, width=9)
        toe = project(foot[0], foot[1] + 13, foot[2])
        draw.line([points[2], toe], fill=color, width=11)
        for px, py in points:
            draw.ellipse((px - 5, py - 5, px + 5, py + 5), fill=color, outline='#242c32', width=1)
    torso = [project(-19, 0, 108 + bob), project(19, 0, 108 + bob), project(14, 0, 58 + bob), project(-14, 0, 58 + bob)]
    draw.polygon(torso, fill='#b6b4a4', outline='#414c49')
    for side, x, phase, color in [('far', -21, step + math.pi, far), ('near', 21, step, near)]:
        swing = -17 * math.cos(phase)
        arm = [project(x, 0, 104 + bob), project(x, swing * .5, 84 + bob), project(x, swing, 67 + bob)]
        draw.line(arm, fill=color, width=7)
        limbs[side]['hand'] = arm[-1]
    hx, hy = project(0, 0, 139 + bob)
    draw.ellipse((hx - 27, hy - 28, hx + 27, hy + 28), fill='#e3ccac', outline='#414c49', width=2)
    draw.ellipse((hx - 18, hy - 3, hx - 13, hy + 3), fill='#414c49')
    draw.ellipse((hx + 1, hy - 3, hx + 7, hy + 3), fill='#414c49')
    draw.line((hx - 8, hy + 8, hx - 13, hy + 11), fill='#414c49', width=2)
    draw.text((12, 10), f'{i + 1}: {name}', fill='#242c32')
    draw.text((12, 26), 'PINK=near / TEAL=far', fill='#242c32')
    draw.line((26, 244, 52, 232), fill='#414c49', width=2)
    draw.text((58, 232), 'forward: lower-left', fill='#414c49')
    pose.save(root / 'reference' / f'walk-guide-{i + 1}.png')
    sheet.paste(pose, ((i % 4) * size, (i // 4) * size))
    records.append({'frame': i + 1, 'name': name, 'limbs': limbs})
sheet.save(root / 'reference' / 'walk-guide.png')
(root / 'reference' / 'walk-guide.json').write_text(json.dumps(records, indent=2) + '\n')
