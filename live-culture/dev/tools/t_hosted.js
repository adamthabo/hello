// The hosted page (HOSTED=1) against the real worker.js, with every upstream played from local files (tools/hostmock.mjs, port 8758).
// Checked: it reads every source through the Worker and takes what is newer; the clouds come onto the globe; the satellites' orbits
// are replaced by the live list; the Live world finds its cameras, plays one (a stand-in for YouTube's player), passes over one
// that is off the air, goes east and west with a swipe and to a camera tapped on the globe, comes closer with two fingers; and,
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
    ok(s.ok.join() === 'aurora,clouds,fires,rain,sats,storms,strikes,wind', 'every source was read through the Worker: ' + s.ok.join() + ' ' + JSON.stringify(s.err));
    ok(s.live > 8000 && s.n > 15000 && s.fresh > 0, 'the live orbit list (' + s.live + ' element sets) was laid over the snapshot: ' + s.n + ' objects');
    ok(s.at.strikes >= snap.at.strikes && s.at.aurora >= snap.at.aurora && s.at.wind >= snap.at.wind, 'nothing older than the snapshot replaced it');
    ok(s.cloud, 'the clouds are on the globe');
    await page.evaluate(() => window.__lc.WIND.look(12, 130, 1.25)); await sleep(2500);
    const hud = await page.evaluate(() => document.getElementById('data').textContent); ok(/clouds of \d\d:\d\d UTC/.test(hud) && /rain of \d\d:\d\d UTC/.test(hud), 'Wind says when its clouds and its rain are from: ' + hud.replace(/\n/g, ' | '));
    const lyr = await page.evaluate(() => [...document.querySelectorAll('#lyr .lb')].filter(b => !b.hidden).map(b => b.id).join()); ok(lyr === 'l_wind,l_clouds,l_rain,l_sun', 'all four layers can be switched: ' + lyr);
    await page.screenshot({ path: 'shots/hosted_wind_clouds.png' });
    await page.evaluate(() => window.__lc.WIND.look(40, -40, 1)); await sleep(1500); await page.screenshot({ path: 'shots/hosted_wind_atlantic.png' });
    for (const k of ['wind', 'rain']) await page.evaluate(k => document.getElementById('l_' + k).click(), k); await sleep(1500); await page.screenshot({ path: 'shots/hosted_wind_clouds_sun.png' });
    for (const k of ['clouds', 'sun']) await page.evaluate(k => document.getElementById('l_' + k).click(), k); await page.evaluate(() => document.getElementById('l_rain').click()); await sleep(1500); await page.screenshot({ path: 'shots/hosted_wind_rain.png' });
    const hud2 = await page.evaluate(() => document.getElementById('data').textContent); ok(!/clouds of/.test(hud2) && /rain of/.test(hud2), 'a layer put away leaves the readout too: ' + hud2.split('\n').pop());
    for (const k of ['wind', 'clouds', 'sun']) await page.evaluate(k => document.getElementById('l_' + k).click(), k);
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
    const D = () => page.evaluate(() => ({ d: window.__lc.LIVEW.dbg(), data: document.getElementById('data').textContent, yt: window.__yt.slice(), hidden: document.getElementById('vid').hidden, on: document.getElementById('vidbox').classList.contains('on') }));
    let s = null; for (let k = 0; k < 30; k++) { await sleep(400); s = await D(); if (s.d.stat === 'live') break; } await sleep(500); s = await D();
    ok(s.d.cams === 10, 'the cameras came from the Worker: ' + s.d.cams); ok(!s.hidden && s.d.stat === 'live' && s.on, 'a camera is on the air in its window: ' + s.d.id + ' (' + s.d.kind + ', ' + s.d.stat + ')');
    ok(s.data.split('\n').length === 3 && (s.d.kind === 'img' || /live/.test(s.data)), 'the readout gives the place, its hour and light, the satellites above: ' + s.data.replace(/\n/g, ' | '));
    await sleep(3500); s = await D(); ok(s.d.over && s.d.over.n > 100, 'satellites above its horizon were counted from the orbits: ' + (s.d.over && s.d.over.n));
    await page.screenshot({ path: 'shots/hosted_live_0.png' });
    // to a named camera; the stream address the Worker found is the one played
    await page.evaluate(() => window.__lc.LIVEW.go('starbase')); for (let k = 0; k < 20; k++) { await sleep(300); s = await D(); if (s.d.stat === 'live') break; }
    ok(s.d.id === 'starbase' && s.d.yt === 'STARBASE001' && s.d.stat === 'live', 'a channel\'s stream is found by the Worker and played: ' + s.d.yt);
    ok(/Starbase · Boca Chica, Texas/.test(s.data) && /by the Sun/.test(s.data), 'Starbase reads as itself: ' + s.data.replace(/\n/g, ' | ')); await page.screenshot({ path: 'shots/hosted_live_starbase.png' });
    // off the air: passed over
    await page.evaluate(() => window.__lc.LIVEW.go('sakurajima')); await sleep(700); s = await D(); const was = s.d.stat;
    for (let k = 0; k < 20; k++) { await sleep(300); s = await D(); if (s.d.id !== 'sakurajima' && s.d.stat === 'live') break; }
    ok(was === 'off' || s.d.bad.includes('sakurajima'), 'a camera off the air is marked so (' + was + ')'); ok(s.d.id !== 'sakurajima' && s.d.stat === 'live', 'and passed over: now ' + s.d.id);
    // a swipe: to the next camera east, and back west
    const cdp = await ctx.newCDPSession(page);
    const swipe = async (x0, x1, y) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y, id: 1 }] }); for (let k = 1; k <= 10; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (x1 - x0) * k / 10, y, id: 1 }] }); await sleep(18); } await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
    const tap = async (x, y) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] }); await sleep(50); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
    await page.evaluate(() => { const W = window.__lc.LIVEW, o = W.up; window.__ups = []; W.up = function (p) { window.__ups.push([Math.round(p.x0), Math.round(p.x), Math.round(p.y), p.ghost, Math.round(performance.now() - p.t0)]); return o(p); }; });
    await page.evaluate(() => window.__lc.LIVEW.go('namib')); await sleep(1200); s = await D(); const y = s.d.box.y + s.d.box.h * .5;
    await swipe(300, 90, y); await sleep(1200); let s2 = await D(); ok(s2.d.id !== 'namib', 'a swipe to the left goes to the next camera east: ' + s2.d.id + ' ' + JSON.stringify(await page.evaluate(() => [window.__ups, window.__lc.errs.slice(0, 3)])) + ' y=' + y);
    await swipe(90, 300, y); await sleep(1200); s2 = await D(); ok(s2.d.id === 'namib' || s2.d.id === 'goes-east', 'a swipe to the right comes back west: ' + s2.d.id);
    // a tap on another camera's mark on the globe
    s = await D(); const mi = s.d.marks.findIndex((q, i) => q && q[2] > .3 && i !== s.d.cur && Math.hypot(q[0] - s.d.g.cx, q[1] - s.d.g.cy) < s.d.g.R * .9);
    if (mi >= 0) { await tap(s.d.marks[mi][0], s.d.marks[mi][1]); await sleep(1500); s2 = await D(); ok(s2.d.cur === mi, 'a tap on a mark on the globe goes to that camera: ' + s2.d.id); }
    else ok(false, 'no other camera\'s mark in view to tap');
    // two fingers: closer
    s = await D(); const cx = s.d.box.x + s.d.box.w / 2, cy2 = s.d.box.y + s.d.box.h / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx - 30, y: cy2, id: 1 }, { x: cx + 30, y: cy2, id: 2 }] });
    for (let k = 1; k <= 12; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx - 30 - k * 6, y: cy2, id: 1 }, { x: cx + 30 + k * 6, y: cy2, id: 2 }] }); await sleep(18); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); s = await D(); ok(s.d.zoom > 1.4, 'spreading two fingers brings the window closer: ' + s.d.zoom.toFixed(2));
    // the space station: the camera moves with it
    await page.evaluate(() => window.__lc.LIVEW.go('iss')); await sleep(1500); s = await D(); ok(s.d.iss && /over \d+\.\d°[NS] \d+\.\d°[EW] · \d{3} km up · 27,\d{3} km\/h/.test(s.data), 'the space station camera reads where the station is: ' + s.data.split('\n')[1]);
    await page.screenshot({ path: 'shots/hosted_live_iss.png' });
    // a still: the whole Earth from GOES-19
    await page.evaluate(() => window.__lc.LIVEW.go('goes-east')); await sleep(2000); s = await D(); ok(s.d.img && s.d.stat === 'live' && /picture of \d+ \w+ \d\d:\d\d UTC/.test(s.data), 'the GOES-19 picture of the whole Earth: ' + s.data.replace(/\n/g, ' | '));
    await page.screenshot({ path: 'shots/hosted_live_goes.png' });
    // leaving pauses the stream, coming back plays it
    await page.evaluate(() => window.__lc.LIVEW.go('monterey')); await sleep(1200); await page.evaluate(() => window.__lc.go(0, true)); await sleep(400); s = await D();
    ok(s.hidden && s.yt[s.yt.length - 1] === 'pause', 'leaving Live hides the window and pauses the stream');
    await page.evaluate(() => window.__lc.go(3, true)); await sleep(600); s = await D(); ok(!s.hidden && s.yt[s.yt.length - 1] === 'play', 'coming back plays it again');
    await page.setViewportSize({ width: 844, height: 390 }); await sleep(1500); await page.screenshot({ path: 'shots/hosted_live_turned.png' });
    s = await D(); ok(s.d.box.x + s.d.box.w / 2 < s.d.g.cx - s.d.g.R, 'with the phone turned the window stands beside the Earth: ' + JSON.stringify(s.d.box) + ' ' + JSON.stringify(s.d.g));
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
