/* ---------- SMOKE: ink in water. A real fluid on the graphics chip (Stam's stable fluids: carry the flow along itself, find the
   pressure that keeps it from piling up, take that pressure's push out). A finger drags the water and leaves ink; a tap is a
   drop; a finger that stays is a spring. The screen is nine notes high, and the ink is the colour of the note it was drawn on.
   The bass rolls the water from below, the balafon and kora drip their notes into it as a score.
   Given a photo, the photo is the ink: smear it, and it slowly remembers itself.
   It is also a machine to build in, and a game of 24 levels. Smoke rises (warm ink is light). Walls stop the water and the ink; a fan
   pushes the water one way for as long as it stands (and breathes ink, outside the levels); a prism gives the smoke that passes
   through it its own colour; a drain swallows ink and draws the water in; a tunnel takes the smoke that goes into one end out of the
   other. Two fingers turning make a whirlpool; two fingers closing pull the water in, opening throw it out.
   In a level, fixed sources breathe ink of their own colours inside a tank of fixed shape (so a level plays the same on any screen),
   and each ring wants its colour (or, for a white ring, cyan and amber together): build a few pieces to bring the right smoke into
   every ring. The fewer pieces, the more stars. Six chapters of four levels, each chapter bringing a new piece; each level open once
   the one before it is solved; every third level solved brings one more player into the band, the electric guitar last.
   (The owner, 12 Nov: "The smoke game needs to be better", and he chose: lots of levels, harder as they go, stars for using fewer
   pieces, new parts unlocked as you go.) ---------- */
