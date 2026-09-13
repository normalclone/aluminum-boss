// Them, an, doi thu tu, xoa - cho MOI loai noi dung, roi tra moi thu ve nhu cu.
//
// Man hinh danh sach la thu duy nhat doi duoc TAP HOP cac muc, va moi thao tac cua no ghi thang
// vao file noi dung cua khach. Nen phep do nay lam dung nhung viec do, tren tat ca, va ket
// thuc bang cau hoi nghiem khac nhat: sau tat ca, mo file ra co giong het luc bat dau khong.
//
//   node collection.js [origin]
const fs = require('fs');
const path = require('path');
const { launch, newCtx, wait } = require('./lib/browser');
const { table, heading, verdict } = require('./lib/report');
const { signIn, USER } = require('./lib/admin');

const BASE = (process.argv[2] || 'http://127.0.0.1:5117').replace(/\/$/, '');
const DATA = path.join(__dirname, '..', 'wwwroot', '_data');

// Cung danh sach ma CollectionController giu, viet lai o day de doi chieu chu khong de dung chung:
// neu hai ben lech nhau thi phep do phai keu len, khong duoc im lang di theo.
// Cot thu ba: co them muc moi duoc khong. Hai khoi canvas thi khong - cai lam nen mot tuyen la
// bon muoi cap toa do, ma toa do khong phai chu tren trang nen khong co dia chi nao de dien vao.
const KINDS = [
  ['products', 'products', true], ['colors', 'colors', true], ['news', 'news', true],
  ['projects', 'projects', true], ['documents', 'documents', true], ['gallery', 'gallery', true],
  ['applications', 'applications', true],
  ['home-news', 'home-news', true], ['home-products', 'home-products', true],
  ['home-colors', 'home-colors', true], ['home-projects', 'home-projects', true],
  ['routes', 'globe', false], ['factories', 'factories', false],
];

// Bon cai gia cua trang chu, va cho tren trang chu de nhin xem no co di theo khong.
// Cot cuoi: selector tim the dau tien, va duong dan tren the phai chua id vua chon.
const SHELVES = [
  ['home-news', '.core-slider-novedades__slide__container'],
  ['home-products', '#abhb-products .ab-tile'],
  ['home-colors', '#abhb-colors .ab-swatch'],
  ['home-projects', '#abhb-projects .ab-card'],
];

