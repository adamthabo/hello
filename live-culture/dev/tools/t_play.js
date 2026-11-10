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

  if (which.includes(1)) { console.log('WIND');
    await page.evaluate(() => window.__lc.go(1, true)); await sleep(5600); s = await S();
    ok(s.dbg.ready, 'wind: the pictures of the Earth should have loaded'); ok(s.dbg.wind && s.dbg.aurora && s.dbg.strikes > 20, 'wind: the wind, the aurora and the lightning should be there: ' + JSON.stringify([s.dbg.wind, s.dbg.aurora, s.dbg.strikes]));
    ok(s.dbg.fires > 4 && s.dbg.fireGL === s.dbg.fires, 'wind: the fires should be there and feeding the smoke: ' + s.dbg.fires + ', ' + s.dbg.fireGL);
    const lyr = await page.evaluate(() => [...document.querySelectorAll('#lyr .lb')].filter(b => !b.hidden).map(b => b.id + '=' + b.getAttribute('aria-pressed')).join());
    ok(s.dbg.lyr && lyr === 'l_wind=true,l_sun=true', 'wind: the layers there are data for can be switched (here: the wind and the Sun): ' + lyr);
    await page.evaluate(() => document.getElementById('l_wind').click()); await sleep(600); s = await S(); ok(s.dbg.LY.wind === 0, 'wind: the wind layer can be put away');
    await shot('1a2_wind_nowind'); await page.evaluate(() => document.getElementById('l_wind').click()); await sleep(300);
    ok(s.dbg.ok, 'wind: the smoke should be running'); ok(/fires seen from orbit/.test(s.data), 'wind: the readout should count the fires: ' + s.data.replace(/\n/g, ' | ')); await shot('1a_wind_home');
    await page.evaluate(() => window.__lc.WIND.look(15, -40, 1)); await sleep(300); s = await S();
    const R = s.dbg.R, cx = s.dbg.cx, cy = s.dbg.cy, l0 = s.dbg.lon0;
    // one finger turns the globe, and leaves nothing behind
    await T.stroke(1, u => [cx + R * .5 - R * 1.0 * u, cy + R * .1], 600); s = await S();
    ok(Math.abs(s.dbg.lon0 - l0) > 15 && s.dbg.turned === 1, 'wind: one finger should turn the globe, moved ' + (s.dbg.lon0 - l0).toFixed(1)); ok(s.want, 'wind: a touch should ask for the music');
    // a tap on a place reads it
    await page.evaluate(() => window.__lc.WIND.look(15, -40, 1)); await sleep(300);
    await T.tap(cx - R * .2, cy + R * .15); await sleep(500); s = await S();
    ok(s.dbg.probe && s.dbg.probe.r && s.dbg.probe.r.wind && /wind \d+ km\/h from [a-z\-]+/.test(s.data) && /by the Sun/.test(s.data), 'wind: a tap should read the place: ' + s.data.replace(/\n/g, ' | '));
    ok(s.data.split('\n').length === 3, 'wind: the reading is three lines'); await shot('1b_wind_place'); console.log('  ', s.data.replace(/\n/g, ' | '));
    await T.tap(X(.03), Y(.02)); await sleep(300); s = await S(); ok(!s.dbg.probe, 'wind: a tap on the dark should put the reading away');
    // a tap on a fire reads the fire
    await page.evaluate(() => { const L = window.__lc, f = L.LIVE.fires.list[0]; L.WIND.look(f.lat, f.lon, 1.6); }); await sleep(1200); s = await S();
    const f0 = s.dbg.fireAt.find(f => Math.hypot(f.x - s.dbg.cx, f.y - s.dbg.cy) < s.dbg.R * .5) || s.dbg.fireAt[0];
    if (f0) { await T.tap(f0.x, f0.y); await sleep(500); s = await S(); ok(s.dbg.probe && s.dbg.probe.r.fire && /^fire · [\d,]+ MW · seen by /m.test(s.data), 'wind: a tap on a fire should read the fire: ' + s.data.replace(/\n/g, ' | ')); await shot('1c_wind_fire'); console.log('  ', s.data.replace(/\n/g, ' | ')); }
    else ok(false, 'wind: no fire in view to tap');
    // a tap on a storm reads the storm (when one is turning)
    const st = await page.evaluate(() => { const L = window.__lc, S = L.LIVE.storms && L.LIVE.storms.list[0]; if (S) L.WIND.look(S.lat, S.lon, 1.2); return S || null; });
    if (st) { await sleep(1200); s = await S(); const sp = s.dbg.storms.find(k => k.name === st.name); await T.tap(sp.x, sp.y); await sleep(500); s = await S();
      ok(s.dbg.probe && s.dbg.probe.r.storm && s.data.indexOf(st.name) >= 0, 'wind: a tap on a storm should read the storm: ' + s.data.replace(/\n/g, ' | ')); await shot('1d_wind_storm'); console.log('  ', s.data.replace(/\n/g, ' | ')); }
    else console.log('   (no tropical storm today)');
    // two fingers spreading: closer
    s = await S(); const z0 = s.dbg.zoom, c2 = s.dbg.cx, c3 = s.dbg.cy; await T.down(1, c2 + 40, c3); await T.down(2, c2 - 40, c3); for (let k = 1; k <= 14; k++) { pts.set(1, { x: c2 + 40 + k * 5, y: c3 }); pts.set(2, { x: c2 - 40 - k * 5, y: c3 }); await send('touchMove'); await sleep(18); } pts.clear(); await send('touchEnd');
    s = await S(); ok(s.dbg.zoom > z0 * 1.2, 'wind: spreading two fingers should come closer, zoom=' + s.dbg.zoom.toFixed(2)); await shot('1e_wind_close');
    await page.evaluate(() => window.__lc.WIND.look(10, -80, 1));
    let fl = 0; for (let k = 0; k < 14; k++) { await sleep(250); fl = Math.max(fl, (await S()).dbg.flashes); } ok(fl > 0, 'wind: the lightning should be flashing, most at once ' + fl);
    await page.evaluate(() => window.__lc.WIND.look(68, -40, 1.4)); await sleep(1500); await shot('1f_wind_aurora'); }

  if (which.includes(2)) { console.log('ORBIT');
    await page.evaluate(() => window.__lc.go(2, true)); await sleep(5600); s = await S();
    ok(s.dbg.n > 10000, 'orbit: the satellites should be there, ' + s.dbg.n); ok(s.dbg.live && s.dbg.want === 1 && Math.abs(s.dbg.off) < 1000, 'orbit: left alone, it is the present, second for second (x' + s.dbg.spd.toFixed(1) + ')'); await shot('2a_orbit_home');
    const l0 = s.dbg.lon0; await T.stroke(1, u => [X(.7 - .4 * u), Y(.5)], 500); s = await S(); ok(Math.abs(s.dbg.lon0 - l0) > 15, 'orbit: one finger should turn the Earth, moved ' + (s.dbg.lon0 - l0).toFixed(1));
    // two fingers turning: time is wound
    const cx = X(.5), cy = Y(.55), rr = 90, o0 = s.dbg.off; await T.down(1, cx + rr, cy); await T.down(2, cx - rr, cy);
    for (let k = 1; k <= 30; k++) { const a = -k * .05; pts.set(1, { x: cx + rr * Math.cos(a), y: cy + rr * Math.sin(a) }); pts.set(2, { x: cx - rr * Math.cos(a), y: cy - rr * Math.sin(a) }); await send('touchMove'); await sleep(20); }
    s = await S(); ok(s.dbg.off - o0 > 15 * 60000, 'orbit: an anticlockwise turn should wind time forward, by ' + ((s.dbg.off - o0) / 60000).toFixed(0) + ' min'); await shot('2b_orbit_wound');
    // a pinch: travel out
    const z0 = s.dbg.zoom; for (let k = 1; k <= 16; k++) { const r2 = rr - k * 4; pts.set(1, { x: cx + r2 * Math.cos(-1.5), y: cy + r2 * Math.sin(-1.5) }); pts.set(2, { x: cx - r2 * Math.cos(-1.5), y: cy - r2 * Math.sin(-1.5) }); await send('touchMove'); await sleep(20); }
    pts.clear(); await send('touchEnd'); s = await S(); ok(s.dbg.zoom < z0 * .7, 'orbit: pinching should travel out, zoom=' + s.dbg.zoom.toFixed(2)); await sleep(600); await shot('2c_orbit_far');
    const chip = await page.evaluate(() => { const b = document.getElementById('bNow'); const t = b.hidden ? null : b.textContent; if (t) b.click(); return t; }); ok(chip === 'Now', 'orbit: the Now button should show while time runs fast, it shows ' + chip); await sleep(3000);
    s = await S(); ok(s.dbg.live && Math.abs(s.dbg.off) < 1, 'orbit: Now should return to the present, off=' + s.dbg.off); ok(/now/.test(s.data), 'orbit: and say so: ' + s.data.split('\n')[1]);
    // a tap on a satellite brings up what is on record about it
    await page.evaluate(() => window.__lc.ORBIT.look(20, -60, 1)); await sleep(500); s = await S(); const v = s.dbg.vis[2] || s.dbg.vis[0];
    await T.tap(v[0], v[1]); await sleep(400); s = await S(); ok(s.dbg.sel >= 0 && s.dbg.card && /ORBIT/i.test(s.dbg.card) && /NOW OVER/i.test(s.dbg.card), 'orbit: tapping a satellite should bring up its card: ' + String(s.dbg.card).replace(/\n+/g, ' | '));
    for (let k = 0; k < 24 && !s.dbg.cat; k++) { await sleep(250); s = await S(); } await sleep(700); s = await S();
    ok(s.dbg.cat && /CATALOGUE/i.test(s.dbg.card) && /LAUNCHED/i.test(s.dbg.card) && /km up/.test(s.dbg.card) && /MEASURED/i.test(s.dbg.card), 'orbit: the card should fill from the catalogue: ' + String(s.dbg.card).replace(/\n+/g, ' | '));
    await shot('2d_orbit_card'); console.log('  ', String(s.dbg.card).replace(/\n+/g, ' | '));
    await page.evaluate(() => window.__lc.ORBIT.pick('ISS (ZARYA)')); await sleep(900); s = await S();
    ok(/1998-067A/.test(s.dbg.card) && /Baikonur/.test(s.dbg.card) && /20 Nov 1998/.test(s.dbg.card) && /51\.6°/.test(s.dbg.card), 'orbit: the space station\'s card should hold its record: ' + String(s.dbg.card).replace(/\n+/g, ' | '));
    const age = /MEASURED\s*orbit of [^·]+ · (\d+) (min|h|days) ago/i.exec(s.dbg.card); ok(age && (age[2] !== 'days') , 'orbit: the space station\'s orbit should have been measured within two days: ' + (age && age[0]));
    await shot('2e_orbit_iss'); console.log('  ', String(s.dbg.card).replace(/\n+/g, ' | '));
    const box = await page.evaluate(() => { const c = document.getElementById('card').getBoundingClientRect(), f = document.getElementById('foot').getBoundingClientRect(), d = document.getElementById('data').getBoundingClientRect(); return { top: c.top, bottom: c.bottom, left: c.left, right: c.right, foot: f.top, data: d.bottom, vw: innerWidth }; });
    ok(box.bottom <= box.foot + 1 && box.top >= box.data - 1 && box.left >= 8 && box.right <= box.vw - 8, 'orbit: the card should sit between the readout and the bottom row: ' + JSON.stringify(box));
    const chip2 = await page.evaluate(() => { const b = document.getElementById('bNow'); const t = b.textContent; b.click(); return t; }); await sleep(2500); s = await S(); ok(chip2 === '×60' && s.dbg.spd > 30, 'orbit: the same button should set time running again; it read ' + chip2 + ', time now x' + s.dbg.spd.toFixed(0));
    await page.evaluate(() => window.__lc.go(0, true)); await sleep(300); ok(await page.evaluate(() => document.getElementById('card').hidden), 'orbit: the card should leave with its world'); }

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
