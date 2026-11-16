"""Builds the whole Oranienburger Strasse scene from the game's map data.

build(preview) fills the current Blender scene and returns the layout dictionary:
  preview=True   procedural look materials for the Cycles stills
  preview=False  flat materials only, for the GLB that goes to Unreal
"""
import json
import math
import random
from shapely.geometry import Polygon, Point
from shapely.ops import unary_union

import bpy
import bl_util as B
from mb import MB, box
from facade import building
import ground as GR
from ground import Ground, tb, xy, st, U, V, KERB, extrude, tri_poly
import props as PR

SRC = '/home/claude/work/unreal-kit/src/street_data.json'
MAP = '/home/claude/schwarz/schwarzstart/public/data/map.json'


def lot_frame(rec):
    x1, z1, x2, z2 = rec[:4]
    L = math.hypot(x2 - x1, z2 - z1)
    ex, ez = (x2 - x1) / L, (z2 - z1) / L
    o = tb((x2, z2))
    return L, o, (-ex, ez), (-ez, -ex)


def infill(data):
    """Short block edges with no lot on them (chamfered corners) get a small matching building."""
    builds = data['builds']
    out = []
    def near(p, q, tol=1.0):
        return math.hypot(p[0] - q[0], p[1] - q[1]) < tol
    for b in data['blocks']:
        pts = b['p']
        poly = Polygon(pts).buffer(0)
        n = len(pts)
        for i in range(n):
            a, c = pts[i], pts[(i + 1) % n]
            ln = math.hypot(c[0] - a[0], c[1] - a[1])
            if not (2.5 <= ln <= 9.0):
                continue
            covered = any((near(r[:2], a) and near(r[2:4], c)) or (near(r[:2], c) and near(r[2:4], a)) for r in builds)
            if covered:
                continue
            nb = [r for r in builds if near(r[:2], a) or near(r[2:4], a) or near(r[:2], c) or near(r[2:4], c)]
            if not nb:
                continue
            nb.sort(key=lambda r: -math.hypot(r[2] - r[0], r[3] - r[1]))
            r = nb[0]
            for p1, p2 in ((a, c), (c, a)):
                ex, ez = (p2[0] - p1[0]) / ln, (p2[1] - p1[1]) / ln
                mx, mz = (p1[0] + p2[0]) / 2 - ez * 1.0, (p1[1] + p2[1]) / 2 + ex * 1.0
                if poly.contains(Point(mx, mz)):
                    out.append(([p1[0], p1[1], p2[0], p2[1], min(7.0, r[4]), r[5], r[6], r[7], r[8], r[9] + 1000], r[9]))
                    break
    # pieces that meet at one corner should read as one house: an old style wins over the modern one
    for i, (ra, pa) in enumerate(out):
        for j, (rb, pb) in enumerate(out):
            if i != j and ra[6] == 4 and rb[6] != 4 and any(near(p, q, 1.0) for p in (ra[:2], ra[2:4]) for q in (rb[:2], rb[2:4])):
                ra[5], ra[6], ra[7] = rb[5], rb[6], rb[7]
                out[i] = (ra, pb)
    return out


SHOPS = ['BÄCKEREI', 'SPÄTKAUF', 'APOTHEKE', 'BUCHHANDLUNG', 'FAHRRÄDER', 'ANTIQUARIAT', 'BLUMEN', 'KAFFEE', 'TABAK · ZEITUNGEN',
         'SCHLÜSSELDIENST', 'OPTIKER', 'FRISEUR', 'WEINHANDLUNG', 'GALERIE', 'SCHUHMACHER', 'REISEBÜRO', 'FLEISCHEREI',
         'OBST & GEMÜSE', 'TEEHAUS', 'UHREN · SCHMUCK', 'COPYSHOP', 'ELEKTRO', 'ZUM ANKER', 'IMBISS', 'LEIHHAUS',
         'EISENWAREN', 'SECOND HAND', 'SCHALLPLATTEN', 'DRUCKEREI', 'MODEN', 'KERZEN · LAMPEN', 'BRIKETTS · HOLZ']


