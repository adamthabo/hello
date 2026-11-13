// plays every world with real touches (through the browser's own touch input, several fingers at once), checks what should
// happen does, collects errors, and writes pictures to shots/play_<size>_<name>.png
// usage: node tools/t_play.js [size] [worlds, e.g. 0,1,2] [dsf]
const { launch, open, frames } = require('./lib');
const size = process.argv[2] || 'phone', which = (process.argv[3] || '0,1,2').split(',').map(Number), dsf = +(process.argv[4] || 1);
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await launch(); const { page, errs, ctx } = await open(browser, size, { dsf });
  const cdp = await ctx.newCDPSession(page);
  const pts = new Map();
  const send = type => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: [...pts.entries()].map(([id, p]) => ({ x: p.x, y: p.y, id, radiusX: 8, radiusY: 8, force: 1 })) });
  const T = {
    down: async (id, x, y) => { pts.set(id, { x, y }); await send('touchStart'); },
    move: async (id, x, y) => { pts.set(id, { x, y }); await send('touchMove'); },
    up: async id => { pts.delete(id); await send(pts.size ? 'touchMove' : 'touchEnd'); if (pts.size) { /* a finger lifted while others stay */ await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [...pts.entries()].map(([i, p]) => ({ x: p.x, y: p.y, id: i })) }).catch(() => {}); await send('touchStart').catch(() => {}); } },
    // one finger along a path: f(u) for u in 0..1, over ms milliseconds
    stroke: async (id, f, ms, steps) => { steps = steps || Math.max(6, Math.round(ms / 16)); let p = f(0); await T.down(id, p[0], p[1]); for (let i = 1; i <= steps; i++) { p = f(i / steps); await T.move(id, p[0], p[1]); await sleep(ms / steps); } pts.delete(id); await send('touchEnd'); },
    tap: async (x, y) => { pts.set(9, { x, y }); await send('touchStart'); await sleep(40); pts.delete(9); await send('touchEnd'); },
  };
  const S = () => page.evaluate(() => { const L = window.__lc, w = L.WORLDS[L.CURI]; return { id: w.id, dbg: w.o.dbg ? w.o.dbg() : null, errs: L.errs.slice(0, 6), data: document.getElementById('data').textContent, run: L.AU.run, want: L.AU.want, state: L.AU.c && L.AU.c.state, on: L.ON.join(''), vox: L.VOX, ptn: Object.keys(L.PT).length, ghosts: Object.keys(L.GP).length, hint: L.GH.on ? L.GH.mode : 0, ql: L.QL, stg: L.STG }; });
  const shot = n => page.screenshot({ path: `shots/play_${size}_${n}.png` });
  const fail = []; const ok = (c, m) => { if (!c) { fail.push(m); console.log('  FAIL ' + m); } };
  await page.waitForTimeout(1200);
  await page.evaluate(() => { window.__lc.GOV.n = -1e9; });
  const vp = page.viewportSize(), W = vp.width, H = vp.height;
  let s = await S(); const g = s.stg;
  const X = u => g.x0 + g.w * u, Y = v => g.y0 + g.h * v;

  const sw = () => page.evaluate(() => { const b = document.getElementById('bSound'), L = window.__lc; return { pressed: b.getAttribute('aria-pressed'), off: document.getElementById('dotrow').classList.contains('off'), live: L.soundLive(), on: L.ON.join(''), dots: document.querySelectorAll('#dots .dot').length, lit: document.querySelectorAll('#dots .dot[aria-pressed=true]').length }; });

  if (which.includes(0)) { console.log('SMOKE');
    await page.evaluate(() => window.__lc.go(0, true)); await sleep(900); s = await S(); ok(s.hint === 1, 'smoke: the hint should be running before any touch');
    let m = await sw(); ok(m.pressed === 'false' && m.off && m.dots === 9, 'music: before any touch the note is unlit and the nine circles are dimmed: ' + JSON.stringify(m));
    await shot('0a_smoke_hint');
    await T.stroke(1, u => [X(.12 + .76 * u), Y(.75 - .1 * Math.sin(u * 9))], 900);
    s = await S(); ok(s.want, 'smoke: music should be asked for by the first touch'); ok(s.ghosts === 0 && s.hint === 0, 'smoke: the hint finger should leave at a real touch');
    await T.stroke(1, u => [X(.85 - .7 * u), Y(.5 + .12 * Math.sin(u * 7))], 900);
    await T.stroke(1, u => [X(.2 + .6 * u), Y(.15 + .7 * u)], 800);
    await T.stroke(1, u => [X(.5 + .3 * Math.cos(u * 6.28)), Y(.3 + .18 * Math.sin(u * 6.28))], 900);
    await T.tap(X(.3), Y(.25)); await sleep(500); await shot('0b_smoke_strokes'); await sleep(2500); await shot('0c_smoke_later');
    // five fingers at once
    for (let i = 0; i < 5; i++) await T.down(10 + i, X(.15 + .17 * i), Y(.3));
    for (let k = 1; k <= 24; k++) { for (let i = 0; i < 5; i++) pts.set(10 + i, { x: X(.15 + .17 * i) + Math.sin(k * .5 + i) * 30, y: Y(.3 + .4 * k / 24) }); await send('touchMove'); await sleep(22); }
    s = await S(); ok(s.ptn === 5, 'smoke: five fingers should all be tracked, got ' + s.ptn); await shot('0d_smoke_five');
    pts.clear(); await send('touchEnd'); await sleep(200); s = await S(); ok(s.ptn === 0, 'smoke: all fingers should be released, got ' + s.ptn);
    ok(s.dbg.ok, 'smoke: the water should be running'); console.log('  ', JSON.stringify(s).slice(0, 330)); }

  if (which.includes(1)) { console.log('EARTH');
    await page.evaluate(() => window.__lc.go(1, true)); await sleep(5600); s = await S();
    ok(s.dbg.ready, 'earth: the pictures of the Earth should have loaded'); ok(s.dbg.wind && s.dbg.aurora && s.dbg.strikes > 20, 'earth: the wind, the aurora and the lightning should be there: ' + JSON.stringify([s.dbg.wind, s.dbg.aurora, s.dbg.strikes]));
    ok(s.dbg.fires > 4 && s.dbg.fireGL === s.dbg.fires, 'earth: the fires should be there and feeding the smoke: ' + s.dbg.fires + ', ' + s.dbg.fireGL);
    const lyr = await page.evaluate(() => [...document.querySelectorAll('#lyr .lb')].filter(b => !b.hidden).map(b => b.id + '=' + b.getAttribute('aria-pressed')).join());
    ok(s.dbg.lyr && lyr === 'l_sats=true,l_wind=true,l_sun=true', 'earth: the layers there are data for can be switched (here: the satellites, the wind and the Sun): ' + lyr);
    ok(/^the Earth now, its weather and satellites as layers below: turn it, tap anything\n/.test(s.data) && /fires seen from orbit/.test(s.data) && /[\d,]+ satellites, where they are now/.test(s.data), 'earth: the readout says what the world is, then counts the fires and the satellites: ' + s.data.replace(/\n/g, ' | '));
    await page.evaluate(() => document.getElementById('l_wind').click()); await sleep(600); s = await S(); ok(s.dbg.LY.wind === 0, 'earth: the wind layer can be put away');
    await shot('1a2_earth_nowind'); await page.evaluate(() => document.getElementById('l_wind').click()); await sleep(300);
    ok(s.dbg.ok, 'earth: the smoke should be running'); await shot('1a_earth_home');
    await page.evaluate(() => window.__lc.WIND.look(15, -40, 1)); await sleep(300); s = await S();
    const R = s.dbg.R, cx = s.dbg.cx, cy = s.dbg.cy, l0 = s.dbg.lon0;
    // one finger turns the globe, and leaves nothing behind
    await T.stroke(1, u => [cx + R * .5 - R * 1.0 * u, cy + R * .1], 600); s = await S();
    ok(Math.abs(s.dbg.lon0 - l0) > 15 && s.dbg.turned === 1, 'earth: one finger should turn the globe, moved ' + (s.dbg.lon0 - l0).toFixed(1)); ok(s.want, 'earth: a touch should ask for the music');
    // a tap on a place reads it (the satellites put away first, so the tap cannot land on one)
    await page.evaluate(() => { document.getElementById('l_sats').click(); window.__lc.WIND.look(15, -40, 1); }); await sleep(400);
    // (a tap is a touch lifted within 600 ms of the frames' clock; a frame of this browser can take a good part of that, so up to three tries)
    for (let k = 0; k < 3; k++) { await T.tap(cx - R * .2, cy + R * .15); await sleep(500); s = await S(); if (s.dbg.probe) break; }
    ok(s.dbg.probe && s.dbg.probe.r && s.dbg.probe.r.wind && /wind \d+ km\/h from [a-z\-]+/.test(s.data) && /by the Sun/.test(s.data), 'earth: a tap should read the place: ' + s.data.replace(/\n/g, ' | '));
    const rl = s.data.split('\n').slice(1); ok(rl.length === 3 || (rl.length === 4 && /^(\d[\d,]* km from )?[^·\d][^·]*, [^·]+$/.test(rl[0])), 'earth: the reading is three lines under the first, after the name of the nearest town if there is one: ' + rl[0]); await shot('1b_earth_place'); console.log('  ', s.data.replace(/\n/g, ' | '));
    await T.tap(X(.03), Y(.02)); await sleep(300); s = await S(); ok(!s.dbg.probe, 'earth: a tap on the dark should put the reading away');
    // a tap on a fire reads the fire
    await page.evaluate(() => { const L = window.__lc, f = L.LIVE.fires.list[0]; L.WIND.look(f.lat, f.lon, 1.6); }); await sleep(1200); s = await S();
    const f0 = s.dbg.fireAt.find(f => Math.hypot(f.x - s.dbg.cx, f.y - s.dbg.cy) < s.dbg.R * .5) || s.dbg.fireAt[0];
    if (f0) { for (let k = 0; k < 3; k++) { await T.tap(f0.x, f0.y); await sleep(500); s = await S(); if (s.dbg.probe) break; } ok(s.dbg.probe && s.dbg.probe.r.fire && /^fire · [\d,]+ MW · seen by /m.test(s.data), 'earth: a tap on a fire should read the fire: ' + s.data.replace(/\n/g, ' | ')); await shot('1c_earth_fire'); console.log('  ', s.data.replace(/\n/g, ' | ')); }
    else ok(false, 'earth: no fire in view to tap');
    // a tap on a storm reads the storm (when one is turning)
    const st = await page.evaluate(() => { const L = window.__lc, S = L.LIVE.storms && L.LIVE.storms.list[0]; if (S) L.WIND.look(S.lat, S.lon, 1.2); return S || null; });
    if (st) { await sleep(1200); s = await S(); const sp = s.dbg.storms.find(k => k.name === st.name); for (let k = 0; k < 3; k++) { await T.tap(sp.x, sp.y); await sleep(500); s = await S(); if (s.dbg.probe) break; }
      ok(s.dbg.probe && s.dbg.probe.r.storm && s.data.indexOf(st.name) >= 0, 'earth: a tap on a storm should read the storm: ' + s.data.replace(/\n/g, ' | ')); await shot('1d_earth_storm'); console.log('  ', s.data.replace(/\n/g, ' | ')); }
    else console.log('   (no tropical storm today)');
    // two fingers spreading: closer (from the whole Earth: a storm tapped has just brought it close)
    await page.evaluate(() => window.__lc.WIND.look(15, -40, 1)); await sleep(400);
    s = await S(); const z0 = s.dbg.zoom, c2 = s.dbg.cx, c3 = s.dbg.cy; await T.down(1, c2 + 40, c3); await T.down(2, c2 - 40, c3); for (let k = 1; k <= 14; k++) { pts.set(1, { x: c2 + 40 + k * 5, y: c3 }); pts.set(2, { x: c2 - 40 - k * 5, y: c3 }); await send('touchMove'); await sleep(18); } pts.clear(); await send('touchEnd');
    s = await S(); ok(s.dbg.zoom > z0 * 1.2, 'earth: spreading two fingers should come closer, zoom=' + s.dbg.zoom.toFixed(2)); await shot('1e_earth_close');
    await page.evaluate(() => window.__lc.WIND.look(10, -80, 1));
    let fl = 0; for (let k = 0; k < 14; k++) { await sleep(250); fl = Math.max(fl, (await S()).dbg.flashes); } ok(fl > 0, 'earth: the lightning should be flashing, most at once ' + fl);
    await page.evaluate(() => window.__lc.WIND.look(68, -40, 1.4)); await sleep(1500); await shot('1f_earth_aurora');
    // the satellites: a layer of the Earth, every one where it is this second
    await page.evaluate(() => document.getElementById('l_sats').click()); await sleep(300);
    let o = await page.evaluate(() => window.__lc.ORBIT.dbg()); s = await S();
    ok(s.dbg.LY.sats === 1 && o.n > 10000, 'earth: the satellites are a layer, and there: ' + o.n); ok(o.live && o.want === 1 && Math.abs(o.off) < 1000, 'earth: the satellites are where they are this second (x' + o.spd.toFixed(1) + ')');
    // a tap on a satellite brings up what is on record about it
    await page.evaluate(() => window.__lc.WIND.look(20, -60, .42)); await sleep(1500); o = await page.evaluate(() => window.__lc.ORBIT.dbg()); const v = o.vis[2] || o.vis[0];
    await T.tap(v[0], v[1]); await sleep(600); o = await page.evaluate(() => window.__lc.ORBIT.dbg()); ok(o.sel >= 0 && o.card && /ORBIT/i.test(o.card) && /NOW OVER/i.test(o.card), 'earth: tapping a satellite should bring up its card: ' + String(o.card).replace(/\n+/g, ' | '));
    for (let k = 0; k < 24 && !o.cat; k++) { await sleep(250); o = await page.evaluate(() => window.__lc.ORBIT.dbg()); } await sleep(700); o = await page.evaluate(() => window.__lc.ORBIT.dbg());
    ok(o.cat && /CATALOGUE/i.test(o.card) && /LAUNCHED/i.test(o.card) && /km up/.test(o.card) && /MEASURED/i.test(o.card), 'earth: the card should fill from the catalogue: ' + String(o.card).replace(/\n+/g, ' | '));
    await shot('1g_earth_satcard'); console.log('  ', String(o.card).replace(/\n+/g, ' | '));
    await page.evaluate(() => window.__lc.ORBIT.pick('ISS (ZARYA)')); await sleep(900); o = await page.evaluate(() => window.__lc.ORBIT.dbg());
    ok(/1998-067A/.test(o.card) && /Baikonur/.test(o.card) && /20 Nov 1998/.test(o.card) && /51\.6°/.test(o.card), 'earth: the space station\'s card should hold its record: ' + String(o.card).replace(/\n+/g, ' | '));
    const age = /MEASURED\s*orbit of [^·]+ · (\d+) (min|h|days) ago/i.exec(o.card); ok(age && (age[2] !== 'days'), 'earth: the space station\'s orbit should have been measured within two days: ' + (age && age[0]));
    await shot('1h_earth_iss');
    const box = await page.evaluate(() => { const c = document.getElementById('card').getBoundingClientRect(), f = document.getElementById('foot').getBoundingClientRect(), d = document.getElementById('data').getBoundingClientRect(); return { top: c.top, bottom: c.bottom, left: c.left, right: c.right, foot: f.top, data: d.bottom, vw: innerWidth }; });
    ok(box.bottom <= box.foot + 1 && box.left >= 8 && box.right <= box.vw - 8, 'earth: the card should sit above the bottom row: ' + JSON.stringify(box));
    await page.evaluate(() => window.__lc.go(0, true)); await sleep(300); ok(await page.evaluate(() => document.getElementById('card').hidden), 'earth: the card should leave with its world'); }

  if (which.includes(2)) { console.log('MIX');
    // a known line-up first: the band left to itself would have brought everyone in by now
    await page.evaluate(() => { const L = window.__lc; L.BD.auto = false; [2, 3, 7].forEach(i => L.setPlayer(i, false, true)); });
    await page.evaluate(() => window.__lc.go(2, true)); await sleep(1200); s = await S();
    const M = () => page.evaluate(() => window.__lc.MIX.dbg());
    const el = (sel, i) => page.evaluate(a => { const e = [...document.querySelectorAll(a[0])].filter(x => x.offsetParent)[a[1] || 0]; if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, t: e.textContent }; }, [sel, i]);
    const byText = (sel, t) => page.evaluate(a => { const e = [...document.querySelectorAll(a[0])].filter(x => x.offsetParent && x.textContent === a[1])[0]; if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; }, [sel, t]);
    let m = await M(); const cells = await page.evaluate(() => [...document.querySelectorAll('#mix .mxg')].filter(g => !g.hidden).map(g => g.querySelectorAll('.mxc:not(.mxsc)').length));
    ok(m.on && m.view === 'a' && cells[0] === 54 && m.count >= 200, 'mix: the band\'s grid opens, nine players by six loops, with ' + m.count + ' more sounds behind: ' + JSON.stringify(cells));
    const top = await page.evaluate(() => ({ mix: document.getElementById('mix').getBoundingClientRect().top, data: document.getElementById('data').getBoundingClientRect().bottom, foot: document.getElementById('foot').getBoundingClientRect().top, mixB: document.getElementById('mix').getBoundingClientRect().bottom }));
    ok(top.mix >= top.data && top.mixB <= top.foot + 1, 'mix: the mixer sits between the words at the top and the row of circles: ' + JSON.stringify(top));
    // a tap on a loop of a player not playing (the band's own line-up came onto deck A with the mixer): its first half, on the next bar
    const pj = m.tracks.findIndex(t => t.d === 0 && t.play < 0 && t.next < 0); const pname = m.tracks[pj].n;
    let c = await el('#mix .mxg:not([hidden]) .mxc', 9 + pj); await T.tap(c.x, c.y); await sleep(300); m = await M();
    ok(m.tracks[pj].play === 1 || m.tracks[pj].next === 1, 'mix: a tap on a loop starts it, or sets it waiting for the bar: ' + pname + ' ' + JSON.stringify(m.tracks[pj]));
    for (let k = 0; k < 30 && m.tracks[pj].play !== 1; k++) { await sleep(400); m = await M(); } ok(m.tracks[pj].play === 1 && m.ctx === 'running', 'mix: ' + pname + ' plays its first half: ' + JSON.stringify(m.tracks[pj]));
    // the machine: drums and bass
    let tb = await byText('#mix .mxt', 'machine'); await T.tap(tb.x, tb.y); await sleep(300); m = await M(); ok(m.view === 'b', 'mix: the machine\'s grid');
    c = await el('#mix .mxg:not([hidden]) .mxc', 0); await T.tap(c.x, c.y); c = await el('#mix .mxg:not([hidden]) .mxc', 2); await T.tap(c.x, c.y);
    for (let k = 0; k < 30; k++) { await sleep(400); m = await M(); if (m.tracks[9].play === 0 && m.tracks[11].play === 0) break; } ok(m.tracks[9].play === 0 && m.tracks[11].play === 0, 'mix: the machine\'s drums and bass come in: ' + JSON.stringify([m.tracks[9], m.tracks[11]])); await shot('2a_mix_machine');
    // deck B's pitch dragged up: faster than A; sync puts it back in time
    const tr = await page.evaluate(() => { const e = document.querySelectorAll('#mix .mxdk')[1].querySelector('.mxst').getBoundingClientRect(); return { x0: e.left, x1: e.right, y: e.top + e.height / 2 }; });
    await T.stroke(1, u => [tr.x0 + (tr.x1 - tr.x0) * (.5 + .3 * u), tr.y], 500); await sleep(400); m = await M(); s = await S();
    ok(m.decks[1].rate > 1.05 && m.decks[0].rate === 1 && /B is faster than A/.test(s.data), 'mix: deck B\'s pitch dragged up: it runs faster, and the readout says so: ' + m.decks[1].rate.toFixed(3) + ' | ' + s.data.split('\n')[1]);
    const sy = await page.evaluate(() => { const e = [...document.querySelectorAll('#mix .mxdk')[1].querySelectorAll('.mxb')].find(b => b.textContent === 'sync').getBoundingClientRect(); return { x: e.left + e.width / 2, y: e.top + e.height / 2 }; });
    await T.tap(sy.x, sy.y); await sleep(400); m = await M(); const ne = m.decks[1].ne; for (let k = 0; k < 20 && m.decks[1].ne; k++) { await sleep(300); m = await M(); } await sleep(300); m = await M(); s = await S();
    ok(Math.abs(m.decks[1].rate - m.decks[0].rate) < .001 && !m.decks[1].nudge && /the two decks are in time/.test(s.data), 'mix: sync puts B back in time with A (nudged for ' + ne + ' s): ' + s.data.split('\n')[1]);
    // the crossfader to the band's side
    const xf = await page.evaluate(() => { const e = [...document.querySelectorAll('#mix .mxd > .mxs .mxst')][0].getBoundingClientRect(); return { x0: e.left, x1: e.right, y: e.top + e.height / 2 }; });
    await T.stroke(1, u => [xf.x0 + (xf.x1 - xf.x0) * (.5 - .5 * u), xf.y], 400); await sleep(200); m = await M(); ok(m.xf < .08, 'mix: the crossfader slides to the band: ' + m.xf.toFixed(2));
    await T.stroke(1, u => [xf.x0 + (xf.x1 - xf.x0) * (.5 * u), xf.y], 400); await sleep(200); m = await M(); ok(Math.abs(m.xf - .5) < .1, 'mix: and back to the middle: ' + m.xf.toFixed(2));
    // the pads: recording four hits into a loop of its own
    tb = await byText('#mix .mxt', 'pads'); await T.tap(tb.x, tb.y); await sleep(300); const rec = await byText('#mix .mxb', 'rec'); await T.tap(rec.x, rec.y); await sleep(200);
    for (const j of [0, 1, 4, 5]) { const p = await el('#mix .mxpad', j); await T.tap(p.x, p.y); await sleep(260); }
    m = await M(); ok(m.view === 'pads' && m.rec && m.pads[0] >= 3, 'mix: the pads, recorded into loop 1: ' + JSON.stringify(m.pads)); await shot('2b_mix_pads');
    await T.tap(rec.x, rec.y); await sleep(200);
    // the effects: a finger on the pad sweeps the filter and the echo; held, the stutter repeats the last beat
    tb = await byText('#mix .mxt', 'effects'); await T.tap(tb.x, tb.y); await sleep(300); const xy = await el('#mix .mxxy', 0);
    await T.down(1, xy.x - xy.w * .3, xy.y + xy.h * .3); for (let k = 1; k <= 10; k++) { await T.move(1, xy.x - xy.w * .3 + k * xy.w * .05, xy.y + xy.h * .3 - k * xy.h * .05); await sleep(30); }
    m = await M(); ok(m.fx && m.fx.y > .5, 'mix: a finger on the effects pad sweeps them: ' + JSON.stringify(m.fx)); await shot('2c_mix_fx'); pts.delete(1); await send('touchEnd'); await sleep(200); m = await M(); ok(!m.fx, 'mix: and lifting it lets them go');
    const st1 = await byText('#mix .mxb', '1 beat'); await T.down(2, st1.x, st1.y); await sleep(700); m = await M(); const held = m.stut; pts.delete(2); await send('touchEnd'); await sleep(300); m = await M();
    ok(held && !m.stut, 'mix: held, the stutter repeats; let go, the loops run on');
    // back out: whoever played in the band's grid plays on in the band
    await page.evaluate(() => window.__lc.go(0, true)); await sleep(800); s = await S(); m = await M();
    ok(!m.on && s.run && s.on[pj] === '1', 'mix: leaving the mixer, the band plays on with the ' + pname + ' in it: ' + s.on); }

  // the music: a note for the whole band and a circle for each player, in every world
  { console.log('MUSIC'); let m = await sw();
    ok(m.live && m.pressed === 'true' && !m.off, 'music: after touches the note is lit and the circles are not dimmed: ' + JSON.stringify(m));
    ok(m.lit === m.on.split('').filter(c => c === '1').length, 'music: a circle is lit for each player that is in: ' + JSON.stringify(m));
    const before = m.on; await page.evaluate(() => document.getElementById('d_8').click()); await sleep(200); m = await sw(); ok(m.on[8] !== before[8], 'music: a circle should bring its player in or out');
    await page.evaluate(() => document.getElementById('bSound').click()); await sleep(400); m = await sw(); ok(!m.live && m.pressed === 'false' && m.off, 'music: the note should turn the music off: ' + JSON.stringify(m));
    await page.evaluate(() => { const L = window.__lc; L.setPlayer(3, false); }); await page.evaluate(() => document.getElementById('d_3').click()); await sleep(700); m = await sw();
    ok(m.live && m.on[3] === '1' && m.pressed === 'true', 'music: with the music off, a circle should turn it on with that player in: ' + JSON.stringify(m)); await shot('3a_music_dots'); }

  s = await S(); console.log('sound: run=' + s.run + ' state=' + s.state + ' players=' + s.on + ' ql=' + s.ql);
  ok(s.run && s.state === 'running', 'the band should be running after touches');
  const clean = [...new Set(errs)]; if (clean.length) { console.log('ERRORS', clean.slice(0, 12)); }
  if (s.errs.length) console.log('PAGE ERRS', s.errs);
  await ctx.close(); await browser.close();
  const bad = fail.length + clean.length + s.errs.length; console.log(bad ? 'PLAY FAILED (' + bad + ')' : 'PLAY OK'); process.exit(bad ? 1 : 0);
})();
