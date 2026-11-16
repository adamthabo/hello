"""Small mesh builder for the Berlin street kit.

Everything is built in metres, Z up, right-handed (Blender's convention).
A building is built in its own local frame: X runs along the frontage (left to right as seen
from the street), Y runs into the lot, Z is up. The street is on the -Y side of the facade.
Faces carry a material name, a UV in metres and an RGBA vertex colour (linear).
"""
import math


def srgb(hexcol, a=1.0, k=1.0):
    """'#rrggbb' -> linear RGBA tuple."""
    h = hexcol.lstrip('#')
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255.0 * k
        c = min(1.0, max(0.0, c))
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (out[0], out[1], out[2], a)


def mixc(a, b, t):
    return tuple(a[i] * (1 - t) + b[i] * t for i in range(4))


WHITE = (1.0, 1.0, 1.0, 1.0)


def _normal(pts):
    nx = ny = nz = 0.0
    n = len(pts)
    for i in range(n):
        x0, y0, z0 = pts[i]
        x1, y1, z1 = pts[(i + 1) % n]
        nx += (y0 - y1) * (z0 + z1)
        ny += (z0 - z1) * (x0 + x1)
        nz += (x0 - x1) * (y0 + y1)
    l = math.sqrt(nx * nx + ny * ny + nz * nz) or 1.0
    return nx / l, ny / l, nz / l


def auto_uv(pts, scale=1.0):
    """Box projection in metres so tiling materials keep one texel density everywhere."""
    nx, ny, nz = _normal(pts)
    if abs(nz) > 0.72:
        return [(p[0] * scale, p[1] * scale) for p in pts]
    if abs(ny) >= abs(nx):
        return [(p[0] * scale, p[2] * scale) for p in pts]
    return [(p[1] * scale, p[2] * scale) for p in pts]


class MB:
    def __init__(self):
        self.v = []      # vertex positions
        self.f = []      # faces as index tuples
        self.fm = []     # material index per face
        self.uv = []     # list of per-corner uv lists
        self.col = []    # RGBA per face
        self.sm = []     # smooth-shaded flag per face
        self.mats = []

    def mi(self, name):
        if name not in self.mats:
            self.mats.append(name)
        return self.mats.index(name)

    def face(self, pts, mat, col=WHITE, uvs=None, smooth=False):
        i0 = len(self.v)
        self.v.extend((float(p[0]), float(p[1]), float(p[2])) for p in pts)
        self.f.append(tuple(range(i0, i0 + len(pts))))
        self.fm.append(self.mi(mat))
        self.uv.append(uvs if uvs is not None else auto_uv(pts))
        self.col.append(col)
        self.sm.append(bool(smooth))

    def quad(self, a, b, c, d, mat, col=WHITE, uvs=None, smooth=False):
        self.face((a, b, c, d), mat, col, uvs, smooth)

    def tri(self, a, b, c, mat, col=WHITE, uvs=None, smooth=False):
        self.face((a, b, c), mat, col, uvs, smooth)

    def ntris(self):
        return sum(len(f) - 2 for f in self.f)

    def add(self, other, xf=None):
        """Append another builder, optionally through a point transform."""
        for f, m, uv, c, sm in zip(other.f, other.fm, other.uv, other.col, other.sm):
            pts = [other.v[i] for i in f]
            if xf:
                pts = [xf(p) for p in pts]
            self.face(pts, other.mats[m], c, uv, sm)


# ---------------------------------------------------------------- primitives

def box(mb, x0, x1, y0, y1, z0, z1, mat, col=WHITE, skip=''):
    """Axis-aligned box. skip letters: f front(-Y) b back(+Y) l left(-X) r right(+X) t top u under."""
    if x1 < x0: x0, x1 = x1, x0
    if y1 < y0: y0, y1 = y1, y0
    if z1 < z0: z0, z1 = z1, z0
    if 'f' not in skip: mb.quad((x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1), mat, col)
    if 'b' not in skip: mb.quad((x1, y1, z0), (x0, y1, z0), (x0, y1, z1), (x1, y1, z1), mat, col)
    if 'l' not in skip: mb.quad((x0, y1, z0), (x0, y0, z0), (x0, y0, z1), (x0, y1, z1), mat, col)
    if 'r' not in skip: mb.quad((x1, y0, z0), (x1, y1, z0), (x1, y1, z1), (x1, y0, z1), mat, col)
    if 't' not in skip: mb.quad((x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1), mat, col)
    if 'u' not in skip: mb.quad((x0, y1, z0), (x1, y1, z0), (x1, y0, z0), (x0, y0, z0), mat, col)