def text_mb(txt, cap_h, max_w, mat, depth=0.012):
    """Raised lettering as a mesh in the facade plane: X along the wall, Z up, front at y = 0, back at y = depth."""
    cu = bpy.data.curves.new('txt', 'FONT')
    cu.body = txt
    cu.size = cap_h / 0.69
    cu.resolution_u = 2
    cu.extrude = depth / 2
    cu.space_character = 1.12
    ob = bpy.data.objects.new('txt', cu)
    bpy.context.scene.collection.objects.link(ob)
    bpy.context.view_layer.update()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    out = MB()
    if len(me.vertices):
        xs = [v.co.x for v in me.vertices]
        ys = [v.co.y for v in me.vertices]
        xm, ym = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
        k = min(1.0, max_w / max(0.01, max(xs) - min(xs)))
        for pl in me.polygons:
            pts = [me.vertices[i].co for i in pl.vertices]
            out.face([((p.x - xm) * k, (depth / 2 - p.z) * k, (p.y - ym) * k) for p in pts], mat)
    bpy.data.objects.remove(ob)
    bpy.data.curves.remove(cu)
    bpy.data.meshes.remove(me)
    return out


def place(dst, src, x, y, z=0.0, yaw=0.0, scale=1.0):
    ca, sa = math.cos(yaw), math.sin(yaw)
    dst.add(src, lambda p: (x + (p[0] * ca - p[1] * sa) * scale, y + (p[0] * sa + p[1] * ca) * scale, z + p[2] * scale))


def ue(p):
    """Scene metres -> Unreal centimetres (X = map x, Y = map z, Z up)."""
    return [round(p[0] * 100, 1), round(-p[1] * 100, 1), round((p[2] if len(p) > 2 else 0.0) * 100, 1)]


def ue_yaw(yaw):
    return round(-math.degrees(yaw), 2)


