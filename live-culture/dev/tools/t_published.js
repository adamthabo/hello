// opens the page exactly as it is published (the bytes read back from the artifact, no test hook) and uses it the way a person would
const { launch, open } = require('./lib'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const fail = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fail.push(m); };
(async () => { const browser = await launch(); const { page, errs, ctx } = await open(browser, 'phone', { file: 'published.html' }); await sleep(2500);
  // the picture is sampled inside a frame, straight after the page has drawn it (afterwards the graphics chip's canvas is wiped)
  const look = () => page.evaluate(() => new Promise(done => requestAnimationFrame(() => { const g = document.getElementById('gl'), o = document.getElementById('ov'); const c = document.createElement('canvas'); c.width = 64; c.height = 128; const x = c.getContext('2d'); x.drawImage(g, 0, 0, 64, 128); x.drawImage(o, 0, 0, 64, 128); const d = x.getImageData(0, 0, 64, 128).data; let lit = 0; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 60) lit++;
    const s = document.getElementById('bSound'); done({ world: document.getElementById('wname').textContent, data: document.getElementById('data').textContent.replace(/\n/g, ' | '), lit, music: s.getAttribute('aria-pressed'), waiting: s.classList.contains('wait'), hash: location.hash, hook: typeof window.__lc, save: !document.getElementById('bSave').hidden }); })));
  let s = await look(); ok(s.world === 'Smoke' && s.hook === 'undefined' && s.music === 'false', 'opens on Smoke, silent, with no test hook: ' + s.data);
  await page.screenshot({ path: 'shots/published_0.png' });
  await page.mouse.move(120, 300); await page.mouse.down(); for (let k = 0; k < 30; k++) { await page.mouse.move(120 + k * 6, 300 + 120 * Math.sin(k * .3)); await sleep(16); } await page.mouse.up(); await sleep(2500);
  s = await look(); ok(s.music === 'true' && !s.waiting, 'the first touch starts the band (the note lit, playing)'); ok(s.lit > 150, 'the smoke is in the water after the stroke (' + s.lit + ' of 8192 sample points lit)');
  ok(await page.evaluate(() => document.querySelectorAll('#dots .dot').length === 9 && !document.getElementById('dotrow').classList.contains('off')), 'the nine players\' circles are there and awake');
  const names = ['Smoke', 'Wind', 'Orbit'], ids = ['smoke', 'wind', 'orbit'];
  for (let i = 1; i < 3; i++) { await page.click('#w_' + ids[i]); await sleep(6500); s = await look(); ok(s.world === names[i] && s.hash === '#' + ids[i] && s.lit > 8 && s.data.length > 8, names[i] + ': ' + s.data + ' (' + s.lit + ' lit)'); await page.screenshot({ path: 'shots/published_' + i + '.png' }); }
  ok(/fires seen from orbit/.test(await page.evaluate(() => { document.getElementById('w_wind').click(); return new Promise(r => setTimeout(() => r(document.getElementById('data').textContent), 2500)); })), 'Wind counts the fires');
  // Orbit: a tap on a satellite brings up its card, filled from the catalogue published beside the page
  await page.click('#w_orbit'); await sleep(3000); let card = null;
  for (const [x, y] of [[195, 400], [150, 380], [240, 420], [195, 330], [170, 450], [230, 360]]) { await page.mouse.click(x, y); await sleep(700); card = await page.evaluate(() => { const c = document.getElementById('card'); return c.hidden ? null : c.innerText; }); if (card) break; }
  for (let k = 0; k < 20 && card && !/LAUNCHED/i.test(card); k++) { await sleep(300); card = await page.evaluate(() => document.getElementById('card').innerText); }
  ok(card && /CATALOGUE/i.test(card) && /LAUNCHED/i.test(card) && /NOW OVER/i.test(card) && /km up/.test(card), 'a tapped satellite shows its card: ' + String(card).replace(/\n+/g, ' | ').slice(0, 300)); await page.screenshot({ path: 'shots/published_card.png' });
  await page.click('#bSound'); await sleep(500); s = await look(); ok(s.music === 'false', 'the note turns the music off');
  const clean = [...new Set(errs)]; if (clean.length) console.log('ERRORS', clean.slice(0, 8));
  await ctx.close(); await browser.close(); console.log(fail.length || clean.length ? 'PUBLISHED FAILED' : 'PUBLISHED OK'); process.exit(fail.length || clean.length ? 1 : 0); })();
