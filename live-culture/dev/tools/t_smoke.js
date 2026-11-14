// Smoke as a machine and a game, played with real touches: the tools, a wall that stops the smoke, a fan, a drain, a whirlpool; then
// the game: play starts a round (no map, no levels to pick: a set-up of its own each time, harder as rounds are won, mirrored half the
// time), the first round solved by building, the next one coming by itself, new, every set-up both ways, and back to playing freely.
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
  ok(s.tools === 'ink*,wall,fan,prism,drain,tunnel,puz', 'the tools are in a row along the bottom, moving the water first, then every piece, then play: ' + s.tools);
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
  // the game: no map and no levels to pick; play starts a round, a set-up of its own each time (the first, before any is won, the simplest)
  const ON0 = await page.evaluate(() => window.__lc.ON.join(''));
  await page.evaluate(() => { try { localStorage.removeItem('lc.smoke.wins'); } catch (e) {} window.__lc.WORLDS[0].o.wins(0); });
  ok(await page.evaluate(() => document.getElementById('t_puz').firstChild.textContent) === 'play', 'out of a round the game\'s button reads play');
  await click('t_puz'); await sleep(900); s = await D();
  const NP = await page.evaluate(() => window.__lc.WORLDS[0].o.levels.length);
  ok(s.d.pz === 0 && s.d.round === 1 && s.d.cups.length === 1 && s.d.fix.fans === 1, 'play: the first round is the simplest set-up, one jet and one ring (round ' + s.d.round + ', set-up ' + (s.d.pz + 1) + (s.d.mir ? ', mirrored' : '') + ')');
  ok(/^get the cyan smoke into the cyan ring\nyou can place 2 walls, then press release\ndrag to draw a wall: smoke slides along it$/.test(s.data) && s.tools === 'wall*,go,puz,undo', 'three plain lines say what to do, what there is to place and what the piece in hand does: ' + s.data.replace(/\n/g, ' | ') + ' · tools ' + s.tools);
  ok(await page.evaluate(() => [...document.querySelectorAll('#tools .tb span')].map(e => e.textContent).join()) === 'hand,wall,fan,prism,drain,tunnel,release,new,free', 'each tool carries its name; in a round the game\'s button reads new, and free goes back to playing freely');
  ok(await page.evaluate(() => { const d = document.getElementById('data').getBoundingClientRect(); return d.bottom; }) < s.d.board.y0, 'the words sit above the tank, clear of it');
  ok(s.on === ON0, 'a round leaves the music as it is: ' + s.on);
  // nothing built and the smoke let go: the tank runs dry, the ring is not filled, and the page says so
  await click('t_go'); await sleep(400); s = await D(); ok(s.d.run && /smoke left \d/.test(s.data) && /cyan \d+%/.test(s.data) && await page.evaluate(() => document.getElementById('t_go').firstChild.textContent) === 'stop', 'release lets the smoke go, and the button becomes stop: ' + s.data.split('\n').join(' | '));
  for (let k = 0; k < 160; k++) { await sleep(1000); s = await D(); if (!s.d.run) break; }
  await sleep(500); s = await D();
  ok(!s.d.run && !s.d.won && s.d.out && /not quite: move a piece, then release again/.test(s.data), 'with nothing built the tank runs dry and the ring stays short: ' + s.data.split('\n')[1]);
  ok(s.d.board.w / s.d.board.h > .6 && s.d.board.w / s.d.board.h < .68 && s.d.fix.walls === 4, 'a round is played in a tank of fixed shape: ' + Math.round(s.d.board.w) + ' x ' + Math.round(s.d.board.h));
  await page.screenshot({ path: `shots/smoke_${size}_round1.png` });
  // the set-up's own answer, as it stands on the screen (mirrored with it), drawn with real touches
  const sol = await page.evaluate(() => window.__lc.WORLDS[0].o.sol());
  const BX = u => s.d.board.x0 + s.d.board.w * u, BY = v => s.d.board.y0 + s.d.board.h * v;
  for (const b of sol) { const a = b[1];
    if (b[0] === 'wall') { await click('t_wall'); await drag(BX(a[0]), BY(a[1]), BX(a[2]), BY(a[3]), 14); }
    else if (b[0] === 'fan') { await click('t_fan'); const m = Math.hypot(a[2], a[3]) || 1; await drag(BX(a[0]), BY(a[1]), BX(a[0]) + a[2] / m * 44, BY(a[1]) + a[3] / m * 44, 6); }
    else if (b[0] === 'prism') { await click('t_prism'); await tap(BX(a[0]), BY(a[1])); }
    else if (b[0] === 'drain') { await click('t_drain'); await tap(BX(a[0]), BY(a[1])); }
    else if (b[0] === 'tunnel') { await click('t_tunnel'); await drag(BX(a[0]), BY(a[1]), BX(a[2]), BY(a[3]), 12); } }
  s = await D(); ok(s.d.walls + s.d.fans + s.d.drains + s.d.prisms + s.d.tunnels === sol.length && !s.d.run, 'the answer built with touches, the smoke still held: ' + sol.map(b => b[0]).join(', ') + ' · ' + s.data.split('\n')[1]);
  await click('t_go');
  let best = 0; for (let k = 0; k < 150; k++) { await sleep(1000); s = await D(); if (s.d.cups[0]) best = Math.max(best, s.d.cups[0].fill); if (s.d.won || s.d.round > 1) break; }
  ok(s.d.won || s.d.round > 1, 'with it the ring fills: ' + Math.round(best * 100) + '% (match ' + (s.d.cups[0] ? s.d.cups[0].match.toFixed(3) : '-') + ')');
  if (s.d.won) { ok(/^in! here comes another · rounds won: 1$/.test(s.data), 'won: the page says so, and counts it: ' + s.data); await page.screenshot({ path: `shots/smoke_${size}_round1_won.png` }); }
  if (s.d.round === 1 && !s.d.won) await page.evaluate(() => window.__lc.WORLDS[0].o.win());
  for (let k = 0; k < 14; k++) { await sleep(500); s = await D(); if (s.d.round === 2) break; }
  ok(s.d.round === 2 && s.d.pz !== 0 && !s.d.won && s.d.wins === 1 && await page.evaluate(() => { try { return localStorage.getItem('lc.smoke.wins'); } catch (e) { return '1'; } }) === '1', 'a moment later the next round sets itself up, a different one, and the win is kept: set-up ' + (s.d.pz + 1) + (s.d.mir ? ' (mirrored)' : ''));
  // new: another set-up at once, never the same one twice running
  let prev = s.d.pz, same = 0, mir = 0; for (let k = 0; k < 12; k++) { await click('t_puz'); await sleep(250); s = await D(); if (s.d.pz === prev) same++; if (s.d.mir) mir++; prev = s.d.pz; }
  ok(!same && mir > 0 && mir < 12, 'new gives another set-up each time, never the one just played, mirrored about half the time (' + mir + ' of 12)');
  // harder as rounds are won: with none won only the walls' set-ups come up; with ten, every kind
  const pool = await page.evaluate(() => { const o = window.__lc.WORLDS[0].o, r = {}; for (const w of [0, 10]) { o.wins(w); const seen = new Set(); for (let k = 0; k < 80; k++) { o.round(); seen.add(o.dbg().pz); } r[w] = [...seen].sort((a, b) => a - b); } o.wins(1); return r; });
  ok(pool[0].every(i => i < 4) && pool[10].some(i => i >= 20) && pool[10].length >= 12, 'harder as rounds are won: none won, set-ups ' + pool[0].map(i => i + 1).join(',') + '; ten won, ' + pool[10].length + ' kinds, up to ' + (Math.max(...pool[10]) + 1));
  // every set-up, as it is and mirrored, sets up without fault
  let bad = []; for (let i = 0; i < NP; i++) for (const m of [false, true]) { await page.evaluate(a => window.__lc.WORLDS[0].o.level(a[0], a[1]), [i, m]); await sleep(m ? 120 : 260); s = await D();
    if (!(s.d.pz === i && s.d.mir === m && s.d.cups.length >= 1 && !s.errs.length && s.data.split('\n').length === 3)) bad.push((i + 1) + (m ? 'm' : '')); if (!m && i % 6 === 0) await page.screenshot({ path: `shots/smoke_${size}_setup${i + 1}.png` }); }
  ok(!bad.length, 'all ' + NP + ' set-ups, as they are and mirrored, set up with three lines of words' + (bad.length ? ': failing ' + bad.join(' ') : ''));
  // free: back to playing freely, every piece there to build with
  await click('t_undo'); await sleep(500); s = await D();
  ok(s.d.pz < 0 && s.d.walls === 0 && s.tools === 'ink*,wall,fan,prism,drain,tunnel,puz' && await page.evaluate(() => document.getElementById('t_puz').firstChild.textContent) === 'play', 'free: back to playing freely, with every piece: ' + s.tools);
  await click('t_prism'); await tap(X(s, .3), Y(s, .4)); await click('t_tunnel'); await drag(X(s, .2), Y(s, .7), X(s, .7), Y(s, .3), 10); s = await D();
  ok(s.d.prisms === 1 && s.d.tunnels === 1, 'a prism (a tap) and a tunnel (a drag from one end to the other) are built');
  await sleep(1500); await page.screenshot({ path: `shots/smoke_${size}_free_pieces.png` });
  const e = [...new Set(errs)]; if (e.length) console.log('ERRORS', e.slice(0, 6));
  await ctx.close(); await browser.close(); console.log(fail.length || e.length ? 'SMOKE FAILED' : 'SMOKE OK'); process.exit(fail.length || e.length ? 1 : 0);
})();
