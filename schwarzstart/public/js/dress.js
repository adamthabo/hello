// SCHWARZSTART · set dressing for a city eleven days into a blackout: real-looking vehicles and the traffic that was abandoned
// where it stood, facades with depth (ledges, balconies, loggias, awnings, signs, shutter boxes, lamps, drainpipes), and the
// junk of a city where nobody collects anything: rubbish heaps, snow banks, roadblocks, building sites with Berlin's pipes, camps.
import { rng, hyp } from './util.js';
import { C, F_COVER, F_LOW } from './geom.js';

const PAINT = [0xd8dadc, 0xa9adb2, 0x1b1d21, 0x24304a, 0x7a1f20, 0x55585c, 0x2f4a3a, 0xe9e6dc, 0x8a6d3b, 0x101113, 0x3d4f6b, 0xb9b3a6, 0x6b7f8e, 0x4a2e2a, 0x9aa3a8, 0x2a3b55];
const TRABI = [0x8fb3a8, 0xd8c9a0, 0x6f8fb8, 0xb87a5a, 0xa9b48a, 0xc9c4b8];
const GLASS = C(0x161c22), SOOT = C(0x0b0b0c), TIRE = C(0x121314), HUB = C(0x8c9196), RUST = C(0x5a3826), CHAR = C(0x1d1a17), TRIM = C(0x1e2022);
const HEAD = C(0xd8d4c4), TAIL = C(0x7a1714), PLATE = C(0xe4e6e2), BLUE = C(0x1f3c88), BLUEL = C(0x3a6bff), RED = C(0xb3261e);

// a horizontal cylinder (wheels, pipes): axis (ax, az) unit, caps on the + side (ring of tyre + hub) and optionally the - side
export function hcyl(mb, cx, cy, cz, ax, az, r, hl, n, col, o = {}) {
  const ring = (a, s, rr = r) => [cx + -az * Math.cos(a) * rr + ax * hl * s, cy + Math.sin(a) * rr, cz + ax * Math.cos(a) * rr + az * hl * s];
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * 6.2832, a1 = ((i + 1) / n) * 6.2832, am = (a0 + a1) / 2;
    mb.quad(ring(a0, -1), ring(a1, -1), ring(a1, 1), ring(a0, 1), [0, 0], [1, 0], [1, 1], [0, 1], col, null, [-az * Math.cos(am), Math.sin(am), ax * Math.cos(am)]);
    if (o.hub) {                                   // tyre wall, then the hub disc
      const k = o.hubR ?? 0.62;
      mb.quad(ring(a0, 1), ring(a1, 1), ring(a1, 1, r * k), ring(a0, 1, r * k), [0, 0], [1, 0], [1, 1], [0, 1], col, null, [ax, 0, az]);
      mb.tri([cx + ax * hl, cy, cz + az * hl], ring(a0, 1, r * k), ring(a1, 1, r * k), [0, 0], [0, 0], [0, 0], o.hub, null, null, [ax, 0, az]);
    } else if (o.caps) mb.tri([cx + ax * hl, cy, cz + az * hl], ring(a0, 1), ring(a1, 1), [0, 0], [0, 0], [0, 0], col, null, null, [ax, 0, az]);
    if (o.caps === 2) mb.tri([cx - ax * hl, cy, cz - az * hl], ring(a1, -1), ring(a0, -1), [0, 0], [0, 0], [0, 0], col, null, null, [-ax, 0, -az]);
  }
}

// ---------------------------------------------------------------- vehicles
const CARS = {
  sedan: { L: 4.6, W: 1.8, y0: 0.3, bh: 0.58, cl0: 2.55, cl1: 1.7, ch: 0.5, cx: -0.15, xo: -0.05, wr: 0.32 },
  hatch: { L: 4.05, W: 1.76, y0: 0.3, bh: 0.6, cl0: 2.45, cl1: 1.85, ch: 0.52, cx: -0.35, xo: -0.22, wr: 0.31 },
  estate: { L: 4.75, W: 1.82, y0: 0.3, bh: 0.58, cl0: 3.0, cl1: 2.62, ch: 0.52, cx: -0.42, xo: -0.14, wr: 0.32 },
  suv: { L: 4.7, W: 1.9, y0: 0.4, bh: 0.72, cl0: 2.9, cl1: 2.42, ch: 0.6, cx: -0.3, xo: -0.1, wr: 0.38 },
  trabi: { L: 3.56, W: 1.5, y0: 0.27, bh: 0.55, cl0: 1.9, cl1: 1.42, ch: 0.47, cx: -0.12, xo: -0.04, wr: 0.27 },
};
export const VEH_DIM = { sedan: [4.6, 1.8, 1.4], hatch: [4.05, 1.76, 1.42], estate: [4.75, 1.82, 1.4], suv: [4.7, 1.9, 1.72], trabi: [3.56, 1.5, 1.3], taxi: [4.6, 1.8, 1.55], police: [5.2, 2.0, 2.15], van: [5.1, 1.96, 2.06], ambulance: [5.9, 2.05, 2.75], truck: [7.6, 2.45, 2.95], bus: [11.3, 2.55, 4.05] };

