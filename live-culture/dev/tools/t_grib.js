// The page's own GRIB2 reader (src/08-grib.js) against ECMWF's ecCodes, on real files: NOAA's GFS (complex packing with second-order
// spatial differencing), NDFD (complex packing, with and without differencing, with missing values: the sea-wave heights over land),
// and simple packing with a bitmap. The reference values are made by gtools/g2ref.py and g2ref2.py (ecCodes, in Python).
// usage: node tools/t_grib.js <ref.json> <ref2.json> <folder of the GRIB files>
const fs = require('fs'), GRIB = require('../src/08-grib.js');
const [ref, ref2, dir] = [JSON.parse(fs.readFileSync(process.argv[2])), JSON.parse(fs.readFileSync(process.argv[3])), process.argv[4]];
let bad = 0; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) bad++; };
const cmp = (a, b, tol) => { let worst = 0, mm = 0; for (let k = 0; k < b.length; k++) { const x = a[k], y = b[k]; if (y === null) { if (!Number.isNaN(x)) mm++; continue; } if (Number.isNaN(x)) { mm++; continue; } worst = Math.max(worst, Math.abs(x - y) / Math.max(1e-9, tol(y))); } return { worst, mm }; };
const byFile = {};
for (const r of ref) { const m = (byFile[r.file] = byFile[r.file] || GRIB.msgs(fs.readFileSync(dir + '/' + r.file)))[r.n - 1];
  if (!m) { ok(false, r.file + ' #' + r.n + ': not read'); continue; }
  const smp = []; for (let k = 0; k < m.v.length; k += r.step) smp.push(m.v[k]);
  const c = cmp(smp, r.sample, y => Math.max(Math.abs(y) * 1e-5, 1e-6)), miss = m.v.reduce((a, x) => a + (Number.isNaN(x) ? 1 : 0), 0);
  ok(m.ni === r.ni && m.nj === r.nj && c.worst < 1 && c.mm === 0 && miss === r.miss, r.file + ' #' + r.n + ' ' + r.pack + ' ' + r.short + ': ' + m.ni + 'x' + m.nj + ', worst ' + c.worst.toFixed(3) + ' of the tolerance, ' + miss + ' missing (ecCodes ' + r.miss + ')'); }
const rawBy = {};
for (const r of ref2) { const v = (rawBy[r.file] = rawBy[r.file] || GRIB.raw(fs.readFileSync(dir + '/' + r.file)))[r.n - 1];
  if (!v) { ok(false, r.file + ' #' + r.n + ': not unpacked'); continue; }
  const smp = []; for (let k = 0; k < v.length; k += r.step) smp.push(v[k]);
  const c = cmp(smp, r.sample, y => Math.max(Math.abs(y) * 1e-5, 1e-6)), miss = v.reduce((a, x) => a + (Number.isNaN(x) ? 1 : 0), 0);
  ok(v.length === r.len && c.worst < 1 && c.mm === 0 && miss === r.miss, r.file + ' #' + r.n + ' ' + r.pack + ': ' + v.length + ' values, worst ' + c.worst.toFixed(3) + ' of the tolerance, ' + miss + ' missing (ecCodes ' + r.miss + ')'); }
// a value at a place: the GFS temperature at 500 hPa (message 2) at a grid point and between them
{ const m = GRIB.msgs(fs.readFileSync(dir + '/gfs.t12z.pgrbf120.2p5deg.grib2'))[1], g = m.v[10 * m.ni + 20];
  ok(Math.abs(GRIB.at(m, m.la1 - 10 * m.dj, m.lo1 + 20 * m.di) - g) < 1e-3, 'a value at a grid point is the grid\'s: ' + g.toFixed(2)); }
console.log(bad ? 'GRIB FAILED (' + bad + ')' : 'GRIB OK'); process.exit(bad ? 1 : 0);
