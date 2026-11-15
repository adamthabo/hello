// SCHWARZSTART · core game: player, camera, cover, weapons, effects, loot
import * as THREE from 'three';
import { Rig, LOOKS } from './rig.js';
import { F_LOW, F_WALL } from './geom.js';
import * as SYS from './systems.js';
import { WPN, RAR, RARHEX, hasPerk } from './systems.js';
import { clamp, lerp, damp, dampAng, angDiff, hyp, R, store, IS_TOUCH } from './util.js';
import { Enemy } from './ai.js';
import { installOps } from './ops.js';

const V = new THREE.Vector3(), V2 = new THREE.Vector3(), V3 = new THREE.Vector3();
const EYE = 1.56, PR = 0.34;

class FX {
  constructor(scene) {
    const NT = 96; this.NT = NT; this.tr = []; const tg = new THREE.BufferGeometry();
    this.tp = new Float32Array(NT * 6); this.tc = new Float32Array(NT * 6); tg.setAttribute('position', new THREE.BufferAttribute(this.tp, 3)); tg.setAttribute('color', new THREE.BufferAttribute(this.tc, 3));
    this.lines = new THREE.LineSegments(tg, new THREE.LineBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false })); this.lines.frustumCulled = false; this.lines.renderOrder = 30; scene.add(this.lines);
    const NP = 700; this.NP = NP; this.pp = new Float32Array(NP * 3); this.pc = new Float32Array(NP * 4); this.ps = new Float32Array(NP); this.pv = new Float32Array(NP * 3); this.pl = new Float32Array(NP * 2); this.pg = new Float32Array(NP); this.pi = 0;
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(this.pp, 3)); pg.setAttribute('aC', new THREE.BufferAttribute(this.pc, 4)); pg.setAttribute('aS', new THREE.BufferAttribute(this.ps, 1));
    this.pm = new THREE.ShaderMaterial({ uniforms: { uPx: { value: 600 } }, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, fog: false,
      vertexShader: 'attribute vec4 aC; attribute float aS; uniform float uPx; varying vec4 vC; void main(){ vC = aC; vec4 mv = modelViewMatrix * vec4( position, 1.0 ); gl_Position = projectionMatrix * mv; gl_PointSize = clamp( aS * uPx / max( 0.3, -mv.z ), 0.0, 260.0 ); }',
      fragmentShader: 'varying vec4 vC; void main(){ float r = length( gl_PointCoord - 0.5 ) * 2.0; float a = smoothstep( 1.0, 0.2, r ); if ( a < 0.01 ) discard; gl_FragColor = vec4( vC.rgb * a * abs( vC.a ), vC.a > 0.0 ? a * vC.a : 0.0 ); }' });
    this.points = new THREE.Points(pg, this.pm); this.points.frustumCulled = false; this.points.renderOrder = 31; scene.add(this.points);
  }
  tracer(a, b, col, life = 0.07, w = 1) { if (this.tr.length >= this.NT) this.tr.shift(); this.tr.push({ a: [a.x, a.y, a.z], b: [b.x, b.y, b.z], c: col, t: life, l: life, w }); }
  // alpha > 0: lit dust/snow (alpha blended); alpha < 0: emissive sparks (additive)
  puff(x, y, z, n, col, size, speed, life, alpha = 0.6, grav = -2, up = 0.5) {
    for (let i = 0; i < n; i++) {
      const k = this.pi = (this.pi + 1) % this.NP, a = Math.random() * 6.2832, e = Math.random() * 1.2 - 0.2, s = speed * (0.3 + Math.random());
      this.pp[k * 3] = x; this.pp[k * 3 + 1] = y; this.pp[k * 3 + 2] = z; this.pv[k * 3] = Math.cos(a) * Math.cos(e) * s; this.pv[k * 3 + 1] = Math.sin(e) * s + up; this.pv[k * 3 + 2] = Math.sin(a) * Math.cos(e) * s;
      this.pc[k * 4] = col[0]; this.pc[k * 4 + 1] = col[1]; this.pc[k * 4 + 2] = col[2]; this.pc[k * 4 + 3] = alpha; this.ps[k] = size * (0.6 + Math.random() * 0.8); this.pl[k * 2] = this.pl[k * 2 + 1] = life * (0.6 + Math.random() * 0.8); this.pg[k] = grav;
    }
  }
  update(dt, pxs) {
    this.pm.uniforms.uPx.value = pxs;
    for (let i = this.tr.length - 1; i >= 0; i--) { const t = this.tr[i]; t.t -= dt; if (t.t <= 0) this.tr.splice(i, 1); }
    for (let i = 0; i < this.NT; i++) { const t = this.tr[i], o = i * 6; if (!t) { this.tp[o + 1] = this.tp[o + 4] = -999; continue; } const f = clamp(t.t / t.l, 0, 1) * t.w; this.tp.set(t.a, o); this.tp.set(t.b, o + 3); for (let k = 0; k < 3; k++) { this.tc[o + k] = t.c[k] * f * 0.25; this.tc[o + 3 + k] = t.c[k] * f; } }
    this.lines.geometry.attributes.position.needsUpdate = true; this.lines.geometry.attributes.color.needsUpdate = true;
    for (let k = 0; k < this.NP; k++) {
      if (this.pl[k * 2] <= 0) continue; this.pl[k * 2] -= dt;
      if (this.pl[k * 2] <= 0) { this.ps[k] = 0; continue; }
      this.pv[k * 3 + 1] += this.pg[k] * dt; this.pp[k * 3] += this.pv[k * 3] * dt; this.pp[k * 3 + 1] += this.pv[k * 3 + 1] * dt; this.pp[k * 3 + 2] += this.pv[k * 3 + 2] * dt;
      if (this.pp[k * 3 + 1] < 0.02) { this.pp[k * 3 + 1] = 0.02; this.pv[k * 3 + 1] = 0; this.pv[k * 3] *= 0.6; this.pv[k * 3 + 2] *= 0.6; }
      const f = this.pl[k * 2] / this.pl[k * 2 + 1]; this.pc[k * 4 + 3] = Math.sign(this.pc[k * 4 + 3]) * Math.min(Math.abs(this.pc[k * 4 + 3]), f * 1.2);
    }
    const g = this.points.geometry.attributes; g.position.needsUpdate = true; g.aC.needsUpdate = true; g.aS.needsUpdate = true;
  }
}

