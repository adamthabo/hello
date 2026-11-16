/* ---------- the modes (15 Nov: "The mix is good! Make it able to also cycle through sounds or modes. another layer to change
   globally. five modes. funky, African, bluesy, acid, dub").
   A mode is the whole music's way of playing: its own instruments, written to its own groove, its own room and echo, and the voice
   every touch has in Paint and on the Earth. It is chosen in Mix (five buttons) or from the small button beside the note at the top
   of every world (a tap: the next one), comes in on the next bar, and is kept on the device.
   African is the band exactly as it was: the nine players and the ten instruments of 13 and 14 Nov. The other four are new bands of
   recorded instruments (struck or plucked, every note dying away: drums, basses, clavinet, electric piano, guitars, and Mix's own
   piano, shaker and hand drums), all on the band's own time (104 beats a minute, its four bars) and its own chords (two bars of E minor
   seventh, two of A seventh), so the band's players can join any of them from Mix. Nothing is made by an oscillator: the acid line
   is a picked bass string through a resonant filter that closes after each note, the dub echo is a delay of the band's dotted eighth.
   The new sounds are Frank Wen's Fluid R3 soundfont (MIT licence), in Michael Cowgill's mono version as MuseScore ships it
   (FluidR3Mono_GM.sf3; tools/snd/build_modes.py); see REFERENCES.md.
   Loops: drums as lanes (one string a sound, a character a sixteenth: '.' nothing, 1-9 how hard), tuned ones as events
   [sixteenth, note or notes, how hard, how many sixteenths before the hand damps it, {sl: slide into it, bd: bent up into it from
   so many semitones under, fx: echo for this note}]. tri: the loop is played as a shuffle (the second sixteenth of a beat a third of
   a beat in, the third two thirds in: triplets). ---------- */
var MODES=[{k:'funk',n:'funky'},{k:'africa',n:'African'},{k:'blues',n:'bluesy'},{k:'acid',n:'acid'},{k:'dub',n:'dub'}],MODE='africa';
(function(){try{var m=localStorage.getItem('lc-mode');if(m&&MODES.some(function(x){return x.k===m}))MODE=m}catch(e){}})();
function modeName(k){for(var i=0;i<MODES.length;i++)if(MODES[i].k===k)return MODES[i].n;return k}
/* four bars: fn(bar) gives that bar's events (bars 0 and 1 on E minor 7, 2 and 3 on A7) */
function bars4(fn){var ev=[];[0,16,32,48].forEach(function(b0,i){fn(i).forEach(function(e){ev.push([b0+e[0]].concat(e.slice(1)))})});return ev}
/* a sixteenth-note line written as notes (null: a rest), with how hard and how long, and a few marks */
function line16(b0,notes,acc,sl){var ev=[];notes.forEach(function(m,i){if(m===null||m===undefined)return;var o={};if(acc&&acc.indexOf(i)>=0)o.ac=1;if(sl&&sl.indexOf(i)>=0)o.sl=1;
  var d=1;while(i+d<notes.length&&notes[i+d]===null&&d<3)d++;ev.push([b0+i,m,o.ac?.95:.72,d,o])});return ev}
