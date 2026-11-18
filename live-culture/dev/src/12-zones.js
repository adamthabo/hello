/* ---------- ZONES: two layers of the Earth (15 Nov, 20:39: "War zones and blacked out zones is good. Gaza, North Korea, Moscow,
   Beijing, etc.."). War zones: each war with more than a thousand dead this year, by the count of Wikipedia's list of ongoing armed
   conflicts, glowing red where its fighting is, brighter the more it has killed, beating slowly; and in Ukraine the ground Russia holds,
   as DeepStateMap draws it each day, with its edge (the front) drawn bright. Blackouts: the places cut off: no open internet at all
   (North Korea), the internet switched off (as the Internet Society's Pulse lists them, ongoing), no power (Gaza, Cuba, and Ukraine
   under the strikes on its grid), or the big services blocked (China, Russia, Iran...): the land there goes dark. On the site, the
   countries where IODA (Georgia Tech) has seen the internet drop in the last day are marked as well, and the front is the day's.
   All of it is in data/zones.json (tools/gen_zones.py), as checked on the day it was made; a tap on a zone reads what is known of it
   and where that comes from. The zones' colour is laid on the Earth itself (a picture of the whole Earth unrolled, red where there is
   war, its blue the darkness of the places cut off, its green the ground held in Ukraine: the globe's own shader paints them, so the
   satellites pass over them); their edges, the front, the small ones and the names are drawn over it on the flat canvas, each edge cut
   where it goes over the horizon ---------- */
