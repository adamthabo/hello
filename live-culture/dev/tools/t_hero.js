// one world, at the sharpness of a real phone screen (two device pixels per point), after its hint has run a while
const { launch, open } = require('./lib');
const size = process.argv[2] || 'phone', w = +(process.argv[3] || 0), secs = +(process.argv[4] || 8), dsf = +(process.argv[5] || 2);
(async () => { const browser = await launch(); const { page, errs, ctx } = await open(browser, size, { dsf }); await page.waitForTimeout(800);
  await page.evaluate(w => { window.__lc.GOV.n = -1e9; window.__lc.go(w, true); }, w); await page.waitForTimeout(secs * 1000);
  const st = await page.evaluate(() => { const L = window.__lc, o = L.WORLDS[L.CURI]; return { id: o.id, errs: L.errs }; });
  await page.screenshot({ path: `shots/hero_${size}_${st.id}.png` }); console.log(JSON.stringify(st), errs.slice(0, 3)); await ctx.close(); await browser.close(); })();
