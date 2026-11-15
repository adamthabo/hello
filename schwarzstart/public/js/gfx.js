// SCHWARZSTART · renderer: HDR pipeline, winter sky, weather, world materials
import * as THREE from 'three';
import { clamp, lerp, smooth, loadImage, imagePixels, IS_MOBILE } from './util.js';

export const QUALITY = {
  low: { scale: 0.72, maxDpr: 1.5, shadow: 1024, shadowDist: 48, msaa: 0, bloom: 4, texDiv: 2, far: 1000, draw: 560, lights: 3, snow: 2200, aniso: 2 },
  mid: { scale: 0.9, maxDpr: 1.5, shadow: 2048, shadowDist: 70, msaa: 4, bloom: 5, texDiv: 1, far: 1500, draw: 800, lights: 4, snow: 5000, aniso: 8 },
  high: { scale: 1.0, maxDpr: 2.0, shadow: 4096, shadowDist: 95, msaa: 4, bloom: 6, texDiv: 1, far: 2200, draw: 1150, lights: 6, snow: 9000, aniso: 16 },
};

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const C3 = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.LinearSRGBColorSpace);
// time-of-day keys for a Berlin December: h, zenith, horizon, sun colour, sun power, ambient, exposure
const SKY = [
  [0.0, [0.006, 0.010, 0.026], [0.030, 0.036, 0.062], [0.42, 0.52, 0.80], 0.10, 0.11, 1.38],
  [6.6, [0.007, 0.012, 0.030], [0.034, 0.038, 0.066], [0.42, 0.52, 0.80], 0.10, 0.11, 1.75],
  [7.6, [0.030, 0.055, 0.14], [0.22, 0.15, 0.16], [0.9, 0.5, 0.35], 0.25, 0.30, 1.35],
  [8.4, [0.11, 0.19, 0.38], [0.86, 0.50, 0.30], [1.0, 0.56, 0.30], 1.5, 0.62, 1.05],
  [10.0, [0.16, 0.29, 0.56], [0.60, 0.68, 0.78], [1.0, 0.92, 0.80], 3.2, 1.0, 0.92],
  [14.2, [0.16, 0.29, 0.56], [0.62, 0.68, 0.76], [1.0, 0.90, 0.76], 3.0, 1.0, 0.92],
  [15.5, [0.13, 0.22, 0.44], [0.92, 0.60, 0.36], [1.0, 0.62, 0.34], 2.3, 0.78, 1.0],
  [16.3, [0.070, 0.105, 0.25], [0.66, 0.36, 0.26], [1.0, 0.45, 0.25], 0.9, 0.5, 0.98],
  [17.1, [0.022, 0.040, 0.105], [0.10, 0.11, 0.20], [0.6, 0.55, 0.75], 0.16, 0.24, 1.25],
  [18.3, [0.006, 0.010, 0.026], [0.030, 0.036, 0.062], [0.42, 0.52, 0.80], 0.10, 0.11, 1.38],
  [24.0, [0.006, 0.010, 0.026], [0.030, 0.036, 0.062], [0.42, 0.52, 0.80], 0.10, 0.11, 1.38],
];

// ---------------------------------------------------------------- atmosphere
// Every lit material gets fog that is thick in the streets and thins with height, warm in-scatter toward the low sun,
// and the light that the fog scatters around every point light and along the head lamp's beam (single scattering,
// closed form for point lights, five equiangular samples for the spot cone).
THREE.ShaderChunk.fog_pars_fragment += `
#ifndef ATMO_K
#define ATMO_K 0.032
#define ATMO_AIR 0.3
#endif
`;
THREE.ShaderChunk.fog_fragment = /* glsl */`
#ifdef USE_FOG
#if defined( FOG_EXP2 ) && defined( STANDARD )
{
  vec3 vp_ = -vViewPosition; float dist_ = length( vp_ ); vec3 rd_ = vp_ / max( dist_, 1e-4 );
  vec3 wq_ = transpose( mat3( viewMatrix ) ) * ( vp_ - viewMatrix[ 3 ].xyz );
  float hc_ = max( cameraPosition.y, 0.0 ), hf_ = max( wq_.y, 0.0 ), dh_ = hf_ - hc_;
  float hfac_ = abs( dh_ ) > 0.05 ? ( exp( -ATMO_K * hc_ ) - exp( -ATMO_K * hf_ ) ) / ( ATMO_K * dh_ ) : exp( -ATMO_K * hc_ );
  float fogFactor = 1.0 - exp( -fogDensity * dist_ * hfac_ );
  vec3 fc_ = fogColor;
  #if NUM_DIR_LIGHTS > 0
  { float sd_ = max( dot( rd_, directionalLights[ 0 ].direction ), 0.0 ); fc_ += directionalLights[ 0 ].color * ( pow( sd_, 10.0 ) * 0.085 + sd_ * sd_ * 0.016 ); }
  #endif
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fc_, fogFactor );
  vec3 air_ = vec3( 0.0 );
  #ifndef NO_AIRLIGHT
  #if NUM_POINT_LIGHTS > 0
  {
    PointLight pl_;
    #pragma unroll_loop_start
    for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
      pl_ = pointLights[ i ];
      { vec3 L_ = pl_.position; float b_ = dot( L_, rd_ ), h_ = sqrt( max( dot( L_, L_ ) - b_ * b_, 0.0225 ) );
        float a_ = ( atan( ( dist_ - b_ ) / h_ ) + atan( b_ / h_ ) ) / h_;
        float f_ = pl_.distance > 0.0 ? 1.0 - smoothstep( pl_.distance * 0.15, pl_.distance * 0.8, h_ ) : 1.0;
        air_ += pl_.color * ( a_ * f_ * exp( -fogDensity * max( b_, 0.0 ) ) ); }
    }
    #pragma unroll_loop_end
  }
  #endif
  #if NUM_SPOT_LIGHTS > 0
  {
    SpotLight sl_;
    #pragma unroll_loop_start
    for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
      sl_ = spotLights[ i ];
      { vec3 L_ = sl_.position; float b_ = dot( L_, rd_ ), h_ = sqrt( max( dot( L_, L_ ) - b_ * b_, 0.0225 ) );
        float t0_ = atan( -b_ / h_ ), t1_ = atan( ( min( dist_, 45.0 ) - b_ ) / h_ ), acc_ = 0.0;
        for ( int k = 0; k < 5; k ++ ) { float s_ = b_ + h_ * tan( mix( t0_, t1_, ( float( k ) + 0.5 ) * 0.2 ) ); vec3 lv_ = L_ - rd_ * s_; float d_ = length( lv_ );
          acc_ += smoothstep( sl_.coneCos, sl_.penumbraCos, dot( lv_ / max( d_, 1e-3 ), sl_.direction ) ) * ( sl_.distance > 0.0 ? 1.0 - smoothstep( sl_.distance * 0.25, sl_.distance, d_ ) : 1.0 ); }
        air_ += sl_.color * ( acc_ * 0.2 * max( t1_ - t0_, 0.0 ) / h_ * 0.22 ); }
    }
    #pragma unroll_loop_end
  }
  #endif
  #endif
  gl_FragColor.rgb += air_ * ( fogDensity * 0.75 + 0.0011 ) * ATMO_AIR;
}
#elif defined( FOG_EXP2 )
  float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth * 0.7 );
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#else
  float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif
#endif`;

const FS_TRI = (() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2)); return g; })();
const FS_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

