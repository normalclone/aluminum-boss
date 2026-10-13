// Mot bai tin co them duoc nhieu anh khong, ngoai anh lon dau bai.
//
//   node tools/news-photos.js          # can may chu .NET dang chay o :5199
//
// 13/10/2026: khach hoi "moi bai chi up duoc 1 anh thoi a, muon them anh thi chon cho nao".
// Duong cua khach: Content > News > Add an item > Edit > go tieu de > Add a photo (hai lan) >
// go chu thich, chon anh > doi thu tu > Save, roi tai TRANG CONG KHAI cua bai va kiem.
// Cuoi cung xoa bai thu va doi chieu tep du lieu - phai y het truoc khi chay.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { launch, newCtx, wait } = require('./lib/browser');
const { signIn } = require('./lib/admin');

const BASE = 'http://localhost:5199';
const GOC = path.join(__dirname, '..');
const TEP = ['wwwroot/_data/news.json', 'site/_data/news.json'];
const bam = () => TEP.map(t => crypto.createHash('md5').update(fs.readFileSync(path.join(GOC, t))).digest('hex'));

const ok = [];
const say = (n, got, want) => ok.push([n, JSON.stringify(got) === JSON.stringify(want) ? 'DAT' : 'HONG', 'duoc: ' + JSON.stringify(got)]);
const TEN = 'Kiem thu anh trong bai tin';
const SLUG = 'kiem-thu-anh-trong-bai-tin';
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
  let dc = '';

  try {
    // 0. Bai cu cung co nut (danh sach chua co, se duoc tao)
    await p.goto(BASE + '/Admin/Edit?page=' + encodeURIComponent('/news/press-line-2500/'), { waitUntil: 'networkidle' });
    await wait(2500);
    say('bai cu: co nut "Add a photo"', await nut('Add a photo').count(), 1);

    // 1. Them bai
    await p.goto(BASE + '/Admin/Collection/Items/news', { waitUntil: 'networkidle' });
    await p.click('text=Add an item');
    await p.waitForLoadState('networkidle');
    const sua = await p.locator('tbody tr').first().locator('a:has-text("Edit")').getAttribute('href');
    await p.goto(BASE + sua, { waitUntil: 'networkidle' });
    await wait(2500);
    dc = (await cot().locator('[data-address^="news.items."][data-address$=".title"]').first().getAttribute('data-address')).replace(/\.title$/, '');
    await o(dc + '.title').fill(TEN);
    await wait(200);

    // 2. Hai anh
    await nut('Add a photo').click();
    await doiTai();
    say('anh moi: con tro o chu thich', await p.evaluate(() => document.activeElement.getAttribute('data-address')), dc + '.photos.0.c');
    await o(dc + '.photos.0.c').fill('Anh thu nhat');
    await wait(200);
    await nut('Add a photo').click();
    await doiTai();
    await o(dc + '.photos.1.c').fill('Anh thu hai');
    await o(dc + '.photos.1.image').locator(THE).locator('.ed-choose').click();
    await wait(1200);
    const tile = p.locator('.ed-tile:not(.is-none)').first();
    const anh = (await tile.innerText()).trim();
    await tile.click();
    await wait(400);

    // 3. Doi thu tu: anh hai len dau
    await cot().locator('.ed-listrow[data-entry="' + dc + '.photos.1"] button[title^="Move this photo up"]').click();
    await doiTai();
    say('doi thu tu: anh hai len dau', await o(dc + '.photos.0.c').inputValue(), 'Anh thu hai');
    // Doi thu tu da luu het phan dang go, nen nut Save co the dang tat - khong co gi de luu.
    if (await p.locator('#ed-save').isEnabled()) { await p.locator('#ed-save').click(); await doiTai(); }

    // 4. Trang cong khai
    const html = await p.evaluate(u => fetch(u).then(r => r.text()), BASE + '/news/' + SLUG + '/');
    say('cong khai: tieu de', html.includes(TEN), true);
    say('cong khai: hai khung anh trong bai', (html.match(/class="ab-newsfig"/g) || []).length, 2);
    say('cong khai: anh da chon', html.includes('_media/' + anh), true);
    say('cong khai: chu thich', html.includes('>Anh thu hai</figcaption>'), true);
    say('cong khai: thu tu anh', html.indexOf('Anh thu hai') < html.indexOf('Anh thu nhat'), true);
    say('cong khai: khong mang dau trinh soan', /data-ab-list/.test(html), false);
  } finally {
    await p.goto(BASE + '/Admin/Collection/Items/news', { waitUntil: 'networkidle' });
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
  for (const [n, k, d] of ok) console.log('  ' + k.padEnd(5) + n.padEnd(48) + (k === 'DAT' ? '' : d));
  const hong = ok.filter(x => x[1] !== 'DAT').length;
  console.log('');
  console.log(hong ? '  KHONG DAT - ' + hong + ' phep kiem hong' : '  DAT - ca ' + ok.length + ' phep kiem');
  process.exit(hong ? 1 : 0);
})();
