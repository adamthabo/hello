/* ---------- the cameras: a layer of the Earth (12-wind.js). They play only where the page is served from the owner's own host
   (HOSTED): a Claude artifact may not show any outside video or picture, so there each camera is a tile on the Earth that opens its
   stream on YouTube (14 Nov, night: "On the earth there should be videos, that's the best part!!!": on the site each is the stream's own
   picture where it is, renewed every five minutes, and plays in a window over the Earth when tapped). Asked for on 10 Nov ("def give me live video feeds from interesting places"); on 12 Nov he
   chose every camera playing, better places and many more of them, browsable by theme; on 13 Nov "Put them all on the same globe as
   satellites and make that just a layer", and for a camera tapped, "Window over the globe".
   So each camera of the theme is a ring on the Earth (bright when it is known to be on the air); a tap on one opens a window in the
   corner of the screen where it plays, and the Earth turns to it. A swipe across the window goes to the next camera east or west, a
   tap on it makes it bigger (or smaller again), its cross closes it. The row of kinds (shown while a camera is open): all, animals, volcanoes,
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
    on=false,camP=[],tmp=[0,0,0],seq=0,big=false,win={x:0,y:0,w:0,h:0},fly=null,nextWant=false;
  function $e(id){return document.getElementById(id)}
  function valid(c){return c&&typeof c.id==='string'&&/^[a-z0-9\-]{1,24}$/i.test(c.id)&&typeof c.name==='string'&&isFinite(+c.lat)&&isFinite(+c.lon)&&(c.kind==='yt'||c.kind==='img')}
  function word(v,n){return String(v===undefined||v===null?'':v).replace(/[^0-9A-Za-zÀ-ÿ .,:;'()\/&°\-]/g,'').slice(0,n||60)}
  /* where a camera can be watched on YouTube (the list the page carries says): only YouTube's or NOAA's own pages */
  var YTL={};if(typeof CAMLIST!=='undefined')CAMLIST.cams.forEach(function(c){if(/^https:\/\/www\.(youtube\.com|star\.nesdis\.noaa\.gov)\/[\w\/\-.?=&%@]*$/.test(c.yt||''))YTL[c.id]=c.yt});
  function camsFrom(list,themes){
    CAMS=list.filter(valid).slice(0,140).map(function(c){return {id:c.id,t:/^[a-z]{2,8}$/.test(c.t||'')?c.t:'',name:word(c.name,44),place:word(c.place,60),lat:clamp(+c.lat,-90,90),lon:AS.n180(+c.lon),kind:c.kind,
      v:Array.isArray(c.v)?c.v.filter(function(x){return /^[\w\-]{11}$/.test(x)}):[],img:/^[a-z0-9\-]{1,24}$/.test(c.img||'')?c.img:'',moving:c.moving==='iss',best:c.best==='day'||c.best==='night'?c.best:'any',
      by:word(c.by,60),every:clamp(+c.every||600,60,3600),yt:YTL[c.id]||''}});
    CAMS.sort(function(a,b){return a.lon-b.lon});
    THEMES=(Array.isArray(themes)?themes:[]).filter(function(x){return Array.isArray(x)&&/^[a-z]{2,8}$/.test(x[0])}).map(function(x){return [x[0],word(x[1],24)]})}
  function camsLoad(){
    if(asked)return;asked=true;
    /* the list the page carries, at once (the artifact has nothing else); then, on the site, the Worker's own */
    if(typeof CAMLIST!=='undefined'&&!CAMS.length){camsFrom(CAMLIST.cams,CAMLIST.themes);themesBuild();if(on)primeTheme()}
    if(!HOSTED)return;
    try{fetch('/api/cams').then(function(r){return r.ok?r.json():null}).then(function(d){
      if(!d||!Array.isArray(d.cams))return;var was=CAMS[cur]?CAMS[cur].id:'';camsFrom(d.cams,d.themes);if(was)cur=CAMS.findIndex(function(c){return c.id===was});
      themesBuild();if(on)primeTheme();if(nextWant){nextWant=false;step(1)}}).catch(function(){asked=false})}catch(e){asked=false}}
  /* the Sun's height (degrees) at a place now */
  function sunAt(la,lo){if(!sunI)return 0;var v=AS.llv(la,lo,tmp);return Math.asin(clamp(v[0]*sunV[0]+v[1]*sunV[1]+v[2]*sunV[2],-1,1))/AS.D}
  function camLL(c){if(c.moving&&issNow)return [issNow.lat,issNow.lon];return [c.lat,c.lon]}
  function inTheme(c){return TH==='all'||c.t===TH}
  /* a camera can be shown unless it was found off the air or not playing here in the last ten minutes, or it is a stream and
     YouTube's player cannot load here */
  function usable(c){var s=ST[c.id];return !(bad[c.id]&&FT-bad[c.id]<600000)&&!(s&&s.live===false&&FT-s.t<600000)&&!(c.kind==='yt'&&ytFail)}
  function onAir(c){if(!HOSTED)return false;var s=ST[c.id];return c.kind==='img'||!!(s&&s.id&&FT-s.t<900000&&!(bad[c.id]&&FT-bad[c.id]<600000))}
  /* which cameras are on the air: asked of the Worker eight at a time, the theme's first, the ones beside the camera shown before them */
  function ask(ids,front){if(!HOSTED)return;ids.forEach(function(id){var k=waitQ.indexOf(id);if(k>=0)waitQ.splice(k,1);var s=ST[id];if(s&&FT-s.t<(s.id?600000:300000))return;if(front)waitQ.unshift(id);else waitQ.push(id)});pump()}
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
    ytLink(c.kind==='img'?c.yt:'');
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
    ytId=id;stat='connecting';statT=FT;if(img)img.hidden=true;ytLink('https://www.youtube.com/watch?v='+id);
    try{if(player&&player.loadVideoById){player.loadVideoById(id);player.mute();return}
      player=new window.YT.Player('vidp',{host:'https://www.youtube-nocookie.com',videoId:id,width:'100%',height:'100%',
        playerVars:{autoplay:1,mute:1,playsinline:1,controls:0,disablekb:1,fs:0,iv_load_policy:3,rel:0,modestbranding:1,cc_load_policy:0,origin:location.origin},
        events:{onReady:function(e){try{e.target.mute();if(on&&cur>=0)e.target.playVideo();else e.target.pauseVideo()}catch(x){}},
          onStateChange:function(e){if(e.data===1){if(stat!=='live')arrive();stat='live';liveT=FT;fade(true);el&&el.classList.remove('tap')}
            else if(e.data===0&&on&&cur>=0){var c=CAMS[cur];if(c)bad[c.id]=FT;step(1)}},
          onError:function(){var c=CAMS[cur];if(c){bad[c.id]=FT;if(ST[c.id])ST[c.id].id=''}stat='off';statT=FT}}})}catch(e){ytFail=true}}
  function arrive(){if(!reduce)tone('bowl',pent(2,52),.3,0)}
  /* the window's own way out to YouTube (or to NOAA's page of the picture): should the player not play on this phone, the stream still can */
  function ytLink(u){var a=$e('vY');if(!a)return;if(u){a.href=u;a.textContent=/youtube\.com/.test(u)?'youtube':'noaa';a.hidden=false}else a.hidden=true}
  /* ---- the window: in the corner of the stage above the Earth's row, sixteen by nine; tapped, across the top of the stage ---- */
  /* (14 Nov: the kinds of camera shown only while a camera is open: they choose which cameras west and east go through, and the row
     took room from the Earth the rest of the time) */
  function thRow(v){var r=$e('themes');if(!r||r.hidden===!v)return;r.hidden=!v;try{layout();WIND.resize()}catch(e){}}
  function winOpen(){if(!el)return;el.hidden=false;document.body.classList.add('camw');var b=$e('vidc');if(b)b.hidden=false;ctlWire();thRow(true)}
  function winClose(){cur=-1;seq++;stat='';fade(false);try{if(player)player.pauseVideo()}catch(e){}if(el){el.hidden=true;el.classList.remove('tap')}document.body.classList.remove('camw');big=false;var b=$e('vidc');if(b)b.hidden=true;thRow(false)}
  /* the window (14 Nov): as wide as the stage on a phone, sixteen by nine (YouTube's player will not play smaller than 200 pixels), at the
     foot of the stage with its three buttons above it; on a wide screen in the corner. A tap on it now reaches the player itself */
  function winGeo(){var w,h,wide=STG.w>=640;if(wide){w=clamp(STG.w*.4,356,640);h=w*9/16;win.x=STG.x1-w-12;win.y=STG.y1-h-12}else{w=Math.max(200,STG.w-16);h=Math.max(200*9/16,w*9/16);if(h<200&&STG.h>320)h=Math.min(200,STG.h*.45);win.x=STG.x0+(STG.w-w)/2;win.y=STG.y1-h-8}
    win.w=w;win.h=h;place()}
  var ctlW=false;function ctlWire(){if(ctlW)return;var a=$e('vW'),b=$e('vE'),x=$e('vX');if(!a||!b||!x)return;ctlW=true;
    a.addEventListener('click',function(){step(-1);hit('tok',.2,0)});b.addEventListener('click',function(){step(1);hit('tok',.2,0)});x.addEventListener('click',function(){winClose();hit('tok',.25,0)})}
  function place(){if(!box)return;var c=CAMS[cur],x=win.x,y=win.y,w=win.w,h=win.h;
    var cb=$e('vidc');if(cb&&!cb.hidden){cb.style.width=Math.round(w)+'px';cb.style.transform='translate('+Math.round(x)+'px,'+Math.round(y-40)+'px)'}
    if(c&&c.kind==='img'){var d=Math.min(w,h);x+=(w-d)/2;w=h=d}
    /* (the size only when it changes: resizing the player every frame would make it lay itself out every frame) */
    var W2=Math.round(w),H2=Math.round(h);if(W2!==box._w||H2!==box._h){box._w=W2;box._h=H2;box.style.width=W2+'px';box.style.height=H2+'px'}box.style.transform='translate('+Math.round(x)+'px,'+Math.round(y)+'px)'}
  function inWin(x,y){return cur>=0&&x>=win.x&&x<=win.x+win.w&&y>=win.y&&y<=win.y+win.h}
  function onX(x,y){return cur>=0&&x>=win.x+win.w-34&&y<=win.y+34}
  /* a finger on the window: across it, the next camera east or west; a tap, bigger or smaller; on its cross, closed */
  function winUp(p){if(p.ghost||p.multi)return;var dx=p.x-p.x0,dy=p.y-p.y0,ax=Math.abs(dx),ay=Math.abs(dy),tap=held(p)<600&&p.moved<14;
    if(tap){if(onX(p.x0,p.y0)){winClose();hit('tok',.25,0);return}big=!big;winGeo();hit('tok',.2,0);return}
    if((ax>50&&ax>ay*1.2)||(Math.abs(p.vx||0)>600&&ax>24&&ax>ay))step(dx<0?1:-1)}
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
  /* ---- the layer: on whenever the Earth is open on the site; it reads the cameras, the Earth's turn and taps from there ---- */
  function layerOn(v){
    on=!!v;el=$e('vid');box=$e('vidbox');img=$e('vidi');var r=$e('themes');
    if(on){camsLoad();themesBuild();primeTheme()}else{winClose();camCardOff();if(r)r.hidden=true}}
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
  /* ---- the cameras on the Earth. 14 Nov, night ("On the earth there should be videos, that's the best part!!!"): each was a small
     picture on a stem. 15 Nov: "Change their icons on the globe": each is now a lens of thin light on a stem over where it is, with the
     sign of what it shows drawn in it (a paw for animals, a volcano, a rocket or the whole Earth, a skyline, waves, the moon, mountains,
     a plane), in its kind's colour, bigger the closer the Earth comes; on the site a red mark and a ring pulsing at its foot on those on
     the air. Where they crowd, the one open, those on the air and those facing squarely are lenses, the rest small rings; when few are
     shown, or the Earth is close, each has its place's name ---- */
  var TL=[],DOTS=[],CC=-1,
    THC={wild:'#ffb347',fire:'#ff6a3d',space:'#b46bff',city:'#3ef0ff',sea:'#4aa8ff',sky:'#c6ff6b',land:'#7dffb2',move:'#effcff'};
  function rgba(h,a){var n=parseInt(h.slice(1),16);return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a.toFixed(3)+')'}
  /* the sign of a camera's kind, drawn in thin light about (x, y), s across */
  function sign(c,cm,x,y,s,col){c.save();c.translate(x,y);c.strokeStyle=col;c.fillStyle=col;c.lineWidth=Math.max(1,s*.13);c.lineJoin='round';c.lineCap='round';c.beginPath();
    var t=cm.t;
    if(cm.kind==='img'){c.arc(0,0,.62*s,0,TAU);c.moveTo(0,-.62*s);c.quadraticCurveTo(-.5*s,0,0,.62*s);c.moveTo(-.6*s,-.12*s);c.lineTo(.6*s,-.12*s);c.stroke()}
    else if(t==='wild'){c.ellipse(0,.26*s,.36*s,.28*s,0,0,TAU);c.fill();[[-.44,-.16],[-.16,-.46],[.16,-.46],[.44,-.16]].forEach(function(q){c.beginPath();c.arc(q[0]*s,q[1]*s,.14*s,0,TAU);c.fill()})}
    else if(t==='fire'){c.moveTo(-.8*s,.55*s);c.lineTo(-.24*s,-.22*s);c.lineTo(.24*s,-.22*s);c.lineTo(.8*s,.55*s);c.stroke();c.beginPath();c.arc(0,-.52*s,.12*s,0,TAU);c.arc(.2*s,-.75*s,.09*s,0,TAU);c.fill()}
    else if(t==='space'){c.moveTo(0,-.82*s);c.lineTo(.27*s,-.22*s);c.lineTo(.27*s,.42*s);c.lineTo(-.27*s,.42*s);c.lineTo(-.27*s,-.22*s);c.closePath();c.moveTo(-.27*s,.12*s);c.lineTo(-.55*s,.56*s);c.lineTo(-.27*s,.42*s);
      c.moveTo(.27*s,.12*s);c.lineTo(.55*s,.56*s);c.lineTo(.27*s,.42*s);c.stroke();c.beginPath();c.arc(0,.7*s,.1*s,0,TAU);c.fill()}
    else if(t==='city'){c.rect(-.74*s,-.08*s,.4*s,.62*s);c.rect(-.22*s,-.66*s,.44*s,1.2*s);c.rect(.34*s,-.3*s,.4*s,.84*s);c.stroke()}
    else if(t==='sea'){[-.2,.28].forEach(function(o){c.moveTo(-.8*s,o*s);for(var k=1;k<=12;k++){var u=k/12;c.lineTo((-.8+1.6*u)*s,(o+.14*Math.sin(u*TAU*1.5))*s)}});c.stroke()}
    else if(t==='sky'){var R=.56*s,b=.42*s,hh=Math.sqrt(R*R-b*b/4),ox=-.16*s;c.arc(ox,0,R,Math.atan2(-hh,b/2),Math.atan2(hh,b/2),true);c.arc(ox+b,0,R,Math.atan2(hh,-b/2),Math.atan2(-hh,-b/2),false);c.closePath();c.fill();
      c.lineWidth=Math.max(1,s*.1);c.beginPath();c.moveTo(.58*s,-.78*s);c.lineTo(.58*s,-.34*s);c.moveTo(.36*s,-.56*s);c.lineTo(.8*s,-.56*s);c.stroke()}
    else if(t==='land'){c.moveTo(-.86*s,.5*s);c.lineTo(-.32*s,-.3*s);c.lineTo(-.02*s,.08*s);c.lineTo(.3*s,-.55*s);c.lineTo(.86*s,.5*s);c.stroke()}
    /* (the things that move: a train, a ship, else a plane, by the camera's own words) */
    else if(/train|rail|station|metro/i.test(cm.name+' '+cm.place)){c.moveTo(-.46*s,.5*s);c.lineTo(-.46*s,-.5*s);c.quadraticCurveTo(-.46*s,-.74*s,0,-.74*s);c.quadraticCurveTo(.46*s,-.74*s,.46*s,-.5*s);c.lineTo(.46*s,.5*s);c.closePath();
      c.moveTo(-.46*s,-.1*s);c.lineTo(.46*s,-.1*s);c.moveTo(-.3*s,.82*s);c.lineTo(-.2*s,.5*s);c.moveTo(.3*s,.82*s);c.lineTo(.2*s,.5*s);c.stroke();c.beginPath();c.arc(-.22*s,.24*s,.08*s,0,TAU);c.arc(.22*s,.24*s,.08*s,0,TAU);c.fill()}
    else if(/ship|port|lock|canal|harbou?r|ferry|bridge|boat|bay/i.test(cm.name+' '+cm.place)){c.moveTo(-.8*s,.2*s);c.lineTo(.8*s,.2*s);c.lineTo(.5*s,.6*s);c.lineTo(-.5*s,.6*s);c.closePath();
      c.moveTo(-.1*s,.2*s);c.lineTo(-.1*s,-.8*s);c.lineTo(.5*s,.05*s);c.lineTo(-.1*s,.05*s);c.stroke()}
    else{c.moveTo(0,-.8*s);c.lineTo(0,.74*s);c.moveTo(-.8*s,.08*s);c.lineTo(0,-.2*s);c.lineTo(.8*s,.08*s);c.moveTo(-.3*s,.72*s);c.lineTo(0,.56*s);c.lineTo(.3*s,.72*s);c.stroke()}
    c.restore()}
  /* a place's name, short: before its first comma, cut at a word to sixteen letters */
  function short(p){var x=String(p||'').split(',')[0].trim();if(x.length<=16)return x;var k=x.lastIndexOf(' ',16);return k>5?x.slice(0,k):x.slice(0,15)+'.'}
  function tiles(t,g){
    var c=OV,i,k,q,zf=clamp(Math.sqrt(g.R/160),.85,2.4),r=Math.round(clamp(9*zf,9,17)),h=Math.round(r*1.7),ord=[];TL.length=0;DOTS.length=0;
    for(i=0;i<camP.length;i++){q=camP[i];if(!q||q[2]<=.16||!(inTheme(CAMS[i])||i===cur))continue;ord.push(i)}
    ord.sort(function(a,b){return ((b===cur)-(a===cur))||(onAir(CAMS[b])-onAir(CAMS[a]))||(camP[b][2]-camP[a][2])});
    for(k=0;k<ord.length;k++){i=ord[k];q=camP[i];var x=q[0],y=q[1]-h-r,free=TL.length<14;
      for(var j=0;j<TL.length&&free;j++){var o=TL[j],dx=x-o.x,dy=y-o.y;if(dx*dx+dy*dy<(2*r+4)*(2*r+4))free=false}
      if(free)TL.push({i:i,x:x,y:y,r:r,a:clamp((q[2]-.16)*4,0,1)});else DOTS.push(i)}
    var pulse=(t*.00065)%1,names=TL.length<=6||g.R>380;
    /* the names: right of a lens, else left of it, never over another lens or name, nor under the words at the top */
    if(names){var box=TL.map(function(T){return [T.x-T.r-3,T.y-T.r-3,T.x+T.r+3,T.y+T.r+3]});c.font='500 9px "JetBrains Mono",ui-monospace,monospace';
      TL.forEach(function(T){T.lab=null;var cm=CAMS[T.i];if(!cm.place||T.y-6<STG.y0+4)return;var nm=short(cm.place).toUpperCase(),w=c.measureText(nm).width;
        [[T.x+T.r+5,0],[T.x-T.r-5-w,1]].some(function(o){var b=[o[0]-2,T.y-7,o[0]+w+2,T.y+7];if(b[0]<4||b[2]>VW-4)return false;
          for(var q=0;q<box.length;q++){var z=box[q];if(b[0]<z[2]&&b[2]>z[0]&&b[1]<z[3]&&b[3]>z[1])return false}box.push(b);T.lab={x:o[0],nm:nm};return true})})}
    for(k=0;k<DOTS.length;k++){i=DOTS[k];q=camP[i];var al=clamp((q[2]-.16)*4,0,1),cl=onAir(CAMS[i])?'#ff5a5a':THC[CAMS[i].t]||'#eaf9ff';
      c.strokeStyle='rgba(1,4,10,.5)';c.lineWidth=2.6;c.beginPath();c.arc(q[0],q[1],3.2,0,TAU);c.stroke();
      c.strokeStyle=rgba(cl,.85*al);c.lineWidth=1.1;c.beginPath();c.arc(q[0],q[1],3.2,0,TAU);c.stroke()}
    TL.sort(function(a,b){return camP[a.i][2]-camP[b.i][2]});
    for(k=0;k<TL.length;k++){var T=TL[k],cm=CAMS[T.i],me=T.i===cur,air=onAir(cm),col=THC[cm.t]||'#eaf9ff';q=camP[T.i];c.globalAlpha=T.a;
      /* its foot: a point, and on the air a ring that keeps going out from it */
      if(air&&!reduce){c.strokeStyle=rgba('#ff4848',.55*(1-pulse));c.lineWidth=1.2;c.beginPath();c.arc(q[0],q[1],2+pulse*r*.9,0,TAU);c.stroke()}
      c.fillStyle=air?'rgba(255,72,72,.95)':rgba(col,.9);c.beginPath();c.arc(q[0],q[1],1.8,0,TAU);c.fill();
      c.strokeStyle=rgba(col,.55);c.lineWidth=1;c.beginPath();c.moveTo(q[0],q[1]-2);c.lineTo(T.x,T.y+T.r);c.stroke();
      /* the lens: a dark glass, a soft glow and a thin ring of its colour, white while it is the one open */
      c.fillStyle='rgba(1,4,10,.66)';c.beginPath();c.arc(T.x,T.y,T.r,0,TAU);c.fill();
      c.strokeStyle=rgba(me?'#eaf9ff':col,.2);c.lineWidth=4.5;c.beginPath();c.arc(T.x,T.y,T.r,0,TAU);c.stroke();
      c.strokeStyle=me?'rgba(234,249,255,.98)':rgba(col,.95);c.lineWidth=me?2:1.3;c.beginPath();c.arc(T.x,T.y,T.r,0,TAU);c.stroke();
      sign(c,cm,T.x,T.y,T.r*.56,me?'#eaf9ff':col);
      if(air){c.fillStyle='rgba(255,60,60,1)';c.beginPath();c.arc(T.x+T.r*.72,T.y-T.r*.72,2.6,0,TAU);c.fill()}
      if(names&&T.lab){c.font='500 9px "JetBrains Mono",ui-monospace,monospace';c.textBaseline='middle';
        c.lineWidth=3;c.strokeStyle='rgba(1,4,10,.75)';c.strokeText(T.lab.nm,T.lab.x,T.y);c.fillStyle='rgba(234,249,255,.82)';c.fillText(T.lab.nm,T.lab.x,T.y)}
      c.globalAlpha=1}}
  /* the camera under a finger: a lens (or its stem), else the nearest ring within reach */
  function tileAt(x,y){var k,bi=-1,bd=1e9;for(k=0;k<TL.length;k++){var T=TL[k],dx=x-T.x,dy=y-T.y,d=dx*dx+dy*dy,R=T.r+8;if(d<=R*R&&d<bd){bd=d;bi=T.i}}if(bi>=0)return bi;
    for(k=0;k<TL.length;k++){var T2=TL[k],q=camP[T2.i];if(Math.abs(x-T2.x)<10&&y>T2.y&&y<q[1]+8)return T2.i}
    bd=22*22;for(k=0;k<DOTS.length;k++){var q2=camP[DOTS[k]],d2=(q2[0]-x)*(q2[0]-x)+(q2[1]-y)*(q2[1]-y);if(d2<bd){bd=d2;bi=DOTS[k]}}return bi}
  /* in the artifact a camera tapped opens a card: what and where it is, and its stream on YouTube (a page here may not play it) */
  function themeOf(c){for(var i=0;i<THEMES.length;i++)if(THEMES[i][0]===c.t)return THEMES[i][1];return ''}
  function camCard(i){var c=CAMS[i],el=$e('card');if(!c||!el)return;CC=i;el.dataset.k='cam';while(el.firstChild)el.removeChild(el.firstChild);
    function add(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;el.appendChild(e);return e}
    var x=add('button','cx','×');x.type='button';x.setAttribute('aria-label','Put the card away');x.addEventListener('click',function(){camCardOff()});
    var ll=camLL(c),th=themeOf(c);add('p','cn',c.name);add('p','ck',[c.place,th,c.kind==='yt'?hour(ll[0],ll[1]):''].filter(Boolean).join(' · '));
    if(c.yt){var a=add('a','cy',c.kind==='img'?'see it on NOAA\'s page':'watch it live on YouTube');a.href=c.yt;a.target='_blank';a.rel='noopener noreferrer'}
    add('p','cs',c.kind==='img'?'NOAA · a new picture every 10 minutes':'a live stream: it cannot play inside this page, so it opens on YouTube');
    el.hidden=false;if(fly)fly(ll[0],ll[1]);try{WIND.resize()}catch(e){}}
  function camCardOff(){if(CC<0)return;CC=-1;var el=$e('card');if(el&&el.dataset.k==='cam'){el.hidden=true;el.dataset.k=''}try{WIND.resize()}catch(e){}}
  function draw(t,g){
    var c=OV;tiles(t,g);
    var cm2=CAMS[cur];if(!cm2)return;
    var mq=camP[cur];if(mq&&mq[2]>.05){c.setLineDash([2,5]);c.strokeStyle='rgba(62,240,255,.45)';c.lineWidth=1;c.beginPath();c.moveTo(mq[0],mq[1]);c.lineTo(win.x+win.w/2,win.y);c.stroke();c.setLineDash([])}
    /* the window's frame, its cross, and while a stream is found a slow ring in its middle */
    c.strokeStyle='rgba(234,249,255,.55)';c.lineWidth=1;c.strokeRect(win.x-.5,win.y-.5,win.w+1,win.h+1);
    if(stat!=='live'){var u=(t*.0006)%1;c.strokeStyle='rgba(234,249,255,'+(.4*(1-u)).toFixed(3)+')';c.beginPath();c.arc(win.x+win.w/2,win.y+win.h/2,6+u*Math.min(28,win.h*.3),0,TAU);c.stroke()}}
  function hud(){
    var c=CAMS[cur];if(!c){if(!on)return '';if(!CAMS.length)return asked?'finding the cameras':'';var ac=airCount();
      /* (one line of a phone: "cameras: 7 of 86 live · tap a ring to watch") */
      return (TH==='all'?(ac[0]?'cameras: '+ac[0]+' of '+ac[1]+' live':ac[1]+' cameras'):themeName()+': '+(ac[0]?ac[0]+' of '+ac[1]+' live':ac[1]+' cameras'))+(HOSTED?' · tap one to watch':' · tap one for YouTube')}
    var ll=camLL(c),la=ll[0],lo=ll[1],l1=c.name+(c.place?' · '+c.place:''),l2='',l3='',w=null,s=ST[c.id];
    if(c.moving&&issNow){l1=c.name;l2='over '+Math.abs(la).toFixed(1)+'°'+(la>=0?'N':'S')+' '+Math.abs(lo).toFixed(1)+'°'+(lo>=0?'E':'W')+' · '+Math.round(issNow.alt)+' km up · '+Math.round(issNow.kmh).toLocaleString('en-US')+' km/h'}
    else if(c.kind==='img')l2=imgAt?'picture of '+stampUTC(imgAt):'';
    else{l2=hour(la,lo);try{w=WIND.windAt(la,lo)}catch(e){w=null}if(w&&w.kmh>=1)l2+=' · wind '+Math.round(w.kmh)+' km/h'}
    var by=s&&s.ch?s.ch:c.by,st=stat==='live'?(c.kind==='img'?c.by:'live'+(by?' · '+by:'')):stat==='off'?'not on the air now':'finding the stream';
    if(over&&c.kind!=='img')l3=over.n.toLocaleString('en-US')+' satellites above'+(over.iss>0&&over.iss<2600&&!c.moving?' · the space station '+Math.round(over.iss).toLocaleString('en-US')+' km away':'')+' · '+st;
    else l3=st;
    return l1+'\n'+l2+'\n'+l3+(stat==='connecting'&&el&&el.classList.contains('tap')?'\ntap the picture to start it':'')}
  document.addEventListener('visibilitychange',function(){try{if(!player)return;if(document.hidden)player.pauseVideo();else if(on&&cur>=0)player.playVideo()}catch(e){}});
  return {layer:{on:layerOn,tick:tick,draw:draw,hud:hud,hit:inWin,up:winUp,resize:function(){if(cur>=0)winGeo()},
      /* a tap on the Earth: a camera's picture (or ring) under it opens its window, or in the artifact its card (true) */
      near:function(x,y){return on?tileAt(x,y):-1},
      pick:function(x,y){if(!on)return false;var i=tileAt(x,y);if(i<0)return false;if(HOSTED)show(i);else camCard(i);hit('tok',.25,0);return true},
      cardOff:camCardOff,cardOn:function(){return CC>=0},
      /* where a camera worth seeing is: one on the air (on the site), or one where it is the hour it looks best */
      airSpot:function(){var L=CAMS.filter(function(c){if(!inTheme(c))return false;var ll=camLL(c),e=sunAt(ll[0],ll[1]);return HOSTED?onAir(c):c.best==='night'?e<-6:c.best==='day'?e>5:true});
        if(!L.length)L=CAMS.filter(inTheme);var c=L[Math.floor(Math.random()*L.length)];return c?camLL(c):null},
      open:function(){return cur>=0},close:winClose,flyTo:function(f){fly=f},
      /* (15 Nov: "put the videos accessible right on the page") the videos button opens one at once: on the site the one on the air
         nearest the middle of the view plays in its window; in the artifact its card */
      openOne:function(){if(!on||!CAMS.length)return false;var best=-1,bs=-1e9;CAMS.forEach(function(c,i){if(!inTheme(c)||!usable(c))return;var q=camP[i],f=q?q[2]:-1;
          var sc=f+(HOSTED&&onAir(c)?2:0)+(c.kind==='img'?-.5:0)+Math.random()*.15;if(sc>bs){bs=sc;best=i}});
        if(best<0)return false;if(HOSTED)show(best);else camCard(best);return true},
      next:function(){if(!CAMS.length){nextWant=true;camsLoad();return}step(1)}},
    dbg:function(){var c=CAMS[cur];return {on:on,cams:CAMS.length,themes:THEMES.map(function(x){return x[0]}),th:TH,cur:cur,id:c?c.id:'',kind:c?c.kind:'',stat:stat,yt:ytId,ready:ytReady,fail:ytFail,bad:Object.keys(bad),
      air:airCount(),st:Object.keys(ST).length,win:{x:win.x,y:win.y,w:win.w,h:win.h,big:big},marks:camP.map(function(q){return q?[q[0],q[1],q[2]]:null}),ids:CAMS.map(function(c){return c.id}),
      onair:CAMS.filter(function(c){return onAir(c)}).map(function(c){return c.id}),over:over,iss:issNow,img:img&&!img.hidden,
      tiles:TL.map(function(T){return {id:CAMS[T.i].id,t:CAMS[T.i].t,x:T.x-T.r,y:T.y-T.r,r:T.r,w:2*T.r,h:2*T.r,lab:T.lab?T.lab.nm:""}}),rings:DOTS.length,card:CC>=0?CAMS[CC].id:'',link:CC>=0?CAMS[CC].yt:''}},
    go:function(id){for(var i=0;i<CAMS.length;i++)if(CAMS[i].id===id){show(i);return i}return -1},theme:themeSet,close:winClose}
})();