// builds a vehicle into mb; returns [length, width, height]
export function vehicle(mb, x, z, ang, kind, seed, o = {}) {
  const r = rng(seed * 7919 + 13), cs = Math.cos(ang), sn = Math.sin(ang), Q = (u, v) => [x + u * cs + v * sn, z - u * sn + v * cs];
  const burnt = !!o.burnt, sink = burnt ? 0.09 : 0, glass = burnt ? SOOT : GLASS;
  const dmb = o.det || mb, box = (u, v, y0, l, h, w, col, bo = {}, dr = 0, m = mb) => { const p = Q(u, v); m.box(p[0], y0 - sink, p[1], l, h, w, ang + dr, col, bo); }, sbox = (u, v, y0, l, h, w, col, bo = {}) => box(u, v, y0, l, h, w, col, bo, 0, dmb);
  const wheels = (us, Wd, wr, wd = 0.11) => { for (const u of us) for (const sd of [-1, 1]) { const p = Q(u, sd * (Wd / 2 - wd + 0.01)); if (burnt) hcyl(dmb, p[0], wr * 0.78 - sink, p[1], sn * sd, cs * sd, wr * 0.72, wd * 0.7, 6, RUST, { caps: 1 }); else hcyl(dmb, p[0], wr, p[1], sn * sd, cs * sd, wr, wd, 7, TIRE, { hub: HUB }); } };
  const tint = (hex, k = 1) => (burnt ? (r() < 0.3 ? C(0x3a2a20, 0.8 + r() * 0.3) : C(0x1d1a17, 0.8 + r() * 0.4)) : C(hex, k));
  const lights = (L, Wd, yh, yt) => { if (burnt) return; for (const sd of [-1, 1]) { sbox(L / 2 - 0.02, sd * (Wd / 2 - 0.3), yh, 0.08, 0.13, 0.38, HEAD, { noTop: true }); sbox(-L / 2 + 0.02, sd * (Wd / 2 - 0.25), yt, 0.08, 0.12, 0.32, TAIL, { noTop: true }); } sbox(L / 2 + 0.05, 0, yh - 0.25, 0.03, 0.12, 0.5, PLATE); sbox(-L / 2 - 0.05, 0, yt - 0.18, 0.03, 0.12, 0.5, PLATE); };
  const lightbar = (u, y, w) => { box(u, 0, y, 0.32, 0.12, w, burnt ? SOOT : BLUEL); };
  if (CARS[kind] || kind === 'taxi') {
    const S = CARS[kind] || CARS.sedan, L = S.L, Wd = S.W, top = S.y0 + S.bh;
    const paint = kind === 'taxi' ? 0xe6dfc6 : kind === 'trabi' ? TRABI[seed % TRABI.length] : o.paint ?? PAINT[seed % PAINT.length], body = tint(paint, 0.88 + r() * 0.2);
    box(0, 0, S.y0, L, S.bh, Wd, body, { l1: L - 0.32, w1: Wd - 0.08 });
    box(0, 0, S.y0 - 0.12, L - 0.7, 0.14, Wd - 0.14, TRIM, { noTop: true });
    box(L / 2 - 0.06, 0, S.y0 - 0.06, 0.24, 0.34, Wd - 0.02, burnt ? CHAR : TRIM);
    box(-L / 2 + 0.06, 0, S.y0 - 0.06, 0.24, 0.34, Wd - 0.02, burnt ? CHAR : TRIM);
    box(S.cx, 0, top, S.cl0, S.ch, Wd - 0.12, glass, { l1: S.cl1, w1: Wd - 0.44, xo: S.xo, topCol: body });
    for (const sd of [-1, 1]) sbox(S.cx + S.cl0 / 2 - 0.22, sd * (Wd / 2 + 0.06), top + 0.06, 0.1, 0.1, 0.13, body);
    lights(L, Wd, top - 0.2, top - 0.18);
    wheels([L * 0.31, -L * 0.31], Wd, S.wr);
    if (kind === 'taxi') box(S.cx, 0, top + S.ch, 0.5, 0.14, 0.16, C(0xf2c230));
    if (o.door && !burnt) {                       // a front door left open, the dark cabin behind it
      const hu = S.cx + S.cl0 / 2 - 0.1, th = 0.8 + r() * 0.4, sd = r() < 0.5 ? 1 : -1, dl = 1.0, cu = hu - (dl / 2) * Math.cos(th), cv = sd * (Wd / 2 + (dl / 2) * Math.sin(th));
      box(hu - 0.5, sd * (Wd / 2 + 0.005), S.y0 + 0.05, 1.0, S.bh + S.ch * 0.8 - 0.1, 0.02, C(0x0e0f10), { noTop: true });
      box(cu, cv, S.y0 + 0.05, dl, S.bh - 0.05, 0.06, body, {}, sd * th);
      box(cu, cv, top, dl * 0.8, S.ch * 0.75, 0.04, glass, { noTop: true }, sd * th);
    }
    return [L, Wd, top + S.ch];
  }
  if (kind === 'van' || kind === 'police' || kind === 'ambulance') {
    const L = kind === 'ambulance' ? 5.9 : kind === 'police' ? 5.2 : 5.1, Wd = kind === 'van' ? 1.96 : 2.02, y0 = 0.36, bh = 0.78, H = kind === 'ambulance' ? 2.7 : kind === 'police' ? 2.1 : 2.04, cab = 1.08;
    const paint = kind === 'ambulance' ? 0xeceeed : kind === 'police' ? 0xdfe3e6 : o.paint ?? [0xe9e6dc, 0xd8dadc, 0x55585c, 0x24304a, 0xb9b3a6, 0x7a1f20][seed % 6], body = tint(paint, 0.9 + r() * 0.15);
    box(0, 0, y0, L, bh, Wd, body);
    box(-cab / 2, 0, y0 + bh, L - cab, H - y0 - bh, Wd, body, { l1: L - cab - 0.06, w1: Wd - 0.06 });
    box(L / 2 - cab / 2 - 0.03, 0, y0 + bh, cab, (kind === 'ambulance' ? 2.12 : H) - y0 - bh - 0.06, Wd - 0.08, glass, { l1: cab * 0.46, xo: -cab * 0.26, topCol: body });
    box(0, 0, y0 - 0.12, L - 0.9, 0.14, Wd - 0.14, TRIM, { noTop: true });
    box(L / 2 - 0.05, 0, y0 - 0.06, 0.22, 0.36, Wd - 0.02, burnt ? CHAR : TRIM); box(-L / 2 + 0.05, 0, y0 - 0.06, 0.22, 0.36, Wd - 0.02, burnt ? CHAR : TRIM);
    if (kind === 'van' && seed % 3 === 0) box(-cab / 2, 0, y0 + bh + 0.14, L - cab - 0.5, 0.5, Wd + 0.02, glass, { noTop: true });     // windows down the side
    if (kind === 'police' && !burnt) { box(0, 0, y0 + 0.16, L - 0.5, 0.4, Wd + 0.02, BLUE, { noTop: true }); lightbar(L / 2 - cab - 0.1, H, Wd * 0.62); }
    if (kind === 'ambulance' && !burnt) { box(-0.2, 0, 1.3, L - 0.6, 0.26, Wd + 0.02, RED, { noTop: true }); box(-0.2, 0, 1.62, L - 0.6, 0.12, Wd + 0.02, C(0xd8e030), { noTop: true }); lightbar(L / 2 - cab - 0.1, H, Wd * 0.7); }
    for (const sd of [-1, 1]) sbox(L / 2 - cab + 0.12, sd * (Wd / 2 + 0.07), y0 + bh + 0.2, 0.1, 0.16, 0.12, TRIM);
    lights(L, Wd, y0 + bh - 0.22, y0 + bh - 0.1);
    wheels([L / 2 - 1.0, -L / 2 + 1.05], Wd, 0.35, 0.12);
    return [L, Wd, H];
  }
  if (kind === 'truck') {                          // a Bundeswehr lorry with a canvas back
    const L = 7.6, Wd = 2.45, ol = tint(0x4a5238, 0.85 + r() * 0.2), canvas = tint(0x5f5b3f, 0.85 + r() * 0.2);
    box(0, 0, 0.72, L - 0.3, 0.28, Wd - 0.6, TRIM, { noTop: true });
    box(L / 2 - 1.05, 0, 0.98, 2.0, 1.35, Wd, ol, { l1: 1.86 });
    box(L / 2 - 0.05, 0, 1.6, 0.08, 0.6, Wd - 0.36, glass, { noTop: true });
    box(L / 2 - 0.85, 0, 1.62, 0.9, 0.5, Wd + 0.02, glass, { noTop: true });
    box(L / 2 + 0.05, 0, 0.62, 0.22, 0.38, Wd - 0.1, TRIM);
    box(-1.05, 0, 1.0, L - 2.4, 0.48, Wd, ol);
    box(-1.05, 0, 1.48, L - 2.5, 1.42, Wd - 0.06, canvas, { w1: Wd - 0.56, l1: L - 2.56 });
    for (let i = 0; i <= 4; i++) box(-1.05 - (L - 2.62) / 2 + (i / 4) * (L - 2.62), 0, 1.47, 0.09, 1.44, Wd - 0.03, burnt ? CHAR : C(0x3e3b2a, 0.9), { w1: Wd - 0.52 });   // the hoops under the canvas
    if (!burnt) for (const sd of [-1, 1]) box(L / 2 - 0.02, sd * (Wd / 2 - 0.3), 0.85, 0.06, 0.14, 0.26, HEAD, { noTop: true });
    wheels([L / 2 - 1.2, -L / 2 + 1.7, -L / 2 + 2.95], Wd, 0.56, 0.16);
    return [L, Wd, 2.95];
  }
  if (kind === 'bus') {                            // the yellow double-decker
    const L = 11.3, Wd = 2.55, H = 4.05, body = tint(0xe8b80c, 0.9 + r() * 0.12);
    box(0, 0, 0.28, L - 0.1, 0.44, Wd - 0.04, burnt ? CHAR : C(0x1f2124), { noTop: true });
    box(0, 0, 0.7, L, H - 0.7, Wd, body, { l1: L - 0.14, w1: Wd - 0.08, topCol: burnt ? CHAR : C(0xbfc2c4) });
    box(-0.25, 0, 1.28, L - 1.7, 0.92, Wd + 0.02, glass, { noTop: true });
    box(-0.1, 0, 2.56, L - 0.9, 0.98, Wd + 0.02, glass, { noTop: true });
    box(L / 2 + 0.0, 0, 0.98, 0.06, 1.24, Wd - 0.34, glass, { noTop: true });
    box(L / 2 + 0.0, 0, 2.56, 0.06, 0.98, Wd - 0.22, glass, { noTop: true });
    if (!burnt) box(L / 2 + 0.03, 0, 2.27, 0.04, 0.22, Wd - 0.7, C(0xff9a20, 0.9));
    box(-L / 2, 0, 2.56, 0.06, 0.9, Wd - 0.5, glass, { noTop: true });
    for (const [c0, len, y, hh] of [[-0.25, L - 1.7, 1.28, 0.92], [-0.1, L - 0.9, 2.56, 0.98]]) { const n = Math.round(len / 1.5); for (let i = 0; i <= n; i++) box(c0 - len / 2 + (i / n) * len, 0, y - 0.02, 0.13, hh + 0.04, Wd + 0.05, body, { noTop: true }); }   // window posts
    for (const u of [L / 2 - 1.05, 0.55]) box(u, -Wd / 2, 0.45, 1.15, 1.95, 0.05, glass, { noTop: true });     // the doors
    box(0, 0, 2.22, L + 0.01, 0.12, Wd + 0.03, burnt ? CHAR : C(0x2a2b2d), { noTop: true });                     // rubbing strip between the decks
    if (!burnt) for (const sd of [-1, 1]) { box(L / 2 + 0.02, sd * (Wd / 2 - 0.32), 0.62, 0.05, 0.16, 0.3, HEAD, { noTop: true }); box(-L / 2 - 0.02, sd * (Wd / 2 - 0.25), 0.72, 0.05, 0.3, 0.2, TAIL, { noTop: true }); }
    wheels([L / 2 - 2.45, -L / 2 + 2.7], Wd, 0.5, 0.17);
    return [L, Wd, H];
  }
  return [4, 1.8, 1.4];
}