def wall(mb, x0, x1, z0, z1, openings, mat, col=WHITE, y=0.0):
    """Vertical wall in the XZ plane at depth y, facing the street (-Y), with rectangular holes.
    openings: iterable of (ox0, ox1, oz0, oz1). Rows are merged so flat wall stays cheap."""
    ops = []
    for o in openings:
        a0, a1, b0, b1 = max(x0, o[0]), min(x1, o[1]), max(z0, o[2]), min(z1, o[3])
        if a1 - a0 > 1e-4 and b1 - b0 > 1e-4:
            ops.append((a0, a1, b0, b1))
    zs = sorted(set([z0, z1] + [o[2] for o in ops] + [o[3] for o in ops]))
    for za, zb in zip(zs[:-1], zs[1:]):
        if zb - za < 1e-5:
            continue
        cuts = sorted((o[0], o[1]) for o in ops if o[2] <= za + 1e-6 and o[3] >= zb - 1e-6)
        x = x0
        for a0, a1 in cuts:
            if a0 - x > 1e-5:
                mb.quad((x, y, za), (a0, y, za), (a0, y, zb), (x, y, zb), mat, col)
            x = max(x, a1)
        if x1 - x > 1e-5:
            mb.quad((x, y, za), (x1, y, za), (x1, y, zb), (x, y, zb), mat, col)


def reveal(mb, x0, x1, z0, z1, depth, mat, col=WHITE, y=0.0, sill=True, head=True):
    """The four inner faces of an opening, from the wall plane back by depth."""
    ya, yb = y, y + depth
    mb.quad((x0, ya, z0), (x0, yb, z0), (x0, yb, z1), (x0, ya, z1), mat, col)
    mb.quad((x1, yb, z0), (x1, ya, z0), (x1, ya, z1), (x1, yb, z1), mat, col)
    if head:
        mb.quad((x0, ya, z1), (x0, yb, z1), (x1, yb, z1), (x1, ya, z1), mat, col)
    if sill:
        mb.quad((x0, yb, z0), (x0, ya, z0), (x1, ya, z0), (x1, yb, z0), mat, col)


def profile(mb, x0, x1, pts, mat, col=WHITE, caps=True):
    """Sweep a 2D moulding profile along X. pts are (y, z) from the bottom of the moulding at the
    wall, out towards the street (negative y) and up, back to the wall at the top."""
    for (ya, za), (yb, zb) in zip(pts[:-1], pts[1:]):
        if abs(ya - yb) < 1e-6 and abs(za - zb) < 1e-6:
            continue
        mb.quad((x0, ya, za), (x1, ya, za), (x1, yb, zb), (x0, yb, zb), mat, col)
    if caps and len(pts) >= 3:
        zc = (pts[0][1] + pts[-1][1]) * 0.5
        c = (0.0, zc)
        for (ya, za), (yb, zb) in zip(pts[:-1], pts[1:]):
            mb.tri((x0, c[0], c[1]), (x0, ya, za), (x0, yb, zb), mat, col)      # faces -X
            mb.tri((x1, c[0], c[1]), (x1, yb, zb), (x1, ya, za), mat, col)      # faces +X


def poly_x(mb, x, yz, mat, col=WHITE, positive=True):
    """Convex-ish polygon in a plane of constant x, given as (y, z) points in the order
    that gives a +X normal. Fan triangulated from the first point."""
    pts = [(x, p[0], p[1]) for p in yz]
    if not positive:
        pts = pts[::-1]
    for i in range(1, len(pts) - 1):
        mb.tri(pts[0], pts[i], pts[i + 1], mat, col)


