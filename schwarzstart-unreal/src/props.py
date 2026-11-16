"""Street furniture and set dressing. Every prop is built around its own origin at ground level, Z up, metres."""
import math
import random
from mb import MB, box, cylinder, tube, lathe, prism_yz, prism_xz, profile


def _ball(mb, c, r, mat, seg=8, rings=4):
    prof = [(r * math.sin(math.pi * i / rings), c[2] - r * math.cos(math.pi * i / rings)) for i in range(rings + 1)]
    prof[0] = (0.0, prof[0][1])
    prof[-1] = (0.0, prof[-1][1])
    lathe(mb, c[0], c[1], prof, mat, seg=seg)


def lamp(bin_=False):
    """Post-war Berlin whip lamp: tapered steel mast, curved arm towards +X, hooded lantern."""
    mb = MB()
    lathe(mb, 0, 0, [(0.15, 0), (0.15, 0.9), (0.11, 1.05), (0.095, 1.1), (0.06, 7.6)], 'M_Lamp_Metal', seg=10)
    pts = [(0, 0, 7.6)]
    for i in range(1, 9):
        a = math.pi / 2 * i / 8
        pts.append((1.5 * (1 - math.cos(a)), 0, 7.6 + 0.9 * math.sin(a)))
    for a, b in zip(pts[:-1], pts[1:]):
        tube(mb, a, b, 0.05, 'M_Lamp_Metal', seg=8, r1=0.045)
    hx, hz = pts[-1][0], pts[-1][2]
    lathe(mb, hx + 0.38, 0, [(0.0, hz - 0.14), (0.2, hz - 0.14), (0.3, hz - 0.06), (0.26, hz + 0.04), (0.0, hz + 0.1)],
          'M_Lamp_Metal', seg=10)
    lathe(mb, hx + 0.38, 0, [(0.0, hz - 0.2), (0.14, hz - 0.18), (0.2, hz - 0.14)], 'M_Lamp_Glass', seg=10)
    if bin_:
        box(mb, -0.19, 0.19, -0.42, -0.14, 0.75, 1.3, 'M_Bin_Orange')
        box(mb, -0.2, 0.2, -0.43, -0.13, 1.3, 1.34, 'M_Lamp_Metal')
    return mb


def litfass():
    """Advertising column."""
    mb = MB()
    lathe(mb, 0, 0, [(0.74, 0), (0.74, 0.28), (0.68, 0.32)], 'M_Concrete', seg=20)
    cylinder(mb, 0, 0, 0.32, 3.0, 0.68, 0.68, 'M_Poster', seg=20, cap_top=False)
    lathe(mb, 0, 0, [(0.68, 3.0), (0.8, 3.04), (0.82, 3.14), (0.7, 3.2), (0.42, 3.42), (0.1, 3.52), (0.0, 3.7)],
          'M_Lamp_Metal', seg=20)
    return mb


def bollard():
    mb = MB()
    lathe(mb, 0, 0, [(0.09, 0), (0.09, 0.08), (0.06, 0.12), (0.055, 0.78), (0.075, 0.82), (0.075, 0.86), (0.05, 0.9),
                     (0.07, 0.96), (0.0, 1.03)], 'M_Iron_Black', seg=8)
    return mb


def cabinet(w=1.1):
    mb = MB()
    box(mb, -w / 2 - 0.03, w / 2 + 0.03, -0.2, 0.2, 0, 0.12, 'M_Concrete')
    box(mb, -w / 2, w / 2, -0.17, 0.17, 0.12, 1.2, 'M_Box_Grey')
    box(mb, -w / 2 - 0.02, w / 2 + 0.02, -0.19, 0.19, 1.2, 1.24, 'M_Box_Grey')
    box(mb, -0.01, 0.01, -0.18, -0.17, 0.16, 1.16, 'M_Lamp_Metal')
    return mb


def jersey(length=2.5):
    """Concrete road barrier, running along X."""
    mb = MB()
    prism_yz(mb, [(-0.3, 0), (0.3, 0), (0.3, 0.08), (0.16, 0.25), (0.1, 0.81), (-0.1, 0.81), (-0.16, 0.25), (-0.3, 0.08)],
             -length / 2, length / 2, 'M_Jersey_Concrete')
    return mb