// the map's parked cars plus traffic that stopped where it was when the lights went out
export function placeTraffic(W) {
  const map = W.map, R = rng(31337), V = (W.vehicles = []), vg = new Map(), K = (x, z) => Math.floor(x / 8) * 8192 + Math.floor(z / 8);
  const clear = (x, z, rad) => { for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const a = vg.get(K(x + i * 8, z + j * 8)); if (a) for (const v of a) if (hyp(v.x - x, v.z - z) < rad + v.r) return false; } return true; };
  const keep = (x, z, rad) => { const k = K(x, z); let a = vg.get(k); if (!a) vg.set(k, (a = [])); const v = { x, z, r: rad }; a.push(v); V.push(v); };
  const sites = map.sites.map((s) => s.p), hub = map.hub;
  const put = (x, z, ang, kind, seed, o = {}) => {
    const d = VEH_DIM[kind] || [4.5, 1.8, 1.4], rad = d[0] / 2 + 0.3; if (!clear(x, z, rad)) return false;
    const c = W.ch(x, z); vehicle(c.prop, x, z, ang, kind, seed, { ...o, det: c.det });
    const cs = Math.cos(ang), sn = Math.sin(ang), h = d[2] - (o.burnt ? 0.1 : 0);
    W.addBox(x, z, cs, -sn, d[0], d[1], kind === 'bus' || kind === 'truck' || kind === 'ambulance' ? h : Math.min(h, 1.42), F_COVER | (h < 1.8 ? F_LOW : 0));
    keep(x, z, rad); return true;
  };
  const pick = (big) => { const q = R(); if (big && q < 0.025) return 'bus'; if (q < 0.3) return 'sedan'; if (q < 0.48) return 'hatch'; if (q < 0.6) return 'estate'; if (q < 0.7) return 'suv'; if (q < 0.79) return 'van'; if (q < 0.85) return 'taxi'; if (q < 0.9) return 'trabi'; if (q < 0.94) return 'police'; if (q < 0.97) return 'ambulance'; return 'truck'; };
  // parked cars from the map
  for (const cr of map.cars) {
    const [x, z, a, type, seed] = cr, kind = type === 3 ? 'bus' : type === 2 ? (R() < 0.5 ? 'van' : R() < 0.5 ? 'ambulance' : 'police') : type === 1 ? (R() < 0.5 ? 'suv' : 'estate') : pick(false);
    put(x, z, -a, kind === 'bus' ? 'bus' : kind, seed, { burnt: R() < 0.06, door: R() < 0.1 });
  }
  // the jams: lines of cars nose to tail in the lanes, a few crashed across them, gaps left to get through
  for (const st of map.streets) {
    if (!(st.cw >= 6) || st.k === 'path') continue;
    const major = st.k === 'main' || st.k === 'boulevard' || st.cw >= 12;
    for (let i = 0; i < st.p.length - 1; i++) {
      const a = st.p[i], b = st.p[i + 1], L = hyp(b[0] - a[0], b[1] - a[1]); if (L < 34) continue;
      const dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L, nx = -dz, nz = dx, base = Math.atan2(-dz, dx);
      for (let t = 12 + R() * 16; t < L - 14; t += 26 + R() * 34) {
        if (R() > (major ? 0.82 : 0.6)) continue;
        const lane = (R() < 0.5 ? -1 : 1) * st.cw * (st.cw >= 12 ? 0.18 + R() * 0.12 : 0.24), cx = a[0] + dx * t + nx * lane, cz = a[1] + dz * t + nz * lane;
        if (!W.inCore(cx, cz) || hyp(cx - hub[0], cz - hub[1]) < 70 || sites.some((p) => hyp(p[0] - cx, p[1] - cz) < 16)) continue;
        const n = 2 + ((R() * (major ? 5 : 3)) | 0), dir = lane > 0 ? 1 : -1; let u = 0;
        for (let k = 0; k < n && t + u < L - 8; k++) {
          const kind = pick(major), len = (VEH_DIM[kind] || [4.5])[0], jit = (R() - 0.5) * 0.7, crash = R() < 0.09;
          const ux = cx + dx * u, uz = cz + dz * u, px = ux + nx * jit, pz = uz + nz * jit;
          if (W.walkRaw(px, pz) && W.walkRaw(px + dx * len * 0.5, pz + dz * len * 0.5) && W.walkRaw(px - dx * len * 0.5, pz - dz * len * 0.5)) put(px, pz, base + (dir < 0 ? Math.PI : 0) + (crash ? (R() - 0.5) * 1.6 : (R() - 0.5) * 0.18), kind, (R() * 9999) | 0, { burnt: R() < (crash ? 0.4 : 0.07), door: R() < 0.16 });
          u += len + 1.0 + R() * 2.2;
        }
      }
    }
  }
  // and the cars that were parked along the kerbs, nose to tail, as on every Berlin street
  for (const st of map.streets) {
    if (!(st.cw >= 5) || st.k === 'path') continue;
    for (let i = 0; i < st.p.length - 1; i++) {
      const a = st.p[i], b = st.p[i + 1], L = hyp(b[0] - a[0], b[1] - a[1]); if (L < 20) continue;
      const dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L, base = Math.atan2(-dz, dx);
      for (const s of [-1, 1]) {
        const nx = -dz * s, nz = dx * s, off = st.cw / 2 - 1.15;
        for (let t = 9 + R() * 4; t < L - 9; t += 5.6 + R() * 1.6) {
          if (R() > 0.42) continue;
          const x = a[0] + dx * t + nx * off, z = a[1] + dz * t + nz * off;
          if (!W.inCore(x, z) || hyp(x - hub[0], z - hub[1]) < 60 || sites.some((p) => hyp(p[0] - x, p[1] - z) < 14)) continue;
          const q = R(), kind = q < 0.3 ? 'sedan' : q < 0.52 ? 'hatch' : q < 0.66 ? 'estate' : q < 0.76 ? 'suv' : q < 0.86 ? 'van' : q < 0.93 ? 'trabi' : 'taxi';
          const len = VEH_DIM[kind][0]; if (!W.walkRaw(x + dx * len * 0.5, z + dz * len * 0.5) || !W.walkRaw(x - dx * len * 0.5, z - dz * len * 0.5)) continue;
          put(x, z, base + (s < 0 ? Math.PI : 0) + (R() - 0.5) * 0.08, kind, (R() * 9999) | 0, { burnt: R() < 0.05, door: R() < 0.06 });
        }
      }
    }
  }
  return V.length;
}

