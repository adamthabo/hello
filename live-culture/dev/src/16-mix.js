/* ---------- MIX: the band, and real instruments to play along with it, as a list of loops.
   13 Nov, afternoon: "Make a music dj mixer page with pitch control hundreds of other samples and ability to abeloton live the music
   and make it way more fun and interactive". Evening: "make it less options and more like ly to result in good sounds, like abelton
   . Player. And make it extend into the glove and game screens" (he kept the clip grid alone, and asked that the music play on
   everywhere, with "a small music on off button"). Night: "impossible to make good sounds with those noises": asked how, he chose
   real loops and big buttons: "every loop is a real instrument written to fit the band, laid out as a list of instruments with big
   buttons instead of the small grid".
   So: at the top the band's nine players, each a button (in or out). Under them ten instruments, recorded ones (15-snd.js), each
   with two loops: congas, bongos, shaker, cajon, claps; marimba, xylophone, vibraphone, piano, glockenspiel. A loop comes in on the
   next bar; one loop an instrument; tapping what plays stops it at the bar.
   Every loop is written to the band. Its time: the band's 104 beats a minute, its sixteenths, and its own swing on the off ones. Its
   chords, read off the stems (13 Nov): the four bars are E minor seventh for two (E G B D, with F sharp and A about) and A seventh for
   two (A C sharp E G): E dorian all through. So the tuned loops are four bars long and change with the band, and they are lined up
   with its four bars wherever they start.
   The first time Mix is opened it takes the band over from its usual loops where they are, without a gap, and keeps it from then on:
   what is set here goes on playing in Smoke and on the Earth, and the music button at the top pauses it and brings it back.
   The band keeps its own levels and its own room; the instruments go through the toys' bus, under its ceiling, each at a level of its
   own measured against the band (tools/t_levels.js: every loop alone, and the busiest of them together). Nothing changes a level.
   ---------- */
