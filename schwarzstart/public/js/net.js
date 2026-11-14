// SCHWARZSTART · multiplayer groundwork: live co-presence of other agents through the artifact's `room` capability.
// Every open copy of the game publishes its agent as presence (absolute state, ~8 Hz); everyone else's agents are
// drawn in the same Berlin with smoothing and extrapolation. Presence is untrusted display data: it is validated,
// clamped and never treated as authority. Combat stays local for now; the protocol below is versioned so shared
// fights (shots, kills, site captures as room events or a db document) can be layered on later.
import * as THREE from 'three';
import { Rig, CharLib, SLOTS } from './rig.js';
import { clamp, damp, dampAng, hyp, el } from './util.js';

const ROOM = 'berlin-mitte-p1', PROTO = 1, GUNS = new Set(['ar', 'smg', 'lmg', 'sg', 'dmr', 'pst']);
const num = (v, lo, hi, d = 0) => (typeof v === 'number' && isFinite(v) ? clamp(v, lo, hi) : d);

export function encodeAgent(G) {
  const P = G.P, L = G.playerLook(), pal = {};
  for (const k of ['skin', 'top', 'pants', 'gear', 'accent', 'hat', 'face']) if (typeof L.pal[k] === 'number') pal[k] = L.pal[k] | 0;
  return { v: PROTO, x: Math.round(P.x * 20) / 20, z: Math.round(P.z * 20) / 20, y: Math.round(P.yaw * 100) / 100, s: Math.round(P.spd * 10) / 10,
    ai: P.aim ? 1 : 0, c: P.crouch ? 1 : 0, d: P.dead ? 1 : 0, g: G.curW().cls, o: L.outfit, p: pal, l: G.S.lvl | 0, k: G.S.tag || null, t: Date.now() };
}
export function decodeAgent(a) {
  if (!a || typeof a !== 'object' || a.v !== PROTO) return null;
  const o = typeof a.o === 'string' && CharLib.outfits().includes(a.o) && a.o.startsWith('agent_') ? a.o : 'agent_m_1', pal = {};
  if (a.p && typeof a.p === 'object') for (const k of SLOTS) if (typeof a.p[k] === 'number' && isFinite(a.p[k])) pal[k] = clamp(a.p[k] | 0, 0, 0xffffff);
  const tag = typeof a.k === 'string' ? a.k.replace(/[^\p{L}\p{N} ._-]/gu, '').slice(0, 16) : null;
  return { x: num(a.x, -2000, 2000), z: num(a.z, -2000, 2000), y: num(a.y, -10, 10), s: num(a.s, 0, 12), ai: !!a.ai, c: !!a.c, d: !!a.d, g: GUNS.has(a.g) ? a.g : 'ar', o, pal, l: num(a.l, 1, 30, 1) | 0, k: tag };
}

