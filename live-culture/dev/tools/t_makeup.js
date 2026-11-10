// the browser's compressor adds its own make-up gain; this measures it for a few settings so the page can take it back out
const { launch, open } = require('./lib');
(async () => {
  const browser = await launch(); const { page, ctx } = await open(browser, 'desk');
  const res = await page.evaluate(async () => {
    const out = [];
    for (const s of [[-24, 30, 12], [-30, 6, 16], [-27, 6, 14], [-26, 4, 12], [-24, 6, 12], [-28, 8, 20], [-22, 6, 8]]) {
      const sr = 44100, O = new OfflineAudioContext(1, sr * 2, sr), o = O.createOscillator(), g = O.createGain(), c = O.createDynamicsCompressor();
      c.threshold.value = s[0]; c.knee.value = s[1]; c.ratio.value = s[2]; c.attack.value = .003; c.release.value = .15;
      o.frequency.value = 440; g.gain.value = .001; o.connect(g); g.connect(c); c.connect(O.destination); o.start();
      const b = await O.startRendering(), d = b.getChannelData(0); let pk = 0; for (let i = sr; i < d.length; i++) pk = Math.max(pk, Math.abs(d[i]));
      out.push({ thr: s[0], knee: s[1], ratio: s[2], makeup_db: +(20 * Math.log10(pk / .001)).toFixed(2), lin: +(pk / .001).toFixed(4) });
    }
    return out;
  });
  res.forEach(r => console.log(JSON.stringify(r)));
  await ctx.close(); await browser.close();
})();
