// SCHWARZSTART · boot and main loop
import { Gfx } from './gfx.js';
import { World } from './world.js';
import { Game } from './game.js';
import { UI, Input } from './ui.js';
import { Sound } from './audio.js';
import { CharLib } from './rig.js';
import { OPTIONS, optDefaults, applyAll } from './settings.js';
import { Net } from './net.js';
import { Life } from './life.js';
import { MP, MODES, readMode, enterMode, probeServer, renderModes } from './mp.js';
import { loadJSON, loadImage, IS_MOBILE, IS_TOUCH, store, el } from './util.js';

const fail = (e) => { console.error('BOOT', (e && e.stack) || e); const b = el('err'); b.classList.remove('hidden'); b.innerHTML = `<div><b style="font:400 30px var(--disp);letter-spacing:.08em">DER STROM IST WEG</b><br><br>The game could not start on this device.<br><span style="color:#8d99a6">${String((e && e.message) || e).slice(0, 200)}</span></div>`; };
addEventListener('error', (e) => { if (!window.__ready) fail(e.error || e.message); });
addEventListener('unhandledrejection', (e) => { if (!window.__ready) fail(e.reason); });

(async () => {
  const sv = store.get('save', null), tier = (sv && sv.opt && sv.opt.q) || new URLSearchParams(location.search).get('q') || (IS_MOBILE ? 'mid' : 'high');
  const bar = el('load').firstElementChild, prog = (p, t) => { bar.style.transform = `scaleX(${p})`; if (t) el('loadT').textContent = t; };
  el('ctl').textContent = IS_TOUCH ? 'Touch: left thumb moves, right side looks. Best held sideways.' : 'WASD and mouse · click to fire · Space takes cover · M map';
  const gfx = new Gfx(el('c'), tier), mode = readMode(); probeServer();
  const [map, meta] = await Promise.all([loadJSON('data/map.json'), loadJSON('assets/tex/tex.json')]);
  await gfx.loadTextures(meta, 'assets/tex/', (p) => prog(p * 0.55, 'Mixing plaster, brick and asphalt'));
  const [mask1, mask2, walk, dist] = await Promise.all(['mask1.png', 'mask2.png', 'walk.png', 'dist.png'].map((f) => loadImage('assets/' + f)));
  const world = new World(gfx, map, { mask1, mask2, walk, dist });
  await world.build((p) => prog(0.55 + p * 0.4, 'Building Berlin Mitte, block by block'));
  prog(0.96, 'Waking up the agents'); await CharLib.load('assets/');
  const audio = new Sound(), game = new Game(gfx, world, map, audio), ui = new UI(game, gfx, world, map, audio), inp = new Input(el('app'), el('c'), ui);
  game.ui = ui; game.inp = inp; if (sv && sv.opt && sv.opt.mute) audio.mute(true);
  ui.ctx = { gfx, world, game, ui, audio }; ui.optDefs = OPTIONS; game.S.opt = optDefaults(game.S.opt || {}); if (!game.S.opt.q) game.S.opt.q = tier; applyAll(ui.ctx, game.S.opt);
  const mp = mode ? new MP(game, ui, mode) : null; if (mp) mp.setup();          // mode rules before the city comes alive
  const net = mp || new Net(game, ui); game.net = net; if (!mp) net.start();
  prog(0.98, 'Waking up the city'); let life = null; try { life = new Life(game); game.life = life; } catch (e) { console.warn('life', e); }
  prog(1, 'Ready'); window.__ready = true; window.__game = game; window.__app = { game, ui, world, gfx, inp, audio, mp, MODES };
  const fresh = !sv || !sv.stats || sv.stats.t < 5, bs = el('btnStart'), bn = el('btnNew');
  bs.textContent = mp ? (mp.def.pvp ? 'Antreten' : mp.def.survival ? 'Hinaus in die Kälte' : 'Los') : fresh ? 'Begin the shift' : 'Back on shift'; bs.classList.remove('hidden'); if (!fresh && !mp) bn.classList.remove('hidden'); el('load').classList.add('hidden'); el('loadT').classList.add('hidden');
  if (mp) { el('kick').textContent = (mp.def.name + ' · ' + mp.def.tag + (mp.def.online ? ' · Raum ' + mode.room : '')).toUpperCase(); el('prem').textContent = mp.def.about; }
  const mst = store.get('mp', null) || {}; probeServer().then((on) => renderModes(mode && mode.id, on, mode ? mode.room : mst.room, mst.name || game.S.tag || ''));
  el('mgrid').addEventListener('click', (e) => { const b = e.target.closest('[data-mode]'); if (!b || b.disabled) return; const room = el('mRoom').value, name = el('mName').value.trim().slice(0, 16); store.set('mp', { room, name }); enterMode(b.dataset.mode, room); });
  let playing = false, tt = 0;
  const hub = map.hub, dom = world.fr('I', 262, 82);
  const start = () => {
    audio.init(); playing = true; if (mp) { const nm = el('mName').value.trim().slice(0, 16); if (nm) { mp.name = nm; store.set('mp', { ...(store.get('mp', null) || {}), name: nm }); } mp.start(); } el('title').classList.add('hidden'); el('hud').classList.remove('hidden'); game.paused = false; inp.on = true; ui.fade();
    if (mp) ui.banner(mp.def.name.toUpperCase(), mp.def.sub, mp.def.pvp ? 'warn' : 'net');
    else if (fresh) {
      ui.banner('DIE INSEL', 'Museumsinsel · Stützpunkt Notbetrieb', 'net');
      const H = IS_TOUCH ? ['Left thumb moves. Drag the right side to look. Hold FIRE: your weapon finds the nearest hostile in front of you.', 'COVER snaps you behind walls, cars and barriers. Fire from cover to lean out.', 'The desks in the museum colonnade run the five networks. The map button shows all of Berlin.', 'First shift: cross the bridge north-east to S Hackescher Markt. Follow the yellow marker.']
        : ['WASD to move, mouse to look, click to fire, right click to aim. Shift sprints, C rolls.', 'Space snaps you into cover behind walls, cars and barriers. Fire from cover to lean out.', 'The desks in the museum colonnade run the five networks. M opens the map of Berlin.', 'First shift: cross the bridge north-east to S Hackescher Markt. Follow the yellow marker.'];
      H.forEach((t, i) => setTimeout(() => { if (!game.paused) ui.hint(t, 9); }, 1800 + i * 11000));
    }
  };
  bs.addEventListener('click', start);
  bn.addEventListener('click', () => { if (bn.dataset.sure) { game.wipe(); location.reload(); } else { bn.dataset.sure = 1; bn.textContent = 'Erase and restart?'; } });
  addEventListener('resize', () => gfx.resize()); if (window.visualViewport) visualViewport.addEventListener('resize', () => gfx.resize());
  document.addEventListener('visibilitychange', () => { if (document.hidden) { game.save(); inp.reset(); } });
  addEventListener('pagehide', () => game.save());
  let last = performance.now(), wt = 0, fpsN = 0, fpsT = 0;
  const loop = (now) => {
    requestAnimationFrame(loop); const ms = now - last; last = now; if (document.hidden) return; const dt = Math.min(0.05, ms / 1000); tt += dt;
    fpsN++; fpsT += ms; if (fpsT > 500) { if (ui.showFps) el('fps').textContent = `${Math.round((fpsN * 1000) / fpsT)} fps · ${Math.round(gfx.scale * gfx.q.scale * 100)}% · ${world.visChunks || 0} chunks`; fpsN = 0; fpsT = 0; }
    if (playing && game.paused && ui.panel === 'agent') ui.agentFrame(dt);
    if (life && !(playing && game.paused)) { try { life.update(dt); } catch (e) { console.warn('life', e); life = null; } }
    if (playing) { inp.poll(); game.update(dt); net.update(dt); if (!game.paused) ui.frame(dt); world.update(dt, game.P.x, game.P.z); gfx.update(game.paused ? 0 : dt, game.P); }
    else { const a = tt * 0.05 + 0.9; gfx.camera.position.set(hub[0] + Math.cos(a) * 82, 15 + Math.sin(tt * 0.1) * 3, hub[1] + Math.sin(a) * 82); gfx.camera.lookAt(dom[0], 34, dom[1]); world.update(dt, hub[0], hub[1]); gfx.update(dt, { x: hub[0], z: hub[1] }); game.P.rig.pose({ speed: 0 }, dt); game.P.rig.root.position.set(game.P.x, 0, game.P.z); }
    wt -= dt; if (wt <= 0) { wt = 1; audio.weather(gfx.weather.snow, gfx.weather.fog); }
    gfx.render(ms);
  };
  requestAnimationFrame(loop);
})().catch(fail);
