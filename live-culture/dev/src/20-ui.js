/* ---------- the shell: the worlds, the fingers on the glass, the few controls, the photo ---------- */
var OVC=$('ov'),OV=OVC.getContext('2d'),STAGE=$('stage');
/* the worlds. (There were more: a culture of glowing organisms that the owner said made no sense, a picture of the band he did not much
   like, a harp he called stupid, a solar system he called meh. The first two are kept in dev/archive in case he asks for them back.)
   Every world has the band. Who plays in it, and what more, is set in Mix, and goes on playing in every world; outside Mix there is
   only the music button at the top (13 Nov: "Just the audio remains playing. There is always a small music on off button"; until then
   each world had a row of circles, one for each player) */
var WORLDS=[
  {id:'smoke',name:'Smoke',o:DRIFT,sc:[1,1,1,1,1,1,1,1,1],photo:true,ic:'<path d="M8 21c-3-3 3-5 0-8s3-5 0-8M15.5 21c-3-3 3-5 0-8s2.2-4 .6-6.6"/>'},
  /* the Earth: the weather, the satellites and (on the site) the live cameras, each a layer of one globe (13 Nov: "Put them all on the
     same globe as satellites and make that just a layer"); Wind, Orbit and Live were three worlds before */
  {id:'earth',name:'Earth',o:WIND,sc:[1,1,1,1,1,1,1,1,1],ic:'<circle cx="12" cy="12" r="6.6"/><path d="M6.2 10.4c2.4-1.3 4.1 1 6.5-.1 1.5-.7 2.4-.8 3.8-.4"/><ellipse cx="12" cy="12" rx="10.6" ry="3.9" transform="rotate(-22 12 12)"/>'},
  /* the mixer: a grid of loops, the band's and a machine's (13 Nov) */
  {id:'mix',name:'Mix',o:MIX,sc:[1,1,1,1,1,1,1,1,1],ic:'<rect x="3.5" y="3.5" width="4.6" height="4.6" rx="1.1"/><rect x="9.7" y="3.5" width="4.6" height="4.6" rx="1.1"/><rect x="15.9" y="3.5" width="4.6" height="4.6" rx="1.1"/><rect x="3.5" y="9.7" width="4.6" height="4.6" rx="1.1"/><rect x="9.7" y="9.7" width="4.6" height="4.6" rx="1.1"/><rect x="15.9" y="9.7" width="4.6" height="4.6" rx="1.1"/><rect x="3.5" y="15.9" width="4.6" height="4.6" rx="1.1"/><rect x="9.7" y="15.9" width="4.6" height="4.6" rx="1.1"/><rect x="15.9" y="15.9" width="4.6" height="4.6" rx="1.1"/>'},
];
var CUR=null,CURI=-1,PT={},PTN=0,GP={},PS=[],HV=null,touched={},lastTouch=-1e9,SAYT=0,SAYX='',SAYC='',swT=0,GOT=0,FDT=.016;
function safe(f){try{f()}catch(e){if(window.__lc){window.__lc.errs=(window.__lc.errs||[]);window.__lc.errs.push(String(e&&e.stack||e))}}}
function PTR(id){return PT[id]||GP[id]||null}
function blank(){if(GLX.ok&&!GLX.lost)glClear(ABYSS[0],ABYSS[1],ABYSS[2])}
function say(text,col){SAYX=text;SAYC=col||'';SAYT=performance.now()+2600;dataPaint(true)}
var DATAX='',DATAT=0;
function dataPaint(force){var n=performance.now();if(!force&&n-DATAT<180)return;DATAT=n;var el=$('data'),tx=n<SAYT?SAYX:(CUR&&CUR.hud?CUR.hud():''),c=n<SAYT?SAYC:'';
  if(tx!==DATAX){DATAX=tx;el.textContent=tx}if(el._c!==c){el._c=c;el.style.setProperty('--c',c||'')}}

