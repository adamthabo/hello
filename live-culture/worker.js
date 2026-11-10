// Live Culture, served from your own Cloudflare Worker.
//
// The page, its sounds and its pictures are the static files in ./public. This script answers only what starts with /api/:
//   /api/feed/<name>  one public data source from the list FEEDS below, fetched for the page and kept for a few minutes
//   /api/cams         the live cameras the page's Live world shows (CAMS below)
//   /api/yt/<camera>  which YouTube video one of those cameras is streaming now (streams restart and change their address)
// Nothing else is forwarded and nothing is stored beyond a few minutes in memory. No keys, no accounts, nothing to set up.
//
// Every source is public. Each feed lists where to get it, best first: the official source, then public mirrors of it on GitHub.
// If every source of a feed fails, the last good copy is served, however old, with its own time (the page shows the data's time).
// Every picture is served from here, so the page may draw it onto the globe (a browser lets a page read only pictures from its own site).

const RAW = 'https://raw.githubusercontent.com/';
const CT = 'https://celestrak.org/NORAD/elements/gp.php?FORMAT=tle&GROUP=';
const SV = RAW + 'satvisorcom/satvisor-data/master/celestrak/tle/';
const UA = 'live-culture/1.0 (a personal page that reads public data a few times an hour)';

// name: how long a copy is good for (seconds), what it must look like, and where to get it
const FEEDS = {
  // every working satellite's orbit (CelesTrak asks that the same list be fetched no more than once every two hours)
  'tle-active': { ttl: 7200, kind: 'tle', min: 500000, src: [CT + 'active', RAW + 'ztimson/satellites/master/satellites.tle', RAW + 'PeanutButte7/satellite-globe-proxy/main/snapshots/active.tle', SV + 'active.tle'] },
  'tle-fengyun-1c-debris': { ttl: 43200, kind: 'tle', min: 2000, src: [CT + 'fengyun-1c-debris', SV + 'fengyun-1c-debris.tle'] },
  'tle-cosmos-2251-debris': { ttl: 43200, kind: 'tle', min: 2000, src: [CT + 'cosmos-2251-debris', SV + 'cosmos-2251-debris.tle'] },
  'tle-iridium-33-debris': { ttl: 43200, kind: 'tle', min: 1000, src: [CT + 'iridium-33-debris', SV + 'iridium-33-debris.tle'] },
  'tle-cosmos-1408-debris': { ttl: 43200, kind: 'tle', min: 200, src: [CT + 'cosmos-1408-debris', SV + 'cosmos-1408-debris.tle'] },
  // NOAA's GFS model: the wind ten metres up, one value a degree, each six-hourly run (as converted to JSON by a public repository)
  'wind': { ttl: 1800, kind: 'json', min: 100000, src: [RAW + 'aaronyooht/wingmate-wind-data/master/docs/wind-global-1deg.json'] },
  // NOAA SWPC: where the aurora is expected in the next half hour
  'aurora': { ttl: 300, kind: 'json', min: 100000, src: ['https://services.swpc.noaa.gov/json/ovation_aurora_latest.json', 'aurora-archive'] },
  // the lightning of the last half hour, as NOAA's GOES satellites saw it
  'strikes': { ttl: 240, kind: 'json', min: 20, src: [RAW + 'Meteoscience1/lightning-strikes-data/main/recent_strikes.json'] },
  // NASA FIRMS: the strongest fires of the last day
  'fires': { ttl: 900, kind: 'json', min: 100, src: [RAW + 'juvenile454/planetary-lens-live-data/main/data/fire-hotspots-v2.json'] },
  // tropical storms: NOAA's National Hurricane Center, and GDACS (EC Joint Research Centre and UN OCHA) for the rest of the world
  'nhc': { ttl: 1800, kind: 'json', min: 10, src: [RAW + 'metacog-osint/elements/main/data/nhc.json'] },
  'gdacs': { ttl: 1800, kind: 'json', min: 10, src: [RAW + 'metacog-osint/elements/main/data/gdacs.json'] },
  // the clouds of the whole Earth from the geostationary satellites (EUMETSAT's world cloud map, every three hours, by Matt Eason)
  'clouds': { ttl: 3600, kind: 'jpeg', min: 50000, src: ['https://clouds.matteason.co.uk/images/2048x1024/clouds.jpg'] },
  // the rain of the last half hour, measured from orbit (NASA IMERG, from the GPM constellation, as NASA GIBS draws it for the whole Earth).
  // IMERG's first estimate comes about four hours after the rain, so the newest half hour is looked for a few hours back, then GIBS's default
  'rain': { ttl: 1800, kind: 'png', min: 30000, src: ['imerg:4.5', 'imerg:5.5', 'imerg:7', 'imerg:default'] },
  // the whole Earth as two of NOAA's weather satellites see it now (GeoColor, a new picture every ten minutes)
  'goes-east': { ttl: 540, kind: 'jpeg', min: 50000, src: ['https://cdn.star.nesdis.noaa.gov/GOES19/ABI/FD/GEOCOLOR/1808x1808.jpg'] },
  'goes-west': { ttl: 540, kind: 'jpeg', min: 50000, src: ['https://cdn.star.nesdis.noaa.gov/GOES18/ABI/FD/GEOCOLOR/1808x1808.jpg'] },
};
const TYPE = { tle: 'text/plain; charset=utf-8', json: 'application/json', jpeg: 'image/jpeg', png: 'image/png' };
const GIBS = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&STYLES=&CRS=EPSG:4326&BBOX=-90,-180,90,180&WIDTH=2048&HEIGHT=1024&FORMAT=image/png&TRANSPARENT=TRUE&LAYERS=IMERG_Precipitation_Rate';

