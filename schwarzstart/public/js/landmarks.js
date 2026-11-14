// SCHWARZSTART · procedural landmark models (massing and silhouette, built into the city chunks)
import { C, F_COVER, F_WALL, F_LOW } from './geom.js';
import { hyp } from './util.js';

const SAND = [1.0, 0.95, 0.84], SOOT = [0.62, 0.6, 0.56], PALE = [1.12, 1.1, 1.04], ROSE = [1.05, 0.8, 0.76], BRICK = [0.78, 0.42, 0.33], OCHRE = [1.12, 1.0, 0.72], GOLD = C(0xd9b24a), PAT = [1, 1, 1];
const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

function frame(L) {                       // local frame: u along width, v along depth, front at v = -d/2
  const ax = L.ax, f = L.f; let ux = ax[0], uz = ax[1], vx = ax[1], vz = -ax[0];
  const dotFU = f[0] * ux + f[1] * uz;
  if (Math.abs(dotFU) > 0.7) { const t = [ux, uz]; ux = vx; uz = vz; vx = t[0]; vz = t[1]; }     // front is along the width axis: swap
  if (f[0] * vx + f[1] * vz > 0) { vx = -vx; vz = -vz; }                                      // v points to the back
  const sw = Math.abs(dotFU) > 0.7; const w = sw ? L.d : L.w, d = sw ? L.w : L.d;
  const P = (u, v) => [L.c[0] + u * ux + v * vx, L.c[1] + u * uz + v * vz];
  return { P, ux, uz, vx, vz, w, d, rot: Math.atan2(-uz, ux), rotV: Math.atan2(-vz, vx) };
}
// wall between two ground points with the given outward normal: returns [left, right]
function lr(a, b, nx, nz) { const ex = nz, ez = -nx; return (b[0] - a[0]) * ex + (b[1] - a[1]) * ez >= 0 ? [a, b] : [b, a]; }

