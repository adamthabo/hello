// measures how loud everything is, through the page's real signal path (compressors and all), rendered offline in the browser.
// The band is the yardstick: nothing a hand can play may come out louder than the full band, and a single note sits well under it.
const { launch, open } = require('./lib');
(async () => {
  const browser = await launch();
  const { page, errs, ctx } = await open(browser, 'desk');
  await page.waitForTimeout(800);
  const res = await page.evaluate(async () => {
    const L = window.__lc, sr = 44100, dur = 13, a0 = 3.5;
    const stems = await Promise.all(L.STEMF.map(n => fetch('audio/stem' + n + '.mp3').then(r => r.arrayBuffer())));
    async function render(band, toys, mix) {
      const O = new OfflineAudioContext(2, sr * dur, sr), g = L.buildGraph(O); g.out.gain.value = 0.3;
      if (band) {
        const bufs = await Promise.all(stems.map(ab => O.decodeAudioData(ab.slice(0))));
        bufs.forEach((b, i) => { if (!band[i]) return; g.L[i].gain.value = L.SG[i]; const s = O.createBufferSource(); s.buffer = b; s.loop = true; s.loopStart = L.STEMP; s.loopEnd = L.STEMP + L.STEML; s.connect(g.L[i]); s.start(0.05, L.STEMP); });
      }
      const inst = {};
      function ib(name, f) { const k = name + f; if (!inst[k]) { const a = L.SYN[name](f), b = O.createBuffer(1, a.length, L.SYN.SR); b.getChannelData(0).set(a); inst[k] = { b, f: a.f0 || f || 1 }; } return inst[k]; }
      function note(name, midi, vel, when) {
        const def = L.INSTDEF[name], f = midi ? 440 * Math.pow(2, (midi - 69) / 12) : 1; let best = null, bd = 1e9;
        for (const bf of def[1]) { const c = ib(name, bf); const d = midi ? Math.abs(Math.log(f / c.f)) : 0; if (d < bd) { bd = d; best = c; } }
        const s = O.createBufferSource(), gn = O.createGain(); s.buffer = best.b; s.playbackRate.value = midi ? f / best.f : 1; gn.gain.value = vel * def[0] * (midi ? L.tilt(midi) : 1); s.connect(gn); gn.connect(g.toy); s.start(when);
      }
      if (toys) toys(note);
      if (mix) mix(O, g);
      const buf = await O.startRendering(), l = buf.getChannelData(0), r = buf.getChannelData(1);
      let s2 = 0, pk = 0, n = 0; for (let i = Math.floor(a0 * sr); i < l.length; i++) { const m = (l[i] + r[i]) * .5; s2 += m * m; n++; const a = Math.max(Math.abs(l[i]), Math.abs(r[i])); if (a > pk) pk = a; }
      // loudest half-second
      let worst = 0; const w = sr >> 1; for (let i = Math.floor(a0 * sr); i + w < l.length; i += w >> 1) { let q = 0; for (let k = 0; k < w; k++) { const m = (l[i + k] + r[i + k]) * .5; q += m * m; } worst = Math.max(worst, q / w); }
      const db = x => 20 * Math.log10(Math.max(x, 1e-9));
      return { rms: +db(Math.sqrt(s2 / n)).toFixed(1), peak: +db(pk).toFixed(1), loudest: +db(Math.sqrt(worst)).toFixed(1) };
    }
    const all = [1, 1, 1, 1, 1, 1, 1, 1, 1], two = [1, 0, 0, 0, 0, 1, 0, 0, 0];
    const P = [52, 55, 57, 59, 62, 64, 67, 69, 71, 74, 76];
    const out = {};
    out['band, all nine'] = await render(all, null);
    out['band, low drum and bass only'] = await render(two, null);
    for (const nm of ['glass', 'kal', 'mal', 'bowl']) out['one ' + nm + ' note, as hard as it goes, once a second'] = await render(null, note => { for (let t = a0; t < dur; t += 1) note(nm, nm === 'kal' ? 76 : 64, 1, t); });
    for (const nm of ['thump', 'tok', 'tick']) out['one ' + nm + ' stroke, as hard as it goes, twice a second'] = await render(null, note => { for (let t = a0; t < dur; t += .5) note(nm, 0, 1, t); });
    out['wind: two lightning ticks on every sixteenth, hard, and glass drawn fast'] = await render(null, note => { let k = 0; for (let t = a0; t < dur; t += .144) { note('tick', 0, .6, t); note('tick', 0, .6, t + .03); if (k++ % 2 === 0) note('glass', P[k % P.length], .7, t); } });
    out['orbit: glass bells four times a second'] = await render(null, note => { for (let t = a0; t < dur; t += .25) note('glass', [71, 69, 67, 64, 62][Math.floor(t * 4) % 5], .45, t); });
    out['ten fingers hammering everything at once'] = await render(null, note => { let k = 0; for (let t = a0; t < dur; t += .03) { const nm = ['glass', 'kal', 'mal', 'glass', 'bowl'][k % 5]; note(nm, P[(k * 7) % P.length] + (nm === 'kal' ? 12 : 0), 1, t); if (k % 3 === 0) note(['thump', 'tok', 'tick'][(k / 3) % 3 | 0], 0, 1, t); k++; } });
    out['band, all nine, WITH ten fingers hammering'] = await render(all, note => { let k = 0; for (let t = a0; t < dur; t += .03) { const nm = ['glass', 'kal', 'mal', 'glass', 'bowl'][k % 5]; note(nm, P[(k * 7) % P.length] + (nm === 'kal' ? 12 : 0), 1, t); if (k % 3 === 0) note(['thump', 'tok', 'tick'][(k / 3) % 3 | 0], 0, 1, t); k++; } });
    // the mixer: deck B, the machine of sounds, plays into the bus everything a hand plays goes into (limited); its loops at their busiest,
    // the echo all the way up, and the pads hit as hard and as fast as ten fingers can, with every kit
    const deckB = (echo) => (O, g) => { const G = L.MIX.offline(O, { bus: g.bus, toy: g.toy }, dur, true); if (echo) { G.d[1].es.gain.value = .55; G.fb.gain.value = .6; } return G; };
    const pads = (G, O) => { let k = 0; const pt = G.t.length - 1; for (let t = a0 - 1; t < dur; t += .03) { const b = L.MIXS.kitNow(O, k % 16)[(k * 5) % 16], s = O.createBufferSource(), gn = O.createGain(); s.buffer = b; gn.gain.value = .62; s.connect(gn); gn.connect(G.t[pt]); s.start(t); k++; } };
    out['mix: deck B at its busiest (drums, bass, keys, bells)'] = await render(null, null, deckB(false));
    out['mix: deck B at its busiest, the echo all the way up'] = await render(null, null, deckB(true));
    out['mix: ten fingers on the pads, every kit, as hard as they go'] = await render(null, null, (O, g) => pads(L.MIX.offline(O, { bus: g.bus, toy: g.toy }, dur, false), O));
    out['mix: all of that at once'] = await render(null, null, (O, g) => pads(deckB(true)(O, g), O));
    out['band, all nine, WITH deck B, the echo and the pads'] = await render(all, null, (O, g) => pads(deckB(true)(O, g), O));
    return out;
  });
  const band = res['band, all nine'];
  console.log('level at the output, in dB below full scale (average / loudest half second / peak)');
  let bad = 0;
  for (const k in res) { const r = res[k], rel = (r.loudest - band.loudest).toFixed(1); console.log(`  ${k.padEnd(52)} ${String(r.rms).padStart(6)}  ${String(r.loudest).padStart(6)}  ${String(r.peak).padStart(6)}   ${k.startsWith('band') ? '' : (rel > 0 ? '+' : '') + rel + ' dB against the full band'}`); if (!k.startsWith('band') && r.loudest > band.loudest - 1) bad++; }
  if (errs.length) console.log('errors', errs.slice(0, 5));
  await ctx.close(); await browser.close();
  console.log(bad ? 'LEVELS FAILED: something a hand plays can come out as loud as the band' : 'LEVELS PASSED: nothing a hand plays comes out as loud as the full band'); process.exit(bad ? 1 : 0);
})();
