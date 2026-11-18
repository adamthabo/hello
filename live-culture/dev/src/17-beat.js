/* ===== Beat: the geometry of rhythm.
   (17 Nov, 17:54: "I like the graphics and beat breakdown ... you get from the view of the metronome like that. But also love the
   ability to make wildest different good sounding noises for beautiful melodic timed sound making and experimenting"; 19:44: "Yeah but
   it's not interactive. And I like the classic beats I provided you, especially the more interesting ones, did y watch the videos I
   uploaded?"; 22:20: the seven videos, a series called the geometry of rhythms.)
   34 classic beats from those videos, transcribed step by step at the tempo each video gives (README rule 27): the USA's, Cuba's and
   Latin America's, Brazil's, Africa's, jazz and blues, Asia's. Each is drawn the way the videos draw it: a circle of its steps (16, or
   12, 9 or 8) like a clock's minutes, its main instrument a red shape joining the steps it plays on the ring, the second a white shape
   inside, the third short ticks outside, a hand sweeping round once a cycle and each corner flaring as it is played; under it the
   same beat as a grid of steps, one row an instrument. It plays on real recorded drums (struck, every sound dying away: rule 1), at
   its own tempo, while the band rests (its sound held at nothing, in time, back on leaving Beat).
   A finger changes it: a tap on the ring puts a stroke of the main instrument on that step or takes it away, and one dragged along the
   ring moves it (son clave to rumba clave is one step); a tap on the grid puts any instrument's stroke there or takes it away (drawn
   along, the same for every step it crosses), and a tap on a row's name takes that instrument out or brings it back. Inside the ring
   are eight rings of pitch, the band's key (E, minor pentatonic) from low (middle) to high: a tap puts a note there in the sound
   chosen below (five sounds bent out of real instruments), a finger kept still plays its pitch on every step, and "dice" makes up a
   melody on the beat's own strokes. "back" and "next" go through the beats; a beat's name, where it is from and its tempo, the way the
   videos show them, appear when a beat is chosen or the middle is tapped, and go. Everything changed is kept on the device; "reset"
   puts the beat back as it was and clears the notes. */
