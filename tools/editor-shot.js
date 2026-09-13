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
const { signIn, USER } = require('./lib/admin');

const BASE = (process.argv[2] || 'http://127.0.0.1:5117').replace(/\/$/, '');
const OUT = process.argv[3] || path.join(require('os').tmpdir(), 'editor-shot');

const frame = page => page.frameLocator('#ed-frame');

/** Mo trinh soan tren mot trang, khong qua o chon - xem chu thich o buoc 5. */
async function open(page, path) {
  await page.goto(BASE + '/Admin/Edit?page=' + encodeURIComponent(path), { waitUntil: 'load' });
  await page.waitForSelector('#ed-fields .ed-field', { timeout: 30000 });
}

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

  if (!await signIn(page, BASE)) {
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
  // Hai dang dia chi trong trang, va phai tim duoc ca hai.
  //
  // Chu cua khuon mang dia chi day du ("site.nav.1.label"). Chu do bo dung sinh ra mang dia chi
  // TUONG DOI - ".categories.0.name" - kem mot dau ten tep tren khoi bao quanh; trinh soan ghep
  // hai manh lai truoc khi hien ra. Phep thu nay tung chi tim dang thu nhat, va no qua duoc chi
  // vi o nhap dau tien tinh co la cua khuon. Den ngay danh sach o doi thu tu thi no gay.
  const at = a => {
    const cut = a.indexOf('.');
    const doc = a.slice(0, cut), rel = a.slice(cut);
    const kinds = ['t', 'lead', 'lines'];
    return kinds.map(k => '[data-ab-' + k + '="' + a + '"]')
      .concat(kinds.map(k => '[data-ab-doc="' + doc + '"] [data-ab-' + k + '="' + rel + '"]'))
      .join(',');
  };
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
  //
  // Mo thang bang dia chi chu khong chon trong o Page: buoc 2 da go mot chu vao, nen trang dang
  // "co thay doi chua luu" va doi trang se hoi lai bang mot hop thoai. Playwright tu bam Huy,
  // nen khung xem thu O NGUYEN CHO CU va phep thu sau do se dem nham trang chu.
  await page.click('.ed-w[data-w="1440"]');
  await open(page, '/products/');
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

  // 7 - chu cua chinh MUC, khong phai chu cua khung trang.
  //
  // Phep thu nay tung do, va do lau: trinh ghep sinh data-ab-img cho anh nhung khong sinh
  // data-ab-t cho chu, nen tieu de mot bai viet khong co o nhap nao. Sua header voi footer thi
  // duoc, con sua bai viet thi khong - tuc la dung phan khach can nhat.
  // Cai ten trong o Page la duong dan that cua mot muc, khong phai "/news/detail/".
  const newsPage = await page.evaluate(() =>
    [...document.querySelectorAll('#ed-page option')]
      .map(o => o.value).filter(v => v.indexOf('/news/') === 0 && v !== '/news/')[0]);
  await open(page, newsPage);
  // Doi danh sach o nhap dung LEN LAI - no duoc dung lai tu nhung gi trang bao ve, nen ngay sau
  // khi doi trang thi danh sach cu van con do va mot phep dem se dem nham no.
  await page.waitForFunction(
    () => [...document.querySelectorAll('#ed-fields [data-address]')]
            .some(e => e.getAttribute('data-address').indexOf('news.items.') === 0),
    null, { timeout: 30000 }).catch(() => {});
  const own = await page.evaluate(() =>
    [...document.querySelectorAll('#ed-fields [data-address]')]
      .map(e => e.getAttribute('data-address'))
      .filter(a => a.indexOf('news.items.') === 0));
  check('chu cua bai viet co o nhap',
        own.some(a => /[.]title$/.test(a)) && own.length >= 3,
        own.length ? own.length + ' o, gom ' + own.filter(a => /[.]title$/.test(a))[0]
                   : 'KHONG o nao thuoc ve bai viet (' + newsPage + ', khung '
                     + (await page.locator('#ed-frame').getAttribute('src')) + ')');
  await shot('7-item-fields');

  // 8 - go vao o cua MUC thi khung xem thu doi ngay, truoc khi luu.
  //
  // Phep thu 2 go vao mot dia chi cua khuon (site.wordmark.lead), di qua duong cu. Dia chi cua
  // muc di qua duong moi - dau cham mo dau, roi ghep voi ten tep dong tren khoi bao quanh - va
  // chua co gi chay het ca duong ay: phep thu cua collection.js luu roi tai lai trang, nen mot
  // duong va-song bi hong van se qua duoc.
  const titleAddr = own.filter(a => /[.]title$/.test(a))[0];
  const titleBox = page.locator('[data-address="' + titleAddr + '"]');
  const before = await titleBox.inputValue();
  const live = 'Da go luc ' + new Date().toISOString().slice(11, 19);
  await titleBox.fill(live);
  await wait(500);
  const shown = await frame(page).locator('h1.ab-article-title').first().textContent();
  check('go vao o cua muc -> xem thu doi ngay', shown.trim() === live,
        titleAddr + ' -> "' + shown.trim() + '"');
  await shot('8-live-item');

  // Tra ve nhu cu va KHONG luu: phep thu nay chi doc duong va-song.
  await titleBox.fill(before);
  await wait(200);

  heading('Man hinh soan tren ' + BASE);
  table(['phep thu', 'ket qua', 'chi tiet'], rows, [false, false, false]);
  console.log('\n  Anh o %s — MO RA NHIN, dung chi doc con so.', OUT);
  await b.close();
  verdict(bad === 0, 'khung hai cot dung, va ca hai chieu cua cau noi deu chay');
})();
