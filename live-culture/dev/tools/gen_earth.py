# builds the Earth's pictures for the page from NASA's Blue Marble / Black Marble as shipped in the three-globe npm package (MIT):
#   earth-day.jpg    2048x1024  the land and sea by day (Blue Marble)
#   earth-lights.jpg 2048x1024  city lights only, pulled out of the night picture (grey, so they can be tinted and faded in at dusk)
#   earth-topo.jpg   1024x512   height of the land (for the shading of mountains when the Sun is low)
#   earth-water.jpg  1024x512   where the water is (for the Sun's glint on the sea)
# usage: python3 -I tools/gen_earth.py     (run from lc2/)
from PIL import Image, ImageFilter
import numpy as np, os
R = 'raw/npm/package/example/img/'
O = 'app/img/'
os.makedirs(O, exist_ok=True)

day = Image.open(R + 'earth-blue-marble.jpg').convert('RGB').resize((2048, 1024), Image.LANCZOS)
day.save(O + 'earth-day.jpg', quality=84, optimize=True, progressive=True)

n = np.asarray(Image.open(R + 'earth-night.jpg').convert('RGB')).astype(np.float32) / 255
r = n[..., 0]
# the night picture is tinted blue everywhere except where there are lights, so the red channel is the lights
L = np.clip((r - 0.085) / (0.40 - 0.085), 0, 1)
L = L * L * (3 - 2 * L)
# halve the size keeping the brightest of each four, so a small town does not average away
H, W = L.shape
Lm = L.reshape(H // 2, 2, W // 2, 2).max(axis=(1, 3))
im = Image.fromarray((Lm * 255).astype(np.uint8), 'L')
glow = np.asarray(im.filter(ImageFilter.GaussianBlur(1.1))).astype(np.float32) / 255
out = np.clip(0.8 * Lm + 0.55 * glow, 0, 1) ** 0.85
Image.fromarray((out * 255).astype(np.uint8), 'L').save(O + 'earth-lights.jpg', quality=84, optimize=True)

t = Image.open(R + 'earth-topology.png').convert('L')
t.resize((1024, 512), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.6)).save(O + 'earth-topo.jpg', quality=82, optimize=True)

w = Image.open(R + 'earth-water.png').convert('L').resize((1024, 512), Image.LANCZOS)
w.save(O + 'earth-water.jpg', quality=80, optimize=True)

for f in ['earth-day.jpg', 'earth-lights.jpg', 'earth-topo.jpg', 'earth-water.jpg']:
    print(f, Image.open(O + f).size, os.path.getsize(O + f))
print('lit fraction', float((out > 0.1).mean()))
