// SCHWARZSTART · input, HUD, tactical map, gear, networks, missions
import { clamp, hyp, el, IS_TOUCH, IS_MOBILE } from './util.js';
import * as SYS from './systems.js';
import { WPN, RAR, NETS, FACTIONS, SLOTS, ATTR, PERKS } from './systems.js';
import { renderOptions, cycleOpt, setOpt, renderAgent, outfitName } from './settings.js';

const KEYS = { KeyT: 'deploy', KeyY: 'qequip', Space: 'cover', KeyC: 'roll', ControlLeft: 'roll', KeyR: 'reload', KeyQ: 's1', KeyE: 's2', KeyG: 'nade', KeyH: 'kit', KeyF: 'use', KeyV: 'shoulder', Digit1: 'w1', Digit2: 'w2', Digit3: 'w3', KeyX: 'swap' };
// loot icons: plain silhouettes so you can tell a shotgun from a vest at a glance
const ICO = {
  ar: 'M2 8h11v6l-9 3H2zM13 7h27v6H13zM40 8h12v4H40zM52 9h10v2H52zM22 5h9v2h-9zM17 13h4l-1 6h-4zM27 13h5l2 8h-5z',
  smg: 'M3 9h10v5H5zM13 7h22v7H13zM35 9h12v3H35zM16 14h4l-1 6h-4zM25 14h4v9h-4zM20 5h6v2h-6z',
  lmg: 'M1 8h12v7l-10 2H1zM13 6h26v8H13zM39 8h14v4H39zM53 9h9v2h-9zM22 14h11v6H22zM15 14h4l-1 6h-4zM24 3h8v3h-8zM46 12h2l-4 10h-2zM49 12h2l4 10h-2z',
  sg: 'M1 9h14v5l-12 3H1zM15 8h14v6H15zM29 8h33v3H29zM29 12h24v2H29zM36 11h11v5H36zM18 14h4l-1 5h-4z',
  dmr: 'M1 8h13v6l-11 3H1zM14 8h22v5H14zM36 9h27v2H36zM17 3h17v4H17zM21 7h2v1h-2zM28 7h2v1h-2zM26 13h5v5h-5zM17 13h4l-1 6h-4z',
  pst: 'M18 5h28v6H18zM20 11h22v2H20zM19 11h9l-2 11h-8zM28 13h6v2h-6z',
  kopf: 'M5 21a11 11 0 0 1 22 0zM2 21h28v3H2z',
  weste: 'M9 3h4l3 5 3-5h4l4 7v19H5V10z',
  rucksack: 'M11 7a5 5 0 0 1 10 0h3a2 2 0 0 1 2 2v18a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V9a2 2 0 0 1 2-2zM13 7h6a3 3 0 0 0-6 0z',
  handschuhe: 'M9 30V15L5 10l2-2 4 3V4h3v9V2h3v11V4h3v10V7h3v14l-3 9z',
  stiefel: 'M9 2h10v16l9 4v8H6v-8l3-2z',
};
const icon = (it) => { const k = it.t === 'w' ? it.cls : it.slot, w = it.t === 'w'; return `<svg viewBox="${w ? '0 0 64 24' : '0 0 32 32'}" aria-hidden="true"><path d="${ICO[k] || ''}"/></svg>`; };
const OPEN = { KeyM: 'map', KeyI: 'inv', Tab: 'inv', KeyN: 'net', KeyJ: 'ops', KeyB: 'loot' };

export class Input {
  constructor(app, canvas, ui) {
    Object.assign(this, { mx: 0, my: 0, lx: 0, ly: 0, fire: false, aim: false, sprint: false, use: false, on: false, locked: false });
    this.pressed = new Set(); this.keys = new Set(); this.joy = null; this.look = new Map(); this.aimTog = false; const joyEl = el('joy'), knob = joyEl.firstElementChild;
    addEventListener('keydown', (e) => {
      if (e.code === 'Escape') { ui.panel ? ui.close() : (this.on && ui.open('menu')); return; }
      if (!this.on) { if (ui.panel && OPEN[e.code]) { e.preventDefault(); ui.panel === OPEN[e.code] ? ui.close() : ui.open(OPEN[e.code]); } return; }
      if (e.code === 'Tab' || e.code === 'Space') e.preventDefault(); if (e.repeat) return;
      this.keys.add(e.code); if (KEYS[e.code]) this.pressed.add(KEYS[e.code]); if (e.code === 'KeyF') this.use = true; if (OPEN[e.code]) ui.open(OPEN[e.code]);
    });
    addEventListener('keyup', (e) => { this.keys.delete(e.code); if (e.code === 'KeyF') this.use = false; });
    addEventListener('blur', () => { this.keys.clear(); this.fire = this.aim = this.use = false; });
    canvas.addEventListener('mousedown', (e) => { if (!this.on || IS_TOUCH) return; if (!this.locked) { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (err) { /* frame may refuse: free-mouse look still works */ } } if (e.button === 0) this.fire = true; if (e.button === 2) this.aim = true; });
    addEventListener('mouseup', (e) => { if (e.button === 0) this.fire = false; if (e.button === 2) this.aim = false; });
    addEventListener('mousemove', (e) => { if (!this.on || IS_TOUCH) return; if (this.locked || e.target === canvas) { this.lx += e.movementX || 0; this.ly += e.movementY || 0; } });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => { if (this.on) { this.pressed.add('swap'); e.preventDefault(); } }, { passive: false });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === canvas; document.body.classList.toggle('locked', this.locked); });
    // touch
    const down = (e) => {
      if (e.pointerType === 'mouse') { const b = e.target.closest && e.target.closest('[data-act]'); if (b && this.on) { this.pressed.add(b.dataset.act); if (b.dataset.act === 'use') this.use = true; } return; }
      if (!this.on) return; const b = e.target.closest && e.target.closest('[data-act]');
      if (b) {
        const a = b.dataset.act; e.preventDefault(); b.classList.add('down'); try { b.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        if (a === 'fire') { this.fire = true; this.look.set(e.pointerId, [e.clientX, e.clientY, 'fire']); } else if (a === 'aim') { this.aimTog = !this.aimTog; this.aim = this.aimTog; b.classList.toggle('on', this.aimTog); } else if (a === 'use') { this.use = true; this.pressed.add('use'); this.look.set(e.pointerId, [e.clientX, e.clientY, 'use']); } else this.pressed.add(a);
        return;
      }
      if (e.target !== canvas) return; e.preventDefault();
      // a quick double-tap, on either side, rolls: toward where the stick points (or last pointed), forward if it never moved
      const now = performance.now(), left = e.clientX < innerWidth * 0.42 && !this.joy, tp = left ? this.tapL : this.tapR;
      if (tp && tp.short && now - tp.up < 320) { this.tapL = this.tapR = null; const d = this.joy ? [this.mx, this.my] : now - (this.dirT || 0) < 700 ? this.lastDir : null; this.rollDir = d && hyp(d[0], d[1]) > 0.3 ? d.slice() : [0, 0]; this.pressed.add('roll'); }
      if (left) { this.joy = { id: e.pointerId, x: e.clientX, y: e.clientY, t0: now, far: 0 }; joyEl.style.left = e.clientX + 'px'; joyEl.style.top = e.clientY + 'px'; joyEl.classList.add('on'); knob.style.transform = ''; }
      else this.look.set(e.pointerId, [e.clientX, e.clientY, 'look', now, e.clientX, e.clientY, 0]);
    };
    const move = (e) => {
      if (e.pointerType === 'mouse' || !this.on) return;
      if (this.joy && e.pointerId === this.joy.id) { let dx = e.clientX - this.joy.x, dy = e.clientY - this.joy.y; const l = hyp(dx, dy), m = 50; this.joy.far = Math.max(this.joy.far, l); if (l > m) { dx *= m / l; dy *= m / l; } this.mx = dx / m; this.my = -dy / m; this.sprint = l > m * 1.15 && this.my > 0.5; if (l > 15) { this.lastDir = [this.mx, this.my]; this.dirT = performance.now(); } knob.style.transform = `translate(${dx}px,${dy}px)`; return; }
      const p = this.look.get(e.pointerId); if (p) { const k = 2.6 * (820 / Math.max(innerWidth, innerHeight)); this.lx += (e.clientX - p[0]) * k; this.ly += (e.clientY - p[1]) * k; p[0] = e.clientX; p[1] = e.clientY; if (p[2] === 'look') p[6] = Math.max(p[6], hyp(e.clientX - p[4], e.clientY - p[5])); }
    };
    const up = (e) => {
      if (e.pointerType === 'mouse') { this.use = this.keys.has('KeyF'); return; }
      const now = performance.now();
      if (this.joy && e.pointerId === this.joy.id) { this.tapL = { up: now, short: now - this.joy.t0 < 240 && this.joy.far < 22 }; this.joy = null; this.mx = this.my = 0; this.sprint = false; joyEl.classList.remove('on'); }
      const p = this.look.get(e.pointerId); if (p) { if (p[2] === 'fire') this.fire = false; if (p[2] === 'use') this.use = false; if (p[2] === 'look') this.tapR = { up: now, short: now - p[3] < 240 && p[6] < 22 }; this.look.delete(e.pointerId); }
      const b = e.target.closest && e.target.closest('[data-act]'); if (b) b.classList.remove('down'); document.querySelectorAll('.tb.down').forEach((x) => { if (!(this.fire && x.id === 'bFire')) x.classList.remove('down'); });
    };
    app.addEventListener('pointerdown', down, { passive: false }); addEventListener('pointermove', move, { passive: false }); addEventListener('pointerup', up); addEventListener('pointercancel', up);
    app.addEventListener('touchmove', (e) => { if (this.on) e.preventDefault(); }, { passive: false });
  }
  was(k) { if (this.pressed.has(k)) { this.pressed.delete(k); return true; } return false; }
  poll() {
    if (!IS_TOUCH || this.keys.size) { const k = this.keys; let x = 0, y = 0; if (k.has('KeyW') || k.has('ArrowUp')) y++; if (k.has('KeyS') || k.has('ArrowDown')) y--; if (k.has('KeyD') || k.has('ArrowRight')) x++; if (k.has('KeyA') || k.has('ArrowLeft')) x--; if (!this.joy) { this.mx = x; this.my = y; this.sprint = k.has('ShiftLeft') || k.has('ShiftRight'); } }
  }
  reset() { this.keys.clear(); this.pressed.clear(); this.fire = this.use = false; this.mx = this.my = this.lx = this.ly = 0; if (!this.aimTog) this.aim = false; this.joy = null; el('joy').classList.remove('on'); this.look.clear(); }
}