def build(preview=True, mask_path='/home/claude/work/unreal-kit/textures/T_Ground_SnowMask.png'):
    B.PREVIEW = preview
    sc = B.reset()
    data = json.load(open(SRC))
    full = json.load(open(MAP))
    G = Ground(data)
    R = random.Random(11)
    meshes = {}                     # name -> (MB, collection)
    layout = dict(
        scene='SCHWARZSTART - Oranienburger Strasse look test',
        units='Unreal centimetres. X = (map x - origin x) * 100, Y = (map z - origin z) * 100, Z up.',
        origin_map=[GR.OX, GR.OZ], street_axis_yaw_deg=ue_yaw(GR.yaw_u()),
        buildings=[], props={}, lights=dict(fires=[], bulbs=[], floods=[], windows=[], beacons=[], beams=[]),
        bookmarks=[])

    # ------------------------------------------------------------ buildings
    recs = [(r, None) for r in data['builds']] + infill(data)
    footprints = []
    door_pts = []
    SR = random.Random(5)
    for i, (rec, pal) in enumerate(recs):
        L, o, xd, yd = lot_frame(rec)
        cs = st((o[0] + xd[0] * L / 2, o[1] + xd[1] * L / 2))
        boost = 4.0 if cs[0] > 35 else 2.0
        mbl, info = building(L, rec[4], rec[5], rec[6], rec[7], rec[9], pal_seed=pal, lit_boost=boost)
        def xf(p, o=o, xd=xd, yd=yd):
            return (o[0] + p[0] * xd[0] + p[1] * yd[0], o[1] + p[0] * xd[1] + p[1] * yd[1], p[2] + KERB)
        for (sx, sz, sw, sy, scol) in info['signs']:
            light = scol in ('M_Sign_Green', 'M_Sign_Red', 'M_Sign_Navy', 'M_Sign_Black')
            tm = text_mb(SR.choice(SHOPS), 0.27, sw - 0.5, 'M_Sign_Text_Light' if light else 'M_Sign_Text_Dark')
            mbl.add(tm, lambda p, sx=sx, sz=sz, sy=sy: (sx + p[0], sy - 0.014 + p[1], sz + p[2]))
        w = MB()
        w.add(mbl, xf)
        name = 'SM_Bldg_%02d_%s' % (i, info['style'])
        meshes[name] = (w, 'Buildings')
        D = rec[4]
        footprints.append(Polygon([xf((0, 0, 0))[:2], xf((L, 0, 0))[:2], xf((L, D, 0))[:2], xf((0, D, 0))[:2]]))
        yaw = math.atan2(xd[1], xd[0])
        entry = dict(name=name, style=info['style'], lot=[round(v, 2) for v in rec[:8]], seed=rec[9],
                     frame_origin=ue(xf((0, 0, 0))), frame_yaw_deg=ue_yaw(yaw), frontage_m=round(L, 2),
                     eaves_m=rec[5], top_m=round(info['top'], 2), axes=info['axes'],
                     wall=info['wall'], tris=w.ntris())
        for key in ('doors', 'gates', 'shopdoors'):
            pts = [xf((p[0], p[1] - 0.6, 0.0)) for p in info[key]]
            entry[key] = [ue(p) for p in pts]
            if key != 'gates':
                door_pts += [p[:2] for p in pts]
        for (lx, lz, lm) in info['lit']:
            p = xf((lx, 0.9, lz))
            layout['lights']['windows'].append(dict(pos=ue(p), kind='candle' if 'Candle' in lm else 'lantern', building=name))
        layout['buildings'].append(entry)
    foot = unary_union(footprints)

    # ------------------------------------------------------------ set dressing positions
    yu = GR.yaw_u()
    P = {}                                   # kind -> list of (x, y, z, yaw, scale)
    def put(kind, s, t, yaw=0.0, z=None, scale=1.0, rel=True):
        x, y = xy(s, t)
        if z is None:
            z = 0.0 if G.carriage.contains(Point(x, y)) else KERB
        P.setdefault(kind, []).append((x, y, z, (yu + yaw) if rel else yaw, scale))
        return (x, y, z)

    fires, cars = [], []
    # the dead tram on the north track
    put('tram', -36.0, 1.5, 0.0, z=0.0)
    # snowed-in cars along both kerbs
    paints = ['M_Car_Paint_A', 'M_Car_Paint_B', 'M_Car_Paint_C', 'M_Car_Paint_D']
    for s, t in [(-18, 4.5), (-11.5, 4.45), (7, 4.5),
                 (-72, -4.5), (-60, -4.45), (-30, -4.5), (-23.5, -4.4), (-2, -4.5), (33, -4.45), (58, -4.5), (64.5, -4.45)]:
        k = R.choice([0, 0, 1, 1, 2])
        kind = 'car%d_%s' % (k, R.choice(paints)[-1])
        p = put(kind, s + R.uniform(-0.4, 0.4), t + R.uniform(-0.1, 0.1), (0 if t > 0 else math.pi) + R.uniform(-0.05, 0.05), z=0.0)
        cars.append(p[:2])
    for c in data['cars']:
        x, y = tb(c[:2])
        if abs(st((x, y))[1]) > 12:                                   # the ones on the side streets, from the game data
            ln = min(G.lines, key=lambda sl: sl[1].distance(Point(x, y)))[1]
            d = ln.project(Point(x, y))
            a, b = ln.interpolate(max(0, d - 1)), ln.interpolate(min(ln.length, d + 1))
            P.setdefault('car%d_%s' % (c[3] % 3, 'ABCD'[int(c[4]) % 4]), []).append((x, y, 0.0, math.atan2(b.y - a.y, b.x - a.x), 1.0))
            cars.append((x, y))
    # barricade across the street, the first fight
    for s, t, a in [(19.0, -3.9, 0.12), (19.6, -1.2, -0.1), (24.5, 1.5, 0.1), (25.2, 4.1, -0.14), (21.8, 6.9, 1.5)]:
        put('jersey', s, t, math.pi / 2 + a, z=0.0 if abs(t) < 5.5 else KERB)
    put('sandbags', 17.2, -6.9, math.pi / 2 + 0.1)
    put('sandbags', 27.0, 7.2, math.pi / 2 - 0.15)
    put('sandbags', 22.3, 0.1, math.pi / 2, z=0.0)
    for s, t, a in [(16.0, -8.6, 0.3), (28.4, 8.9, -0.4), (20.5, 2.2, 0.1), (23.6, -2.6, 1.2)]:
        put('crate', s, t, a)
    put('crate', 16.1, -8.6, 0.5, z=KERB + 0.51, scale=0.8)
    put('pallet', 29.5, 6.2, 0.4)
    put('pallet', 15.0, -6.0, 1.1)
    fires.append(put('barrel', 21.0, 8.3))
    fires.append(put('barrel', 14.6, -7.6))
    put('floodlight', 27.5, -6.6, math.pi + 0.12)
    put('generator', 29.2, -7.6, 0.4)
    # street furniture
    put('litfass', -61.0, 8.3)
    put('litfass', 71.0, -8.6)
    for s, t in [(-49.0, 10.45), (-6.0, 10.45), (52.0, -10.45), (-44.0, -10.4)]:
        put('cabinet', s, t, 0.0 if t > 0 else math.pi)
    for i in range(9):
        put('bollard', 72.0 + i * 2.4, 6.15)
        put('bollard', 72.0 + i * 2.4, -6.15)
    # black market on Hackescher Markt
    stalls = [(84.0, 8.2, math.pi), (88.6, 8.4, math.pi), (93.4, 8.0, math.pi), (98.3, 8.5, math.pi),
              (85.5, -8.4, 0.0), (90.4, -8.1, 0.0), (95.2, -8.6, 0.0), (104.5, -3.5, math.pi / 2), (105.0, 3.0, math.pi / 2)]
    for i, (s, t, a) in enumerate(stalls):
        put('stall%d' % (i % 4), s, t, a + R.uniform(-0.06, 0.06))
    fires.append(put('barrel', 91.5, -1.6))
    fires.append(put('barrel', 100.5, 2.6))
    fires.append(put('barrel', 80.0, -4.2))
    for s, t, a in [(87.0, 2.0, 0.5), (96.0, -3.2, 1.0), (82.5, 5.6, 0.1), (99.4, 6.0, 0.9)]:
        put('crate', s, t, a)
    put('pallet', 93.0, 3.4, 0.7)
    put('generator', 101.5, -8.8, 1.2)
    # trees and lamps from the game data
    for i, t in enumerate(data['trees']):
        x, y = tb(t[:2])
        if G.carriage.buffer(0.8).contains(Point(x, y)) or foot.buffer(1.0).contains(Point(x, y)):
            continue
        P.setdefault('tree%d' % (i % 4), []).append((x, y, KERB, R.uniform(0, 6.28), 0.75 + 0.3 * t[2]))
    for i, l in enumerate(data['lamps']):
        x, y = tb(l[:2])
        ln = min(G.lines, key=lambda sl: sl[1].distance(Point(x, y)))[1]
        q = ln.interpolate(ln.project(Point(x, y)))
        P.setdefault('lamp_bin' if i % 3 == 0 else 'lamp', []).append((x, y, KERB, math.atan2(q.y - y, q.x - x), 1.0))

    BR = random.Random(21)
    paths = G.blocks.buffer(3.2)
    nb = 0
    while nb < 46:
        s_, t_ = BR.uniform(GR.S0 + 4, GR.S1 - 4), BR.uniform(GR.T0 + 4, GR.T1 - 4)
        x, y = xy(s_, t_)
        if G.parks.contains(Point(x, y)) and not paths.contains(Point(x, y)):
            P.setdefault('bush%d' % (nb % 4), []).append((x, y, KERB, BR.uniform(0, 6.28), BR.uniform(0.8, 1.3)))
            nb += 1
    fence = MB()
    from facade import railing
    near_road = G.carriage.buffer(16.0)
    for pg in GR.polys(G.parks):
        c = list(pg.exterior.coords)
        for p0, p1 in zip(c[:-1], c[1:]):
            mid = Point((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2)
            if GR.REGION.exterior.distance(mid) < 0.5 or not near_road.contains(mid):
                continue
            if math.hypot(p1[0] - p0[0], p1[1] - p0[1]) < 1.0:
                continue
            railing(fence, [(p0[0], p0[1]), (p1[0], p1[1])], KERB, h=1.25, step=0.16)
    meshes['SM_Park_Fence'] = (fence, 'Props')

    # ------------------------------------------------------------ ground
    info = G.surfaces()
    rails = G.rails()
    mask = G.paint_mask(mask_path, doors=door_pts, fires=[f[:2] for f in fires], cars=cars)
    B.GROUND_MASK = dict(path=mask_path, **mask)
    layout['ground_mask'] = dict(file='textures/' + mask['file'], channels='R snow cover, G slush, B wet bare ground',
                                 note='Top-down over the scene. u = (s - s0) / (s1 - s0), v = (t - t0) / (t1 - t0) with '
                                      's = dot(P, U), t = dot(P, V), P in scene metres (Unreal: X/100, -Y/100).',
                                 s0=GR.S0, s1=GR.S1, t0=GR.T0, t1=GR.T1, U=list(U), V=list(V))
    for k, v in info.items():
        meshes[k] = (v, 'Ground')
    meshes['SM_Ground_TramRails'] = (rails, 'Ground')
    meshes['SM_Ground_SnowBanks'] = (G.snow_banks(), 'Ground')
    cat, masts = G.catenary(foot)
    meshes['SM_Tram_Catenary'] = (cat, 'Props')
    for (x, y, a) in masts:
        P.setdefault('mast', []).append((x, y, KERB, a, 1.0))
    far = MB()
    box(far, -1600, 1600, -1600, 1600, -0.6, -0.04, 'M_Snow', skip='ulrfb')
    meshes['SM_Ground_Far'] = (far, 'Backdrop')
    via = MB()
    extrude(via, G.via, KERB, 7.9, 'M_Viaduct_Brick', 'M_Concrete')
    meshes['SM_Viaduct'] = (via, 'Backdrop')

    # ------------------------------------------------------------ backdrop city massing from the map
    bg = MB()
    used = set(tuple(r[:4]) for r, _ in recs)
    cx0, cz0 = GR.OX, GR.OZ
    for r in full['builds']:
        if tuple(r[:4]) in used:
            continue
        mx, mz = (r[0] + r[2]) / 2, (r[1] + r[3]) / 2
        if math.hypot(mx - cx0, mz - cz0) > 560:
            continue
        L, o, xd, yd = lot_frame(r)
        D = r[4]
        pg = Polygon([(o[0], o[1]), (o[0] + xd[0] * L, o[1] + xd[1] * L),
                      (o[0] + xd[0] * L + yd[0] * D, o[1] + xd[1] * L + yd[1] * D), (o[0] + yd[0] * D, o[1] + yd[1] * D)])
        extrude(bg, pg, 0.0, r[5] + 2.2, 'M_Bg_Facade', 'M_Bg_Roof')
    for m in full['masses']:
        pg = Polygon([tb(p) for p in m['p']]).buffer(0)
        if pg.centroid.distance(Point(0, 0)) < 900:
            extrude(bg, pg, 0.0, m['h'] + 1.0, 'M_Bg_Facade', 'M_Bg_Roof')
    for lm in full['landmarks']:
        if lm['id'] == 'turm' or lm['h'] < 8:
            continue
        c = tb(lm['c'])
        if math.hypot(c[0], c[1]) > 950:
            continue
        ax = (lm['ax'][0], -lm['ax'][1])
        ay = (-ax[1], ax[0])
        hw, hd = lm['w'] / 2, lm['d'] / 2
        pg = Polygon([(c[0] + ax[0] * sx * hw + ay[0] * sy * hd, c[1] + ax[1] * sx * hw + ay[1] * sy * hd)
                      for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
        extrude(bg, pg, 0.0, lm['h'] * (0.55 if lm['k'] in ('dom', 'church', 'rotunda') else 1.0), 'M_Bg_Facade', 'M_Bg_Roof')
    for v in full.get('viaSolid', []):
        pg = Polygon([tb(p) for p in v]).buffer(0).difference(GR.REGION)
        if not pg.is_empty and pg.centroid.distance(Point(0, 0)) < 900:
            extrude(bg, pg, 0.0, 7.9, 'M_Viaduct_Brick', 'M_Concrete')
    meshes['SM_Backdrop_City'] = (bg, 'Backdrop')
    turm = [l for l in full['landmarks'] if l['id'] == 'turm'][0]
    tw = MB()
    tc = tb(turm['c'])
    place(tw, PR.fernsehturm(), tc[0], tc[1])
    meshes['SM_Fernsehturm'] = (tw, 'Backdrop')
    layout['landmarks'] = [dict(name='Fernsehturm', base=ue((tc[0], tc[1], 0)), height_m=368)]
    for zz, rr in ((238.2, 6.1), (248.2, 4.7), (300.0, 1.9), (366.0, 0.9)):
        layout['lights']['beacons'].append(dict(pos=ue((tc[0], tc[1], zz)), radius_m=rr, color='#ff2010'))

    # ------------------------------------------------------------ lights that are also geometry
    fest = MB()
    spans = [((60.0, 10.7, 6.6), (64.0, -10.7, 6.2)), ((70.0, -10.7, 6.4), (75.0, 10.7, 6.8)),
             ((82.5, 9.4, 3.9), (86.5, -9.6, 3.9)), ((86.5, -9.6, 3.9), (91.5, 9.6, 4.0)), ((91.5, 9.6, 4.0), (96.5, -9.8, 3.9)),
             ((96.5, -9.8, 3.9), (101.5, 9.7, 4.0)), ((101.5, 9.7, 4.0), (106.0, -6.5, 3.8)), ((82.5, 9.4, 3.9), (101.5, 9.7, 4.0)),
             ((86.5, -9.6, 3.9), (96.5, -9.8, 3.9))]
    poles = set()
    for a, b in spans:
        pa, pb = xy(a[0], a[1]) + (a[2],), xy(b[0], b[1]) + (b[2],)
        ln = math.hypot(pa[0] - pb[0], pa[1] - pb[1])
        fm, bulbs = PR.festoon(pa, pb, sag=0.035 * ln, n=max(6, int(ln / 0.9)))
        fest.add(fm)
        layout['lights']['bulbs'].append(dict(a=ue(pa), b=ue(pb), count=len(bulbs), color='#ffb45a',
                                              points=[ue(p) for p in bulbs]))
        for e in (a, b):
            if abs(e[1]) < 10.5 and e[2] < 5:
                poles.add(e)
    for e in poles:
        x, y = xy(e[0], e[1])
        box(fest, x - 0.04, x + 0.04, y - 0.04, y + 0.04, KERB, e[2] + 0.1, 'M_Wood_Raw', skip='u')
    meshes['SM_Festoon_Lights'] = (fest, 'Props')
    bm = MB()
    mis = [s_ for s_ in data['sites'] if s_['k'] == 'mission'][0]
    saf = [s_ for s_ in data['sites'] if s_['k'] == 'safe'][0]
    mp, sp = tb(mis['p']), tb(saf['p'])
    place(bm, PR.beam(0.18, 5.0, 420.0, 'M_Beam_Amber'), mp[0], mp[1])
    place(bm, PR.beam(0.14, 3.5, 420.0, 'M_Beam_Cyan'), sp[0], sp[1])
    meshes['SM_Sky_Beams'] = (bm, 'Props')
    layout['lights']['beams'] = [dict(pos=ue((mp[0], mp[1], 0)), color='#ffb040', site=mis['n'], kind='mission'),
                                 dict(pos=ue((sp[0], sp[1], 0)), color='#7fdcff', site=saf['n'], kind='safehouse')]
    for f in fires:
        layout['lights']['fires'].append(dict(pos=ue((f[0], f[1], f[2] + 0.95)), color='#ff7a1e'))

    # ------------------------------------------------------------ props: one local mesh per kind, one merged world mesh
    def proto(kind, part='all'):
        if kind.startswith('car'):
            return PR.car(int(kind[3]), 'M_Car_Paint_' + kind[-1], seed=ord(kind[-1]), part=part)
        if kind.startswith('bush'):
            return PR.bush(seed=int(kind[4]) + 1)
        if kind.startswith('stall'):
            return PR.stall(seed=int(kind[5]) + 3)
        if kind.startswith('tree'):
            return PR.tree(seed=int(kind[4]) + 2, height=12.0 + int(kind[4]))
        return dict(tram=PR.tram, jersey=PR.jersey, sandbags=PR.sandbags, crate=PR.crate, pallet=PR.pallet,
                    barrel=PR.barrel, floodlight=PR.floodlight, generator=PR.generator, banner=PR.banner,
                    litfass=PR.litfass, cabinet=PR.cabinet, bollard=PR.bollard, lamp=PR.lamp,
                    lamp_bin=lambda: PR.lamp(True), mast=GR.mast)[kind]()
    protos = {}
    groups = {}
    for kind, inst in sorted(P.items()):
        pm = proto(kind)
        protos[kind] = pm
        if kind.startswith('car'):
            for part in ('body', 'wheels', 'snow'):
                w = groups.setdefault(dict(body='CarBodies', wheels='CarWheels', snow='CarSnow')[part], MB())
                pp = proto(kind, part)
                for (x, y, z, yaw, sc_) in inst:
                    place(w, pp, x, y, z, yaw, sc_)
        else:
            grp = 'Trees' if kind.startswith('tree') else ('Stalls' if kind.startswith('stall') else
                   ('Lamps' if kind.startswith('lamp') else ('Bushes' if kind.startswith('bush') else kind.capitalize())))
            w = groups.setdefault(grp, MB())
            for (x, y, z, yaw, sc_) in inst:
                place(w, pm, x, y, z, yaw, sc_)
        layout['props'][kind] = [dict(pos=ue((x, y, z)), yaw_deg=ue_yaw(yaw), scale=round(sc_, 3)) for (x, y, z, yaw, sc_) in inst]
    for grp, w in groups.items():
        meshes['SM_Props_' + grp] = (w, 'Props')
    for (x, y, z, yaw, _) in P.get('floodlight', []):
        layout['lights']['floods'].append(dict(pos=ue((x, y, z + 2.45)), yaw_deg=ue_yaw(yaw), pitch_deg=-8, color='#dfeaff'))

    # ------------------------------------------------------------ bookmarks
    def look(name, s, t, z, s2, t2, z2, lens):
        a, b = xy(s, t), xy(s2, t2)
        layout['bookmarks'].append(dict(name=name, pos=ue((a[0], a[1], z)), look_at=ue((b[0], b[1], z2)), lens_mm=lens,
                                        scene_pos=[a[0], a[1], z], scene_look=[b[0], b[1], z2]))
    look('street_west', -86.0, -2.6, 1.75, 40.0, 0.5, 9.0, 26)
    look('barricade', -1.0, -1.9, 1.7, 30.0, 0.2, 3.6, 35)
    look('market', 63.0, 1.8, 1.7, 110.0, -0.5, 8.0, 24)
    look('tram', -66.0, 3.3, 1.65, -34.0, 1.3, 3.6, 35)
    look('sunset', 52.0, -0.4, 1.7, -40.0, -0.5, 6.5, 28)
    ps = xy(-84.0, -2.0)
    layout['player_start'] = dict(pos=ue((ps[0], ps[1], 1.0)), yaw_deg=ue_yaw(GR.yaw_u()))
    layout['sun'] = dict(compass_bearing_deg=250, elevation_deg=4, note='Low winter sun from the west-south-west, behind the player start.')

    # ------------------------------------------------------------ into Blender
    cols = {}
    stats = {}
    for name, (m, cname) in meshes.items():
        if not m.f:
            continue
        if cname not in cols:
            cols[cname] = bpy.data.collections.new(cname)
            sc.collection.children.link(cols[cname])
        ob = B.mb_to_object(m, name, cols[cname])
        if name in ('SM_Props_CarBodies', 'SM_Props_CarSnow'):
            md = ob.modifiers.new('Subdivision', 'SUBSURF')
            md.levels = 2
            md.render_levels = 2
        stats[name] = m.ntris()
    layout['meshes'] = stats
    layout['triangles_total'] = sum(stats.values())
    return sc, layout, protos