var DRIFT=(function(){
  var P=null,gen=-1,vel=null,dye=null,prs=null,div=null,curl=null,sw=0,sh=0,dw=0,dh=0,type=0,filt=0,simple=false,ql=-1,szKey='',
    q=[],last={},rows={},photoVer=-1,ink=0,t0=0,
    /* the machine: walls (segments, in fractions of the screen), fans, prisms, drains, tunnels; in a level also its fixed sources,
       walls, winds, prisms and drains, and its rings. obs is the walls drawn into the water's own grid: 1 where there is wall */
    obs=null,obsDirty=true,WB=null,WN=0,TOOL='ink',WALLS=[],FANS=[],DRAINS=[],PRISMS=[],TUNNELS=[],CUPS=[],FIX={walls:[],fans:[],drains:[],prisms:[]},
    PZ=-1,pzWon=0,pzSaved=null,winStars=0,PATH=false,pathT=0,FIXDT=0,
    rb=null,rbBuf=null,rbW=0,rbH=0,rbT=0,rbS=0,rbOk=false,simT=0,NOWIN=false,TRACE=null,want=0,bdrag={},VQ=[],STARS=[],FASTDYE=false;
  /* the five notes of the scale as five inks: E cyan, G green, A amber, B rose, D violet */
  var INK=[[.12,.86,1],[.30,1,.62],[1,.62,.20],[1,.14,.50],[.56,.36,1]];
  var VSB='attribute vec2 a_p;varying vec2 vUv;varying vec2 vL;varying vec2 vR;varying vec2 vT;varying vec2 vB;uniform vec2 uTexel;\n'+
    'void main(){vUv=a_p*0.5+0.5;vL=vUv-vec2(uTexel.x,0.0);vR=vUv+vec2(uTexel.x,0.0);vT=vUv+vec2(0.0,uTexel.y);vB=vUv-vec2(0.0,uTexel.y);gl_Position=vec4(a_p,0.0,1.0);}';
  var H='precision highp float;varying vec2 vUv;varying vec2 vL;varying vec2 vR;varying vec2 vT;varying vec2 vB;\n';
  var F={
    /* carried along by the water. Nothing is carried through a wall: when the way back crosses one, nothing comes (a fast jet
       would otherwise jump a thin wall in one step) */
    adv:H+'uniform sampler2D uVel;uniform sampler2D uSrc;uniform sampler2D uObs;uniform vec2 uVTexel;uniform vec2 uSTexel;uniform float uDt;uniform float uDiss;uniform float uHO;\n'+
      'vec4 bil(sampler2D s,vec2 uv,vec2 ts){vec2 st=uv/ts-0.5;vec2 i=floor(st);vec2 f=fract(st);vec4 a=texture2D(s,(i+vec2(0.5,0.5))*ts);vec4 b=texture2D(s,(i+vec2(1.5,0.5))*ts);vec4 c=texture2D(s,(i+vec2(0.5,1.5))*ts);vec4 d=texture2D(s,(i+vec2(1.5,1.5))*ts);return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}\n'+
      'void main(){\n#ifdef MANUAL\nvec2 c=vUv-uDt*bil(uVel,vUv,uVTexel).xy*uVTexel;gl_FragColor=uDiss*bil(uSrc,c,uSTexel);\n#else\nvec2 c=vUv-uDt*texture2D(uVel,vUv).xy*uVTexel;gl_FragColor=uDiss*texture2D(uSrc,c);\n#endif\n'+
      'if(uHO>0.5){float o=max(max(texture2D(uObs,mix(vUv,c,0.34)).x,texture2D(uObs,mix(vUv,c,0.67)).x),texture2D(uObs,c).x);gl_FragColor*=1.0-smoothstep(0.3,0.6,o);}\n}',
    /* add to a field around a point. Ink is added less where there is already plenty, so colours stay colours and never burn out to white */
    spl:H+'uniform sampler2D uT;uniform float uAR;uniform vec3 uCol;uniform vec2 uPt;uniform float uRad;uniform float uSat;\n'+
      'void main(){vec2 p=vUv-uPt;p.x*=uAR;vec3 s=exp(-dot(p,p)/uRad)*uCol;vec3 o=texture2D(uT,vUv).xyz;float full=clamp(max(o.r,max(o.g,o.b))/0.95,0.0,1.0);gl_FragColor=vec4(o+s*(1.0-uSat*full),1.0);}',
    div:H+'uniform sampler2D uVel;\nvoid main(){float L=texture2D(uVel,vL).x;float R=texture2D(uVel,vR).x;float T=texture2D(uVel,vT).y;float B=texture2D(uVel,vB).y;vec2 C=texture2D(uVel,vUv).xy;'+
      'if(vL.x<0.0){L=-C.x;}if(vR.x>1.0){R=-C.x;}if(vT.y>1.0){T=-C.y;}if(vB.y<0.0){B=-C.y;}gl_FragColor=vec4(0.5*(R-L+T-B),0.0,0.0,1.0);}',
    curl:H+'uniform sampler2D uVel;\nvoid main(){float L=texture2D(uVel,vL).y;float R=texture2D(uVel,vR).y;float T=texture2D(uVel,vT).x;float B=texture2D(uVel,vB).x;gl_FragColor=vec4(0.5*(R-L-T+B),0.0,0.0,1.0);}',
    vort:H+'uniform sampler2D uVel;uniform sampler2D uCurl;uniform float uK;uniform float uDt;\n'+
      'void main(){float L=texture2D(uCurl,vL).x;float R=texture2D(uCurl,vR).x;float T=texture2D(uCurl,vT).x;float B=texture2D(uCurl,vB).x;float C=texture2D(uCurl,vUv).x;'+
      'vec2 f=0.5*vec2(abs(T)-abs(B),abs(R)-abs(L));f/=length(f)+0.0001;f*=uK*C;f.y*=-1.0;vec2 v=texture2D(uVel,vUv).xy+f*uDt;gl_FragColor=vec4(clamp(v,-1000.0,1000.0),0.0,1.0);}',
    prs:H+'uniform sampler2D uP;uniform sampler2D uDiv;\nvoid main(){float L=texture2D(uP,vL).x;float R=texture2D(uP,vR).x;float T=texture2D(uP,vT).x;float B=texture2D(uP,vB).x;float d=texture2D(uDiv,vUv).x;gl_FragColor=vec4((L+R+B+T-d)*0.25,0.0,0.0,1.0);}',
    grad:H+'uniform sampler2D uP;uniform sampler2D uVel;\nvoid main(){float L=texture2D(uP,vL).x;float R=texture2D(uP,vR).x;float T=texture2D(uP,vT).x;float B=texture2D(uP,vB).x;vec2 v=texture2D(uVel,vUv).xy-vec2(R-L,T-B);gl_FragColor=vec4(v,0.0,1.0);}',
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
      'if(uMode<0.5){gl_FragColor=vec4(o.rgb*(1.0-clamp(uK*g,0.0,1.0)),1.0);}else if(uMode>2.5){gl_FragColor=vec4(o.xy*(1.0-clamp(uK*g,0.0,1.0)),0.0,1.0);}else{vec2 dir=pp/(sqrt(r2)+1.0);if(uMode>1.5)dir=vec2(-dir.y,dir.x);gl_FragColor=vec4(o.xy-dir*uK*g*uCell,0.0,1.0);}}',
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
     the haze of everything that went before (at a phone's sixty frames a second, smoke left to linger would fill a ring above any jet) */
  var LP={buo:.3,dye:.6,vel:.8,ink:.13,fk:8,f0:.025};
  /* (in a level the water fades by its own time, not the clock's: a phone that steps it thirty times a second plays the level as one that
     steps it sixty times does, only slower, so a level tested once is the same level everywhere) */
  function WX(u){return u*VW}function WY(v){return v*VH}
  /* the level's tank: a fixed shape (a little narrower than a phone held upright) fitted into the stage. A level's places are in
     fractions of the tank, and its jets and pieces are as strong, for the tank's size, on any screen */
  var BA=.64,B={x0:0,y0:0,w:1,h:1};
  function boardFit(){var h=Math.max(80,STG.h-6),w=Math.min(STG.w-14,h*BA);h=Math.min(h,w/BA);B.w=w;B.h=h;B.x0=STG.x0+(STG.w-w)/2;B.y0=STG.y0+(STG.h-h)/2}
  function bx(u){return (B.x0+u*B.w)/VW}function by(v){return (B.y0+v*B.h)/VH}
  /* how strong, for the tank: speeds (pixels a second) and areas (pixels squared) scale with it; splat sizes are in screen heights */
  function KS(){return PZ>=0?B.h/580:1}function KP(){var k=KS();return k*k}function KR(){if(PZ<0)return 1;var f=B.h/VH/.69;return f*f}
  function cupR(){return PZ>=0?Math.min(B.w,B.h)*.085:Math.min(STG.w,STG.h)*.085}
  function tank(){return [[0,0,1,0],[1,0,1,1],[1,1,0,1],[0,1,0,0]].map(function(w){return [bx(w[0]),by(w[1]),bx(w[2]),by(w[3]),2]})}
  /* the chapters: each brings a new piece, and its first level says what the piece does */
  var CH=[{n:'walls',i:0,k:'wall'},{n:'fans',i:4,k:'fan'},{n:'prisms',i:8,k:'prism'},{n:'drains',i:12,k:'drain'},{n:'tunnels',i:16,k:'tunnel'},{n:'all together',i:20,k:''}];
  function chapterOf(i){var c=0;for(var k=0;k<CH.length;k++)if(i>=CH[k].i)c=k;return c}
  /* the 24 levels (places in fractions of the tank, across then down).
     src: a source breathing ink: x, y, direction, colour (0 cyan, 1 green, 2 amber, 3 rose, 4 violet); wind: a fixed fan that only
     pushes the water; cups: the rings, and the colour each wants ('mix': cyan and amber together); walls, prisms, drains: fixed ones;
     give: how many of each piece may be built (w walls, f fans, p the prisms' colours, d drains, t tunnels); par: the fewest pieces
     known to solve it (three stars); tip: the clue; sol: one way to solve it, which tools/t_puzzles.js builds and checks (every ring
     fills; and with nothing built, none does). Every level is carried by its sources' jets: smoke that only drifts is too faint to
     carry far, and barely rises */
  var LEVELS=[
    /*LEVELS-BEGIN*/
    {name:'ramp',src:[[0.1,0.75,1,0,0]],cups:[[0.72,0.42,0]],give:{w:2},par:1,tip:'new: the wall. drag to build one, tap it to take it away. a wall in its way turns the smoke',sol:[['wall',[0.3,0.8,0.55,0.6]]]},
    {name:'up and left',src:[[0.75,0.9,0,-1,1]],cups:[[0.22,0.37,1]],give:{w:2},par:1,tip:'a wall that leans turns a rising jet',sol:[['wall',[0.88,0.62,0.48,0.45]]]},
    {name:'shield',src:[[0.1,0.45,1,0,3],[0.5,0.9,0,-1,0]],cups:[[0.84,0.45,3]],give:{w:2},par:1,tip:'one jet pushes another aside',sol:[['wall',[0.42,0.8,0.58,0.8]]]},
    {name:'two shields',src:[[0.1,0.45,1,0,3],[0.36,0.78,0,-1,0],[0.66,0.78,0,-1,2]],cups:[[0.86,0.45,3]],give:{w:3},par:2,tip:'two jets from below push the rose aside: hold both down',sol:[['wall',[0.27,0.66,0.45,0.66]],['wall',[0.57,0.66,0.75,0.66]]],bad:[['one shield',[['wall',[0.27,0.66,0.45,0.66]]]],['other shield',[['wall',[0.57,0.66,0.75,0.66]]]]]},
    {name:'push',src:[[0.5,0.88,0,-1,2]],cups:[[0.18,0.5,2]],give:{f:1,w:1},par:1,tip:'new: the fan. drag the way it should blow. a fan pushes the water, and the smoke with it',sol:[['fan',[0.56,0.66,-1,0]]]},
    {name:'the other way',src:[[0.5,0.88,0,-1,4]],cups:[[0.82,0.5,4]],give:{f:1,w:1},par:1,tip:'a fan can blow any way you drag it',sol:[['fan',[0.44,0.66,1,0]]]},
    {name:'down',src:[[0.1,0.4,1,0,3]],walls:[[0.86,0.56,1,0.56]],cups:[[0.84,0.82,3]],give:{f:1,w:1},par:1,tip:'smoke never sinks by itself',sol:[['fan',[0.45,0.32,0,1]]]},
    {name:'white',src:[[0.15,0.88,0,-1,0],[0.85,0.88,0,-1,2]],cups:[[0.5,0.35,'mix']],give:{f:2,w:1},par:2,tip:'white is cyan and amber together',sol:[['fan',[0.1,0.66,1,0]],['fan',[0.9,0.66,-1,0]]]},
    {name:'new colour',src:[[0.1,0.55,1,0,0]],cups:[[0.8,0.55,2]],give:{p:[2]},par:1,tip:'new: the prism. tap to place one. smoke that passes through it takes its colour',sol:[['prism',[0.4,0.55,2]]]},
    {name:'two in a row',src:[[0.1,0.5,1,0,0]],cups:[[0.45,0.5,2],[0.82,0.5,3]],give:{p:[2,3]},par:2,tip:'a prism after a ring changes the smoke again',sol:[['prism',[0.27,0.5,2]],['prism',[0.64,0.5,3]]]},
    {name:'swap',src:[[0.1,0.3,1,0,0],[0.1,0.72,1,0,2]],cups:[[0.82,0.3,2],[0.82,0.72,0]],give:{p:[2,0]},par:2,tip:'each ring wants the other jet\'s colour',sol:[['prism',[0.45,0.3,2]],['prism',[0.45,0.72,0]]]},
    {name:'white from cyan',src:[[0.15,0.88,0,-1,0],[0.85,0.88,0,-1,0]],wind:[[0.08,0.66,1,0],[0.92,0.66,-1,0]],cups:[[0.5,0.35,'mix']],give:{p:[2],f:1},par:1,tip:'two cyan jets meet in the white ring: white needs amber too',sol:[['prism',[0.85,0.8,2]]]},
    {name:'swallow',src:[[0.1,0.5,1,0,3],[0.5,0.1,0,1,1]],cups:[[0.8,0.5,3]],give:{d:1},par:1,tip:'new: the drain. tap to place one. a jet that runs into it is swallowed',sol:[['drain',[0.5,0.3]]]},
    {name:'two intruders',src:[[0.1,0.5,1,0,0],[0.35,0.08,0,1,2],[0.65,0.08,0,1,3]],cups:[[0.88,0.5,0]],give:{d:2},par:2,tip:'two jets fall across the cyan: swallow them both',sol:[['drain',[0.35,0.28]],['drain',[0.65,0.28]]],bad:[['one drain',[['drain',[0.35,0.28]]]]]},
    {name:'prism and drain',src:[[0.1,0.5,1,0,0],[0.6,0.08,0,1,1]],cups:[[0.86,0.5,3]],give:{d:1,p:[3]},par:2,tip:'the ring wants rose, and the green falls into its way',sol:[['drain',[0.6,0.28]],['prism',[0.33,0.5,3]]],bad:[['prism only',[['prism',[0.33,0.5,3]]]],['drain only',[['drain',[0.6,0.28]]]]]},
    {name:'fan and drain',src:[[0.1,0.4,1,0,1],[0.84,0.97,0,-1,3]],walls:[[0.86,0.56,1,0.56]],cups:[[0.84,0.82,1]],give:{d:1,f:1},par:2,tip:'push the green down into the ring, and swallow the rose rising into it',sol:[['fan',[0.45,0.32,0,1]],['drain',[0.84,0.93]]],bad:[['fan only',[['fan',[0.45,0.32,0,1]]]],['drain only',[['drain',[0.84,0.93]]]]]},
    {name:'out of the box',src:[[0.2,0.82,1,0,0]],walls:[[0.0,0.65,0.45,0.65],[0.45,0.65,0.45,1.0]],cups:[[0.75,0.4,0]],give:{t:1},par:1,tip:'new: the tunnel. drag from where the smoke goes in to where it comes out',sol:[['tunnel',[0.35,0.82,0.6,0.55]]]},
    {name:'box and prism',src:[[0.2,0.82,1,0,2]],walls:[[0.0,0.65,0.45,0.65],[0.45,0.65,0.45,1.0]],cups:[[0.75,0.4,4]],give:{t:1,p:[4]},par:2,tip:'out of the box, and another colour',sol:[['tunnel',[0.35,0.82,0.6,0.55]],['prism',[0.68,0.47,4]]]},
    {name:'through the wall',src:[[0.1,0.75,1,0,3]],walls:[[0.5,0.25,0.5,1.0]],cups:[[0.8,0.75,3]],give:{t:1,w:1},par:1,tip:'the wall is too high to go over',sol:[['tunnel',[0.38,0.75,0.64,0.75]]]},
    {name:'two boxes',src:[[0.15,0.85,1,0,0],[0.85,0.85,-1,0,2]],walls:[[0.0,0.68,0.34,0.68],[0.34,0.68,0.34,1.0],[0.66,0.68,1.0,0.68],[0.66,0.68,0.66,1.0]],cups:[[0.5,0.4,'mix']],give:{t:2},par:2,tip:'white is cyan and amber together',sol:[['tunnel',[0.26,0.84,0.42,0.55]],['tunnel',[0.74,0.84,0.58,0.55]]]},
    {name:'three colours',src:[[0.08,0.55,1,0,0]],cups:[[0.33,0.55,2],[0.58,0.55,3],[0.83,0.55,4]],give:{p:[2,3,4]},par:3,tip:'all together: each ring wants its own colour from the one jet',sol:[['prism',[0.2,0.55,2]],['prism',[0.455,0.55,3]],['prism',[0.705,0.55,4]]]},
    {name:'shield and prism',src:[[0.1,0.4,1,0,3],[0.5,0.92,0,-1,2]],cups:[[0.85,0.4,4]],give:{w:1,p:[4],d:1},par:2,tip:'the amber pushes the rose aside, and the ring wants violet',sol:[['wall',[0.4,0.78,0.6,0.78]],['prism',[0.3,0.4,4]]]},
    {name:'boxes and colours',src:[[0.15,0.85,1,0,0],[0.85,0.85,-1,0,0]],walls:[[0.0,0.7,0.3,0.7],[0.3,0.7,0.3,1.0],[0.7,0.7,1.0,0.7],[0.7,0.7,0.7,1.0]],cups:[[0.5,0.4,'mix']],give:{t:2,p:[2]},par:3,tip:'two cyan jets in boxes, and a white ring: white is cyan and amber',sol:[['tunnel',[0.24,0.85,0.4,0.55]],['tunnel',[0.76,0.85,0.6,0.55]],['prism',[0.62,0.52,2]]]},
    {name:'the long way',src:[[0.1,0.85,1,0,1]],walls:[[0.0,0.62,0.78,0.62]],cups:[[0.27,0.33,3]],give:{w:1,p:[3],t:1},par:2,tip:'under a long shelf: get the green out, and make it rose',sol:[['tunnel',[0.62,0.85,0.4,0.5]],['prism',[0.34,0.42,3]]]}
    /*LEVELS-END*/
  ];
  /* who joins the band when a level is solved: every third level one more player (the shekere, the djembe, the talking drum, the
     agogo, the balafon, the kora), and the electric guitar when the last level is solved */
  var JOIN={2:[1],5:[2],8:[3],11:[4],14:[6],17:[7],23:[8]},MIXC=[.506,.668,.542];
  function joined(i){var a=[];for(var k in JOIN)if(+k<i)a=a.concat(JOIN[k]);return a}
  function joinAt(i){return JOIN[i]||[]}
  /* the stars won on each level, kept in the viewer's own browser */
  function lsGet(){try{var a=JSON.parse(localStorage.getItem('lc.smoke.stars')||'[]');if(Array.isArray(a))return a.map(function(v){return clamp(Math.round(+v)||0,0,3)})}catch(e){}return []}
  function lsSet(){try{localStorage.setItem('lc.smoke.stars',JSON.stringify(STARS))}catch(e){}}
  function isOpen(i){return i===0||(STARS[i-1]||0)>0||(STARS[i]||0)>0}
  function reach(){var r=0;for(var i=0;i<LEVELS.length;i++)if(isOpen(i))r=i;return r}
  function firstUnsolved(){for(var i=0;i<LEVELS.length;i++)if(!(STARS[i]>0))return i;return 0}
  function starTotal(){var t=0;for(var i=0;i<LEVELS.length;i++)t+=STARS[i]||0;return t}
  /* free play has the wall, the fan and the drain from the start (they were there before the levels); the prism and the tunnel come
     once their chapter is reached */
  function unlocked(k){if(k!=='prism'&&k!=='tunnel')return true;for(var c=0;c<CH.length;c++)if(CH[c].k===k)return CH[c].i<=reach();return true}
  function give(L){var g=L.give||{};return {w:g.w||0,f:g.f||0,p:(g.p||[]).slice(),d:g.d||0,t:g.t||0}}
  function given(){if(PZ<0)return {w:MAXW,f:MAXF,p:null,d:MAXD,t:MAXT};return give(LEVELS[PZ])}
  function used(){return WALLS.length+FANS.length+PRISMS.length+DRAINS.length+TUNNELS.length}
  function starsFor(n,par){return n<=par?3:n<=par+1?2:1}
  /* the prism colours still to place in a level (in the order given), or, outside the levels, the colour of the row it is put on */
  function prismsLeft(){var g=given();if(!g.p)return null;var a=g.p.slice();PRISMS.forEach(function(p){var k=a.indexOf(p.c);if(k>=0)a.splice(k,1)});return a}
  function placeFix(){var L=LEVELS[PZ];
    FIX.walls=tank().concat((L.walls||[]).map(function(w){return [bx(w[0]),by(w[1]),bx(w[2]),by(w[3]),1]}));
    FIX.fans=L.src.map(function(f){var m=Math.hypot(f[2],f[3])||1;return {x:bx(f[0]),y:by(f[1]),dx:f[2]/m,dy:f[3]/m,c:f[4],fixed:1,ph:0}}).concat(
      (L.wind||[]).map(function(f){var m=Math.hypot(f[2],f[3])||1;return {x:bx(f[0]),y:by(f[1]),dx:f[2]/m,dy:f[3]/m,c:-1,fixed:1,wind:1,ph:0}}));
    FIX.drains=(L.drains||[]).map(function(d){return {x:bx(d[0]),y:by(d[1]),fixed:1,ph:0}});
    FIX.prisms=(L.prisms||[]).map(function(p){return {x:bx(p[0]),y:by(p[1]),c:p[2],fixed:1}});obsDirty=true}
  function pzLoad(i){
    var L=LEVELS[i];if(!L)return;PZ=i;PATH=false;pzWon=0;winStars=0;rbS=simT;WALLS=[];FANS=[];DRAINS=[];PRISMS=[];TUNNELS=[];boardFit();placeFix();
    CUPS=L.cups.map(function(c){return {x:bx(c[0]),y:by(c[1]),c:c[2],fill:0,match:0,done:false}});clearInk=true;
    var g=give(L);TOOL=g.w?'wall':g.f?'fan':g.p.length?'prism':g.d?'drain':g.t?'tunnel':'ink';
    /* the band: the low drum and the bass, and one more player for every third level before this one */
    if(!pzSaved)pzSaved=ON.slice();var J=joined(i);for(var k=0;k<NL;k++){var on=k===0||k===5||J.indexOf(k)>=0;if(!!ON[k]!==on)setPlayer(k,on,true)}}
  /* the screen changed size: the tank is fitted again and everything in it, built or fixed, keeps its place in the tank */
  function pzRelayout(){if(PZ<0)return;var o={x0:B.x0,y0:B.y0,w:B.w,h:B.h};boardFit();if(o.w===B.w&&o.h===B.h&&o.x0===B.x0&&o.y0===B.y0)return;
    function X(u){return (B.x0+(u*VW-o.x0)/o.w*B.w)/VW}function Y(v){return (B.y0+(v*VH-o.y0)/o.h*B.h)/VH}
    WALLS.forEach(function(w){w[0]=X(w[0]);w[1]=Y(w[1]);w[2]=X(w[2]);w[3]=Y(w[3])});[FANS,PRISMS,DRAINS].forEach(function(a){a.forEach(function(p){p.x=X(p.x);p.y=Y(p.y)})});
    TUNNELS.forEach(function(t){t.ax=X(t.ax);t.ay=Y(t.ay);t.bx=X(t.bx);t.by=Y(t.by)});
    placeFix();LEVELS[PZ].cups.forEach(function(c,k){CUPS[k].x=bx(c[0]);CUPS[k].y=by(c[1])})}
  function pzOff(){PZ=-1;CUPS=[];FIX={walls:[],fans:[],drains:[],prisms:[]};WALLS=[];FANS=[];DRAINS=[];PRISMS=[];TUNNELS=[];obsDirty=true;pzWon=0;
    if(TOOL!=='ink'&&!unlocked(TOOL))TOOL='ink';
    if(pzSaved){for(var k=0;k<NL;k++)if(!!ON[k]!==!!pzSaved[k])setPlayer(k,!!pzSaved[k],true);pzSaved=null}}
  var clearInk=false;
  function pzWin(){
    var L=LEVELS[PZ];pzWon=FT;winStars=starsFor(used(),L.par);STARS[PZ]=Math.max(STARS[PZ]||0,winStars);lsSet();
    joinAt(PZ).forEach(function(k){if(!ON[k])setPlayer(k,true)});
    tone('bowl',pent(0,52),.42,0);for(var k=0;k<winStars;k++)tone('glass',pent(7+k*2,52),.3,(k-1)*.4,AC()+.14+k*.16);
    CUPS.forEach(function(c){for(var k=0;k<14;k++){var a=k/14*TAU,col=c.c==='mix'?[.9,.95,1]:INK[c.c];push(WX(c.x)+Math.cos(a)*8,WY(c.y)+Math.sin(a)*8,Math.cos(a)*700*KS(),Math.sin(a)*700*KS(),col,.4,.0007*KR())}})}
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
    if(!CUPS.length||pzWon)return;var all=true,r=cupR();
    CUPS.forEach(function(c){var m=sample(WX(c.x),WY(c.y),r*.9,c.c==='mix'?MIXC:INK[c.c],c.c==='mix');c.match=m.match;
      if(!c.done){c.fill=clamp(c.fill+dt*LP.fk*(m.match-LP.f0),0,1);if(c.fill>=1){c.done=true;tone('glass',pent(6+CUPS.indexOf(c)*2,52),.38,pan(WX(c.x)))}}if(!c.done)all=false});
    if(TRACE&&TRACE.length<4000)TRACE.push([dt].concat(CUPS.map(function(c){return c.match})));
    if(all&&!NOWIN)pzWin()}
  /* the tools, in a row along the bottom in this world only. In a level only the pieces it gives; outside the levels, the pieces
     reached so far */
  var TOOLS=[['ink','hand','<path d="M6 13.5c-1.6-1.8-.9-3.9.6-5.4L10 4.8c.6-.6 1.5-.5 2 .1.4.5.3 1.2-.1 1.7l-1.3 1.4 2.1-2c.6-.6 1.4-.6 1.9 0 .5.5.4 1.3-.1 1.8l-2.2 2.2 1.4-1.3c.5-.5 1.3-.5 1.8 0s.4 1.3-.1 1.8l-3.4 3.4c-1.8 1.8-4.3 2-6 .2z"/>'],
    ['wall','wall','<path d="M3 15.5L15.5 3"/><circle cx="3" cy="15.5" r="1.4"/><circle cx="15.5" cy="3" r="1.4"/>'],
    ['fan','fan','<circle cx="9.2" cy="9.2" r="1.6"/><path d="M9.2 7.6c0-3 1.4-4.6 3.2-4.2 1.5.4 1.4 2.6-1.5 4.6M10.8 9.2c3 0 4.6 1.4 4.2 3.2-.4 1.5-2.6 1.4-4.6-1.5M9.2 10.8c0 3-1.4 4.6-3.2 4.2-1.5-.4-1.4-2.6 1.5-4.6M7.6 9.2c-3 0-4.6-1.4-4.2-3.2.4-1.5 2.6-1.4 4.6 1.5"/>'],
    ['prism','prism','<path d="M9.2 2.4l5.9 3.4v6.8l-5.9 3.4-5.9-3.4V5.8z"/><path d="M9.2 2.4v13.6"/>'],
    ['drain','drain','<circle cx="9.2" cy="9.2" r="6.4"/><path d="M9.2 5.4a3.8 3.8 0 1 1-3.6 2.6M9.2 7.8a1.4 1.4 0 1 1-1.3 1.9"/>'],
    ['tunnel','tunnel','<circle cx="4.2" cy="13.8" r="2.3"/><circle cx="14.2" cy="4.6" r="2.3"/><path d="M5.6 11.9C6.6 7.6 9.4 5.6 11.9 5"/>'],
    ['puz','levels','<circle cx="3.6" cy="14.6" r="1.7"/><circle cx="9.2" cy="9.2" r="1.7"/><circle cx="14.8" cy="3.8" r="1.7"/><path d="M4.9 13.4l3.1-3M10.5 8l3.1-3"/>'],
    ['undo','again','<path d="M4.6 7.2A5.6 5.6 0 1 1 4 11.6M4.4 3.6v3.8h3.8"/>']];
  function toolsBuild(){
    var r=$('tools');if(!r||r.childNodes.length)return;
    TOOLS.forEach(function(t){var b=document.createElement('button');b.type='button';b.className='tb';b.id='t_'+t[0];
      b.innerHTML='<span></span><svg viewBox="0 0 18.4 18.4" aria-hidden="true">'+t[2]+'</svg>';b.firstChild.textContent=t[1];
      b.addEventListener('click',function(){
        if(t[0]==='puz'){PATH=!PATH;pathT=FT;if(PATH){STARS=lsGet()}toolsSync();if(AU.auto)musicOn();return}
        if(t[0]==='undo'){if(PZ>=0)pzLoad(PZ);toolsSync();return}
        PATH=false;TOOL=t[0];toolsSync()});r.appendChild(b)})}
  function have(k,g){return k==='wall'?g.w:k==='fan'?g.f:k==='prism'?(g.p?g.p.length:MAXP):k==='drain'?g.d:k==='tunnel'?g.t:1}
  function toolsSync(){var g=given(),r=$('tools'),h0=r?r.offsetHeight:0;TOOLS.forEach(function(t){var b=$('t_'+t[0]);if(!b)return;
      if(t[0]==='puz'){b.setAttribute('aria-pressed',PATH?'true':'false');return}
      if(t[0]==='undo'){b.hidden=PZ<0;return}b.setAttribute('aria-pressed',TOOL===t[0]&&!PATH?'true':'false');
      b.hidden=t[0]!=='ink'&&(PZ>=0?!have(t[0],g):!unlocked(t[0]))});
    if(r&&!r.hidden&&r.offsetHeight!==h0){layout();pzRelayout()}}
  function enter(){if(GLX.ok&&gen!==GLX.gen)glSetup();size();t0=FT;lastT=0;STARS=lsGet();toolsBuild();var r=$('tools');if(r)r.hidden=false;toolsSync()}
  function leave(){last={};rows={};q.length=0;bdrag={};PATH=false;var r=$('tools');if(r)r.hidden=true}
  /* ---- the map of the levels: six rows, a chapter each, four levels to a row, one line running through them all ---- */
  function pathNodes(){var n=LEVELS.length,rws=Math.ceil(n/4),top=STG.y0+Math.max(54,STG.h*.15),bot=STG.y1-Math.max(26,STG.h*.06),rh=rws>1?(bot-top)/(rws-1):0,
      w=Math.min(STG.w*.8,380),x0=STG.cx-w/2,out=[];
    for(var i=0;i<n;i++){var r=Math.floor(i/4),c=i%4;if(r%2)c=3-c;out.push({i:i,x:x0+w*(c+.5)/4,y:top+r*rh,r:r})}
    return out}
  function freeBtn(){return {x:STG.cx,y:STG.y0+Math.max(20,STG.h*.05),w:118,h:28}}
  function star(c,x,y,R,fill){c.beginPath();for(var k=0;k<10;k++){var a=-Math.PI/2+k*Math.PI/5,rr=k%2?R*.45:R;c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr)}c.closePath();if(fill)c.fill();else c.stroke()}
  function pathDraw(t){
    var c=OV,ns=pathNodes(),i,k=smooth((FT-pathT)/260),hi=firstUnsolved();
    c.fillStyle='rgba(1,4,10,'+(.72*k).toFixed(3)+')';c.fillRect(0,0,VW,VH);if(k<.05)return;c.globalAlpha=k;
    c.lineWidth=1.2;c.strokeStyle='rgba(62,240,255,.28)';c.beginPath();ns.forEach(function(n,j){if(j)c.lineTo(n.x,n.y);else c.moveTo(n.x,n.y)});c.stroke();
    c.textAlign='left';c.textBaseline='alphabetic';c.font='600 9px '+MONO;
    CH.forEach(function(h,j){var n=ns[h.i];if(!n)return;c.fillStyle='rgba(234,249,255,.55)';c.fillText((j+1)+' · '+h.n.toUpperCase(),Math.min(ns[h.i].x,ns[Math.min(h.i+3,ns.length-1)].x)-16,n.y-26)});
    c.textAlign='center';c.textBaseline='middle';
    ns.forEach(function(n){var open=isOpen(n.i),s=STARS[n.i]||0,cur=n.i===PZ,next=open&&!s&&n.i===hi,R=15;
      c.fillStyle='rgba(1,4,10,.9)';c.beginPath();c.arc(n.x,n.y,R,0,TAU);c.fill();
      c.lineWidth=cur||next?2:1.3;c.strokeStyle=!open?'rgba(120,140,160,.35)':s?'rgba(62,240,255,.9)':'rgba(234,249,255,'+(next?(.6+.35*Math.sin(t*.006)).toFixed(3):'.8')+')';
      c.beginPath();c.arc(n.x,n.y,R,0,TAU);c.stroke();if(cur){c.strokeStyle='rgba(62,240,255,.45)';c.beginPath();c.arc(n.x,n.y,R+5,0,TAU);c.stroke()}
      c.font='600 11px '+MONO;c.fillStyle=open?'rgba(234,249,255,.95)':'rgba(120,140,160,.5)';c.fillText(String(n.i+1),n.x,n.y+.5);
      if(open)for(var j=0;j<3;j++){c.fillStyle=j<s?'rgba(255,214,120,.95)':'rgba(234,249,255,.22)';c.strokeStyle=c.fillStyle;c.lineWidth=.8;star(c,n.x-9+j*9,n.y+R+8,3.6,j<s)}});
    var f=freeBtn();c.lineWidth=1.2;c.strokeStyle=PZ<0?'rgba(62,240,255,.7)':'rgba(234,249,255,.4)';c.beginPath();
    if(c.roundRect)c.roundRect(f.x-f.w/2,f.y-f.h/2,f.w,f.h,14);else c.rect(f.x-f.w/2,f.y-f.h/2,f.w,f.h);c.stroke();
    c.font='600 9.5px '+MONO;c.fillStyle='rgba(234,249,255,.85)';c.fillText('PLAY FREELY',f.x,f.y+.5);
    c.globalAlpha=1;c.textAlign='left';c.textBaseline='alphabetic'}
  function pathTap(x,y){
    var ns=pathNodes(),i;for(i=0;i<ns.length;i++){if(Math.hypot(ns[i].x-x,ns[i].y-y)<22){if(isOpen(i)){pzLoad(i);toolsSync();hit('tok',.3,pan(x))}else hit('tok',.12,pan(x));return}}
    var f=freeBtn();if(Math.abs(x-f.x)<f.w/2+6&&Math.abs(y-f.y)<f.h/2+6){if(PZ>=0)pzOff();PATH=false;TOOL='ink';toolsSync();return}
    PATH=false;toolsSync()}
  /* (the stage is measured again by the world switch once the row is shown or put away) */
  function down(p){
    if(PATH){bdrag[p.id]={kind:'path'};return}
    if(!p.ghost&&TOOL!=='ink'&&p.n<2){bdrag[p.id]={kind:TOOL,x0:p.x,y0:p.y};return}
    last[p.id]={x:p.x,y:p.y};rows[p.id]=rowOf(p.y);note(p,.5)}
  function up(p){
    var b=bdrag[p.id];if(b){delete bdrag[p.id];if(b.kind==='path'){if(p.moved<14&&!p.ghost)pathTap(p.x,p.y);return}buildUp(p,b);toolsSync();return}
    var l=last[p.id];delete last[p.id];delete rows[p.id];if(!l||PZ>=0)return;
    /* a tap is a drop: the ink bursts outward */
    if(FT-p.t0<260&&p.moved<14){var c=inkOf(p.y);for(var k=0;k<8;k++){var a=k/8*TAU+.3;push(p.x+Math.cos(a)*10,p.y+Math.sin(a)*10,Math.cos(a)*520,Math.sin(a)*520,c,.55,.0007)}}}
  function tick(dt,t){
    var i,ps=PS,r=Math.random;
    /* in a level a finger moves the water and leaves no ink */
    var fk=PZ>=0?0:1;
    for(i=0;i<ps.length;i++){var p=ps[i];if(!p.down||bdrag[p.id])continue;var l=last[p.id];if(!l){l=last[p.id]={x:p.x,y:p.y};rows[p.id]=rowOf(p.y)}
      var dx=p.x-l.x,dy=p.y-l.y,len=Math.hypot(dx,dy);
      if(len>.5){var k=1/Math.max(dt,.008),vx=dx*k,vy=dy*k,m=Math.hypot(vx,vy),cap=VW*5;if(m>cap){vx*=cap/m;vy*=cap/m}
        push(p.x,p.y,vx,vy,inkOf(p.y),clamp(len/52,.04,.7)*fk);l.x=p.x;l.y=p.y;
        var rw=rowOf(p.y);if(rw!==rows[p.id]){rows[p.id]=rw;note(p,.3+.5*Math.min(1,p.spd/900))}}
      else if(t-p.t0>300){push(p.x+(r()-.5)*6,p.y+(r()-.5)*6,(r()-.5)*90,-60-r()*60,inkOf(p.y),.07*fk,.0016)}}
    /* the machine runs: fans push and (outside the levels) breathe ink; a level's sources breathe their own colours, its winds only push */
    var fr=Math.min(1,dt*60),ks=KS(),kr=KR(),kp=KP();
    FANS.forEach(function(f){f.ph+=dt*9;push(WX(f.x)+f.dx*10,WY(f.y)+f.dy*10,f.dx*820*ks,f.dy*820*ks,INK[f.c]||INK[0],PZ>=0||f.c<0?0:.05*fr,.0009*kr)});
    FIX.fans.forEach(function(f){f.ph+=dt*7;if(f.c<0){push(WX(f.x)+f.dx*10,WY(f.y)+f.dy*10,f.dx*820*ks,f.dy*820*ks,INK[0],0,.0009*kr);return}
      push(WX(f.x)+f.dx*8,WY(f.y)+f.dy*8,f.dx*760*ks+(r()-.5)*50*ks,f.dy*760*ks+(r()-.5)*50*ks,INK[f.c],LP.ink*fr,.0013*kr)});
    /* a drain draws the water in and swallows the ink near it; in a level it swallows a jet that runs into it whole, its push as well
       as its ink, so the jet stops there (a drain that took only the ink would leave the jet's push to shove the other smoke aside) */
    DRAINS.concat(FIX.drains).forEach(function(d){d.ph+=dt*3;VQ.push([WX(d.x),WY(d.y),(PZ>=0?.85:.55)*fr,0,1300*kp],[WX(d.x),WY(d.y),300*ks,1,900*kp]);
      if(PZ>=0)VQ.push([WX(d.x),WY(d.y),.5*fr,3,1300*kp])});
    /* a tunnel draws the water into one end and blows it out of the other, the way it was dug */
    var tr=cupR()*.75;TUNNELS.forEach(function(u){u.ph+=dt*2;var ax=WX(u.ax),ay=WY(u.ay),bx2=WX(u.bx),by2=WY(u.by),m=Math.hypot(bx2-ax,by2-ay)||1,ux=(bx2-ax)/m,uy=(by2-ay)/m;
      VQ.push([ax,ay,240*ks,1,tr*tr*1.3]);push(bx2+ux*tr*.5,by2+uy*tr*.5,ux*700*ks,uy*700*ks,INK[0],0,.0010*kr)});
    PRISMS.forEach(function(p){p.ph=(p.ph||0)+dt});
    /* the rings are measured a few times a second, and fill by the water's own time (a slow phone fills them no faster than the smoke moves) */
    if(CUPS.length&&FT-rbT>280){var dtc=simT-rbS;rbS=simT;rbT=FT;want=1;cupsCheck(clamp(dtc,0,.6))}
    if(pzWon&&FT-pzWon>3200){pzWon=0;if(PZ+1<LEVELS.length)pzLoad(PZ+1);else{pzSaved=[1,1,1,1,1,1,1,1,1];pzOff();TOOL='ink';PATH=true;pathT=FT}toolsSync()}
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
  function gesture(e){if(e.ghost||PATH||bdrag[Object.keys(bdrag)[0]])return;
    if(Math.abs(e.rot)>.004)VQ.push([e.cx,e.cy,-e.rot/e.dt*95,2,3600]);
    if(Math.abs(e.scale-1)>.004)VQ.push([e.cx,e.cy,(1-e.scale)/e.dt*700,1,5200])}
  function step(dtr){
    /* the water is moved in small steps so it stays steady; what fades, fades by the real clock */
    var gl=GLX.gl,u,i,vt=[1/sw,1/sh],dt2=[1/dw,1/dh],dt=Math.min(dtr,1/45);simT+=dt;
    /* the photo, when it arrives or changes, floods the water */
    var ph=PHOTO.has?photoTex():null,rc=null;
    if(ph){var pr=photoRect();rc=[pr.x/VW,1-(pr.y+pr.h)/VH,pr.w/VW,pr.h/VH]}
    if(ph&&photoVer!==PHOTO.ver){photoVer=PHOTO.ver;u=run(P.heal,dye.w,dt2);glBind(0,dye.r.tex,u.uT);glBind(1,ph.tex,u.uPh);gl.uniform4f(u.uRect,rc[0],rc[1],rc[2],rc[3]);gl.uniform1f(u.uK,1);glQuad(P.heal);dye.swap()}
    if(!ph&&photoVer!==-1&&!PHOTO.has)photoVer=-1;
    if(obsDirty)obsBuild();
    if(clearInk){clearInk=false;u=run(P.mul,dye.w,dt2);glBind(0,dye.r.tex,u.uT);gl.uniform1f(u.uK,.0);glQuad(P.mul);dye.swap()}
    for(i=0;i<q.length;i++){var s=q[i],c=s[4],a=s[5];
      if(!simple)splat(vel,s[0],s[1],s[2]/VW*sw,-s[3]/VH*sh,0,s[6]);
      if(a>0)splat(dye,s[0],s[1],c[0]*a,c[1]*a,c[2]*a,s[6]*(simple?1.6:1),1)}
    q.length=0;
    /* drains and whirlpools: [x, y, strength, mode (0 eat ink, 1 draw in, 2 whirl, 3 stop the water), radius in pixels squared] */
    for(i=0;i<VQ.length&&i<24;i++){var v=VQ[i],tg=v[3]===0?dye:vel;if(!tg)continue;u=run(P.snk,tg.w,[1/tg.w.w,1/tg.w.h]);glBind(0,tg.r.tex,u.uT);gl.uniform2f(u.uPt,v[0]/VW,1-v[1]/VH);
      gl.uniform2f(u.uWH,VW,VH);gl.uniform1f(u.uRad,v[4]);gl.uniform1f(u.uK,v[2]);gl.uniform1f(u.uMode,v[3]);gl.uniform2f(u.uCell,sw/VW,sh/VH);glQuad(P.snk);tg.swap()}
    VQ.length=0;
    /* prisms colour the smoke in them; tunnels carry it from one end to the other */
    var pr2=cupR()*.8,all=FIX.prisms.concat(PRISMS);
    for(i=0;i<all.length;i++){var pm=all[i],col=INK[pm.c]||INK[0];u=run(P.tint,dye.w,dt2);glBind(0,dye.r.tex,u.uT);gl.uniform2f(u.uPt,pm.x,1-pm.y);gl.uniform2f(u.uWH,VW,VH);gl.uniform1f(u.uR,pr2);gl.uniform3f(u.uCol,col[0],col[1],col[2]);glQuad(P.tint);dye.swap()}
    var tr=cupR()*.75;
    for(i=0;i<TUNNELS.length;i++){var tn=TUNNELS[i];u=run(P.tun,dye.w,dt2);glBind(0,dye.r.tex,u.uT);gl.uniform2f(u.uA,tn.ax,1-tn.ay);gl.uniform2f(u.uB,tn.bx,1-tn.by);gl.uniform2f(u.uWH,VW,VH);gl.uniform1f(u.uR,tr);gl.uniform1f(u.uK,.55);glQuad(P.tun);dye.swap()}
    if(!simple){
      u=run(P.curl,curl,vt);glBind(0,vel.r.tex,u.uVel);glQuad(P.curl);
      u=run(P.vort,vel.w,vt);glBind(0,vel.r.tex,u.uVel);glBind(1,curl.tex,u.uCurl);gl.uniform1f(u.uK,20);gl.uniform1f(u.uDt,dt);glQuad(P.vort);vel.swap();
      /* smoke rises (in a level, as fast for the tank's height on any screen) */
      u=run(P.buo,vel.w,vt);glBind(0,vel.r.tex,u.uVel);glBind(1,dye.r.tex,u.uDye);gl.uniform1f(u.uB,(reduce?18:64)*dt*(PZ>=0?LP.buo*clamp(B.h/VH*sh/197,.5,2):1));glQuad(P.buo);vel.swap();
      u=run(P.div,div,vt);glBind(0,vel.r.tex,u.uVel);glQuad(P.div);
      u=run(P.mul,prs.w,vt);glBind(0,prs.r.tex,u.uT);gl.uniform1f(u.uK,.8);glQuad(P.mul);prs.swap();
      var it=[18,14,10][QL];for(i=0;i<it;i++){u=run(P.prs,prs.w,vt);glBind(0,prs.r.tex,u.uP);glBind(1,div.tex,u.uDiv);glQuad(P.prs);prs.swap()}
      u=run(P.grad,vel.w,vt);glBind(0,prs.r.tex,u.uP);glBind(1,vel.r.tex,u.uVel);glQuad(P.grad);vel.swap();
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
    var u=run(P.show,null,[1/dw,1/dh]);glBind(0,dye.r.tex,u.uT);gl.uniform3f(u.uBg,ABYSS[0],ABYSS[1],ABYSS[2]);gl.uniform1f(u.uZ,.55);glQuad(P.show);
    pieces(t);if(PATH)pathDraw(t)}
  function cs(col,a){return 'rgba('+Math.round(col[0]*255)+','+Math.round(col[1]*255)+','+Math.round(col[2]*255)+','+a+')'}
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
    function fan(f,fixed){var x=WX(f.x),y=WY(f.y),col=f.c<0?[.86,.93,1]:INK[f.c],s=cs(col,'');
      c.strokeStyle=s+'.95)';c.lineWidth=1.4;c.beginPath();c.arc(x,y,fixed&&!f.wind?9:11,0,TAU);c.stroke();if(f.wind){c.strokeStyle='rgba(200,215,225,.8)';c.beginPath();c.arc(x,y,15,0,TAU);c.stroke();c.strokeStyle=s+'.95)'}
      for(k=0;k<3;k++){var a=f.ph+k*TAU/3;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a)*(fixed&&!f.wind?7:9),y+Math.sin(a)*(fixed&&!f.wind?7:9));c.stroke()}
      if(fixed&&!f.wind){c.fillStyle=s+'.9)';c.beginPath();c.arc(x,y,3,0,TAU);c.fill()}
      c.beginPath();c.moveTo(x+f.dx*14,y+f.dy*14);c.lineTo(x+f.dx*24,y+f.dy*24);c.stroke();var ax=x+f.dx*24,ay=y+f.dy*24;c.beginPath();c.moveTo(ax-f.dx*5-f.dy*4,ay-f.dy*5+f.dx*4);c.lineTo(ax,ay);c.lineTo(ax-f.dx*5+f.dy*4,ay-f.dy*5-f.dx*4);c.stroke()}
    FIX.fans.forEach(function(f){fan(f,1)});FANS.forEach(function(f){fan(f,0)});
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
    CUPS.forEach(function(cp){var x=WX(cp.x),y=WY(cp.y),col=cp.c==='mix'?[.92,.96,1]:INK[cp.c],s=cs(col,'');
      c.strokeStyle=s+(cp.done?'1)':'.75)');c.lineWidth=cp.done?2.4:1.5;c.setLineDash(cp.c==='mix'?[3,4]:[]);c.beginPath();c.arc(x,y,cr,0,TAU);c.stroke();c.setLineDash([]);
      c.lineWidth=3;c.strokeStyle=s+'.95)';c.beginPath();c.arc(x,y,cr+6,-Math.PI/2,-Math.PI/2+TAU*cp.fill);c.stroke();
      if(cp.done){c.fillStyle=s+(.18+.1*Math.sin(t*.006)).toFixed(3)+')';c.beginPath();c.arc(x,y,cr,0,TAU);c.fill()}});
    /* a level solved: its stars, one after another, in the middle of the tank */
    if(pzWon&&PZ>=0){var e=(FT-pzWon)/1000,cx=B.x0+B.w/2,cy=B.y0+B.h*.5;c.fillStyle='rgba(1,4,10,'+(.5*smooth(e/.4)).toFixed(3)+')';c.fillRect(B.x0,B.y0,B.w,B.h);
      for(k=0;k<3;k++){var g2=smooth((e-.15-k*.18)/.3),R2=26*(k===1?1.25:1)*(.6+.4*g2);if(g2<=0)continue;var on=k<winStars;c.globalAlpha=g2;c.fillStyle=on?'rgba(255,214,120,.98)':'rgba(234,249,255,.25)';c.strokeStyle=c.fillStyle;c.lineWidth=1.4;
        star(c,cx+(k-1)*66,cy-(k===1?10:0),R2,on)}c.globalAlpha=1}
    c.lineCap='butt'}
  function resize(){if(GLX.ok&&P)size()}
  var CN=['cyan','green','amber','rose','violet'];
  function left(n,one,many){return n+' '+(n===1?one:many)}
  function starText(n){var s='';for(var k=0;k<3;k++)s+=k<n?'★':'☆';return s}
  function hud(){
    if(PATH)return 'levels · '+starTotal()+' of '+LEVELS.length*3+' stars\npick a level: each solved opens the next, and the band grows\nthe fewer pieces you build, the more stars';
    if(PZ>=0){var L=LEVELS[PZ],g=given(),J=joinAt(PZ),n=used();
      if(pzWon)return 'level '+(PZ+1)+' solved '+starText(winStars)+' · '+left(n,'piece','pieces')+(winStars<3?' (three stars with '+L.par+')':'')+
        (J.length?'\n'+J.map(function(k){return 'the '+BNAMES[k].toLowerCase()}).join(' and ')+(J.length>1?' join':' joins')+' the band':'');
      var l2=CUPS.map(function(c){return (c.c==='mix'?'white':CN[c.c])+' ring '+(c.done?'full':Math.round(c.fill*100)+'%')}).join(' · '),
        b=[],w=g.w-WALLS.length,f=g.f-FANS.length,pl=prismsLeft()||[],d=g.d-DRAINS.length,tt=g.t-TUNNELS.length;
      if(w>0)b.push(left(w,'wall','walls'));if(f>0)b.push(left(f,'fan','fans'));if(pl.length)b.push(pl.length===1?'1 '+CN[pl[0]]+' prism':pl.length+' prisms ('+pl.map(function(k){return CN[k]}).join(', ')+')');
      if(d>0)b.push(left(d,'drain','drains'));if(tt>0)b.push(left(tt,'tunnel','tunnels'));
      return 'level '+(PZ+1)+' of '+LEVELS.length+' · '+CH[chapterOf(PZ)].n+' · fill each ring with smoke of its colour'+(L.tip?'\n'+L.tip:'')+'\n'+l2+'\n'+
        (b.length?'you can still build '+b.join(', '):'nothing left to build')+' · three stars with '+left(L.par,'piece','pieces')}
    var bt=[[WALLS.length,'wall','walls'],[FANS.length,'fan','fans'],[PRISMS.length,'prism','prisms'],[DRAINS.length,'drain','drains'],[TUNNELS.length,'tunnel','tunnels']].filter(function(a){return a[0]}).map(function(a){return left(a[0],a[1],a[2])}).join(' · ');
    if(PHOTO.has)return 'your photo is the ink: smear it and it remembers itself'+(bt?'\nbuilt: '+bt:'');
    var st=starTotal();
    return 'real smoke, worked out as it moves: push it with a finger, tap for a drop\nbuild with the tools below, or play the '+LEVELS.length+' levels'+(bt?'\nbuilt: '+bt:st?'\nlevels: '+st+' of '+LEVELS.length*3+' stars':'')}
  /* the hint: a tap (a drop of ink bursts), then one finger drawn across. The tap comes first on purpose: this is the world the page
     opens on, and a tap is the one touch an iPhone will start the sound on */
  function ghost(t){if(PZ>=0||PATH||TOOL!=='ink')return [null];var u=(t*.21)%1,k=Math.floor(t*.21)%2;
    if(u>.05&&u<.1)return [{x:STG.x0+STG.w*(k?.7:.3),y:STG.cy+STG.h*(k?.16:-.14)}];
    if(u>.2&&u<.84){var e=smooth((u-.2)/.64);return [{x:STG.x0+STG.w*(k?.82-.64*e:.18+.64*e),y:STG.cy+STG.h*(.22*Math.sin(e*5.2+k*2)+(k?-.12:.12))}]}
    return [null]}
  /* pieces put in by a test, in fractions of the tank in a level (of the stage outside one) */
  function U(x){return PZ>=0?bx(x):(STG.x0+x*STG.w)/VW}function V(y){return PZ>=0?by(y):(STG.y0+y*STG.h)/VH}
  return {enter:enter,leave:leave,resize:function(){resize();pzRelayout();obsDirty=true},down:down,up:up,gesture:gesture,tick:tick,draw:draw,hud:hud,ghost:ghost,gl:function(){gen=-1},
    dbg:function(){return {ok:!!(P&&dye),simT:simT,simple:simple,sw:sw,sh:sh,dw:dw,dh:dh,lin:GLX.hfLin,tool:TOOL,pz:PZ,won:!!pzWon,walls:WALLS.length,fans:FANS.length,drains:DRAINS.length,prisms:PRISMS.length,tunnels:TUNNELS.length,wn:WN,
      stars:STARS.slice(),winStars:winStars,path:PATH,board:{x0:B.x0,y0:B.y0,w:B.w,h:B.h},
      cups:CUPS.map(function(c){return {c:c.c,fill:c.fill,match:c.match,done:c.done,x:WX(c.x),y:WY(c.y)}}),fix:{walls:FIX.walls.length,fans:FIX.fans.length,drains:FIX.drains.length,prisms:FIX.prisms.length},rb:rbOk}},
    /* for the tests: how much ink there is around a point (pixels), from the last copy read back; and a level by number */
    sample:function(x,y,r){want=1;return sample(x,y,r,null,false)},
    mid:function(){want=1;if(!rbOk)return null;var w=0,y=0,i,j;for(j=0;j<rbH;j++)for(i=0;i<rbW;i++){var o=(j*rbW+i)*4,d=Math.max(rbBuf[o],rbBuf[o+1],rbBuf[o+2])/255;w+=d;y+=d*(1-(j+.5)/rbH)}return w?y/w:null},
    level:function(i){if(i<0)pzOff();else pzLoad(i);toolsSync()},tool:function(k){TOOL=k;PATH=false;toolsSync()},
    /* for the tests: the levels themselves (and new ones to try), pieces put in by hand, the map's places, the stars */
    levels:LEVELS,setLevels:function(a){LEVELS.length=0;a.forEach(function(l){LEVELS.push(l)})},nowin:function(b){NOWIN=!!b},trace:function(on){var t=TRACE;TRACE=on?[]:null;return t},
    fastdye:function(b){FASTDYE=!!b;szKey=''},
    /* for the tests: the water stepped as a phone at a given frame rate steps it (1/60, or 1/30 for one saving power), whatever this machine's pace */
    fixdt:function(v){FIXDT=+v||0},phys:function(o){if(o)for(var k in o)LP[k]=o[k];return JSON.parse(JSON.stringify(LP))},path:function(b){PATH=!!b;pathT=FT-1000;toolsSync()},pathNodes:function(){return {nodes:pathNodes(),free:freeBtn()}},
    stars:function(a){if(a){STARS=a.slice();lsSet()}return STARS.slice()},
    put:function(k,a){if(k==='wall')WALLS.push([U(a[0]),V(a[1]),U(a[2]),V(a[3]),0]);else if(k==='fan'){var m=Math.hypot(a[2],a[3])||1;FANS.push({x:U(a[0]),y:V(a[1]),dx:a[2]/m,dy:a[3]/m,c:PZ>=0?-1:a[4]||0,ph:0})}
      else if(k==='drain')DRAINS.push({x:U(a[0]),y:V(a[1]),ph:0});else if(k==='prism')PRISMS.push({x:U(a[0]),y:V(a[1]),c:a[2],ph:0});
      else if(k==='tunnel')TUNNELS.push({ax:U(a[0]),ay:V(a[1]),bx:U(a[2]),by:V(a[3]),ph:0});obsDirty=true},
    win:function(){if(!CUPS.length||pzWon)return;CUPS.forEach(function(c){c.fill=1;c.done=true});pzWin()}}
})();
