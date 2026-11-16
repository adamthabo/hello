"""Berlin street-front buildings with real depth, built from the game's lot records.

A lot record is [x1, z1, x2, z2, depth, height, style, upper_floors, district, seed] in map metres.
Each building is built in its own frame: X along the frontage (left to right seen from the street),
Y into the lot, Z up, facade plane at y = 0, pavement at z = 0.

Styles used on this street:  0 stucco Altbau   1 stripped / weathered Altbau   2 brick   4 1990s stone infill
"""
import math
import random
from mb import (MB, box, wall, reveal, profile, prism_xz, prism_yz, tri_xz, arc_pts, arch_fill,
                arch_reveal, cylinder, tube, poly_x)

G_H = 4.4          # ground floor height used by the game data
BAND0 = 0.62       # top of the plinth
BAND = 0.44        # rustication band module
EG_HEAD = BAND0 + 6 * BAND      # 3.26  head of shop windows and doors
EG_GATE = BAND0 + 7 * BAND      # 3.70  crown of carriage gateways
EG_TOP = BAND0 + 8 * BAND       # 4.14  underside of the string course

PLASTER = ['M_Plaster_Ochre', 'M_Plaster_Sand', 'M_Plaster_Cream', 'M_Plaster_GreyGreen',
           'M_Plaster_Rose', 'M_Plaster_WarmGrey', 'M_Plaster_BlueGrey', 'M_Plaster_Ivory']
WEATHERED = ['M_Plaster_Weathered_Grey', 'M_Plaster_Weathered_Beige', 'M_Plaster_Weathered_Green']
BRICK = ['M_Brick_Red', 'M_Brick_Red', 'M_Brick_Yellow']
DOORS = ['M_Door_Green', 'M_Door_Oxblood', 'M_Door_Oak', 'M_Door_Blue']
SIGNS = ['M_Sign_Green', 'M_Sign_Red', 'M_Sign_Navy', 'M_Sign_Black', 'M_Sign_Cream', 'M_Sign_Mustard']
CURTAINS = ['M_Curtain_White', 'M_Curtain_White', 'M_Curtain_Cream', 'M_Blind_Grey']

STYLES = {
    0: dict(name='stucco', wall=PLASTER, trim='M_Stucco_Light', plinth='M_Stone_Granite', rust=True,
            frames=['M_Frame_White', 'M_Frame_White', 'M_Frame_White', 'M_Frame_Brown'], aw=3.3,
            balcony=0.75, boarded=0.0, lit=0.07, cornice='rich'),
    1: dict(name='stripped', wall=WEATHERED, trim=None, plinth='M_Plaster_Weathered_Dark', rust=False,
            frames=['M_Frame_White', 'M_Frame_Brown', 'M_Frame_White'], aw=3.2,
            balcony=0.3, boarded=0.2, lit=0.05, cornice='plain'),
    2: dict(name='brick', wall=BRICK, trim='M_Stone_Sand', plinth='M_Stone_Granite', rust=False,
            frames=['M_Frame_Green', 'M_Frame_White', 'M_Frame_Brown'], aw=3.1,
            balcony=0.3, boarded=0.05, lit=0.07, cornice='corbel'),
    4: dict(name='modern', wall=['M_Stone_Ashlar_Pale'], trim=None, plinth='M_Stone_Granite', rust=False,
            frames=['M_Frame_Anthracite'], aw=3.6, balcony=0.0, boarded=0.0, lit=0.05, cornice='flat'),
}


# ------------------------------------------------------------------ small parts

def solid(x0, x1, cuts):
    """Intervals of [x0, x1] left after removing the (a, b) cuts."""
    out, x = [], x0
    for a, b in sorted(cuts):
        if a - x > 1e-4:
            out.append((x, min(a, x1)))
        x = max(x, b)
    if x1 - x > 1e-4:
        out.append((x, x1))
    return out


def ring_frame(mb, a0, a1, b0, b1, y, t, d, mat):
    """Thin rectangular frame (a sash): four front strips and the four inner faces."""
    mb.quad((a0, y, b0), (a1, y, b0), (a1, y, b0 + t), (a0, y, b0 + t), mat)
    mb.quad((a0, y, b1 - t), (a1, y, b1 - t), (a1, y, b1), (a0, y, b1), mat)
    mb.quad((a0, y, b0 + t), (a0 + t, y, b0 + t), (a0 + t, y, b1 - t), (a0, y, b1 - t), mat)
    mb.quad((a1 - t, y, b0 + t), (a1, y, b0 + t), (a1, y, b1 - t), (a1 - t, y, b1 - t), mat)
    reveal(mb, a0 + t, a1 - t, b0 + t, b1 - t, d, mat, y=y)


def interior(mb, x0, x1, z0, z1, y, depth, R, lit=None, curtains=True, mat='M_Interior_Dark'):
    """Dark room box behind a pane, with optional curtains and a lit back wall."""
    reveal(mb, x0, x1, z0, z1, depth, mat, y=y)
    back = lit if lit else mat
    mb.quad((x0, y + depth, z0), (x1, y + depth, z0), (x1, y + depth, z1), (x0, y + depth, z1), back)
    if curtains:
        cm = R.choice(CURTAINS)
        mode = R.random()
        yc = y + 0.05
        w = x1 - x0
        if mode < 0.22:                                   # fully drawn
            mb.quad((x0, yc, z0), (x1, yc, z0), (x1, yc, z1), (x0, yc, z1), cm)
        elif mode < 0.80:                                 # pulled to the sides
            a = w * R.uniform(0.14, 0.34)
            b = w * R.uniform(0.14, 0.34)
            mb.quad((x0, yc, z0), (x0 + a, yc, z0), (x0 + a, yc, z1), (x0, yc, z1), cm)
            mb.quad((x1 - b, yc, z0), (x1, yc, z0), (x1, yc, z1), (x1 - b, yc, z1), cm)
            if R.random() < 0.3:                          # half-height net curtain
                zt = z0 + (z1 - z0) * R.uniform(0.35, 0.55)
                mb.quad((x0, yc + 0.02, z0), (x1, yc + 0.02, z0), (x1, yc + 0.02, zt), (x0, yc + 0.02, zt),
                        'M_Curtain_Net')