/* ---- the worlds along the bottom ---- */
function railBuild(){var r=$('rail');r.innerHTML='';WORLDS.forEach(function(w,i){var b=document.createElement('button');b.type='button';b.className='wb';b.id='w_'+w.id;
  b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+w.ic+'</svg><span></span>';b.lastChild.textContent=w.name;b.setAttribute('aria-current','false');
  b.addEventListener('click',function(){go(i)});r.appendChild(b)})}
function chrome(){
  var w=WORLDS[CURI];if(!w)return;$('wname').textContent=w.name;
  WORLDS.forEach(function(x,i){var b=$('w_'+x.id);if(b)b.setAttribute('aria-current',i===CURI?'true':'false')});
  $('bPhoto').hidden=!w.photo;$('bClear').hidden=!(w.photo&&PHOTO.has);$('bSave').hidden=!DL;$('bNow').hidden=true;
  $('bPhoto').setAttribute('aria-pressed',PHOTO.has?'true':'false');
  try{if(location.hash!=='#'+w.id)history.replaceState(null,'','#'+w.id)}catch(e){}
  layout();if(CUR&&CUR.resize)safe(function(){CUR.resize(VW,VH)});DATAX='';dataPaint(true)}
function releaseAll(){for(var id in PT){var p=PT[id];delete PT[id];p.down=false;if(CUR&&CUR.up)(function(p){safe(function(){CUR.up(p)})})(p)}PTN=0;GS.a=null;HV=null}
/* going to another world: the picture dips to black, the band ducks behind a wall for a moment, and its line-up changes */
function go(i,instant){
  if(i===CURI||i<0||i>=WORLDS.length||isNaN(i))return;var w=WORLDS[i],prev=CUR;
  function swap(){ghostsOff(false);releaseAll();if(prev&&prev.leave)safe(function(){prev.leave()});
    CURI=i;CUR=w.o;sceneSet(w.sc);governWorld();if(CUR.enter)safe(function(){CUR.enter()});chrome();document.body.classList.remove('sw');swT=performance.now()}
  clearTimeout(GOT);if(instant||reduce||!prev){swap();return}
  document.body.classList.add('sw');doorDip();GOT=setTimeout(swap,200)}
function worldsGL(){WORLDS.forEach(function(w){if(w.o.gl)w.o.gl()});PHOTO.tex=null}
/* links to worlds that have been renamed or have gone still land somewhere sensible */
var OLDHASH={drift:'smoke',loom:'smoke',bloom:'smoke',band:'smoke',wind:'earth',orbit:'earth',live:'earth'};
function worldOf(h){h=OLDHASH[h]||h;for(var i=0;i<WORLDS.length;i++)if(WORLDS[i].id===h)return i;return -1}
addEventListener('hashchange',function(){var i=worldOf(location.hash.slice(1));if(i>=0)go(i)});

/* ---- fingers ---- */
var GS={a:null,b:null,d:0,ang:0,cx:0,cy:0,t:0};
function eachPT(f){for(var id in PT)f(PT[id])}
/* two fingers make a pinch, a turn and a slide; told to the world as small changes since the last time */
function gesture(map,ghost,st){
  var ids=Object.keys(map);if(ids.length<2){st.a=null;return}
  var a=map[ids[0]],b=map[ids[1]],d=Math.hypot(b.x-a.x,b.y-a.y),ang=Math.atan2(b.y-a.y,b.x-a.x),mx=(a.x+b.x)/2,my=(a.y+b.y)/2,now=performance.now();
  if(st.a===ids[0]&&st.b===ids[1]&&st.d>0){var rot=ang-st.ang;if(rot>Math.PI)rot-=TAU;else if(rot<-Math.PI)rot+=TAU;
    var g={scale:d>10&&st.d>10?clamp(d/st.d,.8,1.25):1,rot:d>26?clamp(rot,-.6,.6):0,dx:mx-st.cx,dy:my-st.cy,cx:mx,cy:my,dt:Math.max(.004,(now-st.t)/1000),ghost:!!ghost};
    if(CUR&&CUR.gesture)safe(function(){CUR.gesture(g)})}
  st.a=ids[0];st.b=ids[1];st.d=d;st.ang=ang;st.cx=mx;st.cy=my;st.t=now}
