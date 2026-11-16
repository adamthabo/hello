"""Runs unreal/build_street.py against a stand-in for Unreal's Python module.
This checks the script's own logic and that it finds every key it reads in the layout. It does not test Unreal."""
import sys, types, json, os
from unittest import mock
KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
u = types.ModuleType('unreal')
calls = []
u.log = lambda m: calls.append(('log', m))
u.log_warning = lambda m: calls.append(('warn', m))
class Vector:
    def __init__(self, x=0, y=0, z=0): self.x, self.y, self.z = x, y, z
class Rotator:
    def __init__(self, roll=0, pitch=0, yaw=0): self.roll, self.pitch, self.yaw = roll, pitch, yaw
class LinearColor:
    def __init__(self, r, g, b, a): pass
class StaticMesh:
    def __init__(self, name, b): self._n, self._b = name, b
    def get_name(self): return self._n
    def get_bounding_box(self):
        bx = mock.MagicMock(); bx.min = Vector(*self._b['min']); bx.max = Vector(*self._b['max']); return bx
u.Vector, u.Rotator, u.LinearColor, u.StaticMesh = Vector, Rotator, LinearColor, StaticMesh
layout = json.load(open(os.path.join(KIT, 'layout', 'street_layout.json'), encoding='utf-8'))
store = {n: StaticMesh(n, layout['mesh_bounds_unreal_cm'][n]) for n in layout['meshes']}
eal = mock.MagicMock(); eal.list_assets.return_value = list(store); eal.load_asset.side_effect = lambda p: store[p]
u.EditorAssetLibrary = eal
u.Paths = mock.MagicMock(); u.Paths.project_dir.return_value = '/tmp/proj/'; u.Paths.convert_relative_path_to_full.side_effect = lambda p: p
for n in ('AssetImportTask', 'AssetToolsHelpers', 'EditorActorSubsystem', 'LevelEditorSubsystem', 'DirectionalLight', 'DirectionalLightComponent',
          'SkyAtmosphere', 'SkyLight', 'SkyLightComponent', 'ExponentialHeightFog', 'ExponentialHeightFogComponent', 'VolumetricCloud',
          'PostProcessVolume', 'PointLight', 'PointLightComponent', 'SpotLight', 'SpotLightComponent', 'PlayerStart', 'CineCameraActor',
          'MathLibrary', 'ComponentMobility'):
    setattr(u, n, mock.MagicMock(name=n))
subs = mock.MagicMock(); u.get_editor_subsystem = lambda cls: subs
sys.modules['unreal'] = u
src = open(os.path.join(KIT, 'unreal', 'build_street.py')).read().replace("KIT = None ", "KIT = %r #" % KIT, 1)
exec(compile(src, 'build_street.py', 'exec'), {'__name__': 'standin'})
warns = [m for t, m in calls if t == 'warn']
print('warnings:', len(warns), warns[:3])
print('meshes placed:', subs.spawn_actor_from_object.call_count, 'of', len(layout['meshes']), '| other actors:', subs.spawn_actor_from_class.call_count)
assert not warns and subs.spawn_actor_from_object.call_count == len(layout['meshes'])
print('OK')
