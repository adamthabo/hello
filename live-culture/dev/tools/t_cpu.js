// how long the page's own arithmetic takes per frame in each world (not the drawing): the part a phone's processor has to do;
// the Earth twice, as it opens and with every layer on (17 Nov: three worlds since 15 Nov, so the count is read, not assumed)
const { launch, open } = require('./lib');
(async () => { const browser = await launch(); const { page, ctx } = await open(browser, 'phone'); await page.waitForTimeout(800);
  const r = await page.evaluate(async () => { const L = window.__lc; L.GOV.n = -1e9; const out = {};
    const run = (w, name) => { let t0 = performance.now(), n = 0, t = t0; while (performance.now() - t0 < 400) { w.tick(.016, t); t += 16; n++; } out[name] = +((performance.now() - t0) / n).toFixed(3); };
    for (let i = 0; i < L.WORLDS.length; i++) { L.go(i, true); await new Promise(r => setTimeout(r, 700)); run(L.WORLDS[i].o, L.WORLDS[i].id); }
    const E = L.WORLDS.findIndex(w => w.id === 'earth'), W = L.WORLDS[E].o; L.go(E, true); await new Promise(r => setTimeout(r, 400));
    for (const k of ['vid', 'war', 'dark', 'sat', 'rain', 'cld', 'pres', 'bolt', 'storm', 'fire', 'orbit', 'aur', 'temp']) W.layer(k, 1);
    await new Promise(r => setTimeout(r, 900)); run(W, 'earth, every layer');
    return out; });
  console.log('ms of arithmetic per frame (this machine):', JSON.stringify(r)); await ctx.close(); await browser.close(); })();
