// What the page costs while the reader has stopped and is reading.
//
// This is the measurement that was missing when a user reported the page felt laggy and every
// scroll measurement said it was fine. Scrolling WAS fine - a scroll pause held the animated
// sections to two draws a second while the wheel turned. The cost appeared the moment you
// stopped, which is most of the time anyone spends on a page, and which no scroll test looks at.
//
// It also isolates: a section that looks expensive may just be sitting next to one that is.
// Passing --isolate hides every animated section but the one being measured.
//
//   node idle.js [origin] [dpr] [--isolate]
const { launch, newCtx, focus, wait } = require('./lib/browser');
const { SECTIONS } = require('./lib/pages');
const { table, heading, verdict } = require('./lib/report');

const args = process.argv.slice(2);
const ISOLATE = args.includes('--isolate');
const rest = args.filter(a => !a.startsWith('--'));
const BASE = (rest[0] || 'http://127.0.0.1:5117').replace(/\/$/, '');
const DPR = +(rest[1] || 1);

const SAMPLE = () => new Promise(res => {
  const f = []; let last = performance.now(), n = 0;
  const tick = () => {
    const now = performance.now(); f.push(now - last); last = now;
    if (++n < 120) requestAnimationFrame(tick);
    else {
      f.shift(); f.sort((a, b) => a - b);
      const at = q => Math.round(f[Math.floor(f.length * q)] * 10) / 10;
      res({ p50: at(.5), p90: at(.9), fps: Math.round(1000 / at(.5)) });
    }
  };
  requestAnimationFrame(tick);
});

(async () => {
  const b = await launch({ headless: false });
  const ctx = await newCtx(b, { width: 1920, height: 1080, dpr: DPR });
  const p = await ctx.newPage();
  await p.goto(BASE + '/', { waitUntil: 'load', timeout: 90000 });
  await wait(4500);

  if (!await focus(p)) {
    console.log('  Trang khong hien thi — phep do se sai. Dung.');
    await b.close();
    return verdict(false, 'khong do duoc');
  }

  const mp = await p.evaluate(() => {
    let t = 0;
    document.querySelectorAll('canvas').forEach(c => { t += c.width * c.height; });
    return (t / 1e6).toFixed(2);
  });

  const rows = [];
  let worst = 0;
  for (const [name, sel] of SECTIONS) {
    const there = await p.evaluate(s => !!document.querySelector(s), sel);
    if (!there) continue;

    if (ISOLATE) {
      await p.evaluate(keep => {
        document.querySelectorAll('.vgx, .vfx, .ab-nov').forEach(e => { e.style.display = ''; });
        document.querySelectorAll('.vgx, .vfx, .ab-nov').forEach(e => {
          if (!e.matches(keep) && !e.querySelector(keep)) e.style.display = 'none';
        });
      }, sel);
    }

    await p.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'center' }), sel);
    await wait(1800);                       // past any resume delay
    const r = await p.evaluate(SAMPLE);
    rows.push([name, r.p50 + 'ms', r.p90 + 'ms', r.fps]);
    worst = Math.max(worst, r.p50);
  }

  heading('Trang dung yen — ' + BASE + '  1920x1080  dpr ' + DPR + (ISOLATE ? '  (co lap)' : '') +
          '  canvas ' + mp + ' MP');
  table(['dung yen o', 'p50', 'p90', 'fps'], rows, [false, true, true, true]);
  console.log('\n  Cham nhat: %sms. DPR 1.5 la muc may Windows hay dung - do ca hai.', worst);
  await b.close();
  verdict(worst < 16.7, 'moi vung giu duoc 60fps khi dung yen');
})();