def window(mb, x0, x1, z0, z1, y, R, frame, lit=None, cross=True, curtains=True, depth=0.55):
    """Casement window with transom and mullion, glass, and a room behind it."""
    fw, fd = 0.06, 0.07
    h = z1 - z0
    xc = (x0 + x1) * 0.5
    box(mb, x0, x0 + fw, y, y + fd, z0, z1, frame, skip='bltu')
    box(mb, x1 - fw, x1, y, y + fd, z0, z1, frame, skip='brtu')
    box(mb, x0 + fw, x1 - fw, y, y + fd, z1 - fw, z1, frame, skip='btlr')
    box(mb, x0 + fw, x1 - fw, y, y + fd, z0, z0 + fw + 0.02, frame, skip='bulr')
    lights = []
    if cross and h > 1.5:
        zt = z0 + h * 0.69
        box(mb, x0 + fw, x1 - fw, y - 0.014, y + fd, zt - 0.045, zt + 0.045, frame, skip='blr')
        box(mb, xc - 0.04, xc + 0.04, y - 0.006, y + fd, z0 + fw + 0.02, zt - 0.045, frame, skip='btu')
        box(mb, xc - 0.03, xc + 0.03, y, y + fd, zt + 0.045, z1 - fw, frame, skip='btu')
        lights = [(x0 + fw, xc - 0.04, z0 + fw + 0.02, zt - 0.045), (xc + 0.04, x1 - fw, z0 + fw + 0.02, zt - 0.045),
                  (x0 + fw, xc - 0.03, zt + 0.045, z1 - fw), (xc + 0.03, x1 - fw, zt + 0.045, z1 - fw)]
    elif cross:
        box(mb, xc - 0.04, xc + 0.04, y - 0.006, y + fd, z0 + fw + 0.02, z1 - fw, frame, skip='btu')
        lights = [(x0 + fw, xc - 0.04, z0 + fw + 0.02, z1 - fw), (xc + 0.04, x1 - fw, z0 + fw + 0.02, z1 - fw)]
    for a0, a1, b0, b1 in lights:
        ring_frame(mb, a0, a1, b0, b1, y + 0.018, 0.038, 0.03, frame)
    yg = y + 0.05
    mb.quad((x0 + fw, yg, z0 + fw), (x1 - fw, yg, z0 + fw), (x1 - fw, yg, z1 - fw), (x0 + fw, yg, z1 - fw), 'M_Glass')
    interior(mb, x0, x1, z0, z1, y + fd, depth, R, lit=lit, curtains=curtains)


def window_modern(mb, x0, x1, z0, z1, y, R, frame, lit=None):
    """Aluminium window: one fixed pane and a narrow opening light."""
    fw, fd = 0.05, 0.06
    box(mb, x0, x0 + fw, y, y + fd, z0, z1, frame, skip='bltu')
    box(mb, x1 - fw, x1, y, y + fd, z0, z1, frame, skip='brtu')
    box(mb, x0 + fw, x1 - fw, y, y + fd, z1 - fw, z1, frame, skip='btlr')
    box(mb, x0 + fw, x1 - fw, y, y + fd, z0, z0 + fw, frame, skip='bulr')
    xs = x0 + (x1 - x0) * (0.3 if R.random() < 0.5 else 0.7)
    box(mb, xs - 0.03, xs + 0.03, y, y + fd, z0 + fw, z1 - fw, frame, skip='btu')
    yg = y + 0.04
    mb.quad((x0 + fw, yg, z0 + fw), (x1 - fw, yg, z0 + fw), (x1 - fw, yg, z1 - fw), (x0 + fw, yg, z1 - fw), 'M_Glass')
    interior(mb, x0, x1, z0, z1, y + fd, 0.6, R, lit=lit, curtains=R.random() < 0.5)


def boarded(mb, x0, x1, z0, z1, y, R):
    """Opening closed with sheets and planks."""
    if R.random() < 0.5:
        box(mb, x0, x1, y, y + 0.02, z0, z1, 'M_Board_OSB', skip='blrtu')
    else:
        z = z0
        while z < z1 - 0.05:
            hgt = min(R.uniform(0.16, 0.28), z1 - z)
            box(mb, x0 - 0.0, x1, y + R.uniform(0, 0.012), y + 0.035, z, z + hgt - 0.02, 'M_Board_Plank', skip='blr')
            z += hgt
        mb.quad((x0, y + 0.05, z0), (x1, y + 0.05, z0), (x1, y + 0.05, z1), (x0, y + 0.05, z1), 'M_Interior_Dark')
        return
    for zz in (z0 + (z1 - z0) * 0.25, z0 + (z1 - z0) * 0.72):
        box(mb, x0, x1, y - 0.025, y, zz - 0.05, zz + 0.05, 'M_Board_Plank', skip='blr')


def sill(mb, x0, x1, z, mat, out=0.14, th=0.09, brackets=True):
    profile(mb, x0, x1, [(0, z - th), (-0.05, z - th), (-0.05, z - th + 0.025), (-out, z - 0.035), (-out, z), (0, z)], mat)
    if brackets:
        for xb in (x0 + 0.08, x1 - 0.2):
            prism_yz(mb, [(0, z - th - 0.2), (-0.03, z - th - 0.2), (-0.1, z - th), (0, z - th)], xb, xb + 0.12, mat)


def surround(mb, x0, x1, z0, z1, hood, mat, R, band=0.15, proj=0.035):
    """Stucco architrave round an opening with an optional hood above it."""
    box(mb, x0 - band, x0, -proj, 0, z0, z1, mat, skip='brtu')
    box(mb, x1, x1 + band, -proj, 0, z0, z1, mat, skip='bltu')
    box(mb, x0 - band, x1 + band, -proj, 0, z1, z1 + band, mat, skip='b')
    xc = (x0 + x1) * 0.5
    if hood == 'keystone':
        prism_xz(mb, [(xc - 0.09, z1 - 0.04), (xc + 0.09, z1 - 0.04), (xc + 0.13, z1 + band + 0.06),
                      (xc - 0.13, z1 + band + 0.06)], -0.085, 0, mat)
        return z1 + band + 0.06
    if hood in ('straight', 'triangle', 'segment'):
        zf = z1 + band
        box(mb, x0 - band, x1 + band, -0.02, 0, zf, zf + 0.2, mat, skip='btu')
        for xb in (x0 - band, x1 + band - 0.11):
            prism_yz(mb, [(0, zf - 0.12), (-0.05, zf - 0.1), (-0.15, zf + 0.2), (0, zf + 0.2)], xb, xb + 0.11, mat)
        zc = zf + 0.2
        xa, xb = x0 - band - 0.1, x1 + band + 0.1
        profile(mb, xa, xb, [(0, zc), (-0.06, zc), (-0.06, zc + 0.035), (-0.17, zc + 0.075), (-0.17, zc + 0.11),
                             (-0.14, zc + 0.13), (0, zc + 0.13)], mat)
        top = zc + 0.13
        if hood == 'triangle':
            ph = (xb - xa) * 0.17
            t = 0.085
            prism_xz(mb, [(xa, top), (xc, top + ph), (xc, top + ph + t), (xa - 0.03, top + t * 0.6)], -0.19, 0, mat)
            prism_xz(mb, [(xb, top), (xb + 0.03, top + t * 0.6), (xc, top + ph + t), (xc, top + ph)], -0.19, 0, mat)
            tri_xz(mb, (xa + 0.05, top), (xb - 0.05, top), (xc, top + ph), -0.03, mat)
            return top + ph + t
        if hood == 'segment':
            rise = (xb - xa) * 0.15
            inner = arc_pts(xa, xb, top, rise, 8)
            outer = arc_pts(xa - 0.03, xb + 0.03, top + 0.03, rise + 0.07, 8)
            for i in range(8):
                prism_xz(mb, [inner[i], inner[i + 1], outer[i + 1], outer[i]], -0.19, 0, mat)
            mb.face([(p[0], -0.03, p[1]) for p in reversed(inner)], mat)
            return top + rise + 0.1
        return top
    return z1 + band


