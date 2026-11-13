// the less travelled paths: no half-float textures (older chips), a lost and restored graphics context, reduced motion,
// the viewer's runtime present (saving a picture, newer wind arriving through the store), deep links old and new, keys, a small phone, turning the phone
const { launch, open, frames } = require('./lib');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fail = []; const ok = (c, m) => { if (!c) { fail.push(m); console.log('  FAIL ' + m); } else console.log('  ok   ' + m); };
const S = page => page.evaluate(() => { const L = window.__lc, w = L.WORLDS[L.CURI]; return { id: w.id, dbg: w.o.dbg ? w.o.dbg() : null, errs: L.errs.slice(0, 6), data: document.getElementById('data').textContent, ghosts: Object.keys(L.GP).length, hash: location.hash, gl: L.GLX.ok, lost: L.GLX.lost, hf: !!L.GLX.hf, hfRT: L.GLX.hfRT, deriv: L.GLX.deriv, on: L.ON.join(''), want: L.AU.want, run: L.AU.run, stg: L.STG }; });
(async () => {
  const browser = await launch(); let all = [];
  // ---- 1. an older chip: no half floats, no derivatives ----
  { console.log('OLD CHIP');
    const { page, errs, ctx } = await open(browser, 'phone', { init: () => { const g = WebGLRenderingContext.prototype.getExtension; WebGLRenderingContext.prototype.getExtension = function (n) { if (/half_float|standard_derivatives|anisotropic/.test(n)) return null; return g.call(this, n); }; } });
    await sleep(900); await page.evaluate(() => { window.__lc.GOV.n = -1e9; });
    for (const i of [0, 1, 2]) { await page.evaluate(i => window.__lc.go(i, true), i); await sleep(i >= 1 ? 6500 : 5000); const s = await S(page); await page.screenshot({ path: `shots/misc_old_${s.id}.png` });
      if (i === 0) ok(s.dbg.ok && s.dbg.simple && !s.hf, 'smoke falls back to plain ink');
      if (i === 1) { ok(s.dbg.ok && s.dbg.byte8 && s.dbg.ready && s.dbg.wind && !s.deriv && s.dbg.fireGL > 4, 'the Earth keeps its smoke in plain bytes, feeds it from the fires, and draws the globe without derivatives'); const n = await page.evaluate(() => window.__lc.ORBIT.dbg().n); ok(n > 10000, 'the Earth has its satellites: ' + n); }
      if (i === 2) ok(s.dbg.on && s.dbg.count >= 200, 'the mixer opens, with its sounds: ' + s.dbg.count);
      ok(!s.errs.length, s.id + ' no page errors ' + JSON.stringify(s.errs)); }
    all = all.concat(errs.map(e => 'old: ' + e)); await ctx.close(); }
  // ---- 2. the graphics context lost and given back, in every world ----
  { console.log('CONTEXT LOST AND RESTORED');
    const { page, errs, ctx } = await open(browser, 'phone'); await sleep(900); await page.evaluate(() => { window.__lc.GOV.n = -1e9; });
    for (let i = 0; i < 3; i++) { await page.evaluate(i => window.__lc.go(i, true), i); await sleep(i >= 1 ? 4800 : 1200);
      await page.evaluate(() => { const L = window.__lc; L._ext = L.GLX.gl.getExtension('WEBGL_lose_context'); L._ext.loseContext(); }); await sleep(500);
      let s = await S(page); const wasLost = s.lost; await page.evaluate(() => window.__lc._ext.restoreContext()); await sleep(i >= 1 ? 2800 : 1500); s = await S(page);
      ok(wasLost && !s.lost && s.gl && !s.errs.length, s.id + ' survives losing its graphics context ' + JSON.stringify(s.errs));
      if (i === 1) { ok(s.dbg.ready && s.dbg.wind && s.dbg.aurora && s.dbg.ok && s.dbg.fireGL === s.dbg.fires && s.dbg.fires > 4, 'the Earth has its pictures, its wind, its smoke and its fires back'); const n = await page.evaluate(() => window.__lc.ORBIT.dbg().n); ok(n > 10000, 'and its satellites'); }
      if (i === 2) ok(s.dbg.on, 'the mixer is still there'); await page.screenshot({ path: `shots/misc_restored_${s.id}.png` }); }
    all = all.concat(errs.filter(e => !/CONTEXT_LOST|context lost|WebGL: INVALID_OPERATION|loseContext/i.test(e)).map(e => 'ctx: ' + e)); await ctx.close(); }
  // ---- 3. reduced motion ----
  { console.log('REDUCED MOTION');
    const { page, errs, ctx } = await open(browser, 'phone', { reduce: true }); await sleep(900);
    for (let i = 0; i < 3; i++) { await page.evaluate(i => window.__lc.go(i, true), i); await sleep(i >= 1 ? 5200 : 1300); const s = await S(page); ok(s.ghosts === 0 && !s.errs.length, s.id + ' still, no hint fingers, no errors');
      if (i === 1) { const o = await page.evaluate(() => window.__lc.ORBIT.dbg()); ok(o.want === 1 && Math.abs(o.off) < 2000, 'the satellites keep to the present, second for second'); } await page.screenshot({ path: `shots/misc_reduce_${s.id}.png` }); }
    all = all.concat(errs.map(e => 'reduce: ' + e)); await ctx.close(); }
  // ---- 4. the viewer's runtime: saving a picture, newer wind through the store ----
  { console.log('VIEWER RUNTIME');
    const { page, errs, ctx } = await open(browser, 'phone', { hash: '#wind', init: () => { window.__subs = {}; window.__docs = {}; window.__gets = []; window.__saved = null;
      const snap = (p, d) => ({ id: p.split('/').pop(), exists: !!d, data: () => d || undefined, metadata: { fromCache: false, hasPendingWrites: false } });
      window.claude = { use: n => new Promise(res => setTimeout(() => res(n === 'downloads' ? { save: o => { window.__saved = { filename: o.filename, size: o.data && o.data.size, type: o.data && o.data.type }; return Promise.resolve({ status: 'saved' }); } } : n === 'db' ? { doc: p => ({
        onSnapshot: (cb, er) => { window.__subs[p] = d => cb(snap(p, d)); setTimeout(() => cb(snap(p, null)), 30); return () => { }; }, get: () => { window.__gets.push(p); return Promise.resolve(snap(p, window.__docs[p])); } }) } : null), 60)) }; } });
    await sleep(6500); let s = await S(page); ok(s.id === 'earth' && s.hash === '#earth', 'an old link with #wind opens the Earth');
    const subs = await page.evaluate(() => Object.keys(window.__subs)); ok(subs.length === 1 && subs[0] === 'feeds/stamp', 'the page watches one small stamp in its store, nothing more: ' + subs);
    const at0 = await page.evaluate(() => window.__lc.LIVE.at.wind); ok(at0 > 0 && s.dbg.wind, 'the wind the page was published with is in the air: ' + s.data.split('\n')[1]);
    // the hint taps a place now and then, and its reading stands in for the summary: a tap on the dark puts it away, and the hint is held
    await page.evaluate(() => window.__lc.WIND.look(20, -40, .6)); await sleep(400); await page.mouse.click(12, 200); await sleep(300); await page.evaluate(() => window.__lc.WIND.look(20, -40, .6)); await sleep(300);
    // an older stamp: nothing is fetched
    await page.evaluate(() => { window.__docs['feeds/wind'] = { asOf: '2026-11-01T00:00:00Z', max: 5, b64: 'AAAA' }; window.__subs['feeds/stamp']({ wind: '2026-11-01T00:00:00Z', sats: '2026-11-01T00:00:00Z' }); }); await sleep(300);
    let r = await page.evaluate(() => ({ gets: window.__gets.slice(), at: window.__lc.LIVE.at.wind })); ok(r.gets.length === 0 && r.at === at0, 'an older stamp fetches nothing');
    // a newer one: a steady 20 m/s westerly everywhere
    await page.evaluate(() => { const n = 360 * 181 * 2, b = new Uint8Array(n); for (let i = 0; i < n; i += 2) { b[i] = 192; b[i + 1] = 128; } let t = ''; for (let i = 0; i < n; i += 8192) t += String.fromCharCode.apply(null, b.subarray(i, i + 8192));
      window.__docs['feeds/wind'] = { asOf: '2030-01-02T06:00:00Z', src: 'NOAA GFS', max: 20, b64: btoa(t) }; window.__subs['feeds/stamp']({ wind: '2030-01-02T06:00:00Z' }); }); await sleep(900);
    s = await S(page); r = await page.evaluate(() => ({ gets: window.__gets.slice(), at: window.__lc.LIVE.at.wind }));
    ok(r.gets.join() === 'feeds/wind' && r.at === Date.parse('2030-01-02T06:00:00Z') && /2 Jan 06:00 UTC/.test(s.data) && /72 km\/h/.test(s.data), 'newer wind in the store takes over at once: ' + s.data.split('\n')[1]);
    // a broken one, newer still: ignored, and the page is unharmed
    await page.evaluate(() => { window.__docs['feeds/wind'] = { asOf: '2031-01-01T00:00:00Z', b64: 'not the wind' }; window.__docs['feeds/sats'] = { asOf: '2031-01-01T00:00:00Z', b64: 'AAAA', names: 5 }; window.__subs['feeds/stamp']({ wind: '2031-01-01T00:00:00Z', sats: '2031-01-01T00:00:00Z' }); }); await sleep(600);
    s = await S(page); r = await page.evaluate(() => ({ at: window.__lc.LIVE.at.wind, n: window.__lc.LIVE.sats.n })); ok(r.at === Date.parse('2030-01-02T06:00:00Z') && r.n > 10000 && !s.errs.length, 'broken documents are ignored without harm');
    // fires and storms arrive the same way; what a storm is called is cleaned before it is shown
    await page.evaluate(() => { const b = new Uint8Array(20), v = new DataView(b.buffer); [[-2000, 13000, 900, 60], [1000, 2000, 300, 120]].forEach((f, i) => { v.setInt16(i * 10, f[0], true); v.setInt16(i * 10 + 2, f[1], true); v.setUint16(i * 10 + 4, f[2], true); v.setUint16(i * 10 + 6, f[3], true); v.setUint8(i * 10 + 8, 0); v.setUint8(i * 10 + 9, 90); });
      window.__docs['feeds/fires'] = { asOf: '2030-01-02T06:00:00Z', sats: ['Test <b>SAT</b>'], b64: btoa(String.fromCharCode.apply(null, b)) };
      window.__docs['feeds/storms'] = { asOf: '2030-01-02T06:00:00Z', list: [{ name: 'Zed<script>', cls: 'HU', lat: 12, lon: -40, kmh: 150, hpa: 960, by: 'NOAA NHC', at: '2030-01-02T03:00:00Z' }, { name: 'bad', lat: 999, lon: 0 }] };
      window.__subs['feeds/stamp']({ fires: '2030-01-02T06:00:00Z', storms: '2030-01-02T06:00:00Z' }); }); await sleep(900);
    s = await S(page); r = await page.evaluate(() => { const L = window.__lc.LIVE; return { f: L.fires.list.length, sat: L.fires.list[0].sat, st: L.storms.list.map(x => x.name).join(), gets: window.__gets.slice() }; });
    ok(r.f === 2 && r.sat === 'Test bSATb' && r.st === 'Zedscript' && s.dbg.fires === 2 && s.dbg.fireGL === 2 && s.dbg.storms.length === 1 && /2 fires seen from orbit · tropical storm Zedscript/.test(s.data) && !s.errs.length, 'newer fires and storms in the store take over, cleaned: ' + JSON.stringify(r) + ' ' + s.data.split('\n')[3]);
    const saveShown = await page.evaluate(() => !document.getElementById('bSave').hidden); ok(saveShown, 'the save button shows when the viewer can take a file');
    await page.evaluate(() => document.getElementById('bSave').click()); let saved = null; for (let k = 0; k < 24 && !saved; k++) { await sleep(400); saved = await page.evaluate(() => window.__saved); }
    ok(saved && /^live-culture-earth-\d{8}-\d{6}\.png$/.test(saved.filename) && saved.size > 20000, 'saving hands over a PNG: ' + JSON.stringify(saved));
    all = all.concat(errs.map(e => 'rt: ' + e)); await ctx.close(); }
  // ---- 5. keys, deep links, a small phone, turning the phone ----
  { console.log('KEYS, LINKS, SIZES');
    const { page, errs, ctx } = await open(browser, 'small', { hash: '#earth' }); await sleep(900); let s = await S(page); ok(s.id === 'earth' && s.hash === '#earth', 'a link to #earth opens the Earth');
    await page.keyboard.press('3'); await sleep(700); s = await S(page); ok(s.id === 'mix' && s.hash === '#mix', 'the 3 key goes to the mixer and the link follows');
    ok(s.want, 'the first key pressed starts the music, as a first touch does');
    await page.keyboard.press('Space'); await sleep(600); s = await S(page); ok(!s.want, 'the space bar turns the music off');
    await page.keyboard.press('Space'); await sleep(900); s = await S(page); ok(s.want, 'and on again');
    for (const old of ['wind', 'orbit', 'live']) { await page.evaluate(() => window.__lc.go(0, true)); await page.evaluate(h => { location.hash = '#' + h; }, old); await sleep(700); s = await S(page); ok(s.id === 'earth' && s.hash === '#earth', 'the old link #' + old + ' goes to the Earth'); }
    for (const old of ['drift', 'band', 'bloom', 'loom']) { await page.evaluate(() => window.__lc.go(1, true)); await page.evaluate(h => { location.hash = '#' + h; }, old); await sleep(600); s = await S(page); ok(s.id === 'smoke' && s.hash === '#smoke', 'the old link #' + old + ' goes to Smoke'); }
    for (let i = 0; i < 3; i++) { await page.evaluate(i => window.__lc.go(i, true), i); await sleep(i >= 1 ? 4200 : 900); s = await S(page); await page.screenshot({ path: `shots/misc_small_${s.id}.png` }); ok(!s.errs.length && s.stg.h > 300, s.id + ' fits a 360 by 640 phone, stage ' + s.stg.w + ' by ' + s.stg.h); }
    const fits = () => page.evaluate(() => { const c = document.getElementById('card').getBoundingClientRect(), f = document.getElementById('foot').getBoundingClientRect(), L = window.__lc.ORBIT.dbg(); return { hidden: document.getElementById('card').hidden, top: Math.round(c.top), bottom: Math.round(c.bottom), left: Math.round(c.left), right: Math.round(c.right), foot: Math.round(f.top), iw: innerWidth, sw: document.documentElement.scrollWidth, cat: L.cat }; });
    await page.evaluate(() => window.__lc.go(1, true)); await sleep(2500); await page.evaluate(() => window.__lc.ORBIT.pick('ISS (ZARYA)')); await sleep(2200); let c = await fits(); await page.screenshot({ path: 'shots/misc_small_card.png' });
    ok(!c.hidden && c.cat && c.bottom <= c.foot + 1 && c.top > 60 && c.left >= 8 && c.right <= c.iw - 8 && c.sw <= c.iw, 'the satellite card fits a 360 by 640 phone ' + JSON.stringify(c));
    const row = await page.evaluate(() => { const d = document.getElementById('dotrow').getBoundingClientRect(), b = [...document.querySelectorAll('#dotrow .dot')].map(e => e.getBoundingClientRect()); return { left: Math.round(d.left), right: Math.round(d.right), n: b.length, minW: Math.round(Math.min(...b.map(x => x.width))), minH: Math.round(Math.min(...b.map(x => x.height))), iw: innerWidth }; });
    ok(row.n === 10 && row.left >= 0 && row.right <= row.iw && row.minW >= 24 && row.minH >= 24, 'the note and the nine circles fit, each big enough for a finger ' + JSON.stringify(row));
    const over = await page.evaluate(() => { const r = document.getElementById('rail').getBoundingClientRect(), a = document.querySelector('.acts').getBoundingClientRect(), m = document.querySelector('.mark').getBoundingClientRect(); return { rail: [Math.round(r.left), Math.round(r.right)], acts: [Math.round(a.left), Math.round(a.right)], mark: [Math.round(m.left), Math.round(m.right)], sw: document.documentElement.scrollWidth, iw: innerWidth }; });
    ok(over.rail[0] >= 8 && over.rail[1] <= over.iw - 8 && over.mark[1] < over.acts[0] && over.sw <= over.iw, 'nothing runs off or collides at 360 wide ' + JSON.stringify(over));
    await page.setViewportSize({ width: 640, height: 360 }); await sleep(900); for (let i = 0; i < 3; i++) { await page.evaluate(i => window.__lc.go(i, true), i); await sleep(i >= 1 ? 1800 : 800); s = await S(page); ok(!s.errs.length && s.stg.h > 120, s.id + ' after turning the phone, stage ' + s.stg.w + ' by ' + s.stg.h); await page.screenshot({ path: `shots/misc_turned_${s.id}.png` }); }
    await page.evaluate(() => window.__lc.go(1, true)); await sleep(1800); await page.evaluate(() => window.__lc.ORBIT.pick('ISS (ZARYA)')); await sleep(1800); c = await fits(); await page.screenshot({ path: 'shots/misc_turned_card.png' });
    const chipB = await page.evaluate(() => Math.round(document.querySelector('.acts').getBoundingClientRect().bottom));
    ok(!c.hidden && c.left > c.iw * .3 && c.right <= c.iw - 8 && c.top >= chipB && c.bottom <= c.foot + 1, 'with the phone turned the card stands at the right, under the buttons ' + JSON.stringify(c) + ' buttons ' + chipB);
    all = all.concat(errs.map(e => 'keys: ' + e)); await ctx.close(); }
  await browser.close(); all = [...new Set(all)]; if (all.length) console.log('ERRORS', all.slice(0, 12));
  console.log(fail.length || all.length ? 'MISC FAILED (' + (fail.length + all.length) + ')' : 'MISC OK'); process.exit(fail.length || all.length ? 1 : 0);
})();
