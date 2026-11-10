/* ---------- ORBIT: everything that is working in orbit round the Earth, where it is. Each point is a real satellite (about fifteen
   thousand of them, and with them the wreckage of two collisions and two weapons tests), placed by the orbit CelesTrak publishes
   for it and carried forward by the graphics chip itself: every frame the chip solves each orbit for the moment shown, so
   nothing here is a recording. The Earth below is lit as it is lit at that moment, and the stars behind are the real ones.
   The view is fixed to the Earth, so the ring of geostationary satellites stands still and everything else flows past it.
   Real orbital speed is too slow to see from this far off, so time runs sixty times fast (a minute a second) until "Now" is
   pressed; then it is the present, second for second. One finger turns the Earth, a pinch travels out as far as the
   geostationary ring, two fingers turning wind time. A tap on a satellite brings up what is on record about it (see the
   card, below): every line of it is a real figure, from the catalogue or worked out from the orbit. When one of the bright
   ones crosses between sunlight and the Earth's shadow, it rings. ---------- */
var ORBIT=(function(){
  var P=null,gen=-1,satB=null,satN=0,satV=-1,starB=null,starN=0,EL=null,GRP=null,FLG=null,VB=null,baseT=0,
    g={cx:0,cy:0,R:100,E:[0,0,0],N:[0,0,0],C:[0,0,0]},lat0=22,lon0=clamp(-(new Date().getTimezoneOffset())/4,-180,180),zoom=.86,vlon=0,vlat=0,idle=0,
    off=0,spd=1,want=1,ret=false,drag=0,keyRate=0,simMs=Date.now(),th=0,RE3=[0,0,0],RN3=[0,0,0],RC3=[0,0,0],
    sunV=[0,0,0],moonV=[0,0,0],sunE=[0,0,0],moonI=null,issI=-1,sel=-1,selQ=[0,0,0],selI=null,path=null,pathAt=0,notable=[],lit=[],tmp=[0,0,0],tq=[0,0,0],
    MU=398600.4418,RE=6378.137,J2=1.08262668e-3,WE=0.0043752691;
  /* the kinds, their colours and how big a point each is drawn */
  var KIND=['satellite','Starlink','OneWeb','new constellation','navigation','geostationary','Earth-watching','space station','communications','wreckage','military'],
    KCOL=[[.52,.62,.74],[.36,.60,.80],[.62,.38,.95],[1,.22,.56],[1,.72,.30],[1,.86,.62],[.44,1,.66],[1,1,1],[.24,.94,1],[.80,.20,.15],[.85,.85,.9]],
    KSZ=[2.3,1.9,2.2,2.3,3.2,2.9,2.7,6,2.6,1.6,2.6],
    WRECK=['','Fengyun-1C wreckage (2007 missile test)','Cosmos 2251 wreckage (2009 collision)','Iridium 33 wreckage (2009 collision)','Cosmos 1408 wreckage (2021 missile test)'];
  /* one orbit, solved for the moment asked: the mean place moves on at its own rate, Kepler's equation turns it into a true place on
     the ellipse, and the ellipse is turned into position by its three angles (two of which the Earth's bulge slowly drags round).
     A line's far end is the same body a little earlier, turned by as much as the Earth has turned since, so that tails are drawn
     the way they look from the ground: none at all behind a satellite that hangs over one place */
  var VS='attribute vec4 a_e1;attribute vec4 a_e2;attribute vec4 a_e3;attribute vec4 a_c;uniform float uT;uniform float uTail;uniform float uPt;uniform float uGain;uniform vec3 uE;uniform vec3 uN;uniform vec3 uV;uniform vec2 uC;uniform vec2 uRes;uniform float uR;varying vec4 v_c;\n'+
    'void main(){float k=a_e3.w;float t=uT-k*uTail;float e=a_e1.y;float M=a_e3.x+a_e3.y*t;\n'+
    'float E=M+e*sin(M);E=E-(E-e*sin(E)-M)/(1.0-e*cos(E));E=E-(E-e*sin(E)-M)/(1.0-e*cos(E));E=E-(E-e*sin(E)-M)/(1.0-e*cos(E));\n'+
    'float xp=a_e1.x*(cos(E)-e);float yp=a_e1.x*sqrt(1.0-e*e)*sin(E);float w=a_e2.z+a_e2.w*t;float O=a_e2.x+a_e2.y*t;\n'+
    'float cw=cos(w);float sw=sin(w);float cO=cos(O);float sO=sin(O);float cI=a_e1.z;float sI=a_e1.w;\n'+
    'vec3 p=vec3((cw*cO-sw*sO*cI)*xp+(-sw*cO-cw*sO*cI)*yp,(cw*sO+sw*cO*cI)*xp+(-sw*sO+cw*cO*cI)*yp,sw*sI*xp+cw*sI*yp);\n'+
    'float an=k*uTail*0.0043752691;float ca=cos(an);float sa=sin(an);p=vec3(p.x*ca-p.y*sa,p.x*sa+p.y*ca,p.z);\n'+
    'vec3 q=vec3(dot(p,uE),dot(p,uN),dot(p,uV));float hid=(q.z<0.0&&dot(q.xy,q.xy)<1.0)?0.0:1.0;\n'+
    'vec2 s=uC+vec2(q.x,-q.y)*uR;gl_Position=vec4(s.x/uRes.x*2.0-1.0,1.0-s.y/uRes.y*2.0,0.0,1.0);gl_PointSize=a_c.a*uPt;\n'+
    'v_c=vec4(a_c.rgb*hid*(q.z<0.0?0.5:1.0)*(a_e1.x<1.7?uGain:1.0),1.0-k);}';
  var FS='precision mediump float;varying vec4 v_c;uniform float uLine;\nvoid main(){if(uLine>0.0){gl_FragColor=vec4(v_c.rgb*v_c.a*uLine,1.0);return;}\n'+
    'vec2 d=gl_PointCoord-0.5;float r2=dot(d,d)*4.0;if(r2>1.0)discard;float a=exp(-r2*5.0)+exp(-r2*1.5)*0.22*(1.0-r2);gl_FragColor=vec4(v_c.rgb*a,1.0);}';
  /* the stars, far behind: the half of the sky beyond the Earth, turning as the Earth turns */
  var SVS='attribute vec3 a_p;attribute vec4 a_c;uniform vec3 uE;uniform vec3 uN;uniform vec3 uV;uniform vec2 uC;uniform vec2 uRes;uniform float uR;uniform float uS;uniform float uPt;varying vec3 v_c;\n'+
    'void main(){vec3 q=vec3(dot(a_p,uE),dot(a_p,uN),dot(a_p,uV));vec2 s=uC+vec2(q.x,-q.y)*uS;float show=(q.z<0.0&&length(q.xy)*uS>uR*1.03)?1.0:0.0;\n'+
    'gl_Position=vec4(s.x/uRes.x*2.0-1.0,1.0-s.y/uRes.y*2.0,0.0,1.0);gl_PointSize=a_c.a*uPt;v_c=a_c.rgb*show;}';
  var SFS='precision mediump float;varying vec3 v_c;\nvoid main(){vec2 d=gl_PointCoord-0.5;float r2=dot(d,d)*4.0;if(r2>1.0)discard;float a=exp(-r2*7.0)+exp(-r2*2.2)*0.28*(1.0-r2);gl_FragColor=vec4(v_c*a,1.0);}';
  function bvCol(bv){var t=clamp((bv+.4)/2.4,0,1),s=[[.61,.70,1],[.79,.85,1],[1,.97,.93],[1,.84,.63],[1,.71,.42],[1,.55,.3]],x=t*5,i=Math.min(4,Math.floor(x)),k=x-i;return [lerp(s[i][0],s[i+1][0],k),lerp(s[i][1],s[i+1][1],k),lerp(s[i][2],s[i+1][2],k)]}
  function glSetup(){
    if(!GLX.ok)return;var gl=GLX.gl,i;gen=GLX.gen;satB=null;satV=-1;P={sat:glProg(VS,FS),star:glProg(SVS,SFS)};if(!P.sat||!P.star){P=null;return}
    var b=b64bytes(STARS_B64),dv=new DataView(b.buffer),n=b.length/6,a=new Float32Array(n*7);starN=n;
    for(i=0;i<n;i++){var ra=dv.getUint16(i*6,true)/65536*TAU,dec=dv.getInt16(i*6+2,true)/32767*Math.PI/2,mag=b[i*6+4]/255*8-1.5,c=bvCol(b[i*6+5]/255*2.4-.4),br=clamp(1.1-mag*.15,.22,1.2);
      a[i*7]=Math.cos(dec)*Math.cos(ra);a[i*7+1]=Math.cos(dec)*Math.sin(ra);a[i*7+2]=Math.sin(dec);a[i*7+3]=c[0]*br;a[i*7+4]=c[1]*br;a[i*7+5]=c[2]*br;a[i*7+6]=clamp(4.6-mag*.6,1.3,6)}
    starB=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,starB);gl.bufferData(gl.ARRAY_BUFFER,a,gl.STATIC_DRAW)}
  /* the published orbits, unpacked: for each body the size and shape of its ellipse, its three angles at its own epoch, and how fast each
     of them moves (the Earth's bulge turns the orbit's plane and its long axis; the same sums as a two-line element set is made for) */
  function unpack(){
    var S=LIVE.sats;if(!S)return;satV=LIVE.ver.sats;var n=S.n,dv=new DataView(S.bytes.buffer,S.bytes.byteOffset,S.bytes.byteLength),i,k=0;
    EL=new Float64Array(n*11);GRP=new Uint8Array(n);FLG=new Uint8Array(n);
    for(i=0;i<n;i++){var o=i*20,nd=dv.getFloat32(o,true),ep=S.asOf+dv.getFloat32(o+4,true)*60000,e=dv.getUint16(o+8,true)/65535,inc=dv.getUint16(o+10,true)/65535*Math.PI,
        Om=dv.getUint16(o+12,true)/65536*TAU,w=dv.getUint16(o+14,true)/65536*TAU,M=dv.getUint16(o+16,true)/65536*TAU,gr=S.bytes[o+18],fl=S.bytes[o+19];
      if(!(nd>.2&&nd<17.9)||!(e>=0&&e<.9)||gr>=KIND.length)continue;
      var nr=nd*TAU/86400,a1=Math.pow(MU/(nr*nr),1/3),ci=Math.cos(inc),b=Math.sqrt(1-e*e),d1=.75*J2*RE*RE/(a1*a1)*(3*ci*ci-1)/(b*b*b),a0=a1*(1-d1/3-d1*d1-134/81*d1*d1*d1),
        d0=.75*J2*RE*RE/(a0*a0)*(3*ci*ci-1)/(b*b*b),n0=nr/(1+d0),a=a0/(1-d0),p=a*(1-e*e),kk=J2*(RE/p)*(RE/p),q=k*11;
      EL[q]=a/RE;EL[q+1]=e;EL[q+2]=ci;EL[q+3]=Math.sin(inc);EL[q+4]=Om;EL[q+5]=-1.5*kk*n0*ci*60;EL[q+6]=w;EL[q+7]=.75*kk*n0*(5*ci*ci-1)*60;EL[q+8]=M;EL[q+9]=n0*(1+.75*kk*b*(3*ci*ci-1))*60;EL[q+10]=ep;
      GRP[k]=gr;FLG[k]=fl;if(k!==i){S.names[k]=S.names[i];if(S.ids)S.ids[k]=S.ids[i]}k++}
    satN=k;VB=new Float32Array(satN*32);
    for(i=0;i<satN;i++){var c=KCOL[GRP[i]],br=(GRP[i]===1?.62:GRP[i]===9?.55:1)*(FLG[i]&1?1.25:1),sz=KSZ[GRP[i]]+(FLG[i]&1?1.2:0),v;
      for(v=0;v<2;v++){var o2=(i*2+v)*16,q2=i*11;VB[o2]=EL[q2];VB[o2+1]=EL[q2+1];VB[o2+2]=EL[q2+2];VB[o2+3]=EL[q2+3];VB[o2+5]=EL[q2+5];VB[o2+7]=EL[q2+7];VB[o2+9]=EL[q2+9];VB[o2+10]=GRP[i];VB[o2+11]=v;
        VB[o2+12]=c[0]*br;VB[o2+13]=c[1]*br;VB[o2+14]=c[2]*br;VB[o2+15]=sz}}
    /* the ones that ring: the two space stations, and a dozen of the satellites that watch the Earth (the weather and the land) */
    notable=[];lit=[];var watch=[];
    for(i=0;i<satN;i++){var nm=S.names[i]||'';if(nm==='ISS (ZARYA)'||nm==='CSS (TIANHE)'){notable.push(i);lit.push(0)}else if(GRP[i]===6&&EL[i*11]<1.3)watch.push(i)}
    for(i=0;i<12&&watch.length;i++){notable.push(watch[Math.floor(i*watch.length/12)]);lit.push(0)}
    issI=-1;for(i=0;i<notable.length;i++)if(S.names[notable[i]]==='ISS (ZARYA)')issI=notable[i];
    sel=-1;path=null;cardBuild();rebase(simMs)}
  /* the chip counts time from a moment not far off, so its numbers stay small and exact: every ten hours of shown time the angles are
     brought forward to a new moment */
  function rebase(ms){
    if(!VB)return;baseT=ms;for(var i=0;i<satN;i++){var q=i*11,dm=(ms-EL[q+10])/60000,O=(EL[q+4]+EL[q+5]*dm)%TAU,w=(EL[q+6]+EL[q+7]*dm)%TAU,M=(EL[q+8]+EL[q+9]*dm)%TAU,o=i*32;
      VB[o+4]=O;VB[o+6]=w;VB[o+8]=M;VB[o+20]=O;VB[o+22]=w;VB[o+24]=M}
    if(GLX.ok&&gen===GLX.gen){var gl=GLX.gl;if(!satB)satB=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,satB);gl.bufferData(gl.ARRAY_BUFFER,VB,gl.DYNAMIC_DRAW)}}
  /* the same sum on this side, for one body: where it is (Earth radii, the frame of the stars), for taps, names and bells */
  function place(i,ms,o){var q=i*11,dm=(ms-EL[q+10])/60000,e=EL[q+1],M=EL[q+8]+EL[q+9]*dm,E=AS.kepler(M,e),a=EL[q],xp=a*(Math.cos(E)-e),yp=a*Math.sqrt(1-e*e)*Math.sin(E),
      w=EL[q+6]+EL[q+7]*dm,O=EL[q+4]+EL[q+5]*dm,cw=Math.cos(w),sw=Math.sin(w),cO=Math.cos(O),sO=Math.sin(O),cI=EL[q+2],sI=EL[q+3];
    o[0]=(cw*cO-sw*sO*cI)*xp+(-sw*cO-cw*sO*cI)*yp;o[1]=(cw*sO+sw*cO*cI)*xp+(-sw*sO+cw*cO*cI)*yp;o[2]=sw*sI*xp+cw*sI*yp;return o}
  /* from the frame of the stars to the screen: across, up, and toward the eye, in Earth radii */
  function view(p,o){o[0]=p[0]*RE3[0]+p[1]*RE3[1]+p[2]*RE3[2];o[1]=p[0]*RN3[0]+p[1]*RN3[1]+p[2]*RN3[2];o[2]=p[0]*RC3[0]+p[1]*RC3[1]+p[2]*RC3[2];return o}
  function shown(q){return !(q[2]<0&&q[0]*q[0]+q[1]*q[1]<1)}
  function nameOf(i){var S=LIVE.sats,nm=(S&&S.names[i])||'',gr=GRP[i];if(gr===9)return WRECK[(FLG[i]>>4)&7]||'wreckage';
    if(/^\d+$/.test(nm))return (gr===1?'STARLINK-':gr===2?'ONEWEB-':gr===3?'KUIPER-':'')+nm;return nm||KIND[gr]}
  function geo(){g.R=Math.min(STG.w,STG.h)*.3*zoom;g.cx=g.cxs||STG.cx;if(!g.cy)g.cy=STG.cy}
  /* ---- the card: what is on record about the satellite that was tapped. Nothing here is made up: the catalogue number, the launch
     (date, place, whose), the kind and whether it still works, the radar size and brightness are CelesTrak's catalogue; the radio
     is SatNOGS's list of transmitters; the orbit's shape, where it is now, how fast, and whether it is in sunlight are worked out
     here from the orbit it was last measured on ---- */
  var cardFor=-2,cardHad=false,cardAt=0,cNow=null,cLight=null,MONS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    STAT=['','working','partly working','on standby','spare','on an extended mission','','no longer working'];
  function row(dl,k,v){if(!v)return null;var a=document.createElement('dt'),b=document.createElement('dd');a.textContent=k;b.textContent=v;dl.appendChild(a);dl.appendChild(b);return b}
  function num(x){return Math.round(x).toLocaleString('en-US')}
  function cardBuild(){
    var c=$('card');if(!c)return;if(sel<0||!EL){c.hidden=true;cardFor=-2;cNow=cLight=null;return}
    var S=LIVE.sats,id=S&&S.ids?S.ids[sel]:0,inf=satInfo(id),q=sel*11,a=EL[q]*RE,e=EL[q+1],gr=GRP[sel],el,dl,t;
    cardFor=sel;cardHad=!!inf;c.hidden=false;while(c.firstChild)c.removeChild(c.firstChild);
    el=document.createElement('p');el.className='cn';el.textContent=nameOf(sel);c.appendChild(el);
    t=[gr===9?'wreckage':inf&&inf.type===2?'rocket stage':inf&&inf.type===3?'debris':KIND[gr]];if(inf&&STAT[inf.stat])t.push(STAT[inf.stat]);if(inf&&inf.owner)t.push(inf.owner);
    el=document.createElement('p');el.className='ck';el.textContent=t.join(' · ');c.appendChild(el);
    dl=document.createElement('dl');c.appendChild(dl);
    if(id)row(dl,'catalogue','no. '+id+(inf&&inf.intl?' · '+inf.intl:''));
    if(inf&&inf.launch)row(dl,'launched',inf.launch.getUTCDate()+' '+MONS[inf.launch.getUTCMonth()]+' '+inf.launch.getUTCFullYear()+(inf.site?' from '+inf.site:'')+' · '+((Date.now()-inf.launch.getTime())/31557600000).toFixed(1)+' years up');
    row(dl,'orbit',num(a*(1-e)-RE)+' × '+num(a*(1+e)-RE)+' km · tilted '+(Math.acos(clamp(EL[q+2],-1,1))/AS.D).toFixed(1)+'° · round in '+(TAU/EL[q+9]).toFixed(1)+' min');
    cNow=row(dl,'now over','…');cLight=row(dl,'light','…');
    if(inf&&(inf.rcs>0||inf.mag!==null))row(dl,'size',[inf.rcs>0?'radar sees '+(inf.rcs>=10?num(inf.rcs):inf.rcs.toFixed(inf.rcs>=1?1:2))+' m²':'',inf.mag!==null?'magnitude '+inf.mag.toFixed(1).replace('-','\u2212')+' at 1,000 km':''].filter(Boolean).join(' · '));
    if(inf&&inf.tx)row(dl,'radio',inf.tx.slice(0,3).map(function(x){return (x[1]/1e6).toFixed(3)+' MHz'+(x[2]?' '+x[2]:'')}).join(' · '));
    row(dl,'measured','orbit of '+stampUTC(EL[q+10])+' · '+agoWords(Date.now()-EL[q+10]));
    el=document.createElement('p');el.className='cs';el.textContent=inf?'CelesTrak catalogue · SatNOGS':(SATINFO?'CelesTrak':'CelesTrak · reading the catalogue');c.appendChild(el);cardAt=0}
  function cardLive(t){
    if(sel<0||!selI||!cNow||t-cardAt<240)return;cardAt=t;var la=selI.lat,lo=selI.lon;
    cNow.textContent=Math.abs(la).toFixed(1)+'°'+(la>=0?'N':'S')+' '+Math.abs(lo).toFixed(1)+'°'+(lo>=0?'E':'W')+' · '+num(selI.alt)+' km up · '+num(selI.v)+' km/h';
    cLight.textContent=selI.lit?'in sunlight':'in the Earth\'s shadow'}
  function live(){return off===0&&want===1&&!ret}
  function nowSync(hide){var b=$('bNow');if(!b)return;b.hidden=!!hide;var lv=live();if(b._lv!==lv){b._lv=lv;b.textContent=lv?'×60':'Now';b.setAttribute('aria-label',lv?'Run time sixty times fast':'Return to the present moment')}}
  function enter(){if(GLX.ok&&gen!==GLX.gen)glSetup();GLOBE.load();liveLoad();g.cy=0;g.cxs=0;geo();idle=0;if(reduce)want=1;nowSync();cardBuild()}
  function leave(){nowSync(true);var c=$('card');if(c)c.hidden=true;cardFor=-2}
  function resize(){geo()}
  /* the chip: from the present to fast time, and from fast or wound time back to the present. The present is where it starts: the owner
     asked for the satellites in real time */
  function toNow(){if(live()){want=60;return}ret=true;want=1;spd=1}
  function ghostEnd(){}
  function down(p){idle=0;vlon=vlat=0}
  function move(p){if(p.n>=2)return;var k=57.2958/g.R;lon0-=(p.x-p.px)*k/Math.max(.35,Math.cos(lat0*AS.D));lat0=clamp(lat0+(p.y-p.py)*k,-85,85);
    if(p.ghost)return;vlon=-p.vx*k/Math.max(.35,Math.cos(lat0*AS.D));vlat=p.vy*k;idle=0}
  function gesture(e){
    if(!e.ghost&&e.scale!==1){zoom=clamp(zoom*e.scale,.15,2.8);geo()}
    /* turning two fingers winds time: a full turn is an hour and a half, about once round for a low satellite. Time then goes on at its
       own pace from there; the chip brings it back to now */
    if(e.ghost)return;var dd=-e.rot/TAU*5400000;off+=dd;ret=false;drag=2;idle=0}
  function wheel(e){if(e.shiftKey||Math.abs(e.deltaX)>Math.abs(e.deltaY)){off+=(e.deltaX||e.deltaY)*9000;ret=false}else{zoom=clamp(zoom*Math.exp(-e.deltaY*.0012),.15,2.8);geo()}idle=0}
  function key(e,dn){if(e.key==='ArrowRight')keyRate=dn?1:0;else if(e.key==='ArrowLeft')keyRate=dn?-1:0;else if(dn&&(e.key==='n'||e.key==='N'))toNow();else return false;return true}
  function pan(x){return clamp((x-g.cx)/Math.max(60,VW*.4),-1,1)}
  function up(p){
    if(p.ghost||FT-p.t0>320||p.moved>12||!EL)return;var i,best=-1,bd=24*24,d;
    for(i=0;i<satN;i++){view(place(i,simMs,tmp),tq);if(!shown(tq))continue;var x=g.cx+tq[0]*g.R-p.x,y=g.cy-tq[1]*g.R-p.y;d=x*x+y*y;if(GRP[i]===7||(FLG[i]&1))d*=.45;if(d<bd){bd=d;best=i}}
    sel=best;path=null;selI=null;if(best>=0){satInfoLoad();tone('glass',pent(clamp(Math.round(14-Math.log(EL[best*11])*9),2,14),52),.45,pan(p.x))}cardBuild()}
  /* is a body in sunlight? (in the frame of the stars; the Earth's shadow taken as a cylinder) */
  function sunlit(p){var d=p[0]*sunE[0]+p[1]*sunE[1]+p[2]*sunE[2];if(d>0)return true;var r2=p[0]*p[0]+p[1]*p[1]+p[2]*p[2];return r2-d*d>1}
  /* the bells: a bright satellite passing between sunlight and the Earth's shadow */
  function seq(s,when){
    if(!EL||!notable.length)return;var i,n=0,ms=simMs+spd*((AU.c&&when?when-AU.c.currentTime:0)*1000);
    for(i=0;i<notable.length;i++){var k=notable[i],l=sunlit(place(k,ms,tmp))?1:-1;if(lit[i]&&l!==lit[i]&&n<2&&Math.abs(spd)<400){view(tmp,tq);tone('glass',pent(4+(i%9),52),shown(tq)?.36:.2,pan(g.cx+tq[0]*g.R),when+n*.05);n++}lit[i]=l}}
  function tick(dt,t){
    if(LIVE.sats&&satV!==LIVE.ver.sats)unpack();
    if(!PTN){lon0+=vlon*dt;lat0=clamp(lat0+vlat*dt,-85,85);var k=Math.exp(-dt*2.4);vlon*=k;vlat*=k;idle+=dt;if(idle>4&&!reduce)lon0+=dt*.9*smooth((idle-4)/4)}else idle=0;
    lon0=AS.n180(lon0);GLOBE.basis(lat0,lon0,g);
    /* time */
    if(keyRate){off+=keyRate*dt*5400000*.35;ret=false}
    if(ret){off*=Math.exp(-dt*5);if(Math.abs(off)<700){off=0;ret=false}}
    else if(drag===2){drag=0}
    else{spd+=(want-spd)*Math.min(1,dt*1.6);if(Math.abs(spd-want)<.02)spd=want;off+=(spd-1)*dt*1000}
    /* two days ahead is far enough: come home, and set off again */
    if(off>172800000||off<-172800000){ret=true}
    simMs=Date.now()+off;th=AS.gmst(simMs)*AS.D;var ct=Math.cos(th),st=Math.sin(th);
    RE3[0]=g.E[0]*ct-g.E[1]*st;RE3[1]=g.E[0]*st+g.E[1]*ct;RE3[2]=g.E[2];RN3[0]=g.N[0]*ct-g.N[1]*st;RN3[1]=g.N[0]*st+g.N[1]*ct;RN3[2]=g.N[2];RC3[0]=g.C[0]*ct-g.C[1]*st;RC3[1]=g.C[0]*st+g.C[1]*ct;RC3[2]=g.C[2];
    var sI=AS.sun(simMs);moonI=AS.moon(simMs);AS.llv(sI.sublat,sI.sublon,sunV);AS.llv(moonI.sublat,moonI.sublon,moonV);AS.llv(sI.dec,sI.ra,sunE);
    if(VB&&Math.abs(simMs-baseT)>36000000)rebase(simMs);
    if(sel>=0&&EL){place(sel,simMs,tmp);var r=Math.hypot(tmp[0],tmp[1],tmp[2]);view(tmp,selQ);
      selI={alt:(r-1)*RE,v:Math.sqrt(MU*(2/(r*RE)-1/(EL[sel*11]*RE)))*3600,inc:Math.acos(clamp(EL[sel*11+2],-1,1))/AS.D,lit:sunlit(tmp),lat:Math.asin(clamp(tmp[2]/r,-1,1))/AS.D,lon:AS.n180(Math.atan2(tmp[1],tmp[0])/AS.D-th/AS.D)};
      /* its whole orbit, as it lies among the stars now */
      if(!path||Math.abs(simMs-pathAt)>600000){pathAt=simMs;path=new Float32Array(97*3);var q=sel*11,a=EL[q],e=EL[q+1],dm=(simMs-EL[q+10])/60000,w=EL[q+6]+EL[q+7]*dm,O=EL[q+4]+EL[q+5]*dm,cw=Math.cos(w),sw=Math.sin(w),cO=Math.cos(O),sO=Math.sin(O),cI=EL[q+2],sI2=EL[q+3];
        for(var j=0;j<=96;j++){var E=j/96*TAU,xp=a*(Math.cos(E)-e),yp=a*Math.sqrt(1-e*e)*Math.sin(E);path[j*3]=(cw*cO-sw*sO*cI)*xp+(-sw*cO-cw*sO*cI)*yp;path[j*3+1]=(cw*sO+sw*cO*cI)*xp+(-sw*sO+cw*cO*cI)*yp;path[j*3+2]=sw*sI2*xp+cw*sI2*yp}}}
    /* the card: built when a satellite is chosen, again when the catalogue arrives, and its two living lines four times a second;
       while it is up, the Earth moves up the screen to stay clear of it */
    if(sel>=0&&(cardFor!==sel||(!cardHad&&SATINFO)))cardBuild();cardLive(t);
    /* the Earth makes room for the card: up, when the card lies along the bottom; to the left, when it stands at the side */
    var cd=$('card'),ch=sel>=0&&cd&&!cd.hidden?cd.offsetHeight:0,cw=ch?cd.offsetWidth:0,side=cw>0&&cw<STG.w*.62,cyT=STG.cy-(side?0:Math.min(ch*.5,STG.h*.22)),cxT=STG.cx-(side?Math.min((cw+16)*.5,STG.w*.24):0),ke=Math.min(1,dt*5);
    g.cy+=(cyT-g.cy)*ke;if(!g.cxs)g.cxs=STG.cx;g.cxs+=(cxT-g.cxs)*ke;if(Math.abs(g.cxs-cxT)<.3)g.cxs=cxT;g.cx=g.cxs;
    nowSync()}
  function draw(t){
    if(!GLX.ok||GLX.lost){blank();return}if(gen!==GLX.gen)glSetup();if(!P){blank();return}
    var gl=GLX.gl,bg=[ABYSS[0]*.6,ABYSS[1]*.6,ABYSS[2]*.7],u,a,i;
    glClear(bg[0],bg[1],bg[2]);GLOBE.draw(g,{sun:sunV,moon:moonV,moonK:moonI?moonI.phase:0,bg:bg,dim:.8,flow:null,aur:null,time:t*.001});
    glAttrOff();gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,GLX.w,GLX.h);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);
    /* the stars; the shekere makes them shiver */
    u=P.star.u;a=P.star.a;gl.useProgram(P.star.p);gl.uniform3f(u.uE,RE3[0],RE3[1],RE3[2]);gl.uniform3f(u.uN,RN3[0],RN3[1],RN3[2]);gl.uniform3f(u.uV,RC3[0],RC3[1],RC3[2]);
    gl.uniform2f(u.uC,g.cx,g.cy);gl.uniform2f(u.uRes,VW,VH);gl.uniform1f(u.uR,g.R);gl.uniform1f(u.uS,Math.hypot(VW,VH)*.56);gl.uniform1f(u.uPt,DPR*(1+.2*HIT[1]*G[1]));
    gl.bindBuffer(gl.ARRAY_BUFFER,starB);gl.enableVertexAttribArray(a.a_p);gl.vertexAttribPointer(a.a_p,3,gl.FLOAT,false,28,0);gl.enableVertexAttribArray(a.a_c);gl.vertexAttribPointer(a.a_c,4,gl.FLOAT,false,28,12);
    gl.drawArrays(gl.POINTS,0,[starN,Math.min(starN,3000),Math.min(starN,1800)][QL]);
    if(satB&&satN){
      var n=[satN,Math.min(satN,12500),Math.min(satN,8000)][QL],fast=clamp((Math.abs(spd)-1)/40,0,1);
      glAttrOff();u=P.sat.u;a=P.sat.a;gl.useProgram(P.sat.p);gl.uniform3f(u.uE,RE3[0],RE3[1],RE3[2]);gl.uniform3f(u.uN,RN3[0],RN3[1],RN3[2]);gl.uniform3f(u.uV,RC3[0],RC3[1],RC3[2]);
      gl.uniform2f(u.uC,g.cx,g.cy);gl.uniform2f(u.uRes,VW,VH);gl.uniform1f(u.uR,g.R);gl.uniform1f(u.uT,(simMs-baseT)/60000);gl.uniform1f(u.uTail,lerp(1.2,3.2,fast));
      /* seen from far off the low swarm is thousands of points in a small disc: it is dimmed there, so the Earth still shows through it */
      gl.uniform1f(u.uPt,DPR*clamp(.5+.5*zoom,.62,1.5)*(1+.1*HIT[4]*G[4]));gl.uniform1f(u.uGain,clamp(.1+zoom*1.05,.2,1));
      gl.bindBuffer(gl.ARRAY_BUFFER,satB);
      var ptr=function(stride){gl.enableVertexAttribArray(a.a_e1);gl.vertexAttribPointer(a.a_e1,4,gl.FLOAT,false,stride,0);gl.enableVertexAttribArray(a.a_e2);gl.vertexAttribPointer(a.a_e2,4,gl.FLOAT,false,stride,16);
        gl.enableVertexAttribArray(a.a_e3);gl.vertexAttribPointer(a.a_e3,4,gl.FLOAT,false,stride,32);gl.enableVertexAttribArray(a.a_c);gl.vertexAttribPointer(a.a_c,4,gl.FLOAT,false,stride,48)};
      /* the tails, then the bodies (every other entry of the same list) */
      ptr(64);gl.uniform1f(u.uLine,.34+.3*fast);gl.drawArrays(gl.LINES,0,n*2);
      ptr(128);gl.uniform1f(u.uLine,0);gl.drawArrays(gl.POINTS,0,n)}
    gl.disable(gl.BLEND);
    /* the one that was asked about: its orbit, a ring round it, its name */
    var c=OV;
    if(sel>=0&&path){c.lineWidth=1;c.strokeStyle='rgba(234,249,255,.36)';c.beginPath();var pen=false;
      for(i=0;i<=96;i++){tmp[0]=path[i*3];tmp[1]=path[i*3+1];tmp[2]=path[i*3+2];view(tmp,tq);if(shown(tq)){var x=g.cx+tq[0]*g.R,y=g.cy-tq[1]*g.R;if(pen)c.lineTo(x,y);else{c.moveTo(x,y);pen=true}}else pen=false}
      c.stroke();
      if(shown(selQ)){var sx=g.cx+selQ[0]*g.R,sy=g.cy-selQ[1]*g.R;c.strokeStyle='rgba(234,249,255,.9)';c.lineWidth=1.1;c.beginPath();c.arc(sx,sy,9,0,TAU);c.stroke();
        c.font='500 9px "JetBrains Mono",ui-monospace,Menlo,monospace';c.textBaseline='middle';var nm=nameOf(sel).toUpperCase(),tw=c.measureText(nm).width,lx=sx+14+tw>VW-8?sx-14-tw:sx+14;
        c.fillStyle='rgba(1,4,10,.6)';c.fillRect(lx-3,sy-7,tw+6,14);c.fillStyle='rgba(234,249,255,.95)';c.fillText(nm,lx,sy+1)}}}
  function hud(){
    var S=LIVE.sats;if(!S||!EL)return LIVE.asked?'reading the orbits':'';
    var s=satN.toLocaleString('en-US')+' in orbit · '+stampUTC(simMs,want===1&&off===0),
      w=live()?'now':(ret?'returning to now':'×'+Math.round(Math.abs(spd))+(Math.abs(off)>90000?', '+(Math.abs(off)<5400000?Math.round(Math.abs(off)/60000)+' min':(Math.abs(off)/3600000).toFixed(1)+' h')+(off>0?' ahead':' back'):''));
    return s+'\n'+w+' · orbits of '+stampUTC(S.fresh||S.asOf)}
  /* the hint: one finger turning the Earth (it no longer winds time: left alone, this is the present) */
  function ghost(t){var u=(t*.12)%1;if(u>.5)return [null];var e=smooth(u/.5),k=Math.floor(t*.12)%2?1:-1;return [{x:g.cx+k*g.R*(.55-1.1*e),y:g.cy+g.R*.2}]}
  return {enter:enter,leave:leave,resize:resize,down:down,move:move,up:up,gesture:gesture,ghostEnd:ghostEnd,wheel:wheel,key:key,seq:seq,tick:tick,draw:draw,hud:hud,ghost:ghost,toNow:toNow,gl:function(){gen=-1},
    dbg:function(){var o={n:satN,off:off,spd:spd,want:want,live:live(),sel:sel,name:sel>=0?nameOf(sel):null,info:selI,card:$('card')&&!$('card').hidden?$('card').innerText:null,cat:!!SATINFO,zoom:zoom,R:g.R,lat0:lat0,lon0:lon0,stars:starN,notable:notable.length,base:baseT,sim:simMs,vis:[]};
      if(EL)for(var i=0;i<satN&&o.vis.length<8;i+=Math.max(1,Math.floor(satN/400))){view(place(i,simMs,tmp),tq);if(shown(tq)&&tq[2]>0&&Math.hypot(tq[0],tq[1])<(STG.w/2-20)/g.R)o.vis.push([Math.round(g.cx+tq[0]*g.R),Math.round(g.cy-tq[1]*g.R),i])}return o},
    place:function(i,ms){var p=place(i,ms,[0,0,0]);return [p[0]*RE,p[1]*RE,p[2]*RE]},nameOf:nameOf,
    look:function(la,lo,zm){lat0=la;lon0=lo;if(zm){zoom=zm;geo()}idle=-1e6;vlon=vlat=0},
    time:function(o,w){off=o;if(w!==undefined){want=w;spd=w}ret=false},
    /* how many satellites are above the horizon of a place now, and how far away the space station is (km; -1 if not known) */
    above:function(la,lo,ms){if(LIVE.sats&&satV!==LIVE.ver.sats)unpack();if(!EL||!satN)return null;var th=AS.gmst(ms)*AS.D,ct=Math.cos(th),st=Math.sin(th),s=AS.llv(la,lo,[0,0,0]),p=tq,n=0,iss=-1,i,X,Y,Z;
      for(i=0;i<satN;i++){place(i,ms,p);X=p[0]*ct+p[1]*st;Y=-p[0]*st+p[1]*ct;Z=p[2];if(X*s[0]+Y*s[1]+Z*s[2]>1.0008)n++;
        if(i===issI)iss=Math.sqrt((X-s[0])*(X-s[0])+(Y-s[1])*(Y-s[1])+(Z-s[2])*(Z-s[2]))*RE}
      return {n:n,iss:iss}},
    /* where the space station is over now: latitude, longitude, height (km) and speed (km/h) */
    iss:function(ms){if(LIVE.sats&&satV!==LIVE.ver.sats)unpack();if(!EL||issI<0)return null;var th=AS.gmst(ms)*AS.D,p=place(issI,ms,[0,0,0]),q=place(issI,ms+1000,[0,0,0]),
      X=p[0]*Math.cos(th)+p[1]*Math.sin(th),Y=-p[0]*Math.sin(th)+p[1]*Math.cos(th),r=Math.sqrt(p[0]*p[0]+p[1]*p[1]+p[2]*p[2]);
      return {lat:Math.asin(p[2]/r)/AS.D,lon:Math.atan2(Y,X)/AS.D,alt:(r-1)*RE,kmh:Math.sqrt((q[0]-p[0])*(q[0]-p[0])+(q[1]-p[1])*(q[1]-p[1])+(q[2]-p[2])*(q[2]-p[2]))*RE*3600}},
    pick:function(name){var S=LIVE.sats;for(var i=0;i<satN;i++)if((S.names[i]||'')===name){sel=i;path=null;selI=null;satInfoLoad();cardBuild();return i}return -1}}
})();