def _bag(mb, x, y, z, ang, R, l=0.62, w=0.32, h=0.17):
    ca, sa = math.cos(ang), math.sin(ang)
    n = 6
    rows = []
    for i in range(n + 1):
        t = i / n
        k = math.sin(math.pi * t) ** 0.45 if 0 < t < 1 else 0.0
        hw, hh = w / 2 * (0.35 + 0.65 * k), h / 2 * (0.25 + 0.75 * k)
        cx = (t - 0.5) * l
        ring = [(cx, -hw, 0), (cx, -hw * 0.7, hh), (cx, hw * 0.7, hh), (cx, hw, 0), (cx, hw * 0.7, -hh), (cx, -hw * 0.7, -hh)]
        rows.append([(x + p[0] * ca - p[1] * sa, y + p[0] * sa + p[1] * ca, z + h / 2 + p[2]) for p in ring])
    for a, b in zip(rows[:-1], rows[1:]):
        for j in range(6):
            k2 = (j + 1) % 6
            mb.quad(a[j], b[j], b[k2], a[k2], 'M_Sandbag', smooth=True)
    mb.face(list(reversed(rows[0])), 'M_Sandbag')
    mb.face(rows[-1], 'M_Sandbag')


def sandbags(length=3.2, rows=4, seed=1):
    """Sandbag wall along X."""
    R = random.Random(seed)
    mb = MB()
    n = int(length / 0.6)
    for r in range(rows):
        off = 0.3 if r % 2 else 0.0
        cnt = n - (1 if r % 2 else 0)
        for i in range(cnt):
            x = -length / 2 + 0.31 + off + i * 0.6 + R.uniform(-0.02, 0.02)
            _bag(mb, x, R.uniform(-0.03, 0.03), r * 0.155, R.uniform(-0.08, 0.08), R)
            if r < rows - 1:
                _bag(mb, x, 0.3 + R.uniform(-0.03, 0.03), r * 0.155, R.uniform(-0.08, 0.08), R)
    return mb


def barrel(fire=True):
    mb = MB()
    prof = [(0.27, 0)]
    for z in (0.02, 0.29, 0.58, 0.86):
        prof += [(0.29, z), (0.305, z + 0.012), (0.29, z + 0.024)]
    prof += [(0.29, 0.9), (0.27, 0.9)]
    lathe(mb, 0, 0, prof, 'M_Barrel_Rust', seg=14)
    lathe(mb, 0, 0, [(0.27, 0.9), (0.26, 0.6)], 'M_Barrel_Rust', seg=14)
    if fire:
        cylinder(mb, 0, 0, 0.6, 0.62, 0.26, 0.26, 'M_Ember', seg=14, cap_top=True)
        R = random.Random(7)
        for i in range(7):
            a = R.uniform(0, 6.28)
            r = R.uniform(0.0, 0.14)
            h = R.uniform(0.35, 0.75)
            lathe(mb, r * math.cos(a), r * math.sin(a), [(0.09, 0.62), (0.11, 0.78), (0.06, 0.62 + h * 0.7), (0.0, 0.62 + h)],
                  'M_Fire', seg=5)
    return mb


def crate(w=1.0, d=0.6, h=0.5, mat='M_Crate_Green'):
    mb = MB()
    box(mb, -w / 2, w / 2, -d / 2, d / 2, 0, h, mat)
    for x in (-w / 2 + 0.06, w / 2 - 0.06):
        box(mb, x - 0.04, x + 0.04, -d / 2 - 0.015, d / 2 + 0.015, 0, h + 0.015, mat, skip='u')
    box(mb, -w / 2 - 0.01, w / 2 + 0.01, -d / 2 - 0.01, d / 2 + 0.01, h - 0.07, h + 0.01, mat, skip='u')
    return mb


