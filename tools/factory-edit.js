// Them duoc mot nha may / kho tu giao dien, va dat duoc no len ban do khong.
//
//   node tools/factory-edit.js          # can may chu .NET dang chay o :5199
//
// Truoc 29/09/2026: Factories khong co nut them, va cham tren ban do KHONG doi duoc - o "province"
// chi la chu. Khach doi ten ca nam nha may, doi tinh thanh "Ha Noi", ma cham van nam o Yen Bai.
// Cong cu nay di dung duong cua khach:
//
//   Content > Factories > Add an item > Edit > go ten > chon "location on the map" > chon "type"
//   = Warehouse > Save
//
// roi tai TRANG CHU CONG KHAI va kiem: diem moi co toa do cua tinh da chon, ghim vuong va dong chu
// giai Warehouse hien ra, con so dem canh tieu de van chi dem nha may, moi the anh deu duoc xep.
// Cuoi cung xoa diem thu va doi chieu tep du lieu - phai y het truoc khi chay.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { launch, newCtx, wait } = require('./lib/browser');
const { signIn } = require('./lib/admin');

const BASE = 'http://localhost:5199';
const GOC = path.join(__dirname, '..');
const TEP = ['wwwroot/_data/factories.json', 'site/_data/factories.json'];
const bam = () => TEP.map(t => crypto.createHash('md5').update(fs.readFileSync(path.join(GOC, t))).digest('hex'));

const ok = [];
const say = (n, got, want) => ok.push([n, JSON.stringify(got) === JSON.stringify(want) ? 'DAT' : 'HONG', 'duoc: ' + JSON.stringify(got)]);
const TEN = 'Kiem thu kho HCM';

(async () => {
  const truoc = bam();
  const soNhaMay = JSON.parse(fs.readFileSync(path.join(GOC, TEP[0]), 'utf8')).sites
    .filter(s => s.visible !== false && s.kind !== 'Warehouse').length;
  const b = await launch();
  const ctx = await newCtx(b, { width: 1440, height: 950 });
  const p = await ctx.newPage();
  p.on('dialog', d => d.accept());
  await signIn(p, BASE);
  const o = a => p.locator('[data-address="' + a + '"]');

  try {
    // 1. Them
    await p.goto(BASE + '/Admin/Collection/Items/factories', { waitUntil: 'networkidle' });
    say('Factories co nut "Add an item"', await p.locator('button:has-text("Add an item")').count(), 1);
    await p.click('text=Add an item');
    await p.waitForLoadState('networkidle');
    const sua = await p.locator('tbody tr').first().locator('a:has-text("Edit")').getAttribute('href');
    await p.goto(BASE + sua, { waitUntil: 'networkidle' });
    await wait(2500);

    // 2. Cac o cua diem moi
    const noi = o('factories.sites.0.place');
    say('diem moi: o vi tri la o chon', await noi.evaluate(e => e.tagName), 'SELECT');
    say('diem moi: chua chon tinh', await noi.inputValue(), '');
    say('diem moi: co 63 tinh + "Not chosen yet"', await noi.locator('option').count(), 64);
    say('diem moi: o loai co Factory / Warehouse',
        await o('factories.sites.0.kind').locator('option').allTextContents(), ['Factory', 'Warehouse']);
    say('diem cu: hien tinh cham dang dung (Yen Bai)', await o('factories.sites.1.place').inputValue(), 'Yen Bai');

    // 3. Dien va luu
    await o('factories.sites.0.name').fill(TEN);
    await noi.selectOption('Ho Chi Minh City');
    await o('factories.sites.0.kind').selectOption('Warehouse');
    await wait(300);
    await p.locator('#ed-save').click();
    await p.waitForLoadState('networkidle');
    await wait(2500);

    const du = JSON.parse(fs.readFileSync(path.join(GOC, TEP[0]), 'utf8')).sites[0];
    say('tep: toa do cua TP.HCM', [du.lat, du.lon], [10.776, 106.701]);
    say('tep: place / kind', [du.place, du.kind], ['Ho Chi Minh City', 'Warehouse']);

    // 4. Trang chu cong khai
    const pub = await ctx.newPage();
    const loi = [];
    pub.on('pageerror', e => loi.push(e.message));
    await pub.goto(BASE + '/', { waitUntil: 'networkidle' });
    await pub.locator('#vfx-c').scrollIntoViewIfNeeded();
    await wait(1800);
    say('trang chu: khong loi JS', loi, []);
    say('trang chu: dem van chi la nha may', await pub.locator('#vfx-tally').innerText(), String(soNhaMay));
    say('trang chu: chu giai Warehouse hien', await pub.locator('#vfx-legend-w').isVisible(), true);
    const the = await pub.evaluate(() => [...document.querySelectorAll('.vfx-card')].map(c => ({
      t: c.querySelector('b').textContent, x: c.style.left, y: c.style.top })));
    say('trang chu: the anh cua kho co mat', the.some(c => c.t === TEN), true);
    say('trang chu: moi the deu duoc xep', the.every(c => c.x !== '' && c.y !== ''), true);
    const html = await pub.content();
    say('trang chu: danh sach dien thoai ghi "Warehouse"', /class="vfx-fkind"[^>]*>Warehouse</.test(html), true);
    await pub.locator('.vfx-stage').screenshot({ path: path.join(GOC, 'tools', 'out', 'factory-map.png') });
    await pub.close();

    // 5. Cua: dia chi la gui thang toi Save
    const cua = await p.evaluate(async () => {
      const token = document.querySelector('input[name=__RequestVerificationToken]').value;
      const gui = async (address, value) => (await (await fetch('/Admin/Edit/Save', {
        method: 'POST', headers: { 'Content-Type': 'application/json', RequestVerificationToken: token },
        body: JSON.stringify([{ address, value }]) })).json()).rejected;
      return [await gui('factories.sites.0.place', 'Hanoi'),
              await gui('factories.sites.0.lat', '10'),
              await gui('factories.sites.0.kind', 'Store'),
              await gui('factories.sites', 'x')];
    });
    say('Save tu choi tinh ngoai danh sach, sua thang toa do, loai la, ghi de ca danh sach', cua,
        [['factories.sites.0.place'], ['factories.sites.0.lat'], ['factories.sites.0.kind'], ['factories.sites']]);
  } finally {
    // 6. Don
    await p.goto(BASE + '/Admin/Collection/Items/factories', { waitUntil: 'networkidle' });
    const dong = p.locator('tbody tr').first();
    const ten = await dong.innerText();
    const h = decodeURIComponent(await dong.locator('a:has-text("Edit")').getAttribute('href'));
    if (ten.includes(TEN) || /new-[0-9a-f]{6}|kiem-thu-kho-hcm/.test(h)) {
      await dong.locator('button:has-text("Delete")').click();
      await p.waitForLoadState('networkidle');
      await p.locator('button:has-text("Yes, delete it")').click();
      await p.waitForLoadState('networkidle');
    }
    await b.close();
  }

  say('don xong: tep du lieu y het truoc khi chay', bam(), truoc);

  console.log('');
  for (const [n, r, g] of ok) console.log('  ' + r.padEnd(5) + n.padEnd(60) + g.slice(0, 70));
  console.log('');
  console.log(ok.every(r => r[1] === 'DAT') ? '  DAT - ca ' + ok.length + ' phep kiem' : '  KHONG DAT');
  process.exit(ok.every(r => r[1] === 'DAT') ? 0 : 1);
})();
