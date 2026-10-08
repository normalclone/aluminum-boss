// Them duoc mot tai lieu tu giao dien khong - va tai PDF cua no len.
//
//   node tools/document-edit.js         # can may chu .NET dang chay o :5199
//
// 08/10/2026: man hinh Content chi them duoc NHOM tai lieu, khong them duoc tai lieu; va tep PDF
// la _docs/<ma>.pdf dat bang tay. Cong cu nay di dung duong cua khach:
//
//   Edit pages > Documents > Add a document (o nhom Catalogues) > go tieu de, mo ta >
//   Upload a PDF > Save
//
// roi tai trang /documents/ va trang rieng cua tai lieu, va tai chinh tep PDF. Cuoi cung xoa tai
// lieu thu bang nut Remove, xoa tep PDF thu, va doi chieu tep du lieu - phai y het truoc khi chay.
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { launch, newCtx, wait } = require('./lib/browser');
const { signIn } = require('./lib/admin');

const BASE = 'http://localhost:5199';
const GOC = path.join(__dirname, '..');
const TEP = ['wwwroot/_data/documents.json', 'site/_data/documents.json'];
const bam = () => TEP.map(t => crypto.createHash('md5').update(fs.readFileSync(path.join(GOC, t))).digest('hex'));

const ok = [];
const say = (n, got, want) => ok.push([n, JSON.stringify(got) === JSON.stringify(want) ? 'DAT' : 'HONG', 'duoc: ' + JSON.stringify(got)]);
const TEN = 'Kiem thu tai lieu tu giao dien';
const SLUG = 'kiem-thu-tai-lieu-tu-giao-dien';

(async () => {
  const truoc = bam();
  const docsTruoc = new Set(fs.readdirSync(path.join(GOC, 'wwwroot/_docs')));
  // Mot PDF that, nho: mot trang trang, du de trinh duyet va may chu deu nhan la PDF.
  const pdf = path.join(os.tmpdir(), 'kiem-thu-tai-lieu.pdf');
  fs.writeFileSync(pdf, '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\n' +
    'trailer<</Root 1 0 R>>\n%%EOF\n');
  const sai = path.join(os.tmpdir(), 'khong-phai-pdf.pdf');
  fs.writeFileSync(sai, 'day khong phai la pdf');

  const b = await launch();
  const ctx = await newCtx(b, { width: 1500, height: 950 });
  const p = await ctx.newPage();
  p.on('dialog', d => d.accept());
  await signIn(p, BASE);
  const cot = () => p.locator('#ed-fields');
  const o = a => p.locator('[data-address="' + a + '"]');
  const doiTai = async () => { await p.waitForLoadState('networkidle'); await wait(2400); };
  const them = cot().locator('button[data-list="documents.categories.0.items"]');
  let n = -1;

  try {
    await p.goto(BASE + '/Admin?page=%2Fdocuments%2F', { waitUntil: 'networkidle' });
    await wait(2500);
    say('moi nhom co nut "Add a document"', await cot().locator('button.ed-add:has-text("Add a document")').count() >= 5, true);
    n = await cot().locator('[data-address^="documents.categories.0.items."][data-address$=".title"]').count();

    // 1. Them, roi go tieu de va mo ta
    await them.click();
    await doiTai();
    const goc = 'documents.categories.0.items.' + n;
    say('con tro o tieu de tai lieu moi', await p.evaluate(() => document.activeElement.getAttribute('data-address')), goc + '.title');
    await o(goc + '.title').fill(TEN);
    await o(goc + '.blurb').fill('Mo ta cua tai lieu thu.');

    // 2. Tai PDF: tep sai bi tu choi, tep dung duoc nhan
    const chon = o(goc + '.file').locator('xpath=..').locator('input[type=file]');
    await chon.setInputFiles(sai);
    await wait(1200);
    say('tep khong phai PDF bi tu choi', await o(goc + '.file').locator('xpath=..').locator('.ed-slot').innerText(),
        'That file is not a PDF, whatever its name says.');
    await chon.setInputFiles(pdf);
    await wait(1500);
    const ten = await o(goc + '.file').inputValue();
    say('PDF duoc nhan, ten co ma bam', /^kiem-thu-tai-lieu-[0-9a-f]{6}\.pdf$/.test(ten), true);
    await p.locator('#ed-save').click();
    await doiTai();

    // 3. Trang cong khai
    const ds = await p.evaluate(u => fetch(u).then(r => r.text()), BASE + '/documents/');
    say('/documents/: co tai lieu moi', ds.includes('>' + TEN + '<'), true);
    say('/documents/: nut Download tro toi PDF da tai', ds.includes('href="../_docs/' + ten + '" download') || ds.includes('href="_docs/' + ten + '" download') || ds.includes('_docs/' + ten), true);
    const ct = await p.evaluate(u => fetch(u).then(r => r.status), BASE + '/documents/' + SLUG + '/');
    say('trang rieng cua tai lieu', ct, 200);
    const tai = await p.evaluate(async u => { const r = await fetch(u); const t = await r.text(); return [r.status, t.slice(0, 5)]; }, BASE + '/_docs/' + ten);
    say('tep PDF tai duoc', tai, [200, '%PDF-']);
    say('tai lieu cu van tro toi <ma>.pdf', ds.includes('_docs/cat-profile-2026.pdf'), true);
  } finally {
    // Don: Remove tai lieu thu bang chinh nut cua trinh soan, roi xoa tep PDF thu.
    try {
      await p.goto(BASE + '/Admin?page=%2Fdocuments%2F', { waitUntil: 'networkidle' });
      await wait(2500);
      const hang = cot().locator('.ed-listrow[data-entry="documents.categories.0.items.' + n + '"] button:has-text("Remove")');
      const tieuDe = n >= 0 ? await o('documents.categories.0.items.' + n + '.title').inputValue().catch(() => '') : '';
      if (n >= 0 && (tieuDe === TEN || tieuDe === '') && await hang.count()) {
        await hang.click();
        await doiTai();
      }
    } catch (e) { console.log('  don: ' + e.message.split('\n')[0]); }
    for (const f of fs.readdirSync(path.join(GOC, 'wwwroot/_docs')))
      if (!docsTruoc.has(f)) fs.unlinkSync(path.join(GOC, 'wwwroot/_docs', f));
    await b.close();
  }

  say('don xong: tep du lieu y het truoc khi chay', bam(), truoc);
  console.log('');
  for (const [k, r, g] of ok) console.log('  ' + r.padEnd(5) + k.padEnd(52) + g.slice(0, 70));
  console.log('');
  console.log(ok.every(r => r[1] === 'DAT') ? '  DAT - ca ' + ok.length + ' phep kiem' : '  KHONG DAT');
  process.exit(ok.every(r => r[1] === 'DAT') ? 0 : 1);
})();
