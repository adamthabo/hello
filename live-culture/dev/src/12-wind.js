/* ---------- THE EARTH: the whole planet as it is now, on one globe that turns under a finger, with layers to switch on and off.
   (13 Nov: "Put them all on the same globe as satellites and make that just a layer": the satellites (13-orbit.js) and the live
   cameras (14-live.js) are layers of it.) On it, all real and all measured: the satellites, each where it is, flying (sixty times
   their speed, so the swarm can be seen moving; one tapped brings the present back); the war zones and the places cut off
   (12-zones.js); the aurora where NOAA expects it at this hour (from the solar wind read a million miles upstream); the lightning of
   the last half hour as the GOES weather satellites saw it, replayed over sixteen bars, each flash a flash and a soft tick; the
   strongest fires burning in the last day, as NASA's instruments saw their heat from orbit (FIRMS), each an ember; the tropical
   cyclones turning now, each with its name where its eye is; the clouds and the rain; and on the site NOAA's own picture of now and
   its model's fields for this hour.
   (Until 15 Nov the wind of the whole Earth was drawn here too, as smoke carried by NOAA's GFS wind: "forget wind", the owner said
   that evening. The wind is still read where a place is tapped, and it still carries the clouds.)
   One finger turns the globe, a pinch comes closer, and a tap reads what is there: a camera first, then a satellite, then a storm
   or a fire, then a war or a place cut off, then the place itself. Left alone, it turns slowly.
   On 14 Nov (15:24) a list of layers opened from one button went ("I don't understand the layers ... Make that go away so you can
   see the whole globe"); that night he asked for them back, done better: "On the earth there should be videos, that's the best
   part!!! And be able to take on and off layers." So each layer is its own button in a row under the globe, and each shows itself
   at once (see "the layers" below). ---------- */