def arc_band(mb, x0, x1, zs, rise, t, y0, y1, mat, n=8):
    """Voussoir band above a segmental arch."""
    inner = arc_pts(x0, x1, zs, rise, n)
    w = x1 - x0
    r = (w * w / 4 + rise * rise) / (2 * rise)
    xc, zc = (x0 + x1) * 0.5, zs + rise - r
    outer = [(xc + (p[0] - xc) * (r + t) / r, zc + (p[1] - zc) * (r + t) / r) for p in inner]
    for i in range(n):
        prism_xz(mb, [inner[i], inner[i + 1], outer[i + 1], outer[i]], y0, y1, mat)


def railing(mb, pts, z, mat='M_Iron_Black', h=1.0, step=0.115):
    """Iron railing along a horizontal polyline of (x, y) points."""
    for (ax, ay), (bx, by) in zip(pts[:-1], pts[1:]):
        dx, dy = bx - ax, by - ay
        ln = math.hypot(dx, dy)
        if ln < 1e-3:
            continue
        for zz, r in ((z + h, 0.022), (z + 0.09, 0.016), (z + h - 0.12, 0.012)):
            tube(mb, (ax, ay, zz), (bx, by, zz), r, mat, seg=4)
        n = max(1, int(round(ln / step)))
        for i in range(1, n):
            px, py = ax + dx * i / n, ay + dy * i / n
            box(mb, px - 0.007, px + 0.007, py - 0.007, py + 0.007, z + 0.09, z + h - 0.12, mat, skip='tu')
    for px, py in pts:
        box(mb, px - 0.02, px + 0.02, py - 0.02, py + 0.02, z, z + h + 0.03, mat, skip='u')


def balcony(mb, xl, xr, z, mat, depth=1.05):
    """Slab on brackets with an iron railing. z is the top of the slab."""
    box(mb, xl, xr, -depth, 0, z - 0.16, z, mat, skip='b')
    profile(mb, xl - 0.03, xr + 0.03, [(-depth + 0.02, z - 0.22), (-depth - 0.03, z - 0.22), (-depth - 0.05, z - 0.16),
                                       (-depth + 0.02, z - 0.16)], mat)
    n = 2 if xr - xl < 3.6 else 3
    for i in range(n):
        xb = xl + 0.18 + (xr - xl - 0.36 - 0.16) * i / (n - 1)
        prism_yz(mb, [(0, z - 0.72), (-0.1, z - 0.68), (-0.22, z - 0.45), (-depth + 0.2, z - 0.24),
                      (-depth + 0.12, z - 0.16), (0, z - 0.16)], xb, xb + 0.16, mat)
    e = 0.05
    railing(mb, [(xl + e, 0), (xl + e, -depth + e), (xr - e, -depth + e), (xr - e, 0)], z)


def shopfront(mb, x0, x1, z0, z1, R, frame, shutter=False, door=False, y=0.22):
    """Timber or metal shopfront inside a masonry opening."""
    w = x1 - x0
    if shutter:
        box(mb, x0, x1, 0.04, 0.3, z1 - 0.3, z1, 'M_Shutter_Box', skip='bt')
        box(mb, x0, x0 + 0.05, 0.1, 0.2, z0, z1 - 0.3, 'M_Shutter_Box', skip='bltu')
        box(mb, x1 - 0.05, x1, 0.1, 0.2, z0, z1 - 0.3, 'M_Shutter_Box', skip='brtu')
        mb.quad((x0 + 0.05, 0.15, z0), (x1 - 0.05, 0.15, z0), (x1 - 0.05, 0.15, z1 - 0.3), (x0 + 0.05, 0.15, z1 - 0.3),
                'M_Shutter')
        return
    fw = 0.075
    zt = z1 - 0.55                                           # transom under the fanlight band
    box(mb, x0, x0 + fw, y, y + 0.09, z0, z1, frame, skip='bltu')
    box(mb, x1 - fw, x1, y, y + 0.09, z0, z1, frame, skip='brtu')
    box(mb, x0 + fw, x1 - fw, y, y + 0.09, z1 - fw, z1, frame, skip='btlr')
    box(mb, x0 + fw, x1 - fw, y - 0.02, y + 0.09, zt - 0.05, zt + 0.05, frame, skip='blr')
    cuts = []
    if door:
        dw = 0.98
        xd = x0 + fw + (w - 2 * fw - dw) * (0.0 if R.random() < 0.5 else 1.0)
        yd = y + 0.35                                         # door set back in a small lobby
        box(mb, xd, xd + 0.07, yd, yd + 0.06, z0, zt - 0.05, frame, skip='btu')
        box(mb, xd + dw - 0.07, xd + dw, yd, yd + 0.06, z0, zt - 0.05, frame, skip='btu')
        box(mb, xd + 0.07, xd + dw - 0.07, yd, yd + 0.06, z0, z0 + 0.3, frame, skip='bulr')
        box(mb, xd + 0.07, xd + dw - 0.07, yd, yd + 0.06, zt - 0.17, zt - 0.05, frame, skip='btlr')
        mb.quad((xd + 0.07, yd + 0.03, z0 + 0.3), (xd + dw - 0.07, yd + 0.03, z0 + 0.3),
                (xd + dw - 0.07, yd + 0.03, zt - 0.17), (xd + 0.07, yd + 0.03, zt - 0.17), 'M_Glass')
        box(mb, xd + dw - 0.16, xd + dw - 0.12, yd - 0.05, yd, z0 + 0.95, z0 + 1.35, 'M_Metal_Brass', skip='b')
        for xs in (xd, xd + dw):                              # lobby side panes
            if x0 + fw + 0.05 < xs < x1 - fw - 0.05:
                box(mb, xs - 0.03, xs + 0.03, y, yd + 0.06, z0, zt - 0.05, frame, skip='tu')
        cuts.append((xd, xd + dw))
        mb.quad((xd, y, z0), (xd + dw, y, z0), (xd + dw, yd, z0), (xd, yd, z0), 'M_Stone_Granite')
    riser = 0.0 if z0 > 0.4 else 0.5
    for a, b in solid(x0 + fw, x1 - fw, cuts):
        if b - a < 0.12:
            continue
        zb = z0
        if riser:
            box(mb, a, b, y - 0.01, y + 0.09, z0, z0 + riser, frame, skip='bulr')
            zb = z0 + riser
        n = max(1, int(math.ceil((b - a) / 1.55)))
        for i in range(1, n):
            xm = a + (b - a) * i / n
            box(mb, xm - 0.03, xm + 0.03, y, y + 0.09, zb, zt - 0.05, frame, skip='btu')
        mb.quad((a, y + 0.05, zb), (b, y + 0.05, zb), (b, y + 0.05, zt - 0.05), (a, y + 0.05, zt - 0.05), 'M_Glass')
    n = max(2, int(round((w - 2 * fw) / 0.9)))
    for i in range(1, n):
        xm = x0 + fw + (w - 2 * fw) * i / n
        box(mb, xm - 0.02, xm + 0.02, y, y + 0.09, zt + 0.05, z1 - fw, frame, skip='btu')
    mb.quad((x0 + fw, y + 0.05, zt + 0.05), (x1 - fw, y + 0.05, zt + 0.05), (x1 - fw, y + 0.05, z1 - fw),
            (x0 + fw, y + 0.05, z1 - fw), 'M_Glass')
    # shop interior
    yi = y + 0.09
    reveal(mb, x0, x1, z0, z1, 2.2, 'M_Interior_Shop', y=yi)
    mb.quad((x0, yi + 2.2, z0), (x1, yi + 2.2, z0), (x1, yi + 2.2, z1), (x0, yi + 2.2, z1), 'M_Interior_Shop')
    if R.random() < 0.6:                                      # counter or shelving seen through the glass
        zc = z0 + (0.0 if riser else -0.5)
        box(mb, x0 + 0.3, x1 - 0.3, yi + 1.2, yi + 1.7, zc + 0.5, zc + 1.45, 'M_Interior_Shop', skip='bu')


