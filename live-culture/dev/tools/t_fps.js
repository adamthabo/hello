// how fast the headless browser manages each world (only to know how long the picture tests must wait)
const { launch, open, frames } = require('./lib');
(async () => {
  const browser = await launch(); const { page, ctx } = await open(browser, process.argv[2] || 'phone');
  await page.evaluate(() => { window.__lc.GOV.n = -1e9; });
  for (let i = 0; i < 5; i++) { await page.evaluate(i => window.__lc.go(i, true), i); await page.waitForTimeout(600);
    const t0 = Date.now(); await frames(page, 20); const ms = (Date.now() - t0) / 20; console.log(i, ms.toFixed(1) + ' ms/frame', (1000 / ms).toFixed(1) + ' fps'); }
  await ctx.close(); await browser.close();
})();
