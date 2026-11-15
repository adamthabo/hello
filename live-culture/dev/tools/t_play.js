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
    // (14 Nov, night: "On the earth there should be videos, that's the best part!!! And be able to take on and off layers. The weather is
    // pretty lame.") Four short lines (what to do; what is happening now; the wind and its hour; the cameras), each one line of the phone;
    // the globe whole under them; under the globe its scale and the row of layers, each a button lit while it shows; the cameras on the
    // Earth as pictures
    ok(/^drag to turn · tap a video or a place\n(\d+ storms? · )?[\d,]+ fires · [\d,]+ lightning flashes\nwind (now|of \d+ \w+ \d\d:\d\d UTC)( · aurora \w+)?\n\d+ cameras · tap one for YouTube$/.test(s.data), 'earth: four short lines: what to do, what is happening now, the wind and its hour, the cameras: ' + s.data.replace(/\n/g, ' | '));
    const dock = await page.evaluate(() => [...document.querySelectorAll('#lyd .dk')].map(b => { const r = b.getBoundingClientRect(); return { id: b.id, t: b.textContent, on: b.getAttribute('aria-pressed') === 'true', h: r.height }; }));
    // (a layer with nothing to show has no button: storms when none is turning)
    ok(dock.map(b => b.id).join() === 'ly_vid,ly_wind,ly_bolt,' + (s.dbg.storms.length ? 'ly_storm,' : '') + 'ly_fire,ly_orbit,ly_aur' && dock.every(b => b.on && b.h >= 40) && dock[0].t === 'videos', 'earth: a row of layers, each named and lit while it shows (here, with the snapshot: videos, wind, lightning, storms if any, fires, satellites, aurora): ' + dock.map(b => b.t + (b.on ? '+' : '-')).join(', '));
    ok(s.dbg.lgd === 'wind' && await page.evaluate(() => /linear-gradient/.test(document.getElementById('lgb').style.background) && document.getElementById('lgs').childNodes.length === 5), 'earth: the wind\'s speed in colour, its scale over the row');
    const whole = () => page.evaluate(() => { const d = window.__lc.WIND.dbg(), e = document.getElementById('data'), t = e.getBoundingClientRect(), r = document.getElementById('lgd').hidden ? document.getElementById('lyd').getBoundingClientRect() : document.getElementById('lgd').getBoundingClientRect();
      return { top: Math.round(d.cy - d.R), bottom: Math.round(d.cy + d.R), left: Math.round(d.cx - d.R), right: Math.round(d.cx + d.R), words: Math.round(t.bottom), lines: Math.round(t.height / parseFloat(getComputedStyle(e).lineHeight)), row: Math.round(r.top), w: innerWidth, text: e.textContent.replace(/\n/g, ' | ') }; });
    let gw = await whole();
    // (the hints' ghost finger may have tapped a place by now: its reading is not measured, and may be a line longer)
    ok((/^drag to turn/.test(gw.text) ? gw.lines === 4 && gw.top >= gw.words : gw.top >= gw.words - 20) && gw.bottom <= gw.row && gw.left >= 0 && gw.right <= gw.w, 'earth: the whole globe shows, under the lines of words (each one line of the phone) and above the scale and the row: ' + JSON.stringify(gw));
    const tapEl = async sel => { const r = await page.evaluate(sel => { const e = document.querySelector(sel); e.scrollIntoView({ block: 'nearest', inline: 'center' }); const q = e.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; }, sel); await sleep(150); await T.tap(r.x, r.y); await sleep(250); };
    // a layer switched off: its button goes dark, the words say so and stop counting it, and nothing of it is drawn or read
    await tapEl('#ly_fire'); s = await S();
    ok(s.dbg.LY.fire === 0 && !(await page.evaluate(() => document.getElementById('ly_fire').getAttribute('aria-pressed') === 'true')) && /\nfires off\n/.test(s.data) && !/fires ·/.test(s.data), 'earth: "fires" off: dark, said, no longer counted: ' + s.data.replace(/\n/g, ' | '));
    // and on again: the Earth turns to the biggest fire, comes close and reads it
    await tapEl('#ly_fire'); await sleep(1800); s = await S();
    ok(s.dbg.LY.fire === 1 && s.hint === 0 && s.dbg.probe && s.dbg.probe.r.fire && Math.abs(s.dbg.zoom - 2.6) < .05 && /^fire · [\d,]+ MW · seen by /m.test(s.data), 'earth: "fires" on again turns the Earth to the biggest fire, comes close and reads it: ' + s.data.replace(/\n/g, ' | '));
    await shot('1a3_earth_name');
    // the zoom buttons
    const z1 = s.dbg.zoom; await tapEl('#zOut'); s = await S(); const z2 = s.dbg.zoom; await tapEl('#zIn'); s = await S();
    ok(z2 < z1 / 1.3 && Math.abs(s.dbg.zoom - z1) < .02, 'earth: − goes further out, + comes closer: ' + [z1, z2, s.dbg.zoom].map(z => z.toFixed(2)).join(' → '));
    await T.tap(X(.03), Y(.02)); await sleep(300);
    ok(s.dbg.ok, 'earth: the smoke should be running'); await shot('1a_earth_home');
    // the cameras: pictures on the Earth; in the artifact a tap opens a card whose button opens the stream on YouTube
    await page.evaluate(() => window.__lc.WIND.look(30, -80, 1)); await sleep(900);
    let cam = await page.evaluate(() => window.__lc.LIVEW.dbg());
    // (15 Nov: "Change their icons on the globe": a lens of thin light on a stem, the sign of its kind drawn in it)
    ok(cam.on && cam.cams > 80 && cam.tiles.length >= 6 && cam.tiles.every(t => t.r >= 9 && t.w === 2 * t.r && /^(wild|fire|space|city|sea|sky|land|move)$/.test(t.t)), 'earth: the cameras are lenses on the Earth, each with its kind\'s sign: ' + cam.tiles.length + ' shown (' + [...new Set(cam.tiles.map(t => t.t))].join(' ') + '), ' + cam.rings + ' as rings');
    const tl = cam.tiles[0]; for (let k = 0; k < 3; k++) { await T.tap(tl.x + tl.w / 2, tl.y + tl.h / 2); await sleep(600); cam = await page.evaluate(() => window.__lc.LIVEW.dbg()); if (cam.card) break; }
    const cardA = await page.evaluate(() => { const c = document.getElementById('card'), a = c.querySelector('a.cy'); return { shown: !c.hidden, text: c.innerText.replace(/\n+/g, ' | '), href: a ? a.href : '', tgt: a ? a.target : '' }; });
    ok(cam.card === tl.id && cardA.shown && /^https:\/\/www\.(youtube\.com|star\.nesdis\.noaa\.gov)\//.test(cardA.href) && cardA.tgt === '_blank' && /watch it live on youtube|see it on noaa/i.test(cardA.text), 'earth: a camera tapped opens its card, with its stream on YouTube: ' + cardA.text.slice(0, 120) + ' -> ' + cardA.href.slice(0, 70));
    await shot('1a4_earth_camera');
    for (let k = 0; k < 3; k++) { await T.tap(X(.03), Y(.02)); await sleep(400); if (!(await page.evaluate(() => window.__lc.LIVEW.dbg().card))) break; }
    // (the tap may land near a satellite, whose card then opens in its place)
    ok(await page.evaluate(() => { const c = document.getElementById('card'); return (c.hidden || c.dataset.k !== 'cam') && !window.__lc.LIVEW.dbg().card; }), 'earth: a tap off the camera puts its card away: ' + JSON.stringify(await page.evaluate(() => ({ card: window.__lc.LIVEW.dbg().card, hidden: document.getElementById('card').hidden, k: document.getElementById('card').dataset.k, txt: document.getElementById('card').innerText.slice(0, 60), probe: window.__lc.WIND.dbg().probe }))));
    // the videos off: no pictures; on again: the Earth turns to one
    await tapEl('#ly_vid'); cam = await page.evaluate(() => window.__lc.LIVEW.dbg()); s = await S(); ok(!cam.on && s.dbg.LY.vid === 0, 'earth: "videos" off takes the cameras away');
    await tapEl('#ly_vid'); await sleep(1400); cam = await page.evaluate(() => window.__lc.LIVEW.dbg()); ok(cam.on && cam.tiles.length > 0 && !!cam.card && cam.link, 'earth: "videos" on brings them back and opens one at once (15 Nov: "put the videos accessible right on the page"): ' + cam.tiles.length + ' ' + cam.card);
    for (let k = 0; k < 3; k++) { await T.tap(X(.03), Y(.02)); await sleep(400); if (!(await page.evaluate(() => window.__lc.LIVEW.dbg().card))) break; }
    await page.evaluate(() => window.__lc.WIND.look(15, -40, 1)); await sleep(300); s = await S();
    const R = s.dbg.R, cx = s.dbg.cx, cy = s.dbg.cy, l0 = s.dbg.lon0;
    // one finger turns the globe, and leaves nothing behind
    await T.stroke(1, u => [cx + R * .5 - R * 1.0 * u, cy + R * .1], 600); s = await S();
    ok(Math.abs(s.dbg.lon0 - l0) > 15 && s.dbg.turned === 1, 'earth: one finger should turn the globe, moved ' + (s.dbg.lon0 - l0).toFixed(1)); ok(s.want, 'earth: a touch should ask for the music');
    // a tap on a place reads it (the cameras and the satellites put away while places, fires and storms are tapped: a tap on a camera's
    // picture opens it, and one near a satellite that can be picked picks it)
    await page.evaluate(() => { window.__lc.WIND.layer('vid', 0); window.__lc.WIND.layer('orbit', 0); window.__lc.WIND.look(15, -40, 1); }); await sleep(400);
    // (a tap is a touch lifted within 600 ms of the frames' clock; a frame of this browser can take a good part of that, so up to four tries;
    // and over the globe a tap can land on one of the satellites that can be picked there, the stations and the notable ones: then another place)
    const tp = [[-.2, .15], [.25, -.1], [-.3, -.3], [.1, .35]];
    for (let k = 0; k < 4; k++) { await T.tap(cx + R * tp[k][0], cy + R * tp[k][1]); await sleep(500); s = await S(); if (s.dbg.probe) break; }
    ok(s.dbg.probe && s.dbg.probe.r && s.dbg.probe.r.wind && /wind \d+ km\/h from [a-z\-]+/.test(s.data) && /by the Sun/.test(s.data), 'earth: a tap should read the place: ' + s.data.replace(/\n/g, ' | '));
    await sleep(900); gw = await whole(); ok(gw.top >= gw.words - 1 && gw.bottom <= gw.row, 'earth: with the longer words of a place read, the globe has moved to stay whole under them: ' + JSON.stringify(gw));
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
    // (the satellites back; the cameras stay away until the satellites have been tapped, their pictures could cover one)
    await page.evaluate(() => window.__lc.WIND.layer('orbit', 1));
    // two fingers spreading: closer (from the whole Earth: a storm tapped has just brought it close)
    await page.evaluate(() => window.__lc.WIND.look(15, -40, 1)); await sleep(400);
    s = await S(); const z0 = s.dbg.zoom, c2 = s.dbg.cx, c3 = s.dbg.cy; await T.down(1, c2 + 40, c3); await T.down(2, c2 - 40, c3); for (let k = 1; k <= 14; k++) { pts.set(1, { x: c2 + 40 + k * 5, y: c3 }); pts.set(2, { x: c2 - 40 - k * 5, y: c3 }); await send('touchMove'); await sleep(18); } pts.clear(); await send('touchEnd');
    s = await S(); ok(s.dbg.zoom > z0 * 1.2, 'earth: spreading two fingers should come closer, zoom=' + s.dbg.zoom.toFixed(2)); await shot('1e_earth_close');
    await page.evaluate(() => window.__lc.WIND.look(10, -80, 1));
    let fl = 0; for (let k = 0; k < 14; k++) { await sleep(250); fl = Math.max(fl, (await S()).dbg.flashes); } ok(fl > 0, 'earth: the lightning should be flashing, most at once ' + fl);
    await page.evaluate(() => window.__lc.WIND.look(68, -40, 1.4)); await sleep(1500); await shot('1f_earth_aurora');
    // the satellites: a layer of the Earth, on, every one where it is this second
    let o = await page.evaluate(() => window.__lc.ORBIT.dbg()); s = await S();
    ok(o.n > 10000 && s.dbg.LY.orbit === 1, 'earth: the satellites are on the globe: ' + o.n); ok(o.live && o.want === 1 && Math.abs(o.off) < 1000, 'earth: the satellites are where they are this second (x' + o.spd.toFixed(1) + ')');
    // a tap on a satellite brings up what is on record about it
    await page.evaluate(() => window.__lc.WIND.look(20, -60, .42)); await sleep(1500); o = await page.evaluate(() => window.__lc.ORBIT.dbg()); const v = o.vis[2] || o.vis[0];
    await T.tap(v[0], v[1]); await sleep(600); o = await page.evaluate(() => window.__lc.ORBIT.dbg()); ok(o.sel >= 0 && o.card && /ORBIT/i.test(o.card) && /NOW OVER/i.test(o.card), 'earth: tapping a satellite should bring up its card: ' + String(o.card).replace(/\n+/g, ' | '));
    for (let k = 0; k < 24 && !o.cat; k++) { await sleep(250); o = await page.evaluate(() => window.__lc.ORBIT.dbg()); } await sleep(700); o = await page.evaluate(() => window.__lc.ORBIT.dbg());
    ok(o.cat && /CATALOGUE/i.test(o.card) && /LAUNCHED/i.test(o.card) && /km up/.test(o.card) && /MEASURED/i.test(o.card), 'earth: the card should fill from the catalogue: ' + String(o.card).replace(/\n+/g, ' | '));
    await shot('1g_earth_satcard'); console.log('  ', String(o.card).replace(/\n+/g, ' | '));
    await page.evaluate(() => window.__lc.ORBIT.pick('ISS (ZARYA)')); await sleep(900); o = await page.evaluate(() => window.__lc.ORBIT.dbg());
    ok(/1998-067A/.test(o.card) && /Baikonur/.test(o.card) && /20 Nov 1998/.test(o.card) && /51\.6°/.test(o.card), 'earth: the space station\'s card should hold its record: ' + String(o.card).replace(/\n+/g, ' | '));
    const age = /MEASURED\s*orbit of [^·]+ · (\d+) (min|h|days) ago/i.exec(o.card); ok(age && (age[2] !== 'days'), 'earth: the space station\'s orbit should have been measured within two days: ' + (age && age[0]));
    await shot('1h_earth_iss'); await page.evaluate(() => window.__lc.WIND.layer('vid', 1));
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
    const rowsOk = r => r === 'congas,bongos,shaker,cajon,claps,marimba,xylophone,vibes,piano,glock';
    // (13 Nov, night: "impossible to make good sounds with those noises" ... "Real loops, big buttons") the band's nine, then ten
    // recorded instruments (VCSL, CC0) as a list, each with two loops written to the band's beat and chords, big buttons, one stop
    let m = await M();
    const ui = await page.evaluate(() => ({ band: [...document.querySelectorAll('#mix .mxband .mxb')].map(b => b.textContent),
      rows: [...document.querySelectorAll('#mix .mxrow')].map(r => r.querySelector('.mxn').textContent + ':' + [...r.querySelectorAll('.mxb')].map(b => b.textContent).join('/')),
      secs: [...document.querySelectorAll('#mix .mxsec')].map(e => e.textContent).join(), stop: [...document.querySelectorAll('#mix .mxstop')].map(b => b.textContent).join(),
      small: [...document.querySelectorAll('#mix .mxb')].filter(b => b.getBoundingClientRect().height < 40).length,
      old: !!document.querySelector('#mix .mxg,#mix .mxt,#mix .mxc,#mix .mxd,#mix .mxf,#mix .mxxy,#mix .mxpad,#mix .mxs') }));
    ok(m.on && m.mixon && ui.band.length === 9 && ui.rows.length === 10 && ui.rows.every(r => r.split('/').length === 2) && m.loops === 20 && ui.secs === 'mode,the band,play along' && ui.stop === 'jam: a new mix,stop the instruments' && !ui.small && !ui.old,
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
    const lit2 = await page.evaluate(() => document.querySelectorAll('#mix .mxband .mxb.on,#mix .mxrow .mxb.on').length), nplay = m.tracks.filter(t => t.play >= 0).length;
    ok(lit2 === nplay, 'mix: back in the mixer, the list shows what has been playing: ' + lit2 + ' lit of ' + nplay);
    // (15 Nov: "Make it able to also cycle through sounds or modes. another layer to change globally. five modes. funky, African,
    // bluesy, acid, dub") five buttons at the top of Mix, the mode's name beside the note in every world
    console.log('MODES');
    const md = await page.evaluate(() => ({ b: [...document.querySelectorAll('#mix .mxm')].map(b => b.textContent + (b.classList.contains('on') ? '*' : '')).join(), chip: document.getElementById('bMode').textContent }));
    ok(md.b === 'funky,African*,bluesy,acid,dub' && md.chip === 'African', 'modes: five, African lit, and its name at the top: ' + JSON.stringify(md));
    const tapText = async (sel, t) => { const r = await page.evaluate(a => { const e = [...document.querySelectorAll(a[0])].filter(x => x.textContent === a[1])[0]; e.scrollIntoView({ block: 'center' }); const q = e.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; }, [sel, t]); await sleep(150); await T.tap(r.x, r.y); await sleep(120); };
    await tapText('#mix .mxm', 'dub'); m = await M();
    ok(m.pend === 'dub' && await page.evaluate(() => document.querySelector('#mix .mxm.wait') && document.querySelector('#mix .mxm.wait').textContent === 'dub' && document.getElementById('bMode').classList.contains('wait')), 'modes: dub waits for the bar, its button and the name at the top blinking');
    m = await waitFor(m => m.mode === 'dub' && !m.pend && m.tracks.filter(t => t.m === 'dub' && t.play >= 0).length >= 4, 40);
    const dub = m.tracks.filter(t => t.play >= 0).map(t => (t.m || 'band') + ':' + t.n);
    ok(m.mode === 'dub' && dub.every(x => /^dub:/.test(x)) && ['drums', 'bass', 'skank', 'piano'].every(n => dub.includes('dub:' + n)) && m.fx.fb > .4, 'modes: dub comes in on the bar, its own band (the band\'s players out) and its echo: ' + dub.join(', ') + ' ' + JSON.stringify(m.fx));
    await sleep(300); let rows = await page.evaluate(() => [...document.querySelectorAll('#mix .mxrow .mxn')].map(e => e.textContent).join());
    s = await S(); ok(rows === 'drums,bass,skank,piano,keys,perc,echo' && /^tap a loop: in on the next bar, in tune\ndub: drums, bass, skank, piano, echo\n/.test(s.data) && await page.evaluate(() => document.getElementById('bMode').textContent === 'dub'),
      'modes: the list shows the dub band, the readout what plays: ' + rows + ' | ' + s.data.replace(/\n/g, ' | '));
    await shot('2d_mix_dub');
    // a touch elsewhere has the mode's voice; the pictures move with the mode's notes
    ok(await page.evaluate(() => window.__lc.MIX.voice('glass', 64, .4, 0, 0) && window.__lc.MIX.voice('tick', 0, .4, 0, 0)), 'modes: a touch plays the mode\'s own instrument (dub: the guitar, the hat)');
    ok(await page.evaluate(() => window.__lc.MG[0] > 0 && window.__lc.MG[5] > 0), 'modes: the mode\'s drums and bass move the pictures as the band\'s players did');
    // the name at the top: a tap, the next mode (after dub comes funky)
    const cb = await el('#bMode'); await T.tap(cb.x, cb.y); m = await waitFor(m => m.mode === 'funk' && !m.pend && m.tracks.filter(t => t.m === 'funk' && t.play >= 0).length >= 4, 40);
    const fk = m.tracks.filter(t => t.play >= 0).map(t => t.n);
    ok(m.mode === 'funk' && ['drums', 'bass', 'clav', 'guitar'].every(n => fk.includes(n)) && m.tracks.filter(t => t.m === 'dub').every(t => t.play < 0), 'modes: the name at the top goes on to funky, on the bar: ' + fk.join(', '));
    // a jam in funky: its own instruments, a drum and a tuned one among them
    await tapB('#mix .mxjam'); m = await waitFor(m => m.tracks.every(t => t.next === -1) && m.tracks.filter(t => t.m === 'funk' && t.play >= 0).length >= 2);
    const fj = m.tracks.filter(t => t.play >= 0).map(t => (t.m || 'band') + ':' + t.n);
    ok(fj.every(x => /^funk:/.test(x)) && fj.some(x => /:(drums|perc|congas)$/.test(x)) && fj.some(x => /:(clav|guitar|keys)$/.test(x)), 'modes: a jam in funky draws on its own instruments: ' + fj.join(', '));
    // the band's bass and a mode's bass never play at once
    const bj = m.tracks.findIndex(t => t.k === 'stem' && t.n === 'bass'); await tapB('#mix .mxband .mxb', bj); m = await waitFor(m => m.tracks[bj].play === 0);
    ok(m.tracks[bj].play === 0 && m.tracks.filter(t => t.m === 'funk' && t.n === 'bass').every(t => t.play < 0), 'modes: the band\'s bass comes in and the slap bass goes out (two basses never at once)');
    // back to African: the band, all nine
    await tapText('#mix .mxm', 'African'); m = await waitFor(m => m.mode === 'africa' && !m.pend && m.tracks.filter(t => t.k === 'stem' && t.play >= 0).length === 9, 40);
    ok(m.mode === 'africa' && m.tracks.filter(t => t.k === 'stem').every(t => t.play >= 0) && m.tracks.filter(t => t.m && t.m !== 'africa').every(t => t.play < 0) && rowsOk(await page.evaluate(() => [...document.querySelectorAll('#mix .mxrow .mxn')].map(e => e.textContent).join())),
      'modes: African brings the band back, all nine, and the ten instruments\' list');
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
