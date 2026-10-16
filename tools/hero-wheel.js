// Nut cuon cuoi hero: mau dao, va lan banh xe tren no de doi anh hero.
//
//   node tools/hero-wheel.js [goc]      # mac dinh http://localhost:5199
//
// 16/10/2026 khach yeu cau: nut co mau dao de anh hero mau gi cung noi; re chuot vao vung nay
// roi lan banh xe thi 1 lan lan = 1 lan doi anh. Cong cu nay kiem:
//   - nut tron "difference", net trang
//   - lan xuong: ho ke tiep, anh doi; lan len: quay lai
//   - mot loat su kien lien tiep (ban di cam ung) chi doi MOT lan
//   - trang khong cuon theo
//   - dang re chuot o nut thi khong tu chuyen
//   - khong loi JS
const { launch, newCtx, wait } = require('./lib/browser');

const BASE = (process.argv[2] || 'http://localhost:5199').replace(/\/$/, '');
const ok = [];
const say = (n, got, want) => ok.push([n, JSON.stringify(got) === JSON.stringify(want) ? 'DAT' : 'HONG', 'duoc: ' + JSON.stringify(got)]);
const dang = p => p.evaluate(() => { const a = document.querySelector('#abhero-words a.is-on'); return a ? a.textContent : null; });
const anh = p => p.evaluate(() => document.getElementById('abhero-bg').style.backgroundImage);

(async () => {
  const b = await launch();
  const ctx = await newCtx(b, { width: 1440, height: 900 });
  const p = await ctx.newPage();
  const loi = [];
  p.on('pageerror', e => loi.push(e.message));
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });

  const tat = await p.evaluate(() => [...document.querySelectorAll('#abhero-words a')].map(a => a.textContent));
  const n = tat.length;
  const st = await p.evaluate(() => {
    const s = document.querySelector('.abhero-scroll');
    return [getComputedStyle(s).mixBlendMode, getComputedStyle(s.firstElementChild).borderTopColor];
  });
  say('nut tron mau dao (difference), net trang', st, ['difference', 'rgb(255, 255, 255)']);

  const box = await p.locator('.abhero-scroll').boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await wait(300);
  const dau = await dang(p), anhDau = await anh(p);
  const i0 = tat.indexOf(dau);

  await p.mouse.wheel(0, 100);
  await wait(400);
  say('lan xuong: sang ho ke tiep', await dang(p), tat[(i0 + 1) % n]);
  say('lan xuong: anh nen doi', (await anh(p)) !== anhDau, true);
  say('trang khong cuon theo', await p.evaluate(() => window.scrollY), 0);

  await p.mouse.wheel(0, -100);
  await wait(400);
  say('lan len: quay ve ho truoc', await dang(p), dau);
  say('lan len: anh nen quay ve', await anh(p), anhDau);

  // Ban di cam ung: muoi su kien nho cach nhau 16ms la mot lan vuot
  for (let k = 0; k < 10; k++) { await p.mouse.wheel(0, 12); await wait(16); }
  await wait(400);
  say('mot loat su kien: chi doi mot lan', await dang(p), tat[(i0 + 1) % n]);

  // Lan len tu ho dau tien: vong ve ho cuoi
  await p.evaluate(() => document.querySelector('#abhero-words a[data-i="0"]').dispatchEvent(new MouseEvent('mouseover', { bubbles: true })));
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await wait(300);
  await p.mouse.wheel(0, -100);
  await wait(400);
  say('lan len tu ho dau: vong ve ho cuoi', await dang(p), tat[n - 1]);

  // Dang re chuot o nut: khong tu chuyen
  const giu = await dang(p);
  await wait(4000);
  say('re chuot o nut: khong tu chuyen', await dang(p), giu);

  // Re chuot ra: tu chuyen lai
  await p.mouse.move(1300, 120);
  await wait(3600);
  say('re chuot ra: tu chuyen lai', await dang(p), tat[0]);

  // Lan banh xe o cho khac tren hero: trang cuon nhu thuong
  await p.mouse.wheel(0, 300);
  await wait(500);
  say('lan o cho khac: trang cuon nhu thuong', (await p.evaluate(() => window.scrollY)) > 0, true);

  say('khong loi JS', loi, []);
  await b.close();

  console.log('');
  for (const [nm, k, d] of ok) console.log('  ' + k.padEnd(5) + nm.padEnd(50) + (k === 'DAT' ? '' : d));
  const hong = ok.filter(x => x[1] !== 'DAT').length;
  console.log('');
  console.log(hong ? '  KHONG DAT - ' + hong + ' phep kiem hong' : '  DAT - ca ' + ok.length + ' phep kiem');
  process.exit(hong ? 1 : 0);
})();
