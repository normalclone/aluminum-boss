// Finds text sitting on top of other text.
//
// Every measurement can pass while the page looks wrong. Four separate section builds on this
// site each shipped a placeholder image whose own label printed the same words that were already
// on the card, and every one of them reported zero errors, no overflow and working links. One of
// them had written the assertion "src starts with data:" - the kind of check that stays green
// while the page is unreadable.
//
// This walks the scroll range and reports where a floating element covers text that is visible.
//
//   node overlap.js [origin] [width] [height]
const { launch, newCtx, focus, wait } = require('./lib/browser');
const { table, heading, verdict } = require('./lib/report');

const BASE = (process.argv[2] || 'http://127.0.0.1:5117').replace(/\/$/, '');
const W = +(process.argv[3] || 1440);
const H = +(process.argv[4] || 900);

// The bar floats over the page; the hero's own text scrolls up underneath it.
const PROBE = () => {
  const bar = document.querySelector('.abh');
  if (!bar) return null;
  const bb = bar.getBoundingClientRect();

  // Opacity is inherited when the browser PAINTS and not when script reads it: a fade applied to
  // a parent leaves getComputedStyle(child).opacity at 1 while the whole group is invisible.
  // Multiply up the ancestor chain to get what the reader actually sees.
  const effectiveOpacity = el => {
    let o = 1;
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const v = parseFloat(getComputedStyle(n).opacity);
      if (!isNaN(v)) o *= v;
      if (o === 0) break;
    }
    return o;
  };

  const bits = [
    ['hero claim', document.querySelector('.abhero-claim')],
    ['hero words', document.getElementById('abhero-words')],
    ['hero caption', document.getElementById('abhero-caption')],
  ].filter(x => x[1]);

  let worst = 0, who = '', vis = 0;
  for (const [name, e] of bits) {
    const r = e.getBoundingClientRect();
    if (!r.height) continue;
    const lap = Math.min(bb.bottom, r.bottom) - Math.max(bb.top, r.top);
    if (lap > worst) { worst = lap; who = name; vis = effectiveOpacity(e); }
  }
  return { lap: Math.round(worst), who, opacity: vis, barTransparent: bar.classList.contains('is-over') };
};

(async () => {
  const b = await launch({ headless: false });
  const ctx = await newCtx(b, { width: W, height: H });
  const p = await ctx.newPage();
  await p.goto(BASE + '/', { waitUntil: 'load', timeout: 90000 });
  await wait(4500);
  await focus(p);

  const rows = [];
  let bad = 0;
  for (let y = 0; y <= 1000; y += 50) {
    await p.evaluate(v => window.scrollTo(0, v), y);
    await wait(200);
    const r = await p.evaluate(PROBE);
    if (!r) break;
    // Overlap only counts when the covered text is still visible AND the bar is transparent.
    // An opaque bar covering text below it is ordinary occlusion, not a collision.
    const visible = r.lap > 0 && r.opacity > 0.02 && r.barTransparent;
    if (visible) bad++;
    if (visible || y % 200 === 0) {
      rows.push([y, r.barTransparent ? 'trong suot' : 'co nen',
                 r.lap > 0 ? r.who : '-', r.lap || '-',
                 visible ? 'CON NHIN THAY' : (r.lap ? 'da mo het' : 'sach')]);
    }
  }

  heading('Chu de len chu — ' + BASE + '  ' + W + 'x' + H);
  table(['scrollY', 'thanh nav', 'phan tu', 'chong (px)', 'ket qua'], rows, [true, false, false, true, false]);
  console.log('\n  %d vi tri con nhin thay chong chu.', bad);
  await b.close();
  verdict(bad === 0, 'khong co chu nao de len chu con doc duoc');
})();
