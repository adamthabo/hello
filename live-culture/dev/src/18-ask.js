/* ---- (18 Nov, 11:31: "make the first art page a fun sketchbook that you can do anything with. Paint, drew write. And then it can
   convert to text, give you a quick image") asking Claude about Paint's page: what is written on it, as text (which can then be set in
   type where the writing was), or the page drawn again as a clean picture (which can then be laid on the page and drawn over). It is
   the viewer's own Claude, in the Claude app, asked only when they tap, and the first time they are asked to allow it; where it cannot
   look at a picture the two buttons are not there ---- */
var ASK={s:null,img:false,ctl:null,kind:'',text:'',svg:'',pic:null,seq:0};
function askInit(){if(HOSTED)return;try{if(!(window.claude&&window.claude.use))return;
  window.claude.use('sample').then(function(s){if(!s)return;ASK.s=s;
    return s.limits().then(function(l){ASK.img=!!(l&&l.images&&l.images.maxCount>0);askSync()},function(){})}).catch(function(){})}catch(e){}}
function askSync(){var on=!!(ASK.s&&ASK.img),a=$('bText'),b=$('bPic'),r=$('p_ask');if(a)a.hidden=!on;if(b)b.hidden=!on;if(r)r.hidden=!on}
function askStop(){if(ASK.ctl){try{ASK.ctl.abort()}catch(e){}ASK.ctl=null}ASK.seq++}
function askOff(){askStop();var c=$('card');if(c&&c.dataset.k==='sk'){c.hidden=true;c.dataset.k='';while(c.firstChild)c.removeChild(c.firstChild)}ASK.kind='';ASK.pic=null}
/* the error, said in a line; where Claude cannot be asked here at all, the buttons go */
function askWhy(e){var k=e&&e.code;
  if(k==='not_granted'||k==='sampling_disabled'||k==='not_declared'||k==='capability_disabled'||k==='capability_removed'||k==='images_unavailable'){ASK.img=false;askSync();return 'Claude can’t look at the page here'}
  if(k==='rate_limited')return 'Claude is busy for you just now: try again in a while';
  if(k==='session_expired')return 'sign in to Claude again, then try';
  if(k==='refused')return 'Claude wouldn’t take this one';
  if(k==='image_rejected')return 'the page couldn’t be sent';
  if(k==='empty_completion')return 'nothing came back: try again with a clearer page';
  return 'that didn’t come through: try again'}
