/* ---------- the sound.
   The band: nine recorded stems (sampled acoustic instruments, MuseScore General soundfont, MIT licence) cut as seamless four-bar loops,
   all started together so they never drift; a player coming in or going out only opens or closes its own level. Its mix, its room and its
   master level are exactly those of the original site. There is no horn section and no saxophone any more: the page has neither file.
   The toys: what a hand plays in each world. Soft struck things only (glass, kalimba, wood, a singing bowl, three hand drums), worked out
   here from plain arithmetic, kept on their own bus under a ceiling so they can never be louder than the band.
   Nothing here is blown or bowed or held: every sound is struck once and dies away, and none of them is made by an oscillator.
   (There was a harp, and its plucked string; the owner called it stupid, and both are gone.) ---------- */
var OUTG=.3,TOYG=1,TOYLIM=[-27,6,14],TOYPOST=.202;
var AU={c:null,live:false,run:false,want:false,auto:true,first:true,ready:false,failed:false,loading:null,raw:null,bufs:[],L:[],src:[],
  bus:null,door:null,out:null,comp:null,vsend:null,toy:null,post:null,lat:0,latAt:0,t0:0,iv:0,sq:-1,unl:null};
var CLK={w0:performance.now()};
/* where we are in the music, in seconds, never wrapping. While the sound runs its own clock leads; otherwise the wall clock keeps the picture moving */
function loopT(){if(AU.live)return AU.c.currentTime-AU.t0-AU.lat;return (performance.now()-CLK.w0)/1000}
function clockSync(){
  /* (once the mixer has the band, its loops are the sound, on the same clock: 16-mix.js) */
  var live=!!(AU.c&&(AU.run||MIXON)&&AU.c.state==='running');
  if(live&&performance.now()-AU.latAt>1500){AU.latAt=performance.now();var l=Math.min(.35,AU.c.outputLatency||AU.c.baseLatency||0);if(Math.abs(l-AU.lat)>.04)AU.lat=l}
  if(live===AU.live)return;
  if(!live){var lt=loopT();AU.live=false;CLK.w0=performance.now()-lt*1000}else AU.live=true}

