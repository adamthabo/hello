/* ===== Beat (17 Nov, 17:54: "Make some drastic fun changes to the music ... I like the graphics and beat breakdown ... you get from
   the view of the metronome like that. But also love the ability to make wildest different good sounding noises for beautiful
   melodic timed sound making and experimenting").
   One circle is the bar: its sixteen sixteenths round it like a clock's minutes, a hand going round once a bar in the mode's colour.
   Inside, every instrument that is playing has a thin ring of its own with its hits on it, lit as the hand passes (the beat broken
   down: the band's players from what was read off their recordings, a mode's instruments from their loops). Outside, eight rings of
   pitch, the band's key (E, minor pentatonic) from low (inner) to high (outer): a touch puts a note there, at that sixteenth, in the
   sound chosen below; the bar plays it every time round; a touch on a note takes it away, and a finger drawn round leaves a melody.
   Five sounds, each a real instrument bent out of shape (rule 1 holds: struck, dying away, never loud; t_levels.js measures every
   step and pitch filled at once), "dice" for a melody made up in the sound chosen, and "clear". The notes are kept in the browser.
   (17 Nov, 19:44: "Yeah but it's not interactive") the inside answers a touch too: a tap on an instrument's ring takes it out of the
   beat or brings it back (the band's nine players in the African mode, a mode's instruments in the others; one taken out stays as a
   dim ring), and a tap in the middle brings in the next mode's beat on the bar; a touch with the music off turns it on; a note put
   down sounds on the next sixteenth, in time. */
