// Huong dan su dung co con khop voi man hinh that khong.
//
//   node tools/guide-check.js [origin] [tep-huong-dan.html]      # mac dinh docs/huong-dan.html
//     origin mac dinh http://localhost:5199 - PHAI la may chu tren chinh may lam viec: cong cu
//     nay dang nhap bang tai khoan thu cua tools/lib/admin.js.
//
// Khu quan tri viet bang tieng Anh, con huong dan viet bang tieng Viet va trich nguyen van ten
// nut: "Add an item", "Restore this version". Mot ngay ai do doi chu tren mot nut, va huong dan
// bat dau chi nguoi doc toi mot cai nut khong con ton tai - khong co gi bao ca, cho toi khi mot
// nguoi khong ranh ky thuat ngoi truoc man hinh ma khong tim thay no.
//
// Nen: di qua MOI man hinh ma huong dan nhac toi, chup anh tung man hinh, gom toan bo chu hien ra
// (ca title cua nut, placeholder cua o nhap, ten tuy chon), roi lay tung nhan trong huong dan -
// moi <span class="ui"> va <kbd> - xem no co mat o dau. Nhan nao khong tim thay la mot cho huong
// dan dang noi sai.
//
// Lan chay dau (28/09/2026) viet ra de kiem ban huong dan cu, va no bat duoc nhung cho ban cu noi
// "nut Add" trong khi nut ghi "Add an item".
const fs = require('fs');
const path = require('path');
const { launch, newCtx, wait } = require('./lib/browser');
const { signIn } = require('./lib/admin');

const BASE = (process.argv[2] || 'http://localhost:5199').replace(/\/$/, '');
// Mac dinh la ban trang web cua huong dan nam ngay trong kho: docs/huong-dan.html.
const GUIDE = process.argv[3] || path.join(__dirname, '..', 'docs', 'huong-dan.html');
const OUT = path.join(__dirname, 'out', 'huong-dan');
fs.mkdirSync(OUT, { recursive: true });

// Moi chu mot man hinh co the "noi" voi nguoi dung, khong chi innerText: nut chi co mui ten thi
// ten cua no nam trong title, o nhap trong thi chu cua no nam trong placeholder.
const doc = page => page.evaluate(() => {
  const bits = [document.body.innerText];
  document.querySelectorAll('[title],[placeholder],[aria-label],option,input[type=submit],input[type=button]')
    .forEach(e => bits.push(e.getAttribute('title') || '', e.getAttribute('placeholder') || '',
                            e.getAttribute('aria-label') || '', e.value || '', e.textContent || ''));
  return bits.join('\n');
});

