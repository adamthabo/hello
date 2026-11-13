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
    ok(s.hosted === 1 && s.worlds === 'smoke,earth,mix', 'the hosted page has the same three worlds (its cameras are a layer of the Earth): ' + s.worlds);
    for (let k = 0; k < 40 && !s.ok.includes('gfs'); k++) { await sleep(500); s.ok = await page.evaluate(() => Object.keys(window.__lc.PULL.ok).sort()); }
    ok(s.ok.join() === 'aurora,clouds,fires,gfs,rain,sats,storms,strikes,wind', 'every source was read through the Worker: ' + s.ok.join() + ' ' + JSON.stringify(s.err));
    { const wx = await page.evaluate(() => { const X = window.__lc.WX, G = window.__lc.GRIB; return { t: X.t2m && G.at(X.t2m, 40, -40), p: X.mslp && G.at(X.mslp, 40, -40), w: X.wave && G.at(X.wave, 40, -40), land: X.wave && G.at(X.wave, 40, -100), j: !!(X.jet && X.jet.u && X.jet.v), hl: X.hl.length }; });
      ok(wx.t > 220 && wx.t < 320 && wx.p > 95000 && wx.p < 106000 && wx.w > 0 && Number.isNaN(wx.land) && wx.j && wx.hl > 4, 'the weather model\'s fields were read on the device (GRIB2): ' + JSON.stringify(wx)); }
    ok(s.live > 8000 && s.n > 15000 && s.fresh > 0, 'the live orbit list (' + s.live + ' element sets) was laid over the snapshot: ' + s.n + ' objects');
    ok(s.at.strikes >= snap.at.strikes && s.at.aurora >= snap.at.aurora && s.at.wind >= snap.at.wind, 'nothing older than the snapshot replaced it');
    ok(s.cloud, 'the clouds are on the globe');
    await page.evaluate(() => window.__lc.WIND.look(12, 130, 1.25)); await sleep(2500);
    const hud = await page.evaluate(() => document.getElementById('data').textContent); ok(/clouds of \d\d:\d\d UTC/.test(hud) && /rain of \d\d:\d\d UTC/.test(hud), 'the Earth says when its clouds and its rain are from: ' + hud.replace(/\n/g, ' | '));
    // the jet streams' chip comes once the model's fields are drawn into the globe's picture (a few rows a frame): waited for
    let lyr = ''; for (let k = 0; k < 25; k++) { lyr = await page.evaluate(() => [...document.querySelectorAll('#lyr .lb')].filter(b => !b.hidden).map(b => b.id).join()); if (lyr.split(',').length === 10) break; await sleep(400); } ok(lyr === 'l_sats,l_cams,l_wind,l_jet,l_heat,l_pressure,l_waves,l_clouds,l_rain,l_sun', 'all ten layers can be switched: ' + lyr);
    await page.screenshot({ path: 'shots/hosted_wind_clouds.png' });
    await page.evaluate(() => window.__lc.WIND.look(40, -40, 1)); await sleep(1500); await page.screenshot({ path: 'shots/hosted_wind_atlantic.png' });
    for (const k of ['wind', 'rain']) await page.evaluate(k => document.getElementById('l_' + k).click(), k); await sleep(1500); await page.screenshot({ path: 'shots/hosted_wind_clouds_sun.png' });
    for (const k of ['clouds', 'sun']) await page.evaluate(k => document.getElementById('l_' + k).click(), k); await page.evaluate(() => document.getElementById('l_rain').click()); await sleep(1500); await page.screenshot({ path: 'shots/hosted_wind_rain.png' });
    const hud2 = await page.evaluate(() => document.getElementById('data').textContent); ok(!/clouds of/.test(hud2) && /rain of/.test(hud2), 'a layer put away leaves the readout too: ' + hud2.replace(/\n/g, ' | '));
    for (const k of ['wind', 'clouds', 'sun']) await page.evaluate(k => document.getElementById('l_' + k).click(), k);
    // the model's layers: the temperature and the isobars, then the waves and the jet streams (the jet takes the wind's place)
    for (const k of ['heat', 'pressure']) await page.evaluate(k => document.getElementById('l_' + k).click(), k); await sleep(1800); await page.screenshot({ path: 'shots/hosted_wind_heat.png' });
    let h3 = await page.evaluate(() => document.getElementById('data').textContent); ok(/temperature, pressure: NOAA GFS of \d\d:\d\d UTC/.test(h3), 'the readout says what the layers are and when: ' + h3.replace(/\n/g, ' | '));
    for (const k of ['heat', 'pressure', 'waves', 'jet']) await page.evaluate(k => document.getElementById('l_' + k).click(), k); await sleep(2500); await page.screenshot({ path: 'shots/hosted_wind_waves_jet.png' });
    const ly = await page.evaluate(() => window.__lc.WIND.dbg().LY); ok(ly.jet && !ly.wind && ly.waves, 'the jet streams take the wind\'s place: ' + JSON.stringify(ly));
    for (const k of ['waves', 'wind']) await page.evaluate(k => document.getElementById('l_' + k).click(), k);
    // a place tapped: the card with the weather there now, the next day and three days, and the radar
    await page.route(/basemaps\.cartocdn\.com|tilecache\.rainviewer\.com/, r => r.fulfill({ status: 200, contentType: 'image/png', body: require('fs').readFileSync('/home/claude/hello/_work/testdata/rain.png') }));
    // (look() holds the hints, so their ghost fingers cannot turn the Earth away before the tap; the place is out at sea, where no
    // camera's ring is near enough to take the tap first)
    await page.evaluate(() => window.__lc.WIND.look(36, -45, 1.4)); await sleep(1500); { const d = await page.evaluate(() => window.__lc.WIND.dbg()); await page.mouse.click(d.cx, d.cy); }
    let cd = null; for (let k = 0; k < 30; k++) { await sleep(400); cd = await page.evaluate(() => ({ hidden: document.getElementById('card').hidden, t: document.getElementById('card').innerText, radar: !!document.querySelector('#card canvas.cr'), data: document.getElementById('data').textContent })); if (/NOW/.test(cd.t) && cd.radar) break; }
    ok(!cd.hidden && /km from|open sea|, /i.test(cd.t) && /NOW\s+8°C · 47°F/.test(cd.t) && /WIND\s+22 km\/h from northeast/.test(cd.t) && /TODAY 12°\/4°/.test(cd.t) && cd.radar, 'a tap on a place opens its card: ' + cd.t.replace(/\n+/g, ' | ').slice(0, 260));
    ok(/km from \w+|^\w/.test(cd.data.split('\n')[1]) && /°C · \d+ hPa/.test(cd.data), 'and the readout names the place and gives the model\'s figures there: ' + cd.data.replace(/\n/g, ' | '));
    await page.screenshot({ path: 'shots/hosted_wind_card.png' });
    await page.evaluate(() => document.querySelector('#card .cx').click()); await sleep(300); ok(await page.evaluate(() => document.getElementById('card').hidden), 'the card\'s cross puts it away');
    // a storm tapped: the Earth turns to it and comes close
    { const st = await page.evaluate(() => window.__lc.WIND.dbg().storms); if (!st.length) ok(false, 'no storm to tap'); else {
      await page.evaluate(s => window.__lc.WIND.look(s.lat, s.lon + 20, 1), st[0]); await sleep(1200); const p0 = (await page.evaluate(() => window.__lc.WIND.dbg().storms))[0];
      await page.mouse.click(p0.x, p0.y); let d2 = null; for (let k = 0; k < 12; k++) { await sleep(400); d2 = await page.evaluate(() => window.__lc.WIND.dbg()); if (d2.zoom > 2.5) break; } await sleep(600); d2 = await page.evaluate(() => window.__lc.WIND.dbg()); const s2 = d2.storms[0];
      ok(d2.zoom > 2.5 && Math.hypot(s2.x - d2.cx, s2.y - d2.cy) < 40 && /km\/h/.test(await page.evaluate(() => document.getElementById('data').textContent)), 'a tap on a storm turns the Earth to it and comes close: ' + d2.zoom.toFixed(2) + ' ' + s2.name);
      await page.screenshot({ path: 'shots/hosted_wind_storm.png' }); await page.evaluate(() => window.__lc.WIND.look(20, -40, 1)); } }
    // the satellites: the live list, and the card still works on it
    const od = await page.evaluate(() => window.__lc.ORBIT.dbg()); ok(od.live && od.want === 1, 'the satellites are where they are this second');
    await page.evaluate(() => window.__lc.ORBIT.pick('ISS (ZARYA)')); let card = '';
    for (let k = 0; k < 24; k++) { await sleep(400); card = await page.evaluate(() => window.__lc.ORBIT.dbg().card || ''); if (/1998-067A/.test(card)) break; } ok(/1998-067A/.test(card) && /MEASURED/i.test(card), 'the space station\'s card on the live list: ' + card.replace(/\n+/g, ' | ').slice(0, 200));
    // a broken orbit list is refused and the old one kept
    const keep = await page.evaluate(() => { const L = window.__lc, n0 = L.LIVE.sats.n, r = L.satsMerge(L.pTLE('nonsense\n1 bad\n2 bad', Date.now()), [], Date.now()); return { r, same: L.LIVE.sats.n === n0 }; });
    ok(!keep.r && keep.same, 'a short or broken orbit list changes nothing');
    all = all.concat(clean(errs).map(e => 'data: ' + e)); await ctx.close(); }

  { console.log('CAMERAS: A LAYER OF THE EARTH (a stand-in for YouTube\'s player)');
    const { page, errs, ctx } = await open(browser, 'phone', { base: BASE, hash: '#live', init: FAKEYT }); await sleep(1500);
    await page.evaluate(() => { window.__lc.GOV.n = -1e9; });
    const D = () => page.evaluate(() => { const L = window.__lc, f = document.getElementById('foot').getBoundingClientRect(); return { d: L.LIVEW.dbg(), w: L.WIND.dbg(), id: L.WORLDS[L.CURI].id, hash: location.hash, data: document.getElementById('data').textContent, yt: window.__yt.slice(), hidden: document.getElementById('vid').hidden, on: document.getElementById('vidbox').classList.contains('on'),
      chips: [...document.querySelectorAll('#themes .lb')].map(b => b.textContent + (b.getAttribute('aria-pressed') === 'true' ? '*' : '')).join(), row: !document.getElementById('themes').hidden, foot: f.top, vw: innerWidth }; });
    let s = null; for (let k = 0; k < 40; k++) { await sleep(400); s = await D(); if (s.d.cams && s.d.air[0] > 3) break; }
    ok(s.id === 'earth' && s.hash === '#earth', 'an old link to #live opens the Earth: ' + s.id);
    ok(s.d.on && s.d.cams >= 70 && s.d.themes.length === 8, 'the cameras came from the Worker, in themes: ' + s.d.cams + ' cameras, ' + s.d.themes.join(' '));
    ok(s.row && s.chips === 'all*,wild,fire,space,city,sea,sky,land,move', 'their themes are a row along the bottom: ' + s.chips);
    ok(s.hidden && s.d.cur < 0 && /all the cameras · \d+ of \d+ on the air now · tap a ring to watch/.test(s.data), 'no window until a ring is tapped; the readout counts them: ' + s.data.replace(/\n/g, ' | '));
    await page.screenshot({ path: 'shots/hosted_cams_0.png' });
    const cdp = await ctx.newCDPSession(page);
    // (lifted straight away: this browser takes most of a second over a frame of the Earth with its video, and a touch held across two
    // such frames reads as more than a tap's 600 ms on the frames' clock; a phone draws a frame in a few hundredths of a second)
    const tap = async (x, y) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
    const swipe = async (x0, x1, y) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y, id: 1 }] }); for (let k = 1; k <= 10; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (x1 - x0) * k / 10, y, id: 1 }] }); await sleep(18); } await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
    // a ring tapped on the globe: its window opens over the Earth (Starbase's ring, the Earth turned to it)
    await page.evaluate(() => window.__lc.WIND.look(26, -97, 1.1)); await sleep(2500); s = await D();
    const mi = s.d.ids.indexOf('starbase'), mq = s.d.marks[mi];
    if (mq && mq[2] > .3) { for (let k = 0; k < 3 && s.d.cur < 0; k++) { await tap(mq[0], mq[1]); await sleep(600); s = await D(); }
      for (let k = 0; k < 40; k++) { await sleep(300); s = await D(); if (s.d.stat === 'live') break; }
      ok(s.d.cur >= 0 && /starbase|labpadre/.test(s.d.id) && !s.hidden && s.d.stat === 'live' && s.on, 'a tap on a camera\'s ring opens its window, and it plays: ' + s.d.id + ' (' + s.d.stat + ')'); }
    else ok(false, 'Starbase\'s ring is not in view');
    ok(s.d.win.x >= 0 && s.d.win.x + s.d.win.w <= s.vw && s.d.win.y + s.d.win.h <= s.foot && s.d.win.w > 160, 'the window sits over the globe, above the rows along the bottom: ' + JSON.stringify(s.d.win) + ' foot ' + s.foot);
    ok(s.data.split('\n').length === 5 && /swipe the window for the next · tap it, bigger · × to close/.test(s.data), 'the readout gives the camera, its hour and light, the satellites above, and what a finger does: ' + s.data.replace(/\n/g, ' | '));
    await page.screenshot({ path: 'shots/hosted_cams_window.png' });
    // a tap on the window: bigger; again: back
    // (clicks for the taps on the window: a touch here is handed to the page a frame at a time, and a frame of this browser can take
    // longer than a tap does, so the lifting of a touch can arrive a whole frame later; a click's two halves come together)
    let wv = s.d.win; await page.mouse.click(wv.x + wv.w * .4, wv.y + wv.h * .6); await sleep(700); s = await D(); ok(s.d.win.big && s.d.win.w > wv.w * 1.4, 'a tap on the window makes it bigger: ' + Math.round(s.d.win.w));
    await page.screenshot({ path: 'shots/hosted_cams_big.png' });
    wv = s.d.win; await page.mouse.click(wv.x + wv.w * .4, wv.y + wv.h * .6); await sleep(700); s = await D(); ok(!s.d.win.big && s.d.cur >= 0, 'and another, smaller again');
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
    // a swipe across the window: to the next camera east, and back west
    await page.evaluate(() => window.__lc.LIVEW.go('namib')); await sleep(1500); s = await D(); wv = s.d.win; const y = wv.y + wv.h / 2;
    await swipe(wv.x + wv.w * .9, wv.x + wv.w * .1, y); await sleep(1200); let s2 = await D(); ok(s2.d.id !== 'namib', 'a swipe to the left across the window goes to the next camera east: ' + s2.d.id);
    wv = s2.d.win; await swipe(wv.x + wv.w * .1, wv.x + wv.w * .9, wv.y + wv.h / 2); await sleep(1200); s2 = await D(); ok(s2.d.id === 'namib' || s2.d.cur < s.d.cur + 3, 'a swipe to the right comes back west: ' + s2.d.id);
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
    wv = s.d.win; await page.mouse.click(wv.x + wv.w - 17, wv.y + 17); await sleep(900); s = await D();
    ok(s.d.cur < 0 && s.hidden && s.yt[s.yt.length - 1] === 'pause', 'the window\'s cross closes it and pauses the stream (' + s.yt.slice(-2).join(', ') + ')');
    // the cameras' layer switched off: rings, themes and window gone
    await page.evaluate(() => window.__lc.LIVEW.go('monterey')); await sleep(800); await page.evaluate(() => document.getElementById('l_cams').click()); await sleep(500); s = await D();
    ok(!s.d.on && s.hidden && !s.row, 'the cameras\' layer put away takes its rings, its themes and its window with it');
    await page.evaluate(() => document.getElementById('l_cams').click()); await sleep(500); s = await D(); ok(s.d.on && s.row, 'and back');
    // leaving the Earth closes the window
    await page.evaluate(() => window.__lc.LIVEW.go('monterey')); await sleep(800); await page.evaluate(() => window.__lc.go(0, true)); await sleep(400); s = await D();
    ok(s.hidden && !s.row, 'leaving the Earth hides the window and the themes');
    await page.evaluate(() => window.__lc.go(1, true)); await sleep(800);
    await page.setViewportSize({ width: 844, height: 390 }); await sleep(1500); await page.evaluate(() => window.__lc.LIVEW.go('starbase')); await sleep(2500); s = await D(); await page.screenshot({ path: 'shots/hosted_cams_turned.png' });
    ok(s.d.win.x + s.d.win.w <= s.vw && s.d.win.y >= 0 && s.d.win.y + s.d.win.h <= s.foot, 'with the phone turned the window still fits: ' + JSON.stringify(s.d.win));
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