/* ---- the toys' voices, as plain arrays of samples at 44.1 kHz ---- */
var SYN=(function(){
  var SR=44100;
  function fin(o,fade){var n=o.length,i,pk=0,f=Math.floor(SR*(fade||.03));for(i=0;i<f&&i<n;i++)o[n-1-i]*=i/f;for(i=0;i<n;i++){var a=Math.abs(o[i]);if(a>pk)pk=a}if(pk>0)for(i=0;i<n;i++)o[i]/=pk;return o}
  /* a sum of dying sine waves: each [frequency, level, how fast it dies]. Worked by a two-term recurrence, so no sine is taken per sample */
  function add(dur,parts,att){
    var n=Math.floor(SR*dur),o=new Float32Array(n),k,i;
    for(k=0;k<parts.length;k++){var w=TAU*parts[k][0]/SR;if(w>=Math.PI*.92)continue;var r=Math.exp(-parts[k][2]/SR),c=2*r*Math.cos(w),r2=r*r,y1=0,y0=parts[k][1]*r*Math.sin(w),y;
      o[1]+=y0;for(i=2;i<n;i++){y=c*y0-r2*y1;y1=y0;y0=y;o[i]+=y}}
    var an=Math.max(1,Math.floor(SR*att));for(i=0;i<an&&i<n;i++)o[i]*=i/an;return o}
  return {SR:SR,
    /* a struck water glass */
    glass:function(f){return fin(add(2.4,[[f,1,2.4],[f*1.004,.4,2.0],[f*2.76,.16,6.5],[f*5.4,.05,13]],.005))},
    /* a kalimba tine */
    kal:function(f){var o=add(1.6,[[f,1,3.4],[f*2,.14,5.5],[f*5.42,.2,30],[f*8.9,.05,55]],.0015),i,n=Math.floor(SR*.004),l=0;for(i=0;i<n;i++){l+=((Math.random()*2-1)-l)*.4;o[i]+=l*.12*(1-i/n)*Math.min(1,i/10)}return fin(o)},
    /* a wooden bar: marimba, balafon */
    mal:function(f){return fin(add(1.5,[[f,1,4.2],[f*3.93,.28,20],[f*9.2,.08,52]],.002))},
    /* a singing bowl: slow to speak, slow to die, two close tones beating */
    bowl:function(f){return fin(add(5.5,[[f,1,.75],[f*1.0025,.5,.8],[f*2.0,.3,1.3],[f*2.007,.12,1.4],[f*3.01,.1,2.2],[f*4.17,.04,3.6]],.014),.1)},
    /* three hand drums: a low skin (with enough of its upper voice to be heard on a small speaker), a clay pot, a shaker */
    thump:function(){var n=Math.floor(SR*.55),o=new Float32Array(n),p1=0,p2=0,p3=0,i,l=0;
      for(i=0;i<n;i++){var t=i/SR;p1+=TAU*(62+70*Math.exp(-t*26))/SR;p2+=TAU*(148+60*Math.exp(-t*40))/SR;p3+=TAU*(318+90*Math.exp(-t*50))/SR;l+=((Math.random()*2-1)-l)*.16;
        o[i]=(Math.sin(p1)*Math.exp(-t*7.5)+Math.sin(p2)*.6*Math.exp(-t*14)+Math.sin(p3)*.42*Math.exp(-t*20)+l*.5*Math.exp(-t*70))*Math.min(1,t/.0025)}return fin(o)},
    tok:function(){var n=Math.floor(SR*.36),o=new Float32Array(n),ph=0,p2=0,i,l=0;
      for(i=0;i<n;i++){var t=i/SR,fr=196+80*Math.exp(-t*45);ph+=TAU*fr/SR;p2+=TAU*fr*2.32/SR;l+=((Math.random()*2-1)-l)*.3;
        o[i]=(Math.sin(ph)*Math.exp(-t*13)+Math.sin(p2)*.3*Math.exp(-t*26)+l*.4*Math.exp(-t*90))*Math.min(1,t/.0015)}return fin(o)},
    /* the shaker: hiss let through a narrow window around 3 kHz, with a soft start */
    tick:function(){var n=Math.floor(SR*.12),o=new Float32Array(n),i,lp=0,bp=0,k=2*Math.sin(Math.PI*3300/SR);
      for(i=0;i<n;i++){var t=i/SR,hp=(Math.random()*2-1)-lp-.42*bp;bp+=k*hp;lp+=k*bp;o[i]=bp*Math.exp(-t*40)*Math.min(1,t/.004)}return fin(o,.012)}
  }})();
/* each voice: its level, and the notes it is recorded at (others are reached by playing a recording a little faster or slower) */
var INSTDEF={glass:[.04,[329.63,659.26]],kal:[.05,[659.26,1318.51]],mal:[.075,[164.81,329.63,659.26]],bowl:[.034,[196,392]],thump:[.085,[0]],tok:[.09,[0]],tick:[.07,[0]]};
var INST={},SYNQ=null,VOX=0;
/* the arrays are worked out a few at a time once the page is up, so the first touch finds them ready */
function synPrepare(){
  if(SYNQ)return;SYNQ=[];Object.keys(INSTDEF).forEach(function(k){INSTDEF[k][1].forEach(function(f){SYNQ.push({k:k,f:f,a:null})})});
  var i=0;(function step(){if(i>=SYNQ.length)return;var q=SYNQ[i++];if(!q.a)q.a=SYN[q.k](q.f);setTimeout(step,12)})()}
