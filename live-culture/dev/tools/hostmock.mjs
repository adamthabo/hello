// The hosted page on this machine, with the real worker.js answering /api/... and every upstream source played from local files
// (this session can reach only GitHub). Port 8758. CelesTrak and NOAA SWPC are made to fail, so the mirrors are what is used;
// YouTube is played by a few made-up pages: some cameras on the air, one off it, one that may not be played on another site, a search
// that finds a stream (after a looped film posing as a camera, which must be passed over), the rest unknown.
// usage: node tools/hostmock.mjs   (from dev/, after sh tools/check.sh and tools/pack_hosted.sh)
import http from 'node:http';
import fs from 'node:fs';
// dev/ is the folder above this one; the Worker and public/ are beside dev/. The raw sources come from tools/feed.py (into dev/data/live/);
// the stand-in pictures (testdata/: clouds.jpg, rain.png, blank.png, goes-east.jpg, goes-west.jpg) must be made by hand, and the weather
// model's stand-ins (testdata/gfs_atmos.grib2 and gfs_wave.grib2 with their .idx) by tools/mkgfs.py from a sample GFS file.
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
const LIVE = { gswNWtJlUco: 1, ydYDqZQpim8: 1, fO9e9jnhYK8: 1, a0i1Kg6fROg: 1, POLARBEAR01: 1, NOEMBED0001: 1 }, OFF = { GSJwOX3gZsk: 1 }, NOEMBED = { NOEMBED0001: 1 };
// a search page with these live results (id, title, channel)
const SEARCH = { 'polar bear cam explore.org live': [['LOOPFAKE001', 'Polar Bears 4K relaxing music 24/7', 'Calm Nature'], ['NOEMBED0001', 'Polar bear cam live', 'explore.org'], ['POLARBEAR01', 'LIVE Polar Bear Cam: Tundra Buggy', 'explore.org']] };
function vr(id, title, ch) { return '"videoRenderer":{"videoId":"' + id + '","thumbnail":{},"title":{"runs":[{"text":"' + title + '"}]},"ownerText":{"runs":[{"text":"' + ch + '"}]},"badges":[{"metadataBadgeRenderer":{"style":"BADGE_STYLE_TYPE_LIVE_NOW","label":"LIVE"}}],' + 'x'.repeat(400) + '}'; }
export const LOG = [];
globalThis.fetch = async (u, o) => {
  u = String(u); LOG.push(u);
  if (u === RAW + 'GefeiSHEN/NOAA-Aurora-Archive/main/OVATION/latest.json') return new Response(JSON.stringify({ snapshot: { path: 'OVATION/2026/11/10/2026-11-10T14-49-00Z.json' } }));
  let m;
  if ((m = /^https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})$/.exec(u))) {
    if (LIVE[m[1]]) return new Response('<html><meta name="title" content="Camera ' + m[1] + '"><link rel="canonical" href="https://www.youtube.com/watch?v=' + m[1] + '">..."playableInEmbed":' + (NOEMBED[m[1]] ? 'false' : 'true') + '..."ownerChannelName":"A channel"..."liveBroadcastDetails":{"isLiveNow":true}...</html>');
    if (OFF[m[1]]) return new Response('<html>..."liveBroadcastDetails":{"isLiveNow":false}...</html>');
    return new Response('<html>Before you continue to YouTube</html>');
  }
  // NOAA's weather model: the index, and a byte range of the file (the 2.5-degree GFS sample for the air, a made-up wave file)
  if ((m = /^https:\/\/noaa-gfs-bdp-pds\.s3\.amazonaws\.com\/gfs\.\d{8}\/\d\d\/(atmos|wave)\/.*?(\.idx)?$/.exec(u))) {
    const f = T + 'gfs_' + m[1] + (m[2] ? '.idx' : '.grib2');
    if (m[2]) return new Response(fs.readFileSync(f, 'utf8'));
    const all = fs.readFileSync(f), rg = /bytes=(\d+)-(\d*)/.exec((o && o.headers && (o.headers.range || o.headers.Range)) || '');
    if (!rg) return new Response(all);
    return new Response(all.subarray(+rg[1], rg[2] ? +rg[2] + 1 : all.length), { status: 206 });
  }
  // the weather at a place (Open-Meteo), made up but in its shape: four days by the hour
  if (u.startsWith('https://api.open-meteo.com/v1/forecast?')) {
    const t0 = Date.UTC(2026, 10, 12, 0), H = [], T = [], R = [], P = [];
    for (let k = 0; k < 96; k++) { H.push(new Date(t0 + k * 3600000).toISOString().slice(0, 16)); T.push(+(8 + 6 * Math.sin(k / 24 * 6.283 - 1.6)).toFixed(1)); R.push(k % 9 < 2 ? 0.6 : 0); P.push(k % 9 < 2 ? 70 : 10); }
    return new Response(JSON.stringify({ latitude: 41.8, longitude: -71.4, utc_offset_seconds: -18000, timezone: 'America/New_York',
      current: { time: new Date(Date.now() - 18000000).toISOString().slice(0, 14) + '00', temperature_2m: 8.4, apparent_temperature: 5.1, relative_humidity_2m: 81, precipitation: 0.2, weather_code: 61, cloud_cover: 92, pressure_msl: 1012.3, wind_speed_10m: 22.3, wind_direction_10m: 45, wind_gusts_10m: 40.1, is_day: 1 },
      hourly: { time: H, temperature_2m: T, precipitation: R, precipitation_probability: P },
      daily: { time: ['2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15'], weather_code: [61, 3, 1, 80], temperature_2m_max: [12, 10, 9, 13], temperature_2m_min: [4, 3, 1, 6], precipitation_sum: [6.2, 0, 0, 2.1], sunrise: [], sunset: [] } }));
  }
  // the radar index (RainViewer): three pictures, their tiles from this stand-in
  if (u === 'https://api.rainviewer.com/public/weather-maps.json') { const n = Math.floor(Date.now() / 600000) * 600;
    return new Response(JSON.stringify({ version: '2.0', generated: n, host: 'https://tilecache.rainviewer.com', radar: { past: [0, 1, 2].map(k => ({ time: n - (2 - k) * 600, path: '/v2/radar/' + (n - (2 - k) * 600) })), nowcast: [] }, satellite: { infrared: [] } })); }
  if (u.startsWith('https://gibs.earthdata.nasa.gov/wms/')) { const tm = /TIME=([^&]+)/.exec(u); if (tm && /T\d\d:\d\d:00Z/.test(tm[1]) && LOG.filter(x => x.startsWith('https://gibs')).length === 1) return new Response(fs.readFileSync(T + 'blank.png'));
    return new Response(fs.readFileSync(T + 'rain.png')); }
  if ((m = /^https:\/\/www\.youtube\.com\/results\?search_query=([^&]+)/.exec(u))) { const hits = SEARCH[decodeURIComponent(m[1])] || []; return new Response('<html>var ytInitialData = {' + hits.map(h => vr(...h)).join(',') + '};</html>'); }
  if (u === 'https://www.youtube.com/@NASASpaceflight/live') return new Response('<html><link rel="canonical" href="https://www.youtube.com/watch?v=STARBASE001">"playableInEmbed":true "isLiveNow":true</html>');
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
