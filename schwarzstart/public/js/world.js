// SCHWARZSTART · the city: geometry from map data, colliders, cover, pathing
import * as THREE from 'three';
import { rng, clamp, hyp, imagePixels } from './util.js';
import { buildLandmark } from './landmarks.js';
import { buildFurniture } from './furniture.js';
import { MB, C, pip, F_COVER, F_LOW, F_WALL, F_SOFT } from './geom.js';

export const CHUNK = 250;
// Phase 1 field of play: the dense core (Museumsinsel, Hackescher Markt, Nikolaiviertel, Alexanderplatz, Spandauer Vorstadt, east Unter den Linden)
export const CORE = [-545, -950, 1500, 290];
export { MB, C, F_COVER, F_LOW, F_WALL, F_SOFT };

const mul3 = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
const CAR_COLS = [0xd8dadc, 0xa9adb2, 0x1b1d21, 0x24304a, 0x7a1f20, 0x55585c, 0x2f4a3a, 0xe9e6dc, 0x8a6d3b, 0x101113, 0x3d4f6b, 0xb9b3a6];

export class World {
  constructor(gfx, map, im) {
    this.gfx = gfx; this.map = map; this.b = map.bounds; this.W = this.b[2] - this.b[0]; this.H = this.b[3] - this.b[1];
    this.segs = []; this.grid = new Map(); this.stamp = 0; this.cell = 20;
    this.lamps = []; this.lampGrid = new Map(); this.chunks = new Map(); this.group = new THREE.Group(); gfx.scene.add(this.group);
    const wk = imagePixels(im.walk); this.gw = wk.width; this.gh = wk.height; this.walk = new Uint8Array(this.gw * this.gh);
    for (let i = 0; i < this.walk.length; i++) this.walk[i] = wk.data[i * 4] > 127 ? 1 : 0;
    const di = imagePixels(im.dist); this.dw = di.width; this.dh = di.height; this.dist = new Uint8Array(this.dw * this.dh);
    for (let i = 0; i < this.dist.length; i++) this.dist[i] = di.data[i * 4];
    this.mask1 = gfx.maskTexture(im.mask1); this.mask2 = gfx.maskTexture(im.mask2);
    this.power = new Float32Array(16); this.powerT = new Float32Array(16);
    this.F = map.frames; this._im = im; this.core = CORE; this.coreMargin = [2.5, 32, 32, 2.5]; this.drawDist = gfx.q.draw || 900; this.cullT = 0;
  }
  fr(name, a, b) { const f = this.F[name]; return [f.o[0] + a * f.u[0] + b * f.v[0], f.o[1] + a * f.u[1] + b * f.v[1]]; }