var ZONES=(function(){
  var W=[],K=[],FR=null,IO=[],CC={},asOf='',ver=0,asked=false,tq=[0,0,0],MARCH=0,
    KW={closed:'no open internet',cut:'internet cut',power:'no power',blocked:'blocked',out:'outage now'};
  function word(v,n){return String(v===undefined||v===null?'':v).replace(/[^\w .,:;'()&%\/À-ſ+\-–]/g,'').slice(0,n||120)}
  /* a shape: its rings as points on the unit sphere, their latitudes and longitudes (for a tap), and a circle round it (to skip it
     when it is all behind the Earth) */
  function rings(p){var out=[];if(!Array.isArray(p))return out;
    p.slice(0,40).forEach(function(r){if(!Array.isArray(r)||r.length<6)return;var n=Math.min(4000,r.length>>1),V=new Float32Array(n*3),L=new Float32Array(n*2),i,ok=true;
      for(i=0;i<n;i++){var lo=+r[i*2]/100,la=+r[i*2+1]/100;if(!(la>=-90&&la<=90&&lo>=-181&&lo<=181)){ok=false;break}L[i*2]=lo;L[i*2+1]=la;var v=AS.llv(la,lo,tq);V[i*3]=v[0];V[i*3+1]=v[1];V[i*3+2]=v[2]}
      if(ok)out.push({V:V,L:L,n:n})});return out}
  function bound(R){var c=[0,0,0],i,k,n=0;R.forEach(function(r){for(i=0;i<r.n;i++){for(k=0;k<3;k++)c[k]+=r.V[i*3+k];n++}});var m=Math.hypot(c[0],c[1],c[2])||1;c=[c[0]/m,c[1]/m,c[2]/m];
    var lo=1;R.forEach(function(r){for(i=0;i<r.n;i++)lo=Math.min(lo,c[0]*r.V[i*3]+c[1]*r.V[i*3+1]+c[2]*r.V[i*3+2])});return {c:c,cosr:lo}}
  function zone(z,war){if(!z||typeof z!=='object')return null;var R=rings(z.p);if(!R.length)return null;var b=bound(R),lab=Array.isArray(z.lab)&&z.lab.length===2?[clamp(+z.lab[0],-89,89),AS.n180(+z.lab[1])]:null;
    var o={id:word(z.id,24),name:word(z.name,40),line:word(z.line,140),by:word(z.by,60),R:R,c:b.c,cosr:b.cosr,lab:lab,lv:lab?AS.llv(lab[0],lab[1],[0,0,0]):b.c.slice(),p:[0,0,0],ph:Math.random()*TAU,sz:0};
    if(war){o.war=word(z.war,60);o.since=word(z.since,20);o.dead=clamp(Math.round(+z.dead||0),0,1e7);o.k=clamp(Math.log(Math.max(1,o.dead)/500)/Math.log(100),.15,1)}
    else{o.kind=KW[z.kind]?z.kind:'blocked'}
    return o}
  function take(d){
    try{if(!d||typeof d!=='object')return false;var w=[],k=[];
      (Array.isArray(d.war)?d.war:[]).slice(0,40).forEach(function(z){var o=zone(z,true);if(o)w.push(o)});
      (Array.isArray(d.dark)?d.dark:[]).slice(0,40).forEach(function(z){var o=zone(z,false);if(o)k.push(o)});
      if(!w.length&&!k.length)return false;W=w.sort(function(a,b){return b.dead-a.dead});K=k;asOf=word(d.asOf,24);
      CC=d.cc&&typeof d.cc==='object'?d.cc:{};
      FR=null;if(d.front&&Array.isArray(d.front.p)){var R=rings(d.front.p);if(R.length){var fb=bound(R);FR={R:R,c:fb.c,cosr:fb.cosr,sz:0,date:word(d.front.date,12),by:word(d.front.by,40),km2:clamp(Math.round(+d.front.km2||0),0,1e6)}}}
      /* (on the site) where IODA saw the internet drop in the last day: a mark on the country, by its place in the table */
      /* (a country IODA names that is already on the list of places cut off gets the word on its own card, not a second mark) */
      IO=[];(Array.isArray(d.ioda)?d.ioda:[]).slice(0,16).forEach(function(x){var c=x&&CC[x.cc];if(!c||!Array.isArray(c))return;var la=clamp(+c[1],-89,89),lo=AS.n180(+c[2]);if(isNaN(la)||isNaN(lo))return;
        var inK=null;for(var q=0;q<K.length;q++)if(inZone(K[q],la,lo)){inK=K[q];break}if(inK){inK.io='IODA saw the internet drop here in the last day'+(d.iodaAt?' ('+word(d.iodaAt,20)+')':'');return}
        IO.push({id:'io-'+word(x.cc,2),name:word(c[0],40),cc:word(x.cc,2),kind:'out',lv:AS.llv(la,lo,[0,0,0]),lab:[la,lo],p:[0,0,0],line:'the internet dropped here in the last day'+(x.what?' ('+word(x.what,40)+')':''),by:'IODA, Georgia Tech'+(d.iodaAt?' ('+word(d.iodaAt,20)+')':''),ph:Math.random()*TAU,R:null})});
      ver++;return true}catch(e){return false}}
  /* the file the page carries; on the site, then, what changes by the day (the Worker's /api/zones: the day's front, IODA's outages),
     asked for again when the Earth is entered half an hour later */
  var BASE=null,liveAt=0;
  function live(){if(!HOSTED||!BASE||Date.now()-liveAt<1800000)return;liveAt=Date.now();
    fetch('/api/zones').then(function(r){return r.ok?r.json():null}).then(function(d){if(!d||!BASE)return;var m={},k;for(k in BASE)m[k]=BASE[k];
      if(d.front&&Array.isArray(d.front.p)&&d.front.p.length)m.front=d.front;m.ioda=Array.isArray(d.ioda)?d.ioda:[];m.iodaAt=d.iodaAt;take(m)}).catch(function(){liveAt=0})}
  function load(){if(asked){live();return}asked=true;
    try{fetch('data/zones.json').then(function(r){return r.ok?r.json():null}).then(function(d){if(take(d)){BASE=d;live()}}).catch(function(){asked=false})}catch(e){asked=false}}
  /* ---- one ring's outline on the canvas, cut at the horizon (and closed along it); the box it takes on the screen ---- */
  var BX=[0,0,0,0];
  function ring(c,r,g){var V=r.V,n=r.n,i,s=-1,E=g.E,N=g.N,C=g.C,R=g.R,cx=g.cx,cy=g.cy;
    function z(j){return V[j*3]*C[0]+V[j*3+1]*C[1]+V[j*3+2]*C[2]}
    for(i=0;i<n;i++)if(z(i)>0){s=i;break}if(s<0)return false;
    function pt(j){var x=cx+(V[j*3]*E[0]+V[j*3+1]*E[1]+V[j*3+2]*E[2])*R,y=cy-(V[j*3]*N[0]+V[j*3+1]*N[1]+V[j*3+2]*N[2])*R;if(x<BX[0])BX[0]=x;if(x>BX[2])BX[2]=x;if(y<BX[1])BX[1]=y;if(y>BX[3])BX[3]=y;return [x,y]}
    function limb(a,b,za,zb){var t=za/(za-zb),q=[V[a*3]+(V[b*3]-V[a*3])*t,V[a*3+1]+(V[b*3+1]-V[a*3+1])*t,V[a*3+2]+(V[b*3+2]-V[a*3+2])*t],
      x=q[0]*E[0]+q[1]*E[1]+q[2]*E[2],y=q[0]*N[0]+q[1]*N[1]+q[2]*N[2],m=Math.hypot(x,y)||1;return Math.atan2(y/m,x/m)}
    var p=pt(s),ex=null;c.moveTo(p[0],p[1]);
    for(var k=0;k<n;k++){var a=(s+k)%n,b=(s+k+1)%n,za=z(a),zb=z(b);
      if(za>0&&zb>0){p=pt(b);c.lineTo(p[0],p[1])}
      else if(za>0){ex=limb(a,b,za,zb);c.lineTo(cx+Math.cos(ex)*R,cy-Math.sin(ex)*R)}
      else if(zb>0){var en=limb(a,b,za,zb);if(ex!==null){var d=en-ex;while(d>Math.PI)d-=TAU;while(d<-Math.PI)d+=TAU;c.arc(cx,cy,R,-ex,-en,d>0)}else c.lineTo(cx+Math.cos(en)*R,cy-Math.sin(en)*R);p=pt(b);c.lineTo(p[0],p[1]);ex=null}}
    c.closePath();return true}
  function shapeOf(c,o,g){if(o.c[0]*g.C[0]+o.c[1]*g.C[1]+o.c[2]*g.C[2]<-Math.sqrt(Math.max(0,1-o.cosr*o.cosr))-.02)return false;
    BX[0]=BX[1]=1e9;BX[2]=BX[3]=-1e9;c.beginPath();var any=false;o.R.forEach(function(r){if(ring(c,r,g))any=true});o.sz=any?Math.max(BX[2]-BX[0],BX[3]-BX[1]):0;return any}
  /* ---- the picture of the zones for the globe: the Earth unrolled (across, longitude from 180 W; down, latitude from the north pole),
     red the wars (as bright as each has killed), green the ground held in Ukraine, blue how dark a place cut off goes ---- */
  var ZT=null,ztV=-1,ztG=-1;
  function raster(){var Wd=2048,Hd=1024,cv=document.createElement('canvas');cv.width=Wd;cv.height=Hd;var c=cv.getContext('2d');c.fillStyle='#000';c.fillRect(0,0,Wd,Hd);c.globalCompositeOperation='lighter';
    function path(R){c.beginPath();R.forEach(function(r){for(var i=0;i<r.n;i++){var x=(r.L[i*2]+180)/360*Wd,y=(90-r.L[i*2+1])/180*Hd;if(i)c.lineTo(x,y);else c.moveTo(x,y)}c.closePath()})}
    W.forEach(function(o){path(o.R);c.fillStyle='rgb('+Math.round(o.k*235)+',0,0)';c.fill()});
    if(FR){path(FR.R);c.fillStyle='rgb(0,230,0)';c.fill()}
    K.forEach(function(o){path(o.R);c.fillStyle='rgb(0,0,'+Math.round((o.kind==='blocked'?.36:o.kind==='power'?.66:.82)*255)+')';c.fill()});
    return cv}
  function tex(){if(!GLX.ok||(!W.length&&!K.length))return null;if(ZT&&ztV===ver&&ztG===GLX.gen)return ZT.tex;var old=ztG===GLX.gen?ZT:null;
    try{var t=glImageTex(raster(),true,false,true);if(!t)return null;if(old)glFree(old);ZT=t;ztV=ver;ztG=GLX.gen;return t.tex}catch(e){ztV=ver;ztG=GLX.gen;return ZT?ZT.tex:null}}
  /* ---- over the globe: the edges (a dashed grey for the places cut off, red for the wars), the front, the small ones, the names ---- */
  var LB=[],LBX=[];
  function draw(c,g,t,war,dark){
    if(!W.length&&!K.length)return;var i,o;LB.length=0;c.save();c.lineJoin='round';
    /* (17 Nov, the fifth hourly run) both alive at a glance on a phone: the places cut off with their dashes slowly crawling round them
       (and, on the globe, dimming and brightening, 12-wind.js), the front's dashes marching along it */
    var tt=reduce?0:t;MARCH=tt;
    if(dark){c.setLineDash([3,3]);c.lineDashOffset=-(tt*.004)%6;for(i=0;i<K.length;i++){o=K[i];if(!shapeOf(c,o,g))continue;c.strokeStyle='rgba(190,205,225,'+(o.kind==='blocked'?.3:.55)+')';c.lineWidth=1;c.stroke();if(o.sz<14)mark(c,o,g,false);LB.push(o)}
      c.lineDashOffset=0;
      c.setLineDash([]);for(i=0;i<IO.length;i++){o=IO[i];GLOBE.pr(o.lv,g,o.p);if(o.p[2]<=.08)continue;mark(c,o,g,false);LB.push(o)}}
    if(war){for(i=0;i<W.length;i++){o=W[i];if(!shapeOf(c,o,g))continue;c.strokeStyle='rgba(255,72,52,'+(.3+.45*o.k).toFixed(3)+')';c.lineWidth=1.1;c.stroke();if(o.sz<14)mark(c,o,g,true);LB.push(o)}
      /* the front: the edge of the ground Russia holds */
      if(FR&&shapeOf(c,FR,g)){c.strokeStyle='rgba(1,4,10,.6)';c.lineWidth=3.6;c.stroke();c.strokeStyle='rgba(255,156,100,.42)';c.lineWidth=1.4;c.stroke();
        c.setLineDash([7,5]);c.lineDashOffset=-(tt*.014)%12;c.strokeStyle='rgba(255,186,140,.97)';c.lineWidth=2;c.stroke();c.setLineDash([]);c.lineDashOffset=0}}
    labels(c,g);c.restore()}
  /* a zone too small to see at this distance (Gaza, an island) is a ring that beats, so it can be seen and tapped */
  function mark(c,o,g,war){GLOBE.pr(o.lv,g,o.p);if(o.p[2]<=.05)return;var u=.5+.5*Math.sin((reduce?0:FT)*.004+o.ph),r=4+2*u;
    c.beginPath();c.arc(o.p[0],o.p[1],r,0,TAU);if(war){c.fillStyle='rgba(255,44,30,'+(.35+.3*u).toFixed(3)+')';c.fill();c.strokeStyle='rgba(255,120,90,.95)'}else{c.fillStyle='rgba(0,1,4,.85)';c.fill();c.strokeStyle='rgba(200,214,235,.85)'}
    c.lineWidth=1.2;c.stroke()}
  /* the names: the wars by their dead, then the places cut off; none over another */
  function labels(c,g){var box=[],n=0,tw={};LBX=[];c.font='600 9px '+MONO;c.textBaseline='middle';c.lineJoin='round';
    /* (18 Nov) clear of the satellite asked about, whose name is drawn over everything */
    try{var sb=ORBIT.layer.box();if(sb)box.push(sb)}catch(e){}
    /* and clear of the name of the beat playing at its place (18 Nov, 16:06), drawn over everything */
    try{var bb=WIND.beatBox();if(bb)box.push(bb)}catch(e){}
    /* and clear of the zoom's buttons over the right of the globe: a name that would go under them goes to their left, or is left out */
    var zb=null;try{zb=WIND.zmBox()}catch(e){}
    /* a war first, by its dead; a place both at war and cut off has one name, the war's, with what it is cut off from */
    var L=LB.filter(function(o){return o.war}).concat(LB.filter(function(o){return !o.war}));
    L.forEach(function(o){if(o.war)tw[o.id]=o});L.forEach(function(o){var twin=!o.war&&tw[o.id];if(twin)return;var dk=null;if(o.war)for(var q=0;q<LB.length;q++)if(!LB[q].war&&LB[q].id===o.id)dk=LB[q];
      if(n>=14)return;GLOBE.pr(o.lv,g,o.p);if(o.p[2]<=.2)return;if(o.sz>0&&o.sz<8&&g.R<300&&!o.war&&o.kind!=='closed'&&o.kind!=='power'&&o.kind!=='out')return;
      var t=o.name.toUpperCase()+(o.war?(dk?' · '+KW[dk.kind].toUpperCase():''):' · '+KW[o.kind].toUpperCase()),w=c.measureText(t).width,x=o.p[0]-w/2,y=o.p[1]+(o.sz<14?13:0);
      if(o.sz>=8&&o.sz<w*.7&&!o.war&&o.kind==='blocked')return;
      if(zb&&x<zb[2]&&x+w>zb[0]&&y-6<zb[3]&&y+6>zb[1]){var x2=zb[0]-w-4;if(x2<4)return;x=x2}
      for(var i=0;i<box.length;i++){var b=box[i];if(x<b[2]&&x+w>b[0]&&y-6<b[3]&&y+6>b[1])return}
      if(x<4||x+w>VW-4||y<STG.y0+8||y>STG.y1-8)return;box.push([x-3,y-7,x+w+3,y+7]);LBX.push([Math.round(x),Math.round(y-6),Math.round(x+w),Math.round(y+6),t]);n++;
      c.lineWidth=3;c.strokeStyle='rgba(1,4,10,.75)';c.strokeText(t,x,y);c.fillStyle=o.war?'rgba(255,112,88,.98)':'rgba(214,224,240,.9)';c.fillText(t,x,y)})}
  /* ---- a tap: the zone under the finger (a small one's ring within reach of it first), war and cut off; and the front ---- */
  function inside(r,lo,la){var L=r.L,n=r.n,i,j,c=false;for(i=0,j=n-1;i<n;j=i++){var xi=L[i*2],yi=L[i*2+1],xj=L[j*2],yj=L[j*2+1];if((yi>la)!==(yj>la)&&lo<(xj-xi)*(la-yi)/(yj-yi)+xi)c=!c}return c}
  function inZone(o,la,lo){if(!o.R)return false;for(var i=0;i<o.R.length;i++)if(inside(o.R[i],lo,la))return true;return false}
  function pick(x,y,la,lo,g,war,dark){var out={w:null,d:null,front:false},i;
    function near(L,isW,bd){var o,d,best=null;for(var j=0;j<L.length;j++){o=L[j];if(o.R&&o.sz>=14)continue;GLOBE.pr(o.lv,g,o.p);if(o.p[2]<=.05)continue;d=(o.p[0]-x)*(o.p[0]-x)+(o.p[1]-y)*(o.p[1]-y);if(d<bd){bd=d;best=o}}return best}
    if(war)out.w=near(W,true,18*18);if(dark)out.d=near(K.concat(IO),false,18*18);
    if(la!==null){if(war&&!out.w)for(i=0;i<W.length;i++)if(inZone(W[i],la,lo)){out.w=W[i];break}
      if(dark&&!out.d)for(i=0;i<K.length;i++)if(inZone(K[i],la,lo)){out.d=K[i];break}
      if(war&&FR&&out.w&&out.w.id==='ukraine'&&FR.R.some(function(r){return inside(r,lo,la)}))out.front=true}
    return out.w||out.d?out:null}
  /* the words for a zone read (three or four lines, each short enough for a phone where it can be) */
  function words(z){var L=[],w=z.w,d=z.d;
    if(w){L.push(w.name+' · '+w.war+(w.since?', since '+w.since:''));
      L.push(w.dead.toLocaleString('en-US')+' killed in 2026'+(W.filter(function(x){return x.dead===w.dead}).length>1?' in the conflict as a whole':'')+' (Wikipedia)');
      if(z.front&&FR)L.push('held by Russia: '+FR.km2.toLocaleString('en-US')+' km² ('+FR.by+', '+FR.date+')');
      if(w.line)L.push(w.line+' · '+w.by)}
    if(d){L.push((w?'':d.name+' · ')+KW[d.kind]+': '+d.line+(d.by?' · '+d.by:''));if(d.io)L.push(d.io)}
    return L.join('\n')}
  return {load:load,take:take,draw:draw,pick:pick,words:words,tex:tex,
    has:function(k){return k==='war'?W.length>0:K.length>0||IO.length>0},
    count:function(k){return k==='war'?W.length:K.length+IO.length},
    first:function(k){var o=k==='war'?W[0]:K[0];return o&&o.lab?{lat:o.lab[0],lon:o.lab[1],name:o.name}:null},
    dbg:function(){return {ver:ver,asOf:asOf,march:+(MARCH*.014%12).toFixed(2),war:W.map(function(o){return o.id}),dark:K.map(function(o){return o.id+':'+o.kind}),ioda:IO.map(function(o){return o.cc}),front:FR?{km2:FR.km2,date:FR.date,rings:FR.R.length}:null,
      shown:LB.map(function(o){return {id:o.id,x:Math.round(o.p[0]),y:Math.round(o.p[1]),z:+o.p[2].toFixed(2),sz:Math.round(o.sz||0),war:!!o.war}}),names:LBX.slice()}}}
})();