def pallet():
    mb = MB()
    for y in (-0.36, 0, 0.36):
        box(mb, -0.6, 0.6, y - 0.05, y + 0.05, 0.0, 0.022, 'M_Wood_Raw')
        for x in (-0.55, 0, 0.55):
            box(mb, x - 0.07, x + 0.07, y - 0.05, y + 0.05, 0.022, 0.1, 'M_Wood_Raw', skip='tu')
        box(mb, -0.6, 0.6, y - 0.05, y + 0.05, 0.1, 0.122, 'M_Wood_Raw')
    for i in range(5):
        x = -0.55 + i * 0.275
        box(mb, x - 0.05, x + 0.05, -0.4, 0.4, 0.122, 0.144, 'M_Wood_Raw')
    return mb


def stall(seed=1, w=3.0, d=2.2):
    """Black-market stall: timber frame, sagging tarp roof, back wall, trestle table with crates. Opens towards -Y."""
    R = random.Random(seed)
    mb = MB()
    tarp = R.choice(['M_Tarp_Blue', 'M_Tarp_Green', 'M_Tarp_Orange', 'M_Tarp_Sand'])
    hf, hb = 2.45, 2.05
    for x in (-w / 2, w / 2):
        box(mb, x - 0.035, x + 0.035, -d / 2 - 0.035, -d / 2 + 0.035, 0, hf, 'M_Wood_Raw', skip='u')
        box(mb, x - 0.035, x + 0.035, d / 2 - 0.035, d / 2 + 0.035, 0, hb, 'M_Wood_Raw', skip='u')
        tube(mb, (x, -d / 2, hf - 0.03), (x, d / 2, hb - 0.03), 0.03, 'M_Wood_Raw', seg=4)
    tube(mb, (-w / 2, -d / 2, hf - 0.03), (w / 2, -d / 2, hf - 0.03), 0.03, 'M_Wood_Raw', seg=4)
    tube(mb, (-w / 2, d / 2, hb - 0.03), (w / 2, d / 2, hb - 0.03), 0.03, 'M_Wood_Raw', seg=4)
    # roof tarp with sag, overhanging the front
    nx, ny = 8, 6
    def rz(i, j):
        u, v = i / nx, j / ny
        y = -d / 2 - 0.35 + (d + 0.5) * v
        z = hf + 0.04 + (hb - hf) * ((y + d / 2) / d)
        sag = 0.16 * math.sin(math.pi * u) * math.sin(math.pi * min(1.0, max(0.0, v * 1.1)))
        return (-w / 2 - 0.12 + (w + 0.24) * u, y, z - sag)
    for i in range(nx):
        for j in range(ny):
            mb.quad(rz(i, j), rz(i + 1, j), rz(i + 1, j + 1), rz(i, j + 1), tarp, smooth=True)
            mb.quad(rz(i, j + 1), rz(i + 1, j + 1), rz(i + 1, j), rz(i, j), tarp, smooth=True)
    # back wall
    mb.quad((w / 2, d / 2 + 0.02, 0.15), (-w / 2, d / 2 + 0.02, 0.15), (-w / 2, d / 2 + 0.02, hb), (w / 2, d / 2 + 0.02, hb), tarp)
    mb.quad((-w / 2, d / 2 + 0.01, 0.15), (w / 2, d / 2 + 0.01, 0.15), (w / 2, d / 2 + 0.01, hb), (-w / 2, d / 2 + 0.01, hb), tarp)
    # table
    box(mb, -w / 2 + 0.2, w / 2 - 0.2, -d / 2 + 0.25, -d / 2 + 1.05, 0.8, 0.84, 'M_Wood_Raw')
    for x in (-w / 2 + 0.45, w / 2 - 0.45):
        box(mb, x - 0.03, x + 0.03, -d / 2 + 0.3, -d / 2 + 1.0, 0, 0.8, 'M_Wood_Raw', skip='tu')
    x = -w / 2 + 0.3
    while x < w / 2 - 0.7:
        cw = R.uniform(0.4, 0.62)
        ch = R.uniform(0.18, 0.34)
        m = R.choice(['M_Crate_Green', 'M_Wood_Raw', 'M_Board_OSB', 'M_Tarp_Sand'])
        box(mb, x, x + cw, -d / 2 + 0.35, -d / 2 + 0.95, 0.84, 0.84 + ch, m)
        x += cw + R.uniform(0.05, 0.2)
    return mb


