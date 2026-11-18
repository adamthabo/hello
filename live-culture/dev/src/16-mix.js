/* ---------- MIX: the band, and real instruments to play along with it, as a list of loops.
   13 Nov, afternoon: "Make a music dj mixer page with pitch control hundreds of other samples and ability to abeloton live the music
   and make it way more fun and interactive". Evening: "make it less options and more like ly to result in good sounds, like abelton
   . Player. And make it extend into the glove and game screens" (he kept the clip grid alone, and asked that the music play on
   everywhere, with "a small music on off button"). Night: "impossible to make good sounds with those noises": asked how, he chose
   real loops and big buttons: "every loop is a real instrument written to fit the band, laid out as a list of instruments with big
   buttons instead of the small grid". 15 Nov: "The mix is good! Make it able to also cycle through sounds or modes ... five modes.
   funky, African, bluesy, acid, dub" (16-modes.js).
   So: at the top the five modes, then the band's nine players, each a button (in or out). Under them the mode's instruments, recorded
   ones (15-snd.js), each with two loops (in African: congas, bongos, shaker, cajon, claps; marimba, xylophone, vibraphone, piano,
   glockenspiel). A loop comes in on the next bar; one loop an instrument; tapping what plays stops it at the bar. A mode comes in on
   the next bar too: its own instruments on their loops, the band as that mode has it.
   Every loop is written to the band. Its time: the band's 104 beats a minute, its sixteenths, and its own swing on the off ones (a
   shuffle in bluesy). Its chords, read off the stems (13 Nov): the four bars are E minor seventh for two (E G B D, with F sharp and A
   about) and A seventh for two (A C sharp E G): E dorian all through. So the tuned loops are four bars long and change with the band,
   and they are lined up with its four bars wherever they start.
   The first time Mix is opened (or a mode is chosen) it takes the band over from its usual loops where they are, without a gap, and
   keeps it from then on: what is set here goes on playing in Paint and on the Earth, and the music button at the top pauses it and
   brings it back.
   The band keeps its own levels and its own room; African's instruments go through the toys' bus, under its ceiling; the other modes'
   instruments are those modes' bands, into a bus of their own with a little of the band's room and the mode's echo. Each at a level
   of its own measured against the band (tools/t_levels.js: every loop alone, and the busiest of them together). Nothing changes a level.
   ---------- */
