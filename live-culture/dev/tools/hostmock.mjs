// The hosted page on this machine, with the real worker.js answering /api/... and every upstream source played from local files
// (this session can reach only GitHub). Port 8758. CelesTrak and NOAA SWPC are made to fail, so the mirrors are what is used;
// YouTube is played by a few made-up pages: two cameras on the air, one off it, the rest unknown.
// usage: node tools/hostmock.mjs   (from lc2/, after sh tools/check.sh and tools/pack_hosted.sh)
import http from 'node:http';
import fs from 'node:fs';
// dev/ is the folder above this one; the Worker and public/ are beside dev/. The raw sources come from tools/feed.py (into dev/data/live/);
// the stand-in pictures (testdata/: clouds.jpg, rain.png, blank.png, goes-east.jpg, goes-west.jpg) must be made by hand.
const LC = new URL('..', import.meta.url).pathname, ROOT = new URL('../..', import.meta.url).pathname, PUB = ROOT + 'public/', D = LC + 'data/live/', T = LC + 'testdata/';
const RAW = 'https://raw.githubusercontent.com/';
const FILES = {
  [RAW + 'ztimson/satellites/master/satellites.tle']: D + 'tle/z-active.tle',
  [RAW + 'satvisorcom/satvisor-data/master/celestrak/tle/fengyun-1c-debris.tle']: D + 'tle/fengyun-1c-debris.tle',
  [RAW + 'satvisorcom/satvisor-data/master/celestrak/tle/cosmos-2251-debris.tle']: D + 'tle/cosmos-2251-debris.tle',
  [RAW + 'satvisorcom/satvisor-data/master/celestrak/tle/iridium-33-debris.tle']: D + 'tle/iridium-33-debris.tle',
  [RAW + 'satvisorcom/satvisor-data/master/celestrak/tle/cosmos-1408-debris.tle']: D + 'tle/cosmos-1408-debris.tle',
  [RAW + 'aaronyooht/wingmate-wind-data/master/docs/wind-global-1deg.json']: D + 'wind.json',
  [RAW + 'GefeiSHEN/NOAA-Aurora-Archive/main/OVATION/2026/11/10/2026-11-10T14-49-00Z.json']: D + 'aurora.json',
  [RAW + 'Meteoscience1/lightning-strikes-data/main/recent_strikes.json']: D + 'strikes.json',
  [RAW + 'juvenile454/planetary-lens-live-data/main/data/fire-hotspots-v2.json']: D + 'fires.json',
  [RAW + 'metacog-osint/elements/main/data/nhc.json']: D + 'nhc.json',
  [RAW + 'metacog-osint/elements/main/data/gdacs.json']: D + 'gdacs.json',
  'https://clouds.matteason.co.uk/images/2048x1024/clouds.jpg': T + 'clouds.jpg',
  'https://cdn.star.nesdis.noaa.gov/GOES19/ABI/FD/GEOCOLOR/1808x1808.jpg': T + 'goes-east.jpg',
  'https://cdn.star.nesdis.noaa.gov/GOES18/ABI/FD/GEOCOLOR/1808x1808.jpg': T + 'goes-west.jpg',
};
const LIVE = { gswNWtJlUco: 1, ydYDqZQpim8: 1, fO9e9jnhYK8: 1, a0i1Kg6fROg: 1 }, OFF = { GSJwOX3gZsk: 1 };
export const LOG = [];
globalThis.fetch = async (u, o) => {
  u = String(u); LOG.push(u);
  if (u === RAW + 'GefeiSHEN/NOAA-Aurora-Archive/main/OVATION/latest.json') return new Response(JSON.stringify({ snapshot: { path: 'OVATION/2026/11/10/2026-11-10T14-49-00Z.json' } }));
  let m;
  if ((m = /^https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})$/.exec(u))) {
    if (LIVE[m[1]]) return new Response('<html><link rel="canonical" href="https://www.youtube.com/watch?v=' + m[1] + '">..."liveBroadcastDetails":{"isLiveNow":true}...</html>');
    if (OFF[m[1]]) return new Response('<html>..."liveBroadcastDetails":{"isLiveNow":false}...</html>');
    return new Response('<html>Before you continue to YouTube</html>');
  }
  if (u.startsWith('https://gibs.earthdata.nasa.gov/wms/')) { const tm = /TIME=([^&]+)/.exec(u); if (tm && /T\d\d:\d\d:00Z/.test(tm[1]) && LOG.filter(x => x.startsWith('https://gibs')).length === 1) return new Response(fs.readFileSync(T + 'blank.png'));
    return new Response(fs.readFileSync(T + 'rain.png')); }
  if (u === 'https://www.youtube.com/@NASASpaceflight/live') return new Response('<html><link rel="canonical" href="https://www.youtube.com/watch?v=STARBASE001">"isLiveNow":true</html>');
  if (u.startsWith('https://www.youtube.com/')) return new Response('<html>"channelMetadataRenderer"</html>');
  const f = FILES[u];
  if (!f || !fs.existsSync(f)) return new Response('no', { status: /celestrak|swpc/.test(u) ? 503 : 404 });
  return new Response(fs.readFileSync(f), { headers: { 'last-modified': fs.statSync(f).mtime.toUTCString() } });
};
const { default: worker } = await import(ROOT + 'worker.js');
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript', json: 'application/json', mp3: 'audio/mpeg', jpg: 'image/jpeg', png: 'image/png', woff2: 'font/woff2' };
http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://127.0.0.1:8758');
    if (u.pathname === '/__log') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(LOG.splice(0))); return; }
    if (u.pathname.startsWith('/api/')) {
      const r = await worker.fetch(new Request(u.href), {});
      const h = {}; r.headers.forEach((v, k) => { h[k] = v; }); res.writeHead(r.status, h); res.end(Buffer.from(await r.arrayBuffer())); return;
    }
    let p = u.pathname === '/' ? '/index.html' : u.pathname;
    const file = p === '/local.html' ? LC + 'hosted/local.html' : p.startsWith('/_fonts/') ? LC + 'app' + p : PUB + p.slice(1);
    if (p.includes('..') || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': TYPES[p.split('.').pop()] || 'application/octet-stream' }); res.end(fs.readFileSync(file));
  } catch (e) { res.writeHead(500); res.end(String(e && e.stack || e)); }
}).listen(8758, '127.0.0.1', () => console.log('hosted mock on 8758'));