def car(kind=0, paint='M_Car_Paint_A', seed=1, part='all'):
    """Parked car, nose towards +X. kind 0 saloon, 1 hatchback, 2 van."""
    R = random.Random(seed)
    mb = MB()
    if kind == 2:
        L, W, zr = 4.9, 1.9, 1.95
        st = [(-2.45, 0.9, 0), (-2.38, 1.8, 1), (-2.2, zr, 1), (1.0, zr, 1), (1.55, 1.25, 1), (2.2, 1.0, 0), (2.42, 0.6, 0)]
    elif kind == 1:
        L, W, zr = 4.0, 1.72, 1.46
        st = [(-2.0, 0.75, 0), (-1.92, 1.0, 0), (-1.75, zr - 0.05, 1), (0.1, zr, 1), (0.85, 0.98, 1), (1.8, 0.82, 0), (2.0, 0.55, 0)]
    else:
        L, W, zr = 4.5, 1.78, 1.42
        st = [(-2.25, 0.7, 0), (-2.15, 0.95, 0), (-1.25, 1.0, 0), (-0.65, zr - 0.03, 1), (0.45, zr, 1), (1.15, 0.98, 1),
              (2.05, 0.82, 0), (2.25, 0.55, 0)]
    zb = 0.17
    belt = 0.95
    rings = []
    for (x, zt, gh) in st:
        t = abs(x) / (L / 2)
        hw = W / 2 * (1.0 - 0.1 * t ** 3)
        top_hw = hw * (0.78 if zt > belt + 0.15 else 0.92)
        zbelt = min(belt, zt - 0.05)
        rings.append((x, [(-hw * 0.94, zb), (-hw, zb + 0.22), (-hw, zbelt), (-top_hw, zt), (0.0, zt + 0.03),
                          (top_hw, zt), (hw, zbelt), (hw, zb + 0.22), (hw * 0.94, zb)], zt > belt + 0.15))
    for (xa, ra, ga), (xb, rb, gb) in zip(rings[:-1], rings[1:]):
        if part == 'wheels':
            break
        for j in range(8):
            a0, a1, b0, b1 = (xa, ra[j][0], ra[j][1]), (xa, ra[j + 1][0], ra[j + 1][1]), (xb, rb[j][0], rb[j][1]), (xb, rb[j + 1][0], rb[j + 1][1])
            side_glass = j in (2, 5) and ga and gb
            end_glass = j in (3, 4) and (ga != gb)
            m = 'M_Car_Glass' if (side_glass or end_glass) else paint
            mb.quad(a0, b0, b1, a1, m, smooth=True)
    if part == 'snow':
        snow = MB()
        sr = [(x, [(rg[j][0] * 1.05, rg[j][1] + (0.07 if j in (3, 5) else (0.11 if j == 4 else -0.06))) for j in (2, 3, 4, 5, 6)]) for x, rg, _ in rings]
        sr[0] = (sr[0][0] - 0.05, sr[0][1])
        sr[-1] = (sr[-1][0] + 0.05, sr[-1][1])
        for (xa, ra), (xb, rb) in zip(sr[:-1], sr[1:]):
            for j in range(4):
                snow.quad((xa, ra[j][0], ra[j][1]), (xb, rb[j][0], rb[j][1]), (xb, rb[j + 1][0], rb[j + 1][1]),
                          (xa, ra[j + 1][0], ra[j + 1][1]), 'M_Snow', smooth=True)
        return snow
    if part != 'wheels':
        mb.face([(rings[0][0], p[0], p[1]) for p in rings[0][1]], paint, smooth=True)
        mb.face([(rings[-1][0], p[0], p[1]) for p in reversed(rings[-1][1])], paint, smooth=True)
    if part == 'body':
        return mb
    for wx in (-L / 2 + 0.85, L / 2 - 0.85):
        for sy in (-1, 1):
            tube(mb, (wx, sy * (W / 2 - 0.22), 0.3), (wx, sy * (W / 2 + 0.0), 0.3), 0.31, 'M_Rubber', seg=12)
            cap = [(wx + 0.31 * math.cos(a * math.pi / 6), sy * (W / 2 + 0.0), 0.3 + 0.31 * math.sin(a * math.pi / 6)) for a in range(12)]
            mb.face(cap if sy < 0 else cap[::-1], 'M_Rubber')
    return mb