/* MIXON: the mixer has the band (its clock leads the music from then on, in every world) */
var MIXON=false;
var MIX=(function(){
  var BPS=16/STEML,SPB=STEML/16,on=false,want=false,built=false,gr=null,iv=0,lastUi=0,loading=null,pend=null,asap=false,
    CK={tRef:0,bRef:0,last:-1},TR=[],UI={},LV={},TRIB=[0,1/3,2/3,3/4],eager=0;
  /* ---- the loops. Drums: one line per sound, a character a sixteenth ('.' nothing, 1-9 how hard). Tuned: notes as
     [sixteenth, MIDI note or notes, how hard, how many sixteenths before the hand damps it] over four bars ---- */
  function bars(fn){var ev=[];[0,16,32,48].forEach(function(b0,i){fn(i).forEach(function(e){ev.push([b0+e[0]].concat(e.slice(1)))})});return ev}
  var ROWS=[
    {n:'congas',bank:'drums',g:.62,pan:-.22,col:'#ffb347',role:'drum',loops:[
      {n:'groove',len:32,lanes:{heel:'3.2...2.3.2.....3.2...2.3.2.....',quinto:'....6...............6...........',
        conga:'............8.7.................',tumba:'............................8.7.'}},
      {n:'open',len:32,lanes:{conga:'8..6........7...8..6..........7.',tumba:'......8.......7.......8.........',
        heel:'........3...............3.......',quinto:'..........64..............6.75..'}}]},
    {n:'bongos',bank:'drums',g:.62,pan:.26,col:'#ff7a2f',role:'drum',loops:[
      {n:'steady',len:16,lanes:{bongo:'7...6...7...6...',bongom:'..4.......4....3',bongol:'......6.......7.'}},
      {n:'busy',len:16,lanes:{bongo:'7..5....7..5....',bongom:'.3..3..3.3..3..3',bongol:'......6......56.'}}]},
    {n:'shaker',bank:'small',g:.62,pan:.36,col:'#ffd79a',role:'drum',loops:[
      {n:'sixteenths',len:16,lanes:{shk:'5.8.5.8.5.8.5.8.',shku:'.3.3.3.3.3.3.3.3'}},
      {n:'off-beats',len:16,lanes:{shl:'..8...8...8...8.',shk:'4...4...4...4...'}}]},
    {n:'cajon',bank:'drums',g:.7,pan:0,col:'#ff2d8a',role:'drum',loops:[
      {n:'backbeat',len:16,lanes:{cbass:'9......79.......',cslap:'....8.......8...',cmid:'..3.......3...3.'}},
      {n:'four',len:16,bank2:'small',lanes:{cbass:'9...7...8...7...',cslap:'....8.......8...',hat:'..5...5...5...5.'}}]},
    {n:'claps',bank:'small',g:1.3,pan:-.12,col:'#c6ff6b',role:'drum',loops:[
      {n:'two and four',len:16,lanes:{clap:'....8.......8...'}},
      {n:'clave',len:32,lanes:{clave:'8.....8.....8.......8...8.......'}}]},
    {n:'marimba',bank:'marimba',g:.42,pan:-.28,col:'#7dffb2',role:'tune',loops:[
      {n:'chords',len:64,ev:bars(function(i){var p=i<2?[[64,71],[67,74]]:[[67,73],[69,76]];return [[2,p[0],.7,2],[6,p[1],.55,2],[10,p[0],.65,2],[14,p[1],.5,2]]})},
      {n:'run',len:64,ev:bars(function(i){var L=[[64,67,71,74,76,74,71,67],[64,67,71,74,78,76,74,71],[69,73,76,79,81,79,76,73],[69,73,76,79,76,73,71,67]][i];
        return L.map(function(m,j){return [j*2,m,j===0?.8:j%2?.5:.65,3]})})}]},
    {n:'xylophone',bank:'xylo',g:.48,pan:.3,col:'#3ef0ff',role:'tune',loops:[
      {n:'tune',len:64,ev:[[0,76,.8],[3,79,.6],[6,83,.7],[10,81,.6],[12,79,.55],[16,78,.7],[19,76,.6],[22,74,.6],[26,76,.7],
        [32,81,.8],[35,85,.65],[38,88,.7],[42,85,.6],[44,83,.55],[48,81,.7],[51,79,.6],[54,76,.6],[58,73,.6],[62,71,.5]]},
      {n:'rolling',len:64,ev:bars(function(i){var L=i<2?[76,71,79,71,83,71,79,74]:[76,73,81,73,85,73,81,76];return L.map(function(m,j){return [j*2,m,j%2?.45:.7]})})}]},
    {n:'vibes',bank:'vibes',g:.27,pan:-.1,col:'#b46bff',role:'tune',loops:[
      {n:'chords',len:64,ev:[[0,[67,71,74,78],.6,20],[22,[67,71,74,78],.42,9],[32,[67,73,78,83],.6,20],[54,[67,73,78,83],.42,9]]},
      {n:'line',len:64,ev:[[0,83,.6,8],[8,81,.5,8],[16,79,.6,8],[24,76,.5,8],[32,85,.6,8],[40,83,.5,8],[48,81,.6,8],[56,79,.5,4],[60,76,.5,4]]}]},
    {n:'piano',bank:'piano',g:.28,pan:.12,col:'#effcff',role:'tune',loops:[
      {n:'chords',len:64,ev:bars(function(i){var v=i<2?[59,62,64,67]:[61,64,67,69];return [[0,v,.7,2],[3,v,.5,2],[6,v,.6,2],[10,v,.55,2]]})},
      {n:'riff',len:64,ev:bars(function(i){var L=i<2?[52,55,57,59,57,55]:[57,61,64,67,64,61],S=[0,3,6,8,11,14];
        return L.map(function(m,j){return [S[j],[m,m+12],j?.6:.7,2]})})}]},
    {n:'glock',bank:'glock',g:.46,pan:.2,col:'#e6f7ff',role:'tune',loops:[
      {n:'sparkle',len:64,ev:[[0,88,.5],[10,83,.4],[22,86,.45],[32,85,.5],[42,88,.4],[54,81,.45]]},
      {n:'chimes',len:64,bank:'chimes',g:.6,ev:[[0,[76,83],.5,30],[32,[73,81],.5,30]]}]}];
  /* every mode's instruments: African's above, then the other four's (16-modes.js), each knowing its mode */
  ROWS.forEach(function(r){r.mode='africa'});
  var ALL=ROWS.slice();MODES.forEach(function(m){if(m.k!=='africa')MODEROWS[m.k].forEach(function(r){r.mode=m.k;ALL.push(r)})});
  /* each loop's sixteenths, worked out once: what plays on each (a drum lane's own level and echo; a note's marks) */
  ALL.forEach(function(r){r.loops.forEach(function(lp){var at=[],i;for(i=0;i<lp.len;i++)at.push([]);lp.bank=lp.bank||r.bank;lp.tri=!!(lp.tri||r.tri);
    var snd=lp.send!==undefined?lp.send:r.send;
    if(lp.lanes)for(var s in lp.lanes){var str=lp.lanes[s],lv=lp.lv&&lp.lv[s]!==undefined?lp.lv[s]:1,fx=snd&&typeof snd==='object'?snd[s]||0:snd||0;
      if(str.length!==lp.len)try{(window.__lc&&window.__lc.errs||[]).push('lane '+r.mode+'/'+r.n+'/'+lp.n+'/'+s+' is '+str.length+' long')}catch(e){}
      for(i=0;i<lp.len;i++){var ch=str.charAt(i);if(ch>='1'&&ch<='9')at[i].push({h:s,v:(+ch)/9*lv,fx:fx})}}
    if(lp.ev)lp.ev.forEach(function(e){var ms=typeof e[1]==='number'?[e[1]]:e[1],o=e[4]||{};
      at[((e[0]%lp.len)+lp.len)%lp.len].push({m:ms,v:e[2]*(lp.g||1),d:e[3]||0,fx:o.fx!==undefined?o.fx:(typeof snd==='number'?snd:0),sl:!!o.sl,ac:!!o.ac,bd:o.bd||0})});
    lp.at=at;lp.banks=[lp.bank];if(lp.bank2)lp.banks.push(lp.bank2);else if(r.bank2&&lp.lanes)lp.banks.push(r.bank2)})});
  var SHORT=['dundun','shekere','djembe','talking','agogo','bass','balafon','kora','guitar'];
  (function(){var i;for(i=0;i<NL;i++)TR.push({k:'stem',i:i,n:SHORT[i],col:BCOL[i],play:-1,next:-1,src:null,gate:null});
    ALL.forEach(function(r,j){TR.push({k:'row',i:j,n:r.n,col:r.col,row:r,mode:r.mode,loops:r.loops,play:-1,next:-1})})})();
  function rowsOf(k){return TR.filter(function(t){return t.k==='row'&&t.mode===k})}
  function trOf(k,n){for(var j=0;j<TR.length;j++){var t=TR[j];if(t.k==='row'&&t.mode===k&&t.n===n)return j}return -1}
  function banksOf(k){var b={};rowsOf(k).forEach(function(t){t.loops.forEach(function(lp){lp.banks.forEach(function(x){b[x]=1})})});
    var v=MODESET[k]&&MODESET[k].voice;if(v)for(var nm in v){if(v[nm].bank)b[v[nm].bank]=1;else{var bk=SND.bankOf(v[nm].hit);if(bk)b[bk]=1}}return Object.keys(b)}
  /* ---- the clock: the beat (counted from the start of the band's loop) at a time, and the time of a beat ---- */
  function beatAt(t){return CK.bRef+(t-CK.tRef)*BPS}
  function timeOf(b){return CK.tRef+(b-CK.bRef)/BPS}
  function ctx(){return AU.c}
  /* ---- the signal path: the band's players into the band's room at the band's own levels (as its usual loops are); African's
     instruments at their level and place, into the toys' bus with its ceiling; the other modes' into the modes' bus: into the
     band's master, with a little of its room and through the mode's echo where a note is thrown into it ---- */
  function graphOn(c,dst){
    var G={c:c,t:[]};
    /* the modes' bus: its own ceiling (as the toys have theirs: a browser's compressor turned back down by what it adds, so that
       under it nothing changes), so that a mode's band and every finger on its voices together stay under the band (t_levels.js) */
    var mb=c.createGain();mb.gain.value=1;var ml=c.createDynamicsCompressor();ml.threshold.value=MODELIM[0];ml.knee.value=MODELIM[1];ml.ratio.value=MODELIM[2];ml.attack.value=.003;ml.release.value=.14;
    var mp=c.createGain();mp.gain.value=MODEPOST;mb.connect(ml);ml.connect(mp);mp.connect(dst.comp||dst.bus);
    var rs=c.createGain();rs.gain.value=0;mp.connect(rs);if(dst.vs)rs.connect(dst.vs);
    var ein=c.createGain(),dl=c.createDelay(2),fb=c.createGain(),lp=c.createBiquadFilter(),hp=c.createBiquadFilter(),ret=c.createGain();
    dl.delayTime.value=3*SPB/4;fb.gain.value=0;lp.type='lowpass';lp.frequency.value=2400;hp.type='highpass';hp.frequency.value=280;ret.gain.value=0;
    ein.connect(dl);dl.connect(lp);lp.connect(hp);hp.connect(fb);fb.connect(dl);hp.connect(ret);ret.connect(mb);
    G.mb=mb;G.mp=mp;G.fx={rs:rs,ein:ein,dl:dl,fb:fb,lp:lp,hp:hp,ret:ret};
    TR.forEach(function(t,j){var g=c.createGain();
      if(t.k==='stem'){g.gain.value=SG[t.i];if(t.i===1||t.i===4){var hs=c.createBiquadFilter();hs.type='highshelf';hs.frequency.value=4500;hs.gain.value=-6;g.connect(hs);hs.connect(dst.bus)}else g.connect(dst.bus)}
      else{g.gain.value=t.row.g;var o=g;if(c.createStereoPanner){var p=c.createStereoPanner();p.pan.value=t.row.pan;g.connect(p);o=p}o.connect(t.mode==='africa'?dst.toy:mb)}
      G.t[j]=g});
    fxSet(G,MODE,0);
    return G}
  /* a mode's room and echo, from a time on */
  function fxSet(G,k,t){var M=MODESET[k]||{},e=M.echo||{},F=G.fx,c=G.c,at=Math.max(t||0,c.currentTime);
    F.rs.gain.setTargetAtTime(M.room||0,at,.08);F.fb.gain.setTargetAtTime(e.fb||0,at,.08);F.ret.gain.setTargetAtTime(e.fb?(e.ret||.6):0,at,.08);
    F.dl.delayTime.setValueAtTime((e.n||3)*SPB/4,at);F.lp.frequency.setValueAtTime(e.lp||2400,at);F.hp.frequency.setValueAtTime(e.hp||280,at)}
  function ensure(){var c=ctx();if(!c||!AU.bus)return null;if(!gr||gr.c!==c)gr=graphOn(c,{bus:AU.bus,toy:AU.toy,comp:AU.comp,vs:AU.vsend});return gr}
  /* ---- a band player: its recording looped, lined up with the clock ---- */
  function stemSrc(tr,beat,when,open){var c=ctx(),b=AU.bufs[tr.i];if(!c||!b||!gr)return false;var s=c.createBufferSource(),g=c.createGain(),at=Math.max(when,c.currentTime),
      off=(((beat%16)+16)%16)*SPB+(at-when);off=((off%STEML)+STEML)%STEML;
    s.buffer=b;s.loop=true;s.loopStart=STEMP;s.loopEnd=STEMP+STEML;g.gain.value=open?1:0;if(!open)g.gain.setTargetAtTime(1,at,.004);s.connect(g);g.connect(gr.t[TR.indexOf(tr)]);s.start(at,STEMP+off);
    tr.src=s;tr.gate=g;return true}
  /* a player leaving: a short fade on the bar, so nothing clicks, and the recording stops just after */
  function stemOff(tr,when){if(!tr.src)return;try{tr.gate.gain.cancelScheduledValues(when);tr.gate.gain.setTargetAtTime(0,when,.03);tr.src.stop(when+.3)}catch(e){}tr.src=null;tr.gate=null}
  /* ---- the acid line's filter: open on the note, shut a moment after (wider and slower on an accent), round a cutoff that itself
     opens and closes over eight bars, the way a hand turns the knob ---- */
  function acidBase(at){var b=MIXON?beatAt(at):0;return 170*Math.pow(2,2.7*(.5-.5*Math.cos(TAU*b/32)))}
  function acidF(c,at,ac){var f=c.createBiquadFilter(),base=acidBase(at);f.type='lowpass';f.Q.value=ac?13:10;f.frequency.setValueAtTime(Math.min(6500,base*(ac?9:5.5)),at);
    f.frequency.setTargetAtTime(base,at+.004,ac?.07:.045);return f}
  /* the clavinet's wah: a peak that opens with the note and settles */
  function wahF(c,at){var f=c.createBiquadFilter();f.type='peaking';f.Q.value=2.4;f.gain.value=8;f.frequency.setValueAtTime(420,at);f.frequency.linearRampToValueAtTime(1900,at+.05);f.frequency.setTargetAtTime(800,at+.05,.08);return f}
  /* ---- an instrument's sound, a little loose (as a hand plays): each hit a touch earlier or later and harder or softer, but never
     on the beat itself, which stays where the band has it ---- */
  var VOXM=0;
  function play(j,b,rate,gain,when,damp,o){var c=ctx();if(!c||!gr||!b||VOXM>56)return;o=o||{};var at=Math.max(when,c.currentTime),row=TR[j].row;
    /* a slide: the note before carries on and glides to this one, its string still ringing */
    if(o.sl){var lv=LV[j];if(lv&&lv.until>at-.02&&o.m!==undefined){try{lv.s.playbackRate.setTargetAtTime(Math.pow(2,(o.m-lv.m0)/12),at,.028);lv.g.gain.cancelScheduledValues(at);lv.g.gain.setValueAtTime(lv.v,at);
      var u=at+(damp>0?damp:.3);lv.g.gain.setTargetAtTime(0,u,.06);lv.s.stop(u+.5);lv.until=u}catch(e){}return}}
    var s=c.createBufferSource(),g=c.createGain(),x=s;s.buffer=b;s.playbackRate.value=rate;g.gain.value=gain;
    if(o.bd){s.playbackRate.setValueAtTime(rate*Math.pow(2,-o.bd/12),at);s.playbackRate.setTargetAtTime(rate,at+.03,.045)}
    if(row&&row.acid){var f=acidF(c,at,o.ac);x.connect(f);x=f}else if(row&&row.wah){var w=wahF(c,at);x.connect(w);x=w}
    x.connect(g);g.connect(gr.t[j]);
    if(o.fx>0&&gr.fx){var sg=c.createGain();sg.gain.value=o.fx*(row?row.g:1);g.connect(sg);sg.connect(gr.fx.ein)}
    VOXM++;s.onended=function(){VOXM--;try{g.disconnect()}catch(e){}};s.start(at);
    var until=at+b.duration/rate;
    if(damp>0){g.gain.setTargetAtTime(0,at+damp,.06);try{s.stop(at+damp+.5)}catch(e){}until=at+damp}
    LV[j]={s:s,g:g,v:gain,m0:o.m0,until:until}}
  function sound(j,tr,lp,e,when,s){var v=e.v*(.92+.16*Math.random()),t=when+((s%4)?(Math.random()-.5)*.006:0);
    if(e.h){var b=SND.hit(e.h);if(b)play(j,b,1,v,t,0,{fx:e.fx});vis(tr,t,v);return}
    e.m.forEach(function(m,k){var nt=SND.note(lp.bank,m);if(nt)play(j,nt.b,nt.rate,v*(k?.82:1),t+k*.006,e.d?e.d*SPB/4:0,{fx:e.fx,sl:e.sl&&!k,ac:e.ac,bd:e.bd,m:m,m0:m-12*Math.log2(nt.rate)})});vis(tr,t,v)}
  /* a mode's instruments move the pictures as the band's players do (each stands in for one of them: 04-band.js) */
  function vis(tr,t,v){if(tr.mode==='africa'||tr.row.vis===undefined)return;if(VQ.length<240)VQ.push({t:t,i:tr.row.vis,s:v})}
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
    TR.forEach(function(tr){if(tr.k==='stem'&&ON[tr.i]&&stemSrc(tr,CK.bRef,n,true))tr.play=0})}
  /* the page started in a mode other than African: the mixer has the music from the first touch, and the mode starts on the one */
  function boot(){var c=AU.c;if(!c||MIXON)return;var n=c.currentTime+.06;
    AU.t0=n;AU.first=false;AU.lat=Math.min(.35,c.outputLatency||c.baseLatency||0);MIXON=true;CK.tRef=n;CK.bRef=0;CK.last=-1;
    for(var i=0;i<NL;i++)ON[i]=0;BD.started=true;BD.auto=false;want=true;pend=pend||MODE;asap=true;bootB=0;eager=32;
    SND.load(banksOf(pend));ensure();if(!iv)iv=setInterval(pump,25);pump()}
  function off(tr,when){if(tr.k==='stem'){stemOff(tr,when);ON[tr.i]=0}tr.play=-1}
  /* a mode comes in: the instruments of the others go out on this bar, its own come in on their loops, the band as it has it */
  function modeApply(k,t){var M=MODESET[k]||MODESET.africa;MODE=k;if(gr)fxSet(gr,k,t);BD.auto=false;
    var boot1=bootB===0&&MODEBUILD[k]&&!built,first=boot1?MODEBUILD[k].slice(0,2):null;bootB=boot1?2:-1;
    TR.forEach(function(tr){
      if(tr.k==='stem'){var w=!!M.band[tr.i];if(w&&tr.play<0)tr.next=0;else if(!w&&tr.play>=0)tr.next=-2;else tr.next=-1;return}
      var p=tr.mode===k?M.rows[tr.n]:undefined;if(first&&first.indexOf(tr.n)<0)p=undefined;
      if(p===undefined){tr.next=tr.play>=0?-2:-1;return}
      tr.next=tr.play===p?-1:p});
    try{localStorage.setItem('lc-mode',k)}catch(e){}
    rowsBuild();chipSync()}
  /* left to itself (the page opened in this mode), the mode's band builds as the band does: one more every two bars */
  var bootB=-1;
  function bootStep(){var L=MODEBUILD[MODE];if(!L||bootB<0)return;if(bootB>=L.length){bootB=-1;return}var j=trOf(MODE,L[bootB]);bootB++;
    if(j>=0&&TR[j].play<0&&TR[j].next<0){var p=MODESET[MODE].rows[TR[j].n];TR[j].next=p===undefined?0:p}}
  function step(s,t){
    var bar=((s%16)+16)%16===0;
    /* (a mode waits on the bar for its sounds, so its instruments come in together: four bars at most) */
    if(pend&&(asap||bar&&(pendOK()||s>=pendBy))){var k=pend;pend=null;if(!bar)eager=s+32;modeApply(k,t);bar=true;asap=false}
    else if(bar&&bootB>0&&((s/16)|0)%2===0)bootStep();
    /* on the bar: what was asked to start or stop does so now (an instrument whose sounds are still on their way waits a bar) */
    if(bar)TR.forEach(function(tr){if(tr.next===-1)return;var nx=tr.next;
      if(nx===-2){tr.next=-1;off(tr,t);return}
      if(tr.k==='stem'){if(!tr.src&&!stemSrc(tr,s/4,t,false))return;tr.next=-1;tr.play=0;ON[tr.i]=1;return}
      if(!tr.loops[nx].banks.every(SND.ready))return;tr.next=-1;tr.play=nx});
    else if(eager>s)TR.forEach(function(tr){if(tr.k==='row'&&tr.next>=0&&tr.play<0&&tr.loops[tr.next].banks.every(SND.ready)){tr.play=tr.next;tr.next=-1}});
    /* what plays on this sixteenth (a shuffle's second and third sixteenths on the beat's triplets) */
    var tb=0;
    TR.forEach(function(tr,j){if(tr.k!=='row'||tr.play<0)return;var lp=tr.loops[tr.play],q=((s%lp.len)+lp.len)%lp.len,ev=lp.at[q];if(!ev.length)return;
      var tt=t;if(lp.tri){if(!tb)tb=timeOf(Math.floor(s/4));tt=tb+TRIB[((s%4)+4)%4]*SPB}
      for(var i=0;i<ev.length;i++)sound(j,tr,lp,ev[i],tt,s)})}
  /* ---- the hand's part ---- */
  function hand(){wake();BD.auto=false;BD.manual=true;bootB=-1}
  /* the two basses never play at once: the band's and a mode's */
  function oneBass(j){var tr=TR[j];if(tr.k==='stem'&&tr.i===5){TR.forEach(function(t,i){if(t.k==='row'&&t.row.role==='bass')stopT(i)})}
    else if(tr.k==='row'&&tr.row.role==='bass'){TR.forEach(function(t,i){if(t.k==='stem'&&t.i===5)stopT(i)})}}
  /* a loop: in on the next bar; tapping the one that plays takes it out; tapping one that waits calls it off */
  function launch(j,k){var tr=TR[j];if(!tr)return;hand();if(tr.k==='stem')k=0;else{if(!tr.loops[k])return;SND.load(tr.loops[k].banks)}
    if(tr.play===k&&tr.next===-1){tr.next=-2;return}
    if(tr.next===k&&tr.play<0){tr.next=-1;return}
    oneBass(j);tr.next=k}
  function stopT(j){var tr=TR[j];if(!tr)return;if(tr.play>=0)tr.next=-2;else tr.next=-1}
  function stopAll(){TR.forEach(function(tr,j){if(tr.k==='row')stopT(j)})}
  /* a jam (14 Nov: "music not fun"): one tap, a new set of the mode's instruments, on the next bar: a drum, often another one, its
     bass if it has one, one or two of the tuned ones, each on one of its loops (all of them written to go together) */
  function jam(){hand();var pick=function(a){return a[Math.floor(Math.random()*a.length)]},want={},R=rowsOf(MODE),by=function(r){return R.filter(function(t){return t.row.role===r}).map(function(t){return t.n})},
    drums=by('drum'),tunes=by('tune'),bass=by('bass');
    if(MODE==='africa'){want[pick(['congas','bongos','cajon'])]=1;if(Math.random()<.7)want[pick(['shaker','claps'])]=1}
    else{want[drums[0]]=1;if(drums.length>1&&Math.random()<.6)want[pick(drums.slice(1))]=1;if(bass.length&&Math.random()<.85)want[bass[0]]=1;if(Math.random()<.4)by('fx').forEach(function(n){want[n]=1})}
    var t1=pick(tunes);want[t1]=1;if(Math.random()<.55)want[pick(tunes.filter(function(x){return x!==t1}))]=1;
    var same=R.every(function(tr){return (!!want[tr.n])===(tr.play>=0)});
    if(want[bass[0]])TR.forEach(function(t,i){if(t.k==='stem'&&t.i===5)stopT(i)});
    R.forEach(function(tr){var j=TR.indexOf(tr);if(!want[tr.n]){stopT(j);return}
      var k=same&&tr.loops.length>1?1-Math.max(0,tr.play):Math.floor(Math.random()*tr.loops.length);SND.load(tr.loops[k].banks);tr.next=tr.play===k?-1:k});
    if(MODE==='africa'&&!TR.some(function(tr){return tr.k==='stem'&&(tr.play>=0||tr.next===0)}))TR.forEach(function(tr){if(tr.k==='stem'&&(tr.n==='bass'||tr.i<3))tr.next=0});
    uiSync(true)}
  /* the sound wakes with a touch here, as everywhere */
  function wake(){if(!AU.want||!AU.c||AU.c.state!=='running')musicOn();ensure()}
  /* the mixer takes the music (from another world too: a mode chosen with the button at the top) */
  function start(){want=true;ensure();if(!iv)iv=setInterval(pump,25);pump()}
  /* a mode chosen: it comes in on the next bar (at once when the music has only just begun); once its sounds are in, the other modes'
     are fetched too, a moment later, so the next choice comes in on the bar */
  var pendBy=0,rest=false;
  function pendOK(){var M=MODESET[pend];if(!M)return true;for(var n in M.rows){var j=trOf(pend,n);if(j>=0&&!TR[j].loops[M.rows[n]].banks.every(SND.ready))return false}return true}
  function modeSet(k){if(!MODESET[k])return;hand();SND.load(banksOf(k)).then(function(){if(rest)return;rest=true;setTimeout(function(){MODES.forEach(function(m){SND.load(banksOf(m.k))})},3000)});
    pendBy=CK.last+64;pend=k;var c=ctx();if(!MIXON||(c&&AU.t0>c.currentTime-1.2))asap=true;start();chipSync();uiSync(true)}
  function next(){var cur=pend||MODE,i=0;for(var k=0;k<MODES.length;k++)if(MODES[k].k===cur)i=k;modeSet(MODES[(i+1)%MODES.length].k)}
  /* every sound the mode needs, fetched once */
  function loadAll(){var k=pend||MODE;loading=SND.load(banksOf(k));return loading}
  /* ---- a touch's voice in the mode (Paint, the Earth): the mode's own instrument for the main notes, its hat for the lightning, its
     kick and rim for the knocks; into the mode's bus, under the ceiling its band is under; African keeps the glass ---- */
  /* a touch in a mode lands on the mode's next sixteenth, and one touch sounds on any one sixteenth (so a flurry of fingers plays
     along with the groove, as a sixteenth-note line, rather than over it) */
  var QS={};
  function slot(t){if(!MIXON)return {t:t,k:-1};var b=Math.ceil(beatAt(t)*4-.02),k=b;var tt=timeOf(b/4)+((b&1)?SPB/4*SWING:0);return {t:Math.max(t,tt),k:k}}
  function voice(name,midi,vel,pan,when,gm,rate){
    var M=MODESET[MODE],v=M&&M.voice&&M.voice[name];if(!v)return false;var c=ctx();if(!c||!AU.toy||c.state!=='running'||VOX>52)return false;
    var sl=slot(Math.max(when||0,c.currentTime+.01));if(sl.k>=0){var n=QS[sl.k]||0;if(n>=1)return true;QS[sl.k]=n+1;if(n===0)for(var q in QS)if(+q<sl.k-64)delete QS[q]}when=sl.t;
    var b=null,r=rate||1,m=midi||64;
    if(v.hit){var bk=SND.bankOf(v.hit);if(!bk||!SND.ready(bk))return false;b=SND.hit(v.hit)}
    else{if(!SND.ready(v.bank))return false;while(m<v.lo)m+=12;while(m>v.hi)m-=12;var nt=SND.note(v.bank,m);if(!nt)return false;b=nt.b;r=nt.rate}
    if(!b)return false;ensure();
    var s=c.createBufferSource(),g=c.createGain(),x=s,o=g,at=Math.max(when||0,c.currentTime);s.buffer=b;s.playbackRate.value=clamp(r,.25,4);
    g.gain.value=clamp(vel,0,1)*v.g*(gm||1)*(v.hit?1:tilt(m));
    if(v.acid){var f=acidF(c,at,vel>.6);x.connect(f);x=f}x.connect(g);
    if(c.createStereoPanner){var p=c.createStereoPanner();p.pan.value=clamp(pan||0,-1,1);g.connect(p);o=p}o.connect(gr?gr.mb:AU.toy);
    if(v.fx&&gr&&gr.fx){var sg=c.createGain();sg.gain.value=v.fx;g.connect(sg);sg.connect(gr.fx.ein)}
    if(v.d){g.gain.setTargetAtTime(0,at+v.d,.06);try{s.stop(at+v.d+.5)}catch(e){}}
    VOX++;s.onended=function(){VOX--;try{o.disconnect()}catch(e){}};s.start(at);return true}
  /* (17 Nov, evening) Beat's five sounds: real instruments bent out of shape, each struck and dying away (rule 1), on the mixer's bus,
     at the time the bar gives them (Beat's own grid is already the band's) */
  /* (their gains set so the circle at its fullest, 48 notes, eight on each of six sixteenths, stays some 4 dB under the band:
     tools/t_levels.js) */
  var BEATV={glass:{bank:'glock',oct:1,g:.065,d:.9,fx:.5},rubber:{bank:'marimba',oct:-1,g:.042,d:.45,acid:1},bells:{bank:'chimes',oct:-1,g:.018,d:1.8,fx:.45},
    boom:{bank:'fbass',oct:-2,g:.039,d:.55,lp:700},pluck:{bank:'gtr',oct:0,g:.041,d:.5,wah:1,fx:.3}};
  function bnode(c,v,m,vel,at,dst,ein){var nt=SND.note(v.bank,m+12*(v.oct||0));if(!nt)return null;var s=c.createBufferSource(),g=c.createGain(),x=s;s.buffer=nt.b;
    s.playbackRate.value=clamp(nt.rate,.25,4);g.gain.value=clamp(vel,0,1)*v.g*tilt(m+12*(v.oct||0));
    if(v.acid){var f=c.createBiquadFilter();f.type='lowpass';f.Q.value=12;f.frequency.setValueAtTime(2200,at);f.frequency.setTargetAtTime(260,at+.005,.07);x.connect(f);x=f}
    if(v.wah){var w=c.createBiquadFilter();w.type='peaking';w.Q.value=2.6;w.gain.value=8;w.frequency.setValueAtTime(380,at);w.frequency.linearRampToValueAtTime(1900,at+.12);x.connect(w);x=w}
    if(v.lp){var l=c.createBiquadFilter();l.type='lowpass';l.frequency.value=v.lp;l.Q.value=3;x.connect(l);x=l}
    x.connect(g);g.connect(dst);if(v.fx&&ein){var sg=c.createGain();sg.gain.value=v.fx;g.connect(sg);sg.connect(ein)}
    if(v.d){g.gain.setTargetAtTime(0,at+v.d,.08);try{s.stop(at+v.d+.7)}catch(e){}}s.start(at);return {s:s,g:g}}
  function bvoice(name,midi,vel,pan,when){var v=BEATV[name],c=ctx();if(!v||!c||c.state!=='running'||VOX>52||!AU.toy)return false;if(!SND.ready(v.bank)){SND.load([v.bank]);return false}
    ensure();var at=Math.max(when||0,c.currentTime),o=null,dst=gr?gr.mb:AU.toy;if(c.createStereoPanner){o=c.createStereoPanner();o.pan.value=clamp(pan||0,-1,1);o.connect(dst);dst=o}
    var n=bnode(c,v,midi,vel,at,dst,gr&&gr.fx?gr.fx.ein:null);if(!n)return false;VOX++;n.s.onended=function(){VOX--;try{(o||n.g).disconnect()}catch(e){}};return true}
  /* ===================== the screen ===================== */
  var MCOL={funk:'#ff6a3d',africa:'#ffb347',blues:'#4aa8ff',acid:'#c6ff6b',dub:'#b46bff'};
  function E(tag,cls,txt,par){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined&&txt!==null)e.textContent=txt;if(par)par.appendChild(e);return e}
  function btn(cls,txt,par,fn){var b=E('button',cls,txt,par);b.type='button';if(fn)b.addEventListener('click',fn);return b}
  /* (15 Nov, 20:39: "music is great! I love it, maybe see if you can make it all fit on one page") one screen of a phone, no scrolling:
     the five modes; the band's nine in two rows; the mode's instruments as cards in two columns, each its name over its two loops; and
     at the foot, side by side, a new mix and stop */
  /* (15 Nov, 23:20: "make the music buttons always on the page, fit") in three parts, the modes and the band, the instruments, and the
     foot, so that a screen wider than it is tall can set the instruments beside the rest */
  function build(){
    if(built)return;built=true;
    var R=E('div','mx',null,document.body);R.id='mix';R.hidden=true;UI.root=R;
    var L=E('div','mxl',null,R);UI.list=L;UI.b=[];UI.m=[];
    var A=E('div','mxa',null,L),C=E('div','mxi',null,L);
    var md=E('div','mxmodes',null,A);MODES.forEach(function(m){var b=btn('mxb mxm',m.n,md,function(){modeSet(m.k)});b.style.setProperty('--c',MCOL[m.k]);b.setAttribute('aria-label','Mode: '+m.n);UI.m.push({el:b,k:m.k})});
    E('div','mxsec','the band',A);
    var band=E('div','mxband',null,A);
    TR.forEach(function(t,j){if(t.k!=='stem')return;var b=btn('mxb mxp',t.n,band,function(){launch(j,0)});b.style.setProperty('--c',t.col);b.setAttribute('aria-label',BNAMES[t.i]);UI.b.push({el:b,j:j,k:0})});
    UI.bandN=UI.b.length;
    UI.sec=E('div','mxsec','play along',C);
    UI.rows=E('div','mxrows',null,C);
    var f=E('div','mxfoot',null,L);UI.jam=btn('mxstop mxjam','jam: a new mix',f,function(){jam();hit('tok',.2,0)});UI.jam.setAttribute('aria-label','Jam: start a new mix of instruments');
    UI.stop=btn('mxstop','stop',f,function(){hand();stopAll()});UI.stop.setAttribute('aria-label','Stop the instruments');
    rowsBuild();uiSync(true);try{document.fonts.ready.then(function(){UI.py=-1;place()})}catch(e){}}
  /* the mode's instruments: a card each, its name over its two loops */
  function rowsBuild(){if(!built)return;var L=UI.rows,k=MODE;if(UI.rowsK===k)return;UI.rowsK=k;while(L.firstChild)L.removeChild(L.firstChild);UI.b.length=UI.bandN;
    UI.sec.textContent=k==='africa'?'play along':modeName(k)+' band';
    TR.forEach(function(t,j){if(t.k!=='row'||t.mode!==k)return;var row=E('div','mxrow',null,L);row.style.setProperty('--c',t.col);E('span','mxn',t.n,row);
      t.loops.forEach(function(lp,q){var b=btn('mxb',lp.n,row,function(){launch(j,q)});b.setAttribute('aria-label',t.n+': '+lp.n);UI.b.push({el:b,j:j,k:q})})});
    uiSync(true);fit()}
  /* (15 Nov, 23:20: "make the music buttons always on the page, fit") every button is as tall as lets the whole of Mix fit between the
     top and the worlds, whatever the screen: 46 px at most, 24 at least, found by halving; the gaps and the letters go with it. A screen
     wider than it is tall (a phone on its side) sets the instruments beside the modes and the band. Where that still leaves the buttons
     low (under 30), the headings go and each instrument's name stands beside its loops, if that gives them more. Only a screen too small
     even for that would scroll */
  function fit(){var R=UI.root,L=UI.list;if(!R||R.hidden||!L)return;R.classList.toggle('mxw',VW>VH*1.15&&VW>=520);
    var H=L.clientHeight-(parseFloat(getComputedStyle(L).paddingBottom)||0);if(!(H>0))return;
    function need(bh){R.style.setProperty('--bh',bh+'px');var a=1e9,b=-1e9;for(var e=L.firstElementChild;e;e=e.nextElementSibling){var q=e.getBoundingClientRect();if(q.height<=0)continue;a=Math.min(a,q.top);b=Math.max(b,q.bottom)}return b-a}
    function best(){var lo=24,hi=46;if(need(hi)<=H)return hi;if(need(lo)>H)return 0;while(hi-lo>1){var m=(lo+hi)>>1;if(need(m)<=H)lo=m;else hi=m}return lo}
    R.classList.remove('mxsm');var b1=best(),b2=0;
    if(b1<30){R.classList.add('mxsm');b2=best();if(b2<=b1){R.classList.remove('mxsm');b2=0}}
    var bh=Math.max(b1,b2)||24;R.style.setProperty('--bh',bh+'px');UI.bh=bh;UI.fits=!!(b1||b2);L.scrollTop=0}
  /* the button at the top of every world: the mode's name; a tap, the next one (blinking until it comes in on the bar) */
  function chipSync(){var b=document.getElementById('bMode');if(!b)return;var k=pend||MODE,nm=modeName(k);if(b.textContent!==nm)b.textContent=nm;b.style.setProperty('--mc',MCOL[k]);
    b.classList.toggle('wait',!!pend);var i=0;for(var q=0;q<MODES.length;q++)if(MODES[q].k===k)i=q;
    b.setAttribute('aria-label','Music mode: '+nm+'. Tap for the next mode, '+MODES[(i+1)%MODES.length].n)}
  /* the screen follows the sound: what plays (lit), what waits for the bar (blinking), what stops on it (dimmed) */
  function uiSync(force){
    chipSync();if(!built)return;var n=performance.now();if(!force&&n-lastUi<90)return;lastUi=n;
    UI.b.forEach(function(c){var tr=TR[c.j],st=tr.play===c.k?(tr.next===-1||tr.next===c.k?'on':'stopping'):tr.next===c.k?'wait':'';
      if(c.el._s!==st){c.el._s=st;c.el.className=(tr.k==='stem'?'mxb mxp':'mxb')+(st?' '+st:'');c.el.setAttribute('aria-pressed',st==='on'?'true':'false')}});
    UI.m.forEach(function(c){var st=pend===c.k?'wait':!pend&&MODE===c.k?'on':'';if(c.el._s!==st){c.el._s=st;c.el.className='mxb mxm'+(st?' '+st:'');c.el.setAttribute('aria-pressed',st==='on'?'true':'false')}})}
  function place(){if(!UI.root)return;var r=UI.root,d=$('data'),y=STG.y0;if(d){var b=d.getBoundingClientRect();if(b.height)y=Math.max(y,Math.round(b.bottom+8))}
    if(y===UI.py&&STG.y1===UI.py1&&VW===UI.pw)return;UI.py=y;UI.py1=STG.y1;UI.pw=VW;r.style.top=y+'px';r.style.height=Math.max(120,STG.y1-y)+'px';fit()}
  /* ===================== the world ===================== */
  function enter(){build();on=true;UI.root.hidden=false;UI.py=-1;place();loadAll();start();rowsBuild();uiSync(true)}
  /* leaving changes nothing that plays: the loops go on in the other worlds */
  function leave(){on=false;if(UI.root)UI.root.hidden=true}
  function tick(){place();uiSync(false)}
  function draw(){
    if(GLX.ok&&!GLX.lost)glClear(ABYSS[0],ABYSS[1],ABYSS[2]);
    /* behind the list, the beat as a ring that swells and fades, in the mode's colour */
    var c=ctx(),o=OV;if(!c||c.state!=='running'||!MIXON){pulse(0,null);return}var b=beatAt(c.currentTime),f=b-Math.floor(b);
    var R=Math.min(STG.w,STG.h)*(.38+.05*(1-f)),col=MODE==='africa'?'62,240,255':hexRGB(MCOL[MODE]);o.strokeStyle='rgba('+col+','+(.16*(1-f)).toFixed(3)+')';o.lineWidth=1.2;o.beginPath();o.arc(STG.cx,STG.cy,R,0,TAU);o.stroke();
    pulse(reduce?0:(1-f)*(1-f),col)}
  /* (17 Nov, the seventh hourly run) the buttons that play glow up on each beat and fade till the next, and the mode's colour lies
     faintly over the screen, breathing with them (light only: the sound is untouched). Through two variables on the mixer, changed
     only when they move a twentieth */
  function pulse(v,col){if(!UI.root)return;var q=Math.round(v*20)/20;if(q!==UI.pl){UI.pl=q;UI.root.style.setProperty('--pl',q)}if(col&&col!==UI.mc){UI.mc=col;UI.root.style.setProperty('--mc',col)}}
  function hexRGB(h){var n=parseInt(h.slice(1),16);return ((n>>16)&255)+','+((n>>8)&255)+','+(n&255)}
  /* no words over it (15 Nov, 22:59: "Remove the writing on the top"): what plays is lit, what waits blinks */
  function hud(){return ''}
  return {enter:enter,leave:leave,tick:tick,draw:draw,hud:hud,resize:function(){if(UI.root)UI.py=-1;place()},
    /* the band left to itself (04-band.js) brings a player in, or takes one out, while the mixer has it: on the next bar */
    player:function(i,v){var tr=TR[i];if(!tr)return;if(v){if(tr.play<0&&tr.next<0)tr.next=0}else stopT(i)},
    dbg:function(){var c=ctx(),n=c?c.currentTime:0;return {on:on,want:want,mixon:MIXON,ctx:c?c.state:'none',graph:!!gr,bh:UI.bh||0,fits:!!UI.fits,pl:UI.pl||0,mc:UI.mc||'',wide:!!(UI.root&&UI.root.classList.contains('mxw')),small:!!(UI.root&&UI.root.classList.contains('mxsm')),beat:c&&MIXON?beatAt(n):0,mode:MODE,pend:pend,
      banks:Object.keys(SND.B).filter(SND.ready),loops:rowsOf(MODE).reduce(function(a,t){return a+t.loops.length},0),rows:rowsOf(MODE).map(function(t){return t.n}),
      fx:gr?{room:+gr.fx.rs.gain.value.toFixed(2),fb:+gr.fx.fb.gain.value.toFixed(2)}:null,
      tracks:TR.map(function(t){return {n:t.n,k:t.k,m:t.mode||'',play:t.play,next:t.next,src:!!t.src}})}},
    /* (17 Nov, evening) for Beat: each mode instrument playing, its hits in bar b (the strongest on each sixteenth, 0 to 1) and its
       colour; a mode's colour; Beat's sounds */
    rowsBar:function(b){var out=[];TR.forEach(function(tr){if(tr.k!=='row'||tr.play<0)return;var lp=tr.loops[tr.play],v=[],q;
      for(q=0;q<16;q++){var ev=lp.at[(((b*16+q)%lp.len)+lp.len)%lp.len],m=0;for(var e=0;e<ev.length;e++)m=Math.max(m,ev[e].v||0);v.push(Math.min(1,m))}
      out.push({col:tr.row.col||MCOL[tr.mode]||'#eaf9ff',v:v})});return out},
    rowsAll:function(b){var out=[];TR.forEach(function(tr,j){if(tr.k!=='row'||tr.mode!==MODE)return;var on=tr.play>=0?tr.next!==-2:tr.next>=0,
      lp=tr.loops[tr.play>=0?tr.play:tr.next>=0?tr.next:0],v=[],q;for(q=0;q<16;q++){var ev=lp.at[(((b*16+q)%lp.len)+lp.len)%lp.len],m=0;for(var e=0;e<ev.length;e++)m=Math.max(m,ev[e].v||0);v.push(Math.min(1,m))}
      out.push({j:j,n:tr.n,col:tr.row.col||MCOL[tr.mode]||'#eaf9ff',on:on,v:v})});return out},
    col:function(k){return hexRGB(MCOL[k]||'#3ef0ff')},bvoice:bvoice,beatv:BEATV,
    launch:launch,stop:stopT,stopAll:stopAll,jam:jam,load:loadAll,rows:ROWS,all:ALL,mode:modeSet,next:next,boot:boot,start:start,voice:voice,chip:chipSync,banks:banksOf,
    tr:function(k,n){return trOf(k,n)},
    post:function(v){if(gr&&gr.mp&&gr.c)gr.mp.gain.setTargetAtTime(v,gr.c.currentTime,.05)},
    /* for the loudness test: a mode's instruments on another context (an offline one), each named one on the loop given ({congas:0, ...}),
       for secs seconds, on the band's grid from its start; and a touch's voice in a mode */
    offline:function(c,dst,secs,pick,mode){mode=mode||'africa';var G=graphOn(c,dst),t0=.05,sd=SPB/4;fxSet(G,mode,0);
      TR.forEach(function(tr,j){if(tr.k!=='row'||tr.mode!==mode||pick[tr.n]===undefined)return;var lp=tr.loops[pick[tr.n]],row=tr.row;
        for(var s=0;t0+s*sd<secs;s++){var t=lp.tri?t0+(Math.floor(s/4)*4+4*TRIB[s%4])*sd:t0+s*sd+((s&1)?sd*SWING:0),ev=lp.at[s%lp.len];
          ev.forEach(function(e){function one(b,rate,v,d,o){var s2=c.createBufferSource(),g=c.createGain(),x=s2;s2.buffer=b;s2.playbackRate.value=rate;g.gain.value=v;
              if(row.acid){var f=c.createBiquadFilter();f.type='lowpass';f.Q.value=o&&o.ac?13:10;var bs=170*Math.pow(2,2.7*(.5-.5*Math.cos(TAU*(t/SPB)/32)));f.frequency.setValueAtTime(Math.min(6500,bs*(o&&o.ac?9:5.5)),t);f.frequency.setTargetAtTime(bs,t+.004,o&&o.ac?.07:.045);x.connect(f);x=f}
              else if(row.wah){var w=c.createBiquadFilter();w.type='peaking';w.Q.value=2.4;w.gain.value=8;w.frequency.setValueAtTime(420,t);w.frequency.linearRampToValueAtTime(1900,t+.05);w.frequency.setTargetAtTime(800,t+.05,.08);x.connect(w);x=w}
              x.connect(g);g.connect(G.t[j]);if(o&&o.fx>0){var sg=c.createGain();sg.gain.value=o.fx*row.g;g.connect(sg);sg.connect(G.fx.ein)}s2.start(t);if(d>0)g.gain.setTargetAtTime(0,t+d,.06)}
            if(e.h){var b=SND.hit(e.h);if(b)one(b,1,e.v,0,{fx:e.fx})}else e.m.forEach(function(m,k){var nt=SND.note(lp.bank,m);if(nt)one(nt.b,nt.rate,e.v*(k?.82:1),e.d?e.d*sd:0,{fx:e.fx,ac:e.ac})})})}});
      return G},
    offbeat:function(c,dst,G,name,midi,vel,when){var v=BEATV[name];if(!v)return false;return !!bnode(c,v,midi,vel,when,G?G.mb:dst.toy,G&&G.fx?G.fx.ein:null)},
    offvoice:function(c,dst,G,mode,name,midi,vel,when){var v=MODESET[mode]&&MODESET[mode].voice&&MODESET[mode].voice[name];if(!v)return false;var b,r=1,m=midi||64;
      /* (as the page plays them: on the next sixteenth of the band's grid from the start, one on each) */
      var sd=SPB/4,k=Math.ceil((when-.05)/sd-.02);when=.05+k*sd+((k&1)?sd*SWING:0);G.qs=G.qs||{};var n=G.qs[k]||0;if(n>=1)return true;G.qs[k]=n+1;
      if(v.hit)b=SND.hit(v.hit);else{while(m<v.lo)m+=12;while(m>v.hi)m-=12;var nt=SND.note(v.bank,m);if(!nt)return false;b=nt.b;r=nt.rate}if(!b)return false;
      var s=c.createBufferSource(),g=c.createGain(),x=s;s.buffer=b;s.playbackRate.value=r;g.gain.value=clamp(vel,0,1)*v.g*(v.hit?1:tilt(m));
      if(v.acid){var f=c.createBiquadFilter();f.type='lowpass';f.Q.value=11;f.frequency.setValueAtTime(1800,when);f.frequency.setTargetAtTime(300,when+.004,.05);x.connect(f);x=f}x.connect(g);g.connect(G?G.mb:dst.toy);
      if(v.fx&&G){var sg=c.createGain();sg.gain.value=v.fx;g.connect(sg);sg.connect(G.fx.ein)}if(v.d)g.gain.setTargetAtTime(0,when+v.d,.06);s.start(when);return true}};
})();
