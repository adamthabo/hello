// measures how loud everything is, through the page's real signal path (compressors and all), rendered offline in the browser.
// The band is the yardstick: nothing a hand can play may come out louder than the full band, and a single note sits well under it.
const { launch, open } = require('./lib');
(async () => {
  const browser = await launch();
  const { page, errs, ctx } = await open(browser, 'desk');
  await page.waitForTimeout(2000);  // (after the ceilings have measured their browser: limCalibrate)
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
    // the mixer: its recorded instruments play into the bus everything a hand plays goes into (limited). The busiest of them all
    // together, the same with ten fingers on top, and each of their twenty loops alone (a lone loop is not held by the ceiling as a
    // full mix is: the compressor lets a hit through before it closes)
    await L.MIX.load();
    const BUSY = { congas: 1, bongos: 1, shaker: 0, cajon: 1, claps: 0, marimba: 1, xylophone: 1, vibes: 0, piano: 0, glock: 1 };
    const inst = (pick, md) => (O, g) => L.MIX.offline(O, { bus: g.bus, toy: g.toy, comp: g.comp, vs: g.vsend }, dur, pick, md || 'africa');
    out['mix: every instrument at once, each on its busier loop'] = await render(null, null, inst(BUSY));
    out['mix: every instrument WITH ten fingers hammering everything'] = await render(null, note => { let k = 0; for (let t = a0; t < dur; t += .03) { const nm = ['glass', 'kal', 'mal', 'glass', 'bowl'][k % 5]; note(nm, P[(k * 7) % P.length] + (nm === 'kal' ? 12 : 0), 1, t); if (k % 3 === 0) note(['thump', 'tok', 'tick'][(k / 3) % 3 | 0], 0, 1, t); k++; } }, inst(BUSY));
    out['band, all nine, WITH every instrument'] = await render(all, null, inst(BUSY));
    let lone = null, each = {}; for (const r of L.MIX.rows) for (let k = 0; k < r.loops.length; k++) { const x = await render(null, null, inst({ [r.n]: k })); x.which = r.n + ' ' + r.loops[k].n; each[x.which] = x.loudest; if (!lone || x.loudest > lone.loudest) lone = x; }
    out['mix: the loudest of its ' + Object.keys(each).length + ' loops alone (' + lone.which + ')'] = lone;
    // (15 Nov) the other four modes, each its own band of recordings into a bus of its own, with its echo: every instrument at once on
    // its busier loops and on its first, the same with ten fingers hammering the mode's own touch voices, those voices alone, and each
    // of its loops alone
    for (const md of ['funk', 'blues', 'acid', 'dub']) {
      await L.SND.load(L.MIX.banks(md)); const rows = L.MODEROWS[md], busy = {}, first = {}; rows.forEach(r => { busy[r.n] = r.loops.length - 1; first[r.n] = 0; });
      const fingers = (O, g, G) => { let k = 0; for (let t = a0; t < dur; t += .03) { L.MIX.offvoice(O, { toy: g.toy }, G, md, ['glass', 'kal', 'glass', 'tick', 'thump', 'tok'][k % 6], P[(k * 7) % P.length], 1, t); k++; } };
      out[md + ': every instrument at once, on its second loops'] = await render(null, null, inst(busy, md));
      out[md + ': every instrument at once, on its first loops'] = await render(null, null, inst(first, md));
      out[md + ': every instrument WITH ten fingers on its voices'] = await render(null, null, (O, g) => fingers(O, g, inst(busy, md)(O, g)));
      out[md + ': ten fingers hammering its voices'] = await render(null, null, (O, g) => fingers(O, g, L.MIX.offline(O, { bus: g.bus, toy: g.toy, comp: g.comp, vs: g.vsend }, 1, {}, md)));
      let lone2 = null; for (const r of rows) for (let k = 0; k < r.loops.length; k++) { const x = await render(null, null, inst({ [r.n]: k }, md)); x.which = md + ' ' + r.n + ' ' + r.loops[k].n; each[x.which] = x.loudest; if (!lone2 || x.loudest > lone2.loudest) lone2 = x; }
      out[md + ': the loudest of its ' + rows.reduce((a, r) => a + r.loops.length, 0) + ' loops alone (' + lone2.which + ')'] = lone2;
    }
    // (18 Nov) Beat: its 34 classic beats, each as transcribed, at its own tempo, through Beat's own bus (the band rests while Beat
    // plays, so each is held under the band by itself), and each with every step of every row on; the four with the most steps a
    // second and the loudest full one with the circle full of notes (48: six steps with all eight pitches) in all five sounds and two
    // fingers playing; and each of the five sounds alone, the circle full and two fingers, over House
    await L.SND.load(['kit', 'k808', 'drums', 'small', 'glock', 'marimba', 'chimes', 'fbass', 'gtr', 'vibes']);
    const BL = L.BEAT.lib; let loudB = null;
    for (let i = 0; i < BL.length; i++) { const x = await render(null, null, (O, g) => L.BEAT.offline(O, g, dur, { i })); each['beat ' + BL[i].id] = x.loudest; if (!loudB || x.loudest > loudB.loudest) { loudB = x; loudB.which = BL[i].n; } }
    out['beat: the loudest of its ' + BL.length + ' beats as written (' + loudB.which + ')'] = loudB;
    // (18 Nov) and each with every step of every row on (a full row played lighter, as a roll is): the loudest of the 34
    let fullB = null; for (let i = 0; i < BL.length; i++) { const x = await render(null, null, (O, g) => L.BEAT.offline(O, g, dur, { i, full: 1 })); each['beat ' + BL[i].id + ' full'] = x.loudest; if (!fullB || x.loudest > fullB.loudest) { fullB = x; fullB.which = BL[i].n; } }
    out['beat: the loudest of the 34 with every step on (' + fullB.which + ')'] = fullB;
    const FAST = BL.map((r, i) => [i, r.bpm * r.b]).sort((a, b) => b[1] - a[1]).slice(0, 4).map(x => x[0]);
    const FULLN = []; [0, 3, 6, 8, 11, 14].forEach((q, k) => { for (let p = 0; p < 8; p++) FULLN.push([q, p, (k + p) % 5]); });
    const FULLI = BL.findIndex(r => r.n === fullB.which); if (!FAST.includes(FULLI)) FAST.push(FULLI);
    for (const i of FAST) out['beat: ' + BL[i].n + ', all steps on, 48 notes, two fingers'] = await render(null, null, (O, g) => L.BEAT.offline(O, g, dur, { i, full: 1, notes: FULLN, rolls: [[2, 0], [6, 3]] }));
    for (let v = 0; v < 5; v++) out['beat: ' + L.BEAT.sounds[v][0] + ', 48 notes and two fingers, over House'] = await render(null, null, (O, g) => L.BEAT.offline(O, g, dur, { i: 0, notes: FULLN.map(n => [n[0], n[1], v]), rolls: [[2, v], [6, v]] }));
    out.__each = each;
    return out;
  });
  const band = res['band, all nine'];
  console.log('level at the output, in dB below full scale (average / loudest half second / peak)');
  let bad = 0;
  const each = res.__each; delete res.__each;
  for (const k in res) { const r = res[k], rel = (r.loudest - band.loudest).toFixed(1); console.log(`  ${k.padEnd(52)} ${String(r.rms).padStart(6)}  ${String(r.loudest).padStart(6)}  ${String(r.peak).padStart(6)}   ${k.startsWith('band') ? '' : (rel > 0 ? '+' : '') + rel + ' dB against the full band'}`); if (!k.startsWith('band') && r.loudest > band.loudest - 1) bad++; }
  if (each) console.log('  each loop alone, loudest half second against the full band: ' + Object.keys(each).map(k => k + ' ' + (each[k] - band.loudest).toFixed(1)).join(', '));
  if (errs.length) console.log('errors', errs.slice(0, 5));
  await ctx.close(); await browser.close();
  console.log(bad ? 'LEVELS FAILED: something a hand plays can come out as loud as the band' : 'LEVELS PASSED: nothing a hand plays comes out as loud as the full band'); process.exit(bad ? 1 : 0);
})();
