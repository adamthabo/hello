// Writes src/10-camlist.js: the Worker's cameras (cf/live-culture/worker.js, CAMS and THEMES) for the page to start from. The artifact
// may not ask the Worker anything, so it has only this list: a picture for each camera on the Earth, and a tap opens the stream on
// YouTube (its channel's live page; else YouTube's search for it, live streams only; else the last address it was found at). The site
// shows the same list at once, then the Worker's own (/api/cams).
// usage: node tools/gen_cams.js [path/to/worker.js]   (from dev/ in a clone of the site's repository, where it finds ../worker.js itself;
//        again whenever a camera is added to the Worker)
const fs = require('fs');
const W = process.argv[2] || require('path').join(__dirname, '..', '..', 'worker.js');  // (in a clone of the site's repository: dev/tools/ -> worker.js)
const src = fs.readFileSync(W, 'utf8');
function grab(name) {
  const i = src.indexOf('const ' + name + ' = [');
  if (i < 0) throw new Error('no ' + name);
  let d = 0, j = src.indexOf('[', i);
  for (let k = j; k < src.length; k++) { const ch = src[k]; if (ch === '[') d++; else if (ch === ']') { d--; if (!d) return Function('"use strict";return ' + src.slice(j, k + 1))(); } }
  throw new Error('unclosed ' + name);
}
const CAMS = grab('CAMS'), THEMES = grab('THEMES');
function yt(c) {
  if (c.kind === 'img') return 'https://www.star.nesdis.noaa.gov/GOES/fulldisk.php?sat=' + (c.img === 'goes-west' ? 'G18' : 'G19');
  if (c.c && c.c.length) return /^UC[\w-]{22}$/.test(c.c[0]) ? 'https://www.youtube.com/channel/' + c.c[0] + '/live' : 'https://www.youtube.com/@' + c.c[0] + '/live';
  // (a search for what is live now finds a stream that restarted under a new address; the address on the list may have ended)
  if (c.s && c.s.length) return 'https://www.youtube.com/results?search_query=' + encodeURIComponent(c.s[0]) + '&sp=EgJAAQ%253D%253D';
  if (c.v && c.v.length) return 'https://www.youtube.com/watch?v=' + c.v[0];
  return '';
}
const out = CAMS.map(c => {
  const o = { id: c.id, t: c.t, kind: c.kind, name: c.name, place: c.place || '', lat: c.lat, lon: c.lon, best: c.best || 'any', yt: yt(c) };
  if (c.v) o.v = c.v; if (c.img) o.img = c.img; if (c.moving) o.moving = c.moving; if (c.by) o.by = c.by; if (c.every) o.every = c.every;
  return o;
});
const body = '/* ---------- the cameras, as the Worker lists them (written by tools/gen_cams.js from cf/live-culture/worker.js: do not edit here).\n' +
  '   Each: its id, theme, kind, name, place, where it is, when it looks best, and how to watch it on YouTube ---------- */\n' +
  'var CAMLIST={themes:' + JSON.stringify(THEMES) + ',\ncams:[\n' + out.map(o => JSON.stringify(o)).join(',\n') + ']};\n';
fs.writeFileSync(__dirname + '/../src/10-camlist.js', body);
console.log('CAMLIST', out.length, 'cameras,', out.filter(o => o.yt).length, 'with a way to watch,', THEMES.length, 'themes');
