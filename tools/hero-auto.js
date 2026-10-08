// Hero trang chu tu chuyen sang ho san pham ke tiep - va dung lai dung luc.
//
//   node tools/hero-auto.js [goc]       # mac dinh http://localhost:5199
//
// 07/10/2026 khach hoi: hero chua tu chuyen ("de khach vao la tu thay cac hang muc, giong web
// kia"). Cong cu nay do trong trinh duyet that, theo dong ho that:
//
//   - tu chuyen sau ~3 giay (08/10/2026; truoc la 6), va thanh duoi chu dang sang la mot hoat anh dang chay
//   - dung khi re chuot vao cac chu; chay lai khi re ra
//   - dung khi da cuon khoi hero
//   - khong tu chuyen trong trinh soan (?edit=1), va voi may bat "giam chuyen dong"
//   - khong loi JS
const { launch, newCtx, wait } = require('./lib/browser');

const BASE = (process.argv[2] || 'http://localhost:5199').replace(/\/$/, '');
const ok = [];
const say = (n, got, want) => ok.push([n, JSON.stringify(got) === JSON.stringify(want) ? 'DAT' : 'HONG', 'duoc: ' + JSON.stringify(got)]);
const dang = p => p.evaluate(() => {
  const a = document.querySelector('#abhero-words a.is-on');
  return a ? a.textContent : null;
});

(async () => {
  const b = await launch();
  const ctx = await newCtx(b, { width: 1440, height: 900 });
  const p = await ctx.newPage();
  const loi = [];
  p.on('pageerror', e => loi.push(e.message));
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  await p.mouse.move(1300, 120);                 // chuot o xa cac chu
  await wait(400);

  const tat = await p.evaluate(() => [...document.querySelectorAll('#abhero-words a')].map(a => a.textContent));
  const dau = await dang(p);
  say('co tu 2 ho tro len', tat.length > 1, true);
  say('hero o che do tu chuyen', await p.evaluate(() => document.getElementById('abhero').classList.contains('is-auto')), true);
  say('thanh duoi chu dang sang la hoat anh abhero-fill', await p.evaluate(() =>
    getComputedStyle(document.querySelector('#abhero-words a.is-on'), '::after').animationName), 'abhero-fill');

  await wait(3600);
  const sau = await dang(p);
  say('sau ~3 giay: sang ho ke tiep', sau, tat[(tat.indexOf(dau) + 1) % tat.length]);
  const anh = await p.evaluate(() => document.getElementById('abhero-bg').style.backgroundImage);
  say('anh nen doi theo', /_media\//.test(anh), true);

  // re chuot vao chu thu ba: chon no, va giu nguyen
  const chu3 = p.locator('#abhero-words a').nth(2);
  await chu3.hover();
  await wait(7000);
  say('re chuot vao chu: dung lai o chu do', await dang(p), tat[2]);

  await p.mouse.move(1300, 120);
  await wait(3600);
  say('re chuot ra: chay tiep', await dang(p), tat[3 % tat.length]);

  // cuon khoi hero
  await p.evaluate(() => window.scrollTo(0, document.getElementById('abhero').offsetHeight * 1.5));
  await wait(600);
  const luc = await dang(p);
  await wait(7000);
  say('da cuon khoi hero: dung lai', await dang(p), luc);
  say('khong loi JS', loi, []);
  await ctx.close();

  // trinh soan
  const c2 = await newCtx(b, { width: 1440, height: 900 });
  const p2 = await c2.newPage();
  await p2.goto(BASE + '/?edit=1', { waitUntil: 'networkidle' });
  await p2.mouse.move(1300, 120);
  const e0 = await dang(p2);
  await wait(7000);
  say('?edit=1: khong tu chuyen', await dang(p2), e0);
  await c2.close();

  // giam chuyen dong
  const c3 = await newCtx(b, { width: 1440, height: 900 });
  const p3 = await c3.newPage();
  await p3.emulateMedia({ reducedMotion: 'reduce' });
  await p3.goto(BASE + '/', { waitUntil: 'networkidle' });
  await p3.mouse.move(1300, 120);
  const r0 = await dang(p3);
  await wait(7000);
  say('giam chuyen dong: khong tu chuyen', await dang(p3), r0);
  await c3.close();

  await b.close();
  console.log('');
  for (const [n, r, g] of ok) console.log('  ' + r.padEnd(5) + n.padEnd(52) + g.slice(0, 70));
  console.log('');
  console.log(ok.every(r => r[1] === 'DAT') ? '  DAT - ca ' + ok.length + ' phep kiem' : '  KHONG DAT');
  process.exit(ok.every(r => r[1] === 'DAT') ? 0 : 1);
})();