var BEAT=(function(){
  var O8=[1,3,5,7,9,11,13,15];
  function ALL(n){for(var a=[],i=1;i<=n;i++)a.push(i);return a}
  var FAM=[['us','USA'],['latin','Cuba and Latin America'],['brazil','Brazil'],['africa','Africa'],['jazz','Jazz and blues'],['asia','Asia']];
  /* the beats: rows top to bottom as the videos' grids have them (the third, ticks; the second, the white shape; the first, the red
     one), each [name, sound, the steps it plays on (from 1), {v: how hard, g: how hard on given steps, a: another sound on given
     steps}]. A sound is a recorded hit ('kick'), two struck together ('cbass+bongo'), or notes of a tuned bank ('fbass@40',
     a strum 'gtr@52,55,59'). bpm: the video's; b: steps to a beat (4 sixteenths, 3 triplets, 2 eighths), measured off the videos */
  var RHY=[
    {id:'house',f:'us',n:'House',o:'Chicago',x:'The kick on all four beats: 1 · 5 · 9 · 13',bpm:124,N:16,b:4,
      r:[['open hat','hho',[3,7,11,15]],['clap','clap',[5,13]],['kick','kick',[1,5,9,13]]]},
    {id:'trap',f:'us',n:'Trap',o:'Atlanta · 808 and hi-hat rolls',x:'The clap on 9 alone: that is why it feels half as fast',bpm:140,N:16,b:4,
      r:[['hi-hat','h8',[1,3,5,7,8,9,11,13,14,15,16]],['clap','c8',[9]],['808','b8',[1,4,11]]]},
    {id:'boombap',f:'us',n:'Boom Bap',o:'New York',x:'Kick and snare, the boom and the bap: the snare always on 5 and 13',bpm:90,N:16,b:4,
      r:[['hi-hat','hh',O8],['snare','snare',[5,13]],['kick','kick',[1,7,11]]]},
    {id:'jersey',f:'us',n:'Jersey Club',o:'New Jersey',x:'Five kicks a bar: 1, 5, 9, 12 and 15',bpm:136,N:16,b:4,
      r:[['hi-hat','hh',O8],['clap','clap',[5,13]],['kick','k8',[1,5,9,12,15]]]},
    {id:'rock',f:'us',n:'Rock',o:'A drum kit',x:'Kick on 1 and 9, snare on 5 and 13: under almost everything',bpm:120,N:16,b:4,
      r:[['hi-hat','hh',O8],['snare','snare',[5,13]],['kick','kick',[1,9]]]},
    {id:'son',f:'latin',n:'Son Clave',o:'Cuba · salsa and son (3-2)',x:'Three strokes, then two',bpm:110,N:16,b:4,
      r:[['shaker','shk',O8],['low drum','cbass',[1,9]],['clave','clave',[1,4,7,11,13]]]},
    {id:'rumba',f:'latin',n:'Rumba Clave',o:'Cuba · rumba',x:'The son clave with its third stroke a step later',bpm:110,N:16,b:4,
      r:[['shaker','shk',O8],['low drum','cbass',[1,9]],['clave','clave',[1,4,8,11,13]]]},
    {id:'tresillo',f:'latin',n:'Tresillo',o:'Under almost all Latin music',x:'3 + 3 + 2, twice round',bpm:110,N:16,b:4,
      r:[['shaker','shk',O8],['low drum','cbass',[1,9]],['cowbell','cow',[1,4,7,9,12,15]]]},
    {id:'habanera',f:'latin',n:'Habanera',o:'Cuba · habanera and tango',x:'The tresillo with the beat between: 1, 4, 5, 7',bpm:110,N:16,b:4,
      r:[['shaker','shk',O8],['low drum','cbass',[1,9]],['woodblock','wood',[1,4,5,7,9,12,13,15]]]},
    {id:'dembow',f:'latin',n:'Dembow',o:'Reggaetón · kick and snare',x:'Kick on every beat, snare on 4, 7, 12 and 15',bpm:110,N:16,b:4,
      r:[['hi-hat','h8',O8],['kick','k8',[1,5,9,13]],['snare','s8',[4,7,12,15]]]},
    {id:'salsa',f:'latin',n:'Salsa',o:'Cuba · New York · clave 3-2',x:'The 3-2 clave: all of salsa turns round it',bpm:190,N:16,b:2,
      r:[['bell','cow',O8],['conga','conga',[3,7,8,11,15,16],{a:{3:'cslap',11:'cslap'}}],['clave','clave',[1,4,7,11,13]]]},
    {id:'merengue',f:'latin',n:'Merengue',o:'Dominican Republic · tambora and güira',x:'The güira never stops: long · short · short',bpm:140,N:16,b:4,
      r:[['güira','shku',[1,3,4,5,7,8,9,11,12,13,15,16]],['stick','wood',[3,5,9,11,13]],['tambora','tumba',[1,7,8,15,16]]]},
    {id:'bachata',f:'latin',n:'Bachata',o:'Dominican Republic · requinto and bongó',x:'The bongó opens on step 13: that is its seal',bpm:128,N:16,b:4,
      r:[['güira','shku',[1,3,4,5,7,9,11,12,13,15]],['bongó','bongo',O8,{a:{13:'bongol'}}],['bass','fbass@40',[1,7,9,15],{a:{7:'fbass@47',15:'fbass@47'}}]]},
    {id:'cumbia',f:'latin',n:'Cumbia',o:'Colombia · guacharaca',x:'The llamador marks 2 and 4: that is the sway',bpm:95,N:16,b:4,
      r:[['guacharaca','shku',[1,3,4,5,7,8,9,11,12,13,15,16]],['llamador','conga',[5,13]],['bass','fbass@40',[1,9,15],{a:{15:'fbass@47'}}]]},
    {id:'joropo',f:'latin',n:'Joropo',o:'Venezuela · cuatro and maracas',x:'Half in 6/8 and half in 3/4: the sesquiáltera',bpm:200,N:12,b:2,
      r:[['maracas','shk',ALL(12)],['cuatro','gtr@52,55,59',[2,3,5,6,8,10,12]],['bass','fbass@40',[1,4,7,9,11],{a:{4:'fbass@47',11:'fbass@47'}}]]},
    {id:'samba',f:'brazil',n:'Samba',o:'Rio de Janeiro · batucada',x:'The low surdo on 5 and 13; the tamborim plays the teleco-teco',bpm:130,N:16,b:4,
      r:[['caixa','snare',ALL(16),{v:.42}],['tamborim','cslap',[1,3,4,6,8,10,12,13,15,16]],['surdo','tumba',[1,5,9,13],{a:{5:'cbass',13:'cbass'}}]]},
    {id:'bossa',f:'brazil',n:'Bossa Nova',o:'Rio de Janeiro',x:'The rim plays the bossa clave: 1, 4, 7 | 11, 14',bpm:120,N:16,b:2,
      r:[['hi-hat','hh',ALL(16),{v:.7}],['kick','kick',[1,4,5,8,9,12,13,16],{v:.7}],['rim','xs',[1,4,7,11,14]]]},
    {id:'sambareggae',f:'brazil',n:'Samba-Reggae',o:'Bahia · Olodum',x:'The repique plays the clave 1, 4, 7, 11, 14; the caixa leans on the off-beat',bpm:94,N:16,b:4,
      r:[['caixa','snare',[3,7,11,15]],['surdo','tumba',[1,5,9,13],{a:{5:'cbass',13:'cbass'}}],['repique','quinto',[1,4,7,11,14]]]},
    {id:'carioca',f:'brazil',n:'Funk Carioca',o:'Rio de Janeiro',x:'Kick on 1 and 11, clap on 4, 7 and 13: together, the 3-2 clave',bpm:130,N:16,b:4,
      r:[['hi-hat','h8',[1,3,5,7,9,10,11,13,15]],['clap','c8',[4,7,13]],['kick','k8',[1,11]]]},
    {id:'bembe',f:'africa',n:'Bembé',o:'Cuba and West Africa',x:'The bell steps as the major scale does: 2 2 1 2 2 2 1',bpm:105,N:12,b:3,
      r:[['shaker','shk',ALL(12)],['low drum','cbass',[1,4,7,10]],['bell','agoh',[1,3,5,6,8,10,12]]]},
    {id:'3over4',f:'africa',n:'3 Against 4',o:'West Africa · a polyrhythm',x:'Three strokes and four strokes in the same bar',bpm:100,N:12,b:3,
      r:[['shaker','shk',ALL(12)],['4 · clave','clave',[1,4,7,10]],['3 · tom','tumba',[1,5,9]]]},
    {id:'shiko',f:'africa',n:'Shiko',o:'Nigeria · West Africa',x:'',bpm:110,N:16,b:4,
      r:[['shaker','shk',O8],['low drum','cbass',[1,9]],['bell','agoh',[1,5,7,11,13]]]},
    {id:'soukous',f:'africa',n:'Soukous',o:'Congo',x:'',bpm:110,N:16,b:4,
      r:[['shaker','shk',O8],['low drum','cbass',[1,9]],['bell','agol',[1,4,7,11,12]]]},
    {id:'gahu',f:'africa',n:'Gahu',o:'Ghana',x:'',bpm:110,N:16,b:4,
      r:[['shaker','shk',O8],['low drum','cbass',[1,9]],['bell','agoh',[1,4,7,11,15]]]},
    {id:'swing',f:'jazz',n:'Swing',o:'New York · in triplets',x:'The ride goes "ding, ding-ga"; the hi-hat on 2 and 4',bpm:110,N:12,b:3,
      r:[['kick','kick',[1,4,7,10],{v:.4}],['hi-hat','hhp',[4,10]],['ride','ride',[1,4,6,7,10,12]]]},
    {id:'shuffle',f:'jazz',n:'Shuffle',o:'Chicago · the blues',x:'Long-short: the triplet without its middle note',bpm:96,N:12,b:3,
      r:[['kick','kick',[1,7]],['snare','snare',[4,10]],['hi-hat','hh',[1,3,4,6,7,9,10,12]]]},
    {id:'waltz',f:'jazz',n:'Jazz Waltz',o:'Jazz in 3/4',x:'The same swing, counted in three',bpm:150,N:9,b:3,
      r:[['kick','kick',[1],{v:.5}],['hi-hat','hhp',[4,7]],['ride','ride',[1,4,6,7,9]]]},
    {id:'secondline',f:'jazz',n:'Second Line',o:'New Orleans · the parade',x:'The bass drum plays the 3-2 clave of Cuba',bpm:100,N:16,b:4,
      r:[['roll','snare',[1,2,3,4,6,7,9,10,11,12,14,15],{v:.32}],['snare','snare',[5,8,13,16]],['bass drum','kick',[1,4,7,11,13]]]},
    {id:'funk',f:'jazz',n:'Funk',o:'James Brown · USA',x:'Ghost notes: snare strokes with almost no volume',bpm:100,N:16,b:4,
      r:[['hi-hat','hh',ALL(16)],['snare','snare',[5,7,10,13,16],{g:{7:.28,10:.28,16:.28}}],['kick','kick',[1,3,8,11]]]},
    {id:'teentaal',f:'asia',n:'Teentaal',o:'India · tabla · 16 beats',x:'The low drum rests from 10 to 13: the empty part, khali',bpm:80,N:16,b:4,
      r:[['tin · ta','bongom',[10,11,12,13]],['dhin','bongo',[2,3,6,7,14,15]],['dha','cbass+bongo',[1,4,5,8,9,16]]]},
    {id:'keherwa',f:'asia',n:'Keherwa',o:'India · Bollywood · 8 beats',x:'dha ge na ti · na ka dhi na',bpm:95,N:16,b:4,
      r:[['ka','bongom',[6,14]],['high','bongo',[3,4,5,8,11,12,13,16]],['low','cbass',[1,2,7,9,10,15]]]},
    {id:'dongdong',f:'asia',n:'Dong Dong Qiang',o:'China · the lion dance',x:'Dong is the drum; qiang, the cymbal and the gong',bpm:120,N:8,b:2,gong:5,
      r:[['gong','chimes@52',[5]],['cymbal','ride',[5]],['drum','tumba',[1,3,5]]]},
    {id:'lancaran',f:'asia',n:'Lancaran',o:'Indonesia · gamelan · 16 beats',x:'The gong closes the circle on 16',bpm:130,N:16,b:2,gong:16,
      r:[['kethuk','marimba@59',O8],['kempul','vibes@64',[6,10,14]],['kenong','vibes@71',[4,8,12,16],{a:{16:'vibes@71+chimes@52'}}]]},
    {id:'malfuf',f:'asia',n:'Malfuf',o:'The Middle East · darbuka',x:'The same 3 + 3 + 2 as the tresillo',bpm:105,N:16,b:4,
      r:[['ka','bongom',[8,16]],['tek','bongo',[4,7,12,15]],['dum','cbass',[1,9]]]}
  ];
  /* each beat brought to about the same loudness, some 5 dB under the band, as measured (tools/t_levels.js, 18 Nov): a clave alone
     is quieter than a bass line */
  var LV={house:1.35,trap:1.58,boombap:1.38,jersey:0.91,rock:1.53,son:1.84,rumba:1.7,tresillo:1.86,habanera:1.58,dembow:1.36,salsa:1.64,merengue:0.91,bachata:0.99,cumbia:1.11,joropo:0.92,samba:1.16,bossa:1.78,sambareggae:1.06,carioca:1.17,bembe:1.5,'3over4':1.38,shiko:1.84,soukous:1.36,gahu:1.8,swing:1.88,shuffle:2,waltz:1.53,secondline:1.06,funk:1.1,teentaal:1.26,keherwa:1.2,dongdong:1.57,lancaran:1.15,malfuf:1.62};
  /* how loud each recorded hit is played (they are all recorded near full scale; these even out how loud they sound), the tuned banks
     (and how soon a hand damps them), how hard each row plays (the ticks softest), and where across the room */
  var HG={kick:.2,k8:.09,snare:.17,s8:.16,clap:.26,c8:.18,hh:.09,h8:.1,hho:.1,hhp:.09,ride:.13,xs:.17,cow:.2,tamb:.1,btap:.12,o8:.08,b8:.12,
      conga:.11,conga2:.11,quinto:.11,tumba:.12,cbass:.14,cbass2:.14,bongo:.14,bongom:.14,bongol:.12,bongolm:.12,cslap:.18,cslap2:.18,cmid:.1,heel:.1,heel2:.1,
      shk:.13,shk2:.13,shku:.16,shku2:.16,shl:.07,clave:.24,wood:.22,hat:.1,agoh:.22,agol:.2},
    TG={fbass:{g:.12,d:.42},gtr:{g:.045,d:.3},marimba:{g:.12,d:0},vibes:{g:.07,d:1.3},chimes:{g:.035,d:2.6},glock:{g:.05,d:1}},
    ROLE=[.55,.85,1],PAN=[.22,-.18,0];
  /* the notes: five sounds bent out of real instruments (Mix's BEATV), eight rings of pitch */
  var SN=[['glass','a glockenspiel an octave up, ringing into the echo'],['rubber','a marimba an octave down, through a squelching filter'],
      ['bells','tubular bells, low and long'],['boom','a fingered bass, dark and round'],['pluck','an electric guitar through a wah']],
    SCOL=['62,240,255','255,179,71','198,255,107','255,106,61','180,107,255'],
    DICE=[[3,7],[0,5],[2,7],[0,3],[1,6]],KEY=52,MAXN=48,
    BPOST=.85,RED='239,45,45',DISP='Anybody,"Arial Narrow",system-ui,sans-serif';
  var on=false,built=false,BB=null,VB=0,I=0,ED={},MU={},H=null,NT=[],cur=0,
    BT={run:false,t0:0,k:0,sd:.125,iv:0},CARD={t:-1e9},TF=[],FL=[],ROLL={},drag=null,mode=null,lastCell='',PLAYED=[0,0,0],PN=0;
  H=hitsOf(0);
  function midiOf(p){return pent(p,KEY)}
  function chordK(n){return Math.min(1,1.5/Math.sqrt(Math.max(1,n)))}
  function famOf(i){var f=RHY[i].f,a=[];RHY.forEach(function(r,k){if(r.f===f)a.push(k)});return {list:a,n:a.indexOf(i)+1}}
  /* ---- kept on the device ---- */
  function okN(a){return a&&a.length===3&&a[0]>=0&&a[0]<1&&a[1]>=0&&a[1]<8&&(a[1]|0)===a[1]&&a[2]>=0&&a[2]<SN.length&&(a[2]|0)===a[2]}
  function load(){try{var o=JSON.parse(localStorage.getItem('lc.beat2')||'null');
      if(o){if(o.i>=0&&o.i<RHY.length)I=o.i|0;if(o.ed&&typeof o.ed==='object')ED=o.ed;if(o.mu&&typeof o.mu==='object')MU=o.mu;
        if(o.n&&o.n.length!==undefined)NT=o.n.filter(okN).slice(0,MAXN).map(function(a){return {u:a[0],p:a[1],v:a[2]}});if(o.c>=0&&o.c<SN.length)cur=o.c|0}
      /* (the notes put down before the beats came: each where it was round the circle) */
      else{var p=JSON.parse(localStorage.getItem('lc.beat')||'null');if(p&&p.n&&p.n.length!==undefined){NT=p.n.filter(function(n){return n&&n.s>=0&&n.s<16&&n.p>=0&&n.p<8&&n.v>=0&&n.v<SN.length}).slice(0,MAXN).map(function(n){return {u:n.s/16,p:n.p|0,v:n.v|0}});if(p.c>=0&&p.c<SN.length)cur=p.c|0}}}catch(e){}
    H=hitsOf(I)}
  function save(){try{localStorage.setItem('lc.beat2',JSON.stringify({i:I,ed:ED,mu:MU,n:NT.map(function(n){return [n.u,n.p,n.v]}),c:cur}))}catch(e){}}
  function hitsOf(i){var R=RHY[i],e=ED[R.id];return R.r.map(function(row,j){var src=e&&e[j]&&e[j].length!==undefined?e[j]:row[2],a=[];for(var q=0;q<R.N;q++)a.push(src.indexOf(q+1)>=0);return a})}
  function keep(){var R=RHY[I],same=true,e=H.map(function(a,j){var h=[];a.forEach(function(v,q){if(v)h.push(q+1)});if(h.join()!==R.r[j][2].join())same=false;return h});
    if(same)delete ED[R.id];else ED[R.id]=e;save()}
  function muted(j){var m=MU[RHY[I].id];return !!(m&&m[j])}
  /* ---- the sound ---- */
  var SPC={},LIVE={};
  function spec(s){if(SPC[s])return SPC[s];return SPC[s]=s.split('+').map(function(p){var a=p.split('@');return a.length>1?{bank:a[0],m:a[1].split(',').map(Number)}:{h:a[0]}})}
  function soundsOf(R){var s=[];R.r.forEach(function(row){s.push(row[1]);var a=row[3]&&row[3].a;if(a)for(var k in a)s.push(a[k])});return s}
  function banksOf(R){var b={};soundsOf(R).forEach(function(s){spec(s).forEach(function(p){if(p.bank)b[p.bank]=1;else{var k=SND.bankOf(p.h);if(k)b[k]=1}})});return Object.keys(b)}
  /* Beat's own bus: the ceiling the modes' bands are under (MODELIM, its make-up taken back out), a little of the band's room, and an
     echo for the notes on the beat's own dotted step */
  function busOn(c,dst,o){o=o||{};var i=c.createGain(),lim=c.createDynamicsCompressor(),post=c.createGain();
    lim.threshold.value=MODELIM[0];lim.knee.value=MODELIM[1];lim.ratio.value=MODELIM[2];lim.attack.value=.003;lim.release.value=.14;post.gain.value=MODEPOST*BPOST;
    i.connect(lim);lim.connect(post);post.connect(dst.comp);var rs=c.createGain();rs.gain.value=o.room!==undefined?o.room:.1;post.connect(rs);if(dst.vs)rs.connect(dst.vs);
    var ein=c.createGain(),dl=c.createDelay(2),fb=c.createGain(),lp=c.createBiquadFilter(),hp=c.createBiquadFilter(),ret=c.createGain();
    dl.delayTime.value=.3;fb.gain.value=.3;lp.type='lowpass';lp.frequency.value=2600;hp.type='highpass';hp.frequency.value=300;ret.gain.value=o.echo!==undefined?o.echo:.55;
    ein.connect(dl);dl.connect(lp);lp.connect(hp);hp.connect(fb);fb.connect(dl);hp.connect(ret);ret.connect(i);
    return {c:c,i:i,ein:ein,dl:dl,post:post}}
  function bus(){var c=AU.c;if(!c||!AU.comp)return null;if(!BB||BB.c!==c)BB=busOn(c,{comp:AU.comp,vs:AU.vsend});return BB}
  function sdOf(R){return 60/R.bpm/R.b}
  function echoT(R){return Math.min(1.2,sdOf(R)*(R.b===3?2:3))}
  function echo(){if(BB&&AU.c)BB.dl.delayTime.setTargetAtTime(echoT(RHY[I]),AU.c.currentTime,.05)}
  function one(c,dst,b,rate,g,t,pan,d){var s=c.createBufferSource(),gn=c.createGain(),o=gn;s.buffer=b;s.playbackRate.value=clamp(rate,.25,4);gn.gain.value=g;s.connect(gn);
    if(pan&&c.createStereoPanner){var pp=c.createStereoPanner();pp.pan.value=pan;gn.connect(pp);o=pp}o.connect(dst);
    if(d){gn.gain.setTargetAtTime(0,t+d,.07);try{s.stop(t+d+.6)}catch(e){}}
    if(c===AU.c){VB++;s.onended=function(){VB--;try{o.disconnect()}catch(e){}}}s.start(t);return gn}
  function part(c,dst,p,v,t,pan,LS,j){
    if(p.h){var b=SND.hit(p.h);if(b)one(c,dst,b,1,v*(HG[p.h]||.1),t,pan,0);return}
    /* a tuned row's new note damps that row's last on the same instrument, as a hand does (the gamelan's players damp each key as they
       strike the next; a bass string stops when it is plucked again), so a row of long notes never piles up in tune with itself */
    var T=TG[p.bank]||{g:.08,d:0},key=j+':'+p.bank,was=LS&&LS[key],now=[];
    if(was)was.forEach(function(g){try{g.gain.cancelScheduledValues(t);g.gain.setTargetAtTime(0,t,.03)}catch(e){}});
    p.m.forEach(function(m,k){var nt=SND.note(p.bank,m);if(nt)now.push(one(c,dst,nt.b,nt.rate,v*T.g*(p.m.length>1?.8:1),t+k*.014,pan,T.d))});if(LS)LS[key]=now}
  /* one row's stroke on a step: how hard (the row, its marks, the ticks' off-beat sixteenths a little softer, a hand's looseness).
     (18 Nov) A row filled past its own strokes (and past eight) is played lighter the fuller it is, as a hand plays a roll lighter
     than its accents: n strokes where it had m, each sqrt(max(m,8)/n) as hard, so a row on every step stays under the band */
  function cnt(a){var n=0;for(var q=0;q<a.length;q++)if(a[q])n++;return n}
  function dens(R,j,n){return Math.min(1,Math.sqrt(Math.max(8,R.r[j][2].length)/Math.max(1,n)))}
  function hitRow(c,dst,R,j,q,t,hum,n){var row=R.r[j],o=row[3]||{},v=ROLE[j]*(LV[R.id]||1)*(o.v||1)*(o.g&&o.g[q+1]?o.g[q+1]:1)*(n?dens(R,j,n):1);
    if(j===0&&R.b===4&&q%2)v*=.72;
    if(hum){v*=.94+.12*Math.random();if(q%R.b)t+=(Math.random()-.5)*.006}
    var sp=spec((o.a&&o.a[q+1])||row[1]),LS=c===AU.c?LIVE:(c.__ls=c.__ls||{});for(var i=0;i<sp.length;i++)part(c,dst,sp[i],v,t,PAN[j],LS,j)}
  function noteAt(c,B,v,p,vel,t){var nd=MIX.bnode(c,MIX.beatv[SN[v][0]],midiOf(p),vel,t,B.i,B.ein);if(nd&&c===AU.c){VB++;nd.s.onended=function(){VB--}}return nd}
  /* a finger's roll: each stroke damps the one before it, as a hand striking the same bar again does, so a roll never piles up */
  function rollAt(c,B,r,vel,t){if(r.last)try{r.last.g.gain.cancelScheduledValues(t);r.last.g.gain.setTargetAtTime(0,t,.025)}catch(e){}r.last=noteAt(c,B,r.v,r.p,vel,t)}
  /* ---- the clock: the beat's own steps at its own tempo ---- */
  function live(){var c=AU.c;return !!(on&&c&&c.state==='running'&&AU.want)}
  function pump(){if(!on){clearInterval(BT.iv);BT.iv=0;BT.run=false;return}if(!live()){BT.run=false;return}var c=AU.c,B=bus();if(!B)return;
    if(!BT.run){BT.run=true;BT.sd=sdOf(RHY[I]);BT.t0=c.currentTime+.1;BT.k=0;echo();CARD.t=performance.now()}
    if(Math.abs(B.post.gain.value-MODEPOST*BPOST)>.004)B.post.gain.setTargetAtTime(MODEPOST*BPOST,c.currentTime,.05);
    var now=c.currentTime,la=document.hidden?1:.13;if(BT.t0+BT.k*BT.sd<now-.04)BT.k=Math.ceil((now-.04-BT.t0)/BT.sd);
    while(BT.t0+BT.k*BT.sd<now+la){step(BT.k,BT.t0+BT.k*BT.sd);BT.k++}}
  function stepOf(n,N){return Math.round(n.u*N)%N}
  var SPY=null;
  function step(k,t){var R=RHY[I],N=R.N,q=k%N,c=AU.c,B=BB,j;if(!B||VB>64)return;
    for(j=0;j<3;j++)if(H[j][q]&&!muted(j)){hitRow(c,B.i,R,j,q,t,true,cnt(H[j]));PLAYED[j]++;if(SPY)SPY({k:k,q:q,t:t,j:j})}
    var ns=NT.filter(function(n){return stepOf(n,N)===q}),rk=[],id;for(id in ROLL)if(ROLL[id].on)rk.push(ROLL[id]);
    var n=ns.length+rk.length;if(!n)return;var v=.85*chordK(n);
    ns.forEach(function(nt){noteAt(c,B,nt.v,nt.p,v,t);PN++;if(SPY)SPY({k:k,q:q,t:t,p:nt.p,v:nt.v})});rk.forEach(function(r){r.n++;rollAt(c,B,r,v,t);if(SPY)SPY({k:k,q:q,t:t,p:r.p,v:r.v,roll:1})})}
  function clock(){if(!BT.run||!AU.c)return null;var R=RHY[I],s=(AU.c.currentTime-(AU.lat||0)-BT.t0)/BT.sd;if(s<0)s=0;return {s:s,q:Math.floor(s)%R.N,f:(s%R.N)/R.N,k:Math.floor(s)}}
  /* a stroke or a note put down is heard on the next step, in time (if that is its own step and the clock has not given it out yet, the
     clock plays it) */
  function slot(q){var c=AU.c;if(!BT.run||!c)return null;var k=Math.ceil((c.currentTime+.03-BT.t0)/BT.sd);return {t:BT.t0+k*BT.sd,mine:k%RHY[I].N===q&&k>=BT.k}}
  function preview(j,q){if(!live()||muted(j))return;var B=bus(),sl=slot(q);if(!B||!sl||sl.mine)return;hitRow(AU.c,B.i,RHY[I],j,q,sl.t,false,cnt(H[j]))}
  function previewN(n){if(!live())return;var B=bus(),sl=slot(stepOf(n,RHY[I].N));if(!B||!sl||sl.mine)return;noteAt(AU.c,B,n.v,n.p,.7,sl.t)}
  /* ---- the place of everything on the screen: the circle, the grid under it (beside it on a screen on its side), the name above ---- */
  function geo(){var W=STG.w,y0=STG.y0,H0=Math.max(120,STG.y1-y0),N=RHY[I].N,wide=W>H0*1.3&&W>=560,g={wide:wide},rh,gap,gh,R;
    if(!wide){rh=clamp(Math.round(H0*.042),18,28);gap=Math.max(3,Math.round(rh*.18));gh=3*rh+2*gap+20;var card=clamp(Math.round(H0*.13),46,84);
      R=Math.max(48,Math.min(W*.4,(W/2-20)/1.24,(H0-gh-card-24)/2.56));var ex=Math.max(0,H0-(card+2.56*R+12+gh));
      g.gw=Math.min(W-28,560);g.gx=(W-g.gw)/2;g.cx=W/2;g.cy=y0+card+ex*.35+1.28*R;g.gy=g.cy+1.28*R+12+ex*.25;g.card={x:g.gx,y:y0+ex*.2,w:g.gw,h:card}}
    else{rh=clamp(Math.round(H0*.075),18,28);gap=Math.max(3,Math.round(rh*.18));gh=3*rh+2*gap+20;R=Math.max(48,Math.min(H0/2.5,W*.21));
      g.cx=Math.max(1.25*R+16,W*.27);g.cy=y0+H0/2;g.gx=g.cx+1.3*R+28;g.gw=Math.min(W-g.gx-20,560);var ch=clamp(Math.round(H0*.26),52,84);
      g.gy=Math.min(y0+H0-gh,g.cy-gh/2+ch*.45);g.card={x:g.gx,y:Math.max(y0,g.gy-ch-8),w:g.gw,h:ch}}
    g.R=R;g.rh=rh;g.gap=gap;g.lab=clamp(Math.round(g.gw*.19),50,86);g.cw=(g.gw-g.lab)/N;return g}
  function ang(q,N){return -Math.PI/2+q/N*TAU}
  function rp(p,R){return R*(.2+.085*p)}
  function hit(x,y){var g=geo(),N=RHY[I].N,gy=g.gy,gb=gy+3*g.rh+2*g.gap;
    if(y>=gy-g.gap&&y<=gb+g.gap&&x>=g.gx-8&&x<=g.gx+g.gw+8){var j=clamp(Math.floor((y-gy+g.gap/2)/(g.rh+g.gap)),0,2);
      if(x<g.gx+g.lab-3)return {k:'label',j:j};return {k:'cell',j:j,q:clamp(Math.floor((x-g.gx-g.lab)/g.cw),0,N-1)}}
    var dx=x-g.cx,dy=y-g.cy,r=Math.hypot(dx,dy)/g.R,a=Math.atan2(dy,dx)+Math.PI/2;if(a<0)a+=TAU;var q=Math.round(a/TAU*N)%N;
    if(r<.14)return {k:'mid'};if(r<.86)return {k:'notes',q:q,p:clamp(Math.round((r-.2)/.085),0,7)};if(r<1.34)return {k:'ring',q:q};return null}
  function ringStep(x,y){var g=geo(),dx=x-g.cx,dy=y-g.cy;if(Math.hypot(dx,dy)<g.R*.5)return null;var a=Math.atan2(dy,dx)+Math.PI/2;if(a<0)a+=TAU;return Math.round(a/TAU*RHY[I].N)%RHY[I].N}
  /* ---- a finger ---- */
  function setCell(j,q,v){if(H[j][q]===v)return;H[j][q]=v;keep();TF.push({j:j,q:q,t:performance.now()});if(v)preview(j,q)}
  function findN(q,p){var N=RHY[I].N;for(var i=0;i<NT.length;i++)if(stepOf(NT[i],N)===q&&NT[i].p===p)return i;return -1}
  function applyN(h,how){var k=h.q+':'+h.p;if(k===lastCell)return;lastCell=k;var i=findN(h.q,h.p);
    if(how==='erase'){if(i>=0){NT.splice(i,1);save()}return}
    if(i>=0||NT.length>=MAXN)return;var n={u:h.q/RHY[I].N,p:h.p,v:cur};NT.push(n);save();FL.push({u:n.u,p:n.p,t:performance.now(),c:SCOL[cur]});previewN(n)}
  function toggleMute(j){var id=RHY[I].id,m=MU[id]||[0,0,0];m[j]=m[j]?0:1;if(!m[0]&&!m[1]&&!m[2])delete MU[id];else MU[id]=m;save();
    TF.push({j:j,q:-1,t:performance.now()});say(RHY[I].r[j][0]+(m[j]?' out':' back in'),m[j]?'':'rgb('+(j===2?RED:'234,249,255')+')')}
  function down(p){if(p.ghost)return;if(!AU.want){musicOn();CARD.t=performance.now()}var h=hit(p.x,p.y);mode=null;if(!h)return;
    if(h.k==='label'){toggleMute(h.j);return}
    if(h.k==='cell'){var v=!H[h.j][h.q];drag={k:'cell',id:p.id,j:h.j,v:v,last:h.q};setCell(h.j,h.q,v);return}
    if(h.k==='mid'){CARD.t=performance.now();TF.push({j:-1,q:-1,t:CARD.t});return}
    if(h.k==='ring'){var had=H[2][h.q];if(!had)setCell(2,h.q,true);drag={k:'ring',id:p.id,q:h.q,had:had,moved:false};return}
    mode=findN(h.q,h.p)>=0?'erase':'draw';lastCell='';applyN(h,mode);
    /* a finger kept on the rings plays: after a third of a second its pitch sounds on every step, in the sound chosen, for as long as it
       stays (two fingers at most), following the finger up and down the rings */
    if(Object.keys(ROLL).length<2)ROLL[p.id]={p:h.p,x:p.x,y:p.y,ax:p.x,ay:p.y,t0:performance.now(),on:false,v:cur,n:0}}
  function move(p){if(p.ghost)return;
    if(drag&&drag.id===p.id){if(drag.k==='cell'){var h=hit(p.x,p.y);if(h&&h.k==='cell'&&h.j===drag.j&&h.q!==drag.last){drag.last=h.q;setCell(h.j,h.q,drag.v)}}
      else{var q=ringStep(p.x,p.y);if(q!==null&&q!==drag.q&&!H[2][q]){H[2][drag.q]=false;H[2][q]=true;drag.q=q;drag.moved=true;keep();TF.push({j:2,q:q,t:performance.now()});preview(2,q)}}return}
    var rl=ROLL[p.id];if(rl){var h2=hit(p.x,p.y);rl.x=p.x;rl.y=p.y;if(rl.on){if(h2&&h2.k==='notes')rl.p=h2.p;return}
      if(Math.hypot(p.x-rl.ax,p.y-rl.ay)>12){rl.ax=p.x;rl.ay=p.y;rl.t0=performance.now();if(h2&&h2.k==='notes')rl.p=h2.p}}
    if(!mode)return;var h3=hit(p.x,p.y);if(h3&&h3.k==='notes')applyN(h3,mode)}
  function up(p){if(p&&drag&&drag.id===p.id){if(drag.k==='ring'&&drag.had&&!drag.moved&&held(p)<650)setCell(2,drag.q,false);drag=null}
    if(p)delete ROLL[p.id];mode=null;lastCell=''}
  /* ---- the buttons ---- */
  function pick(i){i=((i%RHY.length)+RHY.length)%RHY.length;I=i;H=hitsOf(I);LIVE={};save();SND.load(banksOf(RHY[I]));drag=null;
    if(BT.run){var t=BT.t0+BT.k*BT.sd;BT.t0=t;BT.k=0;BT.sd=sdOf(RHY[I]);echo()}CARD.t=performance.now();sync()}
  /* dice: a melody made up in the sound chosen, on the beat's own strokes (its main row's, some of its second's), walking up and down */
  function dice(){var R=RHY[I],N=R.N,D=DICE[cur],pp=Math.round((D[0]+D[1])/2),st=[],q;
    for(q=0;q<N;q++)if(H[2][q])st.push(q);for(q=0;q<N;q++)if(H[1][q]&&st.indexOf(q)<0&&Math.random()<.5)st.push(q);
    for(q=0;st.length<4&&q<N;q+=R.b)if(st.indexOf(q)<0)st.push(q);st.sort(function(a,b){return a-b});st=st.slice(0,12);
    NT=NT.filter(function(n){return n.v!==cur});
    st.forEach(function(s){pp=clamp(pp+[-2,-1,-1,0,1,1,2][Math.floor(Math.random()*7)],D[0],D[1]);if(NT.length<MAXN&&findN(s,pp)<0)NT.push({u:s/N,p:pp,v:cur})});
    save();say(SN[cur][0]+': a melody made up on the beat','rgb('+SCOL[cur]+')')}
  function reset(){var id=RHY[I].id;delete ED[id];delete MU[id];H=hitsOf(I);NT=[];save();CARD.t=performance.now();say(RHY[I].n+' as it was, the notes cleared','')}
  function sound(i){cur=i;save();sync();say(SN[cur][0]+': '+SN[cur][1],'rgb('+SCOL[cur]+')')}
  /* (18 Nov, 00:50: "too many confusing menu items at the bottom") along the bottom only the beat: back, its name (a tap shows where it
     is from), next. The notes' five sounds, the melody and reset are in the menu under the world's name */
  function sync(){var n=$('b_name');if(n){var nm=RHY[I].n;if(n.lastChild.textContent!==nm)n.lastChild.textContent=nm;n.setAttribute('aria-label',RHY[I].n+': where it is from and its tempo')}
    SN.forEach(function(x,i){var b=$('b_s'+i);if(b)b.setAttribute('aria-pressed',i===cur?'true':'false')})}
  function build(){if(built)return;var f=$('foot'),t=$('tools'),r=document.createElement('div');if(!f)return;built=true;r.className='tools';r.id='btools';r.hidden=true;
    r.setAttribute('role','toolbar');r.setAttribute('aria-label','Beat: the beat playing');
    var mk=function(id,cls,name,icon,fn,lab){var b=document.createElement('button');b.type='button';b.className='tb '+cls;b.id=id;b.innerHTML='<svg viewBox="0 0 14 14" aria-hidden="true">'+icon+'</svg><span></span>';
      b.lastChild.textContent=name;if(lab)b.setAttribute('aria-label',lab);b.addEventListener('click',fn);r.appendChild(b);return b};
    mk('b_prev','ba','','<path d="M8.6 3.2L4.8 7l3.8 3.8"/>',function(){pick(I-1)},'The beat before');
    var nb=mk('b_name','bn',RHY[I].n,'',function(){CARD.t=performance.now()});nb.firstChild.style.display='none';
    mk('b_next','ba','','<path d="M5.4 3.2L9.2 7l-3.8 3.8"/>',function(){pick(I+1)},'The next beat');
    if(t&&t.nextSibling)f.insertBefore(r,t.nextSibling);else f.appendChild(r);sync()}
  /* the menu's part for Beat: the notes' sound (five, each its colour and name), a melody made up on the beat, the beat as it was */
  function menu(sec){if(sec._built)return;sec._built=1;var h=document.createElement('div');h.className='mh';h.textContent='notes inside the ring';sec.appendChild(h);
    var r=document.createElement('div');r.className='mrw';sec.appendChild(r);
    SN.forEach(function(x,i){var b=document.createElement('button');b.type='button';b.className='mb';b.id='b_s'+i;b.innerHTML='<svg viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="3.6" fill="currentColor" stroke="none"/></svg><span></span>';
      b.firstChild.style.color='rgb('+SCOL[i]+')';b.lastChild.textContent=x[0];b.setAttribute('aria-label','Notes in '+x[0]+': '+x[1]);b.addEventListener('click',function(){sound(i);menuShow(false)});r.appendChild(b)});
    var r2=document.createElement('div');r2.className='mrw';sec.appendChild(r2);
    var mk=function(id,name,icon,fn,lab){var b=document.createElement('button');b.type='button';b.className='mb';b.id=id;b.innerHTML='<svg viewBox="0 0 14 14" aria-hidden="true">'+icon+'</svg><span></span>';
      b.lastChild.textContent=name;b.setAttribute('aria-label',lab);b.addEventListener('click',function(){fn();menuShow(false)});r2.appendChild(b);return b};
    mk('b_dice','make a melody','<rect x="2.5" y="2.5" width="9" height="9" rx="2"/><circle cx="5.2" cy="5.2" r=".9" fill="currentColor"/><circle cx="8.8" cy="8.8" r=".9" fill="currentColor"/>',function(){dice()},'Make up a melody on this beat, in the sound chosen');
    mk('b_reset','this beat as it was','<path d="M3.4 7.2a3.7 3.7 0 1 0 1.3-2.9"/><path d="M4.4 2.2v2.3h2.3"/>',function(){reset()},'This beat as it was, and no notes');
    sync()}
  function enter(){load();build();on=true;var r=$('btools');if(r)r.hidden=false;sync();hushSet(true);
    SND.load(banksOf(RHY[I]).concat(['glock','marimba','chimes','fbass','gtr']));if(!BT.iv)BT.iv=setInterval(pump,25);pump();layout();if(AU.want)CARD.t=performance.now()}
  function leave(){on=false;drag=null;mode=null;ROLL={};var r=$('btools');if(r)r.hidden=true;hushSet(false);clearInterval(BT.iv);BT.iv=0;BT.run=false}
  function tick(){var now=performance.now();for(var id in ROLL){var r=ROLL[id];if(!PTR(id)){delete ROLL[id];continue}if(!r.on&&now-r.t0>330){r.on=true;mode=null}}}
  /* ---- the picture ---- */
  function cardA(now){var e=(now-CARD.t)/1000;if(e<0||e>5)return 0;return Math.min(1,e/.18)*(e>4.2?1-(e-4.2)/.8:1)}
  function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.arcTo(x+w,y,x+w,y+r,r);c.lineTo(x+w,y+h-r);c.arcTo(x+w,y+h,x+w-r,y+h,r);c.lineTo(x+r,y+h);c.arcTo(x,y+h,x,y+h-r,r);c.lineTo(x,y+r);c.arcTo(x,y,x+r,y,r);c.closePath()}
  function wrap(c,s,w){var ws=s.split(' '),L=[],l='';ws.forEach(function(x){var t=l?l+' '+x:x;if(c.measureText(t).width>w&&l){L.push(l);l=x}else l=t});if(l)L.push(l);return L.slice(0,2)}
  function card(c,g,now){var a=cardA(now);if(a<=0)return;var R=RHY[I],k=g.card,fi=famOf(I),big=clamp(Math.round(k.h*.4),20,34),sm=clamp(Math.round(big*.36),9,12),y=k.y+sm;
    c.save();c.globalAlpha=a;c.textAlign='left';c.textBaseline='alphabetic';try{c.fontStretch='condensed'}catch(e){}
    if(R.x&&k.h>=58){c.font='700 '+sm+'px '+DISP;c.fillStyle='rgba(240,240,240,.9)';var L=wrap(c,R.x.toUpperCase(),k.w).slice(0,k.h>=72?2:1);if(L.length>1)y-=Math.round(sm*.55);L.forEach(function(l,i){c.fillText(l,k.x,y+i*(sm+3))});y+=(L.length-1)*(sm+3)}
    var bs=Math.round(big*1.08),by=y+6;c.fillStyle='rgb('+RED+')';rr(c,k.x,by,bs,bs,Math.max(3,bs*.12));c.fill();
    c.fillStyle='#fff';c.textAlign='center';c.font='800 '+Math.round(bs*.68)+'px '+DISP;c.fillText(String(fi.n),k.x+bs/2,by+bs*.75);
    c.textAlign='left';var fs=big;c.font='800 '+fs+'px '+DISP;var nm=R.n.toUpperCase();while(fs>14&&c.measureText(nm).width>k.w-bs-12){fs--;c.font='800 '+fs+'px '+DISP}
    c.fillText(nm,k.x+bs+10,by+bs*.8);
    c.font='500 '+sm+'px '+MONO;c.fillStyle='rgba(234,249,255,.55)';var ol=(R.o+' · '+R.N+' steps · '+R.bpm+' bpm').toUpperCase();
    while(c.measureText(ol).width>k.w&&sm>7){sm--;c.font='500 '+sm+'px '+MONO}c.fillText(ol,k.x,by+bs+sm+5);c.restore()}
  function shape(c,pts,fill,stroke,lw,dash){if(!pts.length)return;c.beginPath();pts.forEach(function(p,i){if(i)c.lineTo(p[0],p[1]);else c.moveTo(p[0],p[1])});
    if(pts.length>2){c.closePath();if(fill){c.fillStyle=fill;c.fill()}}c.strokeStyle=stroke;c.lineWidth=lw;if(dash)c.setLineDash(dash);if(pts.length>1)c.stroke();c.setLineDash([])}
  function draw(t){
    blank();var c=OV,g=geo(),R=RHY[I],N=R.N,Rr=g.R,cx=g.cx,cy=g.cy,k=clock(),now=performance.now(),q,j,a;
    c.save();c.lineCap='round';c.lineJoin='round';
    var lit=function(s){if(!k)return 0;var ago=((k.s%N)-s+N)%N;return ago<1.6?1-ago/1.6:0};
    TF=TF.filter(function(f){return now-f.t<700});var tf=function(jj,qq){var m=0;TF.forEach(function(f){if(f.j===jj&&(f.q===qq||qq===undefined))m=Math.max(m,1-(now-f.t)/700)});return m};
    /* the rings: the circle of steps, the white shape's ring, faint rings of pitch inside (brighter while a finger is on them) */
    var fin=0;for(var id in ROLL)fin=1;if(mode)fin=1;
    c.lineWidth=1;c.strokeStyle='rgba(255,255,255,.22)';c.beginPath();c.arc(cx,cy,Rr,0,TAU);c.stroke();
    c.strokeStyle='rgba(255,255,255,.07)';c.beginPath();c.arc(cx,cy,Rr*.63,0,TAU);c.stroke();
    for(var p=0;p<8;p++){c.strokeStyle='rgba(234,249,255,'+(fin?.1:.022)+')';c.beginPath();c.arc(cx,cy,rp(p,Rr),0,TAU);c.stroke()}
    /* the gong, where a beat has one: the whole circle rings red when it is struck */
    if(R.gong&&k){var gl=lit(R.gong-1);if(gl>0&&(H[0][R.gong-1]||H[2][R.gong-1])){c.strokeStyle='rgba('+RED+','+(.75*gl).toFixed(3)+')';c.lineWidth=2+3*gl;c.beginPath();c.arc(cx,cy,Rr*(1.07+.05*(1-gl)),0,TAU);c.stroke()}}
    /* the steps: a small ring on each, numbered round the outside; the main instrument's steps bold */
    var m0=muted(0),m1=muted(1),m2=muted(2),fN=clamp(Math.round(Rr*.066),10,14),vr=clamp(Rr*.044,6,9);
    for(q=0;q<N;q++){a=ang(q,N);var ca=Math.cos(a),sa=Math.sin(a),bt=q%R.b===0;
      if(!H[2][q]){c.strokeStyle='rgba(255,255,255,.4)';c.lineWidth=1.1;c.beginPath();c.arc(cx+ca*Rr,cy+sa*Rr,3.3,0,TAU);c.stroke()}
      if(H[0][q]){var l0=lit(q);c.strokeStyle='rgba(234,249,255,'+((m0?.2:.55)+.45*l0).toFixed(3)+')';c.lineWidth=1.6+1.4*l0;c.beginPath();c.moveTo(cx+ca*Rr*1.05,cy+sa*Rr*1.05);c.lineTo(cx+ca*Rr*(1.11+.03*l0),cy+sa*Rr*(1.11+.03*l0));c.stroke()}
      var hb=H[2][q];c.font=(hb?'700 ':'500 ')+(hb?fN+2:fN)+'px '+MONO;c.textAlign='center';c.textBaseline='middle';
      c.fillStyle=hb?'rgba(255,255,255,.95)':'rgba(234,249,255,'+(bt?.42:.3)+')';c.fillText(String(q+1),cx+ca*Rr*1.22,cy+sa*Rr*1.22)}
    /* the red shape: the main instrument, on the ring; over it the white one, the second instrument, inside */
    var P=[];for(q=0;q<N;q++)if(H[2][q]){a=ang(q,N);P.push([cx+Math.cos(a)*Rr,cy+Math.sin(a)*Rr,q])}
    shape(c,P,m2?null:'rgba(160,14,14,.34)','rgba('+RED+','+(m2?.35:1)+')',2,m2?[4,5]:null);
    var W2=[];for(q=0;q<N;q++)if(H[1][q]){a=ang(q,N);W2.push([cx+Math.cos(a)*Rr*.63,cy+Math.sin(a)*Rr*.63,q])}
    shape(c,W2,m1?null:'rgba(255,255,255,.07)','rgba(240,240,240,'+(m1?.25:.85)+')',1.4,m1?[3,4]:null);
    W2.forEach(function(v){var l=m1?0:lit(v[2]);if(l>0){c.fillStyle='rgba(255,255,255,'+(.22*l).toFixed(3)+')';c.beginPath();c.arc(v[0],v[1],5+11*l,0,TAU);c.fill()}
      c.fillStyle='rgba(245,245,245,'+(m1?.3:.95)+')';c.beginPath();c.arc(v[0],v[1],vr*.66+2.5*l,0,TAU);c.fill()});
    P.forEach(function(v){var l=m2?0:lit(v[2]),f=tf(2,v[2]);if(l>0||f>0){var e=Math.max(l,f);c.fillStyle='rgba('+RED+','+(.28*e).toFixed(3)+')';c.beginPath();c.arc(v[0],v[1],7+15*e,0,TAU);c.fill()}
      c.fillStyle=m2?'rgba('+RED+',.4)':'rgb(255,'+Math.round(45+150*l)+','+Math.round(45+150*l)+')';c.beginPath();c.arc(v[0],v[1],vr+3.5*l,0,TAU);c.fill()});
    /* the notes: each a dot in its sound's colour, each sound's notes joined round the circle (the melody's own shape) */
    for(var v5=0;v5<SN.length;v5++){var NP=NT.filter(function(n){return n.v===v5}).map(function(n){var s=stepOf(n,N),aa=ang(s,N),r5=rp(n.p,Rr);return [cx+Math.cos(aa)*r5,cy+Math.sin(aa)*r5,s]}).sort(function(x,y){return x[2]-y[2]});
      if(NP.length>1)shape(c,NP,null,'rgba('+SCOL[v5]+',.35)',1);
      NP.forEach(function(v){var l=lit(v[2]);if(l>0){c.fillStyle='rgba('+SCOL[v5]+','+(.25*l).toFixed(3)+')';c.beginPath();c.arc(v[0],v[1],6+12*l,0,TAU);c.fill()}
        c.fillStyle='rgba('+SCOL[v5]+','+(.8+.2*l).toFixed(3)+')';c.beginPath();c.arc(v[0],v[1],3.8+2.4*l,0,TAU);c.fill()})}
    FL=FL.filter(function(f){return now-f.t<600});FL.forEach(function(f){var e=(now-f.t)/600,aa=ang(Math.round(f.u*N)%N,N),r5=rp(f.p,Rr);c.strokeStyle='rgba('+f.c+','+(.8*(1-e)).toFixed(3)+')';c.lineWidth=1.4;c.beginPath();c.arc(cx+Math.cos(aa)*r5,cy+Math.sin(aa)*r5,5+16*e,0,TAU);c.stroke()});
    for(var rid in ROLL){var ro=ROLL[rid];if(!ro.on)continue;var rb=k?1-(k.s-Math.floor(k.s)):.5;c.strokeStyle='rgba('+SCOL[ro.v]+','+(.35+.5*rb).toFixed(3)+')';c.lineWidth=1.5;c.beginPath();c.arc(ro.x,ro.y,16+10*rb,0,TAU);c.stroke()}
    /* the hand: once round a cycle, a red trail behind it along the ring (still, at the top, while the music is off) */
    var ah=k?-Math.PI/2+k.f*TAU:-Math.PI/2;
    if(k&&!reduce){for(var tr=0;tr<10;tr++){c.strokeStyle='rgba('+RED+','+(.06*(tr+1)).toFixed(3)+')';c.lineWidth=2;c.beginPath();c.arc(cx,cy,Rr,ah-.6+tr*.06,ah-.6+(tr+1)*.06);c.stroke()}}
    c.strokeStyle='rgba(255,255,255,.75)';c.lineWidth=1.2;c.beginPath();c.moveTo(cx,cy);c.lineTo(cx+Math.cos(ah)*Rr*.98,cy+Math.sin(ah)*Rr*.98);c.stroke();
    c.fillStyle='#fff';c.beginPath();c.arc(cx+Math.cos(ah)*Rr*.98,cy+Math.sin(ah)*Rr*.98,3,0,TAU);c.fill();
    var mf=tf(-1);c.beginPath();c.arc(cx,cy,3.6+3*mf,0,TAU);c.fill();if(mf>0){c.strokeStyle='rgba(255,255,255,'+(.6*mf).toFixed(3)+')';c.lineWidth=1;c.beginPath();c.arc(cx,cy,Rr*.14*(1+.4*(1-mf)),0,TAU);c.stroke()}
    /* the grid: a row an instrument, a cell a step, the beats' cells a little lighter; the step being played lit through every row */
    var gx=g.gx,gy=g.gy,rh=g.rh,gp=g.gap,cw=g.cw,lx=gx+g.lab,mu=[m0,m1,m2];
    if(k){c.fillStyle='rgba(255,255,255,.13)';rr(c,lx+k.q*cw-1,gy-3,cw,3*rh+2*gp+6,3);c.fill()}
    for(j=0;j<3;j++){var y=gy+j*(rh+gp),tj=tf(j,-1);
      c.font='600 '+clamp(Math.round(rh*.42),9,11)+'px '+MONO;c.textAlign='left';c.textBaseline='middle';
      c.fillStyle=j===2?'rgba('+RED+','+(mu[j]?.4:1)+')':'rgba(234,249,255,'+(mu[j]?.3:j===1?.85:.6)+')';var nm=R.r[j][0].toUpperCase();c.fillText(nm,gx,y+rh/2);
      if(mu[j]||tj>0){var tw=c.measureText(nm).width;c.strokeStyle=c.fillStyle;c.lineWidth=1;c.beginPath();c.moveTo(gx,y+rh/2);c.lineTo(gx+tw*(mu[j]?1:tj),y+rh/2);c.stroke()}
      for(q=0;q<N;q++){var x=lx+q*cw,on2=H[j][q],l2=on2&&!mu[j]?lit(q):0,f2=tf(j,q);
        if(on2)c.fillStyle=j===2?'rgba('+RED+','+(mu[j]?.3:.85+.15*l2)+')':'rgba(240,240,240,'+(mu[j]?.2:(j===1?.82:.5)+.18*l2)+')';
        else c.fillStyle='rgba(255,255,255,'+(q%R.b===0?.1:.055)+')';
        rr(c,x+1,y,Math.max(2,cw-2),rh,Math.min(3,cw*.2));c.fill();
        if(f2>0){c.strokeStyle='rgba(255,255,255,'+(.7*f2).toFixed(3)+')';c.lineWidth=1.2;rr(c,x+1,y,Math.max(2,cw-2),rh,3);c.stroke()}}}
    /* under it: the step being played, and the beats of this part of the world (this one long and red) */
    var yb=gy+3*rh+2*gp+12,fi=famOf(I);c.font='500 10px '+MONO;c.textAlign='left';c.fillStyle='rgba(234,249,255,.45)';c.fillText((k?k.q+1:1)+' / '+N,gx,yb);
    var dx2=gx+g.gw;for(var d=fi.list.length-1;d>=0;d--){var me=fi.list[d]===I,wd=me?16:6;dx2-=wd;c.fillStyle=me?'rgb('+RED+')':'rgba(234,249,255,.28)';rr(c,dx2,yb-3,wd,6,3);c.fill();dx2-=5}
    card(c,g,now);c.restore()}
  /* no standing words over it: a beat's name only when one is chosen or the middle is tapped, a row's when it is taken out */
  function hud(){return ''}
  /* ---- (18 Nov, 11:31: "Tie the music to the map. The various rhythms of the world.") On the Earth the band is joined by the rhythm
     of the part of the world in view: the place nearest the middle of the globe, within 2,600 km, chooses from the beats that come from
     there. Each is played on the band's own time and swing (its sixteenths, or its eighths, or triplets for a beat in twelve: whichever
     is nearest the beat's own speed), only its two upper rows (the main instrument and the second: the ticks would crowd the band's own
     shaker and bells), softly under the band. A new place's beat comes in at the bar, and where a place has more than one, the next
     comes in every eight bars. Over the seas, and where none of the 34 comes from, the band plays alone. Turning the globe to a new
     beat names it and its place, for a moment ---- */
  var PLACES=[
    {n:'Chicago',la:41.88,lo:-87.63,r:['house','shuffle']},
    {n:'New York',la:40.71,lo:-74.0,r:['boombap','swing','salsa','jersey']},
    {n:'Atlanta and Georgia',la:33.75,lo:-84.39,r:['trap','funk']},
    {n:'Memphis',la:35.15,lo:-90.05,r:['rock']},
    {n:'New Orleans',la:29.95,lo:-90.07,r:['secondline']},
    {n:'Cuba',la:22.0,lo:-79.5,r:['son','rumba','habanera','tresillo']},
    {n:'Dominican Republic',la:18.73,lo:-70.16,r:['merengue','bachata','dembow']},
    {n:'Colombia',la:10.39,lo:-75.51,r:['cumbia']},
    {n:'Venezuela',la:8.0,lo:-66.0,r:['joropo']},
    {n:'Rio de Janeiro',la:-22.91,lo:-43.17,r:['samba','bossa','carioca']},
    {n:'Bahia',la:-12.97,lo:-38.5,r:['sambareggae']},
    {n:'Ghana',la:6.69,lo:-1.62,r:['gahu','3over4']},
    {n:'Nigeria',la:7.38,lo:3.95,r:['shiko','bembe']},
    {n:'Congo',la:-4.32,lo:15.31,r:['soukous']},
    {n:'Egypt and the Levant',la:31.5,lo:33.0,r:['malfuf']},
    {n:'North India',la:26.85,lo:80.95,r:['teentaal']},
    {n:'Mumbai',la:19.08,lo:72.88,r:['keherwa']},
    {n:'South China',la:23.13,lo:113.26,r:['dongdong']},
    {n:'Java',la:-7.8,lo:110.36,r:['lancaran']}],
    MAPI={},MAP={p:-1,id:null,k0:0,bar:null,rot:{},g:null,spy:null},MAPV=.5,MAPR=2600;
  RHY.forEach(function(R,i){MAPI[R.id]=i});
  function km(a,b,c,d){var r=Math.PI/180,x=Math.sin((c-a)*r/2),y=Math.sin((d-b)*r/2);return 12742*Math.asin(Math.min(1,Math.sqrt(x*x+Math.cos(a*r)*Math.cos(c*r)*y*y)))}
  /* the place in view (a place keeps its beat until another is clearly nearer, so a globe resting between two does not flicker) */
  function placeAt(la,lo,cur){var b=-1,bd=MAPR,cd=1e9;for(var i=0;i<PLACES.length;i++){var d=km(la,lo,PLACES[i].la,PLACES[i].lo);if(i===cur)cd=d;if(d<bd){bd=d;b=i}}
    if(cur>=0&&b!==cur&&cd<MAPR+150&&cd-(b<0?MAPR:bd)<180)return cur;return b}
  /* steps of the band's time: 1 a sixteenth, 2 an eighth, 3 a triplet (three to a beat) */
  function unitOf(R){if(R.N===12)return 3;var nat=60/R.bpm/R.b;return Math.abs(nat-2*SD)<Math.abs(nat-SD)?2:1}
  function mapDst(){var B=bus();if(!B)return null;if(!MAP.g||MAP.g.context!==B.c){MAP.g=B.c.createGain();MAP.g.gain.value=MAPV;MAP.g.connect(B.i)}return MAP.g}
  function mapStep(c,dst,R,k,t){var q=((k%R.N)+R.N)%R.N;for(var j=1;j<3;j++)if(R.r[j][2].indexOf(q+1)>=0){hitRow(c,dst,R,j,q,t,c===AU.c,0);if(MAP.spy&&c===AU.c)MAP.spy({id:R.id,j:j,q:q,t:t})}}
  function mapPlay(c,dst,R,s,when){var u=unitOf(R);if(u===1)mapStep(c,dst,R,s,when);else if(u===2){if(s%2===0)mapStep(c,dst,R,s/2,when)}
    else if(s%4===0){var b=s/4,tl=4*SD/3;for(var j=0;j<3;j++)mapStep(c,dst,R,b*3+j,when+j*tl)}}
  /* (the place is looked at on the first sixteenth of each bar the clock gives out: a busy page can skip a few, the bar's first too) */
  function mapSeq(s,when,la,lo,quiet){var c=AU.c;if(!c)return;var bar=Math.floor(s/16);
    if(bar!==MAP.bar){MAP.bar=bar;var p=placeAt(la,lo,MAP.p),was=MAP.id;
      if(p!==MAP.p){MAP.p=p;MAP.k0=s;MAP.id=p<0?null:PLACES[p].r[(MAP.rot[p]||0)%PLACES[p].r.length]}
      else if(p>=0&&PLACES[p].r.length>1&&s-MAP.k0>=128){MAP.rot[p]=((MAP.rot[p]||0)+1)%PLACES[p].r.length;MAP.k0=s;MAP.id=PLACES[p].r[MAP.rot[p]]}
      /* (its drums fetched as it is chosen: heard from the bar they arrive) */
      if(MAP.id&&MAP.id!==was)try{SND.load(banksOf(RHY[MAPI[MAP.id]]))}catch(e){}
      if(MAP.id&&MAP.id!==was&&!quiet&&performance.now()-lastTouch<15000)say(RHY[MAPI[MAP.id]].n+' · '+PLACES[p].n,'rgb('+RED+')')}
    if(!MAP.id||VB>64)return;var dst=mapDst();if(dst)mapPlay(c,dst,RHY[MAPI[MAP.id]],s,when)}
  return {enter:enter,leave:leave,menu:menu,tick:tick,draw:draw,hud:hud,down:down,move:move,up:up,resize:function(){},
    /* (18 Nov) the Earth's rhythm: called on each of the band's sixteenths while the Earth is shown, with the middle of the globe */
    mapSeq:mapSeq,mapNow:function(){return {p:MAP.p,place:MAP.p>=0?PLACES[MAP.p].n:null,id:MAP.id,u:MAP.id?unitOf(RHY[MAPI[MAP.id]]):0}},
    mapAt:function(la,lo){var p=placeAt(la,lo,-1);return p<0?null:{n:PLACES[p].n,r:PLACES[p].r.slice()}},places:function(){return PLACES.map(function(P){return {n:P.n,la:P.la,lo:P.lo,r:P.r.slice()}})},
    mapSpy:function(f){MAP.spy=f||null},
    /* for the loudness test: a place's beat as the Earth plays it (its two upper rows on the band's time) through a bus like Beat's */
    mapOffline:function(c,g,dur,o){var B=busOn(c,{comp:g.comp,vs:g.vsend}),d=c.createGain(),R=RHY[o.i];d.gain.value=MAPV;d.connect(B.i);
      for(var s=0;.05+s*SD<dur;s++)mapPlay(c,d,R,s,.05+s*SD+((s&1)?SD*SWING:0));return B},
    dbg:function(){var k=clock(),g=geo(),R=RHY[I];return {on:on,i:I,id:R.id,name:R.n,N:R.N,bpm:R.bpm,b:R.b,run:BT.run,sd:BT.sd,
      rows:R.r.map(function(row,j){return {n:row[0],s:row[1],hits:H[j].reduce(function(a,v,q){if(v)a.push(q+1);return a},[]),mute:muted(j)}}),
      played:PLAYED.slice(),pn:PN,notes:NT.map(function(n){return [n.u,n.p,n.v]}),cur:cur,sound:SN[cur][0],
      rolls:Object.keys(ROLL).map(function(id){var r=ROLL[id];return {p:r.p,on:r.on,n:r.n}}),clock:k?{q:k.q,f:+k.f.toFixed(3),k:k.k}:null,card:+cardA(performance.now()).toFixed(2),
      geo:{cx:g.cx,cy:g.cy,R:g.R,gx:g.gx,gy:g.gy,gw:g.gw,rh:g.rh,gap:g.gap,lab:g.lab,cw:g.cw,card:g.card,wide:g.wide},
      duck:AU.duck?+AU.duck.gain.value.toFixed(3):null,count:RHY.length,vb:VB,max:MAXN,sounds:SN.map(function(s){return s[0]})}},
    /* for the tests: where things are on the screen */
    ringAt:function(q){var g=geo(),a=ang(q,RHY[I].N);return {x:g.cx+Math.cos(a)*g.R,y:g.cy+Math.sin(a)*g.R}},
    at:function(q,p){var g=geo(),a=ang(q,RHY[I].N),r=rp(p,g.R);return {x:g.cx+Math.cos(a)*r,y:g.cy+Math.sin(a)*r}},
    cellAt:function(j,q){var g=geo();return {x:g.gx+g.lab+(q+.5)*g.cw,y:g.gy+j*(g.rh+g.gap)+g.rh/2}},
    labelAt:function(j){var g=geo();return {x:g.gx+8,y:g.gy+j*(g.rh+g.gap)+g.rh/2}},
    set:function(a){NT=(a||[]).map(function(q){return {u:q[0],p:q[1],v:q[2]}});save()},pick:pick,lib:RHY,fams:FAM,banks:banksOf,
    sounds:SN,midi:midiOf,chord:chordK,sd:sdOf,t0:function(){return BT.t0},spy:function(f){SPY=f||null},
    /* for the loudness test: a beat (o.i) on another context, through a bus like Beat's, for dur seconds from the start: as it is
       written, or with every step of every row on (o.full); notes ([step, pitch, sound]) and fingers playing ([pitch, sound]) on top */
    offline:function(c,g,dur,o){var B=busOn(c,{comp:g.comp,vs:g.vsend},o),R=RHY[o.i],N=R.N,sd=sdOf(R),rows=R.r.map(function(row){var a=[];for(var q=0;q<N;q++)a.push(!!o.full||row[2].indexOf(q+1)>=0);return a});
      B.dl.delayTime.value=echoT(R);(o.rolls||[]).forEach(function(x){x.r=null});
      for(var k=0;.05+k*sd<dur;k++){var t=.05+k*sd,q=k%N;for(var j=0;j<3;j++)if(rows[j][q])hitRow(c,B.i,R,j,q,t,false,cnt(rows[j]));
        var ns=(o.notes||[]).filter(function(n){return n[0]%N===q}),rl=o.rolls||[],n=ns.length+rl.length;if(!n)continue;var v=.85*chordK(n);
        ns.forEach(function(x){noteAt(c,B,x[2],x[1],v,t)});rl.forEach(function(x){x.r=x.r||{p:x[0],v:x[1]};rollAt(c,B,x.r,v,t)})}
      return B}}
})();
