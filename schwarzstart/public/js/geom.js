// SCHWARZSTART · geometry builder shared by the city and its landmarks
import * as THREE from 'three';

export const F_COVER = 1, F_LOW = 2, F_WALL = 4, F_SOFT = 8;
const _c = new THREE.Color();
export const C = (hex, k = 1) => { _c.set(hex); return [_c.r * k, _c.g * k, _c.b * k]; };

// ---------------------------------------------------------------- mesh builder (non-indexed triangles)
export class MB {
  constructor() { this.p = []; this.n = []; this.u = []; this.c = []; this.x = []; }
  get empty() { return this.p.length === 0; }
  v(a, n, uv, col, fx) { this.p.push(a[0], a[1], a[2]); this.n.push(n[0], n[1], n[2]); this.u.push(uv[0], uv[1]); if (col) this.c.push(col[0], col[1], col[2]); if (fx) this.x.push(fx[0], fx[1], fx[2], fx[3]); }
  tri(a, b, c, ua, ub, uc, col, fx, n, want) {
    if (want) { const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2]; if ((uy * vz - uz * vy) * want[0] + (uz * vx - ux * vz) * want[1] + (ux * vy - uy * vx) * want[2] < 0) { let t = b; b = c; c = t; t = ub; ub = uc; uc = t; } }
    if (!n) { const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2]; n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx]; const l = Math.hypot(n[0], n[1], n[2]) || 1; n[0] /= l; n[1] /= l; n[2] /= l; }
    this.v(a, n, ua, col, fx); this.v(b, n, ub, col, fx); this.v(c, n, uc, col, fx);
  }
  // quad a,b,c,d (perimeter order). `want` flips the winding so the face normal agrees with it; `fn` overrides the stored normal.
  quad(a, b, c, d, ua, ub, uc, ud, col, fx, want, fn) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
    let n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx]; const l = Math.hypot(n[0], n[1], n[2]) || 1; n[0] /= l; n[1] /= l; n[2] /= l;
    if (want && n[0] * want[0] + n[1] * want[1] + n[2] * want[2] < 0) { let t = b; b = d; d = t; t = ub; ub = ud; ud = t; n = [-n[0], -n[1], -n[2]]; }
    if (fn) n = fn;
    this.v(a, n, ua, col, fx); this.v(b, n, ub, col, fx); this.v(c, n, uc, col, fx); this.v(a, n, ua, col, fx); this.v(c, n, uc, col, fx); this.v(d, n, ud, col, fx);
  }
  // vertical wall; a is the left end as seen from outside
  wall(ax, az, bx, bz, y0, y1, u0, u1, v0, v1, col, fx) {
    this.quad([ax, y0, az], [bx, y0, bz], [bx, y1, bz], [ax, y1, az], [u0, v0], [u1, v0], [u1, v1], [u0, v1], col, fx);
  }
  // oriented box, optional taper to (l1,w1) at the top, xo shifts the top along its length
  box(cx, y0, cz, l, hgt, w, rot, col, o = {}) {
    const l1 = o.l1 ?? l, w1 = o.w1 ?? w, xo = o.xo ?? 0, s = o.uv ?? 1, cs = Math.cos(rot), sn = Math.sin(rot), y1 = y0 + hgt;
    const P = (x, y, z) => [cx + x * cs + z * sn, y, cz - x * sn + z * cs];
    const b = [P(-l / 2, y0, -w / 2), P(l / 2, y0, -w / 2), P(l / 2, y0, w / 2), P(-l / 2, y0, w / 2)], t = [P(-l1 / 2 + xo, y1, -w1 / 2), P(l1 / 2 + xo, y1, -w1 / 2), P(l1 / 2 + xo, y1, w1 / 2), P(-l1 / 2 + xo, y1, w1 / 2)];
    const ctr = [cx, (y0 + y1) / 2, cz];
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4, m = [(b[i][0] + b[j][0]) / 2 - ctr[0], 0, (b[i][2] + b[j][2]) / 2 - ctr[2]], L = (i % 2 ? w : l) / s;
      this.quad(b[i], b[j], t[j], t[i], [0, 0], [L, 0], [L, hgt / s], [0, hgt / s], col, o.fx, m);
    }
    if (!o.noTop) this.quad(t[0], t[1], t[2], t[3], [0, 0], [l1 / s, 0], [l1 / s, w1 / s], [0, w1 / s], o.topCol || col, o.fx, [0, 1, 0]);
    if (o.bottom) this.quad(b[0], b[1], b[2], b[3], [0, 0], [l / s, 0], [l / s, w / s], [0, w / s], col, o.fx, [0, -1, 0]);
  }
  cyl(cx, y0, cz, r0, r1, hgt, seg, col, o = {}) {
    const s = o.uv ?? 1;
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * 6.2832, a1 = ((i + 1) / seg) * 6.2832, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      const A = [cx + c0 * r0, y0, cz + s0 * r0], B = [cx + c1 * r0, y0, cz + s1 * r0], Cc = [cx + c1 * r1, y0 + hgt, cz + s1 * r1], Dd = [cx + c0 * r1, y0 + hgt, cz + s0 * r1];
      const u0 = (i / seg) * 6.2832 * r0 / s, u1 = ((i + 1) / seg) * 6.2832 * r0 / s, want = [(c0 + c1) / 2, 0, (s0 + s1) / 2];
      if (o.smooth) { this.v(A, [c0, 0, s0], [u0, 0], col); this.v(Cc, [c1, 0, s1], [u1, hgt / s], col); this.v(B, [c1, 0, s1], [u1, 0], col); this.v(A, [c0, 0, s0], [u0, 0], col); this.v(Dd, [c0, 0, s0], [u0, hgt / s], col); this.v(Cc, [c1, 0, s1], [u1, hgt / s], col); }
      else this.quad(A, B, Cc, Dd, [u0, 0], [u1, 0], [u1, hgt / s], [u0, hgt / s], col, null, want);
      if (o.cap) this.tri([cx, y0 + hgt, cz], Dd, Cc, [0, 0], [0, 0], [0, 0], o.capCol || col, null, [0, 1, 0]);
    }
  }
  // surface of revolution from a profile [[r,y],...]
  lathe(cx, cz, prof, seg, col, o = {}) {
    for (let k = 0; k < prof.length - 1; k++) {
      const [r0, y0] = prof[k], [r1, y1] = prof[k + 1];
      for (let i = 0; i < seg; i++) {
        const a0 = (i / seg) * 6.2832, a1 = ((i + 1) / seg) * 6.2832, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
        const want = [(c0 + c1) / 2, (r0 - r1) / (Math.abs(y1 - y0) + 0.001) * 0.5, (s0 + s1) / 2];
        this.quad([cx + c0 * r0, y0, cz + s0 * r0], [cx + c1 * r0, y0, cz + s1 * r0], [cx + c1 * r1, y1, cz + s1 * r1], [cx + c0 * r1, y1, cz + s0 * r1], [i / seg * (o.ur ?? 8), y0 / (o.vs ?? 4)], [(i + 1) / seg * (o.ur ?? 8), y0 / (o.vs ?? 4)], [(i + 1) / seg * (o.ur ?? 8), y1 / (o.vs ?? 4)], [i / seg * (o.ur ?? 8), y1 / (o.vs ?? 4)], col, null, want);
      }
    }
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    if (this.c.length) g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    if (this.x.length) g.setAttribute('aFx', new THREE.Float32BufferAttribute(this.x, 4));
    g.computeBoundingSphere(); g.computeBoundingBox(); return g;
  }
  mesh(mat, shadow = true, recv = true) { const m = new THREE.Mesh(this.geometry(), mat); m.castShadow = shadow; m.receiveShadow = recv; m.matrixAutoUpdate = false; return m; }
}

export function pip(poly, x, z) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > z) !== (b[1] > z) && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; }

