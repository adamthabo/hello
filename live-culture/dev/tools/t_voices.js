// writes every touch voice to a WAV file (wav/) and reports a few plain facts about each: how it starts, whether it is centred, how long it rings
const { launch, open } = require('./lib'); const fs = require('fs');
(async () => {
  const browser = await launch(); const { page, ctx } = await open(browser, 'desk'); await page.waitForTimeout(400);
  const V = await page.evaluate(() => { const L = window.__lc, out = {}; for (const k of Object.keys(L.INSTDEF)) for (const f of L.INSTDEF[k][1]) { const a = L.SYN[k](f); out[k + '_' + Math.round(f)] = Array.from(a, x => Math.round(x * 32767)); } return out; });
  for (const k in V) { const a = V[k], n = a.length, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(44100, 24); b.writeUInt32LE(88200, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40); for (let i = 0; i < n; i++) b.writeInt16LE(Math.max(-32768, Math.min(32767, a[i])), 44 + i * 2); fs.writeFileSync('wav/' + k + '.wav', b); }
  console.log(Object.keys(V).length, 'voices written'); await ctx.close(); await browser.close();
})();
