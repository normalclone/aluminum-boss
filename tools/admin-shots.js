// Chup tung man hinh trong khu quan tri, va di het duong "them mot san pham".
//
// Bo do con lai kiem HANH VI: collection.js hoi "them roi xoa co tra ve nguyen van khong",
// editor-shot.js hoi "go chu thi khung xem thu co doi khong". Khong cai nao tra loi duoc cau
// "man hinh ay TRONG RA SAO" - mot bang khong co dong nao, mot nut khong co nhan, mot thong bao
// tran ra ngoai khung, deu di qua ca hai ma khong ai biet.
//
// Cong cu nay chup het, va ep ta phai mo ra nhin. No cung tu bat ba thu doc duoc bang may:
// trang loi cua ASP.NET, trang khong co <h1> nao, va loi script trong console.
//
// No con di het mot duong that tu dau den cuoi - Content -> Products -> Add an item -> Edit ->
// go ten -> Save -> ve danh sach -> Delete -> xac nhan - va chup tung buoc. Cuoi cung doi chieu
// products.json voi luc bat dau: mot cong cu do ma de lai rac thi lan chay sau do do rac ay.
//
//   node admin-shots.js [origin] [--width 1440] [--out <thu-muc>]
const fs = require('fs');
const os = require('os');
const path = require('path');
const { launch, newCtx, wait } = require('./lib/browser');
const { table, heading, verdict } = require('./lib/report');
const { signIn, USER } = require('./lib/admin');

const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const BASE = (argv.find(a => a.startsWith('http')) || 'http://127.0.0.1:5117').replace(/\/$/, '');
const WIDTH = +opt('width', 1440);
const OUT = opt('out', path.join(os.tmpdir(), 'admin-shots'));
const DATA = path.join(__dirname, '..', 'wwwroot', '_data');

// Muoi ba loai trong man hinh Content: bay kho, bon cai gia cua trang chu, hai khoi canvas.
// Viet lai o day chu khong dung chung voi CollectionController: neu hai ben lech nhau thi phep
// do phai keu len.
const KINDS = ['products', 'colors', 'news', 'projects', 'documents',
               'gallery', 'applications',
               'home-news', 'home-products', 'home-colors', 'home-projects',
               'routes', 'factories'];

// Bon man hinh cua ban mau. Task 11 thao chung khoi menu, Task 15 xoa han - chung ghi vao ba
// bang khong ai doc, va mot nut Save bao "da luu" khi khong luu gi la thu te hon mot trang 404.
//
// Do o day chinh la 404: neu mot cai trong so nay ve ra duoc lan nua thi ai do da hoi sinh no.
const GONE = ['/Admin/Dashboard', '/Admin/Content', '/Admin/Layout', '/Admin/Seo'];

const read = doc => fs.readFileSync(path.join(DATA, doc + '.json'), 'utf8');

/* ------------------------------------------------------------------------------------------ */

const rows = [];
const parkedRows = [];
let bad = 0;
let shot = 0;

function check(what, ok, detail, into = rows) {
  if (!ok) bad++;
  into.push([what, ok ? 'dat' : 'KHONG DAT', detail]);
}

/** Chup ca trang, danh so theo thu tu gap, de xem lai doc duoc nhu mot cau chuyen. */
async function capture(page, name) {
  shot++;
  const file = path.join(OUT, String(shot).padStart(2, '0') + '-' + name + '.png');
  await page.screenshot({ path: file, fullPage: true });
  return path.basename(file);
}

/**
 * Mo mot man hinh, chup, va tra loi no co that su hien ra khong.
 *
 * Ba thu doc duoc bang may, va deu la nhung thu mot nguoi luot qua se bo qua:
 *   - trang loi cua ASP.NET (co tieu de rieng, khong phai 500 tran)
 *   - khong co <h1> nao: khung layout ve duoc nhung noi dung thi khong
 *   - loi script trong console
 */
async function screen(page, urlPath, name, into = rows) {
  const errs = [];
  const onError = e => errs.push('pageerror: ' + e.message);
  const onConsole = m => { if (m.type() === 'error') errs.push('console: ' + m.text()); };
  page.on('pageerror', onError);
  page.on('console', onConsole);

  let status = 0;
  try {
    const res = await page.goto(BASE + urlPath, { waitUntil: 'load', timeout: 60000 });
    status = res ? res.status() : 0;
  } catch (e) {
    page.off('pageerror', onError);
    page.off('console', onConsole);
    check(name, false, 'khong mo duoc: ' + e.message.split('\n')[0], into);
    return null;
  }
  await wait(500);

  const seen = await page.evaluate(() => ({
    title: (document.querySelector('h1') || {}).textContent || '',
    blew: /An unhandled exception|Developer Exception Page/i.test(document.body.innerText || ''),
    rows: document.querySelectorAll('table tbody tr').length,
    fields: document.querySelectorAll('[data-address]').length,
    tiles: document.querySelectorAll('.ad-tile, .ed-tile').length,
  }));

  const file = await capture(page, name);
  page.off('pageerror', onError);
  page.off('console', onConsole);

  const ok = status === 200 && !seen.blew && seen.title.trim().length > 0 && errs.length === 0;
  const parts = [];
  if (seen.rows) parts.push(seen.rows + ' dong');
  if (seen.fields) parts.push(seen.fields + ' o nhap');
  if (seen.tiles) parts.push(seen.tiles + ' o anh');
  if (seen.blew) parts.push('TRANG LOI');
  if (errs.length) parts.push(errs.length + ' loi script: ' + errs[0].slice(0, 60));
  if (!seen.title.trim()) parts.push('khong co <h1>');

  check(name, ok, (status !== 200 ? status + ' · ' : '')
        + '"' + seen.title.trim().slice(0, 34) + '"'
        + (parts.length ? ' · ' + parts.join(' · ') : '')
        + ' · ' + file, into);
  return seen;
}