export class Game {
  constructor(gfx, world, map, audio) {
    this.gfx = gfx; this.world = world; this.map = map; this.audio = audio; this.scene = gfx.scene; this.fx = new FX(gfx.scene);
    this.en = []; this.loot = []; this.nades = []; this.turret = null; this.t = 0; this.paused = true; this.inp = null; this.ui = null;
    this.cam = { yaw: 2.4, pitch: -0.08, dist: 3.1, sh: 1, shT: 1, fov: 58, shake: 0, kick: 0 };
    this.cap = gfx.tier === 'low' ? 12 : 18; this.prompt = null; this.aimT = null; this.combatT = 0; this.wp = null;
    this.autoAim = IS_TOUCH; this.sens = 1; this.invY = false; this.fovBase = 56; this.assist = 1; this.motion = 1; this.diff = 1; this.diffHp = 1; this.haptics = true;
    this.load();
    const P = this.P = { x: 0, z: 0, yaw: 0, hp: 1, arm: 1, st: 'free', cov: null, peek: false, roll: 0, rdx: 0, rdz: 0, vault: 0, vx0: 0, vz0: 0, vx1: 0, vz1: 0, fireT: 0, relT: 0, relD: 1, bloom: 0, lastHit: -99, lastShot: -99, moving: 0, dead: 0, sprint: false, aim: false, crouch: false, kitT: 0, hotT: 0, sk: [0, 0], nadeT: 0, markT: 0, covT: 0, h: 1.75, spd: 0 };
    P.rig = new Rig(gfx, this.playerLook(), this.curW().cls); this.scene.add(P.rig.root);
    this.mags = this.S.wpn.map((w) => this.magSize(w));
    const sp = this.S.pos || map.hub; P.x = sp[0]; P.z = sp[1]; P.hp = this.D.maxHP; P.arm = this.D.maxArmor;
    gfx.time = this.S.time ?? 15.75;
    this.initOps();
  }
  // ---------------------------------------------------------------- save
  load() {
    let S = store.get('save', null);
    if (!S || S.v !== SYS.VERSION) S = SYS.newSave();
    let mx = 1; for (const it of [...S.wpn, ...S.inv, ...Object.values(S.gear)]) if (it && it.id >= mx) mx = it.id + 1; SYS.setUid(mx);
    this.S = S; this.D = SYS.derive(S);
    if (S.opt.autoAim != null) this.autoAim = S.opt.autoAim; if (S.opt.sens) this.sens = S.opt.sens; this.invY = !!S.opt.invY;
  }
  save() { if (this.noSave) { const sv = store.get('save', null) || SYS.newSave(); sv.opt = this.S.opt; sv.look = this.S.look; if (this.S.tag) sv.tag = this.S.tag; this.saved = store.set('save', sv); return; } const S = this.S, P = this.P; S.pos = P.dead ? null : [Math.round(P.x * 10) / 10, Math.round(P.z * 10) / 10]; S.time = this.gfx.time; this.saved = store.set('save', S); }
  wipe() { store.del('save'); }
  recalc() { const o = this.D; this.D = SYS.derive(this.S); if (o) { this.P.hp = Math.min(this.P.hp, this.D.maxHP); this.P.arm = Math.min(this.P.arm, this.D.maxArmor); } }
  curW() { return this.S.wpn[this.S.cur]; }
  magSize(w) { return Math.round(WPN[w.cls].mag * (hasPerk(w, 'mag') ? 1.25 : 1)); }
  resMax(cls) { return Math.round(WPN[cls].res * this.D.resMul); }

  // ---------------------------------------------------------------- frame
  playerLook() { const L = this.S.look || {}; return { outfit: L.outfit || LOOKS.player.outfit, pal: { ...LOOKS.player.pal, ...(L.pal || {}) } }; }
  update(dt) {
    if (this.paused) return; this.t += dt; this.S.stats.t += dt;
    const P = this.P;
    this.updPlayer(dt); this.updCamera(dt);
    for (let i = this.en.length - 1; i >= 0; i--) { const e = this.en[i]; e.update(dt); if (e.gone) { this.scene.remove(e.rig.root); e.rig.dispose(); this.en.splice(i, 1); } }
    this.updNades(dt); this.updTurret(dt); this.updLoot(dt); this.updOps(dt);
    this.fx.update(dt, this.gfx.snowU.uPx.value);
    this.combatT -= dt; this.gfx.cam = this.cam;
    const g = this.gfx; g.muzzle.intensity = damp(g.muzzle.intensity, 0, 30, dt);
    P.rig.headPos(V); const f = this.fwd(V2); g.head.position.copy(V).addScaledVector(f, 0.15); g.head.target.position.copy(V).addScaledVector(f, 12); g.head.target.position.y += 0.9; g.head.intensity = g.night > 0.35 && !P.dead ? 95 * g.night : 0;
    g.mFin.uniforms.uHurt.value = damp(g.mFin.uniforms.uHurt.value, P.hp < this.D.maxHP * 0.35 && !P.dead ? 0.55 : 0, 4, dt);
    this.saveT = (this.saveT || 0) + dt; if (this.saveT > 20) { this.saveT = 0; this.save(); }
  }
  fwd(out, flat = false) { const c = this.cam, cp = flat ? 1 : Math.cos(c.pitch); return out.set(Math.sin(c.yaw) * cp, flat ? 0 : Math.sin(c.pitch), Math.cos(c.yaw) * cp); }

