/* ---------- one WebGL canvas shared by every world that draws with the graphics chip ---------- */
var GLX={gl:null,cv:null,ok:false,lost:false,hp:true,hf:null,hfLin:false,hfRT:false,deriv:false,aniso:null,quad:null,w:1,h:1,gen:0};
function glInit(){
  var cv=$('gl');GLX.cv=cv;var o={alpha:false,antialias:false,depth:false,stencil:false,premultipliedAlpha:false,preserveDrawingBuffer:false,powerPreference:'high-performance'},gl=null;
  try{gl=cv.getContext('webgl',o)||cv.getContext('experimental-webgl',o)}catch(e){gl=null}
  if(!gl){GLX.ok=false;return false}
  GLX.gl=gl;GLX.ok=true;GLX.lost=false;GLX.gen++;
  try{var pf=gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT);GLX.hp=!!(pf&&pf.precision>0)}catch(e){GLX.hp=false}
  /* textures that hold signed fractions, for the water: half floats, and whether they can be drawn into and read smoothly */
  GLX.hf=gl.getExtension('OES_texture_half_float');GLX.hfLin=!!gl.getExtension('OES_texture_half_float_linear');gl.getExtension('EXT_color_buffer_half_float');
  GLX.hfRT=false;
  /* for the globe: slopes of things across the screen (so a picture wrapped round a ball has no seam), and sharper pictures seen edge-on */
  GLX.deriv=!!gl.getExtension('OES_standard_derivatives');GLX.aniso=gl.getExtension('EXT_texture_filter_anisotropic')||gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
  if(GLX.hf){var t=glTarget(4,4,GLX.hf.HALF_FLOAT_OES,gl.NEAREST);if(t){GLX.hfRT=true;glFree(t)}}
  GLX.quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,GLX.quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
  return true}
(function(){var cv=$('gl');
  cv.addEventListener('webglcontextlost',function(e){e.preventDefault();GLX.lost=true},false);
  cv.addEventListener('webglcontextrestored',function(){if(glInit()){glResize();try{worldsGL()}catch(e){}}},false)})();
function glResize(){
  if(!GLX.ok)return;var w=Math.max(1,Math.round(VW*DPR)),h=Math.max(1,Math.round(VH*DPR));
  if(GLX.cv.width!==w||GLX.cv.height!==h){GLX.cv.width=w;GLX.cv.height=h}GLX.w=w;GLX.h=h}
function glShader(type,src){var gl=GLX.gl,s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){if(window.__lc)console.error('shader: '+gl.getShaderInfoLog(s)+'\n'+src.slice(0,300));gl.deleteShader(s);return null}return s}
/* a program, with its uniforms and attributes looked up by name */
function glProg(vs,fs){
  var gl=GLX.gl;if(!gl)return null;if(!GLX.hp)fs=fs.replace('precision highp float','precision mediump float');
  var a=glShader(gl.VERTEX_SHADER,vs),b=glShader(gl.FRAGMENT_SHADER,fs);if(!a||!b)return null;
  var p=gl.createProgram();gl.attachShader(p,a);gl.attachShader(p,b);gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS)){if(window.__lc)console.error('link: '+gl.getProgramInfoLog(p));return null}
  var P={p:p,u:{},a:{}},i,n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);
  for(i=0;i<n;i++){var u=gl.getActiveUniform(p,i),nm=u.name.replace(/\[0\]$/,'');P.u[nm]=gl.getUniformLocation(p,u.name)}
  n=gl.getProgramParameter(p,gl.ACTIVE_ATTRIBUTES);for(i=0;i<n;i++){var at=gl.getActiveAttrib(p,i);P.a[at.name]=gl.getAttribLocation(p,at.name)}
  return P}
/* something to draw into */
function glTarget(w,h,type,filter){
  var gl=GLX.gl,t=gl.createTexture();if(!t)return null;gl.bindTexture(gl.TEXTURE_2D,t);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,filter);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,filter);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,type,null);
  var fb=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);
  var ok=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;
  if(ok){gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT)}
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  if(!ok){gl.deleteTexture(t);gl.deleteFramebuffer(fb);return null}
  return {tex:t,fbo:fb,w:w,h:h}}
function glFree(t){if(!t||!GLX.gl)return;try{GLX.gl.deleteTexture(t.tex);if(t.fbo)GLX.gl.deleteFramebuffer(t.fbo)}catch(e){}}
/* a picture (an image, a canvas) as a texture */
function glImageTex(src,repeatX,nearest,mip){
  var gl=GLX.gl,t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,nearest?gl.NEAREST:gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,nearest?gl.NEAREST:gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,repeatX?gl.REPEAT:gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  try{gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,src)}catch(e){gl.deleteTexture(t);return null}
  /* smaller copies of itself, for when it is seen small or edge-on (only pictures whose sides are powers of two can have them) */
  var w=src.width,h=src.height;
  if(mip&&w>0&&h>0&&!(w&(w-1))&&!(h&(h-1))){try{gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
    if(GLX.aniso)gl.texParameterf(gl.TEXTURE_2D,GLX.aniso.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(4,gl.getParameter(GLX.aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)||1))}catch(e){}}
  return {tex:t,w:w,h:h}}
/* a single black dot, to stand in for a picture that has not arrived yet */
function glDot(){var gl=GLX.gl,t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);return {tex:t,w:1,h:1}}
function glUse(P,target){var gl=GLX.gl;if(target){gl.bindFramebuffer(gl.FRAMEBUFFER,target.fbo);gl.viewport(0,0,target.w,target.h)}else{gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,GLX.w,GLX.h)}gl.useProgram(P.p);return P.u}
function glBind(unit,tex,loc){var gl=GLX.gl;gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1i(loc,unit)}
/* fill the target with a program */
function glQuad(P){var gl=GLX.gl,a=P.a.a_p;gl.bindBuffer(gl.ARRAY_BUFFER,GLX.quad);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLE_STRIP,0,4)}
function glClear(r,g,b){var gl=GLX.gl;gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,GLX.w,GLX.h);gl.clearColor(r,g,b,1);gl.clear(gl.COLOR_BUFFER_BIT)}
/* every attribute array off, so one world's buffers never leak into the next world's draw */
function glAttrOff(){var gl=GLX.gl;for(var i=0;i<8;i++)gl.disableVertexAttribArray(i)}
var ABYSS=[1/255,4/255,10/255];