def tram():
    """Stranded two-car tram, nose towards +X. Boxy 1980s articulated type in yellow."""
    mb = MB()

    def body(x0, x1, nose0=False, nose1=False):
        W, zf, zw0, zw1, zt = 1.1, 0.42, 1.25, 2.3, 3.05
        sec = [(-W + 0.06, zf), (-W, zf + 0.25), (-W, zw0), (-W + 0.03, zw1), (-W + 0.1, zt - 0.2), (-W + 0.35, zt),
               (W - 0.35, zt), (W - 0.1, zt - 0.2), (W - 0.03, zw1), (W, zw0), (W, zf + 0.25), (W - 0.06, zf)]
        xs = [x0, x1]
        rings = [(x0, sec, 1.0), (x1, sec, 1.0)]
        if nose0:
            rings = [(x0 - 0.75, [(p[0] * 0.8, zf + (p[1] - zf) * 0.94) for p in sec], 0.8)] + rings
        if nose1:
            rings = rings + [(x1 + 0.75, [(p[0] * 0.8, zf + (p[1] - zf) * 0.94) for p in sec], 0.8)]
        for (xa, ra, _), (xb, rb, _) in zip(rings[:-1], rings[1:]):
            for j in range(11):
                band = j in (2, 8)
                m = 'M_Car_Glass' if band else ('M_Tram_Grey' if j in (4, 5, 6) else 'M_Tram_Yellow')
                if j in (0, 10):
                    m = 'M_Tram_Grey'
                mb.quad((xa, ra[j][0], ra[j][1]), (xb, rb[j][0], rb[j][1]), (xb, rb[j + 1][0], rb[j + 1][1]),
                        (xa, ra[j + 1][0], ra[j + 1][1]), m)
            mb.quad((xa, ra[11][0], ra[11][1]), (xb, rb[11][0], rb[11][1]), (xb, rb[0][0], rb[0][1]), (xa, ra[0][0], ra[0][1]),
                    'M_Tram_Grey')
        # end faces: lower panel, windscreen, header
        for (x, ring, k), flip in ((rings[0], True), (rings[-1], False)):
            def f(idx, m):
                pts = [(x, ring[i][0], ring[i][1]) for i in idx]
                mb.face(pts if flip else pts[::-1], m)
            f([0, 1, 2, 9, 10, 11], 'M_Tram_Yellow')
            f([2, 3, 8, 9], 'M_Car_Glass')
            f([3, 4, 5, 6, 7, 8], 'M_Tram_Yellow')
        # window posts and doors along the sides
        n = int((x1 - x0) / 1.45)
        for i in range(n + 1):
            xp = x0 + (x1 - x0) * i / n
            for sy in (-1, 1):
                box(mb, xp - 0.05, xp + 0.05, sy * W - 0.012, sy * W + 0.012, zw0, zw1 + 0.02, 'M_Tram_Yellow', skip='tu')
        for xd in (x0 + (x1 - x0) * 0.22, x0 + (x1 - x0) * 0.72):
            box(mb, xd - 0.65, xd + 0.65, -W - 0.015, -W + 0.0, zf + 0.06, zw1 + 0.25, 'M_Tram_Grey', skip='b')
            box(mb, xd - 0.58, xd - 0.04, -W - 0.02, -W - 0.015, zw0 - 0.2, zw1 + 0.15, 'M_Car_Glass', skip='b')
            box(mb, xd + 0.04, xd + 0.58, -W - 0.02, -W - 0.015, zw0 - 0.2, zw1 + 0.15, 'M_Car_Glass', skip='b')
        # bogies and roof boxes
        for xb in (x0 + 1.6, x1 - 1.6):
            box(mb, xb - 1.0, xb + 1.0, -0.85, 0.85, 0.05, zf + 0.02, 'M_Tram_Grey')
        box(mb, x0 + 1.0, x0 + 3.2, -0.7, 0.7, zt, zt + 0.28, 'M_Tram_Grey', skip='u')
        box(mb, x1 - 3.0, x1 - 1.2, -0.6, 0.6, zt, zt + 0.22, 'M_Tram_Grey', skip='u')
        return zt

    zt = body(-9.2, -0.45, nose0=True)
    body(0.45, 9.2, nose1=True)
    box(mb, -0.45, 0.45, -1.0, 1.0, 0.5, 2.95, 'M_Rubber', skip='lr')          # bellows
    # head lamps
    for sy in (-0.6, 0.6):
        box(mb, 9.95, 9.97, sy - 0.11, sy + 0.11, 0.85, 1.0, 'M_Lamp_Glass', skip='l')
        box(mb, -9.97, -9.95, sy - 0.11, sy + 0.11, 0.85, 1.0, 'M_Lamp_Glass', skip='r')
    # pantograph, raised to the wire
    px = 4.0
    for sy in (-0.35, 0.35):
        tube(mb, (px - 0.9, sy, zt + 0.3), (px, sy * 0.6, zt + 1.3), 0.025, 'M_Tram_Grey', seg=5)
        tube(mb, (px, sy * 0.6, zt + 1.3), (px - 0.5, sy * 0.3, zt + 2.35), 0.02, 'M_Tram_Grey', seg=5)
    tube(mb, (px - 0.5, -0.75, zt + 2.38), (px - 0.5, 0.75, zt + 2.38), 0.025, 'M_Tram_Grey', seg=5)
    return mb


