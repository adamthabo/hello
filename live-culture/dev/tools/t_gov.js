// the frame governor: it must not judge before the first touch; a slow world must thin itself; and a pace set by the system
// (a phone saving power: thirty frames a second whatever the page does) must cost no quality in the end
const { launch, open } = require('./lib'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const fail = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fail.push(m); };
const st = page => page.evaluate(() => { const L = window.__lc; return { ql: L.QL, woke: L.GOV.woke, pace: +L.GOV.pace.toFixed(1), ema: +L.GOV.ema.toFixed(1), trial: !!L.GOV.trial, dpr: L.GLX.w / innerWidth, dbg: L.WORLDS[L.CURI].o.dbg && L.WORLDS[L.CURI].o.dbg(), errs: L.errs }; });
(async () => { const browser = await launch(); let all = [];
  { console.log('A SLOW WORLD (the water, drawn in software here)');
    const { page, errs, ctx } = await open(browser, 'phone', { hash: '#smoke', dsf: 2 }); await sleep(6000);
    let s = await st(page); ok(s.ql === 0 && !s.woke, 'untouched for six slow seconds: nothing judged, level ' + s.ql + ', canvas at ' + s.dpr + 'x');
    await page.mouse.click(195, 420); await sleep(9000); s = await st(page);
    ok(s.ql >= 1 && !s.errs.length, 'after a touch it thins itself: level ' + s.ql + ', canvas at ' + s.dpr + 'x, water ' + s.dbg.sw + ' x ' + s.dbg.sh);
    ok(Math.abs(s.dpr - [2, 1.5, 1.25][s.ql]) < .02, 'the canvas follows the level');
    const lv = s.ql; await page.evaluate(() => window.__lc.go(1, true)); await sleep(3500); s = await st(page); ok(!s.errs.length && s.dbg.ok && s.dbg.dw === [1024, 512, 512][s.ql], 'the wind takes the level it is given: level ' + s.ql + ', smoke ' + s.dbg.dw + ' wide');
    all = all.concat(errs); await ctx.close(); }
  { console.log('A PACE SET BY THE SYSTEM (thirty frames a second, whatever the page does)');
    const { page, errs, ctx } = await open(browser, 'phone', { hash: '#orbit', init: () => { const raf = window.requestAnimationFrame.bind(window); let last = 0; window.requestAnimationFrame = cb => raf(function f(t) { if (t - last < 32) return raf(f); last = t; cb(t); }); } });
    // the satellites' trails cost the headless browser a great deal (a phone's chip draws them for next to nothing): off here, so the
    // frames are paced by the system alone, as on a phone saving power
    await sleep(1500); await page.evaluate(() => window.__lc.ORBIT.trails(false)); await page.mouse.click(195, 420); await sleep(9000); const s = await st(page);
    ok(s.ql === 0 && s.pace > 28, 'the step down bought nothing, so the quality was given back: level ' + s.ql + ', pace noted as ' + s.pace + ' ms'); all = all.concat(errs); await ctx.close(); }
  await browser.close(); all = [...new Set(all)]; if (all.length) console.log('ERRORS', all.slice(0, 5));
  console.log(fail.length || all.length ? 'GOV FAILED' : 'GOV OK'); process.exit(fail.length || all.length ? 1 : 0); })();
