/* ---------- Live: cameras that stream around the clock from interesting places, the video filling the screen. Only where the page is
   served from the owner's own host (HOSTED): a Claude artifact may not show any outside video. Asked for on 10 Nov ("def give me live
   video feeds from interesting places"), and on 12 Nov he chose all four of: every camera plays, full-screen video, better places, many
   more cameras browsable by theme.
   The video fills the screen (held upright, a wide view is cropped to the screen and slowly looked across, side to side; two fingers
   bring it closer or show all of it). A small Earth in the corner turns to where the camera is; a tap on it opens the map, where the
   whole Earth shows every camera of the theme, and a tap on one goes there. A swipe goes to the next camera east or west. The row of
   themes along the bottom: all, animals, volcanoes, space, cities, the sea, night skies, mountains, things that move.
   The readout says what is true of the place now: its hour by the Sun and the Sun's height, the wind (NOAA's GFS), how many satellites
   are above its horizon (worked out from every published orbit), how far the space station is. The cameras' own sound is never
   played: the band is the sound.
   The list of cameras is the Worker's (/api/cams); the Worker finds which video each is streaming now (/api/live, several at a time:
   streams restart and change their address), and the page shows only those on the air, passing over any that will not play here. ---------- */
var LIVEW=(function(){
  var CAMS=[],THEMES=[],TH='all',cur=-1,asked=false,player=null,ytReady=false,ytAsked=false,ytFail=false,ytWant=null,ytId='',
    el=null,box=null,img=null,imgUrl='',imgAt=0,imgT=0,
    g={cx:0,cy:0,R:100,E:[0,0,0],N:[0,0,0],C:[0,0,0]},lat0=20,lon0=-40,
    MAP=false,mapK=0,mapT=0,turned=0,gs={x:0,y:0,r:0},
    vr={x:0,y:0,w:0,h:0,disk:false},zoom=1,panx=0,pany=0,sweep=0,touchT=-1e9,drag=0,
    sunV=[0,0,0],moonV=[0,0,0],sunI=null,moonI=null,stat='',statT=0,liveT=0,bad={},ST={},waitQ=[],asking=0,over=null,overT=0,issNow=null,issT=0,
    on=false,lastT=0,camP=[],tmp=[0,0,0],seq=0;
  function $e(id){return document.getElementById(id)}
  function valid(c){return c&&typeof c.id==='string'&&/^[a-z0-9\-]{1,24}$/i.test(c.id)&&typeof c.name==='string'&&isFinite(+c.lat)&&isFinite(+c.lon)&&(c.kind==='yt'||c.kind==='img')}
  function word(v,n){return String(v===undefined||v===null?'':v).replace(/[^0-9A-Za-zÀ-ÿ .,:;'()\/&°\-]/g,'').slice(0,n||60)}
  function camsLoad(){
    if(asked)return;asked=true;
    try{fetch('/api/cams').then(function(r){return r.ok?r.json():null}).then(function(d){
      if(!d||!Array.isArray(d.cams))return;
      CAMS=d.cams.filter(valid).slice(0,140).map(function(c){return {id:c.id,t:/^[a-z]{2,8}$/.test(c.t||'')?c.t:'',name:word(c.name,44),place:word(c.place,60),lat:clamp(+c.lat,-90,90),lon:AS.n180(+c.lon),kind:c.kind,
        v:Array.isArray(c.v)?c.v.filter(function(x){return /^[\w\-]{11}$/.test(x)}):[],img:/^[a-z0-9\-]{1,24}$/.test(c.img||'')?c.img:'',moving:c.moving==='iss',best:c.best==='day'||c.best==='night'?c.best:'any',
        by:word(c.by,60),every:clamp(+c.every||600,60,3600)}});
      CAMS.sort(function(a,b){return a.lon-b.lon});
      THEMES=(Array.isArray(d.themes)?d.themes:[]).filter(function(x){return Array.isArray(x)&&/^[a-z]{2,8}$/.test(x[0])}).map(function(x){return [x[0],word(x[1],24)]});
      themesBuild();if(on&&cur<0)start()}).catch(function(){asked=false})}catch(e){asked=false}}
  /* the Sun's height (degrees) at a place now */
  function sunAt(la,lo){if(!sunI)return 0;var v=AS.llv(la,lo,tmp);return Math.asin(clamp(v[0]*sunV[0]+v[1]*sunV[1]+v[2]*sunV[2],-1,1))/AS.D}
  function camLL(c){if(c.moving&&issNow)return [issNow.lat,issNow.lon];return [c.lat,c.lon]}
  function inTheme(c){return TH==='all'||c.t===TH}
  /* a camera can be shown unless it was found off the air or not playing here in the last ten minutes, or it is a stream and
     YouTube's player cannot load here */
  function usable(c){var s=ST[c.id];return !(bad[c.id]&&FT-bad[c.id]<600000)&&!(s&&s.live===false&&FT-s.t<600000)&&!(c.kind==='yt'&&ytFail)}
  function onAir(c){var s=ST[c.id];return c.kind==='img'||!!(s&&s.id&&FT-s.t<900000&&!(bad[c.id]&&FT-bad[c.id]<600000))}
  /* which cameras are on the air: asked of the Worker eight at a time, the theme's first, the ones beside the camera shown before them */
  function ask(ids,front){ids.forEach(function(id){var k=waitQ.indexOf(id);if(k>=0)waitQ.splice(k,1);var s=ST[id];if(s&&FT-s.t<(s.id?600000:300000))return;if(front)waitQ.unshift(id);else waitQ.push(id)});pump()}
  function pump(){
    if(asking||!waitQ.length)return;var ids=waitQ.splice(0,8);asking=FT;
    var done=function(){asking=0;if(on)pump()};
    try{fetch('/api/live?ids='+ids.join(',')).then(function(r){return r.ok?r.json():null}).then(function(d){
      ids.forEach(function(id){var x=d&&d[id];if(!x)return;ST[id]={id:typeof x.id==='string'&&/^[\w\-]{11}$/.test(x.id)?x.id:'',live:x.live===true?true:x.live===false?false:null,t:FT,title:word(x.title,90),ch:word(x.ch,48)}});
      done();if(on&&cur>=0){var c=CAMS[cur];if(c&&stat==='finding'&&ST[c.id])show(cur)}}).catch(done)}catch(e){done()}
    setTimeout(function(){if(asking&&FT-asking>14000){asking=0;pump()}},15000)}
  function primeTheme(){var L=[],i;if(cur>=0){var n=CAMS.length;for(i=1;i<4;i++){L.push(CAMS[(cur+i)%n].id,CAMS[(cur-i+n)%n].id)}}
    CAMS.forEach(function(c){if(inTheme(c)&&c.kind==='yt')L.push(c.id)});ask(L.filter(function(id){var c=find(id);return c&&inTheme(c)&&c.kind==='yt'}),false)}
  function find(id){for(var i=0;i<CAMS.length;i++)if(CAMS[i].id===id)return CAMS[i];return null}
  /* where to begin: a camera of the theme known to be on the air, whose light suits it now (a city by day, the aurora by night) */
  function start(){var bi=-1,bs=-1e9;CAMS.forEach(function(c,i){if(!inTheme(c)||!usable(c))return;var e=sunAt(c.lat,c.lon),s=(onAir(c)?3:0)+(c.kind==='yt'?1.5:0)+Math.random()*.6+
      (c.best==='day'?(e>4?2:-1):c.best==='night'?(e<-8?2.5:-1):1);if(s>bs){bs=s;bi=i}});primeTheme();if(bi>=0)show(bi)}
  /* the next camera east or west in the theme: one known to be on the air if there is one, else the next not known to be off */
  function step(dir){if(!CAMS.length)return;var n=CAMS.length,i=cur<0?0:cur,k,fb=-1;
    for(k=0;k<n;k++){i=(i+dir+n)%n;var c=CAMS[i];if(!inTheme(c)||!usable(c))continue;if(onAir(c)){show(i);return}if(fb<0)fb=i}
    if(fb>=0)show(fb)}
  function fade(v){if(box)box.classList.toggle('on',!!v)}
  function show(i){
    var c=CAMS[i];if(!c)return;var same=i===cur;cur=i;seq++;stat='finding';statT=FT;liveT=0;if(!same){zoom=1;panx=pany=0;sweep=0}fade(false);ytId='';
    if(box)box.classList.toggle('disk',c.kind==='img');geo();
    var n=CAMS.length;ask([CAMS[(i+1)%n].id,CAMS[(i-1+n)%n].id].filter(function(id){var x=find(id);return x&&x.kind==='yt'}),true);
    if(c.kind==='img'){if(player)try{player.pauseVideo()}catch(e){}imgLoad(c,true);return}
    if(img)img.hidden=true;
    var s=ST[c.id];
    if(s&&s.id&&FT-s.t<900000){play(s.id);return}
    if(s&&s.live===false&&FT-s.t<600000){stat='off';statT=FT;return}
    /* not asked yet: ask for it first; if the Worker cannot tell, the address on the list is tried */
    ask([c.id],true);var my=seq;setTimeout(function(){if(my!==seq||stat!=='finding')return;var s2=ST[c.id];if(s2&&s2.id)play(s2.id);else if(s2&&s2.live===false){stat='off';statT=FT}else if(c.v[0])play(c.v[0]);else{stat='off';statT=FT}},9000)}
  function imgLoad(c,first){
    var my=seq;imgT=FT;try{fetch('/api/feed/'+c.img).then(function(r){if(!r.ok)throw new Error(r.status);imgAt=Date.parse(r.headers.get('last-modified')||'')||Date.now();return r.blob()}).then(function(b){
      if(my!==seq)return;if(imgUrl)URL.revokeObjectURL(imgUrl);imgUrl=URL.createObjectURL(b);img.onload=function(){if(my!==seq)return;img.hidden=false;if(stat!=='live')arrive();stat='live';liveT=FT;fade(true)};img.src=imgUrl})
      .catch(function(){if(my!==seq)return;if(first){bad[c.id]=FT;stat='off';statT=FT}})}catch(e){}}
  /* the YouTube player: muted, no controls, never full screen of its own; the band plays over it */
  function ytLoad(){
    if(window.YT&&window.YT.Player){ytReady=true;return}if(ytAsked)return;ytAsked=true;
    var prev=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=function(){ytReady=true;try{if(prev)prev()}catch(e){}if(ytWant)play(ytWant)};
    var s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';s.async=true;
    s.onerror=function(){ytFail=true;var c=CAMS[cur];if(c&&c.kind==='yt'){stat='off';statT=FT-1000}};document.head.appendChild(s)}
  function play(id){
    ytWant=id;ytLoad();if(!ytReady){if(ytFail){var c=CAMS[cur];if(c)bad[c.id]=FT;stat='off';statT=FT}return}
    ytId=id;stat='connecting';statT=FT;if(img)img.hidden=true;
    try{if(player&&player.loadVideoById){player.loadVideoById(id);player.mute();return}
      player=new window.YT.Player('vidp',{host:'https://www.youtube-nocookie.com',videoId:id,width:'100%',height:'100%',
        playerVars:{autoplay:1,mute:1,playsinline:1,controls:0,disablekb:1,fs:0,iv_load_policy:3,rel:0,modestbranding:1,cc_load_policy:0,origin:location.origin},
        events:{onReady:function(e){try{e.target.mute();if(on)e.target.playVideo();else e.target.pauseVideo()}catch(x){}},
          onStateChange:function(e){if(e.data===1){if(stat!=='live')arrive();stat='live';liveT=FT;fade(true);el&&el.classList.remove('tap')}
            else if(e.data===0&&on){var c=CAMS[cur];if(c)bad[c.id]=FT;step(1)}},
          onError:function(){var c=CAMS[cur];if(c){bad[c.id]=FT;if(ST[c.id])ST[c.id].id=''}stat='off';statT=FT}}})}catch(e){ytFail=true}}
  function arrive(){if(!reduce)tone('bowl',pent(2,52),.3,0)}
  /* ---- the picture: the video fills the screen; a still of the whole Earth stands in the stage, round ---- */
  function geo(){
    var c=CAMS[cur],disk=c&&c.kind==='img';vr.disk=disk;
    if(disk){var d=Math.min(STG.w*.94,STG.h*.94);vr.w=vr.h=d;vr.x=STG.cx-d/2;vr.y=STG.cy-d/2}
    else{var k=Math.max(VW/16,VH/9);vr.w=16*k;vr.h=9*k;vr.x=(VW-vr.w)/2;vr.y=(VH-vr.h)/2}
    place()}
  /* how far the cropped picture may be looked across, side to side and up and down, at this closeness */
  function reachX(){return Math.max(0,(vr.w*zoom-VW)/2)}function reachY(){return Math.max(0,(vr.h*zoom-VH)/2)}
  function place(){if(!box)return;var w=vr.w*zoom,h=vr.h*zoom,x=vr.x+vr.w/2-w/2+panx+drag,y=vr.y+vr.h/2-h/2+pany;
    if(!vr.disk&&!MAP){var sx=reachX();x+=sx*sweep}
    /* (the size only when it changes: resizing the player every frame would make it lay itself out every frame) */
    var W2=Math.round(w),H2=Math.round(h);if(W2!==box._w||H2!==box._h){box._w=W2;box._h=H2;box.style.width=W2+'px';box.style.height=H2+'px'}box.style.transform='translate('+Math.round(x)+'px,'+Math.round(y)+'px)'}
  /* the Earth: small in the corner above the music, or (the map) filling the stage */
  function globeGeo(){var fb=$('foot').getBoundingClientRect(),r0=clamp(Math.min(VW,VH)*.12,40,66),x0=VW-r0-14,y0=(fb.top>0?fb.top:VH-120)-r0-12,
      R1=Math.min(STG.w,STG.h)*.42,k=smooth(mapK);
    g.R=lerp(r0,R1,k);g.cx=lerp(x0,STG.cx,k);g.cy=lerp(y0,STG.cy,k);
    if(Math.abs(gs.x-g.cx)>.5||Math.abs(gs.y-g.cy)>.5||Math.abs(gs.r-g.R)>.5){gs.x=g.cx;gs.y=g.cy;gs.r=g.R;var st=document.body.style;
      st.setProperty('--gx',Math.round(g.cx)+'px');st.setProperty('--gy',Math.round(g.cy)+'px');st.setProperty('--gr',Math.round(g.R+(MAP||mapK>.01?VW+VH:1))+'px')}}
  function mapOpen(v){MAP=!!v;mapT=FT;turned=0;document.body.classList.toggle('lmap',MAP);if(MAP)primeTheme()}
  /* ---- the row of themes ---- */
  function themesBuild(){var r=$('themes');if(!r||r.childNodes.length||!THEMES.length)return;
    [['all','all']].concat(THEMES).forEach(function(t){var b=document.createElement('button');b.type='button';b.className='lb';b.id='th_'+t[0];
      b.textContent=t[0]==='all'?'all':t[0];b.title=t[1];b.addEventListener('click',function(){themeSet(t[0])});r.appendChild(b)});themesSync()}
  function themesSync(){var r=$('themes');if(!r)return;r.querySelectorAll('.lb').forEach(function(b){b.setAttribute('aria-pressed',b.id==='th_'+TH?'true':'false')})}
  function themeSet(k){TH=k;themesSync();primeTheme();var c=CAMS[cur];if(!c||!inTheme(c))start();if(AU.auto)musicOn()}
  function enter(){
    on=true;el=$e('vid');box=$e('vidbox');img=$e('vidi');if(el)el.hidden=false;document.body.classList.add('livev');var r=$e('themes');if(r)r.hidden=false;
    GLOBE.load();liveLoad();camsLoad();themesBuild();lastT=0;
    if(cur<0&&CAMS.length)start();else if(player&&stat!=='off')try{player.playVideo()}catch(e){}geo();globeGeo()}
  function leave(){on=false;if(el){el.hidden=true;el.classList.remove('tap')}try{if(player)player.pauseVideo()}catch(e){}drag=0;mapOpen(false);mapK=0;
    document.body.classList.remove('livev');var r=$e('themes');if(r)r.hidden=true}
  function resize(){geo();globeGeo()}
  document.addEventListener('visibilitychange',function(){try{if(!player)return;if(document.hidden)player.pauseVideo();else if(on)player.playVideo()}catch(e){}});
  /* ---- fingers. A finger that was ever one of two is a pinch, not a swipe or a tap ---- */
  function onGlobe(x,y,pad){return Math.hypot(x-g.cx,y-g.cy)<g.R+(pad||0)}
  function down(p){touchT=FT;if(p.n>=2)eachPT(function(q){q.multi=true});p.map=MAP&&onGlobe(p.x,p.y,8)}
  function move(p){if(p.n>=2){p.multi=true;if(drag){drag=0;place()}return}
    if(MAP){if(p.map){var k=1/Math.max(40,g.R),dx=p.x-(p.lx===undefined?p.x0:p.lx),dy=p.y-(p.ly===undefined?p.y0:p.ly);p.lx=p.x;p.ly=p.y;lon0=AS.n180(lon0-dx*k*57.3);lat0=clamp(lat0+dy*k*57.3,-80,80);turned=FT}return}
    var dx2=p.x-p.x0;drag=dx2*(p.ghost?.25:.35);place()}
  function nearestMark(x,y,lim){var bi=-1,bd=lim*lim;for(var i=0;i<camP.length;i++){var q=camP[i];if(!q||q[2]<=.05||!inTheme(CAMS[i]))continue;var d=(q[0]-x)*(q[0]-x)+(q[1]-y)*(q[1]-y);if(d<bd){bd=d;bi=i}}return bi}
  function up(p){
    var dx=p.x-p.x0,dy=p.y-p.y0,dtm=FT-p.t0;drag=0;place();if(p.ghost||p.multi)return;var tap=dtm<600&&p.moved<14;
    if(MAP){if(!tap)return;var i=nearestMark(p.x,p.y,24);if(i>=0){mapOpen(false);if(i!==cur)show(i);return}if(!onGlobe(p.x,p.y,8))mapOpen(false);return}
    if(tap&&onGlobe(p.x,p.y,10)){mapOpen(true);hit('tok',.25,0);return}
    var ax=Math.abs(dx),ay=Math.abs(dy);
    if((ax>70&&ax>ay*1.3)||(Math.abs(p.vx)>650&&ax>28&&ax>ay)){step(dx<0?1:-1);return}
    if((ay>90&&ay>ax*1.5)||(Math.abs(p.vy||0)>700&&ay>36&&ay>ax)){step(dy<0?1:-1);return}}
  /* two fingers: the picture comes closer, or steps back to show all of it, and can be moved about */
  function gesture(e){if(e.ghost||MAP)return;var lo=vr.disk?1:Math.min(VW/vr.w,VH/vr.h)*.999;zoom=clamp(zoom*e.scale,lo,3);
    panx=clamp(panx+e.dx,-reachX(),reachX());pany=clamp(pany+e.dy,-reachY(),reachY());sweep=0;place()}
  function key(e,dn){if(e.key==='Escape'&&dn&&MAP){mapOpen(false);return true}if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return false;if(dn&&!e.repeat)step(e.key==='ArrowRight'?1:-1);return true}
  function tick(dt,t){
    var now=Date.now(),c=CAMS[cur];
    sunI=AS.sun(now);moonI=AS.moon(now);AS.llv(sunI.sublat,sunI.sublon,sunV);AS.llv(moonI.sublat,moonI.sublon,moonV);
    if(FT-issT>1000){issT=FT;try{issNow=ORBIT.iss(now)}catch(e){issNow=null}}
    mapK=clamp(mapK+(MAP?dt:-dt)*3.2,0,1);globeGeo();
    /* the Earth turns to the camera, unless a finger has just turned it on the map */
    if(!(MAP&&FT-turned<6000)){var ll=c?camLL(c):[20,lon0],k=Math.min(1,dt*1.6),dl=AS.n180(ll[1]-lon0);lon0=AS.n180(lon0+dl*k);lat0+=(clamp(ll[0],-60,60)-lat0)*k}
    if(!c&&!reduce)lon0=AS.n180(lon0+dt*3);GLOBE.basis(lat0,lon0,g);
    camP.length=CAMS.length;for(var i=0;i<CAMS.length;i++){var q=camP[i]||(camP[i]=[0,0,0]),l2=camLL(CAMS[i]);GLOBE.pr(AS.llv(l2[0],l2[1],tmp),g,q)}
    if(c&&FT-overT>3000){overT=FT;var l3=camLL(c);try{over=ORBIT.above(l3[0],l3[1],now)}catch(e){over=null}}
    /* held upright, the cropped picture is looked across, slowly, side to side (a minute there and back); a touch holds it a while */
    if(!reduce&&!MAP&&zoom<=1.001&&FT-touchT>12000&&stat==='live'){sweep=Math.sin((FT-liveT)/60000*TAU)*.92;place()}
    /* a still is fetched again when the satellite has taken a new picture */
    if(c&&c.kind==='img'&&FT-imgT>c.every*1000)imgLoad(c,false);
    /* a stream that will not start is passed over after twelve seconds (one that waits for a tap, after twenty-five) */
    if(c&&on&&!MAP&&stat==='connecting'&&FT-statT>(el&&el.classList.contains('tap')?25000:12000)){bad[c.id]=FT;step(1)}
    if(c&&on&&stat==='finding'&&FT-statT>20000){bad[c.id]=FT;step(1)}
    if(c&&on&&stat==='connecting'&&FT-statT>6000&&el)el.classList.add('tap');
    if(c&&on&&!MAP&&stat==='off'&&FT-statT>1400){statT=FT;step(1)}
    if(on&&!CAMS.length&&!asked)camsLoad()}
  function draw(t){
    var c=OV,i,q;
    if(GLX.ok&&!GLX.lost){var gl=GLX.gl,bg=[ABYSS[0]*.6,ABYSS[1]*.6,ABYSS[2]*.7];glAttrOff();gl.disable(gl.BLEND);glClear(bg[0],bg[1],bg[2]);
      GLOBE.draw(g,{sun:sunV,moon:moonV,moonK:moonI?moonI.phase:0,bg:bg,dim:.75,cld:GLOBE.hasCloud(),cldK:.9,time:t*.001})}
    /* the cameras on the Earth: on the map, a ring for each in the theme (bright when known to be on the air); the one shown, brighter */
    var k=smooth(mapK);
    for(i=0;i<camP.length;i++){q=camP[i];if(!q||q[2]<=.05)continue;var me=i===cur,cm=CAMS[i];if(!me&&(k<.05||!inTheme(cm)))continue;
      var air=onAir(cm),a=me?.95:(air?.85:.32)*clamp(q[2]*2,0,1)*k,r=me?(4+k*2)+Math.sin(t*.005)*1.2:air?3.4:2.4;
      c.strokeStyle=(air||me?'rgba(62,240,255,':'rgba(234,249,255,')+a.toFixed(3)+')';c.lineWidth=me?1.4:1;c.beginPath();c.arc(q[0],q[1],r,0,TAU);c.stroke();
      if(me){c.fillStyle='rgba(234,249,255,.95)';c.beginPath();c.arc(q[0],q[1],1.6,0,TAU);c.fill()}}
    /* the small Earth's rim, and while a stream is found a slow ring in the middle of the screen */
    if(k<.99){c.strokeStyle='rgba(62,240,255,'+(.35*(1-k)).toFixed(3)+')';c.lineWidth=1;c.beginPath();c.arc(g.cx,g.cy,g.R+3,0,TAU);c.stroke()}
    if(CAMS[cur]&&stat!=='live'&&!MAP){var u=(t*.0006)%1,cx=VW/2,cy=STG.cy;c.strokeStyle='rgba(234,249,255,'+(.35*(1-u)).toFixed(3)+')';c.lineWidth=1;c.beginPath();c.arc(cx,cy,8+u*30,0,TAU);c.stroke()}}
  function hour(la,lo){if(!sunI)return '';var hr=(((12+AS.n180(lo-sunI.sublon)/15)%24)+24)%24,h=Math.floor(hr),m=Math.floor((hr-h)*60),e=sunAt(la,lo);
    return (h<10?'0':'')+h+':'+(m<10?'0':'')+m+' by the Sun · '+(e>-.83?'Sun '+Math.round(e)+'° up':e>-18?(hr<12?'dawn':'dusk'):'night')}
  function themeName(){if(TH==='all')return 'all the cameras';for(var i=0;i<THEMES.length;i++)if(THEMES[i][0]===TH)return THEMES[i][1];return TH}
  function airCount(){var n=0,m=0;CAMS.forEach(function(c){if(!inTheme(c))return;m++;if(onAir(c))n++});return [n,m]}
  function hud(){
    var c=CAMS[cur];if(!c)return asked?(CAMS.length?'':'finding the cameras'):'';
    var ac=airCount(),l0=themeName()+' · '+(ac[0]?ac[0]+' of '+ac[1]+' on the air now':ac[1]+' cameras');
    if(MAP)return 'live cameras, around the world: '+themeName()+'\n'+(ac[0]?ac[0]+' of '+ac[1]+' on the air now':'finding which are on the air')+' · tap one to go there\ndrag to turn the Earth · tap off the Earth to go back';
    var ll=camLL(c),la=ll[0],lo=ll[1],l1=c.name+(c.place?' · '+c.place:''),l2='',l3='',w=null,s=ST[c.id];
    if(c.moving&&issNow){l1=c.name;l2='over '+Math.abs(la).toFixed(1)+'°'+(la>=0?'N':'S')+' '+Math.abs(lo).toFixed(1)+'°'+(lo>=0?'E':'W')+' · '+Math.round(issNow.alt)+' km up · '+Math.round(issNow.kmh).toLocaleString('en-US')+' km/h'}
    else if(c.kind==='img')l2=imgAt?'picture of '+stampUTC(imgAt):'';
    else{l2=hour(la,lo);try{w=WIND.windAt(la,lo)}catch(e){w=null}if(w&&w.kmh>=1)l2+=' · wind '+Math.round(w.kmh)+' km/h'}
    var by=s&&s.ch?s.ch:c.by,st=stat==='live'?(c.kind==='img'?c.by:'live'+(by?' · '+by:'')):stat==='off'?'not on the air now':'finding the stream';
    if(over&&c.kind!=='img')l3=over.n.toLocaleString('en-US')+' satellites above'+(over.iss>0&&over.iss<2600&&!c.moving?' · the space station '+Math.round(over.iss).toLocaleString('en-US')+' km away':'')+' · '+st;
    else l3=st;
    return l1+'\n'+l2+'\n'+l3+'\n'+l0+' · swipe for the next · the Earth for the map'}
  function ghost(t){if(MAP)return [null];var u=(t*.15)%1;if(u<.4){var e=smooth(u/.4);return [{x:VW/2+Math.min(STG.w,300)*(.3-.6*e),y:STG.cy}]}return [null]}
  return {enter:enter,leave:leave,resize:resize,down:down,move:move,up:up,gesture:gesture,key:key,tick:tick,draw:draw,hud:hud,ghost:ghost,
    dbg:function(){var c=CAMS[cur];return {cams:CAMS.length,themes:THEMES.map(function(x){return x[0]}),th:TH,cur:cur,id:c?c.id:'',kind:c?c.kind:'',stat:stat,yt:ytId,ready:ytReady,fail:ytFail,bad:Object.keys(bad),zoom:zoom,
      map:MAP,mapK:mapK,air:airCount(),st:Object.keys(ST).length,box:{x:vr.x,y:vr.y,w:vr.w,h:vr.h},g:{cx:g.cx,cy:g.cy,R:g.R},marks:camP.map(function(q){return q?[q[0],q[1],q[2]]:null}),ids:CAMS.map(function(c){return c.id}),onair:CAMS.filter(function(c){return onAir(c)}).map(function(c){return c.id}),over:over,iss:issNow,img:img&&!img.hidden}},
    go:function(id){for(var i=0;i<CAMS.length;i++)if(CAMS[i].id===id){show(i);return i}return -1},theme:themeSet,map:mapOpen}
})();
