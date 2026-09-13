// Compares the server's placeholder drawing with the browser's, character for character.
//
// Content/Placeholder.cs is a PORT of AB.ph in _app/app.js, and the two draw the same hole in the
// same page - the server for the first load, the browser while someone is editing. A port that
// drifts shows up as a flicker on every keystroke, and as a pixel difference nobody can explain.
//
// It drifted once already: .NET rounds a half to the nearest EVEN number and JavaScript rounds it
// up, so a spec line computed at 160.5 landed on 161 in the browser and 160 on the server. That
// was 450 differing pixels found by photographing a whole page; this finds it in four seconds and
// says which character differs.
//
//   node ph-parity.js [origin]
const { launch, newCtx, wait } = require('./lib/browser');
const { PAGES } = require('./lib/pages');
const { table, heading, verdict } = require('./lib/report');

const BASE = (process.argv[2] || 'http://localhost:5199').replace(/\/$/, '');

/** Every placeholder in a raw HTML string, decoded. */
function placeholders(html) {
  const out = [];
  for (const m of html.matchAll(/data:image\/svg\+xml,([^"'\s>]+)/g)) {
    try { out.push(decodeURIComponent(m[1])); } catch (e) { /* not ours */ }
  }
  return out;
}

/** The three arguments that produced a drawing, read back out of it. */
function argsOf(svg) {
  const size = svg.match(/^<svg[^>]*width="(\d+)" height="(\d+)"/);
  if (!size) return null;
  const label = [...svg.matchAll(/<tspan[^>]*>([^<]*)<\/tspan>/g)]
    .map(m => m[1]).join(' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
  return { w: +size[1], h: +size[2], label };
}

(async () => {
  const b = await launch();
  const ctx = await newCtx(b, { width: 1440, height: 900 });
  const page = await ctx.newPage();
  // Any page loads _app/app.js, which is where AB.ph lives.
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 });
  await wait(1500);

  const seen = new Map();     // args -> svg cua may chu, khong lap lai cung mot hinh
  for (const p of PAGES) {
    const html = await (await fetch(BASE + p, { cache: 'no-store' })).text();
    for (const svg of placeholders(html)) {
      const a = argsOf(svg);
      if (!a) continue;
      const key = a.w + 'x' + a.h + '|' + a.label;
      if (!seen.has(key)) seen.set(key, { a, svg, page: p });
    }
  }

  const rows = [];
  let bad = 0;
  for (const [key, { a, svg, page: from }] of seen) {
    const mine = await page.evaluate(
      ([w, h, label]) => decodeURIComponent(AB.ph(w, h, label).split(',')[1]),
      [a.w, a.h, a.label]);

    if (mine === svg) continue;

    bad++;
    let i = 0;
    while (i < mine.length && i < svg.length && mine[i] === svg[i]) i++;
    rows.push([key.slice(0, 34), from, 'ky tu ' + i + ': may chu "' +
               svg.slice(i, i + 14) + '" / trinh duyet "' + mine.slice(i, i + 14) + '"']);
  }

  await b.close();
  heading('Placeholder: may chu so voi trinh duyet');
  if (bad) table(['hinh', 'trang', 'lech o dau'], rows);
  console.log('\n  %d/%d hinh ve giong het nhau.', seen.size - bad, seen.size);
  verdict(bad === 0, bad + ' hinh ve khac nhau giua ban port va ban goc');
})();
