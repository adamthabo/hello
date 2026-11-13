#!/usr/bin/env python3
"""Writes levels from a JSON file (a list of levels, as tools/place_rings.py --write makes) into src/11-drift.js, between
/*LEVELS-BEGIN*/ and /*LEVELS-END*/, one level a line. Keys kept, in this order: name src wind walls prisms drains cups give par tank
tip sol bad (anything else in the file, such as `want`, is left out).
usage: python3 tools/set_levels.py levels.json"""
import json, os, sys
L = json.load(open(sys.argv[1]))
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', '11-drift.js'); s = open(p).read()
a = s.index('/*LEVELS-BEGIN*/') + len('/*LEVELS-BEGIN*/'); b = s.index('/*LEVELS-END*/')
def js(v):
    if isinstance(v, str): return "'" + v.replace('\\', '\\\\').replace("'", "\\'") + "'"
    return json.dumps(v, separators=(',', ':'), ensure_ascii=False).replace('"', "'")
rows = []
for l in L:
    parts = []
    for k in ['name', 'src', 'wind', 'walls', 'prisms', 'drains', 'cups', 'give', 'par', 'tank', 'tip', 'sol', 'bad']:
        if k not in l or l[k] is None: continue
        v = l[k]
        parts.append(k + ':' + ('{' + ','.join(kk + ':' + json.dumps(vv, separators=(',', ':')) for kk, vv in v.items()) + '}' if k == 'give' else js(v)))
    rows.append('    {' + ','.join(parts) + '}')
s = s[:a] + '\n' + ',\n'.join(rows) + '\n    ' + s[b:]
open(p, 'w').write(s)
print('levels written:', len(L))
