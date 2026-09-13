// Photographs pages with JavaScript switched off.
//
// This is the one thing the pixel comparison cannot tell you. parity.js waits for scripts to run
// before it shoots, so it compares the page a person sees - and a page whose server-rendered
// markup is malformed still looks perfect there, because the scripts replace it a moment later.
// A crawler never gets that moment. What it receives is exactly this photograph.
//
//   node nojs.js <origin> [--only <chuoi>] [width] [thu-muc-ra]
//
// Prints how much text survived without scripts and leaves the images somewhere you can open
// them, because "2,208 characters" is not the same claim as "the page reads correctly".
const fs = require('fs');
const path = require('path');
const { launch, wait, UA } = require('./lib/browser');
const { PAGES, slug } = require('./lib/pages');
const { table, heading } = require('./lib/report');

(async () => {
  const args = process.argv.slice(2);
  const onlyAt = args.indexOf('--only');
  const only = onlyAt === -1 ? null : args.splice(onlyAt, 2)[1];

  const origin = (args.shift() || 'http://localhost:5199').replace(/\/$/, '');
  const width = +(args[0] && /^\d+$/.test(args[0]) ? args.shift() : 1440) || 1440;
  const out = args.shift() || path.join(require('os').tmpdir(), 'nojs');

  // "=" nghia la khop ca duong dan, vi trang chu la "/" ma moi duong dan deu chua "/".
  const pages = !only ? PAGES
    : only.startsWith('=') ? PAGES.filter(p => p === only.slice(1))
    : PAGES.filter(p => p.includes(only));
  if (!pages.length) { console.log('  --only %s khong khop trang nao.', only); return; }

  fs.mkdirSync(out, { recursive: true });
  const b = await launch();
  const ctx = await b.newContext({
    viewport: { width, height: 1000 },
    userAgent: UA,
    javaScriptEnabled: false,
  });

  const rows = [];
  for (const p of pages) {
    const page = await ctx.newPage();
    try {
      await page.goto(origin + p, { waitUntil: 'load', timeout: 60000 });
      await wait(500);
      const text = await page.evaluate(() => {
        const main = document.querySelector('main');
        return (main ? main.innerText : document.body.innerText).replace(/\s+/g, ' ').trim();
      });
      const file = path.join(out, slug(p) + '_' + width + '.png');
      await page.screenshot({ path: file, fullPage: true });
      rows.push([p, String(text.length), text.slice(0, 46)]);
    } catch (e) {
      rows.push([p, 'LOI', e.message.split('\n')[0].slice(0, 46)]);
    } finally {
      await page.close();
    }
  }
  await b.close();

  heading('Trang khi TAT JavaScript (rong ' + width + ')');
  table(['trang', 'chu trong main', 'mo dau'], rows);
  console.log('\n  Anh o %s — MO RA NHIN, dung chi doc con so.', out);
})();
