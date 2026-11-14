/* ---------- MIX: the band and a machine of sounds as a grid of loops, the way Ableton's clip grid plays.
   13 Nov, afternoon: "Make a music dj mixer page with pitch control hundreds of other samples and ability to abeloton live the music
   and make it way more fun and interactive". 13 Nov, evening: "The mixer is Brice but make it less options and more like ly to result in
   good sounds, like abelton . Player. And make it extend into the glove and game screens"; asked what to keep, he kept the clip grid
   alone; asked what plays in the other worlds, "Just the audio remains playing. There is always a small music on off button".
   So there are no knobs. Two grids: the band and the machine.
   The band: its nine players, each a column of four ways to play its own recording: the whole of it, every other bar (the first and
   third, or the second and fourth), or only the first beat of each bar. All four play the recording where it is, so a player always
   meets the others on the same chord (two bars of E, then two of A), and changing between them never restarts it.
   The machine: drums, percussion, bass, keys and bells, four loops each, made in 15-mixsnd.js and all in the band's scale (E minor
   pentatonic); its bass follows the band's two chords, and the band's bass and the machine's never play at once.
   A loop comes in on the next bar, one loop a column; a row's number starts that row in every column of its grid; tapping what plays
   stops it on the next bar.
   The first time Mix is opened it takes the band over from the usual loops where they are, without a gap, and keeps it from then on:
   what is set here goes on playing in Smoke and on the Earth, and the music button at the top pauses it and brings it back.
   The band keeps its own levels and its own room; the machine goes through the toys' bus, under its ceiling, so nothing here comes out
   louder than the band (tools/t_levels.js measures it). Nothing here changes a level. ---------- */
