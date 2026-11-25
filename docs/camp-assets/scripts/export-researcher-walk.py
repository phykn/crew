import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
source = Image.open(root / 'candidates' / 'researcher-guided-walk-v1.png').convert('RGBA')
cell = 96
selected = [0, 2, 4, 6]
frames = []
measurements = []
sheet = Image.new('RGBA', (cell * len(selected), cell))
contact = Image.new('RGB', (cell * len(selected) * 3, cell * 3 + 30), '#20271f')
draw = ImageDraw.Draw(contact)
font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 16)
for index, i in enumerate(selected):
    col, row = i % 4, i // 4
    bounds = (col * source.width / 4, row * source.height / 2, (col + 1) * source.width / 4, (row + 1) * source.height / 2)
    pose = source.transform((cell, cell), Image.Transform.EXTENT, bounds, Image.Resampling.NEAREST)
    pose.putalpha(pose.getchannel('A').point(lambda a: 255 if a >= 220 else 0))
    sheet.alpha_composite(pose, (index * cell, 0))
    stage = Image.new('RGBA', (384, 384), '#20271f')
    stage.alpha_composite(pose.resize(stage.size, Image.Resampling.NEAREST))
    frames.append(stage.convert('RGB'))
    enlarged = pose.resize((cell * 3, cell * 3), Image.Resampling.NEAREST)
    contact.paste(enlarged, (index * cell * 3, 0), enlarged)
    draw.text((index * cell * 3 + 12, cell * 3), f'{index + 1} (source {i + 1})', font=font, fill='#e8dec5')
    measurements.append({'frame': i + 1, 'source_bounds': bounds, 'alpha_bounds': pose.getbbox()})
out = root / 'previews'
sheet.save(root / 'candidates' / 'researcher-walk-final.png')
contact.save(out / 'researcher-walk-final-contact.png')
frames[0].save(out / 'researcher-walk-final.gif', save_all=True, append_images=frames[1:], duration=220, loop=0, disposal=2, optimize=False)
with Image.open(out / 'researcher-walk-final.gif') as gif:
    assert gif.n_frames == len(selected)
    duration = 0
    for i in range(gif.n_frames):
        gif.seek(i)
        duration += gif.info['duration']
assert source.width / 4 == source.height / 2
assert all(r['alpha_bounds'] is not None for r in measurements)
report = {'source_size': source.size, 'cell_size': cell, 'frames': len(frames), 'source_frames': [i + 1 for i in selected], 'duration_ms': duration, 'alpha_threshold': 220, 'registration': 'Uniform source-cell transform; no per-pose bounding-box fitting, limb rigging or recentering.', 'measurements': measurements}
(out / 'researcher-walk-final.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({k: v for k, v in report.items() if k != 'measurements'}))
