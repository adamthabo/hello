/* ---------- WIND: the air of the whole Earth as it is moving now, made visible as smoke. The wind is real: NOAA's GFS model, the
   wind ten metres above every degree of the planet, from its latest run. Smoke is born all over the globe and the real wind
   draws it out (speeded up some thirty thousand times), so the trade winds, the westerlies and every storm turning today can
   be seen turning. Over it, also real and also measured from space: the aurora where NOAA expects it at this hour (from the
   solar wind read a million miles upstream), and the lightning of the last half hour as the GOES weather satellites saw it,
   replayed over sixteen bars: each flash a flash, and a soft tick. The strongest fires burning in the last day, as NASA's instruments saw
   their heat from orbit (FIRMS): each an ember where it burns, and its smoke, in the fire's own colour, carried off by the same real wind.
   And the tropical cyclones turning now, each with its name where its eye is.
   Hands do not add anything to the air (the owner found that fingers drawing smoke made it less interesting, 9 Nov): one
   finger turns the globe, a pinch comes closer, and a tap on any place reads the real figures for it: how hard the wind is
   blowing there and from where, how high the Sun stands, the chance of aurora, the lightning nearby; a tap on a fire or a storm
   reads what is known of it.
   Left alone, it turns slowly.
   Since 13 Nov this is the Earth world: the owner asked "Put them all on the same globe as satellites and make that just a layer", so
   the satellites (13-orbit.js) and the live cameras (14-live.js, on the site only) are layers of this one globe, switched in the same
   row as the weather. A tap goes to a camera's ring first, then a satellite, then a storm or a fire, then the place. ---------- */
