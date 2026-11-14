// SCHWARZSTART · multiplayer match server. One Durable Object per match room holds every player's state, decides hits,
// kills, scores, respawns and match phases, and streams snapshots at 15 Hz over WebSockets. The Worker also serves the game.
const PROTO = 2;
const MODES = {
  frei: { name: 'Frei', teams: 0, max: 16, pvp: false, goal: 0, dur: 0 },          // open city, friends see each other
  duell: { name: 'Duell', teams: 2, max: 2, pvp: true, goal: 7, dur: 360 },
  kiez: { name: 'Kiezkampf 4v4', teams: 2, max: 8, pvp: true, goal: 40, dur: 600 },
  kiez3: { name: 'Kiezkampf 4v4v4', teams: 3, max: 12, pvp: true, goal: 40, dur: 600 },
  zone: { name: 'Sperrzone', teams: 0, max: 16, pvp: true, rogue: true, goal: 0, dur: 0 },
  kalt: { name: 'Kaltstart', teams: 0, max: 6, pvp: false, goal: 0, dur: 0 },
};
const HP = 100, ARM = 150, RESPAWN = 5000, PROTECT = 2200;

export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    if (u.pathname === '/ws') {
      if ((req.headers.get('Upgrade') || '').toLowerCase() !== 'websocket') return new Response('expected a websocket', { status: 426 });
      const mode = MODES[u.searchParams.get('mode')] ? u.searchParams.get('mode') : 'frei';
      const room = (u.searchParams.get('room') || 'offen').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24) || 'offen';
      return env.ROOMS.get(env.ROOMS.idFromName(mode + ':' + room)).fetch(req);
    }
    if (u.pathname === '/server.json') return Response.json({ server: true, proto: PROTO, modes: Object.fromEntries(Object.entries(MODES).map(([k, m]) => [k, { name: m.name, max: m.max, teams: m.teams }])) });
    return env.ASSETS.fetch(req);
  },
};