function ptEnd(p){delete PT[p.id];PTN=Math.max(0,PTN-1);eachPT(function(q){q.n=PTN});GS.a=null;p.down=false;if(CUR&&CUR.up)safe(function(){CUR.up(p)})}
function track(p,x,y,now){var dtm=Math.max(4,now-p.t),dx=x-p.x,dy=y-p.y;p.px=p.x;p.py=p.y;p.x=x;p.y=y;
  p.vx+=(dx/dtm*1000-p.vx)*.55;p.vy+=(dy/dtm*1000-p.vy)*.55;p.spd=Math.hypot(p.vx,p.vy);p.moved+=Math.abs(dx)+Math.abs(dy);p.t=now}
function newP(id,x,y,now,ghost,mouse,down){return {id:id,x:x,y:y,px:x,py:y,x0:x,y0:y,vx:0,vy:0,spd:0,t0:now,t:now,moved:0,down:down,ghost:ghost,mouse:mouse,n:1}}
STAGE.addEventListener('pointerdown',function(e){
  if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();try{STAGE.setPointerCapture(e.pointerId)}catch(x){}
  var now=performance.now(),p=newP(e.pointerId,e.clientX,e.clientY,now,false,e.pointerType==='mouse',true);
  ghostsOff(true);if(PT[p.id])ptEnd(PT[p.id]);PT[p.id]=p;PTN++;eachPT(function(q){q.n=PTN});touched[CURI]=true;lastTouch=now;GS.a=null;HV=null;
  if(CUR&&CUR.down)safe(function(){CUR.down(p)});
  try{window.focus()}catch(x2){}});
STAGE.addEventListener('pointermove',function(e){
  var p=PT[e.pointerId],now=performance.now();
  /* a mouse button let go somewhere the page could not see */
  if(p&&e.pointerType==='mouse'&&e.buttons===0){ptEnd(p);p=null}
  if(p){if(e.clientX===p.x&&e.clientY===p.y)return;track(p,e.clientX,e.clientY,now);lastTouch=now;
    if(CUR&&CUR.move)safe(function(){CUR.move(p)});if(PTN>=2)gesture(PT,false,GS);return}
  if(e.pointerType==='mouse'&&!PTN){if(!HV)HV=newP('h',e.clientX,e.clientY,now,false,true,false);else track(HV,e.clientX,e.clientY,now);HV.n=0;
    if(touched[CURI])lastTouch=now;if(CUR&&CUR.hover)safe(function(){CUR.hover(HV)})}});
['pointerup','pointercancel','lostpointercapture'].forEach(function(ev){STAGE.addEventListener(ev,function(e){var p=PT[e.pointerId];if(!p)return;
  if(ev==='pointerup'&&(e.clientX!==p.x||e.clientY!==p.y))track(p,e.clientX,e.clientY,performance.now());
  /* a plain tap while the sound is still held back: counted, so the page can stop asking if taps do not free it */
  if(ev==='pointerup'&&performance.now()-p.t0<400&&p.moved<12&&soundHeld())AU.taps=(AU.taps||0)+1;
  ptEnd(p)})});