  // ---------------------------------------------------------------- colliders
  addSeg(x1, z1, x2, z2, h, flags = 0, y0 = 0, ref = null) {
    const s = { x1, z1, x2, z2, h, y0, f: flags, r: 0, st: 0, ref, off: false }; const i = this.segs.push(s) - 1; this._ins(i, Math.min(x1, x2), Math.min(z1, z2), Math.max(x1, x2), Math.max(z1, z2)); return s;
  }
  addCircle(x, z, r, h, flags = 0, ref = null) { const s = { x1: x, z1: z, x2: x, z2: z, h, y0: 0, f: flags, r, st: 0, ref, off: false }; const i = this.segs.push(s) - 1; this._ins(i, x - r, z - r, x + r, z + r); return s; }
  addBox(cx, cz, ax, az, l, w, h, flags = 0, ref = null) {
    const bx = -az, bz = ax, hl = l / 2, hw = w / 2, p = [[-hl, -hw], [hl, -hw], [hl, hw], [-hl, hw]].map(([a, b]) => [cx + a * ax + b * bx, cz + a * az + b * bz]), out = [];
    for (let i = 0; i < 4; i++) out.push(this.addSeg(p[i][0], p[i][1], p[(i + 1) % 4][0], p[(i + 1) % 4][1], h, flags, 0, ref));
    return out;
  }
  _ins(i, x0, z0, x1, z1) {
    const c = this.cell;
    for (let gx = Math.floor((x0 - 0.6) / c); gx <= Math.floor((x1 + 0.6) / c); gx++) for (let gz = Math.floor((z0 - 0.6) / c); gz <= Math.floor((z1 + 0.6) / c); gz++) { const k = gx * 4096 + gz; let a = this.grid.get(k); if (!a) this.grid.set(k, (a = [])); a.push(i); }
  }
  // push a circle out of solid geometry; returns true on contact
  collide(p, r, minH = 0.35) {
    let hit = false; const c = this.cell, gx0 = Math.floor((p.x - r - 0.3) / c), gx1 = Math.floor((p.x + r + 0.3) / c), gz0 = Math.floor((p.z - r - 0.3) / c), gz1 = Math.floor((p.z + r + 0.3) / c);
    for (let pass = 0; pass < 2; pass++) for (let gx = gx0; gx <= gx1; gx++) for (let gz = gz0; gz <= gz1; gz++) {
      const a = this.grid.get(gx * 4096 + gz); if (!a) continue;
      for (let n = 0; n < a.length; n++) {
        const s = this.segs[a[n]]; if (s.off || s.h < minH || (s.f & F_SOFT)) continue;
        const dx = s.x2 - s.x1, dz = s.z2 - s.z1, l2 = dx * dx + dz * dz; let t = l2 > 0 ? ((p.x - s.x1) * dx + (p.z - s.z1) * dz) / l2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const qx = s.x1 + dx * t, qz = s.z1 + dz * t; let ex = p.x - qx, ez = p.z - qz; const rr = r + s.r, d2 = ex * ex + ez * ez;
        if (d2 < rr * rr) { let d = Math.sqrt(d2); if (d < 1e-4) { ex = -dz; ez = dx; d = Math.hypot(ex, ez) || 1; } p.x = qx + (ex / d) * rr; p.z = qz + (ez / d) * rr; hit = true; }
      }
    }
    return hit;
  }
  // 3D ray against the 2.5D world. Returns {t, s, x, y, z, nx, nz} for the nearest hit within maxT, or null.
  ray(ox, oy, oz, dx, dy, dz, maxT, skipLow = false) {
    const st = ++this.stamp, c = this.cell, hl = Math.hypot(dx, dz); let best = null, bt = maxT;
    if (dy < -1e-5) { const tg = -oy / dy; if (tg > 0 && tg < bt) { bt = tg; best = { t: tg, s: null, x: ox + dx * tg, y: 0, z: oz + dz * tg, nx: 0, nz: 0, ground: true }; } }
    const steps = Math.max(1, Math.ceil((hl * bt) / (c * 0.5)));
    let lk = -1;
    for (let i = 0; i <= steps; i++) {
      const tt = (i / steps) * bt, k = Math.floor((ox + dx * tt) / c) * 4096 + Math.floor((oz + dz * tt) / c); if (k === lk) continue; lk = k;
      for (let ax = -1; ax <= 1; ax++) for (let az = -1; az <= 1; az++) {
        if (ax && az) continue; const a = this.grid.get(k + ax * 4096 + az); if (!a) continue;
        for (let n = 0; n < a.length; n++) {
          const s = this.segs[a[n]]; if (s.st === st || s.off) continue; s.st = st; if (skipLow && s.h < 1.5) continue;
          let t = -1, nx = 0, nz = 0;
          if (s.r > 0) {
            const fx = ox - s.x1, fz = oz - s.z1, A = dx * dx + dz * dz, B = 2 * (fx * dx + fz * dz), Cq = fx * fx + fz * fz - s.r * s.r, D = B * B - 4 * A * Cq;
            if (A > 1e-9 && D >= 0) { t = (-B - Math.sqrt(D)) / (2 * A); nx = (ox + dx * t - s.x1) / s.r; nz = (oz + dz * t - s.z1) / s.r; }
          } else {
            const ex = s.x2 - s.x1, ez = s.z2 - s.z1, den = dx * ez - dz * ex;
            if (Math.abs(den) > 1e-9) { const wx = s.x1 - ox, wz = s.z1 - oz, tr = (wx * ez - wz * ex) / den, u = (wx * dz - wz * dx) / den; if (u >= 0 && u <= 1) { t = tr; const l = Math.hypot(ex, ez) || 1; nx = -ez / l; nz = ex / l; if (nx * dx + nz * dz > 0) { nx = -nx; nz = -nz; } } }
          }
          if (t > 1e-4 && t < bt) { const y = oy + dy * t; if (y >= s.y0 && y <= s.h) { bt = t; best = { t, s, x: ox + dx * t, y, z: oz + dz * t, nx, nz }; } }
        }
      }
    }
    return best;
  }
  los(ax, ay, az, bx, by, bz) { const dx = bx - ax, dy = by - ay, dz = bz - az, l = Math.hypot(dx, dy, dz); if (l < 0.01) return true; const h = this.ray(ax, ay, az, dx / l, dy / l, dz / l, l - 0.05); return !h || h.ground; }
  // nearest cover edge to a point: {s, x, z, nx, nz, low, t}
  cover(x, z, maxD, fx = 0, fz = 0) {
    const c = this.cell; let best = null, bd = maxD * maxD; const st = ++this.stamp;
    for (let gx = Math.floor((x - maxD) / c); gx <= Math.floor((x + maxD) / c); gx++) for (let gz = Math.floor((z - maxD) / c); gz <= Math.floor((z + maxD) / c); gz++) {
      const a = this.grid.get(gx * 4096 + gz); if (!a) continue;
      for (let n = 0; n < a.length; n++) {
        const s = this.segs[a[n]]; if (s.st === st || s.off) continue; s.st = st; if (!(s.f & F_COVER) || s.r > 0) continue;
        const dx = s.x2 - s.x1, dz = s.z2 - s.z1, l2 = dx * dx + dz * dz; if (l2 < 0.5) continue; let t = ((x - s.x1) * dx + (z - s.z1) * dz) / l2; t = clamp(t, 0, 1);
        const qx = s.x1 + dx * t, qz = s.z1 + dz * t, ex = x - qx, ez = z - qz; let d2 = ex * ex + ez * ez;
        const l = Math.sqrt(l2); let nx = -dz / l, nz = dx / l; if (nx * ex + nz * ez < 0) { nx = -nx; nz = -nz; }
        if (fx || fz) d2 -= (-(nx * fx + nz * fz)) * 0.8;           // prefer cover the character is facing
        if (d2 < bd) { bd = d2; best = { s, x: qx, z: qz, nx, nz, low: !!(s.f & F_LOW), t, len: l, dx: dx / l, dz: dz / l }; }
      }
    }
    return best;
  }
  coversNear(x, z, rad, out = []) {
    const c = this.cell, st = ++this.stamp;
    for (let gx = Math.floor((x - rad) / c); gx <= Math.floor((x + rad) / c); gx++) for (let gz = Math.floor((z - rad) / c); gz <= Math.floor((z + rad) / c); gz++) {
      const a = this.grid.get(gx * 4096 + gz); if (!a) continue;
      for (let n = 0; n < a.length; n++) { const s = this.segs[a[n]]; if (s.st === st || s.off) continue; s.st = st; if ((s.f & F_COVER) && s.r === 0 && !(s.f & F_WALL)) out.push(s); }
    }
    return out;
  }
  // ---------------------------------------------------------------- grids
  gi(x, z) { const gx = Math.floor((x - this.b[0]) / 2), gz = Math.floor((z - this.b[1]) / 2); return gx < 0 || gz < 0 || gx >= this.gw || gz >= this.gh ? -1 : gz * this.gw + gx; }
  walkRaw(x, z) { const i = this.gi(x, z); return i >= 0 && this.walk[i] === 1; }
  inCore(x, z) { const c = this.core; return x >= c[0] && x <= c[2] && z >= c[1] && z <= c[3]; }
  walkable(x, z) { return this.inCore(x, z) && this.walkRaw(x, z); }
  district(x, z) { const gx = clamp(Math.floor((x - this.b[0]) / 10), 0, this.dw - 1), gz = clamp(Math.floor((z - this.b[1]) / 10), 0, this.dh - 1); return this.dist[gz * this.dw + gx]; }
  street(x, z) {
    let bd = 1e9, bn = '';
    for (const s of this.map.streets) { if (!s.n) continue; for (let i = 0; i < s.p.length - 1; i++) { const a = s.p[i], b = s.p[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz, t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / l2, 0, 1), d = (x - a[0] - dx * t) ** 2 + (z - a[1] - dz * t) ** 2; if (d < bd) { bd = d; bn = s.n; } } }
    return bd < 60 * 60 ? bn : '';
  }
  // a walkable point near (x,z), optionally at a ring distance
  findWalk(x, z, r0, r1, R, tries = 30) { for (let i = 0; i < tries; i++) { const a = R() * 6.2832, d = r0 + (r1 - r0) * R(), px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d; if (this.walkable(px, pz) && this.walkable(px + 1.5, pz) && this.walkable(px - 1.5, pz) && this.walkable(px, pz + 1.5) && this.walkable(px, pz - 1.5)) return [px, pz]; } return null; }
  gridLos(ax, az, bx, bz) { const d = hyp(bx - ax, bz - az), n = Math.ceil(d / 1.5); for (let i = 1; i < n; i++) { const t = i / n; if (!this.walkable(ax + (bx - ax) * t, az + (bz - az) * t)) return false; } return true; }
  // A* over the 2 m walk grid
  path(ax, az, bx, bz, maxN = 5000) {
    if (this.gridLos(ax, az, bx, bz)) return [[bx, bz]];
    const gw = this.gw, gh = this.gh, N = gw * gh; if (!this.pg) { this.pg = new Float32Array(N); this.pf = new Int32Array(N); this.ps = new Uint32Array(N); this.pq = 0; }
    const s = this.gi(ax, az); let e = this.gi(bx, bz); if (s < 0 || e < 0) return null;
    if (!this.walk[e]) { let f = -1; for (let r = 1; r < 6 && f < 0; r++) for (let dz = -r; dz <= r && f < 0; dz++) for (let dx = -r; dx <= r; dx++) { const j = e + dz * gw + dx; if (j >= 0 && j < N && this.walk[j]) { f = j; break; } } if (f < 0) return null; e = f; }
    const q = ++this.pq, g = this.pg, from = this.pf, seen = this.ps, ex = e % gw, ez = (e / gw) | 0, heap = [], hf = [];
    const push = (i, f) => { let k = heap.length; heap.push(i); hf.push(f); while (k > 0) { const p = (k - 1) >> 1; if (hf[p] <= f) break; heap[k] = heap[p]; hf[k] = hf[p]; heap[p] = i; hf[p] = f; k = p; } };
    const pop = () => { const top = heap[0], li = heap.pop(), lf = hf.pop(); if (heap.length) { let k = 0; const n = heap.length; for (;;) { let c = k * 2 + 1; if (c >= n) break; if (c + 1 < n && hf[c + 1] < hf[c]) c++; if (hf[c] >= lf) break; heap[k] = heap[c]; hf[k] = hf[c]; k = c; } heap[k] = li; hf[k] = lf; } return top; };
    g[s] = 0; seen[s] = q; from[s] = -1; push(s, 0); let n = 0, found = false;
    const NB = [1, 0, 1, -1, 0, 1, 0, 1, 1, 0, -1, 1, 1, 1, 1.414, -1, 1, 1.414, 1, -1, 1.414, -1, -1, 1.414];
    while (heap.length && n++ < maxN) {
      const cur = pop(); if (cur === e) { found = true; break; } const cx = cur % gw, cz = (cur / gw) | 0;
      for (let k = 0; k < 24; k += 3) {
        const nx = cx + NB[k], nz = cz + NB[k + 1]; if (nx < 0 || nz < 0 || nx >= gw || nz >= gh) continue; const j = nz * gw + nx; if (!this.walk[j]) continue;
        if (NB[k + 2] > 1 && (!this.walk[cz * gw + nx] || !this.walk[nz * gw + cx])) continue;
        const ng = g[cur] + NB[k + 2]; if (seen[j] === q && ng >= g[j]) continue; g[j] = ng; seen[j] = q; from[j] = cur; push(j, ng + Math.hypot(nx - ex, nz - ez) * 1.02);
      }
    }
    if (!found) return null;
    const pts = []; for (let c = e; c !== -1; c = from[c]) pts.push([this.b[0] + (c % gw) * 2 + 1, this.b[1] + ((c / gw) | 0) * 2 + 1]); pts.reverse();
    const out = []; let i = 0, px = ax, pz = az;                       // string-pull
    while (i < pts.length - 1) { let j = pts.length - 1; while (j > i + 1 && !this.gridLos(px, pz, pts[j][0], pts[j][1])) j--; out.push(pts[j]); px = pts[j][0]; pz = pts[j][1]; i = j; }
    out.push([bx, bz]); return out;
  }