(async () => {
  const b = await launch();
  const ctx = await newCtx(b, { width: 1500, height: 950 });
  const p = await ctx.newPage();
  if (!await signIn(p, BASE)) { console.error('  khong dang nhap duoc ' + BASE); process.exit(1); }

  const screens = {};
  const shot = async (name) => {
    await p.screenshot({ path: path.join(OUT, name + '.png') });
    screens[name] = await doc(p);
  };
  const go = async (name, url, settle = 1200) => {
    await p.goto(BASE + url, { waitUntil: 'networkidle', timeout: 60000 });
    await wait(settle);
    await shot(name);
  };

  await go('1-site-content', '/Admin');
  await go('2-edit-trang-chu', '/Admin/Edit?page=' + encodeURIComponent('/'), 2500);
  await go('3-edit-bai-tin', '/Admin/Edit?page=' + encodeURIComponent('/news/press-line-2500/'), 2500);

  // Bang chon anh chi co mat khi mo ra.
  const chon = p.locator('.ed-field-img .ed-choose').first();
  if (await chon.count()) {
    await chon.click();
    await p.locator('#ed-shelf-list .ed-tile').first().waitFor({ timeout: 15000 }).catch(() => {});
    await wait(800);
    await shot('4-kho-anh-trong-editor');
    await p.keyboard.press('Escape');
  }

  await go('5-content', '/Admin/Collection');
  await go('6-content-news', '/Admin/Collection/Items/news');
  await go('7-content-routes', '/Admin/Collection/Items/routes');
  await go('8-content-home-news', '/Admin/Collection/Items/home-news');
  await go('9-pictures', '/Admin/Media');
  await go('10-enquiries', '/Admin/Enquiry');
  await go('11-history', '/Admin/History');
  await go('12-history-news', '/Admin/History?name=news');

  // Hai trang cong khai: huong dan chi nguoi doc toi day de thu form lien he.
  await go('13-trang-lien-he', '/contact/', 1500);
  await go('14-form-bao-gia', '/contact/quote/', 1500);

  // Cong doi mat khau: KHONG gui gi, chi doc chu tren trang.
  await go('15-doi-mat-khau', '/Admin/Account/Password');

  await b.close();

  const all = Object.values(screens).join('\n');
  fs.writeFileSync(path.join(OUT, 'chu-tren-man-hinh.txt'),
    Object.entries(screens).map(([k, v]) => '##### ' + k + '\n' + v).join('\n\n'));

  console.log('');
  console.log('  Da chup ' + Object.keys(screens).length + ' man hinh vao ' + path.relative(process.cwd(), OUT));

  if (!GUIDE) { console.log('  (khong dua tep huong dan - chi chup anh va gom chu)'); return; }

  // Nhan trong huong dan. Bo the HTML long ben trong, giai ma &amp; &nbsp;.
  const html = fs.readFileSync(GUIDE, 'utf8');
  const un = s => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
                   .replace(/&ldquo;|&rdquo;/g, '"').replace(/\s+/g, ' ').trim();
  const labels = [...new Set([
    ...[...html.matchAll(/<span class="ui(?: [^"]*)?">([\s\S]*?)<\/span>/g)].map(m => un(m[1])),
    ...[...html.matchAll(/<kbd>([\s\S]*?)<\/kbd>/g)].map(m => un(m[1])),
  ])].filter(Boolean);

  // Nhung nhan co y la KHONG phai chu tren man hinh (vi du minh hoa kieu chip).
  const MINH_HOA = new Set(['thế này']);
  // Phim tren ban phim: khong nam tren man hinh nao, dung la vay.
  const PHIM = new Set(['Ctrl', 'Cmd', 'F5']);

  // Mot so chu chi hien trong mot tinh huong: hop xac nhan xoa, thong bao sau khi them, man hinh
  // khi chua co don nao, cau bao loi khi mat mang. Chup anh luc binh thuong thi khong thay chung,
  // ma huong dan van phai nhac toi. Nhung chu ay duoc tim trong MA NGUON cua dung nhung cho ve ra
  // man hinh - va bao ro la "ma nguon", de nguoi doc biet no chua duoc thay tan mat.
  const GOC = path.join(__dirname, '..');
  const NGUON = ['Areas/Admin/Views', 'Areas/Admin/Controllers', 'wwwroot/admin', 'wwwroot/_app']
    .flatMap(d => {
      const out = [];
      const di = p => { for (const f of fs.readdirSync(p, { withFileTypes: true })) {
        const q = path.join(p, f.name);
        if (f.isDirectory()) di(q);
        else if (/\.(cshtml|cs|js)$/.test(f.name)) out.push([path.relative(GOC, q), fs.readFileSync(q, 'utf8')]);
      } };
      try { di(path.join(GOC, d)); } catch (e) { /* thu muc khong co thi thoi */ }
      return out;
    })
    // Va cac khuon trang: cau "Thank you — we have your request..." sau khi gui form nam trong
    // doan script ngay trong khuon trang lien he, khong nam o tep .js nao. Bo qua cac thu muc
    // bat dau bang "_" (tai nguyen, anh, du lieu) - chung lon va khong chua chu cua giao dien.
    .concat((() => {
      const out = [];
      const di = p => { for (const f of fs.readdirSync(p, { withFileTypes: true })) {
        if (f.name.startsWith('_') || f.name === 'admin') continue;
        const q = path.join(p, f.name);
        if (f.isDirectory()) di(q);
        else if (f.name.endsWith('.html')) out.push([path.relative(GOC, q), fs.readFileSync(q, 'utf8')]);
      } };
      di(path.join(GOC, 'wwwroot'));
      return out;
    })());
  // Ma nguon viet "Delete &ldquo;x&rdquo;" va dau nhay thang, huong dan viet dau nhay cong.
  const chuan = s => s.replace(/&ldquo;|&rdquo;|[“”]/g, '"').replace(/&mdash;|—/g, '—');

  const where = l => Object.entries(screens).filter(([, v]) => v.includes(l)).map(([k]) => k);
  const inSource = l => (NGUON.find(([, t]) => chuan(t).includes(chuan(l))) || [])[0];
  let thieu = 0, nguon = 0;
  console.log('');
  for (const l of labels) {
    if (MINH_HOA.has(l) || PHIM.has(l)) continue;
    const w = where(l);
    const s = w.length ? null : inSource(l);
    if (!w.length && !s) thieu++;
    if (s) nguon++;
    const trang = w.length ? 'CO   ' : s ? 'NGUON' : 'THIEU';
    console.log('  ' + trang + '  ' + l.slice(0, 44).padEnd(46) + (w[0] || s || ''));
  }
  console.log('');
  console.log('  CO    = thay tren anh chup man hinh');
  console.log('  NGUON = chi hien trong mot tinh huong (xac nhan, loi, man hinh trong); thay trong ma nguon');
  console.log('');
  console.log(thieu ? '  KHONG DAT - ' + thieu + ' nhan trong huong dan khong co o dau ca'
                    : '  DAT - ca ' + (labels.length) + ' nhan deu co that (' + nguon + ' chi thay trong ma nguon)');
  process.exit(thieu ? 1 : 0);
})();
