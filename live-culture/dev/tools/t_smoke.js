// Smoke as a machine and a run of puzzles, played with real touches: the tools, a wall that stops the smoke, a fan, a drain, smoke
// rising, a whirlpool, the first puzzle solved by building (and its reward: one more player), the puzzles in order, leaving them.
// usage: node tools/t_smoke.js [size]
const { launch, open } = require('./lib'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const fail = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fail.push(m); };
const size = process.argv[2] || 'phone';
(async () => {
  const browser = await launch(); const { page, errs, ctx } = await open(browser, size); await sleep(1200);
  // the band's own stirring is left out of the measuring (outside the puzzles it adds ink and moves the water)
  await page.evaluate(() => { window.__lc.GOV.n = -1e9; window.__lc.go(0, true); window.__lc.musicOff(); });
  const cdp = await ctx.newCDPSession(page);
  const touch = async (pts, type) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: i + 1 })) });
  const drag = async (x0, y0, x1, y1, n = 12) => { await touch([[x0, y0]], 'touchStart'); for (let k = 1; k <= n; k++) { await touch([[x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n]], 'touchMove'); await sleep(16); } await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(80); };
  const tap = async (x, y) => { await touch([[x, y]], 'touchStart'); await sleep(40); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(80); };
  const D = () => page.evaluate(() => { const L = window.__lc, W = L.WORLDS[0].o; return { d: W.dbg(), stg: L.STG, on: L.ON.join(''), data: document.getElementById('data').textContent, errs: L.errs.slice(0, 3),
    tools: [...document.querySelectorAll('#tools .tb')].filter(b => !b.hidden).map(b => b.id.slice(2) + (b.getAttribute('aria-pressed') === 'true' ? '*' : '')).join() }; });
  const click = id => page.evaluate(id => document.getElementById(id).click(), id);
  const X = (s, u) => s.stg.x0 + s.stg.w * u, Y = (s, v) => s.stg.y0 + s.stg.h * v;
  const ink = (x, y, r) => page.evaluate(a => window.__lc.WORLDS[0].o.sample(a[0], a[1], a[2]).dens, [x, y, r]);
  let s = await D();
  ok(s.tools === 'ink*,wall,fan,drain,puz', 'the tools are at the edge, moving the water first: ' + s.tools);
  const mid = () => page.evaluate(() => window.__lc.WORLDS[0].o.mid());
  const simT = () => page.evaluate(() => window.__lc.WORLDS[0].o.dbg().simT);
  // a wall: drawn, and taken away with a tap
  await click('t_wall'); await drag(X(s, .5), Y(s, .15), X(s, .5), Y(s, .92)); s = await D();
  ok(s.d.walls === 1 && s.d.wn > 0, 'a drag with the wall tool builds a wall (' + s.d.wn + ' corners in the water\'s grid)');
  await page.screenshot({ path: `shots/smoke_${size}_wall.png` });
  // the wall holds the smoke back: ink pushed at it from the left stays on the left
  await click('t_ink');
  for (let k = 0; k < 5; k++) await drag(X(s, .08), Y(s, .3 + k * .12), X(s, .44), Y(s, .32 + k * .12), 10);
  await sleep(1800); await ink(0, 0, 1); await sleep(400);
  const L = await ink(X(s, .25), Y(s, .55), s.stg.w * .14), R = await ink(X(s, .75), Y(s, .55), s.stg.w * .14);
  ok(L > 0.02 && L > R * 2, 'the wall holds the smoke back (some rises over its top end, as smoke does): left of it ' + L.toFixed(3) + ', right of it ' + R.toFixed(3));
  await page.screenshot({ path: `shots/smoke_${size}_held.png` });
  await click('t_wall'); await tap(X(s, .5), Y(s, .5)); s = await D(); ok(s.d.walls === 0, 'a tap on a wall takes it away');
  // smoke rises
  // a fan and a drain
  await click('t_fan'); await drag(X(s, .2), Y(s, .4), X(s, .4), Y(s, .4), 6); await click('t_drain'); await tap(X(s, .75), Y(s, .4)); s = await D();
  ok(s.d.fans === 1 && s.d.drains === 1, 'a fan (drag for its direction) and a drain (a tap) are built');
  await sleep(2500); await page.screenshot({ path: `shots/smoke_${size}_machine.png` });
  s = await D(); ok(/built: 1 fan · 1 drain/.test(s.data), 'the readout counts what is built: ' + s.data.replace(/\n/g, ' | '));
  await click('t_fan'); await tap(X(s, .2), Y(s, .4)); await click('t_drain'); await tap(X(s, .75), Y(s, .4)); s = await D(); ok(s.d.fans === 0 && s.d.drains === 0, 'and a tap on each takes it away');
  // two fingers turning: a whirlpool (no errors, the water keeps going)
  await click('t_ink'); const cx = X(s, .5), cy = Y(s, .5);
  await touch([[cx + 60, cy], [cx - 60, cy]], 'touchStart'); for (let k = 1; k <= 16; k++) { const a = k * .12; await touch([[cx + 60 * Math.cos(a), cy + 60 * Math.sin(a)], [cx - 60 * Math.cos(a), cy - 60 * Math.sin(a)]], 'touchMove'); await sleep(16); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(500); s = await D(); ok(!s.errs.length && s.d.ok, 'two fingers turning make a whirlpool, without fault');
  // the puzzles: the band thins to two, the first puzzle is there
  await page.evaluate(() => { try { localStorage.removeItem('lc.smoke.solved'); } catch (e) {} });
  await click('t_puz'); await sleep(2900); s = await D();
  ok(s.d.pz === 0 && s.d.cups.length === 1 && s.d.fix.fans === 1 && s.on === '100001000', 'puzzle 1: one source, one cup, and the band is the low drum and the bass: ' + s.on);
  ok(/^puzzle 1 of 7/.test(s.data) && s.tools.startsWith('ink,wall*,fan'), 'the readout and the tools say what may be built: ' + s.data.replace(/\n/g, ' | ') + ' / ' + s.tools);
  await page.screenshot({ path: `shots/smoke_${size}_puzzle1.png` });
  // smoke rises: with nothing built, the source's smoke (it blows sideways, at 0.8 of the way down the stage) ends up above it
  { const t0 = await simT(); for (let k = 0; k < 80 && (await simT()) - t0 < 3; k++) await sleep(400); await mid(); await sleep(250);
    const m = await mid(), src = (s.stg.y0 + .8 * s.stg.h) / await page.evaluate(() => innerHeight);
    ok(m !== null && m < src - .04, 'smoke rises: the source is ' + src.toFixed(2) + ' of the way down the screen, the middle of its smoke ' + (m || 0).toFixed(2)); }
  // the source's smoke rises past the cup; a roof over it brings it along to the cup
  const c0 = s.d.cups[0]; await drag(X(s, .06), Y(s, .7), X(s, .97), Y(s, .7), 14); s = await D(); ok(s.d.walls === 1, 'a roof built over the smoke');
  let best = 0; for (let k = 0; k < 40; k++) { await sleep(1000); s = await D(); best = Math.max(best, s.d.cups[0].fill); if (s.d.won || s.d.pz > 0) break; }
  ok(best > .5 || s.d.won || s.d.pz > 0, 'with the roof the cup fills: ' + Math.round(best * 100) + '% (match ' + (s.d.cups[0] ? s.d.cups[0].match.toFixed(3) : '-') + ')');
  await page.screenshot({ path: `shots/smoke_${size}_puzzle1_built.png` });
  // a win: the next puzzle, one more player (the shekere)
  if (s.d.pz === 0 && !s.d.won) await page.evaluate(() => window.__lc.WORLDS[0].o.win());
  for (let k = 0; k < 12; k++) { await sleep(500); s = await D(); if (s.d.pz === 1) break; }
  ok(s.d.pz === 1 && s.on === '110001000' && s.d.best >= 1, 'solved: on to puzzle 2, with the shekere in the band: ' + s.on);
  for (let i = 1; i < 7; i++) { await page.evaluate(i => window.__lc.WORLDS[0].o.level(i), i); await sleep(900); s = await D(); await page.screenshot({ path: `shots/smoke_${size}_puzzle${i + 1}.png` });
    ok(s.d.pz === i && s.d.cups.length >= 1 && !s.errs.length, 'puzzle ' + (i + 1) + ' sets up: ' + s.d.cups.length + ' cups, ' + s.d.fix.fans + ' sources, ' + s.d.fix.walls + ' walls, ' + s.d.fix.drains + ' drains'); }
  await page.evaluate(() => window.__lc.WORLDS[0].o.win()); for (let k = 0; k < 12; k++) { await sleep(500); s = await D(); if (s.d.pz < 0) break; }
  ok(s.d.pz < 0 && s.on === '111111111', 'the last puzzle solved: the whole band plays, the guitar last in: ' + s.on);
  await click('t_puz'); await sleep(300); await click('t_puz'); await sleep(300); s = await D(); ok(s.d.pz < 0 && s.d.walls === 0 && s.on === '111111111', 'leaving the puzzles gives the band back as it was');
  const e = [...new Set(errs)]; if (e.length) console.log('ERRORS', e.slice(0, 6));
  await ctx.close(); await browser.close(); console.log(fail.length || e.length ? 'SMOKE FAILED' : 'SMOKE OK'); process.exit(fail.length || e.length ? 1 : 0);
})();
