// An mot muc co that su bien mat khoi BAN TINH khong.
//
// Man hinh Content hua mot cau: muc bi an "bien khoi moi danh sach, khoi moi con so dem, va
// trang rieng cua no tra 404". May chu giu dung loi hua ay - Arr() loc visible:false o mot cho
// duy nhat. Ban tinh site/ thi KHONG: do duoc, khong mot script danh sach nao trong hai muoi
// tep nhin vao "visible" ca, nen mot muc an trong khu quan tri van cong khai tren GitHub Pages.
// Hai ban noi hai chuyen khac nhau, va khong phep do nao tu bat duoc.
//
// Phep do nay an that mot muc, phuc vu site/ nhu Pages phuc vu no, dem, roi tra lai nguyen van.
//
//   node hidden.js [muc] [cong]
//
// Khong co tham so thi an bai tin dau tien. Cot cuoi cua bang la cau hoi that su: file noi dung
// co tro lai giong het luc bat dau khong.
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');
const { launch, newCtx, wait } = require('./lib/browser');
const { table, heading, verdict } = require('./lib/report');

const ROOT = path.join(__dirname, '..');
const SITE = path.join(ROOT, 'site');
const TREES = [path.join(ROOT, 'wwwroot'), SITE];
const PORT = +(process.argv[3] || 8099);

// Mot muc de an, va cho de dem no. Mac dinh la bai tin dau tien vi /news/ la danh sach phang
// nhat - mot the mot bai, khong nhom, khong loc.
// Lop CSS lay tu chinh build/bodies/*-list.js, khong doan.
const WHAT = {
  news: { doc: 'news', array: 'items', page: '/news/', card: '.ab-post' },
  products: { doc: 'products', array: 'categories', page: '/products/', card: '.ab-band' },
  projects: { doc: 'projects', array: 'albums', page: '/projects/', card: '.ab-album' },
};
const KEY = process.argv[2] || 'news';
const K = WHAT[KEY];
if (!K) { console.log('  Khong biet muc "%s". Chon: %s', KEY, Object.keys(WHAT).join(', ')); process.exit(2); }

const file = tree => path.join(tree, '_data', K.doc + '.json');
const read = tree => fs.readFileSync(file(tree), 'utf8');

/** Phuc vu site/ nhu GitHub Pages phuc vu no: tra file co san, khong ghep gi ca. */
function serve() {
  const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
                  '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg',
                  '.png': 'image/png', '.woff2': 'font/woff2', '.webp': 'image/webp' };
  return http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    const full = path.join(SITE, p);
    if (!full.startsWith(SITE) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('404');
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(full)] || 'application/octet-stream' });
    fs.createReadStream(full).pipe(res);
  }).listen(PORT);
}

const count = (page, base) => page.goto(base + K.page, { waitUntil: 'load', timeout: 30000 })
  .then(() => wait(1200))
  .then(() => page.locator(K.card).count());

(async () => {
  const before = Object.fromEntries(TREES.map(t => [t, read(t)]));
  const out = [];
  let bad = 0;
  const check = (what, ok, detail) => { if (!ok) bad++; out.push([what, ok ? 'dat' : 'KHONG DAT', detail]); };

  const server = serve();
  const base = 'http://127.0.0.1:' + PORT;
  const b = await launch();
  const ctx = await newCtx(b, { width: 1400, height: 1000 });
  const page = await ctx.newPage();

  try {
    const was = await count(page, base);
    // Khong tim thay the nao la BO CHON sai, khong phai "danh sach rong". Khong chan o day thi
    // 0 -> 0 se di qua phep so "now === was - 1" mot cach lang le vao mot ngay nao do.
    if (was === 0) {
      check('doc duoc danh sach truoc khi an', false,
            `${K.page} khong khop the nao voi "${K.card}" - bo chon sai, chua an gi ca`);
      throw new Error('bo chon sai');
    }

    // An muc dau tien, o ca hai cay, dung cach khu quan tri ghi: them "visible": false.
    const doc = JSON.parse(before[TREES[0]]);
    const victim = doc[K.array][0];
    const slug = victim.slug || victim.id;
    for (const tree of TREES) {
      const d = JSON.parse(before[tree]);
      d[K.array][0].visible = false;
      fs.writeFileSync(file(tree), JSON.stringify(d, null, 2) + '\n', 'utf8');
    }
    execFileSync('python', [path.join(__dirname, 'fanout.py')], { encoding: 'utf8' });

    const now = await count(page, base);
    check('an mot muc -> bien khoi danh sach', now === was - 1,
          `${K.page}: ${was} the -> ${now} the (da an "${slug}")`);

    const gone = !fs.existsSync(path.join(SITE, K.page.replace(/^\/|\/$/g, ''), slug, 'index.html'));
    check('trang rieng cua no khong con', gone,
          gone ? `site${K.page}${slug}/ da bi don` : `site${K.page}${slug}/ VAN CON - Google se giu no`);

    const r = await page.goto(base + K.page + slug + '/', { waitUntil: 'load', timeout: 30000 });
    check('duong dan cu tra 404', r.status() === 404, 'HTTP ' + r.status());
  } catch (e) {
    if (e && e.message !== 'bo chon sai') { check('chay tron phep do', false, String(e.message || e)); }
  } finally {
    for (const tree of TREES) fs.writeFileSync(file(tree), before[tree], 'utf8');
    execFileSync('python', [path.join(__dirname, 'fanout.py')], { encoding: 'utf8' });
    await b.close();
    server.close();
  }

  const same = TREES.filter(t => read(t) !== before[t]);
  check('file noi dung tro lai nguyen van', same.length === 0,
        same.length ? 'con lech: ' + same.join(', ') : 'ca hai cay giong het luc bat dau');

  heading('An mot muc, tren ban tinh (' + KEY + ')');
  table(['phep thu', 'ket qua', 'chi tiet'], out);
  console.log('\n  Ban tinh la thu GitHub Pages phuc vu. May chu .NET loc dung tu lau;');
  console.log('  phep do nay hoi ban tinh cung cau hoi ay.');
  verdict(bad === 0, 'an mot muc la no bien mat khoi ban tinh, ca danh sach lan trang rieng');
})();
