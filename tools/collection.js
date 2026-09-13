// Them, an, doi thu tu, xoa - cho ca muoi loai noi dung, roi tra moi thu ve nhu cu.
//
// Man hinh danh sach la thu duy nhat doi duoc TAP HOP cac muc, va moi thao tac cua no ghi thang
// vao file noi dung cua khach. Nen phep do nay lam dung nhung viec do, tren ca muoi loai, va ket
// thuc bang cau hoi nghiem khac nhat: sau tat ca, mo file ra co giong het luc bat dau khong.
//
//   node collection.js [origin]
const fs = require('fs');
const path = require('path');
const { launch, newCtx, wait } = require('./lib/browser');
const { table, heading, verdict } = require('./lib/report');

const BASE = (process.argv[2] || 'http://127.0.0.1:5117').replace(/\/$/, '');
const DATA = path.join(__dirname, '..', 'wwwroot', '_data');
const USER = process.env.AB_ADMIN_USER || 'admin';
const PASS = process.env.AB_ADMIN_PASS || 'changeme';

// Cung danh sach ma CollectionController giu, viet lai o day de doi chieu chu khong de dung chung:
// neu hai ben lech nhau thi phep do phai keu len, khong duoc im lang di theo.
const KINDS = [
  ['products', 'products'], ['colors', 'colors'], ['news', 'news'],
  ['projects', 'projects'], ['documents', 'documents'], ['gallery', 'gallery'],
  ['highlights', 'highlights'], ['applications', 'applications'],
  ['routes', 'globe'], ['factories', 'factories'],
];

const read = doc => fs.readFileSync(path.join(DATA, doc + '.json'), 'utf8');

async function signIn(page) {
  await page.goto(BASE + '/Admin', { waitUntil: 'load', timeout: 60000 });
  if (!page.url().includes('/Account/Login')) return true;
  await page.fill('input[name=username]', USER);
  await page.fill('input[name=password]', PASS);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load', timeout: 60000 }),
    page.click('button[type=submit]'),
  ]);
  return !page.url().includes('/Account/Login');
}

const rows = page => page.locator('table tbody tr').count();

/** Bam mot nut trong dong thu i va doi trang tai lai. */
async function press(page, i, selector) {
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load', timeout: 30000 }),
    page.locator('table tbody tr').nth(i).locator(selector).click(),
  ]);
}

(async () => {
  const before = Object.fromEntries(KINDS.map(([, doc]) => [doc, read(doc)]));
  const out = [];
  let bad = 0;
  const check = (what, ok, detail) => {
    if (!ok) bad++;
    out.push([what, ok ? 'dat' : 'KHONG DAT', detail]);
  };

  const b = await launch();
  const ctx = await newCtx(b, { width: 1400, height: 1000 });
  const page = await ctx.newPage();

  if (!await signIn(page)) {
    console.log('  Khong dang nhap duoc bang %s.', USER);
    await b.close();
    process.exit(1);
  }

  for (const [key, doc] of KINDS) {
    await page.goto(BASE + '/Admin/Collection/Items/' + key, { waitUntil: 'load', timeout: 60000 });
    const start = await rows(page);
    if (start === 0) { check(key, false, 'khong doc duoc muc nao'); continue; }

    // them
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'load', timeout: 30000 }),
      page.locator('.ad-addbar button').click(),
    ]);
    const added = await rows(page);

    // an muc thu hai (muc dau la cai vua them), roi hien lai
    await press(page, 1, '.ad-state');
    const hidden = await page.locator('table tbody tr.is-off').count();
    await press(page, 1, '.ad-state');
    const backOn = await page.locator('table tbody tr.is-off').count();

    // day muc vua them xuong mot bac roi keo len lai, va doi chieu no that su di dau
    const title = (await page.locator('table tbody tr').first().locator('b').textContent()).trim();
    await press(page, 0, '.ad-order form:nth-child(2) button');
    const wentDown =
      (await page.locator('table tbody tr').nth(1).locator('b').textContent()).trim() === title;
    await press(page, 1, '.ad-order form:nth-child(1) button');
    const cameBack =
      (await page.locator('table tbody tr').first().locator('b').textContent()).trim() === title;
    const moved = wentDown && cameBack;

    // xoa: bam mot lan de hoi, bam lan hai de lam that
    await press(page, 0, '.ad-danger-plain');
    const asked = await page.locator('.ad-confirm').count();
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'load', timeout: 30000 }),
      page.locator('.ad-confirm button[type=submit]').click(),
    ]);
    const end = await rows(page);

    check(key,
      added === start + 1 && hidden === 1 && backOn === 0 && moved && asked === 1 && end === start,
      `${start} muc · them=${added === start + 1 ? 'dat' : 'hong'}`
      + ` · an=${hidden === 1 && backOn === 0 ? 'dat' : 'hong'}`
      + ` · doi thu tu=${moved ? 'dat' : 'hong'}`
      + ` · hoi truoc khi xoa=${asked === 1 ? 'dat' : 'hong'}`
      + ` · xoa=${end === start ? 'dat' : 'hong'}`);
  }

  // Mot muc bi an phai bien mat khoi trang that, khong chi khoi man hinh danh sach.
  await page.goto(BASE + '/Admin/Collection/Items/news', { waitUntil: 'load', timeout: 60000 });
  const title = (await page.locator('table tbody tr').first().locator('b').textContent()).trim();
  await press(page, 0, '.ad-state');

  const plain = await ctx.newPage();
  await plain.goto(BASE + '/news/', { waitUntil: 'load', timeout: 60000 });
  const gone = !(await plain.locator('.ab-post h2').allTextContents())
    .some(t => t.trim() === title);
  await plain.goto(BASE + '/news/', { waitUntil: 'load' });

  await press(page, 0, '.ad-state');
  await plain.goto(BASE + '/news/', { waitUntil: 'load', timeout: 60000 });
  const back = (await plain.locator('.ab-post h2').allTextContents()).some(t => t.trim() === title);
  await plain.close();

  check('an mot bai -> bien khoi /news/', gone && back, '"' + title + '" an di roi hien lai');

  // Va cau hoi nghiem khac nhat.
  const same = KINDS.filter(([, doc]) => read(doc) !== before[doc]).map(([, doc]) => doc);
  check('file noi dung tro lai nguyen van', same.length === 0,
        same.length ? 'con lech: ' + same.join(', ') : 'ca 10 file giong het luc bat dau');

  heading('Muoi loai noi dung: them, an, doi thu tu, xoa');
  table(['loai', 'ket qua', 'chi tiet'], out, [false, false, false]);
  await b.close();
  verdict(bad === 0, 'man hinh danh sach doi duoc tap hop, va khong de lai gi');
})();
