/* ---------- SMOKE: ink in water. A real fluid on the graphics chip (Stam's stable fluids: carry the flow along itself, find the
   pressure that keeps it from piling up, take that pressure's push out). A finger drags the water and leaves ink; a tap is a
   drop; a finger that stays is a spring. The screen is nine notes high, and the ink is the colour of the note it was drawn on.
   The bass rolls the water from below, the balafon and kora drip their notes into it as a score.
   Given a photo, the photo is the ink: smear it, and it slowly remembers itself.
   It is also a machine to build in, and a game. Smoke rises (warm ink is light). Walls stop the water and the ink; a fan
   pushes the water one way for as long as it stands (and breathes ink); a prism gives the smoke that passes
   through it its own colour; a drain swallows ink and draws the water in; a tunnel takes the smoke that goes into one end out of the
   other. Two fingers turning make a whirlpool; two fingers closing pull the water in, opening throw it out.
   The game: push the smoke. Vents at the foot of a tank of fixed shape (so it plays the same on any screen) pour coloured smoke up;
   a ring waits where the smoke does not go by itself, and a finger pushes the water (no ink) to bring the smoke through it; the
   ring fills with its own colour only. So many rings in so many seconds a round, each round faster; the best score kept.
   (The owner, 12 Nov: "The smoke game needs to be better": levels, stars, parts to unlock. 13 Nov, evening: "you shouldn't see the
   levels": set-ups at random. 13 Nov, night: "The game is awful": so no more pieces to place and smoke to let go, but this, which
   he chose: "Smoke pours out and you push it with your finger into glowing rings before it fades. Short rounds, a score, faster
   each round".) ---------- */
