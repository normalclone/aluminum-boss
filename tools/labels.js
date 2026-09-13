// Cai nhan tren tung o nhap, doc het mot luot.
//
// Dia chi la duong di trong mot file JSON, va khach da duoc hua la khong bao gio phai nhin thay
// mot file JSON. "Categories #1 name" van bat ho tu doan ra rang "category" o day nghia la mot
// dong san pham; "Items #3 title" thi xuat hien tren nam man hinh khac nhau voi nam nghia khac
// nhau. Trinh soan co mot bang chu (WORDS trong editor.js) doi nhung tu ay sang tieng cua khach.
//
// Mot bang chu thi se cu lac hau dan: them mot danh sach vao du lieu la co them mot tu chua ai
// dat ten, va cai nhan lang le quay ve giong mot co so du lieu. Khong co gi keu len ca - do la
// ly do co cong cu nay.
//
// No mo tung trang trong o Page, gom het dia chi va nhan that su hien ra, roi hoi hai cau:
//   1. danh sach nao tren site khong co trong bang chu
//   2. cai nhan nao van con mang nguyen mot tu cua file
//
//   node labels.js [origin] [--all]
//
// Khong co --all thi chi in nhung cho con thieu; co --all thi in het de doc lai mot luot.

const { launch, newCtx, wait } = require('./lib/browser');
const { table, heading, verdict } = require('./lib/report');
const { signIn, USER } = require('./lib/admin');

const argv = process.argv.slice(2);
const BASE = (argv.find(a => a.startsWith('http')) || 'http://127.0.0.1:5117').replace(/\/$/, '');
const ALL = argv.includes('--all');

/** Dia chi -> hinh dang cua no: moi so thu tu viet thanh N. Do la khoa cua bang chu. */
const shapeOf = a => a.replace(/\.\d+(?=\.|$)/g, '.N');

/**
 * Nhung khuc trong mot HINH DANG la mot danh sach.
 *
 * "products.categories.N.items.N.spec" di qua hai danh sach: products.categories, va
 * products.categories.N.items. Moi khuc ket thuc ngay truoc mot chu N.
 *
 * Nhan hinh dang chu khong nhan dia chi, va do la cho vua sai: ham nay tung tim so thu tu bang
 * /^\d+$/ trong khi cai duoc truyen vao da thay het so bang N, nen no khong tim thay danh sach
 * nao ca va bao "khong con cai nao" tren mot site con nam cho chua dat ten.
 */
function lists(shape) {
  const parts = shape.split('.');
  const out = [];
  let sofar = parts[0];
  for (let i = 1; i < parts.length; i++) {
    if (parts[i] === 'N') { out.push(sofar); sofar += '.N'; }
    else sofar += '.' + parts[i];
  }
  return out;
}

/** Tu cuoi cung cua mot khuc: ten ma bang chu dang thay the. */
function key(shape) {
  const parts = shape.split('.').filter(p => p !== 'N');
  return parts[parts.length - 1];
}

(async () => {
  const b = await launch();
  const ctx = await newCtx(b, { width: 1600, height: 1000 });
  const page = await ctx.newPage();

  if (!await signIn(page, BASE)) {
    console.log('  Khong dang nhap duoc bang %s.', USER);
    await b.close();
    process.exit(1);
  }

  await page.goto(BASE + '/Admin', { waitUntil: 'load', timeout: 60000 });
  await page.waitForSelector('#ed-fields .ed-field', { timeout: 30000 });

  const words = await page.evaluate(() => window.AB_WORDS || null);
  if (!words) {
    console.log('  editor.js khong bay ra window.AB_WORDS — bang chu da bi doi ten?');
    await b.close();
    process.exit(1);
  }

  const pages = await page.evaluate(() =>
    [...document.querySelectorAll('#ed-page option')].map(o => o.value));

  // shape -> { label, page }. Mot hinh dang chi can mot vi du: cai nhan cua no giong nhau o moi
  // muc, chi khac con so.
  const seen = new Map();
  for (const p of pages) {
    await page.goto(BASE + '/Admin/Edit?page=' + encodeURIComponent(p),
                    { waitUntil: 'load', timeout: 60000 });
    await page.waitForSelector('#ed-fields .ed-field', { timeout: 30000 });
    await wait(300);
    const found = await page.evaluate(() =>
      [...document.querySelectorAll('#ed-fields .ed-field')].map(f => {
        const box = f.querySelector('[data-address]');
        const lab = f.querySelector('label');
        return box && lab ? { address: box.getAttribute('data-address'),
                              label: lab.textContent.trim() } : null;
      }).filter(Boolean));
    for (const f of found) {
      const shape = shapeOf(f.address);
      if (!seen.has(shape)) seen.set(shape, { label: f.label, page: p });
    }
  }
  await b.close();

  /* ---- 1. danh sach nao chua co ten --------------------------------------------------- */

  const every = new Map();                   // khuc danh sach -> trang dau tien gap no
  for (const [shape, v] of seen) {
    for (const l of lists(shape)) if (!every.has(l)) every.set(l, v.page);
  }
  const missing = [...every.entries()].filter(([l]) => !words[l]);

  /* ---- 2. cai nhan nao con mang nguyen tu cua file ------------------------------------ */
  //
  // Mot tu cua file lo ra khi chinh cai ten khoa ay - "categories", "albums" - nam trong nhan.
  // Bang chu dat ten khac han cho tung danh sach, nen thay khoa trong nhan la thay cho chua dat.
  const leaking = [];
  for (const [shape, v] of seen) {
    for (const l of lists(shape)) {
      const k = key(l);
      if (!words[l] && new RegExp('\\b' + k + '\\b', 'i').test(v.label)) {
        leaking.push([shape, v.label, k]);
        break;
      }
    }
  }

  heading('Nhan cua ' + seen.size + ' dang o nhap, tren ' + pages.length + ' trang');

  if (ALL) {
    table(['dia chi (dang)', 'nhan hien ra'],
          [...seen.entries()].sort().map(([s, v]) => [s, v.label]), [false, false]);
  }

  // Con so o day la bang chung rang phep do co nhin: mot bang "khong con cai nao" ben duoi so 0
  // nghia la no khong tim thay gi de kiem, chu khong phai moi thu deu dat.
  table(['danh sach tren site: ' + every.size + ' — chua co ten', 'gap o trang'],
        missing.length ? missing.map(([l, p]) => [l, p]) : [['(khong con cai nao)', '']],
        [false, false]);

  if (leaking.length) {
    table(['nhan con mang tu cua file', 'nhan', 'tu lo ra'], leaking, [false, false, false]);
  }

  console.log('\n  Bang chu co %d muc. Them mot danh sach vao du lieu thi them mot dong o',
              Object.keys(words).length);
  console.log('  WORDS trong wwwroot/admin/editor.js, khong thi cai nhan quay ve giong JSON.');
  if (!ALL) console.log('  Chay lai voi --all de doc het %d cai nhan mot luot.', seen.size);

  verdict(missing.length === 0 && leaking.length === 0,
          'moi danh sach tren site deu co mot cai ten nguoi doc duoc');
})();
