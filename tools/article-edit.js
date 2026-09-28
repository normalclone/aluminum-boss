// Dang duoc mot bai tin HOAN CHINH tu giao dien khong - di dung duong mot nguoi that di.
//
//   node tools/article-edit.js          # can may chu .NET dang chay o :5199
//
// Truoc 28/09/2026 khong duoc: bai moi chi co sau o, khong co o cho than bai, ngay dang, the, va
// ngay dang cua moi bai (moi hay cu) khong sua duoc o dau ca. Cong cu nay di het mot vong:
//
//   Content > News > Add an item > Edit > go tieu de, tom tat > dat ngay > Add a paragraph (hai
//   lan) > go hai doan > Add a tag > doi thu tu > xoa mot doan > Save
//
// roi tai TRANG CONG KHAI va kiem tung thu mot. Cuoi cung xoa bai di va doi chieu: tep du lieu phai
// y het truoc khi chay. Giua chung con thu go cua bang tay: dia chi la gui toi diem cuoi moi phai bi
// tu choi - man hinh khong phai la cua.
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
const TIEU_DE = 'Kiem thu dang bai tu giao dien';
// The .ed-field BAO QUANH mot o - dung lop "ed-field" nguyen tu, va chi to tien gan nhat. Chi
// contains(@class, "ed-field") thi khop ca cot #ed-fields ben ngoai, va tim ra moi nut Remove
// tren cot - lan chay dau da vap dung cho nay.
const THE = 'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ed-field ")][1]';
const SLUG = 'kiem-thu-dang-bai-tu-giao-dien';