/* MIXON: the mixer has the band (its clock leads the music from then on, in every world) */
var MIXON=false;
var MIX=(function(){
  var BPS=16/STEML,SPB=STEML/16,ROWS=4,on=false,want=false,built=false,gr=null,iv=0,view='a',lastUi=0,
    CK={tRef:0,bRef:0,last:-1},TR=[],UI={};
  /* the band's four ways: g says, for each sixteenth, whether the player is heard (none: always) */
  function bar(s){return Math.floor(s/16)}
  var BANDCLIPS=[{n:'whole',g:null},{n:'bars 1+3',g:function(s){return bar(s)%2?0:1}},{n:'bars 2+4',g:function(s){return bar(s)%2?1:0}},
    {n:'beat one',g:function(s){return ((s%16)+16)%16<4?1:0}}];
  var SHORT=['dundun','shekere','djembe','talking','agogo','bass','balafon','kora','guitar'];
  /* the machine's columns: which four of each list of loops, the kit or instrument each plays (src, one for each loop used), and the
     column's level (g). Measured one loop at a time (t_levels.js), the loud kits (808 room, dust, deep, lo-fi, thunder: long, low,
     driven kicks) came out as loud as the whole band even turned down a quarter, because the toys' ceiling lets a lone hit through
     before it closes; so the drums play the softer kits, and the keys and bells play at half */
  var MACH=[{n:'drums',k:'drum',L:MIXS.DRUMLOOPS,use:[0,1,3,5],src:[11,4,13,12],g:.9,nm:['four','afro','half','sparse'],col:'#3ef0ff'},
    {n:'perc',k:'drum',L:MIXS.PERCLOOPS,use:[0,2,3,4],src:[2,2,2,4],g:.9,nm:['congas','shakers','bongos','wood'],col:'#7dffb2'},
    {n:'bass',k:'note',L:MIXS.BASSLOOPS,use:[0,1,2,5],src:[12,12,12,12],g:.6,nm:['steady','busy','long','sparse'],col:'#c6ff6b'},
    {n:'keys',k:'note',L:MIXS.KEYLOOPS,use:[0,2,3,5],src:[6,0,5,13],g:.45,nm:['piano','marimba','steel pan','clavinet'],col:'#ffb347'},
    {n:'bells',k:'note',L:MIXS.BELLLOOPS,use:[0,1,3,5],src:[2,1,9,15],g:.45,nm:['glock','vibes','gamelan','bells'],col:'#ff2d8a'}];
  (function(){var i;for(i=0;i<NL;i++)TR.push({d:0,i:i,n:SHORT[i],col:BCOL[i],k:'stem',clips:BANDCLIPS,play:-1,next:-1,src:null,gate:null,gv:0});
    MACH.forEach(function(m,j){TR.push({d:1,i:j,n:m.n,col:m.col,k:m.k,g:m.g,play:-1,next:-1,
      clips:m.use.map(function(u,r){var l=m.L[u];return {n:m.nm[r],len:l.len,h:l.h,kit:m.k==='drum'?m.src[r]:-1,inst:m.k==='note'?m.src[r]:-1}})})})})();
  /* the two basses: never at once */
  var BASS=[5,NL+2];
  function rival(j){return j===BASS[0]?BASS[1]:j===BASS[1]?BASS[0]:-1}
  /* ---- the clock: the beat (counted from the start of the band's loop) at a time, and the time of a beat ---- */
  function beatAt(t){return CK.bRef+(t-CK.tRef)*BPS}
  function timeOf(b){return CK.tRef+(b-CK.bRef)/BPS}
  function ctx(){return AU.c}
  /* ---- the signal path: the band's columns into the band's room, at the band's own levels (as its usual loops are); the machine's
     into the toys' bus with its ceiling ---- */
  function graphOn(c,dst){
    var G={c:c,t:[]};
    TR.forEach(function(t,j){var g=c.createGain();g.gain.value=t.d===0?SG[t.i]:t.g;
      if(t.d===0&&(t.i===1||t.i===4)){var hs=c.createBiquadFilter();hs.type='highshelf';hs.frequency.value=4500;hs.gain.value=-6;g.connect(hs);hs.connect(dst.bus)}
      else g.connect(t.d===0?dst.bus:dst.toy);G.t[j]=g});
    return G}
  function ensure(){var c=ctx();if(!c||!AU.bus)return null;if(!gr||gr.c!==c)gr=graphOn(c,{bus:AU.bus,toy:AU.toy});return gr}
  /* ---- a band player: its recording looped whole, lined up with the clock, through a gate that the way it plays opens and closes ---- */
  function stemSrc(tr,beat,when,open){var c=ctx(),b=AU.bufs[tr.i];if(!c||!b||!gr)return false;var s=c.createBufferSource(),g=c.createGain(),at=Math.max(when,c.currentTime),
      off=(((beat%16)+16)%16)*SPB+(at-when);off=((off%STEML)+STEML)%STEML;
    s.buffer=b;s.loop=true;s.loopStart=STEMP;s.loopEnd=STEMP+STEML;g.gain.value=open?1:0;s.connect(g);g.connect(gr.t[TR.indexOf(tr)]);s.start(at,STEMP+off);
    tr.src=s;tr.gate=g;tr.gv=open?1:0;return true}
  /* a player leaving: its gate closes on the bar (a short fade, so nothing clicks) and the recording stops just after */
  function stemOff(tr,when){if(!tr.src)return;try{tr.gate.gain.cancelScheduledValues(when);tr.gate.gain.setTargetAtTime(0,when,.03);tr.src.stop(when+.3)}catch(e){}tr.src=null;tr.gate=null;tr.gv=0}
  /* ---- the machine's sounds: a drum, or a note of an instrument ---- */
  var VOXM=0;
  function sound(j,b,rate,gain,when,pan){var c=ctx();if(!c||!gr||!b||VOXM>40)return;var s=c.createBufferSource(),g=c.createGain(),o=g;s.buffer=b;s.playbackRate.value=clamp(rate,.25,4);g.gain.value=gain;s.connect(g);
    if(c.createStereoPanner){var p=c.createStereoPanner();p.pan.value=clamp(pan||0,-1,1);g.connect(p);o=p}o.connect(gr.t[j]);VOXM++;s.onended=function(){VOXM--;try{o.disconnect()}catch(e){}};s.start(Math.max(when,c.currentTime))}
  /* the note a loop's step plays: the machine's bass moves with the band, up two steps of the scale (E to A) in the third and fourth bars */
  function noteOf(tr,h,s){var m=h[1];if(tr.n==='bass'&&h.length>4&&((bar(s)%4)+4)%4>=2)m=MIXS.pn(h[3]+2,h[4]);return m}
  function trigger(j,tr,clip,h,when,s){var c=ctx(),v=clamp(h[2],0,1);
    if(tr.k==='drum'){var b=MIXS.drum(c,clip.kit,h[1]);sound(j,b,1,v*.62,when,((h[1]%4)-1.5)*.25)}
    else{var m=noteOf(tr,h,s),nt=MIXS.note(c,clip.inst,m);if(nt)sound(j,nt.b,nt.rate,v*.5*nt.g*tilt(m),when,((m%7)-3)*.12)}}
  /* ---- the clock's work, a little ahead of time: each sixteenth, what starts and stops on it and what plays on it ---- */
  function pump(){
    var c=ctx();if(!want||!c||c.state!=='running'||!ensure())return;
    /* the band is taken over as soon as its usual loops are playing */
    if(!MIXON){if(!AU.run||!AU.ready)return;take()}
    var now=c.currentTime,la=document.hidden?1.2:.16,s0=Math.floor(beatAt(now)*4),s1=Math.floor(beatAt(now+la)*4);
    if(CK.last<s0-8)CK.last=s0;
    while(CK.last<s1){CK.last++;var s=CK.last;step(s,timeOf(s/4)+((s&1)?SPB/4*SWING:0))}
    /* the worlds that play on the band's grid keep doing so (03-audio.js) */
    seqPump()}
  /* the hand-over: the usual loops stop a moment from now and the band's players carry on from exactly there, on the same clock */
  function take(){var c=AU.c,n=c.currentTime+.06;
    AU.src.forEach(function(x){try{x&&x.stop(n)}catch(e){}});AU.src=[];AU.run=false;clearInterval(AU.iv);
    CK.tRef=n;CK.bRef=(n-AU.t0)*BPS;CK.last=Math.ceil(CK.bRef*4)-1;MIXON=true;
    TR.forEach(function(tr){if(tr.d===0&&ON[tr.i]&&stemSrc(tr,CK.bRef,n,true))tr.play=0})}
  function off(tr,when){if(tr.k==='stem')stemOff(tr,when);tr.play=-1;if(tr.d===0)ON[tr.i]=0}
  function step(s,t){
    /* on the bar: what was asked to start or stop does so now */
    if(((s%16)+16)%16===0)TR.forEach(function(tr){if(tr.next===-1)return;var nx=tr.next;tr.next=-1;
      if(nx===-2){off(tr,t);return}
      if(tr.k==='stem'&&!tr.src&&!stemSrc(tr,s/4,t,false)){tr.next=nx;return}
      tr.play=nx;if(tr.d===0)ON[tr.i]=1});
    /* what plays on this sixteenth: the band's gates, the machine's loops */
    TR.forEach(function(tr,j){if(tr.play<0)return;var clip=tr.clips[tr.play];
      if(tr.k==='stem'){var v=clip.g?clip.g(s):1;if(v!==tr.gv&&tr.gate){tr.gate.gain.setTargetAtTime(v,t,v?.004:.05);tr.gv=v}return}
      var L=clip.len||16,q=((s%L)+L)%L;for(var i=0;i<clip.h.length;i++)if(clip.h[i][0]===q)trigger(j,tr,clip,clip.h[i],t,s)})}
  /* ---- the hand's part: a loop, a row, a column's stop ---- */
  function hand(){wake();BD.auto=false;BD.manual=true}
  function launch(j,k){var tr=TR[j];if(!tr||!tr.clips[k])return;hand();
    if(tr.play===k&&tr.next===-1){tr.next=-2;return}
    tr.next=k;var r=rival(j);if(r>=0&&(TR[r].play>=0||TR[r].next>=0))TR[r].next=-2}
  function stopT(j){var tr=TR[j];if(tr&&(tr.play>=0||tr.next>=0))tr.next=-2}
  function scene(k,d){hand();TR.forEach(function(tr,j){if(tr.d!==d)return;tr.next=k;var r=rival(j);if(r>=0&&TR[r].d!==d&&(TR[r].play>=0||TR[r].next>=0))TR[r].next=-2})}
  function stopAll(d){TR.forEach(function(tr,j){if(d===undefined||tr.d===d)stopT(j)})}
  /* the sound wakes with a touch here, as everywhere */
  function wake(){if(!AU.want||!AU.c||AU.c.state!=='running')musicOn();ensure()}
  /* ===================== the screen ===================== */
  function E(tag,cls,txt,par){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined&&txt!==null)e.textContent=txt;if(par)par.appendChild(e);return e}
  function btn(cls,txt,par,fn){var b=E('button',cls,txt,par);b.type='button';if(fn)b.addEventListener('click',fn);return b}
  function build(){
    if(built)return;built=true;
    var R=E('div','mx',null,document.body);R.id='mix';R.hidden=true;UI.root=R;
    var tabs=E('div','mxtabs',null,R);UI.tabs={};
    [['a','band'],['b','machine']].forEach(function(t){UI.tabs[t[0]]=btn('mxt',t[1],tabs,function(){view=t[0];uiSync(true)})});
    var V=E('div','mxv',null,R);UI.v=V;UI.grid={};
    ['a','b'].forEach(function(dk){var k=dk==='a'?0:1,cols=TR.filter(function(t){return t.d===k}),g=E('div','mxg',null,V);g.style.gridTemplateColumns='30px repeat('+cols.length+',minmax(0,1fr))';UI.grid[dk]={el:g,cells:[]};
      E('span','mxh','',g);cols.forEach(function(t){var h=E('span','mxh',t.n,g);h.style.setProperty('--c',t.col)});
      for(var r=0;r<ROWS;r++)(function(r){var sb=btn('mxr',String(r+1),g,function(){scene(r,k)});sb.setAttribute('aria-label','start row '+(r+1));
        cols.forEach(function(t){var j=TR.indexOf(t),c=btn('mxc','',g,function(){launch(j,r)});c.style.setProperty('--c',t.col);c.setAttribute('aria-label',t.n+': '+t.clips[r].n);
          UI.grid[dk].cells.push({el:c,j:j,r:r})})})(r);
      btn('mxr mxx','stop',g,function(){hand();stopAll(k)}).setAttribute('aria-label','stop every column');
      cols.forEach(function(t){var j=TR.indexOf(t),s=btn('mxc mxsc','■',g,function(){hand();stopT(j)});s.style.setProperty('--c',t.col);s.setAttribute('aria-label','stop '+t.n)})});
    uiSync(true)}
  /* the screen follows the sound: what plays (lit), what waits for the bar (blinking), what stops on it (dimmed) */
  function uiSync(force){
    if(!built)return;var n=performance.now();if(!force&&n-lastUi<90)return;lastUi=n;
    for(var t in UI.tabs)UI.tabs[t].setAttribute('aria-pressed',view===t?'true':'false');
    UI.grid.a.el.hidden=view!=='a';UI.grid.b.el.hidden=view!=='b';
    UI.grid[view].cells.forEach(function(c){var tr=TR[c.j],cl=tr.clips[c.r],st=tr.play===c.r?(tr.next===-1||tr.next===c.r?'on':'stopping'):tr.next===c.r?'wait':'';
      if(c.el._l!==cl.n){c.el._l=cl.n;c.el.textContent=cl.n}
      if(c.el._s!==st){c.el._s=st;c.el.className='mxc'+(st?' '+st:'');c.el.setAttribute('aria-pressed',st==='on'?'true':'false')}})}
  function place(){if(!UI.root)return;var r=UI.root,d=$('data'),y=STG.y0;if(d){var b=d.getBoundingClientRect();if(b.height)y=Math.max(y,Math.round(b.bottom+8))}
    if(y===UI.py&&STG.y1===UI.py1)return;UI.py=y;UI.py1=STG.y1;r.style.top=y+'px';r.style.height=Math.max(160,STG.y1-y)+'px'}
  /* ===================== the world ===================== */
  function enter(){build();on=true;want=true;UI.root.hidden=false;UI.py=-1;place();if(!iv)iv=setInterval(pump,25);pump();uiSync(true)}
  /* leaving changes nothing that plays: the loops go on in the other worlds */
  function leave(){on=false;if(UI.root)UI.root.hidden=true}
  function tick(){place();uiSync(false)}
  function draw(){
    if(GLX.ok&&!GLX.lost)glClear(ABYSS[0],ABYSS[1],ABYSS[2]);
    /* behind the grid, the beat as a ring that swells and fades: the band's in cyan, the machine's in amber */
    var c=ctx(),o=OV;if(!c||c.state!=='running'||!MIXON)return;var b=beatAt(c.currentTime),f=b-Math.floor(b);
    [0,1].forEach(function(k){if(!TR.some(function(tr){return tr.d===k&&tr.play>=0}))return;
      var R=Math.min(STG.w,STG.h)*(.32+.06*(1-f)),x=STG.x0+STG.w*(k?.72:.28),y=STG.cy;o.strokeStyle=(k?'rgba(255,179,71,':'rgba(62,240,255,')+(.22*(1-f)).toFixed(3)+')';o.lineWidth=1.2;o.beginPath();o.arc(x,y,R,0,TAU);o.stroke()})}
  function hud(){
    var a=TR.filter(function(t){return t.d===0&&t.play>=0}).length,b=TR.filter(function(t){return t.d===1&&t.play>=0}).length;
    return 'tap a loop: in on the next bar, in time and key\n'+(a||b?'playing: '+a+' of the band'+(b?', '+b+' of the machine':'')+'\nit keeps playing in Smoke and Earth'
      :'nothing playing: tap a loop, or a row\'s number')}
  return {enter:enter,leave:leave,tick:tick,draw:draw,hud:hud,resize:function(){if(UI.root)UI.py=-1;place()},
    /* the band left to itself (04-band.js) brings a player in, or takes one out, while the mixer has it: the whole loop, on the next bar */
    player:function(i,v){var tr=TR[i];if(!tr)return;if(v){if(tr.play<0&&tr.next<0){tr.next=0;var r=rival(i);if(r>=0&&(TR[r].play>=0||TR[r].next>=0))TR[r].next=-2}}else stopT(i)},
    dbg:function(){var c=ctx(),n=c?c.currentTime:0;return {on:on,want:want,mixon:MIXON,ctx:c?c.state:'none',graph:!!gr,view:view,beat:c&&MIXON?beatAt(n):0,
      loops:TR.reduce(function(a,t){return a+t.clips.length},0),tracks:TR.map(function(t){return {n:t.n,d:t.d,play:t.play,next:t.next,src:!!t.src,gv:t.gv}})}},
    launch:launch,stop:stopT,scene:scene,stopAll:stopAll,view:function(v){view=v;uiSync(true)},
    /* for the loudness test: the machine built on another context (an offline one), every column on its busiest loop, or (pick)
       only the columns named, each on the loop given */
    offline:function(c,dst,secs,pick){var G=graphOn(c,dst),t0=.05,spb=SPB/4,BUSY=pick||{drums:1,perc:0,bass:1,keys:0,bells:1};
      TR.forEach(function(tr,j){if(tr.d!==1||BUSY[tr.n]===undefined)return;var clip=tr.clips[BUSY[tr.n]];
        for(var s=0;t0+s*spb<secs;s++){var t=t0+s*spb+((s&1)?spb*SWING:0),q=s%clip.len;clip.h.forEach(function(h){if(h[0]!==q)return;var v=clamp(h[2],0,1);
          if(tr.k==='note'){var m=noteOf(tr,h,s),D=MIXS.INSTS[clip.inst],bb=MIXS.instNow(c,clip.inst),best=bb[0];bb.forEach(function(x){if(Math.abs(x.m-m)<Math.abs(best.m-m))best=x});
            var s2=c.createBufferSource(),g=c.createGain();s2.buffer=best.b;s2.playbackRate.value=Math.pow(2,(m-best.m)/12);g.gain.value=v*.5*D[3]*tilt(m);s2.connect(g);g.connect(G.t[j]);s2.start(t)}
          else{var kb=MIXS.kitNow(c,clip.kit)[h[1]],s3=c.createBufferSource(),g3=c.createGain();s3.buffer=kb;g3.gain.value=v*.62;s3.connect(g3);g3.connect(G.t[j]);s3.start(t)}})}});
      return G}};
})();
