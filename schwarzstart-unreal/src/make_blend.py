import sys, time, json
sys.path.insert(0, '/home/claude/work/unreal-kit/src')
import bpy
import assemble
t0 = time.time()
sc, layout, protos = assemble.build(preview=True)
json.dump(layout, open('/home/claude/work/unreal-kit/tmp/layout_preview.json', 'w'), indent=1)
bpy.ops.wm.save_as_mainfile(filepath='/home/claude/work/unreal-kit/tmp/street.blend')
print('built in %.1fs' % (time.time() - t0), 'tris', layout['triangles_total'], 'buildings', len(layout['buildings']))
big = sorted(layout['meshes'].items(), key=lambda kv: -kv[1])[:8]
print(big)
print({k: len(v) for k, v in layout['props'].items()})
