# measures the pitch of each recorded note (raw/*.f32, mono 44.1 kHz floats) near its nominal note and the octaves above it (VCSL's
# names are an octave out for the mallets; the piano's are an octave low), by the strongest spectral peak, to a hundredth of a semitone
import numpy as np, sys, glob, os, re, json
SR=44100
NAMES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
def nominal(name):
    m=re.search(r'_([A-G]#?)(-?\d)(?:_|$)',name)
    if not m: return None
    n,o=m.group(1),int(m.group(2))
    if name.startswith('Player'): o+=1
    return NAMES.index(n)+12*(o+1)
out={}
for p in sorted(glob.glob(sys.argv[1]+'/*.f32')):
    n=os.path.basename(p)[:-4];nom=nominal(n)
    if nom is None: continue
    x=np.fromfile(p,dtype=np.float32);a=np.abs(x);on=int(np.argmax(a>a.max()*.02))
    seg=x[on+int(.03*SR):on+int(.8*SR)];N=1<<19;sp=np.abs(np.fft.rfft(seg*np.hanning(len(seg)),N));f=np.fft.rfftfreq(N,1/SR)
    best=None
    for c in (nom,nom+12,nom+24):
        fl,fh=440*2**((c-.75-69)/12),440*2**((c+.75-69)/12);lo,hi=np.searchsorted(f,fl),np.searchsorted(f,fh)
        k=lo+np.argmax(sp[lo:hi]);y0,y1,y2=np.log(sp[k-1:k+2]+1e-12);d=.5*(y0-y2)/(y0-2*y1+y2);fr=(k+d)*SR/N
        if best is None or sp[k]>best[1]: best=(69+12*np.log2(fr/440),sp[k],c)
    out[n]=round(float(best[0]),2)
    print('%-42s nominal %3d -> %.2f'%(n[:42],nom,best[0]))
json.dump(out,open('pitches.json','w'),indent=0)