STAGE.addEventListener('pointerleave',function(e){if(e.pointerType==='mouse')HV=null});
STAGE.addEventListener('wheel',function(e){e.preventDefault();if(CUR&&CUR.wheel)safe(function(){CUR.wheel(e)})},{passive:false});
['gesturestart','gesturechange','gestureend'].forEach(function(ev){document.addEventListener(ev,function(e){e.preventDefault()},{passive:false})});
STAGE.addEventListener('touchmove',function(e){e.preventDefault()},{passive:false});
STAGE.addEventListener('contextmenu',function(e){e.preventDefault()});
/* the list of everything touching the world this frame: fingers, the hints' ghost fingers, a mouse passing over */
function pointersTick(now){
  PS.length=0;var id,p;
  for(id in PT){p=PT[id];if(now-p.t>70){p.vx*=.72;p.vy*=.72;p.spd=Math.hypot(p.vx,p.vy)}PS.push(p)}
  for(id in GP)PS.push(GP[id]);
  if(HV){if(now-HV.t>70){HV.vx*=.72;HV.vy*=.72;HV.spd=Math.hypot(HV.vx,HV.vy)}if(now-HV.t<2500&&!PTN)PS.push(HV);else if(now-HV.t>=2500)HV=null}}

/* ---- the hints: until a world has been touched (and again after half a minute left alone) ghost fingers show what it does.
   They move the picture and make no sound.
   One hint comes before the others. An iPhone starts no sound on a stroke, only on a plain tap; so while the music has been asked for
   and is still held back, a finger is drawn tapping the middle of the world, over and over, and nothing else is shown ---- */
var GH={on:false,mode:0,t0:0,st:{a:null,b:null,d:0,ang:0,cx:0,cy:0,t:0}};
function ghostsOff(real){
  var any=false,id;for(id in GP){any=true;var p=GP[id];delete GP[id];p.down=false;if(CUR&&CUR.up)(function(p){safe(function(){CUR.up(p)})})(p)}
  if(GH.on||any){var was=GH.mode;GH.on=false;GH.mode=0;if(real&&was===1&&CUR&&CUR.ghostEnd)safe(function(){CUR.ghostEnd()})}}
/* a press on a world's own controls beside the picture (the Earth's names, its zoom, its layers) is a touch too: the hints stop */
['nowr','zm','lys'].forEach(function(id){var e=$(id);if(e)e.addEventListener('pointerdown',function(){ghostsOff(true);touched[CURI]=true;lastTouch=performance.now()})});
function ghostTick(t){
  var idle=!reduce&&CUR&&PTN===0&&!document.hidden&&t-swT>650,
    mode=!idle?0:(soundHeld()&&t-lastTouch>900?2:(CUR.ghost&&(!touched[CURI]||t-lastTouch>30000)?1:0));
  if(mode!==GH.mode&&(GH.on||GH.mode))ghostsOff(false);
  if(!mode)return;
  if(!GH.on){GH.on=true;GH.mode=mode;GH.t0=t;GH.st.a=null}
  if(mode===2)return;
  var pts=null;try{pts=CUR.ghost((t-GH.t0)/1000)}catch(e){pts=null}pts=pts||[];var k,n=0;for(k=0;k<pts.length;k++)if(pts[k])n++;
  for(k=0;k<Math.max(pts.length,2);k++)(function(k){var id='g'+k,q=pts[k],p=GP[id];
    if(q){if(!p){p=GP[id]=newP(id,q.x,q.y,t,true,false,true);p.n=n;if(CUR.down)safe(function(){CUR.down(p)})}
      else if(q.x!==p.x||q.y!==p.y){track(p,q.x,q.y,t);p.n=n;if(CUR.move)safe(function(){CUR.move(p)})}}
    else if(p){delete GP[id];p.down=false;if(CUR.up)safe(function(){CUR.up(p)})}})(k);
  if(n>=2)gesture(GP,true,GH.st);else GH.st.a=null}