(async () => {
  const truoc = bam();
  const b = await launch();
  const ctx = await newCtx(b, { width: 1500, height: 950 });
  const p = await ctx.newPage();
  // Moi hop hoi cua trinh soan deu la "co" o day - do la cai dang duoc thu.
  p.on('dialog', d => d.accept());
  await signIn(p, BASE);

  const cot = () => p.locator('#ed-fields');
  const o = a => p.locator('[data-address="' + a + '"]');
  const doiTai = async () => { await p.waitForLoadState('networkidle'); await wait(2200); };

  try {
    // 1. Them bai
    await p.goto(BASE + '/Admin/Collection/Items/news', { waitUntil: 'networkidle' });
    await p.click('text=Add an item');
    await p.waitForLoadState('networkidle');
    const sua = await p.locator('tbody tr').first().locator('a:has-text("Edit")').getAttribute('href');
    const tam = /new-[0-9a-f]{6}/.exec(decodeURIComponent(sua))[0];
    await p.goto(BASE + sua, { waitUntil: 'networkidle' });
    await wait(2500);

    say('bai moi: co o ngay dang', await o('news.items.0.date').count(), 1);
    say('bai moi: o ngay la bo chon ngay', await o('news.items.0.date').getAttribute('type'), 'date');
    say('bai moi: co nut "Add a paragraph"', await cot().locator('button:has-text("Add a paragraph")').count(), 1);
    say('bai moi: co nut "Add a tag"', await cot().locator('button:has-text("Add a tag")').count(), 1);

    // 2. Tieu de, tom tat, ngay - roi them doan dau (trinh soan hoi luu truoc, va luu)
    await o('news.items.0.title').fill(TIEU_DE);
    await o('news.items.0.excerpt').fill('Tom tat cua bai kiem thu.');
    await o('news.items.0.date').fill('2026-09-27');
    await o('news.items.0.date').dispatchEvent('change');
    await wait(300);
    await cot().locator('button:has-text("Add a paragraph")').click();
    await doiTai();

    say('luu truoc khi them: dia chi doi thanh tieu de', /\/news\/kiem-thu-dang-bai-tu-giao-dien\//.test(p.frames()[1].url()), true);
    say('doan moi co o, va la o nhieu dong', await o('news.items.0.body.0').evaluate(e => e.tagName), 'TEXTAREA');
    say('con tro dang o doan moi', await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-address')), 'news.items.0.body.0');

    // 3. Hai doan, mot the
    await o('news.items.0.body.0').fill('Doan thu nhat.');
    await wait(200);
    await cot().locator('button:has-text("Add a paragraph")').click();
    await doiTai();
    await o('news.items.0.body.1').fill('Doan thu hai.');
    await wait(200);
    await cot().locator('button:has-text("Add a tag")').click();
    await doiTai();
    await o('news.items.0.tags.0').fill('Thu nghiem');
    await wait(200);

    // 4. Doi thu tu: doan hai len tren (luu truoc, roi doi)
    await o('news.items.0.body.1').locator(THE)
      .locator('button[title^="Move this paragraph up"]').click();
    await doiTai();
    say('doi thu tu: doan hai len dau', await o('news.items.0.body.0').inputValue(), 'Doan thu hai.');

    // 5. Xoa doan "Doan thu nhat." (gio o vi tri 1)
    await o('news.items.0.body.1').locator(THE)
      .locator('button:has-text("Remove")').click();
    await doiTai();
    say('xoa: chi con mot doan', await cot().locator('[data-address^="news.items.0.body."]').count(), 1);

    // 6. Trang cong khai
    const html = await p.evaluate(u => fetch(u).then(r => r.text()), BASE + '/news/' + SLUG + '/');
    say('trang cong khai: ngay "27 September 2026"', /data-ab-value="2026-09-27">27 September 2026</.test(html), true);
    say('trang cong khai: con "Doan thu hai."', html.includes('Doan thu hai.'), true);
    say('trang cong khai: da mat "Doan thu nhat."', html.includes('Doan thu nhat.'), false);
    say('trang cong khai: co the "Thu nghiem"', html.includes('>Thu nghiem<'), true);
    say('trang cong khai: khong mang dau cua trinh soan', /data-ab-list|data-ab-seo/.test(html), false);

    const ds = await p.evaluate(u => fetch(u).then(r => r.text()), BASE + '/news/');
    const thu = [...ds.matchAll(/href="([^"]*\/)"[^>]*class="ab-post|class="ab-post[^"]*"[^>]*href="([^"]*)"/g)];
    const dau = ds.indexOf(SLUG);
    const lanCu = ds.indexOf('press-line-2500');
    say('danh sach tin: bai ngay 27/09 dung TRUOC bai 19/08', dau > 0 && dau < lanCu, true);

    // 7. Cua: dia chi la gui thang toi diem cuoi
    const cua = await p.evaluate(async () => {
      const token = document.querySelector('input[name=__RequestVerificationToken]').value;
      const hoi = async body => (await fetch('/Admin/Edit/List', {
        method: 'POST', headers: { 'Content-Type': 'application/json', RequestVerificationToken: token },
        body: JSON.stringify(body) })).json();
      return [await hoi({ address: 'news.items', op: 'append' }),
              await hoi({ address: 'news.items.0.title', op: 'append' }),
              await hoi({ address: 'products.categories.0.items', op: 'append' })].map(r => r.ok);
    });
    say('diem cuoi tu choi dia chi khong co trong bang', cua, [false, false, false]);

    // 8. Ngay sai gui thang toi Save
    const ngaySai = await p.evaluate(async () => {
      const token = document.querySelector('input[name=__RequestVerificationToken]').value;
      const r = await (await fetch('/Admin/Edit/Save', {
        method: 'POST', headers: { 'Content-Type': 'application/json', RequestVerificationToken: token },
        body: JSON.stringify([{ address: 'news.items.0.date', value: '2026-02-30' }]) })).json();
      return r.rejected;
    });
    say('ngay khong co that bi tu choi', ngaySai, ['news.items.0.date']);
  } finally {
    // 9. Don: xoa bai thu, du buoc nao o tren co hong
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
  for (const [n, r, g] of ok) console.log('  ' + r.padEnd(5) + n.padEnd(52) + g.slice(0, 70));
  console.log('');
  console.log(ok.every(r => r[1] === 'DAT') ? '  DAT - ca ' + ok.length + ' phep kiem' : '  KHONG DAT');
  process.exit(ok.every(r => r[1] === 'DAT') ? 0 : 1);
})();
