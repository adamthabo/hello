"""Blender-side helpers: turn builder meshes into objects, make preview shaders, set up Cycles."""
import math
import bpy
import bmesh
from mb import srgb
from palette import PALETTE

TEX_DIR = '/home/claude/schwarz/schwarzstart/public/assets/tex'
_mats = {}
PREVIEW = True        # False -> flat export materials only
GROUND_MASK = None    # set by assemble.build(): dict(path, s0, s1, t0, t1, u, v)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _mats.clear()
    return bpy.context.scene


def lin(hexcol):
    return srgb(hexcol)


# ------------------------------------------------------------------ meshes

def mb_to_object(mb, name, collection=None, weld=None):
    me = bpy.data.meshes.new(name)
    me.from_pydata(mb.v, [], mb.f)
    for mname in mb.mats:
        me.materials.append(get_mat(mname))
    me.polygons.foreach_set('material_index', mb.fm)
    me.polygons.foreach_set('use_smooth', mb.sm)
    uvl = me.uv_layers.new(name='UVMap')
    flat = [c for face in mb.uv for p in face for c in p]
    uvl.data.foreach_set('uv', flat)
    me.update()
    if weld is None:
        weld = any(mb.sm)
    if weld:
        bm = bmesh.new()
        bm.from_mesh(me)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0005)
        bm.to_mesh(me)
        bm.free()
        me.update()
    ob = bpy.data.objects.new(name, me)
    (collection or bpy.context.scene.collection).objects.link(ob)
    return ob


# ------------------------------------------------------------------ materials

