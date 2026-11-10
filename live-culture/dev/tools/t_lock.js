// An iPhone starts no sound on a stroke, only on a plain tap. This test plays that phone: the sound is held back until the test lets it go.
// Checked: the music's note is never lit over silence; a finger is drawn tapping the middle; a touch on the note tries to start the music
// (never turns off what cannot be heard); the first allowed tap starts the band; the page stops asking if taps do not free the sound.
const { launch, open } = require('./lib'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const fail = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fail.push(m); };
const hold = () => { window.__allow = false; const AC = window.AudioContext, R = AC.prototype.resume;
  AC.prototype.resume = function () { return window.__allow ? R.call(this) : Promise.resolve(); };
  window.AudioContext = function (o) { const c = new AC(o); if (!window.__allow) c.suspend(); return c; }; window.AudioContext.prototype = AC.prototype; };
const S = page => page.evaluate(() => { const L = window.__lc, b = document.getElementById('bSound'); return { want: L.AU.want, state: L.AU.c ? L.AU.c.state : 'none', run: L.AU.run, live: L.AU.live, taps: L.AU.taps || 0,
  pressed: b.getAttribute('aria-pressed'), dim: document.getElementById('dotrow').classList.contains('off'), label: b.getAttribute('aria-label'), mode: L.GH.mode, on: L.GH.on, gp: Object.keys(L.GP).length, held: L.soundHeld(), errs: (L.errs || []).slice(0, 3) }; });
const stroke = async (page, y) => { await page.mouse.move(90, y); await page.mouse.down(); for (let k = 1; k <= 24; k++) { await page.mouse.move(90 + k * 9, y + 60 * Math.sin(k * .4)); await sleep(14); } await page.mouse.up(); };
const tap = async (page, x, y) => { await page.mouse.move(x, y); await page.mouse.down(); await sleep(60); await page.mouse.up(); };
(async () => { const browser = await launch();
  let { page, errs, ctx } = await open(browser, 'phone', { init: hold });
  // the opening hint: a tap before anything else
  let downs = 0, was = 0; const t0 = Date.now(); while (Date.now() - t0 < 4300) { const n = await page.evaluate(() => Object.keys(window.__lc.GP).length); if (n && !was) downs++; was = n; await sleep(25); }
  let s = await S(page); ok(downs >= 2 && s.mode === 1, 'the opening hint taps before it strokes (' + downs + ' ghost touches in the first four seconds)');
  await stroke(page, 330); await sleep(350); s = await S(page);
  ok(s.want && s.state !== 'running', 'after a stroke the music is asked for and the sound is held back (' + s.state + ')');
  ok(s.pressed === 'false' && s.dim, 'the note stays unlit and the circles dimmed while nothing can be heard: ' + s.label);
  await sleep(1300); s = await S(page); ok(s.mode === 2 && s.gp === 0, 'a finger is drawn tapping the middle (hint ' + s.mode + ', ghost fingers on the world ' + s.gp + ')');
  await sleep(120); await page.screenshot({ path: 'shots/lock_cue_a.png' }); await sleep(330); await page.screenshot({ path: 'shots/lock_cue_b.png' });
  await page.click('#bSound'); await sleep(300); s = await S(page); ok(s.want && s.pressed === 'false', 'a touch on the note asks again; it does not turn off what cannot be heard');
  await stroke(page, 420); s = await S(page); const during = s.mode; await sleep(1400); s = await S(page); ok(during !== 2 && s.mode === 2, 'the tapping finger steps aside for a real one and comes back');
  await page.evaluate(() => { window.__allow = true; }); await tap(page, 195, 430); await sleep(1500); s = await S(page);
  ok(s.state === 'running' && s.pressed === 'true' && !s.dim && s.run && s.live, 'one plain tap starts the band (' + s.state + ', note lit ' + s.pressed + ')');
  ok(s.mode === 0 && s.taps === 0 && !s.held, 'and the tapping finger is gone');
  await page.click('#bSound'); await sleep(1700); s = await S(page); ok(s.pressed === 'false' && !s.want && s.mode === 0, 'turned off by hand: unlit, and nothing asks for a tap');
  ok(!s.errs.length && ![...new Set(errs)].length, 'no errors' + (s.errs.length ? ': ' + s.errs[0] : '') + ([...new Set(errs)][0] || ''));
  await ctx.close();
  // a browser that never lets the sound start: after a few taps the page stops asking
  ({ page, errs, ctx } = await open(browser, 'phone', { init: hold })); await sleep(900);
  await stroke(page, 330); await sleep(1400); s = await S(page); const asked = s.mode;
  for (let k = 0; k < 4; k++) { await tap(page, 150 + k * 30, 400); await sleep(250); } await sleep(1300); s = await S(page);
  ok(asked === 2 && s.mode !== 2 && s.pressed === 'false' && s.taps >= 4, 'where taps do not free the sound, the page stops asking (taps ' + s.taps + ', hint ' + s.mode + ')');
  await ctx.close(); await browser.close(); console.log(fail.length ? 'LOCK FAILED' : 'LOCK OK'); process.exit(fail.length ? 1 : 0); })();