def tree(seed=1, height=11.0):
    """Bare winter street tree (lime)."""
    R = random.Random(seed)
    mb = MB()

    def branch(p, d, ln, r, depth):
        q = (p[0] + d[0] * ln, p[1] + d[1] * ln, p[2] + d[2] * ln)
        r1 = r * 0.72
        tube(mb, p, q, r, 'M_Bark', seg=7 if depth < 2 else (5 if depth < 4 else 3), r1=r1)
        if depth >= 7 or r1 < 0.008:
            return
        n = 2 if R.random() < 0.55 else 3
        for i in range(n):
            spread = R.uniform(0.3, 0.62) if depth > 0 else R.uniform(0.25, 0.45)
            az = R.uniform(0, 2 * math.pi)
            # rotate d by 'spread' towards a random perpendicular
            ax = (math.cos(az), math.sin(az), 0.0)
            px = (ax[0] - d[0] * (ax[0] * d[0] + ax[1] * d[1]), ax[1] - d[1] * (ax[0] * d[0] + ax[1] * d[1]),
                  -d[2] * (ax[0] * d[0] + ax[1] * d[1]))
            pl = math.sqrt(px[0] ** 2 + px[1] ** 2 + px[2] ** 2) or 1.0
            px = (px[0] / pl, px[1] / pl, px[2] / pl)
            nd = (d[0] * math.cos(spread) + px[0] * math.sin(spread), d[1] * math.cos(spread) + px[1] * math.sin(spread),
                  d[2] * math.cos(spread) + px[2] * math.sin(spread) + 0.12)
            nl = math.sqrt(nd[0] ** 2 + nd[1] ** 2 + nd[2] ** 2)
            nd = (nd[0] / nl, nd[1] / nl, nd[2] / nl)
            branch(q, nd, ln * R.uniform(0.68, 0.84), r1 * (0.92 if i == 0 else R.uniform(0.6, 0.8)), depth + 1)

    lathe(mb, 0, 0, [(0.34, 0), (0.24, 0.35), (0.2, 1.2)], 'M_Bark', seg=8)
    branch((0, 0, 1.2), (R.uniform(-0.04, 0.04), R.uniform(-0.04, 0.04), 1.0), height * 0.22, 0.2, 0)
    return mb


