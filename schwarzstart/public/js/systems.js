// SCHWARZSTART · rules and data: factions, weapons, gear, loot, progression, the five networks
import { R, clamp } from './util.js';

export const VERSION = 1;
export const FACTIONS = [
  { key: 'schieber', name: 'Die Schieber', col: '#d9623a', hex: 0xd9623a, tag: 'Black-market gangs. Fast, loud, and always too many.',
    names: { rush: 'Schläger', rifle: 'Schütze', sniper: 'Späher', heavy: 'Brecher', gren: 'Werfer' }, mix: ['rush', 'rush', 'rifle', 'rifle', 'gren', 'rush', 'heavy'] },
  { key: 'kartell', name: 'Das Stromkartell', col: '#ecc92f', hex: 0xecc92f, tag: 'They hold the substations and sell every kilowatt hour.',
    names: { rush: 'Sicherung', rifle: 'Monteur', sniper: 'Peiler', heavy: 'Trafo', gren: 'Zünder' }, mix: ['rifle', 'rifle', 'rush', 'sniper', 'gren', 'heavy', 'rifle'] },
  { key: 'garde', name: 'Die Garde', col: '#77a3e0', hex: 0x77a3e0, tag: 'Deserted security forces. Disciplined, armoured, without mercy.',
    names: { rush: 'Vorposten', rifle: 'Gardist', sniper: 'Scharfschütze', heavy: 'Panzerschütze', gren: 'Grenadier' }, mix: ['rifle', 'rifle', 'rifle', 'sniper', 'heavy', 'gren', 'rush'] },
  { key: 'stille', name: 'Die Stillen', col: '#e3e9f0', hex: 0xe3e9f0, tag: 'They want the city to stay dark. You never hear them coming.',
    names: { rush: 'Läufer', rifle: 'Jäger', sniper: 'Wächter', heavy: 'Träger', gren: 'Rufer' }, mix: ['sniper', 'rifle', 'rush', 'sniper', 'rifle', 'gren', 'heavy'] },
];
export const ARCH = {
  rush: { hp: 0.72, spd: 5.5, wpn: 'smg', range: 10, burst: [4, 8], cd: [0.45, 0.9], acc: 0.5, dmg: 0.75 },
  rifle: { hp: 1.0, spd: 3.7, wpn: 'ar', range: 30, burst: [3, 5], cd: [1.0, 1.9], acc: 0.6, dmg: 1, cover: 1 },
  sniper: { hp: 0.8, spd: 3.1, wpn: 'dmr', range: 70, burst: [1, 1], cd: [2.8, 3.8], acc: 0.9, dmg: 3.4, cover: 1, tell: 1.15 },
  heavy: { hp: 2.5, spd: 2.5, wpn: 'lmg', range: 28, burst: [14, 22], cd: [1.6, 2.4], acc: 0.38, dmg: 0.8, bulk: 1.18, scale: 1.1, armor: 1 },
  gren: { hp: 1.0, spd: 3.5, wpn: 'ar', range: 24, burst: [2, 4], cd: [1.2, 2.0], acc: 0.5, dmg: 0.9, cover: 1, nade: 1 },
};
export const TIERS = [{ hp: 1, arm: 0, xp: 1, n: '' }, { hp: 1.9, arm: 0.6, xp: 2.4, n: 'Veteran' }, { hp: 3.2, arm: 1.1, xp: 5, n: 'Elite' }, { hp: 10, arm: 2.2, xp: 22, n: 'Anführer', scale: 1.16 }];
export const WPN = {
  ar: { n: 'Sturmgewehr', dmg: 21, rpm: 640, mag: 30, rel: 2.1, range: 46, spread: 0.013, kick: 0.011, auto: 1, res: 300, names: ['StG »Havel«', 'Karabiner »Spree«', 'StG »Wannsee«', 'Karabiner K-90'] },
  smg: { n: 'Maschinenpistole', dmg: 14, rpm: 880, mag: 32, rel: 1.8, range: 26, spread: 0.021, kick: 0.008, auto: 1, res: 360, names: ['MP »Wedding«', 'MP »Kotti«', 'MP »Ostkreuz«'] },
  lmg: { n: 'Maschinengewehr', dmg: 20, rpm: 560, mag: 80, rel: 4.2, range: 50, spread: 0.02, kick: 0.013, auto: 1, res: 480, names: ['MG »Tegel«', 'MG »Tempelhof«'] },
  sg: { n: 'Flinte', dmg: 13, pellets: 9, rpm: 78, mag: 7, rel: 2.5, range: 17, spread: 0.065, kick: 0.05, auto: 0, res: 56, names: ['Flinte »Grunewald«', 'Flinte »Müggel«'] },
  dmr: { n: 'Präzisionsgewehr', dmg: 104, rpm: 150, mag: 10, rel: 2.5, range: 120, spread: 0.002, kick: 0.035, auto: 0, hs: 2.4, res: 60, names: ['Büchse »Teufelsberg«', 'Büchse »Pfaueninsel«'] },
  pst: { n: 'Dienstpistole', dmg: 25, rpm: 320, mag: 15, rel: 1.4, range: 30, spread: 0.014, kick: 0.02, auto: 0, side: 1, res: Infinity, names: ['Dienstpistole »Amt 9«', 'Pistole »Kiezwache«'] },
};
export const RAR = [{ n: 'Standard', c: '#c9ccd1', m: 1.0 }, { n: 'Solide', c: '#62c36a', m: 1.12 }, { n: 'Selten', c: '#4a9be8', m: 1.26 }, { n: 'Episch', c: '#b06be0', m: 1.42 }, { n: 'Legendär', c: '#f0b63c', m: 1.62 }];
export const RARHEX = [0xc9ccd1, 0x62c36a, 0x4a9be8, 0xb06be0, 0xf0b63c];
export const PERKS = { crit: ['Scharf', '+15% critical hits'], mag: ['Erweitert', '+25% magazine'], rel: ['Flink', '20% faster reload'], arm: ['Panzerbrechend', '+20% damage to armour'], stab: ['Ruhig', '30% tighter spread'], kill: ['Nachschub', 'kills refill 20% of the magazine'] };
export const SLOTS = { kopf: ['Kopf', ['Wollmütze', 'Schutzhelm', 'Sturmhaube'], 0.8], weste: ['Weste', ['Schutzweste', 'Einsatzweste', 'Plattenträger'], 1.6], rucksack: ['Rucksack', ['Tagesrucksack', 'Einsatzrucksack', 'Seesack'], 1.1], handschuhe: ['Handschuhe', ['Arbeitshandschuhe', 'Einsatzhandschuhe'], 0.7], stiefel: ['Stiefel', ['Winterstiefel', 'Einsatzstiefel'], 0.8] };
export const ATTR = { fk: ['Feuerkraft', '% weapon damage', '#e0694a'], pz: ['Panzerung', '% armour', '#5aa0e6'], tk: ['Technik', '% skills', '#e8c84a'] };
const LEG = ['»Nachtschicht«', '»Ringbahn«', '»Späti-Spezial«', '»Schrankwand«', '»Letzte Runde«', '»Kaltstart«', '»Trümmerfrau«', '»Laubenpieper«'];