function styled(W, F, u0, u1, v0, v1, floors, style, col, did, seed = 1, roofMat = 'roof') {
  const q = [F.P(u0, v0), F.P(u1, v0), F.P(u1, v1), F.P(u0, v1)], cx = (q[0][0] + q[2][0]) / 2, cz = (q[0][1] + q[2][1]) / 2, c = W.ch(cx, cz); let top = 0;
  for (let i = 0; i < 4; i++) { const a = q[i], b = q[(i + 1) % 4], mx = (a[0] + b[0]) / 2 - cx, mz = (a[1] + b[1]) / 2 - cz, l = hyp(mx, mz) || 1, [le, ri] = lr(a, b, mx / l, mz / l); top = W.facadeWall(c.fac[style], le[0], le[1], ri[0], ri[1], floors, style, col, did, seed + i * 3); }
  W.mb(cx, cz, roofMat).quad([q[0][0], top, q[0][1]], [q[1][0], top, q[1][1]], [q[2][0], top, q[2][1]], [q[3][0], top, q[3][1]], [0, 0], [(u1 - u0) / 6, 0], [(u1 - u0) / 6, (v1 - v0) / 6], [0, (v1 - v0) / 6], null, null, [0, 1, 0]);
  const m = W.mb(cx, cz, 'trim'), p = F.P((u0 + u1) / 2, (v0 + v1) / 2);
  m.box(p[0], top - 0.1, p[1], u1 - u0 + 1.0, 1.0, v1 - v0 + 1.0, F.rot, mul(col, 0.95), { uv: 4 });
  return top;
}
function sbox(W, F, u, v, l, w, y0, h, col, mat = 'trim', o = {}) { const p = F.P(u, v); W.mb(p[0], p[1], mat).box(p[0], y0, p[1], l, h, w, F.rot, col, { uv: 4, ...o }); }
function scyl(W, F, u, v, r0, r1, y0, h, col, mat = 'trim', seg = 14, o = {}) { const p = F.P(u, v); W.mb(p[0], p[1], mat).cyl(p[0], y0, p[1], r0, r1, h, seg, col, { smooth: true, uv: 4, ...o }); }
function dome(W, F, u, v, r, y0, h, col, mat = 'copper', seg = 20, pow = 1) {
  const p = F.P(u, v), prof = []; for (let i = 0; i <= 8; i++) { const t = (i / 8) * Math.PI / 2; prof.push([Math.cos(t) ** pow * r + (i === 8 ? 0.02 : 0), y0 + Math.sin(t) * h]); }
  W.mb(p[0], p[1], mat).lathe(p[0], p[1], prof, seg, col, { ur: 6, vs: 4 });
}
function columns(W, F, u0, u1, v, n, y0, h, r, col, collide = true) {
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? u0 : u0 + ((u1 - u0) * i) / (n - 1), p = F.P(u, v), m = W.mb(p[0], p[1], 'trim');
    m.cyl(p[0], y0 + 0.5, p[1], r, r * 0.84, h - 1.1, 12, col, { smooth: true, uv: 3 });
    m.box(p[0], y0, p[1], r * 2.5, 0.5, r * 2.5, F.rot, col, { uv: 3 }); m.box(p[0], y0 + h - 0.6, p[1], r * 2.6, 0.6, r * 2.6, F.rot, col, { uv: 3 });
    if (collide) W.addCircle(p[0], p[1], r * 1.15, y0 + h, F_COVER);
  }
}
function pediment(W, F, u0, u1, v0, v1, y, h, col) {            // gable roof block, ridge along v
  const a = F.P(u0, v0), b = F.P(u1, v0), c = F.P(u1, v1), d = F.P(u0, v1), r0 = F.P((u0 + u1) / 2, v0), r1 = F.P((u0 + u1) / 2, v1), m = W.mb(r0[0], r0[1], 'trim');
  const A = [a[0], y, a[1]], B = [b[0], y, b[1]], Cc = [c[0], y, c[1]], Dd = [d[0], y, d[1]], R0 = [r0[0], y + h, r0[1]], R1 = [r1[0], y + h, r1[1]], w = (u1 - u0) / 4;
  m.tri(A, B, R0, [0, 0], [w, 0], [w / 2, h / 4], col, null, null, [-F.vx, 0, -F.vz]); m.tri(Cc, Dd, R1, [0, 0], [w, 0], [w / 2, h / 4], col, null, null, [F.vx, 0, F.vz]);
  m.quad(A, Dd, R1, R0, [0, 0], [2, 0], [2, 1], [0, 1], mul(col, 0.8), null, [-F.ux, 0.6, -F.uz]); m.quad(B, Cc, R1, R0, [0, 0], [2, 0], [2, 1], [0, 1], mul(col, 0.8), null, [F.ux, 0.6, F.uz]);
}
function portico(W, F, uc, wd, n, h, r, col, depth = 5, ped = 0.26, y0 = 0) {       // columns in front of the facade with an entablature and gable
  const v = -F.d / 2 - depth; columns(W, F, uc - wd / 2 + r, uc + wd / 2 - r, v + r * 1.2, n, y0, h, r, col);
  sbox(W, F, uc, v + depth / 2 + 0.2, wd + 0.8, depth + 0.6, y0 + h, 2.0, col);
  pediment(W, F, uc - wd / 2 - 0.6, uc + wd / 2 + 0.6, v - 0.2, -F.d / 2 + 0.6, y0 + h + 2.0, wd * ped, col);
}
function solid(W, F, L, h = 60, shrinkFront = 0) { const p = F.P(0, shrinkFront / 2); W.addBox(p[0], p[1], F.ux, F.uz, F.w, F.d - shrinkFront, h, F_WALL | F_COVER); }
function fl(h, fh = 4.2) { return Math.max(1, Math.round((h - 4.4) / fh)); }

