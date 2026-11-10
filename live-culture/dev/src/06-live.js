/* ---------- what is known of the sky and the air right now: six things measured from orbit or for it.
   sats     every active satellite's orbit (CelesTrak element sets), and four clouds of wreckage
   wind     the wind ten metres above the whole Earth (NOAA's GFS model, one value per degree)
   aurora   NOAA's forecast of where the aurora is, from the solar wind measured a million miles upstream
   strikes  the lightning of the last half hour, as the GOES weather satellites saw it
   fires    the strongest fires burning in the last 24 hours, as NASA's fire-watching instruments saw their heat (FIRMS)
   storms   the tropical cyclones turning now (NOAA's hurricane centre; GDACS for the rest of the world)
   The page cannot reach the internet. It carries the set it was published with (data/live.json, next to the page) and watches
   its own store: a small stamp there says how new each of them is, and only a newer one is fetched. ---------- */
var LIVE={sats:null,wind:null,aurora:null,strikes:null,fires:null,storms:null,ver:{sats:0,wind:0,aurora:0,strikes:0,fires:0,storms:0},at:{sats:0,wind:0,aurora:0,strikes:0,fires:0,storms:0},ask:{},asked:false,watching:false,
  KINDS:['sats','wind','aurora','strikes','fires','storms']};
function liveWord(v,n){return String(v===undefined||v===null?'':v).replace(/[^0-9A-Za-z .\-]/g,'').slice(0,n||24)}
function liveTake(kind,d){
  try{
    if(!d)return false;var at=Date.parse(d.asOf)||0;if(!at||at<=LIVE.at[kind])return false;var o=null,i;
    if(kind==='storms'){if(!Array.isArray(d.list))return false;var S=[];
      for(i=0;i<d.list.length&&S.length<12;i++){var s=d.list[i]||{},sla=+s.lat,slo=+s.lon;if(!(sla>=-90&&sla<=90&&slo>=-180&&slo<=180))continue;
        S.push({name:liveWord(s.name,20)||'unnamed',cls:liveWord(s.cls,6),lat:sla,lon:slo,kmh:clamp(Math.round(+s.kmh||0),0,400),peak:!!s.peak,hpa:clamp(Math.round(+s.hpa||0),0,1100),
          mov:Array.isArray(s.mov)&&s.mov.length===2?[((+s.mov[0]||0)%360+360)%360,clamp(+s.mov[1]||0,0,200)]:null,at:Date.parse(s.at)||0,by:liveWord(s.by,12)})}
      LIVE.storms={asOf:at,list:S};LIVE.at.storms=at;LIVE.ver.storms++;return true}
    if(typeof d.b64!=='string')return false;var b=b64bytes(d.b64);
    if(kind==='sats'){var n=Math.floor(b.length/20);if(n<200)return false;var ib=typeof d.ids==='string'?b64bytes(d.ids):null,ids=null;
      if(ib&&ib.length>=n*4){ids=new Uint32Array(n);var iv=new DataView(ib.buffer,ib.byteOffset,ib.byteLength);for(i=0;i<n;i++)ids[i]=iv.getUint32(i*4,true)}
      o={asOf:at,src:String(d.src||'CelesTrak').slice(0,24),n:n,bytes:b,names:String(d.names||'').split('\n'),ids:ids}}
    else if(kind==='wind'){if(b.length!==360*181*2)return false;o={asOf:at,src:String(d.src||'NOAA GFS').slice(0,24),max:+d.max||0,grid:b}}
    else if(kind==='aurora'){if(b.length!==360*181)return false;o={asOf:at,obs:Date.parse(d.obs)||0,max:clamp(+d.max||0,0,100),grid:b}}
    else if(kind==='strikes'){var m=Math.floor(b.length/6),dv=new DataView(b.buffer,b.byteOffset,b.byteLength),L=[];
      for(i=0;i<m&&i<6000;i++){var la=dv.getInt16(i*6,true)/100,lo=dv.getInt16(i*6+2,true)/100;if(la<-90||la>90||lo<-180||lo>180)continue;L.push({lat:la,lon:lo,age:dv.getUint16(i*6+4,true)})}
      o={asOf:at,span:clamp(+d.span||1800,60,7200),list:L}}
    else if(kind==='fires'){var fn=Math.floor(b.length/10),fv=new DataView(b.buffer,b.byteOffset,b.byteLength),FL=[],fs=Array.isArray(d.sats)?d.sats:[];
      for(i=0;i<fn&&i<600;i++){var fa=fv.getInt16(i*10,true)/100,fo=fv.getInt16(i*10+2,true)/100,fp=fv.getUint16(i*10+4,true);if(fa<-90||fa>90||fo<-180||fo>180||!fp)continue;
        FL.push({lat:fa,lon:fo,frp:fp,age:fv.getUint16(i*10+6,true),sat:liveWord(fs[fv.getUint8(i*10+8)],24),sure:fv.getUint8(i*10+9)})}
      if(!FL.length)return false;o={asOf:at,min:+d.min||0,hours:clamp(+d.hours||24,1,72),list:FL}}
    if(!o)return false;LIVE[kind]=o;LIVE.at[kind]=at;LIVE.ver[kind]++;return true}catch(e){return false}}
