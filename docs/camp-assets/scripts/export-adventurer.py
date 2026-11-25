import json
from pathlib import Path
from statistics import median
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
cfg = json.loads((root / 'adventurer-export.json').read_text())
cell = cfg['cell']
out = root / 'exports' / 'adventurer'
preview = root / 'previews'
out.mkdir(parents=True, exist_ok=True)
font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 18)
small = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 13)


def measure(im):
    alpha = im.getchannel('A').point(lambda a: 255 if a >= cfg['alpha_threshold'] else 0)
    box = alpha.getbbox()
    if box is None:
        raise ValueError('Empty character cell')
    head = alpha.crop((0, box[1], im.width, round(box[1] + (box[3] - box[1]) * .28))).getbbox()
    return {'box': box, 'head_width': head[2] - head[0], 'head_x': (head[0] + head[2]) / 2}


def export_motion(name, spec, target):
    logical = spec.get('cell', cell)
    source = Image.open(root / spec.get('source', f'candidates/adventurer-{name}-v1.png')).convert('RGBA')
    cols, rows = spec['grid']
    cells = []
    for row in range(rows):
        for col in range(cols):
            bounds = (col * source.width / cols, row * source.height / rows, (col + 1) * source.width / cols, (row + 1) * source.height / rows)
            size = (round(source.width / cols), round(source.height / rows))
            cells.append(source.transform(size, Image.Transform.EXTENT, bounds, Image.Resampling.NEAREST))
    if name == 'magic':
        centers = []
        boxes = []
        for im in cells:
            box = im.getchannel('A').point(lambda a: 255 if a >= 100 else 0).getbbox()
            if box is None:
                raise ValueError('Empty magic frame')
            cx = (box[0] + box[2]) / 2
            radius = (box[2] - box[0]) * .22
            points = [(x, y) for y in range(im.height) for x in range(round(cx - radius), round(cx + radius)) if im.getpixel((x, y))[3] > 100 and max(im.getpixel((x, y))[:3]) > 180]
            if not points:
                raise ValueError('Empty magic frame')
            centers.append((cx, median(y for x, y in points)))
            boxes.append(box)
        scale = cfg['effect_width'] / median(b[2] - b[0] for b in boxes)
        dx = cfg['effect_center'][0] - median(p[0] for p in centers) * scale
        dy = cfg['effect_center'][1] - median(p[1] for p in centers) * scale
        measures = [{'box': b, 'emission_center': p} for b, p in zip(boxes, centers)]
    else:
        measures = [measure(im) for im in cells]
        scale = target['head'] / median(m['head_width'] for m in measures) if name == 'sit' else target['height'] / median(m['box'][3] - m['box'][1] for m in measures)
        dx = cell / 2 - median(m['head_x'] for m in measures) * scale
        dy = cfg['ground_y'] - median(m['box'][3] for m in measures) * scale
    frames = []
    strip = Image.new('RGBA', (logical * len(cells), logical))
    for i, im in enumerate(cells):
        x, y = dx, dy
        if name == 'magic':
            x = cfg['effect_center'][0] - centers[i][0] * scale
            y = cfg['effect_center'][1] - centers[i][1] * scale
        if spec.get('register_grid'):
            column = [m for j, m in enumerate(measures) if j % cols == i % cols]
            row = [m for j, m in enumerate(measures) if j // cols == i // cols]
            x = cell / 2 - median(m['head_x'] for m in column) * scale
            y = cfg['ground_y'] - median(m['box'][3] for m in row) * scale
        pose = im.transform((logical, logical), Image.Transform.AFFINE, (1 / scale, 0, -x / scale, 0, 1 / scale, -y / scale), Image.Resampling.NEAREST)
        if name != 'magic':
            pose.putalpha(pose.getchannel('A').point(lambda a: 255 if a >= cfg['alpha_threshold'] else 0))
        else:
            pose.putalpha(pose.getchannel('A').point(lambda a: a if a >= cfg['effect_alpha_floor'] else 0))
        frames.append(pose)
        strip.alpha_composite(pose, (i * logical, 0))
        measures[i]['logical_bounds'] = pose.getbbox()
        measures[i]['offset'] = [x, y]
    strip.save(out / f'{name}.png')
    return frames, {'source_size': source.size, 'source_alpha': source.getchannel('A').getextrema(), 'cell_size': logical, 'frames': len(frames), 'scale': scale, 'offset': [dx, dy], 'measurements': measures}


def draw_stage(name, index, frames, flip=False, effect=None, background='#20271f'):
    stage = Image.new('RGBA', (440, 440), background)
    d = ImageDraw.Draw(stage)
    label = name.upper() + (' / RIGHT' if flip else '')
    d.text((24, 18), 'ADVENTURER / WARD MAGE', font=small, fill='#b9b6a5')
    d.text((24, 42), label, font=font, fill='#e8dec5')
    d.line((32, 345, 408, 345), fill='#3b4437', width=1)
    if effect is not None:
        source = frames['magic'][effect]
        fx = source.resize((source.width * 3, source.height * 3), Image.Resampling.NEAREST)
        if flip:
            fx = fx.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        stage.alpha_composite(fx, (220 - cfg['effect_center'][0] * 3, 345 - cfg['effect_center'][1] * 3))
    if name != 'magic':
        pose = frames[name][index]
        if flip:
            pose = pose.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        stage.alpha_composite(pose.resize((cell * 3, cell * 3), Image.Resampling.NEAREST), (76, 78))
    return stage.convert('RGB')


def save_gif(path, images, durations, loop=True):
    options = {'loop': 0} if loop else {}
    images[0].save(path, save_all=True, append_images=images[1:], duration=durations, disposal=2, optimize=False, **options)
    with Image.open(path) as gif:
        total = 0
        for i in range(gif.n_frames):
            gif.seek(i)
            total += gif.info['duration']
        return {'size': gif.size, 'frames': gif.n_frames, 'duration_ms': total}


def main():
    master = Image.open(root / cfg['master']).convert('RGBA')
    master_measure = measure(master)
    target = {'head': master_measure['head_width'] * cell / max(master.size), 'height': (master_measure['box'][3] - master_measure['box'][1]) * cell / max(master.size)}
    frames = {}
    report = {'cell': cell, 'targets': target, 'registration': 'One uniform scale per source sheet, matching median standing height or seated head width to master. Planted-pose grid column origins align median head centers and row origins align planted boot baselines. Walk uses one shared offset to retain stride depth. No per-pose scaling, silhouette fitting, anisotropic stretch or limb reconstruction.', 'motions': {}, 'gifs': {}}
    for name, spec in cfg['motions'].items():
        frames[name], report['motions'][name] = export_motion(name, spec, target)
    frames['cast-start'][0] = frames['idle'][0].copy()
    frames['cast-loop'][0] = frames['cast-start'][3].copy()
    frames['cast-end'][0] = frames['cast-start'][3].copy()
    frames['cast-end'][3] = frames['idle'][0].copy()
    report['boundary_reuse'] = {'cast-start:1': 'idle:1', 'cast-loop:1': 'cast-start:4', 'cast-end:1': 'cast-start:4', 'cast-end:4': 'idle:1'}
    for name in ['cast-start', 'cast-loop', 'cast-end']:
        strip = Image.new('RGBA', (cell * len(frames[name]), cell))
        for i, pose in enumerate(frames[name]):
            strip.alpha_composite(pose, (i * cell, 0))
        strip.save(out / f'{name}.png')
        for i, pose in enumerate(frames[name]):
            report['motions'][name]['measurements'][i]['export_bounds'] = pose.getbbox()
    for name, spec in cfg['motions'].items():
        images = [draw_stage(name, i, frames, effect=i if name in ['cast-loop', 'magic'] else None) for i in range(len(frames[name]))]
        report['gifs'][name] = save_gif(preview / f'adventurer-{name}.gif', images, spec['durations'], loop=spec.get('loop', True))
    images = []
    durations = []
    for name, flip in [('idle', False), ('walk', False), ('walk', True), ('sit', False), ('cast-start', False), ('cast-loop', False), ('cast-end', False), ('idle', False)]:
        spec = cfg['motions'][name]
        for repeat in range(spec['repeat']):
            for i, duration in enumerate(spec['durations']):
                images.append(draw_stage(name, i, frames, flip=flip, effect=i if name == 'cast-loop' else None))
                durations.append(duration)
    report['gifs']['all'] = save_gif(preview / 'adventurer-motion.gif', images, durations)
    contact = Image.new('RGB', (cell * 3 * 4, (cell * 3 + 30) * len(frames)), '#20271f')
    d = ImageDraw.Draw(contact)
    for row, (name, poses) in enumerate(frames.items()):
        for col, pose in enumerate(poses):
            im = pose.resize((cell * 3, cell * 3), Image.Resampling.NEAREST)
            contact.paste(im, (col * cell * 3, row * (cell * 3 + 30)), im)
            d.text((col * cell * 3 + 8, row * (cell * 3 + 30) + cell * 3), f'{name} {col + 1}', font=small, fill='#e8dec5')
    contact.save(preview / 'adventurer-contact.png')
    contact.crop((0, 3 * (cell * 3 + 30), cell * 3 * 4, 6 * (cell * 3 + 30))).save(preview / 'adventurer-cast-contact.png')
    cast = Image.new('RGB', (cell * 3 * 4, cell * 3), '#e8e5d7')
    for i, (name, frame) in enumerate([('idle', 0), ('cast-start', 3), ('cast-loop', 0), ('cast-end', 3)]):
        im = frames[name][frame].resize((cell * 3, cell * 3), Image.Resampling.NEAREST)
        cast.paste(im, (i * cell * 3, 0), im)
    cast.save(preview / 'adventurer-boundaries-light.png')
    draw_stage('cast-loop', 0, frames, effect=0).save(preview / 'adventurer-ground-preview.png')
    (out / 'manifest.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'motions': list(frames), 'gifs': report['gifs']}))


if __name__ == '__main__':
    main()