export class Room {
  constructor(state, env) { this.state = state; this.env = env; this.pl = new Map(); this.seq = 0; this.timer = null; this.match = null; this.mode = null; }
  async fetch(req) {
    const u = new URL(req.url), mode = MODES[u.searchParams.get('mode')] ? u.searchParams.get('mode') : 'frei';
    if (!this.mode) { this.mode = mode; this.cfg = MODES[mode]; this.reset(); }
    const pair = new WebSocketPair(), [client, ws] = Object.values(pair); ws.accept();
    if (this.pl.size >= this.cfg.max) { ws.send(JSON.stringify({ t: 'e', msg: 'full' })); ws.close(4000, 'full'); return new Response(null, { status: 101, webSocket: client }); }
    const id = ++this.seq, p = { id, ws, n: 'Lotse ' + id, o: 'agent_m_1', pal: {}, team: this.pickTeam(), x: 0, z: 0, y: 0, s: 0, f: 0, g: 'ar', pt: 0, hp: HP, ar: ARM, dead: 0, kills: 0, deaths: 0, rogue: 0, prot: Date.now() + PROTECT, last: Date.now(), tok: 20, kits: 3, kitT: 0, hi: false, lastBy: 0, lastByT: 0 };
    this.pl.set(id, p);
    ws.addEventListener('message', (ev) => { try { this.onMsg(p, JSON.parse(ev.data)); } catch (e) { } });
    const bye = () => { if (!this.pl.has(id)) return; this.pl.delete(id); this.bcast({ t: 'l', id }); if (!this.pl.size) { clearInterval(this.timer); this.timer = null; this.reset(); } };
    ws.addEventListener('close', bye); ws.addEventListener('error', bye);
    if (!this.timer) this.timer = setInterval(() => this.tick(), 66);
    return new Response(null, { status: 101, webSocket: client });
  }
  reset() { this.match = { id: (this.match?.id || 0) + 1, ph: this.cfg.teams ? 'warm' : 'live', end: 0, sc: new Array(Math.max(1, this.cfg.teams)).fill(0), win: -1, overT: 0 }; for (const p of this.pl.values()) { p.kills = 0; p.deaths = 0; } }
  pickTeam() { const T = this.cfg.teams; if (!T) return 0; const n = new Array(T).fill(0); for (const p of this.pl.values()) n[p.team]++; return n.indexOf(Math.min(...n)); }
  send(p, m) { try { p.ws.send(typeof m === 'string' ? m : JSON.stringify(m)); } catch (e) { } }
  bcast(m, except) { const s = JSON.stringify(m); for (const p of this.pl.values()) if (p !== except && p.hi) this.send(p, s); }
  pub(p) { return { id: p.id, n: p.n, o: p.o, p: p.pal, team: p.team }; }
  onMsg(p, m) {
    p.last = Date.now();
    if (m.t === 'hi') {
      p.n = String(m.n || p.n).replace(/[^\p{L}\p{N} ._-]/gu, '').slice(0, 16) || p.n; p.o = /^agent_[mf]_[123]$/.test(m.o) ? m.o : 'agent_m_1'; p.pal = clean(m.p); p.hi = true;
      this.send(p, { t: 'w', v: PROTO, id: p.id, team: p.team, mode: this.mode, cfg: this.cfg, pl: [...this.pl.values()].filter((q) => q.hi && q !== p).map((q) => this.pub(q)), m: this.mInfo() });
      this.bcast({ t: 'j', ...this.pub(p) }, p); return;
    }
    if (!p.hi) return;
    if (m.t === 's') {
      if (p.dead) return; const n = (v, a, b) => (typeof v === 'number' && isFinite(v) ? Math.min(b, Math.max(a, v)) : 0);
      p.x = n(m.x, -3000, 3000); p.z = n(m.z, -3000, 3000); p.y = n(m.y, -20, 20); p.s = n(m.s, 0, 14); p.f = n(m.f, 0, 255) | 0; p.pt = n(m.pt, -2, 2); p.g = ['ar', 'smg', 'lmg', 'sg', 'dmr', 'pst'].includes(m.g) ? m.g : 'ar';
      if (m.pv > 0) this.pve(p, n(m.pv, 0, 250));
    } else if (m.t === 'h') this.hit(p, m);
    else if (m.t === 'ev') { const now = Date.now(); if (!this.cfg.rogue || now - (p.evT || 0) < 3000) return; p.evT = now; this.bcast({ t: 'ev', id: p.id, k: String(m.k || '').replace(/[^a-z]/g, '').slice(0, 8), i: Math.max(0, Math.min(9, m.i | 0)) }, p); }
    else if (m.t === 'k') { const now = Date.now(); if (!p.dead && p.kits > 0 && now > p.kitT) { p.kits--; p.kitT = now + 8000; p.hp = HP; p.ar = ARM; this.send(p, { t: 'd', by: 0, d: 0, hp: p.hp, ar: p.ar, kits: p.kits }); } }
    else if (m.t === 'lk') { p.o = /^agent_[mf]_[123]$/.test(m.o) ? m.o : p.o; p.pal = clean(m.p); this.bcast({ t: 'lk', id: p.id, o: p.o, p: p.pal }, p); }
  }
  hit(a, m) {
    const now = Date.now(), b = this.pl.get(m.to | 0), M = this.match;
    if (!this.cfg.pvp || !b || b === a || a.dead || b.dead || now < b.prot || !b.hi) return;
    if (this.cfg.teams && (a.team === b.team || M.ph !== 'live')) return;
    a.tok = Math.min(24, a.tok + ((now - (a.tokT || now)) / 1000) * 22); a.tokT = now; if (a.tok < 1) return; a.tok -= 1;     // ~22 hits/s per shooter at most
    if (Math.hypot(a.x - b.x, a.z - b.z) > 170) return;
    let d = Math.min(130, Math.max(0, +m.d || 0)); if (!d) return;
    if (this.cfg.rogue && !b.rogue) a.rogue = now + 60000;           // shooting someone who is not rogue makes you rogue
    const sa = Math.min(b.ar, d); b.ar -= sa; b.hp -= d - sa; b.lastBy = a.id; b.lastByT = now; b.hurtT = now;
    this.send(b, { t: 'd', by: a.id, d: Math.round(d), hd: m.hd ? 1 : 0, hp: Math.max(0, Math.round(b.hp)), ar: Math.round(b.ar), x: a.x, z: a.z });
    if (b.hp <= 0) this.kill(a, b, m.hd);
  }
  // damage from the shooter's own computer-controlled enemies (Sperrzone); a player who finished you off in the last 10 s gets the kill
  pve(b, d) {
    if (!this.cfg.pvp || b.dead || !d) return; const now = Date.now();
    const sa = Math.min(b.ar, d); b.ar -= sa; b.hp -= d - sa; b.hurtT = now;
    if (b.hp <= 0) { const a = b.lastBy && now - b.lastByT < 10000 ? this.pl.get(b.lastBy) : null; this.kill(a && !a.dead ? a : null, b, 0); }
  }
  kill(a, b, hd) {
    const now = Date.now(); b.hp = 0; b.ar = 0; b.dead = now + RESPAWN; b.deaths++; b.rogue = 0;
    if (a) { a.kills++; if (this.cfg.teams) { this.match.sc[a.team] = (this.match.sc[a.team] || 0) + 1; if (this.cfg.goal && this.match.sc[a.team] >= this.cfg.goal) this.over(a.team); } }
    this.bcast({ t: 'x', k: a ? a.id : 0, v: b.id, hd: hd ? 1 : 0 });
  }
  over(win) { this.match.ph = 'over'; this.match.win = win; this.match.overT = Date.now() + 12000; }
  mInfo() { const M = this.match, now = Date.now(); return { id: M.id, ph: M.ph, tl: M.end ? Math.max(0, Math.round((M.end - now) / 1000)) : 0, sc: M.sc, win: M.win, goal: this.cfg.goal }; }
  tick() {
    const now = Date.now(), M = this.match, live = [...this.pl.values()].filter((p) => p.hi), dt = Math.min(0.25, (now - (this.lastT || now)) / 1000); this.lastT = now;
    for (const p of live) {
      if (this.cfg.pvp && !p.dead) { const since = now - (p.hurtT || 0); if (since > 4000 && p.hp < HP) p.hp = Math.min(HP, p.hp + 4.5 * dt); if (since > 8000 && p.ar < ARM) p.ar = Math.min(ARM, p.ar + 12 * dt); }
      if (now - p.last > 20000) { try { p.ws.close(4001, 'idle'); } catch (e) { } this.pl.delete(p.id); this.bcast({ t: 'l', id: p.id }); continue; }
      if (p.dead && now >= p.dead) { p.dead = 0; p.hp = HP; p.ar = ARM; p.kits = 3; p.prot = now + PROTECT; this.send(p, { t: 'r', team: p.team, hp: HP, ar: ARM }); }
      if (p.rogue && now > p.rogue) p.rogue = 0;
    }
    if (this.cfg.teams) {
      const teamsUsed = new Set(live.map((p) => p.team)).size;
      if (M.ph === 'warm' && teamsUsed >= 2) { M.ph = 'live'; M.end = now + this.cfg.dur * 1000; M.sc.fill(0); for (const p of live) { p.kills = 0; p.deaths = 0; p.hp = HP; p.ar = ARM; p.kits = 3; p.prot = now + PROTECT; } this.bcast({ t: 'm', m: this.mInfo(), go: 1 }); }
      if (M.ph === 'live' && M.end && now > M.end) { const best = Math.max(...M.sc); this.over(M.sc.filter((v) => v === best).length > 1 ? -1 : M.sc.indexOf(best)); }
      if (M.ph === 'over' && now > M.overT) { const old = M.id; this.reset(); this.match.id = old + 1; for (const p of live) { p.dead = now + 500; p.team = 0; } let i = 0; for (const p of live) p.team = i++ % this.cfg.teams; this.bcast({ t: 'm', m: this.mInfo(), teams: live.map((p) => [p.id, p.team]) }); }
    }
    const snap = JSON.stringify({ t: 'S', m: this.mInfo(), p: live.map((p) => [p.id, r1(p.x), r1(p.z), r2(p.y), r1(p.s), p.f, p.g, Math.round(p.hp), Math.round(p.ar), p.team, p.dead ? 1 : 0, p.kills, p.deaths, p.rogue ? 1 : 0, r2(p.pt), now < p.prot ? 1 : 0]) });
    for (const p of live) this.send(p, snap);
  }
}
const r1 = (v) => Math.round(v * 10) / 10, r2 = (v) => Math.round(v * 100) / 100;
function clean(p) { const o = {}; if (p && typeof p === 'object') for (const k of ['skin', 'top', 'pants', 'gear', 'accent', 'hat', 'face']) if (typeof p[k] === 'number' && isFinite(p[k])) o[k] = Math.max(0, Math.min(0xffffff, p[k] | 0)); return o; }