function liveLoad(){
  if(LIVE.asked)return;LIVE.asked=true;
  try{fetch('data/live.json').then(function(r){return r.ok?r.json():null}).then(function(d){if(d)LIVE.KINDS.forEach(function(k){liveTake(k,d[k])});liveHosted()}).catch(function(){liveHosted()})}catch(e){}
  liveWatch()}
function liveWatch(){
  if(LIVE.watching)return;LIVE.watching=true;
  try{if(!(window.claude&&window.claude.use))return;window.claude.use('db').then(function(db){if(!db)return;
    db.doc('feeds/stamp').onSnapshot(function(s){try{if(!s||!s.exists)return;var st=s.data()||{};
      LIVE.KINDS.forEach(function(k){var at=Date.parse(st[k])||0;if(at>LIVE.at[k]&&LIVE.ask[k]!==at){LIVE.ask[k]=at;
        db.doc('feeds/'+k).get().then(function(g){if(g&&g.exists)liveTake(k,g.data())}).catch(function(){LIVE.ask[k]=0})}})}catch(e){}},function(){})
  }).catch(function(){})}catch(e){}}
/* what is on record about each object in orbit (CelesTrak's catalogue: its number, its launch, whose it is, where it left from, how big
   it looks to radar; how bright it can be; the radio it transmits on, from SatNOGS). A bigger file, so it is read the first time a
   satellite is asked about. Each record is 20 bytes, in catalogue order (tools/gen_live.py says which byte is what) */
var SATINFO=null,SATASK=false;
function satInfoLoad(){
  if(SATASK)return;SATASK=true;
  try{fetch('data/satinfo.json').then(function(r){return r.ok?r.json():null}).then(function(d){
    if(!d||typeof d.b64!=='string'){SATASK=false;return}var b=b64bytes(d.b64),n=Math.floor(b.length/20),dv=new DataView(b.buffer,b.byteOffset,b.byteLength),ix={},i;
    for(i=0;i<n;i++)ix[dv.getUint32(i*20,true)]=i;
    SATINFO={dv:dv,ix:ix,owners:Array.isArray(d.owners)?d.owners:[],sites:Array.isArray(d.sites)?d.sites:[],tx:d.tx&&typeof d.tx==='object'?d.tx:{}}}).catch(function(){SATASK=false})}catch(e){SATASK=false}}
function satInfo(id){
  if(!SATINFO||!id)return null;var i=SATINFO.ix[id];if(i===undefined)return null;
  var dv=SATINFO.dv,o=i*20,day=dv.getUint16(o+4,true),num=dv.getUint16(o+6,true),pc=dv.getUint16(o+8,true),ts=dv.getUint8(o+12),mb=dv.getUint8(o+13),s='',tx=SATINFO.tx[id];
  while(pc>0){s=String.fromCharCode(65+(pc-1)%26)+s;pc=Math.floor((pc-1)/26)}
  var ld=day?new Date(Date.UTC(1957,0,1)+day*86400000):null;
  return {launch:ld,intl:ld&&num?ld.getUTCFullYear()+'-'+('00'+num).slice(-3)+s:'',owner:String(SATINFO.owners[dv.getUint8(o+10)]||''),site:String(SATINFO.sites[dv.getUint8(o+11)]||''),
    type:ts&15,stat:ts>>4,mag:mb?(mb-100)/10:null,rcs:dv.getFloat32(o+14,true)||0,tx:Array.isArray(tx)?tx:null}}
