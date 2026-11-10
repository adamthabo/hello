// checks my own sky maths (src/05-astro.js) against two reference libraries: astronomy-engine and satellite.js (SGP4)
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = require('astronomy-engine'), S = require('satellite.js');
const src = fs.readFileSync(path.join(__dirname, '..', 'src', '05-astro.js'), 'utf8');
const ctx = {}; vm.createContext(ctx); vm.runInContext(src + ';this.AS=AS;', ctx); const AS = ctx.AS;
const D = Math.PI / 180;
let bad = 0;
function ang(a, b) { let d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; }
// planets: heliocentric ecliptic longitude and distance, 2026 to 2040
const bodies = [A.Body.Mercury, A.Body.Venus, A.Body.Earth, A.Body.Mars, A.Body.Jupiter, A.Body.Saturn, A.Body.Uranus, A.Body.Neptune];
const rot = A.Rotation_EQJ_ECL();
for (let i = 0; i < 8; i++) {
  let worstL = 0, worstR = 0, worstZ = 0;
  for (let k = 0; k < 400; k++) {
    const ms = Date.UTC(2026, 10, 9) + k * 13.37 * 86400000;
    const hv = A.RotateVector(rot, A.HelioVector(bodies[i], new Date(ms)));
    const p = AS.planet(i, AS.cent(ms));
    const lr = Math.atan2(hv.y, hv.x) / D, lm = Math.atan2(p[1], p[0]) / D;
    const rr = Math.hypot(hv.x, hv.y, hv.z), rm = Math.hypot(p[0], p[1], p[2]);
    worstL = Math.max(worstL, ang(lr, lm)); worstR = Math.max(worstR, Math.abs(rr - rm) / rr); worstZ = Math.max(worstZ, Math.abs(hv.z - p[2]));
  }
  const ok = worstL < 0.25 && worstR < 0.01; if (!ok) bad++;
  console.log(`${AS.NAMES[i].padEnd(8)} longitude within ${worstL.toFixed(3)} deg, distance within ${(worstR * 100).toFixed(3)} %, height within ${worstZ.toFixed(4)} AU  ${ok ? 'ok' : 'FAIL'}`);
}
// sun and moon: sub-points, phase
let wS = 0, wM = 0, wP = 0, wG = 0, wD = 0;
for (let k = 0; k < 600; k++) {
  const ms = Date.UTC(2026, 10, 9, 21, 0, 0) + k * 5.123 * 3600000, date = new Date(ms);
  const gast = A.SiderealTime(date) * 15; wG = Math.max(wG, ang(gast, AS.gmst(ms)));
  const se = A.Equator(A.Body.Sun, date, new A.Observer(0, 0, 0), true, true), s = AS.sun(ms);
  wS = Math.max(wS, ang(se.ra * 15, s.ra), Math.abs(se.dec - s.dec));
  const me = A.Equator(A.Body.Moon, date, new A.Observer(0, 0, 0), true, true), m = AS.moon(ms);
  // geocentric check for the moon (the observer at 0,0 adds parallax up to 1 deg), so use the geocentric vector instead
  const gv = A.GeoMoon(date), ra = (Math.atan2(gv.y, gv.x) / D + 360) % 360, dec = Math.asin(gv.z / Math.hypot(gv.x, gv.y, gv.z)) / D;
  wM = Math.max(wM, ang(ra, m.ra) * Math.cos(dec * D), Math.abs(dec - m.dec));
  const ill = A.Illumination(A.Body.Moon, date).phase_fraction; wP = Math.max(wP, Math.abs(ill - m.phase));
  wD = Math.max(wD, Math.abs(Math.hypot(gv.x, gv.y, gv.z) * 149597870.7 / 6378.137 - m.r) / m.r);
}
console.log(`sidereal time within ${wG.toFixed(4)} deg; sun within ${wS.toFixed(3)} deg; moon within ${wM.toFixed(3)} deg (J2000 vs of-date, so ~0.37 deg of that is precession); lit fraction within ${wP.toFixed(3)}; moon distance within ${(wD * 100).toFixed(2)} %`);
if (wG > 0.02 || wS > 0.4 || wM > 0.9 || wP > 0.03) bad++;
// the space station: my J2 propagation against SGP4 for two weeks from the element set's epoch
const tl = fs.readFileSync(path.join(__dirname, '..', 'data', 'iss.tle'), 'utf8').split('\n').map(s => s.replace(/\r/g, '')).filter(Boolean);
const t = AS.tle(tl[0], tl[1]);
if (!t) { console.log('TLE failed its checksum or did not parse'); process.exit(1); }
const rec = S.twoline2satrec(tl[0], tl[1]);
console.log('element set epoch', new Date(t.epoch).toISOString(), 'period', (t.period / 60).toFixed(2), 'min');
for (const days of [0.01, 0.5, 1, 3, 7, 14]) {
  let w = 0, wa = 0;
  for (let k = 0; k < 200; k++) {
    const ms = t.epoch + days * 86400000 + k * 61000, date = new Date(ms);
    const pv = S.propagate(rec, date); if (!pv || !pv.position) continue;
    const g = S.eciToGeodetic(pv.position, S.gstime(date));
    const mine = AS.sat(t, ms);
    const la = g.latitude / D, lo = g.longitude / D;
    // great-circle distance on the ground, km
    const c = Math.sin(la * D) * Math.sin(mine.lat * D) + Math.cos(la * D) * Math.cos(mine.lat * D) * Math.cos((lo - mine.lon) * D);
    w = Math.max(w, Math.acos(Math.min(1, c)) * 6371); wa = Math.max(wa, Math.abs(g.height - mine.alt));
  }
  console.log(`  +${String(days).padStart(5)} days: ground position within ${w.toFixed(1)} km of SGP4, height within ${wa.toFixed(1)} km`);
  if (days <= 7 && w > 250) bad++;
}
console.log(bad ? 'ASTRO FAILED' : 'ASTRO PASSED'); process.exit(bad ? 1 : 0);
