// putting the page away must stop the sound, and bringing it back must bring the sound back in step
const { launch, open } = require('./lib'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => { const browser = await launch(); const { page, errs, ctx } = await open(browser, 'phone'); await sleep(900);
  await page.mouse.click(195, 420); await sleep(2500);
  const st = () => page.evaluate(() => { const L = window.__lc; return { state: L.AU.c && L.AU.c.state, run: L.AU.run, live: L.AU.live, want: L.AU.want, t: +L.loopT().toFixed(2), step: L.BD.step, errs: L.errs }; });
  const a = await st(); await page.evaluate(() => { Object.defineProperty(document, 'hidden', { get: () => true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }); await sleep(1500);
  const b = await st(); await page.evaluate(() => { Object.defineProperty(document, 'hidden', { get: () => false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }); await sleep(1500);
  const c = await st(); console.log(JSON.stringify({ playing: a, away: b, back: c }));
  const ok = a.state === 'running' && b.state === 'suspended' && c.state === 'running' && c.live && !c.errs.length && !errs.length;
  console.log(ok ? 'HIDE OK' : 'HIDE FAILED', errs.slice(0, 3)); await ctx.close(); await browser.close(); process.exit(ok ? 0 : 1); })();