def house_door(mb, x0, x1, z0, z1, R, doorm, y=0.4):
    """Double-leaf timber house door with a fanlight."""
    fw = 0.09
    zt = z0 + 2.32
    box(mb, x0, x0 + fw, y, y + 0.1, z0, z1, doorm, skip='bltu')
    box(mb, x1 - fw, x1, y, y + 0.1, z0, z1, doorm, skip='brtu')
    box(mb, x0 + fw, x1 - fw, y, y + 0.1, z1 - fw, z1, doorm, skip='btlr')
    box(mb, x0 + fw, x1 - fw, y - 0.03, y + 0.1, zt, zt + 0.11, doorm, skip='blr')
    xc = (x0 + x1) * 0.5
    yl = y + 0.03
    for a, b in ((x0 + fw, xc - 0.012), (xc + 0.012, x1 - fw)):
        mb.quad((a, yl, z0), (b, yl, z0), (b, yl, zt), (a, yl, zt), doorm)
        pw = b - a
        for pz0, pz1 in ((z0 + 0.14, z0 + 0.72), (z0 + 0.84, z0 + 1.62), (z0 + 1.74, zt - 0.12)):
            box(mb, a + 0.12, b - 0.12, yl - 0.022, yl, pz0, pz1, doorm, skip='b')
            box(mb, a + 0.2, b - 0.2, yl - 0.034, yl - 0.022, pz0 + 0.08, pz1 - 0.08, doorm, skip='b')
    box(mb, xc - 0.03, xc + 0.03, yl - 0.03, yl, z0, zt, doorm, skip='bu')
    box(mb, xc + 0.06, xc + 0.1, yl - 0.07, yl, z0 + 1.0, z0 + 1.22, 'M_Metal_Brass', skip='b')
    # fanlight
    n = 3
    for i in range(1, n):
        xm = x0 + fw + (x1 - x0 - 2 * fw) * i / n
        box(mb, xm - 0.02, xm + 0.02, y, y + 0.1, zt + 0.11, z1 - fw, doorm, skip='btu')
    mb.quad((x0 + fw, y + 0.05, zt + 0.11), (x1 - fw, y + 0.05, zt + 0.11), (x1 - fw, y + 0.05, z1 - fw),
            (x0 + fw, y + 0.05, z1 - fw), 'M_Glass')
    mb.quad((x0 + fw, y + 0.3, zt + 0.11), (x1 - fw, y + 0.3, zt + 0.11), (x1 - fw, y + 0.3, z1 - fw),
            (x0 + fw, y + 0.3, z1 - fw), 'M_Interior_Dark')


def gate(mb, x0, x1, zs, rise, R, doorm, y=0.5):
    """Double timber gate filling an arched carriage entrance."""
    pts = arc_pts(x0, x1, zs, rise, 12)
    poly = [(x0, 0.0), (x1, 0.0)] + list(reversed(pts))
    prism_xz(mb, poly, y, y + 0.02, doorm, sides=False)
    xc = (x0 + x1) * 0.5
    box(mb, xc - 0.04, xc + 0.04, y - 0.035, y, 0.0, zs + rise - 0.02, doorm, skip='bu')
    for a, b in ((x0 + 0.1, xc - 0.1), (xc + 0.1, x1 - 0.1)):
        for pz0, pz1 in ((0.2, 1.0), (1.15, zs - 0.15)):
            if pz1 - pz0 > 0.3:
                box(mb, a, b, y - 0.025, y, pz0, pz1, doorm, skip='b')
    box(mb, x0, x1, y - 0.045, y, zs - 0.06, zs + 0.06, doorm, skip='b')
    for xs, sg in ((x0, 1), (x1, -1)):                         # wheel-guard stones
        cylinder(mb, xs + sg * 0.02, -0.02, 0, 0.46, 0.15, 0.09, 'M_Stone_Granite', seg=8)


# ------------------------------------------------------------------ ground floor

def eg_layout(n, R, S):
    """Decide what each ground-floor bay holds. Returns a list of bay kinds and the shop units."""
    if n == 1:
        return [R.choice(['shopdoor', 'door'])], [(0, 0)]
    kinds = ['shopwin'] * n
    d = n // 2 if R.random() < 0.55 else R.choice([0, n - 1])
    kinds[d] = 'door'
    if n >= 5 and R.random() < 0.4:
        g = 0 if d != 0 else n - 1
        if abs(g - d) > 1:
            kinds[g] = 'gate'
    units, i = [], 0
    while i < n:
        if kinds[i] == 'shopwin':
            j = i
            while j + 1 < n and kinds[j + 1] == 'shopwin' and j - i < 2:
                j += 1
            units.append((i, j))
            kinds[R.randint(i, j)] = 'shopdoor'
            i = j + 1
        else:
            i += 1
    return kinds, units


