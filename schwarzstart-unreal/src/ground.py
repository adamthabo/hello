"""Street surfaces for the Oranienburger Strasse scene: carriageway, kerbs, pavements, plaza, tram rails,
ploughed snow, overhead wires, and the top-down snow mask that says where snow has been driven or walked away.

Scene frame: Blender X = map x - OX, Y = -(map z - OZ), Z up, metres.
Street frame: s runs along the street from west to east (0 at the middle), t across it (positive = north side).
"""
import math
import random
import numpy as np
from shapely.geometry import Polygon, LineString, Point, MultiPolygon
from shapely.geometry.polygon import orient
from shapely.ops import unary_union
import mapbox_earcut as earcut
from mb import MB, tube, box, lathe

OX, OZ = 415.0, -687.5
KERB = 0.12
S0, S1, T0, T1 = -150.0, 175.0, -85.0, 85.0
PPM = 8                                   # mask pixels per metre


def tb(p):
    return (p[0] - OX, -(p[1] - OZ))


_A, _B = tb((500.0, -655.0)), tb((330.0, -720.0))
_l = math.hypot(_A[0] - _B[0], _A[1] - _B[1])
U = ((_A[0] - _B[0]) / _l, (_A[1] - _B[1]) / _l)          # along the street, towards Hackescher Markt
V = (-U[1], U[0])                                          # across, towards the north side
HALF = _l / 2


def xy(s, t):
    return (U[0] * s + V[0] * t, U[1] * s + V[1] * t)


def st(p):
    return (p[0] * U[0] + p[1] * U[1], p[0] * V[0] + p[1] * V[1])


def yaw_u():
    return math.atan2(U[1], U[0])


REGION = Polygon([xy(S0, T0), xy(S1, T0), xy(S1, T1), xy(S0, T1)])


def vnoise(x, seed=0):
    """Smooth 1D value noise in 0..1."""
    i = math.floor(x)
    f = x - i
    f = f * f * (3 - 2 * f)
    def h(n):
        n = (int(n) * 374761393 + seed * 668265263) & 0xffffffff
        n = (n ^ (n >> 13)) * 1274126177 & 0xffffffff
        return ((n ^ (n >> 16)) & 0xffff) / 65535.0
    return h(i) * (1 - f) + h(i + 1) * f


def polys(g):
    if g.is_empty:
        return []
    if g.geom_type == 'Polygon':
        return [g]
    return [p for p in getattr(g, 'geoms', []) if p.geom_type == 'Polygon' and p.area > 0.02]


def tri_poly(mb, geom, z, mat):
    """Triangulate shapely polygons (holes included) as up-facing faces at height z."""
    for pg in polys(geom):
        pg = orient(pg, 1.0)
        rings = [list(pg.exterior.coords)[:-1]] + [list(r.coords)[:-1] for r in pg.interiors]
        verts = np.array([p[:2] for r in rings for p in r], dtype=np.float64)
        ends = np.cumsum([len(r) for r in rings]).astype(np.uint32)
        idx = earcut.triangulate_float64(verts, ends)
        for i in range(0, len(idx), 3):
            a, b, c = verts[idx[i]], verts[idx[i + 1]], verts[idx[i + 2]]
            cr = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
            if abs(cr) < 1e-9:
                continue
            if cr < 0:
                b, c = c, b
            mb.tri((a[0], a[1], z), (b[0], b[1], z), (c[0], c[1], z), mat)


