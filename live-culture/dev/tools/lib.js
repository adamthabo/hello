// shared test helpers: a headless browser with WebGL, the two typefaces served locally, and error collection
const { chromium } = require('playwright');
const PORT = 8757, BASE = `http://127.0.0.1:${PORT}/`;
const FONTCSS = `
@font-face{font-family:'Anybody';font-style:normal;font-weight:100 900;font-stretch:50% 150%;font-display:swap;src:url(__BASE___fonts/anybody.woff2) format('woff2')}
@font-face{font-family:'JetBrains Mono';font-style:normal;font-weight:400;font-display:swap;src:url(__BASE___fonts/jbm400.woff2) format('woff2')}
@font-face{font-family:'JetBrains Mono';font-style:normal;font-weight:500;font-display:swap;src:url(__BASE___fonts/jbm500.woff2) format('woff2')}`;
async function launch() {
  return chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
}
const SIZES = {
  phone: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
  desk: { viewport: { width: 1280, height: 800 }, hasTouch: false, isMobile: false },
  land: { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true },
  small: { viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true },
};
async function open(browser, size, opts = {}) {
  const ctx = await browser.newContext({ ...SIZES[size], deviceScaleFactor: opts.dsf || 1, reducedMotion: opts.reduce ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message + ' | ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  page.on('console', m => { const t = m.text(); if ((m.type() === 'error' || m.type() === 'warning') && !/GPU stall due to ReadPixels|ScriptProcessorNode/.test(t)) errs.push(m.type() + ': ' + t.slice(0, 500)); });
  page.on('requestfailed', q => errs.push('requestfailed: ' + q.url()));
  await page.route(/fonts\.googleapis\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: FONTCSS.replace(/__BASE__/g, opts.base || BASE) }));
  if (opts.init) await page.addInitScript(opts.init);
  await page.goto((opts.base || BASE) + (opts.file || 'local.html') + (opts.hash || ''), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  return { ctx, page, errs };
}
// in-page frame counter: resolves after n animation frames
const frames = (page, n) => page.evaluate(n => new Promise(r => { let k = 0; (function f() { if (++k >= n) r(k); else requestAnimationFrame(f); })(); }), n);
module.exports = { launch, open, BASE, PORT, SIZES, frames };
