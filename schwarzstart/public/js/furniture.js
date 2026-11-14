// SCHWARZSTART · street furniture and set dressing: BSR bins, Litfaßsäulen, bus shelters, bollards, rubbish, scaffolding,
// traffic lights, barricades around hostile sites and the (dark) Christmas markets that light up with the district's power.
import { rng, hyp, imagePixels } from './util.js';
import { C, F_COVER, F_LOW } from './geom.js';

const POSTER = [0xd7cfb8, 0xb33a2c, 0x2b4a7a, 0xe0b23a, 0x262626, 0xe8e2d5, 0x6a8a5a, 0xc76a3a, 0x8a3060];

export function buildFurniture(W, im) {
  const map = W.map, b = map.bounds, R = rng(4242);
  const m1 = imagePixels(im.mask1), m2 = imagePixels(im.mask2);
  const sd = (P, ch, x, z) => { const u = Math.floor(((x - b[0]) / (b[2] - b[0])) * P.width), v = Math.floor(((z - b[1]) / (b[3] - b[1])) * P.height); if (u < 0 || v < 0 || u >= P.width || v >= P.height) return -9; return (P.data[(v * P.width + u) * 4 + ch] / 255 - 0.50196) * 31.875; };
  const road = (x, z) => sd(m1, 0, x, z), solid = (x, z) => sd(m2, 1, x, z);
  const occ = new Map(), key = (x, z) => Math.floor(x / 3) * 8192 + Math.floor(z / 3);
  const free = (x, z, r = 1.6) => { for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const a = occ.get(key(x + i * 3, z + j * 3)); if (a) for (const p of a) if (hyp(p[0] - x, p[1] - z) < r + p[2]) return false; } return true; };
  const take = (x, z, r = 1) => { const k = key(x, z); let a = occ.get(k); if (!a) occ.set(k, (a = [])); a.push([x, z, r]); };
  for (const l of map.lamps) take(l[0], l[1], 0.6);
  for (const t of map.trees) take(t[0], t[1], 0.9);
  for (const c of map.cars) take(c[0], c[1], 2.6);
  const ok = (x, z, r) => W.walkRaw(x, z) && road(x, z) < -0.35 && solid(x, z) < -1.1 && free(x, z, r);
  const P = (x, z) => W.ch(x, z).prop;
  const dk = C(0x2a2d30), green = C(0x2e3d33), conc = C(0x9a968e, 0.95), steel = C(0x5a6066);

  const bin = (x, z, a) => { const mb = P(x, z); mb.cyl(x, 0, z, 0.035, 0.035, 1.02, 5, dk); const ox = x + Math.cos(a) * 0.2, oz = z - Math.sin(a) * 0.2; mb.cyl(ox, 0.5, oz, 0.2, 0.235, 0.52, 9, C(0xe0601c), { smooth: true }); mb.cyl(ox, 1.02, oz, 0.24, 0.2, 0.05, 9, C(0x3a3c3e)); };
  const column = (x, z) => {
    const mb = P(x, z), r = rng((x * 7 + z * 13) | 0);
    mb.cyl(x, 0, z, 0.7, 0.68, 0.28, 14, green, { smooth: true });
    for (let k = 0; k < 3; k++) mb.cyl(x, 0.28 + k * 0.82, z, 0.62, 0.62, 0.82, 14, C(POSTER[(r() * POSTER.length) | 0], 0.75 + r() * 0.3), { smooth: true });
    mb.cyl(x, 2.74, z, 0.72, 0.7, 0.16, 14, green, { smooth: true });
    mb.lathe(x, z, [[0.66, 2.9], [0.6, 3.08], [0.42, 3.24], [0.14, 3.33], [0.02, 3.36]], 14, green);
    mb.cyl(x, 3.34, z, 0.05, 0.02, 0.32, 6, green);
    W.addCircle(x, z, 0.68, 3.2, F_COVER); take(x, z, 1.4);
  };
  const shelter = (x, z, dx, dz, s) => {
    const mb = P(x, z), rot = Math.atan2(-dz, dx), nx = -dz * s, nz = dx * s, bx = x + nx * 0.9, bz = z + nz * 0.9, gl = C(0x23353c, 0.9);
    mb.box(bx, 0, bz, 3.8, 0.05, 1.6, rot, C(0x55585a));
    mb.box(bx + nx * 0.68, 0.1, bz + nz * 0.68, 3.6, 2.05, 0.05, rot, gl);
    for (const e of [-1, 1]) { mb.box(bx + dx * e * 1.85, 0.1, bz + dz * e * 1.85, 0.05, 2.05, 1.3, rot, gl); mb.box(bx + dx * e * 1.88 + nx * 0.7, 0, bz + dz * e * 1.88 + nz * 0.7, 0.07, 2.25, 0.07, rot, dk); }
    mb.box(bx, 2.22, bz, 4.0, 0.1, 1.7, rot, C(0x3d4246));
    mb.box(bx + nx * 0.45, 0.42, bz + nz * 0.45, 2.2, 0.06, 0.38, rot, C(0x6a5a48));
    mb.box(bx - dx * 1.6 + nx * 0.62, 0.3, bz - dz * 1.6 + nz * 0.62, 1.2, 1.75, 0.18, rot, C(0xdfe6ea, 1.1));
    const px = x - dx * 2.6, pz = z - dz * 2.6; mb.cyl(px, 0, pz, 0.04, 0.04, 2.7, 5, dk); mb.cyl(px, 2.45, pz, 0.24, 0.24, 0.06, 10, C(0xe8c21c)); mb.cyl(px, 2.47, pz, 0.17, 0.17, 0.065, 10, C(0x1c6a3a));
    W.addSeg(bx + nx * 0.68 - dx * 1.8, bz + nz * 0.68 - dz * 1.8, bx + nx * 0.68 + dx * 1.8, bz + nz * 0.68 + dz * 1.8, 2.1, F_COVER);
    take(x, z, 2.5); take(x + dx * 2, z + dz * 2, 1.5); take(x - dx * 2, z - dz * 2, 1.5);
  };
  const bollards = (x, z, dx, dz) => { const mb = P(x, z); for (let k = -1; k <= 1; k++) mb.cyl(x + dx * k * 1.3, 0, z + dz * k * 1.3, 0.075, 0.065, 0.9, 7, C(0x3a3d40), { smooth: true }); take(x, z, 2); };
  const bags = (x, z, n, r) => {
    const mb = P(x, z);
    for (let k = 0; k < n; k++) {
      const a = r() * 6.28, d = r() * 0.8, s = 0.75 + r() * 0.5, cx = x + Math.cos(a) * d, cz = z + Math.sin(a) * d, col = [0x141618, 0x1c2a3a, 0x3a3c3e, 0x5a4a32][(r() * 4) | 0];
      if (r() < 0.25) mb.box(cx, 0, cz, 0.5 * s, 0.4 * s, 0.4 * s, r() * 3, C(0x7a6040, 0.8 + r() * 0.3));
      else mb.lathe(cx, cz, [[0.0, 0], [0.26 * s, 0.03], [0.3 * s, 0.18 * s], [0.2 * s, 0.38 * s], [0.06 * s, 0.48 * s], [0, 0.5 * s]], 7, C(col, 0.85 + r() * 0.3));
    }
    take(x, z, 1.2);
  };
  const lights = (x, z, dx, dz, s, did) => {
    const mb = P(x, z), px = x, pz = z, nx = -dz * s, nz = dx * s;
    mb.cyl(px, 0, pz, 0.075, 0.065, 4.2, 7, dk, { smooth: true });
    const hx = px - nx * 1.2, hz = pz - nz * 1.2; mb.box((px + hx) / 2, 4.05, (pz + hz) / 2, 1.2, 0.08, 0.08, Math.atan2(-nz, nx), dk);
    mb.box(hx, 3.1, hz, 0.32, 0.95, 0.28, Math.atan2(-dz, dx), C(0x18191b));
    mb.box(px - nx * 0.15, 2.0, pz - nz * 0.15, 0.24, 0.7, 0.2, Math.atan2(-dz, dx), C(0x18191b));
    const c = W.ch(px, pz); for (const [y, t] of [[3.85, 2], [3.55, 0.0], [3.25, 0.55]]) { c.gp.push(hx + dx * 0.15 * s, y - 0.25, hz + dz * 0.15 * s); c.gg.push(did, t === 2 ? 2 : t, 0.5); }
    W.addCircle(px, pz, 0.1, 4); take(px, pz, 1);
  };
  // ---------- kerbside, street by street ----------
  for (const st of map.streets) {
    if (!(st.cw > 0) || st.k === 'path') continue;
    const major = st.k === 'main' || st.k === 'boulevard' || st.w >= 26;
    for (let i = 0; i < st.p.length - 1; i++) {
      const a = st.p[i], c = st.p[i + 1], L = hyp(c[0] - a[0], c[1] - a[1]); if (L < 8) continue;
      const dx = (c[0] - a[0]) / L, dz = (c[1] - a[1]) / L;
      for (const s of [-1, 1]) {
        const off = st.cw / 2 + 0.8, nx = -dz * s, nz = dx * s;
        if (major && (i === 0 || i === st.p.length - 2) && R() < 0.7) { const e = i === 0 ? a : c, t = i === 0 ? 6 : -6, x = e[0] + dx * t + nx * off, z = e[1] + dz * t + nz * off; if (ok(x, z, 1)) lights(x, z, dx, dz, s, W.district(x, z)); }
        for (let t = 5 + R() * 18; t < L - 5; t += 15 + R() * 22) {
          const x = a[0] + dx * t + nx * off, z = a[1] + dz * t + nz * off, q = R();
          if (q < 0.4) { if (ok(x, z, 0.8)) { bin(x, z, Math.atan2(-nz, nx)); take(x, z, 0.8); } }
          else if (q < 0.5) { const x2 = x + nx * 1.4, z2 = z + nz * 1.4; if (st.w - st.cw > 9 && ok(x2, z2, 1.6)) column(x2, z2); }
          else if (q < 0.58) { if (major && ok(x, z, 2.6) && ok(x + dx * 2, z + dz * 2, 1.4) && ok(x - dx * 2, z - dz * 2, 1.4) && ok(x + nx * 1.6, z + nz * 1.6, 1)) shelter(x, z, dx, dz, s); }
          else if (q < 0.7) { if (ok(x, z, 2)) bollards(x, z, dx, dz); }
          else if (q < 0.86) { const x2 = x + nx * (st.w / 2 - st.cw / 2 - 2.4), z2 = z + nz * (st.w / 2 - st.cw / 2 - 2.4); if (ok(x2, z2, 1.2)) bags(x2, z2, 2 + ((R() * 5) | 0), R); }
        }
      }
    }
  }
  // ---------- scaffolding on a few facades ----------
  let nScaf = 0;
  for (const bd of map.builds) {
    const [x1, z1, x2, z2, , h, , , did, seed] = bd, L = hyp(x2 - x1, z2 - z1);
    if (L < 12 || h < 14 || (seed * 7919) % 100 > 3) continue;
    const ox = (z2 - z1) / L, oz = -(x2 - x1) / L, ex = (x2 - x1) / L, ez = (z2 - z1) / L, mx = (x1 + x2) / 2 + ox * 2.2, mz = (z1 + z2) / 2 + oz * 2.2;
    if (!W.walkRaw(mx, mz)) continue;
    const mb = P(mx, mz), top = Math.min(h - 1.5, 22), rot = Math.atan2(-ez, ex), r = rng(seed), net = r() < 0.6, netCol = C([0x2f4a3a, 0x3a4250, 0xd0d4d6][(r() * 3) | 0], 0.9);
    for (let t = 0.6; t <= L - 0.6; t += 2.5) for (const o of [0.35, 1.25]) { const px = x1 + ex * t + ox * o, pz = z1 + ez * t + oz * o; mb.box(px, 0, pz, 0.05, top + 1, 0.05, rot, steel); }
    for (let y = 2; y <= top; y += 2) {
      mb.box(x1 + ex * L / 2 + ox * 0.8, y - 0.04, z1 + ez * L / 2 + oz * 0.8, L - 1, 0.04, 0.95, rot, C(0x8a7350, 0.9));
      mb.box(x1 + ex * L / 2 + ox * 1.25, y + 0.95, z1 + ez * L / 2 + oz * 1.25, L - 1, 0.05, 0.05, rot, C(0xd8c040));
      if (net && r() < 0.75) mb.box(x1 + ex * L / 2 + ox * 1.32, y - 0.04, z1 + ez * L / 2 + oz * 1.32, L - 1, 2.0, 0.02, rot, netCol);
    }
    W.addSeg(x1 + ox * 1.35, z1 + oz * 1.35, x2 + ox * 1.35, z2 + oz * 1.35, 1.2, 0); take(mx, mz, L / 2);
    if (++nScaf > 60) break;
  }
  // ---------- barricades at hostile sites ----------
  for (const s of map.sites) {
    if (!['cp', 'mission', 'power'].includes(s.k)) continue;
    const r = rng(((s.p[0] * 31 + s.p[1] * 17) | 0) ^ 0x5bd1), n = s.k === 'cp' ? 7 : 5;
    for (let i = 0, tries = 0; i < n && tries < 40; tries++) {
      const a = r() * 6.283, d = 7 + r() * 13, x = s.p[0] + Math.cos(a) * d, z = s.p[1] + Math.sin(a) * d;
      if (!W.walkRaw(x, z) || solid(x, z) > -2 || !free(x, z, 2.2)) continue;
      const rot = a + Math.PI / 2 + (r() - 0.5) * 0.6, cs = Math.cos(rot), sn = -Math.sin(rot), mb = P(x, z), q = r();
      if (q < 0.45) { mb.box(x, 0, z, 3.0, 0.88, 0.62, rot, C(0x9a968e, 0.8 + r() * 0.3), { w1: 0.24 }); W.addBox(x, z, cs, sn, 3.0, 0.62, 0.88, F_COVER | F_LOW); }
      else if (q < 0.8) {
        const sb = C(0x8a7a5a, 0.8 + r() * 0.2);
        for (let row = 0; row < 3; row++) for (let k = 0; k < 5 - row % 2; k++) { const u = (k - (4 - row % 2) / 2) * 0.62, px = x + cs * u, pz = z + sn * u; mb.box(px, row * 0.26, pz, 0.6, 0.27, 0.42, rot + (r() - 0.5) * 0.15, sb, { l1: 0.5, w1: 0.32 }); }
        W.addBox(x, z, cs, sn, 3.0, 0.45, 0.8, F_COVER | F_LOW);
      } else { W.car(mb, x, z, rot, 0, (r() * 1000) | 0, { burnt: true }); }
      take(x, z, 2.2); i++;
    }
  }
  // ---------- Christmas markets (dark until the district has power) ----------
  const huts = (cx, cz, rot, nx, nz) => {
    const cs = Math.cos(rot), sn = -Math.sin(rot), r = rng((cx * 3 + cz * 5) | 0);
    for (let i = -nx; i <= nx; i++) for (let j = -nz; j <= nz; j++) {
      if (i === 0 && j === 0) continue; if (Math.abs(j) % 2 === 0 && i === 0) continue;
      const u = i * 4.4, v = j * 5.2, x = cx + cs * u - sn * v, z = cz + sn * u + cs * v;
      if (!W.walkRaw(x, z) || solid(x, z) > -2.5 || road(x, z) > -1 || !free(x, z, 1.8) || combat.some((q) => hyp(q.p[0] - x, q.p[1] - z) < 28)) continue;
      const f = j > 0 ? 1 : -1, mb = P(x, z), wood = C(0x6a4a30, 0.75 + r() * 0.4), roofC = C(r() < 0.5 ? 0x5a1e18 : 0x24402c, 0.8 + r() * 0.3), hr = rot + (f < 0 ? Math.PI : 0);
      mb.box(x, 0, z, 2.8, 2.0, 2.1, hr, wood);
      mb.box(x, 2.0, z, 3.2, 0.8, 2.6, hr, roofC, { w1: 0.12 });
      const fx = x - sn * f * 1.08 * 0, fz = z;
      const ox = Math.sin(hr) * 1.12, oz = Math.cos(hr) * 1.12;
      mb.box(x + ox, 0.95, z + oz, 2.6, 0.1, 0.42, hr, C(0x8a6a48));
      mb.box(x + ox * 1.05, 1.06, z + oz * 1.05, 2.5, 0.8, 0.04, hr, C(0x3a2a20, 0.6));
      const c = W.ch(x, z), did = W.district(x, z);
      for (let k = 0; k < 7; k++) { const t = (k / 6 - 0.5) * 3.0; c.gp.push(x + Math.cos(hr) * t + ox * 1.25, 2.0 + Math.abs(k - 3) * 0.02, z - Math.sin(hr) * t + oz * 1.25); c.gg.push(did, k % 3 === 1 ? 0.55 : 0.0, 0.32); }
      W.addBox(x, z, Math.cos(hr), -Math.sin(hr), 2.8, 2.1, 2.4, F_COVER); take(x, z, 2.2); void fx; void fz;
    }
    // tree
    if (W.walkRaw(cx, cz) && free(cx, cz, 2)) {
      const mb = P(cx, cz), c = W.ch(cx, cz), did = W.district(cx, cz); mb.cyl(cx, 0, cz, 0.25, 0.2, 1.2, 7, C(0x3a2a20));
      for (let k = 0; k < 4; k++) mb.cyl(cx, 1.0 + k * 1.9, cz, 2.6 - k * 0.55, 0.3, 2.6, 11, C(0x183424, 0.8 + k * 0.08));
      mb.lathe(cx, cz, [[0.0, 9.6], [0.25, 9.8], [0.0, 10.1]], 5, C(0xe8c860, 1.2));
      for (let k = 0; k < 36; k++) { const t = k / 36, a = t * 6.283 * 4.2, rr = 2.4 * (1 - t) + 0.15, y = 1.3 + t * 8.0; c.gp.push(cx + Math.cos(a) * rr, y, cz + Math.sin(a) * rr); c.gg.push(did, k % 4 === 0 ? 0.55 : 0.0, 0.34); }
      W.addCircle(cx, cz, 2.2, 6, F_COVER); take(cx, cz, 3);
    }
  };
  const combat = map.sites.filter((q) => q.k === 'mission' || q.k === 'cp' || q.k === 'power');
  for (const [name, nx, nz] of [['Gendarmenmarkt', 3, 2], ['Alexanderplatz', 3, 3], ['Schloßplatz', 2, 2]]) {
    const p = (map.plazaNames || []).find((q) => q.n === name); if (!p) continue;
    let x = p.p[0], z = p.p[1];
    if (name === 'Gendarmenmarkt') { const f = W.fr('F', 270, 300); void f; }
    huts(x, z, name === 'Alexanderplatz' ? 0.5 : name === 'Gendarmenmarkt' ? -0.13 : 0.3, nx, nz);
  }
  // ---------- Sperrzone: the edge of the Phase 1 field of play ----------
  const core = W.core; let nb = 0;
  const edge = (x0, z0, x1, z1) => {
    const L = hyp(x1 - x0, z1 - z0), dx = (x1 - x0) / L, dz = (z1 - z0) / L, rot = Math.atan2(-dz, dx); let run = 0;
    for (let t = 0; t < L; t += 3.1) {
      const x = x0 + dx * t, z = z0 + dz * t; if (!W.walkRaw(x, z) || solid(x, z) > -0.5) { run = 0; continue; }
      const mb = P(x, z), q = (Math.sin(x * 12.9898 + z * 78.233) * 43758.5) % 1;
      mb.box(x, 0, z, 3.0, 1.0, 0.7, rot, C(0x9c988f, 0.75 + Math.abs(q) * 0.3), { w1: 0.26 });
      mb.box(x, 1.0, z, 3.0, 1.7, 0.05, rot, C(0x4a4f52)); for (const e of [-1.45, 1.45]) mb.box(x + dx * e, 0.9, z + dz * e, 0.06, 1.95, 0.06, rot, C(0x3a3d40));
      if (run % 4 === 0) { mb.box(x, 1.55, z, 1.2, 0.5, 0.08, rot, C(0xc8282a)); mb.box(x, 1.6, z, 1.0, 0.12, 0.09, rot, C(0xe8e8e8)); }
      W.addSeg(x - dx * 1.55, z - dz * 1.55, x + dx * 1.55, z + dz * 1.55, 2.7, F_COVER); run++; nb++;
    }
  };
  edge(core[0], core[1], core[0], core[3]); edge(core[0], core[3], core[2], core[3]);
  return { scaffolds: nScaf, barrier: nb };
}
