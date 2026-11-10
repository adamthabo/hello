/* ---------- the band: nine players. What each one plays (every onset, and its loudness through the four bars) was read off the
   recordings, so every world can move on the notes themselves, with the sound on or off.
   ON is who is in the band. SC is how the world you are in arranges them (a world can ask some players to sit out); a player
   is heard when both say so. ---------- */
var NL=9,STEML=9.23077097505669,STEMP=0.3,SD=STEML/64,SWING=0.16,ENVN=512,
  STEMF=[0,1,2,3,4,5,6,7,9],
  SG=[0.2614,0.276,0.2251,0.2094,0.1779,0.132,0.075,0.087,0.09],
  BNAMES=['dundun and bell','shekere','djembe','talking drum','agogo','upright bass','balafon','kora','electric guitar'],
  BCOL=['#ffb347','#ffd79a','#ff7a2f','#ff2d8a','#c6ff6b','#3ef0ff','#7dffb2','#b46bff','#effcff'],
  /* the order the band arrives in when left to itself: rhythm first, the electric guitar last */
  BUILD=[0,5,1,3,2,4,6,7,8];
var ON=[1,0,0,0,0,1,0,0,0],SC=[1,1,1,1,1,1,1,1,1],G=new Float32Array(NL),E=new Float32Array(NL),HIT=new Float32Array(NL),KC=new Float32Array(NL),OI=new Int32Array(NL),
  TAUH=[.2,.085,.26,.3,.17,.3,.3,.3,.24],ENV=[],ONS=[],
  BD={ph:0,lt:0,step:-1,abs:0,hits:[],flow:[],auto:false,manual:false,skip:0,started:false,loops:0,energy:0};
(function(){var d=BAND_DATA,i;for(i=0;i<NL;i++){ENV.push(b64bytes(d.env[i]));ONS.push(d.ons[i]);G[i]=ON[i]}})();
function bandGain(i){return ON[i]*SC[i]*SG[i]}
function bandApply(i,slow){if(AU.c&&AU.L[i]){var n=AU.c.currentTime,v=bandGain(i);AU.L[i].gain.cancelScheduledValues(n);AU.L[i].gain.setTargetAtTime(v,n,slow?.35:(v>0?.03:.12))}}
function setPlayer(i,on,quiet){
  on=on?1:0;if(ON[i]===on)return;ON[i]=on;bandApply(i);dotSync(i);
  if(!quiet)say(BNAMES[i]+(on?' in':' out'),BCOL[i])}
/* a world's arrangement of the band: crossfaded over a moment */
function sceneSet(sc){for(var i=0;i<NL;i++){SC[i]=sc?sc[i]:1;bandApply(i,true)}}
/* an accent lights things; a lighter note only leans on them. hits: accents of players who are heard; flow: every onset of theirs */
function fireHit(i,s){
  if(reduce)return;var g=ON[i]*SC[i];
  if(g>0)BD.flow.push({i:i,s:s*g});
  if(s<.62){if(s*.55>HIT[i])HIT[i]=s*.55;return}
  if(s>HIT[i])HIT[i]=s;KC[i]=(KC[i]+1)%997;if(g>0)BD.hits.push({i:i,s:s*g})}
function bandTick(dt){
  var lt=loopT(),ph=lt/STEML;ph-=Math.floor(ph);var prev=BD.ph,jump=Math.abs(lt-BD.lt)>.6||lt<BD.lt-.02;BD.lt=lt;BD.ph=ph;BD.hits.length=0;BD.flow.length=0;
  var wrapped=prev-ph>.5,k=Math.floor(ph*ENVN)%ENVN,i,en=0;
  for(i=0;i<NL;i++){
    var on=ON[i]*SC[i];G[i]+=(on-G[i])*(1-Math.exp(-dt/(on>G[i]?.12:.25)));if(Math.abs(on-G[i])<.004)G[i]=on;
    var e=ENV[i][k]/255;if(reduce)e*=.3;E[i]+=(e-E[i])*(1-Math.exp(-dt/(e>E[i]?.02:.14)));en+=E[i]*G[i];
    HIT[i]*=Math.exp(-dt/TAUH[i]);
    var o=ONS[i];
    if(jump){var a=0;while(a<o.length&&o[a][0]<=ph)a++;OI[i]=a;continue}
    if(wrapped){while(OI[i]<o.length){fireHit(i,o[OI[i]][1]);OI[i]++}OI[i]=0}
    while(OI[i]<o.length&&o[OI[i]][0]<=ph){fireHit(i,o[OI[i]][1]);OI[i]++}
  }
  BD.energy=en;
  if(!jump&&wrapped)BD.loops++;
  /* no step is ever missed, however slow the frames */
  var ab=Math.floor(lt/SD);if(jump||ab-BD.abs>16)BD.abs=ab;
  while(BD.abs<ab){BD.abs++;BD.step=((BD.abs%64)+64)%64;onStep(BD.step,BD.abs)}
}
function onStep(st,ab){
  if(CUR&&CUR.step){try{CUR.step(st,ab)}catch(e){}}
  /* left to itself the band builds: one more player every two bars, the guitar last */
  if(BD.auto&&AU.live&&st%32===0){
    if(BD.skip>0){BD.skip--;return}
    /* the players this world uses come first; the rest arrive behind them, unheard until a world wants them */
    var nx=-1,k;for(k=0;k<BUILD.length;k++)if(!ON[BUILD[k]]&&SC[BUILD[k]]>0){nx=BUILD[k];break}
    if(nx<0)for(k=0;k<BUILD.length;k++)if(!ON[BUILD[k]]){nx=BUILD[k];break}
    if(nx<0)BD.auto=false;else setPlayer(nx,true,true)}
}
