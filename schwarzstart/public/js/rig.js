// SCHWARZSTART · characters: sculpted, smooth-skinned bodies (baked by tools/humangen.py), weapon meshes (tools/gungen.py),
// procedural locomotion and two-bone IK that puts both hands on the weapon.
import * as THREE from 'three';
import { clamp, lerp, damp } from './util.js';

const TH = 0.55, PH = 0.06;
export const BONES = ['hips', 'spine', 'chest', 'neck', 'head', 'uaL', 'faL', 'hdL', 'uaR', 'faR', 'hdR', 'thL', 'shL', 'ftL', 'thR', 'shR', 'ftR', 'gun'];
const B = {}; BONES.forEach((n, i) => (B[n] = i));
// [parent, x, y, z, bind roll]   (arms are bound in an A-pose; animation treats roll 0 as hanging straight down)
const SK = [[-1, 0, 0.98, 0, 0], [0, 0, 0.10, 0, 0], [1, 0, 0.16, 0, 0], [2, 0, 0.20, -0.01, 0], [3, 0, 0.13, 0.01, 0],
  [2, 0.19, 0.205, 0, TH], [5, 0, -0.285, 0, 0], [6, 0, -0.25, 0, 0], [2, -0.19, 0.205, 0, -TH], [8, 0, -0.285, 0, 0], [9, 0, -0.25, 0, 0],
  [0, 0.095, -0.05, 0, PH], [11, 0, -0.44, 0, 0], [12, 0, -0.415, 0, 0], [0, -0.095, -0.05, 0, -PH], [14, 0, -0.44, 0, 0], [15, 0, -0.415, 0, 0],
  [2, -0.08, 0.13, 0.27, 0]];
const UA = 0.285, FA = 0.25;

// palette slots, defaults and material response [roughness, metalness]
export const SLOTS = ['skin', 'top', 'pants', 'gear', 'accent', 'hat', 'boots', 'face', 'hw', 'refl', 'fur', 'eye', 'glass'];
const SLOTMAT = [[0.55, 0], [0.9, 0], [0.92, 0], [0.86, 0], [0.78, 0], [0.9, 0], [0.62, 0], [0.94, 0], [0.42, 0.55], [0.34, 0.1], [1, 0], [0.3, 0], [0.24, 0.4]];
const DEFPAL = { skin: 0xb98c6c, top: 0x2b333c, pants: 0x30333a, gear: 0x2c3238, accent: 0xd8d23a, hat: 0x24272c, boots: 0x1c1b1a, face: 0x3a424a, hw: 0x1a1c1e, refl: 0xd8dde0, fur: 0x6d6255, eye: 0x1b1d1f, glass: 0x0b0d10 };
export const SKINS = [0xe7c3a6, 0xd6a882, 0xbf8d68, 0x9c6b48, 0x7a4f33, 0x5a3a26];

// what each faction, the agent and the city's people wear
export const LOOKS = {
  player: { outfit: 'agent_m_1', pal: { top: 0x55584e, pants: 0x50545d, gear: 0x2a2e33, accent: 0xe0d23c, hat: 0x3a3e44, face: 0x55606b, skin: 0xbf8d68, boots: 0x2c2723 } },
  friend: { outfit: 'friend', pal: { top: 0x6b5d49, pants: 0x464a52, gear: 0x30343a, accent: 0xe0d23c, hat: 0x3f444b } },
  civ: { outfit: ['civ_a', 'civ_b', 'civ_c'], vary: 1, pal: { top: 0x5a4a3c, pants: 0x2f3b4f, hat: 0x3a2a22, face: 0x7a2f2a, gear: 0x4a3a2c } },
};
export const FACTION_LOOKS = [
  { outfit: ['sch_a', 'sch_b'], heavy: 'sch_h', vary: 1, pal: { top: 0x3a3532, pants: 0x2a2c30, gear: 0x3d2e24, accent: 0xd65a2e, hat: 0x2c2826, face: 0x8a2a20, fur: 0x5a4636 } },
  { outfit: ['kar_a'], heavy: 'kar_h', vary: 0.5, pal: { top: 0x23272c, pants: 0x23272c, gear: 0x2a2e33, accent: 0xf2c12a, hat: 0xf0c020, face: 0x2a2d31, refl: 0xe6e9ea } },
  { outfit: ['gar_a'], heavy: 'gar_h', vary: 0.35, pal: { top: 0x58606a, pants: 0x4c535c, gear: 0x343c45, accent: 0x3a6bb8, hat: 0x3c444d, face: 0x22262b } },
  { outfit: ['sti_a'], heavy: 'sti_h', vary: 0.25, pal: { top: 0xdfe3e7, pants: 0xcfd4d9, gear: 0xb4bbc2, accent: 0x9aa3ac, hat: 0xdfe3e7, face: 0x5a6068, hw: 0x30353a } },
];

