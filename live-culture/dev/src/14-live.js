/* ---------- the cameras: a layer of the Earth (12-wind.js), only where the page is served from the owner's own host (HOSTED): a Claude
   artifact may not show any outside video. Asked for on 10 Nov ("def give me live video feeds from interesting places"); on 12 Nov he
   chose every camera playing, better places and many more of them, browsable by theme; on 13 Nov "Put them all on the same globe as
   satellites and make that just a layer", and for a camera tapped, "Window over the globe".
   So each camera of the theme is a ring on the Earth (bright when it is known to be on the air); a tap on one opens a window in the
   corner of the screen where it plays, and the Earth turns to it. A swipe across the window goes to the next camera east or west, a
   tap on it makes it bigger (or smaller again), its cross closes it. The row of kinds above the layers: all, animals, volcanoes,
   space, cities, the sea, night skies, mountains, things that move.
   The readout says what is true of the place now: its hour by the Sun and the Sun's height, the wind (NOAA's GFS), how many satellites
   are above its horizon (worked out from every published orbit), how far the space station is. The cameras' own sound is never
   played: the band is the sound.
   The list of cameras is the Worker's (/api/cams); the Worker finds which video each is streaming now (/api/live, several at a time:
   streams restart and change their address), and the page shows only those on the air, passing over any that will not play here. ---------- */