var WIND=(function(){
  var gen=-1,windT=null,windV=-1,aurT=null,aurV=-1,skV=-1,
    g={cx:0,cy:0,R:100,E:[0,0,0],N:[0,0,0],C:[0,0,0]},lat0=16,lon0=clamp(-(new Date().getTimezoneOffset())/4,-180,180),zoom=1,idle=0,vlon=0,vlat=0,
    sunV=[0,0,0],moonV=[0,0,0],moonI=null,sunI=null,lastT=0,SK=[],byStep=[],flashes=[],STEPS=256,tmp=[0,0,0],probe=null,turned=0,
    FR=[],frV=-1,ST=[],stV=-1,
    ftAt=0,GT={R:0,cy:0,on:0},GR=0,GC=0,dataH=-1,entT=0,HUDB=0,HLH=0,FOC=null,FLY=null,camOn=false,footH=0;
  /* the pictures made here for the chip (the wind, for the clouds to drift on; the aurora) are made again if the chip is lost */
  function glSetup(){if(!GLX.ok)return;gen=GLX.gen;windT=aurT=null;windV=aurV=-1}
  /* a grid of numbers, one per degree from the north pole down and from 0 E round, as a picture the chip can read: 512 x 256,
     with 180 W at its left edge like the photographs of the Earth */
  function gridTex(grid,ch,old){
    var gl=GLX.gl,W=512,Hh=256,px=new Uint8Array(W*Hh*4),x,y,c;
    for(y=0;y<Hh;y++){var fy=y/(Hh-1)*180,j0=Math.min(179,Math.floor(fy)),ty=fy-j0;
      for(x=0;x<W;x++){var fx=((x+.5)/W*360+180)%360,i0=Math.floor(fx)%360,i1=(i0+1)%360,tx=fx-Math.floor(fx),o=(y*W+x)*4;
        for(c=0;c<ch;c++){var a=grid[(j0*360+i0)*ch+c],b=grid[(j0*360+i1)*ch+c],d=grid[((j0+1)*360+i0)*ch+c],e=grid[((j0+1)*360+i1)*ch+c];px[o+c]=Math.round((a+(b-a)*tx)*(1-ty)+(d+(e-d)*tx)*ty)}
        px[o+3]=255}}
    var t=old||gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,W,Hh,0,gl.RGBA,gl.UNSIGNED_BYTE,px);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t}
  function feeds(){
    if(!GLX.ok||gen!==GLX.gen)return;
    if(typeof WX!=='undefined'&&(LY.temp||LY.waves||LY.pres))wxBuild();wxStep();
    if(LIVE.wind&&windV!==LIVE.ver.wind){windV=LIVE.ver.wind;windT=gridTex(LIVE.wind.grid,2,windT)}
    if(LIVE.aurora&&aurV!==LIVE.ver.aurora){aurV=LIVE.ver.aurora;aurT=gridTex(LIVE.aurora.grid,1,aurT)}
    if(LIVE.strikes&&skV!==LIVE.ver.strikes){skV=LIVE.ver.strikes;SK=[];byStep=[];var L=LIVE.strikes.list,sp=LIVE.strikes.span,i;for(i=0;i<STEPS;i++)byStep.push(null);
      for(i=0;i<L.length;i++){var s={v:AS.llv(L[i].lat,L[i].lon),st:clamp(Math.floor((1-L[i].age/sp)*STEPS),0,STEPS-1),p:[0,0,0]};SK.push(s);(byStep[s.st]=byStep[s.st]||[]).push(s)}}
    if(LIVE.fires&&frV!==LIVE.ver.fires){frV=LIVE.ver.fires;FR=LIVE.fires.list.map(function(f){return {f:f,v:AS.llv(f.lat,f.lon),p:[0,0,0],ph:Math.random()*TAU,s:clamp(Math.sqrt(f.frp/150),1,3.4)}})}
    if(LIVE.storms&&stV!==LIVE.ver.storms){stV=LIVE.ver.storms;ST=LIVE.storms.list.map(function(s){return {s:s,v:AS.llv(s.lat,s.lon),p:[0,0,0]}})}
}
  /* the model's fields as one picture the chip can read, the Earth unrolled from 180 W: red the temperature (-40 to 45 degrees), green
     the waves (0 where there is no sea, then up to twelve metres), blue the isobars (drawn only once the pressure is switched on).
     Built a slice of rows a frame, so a phone does not stall the moment a field arrives */
  var wxT=null,wxV='',WXB=null;
  function wxBuild(){if(!GLX.ok)return;var k=WX.ver+':'+(LY.pres?1:0)+':'+GLX.gen;if(k===wxV)return;wxV=k;WXB={y:0,px:new Uint8Array(1024*512*4),iso:LY.pres&&WX.mslp?isobars(WX.mslp,1024,512):null}}
  function wxStep(){
    if(!WXB||!GLX.ok)return;var gl=GLX.gl,W=1024,Hh=512,px=WXB.px,iso=WXB.iso,x,y,T=WX.t2m,Wv=WX.wave,y1=Math.min(Hh,WXB.y+64);
    for(y=WXB.y;y<y1;y++){var la=90-(y+.5)/Hh*180;for(x=0;x<W;x++){var lo=-180+(x+.5)/W*360,o=(y*W+x)*4,v;
      if(T){v=GRIB.at(T,la,lo);px[o]=isNaN(v)?0:clamp(Math.round((v-233.15)/85*255),0,255)}
      if(Wv){v=GRIB.at(Wv,la,lo);px[o+1]=isNaN(v)?0:clamp(Math.round(1+v/12*254),1,255)}
      px[o+2]=iso?iso[o+3]:0;px[o+3]=255}}
    WXB.y=y1;if(y1<Hh)return;WXB=null;
    var t=wxT||gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,W,Hh,0,gl.RGBA,gl.UNSIGNED_BYTE,px);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);wxT=t;dockSync()}
  /* the isobars: lines of equal pressure every 4 hPa (every 20th brighter), traced through the model's degree grid (marching squares)
     and drawn on a flat picture of the Earth */
  function isobars(Pm,W,Hh){var cv=document.createElement('canvas');cv.width=W;cv.height=Hh;var c=cv.getContext('2d'),G=[],i,j,lv;
    for(j=0;j<=180;j++){G.push([]);for(i=0;i<=360;i++)G[j].push(GRIB.at(Pm,90-j,-180+i)/100)}
    var mn=1e9,mx=-1e9;for(j=0;j<=180;j++)for(i=0;i<=360;i++){var q=G[j][i];if(q<mn)mn=q;if(q>mx)mx=q}
    c.lineCap='round';c.lineJoin='round';
    for(lv=Math.ceil(mn/4)*4;lv<=mx;lv+=4){var major=lv%20===0;c.strokeStyle='rgba(255,255,255,'+(major?1:.62)+')';c.lineWidth=major?1.5:1.05;c.beginPath();
      for(j=0;j<180;j++)for(i=0;i<360;i++){var a=G[j][i],b=G[j][i+1],d=G[j+1][i+1],e=G[j+1][i],k=(a>lv?8:0)|(b>lv?4:0)|(d>lv?2:0)|(e>lv?1:0);if(k===0||k===15)continue;
        var X=W/360,Y=Hh/180,x0=i*X,y0=j*Y,pt=[];
        if((a>lv)!==(b>lv))pt.push([x0+X*(lv-a)/(b-a),y0]);if((b>lv)!==(d>lv))pt.push([x0+X,y0+Y*(lv-b)/(d-b)]);if((d>lv)!==(e>lv))pt.push([x0+X-X*(lv-d)/(e-d),y0+Y]);if((e>lv)!==(a>lv))pt.push([x0,y0+Y-Y*(lv-e)/(a-e)]);
        if(pt.length>=2){c.moveTo(pt[0][0],pt[0][1]);c.lineTo(pt[1][0],pt[1][1])}if(pt.length===4){c.moveTo(pt[2][0],pt[2][1]);c.lineTo(pt[3][0],pt[3][1])}}
      c.stroke()}
    return c.getImageData(0,0,W,Hh).data}
  function geo(){var y0=STG.y0,y1=STG.y1,cd=(PCD&&PCD.on)||(camOn&&LIVEW.layer.cardOn())?$('card'):null;if(cd&&!cd.hidden){var ct=cd.getBoundingClientRect().top;if(ct>STG.y0+80&&ct<y1)y1=ct-6}
    /* (14 Nov, afternoon: "so you can see the whole globe") on a phone held upright the globe is kept whole under the words at the
       top; since 15 Nov (night) there are none until something is read, so the globe has the room, and when a reading comes it glides
       to its new place and size rather than jumping */
    if(VW<VH){var d=$('data');if(d&&!(probe&&probe.ghost)){var b=d.getBoundingClientRect();if(!HLH)HLH=parseFloat(getComputedStyle(d).lineHeight)||15.5;HUDB=b.top>0&&b.height>1?Math.round(b.bottom+8):0}
      if(HUDB)y0=Math.max(y0,Math.min(HUDB,y1-200))}
    var h=y1-y0;GT.R=Math.max(40,Math.min(STG.w,h-10)*.47);GT.cy=y0+h/2;if(!GT.on){GT.on=1;GR=GT.R;GC=GT.cy}
    g.R=GR*zoom;g.cx=STG.cx;g.cy=GC}
  function camSync(v){v=!!v;if(v===camOn)return;camOn=v;try{LIVEW.layer.on(v)}catch(e){}layout();geo()}
  function enter(){if(GLX.ok&&gen!==GLX.gen)glSetup();GLOBE.load();liveLoad();try{ZONES.load()}catch(e){}lyApply();dockSync(true);GT.on=0;entT=FT;dataH=-1;geo();idle=0;lastT=0;
    try{ORBIT.layer.on()}catch(e){}try{LIVEW.layer.flyTo(flyTo)}catch(e){}nowAt=0;zmSync(true);
    if(!zmW){zmW=1;$('zIn').addEventListener('click',function(){zoomBy(1.8)});$('zOut').addEventListener('click',function(){zoomBy(1/1.8)})}}
  function leave(){flashes.length=0;['lyd','lgd'].forEach(function(id){var e=$(id);if(e)e.hidden=true});zmSync(false);cardOff();try{ORBIT.layer.off()}catch(e){}camSync(false);if(typeof GEO!=='undefined')GEO.want=false}
  /* ---- what is happening now: each storm turning now, the space station, the biggest fire, where the lightning is thickest, where the
     aurora is strongest. (13 Nov to 14 Nov, a row of names under the globe; since the layers came back, a layer switched on turns the
     Earth to the most of it: the place comes close and is read, as a tap there would) ---- */
  var NOWL=[],nowAt=0,zmW=0,NOWI={storm:'<path d="M8 8m-1.6 0a1.6 1.6 0 1 0 3.2 0 1.6 1.6 0 1 0-3.2 0M8 2.2c-3.6 0-5.4 2.4-5.6 4.6M8 13.8c3.6 0 5.4-2.4 5.6-4.6M13.4 5.2C12.6 3.4 10.8 2.4 9 2.4M2.6 10.8c.8 1.8 2.6 2.8 4.4 2.8"/>',
    iss:'<path d="M2 6.2h3.6v3.6H2zM10.4 6.2H14v3.6h-3.6zM5.6 8h4.8M8 5.4v5.2"/>',fire:'<path d="M8 14c-2.8 0-4.4-1.8-4.4-4.2 0-2.6 2.2-3.8 2.4-6.8 1.6 1 2.2 2.4 2.2 3.6.6-.6.9-1.4.9-2.2 1.6 1.2 3.3 3 3.3 5.4 0 2.4-1.6 4.2-4.4 4.2z"/>',
    bolt:'<path d="M9.2 1.8L4.4 9h3.2l-1 5.2L11.6 7H8.4z"/>',aurora:'<path d="M1.8 11.6c2-4.4 4.2-6.6 6.2-6.6s4.2 2.2 6.2 6.6M3.6 12.8c1.4-3 2.9-4.4 4.4-4.4s3 1.4 4.4 4.4"/>'};
  function nowList(){var L=[],i,j;
    try{var s=ORBIT.iss(Date.now());if(s)L.push({k:'iss',n:'space station',lat:s.lat,lon:s.lon})}catch(e){}
    ST.forEach(function(k){var c=CLS[k.s.cls]||'cyclone',w=/hurricane/.test(c)?'hurricane':/typhoon/.test(c)?'typhoon':/depression/.test(c)?'depression':/storm/.test(c)?'storm':'cyclone';
      L.push({k:'storm',n:w+' '+String(k.s.name||'').replace(/^no\.\s*0*/i,'no. '),lat:k.s.lat,lon:k.s.lon,tg:k.s})});
    if(FR.length){var b=FR[0].f;FR.forEach(function(x){if(x.f.frp>b.frp)b=x.f});L.push({k:'fire',n:'biggest fire',lat:b.lat,lon:b.lon,tg:b})}
    /* the lightning: the flash with the most others within 300 km (a few hundred tried, against all) */
    if(SK.length>4){var c=Math.cos(300/6371),best=-1,bn=0,step=Math.max(1,Math.floor(SK.length/300));for(i=0;i<SK.length;i+=step){var n=0;for(j=0;j<SK.length;j++)if(GLOBE.dot(SK[i].v,SK[j].v)>c)n++;if(n>bn){bn=n;best=i}}
      if(best>=0){var v=SK[best].v;L.push({k:'bolt',n:'lightning',lat:Math.asin(clamp(v[2],-1,1))/AS.D,lon:Math.atan2(v[1],v[0])/AS.D})}}
    var A=LIVE.aurora;if(A&&A.max>=10){var mi=0,G=A.grid;for(i=1;i<G.length;i++)if(G[i]>G[mi])mi=i;L.push({k:'aurora',n:'aurora',lat:90-Math.floor(mi/360),lon:AS.n180(mi%360)})}
    return L}
  /* ---- the layers (14 Nov, night: "And be able to take on and off layers. The weather is pretty lame. Make it so much better!"; that
     afternoon a list of them opened from one button had been "in the way" and not understood). Each is its own button in a row under the
     globe, a picture and a word, lit while it shows, and each shows itself at once: one layer of colour at a time (the temperature or the
     waves, else the wind's speed) with its scale over the row; a point layer switched on turns the Earth to where it has most to show;
     the words at the top say for a moment what was switched. Kept on this device ---- */
  /* (15 Nov, 20:39: the wind went: "forget wind"; the war zones and the places cut off came, after the videos: "War zones and blacked
     out zones is good") */
  var LYS=[['vid','videos'],['war','war zones'],['dark','blackouts'],['orbit','satellites'],['sat','live view'],['storm','storms'],['fire','fires'],['bolt','lightning'],
      ['rain','rain'],['cld','clouds'],['temp','temperature'],['waves','waves'],['pres','pressure'],['aur','aurora']],
    LYI={vid:'<rect x="1.6" y="3.4" width="12.8" height="9.2" rx="2"/><path d="M6.6 5.9v4.2l3.6-2.1z"/>',
      sat:'<circle cx="7" cy="9.2" r="4.6"/><path d="M2.6 9.2h8.8M7 4.6c-2 2.6-2 6.6 0 9.2M7 4.6c2 2.6 2 6.6 0 9.2"/><rect x="11.4" y="1.6" width="3" height="3" rx=".6"/>',
      war:'<circle cx="8" cy="8" r="4.4"/><path d="M8 1.6v3.6M8 10.8v3.6M1.6 8h3.6M10.8 8h3.6"/>',
      dark:'<path d="M2.4 6.6a8.2 8.2 0 0 1 11.2 0M4.5 9a5.1 5.1 0 0 1 7 0M6.7 11.4a1.9 1.9 0 0 1 2.6 0M2.4 2.4l11.2 11.2"/>',temp:'<path d="M6.6 9.6V3.6a1.6 1.6 0 1 1 3.2 0v6a3.1 3.1 0 1 1-3.2 0z"/><path d="M8.2 7v4.6"/>',
      rain:'<path d="M4.6 9.2h7a2.6 2.6 0 0 0 .2-5.2 3.6 3.6 0 0 0-6.9-.5 2.9 2.9 0 0 0-.3 5.7M5.6 11.6l-.9 2.2M8.4 11.6l-.9 2.2M11.2 11.6l-.9 2.2"/>',
      cld:'<path d="M4.6 12.5h7a2.9 2.9 0 0 0 .2-5.8 4 4 0 0 0-7.6-.6 3.2 3.2 0 0 0 .4 6.4z"/>',
      waves:'<path d="M1.6 7.4c1.6-1.6 3.1-1.6 4.4 0s2.9 1.6 4.4 0 3.1-1.6 4.1 0M1.6 11.4c1.6-1.6 3.1-1.6 4.4 0s2.9 1.6 4.4 0 3.1-1.6 4.1 0"/>',
      pres:'<path d="M2.2 5.6c2.6-2.4 9-2.4 11.6 0M2.6 9.4c2.4-1.6 8.4-1.6 10.8 0M4.6 12.9c1.6-.7 5.2-.7 6.8 0"/>',
      bolt:NOWI.bolt,storm:NOWI.storm,fire:NOWI.fire,aur:NOWI.aurora,
      orbit:'<circle cx="8" cy="8" r="2.6"/><ellipse cx="8" cy="8" rx="6.6" ry="2.7" transform="rotate(-24 8 8)"/><circle cx="13.4" cy="4.9" r=".9"/>'},
    /* what each shows, in a line of a phone (with its name and "on:") */
    LYT={vid:HOSTED?'live cameras, tap one to watch':'live cameras, each opens on YouTube',sat:'the Earth from NOAA\'s satellites',temp:'blue cold, red hot',
      war:'the wars of 2026, brighter where more have died',dark:'no internet, no power, or blocked',
      rain:'the last half hour, from orbit',cld:'as the weather satellites see them',waves:'their height over the seas',pres:'lines every 4 hPa, H high, L low',bolt:'the flashes of the last half hour',
      storm:'the tropical storms turning now',fire:'the strongest of the last day',orbit:'sixty times their speed',aur:'where NOAA expects it now'},
    LYDEF={vid:1,war:1,dark:1,sat:1,temp:0,rain:1,cld:1,waves:0,pres:0,bolt:1,storm:1,fire:1,orbit:1,aur:1},LY={},lyAv='',lyMsg=null,dkAt=0,lyPing=null,zmOn=false,zmAt=0;
  (function(){var o=null;try{o=JSON.parse(localStorage.getItem('lc-earth-layers')||'null')}catch(e){}for(var k in LYDEF)LY[k]=o&&(o[k]===0||o[k]===1)?o[k]:LYDEF[k]})();
  /* (17 Nov, the fifth hourly run) the places cut off dim and brighten slowly on the globe, about six seconds a breath */
  function darkNow(t){return reduce?1:.74+.26*Math.sin(t*.00105)}
  /* how a storm looks by its strongest winds: its wheel's size, how fast it turns, its arms and its colour */
  var STC=['234,249,255','255,179,71','255,98,64'];
  function stLook(S){var kmh=S.kmh||60,cat=kmh>=178?2:kmh>=119?1:0;return {r:6.5+clamp((kmh-60)/40,0,4.5),sp:clamp(kmh/100,.6,2.6),arms:cat?3:2,col:STC[cat],cat:cat}}
  /* how much of a layer's moment of showing itself is left (1 as it is switched on, 0 two seconds later) */
  function pingK(k){return lyPing&&lyPing.k===k?Math.max(0,1-(FT-lyPing.t)/2000):0}
  function lySave(){try{localStorage.setItem('lc-earth-layers',JSON.stringify(LY))}catch(e){}}
  function lyName(k){for(var i=0;i<LYS.length;i++)if(LYS[i][0]===k)return LYS[i][1];return k}
  /* which there is something for: the live view and the model's fields only on the site, the clouds and the rain once their pictures came */
  function lyHas(k){var X=typeof WX!=='undefined'?WX:{};switch(k){case 'vid':return typeof LIVEW!=='undefined';case 'sat':return !!HOSTED;case 'war':case 'dark':return ZONES.has(k);
    case 'temp':return !!X.t2m;case 'rain':return GLOBE.hasRain();case 'cld':return GLOBE.hasCloud();case 'waves':return !!X.wave;case 'pres':return !!X.mslp;
    case 'bolt':return !!(LIVE.strikes&&LIVE.strikes.list.length);case 'storm':return ST.length>0;case 'fire':return FR.length>0;case 'orbit':return !!LIVE.sats;case 'aur':return !!LIVE.aurora}return false}
  function dockSync(force){var r=$('lyd');if(!r)return;var av=LYS.filter(function(x){return lyHas(x[0])}).map(function(x){return x[0]}).join(',');
    if(av!==lyAv||force||!r.firstChild){lyAv=av;r.innerHTML='';LYS.forEach(function(x){if(!lyHas(x[0]))return;var b=document.createElement('button');b.type='button';b.className='dk dk-'+x[0];b.id='ly_'+x[0];
      b.innerHTML='<svg viewBox="0 0 16 16" aria-hidden="true">'+LYI[x[0]]+'</svg><span></span>';b.lastChild.textContent=x[1];b.setAttribute('aria-label',x[1]+': '+LYT[x[0]]);
      b.addEventListener('click',function(){lyTap(x[0])});r.appendChild(b)})}
    [].forEach.call(r.childNodes,function(b){var on=!!LY[b.id.slice(3)];if(b.getAttribute('aria-pressed')!==(on?'true':'false'))b.setAttribute('aria-pressed',on?'true':'false')});
    var hid=!r.firstChild;if(r.hidden!==hid){r.hidden=hid;dockFit(true);layout();geo()}else dockFit(false);lgdSync()}
  /* (15 Nov, 23:20: "The list of buttons on the globe hardly work. Make everything work") every button on the screen: as many to a
     row as fit (none narrower than 58 px), the rows as even as they can be (13 on a phone: five, five and three), the words a size
     smaller where the buttons are narrow, the buttons a little lower when there are three rows or more */
  function dockFit(force){var r=$('lyd');if(!r||r.hidden)return;var n=r.childNodes.length;if(!n)return;var k0=n+','+VW+','+VH;if(!force&&r._k0===k0)return;r._k0=k0;var f=$('foot'),cs=getComputedStyle(f),
      w=Math.floor(f.clientWidth-(parseFloat(cs.paddingLeft)||0)-(parseFloat(cs.paddingRight)||0)),gap=5,
      mc=Math.max(1,Math.floor((w+gap)/(58+gap))),rows=Math.ceil(n/mc),cols=Math.ceil(n/rows),cw=Math.min(78,Math.floor((w-(cols-1)*gap)/cols)),
      h=rows<=2?44:rows===3?40:36,key=[cols,cw,h].join();
    if(VH<600&&rows>1)h-=4;
    if(!force&&r._fit===key)return;r._fit=key;r.style.setProperty('--dkw',cw+'px');r.style.setProperty('--dkh',h+'px');r.style.setProperty('--dkm',(cols*cw+(cols-1)*gap)+'px');
    r.classList.toggle('dkt',cw<66);if(!force){layout();geo()}}
  function lyTap(k){var on=!LY[k];LY[k]=on?1:0;if(on&&k==='temp')LY.waves=0;if(on&&k==='waves')LY.temp=0;
    /* (a hint's ghost reading would hide the words saying what was switched) */
    if(probe&&probe.ghost)probe=null;
    lySave();lyApply();dockSync();idle=0;tone('glass',pent(on?8:4,40),.35,0);lyPing=on?{k:k,t:FT}:null;if(on)lyShow(k)}
  /* what follows from the layers: the cameras on or off, no satellite chosen while they are away, NOAA's pictures asked for while the
     live view is on, and a reading of a fire or a storm put away with its layer */
  function lyApply(){camSync(!!LY.vid&&typeof LIVEW!=='undefined');if(!LY.orbit)try{ORBIT.layer.off()}catch(e){}
    if(typeof GEO!=='undefined'){var w=!!(HOSTED&&LY.sat),was=GEO.want;GEO.want=w;if(w&&!was&&PULL.timer)try{livePull(false)}catch(e){}}
    if(probe&&((probe.fire&&!LY.fire)||(probe.storm&&!LY.storm)||(probe.zone&&!(probe.zone.w&&LY.war)&&!(probe.zone.d&&LY.dark))))probe=null}
  /* a layer switched on turns the Earth to where it has most to show */
  function lyShow(k){var L=nowList(),f=function(kk){for(var i=0;i<L.length;i++)if(L[i].k===kk)return L[i];return null},it=k==='storm'?f('storm'):k==='fire'?f('fire'):k==='bolt'?f('bolt'):k==='aur'?f('aurora'):null;
    if(it){nowGo(it);return}
    if(k==='orbit'){var s2=f('iss');if(s2)flyTo(s2.lat,s2.lon);return}
    /* the war zones turn the Earth to the war that has killed most this year; the places cut off, to the most closed of them */
    if(k==='war'||k==='dark'){var z=ZONES.first(k);if(z)flyTo(z.lat,z.lon);return}
    /* (15 Nov: "put the videos accessible right on the page") videos on: a camera opens at once, the Earth turned to it */
    if(k==='vid'){try{if(!LIVEW.layer.openOne()){var c=LIVEW.layer.airSpot();if(c)flyTo(c[0],c[1])}}catch(e){}return}
    /* (the live view sees the Americas and the oceans either side: from anywhere else the Earth turns to them) */
    if(k==='sat'&&Math.abs(AS.n180(lon0+106))>70)flyTo(12,-100)}
  /* the layer of colour shown (one at a time) and its scale over the row */
  var LGD={temp:['temperature','°C',[[0,'#3d1a78'],[.235,'#2e4fd9'],[.47,'#9ed9ff'],[.59,'#73e09e'],[.71,'#f5d659'],[.82,'#ff8a2b'],[1,'#cc1f3d']],['-40','-20','0','25','45']],
    waves:['waves','m',[[0,'#030d29'],[.17,'#084d7a'],[.36,'#1ab8d1'],[.62,'#e6f7ff'],[.95,'#ff40b8']],['0','3','6','9','12']]};
  function colLayer(){var X=typeof WX!=='undefined'?WX:{};return LY.temp&&wxT&&X.t2m?'temp':LY.waves&&wxT&&X.wave?'waves':''}
  function lgdSync(){var e=$('lgd');if(!e)return;var k=colLayer();if(e.dataset.k===k&&e.hidden===!k)return;e.dataset.k=k;e.hidden=!k;
    if(k){var L=LGD[k],sc=$('lgs');$('lgn').textContent=L[0]+' '+L[1];$('lgb').style.background='linear-gradient(90deg,'+L[2].map(function(x){return x[1]+' '+Math.round(x[0]*100)+'%'}).join(',')+')';
      sc.innerHTML='';L[3].forEach(function(t){var x=document.createElement('span');x.textContent=t;sc.appendChild(x)})}
    layout();geo()}
  function nowGo(it){if(!it)return;if(it.k==='iss'){try{var s=ORBIT.iss(Date.now());if(s){it.lat=s.lat;it.lon=s.lon}}catch(e){}}
    FLY=null;FOC={s:{lat:it.lat,lon:it.lon},t:FT,lat:lat0,lon:lon0,z:zoom,tz:{storm:2.2,fire:2.6,bolt:2.2,aurora:1.5,iss:1.6}[it.k]||2};idle=0;vlon=vlat=0;
    if(it.k==='iss'){probe=null;cardOff();try{ORBIT.pick('ISS (ZARYA)')}catch(e){}}
    else{try{ORBIT.layer.off()}catch(e){}probe={lat:it.lat,lon:it.lon,v:AS.llv(it.lat,it.lon),p:[0,0,0],q:[0,0,0],t:FT,ghost:false,fire:it.k==='fire'?it.tg:null,storm:it.k==='storm'?it.tg:null};cardOff()}
    tone('glass',pent(9,40),.4,0)}
  /* ---- the zoom buttons, at the right of the globe ---- */
  /* (17 Nov) the zoom buttons step aside while a card stands where they would be (a place's card on a short screen is tall) */
  function zmSync(v){var z=$('zm');if(!z)return;zmOn=v;var top=Math.round(g.cy-46),cd=$('card'),hide=false;
    if(v&&cd&&!cd.hidden){var r=cd.getBoundingClientRect();hide=r.height>0&&top<r.bottom&&top+92>r.top}
    z.hidden=!v||hide;if(v&&!hide)z.style.top=top+'px'}
  function zoomBy(k){FOC=null;zoom=clamp(zoom*k,.16,ZMAX);geo();idle=0;zmSync(true)}
  /* how close the Earth can come (14 Nov: "can't zoom in close enough"): on the site, where NASA's 500-metre pictures of the ground come
     in for the part in view, to a few kilometres across the screen; in the artifact, which has only the whole Earth's picture, less */
  var ZMAX=HOSTED?48:8,DET={busy:false,key:'',mt:0,lz:0,la:0,lo:0,n:0,err:0};
  function detTick(){if(!HOSTED||DET.busy||DET.err>3)return;
    if(Math.abs(zoom-DET.lz)>.001||Math.abs(lat0-DET.la)>.01||Math.abs(lon0-DET.lo)>.01||FOC||FLY){DET.lz=zoom;DET.la=lat0;DET.lo=lon0;DET.mt=FT;return}
    if(FT-DET.mt<500||zoom<2.4)return;
    /* the box: a side of 1 to 64 degrees (the smallest that holds the view with a margin), centred on a grid of a quarter of it */
    var hs=Math.asin(Math.min(1,Math.hypot(STG.w,STG.h)/2/g.R))/AS.D,side=1;while(side<hs*2.05&&side<64)side*=2;
    var cl=Math.max(.2,Math.cos(lat0*AS.D)),sl=side,sw=Math.min(360,side/cl),q=side/4,cla=Math.round(lat0/q)*q,clo=Math.round(lon0/(sw/4))*(sw/4);
    var n=Math.min(90,cla+sl/2),s=Math.max(-90,n-sl);n=Math.min(90,s+sl);var w=clo-sw/2,e=clo+sw/2;if(w<-180){e+=-180-w;w=-180}if(e>180){w-=e-180;e=180}w=Math.max(-180,w);
    var key=[s,w,n,e].map(function(v){return v.toFixed(3)}).join(',');if(key===DET.key)return;DET.key=key;DET.busy=true;
    fetch('/api/detail?b='+key).then(function(r){if(!r.ok)throw new Error('detail '+r.status);return r.blob()}).then(function(b){
      var u=URL.createObjectURL(b),im=new Image();im.onload=function(){GLOBE.detail(im,{s:s,w:w,n:n,e:e});DET.n++;DET.busy=false;DET.err=0;setTimeout(function(){URL.revokeObjectURL(u)},4000)};
      im.onerror=function(){DET.busy=false;DET.err++;URL.revokeObjectURL(u)};im.src=u}).catch(function(){DET.busy=false;DET.err++})}
  /* the Earth turns to a place over a second (a camera opened, say); a finger on it stops the turning */
  function flyTo(la,lo){FOC=null;FLY={t:FT,a:lat0,b:lon0,la:clamp(la,-70,70),lo:lo};idle=-30}
  function resize(){GT.on=0;HLH=0;dockFit(true);layout();geo();if(zmOn)zmSync(true)}
  function pan(x){return clamp((x-g.cx)/Math.max(1,g.R)*.8,-1,1)}
  /* one finger turns the globe; let go while moving and it coasts */
  function down(p){if(camOn&&!p.ghost&&LIVEW.layer.hit(p.x,p.y)){p.win=1;return}idle=0;vlon=vlat=0;FLY=null;if(FOC&&FT-FOC.t>1400)FOC=null}
  function move(p){if(p.n>=2||p.win)return;var k=57.2958/g.R,c=Math.max(.35,Math.cos(lat0*AS.D));lon0-=(p.x-p.px)*k/c;lat0=clamp(lat0+(p.y-p.py)*k,-80,80);
    if(!p.ghost){turned=1;vlon=-p.vx*k/c;vlat=p.vy*k;if(p.moved>12)FOC=null}idle=0}
  /* a tap on a place reads it; a tap on the dark puts the reading away. A finger down up to 600 ms and not moved is a tap (a slow
     phone can be that long in passing the lifting on); the hints' ghost fingers keep to their own 320 */
  function up(p){if(p.win){if(p.win===1)LIVEW.layer.up(p);return}idle=0;if(held(p)>(p.ghost?320:600)||p.moved>12)return;var w=GLOBE.at(p.x,p.y,g),i,bd,d,tg=null;
    /* a camera, then a satellite (while they are shown), are what a tap meant before the place under it */
    if(!p.ghost)try{LIVEW.layer.cardOff()}catch(e){}
    if(!p.ghost&&camOn&&LIVEW.layer.near(p.x,p.y)>=0){probe=null;cardOff();try{ORBIT.layer.off()}catch(e){}LIVEW.layer.pick(p.x,p.y);return}
    /* (17 Nov) a storm's wheel right under the finger is what it meant, before any satellite flying over it */
    var stUnder=false;for(i=0;i<ST.length&&LY.storm;i++){if(ST[i].p[2]>.04&&(ST[i].p[0]-p.x)*(ST[i].p[0]-p.x)+(ST[i].p[1]-p.y)*(ST[i].p[1]-p.y)<16*16)stUnder=true}
    if(!p.ghost&&LY.orbit&&!stUnder&&ORBIT.layer.pick(p)){probe=null;cardOff();return}
    try{if(!p.ghost)ORBIT.layer.off()}catch(e){}
    if(!w){probe=null;cardOff();return}
    /* a storm's eye or a fire under the finger is what was meant: the reading goes to it */
    for(i=0,bd=26*26;i<ST.length&&LY.storm;i++){if(ST[i].p[2]<=.04)continue;d=(ST[i].p[0]-p.x)*(ST[i].p[0]-p.x)+(ST[i].p[1]-p.y)*(ST[i].p[1]-p.y);if(d<bd){bd=d;tg=ST[i].s}}
    if(!tg&&LY.fire)for(i=0,bd=15*15;i<FR.length;i++){if(FR[i].p[2]<=.04)continue;d=(FR[i].p[0]-p.x)*(FR[i].p[0]-p.x)+(FR[i].p[1]-p.y)*(FR[i].p[1]-p.y);if(d<bd){bd=d;tg=FR[i].f}}
    if(tg)w={lat:tg.lat,lon:tg.lon};
    /* a war, or a place cut off (a small one's ring within reach of the finger, else the zone the place is in) */
    var zh=null;if(!tg&&(LY.war||LY.dark))try{zh=ZONES.pick(p.x,p.y,w.lat,w.lon,g,!!LY.war,!!LY.dark)}catch(e){}
    /* a storm tapped: the Earth turns to it and comes close, so its spiral and its way can be seen */
    if(tg&&!tg.frp&&!p.ghost)FOC={s:tg,t:FT,lat:lat0,lon:lon0,z:zoom,tz:Math.max(zoom,2.9)};else if(!p.ghost)FOC=null;
    probe={lat:w.lat,lon:w.lon,v:AS.llv(w.lat,w.lon),p:[0,0,0],q:[0,0,0],t:FT,ghost:!!p.ghost,fire:tg&&tg.frp?tg:null,storm:tg&&!tg.frp?tg:null,zone:zh};
    if(!p.ghost){tone('glass',pent(5+clamp(Math.floor((w.lat+72)/144*9),0,8),40),.4,pan(p.x));if(!tg)placeCard(w.lat,w.lon);else cardOff()}}
  /* two fingers: sliding turns the globe too, a pinch comes closer */
  function gesture(e){var k=57.2958/g.R;lon0-=e.dx*k/Math.max(.35,Math.cos(lat0*AS.D));lat0=clamp(lat0+e.dy*k,-80,80);
    if(!e.ghost){zoom=clamp(zoom*e.scale,.16,ZMAX);geo();vlon=-e.dx/e.dt*k/Math.max(.35,Math.cos(lat0*AS.D))*.5;vlat=e.dy/e.dt*k*.5}idle=0}
  function wheel(e){if(e.shiftKey){lon0+=e.deltaY*.05}else{zoom=clamp(zoom*Math.exp(-e.deltaY*.0012),.16,ZMAX);geo()}idle=0}
  function key(e,dn){if(!dn)return false;if(e.key==='ArrowLeft')lon0-=6;else if(e.key==='ArrowRight')lon0+=6;else if(e.key==='ArrowUp')lat0=clamp(lat0+5,-80,80);else if(e.key==='ArrowDown')lat0=clamp(lat0-5,-80,80);else return false;idle=0;return true}
  /* the real figures for a place: the wind there (read off the model's grid between its four nearest points), the Sun's height and the
     hour by the Sun, the chance of aurora overhead, the lightning within 300 km in the last half hour */
  var CLS={TD:'tropical depression',TS:'tropical storm',HU:'hurricane',MH:'major hurricane',TY:'typhoon',STY:'super typhoon',STS:'subtropical storm',STD:'subtropical depression',PTC:'post-tropical cyclone',PC:'post-tropical cyclone'},COMPASS=['north','north-northeast','northeast','east-northeast','east','east-southeast','southeast','south-southeast','south','south-southwest','southwest','west-southwest','west','west-northwest','northwest','north-northwest'];
  function windAt(lat,lon){var W=LIVE.wind;if(!W)return null;var G=W.grid,fy=clamp(90-lat,0,179.999),fx=((lon%360)+360)%360,j=Math.floor(fy),i0=Math.floor(fx)%360,i1=(i0+1)%360,ty=fy-j,tx=fx-Math.floor(fx);
    function at(jj,ii,c){return (G[(jj*360+ii)*2+c]-128)/127*40}
    var u=(at(j,i0,0)*(1-tx)+at(j,i1,0)*tx)*(1-ty)+(at(j+1,i0,0)*(1-tx)+at(j+1,i1,0)*tx)*ty,v=(at(j,i0,1)*(1-tx)+at(j,i1,1)*tx)*(1-ty)+(at(j+1,i0,1)*(1-tx)+at(j+1,i1,1)*tx)*ty;
    return {u:u,v:v,kmh:Math.hypot(u,v)*3.6,from:(Math.atan2(-u,-v)/AS.D+360)%360}}
  /* the place by the nearest town: in it, or how far from it (a place far from any is just its latitude and longitude) */
  function placeName(la,lo){var c=CITIES.near(la,lo);if(!c||c.km>450)return '';return (c.km<20?c.name:Math.round(c.km/5)*5+' km from '+c.name)+', '+c.country}
  function reading(){
    if(!probe)return null;var w=windAt(probe.lat,probe.lon),A=LIVE.aurora,sun=Math.asin(clamp(GLOBE.dot(probe.v,sunV),-1,1))/AS.D,d=new Date(),
      hr=(((12+AS.n180(probe.lon-(sunI?sunI.sublon:0))/15)%24)+24)%24,near=0,i,c=Math.cos(300/6371);
    for(i=0;i<SK.length;i++)if(GLOBE.dot(SK[i].v,probe.v)>c)near++;
    var X=typeof WX!=='undefined'?WX:{},la=probe.lat,lo=probe.lon,tv=X.t2m?GRIB.at(X.t2m,la,lo):NaN,pv=X.mslp?GRIB.at(X.mslp,la,lo):NaN,wv=X.wave?GRIB.at(X.wave,la,lo):NaN;
    return {wind:w,sun:sun,hour:hr,aurora:A?A.grid[clamp(Math.round(90-probe.lat),0,180)*360+((Math.round(probe.lon)%360)+360)%360]:null,near:near,fire:probe.fire,storm:probe.storm,
      t:isNaN(tv)?null:tv-273.15,hpa:isNaN(pv)?null:pv/100,wave:isNaN(wv)?null:wv}}
  /* ---- the place card, where the page is served from the owner's own host: the weather at the place tapped, now and for the next three
     days (Open-Meteo, from the national weather services' models), and the last hour of rain radar there (RainViewer) over a map (CARTO,
     from OpenStreetMap). The figures are theirs; nothing is made up. A tap on the dark, or on the card's cross, puts it away ---- */
  var PCD={lat:0,lon:0,seq:0,wx:null,err:'',fr:[],base:[],fi:0,ft:0,on:false},WMO={0:'clear',1:'mostly clear',2:'partly cloudy',3:'overcast',45:'fog',48:'freezing fog',51:'light drizzle',53:'drizzle',55:'heavy drizzle',
    56:'freezing drizzle',57:'freezing drizzle',61:'light rain',63:'rain',65:'heavy rain',66:'freezing rain',67:'freezing rain',71:'light snow',73:'snow',75:'heavy snow',77:'snow grains',80:'showers',81:'showers',82:'heavy showers',
    85:'snow showers',86:'heavy snow showers',95:'thunderstorms',96:'thunderstorms, hail',99:'thunderstorms, hail'},DAYS=['SUN','MON','TUE','WED','THU','FRI','SAT'];
  function cardOff(){var c=$('card');if(c&&PCD.on){c.hidden=true;PCD.on=false;geo()}PCD.on=false;PCD.seq++;try{LIVEW.layer.cardOff()}catch(e){}}
  function placeCard(lat,lon){
    if(!HOSTED)return;var my=++PCD.seq,c=$('card');if(!c)return;PCD.lat=lat;PCD.lon=lon;PCD.wx=null;PCD.err='';PCD.fr=[];PCD.base=[];PCD.on=true;cardDraw();c.hidden=false;
    fetch('/api/wx?lat='+lat.toFixed(3)+'&lon='+lon.toFixed(3)).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()}).then(function(d){if(my!==PCD.seq)return;if(!d||!d.current)throw new Error('empty');PCD.wx=d;cardDraw()})
      .catch(function(){if(my!==PCD.seq)return;PCD.err='the forecast could not be read just now';cardDraw()});
    fetch('/api/feed/radar').then(function(r){if(!r.ok)throw new Error(r.status);return r.json()}).then(function(d){if(my!==PCD.seq||!d||!d.radar||!Array.isArray(d.radar.past))return;
      var host=/^https:\/\/[a-z0-9.\-]+$/.test(d.host||'')?d.host:'https://tilecache.rainviewer.com',z=6,n=64,xt=(lon+180)/360*n,s=Math.sin(lat*AS.D),yt=(.5-Math.log((1+s)/(1-s))/(4*Math.PI))*n,x0=Math.floor(xt-.5),y0=Math.floor(yt-.5);
      PCD.tile={x0:x0,y0:y0,px:(xt-x0)*256,py:(yt-y0)*256};
      function im(u){var i=new Image();i.decoding='async';i.onload=function(){if(my===PCD.seq)radarDraw()};i.src=u;return i}
      for(var a=0;a<2;a++)for(var b=0;b<2;b++)PCD.base.push({x:a,y:b,i:im('https://basemaps.cartocdn.com/dark_all/'+z+'/'+(((x0+a)%n)+n)%n+'/'+clamp(y0+b,0,n-1)+'.png')});
      d.radar.past.slice(-7).forEach(function(f){if(!/^\/[\w\/\-]+$/.test(f.path||''))return;var t=[];for(var a=0;a<2;a++)for(var b=0;b<2;b++)t.push({x:a,y:b,i:im(host+f.path+'/256/'+z+'/'+(((x0+a)%n)+n)%n+'/'+clamp(y0+b,0,n-1)+'/2/1_1.png')});PCD.fr.push({time:+f.time*1000,t:t})});
      PCD.fi=PCD.fr.length-1;cardDraw()}).catch(function(){})}
  function deg(v){return Math.round(v)+'°'}
  function cardDraw(){
    var c=$('card');if(!c||!PCD.on)return;while(c.firstChild)c.removeChild(c.firstChild);var d=PCD.wx,la=PCD.lat,lo=PCD.lon,cn=CITIES.near(la,lo),el;
    function add(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;c.appendChild(e);return e}
    var x=add('button','cx','×');x.type='button';x.setAttribute('aria-label','Put the card away');x.addEventListener('click',function(){cardOff();probe=null});
    add('p','cn',cn&&cn.km<450?(cn.km<20?cn.name:Math.round(cn.km/5)*5+' km from '+cn.name):'the open '+(la>66||la<-60?'ice':'sea'));
    var tz=d&&isFinite(d.utc_offset_seconds)?d.utc_offset_seconds:null,now=new Date(Date.now()+(tz||0)*1000),hh=('0'+now.getUTCHours()).slice(-2)+':'+('0'+now.getUTCMinutes()).slice(-2);
    add('p','ck',(cn&&cn.km<450?cn.country+' · ':'')+Math.abs(la).toFixed(1)+'°'+(la>=0?'N':'S')+' '+Math.abs(lo).toFixed(1)+'°'+(lo>=0?'E':'W')+(tz!==null?' · '+hh+' there':''));
    if(!d){add('p','cs',PCD.err||'reading the forecast');geo();return}
    var C=d.current||{},dl=add('dl'),t=C.temperature_2m,row=function(k,v){var a=document.createElement('dt');a.textContent=k;var b=document.createElement('dd');b.textContent=v;dl.appendChild(a);dl.appendChild(b)};
    row('now',deg(t)+'C · '+deg(t*9/5+32)+'F'+(isFinite(C.apparent_temperature)&&Math.abs(C.apparent_temperature-t)>=2?' · feels '+deg(C.apparent_temperature)+'C':'')+(WMO[C.weather_code]?' · '+WMO[C.weather_code]:''));
    row('wind',Math.round(C.wind_speed_10m)+' km/h from '+COMPASS[Math.round((+C.wind_direction_10m||0)/22.5)%16]+(isFinite(C.wind_gusts_10m)?' · gusts '+Math.round(C.wind_gusts_10m):''));
    row('air',Math.round(C.relative_humidity_2m)+'% humid · '+Math.round(C.pressure_msl)+' hPa · '+Math.round(C.cloud_cover)+'% cloud'+(C.precipitation>0?' · '+C.precipitation+' mm now':''));
    /* the next 24 hours: the temperature as a line, the rain as bars */
    var H=d.hourly||{},T=H.time||[],k0=0,curT=Date.parse((C.time||'')+'Z');for(var i=0;i<T.length;i++){if(Date.parse(T[i]+'Z')>=curT-1800000){k0=i;break}}
    var cv=add('canvas','c24');cv.width=Math.round(340*DPR);cv.height=Math.round(58*DPR);cv.style.height='58px';chart24(cv,H,k0,tz||0);
    var D=d.daily||{},dd=add('p','cd');(D.time||[]).slice(0,4).forEach(function(day,j){var dt=new Date(day+'T12:00:00Z'),s=document.createElement('span');
      s.textContent=(j?DAYS[dt.getUTCDay()]:'TODAY')+' '+deg(D.temperature_2m_max[j])+'/'+deg(D.temperature_2m_min[j])+(D.precipitation_sum[j]>=.5?' · '+Math.round(D.precipitation_sum[j])+' mm':'');dd.appendChild(s)});
    if(PCD.fr.length){var rv=add('canvas','cr');rv.width=Math.round(340*DPR);rv.height=Math.round(128*DPR);rv.style.height='128px';radarDraw()}
    add('p','cs','Open-Meteo'+(PCD.fr.length?' · radar RainViewer · map © OpenStreetMap, © CARTO':''));geo()}
  function chart24(cv,H,k0,tz){var g2=cv.getContext('2d'),W=cv.width,Hh=cv.height,s=DPR,T=(H.temperature_2m||[]).slice(k0,k0+25),R=(H.precipitation||[]).slice(k0,k0+25),n=T.length;if(n<2)return;
    var lo=Math.min.apply(null,T),hi=Math.max.apply(null,T),rm=Math.max(1,Math.max.apply(null,R.concat([0]))),x=function(i){return (6+i/(n-1)*(W/s-12))*s},y=function(v){return (8+(1-(v-lo)/Math.max(1,hi-lo))*(Hh/s-24))*s};
    g2.fillStyle='rgba(62,240,255,.55)';R.forEach(function(v,i){if(v>0){var bh=v/rm*(Hh/s-20)*s;g2.fillRect(x(i)-2*s,Hh-12*s-bh,4*s,bh)}});
    g2.strokeStyle='rgba(255,179,71,.95)';g2.lineWidth=1.5*s;g2.beginPath();T.forEach(function(v,i){if(i)g2.lineTo(x(i),y(v));else g2.moveTo(x(i),y(v))});g2.stroke();
    g2.font=(8*s)+'px '+MONO;g2.fillStyle='rgba(234,249,255,.6)';g2.textBaseline='alphabetic';
    var t0=Date.parse((H.time||[])[k0]+'Z');for(var i=0;i<n;i+=6){var hr=new Date(t0+i*3600000).getUTCHours();g2.fillText(('0'+hr).slice(-2),x(i)-5*s,Hh-2*s)}
    g2.fillStyle='rgba(255,179,71,.9)';g2.fillText(deg(hi)+'C',(W/s-34)*s,9*s);g2.fillText(deg(lo)+'C',(W/s-34)*s,Hh-14*s)}
  function radarDraw(){var c=$('card'),cv=c&&c.querySelector('canvas.cr');if(!cv||!PCD.tile)return;var g2=cv.getContext('2d'),W=cv.width,Hh=cv.height,s=DPR,T=PCD.tile,ox=W/2-T.px*s,oy=Hh/2-T.py*s;
    g2.fillStyle='#01040a';g2.fillRect(0,0,W,Hh);PCD.base.forEach(function(b){if(b.i.complete&&b.i.naturalWidth)g2.drawImage(b.i,ox+b.x*256*s,oy+b.y*256*s,256*s,256*s)});
    var f=PCD.fr[PCD.fi];if(f){g2.globalAlpha=.9;f.t.forEach(function(b){if(b.i.complete&&b.i.naturalWidth)g2.drawImage(b.i,ox+b.x*256*s,oy+b.y*256*s,256*s,256*s)});g2.globalAlpha=1;
      var tz=PCD.wx&&isFinite(PCD.wx.utc_offset_seconds)?PCD.wx.utc_offset_seconds:0,dt=new Date(f.time+tz*1000);g2.font=(8.5*s)+'px '+MONO;g2.fillStyle='rgba(234,249,255,.85)';
      g2.fillText('RADAR '+('0'+dt.getUTCHours()).slice(-2)+':'+('0'+dt.getUTCMinutes()).slice(-2),6*s,Hh-6*s)}
    g2.strokeStyle='rgba(255,179,71,.95)';g2.lineWidth=1.4*s;g2.beginPath();g2.arc(W/2,Hh/2,6*s,0,TAU);g2.stroke()}
  /* the lightning's score: on the sound's clock a little ahead for the ticks, on the picture's clock for the flashes */
  function seq(s,when){if(!LY.bolt)return;var a=byStep[((s%STEPS)+STEPS)%STEPS];if(!a)return;var n=0;
    for(var i=0;i<a.length&&n<2;i++){var k=a[i];if(k.p[2]<=.08)continue;hit('tick',.3+.3*Math.random(),pan(k.p[0]),.8+.5*Math.random(),when+n*.03);n++}}
  function step(st,ab){if(!LY.bolt)return;var a=byStep[((ab%STEPS)+STEPS)%STEPS];if(!a)return;for(var i=0;i<a.length;i++)if(flashes.length<220)flashes.push({k:a[i],t:0})}
  function tick(dt,t){
    var i,now=Date.now();feeds();if(FT-ftAt>800){ftAt=FT;
      /* the rows along the bottom can grow (the kinds of camera arrive): the stage is measured again */
      var fh=$('foot').offsetHeight;if(fh!==footH){footH=fh;layout();geo();try{LIVEW.layer.resize()}catch(e){}}}
    /* the words at the top grew or shrank: the globe's place is worked out again, and it glides there (at once in the first moments) */
    var dh=$('data').offsetHeight;if(dh!==dataH){dataH=dh;geo()}
    if(GT.on&&(Math.abs(GR-GT.R)>.15||Math.abs(GC-GT.cy)>.15)){var ge=FT-entT<700?1:1-Math.exp(-dt*7);GR+=(GT.R-GR)*ge;GC+=(GT.cy-GC)*ge;g.R=GR*zoom;g.cy=GC;if(zmOn)zmSync(true)}
    else if(zmOn&&FT-zmAt>300){zmAt=FT;zmSync(true)}
    if(PCD.on&&PCD.fr.length>1&&FT-PCD.ft>(PCD.fi===PCD.fr.length-1?1500:420)){PCD.ft=FT;PCD.fi=(PCD.fi+1)%PCD.fr.length;radarDraw()}
    if(!PTN){lon0+=vlon*dt;lat0=clamp(lat0+vlat*dt,-80,80);var kk=Math.exp(-dt*2.4);vlon*=kk;vlat*=kk;idle+=dt;if(idle>5&&!reduce&&!probe&&!FOC&&zoom<1.3&&!(ORBIT.layer.sel&&ORBIT.layer.sel()>=0))lon0+=dt*1.3*smooth((idle-5)/4)}else idle=0;
    /* (the last step lands exactly on the storm, however long the frames: a slow phone's last frame of the flight could otherwise end it short) */
    if(FOC&&!FOC.done){var fk=smooth(Math.min(1,(FT-FOC.t)/1400));lat0=lerp(FOC.lat,clamp(FOC.s.lat,-80,80),fk);lon0=FOC.lon+AS.n180(FOC.s.lon-FOC.lon)*fk;zoom=lerp(FOC.z,FOC.tz,fk);geo();idle=0;if(fk>=1)FOC.done=true}
    if(FLY){var yk=smooth((FT-FLY.t)/1100);lat0=lerp(FLY.a,FLY.la,yk);lon0=FLY.b+AS.n180(FLY.lo-FLY.b)*yk;vlon=vlat=0;if(yk>=1)FLY=null}
    if(FT-nowAt>5000){nowAt=FT;NOWL=nowList()}if(FT-dkAt>700){dkAt=FT;dockSync()}detTick();
    lon0=AS.n180(lon0);GLOBE.basis(lat0,lon0,g);
    try{ORBIT.layer.tick(dt,t,g)}catch(e){}
    if(camOn)try{LIVEW.layer.tick(dt,g)}catch(e){}
    sunI=AS.sun(now);moonI=AS.moon(now);AS.llv(sunI.sublat,sunI.sublon,sunV);AS.llv(moonI.sublat,moonI.sublon,moonV);
    for(i=flashes.length-1;i>=0;i--){flashes[i].t+=dt/.55;if(flashes[i].t>=1)flashes.splice(i,1)}
    for(i=0;i<SK.length;i++)GLOBE.pr(SK[i].v,g,SK[i].p);
    for(i=0;i<FR.length;i++)GLOBE.pr(FR[i].v,g,FR[i].p);
    for(i=0;i<ST.length;i++)GLOBE.pr(ST[i].v,g,ST[i].p);
    /* the place being read */
    if(probe)GLOBE.pr(probe.v,g,probe.p)}
  function draw(t){
    var c=OV,i,k;
    if(!GLX.ok||GLX.lost)blank();else{if(gen!==GLX.gen)glSetup();
      var gl=GLX.gl,bg=[ABYSS[0]*.6,ABYSS[1]*.6,ABYSS[2]*.7];lastT=t;
      glAttrOff();gl.disable(gl.BLEND);
      glClear(bg[0],bg[1],bg[2]);
      /* the layers that are on: NOAA's live view (on the site), the cloud map and the rain, one layer of colour, the isobars, the war
         zones and the places cut off. With the clouds or the live view on, the Earth is shown nearer to how it looks from orbit */
      var cl=GLOBE.hasCloud()&&!!LY.cld,rn=GLOBE.hasRain()&&!!LY.rain,gk=HOSTED&&LY.sat&&GLOBE.hasGeo()?1:0,ck=colLayer(),ik=LY.pres&&wxT&&typeof WX!=='undefined'&&WX.mslp?1:0,dim=cl||gk?.64:.38;
      if(!GLOBE.draw(g,{sun:sunV,moon:moonV,moonK:moonI?moonI.phase:0,bg:bg,dim:dim,zone:LY.war||LY.dark?ZONES.tex():null,warK:LY.war?1+.9*pingK('war'):0,darkK:LY.dark?darkNow(t):0,aur:LY.aur?aurT:null,aurK:1+.8*pingK('aur'),
        cld:cl,cldK:.95,rain:rn,rainK:1,sunK:1,time:t*.001,windF:windT,windK:0,wx:wxT,heatK:ck==='temp'?1:0,waveK:ck==='waves'?1:0,isoK:ik,geoK:gk}))blank();
      /* the satellites over the same Earth: the stars behind, every satellite where it is this second (while they are on), the one tapped
         with its orbit */
      try{ORBIT.layer.draw(t,!LY.orbit)}catch(e){}}
    /* the zones' edges, the front, and their names */
    if(LY.war||LY.dark)try{ZONES.draw(c,g,t,!!LY.war,!!LY.dark)}catch(e){}
    /* the lightning: where the storms are (a faint violet dust), and each flash as its bar comes round */
    /* (15 Nov, 23:20: "Make everything work": the lightning and the fires had been specks; they grow as the Earth comes closer) */
    var zf=clamp(Math.sqrt(g.R/170),.9,2.2),sq=1.6*zf;c.globalCompositeOperation='lighter';c.fillStyle='rgba(150,120,255,.34)';
    for(i=0;i<SK.length&&LY.bolt;i++){k=SK[i];if(k.p[2]>.04)c.fillRect(k.p[0]-sq/2,k.p[1]-sq/2,sq,sq)}
    for(i=0;i<flashes.length;i++){var f=flashes[i];k=f.k;if(k.p[2]<=.04)continue;var a=(1-f.t)*(1-f.t),z=clamp(k.p[2]*2.5,.35,1);
      c.fillStyle='rgba(190,170,255,'+(a*.24*z).toFixed(3)+')';c.beginPath();c.arc(k.p[0],k.p[1],(4+16*f.t)*zf,0,TAU);c.fill();
      c.fillStyle='rgba(245,240,255,'+(a*.95*z).toFixed(3)+')';c.beginPath();c.arc(k.p[0],k.p[1],2.2*zf,0,TAU);c.fill()}
    /* the fires: an ember where each burns, bigger the more heat it gives off */
    for(i=0;i<FR.length&&LY.fire;i++){k=FR[i];if(k.p[2]<=.04)continue;var fa=(.6+.4*Math.sin(t*.004*(1+k.ph*.2)+k.ph*7))*clamp(k.p[2]*3,.3,1),fr=(.7+k.s*.5)*zf;
      c.fillStyle='rgba(255,90,30,'+(fa*.3).toFixed(3)+')';c.beginPath();c.arc(k.p[0],k.p[1],fr*3.2,0,TAU);c.fill();
      c.fillStyle='rgba(255,140,60,'+(fa*.45).toFixed(3)+')';c.beginPath();c.arc(k.p[0],k.p[1],fr*1.5,0,TAU);c.fill();
      c.fillStyle='rgba(255,214,150,'+(fa*.95).toFixed(3)+')';c.beginPath();c.arc(k.p[0],k.p[1],fr*.75,0,TAU);c.fill()}
    c.globalCompositeOperation='source-over';
    /* a layer just switched on shows where its things are: for two seconds rings go out from each of them in view */
    if(lyPing&&FT-lyPing.t<2000){var pu=(FT-lyPing.t)/2000,pk=lyPing.k,pl=pk==='fire'&&LY.fire?FR:pk==='storm'&&LY.storm?ST:pk==='bolt'&&LY.bolt?SK:null,
        pc=pk==='fire'?'255,150,70':pk==='bolt'?'200,180,255':'234,249,255',pst=pl?Math.max(1,Math.ceil(pl.length/90)):1;
      if(pl){c.lineWidth=1.4;for(i=0;i<pl.length;i+=pst){k=pl[i];if(k.p[2]<=.04)continue;for(var w2=0;w2<2;w2++){var u2=pu*1.5-w2*.4;if(u2<0||u2>1)continue;
        c.strokeStyle='rgba('+pc+','+(.85*(1-u2)*(1-u2)).toFixed(3)+')';c.beginPath();c.arc(k.p[0],k.p[1],(5+28*u2)*zf,0,TAU);c.stroke()}}}}
    else if(lyPing)lyPing=null;
    /* close to a storm: its arms of cloud turning (the way it turns), as wide as its winds are strong, and its way: where its present
       motion would carry it in one and two days (NOAA's movement; a line of motion, not a forecast) */
    var kmPx=g.R/6371;
    for(i=0;i<ST.length&&LY.storm;i++){k=ST[i];if(k.p[2]<=.1)continue;var S=k.s,rk=(110+clamp(S.kmh||60,30,300)*1.6)*kmPx;if(rk<26)continue;
      var sgn=S.lat>=0?-1:1,spin=reduce?0:t*.0006*sgn*clamp((S.kmh||60)/80,.6,2.2),al=clamp((rk-26)/40,0,1)*clamp(k.p[2]*2,0,1),arms=4,j2,q2;
      c.lineCap='round';for(j2=0;j2<arms;j2++){c.beginPath();for(q2=0;q2<=40;q2++){var u=q2/40,rr=rk*(.12+.88*u),an=spin+j2*TAU/arms-sgn*u*3.4;c.lineTo(k.p[0]+Math.cos(an)*rr,k.p[1]+Math.sin(an)*rr)}
        c.strokeStyle='rgba(234,249,255,'+(.22*al).toFixed(3)+')';c.lineWidth=Math.max(2,rk*.09);c.stroke();c.strokeStyle='rgba(234,249,255,'+(.5*al).toFixed(3)+')';c.lineWidth=1.1;c.stroke()}
      c.fillStyle='rgba(1,4,10,'+(.6*al).toFixed(3)+')';c.beginPath();c.arc(k.p[0],k.p[1],Math.max(3,rk*.08),0,TAU);c.fill();c.lineCap='butt';
      if(S.mov&&S.mov[1]>0){var pts=[1,2].map(function(dd){var dist=S.mov[1]*24*dd/6371,b=S.mov[0]*AS.D,la1=S.lat*AS.D,lo1=S.lon*AS.D,la2=Math.asin(Math.sin(la1)*Math.cos(dist)+Math.cos(la1)*Math.sin(dist)*Math.cos(b)),
          lo2=lo1+Math.atan2(Math.sin(b)*Math.sin(dist)*Math.cos(la1),Math.cos(dist)-Math.sin(la1)*Math.sin(la2));return GLOBE.pr(AS.llv(la2/AS.D,lo2/AS.D),g,[0,0,0])});
        c.setLineDash([4,5]);c.strokeStyle='rgba(255,179,71,'+(.85*al).toFixed(3)+')';c.lineWidth=1.3;c.beginPath();c.moveTo(k.p[0],k.p[1]);pts.forEach(function(q3){c.lineTo(q3[0],q3[1])});c.stroke();c.setLineDash([]);
        c.font='500 8px '+MONO;c.fillStyle='rgba(255,179,71,'+(.95*al).toFixed(3)+')';pts.forEach(function(q3,dd){if(q3[2]>.1){c.beginPath();c.arc(q3[0],q3[1],2.4,0,TAU);c.fill();c.fillText(dd?'+2 DAYS':'+1 DAY',q3[0]+6,q3[1]-6)}})}}
    /* the storms: a small wheel turning the way the storm turns (against the clock north of the equator), and its name. (17 Nov, the
       fourth hourly run) the stronger the storm the bigger its wheel and the faster it turns, and its colour says how strong: a tropical
       storm white with two arms; a hurricane or typhoon (119 km/h and more) amber with three; a major one (178 and more) red, with a
       ring round it */
    c.font='500 9px "JetBrains Mono",ui-monospace,Menlo,monospace';c.textBaseline='middle';c.textAlign='left';c.lineJoin='round';
    for(i=0;i<ST.length&&LY.storm;i++){k=ST[i];if(k.p[2]<=.06)continue;var sx=k.p[0],sy=k.p[1],SL=stLook(k.s),rot=(reduce?0:t*.0016*SL.sp)*(k.s.lat>=0?-1:1),j,a2,nm=k.s.name.toUpperCase(),
        rad=SL.r*clamp(Math.sqrt(g.R/170),.9,1.6);
      for(j=0;j<2;j++){c.strokeStyle=j?'rgba('+SL.col+',.95)':'rgba(1,4,10,.6)';c.lineWidth=j?1.4:3.4;for(a2=0;a2<SL.arms;a2++){var a0=rot+a2*TAU/SL.arms;c.beginPath();c.arc(sx,sy,rad,a0,a0+TAU/SL.arms*.62);c.stroke()}}
      if(SL.arms===3&&SL.col===STC[2]){c.strokeStyle='rgba('+SL.col+',.38)';c.lineWidth=1;c.beginPath();c.arc(sx,sy,rad+3.5,0,TAU);c.stroke()}
      c.fillStyle='rgba('+SL.col+',.95)';c.beginPath();c.arc(sx,sy,1.6,0,TAU);c.fill();c.fillStyle='rgba(234,249,255,.95)';
      var tw=c.measureText(nm).width,lx=sx+rad+6+tw>VW-8?sx-rad-6-tw:sx+rad+6;c.lineWidth=3;c.strokeStyle='rgba(1,4,10,.7)';c.strokeText(nm,lx,sy);c.fillText(nm,lx,sy)}
    /* the highs and lows of the pressure, while its isobars show */
    if(LY.pres&&wxT&&typeof WX!=='undefined'&&WX.hl&&WX.hl.length){var HL=WX.hl,q4=[0,0,0];c.textAlign='center';c.textBaseline='middle';for(i=0;i<HL.length;i++){var h=HL[i];GLOBE.pr(h.v,g,q4);if(q4[2]<=.15)continue;
      c.font='700 12px '+MONO;c.lineWidth=3;c.strokeStyle='rgba(1,4,10,.75)';c.fillStyle=h.h?'rgba(255,179,71,.95)':'rgba(62,240,255,.95)';c.strokeText(h.h?'H':'L',q4[0],q4[1]);c.fillText(h.h?'H':'L',q4[0],q4[1]);
      c.font='500 8px '+MONO;c.fillStyle='rgba(234,249,255,.8)';c.strokeText(String(h.hpa),q4[0],q4[1]+11);c.fillText(String(h.hpa),q4[0],q4[1]+11)}c.textAlign='left'}
    /* the place being read: a ring */
    if(probe&&probe.p[2]>.02){var px=probe.p[0],py=probe.p[1],al=clamp((t-probe.t)/250,0,1);c.strokeStyle='rgba(1,4,10,.55)';c.lineWidth=3.4;c.beginPath();c.arc(px,py,8,0,TAU);c.stroke();
      c.strokeStyle='rgba(234,249,255,'+(.92*al).toFixed(3)+')';c.lineWidth=1.2;c.beginPath();c.arc(px,py,8,0,TAU);c.stroke()}
    /* the cameras: a ring for each, and the window of the one playing */
    if(camOn)try{LIVEW.layer.draw(t,g)}catch(e){}}
  /* the words at the top: only what a tap asked for (15 Nov, 22:59: "Remove the writing on the top"; until then four lines stood there:
     what to do, what was happening, how fresh it was, the cameras): a camera open, or a place, a fire, a storm, a war or a place cut off
     read. Nothing for the hints' ghost finger, nothing when a layer is switched (its button says it) */
  function hud(){
    var cam=camOn&&LIVEW.layer.open()?LIVEW.layer.hud():'';if(cam)return cam;
    return probe&&!probe.ghost&&!cardHigh()?wxHud():''}
  /* (17 Nov) on a short screen a place's card can reach up to the words: then the card says it (the words would show through it) */
  function cardHigh(){if(!PCD||!PCD.on)return false;var cd=$('card'),dd=$('data');return !!(cd&&!cd.hidden&&dd&&cd.getBoundingClientRect().top<dd.getBoundingClientRect().top+46)}
  function wxHud(){
    var w=LIVE.wind,r=reading();
    /* a war or a place cut off: what is known of it, and where that comes from */
    if(r&&probe.zone)return ZONES.words(probe.zone);
    if(r){var la=probe.lat,lo=probe.lon,h=Math.floor(r.hour),m=Math.floor((r.hour-h)*60),F=r.fire,S=r.storm,l3='',nm=placeName(la,lo),
        l1=(nm?nm+'\n':'')+Math.abs(la).toFixed(1)+'°'+(la>=0?'N':'S')+' '+Math.abs(lo).toFixed(1)+'°'+(lo>=0?'E':'W')+' · '+(h<10?'0':'')+h+':'+(m<10?'0':'')+m+' by the Sun · '+(r.sun>-.83?'Sun '+Math.round(Math.max(0,r.sun))+'° up':r.sun>-18?'dusk':'night'),
        l2=[r.t!==null?Math.round(r.t)+'°C':'',r.hpa!==null?Math.round(r.hpa)+' hPa':'',r.wave!==null?'waves '+r.wave.toFixed(1)+' m':'',
          r.wind?'wind '+Math.round(r.wind.kmh)+' km/h from '+COMPASS[Math.round(r.wind.from/22.5)%16]:'',r.aurora>=3?'aurora '+r.aurora+'%':''].filter(Boolean).join(' · ');
      /* a fire: how much heat it was giving off, which satellite saw it and how long ago. A storm: what its forecasters last said of it
         (the hurricane centre gives the wind it has now; GDACS, for the rest of the world, the highest it has reached) */
      if(F)l3='fire · '+F.frp.toLocaleString('en-US')+' MW · seen by '+(F.sat||'satellite')+' '+agoWords((Date.now()-LIVE.fires.asOf)+F.age*60000);
      else if(S){l3=S.name+' · '+(CLS[S.cls]||'cyclone')+(S.kmh?' · '+(S.peak?'has reached ':'')+S.kmh+' km/h':'');if(S.hpa&&l3.length<34)l3+=' · '+S.hpa+' hPa';l3+=' · '+S.by}
      else if(r.near)l3=r.near+' lightning flash'+(r.near>1?'es':'')+' within 300 km';
      else if(w)l3='NOAA GFS, '+stampUTC(w.asOf);
      return l1+(l2?'\n'+l2:'')+(l3?'\n'+l3:'')}
    return ''}
  /* the hint: one finger turns the globe a little, one way and then the other; then it taps a place */
  function ghost(t){
    /* (14 Nov) no hints once the Earth has been brought close, or while something is being read or watched: a ghost finger would
       turn it away from what is being looked at */
    if(zoom>1.5||(probe&&!probe.ghost)||(camOn&&LIVEW.layer.open()))return [null];var u=(t*.1)%1,R=g.R,dir=Math.floor(t*.1)%2?1:-1;
    if(u<.3){var e=smooth(u/.3);return [{x:g.cx+dir*R*(.4-.8*e),y:g.cy+R*.12*Math.sin(e*3.1)}]}
    if(u>.46&&u<.5)return [{x:g.cx-dir*R*.22,y:g.cy-R*.28}];
    return [null]}
  return {nowGo:function(i){nowGo(NOWL[i])},zoomBy:zoomBy,nowList:function(){return NOWL.map(function(x){return x.k+':'+x.n})},enter:enter,leave:leave,resize:resize,down:down,move:move,up:up,gesture:gesture,wheel:wheel,key:key,seq:seq,step:step,tick:tick,draw:draw,hud:hud,ghost:ghost,gl:function(){gen=-1},
    dbg:function(){return {ok:GLX.ok&&gen===GLX.gen,wind:!!windT,aurora:!!aurT,strikes:SK.length,flashes:flashes.length,ready:GLOBE.ready(),lat0:lat0,lon0:lon0,R:g.R,cx:g.cx,cy:g.cy,zoom:zoom,turned:turned,
      LY:LY,ping:lyPing?lyPing.k:'',darkK:LY.dark?+darkNow(FT).toFixed(3):0,dock:[].map.call($('lyd').childNodes,function(b){return b.id.slice(3)+(b.getAttribute('aria-pressed')==='true'?'+':'-')}),dockShown:!$('lyd').hidden,lgd:$('lgd').hidden?'':$('lgd').dataset.k,
      col:colLayer(),wx:!!wxT,geo:GLOBE.hasGeo(),now:NOWL.map(function(x){return x.k+':'+x.n}),cams:camOn,fly:!!FLY,probe:probe?{lat:probe.lat,lon:probe.lon,ghost:probe.ghost,r:reading(),zone:probe.zone?{w:probe.zone.w?probe.zone.w.id:null,d:probe.zone.d?probe.zone.d.id:null,front:probe.zone.front}:null}:null,vis:SK.filter(function(k){return k.p[2]>.3}).length,fires:FR.length,zones:ZONES.dbg(),storms:ST.map(function(k){var L=stLook(k.s);return {name:k.s.name,lat:k.s.lat,lon:k.s.lon,x:k.p[0],y:k.p[1],z:k.p[2],kmh:k.s.kmh,r:L.r,sp:L.sp,arms:L.arms,cat:L.cat}}),foc:!!FOC,
      fireAt:FR.filter(function(k){return k.p[2]>.3}).slice(0,3).map(function(k){return {x:k.p[0],y:k.p[1],frp:k.f.frp}})}},
    windAt:windAt,
    /* (for the checks) a layer switched as its button would, or read */
    layer:function(k,v){if(!(k in LY))return null;if(v!==undefined&&!!v!==!!LY[k])lyTap(k);return LY[k]},
    look:function(la,lo,zm){FOC=null;FLY=null;lat0=la;lon0=lo;if(zm){zoom=zm;geo()}idle=-1e6;vlon=vlat=0}}
})();
