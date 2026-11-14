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

  // the music button: a note at the top right, struck through while nothing can be heard
  const sw = () => page.evaluate(() => { const b = document.getElementById('bSound'), L = window.__lc, r = b.getBoundingClientRect(), sl = b.querySelector('.sl');
    return { pressed: b.getAttribute('aria-pressed'), struck: !!sl && getComputedStyle(sl).display !== 'none', live: L.soundLive(), on: L.ON.join(''), top: r.top < 60 && r.right > innerWidth - 60, inHead: !!b.closest('header'), circles: document.querySelectorAll('.dot,#dotrow,#dots').length, label: b.getAttribute('aria-label') }; });

  if (which.includes(0)) { console.log('SMOKE');
    await page.evaluate(() => window.__lc.go(0, true)); await sleep(900); s = await S(); ok(s.hint === 1, 'smoke: the hint should be running before any touch');
    let m = await sw(); ok(m.pressed === 'false' && m.struck && m.top && m.inHead && !m.circles, 'music: before any touch the music button, at the top right, is unlit and struck through, and there are no circles: ' + JSON.stringify(m));
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
    // (13 Nov, night: "the map hard to use": turning it, tapping satellites, cameras and the layers) three short lines; a row of names of
    // what is happening now that fly the Earth there; two zoom buttons; the layers in a list of their own, each said in plain words
    ok(/^drag to turn · tap a place or a name\nnow: (\d+ storms? · )?[\d,]+ fires · [\d,]+ flashes of lightning\nweather of \d+ \w+ \d\d:\d\d UTC$/.test(s.data), 'earth: three short lines: what to do, what is happening now, how fresh: ' + s.data.replace(/\n/g, ' | '));
    const row = await page.evaluate(() => [...document.querySelectorAll('#nowr .lb')].map(b => { const r = b.getBoundingClientRect(); return { id: b.id, t: b.textContent, h: r.height }; }));
    ok(row[0].id === 'lyB' && row[0].t === 'layers' && row[1].t === 'space station' && row.some(b => b.t === 'biggest fire') && row.some(b => b.t === 'lightning') && row.every(b => b.h >= 32), 'earth: under the globe the layers button, then the names of what is happening now: ' + row.map(b => b.t).join(', '));
    const tapEl = async sel => { const r = await page.evaluate(sel => { const e = document.querySelector(sel); e.scrollIntoView({ block: 'nearest', inline: 'center' }); const q = e.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; }, sel); await sleep(150); await T.tap(r.x, r.y); await sleep(250); };
    await tapEl('#lyB'); s = await S();
    const lys = await page.evaluate(() => { const e = document.getElementById('lys'), r = e.getBoundingClientRect(), f = document.getElementById('foot').getBoundingClientRect(); return { open: !e.hidden, bottom: r.bottom, foot: f.top,
      rows: [...e.querySelectorAll('.ly')].filter(b => !b.hidden).map(b => b.id + '=' + b.getAttribute('aria-pressed') + ':' + b.querySelector('.lyo').textContent + ':' + b.querySelector('.lyd').textContent) }; });
    ok(s.dbg.lys && lys.open && lys.bottom <= lys.foot + 1 && lys.rows.length === 3 && /^l_sats=true:on:every satellite, where it is now · [\d,]+ of them/.test(lys.rows[0]) && /^l_wind=true:on:the wind near the ground/.test(lys.rows[1]) && /^l_sun=true:on:day and night/.test(lys.rows[2]),
      'earth: "layers" opens the list, above the bottom row: each layer there is data for, said in plain words, on or off: ' + lys.rows.join(' | '));
    await shot('1a1_earth_layers');
    await tapEl('#l_wind'); s = await S(); ok(s.dbg.LY.wind === 0 && await page.evaluate(() => document.querySelector('#l_wind .lyo').textContent) === 'off', 'earth: the wind layer can be put away with a tap');
    await shot('1a2_earth_nowind'); await tapEl('#l_wind'); await tapEl('#lyX'); s = await S(); ok(!s.dbg.lys && s.dbg.LY.wind === 1, 'earth: and back; "done" puts the list away');
    // a name flies the Earth to it, comes close and reads it
    const bf = row.findIndex(b => b.t === 'biggest fire'); await tapEl('#' + row[bf].id); await sleep(1800); s = await S();
    ok(s.hint === 0 && s.dbg.probe && s.dbg.probe.r.fire && Math.abs(s.dbg.zoom - 2.6) < .05 && /^fire · [\d,]+ MW · seen by /m.test(s.data), 'earth: "biggest fire" turns the Earth to the fire, comes close and reads it: ' + s.data.replace(/\n/g, ' | '));
    await shot('1a3_earth_name');
    // the zoom buttons
    const z1 = s.dbg.zoom; await tapEl('#zOut'); s = await S(); const z2 = s.dbg.zoom; await tapEl('#zIn'); s = await S();
    ok(z2 < z1 / 1.3 && Math.abs(s.dbg.zoom - z1) < .02, 'earth: − goes further out, + comes closer: ' + [z1, z2, s.dbg.zoom].map(z => z.toFixed(2)).join(' → '));
    await T.tap(X(.03), Y(.02)); await sleep(300);
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
    const rl = s.data.split('\n'); ok(rl.length === 3 || (rl.length === 4 && /^(\d[\d,]* km from )?[^·\d][^·]*, [^·]+$/.test(rl[0])), 'earth: the reading is three lines, after the name of the nearest town if there is one: ' + rl[0]); await shot('1b_earth_place'); console.log('  ', s.data.replace(/\n/g, ' | '));
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
    await page.evaluate(() => { const L = window.__lc; L.BD.auto = false; [2, 3, 7].forEach(i => L.setPlayer(i, false, true)); L.setPlayer(5, true, true); });
    await page.evaluate(() => window.__lc.go(2, true)); await sleep(1200); s = await S();
    const M = () => page.evaluate(() => window.__lc.MIX.dbg());
    const el = (sel, i) => page.evaluate(a => { const e = [...document.querySelectorAll(a[0])].filter(x => x.offsetParent)[a[1] || 0]; if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, t: e.textContent }; }, [sel, i]);
    const byText = (sel, t) => page.evaluate(a => { const e = [...document.querySelectorAll(a[0])].filter(x => x.offsetParent && x.textContent === a[1])[0]; if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; }, [sel, t]);
    const waitFor = async (f, n = 30) => { let m; for (let k = 0; k < n; k++) { m = await M(); if (f(m)) return m; await sleep(400); } return m; };
    // (13 Nov, night: "impossible to make good sounds with those noises" ... "Real loops, big buttons") the band's nine, then ten
    // recorded instruments (VCSL, CC0) as a list, each with two loops written to the band's beat and chords, big buttons, one stop
    let m = await M();
    const ui = await page.evaluate(() => ({ band: [...document.querySelectorAll('#mix .mxband .mxb')].map(b => b.textContent),
      rows: [...document.querySelectorAll('#mix .mxrow')].map(r => r.querySelector('.mxn').textContent + ':' + [...r.querySelectorAll('.mxb')].map(b => b.textContent).join('/')),
      secs: [...document.querySelectorAll('#mix .mxsec')].map(e => e.textContent).join(), stop: [...document.querySelectorAll('#mix .mxstop')].map(b => b.textContent).join(),
      small: [...document.querySelectorAll('#mix .mxb')].filter(b => b.getBoundingClientRect().height < 40).length,
      old: !!document.querySelector('#mix .mxg,#mix .mxt,#mix .mxc,#mix .mxd,#mix .mxf,#mix .mxxy,#mix .mxpad,#mix .mxs') }));
    ok(m.on && m.mixon && ui.band.length === 9 && ui.rows.length === 10 && ui.rows.every(r => r.split('/').length === 2) && m.loops === 20 && ui.secs === 'the band,play along' && ui.stop === 'jam: a new mix,stop the instruments' && !ui.small && !ui.old,
      'mix: a list: a jam, the band\'s nine, then ten instruments with two loops each, big buttons, one stop, no grid: ' + JSON.stringify(ui));
    ok(ui.rows.map(r => r.split(':')[0]).join() === 'congas,bongos,shaker,cajon,claps,marimba,xylophone,vibes,piano,glock', 'mix: the instruments: ' + ui.rows.join(' · '));
    ok(m.tracks.filter(t => t.k === 'stem').every((t, i) => (t.play >= 0) === (s.on[i] === '1')), 'mix: it takes the band over where it was: ' + s.on);
    const top = await page.evaluate(() => ({ mix: document.getElementById('mix').getBoundingClientRect().top, data: document.getElementById('data').getBoundingClientRect().bottom, foot: document.getElementById('foot').getBoundingClientRect().top, mixB: document.getElementById('mix').getBoundingClientRect().bottom }));
    ok(top.mix >= top.data && top.mixB <= top.foot + 1, 'mix: the list sits between the words at the top and the worlds: ' + JSON.stringify(top));
    const tapB = async (sel, i) => { const r = await page.evaluate(a => { const e = [...document.querySelectorAll(a[0])][a[1] || 0]; e.scrollIntoView({ block: 'center' }); const q = e.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; }, [sel, i]); await sleep(120); await T.tap(r.x, r.y); await sleep(150); };
    // one of the band not playing: in on the next bar
    const pj = m.tracks.findIndex(t => t.k === 'stem' && t.play < 0 && t.next === -1 && t.n !== 'bass'); const pname = m.tracks[pj].n;
    await tapB('#mix .mxband .mxb', pj); m = await M();
    ok(m.tracks[pj].play === 0 || m.tracks[pj].next === 0, 'mix: a tap on one of the band starts it, or sets it waiting for the bar: ' + pname + ' ' + JSON.stringify(m.tracks[pj]));
    m = await waitFor(m => m.tracks[pj].play === 0); ok(m.tracks[pj].play === 0 && m.ctx === 'running', 'mix: ' + pname + ' comes in on the bar');
    // an instrument's loop: the congas' first, the marimba's second; in on the bar once their recordings are in
    await tapB('#mix .mxrow .mxb', 0); await tapB('#mix .mxrow .mxb', 2 * 5 + 1);
    m = await waitFor(m => m.tracks[9].play === 0 && m.tracks[14].play === 1);
    ok(m.tracks[9].play === 0 && m.tracks[14].play === 1 && m.banks.includes('drums') && m.banks.includes('marimba'), 'mix: the instruments\' loops come in on the bar, their recorded sounds loaded: ' + m.banks.join());
    await sleep(300); const lit = await page.evaluate(() => [...document.querySelectorAll('#mix .mxb.on')].map(b => b.getAttribute('aria-label')));
    ok(lit.some(t => /^congas: /.test(t)) && lit.some(t => /^marimba: /.test(t)), 'mix: what plays is lit: ' + lit.join(', '));
    s = await S(); ok(/^tap a loop: in on the next bar, in tune\nplaying: the band \(\d\), congas, marimba\nit keeps playing in Smoke and Earth$/.test(s.data), 'mix: the readout says what to do, what plays, and that it plays on: ' + s.data.replace(/\n/g, ' | '));
    await shot('2a_mix_list');
    // the other loop of the same instrument takes over on the bar; tapping what plays stops it on the bar
    await tapB('#mix .mxrow .mxb', 1); m = await waitFor(m => m.tracks[9].play === 1); ok(m.tracks[9].play === 1, 'mix: the congas\' other loop takes over on the bar');
    await tapB('#mix .mxrow .mxb', 2 * 5 + 1); m = await waitFor(m => m.tracks[14].play < 0); ok(m.tracks[14].play < 0, 'mix: a tap on a loop that plays stops it');
    // stop the instruments: all of them, the band left playing
    await tapB('#mix .mxrow .mxb', 2 * 7); m = await waitFor(m => m.tracks[16].play === 0);
    await tapB('#mix .mxstop', 1); m = await waitFor(m => m.tracks.filter(t => t.k === 'row').every(t => t.play < 0));
    ok(m.tracks.filter(t => t.k === 'row').every(t => t.play < 0) && m.tracks[pj].play === 0, 'mix: "stop the instruments" stops them all and leaves the band playing');
    // a jam: one tap, a new set of instruments on the next bar, a drum among them; another tap, another
    await tapB('#mix .mxjam'); m = await waitFor(m => m.tracks.filter(t => t.k === 'row' && t.play >= 0).length >= 2 && m.tracks.every(t => t.next === -1));
    const j1 = m.tracks.filter(t => t.k === 'row' && t.play >= 0).map(t => t.n + ':' + t.play);
    ok(j1.length >= 2 && j1.some(x => /^(congas|bongos|cajon):/.test(x)) && j1.some(x => /^(marimba|xylophone|vibes|piano|glock):/.test(x)), 'mix: "jam" brings in a new set of instruments on the bar, a drum and a tuned one among them: ' + j1.join(', '));
    await tapB('#mix .mxjam'); m = await waitFor(m => m.tracks.every(t => t.next === -1));
    const j2 = m.tracks.filter(t => t.k === 'row' && t.play >= 0).map(t => t.n + ':' + t.play); ok(j2.length >= 2 && j2.join() !== j1.join(), 'mix: and another tap, another: ' + j2.join(', '));
    await shot('2c_mix_jam'); await tapB('#mix .mxstop', 1); m = await waitFor(m => m.tracks.filter(t => t.k === 'row').every(t => t.play < 0));
    // two to play on in the other worlds
    await tapB('#mix .mxrow .mxb', 2 * 1); await tapB('#mix .mxrow .mxb', 2 * 8 + 1); m = await waitFor(m => m.tracks[10].play === 0 && m.tracks[17].play === 1);
    await shot('2b_mix_two');
    const was = m.tracks.map(t => t.play).join();
    await page.evaluate(() => window.__lc.go(0, true)); await sleep(2600); s = await S(); m = await M();
    ok(!m.on && m.mixon && m.ctx === 'running' && m.tracks.map(t => t.play).join() === was && m.tracks.filter(t => t.k === 'stem').every((t, i) => (t.play >= 0) === (s.on[i] === '1')), 'mix: in Smoke the loops set in the mixer play on: ' + was);
    await page.evaluate(() => window.__lc.go(1, true)); await sleep(1500); m = await M(); ok(m.tracks.map(t => t.play).join() === was && m.beat > 0, 'mix: and on the Earth');
    await page.evaluate(() => window.__lc.go(2, true)); await sleep(800);
    const lit2 = await page.evaluate(() => document.querySelectorAll('#mix .mxb.on').length), nplay = m.tracks.filter(t => t.play >= 0).length;
    ok(lit2 === nplay, 'mix: back in the mixer, the list shows what has been playing: ' + lit2 + ' lit of ' + nplay);
    await page.evaluate(() => window.__lc.go(0, true)); await sleep(500); }

  // the music: one small button, in every world; it pauses what plays and brings it back
  { console.log('MUSIC'); let m = await sw(); const M = () => page.evaluate(() => window.__lc.MIX.dbg());
    ok(m.live && m.pressed === 'true' && !m.struck && m.top && !m.circles, 'music: after touches the note at the top is lit: ' + JSON.stringify(m));
    const mx0 = await M(), was = mx0.tracks.map(t => t.play).join();
    await page.evaluate(() => document.getElementById('bSound').click()); await sleep(700); m = await sw(); ok(!m.live && m.pressed === 'false' && m.struck, 'music: the note turns the music off: ' + JSON.stringify(m));
    await shot('3a_music_off');
    await page.evaluate(() => document.getElementById('bSound').click()); await sleep(1200); m = await sw(); const mx1 = await M();
    ok(m.live && m.pressed === 'true' && (!mx0.mixon || (mx1.tracks.map(t => t.play).join() === was && mx1.ctx === 'running')), 'music: and on again, with the same loops: ' + JSON.stringify(m)); }

  s = await S(); console.log('sound: run=' + s.run + ' state=' + s.state + ' players=' + s.on + ' ql=' + s.ql);
  ok((s.run || await page.evaluate(() => window.__lc.MIXON)) && s.state === 'running', 'the music should be running after touches');
  const clean = [...new Set(errs)]; if (clean.length) { console.log('ERRORS', clean.slice(0, 12)); }
  if (s.errs.length) console.log('PAGE ERRS', s.errs);
  await ctx.close(); await browser.close();
  const bad = fail.length + clean.length + s.errs.length; console.log(bad ? 'PLAY FAILED (' + bad + ')' : 'PLAY OK'); process.exit(bad ? 1 : 0);
})();