var MODEROWS=(function(){
  var EM7c=[55,59,62],A7c=[55,61,64],EM9=[55,59,62,66],A13=[55,61,66,69];
  function ch(i,a,b){return i<2?a:b}
  return {
  /* ---- funky: a tight kit with ghost notes, slap bass, clavinet through a wah, muted guitar scratching sixteenths, electric piano ---- */
  funk:[
    {n:'drums',bank:'kit',g:0.187,pan:0,col:'#ff7a2f',vis:0,role:'drum',loops:[
      {n:'tight',len:32,lv:{hh:.42,hho:.45,snare:.9},lanes:{
        kick: '9.....6...8.....9.....6.6..7....',
        snare:'....9..2.2..9..3....9..2.2..9.3.',
        hh:   '7353735373537353735373537353.3.3',
        hho:  '............................6...'}},
      {n:'break',len:32,lv:{hh:.42,hho:.45,snare:.9},lanes:{
        kick: '9.7.......7..7..9.7.......7.....',
        snare:'....9..3.3..9..3.3..9..3.3..9...',
        hh:   '7373737.737373737373737.73737373',
        hho:  '.......6...............6........'}}]},
    {n:'bass',bank:'slap',g:0.17,pan:0,col:'#3ef0ff',vis:5,role:'bass',loops:[
      {n:'slap',len:64,ev:bars4(function(i){return [
        [[0,28,.95,2],[3,40,.75,1],[4,28,.5,1],[6,38,.6,1],[7,40,.85,1],[10,28,.8,2],[12,31,.6,1],[13,33,.65,1],[14,35,.7,2]],
        [[0,28,.95,2],[3,40,.75,1],[6,28,.55,1],[7,40,.85,1],[8,38,.6,1],[10,35,.7,1],[11,38,.75,1],[12,40,.8,2],[15,43,.6,1]],
        [[0,33,.95,2],[3,45,.75,1],[4,33,.5,1],[6,43,.6,1],[7,45,.85,1],[10,33,.8,2],[12,37,.6,1],[13,40,.65,1],[14,43,.7,2]],
        [[0,33,.95,2],[3,45,.75,1],[6,33,.55,1],[7,45,.85,1],[8,43,.6,1],[10,40,.7,1],[11,37,.75,1],[12,38,.7,1],[14,39,.75,2]]][i]})},
      {n:'finger',len:64,bank:'fbass',ev:bars4(function(i){return [
        [[0,28,.9,3],[3,40,.55,1],[4,38,.6,2],[6,35,.65,2],[8,33,.6,2],[10,35,.7,2],[12,38,.65,2],[14,40,.6,2]],
        [[0,28,.9,3],[3,28,.45,1],[6,40,.7,1],[7,38,.6,1],[8,35,.6,2],[11,31,.6,2],[13,33,.6,1],[14,34,.55,1],[15,35,.6,1]],
        [[0,33,.9,3],[3,45,.55,1],[4,43,.6,2],[6,40,.65,2],[8,37,.6,2],[10,40,.7,2],[12,43,.65,2],[14,45,.6,2]],
        [[0,33,.9,3],[3,33,.45,1],[6,45,.7,1],[7,43,.6,1],[8,40,.6,2],[11,37,.6,2],[13,38,.6,1],[14,39,.6,2]]][i]})}]},
    {n:'clav',bank:'clav',g:0.105,pan:-.2,col:'#c6ff6b',vis:6,role:'tune',wah:1,loops:[
      {n:'stabs',len:64,ev:bars4(function(i){var c=ch(i,EM7c,A7c);return i%2===0?
        [[2,c,.7,1],[5,c,.5,1],[7,c,.65,1],[10,c,.7,1],[13,c,.5,1],[15,c,.55,1]]:
        [[0,c,.7,1],[3,c,.5,1],[6,c,.65,1],[8,c,.45,1],[10,c,.7,1],[12,c,.5,1],[14,c,.6,1]]})},
      {n:'riff',len:32,ev:[[0,64,.75,1],[2,64,.35,1],[3,67,.65,1],[5,69,.6,1],[6,67,.5,1],[8,64,.7,1],[10,62,.55,1],[11,64,.65,1],[14,59,.6,1],
        [16,64,.75,1],[18,64,.35,1],[19,67,.65,1],[21,69,.6,1],[23,71,.7,1],[24,74,.6,1],[26,71,.55,1],[27,69,.6,1],[29,67,.55,1],[30,64,.6,1]]}]},
    {n:'guitar',bank:'mgtr',g:0.106,pan:.28,col:'#effcff',vis:8,role:'tune',loops:[
      {n:'scratch',len:64,ev:bars4(function(i){var c=ch(i,[59,62],[61,64]),e=[];for(var s=0;s<16;s++)e.push([s,c,[.45,.28,.7,.3][s%4],1]);return e})},
      {n:'single',len:32,ev:[[0,52,.7,1],[2,52,.35,1],[3,55,.6,1],[4,57,.65,1],[6,55,.5,1],[7,52,.6,1],[10,50,.55,1],[11,52,.65,1],[14,47,.55,1],[15,50,.5,1],
        [16,52,.7,1],[18,52,.35,1],[19,55,.6,1],[20,57,.65,1],[22,59,.6,1],[23,62,.65,1],[26,59,.55,1],[27,57,.6,1],[29,55,.5,1],[30,52,.6,1]]}]},
    {n:'keys',bank:'ep',g:0.092,pan:-.1,col:'#b46bff',vis:7,role:'tune',loops:[
      {n:'chords',len:64,ev:bars4(function(i){var c=ch(i,EM9,A13);return i%2===0?[[0,c,.55,6],[10,c,.45,4]]:[[2,c,.5,3],[6,c,.45,6]]})},
      {n:'fills',len:64,ev:bars4(function(i){return [[[0,[67,71],.45,4]],[[12,74,.5,1],[13,71,.45,1],[14,69,.45,1],[15,67,.5,2]],[[0,[67,73],.45,4]],[[12,76,.5,1],[13,73,.45,1],[14,71,.45,1],[15,69,.5,2]]][i]})}]},
    {n:'perc',bank:'kit',g:0.167,pan:.34,col:'#ffd79a',vis:1,role:'drum',loops:[
      {n:'tambourine',len:16,lanes:{tamb:'4.4.8.4.4.4.8.4.'}},
      {n:'cowbell',len:16,lanes:{cow:'7...6...7...6.4.'}}]},
    {n:'congas',bank:'drums',g:0.07,pan:-.3,col:'#ffb347',vis:4,role:'drum',loops:[
      {n:'funk',len:32,lanes:{conga:'....7..5....7.5.....7..5....7.5.',tumba:'.......8......8........8...8..8.',heel:'3.3...3.3.3...3.3.3...3.3.3.....'}},
      {n:'slaps',len:16,lanes:{quinto:'..6...6...6..66.',conga:'7.......7.......',heel:'.3.3.3.3.3.3.3.3'}}]}],
  /* ---- bluesy: a shuffle (triplets) on brushes and a ride, walking upright bass, piano, guitar licks bent up into their notes ---- */
  blues:[
    {n:'drums',bank:'kit',g:0.327,pan:0,col:'#ff7a2f',vis:0,role:'drum',tri:1,loops:[
      {n:'shuffle',len:16,lv:{ride:.5,hhp:.6,kick:.75},lanes:{
        ride:'8.5.8.5.8.5.8.5.',
        kick:'6.......5.......',
        btap:'....8.2.....8.2.',
        hhp: '....6.......6...'}},
      {n:'slow',len:32,lv:{ride:.5,hhp:.6,kick:.75},lanes:{
        ride:'8.5.8.5.8.5.8.5.8.5.8.5.8.5.8.5.',
        kick:'6.........4.....6.........4.....',
        btap:'........8...............8.....3.',
        hhp: '....5.......5.......5.......5...'}}]},
    {n:'bass',bank:'ubass',g:0.186,pan:0,col:'#3ef0ff',vis:5,role:'bass',tri:1,loops:[
      {n:'walk',len:64,ev:bars4(function(i){return [
        [[0,28,.85,3],[4,31,.7,3],[8,33,.75,3],[10,33,.3,1],[12,35,.7,3]],
        [[0,38,.8,3],[4,35,.7,3],[8,31,.7,3],[12,32,.7,3]],
        [[0,33,.85,3],[4,37,.7,3],[8,40,.75,3],[10,40,.3,1],[12,43,.7,3]],
        [[0,45,.8,3],[4,43,.7,3],[8,40,.7,3],[12,29,.7,3]]][i]})},
      {n:'boogie',len:64,ev:bars4(function(i){return [
        [[0,28,.85,2],[2,28,.45,1],[4,31,.75,2],[6,31,.45,1],[8,33,.75,2],[10,33,.45,1],[12,34,.7,1],[14,35,.6,1]],
        [[0,38,.8,2],[2,38,.45,1],[4,35,.7,2],[6,35,.45,1],[8,33,.7,2],[10,31,.45,1],[12,31,.65,2],[14,32,.55,1]],
        [[0,33,.85,2],[2,33,.45,1],[4,37,.75,2],[6,37,.45,1],[8,38,.75,2],[10,38,.45,1],[12,39,.7,1],[14,40,.6,1]],
        [[0,45,.8,2],[2,45,.45,1],[4,43,.7,2],[6,43,.45,1],[8,40,.7,2],[10,38,.45,1],[12,37,.65,2],[14,35,.55,1]]][i]})}]},
    {n:'piano',bank:'piano',g:0.12,pan:-.16,col:'#effcff',vis:6,role:'tune',tri:1,loops:[
      {n:'comp',len:64,ev:bars4(function(i){var c=ch(i,[55,59,62,64],[55,61,64,67]);return [[4,c,.6,2],[6,c,.38,1],[10,c,.3,1],[12,c,.6,2],[14,c,.38,1]]})},
      {n:'licks',len:64,ev:bars4(function(i){return [
        [[0,76,.7,2],[2,74,.55,1],[4,71,.65,2],[6,70,.5,1],[8,69,.6,2],[10,67,.55,1],[12,64,.7,3]],
        [[4,[64,67],.45,2],[8,[67,71],.5,2],[10,[67,70],.4,1],[12,[67,71],.55,3]],
        [[0,76,.6,1],[1,76,.45,1],[2,76,.55,1],[4,74,.6,2],[6,76,.5,1],[8,79,.65,3],[12,76,.5,2]],
        [[0,76,.6,2],[2,74,.5,1],[4,71,.55,2],[6,69,.5,1],[8,67,.55,2],[10,64,.6,3]]][i]})}]},
    {n:'guitar',bank:'gtr',g:0.169,pan:.24,col:'#c6ff6b',vis:8,role:'tune',tri:1,loops:[
      {n:'licks',len:64,ev:bars4(function(i){return [
        [[0,71,.7,3,{bd:2}],[4,69,.55,2],[6,67,.5,1],[8,64,.6,4]],
        [[4,67,.55,1],[6,64,.5,1],[8,62,.55,2],[10,64,.6,4,{bd:1}]],
        [[0,76,.7,3,{bd:2}],[4,74,.55,2],[6,71,.5,1],[8,69,.6,3],[12,71,.55,2,{bd:1}]],
        [[0,67,.6,2],[2,64,.5,1],[4,62,.55,2],[6,64,.5,1],[8,64,.6,6,{bd:2}]]][i]})},
      {n:'shuffle',len:64,ev:bars4(function(i){var r=i<2?52:57,a=i<2?59:64,b=i<2?61:66,c=i<2?62:67,e=[];
        [[0,a,.6],[2,a,.4],[4,b,.6],[6,b,.4],[8,a,.6],[10,a,.4],[12,c,.6],[14,b,.4]].forEach(function(x){e.push([x[0],[r,x[1]],x[2],1])});return e})}]},
    {n:'keys',bank:'ep',g:0.1,pan:-.08,col:'#b46bff',vis:7,role:'tune',tri:1,loops:[
      {n:'chords',len:64,ev:bars4(function(i){var c=ch(i,EM9,A13);return [[0,c,.5,5],[10,c,.38,2],[12,c,.45,3]]})},
      {n:'answers',len:64,ev:bars4(function(i){return [[],[[8,74,.5,2],[10,71,.45,1],[12,69,.5,2],[14,67,.45,1]],[],[[8,76,.5,2],[10,73,.45,1],[12,71,.5,2],[14,69,.45,2]]][i]})}]},
    {n:'perc',bank:'kit',bank2:'small',g:0.177,pan:.32,col:'#ffd79a',vis:1,role:'drum',tri:1,loops:[
      {n:'tambourine',len:16,lanes:{tamb:'..3.7.3...3.7.3.'}},
      {n:'claps',len:16,lanes:{clap:'....5.......5...'}}]}],
  /* ---- acid: a drum machine's kick, clap and hats (recordings of the TR-808), a picked bass string squelching through a resonant
     filter that closes after every note and slowly opens and shuts over the bars, house piano ---- */
  acid:[
    {n:'drums',bank:'k808',g:0.103,pan:0,col:'#ff2d8a',vis:0,role:'drum',loops:[
      {n:'four',len:16,lv:{h8:.42,o8:.4,c8:.75},lanes:{
        k8:'9...9...9...9...',
        c8:'....8.......8...',
        o8:'..6...6...6...6.',
        h8:'43.343.343.343.3'}},
      {n:'jack',len:32,lv:{h8:.42,c8:.75,b8:.45},lanes:{
        k8:'9...9...9...9...9...9...9..69...',
        c8:'....8.......8.......8.......8.66',
        h8:'43434343434343434343434343434343',
        b8:'..5..5....5..5....5..5....5..5..'}}]},
    {n:'acid',bank:'pbass',g:0.113,pan:0,col:'#c6ff6b',vis:5,role:'bass',acid:1,loops:[
      {n:'squelch',len:64,ev:[].concat(
        line16(0,[28,28,40,28,null,28,38,28,31,28,40,null,35,28,38,null],[2,8,14],[3]),
        line16(16,[28,null,40,28,28,null,43,40,28,31,null,33,35,null,40,38],[2,6,12],[7,15]),
        line16(32,[33,33,45,33,null,33,43,33,37,33,45,null,40,33,43,null],[2,8,14],[3]),
        line16(48,[33,null,45,33,33,null,47,45,33,37,null,38,40,null,45,43],[2,6,12],[7,15]))},
      {n:'rolling',len:32,ev:[].concat(
        line16(0,[28,40,28,40,31,43,28,40,28,40,33,45,35,47,38,50],[0,6,12],[5,13]),
        line16(16,[28,40,28,40,31,43,28,40,38,50,35,47,33,45,31,43],[0,8,14],[9]))}]},
    {n:'piano',bank:'piano',g:0.104,pan:-.14,col:'#effcff',vis:6,role:'tune',send:.22,loops:[
      {n:'house',len:64,ev:bars4(function(i){var c=ch(i,EM9,A13);return i%2===0?[[3,c,.6,1],[6,c,.55,1],[10,c,.6,1],[13,c,.5,1]]:[[2,c,.55,1],[6,c,.6,1],[9,c,.5,1],[12,c,.55,1],[14,c,.5,1]]})},
      {n:'offbeats',len:64,ev:bars4(function(i){var c=ch(i,EM9,A13);return [[2,c,.55,1],[6,c,.5,1],[10,c,.55,1],[14,c,.5,1]]})}]},
    {n:'perc',bank:'small',bank2:'kit',g:0.167,pan:.3,col:'#ffd79a',vis:1,role:'drum',loops:[
      {n:'shaker',len:16,lanes:{shk:'5.8.5.8.5.8.5.8.',shku:'.3.3.3.3.3.3.3.3'}},
      {n:'tambourine',len:16,lanes:{tamb:'..7...7...7...7.'}}]}],
  /* ---- dub: the one drop (kick and rim together on the third beat) or steppers, a deep sparse bass, the guitar's skank on two and
     four with the piano under it, and an echo of the band's dotted eighth that the rim, the skank and the melody are thrown into ---- */
  dub:[
    {n:'drums',bank:'kit',g:0.195,pan:0,col:'#ff7a2f',vis:0,role:'drum',loops:[
      {n:'one drop',len:32,lv:{hh:.4,hho:.45},send:{xs:.42,hho:.3},lanes:{
        kick:'........9...............9.......',
        xs:  '........8...............8....3..',
        hh:  '3.6.3.6.3.6.3.6.3.6.3.6.3.6.3...',
        hho: '..............................5.'}},
      {n:'steppers',len:16,lv:{hh:.38},send:{xs:.45},lanes:{
        kick:'9...9...9...9...',
        xs:  '........8.......',
        hh:  '.6.6.6.6.6.6.6.6'}}]},
    {n:'bass',bank:'fbass',g:0.213,pan:0,col:'#3ef0ff',vis:5,role:'bass',loops:[
      {n:'deep',len:64,ev:bars4(function(i){return [
        [[0,28,.9,5],[6,35,.7,2],[8,38,.75,3],[11,40,.8,3]],
        [[0,40,.8,3],[3,38,.7,2],[6,35,.7,4],[12,31,.7,3]],
        [[0,33,.9,5],[6,40,.7,2],[8,43,.75,3],[11,45,.8,3]],
        [[0,45,.8,3],[3,43,.7,2],[6,40,.7,4],[12,37,.7,2],[14,39,.65,2]]][i]})},
      {n:'rockers',len:64,ev:bars4(function(i){return [
        [[0,28,.9,2],[3,28,.55,1],[4,40,.7,2],[6,38,.6,2],[8,35,.75,2],[10,31,.6,2],[12,33,.7,2],[14,35,.6,2]],
        [[0,28,.9,2],[3,28,.55,1],[4,40,.7,2],[6,38,.6,2],[8,43,.7,2],[10,40,.6,2],[12,38,.7,2],[14,35,.6,2]],
        [[0,33,.9,2],[3,33,.55,1],[4,45,.7,2],[6,43,.6,2],[8,40,.75,2],[10,37,.6,2],[12,38,.7,2],[14,40,.6,2]],
        [[0,33,.9,2],[3,33,.55,1],[4,45,.7,2],[6,43,.6,2],[8,40,.7,2],[10,38,.6,2],[12,37,.7,2],[14,39,.6,2]]][i]})}]},
    {n:'skank',bank:'gtr',g:0.122,pan:.22,col:'#c6ff6b',vis:8,role:'tune',send:.18,loops:[
      {n:'skank',len:64,ev:bars4(function(i){var c=ch(i,[67,71,74],[67,73,76]);return [[4,c,.7,1],[12,c,.7,1,i===3?{fx:.85}:null]]})},
      {n:'double',len:64,ev:bars4(function(i){var c=ch(i,[67,71,74],[67,73,76]);return [[4,c,.7,1],[6,c,.42,1],[12,c,.7,1],[14,c,.42,1,i===3?{fx:.85}:null]]})}]},
    {n:'piano',bank:'piano',g:0.129,pan:-.18,col:'#effcff',vis:6,role:'tune',loops:[
      {n:'skank',len:64,send:.14,ev:bars4(function(i){var c=ch(i,EM7c,A7c);return [[4,c,.55,1],[12,c,.55,1]]})},
      {n:'melody',len:64,send:.55,ev:bars4(function(i){return [
        [[0,76,.6,4],[6,74,.5,2],[8,71,.55,6]],
        [[4,69,.5,2],[6,71,.55,6]],
        [[0,73,.6,4],[6,71,.5,2],[8,69,.55,6]],
        [[4,67,.5,2],[6,64,.55,8]]][i]})}]},
    {n:'keys',bank:'ep',g:0.088,pan:.06,col:'#b46bff',vis:7,role:'tune',loops:[
      {n:'echoes',len:64,send:.8,ev:bars4(function(i){return [[[6,71,.55,2]],[[14,74,.5,2]],[[6,73,.55,2]],[[10,69,.5,2]]][i]})},
      {n:'chords',len:64,send:.3,ev:bars4(function(i){return i===0?[[0,EM9,.5,12]]:i===2?[[0,A13,.5,12]]:[]})}]},
    {n:'perc',bank:'drums',bank2:'small',g:0.084,pan:-.3,col:'#ffb347',vis:4,role:'drum',loops:[
      {n:'repeater',len:16,lanes:{tumba:'9.......7.......',conga:'..5..5.6..5..5.6'}},
      {n:'shaker',len:16,lanes:{shk:'..6...6...6...6.',shku:'4...4...4...4...'}}]},
    {n:'echo',bank:'kit',g:0.161,pan:.12,col:'#ff2d8a',vis:4,role:'fx',loops:[
      {n:'throws',len:64,send:{snare:1,xs:1},lanes:{
        snare:'..............................7...............................8.',
        xs:   '..............................................6.................'}},
      {n:'splash',len:64,send:{hho:.9,xs:.8},lanes:{
        hho:'..............5...............................5.................',
        xs: '......................................................5.........'}}]}]}})();
