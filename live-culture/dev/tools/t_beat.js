// Beat (17 Nov, 17:54: "the graphics and beat breakdown ... the view of the metronome"; "make wildest different good sounding noises
// for beautiful melodic timed sound making and experimenting"): the bar as a metronome's face, what plays broken down round it, notes
// put on it with real touches and played on the band's sixteenths in five sounds, dice and clear, kept after a reload, and nothing
// cut off at the Claude app's two heights. usage: node tools/t_beat.js
const { launch, open } = require('./lib'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const fail = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fail.push(m); };
(async () => {
  const browser = await launch(); let { page, errs, ctx } = await open(browser, 'phone'); await sleep(1200);
  let cdp = await ctx.newCDPSession(page);
  const touch = async (pts, type) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: i + 1 })) });
  const tap = async (x, y) => { await touch([[x, y]], 'touchStart'); await sleep(50); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(150); };
  const D = () => page.evaluate(() => { const L = window.__lc, i = L.WORLDS.findIndex(w => w.id === 'beat'), r = document.getElementById('btools'), f = document.getElementById('rail').getBoundingClientRect();
    return { i, cur: L.CURI, d: L.WORLDS[i].o.dbg(), errs: (L.errs || []).slice(0, 3), data: document.getElementById('data').textContent, stg: L.STG, rail: { t: f.top },
      shown: !!r && !r.hidden, paintTools: !document.getElementById('tools').hidden,
      tools: r ? [...r.querySelectorAll('.tb')].map(b => { const q = b.getBoundingClientRect(); return { id: b.id.slice(2), on: b.getAttribute('aria-pressed'), l: q.left, r: q.right, t: q.top, b: q.bottom }; }) : [] }; });
  const at = (s, p) => page.evaluate(a => window.__lc.BEAT.at(a[0], a[1]), [s, p]);
  // the worlds: Beat is the fourth, and a real tap on its button opens it
  const rail = await page.evaluate(() => [...document.querySelectorAll('#rail .wb')].map(b => b.textContent));
  ok(rail.join() === 'Paint,Earth,Mix,Beat', 'four worlds, Beat the last: ' + rail.join());
  { const r = await page.evaluate(() => { const q = document.getElementById('w_beat').getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; }); await tap(r.x, r.y); await sleep(900); }
  let s = await D(); ok(s.cur === s.i && s.d.on && s.shown && !s.paintTools && !s.errs.length, 'a tap on Beat opens it: its row of sounds shown, Paint\'s tools not: ' + JSON.stringify({ cur: s.cur, errs: s.errs }));
  await page.evaluate(() => { try { localStorage.removeItem('lc.beat'); } catch (e) {} window.__lc.BEAT.set([]); });
  // its row: five sounds, dice and clear, every one whole on the screen, above the worlds, none narrower than 40
  s = await D(); const W = await page.evaluate(() => innerWidth);
  ok(s.tools.map(t => t.id).join() === 'glass,rubber,bells,boom,pluck,dice,clear' && s.tools.every(t => t.l >= 0 && t.r <= W && t.b <= s.rail.t + 1 && t.r - t.l >= 40),
    'five sounds, dice and clear, all on the screen, above the worlds: ' + s.tools.map(t => t.id + '@' + Math.round(t.l) + '-' + Math.round(t.r) + '/' + Math.round(t.t)).join(' '));
  ok(s.d.geo.R >= 110 && s.d.geo.cx - s.d.geo.R * 1.2 >= 0 && s.d.geo.cx + s.d.geo.R * 1.2 <= W && s.d.geo.cy - s.d.geo.R * 1.2 >= s.stg.y0 - 1 && s.d.geo.cy + s.d.geo.R * 1.2 <= Math.min(...s.tools.map(t => t.t)) + 1, 'the circle is big and whole between the top and the sounds: R ' + Math.round(s.d.geo.R));
  await page.screenshot({ path: 'shots/beat_phone_empty.png' });
  // the music on: the hand goes round with the band, and what plays is broken down inside the circle
  await page.evaluate(() => window.__lc.musicOn()); for (let k = 0; k < 40 && !(s.d.clock); k++) { await sleep(250); s = await D(); }
  const c1 = s.d.clock; await sleep(700); s = await D(); const c2 = s.d.clock;
  ok(!!c1 && !!c2 && (c2.bar * 16 + c2.q) !== (c1.bar * 16 + c1.q), 'the hand goes round with the band: ' + JSON.stringify([c1, c2]));
  ok(s.d.lanes >= 1, 'what plays is broken down round the circle, one ring each: ' + s.d.lanes + ' playing');
  // a real tap on the circle puts a note there, heard at once; a second tap takes it away
  await page.evaluate(() => { const L = window.__lc, o = L.MIX.bvoice; window.__bv = []; L.MIX.bvoice = function (n, m, v, p, w) { window.__bv.push([n, m, w, L.AU.c.currentTime, L.AU.t0]); return o.apply(this, arguments); }; });
  let q = await at(4, 3); await tap(q.x, q.y); s = await D();
  ok(s.d.notes.some(n => n[0] === 4 && n[1] === 3 && n[2] === 0), 'a tap on the circle puts a note there, in glass: ' + JSON.stringify(s.d.notes));
  let bv = await page.evaluate(() => window.__bv.slice()); ok(bv.length >= 1 && bv[0][0] === 'glass' && bv[0][1] === await page.evaluate(() => window.__lc.BEAT.midi(3)), 'and it is heard at once: ' + JSON.stringify(bv[0]));
  await tap(q.x, q.y); s = await D(); ok(!s.d.notes.some(n => n[0] === 4 && n[1] === 3), 'a second tap takes it away: ' + JSON.stringify(s.d.notes));
  // a sound chosen: its button lit and its name said at the top (asked for, so words are fine: rule 24); then a finger drawn round
  // the circle leaves a melody in it
  { const b = s.tools.find(t => t.id === 'rubber'); await tap((b.l + b.r) / 2, (b.t + b.b) / 2); }
  s = await D(); ok(s.d.sound === 'rubber' && s.tools.find(t => t.id === 'rubber').on === 'true' && /rubber/.test(s.data), 'rubber chosen: its button lit, its name said: ' + JSON.stringify(s.data));
  { const pts = []; for (let k = 0; k <= 20; k++) { const st = 8 + k * 6 / 20, a = -Math.PI / 2 + st / 16 * Math.PI * 2, g = s.d.geo, r = g.R * (.6 + .4 * (2 + 3 * k / 20) / 7); pts.push([g.cx + Math.cos(a) * r, g.cy + Math.sin(a) * r]); }
    await touch([pts[0]], 'touchStart'); for (const p of pts.slice(1)) { await touch([p], 'touchMove'); await sleep(30); } await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(200); }
  s = await D(); const drawn = s.d.notes.filter(n => n[2] === 1);
  ok(drawn.length >= 4 && new Set(drawn.map(n => n[0])).size >= 4, 'a finger drawn round the circle leaves a melody in rubber: ' + JSON.stringify(drawn));
  // the notes play on the band's sixteenths, each at its own sixteenth of the bar, bar after bar
  await page.evaluate(() => { window.__bv = []; }); await sleep(4500); bv = await page.evaluate(() => window.__bv.slice());
  const SD = await page.evaluate(() => window.__lc.STEML / 64), sched = bv.filter(b => b[2] > 0);
  const onGrid = sched.filter(b => { const x = (b[2] - b[4]) / SD, k = Math.round(x), sw = (k & 1) ? .16 : 0; return Math.abs(x - k - sw) < .02 || Math.abs(x - Math.floor(x) - sw) < .02; });
  const steps = new Set(sched.map(b => { const x = (b[2] - b[4]) / SD; return ((Math.round(x - .16 * (Math.round(x) & 1)) % 16) + 16) % 16; }));
  ok(sched.length >= drawn.length && onGrid.length === sched.length && drawn.every(n => steps.has(n[0])), 'the notes play in time, each on its sixteenth: ' + sched.length + ' played, steps ' + [...steps].sort((a, b) => a - b).join(','));
  await page.screenshot({ path: 'shots/beat_phone_notes.png' });
  // dice: a melody made up in the sound chosen (glass), the others kept; clear: none
  { const b = s.tools.find(t => t.id === 'glass'); await tap((b.l + b.r) / 2, (b.t + b.b) / 2); const d = s.tools.find(t => t.id === 'dice'); await tap((d.l + d.r) / 2, (d.t + d.b) / 2); }
  s = await D(); const g1 = s.d.notes.filter(n => n[2] === 0), r1 = s.d.notes.filter(n => n[2] === 1);
  ok(g1.length >= 5 && r1.length === drawn.length && /melody/.test(s.data), 'dice makes up a melody in glass and keeps the rubber one: ' + g1.length + ' glass, ' + r1.length + ' rubber');
  // kept after a reload
  await page.reload({ waitUntil: 'load' }); await sleep(1500); cdp = await ctx.newCDPSession(page);
  await page.evaluate(() => { const L = window.__lc; L.go(L.WORLDS.findIndex(w => w.id === 'beat'), true); }); await sleep(600); s = await D();
  ok(s.d.notes.length === g1.length + r1.length && s.d.sound === 'glass', 'kept after a reload: ' + s.d.notes.length + ' notes, ' + s.d.sound);
  { const c = s.tools.find(t => t.id === 'clear'); await tap((c.l + c.r) / 2, (c.t + c.b) / 2); } s = await D();
  ok(s.d.notes.length === 0, 'clear: no notes left');
  // the Claude app's height: 390 by 750, then 375 by 667: the circle and the row whole, the row above the worlds
  for (const [w, h] of [[390, 750], [375, 667]]) { await page.setViewportSize({ width: w, height: h }); await sleep(700); await page.evaluate(() => window.__lc.BEAT.set([[0, 7, 0], [4, 2, 1], [8, 5, 2], [12, 0, 3], [14, 4, 4]])); await sleep(300); s = await D();
    ok(s.tools.every(t => t.l >= 0 && t.r <= w && t.b <= s.rail.t + 1) && s.d.geo.cy - s.d.geo.R * 1.2 >= s.stg.y0 - 1 && s.d.geo.cy + s.d.geo.R * 1.2 <= Math.min(...s.tools.map(t => t.t)) + 1 && s.d.geo.R >= 90,
      w + 'x' + h + ': the circle (R ' + Math.round(s.d.geo.R) + ') and the row whole, above the worlds'); await page.screenshot({ path: `shots/beat_${w}x${h}.png` }); }
  await page.evaluate(() => window.__lc.BEAT.set([]));
  const e = [...new Set(errs)]; if (e.length) console.log('ERRORS', e.slice(0, 6));
  await ctx.close(); await browser.close(); console.log(fail.length || e.length ? 'BEAT FAILED' : 'BEAT OK'); process.exit(fail.length || e.length ? 1 : 0);
})();