let LIB = null, ANIM = null;
// ---------- motion capture: looping locomotion cycles (CMU mocap, retargeted by tools/mocap.py) ----------
const TR3 = ['pel', 'la', 'ra', 'lk', 'rk', 'lu', 'lfa', 'lh', 'ru', 'rfa', 'rh'], TR4 = ['pq', 'cq', 'hq', 'lf', 'rf'];
function prepAnim(j) {
  const C = {};
  for (const n in j.clips) { const c = j.clips[n], o = { T: c.T, v: c.v, N: c.N, stride: c.v * c.T }; for (const k of TR3) o[k] = Float32Array.from(c[k]); for (const k of TR4) o[k] = Float32Array.from(c[k]); C[n] = o; }
  return C;
}
const MP = {}; for (const k of TR3) MP[k] = new Float32Array(3); for (const k of TR4) MP[k] = new Float32Array(4);
function mpClear() { for (const k of TR3) MP[k].fill(0); for (const k of TR4) MP[k].fill(0); }
function mpAdd(C, ph, w) {                      // accumulate one clip at phase ph (0..1) with weight w
  if (!C || w <= 1e-4) return;
  const f = (((ph % 1) + 1) % 1) * C.N, i0 = Math.floor(f) % C.N, i1 = (i0 + 1) % C.N, t = f - Math.floor(f), u = 1 - t;
  for (const k of TR3) { const a = C[k], o = MP[k], A = i0 * 3, B2 = i1 * 3; o[0] += w * (a[A] * u + a[B2] * t); o[1] += w * (a[A + 1] * u + a[B2 + 1] * t); o[2] += w * (a[A + 2] * u + a[B2 + 2] * t); }
  for (const k of TR4) {
    const a = C[k], o = MP[k], A = i0 * 4, B2 = i1 * 4, sg = a[A] * a[B2] + a[A + 1] * a[B2 + 1] + a[A + 2] * a[B2 + 2] + a[A + 3] * a[B2 + 3] < 0 ? -t : t;
    const x = a[A] * u + a[B2] * sg, y = a[A + 1] * u + a[B2 + 1] * sg, z = a[A + 2] * u + a[B2 + 2] * sg, ww = a[A + 3] * u + a[B2 + 3] * sg;
    const s2 = o[0] * x + o[1] * y + o[2] * z + o[3] * ww < 0 ? -w : w; o[0] += s2 * x; o[1] += s2 * y; o[2] += s2 * z; o[3] += s2 * ww;
  }
}
function mpNorm() { for (const k of TR4) { const o = MP[k], l = Math.hypot(o[0], o[1], o[2], o[3]) || 1; o[0] /= l; o[1] /= l; o[2] /= l; o[3] /= l; } }
export const hasMocap = () => !!ANIM;
export const CharLib = {
  async load(base = 'assets/') {
    const get = (f) => fetch(base + f).then((r) => { if (!r.ok) throw new Error(f + ' ' + r.status); return r.json(); });
    const bin = (j) => { const s = atob(j.b64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer; };
    const [cm, cbj, gm, gbj] = await Promise.all([get('chars.json'), get('chars_bin.json'), get('guns.json'), get('guns_bin.json')]); const cb = bin(cbj), gb = bin(gbj);
    LIB = { cm, cb, gm, gb, geo: {}, gun: {} };
    try { ANIM = prepAnim(await get('anim.json')); } catch (e) { ANIM = null; }
  },
  ready: () => !!LIB,
  outfits: () => (LIB ? Object.keys(LIB.cm.models) : []),
};

function charGeo(name) {
  if (LIB.geo[name]) return LIB.geo[name];
  const M = LIB.cm.models[name] || LIB.cm.models.agent_m_1, S = LIB.cm.sections, buf = LIB.cb, n = M.nv, ps = LIB.cm.posScale;
  const p16 = new Int16Array(buf, S.pos + M.v0 * 6, n * 3), n8 = new Int8Array(buf, S.nrm + M.v0 * 4, n * 4), c8 = new Uint8Array(buf, S.col + M.v0 * 4, n * 4);
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), col = new Float32Array(n * 3), slot = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 3; k++) { pos[i * 3 + k] = p16[i * 3 + k] / ps; nrm[i * 3 + k] = n8[i * 4 + k] / 127; col[i * 3 + k] = (c8[i * 4 + k] / 255) * 1.2; }
    slot[i] = c8[i * 4 + 3];
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aSlot', new THREE.BufferAttribute(slot, 1));
  g.setAttribute('skinIndex', new THREE.BufferAttribute(new Uint8Array(buf.slice(S.ski + M.v0 * 4, S.ski + (M.v0 + n) * 4)), 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(new Uint8Array(buf.slice(S.skw + M.v0 * 4, S.skw + (M.v0 + n) * 4)), 4, true));
  g.setIndex(new THREE.BufferAttribute(new Uint16Array(buf.slice(S.idx + M.i0 * 2, S.idx + (M.i0 + M.ni) * 2)), 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.9, 0), 1.7);
  return (LIB.geo[name] = g);
}

export function gunMeta(cls) { return LIB.gm.guns[cls] || LIB.gm.guns.ar; }
function gunGeo(cls) {
  if (LIB.gun[cls]) return LIB.gun[cls];
  const M = gunMeta(cls), S = LIB.gm.sections, buf = LIB.gb, n = M.nv, ps = LIB.gm.posScale;
  const p16 = new Int16Array(buf, S.pos + M.v0 * 6, n * 3), n8 = new Int8Array(buf, S.nrm + M.v0 * 4, n * 4), c8 = new Uint8Array(buf, S.col + M.v0 * 4, n * 4);
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), col = new Float32Array(n * 3), met = new Float32Array(n);
  for (let i = 0; i < n; i++) { for (let k = 0; k < 3; k++) { pos[i * 3 + k] = p16[i * 3 + k] / ps; nrm[i * 3 + k] = n8[i * 4 + k] / 127; col[i * 3 + k] = (c8[i * 4 + k] / 255) * 0.4; } met[i] = c8[i * 4 + 3] / 127; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('aMet', new THREE.BufferAttribute(met, 1));
  g.setIndex(new THREE.BufferAttribute(new Uint16Array(buf.slice(S.idx + M.i0 * 2, S.idx + (M.i0 + M.ni) * 2)), 1)); g.computeBoundingSphere();
  return (LIB.gun[cls] = g);
}

