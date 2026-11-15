# extracts chosen notes and drum sounds from a SoundFont 3 (Ogg-compressed samples) into raw/<name>.f32 (mono, 44.1 kHz) and
# raw/manifest.json: for a note its natural pitch (root key less the zone's tuning and the sample's correction), for a drum the rate the
# kit plays it at (applied here)
import sys, os, json, subprocess, numpy as np  # usage: python3 -I extract.py FluidR3Mono_GM.sf3 raw   (then build_modes.py raw out)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sf3
SF, OUT = sys.argv[1], sys.argv[2]
d = sf3.parse(SF); blob = open(SF, 'rb').read(); so, ss = d['smpl']
def preset(bank, prog):
    for p in d['presets']:
        if p['bank'] == bank and p['prog'] == prog: return p
    raise SystemExit('no preset %d:%d' % (bank, prog))
def zone_for(p, key, vel=100):
    for pz in p['zones']:
        if not (pz['keys'][0] <= key <= pz['keys'][1] and pz['vels'][0] <= vel <= pz['vels'][1]): continue
        for z in d['insts'][pz['inst']]['zones']:
            if z['keys'][0] <= key <= z['keys'][1] and z['vels'][0] <= vel <= z['vels'][1]: return z
    return None
def decode(z):
    data = blob[so + z['start']: so + z['end']]
    r = subprocess.run(['ffmpeg', '-nostdin', '-loglevel', 'error', '-f', 'ogg', '-i', 'pipe:0', '-f', 'f32le', '-ac', '1', '-ar', '44100', 'pipe:1'], input=data, capture_output=True, check=True)
    return np.frombuffer(r.stdout, dtype=np.float32).copy(), z['sr']
man = {}
NOTES = {'fbass': (0, 33, [28, 31, 33, 35, 38, 40, 43, 45, 47, 50, 52]), 'slap': (0, 36, [28, 31, 33, 35, 38, 40, 43, 45, 47, 50]),
         'pbass': (0, 34, [28, 31, 33, 35, 38, 40, 43, 45, 47, 50]), 'ubass': (0, 32, [28, 31, 33, 35, 38, 40, 43, 45, 47, 50]),
         'clav': (0, 7, [48, 52, 55, 57, 59, 62, 64, 67, 69, 71, 74, 76]), 'ep': (0, 4, [48, 52, 55, 57, 59, 62, 64, 67, 69, 71, 74, 76, 79, 83]),
         'mgtr': (0, 28, [40, 43, 45, 47, 50, 52, 55, 57, 59, 62, 64]), 'gtr': (0, 27, [52, 55, 57, 59, 62, 64, 67, 69, 71, 74, 76, 79])}
for bank, (b, prog, keys) in NOTES.items():
    p = preset(b, prog); seen = {}
    for k in keys:
        z = zone_for(p, k)
        if z is None or z['sample'] in seen: continue
        x, sr = decode(z)
        nat = z['root'] - (z['coarse'] + z['fine'] / 100.0 + z['corr'] / 100.0)
        name = '%s_%d' % (bank, z['root']); seen[z['sample']] = name
        x.tofile(os.path.join(OUT, name + '.f32'))
        man[name] = {'bank': bank, 'pitch': round(nat, 2), 'root': z['root'], 'secs': round(len(x) / 44100.0, 2), 'loop': z['loop'], 'modes': z['modes'], 'sname': z['sname']}
KITS = {'std': (128, 0, {'kick': 36, 'snare': 38, 'xs': 37, 'snare2': 40, 'hh': 42, 'hhp': 44, 'hho': 46, 'ride': 51, 'bell': 53, 'tamb': 54, 'cow': 56, 'clapk': 39}),
        'k808': (128, 25, {'kick': 36, 'snare': 38, 'xs': 37, 'clap': 39, 'hh': 42, 'hho': 46, 'cow': 56}),
        'brush': (128, 40, {'kick': 36, 'tap': 38, 'slap': 40, 'hh': 42, 'hhp': 44, 'ride': 51})}
for kit, (b, prog, ks) in KITS.items():
    p = preset(b, prog)
    for nm, k in ks.items():
        z = zone_for(p, k)
        if z is None: print('no', kit, nm); continue
        x, sr = decode(z)
        rate = 2 ** ((k - z['root'] + z['coarse'] + z['fine'] / 100.0 + z['corr'] / 100.0) / 12.0)
        if abs(rate - 1) > 1e-3:
            n = int(len(x) / rate); x = np.interp(np.arange(n) * rate, np.arange(len(x)), x).astype(np.float32)
        name = '%s_%s' % (kit, nm); x.tofile(os.path.join(OUT, name + '.f32'))
        man[name] = {'bank': kit, 'rate': round(rate, 4), 'secs': round(len(x) / 44100.0, 2), 'sname': z['sname'], 'atten': z['atten']}
json.dump(man, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1)
for k, v in man.items(): print('%-12s %s' % (k, {a: v[a] for a in v if a in ('pitch', 'secs', 'rate', 'sname', 'loop')}))
