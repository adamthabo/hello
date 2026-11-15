// SCHWARZSTART · sound: every effect is synthesised at start-up (no audio files)
import { clamp, hyp } from './util.js';

const SR = 22050;
// layers: [wave, f0, f1, dur, attack, decayRate, gain, lpStart, lpEnd, delay, hp]
const N = 'n', S = 's', W = 'w', Q = 'q';
const DEF = {
  shot_ar: [[N, 0, 0, 0.30, 0.001, 26, 1.0, 5200, 700, 0, 0], [S, 150, 48, 0.16, 0.001, 24, 0.9], [N, 0, 0, 0.03, 0.0005, 160, 0.9, 9000, 6000, 0, 2500], [N, 0, 0, 0.55, 0.02, 7, 0.16, 1400, 300, 0.03]],
  shot_smg: [[N, 0, 0, 0.2, 0.001, 38, 0.9, 6500, 1100, 0, 0], [S, 210, 80, 0.1, 0.001, 36, 0.6], [N, 0, 0, 0.025, 0.0005, 190, 0.8, 9500, 7000, 0, 3000]],
  shot_lmg: [[N, 0, 0, 0.34, 0.001, 20, 1.0, 4200, 520, 0, 0], [S, 120, 40, 0.2, 0.001, 18, 1.0], [N, 0, 0, 0.6, 0.02, 6, 0.2, 1100, 240, 0.03]],
  shot_sg: [[N, 0, 0, 0.55, 0.001, 11, 1.1, 3600, 320, 0, 0], [S, 95, 34, 0.3, 0.001, 12, 1.2], [N, 0, 0, 0.04, 0.0005, 120, 0.8, 8000, 4000, 0, 1800], [N, 0, 0, 0.9, 0.05, 4, 0.22, 900, 200, 0.05]],
  shot_dmr: [[N, 0, 0, 0.26, 0.0005, 30, 1.1, 8000, 900, 0, 0], [S, 170, 44, 0.2, 0.001, 20, 1.0], [N, 0, 0, 1.1, 0.03, 3.6, 0.3, 1600, 260, 0.04]],
  shot_pst: [[N, 0, 0, 0.18, 0.001, 40, 0.9, 5200, 900, 0, 0], [S, 240, 90, 0.09, 0.001, 40, 0.6]],
  reload: [[N, 0, 0, 0.05, 0.001, 90, 0.7, 5000, 2000, 0, 900], [Q, 900, 500, 0.03, 0.001, 120, 0.25, 0, 0, 0.02], [N, 0, 0, 0.06, 0.001, 70, 0.8, 4200, 1500, 0.34, 700], [Q, 700, 420, 0.04, 0.001, 110, 0.3, 0, 0, 0.36]],
  cock: [[N, 0, 0, 0.04, 0.001, 110, 0.7, 6000, 2400, 0, 1200], [N, 0, 0, 0.05, 0.001, 90, 0.8, 5000, 1800, 0.09, 900], [Q, 1300, 800, 0.03, 0.001, 140, 0.2, 0, 0, 0.09]],
  dry: [[N, 0, 0, 0.03, 0.0005, 160, 0.6, 7000, 3000, 0, 1500], [Q, 1500, 1100, 0.02, 0.001, 200, 0.2]],
  swap: [[N, 0, 0, 0.16, 0.03, 22, 0.4, 1800, 3800, 0, 600], [N, 0, 0, 0.04, 0.001, 100, 0.5, 4000, 1500, 0.13, 800]],
  cover: [[N, 0, 0, 0.14, 0.004, 30, 0.6, 700, 200, 0, 0], [S, 90, 55, 0.12, 0.002, 28, 0.6]],
  roll: [[N, 0, 0, 0.36, 0.08, 9, 0.45, 900, 2400, 0, 300]],
  // footsteps: a soft, dark crunch of packed snow; four takes so a run never sounds like a loop
  step0: [[N, 0, 0, 0.12, 0.007, 38, 0.55, 1000, 380, 0, 120], [N, 0, 0, 0.05, 0.004, 75, 0.1, 2200, 1300, 0.012, 800]],
  step1: [[N, 0, 0, 0.1, 0.006, 44, 0.55, 900, 340, 0, 110], [N, 0, 0, 0.04, 0.003, 80, 0.08, 2000, 1200, 0.018, 760]],
  step2: [[N, 0, 0, 0.13, 0.008, 34, 0.5, 1150, 420, 0, 140], [N, 0, 0, 0.05, 0.004, 70, 0.11, 2400, 1400, 0.01, 820]],
  step3: [[N, 0, 0, 0.11, 0.006, 40, 0.52, 820, 320, 0, 100], [N, 0, 0, 0.045, 0.003, 78, 0.09, 1900, 1150, 0.015, 740]],
  hitArm: [[S, 1900, 1750, 0.14, 0.0005, 30, 0.35], [S, 2760, 2600, 0.1, 0.0005, 40, 0.25], [N, 0, 0, 0.03, 0.0005, 150, 0.5, 8000, 5000, 0, 2500]],
  hitBody: [[N, 0, 0, 0.1, 0.001, 40, 0.8, 900, 260, 0, 0], [S, 130, 70, 0.09, 0.001, 40, 0.7]],
  armBreak: [[N, 0, 0, 0.35, 0.0005, 14, 0.8, 9000, 3200, 0, 2600], [S, 2400, 900, 0.3, 0.001, 12, 0.3], [S, 3300, 1300, 0.26, 0.001, 14, 0.22, 0, 0, 0.03]],
  down: [[S, 110, 38, 1.4, 0.01, 3, 0.9], [N, 0, 0, 1.2, 0.02, 4, 0.4, 600, 120]],
  kit: [[S, 660, 660, 0.14, 0.004, 18, 0.35], [S, 990, 990, 0.3, 0.004, 9, 0.35, 0, 0, 0.1], [N, 0, 0, 0.2, 0.02, 20, 0.2, 5000, 2500, 0, 1800]],
  pulse: [[S, 320, 1500, 0.45, 0.01, 4, 0.4], [S, 1500, 1500, 0.5, 0.002, 7, 0.3, 0, 0, 0.38], [S, 2250, 2250, 0.4, 0.002, 9, 0.14, 0, 0, 0.38]],
  deploy: [[W, 140, 520, 0.3, 0.01, 4, 0.25, 2200, 2200], [N, 0, 0, 0.06, 0.001, 70, 0.7, 4000, 1500, 0.3, 700], [S, 1200, 1200, 0.12, 0.002, 26, 0.25, 0, 0, 0.36]],
  throw: [[N, 0, 0, 0.3, 0.1, 10, 0.4, 700, 3000, 0, 400]],
  boom: [[N, 0, 0, 1.6, 0.002, 4.2, 1.3, 3000, 160], [S, 70, 24, 0.9, 0.002, 4.5, 1.6], [N, 0, 0, 0.05, 0.0005, 80, 1.0, 9000, 3000, 0, 1500], [N, 0, 0, 2.2, 0.2, 1.8, 0.22, 700, 140, 0.15]],
  ammo: [[N, 0, 0, 0.05, 0.001, 80, 0.5, 5000, 2200, 0, 1000], [S, 880, 880, 0.1, 0.002, 30, 0.2, 0, 0, 0.04]],
  coin: [[S, 1568, 1568, 0.09, 0.001, 30, 0.25], [S, 2093, 2093, 0.22, 0.001, 14, 0.25, 0, 0, 0.07]],
  loot: [[S, 523, 523, 0.3, 0.003, 10, 0.25], [S, 784, 784, 0.34, 0.003, 9, 0.22, 0, 0, 0.06], [S, 1047, 1047, 0.4, 0.003, 8, 0.18, 0, 0, 0.12]],
  lootHi: [[S, 659, 659, 0.3, 0.003, 9, 0.22], [S, 988, 988, 0.34, 0.003, 8, 0.22, 0, 0, 0.08], [S, 1319, 1319, 0.4, 0.003, 7, 0.2, 0, 0, 0.16], [S, 1976, 1976, 0.7, 0.003, 4.5, 0.18, 0, 0, 0.24], [S, 2637, 2637, 0.8, 0.003, 4, 0.1, 0, 0, 0.32]],
  level: [[W, 392, 392, 0.3, 0.01, 7, 0.16, 2600, 1800], [W, 523, 523, 0.3, 0.01, 7, 0.16, 2600, 1800, 0.14], [W, 659, 659, 0.3, 0.01, 7, 0.16, 2600, 1800, 0.28], [W, 784, 784, 0.9, 0.01, 2.6, 0.2, 3200, 1600, 0.42], [S, 1568, 1568, 0.9, 0.01, 3, 0.1, 0, 0, 0.42]],
  power: [[N, 0, 0, 0.09, 0.001, 50, 1.0, 2400, 400, 0, 0], [S, 80, 55, 0.2, 0.001, 18, 0.9], [W, 50, 100, 1.8, 0.5, 1.2, 0.2, 400, 1600, 0.12], [S, 100, 100, 2.0, 0.6, 1.3, 0.22, 0, 0, 0.12], [S, 300, 300, 1.8, 0.8, 1.6, 0.07, 0, 0, 0.2], [S, 1046, 1046, 1.6, 0.4, 1.8, 0.07, 0, 0, 0.6], [S, 1568, 1568, 1.6, 0.4, 1.8, 0.06, 0, 0, 0.75]],
  capture: [[W, 294, 294, 0.34, 0.02, 5, 0.2, 2200, 1500], [W, 440, 440, 0.9, 0.02, 2.4, 0.22, 2600, 1400, 0.3], [W, 220, 220, 0.9, 0.02, 2.4, 0.14, 1500, 900, 0.3]],
  mission: [[W, 262, 262, 0.3, 0.02, 5, 0.18, 2400, 1600], [W, 392, 392, 0.3, 0.02, 5, 0.18, 2400, 1600, 0.26], [W, 523, 523, 1.4, 0.02, 1.7, 0.22, 3000, 1400, 0.52], [W, 330, 330, 1.4, 0.02, 1.7, 0.14, 2000, 1000, 0.52], [W, 131, 131, 1.6, 0.02, 1.5, 0.2, 900, 500, 0.52]],
  alarm: [[Q, 620, 620, 0.2, 0.01, 2, 0.12, 2400, 2400], [Q, 465, 465, 0.26, 0.01, 2, 0.12, 2400, 2400, 0.22]],
  boss: [[W, 55, 49, 2.2, 0.3, 1.0, 0.4, 500, 260], [W, 82, 78, 2.2, 0.4, 1.0, 0.22, 600, 300], [N, 0, 0, 2.0, 0.6, 1.4, 0.14, 500, 160]],
  travel: [[N, 0, 0, 1.4, 0.5, 2.2, 0.6, 300, 1400], [S, 60, 44, 1.4, 0.4, 2, 0.5]],
  ui: [[S, 1200, 1200, 0.04, 0.001, 60, 0.18], [N, 0, 0, 0.02, 0.0005, 200, 0.2, 7000, 4000, 0, 2000]],
  die: [[N, 0, 0, 0.22, 0.004, 16, 0.6, 900, 240], [S, 150, 80, 0.2, 0.004, 14, 0.5], [N, 0, 0, 0.14, 0.005, 26, 0.5, 700, 200, 0.26]],
  shout: [[W, 240, 190, 0.2, 0.02, 9, 0.2, 1100, 700], [W, 480, 380, 0.2, 0.02, 9, 0.1, 1800, 1100], [N, 0, 0, 0.08, 0.004, 40, 0.14, 3200, 1600, 0, 900]],
  melee: [[N, 0, 0, 0.12, 0.001, 30, 0.9, 1500, 300], [S, 180, 70, 0.1, 0.001, 30, 0.8]],
  bell: [[S, 262, 261, 4.0, 0.002, 1.1, 0.5], [S, 524, 522, 3.0, 0.002, 1.5, 0.24], [S, 706, 705, 2.2, 0.002, 2.0, 0.18], [S, 1048, 1046, 1.5, 0.002, 2.6, 0.08]],
  caw: [[N, 0, 0, 0.26, 0.02, 7, 0.32, 1700, 1100], [S, 560, 400, 0.24, 0.02, 7, 0.22], [N, 0, 0, 0.22, 0.02, 8, 0.26, 1600, 1000, 0.32], [S, 520, 380, 0.2, 0.02, 8, 0.18, 0, 0, 0.32]],
  siren: [[S, 620, 920, 1.3, 0.35, 0.8, 0.1], [S, 920, 620, 1.3, 0.2, 0.8, 0.1, 0, 0, 1.3], [S, 620, 920, 1.3, 0.2, 0.8, 0.08, 0, 0, 2.6], [S, 920, 620, 1.3, 0.2, 1.2, 0.06, 0, 0, 3.9]],
  crackle: [[N, 0, 0, 0.9, 0.001, 5, 0.3, 9000, 3000, 0, 2600], [N, 0, 0, 0.5, 0.001, 7, 0.2, 7000, 2000, 0.2, 1800]],
  rotor: [[N, 0, 0, 0.1, 0.004, 30, 0.5, 520, 160]],
  murmur: [[N, 0, 0, 2.4, 0.5, 0.7, 0.07, 900, 380], [S, 180, 210, 1.6, 0.4, 1.2, 0.02, 0, 0, 0.5]],
  pump: [[S, 520, 760, 0.22, 0.03, 9, 0.14], [S, 760, 500, 0.22, 0.03, 9, 0.14, 0, 0, 0.28], [N, 0, 0, 0.7, 0.1, 5, 0.4, 2400, 900, 0.3, 500]],
  crate: [[N, 0, 0, 0.16, 0.002, 22, 0.8, 1200, 300], [S, 110, 70, 0.14, 0.002, 22, 0.6], [N, 0, 0, 0.08, 0.002, 50, 0.4, 3000, 1200, 0.16, 500]],
};

