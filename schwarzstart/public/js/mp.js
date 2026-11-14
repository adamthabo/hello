// SCHWARZSTART · real multiplayer and the game modes.
// The Cloudflare build runs a Worker with one Durable Object per match room (server/worker.js). The server owns every
// player's health, armour, kills, scores, respawns and match phases and streams snapshots at 15 Hz. Each client draws the
// other players, shoots at them where it sees them, and asks the server to apply the damage ("favour the shooter").
// Modes: Frei (your campaign city with friends in it), Duell 1v1, Kiezkampf 4v4 and 4v4v4, Sperrzone (everyone against
// everyone plus elite Garde units, contaminated loot, drone extraction, rogue status) and Kaltstart (survival).
import * as THREE from 'three';
import { Rig } from './rig.js';
import { WPN, SLOTS as GEAR, makeWeapon, makeGear, newSave } from './systems.js';
import { clamp, damp, dampAng, hyp, el, store, rng, IS_TOUCH } from './util.js';

export const MODES = {
  frei: { name: 'Frei', tag: 'Koop', sub: 'Your campaign, with your friends in the same Berlin', online: true,
    about: 'Your own campaign, saved as usual, with your friends walking the same streets. Everyone fights their own enemies; you see each other, your shots and your positions on the map.' },
  duell: { name: 'Duell', tag: '1 gegen 1', sub: 'Nikolaiviertel · first to 7 kills', online: true, pvp: true, teams: 2, arena: { c: [858, -70], r: 62 },
    about: 'One against one in the lanes around the Nikolaikirche. Same rifle, same armour, same health for both. First to seven kills, six minutes on the clock.' },
  kiez: { name: 'Kiezkampf', tag: '4 gegen 4', sub: 'Hackescher Markt · first team to 40', online: true, pvp: true, teams: 2, arena: { c: [540, -610], r: 108 },
    about: 'Two teams of four around Hackescher Markt and the S-Bahn arches. First team to forty kills, ten minutes on the clock. Your team shows on the map.' },
  kiez3: { name: 'Kiezkampf', tag: '4 · 4 · 4', sub: 'Three teams · first to 40', online: true, pvp: true, teams: 3, arena: { c: [540, -610], r: 128 },
    about: 'Three teams of four. Blau, Rot and Gelb fight over the same blocks around Hackescher Markt. First team to forty kills.' },
  zone: { name: 'Sperrzone', tag: 'PvPvE', sub: 'Tiergarten to Potsdamer Platz · loot, extract, trust no one', online: true, pvp: true, zone: true,
    about: 'The government quarter, walled off since the blackout. Elite Garde units guard the loot. Whatever you find is contaminated and only counts once a drone lifts it out. Everyone in here can shoot you. Shoot someone who has not shot you and you go rogue.' },
  kalt: { name: 'Kaltstart', tag: 'Survival', sub: 'One life in the blizzard · get a signal out', survival: true, online: true,
    about: 'The worst night of the winter. One pistol, one med kit, no heat. Fire barrels and the hub keep you warm; depots hold food, blankets and ammunition. One depot holds the fuse for the Fernsehturm transmitter. One life.' },
};
export const TEAM = [{ n: 'Blau', c: '#3aa0ff' }, { n: 'Rot', c: '#ff5a3c' }, { n: 'Gelb', c: '#e6dc3c' }];
const ZONE = [-1500, -950, -545, 1180], POOL = 250, PVP = 0.7;
const V1 = new THREE.Vector3(), V2 = new THREE.Vector3();

