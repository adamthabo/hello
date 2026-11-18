// Beat, the geometry of rhythm (17 Nov, 17:54, 19:44 and 22:20: "I like the graphics and beat breakdown ... the view of the metronome",
// "it's not interactive", "I like the classic beats I provided you, especially the more interesting ones", and his seven videos).
// The 34 beats as transcribed from the videos; each played on its own clock at its own tempo, on its steps, while the band rests (and
// comes back after); real taps on the ring, the grid, a row's name, the rings of pitch; a finger kept still; back, next, the sound,
// dice, reset; kept after a reload; every beat played once; nothing cut off at the Claude app's heights or on a phone on its side.
// usage: node tools/t_beat.js
const { launch, open } = require('./lib'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const fail = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fail.push(m); };
(async () => {
  const browser = await launch(); let { page, errs, ctx } = await open(browser, 'phone'); await sleep(1200);
  let cdp = await ctx.newCDPSession(page);
  const touch = async (pts, type) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: i + 1 })) });
  const lift = async () => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const tap = async (x, y) => { await touch([[x, y]], 'touchStart'); await sleep(50); await lift(); await sleep(160); };
  const D = () => page.evaluate(() => { const L = window.__lc, i = L.WORLDS.findIndex(w => w.id === 'beat'), r = document.getElementById('btools'), g = document.getElementById('wgrip'), f = (g && !g.hidden ? g : document.getElementById('rail')).getBoundingClientRect();
    return { i, cur: L.CURI, d: L.BEAT.dbg(), errs: (L.errs || []).slice(0, 3), data: document.getElementById('data').textContent, stg: L.STG, rail: { t: f.top }, grip: g && !g.hidden ? g.textContent : '',
      railIn: document.getElementById('foot').classList.contains('railup'), mode: document.getElementById('bMode').hidden, shown: !!r && !r.hidden, paintTools: !document.getElementById('tools').hidden,
      tools: r ? [...r.querySelectorAll('.tb')].map(b => { const q = b.getBoundingClientRect(); return { id: b.id.slice(2), txt: b.textContent, l: q.left, r: q.right, t: q.top, b: q.bottom }; }) : [] }; });
  const B = (f, a) => page.evaluate(([f, a]) => window.__lc.BEAT[f].apply(null, a || []), [f, a]);
  const btn = async (s, id) => { const b = s.tools.find(t => t.id === id); await tap((b.l + b.r) / 2, (b.t + b.b) / 2); };
  // the worlds: Beat is the fourth, and a real tap on its button opens it
  const rail = await page.evaluate(() => [...document.querySelectorAll('#rail .wb')].map(b => b.textContent));
  ok(rail.join() === 'Paint,Earth,Mix,Beat', 'four worlds, Beat the last: ' + rail.join());
  ok(!(await D()).mode, 'outside Beat the band\'s mode has its button at the top');
  await page.evaluate(() => { try { localStorage.removeItem('lc.beat'); localStorage.removeItem('lc.beat2'); } catch (e) {} });
  { const r = await page.evaluate(() => { const q = document.getElementById('w_beat').getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; }); await tap(r.x, r.y); await sleep(900); }
  let s = await D(); ok(s.cur === s.i && s.d.on && s.shown && !s.paintTools && !s.errs.length, 'a tap on Beat opens it: its row shown, Paint\'s tools not: ' + JSON.stringify({ cur: s.cur, errs: s.errs }));
  ok(s.mode, 'in Beat the band\'s mode button is gone (the band rests there)');
  // (17 Nov, 19:44: "remove buttons when they are not necessary on the screen (world buttons on music pages)") the worlds' buttons
  // tucked behind a handle named worlds; a tap brings them up, a touch elsewhere puts them away; a world chosen from there opens
  ok(/worlds/.test(s.grip) && !s.railIn, 'in Beat the worlds\' buttons are tucked behind a handle: ' + JSON.stringify(s.grip));
  { const g = await page.evaluate(() => { const q = document.getElementById('wgrip').getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; }); await tap(g.x, g.y); await sleep(450); s = await D();
    ok(s.railIn, 'a tap on the handle brings them up'); await tap(30, s.stg.y0 + 8); await sleep(450); s = await D(); ok(!s.railIn, 'a touch elsewhere puts them away');
    await tap(g.x, g.y); await sleep(450); const w = await page.evaluate(() => { const q = document.getElementById('w_mix').getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; }); await tap(w.x, w.y); await sleep(700);
    const m = await page.evaluate(() => { const L = window.__lc; return { id: L.WORLDS[L.CURI].id, grip: !document.getElementById('wgrip').hidden, duck: L.AU.duck ? L.AU.duck.gain.value : 1 }; });
    ok(m.id === 'mix' && m.grip, 'from there a world chosen opens (Mix, its buttons tucked too): ' + JSON.stringify(m));
    await page.evaluate(() => { const L = window.__lc; L.go(L.WORLDS.findIndex(w => w.id === 'beat'), true); }); await sleep(700); }
  // the beats, as transcribed from his videos: 34 in six parts of the world, three rows each, every stroke on a step of its circle,
  // every sound one the page has
  const lib = await page.evaluate(() => { const L = window.__lc; return L.BEAT.lib.map(r => ({ id: r.id, f: r.f, n: r.n, N: r.N, b: r.b, bpm: r.bpm, r: r.r.map(x => [x[0], x[1], x[2], x[3] || null]),
    snd: r.r.every(x => { const ss = [x[1]].concat(x[3] && x[3].a ? Object.values(x[3].a) : []); return ss.every(sp => sp.split('+').every(p => { const a = p.split('@'); return a.length > 1 ? !!L.SND.B[a[0]] && a[1].split(',').every(m => +m > 20 && +m < 100) : !!L.SND.bankOf(a[0]); })); }) })); });
  const fams = await page.evaluate(() => window.__lc.BEAT.fams.map(f => f[0]));
  ok(lib.length === 34 && fams.join() === 'us,latin,brazil,africa,jazz,asia' && lib.every(r => fams.includes(r.f)), '34 beats in six parts of the world: ' + fams.map(f => f + ' ' + lib.filter(r => r.f === f).length).join(', '));
  ok(lib.every(r => r.r.length === 3 && [8, 9, 12, 16].includes(r.N) && [2, 3, 4].includes(r.b) && r.bpm >= 60 && r.bpm <= 220 && r.r.every(x => x[2].length && x[2].every(q => q >= 1 && q <= r.N) && new Set(x[2]).size === x[2].length)),
    'every beat three rows, its strokes on its own steps (16, 12, 9 or 8), a tempo the video gives');
  ok(lib.every(r => r.snd), 'every sound a beat uses is one of the page\'s recordings: ' + lib.filter(r => !r.snd).map(r => r.id).join());
  const B0 = Object.fromEntries(lib.map(r => [r.id, r])), hits = (id, j) => B0[id].r[j][2].join();
  ok(hits('house', 2) === '1,5,9,13' && hits('house', 1) === '5,13' && hits('house', 0) === '3,7,11,15', 'House: kick 1 5 9 13, clap 5 13, open hat on the off-beats');
  ok(hits('trap', 2) === '1,4,11' && hits('trap', 1) === '9' && hits('trap', 0) === '1,3,5,7,8,9,11,13,14,15,16' && B0.trap.bpm === 140, 'Trap: 808 on 1 4 11, the clap on 9 alone, the hats rolling, 140');
  ok(hits('boombap', 2) === '1,7,11' && hits('jersey', 2) === '1,5,9,12,15' && hits('rock', 2) === '1,9', 'Boom Bap, Jersey Club and Rock\'s kicks');
  ok(hits('son', 2) === '1,4,7,11,13' && hits('rumba', 2) === '1,4,8,11,13' && hits('tresillo', 2) === '1,4,7,9,12,15' && hits('habanera', 2) === '1,4,5,7,9,12,13,15', 'son and rumba clave, tresillo, habanera');
  ok(hits('shiko', 2) === '1,5,7,11,13' && hits('soukous', 2) === '1,4,7,11,12' && hits('gahu', 2) === '1,4,7,11,15' && hits('dembow', 2) === '4,7,12,15' && hits('dembow', 1) === '1,5,9,13', 'shiko, soukous, gahu; dembow\'s snare and kick');
  ok(hits('salsa', 1) === '3,7,8,11,15,16' && hits('merengue', 0) === '1,3,4,5,7,8,9,11,12,13,15,16' && hits('bachata', 2) === '1,7,9,15' && hits('cumbia', 2) === '1,9,15' && hits('joropo', 1) === '2,3,5,6,8,10,12', 'salsa\'s conga, the güira, bachata, cumbia, the cuatro');
  ok(hits('samba', 1) === '1,3,4,6,8,10,12,13,15,16' && hits('bossa', 2) === '1,4,7,11,14' && hits('bossa', 1) === '1,4,5,8,9,12,13,16' && hits('sambareggae', 2) === '1,4,7,11,14' && hits('carioca', 1) === '4,7,13', 'the teleco-teco, the bossa\'s rim and kick, samba-reggae, funk carioca');
  ok(hits('bembe', 2) === '1,3,5,6,8,10,12' && hits('3over4', 2) === '1,5,9' && hits('3over4', 1) === '1,4,7,10' && B0.bembe.N === 12, 'bembé\'s bell (the major scale\'s steps), three against four, in twelve');
  ok(hits('swing', 2) === '1,4,6,7,10,12' && hits('shuffle', 2) === '1,3,4,6,7,9,10,12' && hits('waltz', 2) === '1,4,6,7,9' && B0.waltz.N === 9 && hits('secondline', 2) === '1,4,7,11,13' && hits('funk', 2) === '1,3,8,11', 'swing\'s ride, the shuffle, the jazz waltz in nine, the second line\'s clave, funk\'s kick');
  ok(hits('teentaal', 2) === '1,4,5,8,9,16' && hits('teentaal', 0) === '10,11,12,13' && hits('keherwa', 2) === '1,2,7,9,10,15' && hits('dongdong', 2) === '1,3,5' && B0.dongdong.N === 8 && hits('lancaran', 2) === '4,8,12,16' && hits('malfuf', 1) === '4,7,12,15', 'teentaal, keherwa, dong dong qiang in eight, lancaran\'s kenong, malfuf');
  ok(B0.salsa.b === 2 && B0.salsa.bpm === 190 && B0.joropo.b === 2 && B0.lancaran.b === 2 && B0.bossa.b === 2 && B0.swing.b === 3 && B0.house.b === 4, 'each beat\'s steps as long as the video plays them (salsa, joropo, lancaran and the bossa in eighths, swing in triplets)');
  // its row: back, next, the sound, dice and reset, every one whole on the screen, above the worlds' handle, none narrower than 40
  s = await D(); const W = await page.evaluate(() => innerWidth);
  ok(s.tools.map(t => t.id).join() === 'prev,next,snd,dice,reset' && s.tools.every(t => t.l >= 0 && t.r <= W && t.b <= s.rail.t + 1 && t.r - t.l >= 40),
    'back, next, the sound, dice and reset, all on the screen, above the worlds: ' + s.tools.map(t => t.txt + '@' + Math.round(t.l) + '-' + Math.round(t.r) + '/' + Math.round(t.t)).join(' '));
  const fits = s => { const g = s.d.geo, top = Math.min(...s.tools.map(t => t.t)), W = s.stg.w; return g.cx - g.R * 1.3 >= 0 && g.cx + g.R * 1.3 <= W && g.cy - g.R * 1.24 >= s.stg.y0 - 1 && g.gy >= g.cy + g.R * 1.2 - (g.wide ? 1e9 : 0) && g.gy + 3 * g.rh + 2 * g.gap + 16 <= top + 1 && g.gx >= 0 && g.gx + g.gw <= W && (g.wide || g.card.y + g.card.h <= g.cy - g.R * 1.2 + 1); };
  ok(s.d.geo.R >= 120 && fits(s), 'the circle (R ' + Math.round(s.d.geo.R) + '), its numbers, the name\'s place over it and the grid under it, all whole above the row');
  // the music on: the beat plays on its own clock, at its own tempo, on its steps; the band rests while Beat is open
  await page.evaluate(() => { window.__sp = []; window.__lc.BEAT.spy(e => window.__sp.push(e)); window.__lc.musicOn(); });
  for (let k = 0; k < 40 && !(s.d.run && s.d.clock); k++) { await sleep(250); s = await D(); }
  const k1 = s.d.clock, w1 = Date.now(); await sleep(2000); s = await D(); const k2 = s.d.clock, rate = (k2.k - k1.k) / ((Date.now() - w1) / 1000), want = 124 * 4 / 60;
  ok(s.d.id === 'house' && Math.abs(rate / want - 1) < .15, 'House plays at its own tempo, 124: ' + rate.toFixed(2) + ' steps a second (' + want.toFixed(2) + ' wanted)');
  ok(s.d.duck === 0 && await page.evaluate(() => window.__lc.AU.toy.gain.value) < .01, 'and the band rests (its level held at nothing) while Beat plays: ' + s.d.duck);
  { const sp = await page.evaluate(() => window.__sp.slice()), t0 = await B('t0'), sd = s.d.sd, by = j => new Set(sp.filter(e => e.j === j).map(e => e.q + 1));
    const onGrid = sp.filter(e => e.j !== undefined).every(e => Math.abs((e.t - t0) / sd - e.k) < .05);
    ok([...by(2)].sort((a, b) => a - b).join() === '1,5,9,13' && [...by(1)].sort((a, b) => a - b).join() === '5,13' && [...by(0)].sort((a, b) => a - b).join() === '3,7,11,15' && onGrid,
      'every stroke played on its own step, in time: kick ' + [...by(2)].join(' ') + ', clap ' + [...by(1)].join(' ') + ', hat ' + [...by(0)].join(' ')); }
  await page.screenshot({ path: 'shots/beat_phone_house.png' });
  // next: Trap, its name shown, its tempo; back: House again
  await btn(s, 'next'); await sleep(900); s = await D();
  ok(s.d.id === 'trap' && s.d.card > .5 && Math.abs(s.d.sd - 60 / 140 / 4) < 1e-6, 'next: Trap, its name shown, its own tempo: ' + JSON.stringify({ id: s.d.id, card: s.d.card, sd: s.d.sd }));
  await btn(s, 'prev'); await sleep(500); s = await D(); ok(s.d.id === 'house', 'back: House again');
  // the ring: a tap on an empty step puts the kick there, a second takes it away; a kick dragged along the ring moves to where it is let go
  { const r = await B('ringAt', [2]); await tap(r.x, r.y); s = await D(); ok(s.d.rows[2].hits.join() === '1,3,5,9,13', 'a tap on the ring at 3 puts a kick there: ' + s.d.rows[2].hits.join(' '));
    await tap(r.x, r.y); s = await D(); ok(s.d.rows[2].hits.join() === '1,5,9,13', 'a second tap takes it away: ' + s.d.rows[2].hits.join(' '));
    const a = await B('ringAt', [4]), b = await B('ringAt', [6]); await touch([[a.x, a.y]], 'touchStart'); for (let k = 1; k <= 8; k++) { const t = k / 8, an = -Math.PI / 2 + (4 + 2 * t) / 16 * Math.PI * 2; await touch([[s.d.geo.cx + Math.cos(an) * s.d.geo.R, s.d.geo.cy + Math.sin(an) * s.d.geo.R]], 'touchMove'); await sleep(40); }
    await lift(); await sleep(200); s = await D(); ok(s.d.rows[2].hits.join() === '1,7,9,13', 'the kick on 5 dragged along the ring to 7: ' + s.d.rows[2].hits.join(' ')); await page.screenshot({ path: 'shots/beat_phone_moved.png' }); }
  // the grid: a tap puts a stroke in any row, drawn along sets every step it crosses; a tap on a row's name takes it out
  { const c = await B('cellAt', [1, 2]); await tap(c.x, c.y); s = await D(); ok(s.d.rows[1].hits.join() === '3,5,13', 'a tap on the grid puts a clap on 3: ' + s.d.rows[1].hits.join(' '));
    const p0 = await B('cellAt', [0, 0]), p1 = await B('cellAt', [0, 3]); await touch([[p0.x, p0.y]], 'touchStart'); for (let k = 1; k <= 6; k++) { await touch([[p0.x + (p1.x - p0.x) * k / 6, p0.y]], 'touchMove'); await sleep(40); } await lift(); await sleep(200);
    s = await D(); ok(s.d.rows[0].hits.join() === '1,2,3,4,7,11,15', 'a finger drawn along the hats\' row puts them on 1 to 4: ' + s.d.rows[0].hits.join(' '));
    const l = await B('labelAt', [0]); const pl0 = s.d.played[0]; await tap(l.x, l.y); await sleep(1200); s = await D();
    ok(s.d.rows[0].mute && s.d.played[0] - pl0 <= 3 && /out/.test(s.data), 'a tap on the hats\' name takes them out (silent, its name said): ' + JSON.stringify(s.data));
    await tap(l.x, l.y); s = await D(); ok(!s.d.rows[0].mute, 'a second brings them back'); }
  // the rings of pitch inside: a tap puts a note there, heard on the next step; a second takes it away; a finger kept still plays
  // its pitch on every step while it stays
  { const q = await B('at', [4, 3]); await page.evaluate(() => { window.__sp = []; }); await tap(q.x, q.y); s = await D();
    ok(s.d.notes.some(n => Math.abs(n[0] - 4 / 16) < 1e-9 && n[1] === 3 && n[2] === 0), 'a tap inside the ring puts a glass note on step 5, pitch 4: ' + JSON.stringify(s.d.notes));
    await sleep(4300); let sp = await page.evaluate(() => window.__sp.slice()); ok(sp.filter(e => e.p === 3 && e.q === 4).length >= 2, 'and it plays there every time round: ' + sp.filter(e => e.p === 3).length);
    await tap(q.x, q.y); s = await D(); ok(!s.d.notes.length, 'a second tap takes it away');
    const h = await B('at', [10, 6]); await page.evaluate(() => { window.__sp = []; }); await touch([[h.x, h.y]], 'touchStart'); await sleep(2200); const mid = await D(); await lift(); await sleep(200);
    sp = await page.evaluate(() => window.__sp.slice()); const rolled = sp.filter(e => e.roll && e.p === 6), ks = new Set(rolled.map(e => e.k));
    ok(mid.d.rolls.length === 1 && mid.d.rolls[0].on && ks.size >= 8 && !(await D()).d.rolls.length, 'a finger kept still plays its pitch on every step (' + ks.size + ' steps in 2.2 s) and stops when it lifts');
    await B('set', [[]]); }
  // the sound: a tap on it goes to the next (rubber), its name said; dice makes up a melody in it on the beat's own strokes; reset
  s = await D(); await btn(s, 'snd'); s = await D(); ok(s.d.sound === 'rubber' && /rubber/.test(s.data) && s.tools.find(t => t.id === 'snd').txt === 'rubber', 'the sound button: rubber next, its name said: ' + JSON.stringify(s.data));
  await btn(s, 'dice'); s = await D(); { const N = s.d.N, kick = s.d.rows[2].hits.map(h => h - 1), st = s.d.notes.map(n => Math.round(n[0] * N) % N);
    ok(s.d.notes.length >= 4 && s.d.notes.every(n => n[2] === 1) && kick.every(k => st.includes(k)) && /melody/.test(s.data), 'dice: a melody in rubber, on every kick: ' + st.join(' ')); }
  await page.screenshot({ path: 'shots/beat_phone_dice.png' });
  // kept after a reload: the beat chosen, its changes, the notes, the sound
  await btn(s, 'next'); await btn(s, 'next'); await sleep(300); { const c = await B('cellAt', [2, 1]); await tap(c.x, c.y); }
  const before = await D(); await page.reload({ waitUntil: 'load' }); await sleep(1500); cdp = await ctx.newCDPSession(page);
  await page.evaluate(() => { const L = window.__lc; L.go(L.WORLDS.findIndex(w => w.id === 'beat'), true); }); await sleep(700); s = await D();
  ok(s.d.id === before.d.id && s.d.rows[2].hits.join() === before.d.rows[2].hits.join() && s.d.notes.length === before.d.notes.length && s.d.sound === 'rubber',
    'kept after a reload: ' + s.d.name + ', its changed row ' + s.d.rows[2].hits.join(' ') + ', ' + s.d.notes.length + ' notes, ' + s.d.sound);
  await btn(s, 'reset'); s = await D(); ok(s.d.rows[2].hits.join() === B0[s.d.id].r[2][2].join() && !s.d.notes.length, 'reset: ' + s.d.name + ' as transcribed, no notes');
  // every beat plays: each chosen in turn, its strokes given out, its recordings there, no errors
  await page.evaluate(() => { window.__lc.musicOn(); window.__sp = []; window.__lc.BEAT.spy(e => window.__sp.push(e)); }); for (let k = 0; k < 30 && !(await D()).d.run; k++) await sleep(200);
  { const bad = [], slow = []; for (let i = 0; i < lib.length; i++) { await B('pick', [i]); await page.evaluate(() => { window.__sp = []; }); await sleep(i === 0 ? 1500 : 900);
      const r = await page.evaluate(i => { const L = window.__lc, R = L.BEAT.lib[i]; return { n: window.__sp.length, ready: L.BEAT.banks(R).every(L.SND.ready), id: L.BEAT.dbg().id }; }, i);
      if (!r.n || r.id !== lib[i].id) bad.push(lib[i].id + ':' + r.n); if (!r.ready) slow.push(lib[i].id); }
    s = await D(); ok(!bad.length && !s.errs.length, 'every one of the 34 beats plays its strokes when chosen' + (bad.length ? ': not ' + bad.join(' ') : '') + (s.errs.length ? ' ' + s.errs[0] : ''));
    for (let k = 0; k < 20 && slow.length; k++) { await sleep(400); const still = await page.evaluate(ids => ids.filter(id => { const L = window.__lc, R = L.BEAT.lib.find(r => r.id === id); return !L.BEAT.banks(R).every(L.SND.ready); }), slow); slow.length = 0; slow.push(...still); }
    ok(!slow.length, 'and every recording each one uses is loaded: ' + (slow.join(' ') || 'all')); }
  await B('pick', [0]); await page.screenshot({ path: 'shots/beat_phone_end.png' });
  // leaving Beat: the band comes back
  await page.evaluate(() => { const L = window.__lc; L.go(0, true); }); await sleep(1500);
  { const b = await page.evaluate(() => ({ duck: window.__lc.AU.duck.gain.value, toy: window.__lc.AU.toy.gain.value, on: window.__lc.BEAT.dbg().on, mode: document.getElementById('bMode').hidden }));
    ok(b.duck > .95 && b.toy > .95 && !b.on && !b.mode, 'leaving Beat, the band comes back (its level whole again) and the mode button with it: ' + JSON.stringify(b)); }
  await page.evaluate(() => { const L = window.__lc; L.go(L.WORLDS.findIndex(w => w.id === 'beat'), true); }); await sleep(500);
  // the Claude app's heights and a phone on its side: everything whole
  for (const [w, h] of [[390, 750], [375, 667], [360, 640], [844, 390]]) { await page.setViewportSize({ width: w, height: h }); await sleep(800); await page.evaluate(() => window.__lc.BEAT.pick(5)); await sleep(300); s = await D();
    ok(fits(s) && s.tools.every(t => t.l >= 0 && t.r <= w && t.b <= s.rail.t + 1) && s.d.geo.R >= (w > h ? 70 : 90), w + 'x' + h + ': the circle (R ' + Math.round(s.d.geo.R) + '), the grid and the row whole' + (s.d.geo.wide ? ', the grid beside the circle' : '')); await page.screenshot({ path: `shots/beat_${w}x${h}.png` }); }
  await page.evaluate(() => window.__lc.BEAT.spy(null));
  const e = [...new Set(errs)]; if (e.length) console.log('ERRORS', e.slice(0, 6));
  await ctx.close(); await browser.close(); console.log(fail.length || e.length ? 'BEAT FAILED' : 'BEAT OK'); process.exit(fail.length || e.length ? 1 : 0);
})();
