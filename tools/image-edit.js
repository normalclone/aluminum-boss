// Doi mot tam anh tu dau den cuoi, roi tra lai nhu cu.
//
// Day la phep do duy nhat di het duong: bam vao anh trong khung xem thu, tai mot file len, chon
// no, bam Luu - roi kiem ba cho mot thay doi phai xuat hien, va mot cho no khong duoc xuat hien:
//
//   1. file JSON trong wwwroot/_data doi
//   2. ban sao trong site/_data doi y het (hai cay khong duoc lech - da lech mot lan, len thang
//      ban dang chay, va khong phep do nao bat duoc)
//   3. trang cong khai - khong co ?edit=1, khong co trinh soan - hien dung tam anh do
//   4. thu vien anh co them dung mot file
//
// Roi dat lai nhu cu va kiem lai, vi mot phep thu de lai rac trong du lieu cua khach la mot phep
// thu khong ai dam chay lan hai.
//
//   node image-edit.js [origin]
const fs = require('fs');
const path = require('path');
const { launch, newCtx, wait } = require('./lib/browser');
const { table, heading, verdict } = require('./lib/report');
const { signIn, USER } = require('./lib/admin');

const BASE = (process.argv[2] || 'http://127.0.0.1:5117').replace(/\/$/, '');
const ROOT = path.join(__dirname, '..');

// Trang News: mot danh sach bai, moi bai mot tam anh, va du lieu nong nhat trong site.
const PAGE = '/news/';
const DOC = 'news';

const read = tree => fs.readFileSync(path.join(ROOT, tree, '_data', DOC + '.json'), 'utf8');
const media = () => fs.readdirSync(path.join(ROOT, 'wwwroot', '_media'));


(async () => {
  const before = read('wwwroot');
  const mediaBefore = media();
  const rows = [];
  let bad = 0;
  const check = (what, ok, detail) => {
    if (!ok) bad++;
    rows.push([what, ok ? 'dat' : 'KHONG DAT', detail]);
  };

  const b = await launch();
  const ctx = await newCtx(b, { width: 1600, height: 1000 });
  const page = await ctx.newPage();

  if (!await signIn(page, BASE)) {
    console.log('  Khong dang nhap duoc bang %s.', USER);
    await b.close();
    process.exit(1);
  }

  await page.goto(BASE + '/Admin/Edit?page=' + encodeURIComponent(PAGE),
    { waitUntil: 'load', timeout: 60000 });
  await page.waitForSelector('.ed-field-img', { timeout: 30000 });

  // 1 - bam vao tam anh dau tien TRONG khung xem thu, khong phai trong cot trai
  await page.frameLocator('#ed-frame').locator('[data-ab-img]').first().click();
  await wait(400);
  const chosen = await page.evaluate(() => {
    const el = document.querySelector('.ed-field-img.is-found, .ed-field-img');
    return el ? el.querySelector('input[type=hidden]').getAttribute('data-address') : null;
  });
  check('bam anh trong khung -> chon o', !!chosen, chosen || 'khong o nao duoc chon');

  // 2 - mo bang chon anh va tai mot file len
  await page.locator('.ed-field-img').first().locator('.ed-choose').click();
  await page.waitForSelector('#ed-shelf:not([hidden])', { timeout: 15000 });
  await page.setInputFiles('#ed-shelf-file', path.join(ROOT, 'wwwroot', '_media', 'hero-profile.jpg'));
  // Wait for the shelf to go away, which is what says the upload finished and the picture was
  // taken. Not "attached": it is always attached, so that wait returns at once and the check
  // below then looks for a file that is still on its way.
  await page.waitForSelector('#ed-shelf', { state: 'hidden', timeout: 60000 });

  // What was chosen, read from the field rather than from a directory listing. The stored name
  // carries a hash of the content, so uploading the same picture twice is the same file - and a
  // leftover from an earlier run would make "a new file appeared" false while everything actually
  // worked. A test that fails for the previous run's reasons is worse than no test.
  const file = await page.locator('.ed-field-img').first()
    .locator('input[type=hidden]').inputValue();
  check('tai anh len', !!file && media().includes(file),
        file ? file + (mediaBefore.includes(file) ? ' (da co san)' : ' (moi)')
             : 'khong chon duoc file');

  // 3 - luu
  await page.click('#ed-save');
  await page.waitForFunction(
    () => document.getElementById('ed-save-note').textContent.indexOf('saved') >= 0,
    { timeout: 30000 });
  await wait(600);

  const after = read('wwwroot');
  check('wwwroot/_data doi', after !== before && after.includes(file),
        after.includes(file) ? 'co "' + file + '"' : 'khong thay ten file trong JSON');
  check('site/_data giong het', read('site') === after, 'hai cay khong duoc lech');

  // 4 - trang cong khai, khong trinh soan, khong ?edit=1
  const plain = await ctx.newPage();
  await plain.goto(BASE + PAGE, { waitUntil: 'load', timeout: 60000 });
  const shown = await plain.locator('img[src*="' + file + '"]').count();
  check('trang cong khai hien anh', shown > 0, shown + ' the <img> dung file do');

  // 5 - va mot cho khong duoc doi: trang cong khai van khong co cau noi
  const bridge = await plain.locator('script[src*="edit-bridge"]').count();
  check('trang cong khai khong co cau noi', bridge === 0, bridge + ' the script');
  await plain.close();

  // 6 - dat lai nhu cu
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('.ed-field-img', { timeout: 30000 });
  await page.locator('.ed-field-img').first().locator('.ed-choose').click();
  await page.waitForSelector('#ed-shelf:not([hidden])', { timeout: 15000 });
  await page.locator('.ed-tile.is-none').click();
  await page.click('#ed-save');
  await page.waitForFunction(
    () => document.getElementById('ed-save-note').textContent.indexOf('saved') >= 0,
    { timeout: 30000 });
  await wait(600);

  check('dat lai duoc nhu cu', read('wwwroot') === before,
        read('wwwroot') === before ? 'JSON tro lai nguyen van' : 'JSON KHONG tro lai nhu cu');

  // Only clear away what this run put there.
  if (file && !mediaBefore.includes(file)) {
    try { fs.unlinkSync(path.join(ROOT, 'wwwroot', '_media', file)); } catch (e) { /* da xoa */ }
  }

  heading('Doi mot tam anh, tu dau den cuoi');
  table(['phep thu', 'ket qua', 'chi tiet'], rows, [false, false, false]);
  console.log('\n  Anh dung de thu: %s', file || '(khong chon duoc)');
  await b.close();
  verdict(bad === 0, 'chon anh -> luu -> trang that doi theo -> dat lai duoc');
})();