function instBuild(c){
  synPrepare();SYNQ.forEach(function(q){if(!q.a)q.a=SYN[q.k](q.f);var b=c.createBuffer(1,q.a.length,SYN.SR);
    if(b.copyToChannel)b.copyToChannel(q.a,0);else b.getChannelData(0).set(q.a);
    (INST[q.k]=INST[q.k]||{g:INSTDEF[q.k][0],s:[]}).s.push({f:q.f||1,b:b})})}

function fetchAB(u){return fetch(u).then(function(r){if(!r.ok)throw new Error('audio '+r.status);return r.arrayBuffer()})}
function decodeAB(ctx,ab){return new Promise(function(res){try{var p=ctx.decodeAudioData(ab,function(b){res(b)},function(){res(null)});if(p&&p.catch)p.catch(function(){res(null)})}catch(e){res(null)}})}
/* fetch and unpack the band as soon as the page opens, so it is ready by the first touch */
function audioLoad(){
  if(AU.loading)return AU.loading;
  var urls=STEMF.map(function(n){return 'audio/stem'+n+'.mp3'});
  var O=window.OfflineAudioContext||window.webkitOfflineAudioContext,dc=null;try{dc=new O(2,2,44100)}catch(e){dc=null}
  AU.loading=Promise.all(urls.map(function(u){return fetchAB(u).then(function(ab){
      if(!dc)return {ab:ab,buf:null};
      return decodeAB(dc,ab.slice(0)).then(function(b){return {ab:b?null:ab,buf:b}})
    }).catch(function(){return {ab:null,buf:null}})})).then(function(a){AU.raw=a;return audioFinish()});
  return AU.loading}
function audioFinish(){
  var a=AU.raw||[],need=a.filter(function(x){return !x.buf&&x.ab});
  function done(){AU.bufs=a.map(function(x){return x.buf});AU.ready=AU.bufs.some(Boolean);AU.failed=!AU.ready&&!a.some(function(x){return !x.buf&&x.ab});return AU.ready}
  if(!need.length||!AU.c)return Promise.resolve(done());
  return Promise.all(need.map(function(x){return decodeAB(AU.c,x.ab).then(function(b){x.buf=b;x.ab=null})})).then(done)}

function irBuf(c,secs,decay){var n=Math.floor(c.sampleRate*secs),b=c.createBuffer(2,n,c.sampleRate);for(var ch=0;ch<2;ch++){var d=b.getChannelData(ch);for(var i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,decay)}return b}
/* the whole signal path, built on whichever context is given (the live one, or an offline one when the levels are measured) */
function buildGraph(c){
  var comp=c.createDynamicsCompressor(),out=c.createGain();out.gain.value=0;comp.connect(out);out.connect(c.destination);
  /* the band's room: a long dark reverb and a half-second echo, exactly as on the original site */
  var bus=c.createGain();bus.gain.value=.5;
  var door=c.createBiquadFilter();door.type='lowpass';door.frequency.value=19800;door.Q.value=.8;bus.connect(door);
  var dry=c.createGain();dry.gain.value=.8;door.connect(dry);dry.connect(comp);
  var wet=c.createConvolver();wet.buffer=irBuf(c,7,2.4);var wg=c.createGain();wg.gain.value=.55;door.connect(wet);wet.connect(wg);wg.connect(comp);
  var dl=c.createDelay(2);dl.delayTime.value=.5;var fb=c.createGain();fb.gain.value=.42;var lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2200;
  var eg=c.createGain();eg.gain.value=.3;door.connect(dl);dl.connect(lp);lp.connect(fb);fb.connect(dl);lp.connect(eg);eg.connect(comp);eg.connect(wet);
  var lfo=c.createOscillator();lfo.frequency.value=.75;var lg=c.createGain();lg.gain.value=.1;lfo.connect(lg);lg.connect(bus.gain);lfo.start();
  var vs=c.createGain();vs.gain.value=.22;vs.connect(wet);
  var L=[];
  for(var i=0;i<NL;i++){var g=c.createGain();g.gain.value=0;
    if(i===1||i===4){var hs=c.createBiquadFilter();hs.type='highshelf';hs.frequency.value=4500;hs.gain.value=-6;g.connect(hs);hs.connect(bus)}
    else g.connect(bus);
    L.push(g)}
  /* the toys: one level, a ceiling well under the band's, then into the same output and a little of the same room */
  var toy=c.createGain();toy.gain.value=TOYG;var lim=c.createDynamicsCompressor(),tlp=c.createBiquadFilter();tlp.type='lowpass';tlp.frequency.value=7200;tlp.Q.value=.5;
  lim.threshold.value=TOYLIM[0];lim.knee.value=TOYLIM[1];lim.ratio.value=TOYLIM[2];lim.attack.value=.002;lim.release.value=.16;
  /* a browser's compressor turns everything up to make good what it takes off the top; that is taken back out here, so the ceiling is a ceiling */
  var post=c.createGain();post.gain.value=TOYPOST;toy.connect(tlp);tlp.connect(lim);lim.connect(post);post.connect(comp);var ts=c.createGain();ts.gain.value=.45;post.connect(ts);ts.connect(vs);
  return {comp:comp,out:out,bus:bus,door:door,L:L,vsend:vs,toy:toy,post:post}}