/* a time as "9 Nov 18:00 UTC" */
function stampUTC(ms,secs){var d=new Date(ms),p=function(n){return (n<10?'0':'')+n};
  return d.getUTCDate()+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()]+' '+p(d.getUTCHours())+':'+p(d.getUTCMinutes())+(secs?':'+p(d.getUTCSeconds()):'')+' UTC'}
function agoWords(ms){var m=Math.max(0,Math.round(ms/60000));return m<90?m+' min ago':m<2880?Math.round(m/60)+' h ago':Math.round(m/1440)+' days ago'}

/* ---------- the hosted page (the same page served from the owner's own Cloudflare Worker: HOSTED is 1 there, 0 in the artifact)
   reads the sources for itself, through the Worker's /api/feed/<name>, every few minutes, and unpacks each into the same shape as the
   published snapshot, which it starts from. Each source is taken only when it is newer than what the page has. ---------- */
var PULL={at:{},ok:{},err:{},n:0,timer:0};
var PULLEVERY={wind:1800000,aurora:300000,strikes:300000,fires:900000,storms:1800000,sats:10800000,clouds:3600000,rain:1800000};
function hostGet(name,how){return fetch('/api/feed/'+name).then(function(r){if(!r.ok)throw new Error(name+' '+r.status);
  var mod=Date.parse(r.headers.get('last-modified')||'')||0,tm=Date.parse(r.headers.get('x-time')||'')||0;return (how==='text'?r.text():how==='blob'?r.blob():r.json()).then(function(b){return {b:b,mod:mod,time:tm}})})}
function titleCase(s){return String(s||'').toLowerCase().replace(/(^|[\s\-])([a-z])/g,function(m,a,b){return a+b.toUpperCase()})}
function pWind(w){
  if(!Array.isArray(w)||w.length<2)return null;var U=w[0].data,V=w[1].data,i,u,v,s,top=0;if(!U||!V||U.length!==65160||V.length!==65160)return null;
  var g=new Uint8Array(130320);for(i=0;i<65160;i++){u=+U[i]||0;v=+V[i]||0;s=Math.sqrt(u*u+v*v);if(s>top)top=s;g[i*2]=clamp(Math.round(u/40*127)+128,0,255);g[i*2+1]=clamp(Math.round(v/40*127)+128,0,255)}
  var at=Date.parse(String(w[0].header&&w[0].header.refTime||''));return at?{asOf:at,src:'NOAA GFS',max:Math.round(top*10)/10,grid:g}:null}
function pAurora(a){
  var c=a&&a.coordinates,g=new Uint8Array(65160),mx=0,i;if(!Array.isArray(c)||c.length<60000)return null;
  for(i=0;i<c.length;i++){var r=c[i],lon=((Math.round(+r[0])%360)+360)%360,lat=Math.round(+r[1]),v=clamp(Math.round(+r[2]||0),0,100);if(lat>=-90&&lat<=90){g[(90-lat)*360+lon]=v;if(v>mx)mx=v}}
  var at=Date.parse(a['Forecast Time']);return at?{asOf:at,obs:Date.parse(a['Observation Time'])||0,max:mx,grid:g}:null}
function pStrikes(s){
  var at=+(s&&s.updated_at),L=[],i;if(!(at>1.6e9)||!Array.isArray(s.strikes))return null;
  for(i=0;i<s.strikes.length;i++){var x=s.strikes[i],la=+x.lat,lo=+x.lon,age=at-(+x.time);if(la>=-90&&la<=90&&lo>=-180&&lo<=180&&age>=0&&age<=7200)L.push({lat:la,lon:lo,age:age})}
  L.sort(function(a,b){return a.age-b.age});if(L.length>6000)L.length=6000;var span=0;for(i=0;i<L.length;i++)if(L[i].age>span)span=L[i].age;
  return {asOf:at*1000,span:clamp(Math.round(span)||1800,60,7200),list:L}}