const ICON = { hub: '#e6dc3c', safe: '#3f8fe8', mission: '#ff5a3c', cp: '#f2a13a', power: '#f2c230', relay: '#8fd6a0', pump: '#4aa8e8', cache: '#a7afb8' };
const KIND = { hub: 'Leitstelle · hub', safe: 'Unterschlupf · U-Bahn safehouse', mission: 'Einsatz · mission', cp: 'Kontrollpunkt · hostile checkpoint', power: 'Umspannwerk · substation', relay: 'Funkmast · relay', pump: 'Straßenpumpe · water', cache: 'Depot · supplies' };

export class UI {
  constructor(game, gfx, world, map, audio) {
    Object.assign(this, { G: game, gfx, world, map, audio, panel: null, dirty: true, dn: [], last: {}, sel: null, invTab: 'all', hintT: 0, mz: 0.42, mcx: map.hub[0], mcz: map.hub[1], mSel: null });
    this.ov = el('ov'); this.ox = this.ov.getContext('2d'); this.mm = el('mmc').getContext('2d'); this.pt = { x: 0, y: 0 };
    document.body.classList.toggle('touch', IS_TOUCH);
    this.bs = IS_MOBILE ? 0.5 : 0.8; this.base = this.drawBase(this.bs);
    document.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => this.open(b.dataset.open)));
    el('pClose').addEventListener('click', () => this.close());
    el('tabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) this.open(b.dataset.t); });
    for (const id of ['pInv', 'pNet', 'pOps', 'pMenu', 'pAgent', 'pLoot', 'mapCard']) el(id).addEventListener('click', (e) => this.click(e));
    el('pMenu').addEventListener('input', (e) => { const k = e.target.dataset && e.target.dataset.opt; if (!k) return; setOpt(this.ctx, this.G.S.opt, k, e.target.value); const o = e.target.nextElementSibling; if (o) o.textContent = this.optLabel(k); });
    this.dmgOn = true; this.hintsOn = true; this.northUp = false; this.hiContrast = false; this.fpsT = 0; this.fpsN = 0;
    this.bindMap(); addEventListener('resize', () => this.resize()); this.resize();
  }
  resize() { const d = Math.min(2, devicePixelRatio || 1); this.ov.width = innerWidth * d; this.ov.height = innerHeight * d; this.od = d; if (this.panel === 'map') this.drawMap(); }

  // ---------------------------------------------------------------- feedback
  toast(t, cls = '', sub = '') { const c = el('toasts'); while (c.children.length > 5) c.firstChild.remove(); const d = document.createElement('div'); d.className = 'toast ' + cls; d.innerHTML = t + (sub ? `<small>${sub}</small>` : ''); c.appendChild(d); setTimeout(() => d.remove(), 3100); }
  banner(t, s = '', cls = '') { const b = el('banner'); el('bT').textContent = t; el('bS').textContent = s; b.className = 'show ' + cls; clearTimeout(this.bt); this.bt = setTimeout(() => (b.className = cls), 3600); }
  hint(t, secs = 9) { if (this.hintsOn === false) return; const hh = el('hint'); hh.textContent = t; hh.classList.remove('hidden'); this.hintT = secs; }
  pickup(it) { const r = RAR[it.rar]; this.toast(`<span style="color:${r.c}">${it.n}</span>`, 'item', `${r.n} · Stufe ${it.lvl} · ${this.itemLine(it)}`); }
  dmg(x, y, z, v, head, crit, arm) { if (this.dmgOn === false) return; if (this.dn.length > 40) this.dn.shift(); this.dn.push({ x: x + (Math.random() - 0.5) * 0.4, y, z: z + (Math.random() - 0.5) * 0.4, v: Math.round(v), t: 0, c: head ? '#ffd24a' : crit ? '#ff9a3c' : arm ? '#cfe6ff' : '#ffffff', big: head || crit }); }
  hitmark(kill) { const m = el('hitm'); m.className = ''; void m.offsetWidth; m.className = kill ? 'kill' : 'go'; }
  hurt(ang, broke) { const hd = el('hurtdir'); hd.style.transform = `rotate(${-ang}rad)`; hd.classList.add('on'); clearTimeout(this.ht); this.ht = setTimeout(() => hd.classList.remove('on'), 60); if (broke) { const a = el('armB'); a.classList.remove('broke'); void a.offsetWidth; a.classList.add('broke'); } }
  fade() { const f = el('fade'); f.classList.add('on'); setTimeout(() => f.classList.remove('on'), 380); }

  // ---------------------------------------------------------------- per frame
  frame(dt) {
    const G = this.G, P = G.P, S = G.S, D = G.D, L = this.last, set = (k, v, fn) => { if (L[k] !== v) { L[k] = v; fn(v); } };
    set('arm', Math.round((P.arm / Math.max(1, D.maxArmor)) * 200), (v) => (el('armB').firstElementChild.style.transform = `scaleX(${v / 200})`));
    set('hp', Math.round((P.hp / D.maxHP) * 200), (v) => (el('hpB').firstElementChild.style.transform = `scaleX(${v / 200})`));
    set('xp', Math.round((S.xp / SYS.xpNeed(S.lvl)) * 200), (v) => (el('xpB').firstElementChild.style.transform = `scaleX(${v / 200})`));
    set('lvl', S.lvl, (v) => (el('lvl').textContent = v));
    const w = G.curW(), W = WPN[w.cls], mag = G.mags[S.cur];
    set('mag', mag, (v) => { const m = el('amMag'); m.textContent = v; m.classList.toggle('low', v <= G.magSize(w) * 0.25); });
    set('res', W.side ? '∞' : S.res[w.cls] || 0, (v) => (el('amRes').textContent = v)); set('wn', w.n, (v) => { el('amName').textContent = v; el('amName').style.color = RAR[w.rar].c; });
    set('rel', P.relT > 0, (v) => el('ammo').classList.toggle('rel', v));
    const cd = (id, t, max, n) => { const b = el(id); set(id, Math.ceil(t * 4), () => { b.lastElementChild.style.height = clamp((t / max) * 100, 0, 100) + '%'; b.classList.toggle('cd', t > 0 && (n == null || n <= 0)); }); if (n != null) set(id + 'n', n, (v) => (b.querySelector('b').textContent = v)); };
    cd('bS1', P.sk[0], 24); cd('bS2', P.sk[1], 48); cd('bNade', S.nades < 2 ? P.nadeT : 0, 20, S.nades); cd('bKit', P.kitT, 1.2, S.kits);
    set('street', G.loc.street || G.loc.dist.name, (v) => (el('locS').textContent = v)); set('dist', G.loc.dist.name + ' · ' + this.clock(), (v) => (el('locD').textContent = v));
    const wp = G.wp; set('obj', wp ? wp.n + '|' + Math.round(hyp(wp.x - P.x, wp.z - P.z) / 5) : '', () => { el('obj').style.visibility = wp ? 'visible' : 'hidden'; if (wp) { el('objT').textContent = wp.n; const s = wp.s; el('objS').textContent = (wp.loot ? 'Your loot · ' : wp.auto ? 'Nächster Kampf · ' : '') + (s && s.k === 'mission' ? s.def.loc + ' · ' : '') + Math.round(hyp(wp.x - P.x, wp.z - P.z) / 5) * 5 + ' m'; } });
    { // the next fight is one tap away; something better is one tap from being worn
      const dir = !G.mode || G.mode.id === 'frei', wpd = G.wp ? hyp(G.wp.x - P.x, G.wp.z - P.z) : 0, dep = dir && G.wp && !G.wp.loot && wpd > 140 && !P.dead && !(G.combatT > 0 && G.alive() > 0);
      set('dep', dep ? Math.round(wpd / 10) * 10 : -1, (v) => { el('bDeploy').classList.toggle('hidden', v < 0); if (v >= 0) el('bDeployD').textContent = v + ' m'; });
      const bt = G.better; set('bet', bt ? bt.id : -1, () => { el('bBetter').classList.toggle('hidden', !bt); if (bt) { el('bBetterU').textContent = 'UPGRADE ' + (G.betterD > 0 && G.betterD < 999 ? '+' + Math.round(G.betterD) + '%' : ''); el('bBetterN').innerHTML = `<span style="color:${RAR[bt.rar].c}">${bt.n}</span> · Stufe ${bt.lvl}`; } });
      let nn = 0, br = -1, bu = false; for (const i of G.S.inv) if (i.nw === 1) { nn++; if (i.rar > br) br = i.rar; if (!bu && G.gain(i) > 1) bu = true; }
      set('lootB', nn + '|' + br + '|' + bu, () => { const b = el('bLoot'); b.classList.toggle('hidden', !nn); b.classList.toggle('up', bu); if (nn) { b.style.setProperty('--rc', RAR[br].c); el('bLootN').textContent = nn; } });
    }
    const pr = G.prompt, pe = el('prompt'); set('pr', pr ? pr.text + pr.sub + (pr.bad ? 1 : 0) + (pr.hot ? 'h' : '') : '', () => { pe.classList.toggle('hidden', !pr); pe.classList.toggle('hot', !!(pr && pr.hot)); if (pr) { el('prT').textContent = pr.text; el('prS').textContent = pr.sub; pe.classList.toggle('bad', !!pr.bad); } }); if (pr) el('prP').style.transform = `scaleX(${clamp(pr.prog, 0, 1)})`;
    const sp = 9 + P.bloom * 16 + (P.moving ? 4 : 0) + (G.inp.aim ? -4 : 0); el('cross').style.setProperty('--g', sp + 'px'); set('lock', !!G.aimT, (v) => el('lock').classList.toggle('on', v)); set('cov', P.st === 'cover' ? 2 : G.coverNear ? 1 : 0, (v) => { const b = el('bCover'); b.classList.toggle('ctx', v > 0); b.classList.toggle('inc', v === 2); });
    if (this.hintT > 0) { this.hintT -= dt; if (this.hintT <= 0) el('hint').classList.add('hidden'); }
    this.overlay(dt); this.mmT = (this.mmT || 0) - dt; if (this.mmT <= 0) { this.mmT = 0.05; this.minimap(); }
  }
  clock() { const t = this.gfx.time, hh = Math.floor(t), m = Math.floor((t - hh) * 60); return String(hh).padStart(2, '0') + ':' + String(Math.floor(m / 5) * 5).padStart(2, '0'); }
  overlay(dt) {
    const G = this.G, P = G.P, x = this.ox, d = this.od, p = this.pt, W = innerWidth, H = innerHeight; x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, W, H); x.textAlign = 'center';
    for (const e of G.en) {
      if (e.dead) continue; const dd = hyp(e.x - P.x, e.z - P.z); if (dd > 90) continue; const show = e === G.aimT || e.mark > 0 || e.boss || e.rig.hit > 0.02 || (e.aware && dd < 45); if (!show) continue;
      if (!G.project(e.x, e.headY() + 0.42, e.z, p)) continue; const bw = e.boss ? 120 : e.tier ? 70 : 52, bx = p.x - bw / 2, by = p.y - 6, fc = this.hiContrast ? '#ffe600' : FACTIONS[e.fac].col;
      x.globalAlpha = e === G.aimT || e.mark > 0 || e.boss ? 1 : 0.75;
      if (e.maxArm > 0) { x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(bx, by - 5, bw, 4); x.fillStyle = '#dbe9f5'; x.fillRect(bx, by - 5, bw * clamp(e.arm / e.maxArm, 0, 1), 4); }
      x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(bx, by, bw, 4); x.fillStyle = e.tier === 3 ? '#f0b63c' : e.tier === 2 ? '#f0b63c' : e.tier === 1 ? '#b98be8' : '#ff5a3c'; x.fillRect(bx, by, bw * clamp(e.hp / e.maxHp, 0, 1), 4);
      if ((e === G.aimT || e.boss || e.tier) && !e.isRemote) { x.font = `${e.boss ? 700 : 600} ${e.boss ? 12 : 10}px -apple-system,Segoe UI,sans-serif`; x.fillStyle = '#000'; x.fillText(`${e.lvl}  ${e.name}`, p.x + 1, by - (e.maxArm > 0 ? 8 : 3) + 1); x.fillStyle = e.lvl > G.S.lvl + 2 ? '#ff5a3c' : fc; x.fillText(`${e.lvl}  ${e.name}`, p.x, by - (e.maxArm > 0 ? 8 : 3)); }
      if (e.mark > 0) { x.strokeStyle = fc; x.lineWidth = 1.5; x.strokeRect(p.x - 5, by - 26 - (e.maxArm > 0 ? 5 : 0), 10, 10); }
    }
    x.globalAlpha = 1;
    for (let i = this.dn.length - 1; i >= 0; i--) { const n = this.dn[i]; n.t += dt; if (n.t > 0.9) { this.dn.splice(i, 1); continue; } if (!G.project(n.x, n.y + n.t * 0.9, n.z, p)) continue; x.globalAlpha = clamp(1.6 - n.t * 2, 0, 1); x.font = `400 ${n.big ? 24 : 17}px Bebas Neue,Impact,sans-serif`; x.fillStyle = 'rgba(0,0,0,.8)'; x.fillText(n.v, p.x + 1, p.y + 1); x.fillStyle = n.c; x.fillText(n.v, p.x, p.y); }
    x.globalAlpha = 1;
    for (const n of G.nades) { if (n.mine) continue; if (!G.project(n.x, n.y + 0.3, n.z, p)) continue; const r = 12 + Math.sin(G.t * 18) * 3; x.strokeStyle = '#ff5a3c'; x.lineWidth = 2.5; x.beginPath(); x.arc(p.x, p.y, r, 0, 6.3); x.stroke(); x.fillStyle = '#ff5a3c'; x.font = '700 13px sans-serif'; x.fillText('!', p.x, p.y + 5); }
    const wp = G.wp;
    if (wp) {
      const dist = hyp(wp.x - P.x, wp.z - P.z); let q = G.project(wp.x, 2.6, wp.z, p), sx, sy;
      if (q) { sx = clamp(p.x, 24, W - 24); sy = clamp(p.y, 70, H - 120); } else { const a = Math.atan2(wp.x - P.x, wp.z - P.z) - G.cam.yaw; sx = clamp(W / 2 - Math.sin(a) * W, 24, W - 24); sy = H - 130; }
      if (dist > 9) { x.save(); x.translate(sx, sy); x.rotate(Math.PI / 4); x.strokeStyle = '#f2c230'; x.lineWidth = 2; x.strokeRect(-6, -6, 12, 12); x.fillStyle = 'rgba(242,194,48,.35)'; x.fillRect(-6, -6, 12, 12); x.restore(); x.font = '600 11px -apple-system,Segoe UI,sans-serif'; x.fillStyle = '#000'; x.fillText(Math.round(dist) + ' m', sx + 1, sy + 24); x.fillStyle = '#f2c230'; x.fillText(Math.round(dist) + ' m', sx, sy + 23); }
    }
    for (const s of G.sites) { if (s.done || s.locked || s.k === 'mission' || s.k === 'hub') continue; const dd = hyp(s.x - P.x, s.z - P.z); if (dd > 55 || dd < 4) continue; if (!G.project(s.x, s.k === 'pump' || s.k === 'cache' ? 2 : 4.4, s.z, p)) continue; x.globalAlpha = clamp(1.4 - dd / 55, 0.25, 0.95); x.fillStyle = ICON[s.k]; x.save(); x.translate(p.x, p.y); x.rotate(Math.PI / 4); x.fillRect(-4, -4, 8, 8); x.restore(); if (dd < 30) { x.font = '600 10px -apple-system,Segoe UI,sans-serif'; x.fillStyle = '#000'; x.fillText(s.n, p.x + 1, p.y - 9); x.fillStyle = '#e7ecf1'; x.fillText(s.n, p.x, p.y - 10); } }
    x.globalAlpha = 1;
  }

  // ---------------------------------------------------------------- map drawing
  poly(x, pg) { x.moveTo(pg[0][0], pg[0][1]); for (let i = 1; i < pg.length; i++) x.lineTo(pg[i][0], pg[i][1]); x.closePath(); }
  drawBase(s) {
    const m = this.map, b = m.bounds, c = document.createElement('canvas'); c.width = Math.round((b[2] - b[0]) * s); c.height = Math.round((b[3] - b[1]) * s); const x = c.getContext('2d');
    x.fillStyle = '#0c1014'; x.fillRect(0, 0, c.width, c.height); x.setTransform(s, 0, 0, s, -b[0] * s, -b[1] * s);
    x.fillStyle = '#132019'; x.beginPath(); for (const p of m.parks) this.poly(x, p); x.fill();
    x.fillStyle = '#151a20'; x.beginPath(); for (const p of m.plazas) this.poly(x, p); x.fill();
    x.fillStyle = '#1d252e'; x.strokeStyle = '#303b47'; x.lineWidth = 0.9; x.beginPath(); for (const bl of m.blocks) this.poly(x, bl.p); x.fill(); x.stroke();
    x.fillStyle = '#0b2b3d'; x.strokeStyle = '#18506b'; x.lineWidth = 1.2; x.beginPath(); for (const p of m.water) this.poly(x, p); x.fill(); x.stroke();
    x.lineCap = 'round'; x.lineJoin = 'round';
    for (const st of m.streets) { if (st.cw <= 0) continue; x.strokeStyle = st.k === 'boulevard' ? '#2a333d' : '#222a33'; x.lineWidth = Math.max(1.6, st.cw * 0.42); x.beginPath(); x.moveTo(st.p[0][0], st.p[0][1]); for (let i = 1; i < st.p.length; i++) x.lineTo(st.p[i][0], st.p[i][1]); x.stroke(); }
    x.strokeStyle = '#5a4444'; x.lineWidth = 5; x.setLineDash([9, 5]); x.beginPath(); let prev = null; for (const v of m.via) { if (prev && hyp(v[0] - prev[0], v[1] - prev[1]) < 8) x.lineTo(v[0], v[1]); else x.moveTo(v[0], v[1]); prev = v; } x.stroke(); x.setLineDash([]);
    for (const L of m.landmarks) { const ax = L.ax, bx = [ax[1], -ax[0]], hw = L.w / 2, hd = L.d / 2; x.fillStyle = L.k === 'tower' ? '#2b3642' : '#46566a'; x.strokeStyle = L.k === 'tower' ? '#445262' : '#9db3c9'; x.lineWidth = 1; x.beginPath(); if (L.round) x.arc(L.c[0], L.c[1], hw, 0, 6.3); else { const q = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => [L.c[0] + u * hw * ax[0] + v * hd * bx[0], L.c[1] + u * hw * ax[1] + v * hd * bx[1]]); this.poly(x, q); } x.fill(); x.stroke(); }
    return c;
  }
  minimap() {
    const G = this.G, P = G.P, x = this.mm, S = 264, r = S / 2, b = this.map.bounds, z = 1.5, yaw = G.cam.yaw;
    x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = '#0b0f14'; x.fillRect(0, 0, S, S); x.translate(r, r); x.rotate(this.northUp ? 0 : yaw - Math.PI); x.scale(z, z); x.translate(-P.x, -P.z);
    { const R0 = 130, s = this.bs, sx = clamp((P.x - R0 - b[0]) * s, 0, this.base.width - 2), sy = clamp((P.z - R0 - b[1]) * s, 0, this.base.height - 2), sw = Math.min(R0 * 2 * s, this.base.width - sx), sh = Math.min(R0 * 2 * s, this.base.height - sy); x.drawImage(this.base, sx, sy, sw, sh, b[0] + sx / s, b[1] + sy / s, sw / s, sh / s); }
    for (const s of G.sites) { if (s.locked) continue; const dd = hyp(s.x - P.x, s.z - P.z); if (dd > 95 || (s.done && s.k !== 'safe' && s.k !== 'hub')) continue; if ((s.k === 'pump' || s.k === 'cache') && !(G.S.seen[s.d] || G.D.intel)) continue; x.fillStyle = ICON[s.k]; x.save(); x.translate(s.x, s.z); x.rotate(Math.PI / 4 - (yaw - Math.PI)); x.fillRect(-3, -3, 6, 6); x.restore(); }
    { const rp = G.routeL && G.routeL.mesh.visible && G.routeL.pts; if (rp && rp.length > 1) { x.lineJoin = 'round'; x.lineCap = 'round'; x.beginPath(); x.moveTo(rp[0][0], rp[0][1]); for (let k = 1; k < rp.length; k++) x.lineTo(rp[k][0], rp[k][1]); x.strokeStyle = 'rgba(0,0,0,.55)'; x.lineWidth = 5.5 / z; x.stroke(); x.strokeStyle = '#ff8a1e'; x.lineWidth = 3 / z; x.stroke(); } }   // the route
    for (const l of G.loot) { x.fillStyle = l.kind === 'item' ? RAR[l.data.rar].c : '#cfd6dd'; x.fillRect(l.x - 1.2, l.z - 1.2, 2.4, 2.4); }
    for (const e of G.en) { if (e.dead) continue; const dd = hyp(e.x - P.x, e.z - P.z); if (dd > 90) continue; if (!(e.mark > 0 || e.firing || (G.D.radar && e.aware) || (e.aware && dd < 30))) continue; x.fillStyle = '#ff5a3c'; x.beginPath(); x.arc(e.x, e.z, e.boss ? 3.4 : 2.2, 0, 6.3); x.fill(); }
    if (G.turret) { x.fillStyle = '#8fd8ff'; x.fillRect(G.turret.x - 1.5, G.turret.z - 1.5, 3, 3); }
    if (G.net && G.net.markers) for (const m of G.net.markers()) { x.fillStyle = m.col || '#5fd3ff'; x.strokeStyle = '#05070a'; x.lineWidth = 1; x.beginPath(); x.arc(m.x, m.z, 2.6, 0, 6.3); x.fill(); x.stroke(); }
    x.setTransform(1, 0, 0, 1, 0, 0);
    if (G.pulseT > 0) { x.strokeStyle = `rgba(143,216,255,${G.pulseT})`; x.lineWidth = 3; x.beginPath(); x.arc(r, r, (1 - G.pulseT) * r, 0, 6.3); x.stroke(); }
    const wp = G.wp; if (wp) { const a = Math.atan2(wp.x - P.x, wp.z - P.z) - yaw, dd = hyp(wp.x - P.x, wp.z - P.z) * z, rr = Math.min(dd, r - 12); x.fillStyle = '#f2c230'; x.save(); x.translate(r - Math.sin(a) * rr, r - Math.cos(a) * rr); x.rotate(Math.PI / 4); x.fillRect(-5, -5, 10, 10); x.restore(); }
    x.fillStyle = '#fff'; x.strokeStyle = '#000'; x.lineWidth = 1.5; x.save(); x.translate(r, r); x.rotate(this.northUp ? Math.PI - P.yaw : Math.atan2(Math.sin(yaw - P.yaw), Math.cos(yaw - P.yaw))); x.beginPath(); x.moveTo(0, -9); x.lineTo(6, 7); x.lineTo(0, 3.5); x.lineTo(-6, 7); x.closePath(); x.stroke(); x.fill(); x.restore();
    const n = el('mmN').style, na = this.northUp ? 0 : yaw - Math.PI, k = 58 * (el('mm').clientWidth / 132); n.transform = `translate(${-Math.sin(-na) * k - 4}px,${-Math.cos(na) * k - 7}px)`;
  }
  siteShown(s) { const S = this.G.S; if (s.locked) return s.k === 'mission'; if (s.k === 'hub' || s.k === 'safe' || s.k === 'mission') return true; if (s.k === 'pump' || s.k === 'cache') return !!S.seen[s.d] || (this.G.D.intel && !!S.seen['v' + s.d]); return !!S.seen['v' + s.d] || !!S.seen[s.d]; }
  drawMap() {
    const c = el('mapc'), d = Math.min(2, devicePixelRatio || 1), w = c.clientWidth, hh = c.clientHeight; if (!w) return; if (c.width !== w * d) { c.width = w * d; c.height = hh * d; }
    const x = c.getContext('2d'), m = this.map, b = m.bounds, G = this.G, S = G.S, z = this.mz, T = (X, Z) => [(X - this.mcx) * z + w / 2, (Z - this.mcz) * z + hh / 2];
    x.setTransform(d, 0, 0, d, 0, 0); x.fillStyle = '#080b0e'; x.fillRect(0, 0, w, hh);
    const o = T(b[0], b[1]); x.imageSmoothingQuality = 'high'; x.drawImage(this.base, o[0], o[1], (b[2] - b[0]) * z, (b[3] - b[1]) * z);
    x.save(); x.translate(w / 2, hh / 2); x.scale(z, z); x.translate(-this.mcx, -this.mcz);
    // restored grids glow; hostile ground is tinted in the faction's colour
    const lit = new Path2D(); let any = false; for (const dd of [0, ...S.power]) for (const pg of m.distPolys[dd] || []) { lit.moveTo(pg[0][0], pg[0][1]); for (let i = 1; i < pg.length; i++) lit.lineTo(pg[i][0], pg[i][1]); lit.closePath(); any = true; }
    if (any) { x.save(); x.clip(lit); x.lineCap = 'round'; x.strokeStyle = 'rgba(255,196,96,.55)'; x.shadowColor = 'rgba(255,170,60,.9)'; x.shadowBlur = 6; for (const st of m.streets) { if (st.cw <= 0) continue; x.lineWidth = Math.max(1.2, st.cw * 0.16); x.beginPath(); x.moveTo(st.p[0][0], st.p[0][1]); for (let i = 1; i < st.p.length; i++) x.lineTo(st.p[i][0], st.p[i][1]); x.stroke(); } x.restore(); }
    for (const D of m.districts) { const st = G.districtState(D.id), col = D.id === 0 || st.lib ? '#e6dc3c' : FACTIONS[D.fac].col; x.beginPath(); for (const pg of m.distPolys[D.id] || []) this.poly(x, pg); x.globalAlpha = D.id === 0 || st.lib ? 0.05 : S.seen['v' + D.id] ? 0.1 : 0.2; x.fillStyle = D.id === 0 || st.lib ? '#e6dc3c' : S.seen['v' + D.id] ? col : '#000'; x.fill(); x.globalAlpha = 0.55; x.strokeStyle = col; x.lineWidth = 1.4 / z; x.setLineDash([6 / z, 5 / z]); x.stroke(); x.setLineDash([]); }
    x.globalAlpha = 1; x.restore();
    x.textAlign = 'center'; x.textBaseline = 'middle';
    if (z > 0.55) { x.font = `500 ${clamp(9 + z * 2, 9, 13)}px -apple-system,Segoe UI,sans-serif`; const seen = new Set(); for (const st of m.streets) { if (!st.n || st.w < (z > 1.1 ? 0 : 17)) continue; let bi = 0, bl = 0; for (let i = 0; i < st.p.length - 1; i++) { const l = hyp(st.p[i + 1][0] - st.p[i][0], st.p[i + 1][1] - st.p[i][1]); if (l > bl) { bl = l; bi = i; } } if (bl * z < x.measureText(st.n).width + 14 || seen.has(st.n + bi)) continue; seen.add(st.n + bi); const a = T(st.p[bi][0], st.p[bi][1]), e = T(st.p[bi + 1][0], st.p[bi + 1][1]); let an = Math.atan2(e[1] - a[1], e[0] - a[0]); if (an > 1.571 || an < -1.571) an += Math.PI; x.save(); x.translate((a[0] + e[0]) / 2, (a[1] + e[1]) / 2); x.rotate(an); x.fillStyle = 'rgba(160,175,190,.78)'; x.fillText(st.n, 0, 0); x.restore(); } }
    for (const L of m.landmarks) { if (L.k === 'tower' || L.k === 'fountain' || z < 0.5) continue; const p = T(L.c[0], L.c[1]); x.font = '600 10px -apple-system,Segoe UI,sans-serif'; x.fillStyle = 'rgba(0,0,0,.7)'; x.fillText(L.n, p[0] + 1, p[1] + 1); x.fillStyle = '#cdd9e5'; x.fillText(L.n, p[0], p[1]); }
    for (const D of m.districts) { let sx = 0, sz = 0, n = 0; for (const pg of m.distPolys[D.id] || []) for (const q of pg) { sx += q[0]; sz += q[1]; n++; } if (!n) continue; const p = T(sx / n, sz / n), st = G.districtState(D.id); x.font = `400 ${clamp(13 + z * 14, 14, 30)}px Bebas Neue,Impact,sans-serif`; x.fillStyle = 'rgba(0,0,0,.6)'; x.fillText(D.name.toUpperCase(), p[0] + 1, p[1] + 1); x.fillStyle = D.id === 0 || st.lib ? 'rgba(230,220,60,.9)' : 'rgba(231,236,241,.82)'; x.fillText(D.name.toUpperCase(), p[0], p[1]); if (D.id) { x.font = '600 10px -apple-system,Segoe UI,sans-serif'; x.fillStyle = st.lib ? '#e6dc3c' : FACTIONS[D.fac].col; x.fillText(st.lib ? 'GESICHERT' : `${FACTIONS[D.fac].name} · ${D.lv[0]}–${D.lv[1]}${st.tot ? ' · ' + st.dn + '/' + st.tot : ''}`, p[0], p[1] + clamp(11 + z * 8, 12, 20)); } }
    { // Sperrzone: everything outside the Phase 1 field of play
      const c = G.world.core, a = T(c[0], c[1]), bq = T(c[2], c[3]); x.save(); x.beginPath(); x.rect(-10, -10, w + 20, hh + 20); x.rect(a[0], a[1], bq[0] - a[0], bq[1] - a[1]); x.clip('evenodd');
      x.fillStyle = 'rgba(6,8,10,.62)'; x.fillRect(-10, -10, w + 20, hh + 20); x.strokeStyle = 'rgba(200,40,42,.22)'; x.lineWidth = 1; x.beginPath(); for (let k = -hh; k < w + hh; k += 11) { x.moveTo(k, 0); x.lineTo(k + hh, hh); } x.stroke(); x.restore();
      x.strokeStyle = 'rgba(220,60,50,.75)'; x.setLineDash([7, 5]); x.lineWidth = 1.6; x.strokeRect(a[0], a[1], bq[0] - a[0], bq[1] - a[1]); x.setLineDash([]);
      const md = G.mode && G.mode.id !== 'frei', lp = md ? T((c[0] + c[2]) / 2, c[3] + 40) : T(c[0] - 260, c[3] + 180); x.font = `400 ${clamp(12 + z * 12, 13, 26)}px Bebas Neue,Impact,sans-serif`; x.fillStyle = 'rgba(220,70,60,.85)'; x.fillText(md ? 'AUSSERHALB' : 'SPERRZONE', lp[0], lp[1]); x.font = '500 10px -apple-system,Segoe UI,sans-serif'; x.fillStyle = 'rgba(200,190,180,.7)'; x.fillText(md ? 'outside this match' : 'open it from the title screen', lp[0], lp[1] + 16);
    }
    for (const s of G.sites) {
      if (!this.siteShown(s)) continue; const p = T(s.x, s.z); if (p[0] < -20 || p[1] < -20 || p[0] > w + 20 || p[1] > hh + 20) continue; const big = s.k === 'hub' || s.k === 'mission' || s.k === 'safe', r = big ? 7 : 4.5;
      x.save(); x.translate(p[0], p[1]); x.globalAlpha = s.locked ? 0.35 : s.done && s.k !== 'safe' && s.k !== 'hub' ? 0.4 : 1; x.fillStyle = s.locked ? '#5a6068' : s.k === 'safe' && !s.done ? '#56606b' : ICON[s.k]; x.strokeStyle = '#05070a'; x.lineWidth = 2;
      if (s.k === 'safe' || s.k === 'hub') { x.fillRect(-r, -r, r * 2, r * 2); x.strokeRect(-r, -r, r * 2, r * 2); x.fillStyle = s.k === 'hub' ? '#111' : '#fff'; x.font = '700 10px -apple-system,Segoe UI,sans-serif'; x.fillText(s.k === 'hub' ? 'N' : 'U', 0, 0.5); }
      else { x.rotate(Math.PI / 4); x.fillRect(-r, -r, r * 2, r * 2); x.strokeRect(-r, -r, r * 2, r * 2); if (s.k === 'mission') { x.rotate(-Math.PI / 4); x.fillStyle = '#fff'; x.font = '700 10px sans-serif'; x.fillText(s.done ? '✓' : '!', 0, 0.5); } }
      x.restore(); if (this.mSel === s || (G.wp && G.wp.s === s)) { x.strokeStyle = this.mSel === s ? '#fff' : '#f2c230'; x.lineWidth = 1.6; x.beginPath(); x.arc(p[0], p[1], r + 6, 0, 6.3); x.stroke(); }
      if (big && z > 0.7) { x.font = '600 10px -apple-system,Segoe UI,sans-serif'; x.fillStyle = 'rgba(0,0,0,.7)'; x.fillText(s.n, p[0] + 1, p[1] + r + 9); x.fillStyle = '#e7ecf1'; x.fillText(s.n, p[0], p[1] + r + 8); }
    }
    if (G.net) for (const m of G.net.markers()) { const q = T(m.x, m.z); x.fillStyle = m.col || '#5fd3ff'; x.strokeStyle = '#05070a'; x.lineWidth = 2; x.beginPath(); x.arc(q[0], q[1], 5.5, 0, 6.3); x.stroke(); x.fill(); if (z > 0.6) { x.font = '600 10px -apple-system,Segoe UI,sans-serif'; x.fillStyle = '#bfefff'; x.fillText(m.tag, q[0], q[1] - 11); } }
    const P = G.P, pp = T(P.x, P.z); x.save(); x.translate(pp[0], pp[1]); x.rotate(Math.PI - G.cam.yaw); x.fillStyle = '#fff'; x.strokeStyle = '#000'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, -11); x.lineTo(7, 8); x.lineTo(0, 4); x.lineTo(-7, 8); x.closePath(); x.stroke(); x.fill(); x.restore();
    x.font = '500 10px -apple-system,Segoe UI,sans-serif'; x.textAlign = 'left'; x.fillStyle = 'rgba(141,153,166,.8)'; x.fillText('BERLIN MITTE · 1 : 1 · hand-drawn from memory, not survey data', 10, hh - 10);
  }
  bindMap() {
    const c = el('mapc'), pts = new Map(); let moved = 0, pinch = 0;
    c.addEventListener('pointerdown', (e) => { pts.set(e.pointerId, [e.clientX, e.clientY]); moved = 0; try { c.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } if (pts.size === 2) { const a = [...pts.values()]; pinch = hyp(a[0][0] - a[1][0], a[0][1] - a[1][1]); } });
    c.addEventListener('pointermove', (e) => {
      const p = pts.get(e.pointerId); if (!p) return; const dx = e.clientX - p[0], dy = e.clientY - p[1]; p[0] = e.clientX; p[1] = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
      if (pts.size === 1) { this.mcx -= dx / this.mz; this.mcz -= dy / this.mz; } else if (pts.size === 2) { const a = [...pts.values()], dd = hyp(a[0][0] - a[1][0], a[0][1] - a[1][1]); if (pinch > 0) this.mz = clamp(this.mz * (dd / pinch), 0.18, 3); pinch = dd; }
      const b = this.map.bounds; this.mcx = clamp(this.mcx, b[0], b[2]); this.mcz = clamp(this.mcz, b[1], b[3]); this.drawMap();
    });
    const up = (e) => {
      const had = pts.has(e.pointerId); pts.delete(e.pointerId); pinch = 0; if (!had || moved > 8) return; const r = c.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top; let best = null, bd = 24;
      for (const s of this.G.sites) { if (!this.siteShown(s)) continue; const px = (s.x - this.mcx) * this.mz + r.width / 2, py = (s.z - this.mcz) * this.mz + r.height / 2, dd = hyp(px - mx, py - my); if (dd < bd) { bd = dd; best = s; } }
      this.mSel = best; this.mapCard(); this.drawMap();
    };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', (e) => pts.delete(e.pointerId));
    c.addEventListener('wheel', (e) => { e.preventDefault(); this.mz = clamp(this.mz * (e.deltaY < 0 ? 1.15 : 0.87), 0.18, 3); this.drawMap(); }, { passive: false });
  }
  mapCard() {
    const s = this.mSel, c = el('mapCard'), G = this.G; if (!s) { c.classList.add('hidden'); return; } const D = this.map.districts[s.d], st = s.done ? (s.k === 'safe' || s.k === 'hub' ? 'Open' : 'Done') : s.k === 'safe' ? 'Locked' : 'Open task';
    c.classList.remove('hidden'); c.innerHTML = `<h3>${s.n}</h3><p>${KIND[s.k]}<br>${D.name}${s.k === 'mission' ? ' · level ' + s.def.lv + ' · ' + FACTIONS[s.def.fac].name : D.id ? ' · level ' + D.lv[0] + '–' + D.lv[1] : ''} · ${st}</p><div class="row"><button class="pill sm" data-do="wp">${G.wp && G.wp.s === s ? 'Clear waypoint' : 'Set waypoint'}</button>${(s.k === 'safe' || s.k === 'hub') && s.done ? '<button class="pill sm hot" data-do="travel">Fast travel</button>' : ''}</div>`;
  }

  // ---------------------------------------------------------------- panels
  open(name) {
    const G = this.G; if (!this.panel) { G.paused = true; G.inp.on = false; G.inp.reset(); if (document.pointerLockElement) document.exitPointerLock(); this.audio.play('ui', 0.3); }
    this.panel = name; el('panel').classList.remove('hidden'); el('hud').classList.add('hidden');
    el('tabs').innerHTML = [['map', 'Karte'], ['inv', 'Ausrüstung'], ['net', 'Netze'], ['ops', 'Einsätze'], ['agent', 'Agent'], ['menu', 'Menü']].map(([k, n]) => `<button data-t="${k}" class="${k === name ? 'on' : ''}">${n}</button>`).join('');
    for (const [k, id] of [['map', 'pMap'], ['inv', 'pInv'], ['net', 'pNet'], ['ops', 'pOps'], ['agent', 'pAgent'], ['menu', 'pMenu'], ['loot', 'pLoot']]) el(id).classList.toggle('on', k === name);
    el('panel').classList.toggle('lootmode', name === 'loot'); if (name === 'loot') { if (!this.lootList) this.lootList = G.S.inv.filter((i) => i.nw).sort((a, b) => b.rar - a.rar); this.audio.play('lootHi', 0.4); } else this.endLoot();
    el('panel').classList.toggle('agentmode', name === 'agent'); if (name === 'agent') this.agentT = 0;
    if (name === 'map') { this.mcx = G.P.x; this.mcz = G.P.z; this.mSel = null; this.mapCard(); el('mapLeg').innerHTML = Object.keys(ICON).map((k) => `<div><i style="background:${ICON[k]}"></i>${KIND[k].split(' · ')[0]}</div>`).join(''); requestAnimationFrame(() => this.drawMap()); }
    else this.render();
  }
  endLoot() { if (!this.lootList) return; for (const i of this.lootList) i.nw = 0; this.lootList = null; this.G.better = null; this.dirty = true; }
  close() { if (!this.panel) return; this.endLoot(); this.panel = null; el('panel').classList.add('hidden'); el('hud').classList.remove('hidden'); const G = this.G; G.paused = false; G.inp.on = true; G.inp.reset(); G.save(); this.last = {}; }
  render() { const n = this.panel; if (n === 'loot') this.renderLoot(); else if (n === 'inv') this.renderInv(); else if (n === 'net') this.renderNet(); else if (n === 'ops') this.renderOps(); else if (n === 'menu') this.renderMenu(); else if (n === 'agent') el('pAgent').innerHTML = renderAgent(this.G.S.look || { outfit: this.G.P.rig.outfit, pal: this.G.playerLook().pal }); }
  optLabel(k) { const o = this.optDefs.find((q) => q.k === k); return o ? o.lbl(this.G.S.opt[k]) : ''; }
  // agent creator preview: the camera circles the agent while the panel is open
  agentFrame(dt) {
    const G = this.G, P = G.P, cam = G.gfx.camera; this.agentT = (this.agentT || 0) + dt; const a = P.yaw + 0.45 + Math.sin(this.agentT * 0.35) * 0.55, d = innerWidth > innerHeight ? 3.1 : 4.2;
    cam.position.set(P.x + Math.sin(a) * d, 1.35, P.z + Math.cos(a) * d); const off = innerWidth > innerHeight ? 1.05 : 0; cam.lookAt(P.x + Math.cos(a) * off, 1.0 + (innerWidth > innerHeight ? 0 : -0.25), P.z - Math.sin(a) * off);
    if (Math.abs(cam.fov - 50) > 0.1) { cam.fov = 50; cam.updateProjectionMatrix(); }
    P.rig.pose({ speed: 0, aim: 0 }, dt); P.rig.root.updateMatrixWorld(true);
  }
  itemLine(it) {
    if (it.t === 'w') { const W = WPN[it.cls], d = SYS.wpnDmg(it) * it.q, mg = Math.round(W.mag * (SYS.hasPerk(it, 'mag') ? 1.25 : 1)); return `${Math.round(d)}${W.pellets ? '×' + W.pellets : ''} dmg · ${W.rpm} rpm · ${mg} mag${it.perk ? ' · ' + PERKS[it.perk][0] : ''}${it.perk2 ? ' · ' + PERKS[it.perk2][0] : ''}`; }
    return `${it.arm} armour · +${it.av}% ${ATTR[it.at][0]}${it.sub ? ' · +' + it.sv + '% ' + { crit: 'crit', hs: 'headshot', hp: 'health' }[it.sub] : ''}`;
  }
  power(it) { return SYS.power(it); }
  // ---- the loot screen: everything new, big, each judged against what it would replace
  renderLoot() {
    const G = this.G, S = G.S, list = (this.lootList || []).filter((it) => S.inv.includes(it) || this.isWorn(it)); this.lootList = list;
    const rows = list.map((it) => ({ it, worn: this.isWorn(it), dl: this.isWorn(it) ? 0 : G.gain(it) }));
    const junk = rows.filter((r) => !r.worn && r.dl < -1), junkV = junk.reduce((a, r) => a + SYS.sellValue(r.it), 0), nNew = rows.filter((r) => r.it.nw === 1).length;
    el('pLoot').innerHTML = `<div class="lhead"><div><b>BEUTE</b><span>${this.lootSrc() ? this.lootSrc() + ' · ' : ''}${nNew} new · backpack ${S.inv.length}/40</span></div><div class="row">${junk.length ? `<button class="pill sm" data-do="ljunk">Scrap ${junk.length} worse · +${junkV}</button>` : ''}<button class="pill sm hot" data-do="lclose">Weiter</button></div></div>
      <div class="lrow">${rows.map((r) => this.lootCard(r)).join('') || '<p class="note">Nothing new yet. Every fight ends in a chest.</p>'}</div>`;
  }
  lootSrc() { return this.G.lootSrc || ''; }
  isWorn(it) { const S = this.G.S; return S.wpn.includes(it) || Object.values(S.gear).includes(it); }
  lootCard({ it, worn, dl }) {
    const G = this.G, S = G.S, R = RAR[it.rar], w = it.t === 'w', W = w ? WPN[it.cls] : null, tg = G.equipTarget(it), cur = worn ? null : G.worn(it);
    const slotN = w ? ['Primär', 'Sekundär', 'Pistole'][tg] : SLOTS[tg][0], up = !worn && dl > 1, eq = !worn && Math.abs(dl) <= 1;
    const big = w ? Math.round(SYS.power(it)) : it.arm, bigU = w ? 'damage / s' : 'armour';
    const ver = worn ? '<div class="ld on">✓ Equipped</div>' : `<div class="ld ${up ? 'up' : eq ? 'eq' : 'dn'}">${up ? '▲ UPGRADE' : eq ? '= SAME' : '▼ WORSE'}<i>${eq ? '' : (dl > 0 ? '+' : '−') + Math.min(999, Math.abs(Math.round(dl))) + '%'}</i></div><small class="lvs">than your ${slotN}${cur ? ': ' + cur.n + ' · ' + Math.round(w ? SYS.power(cur) : cur.arm) : ''}</small>`;
    const det = w ? `${Math.round(SYS.wpnDmg(it) * it.q)}${W.pellets ? '×' + W.pellets : ''} per shot · ${W.rpm} rpm · ${Math.round(W.mag * (SYS.hasPerk(it, 'mag') ? 1.25 : 1))} mag${[it.perk, it.perk2].filter(Boolean).map((p) => `<br><b>${PERKS[p][0]}</b> ${PERKS[p][1]}`).join('')}`
      : `<b style="color:${ATTR[it.at][2]}">+${it.av}% ${ATTR[it.at][0]}</b>${it.sub ? ` · +${it.sv}% ${{ crit: 'crit', hs: 'headshot', hp: 'health' }[it.sub]}` : ''}`;
    return `<div class="lc${up ? ' up' : ''}${worn ? ' worn' : ''}" style="--rc:${R.c}">
      <div class="lr"><span>${R.n}</span><em>Stufe ${it.lvl}</em></div>
      <div class="li">${icon(it)}</div>
      <b class="ln">${it.n}</b><span class="lk">${w ? W.n : SLOTS[it.slot][0]}${it.nw === 2 ? ' · taken off' : ''}</span>
      <div class="lv"><b>${big}</b><span>${bigU}</span></div>
      ${ver}
      <div class="lx">${det}</div>
      ${worn ? '' : `<div class="lb"><button class="pill sm${up ? ' hot' : ''}" data-do="lequip" data-v="${it.id}">Equip</button><button class="pill sm" data-do="lscrap" data-v="${it.id}">Scrap +${SYS.sellValue(it)}</button></div>`}
    </div>`;
  }
  card(it, eq, label) {
    const cmp = eq ? null : this.G.worn(it), dl = cmp ? this.power(it) - this.power(cmp) : 0;
    return `<button class="it${this.sel === it ? ' sel' : ''}" style="--rc:${RAR[it.rar].c}" data-it="${it.id}"><b>${label ? label + ' · ' : ''}${it.n}</b><span>${it.t === 'w' ? WPN[it.cls].n : SLOTS[it.slot][0]} · ${this.itemLine(it)}${cmp ? ` <span class="${dl >= 0 ? 'up' : 'dn'}">${dl >= 0 ? '▲' : '▼'}</span>` : ''}</span><em>${it.lvl}</em></button>`;
  }
  renderInv() {
    const G = this.G, S = G.S, D = G.D, inv = S.inv.filter((i) => this.invTab === 'all' || (this.invTab === 'w') === (i.t === 'w')).sort((a, b) => b.rar - a.rar || b.lvl - a.lvl);
    const it = this.sel && (S.inv.includes(this.sel) ? this.sel : null); this.sel = it;
    el('pInv').innerHTML = `<div class="stat"><div><b>${S.lvl}</b>Stufe</div><div><b>${D.maxHP}</b>Leben</div><div><b>${D.maxArmor}</b>Panzerung</div><div><b style="color:${ATTR.fk[2]}">+${D.fk.toFixed(1)}%</b>Feuerkraft</div><div><b style="color:${ATTR.pz[2]}">+${D.pz.toFixed(1)}%</b>Panzerung</div><div><b style="color:${ATTR.tk[2]}">+${D.tk.toFixed(1)}%</b>Technik</div><div><b style="color:var(--amb)">${S.marken}</b>Marken</div></div>
      <div class="sec">Getragen</div><div class="grid">${S.wpn.map((w, i) => this.card(w, true, ['Primär', 'Sekundär', 'Pistole'][i])).join('')}${Object.keys(SLOTS).map((k) => this.card(S.gear[k], true)).join('')}</div>
      <div class="sec">Rucksack <small>${S.inv.length} / 40 · <a data-do="tab" data-v="all" style="color:${this.invTab === 'all' ? '#fff' : 'inherit'}">alle</a> · <a data-do="tab" data-v="w" style="color:${this.invTab === 'w' ? '#fff' : 'inherit'}">Waffen</a> · <a data-do="tab" data-v="g" style="color:${this.invTab === 'g' ? '#fff' : 'inherit'}">Ausrüstung</a></small></div>
      <div class="grid">${inv.map((i) => this.card(i, false)).join('') || '<p class="note">Empty. Hostiles, Depots and secured sites drop gear.</p>'}</div>
      <div id="det">${it ? `<p><b style="color:${RAR[it.rar].c}">${it.n}</b> · ${RAR[it.rar].n} · Stufe ${it.lvl}<br>${this.itemLine(it)}${it.perk ? '<br>' + PERKS[it.perk][0] + ': ' + PERKS[it.perk][1] : ''}${it.perk2 ? '<br>' + PERKS[it.perk2][0] + ': ' + PERKS[it.perk2][1] : ''}</p><div class="row"><button class="pill sm hot" data-do="equip">Equip</button><button class="pill sm" data-do="scrap">Scrap +${SYS.sellValue(it)}</button></div>` : `<p>Tap an item to compare it. A gun goes next to one of the same kind, otherwise over your weaker one.</p><div class="row"><button class="pill sm" data-do="scrapall">Scrap all Standard</button></div>`}</div>`;
  }
  renderNet() {
    const G = this.G, S = G.S;
    el('pNet').innerHTML = `<p class="note">Five networks keep a city alive. Every site you secure in the streets feeds one of them. Switch the next stage on at the Leitstelle desks in the colonnade of the Altes Museum. Marken: <b style="color:var(--amb)">${S.marken}</b></p><div class="grid" style="margin-top:10px">${Object.keys(NETS).map((k) => { const N = NETS[k], t = S.net[k], pts = SYS.netPoints(S, N.src), nx = N.t[t]; return `<div class="net" style="--nc:${N.c}"><h3>${N.n}</h3><p>${N.d}<br><b style="color:#e7ecf1">${pts}</b> ${N.unit} secured</p>${N.t.map((d, i) => `<div class="tier${i < t ? ' on' : ''}"><i>${i < t ? '●' : i === t ? '○' : '·'}</i><div><b>${d[2]}</b> · ${d[3]}<br>${i < t ? 'active' : d[0] + ' ' + N.unit + ' · ' + d[1] + ' Marken'}</div></div>`).join('')}${nx ? `<button class="pill sm${pts >= nx[0] && S.marken >= nx[1] && G.inSafe ? ' hot' : ''}" data-do="net" data-v="${k}">${pts < nx[0] ? 'Needs ' + nx[0] + ' ' + N.unit : !G.inSafe ? 'Switch on at the hub' : 'Switch on · ' + nx[1] + ' Marken'}</button>` : ''}</div>`; }).join('')}</div>`;
  }
  renderOps() {
    const G = this.G, m = this.map, ms = G.sites.filter((s) => s.k === 'mission').sort((a, b) => a.def.lv - b.def.lv);
    el('pOps').innerHTML = `<div class="sec">Einsätze</div><div class="grid">${ms.map((s) => `<button class="it mis${s.done ? ' done' : ''}" style="--rc:${s.done ? '#7be0a0' : FACTIONS[s.def.fac].col};--mc:${FACTIONS[s.def.fac].col}" ${s.locked ? 'disabled style="opacity:.45"' : `data-ms="${s.i}"`}><b>${s.done ? '✓ ' : ''}${s.n}</b><span>${s.def.loc} · ${s.locked ? 'Sperrzone · later phase' : FACTIONS[s.def.fac].name}${G.wp && G.wp.s === s ? ' · <span class="up">tracked</span>' : ''}</span><em>${s.def.lv}</em></button>`).join('')}</div>
      <div class="sec">Kieze</div><div class="grid">${m.districts.filter((D) => D.id).map((D) => { const st = G.districtState(D.id), F = FACTIONS[D.fac]; return `<div class="it" style="--rc:${st.lib ? '#e6dc3c' : F.col}"><b>${D.name}</b><span>${D.sub}<br>${st.tot === 0 ? 'Sperrzone' : st.lib ? 'Gesichert' : F.name} · ${st.dn}/${st.tot} sites${G.S.power.includes(D.id) ? ' · <span class="up">Strom</span>' : ''}</span><em>${D.lv[0]}–${D.lv[1]}</em></div>`; }).join('')}</div>
      <div class="sec">Fraktionen</div><div class="grid">${FACTIONS.map((F) => `<div class="it" style="--rc:${F.col}"><b>${F.name}</b><span>${F.tag}</span></div>`).join('')}</div>`;
  }
  renderMenu() {
    const G = this.G;
    el('pMenu').innerHTML = `<div class="row" style="margin-bottom:8px"><button class="pill hot" data-do="resume">Back to the streets</button></div>
      ${renderOptions(G.S.opt)}
      ${G.mode && G.mode.menuHtml ? G.mode.menuHtml() : ''}
      <div class="sec">Shift</div>
      <div class="opt"><span>Time of day</span><button class="pill sm" data-do="time">${this.clock()} · skip 4 h</button></div>
      <div class="opt"><span>Start over<br><small>Erases this Lotse on this device</small></span><button class="pill sm" data-do="wipe">New Lotse</button></div>
      <p class="note" style="margin-top:14px">${IS_TOUCH ? 'Left thumb moves; push it all the way forward to sprint. Drag the right side to look. FIRE shoots; with auto aim it finds the target. COVER snaps to walls, cars and barriers; press it again while looking at other cover to run there. Hold the prompt to use things; up close it becomes SCHLAG, a rifle-butt strike.' : 'WASD move · Shift sprint · mouse look · left click fire · right click aim · Space cover · C roll · R reload · Q pulse · E turret · G grenade · H med kit · F use / rifle butt up close · T drop at the next fight · Y equip the better item · V shoulder · 1 2 3 weapons · M map · I gear · J missions'}</p>
      <p class="note">${G.saved === false ? 'This frame does not allow saving on this device: progress lasts until the page is closed.' : 'Progress saves in this browser on this device.'}</p>
      <p class="note">Photo-scanned materials: Poly Haven and ambientCG (CC0). Motion capture: CMU Graphics Lab Motion Capture Database, mocap.cs.cmu.edu (created with funding from NSF EIA-0196217).</p>`;
  }
  click(e) {
    const G = this.G, S = G.S, t = e.target, itb = t.closest('[data-it]'), msb = t.closest('[data-ms]'), dob = t.closest('[data-do]');
    if (itb) { const id = +itb.dataset.it, it = S.inv.find((i) => i.id === id); this.sel = it || null; this.renderInv(); return; }
    if (msb) { const s = G.sites[+msb.dataset.ms]; G.setWaypoint(s); this.mcx = s.x; this.mcz = s.z; this.open('map'); this.mSel = s; this.mapCard(); return; }
    const cyc = t.closest('[data-cyc]'), ag = t.closest('[data-ag]'), swb = t.closest('[data-sw]');
    if (cyc) { this.audio.play('ui', 0.3); if (cycleOpt(this.ctx, S.opt, cyc.dataset.cyc)) { G.save(); location.reload(); return; } G.save(); this.renderMenu(); return; }
    if (ag || swb) {
      this.audio.play('ui', 0.3); const L = S.look || (S.look = { outfit: G.P.rig.outfit, pal: { ...G.playerLook().pal } }); L.pal = L.pal || {};
      if (ag) { const [, b, st] = (L.outfit || 'agent_m_1').split('_'); L.outfit = ag.dataset.ag === 'style' ? outfitName(ag.dataset.v, b) : outfitName(st, ag.dataset.v); }
      else L.pal[swb.dataset.sw] = +swb.dataset.v;
      const look = G.playerLook(); G.P.rig.setOutfit(look.outfit, look.pal); G.save(); this.render(); return;
    }
    if (!dob) return; const a = dob.dataset.do, v = dob.dataset.v; this.audio.play('ui', 0.3);
    if (a === 'equip' && this.sel) { G.equip(this.sel, G.equipTarget(this.sel)); this.sel = null; } else if (a === 'scrap' && this.sel) { G.scrap(this.sel); this.sel = null; } else if (a === 'scrapall') { for (const i of S.inv.filter((x) => x.rar === 0)) G.scrap(i); }
    else if (a === 'lequip' || a === 'lscrap') { const it = S.inv.find((i) => i.id === +v); if (it) { if (a === 'lequip') { const old = G.equip(it, G.equipTarget(it)); it.nw = 0; if (old) { old.nw = 2; if (!this.lootList.includes(old)) this.lootList.push(old); } } else { G.scrap(it); } } }
    else if (a === 'ljunk') { for (const it of (this.lootList || []).slice()) if (S.inv.includes(it) && G.gain(it) < -1) G.scrap(it); }
    else if (a === 'lclose') { this.close(); return; }
    else if (a === 'tab') this.invTab = v; else if (a === 'net') G.buyNet(v);
    else if (a === 'wp') { G.setWaypoint(G.wp && G.wp.s === this.mSel ? null : this.mSel); this.mapCard(); this.drawMap(); return; } else if (a === 'travel') { if (G.travel(this.mSel)) this.close(); return; }
    else if (a === 'leave' && G.mode) { G.mode.leave(); return; } else if (a === 'invite' && G.mode) { G.mode.invite(); return; }
    else if (a === 'resume') { this.close(); return; } else if (a === 'aa') G.autoAim = !G.autoAim; else if (a === 'sens') G.sens = G.sens <= 0.7 ? 1 : G.sens >= 1.4 ? 0.6 : 1.5; else if (a === 'inv') G.invY = !G.invY; else if (a === 'snd') this.audio.mute(!this.audio.muted);
    else if (a === 'q') { const n = { low: 'mid', mid: 'high', high: 'low' }[G.gfx.tier]; setOpt(this.ctx, S.opt, 'q', n); G.save(); this.toast && this.toast('Quality · ' + n, 'ok'); } else if (a === 'time') { G.gfx.time = (G.gfx.time + 4) % 24; }
    else if (a === 'wipe') { if (dob.dataset.sure) { G.wipe(); location.reload(); return; } dob.dataset.sure = 1; dob.textContent = 'Tap again to erase'; return; }
    this.render();
  }
}