export class Net {
  constructor(G, ui) { this.G = G; this.ui = ui; this.room = null; this.remote = new Map(); this.sendT = 0; this.last = ''; this.on = false; this.n = 0; this.status = 'solo'; }
  async start() {
    const c = window.claude; if (!c || typeof c.use !== 'function') return;          // plain browser / local build: single player
    try {
      const lobby = await c.use('room'); if (!lobby) return;
      this.room = await lobby.join(ROOM).catch(() => lobby);
      this.room.onPeers(() => { this.dirty = true; }, () => { this.status = 'solo'; });
      if (this.room.onConnection) this.room.onConnection((ok) => { this.status = ok ? 'online' : 'reconnecting'; });
      this.on = true; this.status = 'online';
    } catch (e) { this.room = null; }
  }
  update(dt) {
    if (!this.room) return;
    const G = this.G;
    this.sendT -= dt;
    if (this.sendT <= 0) {
      this.sendT = 0.12; const a = encodeAgent(G), key = JSON.stringify({ ...a, t: 0 });
      if (key !== this.last || (this.keepT = (this.keepT || 0) - 0.12) <= 0) { this.last = key; this.keepT = 2; this.room.presence({ a }).catch(() => {}); }
    }
    const peers = this.room.peers(), seen = new Set(); let n = 0;
    for (const p of peers) {
      if (p.isMe || p.kind !== 'viewer') continue;
      const s = decodeAgent(p.presence && p.presence.a); if (!s) continue; n++; seen.add(p.peer);
      let r = this.remote.get(p.peer);
      if (!r) { r = this.spawn(p.peer, s); this.remote.set(p.peer, r); }
      if (s.o !== r.o || JSON.stringify(s.pal) !== r.palKey) { r.rig.setOutfit(s.o, { ...s.pal }); r.o = s.o; r.palKey = JSON.stringify(s.pal); }
      if (s.g !== r.rig.gunType) r.rig.setGun(s.g);
      if (p.updatedAt !== r.at) { const now = performance.now(), dtS = Math.max(0.05, (now - (r.rx || now)) / 1000); r.vx = clamp((s.x - r.tx) / dtS, -9, 9); r.vz = clamp((s.z - r.tz) / dtS, -9, 9); r.rx = now; r.at = p.updatedAt; if (hyp(s.x - r.x, s.z - r.z) > 25) { r.x = s.x; r.z = s.z; } }
      r.tx = s.x; r.tz = s.z; r.s = s; r.stale = (Date.now() - (p.updatedAt || Date.now())) / 1000; r.tag = s.k || 'Lotse ' + p.peer.slice(0, 4).toUpperCase(); r.lvl = s.l;
    }
    for (const [id, r] of this.remote) if (!seen.has(id)) { this.G.scene.remove(r.rig.root); r.rig.dispose(); r.label.remove(); this.remote.delete(id); }
    this.n = n;
    const P = G.P, cam = G.gfx.camera;
    for (const r of this.remote.values()) {
      const s = r.s, ex = Math.min(0.35, (performance.now() - r.rx) / 1000);              // extrapolate a little, then settle
      const gx = r.tx + r.vx * ex, gz = r.tz + r.vz * ex;
      r.x = damp(r.x, gx, 10, dt); r.z = damp(r.z, gz, 10, dt); r.yaw = dampAng(r.yaw, s.y, 12, dt);
      const far = hyp(r.x - P.x, r.z - P.z) > 220; r.rig.root.visible = !far && r.stale < 20;
      if (!r.rig.root.visible) { r.label.style.display = 'none'; continue; }
      r.rig.root.position.set(r.x, 0, r.z); r.rig.root.rotation.y = r.yaw;
      r.rig.pose({ speed: s.s, aim: s.ai, crouch: s.c, dead: s.d, pitch: 0 }, dt); r.rig.root.updateMatrixWorld(true);
      const p = G.project(r.x, 2.15, r.z, r.pt || (r.pt = {}));
      if (p && hyp(r.x - P.x, r.z - P.z) < 90) { r.label.style.display = ''; r.label.style.transform = `translate(${p.x | 0}px,${p.y | 0}px) translate(-50%,-100%)`; r.label.textContent = `${r.tag} · ${r.lvl}`; }
      else r.label.style.display = 'none';
      void cam;
    }
    const b = el('netN'); if (b) { const t = this.n ? `${this.n + 1} Lotsen online` : ''; if (b.textContent !== t) b.textContent = t; }
  }
  spawn(id, s) {
    const rig = new Rig(this.G.gfx, { outfit: s.o, pal: { ...s.pal } }, s.g); this.G.scene.add(rig.root);
    const label = document.createElement('div'); label.className = 'peer'; el('hud').appendChild(label);
    return { id, rig, label, x: s.x, z: s.z, tx: s.x, tz: s.z, vx: 0, vz: 0, yaw: s.y, rx: performance.now(), at: 0, o: s.o, palKey: JSON.stringify(s.pal), s, stale: 0 };
  }
  // markers for the tactical map and minimap
  markers() { const out = []; for (const r of this.remote.values()) if (r.stale < 20) out.push({ x: r.x, z: r.z, yaw: r.yaw, tag: r.tag }); return out; }
}
