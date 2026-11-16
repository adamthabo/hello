"""Shows faces that point the wrong way (they would be invisible in Unreal): front = green, back = red."""
import sys, json, math
sys.path.insert(0, '/home/claude/work/unreal-kit/src')
import bpy, numpy as np
import bl_util as B
import assemble
sc, layout, protos = assemble.build(preview=False, mask_path='/home/claude/work/unreal-kit/tmp/mask_check.png')
m = bpy.data.materials.new('dbg'); m.use_nodes = True
nt = m.node_tree
for n in list(nt.nodes):
    if n.type != 'OUTPUT_MATERIAL':
        nt.nodes.remove(n)
out = [n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'][0]
g = nt.nodes.new('ShaderNodeNewGeometry')
mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
mix.inputs[6].default_value = (0, 1, 0, 1); mix.inputs[7].default_value = (1, 0, 0, 1)
em = nt.nodes.new('ShaderNodeEmission')
nt.links.new(g.outputs['Backfacing'], mix.inputs[0]); nt.links.new(mix.outputs[2], em.inputs[0]); nt.links.new(em.outputs[0], out.inputs[0])
sc.view_layers[0].material_override = m
for o in bpy.data.objects:
    if o.name.startswith(('SM_Sky_Beams', 'SM_Props_Stalls', 'SM_Festoon')):
        o.hide_render = True
B.setup_cycles(sc, 640, 360, samples=2)
sc.cycles.use_denoising = False
sc.view_settings.view_transform = 'Standard'
w = bpy.data.worlds.new('w'); sc.world = w
res = {}
views = [(b['name'], b['scene_pos'], b['scene_look'], b['lens_mm']) for b in layout['bookmarks']]
views += [('over1', (-150, -150, 120), (10, -5, 0), 30), ('over2', (160, 120, 110), (0, 0, 0), 30), ('roofs', (0, -60, 70), (0, 10, 15), 20),
          ('north_low', (-20, 4, 1.7), (-40, 11, 6), 20), ('south_low', (10, -4, 1.7), (40, -11, 6), 20)]
for name, pos, look, lens in views:
    for o in [o for o in bpy.data.objects if o.type == 'CAMERA']:
        bpy.data.objects.remove(o)
    B.camera(sc, pos, look, lens=lens)
    sc.render.filepath = '/home/claude/work/unreal-kit/tmp/wind_%s.png' % name
    sc.render.image_settings.file_format = 'PNG'
    bpy.ops.render.render(write_still=True)
    img = bpy.data.images.load(sc.render.filepath)
    a = np.array(img.pixels[:]).reshape(360, 640, 4)
    red = (a[..., 0] > 0.5) & (a[..., 1] < 0.4)
    res[name] = round(float(red.mean()) * 100, 2)
print('RED PERCENT', res)
