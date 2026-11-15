// SCHWARZSTART · litter: what lies at your feet. Leaves, twigs, branches, newspaper, cardboard, bags, cans, flyers,
// grit and oil stains. Positions are scattered once along walls, gutters, lawns and roads (furniture.js); this module
// paints the atlas and draws the pieces around the player as a single instanced layer that follows them.
import * as THREE from 'three';
import { rng } from './util.js';

const T = 128, COLS = 8, ROWS = 2;

function atlas() {
  const c = document.createElement('canvas'); c.width = T * COLS; c.height = T * ROWS; const x = c.getContext('2d'), r = rng(9917);
  const at = (i, fn) => { x.save(); x.translate((i % COLS) * T, Math.floor(i / COLS) * T); x.beginPath(); x.rect(0, 0, T, T); x.clip(); fn(); x.restore(); };
  const rgb = (a, k = 1) => `rgb(${Math.min(255, a[0] * k) | 0},${Math.min(255, a[1] * k) | 0},${Math.min(255, a[2] * k) | 0})`;
  const leaf = (px, py, s, a, col) => {
    x.save(); x.translate(px, py); x.rotate(a); x.fillStyle = col; x.beginPath(); x.moveTo(-s, 0); x.quadraticCurveTo(-s * 0.2, -s * 0.55, s, 0); x.quadraticCurveTo(-s * 0.2, s * 0.55, -s, 0); x.fill();
    x.strokeStyle = 'rgba(30,18,8,.55)'; x.lineWidth = 0.8; x.beginPath(); x.moveTo(-s * 1.15, 0); x.lineTo(s * 0.9, 0); x.stroke(); x.restore();
  };
  const LEAF = [[124, 72, 30], [150, 98, 38], [96, 58, 26], [168, 120, 52], [110, 84, 40], [78, 52, 30], [140, 60, 28]];
  const twig = (px, py, len, a, w, depth) => {
    const ex = px + Math.cos(a) * len, ey = py + Math.sin(a) * len; x.strokeStyle = 'rgb(44,32,24)'; x.lineWidth = w; x.lineCap = 'round'; x.beginPath(); x.moveTo(px, py);
    x.quadraticCurveTo((px + ex) / 2 + (r() - 0.5) * len * 0.25, (py + ey) / 2 + (r() - 0.5) * len * 0.25, ex, ey); x.stroke();
    if (depth > 0) for (let k = 0; k < 2; k++) { const t = 0.35 + r() * 0.5; twig(px + (ex - px) * t, py + (ey - py) * t, len * (0.35 + r() * 0.3), a + (r() < 0.5 ? -1 : 1) * (0.4 + r() * 0.6), w * 0.6, depth - 1); }
  };
  const blob = (cx, cy, rad, n, jit, fill) => { x.fillStyle = fill; x.beginPath(); for (let k = 0; k <= n; k++) { const a = (k / n) * 6.2832, rr = rad * (1 - jit + r() * jit * 2); const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr; k ? x.lineTo(px, py) : x.moveTo(px, py); } x.closePath(); x.fill(); };
  const sheet = (cx, cy, w, h, a, base, lines) => {
    x.save(); x.translate(cx, cy); x.rotate(a); x.fillStyle = base; x.beginPath(); x.moveTo(-w / 2, -h / 2); x.lineTo(w / 2 - r() * 4, -h / 2 + r() * 3); x.lineTo(w / 2, h / 2 - r() * 4); x.lineTo(-w / 2 + r() * 3, h / 2); x.closePath(); x.fill();
    const g = x.createLinearGradient(-w / 2, 0, w / 2, 0); g.addColorStop(0, 'rgba(0,0,0,.12)'); g.addColorStop(0.45, 'rgba(255,255,255,.05)'); g.addColorStop(0.55, 'rgba(0,0,0,.14)'); g.addColorStop(1, 'rgba(0,0,0,.04)'); x.fillStyle = g; x.fill();
    if (lines) { x.fillStyle = 'rgba(40,40,44,.55)'; for (let yy = -h / 2 + 6; yy < h / 2 - 5; yy += 4.2) for (let xx = -w / 2 + 5; xx < w / 2 - 6; xx += 10 + r() * 6) x.fillRect(xx, yy, 5 + r() * 6, 1.4); x.fillStyle = 'rgba(20,20,24,.7)'; x.fillRect(-w / 2 + 5, -h / 2 + 3, w * 0.6, 3); }
    x.restore();
  };
  at(0, () => { for (let k = 0; k < 26; k++) { const a = r() * 6.28, d = Math.sqrt(r()) * 46; leaf(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, 6 + r() * 6, r() * 6.28, rgb(LEAF[(r() * LEAF.length) | 0], 0.85 + r() * 0.3)); } });
  at(1, () => { blob(64, 64, 40, 18, 0.35, 'rgba(36,28,20,.55)'); for (let k = 0; k < 30; k++) { const a = r() * 6.28, d = Math.sqrt(r()) * 40; leaf(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, 5 + r() * 6, r() * 6.28, rgb(LEAF[(r() * LEAF.length) | 0], 0.45 + r() * 0.2)); } });
  at(2, () => { for (let k = 0; k < 5; k++) twig(20 + r() * 88, 20 + r() * 88, 30 + r() * 30, r() * 6.28, 2.2, 2); });
  at(3, () => { twig(8, 104, 150, -0.72, 5.5, 3); });
  at(4, () => { sheet(64, 64, 92, 70, (r() - 0.5) * 0.6, 'rgb(206,204,196)', true); });
  at(5, () => { for (let k = 0; k < 9; k++) sheet(18 + r() * 92, 18 + r() * 92, 10 + r() * 16, 8 + r() * 12, r() * 6.28, k % 3 ? 'rgb(222,220,214)' : 'rgb(196,186,160)', false); });
  at(6, () => { sheet(64, 64, 100, 74, (r() - 0.5) * 0.4, 'rgb(150,116,74)', false); x.strokeStyle = 'rgba(70,50,30,.6)'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(20, 64); x.lineTo(108, 60); x.stroke(); x.fillStyle = 'rgba(200,190,150,.8)'; x.fillRect(56, 30, 14, 66); });
  at(7, () => { blob(64, 66, 34, 22, 0.32, 'rgb(214,218,222)'); x.fillStyle = 'rgba(60,90,160,.5)'; for (let k = 0; k < 4; k++) blob(50 + r() * 28, 52 + r() * 28, 8 + r() * 6, 10, 0.4, 'rgba(70,100,170,.55)'); x.fillStyle = 'rgba(0,0,0,.15)'; blob(70, 74, 18, 12, 0.4, 'rgba(0,0,0,.14)'); });
  at(8, () => { x.strokeStyle = 'rgba(18,18,18,.85)'; x.lineCap = 'round'; const crack = (px, py, a, len, w, d) => { const ex = px + Math.cos(a) * len, ey = py + Math.sin(a) * len; x.lineWidth = w; x.beginPath(); x.moveTo(px, py); x.lineTo(ex, ey); x.stroke(); if (d > 0) { crack(ex, ey, a + (r() - 0.5) * 1.2, len * 0.8, w * 0.75, d - 1); if (r() < 0.6) crack(ex, ey, a + (r() < 0.5 ? -1 : 1) * (0.6 + r() * 0.6), len * 0.6, w * 0.6, d - 1); } }; crack(10, 70, -0.1, 20, 2.6, 4); });
  at(9, () => { const g = x.createRadialGradient(64, 64, 4, 64, 64, 52); g.addColorStop(0, 'rgba(10,10,12,.62)'); g.addColorStop(0.6, 'rgba(14,14,16,.38)'); g.addColorStop(1, 'rgba(14,14,16,0)'); x.fillStyle = g; for (let k = 0; k < 3; k++) blob(54 + r() * 20, 54 + r() * 20, 34 + r() * 14, 16, 0.3, g); });
  at(10, () => { for (let k = 0; k < 7; k++) { const px = 16 + r() * 96, py = 16 + r() * 96, a = r() * 6.28; x.save(); x.translate(px, py); x.rotate(a); x.fillStyle = 'rgb(226,222,210)'; x.fillRect(-5, -1.6, 7, 3.2); x.fillStyle = 'rgb(196,130,60)'; x.fillRect(2, -1.6, 3.5, 3.2); x.restore(); } for (let k = 0; k < 4; k++) blob(16 + r() * 96, 16 + r() * 96, 3, 8, 0.1, ['rgb(170,40,30)', 'rgb(190,190,196)', 'rgb(40,90,50)'][k % 3]); });
  at(11, () => { blob(64, 64, 42, 20, 0.35, 'rgb(150,152,156)'); for (let k = 0; k < 120; k++) { x.fillStyle = r() < 0.5 ? 'rgba(220,224,230,.8)' : 'rgba(80,78,74,.6)'; x.fillRect(26 + r() * 76, 26 + r() * 76, 2, 2); } });
  at(12, () => { x.save(); x.translate(44, 60); x.rotate(0.5); x.fillStyle = 'rgb(176,40,34)'; x.fillRect(-14, -8, 28, 16); x.fillStyle = 'rgb(200,200,206)'; x.fillRect(-14, -8, 4, 16); x.fillRect(10, -8, 4, 16); x.restore();
    x.save(); x.translate(84, 80); x.rotate(-0.9); x.fillStyle = 'rgb(44,84,52)'; x.fillRect(-20, -6, 30, 12); x.fillRect(10, -3, 12, 6); x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(-18, -4, 26, 2); x.restore(); });
  at(13, () => { for (let k = 0; k < 4; k++) { const px = 26 + r() * 76, py = 26 + r() * 76, s = 12 + r() * 8; for (let l = 0; l < 5; l++) leaf(px, py, s * (l === 2 ? 1 : 0.75), r() * 0.3 + l * 1.25, rgb(LEAF[(r() * LEAF.length) | 0], 0.9)); } });
  at(14, () => { const P = [[215, 207, 184], [179, 58, 44], [43, 74, 122], [224, 178, 58], [232, 226, 213]]; for (let k = 0; k < 5; k++) sheet(20 + r() * 88, 20 + r() * 88, 18 + r() * 26, 14 + r() * 20, r() * 6.28, rgb(P[(r() * P.length) | 0]), r() < 0.4); });
  at(15, () => { for (let k = 0; k < 520; k++) { const a = r() * 6.28, d = Math.sqrt(r()) * 56; x.fillStyle = r() < 0.4 ? 'rgba(210,210,214,.75)' : 'rgba(96,92,86,.7)'; x.fillRect(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, 1.6, 1.6); } });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

export class Litter {
  constructor(gfx, world) {
    this.W = world; this.max = gfx.tier === 'low' ? 700 : gfx.tier === 'mid' ? 1500 : 2200; this.R = gfx.tier === 'low' ? 42 : gfx.tier === 'mid' ? 58 : 72; this.cx = 1e9; this.cz = 1e9;
    const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
    this.tile = new THREE.InstancedBufferAttribute(new Float32Array(this.max), 1); geo.setAttribute('aTile', this.tile);
    const m = new THREE.MeshStandardMaterial({ map: atlas(), transparent: true, depthWrite: false, alphaTest: 0.04, roughness: 0.72, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aTile;')
        .replace('#include <uv_vertex>', `#include <uv_vertex>\n vMapUv = vMapUv * vec2( ${(1 / COLS).toFixed(5)}, ${(1 / ROWS).toFixed(5)} ) + vec2( mod( aTile, ${COLS}.0 ) / ${COLS}.0, ( ${ROWS - 1}.0 - floor( aTile / ${COLS}.0 ) ) / ${ROWS}.0 );`);
    };
    m.customProgramCacheKey = () => 'litter';
    this.mesh = new THREE.InstancedMesh(geo, m, this.max); this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.mesh.count = 0; this.mesh.frustumCulled = false; this.mesh.receiveShadow = true; this.mesh.renderOrder = 3;
    gfx.scene.add(this.mesh); this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3(); this._y = new THREE.Vector3(0, 1, 0);
  }
  update(px, pz) {
    const L = this.W.litter; if (!L || Math.hypot(px - this.cx, pz - this.cz) < 7) return; this.cx = px; this.cz = pz;
    const R = this.R, c = L.cell, x0 = Math.floor((px - R) / c), x1 = Math.floor((px + R) / c), z0 = Math.floor((pz - R) / c), z1 = Math.floor((pz + R) / c), near = [];
    for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) { const a = L.map.get(i * 4096 + j); if (!a) continue; for (let k = 0; k < a.length; k += 4) { const d = (a[k] - px) ** 2 + (a[k + 1] - pz) ** 2; if (d < R * R) near.push(d, k, a); } }
    const n = near.length / 3, idx = Array.from({ length: n }, (_, i) => i); if (n > this.max) idx.sort((u, v) => near[u * 3] - near[v * 3]);
    const cnt = Math.min(n, this.max);
    for (let q = 0; q < cnt; q++) {
      const i = idx[q], a = near[i * 3 + 2], k = near[i * 3 + 1], tile = a[k + 3] % 16, s = Math.floor(a[k + 3] / 16) / 10 * (tile === 3 ? 1.7 : 1);
      this._q.setFromAxisAngle(this._y, a[k + 2]); this._m.compose(this._p.set(a[k], 0.035 + (q % 7) * 0.002, a[k + 1]), this._q, this._s.set(s, 1, s)); this.mesh.setMatrixAt(q, this._m); this.tile.array[q] = tile;
    }
    this.mesh.count = cnt; this.mesh.instanceMatrix.needsUpdate = true; this.tile.needsUpdate = true;
  }
}