/* each mode: who of the band plays when it is chosen (African: all nine), which instruments on which loop, the order the music
   builds in when the page starts in it, its room (how much of the band's reverb), its echo (sixteenths, how much comes back, its
   filters), and the voice of a touch in Paint and on the Earth ('glass', the main one; 'tick', the lightning; 'thump', 'tok', 'kal') */
var MODESET={
  africa:{band:[1,1,1,1,1,1,1,1,1],rows:{},room:0,echo:{fb:0}},
  funk:{band:[0,0,0,0,0,0,0,0,0],rows:{drums:0,bass:0,clav:0,guitar:0,perc:0},room:.05,echo:{fb:0},
    voice:{glass:{bank:'clav',g:0.0685,d:.22,lo:52,hi:79},kal:{bank:'ep',g:0.0465,d:.6,lo:55,hi:84},tick:{hit:'hh',g:0.0475},thump:{hit:'kick',g:0.1526},tok:{hit:'cow',g:0.28}}},
  blues:{band:[0,0,0,0,0,0,0,0,0],rows:{drums:0,bass:0,piano:0,guitar:0},room:.16,echo:{fb:0},
    voice:{glass:{bank:'ep',g:0.038,d:1.1,lo:55,hi:84},kal:{bank:'piano',g:0.058,d:.8,lo:52,hi:79},tick:{hit:'ride',g:0.027},thump:{hit:'kick',g:0.1466},tok:{hit:'xs',g:0.1988}}},
  acid:{band:[0,0,0,0,0,0,0,0,0],rows:{drums:0,acid:0,perc:0},room:.07,echo:{n:3,fb:.32,lp:2800,hp:260,ret:.6},
    voice:{glass:{bank:'pbass',g:0.0365,d:.2,lo:31,hi:52,acid:1},kal:{bank:'piano',g:0.058,d:.3,lo:52,hi:79,fx:.3},tick:{hit:'h8',g:0.0675},thump:{hit:'k8',g:0.0276},tok:{hit:'c8',g:0.1382}}},
  dub:{band:[0,0,0,0,0,0,0,0,0],rows:{drums:0,bass:0,skank:0,piano:0,echo:0},room:.26,echo:{n:3,fb:.56,lp:2100,hp:320,ret:.7},
    voice:{glass:{bank:'gtr',g:0.061,d:.2,lo:64,hi:79,fx:.55},kal:{bank:'ep',g:0.031,d:.6,lo:60,hi:84,fx:.6},tick:{hit:'hh',g:0.0495,fx:.35},thump:{hit:'kick',g:0.1466},tok:{hit:'xs',g:0.0798,fx:.7}}}};
/* the order a mode's instruments come in when the page starts in it (one more every two bars, as the band builds) */
var MODEBUILD={funk:['drums','bass','guitar','clav','perc'],blues:['drums','bass','piano','guitar'],acid:['drums','acid','perc'],dub:['drums','bass','skank','piano','echo']};
