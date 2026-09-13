// Frame time as a function of scroll position, attributed to the section the reader is passing.
//
// One number for a whole page hides which part is expensive. This bucketed version is what
// located a section that held the page at 25-40fps while every whole-page measurement said the
// scroll was fine.
//
// Two traps this tool exists to avoid:
//   * A window that never came to the front throttles requestAnimationFrame to ~1Hz, which once
//     produced a "1007ms per frame" reading on a healthy page. It asserts visibility first.
//   * The baseline moves. A machine that reports 8.3ms one day and 9.9ms the next has changed
//     its refresh rate, not its website - always compare against a run from the SAME session.
//
//   node scroll.js [origin] [width] [height]
const { launch, newCtx, focus, wait } = require('./lib/browser');
const { SECTIONS } = require('./lib/pages');
const { table, heading, verdict } = require('./lib/report');

const BASE = (process.argv[2] || 'http://127.0.0.1:5117').replace(/\/$/, '');
const W = +(process.argv[3] || 1440);
const H = +(process.argv[4] || 900);

const RECORD = () => {
  window.__s = []; window.__go = false;
  let last = performance.now();
  const tick = () => {
    const now = performance.now();
    if (window.__go) window.__s.push({ y: Math.round(scrollY), dt: now - last });
    last = now;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

(async () => {
  const b = await launch({ headless: false });
  const ctx = await newCtx(b, { width: W, height: H });
  const p = await ctx.newPage();
  await p.goto(BASE + '/', { waitUntil: 'load', timeout: 90000 });
  await wait(4500);

  if (!await focus(p)) {
    console.log('  Trang khong hien thi — phep do se sai. Dung.');
    await b.close();
    return verdict(false, 'khong do duoc');
  }

  const marks = await p.evaluate(list => {
    const out = [];
    for (const [name, sel] of list) {
      const e = document.querySelector(sel);
      if (e) out.push({ name, top: Math.round(e.getBoundingClientRect().top + scrollY) });
    }
    return { marks: out, height: document.body.scrollHeight };
  }, SECTIONS);

  await p.evaluate(RECORD);
  await p.evaluate(() => { window.__go = true; });
  await p.mouse.move(W / 2, H / 2);
  const notches = Math.ceil(marks.height / 100);
  for (let i = 0; i < notches; i++) { await p.mouse.wheel(0, 100); await wait(16); }
  await wait(600);
  await p.evaluate(() => { window.__go = false; });

  const s = await p.evaluate(() => window.__s);
  const rows = marks.marks.map((m, i) => {
    const next = marks.marks[i + 1];
    const hi = next ? next.top : marks.height;
    const f = s.filter(x => x.y >= m.top - H * 0.5 && x.y < hi).map(x => x.dt).sort((a, c) => a - c);
    if (!f.length) return null;
    const at = q => Math.round(f[Math.floor(f.length * q)] * 10) / 10;
    return [m.name, f.length, at(.5), at(.9), Math.round(f[f.length - 1]), f.filter(x => x > 33).length];
  }).filter(Boolean);

  const all = s.map(x => x.dt).sort((a, c) => a - c);
  const p50 = Math.round(all[Math.floor(all.length * .5)] * 10) / 10;
  const over = all.filter(x => x > 33).length;

  heading('Cuon ' + BASE + '  ' + W + 'x' + H + '  (trang cao ' + marks.height + 'px)');
  table(['vung', 'khung', 'p50', 'p90', 'te nhat', '>33ms'], rows, [false, true, true, true, true, true]);
  console.log('\n  Toan trang: p50 %sms · %d/%d khung qua 33ms', p50, over, all.length);
  console.log('  So sanh voi mot lan chay CUNG PHIEN, khong phai voi so ghi tu hom truoc.');
  await b.close();
  verdict(over / all.length < 0.05, 'duoi 5% khung vuot 33ms');
})();