def fernsehturm():
    """Berlin TV tower as a distant backdrop, origin at its base. 368 m."""
    mb = MB()
    lathe(mb, 0, 0, [(16.0, 0), (10.5, 12), (7.6, 40), (6.0, 90), (5.0, 150), (4.6, 197)], 'M_Tower_Concrete', seg=24)
    c, r = 213.0, 16.0
    prof = []
    for i in range(1, 12):
        a = math.pi * i / 12
        prof.append((r * math.sin(a), c - r * math.cos(a)))
    lathe(mb, 0, 0, [(4.6, 197.0)] + prof + [(4.4, 229.0)], 'M_Tower_Steel', seg=28, smooth=False)
    lathe(mb, 0, 0, [(15.6, 209.5), (16.3, 210.0), (16.3, 212.4), (15.9, 212.9)], 'M_Car_Glass', seg=28, smooth=False)
    lathe(mb, 0, 0, [(4.4, 229), (4.4, 236), (6.0, 236.5), (6.0, 238), (3.6, 238.5), (3.6, 246), (4.6, 246.5), (4.6, 248),
                     (2.6, 248.5), (2.6, 251)], 'M_Tower_Concrete', seg=16)
    z, r0 = 251.0, 2.4
    i = 0
    while z < 366:
        z1 = min(368.0, z + 13.0)
        r1 = 2.4 - 1.6 * (z1 - 251.0) / 117.0
        lathe(mb, 0, 0, [(r0, z), (r1, z1)], 'M_Tower_Red' if i % 2 == 0 else 'M_Tower_White', seg=10)
        z, r0 = z1, r1
        i += 1
    for zz, rr in ((238.2, 6.1), (248.2, 4.7), (300.0, 1.9), (366.0, 0.9)):
        for k in range(4):
            a = k * math.pi / 2
            _ball(mb, (rr * math.cos(a), rr * math.sin(a), zz), 0.7, 'M_Beacon_Red', seg=6, rings=3)
    return mb


def festoon(p0, p1, sag=0.6, n=14, bulb='M_Bulb_Warm'):
    """String of lights between two points. Returns (mesh, bulb positions)."""
    mb = MB()
    pts = []
    for i in range(n + 1):
        t = i / n
        pts.append((p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t,
                    p0[2] + (p1[2] - p0[2]) * t - sag * 4 * t * (1 - t)))
    for a, b in zip(pts[:-1], pts[1:]):
        tube(mb, a, b, 0.012, 'M_Wire', seg=3)
    bulbs = []
    for p in pts[1:-1]:
        _ball(mb, (p[0], p[1], p[2] - 0.09), 0.055, bulb, seg=6, rings=3)
        bulbs.append((p[0], p[1], p[2] - 0.09))
    return mb, bulbs


def beam(r0=0.6, r1=7.0, h=420.0, mat='M_Beam_Amber'):
    """Light column into the sky: two open, slightly flaring cones, a wide soft one and a tight core."""
    mb = MB()
    seg = 24
    for ra, rb in ((r0, r1), (r0 * 0.35, r1 * 0.3)):
        for i in range(seg):
            a0, a1 = 2 * math.pi * i / seg, 2 * math.pi * (i + 1) / seg
            mb.quad((ra * math.cos(a0), ra * math.sin(a0), 0.5), (ra * math.cos(a1), ra * math.sin(a1), 0.5),
                    (rb * math.cos(a1), rb * math.sin(a1), h), (rb * math.cos(a0), rb * math.sin(a0), h), mat, smooth=True)
    return mb


