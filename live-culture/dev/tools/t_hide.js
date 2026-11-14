// putting the page away must stop the sound, and bringing it back must bring the sound back in step (the band's own loops, then the mixer's)
const { launch, open } = require('./lib'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => { const browser = await launch(); const { page, errs, ctx } = await open(browser, 'phone'); await sleep(900);
  await page.mouse.click(195, 420); await sleep(2500);
  const st = () => page.evaluate(() => { const L = window.__lc; return { state: L.AU.c && L.AU.c.state, run: L.AU.run, live: L.AU.live, want: L.AU.want, t: +L.loopT().toFixed(2), step: L.BD.step, errs: L.errs }; });
  const a = await st(); await page.evaluate(() => { Object.defineProperty(document, 'hidden', { get: () => true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }); await sleep(1500);
  const b = await st(); await page.evaluate(() => { Object.defineProperty(document, 'hidden', { get: () => false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }); await sleep(1500);
  const c = await st(); console.log(JSON.stringify({ playing: a, away: b, back: c }));
  // the same once the mixer has the band: away it is silent, back it plays on with the same loops, on its own clock
  await page.evaluate(() => window.__lc.go(2, true)); await sleep(1500); await page.evaluate(() => window.__lc.MIX.launch(9, 0)); await sleep(3000);
  const mx = () => page.evaluate(() => { const m = window.__lc.MIX.dbg(); return { mixon: m.mixon, plays: m.tracks.map(t => t.play).join(), beat: +m.beat.toFixed(2) }; });
  const d = Object.assign(await st(), await mx()); await page.evaluate(() => { Object.defineProperty(document, 'hidden', { get: () => true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }); await sleep(1500);
  const e = Object.assign(await st(), await mx()); await page.evaluate(() => { Object.defineProperty(document, 'hidden', { get: () => false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }); await sleep(1500);
  const f = Object.assign(await st(), await mx()); console.log(JSON.stringify({ mixer: d, away: e, back: f }));
  const ok = a.state === 'running' && b.state === 'suspended' && c.state === 'running' && c.live && !c.errs.length && !errs.length
    && d.mixon && d.state === 'running' && e.state === 'suspended' && f.state === 'running' && f.live && f.plays === d.plays && f.beat > e.beat && !f.errs.length;
  console.log(ok ? 'HIDE OK' : 'HIDE FAILED', errs.slice(0, 3)); await ctx.close(); await browser.close(); process.exit(ok ? 0 : 1); })();
