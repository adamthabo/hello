/* ---------- the globe, shared by the worlds that show the Earth: NASA's Blue Marble by day and its city lights by night, the line
   between day and night where the Sun has it at the moment asked for; mountains throw their shade when the Sun is low on them,
   the sea glints under the Sun, the night is a little less dark where the Moon is up. Two more layers can be laid over it:
   smoke (a picture of the whole Earth unrolled flat, lit where there is smoke) and the aurora (the same, lit where NOAA expects it).
   Where the page is served from the owner's own host it also has the real clouds (GLOBE.cloud: EUMETSAT's world cloud map, white where
   the geostationary satellites see cold cloud tops), lit by the Sun by day and faintly by the Moon and the night sky.
   The eye is far away (no perspective): a place on the Earth is a place on the screen by three plain dot products. ---------- */
var GLOBE=(function(){
  var P=null,gen=-1,tex={},imgs={},dot1=null,ready=false,asked=false;
  var PICS=[['day','img/earth-day.jpg'],['lit','img/earth-lights.jpg'],['water','img/earth-water.jpg'],['topo','img/earth-topo.jpg']];
  var VS='attribute vec2 a_p;void main(){gl_Position=vec4(a_p,0.0,1.0);}';
  function fsrc(){return (GLX.deriv?'#extension GL_OES_standard_derivatives : enable\n#define DERIV\n':'')+
    'precision highp float;uniform vec2 uC;uniform float uR;uniform mat3 uM;uniform vec3 uSun;uniform vec3 uSunV;uniform vec3 uMoon;uniform float uMoonK;uniform float uReady;uniform vec3 uBg;\n'+
    'uniform sampler2D uDay;uniform sampler2D uLit;uniform sampler2D uWater;uniform sampler2D uTopo;uniform sampler2D uFlow;uniform sampler2D uAur;uniform float uFlowK;uniform float uAurK;uniform float uDim;uniform float uTime;uniform sampler2D uCld;uniform float uCldK;uniform sampler2D uRain;uniform float uRainK;uniform float uSunK;uniform sampler2D uWx;uniform float uHeatK;uniform float uWaveK;uniform float uIsoK;uniform sampler2D uWindF;uniform float uFlowA;uniform float uFlowT;\n'+
    /* the colours of the model's fields: the temperature (-40 to 45 degrees: violet, blue, ice, green, yellow, orange, red) and the waves (calm to ten metres and more) */
    'vec3 heatCol(float t){vec3 c=mix(vec3(0.24,0.10,0.47),vec3(0.18,0.31,0.85),smoothstep(0.0,0.235,t));c=mix(c,vec3(0.62,0.85,1.0),smoothstep(0.235,0.47,t));c=mix(c,vec3(0.45,0.88,0.62),smoothstep(0.47,0.59,t));\n'+
    'c=mix(c,vec3(0.96,0.84,0.35),smoothstep(0.59,0.71,t));c=mix(c,vec3(1.0,0.54,0.17),smoothstep(0.71,0.82,t));return mix(c,vec3(0.80,0.12,0.24),smoothstep(0.82,1.0,t));}\n'+
    'vec3 waveCol(float h){vec3 c=mix(vec3(0.01,0.05,0.16),vec3(0.03,0.30,0.48),smoothstep(0.0,0.17,h));c=mix(c,vec3(0.10,0.72,0.82),smoothstep(0.17,0.36,h));c=mix(c,vec3(0.90,0.97,1.0),smoothstep(0.36,0.62,h));return mix(c,vec3(1.0,0.25,0.72),smoothstep(0.62,0.95,h));}\n'+
    'void main(){vec2 p=(gl_FragCoord.xy-uC)/uR;float rr=length(p);vec2 pc=rr>0.9995?p*(0.9995/rr):p;vec3 n=vec3(pc,sqrt(max(1.0-dot(pc,pc),0.0)));vec3 e=uM*n;\n'+
    'float lat=asin(clamp(e.z,-1.0,1.0));float lon=atan(e.y,e.x);float ua=lon*0.15915494+0.5;\n'+
    /* a picture wrapped round a ball meets itself along one line; near that line the same place is looked up by a second count that has its join on the other side */
    '#ifdef DERIV\nfloat ub=fract(ua+0.5)-0.5;float u=fwidth(ub)<fwidth(ua)?ub:ua;\n#else\nfloat u=ua;\n#endif\n'+
    'vec2 uv=vec2(u,0.5-lat*0.31830989);float cl=max(cos(lat),0.25);\n'+
    'vec3 dc=texture2D(uDay,uv).rgb;float l0=texture2D(uLit,uv).r;float l1=texture2D(uLit,uv,2.5).r;float wat=texture2D(uWater,uv).r;\n'+
    'float hE=texture2D(uTopo,uv+vec2(0.0012/cl,0.0)).r-texture2D(uTopo,uv-vec2(0.0012/cl,0.0)).r;float hN=texture2D(uTopo,uv-vec2(0.0,0.0012)).r-texture2D(uTopo,uv+vec2(0.0,0.0012)).r;\n'+
    'dc=mix(vec3(0.02,0.07,0.12),dc,uReady);\n'+
    /* the Sun on the ground: the slope of the land leans the light */
    'float d=dot(e,uSun);vec3 ea=normalize(vec3(-e.y,e.x,0.0001));vec3 no=cross(e,ea);vec3 nb=normalize(e-(hE*ea+hN*no)*2.6);float dl=dot(nb,uSun);\n'+
    'float sunl=pow(clamp(dl,0.0,1.0),0.62);float tw=smoothstep(-0.20,0.04,d);float night=smoothstep(0.08,-0.16,d);\n'+
    'vec3 col=dc*(sunl*1.5+tw*vec3(0.05,0.08,0.14))*uDim;\n'+
    /* the night: starlight, the Moon where it is up, and the cities */
    'float moonl=uMoonK*max(dot(e,uMoon),0.0);col+=dc*vec3(0.07,0.10,0.18)*(1.0+moonl*7.0)*night;\n'+
    'float lit=max(l0-0.05,0.0)*1.05+l1*0.4;col+=vec3(1.0,0.72,0.38)*lit*1.1*night*uReady;\n'+
    /* the Sun on the sea */
    'vec3 hv=normalize(uSunV+vec3(0.0,0.0,1.0));float sd=max(dot(n,hv),0.0);float dayk=smoothstep(0.0,0.2,d)*wat;col+=(vec3(1.0,0.90,0.70)*pow(sd,220.0)*0.3+vec3(0.5,0.62,0.75)*pow(sd,26.0)*0.06)*dayk*uDim;\n'+
    /* the clouds: thick ones hide the ground and the cities; by day as bright as the Sun makes them, by night a faint grey */
    /* the clouds and the rain drift with the real wind (as a flow, cycling every few seconds: the picture itself is three hours old) */
    'vec2 wf=(texture2D(uWindF,uv).xy-0.50196)*80.315*uFlowA;vec2 du=vec2(wf.x/cl,-wf.y)*0.00045;float f1=fract(uFlowT),f2=fract(uFlowT+0.5),fwa=abs(f1*2.0-1.0);\n'+
    'float cs=mix(texture2D(uCld,uv-du*f1).r,texture2D(uCld,uv-du*f2).r,fwa);\n'+
    'float cw=smoothstep(0.10,0.80,cs)*uCldK;vec3 cc=vec3(0.93,0.96,1.0)*(sunl*1.32+tw*vec3(0.05,0.07,0.11))*mix(uDim,1.0,0.55)+vec3(0.07,0.09,0.14)*night*(1.0+moonl*4.0);\n'+
    'col=mix(col,cc,cw*0.9);\n'+
    /* the rain of the last half hour measured from orbit (NASA IMERG), in its own colours: light blue for a shower to red for a downpour */
    'vec4 rn=mix(texture2D(uRain,uv-du*f1),texture2D(uRain,uv-du*f2),fwa);col=mix(col,rn.rgb*1.05,rn.a*uRainK*0.8);\n'+
    /* the weather model's fields (where the page is served from the owner's own host): the temperature two metres up as a colour over
       everything, lit a little by the Sun; the height of the waves over the sea; the pressure as lines every 4 hPa, every 20th brighter */
    'vec4 wx=texture2D(uWx,uv);float shade=0.55+0.45*max(sunl,0.3);\n'+
    'if(uHeatK>0.0)col=mix(col,heatCol(wx.r)*shade,uHeatK*0.74);\n'+
    'if(uWaveK>0.0){float sea=smoothstep(0.0,0.012,wx.g);col=mix(col,waveCol((wx.g-0.004)*1.004)*shade,uWaveK*0.62*sea);}\n'+
    'if(uIsoK>0.0)col=mix(col,vec3(0.92,0.97,1.0),wx.b*uIsoK*0.78);\n'+
    /* the Sun: a warm light where it shines on clear ground, the point it stands straight over, and where dusk is six, twelve and eighteen degrees deep */
    'if(uSunK>0.0){col+=vec3(1.0,0.74,0.36)*(1.0-cw)*pow(max(d,0.0),1.6)*0.3*uSunK*mix(uDim,1.0,0.5);col+=vec3(1.0,0.86,0.6)*exp(-(1.0-d)*110.0)*0.9*uSunK;\n'+
    'col+=(vec3(1.0,0.55,0.25)*(1.0-smoothstep(0.0,0.006,abs(d+0.1045)))*0.34+vec3(0.75,0.45,1.0)*(1.0-smoothstep(0.0,0.006,abs(d+0.2079)))*0.22+vec3(0.45,0.40,1.0)*(1.0-smoothstep(0.0,0.006,abs(d+0.3090)))*0.16)*uSunK;}\n'+
    /* the aurora: where it is expected, a green that leans to violet where it is strongest, shimmering along its length; plainest at night */
    'float au=texture2D(uAur,uv).r*2.55;float ak=smoothstep(0.012,0.34,au)*uAurK;\n'+
    'float sh=0.72+0.28*sin(lon*46.0+uTime*1.7+sin(lat*38.0+uTime*0.6)*2.2);col+=mix(vec3(0.08,1.0,0.46),vec3(0.62,0.34,1.0),clamp(au*1.6-0.1,0.0,0.75))*ak*sh*(0.3+0.9*night);\n'+
    /* the smoke: its own light, over day and night alike */
    'vec3 fl=texture2D(uFlow,vec2(u,0.5+lat*0.31830989)).rgb;col+=fl*uFlowK;\n'+
    /* the air: blue at the edge by day, red where day meets night */
    'float fr=pow(1.0-n.z,3.0);float dayA=smoothstep(-0.28,0.25,d);col+=vec3(0.22,0.50,1.0)*fr*(0.07+0.95*dayA);col+=vec3(1.0,0.40,0.14)*exp(-d*d/0.010)*(0.05+0.55*fr);\n'+
    /* a faint grid every thirty degrees */
    'float ga=lat*1.9098593;float gb=u*12.0;\n'+
    '#ifdef DERIV\nfloat wa=fwidth(ga)*1.2+0.0004;float wb=fwidth(gb)*1.2+0.0004;\n#else\nfloat wa=0.012;float wb=0.012/cl;\n#endif\n'+
    'float grat=max(1.0-smoothstep(0.0,wa,abs(fract(ga+0.5)-0.5)),1.0-smoothstep(0.0,wb,abs(fract(gb+0.5)-0.5)));col+=vec3(0.25,0.75,1.0)*grat*mix(0.30,0.05,uReady);\n'+
    'col=vec3(1.0)-exp(-col*1.55);\n'+
    /* beyond the edge: the glow of the air, bright on the Sun\'s side */
    'float halo=exp(-max(rr-1.0,0.0)*13.0);vec2 pd=p/max(rr,0.0001);float side=0.06+0.94*smoothstep(-0.25,0.35,dot(pd,uSunV.xy));vec3 outc=uBg+vec3(0.16,0.44,1.0)*halo*0.6*side;\n'+
    'gl_FragColor=vec4(mix(outc,col,smoothstep(1.0,0.992,rr)),1.0);}'}
  function glSetup(){if(!GLX.ok)return;gen=GLX.gen;P=glProg(VS,fsrc());dot1=glDot();tex={};ready=false;for(var k in imgs)if(imgs[k].done)upload(k);check()}
  function upload(k){if(!GLX.ok||!imgs[k])return;var t=glImageTex(imgs[k].im,true,false,GLX.deriv);if(t)tex[k]=t}
  function check(){ready=!!(tex.day&&tex.lit&&tex.water&&tex.topo)}
  /* the pictures are asked for the first time a world with a globe is entered */
  function load(){
    if(GLX.ok&&gen!==GLX.gen)glSetup();
    if(asked)return;asked=true;PICS.forEach(function(a){
      var im=new Image();imgs[a[0]]={im:im,done:false};im.onload=function(){imgs[a[0]].done=true;if(gen===GLX.gen){upload(a[0]);check()}};im.src=a[1]})}
  /* the three directions of the eye, for a globe turned to put this latitude and longitude in the middle: east, north, and straight out */
  function basis(lat0,lon0,v){var a=lat0*AS.D,b=lon0*AS.D,ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b);
    v.C[0]=ca*cb;v.C[1]=ca*sb;v.C[2]=sa;v.E[0]=-sb;v.E[1]=cb;v.E[2]=0;v.N[0]=-sa*cb;v.N[1]=-sa*sb;v.N[2]=ca;return v}
  function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}
  /* a place on the Earth as a place on the screen; the third number is how squarely it faces us (below zero: the far side) */
  function pr(v,g,o,k){k=(k||1)*g.R;o[0]=g.cx+dot(v,g.E)*k;o[1]=g.cy-dot(v,g.N)*k;o[2]=dot(v,g.C);return o}
  /* the place on the Earth under a point of the screen (latitude, longitude in degrees), or null off the globe */
  function at(x,y,g){var px=(x-g.cx)/g.R,py=-(y-g.cy)/g.R,r2=px*px+py*py;if(r2>=1)return null;var pz=Math.sqrt(1-r2),
    ex=g.E[0]*px+g.N[0]*py+g.C[0]*pz,ey=g.E[1]*px+g.N[1]*py+g.C[1]*pz,ez=g.E[2]*px+g.N[2]*py+g.C[2]*pz;return {lat:Math.asin(clamp(ez,-1,1))/AS.D,lon:Math.atan2(ey,ex)/AS.D,z:pz}}
  /* g: cx, cy, R (CSS pixels) and E, N, C from basis(); o: sun and moon as unit vectors on the Earth, moonK, bg, dim, flow and aur textures (or null), their strengths, time */
  function draw(g,o){
    if(!GLX.ok||GLX.lost)return false;if(gen!==GLX.gen)glSetup();if(!P)return false;
    var gl=GLX.gl,u,bg=o.bg,E3=g.E,N3=g.N,C3=g.C,cx=g.cx,cy=g.cy,R=g.R;glAttrOff();gl.disable(gl.BLEND);u=glUse(P,null);gl.uniform2f(u.uC,cx*DPR,(VH-cy)*DPR);gl.uniform1f(u.uR,R*DPR);
    gl.uniformMatrix3fv(u.uM,false,[E3[0],E3[1],E3[2],N3[0],N3[1],N3[2],C3[0],C3[1],C3[2]]);gl.uniform3f(u.uSun,o.sun[0],o.sun[1],o.sun[2]);
    gl.uniform3f(u.uSunV,dot(o.sun,E3),dot(o.sun,N3),dot(o.sun,C3));gl.uniform3f(u.uMoon,o.moon[0],o.moon[1],o.moon[2]);gl.uniform1f(u.uMoonK,o.moonK||0);
    gl.uniform3f(u.uBg,bg[0],bg[1],bg[2]);gl.uniform1f(u.uReady,ready?1:0);gl.uniform1f(u.uDim,o.dim===undefined?1:o.dim);gl.uniform1f(u.uTime,o.time||0);
    gl.uniform1f(u.uFlowK,o.flow?(o.flowK===undefined?1:o.flowK):0);gl.uniform1f(u.uAurK,o.aur?(o.aurK===undefined?1:o.aurK):0);
    glBind(0,(ready?tex.day:dot1).tex,u.uDay);glBind(1,(ready?tex.lit:dot1).tex,u.uLit);glBind(2,(ready?tex.water:dot1).tex,u.uWater);glBind(3,(ready?tex.topo:dot1).tex,u.uTopo);
    glBind(4,(o.flow||dot1.tex),u.uFlow);glBind(5,(o.aur||dot1.tex),u.uAur);var ck=o.cld&&tex.cld?(o.cldK===undefined?1:o.cldK):0;glBind(6,ck?tex.cld.tex:dot1.tex,u.uCld);gl.uniform1f(u.uCldK,ck);
    var rk=o.rain&&tex.rain?(o.rainK===undefined?1:o.rainK):0;glBind(7,rk?tex.rain.tex:dot1.tex,u.uRain);gl.uniform1f(u.uRainK,rk);gl.uniform1f(u.uSunK,o.sunK||0);
    glBind(9,o.windF||dot1.tex,u.uWindF);gl.uniform1f(u.uFlowA,o.windF&&!reduce?1:0);gl.uniform1f(u.uFlowT,(o.time||0)/7);
    glBind(8,o.wx||dot1.tex,u.uWx);gl.uniform1f(u.uHeatK,o.wx?o.heatK||0:0);gl.uniform1f(u.uWaveK,o.wx?o.waveK||0:0);gl.uniform1f(u.uIsoK,o.wx?o.isoK||0:0);
    /* only the square the globe and its glow fill is worked out */
    var k=R*1.6*DPR,x0=Math.max(0,Math.floor(cx*DPR-k)),y0=Math.max(0,Math.floor((VH-cy)*DPR-k)),x1=Math.min(GLX.w,Math.ceil(cx*DPR+k)),y1=Math.min(GLX.h,Math.ceil((VH-cy)*DPR+k));
    if(x1>x0&&y1>y0){gl.enable(gl.SCISSOR_TEST);gl.scissor(x0,y0,x1-x0,y1-y0);glQuad(P);gl.disable(gl.SCISSOR_TEST)}
    gl.activeTexture(gl.TEXTURE0);return true}
  /* a new picture of the clouds: it replaces the last one, and comes back with the rest if the graphics chip is lost and returned */
  function layer(k,im){imgs[k]={im:im,done:true};if(GLX.ok&&gen===GLX.gen){var old=tex[k];upload(k);if(old&&old!==tex[k])glFree(old)}}
  function cloud(im){layer('cld',im)}
  return {load:load,basis:basis,pr:pr,at:at,draw:draw,dot:dot,cloud:cloud,rain:function(im){layer('rain',im)},hasCloud:function(){return !!tex.cld},hasRain:function(){return !!tex.rain},ready:function(){return ready},gl:function(){gen=-1}}
})();
