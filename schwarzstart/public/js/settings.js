// SCHWARZSTART · options: one schema drives the menu, the defaults and how each choice is applied at runtime
import { IS_TOUCH, el } from './util.js';

// type: 'cycle' (vals) | 'range' (min, max, step) ; apply(ctx, v) runs at boot and on every change
export const OPTIONS = [
  { g: 'Picture', k: 'q', n: 'Quality preset', d: 'Texture detail, shadow resolution, draw distance. Reloads.', vals: ['low', 'mid', 'high'], lbl: (v) => v, reload: 1 },
  { g: 'Picture', k: 'res', n: 'Resolution', d: 'Auto keeps the frame rate steady on phones', vals: ['auto', 0.6, 0.75, 0.9, 1], lbl: (v) => (v === 'auto' ? 'auto' : Math.round(v * 100) + '%'), def: 'auto',
    apply: (c, v) => { c.gfx.fixedScale = v === 'auto' ? null : v; if (v !== 'auto') { c.gfx.scale = v; c.gfx.resize(); } } },
  { g: 'Picture', k: 'draw', n: 'Draw distance', vals: ['auto', 450, 650, 900, 1200], lbl: (v) => (v === 'auto' ? 'auto' : v + ' m'), def: 'auto',
    apply: (c, v) => { c.world.drawDist = v === 'auto' ? c.gfx.q.draw || 800 : v; c.world.cullT = 0; } },
  { g: 'Picture', k: 'shadows', n: 'Shadows', vals: [1, 0], lbl: onoff, def: 1, apply: (c, v) => { c.gfx.sun.castShadow = !!v; } },
  { g: 'Picture', k: 'bloom', n: 'Glow (bloom)', vals: [1, 0], lbl: onoff, def: 1, apply: (c, v) => { c.gfx.bloomOn = !!v; } },
  { g: 'Picture', k: 'grain', n: 'Film grain', vals: [1, 0], lbl: onoff, def: 1, apply: (c, v) => { c.gfx.mFin.uniforms.uGrain.value = v ? 1 : 0; } },
  { g: 'Picture', k: 'fov', n: 'Field of view', type: 'range', min: 48, max: 74, step: 2, def: 56, lbl: (v) => v + '°', apply: (c, v) => { c.game.fovBase = v; } },
  { g: 'Picture', k: 'fps', n: 'Frame counter', vals: [0, 1], lbl: onoff, def: 0, apply: (c, v) => { el('fps').classList.toggle('hidden', !v); c.ui.showFps = !!v; } },
  { g: 'Controls', k: 'autoAim', n: 'Auto aim', d: 'Fire finds the nearest hostile in front of you', vals: [true, false], lbl: onoff, def: IS_TOUCH, apply: (c, v) => { c.game.autoAim = !!v; } },
  { g: 'Controls', k: 'assist', n: 'Aim assist strength', vals: [0.6, 1, 1.4], lbl: (v) => ({ 0.6: 'light', 1: 'normal', 1.4: 'strong' })[v], def: 1, apply: (c, v) => { c.game.assist = v; } },
  { g: 'Controls', k: 'sens', n: 'Look sensitivity', type: 'range', min: 0.3, max: 2.4, step: 0.1, def: 1, lbl: (v) => (+v).toFixed(1), apply: (c, v) => { c.game.sens = +v; } },
  { g: 'Controls', k: 'invY', n: 'Invert look', vals: [false, true], lbl: onoff, def: false, apply: (c, v) => { c.game.invY = !!v; } },
  { g: 'Controls', k: 'btn', n: 'Button size', touch: 1, vals: [0.85, 1, 1.15, 1.3], lbl: (v) => ({ 0.85: 'small', 1: 'normal', 1.15: 'large', 1.3: 'huge' })[v], def: 1, apply: (c, v) => document.body.style.setProperty('--bs', v) },
  { g: 'Controls', k: 'haptics', n: 'Vibration', touch: 1, vals: [1, 0], lbl: onoff, def: 1, apply: (c, v) => { c.game.haptics = !!v; } },
  { g: 'Sound', k: 'mute', n: 'Sound', vals: [false, true], lbl: (v) => (v ? 'off' : 'on'), def: false, apply: (c, v) => c.audio.mute(!!v) },
  { g: 'Sound', k: 'vol', n: 'Master volume', type: 'range', min: 0, max: 1, step: 0.05, def: 0.9, lbl: (v) => Math.round(v * 100) + '%', apply: (c, v) => c.audio.setVolume && c.audio.setVolume(+v) },
  { g: 'Sound', k: 'amb', n: 'Wind and city', type: 'range', min: 0, max: 1, step: 0.05, def: 1, lbl: (v) => Math.round(v * 100) + '%', apply: (c, v) => { c.audio.amb = +v; } },
  { g: 'Display', k: 'dmgNum', n: 'Damage numbers', vals: [1, 0], lbl: onoff, def: 1, apply: (c, v) => { c.ui.dmgOn = !!v; } },
  { g: 'Display', k: 'hints', n: 'Tips', vals: [1, 0], lbl: onoff, def: 1, apply: (c, v) => { c.ui.hintsOn = !!v; } },
  { g: 'Display', k: 'north', n: 'Minimap', vals: [0, 1], lbl: (v) => (v ? 'north up' : 'turns with you'), def: 0, apply: (c, v) => { c.ui.northUp = !!v; } },
  { g: 'Display', k: 'ui', n: 'Interface size', vals: [0.9, 1, 1.12, 1.25], lbl: (v) => Math.round(v * 100) + '%', def: 1, apply: (c, v) => document.body.style.setProperty('--uis', v) },
  { g: 'Accessibility', k: 'motion', n: 'Camera shake', vals: [1, 0.4, 0], lbl: (v) => ({ 1: 'full', 0.4: 'reduced', 0: 'off' })[v], def: 1, apply: (c, v) => { c.game.motion = v; } },
  { g: 'Accessibility', k: 'contrast', n: 'Enemy markers', vals: [0, 1], lbl: (v) => (v ? 'high contrast' : 'faction colour'), def: 0, apply: (c, v) => { c.ui.hiContrast = !!v; } },
  { g: 'Game', k: 'diff', n: 'Difficulty', vals: [0, 1, 2], lbl: (v) => ['gentle', 'normal', 'hard'][v], def: 1, apply: (c, v) => { c.game.diff = [0.6, 1, 1.4][v]; c.game.diffHp = [0.75, 1, 1.3][v]; } },
];
function onoff(v) { return v ? 'on' : 'off'; }

