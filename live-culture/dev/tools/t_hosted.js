// The hosted page (HOSTED=1) against the real worker.js, with every upstream played from local files (tools/hostmock.mjs, port 8758).
// Checked: it reads every source through the Worker and takes what is newer; the clouds come onto the globe; the satellites' orbits
// are replaced by the live list; the cameras are a layer of the Earth: they find their streams (by address, by channel, by a search of
// what is live now), a ring tapped on the globe opens a window over it (a stand-in for YouTube's player), the window grows and shrinks
// with a tap, goes east and west with a swipe and closes on its cross, passes over a camera that is off the air, keeps to a theme; and,
// where YouTube's player cannot load at all, the satellites' live pictures of the whole Earth are shown instead.
// usage: node tools/t_hosted.js   (with tools/hostmock.mjs running)
const { launch, open } = require('./lib'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const fail = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fail.push(m); };
const BASE = 'http://127.0.0.1:8758/';
const FAKEYT = () => { window.__yt = [];
  window.YT = { Player: function (id, o) { const self = this, el = document.getElementById(id), d = document.createElement('div'); d.id = id;
    d.style.cssText = 'position:absolute;inset:0;background:linear-gradient(135deg,#123a52,#3f7d74 55%,#c98a45);color:#fff;font:600 22px sans-serif;display:flex;align-items:center;justify-content:center';
    el.replaceWith(d); self.v = o.videoId; d.textContent = 'stand-in video ' + self.v; window.__yt.push('new ' + self.v);
    self.mute = () => {}; self.playVideo = () => window.__yt.push('play'); self.pauseVideo = () => window.__yt.push('pause');
    self.loadVideoById = v => { self.v = v; d.textContent = 'stand-in video ' + v; window.__yt.push('load ' + v); setTimeout(() => o.events.onStateChange({ data: 1, target: self }), 150); };
    setTimeout(() => { o.events.onReady({ target: self }); setTimeout(() => o.events.onStateChange({ data: 1, target: self }), 150); }, 60); } }; };