// ---------------------------------------------------------------- facades
const GROUND = [['shop', 'door', 'shutter', 'shop'], ['shutter', 'door', 'wall', 'shutter'], ['shop', 'wall', 'door', 'shutter'], ['wall', 'door', 'shop', 'wall'], ['glass', 'glass', 'door', 'glass'], ['glass', 'glass', 'glass', 'glass'], ['arch', 'arch', 'arch', 'arch'], ['glass', 'shop', 'glass', 'door']];
const AWN = [0x7a1e1e, 0x1f4a2e, 0x1d2a4a, 0x5a1f33, 0x8a6a2a, 0x2a2a2a, 0x2e5a5a, 0x6a2a10];
const SIGN = [0xe9e6dc, 0xb33a2c, 0x2b4a7a, 0xe0b23a, 0x2e6a3a, 0x1a1a1a];
const ALTBAU = { 0: 1, 1: 1, 2: 1, 6: 1 };

// F: { x1, z1, x2, z2, L, ex, ez, top, st, fl, did, seed, tex, tc }; the facade runs a = (x2,z2) -> b = (x1,z1) seen from outside
export function dressFacade(W, c, F) {
  const { L, ex, ez, top, st, fl, seed, tex, tc } = F; if (L < 3 || !W.inCore((F.x1 + F.x2) / 2, (F.z1 + F.z2) / 2)) return;
  const r = rng(seed * 131 + st * 17 + ((F.x1 * 3) | 0)), ox = ez, oz = -ex, ang = Math.atan2(-ez, ex), ax = F.x2, az = F.z2, dx = -ex, dz = -ez;
  const at = (t, o) => [ax + dx * t + ox * o, az + dz * t + oz * o];
  const bays = tex.bays || 4, nb = Math.max(1, Math.round(L / ((tex.mw || 12) / bays))), bw = L / nb, fh = tex.fh || 3.6, pat = GROUND[st] || GROUND[0];
  const trim = c.trim, prop = c.det, alt = !!ALTBAU[st];
  const lt = tc.map((v) => Math.min(1, v * 1.08));
  // floor ledges: a shadow line under every row of windows
  if (alt || st === 4) for (let k = 1; k < fl; k++) { const y = 4.4 + k * fh - 0.06, p = at(L / 2, 0.08); trim.box(p[0], y, p[1], L, 0.16, 0.16, ang, lt, { uv: 3 }); }
  // balconies (old houses) and loggias (prefab blocks)
  const balk = alt ? (st === 0 || st === 6 ? 0.55 : 0.28) : 0;
  if (fl >= 2 && (r() < balk || st === 3)) {
    const cols = []; for (let k = 0; k < nb; k++) { const tb = (seed % bays + k) % bays; if (st === 3 ? tb === 1 || tb === 3 : tb % 2 === 1 && r() < 0.8) cols.push(k); }
    const iron = C(0x1b1c1e), conc = C(0xb8b4aa, 0.9 + r() * 0.1), w = Math.min(st === 3 ? 3.0 : 2.4, bw * (st === 3 ? 0.82 : 0.66)), dep = st === 3 ? 1.15 : 0.95;
    for (const k of cols) for (let f = 1; f < fl; f++) {
      if (st !== 3 && r() < 0.15) continue;
      const y = 4.4 + f * fh - 0.04, p = at((k + 0.5) * bw, dep / 2), pf = at((k + 0.5) * bw, dep - 0.02);
      trim.box(p[0], y - 0.16, p[1], w, 0.18, dep, ang, st === 3 ? conc : lt, { uv: 2 });
      if (st === 3) { prop.box(pf[0], y + 0.02, pf[1], w, 1.0, 0.1, ang, conc); for (const s of [-1, 1]) { const ps = at((k + 0.5) * bw + s * (w / 2 - 0.05), dep / 2); prop.box(ps[0], y + 0.02, ps[1], 0.1, 1.0, dep, ang, conc); } }
      else { prop.box(pf[0], y + 0.02, pf[1], w, 0.95, 0.035, ang, iron, { noTop: true }); prop.box(pf[0], y + 0.95, pf[1], w + 0.04, 0.05, 0.07, ang, iron); for (const s of [-1, 1]) { const ps = at((k + 0.5) * bw + s * (w / 2 - 0.02), dep / 2); prop.box(ps[0], y + 0.02, ps[1], 0.035, 0.95, dep, ang, iron, { noTop: true }); } }
      if (r() < 0.06) { const pd = at((k + 0.5) * bw + w * 0.3, dep * 0.6); prop.lathe(pd[0], pd[1], [[0.0, y + 1.1], [0.28, y + 1.2], [0.3, y + 1.3]], 8, C(0xd8dadc)); }   // a satellite dish
    }
  }
  // street level: awnings over shops, boxes over shutters, signs sticking out, lamps by the doors
  for (let k = 0; k < nb; k++) {
    const kind = pat[((seed % bays) + k) % bays % pat.length], tm = (k + 0.5) * bw, q = r();
    if (kind === 'shop' && q < 0.5) {                              // a canvas awning, sometimes striped, snow on top
      const w = bw - 0.5, out = 1.15 + r() * 0.35, y1 = 3.55, y0 = 2.9 - r() * 0.15, col = C(AWN[(r() * AWN.length) | 0], 0.8 + r() * 0.3), stripe = r() < 0.35, ns = stripe ? 5 : 1;
      for (let s = 0; s < ns; s++) {
        const t0 = tm - w / 2 + (s / ns) * w, t1 = tm - w / 2 + ((s + 1) / ns) * w, cc = stripe && s % 2 ? C(0xe8e4d8) : col, A = at(t0, 0.03), B = at(t1, 0.03), Cq = at(t1, out), D = at(t0, out);
        prop.quad([A[0], y1, A[1]], [B[0], y1, B[1]], [Cq[0], y0, Cq[1]], [D[0], y0, D[1]], [0, 0], [1, 0], [1, 1], [0, 1], cc, null, [ox, 1, oz]);
        prop.quad([D[0], y0, D[1]], [Cq[0], y0, Cq[1]], [Cq[0], y0 - 0.26, Cq[1]], [D[0], y0 - 0.26, D[1]], [0, 0], [1, 0], [1, 1], [0, 1], cc, null, [ox, 0, oz]);
      }
      for (const s of [-1, 1]) { const A = at(tm + (s * w) / 2, 0.03), D = at(tm + (s * w) / 2, out); prop.tri([A[0], y1, A[1]], [D[0], y0, D[1]], [D[0], y0 - 0.26, D[1]], [0, 0], [1, 0], [1, 1], col, null, null, [dx * s, 0, dz * s]); }
    } else if (kind === 'shutter' && q < 0.7) { const p = at(tm, 0.1); prop.box(p[0], 2.92, p[1], bw - 0.45, 0.3, 0.2, ang, C(0x5e6266, 0.85 + r() * 0.2)); }
    if ((kind === 'shop' || kind === 'glass') && r() < 0.22) {     // a sign on a bracket
      const p = at(tm + bw * 0.42, 0.55), arm = at(tm + bw * 0.42, 0.3), col = C(SIGN[(r() * SIGN.length) | 0]);
      prop.box(arm[0], 3.82, arm[1], 0.05, 0.05, 0.6, ang, TRIM); prop.box(p[0], 3.2, p[1], 0.07, 0.58, 0.62, ang, col); prop.box(p[0], 3.25, p[1], 0.08, 0.48, 0.52, ang, C(0xf0eee6, 0.9));
      if (r() < 0.5) { c.gp.push(p[0] + ox * 0.0, 3.5, p[1]); c.gg.push(F.did, 0.55, 1.4); }
    }
    if (kind === 'door' && r() < 0.55) { const p = at(tm + bw * 0.32, 0.12); prop.box(p[0], 2.55, p[1], 0.16, 0.24, 0.14, ang, TRIM); c.gp.push(p[0] + ox * 0.12, 2.6, p[1] + oz * 0.12); c.gg.push(F.did, 0.0, 1.0); }
  }
  // messages sprayed on the blank bays at street level
  const D = c.dec, open = (x, z) => W.walkable(x, z), note = (x, z, nx, nz, y, t) => (W.decs || (W.decs = [])).push([x, z, nx, nz, y, t]);
  for (let k = 0; k < nb; k++) {
    const kind = pat[((seed % bays) + k) % bays % pat.length]; if (kind !== 'wall' || r() > 0.3) continue;
    const w = Math.min(bw * 0.84, 2.3) * (0.8 + r() * 0.2), p = at((k + 0.5) * bw + (r() - 0.5) * 0.25, 0.03);
    decal(D, p[0], p[1], ox, oz, 1.5 + r() * 0.45, w, SPRAY[(r() * SPRAY.length) | 0], sprayCol(r)); note(p[0], p[1], ox, oz, 1.7, 'wall');
  }
  // bedsheets hung out of upper windows with a message on them
  if (fl >= 2 && st !== 5 && r() < 0.075) {
    const k = (r() * nb) | 0, f = 1 + ((r() * Math.min(3, fl - 1)) | 0), w = Math.min(bw * 0.9, 2.5), hgt = 1.25 + r() * 0.35, y1 = 4.4 + f * fh + 0.15, sag = 0.12;
    const t0 = (k + 0.5) * bw - w / 2, t1 = t0 + w, A = at(t0, 0.07), B = at(t1, 0.07), sh = C(r() < 0.6 ? 0xe2dfd6 : 0xc9c2b2, 0.85 + r() * 0.15);
    prop.quad([A[0], y1 - hgt, A[1]], [B[0], y1 - hgt + sag * (r() - 0.5), B[1]], [B[0], y1, B[1]], [A[0], y1, A[1]], [0, 0], [1, 0], [1, 1], [0, 1], sh, null, [ox, 0, oz]);
    const pm = at((t0 + t1) / 2, 0.095), ink = r() < 0.7 ? [0.09, 0.085, 0.08] : [0.42, 0.06, 0.05];
    decal(D, pm[0], pm[1], ox, oz, y1 - hgt / 2, w * 0.92, [0, 2, 3, 4, 5, 7][(r() * 6) | 0], ink); note(pm[0], pm[1], ox, oz, y1 - hgt / 2, 'sheet');
  }
  // firewalls left bare by a gap in the row: one big message, or an official sign
  if (F.dep > 2) for (const e of [[F.x1, F.z1, -ex, -ez], [F.x2, F.z2, ex, ez]]) {
    const [px, pz, nx, nz] = e, ix = -ez, iz = ex, mx = px + ix * F.dep * 0.5, mz = pz + iz * F.dep * 0.5;
    if (!(open(mx + nx * 3.5, mz + nz * 3.5) && open(mx + nx * 6, mz + nz * 6)) || r() < 0.25) continue;
    const self = [F.x1, F.z1, F.x2]; let hid = false;
    for (const q of [0.2, 0.5, 0.8]) for (const t of [0.4, 1.4, 2.6]) if (!hid && hidden(W, px + ix * F.dep * q + nx * t, pz + iz * F.dep * q + nz * t, self)) hid = true;
    if (hid) continue;
    const sign = r() < 0.18, big = !sign && top > 13 && r() < 0.5, w = sign ? 1.1 + r() * 0.25 : big ? Math.min(F.dep * 0.85, 6.5) : Math.min(F.dep * 0.7, 3.2), y = sign ? 1.9 : big ? 6 + r() * Math.min(5, top - 10) : 1.6 + r() * 0.8;
    decal(D, mx + nx * 0.03, mz + nz * 0.03, nx, nz, y, w, sign ? SIGNS[(r() * 2) | 0] : SPRAY[(r() * SPRAY.length) | 0], big ? [0.85, 0.85, 0.82] : sign ? [0.9, 0.9, 0.9] : sprayCol(r)); note(mx, mz, nx, nz, y, big ? 'fire big' : 'fire');
  }
  // zinc drainpipes at the ends of old houses
  if (alt && top > 10) for (const t of [0.25, L - 0.25]) if (r() < 0.7) { const p = at(t, 0.1); prop.cyl(p[0], 0, p[1], 0.055, 0.055, top - 0.35, 6, C(0x7d8287, 0.8 + r() * 0.2), { smooth: true }); }
}

