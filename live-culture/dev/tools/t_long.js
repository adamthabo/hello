// leaves a world alone with its hint running for a long while, then photographs it: nothing should have drifted into a bad state
const { launch, open } = require('./lib');
const size = process.argv[2] || 'land', w = +(process.argv[3] || 0), secs = +(process.argv[4] || 40);
(async () => { const browser = await launch(); const { page, errs, ctx } = await open(browser, size); await page.waitForTimeout(800);
  await page.evaluate(w => { window.__lc.GOV.n = -1e9; window.__lc.go(w, true); }, w); await page.waitForTimeout(secs * 1000);
  const st = await page.evaluate(() => { const L = window.__lc, o = L.WORLDS[L.CURI]; return { id: o.id, dbg: o.o.dbg && o.o.dbg(), errs: L.errs }; });
  await page.screenshot({ path: `shots/long_${size}_${st.id}.png` }); console.log(JSON.stringify(st).slice(0, 300), errs.slice(0, 3)); await ctx.close(); await browser.close(); })();
