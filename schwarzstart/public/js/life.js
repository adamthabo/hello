// SCHWARZSTART · life in the city: survivors at fire barrels, people on the pavements, queues at the pumps, Lotsen patrols,
// skaters with lanterns on the frozen Spree, crows and pigeons, chimney smoke and steaming grates, fire, searchlights,
// a helicopter now and then, fireworks over the roofs at night, light strings that come on with a district's power, bells.
import * as THREE from 'three';
import { Rig, LOOKS } from './rig.js';
import { rng, hyp, clamp, damp, dampAng } from './util.js';

const V = new THREE.Vector3(), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), S1 = new THREE.Vector3(1, 1, 1), E = new THREE.Euler();

// --------------------------------------------------------------- particles (smoke: normal blend, glow: additive)
class Particles {
  constructor(scene, n, additive) {
    this.n = n; this.i = 0; const g = new THREE.BufferGeometry();
    this.p = new Float32Array(n * 3); this.v = new Float32Array(n * 3); this.c = new Float32Array(n * 4); this.life = new Float32Array(n); this.age = new Float32Array(n).fill(1e9); this.sz = new Float32Array(n); this.grow = new Float32Array(n); this.grav = new Float32Array(n);
    this.col = new Float32Array(n * 3); this.al = new Float32Array(n);
    g.setAttribute('position', new THREE.BufferAttribute(this.p, 3)); g.setAttribute('aC', new THREE.BufferAttribute(this.c, 4)); g.setAttribute('aS', new THREE.BufferAttribute(new Float32Array(n), 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5); this.g = g;
    const m = new THREE.ShaderMaterial({
      uniforms: { uPx: { value: 1 } }, transparent: true, depthWrite: false, fog: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: `attribute vec4 aC; attribute float aS; uniform float uPx; varying vec4 vC; void main(){ vec4 mv = modelViewMatrix * vec4( position, 1.0 ); gl_Position = projectionMatrix * mv; vC = aC; gl_PointSize = clamp( aS * uPx / max( 0.5, -mv.z ), 0.0, 380.0 ); }`,
      fragmentShader: additive ? `varying vec4 vC; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length( d ) * 2.0; float a = exp( -r * r * 4.5 ); if ( a * vC.a < 0.003 ) discard; gl_FragColor = vec4( vC.rgb * a * vC.a * 3.0, 1.0 ); }`
        : `varying vec4 vC; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length( d ) * 2.0; float a = smoothstep( 1.0, 0.15, r ) * vC.a; if ( a < 0.004 ) discard; gl_FragColor = vec4( vC.rgb, a ); }`,
    });
    this.mat = m; this.pts = new THREE.Points(g, m); this.pts.frustumCulled = false; this.pts.renderOrder = additive ? 7 : 6; scene.add(this.pts);
  }
  emit(x, y, z, vx, vy, vz, life, size, grow, r, gc, b, a, grav = 0) {
    const i = this.i; this.i = (i + 1) % this.n;
    this.p[i * 3] = x; this.p[i * 3 + 1] = y; this.p[i * 3 + 2] = z; this.v[i * 3] = vx; this.v[i * 3 + 1] = vy; this.v[i * 3 + 2] = vz;
    this.life[i] = life; this.age[i] = 0; this.sz[i] = size; this.grow[i] = grow; this.col[i * 3] = r; this.col[i * 3 + 1] = gc; this.col[i * 3 + 2] = b; this.al[i] = a; this.grav[i] = grav;
  }
  update(dt, px, wind) {
    const S = this.g.attributes.aS.array; this.mat.uniforms.uPx.value = px;
    for (let i = 0; i < this.n; i++) {
      let a = this.age[i]; if (a > this.life[i]) { if (S[i] !== 0) { S[i] = 0; this.c[i * 4 + 3] = 0; } continue; }
      a += dt; this.age[i] = a; const k = a / this.life[i];
      this.v[i * 3 + 1] -= this.grav[i] * dt; this.p[i * 3] += (this.v[i * 3] + wind * k) * dt; this.p[i * 3 + 1] += this.v[i * 3 + 1] * dt; this.p[i * 3 + 2] += this.v[i * 3 + 2] * dt;
      S[i] = this.sz[i] * (1 + this.grow[i] * k); const fade = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
      this.c[i * 4] = this.col[i * 3]; this.c[i * 4 + 1] = this.col[i * 3 + 1]; this.c[i * 4 + 2] = this.col[i * 3 + 2]; this.c[i * 4 + 3] = this.al[i] * Math.max(0, fade);
    }
    this.g.attributes.position.needsUpdate = true; this.g.attributes.aC.needsUpdate = true; this.g.attributes.aS.needsUpdate = true;
  }
}

// --------------------------------------------------------------- birds: one instanced flapping silhouette for crows and pigeons
function birdGeo() {
  const p = [], w = [];
  const tri = (a, b, c, wa, wb, wc) => { p.push(...a, ...b, ...c); w.push(wa, wb, wc); };
  tri([0, 0, 0.22], [0.05, 0, -0.18], [-0.05, 0, -0.18], 0, 0, 0); tri([0, 0.03, 0.22], [-0.05, 0, -0.18], [0.05, 0, -0.18], 0, 0, 0);
  tri([0.02, 0, 0.08], [0.42, 0, -0.04], [0.02, 0, -0.1], 0, 1, 0); tri([0.02, 0, 0.08], [0.02, 0, -0.1], [0.42, 0, -0.04], 0, 0, 1);
  tri([-0.02, 0, 0.08], [-0.02, 0, -0.1], [-0.42, 0, -0.04], 0, 0, 1); tri([-0.02, 0, 0.08], [-0.42, 0, -0.04], [-0.02, 0, -0.1], 0, 1, 0);
  tri([0, 0, -0.16], [0.08, 0, -0.32], [-0.08, 0, -0.32], 0, 0, 0);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('aWing', new THREE.Float32BufferAttribute(w, 1)); return g;
}

export class Life {
  constructor(G) {
    this.G = G; this.W = G.world; this.gfx = G.gfx; this.scene = G.scene; this.map = G.map; this.t = 0; this.r = rng(9001);
    this.agents = []; this.pool = []; this.active = 0; this.lodT = 0;
    this.smoke = new Particles(this.scene, 1400, false); this.glow = new Particles(this.scene, 1600, true);
    this._places(); this._birds(); this._lights(); this._searchlights(); this._heli();
    this.fwT = 6; this.bellH = Math.floor(this.gfx.time); this.sirenT = 40; this.cawT = 5;
  }
  // ------------------------------------------------------------- where life happens
  _places() {
    const G = this.G, W = this.W, map = this.map, r = this.r, combat = map.sites.filter((s) => ['mission', 'cp', 'power'].includes(s.k)).map((s) => s.p);
    const calm = (x, z, d = 30) => !combat.some((p) => hyp(p[0] - x, p[1] - z) < d);
    // fire barrels beside building fronts, with a ring of people
    this.barrels = []; const bm = [];
    for (let tries = 0; tries < 3000 && this.barrels.length < 26; tries++) {
      const b = map.builds[(r() * map.builds.length) | 0], [x1, z1, x2, z2] = b, L = hyp(x2 - x1, z2 - z1); if (L < 8) continue;
      const t = 0.2 + r() * 0.6, ox = (z2 - z1) / L, oz = -(x2 - x1) / L, x = x1 + (x2 - x1) * t + ox * 3.2, z = z1 + (z2 - z1) * t + oz * 3.2;
      if (!W.walkable(x, z) || !calm(x, z) || this.barrels.some((q) => hyp(q.x - x, q.z - z) < 40)) continue;
      const n = 2 + ((r() * 2) | 0), ppl = [];
      for (let k = 0; k < n; k++) { const a = (k / n) * 6.283 + r() * 0.5, d = 1.05 + r() * 0.25; ppl.push({ x: x + Math.cos(a) * d, z: z + Math.sin(a) * d, yaw: Math.atan2(-Math.cos(a), -Math.sin(a)), look: W.district(x, z) === 0 && r() < 0.3 ? 'friend' : 'civ', kind: 'warm' }); }
      this.barrels.push({ x, z, ppl, emit: 0 }); bm.push([x, z]);
    }
    const geo = new THREE.CylinderGeometry(0.3, 0.28, 0.9, 10, 1, true), mat = new THREE.MeshStandardMaterial({ color: 0x3a2a22, roughness: 0.7, metalness: 0.4, side: THREE.DoubleSide });
    this.barrelMesh = new THREE.InstancedMesh(geo, mat, bm.length); bm.forEach((p, i) => { M4.compose(V.set(p[0], 0.45, p[1]), Q.identity(), S1); this.barrelMesh.setMatrixAt(i, M4); });
    this.barrelMesh.castShadow = true; this.scene.add(this.barrelMesh);
    for (const b of this.barrels) for (const p of b.ppl) this.agents.push({ ...p, home: p, rig: null });
    // queues at the water pumps
    for (const s of map.sites) if (s.k === 'pump' && W.inCore(s.p[0], s.p[1])) {
      const a = r() * 6.283, n = 2 + ((r() * 2) | 0);
      for (let k = 0; k < n; k++) { const x = s.p[0] + Math.cos(a) * (1.6 + k * 0.85), z = s.p[1] + Math.sin(a) * (1.6 + k * 0.85); if (W.walkable(x, z)) this.agents.push({ x, z, yaw: Math.atan2(-Math.cos(a), -Math.sin(a)), look: 'civ', kind: 'queue', rig: null }); }
    }
    // pavement walkers on streets inside the field of play
    this.walks = [];
    for (const st of map.streets) { if (!(st.cw > 0)) continue; for (let i = 0; i < st.p.length - 1; i++) { const a = st.p[i], b = st.p[i + 1]; if (hyp(b[0] - a[0], b[1] - a[1]) > 25 && W.inCore(a[0], a[1]) && W.inCore(b[0], b[1])) this.walks.push({ a, b, off: st.cw / 2 + 1.8 + (st.w - st.cw) * 0.12 }); } }
    for (let k = 0; k < 7; k++) this.agents.push({ kind: 'walk', look: 'civ', rig: null, seg: null, x: 0, z: 0, yaw: 0, sp: 0.95 + r() * 0.35 });   // a few scavengers, not a crowd
    // people standing and talking in front of the houses
    for (let tries = 0; tries < 4000 && this.agents.filter((a) => a.kind === 'chat').length < 16; tries++) {
      const b = map.builds[(r() * map.builds.length) | 0], [x1, z1, x2, z2] = b, L = hyp(x2 - x1, z2 - z1); if (L < 6) continue;
      const t = r(), ox = (z2 - z1) / L, oz = -(x2 - x1) / L, x = x1 + (x2 - x1) * t + ox * 2.0, z = z1 + (z2 - z1) * t + oz * 2.0;
      if (!W.walkable(x, z) || !calm(x, z, 25)) continue; const n = 2 + ((r() * 2) | 0), a0 = r() * 6.283;
      for (let k = 0; k < n; k++) { const a = a0 + (k / n) * 6.283, d = 0.55 + r() * 0.2, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d; this.agents.push({ kind: 'chat', look: 'civ', rig: null, x: px, z: pz, yaw: Math.atan2(x - px, z - pz), home: { x: px, z: pz } }); }
    }
    // Lotsen patrolling the island
    const hub = map.hub; for (let k = 0; k < 4; k++) {
      const loop = []; for (let q = 0; q < 6; q++) { const an = k * 1.6 + (q / 6) * 6.2832, f = W.findWalk(hub[0] + Math.cos(an) * (14 + k * 5), hub[1] + Math.sin(an) * (14 + k * 5), 0, 4, r, 20); if (f) loop.push(f); }
      if (loop.length >= 3) this.agents.push({ kind: 'patrol', look: 'friend', rig: null, loop, li: 0, x: loop[0][0], z: loop[0][1], yaw: 0, sp: 1.35 });
    }
    // skaters on the Spree beside the island, with lanterns
    this.skate = []; for (let tries = 0; tries < 400 && this.skate.length < 2; tries++) { const a = r() * 6.283, d = 70 + r() * 160, x = hub[0] + Math.cos(a) * d, z = hub[1] + Math.sin(a) * d; if (this._water(x, z) && this._water(x + 7, z) && this._water(x - 7, z) && this._water(x, z + 7) && this._water(x, z - 7)) this.skate.push({ x, z }); }
    for (const s of this.skate) for (let k = 0; k < 4; k++) this.agents.push({ kind: 'skate', look: 'civ', rig: null, cx: s.x, cz: s.z, rad: 3 + k * 1.3, ang: k * 1.7, x: s.x, z: s.z, yaw: 0, sp: 2.2 + r() * 0.8, y: -2.15 });
    // chimney smoke on roofs and steam from grates
    this.chim = []; for (let tries = 0; tries < 2000 && this.chim.length < 110; tries++) { const b = map.builds[(r() * map.builds.length) | 0], [x1, z1, x2, z2, dep, h] = b; if (h < 12) continue; const t = r(), ix = -(z2 - z1), iz = x2 - x1, l = hyp(ix, iz) || 1, d = 2 + r() * (dep - 4); this.chim.push({ x: x1 + (x2 - x1) * t + (ix / l) * d, y: h + 3.8, z: z1 + (z2 - z1) * t + (iz / l) * d, e: r() }); }
    this.steam = []; for (const st of map.streets) { if (!(st.cw > 6)) continue; for (let i = 0; i < st.p.length - 1 && this.steam.length < 60; i++) if (r() < 0.25) { const a = st.p[i], b = st.p[i + 1], t = r(); this.steam.push({ x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, e: r() }); } }
  }
  _water(x, z) { return this._isWater(x, z); }
  _isWater(x, z) { const w = this.map.water; if (!w) return false; for (const pg of w) if (pip(pg, x, z)) return true; return false; }
  // ------------------------------------------------------------- birds
  _birds() {
    const n = 150, g = birdGeo(), ph = new Float32Array(n), fl = new Float32Array(n);
    for (let i = 0; i < n; i++) ph[i] = Math.random() * 6.28;
    g.setAttribute('aPh', new THREE.InstancedBufferAttribute(ph, 1)); this.flap = new THREE.InstancedBufferAttribute(fl, 1); g.setAttribute('aFl', this.flap);
    const m = new THREE.ShaderMaterial({
      uniforms: { uTime: this.gfx.U.uTime, uCol: { value: new THREE.Color(0x15161a) } },
      vertexShader: `attribute float aWing, aPh, aFl; uniform float uTime; void main(){ vec3 p = position; float f = sin( uTime * mix( 3.0, 15.0, aFl ) + aPh ); p.y += aWing * f * mix( 0.04, 0.24, aFl ); p.x *= mix( 0.55, 1.0, aFl ); gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4( p, 1.0 ); }`,
      fragmentShader: `uniform vec3 uCol; void main(){ gl_FragColor = vec4( uCol, 1.0 ); }`, side: THREE.DoubleSide,
    });
    this.birdMesh = new THREE.InstancedMesh(g, m, n); this.birdMesh.frustumCulled = false; this.scene.add(this.birdMesh);
    const map = this.map, hub = map.hub, lm = (id) => { const L = map.landmarks.find((q) => q.id === id); return L ? L.c : hub; };
    this.flocks = [lm('dom'), lm('marien'), lm('rathaus'), lm('turm')].map((c, i) => ({ cx: c[0], cz: c[1], h: 34 + i * 6, rad: 26 + i * 6, sc: 0, n: 22 }));
    this.birds = [];
    for (const F of this.flocks) for (let k = 0; k < F.n; k++) this.birds.push({ F, a: Math.random() * 6.28, r: F.rad * (0.6 + Math.random() * 0.6), h: F.h + (Math.random() - 0.5) * 8, sp: 0.35 + Math.random() * 0.25, x: 0, y: 0, z: 0, yaw: 0, fly: 1, s: 1.15 });
    const plazas = (map.plazaNames || []).filter((p) => this.W.inCore(p.p[0], p.p[1])).slice(0, 7);
    for (const p of plazas) for (let k = 0; k < 9; k++) { const a = Math.random() * 6.28, d = 2 + Math.random() * 6; this.birds.push({ pig: 1, gx: p.p[0] + Math.cos(a) * d, gz: p.p[1] + Math.sin(a) * d, x: 0, y: 0, z: 0, yaw: Math.random() * 6.28, fly: 0, up: 0, a: Math.random() * 6.28, s: 0.72 }); }
    this.birds.length = Math.min(this.birds.length, n);
  }
  // ------------------------------------------------------------- light strings across shopping streets (glow with district power)
  _lights() {
    const pos = [], ag = [], map = this.map, W = this.W, r = this.r;
    for (const st of map.streets) {
      if (!(st.cw > 0) || st.w < 17 || !st.n) continue;
      for (let i = 0; i < st.p.length - 1; i++) {
        const a = st.p[i], b = st.p[i + 1], L = hyp(b[0] - a[0], b[1] - a[1]), dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L, nx = -dz, nz = dx;
        for (let t = 12; t < L - 8; t += 26) {
          const cx = a[0] + dx * t, cz = a[1] + dz * t; if (!W.inCore(cx, cz)) continue; const hw = st.w / 2 - 1.2, did = W.district(cx, cz), k0 = (r() * 4) | 0;
          for (let k = 0; k <= 16; k++) { const u = k / 16 - 0.5, sag = (1 - (u * 2) ** 2) * 1.1; pos.push(cx + nx * u * 2 * hw, 7.4 - sag, cz + nz * u * 2 * hw); ag.push(did, 3 + ((k + k0) % 4), 0.55); }
        }
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aG', new THREE.Float32BufferAttribute(ag, 3)); g.computeBoundingSphere();
    this.strings = new THREE.Points(g, this.gfx.glow()); this.strings.frustumCulled = false; this.scene.add(this.strings);
    // lanterns carried by skaters and the fire glow of barrels: always on
    this.lantG = new THREE.BufferGeometry(); this.lantP = new Float32Array(64 * 3); this.lantA = new Float32Array(64 * 3);
    this.lantG.setAttribute('position', new THREE.BufferAttribute(this.lantP, 3)); this.lantG.setAttribute('aG', new THREE.BufferAttribute(this.lantA, 3)); this.lantG.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    this.lanterns = new THREE.Points(this.lantG, this.gfx.glow()); this.lanterns.frustumCulled = false; this.scene.add(this.lanterns);
    this.fireLight = [new THREE.PointLight(0xff7a2a, 0, 11, 2), new THREE.PointLight(0xff7a2a, 0, 11, 2)]; for (const l of this.fireLight) this.scene.add(l);
  }
  _searchlights() {
    const m = new THREE.ShaderMaterial({ uniforms: { uA: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      vertexShader: `varying float vY; varying vec3 vN, vV; void main(){ vY = uv.y; vec4 mv = modelViewMatrix * vec4( position, 1.0 ); vN = normalize( normalMatrix * normal ); vV = normalize( -mv.xyz ); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uA; varying float vY; varying vec3 vN, vV; void main(){ float e = pow( 1.0 - abs( dot( vN, vV ) ), 1.5 ); float a = uA * ( 1.0 - vY ) * ( 1.0 - vY ) * ( 0.25 + 0.75 * ( 1.0 - e ) ); gl_FragColor = vec4( vec3( 0.9, 0.92, 1.0 ) * a * 0.16, 1.0 ); }` });
    const geo = new THREE.CylinderGeometry(26, 1.4, 460, 24, 1, true); geo.translate(0, 230, 0);
    const hub = this.map.hub; this.beams = [[-40, 30], [55, -20], [10, 70]].map(([dx, dz], i) => { const b = new THREE.Mesh(geo, m); b.position.set(hub[0] + dx, 2, hub[1] + dz); b.frustumCulled = false; b.renderOrder = 8; this.scene.add(b); return { m: b, ph: i * 2.1 }; });
    this.beamMat = m;
  }
  _heli() {
    const g = new THREE.Group(), dark = new THREE.MeshStandardMaterial({ color: 0x2a3036, roughness: 0.5, metalness: 0.5 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(1.4, 4.2, 6, 10), dark); body.rotation.x = Math.PI / 2; g.add(body);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 6.5), dark); tail.position.set(0, 0.4, -5.2); g.add(tail);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.8, 1.0), dark); fin.position.set(0, 1.2, -8.2); g.add(fin);
    this.rotor = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 6.2, 0.05, 24), new THREE.MeshBasicMaterial({ color: 0x111316, transparent: true, opacity: 0.22, depthWrite: false })); this.rotor.position.y = 1.7; g.add(this.rotor);
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 14, 120, 16, 1, true), this.beamMat.clone()); cone.geometry.translate(0, -60, 0); cone.material.uniforms.uA = { value: 0.9 }; cone.position.y = -1.2; cone.rotation.x = 0.35; g.add(cone); this.heliCone = cone;
    g.visible = false; this.scene.add(g); this.heli = { g, t: 99, dur: 60, a: null, b: null }; this.heliT = 40;
  }
  // ------------------------------------------------------------- per frame
  update(dt) {
    const G = this.G, P = G.P, gfx = this.gfx, night = gfx.U.uNight.value, W = this.W; this.t += dt;
    const px = (gfx.renderer.domElement.height / (2 * Math.tan((gfx.camera.fov * Math.PI) / 360)));
    const shot = G.t - (P.lastShot ?? -99) < 0.5 || G.combatT > 7.5, wind = 0.9;
    this._population(dt, shot);
    // emitters near the player
    for (const b of this.barrels) { const d = hyp(b.x - P.x, b.z - P.z); if (d > 160) continue; b.emit -= dt; if (b.emit <= 0) { b.emit = 0.07; this.glow.emit(b.x + (Math.random() - 0.5) * 0.4, 0.95, b.z + (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.3, 1.1 + Math.random(), (Math.random() - 0.5) * 0.3, (0.55 + Math.random() * 0.3) * (0.55 + 0.45 * night), 0.9, -0.6, 1.0, 0.42, 0.12, 0.22 + 0.68 * night); /* embers: soft by day, bright at night */ if (Math.random() < 0.35) this.smoke.emit(b.x, 1.6, b.z, 0, 0.9, 0, 4.5, 1.0, 3.5, 0.2, 0.19, 0.18, 0.35); } }
    for (const c of this.chim) { if (hyp(c.x - P.x, c.z - P.z) > 300) continue; c.e -= dt; if (c.e <= 0) { c.e = 0.9 + Math.random() * 0.6; this.smoke.emit(c.x, c.y, c.z, (Math.random() - 0.5) * 0.2, 1.0 + Math.random() * 0.5, (Math.random() - 0.5) * 0.2, 8, 2.0, 3.5, 0.62, 0.63, 0.66, 0.3); } }
    for (const s of this.steam) { if (hyp(s.x - P.x, s.z - P.z) > 140) continue; s.e -= dt; if (s.e <= 0) { s.e = 0.22 + Math.random() * 0.2; this.smoke.emit(s.x + (Math.random() - 0.5), 0.1, s.z + (Math.random() - 0.5), 0, 1.3, 0, 3.2, 1.2, 3, 0.85, 0.87, 0.9, 0.22); } }
    // fireworks over the city at night
    if (night > 0.6) { this.fwT -= dt; if (this.fwT <= 0) { this.fwT = 2 + Math.random() * 9; this._firework(P); } }
    this.smoke.update(dt, px, wind); this.glow.update(dt, px, wind * 0.3);
    // fire light from the two nearest barrels at night
    const nb = this.barrels.map((b) => [hyp(b.x - P.x, b.z - P.z), b]).sort((a, b) => a[0] - b[0]);
    this.fireLight.forEach((l, i) => { const e = nb[i]; if (!e || e[0] > 45) { l.intensity = 0; return; } l.position.set(e[1].x, 1.5, e[1].z); l.intensity = (0.2 + night * 2.2) * (0.8 + 0.2 * Math.sin(this.t * 17 + i * 3)); });
    // lanterns: skaters' hand lights + barrel glow points
    let li = 0; const LA = this.lantA, LP = this.lantP;
    for (const a of this.agents) if (a.kind === 'skate' && a.rig && li < 40) { LP[li * 3] = a.x + Math.sin(a.yaw) * 0.4; LP[li * 3 + 1] = (a.y || 0) + 1.0; LP[li * 3 + 2] = a.z + Math.cos(a.yaw) * 0.4; LA[li * 3] = -2; LA[li * 3 + 1] = 3 + (li % 4); LA[li * 3 + 2] = 0.55; li++; }
    for (const e of nb.slice(0, 14)) { if (li >= 64) break; const b = e[1]; LP[li * 3] = b.x; LP[li * 3 + 1] = 1.05; LP[li * 3 + 2] = b.z; LA[li * 3] = -2; LA[li * 3 + 1] = 7; LA[li * 3 + 2] = 1.6; li++; }
    for (let k = li; k < 64; k++) LA[k * 3 + 2] = 0;
    this.lantG.attributes.position.needsUpdate = true; this.lantG.attributes.aG.needsUpdate = true;
    // searchlights sweep at night
    const ba = clamp((night - 0.25) * 2.5, 0, 1); this.beamMat.uniforms.uA.value = ba * 0.22;
    for (const b of this.beams) { b.m.visible = ba > 0.01; b.m.rotation.set(0.42 + Math.sin(this.t * 0.11 + b.ph) * 0.25, this.t * 0.07 + b.ph, Math.sin(this.t * 0.09 + b.ph * 2) * 0.35); }
    this._birdsUpdate(dt, shot);
    this._heliUpdate(dt, P, night);
    // sounds: bells on the hour, crows at dusk, distant sirens
    const h = Math.floor(gfx.time); if (h !== this.bellH) { this.bellH = h; const n = h % 12 || 12, L = this.map.landmarks.find((q) => q.id === 'marien') || { c: this.map.hub }; for (let k = 0; k < n; k++) setTimeout(() => G.audio.playAt('bell', L.c[0], L.c[1], 1.4, 1), k * 2300); }
    this.sirenT -= dt; if (this.sirenT <= 0) { this.sirenT = 45 + Math.random() * 70; G.audio.play('siren', 0.25 + Math.random() * 0.2, 0.9 + Math.random() * 0.2, (Math.random() - 0.5) * 1.2); }
    this.cawT -= dt; if (this.cawT <= 0) { this.cawT = 6 + Math.random() * 14; const F = this.flocks[(Math.random() * this.flocks.length) | 0]; G.audio.playAt('caw', F.cx, F.cz, 0.8, 0.9 + Math.random() * 0.3); }
  }
  _firework(P) {
    const a = Math.random() * 6.283, d = 260 + Math.random() * 420, x = P.x + Math.cos(a) * d, z = P.z + Math.sin(a) * d, y = 120 + Math.random() * 110, cols = [[1, 0.25, 0.2], [0.3, 1, 0.45], [1, 0.8, 0.3], [0.45, 0.6, 1], [1, 0.45, 0.95], [1, 1, 0.95]], c = cols[(Math.random() * cols.length) | 0], n = 110 + ((Math.random() * 60) | 0), sp = 22 + Math.random() * 14;
    for (let k = 0; k < 14; k++) this.glow.emit(x, y - k * 6, z, 0, 0, 0, 0.25 + k * 0.03, 3.5, 0, 1, 0.75, 0.4, 0.5);
    for (let k = 0; k < n; k++) { const u = Math.random() * 2 - 1, t = Math.random() * 6.283, s = Math.sqrt(1 - u * u), v = sp * (0.85 + Math.random() * 0.3); this.glow.emit(x, y, z, Math.cos(t) * s * v, u * v, Math.sin(t) * s * v, 1.6 + Math.random() * 1.0, 5.5, -0.5, c[0], c[1], c[2], 1.0, 9.8); }
    const dist = hyp(x - P.x, z - P.z); setTimeout(() => { this.G.audio.playAt('boom', x, z, 0.5, 0.55 + Math.random() * 0.3); setTimeout(() => this.G.audio.playAt('crackle', x, z, 0.6, 1), 400); }, (dist / 343) * 1000);
  }
  _birdsUpdate(dt, shot) {
    const P = this.G.P, im = this.birdMesh;
    for (const F of this.flocks) { const d = hyp(F.cx - P.x, F.cz - P.z); if (shot && d < 180) { if (F.sc <= 0) this.G.audio.playAt('caw', F.cx, F.cz, 1.0, 1.1); F.sc = 7; } F.sc = Math.max(0, F.sc - dt); }
    this.birds.forEach((b, i) => {
      if (b.pig) {
        const d = hyp(b.gx - P.x, b.gz - P.z);
        if ((d < 6 || (shot && d < 60)) && !b.up) { b.up = 9 + Math.random() * 6; }
        if (b.up > 0) { b.up -= dt; b.fly = 1; b.a += dt * 0.9; const rr = 9 + (i % 5); b.x = b.gx + Math.cos(b.a) * rr; b.z = b.gz + Math.sin(b.a) * rr; b.y = damp(b.y, 14 + (i % 4) * 2, 2, dt); b.yaw = b.a + Math.PI; if (b.up <= 0) b.up = 0; }
        else { b.fly = 0; b.x = damp(b.x, b.gx, 1.5, dt); b.z = damp(b.z, b.gz, 1.5, dt); b.y = damp(b.y, 0.06, 3, dt); if (b.y < 0.5 && Math.random() < dt * 0.5) b.yaw += (Math.random() - 0.5) * 2; }
      } else {
        const F = b.F, k = 1 + F.sc * 0.5; b.a += dt * b.sp * k; const rr = b.r * (1 + F.sc * 0.08);
        b.x = F.cx + Math.cos(b.a) * rr; b.z = F.cz + Math.sin(b.a) * rr; b.y = b.h + Math.sin(b.a * 3 + i) * 3 + F.sc * 2; b.yaw = b.a + Math.PI; b.fly = 1;
      }
      this.flap.array[i] = b.fly; E.set(b.pig && !b.fly ? Math.sin(this.t * 6 + i) * 0.25 : 0.1, b.yaw, 0); Q.setFromEuler(E); M4.compose(V.set(b.x, b.y, b.z), Q, S1.set(b.s, b.s, b.s)); im.setMatrixAt(i, M4);
    });
    S1.set(1, 1, 1); im.instanceMatrix.needsUpdate = true; this.flap.needsUpdate = true;
  }
  _heliUpdate(dt, P, night) {
    const H = this.heli; this.heliT -= dt;
    if (this.heliT <= 0 && H.t >= H.dur) { this.heliT = 80 + Math.random() * 120; const a = Math.random() * 6.283; H.a = [P.x + Math.cos(a) * 1100, P.z + Math.sin(a) * 1100]; H.b = [P.x - Math.cos(a) * 1100, P.z - Math.sin(a) * 1100]; H.t = 0; H.dur = 2200 / 38; H.g.visible = true; H.th = 0; }
    if (!H.a || H.t >= H.dur) { H.g.visible = false; return; }
    H.t += dt; const k = H.t / H.dur, x = H.a[0] + (H.b[0] - H.a[0]) * k, z = H.a[1] + (H.b[1] - H.a[1]) * k + Math.sin(k * 6) * 40;
    H.g.position.set(x, 115 + Math.sin(k * 9) * 8, z); H.g.rotation.y = Math.atan2(H.b[0] - H.a[0], H.b[1] - H.a[1]); H.g.rotation.z = Math.sin(this.t * 0.7) * 0.06; this.rotor.rotation.y += dt * 40;
    this.heliCone.visible = night > 0.3; this.heliCone.rotation.z = Math.sin(this.t * 0.5) * 0.4;
    const d = hyp(x - P.x, z - P.z); H.th -= dt; if (d < 700 && H.th <= 0) { H.th = 0.115; this.G.audio.playAt('rotor', x, z, clamp(1.4 - d / 600, 0.05, 1.2), 1); }
    if ((this.t * 2 | 0) % 2 === 0 && Math.random() < dt * 4) this.glow.emit(x, H.g.position.y - 1.2, z, 0, 0, 0, 0.12, 6, 0, 1, 0.15, 0.1, 1);
  }
  // ------------------------------------------------------------- people: rigs only for those near the player
  _population(dt, shot) {
    const G = this.G, P = G.P, W = this.W; this.lodT -= dt;
    if (this.lodT <= 0) {
      this.lodT = 0.5;
      for (const a of this.agents) {
        if (a.kind === 'walk' && (!a.seg || hyp(a.x - P.x, a.z - P.z) > 150)) this._placeWalker(a, P);
        const d = hyp(a.x - P.x, a.z - P.z), want = d < (a.kind === 'skate' ? 160 : 85) && !a.gone;
        if (want && !a.rig) a.rig = this._rig(a); else if (!want && a.rig) { this._free(a.rig); a.rig = null; }
      }
    }
    for (const a of this.agents) {
      if (a.flee > 0) { a.flee -= dt; const dx = a.x - P.x, dz = a.z - P.z, l = hyp(dx, dz) || 1; const ox = a.x, oz = a.z; W.slide(a, (dx / l) * 4.6 * dt, (dz / l) * 4.6 * dt, 0.3); if (!W.walkable(a.x, a.z)) { a.x = ox; a.z = oz; } a.yaw = dampAng(a.yaw, Math.atan2(a.x - ox || dx, a.z - oz || dz), 8, dt); a.spd = 4.6; if (a.flee <= 0 && a.kind !== 'walk') { a.x = a.home ? a.home.x : a.x; a.z = a.home ? a.home.z : a.z; } }
      else if (a.kind === 'walk' && a.seg) {                 // scavengers: walk somewhere, stop and look around, walk on
        if (!a.path || a.pi >= a.path.length) { a.spd = 0; a.wait = (a.wait ?? 0) - dt; if (a.wait <= 0) { const f = W.findWalk(a.x, a.z, 16, 50, Math.random, 16); a.path = f ? W.path(a.x, a.z, f[0], f[1], 2500) : null; a.pi = 0; a.wait = 2 + Math.random() * 6; } }
        else { const wp = a.path[a.pi], ex = wp[0] - a.x, ez = wp[1] - a.z, l = hyp(ex, ez); if (l < 0.7) a.pi++; else { W.slide(a, (ex / l) * a.sp * dt, (ez / l) * a.sp * dt, 0.3); a.yaw = dampAng(a.yaw, Math.atan2(ex, ez), 5, dt); a.spd = a.sp; } }
      }
      else if (a.kind === 'patrol' && a.loop) {
        if (!a.path || a.pi >= a.path.length) { a.li = (a.li + 1) % a.loop.length; const t = a.loop[a.li]; a.path = W.path(a.x, a.z, t[0], t[1], 2500) || [t]; a.pi = 0; }
        const wp = a.path[a.pi], ex = wp[0] - a.x, ez = wp[1] - a.z, l = hyp(ex, ez); if (l < 0.7) a.pi++; else { W.slide(a, (ex / l) * a.sp * dt, (ez / l) * a.sp * dt, 0.3); a.yaw = dampAng(a.yaw, Math.atan2(ex, ez), 5, dt); } a.spd = a.sp;
      }
      else if (a.kind === 'skate') { a.ang += (a.sp / a.rad) * dt * (a.kind === 'skate' ? 1 : 0.6); const nx = a.cx + Math.cos(a.ang) * a.rad, nz = a.cz + Math.sin(a.ang) * a.rad; a.yaw = Math.atan2(nx - a.x, nz - a.z); a.x = nx; a.z = nz; a.spd = a.kind === 'skate' ? a.sp * 0.6 : a.sp; }
      else a.spd = 0;
      if (shot && a.kind !== 'patrol' && a.kind !== 'skate' && !a.flee && hyp(a.x - P.x, a.z - P.z) < 45) a.flee = 7 + Math.random() * 3;
      if (!a.rig) continue;
      const r = a.rig; r.root.position.set(a.x, a.y || 0, a.z); r.root.rotation.y = a.kind === 'warm' && !a.flee ? a.yaw : a.yaw;
      if (hyp(a.x - P.x, a.z - P.z) < 70 || a.kind === 'skate') { r.pose({ speed: a.spd, warm: a.kind === 'warm' && !a.flee, skate: a.kind === 'skate', aim: 0, pitch: 0 }, dt); r.root.updateMatrixWorld(true); }
      if (a.kind === 'chat' && !a.flee && Math.random() < dt * 0.3) a.yaw = dampAng(a.yaw, a.yaw + (Math.random() - 0.5) * 1.2, 2, 0.2);
      if ((a.kind === 'warm' || a.kind === 'chat') && !a.flee && hyp(a.x - P.x, a.z - P.z) < 16 && Math.random() < dt * 0.2) G.audio.playAt('murmur', a.x, a.z, 0.5, 0.9 + Math.random() * 0.2);
    }
  }
  _placeWalker(a, P) {
    for (let k = 0; k < 20; k++) {
      const s = this.walks[(Math.random() * this.walks.length) | 0]; if (!s) return;
      const t = Math.random(), x0 = s.a[0] + (s.b[0] - s.a[0]) * t, z0 = s.a[1] + (s.b[1] - s.a[1]) * t, d = hyp(x0 - P.x, z0 - P.z); if (d < 14 || d > 100) continue;
      const cy = this.G.cam.yaw, fw = ((x0 - P.x) * Math.sin(cy) + (z0 - P.z) * Math.cos(cy)) / d; if (fw < 0.15 && Math.random() < 0.75) continue;
      const L = hyp(s.b[0] - s.a[0], s.b[1] - s.a[1]), nx = -(s.b[1] - s.a[1]) / L, nz = (s.b[0] - s.a[0]) / L, sd = Math.random() < 0.5 ? 1 : -1, x = x0 + nx * s.off * sd, z = z0 + nz * s.off * sd;
      if (!this.W.walkable(x, z)) continue;
      a.x = x; a.z = z; a.seg = s; a.path = null; a.wait = Math.random() * 3; a.yaw = Math.random() * 6.2832; a.flee = 0; return;
    }
  }
  _rig(a) {
    const look = a.look === 'friend' ? LOOKS.friend : LOOKS.civ, gun = a.look === 'friend' ? 'ar' : null;
    let r = this.pool.pop();
    if (r) { r.setOutfit(Array.isArray(look.outfit) ? look.outfit[(Math.random() * look.outfit.length) | 0] : look.outfit); r.setPalette(look.pal, look.vary || 0.6); r.setGun(gun); r.root.visible = true; }
    else { r = new Rig(this.gfx, { ...look, vary: look.vary || 0.6 }, gun); this.scene.add(r.root); }
    return r;
  }
  _free(r) { r.root.visible = false; this.pool.push(r); }
}
function pip(p, x, z) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const a = p[i], b = p[j]; if ((a[1] > z) !== (b[1] > z) && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