/* the tap that frees the sound: a finger comes down in the middle, and a ring goes out from it */
function tapCue(t){
  var c=OV,u=((t-GH.t0)/900)%1,x=STG.cx,y=STG.cy,k,r,a;
  function ringAt(r,a,w){c.lineWidth=w+2.2;c.strokeStyle='rgba(1,4,10,'+(a*.55).toFixed(3)+')';c.beginPath();c.arc(x,y,r,0,TAU);c.stroke();
    c.lineWidth=w;c.strokeStyle='rgba(234,249,255,'+a.toFixed(3)+')';c.beginPath();c.arc(x,y,r,0,TAU);c.stroke()}
  if(u<.24){k=Math.sin(u/.24*Math.PI);ringAt(17-4*k,.45+.45*k,1.6);c.fillStyle='rgba(234,249,255,'+(.4+.5*k).toFixed(3)+')';c.beginPath();c.arc(x,y,3.6,0,TAU);c.fill()}
  else{k=(u-.24)/.76;ringAt(17,.26,1.3);ringAt(17+58*k,.75*(1-k)*(1-k),1.6);if(k>.22){a=(k-.22)/.78;ringAt(17+58*a,.4*(1-a)*(1-a),1.2)}}}
function ghostDraw(){var c=OV,id;if(GH.on&&GH.mode===2){tapCue(FT);return}for(id in GP){var p=GP[id];c.strokeStyle='rgba(234,249,255,.42)';c.lineWidth=1.2;c.beginPath();c.arc(p.x,p.y,15,0,TAU);c.stroke();c.fillStyle='rgba(234,249,255,.3)';c.beginPath();c.arc(p.x,p.y,3,0,TAU);c.fill()}}

/* ---- the music button: a note at the top, on every world. It says what can be heard: lit only while the sound is really running,
   struck through while it is not. It never moves by itself (the owner found a switch that twitched while it waited, and one that read
   On over silence, confusing), and a touch on it always does what it shows: struck through turns the music on ---- */
function swSync(){var b=$('bSound');if(!b)return;var on=soundLive();b.setAttribute('aria-pressed',on?'true':'false');b.disabled=!!AU.failed;
  b.classList.toggle('wait',on&&!AU.run&&!MIXON);b.setAttribute('aria-label',AU.failed?'This browser cannot play the music':(on?'Music is on. Turn it off':(AU.auto?'Music starts with your first touch. Turn it on now':(AU.want?'Music is waiting for a tap. Turn it on now':'Music is off. Turn it on'))))}
$('bSound').addEventListener('click',function(){if(soundLive())musicOff();else musicOn()});
$('bNow').addEventListener('click',function(){if(ORBIT.toNow)ORBIT.toNow()});

/* ---- a photo of your own: read here, kept here, never sent anywhere ---- */
var PHOTO={has:false,ver:0,cv:null,px:null,pw:0,ph:0,ar:1,tex:null,texGen:-1};
function photoLoad(file){
  if(!file)return;if(file.type&&!/^image\//.test(file.type)){say('that is not a picture','#ff2d8a');return}
  var url=URL.createObjectURL(file),im=new Image();
  im.onload=function(){try{var nw=im.naturalWidth,nh=im.naturalHeight;if(!nw||!nh)throw new Error('empty');var s=Math.min(1,1024/Math.max(nw,nh)),w=Math.max(2,Math.round(nw*s)),h=Math.max(2,Math.round(nh*s)),cv=document.createElement('canvas');
      cv.width=w;cv.height=h;cv.getContext('2d').drawImage(im,0,0,w,h);var s2=Math.min(1,300/Math.max(w,h)),sw=Math.max(2,Math.round(w*s2)),sh=Math.max(2,Math.round(h*s2)),sm=document.createElement('canvas');
      sm.width=sw;sm.height=sh;var sx=sm.getContext('2d');sx.drawImage(cv,0,0,sw,sh);
      PHOTO.cv=cv;PHOTO.px=sx.getImageData(0,0,sw,sh).data;PHOTO.pw=sw;PHOTO.ph=sh;PHOTO.ar=w/h;PHOTO.has=true;PHOTO.ver++;PHOTO.tex=null;chrome();say('your photo · it stays on this device','#3ef0ff')}catch(e){say('that picture could not be read','#ff2d8a')}
    URL.revokeObjectURL(url)};
  im.onerror=function(){URL.revokeObjectURL(url);say('that picture could not be read','#ff2d8a')};im.src=url}
function photoTex(){if(!PHOTO.has||!GLX.ok)return null;if(!PHOTO.tex||PHOTO.texGen!==GLX.gen){PHOTO.tex=glImageTex(PHOTO.cv,false);PHOTO.texGen=GLX.gen}return PHOTO.tex}
/* where the photo sits: it covers the whole screen, centred, keeping its shape */
function photoRect(){var w=VW,h=VW/PHOTO.ar;if(h<VH){h=VH;w=VH*PHOTO.ar}return {x:(VW-w)/2,y:(VH-h)/2,w:w,h:h}}
$('bPhoto').addEventListener('click',function(){$('file').click()});
$('file').addEventListener('change',function(){var f=this.files&&this.files[0];this.value='';photoLoad(f)});
$('bClear').addEventListener('click',function(){PHOTO.has=false;PHOTO.ver++;PHOTO.tex=null;PHOTO.px=null;PHOTO.cv=null;chrome()});
addEventListener('dragover',function(e){e.preventDefault();document.body.classList.add('dropping')});
addEventListener('dragleave',function(){document.body.classList.remove('dropping')});
addEventListener('drop',function(e){e.preventDefault();document.body.classList.remove('dropping');var f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];if(f){if(!WORLDS[CURI].photo)go(0,true);photoLoad(f)}});
addEventListener('paste',function(e){var it=e.clipboardData&&e.clipboardData.files&&e.clipboardData.files[0];if(it){if(!WORLDS[CURI].photo)go(0,true);photoLoad(it)}});

