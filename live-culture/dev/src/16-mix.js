/* ---------- MIX: a DJ's mixer for the band and a machine of sounds (13 Nov: "Make a music dj mixer page with pitch control hundreds
   of other samples and ability to abeloton live the music and make it way more fun and interactive"; asked which parts, he chose all
   four: a clip grid like Ableton, two decks and a crossfader, drum pads, effects to sweep).
   Deck A is the band: its nine players, each a column of six loops cut from its own recording (the whole four bars, the first two,
   the last two, one bar, one beat, and the whole at half speed). Deck B is the machine: drums, percussion, bass, keys and bells, six
   loops each, played from the sounds made in 15-mixsnd.js, and a column of loops of your own, recorded from the pads.
   A loop starts on the next bar of its deck and keeps time with it (Ableton's way); a row's number starts the whole row.
   Each deck has its own clock: its pitch fader makes it faster and higher, or slower and lower, as a record does (up to 16% either
   way); the arrows nudge it while held; sync matches it to the other. The crossfader goes from the band to the machine. Each deck
   has a filter (left darker, right thinner). The effects pad: a finger across it sweeps a filter over both decks, up it adds echo;
   stutter repeats the last beat, half or quarter while held; brake stops a deck as a record stops.
   The band keeps its own levels and its own room; the machine and the pads go through the toys' bus, under its ceiling, so nothing
   here comes out louder than the band (tools/t_levels.js measures it). ---------- */
