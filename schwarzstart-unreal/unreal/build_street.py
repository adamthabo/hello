"""SCHWARZSTART - Oranienburger Strasse look test: build the level inside the Unreal Editor.

NOT YET RUN IN UNREAL. It was written without an editor to test against; expect to fix a line or two.
Every step is wrapped so that one failing call is reported and the rest still runs.

How to run (Unreal Editor 5.8, Python Editor Script Plugin enabled, which it is by default):
  1. Copy the whole unreal-kit folder next to your .uproject (or anywhere) and set KIT below if it is not found.
  2. Tools > Execute Python Script... and pick this file.
     Or in the Output Log, switch the box from Cmd to Python and type:  exec(open(r"/path/to/unreal-kit/unreal/build_street.py").read())

What it does:
  - imports meshes/SCHWARZSTART_OranienburgerStr.glb into /Game/Schwarzstart/Street (skipped if already there)
  - makes a new level and places every mesh at the world origin (positions are baked into the meshes)
  - checks each mesh's bounds against layout/street_layout.json and says so if they do not match
  - adds the low winter sun, sky, sky light, height fog with volumetric fog, a post-process volume,
    fire, bulb and work-light lights, a player start and four camera bookmarks

Units: Unreal centimetres. X = east, Y = south, Z = up. The origin is the middle of the street.
"""
import json
import math
import os

import unreal

KIT = None                       # set to the unreal-kit folder if the search below does not find it
DEST = '/Game/Schwarzstart/Street'
LEVEL = '/Game/Schwarzstart/Maps/L_OranienburgerStr'
SCENE_GLB = 'meshes/SCHWARZSTART_OranienburgerStr.glb'


def log(msg):
    unreal.log('[schwarzstart] ' + str(msg))


def warn(msg):
    unreal.log_warning('[schwarzstart] ' + str(msg))


def attempt(label, fn, *a, **k):
    try:
        return fn(*a, **k)
    except Exception as e:                                   # report and carry on
        warn('%s failed: %s' % (label, e))
        return None


def find_kit():
    cands = []
    if KIT:
        cands.append(KIT)
    try:
        cands.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    except NameError:
        pass
    proj = unreal.Paths.convert_relative_path_to_full(unreal.Paths.project_dir())
    up = os.path.dirname(proj.rstrip('/\\'))
    cands += [os.path.join(d, n) for d in (proj, up) for n in ('unreal-kit', 'schwarzstart-unreal')]
    for c in cands:
        if c and os.path.exists(os.path.join(c, 'layout', 'street_layout.json')):
            return c
    raise RuntimeError('unreal-kit folder not found. Set KIT at the top of build_street.py.')


def vec(p):
    return unreal.Vector(float(p[0]), float(p[1]), float(p[2]))


def rot(pitch=0.0, yaw=0.0, roll=0.0):
    return unreal.Rotator(roll=float(roll), pitch=float(pitch), yaw=float(yaw))


def color(hexcol):
    h = hexcol.lstrip('#')
    return unreal.LinearColor(int(h[0:2], 16) / 255.0, int(h[2:4], 16) / 255.0, int(h[4:6], 16) / 255.0, 1.0)


def static_meshes():
    out = {}
    for path in unreal.EditorAssetLibrary.list_assets(DEST, recursive=True, include_folder=False):
        asset = unreal.EditorAssetLibrary.load_asset(path)
        if isinstance(asset, unreal.StaticMesh):
            out[asset.get_name()] = asset
    return out


def import_scene(kit):
    task = unreal.AssetImportTask()
    task.set_editor_property('filename', os.path.join(kit, SCENE_GLB))
    task.set_editor_property('destination_path', DEST)
    task.set_editor_property('automated', True)
    task.set_editor_property('replace_existing', True)
    task.set_editor_property('save', True)
    unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks([task])


def spawn(cls, location, rotation=None, label=None, folder=None):
    eas = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    actor = eas.spawn_actor_from_class(cls, location, rotation or rot())
    if actor and label:
        attempt('label', actor.set_actor_label, label)
    if actor and folder:
        attempt('folder', actor.set_folder_path, folder)
    return actor


