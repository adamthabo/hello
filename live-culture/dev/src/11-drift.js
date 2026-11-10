/* ---------- DRIFT: ink in water. A real fluid on the graphics chip (Stam's stable fluids: carry the flow along itself, find the
   pressure that keeps it from piling up, take that pressure's push out). A finger drags the water and leaves ink; a tap is a
   drop; a finger that stays is a spring. The screen is nine notes high, and the ink is the colour of the note it was drawn on.
   The bass rolls the water from below, the balafon and kora drip their notes into it as a score.
   Given a photo, the photo is the ink: smear it, and it slowly remembers itself.
   It is also a machine to build in, and a run of puzzles. Smoke rises (warm ink is light). Walls stop the water and the ink; a fan
   pushes the water one way for as long as it stands (and breathes ink, outside the puzzles); a drain swallows ink and draws the water
   in. Two fingers turning make a whirlpool; two fingers closing pull the water in, opening throw it out. In a puzzle, fixed sources
   breathe ink of their own colours and each cup wants its colour (or, for a white cup, two colours mixed): build walls, fans and
   drains (a few of each) to bring the right smoke into every cup. A finger only moves the water there, it leaves no ink. Each puzzle
   solved brings one more player into the band, the electric guitar last. ---------- */
var DRIFT=(function(){
  var P=null,gen=-1,vel=null,dye=null,prs=null,div=null,curl=null,sw=0,sh=0,dw=0,dh=0,type=0,filt=0,simple=false,ql=-1,szKey='',
    q=[],last={},rows={},photoVer=-1,ink=0,t0=0,
    /* the machine: walls (segments, in fractions of the screen), fans, drains; in a puzzle also its fixed sources, walls and drains, and
       its cups. obs is the walls drawn into the water's own grid: 1 where there is wall */
    obs=null,obsDirty=true,WB=null,WN=0,TOOL='ink',WALLS=[],FANS=[],DRAINS=[],CUPS=[],FIX={walls:[],fans:[],drains:[]},PZ=-1,pzWon=0,pzSaved=null,
    rb=null,rbBuf=null,rbW=0,rbH=0,rbT=0,rbS=0,rbOk=false,simT=0,NOWIN=false,TRACE=null,want=0,bdrag={},VQ=[],toolsOn=false,best=0,flash=[];
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
      'if(uMode<0.5){gl_FragColor=vec4(o.rgb*(1.0-clamp(uK*g,0.0,1.0)),1.0);}else{vec2 dir=pp/(sqrt(r2)+1.0);if(uMode>1.5)dir=vec2(-dir.y,dir.x);gl_FragColor=vec4(o.xy-dir*uK*g*uCell,0.0,1.0);}}'
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
    if(!P)return;var ar=VW/VH,S=(COARSE?[128,96,64]:[160,128,96])[QL],D=(COARSE?[512,384,256]:[720,512,384])[QL],
      w=Math.round(ar>=1?S*ar:S),h=Math.round(ar>=1?S:S/ar),W=Math.round(ar>=1?D*ar:D),Hh=Math.round(ar>=1?D:D/ar),key=w+'x'+h+'x'+W+'x'+Hh;
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
  var MAXW=24,MAXF=6,MAXD=4,TH=10;
  function WX(u){return u*VW}function WY(v){return v*VH}
  /* a place in a puzzle is given in fractions of the stage (the part of the screen the chrome leaves); pieces are kept in fractions of the screen */
  function sx(u){return (STG.x0+u*STG.w)/VW}function sy(v){return (STG.y0+v*STG.h)/VH}
  /* the five puzzles. src: a source breathing ink (x, y, direction, colour: 0 cyan, 1 green, 2 amber, 3 rose, 4 violet); cups: the
     rings, where each colour must go ('mix' wants cyan and amber together); walls and drains: fixed; give: how many walls, fans and
     drains may be built; tip: the clue in the readout; sol: one way to solve it (tools/t_puzzles.js builds it and checks that every
     ring fills, and that with nothing built none does). Every puzzle is carried by its sources' jets: smoke that only drifts (along
     a wall, say) is too faint to carry far and barely rises. Places are in fractions of the stage */
  var LEVELS=[
    {src:[[.1,.75,1,0,0]],cups:[[.72,.42,0]],walls:[],drains:[],give:[3,1,0],
      tip:'a wall in its way turns the smoke',sol:[['wall',[.3,.8,.55,.6]]]},
    {src:[[.5,.88,0,-1,2]],cups:[[.18,.5,2]],walls:[],drains:[],give:[2,1,0],
      tip:'a fan pushes the water, and the smoke with it',sol:[['fan',[.56,.66,-1,0]]]},
    {src:[[.1,.4,1,0,3]],cups:[[.84,.82,3]],walls:[[.86,.56,1,.56]],drains:[],give:[1,1,0],
      tip:'smoke never sinks by itself',sol:[['fan',[.45,.32,0,1]]]},
    {src:[[.1,.45,1,0,3],[.5,.9,0,-1,0]],cups:[[.84,.45,3]],walls:[],drains:[],give:[2,1,0],
      tip:'one jet pushes another aside',sol:[['wall',[.42,.8,.58,.8]]]},
    {src:[[.15,.88,0,-1,0],[.85,.88,0,-1,2]],cups:[[.5,.35,'mix']],walls:[],drains:[],give:[2,2,0],
      tip:'white is cyan and amber together',sol:[['fan',[.08,.66,1,0]],['fan',[.92,.66,-1,0]]]}];
  /* who joins the band when each puzzle is solved: the shekere, the djembe, the talking drum and the agogo, the balafon and the kora,
     and the electric guitar last */
  var JOIN=[[1],[2],[3,4],[6,7],[8]],MIXC=[.506,.668,.542];
  function joined(i){var a=[];JOIN.slice(0,i).forEach(function(j){a=a.concat(j)});return a}
  function cupR(){return Math.min(STG.w,STG.h)*.085}
  function lsGet(){try{return +localStorage.getItem('lc.smoke.solved')||0}catch(e){return 0}}
  function lsSet(n){try{localStorage.setItem('lc.smoke.solved',String(n))}catch(e){}}
  function pzLoad(i){
    var L=LEVELS[i];if(!L)return;PZ=i;pzWon=0;rbS=simT;WALLS=[];FANS=[];DRAINS=[];
    FIX.walls=L.walls.map(function(w){return [sx(w[0]),sy(w[1]),sx(w[2]),sy(w[3]),1]});
    FIX.fans=L.src.map(function(f){var m=Math.hypot(f[2],f[3])||1;return {x:sx(f[0]),y:sy(f[1]),dx:f[2]/m,dy:f[3]/m,c:f[4],fixed:1,ph:0}});
    FIX.drains=L.drains.map(function(d){return {x:sx(d[0]),y:sy(d[1]),fixed:1,ph:0}});
    CUPS=L.cups.map(function(c){return {x:sx(c[0]),y:sy(c[1]),c:c[2],fill:0,match:0,done:false}});
    obsDirty=true;clearInk=true;
    /* the band: the low drum and the bass, and one more player for every puzzle already solved */
    if(!pzSaved)pzSaved=ON.slice();for(var k=0;k<NL;k++){var on=k===0||k===5||joined(i).indexOf(k)>=0;if(!!ON[k]!==on)setPlayer(k,on,true)}}
  function pzRelayout(){if(PZ<0)return;var L=LEVELS[PZ];
    FIX.walls=L.walls.map(function(w){return [sx(w[0]),sy(w[1]),sx(w[2]),sy(w[3]),1]});L.src.forEach(function(f,k){FIX.fans[k].x=sx(f[0]);FIX.fans[k].y=sy(f[1])});
    L.drains.forEach(function(d,k){FIX.drains[k].x=sx(d[0]);FIX.drains[k].y=sy(d[1])});L.cups.forEach(function(c,k){CUPS[k].x=sx(c[0]);CUPS[k].y=sy(c[1])});obsDirty=true}
  function pzOff(){PZ=-1;CUPS=[];FIX={walls:[],fans:[],drains:[]};WALLS=[];FANS=[];DRAINS=[];obsDirty=true;
    if(pzSaved){for(var k=0;k<NL;k++)if(!!ON[k]!==!!pzSaved[k])setPlayer(k,!!pzSaved[k],true);pzSaved=null}}
  var clearInk=false;
  function given(){var L=PZ>=0?LEVELS[PZ]:null;return L?{w:L.give[0],f:L.give[1],d:L.give[2]}:{w:MAXW,f:MAXF,d:MAXD}}
  function pzWin(){
    pzWon=FT;best=Math.max(best,PZ+1);lsSet(best);(JOIN[PZ]||[]).forEach(function(k){if(!ON[k])setPlayer(k,true)});
    tone('bowl',pent(0,52),.42,0);tone('glass',pent(7,52),.3,-.4,AC()+.12);tone('glass',pent(9,52),.3,.4,AC()+.24);
    CUPS.forEach(function(c){for(var k=0;k<14;k++){var a=k/14*TAU,col=c.c==='mix'?[.9,.95,1]:INK[c.c];push(WX(c.x)+Math.cos(a)*8,WY(c.y)+Math.sin(a)*8,Math.cos(a)*700,Math.sin(a)*700,col,.4,.0007)}})}
  function AC(){return AU&&AU.c?AU.c.currentTime:0}
  /* the pieces under a point (pixels) */
  function segD(px,py,w){var ax=WX(w[0]),ay=WY(w[1]),bx=WX(w[2]),by=WY(w[3]),dx=bx-ax,dy=by-ay,L=dx*dx+dy*dy,t=L?clamp(((px-ax)*dx+(py-ay)*dy)/L,0,1):0;return Math.hypot(px-ax-t*dx,py-ay-t*dy)}
  function nearest(list,px,py,lim,d){var bi=-1,bd=lim;for(var i=0;i<list.length;i++){var e=d?d(px,py,list[i]):Math.hypot(px-WX(list[i].x),py-WY(list[i].y));if(e<bd){bd=e;bi=i}}return bi}
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
    if(b.kind==='drain'){i=nearest(DRAINS,p.x,p.y,22);if(i>=0){DRAINS.splice(i,1);hit('tok',.3,pan(p.x));return}
      if(DRAINS.length>=g.d)return;DRAINS.push({x:p.x/VW,y:p.y/VH,ph:0});tone('bowl',pent(1,40),.3,pan(p.x))}}
  /* the walls into the water's grid: each a band TH pixels wide with round ends */
  function obsBuild(){
    obsDirty=false;if(!obs||!P||!P.wall)return;var gl=GLX.gl,all=WALLS.concat(FIX.walls),v=[],i,k;
    function pt(x,y){v.push(x/VW*2-1,1-y/VH*2)}
    for(i=0;i<all.length;i++){var w=all[i],ax=WX(w[0]),ay=WY(w[1]),bx=WX(w[2]),by=WY(w[3]),dx=bx-ax,dy=by-ay,m=Math.hypot(dx,dy)||1,nx=-dy/m*TH/2,ny=dx/m*TH/2;
      pt(ax+nx,ay+ny);pt(bx+nx,by+ny);pt(bx-nx,by-ny);pt(ax+nx,ay+ny);pt(bx-nx,by-ny);pt(ax-nx,ay-ny);
      [[ax,ay],[bx,by]].forEach(function(c){for(k=0;k<8;k++){var a0=k/8*TAU,a1=(k+1)/8*TAU,r=TH/2;pt(c[0],c[1]);pt(c[0]+Math.cos(a0)*r,c[1]+Math.sin(a0)*r);pt(c[0]+Math.cos(a1)*r,c[1]+Math.sin(a1)*r)}})}
    glUse(P.wall,obs);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);WN=v.length/2;
    if(WN){if(!WB)WB=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,WB);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(v),gl.DYNAMIC_DRAW);var a=P.wall.a.a_p;gl.enableVertexAttribArray(a);
      gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLES,0,WN);gl.disableVertexAttribArray(a)}}
  /* the cups, measured: the ink is copied small and read back a few times a second */
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
  var FILLK=8,FILL0=.025;
  function cupsCheck(dt){
    if(!CUPS.length||pzWon)return;var all=true,r=cupR();
    CUPS.forEach(function(c){var m=sample(WX(c.x),WY(c.y),r*.9,c.c==='mix'?MIXC:INK[c.c],c.c==='mix');c.match=m.match;
      if(!c.done){c.fill=clamp(c.fill+dt*FILLK*(m.match-FILL0),0,1);if(c.fill>=1){c.done=true;tone('glass',pent(6+CUPS.indexOf(c)*2,52),.38,pan(WX(c.x)))}}if(!c.done)all=false});
    if(TRACE&&TRACE.length<4000)TRACE.push([dt].concat(CUPS.map(function(c){return c.match})));
    if(all&&!NOWIN)pzWin()}
  /* the tools, along the right-hand edge in this world only */
  var TOOLS=[['ink','hand','<path d="M6 13.5c-1.6-1.8-.9-3.9.6-5.4L10 4.8c.6-.6 1.5-.5 2 .1.4.5.3 1.2-.1 1.7l-1.3 1.4 2.1-2c.6-.6 1.4-.6 1.9 0 .5.5.4 1.3-.1 1.8l-2.2 2.2 1.4-1.3c.5-.5 1.3-.5 1.8 0s.4 1.3-.1 1.8l-3.4 3.4c-1.8 1.8-4.3 2-6 .2z"/>'],
    ['wall','wall','<path d="M3 15.5L15.5 3"/><circle cx="3" cy="15.5" r="1.4"/><circle cx="15.5" cy="3" r="1.4"/>'],
    ['fan','fan','<circle cx="9.2" cy="9.2" r="1.6"/><path d="M9.2 7.6c0-3 1.4-4.6 3.2-4.2 1.5.4 1.4 2.6-1.5 4.6M10.8 9.2c3 0 4.6 1.4 4.2 3.2-.4 1.5-2.6 1.4-4.6-1.5M9.2 10.8c0 3-1.4 4.6-3.2 4.2-1.5-.4-1.4-2.6 1.5-4.6M7.6 9.2c-3 0-4.6-1.4-4.2-3.2.4-1.5 2.6-1.4 4.6 1.5"/>'],
    ['drain','drain','<circle cx="9.2" cy="9.2" r="6.4"/><path d="M9.2 5.4a3.8 3.8 0 1 1-3.6 2.6M9.2 7.8a1.4 1.4 0 1 1-1.3 1.9"/>'],
    ['puz','puzzles','<circle cx="9.2" cy="9.2" r="6.6"/><circle cx="9.2" cy="9.2" r="3.4"/><circle cx="9.2" cy="9.2" r=".9"/>'],
    ['undo','again','<path d="M4.6 7.2A5.6 5.6 0 1 1 4 11.6M4.4 3.6v3.8h3.8"/>']];
  function toolsBuild(){
    var r=$('tools');if(!r||r.childNodes.length)return;
    TOOLS.forEach(function(t){var b=document.createElement('button');b.type='button';b.className='tb';b.id='t_'+t[0];
      b.innerHTML='<span></span><svg viewBox="0 0 18.4 18.4" aria-hidden="true">'+t[2]+'</svg>';b.firstChild.textContent=t[1];
      b.addEventListener('click',function(){
        if(t[0]==='puz'){if(PZ>=0){pzOff()}else{best=lsGet();pzLoad(Math.min(best,LEVELS.length-1))}TOOL=PZ>=0?'wall':'ink';toolsSync();if(AU.auto)musicOn();return}
        if(t[0]==='undo'){if(PZ>=0)pzLoad(PZ);return}
        TOOL=t[0];toolsSync()});r.appendChild(b)})}
  function toolsSync(){var g=given(),r=$('tools'),h0=r?r.offsetHeight:0;TOOLS.forEach(function(t){var b=$('t_'+t[0]);if(!b)return;if(t[0]==='puz'){b.setAttribute('aria-pressed',PZ>=0?'true':'false');return}
    if(t[0]==='undo'){b.hidden=PZ<0;return}b.setAttribute('aria-pressed',TOOL===t[0]?'true':'false');b.hidden=PZ>=0&&((t[0]==='wall'&&!g.w)||(t[0]==='fan'&&!g.f)||(t[0]==='drain'&&!g.d))});
    if(r&&!r.hidden&&r.offsetHeight!==h0){layout();pzRelayout()}}
  function enter(){if(GLX.ok&&gen!==GLX.gen)glSetup();size();t0=FT;lastT=0;toolsBuild();var r=$('tools');if(r)r.hidden=false;toolsSync();best=lsGet()}
  function leave(){last={};rows={};q.length=0;bdrag={};var r=$('tools');if(r)r.hidden=true}
  /* (the stage is measured again by the world switch once the row is shown or put away) */
  function down(p){
    if(!p.ghost&&TOOL!=='ink'&&p.n<2){bdrag[p.id]={kind:TOOL,x0:p.x,y0:p.y};return}
    last[p.id]={x:p.x,y:p.y};rows[p.id]=rowOf(p.y);note(p,.5)}
  function up(p){
    var b=bdrag[p.id];if(b){delete bdrag[p.id];buildUp(p,b);toolsSync();return}
    var l=last[p.id];delete last[p.id];delete rows[p.id];if(!l||PZ>=0)return;
    /* a tap is a drop: the ink bursts outward */
    if(FT-p.t0<260&&p.moved<14){var c=inkOf(p.y);for(var k=0;k<8;k++){var a=k/8*TAU+.3;push(p.x+Math.cos(a)*10,p.y+Math.sin(a)*10,Math.cos(a)*520,Math.sin(a)*520,c,.55,.0007)}}}
  function tick(dt,t){
    var i,ps=PS,r=Math.random;
    /* in a puzzle a finger moves the water and leaves no ink */
    var fk=PZ>=0?0:1;
    for(i=0;i<ps.length;i++){var p=ps[i];if(!p.down||bdrag[p.id])continue;var l=last[p.id];if(!l){l=last[p.id]={x:p.x,y:p.y};rows[p.id]=rowOf(p.y)}
      var dx=p.x-l.x,dy=p.y-l.y,len=Math.hypot(dx,dy);
      if(len>.5){var k=1/Math.max(dt,.008),vx=dx*k,vy=dy*k,m=Math.hypot(vx,vy),cap=VW*5;if(m>cap){vx*=cap/m;vy*=cap/m}
        push(p.x,p.y,vx,vy,inkOf(p.y),clamp(len/52,.04,.7)*fk);l.x=p.x;l.y=p.y;
        var rw=rowOf(p.y);if(rw!==rows[p.id]){rows[p.id]=rw;note(p,.3+.5*Math.min(1,p.spd/900))}}
      else if(t-p.t0>300){push(p.x+(r()-.5)*6,p.y+(r()-.5)*6,(r()-.5)*90,-60-r()*60,inkOf(p.y),.07*fk,.0016)}}
    /* the machine runs: fans push and (outside the puzzles) breathe ink; the puzzle's sources breathe their own colours */
    var fr=Math.min(1,dt*60);
    FANS.forEach(function(f){f.ph+=dt*9;push(WX(f.x)+f.dx*10,WY(f.y)+f.dy*10,f.dx*820,f.dy*820,INK[f.c]||INK[0],PZ>=0||f.c<0?0:.05*fr,.0009)});
    FIX.fans.forEach(function(f){f.ph+=dt*7;push(WX(f.x)+f.dx*8,WY(f.y)+f.dy*8,f.dx*760+(r()-.5)*50,f.dy*760+(r()-.5)*50,INK[f.c],.13*fr,.0013)});
    /* a drain draws the water in and swallows the ink near it (most of a jet that passes over it) */
    DRAINS.concat(FIX.drains).forEach(function(d){d.ph+=dt*3;VQ.push([WX(d.x),WY(d.y),.55*fr,0,1300],[WX(d.x),WY(d.y),300,1,900])});
    /* the cups are measured a few times a second, and fill by the water's own time (a slow phone fills them no faster than the smoke moves) */
    if(CUPS.length&&FT-rbT>280){var dtc=simT-rbS;rbS=simT;rbT=FT;want=1;cupsCheck(clamp(dtc,0,.6))}
    if(pzWon&&FT-pzWon>2600){pzWon=0;if(PZ+1<LEVELS.length)pzLoad(PZ+1);else{pzSaved=[1,1,1,1,1,1,1,1,1];pzOff();TOOL='ink'}toolsSync()}
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
    /* drains and whirlpools: [x, y, strength, mode, radius in pixels squared] */
    for(i=0;i<VQ.length&&i<24;i++){var v=VQ[i],tg=v[3]===0?dye:vel;if(!tg)continue;u=run(P.snk,tg.w,[1/tg.w.w,1/tg.w.h]);glBind(0,tg.r.tex,u.uT);gl.uniform2f(u.uPt,v[0]/VW,1-v[1]/VH);
      gl.uniform2f(u.uWH,VW,VH);gl.uniform1f(u.uRad,v[4]);gl.uniform1f(u.uK,v[2]);gl.uniform1f(u.uMode,v[3]);gl.uniform2f(u.uCell,sw/VW,sh/VH);glQuad(P.snk);tg.swap()}
    VQ.length=0;
    if(!simple){
      u=run(P.curl,curl,vt);glBind(0,vel.r.tex,u.uVel);glQuad(P.curl);
      u=run(P.vort,vel.w,vt);glBind(0,vel.r.tex,u.uVel);glBind(1,curl.tex,u.uCurl);gl.uniform1f(u.uK,20);gl.uniform1f(u.uDt,dt);glQuad(P.vort);vel.swap();
      /* smoke rises */
      u=run(P.buo,vel.w,vt);glBind(0,vel.r.tex,u.uVel);glBind(1,dye.r.tex,u.uDye);gl.uniform1f(u.uB,(reduce?18:64)*dt);glQuad(P.buo);vel.swap();
      u=run(P.div,div,vt);glBind(0,vel.r.tex,u.uVel);glQuad(P.div);
      u=run(P.mul,prs.w,vt);glBind(0,prs.r.tex,u.uT);gl.uniform1f(u.uK,.8);glQuad(P.mul);prs.swap();
      var it=[18,14,10][QL];for(i=0;i<it;i++){u=run(P.prs,prs.w,vt);glBind(0,prs.r.tex,u.uP);glBind(1,div.tex,u.uDiv);glQuad(P.prs);prs.swap()}
      u=run(P.grad,vel.w,vt);glBind(0,prs.r.tex,u.uP);glBind(1,vel.r.tex,u.uVel);glQuad(P.grad);vel.swap();
      if(WN){u=run(P.msk,vel.w,vt);glBind(0,vel.r.tex,u.uT);glBind(1,obs.tex,u.uObs);glQuad(P.msk);vel.swap()}
      u=run(P.adv,vel.w,vt);glBind(0,vel.r.tex,u.uVel);glBind(1,vel.r.tex,u.uSrc);glBind(2,obs?obs.tex:null,u.uObs);gl.uniform1f(u.uHO,WN&&obs?1:0);gl.uniform2f(u.uVTexel,vt[0],vt[1]);gl.uniform2f(u.uSTexel,vt[0],vt[1]);gl.uniform1f(u.uDt,dt);gl.uniform1f(u.uDiss,Math.exp(-.22*dtr));glQuad(P.adv);vel.swap();
      u=run(P.adv,dye.w,dt2);glBind(0,vel.r.tex,u.uVel);glBind(1,dye.r.tex,u.uSrc);glBind(2,obs?obs.tex:null,u.uObs);gl.uniform1f(u.uHO,WN&&obs?1:0);gl.uniform2f(u.uVTexel,vt[0],vt[1]);gl.uniform2f(u.uSTexel,dt2[0],dt2[1]);gl.uniform1f(u.uDt,dt);gl.uniform1f(u.uDiss,ph?1:Math.exp(-(PZ>=0?.16:.36)*dtr));glQuad(P.adv);dye.swap()}
    else{u=run(P.mul,dye.w,dt2);glBind(0,dye.r.tex,u.uT);gl.uniform1f(u.uK,ph?1:Math.exp(-dtr*.5));glQuad(P.mul);dye.swap()}
    if(WN){u=run(P.msk,dye.w,dt2);glBind(0,dye.r.tex,u.uT);glBind(1,obs.tex,u.uObs);glQuad(P.msk);dye.swap()}
    if(ph){u=run(P.heal,dye.w,dt2);glBind(0,dye.r.tex,u.uT);glBind(1,ph.tex,u.uPh);gl.uniform4f(u.uRect,rc[0],rc[1],rc[2],rc[3]);gl.uniform1f(u.uK,1-Math.exp(-dtr/4.5));glQuad(P.heal);dye.swap()}}
  var lastT=0;
  function draw(t){
    if(!GLX.ok||GLX.lost)return;if(gen!==GLX.gen)glSetup();if(P&&(ql!==QL||!dye))size();
    var gl=GLX.gl;glAttrOff();
    if(!P||!dye){glClear(ABYSS[0],ABYSS[1],ABYSS[2]);return}
    gl.disable(gl.BLEND);var dt=lastT?Math.min(.1,Math.max(.001,(t-lastT)/1000)):.016;lastT=t;
    step(dt);if(want){want=0;readBack()}
    var u=run(P.show,null,[1/dw,1/dh]);glBind(0,dye.r.tex,u.uT);gl.uniform3f(u.uBg,ABYSS[0],ABYSS[1],ABYSS[2]);gl.uniform1f(u.uZ,.55);glQuad(P.show);
    pieces(t)}
  /* the machine drawn over the water: walls as lit tubes, fans turning, drains swirling, the puzzle's cups filling */
  function pieces(t){
    var c=OV,i,k,cr=cupR();
    function wall(w,fixed){c.strokeStyle=fixed?'rgba(120,150,170,.55)':'rgba(62,240,255,.28)';c.lineWidth=TH+4;c.beginPath();c.moveTo(WX(w[0]),WY(w[1]));c.lineTo(WX(w[2]),WY(w[3]));c.stroke();
      c.strokeStyle=fixed?'rgba(200,215,225,.85)':'rgba(234,249,255,.95)';c.lineWidth=fixed?3:2;c.beginPath();c.moveTo(WX(w[0]),WY(w[1]));c.lineTo(WX(w[2]),WY(w[3]));c.stroke()}
    c.lineCap='round';FIX.walls.forEach(function(w){wall(w,1)});WALLS.forEach(function(w){wall(w,0)});
    for(var id in bdrag){var b=bdrag[id],p=PT[id];if(!p)continue;
      if(b.kind==='wall'){var a=snap(b.x0,b.y0),e=snap(p.x,p.y);c.setLineDash([5,5]);c.strokeStyle='rgba(234,249,255,.7)';c.lineWidth=2;c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(e[0],e[1]);c.stroke();c.setLineDash([])}
      else if(b.kind==='fan'){c.strokeStyle='rgba(234,249,255,.7)';c.lineWidth=1.5;c.beginPath();c.moveTo(b.x0,b.y0);c.lineTo(p.x,p.y);c.stroke()}}
    /* a puzzle's own sources wear their colour; a fan built in a puzzle breathes no ink and is drawn plain */
    function fan(f,fixed){var x=WX(f.x),y=WY(f.y),col=f.c<0?[.86,.93,1]:INK[f.c],cs='rgba('+Math.round(col[0]*255)+','+Math.round(col[1]*255)+','+Math.round(col[2]*255)+',';
      c.strokeStyle=cs+'.95)';c.lineWidth=1.4;c.beginPath();c.arc(x,y,fixed?9:11,0,TAU);c.stroke();
      for(k=0;k<3;k++){var a=f.ph+k*TAU/3;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a)*(fixed?7:9),y+Math.sin(a)*(fixed?7:9));c.stroke()}
      if(fixed){c.fillStyle=cs+'.9)';c.beginPath();c.arc(x,y,3,0,TAU);c.fill()}
      c.beginPath();c.moveTo(x+f.dx*14,y+f.dy*14);c.lineTo(x+f.dx*24,y+f.dy*24);c.stroke();var ax=x+f.dx*24,ay=y+f.dy*24;c.beginPath();c.moveTo(ax-f.dx*5-f.dy*4,ay-f.dy*5+f.dx*4);c.lineTo(ax,ay);c.lineTo(ax-f.dx*5+f.dy*4,ay-f.dy*5-f.dx*4);c.stroke()}
    FIX.fans.forEach(function(f){fan(f,1)});FANS.forEach(function(f){fan(f,0)});
    DRAINS.concat(FIX.drains).forEach(function(d){var x=WX(d.x),y=WY(d.y);c.fillStyle='rgba(0,0,0,.55)';c.beginPath();c.arc(x,y,9,0,TAU);c.fill();
      for(k=0;k<3;k++){var u=((d.ph*.25+k/3)%1),rr=14*(1-u)+2;c.strokeStyle='rgba(234,249,255,'+(.6*u).toFixed(3)+')';c.lineWidth=1.2;c.beginPath();c.arc(x,y,rr,0,TAU);c.stroke()}
      if(d.fixed){c.strokeStyle='rgba(200,215,225,.8)';c.lineWidth=2;c.beginPath();c.arc(x,y,15,0,TAU);c.stroke()}});
    CUPS.forEach(function(cp){var x=WX(cp.x),y=WY(cp.y),col=cp.c==='mix'?[.92,.96,1]:INK[cp.c],cs='rgba('+Math.round(col[0]*255)+','+Math.round(col[1]*255)+','+Math.round(col[2]*255)+',';
      c.strokeStyle=cs+(cp.done?'1)':'.75)');c.lineWidth=cp.done?2.4:1.5;c.setLineDash(cp.c==='mix'?[3,4]:[]);c.beginPath();c.arc(x,y,cr,0,TAU);c.stroke();c.setLineDash([]);
      c.lineWidth=3;c.strokeStyle=cs+'.95)';c.beginPath();c.arc(x,y,cr+6,-Math.PI/2,-Math.PI/2+TAU*cp.fill);c.stroke();
      if(cp.done){c.fillStyle=cs+(.18+.1*Math.sin(t*.006)).toFixed(3)+')';c.beginPath();c.arc(x,y,cr,0,TAU);c.fill()}});
    c.lineCap='butt'}
  function resize(){if(GLX.ok&&P)size()}
  var CN=['cyan','green','amber','rose','violet'];
  function left(n,one,many){return n+' '+(n===1?one:many)}
  function hud(){
    if(PZ>=0){var g=given(),J=JOIN[PZ];
      if(pzWon)return 'puzzle '+(PZ+1)+' of '+LEVELS.length+' solved'+(J&&J.length?'\n'+J.map(function(k){return 'the '+BNAMES[k].toLowerCase()}).join(' and ')+(J.length>1?' join':' joins')+' the band':'');
      var l2=CUPS.map(function(c){return (c.c==='mix'?'white':CN[c.c])+' ring '+(c.done?'full':Math.round(c.fill*100)+'%')}).join(' · '),
        b=[],w=g.w-WALLS.length,f=g.f-FANS.length,d=g.d-DRAINS.length;if(w>0)b.push(left(w,'wall','walls'));if(f>0)b.push(left(f,'fan','fans'));if(d>0)b.push(left(d,'drain','drains'));
      return 'puzzle '+(PZ+1)+' of '+LEVELS.length+' · fill each ring with smoke of its colour'+(LEVELS[PZ].tip?'\n'+LEVELS[PZ].tip:'')+'\n'+l2+'\n'+(b.length?'you can still build '+b.join(', '):'nothing left to build')}
    var bt=(WALLS.length?WALLS.length+' wall'+(WALLS.length>1?'s':''):'')+(FANS.length?(WALLS.length?' · ':'')+FANS.length+' fan'+(FANS.length>1?'s':''):'')+(DRAINS.length?(WALLS.length||FANS.length?' · ':'')+DRAINS.length+' drain'+(DRAINS.length>1?'s':''):'');
    if(PHOTO.has)return 'your photo is the ink: smear it and it remembers itself'+(bt?'\nbuilt: '+bt:'');
    return 'real smoke, worked out as it moves: push it with a finger, tap for a drop\nbuild walls, fans and drains with the tools below, or play the puzzles'+(bt?'\nbuilt: '+bt:best?'\npuzzles solved: '+best+' of '+LEVELS.length:'')}
  /* the hint: a tap (a drop of ink bursts), then one finger drawn across. The tap comes first on purpose: this is the world the page
     opens on, and a tap is the one touch an iPhone will start the sound on */
  function ghost(t){if(PZ>=0||TOOL!=='ink')return [null];var u=(t*.21)%1,k=Math.floor(t*.21)%2;
    if(u>.05&&u<.1)return [{x:STG.x0+STG.w*(k?.7:.3),y:STG.cy+STG.h*(k?.16:-.14)}];
    if(u>.2&&u<.84){var e=smooth((u-.2)/.64);return [{x:STG.x0+STG.w*(k?.82-.64*e:.18+.64*e),y:STG.cy+STG.h*(.22*Math.sin(e*5.2+k*2)+(k?-.12:.12))}]}
    return [null]}
  return {enter:enter,leave:leave,resize:function(){resize();pzRelayout();obsDirty=true},down:down,up:up,gesture:gesture,tick:tick,draw:draw,hud:hud,ghost:ghost,gl:function(){gen=-1},
    dbg:function(){return {ok:!!(P&&dye),simT:simT,simple:simple,sw:sw,sh:sh,dw:dw,dh:dh,lin:GLX.hfLin,tool:TOOL,pz:PZ,won:!!pzWon,walls:WALLS.length,fans:FANS.length,drains:DRAINS.length,wn:WN,best:best,
      cups:CUPS.map(function(c){return {c:c.c,fill:c.fill,match:c.match,done:c.done,x:WX(c.x),y:WY(c.y)}}),fix:{walls:FIX.walls.length,fans:FIX.fans.length,drains:FIX.drains.length},rb:rbOk}},
    /* for the tests: how much ink there is around a point (pixels), from the last copy read back; and a puzzle by number */
    sample:function(x,y,r){want=1;return sample(x,y,r,null,false)},
    mid:function(){want=1;if(!rbOk)return null;var w=0,y=0,i,j;for(j=0;j<rbH;j++)for(i=0;i<rbW;i++){var o=(j*rbW+i)*4,d=Math.max(rbBuf[o],rbBuf[o+1],rbBuf[o+2])/255;w+=d;y+=d*(1-(j+.5)/rbH)}return w?y/w:null},level:function(i){if(i<0)pzOff();else pzLoad(i);toolsSync()},tool:function(k){TOOL=k;toolsSync()},
    /* for the tests: the puzzles themselves, and pieces put in by hand (in fractions of the stage) */
    levels:LEVELS,nowin:function(b){NOWIN=!!b},trace:function(on){var t=TRACE;TRACE=on?[]:null;return t},
    put:function(k,a){if(k==='wall')WALLS.push([sx(a[0]),sy(a[1]),sx(a[2]),sy(a[3]),0]);else if(k==='fan'){var m=Math.hypot(a[2],a[3])||1;FANS.push({x:sx(a[0]),y:sy(a[1]),dx:a[2]/m,dy:a[3]/m,c:PZ>=0?-1:a[4]||0,ph:0})}else if(k==='drain')DRAINS.push({x:sx(a[0]),y:sy(a[1]),ph:0});obsDirty=true},
    win:function(){if(!CUPS.length||pzWon)return;CUPS.forEach(function(c){c.fill=1;c.done=true});pzWin()}}
})();
