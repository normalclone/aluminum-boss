// Ghi toan bo site da ghep ra mot thu muc tinh, va chung minh no giong may chu.
//
// Mot ban sao tinh de sao luu, va de tra loi mot cau hoi that: neu ngay mai khong con may chu
// nua thi con lai gi. Cau tra loi phai la "mot thu muc mo bang trinh duyet la chay".
//
// KHONG ghi vao site/. Truoc Task 9, site/ la ban in ra cua may chu va ghi de len no la dung;
// tu Task 9 thi nguoc lai - site/ la KHUON song song, chinh nhung tep mang data-ab-section ma
// bo ghep doc vao. Ghi HTML da ghep len do la pha nguon. Cho nen mac dinh ghi ra export/, va
// tools/trees.py van la thu giu hai cay wwwroot/ va site/ khop nhau.
//
// Danh sach trang lay tu chinh /sitemap.xml cua may chu, khong viet lai o day: mot danh sach
// thu hai la mot cho de hai ben lech nhau ma khong ai thay.
//
//   node publish-static.js [origin] [thu-muc-ra]     ghi ra, roi doi chieu tung tep
//   node publish-static.js --serve [thu-muc] [cong]  phuc vu thu muc do de parity.js so
const fs = require('fs');
const http = require('http');
const path = require('path');
const { table, heading, verdict } = require('./lib/report');

const ROOT = path.join(__dirname, '..');

// Thu khong thuoc ve mot ban tinh: khuon cua bo ghep, va ca khu quan tri.
const SKIP_DIR = new Set(['admin']);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.pdf': 'application/pdf',
};

/* ---- phuc vu tinh, du de parity.js chup anh ------------------------------------------- */

function serve(dir, port) {
  http.createServer((req, res) => {
    const clean = decodeURIComponent(req.url.split('?')[0]);
    let file = path.join(dir, clean);
    if (clean.endsWith('/')) file = path.join(file, 'index.html');

    // Ngoai thu muc thi tu choi, khong phuc vu bang duong dan di len.
    if (!path.resolve(file).startsWith(path.resolve(dir))) { res.writeHead(403).end(); return; }

    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404, { 'content-type': 'text/plain' }).end('404'); return; }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      res.end(buf);
    });
  }).listen(port, () => console.log('  phuc vu %s o http://127.0.0.1:%d', dir, port));
}

/* ---- chep tai nguyen ------------------------------------------------------------------ */

/** Chep moi thu tru khuon .html va khu quan tri. Tra ve so tep da chep. */
function copyAssets(from, to) {
  let n = 0;
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (SKIP_DIR.has(e.name)) continue;
      n += copyAssets(path.join(from, e.name), path.join(to, e.name));
      continue;
    }
    // Moi .html trong wwwroot/ la mot khuon; ban that den tu may chu, ghi de sau.
    if (e.name.endsWith('.html')) continue;
    fs.mkdirSync(to, { recursive: true });
    fs.copyFileSync(path.join(from, e.name), path.join(to, e.name));
    n++;
  }
  return n;
}

/* ---- ghi ra --------------------------------------------------------------------------- */

async function text(url) {
  const res = await fetch(url, { cache: 'no-store' });
  return res.ok ? await res.text() : null;
}

/** Tep trong thu muc ra tra loi mot duong dan URL. */
function fileFor(out, urlPath) {
  const clean = urlPath.split('?')[0].replace(/^\/|\/$/g, '');
  return clean ? path.join(out, clean, 'index.html') : path.join(out, 'index.html');
}

async function publish(base, out) {
  const rows = [];
  let bad = 0;

  const map = await text(base + '/sitemap.xml');
  if (!map) { console.log('  khong doc duoc /sitemap.xml — may chu chua chay?'); process.exit(1); }

  const paths = [...map.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map(m => m[1].replace(/^https?:\/\/[^/]+/, ''))
    .map(p => p || '/');

  fs.rmSync(out, { recursive: true, force: true });
  const assets = copyAssets(path.join(ROOT, 'wwwroot'), out);

  let written = 0;
  for (const p of paths) {
    const html = await text(base + p);
    if (html === null) { rows.push([p, '-', 'KHONG TAI DUOC']); bad++; continue; }

    const target = fileFor(out, p);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, html, 'utf8');

    // Doc lai va doi chieu. Mot lan xuat ban lang le bo mat mot trang te hon mot lan that bai.
    if (fs.readFileSync(target, 'utf8') !== html) { rows.push([p, '-', 'GHI KHONG KHOP']); bad++; continue; }
    written++;
  }

  // Ba tep may chu sinh ra chu khong luu san.
  for (const name of ['sitemap.xml', 'robots.txt', 'llms.txt']) {
    const body = await text(base + '/' + name);
    if (body === null) { rows.push(['/' + name, '-', 'KHONG TAI DUOC']); bad++; continue; }
    fs.writeFileSync(path.join(out, name), body, 'utf8');
    written++;
  }

  rows.push(['tai nguyen chep tu wwwroot/', String(assets), assets > 0 ? 'dat' : 'KHONG CHEP DUOC']);
  if (assets === 0) bad++;
  rows.push(['trang ghi ra va doc lai khop', String(written), bad === 0 ? 'dat' : 'co cho hong']);

  heading('Ban tinh sinh tu ' + base + ' -> ' + path.relative(ROOT, out).replace(/\\/g, '/'));
  table(['muc', 'so luong', 'ket qua'], rows, [false, true, false]);
  console.log('\n  %d duong dan tu sitemap.xml, cong ba tep may chu tu sinh.', paths.length);
  console.log('  So anh voi may chu:');
  console.log('    node publish-static.js --serve %s 5210',
              path.relative(ROOT, out).replace(/\\/g, '/'));
  console.log('    node parity.js %s http://127.0.0.1:5210 1440', base);
  verdict(bad === 0, 'ban tinh day du va khop tung byte voi thu may chu tra ve');
}

const argv = process.argv.slice(2);
if (argv[0] === '--serve') {
  serve(path.resolve(ROOT, argv[1] || 'export'), +(argv[2] || 5210));
} else {
  publish((argv[0] || 'http://127.0.0.1:5117').replace(/\/$/, ''),
          path.resolve(ROOT, argv[1] || 'export'));
}
