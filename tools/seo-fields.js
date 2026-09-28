// O sua SEO trong trinh soan: co that khong, dung gia tri khong, va luu co toi trang khong.
//
//   node tools/seo-fields.js            # can may chu .NET dang chay o :5199
//
// Phan SEO khac moi thu khac trong trinh soan o mot diem, va do la cho de hong: nhung o nay
// KHONG co tren trang. Moi o khac duoc tim ra bang cach di het markup nhat cac data-ab-*, vi moi
// o khac la mot thu trang hien ra. Tieu de tim kiem thi khong - no nam trong <head>. Nen may chu
// phai dui cho trang mot khoi an, va cau chuyen co sau cho de dut:
//
//   - khoi an khong duoc sinh ra (khong tim duoc dia chi cua muc)
//   - khoi an LOT sang ban tinh, tuc la ai cung tai ve mot khoi rac
//   - o trong khong hien duoc gia tri dang tu sinh, nen khach ghi de ma khong biet minh de len gi
//   - go vao roi luu ma dau trang khong doi
//   - xoa trang o di thi con lai "" trong tep thay vi mat han khoa
//   - luu xong chi mot cay du lieu duoc ghi (loi nay du an nay da mac mot lan, len thang ban that)
//   - TRANG CHU di nham nhanh: no la trang danh sach duy nhat co tieu de khong theo khuon
//     "X | AluminumBoss" va mo ta dai 165 ky tu, nen neu no roi vao duong cua trang MUC thi ca
//     hai deu doi va khong phep kiem nao o cac trang kia thay duoc

const fs = require('fs');
const path = require('path');
const { launch, newCtx, wait } = require('./lib/browser');
const { signIn } = require('./lib/admin');

const BASE = 'http://localhost:5199';
const GOC = path.join(__dirname, '..');
const TIN = '/news/press-line-2500/';
const DIA_CHI = 'news.items.0.seoTitle';

const ok = [];
const say = (n, got, want) => ok.push([n, JSON.stringify(got) === JSON.stringify(want) ? 'DAT' : 'HONG',
                                       'duoc: ' + JSON.stringify(got)]);

// Doc mot khoa trong ca hai cay du lieu.
//
// KHONG tra ve undefined cho khoa vang mat: JSON.stringify bien undefined trong mang thanh null,
// nen "khoa da bien mat" va 'khoa con do voi gia tri null' se so ra bang nhau - ma phan biet dung
// hai cai do la ly do phep kiem nay ton tai.
const VANG = '(khong co khoa)';

function trongTep(tep, duong) {
  return ['wwwroot/_data', 'site/_data'].map(cay => {
    const doc = JSON.parse(fs.readFileSync(path.join(GOC, cay, tep + '.json'), 'utf8'));
    const buoc = duong.split('.');
    let n = doc;
    for (const k of buoc) {
      if (n === null || typeof n !== 'object' || !(k in n)) return VANG;
      n = n[k];
    }
    return n;
  });
}

/** Tai mot trang nhu nguoi xem, tra ve <title> va <meta name=description>. */
async function dauTrang(p, url) {
  const html = await p.evaluate(u => fetch(u).then(r => r.text()), BASE + url);
  const t = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const d = /<meta name="description" content="([^"]*)"/i.exec(html);
  return { title: t ? t[1].trim() : null, desc: d ? d[1] : null };
}

/** Go vao o cua mot dia chi o cot trai, roi bam Save va cho luu xong. */
async function goVaLuu(p, address, value) {
  const o = p.locator('[data-address="' + address + '"]');
  await o.fill(value);
  // `fill` khong phat 'input' theo tung phim nhung co phat mot lan - du cho editor.js danh dau.
  await wait(300);
  await p.locator('#ed-save').click();
  await p.waitForFunction(() => document.getElementById('ed-save').disabled === true,
                          null, { timeout: 15000 });
  await wait(600);
}

/** Mo bang chon anh cua mot o anh, bam o thu `n` (0 = "No picture"), roi luu. */
async function chonAnh(p, address, n = 1) {
  const the = p.locator('.ed-field-img', { has: p.locator('[data-address="' + address + '"]') });
  await the.locator('.ed-choose').click();
  await p.locator('#ed-shelf-list .ed-tile').first().waitFor({ timeout: 15000 });
  await p.locator('#ed-shelf-list .ed-tile').nth(n).click();
  await wait(400);
  await p.locator('#ed-save').click();
  await p.waitForFunction(() => document.getElementById('ed-save').disabled === true,
                          null, { timeout: 15000 });
  await wait(600);
}

