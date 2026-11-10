/* ---------- the sky, worked out from the clock. Nothing here is fetched: the planets come from JPL's mean orbital elements
   (Standish, "Keplerian elements for approximate positions of the major planets", good to a few arc-minutes 1800-2050),
   the Sun and the Moon from the Astronomical Almanac's low-precision series, the space station from its published two-line
   element set carried forward with the Earth's oblateness (J2) turning its orbit. ---------- */
var AS=(function(){
  var D=Math.PI/180,TAU=Math.PI*2;
  function n360(a){a%=360;return a<0?a+360:a}
  function n180(a){a=n360(a);return a>180?a-360:a}
  function jd(ms){return ms/86400000+2440587.5}
  /* centuries of dynamical time since J2000 (clock time runs about 69 s behind it) */
  function cent(ms){return (jd(ms)+69.2/86400-2451545)/36525}
  /* a (AU), e, I, L, long. of perihelion, long. of node (degrees), then their change per century */
  var EL=[
    [0.38709927,0.20563593,7.00497902,252.25032350,77.45779628,48.33076593,0.00000037,0.00001906,-0.00594749,149472.67411175,0.16047689,-0.12534081],
    [0.72333566,0.00677672,3.39467605,181.97909950,131.60246718,76.67984255,0.00000390,-0.00004107,-0.00078890,58517.81538729,0.00268329,-0.27769418],
    [1.00000261,0.01671123,-0.00001531,100.46457166,102.93768193,0,0.00000562,-0.00004392,-0.01294668,35999.37244981,0.32327364,0],
    [1.52371034,0.09339410,1.84969142,-4.55343205,-23.94362959,49.55953891,0.00001847,0.00007882,-0.00813131,19140.30268499,0.44441088,-0.29257343],
    [5.20288700,0.04838624,1.30439695,34.39644051,14.72847983,100.47390909,-0.00011607,-0.00013253,-0.00183714,3034.74612775,0.21252668,0.20469106],
    [9.53667594,0.05386179,2.48599187,49.95424423,92.59887831,113.66242448,-0.00125060,-0.00050991,0.00193609,1222.49362201,-0.41897216,-0.28867794],
    [19.18916464,0.04725744,0.77263783,313.23810451,170.95427630,74.01692503,-0.00196176,-0.00004397,-0.00242939,428.48202785,0.40805281,0.04240589],
    [30.06992276,0.00859048,1.77004347,-55.12002969,44.96476227,131.78422574,0.00026291,0.00005105,0.00035372,218.45945325,-0.32241464,-0.00508664]];
  var NAMES=['Mercury','Venus','Earth','Mars','Jupiter','Saturn','Uranus','Neptune'];
  /* sidereal periods in days, for the bells */
  var PERIOD=[87.969,224.701,365.256,686.980,4332.59,10759.22,30688.5,60182];
  function elements(i,T){var p=EL[i];return {a:p[0]+p[6]*T,e:p[1]+p[7]*T,I:(p[2]+p[8]*T)*D,L:(p[3]+p[9]*T)*D,w:(p[4]+p[10]*T)*D,O:(p[5]+p[11]*T)*D}}
  function kepler(M,e){M=((M+Math.PI)%TAU+TAU)%TAU-Math.PI;var E=M+e*Math.sin(M);for(var k=0;k<10;k++){var d=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));E-=d;if(Math.abs(d)<1e-11)break}return E}
  /* a point of an orbit, by its eccentric anomaly, in the plane of the Earth's orbit (x to the March equinox, z north) */
  function orbitPoint(el,E,out){
    var xp=el.a*(Math.cos(E)-el.e),yp=el.a*Math.sqrt(1-el.e*el.e)*Math.sin(E),w=el.w-el.O,
      cw=Math.cos(w),sw=Math.sin(w),cO=Math.cos(el.O),sO=Math.sin(el.O),cI=Math.cos(el.I),sI=Math.sin(el.I);
    out=out||[0,0,0];
    out[0]=(cw*cO-sw*sO*cI)*xp+(-sw*cO-cw*sO*cI)*yp;out[1]=(cw*sO+sw*cO*cI)*xp+(-sw*sO+cw*cO*cI)*yp;out[2]=sw*sI*xp+cw*sI*yp;return out}
  function planet(i,T,out){var el=elements(i,T);return orbitPoint(el,kepler(el.L-el.w,el.e),out)}
  /* heliocentric longitude in the ecliptic, 0..360 */
  function helioLon(p){return n360(Math.atan2(p[1],p[0])/D)}
  function gmst(ms){var d=jd(ms)-2451545,T=d/36525;return n360(280.46061837+360.98564736629*d+0.000387933*T*T)}
  function obliq(ms){return (23.439291-0.0130042*cent(ms))*D}
  function eclToEq(lon,lat,eps){var sl=Math.sin(lon),cl=Math.cos(lon),sb=Math.sin(lat),cb=Math.cos(lat),se=Math.sin(eps),ce=Math.cos(eps);
    return {ra:n360(Math.atan2(sl*cb*ce-sb*se,cl*cb)/D),dec:Math.asin(sb*ce+cb*se*sl)/D}}
  function sun(ms){
    var n=jd(ms)-2451545,L=n360(280.460+0.9856474*n),g=n360(357.528+0.9856003*n)*D,lon=n360(L+1.915*Math.sin(g)+0.020*Math.sin(2*g)),
      q=eclToEq(lon*D,0,obliq(ms)),r=1.00014-0.01671*Math.cos(g)-0.00014*Math.cos(2*g);
    return {lon:lon,ra:q.ra,dec:q.dec,r:r,sublat:q.dec,sublon:n180(q.ra-gmst(ms))}}
  function moon(ms){
    var T=cent(ms),s=function(a,b){return Math.sin((a+b*T)*D)},c=function(a,b){return Math.cos((a+b*T)*D)};
    var lon=n360(218.32+481267.881*T+6.29*s(135.0,477198.87)-1.27*s(259.3,-413335.36)+0.66*s(235.7,890534.22)+0.21*s(269.9,954397.74)-0.19*s(357.5,35999.05)-0.11*s(186.5,966404.03)),
      lat=5.13*s(93.3,483202.02)+0.28*s(228.2,960400.89)-0.28*s(318.3,6003.15)-0.17*s(217.6,-407332.21),
      par=0.9508+0.0518*c(135.0,477198.87)+0.0095*c(259.3,-413335.36)+0.0078*c(235.7,890534.22)+0.0028*c(269.9,954397.74),
      q=eclToEq(lon*D,lat*D,obliq(ms)),su=sun(ms),dl=n360(lon-su.lon),
      el=Math.acos(Math.cos(lat*D)*Math.cos(dl*D));
    return {lon:lon,lat:lat,r:1/Math.sin(par*D),ra:q.ra,dec:q.dec,sublat:q.dec,sublon:n180(q.ra-gmst(ms)),elong:el/D,phase:(1-Math.cos(el))/2,waxing:dl<180,age:dl/360*29.530589}}
  /* a unit vector on the Earth from latitude and longitude (x through 0,0; z through the north pole) */
  function llv(lat,lon,out){var a=lat*D,b=lon*D,c=Math.cos(a);out=out||[0,0,0];out[0]=c*Math.cos(b);out[1]=c*Math.sin(b);out[2]=Math.sin(a);return out}

  /* ---- the space station ---- */
  var MU=398600.4418,RE=6378.137,J2=1.08262668e-3,F=1/298.257223563;
  function tle(l1,l2){
    function ck(l){var s=0;for(var i=0;i<68;i++){var ch=l.charAt(i);if(ch>='0'&&ch<='9')s+=+ch;else if(ch==='-')s+=1}return s%10===+l.charAt(68)}
    if(!l1||!l2||l1.length<69||l2.length<69||l1.charAt(0)!=='1'||l2.charAt(0)!=='2'||!ck(l1)||!ck(l2))return null;
    var yy=+l1.substr(18,2),doy=parseFloat(l1.substr(20,12)),yr=yy<57?2000+yy:1900+yy,epoch=Date.UTC(yr,0,1)+(doy-1)*86400000,
      nd2=parseFloat(l1.substr(33,10))||0,inc=parseFloat(l2.substr(8,8))*D,O=parseFloat(l2.substr(17,8))*D,e=parseFloat('0.'+l2.substr(26,7)),
      w=parseFloat(l2.substr(34,8))*D,M=parseFloat(l2.substr(43,8))*D,n=parseFloat(l2.substr(52,11));
    if(!(n>0)||!(e>=0&&e<1)||!isFinite(epoch))return null;
    var nr=n*TAU/86400,a1=Math.pow(MU/(nr*nr),1/3),ci=Math.cos(inc),b=Math.sqrt(1-e*e),
      d1=0.75*J2*RE*RE/(a1*a1)*(3*ci*ci-1)/(b*b*b),a0=a1*(1-d1/3-d1*d1-134/81*d1*d1*d1),
      d0=0.75*J2*RE*RE/(a0*a0)*(3*ci*ci-1)/(b*b*b),n0=nr/(1+d0),a=a0/(1-d0),p=a*(1-e*e),k=J2*(RE/p)*(RE/p);
    return {epoch:epoch,inc:inc,O:O,e:e,w:w,M:M,a:a,b:b,n:n,nd2:nd2*TAU/(86400*86400),
      Od:-1.5*k*n0*ci,wd:0.75*k*n0*(5*ci*ci-1),Md:n0*(1+0.75*k*b*(3*ci*ci-1)),period:86400/n,l1:l1,l2:l2}}
  /* where the station is at a moment: latitude, longitude, height (km), and its place as a unit vector on the turning Earth */
  function sat(t,ms,out){
    var dt=(ms-t.epoch)/1000,M=t.M+t.Md*dt+t.nd2*dt*dt,O=t.O+t.Od*dt,w=t.w+t.wd*dt,E=kepler(M,t.e),
      xp=t.a*(Math.cos(E)-t.e),yp=t.a*t.b*Math.sin(E),cw=Math.cos(w),sw=Math.sin(w),cO=Math.cos(O),sO=Math.sin(O),cI=Math.cos(t.inc),sI=Math.sin(t.inc),
      x=(cw*cO-sw*sO*cI)*xp+(-sw*cO-cw*sO*cI)*yp,y=(cw*sO+sw*cO*cI)*xp+(-sw*sO+cw*cO*cI)*yp,z=sw*sI*xp+cw*sI*yp,
      th=gmst(ms)*D,ct=Math.cos(th),st=Math.sin(th),X=x*ct+y*st,Y=-x*st+y*ct,r=Math.sqrt(X*X+Y*Y+z*z),rho=Math.sqrt(X*X+Y*Y),
      e2=F*(2-F),lat=Math.atan2(z,rho*(1-e2)),N=0;
    for(var i=0;i<3;i++){var sl=Math.sin(lat);N=RE/Math.sqrt(1-e2*sl*sl);lat=Math.atan2(z+N*e2*sl,rho)}
    out=out||{};out.lat=lat/D;out.lon=Math.atan2(Y,X)/D;out.alt=rho/Math.cos(lat)-N;out.x=X/r;out.y=Y/r;out.z=z/r;out.r=r;return out}
  return {D:D,jd:jd,cent:cent,NAMES:NAMES,PERIOD:PERIOD,elements:elements,kepler:kepler,orbitPoint:orbitPoint,planet:planet,helioLon:helioLon,
    gmst:gmst,obliq:obliq,eclToEq:eclToEq,sun:sun,moon:moon,llv:llv,tle:tle,sat:sat,n360:n360,n180:n180,RE:RE}
})();