// The live cameras. kind 'yt': a YouTube stream, found by the video addresses in v (tried first) and then by the channels in c
// (whatever the channel is streaming now). kind 'img': a still from one of the feeds above, fetched again every `every` seconds.
// best: when the place looks best ('day', 'night' or 'any'); the page starts on one whose light suits it now.
// To add a camera: copy a line, give it a short id (a-z, 0-9, -), its place, and its video address or channel handle.
const CAMS = [
  { id: 'iss', kind: 'yt', name: 'Earth from the space station', place: '', lat: 0, lon: 0, moving: 'iss', v: ['fO9e9jnhYK8'], c: ['sen'], by: 'Sen, from the ISS', best: 'any' },
  { id: 'goes-west', kind: 'img', name: 'The Earth from GOES-18', place: '35,786 km above 137.2°W', lat: 0, lon: -137.2, img: 'goes-west', every: 600, by: 'NOAA GOES-18 · GeoColor · a new picture every 10 minutes', best: 'any' },
  { id: 'monterey', kind: 'yt', name: 'Sea nettles', place: 'Monterey Bay Aquarium, California', lat: 36.6187, lon: -121.9025, v: ['gswNWtJlUco'], by: 'Monterey Bay Aquarium', best: 'any' },
  { id: 'starbase', kind: 'yt', name: 'Starbase', place: 'Boca Chica, Texas', lat: 25.997, lon: -97.156, c: ['NASASpaceflight'], by: 'NASASpaceflight', best: 'any' },
  { id: 'churchill', kind: 'yt', name: 'Northern lights', place: 'Churchill, Manitoba', lat: 58.77, lon: -94.17, v: ['a0i1Kg6fROg'], by: 'explore.org and Polar Bears International', best: 'night' },
  { id: 'goes-east', kind: 'img', name: 'The Earth from GOES-19', place: '35,786 km above 75.2°W', lat: 0, lon: -75.2, img: 'goes-east', every: 600, by: 'NOAA GOES-19 · GeoColor · a new picture every 10 minutes', best: 'any' },
  { id: 'namib', kind: 'yt', name: 'A waterhole in the Namib', place: 'Gondwana Namib Park, Namibia', lat: -24.86, lon: 15.95, v: ['ydYDqZQpim8'], c: ['NamibiaCam'], by: 'NamibiaCam', best: 'any' },
  { id: 'sakurajima', kind: 'yt', name: 'Sakurajima volcano', place: 'from Kagoshima, Japan', lat: 31.6035, lon: 130.5507, v: ['GSJwOX3gZsk'], by: '', best: 'any' },
  { id: 'fuji', kind: 'yt', name: 'Mount Fuji', place: 'from Fuji, Shizuoka, Japan', lat: 35.1382, lon: 138.6919, v: ['Sv9hcJ3k5h4'], by: '', best: 'day' },
  { id: 'shibuya', kind: 'yt', name: 'Shibuya', place: 'Tokyo, Japan', lat: 35.6604, lon: 139.6983, v: ['d1JuNg7knNo'], by: '', best: 'any' },
];

const MEM = new Map(); // what has been fetched, for as long as this copy of the Worker is awake (Cloudflare's cache does nothing on workers.dev)

function ok(kind, head, size, min) {
  if (size < min) return false;
  if (kind === 'jpeg') return head[0] === 0xff && head[1] === 0xd8;
  if (kind === 'png') return head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
  const t = new TextDecoder().decode(head).replace(/^﻿/, '').trimStart();
  if (kind === 'json') return t[0] === '{' || t[0] === '[';
  if (kind === 'tle') return /\n1 [0-9 ]{5}[A-Z ] /.test(t) && t[0] !== '<';
  return false;
}

