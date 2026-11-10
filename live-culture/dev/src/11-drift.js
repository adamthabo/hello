/* ---------- DRIFT: ink in water. A real fluid on the graphics chip (Stam's stable fluids: carry the flow along itself, find the
   pressure that keeps it from piling up, take that pressure's push out). A finger drags the water and leaves ink; a tap is a
   drop; a finger that stays is a spring. The screen is nine notes high, and the ink is the colour of the note it was drawn on.
   The bass rolls the water from below, the balafon and kora drip their notes into it as a score.
   Given a photo, the photo is the ink: smear it, and it slowly remembers itself. ---------- */
var DRIFT=(function(){
  var P=null,gen=-1,vel=null,dye=null,prs=null,div=null,curl=null,sw=0,sh=0,dw=0,dh=0,type=0,filt=0,simple=false,ql=-1,szKey='',
    q=[],last={},rows={},photoVer=-1,ink=0,t0=0;
  /* the five notes of the scale as five inks: E cyan, G green, A amber, B rose, D violet */
  var INK=[[.12,.86,1],[.30,1,.62],[1,.62,.20],[1,.14,.50],[.56,.36,1]];
  var VSB='attribute vec2 a_p;varying vec2 vUv;varying vec2 vL;varying vec2 vR;varying vec2 vT;varying vec2 vB;uniform vec2 uTexel;\n'+
    'void main(){vUv=a_p*0.5+0.5;vL=vUv-vec2(uTexel.x,0.0);vR=vUv+vec2(uTexel.x,0.0);vT=vUv+vec2(0.0,uTexel.y);vB=vUv-vec2(0.0,uTexel.y);gl_Position=vec4(a_p,0.0,1.0);}';
  var H='precision highp float;varying vec2 vUv;varying vec2 vL;varying vec2 vR;varying vec2 vT;varying vec2 vB;\n';
  var F={
    adv:H+'uniform sampler2D uVel;uniform sampler2D uSrc;uniform vec2 uVTexel;uniform vec2 uSTexel;uniform float uDt;uniform float uDiss;\n'+
      'vec4 bil(sampler2D s,vec2 uv,vec2 ts){vec2 st=uv/ts-0.5;vec2 i=floor(st);vec2 f=fract(st);vec4 a=texture2D(s,(i+vec2(0.5,0.5))*ts);vec4 b=texture2D(s,(i+vec2(1.5,0.5))*ts);vec4 c=texture2D(s,(i+vec2(0.5,1.5))*ts);vec4 d=texture2D(s,(i+vec2(1.5,1.5))*ts);return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}\n'+
      'void main(){\n#ifdef MANUAL\nvec2 c=vUv-uDt*bil(uVel,vUv,uVTexel).xy*uVTexel;gl_FragColor=uDiss*bil(uSrc,c,uSTexel);\n#else\nvec2 c=vUv-uDt*texture2D(uVel,vUv).xy*uVTexel;gl_FragColor=uDiss*texture2D(uSrc,c);\n#endif\n}',
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
      'vec2 e=vUv-0.5;float vg=1.0-0.55*dot(e,e);gl_FragColor=vec4(uBg+c*vg,1.0);}'
  };
  function dbl(w,h){var a=glTarget(w,h,type,filt),b=glTarget(w,h,type,filt);if(!a||!b){glFree(a);glFree(b);return null}return {r:a,w:b,swap:function(){var t=this.r;this.r=this.w;this.w=t}}}
  function freeAll(){[vel,dye,prs].forEach(function(d){if(d){glFree(d.r);glFree(d.w)}});glFree(div);glFree(curl);vel=dye=prs=div=curl=null}
  function glSetup(){
    if(!GLX.ok)return;var gl=GLX.gl;gen=GLX.gen;vel=dye=prs=div=curl=null;szKey='';P={};
    simple=!(GLX.hf&&GLX.hfRT);type=simple?gl.UNSIGNED_BYTE:GLX.hf.HALF_FLOAT_OES;filt=(simple||GLX.hfLin)?gl.LINEAR:gl.NEAREST;
    var man=(!simple&&!GLX.hfLin)?'#define MANUAL\n':'';
    for(var k in F){P[k]=glProg(VSB,k==='adv'?F[k].replace(H,H+man):F[k]);if(!P[k]){P=null;return}}}
  function size(){
    if(!P)return;var ar=VW/VH,S=(COARSE?[128,96,64]:[160,128,96])[QL],D=(COARSE?[512,384,256]:[720,512,384])[QL],
      w=Math.round(ar>=1?S*ar:S),h=Math.round(ar>=1?S:S/ar),W=Math.round(ar>=1?D*ar:D),Hh=Math.round(ar>=1?D:D/ar),key=w+'x'+h+'x'+W+'x'+Hh;
    if(key===szKey&&dye)return;freeAll();szKey=key;ql=QL;sw=w;sh=h;dw=W;dh=Hh;
    dye=dbl(dw,dh);if(!simple){vel=dbl(sw,sh);prs=dbl(sw,sh);div=glTarget(sw,sh,type,GLX.gl.NEAREST);curl=glTarget(sw,sh,type,GLX.gl.NEAREST);if(!vel||!prs||!div||!curl){freeAll();P=null;return}}
    if(!dye){P=null;return}photoVer=-1}
  function run(prog,target,texel){var u=glUse(prog,target);if(u.uTexel)GLX.gl.uniform2f(u.uTexel,texel[0],texel[1]);return u}
  /* add to a field around a point: the water's velocity, or ink */
  function splat(d,x,y,r,g,b,rad,sat){var gl=GLX.gl,u=run(P.spl,d.w,[1/d.w.w,1/d.w.h]);glBind(0,d.r.tex,u.uT);gl.uniform1f(u.uAR,VW/VH);gl.uniform3f(u.uCol,r,g,b);gl.uniform2f(u.uPt,x/VW,1-y/VH);gl.uniform1f(u.uRad,rad);gl.uniform1f(u.uSat,sat||0);glQuad(P.spl);d.swap()}
  /* queue a push and some ink at a place on the screen (pixels); the push is in pixels per second */
  function push(x,y,vx,vy,c,amt,rad){if(q.length<28)q.push([x,y,vx,vy,c,amt,rad||.0011])}
  function rowOf(y){return clamp(Math.floor((1-clamp((y-STG.y0)/Math.max(1,STG.h),0,.999))*9),0,8)}
  function pan(x){return clamp(x/VW*1.6-.8,-1,1)}
  var BINK=[hexRgb(BCOL[6]),hexRgb(BCOL[7]),[.9,.95,1]];
  function inkOf(y){return INK[rowOf(y)%5]}
  function note(p,vel){if(!p.ghost)tone('glass',pent(5+rowOf(p.y),40),vel,pan(p.x))}
  function enter(){if(GLX.ok&&gen!==GLX.gen)glSetup();size();t0=FT;lastT=0}
  function leave(){last={};rows={};q.length=0}
  function down(p){last[p.id]={x:p.x,y:p.y};rows[p.id]=rowOf(p.y);note(p,.5)}
  function up(p){
    var l=last[p.id];delete last[p.id];delete rows[p.id];if(!l)return;
    /* a tap is a drop: the ink bursts outward */
    if(FT-p.t0<260&&p.moved<14){var c=inkOf(p.y);for(var k=0;k<8;k++){var a=k/8*TAU+.3;push(p.x+Math.cos(a)*10,p.y+Math.sin(a)*10,Math.cos(a)*520,Math.sin(a)*520,c,.55,.0007)}}}
  function tick(dt,t){
    var i,ps=PS,r=Math.random;
    for(i=0;i<ps.length;i++){var p=ps[i];if(!p.down)continue;var l=last[p.id];if(!l){l=last[p.id]={x:p.x,y:p.y};rows[p.id]=rowOf(p.y)}
      var dx=p.x-l.x,dy=p.y-l.y,len=Math.hypot(dx,dy);
      if(len>.5){var k=1/Math.max(dt,.008),vx=dx*k,vy=dy*k,m=Math.hypot(vx,vy),cap=VW*5;if(m>cap){vx*=cap/m;vy*=cap/m}
        push(p.x,p.y,vx,vy,inkOf(p.y),clamp(len/52,.04,.7));l.x=p.x;l.y=p.y;
        var rw=rowOf(p.y);if(rw!==rows[p.id]){rows[p.id]=rw;note(p,.3+.5*Math.min(1,p.spd/900))}}
      else if(t-p.t0>300){push(p.x+(r()-.5)*6,p.y+(r()-.5)*6,(r()-.5)*90,-60-r()*60,inkOf(p.y),.07,.0016)}}
    /* the band in the water. With a photo in it, the band only moves the water (and more gently): the photo stays the only ink */
    var pk=PHOTO.has?0:1,pv=PHOTO.has?.4:1;
    for(i=0;i<BD.flow.length;i++){var h=BD.flow[i],s=h.s,x=STG.x0+STG.w*(.06+.88*BD.ph);
      if(h.i===5)push(VW*(.25+.5*r()),STG.y1-6,(r()-.5)*140*pv,-250*s*pv,[.03,.09,.34],.15*s*pk,.0026);
      else if(h.i===6)push(x,STG.y0+STG.h*.6,(r()-.5)*50,80*s*pv,BINK[0],.55*s*pk,.0008);
      else if(h.i===7)push(x,STG.y0+STG.h*.36,(r()-.5)*50,70*s*pv,BINK[1],.55*s*pk,.0008);
      else if(h.i===8)push(x,STG.y0+STG.h*.16,(r()-.5)*90,90*s*pv,BINK[2],.4*s*pk,.0006);
      else if(h.i===0&&s>.6)push(STG.cx,STG.cy,(r()-.5)*200,(r()-.5)*200,[0,0,0],0,.02);
      else if(h.i===1)push(VW*r(),STG.y0+STG.h*r(),(r()-.5)*70,(r()-.5)*70,[0,0,0],0,.0009)}
    ink+=((q.length?1:0)-ink)*Math.min(1,dt*2)}
  function step(dtr){
    /* the water is moved in small steps so it stays steady; what fades, fades by the real clock */
    var gl=GLX.gl,u,i,vt=[1/sw,1/sh],dt2=[1/dw,1/dh],dt=Math.min(dtr,1/45);
    /* the photo, when it arrives or changes, floods the water */
    var ph=PHOTO.has?photoTex():null,rc=null;
    if(ph){var pr=photoRect();rc=[pr.x/VW,1-(pr.y+pr.h)/VH,pr.w/VW,pr.h/VH]}
    if(ph&&photoVer!==PHOTO.ver){photoVer=PHOTO.ver;u=run(P.heal,dye.w,dt2);glBind(0,dye.r.tex,u.uT);glBind(1,ph.tex,u.uPh);gl.uniform4f(u.uRect,rc[0],rc[1],rc[2],rc[3]);gl.uniform1f(u.uK,1);glQuad(P.heal);dye.swap()}
    if(!ph&&photoVer!==-1&&!PHOTO.has)photoVer=-1;
    for(i=0;i<q.length;i++){var s=q[i],c=s[4],a=s[5];
      if(!simple)splat(vel,s[0],s[1],s[2]/VW*sw,-s[3]/VH*sh,0,s[6]);
      if(a>0)splat(dye,s[0],s[1],c[0]*a,c[1]*a,c[2]*a,s[6]*(simple?1.6:1),1)}
    q.length=0;
    if(!simple){
      u=run(P.curl,curl,vt);glBind(0,vel.r.tex,u.uVel);glQuad(P.curl);
      u=run(P.vort,vel.w,vt);glBind(0,vel.r.tex,u.uVel);glBind(1,curl.tex,u.uCurl);gl.uniform1f(u.uK,20);gl.uniform1f(u.uDt,dt);glQuad(P.vort);vel.swap();
      u=run(P.div,div,vt);glBind(0,vel.r.tex,u.uVel);glQuad(P.div);
      u=run(P.mul,prs.w,vt);glBind(0,prs.r.tex,u.uT);gl.uniform1f(u.uK,.8);glQuad(P.mul);prs.swap();
      var it=[18,14,10][QL];for(i=0;i<it;i++){u=run(P.prs,prs.w,vt);glBind(0,prs.r.tex,u.uP);glBind(1,div.tex,u.uDiv);glQuad(P.prs);prs.swap()}
      u=run(P.grad,vel.w,vt);glBind(0,prs.r.tex,u.uP);glBind(1,vel.r.tex,u.uVel);glQuad(P.grad);vel.swap();
      u=run(P.adv,vel.w,vt);glBind(0,vel.r.tex,u.uVel);glBind(1,vel.r.tex,u.uSrc);gl.uniform2f(u.uVTexel,vt[0],vt[1]);gl.uniform2f(u.uSTexel,vt[0],vt[1]);gl.uniform1f(u.uDt,dt);gl.uniform1f(u.uDiss,Math.exp(-.22*dtr));glQuad(P.adv);vel.swap();
      u=run(P.adv,dye.w,dt2);glBind(0,vel.r.tex,u.uVel);glBind(1,dye.r.tex,u.uSrc);gl.uniform2f(u.uVTexel,vt[0],vt[1]);gl.uniform2f(u.uSTexel,dt2[0],dt2[1]);gl.uniform1f(u.uDt,dt);gl.uniform1f(u.uDiss,ph?1:Math.exp(-.36*dtr));glQuad(P.adv);dye.swap()}
    else{u=run(P.mul,dye.w,dt2);glBind(0,dye.r.tex,u.uT);gl.uniform1f(u.uK,ph?1:Math.exp(-dtr*.5));glQuad(P.mul);dye.swap()}
    if(ph){u=run(P.heal,dye.w,dt2);glBind(0,dye.r.tex,u.uT);glBind(1,ph.tex,u.uPh);gl.uniform4f(u.uRect,rc[0],rc[1],rc[2],rc[3]);gl.uniform1f(u.uK,1-Math.exp(-dtr/4.5));glQuad(P.heal);dye.swap()}}
  var lastT=0;
  function draw(t){
    if(!GLX.ok||GLX.lost)return;if(gen!==GLX.gen)glSetup();if(P&&(ql!==QL||!dye))size();
    var gl=GLX.gl;glAttrOff();
    if(!P||!dye){glClear(ABYSS[0],ABYSS[1],ABYSS[2]);return}
    gl.disable(gl.BLEND);var dt=lastT?Math.min(.1,Math.max(.001,(t-lastT)/1000)):.016;lastT=t;
    step(dt);
    var u=run(P.show,null,[1/dw,1/dh]);glBind(0,dye.r.tex,u.uT);gl.uniform3f(u.uBg,ABYSS[0],ABYSS[1],ABYSS[2]);gl.uniform1f(u.uZ,.55);glQuad(P.show)}
  function resize(){if(GLX.ok&&P)size()}
  function hud(){return (simple?'ink':'water '+sw+' × '+sh+' cells · ink '+dw+' × '+dh)+(PHOTO.has?'\nyour photo is the ink: smear it and it remembers itself':'')}
  /* the hint: a tap (a drop of ink bursts), then one finger drawn across. The tap comes first on purpose: this is the world the page
     opens on, and a tap is the one touch an iPhone will start the sound on */
  function ghost(t){var u=(t*.21)%1,k=Math.floor(t*.21)%2;
    if(u>.05&&u<.1)return [{x:STG.x0+STG.w*(k?.7:.3),y:STG.cy+STG.h*(k?.16:-.14)}];
    if(u>.2&&u<.84){var e=smooth((u-.2)/.64);return [{x:STG.x0+STG.w*(k?.82-.64*e:.18+.64*e),y:STG.cy+STG.h*(.22*Math.sin(e*5.2+k*2)+(k?-.12:.12))}]}
    return [null]}
  return {enter:enter,leave:leave,resize:resize,down:down,up:up,tick:tick,draw:draw,hud:hud,ghost:ghost,gl:function(){gen=-1},
    dbg:function(){return {ok:!!(P&&dye),simple:simple,sw:sw,sh:sh,dw:dw,dh:dh,lin:GLX.hfLin}}}
})();
