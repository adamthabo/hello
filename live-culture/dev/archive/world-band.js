/* ---------- BAND: the band itself, drawn as it plays. Nine rings, one per player, the low drum at the centre and the electric
   guitar outermost; every bead on a ring is a real note of that player's part, placed where it falls in the four bars; the
   hand sweeps round once per four bars and lights each note as it sounds. The nine dots below bring players in and out.
   The whole face is also a drum: touch near the centre for a low skin, the middle for a clay pot, the rim for a shaker,
   as many fingers as you like, played live. Your strokes are left on the face for a moment so you can see where they fell. ---------- */
var BANDW=(function(){
  var cx=0,cy=0,r0=20,r1=100,marks=[],beads=null,last=0;
  function geo(){cx=STG.cx;cy=STG.cy;var m=Math.max(60,Math.min(STG.w*.5-18,STG.h*.5-16));r1=m;r0=Math.max(22,m*.2)}
  function ringR(i){return lerp(r0,r1,(i+.5)/NL)}
  function enter(){geo()}
  function resize(){geo()}
  function down(p){
    var dx=p.x-cx,dy=p.y-cy,d=Math.hypot(dx,dy);if(d>r1+34)return;var z=d<r0+(r1-r0)*.3?0:(d<r0+(r1-r0)*.68?1:2),pan=clamp(dx/Math.max(1,r1)*.7,-1,1),a=Math.atan2(dy,dx);
    if(!p.ghost){if(z===0)hit('thump',.95,pan*.4,1);else if(z===1)hit('tok',.85,pan,[1,1.189,1.498,.8909][Math.floor(((a+Math.PI)/TAU)*4)%4]);else{hit('tick',.9,pan,1+.25*Math.sin(a*2));hit('tok',.22,pan,2.4)}}
    if(marks.length>40)marks.shift();marks.push({a:BD.ph*TAU-Math.PI/2,r:clamp(d,8,r1+20),l:1,z:z,x:p.x,y:p.y,g:p.ghost})}
  function tick(dt){for(var i=marks.length-1;i>=0;i--){marks[i].l-=dt/(STEML*.98);if(marks[i].l<=0)marks.splice(i,1)}}
  function draw(t){
    blank();var c=OV,i,k,ph=BD.ph,ha=ph*TAU-Math.PI/2;
    c.lineCap='round';
    /* sixteen beats round the rim; the four bars marked longer */
    c.strokeStyle='rgba(234,249,255,.3)';c.lineWidth=1;c.beginPath();
    for(i=0;i<16;i++){var a=i/16*TAU-Math.PI/2,l=i%4===0?10:5;c.moveTo(cx+Math.cos(a)*(r1+6),cy+Math.sin(a)*(r1+6));c.lineTo(cx+Math.cos(a)*(r1+6+l),cy+Math.sin(a)*(r1+6+l))}c.stroke();
    c.globalCompositeOperation='lighter';
    /* the heart: the bass and the low drum */
    var hb=r0*.62*(1+.22*E[5]*G[5]+.35*HIT[0]*G[0]),gr=c.createRadialGradient(cx,cy,0,cx,cy,hb*1.6);gr.addColorStop(0,'rgba(62,240,255,'+(.2+.35*E[5]*G[5]+.3*HIT[0]*G[0]).toFixed(3)+')');gr.addColorStop(1,'rgba(62,240,255,0)');
    c.fillStyle=gr;c.beginPath();c.arc(cx,cy,hb*1.6,0,TAU);c.fill();
    for(i=0;i<NL;i++){var R=ringR(i),g=G[i],col=BCOL[i],on=ONS[i];
      c.strokeStyle=col;c.globalAlpha=.07+.2*g+.5*E[i]*g;c.lineWidth=1+2.2*E[i]*g;c.beginPath();c.arc(cx,cy,R,0,TAU);c.stroke();
      /* this player's notes */
      c.fillStyle=col;c.globalAlpha=.16+.72*g;c.beginPath();
      for(k=0;k<on.length;k++){var an=on[k][0]*TAU-Math.PI/2,s=1.1+on[k][1]*2.3,x=cx+Math.cos(an)*R,y=cy+Math.sin(an)*R;c.moveTo(x+s,y);c.arc(x,y,s,0,TAU)}c.fill();
      /* the ones just struck */
      if(g>.02){c.globalAlpha=g;for(k=0;k<on.length;k++){var d=ph-on[k][0];if(d<0)d+=1;if(d<.035){var f=1-d/.035,an2=on[k][0]*TAU-Math.PI/2,x2=cx+Math.cos(an2)*R,y2=cy+Math.sin(an2)*R,s2=(2+on[k][1]*5)*(1+f);
          c.fillStyle='#ffffff';c.globalAlpha=f*g;c.beginPath();c.arc(x2,y2,s2*.5,0,TAU);c.fill();c.fillStyle=col;c.globalAlpha=f*.4*g;c.beginPath();c.arc(x2,y2,s2*1.8,0,TAU);c.fill()}}}}
    /* the hand */
    c.globalAlpha=1;var lg=c.createLinearGradient(cx,cy,cx+Math.cos(ha)*(r1+14),cy+Math.sin(ha)*(r1+14));lg.addColorStop(0,'rgba(234,249,255,0)');lg.addColorStop(.25,'rgba(234,249,255,.5)');lg.addColorStop(1,'rgba(234,249,255,.95)');
    c.strokeStyle=lg;c.lineWidth=1.4;c.beginPath();c.moveTo(cx+Math.cos(ha)*r0*.4,cy+Math.sin(ha)*r0*.4);c.lineTo(cx+Math.cos(ha)*(r1+14),cy+Math.sin(ha)*(r1+14));c.stroke();
    /* your own strokes, where they fell in the bar */
    for(i=0;i<marks.length;i++){var m=marks[i],mx=cx+Math.cos(m.a)*m.r,my=cy+Math.sin(m.a)*m.r,fresh=clamp((m.l-.9)*10,0,1);
      c.globalAlpha=m.l*(m.g?.35:.9);c.strokeStyle='#ffffff';c.lineWidth=1.3;c.beginPath();c.arc(mx,my,4+m.z*1.5,0,TAU);c.stroke();
      if(fresh>0){c.globalAlpha=fresh*.5;c.fillStyle='#ffffff';c.beginPath();c.arc(m.x,m.y,10+(1-fresh)*26,0,TAU);c.fill()}}
    c.globalAlpha=1;c.globalCompositeOperation='source-over'}
  function hud(){var n=0,nm=[];for(var i=0;i<NL;i++)if(ON[i]){n++;nm.push(BNAMES[i])}
    var bar=Math.floor(BD.ph*4)+1,beat=Math.floor(BD.ph*16)%4+1;
    return n+' of '+NL+' players · 104 beats a minute · bar '+bar+' beat '+beat+(n&&n<4?'\n'+nm.join(', '):'')}
  function ghost(t){var u=(t*.9)%4,k=Math.floor(u),f=u-k;if(f>.18)return [null];var z=[.12,.5,.5,.86][k],a=[0,2.2,.6,4.1][k];
    return [{x:cx+Math.cos(a)*lerp(r0*.3,r1,z),y:cy+Math.sin(a)*lerp(r0*.3,r1,z)}]}
  return {enter:enter,resize:resize,down:down,tick:tick,draw:draw,hud:hud,ghost:ghost}
})();
