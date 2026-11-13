// The hosted page (HOSTED=1) against the real worker.js, with every upstream played from local files (tools/hostmock.mjs, port 8758).
// Checked: it reads every source through the Worker and takes what is newer; the clouds come onto the globe; the satellites' orbits
// are replaced by the live list; the Live world finds its cameras (by address, by channel, by a search of what is live now), plays one
// full screen (a stand-in for YouTube's player), passes over one that is off the air, goes east and west with a swipe, opens the map
// and goes to a camera tapped there, keeps to a theme, comes closer with two fingers; and,
// where YouTube's player cannot load at all, shows the satellites' live pictures of the whole Earth instead.
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
    const { page, errs, ctx } = await open(browser, 'phone', { base: BASE, hash: '#wind', init: FAKEYT, dsf: 2 }); await sleep(1200);
    await page.evaluate(() => { window.__lc.GOV.n = -1e9; });
    const snap = await page.evaluate(() => new Promise(r => { const t0 = Date.now(); (function w() { const L = window.__lc.LIVE; if (L.sats || Date.now() - t0 > 9000) r({ at: Object.assign({}, L.at), n: L.sats && L.sats.n }); else setTimeout(w, 100); })(); }));
    let s = null; for (let k = 0; k < 40; k++) { await sleep(500); s = await page.evaluate(() => { const L = window.__lc; return { ok: Object.keys(L.PULL.ok).sort(), err: L.PULL.err, at: Object.assign({}, L.LIVE.at), n: L.LIVE.sats && L.LIVE.sats.n, fresh: L.LIVE.sats && L.LIVE.sats.fresh, live: L.LIVE.sats && L.LIVE.sats.live, cloud: L.GLOBE.hasCloud(), hosted: L.HOSTED, worlds: L.WORLDS.map(w => w.id).join() }; }); if (s.ok.length >= 8 && s.cloud) break; }
    ok(s.hosted === 1 && s.worlds === 'smoke,wind,orbit,live', 'the hosted page has the fourth world, Live: ' + s.worlds);
    for (let k = 0; k < 40 && !s.ok.includes('gfs'); k++) { await sleep(500); s.ok = await page.evaluate(() => Object.keys(window.__lc.PULL.ok).sort()); }
    ok(s.ok.join() === 'aurora,clouds,fires,gfs,rain,sats,storms,strikes,wind', 'every source was read through the Worker: ' + s.ok.join() + ' ' + JSON.stringify(s.err));
    { const wx = await page.evaluate(() => { const X = window.__lc.WX, G = window.__lc.GRIB; return { t: X.t2m && G.at(X.t2m, 40, -40), p: X.mslp && G.at(X.mslp, 40, -40), w: X.wave && G.at(X.wave, 40, -40), land: X.wave && G.at(X.wave, 40, -100), j: !!(X.jet && X.jet.u && X.jet.v), hl: X.hl.length }; });
      ok(wx.t > 220 && wx.t < 320 && wx.p > 95000 && wx.p < 106000 && wx.w > 0 && Number.isNaN(wx.land) && wx.j && wx.hl > 4, 'the weather model\'s fields were read on the device (GRIB2): ' + JSON.stringify(wx)); }
    ok(s.live > 8000 && s.n > 15000 && s.fresh > 0, 'the live orbit list (' + s.live + ' element sets) was laid over the snapshot: ' + s.n + ' objects');
    ok(s.at.strikes >= snap.at.strikes && s.at.aurora >= snap.at.aurora && s.at.wind >= snap.at.wind, 'nothing older than the snapshot replaced it');
    ok(s.cloud, 'the clouds are on the globe');
    await page.evaluate(() => window.__lc.WIND.look(12, 130, 1.25)); await sleep(2500);
    const hud = await page.evaluate(() => document.getElementById('data').textContent); ok(/clouds of \d\d:\d\d UTC/.test(hud) && /rain of \d\d:\d\d UTC/.test(hud), 'Wind says when its clouds and its rain are from: ' + hud.replace(/\n/g, ' | '));
    // the jet streams' chip comes once the model's fields are drawn into the globe's picture (a few rows a frame): waited for
    let lyr = ''; for (let k = 0; k < 25; k++) { lyr = await page.evaluate(() => [...document.querySelectorAll('#lyr .lb')].filter(b => !b.hidden).map(b => b.id).join()); if (lyr.split(',').length === 8) break; await sleep(400); } ok(lyr === 'l_wind,l_jet,l_heat,l_pressure,l_waves,l_clouds,l_rain,l_sun', 'all eight layers can be switched: ' + lyr);
    await page.screenshot({ path: 'shots/hosted_wind_clouds.png' });
    await page.evaluate(() => window.__lc.WIND.look(40, -40, 1)); await sleep(1500); await page.screenshot({ path: 'shots/hosted_wind_atlantic.png' });
    for (const k of ['wind', 'rain']) await page.evaluate(k => document.getElementById('l_' + k).click(), k); await sleep(1500); await page.screenshot({ path: 'shots/hosted_wind_clouds_sun.png' });
    for (const k of ['clouds', 'sun']) await page.evaluate(k => document.getElementById('l_' + k).click(), k); await page.evaluate(() => document.getElementById('l_rain').click()); await sleep(1500); await page.screenshot({ path: 'shots/hosted_wind_rain.png' });
    const hud2 = await page.evaluate(() => document.getElementById('data').textContent); ok(!/clouds of/.test(hud2) && /rain of/.test(hud2), 'a layer put away leaves the readout too: ' + hud2.split('\n').pop());
    for (const k of ['wind', 'clouds', 'sun']) await page.evaluate(k => document.getElementById('l_' + k).click(), k);
    // the model's layers: the temperature and the isobars, then the waves and the jet streams (the jet takes the wind's place)
    for (const k of ['heat', 'pressure']) await page.evaluate(k => document.getElementById('l_' + k).click(), k); await sleep(1800); await page.screenshot({ path: 'shots/hosted_wind_heat.png' });
    let h3 = await page.evaluate(() => document.getElementById('data').textContent); ok(/temperature, pressure: NOAA GFS of \d\d:\d\d UTC/.test(h3), 'the readout says what the layers are and when: ' + h3.split('\n').pop());
    for (const k of ['heat', 'pressure', 'waves', 'jet']) await page.evaluate(k => document.getElementById('l_' + k).click(), k); await sleep(2500); await page.screenshot({ path: 'shots/hosted_wind_waves_jet.png' });
    const ly = await page.evaluate(() => window.__lc.WIND.dbg().LY); ok(ly.jet && !ly.wind && ly.waves, 'the jet streams take the wind\'s place: ' + JSON.stringify(ly));
    for (const k of ['waves', 'wind']) await page.evaluate(k => document.getElementById('l_' + k).click(), k);
    // a place tapped: the card with the weather there now, the next day and three days, and the radar
    await page.route(/basemaps\.cartocdn\.com|tilecache\.rainviewer\.com/, r => r.fulfill({ status: 200, contentType: 'image/png', body: require('fs').readFileSync('/home/claude/hello/_work/testdata/rain.png') }));
    // a touch on the dark first, so the hints' ghost fingers are gone and cannot turn the Earth away before the tap
    await page.mouse.click(8, 140); await sleep(300);
    await page.evaluate(() => window.__lc.WIND.look(42, -72, 1.4)); await sleep(1500); { const d = await page.evaluate(() => window.__lc.WIND.dbg()); await page.mouse.click(d.cx, d.cy); }
    let cd = null; for (let k = 0; k < 30; k++) { await sleep(400); cd = await page.evaluate(() => ({ hidden: document.getElementById('card').hidden, t: document.getElementById('card').innerText, radar: !!document.querySelector('#card canvas.cr'), data: document.getElementById('data').textContent })); if (/NOW/.test(cd.t) && cd.radar) break; }
    ok(!cd.hidden && /km from|open sea|, /i.test(cd.t) && /NOW\s+8°C · 47°F/.test(cd.t) && /WIND\s+22 km\/h from northeast/.test(cd.t) && /TODAY 12°\/4°/.test(cd.t) && cd.radar, 'a tap on a place opens its card: ' + cd.t.replace(/\n+/g, ' | ').slice(0, 260));
    ok(/km from \w+|^\w/.test(cd.data.split('\n')[0]) && /°C · \d+ hPa/.test(cd.data), 'and the readout names the place and gives the model\'s figures there: ' + cd.data.replace(/\n/g, ' | '));
    await page.screenshot({ path: 'shots/hosted_wind_card.png' });
    await page.evaluate(() => document.querySelector('#card .cx').click()); await sleep(300); ok(await page.evaluate(() => document.getElementById('card').hidden), 'the card\'s cross puts it away');
    // a storm tapped: the Earth turns to it and comes close
    { const st = await page.evaluate(() => window.__lc.WIND.dbg().storms); if (!st.length) ok(false, 'no storm to tap'); else {
      await page.evaluate(s => window.__lc.WIND.look(s.lat, s.lon + 20, 1), st[0]); await sleep(1200); const p0 = (await page.evaluate(() => window.__lc.WIND.dbg().storms))[0];
      await page.mouse.click(p0.x, p0.y); await sleep(2200); const d2 = await page.evaluate(() => window.__lc.WIND.dbg()), s2 = d2.storms[0];
      ok(d2.zoom > 2.5 && Math.hypot(s2.x - d2.cx, s2.y - d2.cy) < 40 && /km\/h/.test(await page.evaluate(() => document.getElementById('data').textContent)), 'a tap on a storm turns the Earth to it and comes close: ' + d2.zoom.toFixed(2) + ' ' + s2.name);
      await page.screenshot({ path: 'shots/hosted_wind_storm.png' }); await page.evaluate(() => window.__lc.WIND.look(20, -40, 1)); } }
    // Orbit: the live list, and the card still works on it
    await page.evaluate(() => window.__lc.go(2, true)); await sleep(5000);
    const od = await page.evaluate(() => window.__lc.ORBIT.dbg()); ok(od.live && od.want === 1, 'Orbit opens on the present, in real time');
    await page.evaluate(() => window.__lc.ORBIT.pick('ISS (ZARYA)')); await sleep(2500);
    const card = await page.evaluate(() => window.__lc.ORBIT.dbg().card || ''); ok(/1998-067A/.test(card) && /MEASURED/i.test(card), 'the space station\'s card on the live list: ' + card.replace(/\n+/g, ' | ').slice(0, 200));
    // a broken orbit list is refused and the old one kept
    const keep = await page.evaluate(() => { const L = window.__lc, n0 = L.LIVE.sats.n, r = L.satsMerge(L.pTLE('nonsense\n1 bad\n2 bad', Date.now()), [], Date.now()); return { r, same: L.LIVE.sats.n === n0 }; });
    ok(!keep.r && keep.same, 'a short or broken orbit list changes nothing');
    all = all.concat(clean(errs).map(e => 'data: ' + e)); await ctx.close(); }

  { console.log('LIVE: CAMERAS (a stand-in for YouTube\'s player)');
    const { page, errs, ctx } = await open(browser, 'phone', { base: BASE, hash: '#live', init: FAKEYT }); await sleep(1500);
    await page.evaluate(() => { window.__lc.GOV.n = -1e9; });
    const D = () => page.evaluate(() => ({ d: window.__lc.LIVEW.dbg(), data: document.getElementById('data').textContent, yt: window.__yt.slice(), hidden: document.getElementById('vid').hidden, on: document.getElementById('vidbox').classList.contains('on'),
      chips: [...document.querySelectorAll('#themes .lb')].map(b => b.textContent + (b.getAttribute('aria-pressed') === 'true' ? '*' : '')).join(), row: !document.getElementById('themes').hidden, clip: getComputedStyle(document.getElementById('gl')).clipPath }));
    let s = null; for (let k = 0; k < 75; k++) { await sleep(400); s = await D(); if (s.d.stat === 'live') break; } await sleep(500); s = await D();
    ok(s.d.cams >= 70 && s.d.themes.length === 8, 'the cameras came from the Worker, in themes: ' + s.d.cams + ' cameras, ' + s.d.themes.join(' '));
    ok(s.row && s.chips === 'all*,wild,fire,space,city,sea,sky,land,move', 'the themes are a row along the bottom: ' + s.chips);
    ok(!s.hidden && s.d.stat === 'live' && s.on, 'a camera is on the air: ' + s.d.id + ' (' + s.d.kind + ', ' + s.d.stat + ')');
    ok(s.d.kind === 'img' || (s.d.box.w >= 389 && s.d.box.h >= 843), 'the video fills the screen: ' + JSON.stringify(s.d.box));
    ok(s.data.split('\n').length === 4 && (s.d.kind === 'img' || /live/.test(s.data)) && /on the air now · swipe for the next/.test(s.data), 'the readout gives the place, its hour and light, the satellites above, and the theme: ' + s.data.replace(/\n/g, ' | '));
    ok(/circle\(/.test(s.clip) && s.d.g.R < 80 && s.d.g.cx > 300, 'the Earth is a small round window in the corner: ' + s.clip + ' ' + JSON.stringify(s.d.g));
    await sleep(3500); s = await D(); ok(s.d.over && s.d.over.n > 100, 'satellites above its horizon were counted from the orbits: ' + (s.d.over && s.d.over.n));
    await page.screenshot({ path: 'shots/hosted_live_0.png' });
    // to a named camera; the stream address the Worker found is the one played
    await page.evaluate(() => window.__lc.LIVEW.go('starbase')); for (let k = 0; k < 30; k++) { await sleep(300); s = await D(); if (s.d.stat === 'live' && s.d.yt) break; }
    ok(s.d.id === 'starbase' && s.d.yt === 'STARBASE001' && s.d.stat === 'live', 'a channel\'s stream is found by the Worker and played: ' + s.d.yt);
    ok(/Starbase · Boca Chica, Texas/.test(s.data) && /by the Sun/.test(s.data), 'Starbase reads as itself: ' + s.data.replace(/\n/g, ' | ')); await page.screenshot({ path: 'shots/hosted_live_starbase.png' });
    // found by a search of what is live now: the looped film and the stream that may not be played elsewhere are passed over
    await page.evaluate(() => window.__lc.LIVEW.go('polarbears')); for (let k = 0; k < 40; k++) { await sleep(300); s = await D(); if (s.d.id === 'polarbears' && s.d.stat === 'live' && s.d.yt) break; }
    ok(s.d.yt === 'POLARBEAR01' && s.d.stat === 'live', 'a camera whose address changed is found by a search, past a looped film and a stream that may not be shown here: ' + s.d.yt);
    // off the air: passed over
    await page.evaluate(() => window.__lc.LIVEW.go('sakurajima')); await sleep(700); s = await D(); const was = s.d.stat;
    for (let k = 0; k < 40; k++) { await sleep(300); s = await D(); if (s.d.id !== 'sakurajima' && s.d.stat === 'live') break; }
    ok(was === 'off' || was === 'finding' || s.d.bad.includes('sakurajima'), 'a camera off the air is marked so (' + was + ')'); ok(s.d.id !== 'sakurajima' && s.d.stat === 'live', 'and passed over: now ' + s.d.id);
    // a swipe: to the next camera east, and back west
    const cdp = await ctx.newCDPSession(page);
    const swipe = async (x0, x1, y) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y, id: 1 }] }); for (let k = 1; k <= 10; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (x1 - x0) * k / 10, y, id: 1 }] }); await sleep(18); } await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
    const tap = async (x, y) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] }); await sleep(50); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
    await page.evaluate(() => window.__lc.LIVEW.go('namib')); await sleep(1200); s = await D(); const y = 420;
    await swipe(300, 90, y); await sleep(1200); let s2 = await D(); ok(s2.d.id !== 'namib', 'a swipe to the left goes to the next camera east: ' + s2.d.id);
    await swipe(90, 300, y); await sleep(1200); s2 = await D(); ok(s2.d.id === 'namib' || s2.d.cur < s.d.cur + 3, 'a swipe to the right comes back west: ' + s2.d.id);
    // the map: a tap on the small Earth opens it; a tap on a camera there goes to it; a tap off the Earth closes it (from Starbase,
    // with cameras on the air in the stand-in around it)
    await page.evaluate(() => window.__lc.LIVEW.go('starbase')); await sleep(1500);
    s = await D(); await tap(s.d.g.cx, s.d.g.cy); await sleep(1400); s = await D();
    ok(s.d.map && s.d.g.R > 120 && /tap one to go there/.test(s.data), 'a tap on the small Earth opens the map: ' + Math.round(s.d.g.R) + ' | ' + s.data.replace(/\n/g, ' | '));
    await page.screenshot({ path: 'shots/hosted_live_map.png' });
    // the map turns to the camera it opened on: the marks are read again once it has come to rest, and a mark with no other near it
    // is the one tapped, of a camera on the air (the space station's mark moves by itself; a camera off the air would be passed over)
    for (let k = 0; k < 20; k++) { await sleep(300); const s3 = await D(); const mv = s3.d.marks.reduce((m, q, i) => q && s.d.marks[i] ? Math.max(m, Math.hypot(q[0] - s.d.marks[i][0], q[1] - s.d.marks[i][1])) : m, 0); s = s3; if (mv < 1.5) break; }
    const vis = s.d.marks.map((q, i) => q && q[2] > .3 ? i : -1).filter(i => i >= 0);
    const mi = s.d.marks.findIndex((q, i) => q && q[2] > .3 && i !== s.d.cur && s.d.onair.includes(s.d.ids[i]) && s.d.ids[i] !== 'iss' && s.d.ids[i] !== 'nasa-iss' && Math.hypot(q[0] - s.d.g.cx, q[1] - s.d.g.cy) < s.d.g.R * .8 && vis.every(j => j === i || Math.hypot(q[0] - s.d.marks[j][0], q[1] - s.d.marks[j][1]) > 16));
    if (mi >= 0) { await tap(s.d.marks[mi][0], s.d.marks[mi][1]); await sleep(1500); s2 = await D(); ok(s2.d.cur === mi && !s2.d.map, 'a tap on a camera on the map goes to it and closes the map: ' + s.d.ids[mi] + ' -> ' + s2.d.id + (s2.d.map ? ' (the map still open)' : '')); }
    else ok(false, 'no other camera\'s mark in view to tap');
    await page.evaluate(() => window.__lc.LIVEW.map(false)); await sleep(900);
    s = await D(); await tap(s.d.g.cx, s.d.g.cy); await sleep(1200); s = await D(); await tap(20, 300); await sleep(1200); s2 = await D(); ok(s.d.map && !s2.d.map, 'a tap off the Earth closes the map');
    // a theme: the space cameras
    await page.evaluate(() => document.getElementById('th_space').click()); for (let k = 0; k < 30; k++) { await sleep(300); s = await D(); if (s.d.stat === 'live') break; }
    ok(s.d.th === 'space' && /^(iss|nasa-iss|starbase|labpadre|canaveral|goes-east|goes-west)$/.test(s.d.id) && /space ·/.test(s.data), 'a theme: only its cameras: ' + s.d.id + ' | ' + s.data.split('\n')[3]);
    await page.evaluate(() => document.getElementById('th_all').click()); await sleep(300);
    // two fingers: closer
    s = await D(); const cx = 195, cy2 = 420;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx - 30, y: cy2, id: 1 }, { x: cx + 30, y: cy2, id: 2 }] });
    for (let k = 1; k <= 12; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx - 30 - k * 6, y: cy2, id: 1 }, { x: cx + 30 + k * 6, y: cy2, id: 2 }] }); await sleep(18); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); s = await D(); ok(s.d.zoom > 1.4, 'spreading two fingers brings the picture closer: ' + s.d.zoom.toFixed(2));
    // the space station: the camera moves with it
    await page.evaluate(() => window.__lc.LIVEW.go('iss')); await sleep(1500); s = await D(); ok(s.d.iss && /over \d+\.\d°[NS] \d+\.\d°[EW] · \d{3} km up · 27,\d{3} km\/h/.test(s.data), 'the space station camera reads where the station is: ' + s.data.split('\n')[1]);
    await page.screenshot({ path: 'shots/hosted_live_iss.png' });
    // a still: the whole Earth from GOES-19
    await page.evaluate(() => window.__lc.LIVEW.go('goes-east')); await sleep(2000); s = await D(); ok(s.d.img && s.d.stat === 'live' && /picture of \d+ \w+ \d\d:\d\d UTC/.test(s.data), 'the GOES-19 picture of the whole Earth: ' + s.data.replace(/\n/g, ' | '));
    await page.screenshot({ path: 'shots/hosted_live_goes.png' });
    // leaving pauses the stream, coming back plays it
    await page.evaluate(() => window.__lc.LIVEW.go('monterey')); await sleep(1200); await page.evaluate(() => window.__lc.go(0, true)); await sleep(400); s = await D();
    ok(s.hidden && s.yt[s.yt.length - 1] === 'pause' && !s.row, 'leaving Live hides the video and the themes and pauses the stream');
    await page.evaluate(() => window.__lc.go(3, true)); await sleep(600); s = await D(); ok(!s.hidden && s.yt[s.yt.length - 1] === 'play', 'coming back plays it again');
    await page.setViewportSize({ width: 844, height: 390 }); await sleep(1500); await page.screenshot({ path: 'shots/hosted_live_turned.png' });
    s = await D(); ok(s.d.box.w >= 843 && s.d.box.h >= 389 && s.d.g.cx > 700, 'with the phone turned the video still fills the screen, the Earth in its corner: ' + JSON.stringify(s.d.box) + ' ' + JSON.stringify(s.d.g));
    all = all.concat(clean(errs).map(e => 'live: ' + e)); await ctx.close(); }

  { console.log('LIVE WITHOUT YOUTUBE (its player cannot load)');
    const { page, errs, ctx } = await open(browser, 'desk', { base: BASE, hash: '#live' }); await page.route(/youtube\.com/, r => r.abort());
    let s = null; for (let k = 0; k < 40; k++) { await sleep(400); s = await page.evaluate(() => ({ d: window.__lc.LIVEW.dbg(), data: document.getElementById('data').textContent })); if (s.d.stat === 'live') break; }
    ok(s.d.stat === 'live' && s.d.kind === 'img', 'the satellites\' pictures of the whole Earth are shown instead: ' + s.d.id + ' | ' + s.data.replace(/\n/g, ' | '));
    await page.screenshot({ path: 'shots/hosted_live_desk_noyt.png' });
    all = all.concat(clean(errs).map(e => 'noyt: ' + e)); await ctx.close(); }
  await browser.close(); all = [...new Set(all)]; if (all.length) console.log('ERRORS', all.slice(0, 10));
  console.log(fail.length || all.length ? 'HOSTED FAILED (' + (fail.length + all.length) + ')' : 'HOSTED OK'); process.exit(fail.length || all.length ? 1 : 0);
})();
