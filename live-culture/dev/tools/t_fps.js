// how fast the headless browser manages each world (only to know how long the picture tests must wait); the Earth again with every
// layer on (17 Nov: three worlds since 15 Nov, so the count is read, not assumed)
const { launch, open, frames } = require('./lib');
(async () => {
  const browser = await launch(); const { page, ctx } = await open(browser, process.argv[2] || 'phone');
  await page.evaluate(() => { window.__lc.GOV.n = -1e9; });
  const n = await page.evaluate(() => window.__lc.WORLDS.length);
  const one = async name => { const t0 = Date.now(); await frames(page, 20); const ms = (Date.now() - t0) / 20; console.log(name, ms.toFixed(1) + ' ms/frame', (1000 / ms).toFixed(1) + ' fps'); };
  for (let i = 0; i < n; i++) { await page.evaluate(i => window.__lc.go(i, true), i); await page.waitForTimeout(600); await one(i + ' ' + await page.evaluate(i => window.__lc.WORLDS[i].id, i)); }
  await page.evaluate(() => { const L = window.__lc, E = L.WORLDS.findIndex(w => w.id === 'earth'); L.go(E, true); for (const k of ['vid', 'war', 'dark', 'sat', 'rain', 'cld', 'pres', 'bolt', 'storm', 'fire', 'orbit', 'aur', 'temp']) L.WORLDS[E].o.layer(k, 1); });
  await page.waitForTimeout(1500); await one('earth, every layer');
  await ctx.close(); await browser.close();
})();