function render(layers) {
  let len = 0; for (const l of layers) len = Math.max(len, (l[9] || 0) + l[3]); const n = Math.ceil(len * SR) + 64, out = new Float32Array(n);
  for (const [w, f0, f1, dur, atk, dec, gain, lp0 = 0, lp1 = 0, dl = 0, hp = 0] of layers) {
    const m = Math.floor(dur * SR), o = Math.floor(dl * SR); let ph = 0, lp = 0, hpv = 0;
    for (let i = 0; i < m; i++) {
      const t = i / SR, k = i / m, f = f0 + (f1 - f0) * k; ph += (f / SR) * 6.2832;
      let v = w === N ? Math.random() * 2 - 1 : w === S ? Math.sin(ph) : w === W ? ((ph / 6.2832) % 1) * 2 - 1 : Math.sin(ph) > 0 ? 1 : -1;
      if (lp0 > 0) { const fc = lp0 + (lp1 - lp0) * k, a = 1 - Math.exp((-6.2832 * fc) / SR); lp += (v - lp) * a; v = lp; }
      if (hp > 0) { const a = 1 - Math.exp((-6.2832 * hp) / SR); hpv += (v - hpv) * a; v -= hpv; }
      const env = Math.min(1, t / atk) * Math.exp(-dec * Math.max(0, t - atk)) * Math.min(1, (m - i) / 60);
      out[o + i] += v * env * gain;
    }
  }
  for (let i = 0; i < n; i++) out[i] = Math.tanh(out[i] * 1.15);
  return out;
}