/* how much this browser's compressor turns things up at these settings is measured once, quietly, rather than assumed */
function limCalibrate(){
  try{var O=window.OfflineAudioContext||window.webkitOfflineAudioContext;if(!O)return;var sr=44100,oc=new O(1,Math.floor(sr*.6),sr),o=oc.createOscillator(),g=oc.createGain(),k=oc.createDynamicsCompressor();
    k.threshold.value=TOYLIM[0];k.knee.value=TOYLIM[1];k.ratio.value=TOYLIM[2];k.attack.value=.002;k.release.value=.16;o.frequency.value=440;g.gain.value=.001;o.connect(g);g.connect(k);k.connect(oc.destination);o.start(0);
    var done=function(b){try{var d=b.getChannelData(0),pk=0;for(var i=Math.floor(sr*.3);i<d.length;i++){var a=Math.abs(d[i]);if(a>pk)pk=a}var m=pk/.001;
      if(m>.5&&m<12){TOYPOST=1/m;if(AU.post&&AU.c)AU.post.gain.setTargetAtTime(TOYPOST,AU.c.currentTime,.05)}}catch(e){}};
    var pr=oc.startRendering();if(pr&&pr.then)pr.then(done).catch(function(){});else oc.oncomplete=function(e){done(e.renderedBuffer)}}catch(e){}}
function audioInit(){
  if(AU.c)return true;var A=window.AudioContext||window.webkitAudioContext;if(!A)return false;
  var c;try{c=new A({latencyHint:'interactive'})}catch(e){try{c=new A()}catch(e2){return false}}
  AU.c=c;try{c.addEventListener('statechange',function(){if(AU.c.state==='running')AU.taps=0;swSync()})}catch(e){}
  var gph=buildGraph(c);AU.comp=gph.comp;AU.out=gph.out;AU.bus=gph.bus;AU.door=gph.door;AU.L=gph.L;AU.vsend=gph.vsend;AU.toy=gph.toy;AU.post=gph.post;
  for(var i=0;i<NL;i++)AU.L[i].gain.value=bandGain(i);
  AU.lat=Math.min(.35,c.outputLatency||c.baseLatency||0);
  try{instBuild(c)}catch(e){}
  return true}
