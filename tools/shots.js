// Chup trang de gui anh Phuc duyet truoc khi push.
//
//   node tools/shots.js                                  # 6 trang chinh, 1440, khung that
//   node tools/shots.js --pages /news/,/products/        # chi may trang nay
//   node tools/shots.js --width 390 --full               # dien thoai, chup ca trang
//   node tools/shots.js --origin http://127.0.0.1:5117   # dung may chu dang chay
//
// TREN GIT BASH: dat MSYS_NO_PATHCONV=1 truoc lenh khi truyen --pages. Git Bash doi mot tham so
// bat dau bang "/" thanh duong dan Windows, nen "/products/" den tay Node duoi dang
// "C:/Program Files/Git/products/" va page.goto bao "Cannot navigate to invalid URL".
//
// Anh vao tools/out/shots/. Ten tep theo duong dan.
//
// ---------------------------------------------------------------------------------------------
// KHUNG THAT LA MAC DINH, VA DO LA MOT QUYET DINH
//
// Anh chup CA TRANG (--full) khong noi dung su that ve nhung trang co `loading="lazy"`: Chrome
// keo khung nhin len het chieu cao trang roi chup mot lan, nen anh duoi man hinh dau chua kip
// tai va o anh ra trong tron. Trang tin dai 14.863px chup kieu do ra mot mang o trang, nhin nhu
// site hong - trong khi nguoi dung that khong bao gio thay canh ay.
//
// Nen mac dinh la chup DUNG MOT KHUNG MAN HINH, tuc la dung cai nguoi ta thuc su nhin thay.
// --full van co, cho luc can xem bo cuc ca trang, nhung phai tu go ra.
const fs = require('fs');
const path = require('path');
const { launch, newCtx, wait } = require('./lib/browser');
const { serve } = require('./lib/static');
const { heading, verdict } = require('./lib/report');

const ROOT = path.join(__dirname, '..');
const SITE = path.join(ROOT, 'site');
const OUT = path.join(__dirname, 'out', 'shots');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };

const ORIGIN = arg('origin', null);
const PORT = +arg('port', 5121);
const WIDTH = +arg('width', 1440);
const HEIGHT = +arg('height', 950);
const FULL = process.argv.includes('--full');
const PAGES = arg('pages', '/,/news/,/products/,/projects/,/documents/,/contact/').split(',');

const name = p => (p.replace(/^\/|\/$/g, '').replace(/\//g, '-') || 'home') + '-' + WIDTH + (FULL ? '-full' : '') + '.png';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const server = ORIGIN ? null : serve(SITE, PORT);
  const base = ORIGIN || 'http://127.0.0.1:' + PORT;
  const b = await launch();
  const done = [];

  try {
    const ctx = await newCtx(b, { width: WIDTH, height: HEIGHT });
    const page = await ctx.newPage();
    for (const p of PAGES) {
      await page.goto(base + p, { waitUntil: 'load', timeout: 40000 });
      await wait(1200);
      if (FULL) {
        // Cuon het mot luot de cac anh lazy kip tai, roi ve dau. Van khong chac an — xem ghi
        // chu dau tep — nhung hon han chup thang.
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await wait(1200);
        await page.evaluate(() => window.scrollTo(0, 0));
        await wait(600);
      }
      const file = path.join(OUT, name(p));
      await page.screenshot({ path: file, fullPage: FULL });
      const kb = (fs.statSync(file).size / 1024).toFixed(0);
      console.log('  ' + p.padEnd(16) + name(p).padEnd(28) + kb + ' KB');
      done.push(p);
    }
  } finally {
    await b.close();
    if (server) server.close();
  }

  heading('Anh chup');
  console.log('  %d trang o %dpx, %s. Thu muc: %s',
              done.length, WIDTH, FULL ? 'ca trang' : 'mot khung man hinh', path.relative(ROOT, OUT));
  verdict(done.length === PAGES.length, `${done.length}/${PAGES.length} trang`);
})();