def comp(actor, cls):
    return actor.get_component_by_class(cls) if actor else None


def setp(obj, name, value):
    if obj is None:
        return
    try:
        obj.set_editor_property(name, value)
    except Exception as e:
        warn('could not set %s on %s: %s' % (name, obj.get_name(), e))


def folder_for(name):
    for key, f in (('SM_Bldg', 'Street/Buildings'), ('SM_Ground', 'Street/Ground'), ('SM_Props', 'Street/Props'),
                   ('SM_Backdrop', 'Street/Backdrop'), ('SM_Fernsehturm', 'Street/Backdrop'), ('SM_Viaduct', 'Street/Backdrop')):
        if name.startswith(key):
            return f
    return 'Street/Props'


def main():
    kit = find_kit()
    layout = json.load(open(os.path.join(kit, 'layout', 'street_layout.json'), encoding='utf-8'))
    log('kit: ' + kit)

    # ---- 1. meshes
    meshes = static_meshes()
    if not meshes:
        log('importing the scene GLB (a few minutes)...')
        attempt('import', import_scene, kit)
        meshes = static_meshes()
    if not meshes:
        warn('No static meshes under %s. Import %s by hand (drag it into the Content Browser, keep the defaults, '
             'Import All) and run this script again.' % (DEST, SCENE_GLB))
        return
    log('%d static meshes available' % len(meshes))

    # ---- 2. level
    les = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
    if not attempt('new level', les.new_level, LEVEL):
        warn('Using the level that is open now.')

    # ---- 3. place everything at the origin and check the bounds
    eas = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    bounds = layout.get('mesh_bounds_unreal_cm', {})
    bad = []
    for want in sorted(layout['meshes']):
        match = meshes.get(want) or next((m for n, m in meshes.items() if want in n), None)
        if not match:
            warn('mesh missing after import: ' + want)
            continue
        actor = eas.spawn_actor_from_object(match, unreal.Vector(0, 0, 0), rot())
        if actor:
            attempt('label', actor.set_actor_label, want)
            attempt('folder', actor.set_folder_path, folder_for(want))
        b = bounds.get(want)
        if b:
            box = match.get_bounding_box()
            got = [box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z]
            exp = b['min'] + b['max']
            if max(abs(g - e) for g, e in zip(got, exp)) > 80.0:
                bad.append((want, [round(g) for g in got], exp))
    if bad:
        warn('%d meshes are not where the layout expects them. First one: %s got %s expected %s. '
             'If all of them are off, the importer did not bake positions or used other axes: import the GLB with '
             'File > Import Into Level instead, then run this script again.' % (len(bad), bad[0][0], bad[0][1], bad[0][2]))
    else:
        log('all mesh bounds match the layout')

    # ---- 4. sun, sky, fog, post
    sun = layout.get('sun', dict(compass_bearing_deg=250, elevation_deg=4))
    b, el = math.radians(sun['compass_bearing_deg']), sun['elevation_deg']
    yaw = math.degrees(math.atan2(math.cos(b), -math.sin(b)))          # light travels away from the sun; +Y is south
    d = spawn(unreal.DirectionalLight, unreal.Vector(0, 0, 3000), rot(pitch=-el, yaw=yaw), 'Sun', 'Lighting')
    dc = comp(d, unreal.DirectionalLightComponent)
    setp(dc, 'intensity', 6.0)
    setp(dc, 'atmosphere_sun_light', True)
    setp(dc, 'mobility', unreal.ComponentMobility.MOVABLE)
    spawn(unreal.SkyAtmosphere, unreal.Vector(0, 0, 0), None, 'SkyAtmosphere', 'Lighting')
    sl = spawn(unreal.SkyLight, unreal.Vector(0, 0, 2000), None, 'SkyLight', 'Lighting')
    sc = comp(sl, unreal.SkyLightComponent)
    setp(sc, 'real_time_capture', True)
    setp(sc, 'mobility', unreal.ComponentMobility.MOVABLE)
    fog = spawn(unreal.ExponentialHeightFog, unreal.Vector(0, 0, 200), None, 'HeightFog', 'Lighting')
    fc = comp(fog, unreal.ExponentialHeightFogComponent)
    if fc:
        attempt('fog density', fc.set_fog_density, 0.035)
        attempt('fog falloff', fc.set_fog_height_falloff, 0.12)
        attempt('volumetric fog', fc.set_volumetric_fog, True)
    attempt('clouds', spawn, unreal.VolumetricCloud, unreal.Vector(0, 0, 0), None, 'Clouds', 'Lighting')
    ppv = spawn(unreal.PostProcessVolume, unreal.Vector(0, 0, 0), None, 'PostProcess', 'Lighting')
    if ppv:
        setp(ppv, 'unbound', True)
        s = attempt('pp settings', ppv.get_editor_property, 'settings')
        if s:
            for key, val in (('override_auto_exposure_bias', True), ('auto_exposure_bias', -0.6),
                             ('override_bloom_intensity', True), ('bloom_intensity', 1.2),
                             ('override_vignette_intensity', True), ('vignette_intensity', 0.45)):
                setp(s, key, val)
            setp(ppv, 'settings', s)

    # ---- 5. practical lights
    L = layout['lights']
    for i, f in enumerate(L['fires']):
        a = spawn(unreal.PointLight, vec(f['pos']), None, 'Fire_%02d' % i, 'Lighting/Fires')
        c = comp(a, unreal.PointLightComponent)
        setp(c, 'intensity', 9000.0)
        setp(c, 'attenuation_radius', 1800.0)
        setp(c, 'source_radius', 25.0)
        if c:
            attempt('fire colour', c.set_light_color, color(f['color']))
    for i, f in enumerate(L['bulbs']):
        pts = f['points']
        for j in range(1, len(pts), 4):                      # one light for every four bulbs
            a = spawn(unreal.PointLight, vec(pts[j]), None, 'Bulbs_%02d_%02d' % (i, j), 'Lighting/Bulbs')
            c = comp(a, unreal.PointLightComponent)
            setp(c, 'intensity', 500.0)
            setp(c, 'attenuation_radius', 700.0)
            setp(c, 'cast_shadows', False)
            if c:
                attempt('bulb colour', c.set_light_color, color(f['color']))
    for i, f in enumerate(L['floods']):
        a = spawn(unreal.SpotLight, vec(f['pos']), rot(pitch=f['pitch_deg'], yaw=f['yaw_deg']), 'Floodlight_%02d' % i, 'Lighting')
        c = comp(a, unreal.SpotLightComponent)
        setp(c, 'intensity', 60000.0)
        setp(c, 'attenuation_radius', 4500.0)
        setp(c, 'outer_cone_angle', 48.0)
        setp(c, 'inner_cone_angle', 20.0)
        if c:
            attempt('flood colour', c.set_light_color, color(f['color']))

    # ---- 6. player start and camera bookmarks
    ps = layout['player_start']
    spawn(unreal.PlayerStart, vec([ps['pos'][0], ps['pos'][1], ps['pos'][2] + 100.0]), rot(yaw=ps['yaw_deg']), 'PlayerStart', 'Gameplay')
    for bm in layout['bookmarks']:
        r = unreal.MathLibrary.find_look_at_rotation(vec(bm['pos']), vec(bm['look_at']))
        cam = spawn(unreal.CineCameraActor, vec(bm['pos']), r, 'Cam_' + bm['name'], 'Cameras')
        cc = attempt('camera component', cam.get_cine_camera_component) if cam else None
        setp(cc, 'current_focal_length', float(bm['lens_mm']))

    attempt('save level', les.save_current_level)
    log('done. Pilot Cam_street_west (right-click the camera > Pilot) to stand where the first still was taken.')
    log('next: swap the flat colours for scanned surfaces, see data/materials.json and FAB_LIST.md')


main()
