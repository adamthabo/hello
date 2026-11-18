// (18 Nov, 11:31: "Also, give me access to localized weather") the Earth's own menu, in the artifact's build: a town or city found by
// its name (7,342 of them, Providence among them), gone to and read; keys typed into the box are the box's; Enter takes the first; a
// name that is no town says so; no "where I am" (the artifact cannot know where the phone is); whole at the Claude app's height.
// (On the site, "where I am" and the weather card: tools/t_hosted.js.)
// usage: node tools/t_weather.js
const { launch, open } = require('./lib'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const fail = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fail.push(m); };
const d180 = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
(async () => {
  const browser = await launch(); const { page, errs, ctx } = await open(browser, 'phone'); await sleep(1500);
  await page.evaluate(() => { const L = window.__lc; L.GOV.n = -1e9; L.go(L.WORLDS.findIndex(w => w.id === 'earth'), true); }); await sleep(1500);
  const vis = id => page.evaluate(id => { const e = document.getElementById(id); return !!e && !e.hidden && e.getClientRects().length > 0; }, id);
  // the Earth has its own menu now: the button beside the name, the page's name over it, a box for a town and nothing of another page's
  ok(await vis('bTools') && await page.evaluate(() => document.getElementById('bTools').getAttribute('aria-label')) === 'Earth: its own menu', 'the Earth has its own menu, from the button beside its name');
  await page.tap('#bTools'); await sleep(400);
  const m = await page.evaluate(() => { const v = e => !!e && !e.hidden && e.getClientRects().length > 0, s = document.getElementById('ms_earth');
    return { title: document.getElementById('pmh').textContent, open: v(document.getElementById('pmenu')), head: s.querySelector('.mh').textContent, box: v(document.getElementById('e_town')), here: !!document.getElementById('e_here'),
      others: [...document.querySelectorAll('#pmenu .msec')].filter(x => v(x)).map(x => x.id).join() }; });
  ok(m.open && m.title === 'Earth' && m.head === 'go to a town or city' && m.box && !m.here && m.others === 'ms_earth', 'its menu: the Earth\'s name, "go to a town or city" and a box for its name; no "where I am" here (the artifact cannot know where the phone is): ' + JSON.stringify(m));
  // keys typed into the box are the box's: a "2" does not open the second page, a space does not start the music
  await page.tap('#e_town'); const snd0 = await page.evaluate(() => window.__lc.soundLive()); await page.keyboard.type('2 ', { delay: 60 }); await sleep(300);
  const k = await page.evaluate(() => ({ cur: window.__lc.WORLDS[window.__lc.CURI].id, v: document.getElementById('e_town').value, snd: window.__lc.soundLive(), open: !document.getElementById('pmenu').hidden }));
  ok(k.cur === 'earth' && k.v === '2 ' && k.snd === snd0 && k.open, 'keys typed into the box are the box\'s (a "2" opens no page, a space starts no music): ' + JSON.stringify(k));
  await page.fill('#e_town', 'qqqzz'); await sleep(250);
  ok(await page.evaluate(() => document.getElementById('e_said').textContent) === 'no town or city of that name' && await page.evaluate(() => document.querySelectorAll('#e_found button').length) === 0, 'a name that is no town says so');
  await page.fill('#e_town', ''); await page.keyboard.type('provid', { delay: 40 }); await sleep(300);
  const f = await page.evaluate(() => [...document.querySelectorAll('#e_found button')].map(b => b.textContent));
  ok(f[0] === 'Providence · United States' && f.length >= 2, 'typed "provid": Providence first (the bigger first): ' + f.join(' | '));
  await page.screenshot({ path: 'shots/weather_menu.png' });
  // gone to: the menu closes, the Earth flies there and comes close, and reads it
  await page.tap('#e_t0'); await sleep(2400);
  const g = await page.evaluate(() => { const d = window.__lc.WIND.dbg(); return { lat0: d.lat0, lon0: d.lon0, zoom: d.zoom, probe: d.probe && { lat: d.probe.lat, lon: d.probe.lon, ghost: d.probe.ghost }, data: document.getElementById('data').textContent, open: !document.getElementById('pmenu').hidden }; });
  ok(!g.open && Math.abs(g.lat0 - 41.82) < .6 && d180(g.lon0, -71.42) < .6 && g.zoom >= 2.5 && g.probe && Math.abs(g.probe.lat - 41.82) < .01 && !g.probe.ghost,
    'Providence chosen: the menu closes, the Earth flies there and comes close: ' + JSON.stringify({ lat0: +g.lat0.toFixed(2), lon0: +g.lon0.toFixed(2), zoom: +g.zoom.toFixed(2) }));
  ok(/^Providence, United States/.test(g.data) && /by the Sun/.test(g.data) && /wind \d+ km\/h/.test(g.data), 'and reads it: its name, its sun and its wind (what the artifact has): ' + g.data.replace(/\n/g, ' | ').slice(0, 160));
  await page.screenshot({ path: 'shots/weather_there.png' });
  // Enter takes the first found
  await page.tap('#bTools'); await sleep(300); await page.tap('#e_town'); await page.keyboard.type('durban', { delay: 40 }); await page.keyboard.press('Enter'); await sleep(2400);
  const h = await page.evaluate(() => ({ data: document.getElementById('data').textContent, open: !document.getElementById('pmenu').hidden, lat0: window.__lc.WIND.dbg().lat0 }));
  ok(!h.open && /^Durban, South Africa/.test(h.data) && Math.abs(h.lat0 - -29.86) < .6, 'Enter takes the first found (Durban): ' + h.data.split('\n')[0]);
  // the Claude app's height: the menu and what it found on the screen
  await page.setViewportSize({ width: 390, height: 750 }); await sleep(800); await page.tap('#bTools'); await sleep(300); await page.tap('#e_town'); await page.keyboard.type('san', { delay: 40 }); await sleep(300);
  const fit = await page.evaluate(() => { const r = document.getElementById('pmenu').getBoundingClientRect(), b = [...document.querySelectorAll('#e_found button')].map(x => x.getBoundingClientRect());
    return { top: r.top, bottom: r.bottom, ih: innerHeight, n: b.length, inside: b.every(q => q.left >= r.left && q.right <= r.right + .5 && q.bottom <= r.bottom + .5) }; });
  ok(fit.n === 6 && fit.bottom <= fit.ih && fit.inside, 'at 390x750 the menu and the six towns found are whole: ' + JSON.stringify(fit));
  await page.screenshot({ path: 'shots/weather_750.png' });
  const e = [...new Set(errs)]; if (e.length) console.log('ERRORS', e.slice(0, 6));
  await ctx.close(); await browser.close(); console.log(fail.length || e.length ? 'WEATHER FAILED' : 'WEATHER OK'); process.exit(fail.length || e.length ? 1 : 0);
})();
