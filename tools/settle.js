// Loads the same page twice and reports which section came out a different height.
//
// Exists because the home page photographed differently between two shots from the SAME server -
// 4,827 differing pixels, a uniform one-pixel shift starting four fifths of the way down. A shift
// like that is never the thing it starts at; it is something ABOVE settling at a different height
// on one of the two loads, and a whole-page photograph cannot say which thing.
//
// Until that is answered, no baseline of this page means anything: a comparison can flip without
// anybody changing anything.
//
//   node settle.js [origin] [path] [lan-chay]
const { launch, newCtx, wait } = require('./lib/browser');
const { SECTIONS } = require('./lib/pages');
const { table, heading, verdict } = require('./lib/report');

const BASE = (process.argv[2] || 'http://localhost:5199').replace(/\/$/, '');
const PATH = process.argv[3] || '/';
const RUNS = +(process.argv[4] || 3);

const MEASURE = sections => sections.map(([name, sel]) => {
  const el = document.querySelector(sel);
  if (!el) return [name, null, null];
  const r = el.getBoundingClientRect();
  return [name, Math.round(r.top + window.scrollY), Math.round(r.height)];
});

(async () => {
  const b = await launch();
  const ctx = await newCtx(b, { width: 1440, height: 1000 });

  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    const page = await ctx.newPage();
    await page.goto(BASE + PATH, { waitUntil: 'load', timeout: 90000 });
    await wait(5000);
    // Same treatment the photograph gets, so the two measure the same page.
    await page.evaluate(`(async () => {
      const imgs = [...document.images];
      imgs.forEach(i => { i.loading = 'eager'; });
      await Promise.all(imgs.map(i => i.decode().catch(() => {})));
    })()`);
    await wait(800);
    runs.push({
      sections: await page.evaluate(MEASURE, SECTIONS),
      docHeight: await page.evaluate(() => document.documentElement.scrollHeight),
    });
    await page.close();
  }
  await b.close();

  const rows = [];
  let moved = 0;
  for (let s = 0; s < SECTIONS.length; s++) {
    const tops = runs.map(r => r.sections[s][1]);
    const heights = runs.map(r => r.sections[s][2]);
    const steady = heights.every(h => h === heights[0]) && tops.every(t => t === tops[0]);
    if (!steady) moved++;
    rows.push([SECTIONS[s][0], tops.join(' / '), heights.join(' / '),
               steady ? '' : 'DOI']);
  }

  heading('Trang co dung yen khong — ' + PATH + ', ' + RUNS + ' lan tai');
  table(['vung', 'dinh', 'cao', ''], rows);
  console.log('\n  Chieu cao tai lieu: %s', runs.map(r => r.docHeight).join(' / '));
  console.log('  Vung DAU TIEN co chu DOI la nguyen nhan; moi vung duoi no chi bi day theo.');
  verdict(moved === 0, moved + ' vung khong dung yen giua cac lan tai');
})();
