# reads a SoundFont 2/3 file: presets, instruments, zones and sample headers (no sample data decoded here)
import struct, sys, json
def chunks(b, off, end):
    while off + 8 <= end:
        cid = b[off:off+4].decode('latin1'); sz = struct.unpack('<I', b[off+4:off+8])[0]
        yield cid, off+8, sz
        off += 8 + sz + (sz & 1)
def parse(path):
    b = open(path, 'rb').read()
    assert b[:4] == b'RIFF' and b[8:12] == b'sfbk'
    out = {}
    for cid, o, sz in chunks(b, 12, len(b)):
        if cid != 'LIST': continue
        kind = b[o:o+4].decode('latin1')
        for c2, o2, s2 in chunks(b, o+4, o+sz):
            out[(kind, c2)] = (o2, s2)
    def rec(key, fmt):
        o, s = out[('pdta', key)]; n = struct.calcsize(fmt)
        return [struct.unpack(fmt, b[o+i*n:o+(i+1)*n]) for i in range(s//n)]
    phdr = rec('phdr', '<20sHHHIII'); pbag = rec('pbag', '<HH'); pgen = rec('pgen', '<HH')
    inst = rec('inst', '<20sH'); ibag = rec('ibag', '<HH'); igen = rec('igen', '<HH')
    shdr = rec('shdr', '<20sIIIIIBbHH')
    smpl = out[('sdta', 'smpl')]
    nm = lambda x: x.split(b'\0')[0].decode('latin1')
    def gens(bags, gl, i):
        g0, g1 = bags[i][0], bags[i+1][0]; d = {}
        for op, amt in gl[g0:g1]: d[op] = amt
        return d
    def s16(v): return v - 65536 if v >= 32768 else v
    def rng(v): return (v & 255, v >> 8)
    insts = []
    for ii in range(len(inst)-1):
        zs = []; glob = {}
        for bi in range(inst[ii][1], inst[ii+1][1]):
            g = gens(ibag, igen, bi)
            if 53 not in g:
                glob = g; continue
            z = dict(glob); z.update(g); sid = z[53]; sh = shdr[sid]
            kr = rng(z.get(43, 127 << 8)); vr = rng(z.get(44, 127 << 8))
            root = z.get(58, 65535); root = sh[6] if root in (65535, -1) or root > 127 else root
            zs.append({'sample': sid, 'sname': nm(sh[0]), 'keys': kr, 'vels': vr, 'root': root,
                       'coarse': s16(z.get(51, 0)), 'fine': s16(z.get(52, 0)), 'corr': sh[7], 'sr': sh[5],
                       'start': sh[1], 'end': sh[2], 'loop': [sh[3], sh[4]], 'type': sh[9], 'modes': z.get(54, 0),
                       'atten': z.get(48, 0) / 10.0, 'release': s16(z.get(38, -12000)), 'decay': s16(z.get(36, -12000))})
        insts.append({'name': nm(inst[ii][0]), 'zones': zs})
    presets = []
    for pi in range(len(phdr)-1):
        n, prog, bank, bag0 = nm(phdr[pi][0]), phdr[pi][1], phdr[pi][2], phdr[pi][3]; bag1 = phdr[pi+1][3]
        zs = []; glob = {}
        for bi in range(bag0, bag1):
            g = gens(pbag, pgen, bi)
            if 41 not in g:
                glob = g; continue
            z = dict(glob); z.update(g)
            zs.append({'inst': z[41], 'keys': rng(z.get(43, 127 << 8)), 'vels': rng(z.get(44, 127 << 8)), 'atten': z.get(48, 0)/10.0})
        presets.append({'name': n, 'prog': prog, 'bank': bank, 'zones': zs})
    return {'presets': presets, 'insts': insts, 'smpl': smpl}
if __name__ == '__main__':
    d = parse(sys.argv[1])
    for p in sorted(d['presets'], key=lambda p: (p['bank'], p['prog'])):
        print(p['bank'], p['prog'], p['name'], [d['insts'][z['inst']]['name'] for z in p['zones']][:4])
