// Trying out Smoke levels: each level in a JSON file is built, its smoke let go, and run until it is won or its tank has run dry:
// with nothing built (no ring may fill), with its own solution (every ring must fill, and how much smoke is left says whether three
// stars can be had: a third of the tank), and with any `bad` builds it lists (cheaper or wrong ones: these must not win).
// usage: node tools/t_design.js levels.json [first] [last] [-] [fast|-] [sol|none]
//   (the fourth argument, once the seconds to run, is unused: a run lasts as long as the level's tank, and a little more)
//   fast: a coarser ink picture (the water is the same), for a first look only
//   NODRAW=1 in the environment: the water is worked out but not drawn (the same water, a little quicker here; the pictures stay dark)
const { launch, open } = require('./lib'); const fs = require('fs'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const file = process.argv[2], L = JSON.parse(fs.readFileSync(file, 'utf8')), first = +(process.argv[3] || 1) - 1, last = +(process.argv[4] || L.length), T = +(process.argv[5] || 14), fast = process.argv[6] === 'fast', only = process.argv[7] || '';
(async () => {
  const browser = await launch(); const { page, errs, ctx } = await open(browser, 'phone'); await sleep(1200);
  await page.evaluate(a => { window.__lc.GOV.n = -1e9; window.__lc.go(0, true); window.__lc.musicOff(); const o = window.__lc.WORLDS[0].o; o.setLevels(a[0]); o.fastdye(a[1]); if (a[2]) o.nodraw(true); }, [L, fast, process.env.NODRAW === '1']);
  // the water stepped as a phone at 60 frames a second steps it (a level's water fades by its own time, so any frame rate plays it the same)
  const fix = v => page.evaluate(v => window.__lc.WORLDS[0].o.fixdt(v), v);
  const D = () => page.evaluate(() => window.__lc.WORLDS[0].o.dbg());
  const run = async (i, pieces, mustWin) => {
    await page.evaluate(a => { const o = window.__lc.WORLDS[0].o; o.nowin(!a[2]); o.level(-1); o.level(a[0]); for (const b of a[1]) o.put(b[0], b[1]); o.release(); }, [i, pieces, mustWin]);
    const t0 = (await D()).simT, w0 = Date.now(), lim = (L[i].tank || 6) + 4; let d, best = [];
    for (;;) { await sleep(800); d = await D(); d.cups.forEach((c, j) => best[j] = Math.max(best[j] || 0, c.fill));
      if (d.won || d.pz !== i || !d.run || d.simT - t0 > lim || Date.now() - w0 > 400000) break; }
    return { won: d.won || d.pz !== i, best: best.map(b => Math.round(b * 100)), t: (d.simT - t0).toFixed(1), w: Math.round((Date.now() - w0) / 1000), left: d.tank0 ? Math.round(d.tank / d.tank0 * 100) : 0, out: d.out };
  };
  let bad = 0;
  for (let i = first; i < Math.min(L.length, last); i++) {
    const lv = L[i], name = 'L' + (i + 1) + (lv.name ? ' ' + lv.name : '');
    let r;
    if (only !== 'sol') { await fix(1 / 60); r = await run(i, [], false); await page.screenshot({ path: `shots/design_${i + 1}_nothing.png` });
    let okN = !r.won && r.best.every(b => b < 50); if (!okN) bad++;
    console.log((okN ? 'ok   ' : 'FAIL ') + name.padEnd(26) + ' nothing   ' + r.best.join(' ') + '%  sim ' + r.t + 's [' + r.w + 's]'); }
    if (only === 'none') continue;
    await fix(1 / 60); r = await run(i, lv.sol, true); await page.screenshot({ path: `shots/design_${i + 1}_solved.png` });
    if (!r.won) bad++;
    console.log((r.won ? (r.left >= 33 ? 'ok   ' : 'ok?  ') : 'FAIL ') + name.padEnd(26) + ' solution  ' + (r.won ? 'won in ' + r.t + 's, ' + r.left + '% smoke left' + (r.left >= 33 ? '' : ' (three stars out of reach)') : r.best.join(' ') + '%  sim ' + r.t + 's') + ' [' + r.w + 's]');
    await fix(1 / 60); for (const [lab, pieces] of lv.bad || []) { r = await run(i, pieces, false); const okB = !r.won && r.best.some(b => b < 100);
      if (!okB) bad++; console.log((okB ? 'ok   ' : 'FAIL ') + name.padEnd(26) + ' not: ' + lab.padEnd(18) + r.best.join(' ') + '%  sim ' + r.t + 's [' + r.w + 's]'); }
  }
  const e = [...new Set(errs)]; if (e.length) console.log('ERRORS', e.slice(0, 6));
  await ctx.close(); await browser.close(); console.log(bad || e.length ? 'DESIGN: ' + bad + ' failing' : 'DESIGN OK'); process.exit(0);
})();
