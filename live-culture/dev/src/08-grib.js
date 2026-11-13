/* ---------- GRIB2, the format the world's weather models are published in, read on the device. Only what NOAA's GFS and its
   wave model use: a regular latitude/longitude grid (template 3.0), simple packing (5.0) and complex packing with or without spatial
   differencing (5.2, 5.3), a bitmap or missing values for points that have no value (land, for the sea). Each message comes back as
   its grid: west to east from the first longitude, north to south, NaN where there is no value. Checked against ECMWF's ecCodes on
   real files (tools/t_grib.js). ---------- */
var GRIB=(function(){
  function u8(b,o){return b[o]}function u16(b,o){return b[o]*256+b[o+1]}function u32(b,o){return ((b[o]*256+b[o+1])*256+b[o+2])*256+b[o+3]}
  /* GRIB's signed numbers keep their sign in the top bit (not two's complement) */
  function s8(b,o){var v=b[o];return v&128?-(v&127):v}function s16(b,o){var v=u16(b,o);return v&32768?-(v&32767):v}function s32(b,o){var v=u32(b,o);return v>=2147483648?-(v-2147483648):v}
  function f32(b,o){var dv=new DataView(b.buffer,b.byteOffset+o,4);return dv.getFloat32(0,false)}
  /* bits, read off a run of bytes from its start */
  function Bits(b,o){this.b=b;this.p=o*8}
  Bits.prototype.get=function(n){var v=0,b=this.b,p=this.p;while(n>0){var byte=b[p>>3],off=p&7,take=Math.min(8-off,n);v=v*(1<<take)+((byte>>(8-off-take))&((1<<take)-1));p+=take;n-=take}this.p=p;return v};
  Bits.prototype.align=function(){this.p=(this.p+7)&~7};
  /* a GRIB2 message may hold several fields (NOAA puts each wind's two components in one): sections 4 to 7 repeat, 3 is kept */
  function msgs(buf){
    var b=buf instanceof Uint8Array?buf:new Uint8Array(buf),out=[],i=0;
    while(i+16<=b.length){
      if(!(b[i]===71&&b[i+1]===82&&b[i+2]===73&&b[i+3]===66)){i++;continue}
      var ed=b[i+7];if(ed!==2){i+=4;continue}
      var len=u32(b,i+8)*4294967296+u32(b,i+12),end=i+len;if(len<16||end>b.length)break;
      try{fields(b,i,end,out)}catch(e){}
      i=end}
    return out}
  function fields(b,i,end,out){
    var disc=b[i+6],time=0,grid=null,p4=null,bmp=null,s5=-1,j=i+16;
    while(j<end-4){var sl=u32(b,j),sn=b[j+4];if(sl<5||j+sl>end)break;
      if(sn===1){time=Date.UTC(u16(b,j+12),b[j+14]-1,b[j+15],b[j+16],b[j+17],b[j+18])}
      else if(sn===3){grid=u16(b,j+12)===0?{ni:u32(b,j+30),nj:u32(b,j+34),la1:s32(b,j+46)/1e6,lo1:s32(b,j+50)/1e6,la2:s32(b,j+55)/1e6,lo2:s32(b,j+59)/1e6,di:u32(b,j+63)/1e6,dj:u32(b,j+67)/1e6,scan:b[j+71]}:null}
      else if(sn===4){var t4=u16(b,j+7);p4={cat:b[j+9],par:b[j+10]};if(t4===0||t4===8){p4.fh=u32(b,j+18);p4.ltype=b[j+22];var sf=s8(b,j+23),sv=s32(b,j+24);p4.lev=sv*Math.pow(10,-sf)}}
      else if(sn===5){s5=j}else if(sn===6){var ind=b[j+5];if(ind===0)bmp={o:j+6};else if(ind===255)bmp=null}
      else if(sn===7){if(grid&&s5>=0&&p4){var m=field(b,grid,bmp,s5,j);if(m){m.disc=disc;m.time=time;for(var k in p4)m[k]=p4[k];out.push(m)}}}
      j+=sl}}
  function field(b,grid,bmp,s5,s7){
    var n=grid.ni*grid.nj,nd=u32(b,s5+5),t5=u16(b,s5+9),vals=unpack(b,s5,s7,t5,nd);if(!vals)return null;
    /* the values to the grid: through the bitmap, if there is one */
    var full=new Float32Array(n),k,p=0;
    if(bmp){var bits=new Bits(b,bmp.o);for(k=0;k<n;k++)full[k]=bits.get(1)?vals[p++]:NaN}else{for(k=0;k<n&&k<vals.length;k++)full[k]=vals[k];for(;k<n;k++)full[k]=NaN}
    /* to north-to-south rows, each west to east */
    var sc=grid.scan,ni=grid.ni,nj=grid.nj;
    if(sc&0xf0){var o2=new Float32Array(n),r,c;for(r=0;r<nj;r++)for(c=0;c<ni;c++){var src=(sc&32)?c*nj+r:r*ni+c,cc=(sc&128)?ni-1-c:c;if((sc&16)&&(r&1))cc=ni-1-cc;var rr=(sc&64)?nj-1-r:r;o2[rr*ni+cc]=full[src]}full=o2}
    return {ni:ni,nj:nj,la1:(sc&64)?grid.la2:grid.la1,lo1:(sc&128)?grid.lo2:grid.lo1,di:grid.di,dj:grid.dj,v:full}}
  function unpack(b,s5,s7,t5,nd){
    var R=f32(b,s5+11),E=s16(b,s5+15),D=s16(b,s5+17),nb=b[s5+19],e2=Math.pow(2,E),d10=Math.pow(10,-D),v=new Float32Array(nd),i,bits=new Bits(b,s7+5);
    if(t5===0){if(nb===0){for(i=0;i<nd;i++)v[i]=R*d10;return v}for(i=0;i<nd;i++)v[i]=(R+bits.get(nb)*e2)*d10;return v}
    if(t5!==2&&t5!==3)return null;
    var miss=b[s5+22],ng=u32(b,s5+31),wref=b[s5+35],wbits=b[s5+36],lref=u32(b,s5+37),linc=b[s5+41],llast=u32(b,s5+42),lbits=b[s5+46],ord=t5===3?b[s5+47]:0,nos=t5===3?b[s5+48]:0;
    var ival1=0,ival2=0,minsd=0;
    function sgn(n){var s=bits.get(1),x=bits.get(n*8-1);return s?-x:x}
    if(t5===3&&nos>0){ival1=sgn(nos);if(ord===2)ival2=sgn(nos);minsd=sgn(nos)}
    var ref=new Float64Array(ng),wid=new Int32Array(ng),glen=new Int32Array(ng),g;
    if(nb>0)for(g=0;g<ng;g++)ref[g]=bits.get(nb);bits.align();
    if(wbits>0)for(g=0;g<ng;g++)wid[g]=bits.get(wbits)+wref;else for(g=0;g<ng;g++)wid[g]=wref;bits.align();
    if(lbits>0)for(g=0;g<ng;g++)glen[g]=bits.get(lbits)*linc+lref;else for(g=0;g<ng;g++)glen[g]=lref;if(ng)glen[ng-1]=llast;bits.align();
    /* the packed values, group by group; with missing values managed, the top one or two values of a group's width mean "none" */
    var X=new Float64Array(nd),M=new Uint8Array(nd),k=0,allOnes=nb>0?Math.pow(2,nb)-1:0;
    for(g=0;g<ng&&k<nd;g++){var w=wid[g],L=glen[g],r0=ref[g];
      if(w===0){var mg=0;if(miss===1&&r0===allOnes)mg=1;else if(miss===2&&(r0===allOnes||r0===allOnes-1))mg=1;for(var q=0;q<L&&k<nd;q++){X[k]=r0;M[k]=mg;k++}}
      else{var top=Math.pow(2,w)-1;for(var q2=0;q2<L&&k<nd;q2++){var x=bits.get(w);if(miss===1&&x===top)M[k]=1;else if(miss===2&&(x===top||x===top-1))M[k]=1;else X[k]=x+r0;k++}}}
    /* spatial differencing undone, over the values that are there */
    if(t5===3&&ord>0){var idx=[];for(i=0;i<nd;i++)if(!M[i])idx.push(i);var nn=idx.length;
      if(ord===1){if(nn)X[idx[0]]=ival1;for(i=1;i<nn;i++)X[idx[i]]=X[idx[i]]+minsd+X[idx[i-1]]}
      else{if(nn)X[idx[0]]=ival1;if(nn>1)X[idx[1]]=ival2;for(i=2;i<nn;i++)X[idx[i]]=X[idx[i]]+minsd+2*X[idx[i-1]]-X[idx[i-2]]}}
    for(i=0;i<nd;i++)v[i]=M[i]?NaN:(R+X[i]*e2)*d10;
    return v}
  /* a value at a place, from a message's grid (bilinear; longitudes wrap) */
  function at(m,lat,lon){var y=(m.la1-lat)/m.dj,x=((lon-m.lo1)%360+360)%360/m.di,x0=Math.floor(x),y0=Math.floor(y),fx=x-x0,fy=y-y0;
    if(y0<0||y0>=m.nj-1){y0=Math.min(Math.max(y0,0),m.nj-1);fy=0}var ni=m.ni,x1=(x0+1)%ni;x0=x0%ni;
    function V(c,r){return m.v[r*ni+c]}var r1=Math.min(y0+1,m.nj-1),a=V(x0,y0),b2=V(x1,y0),c=V(x0,r1),d=V(x1,r1);
    if(isNaN(a)||isNaN(b2)||isNaN(c)||isNaN(d)){var best=[a,b2,c,d].filter(function(z){return !isNaN(z)});return best.length?best[0]:NaN}
    return (a*(1-fx)+b2*fx)*(1-fy)+(c*(1-fx)+d*fx)*fy}
  /* for the tests: every message's values as packed, in the file's own order, whatever its grid */
  function raw(buf){var b=new Uint8Array(buf),out=[],i=0;while(i+16<=b.length){if(!(b[i]===71&&b[i+1]===82&&b[i+2]===73&&b[i+3]===66)){i++;continue}var len=u32(b,i+8)*4294967296+u32(b,i+12),end=i+len,j=i+16,s5=-1,s7=-1;
    while(j<end-4){var sl=u32(b,j),sn=b[j+4];if(sl<5)break;if(sn===5)s5=j;if(sn===7)s7=j;j+=sl}out.push(s5>=0&&s7>=0?unpack(b,s5,s7,u16(b,s5+9),u32(b,s5+5)):null);i=end}return out}
  return {msgs:msgs,at:at,raw:raw}
})();
if(typeof module!=='undefined')module.exports=GRIB;
