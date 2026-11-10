// gives the page a photo (as a dropped file would) and looks at Smoke with it
const { launch, open } = require('./lib');
const size = process.argv[2] || 'phone';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => { const browser = await launch(); const { page, errs, ctx } = await open(browser, size); await page.waitForTimeout(800);
  await page.evaluate(() => { window.__lc.GOV.n = -1e9; });
  const give = () => page.evaluate(async () => { const b = await (await fetch('_fonts/testphoto.jpg')).blob(); window.__lc.photoLoad(new File([b], 'p.jpg', { type: 'image/jpeg' })); });
  await give(); await sleep(600);
  let st = await page.evaluate(() => ({ has: window.__lc.PHOTO.has, w: window.__lc.PHOTO.pw, h: window.__lc.PHOTO.ph, clear: !document.getElementById('bClear').hidden, data: document.getElementById('data').textContent }));
  console.log('photo', JSON.stringify(st));
  const cdp = await ctx.newCDPSession(page); const tap = async (x, y) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] }); await sleep(40); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
  await page.evaluate(() => window.__lc.go(0, true)); await sleep(2500); await page.screenshot({ path: `shots/photo_${size}_drift_0.png` });
  await tap(195, 300); await sleep(250); await tap(120, 520); await sleep(600);
  // smear it
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 60, y: 300, id: 1 }] });
  for (let k = 1; k <= 40; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 60 + k * 7, y: 300 + 180 * Math.sin(k * .2), id: 1 }] }); await sleep(18); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(1200); await page.screenshot({ path: `shots/photo_${size}_drift_smear.png` });
  await sleep(9000); await page.screenshot({ path: `shots/photo_${size}_drift_healed.png` });
  await page.evaluate(() => document.getElementById('bClear').click()); await sleep(1500);
  st = await page.evaluate(() => ({ has: window.__lc.PHOTO.has, clearHidden: document.getElementById('bClear').hidden, errs: window.__lc.errs })); console.log('cleared', JSON.stringify(st));
  await page.screenshot({ path: `shots/photo_${size}_drift_cleared.png` });
  const clean = [...new Set(errs)]; console.log(clean.length || st.errs.length ? 'PHOTO FAILED ' + JSON.stringify(clean.slice(0, 5)) : 'PHOTO OK'); await ctx.close(); await browser.close(); })();