/* iPhones mute web audio when the ring switch is on silent; asking for a playback session (and a silent media loop) lets it through */
function audioUnlock(){
  try{if(navigator.audioSession)navigator.audioSession.type='playback'}catch(e){}
  try{if(!AU.unl){var n=800,b=new ArrayBuffer(44+n*2),v=new DataView(b),w=function(o,t){for(var i=0;i<t.length;i++)v.setUint8(o+i,t.charCodeAt(i))};
      w(0,'RIFF');v.setUint32(4,36+n*2,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,8000,true);v.setUint32(28,16000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*2,true);
      var u8=new Uint8Array(b),bin='';for(var q=0;q<u8.length;q++)bin+=String.fromCharCode(u8[q]);
      AU.unl=new Audio('data:audio/wav;base64,'+btoa(bin));AU.unl.loop=true;AU.unl.setAttribute('playsinline','')}
    var pr=AU.unl.play();if(pr&&pr.catch)pr.catch(function(){})}catch(e){}}

function stemsStart(){
  /* (once the mixer has the band, it plays it from then on: 16-mix.js) */
  if(AU.run||!AU.want||!AU.ready||!AU.c||MIXON)return;var c=AU.c;
  /* the very first time, the band comes in on the one */
  var lt=AU.first?-.06:loopT();AU.first=false;
  var when=c.currentTime+.06,off=((lt+.06)%STEML+STEML)%STEML;
  AU.src=AU.bufs.map(function(b,i){if(!b)return null;var s=c.createBufferSource();s.buffer=b;s.loop=true;s.loopStart=STEMP;s.loopEnd=STEMP+STEML;s.connect(AU.L[i]);s.start(when,STEMP+off);return s});
  AU.t0=when-(lt+.06);AU.run=true;AU.sq=-1;AU.lat=Math.min(.35,c.outputLatency||c.baseLatency||0);
  clearInterval(AU.iv);AU.iv=setInterval(seqPump,25);
  if(!BD.started){BD.started=true;BD.auto=!BD.manual;BD.skip=0}}
function stemsStop(){
  var lt=loopT();AU.src.forEach(function(s){try{s&&s.stop()}catch(e){}});AU.src=[];clearInterval(AU.iv);AU.run=false;
  if(AU.live){AU.live=false;CLK.w0=performance.now()-lt*1000}}
/* the music is on when it can be heard: asked for, and the sound really running */
function soundLive(){return !!(AU.want&&!AU.failed&&AU.c&&AU.c.state==='running')}
/* asked for, but held back: an iPhone will not start any sound on a stroke, only on a plain tap (a touch that lifts where it landed).
   Until that tap comes the switch stays off, because nothing can be heard, and a ghost finger taps the middle of the world (20-ui.js).
   If a few taps do not free it, the page stops asking */
function soundHeld(){return !!(AU.want&&!AU.failed&&AU.c&&AU.c.state!=='running'&&(AU.taps||0)<4)}
function musicOn(){
  AU.want=true;AU.auto=false;AU.taps=0;audioUnlock();
  if(!audioInit()){AU.failed=true;swSync();return}
  var c=AU.c;try{c.resume&&c.resume()}catch(e){}
  /* the master sits exactly where the original site has it (.3) */
  var n=c.currentTime;AU.out.gain.cancelScheduledValues(n);if(AU.first)AU.out.gain.setValueAtTime(OUTG,n);else AU.out.gain.setTargetAtTime(OUTG,n,.25);
  audioLoad().then(function(){return audioFinish()}).then(function(ok){if(ok)stemsStart();swSync()});
  swSync()}
function musicOff(){
  AU.want=false;AU.auto=false;
  if(AU.c){var n=AU.c.currentTime;AU.out.gain.cancelScheduledValues(n);AU.out.gain.setTargetAtTime(0,n,.04)}
  setTimeout(function(){if(AU.want)return;stemsStop();try{AU.c&&AU.c.suspend&&AU.c.suspend()}catch(e){}},280);
  try{AU.unl&&AU.unl.pause()}catch(e){}
  swSync()}
/* some browsers (iPhone Safari) only let sound start on touchend or click, so every touch tries again until the sound is actually running;
   the same touch wakes it if a call, another app or the system has put it to sleep since */
