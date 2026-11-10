/* ---------- Live: windows onto interesting places, from cameras that stream around the clock. Only where the page is served from the
   owner's own host (HOSTED): a Claude artifact may not show any outside video. Asked for on 10 Nov: "def give me live video feeds from
   interesting places".
   The window sits over the Earth; the Earth turns to where the camera is, and the readout says what is true of that place now: its hour
   by the Sun and the Sun's height, the wind (NOAA's GFS), how many satellites are above its horizon (worked out from every published
   orbit), how far the space station is. A swipe goes to the next camera east or west; a tap on a mark on the globe goes to that camera;
   two fingers bring the window closer. The cameras' own sound is never played: the band is the sound.
   The list of cameras is the Worker's (/api/cams), and the Worker says which video a camera is showing now (/api/yt/<camera>): streams
   restart and change their address. A camera that is not on the air, or will not play here, is passed over. ---------- */
var LIVEW=(function(){
  var CAMS=[],cur=-1,asked=false,player=null,ytReady=false,ytAsked=false,ytFail=false,ytWant=null,ytId='',
    el=null,box=null,img=null,imgUrl='',imgAt=0,imgT=0,
    g={cx:0,cy:0,R:100,E:[0,0,0],N:[0,0,0],C:[0,0,0]},lat0=20,lon0=-40,
    vb={x:0,y:0,w:0,h:0,port:true},zoom=1,panx=0,pany=0,drag=0,
    sunV=[0,0,0],moonV=[0,0,0],sunI=null,moonI=null,stat='',statT=0,liveT=0,bad={},res={},over=null,overT=0,issNow=null,issT=0,
    on=false,lastT=0,camP=[],tmp=[0,0,0],seq=0;
  function $e(id){return document.getElementById(id)}
  function valid(c){return c&&typeof c.id==='string'&&/^[a-z0-9\-]{1,24}$/.test(c.id)&&typeof c.name==='string'&&isFinite(+c.lat)&&isFinite(+c.lon)&&(c.kind==='yt'||c.kind==='img')}
  function word(v,n){return String(v===undefined||v===null?'':v).replace(/[^0-9A-Za-z .,:;'()\/&°\-]/g,'').slice(0,n||60)}
  function camsLoad(){
    if(asked)return;asked=true;
    try{fetch('/api/cams').then(function(r){return r.ok?r.json():null}).then(function(d){
      if(!d||!Array.isArray(d.cams))return;
      CAMS=d.cams.filter(valid).slice(0,40).map(function(c){return {id:c.id,name:word(c.name,40),place:word(c.place,60),lat:clamp(+c.lat,-90,90),lon:AS.n180(+c.lon),kind:c.kind,
        v:Array.isArray(c.v)?c.v.filter(function(x){return /^[\w\-]{11}$/.test(x)}):[],img:/^[a-z0-9\-]{1,24}$/.test(c.img||'')?c.img:'',moving:c.moving==='iss',best:c.best==='day'||c.best==='night'?c.best:'any',
        by:word(c.by,48),every:clamp(+c.every||600,60,3600)}});
      CAMS.sort(function(a,b){return a.lon-b.lon});if(on&&cur<0)start()}).catch(function(){asked=false})}catch(e){asked=false}}
  /* the Sun's height (degrees) at a place now */
  function sunAt(la,lo){if(!sunI)return 0;var v=AS.llv(la,lo,tmp);return Math.asin(clamp(v[0]*sunV[0]+v[1]*sunV[1]+v[2]*sunV[2],-1,1))/AS.D}
  function camLL(c){if(c.moving&&issNow)return [issNow.lat,issNow.lon];return [c.lat,c.lon]}
  /* where to begin: a camera whose light suits it now (a city by day, the aurora by night), video before stills */
  /* a camera can be shown unless it was found off the air in the last ten minutes, or it is a stream and YouTube's player cannot load here */
  function usable(c){return !(bad[c.id]&&FT-bad[c.id]<600000)&&!(c.kind==='yt'&&ytFail)}
  function start(){var bi=-1,bs=-1e9;CAMS.forEach(function(c,i){if(!usable(c))return;var e=sunAt(c.lat,c.lon),s=(c.kind==='yt'?1.5:0)+Math.random()*.6+
      (c.best==='day'?(e>4?2:-1):c.best==='night'?(e<-8?2.5:-1):1);if(s>bs){bs=s;bi=i}});if(bi>=0)show(bi)}
  function step(dir){if(!CAMS.length)return;var n=CAMS.length,i=cur<0?0:cur;for(var k=0;k<n;k++){i=(i+dir+n)%n;if(usable(CAMS[i])){show(i);return}}}
  function fade(v){if(box)box.classList.toggle('on',!!v)}
  function show(i){
    var c=CAMS[i];if(!c)return;cur=i;seq++;stat='finding';statT=FT;liveT=0;zoom=1;panx=pany=0;fade(false);ytId='';
    if(box){box.classList.toggle('disk',c.kind==='img')}geo();
    if(c.kind==='img'){if(player)try{player.pauseVideo()}catch(e){}imgLoad(c,true);return}
    if(img){img.hidden=true}
    var my=seq;resolve(c,function(id){if(my!==seq)return;if(!id){bad[c.id]=FT;stat='off';statT=FT;return}play(id)})}
  /* which video the camera shows now: asked of the Worker, remembered ten minutes; the address on the list if the Worker cannot tell */
  function resolve(c,cb){var r=res[c.id];if(r&&FT-r.t<600000){cb(r.id);return}
    var done=false,fall=function(){if(done)return;done=true;var id=c.v[0]||'';res[c.id]={id:id,t:FT};cb(id)};
    try{fetch('/api/yt/'+c.id).then(function(x){return x.ok?x.json():null}).then(function(d){if(done)return;
      if(d&&typeof d.id==='string'&&/^[\w\-]{11}$/.test(d.id)){done=true;res[c.id]={id:d.id,t:FT};cb(d.id)}else if(d&&d.live===false){done=true;res[c.id]={id:'',t:FT};cb('')}else fall()}).catch(fall)}catch(e){fall()}
    setTimeout(fall,9000)}
  function imgLoad(c,first){
    var my=seq;imgT=FT;try{fetch('/api/feed/'+c.img).then(function(r){if(!r.ok)throw new Error(r.status);imgAt=Date.parse(r.headers.get('last-modified')||'')||Date.now();return r.blob()}).then(function(b){
      if(my!==seq)return;if(imgUrl)URL.revokeObjectURL(imgUrl);imgUrl=URL.createObjectURL(b);img.onload=function(){if(my!==seq)return;img.hidden=false;if(stat!=='live')arrive();stat='live';liveT=FT;fade(true)};img.src=imgUrl})
      .catch(function(){if(my!==seq)return;if(first){bad[c.id]=FT;stat='off';statT=FT}})}catch(e){}}
  /* the YouTube player: muted, no controls, never full screen; the band plays over it */
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
            else if(e.data===0&&on)step(1)},
          onError:function(){var c=CAMS[cur];if(c){bad[c.id]=FT;res[c.id]=null}stat='off';statT=FT}}})}catch(e){ytFail=true}}
  function arrive(){if(!reduce)tone('bowl',pent(2,52),.3,0)}
  /* the window over the Earth: above it on a phone held upright, beside it on a wide screen */
  function geo(){
    var port=STG.h>STG.w*1.08,c=CAMS[cur],disk=c&&c.kind==='img',R;vb.port=port;
    if(port){vb.w=disk?Math.min(STG.w*.92,STG.h*.5):STG.w*1.3;vb.h=disk?vb.w:vb.w*9/16;vb.x=STG.cx-vb.w/2;vb.y=STG.y0+4;
      var top=vb.y+(disk?vb.w:STG.w*1.3*9/16)+14;R=Math.max(40,Math.min(STG.w*.36,(STG.y1-top)/2-6));g.R=R;g.cx=STG.cx;g.cy=Math.max(top+R,STG.y1-R-6)}
    else{var aw=STG.w*.66;vb.h=disk?Math.min(STG.h*.96,aw*.9):Math.min(STG.h*.96,aw*9/16*1.12);vb.w=disk?vb.h:vb.h*16/9;vb.x=STG.x0+aw/2-vb.w/2;vb.y=STG.cy-vb.h/2;
      R=Math.max(40,Math.min((STG.w-aw)/2-14,STG.h*.42));g.R=R;g.cx=STG.x0+aw+(STG.w-aw)/2;g.cy=STG.cy}
    place()}
  function place(){if(!box)return;var w=vb.w*zoom,h=vb.h*zoom,x=vb.x+vb.w/2-w/2+panx+drag,y=vb.y+vb.h/2-h/2+pany;
    box.style.width=Math.round(w)+'px';box.style.height=Math.round(h)+'px';box.style.transform='translate('+Math.round(x)+'px,'+Math.round(y)+'px)';
    box.classList.toggle('port',vb.port);box.classList.toggle('land',!vb.port)}
  function enter(){
    on=true;el=$e('vid');box=$e('vidbox');img=$e('vidi');if(el)el.hidden=false;GLOBE.load();liveLoad();camsLoad();lastT=0;
    if(cur<0&&CAMS.length)start();else if(player&&stat!=='off')try{player.playVideo()}catch(e){}geo()}
  function leave(){on=false;if(el){el.hidden=true;el.classList.remove('tap')}try{if(player)player.pauseVideo()}catch(e){}drag=0}
  function resize(){geo()}
  document.addEventListener('visibilitychange',function(){try{if(!player)return;if(document.hidden)player.pauseVideo();else if(on)player.playVideo()}catch(e){}});
  /* a finger that was ever one of two is a pinch, not a swipe or a tap */
  function down(p){if(p.n>=2)eachPT(function(q){q.multi=true})}
  function move(p){if(p.n>=2){p.multi=true;if(drag){drag=0;place()}return}var dx=p.x-p.x0;drag=dx*(p.ghost?.25:.35);place()}
  function up(p){
    var dx=p.x-p.x0,dy=p.y-p.y0,dtm=FT-p.t0;drag=0;place();if(p.ghost||p.multi)return;
    if((Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.3)||(Math.abs(p.vx)>650&&Math.abs(dx)>28&&Math.abs(dx)>Math.abs(dy))){step(dx<0?1:-1);return}
    if(dtm<600&&p.moved<14){var bi=-1,bd=24*24;for(var i=0;i<camP.length;i++){var q=camP[i];if(!q||q[2]<=.05)continue;var d=(q[0]-p.x)*(q[0]-p.x)+(q[1]-p.y)*(q[1]-p.y);if(d<bd){bd=d;bi=i}}
      if(bi>=0&&bi!==cur)show(bi)}}
  /* two fingers: the window comes closer and can be moved about while it is close */
  function gesture(e){if(e.ghost)return;zoom=clamp(zoom*e.scale,1,3);if(zoom<=1.001){panx=pany=0}else{panx=clamp(panx+e.dx,-vb.w*(zoom-1)/2,vb.w*(zoom-1)/2);pany=clamp(pany+e.dy,-vb.h*(zoom-1)/2,vb.h*(zoom-1)/2)}place()}
  function key(e,dn){if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return false;if(dn&&!e.repeat)step(e.key==='ArrowRight'?1:-1);return true}
  function tick(dt,t){
    var now=Date.now(),c=CAMS[cur];
    sunI=AS.sun(now);moonI=AS.moon(now);AS.llv(sunI.sublat,sunI.sublon,sunV);AS.llv(moonI.sublat,moonI.sublon,moonV);
    if(FT-issT>1000){issT=FT;try{issNow=ORBIT.iss(now)}catch(e){issNow=null}}
    var ll=c?camLL(c):[20,lon0],k=Math.min(1,dt*1.6),dl=AS.n180(ll[1]-lon0);lon0=AS.n180(lon0+dl*k);lat0+=(clamp(ll[0],-70,70)-lat0)*k;
    if(!c&&!reduce)lon0=AS.n180(lon0+dt*3);GLOBE.basis(lat0,lon0,g);
    camP.length=CAMS.length;for(var i=0;i<CAMS.length;i++){var q=camP[i]||(camP[i]=[0,0,0]),l2=camLL(CAMS[i]);GLOBE.pr(AS.llv(l2[0],l2[1],tmp),g,q)}
    if(c&&FT-overT>3000){overT=FT;var l3=camLL(c);try{over=ORBIT.above(l3[0],l3[1],now)}catch(e){over=null}}
    /* a still is fetched again when the satellite has taken a new picture */
    if(c&&c.kind==='img'&&FT-imgT>c.every*1000)imgLoad(c,false);
    /* a stream that will not start is passed over after half a minute; one that played and stopped is given a while to come back */
    if(c&&on&&(stat==='connecting'||stat==='finding')&&FT-statT>30000){bad[c.id]=FT;step(1)}
    if(c&&on&&stat==='connecting'&&FT-statT>7000&&el)el.classList.add('tap');
    if(c&&on&&stat==='off'&&FT-statT>1600){statT=FT;step(1)}
    if(on&&!CAMS.length&&!asked)camsLoad()}
  function draw(t){
    var c=OV,i,q;
    if(GLX.ok&&!GLX.lost){var gl=GLX.gl,bg=[ABYSS[0]*.6,ABYSS[1]*.6,ABYSS[2]*.7];glAttrOff();gl.disable(gl.BLEND);glClear(bg[0],bg[1],bg[2]);
      GLOBE.draw(g,{sun:sunV,moon:moonV,moonK:moonI?moonI.phase:0,bg:bg,dim:.66,cld:GLOBE.hasCloud(),cldK:.9,time:t*.001})}
    /* the cameras on the Earth: a small ring each; the one shown, a brighter ring and a line up to its window */
    for(i=0;i<camP.length;i++){q=camP[i];if(!q||q[2]<=.05)continue;var me=i===cur,a=me?.95:.5*clamp(q[2]*2,0,1),r=me?5.5+Math.sin(t*.005)*1.2:3;
      c.strokeStyle='rgba(62,240,255,'+a.toFixed(3)+')';c.lineWidth=me?1.4:1;c.beginPath();c.arc(q[0],q[1],r,0,TAU);c.stroke();
      if(me){c.fillStyle='rgba(234,249,255,.95)';c.beginPath();c.arc(q[0],q[1],1.6,0,TAU);c.fill();
        var bb=vb.y+vb.h/2+vb.h*zoom/2+4,br=vb.x+vb.w/2+vb.w*zoom/2+drag+4;c.strokeStyle='rgba(62,240,255,.2)';c.lineWidth=1;c.beginPath();
        if(vb.port&&bb<q[1]-r-2){c.moveTo(q[0],q[1]-r-2);c.lineTo(q[0],bb)}else if(!vb.port&&br<q[0]-r-2){c.moveTo(q[0]-r-2,q[1]);c.lineTo(br,q[1])}c.stroke()}}
    /* while a stream is being found: a slow ring where the window will be */
    if(CAMS[cur]&&stat!=='live'){var cx=vb.x+vb.w/2,cy=vb.y+vb.h/2,u=(t*.0006)%1;c.strokeStyle='rgba(234,249,255,'+(.35*(1-u)).toFixed(3)+')';c.lineWidth=1;c.beginPath();c.arc(cx,cy,8+u*30,0,TAU);c.stroke()}}
  function hour(la,lo){if(!sunI)return '';var hr=(((12+AS.n180(lo-sunI.sublon)/15)%24)+24)%24,h=Math.floor(hr),m=Math.floor((hr-h)*60),e=sunAt(la,lo);
    return (h<10?'0':'')+h+':'+(m<10?'0':'')+m+' by the Sun · '+(e>-.83?'Sun '+Math.round(e)+'° up':e>-18?(hr<12?'dawn':'dusk'):'night')}
  function hud(){
    var c=CAMS[cur];if(!c)return asked?(CAMS.length?'':'finding the cameras'):'';
    var ll=camLL(c),la=ll[0],lo=ll[1],l1=c.name+(c.place?' · '+c.place:''),l2='',l3='',w=null;
    if(c.moving&&issNow){l1=c.name;l2='over '+Math.abs(la).toFixed(1)+'°'+(la>=0?'N':'S')+' '+Math.abs(lo).toFixed(1)+'°'+(lo>=0?'E':'W')+' · '+Math.round(issNow.alt)+' km up · '+Math.round(issNow.kmh).toLocaleString('en-US')+' km/h'}
    else if(c.kind==='img')l2=imgAt?'picture of '+stampUTC(imgAt):'';
    else{l2=hour(la,lo);try{w=WIND.windAt(la,lo)}catch(e){w=null}if(w&&w.kmh>=1)l2+=' · wind '+Math.round(w.kmh)+' km/h'}
    var st=stat==='live'?(c.kind==='img'?c.by:'live'+(c.by?' · '+c.by:'')):stat==='off'?'not on the air now':'finding the stream';
    if(over&&c.kind!=='img')l3=over.n.toLocaleString('en-US')+' satellites above'+(over.iss>0&&over.iss<2600&&!c.moving?' · the space station '+Math.round(over.iss).toLocaleString('en-US')+' km away':'')+' · '+st;
    else l3=st;
    return l1+'\n'+l2+'\n'+l3}
  function ghost(t){var u=(t*.15)%1;if(u<.4){var e=smooth(u/.4);return [{x:vb.x+vb.w/2+Math.min(STG.w,vb.w)*(.3-.6*e),y:vb.y+vb.h*.6}]}return [null]}
  return {enter:enter,leave:leave,resize:resize,down:down,move:move,up:up,gesture:gesture,key:key,tick:tick,draw:draw,hud:hud,ghost:ghost,
    dbg:function(){var c=CAMS[cur];return {cams:CAMS.length,cur:cur,id:c?c.id:'',kind:c?c.kind:'',stat:stat,yt:ytId,ready:ytReady,fail:ytFail,bad:Object.keys(bad),zoom:zoom,
      box:{x:vb.x,y:vb.y,w:vb.w,h:vb.h},g:{cx:g.cx,cy:g.cy,R:g.R},marks:camP.map(function(q){return q?[q[0],q[1],q[2]]:null}),over:over,iss:issNow,img:img&&!img.hidden}},
    go:function(id){for(var i=0;i<CAMS.length;i++)if(CAMS[i].id===id){show(i);return i}return -1}}
})();