export const NETS = {
  strom: { n: 'STROM', c: '#f2c230', src: 'power', unit: 'Umspannwerke', d: 'Power. Every substation relights a Kiez.', t: [[1, 150, 'Notstrom', 'skills recharge 10% faster'], [3, 500, 'Geschütz Mk II', 'turret: +40% damage, +8 s uptime'], [6, 1500, 'Flutlicht', '+10% weapon damage in districts with power'], [10, 4000, 'Schwarzstart', 'skills recharge 25% faster']] },
  wasser: { n: 'WASSER', c: '#4aa8e8', src: 'pump', unit: 'Pumpen', d: 'Water from the green street pumps.', t: [[2, 150, 'Feldflasche', '+1 med kit'], [6, 500, 'Lazarett', 'health regenerates twice as fast'], [14, 1500, 'Zisterne', '+1 med kit'], [26, 4000, 'Wasserwerk', 'kits keep mending armour for 8 s']] },
  waerme: { n: 'WÄRME', c: '#ea7a3c', src: 'cp', unit: 'Kontrollpunkte', d: 'Heat. A warm room at every secured checkpoint.', t: [[2, 150, 'Wärmestube', '+10% health'], [6, 500, 'Fernwärme', 'armour recovers twice as fast out of combat'], [14, 1500, 'Heizkraftwerk', '+15% health'], [26, 4000, 'Winterfest', '+15% armour']] },
  funk: { n: 'FUNK', c: '#8fd6a0', src: 'relay', unit: 'Funkmasten', d: 'Signal. The radio net of the Lotsen.', t: [[1, 150, 'Kiezfunk', 'the minimap shows alerted hostiles'], [3, 500, 'Peilsender', 'pulse: +50% range, +4 s'], [6, 1500, 'Lagebild', 'Depots and pumps appear on the map'], [10, 4000, 'Fernsehturm', '+12% critical hits on marked hostiles']] },
  bahn: { n: 'BAHN', c: '#c9a3ef', src: 'safe', unit: 'Stützpunkte', d: 'Rail. U-Bahn stations as safehouses, tunnels as roads.', t: [[1, 150, 'Tunnelwege', 'fast travel between Stützpunkte'], [4, 500, 'Fahrdienst', 'safehouses restock more ammo'], [8, 1500, 'Streckenläufer', '+12% sprint speed'], [14, 4000, 'Ringschluss', 'full ammo at every Stützpunkt, +20% reserve']] },
};