function pFires(f){
  if(!f||f.coverage!=='world'||!Array.isArray(f.hotspots))return null;var fat=+f.generatedAtMillis,R=[],i;if(!(fat>1.6e12))return null;
  for(i=0;i<f.hotspots.length;i++){var x=f.hotspots[i],la=+x.lat,lo=+x.lon,frp=+x.frp,age=(fat-(+x.time))/60000;
    if(!(la>=-90&&la<=90&&lo>=-180.01&&lo<=180.01&&frp>0)||!(age>=-10&&age<=4320))continue;
    var cp=x.confidencePercent!==undefined&&x.confidencePercent!==null?+x.confidencePercent:({h:100,n:60,l:20})[String(x.confidence)]||0;
    R.push({lat:la,lon:clamp(lo,-180,180),frp:Math.min(65535,Math.round(frp)),age:Math.max(0,Math.round(age)),sat:liveWord(x.satellite,24),sure:clamp(Math.round(cp),0,100)})}
  R.sort(function(a,b){return b.frp-a.frp});if(R.length>400)R.length=400;return R.length?{asOf:fat,min:+f.minFrpMw||0,hours:clamp(+f.windowHours||24,1,72),list:R}:null}
function pStorms(nhc,gd,now){
  var st=[];
  ((nhc&&nhc.records)||[]).forEach(function(r){try{var mv=/^\s*(\d+)\s+at\s+(\d+)\s*kt/.exec(String(r.movement||'')),la=+r.lat,lo=+r.lon;if(!(la>=-90&&la<=90&&lo>=-180&&lo<=180))return;
    st.push({name:titleCase(liveWord(r.name,20))||'unnamed',cls:liveWord(r.classification,6).toUpperCase(),lat:la,lon:lo,kmh:clamp(Math.round(+r.intensity_kt*1.852)||0,0,400),peak:false,
      hpa:clamp(Math.round(+r.pressure_mb)||0,0,1100),mov:mv?[(+mv[1])%360,clamp(Math.round(+mv[2]*1.852),0,200)]:null,at:Date.parse(r.updated)||0,by:'NOAA NHC'})}catch(e){}});
  ((gd&&gd.records)||[]).forEach(function(r){try{
    if(r.type!=='TC'||!r.current)return;var la=+r.lat,lo=+r.lon,to=Date.parse(r.to);if(!(la>=-90&&la<=90&&lo>=-180&&lo<=180)||!(now-to<60*3600000))return;
    for(var k=0;k<st.length;k++)if(Math.abs(st[k].lat-la)<3&&Math.abs((((st[k].lon-lo)+540)%360)-180)<3)return;
    var nm=String(r.name||''),m=/^Tropical Cyclone ([A-Z][A-Z\-]*?)-\d\d$/.exec(nm),n2=/^Tropical Cyclone (\d\d)-/.exec(nm);
    st.push({name:m?titleCase(liveWord(m[1],20)):(n2?'no. '+n2[1]:'unnamed'),cls:'',lat:la,lon:lo,kmh:String(r.severity_unit)==='km/h'?clamp(Math.round(+r.severity_value)||0,0,400):0,peak:true,hpa:0,mov:null,at:to,by:'GDACS'})}catch(e){}});
  return {asOf:now,list:st.slice(0,12)}}
