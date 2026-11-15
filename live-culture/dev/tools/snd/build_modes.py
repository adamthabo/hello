# builds the modes' banks of recorded sounds (15 Nov) the same way build_bank.py builds Mix's first ones: one short MP3 a bank, each
# sound in its own slot (a little silence, the sound, silence), and modes_bank.json with each bank's slot and its sounds.
# The sounds come from FluidR3Mono_GM.sf3 (MuseScore's copy of Frank Wen's Fluid R3 soundfont, mono by Michael Cowgill; MIT licence:
# github.com/musescore/MuseScore, tag 3.6.2, share/sound/), drawn out note by note by extract.py into raw/<name>.f32 (mono, 44.1 kHz)
# with raw/manifest.json (each note's own pitch, worked out from the soundfont's root key and tuning and checked by its spectrum).
# usage: python3 -I build_modes.py <raw folder> <out folder>
import numpy as np, json, subprocess, sys, os
SR = 44100; PRE = .06
RAW, OUT = sys.argv[1], sys.argv[2]
M = json.load(open(os.path.join(RAW, 'manifest.json')))
B = {
 'kit':   {'len': .9, 'kind': 'hit', 'sounds': [['kick', 'std_kick'], ['snare', 'std_snare'], ['xs', 'std_xs'], ['hh', 'std_hh'], ['hho', 'std_hho'],
            ['hhp', 'std_hhp'], ['ride', 'std_ride'], ['tamb', 'std_tamb'], ['cow', 'std_cow'], ['btap', 'brush_tap']]},
 'k808':  {'len': .8, 'kind': 'hit', 'sounds': [['k8', 'k808_kick'], ['s8', 'k808_snare'], ['c8', 'k808_clap'], ['h8', 'k808_hh'], ['o8', 'k808_hho'], ['b8', 'k808_cow']]},
 'fbass': {'len': 1.8, 'kind': 'note', 'sounds': ['fbass_28', 'fbass_32', 'fbass_34', 'fbass_36', 'fbass_39', 'fbass_41', 'fbass_43', 'fbass_48']},
 'slap':  {'len': 1.4, 'kind': 'note', 'sounds': ['slap_28', 'slap_32', 'slap_35', 'slap_39', 'slap_41', 'slap_43', 'slap_48']},
 'pbass': {'len': 1.0, 'kind': 'note', 'sounds': ['pbass_28', 'pbass_32', 'pbass_34', 'pbass_36', 'pbass_39', 'pbass_41', 'pbass_43', 'pbass_48']},
 'ubass': {'len': 1.2, 'kind': 'note', 'sounds': ['ubass_28', 'ubass_36', 'ubass_41', 'ubass_46', 'ubass_54']},
 'clav':  {'len': .42, 'kind': 'note', 'ext': .09, 'sounds': ['clav_48', 'clav_55', 'clav_60', 'clav_67', 'clav_72', 'clav_79']},
 'ep':    {'len': 2.2, 'kind': 'note', 'sounds': ['ep_48', 'ep_55', 'ep_60', 'ep_67', 'ep_72', 'ep_79', 'ep_84']},
 'mgtr':  {'len': .6, 'kind': 'note', 'sounds': ['mgtr_40', 'mgtr_43', 'mgtr_45', 'mgtr_48', 'mgtr_50', 'mgtr_54', 'mgtr_55', 'mgtr_62', 'mgtr_65']},
 'gtr':   {'len': 1.6, 'kind': 'note', 'sounds': ['gtr_50', 'gtr_55', 'gtr_59', 'gtr_64', 'gtr_69', 'gtr_71', 'gtr_76', 'gtr_79']},
}
def extend(x, loop, L, tau):
    # a note shorter than its slot carries on round the soundfont's own loop, dying away (as the soundfont itself plays it)
    n = int(L * SR)
    if len(x) >= n: return x
    ls, le = int(loop[0]), min(int(loop[1]), len(x))
    if le - ls < 32: ls, le = max(0, len(x) - 400), len(x)
    out = np.zeros(n, dtype=np.float32); out[:len(x)] = x; i = len(x); seg = x[ls:le]
    while i < n:
        k = min(len(seg), n - i); out[i:i + k] = seg[:k]; i += k
    t = np.arange(n - len(x)) / SR; out[len(x):] *= np.exp(-t / tau).astype(np.float32)
    return out
os.makedirs(OUT, exist_ok=True); man = {}
for bank, b in B.items():
    L = b['len']; slot = PRE + L + .06; n = int(round(slot * SR)); buf = np.zeros(n * len(b['sounds']), dtype=np.float32); items = []
    for i, s in enumerate(b['sounds']):
        name, stem = (s if isinstance(s, list) else [s, s])
        x = np.fromfile(os.path.join(RAW, stem + '.f32'), dtype=np.float32)
        a = np.abs(x); on = max(0, int(np.argmax(a > a.max() * .02)) - 64); x = x[on:].copy()
        if b.get('ext'): x = extend(x, [v - on for v in M[stem]['loop']], L, b['ext'])
        x = x[:int(L * SR)].copy(); m = len(x); f = int(m * .35)
        x[m - f:] *= (.5 + .5 * np.cos(np.linspace(0, np.pi, f))).astype(np.float32)   # a gentle fade over the last third
        if b['kind'] == 'note':   # even loudness across the range, by the first quarter second (a tenth for the short clavinet)
            w = int((.1 if L < .5 else .25) * SR); r = np.sqrt(np.mean(x[:w] ** 2)); x *= .18 / max(r, 1e-6)
        else: x *= .9 / max(np.abs(x).max(), 1e-6)
        x = np.clip(x, -.98, .98); o = i * n + int(PRE * SR); buf[o:o + m] = x
        items.append([name.split('_')[0] if b['kind'] == 'note' else name, M[stem]['pitch']] if b['kind'] == 'note' else name)
    raw = os.path.join(OUT, bank + '.f32'); buf.tofile(raw)
    subprocess.run(['ffmpeg', '-nostdin', '-loglevel', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', raw, '-codec:a', 'libmp3lame', '-q:a', '4', os.path.join(OUT, bank + '.mp3')], check=True)
    os.remove(raw)
    man[bank] = {'slot': round(slot, 4), 'kind': b['kind'], 'sounds': items if b['kind'] == 'hit' else [p for _, p in items]}
    print('%-6s %2d sounds, slot %.2f s, %6.1f KB' % (bank, len(items), slot, os.path.getsize(os.path.join(OUT, bank + '.mp3')) / 1024))
json.dump(man, open(os.path.join(OUT, 'modes_bank.json'), 'w'), separators=(',', ':'))
print(json.dumps(man))
