// Khung xem truoc cua trinh soan co con dung duoc nhu mot trang web khong.
//
//   node tools/editor-clicks.js            # can may chu .NET dang chay o :5199
//
// Tu 21/09/2026 khung xem truoc doi luat: GIU CTRL roi bam = chon de sua, bam thuong = trang
// chay y nhu that. Sau phep kiem duoi day la sau cach cai do hong, va tung cai deu da hong that
// mot lan trong luc lam:
//
//   - bam thuong van chon (luat cu con sot lai o mot nhanh nao do)
//   - Ctrl+bam khong chon duoc nua (sua qua tay)
//   - chon duoc nhung cot trai khong hien o soan ra
//   - bam lien ket thi khung di mat ?edit=1, cau noi giua hai ben dut, cot trai dung im
//   - khung sang trang moi nhung thanh dia chi va o chon trang van chi trang cu
//   - cot trai khong nap truong cua trang moi
const { launch, newCtx, wait } = require('./lib/browser');
const { signIn } = require('./lib/admin');

(async () => {
  const b = await launch();
  const ctx = await newCtx(b, { width: 1500, height: 950 });
  const p = await ctx.newPage();
  await signIn(p, 'http://localhost:5199');
  await p.goto('http://localhost:5199/Admin?page=%2F', { waitUntil: 'networkidle' });
  await wait(1500);

  const fr = p.frameLocator('iframe');
  const ok = [];
  const say = (n, got, want) => ok.push([n, got === want ? 'DAT' : 'HONG', 'duoc: ' + got]);

  // 1. bam THUONG vao chu sua duoc: khong duoc chon
  const claim = fr.locator('[data-ab-lines="site.home.claim"]');
  await claim.click();
  await wait(500);
  say('bam thuong vao chu -> KHONG chon', await claim.getAttribute('data-ab-on'), null);

  // 2. Ctrl+bam: duoc chon, va o soan hien ra o cot trai
  await claim.click({ modifiers: ['Control'] });
  await wait(700);
  say('Ctrl+bam -> duoc chon', (await claim.getAttribute('data-ab-on')) !== null, true);
  const nhan = await p.locator('#ed-fields').innerText();
  say('Ctrl+bam -> cot trai co o "Home claim"', /Home claim/i.test(nhan), true);

  // 3. bam THUONG vao lien ket: khung chuyen trang, va giu lai ?edit=1
  // Khung xem truoc bi thu nho bang CSS transform, nen Playwright tinh ra phan tu "nam ngoai
  // khung nhin" va khong bam duoc. Ban thu nghiem thi phat su kien thang - van di qua dung cac
  // handler that o edit-bridge.js, la thu dang can kiem.
  await p.frames()[1].evaluate(() => {
    document.querySelector('a[data-nav="products"]')
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
  });
  await wait(2500);
  const url = p.frames().map(f => f.url()).find(u => /localhost:5199\/(products|)\//.test(u) && u !== 'about:blank');
  say('bam thuong vao menu -> khung sang /products/', /\/products\/\?edit=1$/.test(url || ''), true);
  say('cot trai bam theo (?page= doi)', /page=%2Fproducts%2F/.test(p.url()), true);
  const nhan2 = await p.locator('#ed-fields').innerText();
  say('cot trai nap truong cua trang moi', /Product family/i.test(nhan2), true);

  // 4. Ctrl+bam vao ANH NEN cua hero: mo dung o anh cua ho san pham dang duoc chon.
  //
  // Hai cho de hong rieng cho nay: dia chi chi duoc dat SAU khi home.js doc xong products.json
  // (tuc la sau ab:ready dau tien), va anh ve bang CSS chu khong phai the <img>.
  await p.goto('http://localhost:5199/Admin?page=%2F', { waitUntil: 'networkidle' });
  await wait(2000);
  const fr2 = p.frameLocator('iframe');
  const bg = fr2.locator('#abhero-bg');
  say('hero co dia chi anh sau khi trang chay', await bg.getAttribute('data-ab-img'),
      'products.categories.0.image');
  await bg.click({ modifiers: ['Control'], position: { x: 900, y: 120 } });
  await wait(1200);
  const nhan3 = await p.locator('#ed-fields').innerText();
  say('Ctrl+bam anh nen -> hien o chon anh', /Product family #1 image/i.test(nhan3), true);

  // ... va khi doi sang ho khac thi dia chi doi theo
  await p.frames()[1].evaluate(() => {
    document.querySelectorAll('#abhero-words a')[3]
      .dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  });
  await wait(900);
  say('doi ho -> dia chi doi theo', await bg.getAttribute('data-ab-img'),
      'products.categories.3.image');

  // 5. Dong "them/bot muc o dau" - va no phai bam theo khi khung tu doi trang.
  //
  // Man hinh nay sua cai MOT MUC noi; them mot muc la viec cua man hinh Content. Chia tach thi
  // hop ly, nhung nguoi dang dung mau khong co cach nao doan ra man hinh kia ton tai.
  await p.goto('http://localhost:5199/Admin?page=%2Fcolors%2F', { waitUntil: 'networkidle' });
  await wait(1200);
  say('trang Colors -> co dong "them/bot o dau"',
      /Colors/.test(await p.locator('#ed-lists').innerText()), true);
  await p.goto('http://localhost:5199/Admin?page=%2Fcontact%2F', { waitUntil: 'networkidle' });
  await wait(1200);
  say('trang khong phai danh sach -> an dong do', await p.locator('#ed-lists').isHidden(), true);

  // khung tu di sang mot trang co danh sach: dong do phai hien ra
  await p.goto('http://localhost:5199/Admin?page=%2F', { waitUntil: 'networkidle' });
  await wait(1500);
  await p.frames()[1].evaluate(() => {
    document.querySelector('a[data-nav="colors"]')
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
  });
  await wait(2500);
  say('khung tu sang /colors/ -> dong do doi theo',
      /Add, reorder or remove: Colors/.test(await p.locator('#ed-lists').innerText()), true);

  console.log('');
  for (const [n, r, g] of ok) console.log('  ' + r.padEnd(5) + n.padEnd(46) + g);
  console.log('');
  console.log(ok.every(r => r[1] === 'DAT') ? '  DAT - ca ' + ok.length + ' phep kiem' : '  KHONG DAT');
  await b.close();
  process.exit(ok.every(r => r[1] === 'DAT') ? 0 : 1);
})();