export const xpNeed = (l) => Math.round(260 * Math.pow(l, 1.55));
export const wpnDmg = (it) => WPN[it.cls].dmg * Math.pow(1.13, it.lvl - 1) * RAR[it.rar].m;
export const enemyHP = (lvl) => 95 * Math.pow(1.15, lvl - 1);
export const enemyDmg = (lvl) => 6.5 * Math.pow(1.125, lvl - 1);
let uid = 1;
export const setUid = (n) => { uid = Math.max(uid, n); };

function rollRar(bonus = 0) { const r = R() - bonus; return r < 0.03 ? 4 : r < 0.11 ? 3 : r < 0.3 ? 2 : r < 0.62 ? 1 : 0; }
export function makeWeapon(lvl, rar = rollRar(), cls = null) {
  cls = cls || R.pick(['ar', 'ar', 'smg', 'smg', 'lmg', 'sg', 'dmr']); const W = WPN[cls];
  const it = { id: uid++, t: 'w', cls, lvl: Math.max(1, lvl), rar, n: rar === 4 ? W.n + ' ' + R.pick(LEG) : R.pick(W.names), q: 0.94 + R() * 0.12 };
  if (rar >= 2) it.perk = R.pick(Object.keys(PERKS)); if (rar >= 4) { let p2; do { p2 = R.pick(Object.keys(PERKS)); } while (p2 === it.perk); it.perk2 = p2; }
  return it;
}
export function makeGear(lvl, rar = rollRar(), slot = null) {
  slot = slot || R.pick(Object.keys(SLOTS)); const S = SLOTS[slot], at = R.pick(['fk', 'pz', 'tk']);
  const it = { id: uid++, t: 'g', slot, lvl: Math.max(1, lvl), rar, n: R.pick(S[1]) + (rar === 4 ? ' ' + R.pick(LEG) : ''), arm: Math.round(26 * S[2] * Math.pow(1.13, lvl - 1) * RAR[rar].m * (0.94 + R() * 0.12)), at, av: Math.round((3 + rar * 1.6 + R() * 2) * 10) / 10 };
  if (rar >= 2) { const s = R.pick(['crit', 'hs', 'hp']); it.sub = s; it.sv = Math.round((s === 'hp' ? 4 + rar * 1.5 : 3 + rar) * (0.8 + R() * 0.4) * 10) / 10; }
  return it;
}
export const makeItem = (lvl, bonus = 0) => (R() < 0.45 ? makeWeapon(lvl, rollRar(bonus)) : makeGear(lvl, rollRar(bonus)));
export const itemScore = (it) => Math.round(it.lvl * 10 * RAR[it.rar].m + (it.t === 'w' ? 0 : 0));
export const sellValue = (it) => Math.round((6 + it.lvl * 3) * (1 + it.rar * 0.9));
export const hasPerk = (it, k) => it && (it.perk === k || it.perk2 === k);

