"""Path-traced preview stills of the street kit (Cycles, CPU).

usage: python3 render.py <bookmark|overview> <out.jpg> [w h samples] [key=value ...]
keys:  elev az (sun), ev (exposure stops), fog (0..1), lens, flakes (0/1), raw (1 = no post)
"""
import sys
import json
import math
import time
import numpy as np
sys.path.insert(0, '/home/claude/work/unreal-kit/src')
import bpy
import bl_util as B

KIT = '/home/claude/work/unreal-kit'
args = sys.argv[1:]
book, out = args[0], args[1]
nums = [a for a in args[2:] if '=' not in a]
kv = dict(a.split('=') for a in args[2:] if '=' in a)
W, H, SPP = (int(nums[0]), int(nums[1]), int(nums[2])) if len(nums) >= 3 else (1280, 720, 32)
ELEV, AZ = float(kv.get('elev', 4.0)), float(kv.get('az', 250.0))
EV = float(kv.get('ev', 0.0))
FOG = float(kv.get('fog', 0.5))
RAW = kv.get('raw', '0') == '1'

t0 = time.time()
bpy.ops.wm.open_mainfile(filepath=KIT + '/tmp/street.blend')
sc = bpy.context.scene
layout = json.load(open(KIT + '/tmp/layout_preview.json'))
B.setup_cycles(sc, W, H, samples=SPP)
B.sky_world(sc, elev_deg=ELEV, az_deg=AZ, strength=1.0, dust=float(kv.get('dust', 2.5)), air=1.0)


def scene_pos(p):
    return (p[0] / 100.0, -p[1] / 100.0, p[2] / 100.0)


# ---- practical lights
def point(name, pos, color, power, radius=0.25):
    ld = bpy.data.lights.new(name, 'POINT')
    ld.color = color
    ld.energy = power
    ld.shadow_soft_size = radius
    ob = bpy.data.objects.new(name, ld)
    ob.location = pos
    sc.collection.objects.link(ob)
    return ob

LS = float(kv.get('lights', 1.0))
for i, f in enumerate(layout['lights']['fires']):
    p = scene_pos(f['pos'])
    point('Fire%d' % i, (p[0], p[1], p[2] + 0.25), (1.0, 0.42, 0.12), 900.0 * LS, 0.3)
for i, f in enumerate(layout['lights']['bulbs']):
    pts = f['points']
    for j in range(1, len(pts), 4):
        p = scene_pos(pts[j])
        point('Bulb%d_%d' % (i, j), (p[0], p[1], p[2] - 0.1), (1.0, 0.62, 0.3), 55.0 * LS, 0.06)
for i, f in enumerate(layout['lights']['floods']):
    p = scene_pos(f['pos'])
    ld = bpy.data.lights.new('Flood%d' % i, 'SPOT')
    ld.energy = 3500.0 * LS
    ld.color = (0.82, 0.9, 1.0)
    ld.spot_size = math.radians(95)
    ld.spot_blend = 0.5
    ld.shadow_soft_size = 0.15
    ob = bpy.data.objects.new('Flood%d' % i, ld)
    yaw = -math.radians(f['yaw_deg'])
    ob.location = (p[0] + 0.3 * math.cos(yaw), p[1] + 0.3 * math.sin(yaw), p[2])
    ob.rotation_euler = (math.radians(90 + f['pitch_deg']), 0, yaw - math.pi / 2)
    sc.collection.objects.link(ob)

# ---- camera
if book == 'overview':
    B.camera(sc, (-150, -150, 120), (10, -5, 0), lens=float(kv.get('lens', 30)))
else:
    bm = [b for b in layout['bookmarks'] if b['name'] == book][0]
    pos, look = list(bm['scene_pos']), list(bm['scene_look'])
    for k, i in (('cz', 2),):
        if k in kv:
            pos[i] = float(kv[k])
    cam = B.camera(sc, pos, look, lens=float(kv.get('lens', bm['lens_mm'])))
    if 'dof' in kv:
        cam.data.dof.use_dof = True
        cam.data.dof.focus_distance = float(kv['dof'])
        cam.data.dof.aperture_fstop = 2.8

sc.view_settings.view_transform = 'AgX'
try:
    sc.view_settings.look = kv.get('look', 'AgX - Medium High Contrast')
except Exception as e:
    print('look not set', e)
sc.view_settings.exposure = EV

vl = sc.view_layers[0]
vl.use_pass_z = True
vl.use_pass_mist = False

if RAW:
    sc.render.filepath = out
    sc.render.image_settings.file_format = 'JPEG'
    sc.render.image_settings.quality = 90
    bpy.ops.render.render(write_still=True)
    print('rendered raw in %.0fs' % (time.time() - t0))
    sys.exit(0)

exr = out.rsplit('.', 1)[0] + '.exr'
sc.render.filepath = exr
try:
    sc.render.image_settings.media_type = 'MULTI_LAYER_IMAGE'
except Exception as e:
    print('media_type', e)
sc.render.image_settings.file_format = 'OPEN_EXR_MULTILAYER'
sc.render.image_settings.color_depth = '32'
bpy.ops.render.render(write_still=True)
print('rendered in %.0fs' % (time.time() - t0))

import subprocess
subprocess.run([sys.executable, '/home/claude/work/unreal-kit/src/post.py', exr, out] + ['%s=%s' % kv_ for kv_ in kv.items()] + ['elev=%s' % ELEV], check=False)