var LIVEW=(function(){
  var CAMS=[],THEMES=[],TH='all',cur=-1,asked=false,player=null,ytReady=false,ytAsked=false,ytFail=false,ytWant=null,ytId='',
    el=null,box=null,img=null,imgUrl='',imgAt=0,imgT=0,
    sunV=[0,0,0],sunI=null,stat='',statT=0,liveT=0,bad={},ST={},waitQ=[],asking=0,over=null,overT=0,issNow=null,issT=0,
    on=false,camP=[],tmp=[0,0,0],seq=0,big=false,win={x:0,y:0,w:0,h:0},fly=null;
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
      themesBuild();if(on)primeTheme()}).catch(function(){asked=false})}catch(e){asked=false}}
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
  /* the next camera east or west in the theme: one known to be on the air if there is one, else the next not known to be off */
  function step(dir){if(!CAMS.length)return;var n=CAMS.length,i=cur<0?0:cur,k,fb=-1;
    for(k=0;k<n;k++){i=(i+dir+n)%n;var c=CAMS[i];if(!inTheme(c)||!usable(c))continue;if(onAir(c)){show(i);return}if(fb<0)fb=i}
    if(fb>=0)show(fb)}
  function fade(v){if(box)box.classList.toggle('on',!!v)}
  /* a camera chosen: the window opens (or changes) and the Earth turns to it */
  function show(i){
    var c=CAMS[i];if(!c)return;cur=i;seq++;stat='finding';statT=FT;liveT=0;fade(false);ytId='';
    winOpen();if(box)box.classList.toggle('disk',c.kind==='img');winGeo();
    var ll=camLL(c);if(fly)fly(ll[0],ll[1]);
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
        events:{onReady:function(e){try{e.target.mute();if(on&&cur>=0)e.target.playVideo();else e.target.pauseVideo()}catch(x){}},
          onStateChange:function(e){if(e.data===1){if(stat!=='live')arrive();stat='live';liveT=FT;fade(true);el&&el.classList.remove('tap')}
            else if(e.data===0&&on&&cur>=0){var c=CAMS[cur];if(c)bad[c.id]=FT;step(1)}},
          onError:function(){var c=CAMS[cur];if(c){bad[c.id]=FT;if(ST[c.id])ST[c.id].id=''}stat='off';statT=FT}}})}catch(e){ytFail=true}}
  function arrive(){if(!reduce)tone('bowl',pent(2,52),.3,0)}
  /* ---- the window: in the corner of the stage above the music and the layers, sixteen by nine; tapped, across the top of the stage ---- */
  function winOpen(){if(!el)return;el.hidden=false;document.body.classList.add('camw')}
  function winClose(){cur=-1;seq++;stat='';fade(false);try{if(player)player.pauseVideo()}catch(e){}if(el){el.hidden=true;el.classList.remove('tap')}document.body.classList.remove('camw');big=false}
  function winGeo(){var w,h;if(big){w=STG.w-16;h=w*9/16;win.x=STG.x0+8;win.y=STG.y0+8}else{w=clamp(STG.w*.58,170,420);h=w*9/16;win.x=STG.x1-w-8;win.y=STG.y1-h-8}win.w=w;win.h=h;place()}
  function place(){if(!box)return;var c=CAMS[cur],x=win.x,y=win.y,w=win.w,h=win.h;
    if(c&&c.kind==='img'){var d=Math.min(w,h);x+=(w-d)/2;w=h=d}
    /* (the size only when it changes: resizing the player every frame would make it lay itself out every frame) */
    var W2=Math.round(w),H2=Math.round(h);if(W2!==box._w||H2!==box._h){box._w=W2;box._h=H2;box.style.width=W2+'px';box.style.height=H2+'px'}box.style.transform='translate('+Math.round(x)+'px,'+Math.round(y)+'px)'}
  function inWin(x,y){return cur>=0&&x>=win.x&&x<=win.x+win.w&&y>=win.y&&y<=win.y+win.h}
  function onX(x,y){return cur>=0&&x>=win.x+win.w-34&&y<=win.y+34}
  /* a finger on the window: across it, the next camera east or west; a tap, bigger or smaller; on its cross, closed */
  function winUp(p){if(p.ghost||p.multi)return;var dx=p.x-p.x0,dy=p.y-p.y0,ax=Math.abs(dx),ay=Math.abs(dy),tap=FT-p.t0<600&&p.moved<14;
    if(tap){if(onX(p.x0,p.y0)){winClose();hit('tok',.25,0);return}big=!big;winGeo();hit('tok',.2,0);return}
    if((ax>50&&ax>ay*1.2)||(Math.abs(p.vx||0)>600&&ax>24&&ax>ay))step(dx<0?1:-1)}
  function nearestMark(x,y,lim){var bi=-1,bd=lim*lim;for(var i=0;i<camP.length;i++){var q=camP[i];if(!q||q[2]<=.05||!inTheme(CAMS[i]))continue;var d=(q[0]-x)*(q[0]-x)+(q[1]-y)*(q[1]-y);if(d<bd){bd=d;bi=i}}return bi}
  /* ---- the row of themes ---- */
  function themesBuild(){var r=$('themes');if(!r||r.childNodes.length||!THEMES.length)return;
    [['all','all']].concat(THEMES).forEach(function(t){var b=document.createElement('button');b.type='button';b.className='lb';b.id='th_'+t[0];
      b.textContent=t[0]==='all'?'all':t[0];b.title=t[1];b.addEventListener('click',function(){themeSet(t[0])});r.appendChild(b)});themesSync()}
  function themesSync(){var r=$('themes');if(!r)return;r.querySelectorAll('.lb').forEach(function(b){b.setAttribute('aria-pressed',b.id==='th_'+TH?'true':'false')})}
  function themeSet(k){TH=k;themesSync();primeTheme();var c=CAMS[cur];if(c&&!inTheme(c))step(1);if(AU.auto)musicOn()}
  function hour(la,lo){if(!sunI)return '';var hr=(((12+AS.n180(lo-sunI.sublon)/15)%24)+24)%24,h=Math.floor(hr),m=Math.floor((hr-h)*60),e=sunAt(la,lo);
    return (h<10?'0':'')+h+':'+(m<10?'0':'')+m+' by the Sun · '+(e>-.83?'Sun '+Math.round(e)+'° up':e>-18?(hr<12?'dawn':'dusk'):'night')}
  function themeName(){if(TH==='all')return 'all the cameras';for(var i=0;i<THEMES.length;i++)if(THEMES[i][0]===TH)return THEMES[i][1];return TH}
  function airCount(){var n=0,m=0;CAMS.forEach(function(c){if(!inTheme(c))return;m++;if(onAir(c))n++});return [n,m]}
  /* ---- the layer: switched on and off from the Earth's row of layers; it reads the cameras, the Earth's turn and taps from there ---- */
  function layerOn(v){
    on=!!v;el=$e('vid');box=$e('vidbox');img=$e('vidi');var r=$e('themes');
    if(on){camsLoad();themesBuild();if(r)r.hidden=false;primeTheme()}else{winClose();if(r)r.hidden=true}}
  function tick(dt,g){
    var now=Date.now(),c=CAMS[cur];if(c)winGeo();
    sunI=AS.sun(now);AS.llv(sunI.sublat,sunI.sublon,sunV);
    if(FT-issT>1000){issT=FT;try{issNow=ORBIT.iss(now)}catch(e){issNow=null}}
    camP.length=CAMS.length;for(var i=0;i<CAMS.length;i++){var q=camP[i]||(camP[i]=[0,0,0]),l2=camLL(CAMS[i]);GLOBE.pr(AS.llv(l2[0],l2[1],tmp),g,q)}
    if(!c)return;
    if(FT-overT>3000){overT=FT;var l3=camLL(c);try{over=ORBIT.above(l3[0],l3[1],now)}catch(e){over=null}}
    /* a still is fetched again when the satellite has taken a new picture */
    if(c.kind==='img'&&FT-imgT>c.every*1000)imgLoad(c,false);
    /* a stream that will not start is passed over after twelve seconds (one that waits for a tap, after twenty-five) */
    if(stat==='connecting'&&FT-statT>(el&&el.classList.contains('tap')?25000:12000)){bad[c.id]=FT;step(1)}
    if(stat==='finding'&&FT-statT>20000){bad[c.id]=FT;step(1)}
    if(stat==='connecting'&&FT-statT>6000&&el)el.classList.add('tap');
    if(stat==='off'&&FT-statT>1400){statT=FT;step(1)}}
  function draw(t,g){
    var c=OV,i,q;
    /* a ring for each camera of the theme (bright when known to be on the air); the one playing, brighter, with a line to its window */
    for(i=0;i<camP.length;i++){q=camP[i];if(!q||q[2]<=.05)continue;var me=i===cur,cm=CAMS[i];if(!me&&!inTheme(cm))continue;
      var air=onAir(cm),a=me?.95:(air?.85:.34)*clamp(q[2]*2,0,1),r=me?5+Math.sin(t*.005)*1.2:air?3.6:2.6;
      c.strokeStyle='rgba(1,4,10,.5)';c.lineWidth=2.6;c.beginPath();c.arc(q[0],q[1],r,0,TAU);c.stroke();
      c.strokeStyle=(air||me?'rgba(62,240,255,':'rgba(234,249,255,')+a.toFixed(3)+')';c.lineWidth=me?1.5:1.1;c.beginPath();c.arc(q[0],q[1],r,0,TAU);c.stroke();
      if(me){c.fillStyle='rgba(234,249,255,.95)';c.beginPath();c.arc(q[0],q[1],1.7,0,TAU);c.fill()}}
    var cm2=CAMS[cur];if(!cm2)return;
    var mq=camP[cur];if(mq&&mq[2]>.05){c.setLineDash([2,5]);c.strokeStyle='rgba(62,240,255,.45)';c.lineWidth=1;c.beginPath();c.moveTo(mq[0],mq[1]);c.lineTo(win.x+win.w/2,win.y);c.stroke();c.setLineDash([])}
    /* the window's frame, its cross, and while a stream is found a slow ring in its middle */
    c.strokeStyle='rgba(234,249,255,.55)';c.lineWidth=1;c.strokeRect(win.x-.5,win.y-.5,win.w+1,win.h+1);
    var xx=win.x+win.w-17,xy=win.y+17;c.fillStyle='rgba(1,4,10,.6)';c.beginPath();c.arc(xx,xy,11,0,TAU);c.fill();c.strokeStyle='rgba(234,249,255,.9)';c.lineWidth=1.3;
    c.beginPath();c.moveTo(xx-4.5,xy-4.5);c.lineTo(xx+4.5,xy+4.5);c.moveTo(xx+4.5,xy-4.5);c.lineTo(xx-4.5,xy+4.5);c.stroke();
    if(stat!=='live'){var u=(t*.0006)%1;c.strokeStyle='rgba(234,249,255,'+(.4*(1-u)).toFixed(3)+')';c.beginPath();c.arc(win.x+win.w/2,win.y+win.h/2,6+u*Math.min(28,win.h*.3),0,TAU);c.stroke()}}
  function hud(){
    var c=CAMS[cur];if(!c){if(!on)return '';if(!CAMS.length)return asked?'finding the cameras':'';var ac=airCount();return themeName()+' · '+(ac[0]?ac[0]+' of '+ac[1]+' on the air now':ac[1]+' cameras')+' · tap a ring to watch'}
    var ll=camLL(c),la=ll[0],lo=ll[1],l1=c.name+(c.place?' · '+c.place:''),l2='',l3='',w=null,s=ST[c.id];
    if(c.moving&&issNow){l1=c.name;l2='over '+Math.abs(la).toFixed(1)+'°'+(la>=0?'N':'S')+' '+Math.abs(lo).toFixed(1)+'°'+(lo>=0?'E':'W')+' · '+Math.round(issNow.alt)+' km up · '+Math.round(issNow.kmh).toLocaleString('en-US')+' km/h'}
    else if(c.kind==='img')l2=imgAt?'picture of '+stampUTC(imgAt):'';
    else{l2=hour(la,lo);try{w=WIND.windAt(la,lo)}catch(e){w=null}if(w&&w.kmh>=1)l2+=' · wind '+Math.round(w.kmh)+' km/h'}
    var by=s&&s.ch?s.ch:c.by,st=stat==='live'?(c.kind==='img'?c.by:'live'+(by?' · '+by:'')):stat==='off'?'not on the air now':'finding the stream';
    if(over&&c.kind!=='img')l3=over.n.toLocaleString('en-US')+' satellites above'+(over.iss>0&&over.iss<2600&&!c.moving?' · the space station '+Math.round(over.iss).toLocaleString('en-US')+' km away':'')+' · '+st;
    else l3=st;
    return l1+'\n'+l2+'\n'+l3+'\nswipe the window for the next · tap it, bigger · × to close'}
  document.addEventListener('visibilitychange',function(){try{if(!player)return;if(document.hidden)player.pauseVideo();else if(on&&cur>=0)player.playVideo()}catch(e){}});
  return {layer:{on:layerOn,tick:tick,draw:draw,hud:hud,hit:inWin,up:winUp,resize:function(){if(cur>=0)winGeo()},
      /* a tap on the Earth: a camera's ring within reach opens its window (true) */
      pick:function(x,y){if(!on)return false;var i=nearestMark(x,y,22);if(i<0)return false;show(i);hit('tok',.25,0);return true},
      open:function(){return cur>=0},close:winClose,flyTo:function(f){fly=f}},
    dbg:function(){var c=CAMS[cur];return {on:on,cams:CAMS.length,themes:THEMES.map(function(x){return x[0]}),th:TH,cur:cur,id:c?c.id:'',kind:c?c.kind:'',stat:stat,yt:ytId,ready:ytReady,fail:ytFail,bad:Object.keys(bad),
      air:airCount(),st:Object.keys(ST).length,win:{x:win.x,y:win.y,w:win.w,h:win.h,big:big},marks:camP.map(function(q){return q?[q[0],q[1],q[2]]:null}),ids:CAMS.map(function(c){return c.id}),
      onair:CAMS.filter(function(c){return onAir(c)}).map(function(c){return c.id}),over:over,iss:issNow,img:img&&!img.hidden}},
    go:function(id){for(var i=0;i<CAMS.length;i++)if(CAMS[i].id===id){show(i);return i}return -1},theme:themeSet,close:winClose}
})();
