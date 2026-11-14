/* ---------- SND: real recorded instruments, for Mix and for Smoke's game.
   13 Nov, night: "impossible to make good sounds with those noises" (Mix's machine of sounds made on the device). So these are
   recordings: the Versilian Community Sample Library, which its makers put in the public domain (CC0 1.0: no royalties, no credit
   asked; github.com/sgossner/VCSL). Every one is struck or plucked and dies away. They come in eight small MP3 files in snd/, one a
   bank, each sound in its own slot of the file (a little silence, the sound, silence: tools/build_bank.py), and are cut apart here
   where each one begins, so the MP3 encoder's own delay does not matter. A tuned bank has a few notes, each with its pitch as
   measured (the xylophone and the glockenspiel stand an eighth of a semitone sharp; the measured pitch corrects them), and plays
   the nearest one a little faster or slower. (Both kalimbas in the library were tried and left out: their other tines ring along
   with every note, and moved to the band's key that ringing went out of tune.) ---------- */
var SND=(function(){
  var B={drums:{slot:.74,hits:['conga','conga2','quinto','tumba','heel','heel2','bongo','bongom','bongol','bongolm','cslap','cslap2','cmid','cbass','cbass2']},
    small:{slot:.62,hits:['shk','shk2','shku','shku2','shl','clap','clap2','clave','wood','hat','agoh','agol']},
    marimba:{slot:1.62,notes:[55,59.03,65,72.04,78.98,83,88.98]},
    vibes:{slot:2.52,notes:[64,67,71,74,77,81,84,88]},
    xylo:{slot:1.22,notes:[67.12,72.12,79.14,84.15,91.16,96.17]},
    glock:{slot:1.92,notes:[79.08,84.12,91.12,96.15]},
    chimes:{slot:2.72,notes:[76.03,80.03,81.01,84.01,88.04]},
    piano:{slot:2.32,notes:[45,47,49,51,53,55,57,59,61,63,65,67,69,71,73,75,77,79]}},
    PRE=.06,ST={},OK={},HIT={},NOTE={},RR={},dc=null;
  function ctxFor(){if(dc)return dc;var O=window.OfflineAudioContext||window.webkitOfflineAudioContext;try{dc=new O(1,2,44100)}catch(e){dc=AU.c||null}return dc}
  /* the file cut into its sounds: each starts where it rises out of the silence of its slot */
  function cut(c,b,n,slot){var sr=b.sampleRate,x=b.getChannelData(0),N=Math.round(slot*sr),out=[],i;
    for(i=0;i<n;i++){var s0=i*N,s1=Math.min(x.length,s0+N),pk=0,k;for(k=s0;k<s1;k++){var a=x[k]<0?-x[k]:x[k];if(a>pk)pk=a}
      var th=pk*.02,on=s0,lim=Math.min(s1,s0+Math.round((PRE+.18)*sr));for(k=s0;k<lim;k++){if((x[k]<0?-x[k]:x[k])>th){on=k;break}}
      on=Math.max(s0,on-64);var len=Math.max(64,s1-on-Math.round(.03*sr)),nb=c.createBuffer(1,len,sr);nb.getChannelData(0).set(x.subarray(on,on+len));out.push(nb)}
    return out}
  function one(k){if(ST[k])return ST[k];var D=B[k];if(!D)return Promise.resolve(false);
    ST[k]=fetchAB('snd/'+k+'.mp3').then(function(ab){var c=ctxFor();if(!c)throw new Error('no context');return decodeAB(c,ab)}).then(function(b){
      if(!b)throw new Error('decode');var c=ctxFor(),parts=cut(c,b,D.hits?D.hits.length:D.notes.length,D.slot);
      if(D.hits)D.hits.forEach(function(h,i){HIT[h]=parts[i]});else NOTE[k]=D.notes.map(function(m,i){return {m:m,b:parts[i]}});
      OK[k]=true;return true}).catch(function(){ST[k]=null;return false});
    return ST[k]}
  function load(ks){return Promise.all((ks||Object.keys(B)).map(one))}
  /* a hit; where the bank has a second take of it (name2), the two take turns, as a hand never strikes twice alike */
  function hit(name){var a=HIT[name];if(!a)return null;var b=HIT[name+'2'];if(!b)return a;RR[name]=!RR[name];return RR[name]?b:a}
  function note(k,m){var L=NOTE[k];if(!L)return null;var best=L[0];for(var i=1;i<L.length;i++)if(Math.abs(L[i].m-m)<Math.abs(best.m-m))best=L[i];return {b:best.b,rate:Math.pow(2,(m-best.m)/12)}}
  function bankOf(name){for(var k in B)if(B[k].hits&&B[k].hits.indexOf(name)>=0)return k;return null}
  return {B:B,load:load,ready:function(k){return !!OK[k]},hit:hit,note:note,bankOf:bankOf}
})();
