// Doi dia chi (duong dan) cua mot bai tin trong trinh soan, va kiem trung dia chi.
//
//   node tools/news-slug.js          # can may chu .NET dang chay o :5199
//
// 14/10/2026: khach viet bai AAMA de len bai cu press-line-2500, nen link van la
// /news/press-line-2500/ - "link dan no lai ra cai khac". Truoc day khong co o nao de doi dia chi.
// Duong cua khach: Edit pages > mo bai > o "Page address" > Make from the title > Save.
// Cong cu kiem them: go trung dia chi bai khac, go sai dang, lay lai dia chi cu (khong duoc quay
// vong), va dia chi la link cu cua bai khac. Cuoi cung tra tep du lieu ve y het truoc khi chay.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { launch, newCtx, wait } = require('./lib/browser');
const { signIn } = require('./lib/admin');

const BASE = 'http://localhost:5199';
const GOC = path.join(__dirname, '..');
const TEP = ['wwwroot/_data/news.json', 'site/_data/news.json', 'wwwroot/_data/redirects.json', 'site/_data/redirects.json'];
const doc = () => TEP.map(t => fs.readFileSync(path.join(GOC, t)));
const bam = b => b.map(x => crypto.createHash('md5').update(x).digest('hex'));

const ok = [];
const say = (n, got, want) => ok.push([n, JSON.stringify(got) === JSON.stringify(want) ? 'DAT' : 'HONG', 'duoc: ' + JSON.stringify(got)]);
const CU = 'press-line-2500';
const KHAC = 'operator-role';

(async () => {
  const truoc = doc();
  const b = await launch();
  const ctx = await newCtx(b, { width: 1500, height: 950 });
  const p = await ctx.newPage();
  await signIn(p, BASE);
  const o = () => p.locator('#ed-fields input[data-address$=".slug"]');
  const ghi = () => p.locator('#ed-fields input[data-address$=".slug"]').locator('xpath=..').locator('.ed-count');
  const doiTai = async () => { await p.waitForLoadState('networkidle'); await wait(2400); };
  // Lenh chuyen huong doc bang yeu cau rieng: fetch trong trang giau no di (status 0).
  const den = async u => { const r = await p.request.get(u, { maxRedirects: 0 }); return [r.status(), new URL(r.headers().location, BASE).pathname]; };
  const tai = u => p.evaluate(u => fetch(u).then(r => [r.status, new URL(r.url).pathname]), u);
  const luu = async () => { await p.locator('#ed-save').click(); await doiTai(); return p.locator('#ed-save-note').innerText(); };
  const moi = async slug => { await p.goto(BASE + '/Admin/Edit?page=' + encodeURIComponent('/news/' + slug + '/'), { waitUntil: 'networkidle' }); await wait(2500); };

  try {
    await moi(CU);
    say('co o Page address, dang giu dia chi cu', await o().inputValue(), CU);
    // O dia chi thuoc cung bai, nhung nut "Add a photo" phai nam sau than bai, khong nam o day.
    say('nut Add a photo khong roi vao nhom Search result',
      await p.locator('.ed-group:has(input[data-address$=".slug"]) button:has-text("Add a photo")').count(), 0);

    // 1. Trung bai khac: bao ngay khi go
    await o().fill(KHAC);
    say('go trung: bao ngay', /already uses this address/.test(await ghi().innerText()), true);
    // ...va may chu cung tu choi, kem ly do
    const tuChoi = await luu();
    say('luu trung: may chu tu choi, noi ly do', /could not be written: .*already uses this address/.test(tuChoi), true);
    say('luu trung: bai khac van o cho cu', (await tai(BASE + '/news/' + CU + '/'))[0], 200);

    // 2. Sai dang
    await o().fill('AAMA Coating');
    say('go sai dang: bao ngay', /small letters/.test(await ghi().innerText()), true);

    // 3. Lay tu tieu de, roi luu
    await p.locator('button:has-text("Make from the title")').click();
    const moiDc = await o().inputValue();
    say('lay tu tieu de: dung dang duong dan', /^[a-z0-9]+(-[a-z0-9]+)*$/.test(moiDc) && moiDc !== CU, true);
    await luu();
    say('sau khi luu: khung xem chuyen sang dia chi moi', new URL(await p.locator('#ed-frame').getAttribute('src'), BASE).pathname, '/news/' + moiDc + '/');
    say('sau khi luu: thanh dia chi trinh soan cung doi', decodeURIComponent(p.url()).includes('/news/' + moiDc + '/'), true);
    say('dia chi moi: 200', (await tai(BASE + '/news/' + moiDc + '/'))[0], 200);
    say('link cu: chuyen thang sang dia chi moi', await den(BASE + '/news/' + CU + '/'), [301, '/news/' + moiDc + '/']);

    // 4. Link cu cua bai NAY lai lay duoc - va khong quay vong. Trinh duyet nay vua di qua link
    // cu o buoc 3; neu no con giu lenh chuyen huong 301 thi buoc nay quay vong.
    await o().fill(CU);
    await luu();
    say('lay lai dia chi cu: 200, khong quay vong', await tai(BASE + '/news/' + CU + '/'), [200, '/news/' + CU + '/']);
    say('dia chi vua bo: chuyen ve dia chi cu', await den(BASE + '/news/' + moiDc + '/'), [301, '/news/' + CU + '/']);

    // 5. Link cu cua bai KHAC thi khong lay duoc: bang chuyen huong dung truoc moi bai
    await moi(KHAC);
    await o().fill(moiDc);
    const cuKhac = await luu();
    say('link cu cua bai khac: tu choi, noi ly do', /old link that now opens \/news\/press-line-2500\//.test(cuKhac), true);
    say('link cu cua bai khac: van chuyen dung', await den(BASE + '/news/' + moiDc + '/'), [301, '/news/' + CU + '/']);
  } finally {
    await b.close();
    // Tra du lieu ve y het, ca hai cay. Kho noi dung theo doi tep nen doc lai ngay.
    TEP.forEach((t, i) => fs.writeFileSync(path.join(GOC, t), truoc[i]));
  }
  say('don xong: tep du lieu y het truoc khi chay', bam(doc()), bam(truoc));

  console.log('');
  for (const [n, k, d] of ok) console.log('  ' + k.padEnd(5) + n.padEnd(56) + (k === 'DAT' ? '' : d));
  const hong = ok.filter(x => x[1] !== 'DAT').length;
  console.log('');
  console.log(hong ? '  KHONG DAT - ' + hong + ' phep kiem hong' : '  DAT - ca ' + ok.length + ' phep kiem');
  process.exit(hong ? 1 : 0);
})();
