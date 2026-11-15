// SCHWARZSTART · the route: a lit line on the street from the agent to the next fight, with chevrons running toward it.
// Nobody should ever have to work out where to go. The path comes from the city's walk grid (A*), is pulled taut,
// rounded, and redrawn every second or so as the agent moves.
import * as THREE from 'three';

const MAXP = 360, INF = 0x3fffffff;

export class Route {
  constructor(gfx, world) {
    this.W = world; this.pts = null; this.t = 0; this.key = '';
    const g = new THREE.BufferGeometry(); this.pos = new Float32Array(MAXP * 2 * 3); this.uvA = new Float32Array(MAXP * 2 * 2);
    const idx = []; for (let i = 0; i < MAXP - 1; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); /* wound to face up */ }
    g.setIndex(idx); g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('aU', new THREE.BufferAttribute(this.uvA, 2)); g.setDrawRange(0, 0);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTime: gfx.U.uTime, uLen: { value: 1 }, uA: { value: 1 } }, transparent: true, depthWrite: false, fog: false,
      vertexShader: 'attribute vec2 aU; varying vec2 vU; void main(){ vU = aU; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }',
      fragmentShader: /* glsl */`
        varying vec2 vU; uniform float uTime, uLen, uA;
        void main(){
          float d = vU.x, s = abs( vU.y );
          float core = 1.0 - smoothstep( 0.1, 0.34, s ), edge = ( 1.0 - smoothstep( 0.3, 1.0, s ) ) * 0.45;
          float ch = fract( ( d - s * 0.9 - uTime * 3.2 ) / 2.6 ), chev = smoothstep( 0.0, 0.06, ch ) * ( 1.0 - smoothstep( 0.12, 0.24, ch ) ) * ( 1.0 - smoothstep( 0.5, 1.0, s ) );
          float fade = smoothstep( 1.2, 4.0, d ) * ( 1.0 - smoothstep( uLen - 6.0, uLen, d ) * 0.6 ) * ( 1.0 - smoothstep( 70.0, 120.0, d ) );
          vec3 col = mix( vec3( 1.0, 0.4, 0.06 ) * 1.6, vec3( 1.0, 0.72, 0.36 ) * 2.4, chev );
          float a = clamp( core * 0.9 + edge + chev * 0.6, 0.0, 1.0 ) * fade * uA;
          gl_FragColor = vec4( col, a );
        }`,
    });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 6; gfx.scene.add(this.mesh);
  }
  // ---- distance field: walking distance from the fight to every street cell (Dijkstra with a bucket queue, a slice per frame).
  // Once it reaches the agent, the route is just "walk downhill", so it costs nothing to redraw and never gets lost.
  field(tx, tz) {
    const W = this.W, gw = W.gw, gh = W.gh, N = gw * gh, b = W.b, c = W.core;
    if (!this.D || this.D.length !== N) this.D = new Int32Array(N);
    let e = W.gi(tx, tz); if (e < 0) { this.F = null; return; }
    if (!W.walk[e]) { let f = -1; for (let r = 1; r < 8 && f < 0; r++) for (let dz = -r; dz <= r && f < 0; dz++) for (let dx = -r; dx <= r; dx++) { const j = e + dz * gw + dx; if (j >= 0 && j < N && W.walk[j]) { f = j; break; } } if (f < 0) { this.F = null; return; } e = f; }
    this.D.fill(INF); this.D[e] = 0; const B = []; for (let i = 0; i < 64; i++) B.push([]); B[0].push(e);
    this.F = { tx, tz, e, B, cur: 0, pend: 1, done: false, x0: Math.max(1, Math.floor((c[0] - b[0]) / 2)), x1: Math.min(gw - 2, Math.floor((c[2] - b[0]) / 2)), z0: Math.max(1, Math.floor((c[1] - b[1]) / 2)), z1: Math.min(gh - 2, Math.floor((c[3] - b[1]) / 2)) };
  }
  step(budget) {
    // Dijkstra with a bucket queue; cells blocked only by props (cars, barriers) stay passable at a high price, so the route goes around them
    const F = this.F; if (!F || F.done) return; const D = this.D, wk = this.W.walk, nv = this.W.nav || wk, gw = this.W.gw, B = F.B, x0 = F.x0, x1 = F.x1, z0 = F.z0, z1 = F.z1; let cur = F.cur, pend = F.pend, n = 0;
    const rel = (j, w) => { const nd = cur + w + (nv[j] === 1 ? 0 : 40); if (nd < D[j]) { D[j] = nd; B[nd & 63].push(j); pend++; } };
    while (pend > 0 && n < budget) {
      const bk = B[cur & 63];
      while (bk.length && n < budget) {
        const i = bk.pop(); pend--; if (D[i] !== cur) continue; n++;
        const cx = i % gw, cz = (i - cx) / gw, l = cx > x0 && wk[i - 1] === 1, r = cx < x1 && wk[i + 1] === 1, u = cz > z0 && wk[i - gw] === 1, d = cz < z1 && wk[i + gw] === 1;
        if (l) rel(i - 1, 10); if (r) rel(i + 1, 10); if (u) rel(i - gw, 10); if (d) rel(i + gw, 10);
        if (l && u && wk[i - gw - 1] === 1) rel(i - gw - 1, 14); if (r && u && wk[i - gw + 1] === 1) rel(i - gw + 1, 14);
        if (l && d && wk[i + gw - 1] === 1) rel(i + gw - 1, 14); if (r && d && wk[i + gw + 1] === 1) rel(i + gw + 1, 14);
      }
      if (!bk.length) cur++;
    }
    F.cur = cur; F.pend = pend; if (pend <= 0) F.done = true;
  }
  // final walking distance in metres from (x,z) to the current fight, or -1 while the field has not reached it
  distAt(x, z) {
    const F = this.F; if (!F) return -1; const i = this.W.gi(x, z); if (i < 0) return -1; const v = this.D[i];
    return v < INF && (F.done || v < F.cur) ? v * 0.2 : -1;
  }
  // walk downhill through the field from (x,z); up to maxM metres of cell centres, ending exactly at the target
  trace(x, z, maxM) {
    const W = this.W, D = this.D, F = this.F, gw = W.gw, b = W.b, wk = W.walk; let i = W.gi(x, z); if (i < 0) return null;
    const ok = (v) => v < INF && (F.done || v < F.cur);
    if (!ok(D[i])) { let bi = -1, bv = INF; for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) { const j = i + dz * gw + dx; if (j >= 0 && j < D.length && ok(D[j]) && D[j] + (Math.abs(dx) + Math.abs(dz)) * 10 < bv) { bv = D[j] + (Math.abs(dx) + Math.abs(dz)) * 10; bi = j; } } if (bi < 0) return null; i = bi; }
    const pts = [[x, z]]; let len = 0, px = x, pz = z;
    for (let n = 0; n < 1500 && D[i] > 0; n++) {
      let bj = i, bv = D[i]; const l = wk[i - 1] === 1, r = wk[i + 1] === 1, u = wk[i - gw] === 1, dd = wk[i + gw] === 1;
      const tryJ = (j) => { if (D[j] < bv) { bv = D[j]; bj = j; } };
      if (l) tryJ(i - 1); if (r) tryJ(i + 1); if (u) tryJ(i - gw); if (dd) tryJ(i + gw);
      if (l && u) tryJ(i - gw - 1); if (r && u) tryJ(i - gw + 1); if (l && dd) tryJ(i + gw - 1); if (r && dd) tryJ(i + gw + 1);
      if (bj === i) break; i = bj;
      const cx = b[0] + (i % gw) * 2 + 1, cz = b[1] + ((i / gw) | 0) * 2 + 1; len += Math.hypot(cx - px, cz - pz); px = cx; pz = cz; pts.push([cx, cz]);
      if (len > maxM) return pts;
    }
    if (D[i] === 0) pts.push([F.tx, F.tz]);
    return pts;
  }
  // the route from (x,z): the field if it is ready, else the plain A*; pulled taut and rounded
  plan(x, z, tx, tz) {
    const W = this.W; let p = this.F && this.F.tx === tx && this.F.tz === tz ? this.trace(x, z, 170) : null;
    if (!p) { p = W.path(x, z, tx, tz, 20000); if (!p || !p.length) return null; p = [[x, z], ...p]; }
    const out = [p[0]]; let i = 0;                 // string-pull: jump to the farthest point we can see
    while (i < p.length - 1) { let j = i + 1; for (let k = Math.min(p.length - 1, i + 40); k > i + 1; k--) if (W.gridLos(p[i][0], p[i][1], p[k][0], p[k][1])) { j = k; break; } out.push(p[j]); i = j; }
    let q = out; for (let it = 0; it < 2; it++) { if (q.length < 3) break; const r = [q[0]]; for (let k = 0; k < q.length - 1; k++) { const a = q[k], b = q[k + 1]; r.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } r.push(q[q.length - 1]); q = r; }
    return q;
  }
  update(dt, G) {
    const wp = G.wp, P = G.P; this.t -= dt;
    if (wp) { const ck = wp.x + ',' + wp.z + '|' + this.W.core.join(','); if (ck !== this.fk) { this.fk = ck; this.field(wp.x, wp.z); } this.step(60000); }
    const fightHere = wp && wp.s && wp.s.active && G.alive(wp.s) > 0 && Math.hypot(wp.x - P.x, wp.z - P.z) < 45;
    const show = wp && !P.dead && !fightHere && Math.hypot(wp.x - P.x, wp.z - P.z) > 6;
    this.mat.uniforms.uA.value += ((show ? 1 : 0) - this.mat.uniforms.uA.value) * Math.min(1, dt * 4);
    if (!show) { if (this.mat.uniforms.uA.value < 0.02) this.mesh.visible = false; return; }
    this.mesh.visible = true;
    const key = Math.round(wp.x) + ',' + Math.round(wp.z), moved = this.from ? Math.hypot(P.x - this.from[0], P.z - this.from[1]) : 99, fresh = this.F && this.F.tx === wp.x && this.F.tz === wp.z && this.F.reached !== true && this.distAt(P.x, P.z) >= 0;
    if (fresh) this.F.reached = true;
    if (this.t <= 0 || key !== this.key || moved > 2.5 || fresh) { this.t = 0.6; this.key = key; this.from = [P.x, P.z]; this.pts = this.plan(P.x, P.z, wp.x, wp.z); this.build(); }
  }
  build() {
    const pts = this.pts; if (!pts || pts.length < 2) { this.mesh.geometry.setDrawRange(0, 0); return; }
    const res = []; for (let k = 0; k < pts.length - 1; k++) { const a = pts[k], b = pts[k + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / 0.9)); for (let i = 0; i < n; i++) res.push([a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]); if (res.length > MAXP - 2) break; }
    res.push(pts[pts.length - 1]); const n = Math.min(res.length, MAXP); let d = 0; const w = 0.5;
    for (let i = 0; i < n; i++) {
      const p = res[i], q = res[Math.min(n - 1, i + 1)], o = res[Math.max(0, i - 1)]; let tx = q[0] - o[0], tz = q[1] - o[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
      if (i > 0) d += Math.hypot(p[0] - res[i - 1][0], p[1] - res[i - 1][1]);
      const nx = -tz * w, nz = tx * w, k = i * 6; this.pos[k] = p[0] + nx; this.pos[k + 1] = 0.07; this.pos[k + 2] = p[1] + nz; this.pos[k + 3] = p[0] - nx; this.pos[k + 4] = 0.07; this.pos[k + 5] = p[1] - nz;
      this.uvA[i * 4] = d; this.uvA[i * 4 + 1] = 1; this.uvA[i * 4 + 2] = d; this.uvA[i * 4 + 3] = -1;
    }
    this.mat.uniforms.uLen.value = d; const g = this.mesh.geometry; g.attributes.position.needsUpdate = true; g.attributes.aU.needsUpdate = true; g.setDrawRange(0, (n - 1) * 6);
  }
}