def ground_floor(mb, L, cx, a, S, R, P, wallm, trim, doorm, info):
    n = len(cx)
    kinds, units = eg_layout(n, R, S)
    st = S['name']
    proj = 0.03 if S['rust'] else 0.0
    plinth_h = BAND0 if st != 'brick' else 0.9
    arch = 0.2 if st == 'brick' else 0.0
    ops = []
    for i, k in enumerate(kinds):
        c = cx[i]
        if k == 'door':
            w = min(1.7, a - 1.2)
            ops.append(dict(k=k, x0=c - w / 2, x1=c + w / 2, z0=0.16, z1=EG_HEAD, rise=arch, i=i))
        elif k == 'gate':
            w = min(2.8, a - 0.5)
            rise = w / 2 if R.random() < 0.5 else 0.55
            ops.append(dict(k=k, x0=c - w / 2, x1=c + w / 2, z0=0.0, z1=EG_GATE, rise=rise, i=i))
        else:
            w = min(3.0, a - (0.75 if st != 'brick' else 1.0))
            z0 = plinth_h if k == 'shopwin' else 0.1
            ops.append(dict(k=k, x0=c - w / 2, x1=c + w / 2, z0=z0, z1=EG_HEAD, rise=arch, i=i))
    # --- plinth
    pm = S['plinth']
    pp = proj + 0.03
    for xa, xb in solid(0, L, [(o['x0'], o['x1']) for o in ops if o['z0'] < plinth_h - 0.05]):
        mb.quad((xa, -pp, 0), (xb, -pp, 0), (xb, -pp, plinth_h), (xa, -pp, plinth_h), pm)
        mb.quad((xa, -pp, plinth_h), (xb, -pp, plinth_h), (xb, -proj, plinth_h), (xa, -proj, plinth_h), pm)
    for o in ops:                                              # plinth returns at openings that reach the ground
        if o['z0'] < plinth_h - 0.05:
            for xs in (o['x0'], o['x1']):
                mb.quad((xs, -pp, o['z0']), (xs, -proj, o['z0']), (xs, -proj, plinth_h), (xs, -pp, plinth_h), pm) \
                    if xs == o['x0'] else \
                    mb.quad((xs, -proj, o['z0']), (xs, -pp, o['z0']), (xs, -pp, plinth_h), (xs, -proj, plinth_h), pm)
    # --- wall
    rects = [(o['x0'], o['x1'], o['z0'], o['z1']) for o in ops]
    if S['rust']:
        wall(mb, 0, L, plinth_h, EG_TOP, rects, wallm, y=0.0)             # groove plane
        z = plinth_h
        while z < EG_TOP - 0.01:
            zb0, zb1 = z + 0.03, z + BAND
            cuts = [(r[0], r[1]) for r in rects if r[2] < zb1 - 0.01 and r[3] > zb0 + 0.01]
            for xa, xb in solid(0, L, cuts):
                mb.quad((xa, -proj, zb0), (xb, -proj, zb0), (xb, -proj, zb1), (xa, -proj, zb1), wallm)
                mb.quad((xa, 0, zb0), (xb, 0, zb0), (xb, -proj, zb0), (xa, -proj, zb0), wallm)
                mb.quad((xa, -proj, zb1), (xb, -proj, zb1), (xb, 0, zb1), (xa, 0, zb1), wallm)
            z += BAND
    else:
        wall(mb, 0, L, plinth_h, EG_TOP, rects, wallm, y=0.0)
    # --- openings
    shut = {}
    signs = {}
    framem = R.choice(['M_Shopframe_Dark', 'M_Shopframe_Dark', 'M_Shopframe_Wood', 'M_Shopframe_Cream'])
    for (i0, i1) in units:
        s = R.random() < (0.55 if st == 'stripped' else 0.42)
        col = R.choice(SIGNS)
        fr = R.choice(['M_Shopframe_Dark', 'M_Shopframe_Dark', 'M_Shopframe_Wood', 'M_Shopframe_Cream'])
        for i in range(i0, i1 + 1):
            shut[i] = s
            signs[i] = (col, fr)
    for o in ops:
        x0, x1, z0, z1, k = o['x0'], o['x1'], o['z0'], o['z1'], o['k']
        rise = o['rise']
        zs = z1 - rise
        if rise > 0:
            pts = arch_fill(mb, x0, x1, zs, rise, -proj, wallm)
        if k == 'gate':
            reveal(mb, x0, x1, z0, zs, 0.5 + proj, wallm, y=-proj, sill=False, head=False)
            arch_reveal(mb, pts, -proj, 0.5 + proj, wallm)
            gate(mb, x0, x1, zs, rise, R, doorm)
            if trim:
                arc_band(mb, x0, x1, zs, rise, 0.22, -proj - 0.05, -proj, trim, n=12)
                xc = (x0 + x1) / 2
                prism_xz(mb, [(xc - 0.12, z1 - 0.03), (xc + 0.12, z1 - 0.03), (xc + 0.17, z1 + 0.34),
                              (xc - 0.17, z1 + 0.34)], -proj - 0.11, -proj, trim)
            elif st == 'brick':
                arc_band(mb, x0, x1, zs, rise, 0.25, -0.02, 0, 'M_Brick_Arch', n=12)
            info['gates'].append(((x0 + x1) / 2, 0.0))
        elif k == 'door':
            dep = 0.4
            reveal(mb, x0, x1, z0, zs, dep + proj, wallm, y=-proj, sill=False, head=(rise == 0))
            if rise > 0:
                arch_reveal(mb, pts, -proj, dep + proj, wallm)
                mb.face([(p[0], dep, p[1]) for p in reversed(pts)], doorm)
                arc_band(mb, x0, x1, zs, rise, 0.25, -0.02, 0, 'M_Brick_Arch')
            house_door(mb, x0, x1, z0, zs, R, doorm, y=dep)
            box(mb, x0 - 0.12, x1 + 0.12, -0.42 - proj, dep, 0.0, 0.16, 'M_Stone_Granite', skip='bu')     # step
            if trim:
                for xa, xb in ((x0 - 0.34, x0 - 0.07), (x1 + 0.07, x1 + 0.34)):
                    box(mb, xa, xb, -proj - 0.08, -proj, plinth_h, z1 + 0.02, trim, skip='bu')
                    box(mb, xa - 0.03, xb + 0.03, -proj - 0.11, -proj, plinth_h, plinth_h + 0.2, trim, skip='bu')
                zc = z1 + 0.02
                profile(mb, x0 - 0.42, x1 + 0.42, [(-proj, zc), (-proj - 0.1, zc), (-proj - 0.1, zc + 0.2),
                                                   (-proj - 0.16, zc + 0.24), (-proj - 0.26, zc + 0.3),
                                                   (-proj - 0.26, zc + 0.36), (-proj, zc + 0.4)], trim)
            box(mb, x1 + 0.5, x1 + 0.68, -proj - 0.012, -proj, 2.1, 2.24, 'M_Enamel_Blue', skip='b')       # house number
            info['doors'].append(((x0 + x1) / 2, 0.0))
        else:
            dep = 0.22
            reveal(mb, x0, x1, z0, zs, dep + proj, wallm, y=-proj, sill=(k == 'shopwin'), head=(rise == 0))
            if rise > 0:
                arch_reveal(mb, pts, -proj, dep + proj, wallm)
                mb.face([(p[0], dep, p[1]) for p in reversed(pts)], signs[o['i']][1])
                arc_band(mb, x0, x1, zs, rise, 0.25, -0.02, 0, 'M_Brick_Arch')
            if k == 'shopdoor':
                mb.quad((x0, -proj, z0), (x1, -proj, z0), (x1, dep, z0), (x0, dep, z0), 'M_Stone_Granite')
                box(mb, x0, x1, -0.3 - proj, -proj, 0.0, z0, 'M_Stone_Granite', skip='bu')
                info['shopdoors'].append(((x0 + x1) / 2, 0.0))
            shopfront(mb, x0, x1, z0, zs, R, signs[o['i']][1], shutter=shut.get(o['i'], False),
                      door=(k == 'shopdoor'), y=dep)
    # --- signs above shop units
    for (i0, i1) in units:
        xa = cx[i0] - a / 2 + 0.35
        xb = cx[i1] + a / 2 - 0.35
        col = signs[i0][0]
        if R.random() < 0.85:
            zs0 = EG_HEAD + (0.14 if st != 'brick' else 0.3)
            box(mb, xa, xb, -proj - 0.09, -proj, zs0, zs0 + 0.56, col, skip='b')
            box(mb, xa - 0.03, xb + 0.03, -proj - 0.11, -proj, zs0 + 0.56, zs0 + 0.6, 'M_Shopframe_Dark', skip='b')
            info['signs'].append(((xa + xb) / 2, zs0 + 0.28, xb - xa, -proj - 0.09, col))
        if R.random() < 0.3:                                    # projecting sign
            xs = xa + 0.1
            box(mb, xs, xs + 0.1, -0.95, -0.2, 2.95, 3.5, col)
            tube(mb, (xs + 0.05, -0.2, 3.45), (xs + 0.05, 0, 3.6), 0.015, 'M_Iron_Black', seg=4)
            tube(mb, (xs + 0.05, -0.2, 3.0), (xs + 0.05, 0, 3.0), 0.015, 'M_Iron_Black', seg=4)
    # --- string course
    if S['rust']:
        profile(mb, 0, L, [(0, EG_TOP), (-0.05, EG_TOP), (-0.05, EG_TOP + 0.08), (-0.13, EG_TOP + 0.13),
                           (-0.15, EG_TOP + 0.13), (-0.15, EG_TOP + 0.22), (-0.1, G_H), (0, G_H + 0.02)], trim or wallm)
    elif st == 'brick':
        profile(mb, 0, L, [(0, EG_TOP), (-0.04, EG_TOP), (-0.04, EG_TOP + 0.07), (-0.09, EG_TOP + 0.07),
                           (-0.09, G_H - 0.04), (0, G_H)], trim)
    else:
        profile(mb, 0, L, [(0, EG_TOP + 0.04), (-0.03, EG_TOP + 0.04), (-0.03, G_H - 0.03), (0, G_H)], wallm)
    wall(mb, 0, L, EG_TOP, G_H, [], wallm, y=0.0)
    return kinds