var WIND=(function(){
  var P=null,gen=-1,dye=null,type=0,dw=0,dh=0,ql=-1,byte8=false,windT=null,windV=-1,aurT=null,aurV=-1,skV=-1,
    g={cx:0,cy:0,R:100,E:[0,0,0],N:[0,0,0],C:[0,0,0]},lat0=16,lon0=clamp(-(new Date().getTimezoneOffset())/4,-180,180),zoom=1,idle=0,vlon=0,vlat=0,
    sunV=[0,0,0],moonV=[0,0,0],moonI=null,sunI=null,lastT=0,SK=[],byStep=[],flashes=[],STEPS=256,tmp=[0,0,0],probe=null,turned=0,
    FR=[],frV=-1,fireB=null,fireN=0,fireGen=-1,ST=[],stV=-1,
    /* the layers of the weather (the owner: "more layers, rain, sun, clouds. Real time"): each shown while it is on and there is data for it */
    LY={wind:1,jet:0,heat:0,pressure:0,waves:0,clouds:1,rain:1,sun:1,sats:1,cams:1},lyAt=0,lyKey='',wxT=null,wxV=-1,jetT=null,HL=[],FOC=null,FLY=null,camOn=false,footH=0;
  var VQ='attribute vec2 a_p;varying vec2 vUv;void main(){vUv=a_p*0.5+0.5;gl_Position=vec4(a_p,0.0,1.0);}';
  var H='precision highp float;varying vec2 vUv;\n';
  /* the fires' smoke: each fire is a point in the picture of the unrolled Earth, lit a little every frame, and the wind does the rest */
  var VP='attribute vec3 a_f;uniform float uSize;varying float vS;void main(){vS=a_f.z;gl_Position=vec4(a_f.xy*2.0-1.0,0.0,1.0);gl_PointSize=uSize;}',
    FP='precision mediump float;varying float vS;uniform vec3 uCol;void main(){vec2 d=gl_PointCoord-0.5;float a=max(0.0,1.0-dot(d,d)*4.0);gl_FragColor=vec4(uCol*vS*a*a,1.0);}';
  var F={
    /* the smoke is carried: each place takes what the wind is bringing it, a little faded. And it is fed: thousands of small fires, each
       burning in one place for a few seconds (more of them, and brighter, where the wind is strong), so that every one trails a plume
       down the wind; and a thin haze everywhere the wind is hard, so a storm glows as a whole.
       The picture is the Earth unrolled: across is longitude, up is north */
    adv:H+'uniform sampler2D uDye;uniform sampler2D uWind;uniform float uDt;uniform float uK;uniform float uDiss;uniform float uTime;uniform float uRate;uniform float uEmit;uniform float uHaze;uniform vec2 uGrid;uniform float uHas;uniform float uVS;uniform float uCS;uniform float uJet;\n'+
      'float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}\n'+
      'void main(){float lat=(vUv.y-0.5)*3.14159265;float cl=max(cos(lat),0.16);\n'+
      'vec2 vel=(texture2D(uWind,vec2(vUv.x,1.0-vUv.y)).xy-0.50196)*80.315*uHas*uVS;\n'+
      'vec2 back=vUv-uDt*uK*vec2(vel.x/cl*0.15915494,vel.y*0.31830989);back.y=clamp(back.y,0.003,0.997);\n'+
      'vec3 d=max(texture2D(uDye,back).rgb*uDiss-0.0012,0.0);float sp=length(vel)*uCS;\n'+
      'vec2 cell=floor(vUv*uGrid);float thr=uRate*(0.22+sp*0.085);float ta=uTime*0.2;float tb=ta+0.5;\n'+
      'float born=step(1.0-thr,hash(cell+floor(ta)*17.0))*(1.0-abs(fract(ta)*2.0-1.0))+step(1.0-thr,hash(cell+floor(tb)*31.0+7.0))*(1.0-abs(fract(tb)*2.0-1.0));\n'+
      'born*=smoothstep(1.5,1.2,abs(lat));\n'+
      'vec3 sc=mix(vec3(0.03,0.30,0.52),vec3(0.22,0.92,1.0),clamp(sp/13.0,0.0,1.0));sc=mix(sc,vec3(1.0,0.78,0.5),clamp((sp-15.0)/11.0,0.0,1.0));\n'+
      /* the jet streams: violet, white where they run fastest */
      'sc=mix(sc,mix(vec3(0.30,0.14,0.70),vec3(0.96,0.88,1.0),clamp((sp-6.0)/18.0,0.0,1.0)),uJet);\n'+
      'gl_FragColor=vec4(d+sc*(born*uEmit*(0.55+sp*0.05)+uHaze*sp*sp*0.0016)*uHas,1.0);}'
  };
  function mk(w,h,filt){var gl=GLX.gl,t=glTarget(w,h,type,filt);if(t){gl.bindTexture(gl.TEXTURE_2D,t.tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT)}return t}
  function freeAll(){if(dye){glFree(dye.r);glFree(dye.w)}dye=null}
  function glSetup(){
    if(!GLX.ok)return;var gl=GLX.gl;gen=GLX.gen;dye=null;windT=aurT=null;windV=aurV=-1;P={};
    byte8=!(GLX.hf&&GLX.hfRT&&GLX.hfLin);type=byte8?gl.UNSIGNED_BYTE:GLX.hf.HALF_FLOAT_OES;
    for(var k in F){P[k]=glProg(VQ,F[k]);if(!P[k]){P=null;return}}P.pts=glProg(VP,FP);fireB=null;fireGen=-1}
  function size(){
    if(!P)return;var w=[1024,512,512][QL],h=w/2;if(dye&&dw===w)return;freeAll();ql=QL;dw=w;dh=h;
    var a=mk(w,h,GLX.gl.LINEAR),b=mk(w,h,GLX.gl.LINEAR);if(!a||!b){glFree(a);glFree(b);P=null;return}
    dye={r:a,w:b,swap:function(){var t=this.r;this.r=this.w;this.w=t}}}
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
    if(LIVE.wind&&windV!==LIVE.ver.wind){windV=LIVE.ver.wind;windT=gridTex(LIVE.wind.grid,2,windT)}
    if(LIVE.aurora&&aurV!==LIVE.ver.aurora){aurV=LIVE.ver.aurora;aurT=gridTex(LIVE.aurora.grid,1,aurT)}
    if(LIVE.strikes&&skV!==LIVE.ver.strikes){skV=LIVE.ver.strikes;SK=[];byStep=[];var L=LIVE.strikes.list,sp=LIVE.strikes.span,i;for(i=0;i<STEPS;i++)byStep.push(null);
      for(i=0;i<L.length;i++){var s={v:AS.llv(L[i].lat,L[i].lon),st:clamp(Math.floor((1-L[i].age/sp)*STEPS),0,STEPS-1),p:[0,0,0]};SK.push(s);(byStep[s.st]=byStep[s.st]||[]).push(s)}}
    if(LIVE.fires&&frV!==LIVE.ver.fires){frV=LIVE.ver.fires;FR=LIVE.fires.list.map(function(f){return {f:f,v:AS.llv(f.lat,f.lon),p:[0,0,0],ph:Math.random()*TAU,s:clamp(Math.sqrt(f.frp/150),1,3.4)}});fireGen=-1}
    if(LIVE.storms&&stV!==LIVE.ver.storms){stV=LIVE.ver.storms;ST=LIVE.storms.list.map(function(s){return {s:s,v:AS.llv(s.lat,s.lon),p:[0,0,0]}})}
    if(typeof WX!=='undefined'&&WX.ver!==wxV){wxV=WX.ver;wxBuild();HL=WX.hl||[]}wxStep();
    if(P&&P.pts&&fireGen!==GLX.gen&&FR.length){var gl=GLX.gl,fb=new Float32Array(FR.length*3);for(i=0;i<FR.length;i++){fb[i*3]=(FR[i].f.lon+180)/360;fb[i*3+1]=.5+FR[i].f.lat/180;fb[i*3+2]=FR[i].s}
      if(!fireB)fireB=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,fireB);gl.bufferData(gl.ARRAY_BUFFER,fb,gl.STATIC_DRAW);fireN=FR.length;fireGen=GLX.gen}}
  /* the model's fields as one picture the chip can read, the Earth unrolled from 180 W: red the temperature (-40 to 45 degrees), green
     the waves (0 where there is no sea, then up to twelve metres), blue the pressure (940 to 1060 hPa) and alpha where there is pressure.
     And the jet streams as a grid like the surface wind's, at two and a half times its scale */
  /* (built a slice of rows a frame, so a phone does not stall the moment the model's fields arrive) */
  var WXB=null;
  function wxBuild(){if(!GLX.ok)return;WXB={y:0,px:new Uint8Array(1024*512*4),iso:WX.mslp?isobars(WX.mslp,1024,512):null}}
  function wxStep(){
    if(!WXB||!GLX.ok)return;var gl=GLX.gl,W=1024,Hh=512,px=WXB.px,iso=WXB.iso,x,y,T=WX.t2m,Wv=WX.wave,y1=Math.min(Hh,WXB.y+64);
    for(y=WXB.y;y<y1;y++){var la=90-(y+.5)/Hh*180;for(x=0;x<W;x++){var lo=-180+(x+.5)/W*360,o=(y*W+x)*4,v;
      if(T){v=GRIB.at(T,la,lo);px[o]=isNaN(v)?0:clamp(Math.round((v-233.15)/85*255),0,255)}
      if(Wv){v=GRIB.at(Wv,la,lo);px[o+1]=isNaN(v)?0:clamp(Math.round(1+v/12*254),1,255)}
      if(iso){px[o+2]=iso[o+3];px[o+3]=255}}}
    WXB.y=y1;if(y1<Hh)return;WXB=null;
    var t=wxT||gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,W,Hh,0,gl.RGBA,gl.UNSIGNED_BYTE,px);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);wxT=t;
    if(WX.jet){var g2=new Uint8Array(360*181*2),i,j;for(j=0;j<181;j++)for(i=0;i<360;i++){var o2=(j*360+i)*2,uu=GRIB.at(WX.jet.u,90-j,i),vv=GRIB.at(WX.jet.v,90-j,i);
      g2[o2]=clamp(Math.round((uu||0)/100*127+128),0,255);g2[o2+1]=clamp(Math.round((vv||0)/100*127+128),0,255)}jetT=gridTex(g2,2,jetT)}lyKey=''}
  /* the isobars: lines of equal pressure every 4 hPa (every 20th brighter), traced through the model's degree grid (marching squares)
     and drawn on a flat picture of the Earth */
  function isobars(Pm,W,Hh){var cv=document.createElement('canvas');cv.width=W;cv.height=Hh;var c=cv.getContext('2d'),G=[],i,j,lv;
    for(j=0;j<=180;j++){G.push([]);for(i=0;i<=360;i++)G[j].push(GRIB.at(Pm,90-j,-180+i)/100)}
    var mn=1e9,mx=-1e9;for(j=0;j<=180;j++)for(i=0;i<=360;i++){var q=G[j][i];if(q<mn)mn=q;if(q>mx)mx=q}
    c.lineCap='round';c.lineJoin='round';
    for(lv=Math.ceil(mn/4)*4;lv<=mx;lv+=4){var major=lv%20===0;c.strokeStyle='rgba(255,255,255,'+(major?1:.62)+')';c.lineWidth=major?1.5:1.05;c.beginPath();
      for(j=0;j<180;j++)for(i=0;i<360;i++){var a=G[j][i],b=G[j][i+1],d=G[j+1][i+1],e=G[j+1][i],k=(a>lv?8:0)|(b>lv?4:0)|(d>lv?2:0)|(e>lv?1:0);if(k===0||k===15)continue;
        var X=W/360,Y=Hh/180,x0=i*X,y0=j*Y,pt=[];
        function ed(p,q,u0,v0,u1,v1){var f=(lv-p)/(q-p);pt.push([u0+(u1-u0)*f,v0+(v1-v0)*f])}
        if((a>lv)!==(b>lv))ed(a,b,x0,y0,x0+X,y0);if((b>lv)!==(d>lv))ed(b,d,x0+X,y0,x0+X,y0+Y);if((d>lv)!==(e>lv))ed(d,e,x0+X,y0+Y,x0,y0+Y);if((e>lv)!==(a>lv))ed(e,a,x0,y0+Y,x0,y0);
        if(pt.length>=2){c.moveTo(pt[0][0],pt[0][1]);c.lineTo(pt[1][0],pt[1][1])}if(pt.length===4){c.moveTo(pt[2][0],pt[2][1]);c.lineTo(pt[3][0],pt[3][1])}}
      c.stroke()}
    return c.getImageData(0,0,W,Hh).data}
  function geo(){var y1=STG.y1,cd=PCD&&PCD.on?$('card'):null;if(cd&&!cd.hidden){var ct=cd.getBoundingClientRect().top;if(ct>STG.y0+80&&ct<y1)y1=ct-6}
    var h=y1-STG.y0;g.R=Math.min(STG.w,h-10)*.47*zoom;g.cx=STG.cx;g.cy=STG.y0+h/2}
  var LYK=['sats','cams','wind','jet','heat','pressure','waves','clouds','rain','sun'],LYN={sats:'satellites',cams:'cameras'},LYI={
    sats:'<circle cx="8" cy="8" r="2.6"/><ellipse cx="8" cy="8" rx="6.6" ry="2.7" transform="rotate(-24 8 8)"/><circle cx="13.4" cy="4.9" r=".9"/>',
    cams:'<rect x="1.8" y="4.2" width="9.6" height="7.6" rx="1.4"/><path d="M11.4 7.2l3-1.8v5.2l-3-1.8"/>',jet:'<path d="M1.6 9.4c2.4-3.6 5.4-3.6 7.6-1.2 2 2.2 3.8 2.1 5.2-.4M3.8 12.6c1.8-1.6 3.6-1.4 5 0"/>',heat:'<path d="M6.6 9.6V3.6a1.6 1.6 0 1 1 3.2 0v6a3.1 3.1 0 1 1-3.2 0z"/><path d="M8.2 7v4.6"/>',
    pressure:'<path d="M2.2 5.6c2.6-2.4 9-2.4 11.6 0M2.6 9.4c2.4-1.6 8.4-1.6 10.8 0M4.6 12.9c1.6-.7 5.2-.7 6.8 0"/>',waves:'<path d="M1.6 7.4c1.6-1.6 3.1-1.6 4.4 0s2.9 1.6 4.4 0 3.1-1.6 4.1 0M1.6 11.4c1.6-1.6 3.1-1.6 4.4 0s2.9 1.6 4.4 0 3.1-1.6 4.1 0"/>',wind:'<path d="M2.5 6h8.2a2.2 2.2 0 1 0-2.2-2.2M2.5 9.8h11a2.3 2.3 0 1 1-2.3 2.3"/>',clouds:'<path d="M4.6 12.5h7a2.9 2.9 0 0 0 .2-5.8 4 4 0 0 0-7.6-.6 3.2 3.2 0 0 0 .4 6.4z"/>',
    rain:'<path d="M4.6 9.2h7a2.6 2.6 0 0 0 .2-5.2 3.6 3.6 0 0 0-6.9-.5 2.9 2.9 0 0 0-.3 5.7M5.6 11.6l-.9 2.2M8.4 11.6l-.9 2.2M11.2 11.6l-.9 2.2"/>',sun:'<circle cx="8" cy="8" r="2.9"/><path d="M8 1.6v1.6M8 12.8v1.6M1.6 8h1.6M12.8 8h1.6M3.5 3.5l1.1 1.1M11.4 11.4l1.1 1.1M3.5 12.5l1.1-1.1M11.4 4.6l1.1-1.1"/>'};
  /* the layers (13 Nov, night: "the map hard to use ... the layers"): a short list, opened from the one "layers" button under the globe,
     each with its name, what it shows in plain words, and on or off */
  var LYD={sats:'every satellite, where it is now',cams:'live cameras round the world: tap a ring to watch',wind:'the wind near the ground, as smoke',
    jet:'the fast winds 10 km up, in place of the wind',heat:'how warm the air is near the ground',pressure:'the highs and the lows of the air',
    waves:'how high the sea is running',clouds:'the clouds, seen from space',rain:'where it is raining',sun:'day and night: where the Sun is up'},lyOn=false,lyBtn=null;
  function lyrBuild(){var r=$('lyr');if(!r||r.childNodes.length)return;LYK.forEach(function(k){var b=document.createElement('button');b.type='button';b.className='ly';b.id='l_'+k;
    b.innerHTML='<svg viewBox="0 0 16 16" aria-hidden="true">'+LYI[k]+'</svg><span class="lyn"></span><span class="lyd"></span><span class="lyo"></span>';
    b.querySelector('.lyn').textContent=LYN[k]||(k==='jet'?'jet streams':k);b.setAttribute('aria-pressed','true');
    /* the wind near the ground and the jet streams are one smoke or the other */
    b.addEventListener('click',function(){LY[k]=LY[k]?0:1;if(LY[k]&&k==='jet')LY.wind=0;if(LY[k]&&k==='wind')LY.jet=0;lyKey='';lyrSync(true);tone('glass',pent(LY[k]?11:8,40),.3,0)});r.appendChild(b)});
    $('lyX').addEventListener('click',function(){lyOpen(false)})}
  function lyOpen(v){v=!!v;lyOn=v;var s=$('lys');if(s)s.hidden=!v;if(lyBtn)lyBtn.setAttribute('aria-expanded',v?'true':'false');if(v){lyKey='';lyrSync(true)}}
  /* when each layer's picture is of, said in its row */
  function lyWhen(k){var X=typeof WX!=='undefined'?WX:{},t=function(ms){return ms?stampUTC(ms):''};
    return k==='clouds'?t(CLOUD.at):k==='rain'?t(RAIN.at):k==='wind'&&LIVE.wind?'up to '+Math.round(LIVE.wind.max*3.6)+' km/h · '+t(LIVE.wind.asOf):(k==='jet'||k==='heat'||k==='pressure'||k==='waves')&&X.at?t(X.at):
      k==='sats'?(function(){var m=/^([\d,]+) satellites.*orbits of (.*)$/.exec(ORBIT.layer.hud()||'');return m?m[1]+' of them, orbits of '+m[2]:''})():''}
  /* which layers there are data for: the clouds and the rain only where the page is served from the owner's own host */
  function lyrSync(force){var X=typeof WX!=='undefined'?WX:{},has={sats:!!LIVE.sats,cams:!!HOSTED&&typeof LIVEW!=='undefined',wind:!!LIVE.wind,jet:!!(X.jet&&jetT),heat:!!X.t2m,pressure:!!X.mslp,waves:!!X.wave,clouds:GLOBE.hasCloud(),rain:GLOBE.hasRain(),sun:true},key='',k;
    camSync(has.cams&&LY.cams);for(k in LY)key+=(has[k]?1:0)+''+LY[k];key+=':'+LIVE.ver.wind+':'+LIVE.ver.sats+':'+CLOUD.ver+':'+RAIN.ver+':'+(X.at||0);if(key===lyKey&&!force)return;lyKey=key;
    var r=$('lyr');if(!r)return;for(k in LY){var b=$('l_'+k);if(!b)continue;b.hidden=!has[k];b.setAttribute('aria-pressed',LY[k]?'true':'false');
      b.querySelector('.lyo').textContent=LY[k]?'on':'off';var wh=has[k]?lyWhen(k):'';b.querySelector('.lyd').textContent=LYD[k]+(wh?' · '+wh:'')}}
  function camSync(v){v=!!v;if(v===camOn)return;camOn=v;try{LIVEW.layer.on(v)}catch(e){}layout();geo()}
  function enter(){if(GLX.ok&&gen!==GLX.gen)glSetup();GLOBE.load();liveLoad();size();lyrBuild();lyKey='';lyrSync(true);geo();idle=0;lastT=0;
    try{ORBIT.layer.on()}catch(e){}try{LIVEW.layer.flyTo(flyTo)}catch(e){}nowKey='';nowAt=0;zmSync(true);
    if(!zmW){zmW=1;$('zIn').addEventListener('click',function(){zoomBy(1.8)});$('zOut').addEventListener('click',function(){zoomBy(1/1.8)})}}
  function leave(){flashes.length=0;lyOpen(false);var n=$('nowr');if(n)n.hidden=true;zmSync(false);cardOff();try{ORBIT.layer.off()}catch(e){}camSync(false)}
  /* ---- what is happening now (13 Nov, night: "the map hard to use"): a row of names under the globe, each a storm turning now, the
     space station, the biggest fire, where the lightning is thickest, where the aurora is strongest. A name turns the Earth to its place
     and comes close, and reads it, as a tap there would ---- */
  var NOWL=[],nowKey='',nowAt=0,zmW=0,camBtn=null,NOWI={storm:'<path d="M8 8m-1.6 0a1.6 1.6 0 1 0 3.2 0 1.6 1.6 0 1 0-3.2 0M8 2.2c-3.6 0-5.4 2.4-5.6 4.6M8 13.8c3.6 0 5.4-2.4 5.6-4.6M13.4 5.2C12.6 3.4 10.8 2.4 9 2.4M2.6 10.8c.8 1.8 2.6 2.8 4.4 2.8"/>',
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
  function nowSync(){var r=$('nowr');if(!r)return;if(FT-nowAt<5000&&nowKey)return;nowAt=FT;NOWL=nowList();var key=NOWL.map(function(x){return x.k+x.n}).join('|');
    if(!lyBtn){lyBtn=document.createElement('button');lyBtn.type='button';lyBtn.className='lb lyb';lyBtn.id='lyB';lyBtn.setAttribute('aria-expanded','false');lyBtn.setAttribute('aria-controls','lys');
      lyBtn.innerHTML='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.2l5.8 3L8 8.2 2.2 5.2zM2.2 8l5.8 3 5.8-3M2.2 10.8l5.8 3 5.8-3"/></svg><span>layers</span>';
      lyBtn.addEventListener('click',function(){lyOpen(!lyOn)})}
    /* on the site, the cameras at once: the next one on the air opens over the Earth (14 Nov: "Videos doesn't seem to really be working") */
    if(!camBtn&&HOSTED&&typeof LIVEW!=='undefined'){camBtn=document.createElement('button');camBtn.type='button';camBtn.className='lb lyb';camBtn.id='camB';
      camBtn.innerHTML='<svg viewBox="0 0 16 16" aria-hidden="true">'+LYI.cams+'</svg><span>live cameras</span>';camBtn.setAttribute('aria-label','Watch a live camera');
      camBtn.addEventListener('click',function(){lyOpen(false);if(!LY.cams){LY.cams=1;lyKey='';lyrSync(true)}try{LIVEW.layer.next()}catch(e){}})}
    if(key!==nowKey||r.firstChild!==lyBtn){nowKey=key;r.innerHTML='';r.appendChild(lyBtn);if(camBtn)r.appendChild(camBtn);NOWL.forEach(function(it,i){var b=document.createElement('button');b.type='button';b.className='lb';b.id='n_'+i;
        b.innerHTML='<svg viewBox="0 0 16 16" aria-hidden="true">'+NOWI[it.k]+'</svg><span></span>';b.lastChild.textContent=it.n;b.setAttribute('aria-label','Go to the '+it.n);
        b.addEventListener('click',function(){nowGo(NOWL[i]||it)});r.appendChild(b)})}
    if(r.hidden){r.hidden=false;layout();geo()}}
  function nowGo(it){if(!it)return;if(it.k==='iss'){try{var s=ORBIT.iss(Date.now());if(s){it.lat=s.lat;it.lon=s.lon}}catch(e){}}
    FLY=null;FOC={s:{lat:it.lat,lon:it.lon},t:FT,lat:lat0,lon:lon0,z:zoom,tz:{storm:2.2,fire:2.6,bolt:2.2,aurora:1.5,iss:1.6}[it.k]||2};idle=0;vlon=vlat=0;lyOpen(false);
    if(it.k==='iss'){probe=null;cardOff();try{ORBIT.pick('ISS (ZARYA)')}catch(e){}}
    else{try{ORBIT.layer.off()}catch(e){}probe={lat:it.lat,lon:it.lon,v:AS.llv(it.lat,it.lon),p:[0,0,0],q:[0,0,0],t:FT,ghost:false,fire:it.k==='fire'?it.tg:null,storm:it.k==='storm'?it.tg:null};cardOff()}
    tone('glass',pent(9,40),.4,0);
    var r=$('nowr');if(r)[].forEach.call(r.childNodes,function(b,i){b.classList.toggle('go',NOWL[i]===it)})}
  /* ---- the zoom buttons, at the right of the globe ---- */
  function zmSync(v){var z=$('zm');if(!z)return;z.hidden=!v;if(v){z.style.top=Math.round(g.cy-46)+'px'}}
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
  function resize(){geo();if(GLX.ok&&P)size();if(!$('zm').hidden)zmSync(true)}
  function pan(x){return clamp((x-g.cx)/Math.max(1,g.R)*.8,-1,1)}
  /* one finger turns the globe; let go while moving and it coasts */
  function down(p){if(lyOn&&!p.ghost){lyOpen(false);p.win=2;return}if(camOn&&!p.ghost&&LIVEW.layer.hit(p.x,p.y)){p.win=1;return}idle=0;vlon=vlat=0;FLY=null;if(FOC&&FT-FOC.t>1400)FOC=null}
  function move(p){if(p.n>=2||p.win)return;var k=57.2958/g.R,c=Math.max(.35,Math.cos(lat0*AS.D));lon0-=(p.x-p.px)*k/c;lat0=clamp(lat0+(p.y-p.py)*k,-80,80);
    if(!p.ghost){turned=1;vlon=-p.vx*k/c;vlat=p.vy*k;if(p.moved>12)FOC=null}idle=0}
  /* a tap on a place reads it; a tap on the dark puts the reading away. A finger down up to 600 ms and not moved is a tap (a slow
     phone can be that long in passing the lifting on); the hints' ghost fingers keep to their own 320 */
  function up(p){if(p.win){if(p.win===1)LIVEW.layer.up(p);return}idle=0;if(FT-p.t0>(p.ghost?320:600)||p.moved>12)return;var w=GLOBE.at(p.x,p.y,g),i,bd,d,tg=null;
    /* a camera's ring, then a satellite, are what a tap meant before the place under it */
    if(!p.ghost&&camOn&&LIVEW.layer.pick(p.x,p.y)){probe=null;cardOff();try{ORBIT.layer.off()}catch(e){}return}
    if(!p.ghost&&LY.sats&&ORBIT.layer.pick(p)){probe=null;cardOff();return}
    try{if(!p.ghost)ORBIT.layer.off()}catch(e){}
    if(!w){probe=null;cardOff();return}
    /* a storm's eye or a fire under the finger is what was meant: the reading goes to it */
    for(i=0,bd=26*26;i<ST.length;i++){if(ST[i].p[2]<=.04)continue;d=(ST[i].p[0]-p.x)*(ST[i].p[0]-p.x)+(ST[i].p[1]-p.y)*(ST[i].p[1]-p.y);if(d<bd){bd=d;tg=ST[i].s}}
    if(!tg)for(i=0,bd=15*15;i<FR.length;i++){if(FR[i].p[2]<=.04)continue;d=(FR[i].p[0]-p.x)*(FR[i].p[0]-p.x)+(FR[i].p[1]-p.y)*(FR[i].p[1]-p.y);if(d<bd){bd=d;tg=FR[i].f}}
    if(tg)w={lat:tg.lat,lon:tg.lon};
    /* a storm tapped: the Earth turns to it and comes close, so its spiral and its way can be seen */
    if(tg&&!tg.frp&&!p.ghost)FOC={s:tg,t:FT,lat:lat0,lon:lon0,z:zoom,tz:Math.max(zoom,2.9)};else if(!p.ghost)FOC=null;
    probe={lat:w.lat,lon:w.lon,v:AS.llv(w.lat,w.lon),p:[0,0,0],q:[0,0,0],t:FT,ghost:!!p.ghost,fire:tg&&tg.frp?tg:null,storm:tg&&!tg.frp?tg:null};
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
    var X=typeof WX!=='undefined'?WX:{},la=probe.lat,lo=probe.lon,tv=X.t2m?GRIB.at(X.t2m,la,lo):NaN,pv=X.mslp?GRIB.at(X.mslp,la,lo):NaN,wv=X.wave?GRIB.at(X.wave,la,lo):NaN,jv=null;
    if(X.jet){var ju=GRIB.at(X.jet.u,la,lo),jw=GRIB.at(X.jet.v,la,lo);if(!isNaN(ju)&&!isNaN(jw))jv=Math.hypot(ju,jw)*3.6}
    return {wind:w,sun:sun,hour:hr,aurora:A?A.grid[clamp(Math.round(90-probe.lat),0,180)*360+((Math.round(probe.lon)%360)+360)%360]:null,near:near,fire:probe.fire,storm:probe.storm,
      t:isNaN(tv)?null:tv-273.15,hpa:isNaN(pv)?null:pv/100,wave:isNaN(wv)?null:wv,jet:jv}}
  /* ---- the place card, where the page is served from the owner's own host: the weather at the place tapped, now and for the next three
     days (Open-Meteo, from the national weather services' models), and the last hour of rain radar there (RainViewer) over a map (CARTO,
     from OpenStreetMap). The figures are theirs; nothing is made up. A tap on the dark, or on the card's cross, puts it away ---- */
  var PCD={lat:0,lon:0,seq:0,wx:null,err:'',fr:[],base:[],fi:0,ft:0,on:false},WMO={0:'clear',1:'mostly clear',2:'partly cloudy',3:'overcast',45:'fog',48:'freezing fog',51:'light drizzle',53:'drizzle',55:'heavy drizzle',
    56:'freezing drizzle',57:'freezing drizzle',61:'light rain',63:'rain',65:'heavy rain',66:'freezing rain',67:'freezing rain',71:'light snow',73:'snow',75:'heavy snow',77:'snow grains',80:'showers',81:'showers',82:'heavy showers',
    85:'snow showers',86:'heavy snow showers',95:'thunderstorms',96:'thunderstorms, hail',99:'thunderstorms, hail'},DAYS=['SUN','MON','TUE','WED','THU','FRI','SAT'];
  function cardOff(){var c=$('card');if(c&&PCD.on){c.hidden=true;PCD.on=false;geo()}PCD.on=false;PCD.seq++}
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
  function seq(s,when){var a=byStep[((s%STEPS)+STEPS)%STEPS];if(!a)return;var n=0;
    for(var i=0;i<a.length&&n<2;i++){var k=a[i];if(k.p[2]<=.08)continue;hit('tick',.3+.3*Math.random(),pan(k.p[0]),.8+.5*Math.random(),when+n*.03);n++}}
  function step(st,ab){var a=byStep[((ab%STEPS)+STEPS)%STEPS];if(!a)return;for(var i=0;i<a.length;i++)if(flashes.length<220)flashes.push({k:a[i],t:0})}
  function tick(dt,t){
    var i,now=Date.now();feeds();if(FT-lyAt>800){lyAt=FT;lyrSync(false);
      /* the rows along the bottom can grow (the kinds of camera arrive, a layer's data comes): the stage is measured again */
      var fh=$('foot').offsetHeight;if(fh!==footH){footH=fh;layout();geo();try{LIVEW.layer.resize()}catch(e){}}}
    if(PCD.on&&PCD.fr.length>1&&FT-PCD.ft>(PCD.fi===PCD.fr.length-1?1500:420)){PCD.ft=FT;PCD.fi=(PCD.fi+1)%PCD.fr.length;radarDraw()}
    if(!PTN){lon0+=vlon*dt;lat0=clamp(lat0+vlat*dt,-80,80);var kk=Math.exp(-dt*2.4);vlon*=kk;vlat*=kk;idle+=dt;if(idle>5&&!reduce&&!probe&&!FOC&&zoom<1.3&&!(ORBIT.layer.sel&&ORBIT.layer.sel()>=0))lon0+=dt*1.3*smooth((idle-5)/4)}else idle=0;
    /* (the last step lands exactly on the storm, however long the frames: a slow phone's last frame of the flight could otherwise end it short) */
    if(FOC&&!FOC.done){var fk=smooth(Math.min(1,(FT-FOC.t)/1400));lat0=lerp(FOC.lat,clamp(FOC.s.lat,-80,80),fk);lon0=FOC.lon+AS.n180(FOC.s.lon-FOC.lon)*fk;zoom=lerp(FOC.z,FOC.tz,fk);geo();idle=0;if(fk>=1)FOC.done=true}
    if(FLY){var yk=smooth((FT-FLY.t)/1100);lat0=lerp(FLY.a,FLY.la,yk);lon0=FLY.b+AS.n180(FLY.lo-FLY.b)*yk;vlon=vlat=0;if(yk>=1)FLY=null}
    nowSync();detTick();
    lon0=AS.n180(lon0);GLOBE.basis(lat0,lon0,g);
    if(LY.sats)try{ORBIT.layer.tick(dt,t,g)}catch(e){}
    if(camOn)try{LIVEW.layer.tick(dt,g)}catch(e){}
    sunI=AS.sun(now);moonI=AS.moon(now);AS.llv(sunI.sublat,sunI.sublon,sunV);AS.llv(moonI.sublat,moonI.sublon,moonV);
    for(i=flashes.length-1;i>=0;i--){flashes[i].t+=dt/.55;if(flashes[i].t>=1)flashes.splice(i,1)}
    for(i=0;i<SK.length;i++)GLOBE.pr(SK[i].v,g,SK[i].p);
    for(i=0;i<FR.length;i++)GLOBE.pr(FR[i].v,g,FR[i].p);
    for(i=0;i<ST.length;i++)GLOBE.pr(ST[i].v,g,ST[i].p);
    /* the place being read, and a second point a little down the wind from it, for the arrow */
    if(probe){GLOBE.pr(probe.v,g,probe.p);var w=windAt(probe.lat,probe.lon);if(w&&w.kmh>.5){var s=1.2/Math.max(1,Math.hypot(w.u,w.v));GLOBE.pr(AS.llv(clamp(probe.lat+w.v*s,-89,89),probe.lon+w.u*s/Math.max(.2,Math.cos(probe.lat*AS.D)),tmp),g,probe.q);probe.w=w}else probe.w=null}}
  function sim(dt){
    var gl=GLX.gl,u,i;
    var jet=LY.jet&&jetT,src=jet?jetT:windT;
    u=glUse(P.adv,dye.w);glBind(0,dye.r.tex,u.uDye);glBind(1,src||dye.r.tex,u.uWind);gl.uniform1f(u.uHas,src?1:0);gl.uniform1f(u.uDt,dt);gl.uniform1f(u.uK,reduce?.0016:.006);
    gl.uniform1f(u.uVS,jet?2.5:1);gl.uniform1f(u.uCS,jet?.38:1);gl.uniform1f(u.uJet,jet?1:0);
    gl.uniform1f(u.uDiss,Math.exp(-dt/(byte8?3.6:6.4)));gl.uniform1f(u.uTime,reduce?0:(FT*.001)%4000);gl.uniform2f(u.uGrid,dw/2,dh/2);gl.uniform1f(u.uRate,dw>600?.013:.03);
    /* the bass and the drums make the fires burn up */
    gl.uniform1f(u.uEmit,dt*2.3*(1+1.1*HIT[5]*G[5]+.7*HIT[0]*G[0]));gl.uniform1f(u.uHaze,dt*.1);glQuad(P.adv);dye.swap();
    /* the real fires feed the smoke where they burn */
    if(P.pts&&fireN&&fireGen===GLX.gen){u=glUse(P.pts,dye.r);var a=P.pts.a.a_f,k=dt*(byte8?5.2:4.2);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);gl.bindBuffer(gl.ARRAY_BUFFER,fireB);gl.enableVertexAttribArray(a);
      gl.vertexAttribPointer(a,3,gl.FLOAT,false,0,0);gl.uniform1f(u.uSize,dw>600?3:2);gl.uniform3f(u.uCol,k,k*.36,k*.07);gl.drawArrays(gl.POINTS,0,fireN);gl.disable(gl.BLEND);gl.disableVertexAttribArray(a)}}
  function draw(t){
    var c=OV,i,k;
    if(!GLX.ok||GLX.lost)blank();else{if(gen!==GLX.gen)glSetup();if(P&&(ql!==QL||!dye))size();
      var gl=GLX.gl,bg=[ABYSS[0]*.6,ABYSS[1]*.6,ABYSS[2]*.7],dt=lastT?Math.min(.1,Math.max(.001,(t-lastT)/1000)):.016;lastT=t;
      var fl=LY.wind||(LY.jet&&jetT);glAttrOff();gl.disable(gl.BLEND);if(P&&dye&&fl)sim(dt);
      glClear(bg[0],bg[1],bg[2]);
      /* with the real clouds on, the Earth is shown nearer to how it looks from orbit and the wind's smoke is laid over it more lightly */
      var cl=GLOBE.hasCloud()&&LY.clouds,rn=GLOBE.hasRain()&&LY.rain,hk=LY.heat&&WX.t2m,dim=fl?(cl||hk?.64:.38):.82;
      if(!GLOBE.draw(g,{sun:sunV,moon:moonV,moonK:moonI?moonI.phase:0,bg:bg,dim:dim,flow:P&&dye&&fl?dye.r.tex:null,flowK:(cl||hk?.62:1.15)*clamp((10-zoom)/6,.3,1),aur:aurT,aurK:1,cld:cl,cldK:hk?.7:.95,rain:rn,rainK:1,sunK:LY.sun?1:0,time:t*.001,
        wx:wxT,windF:windT,heatK:hk?1:0,waveK:LY.waves&&WX.wave?1:0,isoK:LY.pressure&&WX.mslp?1:0}))blank();
      /* the satellites over the same Earth: the stars behind, every satellite where it is this second, the one tapped with its orbit */
      if(LY.sats)try{ORBIT.layer.draw(t)}catch(e){}}
    /* the lightning: where the storms are (a faint violet dust), and each flash as its bar comes round */
    c.globalCompositeOperation='lighter';c.fillStyle='rgba(150,120,255,.28)';
    for(i=0;i<SK.length;i++){k=SK[i];if(k.p[2]>.04)c.fillRect(k.p[0]-.7,k.p[1]-.7,1.4,1.4)}
    for(i=0;i<flashes.length;i++){var f=flashes[i];k=f.k;if(k.p[2]<=.04)continue;var a=(1-f.t)*(1-f.t),z=clamp(k.p[2]*2.5,.35,1);
      c.fillStyle='rgba(190,170,255,'+(a*.20*z).toFixed(3)+')';c.beginPath();c.arc(k.p[0],k.p[1],3+13*f.t,0,TAU);c.fill();
      c.fillStyle='rgba(245,240,255,'+(a*.95*z).toFixed(3)+')';c.beginPath();c.arc(k.p[0],k.p[1],1.7,0,TAU);c.fill()}
    /* the fires: an ember where each burns, bigger the more heat it gives off */
    for(i=0;i<FR.length;i++){k=FR[i];if(k.p[2]<=.04)continue;var fa=(.6+.4*Math.sin(t*.004*(1+k.ph*.2)+k.ph*7))*clamp(k.p[2]*3,.3,1),fr=.7+k.s*.5;
      c.fillStyle='rgba(255,96,36,'+(fa*.34).toFixed(3)+')';c.beginPath();c.arc(k.p[0],k.p[1],fr*2.4,0,TAU);c.fill();
      c.fillStyle='rgba(255,196,120,'+(fa*.95).toFixed(3)+')';c.beginPath();c.arc(k.p[0],k.p[1],fr*.62,0,TAU);c.fill()}
    c.globalCompositeOperation='source-over';
    /* close to a storm: its arms of cloud turning (the way it turns), as wide as its winds are strong, and its way: where its present
       motion would carry it in one and two days (NOAA's movement; a line of motion, not a forecast) */
    var kmPx=g.R/6371;
    for(i=0;i<ST.length;i++){k=ST[i];if(k.p[2]<=.1)continue;var S=k.s,rk=(110+clamp(S.kmh||60,30,300)*1.6)*kmPx;if(rk<26)continue;
      var sgn=S.lat>=0?-1:1,spin=reduce?0:t*.0006*sgn*clamp((S.kmh||60)/80,.6,2.2),al=clamp((rk-26)/40,0,1)*clamp(k.p[2]*2,0,1),arms=4,j2,q2;
      c.lineCap='round';for(j2=0;j2<arms;j2++){c.beginPath();for(q2=0;q2<=40;q2++){var u=q2/40,rr=rk*(.12+.88*u),an=spin+j2*TAU/arms-sgn*u*3.4;c.lineTo(k.p[0]+Math.cos(an)*rr,k.p[1]+Math.sin(an)*rr)}
        c.strokeStyle='rgba(234,249,255,'+(.22*al).toFixed(3)+')';c.lineWidth=Math.max(2,rk*.09);c.stroke();c.strokeStyle='rgba(234,249,255,'+(.5*al).toFixed(3)+')';c.lineWidth=1.1;c.stroke()}
      c.fillStyle='rgba(1,4,10,'+(.6*al).toFixed(3)+')';c.beginPath();c.arc(k.p[0],k.p[1],Math.max(3,rk*.08),0,TAU);c.fill();c.lineCap='butt';
      if(S.mov&&S.mov[1]>0){var pts=[1,2].map(function(dd){var dist=S.mov[1]*24*dd/6371,b=S.mov[0]*AS.D,la1=S.lat*AS.D,lo1=S.lon*AS.D,la2=Math.asin(Math.sin(la1)*Math.cos(dist)+Math.cos(la1)*Math.sin(dist)*Math.cos(b)),
          lo2=lo1+Math.atan2(Math.sin(b)*Math.sin(dist)*Math.cos(la1),Math.cos(dist)-Math.sin(la1)*Math.sin(la2));return GLOBE.pr(AS.llv(la2/AS.D,lo2/AS.D),g,[0,0,0])});
        c.setLineDash([4,5]);c.strokeStyle='rgba(255,179,71,'+(.85*al).toFixed(3)+')';c.lineWidth=1.3;c.beginPath();c.moveTo(k.p[0],k.p[1]);pts.forEach(function(q3){c.lineTo(q3[0],q3[1])});c.stroke();c.setLineDash([]);
        c.font='500 8px '+MONO;c.fillStyle='rgba(255,179,71,'+(.95*al).toFixed(3)+')';pts.forEach(function(q3,dd){if(q3[2]>.1){c.beginPath();c.arc(q3[0],q3[1],2.4,0,TAU);c.fill();c.fillText(dd?'+2 DAYS':'+1 DAY',q3[0]+6,q3[1]-6)}})}}
    /* the storms: a small wheel turning the way the storm turns (against the clock north of the equator), and its name */
    c.font='500 9px "JetBrains Mono",ui-monospace,Menlo,monospace';c.textBaseline='middle';c.textAlign='left';c.lineJoin='round';
    for(i=0;i<ST.length;i++){k=ST[i];if(k.p[2]<=.06)continue;var sx=k.p[0],sy=k.p[1],rot=(reduce?0:t*.0016)*(k.s.lat>=0?-1:1),j,nm=k.s.name.toUpperCase();
      for(j=0;j<2;j++){c.strokeStyle=j?'rgba(234,249,255,.95)':'rgba(1,4,10,.6)';c.lineWidth=j?1.3:3.2;c.beginPath();c.arc(sx,sy,7.5,rot,rot+2.1);c.stroke();c.beginPath();c.arc(sx,sy,7.5,rot+Math.PI,rot+Math.PI+2.1);c.stroke()}
      c.fillStyle='rgba(234,249,255,.95)';c.beginPath();c.arc(sx,sy,1.5,0,TAU);c.fill();
      var tw=c.measureText(nm).width,lx=sx+13+tw>VW-8?sx-13-tw:sx+13;c.lineWidth=3;c.strokeStyle='rgba(1,4,10,.7)';c.strokeText(nm,lx,sy);c.fillText(nm,lx,sy)}
    /* the highs and lows of the pressure */
    if(LY.pressure&&HL.length){c.font='700 12px '+MONO;c.textAlign='center';c.textBaseline='middle';for(i=0;i<HL.length;i++){var h=HL[i],q=GLOBE.pr(h.v,g,tmp);if(q[2]<=.15)continue;
      c.lineWidth=3;c.strokeStyle='rgba(1,4,10,.75)';c.fillStyle=h.h?'rgba(255,179,71,.95)':'rgba(62,240,255,.95)';c.strokeText(h.h?'H':'L',q[0],q[1]);c.fillText(h.h?'H':'L',q[0],q[1]);
      c.font='500 8px '+MONO;c.fillStyle='rgba(234,249,255,.8)';c.strokeText(String(h.hpa),q[0],q[1]+11);c.fillText(String(h.hpa),q[0],q[1]+11);c.font='700 12px '+MONO}c.textAlign='left'}
    /* the place being read: a ring, and an arrow down the wind, longer the harder it blows */
    if(probe&&probe.p[2]>.02){var px=probe.p[0],py=probe.p[1],al=clamp((t-probe.t)/250,0,1);c.strokeStyle='rgba(1,4,10,.55)';c.lineWidth=3.4;c.beginPath();c.arc(px,py,8,0,TAU);c.stroke();
      c.strokeStyle='rgba(234,249,255,'+(.92*al).toFixed(3)+')';c.lineWidth=1.2;c.beginPath();c.arc(px,py,8,0,TAU);c.stroke();
      if(probe.w){var dx=probe.q[0]-px,dy=probe.q[1]-py,dl=Math.hypot(dx,dy)||1,len=clamp(10+probe.w.kmh*.5,14,64);dx/=dl;dy/=dl;var x1=px+dx*10,y1=py+dy*10,x2=px+dx*(10+len),y2=py+dy*(10+len);
        c.strokeStyle='rgba(255,179,71,'+(.95*al).toFixed(3)+')';c.lineWidth=1.4;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.moveTo(x2-dx*7-dy*4,y2-dy*7+dx*4);c.lineTo(x2,y2);c.lineTo(x2-dx*7+dy*4,y2-dy*7-dx*4);c.stroke()}}
    /* the cameras: a ring for each, and the window of the one playing */
    if(camOn)try{LIVEW.layer.draw(t,g)}catch(e){}}
  /* the words: how to use it, then (a place read) what is there, or (nothing read) what is happening and how fresh it is */
  function hud(){
    var head='drag to turn · tap a place or a name',
      cam=camOn&&LIVEW.layer.open()?LIVEW.layer.hud():'';
    if(cam)return head+'\n'+cam;
    var b=wxHud();if(probe)return b||head;
    /* (on the site: how many cameras are on the air, and how to watch one) */
    var cm=camOn?LIVEW.layer.hud():'';
    return head+(b?'\n'+b:'')+(cm?'\n'+cm:'')}
  function wxHud(){
    var w=LIVE.wind,a=LIVE.aurora,s=LIVE.strikes;if(!w)return LIVE.asked?'reading the wind':'';
    var r=reading();
    if(r&&r.wind){var la=probe.lat,lo=probe.lon,h=Math.floor(r.hour),m=Math.floor((r.hour-h)*60),F=r.fire,S=r.storm,l3,nm=placeName(la,lo),
        l1=(nm?nm+'\n':'')+Math.abs(la).toFixed(1)+'°'+(la>=0?'N':'S')+' '+Math.abs(lo).toFixed(1)+'°'+(lo>=0?'E':'W')+' · '+(h<10?'0':'')+h+':'+(m<10?'0':'')+m+' by the Sun · '+(r.sun>-.83?'Sun '+Math.round(Math.max(0,r.sun))+'° up':r.sun>-18?'dusk':'night'),
        l2='wind '+Math.round(r.wind.kmh)+' km/h from '+COMPASS[Math.round(r.wind.from/22.5)%16]+(r.aurora>=3?' · aurora '+r.aurora+'%':''),
        l2b=[r.t!==null?Math.round(r.t)+'°C':'',r.hpa!==null?Math.round(r.hpa)+' hPa':'',r.wave!==null?'waves '+r.wave.toFixed(1)+' m':'',r.jet!==null&&LY.jet?'jet '+Math.round(r.jet)+' km/h':''].filter(Boolean).join(' · ');
      if(l2b)l2+='\n'+l2b;
      /* a fire: how much heat it was giving off, which satellite saw it and how long ago. A storm: what its forecasters last said of it
         (the hurricane centre gives the wind it has now; GDACS, for the rest of the world, the highest it has reached) */
      if(F)l3='fire · '+F.frp.toLocaleString('en-US')+' MW · seen by '+(F.sat||'satellite')+' '+agoWords((Date.now()-LIVE.fires.asOf)+F.age*60000);
      else if(S){l3=S.name+' · '+(CLS[S.cls]||'cyclone')+(S.kmh?' · '+(S.peak?'has reached ':'')+S.kmh+' km/h':'');if(S.hpa&&l3.length<34)l3+=' · '+S.hpa+' hPa';l3+=' · '+S.by}
      else if(r.near)l3=r.near+' lightning flash'+(r.near>1?'es':'')+' within 300 km';
      else l3='NOAA GFS, '+stampUTC(w.asOf);
      return l1+'\n'+l2+'\n'+l3}
    /* nothing read: two short lines, what is happening now and how fresh the weather is (each layer says its own age in the list of layers) */
    var n=[];if(ST.length)n.push(ST.length===1?'1 storm':ST.length+' storms');if(FR.length)n.push(FR.length.toLocaleString('en-US')+' fires');
    if(s&&s.list.length)n.push(s.list.length.toLocaleString('en-US')+' flashes of lightning');if(a&&a.max>=30)n.push('aurora '+(a.max<60?'active':'strong'));
    return (n.length?'now: '+n.join(' · ')+'\n':'')+'weather of '+stampUTC(w.asOf)}
  /* the hint: one finger turns the globe a little, one way and then the other; then it taps a place */
  function ghost(t){var u=(t*.1)%1,R=g.R,dir=Math.floor(t*.1)%2?1:-1;
    if(u<.3){var e=smooth(u/.3);return [{x:g.cx+dir*R*(.4-.8*e),y:g.cy+R*.12*Math.sin(e*3.1)}]}
    if(u>.46&&u<.5)return [{x:g.cx-dir*R*.22,y:g.cy-R*.28}];
    return [null]}
  return {nowGo:function(i){nowGo(NOWL[i])},zoomBy:zoomBy,nowList:function(){return NOWL.map(function(x){return x.k+':'+x.n})},enter:enter,leave:leave,resize:resize,down:down,move:move,up:up,gesture:gesture,wheel:wheel,key:key,seq:seq,step:step,tick:tick,draw:draw,hud:hud,ghost:ghost,gl:function(){gen=-1},
    dbg:function(){return {ok:!!(P&&dye),byte8:byte8,dw:dw,dh:dh,wind:!!windT,aurora:!!aurT,strikes:SK.length,flashes:flashes.length,ready:GLOBE.ready(),lat0:lat0,lon0:lon0,R:g.R,cx:g.cx,cy:g.cy,zoom:zoom,turned:turned,
      LY:LY,lyr:!!(lyBtn&&!$('nowr').hidden),lys:lyOn,now:NOWL.map(function(x){return x.k+':'+x.n}),cams:camOn,fly:!!FLY,probe:probe?{lat:probe.lat,lon:probe.lon,ghost:probe.ghost,r:reading()}:null,vis:SK.filter(function(k){return k.p[2]>.3}).length,fires:FR.length,fireGL:fireN,storms:ST.map(function(k){return {name:k.s.name,lat:k.s.lat,lon:k.s.lon,x:k.p[0],y:k.p[1],z:k.p[2]}}),foc:!!FOC,
      fireAt:FR.filter(function(k){return k.p[2]>.3}).slice(0,3).map(function(k){return {x:k.p[0],y:k.p[1],frp:k.f.frp}})}},
    windAt:windAt,
    look:function(la,lo,zm){FOC=null;FLY=null;lat0=la;lon0=lo;if(zm){zoom=zm;geo()}idle=-1e6;vlon=vlat=0},
    layer:function(k,v){if(!(k in LY))return null;if(v!==undefined){LY[k]=v?1:0;lyKey='';lyrSync(true)}return LY[k]}}
})();