var DRIFT=(function(){
  var P=null,gen=-1,vel=null,dye=null,prs=null,div=null,curl=null,sw=0,sh=0,dw=0,dh=0,type=0,filt=0,simple=false,ql=-1,szKey='',
    q=[],last={},rows={},photoVer=-1,ink=0,t0=0,
    /* the machine: walls (segments, in fractions of the screen), fans, prisms, drains, tunnels; in a level also its fixed sources,
       walls, winds, prisms and drains, and its rings. obs is the walls drawn into the water's own grid: 1 where there is wall */
    obs=null,obsDirty=true,WB=null,WN=0,TOOL='ink',WALLS=[],FANS=[],DRAINS=[],PRISMS=[],TUNNELS=[],CUPS=[],FIX={walls:[],fans:[],drains:[],prisms:[]},
    /* the game (PZ 0 while it is on): RUN while its vents pour, RT the water's time since a round began (drifting rings keep it).
       GM: the round, the rings it asks for and has, the seconds left (by the water's own clock, so a slow phone is not a harder one),
       the score, the best (kept in this browser), the phase (intro, play, won, over) and when it began, the rings' bursts */
    PZ=-1,pzWon=0,FIXDT=0,SAVED=null,
    GM={round:0,need:0,got:0,left:0,score:0,best:0,phase:'',phT:0,fx:[],cols:[],lastX:.5,lastC:-1},
    RUN=0,TANK=0,TANK0=6,RT=0,EMPTYT=-1,OUTT=0,
    rb=null,rbBuf=null,rbW=0,rbH=0,rbT=0,rbS=0,rbOk=false,simT=0,NOWIN=false,TRACE=null,REC=null,NODRAW=false,want=0,bdrag={},VQ=[],FASTDYE=false,FQ=[],FM=[],GV={};
  /* the five notes of the scale as five inks: E cyan, G green, A amber, B rose, D violet */
  var INK=[[.12,.86,1],[.30,1,.62],[1,.62,.20],[1,.14,.50],[.56,.36,1]];
  var VSB='attribute vec2 a_p;varying vec2 vUv;varying vec2 vL;varying vec2 vR;varying vec2 vT;varying vec2 vB;uniform vec2 uTexel;\n'+
    'void main(){vUv=a_p*0.5+0.5;vL=vUv-vec2(uTexel.x,0.0);vR=vUv+vec2(uTexel.x,0.0);vT=vUv+vec2(0.0,uTexel.y);vB=vUv-vec2(0.0,uTexel.y);gl_Position=vec4(a_p,0.0,1.0);}';
  var H='precision highp float;varying vec2 vUv;varying vec2 vL;varying vec2 vR;varying vec2 vT;varying vec2 vB;\n';
  var F={
    /* carried along by the water. Nothing is carried through a wall: when the way back crosses one, the place keeps what it had (a fast
       jet would otherwise jump a thin wall in one step; and taking nothing there, as it did until 13 Nov, ate the smoke of every jet that
       met a wall, so a jet turned by a wall came away with less than half its smoke) */
    adv:H+'uniform sampler2D uVel;uniform sampler2D uSrc;uniform sampler2D uObs;uniform vec2 uVTexel;uniform vec2 uSTexel;uniform float uDt;uniform float uDiss;uniform float uHO;\n'+
      'vec4 bil(sampler2D s,vec2 uv,vec2 ts){vec2 st=uv/ts-0.5;vec2 i=floor(st);vec2 f=fract(st);vec4 a=texture2D(s,(i+vec2(0.5,0.5))*ts);vec4 b=texture2D(s,(i+vec2(1.5,0.5))*ts);vec4 c=texture2D(s,(i+vec2(0.5,1.5))*ts);vec4 d=texture2D(s,(i+vec2(1.5,1.5))*ts);return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}\n'+
      'void main(){\n#ifdef MANUAL\nvec2 c=vUv-uDt*bil(uVel,vUv,uVTexel).xy*uVTexel;gl_FragColor=uDiss*bil(uSrc,c,uSTexel);\n#else\nvec2 c=vUv-uDt*texture2D(uVel,vUv).xy*uVTexel;gl_FragColor=uDiss*texture2D(uSrc,c);\n#endif\n'+
      'if(uHO>0.5){float o=max(max(texture2D(uObs,mix(vUv,c,0.34)).x,texture2D(uObs,mix(vUv,c,0.67)).x),texture2D(uObs,c).x);gl_FragColor=mix(gl_FragColor,uDiss*texture2D(uSrc,vUv),smoothstep(0.3,0.6,o));}\n}',
    /* add to a field around a point. Ink is added less where there is already plenty, so colours stay colours and never burn out to white */
    spl:H+'uniform sampler2D uT;uniform float uAR;uniform vec3 uCol;uniform vec2 uPt;uniform float uRad;uniform float uSat;\n'+
      'void main(){vec2 p=vUv-uPt;p.x*=uAR;vec3 s=exp(-dot(p,p)/uRad)*uCol;vec3 o=texture2D(uT,vUv).xyz;float full=clamp(max(o.r,max(o.g,o.b))/0.95,0.0,1.0);gl_FragColor=vec4(o+s*(1.0-uSat*full),1.0);}',
    /* how much the water gathers or spreads at each point; a wall next to it counts as the tank's edge does (the water does not go in) */
    div:H+'uniform sampler2D uVel;uniform sampler2D uObs;uniform float uHO;\nvoid main(){float L=texture2D(uVel,vL).x;float R=texture2D(uVel,vR).x;float T=texture2D(uVel,vT).y;float B=texture2D(uVel,vB).y;vec2 C=texture2D(uVel,vUv).xy;'+
      'if(vL.x<0.0){L=-C.x;}if(vR.x>1.0){R=-C.x;}if(vT.y>1.0){T=-C.y;}if(vB.y<0.0){B=-C.y;}'+
      'if(uHO>0.5){if(texture2D(uObs,vL).x>0.5)L=-C.x;if(texture2D(uObs,vR).x>0.5)R=-C.x;if(texture2D(uObs,vT).x>0.5)T=-C.y;if(texture2D(uObs,vB).x>0.5)B=-C.y;}gl_FragColor=vec4(0.5*(R-L+T-B),0.0,0.0,1.0);}',
    curl:H+'uniform sampler2D uVel;\nvoid main(){float L=texture2D(uVel,vL).y;float R=texture2D(uVel,vR).y;float T=texture2D(uVel,vT).x;float B=texture2D(uVel,vB).x;gl_FragColor=vec4(0.5*(R-L-T+B),0.0,0.0,1.0);}',
    vort:H+'uniform sampler2D uVel;uniform sampler2D uCurl;uniform float uK;uniform float uDt;\n'+
      'void main(){float L=texture2D(uCurl,vL).x;float R=texture2D(uCurl,vR).x;float T=texture2D(uCurl,vT).x;float B=texture2D(uCurl,vB).x;float C=texture2D(uCurl,vUv).x;'+
      'vec2 f=0.5*vec2(abs(T)-abs(B),abs(R)-abs(L));f/=length(f)+0.0001;f*=uK*C;f.y*=-1.0;vec2 v=texture2D(uVel,vUv).xy+f*uDt;gl_FragColor=vec4(clamp(v,-1000.0,1000.0),0.0,1.0);}',
    /* the pressure: a wall's cell takes the pressure of the water against it, so the water is pushed back along it */
    prs:H+'uniform sampler2D uP;uniform sampler2D uDiv;uniform sampler2D uObs;uniform float uHO;\nvoid main(){float C=texture2D(uP,vUv).x;float L=texture2D(uP,vL).x;float R=texture2D(uP,vR).x;float T=texture2D(uP,vT).x;float B=texture2D(uP,vB).x;'+
      'if(uHO>0.5){if(texture2D(uObs,vL).x>0.5)L=C;if(texture2D(uObs,vR).x>0.5)R=C;if(texture2D(uObs,vT).x>0.5)T=C;if(texture2D(uObs,vB).x>0.5)B=C;}float d=texture2D(uDiv,vUv).x;gl_FragColor=vec4((L+R+B+T-d)*0.25,0.0,0.0,1.0);}',
    /* and the water made to neither gather nor spread; beside a wall it keeps its speed along the wall and loses only what went into it */
    grad:H+'uniform sampler2D uP;uniform sampler2D uVel;uniform sampler2D uObs;uniform float uHO;\nvoid main(){float C=texture2D(uP,vUv).x;float L=texture2D(uP,vL).x;float R=texture2D(uP,vR).x;float T=texture2D(uP,vT).x;float B=texture2D(uP,vB).x;vec2 v=texture2D(uVel,vUv).xy;'+
      'if(uHO>0.5){float oL=texture2D(uObs,vL).x;float oR=texture2D(uObs,vR).x;float oT=texture2D(uObs,vT).x;float oB=texture2D(uObs,vB).x;if(oL>0.5)L=C;if(oR>0.5)R=C;if(oT>0.5)T=C;if(oB>0.5)B=C;v-=vec2(R-L,T-B);'+
      'if(oL>0.5)v.x=max(v.x,0.0);if(oR>0.5)v.x=min(v.x,0.0);if(oT>0.5)v.y=min(v.y,0.0);if(oB>0.5)v.y=max(v.y,0.0);}else{v-=vec2(R-L,T-B);}gl_FragColor=vec4(v,0.0,1.0);}',
    mul:H+'uniform sampler2D uT;uniform float uK;\nvoid main(){gl_FragColor=uK*texture2D(uT,vUv);}',
    /* the photo's own memory: the ink is drawn back toward the picture, a little each frame (most of the way in about five seconds) */
    heal:H+'uniform sampler2D uT;uniform sampler2D uPh;uniform vec4 uRect;uniform float uK;\n'+
      'void main(){vec3 d=texture2D(uT,vUv).rgb;vec2 q=(vUv-uRect.xy)/uRect.zw;vec3 ph=vec3(0.0);if(q.x>0.0&&q.x<1.0&&q.y>0.0&&q.y<1.0){ph=texture2D(uPh,vec2(q.x,1.0-q.y)).rgb;ph*=ph*1.25;}gl_FragColor=vec4(mix(d,ph,uK),1.0);}',
    show:H+'uniform sampler2D uT;uniform vec3 uBg;uniform float uZ;\n'+
      'void main(){vec3 c=texture2D(uT,vUv).rgb;float dx=length(texture2D(uT,vR).rgb)-length(texture2D(uT,vL).rgb);float dy=length(texture2D(uT,vT).rgb)-length(texture2D(uT,vB).rgb);'+
      'vec3 n=normalize(vec3(dx,dy,uZ));float lit=clamp(dot(n,normalize(vec3(-0.4,0.55,1.0)))+0.5,0.5,1.3);c*=lit;c=1.0-exp(-c*1.3);'+
      'vec2 e=vUv-0.5;float vg=1.0-0.55*dot(e,e);gl_FragColor=vec4(uBg+c*vg,1.0);}',
    /* the walls: nothing passes them */
    msk:H+'uniform sampler2D uT;uniform sampler2D uObs;\nvoid main(){gl_FragColor=texture2D(uT,vUv)*(1.0-texture2D(uObs,vUv).x);}',
    /* smoke rises: the water is lifted where the ink is */
    buo:H+'uniform sampler2D uVel;uniform sampler2D uDye;uniform float uB;\nvoid main(){vec2 v=texture2D(uVel,vUv).xy;vec3 d=texture2D(uDye,vUv).rgb;v.y+=uB*min(dot(d,vec3(0.3,0.5,0.2)),1.5);gl_FragColor=vec4(v,0.0,1.0);}',
    /* a drain (mode 0: the ink fades; mode 1: the water is drawn in), and a whirlpool (mode 2: the water turns round a point) */
    snk:H+'uniform sampler2D uT;uniform vec2 uPt;uniform vec2 uWH;uniform float uRad;uniform float uK;uniform float uMode;uniform vec2 uCell;\n'+
      'void main(){vec2 pp=(vUv-uPt)*uWH;float r2=dot(pp,pp);float g=exp(-r2/uRad);vec4 o=texture2D(uT,vUv);\n'+
      'if(uMode<0.5){gl_FragColor=vec4(o.rgb*(1.0-clamp(uK*g,0.0,1.0)),1.0);}else if(uMode>3.5){float k=smoothstep(0.0,uRad,pp.y);gl_FragColor=vec4(o.rgb*(1.0-clamp(uK*k,0.0,1.0)),1.0);}else if(uMode>2.5){gl_FragColor=vec4(o.xy*(1.0-clamp(uK*g,0.0,1.0)),0.0,1.0);}else{vec2 dir=pp/(sqrt(r2)+1.0);if(uMode>1.5)dir=vec2(-dir.y,dir.x);gl_FragColor=vec4(o.xy-dir*uK*g*uCell,0.0,1.0);}}',
    /* a finger in the game: the smoke within reach of it is drawn in to it a little each frame (sampled from further out), so smoke a
       finger touches keeps to it and goes where it goes */
    mag:H+'uniform sampler2D uT;uniform vec2 uF;uniform vec2 uWH;uniform float uR;uniform float uK;\n'+
      'void main(){float r=length((vUv-uF)*uWH);float w=uK*(1.0-smoothstep(uR*0.35,uR,r));gl_FragColor=vec4(texture2D(uT,uF+(vUv-uF)*(1.0+w)).rgb,1.0);}',
    /* a prism: the smoke inside it takes the prism's colour, as bright as it was */
    tint:H+'uniform sampler2D uT;uniform vec2 uPt;uniform vec2 uWH;uniform float uR;uniform vec3 uCol;\n'+
      'void main(){float r=length((vUv-uPt)*uWH);float k=1.0-smoothstep(uR*0.7,uR,r);vec3 o=texture2D(uT,vUv).rgb;float m=max(o.r,max(o.g,o.b));gl_FragColor=vec4(mix(o,uCol*m,k),1.0);}',
    /* a tunnel: what is in the mouth at A is taken out of it and laid into the mouth at B, place for place */
    tun:H+'uniform sampler2D uT;uniform vec2 uA;uniform vec2 uB;uniform vec2 uWH;uniform float uR;uniform float uK;\n'+
      'void main(){vec3 o=texture2D(uT,vUv).rgb;float ka=1.0-smoothstep(uR*0.55,uR,length((vUv-uA)*uWH));float kb=1.0-smoothstep(uR*0.55,uR,length((vUv-uB)*uWH));'+
      'vec3 s=texture2D(uT,uA+(vUv-uB)).rgb;gl_FragColor=vec4(o*(1.0-uK*ka)+s*(uK*kb),1.0);}'
  };
  var VWL='attribute vec2 a_p;void main(){gl_Position=vec4(a_p,0.0,1.0);}',FWL='precision mediump float;void main(){gl_FragColor=vec4(1.0);}';
  function dbl(w,h){var a=glTarget(w,h,type,filt),b=glTarget(w,h,type,filt);if(!a||!b){glFree(a);glFree(b);return null}return {r:a,w:b,swap:function(){var t=this.r;this.r=this.w;this.w=t}}}
  function freeAll(){[vel,dye,prs].forEach(function(d){if(d){glFree(d.r);glFree(d.w)}});glFree(div);glFree(curl);glFree(obs);glFree(rb);vel=dye=prs=div=curl=obs=rb=null;rbOk=false}
  function glSetup(){
    if(!GLX.ok)return;var gl=GLX.gl;gen=GLX.gen;vel=dye=prs=div=curl=null;szKey='';P={};
    simple=!(GLX.hf&&GLX.hfRT);type=simple?gl.UNSIGNED_BYTE:GLX.hf.HALF_FLOAT_OES;filt=(simple||GLX.hfLin)?gl.LINEAR:gl.NEAREST;
    var man=(!simple&&!GLX.hfLin)?'#define MANUAL\n':'';
    for(var k in F){P[k]=glProg(VSB,k==='adv'?F[k].replace(H,H+man):F[k]);if(!P[k]){P=null;return}}
    P.wall=glProg(VWL,FWL);WB=null;obsDirty=true}
  function size(){
    if(!P)return;var ar=VW/VH,S=(COARSE?[128,96,64]:[160,128,96])[QL],D=(COARSE?[512,384,256]:[720,512,384])[QL];if(FASTDYE)D=Math.min(D,256);
    var w=Math.round(ar>=1?S*ar:S),h=Math.round(ar>=1?S:S/ar),W=Math.round(ar>=1?D*ar:D),Hh=Math.round(ar>=1?D:D/ar),key=w+'x'+h+'x'+W+'x'+Hh;
    if(key===szKey&&dye)return;freeAll();szKey=key;ql=QL;sw=w;sh=h;dw=W;dh=Hh;
    dye=dbl(dw,dh);if(!simple){vel=dbl(sw,sh);prs=dbl(sw,sh);div=glTarget(sw,sh,type,GLX.gl.NEAREST);curl=glTarget(sw,sh,type,GLX.gl.NEAREST);if(!vel||!prs||!div||!curl){freeAll();P=null;return}}
    if(!dye){P=null;return}photoVer=-1;
    obs=glTarget(sw,sh,GLX.gl.UNSIGNED_BYTE,GLX.gl.LINEAR);obsDirty=true;
    rbW=64;rbH=Math.max(16,Math.round(64*VH/VW));rb=glTarget(rbW,rbH,GLX.gl.UNSIGNED_BYTE,GLX.gl.LINEAR);rbBuf=new Uint8Array(rbW*rbH*4);rbOk=false}
  function run(prog,target,texel){var u=glUse(prog,target);if(u.uTexel)GLX.gl.uniform2f(u.uTexel,texel[0],texel[1]);return u}
  /* add to a field around a point: the water's velocity, or ink */
  function splat(d,x,y,r,g,b,rad,sat){var gl=GLX.gl,u=run(P.spl,d.w,[1/d.w.w,1/d.w.h]);glBind(0,d.r.tex,u.uT);gl.uniform1f(u.uAR,VW/VH);gl.uniform3f(u.uCol,r,g,b);gl.uniform2f(u.uPt,x/VW,1-y/VH);gl.uniform1f(u.uRad,rad);gl.uniform1f(u.uSat,sat||0);glQuad(P.spl);d.swap()}
  /* queue a push and some ink at a place on the screen (pixels); the push is in pixels per second */
  function push(x,y,vx,vy,c,amt,rad){if(q.length<64)q.push([x,y,vx,vy,c,amt,rad||.0011])}
  function rowOf(y){return clamp(Math.floor((1-clamp((y-STG.y0)/Math.max(1,STG.h),0,.999))*9),0,8)}
  function pan(x){return clamp(x/VW*1.6-.8,-1,1)}
  var BINK=[hexRgb(BCOL[6]),hexRgb(BCOL[7]),[.9,.95,1]];
  function inkOf(y){return INK[rowOf(y)%5]}
  function note(p,vel){if(!p.ghost)tone('glass',pent(5+rowOf(p.y),40),vel,pan(p.x))}
  /* ---- the machine ---- */
  var MAXW=24,MAXF=6,MAXP=5,MAXD=4,MAXT=3,TH=10;
  /* a level's water: smoke rises less and fades sooner, and the water settles sooner, so what fills a ring is a jet aimed at it, not
     the haze of everything that went before (at a phone's sixty frames a second, smoke left to linger would fill a ring above any jet).
     Since 13 Nov a jet carries about half the ink it did ("too much smoke makes filling the holes too easy") and a ring fills only
     where the smoke is thicker than the haze (f0): measured over all 24 levels with tools/t_place.js, a straight jet gives a ring in
     it about .17 to .25 (density times colour), a jet turned by a wall .08 to .13, the haze of a level with nothing built .00 to .05,
     the edge of a jet .05 to .07. So a ring fills in a second or two of a straight jet, three or four of a turned one, and never from
     the haze or the edge of a jet in the few seconds a tank lasts */
  /* the game's water (14 Nov, measured as a phone at sixty frames a second steps it: a finger carrying the smoke fills a ring in two to
     nine seconds; nobody touching fills none in a whole round, the smoke let out at the top of the tank) */
  var LP={buo:.3,dye:.42,vel:.8,ink:.09,fk:12,f0:.055,fr:.0036,carry:.7,mag:.05,reach:3.2};
  /* (in a level the water fades by its own time, not the clock's: a phone that steps it thirty times a second plays the level as one that
     steps it sixty times does, only slower, so a level tested once is the same level everywhere) */
  function WX(u){return u*VW}function WY(v){return v*VH}
  /* the level's tank: a fixed shape (a little narrower than a phone held upright) fitted into the stage. A level's places are in
     fractions of the tank, and its jets and pieces are as strong, for the tank's size, on any screen */
  var BA=.64,B={x0:0,y0:0,w:1,h:1};
  /* the tank sits under the round's three lines of words, whatever they say at the moment */
  function boardFit(){var y0=STG.y0,d=$('data');try{var r=d.getBoundingClientRect(),lh=parseFloat(getComputedStyle(d).lineHeight)||15.5;if(r.top>0)y0=Math.max(y0,Math.round(r.top+lh*3+8))}catch(e){}
    var h=Math.max(80,STG.y1-y0-6),w=Math.min(STG.w-14,h*BA);h=Math.min(h,w/BA);B.w=w;B.h=h;B.x0=STG.x0+(STG.w-w)/2;B.y0=y0+(STG.y1-y0-h)/2}
  function bx(u){return (B.x0+u*B.w)/VW}function by(v){return (B.y0+v*B.h)/VH}
  /* how strong, for the tank: speeds (pixels a second) and areas (pixels squared) scale with it; splat sizes are in screen heights */
  function KS(){return PZ>=0?B.h/580:1}function KP(){var k=KS();return k*k}function KR(){if(PZ<0)return 1;var f=B.h/VH/.69;return f*f}
  function cupR(){return PZ>=0?Math.min(B.w,B.h)*.085:Math.min(STG.w,STG.h)*.085}
  function tank(){return [[0,0,1,0],[1,0,1,1],[1,1,0,1],[0,1,0,0]].map(function(w){return [bx(w[0]),by(w[1]),bx(w[2]),by(w[3]),2]})}
  var MIXC=[.506,.668,.542];
  /* the best score, kept in this browser */
  function bestGet(){try{return Math.max(0,Math.round(+localStorage.getItem('lc.smoke.best')||0))}catch(e){return 0}}
  function bestSet(){try{localStorage.setItem('lc.smoke.best',String(GM.best))}catch(e){}}
  /* the pieces a hand may build (free play only: the game has none) */
  function given(){return {w:MAXW,f:MAXF,p:null,d:MAXD,t:MAXT}}
  function used(){return WALLS.length+FANS.length+PRISMS.length+DRAINS.length+TUNNELS.length}
  function prismsLeft(){return null}
  /* ===== the game: push the smoke (13 Nov, night: "The game is awful"; asked what instead, he chose "No pieces to place. Smoke
     pours out and you push it with your finger into glowing rings before it fades. Short rounds, a score, faster each round").
     Vents along the foot of the tank pour coloured smoke up; a ring waits somewhere the smoke does not go by itself; a finger pushes
     the water (it leaves no ink, so only the vents' smoke counts) and the ring fills while its own colour streams through it. Each
     round asks for so many rings in so many seconds: more rings, less time and smaller rings as the rounds go, a second colour from
     the third round and a third from the fifth (a ring wants its own colour: the others spoil it), drifting rings from the fourth, a
     wall in the way from the sixth. A tap blows the smoke away from it. Time running out ends the game; the best score is kept. ===== */
  var VENTX=[[.5],[.28,.72],[.2,.5,.8]],VCOL=[0,2,3];
  function gmPlan(n){var k=n<3?1:n<5?2:3;return {need:Math.min(8,3+Math.floor((n-1)/2)),secs:Math.max(18,34-2*n),cols:VCOL.slice(0,k),
    r:Math.max(.7,1.25-.06*(n-1)),drift:n>=4?Math.min(.2,.07+.02*(n-4)):0,wall:n>=6}}
  function gmPlace(){var n=GM.cols.length,X=VENTX[n-1];FIX.walls=tank();
    FIX.fans=GM.cols.map(function(c,i){return {x:bx(X[i]),y:by(.955),dx:0,dy:-1,c:c,fixed:1,ph:0,a0:-Math.PI/2,sa:0,sp:4,u:X[i]}});
    if(GM.wall){var w=GM.wall;FIX.walls.push([bx(w[0]),by(w[1]),bx(w[2]),by(w[3]),1])}
    FIX.drains=[];FIX.prisms=[];obsDirty=true}
  /* a ring somewhere the smoke will not reach by itself: off its vent's column, in the upper two thirds (under the top, where the smoke
     is let out), not where the last one was */
  function gmRing(){var P=gmPlan(GM.round),c,x,y,k,best=null,bs=-1,X=VENTX[GM.cols.length-1];
    c=GM.cols.length>1?GM.cols.filter(function(q){return q!==GM.lastC})[Math.floor(Math.random()*(GM.cols.length-1))]:GM.cols[0];GM.lastC=c;
    var vx=X[GM.cols.indexOf(c)];
    for(k=0;k<24;k++){x=.14+.72*Math.random();y=.24+.38*Math.random();var sc=Math.min(Math.abs(x-vx),.4)+.6*Math.min(Math.abs(x-GM.lastX),.4)-(GM.wall&&Math.abs(y-GM.wall[1])<.08?1:0);
      if(Math.abs(x-vx)<.2)sc-=1;if(sc>bs){bs=sc;best=[x,y]}}
    GM.lastX=best[0];var dm=P.drift?(Math.random()<.5?-1:1)*P.drift:0;
    CUPS=[{x:bx(best[0]),y:by(best[1]),x0:best[0],y0:best[1],mx:dm&&best[0]+dm>.1&&best[0]+dm<.9?dm:-dm,my:0,mp:5+Math.random()*2,c:c,fill:0,match:0,done:false,r:P.r,t0:RT}];
    moveParts()}
  /* a round: its plan, the vents for its colours, a moment to read what it asks, then the smoke */
  function gmRound(n){var P=gmPlan(n);GM.round=n;GM.need=P.need;GM.got=0;GM.left=P.secs;GM.cols=P.cols;GM.lastC=-1;
    GM.wall=P.wall?(function(){var y=.38+.2*Math.random(),x=.25+.3*Math.random();return [x,y,x+.22+.1*Math.random(),y+(Math.random()-.5)*.12]})():null;
    gmPlace();CUPS=[];RUN=0;RT=0;GM.phase='intro';GM.phT=simT;clearInk=true;rbS=simT;toolsSync()}
  function gmStart(){if(PZ<0)SAVED={w:WALLS,f:FANS,d:DRAINS,p:PRISMS,t:TUNNELS};WALLS=[];FANS=[];DRAINS=[];PRISMS=[];TUNNELS=[];
    PZ=0;pzWon=0;TOOL='ink';GM.best=bestGet();GM.score=0;GM.fx=[];boardFit();TANK=TANK0=1e9;gmRound(1);
    SND.load(['vibes','marimba','small']);if(AU.auto)musicOn()}
  /* back to playing freely, with whatever was built before the game */
  function gmOff(){PZ=-1;CUPS=[];FIX={walls:[],fans:[],drains:[],prisms:[]};GM.phase='';RUN=0;
    if(SAVED){WALLS=SAVED.w;FANS=SAVED.f;DRAINS=SAVED.d;PRISMS=SAVED.p;TUNNELS=SAVED.t;SAVED=null}else{WALLS=[];FANS=[];DRAINS=[];PRISMS=[];TUNNELS=[]}
    obsDirty=true;clearInk=true;TOOL='ink';toolsSync()}
  /* the game's own clock, the water's time: the intro, then the round's seconds running down */
  function gmClock(dt){if(PZ<0)return;var e=simT-GM.phT;RT+=dt;
    if(GM.phase==='intro'&&e>1.8){GM.phase='play';GM.phT=simT;RUN=1;RT=0;gmRing();chord([64,71,76],.3,'marimba')}
    else if(GM.phase==='play'){GM.left=Math.max(0,GM.left-dt);if(GM.left<=0)gmOver()}
    else if(GM.phase==='won'&&e>2.2)gmRound(GM.round+1)}
  function gmOver(){GM.phase='over';GM.phT=simT;RUN=0;CUPS=[];
    var nb=GM.score>GM.best;if(nb){GM.best=GM.score;bestSet()}GM.newBest=nb&&GM.score>0;chord([52,59,62],.32,'vibes');toolsSync()}
  /* a ring filled: a burst of its colour, a point, a rising chord; the round won when it has its rings */
  function gmRingDone(cp){GM.got++;GM.score++;GM.fx.push({x:cp.x,y:cp.y,t:simT,c:cp.c});
    for(var k=0;k<14;k++){var a=k/14*TAU;push(WX(cp.x)+Math.cos(a)*8,WY(cp.y)+Math.sin(a)*8,Math.cos(a)*700*KS(),Math.sin(a)*700*KS(),INK[cp.c],.35,.0007*KR())}
    var up=[[64,67,71],[67,71,74],[71,74,78],[74,78,81]][Math.min(3,GM.got-1)];chord(up,.36,'marimba');
    if(GM.got>=GM.need){GM.phase='won';GM.phT=simT;RUN=0;CUPS=[];chord([64,71,76,83],.34,'vibes');toolsSync()}else gmRing()}
  /* a few notes at once, a little rolled, on a real instrument when its sounds are here (glass otherwise) */
  function chord(ms,v,bank){var c=AU.c;if(!c||!soundLive())return;var t=c.currentTime+.01;
    ms.forEach(function(m,i){var nt=SND.note(bank,m);if(nt&&toyOk())toyPlay(nt.b,nt.rate,v,(i-1)*.3,t+i*.045);else tone('glass',m,v*.8,(i-1)*.3,t+i*.045)})}
  function pzRelayout(){if(PZ<0)return;var o={x0:B.x0,y0:B.y0,w:B.w,h:B.h};boardFit();if(o.w===B.w&&o.h===B.h&&o.x0===B.x0&&o.y0===B.y0)return;
    gmPlace();CUPS.forEach(function(c){c.x=bx(c.x0);c.y=by(c.y0)});moveParts()}
  var clearInk=false;
  /* the moving parts, where they are at the water's time RT: a sweeping jet's direction, a drifting ring's place */
  function moveParts(){if(PZ<0)return;
    CUPS.forEach(function(c){var k=.5-.5*Math.cos(TAU*(RT-(c.t0||0))/c.mp);c.x=bx(c.x0+c.mx*k);c.y=by(c.y0+c.my*k)})}
  function AC(){return AU&&AU.c?AU.c.currentTime:0}
  /* the pieces under a point (pixels) */
  function segD(px,py,w){var ax=WX(w[0]),ay=WY(w[1]),bx=WX(w[2]),by=WY(w[3]),dx=bx-ax,dy=by-ay,L=dx*dx+dy*dy,t=L?clamp(((px-ax)*dx+(py-ay)*dy)/L,0,1):0;return Math.hypot(px-ax-t*dx,py-ay-t*dy)}
  function nearest(list,px,py,lim,d){var bi=-1,bd=lim;for(var i=0;i<list.length;i++){var e=d?d(px,py,list[i]):Math.hypot(px-WX(list[i].x),py-WY(list[i].y));if(e<bd){bd=e;bi=i}}return bi}
  function tunD(px,py,t){return Math.min(Math.hypot(px-WX(t.ax),py-WY(t.ay)),Math.hypot(px-WX(t.bx),py-WY(t.by)))}
  /* a wall's ends find the ends already there, so walls join */
  function snap(x,y){var b=null,bd=14;WALLS.concat(FIX.walls).forEach(function(w){[[w[0],w[1]],[w[2],w[3]]].forEach(function(e){var d=Math.hypot(WX(e[0])-x,WY(e[1])-y);if(d<bd){bd=d;b=e}})});return b?[WX(b[0]),WY(b[1])]:[x,y]}
  function buildUp(p,b){
    var tap=p.moved<14&&performance.now()-p.t0<800,g=given(),i;
    if(b.kind==='wall'){if(tap){i=nearest(WALLS,p.x,p.y,16,segD);if(i>=0){WALLS.splice(i,1);obsDirty=true;hit('tok',.3,pan(p.x))}return}
      if(WALLS.length>=g.w)return;var a=snap(b.x0,b.y0),e=snap(p.x,p.y);if(Math.hypot(e[0]-a[0],e[1]-a[1])<16)return;
      WALLS.push([a[0]/VW,a[1]/VH,e[0]/VW,e[1]/VH,0]);obsDirty=true;hit('thump',.32,pan(p.x));return}
    if(b.kind==='fan'){i=nearest(FANS,b.x0,b.y0,20);if(tap&&i>=0){FANS.splice(i,1);hit('tok',.3,pan(p.x));return}
      if(FANS.length>=g.f)return;var dx=p.x-b.x0,dy=p.y-b.y0,m=Math.hypot(dx,dy);if(m<18){dx=0;dy=-1;m=1}
      FANS.push({x:b.x0/VW,y:b.y0/VH,dx:dx/m,dy:dy/m,c:PZ>=0?-1:rowOf(b.y0)%5,ph:Math.random()*TAU});tone('kal',pent(5+rowOf(b.y0),40),.4,pan(b.x0));return}
    if(b.kind==='prism'){i=nearest(PRISMS,p.x,p.y,cupR()*.9);if(i>=0){PRISMS.splice(i,1);hit('tok',.3,pan(p.x));return}
      var lf=prismsLeft(),col=lf?lf[0]:rowOf(p.y)%5;if(lf&&!lf.length)return;if(!lf&&PRISMS.length>=MAXP)return;
      PRISMS.push({x:p.x/VW,y:p.y/VH,c:col,ph:0});tone('glass',pent(5+rowOf(p.y),52),.3,pan(p.x));return}
    if(b.kind==='drain'){i=nearest(DRAINS,p.x,p.y,22);if(i>=0){DRAINS.splice(i,1);hit('tok',.3,pan(p.x));return}
      if(DRAINS.length>=g.d)return;DRAINS.push({x:p.x/VW,y:p.y/VH,ph:0});tone('bowl',pent(1,40),.3,pan(p.x));return}
    if(b.kind==='tunnel'){if(tap){i=nearest(TUNNELS,p.x,p.y,cupR(),tunD);if(i>=0){TUNNELS.splice(i,1);hit('tok',.3,pan(p.x))}return}
      if(TUNNELS.length>=g.t)return;if(Math.hypot(p.x-b.x0,p.y-b.y0)<cupR()*2.6)return;
      TUNNELS.push({ax:b.x0/VW,ay:b.y0/VH,bx:p.x/VW,by:p.y/VH,ph:0});tone('bowl',pent(3,40),.3,pan(b.x0));tone('bowl',pent(5,40),.26,pan(p.x),AC()+.12)}}
  /* the walls into the water's grid: each a band TH pixels wide with round ends */
  function obsBuild(){
    obsDirty=false;if(!obs||!P||!P.wall)return;var gl=GLX.gl,all=WALLS.concat(FIX.walls),v=[],i,k;
    function pt(x,y){v.push(x/VW*2-1,1-y/VH*2)}
    /* a level's own walls are thicker in the water than they look: a jet pressing on a thin wall for long seeps through it */
    for(i=0;i<all.length;i++){var w=all[i],th=w[4]===1?18:w[4]===2?14:TH,ax=WX(w[0]),ay=WY(w[1]),bx=WX(w[2]),by=WY(w[3]),dx=bx-ax,dy=by-ay,m=Math.hypot(dx,dy)||1,nx=-dy/m*th/2,ny=dx/m*th/2;
      pt(ax+nx,ay+ny);pt(bx+nx,by+ny);pt(bx-nx,by-ny);pt(ax+nx,ay+ny);pt(bx-nx,by-ny);pt(ax-nx,ay-ny);
      [[ax,ay],[bx,by]].forEach(function(c){for(k=0;k<8;k++){var a0=k/8*TAU,a1=(k+1)/8*TAU,r=th/2;pt(c[0],c[1]);pt(c[0]+Math.cos(a0)*r,c[1]+Math.sin(a0)*r);pt(c[0]+Math.cos(a1)*r,c[1]+Math.sin(a1)*r)}})}
    glUse(P.wall,obs);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);WN=v.length/2;
    if(WN){if(!WB)WB=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,WB);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(v),gl.DYNAMIC_DRAW);var a=P.wall.a.a_p;gl.enableVertexAttribArray(a);
      gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLES,0,WN);gl.disableVertexAttribArray(a)}}
  /* the rings, measured: the ink is copied small and read back a few times a second */
  function readBack(){
    if(!rb||!dye)return;var gl=GLX.gl,u=run(P.mul,rb,[1/rbW,1/rbH]);glBind(0,dye.r.tex,u.uT);gl.uniform1f(u.uK,1);glQuad(P.mul);
    try{gl.readPixels(0,0,rbW,rbH,gl.RGBA,gl.UNSIGNED_BYTE,rbBuf);rbOk=true}catch(e){rbOk=false}}
  /* how much smoke of a colour is in a circle: its density, times how close the circle's colour, taken all together, is to the
     colour wanted. Smoke of another colour in the circle spoils it (jets push each other aside rather than mix, so a ring is only
     its colour when nothing else reaches it); a white ring (mix) wants cyan and amber in it together, streaks and all */
  function sample(x,y,r,tc,mix){
    if(!rbOk)return {dens:0,match:0};var i0=Math.max(0,Math.floor((x-r)/VW*rbW)),i1=Math.min(rbW-1,Math.ceil((x+r)/VW*rbW)),j0=Math.max(0,Math.floor((VH-y-r)/VH*rbH)),j1=Math.min(rbH-1,Math.ceil((VH-y+r)/VH*rbH)),
      n=0,dn=0,ds=0,i,j,sR=0,sG=0,sB=0;
    for(j=j0;j<=j1;j++)for(i=i0;i<=i1;i++){var px=(i+.5)/rbW*VW,py=VH-(j+.5)/rbH*VH;if(Math.hypot(px-x,py-y)>r)continue;var o=(j*rbW+i)*4,R=rbBuf[o]/255,G=rbBuf[o+1]/255,Bl=rbBuf[o+2]/255,d=Math.max(R,G,Bl);n++;dn+=d;
      if(d>.04){ds+=Math.min(d,1);sR+=R;sG+=G;sB+=Bl}}
    if(!n)return {dens:0,match:0};var mt=0;
    if(tc&&ds>0){var sl=Math.sqrt(sR*sR+sG*sG+sB*sB),tl=Math.sqrt(tc[0]*tc[0]+tc[1]*tc[1]+tc[2]*tc[2]),sim=(sR*tc[0]+sG*tc[1]+sB*tc[2])/(sl*tl),lo=mix?.955:.93,hi=mix?.99:.985;
      mt=ds*smooth((sim-lo)/(hi-lo))}
    return {dens:dn/n,match:mt/n}}
  /* a ring fills while smoke of its colour streams through it, and empties again when it stops: a passing puff is not enough */
  function cupsCheck(dt){
    if(!CUPS.length||(PZ>=0&&(!RUN||GM.phase!=='play')))return;var done=null;
    CUPS.forEach(function(c){var r=cupR()*(c.r||1),m=sample(WX(c.x),WY(c.y),r*.9,c.c==='mix'?MIXC:INK[c.c],c.c==='mix');c.match=m.match;
      if(!c.done){c.fill=clamp(c.fill+dt*LP.fk*(m.match-LP.f0),0,1);if(c.fill>=1){c.done=true;done=c}}});
    if(TRACE&&TRACE.length<4000)TRACE.push([dt].concat(CUPS.map(function(c){return c.match})));
    if(done&&PZ>=0&&!NOWIN)gmRingDone(done)}
  /* the tools, in a row along the bottom in this world only. In a level only the pieces it gives; outside the levels, the pieces
     reached so far */
  var TOOLS=[['ink','hand','<path d="M6 13.5c-1.6-1.8-.9-3.9.6-5.4L10 4.8c.6-.6 1.5-.5 2 .1.4.5.3 1.2-.1 1.7l-1.3 1.4 2.1-2c.6-.6 1.4-.6 1.9 0 .5.5.4 1.3-.1 1.8l-2.2 2.2 1.4-1.3c.5-.5 1.3-.5 1.8 0s.4 1.3-.1 1.8l-3.4 3.4c-1.8 1.8-4.3 2-6 .2z"/>'],
    ['wall','wall','<path d="M3 15.5L15.5 3"/><circle cx="3" cy="15.5" r="1.4"/><circle cx="15.5" cy="3" r="1.4"/>'],
    ['fan','fan','<circle cx="9.2" cy="9.2" r="1.6"/><path d="M9.2 7.6c0-3 1.4-4.6 3.2-4.2 1.5.4 1.4 2.6-1.5 4.6M10.8 9.2c3 0 4.6 1.4 4.2 3.2-.4 1.5-2.6 1.4-4.6-1.5M9.2 10.8c0 3-1.4 4.6-3.2 4.2-1.5-.4-1.4-2.6 1.5-4.6M7.6 9.2c-3 0-4.6-1.4-4.2-3.2.4-1.5 2.6-1.4 4.6 1.5"/>'],
    ['prism','prism','<path d="M9.2 2.4l5.9 3.4v6.8l-5.9 3.4-5.9-3.4V5.8z"/><path d="M9.2 2.4v13.6"/>'],
    ['drain','drain','<circle cx="9.2" cy="9.2" r="6.4"/><path d="M9.2 5.4a3.8 3.8 0 1 1-3.6 2.6M9.2 7.8a1.4 1.4 0 1 1-1.3 1.9"/>'],
    ['tunnel','tunnel','<circle cx="4.2" cy="13.8" r="2.3"/><circle cx="14.2" cy="4.6" r="2.3"/><path d="M5.6 11.9C6.6 7.6 9.4 5.6 11.9 5"/>'],
    ['puz','play','<path d="M5.4 3.6l9.4 5.6-9.4 5.6z"/>'],
    ['undo','free','<path d="M3.4 14.8c2-3.6 4.2-.2 6.2-3.6s4.2-.6 5.8-3.6M4.2 6.6c1.6-2.4 3.4-.4 5-2.6"/>']];
  var PLAYI=['<path d="M5.4 3.6l9.4 5.6-9.4 5.6z"/>','<path d="M14.6 7.4A5.8 5.8 0 1 0 15 11.6M15 3.6v3.8h-3.8"/>'];
  function toolsBuild(){
    var r=$('tools');if(!r||r.childNodes.length)return;
    TOOLS.forEach(function(t){var b=document.createElement('button');b.type='button';b.className='tb';b.id='t_'+t[0];
      b.innerHTML='<span></span><svg viewBox="0 0 18.4 18.4" aria-hidden="true">'+t[2]+'</svg>';b.firstChild.textContent=t[1];
      b.addEventListener('click',function(){
        if(t[0]==='puz'){gmStart();toolsSync();return}
        if(t[0]==='undo'){gmOff();return}
        TOOL=t[0];toolsSync()});r.appendChild(b)})}
  function toolsSync(){var g=given(),r=$('tools'),h0=r?r.offsetHeight:0;TOOLS.forEach(function(t){var b=$('t_'+t[0]);if(!b)return;
      /* play, and in a game: start again */
      if(t[0]==='puz'){var pl=PZ<0?'play':'again';if(b.firstChild.textContent!==pl){b.firstChild.textContent=pl;b.lastChild.innerHTML=PLAYI[PZ<0?0:1]}b.setAttribute('aria-pressed','false');return}
      if(t[0]==='undo'){b.hidden=PZ<0;return}
      /* in a game there is nothing to build: a finger only pushes */
      b.setAttribute('aria-pressed',TOOL===t[0]?'true':'false');b.hidden=PZ>=0});
    if(r&&!r.hidden&&r.offsetHeight!==h0){layout();pzRelayout()}}
  function enter(){if(GLX.ok&&gen!==GLX.gen)glSetup();size();t0=FT;lastT=0;GM.best=bestGet();toolsBuild();var r=$('tools');if(r)r.hidden=false;toolsSync()}
  function leave(){last={};rows={};q.length=0;bdrag={};var r=$('tools');if(r)r.hidden=true}
  /* (the stage is measured again by the world switch once the row is shown or put away) */
  function down(p){
    if(!p.ghost&&PZ<0&&TOOL!=='ink'&&p.n<2){bdrag[p.id]={kind:TOOL,x0:p.x,y0:p.y};return}
    last[p.id]={x:p.x,y:p.y};rows[p.id]=rowOf(p.y);note(p,.5)}
  function up(p){
    var b=bdrag[p.id];if(b){delete bdrag[p.id];buildUp(p,b);toolsSync();return}
    delete GV[p.id];var l=last[p.id];delete last[p.id];delete rows[p.id];if(!l)return;
    if(PZ>=0){if(FT-p.t0<260&&p.moved<14){var ks0=KS();for(var g=0;g<10;g++){var ag=g/10*TAU;push(p.x+Math.cos(ag)*12,p.y+Math.sin(ag)*12,Math.cos(ag)*900*ks0,Math.sin(ag)*900*ks0,[0,0,0],0,.0012*KR())}}return}
    /* a tap is a drop: the ink bursts outward */
    if(FT-p.t0<260&&p.moved<14){var c=inkOf(p.y);for(var k=0;k<8;k++){var a=k/8*TAU+.3;push(p.x+Math.cos(a)*10,p.y+Math.sin(a)*10,Math.cos(a)*520,Math.sin(a)*520,c,.55,.0007)}}}
  function tick(dt,t){
    var i,ps=PS,r=Math.random;
    /* in the game a finger moves the water, more widely, and leaves no ink (only the vents' smoke counts); the smoke under a moving
       finger is carried along with it, and the smoke within reach of a finger is drawn in to it, so smoke a finger touches keeps to it
       and can be led into a ring (14 Nov: a stroke alone moved the plume for a moment, and it stood up again before the ring filled) */
    FM.length=0;
    var fk=PZ>=0?0:1,fr0=PZ>=0?LP.fr:.0011;
    for(i=0;i<ps.length;i++){var p=ps[i];if(!p.down||bdrag[p.id])continue;var l=last[p.id];if(!l){l=last[p.id]={x:p.x,y:p.y};rows[p.id]=rowOf(p.y)}
      var dx=p.x-l.x,dy=p.y-l.y,len=Math.hypot(dx,dy);
      if(len>.5){var k=1/Math.max(dt,.008),vx=dx*k,vy=dy*k,m=Math.hypot(vx,vy),cap=VW*5;if(m>cap){vx*=cap/m;vy*=cap/m}
        if(PZ>=0&&FQ.length<6)FQ.push([l.x/VW,l.y/VH,p.x/VW,p.y/VH]);
        push(p.x,p.y,vx,vy,inkOf(p.y),clamp(len/52,.04,.7)*fk,fr0);l.x=p.x;l.y=p.y;
        var rw=rowOf(p.y);if(PZ<0&&rw!==rows[p.id]){rows[p.id]=rw;note(p,.3+.5*Math.min(1,p.spd/900))}}
      else if(PZ<0&&t-p.t0>300){push(p.x+(r()-.5)*6,p.y+(r()-.5)*6,(r()-.5)*90,-60-r()*60,inkOf(p.y),.07*fk,.0016)}
      if(PZ>=0&&FM.length<3)FM.push([p.x/VW,p.y/VH])}
    if(PZ>=0)GM.fx=GM.fx.filter(function(f){return simT-f.t<1.2});
    /* the machine runs: fans push and (outside the levels) breathe ink; a level's sources breathe their own colours, its winds only push */
    var fr=Math.min(1,dt*60),ks=KS(),kr=KR(),kp=KP(),lv=PZ>=0,idle=lv&&!RUN,
      /* in a level the ink a source gives goes by the water's time, so a phone at thirty frames a second gives what one at sixty does */
      frl=lv?Math.min(FIXDT||dt,1/45)*60:fr;
    if(lv)moveParts();
    FANS.forEach(function(f){if(idle)return;f.ph+=dt*9;push(WX(f.x)+f.dx*10,WY(f.y)+f.dy*10,f.dx*820*ks,f.dy*820*ks,INK[f.c]||INK[0],PZ>=0||f.c<0?0:.05*fr,.0009*kr)});
    /* in the game a finger takes the stream of the vent it came down nearest to, and the vent turns its stream towards the finger
       wherever it goes (14 Nov, measured: a finger alone could not bend a stream far enough, or keep it bent, to fill a ring) */
    if(lv&&FIX.fans.length){var aim={};for(i=0;i<ps.length;i++){var pq=ps[i];if(!pq.down||pq.ghost)continue;var nv=GV[pq.id];
        if(nv===undefined||nv>=FIX.fans.length){var nd=1e9;nv=0;FIX.fans.forEach(function(f,j){var d2=Math.hypot(pq.x-WX(f.x),pq.y-WY(f.y));if(d2<nd){nd=d2;nv=j}});GV[pq.id]=nv}aim[nv]=pq}
      FIX.fans.forEach(function(f,j){if(f.a===undefined)f.a=-Math.PI/2;var ta=-Math.PI/2,q2=aim[j];
        if(q2){ta=Math.atan2(q2.y-WY(f.y),q2.x-WX(f.x));if(ta>0)ta=q2.x<WX(f.x)?-Math.PI+.35:-.35;ta=clamp(ta,-Math.PI+.35,-.35)}
        f.a+=clamp(ta-f.a,-1,1)*Math.min(1,dt*7);f.dx=Math.cos(f.a);f.dy=Math.sin(f.a)})}
    FIX.fans.forEach(function(f){if(f.c<0){if(lv&&!RUN)return;f.ph+=dt*7;push(WX(f.x)+f.dx*10,WY(f.y)+f.dy*10,f.dx*820*ks,f.dy*820*ks,INK[0],0,.0009*kr);return}
      if(lv&&!(RUN&&TANK>0))return;f.ph+=dt*7;
      push(WX(f.x)+f.dx*8,WY(f.y)+f.dy*8,f.dx*760*ks+(r()-.5)*50*ks,f.dy*760*ks+(r()-.5)*50*ks,INK[f.c],LP.ink*frl,.0013*kr)});
    /* a drain draws the water in and swallows the ink near it; in a level it swallows a jet that runs into it whole, its push as well
       as its ink, so the jet stops there (a drain that took only the ink would leave the jet's push to shove the other smoke aside) */
    /* in the game the top of the tank lets the smoke out: what reaches it goes, instead of spreading back down the sides as a haze
       that would fill a ring with nobody pushing (14 Nov) */
    if(PZ>=0&&RUN)VQ.push([WX(bx(.5)),WY(by(.14)),.3*fr,4,B.h*.12]);
    DRAINS.concat(FIX.drains).forEach(function(d){d.ph+=dt*3;if(idle)return;VQ.push([WX(d.x),WY(d.y),(PZ>=0?.85:.55)*fr,0,1300*kp],[WX(d.x),WY(d.y),300*ks,1,900*kp]);
      if(PZ>=0)VQ.push([WX(d.x),WY(d.y),.5*fr,3,1300*kp])});
    /* a tunnel draws the water into one end and blows it out of the other, the way it was dug */
    var tr=cupR()*.75;TUNNELS.forEach(function(u){u.ph+=dt*2;if(idle)return;var ax=WX(u.ax),ay=WY(u.ay),bx2=WX(u.bx),by2=WY(u.by),m=Math.hypot(bx2-ax,by2-ay)||1,ux=(bx2-ax)/m,uy=(by2-ay)/m;
      VQ.push([ax,ay,240*ks,1,tr*tr*1.3]);push(bx2+ux*tr*.5,by2+uy*tr*.5,ux*700*ks,uy*700*ks,INK[0],0,.0010*kr)});
    PRISMS.forEach(function(p){p.ph=(p.ph||0)+dt});
    /* the rings are measured a few times a second, and fill by the water's own time (a slow phone fills them no faster than the smoke moves) */
    if(CUPS.length&&FT-rbT>280){var dtc=simT-rbS;rbS=simT;rbT=FT;want=1;cupsCheck(clamp(dtc,0,.6))}
    /* the band in the water. With a photo in it, the band only moves the water (and more gently): the photo stays the only ink */
    var pk=PHOTO.has?0:1,pv=PHOTO.has?.4:1;
    for(i=0;PZ<0&&i<BD.flow.length;i++){var h=BD.flow[i],s=h.s,x=STG.x0+STG.w*(.06+.88*BD.ph);
      if(h.i===5)push(VW*(.25+.5*r()),STG.y1-6,(r()-.5)*140*pv,-250*s*pv,[.03,.09,.34],.15*s*pk,.0026);
      else if(h.i===6)push(x,STG.y0+STG.h*.6,(r()-.5)*50,80*s*pv,BINK[0],.55*s*pk,.0008);
      else if(h.i===7)push(x,STG.y0+STG.h*.36,(r()-.5)*50,70*s*pv,BINK[1],.55*s*pk,.0008);
      else if(h.i===8)push(x,STG.y0+STG.h*.16,(r()-.5)*90,90*s*pv,BINK[2],.4*s*pk,.0006);
      else if(h.i===0&&s>.6)push(STG.cx,STG.cy,(r()-.5)*200,(r()-.5)*200,[0,0,0],0,.02);
      else if(h.i===1)push(VW*r(),STG.y0+STG.h*r(),(r()-.5)*70,(r()-.5)*70,[0,0,0],0,.0009)}
    ink+=((q.length?1:0)-ink)*Math.min(1,dt*2)}
  /* two fingers: turning makes a whirlpool where they are, closing pulls the water in, opening throws it out */
  function gesture(e){if(e.ghost||bdrag[Object.keys(bdrag)[0]])return;
    if(Math.abs(e.rot)>.004)VQ.push([e.cx,e.cy,-e.rot/e.dt*95,2,3600]);
    if(Math.abs(e.scale-1)>.004)VQ.push([e.cx,e.cy,(1-e.scale)/e.dt*700,1,5200])}
  function step(dtr){
    /* the water is moved in small steps so it stays steady; what fades, fades by the real clock */
    var gl=GLX.gl,u,i,vt=[1/sw,1/sh],dt2=[1/dw,1/dh],dt=Math.min(dtr,1/45);simT+=dt;
    if(PZ>=0)gmClock(dt);
    /* the photo, when it arrives or changes, floods the water */
    var ph=PHOTO.has?photoTex():null,rc=null;
    if(ph){var pr=photoRect();rc=[pr.x/VW,1-(pr.y+pr.h)/VH,pr.w/VW,pr.h/VH]}
    if(ph&&photoVer!==PHOTO.ver){photoVer=PHOTO.ver;u=run(P.heal,dye.w,dt2);glBind(0,dye.r.tex,u.uT);glBind(1,ph.tex,u.uPh);gl.uniform4f(u.uRect,rc[0],rc[1],rc[2],rc[3]);gl.uniform1f(u.uK,1);glQuad(P.heal);dye.swap()}
    if(!ph&&photoVer!==-1&&!PHOTO.has)photoVer=-1;
    if(obsDirty)obsBuild();
    if(clearInk){clearInk=false;u=run(P.mul,dye.w,dt2);glBind(0,dye.r.tex,u.uT);gl.uniform1f(u.uK,.0);glQuad(P.mul);dye.swap();
      if(PZ>=0&&vel){u=run(P.mul,vel.w,vt);glBind(0,vel.r.tex,u.uT);gl.uniform1f(u.uK,.0);glQuad(P.mul);vel.swap()}}
    for(i=0;i<q.length;i++){var s=q[i],c=s[4],a=s[5];
      if(!simple)splat(vel,s[0],s[1],s[2]/VW*sw,-s[3]/VH*sh,0,s[6]);
      if(a>0)splat(dye,s[0],s[1],c[0]*a,c[1]*a,c[2]*a,s[6]*(simple?1.6:1),1)}
    q.length=0;
    /* drains and whirlpools: [x, y, strength, mode (0 eat ink, 1 draw in, 2 whirl, 3 stop the water, 4 eat ink above a line, more
       and more over the next so many pixels), radius in pixels squared (mode 4: those pixels) */
    for(i=0;i<VQ.length&&i<24;i++){var v=VQ[i],tg=v[3]===0||v[3]===4?dye:vel;if(!tg)continue;u=run(P.snk,tg.w,[1/tg.w.w,1/tg.w.h]);glBind(0,tg.r.tex,u.uT);gl.uniform2f(u.uPt,v[0]/VW,1-v[1]/VH);
      gl.uniform2f(u.uWH,VW,VH);gl.uniform1f(u.uRad,v[4]);gl.uniform1f(u.uK,v[2]);gl.uniform1f(u.uMode,v[3]);gl.uniform2f(u.uCell,sw/VW,sh/VH);glQuad(P.snk);tg.swap()}
    VQ.length=0;
    /* prisms colour the smoke in them; tunnels carry it from one end to the other */
    var pr2=cupR()*.8,all=FIX.prisms.concat(PRISMS);
    for(i=0;i<all.length;i++){var pm=all[i],col=INK[pm.c]||INK[0];u=run(P.tint,dye.w,dt2);glBind(0,dye.r.tex,u.uT);gl.uniform2f(u.uPt,pm.x,1-pm.y);gl.uniform2f(u.uWH,VW,VH);gl.uniform1f(u.uR,pr2);gl.uniform3f(u.uCol,col[0],col[1],col[2]);glQuad(P.tint);dye.swap()}
    var tr=cupR()*.75;
    for(i=0;i<TUNNELS.length;i++){var tn=TUNNELS[i];u=run(P.tun,dye.w,dt2);glBind(0,dye.r.tex,u.uT);gl.uniform2f(u.uA,tn.ax,1-tn.ay);gl.uniform2f(u.uB,tn.bx,1-tn.by);gl.uniform2f(u.uWH,VW,VH);gl.uniform1f(u.uR,tr);gl.uniform1f(u.uK,.55);glQuad(P.tun);dye.swap()}
    /* in the game a moving finger carries the smoke under it along with it, as the tunnels do (14 Nov: the water alone let most of it
       slip past the finger and fade on the way) */
    for(i=0;i<FQ.length;i++){var fq=FQ[i];u=run(P.tun,dye.w,dt2);glBind(0,dye.r.tex,u.uT);gl.uniform2f(u.uA,fq[0],1-fq[1]);gl.uniform2f(u.uB,fq[2],1-fq[3]);gl.uniform2f(u.uWH,VW,VH);gl.uniform1f(u.uR,cupR()*.8);gl.uniform1f(u.uK,LP.carry);glQuad(P.tun);dye.swap()}
    FQ.length=0;
    for(i=0;i<FM.length;i++){var fm=FM[i];u=run(P.mag,dye.w,dt2);glBind(0,dye.r.tex,u.uT);gl.uniform2f(u.uF,fm[0],1-fm[1]);gl.uniform2f(u.uWH,VW,VH);gl.uniform1f(u.uR,cupR()*LP.reach);gl.uniform1f(u.uK,LP.mag*Math.min(dt*60,2));glQuad(P.mag);dye.swap()}
    if(!simple){
      u=run(P.curl,curl,vt);glBind(0,vel.r.tex,u.uVel);glQuad(P.curl);
      u=run(P.vort,vel.w,vt);glBind(0,vel.r.tex,u.uVel);glBind(1,curl.tex,u.uCurl);gl.uniform1f(u.uK,20);gl.uniform1f(u.uDt,dt);glQuad(P.vort);vel.swap();
      /* smoke rises (in a level, as fast for the tank's height on any screen) */
      u=run(P.buo,vel.w,vt);glBind(0,vel.r.tex,u.uVel);glBind(1,dye.r.tex,u.uDye);gl.uniform1f(u.uB,(reduce?18:64)*dt*(PZ>=0?LP.buo*clamp(B.h/VH*sh/197,.5,2):1));glQuad(P.buo);vel.swap();
      var ho=WN&&obs?1:0;u=run(P.div,div,vt);glBind(0,vel.r.tex,u.uVel);glBind(1,obs?obs.tex:null,u.uObs);gl.uniform1f(u.uHO,ho);glQuad(P.div);
      u=run(P.mul,prs.w,vt);glBind(0,prs.r.tex,u.uT);gl.uniform1f(u.uK,.8);glQuad(P.mul);prs.swap();
      var it=[18,14,10][QL];for(i=0;i<it;i++){u=run(P.prs,prs.w,vt);glBind(0,prs.r.tex,u.uP);glBind(1,div.tex,u.uDiv);glBind(2,obs?obs.tex:null,u.uObs);gl.uniform1f(u.uHO,ho);glQuad(P.prs);prs.swap()}
      u=run(P.grad,vel.w,vt);glBind(0,prs.r.tex,u.uP);glBind(1,vel.r.tex,u.uVel);glBind(2,obs?obs.tex:null,u.uObs);gl.uniform1f(u.uHO,ho);glQuad(P.grad);vel.swap();
      if(WN){u=run(P.msk,vel.w,vt);glBind(0,vel.r.tex,u.uT);glBind(1,obs.tex,u.uObs);glQuad(P.msk);vel.swap()}
      u=run(P.adv,vel.w,vt);glBind(0,vel.r.tex,u.uVel);glBind(1,vel.r.tex,u.uSrc);glBind(2,obs?obs.tex:null,u.uObs);gl.uniform1f(u.uHO,WN&&obs?1:0);gl.uniform2f(u.uVTexel,vt[0],vt[1]);gl.uniform2f(u.uSTexel,vt[0],vt[1]);gl.uniform1f(u.uDt,dt);gl.uniform1f(u.uDiss,Math.exp(-(PZ>=0?LP.vel*dt:.22*dtr)));glQuad(P.adv);vel.swap();
      u=run(P.adv,dye.w,dt2);glBind(0,vel.r.tex,u.uVel);glBind(1,dye.r.tex,u.uSrc);glBind(2,obs?obs.tex:null,u.uObs);gl.uniform1f(u.uHO,WN&&obs?1:0);gl.uniform2f(u.uVTexel,vt[0],vt[1]);gl.uniform2f(u.uSTexel,dt2[0],dt2[1]);gl.uniform1f(u.uDt,dt);gl.uniform1f(u.uDiss,ph?1:Math.exp(-(PZ>=0?LP.dye*dt:.36*dtr)));glQuad(P.adv);dye.swap()}
    else{u=run(P.mul,dye.w,dt2);glBind(0,dye.r.tex,u.uT);gl.uniform1f(u.uK,ph?1:Math.exp(-dtr*.5));glQuad(P.mul);dye.swap()}
    if(WN){u=run(P.msk,dye.w,dt2);glBind(0,dye.r.tex,u.uT);glBind(1,obs.tex,u.uObs);glQuad(P.msk);dye.swap()}
    if(ph){u=run(P.heal,dye.w,dt2);glBind(0,dye.r.tex,u.uT);glBind(1,ph.tex,u.uPh);gl.uniform4f(u.uRect,rc[0],rc[1],rc[2],rc[3]);gl.uniform1f(u.uK,1-Math.exp(-dtr/4.5));glQuad(P.heal);dye.swap()}}
  var lastT=0;
  function draw(t){
    if(!GLX.ok||GLX.lost)return;if(gen!==GLX.gen)glSetup();if(P&&(ql!==QL||!dye))size();
    var gl=GLX.gl;glAttrOff();
    if(!P||!dye){glClear(ABYSS[0],ABYSS[1],ABYSS[2]);return}
    gl.disable(gl.BLEND);var dt=FIXDT||(lastT?Math.min(.1,Math.max(.001,(t-lastT)/1000)):.016);lastT=t;
    step(dt);if(want){want=0;readBack()}
    if(REC&&!REC.done)recStep();
    if(NODRAW)return;
    var u=run(P.show,null,[1/dw,1/dh]);glBind(0,dye.r.tex,u.uT);gl.uniform3f(u.uBg,ABYSS[0],ABYSS[1],ABYSS[2]);gl.uniform1f(u.uZ,.55);glQuad(P.show);
    pieces(t)}
  function cs(col,a){return cpre(col)+a+')'}
  /* the colour without its alpha, to finish with one: cpre(col)+'.5)'. (Until 13 Nov the rings and the jets were built as cs(col,'')+'.75)',
     which no browser can read, so they kept the grey of the line drawn before them and never showed their colour) */
  function cpre(col){return 'rgba('+Math.round(col[0]*255)+','+Math.round(col[1]*255)+','+Math.round(col[2]*255)+','}
  /* the machine drawn over the water: walls as lit tubes, fans turning, prisms, drains swirling, tunnels, the level's rings filling */
  function pieces(t){
    var c=OV,i,k,cr=cupR();
    function wall(w,fixed){if(fixed===2){c.strokeStyle='rgba(150,180,200,.22)';c.lineWidth=1.2;c.beginPath();c.moveTo(WX(w[0]),WY(w[1]));c.lineTo(WX(w[2]),WY(w[3]));c.stroke();return}
      c.strokeStyle=fixed?'rgba(120,150,170,.55)':'rgba(62,240,255,.28)';c.lineWidth=TH+4;c.beginPath();c.moveTo(WX(w[0]),WY(w[1]));c.lineTo(WX(w[2]),WY(w[3]));c.stroke();
      c.strokeStyle=fixed?'rgba(200,215,225,.85)':'rgba(234,249,255,.95)';c.lineWidth=fixed?3:2;c.beginPath();c.moveTo(WX(w[0]),WY(w[1]));c.lineTo(WX(w[2]),WY(w[3]));c.stroke()}
    c.lineCap='round';FIX.walls.forEach(function(w){wall(w,w[4])});WALLS.forEach(function(w){wall(w,0)});
    for(var id in bdrag){var b=bdrag[id],p=PT[id];if(!p)continue;
      if(b.kind==='wall'){var a=snap(b.x0,b.y0),e=snap(p.x,p.y);c.setLineDash([5,5]);c.strokeStyle='rgba(234,249,255,.7)';c.lineWidth=2;c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(e[0],e[1]);c.stroke();c.setLineDash([])}
      else if(b.kind==='fan'||b.kind==='tunnel'){c.strokeStyle='rgba(234,249,255,.7)';c.lineWidth=1.5;c.setLineDash(b.kind==='tunnel'?[3,5]:[]);c.beginPath();c.moveTo(b.x0,b.y0);c.lineTo(p.x,p.y);c.stroke();c.setLineDash([]);
        if(b.kind==='tunnel'){c.beginPath();c.arc(b.x0,b.y0,cr*.75,0,TAU);c.stroke();c.beginPath();c.arc(p.x,p.y,cr*.75,0,TAU);c.stroke()}}}
    /* a level's own sources wear their colour; a fan built in a level breathes no ink and is drawn plain; a level's winds are fixed fans */
    function fan(f,fixed){var x=WX(f.x),y=WY(f.y),col=f.c<0?[.86,.93,1]:INK[f.c],s=cpre(col);
      c.strokeStyle=s+'.95)';c.lineWidth=1.4;c.beginPath();c.arc(x,y,fixed&&!f.wind?9:11,0,TAU);c.stroke();if(f.wind){c.strokeStyle='rgba(200,215,225,.8)';c.beginPath();c.arc(x,y,15,0,TAU);c.stroke();c.strokeStyle=s+'.95)'}
      for(k=0;k<3;k++){var a=f.ph+k*TAU/3;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a)*(fixed&&!f.wind?7:9),y+Math.sin(a)*(fixed&&!f.wind?7:9));c.stroke()}
      if(fixed&&!f.wind){c.fillStyle=s+'.9)';c.beginPath();c.arc(x,y,3,0,TAU);c.fill();
        /* a vent pouring: a glow at its mouth */
        if(PZ>=0&&RUN){var gw=c.createRadialGradient(x,y,2,x,y,26);gw.addColorStop(0,s+'.45)');gw.addColorStop(1,s+'0)');c.fillStyle=gw;c.beginPath();c.arc(x,y,26,0,TAU);c.fill()}}
      c.beginPath();c.moveTo(x+f.dx*14,y+f.dy*14);c.lineTo(x+f.dx*24,y+f.dy*24);c.stroke();var ax=x+f.dx*24,ay=y+f.dy*24;c.beginPath();c.moveTo(ax-f.dx*5-f.dy*4,ay-f.dy*5+f.dx*4);c.lineTo(ax,ay);c.lineTo(ax-f.dx*5+f.dy*4,ay-f.dy*5-f.dx*4);c.stroke()}
    FIX.fans.forEach(function(f){var dim=PZ>=0&&!RUN;if(dim)c.globalAlpha=.35;fan(f,1);c.globalAlpha=1;
      /* a wind that blows by turns: a broken ring round it */
      if(f.wind&&f.on&&f.off){c.save();c.setLineDash([3,4]);c.strokeStyle='rgba(200,215,225,.7)';c.lineWidth=1.2;c.beginPath();c.arc(WX(f.x),WY(f.y),20,0,TAU);c.stroke();c.restore()}});
    FANS.forEach(function(f){fan(f,0)});
    /* prisms: a hexagon of their colour, the smoke in them glowing */
    FIX.prisms.concat(PRISMS).forEach(function(p){var x=WX(p.x),y=WY(p.y),R=cr*.8,col=INK[p.c]||INK[0];c.beginPath();for(k=0;k<6;k++){var a=k/6*TAU+Math.PI/6;c.lineTo(x+Math.cos(a)*R,y+Math.sin(a)*R)}c.closePath();
      c.fillStyle=cs(col,.1);c.fill();c.strokeStyle=cs(col,.9);c.lineWidth=p.fixed?2.4:1.5;c.stroke();if(p.fixed){c.strokeStyle='rgba(200,215,225,.6)';c.lineWidth=1;c.beginPath();c.arc(x,y,R+5,0,TAU);c.stroke()}});
    DRAINS.concat(FIX.drains).forEach(function(d){var x=WX(d.x),y=WY(d.y);c.fillStyle='rgba(0,0,0,.55)';c.beginPath();c.arc(x,y,9,0,TAU);c.fill();
      for(k=0;k<3;k++){var u=((d.ph*.25+k/3)%1),rr=14*(1-u)+2;c.strokeStyle='rgba(234,249,255,'+(.6*u).toFixed(3)+')';c.lineWidth=1.2;c.beginPath();c.arc(x,y,rr,0,TAU);c.stroke()}
      if(d.fixed){c.strokeStyle='rgba(200,215,225,.8)';c.lineWidth=2;c.beginPath();c.arc(x,y,15,0,TAU);c.stroke()}});
    /* tunnels: the way in (dark, drawing inward), a faint line, the way out (bright, an arrow the way the smoke leaves) */
    TUNNELS.forEach(function(u){var ax=WX(u.ax),ay=WY(u.ay),bx2=WX(u.bx),by2=WY(u.by),m=Math.hypot(bx2-ax,by2-ay)||1,ux=(bx2-ax)/m,uy=(by2-ay)/m,R=cr*.75;
      c.setLineDash([2,6]);c.strokeStyle='rgba(234,249,255,.25)';c.lineWidth=1;c.beginPath();c.moveTo(ax+ux*R,ay+uy*R);c.lineTo(bx2-ux*R,by2-uy*R);c.stroke();c.setLineDash([]);
      c.fillStyle='rgba(0,0,0,.5)';c.beginPath();c.arc(ax,ay,R,0,TAU);c.fill();for(k=0;k<2;k++){var w2=((u.ph*.4+k/2)%1),rr=R*(1-w2)+2;c.strokeStyle='rgba(180,107,255,'+(.7*w2).toFixed(3)+')';c.lineWidth=1.2;c.beginPath();c.arc(ax,ay,rr,0,TAU);c.stroke()}
      c.strokeStyle='rgba(180,107,255,.85)';c.lineWidth=1.4;c.beginPath();c.arc(ax,ay,R,0,TAU);c.stroke();c.beginPath();c.arc(bx2,by2,R,0,TAU);c.stroke();
      var ex=bx2+ux*(R+12),ey=by2+uy*(R+12);c.beginPath();c.moveTo(bx2+ux*(R+2),by2+uy*(R+2));c.lineTo(ex,ey);c.moveTo(ex-ux*5-uy*4,ey-uy*5+ux*4);c.lineTo(ex,ey);c.lineTo(ex-ux*5+uy*4,ey-uy*5-ux*4);c.stroke()});
    /* a ring that drifts: the way it goes, faintly */
    CUPS.forEach(function(cp){if(!cp.mx&&!cp.my)return;var col=cp.c==='mix'?[.92,.96,1]:INK[cp.c];c.save();c.setLineDash([2,6]);c.strokeStyle=cs(col,.35);c.lineWidth=1.2;
      c.beginPath();c.moveTo(B.x0+cp.x0*B.w,B.y0+cp.y0*B.h);c.lineTo(B.x0+(cp.x0+cp.mx)*B.w,B.y0+(cp.y0+cp.my)*B.h);c.stroke();c.restore()});
    CUPS.forEach(function(cp){var x=WX(cp.x),y=WY(cp.y),col=cp.c==='mix'?[.92,.96,1]:INK[cp.c],s=cpre(col),rr=cr*(cp.r||1),pu=1+.04*Math.sin(t*.008);
      /* a ring waiting for its smoke: its colour, breathing, and a faint fill inside so it reads as a target */
      c.fillStyle=s+(.07+.05*cp.fill).toFixed(3)+')';c.beginPath();c.arc(x,y,rr,0,TAU);c.fill();
      c.strokeStyle=s+(cp.done?'1)':'.85)');c.lineWidth=cp.done?2.6:2;c.setLineDash(cp.c==='mix'?[3,4]:[]);c.beginPath();c.arc(x,y,rr*pu,0,TAU);c.stroke();c.setLineDash([]);
      c.lineWidth=4;c.strokeStyle=s+'.95)';c.beginPath();c.arc(x,y,rr+7,-Math.PI/2,-Math.PI/2+TAU*cp.fill);c.stroke();
      if(cp.done){c.fillStyle=s+(.18+.1*Math.sin(t*.006)).toFixed(3)+')';c.beginPath();c.arc(x,y,rr,0,TAU);c.fill()}});
    /* a ring filled: its light opening out */
    if(PZ>=0)GM.fx.forEach(function(f){var e=(simT-f.t)/1.2,col=INK[f.c],s=cpre(col);c.strokeStyle=s+(.9*(1-e)).toFixed(3)+')';c.lineWidth=3*(1-e)+1;
      c.beginPath();c.arc(WX(f.x),WY(f.y),cr*(1+2.4*e),0,TAU);c.stroke()});
    if(PZ>=0)gmDraw(c,t);
    c.lineCap='butt'}
  function gmDraw(c,t){var P=gmPlan(GM.round),e=simT-GM.phT,cx=B.x0+B.w/2,cy=B.y0+B.h*.42,k;
    /* the time: a bar along the top of the tank that shortens, red in its last five seconds */
    var fr2=GM.phase==='play'?clamp(GM.left/P.secs,0,1):GM.phase==='intro'?1:0,low=GM.phase==='play'&&GM.left<5,gy=B.y0+5;
    c.strokeStyle='rgba(234,249,255,.12)';c.lineWidth=4;c.beginPath();c.moveTo(B.x0+6,gy);c.lineTo(B.x0+B.w-6,gy);c.stroke();
    c.strokeStyle=low?'rgba(255,60,90,'+(.6+.4*Math.sin(t*.015)).toFixed(3)+')':'rgba(62,240,255,.9)';c.beginPath();c.moveTo(B.x0+6,gy);c.lineTo(B.x0+6+(B.w-12)*fr2,gy);c.stroke();
    /* the rings this round asks for: a dot each, lit as they are filled */
    for(k=0;k<GM.need;k++){var dx=B.x0+B.w/2+(k-(GM.need-1)/2)*16,dy=B.y0+18;c.beginPath();c.arc(dx,dy,4.2,0,TAU);
      if(k<GM.got){c.fillStyle='rgba(234,249,255,.95)';c.fill()}else{c.strokeStyle='rgba(234,249,255,.45)';c.lineWidth=1.2;c.stroke()}}
    /* between rounds and at the end: big words in the middle of the tank */
    function big(a,b,al){c.save();c.globalAlpha=al;c.textAlign='center';c.fillStyle='rgba(234,249,255,.96)';c.font='800 '+Math.round(Math.min(46,B.w*.13))+'px Anybody, system-ui, sans-serif';
      c.fillText(a,cx,cy);if(b){c.font='500 '+Math.round(Math.min(14,B.w*.04))+'px "JetBrains Mono", ui-monospace, monospace';c.fillStyle='rgba(234,249,255,.8)';c.fillText(b,cx,cy+28)}c.restore()}
    if(GM.phase==='intro')big('ROUND '+GM.round,'FILL '+GM.need+' RINGS',smooth(e/.25)*(1-smooth((e-1.5)/.3)));
    else if(GM.phase==='won'){c.fillStyle='rgba(1,4,10,'+(.35*smooth(e/.4)).toFixed(3)+')';c.fillRect(B.x0,B.y0,B.w,B.h);big('ROUND '+GM.round+' DONE','NEXT: FASTER',smooth(e/.3));
      for(k=0;k<3;k++){var g2=smooth((e-k*.22)/.9);if(g2<=0||g2>=1)continue;c.strokeStyle='rgba(234,249,255,'+(.7*(1-g2)).toFixed(3)+')';c.lineWidth=2;c.beginPath();c.arc(cx,cy,20+g2*B.w*.42,0,TAU);c.stroke()}}
    else if(GM.phase==='over'){c.fillStyle='rgba(1,4,10,'+(.5*smooth(e/.5)).toFixed(3)+')';c.fillRect(B.x0,B.y0,B.w,B.h);
      big('TIME UP',GM.score+(GM.score===1?' RING':' RINGS')+(GM.newBest?' · NEW BEST':' · BEST '+GM.best),smooth(e/.4))}}
  function resize(){if(GLX.ok&&P)size()}
  var CN=['cyan','green','amber','rose','violet'];
  function left(n,one,many){return n+' '+(n===1?one:many)}
  /* the words, three lines at most: what to do; how it is going; what the piece in hand does */
  var HINT={wall:'drag to draw a wall: smoke slides along it',fan:'drag to set a fan, the way it should blow',
    prism:'tap to set a prism: it dyes the smoke in it',drain:'tap to set a drain: it swallows smoke',
    tunnel:'drag a tunnel from its way in to its way out',ink:'push the smoke with a finger, tap for a drop'};
  function ringName(c){return c==='mix'?'white':CN[c]}
  /* the game's words, three lines: what to do, how the round goes, the score */
  function hud(){
    if(PZ>=0){var cp=CUPS[0],secs=Math.ceil(GM.left),tm=Math.floor(secs/60)+':'+('0'+secs%60).slice(-2),best=GM.best?' · best '+GM.best:'';
      if(GM.phase==='intro')return 'round '+GM.round+': fill '+GM.need+' rings in '+gmPlan(GM.round).secs+' seconds\ntouch a stream and drag it into the ring of its colour\nscore '+GM.score+best;
      if(GM.phase==='won')return 'round '+GM.round+' done · next one is faster\n\nscore '+GM.score+best;
      if(GM.phase==='over')return 'time up · '+GM.score+(GM.score===1?' ring':' rings')+(GM.newBest?', a new best':'')+'\npress again to play again, or free to stop\nscore '+GM.score+best;
      return 'steer the '+(cp?CN[cp.c]+' smoke into the '+CN[cp.c]+' ring':'smoke into the ring')+'\nround '+GM.round+' · '+GM.got+' of '+GM.need+' rings · '+tm+' left\nscore '+GM.score+best}
    var bt=[[WALLS.length,'wall','walls'],[FANS.length,'fan','fans'],[PRISMS.length,'prism','prisms'],[DRAINS.length,'drain','drains'],[TUNNELS.length,'tunnel','tunnels']].filter(function(a){return a[0]}).map(function(a){return left(a[0],a[1],a[2])}).join(' · ');
    if(PHOTO.has)return 'your photo is the ink: smear it and it remembers itself'+(bt?'\nbuilt: '+bt:'');
    return 'real smoke, worked out as it moves: push it with a finger, tap for a drop\nplay: push the smoke into rings against the clock'+(bt?'\nbuilt: '+bt:'')}
  /* the hint: a tap (a drop of ink bursts), then one finger drawn across. The tap comes first on purpose: this is the world the page
     opens on, and a tap is the one touch an iPhone will start the sound on */
  function ghost(t){if(PZ>=0||TOOL!=='ink')return [null];var u=(t*.21)%1,k=Math.floor(t*.21)%2;
    if(u>.05&&u<.1)return [{x:STG.x0+STG.w*(k?.7:.3),y:STG.cy+STG.h*(k?.16:-.14)}];
    if(u>.2&&u<.84){var e=smooth((u-.2)/.64);return [{x:STG.x0+STG.w*(k?.82-.64*e:.18+.64*e),y:STG.cy+STG.h*(.22*Math.sin(e*5.2+k*2)+(k?-.12:.12))}]}
    return [null]}
  /* pieces put in by a test, in fractions of the tank in a level (of the stage outside one) */
  function scanAt(c,nx,ny){if(!rbOk||PZ<0)return null;var r=cupR()*.9,tc=c==='mix'?MIXC:INK[c],out=[],i,j;
    for(j=0;j<ny;j++)for(i=0;i<nx;i++)out.push(+sample(WX(bx((i+.5)/nx)),WY(by((j+.5)/ny)),r,tc,c==='mix').match.toFixed(4));return out}
  function recStep(){var R=REC,t=simT-R.t0;if(t<R.next)return;readBack();if(!rbOk)return;R.T.push(+t.toFixed(3));R.cols.forEach(function(c,k){R.S[k].push(scanAt(c,R.nx,R.ny))});
    R.next=t+R.ev;if(t>=R.until||!RUN)R.done=true}
  function U(x){return PZ>=0?bx(x):(STG.x0+x*STG.w)/VW}function V(y){return PZ>=0?by(y):(STG.y0+y*STG.h)/VH}
  return {enter:enter,leave:leave,resize:function(){resize();pzRelayout();obsDirty=true},down:down,up:up,gesture:gesture,tick:tick,draw:draw,hud:hud,ghost:ghost,gl:function(){gen=-1},
    dbg:function(){return {ok:!!(P&&dye),simT:simT,simple:simple,sw:sw,sh:sh,dw:dw,dh:dh,lin:GLX.hfLin,tool:TOOL,pz:PZ,won:!!pzWon,walls:WALLS.length,fans:FANS.length,drains:DRAINS.length,prisms:PRISMS.length,tunnels:TUNNELS.length,wn:WN,
      game:{round:GM.round,need:GM.need,got:GM.got,left:+GM.left.toFixed(2),score:GM.score,best:GM.best,phase:GM.phase,cols:GM.cols.slice(),wall:!!GM.wall},board:{x0:B.x0,y0:B.y0,w:B.w,h:B.h},run:RUN,rt:RT,
      cups:CUPS.map(function(c){return {c:c.c,fill:c.fill,match:c.match,done:c.done,x:WX(c.x),y:WY(c.y),r:cupR()*(c.r||1)}}),vents:FIX.fans.map(function(f){return {x:WX(f.x),y:WY(f.y),c:f.c,a:f.a===undefined?-Math.PI/2:f.a}}),fix:{walls:FIX.walls.length,fans:FIX.fans.length,drains:FIX.drains.length,prisms:FIX.prisms.length},rb:rbOk}},
    /* for the tests: how much ink there is around a point (pixels), from the last copy read back; and a level by number */
    sample:function(x,y,r){want=1;return sample(x,y,r,null,false)},
    /* for designing levels: what a ring of a colour would get, at each point of an nx by ny grid over the tank (from the last copy read back) */
    scan:function(c,nx,ny){want=1;return scanAt(c,nx,ny)},
    /* the same, taken by the page itself every so often of the water's time while a level runs (no waiting on a test between frames) */
    rec:function(cols,nx,ny,every,until){REC={cols:cols,nx:nx,ny:ny,ev:every,until:until,t0:simT,next:0,T:[],S:cols.map(function(){return []}),done:false}},
    /* for the tests that only measure: the water is worked out but not shown (a machine without a GPU works it out several times quicker) */
    nodraw:function(b){NODRAW=!!b},
    recGet:function(){return REC?{done:REC.done,n:REC.T.length,T:REC.done?REC.T:null,S:REC.done?REC.S:null}:null},
    mid:function(){want=1;if(!rbOk)return null;var w=0,y=0,i,j;for(j=0;j<rbH;j++)for(i=0;i<rbW;i++){var o=(j*rbW+i)*4,d=Math.max(rbBuf[o],rbBuf[o+1],rbBuf[o+2])/255;w+=d;y+=d*(1-(j+.5)/rbH)}return w?y/w:null},
    /* the game, for the tests: start it, stop it, go to a round, wind the clock on, set the best */
    play:function(){gmStart();toolsSync()},free:function(){gmOff()},goRound:function(n){gmRound(n)},left:function(v){GM.left=v},best:function(n){GM.best=n;bestSet()},
    tool:function(k){TOOL=k;toolsSync()},
    /* for the tests: pieces put in by hand */
    nowin:function(b){NOWIN=!!b},trace:function(on){var t=TRACE;TRACE=on?[]:null;return t},
    fastdye:function(b){FASTDYE=!!b;szKey=''},
    /* for the tests: the water stepped as a phone at a given frame rate steps it (1/60, or 1/30 for one saving power), whatever this machine's pace */
    fixdt:function(v){FIXDT=+v||0},phys:function(o){if(o)for(var k in o)LP[k]=o[k];return JSON.parse(JSON.stringify(LP))},
    put:function(k,a){if(k==='wall')WALLS.push([U(a[0]),V(a[1]),U(a[2]),V(a[3]),0]);else if(k==='fan'){var m=Math.hypot(a[2],a[3])||1;FANS.push({x:U(a[0]),y:V(a[1]),dx:a[2]/m,dy:a[3]/m,c:PZ>=0?-1:a[4]||0,ph:0})}
      else if(k==='drain')DRAINS.push({x:U(a[0]),y:V(a[1]),ph:0});else if(k==='prism')PRISMS.push({x:U(a[0]),y:V(a[1]),c:a[2],ph:0});
      else if(k==='tunnel')TUNNELS.push({ax:U(a[0]),ay:V(a[1]),bx:U(a[2]),by:V(a[3]),ph:0});obsDirty=true},
    /* the ring in play filled at once, as if the smoke had done it */
    win:function(){var c=CUPS[0];if(!c||PZ<0||GM.phase!=='play')return;c.fill=1;c.done=true;gmRingDone(c)}}
})();
