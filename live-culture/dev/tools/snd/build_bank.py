# usage (in a folder of its own, with the chosen VCSL files, github.com/sgossner/VCSL, CC0):
#   for each .wav named below: ffmpeg -nostdin -i <file>.wav -f f32le -ac 1 -ar 44100 raw/<file>.f32
#   python3 pitch2.py raw        (measures each note's pitch: pitches.json, kept here as it was measured on 13 Nov)
#   python3 build_bank.py        (writes out/<bank>.mp3; copy them to lc2/snd/ and app/snd/)
# The slots and the pitches in src/15-snd.js (SND.B) must match what this prints and out/bank.json.
# builds Mix's banks of real recorded sounds (from the CC0 Versilian Community Sample Library, decoded to raw/*.f32 by ffmpeg)
# into one short MP3 per bank, every sound in its own slot (a little silence, the sound, silence), and bank.json: per bank its slot
# length and its sounds (name, and for a tuned one its measured pitch as a MIDI number). The page finds each sound's onset itself, so
# the MP3 encoder's own delay does not matter.
import numpy as np, json, subprocess, sys, os
SR=44100;PRE=.06
P=json.load(open('pitches.json'))
def pitch(stem):
    if stem.startswith('Player'):      # the upright piano: its names are one octave low and its tuning true (measured within 0.13)
        import re;m=re.search(r'_([A-G]#?)(-?\d)$',stem);NAMES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
        return NAMES.index(m.group(1))+12*(int(m.group(2))+2)
    return P[stem]
B={
 'drums':{'len':.62,'kind':'hit','sounds':[
   ['conga','Conga_HitN_v2_rr1_Sum'],['conga2','Conga_HitN_v2_rr2_Sum'],['quinto','Quinto_HitN_v2_rr1_Sum'],['tumba','Tumba_HitN_v3_rr1_Sum'],
   ['heel','Conga_HitFM_v2_rr1_Sum'],['heel2','Conga_HitFM_v2_rr2_Sum'],
   ['bongo','BongoH_Hit1_v2_rr1_Mid'],['bongom','BongoH_HitMuted1_v2_rr1_Mid'],['bongol','BongoL_Hit1_v2_rr1_Mid'],['bongolm','BongoL_HitMuted2_v2_rr1_Mid'],
   ['cslap','Cajon_hit1_f_rr1'],['cslap2','Cajon_hit1_f_rr2'],['cmid','Cajon_hit2_mp_rr1'],['cbass','Cajon_hit3_f_rr1'],['cbass2','Cajon_hit3_f_rr2']]},
 'small':{'len':.5,'kind':'hit','sounds':[
   ['shk','Mid_ShakerHighFaster_Down_rr1'],['shk2','Mid_ShakerHighFaster_Down_rr2'],['shku','Mid_ShakerHighFaster_Up_rr1'],['shku2','Mid_ShakerHighFaster_Up_rr2'],
   ['shl','Mid_ShakerLowFaster_Down_rr1'],['clap','Clap_rr1'],['clap2','Clap_rr2'],['clave','Claves1_Hit_v2_rr1_Mid'],['wood','wood_click_mp'],
   ['hat','HiHat_HitC_v2_rr1_Mid'],['agoh','Agogo_High_v2_rr1_Mid'],['agol','Agogo_Low_v2_rr1_Mid']]},
 'marimba':{'len':1.5,'kind':'note','sounds':[[s,s] for s in ['Marimba_hit_Outrigger_G2_med_01','Marimba_hit_Outrigger_B2_med_01','Marimba_hit_Outrigger_F3_med_01','Marimba_hit_Outrigger_C4_med_01','Marimba_hit_Outrigger_G4_med_01','Marimba_hit_Outrigger_B4_med_01','Marimba_hit_Outrigger_F5_med_01']]},
 'vibes':{'len':2.4,'kind':'note','sounds':[[s,s] for s in ['Vibes_soft_E3_v2_rr1_Main','Vibes_soft_G3_v2_rr1_Main','Vibes_soft_B3_v2_rr1_Main','Vibes_soft_D4_v2_rr1_Main','Vibes_soft_F4_v2_rr1_Main','Vibes_soft_A4_v2_rr1_Main','Vibes_soft_C5_v2_rr1_Main','Vibes_soft_E5_v2_rr1_Main']]},
 'xylo':{'len':1.1,'kind':'note','sounds':[[x,x] for x in ['Xylo_Soft_G3_ff_01_far','Xylo_Soft_C4_ff_01_far','Xylo_Soft_G4_ff_01_far','Xylo_Soft_C5_ff_01_far','Xylo_Soft_G5_ff_01_far','Xylo_Soft_C6_ff_01_far']]},
 'glock':{'len':1.8,'kind':'note','sounds':[[s,s] for s in ['glock_medium_G4_01','glock_medium_C5_01','glock_medium_G5_01','glock_medium_C6_01']]},
 'chimes':{'len':2.6,'kind':'note','sounds':[[s,s] for s in ['sus_E4_r01_main','sus_G#4_r01_main','sus_A4_r01_main','sus_C5_r01_main','sus_E5_r01_main']]},
 'piano':{'len':2.2,'kind':'note','sounds':[[s,s] for s in ['Player_vl2_rr1_%s'%n for n in ['A1','B1','C#2','D#2','F2','G2','A2','B2','C#3','D#3','F3','G3','A3','B3','C#4','D#4','F4','G4']]]},
}
os.makedirs('out',exist_ok=True);man={}
for bank,b in B.items():
    L=b['len'];slot=PRE+L+.06;n=int(round(slot*SR));buf=np.zeros(n*len(b['sounds']),dtype=np.float32);items=[]
    for i,(name,stem) in enumerate(b['sounds']):
        x=np.fromfile('raw/%s.f32'%stem,dtype=np.float32);a=np.abs(x);on=max(0,int(np.argmax(a>a.max()*.02))-64);x=x[on:on+int(L*SR)].copy()
        m=len(x);f=int(m*.35);x[m-f:]*=(.5+.5*np.cos(np.linspace(0,np.pi,f))).astype(np.float32)   # a gentle fade over the last third
        if b['kind']=='note':   # even loudness across the range: by the first quarter second
            r=np.sqrt(np.mean(x[:int(.25*SR)]**2));x*=.18/max(r,1e-6)
        else: x*=.9/max(np.abs(x).max(),1e-6)
        x=np.clip(x,-.98,.98);o=i*n+int(PRE*SR);buf[o:o+m]=x
        items.append([name,round(pitch(stem),2)] if b['kind']=='note' else name)
    buf.tofile('out/%s.f32'%bank)
    subprocess.run(['ffmpeg','-nostdin','-loglevel','error','-y','-f','f32le','-ar',str(SR),'-ac','1','-i','out/%s.f32'%bank,'-codec:a','libmp3lame','-q:a','4','out/%s.mp3'%bank],check=True)
    os.remove('out/%s.f32'%bank)
    man[bank]={'slot':round(slot,4),'pre':PRE,'kind':b['kind'],'sounds':items}
    print('%-8s %2d sounds, slot %.2f s, %6.1f KB'%(bank,len(items),slot,os.path.getsize('out/%s.mp3'%bank)/1024))
json.dump(man,open('out/bank.json','w'),separators=(',',':'))
print('total %.1f KB'%(sum(os.path.getsize('out/'+f) for f in os.listdir('out') if f.endswith('.mp3'))/1024))
