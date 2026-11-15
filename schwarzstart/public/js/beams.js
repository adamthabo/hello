// SCHWARZSTART · loot light: every piece of gear on the street throws a column of its rarity colour up into the clouds,
// so you can see a drop from three blocks away. Ammo, kits and Marken get a short glow instead.
import * as THREE from 'three';

let GEO = null, HALO = null;
const MATS = new Map();
function beamGeo() { if (!GEO) { GEO = new THREE.PlaneGeometry(1, 1, 1, 1); GEO.translate(0, 0.5, 0); } return GEO; }
function haloGeo() { if (!HALO) { HALO = new THREE.PlaneGeometry(1, 1); HALO.rotateX(-Math.PI / 2); } return HALO; }

function beamMat(gfx, hex, tall) {
  const key = 'b' + hex + (tall ? 'T' : 's'); if (MATS.has(key)) return MATS.get(key);
  const c = new THREE.Color(hex);
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: gfx.U.uTime, uCol: { value: new THREE.Vector3(c.r, c.g, c.b) }, uH: { value: tall ? 260 : 2.4 }, uW: { value: tall ? 2.2 : 0.5 }, uTall: { value: tall ? 1 : 0 } },
    vertexShader: /* glsl */`
      uniform float uH, uW; varying vec2 vU; varying float vD, vH;
      void main(){
        vec3 c = ( modelMatrix * vec4( 0.0, 0.0, 0.0, 1.0 ) ).xyz, tc = cameraPosition - c; tc.y = 0.0;
        float d = length( tc ); vec3 r = d > 1e-3 ? vec3( -tc.z, 0.0, tc.x ) / d : vec3( 1.0, 0.0, 0.0 );   // turns to face you, stays upright
        float w = uW * max( 1.0, d / 40.0 );                                                                  // never thinner than a few pixels
        vec3 p = c + r * position.x * w + vec3( 0.0, position.y * uH, 0.0 );
        vU = vec2( position.x * 2.0, position.y ); vD = d; vH = position.y * uH;
        gl_Position = projectionMatrix * viewMatrix * vec4( p, 1.0 );
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uCol; uniform float uTime, uTall; varying vec2 vU; varying float vD, vH;
      void main(){
        float x = abs( vU.x ), v = vU.y;
        vec3 sat = pow( uCol, vec3( 1.7 ) ); sat /= max( 0.001, max( sat.r, max( sat.g, sat.b ) ) );        // rarity colour, saturated
        float core = exp( -x * x * 260.0 ), inner = exp( -x * x * 22.0 ), outer = exp( -x * 3.6 ) * 0.22;
        float fall = uTall > 0.5 ? ( 0.2 + 0.8 * pow( 1.0 - v, 4.0 ) ) * ( 1.0 - smoothstep( 0.5, 1.0, v ) ) : 1.0 - v;
        float base = uTall > 0.5 ? 1.0 + 3.5 * exp( -vH * 0.55 ) : 1.0;
        float sh = 0.78 + 0.22 * sin( vH * 0.45 - uTime * 5.0 ) * sin( vH * 0.11 + uTime * 1.7 );
        float far = mix( 1.0, 0.55, smoothstep( 60.0, 420.0, vD ) );
        // a white-hot thread in the middle, the rarity colour around it, and a wide soft glow you can see from blocks away
        vec3 col = mix( sat, vec3( 1.0 ), 0.3 ) * core * 1.6 + sat * ( inner * 1.05 + outer * 1.4 );
        float rise = 0.75 + 0.25 * smoothstep( 0.0, 1.0, fract( vH * 0.035 - uTime * 0.45 ) );   // light climbing the column
        col *= fall * base * sh * far * ( uTall > 0.5 ? rise : 1.0 );
        if ( max( col.r, max( col.g, col.b ) ) < 0.003 ) discard;
        gl_FragColor = vec4( col * 3.0, 1.0 );
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide,
  });
  MATS.set(key, m); return m;
}
function haloMat(gfx, hex) {
  const key = 'h' + hex; if (MATS.has(key)) return MATS.get(key);
  const c = new THREE.Color(hex);
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: gfx.U.uTime, uCol: { value: new THREE.Vector3(c.r, c.g, c.b) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }',
    fragmentShader: /* glsl */`
      uniform vec3 uCol; uniform float uTime; varying vec2 vUv;
      void main(){
        float r = length( vUv - 0.5 ) * 2.0, ph = fract( uTime * 0.55 + uCol.r * 3.1 );
        float ring = ( 1.0 - smoothstep( 0.0, 0.07, abs( r - ph ) ) ) * ( 1.0 - ph ) * 0.9;
        float a = ( exp( -r * r * 6.0 ) * 0.7 + ring ) * ( 1.0 - smoothstep( 0.85, 1.0, r ) );
        if ( a < 0.003 ) discard;
        gl_FragColor = vec4( uCol * a * 1.8, 1.0 );
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  MATS.set(key, m); return m;
}
// a pillar of light (tall) or a short glow, plus the pulsing ring on the street under it
export function lootLight(gfx, hex, tall) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(beamGeo(), beamMat(gfx, hex, tall)); b.frustumCulled = false; b.renderOrder = 7; b.raycast = () => {}; g.add(b);
  const h = new THREE.Mesh(haloGeo(), haloMat(gfx, hex)); h.scale.setScalar(tall ? 2.8 : 1.4); h.position.y = 0.04; h.renderOrder = 5; h.raycast = () => {}; g.add(h);
  return g;
}