const clean = errs => [...new Set(errs)].filter(e => !/youtube\.com|requestfailed: https:\/\/fonts|net::ERR_FAILED/.test(e));
(async () => {
  const browser = await launch(); let all = [];
  { console.log('LIVE DATA THROUGH THE WORKER');
    const { page, errs, ctx } = await open(browser, 'phone', { base: BASE, hash: '#earth', init: FAKEYT, dsf: 2 }); await sleep(1200);
    await page.evaluate(() => { window.__lc.GOV.n = -1e9; });
    const snap = await page.evaluate(() => new Promise(r => { const t0 = Date.now(); (function w() { const L = window.__lc.LIVE; if (L.sats || Date.now() - t0 > 9000) r({ at: Object.assign({}, L.at), n: L.sats && L.sats.n }); else setTimeout(w, 100); })(); }));
    let s = null; for (let k = 0; k < 40; k++) { await sleep(500); s = await page.evaluate(() => { const L = window.__lc; return { ok: Object.keys(L.PULL.ok).sort(), err: L.PULL.err, at: Object.assign({}, L.LIVE.at), n: L.LIVE.sats && L.LIVE.sats.n, fresh: L.LIVE.sats && L.LIVE.sats.fresh, live: L.LIVE.sats && L.LIVE.sats.live, cloud: L.GLOBE.hasCloud(), hosted: L.HOSTED, worlds: L.WORLDS.map(w => w.id).join() }; }); if (s.ok.length >= 8 && s.cloud) break; }
    ok(s.hosted === 1 && s.worlds === 'paint,earth,mix', 'the hosted page has the same three worlds (its cameras are a layer of the Earth): ' + s.worlds);
    for (let k = 0; k < 40 && !s.ok.includes('gfs'); k++) { await sleep(500); s.ok = await page.evaluate(() => Object.keys(window.__lc.PULL.ok).sort()); }
    ok(s.ok.join() === 'aurora,clouds,fires,gfs,goes,rain,sats,storms,strikes,wind', 'every source was read through the Worker: ' + s.ok.join() + ' ' + JSON.stringify(s.err));
    { const wx = await page.evaluate(() => { const X = window.__lc.WX, G = window.__lc.GRIB; return { t: X.t2m && G.at(X.t2m, 40, -40), p: X.mslp && G.at(X.mslp, 40, -40), w: X.wave && G.at(X.wave, 40, -40), land: X.wave && G.at(X.wave, 40, -100), jet: 'jet' in X }; });
      ok(wx.t > 220 && wx.t < 320 && wx.p > 95000 && wx.p < 106000 && wx.w > 0 && Number.isNaN(wx.land) && !wx.jet, 'the weather model\'s fields were read on the device (GRIB2), and no more than are read out (the jet streams went with the layers): ' + JSON.stringify(wx)); }
    ok(s.live > 8000 && s.n > 15000 && s.fresh > 0, 'the live orbit list (' + s.live + ' element sets) was laid over the snapshot: ' + s.n + ' objects');
    ok(s.at.strikes >= snap.at.strikes && s.at.aurora >= snap.at.aurora && s.at.wind >= snap.at.wind, 'nothing older than the snapshot replaced it');
    ok(s.cloud, 'the clouds are on the globe');
    // (15 Nov, night) the war zones and the places cut off: the file beside the page, then the Worker's day: DeepStateMap's front, IODA's
    // outages (Cuba, already among the places cut off, gets the word on its own card; Sudan a mark of its own)
    { let z = null; for (let k = 0; k < 20; k++) { z = await page.evaluate(() => window.__lc.ZONES.dbg()); if (z.ver >= 2) break; await sleep(400); }
      ok(z.ver >= 2 && z.ioda.join() === 'SD' && z.front && z.front.date === new Date().toISOString().slice(0, 10) && z.front.km2 > 90000 && z.war.length >= 15, 'the war zones on the site, with the day\'s front (DeepStateMap) and IODA\'s outages: ' + JSON.stringify({ ioda: z.ioda, front: z.front })); }
    await page.evaluate(() => window.__lc.WIND.look(12, 130, 1.25)); await sleep(2500);
    // (14 Nov, night: "On the earth there should be videos ... be able to take on and off layers. The weather is pretty lame ... Doesn't noa
    // have live weather?!") a row of layers under the globe; on the site the live view (NOAA's GOES pictures laid on the globe) and the
    // model's forecast for this hour
    for (let k = 0; k < 20; k++) { const g = await page.evaluate(() => window.__lc.GLOBE.hasGeo()); if (g === 3) break; await sleep(500); }
    const ea = await page.evaluate(() => { const L = window.__lc, d = L.WIND.dbg(), e = document.getElementById('data'), t = e.getBoundingClientRect(), r = (document.getElementById('lgd').hidden ? document.getElementById('lyd') : document.getElementById('lgd')).getBoundingClientRect();
      return { dock: d.dock.join(' '), geo: L.GLOBE.hasGeo(), want: L.GEO.want, lgd: d.lgd, windNow: !!L.LIVE.wind.now, cams: d.cams, top: Math.round(d.cy - d.R), bottom: Math.round(d.cy + d.R), words: Math.round(t.bottom),
        lines: Math.round(t.height / parseFloat(getComputedStyle(e).lineHeight)), row: Math.round(r.top), data: e.textContent }; });
    ok(/^vid\+ war\+ dark\+ orbit\+ sat\+ (storm\+ )?fire\+ bolt\+ rain\+ cld\+ temp- waves- pres- aur\+$/.test(ea.dock), 'the row of layers, as they start (15 Nov: no wind; the war zones and the blackouts after the videos): ' + ea.dock);
    ok(ea.geo === 3 && ea.want && ea.lgd === '', 'the live view: both of NOAA\'s pictures on the globe: ' + JSON.stringify([ea.geo, ea.want, ea.lgd]));
    ok(ea.data === '', 'no writing at the top (15 Nov, 22:59: "Remove the writing on the top"): ' + JSON.stringify(ea.data));
    ok(ea.top >= ea.words && ea.bottom <= ea.row, 'the whole globe shows, under the header and above the row: ' + JSON.stringify([ea.top, ea.bottom, ea.words, ea.row, ea.lines]) + ' ' + ea.data.replace(/\n/g, ' | '));
    { const tm = await page.evaluate(() => fetch('/api/gfs/t2m').then(r => r.headers.get('x-time'))); ok(Math.abs(Date.parse(tm) - Date.now()) < 2 * 3600000, 'the model\'s fields are for the hour nearest now: ' + tm); }
    { const th = await page.evaluate(() => fetch('/api/thumb/gswNWtJlUco').then(r => [r.status, r.headers.get('content-type')])); ok(th[0] === 200 && th[1] === 'image/jpeg', 'a camera\'s picture now, through the Worker: ' + th.join(' ')); }
    await page.screenshot({ path: 'shots/hosted_live_view.png' });
    // the layers of colour: the temperature (its scale over the row), then the waves in its place (one at a time), and the isobars
    await page.evaluate(() => window.__lc.WIND.layer('temp', 1)); await sleep(500);
    const said = await page.evaluate(() => document.getElementById('data').textContent);
    for (let k = 0; k < 30; k++) { await sleep(300); if ((await page.evaluate(() => window.__lc.WIND.dbg().lgd)) === 'temp') break; }
    let ly = await page.evaluate(() => ({ d: window.__lc.WIND.dbg(), data: document.getElementById('data').textContent, lgn: document.getElementById('lgn').textContent }));
    ok(ly.d.lgd === 'temp' && ly.d.wx && ly.lgn === 'temperature °C' && said === '', 'temperature on: the words say so, then its colours and its scale: ' + said.replace(/\n/g, ' | '));
    await page.screenshot({ path: 'shots/hosted_temperature.png' });
    await page.evaluate(() => { window.__lc.WIND.layer('waves', 1); window.__lc.WIND.layer('pres', 1); }); for (let k = 0; k < 20; k++) { await sleep(300); if ((await page.evaluate(() => window.__lc.WIND.dbg().lgd)) === 'waves') break; }
    await sleep(1500); ly = await page.evaluate(() => ({ d: window.__lc.WIND.dbg(), hl: window.__lc.WX.hl.length }));
    ok(ly.d.lgd === 'waves' && ly.d.LY.temp === 0 && ly.d.LY.pres === 1 && ly.hl > 4, 'waves on takes the temperature\'s place; the pressure\'s isobars and its highs and lows: ' + JSON.stringify([ly.d.lgd, ly.d.LY.temp, ly.d.LY.pres, ly.hl]));
    await page.screenshot({ path: 'shots/hosted_waves_pressure.png' });
    await page.evaluate(() => { window.__lc.WIND.layer('waves', 0); window.__lc.WIND.layer('pres', 0); }); await sleep(300);
    await page.screenshot({ path: 'shots/hosted_wind_clouds.png' });
    await page.evaluate(() => window.__lc.WIND.look(40, -40, 1)); await sleep(1500); await page.screenshot({ path: 'shots/hosted_wind_atlantic.png' });
    // a place tapped: the card with the weather there now, the next day and three days, and the radar
    await page.route(/basemaps\.cartocdn\.com|tilecache\.rainviewer\.com/, r => r.fulfill({ status: 200, contentType: 'image/png', body: require('fs').readFileSync('/home/claude/hello/_work/testdata/rain.png') }));
    // (look() holds the hints, so their ghost fingers cannot turn the Earth away before the tap; the place is out at sea, where no
    // camera's ring is near enough to take the tap first)
    // (a press on the zoom first: a touch of the hand's own stops the hints, whose ghost finger would turn the Earth under the tap)
    await page.click('#zIn'); await page.click('#zOut');
    // (the satellites put away meanwhile: flying a minute a second, the space station can pass under the finger)
    await page.evaluate(() => { window.__lc.WIND.layer('orbit', 0); window.__lc.WIND.look(36, -45, 1.4); }); await sleep(1500); { const d = await page.evaluate(() => window.__lc.WIND.dbg()); await page.mouse.click(d.cx, d.cy); }
    let cd = null; for (let k = 0; k < 30; k++) { await sleep(400); cd = await page.evaluate(() => ({ hidden: document.getElementById('card').hidden, t: document.getElementById('card').innerText, radar: !!document.querySelector('#card canvas.cr'), data: document.getElementById('data').textContent })); if (/NOW/.test(cd.t) && cd.radar) break; }
    ok(!cd.hidden && /km from|open sea|, /i.test(cd.t) && /NOW\s+8°C · 47°F/.test(cd.t) && /WIND\s+22 km\/h from northeast/.test(cd.t) && /TODAY 12°\/4°/.test(cd.t) && cd.radar, 'a tap on a place opens its card: ' + cd.t.replace(/\n+/g, ' | ').slice(0, 260));
    ok(/km from \w+|^\w/.test(cd.data.split('\n')[0]) && /°C · \d+ hPa/.test(cd.data), 'and the readout names the place and gives the model\'s figures there: ' + cd.data.replace(/\n/g, ' | '));
    await page.screenshot({ path: 'shots/hosted_wind_card.png' });
    await page.evaluate(() => document.querySelector('#card .cx').click()); await sleep(300); ok(await page.evaluate(() => document.getElementById('card').hidden), 'the card\'s cross puts it away');
    await page.evaluate(() => window.__lc.WIND.layer('orbit', 1));
    // a storm tapped: the Earth turns to it and comes close
    { const st = await page.evaluate(() => window.__lc.WIND.dbg().storms); if (!st.length) console.log('   (no tropical storm today, in the data fetched)'); else {
      await page.evaluate(s => window.__lc.WIND.look(s.lat, s.lon + 20, 1), st[0]); await sleep(1200); const p0 = (await page.evaluate(() => window.__lc.WIND.dbg().storms))[0];
      await page.mouse.click(p0.x, p0.y); let d2 = null; for (let k = 0; k < 12; k++) { await sleep(400); d2 = await page.evaluate(() => window.__lc.WIND.dbg()); if (d2.zoom > 2.5) break; } await sleep(600); d2 = await page.evaluate(() => window.__lc.WIND.dbg()); const s2 = d2.storms[0];
      ok(d2.zoom > 2.5 && Math.hypot(s2.x - d2.cx, s2.y - d2.cy) < 40 && /km\/h/.test(await page.evaluate(() => document.getElementById('data').textContent)), 'a tap on a storm turns the Earth to it and comes close: ' + d2.zoom.toFixed(2) + ' ' + s2.name);
      await page.screenshot({ path: 'shots/hosted_wind_storm.png' }); await page.evaluate(() => window.__lc.WIND.look(20, -40, 1)); } }
    // the satellites: the live list, and the card still works on it
    const od = await page.evaluate(() => window.__lc.ORBIT.dbg()); ok(!od.live && od.want === 60, 'the satellites fly, sixty times their speed');
    await page.evaluate(() => window.__lc.ORBIT.pick('ISS (ZARYA)')); let card = '';
    for (let k = 0; k < 24; k++) { await sleep(400); card = await page.evaluate(() => window.__lc.ORBIT.dbg().card || ''); if (/1998-067A/.test(card)) break; } ok(/1998-067A/.test(card) && /MEASURED/i.test(card), 'the space station\'s card on the live list: ' + card.replace(/\n+/g, ' | ').slice(0, 200));
    // close up (14 Nov: "can't zoom in close enough"): the Earth comes far closer, and NASA's 500-metre picture of the part in view comes in
    await page.evaluate(() => window.__lc.WIND.look(36.1, -112.1, 30)); let det = null; for (let k = 0; k < 30 && !det; k++) { await sleep(400); det = await page.evaluate(() => window.__lc.GLOBE.detR()); }
    const dz = await page.evaluate(() => window.__lc.WIND.dbg().zoom);
    ok(det && det.s < 36.1 && det.n > 36.1 && det.w < -112.1 && det.e > -112.1 && det.n - det.s <= 8 && dz === 30, 'up close the picture of the ground for the part in view comes in: ' + JSON.stringify(det) + ' at zoom ' + dz);
    await sleep(800); await page.screenshot({ path: 'shots/hosted_close.png' }); await page.evaluate(() => window.__lc.WIND.look(20, -40, 1));
    // a broken orbit list is refused and the old one kept
    const keep = await page.evaluate(() => { const L = window.__lc, n0 = L.LIVE.sats.n, r = L.satsMerge(L.pTLE('nonsense\n1 bad\n2 bad', Date.now()), [], Date.now()); return { r, same: L.LIVE.sats.n === n0 }; });
    ok(!keep.r && keep.same, 'a short or broken orbit list changes nothing');
    all = all.concat(clean(errs).map(e => 'data: ' + e)); await ctx.close(); }

  { console.log('CAMERAS ON THE EARTH (a stand-in for YouTube\'s player)');
    const { page, errs, ctx } = await open(browser, 'phone', { base: BASE, hash: '#live', init: FAKEYT }); await sleep(1500);
    await page.evaluate(() => { window.__lc.GOV.n = -1e9; });
    const D = () => page.evaluate(() => { const L = window.__lc, f = document.getElementById('foot').getBoundingClientRect(); return { d: L.LIVEW.dbg(), w: L.WIND.dbg(), id: L.WORLDS[L.CURI].id, hash: location.hash, data: document.getElementById('data').textContent, yt: window.__yt.slice(), hidden: document.getElementById('vid').hidden, on: document.getElementById('vidbox').classList.contains('on'),
      chips: [...document.querySelectorAll('#themes .lb')].map(b => b.textContent + (b.getAttribute('aria-pressed') === 'true' ? '*' : '')).join(), row: !document.getElementById('themes').hidden, foot: f.top, vw: innerWidth }; });
    let s = null; for (let k = 0; k < 40; k++) { await sleep(400); s = await D(); if (s.d.cams && s.d.air[0] > 3) break; }
    ok(s.id === 'earth' && s.hash === '#earth', 'an old link to #live opens the Earth: ' + s.id);
    ok(s.d.on && s.d.cams >= 70 && s.d.themes.length === 8, 'the cameras came from the Worker, in themes: ' + s.d.cams + ' cameras, ' + s.d.themes.join(' '));
    ok(!s.row && s.chips === 'all*,wild,fire,space,city,sea,sky,land,move', 'their themes are a row of their own, shown only while a camera is open (14 Nov): ' + s.chips);
    ok(s.hidden && s.d.cur < 0 && s.data === '' && s.d.onair.length > 0, 'no window until a camera is tapped, and no words at the top: ' + s.data.replace(/\n/g, ' | '));
    await page.screenshot({ path: 'shots/hosted_cams_0.png' });
    const cdp = await ctx.newCDPSession(page);
    // (lifted straight away: this browser takes most of a second over a frame of the Earth with its video, and a touch held across two
    // such frames reads as more than a tap's 600 ms on the frames' clock; a phone draws a frame in a few hundredths of a second)
    const tap = async (x, y) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
    const swipe = async (x0, x1, y) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y, id: 1 }] }); for (let k = 1; k <= 10; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (x1 - x0) * k / 10, y, id: 1 }] }); await sleep(18); } await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
    // a ring tapped on the globe: its window opens over the Earth (Starbase's ring, the Earth turned to it)
    // (a press on the zoom first: a touch of the hand's own stops the hints, whose ghost finger would turn the Earth under the tap)
    await page.click('#zIn'); await page.click('#zOut');
    await page.evaluate(() => window.__lc.WIND.look(26, -97, 1.1)); await sleep(2500); s = await D();
    // (the cameras on the Earth are pictures: those on the air with the stream's own, through the Worker)
    for (let k = 0; k < 20; k++) { if (s.d.tiles.length >= 4 && s.d.onair.length) break; await sleep(400); s = await D(); }
    ok(s.d.tiles.length >= 4 && s.d.tiles.every(t => t.r >= 9) && s.d.onair.length > 0, 'the cameras are lenses on the Earth (15 Nov), a red mark on those on the air: ' + s.d.tiles.map(t => t.id + (s.d.onair.includes(t.id) ? '*' : '')).join(' '));
    await page.screenshot({ path: 'shots/hosted_cams_tiles.png' });
    const mt = s.d.tiles.find(t => /starbase|labpadre/.test(t.id)), mi = s.d.ids.indexOf('starbase'), mq = s.d.marks[mi], tx = mt ? [mt.x + mt.w / 2, mt.y + mt.h / 2] : mq && mq[2] > .3 ? [mq[0], mq[1]] : null;
    if (tx) { for (let k = 0; k < 3 && s.d.cur < 0; k++) { await tap(tx[0], tx[1]); await sleep(600); s = await D(); }
      for (let k = 0; k < 40; k++) { await sleep(300); s = await D(); if (s.d.stat === 'live') break; }
      ok(s.d.cur >= 0 && !s.hidden && s.d.stat === 'live' && s.on, 'a tap on a camera\'s picture opens its window, and it plays: ' + s.d.id + ' (' + s.d.stat + ')'); }
    else ok(false, 'Starbase is not in view');
    ok(s.d.win.x >= 0 && s.d.win.x + s.d.win.w <= s.vw && s.d.win.y + s.d.win.h <= s.foot && s.d.win.w > 160, 'the window sits over the globe, above the rows along the bottom: ' + JSON.stringify(s.d.win) + ' foot ' + s.foot);
    ok(s.data.split('\n').length === 3 && !/^drag to turn/.test(s.data), 'the readout gives the camera, its hour and light, the satellites above: ' + s.data.replace(/\n/g, ' | '));
    // (14 Nov: "Videos doesn't seem to really be working") the window as wide as the phone and at least 200 pixels high, above everything
    // so a tap on the picture reaches the player, with west, east and close over it
    const wb = await page.evaluate(() => { const v = document.getElementById('vidbox').getBoundingClientRect(), c = document.getElementById('vidc'), r = c.getBoundingClientRect(), z = getComputedStyle(document.getElementById('vid')).zIndex, st = getComputedStyle(document.getElementById('stage')).zIndex;
      return { w: v.width, h: v.height, bar: !c.hidden && r.bottom <= v.top + 2 && r.width > 200, btn: [...c.querySelectorAll('button')].map(b => b.textContent).join(), above: +z > +st, pe: getComputedStyle(document.getElementById('vidbox')).pointerEvents }; });
    ok(wb.w >= s.vw - 20 && wb.h >= 200 && wb.bar && wb.btn === 'west,east,close' && wb.above && wb.pe === 'auto', 'the window: the width of the phone, 200 pixels high or more, over the stage and taking taps, its buttons over it: ' + JSON.stringify(wb));
    { const yl = await page.evaluate(() => { const a = document.getElementById('vY'); return a && !a.hidden ? [a.textContent, a.href, a.target] : null; }); ok(yl && yl[0] === 'youtube' && /^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/.test(yl[1]) && yl[2] === '_blank', 'and a way out to the stream on YouTube, should the player not play: ' + JSON.stringify(yl)); }
    ok(await page.evaluate(() => !document.getElementById('themes').hidden), 'with a camera open, its themes along the bottom');
    await page.screenshot({ path: 'shots/hosted_cams_window.png' });
    let wv = s.d.win;
    // to a named camera; the stream address the Worker found is the one played
    await page.evaluate(() => window.__lc.LIVEW.go('starbase')); for (let k = 0; k < 30; k++) { await sleep(300); s = await D(); if (s.d.stat === 'live' && s.d.yt) break; }
    ok(s.d.id === 'starbase' && s.d.yt === 'STARBASE001' && s.d.stat === 'live', 'a channel\'s stream is found by the Worker and played: ' + s.d.yt);
    ok(/Starbase · Boca Chica, Texas/.test(s.data) && /by the Sun/.test(s.data), 'Starbase reads as itself: ' + s.data.replace(/\n/g, ' | '));
    // found by a search of what is live now: the looped film and the stream that may not be played elsewhere are passed over
    await page.evaluate(() => window.__lc.LIVEW.go('polarbears')); for (let k = 0; k < 40; k++) { await sleep(300); s = await D(); if (s.d.id === 'polarbears' && s.d.stat === 'live' && s.d.yt) break; }
    ok(s.d.yt === 'POLARBEAR01' && s.d.stat === 'live', 'a camera whose address changed is found by a search, past a looped film and a stream that may not be shown here: ' + s.d.yt);
    // off the air: passed over
    await page.evaluate(() => window.__lc.LIVEW.go('sakurajima')); await sleep(700); s = await D(); const was = s.d.stat;
    for (let k = 0; k < 40; k++) { await sleep(300); s = await D(); if (s.d.id !== 'sakurajima' && s.d.stat === 'live') break; }
    ok(was === 'off' || was === 'finding' || s.d.bad.includes('sakurajima'), 'a camera off the air is marked so (' + was + ')'); ok(s.d.id !== 'sakurajima' && s.d.stat === 'live', 'and passed over: now ' + s.d.id);
    // east: the next camera east; west: back
    await page.evaluate(() => window.__lc.LIVEW.go('namib')); await sleep(1500); s = await D();
    await page.click('#vE'); await sleep(1200); let s2 = await D(); ok(s2.d.id !== 'namib', '"east" goes to the next camera east: ' + s2.d.id);
    await page.click('#vW'); await sleep(1200); s2 = await D(); ok(s2.d.id === 'namib' || s2.d.cur < s.d.cur + 3, '"west" comes back west: ' + s2.d.id);
    // a theme: the space cameras
    await page.evaluate(() => document.getElementById('th_space').click()); for (let k = 0; k < 30; k++) { await sleep(300); s = await D(); if (s.d.stat === 'live') break; }
    ok(s.d.th === 'space' && /^(iss|nasa-iss|starbase|labpadre|canaveral|goes-east|goes-west)$/.test(s.d.id), 'a theme: only its cameras: ' + s.d.id);
    await page.evaluate(() => document.getElementById('th_all').click()); await sleep(300);
    // the space station: the camera moves with it
    await page.evaluate(() => window.__lc.LIVEW.go('iss')); await sleep(1500); s = await D(); ok(s.d.iss && /over \d+\.\d°[NS] \d+\.\d°[EW] · \d{3} km up · 27,\d{3} km\/h/.test(s.data), 'the space station camera reads where the station is: ' + s.data.split('\n')[2]);
    await page.screenshot({ path: 'shots/hosted_cams_iss.png' });
    // a still: the whole Earth from GOES-19
    await page.evaluate(() => window.__lc.LIVEW.go('goes-east')); await sleep(2000); s = await D(); ok(s.d.img && s.d.stat === 'live' && /picture of \d+ \w+ \d\d:\d\d UTC/.test(s.data), 'the GOES-19 picture of the whole Earth: ' + s.data.replace(/\n/g, ' | '));
    // the window's cross closes it, and pauses the stream
    await page.evaluate(() => window.__lc.LIVEW.go('monterey')); for (let k = 0; k < 30; k++) { await sleep(300); s = await D(); if (s.d.stat === 'live') break; }
    await page.click('#vX'); await sleep(900); s = await D();
    ok(s.d.cur < 0 && s.hidden && s.yt[s.yt.length - 1] === 'pause' && await page.evaluate(() => document.getElementById('vidc').hidden), '"close" closes the window and pauses the stream (' + s.yt.slice(-2).join(', ') + ')');
    // the row of layers: "videos" off takes the cameras away; on again, the Earth turns to one on the air
    await page.click('#ly_vid'); await sleep(500); s = await D(); ok(!s.d.on && s.w.LY.vid === 0, '"videos" off takes the cameras away: ' + JSON.stringify([s.d.on, s.w.LY.vid, s.d.tiles.length]));
    await page.click('#ly_vid'); await sleep(1500); s = await D(); ok(s.d.on && s.w.LY.vid === 1 && s.d.tiles.length > 0 && s.d.cur >= 0, '"videos" on brings them back and one opens at once, to play in its window (15 Nov): ' + s.d.tiles.length + ' ' + s.d.id + ' (' + s.d.stat + ')');
    // leaving the Earth closes the window
    await page.evaluate(() => window.__lc.LIVEW.go('monterey')); await sleep(800); await page.evaluate(() => window.__lc.go(0, true)); await sleep(400); s = await D();
    ok(s.hidden && !s.row, 'leaving the Earth hides the window and the themes');
    await page.evaluate(() => window.__lc.go(1, true)); await sleep(800);
    await page.setViewportSize({ width: 844, height: 390 }); await sleep(1500); await page.evaluate(() => window.__lc.LIVEW.go('starbase')); await sleep(2500); s = await D(); await page.screenshot({ path: 'shots/hosted_cams_turned.png' });
    ok(s.d.win.x + s.d.win.w <= s.vw && s.d.win.y >= 0 && s.d.win.y + s.d.win.h <= s.foot && s.d.win.h >= 199, 'with the phone turned the window still fits, 200 pixels high: ' + JSON.stringify(s.d.win));
    all = all.concat(clean(errs).map(e => 'cams: ' + e)); await ctx.close(); }

  { console.log('CAMERAS WITHOUT YOUTUBE (its player cannot load)');
    const { page, errs, ctx } = await open(browser, 'desk', { base: BASE, hash: '#earth' }); await page.route(/youtube\.com/, r => r.abort());
    await sleep(2500); await page.evaluate(() => window.__lc.LIVEW.go('starbase'));
    let s = null; for (let k = 0; k < 60; k++) { await sleep(400); s = await page.evaluate(() => ({ d: window.__lc.LIVEW.dbg(), data: document.getElementById('data').textContent })); if (s.d.stat === 'live') break; }
    ok(s.d.stat === 'live' && s.d.kind === 'img', 'the satellites\' pictures of the whole Earth are shown instead: ' + s.d.id + ' | ' + s.data.replace(/\n/g, ' | '));
    await page.screenshot({ path: 'shots/hosted_cams_desk_noyt.png' });
    all = all.concat(clean(errs).map(e => 'noyt: ' + e)); await ctx.close(); }
  await browser.close(); all = [...new Set(all)]; if (all.length) console.log('ERRORS', all.slice(0, 10));
  console.log(fail.length || all.length ? 'HOSTED FAILED (' + (fail.length + all.length) + ')' : 'HOSTED OK'); process.exit(fail.length || all.length ? 1 : 0);
})();
