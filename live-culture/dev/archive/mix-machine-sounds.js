/* ---------- the mixer's sounds (13 Nov: "a music dj mixer page with pitch control hundreds of other samples"; that evening he asked for
   fewer options, so the mixer now plays twenty of these loops, and only the kits and instruments they use are ever made). Every one is made here
   from plain arithmetic, like the toys' voices: struck once and dying away, nothing blown, bowed or held, none of them a tone from an
   oscillator, no harp. Sixteen kits of sixteen drums each (256: kicks, snares, claps, rims, hats, toms, congas, bongos, shakers,
   tambourines, cowbells, wood, bells, snaps, each kit a different room, size and grain), and sixteen struck or plucked instruments
   (marimba, vibraphone, glockenspiel, xylophone, kalimba, steel pan, piano, electric piano, celesta, gamelan, handpan, music box,
   upright bass, clavinet, glass, bells), each recorded here at a few notes and played at the rest by speed, as the toys are.
   Nothing is made until it is wanted: a kit when it is chosen or a loop needs it, an instrument the same.
   The band's scale is E minor pentatonic (E G A B D), so every melodic loop is in it. ---------- */
var MIXS=(function(){
  var SR=44100;
  /* a seeded random, so a kit is the same kit every time */
  function rng(seed){var s=seed>>>0||1;return function(){s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296}}
  function fin(o,fade,peak){var n=o.length,i,pk=0,f=Math.floor(SR*(fade||.02));for(i=0;i<f&&i<n;i++)o[n-1-i]*=i/f;for(i=0;i<n;i++){var a=Math.abs(o[i]);if(a>pk)pk=a}
    if(pk>0){var k=(peak||1)/pk;for(i=0;i<n;i++)o[i]*=k}return o}
  /* dying sine waves: [frequency, level, how fast it dies], by a two-term recurrence */
  function modes(o,parts,att,from){var n=o.length,k,i;for(k=0;k<parts.length;k++){var w=TAU*parts[k][0]/SR;if(w>=Math.PI*.92||w<=0)continue;var r=Math.exp(-parts[k][2]/SR),c=2*r*Math.cos(w),r2=r*r,y1=0,y0=parts[k][1]*r*Math.sin(w),y;
      var s0=from||0;o[s0+1]+=y0;for(i=s0+2;i<n;i++){y=c*y0-r2*y1;y1=y0;y0=y;o[i]+=y}}
    var an=Math.max(1,Math.floor(SR*(att||.001)));for(i=0;i<an&&i<n;i++)o[i]*=i/an;return o}
  /* a pitched membrane or a kick: a sine whose pitch falls, worked by adding up its phase */
  function sweep(o,f0,f1,fr,dec,lvl){var n=o.length,ph=0,i;for(i=0;i<n;i++){var t=i/SR,f=f1+(f0-f1)*Math.exp(-t*fr);ph+=TAU*f/SR;o[i]+=Math.sin(ph)*Math.exp(-t*dec)*(lvl||1)}return o}
  /* hiss, shaped: through a two-pole band (centre, width), dying at dec, starting over att */
  function hiss(o,rand,cf,q,dec,lvl,att,from){var n=o.length,lp=0,bp=0,k=2*Math.sin(Math.PI*Math.min(cf,SR*.22)/SR),i,s0=from||0;
    for(i=s0;i<n;i++){var t=(i-s0)/SR,hp=(rand()*2-1)-lp-q*bp;bp+=k*hp;lp+=k*bp;o[i]+=bp*Math.exp(-t*dec)*(lvl||1)*(att?Math.min(1,t/att):1)}return o}
  function hipass(o,fc){var a=Math.exp(-TAU*fc/SR),y=0,x1=0,i;for(i=0;i<o.length;i++){var x=o[i];y=a*(y+x-x1);x1=x;o[i]=y}return o}
  function lopass(o,fc){var a=1-Math.exp(-TAU*fc/SR),y=0,i;for(i=0;i<o.length;i++){y+=a*(o[i]-y);o[i]=y}return o}
  function drive(o,k){if(k<=0)return o;for(var i=0;i<o.length;i++)o[i]=Math.tanh(o[i]*(1+k))/Math.tanh(1+k);return o}
  function buf(d){return new Float32Array(Math.max(8,Math.floor(SR*d)))}
  /* the sixteen drums of a kit, each from its own few numbers */
  var V={
    kick:function(p,r){var o=buf(p.d*1.1);sweep(o,p.f0,p.f1,p.fr,p.dec,1);hiss(o,r,3200,1,180,.25*p.click);return drive(fin(o,.02),p.drv)},
    snare:function(p,r){var o=buf(p.d);sweep(o,p.f*1.6,p.f,40,p.tdec,.6);modes(o,[[p.f*1.48,.3,p.tdec*1.4]],.001);hiss(o,r,p.nf,.6,p.ndec,1.1,.001);return fin(o,.02)},
    clap:function(p,r){var o=buf(p.d),k;for(k=0;k<4;k++)hiss(o,r,p.nf,.9,k<3?160:p.ndec,k<3?.9:1,0,Math.floor(SR*k*p.sp));return fin(hipass(o,500),.02)},
    rim:function(p,r){var o=buf(.16);modes(o,[[p.f,1,60],[p.f*2.3,.5,90],[p.f*3.7,.3,140]],.0004);hiss(o,r,p.f*2.5,1,300,.4);return fin(o,.01)},
    hat:function(p,r){var o=buf(p.d),n=o.length,ph=[0,0,0,0,0,0],rt=[1,1.483,1.799,2.546,2.63,3.897],i,k;
      for(i=0;i<n;i++){var t=i/SR,s=0;for(k=0;k<6;k++){ph[k]+=TAU*p.f*rt[k]/SR;s+=Math.sin(ph[k])>0?1:-1}o[i]=(s/6*.6+(r()*2-1)*.5)*Math.exp(-t*p.dec)}
      return fin(hipass(hipass(o,p.hp),p.hp),.01)},
    tom:function(p,r){var o=buf(p.d);sweep(o,p.f*1.5,p.f,22,p.dec,1);modes(o,[[p.f*1.6,.25,p.dec*1.6]],.001);hiss(o,r,1800,1,90,.12);return fin(o,.02)},
    conga:function(p,r){var o=buf(p.d);modes(o,[[p.f,1,p.dec],[p.f*1.59,.45,p.dec*1.7],[p.f*2.14,.25,p.dec*2.4],[p.f*2.65,.12,p.dec*3]],.0008);hiss(o,r,p.f*6,1,250,p.slap);return fin(o,.02)},
    shaker:function(p,r){var o=buf(p.d);hiss(o,r,p.cf,.5,p.dec,1,p.att);return fin(o,.015)},
    tamb:function(p,r){var o=buf(p.d);hiss(o,r,7000,.4,p.dec,.8,.002);modes(o,[[p.f,.25,p.dec*.6],[p.f*1.34,.2,p.dec*.7],[p.f*1.88,.15,p.dec*.8]],.001);return fin(hipass(o,2500),.02)},
    cowbell:function(p,r){var o=buf(p.d),n=o.length,a=0,b=0,i;for(i=0;i<n;i++){var t=i/SR;a+=TAU*p.f/SR;b+=TAU*p.f*1.48/SR;o[i]=((Math.sin(a)>0?1:-1)+(Math.sin(b)>0?1:-1)*.8)*Math.exp(-t*p.dec)*Math.min(1,t/.0015)}
      return fin(lopass(hipass(o,p.f*.8),p.f*5),.02)},
    wood:function(p,r){var o=buf(.25);modes(o,[[p.f,1,p.dec],[p.f*2.76,.35,p.dec*2],[p.f*5.4,.12,p.dec*3]],.0005);return fin(o,.01)},
    bell:function(p,r){var o=buf(p.d);modes(o,[[p.f,1,p.dec],[p.f*2.756,.55,p.dec*1.3],[p.f*5.404,.3,p.dec*1.9],[p.f*8.933,.12,p.dec*2.6]],.0008);return fin(o,.03)},
    snap:function(p,r){var o=buf(.14);hiss(o,r,p.cf,.7,70,1,.0008);modes(o,[[p.cf*.5,.3,120]],.0005);return fin(o,.01)},
    pot:function(p,r){var o=buf(p.d),k,parts=[];for(k=0;k<5;k++)parts.push([p.f*(1+k*(.9+r()*1.3)),.8/(k+1),p.dec*(1+k*.5)]);modes(o,parts,.0008);hiss(o,r,p.f*4,1,200,.2);return fin(o,.03)}
  };
  /* the kits: each a character (how deep, how long, how bright, how rough) that sets the numbers of all its sixteen */
  var KITS=[['808 room',.5,1.1,.6,.2],['dust',.55,.7,.4,.6],['hand drums',.65,.9,.5,0],['kitchen',.8,.6,.8,.1],['wood',.75,.5,.6,0],['metal',.7,.8,1,.2],
    ['glass',.9,.9,1,0],['paper',.7,.35,.7,.1],['deep',.3,1.3,.3,.3],['tight',.6,.35,.9,.1],['lo-fi',.45,.6,.3,.9],['clay',.6,.7,.45,0],
    ['rain',.8,.5,.75,0],['ice',.95,.7,1,0],['thunder',.25,1.4,.35,.6],['toy',1,.4,.9,0]];
  var ROLES=['kick','snare','clap','rim','hat','open hat','low tom','high tom','conga','bongo','shaker','tamb','cowbell','wood','bell','snap'];
  function kitParams(k){var K=KITS[k],hi=K[1],len=K[2],br=K[3],rough=K[4],r=rng(7919*(k+1)),j=function(a){return 1+(r()-.5)*a};
    var P=[
      ['kick',{f0:(130+90*hi)*j(.2),f1:(38+22*hi)*j(.2),fr:22+30*br,dec:(6/len)*j(.3),d:.5*len+.1,click:.4+br*.6,drv:rough*2}],
      ['snare',{f:(150+120*hi)*j(.2),tdec:28/len,nf:1800+3200*br,ndec:(14+10/len)*j(.3),d:.28*len+.08}],
      ['clap',{nf:900+900*br,sp:.009*j(.3),ndec:18/len,d:.3*len+.05}],
      ['rim',{f:(600+900*hi)*j(.3)}],
      ['hat',{f:(300+200*br)*j(.2),dec:(55+30/len)*j(.2),hp:6000+2500*br,d:.12}],
      ['hat',{f:(300+200*br)*j(.2),dec:(7+5/len)*j(.2),hp:5500+2500*br,d:.6*len+.15}],
      ['tom',{f:(80+70*hi)*j(.2),dec:9/len,d:.45*len+.1}],
      ['tom',{f:(140+120*hi)*j(.2),dec:11/len,d:.38*len+.08}],
      ['conga',{f:(180+120*hi)*j(.2),dec:10/len,slap:.1+.3*br,d:.42*len+.08}],
      ['conga',{f:(320+220*hi)*j(.2),dec:14/len,slap:.2+.4*br,d:.3*len+.06}],
      ['shaker',{cf:3200+3500*br,dec:28/len,att:.012,d:.16*len+.06}],
      ['tamb',{f:(4200+2500*br)*j(.2),dec:16/len,d:.32*len+.08}],
      ['cowbell',{f:(480+300*hi)*j(.15),dec:10/len,d:.4*len+.08}],
      ['wood',{f:(700+900*hi)*j(.3),dec:40/len}],
      ['bell',{f:(700+1300*hi)*j(.3),dec:3.5/len,d:1.2*len+.2}],
      [hi>.85||k===3?'pot':'snap',{cf:2200+1800*br,f:(300+500*hi)*j(.3),dec:6/len,d:.6*len+.1}]];
    return P}
  /* the instruments: [name, how it is made, the notes it is made at (MIDI), its level] */
  var INSTS=[['marimba','mar',[40,52,64,76],1],['vibraphone','vib',[52,64,76],.8],['glockenspiel','glk',[76,88],.5],['xylophone','xyl',[64,76,88],.65],
    ['kalimba','kal',[64,76],.8],['steel pan','pan',[52,64,76],.75],['piano','pno',[40,52,64,76],.9],['electric piano','ep',[40,52,64,76],.85],
    ['celesta','cel',[64,76,88],.6],['gamelan','gam',[52,64,76],.65],['handpan','hp',[52,64],.85],['music box','mb',[76,88],.5],
    ['upright bass','bass',[28,40],1],['clavinet','clv',[40,52,64],.7],['glass','gls',[64,76],.55],['bells','bel',[64,76],.55]];
  function mf(m){return 440*Math.pow(2,(m-69)/12)}
  var I={
    mar:function(f){return fin(modes(buf(1.4),[[f,1,4.2],[f*3.93,.3,18],[f*9.2,.08,50]],.002))},
    vib:function(f){var o=modes(buf(2.6),[[f,1,1.2],[f*4,.2,6],[f*10,.04,24]],.003),n=o.length,i;for(i=0;i<n;i++)o[i]*=1-.25*(.5-.5*Math.cos(TAU*5.2*i/SR));return fin(o,.05)},
    glk:function(f){return fin(modes(buf(1.8),[[f,1,2.6],[f*2.71,.4,6],[f*5.15,.15,14]],.0006))},
    xyl:function(f){return fin(modes(buf(.7),[[f,1,9],[f*3,.35,26],[f*6,.1,60]],.0008))},
    kal:function(f){var o=modes(buf(1.4),[[f,1,3.6],[f*2,.12,6],[f*5.42,.2,30],[f*8.9,.05,55]],.0015);return fin(o)},
    pan:function(f){return fin(modes(buf(1.6),[[f,1,3],[f*2,.5,4],[f*3,.25,6],[f*4.02,.15,9],[f*1.005,.4,3.2]],.0012))},
    /* a piano string struck: its overtones a little sharp, two strings a hair apart */
    pno:function(f){var p=[],k,B=.0004;for(k=1;k<=9;k++){var fk=f*k*Math.sqrt(1+B*k*k);if(fk>SR*.45)break;p.push([fk,1/Math.pow(k,1.1),1.2+k*.9]);p.push([fk*1.0012,.5/Math.pow(k,1.1),1.4+k*.9])}
      var o=modes(buf(2.4),p,.002);var r=rng(f|0);hiss(o,r,f*6,1,300,.06);return fin(o,.06)},
    /* a tine struck by a hammer: the bell of it, then the round tone */
    ep:function(f){return fin(modes(buf(2.2),[[f,1,1.6],[f*2,.18,3],[f*7.1,.25,18],[f*14.2,.08,40]],.0015),.06)},
    cel:function(f){return fin(modes(buf(1.5),[[f,1,3.4],[f*2,.25,6],[f*4.1,.1,12]],.0008))},
    gam:function(f){return fin(modes(buf(2.2),[[f,1,1.6],[f*1.008,.6,1.7],[f*2.4,.3,4],[f*3.85,.15,7]],.0015),.06)},
    hp:function(f){return fin(modes(buf(2.4),[[f,1,1.4],[f*2,.45,2.4],[f*3,.2,3.6],[f*.5,.12,2],[f*2.01,.2,2.6]],.004),.08)},
    mb:function(f){return fin(modes(buf(1.4),[[f,1,4],[f*3.05,.3,10],[f*6.1,.1,22]],.0006))},
    /* a plucked string, worked out as a string: a delay as long as one swing of it, a little softened each time round */
    bass:function(f){var n=Math.floor(SR*1.6),o=new Float32Array(n),L=Math.max(2,Math.round(SR/f)),d=new Float32Array(L),r=rng(f*13|0),i,k=0,prev=0;
      for(i=0;i<L;i++)d[i]=(r()*2-1)*(.5+.5*Math.sin(Math.PI*i/L));
      for(i=0;i<n;i++){var v=d[k],nx=d[(k+1)%L];var y=.4985*(v+nx);d[k]=y*.998;o[i]=v;k=(k+1)%L}
      return fin(lopass(o,f*8),.05)},
    clv:function(f){var n=Math.floor(SR*.9),o=new Float32Array(n),L=Math.max(2,Math.round(SR/f)),d=new Float32Array(L),r=rng(f*7|0),i,k=0;
      for(i=0;i<L;i++)d[i]=r()*2-1;for(i=0;i<n;i++){var v=d[k];d[k]=.5*(v+d[(k+1)%L])*.996;o[i]=v*Math.exp(-i/SR*3);k=(k+1)%L}return fin(hipass(o,f*.7),.04)},
    gls:function(f){return fin(modes(buf(2.2),[[f,1,2.4],[f*1.004,.4,2],[f*2.76,.16,6.5],[f*5.4,.05,13]],.005))},
    bel:function(f){return fin(modes(buf(3),[[f*.5,.35,1.2],[f,1,1.4],[f*1.183,.4,2],[f*1.506,.3,2.6],[f*2,.5,2.2],[f*2.514,.2,3.4]],.001),.1)}
  };
  /* what has been made: buffers on the context given; a kit or instrument a few sounds a frame, so nothing stalls */
  var KB={},IB={},queue=[],busy=false;
  function toBuf(c,a){var b=c.createBuffer(1,a.length,SR);if(b.copyToChannel)b.copyToChannel(a,0);else b.getChannelData(0).set(a);return b}
  function kitNow(c,k){if(KB[k]&&KB[k].c===c)return KB[k].b;var P=kitParams(k),r=rng(31*(k+1)),b=P.map(function(e){return toBuf(c,V[e[0]](e[1],r))});KB[k]={c:c,b:b};return b}
  function instNow(c,i){if(IB[i]&&IB[i].c===c)return IB[i].s;var D=INSTS[i],s=D[2].map(function(m){return {m:m,b:toBuf(c,I[D[1]](mf(m)))}});IB[i]={c:c,s:s};return s}
  function pump(c){if(busy)return;busy=true;(function go(){var q=queue.shift();if(!q){busy=false;return}try{if(q[0]==='k')kitNow(c,q[1]);else instNow(c,q[1])}catch(e){}setTimeout(go,16)})()}
  function want(c,kind,i){if(kind==='k'?(KB[i]&&KB[i].c===c):(IB[i]&&IB[i].c===c))return;queue.push([kind,i]);pump(c)}
  /* the buffer for a kit's drum, or an instrument's nearest note (and how much faster or slower to play it), if it is made yet */
  function drum(c,k,j){var e=KB[k];if(!e||e.c!==c){want(c,'k',k);return null}return e.b[j]||null}
  function note(c,i,m){var e=IB[i];if(!e||e.c!==c){want(c,'i',i);return null}var best=e.s[0],bd=1e9;e.s.forEach(function(x){var d=Math.abs(x.m-m);if(d<bd){bd=d;best=x}});return {b:best.b,rate:Math.pow(2,(m-best.m)/12),g:INSTS[i][3]}}
  /* ---- the machine's loops: patterns of sixteenths, one or two bars, in the band's scale ----
     a drum loop: [step, drum (0..15), how hard]; a note loop: [step, MIDI note, how hard] */
  var E=[40,43,45,47,50];
  function pn(k,o){var n=E.length,q=Math.floor(k/n),r=((k%n)+n)%n;return E[r]+12*(q+(o||0))}
  function hits(spec){var a=[];spec.forEach(function(s){var d=s[0],v=s[1],pat=s[2];for(var i=0;i<pat.length;i++){var ch=pat[i];if(ch==='x')a.push([i,d,v]);else if(ch==='o')a.push([i,d,v*.55])}});return a}
  var DRUMLOOPS=[
    {n:'four',len:16,h:hits([[0,1,'x...x...x...x...'],[1,.8,'....x.......x...'],[4,.5,'..x...x...x...x.'],[4,.4,'o.o.o.o.o.o.o.o.']])},
    {n:'afro',len:16,h:hits([[0,1,'x..x..x...x..x..'],[3,.6,'..x...x.x...x...'],[10,.5,'xoxoxoxoxoxoxoxo'],[1,.7,'........x.......']])},
    {n:'broken',len:16,h:hits([[0,1,'x.....x...x.....'],[1,.85,'....x......x.x..'],[4,.45,'x.x.x.x.x.x.x.xx'],[2,.5,'.......x........']])},
    {n:'half',len:32,h:hits([[0,1,'x.........x.....x.........x.....'],[1,.9,'........x...............x.......'],[4,.45,'x...x...x...x...x...x...x...x...'],[13,.5,'..x.......x.........x.....x.....']])},
    {n:'roll',len:16,h:hits([[0,1,'x...x...x...x...'],[4,.5,'xxxxxxxxxxxxxxxx'],[7,.6,'............x.x.'],[6,.7,'..............xx'],[1,.7,'....x.......x...']])},
    {n:'sparse',len:16,h:hits([[0,1,'x.........x.....'],[2,.75,'....x.......x...'],[14,.4,'.......x........']])}];
  var PERCLOOPS=[
    {n:'congas',len:16,h:hits([[8,.8,'x..x....x..x....'],[9,.7,'..x.x.x...x.x.x.'],[10,.4,'xoxoxoxoxoxoxoxo']])},
    {n:'bell',len:16,h:hits([[12,.7,'x.x.xx.x.x.xx.x.'],[13,.5,'...x.....x...x..']])},
    {n:'shakers',len:16,h:hits([[10,.6,'xoxoxoxoxoxoxoxo'],[11,.5,'....x.......x...']])},
    {n:'bongos',len:16,h:hits([[9,.75,'x.xx.x.xx.x.xx.x'],[8,.6,'...x.......x....']])},
    {n:'wood',len:16,h:hits([[13,.7,'x..x..x...x..x..'],[3,.5,'..x.....x....x..']])},
    {n:'bells',len:32,h:hits([[14,.5,'x.......x.......x.......x.......'],[12,.5,'....x.......x.......x.......x...']])}];
  /* note loops: (step, scale degree, octave) turned into notes */
  function nl(len,a){return {len:len,h:a.map(function(x){return [x[0],pn(x[1],x[2]||0),x[3]||.8,x[1],x[2]||0]})}}
  var BASSLOOPS=[nl(32,[[0,0],[6,0],[10,3],[16,0],[22,4,-1],[26,3]]),nl(16,[[0,0],[3,0],[6,2],[8,0],[11,4,-1],[14,3]]),nl(32,[[0,0],[12,2],[16,4,-1],[28,3]]),
    nl(16,[[0,0],[2,5,-1],[4,0],[7,1],[10,0],[12,3],[14,4]]),nl(32,[[0,0],[4,0],[8,1],[12,0],[16,3],[20,3],[24,2],[28,1]]),nl(16,[[0,0],[10,0]])];
  var KEYLOOPS=[nl(16,[[0,5],[0,7],[0,9],[6,6],[6,8],[10,5],[10,7]]),nl(16,[[0,5],[2,7],[4,9],[6,7],[8,6],[10,8],[12,10],[14,8]]),nl(32,[[0,5],[0,8],[0,10],[16,6],[16,9],[16,11]]),
    nl(16,[[0,10],[3,9],[6,8],[8,7],[11,6],[14,5]]),nl(16,[[0,5],[1,7],[2,9],[3,10],[8,6],[9,8],[10,10],[11,11]]),nl(32,[[0,7],[8,6],[16,5],[24,4]])];
  var BELLLOOPS=[nl(32,[[0,10],[6,12],[12,11],[16,10],[22,9],[28,8]]),nl(16,[[0,12],[4,11],[8,10],[12,13]]),nl(16,[[2,10],[6,11],[10,12],[14,13]]),
    nl(32,[[0,15],[3,14],[6,13],[16,12],[19,11],[22,10]]),nl(16,[[0,10],[3,12],[6,10],[8,13],[11,12],[14,10]]),nl(32,[[0,12],[24,14]])];
  return {SR:SR,KITS:KITS,ROLES:ROLES,INSTS:INSTS,drum:drum,note:note,want:want,kitNow:kitNow,instNow:instNow,pn:pn,
    DRUMLOOPS:DRUMLOOPS,PERCLOOPS:PERCLOOPS,BASSLOOPS:BASSLOOPS,KEYLOOPS:KEYLOOPS,BELLLOOPS:BELLLOOPS,
    count:function(){return KITS.length*ROLES.length+INSTS.reduce(function(a,x){return a+x[2].length},0)},
    /* for the tests: a drum or a note made straight into an array */
    raw:function(kind,i,j){if(kind==='k'){var P=kitParams(i);return V[P[j][0]](P[j][1],rng(31*(i+1)))}var D=INSTS[i];return I[D[1]](mf(D[2][j||0]))}};
})();
