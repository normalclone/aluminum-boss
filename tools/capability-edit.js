// Trang Capability: cac muc tu ho so cong ty hien du, va khach sua/them/bot duoc tu trinh soan.
//
//   node tools/capability-edit.js [goc]     # mac dinh http://localhost:5199
//
// 08/10/2026: noi dung "BossGroup Company Profile" (PDF 29 trang) dua vao trang Capability thanh
// cac muc: tieu de, chu, anh (tools/capability-from-profile.py). Cong cu nay kiem:
//
//   - trang cong khai: du 9 muc, moi anh tai duoc, nut tai ho so tro toi PDF that, khong loi JS,
//     o be ngang dien thoai trang khong cuon ngang
//   - trinh soan (chi tren may lam viec): co nut Add a section / Add a photo; them mot muc, go tieu
//     de, them mot anh, roi Remove muc do - tep about.json phai y het truoc khi chay
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { launch, newCtx, wait } = require('./lib/browser');
const { signIn } = require('./lib/admin');

const BASE = (process.argv[2] || 'http://localhost:5199').replace(/\/$/, '');
const LOCAL = /localhost|127\.0\.0\.1/.test(BASE);
const GOC = path.join(__dirname, '..');
const TEP = ['wwwroot/_data/about.json', 'site/_data/about.json'];
const bam = () => TEP.map(t => crypto.createHash('md5').update(fs.readFileSync(path.join(GOC, t))).digest('hex'));

const ok = [];
const say = (n, got, want) => ok.push([n, JSON.stringify(got) === JSON.stringify(want) ? 'DAT' : 'HONG', 'duoc: ' + JSON.stringify(got)]);

(async () => {
  const truoc = LOCAL ? bam() : null;
  const b = await launch();

  // ---- trang cong khai
  const c1 = await newCtx(b, { width: 1440, height: 900 });
  const pub = await c1.newPage();
  const loi = [];
  pub.on('pageerror', e => loi.push(e.message));
  await pub.goto(BASE + '/about-us/capability/', { waitUntil: 'networkidle' });
  const muc = await pub.evaluate(() => [...document.querySelectorAll('.ab-capsec h2')].map(h => h.textContent));
  say('du 9 muc, muc dau la Extrusion, muc cuoi la Certificates',
      [muc.length, muc[0], muc[muc.length - 1]], [9, 'Aluminum Extrusion Systems', 'Certificates']);
  const anh = await pub.evaluate(async () => {
    const srcs = [...document.querySelectorAll('.ab-capfig img')].map(i => i.src);
    const hong = [];
    for (const s of srcs) { const r = await fetch(s); if (!r.ok) hong.push(s); }
    return [srcs.length, hong];
  });
  say('27 anh, khong anh nao hong', anh, [27, []]);
  const tai = await pub.evaluate(async () => {
    const a = document.querySelector('.ab-capdl a');
    if (!a) return null;
    const r = await fetch(a.href);
    const head = new TextDecoder().decode((await r.arrayBuffer()).slice(0, 5));
    return [r.status, head];
  });
  say('nut tai ho so cong ty tro toi PDF that', tai, [200, '%PDF-']);
  say('khong loi JS', loi, []);
  await pub.setViewportSize({ width: 390, height: 844 });
  await wait(400);
  say('be ngang dien thoai: khong cuon ngang', await pub.evaluate(() => document.documentElement.scrollWidth <= 390), true);
  await c1.close();

  // ---- trinh soan (chi may lam viec: no ghi vao tep)
  if (LOCAL) {
    const ctx = await newCtx(b, { width: 1500, height: 950 });
    const p = await ctx.newPage();
    p.on('dialog', d => d.accept());
    await signIn(p, BASE);
    const cot = () => p.locator('#ed-fields');
    const o = a => p.locator('[data-address="' + a + '"]');
    const doiTai = async () => { await p.waitForLoadState('networkidle'); await wait(2400); };
    const chuong = JSON.parse(fs.readFileSync(path.join(GOC, TEP[0]), 'utf8')).chapters.findIndex(c => c.id === 'capability');
    const goc = 'about.chapters.' + chuong + '.sections';
    let them = false;
    try {
      await p.goto(BASE + '/Admin?page=%2Fabout-us%2Fcapability%2F', { waitUntil: 'networkidle' });
      await wait(2500);
      say('trinh soan: nut "Add a section"', await cot().locator('button[data-list="' + goc + '"]').count(), 1);
      say('trinh soan: moi muc co nut "Add a photo"', await cot().locator('button.ed-add:has-text("Add a photo")').count(), 9);
      say('trinh soan: o PDF cua chuong', await o('about.chapters.' + chuong + '.file').count(), 1);

      await cot().locator('button[data-list="' + goc + '"]').click();
      await doiTai();
      them = true;
      say('muc moi: con tro o tieu de', await p.evaluate(() => document.activeElement.getAttribute('data-address')), goc + '.9.heading');
      say('muc moi: o chu la o nhieu dong', await o(goc + '.9.text').evaluate(e => e.tagName), 'TEXTAREA');
      await o(goc + '.9.heading').fill('Muc thu');
      await wait(200);
      await cot().locator('button[data-list="' + goc + '.9.photos"]').click();
      await doiTai();
      say('anh moi trong muc moi: con tro o chu thich', await p.evaluate(() => document.activeElement.getAttribute('data-address')), goc + '.9.photos.0.c');
      const html = await p.evaluate(u => fetch(u).then(r => r.text()), BASE + '/about-us/capability/');
      say('cong khai: muc moi hien', html.includes('>Muc thu</h2>'), true);
    } finally {
      if (them) {
        await p.goto(BASE + '/Admin?page=%2Fabout-us%2Fcapability%2F', { waitUntil: 'networkidle' });
        await wait(2500);
        await cot().locator('.ed-listrow[data-entry="' + goc + '.9"] button:has-text("Remove")').click();
        await doiTai();
      }
      await ctx.close();
    }
  }

  await b.close();
  if (LOCAL) say('don xong: tep du lieu y het truoc khi chay', bam(), truoc);
  console.log('');
  for (const [k, r, g] of ok) console.log('  ' + r.padEnd(5) + k.padEnd(56) + g.slice(0, 70));
  console.log('');
  console.log(ok.every(r => r[1] === 'DAT') ? '  DAT - ca ' + ok.length + ' phep kiem' : '  KHONG DAT');
  process.exit(ok.every(r => r[1] === 'DAT') ? 0 : 1);
})();
