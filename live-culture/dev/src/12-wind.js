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
   Left alone, it turns slowly. ---------- */
var WIND=(function(){
  var P=null,gen=-1,dye=null,type=0,dw=0,dh=0,ql=-1,byte8=false,windT=null,windV=-1,aurT=null,aurV=-1,skV=-1,
    g={cx:0,cy:0,R:100,E:[0,0,0],N:[0,0,0],C:[0,0,0]},lat0=16,lon0=clamp(-(new Date().getTimezoneOffset())/4,-180,180),zoom=1,idle=0,vlon=0,vlat=0,
    sunV=[0,0,0],moonV=[0,0,0],moonI=null,sunI=null,lastT=0,SK=[],byStep=[],flashes=[],STEPS=256,tmp=[0,0,0],probe=null,turned=0,
    FR=[],frV=-1,fireB=null,fireN=0,fireGen=-1,ST=[],stV=-1,
    /* the layers of the weather (the owner: "more layers, rain, sun, clouds. Real time"): each shown while it is on and there is data for it */
    LY={wind:1,clouds:1,rain:1,sun:1},lyAt=0,lyKey='';
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
    adv:H+'uniform sampler2D uDye;uniform sampler2D uWind;uniform float uDt;uniform float uK;uniform float uDiss;uniform float uTime;uniform float uRate;uniform float uEmit;uniform float uHaze;uniform vec2 uGrid;uniform float uHas;\n'+
      'float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}\n'+
      'void main(){float lat=(vUv.y-0.5)*3.14159265;float cl=max(cos(lat),0.16);\n'+
      'vec2 vel=(texture2D(uWind,vec2(vUv.x,1.0-vUv.y)).xy-0.50196)*80.315*uHas;\n'+
      'vec2 back=vUv-uDt*uK*vec2(vel.x/cl*0.15915494,vel.y*0.31830989);back.y=clamp(back.y,0.003,0.997);\n'+
      'vec3 d=max(texture2D(uDye,back).rgb*uDiss-0.0012,0.0);float sp=length(vel);\n'+
      'vec2 cell=floor(vUv*uGrid);float thr=uRate*(0.22+sp*0.085);float ta=uTime*0.2;float tb=ta+0.5;\n'+
      'float born=step(1.0-thr,hash(cell+floor(ta)*17.0))*(1.0-abs(fract(ta)*2.0-1.0))+step(1.0-thr,hash(cell+floor(tb)*31.0+7.0))*(1.0-abs(fract(tb)*2.0-1.0));\n'+
      'born*=smoothstep(1.5,1.2,abs(lat));\n'+
      'vec3 sc=mix(vec3(0.03,0.30,0.52),vec3(0.22,0.92,1.0),clamp(sp/13.0,0.0,1.0));sc=mix(sc,vec3(1.0,0.78,0.5),clamp((sp-15.0)/11.0,0.0,1.0));\n'+
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
    if(P&&P.pts&&fireGen!==GLX.gen&&FR.length){var gl=GLX.gl,fb=new Float32Array(FR.length*3);for(i=0;i<FR.length;i++){fb[i*3]=(FR[i].f.lon+180)/360;fb[i*3+1]=.5+FR[i].f.lat/180;fb[i*3+2]=FR[i].s}
      if(!fireB)fireB=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,fireB);gl.bufferData(gl.ARRAY_BUFFER,fb,gl.STATIC_DRAW);fireN=FR.length;fireGen=GLX.gen}}
  function geo(){g.R=Math.min(STG.w,STG.h-10)*.47*zoom;g.cx=STG.cx;g.cy=STG.cy}
  var LYI={wind:'<path d="M2.5 6h8.2a2.2 2.2 0 1 0-2.2-2.2M2.5 9.8h11a2.3 2.3 0 1 1-2.3 2.3"/>',clouds:'<path d="M4.6 12.5h7a2.9 2.9 0 0 0 .2-5.8 4 4 0 0 0-7.6-.6 3.2 3.2 0 0 0 .4 6.4z"/>',
    rain:'<path d="M4.6 9.2h7a2.6 2.6 0 0 0 .2-5.2 3.6 3.6 0 0 0-6.9-.5 2.9 2.9 0 0 0-.3 5.7M5.6 11.6l-.9 2.2M8.4 11.6l-.9 2.2M11.2 11.6l-.9 2.2"/>',sun:'<circle cx="8" cy="8" r="2.9"/><path d="M8 1.6v1.6M8 12.8v1.6M1.6 8h1.6M12.8 8h1.6M3.5 3.5l1.1 1.1M11.4 11.4l1.1 1.1M3.5 12.5l1.1-1.1M11.4 4.6l1.1-1.1"/>'};
  function lyrBuild(){var r=$('lyr');if(!r||r.childNodes.length)return;['wind','clouds','rain','sun'].forEach(function(k){var b=document.createElement('button');b.type='button';b.className='lb';b.id='l_'+k;
    b.innerHTML='<svg viewBox="0 0 16 16" aria-hidden="true">'+LYI[k]+'</svg><span></span>';b.lastChild.textContent=k;b.setAttribute('aria-pressed','true');
    b.addEventListener('click',function(){LY[k]=LY[k]?0:1;lyKey='';lyrSync(true)});r.appendChild(b)})}
  /* which layers there are data for: the clouds and the rain only where the page is served from the owner's own host */
  function lyrSync(force){var has={wind:!!LIVE.wind,clouds:GLOBE.hasCloud(),rain:GLOBE.hasRain(),sun:true},key='',k;for(k in LY)key+=(has[k]?1:0)+''+LY[k];if(key===lyKey&&!force)return;lyKey=key;
    var r=$('lyr');if(!r)return;var vis=false;for(k in LY){var b=$('l_'+k);if(!b)continue;b.hidden=!has[k];b.setAttribute('aria-pressed',LY[k]?'true':'false');if(has[k])vis=true}
    var was=r.hidden;r.hidden=!vis;if(was!==r.hidden){layout();geo()}}
  function enter(){if(GLX.ok&&gen!==GLX.gen)glSetup();GLOBE.load();liveLoad();size();lyrBuild();var r=$('lyr');if(r)r.hidden=false;lyKey='';lyrSync(true);geo();idle=0;lastT=0}
  function leave(){flashes.length=0;var r=$('lyr');if(r)r.hidden=true}
  function resize(){geo();if(GLX.ok&&P)size()}
  function pan(x){return clamp((x-g.cx)/Math.max(1,g.R)*.8,-1,1)}
  /* one finger turns the globe; let go while moving and it coasts */
  function down(p){idle=0;vlon=vlat=0}
  function move(p){if(p.n>=2)return;var k=57.2958/g.R,c=Math.max(.35,Math.cos(lat0*AS.D));lon0-=(p.x-p.px)*k/c;lat0=clamp(lat0+(p.y-p.py)*k,-80,80);
    if(!p.ghost){turned=1;vlon=-p.vx*k/c;vlat=p.vy*k}idle=0}
  /* a tap on a place reads it; a tap on the dark puts the reading away */
  function up(p){idle=0;if(FT-p.t0>320||p.moved>12)return;var w=GLOBE.at(p.x,p.y,g),i,bd,d,tg=null;
    if(!w){probe=null;return}
    /* a storm's eye or a fire under the finger is what was meant: the reading goes to it */
    for(i=0,bd=26*26;i<ST.length;i++){if(ST[i].p[2]<=.04)continue;d=(ST[i].p[0]-p.x)*(ST[i].p[0]-p.x)+(ST[i].p[1]-p.y)*(ST[i].p[1]-p.y);if(d<bd){bd=d;tg=ST[i].s}}
    if(!tg)for(i=0,bd=15*15;i<FR.length;i++){if(FR[i].p[2]<=.04)continue;d=(FR[i].p[0]-p.x)*(FR[i].p[0]-p.x)+(FR[i].p[1]-p.y)*(FR[i].p[1]-p.y);if(d<bd){bd=d;tg=FR[i].f}}
    if(tg)w={lat:tg.lat,lon:tg.lon};
    probe={lat:w.lat,lon:w.lon,v:AS.llv(w.lat,w.lon),p:[0,0,0],q:[0,0,0],t:FT,ghost:!!p.ghost,fire:tg&&tg.frp?tg:null,storm:tg&&!tg.frp?tg:null};
    if(!p.ghost)tone('glass',pent(5+clamp(Math.floor((w.lat+72)/144*9),0,8),40),.4,pan(p.x))}
  /* two fingers: sliding turns the globe too, a pinch comes closer */
  function gesture(e){var k=57.2958/g.R;lon0-=e.dx*k/Math.max(.35,Math.cos(lat0*AS.D));lat0=clamp(lat0+e.dy*k,-80,80);
    if(!e.ghost){zoom=clamp(zoom*e.scale,.7,3.2);geo();vlon=-e.dx/e.dt*k/Math.max(.35,Math.cos(lat0*AS.D))*.5;vlat=e.dy/e.dt*k*.5}idle=0}
  function wheel(e){if(e.shiftKey){lon0+=e.deltaY*.05}else{zoom=clamp(zoom*Math.exp(-e.deltaY*.0012),.7,3.2);geo()}idle=0}
  function key(e,dn){if(!dn)return false;if(e.key==='ArrowLeft')lon0-=6;else if(e.key==='ArrowRight')lon0+=6;else if(e.key==='ArrowUp')lat0=clamp(lat0+5,-80,80);else if(e.key==='ArrowDown')lat0=clamp(lat0-5,-80,80);else return false;idle=0;return true}
  /* the real figures for a place: the wind there (read off the model's grid between its four nearest points), the Sun's height and the
     hour by the Sun, the chance of aurora overhead, the lightning within 300 km in the last half hour */
  var CLS={TD:'tropical depression',TS:'tropical storm',HU:'hurricane',MH:'major hurricane',TY:'typhoon',STY:'super typhoon',STS:'subtropical storm',STD:'subtropical depression',PTC:'post-tropical cyclone',PC:'post-tropical cyclone'},COMPASS=['north','north-northeast','northeast','east-northeast','east','east-southeast','southeast','south-southeast','south','south-southwest','southwest','west-southwest','west','west-northwest','northwest','north-northwest'];
  function windAt(lat,lon){var W=LIVE.wind;if(!W)return null;var G=W.grid,fy=clamp(90-lat,0,179.999),fx=((lon%360)+360)%360,j=Math.floor(fy),i0=Math.floor(fx)%360,i1=(i0+1)%360,ty=fy-j,tx=fx-Math.floor(fx);
    function at(jj,ii,c){return (G[(jj*360+ii)*2+c]-128)/127*40}
    var u=(at(j,i0,0)*(1-tx)+at(j,i1,0)*tx)*(1-ty)+(at(j+1,i0,0)*(1-tx)+at(j+1,i1,0)*tx)*ty,v=(at(j,i0,1)*(1-tx)+at(j,i1,1)*tx)*(1-ty)+(at(j+1,i0,1)*(1-tx)+at(j+1,i1,1)*tx)*ty;
    return {u:u,v:v,kmh:Math.hypot(u,v)*3.6,from:(Math.atan2(-u,-v)/AS.D+360)%360}}
  function reading(){
    if(!probe)return null;var w=windAt(probe.lat,probe.lon),A=LIVE.aurora,sun=Math.asin(clamp(GLOBE.dot(probe.v,sunV),-1,1))/AS.D,d=new Date(),
      hr=(((12+AS.n180(probe.lon-(sunI?sunI.sublon:0))/15)%24)+24)%24,near=0,i,c=Math.cos(300/6371);
    for(i=0;i<SK.length;i++)if(GLOBE.dot(SK[i].v,probe.v)>c)near++;
    return {wind:w,sun:sun,hour:hr,aurora:A?A.grid[clamp(Math.round(90-probe.lat),0,180)*360+((Math.round(probe.lon)%360)+360)%360]:null,near:near,fire:probe.fire,storm:probe.storm}}
  /* the lightning's score: on the sound's clock a little ahead for the ticks, on the picture's clock for the flashes */
  function seq(s,when){var a=byStep[((s%STEPS)+STEPS)%STEPS];if(!a)return;var n=0;
    for(var i=0;i<a.length&&n<2;i++){var k=a[i];if(k.p[2]<=.08)continue;hit('tick',.3+.3*Math.random(),pan(k.p[0]),.8+.5*Math.random(),when+n*.03);n++}}
  function step(st,ab){var a=byStep[((ab%STEPS)+STEPS)%STEPS];if(!a)return;for(var i=0;i<a.length;i++)if(flashes.length<220)flashes.push({k:a[i],t:0})}
  function tick(dt,t){
    var i,now=Date.now();feeds();if(FT-lyAt>800){lyAt=FT;lyrSync(false)}
    if(!PTN){lon0+=vlon*dt;lat0=clamp(lat0+vlat*dt,-80,80);var kk=Math.exp(-dt*2.4);vlon*=kk;vlat*=kk;idle+=dt;if(idle>5&&!reduce)lon0+=dt*1.3*smooth((idle-5)/4)}else idle=0;
    lon0=AS.n180(lon0);GLOBE.basis(lat0,lon0,g);
    sunI=AS.sun(now);moonI=AS.moon(now);AS.llv(sunI.sublat,sunI.sublon,sunV);AS.llv(moonI.sublat,moonI.sublon,moonV);
    for(i=flashes.length-1;i>=0;i--){flashes[i].t+=dt/.55;if(flashes[i].t>=1)flashes.splice(i,1)}
    for(i=0;i<SK.length;i++)GLOBE.pr(SK[i].v,g,SK[i].p);
    for(i=0;i<FR.length;i++)GLOBE.pr(FR[i].v,g,FR[i].p);
    for(i=0;i<ST.length;i++)GLOBE.pr(ST[i].v,g,ST[i].p);
    /* the place being read, and a second point a little down the wind from it, for the arrow */
    if(probe){GLOBE.pr(probe.v,g,probe.p);var w=windAt(probe.lat,probe.lon);if(w&&w.kmh>.5){var s=1.2/Math.max(1,Math.hypot(w.u,w.v));GLOBE.pr(AS.llv(clamp(probe.lat+w.v*s,-89,89),probe.lon+w.u*s/Math.max(.2,Math.cos(probe.lat*AS.D)),tmp),g,probe.q);probe.w=w}else probe.w=null}}
  function sim(dt){
    var gl=GLX.gl,u,i;
    u=glUse(P.adv,dye.w);glBind(0,dye.r.tex,u.uDye);glBind(1,windT||dye.r.tex,u.uWind);gl.uniform1f(u.uHas,windT?1:0);gl.uniform1f(u.uDt,dt);gl.uniform1f(u.uK,reduce?.0016:.006);
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
      glAttrOff();gl.disable(gl.BLEND);if(P&&dye&&LY.wind)sim(dt);
      glClear(bg[0],bg[1],bg[2]);
      /* with the real clouds on, the Earth is shown nearer to how it looks from orbit and the wind's smoke is laid over it more lightly */
      var cl=GLOBE.hasCloud()&&LY.clouds,rn=GLOBE.hasRain()&&LY.rain,dim=LY.wind?(cl?.64:.38):.82;
      if(!GLOBE.draw(g,{sun:sunV,moon:moonV,moonK:moonI?moonI.phase:0,bg:bg,dim:dim,flow:P&&dye&&LY.wind?dye.r.tex:null,flowK:cl?.62:1.15,aur:aurT,aurK:1,cld:cl,cldK:.95,rain:rn,rainK:1,sunK:LY.sun?1:0,time:t*.001}))blank()}
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
    /* the storms: a small wheel turning the way the storm turns (against the clock north of the equator), and its name */
    c.font='500 9px "JetBrains Mono",ui-monospace,Menlo,monospace';c.textBaseline='middle';c.textAlign='left';c.lineJoin='round';
    for(i=0;i<ST.length;i++){k=ST[i];if(k.p[2]<=.06)continue;var sx=k.p[0],sy=k.p[1],rot=(reduce?0:t*.0016)*(k.s.lat>=0?-1:1),j,nm=k.s.name.toUpperCase();
      for(j=0;j<2;j++){c.strokeStyle=j?'rgba(234,249,255,.95)':'rgba(1,4,10,.6)';c.lineWidth=j?1.3:3.2;c.beginPath();c.arc(sx,sy,7.5,rot,rot+2.1);c.stroke();c.beginPath();c.arc(sx,sy,7.5,rot+Math.PI,rot+Math.PI+2.1);c.stroke()}
      c.fillStyle='rgba(234,249,255,.95)';c.beginPath();c.arc(sx,sy,1.5,0,TAU);c.fill();
      var tw=c.measureText(nm).width,lx=sx+13+tw>VW-8?sx-13-tw:sx+13;c.lineWidth=3;c.strokeStyle='rgba(1,4,10,.7)';c.strokeText(nm,lx,sy);c.fillText(nm,lx,sy)}
    /* the place being read: a ring, and an arrow down the wind, longer the harder it blows */
    if(probe&&probe.p[2]>.02){var px=probe.p[0],py=probe.p[1],al=clamp((t-probe.t)/250,0,1);c.strokeStyle='rgba(1,4,10,.55)';c.lineWidth=3.4;c.beginPath();c.arc(px,py,8,0,TAU);c.stroke();
      c.strokeStyle='rgba(234,249,255,'+(.92*al).toFixed(3)+')';c.lineWidth=1.2;c.beginPath();c.arc(px,py,8,0,TAU);c.stroke();
      if(probe.w){var dx=probe.q[0]-px,dy=probe.q[1]-py,dl=Math.hypot(dx,dy)||1,len=clamp(10+probe.w.kmh*.5,14,64);dx/=dl;dy/=dl;var x1=px+dx*10,y1=py+dy*10,x2=px+dx*(10+len),y2=py+dy*(10+len);
        c.strokeStyle='rgba(255,179,71,'+(.95*al).toFixed(3)+')';c.lineWidth=1.4;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.moveTo(x2-dx*7-dy*4,y2-dy*7+dx*4);c.lineTo(x2,y2);c.lineTo(x2-dx*7+dy*4,y2-dy*7-dx*4);c.stroke()}}}
  function hud(){
    var w=LIVE.wind,a=LIVE.aurora,s=LIVE.strikes;if(!w)return LIVE.asked?'reading the wind':'';
    var r=reading();
    if(r&&r.wind){var la=probe.lat,lo=probe.lon,h=Math.floor(r.hour),m=Math.floor((r.hour-h)*60),F=r.fire,S=r.storm,l3,
        l1=Math.abs(la).toFixed(1)+'°'+(la>=0?'N':'S')+' '+Math.abs(lo).toFixed(1)+'°'+(lo>=0?'E':'W')+' · '+(h<10?'0':'')+h+':'+(m<10?'0':'')+m+' by the Sun · '+(r.sun>-.83?'Sun '+Math.round(Math.max(0,r.sun))+'° up':r.sun>-18?'dusk':'night'),
        l2='wind '+Math.round(r.wind.kmh)+' km/h from '+COMPASS[Math.round(r.wind.from/22.5)%16]+(r.aurora>=3?' · aurora '+r.aurora+'%':'');
      /* a fire: how much heat it was giving off, which satellite saw it and how long ago. A storm: what its forecasters last said of it
         (the hurricane centre gives the wind it has now; GDACS, for the rest of the world, the highest it has reached) */
      if(F)l3='fire · '+F.frp.toLocaleString('en-US')+' MW · seen by '+(F.sat||'satellite')+' '+agoWords((Date.now()-LIVE.fires.asOf)+F.age*60000);
      else if(S){l3=S.name+' · '+(CLS[S.cls]||'cyclone')+(S.kmh?' · '+(S.peak?'has reached ':'')+S.kmh+' km/h':'');if(S.hpa&&l3.length<34)l3+=' · '+S.hpa+' hPa';l3+=' · '+S.by}
      else if(r.near)l3=r.near+' lightning flash'+(r.near>1?'es':'')+' within 300 km';
      else l3='NOAA GFS, '+stampUTC(w.asOf);
      return l1+'\n'+l2+'\n'+l3}
    var l1='wind of '+stampUTC(w.asOf)+' · up to '+Math.round(w.max*3.6)+' km/h · NOAA GFS',l3=[],l4=[];
    if(a)l3.push('aurora '+(a.max<10?'quiet':a.max<30?'low':a.max<60?'active':'strong')+' '+Math.round(a.max)+'%');
    if(s)l3.push(s.list.length.toLocaleString('en-US')+' flashes of lightning to '+stampUTC(s.asOf).replace(/^\d+ \w+ /,'').replace(' UTC',''));
    if(FR.length)l4.push(FR.length+' fires seen from orbit');if(ST.length)l4.push(ST.length===1?'tropical storm '+ST[0].s.name:ST.length+' tropical storms');
    if(CLOUD.img&&GLOBE.hasCloud()&&LY.clouds)l4.push('clouds of '+stampUTC(CLOUD.at).replace(/^\d+ \w+ /,''));
    if(RAIN.img&&GLOBE.hasRain()&&LY.rain)l4.push(RAIN.at?'rain of '+stampUTC(RAIN.at).replace(/^\d+ \w+ /,''):'rain, the latest');
    return l1+(l3.length?'\n'+l3.join(' · '):'')+(l4.length?'\n'+l4.join(' · '):'')}
  /* the hint: one finger turns the globe a little, one way and then the other; then it taps a place */
  function ghost(t){var u=(t*.1)%1,R=g.R,dir=Math.floor(t*.1)%2?1:-1;
    if(u<.3){var e=smooth(u/.3);return [{x:g.cx+dir*R*(.4-.8*e),y:g.cy+R*.12*Math.sin(e*3.1)}]}
    if(u>.46&&u<.5)return [{x:g.cx-dir*R*.22,y:g.cy-R*.28}];
    return [null]}
  return {enter:enter,leave:leave,resize:resize,down:down,move:move,up:up,gesture:gesture,wheel:wheel,key:key,seq:seq,step:step,tick:tick,draw:draw,hud:hud,ghost:ghost,gl:function(){gen=-1},
    dbg:function(){return {ok:!!(P&&dye),byte8:byte8,dw:dw,dh:dh,wind:!!windT,aurora:!!aurT,strikes:SK.length,flashes:flashes.length,ready:GLOBE.ready(),lat0:lat0,lon0:lon0,R:g.R,cx:g.cx,cy:g.cy,zoom:zoom,turned:turned,
      LY:LY,lyr:!$('lyr').hidden,probe:probe?{lat:probe.lat,lon:probe.lon,ghost:probe.ghost,r:reading()}:null,vis:SK.filter(function(k){return k.p[2]>.3}).length,fires:FR.length,fireGL:fireN,storms:ST.map(function(k){return {name:k.s.name,x:k.p[0],y:k.p[1],z:k.p[2]}}),
      fireAt:FR.filter(function(k){return k.p[2]>.3}).slice(0,3).map(function(k){return {x:k.p[0],y:k.p[1],frp:k.f.frp}})}},
    windAt:windAt,
    look:function(la,lo,zm){lat0=la;lon0=lo;if(zm){zoom=zm;geo()}idle=-1e6;vlon=vlat=0}}
})();