export function newSave() {
  const w1 = { id: uid++, t: 'w', cls: 'ar', lvl: 1, rar: 0, n: 'StG »Havel«', q: 1 }, w2 = { id: uid++, t: 'w', cls: 'smg', lvl: 1, rar: 0, n: 'MP »Wedding«', q: 1 }, w3 = { id: uid++, t: 'w', cls: 'pst', lvl: 1, rar: 0, n: 'Dienstpistole »Amt 9«', q: 1 };
  const gear = {}; for (const s of Object.keys(SLOTS)) gear[s] = { id: uid++, t: 'g', slot: s, lvl: 1, rar: 0, n: SLOTS[s][1][0], arm: Math.round(26 * SLOTS[s][2]), at: 'pz', av: 2 };
  return { v: VERSION, lvl: 1, xp: 0, marken: 60, teile: 0, wpn: [w1, w2, w3], cur: 0, gear, inv: [], kits: 3, nades: 2, res: { ar: 180, smg: 220, lmg: 0, sg: 0, dmr: 0 },
    sites: {}, power: [], net: { strom: 0, wasser: 0, waerme: 0, funk: 0, bahn: 0 }, missions: {}, pos: null, spawn: null, time: 15.75, track: 'm1', seen: {}, stats: { kills: 0, t: 0 }, opt: {} };
}
// everything the equipment and the networks add up to
export function derive(S) {
  const d = { fk: 0, pz: 0, tk: 0, crit: 5, hs: 0, hp: 0, armor: 0 };
  for (const s in S.gear) { const g = S.gear[s]; if (!g) continue; d.armor += g.arm; d[g.at] += g.av; if (g.sub) d[g.sub] += g.sv; }
  const n = S.net; d.net = n;
  d.haste = 1 + (n.strom >= 1 ? 0.1 : 0) + (n.strom >= 4 ? 0.25 : 0) + d.tk / 100;
  d.kits = 3 + (n.wasser >= 1 ? 1 : 0) + (n.wasser >= 3 ? 1 : 0); d.regen = n.wasser >= 2 ? 2 : 1; d.hot = n.wasser >= 4;
  d.hpMul = 1 + (n.waerme >= 1 ? 0.1 : 0) + (n.waerme >= 3 ? 0.15 : 0) + d.hp / 100; d.armRegen = n.waerme >= 2 ? 2 : 1; d.armMul = 1 + (n.waerme >= 4 ? 0.15 : 0) + d.pz / 100;
  d.radar = n.funk >= 1; d.pulse = n.funk >= 2 ? 1.5 : 1; d.intel = n.funk >= 3; d.markCrit = n.funk >= 4 ? 12 : 0;
  d.travel = n.bahn >= 1; d.travelCp = n.bahn >= 2; d.sprint = n.bahn >= 3 ? 1.12 : 1; d.resMul = n.bahn >= 4 ? 1.2 : 1;
  d.turret = n.strom >= 2 ? 1.4 : 1; d.flood = n.strom >= 3;
  d.maxHP = Math.round(100 * Math.pow(1.12, S.lvl - 1) * d.hpMul); d.maxArmor = Math.round(d.armor * d.armMul);
  d.dmgMul = 1 + d.fk / 100;
  return d;
}
export const netPoints = (S, src) => { let n = 0; for (const k in S.sites) if (S.sites[k] && k.startsWith(src + ':')) n++; return n; };
export function enemyRoll(lvl, fac, forceArch, tier = 0) {
  const F = FACTIONS[fac], arch = forceArch || R.pick(F.mix); if (!tier && R() < 0.12) tier = 1;
  return { arch, tier, lvl, fac };
}
export const clampLvl = (l) => clamp(Math.round(l), 1, 30);