var BEAT=(function(){
  var SN=[['glass','a glockenspiel an octave up, ringing into the echo'],['rubber','a marimba an octave down, through a squelching filter'],
      ['bells','tubular bells, low and long'],['boom','a fingered bass, dark and round'],['pluck','an electric guitar through a wah']],
    SCOL=['62,240,255','255,179,71','198,255,107','255,106,61','180,107,255'],
    /* what "dice" makes in each sound: its rings, how many notes, on which sixteenths it likes to land */
    DICE=[[3,7,9,2],[0,5,7,2],[2,7,5,4],[0,3,6,4],[1,6,8,2]],
    KEY=52,MAXN=48,N=[],cur=0,built=false,on=false,mode=null,lastCell='',fl=[],STB=null;
  function load(){try{var o=JSON.parse(localStorage.getItem('lc.beat')||'null');if(o&&o.n&&o.n.length!==undefined){N=o.n.filter(function(n){return n&&n.s>=0&&n.s<16&&n.p>=0&&n.p<8&&n.v>=0&&n.v<SN.length}).slice(0,MAXN);cur=o.c>=0&&o.c<SN.length?o.c:0}}catch(e){}}
  function save(){try{localStorage.setItem('lc.beat',JSON.stringify({n:N,c:cur}))}catch(e){}}
  function midiOf(p){return pent(p,KEY)}
  /* the circle: as big as the stage allows, in its middle */
  function geo(){var R=Math.max(70,Math.min(STG.w*.405,STG.h*.42));return {cx:STG.cx,cy:STG.cy,R:R}}
  function ang(s){return -Math.PI/2+s/16*TAU}
  function rp(p,R){return R*(.6+.4*p/7)}
  /* where the music is: the sixteenth (with its fraction) on the band's grid, the bar, how far round it the hand is */
  function clock(){var c=AU.c;if(!c||c.state!=='running'||!(AU.run||MIXON))return null;var s=(c.currentTime-(AU.lat||0)-AU.t0)/SD;if(s<0)return null;
    var bar=Math.floor(s/16);return {s:s,bar:bar,f:s/16-bar,q:Math.floor(s)%16}}
  /* the band's players, bar by bar: the strongest onset on each sixteenth of each of their four bars */
  function stems(){if(STB)return STB;STB=[];for(var i=0;i<NL;i++){var b=[[],[],[],[]],k;for(k=0;k<4;k++)for(var q=0;q<16;q++)b[k].push(0);
      ONS[i].forEach(function(o){var st=Math.floor(o[0]*64+.5)%64,br=st>>4,q2=st&15;if(o[1]>b[br][q2])b[br][q2]=o[1]});STB.push(b)}return STB}
  /* what plays in this bar: one ring each, inside the circle */
  function lanes(bar){var L=[],i,S=stems(),b4=((bar%4)+4)%4,af=MODE==='africa'||!MIXON;
    for(i=0;i<NL;i++){var on=ON[i]*SC[i]>0;if(af||on)L.push({col:BCOL[i],v:S[i][b4],on:on,k:'stem',i:i,n:BNAMES[i]})}
    if(!af&&MIX.rowsAll)MIX.rowsAll(bar).forEach(function(r){L.push({col:r.col,v:r.v,on:r.on,k:'row',j:r.j,n:r.n,cur:r.cur,loops:r.loops})});
    return L.slice(0,12)}
  function laneR(j,n,R){return R*(.16+(.33*(n>1?j/(n-1):.5)))}
  /* the next sixteenth on the band's grid (with its swing), and whether the band's sequencer has already given it out */
  function nextSlot(){var c=AU.c;if(!c||c.state!=='running'||!(AU.run||MIXON))return null;var k=Math.ceil((c.currentTime+.03-AU.t0)/SD);
    return {t:AU.t0+k*SD+((k&1)?SD*SWING:0),q:((k%16)+16)%16,out:AU.sq>=k}}
  function find(s,p){for(var i=0;i<N.length;i++)if(N[i].s===s&&N[i].p===p)return i;return -1}
  function cell(x,y){var g=geo(),dx=x-g.cx,dy=y-g.cy,r=Math.hypot(dx,dy);if(r<g.R*.53||r>g.R*1.14)return null;
    var a=Math.atan2(dy,dx)+Math.PI/2;if(a<0)a+=TAU;return {s:Math.round(a/TAU*16)%16,p:clamp(Math.round((r/g.R-.6)/.4*7),0,7)}}
  function note(n,when,vel){return MIX.bvoice(SN[n.v][0],midiOf(n.p),vel,(n.s/15-.5)*.7,when)}
  /* a touch on the rings: a note put there (heard at once), or one taken away; drawn along, the same for every cell it crosses */
  function apply(c,how){var k=c.s+':'+c.p;if(k===lastCell)return;lastCell=k;var i=find(c.s,c.p);
    if(how==='erase'){if(i>=0){N.splice(i,1);save()}return}
    if(i>=0||N.length>=MAXN)return;var n={s:c.s,p:c.p,v:cur};N.push(n);save();fl.push({s:c.s,p:c.p,t:performance.now(),c:SCOL[cur]});
    /* heard on the next sixteenth; if that is its own, the bar plays it (unless the bar has already given that sixteenth out) */
    var sl=nextSlot();if(!sl)note(n,0,.7);else if(sl.q!==n.s||sl.out)note(n,sl.t,.7)}
  /* the inside: an instrument's ring in or out of the beat with a tap; held, a mode's instrument goes to its next loop (its other,
     often busier beat) and one of the band's players plays alone (held again, the whole band back); the middle: the next mode's
     beat, on the bar */
  var tapF=[],press=null;
  function innerHit(x,y){var g=geo(),r=Math.hypot(x-g.cx,y-g.cy);if(r<g.R*.11)return {mid:1};if(r>=g.R*.53)return null;var k=clock(),Ls=lanes(k?k.bar:0),n=Ls.length;if(!n)return {none:1};
    var j=clamp(Math.round(n>1?(r/g.R-.16)/.33*(n-1):0),0,n-1);if(Math.abs(r-laneR(j,n,g.R))>g.R*.09)return {none:1};return {j:j,l:Ls[j]}}
  function midTap(){MIX.next();var d=MIX.dbg(),k2=d.pend||d.mode,m=MODES.filter(function(q){return q.k===k2})[0];say('next: '+(m?m.n:k2),'');tapF.push({j:-1,t:performance.now()})}
  function laneTap(h){var l=h.l;if(l.k==='stem'){setPlayer(l.i,!l.on,true);say(BNAMES[l.i]+(l.on?' out':' in')+' (hold its ring to hear it alone)',l.col)}
    else{if(l.on)MIX.stop(l.j);else MIX.launch(l.j,l.cur||0);say(l.n+(l.on?' out':' in')+' (hold its ring for its other beat)',l.col)}tapF.push({j:h.j,t:performance.now()})}
  function laneHold(h){var l=h.l,i;
    if(l.k==='stem'){var alone=true;for(i=0;i<NL;i++)if(i!==l.i&&ON[i])alone=false;
      if(alone&&ON[l.i]){for(i=0;i<NL;i++)setPlayer(i,1,true);say('the whole band','')}else{for(i=0;i<NL;i++)setPlayer(i,i===l.i?1:0,true);say(BNAMES[l.i]+' alone',l.col)}}
    else if(l.loops&&l.loops.length){var nx=((l.cur||0)+1)%l.loops.length;MIX.launch(l.j,nx);say(l.n+': '+l.loops[nx],l.col)}
    tapF.push({j:h.j,t:performance.now()});tapF.push({j:h.j,t:performance.now()+260})}
  function down(p){if(p.ghost)return;if(!AU.want)musicOn();mode=null;var h=innerHit(p.x,p.y);
    if(h){if(h.mid)midTap();else if(!h.none)press={h:h,id:p.id,x:p.x,y:p.y,t0:performance.now(),done:false};return}
    var c=cell(p.x,p.y);if(!c)return;mode=find(c.s,c.p)>=0?'erase':'draw';lastCell='';apply(c,mode);
    /* (17 Nov, 22:04) a finger kept on the rings plays: after a third of a second its pitch sounds on every sixteenth, in the sound
       chosen, for as long as it stays (two fingers at most), following the finger up and down the rings; not kept on the circle */
    if(Object.keys(ROLL).length<2)ROLL[p.id]={p:c.p,x:p.x,y:p.y,ax:p.x,ay:p.y,t0:performance.now(),on:false,v:cur,n:0,mine:mode==='draw'}}
  function move(p){if(p.ghost)return;if(press&&press.id===p.id&&Math.hypot(p.x-press.x,p.y-press.y)>16)press=null;
    /* (a finger still kept for a third of a second starts playing; one moving draws, as before; once playing, moving it changes
       the pitch it plays and draws nothing) */
    var rl=ROLL[p.id];if(rl){var c2=cell(p.x,p.y);rl.x=p.x;rl.y=p.y;if(rl.on){if(c2)rl.p=c2.p;return}
      if(Math.hypot(p.x-rl.ax,p.y-rl.ay)>12){rl.ax=p.x;rl.ay=p.y;rl.t0=performance.now();if(c2)rl.p=c2.p}}
    if(!mode)return;var c=cell(p.x,p.y);if(c)apply(c,mode)}
  function up(p){if(press&&p&&press.id===p.id){if(!press.done)laneTap(press.h);press=null}if(p)delete ROLL[p.id];mode=null;lastCell=''}
  var ROLL={};
  /* the bar's sixteenth: its notes, on time */
  /* (a chord is held together: each of n notes on one sixteenth a little softer, 1.5/√n of one alone, so eight at once stay under the band) */
  function chordK(n){return Math.min(1,1.5/Math.sqrt(Math.max(1,n)))}
  function seq(s,t){var q=((s%16)+16)%16,n=0,i,rk=[];for(var id in ROLL)if(ROLL[id].on)rk.push(ROLL[id]);for(i=0;i<N.length;i++)if(N[i].s===q)n++;n+=rk.length;if(!n)return;var v=.85*chordK(n);
    for(i=0;i<N.length;i++)if(N[i].s===q)note(N[i],t,v);rk.forEach(function(r){r.n++;note({s:q,p:r.p,v:r.v},t,v)})}
  /* dice: a melody made up in the sound chosen, a walk up and down its rings, more on the beats than off them */
  function dice(){var D=DICE[cur],lo=D[0],hi=D[1],want=D[2],grid=D[3],pp=Math.floor((lo+hi)/2),i;N=N.filter(function(n){return n.v!==cur});
    var steps=[];for(i=0;i<16;i+=grid/2)steps.push(i);steps.sort(function(a,b){return (b%grid===0?1:0)-(a%grid===0?1:0)||Math.random()-.5});
    steps=steps.slice(0,Math.min(want,MAXN-N.length)).sort(function(a,b){return a-b});
    steps.forEach(function(s){pp=clamp(pp+[-2,-1,-1,0,1,1,2][Math.floor(Math.random()*7)],lo,hi);if(find(s,pp)<0)N.push({s:s,p:pp,v:cur})});save();say(SN[cur][0]+': a melody made up',rgbCol(SCOL[cur]))}
  function clearAll(){N=[];save();say('cleared','')}
  function rgbCol(c){return 'rgb('+c+')'}
  function pick(i){cur=i;save();sync();say(SN[i][0]+': '+SN[i][1],rgbCol(SCOL[i]))}
  function sync(){SN.forEach(function(s,i){var b=$('b_'+s[0]);if(b)b.setAttribute('aria-pressed',i===cur?'true':'false')})}
  function build(){if(built)return;var f=$('foot'),t=$('tools'),r=document.createElement('div');if(!f)return;built=true;r.className='tools';r.id='btools';r.hidden=true;
    r.setAttribute('role','toolbar');r.setAttribute('aria-label','Beat: the sound of the notes you put on the circle');
    var mk=function(id,name,icon,fn,col){var b=document.createElement('button');b.type='button';b.className='tb';b.id=id;b.innerHTML='<svg viewBox="0 0 14 14" aria-hidden="true">'+icon+'</svg><span></span>';
      b.lastChild.textContent=name;if(col)b.firstChild.style.color=col;b.addEventListener('click',fn);r.appendChild(b);return b};
    SN.forEach(function(s,i){mk('b_'+s[0],s[0],'<circle cx="7" cy="7" r="3.4" fill="currentColor" stroke="none"/>',function(){pick(i)},rgbCol(SCOL[i]))});
    mk('b_dice','dice','<rect x="2.5" y="2.5" width="9" height="9" rx="2"/><circle cx="5.2" cy="5.2" r=".9" fill="currentColor"/><circle cx="8.8" cy="8.8" r=".9" fill="currentColor"/>',function(){dice()});
    mk('b_clear','clear','<path d="M3.5 3.5l7 7M10.5 3.5l-7 7"/>',function(){clearAll()});
    if(t&&t.nextSibling)f.insertBefore(r,t.nextSibling);else f.appendChild(r);sync()}
  function enter(){load();build();on=true;var r=$('btools');if(r)r.hidden=false;sync();SND.load(['glock','marimba','chimes','fbass','gtr']);layout()}
  function leave(){on=false;mode=null;var r=$('btools');if(r)r.hidden=true}
  /* a ring held for half a second */
  function tick(){var now=performance.now();if(press&&!press.done&&now-press.t0>450){press.done=true;laneHold(press.h)}
    for(var id in ROLL){var r=ROLL[id];if(!PTR(id)){delete ROLL[id];continue}if(!r.on&&now-r.t0>330){r.on=true;mode=null}}}
  function draw(t){
    blank();var c=OV,g=geo(),R=g.R,cx=g.cx,cy=g.cy,k=clock(),i,s,col=MODE==='africa'?'62,240,255':MIX.col(MODE),now=performance.now();
    c.save();c.lineCap='round';
    /* where notes go: a faint band round the circle, from its lowest pitch to its highest */
    c.fillStyle='rgba(234,249,255,.025)';c.beginPath();c.arc(cx,cy,R*1.04,0,TAU);c.arc(cx,cy,R*.56,0,TAU,true);c.fill();
    /* the rings of pitch, faint, and the sixteen sixteenths: the four beats longer and brighter, numbered */
    c.lineWidth=1;for(i=0;i<8;i++){c.strokeStyle='rgba(234,249,255,'+(i===0||i===7?.13:.06)+')';c.beginPath();c.arc(cx,cy,rp(i,R),0,TAU);c.stroke()}
    for(s=0;s<16;s++){var a=ang(s),bt=s%4===0,r0=bt?R*.53:R*.57,r1=bt?R*1.08:R*1.03;c.strokeStyle='rgba(234,249,255,'+(bt?.22:.08)+')';c.lineWidth=bt?1.2:1;
      c.beginPath();c.moveTo(cx+Math.cos(a)*r0,cy+Math.sin(a)*r0);c.lineTo(cx+Math.cos(a)*r1,cy+Math.sin(a)*r1);c.stroke()}
    c.font='500 10px '+MONO;c.textAlign='center';c.textBaseline='middle';c.fillStyle='rgba(234,249,255,.5)';
    for(s=0;s<4;s++){var a2=ang(s*4);c.fillText(String(s+1),cx+Math.cos(a2)*R*1.15,cy+Math.sin(a2)*R*1.15)}
    /* inside: every instrument, one ring each, its hits on it, lit as the hand passes; one taken out of the beat dim; a ring just
       tapped flares */
    tapF=tapF.filter(function(q){return now-q.t<700});
    {var L=lanes(k?k.bar:0),n=L.length,j;for(j=0;j<n;j++){var rr=laneR(j,n,R),lc=L[j].col,lo=L[j].on,tf=0;tapF.forEach(function(q){if(q.j===j)tf=Math.max(tf,1-(now-q.t)/700)});
        c.strokeStyle=hexA(lc,(lo?.16:.07)+.5*tf);c.lineWidth=1+2*tf;c.beginPath();c.arc(cx,cy,rr,0,TAU);c.stroke();
        for(s=0;s<16;s++){var v=L[j].v[s];if(!v)continue;var ago=k?((k.s%16)-s+16)%16:9,lit=lo&&ago<1.6?1-ago/1.6:0,a3=ang(s),dr=(lo?1.2+2.2*v:1+1.2*v)+3*lit;
          c.fillStyle=hexA(lc,lo?.35+.65*Math.max(lit,v*.5):.16);c.beginPath();c.arc(cx+Math.cos(a3)*rr,cy+Math.sin(a3)*rr,dr,0,TAU);c.fill()}}}
    /* the middle: the mode's name, a tap away from the next */
    {var mt=MODES.filter(function(q){return q.k===MODE})[0],mf=0;tapF.forEach(function(q){if(q.j===-1)mf=Math.max(mf,1-(now-q.t)/700)});
      c.strokeStyle='rgba('+col+','+(.28+.5*mf).toFixed(3)+')';c.lineWidth=1+mf;c.beginPath();c.arc(cx,cy,R*.1,0,TAU);c.stroke();
      c.font='500 8px '+MONO;c.fillStyle='rgba(234,249,255,.62)';c.fillText((mt?mt.n:MODE).toUpperCase(),cx,cy+R*.1+9)}
    /* outside: the notes put there, each in its sound's colour, flaring as they sound */
    for(i=0;i<N.length;i++){var nt=N[i],a4=ang(nt.s),r4=rp(nt.p,R),ago2=k?((k.s%16)-nt.s+16)%16:9,lt=ago2<1.4?1-ago2/1.4:0,nc=SCOL[nt.v];
      if(lt>0){c.fillStyle='rgba('+nc+','+(.25*lt).toFixed(3)+')';c.beginPath();c.arc(cx+Math.cos(a4)*r4,cy+Math.sin(a4)*r4,7+14*lt,0,TAU);c.fill()}
      c.fillStyle='rgba('+nc+','+(.75+.25*lt).toFixed(3)+')';c.beginPath();c.arc(cx+Math.cos(a4)*r4,cy+Math.sin(a4)*r4,4.2+2.5*lt,0,TAU);c.fill()}
    /* a finger playing: a ring round it that beats with the sixteenths, in its sound's colour */
    for(var rid in ROLL){var ro=ROLL[rid];if(!ro.on)continue;var rb=k?1-(k.s-Math.floor(k.s)):.5;c.strokeStyle='rgba('+SCOL[ro.v]+','+(.35+.5*rb).toFixed(3)+')';c.lineWidth=1.5;
      c.beginPath();c.arc(ro.x,ro.y,16+10*rb,0,TAU);c.stroke()}
    /* a note just put down: a ring going out from it */
    fl=fl.filter(function(f){return now-f.t<600});fl.forEach(function(f){var e=(now-f.t)/600,a5=ang(f.s),r5=rp(f.p,R);c.strokeStyle='rgba('+f.c+','+(.8*(1-e)).toFixed(3)+')';c.lineWidth=1.4;c.beginPath();c.arc(cx+Math.cos(a5)*r5,cy+Math.sin(a5)*r5,5+16*e,0,TAU);c.stroke()});
    /* the hand: once round a bar, in the mode's colour (still, at the top, while the music is off) */
    var ah=k?-Math.PI/2+k.f*TAU:-Math.PI/2;c.strokeStyle='rgba('+col+',.85)';c.lineWidth=1.6;c.beginPath();c.moveTo(cx+Math.cos(ah)*R*.1,cy+Math.sin(ah)*R*.1);c.lineTo(cx+Math.cos(ah)*R*1.1,cy+Math.sin(ah)*R*1.1);c.stroke();
    c.fillStyle='rgba('+col+',.9)';c.beginPath();c.arc(cx,cy,3,0,TAU);c.fill();c.textBaseline='middle';
    if(k&&!reduce){var pb=1-(k.s%4)/4;c.strokeStyle='rgba('+col+','+(.35*pb*pb).toFixed(3)+')';c.lineWidth=1;c.beginPath();c.arc(cx,cy,R*1.1+6*pb,0,TAU);c.stroke()}
    c.restore()}
  function hexA(h,a){if(h.charAt(0)!=='#')return 'rgba('+h+','+a.toFixed(3)+')';var n=parseInt(h.slice(1),16);return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a.toFixed(3)+')'}
  /* no words over it but what a tap asks for: a sound's name when it is chosen */
  function hud(){return ''}
  return {enter:enter,leave:leave,tick:tick,draw:draw,hud:hud,down:down,move:move,up:up,seq:seq,resize:function(){},
    dbg:function(){var k=clock(),g=geo();return {on:on,rolls:Object.keys(ROLL).map(function(id){var r=ROLL[id];return {p:r.p,on:r.on,n:r.n}}),notes:N.map(function(n){return [n.s,n.p,n.v]}),cur:cur,sound:SN[cur][0],clock:k?{bar:k.bar,q:k.q,f:+k.f.toFixed(3)}:null,
      geo:{cx:g.cx,cy:g.cy,R:g.R},lanes:k?lanes(k.bar).length:0,lane:lanes(k?k.bar:0).map(function(l){return {n:l.n,on:l.on,k:l.k,cur:l.cur}}),max:MAXN,sounds:SN.map(function(s){return s[0]})}},
    /* for the tests: where an instrument's ring is (its top) */
    ringAt:function(j){var g=geo(),k=clock(),n=lanes(k?k.bar:0).length;return {x:g.cx,y:g.cy-laneR(j,n,g.R),n:n}},
    /* for the tests: where a note sits on the screen, and the notes set at once */
    at:function(s,p){var g=geo(),a=ang(s),r=rp(p,g.R);return {x:g.cx+Math.cos(a)*r,y:g.cy+Math.sin(a)*r}},
    set:function(a){N=(a||[]).map(function(q){return {s:q[0],p:q[1],v:q[2]}});save()},
    sounds:SN,midi:midiOf,chord:chordK}
})();
