// first look: every world at phone and desktop size, with the hints running; reports errors and state, writes screenshots
const { launch, open, frames } = require('./lib');
const sizes = (process.argv[2] || 'phone,desk').split(',');
(async () => {
  const browser = await launch(); let bad = 0;
  for (const size of sizes) {
    const { page, errs, ctx } = await open(browser, size);
    await page.waitForTimeout(1500); await page.evaluate(() => { window.__lc.GOV.n = -1e9; });
    const nW = await page.evaluate(() => window.__lc.WORLDS.length);
    for (let i = 0; i < nW; i++) {
      await page.evaluate(i => window.__lc.go(i, true), i);
      await page.waitForTimeout(i === 0 ? 9000 : 7000);
      const st = await page.evaluate(() => { const L = window.__lc, w = L.WORLDS[L.CURI]; return { id: w.id, dbg: w.o.dbg ? w.o.dbg() : null, stg: L.STG, errs: L.errs.slice(0, 5), data: document.getElementById('data').textContent, gl: L.GLX.ok, hf: !!L.GLX.hf, hfRT: L.GLX.hfRT, ghosts: Object.keys(L.GP).length }; });
      await page.screenshot({ path: `shots/first_${size}_${i}_${st.id}.png` });
      console.log(size, JSON.stringify(st).slice(0, 700));
      if (st.errs.length) bad++;
    }
    const clean = [...new Set(errs)];
    if (clean.length) { bad++; console.log('  ERRORS:', clean.slice(0, 10)); }
    await ctx.close();
  }
  await browser.close(); console.log(bad ? 'FIRST FAILED' : 'FIRST OK'); process.exit(bad ? 1 : 0);
})();
