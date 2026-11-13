#!/usr/bin/env python3
"""Where a level's rings go, worked out from the readings tools/t_place.js wrote (no water is run here).

For each draft and each ring colour it wants, every point of the map is tried as a ring: its fill is worked out from the readings by
the page's own rule (fill += dt * fk * (k * match - f0), kept between 0 and 1, where k scales the ink), once for the draft's solution
and once for nothing built. A good place fills soon with the solution, stays well short with nothing, is not on top of anything, and
still fills when the ring is a little off (its neighbours fill too). The best places are printed; with --write, the first one of each
colour becomes the level's ring and the tank is set to about 1.6 times the solution's time (so the solution leaves a third of it).

usage: python3 tools/place_rings.py drafts.json raw1.json [raw2.json ...] [--k 1] [--fk 4] [--f0 .04] [--none .35] [--write out.json]
       [--pick L:colour:n ...]   (take the n-th place, from 1, for that level's colour instead of the first)
       [--tankx 1.6]             (the tank, as a multiple of the solution's time)
       [--drift L:dx:dy:seconds] (try level L's rings drifting so)
A draft with `drift`: [dx, dy, seconds] has rings that drift that far and back (as cups[3..5] in the page): each place is then tried
as where the ring starts, its fill worked out along its way.
"""
import json, math, sys

args = sys.argv[1:]
def opt(name, default, conv=float):
    if name in args:
        i = args.index(name); v = args[i + 1]; del args[i:i + 2]; return conv(v)
    return default
picks = {}; drifts = {}
while '--drift' in args:
    i = args.index('--drift'); lv, dx, dy, sec = args[i + 1].split(':'); drifts[int(lv)] = [float(dx), float(dy), float(sec)]; del args[i:i + 2]
while '--pick' in args:
    i = args.index('--pick'); lv, col, n = args[i + 1].split(':'); picks[(int(lv), col)] = int(n); del args[i:i + 2]
TX = opt('--tankx', 1.6); K = opt('--k', 1.0); FK = opt('--fk', 4.0); F0 = opt('--f0', .04); NONE = opt('--none', .35); OUT = opt('--write', '', str)
drafts = json.load(open(args[0]))
levels = {}
NX = NY = None
for f in args[1:]:
    raw = json.load(open(f)); NX, NY = raw['NX'], raw['NY']
    for L in raw['levels']: levels[L['i']] = L
BA = .64  # the tank's width over its height

def fill(T, S, k, at=None):
    """the fill of a ring at grid point k (or, for a ring that moves, at the point at(t) gives), and when it first reached 1"""
    f = best = 0.0; tf = None; tp = 0.0
    for s in range(len(T)):
        dt = T[s] - tp; tp = T[s]
        kk = at(T[s]) if at else k
        f = min(1.0, max(0.0, f + dt * FK * (K * S[s][kk] - F0))); best = max(best, f)
        if f >= 1 and tf is None: tf = T[s]
    return best, tf

def gp(u, v):
    x = min(NX - 1, max(0, int(u * NX))); y = min(NY - 1, max(0, int(v * NY))); return y * NX + x

def things(d):
    """what is in the tank already, or built by the solution: a ring is not put on top of any of it"""
    pts, segs = [], []
    for s in d.get('src', []): pts.append((s[0], s[1], .12))
    for w in d.get('wind', []) or []: pts.append((w[0], w[1], .1))
    for w in d.get('walls', []) or []: segs.append(tuple(w[:4]))
    for p in d.get('prisms', []) or []: pts.append((p[0], p[1], .1))
    for p in d.get('drains', []) or []: pts.append((p[0], p[1], .12))
    for k, a in d.get('sol', []):
        if k == 'wall': segs.append(tuple(a[:4]))
        elif k == 'tunnel': pts += [(a[0], a[1], .1), (a[2], a[3], .1)]
        elif k == 'fan': pts.append((a[0], a[1], .1))
        else: pts.append((a[0], a[1], .11))
    return pts, segs

def dist(u, v, x, y): return math.hypot((u - x) * BA, v - y)
def dseg(u, v, s):
    ax, ay, bx, by = s[0] * BA, s[1], s[2] * BA, s[3]; px, py = u * BA, v
    dx, dy = bx - ax, by - ay; L2 = dx * dx + dy * dy or 1e-9; t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / L2))
    return math.hypot(px - ax - t * dx, py - ay - t * dy)

