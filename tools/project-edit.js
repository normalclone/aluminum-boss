// Viet duoc mot du an hoan chinh tu giao dien khong - nhu viet mot bai tin, trong bo cuc cu.
//
//   node tools/project-edit.js          # can may chu .NET dang chay o :5199
//
// 08/10/2026: du an moi chi co tieu de va vai o thong so - khong co than bai, va 0 anh, 0 san pham
// ma khong co nut nao de them. Cong cu nay di dung duong cua khach:
//
//   Content > Projects > Add an item > Edit > go tieu de > Add a paragraph > go doan van >
//   Add a photo (hai lan) > go chu thich, chon anh > doi thu tu anh > Add a product > Save
//
// roi tai TRANG CONG KHAI cua du an va kiem tung thu. Cuoi cung xoa du an thu va doi chieu tep
// du lieu - phai y het truoc khi chay.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { launch, newCtx, wait } = require('./lib/browser');
const { signIn } = require('./lib/admin');

const BASE = 'http://localhost:5199';
const GOC = path.join(__dirname, '..');
const TEP = ['wwwroot/_data/projects.json', 'site/_data/projects.json'];
const bam = () => TEP.map(t => crypto.createHash('md5').update(fs.readFileSync(path.join(GOC, t))).digest('hex'));

const ok = [];
const say = (n, got, want) => ok.push([n, JSON.stringify(got) === JSON.stringify(want) ? 'DAT' : 'HONG', 'duoc: ' + JSON.stringify(got)]);
const TEN = 'Kiem thu du an tu giao dien';
const SLUG = 'kiem-thu-du-an-tu-giao-dien';
const THE = 'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ed-field ")][1]';