// ---------- materials ----------
const PAL_VERT = `attribute float aSlot; uniform vec3 uPal[13]; uniform vec2 uMatP[13]; varying vec3 vPal; varying vec2 vMatP; varying vec3 vBind;`;
function charMaterial(gfx) {
  const m = gfx.patch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 }), { FX_SNOW: '0.16' }, { key: 'char', uniforms: {} });
  const ob = m.onBeforeCompile;
  m.userData.pal = Array.from({ length: 13 }, () => new THREE.Color()); m.userData.mat = SLOTMAT.map((v) => new THREE.Vector2(v[0], v[1]));
  m.onBeforeCompile = (sh) => {
    ob(sh); sh.uniforms.uPal = { value: m.userData.pal }; sh.uniforms.uMatP = { value: m.userData.mat };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + PAL_VERT)
      .replace('#include <color_vertex>', '#include <color_vertex>\n{ int si_ = int( aSlot + 0.5 ); vPal = uPal[ si_ ]; vMatP = uMatP[ si_ ]; vBind = position; }');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vPal; varying vec2 vMatP; varying vec3 vBind;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float fab_ = texture2D( uNoise, vBind.xy * 3.1 + vBind.zx * 1.7 ).r * 0.6 + texture2D( uNoise, vBind.zy * 9.0 ).g * 0.4;
        diffuseColor.rgb *= vPal * ( 0.9 + 0.2 * fab_ );`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp( vMatP.x + ( fab_ - 0.5 ) * 0.12, 0.2, 1.0 );')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = vMatP.y;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          float fr_ = pow( 1.0 - clamp( dot( normal, normalize( vViewPosition ) ), 0.0, 1.0 ), 2.6 );
          #if NUM_HEMI_LIGHTS > 0
          totalEmissiveRadiance += hemisphereLights[ 0 ].skyColor * fr_ * 0.24;                         // a cool outline against the street
          totalEmissiveRadiance += diffuseColor.rgb * hemisphereLights[ 0 ].skyColor * 0.12;             // fill: the shadow side keeps its shape
          #endif
        }`);
  };
  m.customProgramCacheKey = () => 'fx|char4';
  return m;
}
let BLOBG = null, BLOBM = null;
function blobGeo() { if (!BLOBG) { BLOBG = new THREE.PlaneGeometry(1.5, 1.5); BLOBG.rotateX(-Math.PI / 2); } return BLOBG; }
function blobMat() {
  if (BLOBM) return BLOBM;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 2, 32, 32, 31);
  g.addColorStop(0, 'rgba(0,0,0,0.62)'); g.addColorStop(0.45, 'rgba(0,0,0,0.34)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace;
  return (BLOBM = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, color: 0x000000, fog: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
}
let GUNMAT = null;
function gunMaterial(gfx) {
  if (GUNMAT) return GUNMAT;
  const m = gfx.patch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.3 }), { FX_SNOW: '0.1' }, { key: 'gun', uniforms: {} });
  const ob = m.onBeforeCompile;
  m.onBeforeCompile = (sh) => {
    ob(sh);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aMet; varying float vMet;').replace('#include <color_vertex>', '#include <color_vertex>\nvMet = aMet;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vMet;')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = vMet > 1.5 ? 0.08 : mix( 0.72, 0.42, vMet );')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = vMet > 1.5 ? 0.6 : mix( 0.05, 0.7, vMet );');
  };
  m.customProgramCacheKey = () => 'fx|gun';
  return (GUNMAT = m);
}

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _S = new THREE.Vector3(), _E = new THREE.Vector3(), _T = new THREE.Vector3(), _d = new THREE.Vector3(), _p = new THREE.Vector3();
const _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _qY = new THREE.Quaternion(), _qR = new THREE.Quaternion(), _qC = new THREE.Quaternion();
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _m = new THREE.Matrix4(), DOWN = new THREE.Vector3(0, -1, 0), _pole = new THREE.Vector3(), _hd = new THREE.Vector3();
const _A = new THREE.Vector3(), _hA = new THREE.Vector3(), _wR = new THREE.Vector3(), _hR = new THREE.Vector3(), _wL = new THREE.Vector3(), _hL = new THREE.Vector3();
const _iS = new THREE.Vector3(), _iE = new THREE.Vector3(), _iD = new THREE.Vector3(), _iP = new THREE.Vector3(), _iT = new THREE.Vector3(), _iH = new THREE.Vector3();
const _r0 = new THREE.Vector3(), _r1 = new THREE.Vector3(), _r2 = new THREE.Vector3(), _r3 = new THREE.Vector3(), _r4 = new THREE.Vector3(), _r5 = new THREE.Vector3(), _X = new THREE.Vector3(1, 0, 0), _Y = new THREE.Vector3(0, 1, 0);
const lerp3 = (o, a, b, t) => o.set(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t));
const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// weapon carry poses in chest space: [grip position, pitch(+down), yaw(+left), roll]
const HOLD = {
  rifle: { aim: [[-0.085, 0.13, 0.26], 0, 0.42, 0], low: [[-0.06, 0.03, 0.25], 0.58, 0.6, 0.3], rel: [[-0.03, 0.07, 0.25], -0.12, 0.5, 0.65], run: [[-0.05, 0.04, 0.22], -0.62, 0.95, 0.62] },
  pistol: { aim: [[-0.03, 0.2, 0.43], 0, 0.36, 0], low: [[-0.05, -0.02, 0.26], 0.95, 0.3, 0.2], rel: [[-0.02, 0.06, 0.3], -0.3, 0.3, 0.5], run: [[-0.06, 0.0, 0.2], 1.15, 0.25, 0.25] },
};