// ---------------------------------------------------------------- spray paint and signs (decals.png: 4 x 2 cells)
// 0 Notbetrieb Stützpunkt, 1 Sperrzone sign, 2 Wasser hier, 3 Strom aus, 4 Kiezrat tagt, 5 Vorsicht Schützen, 6 Hochspannung sign, 7 Wärmestube offen
export const SPRAY = [0, 2, 3, 3, 4, 5, 5, 7], SIGNS = [1, 6];
// a decal on a wall facing (nx, nz), centred at (x, y, z), w metres wide; text cells are cropped to the lettering
export function decal(mb, x, z, nx, nz, y, w, cell, col) {
  const sign = cell === 1 || cell === 6, cx = cell % 4, cy = cell >> 2, cu = sign ? [0.04, 0.96] : [0.07, 0.93], cv = sign ? [0.04, 0.96] : [0.2, 0.8];
  const u0 = (cx + cu[0]) / 4, u1 = (cx + cu[1]) / 4, vt = 1 - (cy + cv[0]) / 2, vb = 1 - (cy + cv[1]) / 2, h = (w * (cv[1] - cv[0]) * 2) / ((cu[1] - cu[0]) * 4) * 2;
  const rx = nz, rz = -nx, hw = w / 2, hh = h / 2;
  mb.quad([x - rx * hw, y - hh, z - rz * hw], [x + rx * hw, y - hh, z + rz * hw], [x + rx * hw, y + hh, z + rz * hw], [x - rx * hw, y + hh, z - rz * hw], [u0, vb], [u1, vb], [u1, vt], [u0, vt], col, null, [nx, 0, nz]);
  return h;
}
// every front facade on a 24 m grid, to tell a bare firewall from one hidden behind the next house's front
function fronts(W) {
  if (W._fronts) return W._fronts;
  const G = new Map(), add = (ax, az, bx, bz) => { for (let i = Math.floor(Math.min(ax, bx) / 24); i <= Math.floor(Math.max(ax, bx) / 24); i++) for (let j = Math.floor(Math.min(az, bz) / 24); j <= Math.floor(Math.max(az, bz) / 24); j++) { const k = i * 4096 + j; let a = G.get(k); if (!a) G.set(k, (a = [])); a.push([ax, az, bx, bz]); } };
  for (const B of W.map.builds) add(B[0], B[1], B[2], B[3]);
  for (const M of W.map.masses) for (let i = 0; i < M.p.length; i++) { const a = M.p[i], b = M.p[(i + 1) % M.p.length]; add(a[0], a[1], b[0], b[1]); }
  return (W._fronts = G);
}
function hidden(W, x, z, self) {
  const a = fronts(W).get(Math.floor(x / 24) * 4096 + Math.floor(z / 24)); if (!a) return false;
  for (const s of a) { if (s[0] === self[0] && s[1] === self[1] && s[2] === self[2]) continue; const dx = s[2] - s[0], dz = s[3] - s[1], l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - s[0]) * dx + (z - s[1]) * dz) / l2)); if (Math.hypot(x - s[0] - dx * t, z - s[1] - dz * t) < 1.0) return true; }
  return false;
}
const sprayCol = (r) => { const k = 0.62 + r() * 0.3; return [k, k * (0.96 + r() * 0.04), k * (0.92 + r() * 0.08)]; };

