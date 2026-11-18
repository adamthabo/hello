// (18 Nov, 11:31: "Give me different brushes and pens and pencils and make the first art page a fun sketchbook that you can do anything
// with. Paint, drew write. And then it can convert to text, give you a quick image") Paint's sketchbook, with real touches: the pen,
// the pencil, the marker and the eraser draw on a sheet over the water (three sizes, the paint's colours, the mirror), the sheet hides
// for the game and keeps its picture through a new size of the screen; and, with a stand-in for the Claude app, the page read as text
// (set in type where the writing was) and drawn again as a quick picture (laid on the page), Claude's picture kept to drawing.
// usage: node tools/t_sketch.js [size]
const fs = require('fs'), path = require('path');
const { launch, open } = require('./lib'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const fail = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fail.push(m); };
const size = process.argv[2] || 'phone';
const FAKE = fs.readFileSync(path.join(__dirname, 'fake_claude.js'), 'utf8');
async function setup(browser, init) {
  const { page, errs, ctx } = await open(browser, size, init ? { init } : {}); await sleep(1200);
  await page.evaluate(() => { window.__lc.GOV.n = -1e9; window.__lc.go(0, true); window.__lc.musicOff(); }); await sleep(600);
  const cdp = await ctx.newCDPSession(page);
  const touch = async (pts, type) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: i + 1 })) });
  const frame = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => r())));
  // a stroke as a finger draws it: one move a frame
  const stroke = async (x0, y0, x1, y1, n = 8) => { await touch([[x0, y0]], 'touchStart'); await frame(); for (let k = 1; k <= n; k++) { await touch([[x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n]], 'touchMove'); await frame(); } await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await frame(); await frame(); };
  const click = id => page.evaluate(id => document.getElementById(id).click(), id);
  // the sheet's ink at a point of the screen (its alpha, 0 to 255), and across a vertical line through x (how wide the stroke is)
  // (read through a canvas of its own each time, as the page's sheet is never read back)
  await page.evaluate(() => { window.__px = (x, y, w, h) => { const c = document.getElementById('sk'), t = document.createElement('canvas'); t.width = Math.max(1, w); t.height = Math.max(1, h); const g = t.getContext('2d', { willReadFrequently: true }); g.drawImage(c, -x, -y); return g.getImageData(0, 0, t.width, t.height).data; }; });
  const alpha = (x, y) => page.evaluate(a => { const c = document.getElementById('sk'), k = c.width / innerWidth; return window.__px(Math.round(a[0] * k), Math.round(a[1] * k), 1, 1)[3]; }, [x, y]);
  const across = (x, y0, y1) => page.evaluate(a => { const c = document.getElementById('sk'), k = c.width / innerWidth, h = Math.round((a[2] - a[1]) * k), d = window.__px(Math.round(a[0] * k), Math.round(a[1] * k), 1, h);
    let n = 0, s = 0; for (let i = 0; i < h; i++) { const v = d[i * 4 + 3]; if (v > 24) n++; s += v; } return { wide: n / k, sum: s, max: Math.max(...Array.from({ length: h }, (_, i) => d[i * 4 + 3])) }; }, [x, y0, y1]);
  const D = () => page.evaluate(() => window.__lc.WORLDS[0].o.dbg());
  // the water's ink: asked for, then read a moment later (the water is read back from the picture card by card)
  const dens = async (x, y, r) => { await page.evaluate(a => window.__lc.WORLDS[0].o.sample(a[0], a[1], a[2]), [x, y, r]); await sleep(400); return page.evaluate(a => window.__lc.WORLDS[0].o.sample(a[0], a[1], a[2]).dens, [x, y, r]); };
  // waits for the page to come to a state (this machine draws a few frames a second, and Claude's stand-in answers on timers)
  const until = async (f, ms = 8000) => { const t0 = Date.now(); let v; while (Date.now() - t0 < ms) { v = await page.evaluate(f); if (v) return v; await sleep(120); } return v; };
  return { page, errs, ctx, stroke, click, alpha, across, D, frame, dens, until };
}
(async () => {
  const browser = await launch();
  // ---- the tools, without Claude ----
  {
    const { page, errs, ctx, stroke, click, alpha, across, D, dens } = await setup(browser);
    await click('p_clear'); await sleep(200);
    let d = await D();
    ok(d.pen === 'paint' && d.skh === false, 'Paint opens with the paint, and the sheet over the water is there (empty): ' + JSON.stringify({ pen: d.pen, skh: d.skh }));
    const row = await page.evaluate(() => { const r = document.getElementById('p_ask'); return { row: !!r, hidden: r ? r.hidden : null, t: document.getElementById('bText').hidden, p: document.getElementById('bPic').hidden }; });
    ok(row.row && row.hidden && row.t && row.p, 'where Claude cannot be asked (not in the Claude app) the "ask claude" row is not there: ' + JSON.stringify(row));
    const tools = await page.evaluate(() => [...document.querySelectorAll('#ms_paint [id^=pn_]')].map(b => b.id.slice(3)).join() + ' | ' + [...document.querySelectorAll('#ms_paint [id^=ps_]')].map(b => b.textContent + (b.disabled ? '(off)' : '')).join());
    ok(tools === 'paint,pen,pencil,marker,eraser | fine(off),medium(off),bold(off)', 'Paint\'s own menu: the paint, a pen, a pencil, a marker, an eraser; three sizes (not for the paint): ' + tools);
    // the pen: on the sheet, crisp, the water untouched; the menu button shows it
    await click('pn_pen'); await click('ps_0'); await stroke(60, 300, 330, 300);
    d = await D(); const icon = await page.evaluate(() => document.getElementById('bTools').innerHTML);
    const pen0 = await across(195, 280, 320), dn0 = await dens(195, 300, 6);
    ok(d.pen === 'pen' && d.psz === 0 && d.skv > 0 && pen0.max > 200 && dn0 < .05, 'the pen draws on the sheet, crisp, and leaves the water alone: ' + JSON.stringify({ skv: d.skv, pen0, dens: +dn0.toFixed(3) }));
    ok(/M3 15\.4l1\.2-4\.6/.test(icon), 'the button for Paint\'s menu shows the tool in hand (the pen)');
    await click('ps_2'); await stroke(60, 400, 330, 400); const pen2 = await across(195, 370, 430);
    ok(pen2.wide > pen0.wide * 2.2, 'bold is wider than fine: ' + pen0.wide.toFixed(1) + ' px, then ' + pen2.wide.toFixed(1) + ' px');
    // the pencil, paler and grainy; the marker, broad
    await click('pn_pencil'); await click('ps_1'); await stroke(60, 480, 330, 480); const pc = await across(195, 460, 500);
    ok(pc.max > 20 && pc.max < 200, 'the pencil is paler, laid in grainy passes: the strongest ink ' + pc.max + ' of 255');
    await click('pn_marker'); await click('ps_1'); await stroke(60, 560, 330, 560); const mk = await across(195, 520, 600);
    ok(mk.wide > 12 && mk.max > 200, 'the marker is broad: ' + mk.wide.toFixed(1) + ' px');
    // the eraser takes the ink away where it goes
    const before = await alpha(195, 400);
    await click('pn_eraser'); await click('ps_2'); await stroke(195, 250, 195, 620, 12);
    const after = [await alpha(195, 300), await alpha(195, 400), await alpha(195, 560)], kept = await alpha(90, 400);
    ok(before > 200 && after.every(v => v < 10) && kept > 200, 'the eraser lifts the ink where it goes, and only there: ' + JSON.stringify({ before, after, kept }));
    // the mirror: a pen stroke on the left is drawn on the right too
    await click('p_clear'); await sleep(150); await click('pn_pen'); await click('ps_1');
    await page.evaluate(() => { const L = window.__lc.WORLDS[0].o; while (L.dbg().mir !== 2) document.getElementById('p_mir').click(); });
    const cx = await page.evaluate(() => window.__lc.STG.cx);
    await stroke(70, 350, 140, 350); const mir = [await alpha(105, 350), await alpha(2 * cx - 105, 350)];
    await page.evaluate(() => { const L = window.__lc.WORLDS[0].o; while (L.dbg().mir !== 1) document.getElementById('p_mir').click(); });
    ok(mir[0] > 200 && mir[1] > 200, 'the mirror draws the pen\'s stroke on the other side too: ' + JSON.stringify(mir));
    // the game puts the sheet away, and it comes back after
    await click('t_puz'); await sleep(300); const inGame = (await D()).skh; await page.evaluate(() => document.getElementById('t_ink').click()); await sleep(300); const back = (await D()).skh;
    ok(inGame === true && back === false && await alpha(105, 350) > 200, 'the game puts the sheet away; after it the drawing is there again: ' + JSON.stringify({ inGame, back }));
    // a new size of the screen keeps the drawing where it was, measured from the middle
    await page.screenshot({ path: `shots/sketch_${size}_tools.png` });
    const vp = page.viewportSize(); await page.setViewportSize({ width: vp.width, height: vp.height - 94 }); await sleep(900);
    const dy = -47, moved = await alpha(105, 350 + dy);
    ok(moved > 200, 'a shorter screen keeps the drawing (it moves with the middle): ' + moved);
    await page.screenshot({ path: `shots/sketch_${size}_shorter.png` });
    await page.setViewportSize(vp); await sleep(700);
    // start over clears the sheet too
    await click('p_clear'); await sleep(200); d = await D();
    ok(d.skv === 0 && await alpha(105, 350) === 0, 'start over clears the sheet as well as the water');
    // the paint still paints in the water
    await click('pn_paint'); await stroke(80, 460, 310, 460); await sleep(300); d = await D();
    const dens2 = await dens(195, 460, 14);
    ok(d.pen === 'paint' && d.skv === 0 && dens2 > .05, 'the paint paints in the water, not on the sheet: ' + JSON.stringify({ skv: d.skv, dens: +dens2.toFixed(3) }));
    const e = [...new Set(errs)]; if (e.length) { console.log('ERRORS', e.slice(0, 6)); fail.push('errors'); }
    await ctx.close();
  }
  // ---- asking Claude (a stand-in for the Claude app's sample capability) ----
  {
    const { page, errs, ctx, stroke, click, alpha, D, until } = await setup(browser, FAKE);
    await click('p_clear'); await sleep(200);
    const row = await page.evaluate(() => { const r = document.getElementById('p_ask'), v = e => !!e && !e.hidden; return { row: v(r), t: v(document.getElementById('bText')), p: v(document.getElementById('bPic')), label: r && r.querySelector('.ml') && r.querySelector('.ml').textContent }; });
    ok(row.row && row.t && row.p && row.label === 'ask claude', 'in the Claude app, where Claude can look at a picture, Paint\'s menu has "ask claude": to text, quick image: ' + JSON.stringify(row));
    // writing, read as text
    await click('pn_pen'); await click('ps_1');
    await stroke(120, 330, 120, 430, 5); await stroke(180, 330, 180, 430, 5); await stroke(120, 380, 180, 380, 4); await stroke(240, 330, 240, 430, 5);
    const box0 = await page.evaluate(() => window.__lc.WORLDS[0].o.skBox());
    await click('bText'); await sleep(150);
    const reading = await page.evaluate(() => { const c = document.getElementById('card'); return { k: c.dataset.k, shown: !c.hidden, t: c.textContent }; });
    ok(reading.k === 'sk' && reading.shown && /reading the page/.test(reading.t), 'to text: a card says it is reading the page: ' + reading.t);
    await until(() => !!document.querySelector('#card .ca button.cl'));
    const call = (await page.evaluate(() => window.__ask.calls))[0] || {};
    const card = await page.evaluate(() => { const c = document.getElementById('card'); return { t: (c.querySelector('.ckt') || {}).textContent, acts: [...c.querySelectorAll('.ca button')].map(b => b.textContent).join() }; });
    ok(call.tier === 'quick' && call.n === 1 && call.type === 'image/png' && call.size > 200 && /dark ink on white/.test(call.input) && /Read every word/.test(call.input), 'Claude is asked once, quickly, with the page\'s ink as one picture, to read what is written: ' + JSON.stringify({ tier: call.tier, n: call.n, type: call.type, size: call.size }));
    ok(card.t === 'HI\nTHERE' && card.acts === 'copy,type it on the page', 'the card shows what Claude read, to copy or to type on the page: ' + JSON.stringify(card));
    await page.screenshot({ path: `shots/sketch_${size}_to_text.png` });
    await page.evaluate(() => document.querySelector('#card .ca button.cl').click()); await sleep(300);
    const box1 = await page.evaluate(() => window.__lc.WORLDS[0].o.skBox()), shut = await page.evaluate(() => document.getElementById('card').hidden);
    const typed = await page.evaluate(b => { const c = document.getElementById('sk'), k = c.width / innerWidth, d = window.__px(Math.round(b.x0 * k), Math.round(b.y0 * k), Math.round((b.x1 - b.x0) * k), Math.round((b.y1 - b.y0) * k)); let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 128) n++; return n; }, box1);
    ok(shut && typed > 400 && box1.x0 >= box0.x0 - 1 && box1.x1 <= box0.x1 + 1 && await alpha(120, 335) < 40, 'typed on the page: the card goes, the words are set in type where the writing was, and the handwriting is gone: ' + JSON.stringify({ typed, box1 }));
    await page.screenshot({ path: `shots/sketch_${size}_typed.png` });
    // a sketch, drawn again as a quick picture
    await click('pn_marker'); await stroke(150, 300, 240, 360, 6); await stroke(60, 640, 330, 640, 8);
    await click('bPic'); await until(() => !!document.querySelector('#card img.cpic'));
    const mid = await page.evaluate(() => { const c = document.getElementById('card'), i = c.querySelector('img.cpic'); return { k: c.dataset.k, t: c.textContent, img: !!i, svg: i ? decodeURIComponent(i.src.split(',')[1]) : '' }; });
    ok(mid.k === 'sk' && mid.img && /circle/.test(mid.svg) && !/<g /.test(mid.svg) && /still drawing/.test(mid.t), 'quick image: the picture shows as Claude draws it (the part that is done): ' + mid.t.slice(0, 60));
    await until(() => !!document.querySelector('#card .ca button.cl'));
    const call2 = (await page.evaluate(() => window.__ask.calls))[1] || {};
    const fin = await page.evaluate(() => { const c = document.getElementById('card'), i = c.querySelector('img.cpic'), s = i ? decodeURIComponent(i.src.split(',')[1]) : ''; return { svg: s, acts: [...c.querySelectorAll('.ca button')].map(b => b.textContent).join(), t: c.textContent }; });
    ok(call2.tier === 'default' && call2.n === 1 && call2.size > 500 && /near-black page \d+ wide and \d+ tall/.test(call2.input), 'Claude is asked to draw the page again, with the page as it looks as one picture: ' + JSON.stringify({ tier: call2.tier, n: call2.n, size: call2.size }));
    ok(/<g /.test(fin.svg) && !/script|onclick|__pwned/.test(fin.svg) && fin.acts === 'put it on the page' && !/still drawing/.test(fin.t), 'the whole picture, kept to drawing (no script, no handlers), to put on the page: ' + fin.svg.length + ' characters');
    await page.screenshot({ path: `shots/sketch_${size}_quick_image.png` });
    await page.evaluate(() => document.querySelector('#card .ca button.cl').click()); await sleep(500);
    const on = await page.evaluate(() => { const c = document.getElementById('sk'), k = c.width / innerWidth, p = window.__px(Math.round(195 * k), Math.round(330 * k), 1, 1); return { rgba: [...p], card: document.getElementById('card').hidden, pw: window.__pwned || 0 }; });
    const d2 = await D();
    ok(on.card && on.rgba[3] > 200 && on.rgba[0] > 200 && on.rgba[2] < 160 && on.pw === 0 && d2.skv > 0, 'put on the page: the picture is laid over the screen in place of the sketch, to draw on; nothing in it ran: ' + JSON.stringify(on));
    await page.screenshot({ path: `shots/sketch_${size}_on_page.png` });
    // Claude busy: said, and the buttons stay; Claude not allowed: said, and the buttons go
    await page.evaluate(() => { window.__ask.fail = 'rate_limited'; }); await click('bText'); await until(() => /busy/.test(document.getElementById('card').textContent));
    const busy = await page.evaluate(() => ({ t: document.getElementById('card').textContent, b: !document.getElementById('bText').hidden }));
    ok(/busy/.test(busy.t) && busy.b, 'Claude busy: the card says so, and the buttons stay: ' + busy.t);
    await page.evaluate(() => { window.__ask.fail = 'not_granted'; }); await click('bPic'); await until(() => /look/.test(document.getElementById('card').textContent));
    const no = await page.evaluate(() => ({ t: document.getElementById('card').textContent, row: document.getElementById('p_ask').hidden }));
    ok(/can.t look/.test(no.t) && no.row, 'Claude not allowed: the card says so once, and the row goes: ' + no.t);
    // leaving Paint takes the card away
    await page.evaluate(() => window.__lc.go(1, true)); await sleep(500);
    const gone = await page.evaluate(() => { const c = document.getElementById('card'); return c.hidden || c.dataset.k !== 'sk'; });
    ok(gone, 'leaving Paint takes its card away');
    const e = [...new Set(errs)]; if (e.length) { console.log('ERRORS', e.slice(0, 6)); fail.push('errors'); }
    await ctx.close();
  }
  await browser.close(); console.log(fail.length ? 'SKETCH FAILED' : 'SKETCH OK'); process.exit(fail.length ? 1 : 0);
})();
