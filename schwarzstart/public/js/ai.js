// SCHWARZSTART · hostile AI: perception, cover use, flanking, archetype behaviour
import * as THREE from 'three';
import { Rig, FACTION_LOOKS } from './rig.js';
import * as SYS from './systems.js';
import { clamp, dampAng, angDiff, hyp, R } from './util.js';
import { F_LOW } from './geom.js';

const V = new THREE.Vector3(), V2 = new THREE.Vector3();
const RPM = { smg: 620, ar: 430, lmg: 540, dmr: 60, sg: 70, pst: 200 };

export class Enemy {
  constructor(G, x, z, spec, home = null) {
    const A = SYS.ARCH[spec.arch], T = SYS.TIERS[spec.tier], F = SYS.FACTIONS[spec.fac];
    Object.assign(this, { G, x, z, yaw: R() * 6.28, arch: spec.arch, A, T, tier: spec.tier, lvl: spec.lvl, fac: spec.fac, home, name: spec.name || F.names[spec.arch], boss: spec.tier === 3 });
    this.maxHp = this.hp = SYS.enemyHP(spec.lvl) * A.hp * T.hp * (G.diffHp || 1); this.maxArm = this.arm = this.maxHp * (T.arm * 0.55 + (A.armor ? 0.35 : 0));
    this.sc = (A.scale || 1) * (T.scale || 1); this.rig = new Rig(G.gfx, FACTION_LOOKS[spec.fac], A.wpn, this.sc, A.bulk || 1); G.scene.add(this.rig.root);
    this.aware = false; this.alertT = 0; this.mode = 'idle'; this.perT = R() * 0.4; this.path = null; this.pi = 0; this.repT = 0; this.cov = null; this.crouch = false; this.fireT = 0; this.burst = 0; this.cd = 1 + R() * 1.5;
    this.mark = 0; this.dead = false; this.deadT = 0; this.spd = 0; this.tellT = 0; this.seen = false; this.seenT = -99; this.lsx = x; this.lsz = z; this.nadeCd = 5 + R() * 6; this.strafe = R() < 0.5 ? 1 : -1; this.meleeT = 0; this.mel = 0; this.stun = 0; this.kvx = 0; this.kvz = 0;
    this.patrol = spec.patrol || null; this.covAge = 0; this.shots = 0; this.gx = x; this.gz = z; this.idleYaw = this.yaw; this.pitch = 0; this.firing = false; this.stuckT = 0; this.px = x; this.pz = z;
    this.rig.root.position.set(x, 0, z);
  }
  aimY() { return (this.crouch ? 0.72 : 1.2) * this.sc; }
  headY() { return (this.crouch ? 0.98 : 1.62) * this.sc; }
  rayHit(ox, oy, oz, dx, dy, dz) {
    const r = 0.37 * this.sc, hh = (this.crouch ? 1.12 : 1.8) * this.sc, a = dx * dx + dz * dz; if (a < 1e-8) return null;
    const fx = this.x - ox, fz = this.z - oz, tm = (fx * dx + fz * dz) / a, cx = ox + dx * tm - this.x, cz = oz + dz * tm - this.z, d2 = cx * cx + cz * cz; if (d2 > r * r || tm < 0) return null;
    const t = tm - Math.sqrt((r * r - d2) / a), y = oy + dy * Math.max(t, 0), ym = oy + dy * tm; if ((y < -0.05 || y > hh + 0.06) && (ym < -0.05 || ym > hh + 0.06)) return null;
    return { t: Math.max(0.01, t), head: Math.max(y, ym) > hh - 0.34 * this.sc && Math.min(y, ym) < hh + 0.1 };
  }
  alert(delay = 0.5, spread = true) {
    if (this.dead) return; if (!this.aware) { this.aware = true; this.alertT = delay; this.mode = 'react'; this.G.combatT = 8; if (spread) for (const e of this.G.en) if (e !== this && !e.dead && !e.aware && hyp(e.x - this.x, e.z - this.z) < 24) e.alert(delay + 0.3 + R() * 0.6, false); }
    this.lsx = this.G.P.x; this.lsz = this.G.P.z; this.seenT = this.G.t;
  }
  damage(amt, info = {}) {
    if (this.dead) return; const G = this.G; if (!this.aware) { amt *= 1.2; this.alert(0.15); }
    let shown = amt, armHit = false;
    if (this.arm > 0) { const a = amt * (info.pierce || 1); armHit = true; if (a >= this.arm) { const left = (a - this.arm) / (info.pierce || 1); this.arm = 0; this.hp -= left; G.audio.playAt('armBreak', this.x, this.z, 0.7); G.fx.puff(info.x ?? this.x, info.y ?? 1.2, info.z ?? this.z, 8, [1.5, 2.2, 3], 0.05, 4, 0.3, -1, -6, 1); } else this.arm -= a; shown = a; }
    else this.hp -= amt;
    this.rig.hit = info.melee ? 1.6 : 1; if (info.head) this.rig.hitH = 1; G.ui.dmg(info.x ?? this.x, (info.y ?? 1.3) + 0.25, info.z ?? this.z, shown, info.head, info.crit, armHit);
    G.fx.puff(info.x ?? this.x, info.y ?? 1.2, info.z ?? this.z, 3, armHit ? [0.5, 0.6, 0.7] : [0.36, 0.3, 0.28], 0.07, 1.5, 0.3, 0.6, -3, 0.4);
    if (this.hp <= 0) {
      this.dead = true; this.crouch = false; this.rig.setHighlight(false);
      // fall away from the shot: forward if hit from behind, a twist to the side it came from, a short slide with the impact
      const P = G.P, sx = this.x - P.x, sz = this.z - P.z, sl = Math.hypot(sx, sz) || 1, fx = Math.sin(this.yaw), fz = Math.cos(this.yaw), along = (sx * fx + sz * fz) / sl;
      this.rig.deadDir = along > 0.35 ? -1 : 1; this.rig.deadSide = (sx * fz - sz * fx) / sl > 0 ? 1 : -1;
      const push = info.melee ? 4.2 : info.head ? 2.6 : info.crit ? 2.1 : 1.6; this.kvx = (sx / sl) * push; this.kvz = (sz / sl) * push;
      G.onKill(this, info);
    }
  }
  // steer along a path to (tx,tz); returns true when there
  moveTo(tx, tz, speed, dt, stop = 0.7) {
    const G = this.G, W = G.world, d = hyp(tx - this.x, tz - this.z); if (d < stop) { this.spd = 0; return true; }
    this.repT -= dt;
    if (!this.path || this.repT <= 0 || hyp(tx - this.gx, tz - this.gz) > 3.5) {
      if (G.pathN > 0 || !this.path) { G.pathN--; this.path = W.path(this.x, this.z, tx, tz, 3500) || [[tx, tz]]; this.pi = 0; this.gx = tx; this.gz = tz; this.repT = 1.2 + R() * 0.8; }
    }
    let wp = this.path[this.pi] || [tx, tz]; if (hyp(wp[0] - this.x, wp[1] - this.z) < 1.0 && this.pi < this.path.length - 1) wp = this.path[++this.pi];
    if (this.det) { this.det.t -= dt; if (this.det.t <= 0 || hyp(this.det.x - this.x, this.det.z - this.z) < 0.6) this.det = null; else wp = [this.det.x, this.det.z]; }   // a step aside after getting stuck
    let dx = wp[0] - this.x, dz = wp[1] - this.z; const l = hyp(dx, dz) || 1; dx /= l; dz /= l;
    for (const e of G.en) { if (e === this || e.dead) continue; const ex = this.x - e.x, ez = this.z - e.z, ed = ex * ex + ez * ez; if (ed < 1.3 && ed > 1e-4) { const k = (1.3 - ed) * 0.9; dx += (ex / Math.sqrt(ed)) * k; dz += (ez / Math.sqrt(ed)) * k; } }
    W.slide(this, dx * speed * dt, dz * speed * dt, 0.34); this.spd = speed; this.mvx = dx; this.mvz = dz;
    this.stuckT += dt; if (this.stuckT > 0.9) { if (hyp(this.x - this.px, this.z - this.pz) < 0.3) { this.path = null; this.repT = 0; this.strafe = -this.strafe; const f = W.findWalk(this.x, this.z, 1.5, 4, R, 12); if (f) this.det = { x: f[0], z: f[1], t: 1.1 }; } this.px = this.x; this.pz = this.z; this.stuckT = 0; }
    return false;
  }
  pickCover(ideal, rx = this.x, rz = this.z) {
    const G = this.G, P = G.P, W = G.world, segs = W.coversNear(rx, rz, 17, []); let best = null, bs = 1e9;
    for (let i = 0; i < segs.length && i < 40; i++) {
      const s = segs[i], t = 0.3 + R() * 0.4, mx = s.x1 + (s.x2 - s.x1) * t, mz = s.z1 + (s.z2 - s.z1) * t, dx = s.x2 - s.x1, dz = s.z2 - s.z1, l = hyp(dx, dz); if (l < 1.2) continue;
      let nx = -dz / l, nz = dx / l; if (nx * (P.x - mx) + nz * (P.z - mz) > 0) { nx = -nx; nz = -nz; }
      const px = mx + nx * 0.72, pz = mz + nz * 0.72, dp = hyp(px - P.x, pz - P.z); if (dp < 5 || dp > this.A.range * 0.95 || !W.walkable(px, pz)) continue;
      let occ = false; for (const e of G.en) if (e !== this && !e.dead && e.cov && hyp(e.cov.x - px, e.cov.z - pz) < 1.4) { occ = true; break; } if (occ) continue;
      const sc = hyp(px - this.x, pz - this.z) + Math.abs(dp - ideal) * 0.55 + R() * 2; if (sc < bs) { bs = sc; best = { x: px, z: pz, low: !!(s.f & F_LOW), s, ex: dx / l, ez: dz / l, t }; }
    }
    this.cov = best; this.covAge = 0; return best;
  }
  shoot() {
    const G = this.G, P = G.P, T = G.turret && this.tgtTurret ? G.turret : null, tx = T ? T.x : P.x, tz = T ? T.z : P.z, ty = T ? 0.7 : P.h * 0.62;
    const m = this.rig.muzzle(V); let dx = tx - m.x, dy = ty - m.y, dz = tz - m.z; const d = Math.hypot(dx, dy, dz); dx /= d; dy /= d; dz /= d;
    const err = (1 - this.A.acc) * 0.085 + (P.moving ? 0.018 : 0) + (P.sprint ? 0.02 : 0) + (P.roll ? 0.2 : 0) + (G.gfx.night > 0.5 ? 0.012 : 0);
    dx += (Math.random() + Math.random() - 1) * err; dy += (Math.random() + Math.random() - 1) * err * 0.6; dz += (Math.random() + Math.random() - 1) * err; const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l;
    const hw = G.world.ray(m.x, m.y, m.z, dx, dy, dz, 110); let end = hw ? hw.t : 110, hit = false;
    if (!T && !P.dead) { const a = dx * dx + dz * dz, tm = ((P.x - m.x) * dx + (P.z - m.z) * dz) / a, cx = m.x + dx * tm - P.x, cz = m.z + dz * tm - P.z, y = m.y + dy * tm; if (tm > 0 && tm < end && cx * cx + cz * cz < 0.15 && y > 0.05 && y < P.h + 0.05) { hit = true; end = tm; } }
    G.fx.tracer(m, V2.set(m.x + dx * end, m.y + dy * end, m.z + dz * end), this.arch === 'sniper' ? [1.4, 0.9, 0.7] : [1.0, 0.62, 0.3], 0.06, 1.7);
    if (hit) G.hurt(SYS.enemyDmg(this.lvl) * this.A.dmg * (1 + this.tier * 0.22), this.x, this.z);
    else if (hw && !hw.ground && end < d + 3) G.fx.puff(hw.x, hw.y, hw.z, 3, [0.55, 0.5, 0.46], 0.09, 1.4, 0.35, 0.5, -3, 0.5);
    G.fx.puff(m.x, m.y, m.z, 1, [3.5, 2.2, 0.9], 0.3, 0.2, 0.05, -1, 0, 0); this.rig.kick = 0.7; G.audio.shotAt(this.A.wpn, this.x, this.z); this.shots++;
  }
  update(dt) {
    const G = this.G, P = G.P, W = G.world, A = this.A, rig = this.rig;
    if (this.dead) { this.deadT += dt; if (this.kvx || this.kvz) { this.x += this.kvx * dt; this.z += this.kvz * dt; const k = Math.exp(-5 * dt); this.kvx *= k; this.kvz *= k; if (Math.abs(this.kvx) + Math.abs(this.kvz) < 0.05) this.kvx = this.kvz = 0; G.world.collide(this, 0.3); rig.root.position.set(this.x, 0, this.z); } if (this.deadT < 1.4) { rig.pose({ dead: 1 }, dt); rig.root.updateMatrixWorld(true); } if (this.deadT > 14 || hyp(this.x - P.x, this.z - P.z) > 150) this.gone = true; return; }
    const dx = P.x - this.x, dz = P.z - this.z, d = hyp(dx, dz);
    if (this.despawn && !this.aware && d > 60) { this.gone = true; return; }
    if (d > 240) { this.gone = true; return; }
    if (this.mark > 0) { this.mark -= dt; if (this.mark <= 0) rig.setHighlight(false); }
    this.fireT -= dt; this.meleeT -= dt; this.nadeCd -= dt; this.covAge += dt;
    if (this.kvx || this.kvz) { this.x += this.kvx * dt; this.z += this.kvz * dt; const k = Math.exp(-7 * dt); this.kvx *= k; this.kvz *= k; if (Math.abs(this.kvx) + Math.abs(this.kvz) < 0.05) this.kvx = this.kvz = 0; W.collide(this, 0.32); }   // shoved
    if (d < 0.75 && !P.dead) { this.x -= (dx / (d || 1)) * (0.75 - d); this.z -= (dz / (d || 1)) * (0.75 - d); W.collide(this, 0.32); }   // never inside you
    // perception
    this.perT -= dt;
    if (this.perT <= 0) {
      this.perT = 0.22 + R() * 0.2; const sight = (this.aware ? 95 : 44) * (G.gfx.night > 0.5 && !this.aware ? 0.72 : 1) * (P.crouch && !this.aware ? 0.55 : 1) * (G.inSafe ? 0 : 1);
      this.seen = !P.dead && d < sight && W.los(this.x, this.headY(), this.z, P.x, P.h * 0.8, P.z);
      if (this.seen && !this.aware) { const fa = Math.atan2(dx, dz); if (d < 14 || Math.abs(Math.atan2(Math.sin(fa - this.yaw), Math.cos(fa - this.yaw))) < 1.25) this.alert(0.45 + R() * 0.5); }
      if (this.seen) { this.lsx = P.x; this.lsz = P.z; this.seenT = G.t; }
      this.tgtTurret = G.turret && hyp(G.turret.x - this.x, G.turret.z - this.z) < Math.min(26, d * 0.9) && (this.shots + (this.lvl | 0)) % 3 === 0;
    }
    let speed = 0, aim = false, faceT = null; this.firing = false;
    if (!this.aware) {
      if (this.patrol) { if (this.moveTo(this.patrol[0], this.patrol[1], 1.5, dt, 2)) this.patrol = null; speed = this.spd; faceT = Math.atan2(this.mvx || 0, this.mvz || 1); }
      else { if (R() < dt * 0.15) this.idleYaw = this.yaw + (R() - 0.5) * 2; faceT = this.idleYaw; }
      this.crouch = false;
    } else if (this.alertT > 0) { this.alertT -= dt; faceT = Math.atan2(dx, dz); aim = true; if (this.alertT <= 0) { this.mode = A.cover ? 'seek' : 'push'; if (R() < 0.35) G.audio.playAt('shout', this.x, this.z, 0.6, 0.85 + R() * 0.3); } }
    else {
      const los = this.seen, since = G.t - this.seenT, tA = Math.atan2(dx, dz), run = A.spd, inRange = d < A.range;
      if (A.nade && this.nadeCd <= 0 && d > 7 && d < 26 && since < 2.5 && (P.st === 'cover' ? P.covT > 2.2 : P.spd < 0.5) && !G.inSafe) { this.nadeCd = 9 + R() * 6; rig.chestPos(V); G.spawnNade(V.x, V.y + 0.3, V.z, P.x + (R() - 0.5) * 2, P.z + (R() - 0.5) * 2, 1.25, false, SYS.enemyDmg(this.lvl) * 9); G.audio.playAt('throw', this.x, this.z, 0.5); G.ui.toast('Grenade!', 'warn'); }
      if (this.stun > 0) { this.stun -= dt; faceT = tA; }
      else if (this.mel > 0) {                    // a strike: wind up, step in, swing the rifle butt, recover
        const m0 = this.mel; this.mel += dt / 0.74; faceT = tA;
        if (this.mel > 0.3 && this.mel < 0.5 && d > 1.15) { W.slide(this, (dx / d) * 2.4 * dt, (dz / d) * 2.4 * dt, 0.32); speed = 2.4; }
        if (m0 < 0.46 && this.mel >= 0.46) {
          if (!P.dead && d < 2.3 && Math.abs(angDiff(this.yaw, tA)) < 1.1) { G.hurt(SYS.enemyDmg(this.lvl) * 2.6 * (1 + this.tier * 0.25), this.x, this.z); G.knock(dx / d, dz / d, 6); G.audio.playAt('melee', this.x, this.z, 0.9); }
          else G.audio.playAt('melee', this.x, this.z, 0.25, 1.6);
        }
        if (this.mel >= 1) this.mel = 0;
      } else if (this.seen && !P.dead && this.meleeT <= 0 && d < (this.arch === 'rush' ? 2.2 : 1.9)) {
        this.mel = 1e-4; this.meleeT = 1.25 + R() * 0.7; faceT = tA; if (R() < 0.5) G.audio.playAt('shout', this.x, this.z, 0.55, 1.1 + R() * 0.2);
      } else if (this.arch === 'rush') {
        if (d > 1.6) { const sx = P.x + (d < 9 && los ? Math.cos(tA) * this.strafe * 4 : 0), sz = P.z - (d < 9 && los ? Math.sin(tA) * this.strafe * 4 : 0); this.moveTo(sx, sz, run * (d < 6 ? 0.7 : 1), dt, 1.2); speed = this.spd; }
        if (R() < dt * 0.4) this.strafe = -this.strafe;
        if (los && inRange) { aim = true; faceT = tA; this.fireBurst(dt); } else faceT = Math.atan2(this.mvx || dx, this.mvz || dz);
      } else if (this.arch === 'heavy') {
        if (!los || d > 16) { this.moveTo(los ? P.x : this.lsx, los ? P.z : this.lsz, run, dt, 3); speed = this.spd; }
        faceT = los ? tA : Math.atan2(this.mvx || dx, this.mvz || dz); if (los && inRange) { aim = true; this.fireBurst(dt); }
      } else {
        // cover fighters: seek -> hide -> peek, relocate when flanked, advance when the target is lost
        if (this.mode === 'seek' || !this.cov) { if (!this.cov || this.mode === 'seek') { this.pickCover(this.arch === 'sniper' ? 42 : Math.min(A.range * 0.6, 17), since > 6 ? (this.x + this.lsx) / 2 : this.x, since > 6 ? (this.z + this.lsz) / 2 : this.z); this.mode = this.cov ? 'move' : 'open'; this.hideT = 0.3; } }
        if (this.mode === 'move') { if (this.moveTo(this.cov.x, this.cov.z, run, dt, 0.5)) { this.mode = 'hide'; this.hideT = this.cd * (0.4 + R() * 0.6); } speed = this.spd; faceT = Math.atan2(this.mvx || dx, this.mvz || dz); if (los && d < 12) { aim = true; faceT = tA; this.fireBurst(dt); } }
        else if (this.mode === 'hide') {
          this.crouch = this.cov.low; faceT = tA; this.hideT -= dt; aim = true;
          if (this.covAge > 9 + R() * 5 || d < 5.5 || (since > 7 && this.covAge > 3)) { this.mode = 'seek'; this.cov = null; this.crouch = false; }
          else if (this.hideT <= 0) { this.mode = 'peek'; this.burst = 0; this.peekT = 0; this.tellT = 0; if (!this.cov.low) { const sd = this.cov.t > 0.5 ? 1 : -1; this.sx = this.cov.x + this.cov.ex * sd * 1.3; this.sz = this.cov.z + this.cov.ez * sd * 1.3; } }
        } else if (this.mode === 'peek') {
          this.crouch = false; faceT = tA; aim = true; this.peekT += dt;
          if (!this.cov.low && hyp(this.sx - this.x, this.sz - this.z) > 0.3 && this.peekT < 1.2) { this.moveTo(this.sx, this.sz, 2.6, dt, 0.25); speed = this.spd; }
          else if (los && inRange) { if (this.fireBurst(dt)) { this.mode = this.cov.low ? 'hide' : 'back'; this.hideT = A.cd[0] + R() * (A.cd[1] - A.cd[0]); } }
          else if (this.peekT > 2.2) { this.mode = since > 5 ? 'seek' : (this.cov.low ? 'hide' : 'back'); if (this.mode === 'seek') this.cov = null; this.hideT = 0.8; }
        } else if (this.mode === 'back') { if (this.moveTo(this.cov.x, this.cov.z, 2.8, dt, 0.4)) this.mode = 'hide'; speed = this.spd; faceT = tA; aim = true; }
        else {                                    // no cover nearby: keep distance and circle
          const want = Math.min(A.range * 0.6, 16); if (!los || d > want + 4) { this.moveTo(los ? P.x : this.lsx, los ? P.z : this.lsz, run, dt, 3); speed = this.spd; } else if (d < want - 5) { this.moveTo(this.x - (dx / d) * 4 + Math.cos(tA) * this.strafe * 3, this.z - (dz / d) * 4 - Math.sin(tA) * this.strafe * 3, run * 0.7, dt, 1); speed = this.spd; }
          faceT = tA; if (los && inRange) { aim = true; this.fireBurst(dt); } if (R() < dt * 0.12) this.mode = 'seek';
        }
      }
      if (since > 25 && d > 70) { this.aware = false; this.mode = 'idle'; this.cov = null; this.crouch = false; }
    }
    if (faceT != null) this.yaw = dampAng(this.yaw, faceT, this.arch === 'heavy' ? 5 : 10, dt);
    this.pitch = aim ? clamp(Math.atan2(P.h * 0.62 - 1.35, Math.max(1, d)), -0.6, 0.6) : 0;
    const far = d > 120; rig.root.position.set(this.x, 0, this.z); rig.root.rotation.y = this.yaw; rig.root.visible = !far || this.aware;
    const vx = (this.x - (this._lx ?? this.x)) / Math.max(dt, 1e-3), vz = (this.z - (this._lz ?? this.z)) / Math.max(dt, 1e-3), vl = Math.hypot(vx, vz), cy = Math.cos(this.yaw), sy = Math.sin(this.yaw); this._lx = this.x; this._lz = this.z;
    if (!far) rig.pose({ speed, mx: vl > 0.3 ? (vx * cy - vz * sy) / vl : 0, mz: vl > 0.3 ? (vx * sy + vz * cy) / vl : 1, aim: aim && this.aware && !(this.mel > 0), pitch: this.pitch, crouch: this.crouch && !(this.mel > 0), melee: this.mel }, dt);
    rig.root.updateMatrixWorld(true);
  }
  // fires the current burst; returns true when the burst is finished
  fireBurst(dt) {
    const A = this.A, G = this.G; if (this.stun > 0 || this.mel > 0) return false;
    if (this.burst <= 0) { this.cd -= dt; if (this.cd > 0) return false; this.burst = Math.round(A.burst[0] + R() * (A.burst[1] - A.burst[0])); this.tellT = 0; }
    if (A.tell && this.tellT < A.tell) {              // marksman warning: a visible sight line before the shot
      this.tellT += dt; const m = this.rig.muzzle(V); G.fx.tracer(m, V2.set(G.P.x, G.P.h * 0.62, G.P.z), [2.2, 0.1, 0.1], 0.035, 0.5 + (this.tellT / A.tell) * 1.5); return false;
    }
    if (this.fireT <= 0) { this.fireT = 60 / RPM[A.wpn]; this.shoot(); this.burst--; this.firing = true; if (this.burst <= 0) { this.cd = A.cd[0] + R() * (A.cd[1] - A.cd[0]); return true; } }
    return false;
  }
}