def _flat(name, spec):
    """Plain glTF-friendly material: what gets exported."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = lin(spec['base'])
    p.inputs['Roughness'].default_value = spec['rough']
    p.inputs['Metallic'].default_value = spec['metal']
    if 'emit' in spec:
        p.inputs['Emission Color'].default_value = lin(spec['emit'])
        p.inputs['Emission Strength'].default_value = spec.get('emit_strength', 1.0)
    if spec.get('alpha', 1.0) < 1.0:
        p.inputs['Alpha'].default_value = spec['alpha']
        try:
            m.surface_render_method = 'BLENDED'
        except Exception:
            pass
    m.use_backface_culling = True
    return m


class NT:
    """Tiny node-tree helper."""

    def __init__(self, mat):
        self.t = mat.node_tree
        self.n = self.t.nodes
        self.l = self.t.links
        self.out = [x for x in self.n if x.type == 'OUTPUT_MATERIAL'][0]
        self.bsdf = self.n.get('Principled BSDF')

    def node(self, kind, **props):
        nd = self.n.new(kind)
        for k, v in props.items():
            if k.startswith('in_'):
                nd.inputs[k[3:].replace('_', ' ')].default_value = v
            else:
                setattr(nd, k, v)
        return nd

    def link(self, a, b):
        self.l.new(a, b)

    def math(self, op, a, b=None, clamp=False):
        nd = self.n.new('ShaderNodeMath')
        nd.operation = op
        nd.use_clamp = clamp
        for i, v in enumerate((a, b)):
            if v is None:
                continue
            if isinstance(v, (int, float)):
                nd.inputs[i].default_value = v
            else:
                self.l.new(v, nd.inputs[i])
        return nd.outputs[0]

    def mix(self, fac, a, b, blend='MIX'):
        nd = self.n.new('ShaderNodeMix')
        nd.data_type = 'RGBA'
        nd.blend_type = blend
        nd.clamp_factor = True
        for sock, v in ((nd.inputs[0], fac), (nd.inputs[6], a), (nd.inputs[7], b)):
            if isinstance(v, (int, float)):
                sock.default_value = v
            elif isinstance(v, tuple):
                sock.default_value = v
            else:
                self.l.new(v, sock)
        return nd.outputs[2]

    def ramp(self, fac, stops):
        nd = self.n.new('ShaderNodeValToRGB')
        el = nd.color_ramp.elements
        el[0].position, el[0].color = stops[0]
        el[1].position, el[1].color = stops[-1]
        for pos, col in stops[1:-1]:
            e = el.new(pos)
            e.color = col
        self.l.new(fac, nd.inputs[0])
        return nd.outputs[0]

    def noise(self, vec, scale, detail=4.0, rough=0.55, dims='3D'):
        nd = self.n.new('ShaderNodeTexNoise')
        nd.noise_dimensions = dims
        nd.inputs['Scale'].default_value = scale
        nd.inputs['Detail'].default_value = detail
        nd.inputs['Roughness'].default_value = rough
        if vec is not None:
            self.l.new(vec, nd.inputs['Vector'])
        return nd.outputs[0]

    def geom(self):
        g = self.n.get('Geometry') or self.n.new('ShaderNodeNewGeometry')
        return g

    def pos(self):
        return self.geom().outputs['Position']

    def sep(self, vec):
        nd = self.n.new('ShaderNodeSeparateXYZ')
        self.l.new(vec, nd.inputs[0])
        return nd.outputs

    def uv(self):
        nd = self.n.get('UV Map') or self.n.new('ShaderNodeUVMap')
        return nd.outputs[0]

    def mapping(self, vec, scale=(1, 1, 1), rot=(0, 0, 0)):
        nd = self.n.new('ShaderNodeMapping')
        nd.inputs['Scale'].default_value = scale
        nd.inputs['Rotation'].default_value = rot
        self.l.new(vec, nd.inputs['Vector'])
        return nd.outputs[0]

    def image(self, fname, vec, colorspace='sRGB'):
        nd = self.n.new('ShaderNodeTexImage')
        img = bpy.data.images.get(fname) or bpy.data.images.load(TEX_DIR + '/' + fname)
        img.colorspace_settings.name = colorspace
        nd.image = img
        self.l.new(vec, nd.inputs[0])
        return nd.outputs[0]

    def bump(self, height, strength=0.3, dist=0.02):
        nd = self.n.new('ShaderNodeBump')
        nd.inputs['Strength'].default_value = strength
        nd.inputs['Distance'].default_value = dist
        self.l.new(height, nd.inputs['Height'])
        return nd.outputs[0]


def _snow_and_dirt(nt, col, rough, spec, snow=1.0, dirt=1.0, lo=0.5, hi=0.72):
    """Shared weathering: grime in crevices and near the ground, damp streaks, snow on up-facing faces."""
    pos = nt.pos()
    g = nt.geom()
    x, y, z = nt.sep(pos)
    big = nt.noise(pos, 0.35, 5.0, 0.6)
    fine = nt.noise(pos, 6.0, 3.0, 0.6)
    if dirt > 0:
        # splash zone near pavement
        low = nt.math('SUBTRACT', 1.0, nt.math('DIVIDE', z, 2.2), clamp=True)
        low = nt.math('MULTIPLY', nt.math('POWER', low, 2.0), nt.math('ADD', big, 0.25))
        col = nt.mix(nt.math('MULTIPLY', low, 0.55 * dirt, clamp=True), col, (0.035, 0.032, 0.03, 1))
        # large blotches
        blot = nt.ramp(big, [(0.38, (0, 0, 0, 1)), (0.7, (1, 1, 1, 1))])
        col = nt.mix(nt.math('MULTIPLY', blot, 0.22 * dirt), col, (0.06, 0.055, 0.05, 1), blend='MULTIPLY')
        # vertical streaks
        st = nt.n.new('ShaderNodeTexNoise')
        st.inputs['Scale'].default_value = 1.0
        st.inputs['Detail'].default_value = 3.0
        mp = nt.mapping(pos, scale=(2.2, 2.2, 0.12))
        nt.link(mp, st.inputs['Vector'])
        streak = nt.ramp(st.outputs[0], [(0.5, (0, 0, 0, 1)), (0.75, (1, 1, 1, 1))])
        col = nt.mix(nt.math('MULTIPLY', streak, 0.3 * dirt), col, (0.08, 0.075, 0.07, 1), blend='MULTIPLY')
        ao = nt.n.new('ShaderNodeAmbientOcclusion')
        ao.inputs['Distance'].default_value = 0.35
        ao.samples = 4
        col = nt.mix(nt.math('MULTIPLY', nt.math('SUBTRACT', 1.0, ao.outputs['AO']), 0.8 * dirt, clamp=True), col,
                     (0.03, 0.028, 0.026, 1))
    if snow > 0:
        nz = nt.sep(g.outputs['Normal'])[2]
        m = nt.math('ADD', nz, nt.math('MULTIPLY', nt.math('SUBTRACT', fine, 0.5), 0.25))
        mask = nt.ramp(m, [(lo, (0, 0, 0, 1)), (hi, (1, 1, 1, 1))])
        mask = nt.math('MULTIPLY', mask, snow, clamp=True)
        sn = nt.mix(nt.noise(pos, 2.0, 2.0), (0.80, 0.84, 0.90, 1), (0.9, 0.92, 0.95, 1))
        col = nt.mix(mask, col, sn)
        if not isinstance(rough, (int, float)):
            rough = nt.mix(mask, rough, 0.65)
        else:
            rr = nt.n.new('ShaderNodeMix')
            rr.data_type = 'FLOAT'
            rr.inputs[2].default_value = rough
            rr.inputs[3].default_value = 0.65
            nt.link(mask, rr.inputs[0])
            rough = rr.outputs[0]
    return col, rough


def _preview(name, spec):
    """Procedural look for the Cycles stills. Unreal gets scanned surfaces instead."""
    m = _flat(name, spec)
    kind = spec.get('kind', '')
    nt = NT(m)
    b = nt.bsdf
    base = lin(spec['base'])
    pos = nt.pos()
    uv = nt.uv()
    col = None
    rough = spec['rough']
    height = None
    bstr = 0.3

    def var(scale, amt, c=base):
        nz = nt.noise(pos, scale, 6.0, 0.6)
        lo = tuple(v * (1 - amt) for v in c[:3]) + (1,)
        hi = tuple(min(1, v * (1 + amt)) for v in c[:3]) + (1,)
        return nt.mix(nz, lo, hi), nz

    if kind in ('plaster', 'stucco', 'plaster_old', 'ashlar', 'stone', 'concrete', 'paint', 'sign', 'wood', 'cloth',
                'rooftile', 'metal', 'firewall', 'brick', 'brick_arch', 'poster', 'bark', 'carpaint', 'shutter',
                'rubber', 'lampglass', 'rail', 'signtext'):
        amt = {'plaster': 0.1, 'stucco': 0.06, 'plaster_old': 0.22, 'concrete': 0.18, 'stone': 0.14, 'firewall': 0.2,
               'paint': 0.05, 'wood': 0.2, 'cloth': 0.08, 'metal': 0.1}.get(kind, 0.1)
        col, nz = var(0.8 if kind != 'wood' else 3.0, amt)
        fine = nt.noise(pos, 60.0 if kind in ('plaster', 'stucco', 'plaster_old', 'concrete', 'firewall') else 25.0, 3.0, 0.7)
        height = fine
        bstr = {'plaster': 0.25, 'stucco': 0.12, 'plaster_old': 0.5, 'concrete': 0.4, 'firewall': 0.5}.get(kind, 0.1)
        if kind in ('brick', 'brick_arch', 'firewall'):
            br = nt.n.new('ShaderNodeTexBrick')
            br.offset = 0.5
            br.inputs['Scale'].default_value = 1.0
            br.inputs['Brick Width'].default_value = 0.25
            br.inputs['Row Height'].default_value = 0.077
            br.inputs['Mortar Size'].default_value = 0.012
            br.inputs['Mortar Smooth'].default_value = 0.2
            br.inputs['Bias'].default_value = -0.2
            c1 = tuple(v * 0.75 for v in base[:3]) + (1,)
            c2 = tuple(min(1, v * 1.25) for v in base[:3]) + (1,)
            br.inputs['Color1'].default_value = c1
            br.inputs['Color2'].default_value = c2
            br.inputs['Mortar'].default_value = (0.32, 0.30, 0.27, 1) if kind != 'firewall' else (0.25, 0.23, 0.21, 1)
            if kind == 'brick_arch':
                nt.link(nt.mapping(uv, rot=(0, 0, math.pi / 2)), br.inputs['Vector'])
            else:
                nt.link(uv, br.inputs['Vector'])
            col = nt.mix(0.35, br.outputs['Color'], col, blend='MULTIPLY')
            col = nt.mix(0.5, col, br.outputs['Color'])
            height = nt.math('SUBTRACT', 1.0, br.outputs['Fac'])
            bstr = 0.6
            if kind == 'firewall':
                patch = nt.ramp(nt.noise(pos, 0.25, 4.0, 0.6), [(0.48, (0, 0, 0, 1)), (0.56, (1, 1, 1, 1))])
                col = nt.mix(patch, col, (0.42, 0.40, 0.37, 1))
        elif kind == 'plaster_old':
            # patches where the render has fallen off and brick shows
            br = nt.n.new('ShaderNodeTexBrick')
            br.offset = 0.5
            br.inputs['Brick Width'].default_value = 0.25
            br.inputs['Row Height'].default_value = 0.077
            br.inputs['Mortar Size'].default_value = 0.012
            br.inputs['Color1'].default_value = (0.25, 0.09, 0.06, 1)
            br.inputs['Color2'].default_value = (0.36, 0.15, 0.10, 1)
            br.inputs['Mortar'].default_value = (0.3, 0.28, 0.25, 1)
            nt.link(uv, br.inputs['Vector'])
            patch = nt.ramp(nt.noise(pos, 0.55, 6.0, 0.65), [(0.63, (0, 0, 0, 1)), (0.66, (1, 1, 1, 1))])
            col = nt.mix(patch, col, br.outputs['Color'])
        elif kind == 'ashlar':
            br = nt.n.new('ShaderNodeTexBrick')
            br.offset = 0.5
            br.inputs['Brick Width'].default_value = 1.2
            br.inputs['Row Height'].default_value = 0.6
            br.inputs['Mortar Size'].default_value = 0.006
            br.inputs['Color1'].default_value = tuple(v * 0.93 for v in base[:3]) + (1,)
            br.inputs['Color2'].default_value = tuple(min(1, v * 1.05) for v in base[:3]) + (1,)
            br.inputs['Mortar'].default_value = (0.2, 0.2, 0.19, 1)
            nt.link(uv, br.inputs['Vector'])
            col = nt.mix(0.6, col, br.outputs['Color'])
            height = nt.math('SUBTRACT', 1.0, br.outputs['Fac'])
            bstr = 0.5
        elif kind == 'rooftile':
            br = nt.n.new('ShaderNodeTexBrick')
            br.offset = 0.5
            br.inputs['Brick Width'].default_value = 0.17
            br.inputs['Row Height'].default_value = 0.14
            br.inputs['Mortar Size'].default_value = 0.012
            br.inputs['Color1'].default_value = tuple(v * 0.7 for v in base[:3]) + (1,)
            br.inputs['Color2'].default_value = tuple(min(1, v * 1.2) for v in base[:3]) + (1,)
            br.inputs['Mortar'].default_value = tuple(v * 0.3 for v in base[:3]) + (1,)
            nt.link(uv, br.inputs['Vector'])
            col = br.outputs['Color']
            height = nt.math('SUBTRACT', 1.0, br.outputs['Fac'])
            bstr = 0.8
        elif kind == 'shutter':
            wv = nt.n.new('ShaderNodeTexWave')
            wv.wave_type = 'BANDS'
            wv.bands_direction = 'Y'
            wv.inputs['Scale'].default_value = 13.0
            wv.inputs['Distortion'].default_value = 0.0
            nt.link(uv, wv.inputs['Vector'])
            height = wv.outputs['Fac']
            bstr = 1.0
        elif kind == 'wood':
            mp = nt.mapping(pos, scale=(1.0, 1.0, 0.08))
            grain = nt.noise(mp, 40.0, 4.0, 0.6)
            col = nt.mix(nt.math('MULTIPLY', grain, 0.5), col, tuple(v * 0.45 for v in base[:3]) + (1,))
            height = grain
            bstr = 0.25
        elif kind == 'poster':
            u_, v_, _w = nt.sep(uv)
            cell = nt.n.new('ShaderNodeCombineXYZ')
            nt.link(nt.math('FLOOR', nt.math('DIVIDE', u_, 0.43)), cell.inputs[0])
            nt.link(nt.math('FLOOR', nt.math('DIVIDE', v_, 0.61)), cell.inputs[1])
            wn = nt.n.new('ShaderNodeTexWhiteNoise')
            wn.noise_dimensions = '2D'
            nt.link(cell.outputs[0], wn.inputs['Vector'])
            hsv = nt.n.new('ShaderNodeHueSaturation')
            hsv.inputs['Saturation'].default_value = 0.4
            hsv.inputs['Value'].default_value = 0.42
            nt.link(wn.outputs['Color'], hsv.inputs['Color'])
            paper = nt.mix(nt.math('MULTIPLY', wn.outputs['Value'], 0.7), (0.5, 0.48, 0.42, 1), hsv.outputs['Color'])
            fu = nt.math('FRACT', nt.math('DIVIDE', u_, 0.43))
            fv = nt.math('FRACT', nt.math('DIVIDE', v_, 0.61))
            edge = nt.math('MULTIPLY', nt.math('MULTIPLY', nt.math('GREATER_THAN', fu, 0.04), nt.math('LESS_THAN', fu, 0.96)),
                           nt.math('MULTIPLY', nt.math('GREATER_THAN', fv, 0.03), nt.math('LESS_THAN', fv, 0.97)))
            col = nt.mix(edge, (0.5, 0.48, 0.42, 1), paper)
            torn = nt.ramp(nt.noise(pos, 2.2, 5.0, 0.7), [(0.6, (0, 0, 0, 1)), (0.64, (1, 1, 1, 1))])
            col = nt.mix(torn, col, (0.42, 0.40, 0.36, 1))
        if kind in ('paint', 'sign', 'carpaint'):
            chip = nt.ramp(nt.noise(pos, 9.0, 5.0, 0.7), [(0.68, (0, 0, 0, 1)), (0.72, (1, 1, 1, 1))])
            col = nt.mix(nt.math('MULTIPLY', chip, 0.35), col, (0.12, 0.10, 0.08, 1))
        dirt = {'paint': 0.5, 'sign': 0.5, 'metal': 0.6, 'cloth': 0.3, 'carpaint': 0.5, 'lampglass': 0.2, 'rail': 0.0,
                'signtext': 0.3}.get(kind, 1.0)
        snow = 0.0 if kind in ('rail', 'signtext') else 1.0
        if kind == 'carpaint':
            frost = nt.ramp(nt.noise(pos, 5.0, 5.0, 0.7), [(0.35, (0, 0, 0, 1)), (0.75, (1, 1, 1, 1))])
            col = nt.mix(nt.math('MULTIPLY', frost, 0.55), col, (0.72, 0.76, 0.82, 1))
            col, rough = _snow_and_dirt(nt, col, rough, spec, snow=snow, dirt=dirt, lo=0.1, hi=0.38)
        else:
            col, rough = _snow_and_dirt(nt, col, rough, spec, snow=snow, dirt=dirt)
    elif kind == 'glass':
        # cheap architectural glass: mirror by Fresnel over a see-through pane
        gl = nt.node('ShaderNodeBsdfGlossy')
        gl.inputs['Roughness'].default_value = 0.02
        gl.inputs['Color'].default_value = (0.85, 0.9, 0.95, 1)
        tr = nt.node('ShaderNodeBsdfTransparent')
        frost = nt.ramp(nt.noise(nt.pos(), 1.3, 5.0, 0.7), [(0.45, (0.55, 0.6, 0.62, 1)), (0.75, (0.95, 0.97, 1, 1))])
        nt.link(frost, tr.inputs['Color'])
        fr = nt.node('ShaderNodeFresnel')
        fr.inputs['IOR'].default_value = 1.5
        fac = nt.math('ADD', nt.math('MULTIPLY', fr.outputs[0], 1.6), 0.10, clamp=True)
        mx = nt.node('ShaderNodeMixShader')
        nt.link(fac, mx.inputs[0])
        nt.link(tr.outputs[0], mx.inputs[1])
        nt.link(gl.outputs[0], mx.inputs[2])
        nt.link(mx.outputs[0], nt.out.inputs['Surface'])
        return m
    elif kind in ('snow', 'snow_dirty'):
        nz = nt.noise(pos, 1.5, 6.0, 0.6)
        lo = (0.70, 0.75, 0.82, 1) if kind == 'snow' else (0.52, 0.54, 0.57, 1)
        hi = (0.90, 0.92, 0.95, 1) if kind == 'snow' else (0.80, 0.82, 0.85, 1)
        col = nt.mix(nz, lo, hi)
        if kind == 'snow_dirty':
            grit = nt.ramp(nt.noise(pos, 25.0, 4.0, 0.7), [(0.55, (0, 0, 0, 1)), (0.7, (1, 1, 1, 1))])
            col = nt.mix(nt.math('MULTIPLY', grit, 0.3), col, (0.16, 0.15, 0.14, 1))
        height = nt.math('ADD', nt.noise(pos, 4.0, 5.0, 0.6), nt.math('MULTIPLY', nt.noise(pos, 40.0, 2.0), 0.15))
        bstr = 0.6
        rough = 0.7
    elif kind in ('interior', 'interior_lit', 'fire', 'bulb', 'beam'):
        if kind == 'beam':
            em = nt.node('ShaderNodeEmission')
            em.inputs['Color'].default_value = lin(spec['emit'])
            em.inputs['Strength'].default_value = spec['emit_strength']
            tr = nt.node('ShaderNodeBsdfTransparent')
            lw = nt.node('ShaderNodeLayerWeight')
            lw.inputs['Blend'].default_value = 0.35
            fac = nt.math('MULTIPLY', nt.math('SUBTRACT', 1.0, lw.outputs['Facing']), spec.get('alpha', 0.2), clamp=True)
            z = nt.sep(pos)[2]
            fade = nt.math('SUBTRACT', 1.0, nt.math('DIVIDE', z, 420.0), clamp=True)
            fac = nt.math('MULTIPLY', fac, nt.math('POWER', fade, 1.5))
            mx = nt.node('ShaderNodeMixShader')
            nt.link(fac, mx.inputs[0])
            nt.link(tr.outputs[0], mx.inputs[1])
            nt.link(em.outputs[0], mx.inputs[2])
            nt.link(mx.outputs[0], nt.out.inputs['Surface'])
            m.use_backface_culling = False
        elif kind == 'fire':
            fl = nt.ramp(nt.noise(pos, 9.0, 4.0, 0.7), [(0.3, (1.0, 0.16, 0.02, 1)), (0.7, (1.0, 0.62, 0.15, 1))])
            nt.link(fl, b.inputs['Emission Color'])
        return m
    else:
        return m

    if kind in ('asphalt', 'cobble', 'paving'):
        pass
    if col is not None:
        nt.link(col, b.inputs['Base Color'])
    if not isinstance(rough, (int, float)):
        nt.link(rough, b.inputs['Roughness'])
    else:
        b.inputs['Roughness'].default_value = rough
    if height is not None:
        nt.link(nt.bump(height, bstr, 0.01), b.inputs['Normal'])
    if spec.get('alpha', 1.0) < 1.0:
        b.inputs['Alpha'].default_value = spec['alpha']
    return m


def _ground(m, spec, kind):
    """Road and pavement: scanned albedo from the game, snow and slush from the top-down mask."""
    gm = GROUND_MASK
    nt = NT(m)
    b = nt.bsdf
    pos = nt.pos()

    def dot(v):
        nd = nt.n.new('ShaderNodeVectorMath')
        nd.operation = 'DOT_PRODUCT'
        nt.link(pos, nd.inputs[0])
        nd.inputs[1].default_value = (v[0], v[1], 0.0)
        return nd.outputs['Value']

    def comb(x, y):
        nd = nt.n.new('ShaderNodeCombineXYZ')
        nt.link(x, nd.inputs[0])
        nt.link(y, nd.inputs[1])
        return nd.outputs[0]

    s, t = dot(gm['u']), dot(gm['v'])
    mu = nt.math('DIVIDE', nt.math('SUBTRACT', s, gm['s0']), gm['s1'] - gm['s0'])
    mv = nt.math('DIVIDE', nt.math('SUBTRACT', t, gm['t0']), gm['t1'] - gm['t0'])
    mi = nt.n.new('ShaderNodeTexImage')
    img = bpy.data.images.get('T_Ground_SnowMask') or bpy.data.images.load(gm['path'])
    img.name = 'T_Ground_SnowMask'
    img.colorspace_settings.name = 'Non-Color'
    mi.image = img
    mi.extension = 'EXTEND'
    nt.link(comb(mu, mv), mi.inputs[0])
    sepc = nt.n.new('ShaderNodeSeparateColor')
    nt.link(mi.outputs[0], sepc.inputs[0])
    snow, slush, wet = sepc.outputs[0], sepc.outputs[1], sepc.outputs[2]
    tex, tile = {'asphalt': ('asphalt_a.jpg', 5.0), 'cobble': ('cobble_a.jpg', 3.0), 'paving': ('paving_a.jpg', 4.0),
                 'kerb': ('concrete_a.jpg', 5.0)}[kind]
    alb = nt.image(tex, comb(nt.math('DIVIDE', s, tile), nt.math('DIVIDE', t, tile)))
    damp = nt.math('SUBTRACT', 0.8, nt.math('MULTIPLY', wet, 0.38))
    bare = nt.mix(1.0, alb, comb(damp, damp), blend='MULTIPLY')
    bare_mul = nt.n.new('ShaderNodeVectorMath')
    bare_mul.operation = 'SCALE'
    nt.link(alb, bare_mul.inputs[0])
    nt.link(damp, bare_mul.inputs['Scale'])
    bare = bare_mul.outputs[0]
    edge = nt.math('ADD', snow, nt.math('MULTIPLY', nt.math('SUBTRACT', nt.noise(pos, 3.0, 5.0, 0.65), 0.5), 0.3))
    sfac = nt.ramp(edge, [(0.40, (0, 0, 0, 1)), (0.58, (1, 1, 1, 1))])
    scol = nt.mix(slush, (0.80, 0.84, 0.90, 1), (0.40, 0.39, 0.38, 1))
    col = nt.mix(sfac, bare, scol)
    r_bare = nt.math('SUBTRACT', 0.78 if kind != 'asphalt' else 0.72, nt.math('MULTIPLY', wet, 0.42 if kind != 'asphalt' else 0.5))
    rr = nt.n.new('ShaderNodeMix')
    rr.data_type = 'FLOAT'
    nt.link(sfac, rr.inputs[0])
    nt.link(r_bare, rr.inputs[2])
    rr.inputs[3].default_value = 0.7
    bw = nt.n.new('ShaderNodeRGBToBW')
    nt.link(alb, bw.inputs[0])
    h = nt.math('ADD', nt.math('MULTIPLY', sfac, 0.7),
                nt.math('ADD', nt.math('MULTIPLY', bw.outputs[0], 0.25), nt.math('MULTIPLY', nt.noise(pos, 22.0, 3.0, 0.6), 0.18)))
    nt.link(col, b.inputs['Base Color'])
    nt.link(rr.outputs[0], b.inputs['Roughness'])
    nt.link(nt.bump(h, 0.5, 0.03), b.inputs['Normal'])
    return m


def _backdrop(m, spec, kind):
    nt = NT(m)
    b = nt.bsdf
    pos = nt.pos()
    uv = nt.uv()
    if kind == 'viaduct':
        col = nt.image('viaduct_a.jpg', nt.mapping(uv, scale=(1 / 8.0, 1 / 7.5, 1)))
        col, rough = _snow_and_dirt(nt, col, 0.9, spec)
        nt.link(col, b.inputs['Base Color'])
        nt.link(rough, b.inputs['Roughness'])
        return m
    if kind == 'bgroof':
        col = nt.mix(nt.noise(pos, 0.05, 3.0), (0.62, 0.66, 0.72, 1), (0.80, 0.83, 0.88, 1))
        nt.link(col, b.inputs['Base Color'])
        return m
    u, v, _ = nt.sep(uv)
    fu = nt.math('FRACT', nt.math('DIVIDE', u, 3.3))
    fv = nt.math('FRACT', nt.math('DIVIDE', v, 3.6))
    wx = nt.math('MULTIPLY', nt.math('GREATER_THAN', fu, 0.32), nt.math('LESS_THAN', fu, 0.68))
    wz = nt.math('MULTIPLY', nt.math('GREATER_THAN', fv, 0.3), nt.math('LESS_THAN', fv, 0.78))
    win = nt.math('MULTIPLY', wx, wz)
    wall = nt.mix(nt.noise(pos, 0.03, 2.0), (0.17, 0.155, 0.13, 1), (0.33, 0.30, 0.26, 1))
    col = nt.mix(win, wall, (0.03, 0.035, 0.045, 1))
    nt.link(col, b.inputs['Base Color'])
    rr = nt.n.new('ShaderNodeMix')
    rr.data_type = 'FLOAT'
    nt.link(win, rr.inputs[0])
    rr.inputs[2].default_value = 0.9
    rr.inputs[3].default_value = 0.1
    nt.link(rr.outputs[0], b.inputs['Roughness'])
    return m


def get_mat(name):
    if name in _mats:
        return _mats[name]
    if name not in PALETTE:
        raise KeyError('material not in palette: ' + name)
    spec = PALETTE[name]
    kind = spec.get('kind', '')
    if not PREVIEW:
        m = _flat(name, spec)
    elif kind in ('asphalt', 'cobble', 'paving', 'kerb') and GROUND_MASK:
        m = _ground(_flat(name, spec), spec, kind)
    elif kind in ('viaduct', 'bgfacade', 'bgroof'):
        m = _backdrop(_flat(name, spec), spec, kind)
    else:
        m = _preview(name, spec)
    _mats[name] = m
    return m


# ------------------------------------------------------------------ scene

def setup_cycles(scene, w=1280, h=720, samples=48, threads=2):
    scene.render.engine = 'CYCLES'
    c = scene.cycles
    c.device = 'CPU'
    c.samples = samples
    c.use_adaptive_sampling = True
    c.adaptive_threshold = 0.03
    c.max_bounces = 5
    c.diffuse_bounces = 2
    c.glossy_bounces = 3
    c.transmission_bounces = 4
    c.transparent_max_bounces = 8
    c.volume_bounces = 0
    c.caustics_reflective = False
    c.caustics_refractive = False
    c.sample_clamp_indirect = 6.0
    c.sample_clamp_direct = 0.0
    try:
        c.use_denoising = True
        c.denoiser = 'OPENIMAGEDENOISE'
        c.denoising_input_passes = 'RGB_ALBEDO_NORMAL'
    except Exception as e:
        print('denoise setup failed', e)
    scene.render.resolution_x = w
    scene.render.resolution_y = h
    scene.render.resolution_percentage = 100
    scene.render.threads_mode = 'FIXED'
    scene.render.threads = threads
    scene.render.use_persistent_data = False
    return c


def sky_world(scene, elev_deg=3.0, az_deg=250.0, strength=1.0, sun_intensity=1.0, air=1.0, dust=1.5, ozone=1.0):
    """Physical sky. az is a compass bearing (0 north, 90 east) of the sun; +Y is north in the scene."""
    w = bpy.data.worlds.new('Sky')
    w.use_nodes = True
    scene.world = w
    nt = w.node_tree
    bg = nt.nodes.get('Background')
    sky = nt.nodes.new('ShaderNodeTexSky')
    try:
        sky.sky_type = 'MULTIPLE_SCATTERING'
    except Exception:
        sky.sky_type = 'SINGLE_SCATTERING'
    sky.sun_elevation = math.radians(elev_deg)
    # measured: with +Y as north, sun_rotation equals the compass bearing of the sun
    sky.sun_rotation = math.radians(az_deg)
    sky.sun_intensity = sun_intensity
    sky.sun_disc = True
    sky.air_density = air
    sky.aerosol_density = dust
    sky.ozone_density = ozone
    nt.links.new(sky.outputs[0], bg.inputs[0])
    bg.inputs[1].default_value = strength
    return sky


def camera(scene, loc, look, lens=28.0, name='Cam'):
    cam = bpy.data.cameras.new(name)
    cam.lens = lens
    cam.sensor_width = 36.0
    cam.clip_start = 0.1
    cam.clip_end = 3000.0
    ob = bpy.data.objects.new(name, cam)
    scene.collection.objects.link(ob)
    ob.location = loc
    import mathutils
    d = mathutils.Vector(look) - mathutils.Vector(loc)
    ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    scene.camera = ob
    return ob
