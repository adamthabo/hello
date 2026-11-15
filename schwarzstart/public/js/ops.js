// SCHWARZSTART · operations: the hub, sites, encounters, missions, rewards, the networks
import * as THREE from 'three';
import { MB, C, F_COVER, F_LOW, F_WALL } from './geom.js';
import { Rig, LOOKS } from './rig.js';
import * as SYS from './systems.js';
import { FACTIONS, NETS } from './systems.js';
import { clamp, hyp, R, rng } from './util.js';

const YEL = 0xe6dc3c, HOST = [4, 0.5, 0.25], OK = [0.5, 3.2, 4.2], AMB = [4, 2.4, 0.5], OFF = [0.25, 0.25, 0.28];
const USE = { safe: ['Open the Stützpunkt', 1.2], power: ['Throw the main switch', 3], relay: ['Bring the Funkmast online', 2.2], pump: ['Work the pump', 1.2], cache: ['Open the Depot', 0.6] };

export function installOps(Game, Enemy) {
  const G = Game.prototype;

  G.initOps = function () {
    const W = this.world, map = this.map, S = this.S, mb = new MB(), dark = C(0x2a2e33), conc = C(0x8d8a84), grn = C(0x2f5a3c), olive = C(0x4a4f3a), wood = C(0x6b5236);
    this.sites = []; this.use = null; this.useT = 0; this.patT = 6; this.locT = 0; this.loc = { street: '', dist: map.districts[0] }; this.lastD = -1; this.siteT = 0; this.friends = []; this.desks = []; this.pathN = 2; this.inSafe = true; this.hintI = 0;
    const flags = [], beacons = [];
    map.sites.forEach((d, i) => {
      const s = { i, k: d.k, n: d.n, x: d.p[0], z: d.p[1], d: d.d, key: d.k + ':' + i, def: d, done: !!S.sites[d.k + ':' + i], active: false, wave: 0, cleared: false, flag: -1, bea: -1, locked: !W.inCore(d.p[0], d.p[1]) }; this.sites.push(s);
      if (s.locked) return;
      const r = rng(i * 77 + 5), x = s.x, z = s.z, a = Math.floor(r() * 4) * Math.PI / 2, cs = Math.cos(a), sn = Math.sin(a), Pt = (u, v) => [x + u * cs + v * sn, z - u * sn + v * cs];
      const pole = (u, v, hh = 5) => { const p = Pt(u, v); mb.cyl(p[0], 0, p[1], 0.05, 0.04, hh, 6, dark, { smooth: true }); W.addCircle(p[0], p[1], 0.1, 30); s.flag = flags.push([p[0], hh - 0.6, p[1], a]) - 1; return p; };
      if (d.k === 'safe' || d.k === 'hub') {
        if (d.k === 'safe') { for (const [u, v, l, w] of [[0, -1.3, 5.6, 0.28], [0, 1.3, 5.6, 0.28], [-2.8, 0, 0.28, 2.9]]) { const p = Pt(u, v); mb.box(p[0], 0, p[1], l, 1.05, w, a, conc); W.addBox(p[0], p[1], cs, -sn, l, w, 1.05, F_COVER | F_LOW); }
          const q = Pt(0.4, 0); mb.box(q[0], 0.02, q[1], 4.6, 0.02, 2.2, a, C(0x08090a)); for (let k = 0; k < 5; k++) { const st = Pt(-1.6 + k * 0.8, 0); mb.box(st[0], 0.02, st[1], 0.1, 0.04 + k * 0.01, 2.2, a, C(0x3a3a3c)); }
          const sp = Pt(3.3, -1.6); mb.box(sp[0], 0, sp[1], 0.22, 3.6, 0.22, a, dark); mb.box(sp[0], 3.6, sp[1], 0.9, 0.9, 0.3, a, C(0x1c4f9a)); W.addCircle(sp[0], sp[1], 0.2, 30); s.bea = beacons.push([sp[0], 4.75, sp[1]]) - 1; pole(3.3, 1.7); s.ux = Pt(1.2, 0)[0]; s.uz = Pt(1.2, 0)[1]; }
      } else if (d.k === 'power') {
        for (const u of [-2, 2]) { const p = Pt(u, 1.2); mb.box(p[0], 0, p[1], 2.6, 1.9, 2.0, a, C(0x56605a)); for (let k = -4; k <= 4; k++) { const f = Pt(u + k * 0.28, 0.1); mb.box(f[0], 0.3, f[1], 0.06, 1.3, 0.3, a, C(0x3d4641)); } mb.box(p[0], 1.9, p[1], 0.3, 0.7, 0.3, a, C(0x9a8f7a)); W.addBox(p[0], p[1], cs, -sn, 2.6, 2.0, 1.9, F_COVER); }
        const py = Pt(0, 3.4); mb.box(py[0], 0, py[1], 0.36, 10.5, 0.36, a, C(0x4a5054)); mb.box(py[0], 8.2, py[1], 5.2, 0.2, 0.2, a, C(0x4a5054)); mb.box(py[0], 9.6, py[1], 3.6, 0.2, 0.2, a, C(0x4a5054)); W.addCircle(py[0], py[1], 0.3, 30);
        const cb = Pt(0, -1.7); mb.box(cb[0], 0, cb[1], 1.0, 1.75, 0.5, a, C(0x7b8388)); mb.box(cb[0], 1.1, cb[1] , 0.5, 0.36, 0.56, a, C(0xd9b21a)); W.addBox(cb[0], cb[1], cs, -sn, 1.0, 0.5, 1.75, F_COVER); s.bea = beacons.push([cb[0], 1.95, cb[1]]) - 1; s.ux = Pt(0, -2.5)[0]; s.uz = Pt(0, -2.5)[1];
        for (const [u, v] of [[-4.6, -3], [4.6, -3], [-4.6, 4.2], [4.6, 4.2]]) { const f = Pt(u, v); mb.cyl(f[0], 0, f[1], 0.05, 0.05, 2.1, 5, dark, {}); } pole(-4.6, -3.6);
      } else if (d.k === 'cp') {
        for (let k = 0; k < 8; k++) { if (k % 4 === 1) continue; const an = (k / 8) * 6.2832 + a, bx = x + Math.cos(an) * 6.4, bz = z + Math.sin(an) * 6.4, rot = -an + Math.PI / 2; mb.box(bx, 0, bz, 2.5, 0.88, 0.6, rot, conc, { l1: 2.5, w1: 0.26 }); W.addBox(bx, bz, Math.cos(rot), -Math.sin(rot), 2.5, 0.5, 0.88, F_COVER | F_LOW); }
        for (const [u, v, sz] of [[1.5, 0.8, 1.1], [2.0, -0.6, 0.8], [-1.8, 1.4, 1.0]]) { const p = Pt(u, v); mb.box(p[0], 0, p[1], sz, sz * 0.8, sz, a + u, olive); W.addBox(p[0], p[1], Math.cos(a + u), -Math.sin(a + u), sz, sz, sz * 0.8, F_COVER | F_LOW); }
        const fl = Pt(-2.6, -2.2); mb.cyl(fl[0], 0, fl[1], 0.07, 0.05, 6.2, 6, dark, { smooth: true }); mb.box(fl[0], 6.2, fl[1], 0.7, 0.3, 0.3, a, dark); W.addCircle(fl[0], fl[1], 0.12, 30); s.bea = beacons.push([fl[0], 6.3, fl[1]]) - 1; pole(0, 0, 6);
      } else if (d.k === 'relay') {
        mb.box(x, 0, z, 0.5, 17, 0.5, a, C(0x7d8388)); for (let k = 1; k < 6; k++) mb.box(x, k * 2.8, z, 0.9, 0.08, 0.9, a + 0.78, C(0x6a7075)); mb.cyl(x + 0.6, 14.5, z, 0.7, 0.7, 0.15, 10, C(0xc9cdd0), { cap: true }); mb.box(x, 17, z, 0.08, 2.2, 0.08, a, dark); W.addCircle(x, z, 0.4, 30);
        const cb = Pt(1.4, 0); mb.box(cb[0], 0, cb[1], 0.8, 1.5, 0.6, a, C(0x7b8388)); W.addBox(cb[0], cb[1], cs, -sn, 0.8, 0.6, 1.5, F_COVER); s.bea = beacons.push([x, 19.3, z]) - 1; s.ux = Pt(1.4, -0.9)[0]; s.uz = Pt(1.4, -0.9)[1];
      } else if (d.k === 'pump') {
        mb.cyl(x, 0, z, 0.3, 0.3, 0.12, 8, conc, { cap: true }); mb.cyl(x, 0.1, z, 0.14, 0.12, 1.15, 8, grn, { smooth: true }); mb.box(x, 1.25, z, 0.34, 0.26, 0.34, a, grn, { l1: 0.2, w1: 0.2 }); const sp = Pt(0.28, 0), hd = Pt(-0.36, 0); mb.box(sp[0], 0.82, sp[1], 0.42, 0.09, 0.09, a, grn); mb.box(hd[0], 0.95, hd[1], 0.62, 0.06, 0.06, a + 0, grn, { xo: 0 }); W.addCircle(x, z, 0.22, 1.5);
        s.bea = beacons.push([x, 1.62, z]) - 1;
      } else if (d.k === 'cache') { mb.box(x, 0, z, 1.3, 0.72, 0.8, a, olive); mb.box(x, 0.72, z, 1.34, 0.08, 0.84, a, C(0xd9b21a)); W.addBox(x, z, cs, -sn, 1.3, 0.8, 0.8, F_COVER | F_LOW); s.bea = beacons.push([x, 1.0, z]) - 1; }
      else if (d.k === 'mission') { pole(0, 0, 7.5); s.bea = beacons.push([x, 7.8, z]) - 1; }
      if (s.ux == null) { s.ux = x; s.uz = z; }
    });
    // generator floodlights over every hostile site and red flares on the ground: the city's only light in a blacked-out Kiez
    const em = [];
    for (const s of this.sites) {
      if (s.locked || !['cp', 'power', 'mission', 'relay'].includes(s.k)) continue; const r = rng(s.i * 31 + 7), n = s.k === 'cp' || s.k === 'mission' ? 2 : 1;
      for (let k = 0; k < n; k++) {
        let p = null; for (let t = 0; t < 14 && !p; t++) { const a = r() * 6.2832, d = 6 + r() * 5, x = s.x + Math.cos(a) * d, z = s.z + Math.sin(a) * d; if (W.walkable(x, z) && W.walkable(x + 0.8, z) && W.walkable(x, z + 0.8)) p = [x, z]; } if (!p) continue;
        const [x, z] = p, ang = Math.atan2(s.x - x, s.z - z), hx = x + Math.sin(ang) * 0.25, hz = z + Math.cos(ang) * 0.25;
        for (let l = 0; l < 3; l++) { const la = ang + l * 2.094; mb.box(x + Math.sin(la) * 0.42, 0, z + Math.cos(la) * 0.42, 0.05, 1.6, 0.05, la, dark, { l1: 0.04, w1: 0.04, xo: 0 }); }
        mb.cyl(x, 0, z, 0.04, 0.035, 3.3, 6, dark, { smooth: true }); mb.box(hx, 3.15, hz, 0.62, 0.42, 0.34, -ang, C(0x3a3e42)); mb.box(hx + Math.sin(ang) * 0.18, 3.18, hz + Math.cos(ang) * 0.18, 0.54, 0.34, 0.02, -ang, C(0xf4f7ff, 2.2));
        const gx = x - Math.cos(ang) * 1.3, gz = z + Math.sin(ang) * 1.3; mb.box(gx, 0, gz, 0.95, 0.62, 0.55, -ang, C(0x7a2a1a)); mb.box(gx, 0.62, gz, 0.6, 0.1, 0.3, -ang, dark); W.addBox(gx, gz, Math.cos(-ang), -Math.sin(-ang), 0.95, 0.55, 0.62, 1 | 2);
        em.push({ x: hx + Math.sin(ang) * 0.3, y: 3.2, z: hz + Math.cos(ang) * 0.3, type: 1, size: 3.0, pool: 8, pt: 1, pa: 0.28, i: 70, c: 0xe2ecff });
      }
      if (s.k === 'cp' || s.k === 'mission') for (let k = 0; k < 2; k++) { const a = r() * 6.2832, d = 2.5 + r() * 4, x = s.x + Math.cos(a) * d, z = s.z + Math.sin(a) * d; if (!W.walkable(x, z)) continue; mb.cyl(x, 0, z, 0.03, 0.03, 0.22, 5, C(0xd02a1a, 1.5)); em.push({ x, y: 0.3, z, type: 3, size: 1.1, pool: 4, pt: 3, pa: 0.35, i: k ? 0 : 12, c: 0xff3a1e }); }
    }
    W.addEmitters(em);
    this._hub(mb, flags, beacons, wood, olive, dark);
    const mesh = mb.mesh(this.gfx.vcol({ rough: 0.7, snow: 0.9 })); this.scene.add(mesh);
    const fg = new THREE.PlaneGeometry(1.5, 0.95); fg.translate(0.78, 0, 0);
    this.flagM = new THREE.InstancedMesh(fg, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.9 }), flags.length); this.flagM.castShadow = true;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
    flags.forEach((f, i) => { m4.compose(v.set(f[0], f[1], f[2]), q.setFromEuler(e.set(0, f[3], 0)), one); this.flagM.setMatrixAt(i, m4); this.flagM.setColorAt(i, new THREE.Color(0x777777)); });
    this.scene.add(this.flagM); this.flagM.frustumCulled = false;
    this.beaM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshBasicMaterial({ toneMapped: false, fog: false }), beacons.length);
    beacons.forEach((b, i) => { m4.compose(v.set(b[0], b[1], b[2]), q.identity(), one); this.beaM.setMatrixAt(i, m4); this.beaM.setColorAt(i, new THREE.Color(1, 1, 1)); });
    this.scene.add(this.beaM); this.beaM.frustumCulled = false; this.hubBea = beacons.length;
    // restore the world state
    W.setPower(0, true, true); for (const d of S.power) W.setPower(d, true, true);
    const hubSafe = this.sites.find((s) => s.k === 'safe' && s.d === 0); if (hubSafe && !hubSafe.done) { hubSafe.done = true; S.sites[hubSafe.key] = 1; }
    for (const s of this.sites) if (!s.locked) this.paint(s);
    this.pickTrack();
  };

  G._hub = function (mb, flags, beacons, wood, olive, dark) {
    const W = this.world, fr = (a, b) => W.fr('I', a, b), F = this.map.frames.I, rot = Math.atan2(-F.u[1], F.u[0]), canvas = [C(0x6f7458), C(0xb9b6a8), C(0x565b48)];
    const box = (a, b, l, hh, w, col, o) => { const p = fr(a, b); mb.box(p[0], 0, p[1], l, hh, w, rot, col, o); return p; };
    let k = 0; for (const b of [44, 96]) for (const a of [62, 88, 142, 168]) { const p = box(a, b, 6, 2.5, 4.2, canvas[k++ % 3], { l1: 6, w1: 0.3 }); W.addBox(p[0], p[1], F.u[0], F.u[1], 6, 4.2, 2.4, F_COVER); }
    for (const [a, b, s] of [[104, 40, 1.2], [106, 42.4, 0.9], [126, 96, 1.2], [128, 98, 1.0], [74, 70, 1.1], [156, 70, 1.1], [100, 104, 1]]) { const p = box(a, b, s, s * 0.8, s, olive); W.addBox(p[0], p[1], F.u[0], F.u[1], s, s, s * 0.8, F_COVER | F_LOW); }
    const gen = box(132, 44, 2.4, 1.4, 1.2, C(0xc9a31a)); W.addBox(gen[0], gen[1], F.u[0], F.u[1], 2.4, 1.2, 1.4, F_COVER); this.genPos = gen;
    for (const [a, b] of [[50, 30], [180, 30], [50, 118], [180, 118]]) { const p = fr(a, b); mb.cyl(p[0], 0, p[1], 0.09, 0.06, 7.5, 6, dark, { smooth: true }); mb.box(p[0], 7.5, p[1], 0.9, 0.35, 0.3, rot, dark); W.addCircle(p[0], p[1], 0.14, 30); beacons.push([p[0], 7.4, p[1]]); }
    // desks in the colonnade of the Altes Museum: five networks, quartermaster, mission board
    const defs = [['strom', 72], ['wasser', 86], ['waerme', 100], ['funk', 114], ['bahn', 128], ['stash', 146], ['board', 158]];
    for (const [id, a] of defs) {
      const p = box(a, 126.2, 2.0, 0.85, 0.8, wood), col = NETS[id] ? new THREE.Color(NETS[id].c) : new THREE.Color(id === 'stash' ? 0x9aa0a6 : 0xe6dc3c), sb = fr(a, 128.3);
      mb.box(sb[0], 1.5, sb[1], 1.6, 0.9, 0.08, rot, [col.r, col.g, col.b]); W.addBox(p[0], p[1], F.u[0], F.u[1], 2.0, 0.8, 0.85, F_COVER | F_LOW);
      const u = fr(a, 124.6); this.desks.push({ id, x: u[0], z: u[1], n: NETS[id] ? 'Leitstelle ' + NETS[id].n : id === 'stash' ? 'Quartiermeister' : 'Einsatztafel' });
      const np = fr(a, 127.3); this.friends.push({ x: np[0], z: np[1], yaw: Math.atan2(-F.v[0], -F.v[1]), look: LOOKS.friend });
    }
    // gates on the bridges
    for (const [a, b, ya] of [[6, 0, 1], [300, 0, -1], [20, 150, 1], [150, -160, 0]]) { for (const s of [-1, 1]) { const p = fr(a, b + s * 7.5); mb.box(p[0], 0, p[1], 2.6, 0.9, 0.6, rot + Math.PI / 2, C(0x8d8a84), { w1: 0.26 }); W.addBox(p[0], p[1], F.v[0], F.v[1], 2.6, 0.5, 0.9, F_COVER | F_LOW); const g = fr(a + ya * 2, b + s * 5.5); this.friends.push({ x: g[0], z: g[1], yaw: Math.atan2(-F.u[0] * ya, -F.u[1] * ya), look: LOOKS.friend, gun: 'ar' }); } }
    for (const [a, b] of [[90, 60], [140, 78], [112, 96], [66, 52]]) { const p = fr(a, b); this.friends.push({ x: p[0], z: p[1], yaw: R() * 6.28, look: LOOKS.civ, civ: 1 }); }
    for (const a of [98, 132]) { const p = fr(a, 122); mb.cyl(p[0], 0, p[1], 0.06, 0.05, 8, 6, dark, { smooth: true }); flags.push([p[0], 7.3, p[1], rot]); }
  };

  G.paint = function (s) {
    const fac = this.map.districts[s.d].fac, col = new THREE.Color(); let b = OFF;
    if (s.k === 'safe') { col.set(s.done ? YEL : 0x6a6f76); b = s.done ? OK : AMB; }
    else if (s.k === 'pump' || s.k === 'cache') b = s.done ? OFF : (s.k === 'pump' ? [0.4, 2.2, 4] : [3.4, 2.6, 0.6]);
    else { col.set(s.done ? YEL : fac >= 0 ? FACTIONS[fac].hex : 0x777777); b = s.done ? OK : HOST; }
    if (s.flag >= 0) { this.flagM.setColorAt(s.flag, col); this.flagM.instanceColor.needsUpdate = true; }
    if (s.bea >= 0) { this.beaM.setColorAt(s.bea, col.setRGB(b[0], b[1], b[2])); this.beaM.instanceColor.needsUpdate = true; }
  };
  G.pickTrack = function () {
    const S = this.S; let cur = this.sites.find((s) => s.k === 'mission' && s.def.id === S.track && !s.done && !s.locked);
    if (!cur) { cur = this.sites.filter((s) => s.k === 'mission' && !s.done && !s.locked).sort((a, b) => a.def.lv - b.def.lv)[0]; S.track = cur ? cur.def.id : null; }
    this.wp = cur ? { x: cur.x, z: cur.z, n: cur.n, s: cur } : null;
  };
  G.setWaypoint = function (s) { this.wp = s ? { x: s.x, z: s.z, n: s.n, s } : null; if (s && s.k === 'mission') this.S.track = s.def.id; };

  // ---------------------------------------------------------------- spawning
  G.spawn = function (x, z, spec, home) { const e = new Enemy(this, x, z, spec, home); this.en.push(e); return e; };
  G.group = function (cx, cz, n, lvl, fac, o = {}) {
    const out = [], F = FACTIONS[fac];
    for (let i = 0; i < n; i++) {
      const p = this.world.findWalk(cx, cz, o.r0 ?? 2, o.r1 ?? 13, R, 24); if (!p) continue; if (this.world.district(p[0], p[1]) === 0) continue;
      let arch = o.archs ? o.archs[i % o.archs.length] : R.pick(F.mix), tier = o.tiers ? (o.tiers[i] || 0) : (R() < (o.vet ?? 0.1) ? 1 : 0);
      if (lvl < 3 && arch === 'heavy' && !o.archs) arch = 'rifle'; if (lvl < 2 && arch === 'sniper') arch = 'rifle';
      const e = this.spawn(p[0], p[1], { arch, tier, lvl: SYS.clampLvl(lvl + (tier ? 0 : Math.round(R() - 0.4))), fac, name: o.names && o.names[i], patrol: o.patrol }, o.home || null); if (o.aware) e.alert(0.2 + R(), false); out.push(e);
    }
    return out;
  };
  G.alive = function (home) { let n = 0; for (const e of this.en) if (!e.dead && !e.isRemote && (home === undefined || e.home === home)) n++; return n; };
  G.resetSites = function () { for (const s of this.sites) if (s.active) { s.active = false; s.wave = 0; s.cleared = false; } };

  G.onKill = function (e, info) {
    const S = this.S, P = this.P, T = SYS.TIERS[e.tier], diff = e.lvl - S.lvl;
    S.stats.kills++; this.addXP(22 * Math.pow(1.12, e.lvl - 1) * T.xp * (diff < -4 ? 0.4 : 1));
    this.ui.hitmark(true); this.audio.playAt('die', e.x, e.z, 0.6, 0.9 + R() * 0.2);
    const w = this.curW(); if (SYS.hasPerk(w, 'kill')) this.mags[S.cur] = Math.min(this.magSize(w), this.mags[S.cur] + Math.ceil(this.magSize(w) * 0.2));
    if (R() < 0.42) this.drop(e.x, e.z, 'ammo'); if (R() < 0.1 && S.kits < this.D.kits) this.drop(e.x, e.z, 'kit'); if (R() < 0.35) this.drop(e.x, e.z, 'marken', Math.round((4 + R() * 8) * Math.sqrt(e.lvl) * (1 + e.tier)));
    const ch = [0.1, 0.34, 0.75, 1][e.tier]; if (R() < ch) this.drop(e.x, e.z, 'item', SYS.makeItem(e.lvl, e.tier * 0.07)); if (e.tier === 3) { this.drop(e.x, e.z, 'item', SYS.makeWeapon(e.lvl, 3 + (R() < 0.3 ? 1 : 0))); this.drop(e.x, e.z, 'item', SYS.makeGear(e.lvl, 2 + ((R() * 2) | 0))); }
    void info; void P;
  };
  G.give = function (xp, marken, item) { this.addXP(xp); this.S.marken += marken; if (item) { const P = this.P; this.drop(P.x + Math.sin(this.cam.yaw) * 1.5, P.z + Math.cos(this.cam.yaw) * 1.5, 'item', item); } this.ui.toast(`+${marken} Marken · +${Math.round(xp)} XP`, 'mk'); };
  G.complete = function (s) {
    const S = this.S, lv = this.map.districts[s.d].lv[0], P = this.P; s.done = true; s.active = false; S.sites[s.key] = 1; this.paint(s); this.ui.dirty = true;
    if (s.k === 'power') { if (!S.power.includes(s.d)) S.power.push(s.d); this.world.setPower(s.d, true); this.audio.play('power', 0.8); this.ui.banner('STROM', `The lights are back on in ${this.map.districts[s.d].name}.`, 'net'); this.give(260 * Math.pow(1.13, lv), 60 + lv * 14, SYS.makeItem(lv, 0.1)); }
    else if (s.k === 'cp') { this.audio.play('capture', 0.8); this.ui.banner('KONTROLLPUNKT GESICHERT', s.n.replace('Kontrollpunkt ', ''), 'net'); this.give(220 * Math.pow(1.13, lv), 50 + lv * 12, R() < 0.6 ? SYS.makeItem(lv, 0.08) : null); }
    else if (s.k === 'relay') { S.seen[s.d] = 1; this.audio.play('pulse', 0.7); this.ui.banner('FUNKMAST ONLINE', `Every site in ${this.map.districts[s.d].name} is on your map.`, 'net'); this.give(160 * Math.pow(1.13, lv), 40 + lv * 8); }
    else if (s.k === 'safe') { S.spawn = [s.ux, s.uz]; this.audio.play('capture', 0.7); this.ui.banner('STÜTZPUNKT', s.n, 'net'); this.refill(); this.give(120 * Math.pow(1.13, lv), 30); }
    else if (s.k === 'pump') { S.kits = Math.min(this.D.kits, S.kits + 1); this.audio.play('pump', 0.7); this.ui.toast('Fresh water · +1 med kit', 'kit'); this.addXP(40 * Math.pow(1.13, lv)); }
    else if (s.k === 'cache') { this.audio.play('crate', 0.6); for (let i = 0; i < 2; i++) this.drop(s.x, s.z, 'item', SYS.makeItem(lv, 0.05)); this.drop(s.x, s.z, 'ammo'); this.drop(s.x, s.z, 'marken', 20 + lv * 6); }
    else if (s.k === 'mission') { S.missions[s.def.id] = 1; this.audio.play('mission', 0.9); this.ui.banner('EINSATZ ERFÜLLT', s.n, 'win'); this.give(900 * Math.pow(1.14, s.def.lv), 180 + s.def.lv * 45, SYS.makeWeapon(s.def.lv, 2 + (R() < 0.35 ? 1 : 0))); this.pickTrack(); }
    this.checkDistrict(s.d); this.save(); void P;
  };
  G.refill = function () { const S = this.S; S.kits = this.D.kits; S.nades = 2; for (const c of ['ar', 'smg', 'lmg', 'sg', 'dmr']) if (S.wpn.some((w) => w.cls === c)) S.res[c] = Math.max(S.res[c] || 0, Math.round(this.resMax(c) * (this.D.net.bahn >= 4 ? 1 : 0.7))); this.P.hp = this.D.maxHP; this.P.arm = this.D.maxArmor; this.ui.dirty = true; };
  G.districtState = function (d) { let tot = 0, dn = 0; for (const s of this.sites) if (s.d === d && !s.locked && (s.k === 'cp' || s.k === 'power' || s.k === 'mission' || s.k === 'relay')) { tot++; if (s.done) dn++; } return { tot, dn, lib: !!this.S.sites['lib:' + d] }; };
  G.checkDistrict = function (d) {
    const st = this.districtState(d); if (d === 0 || st.lib || st.dn < st.tot) return; this.S.sites['lib:' + d] = 1; const D = this.map.districts[d];
    this.ui.banner('KIEZ GESICHERT', `${D.name} is free. ${FACTIONS[D.fac].name} are gone from these streets.`, 'win'); this.audio.play('mission', 1); this.give(1400 * Math.pow(1.14, D.lv[1]), 300 + D.lv[1] * 40, SYS.makeItem(D.lv[1], 0.2));
  };
  G.travel = function (s) {
    if (this.combatT > 0 && this.alive() > 0) { this.ui.toast('Not while under fire'); return false; } if (!this.D.travel && s.d !== 0) { this.ui.toast('Restore the BAHN network at the hub to travel'); return false; }
    const P = this.P; this.leaveCover(); P.x = s.ux; P.z = s.uz; this.world.collide(P, 0.34); for (const e of this.en) e.gone = true; this.resetSites(); this.ui.fade(); this.audio.play('travel', 0.7); this.S.spawn = [s.ux, s.uz]; this.save(); return true;
  };
  G.buyNet = function (key) {
    const S = this.S, N = NETS[key], t = S.net[key], def = N.t[t]; if (!def) return false; const pts = SYS.netPoints(S, N.src);
    if (!this.inSafe) { this.ui.toast('Networks are switched at the hub on Museumsinsel'); return false; } if (pts < def[0]) { this.ui.toast(`Needs ${def[0]} ${N.unit}`); return false; } if (S.marken < def[1]) { this.ui.toast('Not enough Marken'); return false; }
    S.marken -= def[1]; S.net[key]++; this.recalc(); S.kits = Math.max(S.kits, Math.min(this.D.kits, S.kits + 1)); this.audio.play('power', 0.8); this.ui.banner(N.n + ' · ' + def[2], def[3], 'net'); this.ui.dirty = true; this.save(); return true;
  };

  // ---------------------------------------------------------------- per-frame
  G.updOps = function (dt) {
    const P = this.P, W = this.world, S = this.S, map = this.map; this.pathN = 2;
    const pd = W.district(P.x, P.z); this.inSafe = pd === 0;
    if (pd !== this.lastD) { const D = map.districts[pd], st = this.districtState(pd); if (this.lastD >= 0) this.ui.banner(D.name.toUpperCase(), pd === 0 ? 'Die Insel · safe ground' : st.lib ? 'Secured' : `${FACTIONS[D.fac].name} · level ${D.lv[0]}–${D.lv[1]}`, pd === 0 || st.lib ? 'net' : 'warn'); this.lastD = pd; this.loc.dist = D; if (pd !== 0 && !S.seen['v' + pd]) { S.seen['v' + pd] = 1; } }
    this.locT -= dt; if (this.locT <= 0) { this.locT = 0.6; this.loc.street = W.street(P.x, P.z); }
    if (this.pulseT > 0) this.pulseT -= dt;
    // friends: only pose the ones nearby
    for (const f of this.friends) {
      const d = hyp(f.x - P.x, f.z - P.z); if (d < 110 && !f.rig) { f.rig = new Rig(this.gfx, f.civ ? LOOKS.civ : LOOKS.friend, f.civ ? null : (f.gun || 'ar')); f.rig.root.position.set(f.x, 0, f.z); f.rig.root.rotation.y = f.yaw; this.scene.add(f.rig.root); }
      if (f.rig) { f.rig.root.visible = d < 130; if (d < 70) { f.rig.pose({ speed: 0, aim: 0 }, dt); } }
    }
    // sites
    this.siteT -= dt;
    if (this.siteT <= 0 && !this.noPve) {
      this.siteT = 0.3; const lib = !!S.sites['lib:' + pd];
      for (const s of this.sites) {
        if (s.locked) continue;
        if (s.done || s.d === 0 || s.k === 'pump' || s.k === 'cache' || s.k === 'hub') continue; const d = hyp(s.x - P.x, s.z - P.z), D = map.districts[s.d], lv = s.k === 'mission' ? s.def.lv : D.lv[0] + R() * (D.lv[1] - D.lv[0]), fac = s.k === 'mission' ? s.def.fac : D.fac;
        if (!s.active) {
          if (d < (s.k === 'mission' ? 70 : 85) && !P.dead && this.en.length < this.cap + 4) {
            s.active = true; s.wave = 0; s.cleared = false;
            if (s.k === 'cp') this.group(s.x, s.z, 5 + (lv > 6 ? 1 : 0), lv, fac, { home: s, r0: 1.5, r1: 9, tiers: [1] });
            else if (s.k === 'power') this.group(s.x, s.z, 4 + (lv > 5 ? 1 : 0), lv, fac, { home: s, r0: 2, r1: 11 });
            else if (s.k === 'relay') this.group(s.x, s.z, 3, lv, fac, { home: s, r0: 2, r1: 9 });
            else if (s.k === 'safe') { if (!S.sites['lib:' + s.d]) this.group(s.x, s.z, 3, lv, fac, { home: s, r0: 3, r1: 12 }); }
            else if (s.k === 'mission') { this.group(s.x, s.z, 6, lv, fac, { home: s, r0: 3, r1: 20, vet: 0.2 }); this.ui.banner('EINSATZ · ' + s.n.toUpperCase(), s.def.loc + ' · level ' + s.def.lv, 'warn'); this.audio.play('alarm', 0.6); }
          }
        } else {
          const al = this.alive(s);
          if (d > 175 && this.combatT <= 0) { s.active = false; for (const e of this.en) if (e.home === s) e.gone = true; continue; }
          if (al > 0) continue;
          if (s.k === 'cp') { if (s.wave === 0) { s.wave = 1; this.group(s.x, s.z, 4, lv, fac, { home: s, r0: 34, r1: 52, aware: true, vet: 0.25 }); this.ui.toast('Reinforcements inbound', 'warn'); this.audio.play('alarm', 0.5); } else this.complete(s); }
          else if (s.k === 'mission') {
            if (s.wave === 0) { s.wave = 1; this.group(s.x, s.z, 6, lv, fac, { home: s, r0: 30, r1: 48, aware: true, tiers: [2, 1] }); this.ui.toast('Second wave', 'warn'); this.audio.play('alarm', 0.5); }
            else if (s.wave === 1) { s.wave = 2; this.group(s.x, s.z, 5, lv, fac, { home: s, r0: 26, r1: 44, aware: true, tiers: [3, 1], archs: ['heavy', 'rifle', 'rush', 'gren', 'rifle'], names: [s.def.boss] }); this.ui.banner(s.def.boss.toUpperCase(), FACTIONS[fac].name, 'bad'); this.audio.play('boss', 0.8); }
            else this.complete(s);
          } else if (!s.cleared) { s.cleared = true; if (s.k !== 'safe') this.ui.toast(s.n + ' is clear', 'ok'); }
        }
      }
      // roaming patrols in hostile districts
      this.patT -= 0.3;
      if (this.patT <= 0 && pd !== 0 && !lib && !P.dead && !this.noPatrol && this.alive() < this.cap - 5) {
        this.patT = 14 + R() * 16; const D = map.districts[pd], a = this.cam.yaw + (R() - 0.5) * 2.4, dd = 62 + R() * 26, x = P.x + Math.sin(a) * dd, z = P.z + Math.cos(a) * dd, p = W.findWalk(x, z, 0, 14, R, 16);
        if (p && W.district(p[0], p[1]) === pd && !W.los(p[0], 1.6, p[1], P.x, 1.6, P.z)) this.group(p[0], p[1], 3 + ((R() * 2) | 0), D.lv[0] + R() * (D.lv[1] - D.lv[0]), D.fac, { r0: 0, r1: 5, patrol: [P.x + (R() - 0.5) * 30, P.z + (R() - 0.5) * 30] });
      } else if (this.patT <= 0) this.patT = 6;
    }
    // interaction prompt
    let best = null, bd = 3.3 * 3.3, kind = null;
    if (!P.dead && !this.noPve) {
      for (const s of this.sites) { if (s.done || s.locked || !USE[s.k]) continue; const d2 = (s.ux - P.x) ** 2 + (s.uz - P.z) ** 2; if (d2 < bd) { bd = d2; best = s; kind = 'site'; } }
      for (const k of this.desks) { const d2 = (k.x - P.x) ** 2 + (k.z - P.z) ** 2; if (d2 < bd) { bd = d2; best = k; kind = 'desk'; } }
    }
    if (!best) { this.prompt = null; this.useT = 0; }
    else if (kind === 'desk') { this.prompt = { text: best.n, sub: best.id === 'stash' ? 'Gear and weapons' : best.id === 'board' ? 'Missions' : NETS[best.id].d, prog: 0 }; if (this.inp.was('use')) this.ui.open(best.id === 'stash' ? 'inv' : best.id === 'board' ? 'ops' : 'net'); }
    else {
      const s = best, U = USE[s.k], blocked = s.d !== 0 && (s.k === 'power' || s.k === 'relay' || s.k === 'safe') && s.active && this.alive(s) > 0;
      this.prompt = { text: U[0], sub: blocked ? 'Clear the hostiles first' : s.n, prog: this.useT / U[1], bad: blocked };
      if (this.inp.use && !blocked) { this.useT += dt; if (this.useT >= U[1]) { this.useT = 0; this.complete(s); } } else this.useT = Math.max(0, this.useT - dt * 2);
    }
    this.inp.was('use');
  };
}