# ------------------------------------------------------------------ roofs

def berlin_roof(mb, L, D, H, R, S, cx, a, roofm, firem):
    """Steep tiled front slope, flat tarred top, firewalls with chimneys, gutter and downpipe."""
    ye, ze = -0.42, H + 0.1
    ang = math.radians(R.choice([50, 54, 58]))
    rise = R.choice([2.6, 3.0, 3.3])
    yr, zr = ye + rise / math.tan(ang), ze + rise
    zb = zr - 0.12
    e = 0.02
    mb.quad((0, ye, ze), (L, ye, ze), (L, yr, zr), (0, yr, zr), roofm)
    mb.quad((0, yr, zr), (L, yr, zr), (L, D, zb), (0, D, zb), 'M_Roof_Bitumen')
    # firewalls: full side walls plus the parapet strip above the roof
    z_at0 = ze + (0 - ye) * math.tan(ang)
    side = [(0.0, 0.0), (D, 0.0), (D, zb + 0.4), (yr, zr + 0.4), (0.0, z_at0 + 0.4)]
    poly_x(mb, L - e, side, firem, positive=True)
    poly_x(mb, e, side, firem, positive=False)
    for xs, sg in ((e, 1), (L - e, -1)):
        xi = xs + sg * 0.3
        a0, a1 = (xs, xi) if sg > 0 else (xi, xs)
        inner = [(0.0, z_at0), (yr, zr), (D, zb), (D, zb + 0.4), (yr, zr + 0.4), (0.0, z_at0 + 0.4)]
        poly_x(mb, xi, [inner[0], inner[1], inner[4], inner[5]], firem, positive=(sg > 0))
        poly_x(mb, xi, [inner[1], inner[2], inner[3], inner[4]], firem, positive=(sg > 0))
        mb.quad((a0, 0, z_at0 + 0.4), (a1, 0, z_at0 + 0.4), (a1, yr, zr + 0.4), (a0, yr, zr + 0.4), 'M_Zinc')
        mb.quad((a0, yr, zr + 0.4), (a1, yr, zr + 0.4), (a1, D, zb + 0.4), (a0, D, zb + 0.4), 'M_Zinc')
        mb.quad((a0, 0, H), (a1, 0, H), (a1, 0, z_at0 + 0.4), (a0, 0, z_at0 + 0.4), firem)
        # chimney stacks
        for k in range(R.randint(1, 2)):
            y0 = yr + 0.6 + k * R.uniform(2.6, 3.6)
            ln = R.uniform(0.9, 2.0)
            if y0 + ln > D - 0.5:
                break
            zt = zr + R.uniform(1.3, 1.9)
            cx0, cx1 = (xs, xs + 0.55) if sg > 0 else (xs - 0.55, xs)
            box(mb, cx0, cx1, y0, y0 + ln, zb, zt, 'M_Brick_Chimney', skip='u')
            box(mb, cx0 - 0.05, cx1 + 0.05, y0 - 0.05, y0 + ln + 0.05, zt, zt + 0.08, 'M_Concrete')
            np_ = max(1, int(ln / 0.42))
            for j in range(np_):
                cylinder(mb, (cx0 + cx1) / 2, y0 + ln * (j + 0.5) / np_, zt + 0.08, zt + 0.42, 0.11, 0.09,
                         'M_Clay_Pot', seg=8)
    mb.quad((L, D, 0), (0, D, 0), (0, D, zb + 0.4), (L, D, zb + 0.4), firem)
    mb.quad((0, D - 0.25, zb), (L, D - 0.25, zb), (L, D - 0.25, zb + 0.4), (0, D - 0.25, zb + 0.4), firem)
    mb.quad((0, D - 0.25, zb + 0.4), (L, D - 0.25, zb + 0.4), (L, D, zb + 0.4), (0, D, zb + 0.4), 'M_Zinc')
    # gutter and downpipe
    box(mb, 0, L, ye - 0.14, ye + 0.02, ze - 0.08, ze + 0.03, 'M_Zinc', skip='b')
    xd = 0.22 if R.random() < 0.5 else L - 0.22
    tube(mb, (xd, ye - 0.06, ze - 0.08), (xd, -0.13, H - 0.75), 0.05, 'M_Zinc', seg=8)
    cylinder(mb, xd, -0.13, 0.25, H - 0.75, 0.05, 0.05, 'M_Zinc', seg=8, cap_top=False)
    for zz in (2.6, H * 0.5, H - 1.6):
        box(mb, xd - 0.07, xd + 0.07, -0.19, 0, zz, zz + 0.04, 'M_Zinc', skip='b')
    # dormers
    nd = R.choice([0, 0, 1, 2, 2, 3])
    axes = list(range(len(cx)))
    R.shuffle(axes)
    for i in sorted(axes[:min(nd, len(cx))]):
        c = cx[i]
        yd = ye + 0.75 / math.tan(ang)
        zd0 = ze + 0.75
        zd1 = zd0 + 1.45
        ydt = ye + (zd1 - ze) / math.tan(ang)
        hw = 0.62
        if zd1 > zr - 0.1:
            continue
        box(mb, c - hw, c + hw, yd, yd + 0.06, zd0, zd1, 'M_Zinc', skip='b')
        box(mb, c - hw + 0.1, c + hw - 0.1, yd - 0.02, yd, zd0 + 0.2, zd1 - 0.15, 'M_Frame_White', skip='b')
        mb.quad((c - hw + 0.16, yd - 0.025, zd0 + 0.26), (c + hw - 0.16, yd - 0.025, zd0 + 0.26),
                (c + hw - 0.16, yd - 0.025, zd1 - 0.21), (c - hw + 0.16, yd - 0.025, zd1 - 0.21), 'M_Glass')
        mb.tri((c - hw, yd, zd0), (c - hw, yd, zd1), (c - hw, ydt, zd1), 'M_Zinc')
        mb.tri((c + hw, yd, zd0), (c + hw, ydt, zd1), (c + hw, yd, zd1), 'M_Zinc')
        mb.quad((c - hw - 0.06, yd - 0.12, zd1 + 0.02), (c + hw + 0.06, yd - 0.12, zd1 + 0.02),
                (c + hw + 0.06, ydt, zd1 + 0.1), (c - hw - 0.06, ydt, zd1 + 0.1), 'M_Zinc')
        mb.quad((c - hw - 0.06, yd - 0.12, zd1 - 0.05), (c + hw + 0.06, yd - 0.12, zd1 - 0.05),
                (c + hw + 0.06, yd - 0.12, zd1 + 0.02), (c - hw - 0.06, yd - 0.12, zd1 + 0.02), 'M_Zinc')
    return zr


