"""Finish a rendered EXR: depth haze, glow, falling snow, vignette, then Blender's AgX view transform.

usage: python3 post.py <in.exr> <out.jpg> [fog=0.5 ev=0 flakes=1 look="AgX - Medium High Contrast" glow=1 warm=0]
"""
import sys
import math
import numpy as np
import OpenEXR
from scipy.ndimage import gaussian_filter
import bpy

exr, out = sys.argv[1], sys.argv[2]
kv = dict(a.split('=', 1) for a in sys.argv[3:] if '=' in a)
FOG = float(kv.get('fog', 0.2))
AUTO = float(kv.get('auto', 0.0))
EV = float(kv.get('ev', 0.0))
GLOW = float(kv.get('glow', 1.0))

f = OpenEXR.File(exr)
rgb = z = None
for p in f.parts:
    for k, v in p.channels.items():
        if k.endswith('Combined') and rgb is None:
            rgb = np.asarray(v.pixels, np.float32)[..., :3].copy()
        if k.endswith('Depth.Z') or k.endswith('.Z'):
            z = np.asarray(v.pixels, np.float32).copy()
H, W = rgb.shape[:2]
if z is None:
    z = np.full((H, W), 50.0, np.float32)
if z.ndim == 3:
    z = z[..., 0]
sky = z > 5000
if AUTO > 0:
    rgb *= AUTO / max(1e-6, float(np.median(rgb.max(axis=2))))
z = np.where(sky, 5000, z)

# haze: tinted by the sky just above the roofs, thicker with distance
lum = rgb.max(axis=2)
if sky.sum() > 50:
    rows = np.where(sky.any(axis=1))[0]
    band = sky.copy()
    band[: int(np.percentile(rows, 55))] = False
    haze_col = np.median(rgb[band if band.sum() > 50 else sky].reshape(-1, 3), axis=0)
else:
    haze_col = np.array([0.5, 0.55, 0.65], np.float32)
fogf = 1.0 - np.exp(-np.clip(z, 0, 1500) * 0.0042 * FOG)
fogf = np.where(sky, 0.0, fogf)[..., None]
rgb = rgb * (1 - fogf) + haze_col[None, None, :] * fogf * float(kv.get('hazeb', 0.6))

# glow around bright things, two radii
lum = rgb.max(axis=2)
thr = float(np.percentile(lum, 99.2)) * 1.3
bright = rgb * np.clip((lum - thr) / (thr + 1e-6), 0, 5)[..., None]
g1 = np.dstack([gaussian_filter(bright[..., c], W / 300.0) for c in range(3)])
g2 = np.dstack([gaussian_filter(bright[..., c], W / 60.0) for c in range(3)])
rgb = rgb + (g1 * 0.45 + g2 * 0.8) * GLOW

# falling snow: soft specks, bigger and blurrier when close, hidden behind nearer things
if kv.get('flakes', '1') == '1':
    rng = np.random.default_rng(4)
    layer = np.zeros((H, W), np.float32)
    amb = float(np.percentile(lum, 85))
    k = W / 1280.0
    for depth, n, sig, amp in ((60.0, 1500, 0.55, 0.4), (22.0, 380, 0.9, 0.55), (7.0, 50, 1.8, 0.6), (2.5, 6, 4.0, 0.35)):
        pts = np.zeros((H, W), np.float32)
        n = int(n * k * k * float(kv.get('flk', 0.45)))
        ys, xs = rng.integers(0, H, n), rng.integers(0, W, n)
        vis = z[ys, xs] > depth
        pts[ys[vis], xs[vis]] = 1.0
        pts = gaussian_filter(pts, sig * k)
        pts = pts + np.roll(pts, 1, axis=0) * 0.5 + np.roll(pts, 2, axis=0) * 0.25
        layer += pts / (pts.max() + 1e-9) * amp
    rgb = rgb + layer[..., None] * amb * 1.5 * np.array([0.95, 0.98, 1.05], np.float32)

yy, xx = np.mgrid[0:H, 0:W]
r2 = ((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2
rgb = rgb * (1.0 - 0.18 * r2)[..., None]
wb = float(kv.get('warm', 0.0))
rgb = rgb * np.array([1 + 0.08 * wb, 1.0, 1 - 0.08 * wb], np.float32)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.view_settings.view_transform = 'AgX'
try:
    sc.view_settings.look = kv.get('look', 'AgX - Medium High Contrast')
except Exception as e:
    print('look not set:', e)
sc.view_settings.exposure = EV
img = bpy.data.images.new('post', W, H, alpha=False, float_buffer=True)
img.pixels.foreach_set(np.ascontiguousarray(np.dstack([rgb, np.ones((H, W), np.float32)])[::-1]).astype(np.float32).ravel())
sc.render.image_settings.file_format = 'JPEG'
sc.render.image_settings.quality = 93
img.save_render(out, scene=sc)
print('post done', out, 'haze', np.round(haze_col, 3), 'p50 lum', round(float(np.median(lum)), 3))