export const cleanRoom = (r) => String(r || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24) || 'offen';
export function readMode() { const [id, room] = decodeURIComponent((location.hash || '').slice(1)).split('/'); return MODES[id] ? { id, room: cleanRoom(room) } : null; }
export function enterMode(id, room) { location.hash = id ? id + '/' + cleanRoom(room) : ''; location.reload(); }
let probe = null;
export function probeServer() { return probe || (probe = fetch('server.json', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((j) => !!(j && j.server)).catch(() => false)); }
const fmtT = (s) => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// title-screen menu: the campaign plus every mode, a room code your friends type in, and your name
export function renderModes(cur, online, room, name) {
  const card = (id, n, tag, sub, off) => `<button class="mcard${(cur || '') === id ? ' on' : ''}" data-mode="${id}"${off ? ' disabled' : ''}><b>${n}</b><em>${tag}</em><span>${sub}</span></button>`;
  let h = card('', 'Kampagne', 'Solo', 'Take Berlin back one Kiez at a time', false);
  for (const [id, m] of Object.entries(MODES)) h += card(id, m.name, m.tag, m.sub, m.online && !online && !m.survival);
  el('mgrid').innerHTML = h; el('mRoom').value = room || 'offen'; el('mName').value = name || '';
  el('mNote').textContent = online ? 'Same room code, same match. Send your friends the invite link from the menu once you are in.' : 'Online modes run on the Cloudflare version of the game. Kaltstart works here solo.';
  el('modes').classList.remove('hidden');
}

export class MP {
  constructor(G, ui, mode) {
    this.G = G; this.ui = ui; this.id = mode.id; this.def = MODES[mode.id]; this.room = mode.room;
    const st = store.get('mp', null) || {}; this.name = String(st.name || G.S.tag || '').trim().slice(0, 16) || 'Lotse';
    this.remote = new Map(); this.pend = new Map(); this.me = 0; this.team = 0; this.m = null; this.lastPh = null; this.online = false; this.status = this.def.online ? 'connecting' : 'solo';
    this.kills = 0; this.deaths = 0; this.rogue = 0; this.feed = []; this.pv = 0; this.sendT = 0; this.lookT = 0; this.lookKey = ''; this.t = 0;
    this.canRespawn = false; this.useT = 0; this.kitCd = 0; this.deadAt = -99; this.spawnAt = -99; this.board = false;
    this.bag = []; this.heat = 100; this.food = 80; this.cloth = 0; this.fuse = false; this.searched = 0; this.over = false; this.t0 = 0; this.roamT = 30;
  }
  get pvp() { return !!this.def.pvp; }
  get serverDeath() { return this.pvp && this.online; }
  // ------------------------------------------------------------------ rules for this mode, before the first frame
  setup() {
    const G = this.G, W = G.world, P = G.P, d = this.def, gx = G.gfx, w = gx.weather, S = G.S; G.mode = this;
    if (this.id === 'frei') return;
    document.body.classList.add('inmode'); G.noSave = true; G.diff = 1; G.diffHp = 1; if (d.pvp) G.noRegen = true;
    if (d.arena) {
      const c = d.arena.c, r = d.arena.r; W.core = [c[0] - r - 6, c[1] - r - 6, c[0] + r + 6, c[1] + r + 6]; W.coreMargin = [2, 2, 2, 2];
      G.noPve = true; G.noPatrol = true; for (const s of G.sites) s.locked = true;
      const lv = Math.max(5, S.lvl); S.wpn = [makeWeapon(lv, 2, 'ar'), makeWeapon(lv, 2, 'smg'), makeWeapon(lv, 2, 'pst')]; for (const it of S.wpn) { it.q = 1; delete it.perk; delete it.perk2; }
      S.cur = 0; S.res = { ar: 9999, smg: 9999, lmg: 9999, sg: 9999, dmr: 9999 }; S.kits = 3; S.nades = 2; G.mags = S.wpn.map((it) => G.magSize(it)); P.rig.setGun('ar');
      gx.time = 13.4; gx.timeScale = 0; w.snow = w.tSnow = 0.2; w.fog = w.tFog = 0.08; w.timer = 1e9;
      this.ring = this._ring(c, r);
    } else if (d.zone) {
      W.core = ZONE.slice(); W.coreMargin = [32, 32, 2.5, 32]; G.noPatrol = true; this.pool0 = Math.max(60, G.D.maxHP + G.D.maxArmor);
      gx.time = 15.3; w.fog = w.tFog = 0.42; w.snow = w.tSnow = 0.35; w.timer = 1e9;
      const pz = (n) => (G.map.plazaNames || []).find((q) => q.n === n), R = rng(77);
      this.extr = ['Platz des 18. März', 'Potsdamer Platz'].map(pz).filter(Boolean).map((q) => ({ x: q.p[0], z: q.p[1], n: q.n, call: 0, here: 0 }));
      this.camps = ['Platz vor dem Reichstag', 'Pariser Platz', 'Leipziger Platz'].map(pz).filter(Boolean).map((q) => ({ x: q.p[0], z: q.p[1], t: 0 }));
      for (let i = 0; this.camps.length < 8 && i < 400; i++) { const x = ZONE[0] + 90 + R() * (ZONE[2] - ZONE[0] - 180), z = ZONE[1] + 90 + R() * (ZONE[3] - ZONE[1] - 180); if (W.walkable(x, z) && !this.camps.some((q) => hyp(q.x - x, q.z - z) < 170) && !this.extr.some((q) => hyp(q.x - x, q.z - z) < 90)) this.camps.push({ x, z, t: 0 }); }
      this.gate = W.findWalk(-585, -250, 0, 60, R, 300) || W.findWalk(-700, -100, 0, 120, R, 300) || [-600, -310];
      this.drone = this._drone();
      for (const e of this.extr) {         // a flare column marks each drone point; it burns brighter once a drone is on its way
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.9, 70, 10, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 0.7, 0.25), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
        m.position.set(e.x, 35, e.z); m.renderOrder = 21; G.scene.add(m); e.beam = m;
      }
    } else if (d.survival) {
      const R = rng((Date.now() / 1000) | 0), lv = 6; S.lvl = lv; S.gear = {}; for (const k of Object.keys(GEAR)) S.gear[k] = makeGear(lv, 0, k);
      S.wpn = [makeWeapon(lv, 0, 'pst')]; S.cur = 0; S.res = { ar: 0, smg: 0, lmg: 0, sg: 0, dmr: 0 }; S.kits = 1; S.nades = 0; S.inv = [];
      G.recalc(); G.mags = S.wpn.map((it) => G.magSize(it)); P.rig.setGun('pst');
      gx.time = 17.4; w.snow = w.tSnow = 1; w.fog = w.tFog = 0.55; w.cloud = w.tCloud = 1; w.timer = 1e9;
      this.stash = []; for (let i = 0; this.stash.length < 46 && i < 6000; i++) { const b = G.map.builds[(R() * G.map.builds.length) | 0], [x1, z1, x2, z2] = b, L = hyp(x2 - x1, z2 - z1); if (L < 6) continue; const t = 0.2 + R() * 0.6, sd = R() < 0.5 ? 1 : -1, x = x1 + (x2 - x1) * t + ((z2 - z1) / L) * 1.4 * sd, z = z1 + (z2 - z1) * t - ((x2 - x1) / L) * 1.4 * sd; if (W.walkable(x, z) && !this.stash.some((q) => hyp(q.x - x, q.z - z) < 48)) this.stash.push({ x, z, open: false, a: Math.atan2(x2 - x1, z2 - z1) }); }
      this.fuseAt = 5 + ((R() * 4) | 0); const tw = G.map.landmarks.find((q) => q.id === 'turm'); this.tower = (tw && W.findWalk(tw.c[0], tw.c[1], 16, 44, R, 200)) || [930, -390];
      // start somewhere quiet: districts 1-4, well away from any hostile site still waiting to be taken
      const hot = G.sites.filter((s) => !s.done && !s.locked && s.d !== 0 && ['cp', 'power', 'relay', 'mission', 'safe'].includes(s.k)), c = W.core; this.home = null;
      for (let i = 0; i < 4000 && !this.home; i++) { const x = c[0] + R() * (c[2] - c[0]), z = c[1] + R() * (c[3] - c[1]), dd = W.district(x, z); if (dd < 1 || dd > 4 || !W.walkable(x, z) || !W.walkable(x + 1.5, z) || !W.walkable(x, z + 1.5)) continue; if (hot.some((s) => hyp(s.x - x, s.z - z) < 120 - Math.min(40, i / 60))) continue; this.home = [x, z]; }
      this.home = this.home || [G.map.hub[0], G.map.hub[1]]; G.cap = 8;
      this.crates = this._crates();
    }
    if (d.pvp) { G.D.maxHP = 100; G.D.maxArmor = 150; P.hp = 100; P.arm = 150; } else { P.hp = G.D.maxHP; P.arm = G.D.maxArmor; }
    const s = this.spawnPoint(); P.x = s[0]; P.z = s[1]; G.wp = null;
  }
  spawnPoint() {
    const G = this.G, W = G.world, d = this.def, R = Math.random;
    if (d.arena) {
      const c = d.arena.c, r = d.arena.r, T = d.teams || 2, a = (this.team / T) * Math.PI * 2 + 0.6, bx = c[0] + Math.sin(a) * r * 0.72, bz = c[1] + Math.cos(a) * r * 0.72;
      const ok = (p) => p && hyp(p[0] - c[0], p[1] - c[1]) < r - 3;
      for (const [rr, n] of [[16, 80], [34, 120], [r * 0.8, 200]]) { const p = W.findWalk(bx, bz, 0, rr, R, n); if (ok(p)) return p; }
      return W.findWalk(c[0], c[1], 0, r * 0.7, R, 200) || [c[0], c[1]];
    }
    if (d.zone) return W.findWalk(this.gate[0], this.gate[1], 0, 14, R, 60) || this.gate;
    if (d.survival) return this.home;
    return [G.P.x, G.P.z];
  }
  _spawnHere() {
    const G = this.G, P = G.P, s = this.spawnPoint(); G.leaveCover(); Object.assign(P, { x: s[0], z: s[1], dead: 0, roll: 0, vault: 0, dash: null, st: 'free', lastHit: -99, relT: 0 });
    if (this.pvp) { P.hp = 100; P.arm = 150; G.S.kits = 3; G.mags = G.S.wpn.map((w) => G.magSize(w)); } else { P.hp = G.D.maxHP; P.arm = G.D.maxArmor; }
    if (this.def.arena) { const c = this.def.arena.c; G.cam.yaw = P.yaw = Math.atan2(c[0] - P.x, c[1] - P.z); }
    G.combatT = 0; this.spawnAt = this.t; this.ui.fade(); this.ui.dirty = true;
  }
  _ring(c, r) {
    const g = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 26, 128, 1, true), new THREE.MeshBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false, fog: false }));
    g.position.set(c[0], 13, c[1]); g.renderOrder = 20; this.G.scene.add(g); return g;
  }
  _drone() {
    const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0x2b3036, roughness: 0.5, metalness: 0.5 }), lit = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.6, 0.3) });
    g.add(new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 2.2), m)); for (const [x, z] of [[1.7, 1.7], [-1.7, 1.7], [1.7, -1.7], [-1.7, -1.7]]) { const a = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 1.8), m); a.position.set(x / 2, 0.1, z / 2); a.rotation.y = Math.atan2(x, z); g.add(a); const r = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.04, 20), new THREE.MeshBasicMaterial({ color: 0x0c0d0e, transparent: true, opacity: 0.35, depthWrite: false })); r.position.set(x, 0.32, z); g.add(r); }
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), lit); led.position.y = -0.36; g.add(led); const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 7.5, 5), m); rope.position.y = -4.1; g.add(rope);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 6, 12), m); hook.position.y = -7.9; g.add(hook); g.visible = false; this.G.scene.add(g); return g;
  }
  _crates() {
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1.0, 0.62, 0.62), new THREE.MeshStandardMaterial({ color: 0x4d5a3a, roughness: 0.85, emissive: 0x1d2a0c, emissiveIntensity: 0.6 }), this.stash.length), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
    this.stash.forEach((s, i) => { M.compose(V1.set(s.x, 0.31, s.z), Q.setFromAxisAngle(Y, s.a), one); im.setMatrixAt(i, M); }); im.castShadow = true; this.G.scene.add(im); return im;
  }
  // ------------------------------------------------------------------ connection
  async start() {
    if (!this.def.online) return false;
    if (!(await probeServer())) { this.status = this.def.survival ? 'solo' : 'offline'; this.canRespawn = true; return false; }
    const url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws?mode=' + this.id + '&room=' + encodeURIComponent(this.room);
    const go = () => {
      const ws = new WebSocket(url); this.ws = ws; this.status = 'connecting';
      ws.onopen = () => { this.online = true; this.status = 'online'; const L = this.G.playerLook(); this.lookKey = JSON.stringify(L); ws.send(JSON.stringify({ t: 'hi', n: this.name, o: L.outfit, p: L.pal })); };
      ws.onmessage = (ev) => { try { this.onMsg(JSON.parse(ev.data)); } catch (e) { console.warn('mp', e); } };
      ws.onclose = (ev) => { if (this.ws !== ws) return; this.online = false; if (ev.code === 4000) { this.status = 'full'; return; } this.status = 'reconnecting'; setTimeout(go, 2000); };
    };
    go(); return true;
  }
  sendj(m) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(m)); }
  onMsg(m) {
    const G = this.G, P = G.P;
    if (m.t === 'w') {
      this.me = m.id; this.team = m.team; this.m = m.m; this.lastPh = m.m.ph; for (const id of [...this.remote.keys()]) this._drop(id); for (const q of m.pl) this._add(q);
      if (P.dead) this.canRespawn = true; else if (this.def.arena) this._spawnHere();
      this.ui.toast(`${this.def.name} · Raum „${this.room}“ · ${m.pl.length + 1} online`, 'ok');
    } else if (m.t === 'j') { this._add(m); this.ui.toast(m.n + ' ist da', 'ok'); }
    else if (m.t === 'l') { const q = this.remote.get(m.id); if (q) this.ui.toast(q.n + ' ist weg'); this._drop(m.id); }
    else if (m.t === 'lk') { const q = this.remote.get(m.id); if (q) q.rig.setOutfit(m.o, { ...(m.p || {}) }); }
    else if (m.t === 'S') {
      this.m = m.m; const now = performance.now();
      for (const a of m.p) {
        const [id, x, z, y, s, f, g, hp, ar, team, dead, kills, deaths, rogue, pt, prot] = a;
        if (id === this.me) {
          this.team = team; this.kills = kills; this.deaths = deaths; this.rogue = rogue; this.prot = prot;
          if (this.pvp && !P.dead && !dead) { if (G.t - P.lastHit < 0.5) { P.hp = Math.min(P.hp, hp); P.arm = Math.min(P.arm, ar); } else { P.hp = hp; P.arm = ar; } }
          continue;
        }
        const q = this.remote.get(id); if (!q) continue;
        if (q.at) { const dt = Math.max(0.03, (now - q.at) / 1000); q.vx = clamp((x - q.tx) / dt, -9, 9); q.vz = clamp((z - q.tz) / dt, -9, 9); }
        q.at = now; if (!q.seen || hyp(x - q.x, z - q.z) > 30) { q.x = x; q.z = z; q.y = y; q.vx = q.vz = 0; } q.seen = true;
        Object.assign(q, { tx: x, tz: z, ty: y, s, f, g, hp, ar, team, dead, kills, deaths, rogue, pt, prot });
      }
    } else if (m.t === 'd') {
      if (m.by) { P.lastHit = G.t; G.combatT = 8; const brk = P.arm > 0 && m.ar <= 0; G.ui.hurt(Math.atan2((m.x ?? P.x) - P.x, (m.z ?? P.z) - P.z) - G.cam.yaw, brk); G.audio.play(m.ar > 0 ? 'hitArm' : 'hitBody', 0.5); if (brk) G.audio.play('armBreak', 0.6); G.cam.shake = Math.min(0.5, G.cam.shake + 0.12); if (G.haptics && IS_TOUCH && navigator.vibrate) { try { navigator.vibrate(m.d > 12 ? 40 : 18); } catch (e) { } } }
      if (!P.dead) { P.hp = m.hp; P.arm = m.ar; } if (m.kits !== undefined) G.S.kits = m.kits; this.ui.dirty = true;
    } else if (m.t === 'x') {
      const nm = (id) => (id === this.me ? this.name : this.remote.get(id)?.n || 'Lotse'), k = m.k ? nm(m.k) : 'die Sperrzone', v = nm(m.v);
      this.feed.unshift({ k, v, hd: m.hd, t: 7, me: m.k === this.me || m.v === this.me }); if (this.feed.length > 5) this.feed.length = 5;
      const r = this.remote.get(m.v); if (r) { r.dead = 1; G.audio.playAt('die', r.x, r.z, 0.6); }
      if (m.k === this.me && m.v !== this.me) { G.ui.hitmark(true); G.audio.play('die', 0.5); G.ui.banner(m.hd ? 'KOPFTREFFER' : 'AUSGESCHALTET', v, 'warn'); }
      if (m.v === this.me) {
        this.deadAt = this.t; this.canRespawn = false; if (!P.dead) { P.hp = 0; P.arm = 0; P.dead = 0.001; G.leaveCover(); P.roll = 0; G.audio.play('down', 0.7); }
        G.ui.banner('KAMPFUNFÄHIG', m.k ? 'Ausgeschaltet von ' + k : 'The Sperrzone got you', 'bad');
        if (this.def.zone && this.bag.length) { this.ui.toast(this.bag.length + ' contaminated items lost', 'bad'); this.bag = []; }
      }
    } else if (m.t === 'r') { this.team = m.team; this.canRespawn = true; if (P.dead) P.dead = Math.max(P.dead, 3.5); else if (this.t - this.spawnAt > 1.5) { this.canRespawn = false; this._spawnHere(); } }
    else if (m.t === 'm') {
      this.m = m.m; if (m.teams) { const mine = m.teams.find((q) => q[0] === this.me); if (mine) this.team = mine[1]; }
      if (m.go) { G.ui.banner(this.def.name.toUpperCase() + ' · LOS', (this.def.teams === 3 ? 'Drei Teams · ' : '') + 'first to ' + m.m.goal, 'net'); G.audio.play('mission', 0.6); if (!P.dead) this._spawnHere(); }
    } else if (m.t === 'ev' && this.def.zone) { const e = this.extr[m.i], who = this.remote.get(m.id)?.n || 'Jemand'; if (m.k === 'drone' && e && e.call <= 0 && e.here <= 0) { e.call = 45; G.ui.banner('DROHNE GERUFEN', who + ' · ' + e.n, 'warn'); } }
    else if (m.t === 'e' && m.msg === 'full') G.ui.banner('VOLL', 'This match is full. Pick another room code.', 'bad');
  }
  _add(q) {
    if (this.remote.has(q.id)) return; const G = this.G, rig = new Rig(G.gfx, { outfit: q.o, pal: { ...(q.p || {}) } }, 'ar'); rig.root.visible = false; G.scene.add(rig.root);
    const label = document.createElement('div'); label.className = 'peer'; label.style.display = 'none'; el('hud').appendChild(label);
    this.remote.set(q.id, { id: q.id, n: String(q.n || 'Lotse'), team: q.team | 0, rig, label, x: 0, z: 0, y: 0, tx: 0, tz: 0, ty: 0, vx: 0, vz: 0, at: 0, seen: false, s: 0, f: 0, g: 'ar', hp: 100, ar: 150, dead: 0, kills: 0, deaths: 0, rogue: 0, pt: 0, prot: 0, proxy: null, los: false, losT: Math.random() * 0.3, fa: 0.95, pp: {}, key: '' });
  }
  _drop(id) { const r = this.remote.get(id); if (!r) return; if (r.proxy) { const i = this.G.en.indexOf(r.proxy); if (i >= 0) this.G.en.splice(i, 1); } this.G.scene.remove(r.rig.root); r.rig.dispose(); r.label.remove(); this.remote.delete(id); }
  hostile(r) { if (!this.pvp) return false; if (this.def.teams) return r.team !== this.team; return true; }
  // a remote player as a target: the player's weapons, turret and grenades treat it like any enemy
  _proxy(r) {
    const mp = this;
    return {
      isRemote: true, r, rig: r.rig, boss: false, tier: 0, fac: 0, mark: 0, aware: false, home: null, lvl: 0,
      get x() { return r.x; }, get z() { return r.z; }, get dead() { return !!r.dead; }, get name() { return r.n; },
      get gone() { return false; }, set gone(v) { }, get despawn() { return false; }, set despawn(v) { },
      get hp() { return r.hp; }, get maxHp() { return 100; }, get arm() { return r.ar; }, get maxArm() { return 150; },
      get firing() { return !!(r.f & 4); }, get noLock() { return !!(mp.def.zone && !r.rogue); },
      update(dt) { if (this.mark > 0) { this.mark -= dt; if (this.mark <= 0) r.rig.setHighlight(false); } }, alert() { }, setHighlight() { },
      aimY() { return r.f & 2 ? 0.72 : 1.2; }, headY() { return r.f & 2 ? 0.98 : 1.62; },
      rayHit(ox, oy, oz, dx, dy, dz) {
        const rr = 0.37, hh = r.f & 2 ? 1.12 : r.f & 8 ? 0.95 : 1.8, a = dx * dx + dz * dz; if (a < 1e-8 || !r.seen) return null;
        const fx = r.x - ox, fz = r.z - oz, tm = (fx * dx + fz * dz) / a, cx = ox + dx * tm - r.x, cz = oz + dz * tm - r.z, d2 = cx * cx + cz * cz; if (d2 > rr * rr || tm < 0) return null;
        const t = tm - Math.sqrt((rr * rr - d2) / a), y = oy + dy * Math.max(t, 0), ym = oy + dy * tm; if ((y < -0.05 || y > hh + 0.06) && (ym < -0.05 || ym > hh + 0.06)) return null;
        return { t: Math.max(0.01, t), head: Math.max(y, ym) > hh - 0.34 && Math.min(y, ym) < hh + 0.1 };
      },
      damage(amt, info = {}) { mp._hitRemote(r, info); },
    };
  }
  // PvP damage is normalised: base weapon damage, no gear, no crits, the same 100 health + 150 armour for everyone
  _hitRemote(r, info) {
    const G = this.G, P = G.P; let d;
    if (info.turret) d = 5; else if (info.expl) d = 75;
    else { const W = WPN[G.curW().cls], dist = hyp(r.x - P.x, r.z - P.z), fall = dist > W.range ? clamp(1 - (dist - W.range) / (W.range * 0.7), 0.25, 1) : 1; d = W.dmg * PVP * fall * (info.head ? W.hs || 1.6 : 1); }
    const q = this.pend.get(r.id) || { d: 0, hd: 0 }; q.d += d; q.hd |= info.head ? 1 : 0; this.pend.set(r.id, q); r.rig.hit = 1;
    const x = info.x ?? r.x, y = info.y ?? 1.2, z = info.z ?? r.z, live = this.online && !r.prot && !(this.def.teams && this.m && this.m.ph !== 'live');
    if (live) { G.ui.dmg(x, y + 0.25, z, d, info.head, false, r.ar > 0); G.fx.puff(x, y, z, 3, r.ar > 0 ? [0.5, 0.6, 0.7] : [0.36, 0.3, 0.28], 0.07, 1.5, 0.3, 0.6, -3, 0.4); }
    else G.fx.puff(x, y, z, 4, [0.4, 1.6, 2.4], 0.06, 1.2, 0.25, -1, 0, 0.3);
  }
  _flushHits() { if (!this.pend.size) return; if (this.online) for (const [id, q] of this.pend) this.sendj({ t: 'h', to: id, d: Math.round(Math.min(130, q.d) * 10) / 10, hd: q.hd }); this.pend.clear(); }
  // ------------------------------------------------------------------ hooks called by the game
  respawn() {
    if (this.id === 'frei') return false;
    if (this.def.survival) return true;
    if (this.online && !this.canRespawn) return true;
    this.canRespawn = false; this._spawnHere(); return true;
  }
  kit() {
    if (!this.pvp || !this.online) return false; const G = this.G, P = G.P;
    if (G.S.kits <= 0) { this.ui.toast('No med kits'); return true; } if (this.kitCd > 0) { this.ui.toast('Med kit in ' + Math.ceil(this.kitCd) + ' s'); return true; } if (P.hp >= 100 && P.arm >= 150) return true;
    this.sendj({ t: 'k' }); this.kitCd = 8; G.S.kits--; P.kitT = 1.2; G.audio.play('kit', 0.6); G.fx.puff(P.x, 1.1, P.z, 10, [0.5, 2.2, 1.2], 0.1, 1.2, 0.6, -0.8, 1, 0.5); this.ui.dirty = true; return true;
  }
  pve(dmg) { if (!(this.def.zone && this.online)) return dmg; const d = (dmg * POOL) / this.pool0; this.pv += d; return d; }
  onDeath() { if (this.def.survival && !this.over) { this._end(false); return true; } return false; }
  take(l) {
    if (!this.def.zone || l.kind !== 'item') return undefined;
    if (this.bag.length >= 6) { if (this.t - (this.fullT || -9) > 3) { this.fullT = this.t; this.ui.toast('Contaminated bag full · extract first'); } return false; }
    this.bag.push(l.data); this.ui.toast('Kontaminiert · ' + l.data.n + ' (' + this.bag.length + '/6)', 'warn'); this.G.audio.play('loot', 0.45); return true;
  }
  leave() { enterMode('', ''); }
  invite() {
    const url = location.origin + location.pathname + '#' + this.id + '/' + this.room, txt = `SCHWARZSTART · ${this.def.name} · Raum ${this.room}`;
    if (navigator.share) navigator.share({ title: txt, url }).catch(() => { }); else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => this.ui.toast('Invite link copied', 'ok')).catch(() => this.ui.toast(url));
    else this.ui.toast(url);
  }
  menuHtml() {
    const st = this.status === 'online' ? `${this.remote.size + 1} online` : this.status === 'offline' ? 'no server here' : this.status;
    return `<div class="sec">${esc(this.def.name)} · Raum „${esc(this.room)}“</div><p class="note">${esc(this.def.about)}</p>
      <div class="opt"><span>${esc(st)}<br><small>Friends join with the same mode and room code</small></span><button class="pill sm" data-do="invite">Einladen</button></div>
      <div class="opt"><span>Leave this match<br><small>Back to your campaign</small></span><button class="pill sm" data-do="leave">Verlassen</button></div>`;
  }
  // tactical map and minimap: teammates (and rogues in the Sperrzone)
  markers() {
    const out = [];
    for (const r of this.remote.values()) { if (!r.seen) continue; const ally = !this.hostile(r); if (ally || (this.def.zone && r.rogue)) out.push({ x: r.x, z: r.z, yaw: r.y, tag: r.n, col: this.def.teams ? TEAM[r.team].c : r.rogue ? '#ff3a2a' : '#5fd3ff' }); }
    return out;
  }
  // ------------------------------------------------------------------ per frame (after the game update)
  update(dt) {
    const G = this.G, P = G.P; this.t += dt; this.kitCd = Math.max(0, this.kitCd - dt);
    if (this.pvp) { G.D.maxHP = 100; G.D.maxArmor = 150; }
    this._flushHits();
    if (this.online) {
      this.sendT -= dt;
      if (this.sendT <= 0) {
        this.sendT = 1 / 15; const f = (P.aim ? 1 : 0) | (P.crouch ? 2 : 0) | (G.t - P.lastShot < 0.16 && !P.dead ? 4 : 0) | (P.roll ? 8 : 0);
        const msg = { t: 's', x: Math.round(P.x * 100) / 100, z: Math.round(P.z * 100) / 100, y: Math.round(P.yaw * 100) / 100, s: Math.round(P.spd * 10) / 10, f, g: G.curW().cls, pt: Math.round(G.cam.pitch * 100) / 100 };
        if (this.pv > 0) { msg.pv = Math.round(this.pv * 10) / 10; this.pv = 0; } this.sendj(msg);
      }
      this.lookT -= dt; if (this.lookT <= 0) { this.lookT = 2; const L = G.playerLook(), k = JSON.stringify(L); if (k !== this.lookKey) { this.lookKey = k; this.sendj({ t: 'lk', o: L.outfit, p: L.pal }); } }
    }
    for (const r of this.remote.values()) this._remote(r, dt);
    if (this.def.arena && !P.dead) { const c = this.def.arena.c, rr = this.def.arena.r - 0.6, d = hyp(P.x - c[0], P.z - c[1]); if (d > rr) { P.x = c[0] + ((P.x - c[0]) / d) * rr; P.z = c[1] + ((P.z - c[1]) / d) * rr; } }
    if (this.def.arena) G.wp = null;
    if (!G.paused) { if (this.def.zone) this._zone(dt); if (this.def.survival) this._survival(dt); }
    if (this.m && this.m.ph !== this.lastPh) { if (this.m.ph === 'over' && this.def.teams) { const w = this.m.win; G.ui.banner(w < 0 ? 'UNENTSCHIEDEN' : w === this.team ? 'SIEG' : 'NIEDERLAGE', w < 0 ? 'Draw' : TEAM[w].n + ' wins · next match in 12 s', w === this.team ? 'win' : 'bad'); G.audio.play(w === this.team ? 'mission' : 'down', 0.7); } this.lastPh = this.m.ph; }
    this._hud(dt);
  }
  _remote(r, dt) {
    const G = this.G, P = G.P, ex = r.at ? Math.min(0.25, (performance.now() - r.at) / 1000) : 0;
    r.x = damp(r.x, r.tx + r.vx * ex, 12, dt); r.z = damp(r.z, r.tz + r.vz * ex, 12, dt); r.y = dampAng(r.y, r.ty, 14, dt);
    const dd = hyp(r.x - P.x, r.z - P.z), vis = r.seen && dd < 300; r.rig.root.visible = vis;
    if (r.g !== r.rig.gunType) r.rig.setGun(r.g);
    if (vis) {
      r.rig.root.position.set(r.x, 0, r.z); r.rig.root.rotation.y = r.y;
      r.rig.pose({ speed: r.s, aim: r.f & 1 || r.f & 4, crouch: r.f & 2, roll: r.f & 8 ? 0.5 : 0, dead: r.dead ? 1 : 0, pitch: r.pt || 0 }, dt); r.rig.root.updateMatrixWorld(true);
      if (r.f & 4 && !r.dead) { r.fa += (dt * ((WPN[r.g] || WPN.ar).rpm || 400)) / 60; let n = 0; while (r.fa >= 1 && n < 3) { r.fa -= 1; n++; this._remoteShot(r, dd); } r.fa = Math.min(r.fa, 1); } else r.fa = 0.95;
    }
    const h = this.hostile(r);
    if (h && !r.proxy) { r.proxy = this._proxy(r); G.en.push(r.proxy); } else if (!h && r.proxy) { const i = G.en.indexOf(r.proxy); if (i >= 0) G.en.splice(i, 1); r.proxy = null; }
    r.losT -= dt; if (r.losT <= 0) { r.losT = 0.3; r.los = vis && dd < 140 && G.world.los(P.x, 1.6, P.z, r.x, 1.6, r.z); }
    const show = vis && !r.dead && (!h ? dd < 300 : (this.def.zone && r.rogue && dd < 160) || (r.los && dd < 90)), p = show && G.project(r.x, (r.f & 2 ? 1.5 : 2.15), r.z, r.pp);
    if (p) {
      const col = this.def.teams ? TEAM[r.team].c : r.rogue ? '#ff3a2a' : '#5fd3ff', txt = (r.rogue ? 'ABTRÜNNIG · ' : '') + r.n + (r.prot ? ' ◇' : '') + (!h && dd > 40 ? ' · ' + Math.round(dd) + ' m' : ''), key = txt + col;
      if (r.key !== key) { r.key = key; r.label.textContent = txt; r.label.style.borderColor = col; r.label.style.color = col; }
      r.label.style.display = ''; r.label.style.transform = `translate(${p.x | 0}px,${p.y | 0}px) translate(-50%,-100%)`;
    } else if (r.label.style.display !== 'none') r.label.style.display = 'none';
  }
  _remoteShot(r, dd) {
    const G = this.G, W = WPN[r.g] || WPN.ar, mz = r.rig.muzzle(V1), pt = r.pt || 0, cp = Math.cos(pt), dx = Math.sin(r.y) * cp, dy = Math.sin(pt), dz = Math.cos(r.y) * cp, max = W.range * 1.5;
    const h = G.world.ray(mz.x, mz.y, mz.z, dx, dy, dz, max), t = h ? h.t : max;
    G.fx.tracer(mz, V2.set(mz.x + dx * t, mz.y + dy * t, mz.z + dz * t), [1.0, 0.78, 0.42], 0.06, 2);
    G.fx.puff(mz.x, mz.y, mz.z, 1, [4, 2.6, 1.0], 0.3, 0.2, 0.05, -1, 0, 0); if (dd < 170) G.audio.shotAt(r.g, r.x, r.z);
  }
  // ------------------------------------------------------------------ Sperrzone: Garde camps, contaminated loot, drone extraction
  _zone(dt) {
    const G = this.G, P = G.P, W = G.world, lv = Math.max(4, G.S.lvl);
    if (!P.dead) for (const c of this.camps) { c.t -= dt; if (c.t <= 0 && hyp(c.x - P.x, c.z - P.z) < 120 && G.alive() < 10) { c.t = 200; G.group(c.x, c.z, 4 + ((Math.random() * 2) | 0), lv + 2, 2, { r0: 2, r1: 18, vet: 0.4, tiers: Math.random() < 0.3 ? [2] : null }); } }
    this.roamT -= dt; if (this.roamT <= 0 && !P.dead) { this.roamT = 50 + Math.random() * 40; const a = G.cam.yaw + (Math.random() - 0.5) * 2.6, d = 70 + Math.random() * 30, p = W.findWalk(P.x + Math.sin(a) * d, P.z + Math.cos(a) * d, 0, 16, Math.random, 20); if (p && G.alive() < 8 && !W.los(p[0], 1.6, p[1], P.x, 1.6, P.z)) G.group(p[0], p[1], 3, lv + 1, 2, { r0: 0, r1: 5, vet: 0.25, patrol: [P.x, P.z] }); }
    let near = null; for (const e of this.extr) { if (hyp(e.x - P.x, e.z - P.z) < 10) near = e; if (e.beam) e.beam.material.opacity = e.call > 0 || e.here > 0 ? 0.5 + 0.2 * Math.sin(this.t * 7) : 0.18; }
    for (const e of this.extr) {
      if (e.call > 0) { e.call -= dt; if (e.call <= 0) { e.here = 24; this.drone.visible = true; this.droneAt = e; if (hyp(e.x - P.x, e.z - P.z) < 200) G.ui.banner('DROHNE IST DA', 'Hold USE under the hook to send your bag up', 'net'); } }
      if (e.here > 0) { e.here -= dt; this.drone.position.set(e.x, 10.5 + Math.max(0, e.here - 20) * 9 + Math.sin(this.t * 1.7) * 0.25, e.z); this.drone.rotation.y += dt * 0.35; if (e.here <= 0) { this.drone.visible = false; if (this.bag.length && near === e) this.ui.toast('The drone left without your bag', 'bad'); } }
    }
    if (this.bag.length) { const e = this.extr.slice().sort((a, b) => hyp(a.x - P.x, a.z - P.z) - hyp(b.x - P.x, b.z - P.z))[0]; G.wp = e ? { x: e.x, z: e.z, n: 'Extraktion · ' + e.n } : null; } else G.wp = null;
    if (!near || P.dead) { this.useT = 0; return; }
    const use = G.inp.use;
    if (near.here > 0) {
      if (!this.bag.length) { G.prompt = { text: 'Lastendrohne', sub: 'Your bag is empty', prog: 0 }; return; }
      G.prompt = { text: 'Bag an den Haken', sub: this.bag.length + ' contaminated items', prog: this.useT / 2 };
      if (use) { this.useT += dt; if (this.useT >= 2) { this.useT = 0; this._extract(); } } else this.useT = 0;
    } else if (near.call > 0) G.prompt = { text: 'Drohne im Anflug', sub: Math.ceil(near.call) + ' s · hold the area', prog: 1 - near.call / 45 };
    else {
      G.prompt = { text: 'Lastendrohne rufen', sub: 'Arrives in 45 s · everyone in the zone hears it', prog: this.useT / 1.5 };
      if (use) { this.useT += dt; if (this.useT >= 1.5) { this.useT = 0; near.call = 45; G.ui.banner('DROHNE GERUFEN', near.n + ' · 45 s', 'warn'); G.audio.play('alarm', 0.5); this.sendj({ t: 'ev', k: 'drone', i: this.extr.indexOf(near) }); G.group(near.x, near.z, 5, lv + 2, 2, { r0: 30, r1: 48, aware: true, vet: 0.35 }); } } else this.useT = 0;
    }
  }
  _extract() {
    const G = this.G, items = this.bag.splice(0); G.ui.banner('EXTRAHIERT', items.length + ' items are waiting in your campaign stash', 'win'); G.audio.play('capture', 0.7);
    try { const sv = store.get('save', null) || newSave(); sv.inv = (sv.inv || []).concat(items).slice(-40); store.set('save', sv); } catch (e) { }
  }
  // ------------------------------------------------------------------ Kaltstart: body heat, food, depots, the transmitter
  _survival(dt) {
    const G = this.G, P = G.P; if (this.over || P.dead) return; this.t0 += dt;
    const night = G.gfx.U && G.gfx.U.uNight ? G.gfx.U.uNight.value : 0.5; let warm = hyp(G.map.hub[0] - P.x, G.map.hub[1] - P.z) < 45;
    if (!warm && G.life) for (const b of G.life.barrels) if (Math.abs(b.x - P.x) < 4.5 && Math.abs(b.z - P.z) < 4.5) { warm = true; break; }
    this.warm = warm; this.heat = clamp(this.heat + (warm ? 7 : -(0.3 + 0.4 * night) * (1 - this.cloth * 0.2)) * dt, 0, 100); this.food = clamp(this.food - 0.09 * dt, 0, 100);
    if (this.heat <= 0 || this.food <= 0) { this.coldT = (this.coldT || 0) + dt; if (this.coldT > 1) { this.coldT = 0; G.hurt((this.heat <= 0 ? G.D.maxHP * 0.03 : 0) + (this.food <= 0 ? G.D.maxHP * 0.015 : 0), P.x, P.z); } }
    G.noRegen = this.heat < 25 || this.food < 15;
    const tw = hyp(this.tower[0] - P.x, this.tower[1] - P.z) < 8; let best = null, bd = 2.6 * 2.6; for (const s of this.stash) if (!s.open) { const d = (s.x - P.x) ** 2 + (s.z - P.z) ** 2; if (d < bd) { bd = d; best = s; } }
    G.wp = this.fuse ? { x: this.tower[0], z: this.tower[1], n: 'Fernsehturm · Sender' } : null;
    if (tw) {
      G.prompt = { text: this.fuse ? 'Sender einschalten' : 'Der Sender braucht eine Sicherung', sub: this.fuse ? 'Hold to send the signal' : 'Search the depots for a fuse', prog: this.useT / 5, bad: !this.fuse };
      if (G.inp.use && this.fuse) { this.useT += dt; if (this.useT >= 5) this._end(true); } else this.useT = 0;
    } else if (best) {
      G.prompt = { text: 'Depot durchsuchen', sub: 'Food, blankets, ammunition, med kits', prog: this.useT / 1.4 };
      if (G.inp.use) { this.useT += dt; if (this.useT >= 1.4) { this.useT = 0; best.open = true; this._loot(); const i = this.stash.indexOf(best), M = new THREE.Matrix4(); M.makeScale(0, 0, 0); this.crates.setMatrixAt(i, M); this.crates.instanceMatrix.needsUpdate = true; } } else this.useT = 0;
    } else this.useT = 0;
  }
  _loot() {
    const G = this.G, S = G.S, r = Math.random(); this.searched++; G.audio.play('crate', 0.5);
    if (!this.fuse && this.searched >= this.fuseAt) { this.fuse = true; G.ui.banner('SICHERUNG GEFUNDEN', 'Bring it to the transmitter at the Fernsehturm', 'net'); G.audio.play('mission', 0.6); return; }
    if (r < 0.34) { this.food = clamp(this.food + 40, 0, 100); this.ui.toast('Konserven · food', 'ok'); }
    else if (r < 0.52) { if (this.cloth < 3) { this.cloth++; this.ui.toast('Wolldecke · you lose heat slower', 'ok'); } else { this.food = clamp(this.food + 25, 0, 100); this.ui.toast('Zwieback · food', 'ok'); } }
    else if (r < 0.8) {
      if (S.wpn.length < 2 && Math.random() < 0.55) { const it = makeWeapon(S.lvl, Math.random() < 0.3 ? 1 : 0, Math.random() < 0.5 ? 'smg' : 'ar'); S.wpn.unshift(it); G.mags.unshift(G.magSize(it)); S.cur = 1; G.swap(0); S.res[it.cls] = (S.res[it.cls] || 0) + 60; this.ui.toast(WPN[it.cls].n + ' · ' + it.n, 'ok'); }
      else { for (const k of ['ar', 'smg']) S.res[k] = (S.res[k] || 0) + 30; this.ui.toast('Munition', 'ammo'); }
    } else { S.kits++; this.ui.toast('Verbandskasten', 'kit'); }
    this.ui.dirty = true;
  }
  _end(won) {
    this.over = true; const G = this.G, t = fmtT(this.t0);
    if (won) { G.ui.banner('SIGNAL GESENDET', 'Berlin hears you', 'win'); G.audio.play('mission', 0.8); }
    const o = document.createElement('div'); o.className = 'mpover';
    o.innerHTML = `<b>${won ? 'SIGNAL GESENDET' : 'ERFROREN'}</b><p>${won ? 'You got the transmitter running after ' + t + '.' : 'Your run ended after ' + t + '.'}<br>${this.searched} depots searched${this.fuse ? ' · fuse found' : ''}</p><div class="row"><button class="pill hot" data-r="again">Neuer Versuch</button><button class="pill" data-r="camp">Zur Kampagne</button></div>`;
    o.addEventListener('click', (e) => { const b = e.target.closest('[data-r]'); if (!b) return; if (b.dataset.r === 'again') location.reload(); else this.leave(); });
    setTimeout(() => document.body.appendChild(o), won ? 2500 : 1800);
  }
  // ------------------------------------------------------------------ HUD: score, clock, feed, survival meters
  _hud(dt) {
    let h = el('mpHud'); if (!h) { h = document.createElement('div'); h.id = 'mpHud'; el('hud').appendChild(h); }
    for (const f of this.feed) f.t -= dt; if (this.feed.length && this.feed[this.feed.length - 1].t <= 0) this.feed = this.feed.filter((f) => f.t > 0);
    const M = this.m, P = this.G.P, d = this.def; let s = '';
    if (d.teams && M) s += `<div class="mps">${M.sc.map((v, i) => `<span style="color:${TEAM[i].c}"><small class="tn">${TEAM[i].n} </small>${v}</span>`).join('<i>·</i>')}<em>${M.ph === 'live' ? fmtT(M.tl) : M.ph === 'warm' ? 'warten auf Gegner' : M.win >= 0 ? TEAM[M.win].n + ' gewinnt' : 'unentschieden'}</em></div><div class="mpme">Team <b style="color:${TEAM[this.team].c}">${TEAM[this.team].n}</b> · ${this.kills} K · ${this.deaths} D</div>`;
    else if (d.pvp && this.online) s += `<div class="mpme">${d.name} · ${this.kills} K · ${this.deaths} D${this.rogue ? ' · <b style="color:#ff3a2a">ABTRÜNNIG</b>' : ''}${d.zone ? ' · Tasche ' + this.bag.length + '/6' : ''}</div>`;
    else if (d.zone) s += `<div class="mpme">Sperrzone · Tasche ${this.bag.length}/6</div>`;
    if (d.survival) s += `<div class="mpbars"><span>Wärme${this.warm ? ' ▲' : ''}</span><i><b style="width:${this.heat.toFixed(0)}%;background:${this.heat < 25 ? '#ff5a3c' : '#ffb24a'}"></b></i><span>Essen</span><i><b style="width:${this.food.toFixed(0)}%;background:#9bd06a"></b></i></div><div class="mpme">${fmtT(this.t0)} · ${this.fuse ? 'Sicherung ✓' : 'Depots ' + this.searched}</div>`;
    if (P.dead && this.pvp && this.online && !this.canRespawn) s += `<div class="mpme">Zurück in ${Math.max(0, Math.ceil(5 - (this.t - this.deadAt)))} s</div>`;
    if (this.status !== 'online' && this.status !== 'solo') s += `<div class="mpme warn">${this.status === 'offline' ? 'Solo · online play runs on the Cloudflare version' : this.status === 'full' ? 'This match is full' : 'Verbinde …'}</div>`;
    else if (this.online && !d.teams) s += `<div class="mpme dim">${this.remote.size + 1} im Raum „${esc(this.room)}“</div>`;
    if (h.__s !== s) { h.__s = s; h.innerHTML = s; }
    let fe = el('mpFeed'); if (!fe) { fe = document.createElement('div'); fe.id = 'mpFeed'; el('hud').appendChild(fe); }
    const fs = this.feed.map((f) => `<div class="mpf${f.me ? ' me' : ''}">${esc(f.k)} <i>${f.hd ? '⌖' : '›'}</i> ${esc(f.v)}</div>`).join('');
    if (fe.__s !== fs) { fe.__s = fs; fe.innerHTML = fs; }
  }
}