def wall_ring(mb, geom, z0, z1, mat, inward=True, skip_border=True):
    """Vertical faces along polygon boundaries. inward=True faces into the polygon (a kerb seen from the road)."""
    border = REGION.exterior
    for pg in polys(geom):
        pg = orient(pg, 1.0)
        for ring in [pg.exterior] + list(pg.interiors):
            c = list(ring.coords)
            d0 = 0.0
            for a, b in zip(c[:-1], c[1:]):
                if skip_border and border.distance(Point((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)) < 0.05:
                    continue
                d1 = d0 + math.hypot(b[0] - a[0], b[1] - a[1])
                if inward:
                    mb.quad((b[0], b[1], z0), (a[0], a[1], z0), (a[0], a[1], z1), (b[0], b[1], z1), mat,
                            uvs=[(d1, z0), (d0, z0), (d0, z1), (d1, z1)])
                else:
                    mb.quad((a[0], a[1], z0), (b[0], b[1], z0), (b[0], b[1], z1), (a[0], a[1], z1), mat,
                            uvs=[(d0, z0), (d1, z0), (d1, z1), (d0, z1)])
                d0 = d1


class Ground:
    def __init__(self, data):
        self.d = data
        streets = data['streets']
        self.lines = []
        cw = []
        for s in streets:
            pts = [tb(p) for p in s['p']]
            if s['n'].startswith('Oranienburger'):
                pts = [(pts[0][0] + U[0] * 90, pts[0][1] + U[1] * 90)] + pts      # run the tracks on across the plaza
                self.main = LineString(pts)
                ln = LineString(pts[1:])
            else:
                ln = LineString(pts)
            self.lines.append((s, ln))
            cw.append(ln.buffer(s['cw'] / 2, cap_style='flat', join_style='mitre'))
        self.carriage = unary_union(cw).intersection(REGION)
        self.blocks = unary_union([Polygon([tb(p) for p in b['p']]).buffer(0) for b in data['blocks']]).intersection(REGION)
        self.parks = unary_union([Polygon([tb(p) for p in b]).buffer(0) for b in data['parks']]).intersection(REGION)
        self.via = unary_union([Polygon([tb(p) for p in b]).buffer(0) for b in data['viaSolid']]).intersection(REGION)
        self.plaza = unary_union([Polygon([tb(p) for p in b]).buffer(0) for b in data['plazas']]).intersection(REGION)
        self.parks = self.parks.difference(self.blocks).difference(self.carriage.buffer(3.0)).difference(self.via)
        kerb_out = self.carriage.buffer(0.3, join_style='mitre').intersection(REGION)
        self.kerb = kerb_out.difference(self.carriage)
        hard = REGION.difference(kerb_out).difference(self.blocks).difference(self.parks).difference(self.via)
        self.plaza_area = hard.intersection(self.plaza.buffer(1.0))
        self.pavement = hard.difference(self.plaza_area)

    # ------------------------------------------------------------ meshes
    def surfaces(self):
        out = {}
        m = MB(); tri_poly(m, self.carriage, 0.0, 'M_Asphalt'); out['SM_Ground_Carriageway'] = m
        m = MB(); tri_poly(m, self.kerb, KERB, 'M_Kerb_Granite'); wall_ring(m, self.carriage, 0.0, KERB, 'M_Kerb_Granite')
        out['SM_Ground_Kerbs'] = m
        m = MB(); tri_poly(m, self.pavement, KERB, 'M_Paving_Slab'); out['SM_Ground_Pavement'] = m
        m = MB(); tri_poly(m, self.plaza_area, KERB, 'M_Cobble'); out['SM_Ground_Plaza'] = m
        m = MB(); tri_poly(m, self.blocks, KERB, 'M_Ground_Yard'); out['SM_Ground_Yards'] = m
        m = MB(); tri_poly(m, self.parks, KERB, 'M_Snow'); out['SM_Ground_Park'] = m
        return out

    def rails(self):
        m = MB()
        self.rail_lines = []
        for tc in (-1.5, 1.5):
            for dr in (-0.7175, 0.7175):
                ln = self.main.offset_curve(tc + dr)
                self.rail_lines.append(ln)
                head = ln.buffer(0.033, cap_style='flat').intersection(REGION)
                tri_poly(m, head, 0.006, 'M_Rail_Steel')
                gr = ln.offset_curve(0.05 if dr < 0 else -0.05).buffer(0.018, cap_style='flat').intersection(REGION)
                tri_poly(m, gr, 0.004, 'M_Rail_Groove')
        return m

    def snow_banks(self, seed=3):
        """Ridges of ploughed snow on the pavement side of every kerb."""
        m = MB()
        offs = [0.05, 0.22, 0.45, 0.7, 0.95, 1.15, 1.3]
        prof = [0.0, 0.55, 0.95, 1.0, 0.7, 0.3, 0.0]
        border = REGION.exterior
        k = 0
        for pg in polys(self.carriage):
            pg = orient(pg, 1.0)
            for ring in [pg.exterior] + list(pg.interiors):
                k += 1
                ln = LineString(ring.coords)
                n = int(ln.length / 0.35)
                rows = []
                for i in range(n + 1):
                    d = ln.length * i / n
                    p = ln.interpolate(d)
                    q = ln.interpolate(min(ln.length, d + 0.3))
                    q0 = ln.interpolate(max(0.0, d - 0.3))
                    ex, ey = q.x - q0.x, q.y - q0.y
                    el = math.hypot(ex, ey) or 1.0
                    nx, ny = ey / el, -ex / el                      # outward for a CCW ring
                    h = 0.05 + 0.2 * vnoise(d / 4.0, seed + k) + 0.26 * vnoise(d / 0.8, seed + 9 + k)
                    gap = vnoise(d / 13.0, seed + 31 + k)
                    h *= max(0.0, min(1.0, (gap - 0.3) * 5.0))
                    if border.distance(p) < 2.0 or self.plaza.buffer(2.0).contains(p):
                        h = 0.0
                    wj = 0.5 + 1.0 * vnoise(d / 1.9, seed + 77 + k)
                    h *= 0.6 + 0.8 * vnoise(d / 0.55, seed + 41 + k)
                    row = []
                    for j, (o, f) in enumerate(zip(offs, prof)):
                        oj = o * wj * (0.85 + 0.3 * vnoise(d / 0.7 + 9.1 * j, seed + 3))
                        zj = KERB + h * f * (0.6 + 0.8 * vnoise(d / 0.8 + 17.3 * j, seed + 5))
                        row.append((p.x + nx * oj, p.y + ny * oj, zj))
                    rows.append((h, row))
                for (h0, r0), (h1, r1) in zip(rows[:-1], rows[1:]):
                    if h0 < 0.02 and h1 < 0.02:
                        continue
                    for j in range(len(offs) - 1):
                        m.quad(r0[j + 1], r1[j + 1], r1[j], r0[j], 'M_Snow_Ploughed', smooth=True)
        return m

    def catenary(self, footprints):
        """Contact wires over both tracks and span wires to wall anchors or masts. Returns (mesh, mast list)."""
        m = MB()
        masts = []
        for tc in (-1.5, 1.5):
            ln = self.main.offset_curve(tc)
            ln = ln.intersection(REGION.buffer(-3.0))
            if ln.is_empty:
                continue
            geoms = [ln] if ln.geom_type == 'LineString' else list(ln.geoms)
            for g in geoms:
                n = max(1, int(g.length / 14.0))
                pts = [g.interpolate(g.length * i / n) for i in range(n + 1)]
                for a, b in zip(pts[:-1], pts[1:]):
                    tube(m, (a.x, a.y, 5.55), (b.x, b.y, 5.55), 0.012, 'M_Wire', seg=3)
                    tube(m, (a.x, a.y, 6.25), ((a.x + b.x) / 2, (a.y + b.y) / 2, 5.8), 0.008, 'M_Wire', seg=3)
                    tube(m, ((a.x + b.x) / 2, (a.y + b.y) / 2, 5.8), (b.x, b.y, 6.25), 0.008, 'M_Wire', seg=3)
        s = -126.0
        while s < 150.0:
            ends = []
            for side in (1, -1):
                probe = Point(xy(s, side * 12.0))
                if footprints.contains(probe):
                    p = xy(s, side * 10.75)
                    ends.append((p[0], p[1], 7.6))
                    q = xy(s, side * 10.9)
                    box(m, q[0] - 0.08, q[0] + 0.08, q[1] - 0.08, q[1] + 0.08, 7.5, 7.7, 'M_Iron_Black')
                else:
                    p = xy(s, side * 6.4)
                    ends.append((p[0], p[1], 7.3))
                    masts.append((p[0], p[1], yaw_u() + (math.pi / 2 if side > 0 else -math.pi / 2)))
            a, b = ends
            n = 10
            pr = None
            for i in range(n + 1):
                t = i / n
                p = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t - 1.0 * 4 * t * (1 - t) * 0.9)
                if pr:
                    tube(m, pr, p, 0.01, 'M_Wire', seg=3)
                pr = p
            s += 29.0
        return m, masts

    # ------------------------------------------------------------ snow mask
    def paint_mask(self, path, doors=(), fires=(), cars=(), seed=5):
        """Top-down map of the region. R = snow cover, G = trampled or driven (dirty), B = wet bare ground."""
        from PIL import Image, ImageDraw, ImageFilter
        W, H = int((S1 - S0) * PPM), int((T1 - T0) * PPM)
        rng = np.random.default_rng(seed)

        def px(p):
            s, t = st(p)
            return ((s - S0) * PPM, (T1 - t) * PPM)

        def draw_polys(d, geom, val):
            for pg in polys(geom):
                d.polygon([px(p) for p in pg.exterior.coords], fill=val)
                for r in pg.interiors:
                    d.polygon([px(p) for p in r.coords], fill=255 if val != 255 else 0)

        def lines(d, geom, val, width):
            gs = [geom] if geom.geom_type == 'LineString' else list(getattr(geom, 'geoms', []))
            for g in gs:
                if g.geom_type == 'LineString' and g.length > 0.2:
                    d.line([px(p) for p in g.coords], fill=val, width=max(1, int(width * PPM)), joint='curve')

        def noise(scale, octaves=4):
            acc = np.zeros((H, W), np.float32)
            amp, tot = 1.0, 0.0
            for o in range(octaves):
                cell = max(2, int(scale * PPM / (2 ** o)))
                small = rng.random((H // cell + 2, W // cell + 2)).astype(np.float32)
                im = Image.fromarray((small * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)
                acc += np.asarray(im, np.float32) / 255.0 * amp
                tot += amp
                amp *= 0.5
            return acc / tot

        snow = Image.new('L', (W, H), 255)
        d = ImageDraw.Draw(snow)
        draw_polys(d, self.carriage, 150)
        draw_polys(d, self.plaza_area, 165)
        # footpaths along the house fronts and across the plaza
        walk = self.blocks.buffer(2.1).exterior if self.blocks.geom_type == 'Polygon' else \
            unary_union([b.buffer(2.1).exterior for b in polys(self.blocks)])
        walk = walk.intersection(self.pavement.union(self.plaza_area))
        lines(d, walk, 95, 1.5)
        for s_, ln in self.lines:
            n_lanes = 2
            for sg in (-1, 1):
                c = s_['cw'] / 4.0 * sg if s_['cw'] > 7 else 0.0
                for dr in (-0.78, 0.78):
                    lines(d, ln.offset_curve(c + dr).intersection(REGION), 22, 0.5)
                if s_['cw'] <= 7:
                    break
        for trail in ([(-88, -7.5), (-70, -9.0), (-52, -12.5), (-40, -21.0), (-31, -38.0)], [(-52, -12.5), (-60, -30.0), (-76, -52.0)],
                     [(70, -8.0), (85, -20.0), (98, -31.0)], [(110, 6.0), (121, -10.0), (118, -31.0)], [(76, 8.5), (92, 0.5), (112, -4.0)],
                     [(-91, 8.5), (-99, 20.0), (-103, 60.0)]):
            lines(d, LineString([xy(a, b) for a, b in trail]), 100, 1.2)
        for ln in getattr(self, 'rail_lines', []):
            lines(d, ln.intersection(REGION), 70, 0.34)
        for p in doors:
            x, y = px(p)
            r = 1.1 * PPM
            d.ellipse([x - r, y - r, x + r, y + r], fill=70)
        for p in fires:
            x, y = px(p)
            r = 2.0 * PPM
            d.ellipse([x - r, y - r, x + r, y + r], fill=10)
        for p in cars:                                     # parked cars keep the snow under and around them untouched
            x, y = px(p)
            r = 2.6 * PPM
            d.ellipse([x - r, y - r, x + r, y + r], fill=255)
        snow = np.asarray(snow.filter(ImageFilter.GaussianBlur(0.3 * PPM)), np.float32) / 255.0
        n1, n2 = noise(6.0), noise(0.8, 3)
        snow = np.clip(snow + (n1 - 0.5) * 0.55 + (n2 - 0.5) * 0.3, 0, 1)
        tr = np.clip(1.0 - np.abs(snow - 0.45) * 2.4, 0, 1) * 0.9          # slush where cover is partial
        wet = np.clip(0.6 - snow, 0, 1) / 0.6
        img = np.dstack([snow, tr, wet])
        Image.fromarray((img * 255).astype(np.uint8)).save(path)
        return dict(file=path.split('/')[-1], s0=S0, s1=S1, t0=T0, t1=T1, ppm=PPM, u=U, v=V)


def mast():
    m = MB()
    lathe(m, 0, 0, [(0.17, 0), (0.17, 0.5), (0.12, 0.6), (0.08, 7.5)], 'M_Lamp_Metal', seg=8)
    return m


def extrude(mb, geom, z0, z1, wallm, topm):
    """Solid block from shapely polygons: outward walls with along-wall UVs and a flat top."""
    wall_ring(mb, geom, z0, z1, wallm, inward=False, skip_border=False)
    tri_poly(mb, geom, z1, topm)