export class Sound {
  constructor() { this.ctx = null; this.buf = {}; this.muted = false; this.lx = 0; this.lz = 0; this.yaw = 0; this.lastShot = 0; }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext; const c = (this.ctx = new AC());
      this.out = c.createGain(); this.out.gain.value = this.muted ? 0 : this.vol ?? 0.9; const cmp = c.createDynamicsCompressor(); cmp.threshold.value = -14; cmp.ratio.value = 5; this.out.connect(cmp); cmp.connect(c.destination);
      const names = Object.keys(DEF); let i = 0;
      const step = () => { const t0 = performance.now(); while (i < names.length && performance.now() - t0 < 10) { const d = render(DEF[names[i]]), b = c.createBuffer(1, d.length, SR); b.copyToChannel(d, 0); this.buf[names[i++]] = b; } if (i < names.length) setTimeout(step, 0); };
      step();
      // wind bed: looped filtered noise with a slow swell
      const L = SR * 6, wb = c.createBuffer(1, L, SR), wd = wb.getChannelData(0); let a = 0, b2 = 0; for (let k = 0; k < L; k++) { a += (Math.random() * 2 - 1 - a) * 0.02; b2 += (a - b2) * 0.05; const fd = Math.min(1, k / 4000, (L - k) / 4000); wd[k] = b2 * 6 * fd * (0.7 + 0.3 * Math.sin((k / L) * 6.2832 * 2)); }
      const src = c.createBufferSource(); src.buffer = wb; src.loop = true; this.wind = c.createGain(); this.wind.gain.value = 0.1; const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 0.5; this.windF = bp; src.connect(bp); bp.connect(this.wind); this.wind.connect(this.out); src.start();
      if (c.state === 'suspended') c.resume().catch(() => {});
    } catch (e) { this.ctx = null; }
  }
  mute(m) { this.muted = m; if (this.out) this.out.gain.value = m ? 0 : this.vol ?? 0.9; }
  setVolume(v) { this.vol = v; if (this.out && !this.muted) this.out.gain.value = v; }
  weather(snow, fog) { if (this.wind) { this.wind.gain.value = (0.06 + snow * 0.2 + fog * 0.05) * (this.amb ?? 1); this.windF.frequency.value = 320 + snow * 420; } }
  listener(x, z, yaw) { this.lx = x; this.lz = z; this.yaw = yaw; }
  play(name, vol = 1, rate = 1, pan = 0) {
    const c = this.ctx, b = this.buf[name]; if (!c || !b || this.muted || vol <= 0.01) return;
    const s = c.createBufferSource(); s.buffer = b; s.playbackRate.value = rate; const g = c.createGain(); g.gain.value = vol; s.connect(g);
    if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); g.connect(p); p.connect(this.out); } else g.connect(this.out);
    s.start();
  }
  playAt(name, x, z, vol = 1, rate = 1) { const dx = x - this.lx, dz = z - this.lz, d = hyp(dx, dz), a = Math.atan2(dx, dz) - this.yaw; this.play(name, vol * clamp(1.15 - d / 75, 0, 1) ** 1.6, rate * (d > 40 ? 0.92 : 1), -Math.sin(a) * clamp(d / 12, 0, 0.85)); }
  step(vol) { const v = vol * (this.stepVol ?? 0.5); if (v <= 0.002) return; this.stepN = ((this.stepN || 0) + 1 + ((Math.random() * 3) | 0)) % 4; this.stepL = !this.stepL; this.play('step' + this.stepN, v, 0.9 + Math.random() * 0.18, this.stepL ? -0.08 : 0.08); }
  shot(cls, vol = 0.6, rate = 1) { this.play('shot_' + cls, vol, rate * (0.96 + Math.random() * 0.08)); }
  shotAt(cls, x, z) { const t = performance.now(); if (t - this.lastShot < 28) return; this.lastShot = t; this.playAt('shot_' + cls, x, z, 0.55, 0.9 + Math.random() * 0.1); }
}