/* ---- saving a picture of the screen, where the viewer's app lets a page hand over a file ---- */
var DL=null,SAVE=false;
function dlInit(){
  /* on the owner's own host a picture is saved the plain way, as a download */
  if(HOSTED){DL={save:function(o){var a=document.createElement('a'),u=URL.createObjectURL(o.data);a.href=u;a.download=o.filename;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u)},4000);return Promise.resolve({status:'saved'})}};return}
  try{if(window.claude&&window.claude.use)window.claude.use('downloads').then(function(d){DL=d||null;chrome()}).catch(function(){})}catch(e){}}
$('bSave').addEventListener('click',function(){SAVE=true});
function doSave(){
  SAVE=false;if(!DL)return;
  try{var c=document.createElement('canvas');c.width=OVC.width;c.height=OVC.height;var x=c.getContext('2d');x.fillStyle='#01040a';x.fillRect(0,0,c.width,c.height);
    if(GLX.ok&&!GLX.lost)x.drawImage(GLX.cv,0,0,c.width,c.height);x.drawImage(OVC,0,0);
    var d=new Date(),p2=function(n){return (n<10?'0':'')+n},name='live-culture-'+WORLDS[CURI].id+'-'+d.getFullYear()+p2(d.getMonth()+1)+p2(d.getDate())+'-'+p2(d.getHours())+p2(d.getMinutes())+p2(d.getSeconds())+'.png';
    c.toBlob(function(b){if(!b)return;DL.save({filename:name,data:b}).then(function(){say('saved','#3ef0ff')}).catch(function(e){
      var code=e&&e.code;if(code==='declined'||code==='rate_limited')return;DL=null;chrome()})},'image/png')}catch(e){}}

/* ---- keys: 1 to 3 for the worlds, the space bar for the music ---- */
addEventListener('keydown',function(e){
  if(e.metaKey||e.ctrlKey||e.altKey)return;var tg=e.target,onBtn=tg&&tg.closest&&tg.closest('button');
  if(e.key>='1'&&e.key<=String(WORLDS.length)){if(!e.repeat)go(+e.key-1);return}
  if(e.key===' '&&!onBtn){e.preventDefault();if(e.repeat)return;if(soundLive())musicOff();else musicOn();return}
  if(CUR&&CUR.key&&CUR.key(e,true))e.preventDefault()});
addEventListener('keyup',function(e){if(CUR&&CUR.key)CUR.key(e,false)});
