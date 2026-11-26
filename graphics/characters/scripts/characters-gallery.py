import hashlib
import json
import re
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
roles = ['interpreter', 'conductor', 'researcher', 'coder', 'writer', 'reviewer', 'proofreader', 'tester', 'images', 'librarian']
packs = {role: 'adventurer' if role == 'coder' else role for role in roles}
specs = json.loads((root / 'conductor-export.json').read_text())['motions']
font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 17)
shared = root / 'exports/shared/ward-circle.png'
shared_hash = hashlib.sha256(shared.read_bytes()).hexdigest()
assert shared_hash == json.loads(shared.with_suffix('.json').read_text())['sha256']
source = (root.parents[1] / 'src/shared.ts').read_text()
members = source.split('export const MEMBERS:')[1].split('};')[0]
assert set(re.findall(r'^  (\w+):', members, re.M)) == set(roles)
effect = Image.open(shared).convert('RGBA')
effects = [effect.crop((i * 128, 0, (i + 1) * 128, 128)) for i in range(4)]
frames = {}
report = {'shared_effect': 'shared/ward-circle.png', 'shared_sha256': shared_hash, 'roles': {}, 'body_frames': 0}
for role, pack in packs.items():
    frames[role] = {}
    for name, spec in specs.items():
        if name == 'magic':
            continue
        path = root / f'exports/{pack}/{name}.png'
        if not path.exists():
            continue
        sheet = Image.open(path).convert('RGBA')
        count = len(spec['durations'])
        assert sheet.size == (96 * count, 96), (role, name, sheet.size)
        poses = [sheet.crop((i * 96, 0, (i + 1) * 96, 96)) for i in range(count)]
        for pose in poses:
            box = pose.getbbox()
            assert box and 0 < box[0] < box[2] < 96 and 0 < box[1] < box[3] < 96, (role, name, box)
            assert set(pose.getchannel('A').tobytes()) <= {0, 255}, (role, name)
        frames[role][name] = poses
        report['body_frames'] += count
    quality = json.loads((root / f'exports/{pack}/manifest.json').read_text()).get('quality_issues', {})
    missing = [name for name in specs if name != 'magic' and name not in frames[role]]
    report['roles'][role] = {'pack': pack, 'manifest': f'{pack}/manifest.json', 'actions': list(frames[role]), 'missing': missing, 'quality_issues': quality, 'complete': not missing and not quality, 'frames': sum(map(len, frames[role].values()))}
report['complete'] = all(info['complete'] for info in report['roles'].values())


def draw_frame(name, index, flip=False, light=False):
    canvas = Image.new('RGBA', (1200, 600), '#e8e5d7' if light else '#20271f')
    for n, role in enumerate(roles):
        tile = Image.new('RGBA', (240, 300), '#e8e5d7' if light else '#20271f')
        ink = '#38392f' if light else '#e8dec5'
        d = ImageDraw.Draw(tile)
        d.text((16, 15), role.upper(), fill=ink, font=font)
        d.line((12, 220, 228, 220), fill='#b9baa9' if light else '#3b4437')
        available = name in frames[role]
        if name == 'cast-loop' and available:
            fx = effects[index].resize((256, 256), Image.Resampling.NEAREST)
            tile.alpha_composite(fx, (-8, 48))
        pose = frames[role][name][index] if available else frames[role]['idle'][0]
        if flip:
            pose = pose.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        tile.alpha_composite(pose.resize((192, 192), Image.Resampling.NEAREST), (24, 42))
        label = name + (' / right' if flip else '') if available else 'PENDING: ' + name
        if available and name in report['roles'][role]['quality_issues']:
            label += ' / REVIEW'
        d.text((16, 272), label, fill=ink, font=font)
        canvas.alpha_composite(tile, ((n % 5) * 240, (n // 5) * 300))
    return canvas.convert('RGB')


def save_gif(path, images, durations):
    images[0].save(path, save_all=True, append_images=images[1:], duration=durations, disposal=2, loop=0, optimize=False)
    with Image.open(path) as gif:
        duration = 0
        for i in range(gif.n_frames):
            gif.seek(i)
            duration += gif.info['duration']
        return {'size': gif.size, 'frames': gif.n_frames, 'duration_ms': duration}


preview = root / 'previews'
draw_frame('idle', 0).save(preview / 'characters.png')
draw_frame('cast-loop', 0).save(preview / 'characters-working.png')
draw_frame('cast-loop', 0, light=True).save(preview / 'characters-light.png')
report['working_gif'] = save_gif(preview / ('characters-working.gif' if report['complete'] else 'characters-working-progress.gif'), [draw_frame('cast-loop', i) for i in range(4)], specs['cast-loop']['durations'])
images = []
durations = []
for name, flip in [('idle', False), ('walk', False), ('walk', True), ('sit', False), ('cast-start', False), ('cast-loop', False), ('cast-end', False), ('idle', False)]:
    spec = specs[name]
    for repeat in range(spec['repeat']):
        for i, duration in enumerate(spec['durations']):
            images.append(draw_frame(name, i, flip=flip))
            durations.append(duration)
report['preview_gif'] = save_gif(preview / ('characters-motion.gif' if report['complete'] else 'characters-progress.gif'), images, durations)
(root / 'exports/characters.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'roles': len(roles), 'complete_roles': sum(info['complete'] for info in report['roles'].values()), 'body_frames': report['body_frames'], 'complete': report['complete'], 'preview_gif': report['preview_gif']}))