(async () => {
  const truoc = bam();
  const b = await launch();
  const ctx = await newCtx(b, { width: 1500, height: 950 });
  const p = await ctx.newPage();
  p.on('dialog', d => d.accept());
  await signIn(p, BASE);
  const cot = () => p.locator('#ed-fields');
  const o = a => p.locator('[data-address="' + a + '"]');
  const doiTai = async () => { await p.waitForLoadState('networkidle'); await wait(2400); };
  const nut = t => cot().locator('button:has-text("' + t + '")');

  try {
    // 0. Du an cu cung co nut them doan van (danh sach chua co, se duoc tao)
    await p.goto(BASE + '/Admin/Collection/Items/projects', { waitUntil: 'networkidle' });
    const cu = await p.locator('tbody tr').first().locator('a:has-text("Edit")').getAttribute('href');

    // 1. Them du an
    await p.click('text=Add an item');
    await p.waitForLoadState('networkidle');
    const sua = await p.locator('tbody tr').first().locator('a:has-text("Edit")').getAttribute('href');
    await p.goto(BASE + sua, { waitUntil: 'networkidle' });
    await wait(2500);
    for (const t of ['Add a paragraph', 'Add a photo', 'Add a product'])
      say('du an moi: co nut "' + t + '"', await nut(t).count(), 1);

    // 2. Tieu de, roi doan van (luu truoc, ten thanh dia chi)
    await o('projects.albums.0.title').fill(TEN);
    await o('projects.albums.0.location').fill('Ha Noi');
    await wait(200);
    await nut('Add a paragraph').click();
    await doiTai();
    say('luu truoc khi them: dia chi doi thanh tieu de', new RegExp('/projects/' + SLUG + '/').test(p.frames()[1].url()), true);
    say('doan moi la o nhieu dong, con tro o do', await p.evaluate(() =>
      [document.activeElement.tagName, document.activeElement.getAttribute('data-address')]), ['TEXTAREA', 'projects.albums.0.body.0']);
    await o('projects.albums.0.body.0').fill('Doan mo dau cua du an.');
    await wait(200);

    // 3. Hai anh
    await nut('Add a photo').click();
    await doiTai();
    say('anh moi: con tro o chu thich', await p.evaluate(() => document.activeElement.getAttribute('data-address')), 'projects.albums.0.photos.0.c');
    await o('projects.albums.0.photos.0.c').fill('Anh thu nhat');
    await wait(200);
    await nut('Add a photo').click();
    await doiTai();
    await o('projects.albums.0.photos.1.c').fill('Anh thu hai');
    const oAnh = o('projects.albums.0.photos.1.image').locator(THE);
    await oAnh.locator('.ed-choose').click();
    await wait(1200);
    const tile = p.locator('.ed-tile:not(.is-none)').first();
    const anh = (await tile.innerText()).trim();
    await tile.click();
    await wait(400);

    // 4. Doi thu tu: anh hai len dau. Hang nut cua mot muc nhieu o nam SAU o cuoi cua muc.
    await cot().locator('.ed-listrow[data-entry="projects.albums.0.photos.1"] button[title^="Move this photo up"]').click();
    await doiTai();
    say('doi thu tu: anh hai len dau', await o('projects.albums.0.photos.0.c').inputValue(), 'Anh thu hai');

    // 5. San pham
    await nut('Add a product').click();
    await doiTai();
    await o('projects.albums.0.products.0').fill('Unitised UC160');
    await wait(200);
    await p.locator('#ed-save').click();
    await doiTai();

    // 6. Trang cong khai
    const html = await p.evaluate(u => fetch(u).then(r => r.text()), BASE + '/projects/' + SLUG + '/');
    say('cong khai: tieu de', html.includes('>' + TEN + '</h1>'), true);
    say('cong khai: than bai', /ab-project-body"><p[^>]*>Doan mo dau cua du an\.<\/p>/.test(html), true);
    say('cong khai: anh dau la anh da chon', html.includes('_media/' + anh), true);
    say('cong khai: thu tu anh', html.indexOf('Anh thu hai') < html.indexOf('Anh thu nhat'), true);
    say('cong khai: "2 photographs"', html.includes('2 photographs'), true);
    say('cong khai: san pham', />Unitised UC160<\/span>/.test(html), true);
    say('cong khai: khong mang dau trinh soan', /data-ab-list/.test(html), false);

    // 7. Du an cu
    await p.goto(BASE + cu, { waitUntil: 'networkidle' });
    await p.waitForSelector('#ed-fields [data-address*=".products."]', { timeout: 15000 }).catch(() => {});
    await wait(800);
    // Truoc 08/10/2026 nut Edit o moi dong tru dong dau mo trang Home (o chon trang chi co muc
    // dau tien cua moi loai). Du an thu dang o dong dau, nen du an cu nay o dong hai.
    say('du an cu (dong hai): trinh soan mo dung trang', /\/projects\/[^/]+\/\?edit=1/.test(p.frames()[1].url()), true);
    say('du an cu: co nut "Add a paragraph"', await nut('Add a paragraph').count(), 1);
    say('du an cu: moi san pham mot o', await cot().locator('[data-address^="projects.albums."][data-address*=".products."]').count() > 0, true);

    // 8. Cua
    const cua = await p.evaluate(async () => {
      const token = document.querySelector('input[name=__RequestVerificationToken]').value;
      const hoi = async body => (await (await fetch('/Admin/Edit/List', {
        method: 'POST', headers: { 'Content-Type': 'application/json', RequestVerificationToken: token },
        body: JSON.stringify(body) })).json()).ok;
      return [await hoi({ address: 'projects.albums', op: 'append' }),
              await hoi({ address: 'projects.albums.0.title', op: 'append' }),
              await hoi({ address: 'projects.albums.0.photos.0.c', op: 'remove' })];
    });
    say('diem cuoi tu choi dia chi ngoai bang', cua, [false, false, false]);
  } finally {
    await p.goto(BASE + '/Admin/Collection/Items/projects', { waitUntil: 'networkidle' });
    const dong = p.locator('tbody tr').first();
    const h = decodeURIComponent(await dong.locator('a:has-text("Edit")').getAttribute('href'));
    if (h.includes(SLUG) || /new-[0-9a-f]{6}/.test(h)) {
      await dong.locator('button:has-text("Delete")').click();
      await p.waitForLoadState('networkidle');
      await p.locator('button:has-text("Yes, delete it")').click();
      await p.waitForLoadState('networkidle');
    }
    await b.close();
  }

  say('don xong: tep du lieu y het truoc khi chay', bam(), truoc);
  console.log('');
  for (const [n, r, g] of ok) console.log('  ' + r.padEnd(5) + n.padEnd(52) + g.slice(0, 70));
  console.log('');
  console.log(ok.every(r => r[1] === 'DAT') ? '  DAT - ca ' + ok.length + ' phep kiem' : '  KHONG DAT');
  process.exit(ok.every(r => r[1] === 'DAT') ? 0 : 1);
})();
