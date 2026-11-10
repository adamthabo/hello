/* ---------- the heartbeat ---------- */
var lastF=0,rzT=0;
function ovSize(){var w=Math.max(1,Math.round(VW*DPR)),h=Math.max(1,Math.round(VH*DPR));if(OVC.width!==w||OVC.height!==h){OVC.width=w;OVC.height=h}}
function resizeAll(){var ow=VW,oh=VH;layout();ovSize();glResize();WORLDS.forEach(function(w){if(w.o.resize)safe(function(){w.o.resize(ow,oh)})})}
addEventListener('resize',function(){clearTimeout(rzT);rzT=setTimeout(resizeAll,120)});
addEventListener('orientationchange',function(){clearTimeout(rzT);rzT=setTimeout(resizeAll,250)});
/* the heartbeat can never stop: if one frame ever trips, the next is still asked for */
function frame(t){
  try{
    var dt=lastF?Math.min(.1,Math.max(.001,(t-lastF)/1000)):.016;if(lastF&&govern(t,t-lastF))resizeAll();lastF=t;FT=t;FDT=dt;
    clockSync();bandTick(dt);ghostTick(t);pointersTick(t);
    OV.setTransform(1,0,0,1,0,0);OV.clearRect(0,0,OVC.width,OVC.height);OV.setTransform(DPR,0,0,DPR,0,0);OV.globalAlpha=1;OV.globalCompositeOperation='source-over';OV.textAlign='left';
    if(CUR){if(CUR.tick)CUR.tick(dt,t);if(CUR.draw)CUR.draw(t);ghostDraw()}
    if(SAVE)doSave();
    dataPaint(false);
    for(var i=0;i<NL;i++){var b=$('d_'+i);if(b)b.style.setProperty('--lv',(1+.45*E[i]*G[i]).toFixed(3))}
  }catch(e){if(window.__lc){window.__lc.errs=(window.__lc.errs||[]);if(window.__lc.errs.length<20)window.__lc.errs.push('frame: '+String(e&&e.stack||e))}}
  finally{requestAnimationFrame(frame)}}
function start(data){
  var i,w=0,h=(location.hash||'').slice(1);
  if(data&&data.on&&data.on.length===NL){for(i=0;i<NL;i++){ON[i]=data.on[i]?1:0;G[i]=ON[i]}BD.manual=!!data.manual}
  i=worldOf(h);if(i>=0)w=i;if(data&&typeof data.w==='number'&&data.w>=0&&data.w<WORLDS.length)w=data.w;
  railBuild();dotsBuild();layout();ovSize();glInit();glResize();
  go(w,true);swSync();dlInit();audioLoad();setTimeout(synPrepare,900);setTimeout(limCalibrate,1500);
  /* the orbits, the wind, the aurora and the lightning are read once the page has settled, so they are there when a world wants them */
  setTimeout(liveLoad,2600);
  /* the layout settles once the typefaces arrive */
  try{if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){resizeAll()})}catch(e){}
  requestAnimationFrame(frame)}
/* someone with the page already open keeps their world and their band when it is republished, where the viewer offers that.
   Whatever the viewer does or does not offer, the page starts: once, and within a second or so at the latest */
var booted=false;function boot(d){if(booted)return;booted=true;start(d&&typeof d==='object'?d:{})}
try{var HOT=window.claude&&window.claude.hot;
  if(HOT&&HOT.snapshot)HOT.snapshot(function(){return {w:CURI,on:ON.slice(),manual:BD.manual}});
  if(HOT&&HOT.ready){HOT.ready(boot);setTimeout(boot,1200)}else boot(HOT&&HOT.data)}catch(e){boot({})}