(async () => {
  // 1. Cai bay khong ton tai: Pick bo qua chuoi rong chu khong phai khoa ton tai dau tien.
  //
  // Doc thang ma nguon. Day la mot bat bien chu khong phai mot hanh vi go duoc tu ngoai: tu khi
  // ContentEditor XOA khoa luc o bi bo trong, mot "seoTitle": "" khong con duong nao vao tep
  // nua. Nhung neu ai do sua Pick thanh tra ve khoa dau tien CO MAT, thi mot tep du lieu chep
  // tay co chuoi rong se lam trang mat tieu de - va cho nay se bao.
  const ph = fs.readFileSync(path.join(GOC, 'Content/PageHead.cs'), 'utf8');
  say('PageHead.Pick bo qua chuoi rong', /if \(value\.Length > 0\) return value;/.test(ph), true);

  const b = await launch();
  const ctx = await newCtx(b, { width: 1500, height: 950 });
  const p = await ctx.newPage();
  await signIn(p, BASE);

  // 2. Khoi an khong duoc lot sang trang thuong.
  const thuong = await p.evaluate(u => fetch(u).then(r => r.text()), BASE + TIN);
  say('khong ?edit=1 -> khong co khoi SEO', /data-ab-seo/.test(thuong), false);

  // 3. Trang MUC: dung hai o, va o trong mang san gia tri dang tu sinh.
  await p.goto(BASE + '/Admin?page=' + encodeURIComponent(TIN), { waitUntil: 'networkidle' });
  await wait(2000);

  const nhom = p.locator('.ed-group', { has: p.locator('summary', { hasText: 'Search result' }) });
  say('trang muc co nhom "Search result"', await nhom.count(), 1);
  say('nhom mo san', await nhom.getAttribute('open'), '');
  say('trang muc: dung 2 o', await nhom.locator('.ed-field').count(), 2);
  say('nhan o thu nhat', (await nhom.locator('label').first().innerText()).trim(), 'Search title');

  const truoc = await dauTrang(p, TIN);
  const o = p.locator('[data-address="' + DIA_CHI + '"]');
  say('o trong that', await o.inputValue(), '');
  say('o trong mang san tieu de tu sinh', await o.getAttribute('placeholder'), truoc.title);

  // 4. Go vao -> luu -> trang doi, va doi DUNG cai da go (khong ghep them ten site).
  const MOI = 'Press hall two is running at Binh Duong';
  await goVaLuu(p, DIA_CHI, MOI);

  say('luu xong: ca hai cay deu co seoTitle', trongTep('news', 'items.0.seoTitle'), [MOI, MOI]);
  const sau = await dauTrang(p, TIN);
  say('<title> dung bang cai da go, khong ghep duoi', sau.title, MOI);

  // 5. Xoa trang o -> khoa bien mat khoi tep, tieu de quay ve gia tri tu sinh.
  await p.goto(BASE + '/Admin?page=' + encodeURIComponent(TIN), { waitUntil: 'networkidle' });
  await wait(2000);
  await goVaLuu(p, DIA_CHI, '');

  say('xoa trang -> khoa mat han (khong con "" hay null)',
      trongTep('news', 'items.0.seoTitle'), [VANG, VANG]);
  const lai = await dauTrang(p, TIN);
  say('<title> quay ve gia tri tu sinh', lai.title, truoc.title);
  say('mo ta cung quay ve nhu cu', lai.desc, truoc.desc);

  // 6. JSON-LD KHONG duoc chay theo seoTitle.
  //
  // Doi lap voi phep kiem 4 va do la chu y: the <title> duoc phep khac cai in tren trang, con
  // JSON-LD thi khong - no la mot loi khai ve cai DANG CO tren trang. Xem chu thich o
  // StructuredData.Thing. Truoc 25/09/2026 khong ai viet duoc seoTitle nen cau hoi nay chua ton
  // tai; gio thi co, va cho nay giu cau tra loi.
  await p.goto(BASE + '/Admin?page=' + encodeURIComponent(TIN), { waitUntil: 'networkidle' });
  await wait(2000);
  await goVaLuu(p, DIA_CHI, MOI);

  const raw = await p.evaluate(u => fetch(u).then(r => r.text()), BASE + TIN);
  const ld = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(raw);
  const headline = ld && /"headline":"(?:\\u003c)?([^"]*)"/.exec(ld[1]);
  say('JSON-LD giu tieu de that, khong chay theo seoTitle',
      headline && headline[1], 'Second 2,500-tonne press commissioned at Binh Duong');

  await p.goto(BASE + '/Admin?page=' + encodeURIComponent(TIN), { waitUntil: 'networkidle' });
  await wait(2000);
  await goVaLuu(p, DIA_CHI, '');

  // 7. TRANG CHU. Tieu de cua no la cai duy nhat khong theo khuon "X | AluminumBoss", va mo ta
  // dai 165 ky tu - dai hon nguong 160 ma Trim() cat. Neu trang chu di nham sang duong cua trang
  // muc, hoac neu Trim bi ap cho ca gia tri go tay, thi ca hai deu doi ngay o day.
  const chu = await dauTrang(p, '/');
  const [wHome, wHomeDesc] = [trongTep('site', 'seo.home.title')[0],
                              trongTep('site', 'seo.home.description')[0]];
  say('trang chu: <title> dung cai trong site.json', chu.title, wHome);
  say('trang chu: mo ta 165 ky tu KHONG bi cat', chu.desc, wHomeDesc);

  await p.goto(BASE + '/Admin?page=' + encodeURIComponent('/'), { waitUntil: 'networkidle' });
  await wait(2500);
  const nhomChu = p.locator('.ed-group', { has: p.locator('summary', { hasText: 'Search result' }) });
  say('trang chu: co nhom SEO, dung 3 o', await nhomChu.locator('.ed-field').count(), 3);
  say('trang chu: dia chi la site.seo.home.*',
      await p.locator('[data-address="site.seo.home.title"]').count(), 1);

  // 8. Trang DANH SACH: ba o, va gia tri lay tu site.json chu khong phai tu khuon.
  await p.goto(BASE + '/Admin?page=' + encodeURIComponent('/colors/'), { waitUntil: 'networkidle' });
  await wait(2000);

  const nhom2 = p.locator('.ed-group', { has: p.locator('summary', { hasText: 'Search result' }) });
  say('trang danh sach: dung 3 o', await nhom2.locator('.ed-field').count(), 3);
  say('co o anh chia se', await nhom2.locator('[data-address="site.seo.colors.image"]').count(), 1);

  const [wTitle] = trongTep('site', 'seo.colors.title');
  say('o tieu de mang dung gia tri trong site.json',
      await p.locator('[data-address="site.seo.colors.title"]').inputValue(), wTitle);

  // Go roi go lai dung cai cu: duong ghi cua trang danh sach duoc di that, va tep ve nguyen ven.
  await goVaLuu(p, 'site.seo.colors.title', 'Finishes and colours');
  const doi = await dauTrang(p, '/colors/');
  say('trang danh sach: luu xong thi <title> doi', doi.title, 'Finishes and colours');

  await p.goto(BASE + '/Admin?page=' + encodeURIComponent('/colors/'), { waitUntil: 'networkidle' });
  await wait(2000);
  await goVaLuu(p, 'site.seo.colors.title', wTitle);
  say('tra lai gia tri cu: ca hai cay khop', trongTep('site', 'seo.colors.title'), [wTitle, wTitle]);

  // 9. ANH CHIA SE, di het mot vong.
  //
  // O anh la cai duy nhat trong ba o ma khong phep kiem nao o tren cham vao, va no co hai khop
  // rieng khong o nao khac co: the <img> nam trong mot khoi AN nen trinh duyet khong ve no bao
  // gio - `read()` van phai cat duoc ten tep ra khoi src mang tien to "../" - va o anh tren mot
  // trang danh sach khong he duoc trang do ve ra, nen khong co gi de do kich thuoc.
  await chonAnh(p, 'site.seo.colors.image');
  const [tep] = trongTep('site', 'seo.colors.image');
  say('chon anh -> ten tep vao ca hai cay', trongTep('site', 'seo.colors.image'), [tep, tep]);
  say('ten tep khong mang tien to duong dan', /^[^/]+$/.test(String(tep)), true);

  const cAnh = await p.evaluate(u => fetch(u).then(r => r.text()), BASE + '/colors/');
  const og = /<meta property="og:image" content="([^"]*)"/.exec(cAnh);
  // Tuyet doi, dung tu `origin` trong site.json. Phep kiem nay tung doi '../_media/' + tep -
  // tuc la no DOI dung cai loi: Open Graph can dia chi tuyet doi, va mot the tuong doi la mot the
  // chia se khong co anh. Khi ma nguon duoc sua (28/09/2026) thi chinh phep kiem nay la cai do.
  const [goc] = trongTep('site', 'origin');
  say('og:image hien ra tren trang (dia chi tuyet doi)', og && og[1], goc + '/_media/' + tep);

  // Tra lai trang: "No picture" la o dau bang chon.
  await p.goto(BASE + '/Admin?page=' + encodeURIComponent('/colors/'), { waitUntil: 'networkidle' });
  await wait(2000);
  await chonAnh(p, 'site.seo.colors.image', 0);
  say('bo anh -> khoa ve rong', trongTep('site', 'seo.colors.image'), ['', '']);
  const sachAnh = await p.evaluate(u => fetch(u).then(r => r.text()), BASE + '/colors/');
  say('og:image bien mat khoi trang', /og:image/.test(sachAnh), false);

  console.log('');
  for (const [n, r, g] of ok) console.log('  ' + r.padEnd(5) + n.padEnd(52) + g);
  console.log('');
  console.log(ok.every(r => r[1] === 'DAT') ? '  DAT - ca ' + ok.length + ' phep kiem' : '  KHONG DAT');
  await b.close();
  process.exit(ok.every(r => r[1] === 'DAT') ? 0 : 1);
})();