def flat_roof(mb, L, D, H, R, wallm, firem):
    """Parapet, set-back attic storey and roof plant."""
    e = 0.02
    zp = H + 0.55
    box(mb, 0, L, 0, 0.3, H, zp, wallm, skip='fu')
    box(mb, -0.0, L, -0.04, 0.34, zp, zp + 0.05, 'M_Zinc', skip='')
    mb.quad((0, 0.3, H + 0.02), (L, 0.3, H + 0.02), (L, D, H + 0.02), (0, D, H + 0.02), 'M_Roof_Bitumen')
    side = [(0.0, 0.0), (D, 0.0), (D, zp), (0.0, zp)]
    poly_x(mb, L - e, side, firem, positive=True)
    poly_x(mb, e, side, firem, positive=False)
    mb.quad((L, D, 0), (0, D, 0), (0, D, zp), (L, D, zp), firem)
    zr0 = H + 0.02
    mb.quad((0, D - 0.25, zr0), (L, D - 0.25, zr0), (L, D - 0.25, zp), (0, D - 0.25, zp), firem)
    mb.quad((0, D - 0.25, zp), (L, D - 0.25, zp), (L, D, zp), (0, D, zp), 'M_Zinc')
    poly_x(mb, 0.27, [(0.3, zr0), (D - 0.25, zr0), (D - 0.25, zp), (0.3, zp)], firem, positive=True)
    poly_x(mb, L - 0.27, [(0.3, zr0), (D - 0.25, zr0), (D - 0.25, zp), (0.3, zp)], firem, positive=False)
    mb.quad((e, 0.3, zp), (0.27, 0.3, zp), (0.27, D, zp), (e, D, zp), 'M_Zinc')
    mb.quad((L - 0.27, 0.3, zp), (L - e, 0.3, zp), (L - e, D, zp), (L - 0.27, D, zp), 'M_Zinc')
    ya, yb = 2.3, min(D - 0.6, 2.3 + 7.0)
    za = H + 3.0
    box(mb, 0.4, L - 0.4, ya, yb, H + 0.02, za, 'M_Metal_Panel_Grey', skip='u')
    n = max(2, int((L - 1.6) / 2.2))
    for i in range(n):
        x0 = 0.8 + (L - 1.6) * i / n + 0.15
        x1 = 0.8 + (L - 1.6) * (i + 1) / n - 0.15
        box(mb, x0, x1, ya - 0.02, ya, H + 0.5, za - 0.4, 'M_Frame_Anthracite', skip='b')
        mb.quad((x0 + 0.05, ya - 0.025, H + 0.55), (x1 - 0.05, ya - 0.025, H + 0.55),
                (x1 - 0.05, ya - 0.025, za - 0.45), (x0 + 0.05, ya - 0.025, za - 0.45), 'M_Glass')
    box(mb, 0.3, L - 0.3, ya - 0.5, yb + 0.1, za, za + 0.1, 'M_Zinc')
    for k in range(R.randint(1, 3)):
        x0 = R.uniform(1.0, max(1.1, L - 3.0))
        box(mb, x0, x0 + R.uniform(1.0, 1.8), ya + 1.0, ya + 2.2, za + 0.1, za + 0.1 + R.uniform(0.6, 1.1),
            'M_Metal_Panel_Grey', skip='u')
    return za


# ------------------------------------------------------------------ the building