  // ---------------------------------------------------------------- player
  updPlayer(dt) {
    const P = this.P, I = this.inp, W = this.world, c = this.cam, D = this.D;
    if (P.dead) { P.dead += dt; P.rig.pose({ dead: 1 }, dt); if (P.dead > 3.4) this.respawn(); return; }
    // look
    c.yaw -= I.lx * 0.0026 * this.sens; c.pitch = clamp(c.pitch - I.ly * 0.0022 * this.sens * (this.invY ? -1 : 1), -1.05, 0.95); I.lx = I.ly = 0;
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), rx = -fz, rz = fx;
    let mx = I.mx * rx + I.my * fx, mz = I.mx * rz + I.my * fz; const ml = hyp(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
    const wantFire = I.fire, wantAim = I.aim || (wantFire && this.autoAim);
    P.aim = (wantAim || wantFire) && !P.roll && !P.vault; P.sprint = I.sprint && ml > 0.6 && !P.aim && P.st === 'free' && I.my > 0.2;
    if (I.was('shoulder')) c.shT = -c.shT;
    for (let i = 0; i < 3; i++) if (I.was('w' + (i + 1))) this.swap(i);
    if (I.was('swap')) this.swap(this.S.cur === 0 ? 1 : this.S.cur === 1 ? (this.mags[0] + this.mags[1] === 0 ? 2 : 0) : 0);
    if (I.was('reload')) this.reload();
    if (I.was('kit')) this.useKit(); if (I.was('nade')) this.throwNade(); if (I.was('s1')) this.skillPulse(); if (I.was('s2')) this.skillTurret();
    if (I.was('roll') && !P.roll && !P.vault && P.st !== 'vault') this.startRoll(ml > 0.2 ? mx / (ml || 1) : -fx, ml > 0.2 ? mz / (ml || 1) : -fz);
    const coverKey = I.was('cover');
    let speed = 0;
    if (P.roll > 0) {
      P.roll += dt / 0.52; const s = 9.6 * (1 - P.roll * 0.45); P.x += P.rdx * s * dt; P.z += P.rdz * s * dt; W.collide(P, PR); P.yaw = Math.atan2(P.rdx, P.rdz); if (P.roll >= 1) P.roll = 0; speed = 0;
    } else if (P.vault > 0) {
      P.vault += dt / 0.42; const k = Math.min(1, P.vault); P.x = lerp(P.vx0, P.vx1, k); P.z = lerp(P.vz0, P.vz1, k); if (P.vault >= 1) { P.vault = 0; P.st = 'free'; } speed = 4;
    } else if (P.dash) {
      const d = P.dash, ddx = d.x - P.x, ddz = d.z - P.z, l = hyp(ddx, ddz) || 1; d.t += dt;
      if (l < 1.5 || d.t > 3.2) { P.dash = null; this.enterCover(ddx / l, ddz / l, true); }
      else { P.x += (ddx / l) * 6.8 * dt; P.z += (ddz / l) * 6.8 * dt; W.collide(P, PR); P.yaw = dampAng(P.yaw, Math.atan2(ddx, ddz), 14, dt); speed = 6.8; if (ml > 0.5 && (mx * ddx + mz * ddz) / l < -0.3) P.dash = null; }
    } else if (P.st === 'cover') {
      const cv = P.cov, s = cv.s; P.peek = P.aim; P.covT += dt;
      const along = mx * cv.dx + mz * cv.dz, away = mx * cv.nx + mz * cv.nz;
      if (coverKey) { if (cv.low && away < -0.5) this.tryVault(); else if (!this.coverToCover()) this.leaveCover(); }
      else if (away > 0.75 && ml > 0.7) { P.awayT = (P.awayT || 0) + dt; if (P.awayT > 0.22) this.leaveCover(); } else P.awayT = 0;
      if (P.st === 'cover') {
        const L = cv.len; cv.t = clamp(cv.t + (along * (P.peek ? 1.4 : 2.6) * dt) / L, 0.25 / L > 0.5 ? 0.5 : 0.25 / L, 1 - (0.25 / L > 0.5 ? 0.5 : 0.25 / L));
        const off = PR + 0.1 + (P.peek && !cv.low ? 0.5 : 0);
        P.x = damp(P.x, s.x1 + (s.x2 - s.x1) * cv.t + cv.nx * off, 16, dt); P.z = damp(P.z, s.z1 + (s.z2 - s.z1) * cv.t + cv.nz * off, 16, dt);
        speed = Math.abs(along) * 2.6; if (Math.abs(along) > 0.1) P.covDir = Math.sign(along);
        P.yaw = dampAng(P.yaw, P.peek ? c.yaw : Math.atan2(cv.dx * (P.covDir || 1), cv.dz * (P.covDir || 1)), 12, dt);
      }
    } else {
      const sp = (P.sprint ? 6.5 * D.sprint : P.aim ? 2.5 : 4.3) * (ml > 0.05 ? Math.min(1, ml * 1.15) : 0);
      P.x += mx * sp * dt; P.z += mz * sp * dt; speed = sp * (ml > 0.05 ? 1 : 0);
      const hitWall = W.collide(P, PR);
      if (P.aim) P.yaw = dampAng(P.yaw, c.yaw, 16, dt); else if (ml > 0.1) P.yaw = dampAng(P.yaw, Math.atan2(mx, mz), 11, dt);
      if (coverKey || (this.autoAim && hitWall && this.combatT > 0 && ml > 0.6 && !P.aim)) this.enterCover(mx || fx, mz || fz, coverKey);
    }
    const b = W.core, bm = W.coreMargin; P.x = clamp(P.x, b[0] + bm[0], b[2] - bm[2]); P.z = clamp(P.z, b[1] + bm[1], b[3] - bm[3]);
    P.spd = speed; P.moving = speed > 0.5 ? 1 : 0;
    P.crouch = P.st === 'cover' && P.cov.low && !P.peek; P.h = P.crouch ? 1.0 : P.roll ? 0.9 : 1.75;
    // weapon
    const w = this.curW(), Wd = WPN[w.cls]; P.fireT -= dt; P.bloom = damp(P.bloom, 0, 5, dt);
    if (P.relT > 0) { P.relT -= dt; if (P.relT <= 0) this.finishReload(); }
    if (wantFire && !P.roll && !P.vault && P.relT <= 0) { if (this.mags[this.S.cur] <= 0) this.reload(); else if (P.fireT <= 0 && (Wd.auto || !P.trig)) { this.fire(); P.trig = true; } } if (!wantFire) P.trig = false;
    this.pickTarget();
    // recovery
    const since = this.noRegen ? -1 : this.t - P.lastHit;
    if (since > 7 && P.arm < D.maxArmor) P.arm = Math.min(D.maxArmor, P.arm + D.maxArmor * 0.14 * D.armRegen * dt);
    if (since > 4 && P.hp < D.maxHP) P.hp = Math.min(D.maxHP, P.hp + D.maxHP * 0.045 * D.regen * dt);
    if (P.hotT > 0 && !this.noRegen) { P.hotT -= dt; P.arm = Math.min(D.maxArmor, P.arm + D.maxArmor * 0.06 * dt); }
    for (let i = 0; i < 2; i++) P.sk[i] = Math.max(0, P.sk[i] - dt * D.haste); P.nadeT = Math.max(0, P.nadeT - dt * D.haste); P.kitT = Math.max(0, P.kitT - dt);
    if (this.S.nades < 2 && P.nadeT <= 0) { this.S.nades++; if (this.S.nades < 2) P.nadeT = 20; }
    // steps
    if (speed > 0.5 && !P.roll) { P.stepT = (P.stepT || 0) - dt * speed; if (P.stepT <= 0) { P.stepT = P.sprint ? 2.5 : 2.1; this.audio.play('step', 0.25 + (P.sprint ? 0.15 : 0), 0.9 + Math.random() * 0.25); if (Math.random() < 0.6) this.fx.puff(P.x, 0.05, P.z, 2, [0.8, 0.84, 0.9], 0.12, 0.6, 0.5, 0.35, -1, 0.5); } }
    const rig = P.rig; rig.root.position.set(P.x, 0, P.z); rig.root.rotation.y = P.yaw;
    const cyw = Math.cos(P.yaw), syw = Math.sin(P.yaw), lml = ml > 0.05 && P.st !== 'cover' ? 1 / Math.max(ml, 1e-3) : 0;
    rig.pose({ speed, mx: lml ? (mx * cyw - mz * syw) * lml : 0, mz: lml ? (mx * syw + mz * cyw) * lml : 1, aim: P.aim || this.t - P.lastShot < 0.5, pitch: c.pitch, crouch: P.crouch, reload: P.relT > 0 ? 1 - P.relT / P.relD : 0, roll: P.roll, lean: P.st === 'cover' && P.peek && !P.cov.low ? (P.covDir || 1) * -0.5 : 0 }, dt);
    rig.root.updateMatrixWorld(true);
  }
  enterCover(dx, dz, forced) {
    const P = this.P, l = hyp(dx, dz) || 1, cv = this.world.cover(P.x, P.z, forced ? 2.2 : 0.9, dx / l, dz / l); if (!cv || cv.len < 0.9) return false;
    P.st = 'cover'; P.cov = cv; P.covT = 0; P.awayT = 0; P.covDir = 1; this.audio.play('cover', 0.35); return true;
  }
  leaveCover() { const P = this.P; if (P.st === 'cover') { P.st = 'free'; P.cov = null; P.peek = false; } }
  coverToCover() {            // run to the cover the camera is looking at
    const P = this.P, c = this.cam, fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); let best = null, bs = 1e9;
    for (const s of this.world.coversNear(P.x + fx * 9, P.z + fz * 9, 9, [])) {
      if (s === P.cov.s) continue; const mx = (s.x1 + s.x2) / 2, mz = (s.z1 + s.z2) / 2, dx = mx - P.x, dz = mz - P.z, d = hyp(dx, dz); if (d < 2.5 || d > 17) continue;
      const dot = (dx * fx + dz * fz) / d; if (dot < 0.86) continue; const sc = d * (1.6 - dot); if (sc < bs) { bs = sc; best = s; }
    }
    if (!best) return false;
    const mx = (best.x1 + best.x2) / 2, mz = (best.z1 + best.z2) / 2; this.leaveCover(); P.dash = { x: mx, z: mz, t: 0 }; this.audio.play('roll', 0.25); return true;
  }
  tryVault() {
    const P = this.P, cv = P.cov, W = this.world, p = { x: 0, z: 0 };
    for (let d = 1.0; d <= 4.2; d += 0.4) { p.x = P.x - cv.nx * d; p.z = P.z - cv.nz * d; const ox = p.x, oz = p.z; W.collide(p, PR); if (hyp(p.x - ox, p.z - oz) < 0.05 && W.walkable(p.x, p.z)) { P.vx0 = P.x; P.vz0 = P.z; P.vx1 = p.x; P.vz1 = p.z; P.vault = 0.001; P.st = 'vault'; P.cov = null; this.audio.play('cover', 0.4, 0.8); return; } }
    this.leaveCover();
  }
  startRoll(dx, dz) { const P = this.P; this.leaveCover(); P.roll = 0.001; P.rdx = dx; P.rdz = dz; P.relT = P.relT > 0 ? P.relT : 0; this.audio.play('roll', 0.3); }
  swap(i) { const S = this.S, P = this.P; if (i === S.cur || !S.wpn[i]) return; S.cur = i; P.relT = 0; P.fireT = 0.35; P.rig.setGun(S.wpn[i].cls); this.audio.play('swap', 0.4); if (this.ui) this.ui.dirty = true; }
  reload() { const P = this.P, w = this.curW(), W = WPN[w.cls], i = this.S.cur; if (P.relT > 0 || this.mags[i] >= this.magSize(w)) return; if (!W.side && (this.S.res[w.cls] || 0) <= 0) { if (this.t - (P.dryT || 0) > 1) { P.dryT = this.t; this.audio.play('dry', 0.4); this.ui.toast('No ammo for this weapon'); } return; } P.relD = P.relT = W.rel * (hasPerk(w, 'rel') ? 0.8 : 1); this.audio.play('reload', 0.5); }
  finishReload() { const w = this.curW(), W = WPN[w.cls], i = this.S.cur, need = this.magSize(w) - this.mags[i]; if (W.side) this.mags[i] += need; else { const n = Math.min(need, this.S.res[w.cls] || 0); this.mags[i] += n; this.S.res[w.cls] -= n; } this.audio.play('cock', 0.45); }

  pickTarget() {
    const P = this.P, c = this.cam, cp = this.gfx.camera.position, f = this.fwd(V), W = WPN[this.curW().cls]; let best = null, bs = 1e9; const cone = this.autoAim ? 0.4 * this.assist : 0.07 * this.assist;
    for (const e of this.en) {
      if (e.dead || e.noLock) continue; const dx = e.x - cp.x, dy = e.aimY() - cp.y, dz = e.z - cp.z, d = Math.hypot(dx, dy, dz); if (d > W.range * 1.25 || d < 0.5) continue;
      const ang = Math.acos(clamp((dx * f.x + dy * f.y + dz * f.z) / d, -1, 1)); if (ang > cone) continue; const sc = ang * (1 + d / 50) + (e === this.aimT ? -0.06 : 0); if (sc < bs) { bs = sc; best = e; }
    }
    if (best && !this.world.los(P.x, P.h * 0.88, P.z, best.x, best.aimY(), best.z)) best = null;
    this.aimT = best;
    if (best && this.autoAim && P.aim) {         // ease the camera onto the target
      const dx = best.x - cp.x, dy = best.aimY() - cp.y, dz = best.z - cp.z, ty = Math.atan2(dx, dz), tp = Math.atan2(dy, hyp(dx, dz)), k = 1 - Math.exp(-7 * (1 / 60));
      c.yaw += angDiff(c.yaw, ty) * k; c.pitch += (tp - c.pitch) * k;
    }
  }
  fire() {
    const P = this.P, w = this.curW(), W = WPN[w.cls], cam = this.gfx.camera, cp = cam.position, f = this.fwd(V), i = this.S.cur;
    this.mags[i]--; P.fireT = 60 / W.rpm; P.lastShot = this.t; this.combatT = 8;
    const sp = W.spread * (hasPerk(w, 'stab') ? 0.7 : 1) * (this.inp.aim ? 0.55 : 1) * (1 + P.bloom * 2.2) * (P.moving ? 1.25 : 1) * (this.autoAim && this.aimT && this.aimT.isRemote ? 1.8 : 1);
    P.bloom = Math.min(1.6, P.bloom + 0.16); P.rig.kick = Math.min(1, P.rig.kick + 0.5); this.cam.kick += W.kick * (this.autoAim ? 0.4 : 1);
    const mz = P.rig.muzzle(V2).clone(), base = SYS.wpnDmg(w) * w.q * this.D.dmgMul * (this.D.flood && this.world.power[this.world.district(P.x, P.z)] > 0.5 ? 1.1 : 1);
    const T = this.aimT, n = W.pellets || 1; let any = false;
    for (let k = 0; k < n; k++) {
      let dx = f.x, dy = f.y, dz = f.z;
      if (T && this.autoAim) { const hs = Math.random() < 0.14; dx = T.x - cp.x; dy = (hs ? T.headY() : T.aimY()) - cp.y; dz = T.z - cp.z; const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l; }
      const s1 = (Math.random() + Math.random() - 1) * sp, s2 = (Math.random() + Math.random() - 1) * sp;
      dx += s1 * Math.cos(this.cam.yaw) * 1 + 0; dz += -s1 * Math.sin(this.cam.yaw); dy += s2; const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l;
      const maxT = W.range * 1.7, hw = this.world.ray(cp.x, cp.y, cp.z, dx, dy, dz, maxT); let bt = hw ? hw.t : maxT, he = null, head = false;
      for (const e of this.en) { if (e.dead) continue; const r = e.rayHit(cp.x, cp.y, cp.z, dx, dy, dz); if (r && r.t < bt && r.t > this.cam.dist * 0.6) { bt = r.t; he = e; head = r.head; } }
      let hx = cp.x + dx * bt, hy = cp.y + dy * bt, hz = cp.z + dz * bt;
      const mdx = hx - mz.x, mdy = hy - mz.y, mdz = hz - mz.z, ml = Math.hypot(mdx, mdy, mdz), block = ml > 0.5 ? this.world.ray(mz.x, mz.y, mz.z, mdx / ml, mdy / ml, mdz / ml, ml - 0.25) : null;
      if (block && !block.ground) { hx = block.x; hy = block.y; hz = block.z; he = null; }
      this.fx.tracer(mz, V3.set(hx, hy, hz), [1.0, 0.78, 0.42], 0.06, 2.2);
      if (he) {
        const dist = hyp(he.x - P.x, he.z - P.z), fall = dist > W.range ? clamp(1 - (dist - W.range) / (W.range * 0.7), 0.25, 1) : 1;
        const crit = Math.random() * 100 < this.D.crit + (hasPerk(w, 'crit') ? 15 : 0) + (he.mark > 0 ? this.D.markCrit : 0);
        he.damage(base * fall * (head ? (W.hs || 1.6) * (1 + this.D.hs / 100) : 1) * (crit ? 1.5 : 1) * (he.mark > 0 ? 1.15 : 1), { head, crit, pierce: hasPerk(w, 'arm') ? 1.2 : 1, x: hx, y: hy, z: hz }); any = true;
      } else if (hw || block) { const nx = (block || hw).nx || 0, nz = (block || hw).nz || 0; this.fx.puff(hx + nx * 0.05, hy, hz + nz * 0.05, 4, (hw && hw.ground) ? [0.75, 0.8, 0.86] : [0.55, 0.5, 0.45], 0.1, 1.6, 0.4, 0.5, -3, 0.6); this.fx.puff(hx, hy, hz, 2, [3, 2, 0.8], 0.04, 3, 0.12, -1, -6, 0.5); }
    }
    this.fx.puff(mz.x, mz.y, mz.z, 1, [4, 2.6, 1.0], 0.34, 0.2, 0.05, -1, 0, 0); this.gfx.muzzle.position.copy(mz); this.gfx.muzzle.intensity = 60;
    this.audio.shot(w.cls, 0.55); if (any) this.ui.hitmark(false);
    for (const e of this.en) if (!e.dead && !e.aware && hyp(e.x - P.x, e.z - P.z) < 60) e.alert(1.2);
    if (this.mags[i] === 0) this.reload();
  }
  hurt(dmg, fromX, fromZ) {
    const P = this.P, D = this.D; if (P.dead) return; if (P.roll) dmg *= 0.2;
    dmg *= this.diff; if (this.mode && this.mode.pve) dmg = this.mode.pve(dmg); if (this.haptics && IS_TOUCH && navigator.vibrate) { try { navigator.vibrate(dmg > 12 ? 40 : 18); } catch (e) { } }
    P.lastHit = this.t; this.combatT = 8; const a = Math.min(P.arm, dmg); P.arm -= a; P.hp -= dmg - a; this.cam.shake = Math.min(0.5, this.cam.shake + 0.12);
    this.ui.hurt(Math.atan2(fromX - P.x, fromZ - P.z) - this.cam.yaw, a > 0 && P.arm <= 0); this.audio.play(P.arm > 0 ? 'hitArm' : 'hitBody', 0.5);
    if (a > 0 && P.arm <= 0) this.audio.play('armBreak', 0.6);
    if (P.hp <= 0 && this.mode && this.mode.serverDeath) P.hp = 1;          // in PvP rooms the server decides who is down
    else if (P.hp <= 0) { P.hp = 0; P.dead = 0.001; this.leaveCover(); P.roll = 0; this.audio.play('down', 0.7); if (!(this.mode && this.mode.onDeath && this.mode.onDeath())) this.ui.banner('KAMPFUNFÄHIG', 'The Lotsen carry you back to the Stützpunkt.', 'bad'); }
  }
  respawn() {
    if (this.mode && this.mode.respawn && this.mode.respawn()) return;
    const P = this.P, sp = this.S.spawn || this.map.hub; P.x = sp[0]; P.z = sp[1]; P.dead = 0; P.hp = this.D.maxHP; P.arm = this.D.maxArmor; P.st = 'free'; P.lastHit = -99; this.S.kits = Math.max(this.S.kits, 2);
    for (const e of this.en) { e.aware = false; e.home ? (e.despawn = true) : (e.gone = true); } this.ui.fade(); this.ui.dirty = true; this.resetSites();
  }
  useKit() { const P = this.P, D = this.D; if (P.dead || P.kitT > 0) return; if (this.mode && this.mode.kit && this.mode.kit()) return; if (this.S.kits <= 0) { this.ui.toast('No med kits'); return; } if (P.hp >= D.maxHP && P.arm >= D.maxArmor) return; this.S.kits--; P.kitT = 1.2; P.hp = D.maxHP; P.arm = D.maxArmor; if (D.hot) P.hotT = 8; this.audio.play('kit', 0.6); this.fx.puff(P.x, 1.1, P.z, 10, [0.5, 2.2, 1.2], 0.1, 1.2, 0.6, -0.8, 1, 0.5); }
  skillPulse() {
    const P = this.P; if (P.sk[0] > 0 || P.dead) return; P.sk[0] = 24; const r = 46 * this.D.pulse; let n = 0;
    for (const e of this.en) if (!e.dead && hyp(e.x - P.x, e.z - P.z) < r) { e.mark = 12 + (this.D.pulse > 1 ? 4 : 0); e.rig.setHighlight(true, SYS.FACTIONS[e.fac].hex); n++; }
    this.pulseT = 1; this.audio.play('pulse', 0.6); this.ui.toast(n ? `Pulse: ${n} contact${n > 1 ? 's' : ''}` : 'Pulse: no contacts');
    for (let i = 0; i < 40; i++) { const a = (i / 40) * 6.2832; this.fx.puff(P.x + Math.cos(a) * 1.2, 0.3, P.z + Math.sin(a) * 1.2, 1, [0.4, 1.6, 2.4], 0.14, 0, 0.7, -1, 0, 0); const k = this.fx.pi; this.fx.pv[k * 3] = Math.cos(a) * 16; this.fx.pv[k * 3 + 2] = Math.sin(a) * 16; }
  }
  // ---------------------------------------------------------------- grenades + turret
  throwNade() {
    const P = this.P; if (P.dead || this.S.nades <= 0) return; this.S.nades--; if (P.nadeT <= 0) P.nadeT = 20;
    const f = this.fwd(V), T = this.aimT, o = P.rig.chestPos(V2).clone(); let tx, tz;
    if (T) { tx = T.x; tz = T.z; } else { const h = this.world.ray(this.gfx.camera.position.x, this.gfx.camera.position.y, this.gfx.camera.position.z, f.x, f.y, f.z, 30); const d = h ? Math.min(h.t, 26) : 18; tx = this.gfx.camera.position.x + f.x * d; tz = this.gfx.camera.position.z + f.z * d; }
    this.spawnNade(o.x, o.y + 0.3, o.z, tx, tz, 1.05, true, SYS.wpnDmg(this.S.wpn[0]) * 9 * this.D.dmgMul * (1 + this.D.tk / 100)); this.audio.play('throw', 0.4);
  }
  spawnNade(x, y, z, tx, tz, time, mine, dmg) {
    const m = new THREE.Mesh(this.nadeGeo || (this.nadeGeo = new THREE.SphereGeometry(0.07, 8, 6)), this.nadeMat || (this.nadeMat = new THREE.MeshStandardMaterial({ color: 0x2c3a2c, roughness: 0.6 }))); m.castShadow = true; this.scene.add(m);
    const vy = (0 - y) / time + 0.5 * 9.8 * time; this.nades.push({ m, x, y, z, vx: (tx - x) / time, vy, vz: (tz - z) / time, t: time + 0.45, mine, dmg, beep: 0 });
  }
  updNades(dt) {
    for (let i = this.nades.length - 1; i >= 0; i--) {
      const n = this.nades[i]; n.t -= dt; if (n.y > 0.08 || n.vy > 0) { n.vy -= 9.8 * dt; n.x += n.vx * dt; n.y += n.vy * dt; n.z += n.vz * dt; if (n.y < 0.08) { n.y = 0.08; n.vy = 0; n.vx *= 0.25; n.vz *= 0.25; } }
      n.m.position.set(n.x, n.y, n.z); n.beep -= dt; if (!n.mine && n.beep <= 0) { n.beep = 0.3; this.fx.puff(n.x, n.y + 0.1, n.z, 1, [4, 0.4, 0.2], 0.12, 0, 0.12, -1, 0, 0); }
      if (n.t <= 0) { this.explode(n.x, n.y, n.z, n.mine, n.dmg); this.scene.remove(n.m); this.nades.splice(i, 1); }
    }
  }
  explode(x, y, z, mine, dmg, rad = 5.2) {
    const P = this.P; this.fx.puff(x, y + 0.3, z, 26, [0.35, 0.33, 0.3], 0.5, 5, 1.2, 0.7, -1.5, 1.5); this.fx.puff(x, y + 0.4, z, 14, [5, 3, 1], 0.6, 6, 0.22, -1, 0, 1); this.fx.puff(x, y + 0.2, z, 24, [4, 2.4, 0.8], 0.05, 12, 0.5, -1, -9, 3);
    this.gfx.muzzle.position.set(x, y + 1, z); this.gfx.muzzle.intensity = 400; const dp = hyp(P.x - x, P.z - z); this.cam.shake = Math.min(0.9, this.cam.shake + clamp(1 - dp / 25, 0, 1) * 0.7); this.audio.play('boom', clamp(1.1 - dp / 60, 0.15, 1));
    if (mine) { for (const e of this.en) { if (e.dead) continue; const d = hyp(e.x - x, e.z - z); if (d < rad && this.world.los(x, 0.9, z, e.x, 1.0, e.z)) e.damage(dmg * (1 - (d / rad) * 0.6), { x: e.x, y: 1.2, z: e.z, expl: 1 }); } }
    else if (dp < rad && this.world.los(x, 0.9, z, P.x, P.h * 0.6, P.z)) this.hurt(dmg * (1 - (dp / rad) * 0.6), x, z);
  }
  skillTurret() {
    const P = this.P; if (P.sk[1] > 0 || P.dead) return; P.sk[1] = 48; if (this.turret) this.scene.remove(this.turret.g);
    const g = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: 0x2a3036, roughness: 0.5, metalness: 0.4 }), hd = new THREE.Group();
    for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.7, 6), mat); const a = (i / 3) * 6.2832; l.position.set(Math.cos(a) * 0.22, 0.32, Math.sin(a) * 0.22); l.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); l.castShadow = true; g.add(l); }
    const bd = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.34), mat), br = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.4, 8), mat), led = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 4, 5) }));
    br.rotation.x = Math.PI / 2; br.position.z = 0.34; led.position.set(0, 0.12, -0.1); bd.castShadow = true; hd.add(bd, br, led); hd.position.y = 0.72; g.add(hd);
    const fx = Math.sin(this.cam.yaw), fz = Math.cos(this.cam.yaw), p = { x: P.x + fx * 1.2, z: P.z + fz * 1.2 }; this.world.collide(p, 0.3); g.position.set(p.x, 0, p.z); this.scene.add(g);
    this.turret = { g, hd, x: p.x, z: p.z, t: 22 + (this.D.turret > 1 ? 8 : 0), ft: 0, yaw: this.cam.yaw, hp: 1 }; this.audio.play('deploy', 0.5);
  }
  updTurret(dt) {
    const T = this.turret; if (!T) return; T.t -= dt; T.ft -= dt; if (T.t <= 0) { this.scene.remove(T.g); this.turret = null; this.fx.puff(T.x, 0.6, T.z, 8, [0.4, 0.4, 0.4], 0.2, 1.5, 0.6); return; }
    let best = null, bd = 30; for (const e of this.en) { if (e.dead) continue; const d = hyp(e.x - T.x, e.z - T.z); if (d < bd && this.world.los(T.x, 0.8, T.z, e.x, e.aimY(), e.z)) { bd = d; best = e; } }
    if (best) { T.yaw = dampAng(T.yaw, Math.atan2(best.x - T.x, best.z - T.z), 9, dt); if (T.ft <= 0) { T.ft = 0.13; const a = V.set(T.x + Math.sin(T.yaw) * 0.5, 0.74, T.z + Math.cos(T.yaw) * 0.5), b = V2.set(best.x + (Math.random() - 0.5) * 0.3, best.aimY(), best.z + (Math.random() - 0.5) * 0.3); this.fx.tracer(a, b, [0.5, 0.9, 1.0], 0.05, 1.6); if (Math.random() < 0.8) best.damage(SYS.wpnDmg(this.S.wpn[0]) * 0.34 * this.D.turret * (1 + this.D.tk / 100), { x: b.x, y: b.y, z: b.z, turret: 1 }); this.audio.shot('smg', clamp(0.35 - hyp(T.x - this.P.x, T.z - this.P.z) / 120, 0.05, 0.3), 1.5); if (!best.aware) best.alert(0.3); } }
    T.hd.rotation.y = T.yaw - 0;
  }
  // ---------------------------------------------------------------- loot
  drop(x, z, kind, data) {
    const rar = kind === 'item' ? data.rar : kind === 'kit' ? 1 : kind === 'marken' ? 0 : 0, col = kind === 'item' ? RARHEX[rar] : kind === 'kit' ? 0x52e08a : kind === 'marken' ? 0xe8d9a0 : 0xd9d2c0;
    const g = new THREE.Group(), c = new THREE.Color(col);
    const bx = new THREE.Mesh(this.lootGeo || (this.lootGeo = new THREE.BoxGeometry(0.34, 0.2, 0.24)), new THREE.MeshStandardMaterial({ color: 0x262a2e, roughness: 0.6, emissive: c, emissiveIntensity: 0.35 })); bx.position.y = 0.12; bx.castShadow = true; g.add(bx);
    const hgt = kind === 'item' ? 3.2 + rar * 0.9 : 1.6, beam = new THREE.Mesh(this.beamGeo || (this.beamGeo = new THREE.CylinderGeometry(0.035, 0.07, 1, 6, 1, true)), new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(kind === 'item' ? 2.2 + rar * 0.5 : 1.2), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    beam.scale.y = hgt; beam.position.y = hgt / 2 + 0.2; g.add(beam);
    const p = { x: x + (Math.random() - 0.5) * 1.6, z: z + (Math.random() - 0.5) * 1.6 }; this.world.collide(p, 0.3); g.position.set(p.x, 0, p.z); this.scene.add(g);
    this.loot.push({ g, x: p.x, z: p.z, kind, data, t: 0 });
  }
  updLoot(dt) {
    const P = this.P;
    for (let i = this.loot.length - 1; i >= 0; i--) {
      const l = this.loot[i]; l.t += dt; l.g.children[0].rotation.y += dt * 1.2; const d = hyp(l.x - P.x, l.z - P.z);
      if (d < 1.7 && !P.dead && l.t > 0.4) { if (this.take(l)) { this.scene.remove(l.g); this.loot.splice(i, 1); continue; } }
      if (l.t > 240 || d > 260) { this.scene.remove(l.g); this.loot.splice(i, 1); }
    }
  }
  take(l) {
    const S = this.S; if (this.mode && this.mode.take) { const r = this.mode.take(l); if (r !== undefined) return r; }
    if (l.kind === 'ammo') { let got = false; for (const cls of ['ar', 'smg', 'lmg', 'sg', 'dmr']) { const has = S.wpn.some((w) => w.cls === cls), mx = this.resMax(cls); if (!has && (S.res[cls] || 0) >= mx * 0.5) continue; const add = Math.round(mx * (has ? 0.22 : 0.08)); if ((S.res[cls] || 0) < mx) { S.res[cls] = Math.min(mx, (S.res[cls] || 0) + add); got = true; } } if (!got) return false; this.ui.toast('Ammo', 'ammo'); this.audio.play('ammo', 0.4); }
    else if (l.kind === 'kit') { if (S.kits >= this.D.kits) return false; S.kits++; this.ui.toast('Med kit', 'kit'); this.audio.play('ammo', 0.4, 1.3); }
    else if (l.kind === 'marken') { S.marken += l.data; this.ui.toast(`+${l.data} Marken`, 'mk'); this.audio.play('coin', 0.4); }
    else { if (S.inv.length >= 40) { if (this.t - (this.fullT || 0) > 4) { this.fullT = this.t; this.ui.toast('Backpack full'); } return false; } S.inv.push(l.data); this.ui.pickup(l.data); this.audio.play(l.data.rar >= 3 ? 'lootHi' : 'loot', 0.5); }
    this.ui.dirty = true; return true;
  }
  equip(it) {
    const S = this.S, k = S.inv.indexOf(it); if (k < 0) return;
    if (it.t === 'g') { const old = S.gear[it.slot]; S.gear[it.slot] = it; S.inv.splice(k, 1); if (old) S.inv.push(old); }
    else { const slot = it.cls === 'pst' ? 2 : (S.cur < 2 ? S.cur : 0), old = S.wpn[slot]; S.wpn[slot] = it; S.inv.splice(k, 1); S.inv.push(old); this.mags[slot] = Math.min(this.mags[slot], this.magSize(it)); if (slot === S.cur) this.P.rig.setGun(it.cls); this.mags[slot] = this.magSize(it); if (S.res[it.cls] == null || S.res[it.cls] < this.resMax(it.cls) * 0.3) S.res[it.cls] = Math.round(this.resMax(it.cls) * 0.3); }
    this.recalc(); this.audio.play('swap', 0.4); this.ui.dirty = true; this.save();
  }
  scrap(it) { const S = this.S, k = S.inv.indexOf(it); if (k < 0) return; S.inv.splice(k, 1); S.marken += SYS.sellValue(it); S.teile += 1 + it.rar; this.audio.play('coin', 0.35); this.ui.dirty = true; }
  addXP(n) {
    const S = this.S; S.xp += Math.round(n);
    while (S.lvl < 30 && S.xp >= SYS.xpNeed(S.lvl)) { S.xp -= SYS.xpNeed(S.lvl); S.lvl++; this.recalc(); this.P.hp = this.D.maxHP; this.P.arm = this.D.maxArmor; this.ui.banner('STUFE ' + S.lvl, 'Level up · health and armour restored', 'lvl'); this.audio.play('level', 0.7); }
    this.ui.dirty = true;
  }

  // ---------------------------------------------------------------- camera
  updCamera(dt) {
    const c = this.cam, P = this.P, W = this.world, cam = this.gfx.camera;
    c.sh = damp(c.sh, c.shT, 9, dt); c.kick = damp(c.kick, 0, 9, dt); c.shake = damp(c.shake, 0, 5, dt);
    const aim = this.inp.aim && !P.dead, pitch = c.pitch + c.kick, cp = Math.cos(pitch), fx = Math.sin(c.yaw) * cp, fy = Math.sin(pitch), fz = Math.cos(c.yaw) * cp, rx = -Math.cos(c.yaw), rz = Math.sin(c.yaw);
    const py = (P.crouch ? 1.12 : EYE) - (P.dead ? Math.min(1, P.dead) * 0.8 : 0); let so = (aim ? 0.62 : 0.55) * c.sh;
    const sh = W.ray(P.x, py, P.z, rx * Math.sign(so), 0, rz * Math.sign(so), Math.abs(so) + 0.25); if (sh && !sh.ground) so = Math.sign(so) * Math.max(0, sh.t - 0.25);
    const px = P.x + rx * so, pz = P.z + rz * so, want = P.dead ? 4.2 : aim ? 1.85 : P.sprint ? 3.4 : 2.95;
    const h = W.ray(px, py, pz, -fx, -fy, -fz, want + 0.3); let d = want; if (h) d = Math.max(0.45, h.t - 0.28);
    c.dist = d < c.dist ? d : damp(c.dist, d, 6, dt);
    const sk = c.shake * this.motion; cam.position.set(px - fx * c.dist + (Math.random() - 0.5) * sk * 0.2, py - fy * c.dist + 0.1 + (Math.random() - 0.5) * sk * 0.2, pz - fz * c.dist + (Math.random() - 0.5) * sk * 0.2);
    if (cam.position.y < 0.25) cam.position.y = 0.25;
    cam.lookAt(px + fx * 20, py + fy * 20 + 0.1, pz + fz * 20);
    const fov = aim ? this.fovBase * 0.78 : P.sprint ? this.fovBase + 5 : this.fovBase; if (Math.abs(cam.fov - fov) > 0.05) { cam.fov = damp(cam.fov, fov, 9, dt); cam.updateProjectionMatrix(); }
    this.audio.listener(cam.position.x, cam.position.z, c.yaw);
  }
  // world position -> screen px (or null when behind the camera)
  project(x, y, z, out) { V.set(x, y, z).project(this.gfx.camera); if (V.z > 1 || V.z < -1) return null; out.x = (V.x * 0.5 + 0.5) * innerWidth; out.y = (-V.y * 0.5 + 0.5) * innerHeight; return out; }
}
installOps(Game, Enemy);
export { F_LOW, F_WALL, RAR };