/* MIXON: the mixer has the band (its clock leads the music from then on, in every world) */
var MIXON=false;
var MIX=(function(){
  var BPS=16/STEML,SPB=STEML/16,on=false,want=false,built=false,gr=null,iv=0,lastUi=0,loading=null,
    CK={tRef:0,bRef:0,last:-1},TR=[],UI={};
  /* ---- the loops. Drums: one line per sound, a character a sixteenth ('.' nothing, 1-9 how hard). Tuned: notes as
     [sixteenth, MIDI note or notes, how hard, how many sixteenths before the hand damps it] over four bars ---- */
  function bars(fn){var ev=[];[0,16,32,48].forEach(function(b0,i){fn(i).forEach(function(e){ev.push([b0+e[0]].concat(e.slice(1)))})});return ev}
  var ROWS=[
    {n:'congas',bank:'drums',g:.62,pan:-.22,col:'#ffb347',loops:[
      {n:'groove',len:32,lanes:{heel:'3.2...2.3.2.....3.2...2.3.2.....',quinto:'....6...............6...........',
        conga:'............8.7.................',tumba:'............................8.7.'}},
      {n:'open',len:32,lanes:{conga:'8..6........7...8..6..........7.',tumba:'......8.......7.......8.........',
        heel:'........3...............3.......',quinto:'..........64..............6.75..'}}]},
    {n:'bongos',bank:'drums',g:.62,pan:.26,col:'#ff7a2f',loops:[
      {n:'steady',len:16,lanes:{bongo:'7...6...7...6...',bongom:'..4.......4....3',bongol:'......6.......7.'}},
      {n:'busy',len:16,lanes:{bongo:'7..5....7..5....',bongom:'.3..3..3.3..3..3',bongol:'......6......56.'}}]},
    {n:'shaker',bank:'small',g:.62,pan:.36,col:'#ffd79a',loops:[
      {n:'sixteenths',len:16,lanes:{shk:'5.8.5.8.5.8.5.8.',shku:'.3.3.3.3.3.3.3.3'}},
      {n:'off-beats',len:16,lanes:{shl:'..8...8...8...8.',shk:'4...4...4...4...'}}]},
    {n:'cajon',bank:'drums',g:.7,pan:0,col:'#ff2d8a',loops:[
      {n:'backbeat',len:16,lanes:{cbass:'9......79.......',cslap:'....8.......8...',cmid:'..3.......3...3.'}},
      {n:'four',len:16,bank2:'small',lanes:{cbass:'9...7...8...7...',cslap:'....8.......8...',hat:'..5...5...5...5.'}}]},
    {n:'claps',bank:'small',g:1.3,pan:-.12,col:'#c6ff6b',loops:[
      {n:'two and four',len:16,lanes:{clap:'....8.......8...'}},
      {n:'clave',len:32,lanes:{clave:'8.....8.....8.......8...8.......'}}]},
    {n:'marimba',bank:'marimba',g:.42,pan:-.28,col:'#7dffb2',loops:[
      {n:'chords',len:64,ev:bars(function(i){var p=i<2?[[64,71],[67,74]]:[[67,73],[69,76]];return [[2,p[0],.7,2],[6,p[1],.55,2],[10,p[0],.65,2],[14,p[1],.5,2]]})},
      {n:'run',len:64,ev:bars(function(i){var L=[[64,67,71,74,76,74,71,67],[64,67,71,74,78,76,74,71],[69,73,76,79,81,79,76,73],[69,73,76,79,76,73,71,67]][i];
        return L.map(function(m,j){return [j*2,m,j===0?.8:j%2?.5:.65,3]})})}]},
    {n:'xylophone',bank:'xylo',g:.48,pan:.3,col:'#3ef0ff',loops:[
      {n:'tune',len:64,ev:[[0,76,.8],[3,79,.6],[6,83,.7],[10,81,.6],[12,79,.55],[16,78,.7],[19,76,.6],[22,74,.6],[26,76,.7],
        [32,81,.8],[35,85,.65],[38,88,.7],[42,85,.6],[44,83,.55],[48,81,.7],[51,79,.6],[54,76,.6],[58,73,.6],[62,71,.5]]},
      {n:'rolling',len:64,ev:bars(function(i){var L=i<2?[76,71,79,71,83,71,79,74]:[76,73,81,73,85,73,81,76];return L.map(function(m,j){return [j*2,m,j%2?.45:.7]})})}]},
    {n:'vibes',bank:'vibes',g:.27,pan:-.1,col:'#b46bff',loops:[
      {n:'chords',len:64,ev:[[0,[67,71,74,78],.6,20],[22,[67,71,74,78],.42,9],[32,[67,73,78,83],.6,20],[54,[67,73,78,83],.42,9]]},
      {n:'line',len:64,ev:[[0,83,.6,8],[8,81,.5,8],[16,79,.6,8],[24,76,.5,8],[32,85,.6,8],[40,83,.5,8],[48,81,.6,8],[56,79,.5,4],[60,76,.5,4]]}]},
    {n:'piano',bank:'piano',g:.28,pan:.12,col:'#effcff',loops:[
      {n:'chords',len:64,ev:bars(function(i){var v=i<2?[59,62,64,67]:[61,64,67,69];return [[0,v,.7,2],[3,v,.5,2],[6,v,.6,2],[10,v,.55,2]]})},
      {n:'riff',len:64,ev:bars(function(i){var L=i<2?[52,55,57,59,57,55]:[57,61,64,67,64,61],S=[0,3,6,8,11,14];
        return L.map(function(m,j){return [S[j],[m,m+12],j?.6:.7,2]})})}]},
    {n:'glock',bank:'glock',g:.46,pan:.2,col:'#e6f7ff',loops:[
      {n:'sparkle',len:64,ev:[[0,88,.5],[10,83,.4],[22,86,.45],[32,85,.5],[42,88,.4],[54,81,.45]]},
      {n:'chimes',len:64,bank:'chimes',g:.6,ev:[[0,[76,83],.5,30],[32,[73,81],.5,30]]}]}];
  /* each loop's sixteenths, worked out once: what plays on each */
  ROWS.forEach(function(r){r.loops.forEach(function(lp){var at=[],i;for(i=0;i<lp.len;i++)at.push([]);lp.bank=lp.bank||r.bank;
    if(lp.lanes)for(var s in lp.lanes){var str=lp.lanes[s];for(i=0;i<lp.len;i++){var ch=str.charAt(i);if(ch>='1'&&ch<='9')at[i].push({h:s,v:(+ch)/9})}}
    if(lp.ev)lp.ev.forEach(function(e){var ms=typeof e[1]==='number'?[e[1]]:e[1];at[((e[0]%lp.len)+lp.len)%lp.len].push({m:ms,v:e[2]*(lp.g||1),d:e[3]||0})});
    lp.at=at;lp.banks=[lp.bank];if(lp.bank2)lp.banks.push(lp.bank2)})});
  var SHORT=['dundun','shekere','djembe','talking','agogo','bass','balafon','kora','guitar'];
  (function(){var i;for(i=0;i<NL;i++)TR.push({k:'stem',i:i,n:SHORT[i],col:BCOL[i],play:-1,next:-1,src:null,gate:null});
    ROWS.forEach(function(r,j){TR.push({k:'row',i:j,n:r.n,col:r.col,row:r,loops:r.loops,play:-1,next:-1})})})();
  /* ---- the clock: the beat (counted from the start of the band's loop) at a time, and the time of a beat ---- */
  function beatAt(t){return CK.bRef+(t-CK.tRef)*BPS}
  function timeOf(b){return CK.tRef+(b-CK.bRef)/BPS}
  function ctx(){return AU.c}
  /* ---- the signal path: the band's players into the band's room at the band's own levels (as its usual loops are); each instrument
     at its level and place, into the toys' bus with its ceiling ---- */
  function graphOn(c,dst){
    var G={c:c,t:[]};
    TR.forEach(function(t,j){var g=c.createGain();
      if(t.k==='stem'){g.gain.value=SG[t.i];if(t.i===1||t.i===4){var hs=c.createBiquadFilter();hs.type='highshelf';hs.frequency.value=4500;hs.gain.value=-6;g.connect(hs);hs.connect(dst.bus)}else g.connect(dst.bus)}
      else{g.gain.value=t.row.g;var o=g;if(c.createStereoPanner){var p=c.createStereoPanner();p.pan.value=t.row.pan;g.connect(p);o=p}o.connect(dst.toy)}
      G.t[j]=g});
    return G}
  function ensure(){var c=ctx();if(!c||!AU.bus)return null;if(!gr||gr.c!==c)gr=graphOn(c,{bus:AU.bus,toy:AU.toy});return gr}
  /* ---- a band player: its recording looped, lined up with the clock ---- */
  function stemSrc(tr,beat,when,open){var c=ctx(),b=AU.bufs[tr.i];if(!c||!b||!gr)return false;var s=c.createBufferSource(),g=c.createGain(),at=Math.max(when,c.currentTime),
      off=(((beat%16)+16)%16)*SPB+(at-when);off=((off%STEML)+STEML)%STEML;
    s.buffer=b;s.loop=true;s.loopStart=STEMP;s.loopEnd=STEMP+STEML;g.gain.value=open?1:0;if(!open)g.gain.setTargetAtTime(1,at,.004);s.connect(g);g.connect(gr.t[TR.indexOf(tr)]);s.start(at,STEMP+off);
    tr.src=s;tr.gate=g;return true}
  /* a player leaving: a short fade on the bar, so nothing clicks, and the recording stops just after */
  function stemOff(tr,when){if(!tr.src)return;try{tr.gate.gain.cancelScheduledValues(when);tr.gate.gain.setTargetAtTime(0,when,.03);tr.src.stop(when+.3)}catch(e){}tr.src=null;tr.gate=null}
  /* ---- an instrument's sound, a little loose (as a hand plays): each hit a touch earlier or later and harder or softer, but never
     on the beat itself, which stays where the band has it ---- */
  var VOXM=0;
  function play(j,b,rate,gain,when,damp){var c=ctx();if(!c||!gr||!b||VOXM>48)return;var s=c.createBufferSource(),g=c.createGain();s.buffer=b;s.playbackRate.value=rate;g.gain.value=gain;s.connect(g);g.connect(gr.t[j]);
    VOXM++;s.onended=function(){VOXM--;try{g.disconnect()}catch(e){}};var at=Math.max(when,c.currentTime);s.start(at);
    if(damp>0){g.gain.setTargetAtTime(0,at+damp,.06);try{s.stop(at+damp+.5)}catch(e){}}}
  function sound(j,tr,lp,e,when,s){var v=e.v*(.92+.16*Math.random()),t=when+((s%4)?(Math.random()-.5)*.006:0);
    if(e.h){var b=SND.hit(e.h);if(b)play(j,b,1,v,t,0);return}
    e.m.forEach(function(m,k){var nt=SND.note(lp.bank,m);if(nt)play(j,nt.b,nt.rate,v*(k?.82:1),t+k*.006,e.d?e.d*SPB/4:0)})}
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
  function off(tr,when){if(tr.k==='stem'){stemOff(tr,when);ON[tr.i]=0}tr.play=-1}
  function step(s,t){
    /* on the bar: what was asked to start or stop does so now (an instrument whose sounds are still on their way waits a bar) */
    if(((s%16)+16)%16===0)TR.forEach(function(tr){if(tr.next===-1)return;var nx=tr.next;
      if(nx===-2){tr.next=-1;off(tr,t);return}
      if(tr.k==='stem'){if(!tr.src&&!stemSrc(tr,s/4,t,false))return;tr.next=-1;tr.play=0;ON[tr.i]=1;return}
      if(!tr.loops[nx].banks.every(SND.ready))return;tr.next=-1;tr.play=nx});
    /* what plays on this sixteenth */
    TR.forEach(function(tr,j){if(tr.k!=='row'||tr.play<0)return;var lp=tr.loops[tr.play],q=((s%lp.len)+lp.len)%lp.len,ev=lp.at[q];
      for(var i=0;i<ev.length;i++)sound(j,tr,lp,ev[i],t,s)})}
  /* ---- the hand's part ---- */
  function hand(){wake();BD.auto=false;BD.manual=true}
  /* a loop: in on the next bar; tapping the one that plays takes it out; tapping one that waits calls it off */
  function launch(j,k){var tr=TR[j];if(!tr)return;hand();if(tr.k==='stem')k=0;else{if(!tr.loops[k])return;SND.load(tr.loops[k].banks)}
    if(tr.play===k&&tr.next===-1){tr.next=-2;return}
    if(tr.next===k&&tr.play<0){tr.next=-1;return}
    tr.next=k}
  function stopT(j){var tr=TR[j];if(!tr)return;if(tr.play>=0)tr.next=-2;else tr.next=-1}
  function stopAll(){TR.forEach(function(tr,j){if(tr.k==='row')stopT(j)})}
  /* a jam (14 Nov: "music not fun"): one tap, a new set of instruments with the band, on the next bar: a drum, often a shaker or the
     claps, one or two of the tuned ones, each on one of its loops (all of them written to go together) */
  function jam(){hand();var pick=function(a){return a[Math.floor(Math.random()*a.length)]},want={},tunes=['marimba','xylophone','vibes','piano','glock'];
    want[pick(['congas','bongos','cajon'])]=1;if(Math.random()<.7)want[pick(['shaker','claps'])]=1;var t1=pick(tunes);want[t1]=1;
    if(Math.random()<.55)want[pick(tunes.filter(function(x){return x!==t1}))]=1;
    var same=TR.every(function(tr){return tr.k!=='row'||(!!want[tr.n])===(tr.play>=0)});
    TR.forEach(function(tr,j){if(tr.k!=='row')return;if(!want[tr.n]){stopT(j);return}
      var k=same&&tr.loops.length>1?1-Math.max(0,tr.play):Math.floor(Math.random()*tr.loops.length);SND.load(tr.loops[k].banks);tr.next=tr.play===k?-1:k});
    if(!TR.some(function(tr){return tr.k==='stem'&&(tr.play>=0||tr.next===0)}))TR.forEach(function(tr){if(tr.k==='stem'&&(tr.n==='bass'||tr.i<3))tr.next=0});
    uiSync(true)}
  /* the sound wakes with a touch here, as everywhere */
  function wake(){if(!AU.want||!AU.c||AU.c.state!=='running')musicOn();ensure()}
  /* every instrument's sounds, fetched once */
  function loadAll(){if(!loading)loading=SND.load();return loading}
  /* ===================== the screen ===================== */
  function E(tag,cls,txt,par){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined&&txt!==null)e.textContent=txt;if(par)par.appendChild(e);return e}
  function btn(cls,txt,par,fn){var b=E('button',cls,txt,par);b.type='button';if(fn)b.addEventListener('click',fn);return b}
  function build(){
    if(built)return;built=true;
    var R=E('div','mx',null,document.body);R.id='mix';R.hidden=true;UI.root=R;
    var L=E('div','mxl',null,R);UI.list=L;UI.b=[];
    var jf=E('div','mxfoot mxjf',null,L);UI.jam=btn('mxstop mxjam','jam: a new mix',jf,function(){jam();hit('tok',.2,0)});UI.jam.setAttribute('aria-label','Jam: start a new mix of instruments with the band');
    E('div','mxsec','the band',L);
    var band=E('div','mxband',null,L);
    TR.forEach(function(t,j){if(t.k!=='stem')return;var b=btn('mxb mxp',t.n,band,function(){launch(j,0)});b.style.setProperty('--c',t.col);b.setAttribute('aria-label',BNAMES[t.i]);UI.b.push({el:b,j:j,k:0})});
    E('div','mxsec','play along',L);
    TR.forEach(function(t,j){if(t.k!=='row')return;var row=E('div','mxrow',null,L);row.style.setProperty('--c',t.col);E('span','mxn',t.n,row);
      t.loops.forEach(function(lp,k){var b=btn('mxb',lp.n,row,function(){launch(j,k)});b.setAttribute('aria-label',t.n+': '+lp.n);UI.b.push({el:b,j:j,k:k})})});
    var f=E('div','mxfoot',null,L);UI.stop=btn('mxstop','stop the instruments',f,function(){hand();stopAll()});
    uiSync(true)}
  /* the screen follows the sound: what plays (lit), what waits for the bar (blinking), what stops on it (dimmed) */
  function uiSync(force){
    if(!built)return;var n=performance.now();if(!force&&n-lastUi<90)return;lastUi=n;
    UI.b.forEach(function(c){var tr=TR[c.j],st=tr.play===c.k?(tr.next===-1||tr.next===c.k?'on':'stopping'):tr.next===c.k?'wait':'';
      if(c.el._s!==st){c.el._s=st;c.el.className=(tr.k==='stem'?'mxb mxp':'mxb')+(st?' '+st:'');c.el.setAttribute('aria-pressed',st==='on'?'true':'false')}})}
  function place(){if(!UI.root)return;var r=UI.root,d=$('data'),y=STG.y0;if(d){var b=d.getBoundingClientRect();if(b.height)y=Math.max(y,Math.round(b.bottom+8))}
    if(y===UI.py&&STG.y1===UI.py1)return;UI.py=y;UI.py1=STG.y1;r.style.top=y+'px';r.style.height=Math.max(160,STG.y1-y)+'px'}
  /* ===================== the world ===================== */
  function enter(){build();on=true;want=true;UI.root.hidden=false;UI.py=-1;place();loadAll();if(!iv)iv=setInterval(pump,25);pump();uiSync(true)}
  /* leaving changes nothing that plays: the loops go on in the other worlds */
  function leave(){on=false;if(UI.root)UI.root.hidden=true}
  function tick(){place();uiSync(false)}
  function draw(){
    if(GLX.ok&&!GLX.lost)glClear(ABYSS[0],ABYSS[1],ABYSS[2]);
    /* behind the list, the beat as a ring that swells and fades */
    var c=ctx(),o=OV;if(!c||c.state!=='running'||!MIXON)return;var b=beatAt(c.currentTime),f=b-Math.floor(b);
    var R=Math.min(STG.w,STG.h)*(.38+.05*(1-f));o.strokeStyle='rgba(62,240,255,'+(.16*(1-f)).toFixed(3)+')';o.lineWidth=1.2;o.beginPath();o.arc(STG.cx,STG.cy,R,0,TAU);o.stroke()}
  function hud(){
    var a=TR.filter(function(t){return t.k==='stem'&&t.play>=0}).length,r=TR.filter(function(t){return t.k==='row'&&t.play>=0}).map(function(t){return t.n});
    return 'tap a loop: in on the next bar, in tune\n'+(a||r.length?'playing: '+(a?'the band ('+a+')':'')+(a&&r.length?', ':'')+r.join(', ')+'\nit keeps playing in Smoke and Earth'
      :'nothing playing: tap the band, or an instrument')}
  return {enter:enter,leave:leave,tick:tick,draw:draw,hud:hud,resize:function(){if(UI.root)UI.py=-1;place()},
    /* the band left to itself (04-band.js) brings a player in, or takes one out, while the mixer has it: on the next bar */
    player:function(i,v){var tr=TR[i];if(!tr)return;if(v){if(tr.play<0&&tr.next<0)tr.next=0}else stopT(i)},
    dbg:function(){var c=ctx(),n=c?c.currentTime:0;return {on:on,want:want,mixon:MIXON,ctx:c?c.state:'none',graph:!!gr,beat:c&&MIXON?beatAt(n):0,
      banks:Object.keys(SND.B).filter(SND.ready),loops:ROWS.reduce(function(a,r){return a+r.loops.length},0),
      tracks:TR.map(function(t){return {n:t.n,k:t.k,play:t.play,next:t.next,src:!!t.src}})}},
    launch:launch,stop:stopT,stopAll:stopAll,jam:jam,load:loadAll,rows:ROWS,
    /* for the loudness test: the instruments on another context (an offline one), each named one on the loop given ({congas:0, ...}),
       for secs seconds, on the band's grid from its start */
    offline:function(c,dst,secs,pick){var G=graphOn(c,dst),t0=.05,sd=SPB/4;
      TR.forEach(function(tr,j){if(tr.k!=='row'||pick[tr.n]===undefined)return;var lp=tr.loops[pick[tr.n]];
        for(var s=0;t0+s*sd<secs;s++){var t=t0+s*sd+((s&1)?sd*SWING:0),ev=lp.at[s%lp.len];
          ev.forEach(function(e){function one(b,rate,v,d){var s2=c.createBufferSource(),g=c.createGain();s2.buffer=b;s2.playbackRate.value=rate;g.gain.value=v;s2.connect(g);g.connect(G.t[j]);s2.start(t);if(d>0)g.gain.setTargetAtTime(0,t+d,.06)}
            if(e.h){var b=SND.hit(e.h);if(b)one(b,1,e.v,0)}else e.m.forEach(function(m,k){var nt=SND.note(lp.bank,m);if(nt)one(nt.b,nt.rate,e.v*(k?.82:1),e.d?e.d*sd:0)})})}});
      return G}};
})();
