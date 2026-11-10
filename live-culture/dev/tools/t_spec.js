// where in the spectrum the band and the touch voices sit: level per octave, through the page's real signal path
const { launch, open } = require('./lib');
(async () => {
  const browser = await launch(); const { page, ctx } = await open(browser, 'desk'); await page.waitForTimeout(600);
  const res = await page.evaluate(async () => {
    const L = window.__lc, sr = 44100, dur = 13, a0 = 3.5;
    const stems = await Promise.all(L.STEMF.map(n => fetch('audio/stem' + n + '.mp3').then(r => r.arrayBuffer())));
    async function render(band, toys) {
      const O = new OfflineAudioContext(2, sr * dur, sr), g = L.buildGraph(O); g.out.gain.value = 0.3;
      if (band) { const bufs = await Promise.all(stems.map(ab => O.decodeAudioData(ab.slice(0)))); bufs.forEach((b, i) => { if (!band[i]) return; g.L[i].gain.value = L.SG[i]; const s = O.createBufferSource(); s.buffer = b; s.loop = true; s.loopStart = L.STEMP; s.loopEnd = L.STEMP + L.STEML; s.connect(g.L[i]); s.start(0.05, L.STEMP); }); }
      const inst = {}; function ib(name, f) { const k = name + f; if (!inst[k]) { const a = L.SYN[name](f), b = O.createBuffer(1, a.length, L.SYN.SR); b.getChannelData(0).set(a); inst[k] = { b, f: a.f0 || f || 1 }; } return inst[k]; }
      function note(name, midi, vel, when) { const def = L.INSTDEF[name], f = midi ? 440 * Math.pow(2, (midi - 69) / 12) : 1; let best = null, bd = 1e9; for (const bf of def[1]) { const c = ib(name, bf); const d = midi ? Math.abs(Math.log(f / c.f)) : 0; if (d < bd) { bd = d; best = c; } }
        const s = O.createBufferSource(), gn = O.createGain(); s.buffer = best.b; s.playbackRate.value = midi ? f / best.f : 1; gn.gain.value = vel * def[0] * (midi ? L.tilt(midi) : 1); s.connect(gn); gn.connect(g.toy); s.start(when); }
      if (toys) toys(note); return O.startRendering();
    }
    async function bands(buf) {
      const out = {}; for (const fc of [63, 125, 250, 500, 1000, 2000, 4000, 8000]) {
        const O = new OfflineAudioContext(1, buf.length, sr), s = O.createBufferSource(), f1 = O.createBiquadFilter(), f2 = O.createBiquadFilter(); s.buffer = buf; f1.type = f2.type = 'bandpass'; f1.frequency.value = f2.frequency.value = fc; f1.Q.value = f2.Q.value = 1.414; s.connect(f1); f1.connect(f2); f2.connect(O.destination); s.start(0);
        const r = await O.startRendering(), d = r.getChannelData(0); let worst = 0; const w = sr >> 1; for (let i = Math.floor(a0 * sr); i + w < d.length; i += w >> 1) { let q = 0; for (let k = 0; k < w; k++) q += d[i + k] * d[i + k]; worst = Math.max(worst, q / w); }
        out[fc] = +(10 * Math.log10(Math.max(worst, 1e-12))).toFixed(1); } return out;
    }
    const all = [1, 1, 1, 1, 1, 1, 1, 1, 1], R = {};
    R['band, all nine'] = await bands(await render(all, null));
    R['band: wind scene'] = await bands(await render([1, 0, 1, 1, 0, 1, 0, 0, 0], null));
    R['band: orbit scene'] = await bands(await render([0, 1, 0, 0, 1, 1, 0, 0, 0], null));
    R['band: smoke scene'] = await bands(await render([0, 1, 0, 0, 0, 1, 1, 1, 0], null));
    const V = [['glass', 59, .55, 1], ['glass', 69, .55, 1], ['glass', 74, .8, 1], ['kal', 69, .35, .29], ['kal', 79, .35, .29], ['kal', 86, .5, .29],
      ['mal', 79, .4, .6], ['mal', 74, .53, .6], ['mal', 64, .83, .6], ['mal', 52, 1, .6],
      ['bowl', 55, .5, 1.15], ['bowl', 64, .5, 1.15], ['bowl', 71, .6, 1.15], ['thump', 0, .95, .5], ['tok', 0, .85, .5], ['tick', 0, .9, .5]];
    for (const v of V) R[v[0] + ' ' + (v[1] || '') + ' vel ' + v[2]] = await bands(await render(null, n => { for (let t = a0; t < dur; t += v[3]) n(v[0], v[1], v[2], t); }));
    const tune = {};   // (there was a plucked string here, checked for its tuning; the harp is gone)
    R.__tune = tune;
    return R;
  });
  const tune = res.__tune; delete res.__tune;
  const fcs = [63, 125, 250, 500, 1000, 2000, 4000, 8000];
  console.log('loudest half second in each octave, dB'.padEnd(30) + fcs.map(f => String(f).padStart(7)).join(''));
  const band = res['band, all nine'];
  for (const k in res) { let so = -99, at = 0; for (const f of fcs) { const d = res[k][f] - band[f]; if (d > so) { so = d; at = f; } }
    console.log(k.padEnd(30) + fcs.map(f => String(res[k][f]).padStart(7)).join('') + (k.startsWith('band') ? '' : '   stands ' + (so > 0 ? '+' : '') + so.toFixed(1) + ' dB against the full band at ' + at + ' Hz')); }
  console.log('string tuning', JSON.stringify(tune));
  await ctx.close(); await browser.close();
})();