/* ------------------------------------------------------------------------------------------ */

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const before = Object.fromEntries(KINDS.map(k => [k, null]));
  const DOC = { products: 'products', colors: 'colors', news: 'news', projects: 'projects',
                documents: 'documents', gallery: 'gallery', applications: 'applications',
                'home-news': 'home-news', 'home-products': 'home-products',
                'home-colors': 'home-colors', 'home-projects': 'home-projects',
                routes: 'globe', factories: 'factories' };
  for (const k of KINDS) before[k] = read(DOC[k]);

  const b = await launch();
  const ctx = await newCtx(b, { width: WIDTH, height: 1000 });
  const page = await ctx.newPage();

  // 1 - man hinh dau tien ai cung gap: chua dang nhap.
  await screen(page, '/Admin/Account/Login', 'login');

  if (!await signIn(page, BASE)) {
    console.log('  Khong dang nhap duoc bang %s.', USER);
    await b.close();
    process.exit(1);
  }

  // 2 - cac man hinh trong menu, theo dung thu tu menu.
  //
  // /Admin di thang vao man soan, khong vao mot trang tong quan: tuyen mac dinh la
  // {controller=Edit}. Do la chu y - man hinh dau tien phai la man hinh lam viec.
  await screen(page, '/Admin', 'edit-mac-dinh');
  await screen(page, '/Admin/Edit?page=' + encodeURIComponent('/news/press-line-2500/'),
               'edit-mot-bai-viet');

  // Bang chon anh la mot trang thai, khong phai mot dia chi - phai mo ra moi chup duoc.
  await page.goto(BASE + '/Admin/Edit?page=' + encodeURIComponent('/products/'),
                  { waitUntil: 'load', timeout: 60000 });
  await page.waitForSelector('.ed-field-img .ed-choose', { timeout: 30000 });
  await page.locator('.ed-field-img .ed-choose').first().click();
  await page.waitForSelector('#ed-shelf:not([hidden])', { timeout: 15000 });
  await wait(700);
  const shelfTiles = await page.locator('.ed-tile').count();
  const shelfFile = await capture(page, 'edit-bang-chon-anh');
  check('bang chon anh', shelfTiles > 0, shelfTiles + ' o trong thu vien · ' + shelfFile);

  await screen(page, '/Admin/Collection', 'content-cac-loai');
  for (const k of KINDS) await screen(page, '/Admin/Collection/Items/' + k, 'content-' + k);

  await screen(page, '/Admin/Media', 'pictures');
  await screen(page, '/Admin/Enquiry', 'enquiries');
  await screen(page, '/Admin/History', 'history');
  await screen(page, '/Admin/Account/Password', 'doi-mat-khau');

  /* ---- duong "them mot san pham", tu dau den cuoi ---------------------------------------- */

  await page.goto(BASE + '/Admin/Collection/Items/products', { waitUntil: 'load', timeout: 60000 });
  const startRows = await page.locator('table tbody tr').count();

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load', timeout: 30000 }),
    page.locator('.ad-addbar button').click(),
  ]);
  const afterAdd = await page.locator('table tbody tr').count();
  const placeholder = (await page.locator('table tbody tr').first().locator('b').textContent()).trim();
  const addFile = await capture(page, 'them-1-muc-moi-o-dau-danh-sach');
  check('them mot san pham', afterAdd === startRows + 1,
        startRows + ' -> ' + afterAdd + ' dong, id tam "' + placeholder + '" · ' + addFile);

  // Nut Edit mo trang cua chinh muc do trong khung soan hai cot.
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load', timeout: 60000 }),
    page.locator('table tbody tr').first().locator('a.ad-btn').first().click(),
  ]);
  await page.waitForFunction(
    () => [...document.querySelectorAll('#ed-fields [data-address]')]
            .some(e => e.getAttribute('data-address').indexOf('products.categories.') === 0),
    null, { timeout: 30000 }).catch(() => {});
  const ownFields = await page.evaluate(() =>
    [...document.querySelectorAll('#ed-fields [data-address]')]
      .map(e => e.getAttribute('data-address'))
      .filter(a => a.indexOf('products.categories.') === 0));
  const editFile = await capture(page, 'them-2-man-soan-cua-muc-moi');
  check('muc moi co o nhap cua chinh no', ownFields.length > 0,
        ownFields.length + ' o, gom ' + (ownFields[0] || '-') + ' · ' + editFile);

  // Go ten, roi luu. Ten lan dau cung dat luon dia chi trang.
  const NAME = 'Lan can nhom';
  const nameBox = page.locator('[data-address="products.categories.0.name"]');
  await nameBox.waitFor({ state: 'visible', timeout: 30000 });
  await nameBox.fill(NAME);
  await nameBox.dispatchEvent('input');
  const typedFile = await capture(page, 'them-3-da-go-ten');

  await page.locator('#ed-save').click();
  await page.waitForFunction(
    () => /changes? saved/.test(document.querySelector('#ed-save-note')?.textContent || ''),
    null, { timeout: 30000 });
  await wait(1200);
  const slug = JSON.parse(read('products')).categories[0].id;
  const frameSrc = await page.locator('#ed-frame').getAttribute('src');
  const savedFile = await capture(page, 'them-4-da-luu-va-co-dia-chi');
  check('ten dat lan dau sinh ra dia chi', slug === 'lan-can-nhom' && (frameSrc || '').includes(slug),
        placeholder + ' -> ' + slug + ' · khung xem thu '
        + ((frameSrc || '').includes(slug) ? 'di theo' : 'CON O DIA CHI CU')
        + ' · ' + typedFile + ' ' + savedFile);

  // Muc moi phai co that tren trang cong khai truoc khi ta xoa no di.
  const live = await ctx.newPage();
  await live.goto(BASE + '/products/', { waitUntil: 'load', timeout: 60000 });
  const onSite = (await live.locator('.ab-band-head h2').allTextContents()).some(t => t.trim() === NAME);
  const liveFile = await capture(live, 'them-5-tren-trang-cong-khai');
  await live.close();
  check('muc moi len trang cong khai', onSite, '"' + NAME + '" tren /products/ · ' + liveFile);

  // Xoa: bam lan mot de hoi, chup cau hoi, bam lan hai moi lam that.
  await page.goto(BASE + '/Admin/Collection/Items/products', { waitUntil: 'load', timeout: 60000 });
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load', timeout: 30000 }),
    page.locator('table tbody tr').first().locator('.ad-danger-plain').click(),
  ]);
  const asked = await page.locator('.ad-confirm').count();
  const askFile = await capture(page, 'them-6-hoi-truoc-khi-xoa');
  check('hoi truoc khi xoa', asked === 1, 'bam lan mot ra mot cau hoi · ' + askFile);

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load', timeout: 30000 }),
    page.locator('.ad-confirm button[type=submit]').click(),
  ]);
  const endRows = await page.locator('table tbody tr').count();
  const endFile = await capture(page, 'them-7-da-don-sach');
  check('xoa xong', endRows === startRows, afterAdd + ' -> ' + endRows + ' dong · ' + endFile);

  /* ---- man hinh cua ban mau: phai khong con nua -------------------------------------------- */

  // Hoi bang request chu khong mo bang trinh duyet: mot 404 cua MVC khong co than trang nao,
  // va Chrome coi trang rong kem ma loi la ERR_HTTP_RESPONSE_CODE_FAILURE roi nem ra. Dung chinh
  // ngu canh cua trang nen cookie dang nhap van di theo - phai hoi voi tu cach nguoi da dang
  // nhap, khong thi 404 chi dang nghia la "chua dang nhap".
  for (const url of GONE) {
    const res = await ctx.request.get(BASE + url, { maxRedirects: 0 });
    check(url, res.status() === 404,
          res.status() === 404 ? 'khong con tra loi' : 'CON TRA LOI ' + res.status(), parkedRows);
  }

  /* ---- va cau hoi nghiem khac nhat ------------------------------------------------------- */

  const drifted = KINDS.filter(k => read(DOC[k]) !== before[k]);
  check('file noi dung tro lai nguyen van', drifted.length === 0,
        drifted.length ? 'con lech: ' + drifted.join(', ') : `ca ${KINDS.length} file giong het luc bat dau`);

  await b.close();

  heading('Moi man hinh trong khu quan tri, rong ' + WIDTH);
  table(['man hinh', 'ket qua', 'chi tiet'], rows, [false, false, false]);

  heading('Man hinh cua ban mau — phai da bien mat');
  table(['dia chi', 'ket qua', 'chi tiet'], parkedRows, [false, false, false]);
  console.log('\n  %d dia chi nay tung ve ra mot man hinh day du voi mot nut Save khong luu gi.',
              GONE.length);
  console.log('  Gio la 404, va do la su that. Ai bookmark mot trong so chung se biet ngay.');

  console.log('\n  %d anh trong %s — MO RA NHIN, dung chi doc con so.', shot, OUT);
  verdict(bad === 0, 'moi man hinh ve ra duoc, va duong them mot san pham di het duoc');
})();
