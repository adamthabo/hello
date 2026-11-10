// Every puzzle, run twice with the smoke going: with nothing built, no ring may fill (a puzzle must not solve itself); with the
// puzzle's own solution built (LEVELS[i].sol, in fractions of the stage), every ring must fill. The pieces are put in by hand, not
// drawn: t_smoke.js draws puzzle 1's solution with real touches.
// Slow: the headless browser runs the water at about a fifth of its speed, so each run takes a minute or more. Not part of check.sh;
// run it after changing a puzzle, the water or the rings.  usage: node tools/t_puzzles.js [first] [last] [seconds]
const { launch, open } = require('./lib'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const first = +(process.argv[2] || 1) - 1, lastN = +(process.argv[3] || 7), T = +(process.argv[4] || 14);
const fail = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fail.push(m); };
(async () => {
  const browser = await launch(); const { page, errs, ctx } = await open(browser, 'phone'); await sleep(1200);
  await page.evaluate(() => { window.__lc.GOV.n = -1e9; window.__lc.go(0, true); window.__lc.musicOff(); });
  const n = await page.evaluate(() => window.__lc.WORLDS[0].o.levels.length);
  const D = () => page.evaluate(() => window.__lc.WORLDS[0].o.dbg());
  const run = async (i, build, until) => {
    await page.evaluate(a => { const o = window.__lc.WORLDS[0].o; o.nowin(!a[1]); o.level(-1); o.level(a[0]);
      if (a[1]) for (const b of o.levels[a[0]].sol) o.put(b[0], b[1]); }, [i, build]);
    const t0 = (await D()).simT, w0 = Date.now(); let d, best = [];
    for (;;) { await sleep(1000); d = await D(); d.cups.forEach((c, j) => best[j] = Math.max(best[j] || 0, c.fill));
      if (d.won || d.pz !== i || d.simT - t0 > until || Date.now() - w0 > 240000) break; }
    return { d, best, t: d.simT - t0 };
  };
  for (let i = first; i < Math.min(n, lastN); i++) {
    let r = await run(i, false, T); await page.screenshot({ path: `shots/puzzle${i + 1}_nothing.png` });
    ok(!r.d.won && r.best.every(b => b < .5), 'puzzle ' + (i + 1) + ' with nothing built: no ring fills (' + r.best.map(b => Math.round(b * 100) + '%').join(' ') + ' after ' + r.t.toFixed(1) + ' s)');
    r = await run(i, true, T); await page.screenshot({ path: `shots/puzzle${i + 1}_solved.png` });
    ok(r.d.won || r.d.pz !== i, 'puzzle ' + (i + 1) + ' with its solution: every ring fills (' + (r.d.won || r.d.pz !== i ? 'in ' + r.t.toFixed(1) + ' s' : r.best.map(b => Math.round(b * 100) + '%').join(' ') + ' after ' + r.t.toFixed(1) + ' s') + ')');
  }
  await page.evaluate(() => window.__lc.WORLDS[0].o.nowin(false));
  const e = [...new Set(errs)]; if (e.length) console.log('ERRORS', e.slice(0, 6));
  await ctx.close(); await browser.close(); console.log(fail.length || e.length ? 'PUZZLES FAILED' : 'PUZZLES OK'); process.exit(fail.length || e.length ? 1 : 0);
})();