  // ---------------------------------------------------------------- construction
  ch(x, z) {
    const k = Math.floor(x / CHUNK) + ',' + Math.floor(z / CHUNK); let c = this.chunks.get(k);
    if (!c) { c = { fac: [], brand: new MB(), roof: new MB(), trim: new MB(), prop: new MB(), tree: new MB(), via: new MB(), gp: [], gg: [], pool: new MB(), pg: [] }; for (let i = 0; i < 8; i++) c.fac.push(new MB()); c.ex = {}; this.chunks.set(k, c); }
    return c;
  }
  mb(x, z, name) { const c = this.ch(x, z); if (name === 'roof' || name === 'trim' || name === 'prop') return c[name]; return c.ex[name] || (c.ex[name] = new MB()); }
  // facade on a wall running a (left) -> b (right) as seen from outside
  facadeWall(mb, ax, az, bx, bz, floors, style, col, did, seed) {
    const t = this.gfx.tex['f' + style], L = hyp(bx - ax, bz - az), bw = t.mw / t.bays, nb = Math.max(1, Math.round(L / bw)), u0 = (seed % t.bays) / t.bays, u1 = u0 + nb / t.bays, fx = [did, seed / 999, floors, 0];
    mb.wall(ax, az, bx, bz, 0, 4.4, u0, u1, 0.004, 0.3293, col, fx);
    for (let k = 0, y = 4.4; k * 2 < floors; k++) { const two = floors - k * 2 >= 2, y1 = y + (two ? 2 : 1) * t.fh; mb.wall(ax, az, bx, bz, y, y1, u0, u1, 0.3373, two ? 0.997 : 0.6667, col, fx); y = y1; }
    return 4.4 + floors * t.fh;
  }
  async build(step) {
    const gfx = this.gfx, map = this.map, R = rng(4711), tick = () => new Promise((r) => setTimeout(r, 0));
    // ground + water
    const gg = new THREE.PlaneGeometry(this.W + 2400, this.H + 2400); gg.rotateX(-Math.PI / 2); gg.translate((this.b[0] + this.b[2]) / 2, 0, (this.b[1] + this.b[3]) / 2);
    const ground = new THREE.Mesh(gg, gfx.ground(this.mask1, this.mask2, [this.b[0], this.b[1], this.W, this.H])); ground.receiveShadow = true; ground.matrixAutoUpdate = false; this.group.add(ground);
    const wg = new THREE.PlaneGeometry(this.W, this.H); wg.rotateX(-Math.PI / 2); wg.translate((this.b[0] + this.b[2]) / 2, -2.2, (this.b[1] + this.b[3]) / 2);
    const water = new THREE.Mesh(wg, gfx.water()); water.matrixAutoUpdate = false; this.group.add(water);
    step(0.05); await tick();
    // quay walls + parapets
    const stone = C(0x8f8a80);
    for (const poly of map.water) for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], dx = b[0] - a[0], dz = b[1] - a[1], l = hyp(dx, dz); if (l < 0.6) continue;
      let nx = -dz / l, nz = dx / l; const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2; if (!pip(poly, mx + nx * 0.8, mz + nz * 0.8)) { nx = -nx; nz = -nz; }   // n points into the water
      if (mx < this.b[0] + 3 || mx > this.b[2] - 3 || mz < this.b[1] + 3 || mz > this.b[3] - 3) continue;
      const c = this.ch(mx, mz), u = l / 6;
      c.trim.quad([a[0], -2.4, a[1]], [b[0], -2.4, b[1]], [b[0], 0.02, b[1]], [a[0], 0.02, a[1]], [0, 0], [u, 0], [u, 0.4], [0, 0.4], stone, null, [nx, 0, nz]);
      const ox = -nx * 0.32, oz = -nz * 0.32, top = 0.95;
      c.trim.quad([a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], top, b[1]], [a[0], top, a[1]], [0, 0], [u, 0], [u, 0.16], [0, 0.16], stone, null, [nx, 0, nz]);
      c.trim.quad([a[0] + ox, 0, a[1] + oz], [b[0] + ox, 0, b[1] + oz], [b[0] + ox, top, b[1] + oz], [a[0] + ox, top, a[1] + oz], [0, 0], [u, 0], [u, 0.16], [0, 0.16], stone, null, [-nx, 0, -nz]);
      c.trim.quad([a[0], top, a[1]], [b[0], top, b[1]], [b[0] + ox, top, b[1] + oz], [a[0] + ox, top, a[1] + oz], [0, 0], [u, 0], [u, 0.06], [0, 0.06], stone, null, [0, 1, 0]);
      this.addSeg(a[0] + ox * 0.5, a[1] + oz * 0.5, b[0] + ox * 0.5, b[1] + oz * 0.5, top, F_COVER | F_LOW);
    }
    // block perimeters are solid walls (and corner cover)
    for (const bl of map.blocks) for (let i = 0; i < bl.p.length; i++) { const a = bl.p[i], b = bl.p[(i + 1) % bl.p.length]; this.addSeg(a[0], a[1], b[0], b[1], 40, F_WALL | F_COVER); }
    for (const pg of map.viaSolid) for (let i = 0; i < pg.length; i++) { const a = pg[i], b = pg[(i + 1) % pg.length]; this.addSeg(a[0], a[1], b[0], b[1], 40, F_WALL | F_COVER); }
    step(0.12); await tick();
    // perimeter buildings
    const TR = [C(0xcfc4a8), C(0x9a968c), C(0x8a4e3c), C(0xa8a498), C(0xc9c0aa), C(0x7f858c), C(0xbdb193), C(0xaaa59a)];
    let n = 0;
    for (const B of map.builds) {
      const [x1, z1, x2, z2, dep, hh, st, fl, did, seed] = B, L = hyp(x2 - x1, z2 - z1); if (L < 1) continue;
      const ex = (x2 - x1) / L, ez = (z2 - z1) / L, ix = -ez, iz = ex, c = this.ch((x1 + x2) / 2, (z1 + z2) / 2), r = rng(seed * 977 + n++);
      const k = 0.8 + r() * 0.36, w = (r() - 0.5) * 0.1, col = [k * (1 + w), k, k * (1 - w)];
      const top = this.facadeWall(c.fac[st], x2, z2, x1, z1, fl, st, col, did, seed);
      const x3 = x2 + ix * dep, z3 = z2 + iz * dep, x4 = x1 + ix * dep, z4 = z1 + iz * dep, bc = [k * 0.9, k * 0.88, k * 0.84];
      c.brand.wall(x1, z1, x4, z4, 0, top, 0, dep / 8, 0, top / 8, bc); c.brand.wall(x4, z4, x3, z3, 0, top, 0, L / 8, 0, top / 8, bc); c.brand.wall(x3, z3, x2, z2, 0, top, 0, dep / 8, 0, top / 8, bc);
      c.roof.quad([x1, top, z1], [x2, top, z2], [x3, top, z3], [x4, top, z4], [x1 / 6, z1 / 6], [x2 / 6, z2 / 6], [x3 / 6, z3 / 6], [x4 / 6, z4 / 6], null, null, [0, 1, 0]);
      const ang = Math.atan2(-ez, ex), mx = (x1 + x2) / 2, mz = (z1 + z2) / 2, tc = TR[st].map((v) => v * k);
      if (st !== 5) c.trim.box(mx - ix * 0.12, top - 0.28, mz - iz * 0.12, L, 0.46, 0.62, ang, tc, { uv: 3 });
      c.trim.box(mx + ix * 0.25, top, mz + iz * 0.25, L, 0.7, 0.3, ang, tc, { uv: 3 });
      if (st !== 5) c.trim.box(mx - ix * 0.07, 4.2, mz - iz * 0.07, L, 0.34, 0.3, ang, tc, { uv: 3 });
      let rtop = top;
      if ((st === 0 || st === 1 || st === 2 || st === 6) && dep >= 8 && top > 11 && L >= 4) {
        // Berlin mansard: steep slate/zinc slopes front and back, flat top, dormers on the street side
        const rh = 3.0 + r() * 1.3, rd = Math.min(dep * 0.32, 2.6), rb = Math.min(dep * 0.3, 2.4), tm = this.mb(mx, mz, 'tile'), sk = 0.75 + r() * 0.35;
        const tcol = r() < 0.7 ? C(0x5d6266, sk) : C(0x8a4a3a, sk), y1 = top + rh, e0 = 0.25;
        const P = (t, d, y) => [x1 + ex * t + ix * d, y, z1 + ez * t + iz * d];
        const A = P(0, e0, top), Bq = P(L, e0, top), Cq = P(L, rd, y1), Dq = P(0, rd, y1), E = P(L, dep - rb, y1), Fq = P(0, dep - rb, y1), Gq = P(L, dep, top), Hq = P(0, dep, top);
        const sl = Math.hypot(rd - e0, rh) / 4, u1 = L / 4;
        tm.quad(A, Bq, Cq, Dq, [0, 0], [u1, 0], [u1, sl], [0, sl], tcol, null, [-ix, 0.6, -iz]);
        tm.quad(Dq, Cq, E, Fq, [0, 0], [u1, 0], [u1, 1], [0, 1], tcol, null, [0, 1, 0]);
        tm.quad(Fq, E, Gq, Hq, [0, 0], [u1, 0], [u1, sl], [0, sl], tcol, null, [ix, 0.6, iz]);
        for (const [t, sg] of [[0, -1], [L, 1]]) { const a0 = P(t, e0, top), a1 = P(t, rd, y1), a2 = P(t, dep - rb, y1), a3 = P(t, dep, top); tm.quad(a0, a1, a2, a3, [0, 0], [0.5, 1], [1.5, 1], [2, 0], tcol, null, [ex * sg, 0, ez * sg]); }
        const nd = Math.floor((L - 2) / 3.4);
        for (let q = 0; q < nd; q++) {
          if (r() < 0.25) continue;
          const t = 1.7 + (q + 0.5) * ((L - 3.4) / nd), dx = x1 + ex * t + ix * (rd * 0.55 + 0.2), dz = z1 + ez * t + iz * (rd * 0.55 + 0.2);
          c.trim.box(dx, top + 0.35, dz, 1.15, 1.55, 1.4, ang, mul3(tcol, 1.15), { uv: 2 });
          c.trim.box(dx - ix * 0.71, top + 0.55, dz - iz * 0.71, 0.75, 0.95, 0.06, ang, C(0x141618), { uv: 2 });
          c.trim.box(dx, top + 1.9, dz, 1.35, 0.14, 1.6, ang, mul3(tcol, 0.9), { uv: 2 });
        }
        rtop = y1;
      }
      const nc = r() < 0.85 ? 1 + ((r() * 3) | 0) : 0;
      for (let q = 0; q < nc; q++) { const a = (r() - 0.5) * (L - 3), d = 2 + r() * (dep - 4); c.trim.box(mx + ex * a + ix * d, rtop, mz + ez * a + iz * d, 0.6 + r() * 1.0, 1.0 + r() * 1.4, 0.5 + r() * 0.5, ang, C(r() < 0.5 ? 0x7a3e30 : 0x5a554e, 0.7 + r() * 0.5), { uv: 3 }); }
    }
    step(0.3); await tick();
    for (const M of map.masses) {
      const p = M.p, cx = p.reduce((s, q) => s + q[0], 0) / p.length, cz = p.reduce((s, q) => s + q[1], 0) / p.length, c = this.ch(cx, cz), r = rng(p.length * 31 + (cx | 0)), k = 0.82 + r() * 0.3, col = [k, k, k]; let top = 0;
      for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length], dx = b[0] - a[0], dz = b[1] - a[1], l = hyp(dx, dz); if (l < 1.5) continue; const inside = pip(p, (a[0] + b[0]) / 2 - (dz / l) * 0.5, (a[1] + b[1]) / 2 + (dx / l) * 0.5); top = inside ? this.facadeWall(c.fac[M.s], b[0], b[1], a[0], a[1], M.fl, M.s, col, M.d, i * 7) : this.facadeWall(c.fac[M.s], a[0], a[1], b[0], b[1], M.fl, M.s, col, M.d, i * 7); }
      const tri = THREE.ShapeUtils.triangulateShape(p.map((q) => new THREE.Vector2(q[0], q[1])), []);
      for (const t of tri) c.roof.tri([p[t[0]][0], top, p[t[0]][1]], [p[t[2]][0], top, p[t[2]][1]], [p[t[1]][0], top, p[t[1]][1]], [p[t[0]][0] / 6, p[t[0]][1] / 6], [p[t[2]][0] / 6, p[t[2]][1] / 6], [p[t[1]][0] / 6, p[t[1]][1] / 6], null, null, [0, 1, 0], [0, 1, 0]);
    }
    // skyline beyond the playable map
    const ro = rng(99);
    for (let i = 0; i < 230; i++) {
      const side = i % 4, tpos = ro(), off = 30 + ro() * 420; let x, z;
      if (side === 0) { x = this.b[0] - off; z = this.b[1] + tpos * this.H; } else if (side === 1) { x = this.b[2] + off; z = this.b[1] + tpos * this.H; } else if (side === 2) { z = this.b[1] - off; x = this.b[0] + tpos * this.W; } else { z = this.b[3] + off; x = this.b[0] + tpos * this.W; }
      const l = 30 + ro() * 70, w = 14 + ro() * 22, st = [0, 1, 2, 3, 3, 4, 7][(ro() * 7) | 0], fl = 4 + ((ro() * (ro() < 0.12 ? 16 : 4)) | 0), a = ro() < 0.5 ? 0 : Math.PI / 2, c = this.ch(x, z), k = 0.8 + ro() * 0.3, col = [k, k, k];
      const cs = Math.cos(a), sn = Math.sin(a), P = (u, v) => [x + u * cs + v * sn, z - u * sn + v * cs], q = [P(-l / 2, -w / 2), P(l / 2, -w / 2), P(l / 2, w / 2), P(-l / 2, w / 2)]; let top = 0;
      for (let e = 0; e < 4; e++) { const A = q[e], Bq = q[(e + 1) % 4], mxx = (A[0] + Bq[0]) / 2 - x, mzz = (A[1] + Bq[1]) / 2 - z, dx = Bq[0] - A[0], dz = Bq[1] - A[1]; top = (-dz * mxx + dx * mzz > 0) ? this.facadeWall(c.fac[st], A[0], A[1], Bq[0], Bq[1], fl, st, col, 15, i) : this.facadeWall(c.fac[st], Bq[0], Bq[1], A[0], A[1], fl, st, col, 15, i); }
      c.roof.quad([q[0][0], top, q[0][1]], [q[1][0], top, q[1][1]], [q[2][0], top, q[2][1]], [q[3][0], top, q[3][1]], [0, 0], [l / 6, 0], [l / 6, w / 6], [0, w / 6], null, null, [0, 1, 0]);
    }
    step(0.42); await tick();
    this._viaduct(); step(0.5); await tick();
    this._props(R); step(0.6); await tick();
    try { this.furn = buildFurniture(this, this._im); } catch (e) { console.warn('furniture', e); } this._im = null; step(0.64); await tick();
    // landmarks
    this.lmGroup = new THREE.Group(); this.group.add(this.lmGroup); this.lm = {};
    for (const Lm of map.landmarks) { try { buildLandmark(Lm, this); } catch (e) { console.warn('landmark', Lm.id, e); } }
    step(0.8); await tick();
    this._flush(); step(1);
  }

  _viaduct() {
    const v = this.map.via, HW = 8.5, steel = C(0x3c4a46), conc = C(0x9a968e), bal = C(0x4a4640);
    let dist = 0;
    for (let i = 0; i < v.length - 1; i++) {
      const a = v[i], b = v[i + 1], l = hyp(b[0] - a[0], b[1] - a[1]); if (l > 6 || l < 0.5) { dist = 0; continue; }
      const nxa = -a[3], nza = a[2], nxb = -b[3], nzb = b[2], c = this.ch(a[0], a[1]), solid = a[4] === 0 && b[4] === 0;
      const La = [a[0] + nxa * HW, a[1] + nza * HW], Ra = [a[0] - nxa * HW, a[1] - nza * HW], Lb = [b[0] + nxb * HW, b[1] + nzb * HW], Rb = [b[0] - nxb * HW, b[1] - nzb * HW];
      const u0 = dist / 8, u1 = (dist + l) / 8; dist += l;
      if (solid) {
        c.via.quad([La[0], 0, La[1]], [Lb[0], 0, Lb[1]], [Lb[0], 7.5, Lb[1]], [La[0], 7.5, La[1]], [u0, 0], [u1, 0], [u1, 1], [u0, 1], null, null, [nxa, 0, nza]);
        c.via.quad([Ra[0], 0, Ra[1]], [Rb[0], 0, Rb[1]], [Rb[0], 7.5, Rb[1]], [Ra[0], 7.5, Ra[1]], [u1, 0], [u0, 0], [u0, 1], [u1, 1], null, null, [-nxa, 0, -nza]);
      } else {
        c.prop.quad([La[0], 5.7, La[1]], [Lb[0], 5.7, Lb[1]], [Rb[0], 5.7, Rb[1]], [Ra[0], 5.7, Ra[1]], [0, 0], [0, 0], [0, 0], [0, 0], steel, null, [0, -1, 0]);
        if ((a[4] === 0) !== (b[4] === 0)) { const e = a[4] === 0 ? a : b, ex = -e[3], ez = e[2]; this.addSeg(e[0] + ex * HW, e[1] + ez * HW, e[0] - ex * HW, e[1] - ez * HW, 40, F_WALL); c.trim.quad([e[0] + ex * HW, 0, e[1] + ez * HW], [e[0] - ex * HW, 0, e[1] - ez * HW], [e[0] - ex * HW, 7.5, e[1] - ez * HW], [e[0] + ex * HW, 7.5, e[1] + ez * HW], [0, 0], [3, 0], [3, 1.3], [0, 1.3], conc, null, a[4] === 0 ? [a[2], 0, a[3]] : [-a[2], 0, -a[3]]); }
      }
      const y0 = solid ? 7.5 : 5.7, fc = solid ? conc : steel;
      c.prop.quad([La[0], y0, La[1]], [Lb[0], y0, Lb[1]], [Lb[0], 8.9, Lb[1]], [La[0], 8.9, La[1]], [0, 0], [0, 0], [0, 0], [0, 0], fc, null, [nxa, 0, nza]);
      c.prop.quad([Ra[0], y0, Ra[1]], [Rb[0], y0, Rb[1]], [Rb[0], 8.9, Rb[1]], [Ra[0], 8.9, Ra[1]], [0, 0], [0, 0], [0, 0], [0, 0], fc, null, [-nxa, 0, -nza]);
      c.prop.quad([La[0], 8.3, La[1]], [Lb[0], 8.3, Lb[1]], [Rb[0], 8.3, Rb[1]], [Ra[0], 8.3, Ra[1]], [0, 0], [0, 0], [0, 0], [0, 0], bal, null, [0, 1, 0]);
      if (i % 9 === 0) for (const sd of [-1, 1]) { const px = a[0] + nxa * sd * 7.6, pz = a[1] + nza * sd * 7.6; c.prop.box(px, 8.3, pz, 0.22, 6.2, 0.22, 0, steel); c.prop.box(a[0] + nxa * sd * 3.8, 14.2, a[1] + nza * sd * 3.8, 7.6, 0.16, 0.16, Math.atan2(-nza, nxa), steel); }
      for (const S of this.map.stations) {               // arched train sheds
        const d = hyp(a[0] - S.p[0], a[1] - S.p[1]); if (d > S.len / 2) continue;
        const seg = 8, rw = 10.2, rh = 9.5, gl = C(0x1a2226), rib = C(0x2c3538), isRib = i % 4 === 0;
        for (let k = 0; k < seg; k++) {
          const t0 = (k / seg) * Math.PI, t1 = ((k + 1) / seg) * Math.PI, o0 = Math.cos(t0) * rw, o1 = Math.cos(t1) * rw, h0 = 8.3 + Math.sin(t0) * rh, h1 = 8.3 + Math.sin(t1) * rh;
          c.shed = c.shed || new MB();
          c.shed.quad([a[0] + nxa * o0, h0, a[1] + nza * o0], [b[0] + nxb * o0, h0, b[1] + nzb * o0], [b[0] + nxb * o1, h1, b[1] + nzb * o1], [a[0] + nxa * o1, h1, a[1] + nza * o1], [0, 0], [0, 0], [0, 0], [0, 0], isRib || k === 0 || k === seg - 1 ? rib : gl, null, [nxa * Math.cos((t0 + t1) / 2), Math.sin((t0 + t1) / 2), nza * Math.cos((t0 + t1) / 2)]);
        }
      }
    }
  }

  car(mb, x, z, ang, type, seed, o = {}) {
    const r = rng(seed * 131 + type), burnt = o.burnt ?? r() < 0.06, body = burnt ? C(0x1a1612) : C(type === 3 ? 0xd9b21a : CAR_COLS[seed % CAR_COLS.length], 0.9), gl = C(0x0c1014), ty = C(0x0d0d0e), tr = C(0x22252a);
    const D = [[4.4, 1.78, 1.44, 0.62, 2.5, 1.9, -0.25], [4.6, 1.86, 1.66, 0.74, 3.1, 2.6, 0.25], [5.4, 2.0, 2.3, 1.7, 4.0, 3.9, 0.55], [10.5, 2.5, 3.1, 2.4, 10.3, 10.2, 0]][type], [l, w, hgt, hb, cl0, cl1, cx] = D;
    const cs = Math.cos(ang), sn = Math.sin(ang), P = (u, v) => [x + u * cs + v * sn, z - u * sn + v * cs];
    mb.box(x, 0.3, z, l, hb, w, ang, body, { l1: l - 0.14, w1: w - 0.1 });
    const pc = P(cx, 0); mb.box(pc[0], 0.3 + hb, pc[1], cl0, hgt - 0.3 - hb, w - 0.12, ang, gl, { l1: cl1, w1: w - 0.36, topCol: body, xo: type < 2 ? 0.1 : 0 });
    if (type >= 2) { const pb = P(cx, 0); mb.box(pb[0], 0.3 + hb - 0.02, pb[1], cl0 + 0.02, 0.5, w - 0.08, ang, body, { noTop: true }); }
    mb.box(x, 0.2, z, l - 0.5, 0.12, w - 0.1, ang, tr, { noTop: true });
    const wx = type === 3 ? [l * 0.32, -l * 0.3] : [l * 0.31, -l * 0.31];
    for (const u of wx) for (const sd of [-1, 1]) { const p = P(u, sd * (w / 2 - 0.12)); mb.box(p[0], 0, p[1], 0.64, 0.64, 0.24, ang, ty, { l1: 0.4, w1: 0.24 }); }
    const hgtC = type < 2 ? 1.38 : hgt;
    if (!o.noCol) this.addBox(x, z, cs, -sn, l, w, hgtC, F_COVER | (type < 2 ? F_LOW : 0));
  }
  lamp(c, x, z, type, ang, did) {
    const col = C(type ? 0x4a4f52 : 0x23302a), mb = c.prop, hgt = type ? 9.2 : 4.4;
    mb.cyl(x, 0, z, type ? 0.11 : 0.085, type ? 0.07 : 0.055, hgt, 6, col, { smooth: true });
    let lx = x, lz = z;
    if (type) { lx = x - Math.sin(ang) * 1.5; lz = z + Math.cos(ang) * 1.5; mb.box((x + lx) / 2, hgt - 0.1, (z + lz) / 2, 0.12, 0.12, 1.7, -ang, col); mb.box(lx, hgt - 0.22, lz, 0.34, 0.14, 0.7, -ang, col); }
    else { mb.box(x, hgt, z, 0.34, 0.5, 0.34, 0, C(0x3a4038), { l1: 0.48, w1: 0.48 }); mb.box(x, hgt + 0.5, z, 0.56, 0.16, 0.56, 0, col, { l1: 0.12, w1: 0.12 }); }
    const y = hgt + (type ? -0.35 : 0.22); c.gp.push(lx, y, lz); c.gg.push(did, type ? 0.55 : 0.0, type ? 3.2 : 2.4);
    const s = type ? 11 : 6.5; c.pool.quad([lx - s, 0.05, lz - s], [lx + s, 0.05, lz - s], [lx + s, 0.05, lz + s], [lx - s, 0.05, lz + s], [0, 0], [1, 0], [1, 1], [0, 1], null, null, [0, 1, 0]); for (let k = 0; k < 6; k++) c.pg.push(did, type ? 0.55 : 0.0, type ? 0.34 : 0.4);
    const L = { x: lx, y, z: lz, did, type }; this.lamps.push(L); const k2 = Math.floor(lx / 60) * 4096 + Math.floor(lz / 60); let a = this.lampGrid.get(k2); if (!a) this.lampGrid.set(k2, (a = [])); a.push(L);
    this.addCircle(x, z, 0.14, 40);
  }
  _props(R) {
    const map = this.map;
    for (const t of map.trees) {
      const [x, z, s] = t, c = this.ch(x, z), r = rng((x * 13 + z * 7) | 0), bark = C(0x2a2622, 0.8 + r() * 0.5), a0 = r() * 3.14;
      c.prop.cyl(x, 0, z, 0.2 * s, 0.11 * s, 3.2 * s, 6, bark, { smooth: true });
      const w = 4.2 * s, h0 = 1.4 * s, h1 = 10.5 * s;
      for (let k = 0; k < 3; k++) { const a = a0 + (k * Math.PI) / 3, dx = Math.cos(a) * w, dz = Math.sin(a) * w; c.tree.quad([x - dx, h0, z - dz], [x + dx, h0, z + dz], [x + dx, h1, z + dz], [x - dx, h1, z - dz], [0, 0], [1, 0], [1, 1], [0, 1], null, null, null, [0, 1, 0]); }
      this.addCircle(x, z, 0.26 * s, 40);
    }
    for (const l of map.lamps) this.lamp(this.ch(l[0], l[1]), l[0], l[1], l[2], l[3], this.district(l[0], l[1]));
    for (const cr of map.cars) this.car(this.ch(cr[0], cr[1]).prop, cr[0], cr[1], -cr[2], cr[3], cr[4]);
  }
  _flush() {
    const g = this.gfx, T = g.tex;
    const mats = { brand: g.surf('brandwand', { vcol: true, snow: 0 }), roof: g.surf('roof', { snow: 1.1 }), trim: g.surf('stone', { vcol: true, snow: 0.9 }), via: g.surf('viaduct', { snow: 0 }), prop: g.vcol({ rough: 0.55, snow: 1 }) };
    this.treeMat = new THREE.MeshStandardMaterial({ map: T.tree, alphaTest: 0.42, side: THREE.DoubleSide, roughness: 1, color: 0xb9b2ac });
    const shed = g.vcol({ rough: 0.28, metal: 0.5, snow: 0.7, side: THREE.DoubleSide });
    const ex = { copper: g.surf('copper', { vcol: true, snow: 0.8 }), concrete: g.surf('concrete', { vcol: true, snow: 0.6 }), glass: g.vcol({ rough: 0.1, metal: 0.9, snow: 0.35 }), dark: g.vcol({ rough: 0.6, snow: 0 }), gold: g.vcol({ rough: 0.32, metal: 1, snow: 0 }), tile: g.surf('tile', { vcol: true, snow: 1 }), metal: g.surf('metal', { vcol: true, snow: 0.6, metal: 0.6 }) };
    for (const [key, c] of this.chunks) {
      const grp = new THREE.Group(); grp.name = key;
      for (let i = 0; i < 8; i++) if (!c.fac[i].empty) grp.add(c.fac[i].mesh(g.facade(i)));
      for (const k of ['brand', 'roof', 'trim', 'via', 'prop']) if (!c[k].empty) grp.add(c[k].mesh(mats[k]));
      if (c.shed) grp.add(c.shed.mesh(shed));
      for (const k in c.ex) if (!c.ex[k].empty) grp.add(c.ex[k].mesh(ex[k] || mats.prop));
      if (!c.tree.empty) { const m = c.tree.mesh(this.treeMat); grp.add(m); }
      if (c.gp.length) { const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(c.gp, 3)); pg.setAttribute('aG', new THREE.Float32BufferAttribute(c.gg, 3)); pg.computeBoundingSphere(); const pts = new THREE.Points(pg, g.glow()); pts.renderOrder = 15; grp.add(pts); }
      if (!c.pool.empty) { const pm = c.pool.geometry(); pm.setAttribute('aG', new THREE.Float32BufferAttribute(c.pg, 3)); const m = new THREE.Mesh(pm, g.pools()); m.renderOrder = 5; grp.add(m); }
      this.group.add(grp); c.fac = c.brand = c.roof = c.trim = c.prop = c.tree = c.via = c.pool = c.shed = c.ex = null; c.gp = c.gg = c.pg = null; c.group = grp;
    }
  }
  // ---------------------------------------------------------------- runtime
  setPower(did, on, instant = false) { this.powerT[did] = on ? 1 : 0; if (instant) this.power[did] = this.powerT[did]; }
  update(dt, px, pz) {
    this.cullT -= dt;
    if (this.cullT <= 0) {               // distance culling of whole city chunks
      this.cullT = 0.3; const R = this.drawDist + CHUNK * 0.75; let n = 0;
      for (const [key, c] of this.chunks) { if (!c.group) continue; if (c.cx === undefined) { const [i, j] = key.split(',').map(Number); c.cx = (i + 0.5) * CHUNK; c.cz = (j + 0.5) * CHUNK; } const v = hyp(c.cx - px, c.cz - pz) < R; c.group.visible = v; n += v; }
      this.visChunks = n;
    }
    const U = this.gfx.U.uPower.value;
    for (let i = 0; i < 16; i++) { if (this.power[i] !== this.powerT[i]) { this.power[i] = clamp(this.power[i] + Math.sign(this.powerT[i] - this.power[i]) * dt * 0.45, 0, 1); } const p = this.power[i]; U[i] = p > 0 && p < 1 ? (Math.sin(p * 40) > -0.2 ? p : 0) : p; }
    U[15] = 0.25;
    // nearest powered street lamps become real lights
    if (this.gfx.U.uNight.value > 0.2) {
      const near = []; const gx = Math.floor(px / 60), gz = Math.floor(pz / 60);
      for (let ax = -1; ax <= 1; ax++) for (let az = -1; az <= 1; az++) { const a = this.lampGrid.get((gx + ax) * 4096 + gz + az); if (a) for (const l of a) if (this.power[l.did] > 0.5) near.push(l); }
      near.sort((a, b) => (a.x - px) ** 2 + (a.z - pz) ** 2 - ((b.x - px) ** 2 + (b.z - pz) ** 2));
      const k = this.gfx.U.uNight.value; this.gfx.setLamps(near.slice(0, this.gfx.lamps.length).map((l) => ({ x: l.x, y: l.y - 0.3, z: l.z, i: (l.type ? 160 : 70) * k, c: l.type ? 0xffd9a8 : 0xffb060 })));
    } else this.gfx.setLamps([]);
  }
}