/* two-line element sets, checked line by line as the format defines (a checksum digit ends each line) */
function tleOk(l){if(l.length<69||!/^[12] [0-9A-Z .+\-]{66}[0-9]/.test(l))return false;var s=0;for(var i=0;i<68;i++){var c=l.charCodeAt(i);if(c>=48&&c<=57)s+=c-48;else if(c===45)s+=1}return s%10===l.charCodeAt(68)-48}
function pTLE(text,now){
  var L=String(text||'').split('\n'),out=[],i,a=[];for(i=0;i<L.length;i++){var l=L[i].replace(/\r$/,'');if(l.trim())a.push(l)}
  for(i=0;i+2<a.length;){var nm=a[i],l1=a[i+1],l2=a[i+2];if(l1.charAt(0)!=='1'||l2.charAt(0)!=='2'){i++;continue}i+=3;if(!tleOk(l1)||!tleOk(l2))continue;
    var yy=+l1.slice(18,20),doy=+l1.slice(20,32),ep=Date.UTC(yy<57?2000+yy:1900+yy,0,1)+(doy-1)*86400000,inc=+l2.slice(8,16),raan=+l2.slice(17,25),ecc=+('0.'+l2.slice(26,33).trim()),
      argp=+l2.slice(34,42),ma=+l2.slice(43,51),n=+l2.slice(52,63);
    if(!(n>.2&&n<17.8&&ecc>=0&&ecc<.9&&inc>=0&&inc<=180)||!(Math.abs(ep-now)<45*86400000))continue;
    out.push({id:+l1.slice(2,7),name:nm.replace(/[^0-9A-Za-z .\-()\/+&']/g,'').slice(0,24).trim(),ep:ep,inc:inc,raan:raan,ecc:ecc,argp:argp,ma:ma,n:n})}
  return out}
/* a satellite new since the snapshot gets its kind from its name (and a stationary orbit from its period) */
function kindOf(nm,n,e){return /^STARLINK/.test(nm)?1:/^ONEWEB/.test(nm)?2:/^(KUIPER|QIANFAN|G60|HULIANWANG|SATNET|GUOWANG)/.test(nm)?3:
  /^(GPS|NAVSTAR|GALILEO|GSAT0|BEIDOU|GLONASS|IRNSS|QZS)/.test(nm)?4:/^(ISS|CSS|TIANGONG|TIANHE)/.test(nm)?7:
  /^(NOAA|GOES|METEOSAT|METOP|FENGYUN|FY-|HIMAWARI|LANDSAT|SENTINEL|FLOCK|LEMUR|SKYSAT|WORLDVIEW|JPSS|SUOMI|TERRA|AQUA|ICEYE|CAPELLA|PELICAN)/.test(nm)?6:
  /^(IRIDIUM|GLOBALSTAR|ORBCOMM)/.test(nm)?8:(n>.98&&n<1.02&&e<.02?5:0)}
/* the live orbits over the snapshot: each satellite keeps its kind and its place in the list and takes whichever element set was
   measured last; wreckage is refreshed from the four debris lists; anything the live list no longer carries and whose last element set is
   three weeks old is let go (it has most likely come down); satellites launched since the snapshot join at the end */
function satsMerge(act,deb,fetched){
  var S=LIVE.sats;if(!S||!S.ids||act.length<8000)return false;
  var base=S.asOf,n=S.n,dv=new DataView(S.bytes.buffer,S.bytes.byteOffset,S.bytes.byteLength),now=Date.now(),byId={},inDeb={},i,k,m=0,seen={};
  for(i=0;i<act.length;i++)byId[act[i].id]=act[i];
  for(k=0;k<deb.length;k++)for(i=0;i<deb[k].length;i++){var x=deb[k][i];if(!byId[x.id])byId[x.id]=x;inDeb[x.id]=1}
  var out=new Uint8Array((n+act.length)*20),ov=new DataView(out.buffer),names=[],ids=[];
  function put(x,gr,fl,nm){var o=m*20;ov.setFloat32(o,x.n,true);ov.setFloat32(o+4,(x.ep-base)/60000,true);ov.setUint16(o+8,Math.round(x.ecc*65535),true);ov.setUint16(o+10,Math.round(x.inc/180*65535),true);
    ov.setUint16(o+12,Math.round(x.raan/360*65536)%65536,true);ov.setUint16(o+14,Math.round(x.argp/360*65536)%65536,true);ov.setUint16(o+16,Math.round(x.ma/360*65536)%65536,true);out[o+18]=gr;out[o+19]=fl;names.push(nm);ids.push(x.id);m++}
  for(i=0;i<n;i++){var id=S.ids[i],o=i*20,ep0=base+dv.getFloat32(o+4,true)*60000,y=byId[id];seen[id]=1;
    if(y&&y.ep>ep0){put(y,S.bytes[o+18],S.bytes[o+19],S.names[i]);continue}
    if(!y&&now-ep0>21*86400000)continue;
    out.set(S.bytes.subarray(o,o+20),m*20);names.push(S.names[i]);ids.push(id);m++}
  for(i=0;i<act.length;i++){var z=act[i];if(seen[z.id])continue;seen[z.id]=1;var g=kindOf(z.name,z.n,z.ecc),mm=/^(STARLINK|ONEWEB|KUIPER)-(\d+)$/.exec(z.name);put(z,g,0,mm&&g>=1&&g<=3?mm[2]:z.name)}
  LIVE.sats={asOf:base,src:'CelesTrak',n:m,bytes:out.subarray(0,m*20),names:names,ids:new Uint32Array(ids),fresh:fetched||now,live:act.length};LIVE.ver.sats++;return true}
/* the real clouds, as the geostationary satellites see them (EUMETSAT's world cloud map, every three hours), for the globe */
var CLOUD={img:null,at:0,ver:0},RAIN={img:null,at:0,ver:0};
function cloudTake(b,mod){try{var u=URL.createObjectURL(b),im=new Image();im.onload=function(){CLOUD.img=im;CLOUD.at=mod||Date.now();CLOUD.ver++;GLOBE.cloud(im)};im.src=u}catch(e){}}
/* the rain of the last half hour that NASA has finished (IMERG, from the satellites of the GPM constellation; a few hours behind the clock) */
function rainTake(b,tm){try{var u=URL.createObjectURL(b),im=new Image();im.onload=function(){RAIN.img=im;RAIN.at=tm||0;RAIN.ver++;GLOBE.rain(im)};im.src=u}catch(e){}}
function livePull(force){
  if(!HOSTED||(document.hidden&&!force))return;var now=Date.now();PULL.n++;
  function due(k){if(!force&&PULL.at[k]&&now-PULL.at[k]<PULLEVERY[k])return false;PULL.at[k]=now;return true}
  function fail(k){return function(e){PULL.err[k]=String(e&&e.message||e).slice(0,80);PULL.at[k]=now-PULLEVERY[k]+120000}}
  function took(k,o){if(o&&o.asOf>LIVE.at[k]){LIVE[k]=o;LIVE.at[k]=o.asOf;LIVE.ver[k]++}PULL.ok[k]=Date.now()}
  if(due('wind'))hostGet('wind').then(function(r){took('wind',pWind(r.b))}).catch(fail('wind'));
  if(due('aurora'))hostGet('aurora').then(function(r){took('aurora',pAurora(r.b))}).catch(fail('aurora'));
  if(due('strikes'))hostGet('strikes').then(function(r){took('strikes',pStrikes(r.b))}).catch(fail('strikes'));
  if(due('fires'))hostGet('fires').then(function(r){took('fires',pFires(r.b))}).catch(fail('fires'));
  if(due('storms'))Promise.all([hostGet('nhc').catch(function(){return {b:null}}),hostGet('gdacs').catch(function(){return {b:null}})]).then(function(a){
    if(!a[0].b&&!a[1].b)throw new Error('no storm lists');var o=pStorms(a[0].b,a[1].b,Date.now());LIVE.storms=o;LIVE.at.storms=o.asOf;LIVE.ver.storms++;PULL.ok.storms=Date.now()}).catch(fail('storms'));
  if(due('sats')&&LIVE.sats)Promise.all([hostGet('tle-active','text')].concat(['fengyun-1c','cosmos-2251','iridium-33','cosmos-1408'].map(function(d){return hostGet('tle-'+d+'-debris','text').catch(function(){return {b:''}})}))).then(function(a){
    var t=Date.now(),act=pTLE(a[0].b,t),deb=a.slice(1).map(function(r){return pTLE(r.b,t)});if(!satsMerge(act,deb,a[0].mod||t))throw new Error('short orbit list '+act.length);PULL.ok.sats=Date.now()}).catch(fail('sats'));
  if(due('clouds'))hostGet('clouds','blob').then(function(r){cloudTake(r.b,r.mod);PULL.ok.clouds=Date.now()}).catch(fail('clouds'));
  if(due('rain'))hostGet('rain','blob').then(function(r){rainTake(r.b,r.time);PULL.ok.rain=Date.now()}).catch(fail('rain'))}
function liveHosted(){if(!HOSTED||PULL.timer)return;livePull(true);PULL.timer=setInterval(function(){livePull(false)},60000);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)livePull(false)})}