// a source as a URL, and the time its data is for when that is known
function where(src) {
  const m = /^imerg:(default|[\d.]+)$/.exec(src);
  if (!m) return { url: src, time: '' };
  if (m[1] === 'default') return { url: GIBS, time: '' };
  const t = Math.floor((Date.now() - parseFloat(m[1]) * 3600000) / 1800000) * 1800000, iso = new Date(t).toISOString().slice(0, 19) + 'Z';
  return { url: GIBS + '&TIME=' + iso, time: iso };
}
async function upstream(src) {
  if (src === 'aurora-archive') {
    // the same NOAA file, from a public archive that keeps every one: its index names the newest
    const r = await fetch(RAW + 'GefeiSHEN/NOAA-Aurora-Archive/main/OVATION/latest.json', { headers: { 'user-agent': UA } });
    if (!r.ok) throw new Error('index ' + r.status);
    const p = (await r.json()).snapshot.path;
    if (!/^OVATION\/\d{4}\/\d\d\/\d\d\/[0-9TZ\-a-f]+\.json$/.test(p)) throw new Error('odd path');
    return fetch(RAW + 'GefeiSHEN/NOAA-Aurora-Archive/main/' + p, { headers: { 'user-agent': UA } });
  }
  return fetch(where(src).url, { headers: { 'user-agent': UA, accept: '*/*' } });
}

async function feed(name) {
  const f = FEEDS[name], now = Date.now(), m = MEM.get(name);
  if (m && now - m.at < f.ttl * 1000) return m;
  if (m && m.busy) return m;
  if (m) m.busy = true;
  try {
    for (const src of f.src) {
      try {
        const r = await upstream(src);
        if (!r.ok) continue;
        const body = await r.arrayBuffer();
        if (!ok(f.kind, new Uint8Array(body, 0, Math.min(400, body.byteLength)), body.byteLength, f.min)) continue;
        const w = where(src), v = { at: now, body, src: src === 'aurora-archive' ? 'NOAA SWPC (archive)' : w.url, time: w.time, mod: r.headers.get('last-modified') || '' };
        MEM.set(name, v);
        return v;
      } catch (e) { /* the next source */ }
    }
  } finally { if (m) m.busy = false; }
  return m || null;
}

// ---- YouTube: which video a camera is showing now ----
const YTUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15';
async function ytPage(path) {
  const r = await fetch('https://www.youtube.com/' + path, { headers: { 'user-agent': YTUA, 'accept-language': 'en-US,en;q=0.8', cookie: 'CONSENT=YES+cb; SOCS=CAI' } });
  return r.ok ? await r.text() : '';
}
async function ytNow(cam) {
  const key = 'yt:' + cam.id, m = MEM.get(key), now = Date.now();
  if (m && now - m.at < (m.v.id ? 15 : 5) * 60000) return m.v;
  // live: true (it is on the air), false (it is not), null (YouTube did not say: the page tries the address on the list)
  let out = { id: null, live: null };
  try {
    for (const id of cam.v || []) {
      const t = await ytPage('watch?v=' + id);
      if (!t) continue;
      if (t.includes('"isLiveNow":true')) { out = { id, live: true }; break; }
      if (t.includes('"isLiveNow":false') || t.includes('"playabilityStatus":{"status":"ERROR"')) out = { id: null, live: false };
    }
    if (!out.id) for (const c of cam.c || []) {
      const t = await ytPage('@' + c + '/live');
      const k = /<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/.exec(t);
      if (k && t.includes('"isLiveNow":true')) { out = { id: k[1], live: true }; break; }
      if (t && out.live === null && t.includes('"channelMetadataRenderer"')) out = { id: null, live: false };
    }
  } catch (e) { out = { id: null, live: null }; }
  MEM.set(key, { at: now, v: out });
  return out;
}

const CORS = { 'access-control-allow-origin': '*' };
function json(o, maxAge) {
  return new Response(JSON.stringify(o), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=' + maxAge, ...CORS } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url), p = url.pathname;
    if (!p.startsWith('/api/')) return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Only GET', { status: 405, headers: CORS });
    let m;
    if ((m = /^\/api\/feed\/([a-z0-9\-]+)$/.exec(p)) && FEEDS[m[1]]) {
      const f = FEEDS[m[1]], v = await feed(m[1]);
      if (!v) return new Response('Not available just now', { status: 503, headers: { 'retry-after': '120', ...CORS } });
      const h = { 'content-type': TYPE[f.kind], 'cache-control': 'public, max-age=' + Math.min(f.ttl, 600), 'x-source': v.src, 'x-fetched': new Date(v.at).toISOString(), ...CORS };
      if (v.mod) h['last-modified'] = v.mod;
      if (v.time) h['x-time'] = v.time;
      return new Response(request.method === 'HEAD' ? null : v.body, { headers: h });
    }
    if (p === '/api/cams') return json({ cams: CAMS.map(({ c, ...k }) => k) }, 600);
    if ((m = /^\/api\/yt\/([a-z0-9\-]+)$/.exec(p))) {
      const cam = CAMS.find(x => x.id === m[1] && x.kind === 'yt');
      if (!cam) return json({ error: 'no such camera' }, 60);
      return json(await ytNow(cam), 300);
    }
    return new Response('Not found', { status: 404, headers: CORS });
  },
};