const FRAG_HEAD = /* glsl */`
varying vec3 vWPos; varying vec3 vWNrm;
uniform float uTime, uSnowAmt, uWet, uNight; uniform sampler2D uNoise; uniform float uPower[16];
float hash21( vec2 p ){ p = fract( p * vec2( 123.34, 456.21 ) ); p += dot( p, p + 45.32 ); return fract( p.x * p.y ); }
#ifdef FX_FACADE
varying vec4 vFx; uniform vec3 uFac;
#endif
#ifdef FX_GROUND
uniform sampler2D uMask1, uMask2, tAsA, tAsP, tPaA, tPaP, tCoA, tCoP, tSnP; uniform vec4 uMapRect;
#endif
`;
const VERT_HEAD = /* glsl */`
varying vec3 vWPos; varying vec3 vWNrm;
#ifdef FX_FACADE
attribute vec4 aFx; varying vec4 vFx;
#endif
`;
const VERT_BODY = /* glsl */`
{ vec4 wp_ = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
  wp_ = instanceMatrix * wp_;
#endif
  wp_ = modelMatrix * wp_; vWPos = wp_.xyz;
  vec3 wn_ = objectNormal;
#ifdef USE_INSTANCING
  wn_ = mat3( instanceMatrix ) * wn_;
#endif
  vWNrm = normalize( mat3( modelMatrix ) * wn_ );
#ifdef FX_FACADE
  vFx = aFx;
#endif
}`;
const FRAG_FX = /* glsl */`
#ifdef USE_NORMALMAP
  vec4 pk_ = texture2D( normalMap, vNormalMapUv );
  vec3 mapN = vec3( pk_.xy * 2.0 - 1.0, 0.0 ); mapN.xy *= normalScale; mapN.z = sqrt( max( 0.0, 1.0 - dot( mapN.xy, mapN.xy ) ) );
  normal = normalize( tbn * mapN );
  roughnessFactor = clamp( roughness * pk_.b, 0.3, 1.0 );
#else
  vec4 pk_ = vec4( 0.5, 0.5, 1.0, 0.0 );
#endif
vec3 wN_ = normalize( vWNrm );
#ifdef FX_FACADE
{
  float gls_ = pk_.a;
  #ifdef USE_NORMALMAP
  if ( gls_ > 0.5 ) {
    // recessed windows: follow the view ray to the glass plane set back into the wall; outside the opening we see the reveal
    vec3 Vv_ = normalize( vViewPosition ), T_ = normalize( tbn[0] ), B_ = normalize( tbn[1] ), N_ = normalize( tbn[2] );
    vec3 vt_ = vec3( dot( Vv_, T_ ), dot( Vv_, B_ ), dot( Vv_, N_ ) );
    float dep_ = vWPos.y < 4.4 ? 0.3 : 0.2, mpv_ = vWPos.y < 4.4 ? 13.53 : uFac.y * 2.0 / 0.6597;
    vec2 off_ = -vt_.xy / max( vt_.z, 0.22 ) * dep_;
    vec2 uvR_ = vMapUv + vec2( off_.x / max( uFac.z, 1.0 ), off_.y / mpv_ );
    float mR_ = texture2D( normalMap, uvR_ ).a;
    vec3 cR_ = texture2D( map, uvR_ ).rgb;
    #ifdef USE_COLOR
    cR_ *= vColor.rgb;
    #endif
    if ( mR_ > 0.5 ) { diffuseColor.rgb = cR_; }
    else { diffuseColor.rgb = cR_ * 0.5; gls_ = 0.0; roughnessFactor = 0.9; normal = normalize( mix( normal, ( viewMatrix * vec4( 0.0, -1.0, 0.0, 0.0 ) ).xyz * sign( off_.y ) + normal, 0.35 ) ); }
  }
  #endif
  metalnessFactor = gls_ * 0.5;
  float fl_ = floor( ( vWPos.y - 4.4 ) / uFac.y );
  vec2 cell_ = vec2( floor( vMapUv.x * uFac.x ), fl_ ) + vFx.y * 217.0;
  float pw_ = uPower[ int( vFx.x + 0.5 ) ];
  float h_ = hash21( cell_ );
  float frac_ = mix( 0.04, 0.44, pw_ );
  if ( vWPos.y < 4.4 ) frac_ *= 0.55;
  float lit_ = step( 1.0 - frac_, h_ );
  vec3 lc_ = mix( vec3( 1.0, 0.60, 0.28 ), vec3( 1.0, 0.82, 0.58 ), hash21( cell_ + 7.3 ) );
  lc_ = mix( lc_, vec3( 0.60, 0.76, 1.0 ), step( 0.9, hash21( cell_ + 1.7 ) ) );
  float flick_ = pw_ > 0.5 ? 1.0 : 0.72 + 0.28 * sin( uTime * 6.0 + h_ * 60.0 ) * sin( uTime * 2.3 + h_ * 11.0 );
  totalEmissiveRadiance += gls_ * lit_ * lc_ * ( 0.05 + 0.95 * uNight ) * flick_ * mix( 1.1, 3.0, pw_ ) * ( 0.3 + dot( diffuseColor.rgb, vec3( 0.6 ) ) * 2.2 );
  diffuseColor.rgb *= 1.0 - gls_ * lit_ * 0.5 * uNight;
}
#endif
#ifdef FX_GROUND
{
  vec2 gp_ = vWPos.xz; vec2 mu_ = ( gp_ - uMapRect.xy ) / uMapRect.zw;
  vec3 m1_ = texture2D( uMask1, mu_ ).rgb; vec3 m2_ = texture2D( uMask2, mu_ ).rgb;
  float dRoad = ( m1_.r - 0.50196 ) * 31.875, dWat = ( m1_.g - 0.50196 ) * 31.875, dPark = ( m1_.b - 0.50196 ) * 31.875;
  float dCob = ( m2_.r - 0.50196 ) * 31.875, dSol = ( m2_.g - 0.50196 ) * 31.875, dCl = m2_.b * 15.9375;
  float inb_ = step( 0.0, mu_.x ) * step( mu_.x, 1.0 ) * step( 0.0, mu_.y ) * step( mu_.y, 1.0 );
  dRoad = mix( -9.0, dRoad, inb_ ); dWat = mix( -9.0, dWat, inb_ ); dPark = mix( 6.0, dPark, inb_ ); dCob = mix( -9.0, dCob, inb_ ); dSol = mix( -9.0, dSol, inb_ ); dCl = mix( 9.0, dCl, inb_ );
  if ( dWat > 1.2 ) discard;
  vec3 nz_ = texture2D( uNoise, gp_ * 0.011 ).rgb; vec3 nz2_ = texture2D( uNoise, gp_ * 0.09 ).rgb; float n3p_ = texture2D( uNoise, gp_ * 0.045 + 0.31 ).g;
  dRoad += ( nz2_.g - 0.5 ) * 0.05;
  float road = smoothstep( -0.05, 0.05, dRoad );
  float cob = smoothstep( -0.08, 0.08, dCob ) * ( 1.0 - road );
  float park = smoothstep( -0.4, 0.4, dPark + ( nz2_.r - 0.5 ) * 0.8 );
  vec3 aA = texture2D( tAsA, gp_ * 0.2 ).rgb; vec4 aP = texture2D( tAsP, gp_ * 0.2 );
  { vec3 aLo_ = texture( tAsA, gp_ * 0.2, 7.0 ).rgb; aA = max( aA - aLo_ + vec3( dot( aLo_, vec3( 0.3333 ) ) ), vec3( 0.0 ) ); }    // flatten the photo's patch repairs so the tiling does not show
  vec3 pA = texture2D( tPaA, gp_ * 0.25 ).rgb; vec4 pP = texture2D( tPaP, gp_ * 0.25 );
  vec3 cA = texture2D( tCoA, gp_ * 0.3333 ).rgb; vec4 cP = texture2D( tCoP, gp_ * 0.3333 );
  vec4 sP = texture2D( tSnP, gp_ * 0.1667 );
  vec3 alb = mix( pA, cA, cob ); vec4 pk = mix( pP, cP, cob );
  alb = mix( alb, aA, road ); pk = mix( pk, aP, road );
  alb *= 0.82 + 0.36 * nz_.g;
  float kerb = smoothstep( 0.0, 0.04, -dRoad ) * ( 1.0 - smoothstep( 0.17, 0.21, -dRoad ) );
  alb = mix( alb, vec3( 0.30, 0.295, 0.29 ) * ( 0.75 + 0.5 * nz2_.b ), kerb * ( 1.0 - cob * 0.5 ) );
  float cl = ( 1.0 - smoothstep( 0.07, 0.12, dCl ) ) * road * smoothstep( 0.35, 0.6, nz2_.r + nz_.g * 0.5 );
  alb = mix( alb, vec3( 0.55 ), cl * 0.7 );
  vec3 soil = mix( mix( vec3( 0.07, 0.062, 0.045 ), vec3( 0.14, 0.13, 0.075 ), nz2_.g ), vec3( 0.19, 0.17, 0.10 ), smoothstep( 0.45, 0.7, nz_.b ) * 0.7 ) * ( 0.6 + 0.8 * nz2_.b );
  alb = mix( alb, mix( soil, vec3( 0.3, 0.31, 0.33 ), 0.45 ), park ); pk = mix( pk, vec4( 0.5, 0.5, 0.95, 0.0 ), park );
  float ao = smoothstep( -1.7, 0.0, dSol );
  alb *= 1.0 - ao * 0.5;
  float pud = smoothstep( 0.6, 0.72, n3p_ * 0.55 + nz_.r * 0.3 + nz2_.b * 0.15 + ( pk.a - 0.5 ) * 0.12 ) * uWet * ( 1.0 - park ) * ( 1.0 - cob * 0.6 );
  float rgh = mix( pk.b * mix( 1.0, 0.62, uWet ), 0.16, pud ); alb *= 1.0 - pud * 0.55 - uWet * 0.3;
  vec2 nxy = ( pk.xy * 2.0 - 1.0 ) * ( 1.0 - pud );
  // winter streets a few days after snowfall: ploughed carriageways with clear wheel tracks and slush between them,
  // dirty banks along the kerb, trampled pavements with bare wet patches, clean snow on lawns and against walls
  float side_ = ( 1.0 - road ) * ( 1.0 - park );
  float kerbBank = side_ * ( 1.0 - smoothstep( 0.15, 1.35, -dRoad + ( nz2_.r - 0.5 ) * 0.5 ) );
  float wallBank = side_ * smoothstep( -1.6, -0.25, dSol + ( nz2_.g - 0.5 ) * 0.6 );
  float lane_ = abs( sin( dCl * 1.7453 + 0.3 ) );                                  // wheel tracks ~1.8 m apart
  float tracks = road * smoothstep( 0.55, 0.9, lane_ ) * ( 1.0 - smoothstep( 0.4, 1.3, dRoad ) * 0.0 );
  float gutter = road * ( 1.0 - smoothstep( 0.2, 1.1, dRoad ) );
  float sc = sP.a * 0.5 + nz_.b * 0.5, n3_ = texture2D( uNoise, gp_ * 0.37 ).r;
  float amt = uSnowAmt;
  float cRoad = road * clamp( ( 0.15 + 0.55 * ( 1.0 - smoothstep( 0.3, 0.7, lane_ ) ) + gutter * 0.6 ) * amt + ( n3_ - 0.5 ) * 0.25, 0.0, 1.0 );
  float cSide = side_ * clamp( ( 0.2 + ( sc - 0.5 ) * 1.5 + ( n3_ - 0.5 ) * 0.55 ) * amt * 1.2, 0.0, 1.0 );
  float cov = max( max( cRoad, cSide ), max( kerbBank * smoothstep( 0.2, 0.35, amt ), wallBank * 0.9 * amt ) );
  cov = max( cov, park * smoothstep( 0.15, 0.55, amt * 0.95 + ( sc - 0.5 ) * 0.45 + ( n3_ - 0.5 ) * 0.2 - smoothstep( 0.55, 0.8, nz_.r ) * 0.32 ) );
  cov = smoothstep( 0.35, 0.65, cov ) * ( 1.0 - pud * 0.7 );
  float dirt = clamp( road * 0.75 + kerbBank * 0.55 + side_ * ( 1.0 - wallBank ) * 0.35 - park, 0.0, 1.0 ) * ( 0.75 + 0.5 * nz2_.b );
  vec3 fresh = vec3( 0.6, 0.635, 0.69 ) * ( 0.86 + 0.2 * sP.b ) * ( 0.88 + 0.16 * nz_.r );
  vec3 grey = mix( vec3( 0.40, 0.405, 0.415 ), vec3( 0.29, 0.275, 0.25 ), nz2_.r * 0.7 );
  vec3 slush = vec3( 0.2, 0.198, 0.19 ) * ( 0.8 + 0.35 * n3_ );
  vec3 snowC = mix( fresh, grey, clamp( dirt, 0.0, 1.0 ) );
  snowC = mix( snowC, slush, road * ( 1.0 - kerbBank ) * 0.75 );
  alb = mix( alb, snowC, cov );
  alb *= 1.0 - tracks * ( 1.0 - cov ) * 0.25;                                       // tracks: darker, wetter asphalt
  rgh = mix( rgh, 0.3, tracks * ( 1.0 - cov ) * uWet * 0.8 );
  rgh = mix( rgh, mix( 0.82, 0.38, road * ( 1.0 - kerbBank ) ), cov );
  rgh = mix( rgh, 0.78 - 0.3 * step( 0.975, nz2_.b * 0.6 + sP.b * 0.42 ), cov * park );
  nxy = mix( nxy, ( sP.xy * 2.0 - 1.0 ) * ( 0.6 + 0.6 * ( kerbBank + park ) ), cov );
  diffuseColor.rgb = alb; roughnessFactor = clamp( rgh, 0.14, 1.0 ); metalnessFactor = 0.0;
  normal = normalize( ( viewMatrix * vec4( normalize( vec3( nxy.x, 1.0, nxy.y ) ), 0.0 ) ).xyz );
}
#endif
#ifdef FX_WATER
{
  vec2 wp2 = vWPos.xz;
  vec3 n1 = texture2D( uNoise, wp2 * 0.035 + uTime * vec2( 0.006, 0.004 ) ).rgb, n2 = texture2D( uNoise, wp2 * 0.11 - uTime * vec2( 0.011, 0.007 ) ).rgb;
  float ice = smoothstep( 0.50, 0.56, texture2D( uNoise, wp2 * 0.012 + uTime * 0.0006 ).r + ( n2.g - 0.5 ) * 0.12 );
  vec2 rip = ( n1.xy + n2.yz - 1.0 ) * 0.22 * ( 1.0 - ice );
  diffuseColor.rgb = mix( vec3( 0.010, 0.018, 0.024 ), vec3( 0.60, 0.66, 0.72 ) * ( 0.8 + 0.3 * n2.b ), ice );
  roughnessFactor = mix( 0.2, 0.75, ice ); metalnessFactor = 0.0;
  normal = normalize( ( viewMatrix * vec4( normalize( vec3( rip.x, 1.0, rip.y ) ), 0.0 ) ).xyz );
}
#endif
#ifdef FX_SNOW
{
  float sn_ = texture2D( uNoise, vWPos.xz * 0.045 ).r * 0.6 + texture2D( uNoise, vWPos.xz * 0.31 ).g * 0.4;
  float cov_ = smoothstep( 0.60, 0.86, wN_.y ) * smoothstep( 0.42, 0.58, sn_ * 0.55 + uSnowAmt * FX_SNOW );
  diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.70, 0.745, 0.81 ), cov_ );
  roughnessFactor = mix( roughnessFactor, 0.82, cov_ ); metalnessFactor *= 1.0 - cov_;
  normal = normalize( mix( normal, normalize( ( viewMatrix * vec4( wN_, 0.0 ) ).xyz ), cov_ * 0.85 ) );
}
#endif
`;