(function(){function go(e){if(e&&e.target&&e.target.closest&&e.target.closest('#bSound'))return;
  if(AU.auto){if(e&&e.type==='keydown'&&(e.key===' '||e.key==='Tab'||e.key==='Shift'))return;musicOn();return}
  if(AU.want&&AU.c&&AU.c.state!=='running'){try{audioUnlock();if(AU.c.resume)AU.c.resume()}catch(x){}}}
  ['pointerdown','pointerup','touchend','click','keydown'].forEach(function(ev){addEventListener(ev,go,true)})})();
/* when the page is put away (another app, the screen locked, another tab) the sound stops with it, and comes back with it */
document.addEventListener('visibilitychange',function(){
  if(!AU.c)return;
  if(document.hidden){try{AU.c.suspend&&AU.c.suspend()}catch(e){}try{AU.unl&&AU.unl.pause()}catch(e){}return}
  if(!AU.want)return;try{audioUnlock();AU.c.resume()}catch(e){}});

/* ---- playing the toys ---- */
function toyOk(){return !!(AU.c&&AU.toy&&AU.want&&AU.c.state==='running')}
/* one note: a voice, a pitch (MIDI number), how hard (0..1), where across the room (-1..1), and when (the sound's own clock; 0 is now) */
function tone(name,midi,vel,pan,when,gm){
  if(!toyOk()||VOX>52)return;var I=INST[name];if(!I)return;var c=AU.c,f=mtof(midi),best=I.s[0],bd=1e9,i;
  for(i=0;i<I.s.length;i++){var d=Math.abs(Math.log(f/I.s[i].f));if(d<bd){bd=d;best=I.s[i]}}
  toyPlay(best.b,f/best.f,clamp(vel,0,1)*I.g*tilt(midi)*(gm||1),pan,when)}
/* high notes carry further than low ones, so every voice is played a little softer the higher it goes (3 dB an octave, about middle E) */
function tilt(midi){return Math.pow(2,clamp((64-midi)/12,-2.5,1.5)*.5)}
/* one drum stroke; rate bends its pitch a little */
function hit(name,vel,pan,rate,when){if(!toyOk()||VOX>52)return;var I=INST[name];if(!I)return;toyPlay(I.s[0].b,rate||1,clamp(vel,0,1)*I.g,pan,when)}
function toyPlay(buf,rate,gain,pan,when){
  var c=AU.c,s=c.createBufferSource(),g=c.createGain(),o=g;s.buffer=buf;s.playbackRate.value=clamp(rate,.25,4);g.gain.value=gain;s.connect(g);
  if(c.createStereoPanner){var p=c.createStereoPanner();p.pan.value=clamp(pan||0,-1,1);g.connect(p);o=p}
  o.connect(AU.toy);VOX++;s.onended=function(){VOX--;try{o.disconnect()}catch(e){}};s.start(Math.max(when||0,c.currentTime))}
/* going from one world to the next, the band ducks under for a moment, as if heard through a wall, and comes back */
function doorDip(){if(!AU.door||!AU.c||AU.c.state!=='running')return;var n=AU.c.currentTime,f=AU.door.frequency;f.cancelScheduledValues(n);f.setTargetAtTime(520,n,.05);f.setTargetAtTime(19800,n+.2,.22)}
/* worlds that play on the band's grid are told about each sixteenth a little ahead of time, on the sound's own clock, so their notes sit on the beat */
function seqPump(){
  var c=AU.c;if(!c||!(AU.run||MIXON))return;var now=c.currentTime,cur=Math.floor((now-AU.t0)/SD),ahead=document.hidden?1.2:.14;
  if(AU.sq<cur)AU.sq=cur;
  while(AU.t0+(AU.sq+1)*SD<now+ahead){AU.sq++;var s=AU.sq;if(CUR&&CUR.seq){try{CUR.seq(s,AU.t0+s*SD+((s&1)?SD*SWING:0))}catch(e){}}}}