const B = {
  tor(W, L, F, did) {
    const col = mul(SAND, 0.92), wid = [2.6, 3.8, 2.6, 3.8, 2.6, 5.65, 2.6, 3.8, 2.6, 3.8, 2.6]; let u = -wid.reduce((a, b) => a + b, 0) / 2;
    for (let i = 0; i < wid.length; i++) {
      if (i % 2 === 0) { const uc = u + wid[i] / 2; sbox(W, F, uc, 0, wid[i] - 0.9, 7.2, 0, 15, col); columns(W, F, uc, uc, -4.6, 1, 0, 15, 0.9, col, false); columns(W, F, uc, uc, 4.6, 1, 0, 15, 0.9, col, false); const p = F.P(uc, 0); W.addBox(p[0], p[1], F.ux, F.uz, wid[i], 11, 15, F_WALL | F_COVER); }
      u += wid[i];
    }
    sbox(W, F, 0, 0, 37.5, 11.6, 15, 3.0, col); sbox(W, F, 0, 0, 38.3, 12.2, 18, 0.5, mul(col, 0.9)); sbox(W, F, 0, 0, 34, 10.5, 18.5, 2.2, col); sbox(W, F, 0, 0, 13, 8.5, 20.7, 1.1, col);
    for (const s of [-1, 1]) { const uc = s * 27.5; sbox(W, F, uc, 0, 13, 8.5, 0, 9.5, col); columns(W, F, uc - 5.4, uc + 5.4, -5.4, 4, 0, 8.4, 0.5, col, false); sbox(W, F, uc, -4.4, 13.6, 3.4, 8.4, 1.4, col); pediment(W, F, uc - 6.9, uc + 6.9, -6.2, 4.4, 9.8, 2.0, col); const p = F.P(uc, 0); W.addBox(p[0], p[1], F.ux, F.uz, 13, 9, 10, F_WALL | F_COVER); sbox(W, F, s * 20, 0, 3, 7.6, 0, 7.5, col); const q = F.P(s * 20, 0); W.addBox(q[0], q[1], F.ux, F.uz, 3, 7.6, 8, F_WALL); }
    // quadriga (1793): chariot, four horses, figure with standard
    const cu = C(0x5f8f7c), y = 21.8;
    sbox(W, F, 0, 1.6, 2.4, 2.6, y, 1.5, cu, 'copper'); sbox(W, F, 0, 1.9, 0.9, 0.8, y + 1.5, 2.6, cu, 'copper'); sbox(W, F, 0, 1.9, 0.22, 0.22, y + 2.5, 4.6, cu, 'copper'); sbox(W, F, 0, 1.9, 1.3, 0.2, y + 6.4, 1.1, cu, 'copper');
    for (const hu of [-3.3, -1.1, 1.1, 3.3]) { sbox(W, F, hu, -2.0, 0.8, 2.5, y + 1.3, 1.0, cu, 'copper'); sbox(W, F, hu, -3.4, 0.55, 0.9, y + 2.0, 1.5, cu, 'copper', { xo: 0 }); sbox(W, F, hu, -4.0, 0.45, 1.0, y + 3.1, 0.55, cu, 'copper'); for (const lv of [-3.0, -1.0]) for (const lu of [-0.25, 0.25]) sbox(W, F, hu + lu, lv, 0.2, 0.25, y, 1.35, cu, 'copper'); }
  },
  fernsehturm(W, L, F, did) {
    const p = L.c, conc = mul(PAT, 0.92), m = W.mb(p[0], p[1], 'concrete');
    m.lathe(p[0], p[1], [[17, 0], [17, 5.5], [15.5, 6.2], [9, 6.2], [8.2, 9], [6.2, 30], [4.6, 90], [3.7, 150], [3.3, 198]], 24, conc, { ur: 8, vs: 5 });
    const sp = [], R = 16, cy = 212; for (let i = 0; i <= 14; i++) { const t = -Math.PI / 2 + (i / 14) * Math.PI; sp.push([Math.max(0.1, Math.cos(t) * R), cy + Math.sin(t) * R]); }
    W.mb(p[0], p[1], 'glass').lathe(p[0], p[1], sp, 28, C(0x9aa4aa), { ur: 14, vs: 2 });
    W.mb(p[0], p[1], 'dark').cyl(p[0], cy - 2.6, p[1], R + 0.12, R + 0.12, 5.2, 28, C(0x10161a), { smooth: true });
    m.lathe(p[0], p[1], [[3.0, 228], [2.6, 250], [2.2, 251]], 12, conc, {});
    const mm = W.mb(p[0], p[1], 'dark'); for (let k = 0; k < 10; k++) mm.cyl(p[0], 250 + k * 11.8, p[1], 1.5 - k * 0.11, 1.4 - k * 0.11, 11.8, 8, k % 2 ? C(0xe8e8e4) : C(0xb3231f), { smooth: true });
    const c = W.ch(p[0], p[1]); for (const [yy, s] of [[229, 5], [251, 4], [300, 4], [366, 5], [212, 4]]) for (let k = 0; k < (yy === 212 ? 4 : 1); k++) { const a = k * 1.571; c.gp.push(p[0] + (yy === 212 ? Math.cos(a) * 16.4 : 0), yy, p[1] + (yy === 212 ? Math.sin(a) * 16.4 : 0)); c.gg.push(did, 2, s); }
    W.addCircle(p[0], p[1], 17, 400, F_WALL | F_COVER);
  },
  reichstag(W, L, F, did) {
    const col = mul(SAND, 0.86), w = F.w, d = F.d, top = styled(W, F, -w / 2, w / 2, -d / 2, d / 2, 6, 6, col, did, 3);
    for (const su of [-1, 1]) for (const sv of [-1, 1]) { const t2 = styled(W, F, su * (w / 2 - 9) - 9, su * (w / 2 - 9) + 9, sv * (d / 2 - 9) - 9, sv * (d / 2 - 9) + 9, 8, 6, col, did, 7); sbox(W, F, su * (w / 2 - 9), sv * (d / 2 - 9), 12, 12, t2, 3, col); }
    sbox(W, F, 0, -d / 2 - 7, 38, 14, 0, 4.2, col); for (let k = 0; k < 4; k++) sbox(W, F, 0, -d / 2 - 15 - k * 1.2, 30, 1.2, 0, 4.2 - (k + 1) * 0.95, col);
    columns(W, F, -14, 14, -d / 2 - 12.2, 6, 4.2, 15, 1.0, col, false); sbox(W, F, 0, -d / 2 - 6.6, 33, 13.2, 19.2, 2.6, col); pediment(W, F, -17.2, 17.2, -d / 2 - 13.6, -d / 2 + 1, 21.8, 6.5, col);
    const pp = F.P(0, -d / 2 - 10.5); W.addBox(pp[0], pp[1], F.ux, F.uz, 38, 21, 20, F_WALL | F_COVER);
    scyl(W, F, 0, 0, 20.5, 20.5, top, 1.6, col, 'trim', 28); dome(W, F, 0, 0, 20, top + 1.6, 23, C(0x7f9aa8), 'glass', 28, 0.85); scyl(W, F, 0, 0, 2.2, 2.2, top + 24, 2.4, C(0xc9d2d8), 'glass', 12);
    solid(W, F, L);
  },
  dom(W, L, F, did) {
    // Berliner Dom: rusticated base, giant order of paired pilasters, tall arched windows, attic with statues,
    // drum ringed by columns under the great copper dome, four corner towers with lanterns, west portico with triple arch
    const col = mul(SOOT, 1.06), dk = C(0x15161a), w = F.w, d = F.d, cu = mul(PAT, 0.9), H = 31, base = 7;
    sbox(W, F, 0, 0, w, d, 0, base, mul(col, 0.88)); sbox(W, F, 0, 0, w - 1.2, d - 1.2, base, H - base, col);
    sbox(W, F, 0, 0, w + 0.6, d + 0.6, base - 0.5, 0.6, mul(col, 1.05)); sbox(W, F, 0, 0, w + 1.6, d + 1.6, H, 1.3, mul(col, 1.08)); sbox(W, F, 0, 0, w + 0.4, d + 0.4, H + 1.3, 2.6, mul(col, 0.97));
    const arch = (u, v, ax, wd, y0, hh) => {                     // dark arched opening on the face whose normal is ax ('u' or 'v')
      const L = ax === 'u' ? 0.16 : wd, D = ax === 'u' ? wd : 0.16;
      sbox(W, F, u, v, L, D, y0, hh, dk, 'dark');
      for (let k = 1; k <= 3; k++) { const f = Math.cos((k / 4) * Math.PI / 2); sbox(W, F, u, v, ax === 'u' ? 0.16 : wd * f, ax === 'u' ? wd * f : 0.16, y0 + hh + (k - 1) * wd * 0.14, wd * 0.14, dk, 'dark'); }
      sbox(W, F, u, v, ax === 'u' ? 0.3 : wd + 0.9, ax === 'u' ? wd + 0.9 : 0.3, y0 - 0.5, 0.5, mul(col, 1.1));
    };
    for (const sv of [-1, 1]) for (let i = -3; i <= 3; i++) { if (Math.abs(i) > 2 && sv < 0) continue; const u = i * (w / 8.2); arch(u, sv * (d / 2 - 0.55), 'v', 4.2, base + 4, 11); arch(u, sv * (d / 2 - 0.55), 'v', 2.6, 1.6, 3.2); }
    for (const su of [-1, 1]) for (let i = -2; i <= 2; i++) { const v = i * (d / 6.4); arch(su * (w / 2 - 0.55), v, 'u', 4.2, base + 4, 11); arch(su * (w / 2 - 0.55), v, 'u', 2.6, 1.6, 3.2); }
    // giant pilasters on the long faces
    for (const sv of [-1, 1]) for (let i = -4; i <= 3; i++) for (const o of [-0.9, 0.9]) sbox(W, F, i * (w / 8.2) + w / 16.4 + o, sv * (d / 2 - 0.2), 1.0, 0.9, base, H - base, mul(col, 1.08));
    for (const su of [-1, 1]) for (let i = -3; i <= 2; i++) for (const o of [-0.9, 0.9]) sbox(W, F, su * (w / 2 - 0.2), i * (d / 6.4) + d / 12.8 + o, 0.9, 1.0, base, H - base, mul(col, 1.08));
    // statues on the attic
    for (const sv of [-1, 1]) for (let i = -6; i <= 6; i += 2) sbox(W, F, i * (w / 13), sv * (d / 2 + 0.1), 0.9, 0.9, H + 3.9, 2.8, mul(col, 0.9));
    // west portico (towards the Lustgarten): projecting centre with a triple arch and paired columns
    const pv = -d / 2 - 3.2; sbox(W, F, 0, pv + 1.6, 34, 3.4, 0, H + 1.3, col);
    for (const u of [-8.5, 0, 8.5]) arch(u, pv - 0.05, 'v', u === 0 ? 7 : 5.4, 2.4, u === 0 ? 14 : 10);
    columns(W, F, -15.5, 15.5, pv - 1.6, 10, 0, H - 1, 0.95, mul(col, 1.1), true);
    sbox(W, F, 0, pv - 1.2, 35.5, 4.6, H, 1.6, mul(col, 1.1)); pediment(W, F, -17, 17, pv - 3.2, pv + 2, H + 1.6, 6.2, mul(col, 1.02));
    // drum, columns, great dome, lantern
    const dv = 3, dt = H + 3.9;
    scyl(W, F, 0, dv, 20.5, 20.5, dt, 3.5, mul(col, 0.95), 'trim', 24, { smooth: false });
    scyl(W, F, 0, dv, 18, 18, dt + 3.5, 15, col, 'trim', 24, { smooth: false });
    { const c0 = F.P(0, dv); for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2, x = c0[0] + Math.cos(a) * 19.6, z = c0[1] + Math.sin(a) * 19.6, m = W.mb(x, z, 'trim'); m.cyl(x, dt + 3.5, z, 0.75, 0.65, 14, 10, mul(col, 1.1), { smooth: true, uv: 3 }); }
      for (let k = 0; k < 12; k++) { const a = ((k + 0.5) / 12) * Math.PI * 2, x = c0[0] + Math.cos(a) * 18.05, z = c0[1] + Math.sin(a) * 18.05, m = W.mb(x, z, 'dark'); m.box(x, dt + 6, z, 0.3, 8, 3.0, -a, dk); } }
    scyl(W, F, 0, dv, 20.8, 20.8, dt + 18.5, 1.8, mul(col, 1.08), 'trim', 24, { smooth: false });
    dome(W, F, 0, dv, 19.4, dt + 20.3, 27, cu, 'copper', 28, 0.85);
    for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2, c0 = F.P(0, dv); const m = W.mb(c0[0], c0[1], 'gold'); m.box(c0[0] + Math.cos(a) * 12.8, dt + 39.5, c0[1] + Math.sin(a) * 12.8, 0.4, 1.4, 0.4, -a, GOLD); }
    scyl(W, F, 0, dv, 4.6, 4.2, dt + 46.5, 8, col, 'trim', 12); dome(W, F, 0, dv, 4.8, dt + 54.5, 5.5, cu, 'copper', 14);
    sbox(W, F, 0, dv, 0.6, 0.6, dt + 59.5, 6, GOLD, 'gold'); sbox(W, F, 0, dv, 3.0, 0.5, dt + 63.2, 0.5, GOLD, 'gold');
    // corner towers
    for (const su of [-1, 1]) for (const sv of [-1, 1]) {
      const u = su * (w / 2 - 7.5), v = sv * (d / 2 - 7.5);
      sbox(W, F, u, v, 13.5, 13.5, H, 13, col); sbox(W, F, u, v, 14.6, 14.6, H + 13, 1.0, mul(col, 1.08));
      for (const [du, dvv, ax] of [[0, -6.8, 'v'], [0, 6.8, 'v'], [-6.8, 0, 'u'], [6.8, 0, 'u']]) arch(u + du, v + dvv, ax, 3.2, H + 2.5, 7.5);
      scyl(W, F, u, v, 5.2, 5.2, H + 14, 6, col, 'trim', 12, { smooth: false }); dome(W, F, u, v, 5.8, H + 20, 8, cu, 'copper', 14, 0.9);
      scyl(W, F, u, v, 1.4, 1.2, H + 27.5, 3.5, col, 'trim', 8); dome(W, F, u, v, 1.6, H + 31, 2.2, cu, 'copper', 8); sbox(W, F, u, v, 0.3, 0.3, H + 33, 2.2, GOLD, 'gold');
    }
    solid(W, F, L);
  },
  altes(W, L, F, did) {
    const col = mul(SAND, 0.95), w = F.w, d = F.d, dc = 5.2;
    sbox(W, F, 0, dc / 2, w, d - dc, 0, 19, col); sbox(W, F, 0, 2, 26, 26, 19, 7.5, col); sbox(W, F, 0, 2, 27.4, 27.4, 26.5, 0.8, mul(col, 0.9));
    columns(W, F, -w / 2 + 2.3, w / 2 - 2.3, -d / 2 + 1.1, 18, 0, 12.6, 0.78, col); sbox(W, F, 0, -d / 2 + dc / 2, w, dc + 0.4, 12.6, 6.4, col); sbox(W, F, 0, -d / 2 + dc / 2 - 0.2, w + 1, dc + 1.2, 18.6, 0.7, mul(col, 0.9));
    for (const su of [-1, 1]) sbox(W, F, su * (w / 2 - 0.9), -d / 2 + dc / 2, 1.8, dc, 0, 12.6, col);
    solid(W, F, L, 60, dc + 0.6);
  },
  forum(W, L, F, did) {
    const col = OCHRE, w = F.w, d = F.d, top = styled(W, F, -w / 2, w / 2, -d / 2, d / 2, 6, 6, col, did, 9), cu = mul(PAT, 0.92);
    scyl(W, F, 0, -d / 2 + 22, 15, 15, top, 11, mul(SAND, 1.0), 'trim', 8, { smooth: false }); dome(W, F, 0, -d / 2 + 22, 15.4, top + 11, 19, cu, 'copper', 20, 0.9); scyl(W, F, 0, -d / 2 + 22, 3, 2.6, top + 29.5, 7, mul(SAND, 1), 'trim', 8); dome(W, F, 0, -d / 2 + 22, 3.2, top + 36.5, 4, GOLD, 'gold', 10);
    portico(W, F, 0, 28, 6, 20, 1.2, mul(SAND, 1.0), 4, 0.18); solid(W, F, L);
  },
  museum(W, L, F, did) { const col = mul(SAND, L.id === 'pergamon' ? 0.78 : 0.9); styled(W, F, -F.w / 2, F.w / 2, -F.d / 2, F.d / 2, fl(L.h), 6, col, did, 11); if (L.id === 'pergamon') portico(W, F, 0, 30, 8, 16, 1.0, col, 5, 0.16); solid(W, F, L); },
  bode(W, L, F, did) {
    const col = mul(SAND, 0.82), w = F.w, d = F.d, top = styled(W, F, -w / 2, w / 2, -d / 2 + 22, d / 2, 5, 6, col, did, 13), cu = mul(PAT, 0.9);
    scyl(W, F, 0, -d / 2 + 24, 23, 23, 0, top, col, 'trim', 20); scyl(W, F, 0, -d / 2 + 24, 13, 13, top, 9, col, 'trim', 16); dome(W, F, 0, -d / 2 + 24, 13.6, top + 9, 15, cu, 'copper', 20, 0.9); scyl(W, F, 0, -d / 2 + 24, 2, 1.7, top + 23.5, 5, col, 'trim', 8);
    const p = F.P(0, -d / 2 + 24); W.addCircle(p[0], p[1], 23.5, 60, F_WALL | F_COVER); solid(W, F, L, 60, 24);
  },
  temple(W, L, F, did) {
    const col = mul(SAND, 0.8), w = F.w, d = F.d;
    sbox(W, F, 0, 3, w, d - 6, 0, 11, mul(col, 0.9)); sbox(W, F, 0, 5, w - 9, d - 16, 11, 15, col); columns(W, F, -w / 2 + 6, w / 2 - 6, -d / 2 + 5.2, 8, 11, 13, 0.85, col, false);
    sbox(W, F, 0, 4, w - 6, d - 10, 24, 2.2, col); pediment(W, F, -w / 2 + 3, w / 2 - 3, -d / 2 + 4, d / 2 - 2, 26.2, 5.5, col);
    for (let k = 0; k < 5; k++) sbox(W, F, 0, -d / 2 + 2.4 - k * 1.3, 22, 1.3, 0, 11 - (k + 1) * 2.1, mul(col, 0.9));
    const pp = F.P(0, -d / 2 - 0.6); W.addBox(pp[0], pp[1], F.ux, F.uz, 22, 7, 9, F_WALL | F_COVER); solid(W, F, L, 60, 6);
  },
  church(W, L, F, did) {
    const col = BRICK, w = F.w, d = F.d, twin = L.twin, cu = mul(PAT, 0.9);            // long axis = depth (front at -d/2 is the west tower end)
    sbox(W, F, 0, 5, w, d - 10, 0, 17, col); pediment(W, F, -w / 2, w / 2, -d / 2 + 10, d / 2, 17, 9, mul(col, 0.9));
    if (twin) for (const s of [-1, 1]) { sbox(W, F, s * 5.2, -d / 2 + 5, 8, 9, 0, 38, mul(col, 1.05)); const p = F.P(s * 5.2, -d / 2 + 5); W.mb(p[0], p[1], 'copper').cyl(p[0], 38, p[1], 5.6, 0.05, 44, 6, cu, {}); }
    else { sbox(W, F, 0, -d / 2 + 7, 13, 14, 0, 46, mul(SOOT, 1.1)); sbox(W, F, 0, -d / 2 + 7, 10, 10, 46, 14, cu, 'copper'); const p = F.P(0, -d / 2 + 7); W.mb(p[0], p[1], 'copper').cyl(p[0], 60, p[1], 5.6, 0.05, 30, 8, cu, {}); }
    solid(W, F, L);
  },
  rathaus(W, L, F, did) {
    const w = F.w, d = F.d, col = [1.0, 0.86, 0.8], top = styled(W, F, -w / 2, w / 2, -d / 2, d / 2, 6, 2, col, did, 15), bc = [0.8, 0.36, 0.27];
    sbox(W, F, 0, -d / 2 + 6, 15, 15, 0, top + 24, bc); sbox(W, F, 0, -d / 2 + 6, 17, 17, top + 24, 1.6, mul(SAND, 0.8)); sbox(W, F, 0, -d / 2 + 6, 12, 12, top + 25.6, 18, bc); sbox(W, F, 0, -d / 2 + 6, 13.6, 13.6, top + 43.6, 1.2, mul(SAND, 0.8)); sbox(W, F, 0, -d / 2 + 6, 0.25, 0.25, top + 44.8, 9, C(0x555555), 'dark');
    for (const su of [-1, 1]) for (const sv of [-1, 1]) sbox(W, F, su * (w / 2 - 4), sv * (d / 2 - 4), 9, 9, top, 5, bc);
    solid(W, F, L);
  },
  fountain(W, L, F, did) {
    const p = L.c, r = L.w / 2, st = mul(SAND, 0.75), m = W.mb(p[0], p[1], 'trim');
    m.cyl(p[0], 0, p[1], r, r, 0.75, 20, st, { smooth: true }); m.cyl(p[0], 0, p[1], r - 0.5, r - 0.5, 0.75, 20, st, { smooth: true });
    W.mb(p[0], p[1], 'glass').cyl(p[0], 0.5, p[1], r - 0.5, 0.01, 0.05, 20, C(0xb8c6d0), {});
    m.cyl(p[0], 0, p[1], 1.6, 1.2, 1.7, 10, st, { smooth: true }); W.mb(p[0], p[1], 'copper').cyl(p[0], 1.7, p[1], 0.9, 0.3, 2.2, 8, mul(PAT, 0.8), { smooth: true });
    W.addCircle(p[0], p[1], r, 0.8, F_COVER | F_LOW);
  },
  domtower(W, L, F, did) {
    const col = mul(SAND, 0.98), w = F.w, d = F.d;
    sbox(W, F, 0, 0, w - 8, d - 8, 0, 23, col); portico(W, F, 0, 22, 6, 15, 0.95, col, 4.5, 0.2);
    for (const s of [-1, 1]) { const Fs = { ...F, P: (u, v) => F.P(s * v, u), d: F.w, ux: F.vx * s, uz: F.vz * s, rot: F.rotV }; void Fs; sbox(W, F, s * (w / 2 - 1.5), 0, 5, 20, 0, 17, col); }
    scyl(W, F, 0, 0, 10, 10, 23, 3, col, 'trim', 16); scyl(W, F, 0, 0, 7.6, 7.6, 26, 17, col, 'trim', 16);
    for (let k = 0; k < 12; k++) { const a = (k / 12) * 6.2832, p = F.P(Math.cos(a) * 9, Math.sin(a) * 9); W.mb(p[0], p[1], 'trim').cyl(p[0], 26, p[1], 0.55, 0.48, 13, 8, col, { smooth: true }); }
    scyl(W, F, 0, 0, 10.2, 10.2, 39, 2, col, 'trim', 16); scyl(W, F, 0, 0, 8.4, 8.4, 41, 4, col, 'trim', 16); dome(W, F, 0, 0, 8.6, 45, 13, mul(SOOT, 1.25), 'trim', 18, 0.85); scyl(W, F, 0, 0, 1.3, 1.0, 57.5, 5, col, 'trim', 8); sbox(W, F, 0, 0, 0.7, 0.7, 62.5, 5.5, GOLD, 'gold');
    const pp = F.P(0, 0); W.addBox(pp[0], pp[1], F.ux, F.uz, w - 8, d - 8, 60, F_WALL | F_COVER);
  },
  konzerthaus(W, L, F, did) {
    const col = mul(SAND, 1.0), w = F.w, d = F.d, top = styled(W, F, -w / 2, w / 2, -d / 2, d / 2, 5, 6, col, did, 17);
    sbox(W, F, 0, 2, 40, d - 6, top, 9, col); pediment(W, F, -20.5, 20.5, -d / 2 + 4, d / 2 - 4, top + 9, 6, col);
    for (let k = 0; k < 6; k++) sbox(W, F, 0, -d / 2 - 2 - k * 1.5, 30, 1.5, 0, 6.6 - (k + 1) * 1.0, col); sbox(W, F, 0, -d / 2 - 5.5, 30, 11, 0, 6.6 - 0.01, col, 'trim', { noTop: false });
    columns(W, F, -13, 13, -d / 2 - 8.8, 6, 6.6, 12.5, 0.95, col, false); sbox(W, F, 0, -d / 2 - 4.6, 29.5, 9.6, 19.1, 2.2, col); pediment(W, F, -15.4, 15.4, -d / 2 - 9.6, -d / 2 + 1, 21.3, 5.4, col);
    const pp = F.P(0, -d / 2 - 6); W.addBox(pp[0], pp[1], F.ux, F.uz, 30, 13, 20, F_WALL | F_COVER); solid(W, F, L);
  },
  classic(W, L, F, did) {
    const tint = L.tint === 'rose' ? ROSE : mul(SAND, 0.96), w = F.w, d = F.d;
    if (L.id === 'wache') { sbox(W, F, 0, 2.5, w, d - 5, 0, 12, mul(SAND, 0.8)); columns(W, F, -w / 2 + 1.6, w / 2 - 1.6, -d / 2 + 1.2, 6, 0, 8.6, 0.72, mul(SAND, 0.85)); sbox(W, F, 0, -d / 2 + 2.6, w, 5.6, 8.6, 1.8, mul(SAND, 0.85)); pediment(W, F, -w / 2 - 0.4, w / 2 + 0.4, -d / 2 - 0.4, -d / 2 + 6, 10.4, 3.2, mul(SAND, 0.85)); solid(W, F, L, 60, 5.4); return; }
    styled(W, F, -w / 2, w / 2, -d / 2, d / 2, fl(L.h), 6, tint, did, 19);
    if (w > 60) portico(W, F, 0, Math.min(34, w * 0.3), 6, 15, 1.0, mul(SAND, 1.0), 5, 0.2); solid(W, F, L);
  },
  rotunda(W, L, F, did) {
    const p = L.c, r = L.w / 2, col = mul(SAND, 0.92);
    W.mb(p[0], p[1], 'trim').cyl(p[0], 0, p[1], r, r, 17, 24, col, { smooth: true, uv: 4 }); dome(W, F, 0, 0, r + 0.4, 17, 13, mul(PAT, 0.92), 'copper', 24, 0.9); scyl(W, F, 0, 0, 2.4, 2, 29.5, 3, col, 'trim', 10);
    W.addCircle(p[0], p[1], r, 60, F_WALL | F_COVER);
  },
  tower(W, L, F, did) {
    const st = L.style, t = W.gfx.tex['f' + st], floors = Math.max(3, Math.round((L.h - 4.4) / t.fh)), k = 0.9, top = styled(W, F, -F.w / 2, F.w / 2, -F.d / 2, F.d / 2, floors, st, [k, k, k], did, 21);
    sbox(W, F, 0, 0, F.w * 0.4, F.d * 0.5, top, 3.5, C(0x4c4f52)); solid(W, F, L, 400);
  },
};

export function buildLandmark(L, W) {
  const fn = B[L.k]; if (!fn) return;
  const F = frame(L), did = W.district(L.c[0], L.c[1]);
  fn(W, L, F, did); W.lm[L.id] = { L, F };
}
