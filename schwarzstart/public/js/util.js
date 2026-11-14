// SCHWARZSTART · shared helpers
export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
export const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
export const dampAng = (a, b, k, dt) => a + angDiff(a, b) * (1 - Math.exp(-k * dt));
export const hyp = Math.hypot;

export function rng(seed) {            // mulberry32
  let a = seed >>> 0;
  const f = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.r = (a, b) => a + (b - a) * f();
  f.i = (a, b) => Math.floor(a + (b - a + 1) * f());
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  return f;
}
export const R = rng((Date.now() ^ 0x5bd1e995) >>> 0);   // gameplay randomness

export const IS_TOUCH = (typeof navigator !== 'undefined') && (navigator.maxTouchPoints > 0 || 'ontouchstart' in window);
export const IS_MOBILE = IS_TOUCH && /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent || '') || (IS_TOUCH && Math.min(screen.width, screen.height) < 820);

export function loadImage(url) {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('image ' + url)); im.src = url; });
}
export async function loadJSON(url) { const r = await fetch(url); if (!r.ok) throw new Error('fetch ' + url); return r.json(); }
export function imagePixels(im, w = im.naturalWidth || im.width, h = im.naturalHeight || im.height) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, w, h);
  return x.getImageData(0, 0, w, h);
}

// per-viewer persistence. May be missing or throw inside the app frame: the game must run without it.
export const store = {
  get(k, d) { try { const v = localStorage.getItem('schwarzstart.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('schwarzstart.' + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem('schwarzstart.' + k); } catch (e) { /* ignore */ } },
};
export const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'k' : Math.round(n).toLocaleString('de-DE'));
export const el = (id) => document.getElementById(id);
export function h(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
