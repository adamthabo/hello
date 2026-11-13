// Smoke as a machine and a game of levels, played with real touches: the tools, a wall that stops the smoke, a fan, a drain, smoke
// rising, a whirlpool; the map of the levels, the first level solved by building (its stars), the levels in order and their rewards
// (more of the band, new pieces), leaving them.
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
  { const r = await page.evaluate(() => { const t = document.getElementById('tools').getBoundingClientRect(), f = document.getElementById('foot').getBoundingClientRect(); return { t: t.top, b: t.bottom, ft: f.top, fb: f.bottom, h: innerHeight }; });
    ok(r.t >= r.ft && r.b <= r.fb && r.t > r.h * .7, 'the tools sit in the footer, under the water (' + Math.round(r.t) + '-' + Math.round(r.b) + ' of ' + r.h + ')'); }
  await page.evaluate(() => { try { localStorage.removeItem('lc.smoke.stars'); } catch (e) {} window.__lc.WORLDS[0].o.stars([]); window.__lc.WORLDS[0].o.tool('ink'); }); s = await D();
  ok(s.tools === 'ink*,wall,fan,drain,puz', 'the tools are in a row along the bottom, moving the water first (the prism and the tunnel wait to be reached): ' + s.tools);
  const mid = () => page.evaluate(() => window.__lc.WORLDS[0].o.mid());
  const simT = () => page.evaluate(() => window.__lc.WORLDS[0].o.dbg().simT);
  // a wall: drawn, and taken away with a tap
  await click('t_wall'); await drag(X(s, .5), Y(s, .04), X(s, .5), Y(s, .97)); s = await D();
  ok(s.d.walls === 1 && s.d.wn > 0, 'a drag with the wall tool builds a wall (' + s.d.wn + ' corners in the water\'s grid)');
  await page.screenshot({ path: `shots/smoke_${size}_wall.png` });
  // the wall holds the smoke back: ink pushed at it from the left stays on the left
  await click('t_ink');
  for (let k = 0; k < 5; k++) await drag(X(s, .08), Y(s, .3 + k * .12), X(s, .44), Y(s, .32 + k * .12), 10);
  await sleep(1800); await ink(0, 0, 1); await sleep(400);
  const L = await ink(X(s, .25), Y(s, .55), s.stg.w * .14), R = await ink(X(s, .75), Y(s, .55), s.stg.w * .14);
  ok(L > 0.02 && L > R * 1.5, 'the wall holds the smoke back (some goes round its ends, above and below the stage): left of it ' + L.toFixed(3) + ', right of it ' + R.toFixed(3));
  await page.screenshot({ path: `shots/smoke_${size}_held.png` });
  await click('t_wall'); await tap(X(s, .5), Y(s, .5)); s = await D(); ok(s.d.walls === 0, 'a tap on a wall takes it away');
  // smoke rises
  // a fan and a drain
  await click('t_fan'); await drag(X(s, .2), Y(s, .4), X(s, .4), Y(s, .4), 6); await click('t_drain'); await tap(X(s, .75), Y(s, .4)); s = await D();
  ok(s.d.fans === 1 && s.d.drains === 1, 'a fan (drag for its direction) and a drain (a tap) are built');
  await sleep(2500); await page.screenshot({ path: `shots/smoke_${size}_machine.png` });
  s = await D(); ok(/built: 1 fan · 1 drain/.test(s.data) && /^real smoke, worked out as it moves/.test(s.data), 'the readout says what this is, and counts what is built: ' + s.data.replace(/\n/g, ' | '));
  await click('t_fan'); await tap(X(s, .2), Y(s, .4)); await click('t_drain'); await tap(X(s, .75), Y(s, .4)); s = await D(); ok(s.d.fans === 0 && s.d.drains === 0, 'and a tap on each takes it away');
  // two fingers turning: a whirlpool (no errors, the water keeps going)
  await click('t_ink'); const cx = X(s, .5), cy = Y(s, .5);
  await touch([[cx + 60, cy], [cx - 60, cy]], 'touchStart'); for (let k = 1; k <= 16; k++) { const a = k * .12; await touch([[cx + 60 * Math.cos(a), cy + 60 * Math.sin(a)], [cx - 60 * Math.cos(a), cy - 60 * Math.sin(a)]], 'touchMove'); await sleep(16); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(500); s = await D(); ok(!s.errs.length && s.d.ok, 'two fingers turning make a whirlpool, without fault');
  // the levels: the map, then the first level; the band thins to two
  await page.evaluate(() => { try { localStorage.removeItem('lc.smoke.stars'); } catch (e) {} window.__lc.WORLDS[0].o.stars([]); });
  await click('t_puz'); await sleep(600); s = await D();
  const NP = await page.evaluate(() => window.__lc.WORLDS[0].o.levels.length);
  ok(s.d.path && /^levels · 0 of \d+ stars/.test(s.data), 'the levels button opens the map of the levels: ' + s.data.replace(/\n/g, ' | '));
  await page.screenshot({ path: `shots/smoke_${size}_map.png` });
  const nodes = await page.evaluate(() => window.__lc.WORLDS[0].o.pathNodes());
  ok(nodes.nodes.length === NP && NP >= 20, 'the map shows every level: ' + nodes.nodes.length);
  await tap(nodes.nodes[3].x, nodes.nodes[3].y); await sleep(500); s = await D(); ok(s.d.path && s.d.pz < 0, 'a level not reached yet does not open');
  await tap(nodes.nodes[0].x, nodes.nodes[0].y); await sleep(2600); s = await D();
  ok(s.d.pz === 0 && !s.d.path && s.d.cups.length === 1 && s.d.fix.fans === 1 && s.on === '100001000', 'level 1: one source, one ring, and the band is the low drum and the bass: ' + s.on);
  ok(/^level 1 of \d+ · walls · build, then release the smoke/.test(s.data) && /fill every ring with smoke of its colour before the tank runs dry/.test(s.data) && /to build: 2 walls · ★★★: 1 piece, a third of the smoke left/.test(s.data) && s.tools === 'wall*,go,puz,undo', 'the readout and the tools say what may be built, and that the smoke waits to be let go: ' + s.data.replace(/\n/g, ' | ') + ' / ' + s.tools);
  ok(await page.evaluate(() => [...document.querySelectorAll('#tools .tb span')].map(e => e.textContent).join()) === 'hand,wall,fan,prism,drain,tunnel,release,levels,again', 'each tool carries its name');
  // nothing built and the smoke let go: the tank runs dry, the ring is not filled, and the page says so
  await click('t_go'); await sleep(400); s = await D(); ok(s.d.run && /smoke left: \d/.test(s.data) && /cyan ring \d+%/.test(s.data) && await page.evaluate(() => document.getElementById('t_go').firstChild.textContent) === 'stop', 'release lets the smoke go, and the button becomes stop: ' + s.data.split('\n')[0]);
  for (let k = 0; k < 160; k++) { await sleep(1000); s = await D(); if (!s.d.run) break; }
  ok(!s.d.run && !s.d.won && s.d.out && /out of smoke: change something, then release it again/.test(s.data), 'with nothing built the tank runs dry and the ring stays short: ' + s.data.split('\n')[0]);
  ok(s.d.board.w / s.d.board.h > .6 && s.d.board.w / s.d.board.h < .68 && s.d.fix.walls === 4, 'a level is played in a tank of fixed shape: ' + Math.round(s.d.board.w) + ' x ' + Math.round(s.d.board.h));
  await page.screenshot({ path: `shots/smoke_${size}_level1.png` });
  // the level's own solution, drawn with real touches: walls dragged, fans dragged the way they blow, prisms and drains tapped
  const L0 = await page.evaluate(() => JSON.parse(JSON.stringify(window.__lc.WORLDS[0].o.levels[0])));
  const BX = u => s.d.board.x0 + s.d.board.w * u, BY = v => s.d.board.y0 + s.d.board.h * v;
  for (const b of L0.sol) { const a = b[1];
    if (b[0] === 'wall') { await click('t_wall'); await drag(BX(a[0]), BY(a[1]), BX(a[2]), BY(a[3]), 14); }
    else if (b[0] === 'fan') { await click('t_fan'); const m = Math.hypot(a[2], a[3]) || 1; await drag(BX(a[0]), BY(a[1]), BX(a[0]) + a[2] / m * 44, BY(a[1]) + a[3] / m * 44, 6); }
    else if (b[0] === 'prism') { await click('t_prism'); await tap(BX(a[0]), BY(a[1])); }
    else if (b[0] === 'drain') { await click('t_drain'); await tap(BX(a[0]), BY(a[1])); }
    else if (b[0] === 'tunnel') { await click('t_tunnel'); await drag(BX(a[0]), BY(a[1]), BX(a[2]), BY(a[3]), 12); } }
  s = await D(); ok(s.d.walls + s.d.fans + s.d.drains + s.d.prisms + s.d.tunnels === L0.sol.length && !s.d.run, 'level 1\'s solution built with touches, the smoke still held: ' + L0.sol.map(b => b[0]).join(', '));
  await click('t_go');
  let best = 0; for (let k = 0; k < 150; k++) { await sleep(1000); s = await D(); if (s.d.cups[0]) best = Math.max(best, s.d.cups[0].fill); if (s.d.won || s.d.pz > 0) break; }
  ok(s.d.won || s.d.pz > 0, 'with it the ring fills: ' + Math.round(best * 100) + '% (match ' + (s.d.cups[0] ? s.d.cups[0].match.toFixed(3) : '-') + ')');
  if (s.d.won) { ok(s.d.winStars === 3 && /^level 1 solved ★★★ · 1 piece/.test(s.data), 'solved with the fewest pieces: three stars: ' + s.data.replace(/\n/g, ' | ')); await page.screenshot({ path: `shots/smoke_${size}_level1_won.png` }); }
  if (s.d.pz === 0 && !s.d.won) await page.evaluate(() => window.__lc.WORLDS[0].o.win());
  for (let k = 0; k < 14; k++) { await sleep(500); s = await D(); if (s.d.pz === 1) break; }
  ok(s.d.pz === 1 && s.d.stars[0] >= 1 && s.on === '100001000', 'solved: on to level 2, its stars kept: ' + JSON.stringify(s.d.stars.slice(0, 3)));
  // every level sets up; every third one solved brings in a player; new pieces come with their chapters
  for (let i = 1; i < NP; i++) { await page.evaluate(i => window.__lc.WORLDS[0].o.level(i), i); await sleep(700); s = await D(); await page.screenshot({ path: `shots/smoke_${size}_level${i + 1}.png` });
    ok(s.d.pz === i && s.d.cups.length >= 1 && !s.errs.length, 'level ' + (i + 1) + ' sets up: ' + s.d.cups.length + ' rings, ' + s.d.fix.fans + ' sources, ' + (s.d.fix.walls - 4) + ' walls, ' + s.d.fix.prisms + ' prisms; tools ' + s.tools); }
  await page.evaluate(i => window.__lc.WORLDS[0].o.level(i), 3); await sleep(500); s = await D(); ok(s.on === '110001000', 'from level 4 the shekere plays too: ' + s.on);
  await page.evaluate(i => window.__lc.WORLDS[0].o.level(i), NP - 1); await sleep(500);
  await page.evaluate(() => window.__lc.WORLDS[0].o.win()); for (let k = 0; k < 14; k++) { await sleep(500); s = await D(); if (s.d.pz < 0) break; }
  ok(s.d.pz < 0 && s.d.path && s.on === '111111111', 'the last level solved: the whole band plays, the guitar last in, and the map shows: ' + s.on);
  // the map's own button back to playing freely; pieces reached so far are there to build with
  await page.evaluate(() => window.__lc.WORLDS[0].o.stars(new Array(24).fill(1))); await click('t_puz'); await sleep(300); await click('t_puz'); await sleep(500);
  s = await D(); const fr = await page.evaluate(() => window.__lc.WORLDS[0].o.pathNodes().free);
  if (!s.d.path) { await click('t_puz'); await sleep(500); }
  await tap(fr.x, fr.y); await sleep(500); s = await D();
  ok(s.d.pz < 0 && !s.d.path && s.d.walls === 0 && s.tools === 'ink*,wall,fan,prism,drain,tunnel,puz', 'play freely: every piece reached is there: ' + s.tools);
  await click('t_prism'); await tap(X(s, .3), Y(s, .4)); await click('t_tunnel'); await drag(X(s, .2), Y(s, .7), X(s, .7), Y(s, .3), 10); s = await D();
  ok(s.d.prisms === 1 && s.d.tunnels === 1, 'a prism (a tap) and a tunnel (a drag from one end to the other) are built');
  await sleep(1500); await page.screenshot({ path: `shots/smoke_${size}_free_pieces.png` });
  const e = [...new Set(errs)]; if (e.length) console.log('ERRORS', e.slice(0, 6));
  await ctx.close(); await browser.close(); console.log(fail.length || e.length ? 'SMOKE FAILED' : 'SMOKE OK'); process.exit(fail.length || e.length ? 1 : 0);
})();
