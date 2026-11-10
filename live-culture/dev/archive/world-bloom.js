/* ---------- BLOOM: a living culture. Thousands of organisms drift in the dark; they flash where they are disturbed and fade when
   left alone, as bioluminescent plankton do. A finger moving through them stirs them into eddies and lights them; a tap sends a
   ring of light out; a finger that stays gathers a bloom around itself and lets it go when it lifts. The band's accents send
   their own light through. What is lit leaves its light behind for a moment, like a long exposure.
   Given a photo, the photo is only there where the culture is awake. ---------- */
var BLOOM=(function(){
  var N=0,X,Y,VX,VY,L,PH,SP,SZ,vb=null,vbuf=null,prog=null,pfill=null,pshow=null,gen=-1,rings=[],holds={},pulse=0,lit=0,ql=-1,
    tr=null,trKey='',trOn=false,lastT=0,NZ=new Float32Array(1024),nzi=0,kk,DIP=[];
  for(kk=0;kk<1024;kk++)NZ[kk]=Math.random()*2-1;
  var PAL=[[.20,.80,1],[.24,.94,1],[.30,1,.85],[.49,1,.70],[.71,.42,1],[1,.70,.28]],PW=[.34,.36,.14,.08,.05,.03];
  /* one organism, drawn two ways: sharp, as it is now; and soft, into the light it leaves behind */
  var VS='attribute vec2 a_p;attribute vec2 a_s;attribute vec3 a_c;uniform vec2 uRes;uniform float uDpr;uniform float uTrail;varying vec3 v_c;varying float v_l;varying float v_t;\n'+
    'void main(){vec2 c=a_p/uRes*2.0-1.0;gl_Position=vec4(c.x,-c.y,0.0,1.0);float l=a_s.y;v_t=uTrail>0.0?1.0:0.0;\n'+
    'if(uTrail>0.0){float t=max(l-0.1,0.0);v_l=t*sqrt(t)*uTrail;gl_PointSize=a_s.x*uDpr*(1.5+1.7*sqrt(max(l,0.0)));}\n'+
    'else{v_l=l;gl_PointSize=a_s.x*uDpr*(0.8+1.15*sqrt(max(l,0.0)));}v_c=a_c;}';
  var FS='precision mediump float;varying vec3 v_c;varying float v_l;varying float v_t;\n'+
    'void main(){vec2 d=gl_PointCoord-0.5;float r2=dot(d,d)*4.0;if(r2>1.0)discard;\n'+
    'if(v_t>0.5){float a=exp(-r2*3.0)*(1.0-r2)*v_l;gl_FragColor=vec4(v_c*a,a);}\n'+
    'else{float core=exp(-r2*10.0),halo=exp(-r2*2.8)*0.32*(1.0-r2);float a=(core+halo)*v_l;vec3 col=mix(v_c,vec3(1.0),core*clamp(v_l-0.6,0.0,1.0)*0.7);gl_FragColor=vec4(col*a,1.0);}}';
  var VQ='attribute vec2 a_p;varying vec2 vUv;void main(){vUv=a_p*0.5+0.5;gl_Position=vec4(a_p,0.0,1.0);}';
  var FFILL='precision mediump float;uniform vec4 uC;void main(){gl_FragColor=uC;}';
  /* the light left behind, laid over the dark; with a photo, that light is what shows the photo */
  var FSHOW='precision mediump float;varying vec2 vUv;uniform sampler2D uT;uniform sampler2D uPh;uniform vec4 uRect;uniform float uPhoto;uniform vec3 uBg;\n'+
    'void main(){vec4 t=texture2D(uT,vUv);vec3 col=uBg+(1.0-exp(-t.rgb*1.25));\n'+
    'if(uPhoto>0.5){vec2 q=(vUv-uRect.xy)/uRect.zw;if(q.x>0.0&&q.x<1.0&&q.y>0.0&&q.y<1.0){float m=1.0-exp(-t.a*2.4);vec3 ph=texture2D(uPh,vec2(q.x,1.0-q.y)).rgb;col=uBg+ph*m*1.12+(1.0-exp(-t.rgb*0.4))*0.25;}}\n'+
    'gl_FragColor=vec4(col,1.0);}';
  function count(){return [COARSE?10000:16000,COARSE?6500:10000,3500][QL]}
  function seed(){
    var o={n:N,X:X,Y:Y,L:L,PH:PH,SP:SP,SZ:SZ},i;
    N=count();ql=QL;X=new Float32Array(N);Y=new Float32Array(N);VX=new Float32Array(N);VY=new Float32Array(N);L=new Float32Array(N);PH=new Float32Array(N);SP=new Uint8Array(N);SZ=new Float32Array(N);
    vbuf=new Float32Array(N*7);
    for(i=0;i<N;i++){
      /* a culture already alive is carried over, every organism where it was; only the newcomers are scattered */
      if(i<o.n&&o.X){X[i]=o.X[i];Y[i]=o.Y[i];L[i]=o.L[i];PH[i]=o.PH[i];SP[i]=o.SP[i];SZ[i]=o.SZ[i];continue}
      X[i]=Math.random()*VW;Y[i]=Math.random()*VH;PH[i]=Math.random()*TAU;L[i]=Math.random()*.08;
      var r=Math.random(),k=0;while(k<PW.length-1&&r>PW[k]){r-=PW[k];k++}SP[i]=k;var q=Math.random();SZ[i]=4.6+q*q*6.4}
    if(vb&&GLX.ok){var gl=GLX.gl;gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,vbuf.byteLength,gl.DYNAMIC_DRAW)}}
  function glSetup(){if(!GLX.ok)return;var gl=GLX.gl;prog=glProg(VS,FS);pfill=glProg(VQ,FFILL);pshow=glProg(VQ,FSHOW);vb=gl.createBuffer();gen=GLX.gen;tr=null;trKey='';trOn=false;
    if(vbuf){gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,vbuf.byteLength,gl.DYNAMIC_DRAW)}}
  /* where the light is kept: a picture of fractions, at half size where the chip can smooth it back up */
  function target(){
    if(!GLX.hf||!GLX.hfRT||!pfill||!pshow){trOn=false;return}
    var sc=GLX.hfLin?.5:1,w=Math.max(2,Math.round(GLX.w*sc)),h=Math.max(2,Math.round(GLX.h*sc)),key=w+'x'+h;
    if(tr&&trKey===key)return;glFree(tr);tr=glTarget(w,h,GLX.hf.HALF_FLOAT_OES,GLX.hfLin?GLX.gl.LINEAR:GLX.gl.NEAREST);trKey=tr?key:'';trOn=!!tr}
  function ring(x,y,s,v,max,d,w){if(rings.length>=10)rings.shift();rings.push({x:x,y:y,r:0,s:s,v:v,max:max,d:d||1,w:w||24})}
  /* a push left in the water where a finger has been: the water there keeps going the finger's way for a moment */
  function dipole(x,y,ax,ay,R){if(DIP.length>=48)DIP.shift();DIP.push({x:x,y:y,ax:ax,ay:ay,R2:R*R,iR2:1/(R*R),l:1})}
  function sprinkle(n){for(var k=0;k<n;k++){var i=(Math.random()*N)|0;if(L[i]<.8)L[i]=.55+Math.random()*.4}}
  function yNote(y,lo,span){return pent(lo+Math.round((1-clamp((y-STG.y0)/Math.max(1,STG.h),0,1))*span),40)}
  function pan(x){return clamp(x/VW*1.6-.8,-1,1)}
  function enter(){if(!N||ql!==QL)seed();if(GLX.ok&&gen!==GLX.gen)glSetup();lastT=0}
  function leave(){holds={};rings.length=0;DIP.length=0}
  function resize(ow,oh){if(!N)return;var sx=VW/Math.max(1,ow),sy=VH/Math.max(1,oh);for(var i=0;i<N;i++){X[i]*=sx;Y[i]*=sy}}
  function down(p){holds[p.id]={x:p.x,y:p.y,t0:FT,on:false,amt:0}}
  function up(p){
    var h=holds[p.id];delete holds[p.id];
    /* a bloom let go: its organisms are thrown outward, alight */
    if(h&&h.on){var k=clamp(h.amt/1.6,0,1);ring(p.x,p.y,.7+.5*k,520,Math.max(VW,VH),.8,34);
      for(var i=0;i<N;i++){var dx=X[i]-p.x,dy=Y[i]-p.y,d2=dx*dx+dy*dy;if(d2<52900){var d=Math.sqrt(d2)+1,f=(1-d/230)*(160+260*k);VX[i]+=dx/d*f;VY[i]+=dy/d*f;if(L[i]<.9)L[i]=.9}}
      if(!p.ghost){tone('glass',yNote(p.y,5,9),.5+.3*k,pan(p.x));tone('glass',yNote(p.y,5,9)+12,.25,-pan(p.x))}
      return}
    if(FT-p.t0<280&&p.moved<14){ring(p.x,p.y,p.ghost?.75:1,430,Math.max(VW,VH)*.8,1.1,26);
      if(!p.ghost){tone('glass',yNote(p.y,5,9),.55,pan(p.x));hit('thump',.3,pan(p.x)*.4)}}}
  /* a finger moving through the culture rings small bright notes: one each time it comes into a new patch of the water, sounded on
     the band's next beat. Higher up the screen is higher in pitch, and going sideways steps through a little figure of four notes.
     A finger that is not going anywhere rings nothing */
  function seq(s,when){
    var n=0;for(var j=0;j<PS.length&&n<3;j++){var p=PS[j];if(p.ghost||!p.down||p.spd<70)continue;var hd=holds[p.id];if(hd&&hd.on)continue;
      var col=Math.floor(p.x/46),row=Math.round((1-clamp((p.y-STG.y0)/Math.max(1,STG.h),0,1))*9),cell=col*64+row;if(cell===p.cell)continue;p.cell=cell;
      tone('kal',pent(10+row+[0,2,1,3][((col%4)+4)%4],40),.2+.3*Math.min(1,p.spd/1300),pan(p.x),when);n++}}
  function tick(dt,t){
    if(!N||ql!==QL)seed();
    var i,j,q,tt=t*.00011,ks=clamp(800/Math.min(VW,VH),1,2.1),dec=Math.exp(-dt/.78),ps=PS,np=ps.length,img=PHOTO.has?PHOTO:null,now=t,RB=clamp(Math.min(VW,VH)*.2,66,112);
    pulse*=Math.exp(-dt*2.2);
    /* the band's accents */
    for(i=0;i<BD.hits.length;i++){var h=BD.hits[i],s=h.s,r=Math.random;
      if(h.i===0)ring(VW*(.2+.6*r()),STG.y1-r()*STG.h*.25,.55*s,300,Math.max(VW,VH)*.9,.9,30);
      else if(h.i===5)pulse=Math.max(pulse,s*.6);
      else if(h.i===2||h.i===3)ring(h.i===2?VW*.22:VW*.78,STG.cy+(r()-.5)*STG.h*.5,.5*s,260,260,1.6);
      else if(h.i===1||h.i===4)sprinkle(Math.round(N*.0045*s));
      else ring(VW*r(),STG.y0+STG.h*(.15+.7*r()),.5*s,200,150,2.2,18)}
    for(i=rings.length-1;i>=0;i--){q=rings[i];q.r+=q.v*dt;q.s*=Math.exp(-dt*q.d);q.a=(q.r-q.w)*(q.r-q.w)*(q.r>q.w?1:0);q.b=(q.r+q.w)*(q.r+q.w);if(q.r>q.max||q.s<.03)rings.splice(i,1)}
    /* fingers: a moving one stirs and lights; one that stays gathers a bloom */
    for(j=0;j<np;j++){var p=ps[j],hd=holds[p.id];p.R=p.mouse&&!p.down?RB*.78:RB;p.R2=p.R*p.R;p.iR2=1/p.R2;p.act=clamp(p.spd/380,.16,1);p.hold=0;
      var pm=p.spd>900?900/p.spd:1;p.ax=p.vx*pm*.35;p.ay=p.vy*pm*.35;if(p.bx===undefined){p.bx=p.x;p.by=p.y}
      if(Math.abs(p.x-p.bx)+Math.abs(p.y-p.by)>p.R*.55){dipole(p.x,p.y,p.vx*pm*.22,p.vy*pm*.22,p.R);p.bx=p.x;p.by=p.y}
      if(hd){if(Math.abs(p.x-hd.x)+Math.abs(p.y-hd.y)>16){hd.on=false;hd.x=p.x;hd.y=p.y;hd.t0=now;hd.amt=0}
        else if(!hd.on&&now-hd.t0>320){hd.on=true;if(!p.ghost)tone('bowl',yNote(p.y,5,4),.5,pan(p.x))}
        if(hd.on){hd.amt=Math.min(1.6,hd.amt+dt);p.hold=hd.amt}}}
    for(i=DIP.length-1;i>=0;i--){DIP[i].l*=Math.exp(-dt/.6);if(DIP[i].l<.04)DIP.splice(i,1)}
    var nd=DIP.length,vdec=Math.exp(-dt*1.2),nr=rings.length,base0=img?.014:.04,amp0=img?.01:.03,brh=img?.02:.05,pl=pulse*.12,litN=0,iw=0,ih=0,px=null,RX=0,RY=0,RW=1,RH=1,o=0,jit=dt*7;
    if(img){var rc=photoRect();RX=rc.x;RY=rc.y;RW=rc.w;RH=rc.h;iw=img.pw;ih=img.ph;px=img.px}
    nzi=(nzi+17)&1023;
    for(i=0;i<N;i++){
      /* the current: the slopes of a slowly changing surface, turned a quarter turn, so the water goes round its hills and hollows and never piles up */
      var x=X[i],y=Y[i],xs=x*ks,ys=y*ks,a1=xs*.0063+tt*21,a2=ys*.0049-tt*16+1.3,a3=xs*.0041-ys*.0057+tt*27,a4=xs*.0029+ys*.0037-tt*19,s1=Math.sin(a1),s2=Math.sin(a2),c3=Math.cos(a3),c4=Math.cos(a4),sp=1+SP[i]*.22,
        ux=(8.2*s1*Math.cos(a2)-7.4*c3+5.2*c4)*sp,uy=(-10.5*Math.cos(a1)*s2-5.3*c3-4.1*c4)*sp,vx=VX[i]*vdec,vy=VY[i]*vdec,l=L[i]*dec,dx,dy,d2,d,f,q4;
      for(j=0;j<np;j++){p=ps[j];dx=x-p.x;dy=y-p.y;d2=dx*dx+dy*dy;
        if(p.hold){if(d2<52900){d=Math.sqrt(d2)+1;f=1-d/230;vx+=(-dx/d*170-dy/d*120)*f*dt*6;vy+=(-dy/d*170+dx/d*120)*f*dt*6;var hl=f*(.3+.45*p.hold);if(hl>l)l=hl}continue}
        if(d2<p.R2){f=1-d2*p.iR2;
          /* light at once; and a wake, as a body moving through water makes: carried along in front and behind, streaming back past
             the sides. The organisms have no weight of their own; they go exactly where this water goes, and this water (worked out as
             the turning of a single surface) can neither gather them nor leave a hole in them */
          var g2=f*Math.sqrt(f)*p.act*1.25;if(g2>l)l=g2;q4=4*f*p.iR2*(p.ax*dy-p.ay*dx);ux+=p.ax*f*f-q4*dy;uy+=p.ay*f*f+q4*dx}}
      for(j=0;j<nd;j++){q=DIP[j];dx=x-q.x;dy=y-q.y;d2=dx*dx+dy*dy;if(d2<q.R2){f=1-d2*q.iR2;q4=4*f*q.iR2*(q.ax*dy-q.ay*dx)*q.l;f=f*f*q.l;ux+=q.ax*f-q4*dy;uy+=q.ay*f+q4*dx}}
      for(j=0;j<nr;j++){q=rings[j];dx=x-q.x;dy=y-q.y;d2=dx*dx+dy*dy;if(d2<q.b&&d2>q.a){d=Math.abs(Math.sqrt(d2)-q.r);f=q.s*(1-d/q.w);if(f>l)l=f}}
      /* never quite dark: each one twinkles, and slow patches of faint light pass through the whole culture */
      var br=.5+.5*s1*s2,fl=base0+amp0*Math.sin(PH[i]+tt*(11+SP[i]*3))+pl+br*br*brh;if(l<fl)l=fl;else if(l>1.6)l=1.6;
      if(l>.3)litN++;
      x+=(ux+vx)*dt+NZ[(i+nzi)&1023]*jit;y+=(uy+vy)*dt+NZ[(i+nzi+389)&1023]*jit;if(x<-12)x+=VW+24;else if(x>VW+12)x-=VW+24;if(y<-12)y+=VH+24;else if(y>VH+12)y-=VH+24;
      X[i]=x;Y[i]=y;VX[i]=vx;VY[i]=vy;L[i]=l;
      vbuf[o]=x;vbuf[o+1]=y;vbuf[o+2]=SZ[i];vbuf[o+3]=l;
      if(px){var u=(x-RX)/RW,v=(y-RY)/RH;
        if(u>=0&&u<1&&v>=0&&v<1){var qo=(((v*ih)|0)*iw+((u*iw)|0))*4;vbuf[o+4]=.05+px[qo]*.00373;vbuf[o+5]=.05+px[qo+1]*.00373;vbuf[o+6]=.05+px[qo+2]*.00373}
        else{var c0=PAL[SP[i]];vbuf[o+4]=c0[0]*.2;vbuf[o+5]=c0[1]*.2;vbuf[o+6]=c0[2]*.2}}
      else{var c=PAL[SP[i]];vbuf[o+4]=c[0];vbuf[o+5]=c[1];vbuf[o+6]=c[2]}
      o+=7}
    /* a few of the darkest are moved somewhere else each moment, so a hole left in the culture slowly fills */
    for(j=Math.max(1,Math.round(N*dt*.06));j>0;j--){i=(Math.random()*N)|0;if(L[i]<.1){X[i]=Math.random()*VW;Y[i]=Math.random()*VH}}
    lit+=(litN/N-lit)*Math.min(1,dt*4)}
  function points(gl,dpr,trail){
    glAttrOff();gl.useProgram(prog.p);gl.uniform2f(prog.u.uRes,VW,VH);gl.uniform1f(prog.u.uDpr,dpr);gl.uniform1f(prog.u.uTrail,trail);
    gl.bindBuffer(gl.ARRAY_BUFFER,vb);var a=prog.a;gl.enableVertexAttribArray(a.a_p);gl.vertexAttribPointer(a.a_p,2,gl.FLOAT,false,28,0);
    gl.enableVertexAttribArray(a.a_s);gl.vertexAttribPointer(a.a_s,2,gl.FLOAT,false,28,8);
    gl.enableVertexAttribArray(a.a_c);gl.vertexAttribPointer(a.a_c,3,gl.FLOAT,false,28,16);
    gl.drawArrays(gl.POINTS,0,N)}
  function draw(t){
    if(!GLX.ok||GLX.lost){return}if(gen!==GLX.gen)glSetup();if(!prog||!N)return;
    var gl=GLX.gl,dt=lastT?Math.min(.1,Math.max(.001,(t-lastT)/1000)):.016,u;lastT=t;
    gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferSubData(gl.ARRAY_BUFFER,0,vbuf);
    target();
    if(trOn){
      var fade=reduce?Math.exp(-dt/.12):Math.exp(-dt/.3);
      /* what was there fades; what is lit now is added to it */
      glAttrOff();gl.bindFramebuffer(gl.FRAMEBUFFER,tr.fbo);gl.viewport(0,0,tr.w,tr.h);gl.enable(gl.BLEND);gl.blendFunc(gl.ZERO,gl.SRC_ALPHA);
      gl.useProgram(pfill.p);gl.uniform4f(pfill.u.uC,0,0,0,fade);glQuad(pfill);
      gl.blendFunc(gl.ONE,gl.ONE);points(gl,DPR*tr.w/GLX.w,.95*(1-fade));
      glAttrOff();gl.disable(gl.BLEND);u=glUse(pshow,null);glBind(0,tr.tex,u.uT);gl.uniform3f(u.uBg,ABYSS[0],ABYSS[1],ABYSS[2]);
      var ph=PHOTO.has?photoTex():null;
      if(ph){var rc=photoRect();glBind(1,ph.tex,u.uPh);gl.uniform4f(u.uRect,rc.x/VW,1-(rc.y+rc.h)/VH,rc.w/VW,rc.h/VH);gl.uniform1f(u.uPhoto,1)}else{glBind(1,tr.tex,u.uPh);gl.uniform1f(u.uPhoto,0)}
      glQuad(pshow)}
    else glClear(ABYSS[0],ABYSS[1],ABYSS[2]);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,GLX.w,GLX.h);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);points(gl,DPR,0);gl.disable(gl.BLEND)}
  function hud(){return N.toLocaleString('en-US')+' organisms · '+Math.round(lit*100)+'% lit'+(PHOTO.has?'\nyour photo, where the culture is awake':'')}
  /* the hint: three taps (three rings of light), then one finger wandering in a slow figure of eight. The taps come first on purpose:
     a tap is the one touch an iPhone will start the sound on. (The finger that stays is left to be found: a bloom let go throws its
     organisms outward and leaves a hole that takes a while to fill, which is right under a hand and wrong in a picture left alone) */
  function ghost(t){
    var u=t%13.2,cx=STG.cx,cy=STG.cy,w=STG.w,h=STG.h,k,f;
    if(u<3.3){k=Math.floor(u/1.1);f=u/1.1-k;return f>.3&&f<.48?[{x:cx+w*[-.2,.22,0][k],y:cy+h*[-.1,.05,.14][k]}]:[null]}
    f=u-3.4;return f<0||f>8.6?[null]:[{x:cx+w*.32*Math.sin(f*.7),y:cy+h*.24*Math.sin(f*1.4+.6)}]}
  return {enter:enter,leave:leave,resize:resize,down:down,up:up,seq:seq,tick:tick,draw:draw,hud:hud,ghost:ghost,gl:function(){gen=-1},
    dbg:function(){return {N:N,lit:lit,rings:rings.length,trail:trOn,tr:trKey}}}
})();
