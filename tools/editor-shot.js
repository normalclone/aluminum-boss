// Chup man hinh soan noi dung, va bam thu chinh nhung thu no hua.
//
// Bo do con lai chi cham vao site cong khai; khu soan thi khong phep do nao voi toi. Ma cai phai
// nhin o day la thu khong doc bang DOM duoc: hai cot co can nhau khong, khung xem thu co vua cot
// khong, doi bo ngang 390 thi trang co that su nhay sang bo cuc dien thoai khong.
//
// Bon phep thu, moi cai mot anh:
//   1. mo /Admin (phai dang nhap that, khong tat [Authorize] cho de do)
//   2. go vao mot o nhap  -> chu trong khung xem thu doi theo ngay
//   3. bam chu trong khung -> o nhap tuong ung duoc cuon toi va lam noi len
//   4. ba bo ngang 1440 / 834 / 390
//   5. o anh tren mot trang co anh, va bang chon anh mo ra
//
//   node editor-shot.js [origin] [thu-muc-ra]
const fs = require('fs');
const path = require('path');
const { launch, newCtx, wait } = require('./lib/browser');
const { table, heading, verdict } = require('./lib/report');

const BASE = (process.argv[2] || 'http://127.0.0.1:5117').replace(/\/$/, '');
const OUT = process.argv[3] || path.join(require('os').tmpdir(), 'editor-shot');
const USER = process.env.AB_ADMIN_USER || 'admin';
const PASS = process.env.AB_ADMIN_PASS || 'changeme';

/** Dang nhap that: cookie auth, va bieu mau co antiforgery token nen phai di qua trang do. */
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

const frame = page => page.frameLocator('#ed-frame');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await launch();
  const ctx = await newCtx(b, { width: 1600, height: 1000 });
  const page = await ctx.newPage();
  const rows = [];
  let bad = 0;

  const shot = async (name) => {
    await page.screenshot({ path: path.join(OUT, name + '.png') });
    return name + '.png';
  };
  const check = (what, ok, detail) => {
    if (!ok) bad++;
    rows.push([what, ok ? 'dat' : 'KHONG DAT', detail]);
  };

  if (!await signIn(page)) {
    heading('Man hinh soan');
    console.log('\n  Khong dang nhap duoc bang %s. Dat AB_ADMIN_USER / AB_ADMIN_PASS neu da doi.',
      USER);
    await b.close();
    process.exit(1);
  }

  // 1 - khung hai cot
  await page.waitForSelector('#ed-fields .ed-field input, #ed-fields .ed-field textarea',
    { timeout: 30000 });
  const fieldCount = await page.locator('#ed-fields .ed-field').count();
  check('khung hai cot', fieldCount > 0, fieldCount + ' o nhap tren trang chu');
  await shot('1-shell');

  // 2 - go vao o nhap thi khung xem thu doi theo
  const first = page.locator('#ed-fields .ed-field input[type=text]').first();
  const address = await first.getAttribute('data-address');
  const typed = 'Da sua luc ' + new Date().toISOString().slice(11, 19);
  await first.fill(typed);
  await wait(400);
  const at = a => '[data-ab-t="' + a + '"],[data-ab-lead="' + a + '"],[data-ab-lines="' + a + '"]';
  const inFrame = await frame(page).locator(at(address)).first().textContent();
  // data-ab-lead la doan chu TRUOC the con dau tien, nen textContent con keo theo phan con lai.
  check('go chu -> xem thu doi', inFrame.trim().startsWith(typed),
        address + ' = "' + inFrame.trim() + '"');
  await shot('2-typed');

  // 3 - bam chu trong khung xem thu -> o nhap duoc chon
  await frame(page).locator('[data-ab-t]').nth(3).click();
  await wait(400);
  const focused = await page.evaluate(() =>
    document.activeElement && document.activeElement.getAttribute('data-address'));
  check('bam chu -> chon o nhap', !!focused, focused || 'khong o nhap nao duoc chon');
  await shot('3-picked');

  // 4 - ba bo ngang
  for (const w of [1440, 834, 390]) {
    await page.click('.ed-w[data-w="' + w + '"]');
    await wait(700);
    const real = await frame(page).locator('body').evaluate(el => el.ownerDocument.defaultView.innerWidth);
    check('bo ngang ' + w, Math.abs(real - w) <= 1, 'khung bao innerWidth = ' + real);
    await shot('4-width-' + w);
  }

  // 5 - o anh va bang chon anh
  await page.click('.ed-w[data-w="1440"]');
  await page.selectOption('#ed-page', '/products/');
  await page.waitForSelector('.ed-field-img', { timeout: 30000 });
  const imgFields = await page.locator('.ed-field-img').count();
  check('o anh tren /products/', imgFields > 0, imgFields + ' o anh');
  await shot('5-image-fields');

  await page.locator('.ed-field-img').first().locator('.ed-choose').click();
  await page.waitForSelector('#ed-shelf:not([hidden])', { timeout: 15000 });
  await wait(600);
  const tiles = await page.locator('.ed-tile').count();
  check('bang chon anh', tiles > 0, tiles + ' o trong thu vien (ke ca o "khong anh")');
  await shot('6-picture-shelf');
  await page.click('#ed-shelf-close');

  heading('Man hinh soan tren ' + BASE);
  table(['phep thu', 'ket qua', 'chi tiet'], rows, [false, false, false]);
  console.log('\n  Anh o %s — MO RA NHIN, dung chi doc con so.', OUT);
  await b.close();
  verdict(bad === 0, 'khung hai cot dung, va ca hai chieu cua cau noi deu chay');
})();