function el(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
/* the card: its name, a close, the answer (words, or the picture), and what can be done with it */
function askCard(){var c=$('card');if(!c)return null;
  c.dataset.k='sk';while(c.firstChild)c.removeChild(c.firstChild);var k=ASK.kind;
  c.appendChild(el('p','cn',k==='text'?'to text':'quick image'));
  var x=el('button','cx','×');x.type='button';x.setAttribute('aria-label','Close');x.addEventListener('click',function(){askOff()});c.appendChild(x);
  var busy=!!ASK.ctl;
  if(k==='text'){
    if(ASK.err){c.appendChild(el('p','cdo',ASK.err))}
    else if(busy&&!ASK.text){c.appendChild(el('p','ck ask','reading the page…'))}
    else if(ASK.none){c.appendChild(el('p','cdo','no writing on this page'))}
    else{var t=el('p','ckt',ASK.text);c.appendChild(t);
      if(!busy){var a=el('div','ca');
        var cp=el('button','',"copy");cp.type='button';cp.addEventListener('click',function(){var s=ASK.text,done=function(){say('copied','#3ef0ff')};
          try{navigator.clipboard.writeText(s).then(done,function(){selectIt(t)})}catch(e){selectIt(t)}});a.appendChild(cp);
        var ty=el('button','cl','type it on the page');ty.type='button';ty.addEventListener('click',function(){if(WORLDS[0].o.skType(ASK.text)){askOff();say('set in type','#3ef0ff')}});a.appendChild(ty);
        c.appendChild(a)}}}
  else{
    if(ASK.err){c.appendChild(el('p','cdo',ASK.err))}
    if(ASK.svg){var im=el('img','cpic');im.alt='Claude’s picture of the page';im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(ASK.svg);ASK.pic=im;c.appendChild(im)}
    if(busy)c.appendChild(el('p','ck ask',ASK.svg?'still drawing…':'drawing the page again…'));
    else if(ASK.svg&&!ASK.err){var a2=el('div','ca');
      var pu=el('button','cl','put it on the page');pu.type='button';pu.addEventListener('click',function(){var im2=ASK.pic;var go2=function(){if(WORLDS[0].o.skPicture(im2)){askOff();say('on the page','#3ef0ff')}};
        if(im2&&im2.complete)go2();else if(im2)im2.onload=go2});a2.appendChild(pu);
      c.appendChild(a2)}}
  c.hidden=false;return c}
function selectIt(n){try{var r=document.createRange();r.selectNodeContents(n);var s=getSelection();s.removeAllRanges();s.addRange(r)}catch(e){}}
/* Claude's picture, kept to drawing: one svg, without scripts, foreign content, outside links, embedded images or animation */
function svgClean(t,partial){var a=t.indexOf('<svg');if(a<0)return '';var s=t.slice(a),b=s.lastIndexOf('</svg>');
  if(b>=0)s=s.slice(0,b+6);else{if(!partial)return '';var g=s.lastIndexOf('>');if(g<0)return '';s=s.slice(0,g+1);
    /* a picture still being written: close what is open, so the part that is done can be shown */
    var st=[],re=/<(\/?)([a-zA-Z][\w:-]*)[^>]*?(\/?)>/g,m;while((m=re.exec(s))){if(m[1])st.pop();else if(!m[3])st.push(m[2])}
    if(/<[^>]*$/.test(s))return '';while(st.length)s+='</'+st.pop()+'>'}
  try{var d=new DOMParser().parseFromString(s,'image/svg+xml'),r=d.documentElement;if(!r||r.nodeName!=='svg'||d.getElementsByTagName('parsererror').length)return '';
    var bad=r.querySelectorAll('script,foreignObject,image,iframe,a,animate,animateMotion,animateTransform,set,audio,video,style');for(var i=0;i<bad.length;i++)bad[i].remove();
    var all=[r].concat([].slice.call(r.querySelectorAll('*')));all.forEach(function(n){[].slice.call(n.attributes).forEach(function(at){var nm=at.name.toLowerCase(),v=at.value;
      if(nm.indexOf('on')===0||((nm==='href'||nm==='xlink:href')&&v.charAt(0)!=='#')||/url\(\s*['"]?\s*(?!#)/i.test(v))n.removeAttribute(at.name)})});
    if(!r.getAttribute('xmlns'))r.setAttribute('xmlns','http://www.w3.org/2000/svg');return new XMLSerializer().serializeToString(r)}catch(e){return ''}}
/* the page as it looks (the water and the sheet), taken in the frame, when the water's picture is there to take */
var SHOTQ=[];
function shotRun(){var q=SHOTQ;SHOTQ=[];var k=Math.min(1,1100/Math.max(VW,VH)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(VW*k));c.height=Math.max(1,Math.round(VH*k));
  var x=c.getContext('2d');x.fillStyle='#01040a';x.fillRect(0,0,c.width,c.height);try{if(GLX.ok&&!GLX.lost)x.drawImage(GLX.cv,0,0,c.width,c.height)}catch(e){}
  var s=$('sk');if(s&&!s.hidden&&s.width>1)x.drawImage(s,0,0,c.width,c.height);q.forEach(function(f){try{f(c)}catch(e){}})}
function blobOf(c){return new Promise(function(res){try{c.toBlob(function(b){res(b)},'image/png')}catch(e){res(null)}})}
function askGo(kind){if(!ASK.s||!ASK.img)return;askStop();var my=ASK.seq,ctl=new AbortController();ASK.ctl=ctl;ASK.kind=kind;ASK.text='';ASK.svg='';ASK.err='';ASK.none=false;ASK.pic=null;
  try{menuShow(false)}catch(e){}askCard();
  var ink=kind==='text'?WORLDS[0].o.skInk():null;
  (ink?Promise.resolve(ink):new Promise(function(res){SHOTQ.push(res)})).then(function(cv){if(my!==ASK.seq)return null;
    var W=Math.round(VW),H=Math.round(VH),P=kind==='text'?
      (ink?'The image is a page from a sketchbook: what someone wrote and drew with a finger on a phone, shown as dark ink on white. ':'The image is a page from a sketchbook: what someone painted and drew with a finger on a phone, on a near-black page. ')+
      'Read every word, letter, number and sign written on it, as it is written (keep the spelling and the line breaks). Reply with only that text. If nothing on the page is writing, reply with exactly: NO WRITING'
      :'The image is a quick sketch, painted and drawn with a finger on a phone, on a near-black page '+W+' wide and '+H+' tall. Draw it again as a clean, finished picture: '+
      'keep what it shows, where each thing is and its colours, and draw it better. Reply with only one SVG element, <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+'"> … </svg>, '+
      'made of shapes and paths with flat fills or gradients. Leave the background empty (it sits on the near-black page, so use colours that read on it). '+
      'No words unless the sketch has writing. No image, script, foreignObject, style, link or animation elements. Keep it under 14 kB.';
    return blobOf(cv).then(function(b){if(my!==ASK.seq)return null;if(!b)throw {code:'image_rejected'};
      return ASK.s(P,{images:[b],modelTier:kind==='text'?'quick':'default',signal:ctl.signal,onText:function(u){if(my!==ASK.seq)return;
        if(kind==='text'){ASK.text=u.text;askCard()}else{var s=svgClean(u.text,true);if(s&&s!==ASK.svg){ASK.svg=s;askCard()}}}})})}).then(function(r){
    if(!r||my!==ASK.seq)return;ASK.ctl=null;
    if(kind==='text'){var t=String(r.text||'').trim();if(/^NO WRITING\.?$/i.test(t)||!t)ASK.none=true;ASK.text=t}
    else{var s=svgClean(String(r.text||''),false);if(s)ASK.svg=s;else ASK.err='no picture came back: try again'}
    askCard()},function(e){if(my!==ASK.seq)return;ASK.ctl=null;if(e&&e.code==='cancelled'){askOff();return}ASK.err=askWhy(e);if(kind==='text')ASK.text='';askCard()})}
$('bText').addEventListener('click',function(){askGo('text')});
$('bPic').addEventListener('click',function(){askGo('pic')});