export function optDefaults(opt = {}) {
  for (const o of OPTIONS) if (opt[o.k] === undefined && o.def !== undefined) opt[o.k] = o.def;
  return opt;
}
export function applyAll(ctx, opt) { for (const o of OPTIONS) if (o.apply && opt[o.k] !== undefined) { try { o.apply(ctx, opt[o.k]); } catch (e) { console.warn('opt', o.k, e); } } }
export function setOpt(ctx, opt, k, v) {
  const o = OPTIONS.find((q) => q.k === k); if (!o) return;
  if (o.type === 'range') v = Math.min(o.max, Math.max(o.min, +v)); opt[k] = v;
  if (o.apply) o.apply(ctx, v);
  return o.reload;
}
export function cycleOpt(ctx, opt, k) { const o = OPTIONS.find((q) => q.k === k); const i = o.vals.findIndex((x) => x === opt[k]); return setOpt(ctx, opt, k, o.vals[(i + 1) % o.vals.length]); }

export function renderOptions(opt) {
  let g = '', h = '';
  for (const o of OPTIONS) {
    if (o.touch && !IS_TOUCH) continue;
    if (o.g !== g) { g = o.g; h += `<div class="sec">${g}</div>`; }
    const v = opt[o.k], desc = o.d ? `<br><small>${o.d}</small>` : '';
    if (o.type === 'range') h += `<div class="opt"><span>${o.n}${desc}</span><span class="rng"><input type="range" min="${o.min}" max="${o.max}" step="${o.step}" value="${v}" data-opt="${o.k}"><b>${o.lbl(v)}</b></span></div>`;
    else h += `<div class="opt"><span>${o.n}${desc}</span><button class="pill sm" data-cyc="${o.k}">${o.lbl(v)}</button></div>`;
  }
  return h;
}

// ---------------------------------------------------------------- agent creator
export const AGENT = {
  styles: [['Streife', 1, 'Softshell, plate carrier, beanie and scarf'], ['Winterdienst', 2, 'Parka with fur ruff, chest rig, big pack'], ['Nachtschicht', 3, 'Hoodie, plate carrier, cap and balaclava']],
  builds: [['A', 'm'], ['B', 'f']],
  skins: [0xe7c3a6, 0xd6a882, 0xbf8d68, 0x9c6b48, 0x7a4f33, 0x5a3a26],
  rows: [
    ['top', 'Jacket', [0x1f2a36, 0x2b3a2e, 0x3a3532, 0x4a4f55, 0x5c4630, 0x6b2a26, 0x1a1c1f, 0x8a8f94]],
    ['pants', 'Trousers', [0x3a3d40, 0x2a2c30, 0x4a463c, 0x2f3b4f, 0x55513f, 0x1c1d20]],
    ['gear', 'Vest and pack', [0x24292e, 0x3d4434, 0x5a5040, 0x2c3238, 0x6a6a60, 0x15171a]],
    ['accent', 'Armband', [0xe0d23c, 0xe0601c, 0xc8282a, 0x3a7bd5, 0x5fbf6a, 0xe8e8e8]],
    ['hat', 'Headwear', [0x22262b, 0x3a4250, 0x6b2a26, 0x4a4f3a, 0x8a8f94, 0x5c4630]],
    ['face', 'Scarf or mask', [0x3d4650, 0x22262b, 0x6b2a26, 0x4a4f3a, 0x8a7a5a, 0xc9c4b8]],
  ],
};
export function outfitName(style, build) { return `agent_${build}_${style}`; }
export function renderAgent(look) {
  const cur = look.outfit || 'agent_m_1', [, b, st] = cur.split('_'), pal = look.pal || {}, sw = (k, hex) => `<button class="sw${(pal[k] ?? -1) === hex ? ' on' : ''}" style="--c:#${hex.toString(16).padStart(6, '0')}" data-sw="${k}" data-v="${hex}"></button>`;
  let h = `<div class="sec">Agent</div><p class="note">Your Lotse in the Notbetrieb. Changes apply at once and are saved with your shift.</p><div class="sec">Outfit</div><div class="row">`;
  for (const [n, i, d] of AGENT.styles) h += `<button class="pill sm${+st === i ? ' hot' : ''}" data-ag="style" data-v="${i}" title="${d}">${n}</button>`;
  h += `</div><div class="sec">Build</div><div class="row">`;
  for (const [n, k] of AGENT.builds) h += `<button class="pill sm${b === k ? ' hot' : ''}" data-ag="build" data-v="${k}">${n}</button>`;
  h += `</div><div class="sec">Skin</div><div class="row">${AGENT.skins.map((x) => sw('skin', x)).join('')}</div>`;
  for (const [k, n, cols] of AGENT.rows) h += `<div class="sec">${n}</div><div class="row">${cols.map((x) => sw(k, x)).join('')}</div>`;
  return h;
}
