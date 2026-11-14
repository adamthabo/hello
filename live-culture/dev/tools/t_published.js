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
  ok(await page.evaluate(() => { const b = document.getElementById('bSound'), r = b.getBoundingClientRect(); return !document.querySelector('#dotrow,.dot') && !!b.closest('header') && r.top < 60 && r.right > innerWidth - 60 && getComputedStyle(b.querySelector('.sl')).display === 'none'; }), 'the music is one small button at the top right, lit, and there are no circles');
  // the Earth: the weather, the fires and the satellites
  await page.click('#w_earth'); await sleep(6500); s = await look();
  ok(s.world === 'Earth' && s.hash === '#earth' && s.lit > 8 && /fires seen from orbit/.test(s.data) && /satellites, where they are now/.test(s.data), 'Earth: ' + s.data + ' (' + s.lit + ' lit)'); await page.screenshot({ path: 'shots/published_1.png' });
  ok(await page.evaluate(() => [...document.querySelectorAll('#lyr .lb')].filter(b => !b.hidden).map(b => b.id).join() === 'l_sats,l_wind,l_sun' && !document.getElementById('lyr').hidden), 'the Earth has its layer switches (the satellites, the wind and the Sun here)');
  // a tap on a satellite brings up its card, filled from the catalogue published beside the page (the Earth pulled back first, so the swarm is round it)
  for (let k = 0; k < 8; k++) { await page.mouse.move(195, 420); await page.mouse.wheel(0, 260); await sleep(120); } await sleep(1500); let card = null;
  for (const [x, y] of [[195, 300], [150, 330], [240, 310], [195, 520], [120, 450], [270, 470], [100, 380], [290, 360], [195, 250], [160, 560]]) { await page.mouse.click(x, y); await sleep(800); card = await page.evaluate(() => { const c = document.getElementById('card'); return c.hidden ? null : c.innerText; }); if (card) break; }
  for (let k = 0; k < 20 && card && !/LAUNCHED/i.test(card); k++) { await sleep(300); card = await page.evaluate(() => document.getElementById('card').innerText); }
  ok(card && /CATALOGUE/i.test(card) && /LAUNCHED/i.test(card) && /NOW OVER/i.test(card) && /km up/.test(card), 'a tapped satellite shows its card: ' + String(card).replace(/\n+/g, ' | ').slice(0, 300)); await page.screenshot({ path: 'shots/published_card.png' });
  // the mixer
  await page.click('#w_mix'); await sleep(1500); s = await look();
  ok(s.world === 'Mix' && s.hash === '#mix' && /^tap a loop: in on the next bar, in time and key/.test(s.data) && await page.evaluate(() => !document.getElementById('mix').hidden && document.querySelectorAll('#mix .mxc').length === 70 && [...document.querySelectorAll('#mix .mxt')].map(b => b.textContent).join() === 'band,machine'), 'Mix, a grid of loops and two tabs: ' + s.data);
  // a loop of a player not playing yet (the band left to itself has brought players in, and the mixer took them over where they were)
  const li = await page.evaluate(() => { const g = [...document.querySelectorAll('#mix .mxg:not([hidden]) .mxc:not(.mxsc)')]; for (let c = 0; c < 9; c++) if (![0, 1, 2, 3].some(r => /\b(on|wait|stopping)\b/.test(g[r * 9 + c].className))) return 9 + c; return -1; });
  if (li >= 0) { await page.click('#mix .mxg:not([hidden]) .mxc >> nth=' + li); await sleep(3500); }
  const lit = i => page.evaluate(i => [...document.querySelectorAll('#mix .mxg:not([hidden]) .mxc')][i].classList.contains('on'), i);
  ok(li >= 0 && await lit(li), 'a loop tapped comes in on the next bar (loop ' + li + ')'); await page.screenshot({ path: 'shots/published_2.png' });
  // Smoke: its tools and its game; the loop set in the mixer is still playing when the mixer is opened again
  ok(await page.evaluate(() => { document.getElementById('w_smoke').click(); return new Promise(r => setTimeout(() => r(!document.getElementById('tools').hidden && document.querySelectorAll('#tools .tb').length === 9), 900)); }), 'Smoke has its tools');
  s = await look(); ok(s.music === 'true', 'and the music plays on in Smoke');
  await page.click('#t_puz'); await sleep(1500); ok(/^get the cyan smoke into the cyan ring\nyou can place 2 walls, then press release\n/.test(await page.evaluate(() => document.getElementById('data').textContent)) && await page.evaluate(() => document.getElementById('t_puz').firstChild.textContent) === 'new', 'play starts a round, with three plain lines of what to do'); await page.screenshot({ path: 'shots/published_round.png' });
  await page.click('#t_undo'); await sleep(300);
  await page.click('#w_mix'); await sleep(900); ok(li >= 0 && await lit(li), 'back in the mixer, the loop is still playing'); await page.click('#w_smoke'); await sleep(600);
  await page.click('#bSound'); await sleep(500); s = await look(); ok(s.music === 'false', 'the note turns the music off');
  const clean = [...new Set(errs)]; if (clean.length) console.log('ERRORS', clean.slice(0, 8));
  await ctx.close(); await browser.close(); console.log(fail.length || clean.length ? 'PUBLISHED FAILED' : 'PUBLISHED OK'); process.exit(fail.length || clean.length ? 1 : 0); })();