def cylinder(mb, cx, cy, z0, z1, r0, r1, mat, col=WHITE, seg=12, cap_top=True, cap_bot=False):
    """Vertical (possibly tapered) cylinder, outward normals."""
    ring = [(math.cos(2 * math.pi * i / seg), math.sin(2 * math.pi * i / seg)) for i in range(seg)]
    for i in range(seg):
        a, b = ring[i], ring[(i + 1) % seg]
        u0, u1 = i / seg, (i + 1) / seg
        circ = 2 * math.pi * max(r0, r1)
        mb.quad((cx + a[0] * r0, cy + a[1] * r0, z0), (cx + b[0] * r0, cy + b[1] * r0, z0),
                (cx + b[0] * r1, cy + b[1] * r1, z1), (cx + a[0] * r1, cy + a[1] * r1, z1), mat, col,
                uvs=[(u0 * circ, z0), (u1 * circ, z0), (u1 * circ, z1), (u0 * circ, z1)], smooth=True)
    if cap_top:
        mb.face([(cx + a[0] * r1, cy + a[1] * r1, z1) for a in ring], mat, col)
    if cap_bot:
        mb.face([(cx + a[0] * r0, cy + a[1] * r0, z0) for a in ring[::-1]], mat, col)


def tube(mb, p0, p1, r, mat, col=WHITE, seg=6, r1=None):
    """Cylinder between two arbitrary points (for poles, wires, branches)."""
    r1 = r if r1 is None else r1
    dx, dy, dz = p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]
    l = math.sqrt(dx * dx + dy * dy + dz * dz)
    if l < 1e-6:
        return
    w = (dx / l, dy / l, dz / l)
    a = (0.0, 0.0, 1.0) if abs(w[2]) < 0.9 else (1.0, 0.0, 0.0)
    u = (a[1] * w[2] - a[2] * w[1], a[2] * w[0] - a[0] * w[2], a[0] * w[1] - a[1] * w[0])
    ul = math.sqrt(u[0] ** 2 + u[1] ** 2 + u[2] ** 2)
    u = (u[0] / ul, u[1] / ul, u[2] / ul)
    v = (w[1] * u[2] - w[2] * u[1], w[2] * u[0] - w[0] * u[2], w[0] * u[1] - w[1] * u[0])
    pts0, pts1 = [], []
    for i in range(seg):
        c, s = math.cos(2 * math.pi * i / seg), math.sin(2 * math.pi * i / seg)
        d = (u[0] * c + v[0] * s, u[1] * c + v[1] * s, u[2] * c + v[2] * s)
        pts0.append((p0[0] + d[0] * r, p0[1] + d[1] * r, p0[2] + d[2] * r))
        pts1.append((p1[0] + d[0] * r1, p1[1] + d[1] * r1, p1[2] + d[2] * r1))
    for i in range(seg):
        j = (i + 1) % seg
        mb.quad(pts0[i], pts0[j], pts1[j], pts1[i], mat, col,
                uvs=[(i / seg, 0), (j / seg if j else 1.0, 0), (j / seg if j else 1.0, l), (i / seg, l)], smooth=True)


def _area2(pts):
    a = 0.0
    for i in range(len(pts)):
        x0, y0 = pts[i]
        x1, y1 = pts[(i + 1) % len(pts)]
        a += x0 * y1 - x1 * y0
    return a


def prism_xz(mb, pts, y0, y1, mat, col=WHITE, front=True, back=False, sides=True):
    """Convex polygon given as (x, z) in the facade plane, extruded from y0 (street side) back to y1.
    Orientation is fixed automatically so the front faces the street."""
    pts = list(pts)
    if _area2(pts) < 0:
        pts.reverse()
    if y1 < y0:
        y0, y1 = y1, y0
    if front:
        mb.face([(p[0], y0, p[1]) for p in pts], mat, col)
    if back:
        mb.face([(p[0], y1, p[1]) for p in reversed(pts)], mat, col)
    if sides:
        n = len(pts)
        for i in range(n):
            a, b = pts[i], pts[(i + 1) % n]
            mb.quad((a[0], y0, a[1]), (a[0], y1, a[1]), (b[0], y1, b[1]), (b[0], y0, b[1]), mat, col)