def building(L, D, H, st, fl, seed, pal_seed=None, lit_boost=1.0):
    """Returns (MB, info). info lists door, gate and lit-window positions in the building frame."""
    R = random.Random(seed * 9973 + 17)
    P = random.Random((seed if pal_seed is None else pal_seed) * 7919 + 5)
    S = STYLES.get(st, STYLES[0])
    name = S['name']
    mb = MB()
    info = dict(doors=[], gates=[], shopdoors=[], signs=[], lit=[], style=name)
    fh = (H - G_H) / fl
    wallm = P.choice(S['wall'])
    trim = S['trim']
    framem = P.choice(S['frames'])
    doorm = P.choice(DOORS)
    firem = 'M_Firewall_Brick'
    roofm = P.choice(['M_Roof_Tile', 'M_Roof_Tile', 'M_Roof_Slate'])
    m = 0.55 if L > 9 else 0.3
    n = max(1, int(round((L - 2 * m) / S['aw'])))
    a = (L - 2 * m) / n
    cx = [m + (i + 0.5) * a for i in range(n)]

    ground_floor(mb, L, cx, a, S, R, P, wallm, trim, doorm, info)

    # ---- balcony stacks
    bal = {}
    if n >= 3 and R.random() < S['balcony']:
        if n % 2 == 1 and R.random() < 0.5:
            axes = [(n // 2, n // 2)]
        elif n >= 5 and R.random() < 0.6:
            axes = [(1, 1), (n - 2, n - 2)]
        elif n % 2 == 0:
            axes = [(n // 2 - 1, n // 2)]
        else:
            axes = [(n // 2, n // 2)]
        top = R.randint(1, max(1, fl - 1))
        for f in range(1, top + 1):
            for (i0, i1) in axes:
                bal[(f, i0)] = (i0, i1)
                for i in range(i0, i1 + 1):
                    bal.setdefault((f, i), None)
    hoods_bel = R.choice([['triangle'], ['segment'], ['triangle', 'segment'], ['straight']])
    lisene = name == 'stucco' and R.random() < 0.65
    sillcourse = name in ('stucco', 'brick') and R.random() < 0.8

    ops, arches = [], []
    for f in range(1, fl + 1):
        zf = G_H + (f - 1) * fh
        topf = f == fl
        for i in range(n):
            c = cx[i]
            is_bal = (f, i) in bal
            if name == 'modern':
                ww, wh, sh = min(1.9, a - 1.3), 1.75, 0.95
            elif name == 'brick':
                ww, wh, sh = min(1.15, a - 1.6), (2.05 if not topf else 1.8), 0.95
            else:
                ww = min(1.22, a - 1.7) if a > 2.9 else 1.05
                wh = 2.28 if f == 1 else (1.95 if topf else 2.15)
                sh = 0.88 if f == 1 else 0.93
            x0, x1 = c - ww / 2, c + ww / 2
            z0 = zf + (0.1 if is_bal else sh)
            z1 = zf + sh + wh
            rise = 0.14 if name == 'brick' else 0.0
            ops.append((x0, x1, z0, z1))
            lit = None
            if R.random() < S['lit'] * lit_boost:
                lit = 'M_Interior_Candle' if R.random() < 0.8 else 'M_Interior_Lantern'
                info['lit'].append((c, (z0 + z1) / 2, lit))
            zs = z1 - rise
            # masonry opening
            if rise:
                pts = arch_fill(mb, x0, x1, zs, rise, 0.0, wallm)
                arch_reveal(mb, pts, 0.0, 0.24, wallm)
                reveal(mb, x0, x1, z0, zs, 0.24, wallm, sill=True, head=False)
                mb.face([(p[0], 0.24, p[1]) for p in reversed(pts)], framem)
                arc_band(mb, x0, x1, zs, rise, 0.25, -0.02, 0, 'M_Brick_Arch')
                dep = 0.24
            else:
                dep = 0.26 if name == 'modern' else 0.2
                reveal(mb, x0, x1, z0, z1, dep, wallm)
            # the window itself
            if name == 'modern':
                window_modern(mb, x0, x1, z0, zs, dep, R, framem, lit=lit)
                box(mb, x0 - 0.02, x1 + 0.02, -0.05, dep, z0 - 0.03, z0, 'M_Zinc', skip='b')
            elif (not is_bal) and R.random() < S['boarded']:
                boarded(mb, x0, x1, z0, zs, dep - 0.08, R)
            else:
                window(mb, x0, x1, z0, zs, dep, R, framem, lit=lit, curtains=True)
            # dressings
            if name == 'stucco':
                if f == 1:
                    hood = hoods_bel[i % len(hoods_bel)]
                elif topf:
                    hood = 'keystone' if fl > 2 else 'straight'
                else:
                    hood = 'straight' if f == 2 else 'plain'
                surround(mb, x0, x1, z0, z1, hood, trim, R)
                if not is_bal:
                    if not (sillcourse and f == 1):
                        sill(mb, x0 - 0.2, x1 + 0.2, z0, trim)
                    if f == 1:
                        box(mb, x0 - 0.05, x1 + 0.05, -0.022, 0, z0 - 0.78, z0 - 0.22, trim, skip='b')
                        box(mb, x0 + 0.1, x1 - 0.1, -0.04, -0.022, z0 - 0.68, z0 - 0.32, trim, skip='b')
            elif name == 'stripped':
                if not is_bal:
                    sill(mb, x0 - 0.06, x1 + 0.06, z0, 'M_Zinc', out=0.07, th=0.05, brackets=False)
            elif name == 'brick':
                if not is_bal and not (sillcourse and f == 1):
                    sill(mb, x0 - 0.1, x1 + 0.1, z0, trim, out=0.1, th=0.1, brackets=False)
        # balconies on this floor
        for (ff, i0), span in bal.items():
            if ff == f and span:
                xl = cx[span[0]] - a / 2 + 0.3
                xr = cx[span[1]] + a / 2 - 0.3
                balcony(mb, xl, xr, zf + 0.06, trim or 'M_Concrete')
    wall(mb, 0, L, G_H, H - (0.0 if name == 'modern' else 0.0), ops, wallm)

    if lisene:
        for xa, xb in ((0.0, 0.42), (L - 0.42, L)):
            box(mb, xa, xb, -0.05, 0, G_H + 0.02, H - 0.8, trim, skip='btu')
    if sillcourse:
        z = G_H + (0.88 if name == 'stucco' else 0.95)
        t = trim
        cuts = []
        for (ff, i0), span in bal.items():
            if ff == 1 and span is None or (ff == 1 and span):
                pass
        profile(mb, 0, L, [(0, z - 0.11), (-0.05, z - 0.11), (-0.05, z - 0.08), (-0.13, z - 0.04), (-0.13, z), (0, z)], t)

    # ---- cornice
    if name == 'stucco':
        box(mb, 0, L, -0.04, 0, H - 0.8, H - 0.4, trim, skip='bt')
        profile(mb, 0, L, [(-0.04, H - 0.84), (-0.07, H - 0.84), (-0.07, H - 0.8), (-0.04, H - 0.8)], trim, caps=False)
        profile(mb, 0, L, [(0, H - 0.4), (-0.07, H - 0.4), (-0.07, H - 0.33), (-0.13, H - 0.29), (-0.13, H - 0.14),
                           (-0.52, H - 0.14), (-0.52, H - 0.04), (-0.58, H + 0.03), (-0.58, H + 0.06), (0, H + 0.12)], trim)
        nm = max(2, int(round(L / 0.5)))
        for i in range(nm):
            xm = (i + 0.5) * L / nm
            prism_yz(mb, [(-0.13, H - 0.14), (-0.13, H - 0.31), (-0.2, H - 0.3), (-0.46, H - 0.2), (-0.46, H - 0.14)],
                     xm - 0.07, xm + 0.07, trim)
        if R.random() < 0.6:
            nd = int(L / 0.11)
            for i in range(nd):
                xd = (i + 0.25) * L / nd
                box(mb, xd, xd + 0.055, -0.115, -0.07, H - 0.47, H - 0.41, trim, skip='bt')
    elif name == 'stripped':
        profile(mb, 0, L, [(0, H - 0.3), (-0.06, H - 0.3), (-0.22, H - 0.18), (-0.22, H + 0.02), (0, H + 0.08)], wallm)
    elif name == 'brick':
        z = H - 0.62
        prof = [(0, z)]
        y = 0.0
        for k in range(4):
            y -= 0.045
            prof += [(y, z), (y, z + 0.075)]
            z += 0.075
        prof += [(y - 0.02, z), (y - 0.02, H - 0.1), (-0.34, H - 0.1), (-0.34, H + 0.02), (0, H + 0.08)]
        profile(mb, 0, L, prof, wallm)
        nd = int(L / 0.26)
        for i in range(nd):
            xd = (i + 0.25) * L / nd
            box(mb, xd, xd + 0.12, -0.3, y - 0.02, H - 0.26, H - 0.1, wallm, skip='bt')

    # ---- roof
    if name == 'modern':
        ztop = flat_roof(mb, L, D, H, R, wallm, firem)
    else:
        ztop = berlin_roof(mb, L, D, H, R, S, cx, a, roofm, firem)
    info.update(axes=n, axis_width=a, floor_height=fh, top=ztop, wall=wallm, frame=framem)
    return mb, info


if __name__ == '__main__':
    import collections
    for st in (0, 1, 2, 4):
        mb, info = building(18.5, 12.5, 19.2 if st != 4 else 18.0, st, 4, 409 + st)
        used = collections.Counter(mb.mats[i] for i in mb.fm)
        print(st, info['style'], 'tris', mb.ntris(), 'mats', len(used), 'axes', info['axes'])
