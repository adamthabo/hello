// how long the page's own arithmetic takes per frame in each world (not the drawing): the part a phone's processor has to do
const { launch, open } = require('./lib');
(async () => { const browser = await launch(); const { page, ctx } = await open(browser, 'phone'); await page.waitForTimeout(800);
  const r = await page.evaluate(async () => { const L = window.__lc; L.GOV.n = -1e9; const out = {};
    for (let i = 0; i < 5; i++) { L.go(i, true); await new Promise(r => setTimeout(r, 700)); const w = L.WORLDS[i].o; let t0 = performance.now(), n = 0, t = t0; while (performance.now() - t0 < 400) { w.tick(.016, t); t += 16; n++; } out[L.WORLDS[i].id] = +((performance.now() - t0) / n).toFixed(3); }
    return out; });
  console.log('ms of arithmetic per frame (this machine):', JSON.stringify(r)); await ctx.close(); await browser.close(); })();