def prism_yz(mb, pts, x0, x1, mat, col=WHITE, caps=True, sides=True):
    """Convex polygon given as (y, z) in a cross-section plane, extruded along X from x0 to x1."""
    pts = list(pts)
    if _area2(pts) < 0:
        pts.reverse()
    if x1 < x0:
        x0, x1 = x1, x0
    if caps:
        mb.face([(x1, p[0], p[1]) for p in pts], mat, col)
        mb.face([(x0, p[0], p[1]) for p in reversed(pts)], mat, col)
    if sides:
        n = len(pts)
        for i in range(n):
            a, b = pts[i], pts[(i + 1) % n]
            mb.quad((x1, a[0], a[1]), (x0, a[0], a[1]), (x0, b[0], b[1]), (x1, b[0], b[1]), mat, col)


def tri_xz(mb, a, b, c, y, mat, col=WHITE):
    """Triangle in the facade plane at depth y, always facing the street."""
    pts = [a, b, c]
    if _area2(pts) < 0:
        pts.reverse()
    mb.face([(p[0], y, p[1]) for p in pts], mat, col)


def arc_pts(x0, x1, zs, rise, n=10):
    """Points of a circular arc from (x0, zs) over the top to (x1, zs) with the given rise."""
    w = x1 - x0
    xc = (x0 + x1) * 0.5
    rise = max(1e-4, min(rise, w * 0.5))
    r = (w * w / 4 + rise * rise) / (2 * rise)
    zc = zs + rise - r
    a0 = math.atan2(zs - zc, x0 - xc)
    a1 = math.atan2(zs - zc, x1 - xc)
    return [(xc + r * math.cos(a0 + (a1 - a0) * i / n), zc + r * math.sin(a0 + (a1 - a0) * i / n))
            for i in range(n + 1)]


def arch_fill(mb, x0, x1, zs, rise, y, mat, col=WHITE, n=10):
    """Wall pieces between a rectangular hole (up to zs + rise) and the arch inside it."""
    pts = arc_pts(x0, x1, zs, rise, n)
    zt = zs + rise
    h = n // 2
    for i in range(h):
        tri_xz(mb, (x0, zt), pts[i], pts[i + 1], y, mat, col)
    for i in range(h, n):
        tri_xz(mb, (x1, zt), pts[i], pts[i + 1], y, mat, col)
    return pts


def arch_reveal(mb, pts, y, depth, mat, col=WHITE):
    """Underside of an arch (intrados) following arc points left to right."""
    for a, b in zip(pts[:-1], pts[1:]):
        mb.quad((a[0], y, a[1]), (a[0], y + depth, a[1]), (b[0], y + depth, b[1]), (b[0], y, b[1]), mat, col)


def lathe(mb, cx, cy, prof, mat, col=WHITE, seg=16, smooth=True, cap_top=False):
    """Revolve a profile of (radius, z) points around a vertical axis. Profile runs bottom to top."""
    ring = [(math.cos(2 * math.pi * i / seg), math.sin(2 * math.pi * i / seg)) for i in range(seg)]
    for (r0, z0), (r1, z1) in zip(prof[:-1], prof[1:]):
        for i in range(seg):
            a, b = ring[i], ring[(i + 1) % seg]
            if r0 < 1e-6 and r1 < 1e-6:
                continue
            p = [(cx + a[0] * r0, cy + a[1] * r0, z0), (cx + b[0] * r0, cy + b[1] * r0, z0),
                 (cx + b[0] * r1, cy + b[1] * r1, z1), (cx + a[0] * r1, cy + a[1] * r1, z1)]
            if r0 < 1e-6:
                mb.tri(p[0], p[2], p[3], mat, col, smooth=smooth)
            elif r1 < 1e-6:
                mb.tri(p[0], p[1], p[2], mat, col, smooth=smooth)
            else:
                mb.quad(p[0], p[1], p[2], p[3], mat, col, smooth=smooth)
    if cap_top:
        r, z = prof[-1]
        mb.face([(cx + a[0] * r, cy + a[1] * r, z) for a in ring], mat, col)