var MIXON=false;
var MIX=(function(){
  var BPS=16/STEML,SPB=STEML/16,SC=6,on=false,built=false,gr=null,iv=0,started=false,view='a',PK=0,REC=false,RECK=0,XF=.5,FXP=null,STUT=null,lastUi=0,
    DK=[{n:'A',rate:1,fader:1,nudge:0,ne:0,tRef:0,bRef:0,last:-1,filt:0,brake:0},{n:'B',rate:1,fader:1,nudge:0,ne:0,tRef:0,bRef:0,last:-1,filt:0,brake:0}],
    TR=[],UI={};
  var BANDCLIPS=[{n:'whole',b0:0,len:16},{n:'bars 1-2',b0:0,len:8},{n:'bars 3-4',b0:8,len:8},{n:'one bar',b0:0,len:4},{n:'one beat',b0:0,len:1},{n:'slow',b0:0,len:16,slow:1}];
  var SHORT=['dundun','shekere','djembe','talking','agogo','bass','balafon','kora','guitar'];
  /* the machine's columns: what each plays, and with which kit or instrument in each of its six loops */
  var MACH=[{n:'drums',k:'drum',L:MIXS.DRUMLOOPS,src:[0,1,8,9,10,14],col:'#3ef0ff'},{n:'perc',k:'drum',L:MIXS.PERCLOOPS,src:[2,11,2,2,4,5],col:'#7dffb2'},
    {n:'bass',k:'note',L:MIXS.BASSLOOPS,src:[12,12,12,12,12,12],col:'#c6ff6b'},{n:'keys',k:'note',L:MIXS.KEYLOOPS,src:[6,7,0,5,10,13],col:'#ffb347'},
    {n:'bells',k:'note',L:MIXS.BELLLOOPS,src:[2,1,8,9,11,15],col:'#ff2d8a'},{n:'pads',k:'pads',L:null,src:null,col:'#b46bff'}];
  (function(){var i;for(i=0;i<NL;i++)TR.push({d:0,i:i,n:SHORT[i],col:BCOL[i],k:'stem',clips:BANDCLIPS.map(function(c){return c}),play:-1,next:-1,src:null,g:null});
    MACH.forEach(function(m,j){TR.push({d:1,i:j,n:m.n,col:m.col,k:m.k,clips:m.k==='pads'?[0,1,2,3,4,5].map(function(){return {n:'empty',len:16,h:[],kit:0}}):m.L.map(function(l,k){return {n:l.n||((m.k==='note'?MIXS.INSTS[m.src[k]][0]:MIXS.KITS[m.src[k]][0])),len:l.len,h:l.h,kit:m.k==='drum'?m.src[k]:-1,inst:m.k==='note'?m.src[k]:-1}}),
      play:-1,next:-1,src:null,g:null})})})();
  /* ---- each deck's clock: beats(t) = bRef + (t - tRef) * beats a second; changed only by re-anchoring it where it is ---- */
  function eff(d){return BPS*Math.max(.02,d.rate*(1+d.nudge))}
  /* a deck's beat at a time, and the time of a beat. A sync's nudge ends at a set time (ne): after it the deck runs at its own speed again
     (the players' speeds are switched at that moment by the sound itself, so the beat is exact however late the page gets round to it) */
  function plain(d){return BPS*Math.max(.02,d.rate)}
  function beatAt(d,t){if(d.ne&&t>d.ne)return d.bRef+(d.ne-d.tRef)*eff(d)+(t-d.ne)*plain(d);return d.bRef+(t-d.tRef)*eff(d)}
  function timeOf(d,b){if(d.ne){var be=d.bRef+(d.ne-d.tRef)*eff(d);if(b>be)return d.ne+(b-be)/plain(d)}return d.tRef+(b-d.bRef)/eff(d)}
  function rateAt(d,t){return d.ne&&t>=d.ne?d.rate:d.rate*(1+d.nudge)}
  /* a nudge that has run its time is closed at exactly its end; one still running, when the deck is touched again, is stopped now */
  function settle(k,t){var d=DK[k];if(!d.ne)return;if(t>=d.ne){d.bRef=d.bRef+(d.ne-d.tRef)*eff(d);d.tRef=d.ne;d.nudge=0;d.ne=0;return}
    anchor(d,t);d.ne=0;d.nudge=0;TR.forEach(function(tr){if(tr.d!==k||!tr.src)return;try{tr.src.playbackRate.cancelScheduledValues(t)}catch(e){}});stemRates(k,t)}
  function anchor(d,t){d.bRef=beatAt(d,t);d.tRef=t}
  function ctx(){return AU.c}
  /* ---- the signal path: each deck a filter (low then high) and the crossfader, then deck A into the band's room and deck B into the
     toys' bus with its ceiling; an echo fed by both, coming back under the same ceiling ---- */
  function graphOn(c,dst){
    var G={c:c,d:[],t:[]},k;
    for(k=0;k<2;k++){var inp=c.createGain(),lp=c.createBiquadFilter(),hp=c.createBiquadFilter(),xf=c.createGain(),es=c.createGain();
      lp.type='lowpass';lp.frequency.value=20000;lp.Q.value=.75;hp.type='highpass';hp.frequency.value=10;hp.Q.value=.75;es.gain.value=0;
      inp.connect(lp);lp.connect(hp);hp.connect(xf);xf.connect(k?dst.toy:dst.bus);xf.connect(es);G.d.push({inp:inp,lp:lp,hp:hp,xf:xf,es:es})}
    var dl=c.createDelay(2),fb=c.createGain(),elp=c.createBiquadFilter(),ret=c.createGain();dl.delayTime.value=SPB*.75;fb.gain.value=.42;elp.type='lowpass';elp.frequency.value=3000;ret.gain.value=.9;
    G.d[0].es.connect(dl);G.d[1].es.connect(dl);dl.connect(elp);elp.connect(fb);fb.connect(dl);elp.connect(ret);ret.connect(dst.toy);G.dl=dl;G.fb=fb;
    TR.forEach(function(t,j){var g=c.createGain();g.gain.value=t.d===0?SG[t.i]:.9;
      if(t.d===0&&(t.i===1||t.i===4)){var hs=c.createBiquadFilter();hs.type='highshelf';hs.frequency.value=4500;hs.gain.value=-6;g.connect(hs);hs.connect(G.d[0].inp)}else g.connect(G.d[t.d].inp);G.t[j]=g});
    return G}
  function ensure(){var c=ctx();if(!c)return null;if(!gr||gr.c!==c){gr=graphOn(c,{bus:AU.bus,toy:AU.toy});xfApply();DK.forEach(function(d,k){filtApply(k)})}return gr}
  function xfApply(){if(!gr)return;var c=gr.c,n=c.currentTime,a=Math.cos(XF*Math.PI/2),b=Math.sin(XF*Math.PI/2);gr.d[0].xf.gain.setTargetAtTime(a,n,.02);gr.d[1].xf.gain.setTargetAtTime(b,n,.02)}
  /* a filter: -1 (only the lows) through 0 (open) to 1 (only the highs) */
  function filtApply(k,v){if(!gr)return;var f=v===undefined?DK[k].filt:v,c=gr.c,n=c.currentTime,D=gr.d[k];
    var lpF=f<0?80*Math.pow(250,1+f):20000,hpF=f>0?10*Math.pow(400,f):10;D.lp.frequency.setTargetAtTime(lpF,n,.03);D.hp.frequency.setTargetAtTime(hpF,n,.03)}
  /* ---- the band's loops: a recording looped over part of itself, at the deck's speed, lined up with the deck's beats ---- */
  function stemSrc(tr,clip,beat,when){var c=ctx(),b=AU.bufs[tr.i];if(!c||!b||!gr)return null;var d=DK[0],s=c.createBufferSource(),sl=clip.slow?.5:1,span=clip.len/sl;
    s.buffer=b;s.loop=true;s.loopStart=STEMP+clip.b0*SPB;s.loopEnd=STEMP+(clip.b0+clip.len)*SPB;s.playbackRate.value=rateAt(d,when)*sl;if(d.ne&&when<d.ne)s.playbackRate.setValueAtTime(d.rate*sl,d.ne);
    var ph=(((beat%span)+span)%span)*sl;s.connect(gr.t[TR.indexOf(tr)]);s.start(Math.max(when,c.currentTime),s.loopStart+ph*SPB);s._sl=sl;return s}
  function stemStop(tr,when){if(tr.src){try{tr.src.stop(Math.max(when||0,ctx()?ctx().currentTime:0))}catch(e){}tr.src=null}}
  /* ---- the machine's sounds, on deck B: a drum or a note, at the deck's speed (a faster deck plays them higher, as a record does) ---- */
  var VOXM=0;
  function sound(j,b,rate,gain,when,pan){var c=ctx();if(!c||!gr||!b||VOXM>40)return;var s=c.createBufferSource(),g=c.createGain(),o=g;s.buffer=b;s.playbackRate.value=clamp(rate,.25,4);g.gain.value=gain;s.connect(g);
    if(c.createStereoPanner){var p=c.createStereoPanner();p.pan.value=clamp(pan||0,-1,1);g.connect(p);o=p}o.connect(gr.t[j]);VOXM++;s.onended=function(){VOXM--;try{o.disconnect()}catch(e){}};s.start(Math.max(when,c.currentTime))}
  function trigger(j,tr,clip,h,when){var c=ctx(),d=DK[tr.d],r=rateAt(d,when),v=clamp(h[2],0,1);
    if(tr.k==='drum'||tr.k==='pads'){var kit=tr.k==='pads'?clip.kit:clip.kit,b=MIXS.drum(c,kit,h[1]);sound(j,b,r,v*.62,when,((h[1]%4)-1.5)*.25)}
    else{var nt=MIXS.note(c,clip.inst,h[1]);if(nt)sound(j,nt.b,nt.rate*r,v*.5*nt.g*tilt(h[1]),when,((h[1]%7)-3)*.12)}}
  /* ---- the clock's work, a little ahead of time: each sixteenth of each deck, what starts and stops on it and what plays on it ---- */
  function pump(){
    var c=ctx();if(!c||!on||c.state!=='running'||!ensure())return;var now=c.currentTime,la=document.hidden?1.2:.16;
    DK.forEach(function(d,k){if(d.ne&&now>=d.ne)settle(k,now);
      if(d.brake){var bk=clamp((now-d.brake.t)/.9,0,1);anchor(d,now);d.rate=Math.max(.04,d.brake.r*(1-bk));stemRates(k,now);if(bk>=1){d.brake=null;TR.forEach(function(tr){if(tr.d===k){tr.next=-1;off(tr,now)}});anchor(d,now);d.rate=d.fader;stemRates(k,now)}}
      var s1=Math.floor(beatAt(d,now+la)*4);if(d.last<0||d.last<Math.floor(beatAt(d,now)*4)-8)d.last=Math.floor(beatAt(d,now)*4);
      while(d.last<s1){d.last++;var s=d.last,t=timeOf(d,s/4)+((s&1)?SPB/4*SWING/Math.max(.2,d.rate):0);step(k,s,t)}})}
  function off(tr,when){if(tr.k==='stem')stemStop(tr,when);tr.play=-1;if(tr.d===0&&ON[tr.i]){ON[tr.i]=0;dotSync(tr.i)}}
  function step(k,s,t){
    var d=DK[k];
    /* on the bar: what was asked to start or stop does so now */
    if(s%16===0)TR.forEach(function(tr){if(tr.d!==k||tr.next===-1)return;var nx=tr.next;tr.next=-1;
      if(nx===-2){off(tr,t);return}
      if(tr.k==='stem'){if(!AU.ready){tr.next=nx;return}stemStop(tr,t);tr.src=stemSrc(tr,tr.clips[nx],s/4,t);if(!tr.src){tr.next=nx;return}tr.play=nx;if(!ON[tr.i]){ON[tr.i]=1;dotSync(tr.i)}}
      else tr.play=nx});
    /* what plays on this sixteenth: the machine's loops (a stutter holds them to the same few sixteenths) */
    var ss=STUT&&STUT.s0[k]!==undefined&&s>=STUT.s0[k]?STUT.s0[k]+((s-STUT.s0[k])%STUT.L):s;
    TR.forEach(function(tr,j){if(tr.d!==k||tr.play<0||tr.k==='stem')return;var clip=tr.clips[tr.play],L=clip.len||16,q=((ss%L)+L)%L;
      for(var i=0;i<clip.h.length;i++)if(clip.h[i][0]===q)trigger(j,tr,clip,clip.h[i],t)})}
  /* the deck's speed has changed: every loop of the band on it plays at the new speed from now */
  function stemRates(k,t){var d=DK[k],r=d.rate*(1+d.nudge);TR.forEach(function(tr){if(tr.d!==k||!tr.src)return;try{tr.src.playbackRate.setValueAtTime(r*(tr.src._sl||1),t)}catch(e){}})}
  function setRate(k,r,nudge){var c=ctx(),d=DK[k];if(c){settle(k,c.currentTime);anchor(d,c.currentTime)}if(r!==undefined){d.fader=r;if(!d.brake)d.rate=r}if(nudge!==undefined)d.nudge=nudge;if(c)stemRates(k,c.currentTime)}
  /* sync: the other deck's speed, and its beat caught up by a nudge (a second for a small gap, never more than 12% faster or slower) */
  function sync(k){var c=ctx(),o=DK[1-k],d=DK[k];settle(1-k,c?c.currentTime:0);setRate(k,o.fader);if(!c)return;var n=c.currentTime,e=(beatAt(o,n)%1)-(beatAt(d,n)%1);if(e>.5)e-=1;if(e<-.5)e+=1;
    hit('tok',.2,k?.4:-.4);if(Math.abs(e)<.003)return;var nd=clamp(e/plain(d),-.12,.12),T=e/(plain(d)*nd);setRate(k,undefined,nd);d.ne=n+T;
    TR.forEach(function(tr){if(tr.d!==k||!tr.src)return;try{tr.src.playbackRate.setValueAtTime(d.rate*(tr.src._sl||1),d.ne)}catch(x){}})}
  function brake(k){var c=ctx();if(!c)return;var d=DK[k];settle(k,c.currentTime);anchor(d,c.currentTime);d.brake={t:c.currentTime,r:d.rate}}
  /* ---- stutter: from the next sixteenth, the last beat (or half, or quarter) of everything again and again while held ---- */
  function stutOn(L){var c=ctx();if(!c||!gr||STUT)return;var n=c.currentTime;settle(0,n);settle(1,n);STUT={L:L,s0:{},src:[]};
    DK.forEach(function(d,k){var s=Math.ceil(beatAt(d,n)*4),t=timeOf(d,s/4);STUT.s0[k]=s-L;
      TR.forEach(function(tr){if(tr.d!==k||!tr.src||tr.play<0)return;var clip=tr.clips[tr.play],sl=clip.slow?.5:1,span=clip.len/sl,b=(s-L)/4,ph=(((b%span)+span)%span)*sl,
        st=STEMP+(clip.b0+ph)*SPB,x=c.createBufferSource();x.buffer=tr.src.buffer;x.loop=true;x.loopStart=st;x.loopEnd=st+L/4*SPB*sl;x.playbackRate.value=d.rate*(1+d.nudge)*sl;
        x.connect(gr.t[TR.indexOf(tr)]);try{tr.src.stop(t)}catch(e){}x.start(t,st);STUT.src.push({tr:tr,x:x,was:tr.src})})})}
  function stutOff(){var c=ctx();if(!STUT||!c){STUT=null;return}var n=c.currentTime,S=STUT;STUT=null;
    S.src.forEach(function(o){var tr=o.tr,d=DK[tr.d],s=Math.ceil(beatAt(d,n)*4),t=timeOf(d,s/4);try{o.x.stop(t)}catch(e){}if(tr.play>=0&&tr.src===o.was)tr.src=stemSrc(tr,tr.clips[tr.play],s/4,t)})}
  /* ---- launching: on the next bar of the deck ---- */
  function launch(j,k){var tr=TR[j];if(!tr)return;wake();var clip=tr.clips[k];if(!clip)return;if(tr.k==='pads'&&!clip.h.length&&!(REC&&tr.k==='pads'))return;
    if(tr.play===k&&tr.next===-1){tr.next=-2;return}tr.next=k}
  function stopT(j){var tr=TR[j];if(tr&&(tr.play>=0||tr.next>=0))tr.next=-2}
  function scene(k){wake();TR.forEach(function(tr,j){var clip=tr.clips[k];if(clip&&!(tr.k==='pads'&&!clip.h.length))tr.next=k;else if(tr.play>=0)tr.next=-2})}
  function stopAll(){TR.forEach(function(tr){if(tr.play>=0||tr.next>=0)tr.next=-2})}
  /* the sound wakes with the first touch here, as everywhere (and the band's usual loops stand aside for the decks) */
  function wake(){if(!AU.want||!AU.c||AU.c.state!=='running')musicOn();ensure()}
  /* ---- the pads: sixteen drums of a kit, played now on deck B; while recording, each hit is laid into the loop on its sixteenth ---- */
  function pad(j,v){wake();var c=ctx();if(!c||!gr)return;var b=MIXS.drum(c,PK,j),pt=TR.length-1;sound(pt,b,DK[1].rate*(1+DK[1].nudge),(v||.9)*.62,c.currentTime,((j%4)-1.5)*.25);
    if(REC){var tr=TR[pt],clip=tr.clips[RECK],d=DK[1],s=Math.round(beatAt(d,c.currentTime+.01)*4),L=clip.len,q=((s%L)+L)%L;
      if(!clip.h.length)clip.kit=PK;if(clip.kit!==PK){clip.h=[];clip.kit=PK}clip.h=clip.h.filter(function(h){return !(h[0]===q&&h[1]===j)});clip.h.push([q,j,v||.9]);clip.n='mine';if(tr.play!==RECK&&tr.next!==RECK)tr.next=RECK;padsSave()}
    var el=UI.pads&&UI.pads[j];if(el){el.classList.add('hit');setTimeout(function(){el.classList.remove('hit')},90)}}
  function recSet(v){REC=!!v;wake();var tr=TR[TR.length-1];if(REC&&tr.play!==RECK)tr.next=RECK;uiSync(true)}
  function padsSave(){try{localStorage.setItem('lc.mix.pads',JSON.stringify(TR[TR.length-1].clips.map(function(c){return {len:c.len,kit:c.kit,h:c.h.slice(0,256)}})))}catch(e){}}
  function padsLoad(){try{var a=JSON.parse(localStorage.getItem('lc.mix.pads')||'null');if(!Array.isArray(a))return;var tr=TR[TR.length-1];
    a.slice(0,6).forEach(function(x,k){if(!x||!Array.isArray(x.h))return;var c=tr.clips[k];c.len=x.len===32?32:16;c.kit=clamp(x.kit|0,0,15);c.h=x.h.filter(function(h){return Array.isArray(h)&&h.length===3}).map(function(h){return [clamp(h[0]|0,0,31),clamp(h[1]|0,0,15),clamp(+h[2]||.9,.1,1)]});if(c.h.length)c.n='mine'})}catch(e){}}
  /* ---- the effects pad: across, a filter over both decks; up, the echo; let go and they ease off ---- */
  function fxSet(x,y){FXP={x:x,y:y};if(!gr)return;var c=gr.c,n=c.currentTime,f=x*2-1;filtApply(0,f);filtApply(1,f);
    var e=clamp(y,0,1);gr.d[0].es.gain.setTargetAtTime(e*.55,n,.03);gr.d[1].es.gain.setTargetAtTime(e*.55,n,.03);gr.fb.gain.setTargetAtTime(.3+e*.3,n,.05)}
  function fxOff(){FXP=null;if(!gr)return;var n=gr.c.currentTime;filtApply(0);filtApply(1);gr.d[0].es.gain.setTargetAtTime(0,n,.15);gr.d[1].es.gain.setTargetAtTime(0,n,.15)}
  /* ===================== the screen ===================== */
  function E(tag,cls,txt,par){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined&&txt!==null)e.textContent=txt;if(par)par.appendChild(e);return e}
  function btn(cls,txt,par,fn){var b=E('button',cls,txt,par);b.type='button';if(fn)b.addEventListener('click',fn);return b}
  function hold(b,dn,up){var on2=false;b.addEventListener('pointerdown',function(e){e.preventDefault();on2=true;try{b.setPointerCapture(e.pointerId)}catch(x){}dn();b.classList.add('held')});
    ['pointerup','pointercancel','lostpointercapture'].forEach(function(ev){b.addEventListener(ev,function(){if(!on2)return;on2=false;up();b.classList.remove('held')})})}
  /* a slider: drag along it; a double tap puts it back to its middle */
  function slider(par,name,val,fn,fmt){var w=E('div','mxs',null,par),lab=E('span','mxsl',name,w),tr=E('div','mxst',null,w),th=E('i',null,null,tr),out=E('span','mxsv','',w),v=val,lt=0;
    function show(){th.style.left=(v*100).toFixed(2)+'%';out.textContent=fmt?fmt(v):''}
    function at(e){var r=tr.getBoundingClientRect();v=clamp((e.clientX-r.left)/Math.max(1,r.width),0,1);show();fn(v)}
    var dn=false;tr.addEventListener('pointerdown',function(e){e.preventDefault();dn=true;try{tr.setPointerCapture(e.pointerId)}catch(x){}var n=performance.now();if(n-lt<320){v=.5;show();fn(v);dn=false}else at(e);lt=n;wake()});
    tr.addEventListener('pointermove',function(e){if(dn)at(e)});['pointerup','pointercancel'].forEach(function(ev){tr.addEventListener(ev,function(){dn=false})});
    show();return {set:function(x){v=x;show()},get:function(){return v}}}
  function build(){
    if(built)return;built=true;padsLoad();
    var R=E('div','mx',null,document.body);R.id='mix';R.hidden=true;UI.root=R;
    var tabs=E('div','mxtabs',null,R);UI.tabs={};
    [['a','band'],['b','machine'],['pads','pads'],['fx','effects']].forEach(function(t){UI.tabs[t[0]]=btn('mxt',t[1],tabs,function(){view=t[0];uiSync(true);wake()})});
    var V=E('div','mxv',null,R);UI.v=V;
    /* the two grids */
    UI.grid={};['a','b'].forEach(function(dk){var k=dk==='a'?0:1,cols=TR.filter(function(t){return t.d===k}),g=E('div','mxg',null,V);g.style.gridTemplateColumns='30px repeat('+cols.length+',minmax(0,1fr))';UI.grid[dk]={el:g,cells:[]};
      E('span','mxh','',g);cols.forEach(function(t){var h=E('span','mxh',t.n,g);h.style.setProperty('--c',t.col)});
      for(var r=0;r<SC;r++)(function(r){var sb=btn('mxr',String(r+1),g,function(){scene(r)});sb.title='start row '+(r+1);
        cols.forEach(function(t){var j=TR.indexOf(t),c=btn('mxc','',g,function(){launch(j,r)});c.style.setProperty('--c',t.col);UI.grid[dk].cells.push({el:c,j:j,r:r})})})(r);
      btn('mxr mxx','stop',g,function(){TR.forEach(function(t,j){if(t.d===k)stopT(j)})});cols.forEach(function(t){var j=TR.indexOf(t),s=btn('mxc mxsc','■',g,function(){stopT(j)});s.style.setProperty('--c',t.col)})});
    /* the pads */
    var P=E('div','mxp',null,V);UI.padv=P;var kr=E('div','mxkr',null,P);btn('mxa','◀',kr,function(){PK=(PK+15)%16;padLabels();MIXS.want(ctx(),'k',PK)});UI.kit=E('span','mxkn','',kr);btn('mxa','▶',kr,function(){PK=(PK+1)%16;padLabels();MIXS.want(ctx(),'k',PK)});
    var pg=E('div','mxpg',null,P);UI.pads=[];for(var j=0;j<16;j++)(function(j){var b=E('button','mxpad','',pg);b.type='button';b.addEventListener('pointerdown',function(e){e.preventDefault();pad(j,.9)});UI.pads.push(b)})(j);
    var rr=E('div','mxrr',null,P);UI.rec=btn('mxb mxrec','rec',rr,function(){recSet(!REC)});UI.recInto=btn('mxb','into loop 1',rr,function(){RECK=(RECK+1)%SC;uiSync(true)});
    UI.len=btn('mxb','1 bar',rr,function(){var c=TR[TR.length-1].clips[RECK];c.len=c.len===16?32:16;uiSync(true)});btn('mxb','clear',rr,function(){var tr=TR[TR.length-1],c=tr.clips[RECK];c.h=[];c.n='empty';if(tr.play===RECK)tr.next=-2;padsSave();uiSync(true)});
    /* the effects */
    var F=E('div','mxf',null,V);UI.fxv=F;var xy=E('div','mxxy',null,F);UI.xy=xy;E('span','mxxl','filter: darker ← → thinner · echo ↑',xy);UI.dot=E('i',null,null,xy);
    var xyAt=function(e){var r=xy.getBoundingClientRect();fxSet(clamp((e.clientX-r.left)/r.width,0,1),clamp(1-(e.clientY-r.top)/r.height,0,1));UI.dot.style.left=(FXP.x*100)+'%';UI.dot.style.top=((1-FXP.y)*100)+'%'},xyDn=false;
    xy.addEventListener('pointerdown',function(e){e.preventDefault();xyDn=true;wake();try{xy.setPointerCapture(e.pointerId)}catch(x){}xyAt(e);xy.classList.add('held')});xy.addEventListener('pointermove',function(e){if(xyDn)xyAt(e)});
    ['pointerup','pointercancel'].forEach(function(ev){xy.addEventListener(ev,function(){xyDn=false;fxOff();xy.classList.remove('held')})});
    var fr=E('div','mxrr',null,F);E('span','mxlab','stutter',fr);[['1 beat',4],['1/2',2],['1/4',1]].forEach(function(s){var b=btn('mxb',s[0],fr);hold(b,function(){wake();stutOn(s[1])},stutOff)});
    var fr2=E('div','mxrr',null,F);btn('mxb','brake A',fr2,function(){brake(0)});btn('mxb','brake B',fr2,function(){brake(1)});btn('mxb','stop all',fr2,stopAll);
    /* the decks along the bottom: each its speed, nudges, sync and filter; between them the crossfader */
    var D=E('div','mxd',null,R);UI.dk=[];
    var row=E('div','mxdr',null,D);
    [0,1].forEach(function(k){var d=DK[k],w=E('div','mxdk',null,row),top=E('div','mxdt',null,w),u={};u.name=E('span','mxdn',d.n,top);u.bpm=E('span','mxbpm','',top);u.beat=E('span','mxbt','',top);
      u.pitch=slider(w,'pitch',.5,function(v){setRate(k,1+(v-.5)*.32)},function(v){var p=(v-.5)*32;return (p>=0?'+':'')+p.toFixed(1)+'%'});
      var br=E('div','mxbr',null,w);var nm=btn('mxb','◀',br),np=btn('mxb','▶',br);hold(nm,function(){wake();setRate(k,undefined,-.05)},function(){setRate(k,undefined,0)});hold(np,function(){wake();setRate(k,undefined,.05)},function(){setRate(k,undefined,0)});
      btn('mxb','sync',br,function(){wake();sync(k)});
      u.filt=slider(w,'filter',.5,function(v){d.filt=v*2-1;if(!FXP)filtApply(k)},function(v){var f=v*2-1;return Math.abs(f)<.03?'open':f<0?'darker':'thinner'});
      UI.dk.push(u)});
    UI.xf=slider(D,'A · crossfader · B',.5,function(v){XF=v;xfApply()},function(v){return v<.03?'band':v>.97?'machine':''});
    padLabels();uiSync(true)}
  function padLabels(){if(!UI.kit)return;UI.kit.textContent='kit '+(PK+1)+' of 16 · '+MIXS.KITS[PK][0];UI.pads.forEach(function(b,j){b.textContent=MIXS.ROLES[j]})}
  /* the screen follows the sound: what plays (lit), what waits for the bar (blinking), the decks' speeds and beats */
  function uiSync(force){
    if(!built)return;var n=performance.now();if(!force&&n-lastUi<90)return;lastUi=n;
    for(var t in UI.tabs)UI.tabs[t].setAttribute('aria-pressed',view===t?'true':'false');
    UI.grid.a.el.hidden=view!=='a';UI.grid.b.el.hidden=view!=='b';UI.padv.hidden=view!=='pads';UI.fxv.hidden=view!=='fx';
    ['a','b'].forEach(function(dk){if(UI.grid[dk].el.hidden)return;UI.grid[dk].cells.forEach(function(c){var tr=TR[c.j],cl=tr.clips[c.r],st=tr.play===c.r?(tr.next===-2?'stopping':'on'):tr.next===c.r?'wait':'';
      var lab=tr.k==='pads'?(cl.h.length?'mine':'·'):tr.k==='stem'?cl.n:cl.n;if(c.el._l!==lab){c.el._l=lab;c.el.textContent=lab}if(c.el._s!==st){c.el._s=st;c.el.className='mxc'+(st?' '+st:'')+(tr.k==='pads'&&!cl.h.length?' empty':'')}})});
    if(view==='pads'){UI.rec.setAttribute('aria-pressed',REC?'true':'false');UI.recInto.textContent='into loop '+(RECK+1);UI.len.textContent=TR[TR.length-1].clips[RECK].len===32?'2 bars':'1 bar'}
    var c=ctx();UI.dk.forEach(function(u,k){var d=DK[k],bp=(BPS*60*d.rate*(1+d.nudge)).toFixed(1);if(u.bpm._v!==bp){u.bpm._v=bp;u.bpm.textContent=bp+' bpm'}
      var b=c&&c.state==='running'?beatAt(d,c.currentTime):0,bt=Math.floor(((b%4)+4)%4),s='';for(var q=0;q<4;q++)s+=q===bt?'●':'○';if(u.beat._v!==s){u.beat._v=s;u.beat.textContent=s}})}
  function place(){if(!UI.root)return;var r=UI.root,d=$('data'),y=STG.y0;if(d){var b=d.getBoundingClientRect();if(b.height)y=Math.max(y,Math.round(b.bottom+8))}
    if(y===UI.py&&STG.y1===UI.py1)return;UI.py=y;UI.py1=STG.y1;r.style.top=y+'px';r.style.height=Math.max(160,STG.y1-y)+'px'}
  /* ===================== the world ===================== */
  function enter(){build();on=true;MIXON=true;UI.root.hidden=false;UI.py=-1;place();started=false;DK.forEach(function(d){d.last=-1});
    /* the band's usual loops hand over to deck A where they are, without a gap: the same players, the same beat */
    if(AU.run&&AU.c&&AU.ready&&ensure()){var c=AU.c,n=c.currentTime+.06,b=(loopT()+.06)*BPS;
      AU.src.forEach(function(x){try{x&&x.stop(n)}catch(e){}});AU.src=[];AU.run=false;clearInterval(AU.iv);if(AU.live){AU.live=false;CLK.w0=performance.now()-(loopT())*1000}
      DK.forEach(function(d){d.tRef=n;d.bRef=b;d.last=-1;d.rate=d.fader});
      TR.forEach(function(tr){if(tr.d===0&&ON[tr.i]){tr.src=stemSrc(tr,tr.clips[0],b,n);if(tr.src)tr.play=0}});started=true}
    else if(AU.run)stemsStop();
    clearInterval(iv);iv=setInterval(pump,25);uiSync(true)}
  function leave(){on=false;var c=ctx(),n=c?c.currentTime:0;stutOff();fxOff();
    /* whoever plays in the band on deck A stays in it after: the usual loops take over */
    TR.forEach(function(tr){var was=tr.play>=0;off(tr,n);tr.next=-1;if(tr.d===0&&was){ON[tr.i]=1;dotSync(tr.i)}});
    clearInterval(iv);iv=0;MIXON=false;if(UI.root)UI.root.hidden=true;for(var i=0;i<NL;i++)bandApply(i,true);
    /* and back: the usual loops pick up from deck A's beat */
    if(c&&started){AU.live=false;CLK.w0=performance.now()-beatAt(DK[0],n)/BPS*1000}if(AU.want)stemsStart()}
  function tick(dt,t){
    /* the music has come on (the first touch, or the note): the players who were in the band come in on deck A, on the next bar */
    if(soundLive()&&!started&&AU.ready){started=true;ensure();var c=ctx(),n=c.currentTime;DK.forEach(function(d){d.tRef=n;d.bRef=0;d.last=-1});TR.forEach(function(tr){if(tr.d===0&&ON[tr.i]&&tr.play<0)tr.next=0})}
    if(!soundLive())started=false;
    place();uiSync(false)}
  function draw(t){
    if(GLX.ok&&!GLX.lost)glClear(ABYSS[0],ABYSS[1],ABYSS[2]);
    /* behind the controls, each deck's beat as a ring that swells and fades: the band's in cyan, the machine's in amber */
    var c=ctx(),o=OV;if(!c||c.state!=='running')return;
    DK.forEach(function(d,k){var b=beatAt(d,c.currentTime),f=b-Math.floor(b),busy=TR.some(function(tr){return tr.d===k&&tr.play>=0});if(!busy)return;
      var R=Math.min(STG.w,STG.h)*(.32+.06*(1-f)),x=STG.x0+STG.w*(k?.72:.28),y=STG.cy;o.strokeStyle=(k?'rgba(255,179,71,':'rgba(62,240,255,')+(.22*(1-f)).toFixed(3)+')';o.lineWidth=1.2;o.beginPath();o.arc(x,y,R,0,TAU);o.stroke()})}
  function hud(){
    var c=ctx(),a=TR.some(function(t){return t.d===0&&t.play>=0}),b=TR.some(function(t){return t.d===1&&t.play>=0}),e=0,l2='';
    if(c&&c.state==='running'){var n=c.currentTime;e=(beatAt(DK[1],n)%1)-(beatAt(DK[0],n)%1);if(e>.5)e-=1;if(e<-.5)e+=1}
    var ra=BPS*60*DK[0].rate*(1+DK[0].nudge),rb=BPS*60*DK[1].rate*(1+DK[1].nudge);
    if(a&&b)l2=Math.abs(rb-ra)<.05&&Math.abs(e)<.06?'the two decks are in time':'B is '+(Math.abs(rb-ra)>=.05?(rb>ra?'faster':'slower')+' than A':Math.abs(e).toFixed(2)+' of a beat '+(e>0?'ahead':'behind'))+': sync it, or nudge it by ear';
    if(REC)l2=(l2?l2+' · ':'')+'recording the pads into loop '+(RECK+1);
    return 'the band and '+MIXS.count()+' more sounds: tap a loop, it comes in on the next bar'+(l2?'\n'+l2:'')}
  return {enter:enter,leave:leave,tick:tick,draw:draw,hud:hud,resize:function(){if(UI.root)UI.py=-1;place()},
    /* the band's circles here bring a player in or out on deck A (its whole loop) */
    dot:function(i){var j=i;var tr=TR[j];if(!tr)return;wake();if(tr.play>=0||tr.next>=0)tr.next=-2;else tr.next=0;BD.auto=false;BD.manual=true},
    dbg:function(){var c=ctx(),n=c?c.currentTime:0;return {on:on,ctx:c?c.state:'none',graph:!!gr,view:view,xf:XF,kit:PK,rec:REC,recInto:RECK,count:MIXS.count(),
      decks:DK.map(function(d){return {rate:d.rate,fader:d.fader,nudge:d.nudge,ne:d.ne?+(d.ne-n).toFixed(3):0,filt:d.filt,beat:c?beatAt(d,n):0,brake:!!d.brake}}),
      tracks:TR.map(function(t){return {n:t.n,d:t.d,play:t.play,next:t.next,src:!!t.src}}),pads:TR[TR.length-1].clips.map(function(c){return c.h.length}),stut:!!STUT,fx:FXP}},
    launch:launch,stop:stopT,scene:scene,stopAll:stopAll,rate:function(k,r){setRate(k,r)},sync:sync,xf:function(v){XF=v;xfApply();if(UI.xf)UI.xf.set(v)},pad:pad,rec:recSet,kit:function(k){PK=k;padLabels()},
    view:function(v){view=v;uiSync(true)},brake:brake,stut:function(L){if(L)stutOn(L);else stutOff()},fx:function(x,y){if(x===null)fxOff();else fxSet(x,y)},
    /* for the loudness test: the decks built on another context (an offline one), and what deck B plays laid out on it */
    offline:function(c,dst,secs,busy){var G=graphOn(c,dst),b=G.d[1].xf.gain,a=G.d[0].xf.gain;a.value=0;b.value=1;
      var t0=.05,hitsAt=function(j,tr,clip,from,to){var spb=SPB/4;for(var s=0;t0+s*spb<to;s++){var t=t0+s*spb;if(t<from)continue;var q=s%clip.len;clip.h.forEach(function(h){if(h[0]!==q)return;
        var r=1,v=clamp(h[2],0,1);if(tr.k==='note'){var D=MIXS.INSTS[clip.inst],bb=MIXS.instNow(c,clip.inst),best=bb[0];bb.forEach(function(x){if(Math.abs(x.m-h[1])<Math.abs(best.m-h[1]))best=x});
          var s2=c.createBufferSource(),g=c.createGain();s2.buffer=best.b;s2.playbackRate.value=Math.pow(2,(h[1]-best.m)/12);g.gain.value=v*.5*D[3]*tilt(h[1]);s2.connect(g);g.connect(G.t[j]);s2.start(t)}
        else{var kb=MIXS.kitNow(c,clip.kit)[h[1]],s3=c.createBufferSource(),g3=c.createGain();s3.buffer=kb;g3.gain.value=v*.62;s3.connect(g3);g3.connect(G.t[j]);s3.start(t)}})}};
      TR.forEach(function(tr,j){if(tr.d!==1||tr.k==='pads')return;var k=busy?{drums:4,perc:0,bass:3,keys:4,bells:4}[tr.n]:0;hitsAt(j,tr,tr.clips[k],0,secs)});
      return G}};
})();