const read = doc => fs.readFileSync(path.join(DATA, doc + '.json'), 'utf8');


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

  if (!await signIn(page, BASE)) {
    console.log('  Khong dang nhap duoc bang %s.', USER);
    await b.close();
    process.exit(1);
  }

  for (const [key, doc, canAdd] of KINDS) {
    await page.goto(BASE + '/Admin/Collection/Items/' + key, { waitUntil: 'load', timeout: 60000 });
    const start = await rows(page);
    if (start === 0) { check(key, false, 'khong doc duoc muc nao'); continue; }

    // Hai loai khong them duoc: doi hoi nut phai KHONG co, va man hinh phai noi vi sao. Mot nut
    // bam vao sinh ra mot dong trong khong ai dien noi thi te hon la khong co nut.
    if (!canAdd) {
      const noButton = await page.locator('.ad-addbar button').count() === 0;
      const said = await page.locator('.ad-addbar.ad-note').count() === 1;

      // Con lai van phai lam duoc, va phai tra ve nguyen van.
      await press(page, 0, '.ad-state');
      const off = await page.locator('table tbody tr.is-off').count();
      await press(page, 0, '.ad-state');
      const on = await page.locator('table tbody tr.is-off').count();

      const first = (await page.locator('table tbody tr').first().locator('b').textContent()).trim();
      await press(page, 0, '.ad-order form:nth-child(2) button');
      const down =
        (await page.locator('table tbody tr').nth(1).locator('b').textContent()).trim() === first;
      await press(page, 1, '.ad-order form:nth-child(1) button');
      const up =
        (await page.locator('table tbody tr').first().locator('b').textContent()).trim() === first;

      check(key, noButton && said && off === 1 && on === 0 && down && up,
            `${start} muc · khong co nut them=${noButton && said ? 'dat' : 'hong'}`
            + ` · an=${off === 1 && on === 0 ? 'dat' : 'hong'}`
            + ` · doi thu tu=${down && up ? 'dat' : 'hong'}`);
      continue;
    }

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

  // Mot muc moi phai lay dia chi tu CAI TEN khach dat cho no, khong phai tu new-3f9a2c.
  //
  // Day la duong di that: Content -> Add -> Edit -> go tieu de -> Save. Sau Save, khung xem thu
  // phai di theo dia chi moi, vi dia chi cu vua ngung ton tai.
  await page.goto(BASE + '/Admin/Collection/Items/news', { waitUntil: 'load', timeout: 60000 });
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load', timeout: 30000 }),
    page.locator('.ad-addbar button').click(),
  ]);
  // Muc moi chua co tieu de nen o cot Item man hinh in chinh id cua no.
  const placeholder = (await page.locator('table tbody tr').first()
    .locator('b').textContent()).trim();

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load', timeout: 60000 }),
    page.locator('table tbody tr').first().locator('a.ad-btn').first().click(),
  ]);

  // O nhap cua dung dia chi ay - trang con mang ca chuc o khac, tu wordmark tro di.
  const TITLE = 'Phu kien nhom dinh hinh';
  const box = page.locator('[data-address="news.items.0.title"]');
  await box.waitFor({ state: 'visible', timeout: 30000 });
  await box.fill(TITLE);
  await box.dispatchEvent('input');
  await page.locator('#ed-save').click();
  await page.waitForFunction(
    () => /changes? saved/.test(document.querySelector('#ed-save-note')?.textContent || ''),
    null, { timeout: 30000 });
  await wait(page, 800);

  const slugged = JSON.parse(read('news')).items[0].id;
  const framed = await page.locator('#ed-frame').getAttribute('src');
  check('mot muc moi lay dia chi tu ten cua no',
        slugged === 'phu-kien-nhom-dinh-hinh' && (framed || '').includes(slugged),
        `${placeholder || 'new-xxxxxx'} -> ${slugged} · khung xem thu ${
          (framed || '').includes(slugged) ? 'di theo' : 'CON O DIA CHI CU'}`);

  // Va don sach: muc vua them phai bien di, neu khong cau hoi cuoi cung se noi doi.
  await page.goto(BASE + '/Admin/Collection/Items/news', { waitUntil: 'load', timeout: 60000 });
  await press(page, 0, '.ad-danger-plain');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load', timeout: 30000 }),
    page.locator('.ad-confirm button[type=submit]').click(),
  ]);

  /* ---- mot the tren trang chu la mot con tro, khong phai mot ban sao ------------------- */
  //
  // Mot cai gia khong mang gi cua rieng no: anh, chu va duong dan deu lay tu kho no tro toi.
  // Nen phep thu la doi CON TRO va xem TRANG CHU co di theo khong - mot phep thu chi doc JSON
  // se qua duoc ca khi trang chu van ve bang du lieu cu.
  //
  // Chay cho ca bon cai gia, vi bon cai dung chung mot doan ma nhung tro vao bon kho khac nhau,
  // va hai trong so do khong giu muc duoi khoa "items".
  for (const [key, card] of SHELVES) {
    const items = BASE + '/Admin/Collection/Items/' + key;
    await page.goto(items, { waitUntil: 'load', timeout: 60000 });

    const pickRow = page.locator('table tbody tr').first();
    const was = await pickRow.locator('select').inputValue();
    const others = await page.evaluate(() =>
      [...document.querySelectorAll('table tbody tr')].slice(1)
        .map(r => r.querySelector('select').value));
    // Mot muc chua the nao dang tro toi, de khong trung voi the khac.
    const all = await page.evaluate(() =>
      [...document.querySelectorAll('table tbody tr select')[0].options]
        .map(o => o.value).filter(Boolean));
    // Uu tien mot muc chua the nao tro toi, cho de doc. Nhung gia home-products giu ca sau dong
    // san pham, nen khong con cai nao thua - luc ay lay bat ky cai nao khac cai dang tro, va
    // chap nhan hai the cung tro vao mot cho trong vai giay. Phep do chi hoi ve THE DAU TIEN.
    const free = all.find(v => v !== was && !others.includes(v)) || all.find(v => v !== was);
    if (!free) { check('gia ' + key, false, 'kho chi co dung mot muc, khong doi duoc'); continue; }

    await pickRow.locator('select').selectOption(free);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'load', timeout: 30000 }),
      pickRow.locator('.ad-pick button').click(),
    ]);
    const pointed = JSON.parse(read(key)).items[0].id;

    const home = await ctx.newPage();
    await home.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 });
    const firstHref = await home.locator(card).first().getAttribute('href');
    await home.close();

    check('gia ' + key + ': trang chu di theo con tro',
          pointed === free && (firstHref || '').includes(free),
          `${was} -> ${pointed} · the dau tren trang chu: ${firstHref}`);

    // Tra lai muc cu.
    await page.goto(items, { waitUntil: 'load', timeout: 60000 });
    await page.locator('table tbody tr').first().locator('select').selectOption(was);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'load', timeout: 30000 }),
      page.locator('table tbody tr').first().locator('.ad-pick button').click(),
    ]);
  }

  // Va cau hoi nghiem khac nhat.
  const same = KINDS.filter(([, doc]) => read(doc) !== before[doc]).map(([, doc]) => doc);
  check('file noi dung tro lai nguyen van', same.length === 0,
        same.length ? 'con lech: ' + same.join(', ')
                    : `ca ${KINDS.length} file giong het luc bat dau`);

  heading(`${KINDS.length} loai noi dung: them, an, doi thu tu, xoa`);
  table(['loai', 'ket qua', 'chi tiet'], out, [false, false, false]);
  await b.close();
  verdict(bad === 0, 'man hinh danh sach doi duoc tap hop, va khong de lai gi');
})();