export class Gfx {
  constructor(canvas, tier) {
    this.canvas = canvas; this.tier = tier; this.q = { ...QUALITY[tier] };
    if (tier === 'low' && !THREE.ShaderChunk.fog_pars_fragment.includes('NO_AIRLIGHT')) THREE.ShaderChunk.fog_pars_fragment += '\n#define NO_AIRLIGHT\n';      // phones on the lowest tier skip light scattering
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false });
    r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.NoToneMapping;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.shadowMap.autoUpdate = true;
    r.info.autoReset = false;
    this.maxAniso = Math.min(this.q.aniso, r.capabilities.getMaxAnisotropy());
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(58, 1, 0.12, this.q.far);
    this.scene.add(this.camera);
    this.U = { uTime: { value: 0 }, uSnowAmt: { value: 0.72 }, uWet: { value: 0.6 }, uNight: { value: 0 }, uNoise: { value: null }, uPower: { value: new Float32Array(16) } };
    this.tex = {}; this.matCache = {};
    this.time = 15.75; this.timeScale = 1 / 110;        // game hours per real second (one day ~ 44 min)
    this.weather = { snow: 0.4, fog: 0.16, cloud: 0.45, tSnow: 0.4, tFog: 0.16, tCloud: 0.45, timer: 150 };
    this.scale = 1; this.frameMs = 16; this.dynT = 0; this.fixedScale = null; this.bloomOn = true;
    this._lights(); this._sky(); this._post();
    this.resize();
  }

  // ---------------------------------------------------------------- textures
  async loadTextures(meta, base, onStep) {
    const div = this.q.texDiv; const names = Object.keys(meta).filter((n) => !n.startsWith('_') && !/^f\d_[ug]$/.test(n));
    const total = names.length + meta._styles.length + 5; let done = 0; const step = () => onStep && onStep(++done / total);
    const img = (f) => loadImage(base + f);
    const noiseT = new THREE.Texture(await img('noise.png')); noiseT.wrapS = noiseT.wrapT = THREE.RepeatWrapping; noiseT.colorSpace = THREE.NoColorSpace; noiseT.needsUpdate = true;
    this.U.uNoise.value = this.tex.noise = noiseT; step();
    for (const n of names) {
      const [a, p] = await Promise.all([img(n + '_a.jpg'), img(n + '_p.jpg')]); const m = meta[n];
      const w = m.w / div, hh = m.h / div;
      this.tex[n] = { map: this._albedo(a, w, hh), pk: this._pack([{ im: p, w, h: hh, sx: w / m.mw, sy: hh / m.mh, hr: m.hr }], w, hh), mw: m.mw, mh: m.mh };
      step(); await new Promise((r) => setTimeout(r, 0));
    }
    for (const s of meta._styles) {
      const [ua, up, ga, gp] = await Promise.all([img(s.n + '_u_a.jpg'), img(s.n + '_u_p.jpg'), img(s.n + '_g_a.jpg'), img(s.n + '_g_p.jpg')]);
      const w = 1024 / div, hu = 512 / div, hg = 256 / div;
      const c = document.createElement('canvas'); c.width = w; c.height = hu + hg; const x = c.getContext('2d'); x.drawImage(ua, 0, 0, w, hu); x.drawImage(ga, 0, hu, w, hg);
      const mu = meta[s.n + '_u'], mg = meta[s.n + '_g'];
      this.tex[s.n] = { map: this._albedo(c, w, hu + hg), pk: this._pack([{ im: up, w, h: hu, sx: w / mu.mw, sy: hu / mu.mh, hr: mu.hr }, { im: gp, w, h: hg, sx: w / mg.mw, sy: hg / mg.mh, hr: mg.hr }], w, hu + hg), mw: s.mw, fh: s.fh, bays: s.bays };
      step(); await new Promise((r) => setTimeout(r, 0));
    }
    const mk = async (f, srgb) => { const t = new THREE.Texture(await img(f)); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.needsUpdate = true; step(); return t; };
    this.tex.tree = await mk('tree.png', true); this.tex.decals = await mk('decals.png', true);
    this.tex.tree.anisotropy = 4;
    try {                                   // Potsdamer Platz panorama (Poly Haven, CC0) lights the reflections
      const e = imagePixels(await img('env.jpg')); const W = e.width, H = e.height, d = new Uint16Array(W * H * 4);
      for (let y = 0; y < H; y++) for (let x2 = 0; x2 < W; x2++) {
        const s = (y * W + x2) * 4, o = ((H - 1 - y) * W + x2) * 4;
        for (let k = 0; k < 3; k++) { const v = e.data[s + k] / 255; d[o + k] = THREE.DataUtils.toHalfFloat(v * v * 64); }
        d[o + 3] = THREE.DataUtils.toHalfFloat(1);
      }
      const t = new THREE.DataTexture(d, W, H, THREE.RGBAFormat, THREE.HalfFloatType); t.mapping = THREE.EquirectangularReflectionMapping; t.magFilter = t.minFilter = THREE.LinearFilter; t.colorSpace = THREE.LinearSRGBColorSpace; t.needsUpdate = true;
      const pm = new THREE.PMREMGenerator(this.renderer); this.scene.environment = pm.fromEquirectangular(t).texture; t.dispose(); pm.dispose();
    } catch (e) { console.warn('env map unavailable', e); }
    step();
  }
  _albedo(src, w, h) {
    let s = src;
    if ((src.naturalWidth || src.width) !== w) { s = document.createElement('canvas'); s.width = w; s.height = h; s.getContext('2d').drawImage(src, 0, 0, w, h); }
    const t = new THREE.Texture(s); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = this.maxAniso; t.needsUpdate = true; return t;
  }
  // stack of parameter images (R height, G roughness, B mask) -> RG tangent normal, B roughness, A mask
  _pack(parts, W, H) {
    const out = new Uint8Array(W * H * 4); let y0 = 0;
    for (const p of parts) {
      const d = imagePixels(p.im, p.w, p.h).data, w = p.w, h = p.h, kx = p.hr * p.sx * 0.5 / 255 * 1.35, ky = p.hr * p.sy * 0.5 / 255 * 1.35;
      for (let y = 0; y < h; y++) {
        const yu = (y + h - 1) % h, yd = (y + 1) % h, row = (H - 1 - (y0 + y)) * W;
        for (let x = 0; x < w; x++) {
          const xl = (x + w - 1) % w, xr = (x + 1) % w, i = (y * w + x) * 4;
          let nx = -(d[(y * w + xr) * 4] - d[(y * w + xl) * 4]) * kx, ny = (d[(yd * w + x) * 4] - d[(yu * w + x) * 4]) * ky;
          const il = 1 / Math.sqrt(nx * nx + ny * ny + 1); nx *= il; ny *= il;
          const o = (row + x) * 4;
          out[o] = nx * 127.5 + 127.5; out[o + 1] = ny * 127.5 + 127.5; out[o + 2] = d[i + 1]; out[o + 3] = d[i + 2];
        }
      }
      y0 += p.h;
    }
    const t = new THREE.DataTexture(out, W, H, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = true; t.anisotropy = this.maxAniso; t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true; return t;
  }
  maskTexture(im) { const t = new THREE.Texture(im); t.flipY = false; t.colorSpace = THREE.NoColorSpace; t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true; return t; }

  // ---------------------------------------------------------------- materials
  patch(mat, defs = {}, extra = null) {
    mat.defines = Object.assign(mat.defines || {}, defs);
    const key = Object.keys(defs).sort().map((k) => k + defs[k]).join('|') + (extra ? extra.key : '');
    mat.customProgramCacheKey = () => 'fx|' + key;
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.U); if (extra) Object.assign(sh.uniforms, extra.uniforms);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + VERT_HEAD).replace('#include <project_vertex>', '#include <project_vertex>\n' + VERT_BODY);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + FRAG_HEAD).replace('#include <normal_fragment_maps>', FRAG_FX);
    };
    return mat;
  }
  surf(name, o = {}) {
    const key = 's:' + name + JSON.stringify(o); if (this.matCache[key]) return this.matCache[key];
    const t = this.tex[name];
    const m = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.pk, roughness: o.rough ?? 1, metalness: o.metal ?? 0, color: o.color ?? 0xffffff, vertexColors: !!o.vcol, side: o.side ?? THREE.FrontSide, envMapIntensity: o.env ?? 1 });
    if (o.nScale) m.normalScale.set(o.nScale, o.nScale);
    const d = {}; if (o.snow !== 0) d.FX_SNOW = (o.snow ?? 1).toFixed(2);
    return (this.matCache[key] = this.patch(m, d));
  }
  facade(i) {
    const key = 'f:' + i; if (this.matCache[key]) return this.matCache[key];
    const t = this.tex['f' + i];
    const m = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.pk, roughness: 1, metalness: 0, vertexColors: true });
    m.map.wrapT = m.normalMap.wrapT = THREE.ClampToEdgeWrapping;
    return (this.matCache[key] = this.patch(m, { FX_FACADE: 1 }, { key: 'f' + i, uniforms: { uFac: { value: V3(t.bays, t.fh, t.mw || 10) } } }));
  }
  ground(mask1, mask2, rect) {
    const T = this.tex, m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
    return this.patch(m, { FX_GROUND: 1 }, { key: 'g', uniforms: { uMask1: { value: mask1 }, uMask2: { value: mask2 }, uMapRect: { value: new THREE.Vector4(...rect) },
      tAsA: { value: T.asphalt.map }, tAsP: { value: T.asphalt.pk }, tPaA: { value: T.paving.map }, tPaP: { value: T.paving.pk }, tCoA: { value: T.cobble.map }, tCoP: { value: T.cobble.pk }, tSnP: { value: T.snow.pk } } });
  }
  water() { return this.patch(new THREE.MeshStandardMaterial({ color: 0x0a1418, roughness: 0.08, metalness: 0 }), { FX_WATER: 1 }); }
  vcol(o = {}) {
    const key = 'v:' + JSON.stringify(o); if (this.matCache[key]) return this.matCache[key];
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: o.rough ?? 0.7, metalness: o.metal ?? 0.0, side: o.side ?? THREE.FrontSide, emissive: o.emissive ?? 0x000000 });
    const d = {}; if (o.snow !== 0) d.FX_SNOW = (o.snow ?? 1).toFixed(2);
    return (this.matCache[key] = this.patch(m, d));
  }
  glow() {                                      // street-lamp halos; brightness follows the district's grid state
    if (this._glow) return this._glow;
    return (this._glow = new THREE.ShaderMaterial({
      uniforms: { uNight: this.U.uNight, uPower: this.U.uPower, uPx: { value: 1 }, uTime: this.U.uTime, uFogK: { value: 0.004 } },
      vertexShader: `attribute vec3 aG; uniform float uNight, uPx, uTime, uFogK; uniform float uPower[16]; varying vec3 vC; varying float vA; varying float vH;
        void main(){ vec4 mv = modelViewMatrix * vec4( position, 1.0 ); gl_Position = projectionMatrix * mv;
          float pw = aG.x < 0.0 ? 1.0 : uPower[ int( aG.x + 0.5 ) ]; float on = aG.x < -1.5 ? mix( 0.05, 1.0, smoothstep( 0.1, 0.5, uNight ) ) : pw * smoothstep( 0.18, 0.5, uNight );
          vA = on * ( 0.9 + 0.1 * sin( uTime * 9.0 + position.x ) ); float pi_ = floor( aG.y - 3.0 + 0.5 ); vC = aG.y > 2.5 ? ( pi_ < 0.5 ? vec3( 1.0, 0.13, 0.08 ) : pi_ < 1.5 ? vec3( 0.18, 1.0, 0.32 ) : pi_ < 2.5 ? vec3( 1.0, 0.72, 0.22 ) : pi_ < 3.5 ? vec3( 0.25, 0.45, 1.0 ) : vec3( 1.0, 0.45, 0.12 ) * ( 0.75 + 0.25 * sin( uTime * 23.0 + position.x * 7.0 ) ) ) * ( 0.65 + 0.35 * sin( uTime * 2.6 + position.x * 1.9 + position.z * 1.3 ) ) : aG.y > 1.5 ? vec3( 1.0, 0.10, 0.06 ) * ( 0.5 + 0.5 * step( 0.0, sin( uTime * 3.0 ) ) ) : mix( vec3( 1.0, 0.70, 0.36 ), vec3( 0.80, 0.90, 1.0 ), aG.y );
          float dd = max( 1.0, -mv.z ), sp = 1.0 + clamp( uFogK * dd * 3.0, 0.0, 2.6 ); vH = clamp( uFogK * dd * 2.0, 0.0, 1.0 ); vA *= exp( -uFogK * dd * 0.6 ) * ( 0.8 + vH * 0.5 );
          gl_PointSize = clamp( aG.z * sp * uPx / dd, 2.0, 260.0 ) * step( 0.01, on ); }`,
      fragmentShader: `varying vec3 vC; varying float vA; varying float vH; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length( d ) * 2.0; float a = exp( -r * r * mix( 9.0, 30.0, vH ) ) + pow( max( 0.0, 1.0 - r ), mix( 2.4, 1.6, vH ) ) * mix( 0.22, 0.4, vH ); if ( a < 0.004 ) discard; gl_FragColor = vec4( vC * a * vA * 5.0, 1.0 ); }`,
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false,
    }));
  }
  pools() {                                     // light spilled on the ground below each lamp
    if (this._pools) return this._pools;
    return (this._pools = new THREE.ShaderMaterial({
      uniforms: { uNight: this.U.uNight, uPower: this.U.uPower },
      vertexShader: `attribute vec3 aG; uniform float uNight; uniform float uPower[16]; varying vec2 vUv; varying vec3 vC;
        void main(){ vUv = uv; float pw = aG.x < 0.0 ? 1.0 : uPower[ int( aG.x + 0.5 ) ]; vC = ( aG.y > 2.5 ? vec3( 1.0, 0.12, 0.06 ) * ( 0.8 + 0.2 * sin( position.x * 3.0 ) ) : mix( vec3( 1.0, 0.66, 0.32 ), vec3( 0.75, 0.86, 1.0 ), aG.y ) ) * pw * smoothstep( 0.18, 0.55, uNight ) * aG.z;
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`,
      fragmentShader: `varying vec2 vUv; varying vec3 vC; void main(){ float r = length( vUv - 0.5 ) * 2.0; float a = pow( max( 0.0, 1.0 - r ), 2.0 ); gl_FragColor = vec4( vC * a, 1.0 ); }`,
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    }));
  }

  // ---------------------------------------------------------------- light rig
  _lights() {
    const s = this.scene;
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1); s.add(this.hemi);
    const sun = this.sun = new THREE.DirectionalLight(0xffffff, 1); sun.castShadow = true;
    sun.shadow.mapSize.set(this.q.shadow, this.q.shadow); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.05; sun.shadow.radius = 2.2;
    const d = this.q.shadowDist, c = sun.shadow.camera; c.left = -d; c.right = d; c.top = d; c.bottom = -d; c.near = 1; c.far = 700; c.updateProjectionMatrix();
    s.add(sun); s.add(sun.target);
    this.lamps = [];
    for (let i = 0; i < this.q.lights; i++) { const l = new THREE.PointLight(0xffb060, 0, 30, 1.7); l.position.set(0, -50, 0); s.add(l); this.lamps.push(l); }
    this.muzzle = new THREE.PointLight(0xffc070, 0, 14, 2); s.add(this.muzzle);
    this.head = new THREE.SpotLight(0xdfeaff, 0, 42, 0.52, 0.55, 1.4); this.head.castShadow = false; s.add(this.head); s.add(this.head.target);
    s.fog = new THREE.FogExp2(0x8090a0, 0.004);
    this.sunDir = V3(0, 1, 0);
  }
  setLamps(list) {                              // [{x,y,z,i,c}] nearest powered lamps
    for (let i = 0; i < this.lamps.length; i++) {
      const l = this.lamps[i], p = list[i];
      if (p) { l.position.set(p.x, p.y, p.z); l.intensity = p.i; if (p.c != null) l.color.setHex(p.c); } else l.intensity = 0;
    }
  }

  // ---------------------------------------------------------------- sky
  _sky() {
    const u = this.skyU = { uSunDir: { value: V3(0, 1, 0) }, uSunCol: { value: C3(1, 1, 1) }, uSunL: { value: C3(0, 0, 0) }, uZen: { value: C3(0, 0, 0) }, uHor: { value: C3(0, 0, 0) }, uFog: { value: C3(0.3, 0.33, 0.38) }, uFogD: { value: 0.004 }, uCloud: { value: 0.5 }, uNight: this.U.uNight, uTime: this.U.uTime, uNoise: this.U.uNoise, uGlow: { value: 0 } };
    const m = new THREE.ShaderMaterial({
      uniforms: u, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); gl_Position = p.xyww; }',
      fragmentShader: /* glsl */`
        varying vec3 vD; uniform vec3 uSunDir, uSunCol, uSunL, uZen, uHor, uFog; uniform float uCloud, uNight, uTime, uGlow, uFogD; uniform sampler2D uNoise;
        float hash( vec3 p ){ p = fract( p * 0.3183099 + 0.1 ); p *= 17.0; return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) ); }
        float fbm( vec2 p ){ float a = 0.0, w = 0.5; for ( int i = 0; i < 5; i ++ ) { a += texture2D( uNoise, p ).r * w; p = p * 2.07 + vec2( 0.173, 0.311 ); w *= 0.5; } return a * 1.032; }
        void main(){
          vec3 d = normalize( vD ); float h = max( d.y, 0.0 ), sd = max( dot( d, uSunDir ), 0.0 );
          float away = 0.5 - 0.5 * dot( normalize( d.xz + 1e-4 ), normalize( uSunDir.xz + 1e-4 ) );
          vec3 hor = mix( uHor, mix( uHor, uZen, 0.45 ) * 1.05, away * 0.8 );
          vec3 col = mix( hor, uZen, pow( h, 0.48 ) );
          col += vec3( 1.0, 0.55, 0.28 ) * uGlow * pow( 1.0 - h, 8.0 ) * 0.03;
          col += uSunCol * ( pow( sd, 900.0 ) * 5.0 * ( 1.0 - uCloud * 0.6 ) + pow( sd, 40.0 ) * 0.26 + pow( sd, 4.5 ) * 0.075 );
          vec2 cu = d.xz / ( d.y + 0.11 ) * 0.15 + uTime * vec2( 0.0011, 0.00035 );
          vec2 wq = vec2( texture2D( uNoise, cu * 0.55 ).g, texture2D( uNoise, cu * 0.55 + 0.37 ).b ) - 0.5;
          float c = fbm( cu + wq * 0.3 );
          float dens = smoothstep( 0.66 - uCloud * 0.44, 0.9 - uCloud * 0.44, c ) * smoothstep( -0.03, 0.16, d.y );
          float thick = smoothstep( 0.5, 1.02, c + uCloud * 0.22 );
          vec3 lit = hor * 1.08 + uSunCol * 0.16 * pow( sd, 2.0 );
          vec3 shade = uZen * 0.42 + hor * 0.2;
          vec3 cc = mix( lit, shade, thick );
          cc += uSunCol * pow( sd, 7.0 ) * ( 1.0 - thick ) * 0.4;
          cc += vec3( 1.0, 0.55, 0.3 ) * uGlow * uNight * 0.005 * ( 1.0 - h * 0.6 ) * ( 0.4 + thick );
          col = mix( col, cc, dens * 0.96 );
          vec3 sp = floor( d * 240.0 ); float st = step( 0.9982, hash( sp ) ) * uNight * ( 1.0 - dens ) * smoothstep( 0.05, 0.4, d.y );
          col += vec3( 0.8, 0.9, 1.0 ) * st * 0.35;
          vec3 fc = uFog + uSunL * ( pow( sd, 10.0 ) * 0.085 + sd * sd * 0.016 );
          col = mix( col, fc, clamp( exp( -h * ( 5.0 + 8.0 * ( 1.0 - min( uFogD * 160.0, 1.0 ) ) ) ) * 0.95, 0.0, 1.0 ) );
          col = mix( col, fc * 0.92, smoothstep( 0.0, -0.08, d.y ) );
          gl_FragColor = vec4( col, 1.0 );
        }`,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), m); this.sky.frustumCulled = false; this.sky.renderOrder = -10; this.sky.scale.setScalar(this.q.far * 0.9);
    this.scene.add(this.sky);
    this.envScene = new THREE.Scene(); const es = new THREE.Mesh(this.sky.geometry, m); es.scale.setScalar(200); es.frustumCulled = false; this.envScene.add(es); this.envAt = -99; this.envKey = '';
    const N = this.q.snow, g = new THREE.BufferGeometry(), p = new Float32Array(N * 3), a = new Float32Array(N);
    for (let i = 0; i < N; i++) { p[i * 3] = Math.random() * 48; p[i * 3 + 1] = Math.random() * 30; p[i * 3 + 2] = Math.random() * 48; a[i] = Math.random(); }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('aR', new THREE.BufferAttribute(a, 1));
    this.snowU = { uTime: this.U.uTime, uCam: { value: V3() }, uAmt: { value: 1 }, uPx: { value: 1 }, uLight: { value: C3(1, 1, 1) }, uWind: { value: V3(1.4, -2.2, 0.6) } };
    this.snow = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: this.snowU, transparent: true, depthWrite: false, fog: false,
      vertexShader: `attribute float aR; uniform float uTime, uAmt, uPx; uniform vec3 uCam, uWind; varying float vA;
        void main(){ vec3 p = position + uWind * uTime * ( 0.6 + aR * 0.8 ); p.x += sin( uTime * 0.9 + aR * 40.0 ) * 0.5; p.z += cos( uTime * 0.7 + aR * 31.0 ) * 0.5;
          vec3 s = vec3( 48.0, 30.0, 48.0 ); p = mod( p - uCam + s * 0.5, s ) - s * 0.5 + uCam;
          vec4 mv = modelViewMatrix * vec4( p, 1.0 ); gl_Position = projectionMatrix * mv; float dd = -mv.z;
          vA = step( aR, uAmt ) * smoothstep( 24.0, 16.0, dd ) * smoothstep( 0.3, 1.4, dd ); gl_PointSize = clamp( ( 0.035 + aR * 0.04 ) * uPx / max( 0.4, dd ), 1.0, 14.0 ); }`,
      fragmentShader: 'uniform vec3 uLight; varying float vA; void main(){ float r = length( gl_PointCoord - 0.5 ) * 2.0; float a = smoothstep( 1.0, 0.25, r ) * vA * 0.85; if ( a < 0.01 ) discard; gl_FragColor = vec4( uLight, a ); }',
    }));
    this.snow.frustumCulled = false; this.snow.renderOrder = 20; this.scene.add(this.snow);
  }

  // ---------------------------------------------------------------- post
  _post() {
    this.rt = null; this.bl = [];
    this.fsScene = new THREE.Scene(); this.fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.fsMesh = new THREE.Mesh(FS_TRI, null); this.fsMesh.frustumCulled = false; this.fsScene.add(this.fsMesh);
    const mk = (uniforms, frag) => new THREE.ShaderMaterial({ uniforms, vertexShader: FS_VERT, fragmentShader: frag, depthTest: false, depthWrite: false });
    this.mDown = mk({ t: { value: null }, px: { value: new THREE.Vector2() }, first: { value: 0 } }, /* glsl */`
      varying vec2 vUv; uniform sampler2D t; uniform vec2 px; uniform float first;
      void main(){ vec3 a = texture2D( t, vUv + px * vec2( -1.0, -1.0 ) ).rgb, b = texture2D( t, vUv + px * vec2( 1.0, -1.0 ) ).rgb, c = texture2D( t, vUv + px * vec2( -1.0, 1.0 ) ).rgb, d = texture2D( t, vUv + px * vec2( 1.0, 1.0 ) ).rgb, e = texture2D( t, vUv ).rgb;
        if ( first > 0.5 ) { a = min( a, vec3( 6.0 ) ); b = min( b, vec3( 6.0 ) ); c = min( c, vec3( 6.0 ) ); d = min( d, vec3( 6.0 ) ); e = min( e, vec3( 6.0 ) ); }
        vec3 s = ( a + b + c + d ) * 0.2 + e * 0.2;
        if ( first > 0.5 ) { float l = max( s.r, max( s.g, s.b ) ); s *= smoothstep( 0.8, 2.0, l ) + 0.025; s = min( s, vec3( 24.0 ) ); }
        gl_FragColor = vec4( s, 1.0 ); }`);
    this.mUp = mk({ t: { value: null }, px: { value: new THREE.Vector2() } }, /* glsl */`
      varying vec2 vUv; uniform sampler2D t; uniform vec2 px;
      void main(){ vec3 s = texture2D( t, vUv + px * vec2( -1.0, -1.0 ) ).rgb + texture2D( t, vUv + px * vec2( 1.0, -1.0 ) ).rgb + texture2D( t, vUv + px * vec2( -1.0, 1.0 ) ).rgb + texture2D( t, vUv + px * vec2( 1.0, 1.0 ) ).rgb;
        gl_FragColor = vec4( s * 0.25, 1.0 ); }`);
    this.mUp.blending = THREE.AdditiveBlending; this.mUp.transparent = true;
    this.mFin = mk({ t: { value: null }, b: { value: null }, uExp: { value: 1 }, uBloom: { value: 0.085 }, uTime: this.U.uTime, uHurt: { value: 0 }, uTint: { value: C3(0.0, 0.012, 0.03) }, uSat: { value: 0.92 }, uFade: { value: 0 }, uAspect: { value: 1 }, uGrain: { value: 1 }, uSplit: { value: 1 } }, /* glsl */`
      varying vec2 vUv; uniform sampler2D t, b; uniform float uExp, uBloom, uTime, uHurt, uSat, uFade, uAspect, uGrain, uSplit; uniform vec3 uTint;
      float h( vec2 p ){ return fract( sin( dot( p, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 ); }
      void main(){
        vec2 cuv = vUv - 0.5; float rr = dot( cuv, cuv );
        vec2 ca = cuv * rr * 0.012;
        vec3 c = vec3( texture2D( t, vUv - ca ).r, texture2D( t, vUv ).g, texture2D( t, vUv + ca ).b );
        c += texture2D( b, vUv ).rgb * uBloom;
        c *= uExp;
        c = ( c * ( 2.51 * c + 0.03 ) ) / ( c * ( 2.43 * c + 0.59 ) + 0.14 );
        float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
        c = mix( vec3( l ), c, uSat );
        c += uTint * ( 1.0 - l ) * ( 1.0 - l );
        c += vec3( -0.010, 0.004, 0.020 ) * ( 1.0 - l ) * ( 1.0 - l ) * uSplit + vec3( 0.030, 0.010, -0.022 ) * l * l * uSplit;
        c = mix( c, c * c * ( 3.0 - 2.0 * c ), 0.3 );
        c *= 1.0 - rr * 0.85;
        c = mix( c, vec3( 0.42, 0.02, 0.02 ) * ( 0.6 + l ), uHurt * smoothstep( 0.08, 0.5, rr ) );
        c = pow( clamp( c, 0.0, 1.0 ), vec3( 0.4545 ) );
        c += ( h( vUv * vec2( 913.0, 571.0 ) + fract( uTime ) * 31.0 ) - 0.5 ) * 0.028 * uGrain;
        c *= 1.0 - uFade;
        gl_FragColor = vec4( c, 1.0 ); }`);
  }
  resize() {
    const cw = this.canvas.clientWidth || innerWidth, ch = this.canvas.clientHeight || innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, this.q.maxDpr) * this.q.scale * this.scale;
    const w = Math.max(320, Math.round(cw * dpr)), h = Math.max(180, Math.round(ch * dpr));
    if (w === this.w && h === this.h) return;
    this.w = w; this.h = h; this.renderer.setPixelRatio(1); this.renderer.setSize(w, h, false);
    this.camera.aspect = cw / ch; this.camera.updateProjectionMatrix();
    if (this.rt) this.rt.dispose(); this.bl.forEach((b) => b.dispose());
    this.rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: this.q.msaa, depthBuffer: true });
    this.bl = []; let bw = w >> 1, bh = h >> 1;
    for (let i = 0; i < this.q.bloom && bw > 8 && bh > 8; i++) { this.bl.push(new THREE.WebGLRenderTarget(bw, bh, { type: THREE.HalfFloatType, depthBuffer: false })); bw >>= 1; bh >>= 1; }
    const pxs = h / (2 * Math.tan((this.camera.fov * Math.PI) / 360));
    this.snowU.uPx.value = pxs; this.glow().uniforms.uPx.value = pxs; this.mFin.uniforms.uAspect.value = w / h;
  }

  // ---------------------------------------------------------------- per-frame
  update(dt, focus) {
    const U = this.U; U.uTime.value += dt;
    this.time = (this.time + dt * this.timeScale) % 24;
    const w = this.weather; w.timer -= dt;
    if (w.timer <= 0) { w.timer = 90 + Math.random() * 150; const r = Math.random(); w.tSnow = r < 0.3 ? 0 : r < 0.75 ? 0.45 + Math.random() * 0.3 : 1; w.tFog = 0.15 + Math.random() * 0.4 + (w.tSnow > 0.9 ? 0.4 : 0); w.tCloud = w.tSnow > 0.1 ? 0.6 + Math.random() * 0.4 : Math.random() * 0.7; }
    const k = dt * 0.05; w.snow += clamp(w.tSnow - w.snow, -k, k); w.fog += clamp(w.tFog - w.fog, -k, k); w.cloud += clamp(w.tCloud - w.cloud, -k, k);
    let i = 0; while (i < SKY.length - 2 && SKY[i + 1][0] <= this.time) i++;
    const A = SKY[i], B = SKY[i + 1], f = smooth(A[0], B[0], this.time), L3 = (a, b) => [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)];
    let zen = L3(A[1], B[1]), hor = L3(A[2], B[2]); const sc = L3(A[3], B[3]); let sp = lerp(A[4], B[4], f), amb = lerp(A[5], B[5], f); const ex = lerp(A[6], B[6], f);
    const oc = clamp(w.cloud * 0.9 + w.snow * 0.3, 0, 1), g = (c) => (c[0] + c[1] + c[2]) / 3;
    const gz = g(zen), gh = g(hor), cz = [0.74, 0.93, 1.38], ch = [0.84, 0.97, 1.2];
    zen = zen.map((v, k) => lerp(v, (gz * 1.45 + gh * 0.22) * cz[k], oc * 0.88)); hor = hor.map((v, k) => lerp(v, gh * 0.92 * ch[k], oc * 0.84));
    const day = smooth(0.2, 1.0, sp); sp *= 1 - oc * 0.72; amb *= 1 - oc * 0.18;
    const night = U.uNight.value = 1 - smooth(0.12, 1.2, lerp(A[4], B[4], f));
    // low winter sun: rises SE, peaks 14 degrees above the southern horizon, sets SW. At night the moon takes over.
    const dn = clamp((this.time - 8.1) / 8.2, 0, 1), isDay = this.time > 7.9 && this.time < 16.5;
    const az = isDay ? lerp(0.95, -0.95, dn) : -0.6, el = isDay ? Math.max(0.035, Math.sin(dn * Math.PI) * 0.245 + 0.02) : 0.62;
    this.sunDir.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).normalize();   // south is +Z
    this.sun.color.setRGB(sc[0], sc[1], sc[2]); this.sun.intensity = sp * 1.25;
    this.hemi.color.setRGB(zen[0] * 0.62 + hor[0] * 0.38, zen[1] * 0.62 + hor[1] * 0.38, zen[2] * 0.62 + hor[2] * 0.38).multiplyScalar(1.7); this.hemi.groundColor.setRGB(hor[0] * 0.42, hor[1] * 0.42, hor[2] * 0.46).multiplyScalar(1.0);
    this.hemi.intensity = 0.55 + amb * 0.42 + night * 0.95;
    this.scene.environmentIntensity = 0.55 + 0.25 * amb;
    const su = this.skyU; su.uSunDir.value.copy(this.sunDir); su.uSunCol.value.setRGB(sc[0], sc[1], sc[2]).multiplyScalar(isDay ? sp : 0.25 * (1 - oc)); su.uZen.value.setRGB(...zen); su.uHor.value.setRGB(...hor); su.uCloud.value = w.cloud;
    let lit = 0; for (let j = 1; j < 12; j++) lit += U.uPower.value[j]; su.uGlow.value = night * lit;
    const fogK = (0.0028 + w.fog * 0.0075 + w.snow * 0.0035) * (this.fogMul ?? 1);
    const fz = 0.5, fcol = [hor[0] * (1 - fz) + zen[0] * fz, hor[1] * (1 - fz) + zen[1] * fz, hor[2] * (1 - fz) + zen[2] * fz], fg = (fcol[0] + fcol[1] + fcol[2]) / 3;
    this.scene.fog.density = fogK; this.scene.fog.color.setRGB(lerp(fcol[0], fg * 0.86, 0.55) * 0.82, lerp(fcol[1], fg * 0.98, 0.55) * 0.86, lerp(fcol[2], fg * 1.22, 0.55) * 0.92);
    su.uFog.value.copy(this.scene.fog.color); su.uFogD.value = fogK; su.uSunL.value.copy(this.sun.color).multiplyScalar(this.sun.intensity); this.glow().uniforms.uFogK.value = fogK;
    this.exposure = ex; U.uWet.value = clamp(0.45 + w.snow * 0.5, 0, 1); U.uSnowAmt.value = lerp(U.uSnowAmt.value, 0.62 + w.snow * 0.3, dt * 0.02);
    this.snowU.uAmt.value = w.snow; this.snowU.uLight.value.setRGB(0.55 + 0.45 * day, 0.58 + 0.42 * day, 0.64 + 0.36 * day).multiplyScalar(0.35 + 0.65 * (1 - night) + 0.25);
    this.snowU.uCam.value.copy(this.camera.position);
    if (focus) {                               // shadow frustum follows the player, snapped to texels to stop shimmer
      const d = this.q.shadowDist, tx = (d * 2) / this.q.shadow, t = this.sun.target.position;
      const lv = this.sun.shadow.camera.matrixWorldInverse; t.set(focus.x, 0, focus.z);
      this.sun.position.copy(t).addScaledVector(this.sunDir, 320); this.sun.updateMatrixWorld(); this.sun.target.updateMatrixWorld(); this.sun.shadow.camera.updateMatrixWorld();
      const p = t.clone().applyMatrix4(lv), sx = Math.round(p.x / tx) * tx - p.x, sy = Math.round(p.y / tx) * tx - p.y;
      const rgt = V3().setFromMatrixColumn(this.sun.shadow.camera.matrixWorld, 0), up = V3().setFromMatrixColumn(this.sun.shadow.camera.matrixWorld, 1);
      t.addScaledVector(rgt, sx).addScaledVector(up, sy); this.sun.position.copy(t).addScaledVector(this.sunDir, 320);
      this.sky.position.copy(this.camera.position);
    }
    this.night = night; this.day = day;
    this.envAt -= dt; const ek = (this.time * 8 | 0) + ':' + (w.cloud * 6 | 0) + ':' + (lit | 0);
    if (this.envAt <= 0 && (ek !== this.envKey || this.envAt < -30)) { this.envAt = 2.5; this.envKey = ek; this.updateEnv(); }
  }
  updateEnv() {
    try {
      if (!this.pmrem) this.pmrem = new THREE.PMREMGenerator(this.renderer);
      const rt = this.pmrem.fromScene(this.envScene, 0.02, 0.1, 1000); if (this.envRT) this.envRT.dispose(); this.envRT = rt; this.scene.environment = rt.texture;
    } catch (e) { console.warn('env', e); }
  }
  render(dtMs) {
    if (this.wantResize) { this.wantResize = false; this.resize(); }   // resize before drawing: resizing a canvas blanks what is on it
    const r = this.renderer, f = this.mFin.uniforms;
    r.info.reset();
    r.setRenderTarget(this.rt); r.render(this.scene, this.camera);
    let src = this.rt.texture;
    const BL = this.bloomOn ? this.bl.length : 0;
    for (let i = 0; i < BL; i++) { const b = this.bl[i], u = this.mDown.uniforms; u.t.value = src; u.px.value.set(1 / b.width, 1 / b.height); u.first.value = i === 0 ? 1 : 0; this.fsMesh.material = this.mDown; r.setRenderTarget(b); r.render(this.fsScene, this.fsCam); src = b.texture; }
    r.autoClear = false;
    for (let i = BL - 1; i > 0; i--) { const b = this.bl[i - 1], u = this.mUp.uniforms; u.t.value = this.bl[i].texture; u.px.value.set(0.5 / this.bl[i].width, 0.5 / this.bl[i].height); this.fsMesh.material = this.mUp; r.setRenderTarget(b); r.render(this.fsScene, this.fsCam); }
    r.autoClear = true;
    f.t.value = this.rt.texture; f.b.value = this.bl.length ? this.bl[0].texture : null; f.uBloom.value = this.bloomOn ? 0.085 : 0; f.uExp.value = this.exposure || 1;
    this.fsMesh.material = this.mFin; r.setRenderTarget(null); r.render(this.fsScene, this.fsCam);
    // dynamic resolution: hold frame time on phones
    if (dtMs) { this.frameMs = lerp(this.frameMs, dtMs, 0.05); this.dynT += dtMs; if (this.fixedScale) this.dynT = 0; if (this.dynT > 2500) { this.dynT = 0; const o = this.scale; if (this.frameMs > 30 && this.scale > 0.6) this.scale -= 0.1; else if (this.frameMs < 19 && this.scale < 1) this.scale += 0.05; if (o !== this.scale) this.wantResize = true; } }
  }
}
