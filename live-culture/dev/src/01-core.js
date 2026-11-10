/* ---------- small things everything else leans on ---------- */
var $=function(id){return document.getElementById(id)};
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
var COARSE=matchMedia('(pointer:coarse)').matches;
var TAU=Math.PI*2;
function clamp(v,a,b){return v<a?a:v>b?b:v}
function lerp(a,b,k){return a+(b-a)*k}
function smooth(k){k=clamp(k,0,1);return k*k*(3-2*k)}
function hexRgb(h){var n=parseInt(h.slice(1),16);return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]}
function rgba(h,a){var n=parseInt(h.slice(1),16);return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')'}
function b64bytes(s){var b=atob(s),a=new Uint8Array(b.length);for(var i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a}

/* the band's key: E minor pentatonic. A degree counts up the scale from a base note */
var PENT=[0,3,5,7,10],PCOL=['#3ef0ff','#7dffb2','#ffb347','#ff2d8a','#b46bff'];
function pent(d,base){d=Math.round(d);var o=Math.floor(d/5);return (base||40)+12*o+PENT[d-o*5]}
function mtof(m){return 440*Math.pow(2,(m-69)/12)}
/* the colour of a note, by its name */
function noteCol(m){var pc=((m-40)%12+12)%12,i=PENT.indexOf(pc);return PCOL[i<0?0:i]}

/* the screen. STG is the part of it the chrome leaves free: worlds draw everywhere but compose inside it */
var VW=1,VH=1,DPR=1,STG={x0:0,y0:0,x1:1,y1:1,w:1,h:1,cx:.5,cy:.5},FT=0,QL=0;
function layout(){
  VW=Math.max(1,innerWidth);VH=Math.max(1,innerHeight);DPR=Math.min(window.devicePixelRatio||1,[2,1.5,1.25][QL]);
  var tb=$('data').getBoundingClientRect(),fb=$('foot').getBoundingClientRect();
  var y0=Math.round(Math.max(tb.top+34,72)),y1=Math.round(fb.top>0?fb.top-10:VH-80);
  if(y1-y0<120){y0=Math.round(VH*.18);y1=Math.round(VH*.8)}
  STG.x0=0;STG.x1=VW;STG.y0=y0;STG.y1=y1;STG.w=VW;STG.h=y1-y0;STG.cx=VW/2;STG.cy=(y0+y1)/2;
  try{document.documentElement.style.setProperty('--foot',Math.round(fb.top>0?VH-fb.top:112)+'px')}catch(e){}}

/* how hard the device is working: the page watches its own heartbeat and thins itself (fewer organisms, coarser water, a less
   fine canvas) instead of stuttering. It judges nothing until the visitor has touched the page (until then some browsers hold
   a framed page to half speed). A step down is a trial: if it buys no speed, the pace is being set by the system (a phone
   saving power), not by this page, and the quality is given back. A level lost to a passing slow patch is tried again later.
   Returns true when the level changed. */
var GOV={ema:16,slow:0,fast:0,n:0,at:0,ups:0,rose:0,trial:null,pace:0,woke:false,long:0};
['pointerdown','keydown'].forEach(function(ev){addEventListener(ev,function(){GOV.woke=true},true)});
function govern(t,dtms){
  /* a stall of a second or more (another tab, a program being built) says nothing about the pace */
  GOV.n++;if(GOV.n<45||dtms>1000||document.hidden)return false;
  if(!GOV.woke){GOV.ema=16;GOV.slow=GOV.fast=0;GOV.at=t;return false}
  /* one or two long frames are a hiccup; a run of them is the pace */
  if(dtms>250){if(++GOV.long<4)return false}else GOV.long=0;
  /* the pace, smoothed over about a third of a second whatever the frame rate; slow and fast are counted in time, not frames */
  GOV.ema+=(dtms-GOV.ema)*Math.min(.5,dtms/330);
  if(GOV.trial){var tr=GOV.trial;
    /* the trial: the pace over two seconds, once the change itself has settled */
    if(t-tr.t>700){tr.sum+=dtms;tr.n++}
    if(t-tr.t<2700||tr.n<4)return false;
    var now=tr.sum/tr.n;GOV.trial=null;GOV.ema=now;GOV.slow=GOV.fast=0;GOV.at=t;
    if(now>tr.was*.85){GOV.pace=now;QL=tr.from;return true}
    return false}
  /* below the level it started at, an ordinary smooth pace is enough to try going back */
  var slow=GOV.pace?Math.max(21,GOV.pace*1.4):21,low=QL>0;
  if(GOV.ema>slow){GOV.slow+=dtms;GOV.fast=0}else if(GOV.ema<18.5){GOV.fast+=dtms;GOV.slow=0}else{GOV.slow=0;GOV.fast=0}
  /* a level that had to be given up again straight after it was regained is not tried a third time (in this world) */
  if(GOV.slow>800&&QL<2){if(GOV.rose&&t-GOV.rose<12000)GOV.ups=2;GOV.trial={from:QL,was:GOV.ema,t:t,sum:0,n:0};QL++;GOV.slow=0;return true}
  if(low&&GOV.fast>10000&&GOV.ups<2&&t-GOV.at>15000){QL--;GOV.ups++;GOV.fast=0;GOV.at=GOV.rose=t;return true}
  return false}
/* another world is another load: the count of regained levels starts again, and nothing is judged while it settles in */
function governWorld(){GOV.ups=0;GOV.slow=GOV.fast=0;GOV.trial=null;GOV.at=performance.now()}

/* 4x4 matrices, column-major, just enough for a camera */
var M4={
  persp:function(fov,asp,n,f){var t=1/Math.tan(fov/2),o=new Float32Array(16);o[0]=t/asp;o[5]=t;o[10]=(f+n)/(n-f);o[11]=-1;o[14]=2*f*n/(n-f);return o},
  mul:function(a,b){var o=new Float32Array(16);for(var c=0;c<4;c++)for(var r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o},
  /* a camera looking at the origin from a direction (yaw about z, pitch above the xy plane) and a distance */
  orbit:function(yaw,pitch,dist){
    var cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),
      f=[-cp*cy,-cp*sy,-sp],r=[-sy,cy,0],u=[-sp*cy,-sp*sy,cp],e=[cp*cy*dist,cp*sy*dist,sp*dist],o=new Float32Array(16);
    o[0]=r[0];o[4]=r[1];o[8]=r[2];o[12]=-(r[0]*e[0]+r[1]*e[1]+r[2]*e[2]);
    o[1]=u[0];o[5]=u[1];o[9]=u[2];o[13]=-(u[0]*e[0]+u[1]*e[1]+u[2]*e[2]);
    o[2]=-f[0];o[6]=-f[1];o[10]=-f[2];o[14]=(f[0]*e[0]+f[1]*e[1]+f[2]*e[2]);
    o[15]=1;return o},
  /* a point through a matrix to the screen (CSS pixels); the third number is how far in front of the eye it is (negative: behind) */
  proj:function(m,x,y,z,out){var w=m[3]*x+m[7]*y+m[11]*z+m[15];out=out||[0,0,0];
    out[0]=((m[0]*x+m[4]*y+m[8]*z+m[12])/w*.5+.5)*VW;out[1]=(.5-(m[1]*x+m[5]*y+m[9]*z+m[13])/w*.5)*VH;out[2]=w;return out}
};