def free(d, u, v):
    # (the top of the tank lies under the level's words on a phone: no ring there)
    if not (.12 <= u <= .88 and .16 <= v <= .9): return False
    pts, segs = things(d)
    if any(dist(u, v, x, y) < r for x, y, r in pts): return False
    if any(dseg(u, v, s) < .085 for s in segs): return False
    return True

res = []
for i in sorted(levels):
    L = levels[i]; d = dict(drafts[i]); out = {'i': i, 'name': d['name'], 'cols': {}}
    if i + 1 in drifts: d['drift'] = drifts[i + 1]
    dr = d.get('drift')
    for c in [str(c) for c in dict.fromkeys(d.get('want', []))]:
        Ss, Sn = L['sol']['S'][c], L['none']['S'][c]; Ts, Tn = L['sol']['T'], L['none']['T']
        fs, fn = {}, {}
        for k in range(NX * NY):
            at = None
            if dr:
                u0, v0 = (k % NX + .5) / NX, (k // NX + .5) / NY
                at = (lambda u0, v0: lambda t: gp(u0 + dr[0] * (.5 - .5 * math.cos(2 * math.pi * t / dr[2])), v0 + dr[1] * (.5 - .5 * math.cos(2 * math.pi * t / dr[2]))))(u0, v0)
            fs[k] = fill(Ts, Ss, k, at); fn[k] = fill(Tn, Sn, k, at)
        cand = []
        for k in range(NX * NY):
            u, v = (k % NX + .5) / NX, (k // NX + .5) / NY
            tf = fs[k][1]
            if tf is None or fn[k][0] >= NONE or not free(d, u, v): continue
            if dr and not free(d, u + dr[0], v + dr[1]): continue
            # its neighbours: how many of the eight also fill with the solution (a ring a little off still fills), and stay short with nothing
            nb = [(k % NX + a, k // NX + b) for a in (-1, 0, 1) for b in (-1, 0, 1) if (a or b)]
            nb = [y * NX + x for x, y in nb if 0 <= x < NX and 0 <= y < NY]
            rob = sum(1 for q in nb if fs[q][1] is not None) / len(nb)
            nmax = max(fn[q][0] for q in nb + [k])
            cand.append({'u': round(u, 3), 'v': round(v, 3), 'tf': tf, 'none': round(fn[k][0], 2), 'nbn': round(nmax, 2), 'rob': round(rob, 2)})
        # best: robust, soon, and nothing well short (also around it)
        cand.sort(key=lambda p: (p['tf'] + 2.5 * (1 - p['rob']) + 2.0 * p['nbn']))
        pick = []
        for p in cand:
            if all(math.hypot((p['u'] - q['u']) * BA, p['v'] - q['v']) > .09 for q in pick): pick.append(p)
            if len(pick) >= 5: break
        out['cols'][c] = pick
    res.append(out)

ok = 0
for r in res:
    good = all(r['cols'][c] for c in r['cols'])
    ok += good
    s = []
    for c, pk in r['cols'].items():
        s.append(f"colour {c}: " + (' | '.join(f"({p['u']},{p['v']}) {p['tf']:.1f}s none {int(p['none']*100)}%/{int(p['nbn']*100)}% rob {p['rob']}" for p in pk[:3]) if pk else 'NOWHERE'))
    print(f"L{r['i']+1:<3}{r['name']:<20} " + '  ||  '.join(s))
print(f"k {K} fk {FK} f0 {F0}: {ok} of {len(res)} levels have a place for every ring")

if OUT:
    lv = []
    for r in res:
        d = dict(drafts[r['i']]); cups = []; tmax = 0
        if r['i'] + 1 in drifts: d['drift'] = drifts[r['i'] + 1]
        for c, pk in r['cols'].items():
            if not pk: continue
            n = picks.get((r['i'] + 1, c), 1) - 1; p = pk[min(n, len(pk) - 1)]
            cup = [p['u'], p['v'], 'mix' if c == 'mix' else int(c)]
            if d.get('drift'): cup += list(d['drift'])
            cups.append(cup); tmax = max(tmax, p['tf'])
        d['cups'] = cups
        d['tank'] = max(4.0, min(7.0, math.ceil(tmax * TX * 2) / 2))
        lv.append(d)
    json.dump(lv, open(OUT, 'w'))
    print('wrote', OUT)
