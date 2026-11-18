// a stand-in for the Claude app's sample capability: answers from a script, and keeps what it was asked
window.__ask = { calls: [] };
(function () {
  const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 844"><defs><radialGradient id="g"><stop offset="0" stop-color="#ffd36b"/><stop offset="1" stop-color="#ff7a3d"/></radialGradient></defs>' +
    '<circle cx="195" cy="330" r="90" fill="url(#g)"/><g stroke="#ffd36b" stroke-width="8" stroke-linecap="round"><path d="M195 200v-50"/><path d="M195 460v50"/><path d="M65 330h-50"/><path d="M325 330h50"/></g>' +
    '<path d="M20 640c80-60 150-60 180 0s130 60 170 0" fill="none" stroke="#3ef0ff" stroke-width="10" stroke-linecap="round"/><script>window.__pwned=1</script><rect x="10" y="10" width="20" height="20" fill="#fff" onclick="window.__pwned=2"/></svg>';
  const s = async function (input, opts) {
    const im = opts && opts.images && opts.images[0];
    window.__ask.calls.push({ input: typeof input === 'string' ? input : JSON.stringify(input), tier: opts && opts.modelTier, n: opts && opts.images ? opts.images.length : 0, type: im && im.type, size: im && im.size });
    const w = ms => new Promise(r => setTimeout(r, ms));
    if (window.__ask.fail) { await w(200); throw { code: window.__ask.fail, message: 'test' }; }
    if (/Read every word/.test(input)) {
      const ans = window.__ask.text || 'HI\nTHERE';
      await w(300); if (opts.signal && opts.signal.aborted) throw { code: 'cancelled', message: '' };
      opts.onText && opts.onText({ text: ans.slice(0, 2), delta: ans.slice(0, 2) }); await w(300);
      opts.onText && opts.onText({ text: ans, delta: ans.slice(2) }); await w(100);
      return { text: ans, truncated: false };
    }
    await w(400); const cut = SVG.indexOf('<g ');
    opts.onText && opts.onText({ text: 'Here it is:\n' + SVG.slice(0, cut), delta: 'x' }); await w(600);
    if (opts.signal && opts.signal.aborted) throw { code: 'cancelled', message: '' };
    opts.onText && opts.onText({ text: 'Here it is:\n' + SVG, delta: 'y' }); await w(100);
    return { text: 'Here it is:\n' + SVG, truncated: false };
  };
  s.limits = async () => ({ maxInputBytes: 262144, images: { maxCount: 4, maxInputBytes: 20e6, mediaTypes: ['image/png', 'image/jpeg'] } });
  window.claude = { use: async n => (n === 'sample' ? s : null) };
})();