export class Rig {
  // look: { outfit: name | [names], heavy?, pal: {slot: hex}, vary? }   gun: class or null (unarmed)
  constructor(gfx, look, gun = 'ar', scale = 1, bulk = 1) {
    this.gfx = gfx; look = look || LOOKS.civ; this.look = look; this.scale = scale;
    const o = bulk > 1.05 && look.heavy ? look.heavy : Array.isArray(look.outfit) ? look.outfit[(Math.random() * look.outfit.length) | 0] : look.outfit;
    this.outfit = o;
    this.bones = SK.map(() => new THREE.Bone());
    SK.forEach((b, i) => { this.bones[i].position.set(b[1], b[2], b[3]); this.bones[i].rotation.z = b[4]; if (b[0] >= 0) this.bones[b[0]].add(this.bones[i]); });
    this.bones[B.gun].rotation.order = 'YXZ';
    this.mat = charMaterial(gfx); this.setPalette(look.pal, look.vary || 0);
    this.mesh = new THREE.SkinnedMesh(charGeo(o), this.mat); this.mesh.castShadow = true; this.mesh.receiveShadow = true; this.mesh.frustumCulled = false;
    this.mesh.add(this.bones[0]); this.mesh.updateMatrixWorld(true); this.mesh.bind(new THREE.Skeleton(this.bones));
    this.root = new THREE.Group(); this.root.add(this.mesh); this.root.scale.setScalar(scale);
    const bl = new THREE.Mesh(blobGeo(), blobMat()); bl.position.y = 0.03; bl.renderOrder = 4; bl.raycast = () => {}; this.root.add(bl); this.blob = bl;
    this.gunMesh = null; this.gunType = null; this.setGun(gun);
    this.lastP = new THREE.Vector3(); this.vel = new THREE.Vector3(); this.fp = null; this.gph = 0; this.accF = 0; this.accR = 0; this.aph = Math.random(); this.iph = Math.random(); this.sprintLean = 0; this.lastHalf = 0; this.stepEv = 0;
    this.ph = Math.random() * 6; this.aim = 0; this.cr = 0; this.kick = 0; this.hit = 0; this.dead = 0; this.spd = 0; this.rel = 0; this.t = Math.random() * 10; this.lean = 0;
    this.deadSide = Math.random() < 0.5 ? 1 : -1; this.legYaw = 0; this.back = 0; this.mx = 0; this.mz = 1; this.armed = 1; this.bob = 0;
  }
  setPalette(pal = {}, vary = 0) {
    const P = this.mat.userData.pal, r = () => 1 + (Math.random() - 0.5) * vary * 0.5;
    SLOTS.forEach((s, i) => { const hex = pal[s] ?? DEFPAL[s]; P[i].setHex(hex); if (vary && i > 0 && i < 8) P[i].multiplyScalar(r()); });
    if (vary && pal.skin === undefined) P[0].setHex(SKINS[(Math.random() * SKINS.length) | 0]);
  }
  setGun(cls) {
    if (cls === this.gunType) return; this.gunType = cls;
    if (this.gunMesh) { this.bones[B.gun].remove(this.gunMesh); this.gunMesh = null; }
    if (!cls) { this.meta = null; return; }
    this.meta = gunMeta(cls); this.hold = cls === 'pst' ? HOLD.pistol : HOLD.rifle;
    this.gunMesh = new THREE.Mesh(gunGeo(cls), gunMaterial(this.gfx)); this.gunMesh.castShadow = true; this.bones[B.gun].add(this.gunMesh);
  }
  setOutfit(name, pal) { if (name && name !== this.outfit) { this.outfit = name; this.mesh.geometry = charGeo(name); } if (pal) this.setPalette(pal, 0); }
  setHighlight(on, hex = 0xff4030) {
    if (on && !this.hi) { this.mat.emissive.setHex(hex); this.mat.emissiveIntensity = 0.5; this.hi = 1; }
    else if (!on && this.hi) { this.mat.emissive.setHex(0); this.hi = 0; }
  }
  // s: { speed, mx, mz (local move dir), aim, pitch, crouch, reload 0..1, roll 0..1, dead, lean -1..1 }
  pose(s, dt) {
    // far away (40 m+) people are animated every other frame; nobody can tell, and crowds stay cheap
    if (!s.dead && this.gfx.camera.position.distanceToSquared(this.root.position) > 1600 && (this.lod = !this.lod)) { this.lodDt = (this.lodDt || 0) + dt; return; }
    if (this.lodDt) { dt += this.lodDt; this.lodDt = 0; }
    const b = this.bones, R = (n) => b[B[n]].rotation, armed = !!this.gunType; this.t += dt;
    this.aim = damp(this.aim, s.aim && armed ? 1 : 0, 12, dt); this.cr = damp(this.cr, s.crouch ? 1 : 0, 10, dt); this.spd = damp(this.spd, s.speed || 0, 9, dt);
    this.kick = damp(this.kick, 0, 16, dt); this.hit = damp(this.hit, 0, 6, dt); this.rel = s.reload || 0; this.lean = damp(this.lean, s.lean || 0, 8, dt);
    if (s.mz !== undefined) { this.mx = damp(this.mx, s.mx, 8, dt); this.mz = damp(this.mz, s.mz, 8, dt); } else { this.mx = damp(this.mx, 0, 8, dt); this.mz = damp(this.mz, 1, 8, dt); }
    const sp = this.spd, run = clamp((sp - 2.6) / 2.8, 0, 1), mv = clamp(sp / 1.1, 0, 1), a = this.aim, c = this.cr;
    const camD = this.gfx.camera.position.distanceTo(_r0.setFromMatrixPosition(this.root.matrixWorld)), ik = !s.dead && !s.roll && !s.skate && camD < (this.ikRange || 48);
    const mc = !!ANIM && !s.dead && !s.roll && !s.skate && camD < (this.ikRange ? this.ikRange * 2.5 : 130);
    // legs face the direction of travel (within limits) while the torso keeps facing the aim
    let ang = Math.atan2(this.mx, this.mz); const back = Math.abs(ang) > 1.95 ? 1 : 0; this.back = damp(this.back, back, 6, dt);
    if (back) ang = wrapA(ang - Math.PI); const ly = clamp(ang, -1.15, 1.15) * mv * (1 - run * 0.3); this.legYaw = damp(this.legYaw, ly, 7, dt);
    // standing still, the feet stay planted while the body turns above them, then shuffle round once it has turned far enough
    { const ry = this.root.rotation.y;
      if (mv < 0.1 && !s.dead && !s.roll) {
        if (this.footYaw === undefined) this.footYaw = ry; const d = wrapA(this.footYaw - ry);
        if (Math.abs(d) > 0.62) this.pivot = 1; if (this.pivot) { this.footYaw = ry + d * Math.exp(-dt * 11); if (Math.abs(d) < 0.05) this.pivot = 0; }
        this.pivYaw = wrapA(this.footYaw - ry);
      } else { this.footYaw = ry + this.legYaw; this.pivot = 0; this.pivYaw = damp(this.pivYaw || 0, 0, 10, dt); } }
    const stride = lerp(1.3, 2.35, run) * (1 - c * 0.3); this.ph += (dt * sp / stride) * Math.PI * 2 * (back ? -1 : 1);
    for (let i = 0; i < 17; i++) b[i].rotation.set(0, 0, 0);
    b[B.uaL].position.z = b[B.uaR].position.z = 0;
    // with planted feet the body rhythm follows the real footfalls: lowest at mid-stance when running, highest when walking
    const ph = ik && this.fp && mv > 0.05 ? (this.gph - lerp(0.6, 0.36, run) * 0.5) * Math.PI * 2 + run * Math.PI * 0.5 : this.ph, A = lerp(0.44, 0.74, run) * mv, br = Math.sin(this.t * 1.7);
    // pelvis
    const bob = lerp(0.026, 0.055, run) * mv * Math.pow(Math.sin(ph), 2);
    const acf = ik ? this.accF : 0, acr = ik ? this.accR : 0;
    if (mc) this._mocapBody(dt, s, c, a);
    else {
      b[0].position.set(this.lean * 0.12 + Math.sin(this.t * 0.37) * 0.012 * (1 - mv), 0.98 - c * 0.4 - bob - (ik ? 0.012 + mv * 0.018 + run * 0.022 : 0), -c * 0.05 + (ik ? run * 0.03 : 0));
      R('hips').y = this.legYaw + Math.sin(ph) * 0.11 * A; R('hips').z = Math.cos(ph) * 0.045 * A + Math.sin(this.t * 0.37) * 0.02 * (1 - mv);
      // legs
      for (const [th, sh, ft, off, sd] of [['thL', 'shL', 'ftL', 0, 1], ['thR', 'shR', 'ftR', Math.PI, -1]]) {
        const p = ph + off, sw = Math.sin(p), cs = Math.cos(p), swing = Math.pow(Math.max(0, cs), 1.4);
        R(th).x = -A * sw - c * 1.28; R(th).z = sd * (0.035 + c * 0.12) - R('hips').z * 0.6;
        R(sh).x = (0.1 + lerp(0.95, 1.75, run) * swing + 0.18 * Math.max(0, -sw) * (1 - run)) * mv + c * 2.05;
        R(ft).x = -(R(th).x + R(sh).x) * 0.92 + 0.35 * mv * Math.max(0, -Math.sin(p + 0.7)); R(ft).z = -R(th).z;
      }
    }
    // torso
    const pit = clamp(s.pitch || 0, -1.0, 0.95);
    R('spine').x = (mc ? 0.02 + this.sprintLean : 0.03 + run * 0.2 * mv * (1 - a * 0.6)) + c * 0.28 - pit * 0.25 * a + br * 0.008;
    R('spine').y = -(this.legYaw + (mc ? this.pivYaw || 0 : 0)) * 0.55 - (mc ? 0 : Math.sin(ph) * 0.08 * A * (1 - a)) - 0.16 * a;
    R('chest').x = -pit * 0.42 * a - this.kick * 0.12 + br * 0.012 - this.hit * 0.3; R('chest').y = -(this.legYaw + (mc ? this.pivYaw || 0 : 0)) * 0.45 - 0.24 * a + this.hit * 0.2;
    R('spine').z = this.lean * 0.26 - clamp(acr * 0.018, -0.12, 0.12); R('chest').z = this.lean * 0.1; R('spine').x += clamp(acf * 0.022, -0.14, 0.2) * (1 - a * 0.6);
    R('neck').x = -pit * 0.18 * (1 - a) + c * -0.1; R('head').x = -pit * 0.35 * (1 - a) - pit * 0.12 * a - c * 0.12;
    R('head').y = 0.36 * a + (1 - a) * (1 - mv) * Math.sin(this.t * 0.31) * 0.3; R('neck').y = 0.06 * a;
    if (this.hitH > 0.01) { this.hitH = damp(this.hitH, 0, 7, dt); R('head').x -= this.hitH * 0.55; R('neck').x -= this.hitH * 0.2; R('chest').x -= this.hitH * 0.12; }   // a headshot snaps the head back
    if (mc) {                                   // the captured upper-body motion rides on top: chest twist and sway, a little head
      const k = 1 - a * 0.6; _qa.set(MP.cq[0], MP.cq[1], MP.cq[2], MP.cq[3]); _qb.identity().slerp(_qa, 0.5 * k);
      b[B.spine].quaternion.premultiply(_qb); b[B.chest].quaternion.premultiply(_qb);
      _qa.set(MP.hq[0], MP.hq[1], MP.hq[2], MP.hq[3]); _qb.identity().slerp(_qa, 0.5 * (1 - a)); b[B.head].quaternion.premultiply(_qb);
    }
    if (s.roll) { const r = s.roll; R('hips').x = r * Math.PI * 2; b[0].position.y = 0.5 + Math.sin(r * Math.PI) * 0.15; R('thL').x = R('thR').x = -1.7; R('shL').x = R('shR').x = 2.1; R('spine').x = 0.8; R('chest').x = 0.4; R('head').x = 0.5; }
    let dead = 0;
    if (s.dead) {
      this.dead = Math.min(1, this.dead + dt * 1.7); const d = this.dead, e = d * d * (3 - 2 * d), sd = this.deadSide, fd = this.deadDir || 1; dead = e;
      // a knee buckles first, then the body goes over (backward, or forward when shot from behind)
      const kb = Math.sin(Math.min(1, d * 1.6) * Math.PI) * (1 - d);
      R('hips').x = (fd > 0 ? -1.45 : 1.38) * e; R('hips').z = sd * 0.25 * e; R('hips').y = sd * 0.3 * e; b[0].position.y = lerp(0.98, 0.16, e) - kb * 0.12; b[0].position.z += fd > 0 ? -0.15 * e : 0.35 * e;
      R('thL').x = -0.5 * e; R('shL').x = 0.9 * e; R('thR').x = -0.1 * e; R('shR').x = 0.3 * e; R('thL').z = 0.15 * e; R('thR').z = -0.2 * e;
      R('spine').x = -0.12 * e; R('chest').x = -0.1 * e; R('chest').y = 0; R('spine').y = 0; R('head').x = -0.3 * e; R('head').y = sd * 0.6 * e;
    } else this.dead = 0;
    this.root.updateMatrixWorld(true);
    if (mc) this._mocapLegs(dt); else if (ik) this._legs(dt, c, run); else { this.fp = null; this.accF = this.accR = 0; }
    // arms
    if (s.warm && !dead) {
      const w = Math.sin(this.t * 0.9 + this.ph) * 0.06;
      R('uaL').x = -0.95 + w; R('uaL').z = 0.32; R('faL').x = -1.15; R('faL').y = 0.5; R('uaR').x = -0.95 - w; R('uaR').z = -0.32; R('faR').x = -1.15; R('faR').y = -0.5;
      R('chest').x += 0.12; R('head').x += 0.15; if (this.gunMesh) this.gunMesh.visible = false; return;
    }
    if (this.gunMesh) this.gunMesh.visible = true;
    if (s.skate && !dead) { R('spine').x += 0.35; R('uaL').x = -0.3 * Math.sin(ph); R('uaL').z = 0.5; R('uaR').x = 0.3 * Math.sin(ph); R('uaR').z = -0.5; R('faL').x = R('faR').x = -0.3; return; }
    if (!armed && mc) { this._mocapArms(); return; }
    if (!armed || dead) {
      const sa = dead ? 0 : 1;
      R('uaL').x = (A * 0.75 * Math.sin(ph)) * sa - dead * 1.6; R('uaL').z = 0.1 + dead * 1.1; R('faL').x = -(0.22 + run * 0.9) * sa - 0.3 * dead;
      R('uaR').x = (-A * 0.75 * Math.sin(ph)) * sa + dead * 0.4; R('uaR').z = -0.1 - dead * 0.9; R('faR').x = -(0.22 + run * 0.9) * sa - 0.2 * dead;
      if (this.gunMesh) { const g = b[B.gun]; g.position.set(-0.3, -0.25 - dead * 0.2, 0.25); g.rotation.set(1.3, 0.4, 1.4); }
      return;
    }
    this._gun(a, pit, run, mv);
    if (s.melee > 0) this._strike(s.melee);
    this.root.updateMatrixWorld(true);
    const M = this.meta, gw = b[B.gun].matrixWorld, sc = this.scale, rq = this.root.quaternion;
    // reload: the support hand travels to the pouch and back
    const wl = _wL.fromArray(M.wristL).applyMatrix4(gw), hl = _hL.fromArray(M.handL).applyMatrix4(gw);
    if (this.rel > 0) {
      const r = this.rel, mag = _v2.fromArray(M.mag).applyMatrix4(gw), pouch = _p.set(0.13, -0.2, 0.15).applyMatrix4(b[B.chest].matrixWorld);
      const k = r < 0.18 ? r / 0.18 : r < 0.45 ? 1 + (r - 0.18) / 0.27 : r < 0.75 ? 2 + (r - 0.45) / 0.3 : 3 + (r - 0.75) / 0.25, seg = Math.min(3, Math.floor(k)), f = smoothT(k - seg);
      const pts = [wl.clone(), mag.clone().add(_d.set(0.02, -0.07, -0.02).applyQuaternion(rq)), pouch.clone(), mag.clone().add(_d.set(0.02, -0.07, -0.02).applyQuaternion(rq)), wl.clone()];
      wl.copy(pts[seg]).lerp(pts[seg + 1], f); hl.copy(wl).add(_d.set(0, 0.06, 0.05).applyQuaternion(rq));
    }
    const wr = _wR.fromArray(M.wristR).applyMatrix4(gw), hr = _hR.fromArray(M.handR).applyMatrix4(gw);
    this._ik(b[B.uaR], b[B.faR], b[B.hdR], wr, _pole.set(-0.9, -0.7, -0.35).applyQuaternion(rq), hr, sc);
    this._ik(b[B.uaL], b[B.faL], b[B.hdL], wl, _pole.set(0.5, -1, -0.15).applyQuaternion(rq), hl, sc);
  }
  // ---- motion capture: blend idle / walk / jog / run / backwards by speed, in step with the ground speed
  _mocapBody(dt, s, c, a) {
    const A = ANIM, b = this.bones, sc = this.scale, sp = this.spd, bk = this.back;
    let wi = 0, ww = 0, wj = 0, wr = 0, g = 1;
    const vW = A.walk.v * sc, vJ = A.jog.v * sc, vR = A.run.v * sc, v0 = 0.2 * sc;
    if (sp <= v0) wi = 1;
    else if (sp < vW) { const t = smoothT((sp - v0) / (vW - v0)); wi = 1 - t; ww = t; }
    else if (sp < vJ) { const t = smoothT((sp - vW) / (vJ - vW)); ww = 1 - t; wj = t; }
    else if (sp < vR) { const t = smoothT((sp - vJ) / (vR - vJ)); wj = 1 - t; wr = t; }
    else { wr = 1; g = Math.min(1.3, Math.pow(sp / vR, 0.4)); }
    const mvw = 1 - wi, wb = mvw * bk; ww *= 1 - bk; wj *= 1 - bk; wr *= 1 - bk;
    const den = ww + wj + wr + wb, stride = den > 1e-4 ? ((ww * A.walk.stride + wj * A.jog.stride + wr * A.run.stride * g + wb * A.back.stride) / den) * sc : 1;
    if (sp > 0.02) this.aph = (this.aph + (dt * sp) / Math.max(0.35, stride)) % 1;
    this.iph = (this.iph + dt / (A.idle.T * 2.2)) % 1;   // the standing loop, slowed to a breath
    mpClear(); mpAdd(A.idle, this.iph, wi); mpAdd(A.walk, this.aph, ww); mpAdd(A.jog, this.aph, wj); mpAdd(A.run, this.aph, wr); mpAdd(A.back, this.aph, wb); mpNorm();
    // sprint: longer strides, lower and leaning; crouch: the pelvis drops, the feet stay put, so the knees bend
    if (g > 1) { const e = g - 1; for (const k of ['la', 'ra', 'lk', 'rk']) MP[k][2] *= g; MP.pel[1] -= e * 0.12; }
    this.sprintLean = damp(this.sprintLean || 0, (g - 1) * 0.55, 6, dt);
    if (c > 0.01) { const kn = c * wi; MP.pel[1] -= c * 0.36 + kn * 0.15; MP.pel[2] -= c * 0.05; MP.la[2] += c * 0.14 + kn * 0.14; MP.ra[2] -= c * 0.12 + kn * 0.24; MP.la[0] += c * 0.04; MP.ra[0] -= c * 0.04; MP.lk[2] += c * 0.3 + kn * 0.12; MP.rk[2] += c * 0.3; MP.rk[1] -= kn * 0.25; }   // stopped behind low cover: down on one knee
    // the legs turn toward the direction of travel (the spine turns the chest back to the aim)
    if (this.pivot) { const k = this.t * 13; MP.la[1] += 0.05 * Math.max(0, Math.sin(k)); MP.ra[1] += 0.05 * Math.max(0, -Math.sin(k)); }
    const ly = this.legYaw + (this.pivYaw || 0), cy = Math.cos(ly), sy = Math.sin(ly);
    for (const k of ['pel', 'la', 'ra', 'lk', 'rk']) { const o = MP[k], x = o[0], z = o[2]; o[0] = x * cy + z * sy; o[2] = -x * sy + z * cy; }
    _qY.setFromAxisAngle(_Y, ly);
    _qa.set(MP.pq[0], MP.pq[1], MP.pq[2], MP.pq[3]); _qa.premultiply(_qY);
    b[0].quaternion.copy(_qa); _v.set(0, 0.05, 0).applyQuaternion(_qa);
    b[0].position.set(MP.pel[0] + _v.x + this.lean * 0.12, MP.pel[1] + _v.y, MP.pel[2] + _v.z);
    // contact events for footsteps: left at phase 0, right at 0.5
    const half = this.aph >= 0.5 ? 1 : 0; if (half !== this.lastHalf) { this.lastHalf = half; if (mvw > 0.3) this.stepEv = (this.stepEv || 0) + 1; }
  }
  _mocapLegs(dt) {
    const b = this.bones, sc = this.scale, root = this.root, rp = _r0.setFromMatrixPosition(root.matrixWorld);
    if (!this.fp0 || this.lastP.distanceToSquared(rp) > 9) { this.fp0 = 1; this.vel.set(0, 0, 0); this.lastP.copy(rp); this.accF = this.accR = 0; }
    const iv = 1 / Math.max(dt, 1e-3), yaw = root.rotation.y; _r1.subVectors(rp, this.lastP).multiplyScalar(iv); _r1.y = 0; this.lastP.copy(rp);
    _r2.copy(this.vel); this.vel.lerp(_r1, 1 - Math.exp(-12 * dt)); _r2.subVectors(this.vel, _r2).multiplyScalar(iv);
    const fx = Math.sin(yaw), fz = Math.cos(yaw); this.accF = damp(this.accF, clamp(_r2.x * fx + _r2.z * fz, -20, 20), 6, dt); this.accR = damp(this.accR, clamp(_r2.x * fz - _r2.z * fx, -20, 20), 6, dt);
    root.getWorldQuaternion(_qR);
    for (let i = 0; i < 2; i++) {
      const th = b[i ? B.thR : B.thL], sh = b[i ? B.shR : B.shL], ft = b[i ? B.ftR : B.ftL], An = i ? MP.ra : MP.la, K = i ? MP.rk : MP.lk, Fq = i ? MP.rf : MP.lf;
      const tgt = root.localToWorld(_r4.set(An[0], An[1], An[2])), knee = root.localToWorld(_r3.set(K[0], K[1], K[2]));
      _r5.setFromMatrixPosition(th.matrixWorld); _pole.subVectors(knee, _r5);
      this._ik(th, sh, null, tgt, _pole, null, sc, 0.44, 0.415);
      _q2.set(Fq[0], Fq[1], Fq[2], Fq[3]).premultiply(_qY).premultiply(_qR);
      sh.getWorldQuaternion(_q); _q.invert(); ft.quaternion.copy(_q).multiply(_q2); ft.updateMatrixWorld(true);
    }
  }
  _mocapArms() {
    const b = this.bones; b[B.chest].getWorldQuaternion(_qC);
    for (const [ua, fa, hd, k1, k2, k3] of [[B.uaL, B.faL, B.hdL, 'lu', 'lfa', 'lh'], [B.uaR, B.faR, B.hdR, 'ru', 'rfa', 'rh']]) {
      for (const [bi, kk] of [[ua, k1], [fa, k2], [hd, k3]]) { const d = MP[kk]; _iH.set(d[0], d[1], d[2]).applyQuaternion(_qC); this._aimBone(b[bi], _iH); b[bi].updateMatrixWorld(true); }
    }
  }
  // feet stay planted on the street while the body passes over them, swing to where the body will be, and step when it turns
  _legs(dt, c, run) {
    const b = this.bones, sc = this.scale, rp = _r0.setFromMatrixPosition(this.root.matrixWorld), yaw = this.root.rotation.y;
    if (!this.fp || this.lastP.distanceToSquared(rp) > 9) {
      this.fp = [0, 1].map((i) => { const h = this._home(i, rp, yaw, c, sc, new THREE.Vector3()); return { p: h.clone(), cur: h.clone(), lift: h.clone(), land: h.clone(), st: true, stepT: 0 }; });
      this.vel.set(0, 0, 0); this.gph = 0; this.lastP.copy(rp); this.accF = this.accR = 0;
    }
    const iv = 1 / Math.max(dt, 1e-3); _r1.subVectors(rp, this.lastP).multiplyScalar(iv); _r1.y = 0; this.lastP.copy(rp);
    _r2.copy(this.vel); this.vel.lerp(_r1, 1 - Math.exp(-12 * dt)); _r2.subVectors(this.vel, _r2).multiplyScalar(iv);
    const fx = Math.sin(yaw), fz = Math.cos(yaw); this.accF = damp(this.accF, clamp(_r2.x * fx + _r2.z * fz, -20, 20), 6, dt); this.accR = damp(this.accR, clamp(_r2.x * fz - _r2.z * fx, -20, 20), 6, dt);
    const v = this.vel, spd = Math.hypot(v.x, v.z), moving = spd > 0.35, duty = lerp(0.6, 0.36, run), stride = lerp(1.2, 2.3, run) * (1 - c * 0.3) * sc, arc = lerp(0.09, 0.24, run) * sc;
    this.gph = (this.gph + (dt * spd) / stride) % 1;
    const hy = yaw + this.legYaw, hfx = Math.sin(hy), hfz = Math.cos(hy), ank = 0.075 * sc;
    const homes = [this._home(0, rp, yaw, c, sc, _r3), this._home(1, rp, yaw, c, sc, _r5)];
    if (!moving && this.fp[0].stepT <= 0 && this.fp[1].stepT <= 0) {          // standing: the foot left furthest behind steps back under the body
      const d0 = this.fp[0].p.distanceToSquared(homes[0]), d1 = this.fp[1].p.distanceToSquared(homes[1]), lim = (0.17 * sc) ** 2, i = d0 >= d1 ? 0 : 1;
      if (Math.max(d0, d1) > lim) { const f = this.fp[i]; f.stepT = 1; f.lift.copy(f.cur); f.land.copy(homes[i]); }
    }
    for (let i = 0; i < 2; i++) {
      const f = this.fp[i], home = homes[i], tgt = _r4; let sw2 = 0;
      if (moving) {
        f.stepT = 0; const u = (this.gph + i * 0.5) % 1;
        if (u < duty) { if (!f.st) { f.st = true; f.p.copy(f.land); } tgt.copy(f.p); }
        else {
          const sw = (u - duty) / (1 - duty); if (f.st) { f.st = false; f.lift.copy(f.cur); }
          const T = stride / Math.max(spd, 0.4), remain = (1 - sw) * (1 - duty) * T, ahead = (duty * stride * 0.5) / Math.max(spd, 1e-3);
          f.land.set(home.x + v.x * (remain + ahead), 0, home.z + v.z * (remain + ahead));
          const e = sw * sw * (3 - 2 * sw); tgt.lerpVectors(f.lift, f.land, e); tgt.y = Math.sin(Math.PI * sw) * arc; sw2 = Math.sin(Math.PI * sw);
        }
      } else if (f.stepT > 0) {
        f.stepT = Math.max(0, f.stepT - dt / 0.22); const s2 = 1 - f.stepT, e = s2 * s2 * (3 - 2 * s2); tgt.lerpVectors(f.lift, f.land, e); tgt.y = Math.sin(Math.PI * s2) * 0.07 * sc;
        if (f.stepT <= 0) { f.p.copy(f.land); f.st = true; }
      } else { if (!f.st) { f.st = true; f.p.copy(f.cur); f.p.y = 0; } tgt.copy(f.p); }
      f.cur.copy(tgt); tgt.y += ank;
      const th = b[i ? B.thR : B.thL], sh = b[i ? B.shR : B.shL], ft = b[i ? B.ftR : B.ftL], side = i ? -1 : 1;
      _pole.set(hfx + hfz * 0.12 * side, 0.1, hfz - hfx * 0.12 * side);
      this._ik(th, sh, null, tgt, _pole, null, sc, 0.44, 0.415);
      // the foot stays level with the street and points where the hips point; the toe dips while it swings
      _q2.setFromAxisAngle(_Y, hy); _q.setFromAxisAngle(_X, sw2 * lerp(0.2, 0.45, run)); _q2.multiply(_q);
      sh.getWorldQuaternion(_q); _q.invert(); ft.quaternion.copy(_q).multiply(_q2); ft.updateMatrixWorld(true);
    }
  }
  _home(i, rp, yaw, c, sc, out) {
    const side = i ? -1 : 1, rx = Math.cos(yaw), rz = -Math.sin(yaw), fx = Math.sin(yaw), fz = Math.cos(yaw), fwd = c * (i ? -0.2 : 0.18);
    return out.set(rp.x + (rx * 0.11 * side + fx * fwd) * sc, 0, rp.z + (rz * 0.11 * side + fz * fwd) * sc);
  }
  // rifle-butt strike: cock the rifle back over the right shoulder, twist and drive the stock forward, recover
  _strike(m) {
    const b = this.bones, g = b[B.gun];
    const w = m < 0.38 ? smoothT(m / 0.38) : m < 0.54 ? 1 - 1.8 * smoothT((m - 0.38) / 0.16) : -0.8 * (1 - smoothT((m - 0.54) / 0.46));   // +1 cocked, -0.8 follow-through
    const fw = Math.max(0, -w), bk = Math.max(0, w);
    b[B.spine].rotateY(-0.42 * w); b[B.chest].rotateY(-0.5 * w); b[B.chest].rotateX(0.32 * fw - 0.16 * bk); b[B.spine].rotateX(0.12 * fw);
    g.position.x += -0.13 * bk + 0.08 * fw; g.position.y += 0.2 * bk + 0.02 * fw; g.position.z += 0.45 * fw - 0.16 * bk;
    g.rotation.x -= 1.45 * bk + 0.15 * fw; g.rotation.y += 0.8 * bk - 0.85 * fw; g.rotation.z += 0.5 * bk - 0.2 * fw;
    b[0].position.z += 0.24 * fw - 0.06 * bk; b[0].position.y -= 0.07 * fw;
  }
  _gun(a, pit, run, mv) {
    const g = this.bones[B.gun], H = this.hold, r = this.rel > 0 ? Math.sin(Math.min(1, this.rel) * Math.PI) : 0;
    const lowW = 1 - a, A = H.aim, L = H.low, Rl = H.rel;
    lerp3(g.position, L[0], A[0], a);
    let px = lerp(L[1], A[1], a) - pit * 0.2 * a - this.kick * 0.5, py = lerp(L[2], A[2], a), pz = lerp(L[3], A[3], a);
    // flat out, the rifle comes across the chest, muzzle up (port arms); it drops back to the ready as soon as you aim
    this.carry = damp(this.carry || 0, ANIM && this.spd > 5.1 ? 1 : 0, 7, 1 / 60); const cw = this.carry * lowW;
    if (cw > 0.01 && H.run) { const S2 = H.run; g.position.lerp(_v.fromArray(S2[0]), cw); px = lerp(px, S2[1], cw); py = lerp(py, S2[2], cw); pz = lerp(pz, S2[3], cw); }
    if (r > 0) { g.position.lerp(_v.fromArray(Rl[0]), r); px = lerp(px, Rl[1], r); py = lerp(py, Rl[2], r); pz = lerp(pz, Rl[3], r); }
    g.position.z -= this.kick * 0.05; g.position.y += (ANIM ? Math.sin(this.aph * Math.PI * 4) * 0.016 : Math.sin(this.ph * 2) * 0.012) * mv * lowW;
    g.rotation.set(px + run * 0.15 * lowW, py, pz);
    // shoulders roll forward a little when aiming
    this.bones[B.uaL].position.z = 0.05 * a; this.bones[B.uaR].position.z = 0.02 * a;
  }
  _ik(ua, fa, hd, target, pole, handPt, sc, la = UA, lb = FA) {
    _iS.setFromMatrixPosition(ua.matrixWorld); const a = la * sc, bb = lb * sc;
    _iD.subVectors(target, _iS); let L = _iD.length(); L = clamp(L, 0.05, (a + bb) * 0.999); _iD.normalize();
    const ca = clamp((a * a + L * L - bb * bb) / (2 * a * L), -1, 1), sa = Math.sqrt(1 - ca * ca);
    _iP.copy(pole).addScaledVector(_iD, -pole.dot(_iD)); if (_iP.lengthSq() < 1e-6) _iP.set(0, -1, 0); _iP.normalize();
    _iE.copy(_iS).addScaledVector(_iD, a * ca).addScaledVector(_iP, a * sa);
    _iT.copy(_iS).addScaledVector(_iD, L);
    this._aimBone(ua, _iH.subVectors(_iE, _iS)); ua.updateMatrixWorld(true);
    this._aimBone(fa, _iH.subVectors(_iT, _iE)); fa.updateMatrixWorld(true);
    if (hd) { _iH.subVectors(handPt, _iT); if (_iH.lengthSq() > 1e-8) { this._aimBone(hd, _iH); hd.updateMatrixWorld(true); } }
  }
  _aimBone(bone, dirW) {
    bone.parent.getWorldQuaternion(_q); _q.invert(); dirW.applyQuaternion(_q).normalize();
    bone.quaternion.setFromUnitVectors(DOWN, dirW);
  }
  muzzle(out) { if (!this.meta) return this.bones[B.hdR].localToWorld(out.set(0, -0.1, 0)); return this.bones[B.gun].localToWorld(out.fromArray(this.meta.muzzle)); }
  headPos(out) { return this.bones[B.head].localToWorld(out.set(0, 0.1, 0.02)); }
  chestPos(out) { return this.bones[B.chest].localToWorld(out.set(0, 0.12, 0)); }
  dispose() { this.mat.dispose(); this.mesh.skeleton.dispose(); }
}
function smoothT(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