// ---------------------------------------------------------------- kerbs, pavements and squares
export function dressKerbs(W, X) {
  const map = W.map, R = rng(2718), { P, ok, take, free, road } = X, Dl = (x, z) => W.ch(x, z).det, n = { snow: 0, junk: 0, block: 0, site: 0, camp: 0 };
  const snowC = C(0xe6ebf0), conc = C(0x9a968e, 0.95), dk = C(0x2a2d30);
  const mound = (x, z, a, s) => {                                   // ploughed snow: a few soft humps, greyer where the traffic splashed it
    const mb = Dl(x, z), cs = Math.cos(a), sn = Math.sin(a), dirty = R() < 0.4, k = 4 + ((R() * 4) | 0);
    for (let i = 0; i < k; i++) { const u = (i - (k - 1) / 2) * 0.48 * s + (R() - 0.5) * 0.2, px = x + u * cs, pz = z - u * sn, r0 = (0.55 + R() * 0.4) * s, h = (0.14 + R() * 0.2) * s * (1 - Math.abs(i - (k - 1) / 2) / k), col = dirty && R() < 0.5 ? C(0xb5b3ae, 0.85 + R() * 0.1) : C(0xd9dfe6, 0.92 + R() * 0.06);
      mb.lathe(px, pz, [[r0, 0], [r0 * 0.7, h * 0.7], [r0 * 0.3, h * 0.97], [0, h]], 6, col); }
  };
  const bag = (mb, x, z, s, col) => mb.lathe(x, z, [[0.26 * s, 0.0], [0.31 * s, 0.17 * s], [0.18 * s, 0.4 * s], [0, 0.5 * s]], 6, col);
  const heap = (x, z, a, big) => {                                  // rubbish piled against a wall: bags, boxes, a mattress, a chair
    const mb = Dl(x, z), N = big ? 9 + ((R() * 8) | 0) : 4 + ((R() * 5) | 0), cs = Math.cos(a), sn = Math.sin(a);
    for (let k = 0; k < N; k++) {
      const u = (R() - 0.5) * (big ? 3.4 : 2.0), v = R() * (big ? 1.2 : 0.8), px = x + u * cs + v * sn, pz = z - u * sn + v * cs, q = R(), s = 0.75 + R() * 0.55;
      if (q < 0.62) bag(mb, px, pz, s, C([0x141618, 0x1c2a3a, 0x2f3236, 0x3a3020, 0x152016][(R() * 5) | 0], 0.8 + R() * 0.4));
      else if (q < 0.82) mb.box(px, 0, pz, 0.55 * s, 0.42 * s, 0.45 * s, a + R() * 0.8, C(0x8a6a44, 0.75 + R() * 0.3));
      else if (q < 0.9) mb.box(px, 0.02, pz, 1.9, 0.2, 0.9, a + (R() - 0.5) * 0.4, C([0xd8d0c0, 0xb8b0a8, 0x8a8a92][(R() * 3) | 0], 0.8 + R() * 0.2));
      else { mb.box(px, 0, pz, 0.08, 0.45, 0.08, a, dk); mb.box(px, 0.45, pz, 0.5, 0.08, 0.5, a + R(), C(0x2a2a2e)); mb.box(px + 0.2 * sn, 0.5, pz + 0.2 * cs, 0.5, 0.55, 0.07, a, C(0x2a2a2e)); }
    }
    W.addCircle(x + sn * 0.5, z + cs * 0.5, big ? 1.3 : 0.9, 0.7); take(x, z, big ? 2.2 : 1.5); n.junk++;
  };
  const jersey = (x, z, a) => { const mb = P(x, z); mb.box(x, 0, z, 2.0, 0.24, 0.62, a, conc); mb.box(x, 0.24, z, 2.0, 0.78, 0.36, a, conc, { w1: 0.18 }); const cs = Math.cos(a), sn = Math.sin(a); W.addBox(x, z, cs, -sn, 2.0, 0.6, 1.02, F_COVER | F_LOW); };
  const bake = (x, z, a) => { const mb = Dl(x, z), cs = Math.cos(a), sn = Math.sin(a); for (const e of [-0.85, 0.85]) mb.box(x + cs * e, 0, z - sn * e, 0.1, 1.05, 0.5, a, C(0x2a2a2a)); for (let k = 0; k < 5; k++) { const u = -0.8 + k * 0.4; mb.box(x + cs * u, 0.82, z - sn * u, 0.4, 0.22, 0.04, a, k % 2 ? C(0xe8e4dc) : C(0xb8241c)); } W.addBox(x, z, cs, -sn, 1.9, 0.3, 1.0, 0); };
  // 1) along every street: snow banks at the kerb, rubbish against the houses, the odd roadblock
  for (const st of map.streets) {
    if (!(st.cw > 0) || st.k === 'path') continue;
    for (let i = 0; i < st.p.length - 1; i++) {
      const a = st.p[i], b = st.p[i + 1], L = hyp(b[0] - a[0], b[1] - a[1]); if (L < 10) continue;
      const dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L, ang = Math.atan2(-dz, dx);
      for (const s of [-1, 1]) {
        const nx = -dz * s, nz = dx * s;
        for (let t = 3 + R() * 8; t < L - 3; t += 7 + R() * 12) { const x = a[0] + dx * t + nx * (st.cw / 2 + 0.25), z = a[1] + dz * t + nz * (st.cw / 2 + 0.25); if (W.inCore(x, z) && W.walkRaw(x, z) && free(x, z, 1.0) && R() < 0.6) { mound(x, z, ang + (R() - 0.5) * 0.3, 0.8 + R() * 0.6); n.snow++; } }
        const fo = st.w / 2 - 1.4;                                          // against the facades
        for (let t = 4 + R() * 10; t < L - 4; t += 9 + R() * 14) { const x = a[0] + dx * t + nx * fo, z = a[1] + dz * t + nz * fo; if (W.inCore(x, z) && ok(x, z, 1.6) && R() < 0.62) heap(x, z, Math.atan2(-nz, nx) + Math.PI / 2 + Math.PI, R() < 0.35); }
        for (let t = 6 + R() * 12; t < L - 6; t += 14 + R() * 20) {         // odds and ends on the pavement: crates, a pallet, tyres, a shopping trolley
          const x = a[0] + dx * t + nx * (st.cw / 2 + 1.6 + R() * Math.max(0, (st.w - st.cw) / 2 - 3.4)), z = a[1] + dz * t + nz * (st.cw / 2 + 1.6 + R() * Math.max(0, (st.w - st.cw) / 2 - 3.4));
          if (!W.inCore(x, z) || !ok(x, z, 1.0) || R() > 0.5) continue; const mb = Dl(x, z), q = R(), ra = R() * 3;
          if (q < 0.35) { for (let k = 0; k < 2 + ((R() * 3) | 0); k++) mb.box(x + (R() - 0.5) * 0.9, k < 2 ? 0 : 0.42, z + (R() - 0.5) * 0.9, 0.6, 0.42, 0.42, ra + R() * 0.4, C(R() < 0.5 ? 0x2a5a8a : 0x7a6040, 0.8 + R() * 0.3)); }
          else if (q < 0.55) { mb.box(x, 0, z, 1.2, 0.14, 0.8, ra, C(0x9a7a50, 0.85)); if (R() < 0.5) mb.box(x, 0.14, z, 1.2, 0.14, 0.8, ra + 0.1, C(0x9a7a50, 0.8)); }
          else if (q < 0.75) { for (let k = 0; k < 1 + ((R() * 3) | 0); k++) hcyl(mb, x, 0.09 + k * 0.17, z, 0, 1, 0.33, 0.09, 8, TIRE, { caps: 2 }); }
          else { const cs = Math.cos(ra), sn = Math.sin(ra); mb.box(x, 0.35, z, 0.85, 0.55, 0.55, ra, C(0x9aa0a6), { l1: 0.95 }); for (const e of [-0.32, 0.32]) mb.box(x + cs * e, 0, z - sn * e, 0.04, 0.35, 0.5, ra, C(0x3a3d40)); }
          take(x, z, 1.0);
        }
      }
      if (L > 40 && R() < 0.16) {                                           // a roadblock across one side of the road
        const t = 10 + R() * (L - 20), s = R() < 0.5 ? -1 : 1, nx = -dz * s, nz = dx * s, w = st.cw / 2 - 0.6, nbk = Math.max(2, Math.floor(w / 2.1)), red = R() < 0.4;
        for (let k = 0; k < nbk; k++) { const o = 0.9 + k * 2.1, x = a[0] + dx * t + nx * o, z = a[1] + dz * t + nz * o; if (!W.inCore(x, z) || !W.walkRaw(x, z) || !free(x, z, 1.2)) continue; if (red) bake(x, z, ang + Math.PI / 2 + (R() - 0.5) * 0.2); else jersey(x, z, ang + Math.PI / 2 + (R() - 0.5) * 0.15); take(x, z, 1.2); }
        n.block++;
      }
    }
  }
  // 2) building sites: fence with green sheeting, a site container, and the pink and blue pipes Berlin runs over its streets
  const PIPE = [0xd77aa8, 0x6a8ec8, 0x9a6ab8, 0xc06a90];
  for (const bd of map.builds) {
    const [x1, z1, x2, z2, , h, st, , , seed] = bd, L = hyp(x2 - x1, z2 - z1);
    if (L < 16 || (seed * 104729) % 100 > 4 || !W.inCore((x1 + x2) / 2, (z1 + z2) / 2)) continue;
    const ex = (x2 - x1) / L, ez = (z2 - z1) / L, ox = ez, oz = -ex, ang = Math.atan2(-ez, ex), D = 3.6, len = Math.min(L - 2, 10 + (seed % 9));
    const t0 = (L - len) / 2, P0 = [x1 + ex * t0, z1 + ez * t0], at = (t, o) => [P0[0] + ex * t + ox * o, P0[1] + ez * t + oz * o];
    let fine = true; for (let t = 0; t <= len && fine; t += 2) { const p = at(t, D); if (!W.walkRaw(p[0], p[1]) || road(p[0], p[1]) > 0.5) fine = false; } if (!fine) continue;
    const mb = P(P0[0], P0[1]), dmb = Dl(P0[0], P0[1]), tarp = C(0x2f5a3a, 0.8 + (seed % 5) * 0.06), mesh = C(0x6a6e72);
    const panel = (t, o, along) => { const p = at(t, o), a = along ? ang : ang + Math.PI / 2; dmb.box(p[0], 0.18, p[1], 3.4, 1.85, 0.04, a, (seed + t) % 3 ? tarp : mesh, { noTop: true }); for (const e of [-1.7, 1.7]) { const q = along ? at(t + e, o) : at(t, o + e); dmb.box(q[0], 0, q[1], 0.55, 0.16, 0.22, a, C(0x8a867e)); dmb.box(q[0], 0.16, q[1], 0.05, 1.95, 0.05, a, mesh); } };
    for (let t = 1.7; t < len; t += 3.45) panel(t, D, true);
    for (const t of [0, len]) for (let o = 1.7; o < D; o += 3.45) panel(t, o, false);
    { const a = at(0, D), b = at(len, D); W.addSeg(a[0], a[1], b[0], b[1], 2.0); const c0 = at(0, 0.2), d0 = at(len, 0.2); W.addSeg(c0[0], c0[1], a[0], a[1], 2.0); W.addSeg(d0[0], d0[1], b[0], b[1], 2.0); }
    const cp = at(len * 0.32, 1.45); mb.box(cp[0], 0, cp[1], 6.0, 2.6, 2.4, ang, C([0xd8dadc, 0x3a5a8a, 0xe8e4d8][seed % 3], 0.85), { topCol: C(0x9a9c9e) }); mb.box(cp[0], 0.95, cp[1] + 0, 6.04, 0.9, 1.4, ang, GLASS, { noTop: true });
    // the pipes: along the facade at 3.8 m on trestles, dropping into the ground at the ends
    const pc = C(PIPE[seed % PIPE.length], 0.85 + (seed % 7) * 0.03), pl = len + 14, pa = at(-7, D + 0.9), pr = 0.24;
    hcyl(mb, pa[0] + ex * pl / 2, 3.8, pa[1] + ez * pl / 2, ex, ez, pr, pl / 2, 8, pc, { caps: 2 });
    for (const t of [-7, len + 7]) { const p = at(t, D + 0.9); mb.cyl(p[0], 0, p[1], pr, pr, 3.8, 8, pc, { smooth: true }); }
    for (let t = -4; t < len + 6; t += 5.5) { const p = at(t, D + 0.9); for (const e of [-0.45, 0.45]) { const q = [p[0] + ox * e, p[1] + oz * e]; mb.box(q[0], 0, q[1], 0.08, 3.6, 0.08, ang, C(0x5a5e62)); } mb.box(p[0], 3.5, p[1], 0.1, 0.08, 1.1, ang, C(0x5a5e62)); }
    { const sp = at(len * 0.62, D + 0.05); decal(W.ch(sp[0], sp[1]).dec, sp[0], sp[1], ox, oz, 1.15, 0.95, seed % 2 ? 1 : 6, [0.9, 0.9, 0.9]); }   // a warning sign on the fence
    take(cp[0], cp[1], 4); n.site++;
  }
  // 3) camps of people who lost their homes: tents, a tarp on poles, crates, a cart, on squares and in the parks
  const camp = (x, z) => {
    const mb = P(x, z), N = 2 + ((R() * 4) | 0);
    for (let k = 0; k < N; k++) {
      const a = R() * 6.28, d = 1.8 + R() * 3, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d, col = C([0xb83a2a, 0x2a5a8a, 0x3a6a3a, 0xd88a2a, 0x5a5a62, 0x7a2a5a][(R() * 6) | 0], 0.8 + R() * 0.3), s = 0.9 + R() * 0.5;
      if (!W.walkRaw(px, pz)) continue;
      mb.lathe(px, pz, [[1.15 * s, 0], [1.05 * s, 0.35 * s], [0.8 * s, 0.7 * s], [0.45 * s, 0.95 * s], [0.0, 1.05 * s]], 7, col); W.addCircle(px, pz, 1.0 * s, 1.0);
    }
    const ta = R() * 6.28, cs = Math.cos(ta), sn = Math.sin(ta), tc = C([0x2a4a7a, 0x4a5a3a, 0x5a4a3a][(R() * 3) | 0], 0.8);
    const p0 = [x + cs * 1.6, z - sn * 1.6], p1 = [x - cs * 1.6, z + sn * 1.6];
    mb.quad([p0[0] + sn * 1.2, 2.1, p0[1] + cs * 1.2], [p1[0] + sn * 1.2, 2.1, p1[1] + cs * 1.2], [p1[0] - sn * 1.2, 1.4, p1[1] - cs * 1.2], [p0[0] - sn * 1.2, 1.4, p0[1] - cs * 1.2], [0, 0], [1, 0], [1, 1], [0, 1], tc, null, [0, 1, 0]);
    for (const p of [p0, p1]) for (const e of [1, -1]) mb.box(p[0] + sn * 1.2 * e, 0, p[1] + cs * 1.2 * e, 0.06, e > 0 ? 2.1 : 1.4, 0.06, ta, dk);
    for (let k = 0; k < 3; k++) { const px = x + (R() - 0.5) * 2.5, pz = z + (R() - 0.5) * 2.5; mb.box(px, 0, pz, 0.6, 0.45, 0.45, R() * 3, C(0x7a6040, 0.8 + R() * 0.3)); }
    take(x, z, 5); n.camp++;
  };
  const plazas = (map.plazaNames || []).filter((p) => W.inCore(p.p[0], p.p[1]) && hyp(p.p[0] - map.hub[0], p.p[1] - map.hub[1]) > 80);
  for (const p of plazas) for (let k = 0; k < 2; k++) { const a = R() * 6.28, d = 8 + R() * 14, x = p.p[0] + Math.cos(a) * d, z = p.p[1] + Math.sin(a) * d; if (W.walkRaw(x, z) && free(x, z, 5)) camp(x, z); }
  for (let tries = 0; tries < 900 && n.camp < 26; tries++) { const x = W.core[0] + R() * (W.core[2] - W.core[0]), z = W.core[1] + R() * (W.core[3] - W.core[1]); if (X.park(x, z) > 0.4 && W.walkRaw(x, z) && free(x, z, 6) && hyp(x - map.hub[0], z - map.hub[1]) > 80) camp(x, z); }
  return n;
}
