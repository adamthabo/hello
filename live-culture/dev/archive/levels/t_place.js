// Placing a level's rings where its solution carries the smoke and doing nothing does not: each draft in a JSON file is let go twice,
// with its solution built and with nothing built, and what a ring of each wanted colour would get (density times colour, the ring's
// own measure) is mapped over the tank every quarter second of the water's time. The readings are written out whole, so the rings'
// places (and the water's settings) can be worked out afterwards without running the water again: tools/place_rings.py does that.
// The water is worked out but not shown while it runs (it is the same water), and the page takes its own readings.
// usage: node tools/t_place.js drafts.json [first] [last] [out.json] [water settings as JSON]
//   a draft is a level (cups may be empty) with `want`: the ring colours to place (0..4 or 'mix')
const { launch, open } = require('./lib'); const fs = require('fs'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const file = process.argv[2], D = JSON.parse(fs.readFileSync(file, 'utf8')), first = +(process.argv[3] || 1) - 1, last = +(process.argv[4] || D.length), outF = process.argv[5] || '',
  PH = process.argv[6] ? JSON.parse(process.argv[6]) : null;
const NX = 16, NY = 25;
(async () => {
  const browser = await launch(); const { page, errs, ctx } = await open(browser, 'phone'); await sleep(1200);
  const lv = D.map(d => Object.assign({}, d, { cups: [] }));
  await page.evaluate(a => { const l = window.__lc; l.GOV.n = -1e9; l.go(0, true); l.musicOff(); const o = l.WORLDS[0].o; o.setLevels(a[0]); o.fixdt(1 / 60); o.nowin(true); o.fastdye(true); if (a[1]) o.phys(a[1]);
    o.nodraw(true); }, [lv, PH]);
  const P = await page.evaluate(() => window.__lc.WORLDS[0].o.phys());
  const out = { phys: P, NX, NY, levels: [] };
  const pass = async (i, pieces, cols) => {
    const lim = (D[i].tank || 6) + 1;
    await page.evaluate(a => { const o = window.__lc.WORLDS[0].o; o.level(-1); o.level(a[0]); for (const b of a[1]) o.put(b[0], b[1]); o.release(); o.rec(a[2], a[3], a[4], .25, a[5]); }, [i, pieces, cols, NX, NY, lim]);
    let r; for (;;) { await sleep(1500); r = await page.evaluate(() => window.__lc.WORLDS[0].o.recGet()); if (r && r.done) break; }
    const S = {}; cols.forEach((c, k) => S[c] = r.S[k]); return { S, T: r.T };
  };
  for (let i = first; i < Math.min(D.length, last); i++) {
    const d = D[i], cols = [...new Set(d.want || [])], w0 = Date.now();
    const sol = await pass(i, d.sol || [], cols), non = await pass(i, [], cols);
    out.levels.push({ i, name: d.name, want: d.want, sol, none: non });
    console.log(('L' + (i + 1) + ' ' + d.name).padEnd(24), 'mapped in', Math.round((Date.now() - w0) / 1000) + 's');
    if (outF) fs.writeFileSync(outF, JSON.stringify(out));
  }
  const e = [...new Set(errs)]; if (e.length) console.log('ERRORS', e.slice(0, 6));
  await ctx.close(); await browser.close(); process.exit(0);
})();
