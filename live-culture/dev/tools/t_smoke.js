// Paint (Smoke until 15 Nov) as a machine and a game, played with real touches: the tools, a wall that stops the smoke, a fan, a drain, a whirlpool; then
// the game: play starts a round (nothing to place: smoke pours from a vent and a finger pushes it into a glowing ring before it fades),
// a ring filled by real pushes, the rounds growing, the clock running out, the best kept, again, and back to playing freely.
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
  await page.evaluate(() => window.__lc.WORLDS[0].o.tool('ink')); s = await D();
  ok(s.tools === 'ink*,wall,fan,drain,puz', 'the tools are in a row along the bottom, moving the water first, then every piece (no prism, no tunnel since 14 Nov), then play: ' + s.tools);
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
  // (15 Nov: "Remove the real smoke, worked out as it moves; text at the top": no words over the paint but what is built)
  s = await D(); ok(s.data === '' && s.d.fans === 1 && s.d.drains === 1, 'no words over the paint (15 Nov, 22:59: "Remove the writing on the top"), whatever is built: ' + JSON.stringify(s.data));
  // (a tap here can span a frame of most of a second, and a touch longer than 800 ms reads as a drag that sets a new fan: tapped again
  // until none is left, three times at most)
  await click('t_fan'); for (let k = 0; k < 3; k++) { await tap(X(s, .2), Y(s, .4)); if (!(await D()).d.fans) break; }
  await click('t_drain'); await tap(X(s, .75), Y(s, .4)); s = await D(); ok(s.d.fans === 0 && s.d.drains === 0, 'and a tap on each takes it away');
  // two fingers turning: a whirlpool (no errors, the water keeps going)
  await click('t_ink'); const cx = X(s, .5), cy = Y(s, .5);
  await touch([[cx + 60, cy], [cx - 60, cy]], 'touchStart'); for (let k = 1; k <= 16; k++) { const a = k * .12; await touch([[cx + 60 * Math.cos(a), cy + 60 * Math.sin(a)], [cx - 60 * Math.cos(a), cy - 60 * Math.sin(a)]], 'touchMove'); await sleep(16); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(500); s = await D(); ok(!s.errs.length && s.d.ok, 'two fingers turning make a whirlpool, without fault');
  // the game (13 Nov, night: "the game is awful" ... "Push the smoke"): nothing to place; smoke pours from a vent and a finger pushes it
  // into a glowing ring before it fades; short rounds against the clock, each a little faster; a score, and the best kept
  // (the game's clock is the water's own, stepped here as a phone at sixty frames a second steps it, a sixtieth of a second a frame:
  // this machine draws only a few frames a second, so its pushes are made one move a frame, as a finger on a phone makes them)
  const ON0 = await page.evaluate(() => window.__lc.ON.join(''));
  const look = n => page.screenshot({ path: `shots/smoke_${size}_${n}.png` });
  const until = async (f, ms) => { const t = Date.now(); s = await D(); while (!f(s) && Date.now() - t < ms) { await sleep(200); s = await D(); } return f(s); };
  const frame = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => r())));
  const push = async (x0, y0, x1, y1, n, hold) => { await touch([[x0, y0]], 'touchStart'); await frame(); for (let k = 1; k <= n; k++) { await touch([[x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n]], 'touchMove'); await frame(); }
    for (let k = 0; k < hold; k++) await frame(); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await frame(); };
  await page.evaluate(() => { try { localStorage.removeItem('lc.smoke.best'); } catch (e) {} const o = window.__lc.WORLDS[0].o; o.best(0); o.fixdt(1 / 60); });
  s = await D(); ok(await page.evaluate(() => document.getElementById('t_puz').firstChild.textContent) === 'play' && s.data === '', 'out of a game the button reads play, and there are no words over the paint: ' + JSON.stringify(s.data));
  await click('t_puz'); await sleep(300); s = await D();
  ok(s.d.pz === 0 && s.d.game.round === 1 && s.d.game.phase === 'intro' && s.d.game.need === 3 && s.d.cups.length === 0 && s.d.fix.fans === 1 && s.d.fix.walls === 4 && s.d.walls + s.d.fans + s.d.drains + s.d.prisms + s.d.tunnels === 0,
    'play: round 1, one vent, one ring, three rings to fill, nothing placed: ' + JSON.stringify(s.d.game) + ' fix ' + JSON.stringify(s.d.fix));
  ok(s.data === '' && s.d.game.need === 3 && Math.round(s.d.game.left) === 32 && s.d.game.score === 0, 'no words over the tank: round 1 asks three rings in 32 seconds, said in big words in the tank as it opens, the score in its corner: ' + JSON.stringify(s.d.game));
  // (15 Nov: free and hand, the owner said, were the same thing: the hand stays, and ends the game)
  ok(s.tools === 'ink,puz' && await page.evaluate(() => ['t_ink', 't_puz'].map(i => document.getElementById(i).firstChild.textContent).join()) === 'hand,again', 'in a game only two buttons: the hand, and again: ' + s.tools);
  ok(await page.evaluate(() => document.getElementById('data').getBoundingClientRect().bottom) < s.d.board.y0 + 1, 'the tank sits under the header, clear of it');
  ok(s.d.board.w / s.d.board.h > .6 && s.d.board.w / s.d.board.h < .68, 'a round is played in a tank of fixed shape: ' + Math.round(s.d.board.w) + ' x ' + Math.round(s.d.board.h));
  ok(s.on === ON0, 'a game leaves the music as it is: ' + s.on);
  // (17 Nov: waiting for the clock to have run too: a poll could land on the very frame the round began, its 32 seconds still whole)
  await until(s => s.d.game.phase === 'play' && s.d.cups.length === 1 && s.d.game.left < 32, 60000);
  ok(s.d.game.phase === 'play' && s.d.cups.length === 1 && s.d.cups[0].c === 0 && s.d.game.left < 32 && s.data === '', 'after a moment the ring is there (cyan) and the clock runs: ' + JSON.stringify(s.d.game));
  await look('game');
  // pushed with real fingers: from just over the vent, up into the ring, again and again, until it fills
  const BX = u => s.d.board.x0 + s.d.board.w * u, BY = v => s.d.board.y0 + s.d.board.h * v;
  const ring0 = s.d.cups[0]; let got = 0, t0 = Date.now(), np = 0;
  // (as a player would: a finger on the stream just above its vent, drawn to the ring and held there; the vent turns its stream to
  // follow the finger; up to three times)
  for (let k = 0; k < 3 && !got; k++) { const c = (await D()).d.cups[0]; if (!c) break; const v = s.d.vents.find(q => q.c === c.c) || s.d.vents[0];
    const v0 = s.d.vents[0], a0 = v0.a; await push(v.x, v.y - 30, c.x, c.y, 30, 150); np++; s = await D(); got = s.d.game.got; }
  ok(got >= 1 && s.d.game.score >= 1, 'a finger pushing the smoke from the vent into the ring fills it (' + np + ' push' + (np > 1 ? 'es' : '') + '): ' + JSON.stringify(s.d.game));
  ok(s.d.cups.length === 1 && Math.hypot(s.d.cups[0].x - ring0.x, s.d.cups[0].y - ring0.y) > 20, 'a filled ring gives way to the next, somewhere else');
  ok(s.d.game.got === 1 && s.d.game.score >= 1, 'it is counted (a dot lit at the top of the tank, the score in its corner): ' + JSON.stringify(s.d.game));
  await look('game_ring');
  // a tap blows the smoke away, without fault
  await tap(BX(.5), BY(.6)); await sleep(200); s = await D(); ok(!s.errs.length && s.d.game.phase === 'play', 'a tap in a round blows the smoke away, without fault');
  // the round won: the next comes by itself, a little faster
  for (let k = 0; k < 10 && s.d.game.got < s.d.game.need; k++) { await until(s => s.d.cups.length === 1, 20000); await page.evaluate(() => window.__lc.WORLDS[0].o.win()); await sleep(80); s = await D(); }
  ok(s.d.game.phase === 'won', 'all three rings: the round is done: ' + JSON.stringify(s.d.game));
  // (the words are painted a little after the state changes: waited for too)
  await until(s => s.d.game.round >= 2, 60000);
  ok(s.d.game.round === 2 && s.d.game.score >= 3 && s.d.game.got === 0 && Math.round(s.d.game.left) === 30, 'a moment later round 2, with less time: ' + JSON.stringify(s.d.game));
  // the rounds grow: two vents and two colours from round 3, three from round 5, the ring drifting from round 4, a wall in the way from round 6
  const plan = await page.evaluate(() => { const o = window.__lc.WORLDS[0].o, r = []; for (const n of [1, 3, 4, 5, 6, 9]) { o.goRound(n); const d = o.dbg(); r.push({ n, vents: d.fix.fans, cols: d.game.cols.length, wall: d.game.wall, need: d.game.need, cups: d.cups.length, walls: d.fix.walls, drains: d.fix.drains, cur: !!d.game.cur }); } o.goRound(2); return r; });
  ok(plan.map(p => p.vents + '/' + p.cols).join() === '1/1,2/2,2/2,3/3,3/3,3/3' && plan.map(p => p.wall).join() === 'false,false,false,false,true,true' && plan.every(p => p.cups === 0 && p.walls === (p.wall ? 5 : 4)) && plan[5].need > plan[0].need,
    'the rounds grow: more vents and colours, a wall later on, more rings to fill: ' + JSON.stringify(plan));
  ok(plan.map(p => p.drains).join() === '0,0,0,1,1,1' && plan.map(p => p.cur).join() === 'false,false,false,false,false,true', 'a drain from round 5, a current from round 7: ' + plan.map(p => p.n + ':' + p.drains + '/' + p.cur).join(' '));
  // (14 Nov: "game is getting better. Needs more") each round says what it brings; a gold ring is worth three; rings filled close
  // together count double, treble; two rings at once from round 8
  await page.evaluate(() => window.__lc.WORLDS[0].o.goRound(2)); await until(s => s.d.game.round === 2 && s.d.game.phase === 'intro', 8000);
  ok(s.d.game.round === 2 && s.d.game.news === 'GOLD RINGS', 'a round says what is new in it (in the tank): ' + JSON.stringify(s.d.game));
  // (17 Nov: each score read in the same moment as its ring, before and after: the water could fill a ring on its own between a
  // read and a win, which once counted that ring into the gold one's points)
  await until(s => s.d.game.phase === 'play' && s.d.cups.length === 1, 60000);
  const r1 = await page.evaluate(() => { const o = window.__lc.WORLDS[0].o, a = o.dbg().game.score; o.gold(); o.win(); const d = o.dbg(); return { sc0: a, sc1: d.game.score, k1: d.game.combo, g2: !!(d.cups[0] && d.cups[0].gold) }; });
  const r2 = await page.evaluate(() => { const o = window.__lc.WORLDS[0].o, b = o.dbg().game, a = b.score, kb = b.combo; o.win(); const d = o.dbg(); return { sc: a, kb, sc2: d.game.score, k2: d.game.combo }; });
  const sc0 = r1.sc0, sc1 = r1.sc1, k1 = r1.k1, g2 = r1.g2, k2 = r2.k2; s = await D();
  ok(sc1 - sc0 === 3 * k1 && k2 === Math.min(5, r2.kb + 1) && r2.sc2 - r2.sc === k2 * (g2 ? 3 : 1), 'a gold ring scores three times the combo; the next ring filled straight after, one more in the combo: ' + [sc0, sc1, r2.sc2, 'combo ' + k1 + ' then ' + k2].join(' → '));
  await look('game_gold');
  await page.evaluate(() => window.__lc.WORLDS[0].o.goRound(8)); await until(s => s.d.game.phase === 'play' && s.d.cups.length === 2, 60000);
  ok(s.d.cups.length === 2 && s.d.cups[0].c !== s.d.cups[1].c && s.d.fix.drains === 1 && !!s.d.game.cur, 'round 8: two rings at once, of two colours, with the drain and the current: ' + JSON.stringify(s.d.cups.map(c => c.c)));
  // (counted from where it stood: in round 8 the current can carry a vent's smoke into its ring before the hook fills one)
  { const g0 = s.d.game.got, keep = s.d.cups[1]; await page.evaluate(() => window.__lc.WORLDS[0].o.win()); s = await D();
    ok(s.d.cups.length === 2 && s.d.game.got === g0 + 1 && s.d.cups.some(c => c.c === keep.c && Math.hypot(c.x - keep.x, c.y - keep.y) < 40), 'a ring of the two filled: a new one takes its place, the other stays: ' + JSON.stringify({ g0, got: s.d.game.got, cups: s.d.cups.map(c => c.c) })); }
  await look('game_two');
  // time up: the score stays, the best is kept
  await page.evaluate(() => window.__lc.WORLDS[0].o.goRound(2)); await until(s => s.d.game.phase === 'play', 60000); await page.evaluate(() => window.__lc.WORLDS[0].o.left(.3));
  await until(s => s.d.game.phase === 'over', 30000);
  const sc = s.d.game.score;
  ok(s.d.game.phase === 'over' && sc >= 3 && s.d.game.newBest && s.data === '' && s.d.game.best === sc && await page.evaluate(() => { try { return localStorage.getItem('lc.smoke.best'); } catch (e) { return null; } }) === String(sc),
    'time up: the score, a new best (in big words in the tank), and the best kept: ' + JSON.stringify(s.d.game));
  await look('game_over');
  await click('t_puz'); await sleep(300); await until(s => s.d.game.round === 1 && s.d.game.phase === 'intro', 5000); ok(s.d.game.round === 1 && s.d.game.score === 0 && s.d.game.best === sc, 'again: round 1, score 0, the best still there: ' + JSON.stringify(s.d.game));
  // the hand: back to painting freely, every piece there to build with
  await click('t_ink'); await sleep(500); await page.evaluate(() => window.__lc.WORLDS[0].o.fixdt(0)); s = await D();
  ok(s.d.pz < 0 && s.d.cups.length === 0 && s.tools === 'ink*,wall,fan,drain,puz' && await page.evaluate(() => document.getElementById('t_puz').firstChild.textContent) === 'play', 'the hand: back to painting freely, with every piece: ' + s.tools);
  await sleep(1500); await page.screenshot({ path: `shots/smoke_${size}_free_pieces.png` });
  const e = [...new Set(errs)]; if (e.length) console.log('ERRORS', e.slice(0, 6));
  await ctx.close(); await browser.close(); console.log(fail.length || e.length ? 'SMOKE FAILED' : 'SMOKE OK'); process.exit(fail.length || e.length ? 1 : 0);
})();
