"""Writes the Unreal-ready files: one scene GLB with everything in place, one GLB per reusable prop,
the layout JSON and the material table. Then re-opens the scene GLB and checks it."""
import sys, os, json, math
sys.path.insert(0, '/home/claude/work/unreal-kit/src')
import bpy
import bl_util as B
import assemble
import props as PR
from palette import PALETTE

KIT = '/home/claude/work/unreal-kit'
os.makedirs(KIT + '/meshes/props', exist_ok=True)
os.makedirs(KIT + '/data', exist_ok=True)
sc, layout, protos = assemble.build(preview=False)
GL = dict(export_format='GLB', export_apply=True, export_yup=True, export_cameras=False, export_lights=False,
          export_extras=False, export_animations=False, export_skins=False, export_morph=False)

scene_glb = KIT + '/meshes/SCHWARZSTART_OranienburgerStr.glb'
bpy.ops.export_scene.gltf(filepath=scene_glb, use_selection=False, **GL)
names = sorted(o.name for o in bpy.data.objects if o.type == 'MESH')
mats = sorted({s.material.name for o in bpy.data.objects if o.type == 'MESH' for s in o.material_slots if s.material})
bounds = {}
for o in bpy.data.objects:
    if o.type == 'MESH':
        bb = [o.matrix_world @ __import__('mathutils').Vector(c) for c in o.bound_box]
        mn = [min(v[i] for v in bb) for i in range(3)]
        mx = [max(v[i] for v in bb) for i in range(3)]
        # Unreal: X = x*100, Y = -y*100, Z = z*100
        bounds[o.name] = dict(min=[round(mn[0] * 100), round(-mx[1] * 100), round(mn[2] * 100)],
                              max=[round(mx[0] * 100), round(-mn[1] * 100), round(mx[2] * 100)])
layout['mesh_bounds_unreal_cm'] = bounds
layout['materials_used'] = mats

# ---- reusable props, each around its own origin
prop_files = {}
for kind in sorted(protos):
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o)
    obs = []
    if kind.startswith('car'):
        for part in ('body', 'snow', 'wheels'):
            m = PR.car(int(kind[3]), 'M_Car_Paint_' + kind[-1], seed=ord(kind[-1]), part=part)
            ob = B.mb_to_object(m, 'SM_%s_%s' % (kind, part))
            if part != 'wheels':
                md = ob.modifiers.new('Subdivision', 'SUBSURF'); md.levels = 2; md.render_levels = 2
            obs.append(ob)
    else:
        obs.append(B.mb_to_object(protos[kind], 'SM_' + kind))
    fn = 'meshes/props/SM_%s.glb' % kind
    bpy.ops.export_scene.gltf(filepath=KIT + '/' + fn, use_selection=False, **GL)
    prop_files[kind] = fn
layout['prop_files'] = prop_files
json.dump(layout, open(KIT + '/layout/street_layout.json', 'w'), indent=1, ensure_ascii=False)
json.dump(PALETTE, open(KIT + '/data/materials.json', 'w'), indent=1, ensure_ascii=False)

# ---- check: re-open the scene GLB in an empty file and compare
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=scene_glb)
got = sorted(o.name for o in bpy.data.objects if o.type == 'MESH')
tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.data.objects if o.type == 'MESH')
gm = sorted({s.material.name for o in bpy.data.objects if o.type == 'MESH' for s in o.material_slots if s.material})
import mathutils
bb = [o.matrix_world @ mathutils.Vector(c) for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('SM_Bldg') for c in o.bound_box]
print('SCENE GLB %.1f MB' % (os.path.getsize(scene_glb) / 1e6))
print('objects written', len(names), 'read back', len(got), 'same names', names == got)
print('triangles read back', tris, '(builder count before car smoothing: %d)' % layout['triangles_total'])
print('materials written', len(mats), 'read back', len(gm), 'missing', sorted(set(mats) - set(gm))[:5])
print('building bounds m', [round(min(v[i] for v in bb), 1) for i in range(3)], [round(max(v[i] for v in bb), 1) for i in range(3)])
no_uv = [o.name for o in bpy.data.objects if o.type == 'MESH' and not o.data.uv_layers]
print('meshes without UVs', no_uv)
print('prop files', len(prop_files), 'total %.1f MB' % (sum(os.path.getsize(KIT + '/' + f) for f in prop_files.values()) / 1e6))
