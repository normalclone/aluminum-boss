// Tai PDF theo co tep: tep vua (12 MB) duoc nhan, tep qua 40 MB bi tu choi bang mot cau ro rang.
//
//   node tools/pdf-size-check.js [origin] [tep-lon.pdf]
//     origin mac dinh http://localhost:5199 (dang nhap bang tai khoan thu cua tools/lib/admin.js)
//     tep-lon mac dinh ../BossGroup Company Profile (1).pdf (264 MB, ho so goc cua khach)
//
// 12/10/2026: khach tai ho so 264 MB len va chi thay "The upload did not finish." - nginx tu choi
// tep (413) bang mot trang HTML, va trinh soan khong doc duoc cau nao tu trang do.
// Cong cu KHONG bam Save: tep thu duoc xoa khoi _docs khi xong, noi dung khong doi.
const fs = require('fs');
const path = require('path');
const { launch, newCtx, wait } = require('./lib/browser');
const { signIn } = require('./lib/admin');

const BASE = (process.argv[2] || 'http://localhost:5199').replace(/\/$/, '');
const LON = process.argv[3] || path.join(__dirname, '..', '..', 'BossGroup Company Profile (1).pdf');
const VUA = path.join(__dirname, 'out', 'thu-12mb.pdf');
const DOCS = path.join(__dirname, '..', 'wwwroot', '_docs');
const DIA_CHI = 'about.chapters.1.file';

let hong = 0;
const say = (ten, co, mong) => {
  const ok = JSON.stringify(co) === JSON.stringify(mong);
  if (!ok) hong++;
  console.log('  ' + (ok ? 'DAT ' : 'HONG') + '  ' + ten.padEnd(50) + (ok ? '' : ' duoc: ' + JSON.stringify(co)));
};

(async () => {
  for (const f of [VUA, LON]) if (!fs.existsSync(f)) { console.error('  khong co tep ' + f); process.exit(1); }
  const b = await launch();
  const ctx = await newCtx(b, { width: 1500, height: 950 });
  const p = await ctx.newPage();
  await signIn(p, BASE);
  let ten = '';
  try {
    await p.goto(BASE + '/Admin?page=' + encodeURIComponent('/about-us/capability/'), { waitUntil: 'networkidle' });
    await wait(2500);
    const o = p.locator('[data-address="' + DIA_CHI + '"]').locator('xpath=..');
    const chon = o.locator('input[type=file]');
    const trang = () => o.locator('.ed-slot').innerText();

    // 1. Tep qua 40 MB: tu choi ngay trong trinh duyet, khong gui gi len may chu
    let gui = 0;
    p.on('request', r => { if (r.url().includes('/UploadDocument')) gui++; });
    await chon.setInputFiles(LON);
    await wait(800);
    const cau = await trang();
    say('tep lon: cau bao co so MB va gioi han 40 MB', /is \d+(\.\d)? MB\. The limit is 40 MB\./.test(cau), true);
    say('tep lon: khong gui len may chu', gui, 0);

    // 2. Tep 12 MB: duoc nhan
    await chon.setInputFiles(VUA);
    await p.waitForFunction(a => /Uploaded|could not|did not|limit/.test(
      document.querySelector('[data-address="' + a + '"]').parentElement.querySelector('.ed-slot').innerText), DIA_CHI, { timeout: 120000 });
    say('tep 12 MB: tai len xong', await trang(), 'Uploaded. Press Save to use it.');
    ten = await p.locator('[data-address="' + DIA_CHI + '"]').inputValue();
    say('tep 12 MB: ten moi co ma bam', /^thu-12mb-[0-9a-f]{6}\.pdf$/.test(ten), true);
    const tai = await p.evaluate(async u => { const r = await fetch(u); const t = await r.arrayBuffer(); return [r.status, t.byteLength]; }, BASE + '/_docs/' + ten);
    say('tep 12 MB: tai ve dung kich thuoc', tai, [200, fs.statSync(VUA).size]);
  } finally {
    await b.close();
    // Chi xoa duoc khi chay tren may nay; tren may chu that, tep thu nam lai trong _docs.
    if (ten && BASE.includes('localhost')) try { fs.unlinkSync(path.join(DOCS, ten)); } catch (e) { /* khong co thi thoi */ }
  }
  console.log('');
  console.log(hong ? '  KHONG DAT - ' + hong + ' phep kiem hong' : '  DAT - ca 5 phep kiem');
  process.exit(hong ? 1 : 0);
})();