def bush(seed=1):
    """Snow-covered shrub: a lumpy mound with a few bare twigs."""
    R = random.Random(seed)
    mb = MB()
    rx, h = R.uniform(0.7, 1.4), R.uniform(0.55, 1.05)
    seg, rings = 10, 5
    pts = []
    for j in range(rings + 1):
        a = math.pi / 2 * j / rings
        row = []
        for i in range(seg):
            b = 2 * math.pi * i / seg
            k = 1.0 + 0.22 * math.sin(3 * b + seed) + R.uniform(-0.1, 0.1)
            row.append((rx * k * math.cos(a) * math.cos(b), rx * k * 0.85 * math.cos(a) * math.sin(b), h * math.sin(a) * (0.9 + 0.2 * R.random())))
        pts.append(row)
    for j in range(rings):
        for i in range(seg):
            k = (i + 1) % seg
            mb.quad(pts[j][i], pts[j][k], pts[j + 1][k], pts[j + 1][i], 'M_Bush_Snow', smooth=True)
    for i in range(7):
        a = R.uniform(0, 6.28)
        r = R.uniform(0.1, rx * 0.7)
        tube(mb, (r * math.cos(a), r * math.sin(a), h * 0.5), (r * 1.5 * math.cos(a), r * 1.5 * math.sin(a), h + R.uniform(0.2, 0.6)),
             0.012, 'M_Bark', seg=3, r1=0.004)
    return mb


def floodlight():
    """Work light on a tripod, shining towards +X and slightly down."""
    mb = MB()
    for k in range(3):
        a = k * 2 * math.pi / 3 + 0.5
        tube(mb, (0.55 * math.cos(a), 0.55 * math.sin(a), 0), (0, 0, 1.2), 0.02, 'M_Iron_Black', seg=5)
    tube(mb, (0, 0, 1.1), (0, 0, 2.3), 0.022, 'M_Iron_Black', seg=6)
    tube(mb, (0, -0.42, 2.3), (0, 0.42, 2.3), 0.02, 'M_Iron_Black', seg=5)
    for y in (-0.26, 0.26):
        box(mb, -0.07, 0.05, y - 0.19, y + 0.19, 2.33, 2.6, 'M_Iron_Black', skip='r')
        mb.quad((0.05, y - 0.17, 2.35), (0.05, y + 0.17, 2.35), (0.05, y + 0.17, 2.58), (0.05, y - 0.17, 2.58), 'M_Flood_White')
    return mb


def generator():
    mb = MB()
    box(mb, -0.45, 0.45, -0.3, 0.3, 0.12, 0.62, 'M_Bin_Orange')
    box(mb, -0.5, 0.5, -0.33, 0.33, 0.0, 0.05, 'M_Iron_Black')
    for x in (-0.48, 0.48):
        for y in (-0.31, 0.31):
            tube(mb, (x, y, 0), (x, y, 0.72), 0.018, 'M_Iron_Black', seg=5)
    for y in (-0.31, 0.31):
        tube(mb, (-0.48, y, 0.72), (0.48, y, 0.72), 0.018, 'M_Iron_Black', seg=5)
    box(mb, -0.3, 0.1, -0.2, 0.2, 0.62, 0.74, 'M_Iron_Black')
    return mb


def banner(w=7.0, h=1.6, mat='M_Flag_Red'):
    """Cloth banner hanging in the XZ plane, top edge at z = 0, with a slight belly."""
    mb = MB()
    nx, nz = 12, 4
    def p(i, j):
        u, v = i / nx, j / nz
        return (-w / 2 + w * u, 0.18 * math.sin(math.pi * u) * v + 0.05 * math.sin(u * 9.0) * v, -h * v - 0.25 * math.sin(math.pi * u) * (1 - v * 0.3))
    for i in range(nx):
        for j in range(nz):
            a, b, c, d = p(i, j + 1), p(i + 1, j + 1), p(i + 1, j), p(i, j)
            mb.quad(a, b, c, d, mat, smooth=True)
            mb.quad(d, c, b, a, mat, smooth=True)
    return mb


if __name__ == '__main__':
    for nm, f in (('lamp', lamp), ('litfass', litfass), ('bollard', bollard), ('cabinet', cabinet), ('jersey', jersey),
                  ('sandbags', sandbags), ('barrel', barrel), ('crate', crate), ('pallet', pallet), ('stall', stall),
                  ('car', car), ('tram', tram), ('tree', tree), ('tower', fernsehturm), ('beam', beam),
                  ('flood', floodlight), ('gen', generator), ('banner', banner)):
        print(nm, f().ntris())
    print('festoon', festoon((0, 0, 4), (10, 0, 4))[0].ntris())
