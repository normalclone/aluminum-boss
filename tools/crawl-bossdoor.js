// Cao noi dung cong khai cua bossdoor.vn ve dia, mot lan, roi lam offline.
//
// bossdoor.vn la site cua cung mot nha (BossGroup / Tan Truong Son) nhung la mot dong san pham
// khac: cua cuon hoan chinh va phu kien cua cuon. Ke hoach nhap o
// docs/superpowers/plans/2026-09-13-nhap-noi-dung-bossdoor.md.
//
// BA THU DA DO TRUOC KHI VIET, va ca ba deu doi cach viet:
//
//   1. May chu tra 403 cho curl tran. Mot bo header trinh duyet day du thi 200. Khong phai de
//      lach gi ca - robots.txt ghi "Allow: /" - chi la WAF cua ho chan theo header. Nen bo
//      header nam trong HEADERS duoi day, mot cho, va khong ai phai do lai.
//   2. Link bai viet trong trang danh sach la TUYET DOI ("https://bossdoor.vn/tin-moi/...").
//      Mot bo loc chi tim href bat dau bang "/" doc ra ZERO bai tren mot trang co 11 bai, va
//      doc ra khong loi khong bao gi - do la lan dau viet, va do la ly do ham noi bo() nhan ca
//      hai dang.
//   3. Duong dan co ky tu la: "...-|-bossdoor-n425.html" mang mot dau gach dung, va vai ten
//      san pham mang ky tu bi loi ma tu chinh CMS cua ho. encodeURI() khi goi, va ten tep tren
//      dia thi bam tu duong dan chu khong cat tu no.
//
// Khong cao anh. ~1.500 luot anh, co tam 1,44 MB - tai het la vai GB, ma den dot 4 moi biet
// giu bai nao. Dot nay chi luu URL anh vao index.json; dot 3 tai dung nhung anh con dung.
//
//   node crawl-bossdoor.js                 cao (bo qua trang da co tren dia)
//   node crawl-bossdoor.js --fresh         cao lai tu dau
//   node crawl-bossdoor.js --limit 20      chi cao 20 trang dau moi loai - de thu
//   node crawl-bossdoor.js --delay 2000    cham hon (mac dinh 1000ms)
//
// Ghi vao import/raw/ (gitignore) va import/index.json. Chay lai la an toan: trang da co tren
// dia thi khong tai lai, nen ngat giua duong roi chay tiep khong ton gi.
const fs = require('fs');
const path = require('path');
const https = require('https');
const zlib = require('zlib');
const { table, heading, verdict } = require('./lib/report');

const ORIGIN = 'https://bossdoor.vn';
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'import', 'raw');

const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf('--' + name);
  return i === -1 ? fallback : argv[i + 1];
};
const FRESH = argv.includes('--fresh');
const LIMIT = +opt('limit', 0);
const DELAY = +opt('delay', 1000);

// Bo header cua mot trinh duyet that. Thieu cai nao thi may chu tra 403 kem mot trang cua WAF,
// va trang do CUNG la HTML 200-tuong-tu nen rat de luu vao dia ma khong biet.
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                + '(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
};

/**
 * Bon nhom noi dung, va cach di den tung muc cua nhom.
 *
 * "seed" la trang danh sach dau tien; "pages" doc link "last-page" de biet co bao nhieu trang;
 * "item" la bo loc tim link mot muc trong trang danh sach. Khong dung sitemap.xml: no co 442 URL
 * nhung moi lastmod deu la 2023-02-08 va thieu het noi dung 2025-2026.
 */
const KINDS = [
  { key: 'news', label: 'Tin tuc', seed: '/tin-tuc.html',
    item: /https?:\/\/bossdoor\.vn(\/tin-[^"']+-n\d+\.html)/g },
  { key: 'products', label: 'San pham', seed: '/san-pham.html',
    item: /https?:\/\/bossdoor\.vn(\/[^"']+-p\d+\.html)/g,
    also: /https?:\/\/bossdoor\.vn(\/[^"']+-pc\d+\.html)/g },   // trang danh muc
  { key: 'projects', label: 'Du an', seed: '/du-an.html',
    item: /https?:\/\/bossdoor\.vn(\/du-an-noi-bat\/[^"']+-dpj\d+\.html)/g },
];

// Trang tinh, khong nam trong danh sach nao. Lay tu menu trang chu.
const STATIC = [
  '/ct-bossgroup.html',
  '/ct-bao-hanh-cua-cuon-bossdoor.html',
  '/ct-quy-dinh-bao-hanh-va-hang-tra-lai.html',
  '/quy-chuan-lap-dat-cua-cuon-pc66.html',
  '/he-thong-cua-hang.html',
  '/lien-he.html',
  '/',
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * Ten tep tren dia, bam tu duong dan.
 *
 * Bam chu khong cat: duong dan co "|" va co ky tu loi ma tu chinh CMS cua ho.
 *
 * Va cat ngan neu qua dai. Ho co nhung bai ma CA DOAN MO DAU bi nhet vao slug - mot cai dai
 * 286 ky tu - va Windows tu choi mo duong dan qua 260. Dot cao dau tien chet dung o do, sau
 * 113 trang. Cat con 100 ky tu roi gan mot ma bam ngan: van doc duoc bang mat, van duy nhat,
 * va import/index.json giu anh xa URL -> tep nen khong ai phai doan nguoc.
 */
function onDisk(p) {
  let safe = p.replace(/^\//, '').replace(/[^A-Za-z0-9._\/-]/g, '_') || 'index';
  if (!safe.endsWith('.html')) safe = safe.replace(/\/$/, '') + '/index.html';

  const dir = path.dirname(safe);
  const base = path.basename(safe, '.html');
  if (base.length > 100) {
    const tag = require('crypto').createHash('sha1').update(p).digest('hex').slice(0, 8);
    safe = path.join(dir, base.slice(0, 100) + '-' + tag + '.html');
  }
  return path.join(OUT, safe);
}

function get(p, redirects = 0) {
  return new Promise((resolve, reject) => {
    const url = ORIGIN + encodeURI(p);
    https.get(url, { headers: HEADERS, timeout: 45000 }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects < 4) {
        res.resume();
        const to = res.headers.location.replace(ORIGIN, '');
        return get(to, redirects + 1).then(resolve, reject);
      }
      const enc = (res.headers['content-encoding'] || '').toLowerCase();
      const un = enc === 'gzip' ? zlib.createGunzip()
               : enc === 'deflate' ? zlib.createInflate()
               : enc === 'br' ? zlib.createBrotliDecompress() : null;
      const stream = un ? res.pipe(un) : res;
      const buf = [];
      stream.on('data', c => buf.push(c));
      stream.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(buf).toString('utf8') }));
      stream.on('error', reject);
    }).on('timeout', function () { this.destroy(new Error('timeout')); }).on('error', reject);
  });
}

/** Moi link noi bo trong mot trang, ca dang tuyet doi lan dang tuong doi. */
function inside(html) {
  const out = new Set();
  const re = /(?:href|src)=["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(html))) {
    let u = m[1];
    if (u.startsWith(ORIGIN)) u = u.slice(ORIGIN.length);
    if (!u.startsWith('/')) continue;
    out.add(u.split('#')[0]);
  }
  return [...out];
}

const found = (html, re) => {
  const out = new Set();
  let m;
  re.lastIndex = 0;
  while ((m = re.exec(html))) out.add(m[1]);
  return [...out];
};

const rows = [];
const problems = [];
const index = { at: new Date().toISOString(), origin: ORIGIN, pages: {}, images: {} };
let fetched = 0, cached = 0;

/** Tai mot trang, hoac doc lai ban tren dia. Tra ve HTML, hoac null neu that bai. */
async function page(p, why) {
  const file = onDisk(p);
  if (!FRESH && fs.existsSync(file)) {
    cached++;
    return fs.readFileSync(file, 'utf8');
  }
  await sleep(DELAY);                       // 1 request/giay. Day la may chu cua nguoi khac.
  let r;
  try {
    r = await get(p);
  } catch (e) {
    problems.push([p, why, 'loi mang: ' + (e.message || e)]);
    return null;
  }
  if (r.status !== 200) {
    problems.push([p, why, 'HTTP ' + r.status]);
    return null;
  }
  // Trang cua WAF cung la HTML va cung co the ve 200. Nhan ra no bang chinh cai title cua no.
  if (/<title>\s*403 Forbidden/i.test(r.body)) {
    problems.push([p, why, 'WAF tra trang 403 - bo header sai']);
    return null;
  }
  // Mot cho khong ghi duoc khong duoc lam do ca dot cao: 300 trang tai ve trong nam phut,
  // va nem ra o trang thu 113 la mat ca nam phut ay. Ghi vao bang "cho khong doc duoc".
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, r.body, 'utf8');
  } catch (e) {
    problems.push([p, why, 'khong ghi duoc: ' + (e.code || e.message)]);
    return r.body;
  }
  fetched++;
  return r.body;
}

(async () => {
  if (FRESH) fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  for (const kind of KINDS) {
    const seed = await page(kind.seed, kind.label + ': trang danh sach');
    if (!seed) { rows.push([kind.label, 0, 0, 'khong doc duoc trang danh sach']); continue; }

    // Bao nhieu trang danh sach. Doc tu chinh link "last-page" cua ho, khong doan.
    const last = /class=['"]last-page['"][^>]*href=['"]([^'"]*-page(\d+)\.html)['"]/.exec(seed);
    const count = last ? +last[2] : 1;
    const listings = [kind.seed];
    for (let n = 2; n <= count; n++) listings.push(kind.seed.replace('.html', '-page' + n + '.html'));

    const items = new Set(found(seed, kind.item));
    const extra = new Set(kind.also ? found(seed, kind.also) : []);

    for (const l of listings.slice(1)) {
      const html = await page(l, kind.label + ': trang danh sach');
      if (!html) continue;
      found(html, kind.item).forEach(x => items.add(x));
      if (kind.also) found(html, kind.also).forEach(x => extra.add(x));
    }

    // Trang danh muc san pham cung la mot nguon muc: vai san pham chi den duoc tu danh muc cua no.
    for (const c of extra) {
      const html = await page(c, kind.label + ': danh muc');
      if (!html) continue;
      found(html, kind.item).forEach(x => items.add(x));
    }

    const list = [...items].sort();
    const take = LIMIT ? list.slice(0, LIMIT) : list;
    let ok = 0;
    for (const it of take) {
      const html = await page(it, kind.label);
      if (!html) continue;
      ok++;
      index.pages[it] = { kind: kind.key, file: path.relative(ROOT, onDisk(it)).replace(/\\/g, '/') };
      for (const u of inside(html)) {
        if (/\.(jpe?g|png|webp|gif|svg)$/i.test(u)) {
          (index.images[u] = index.images[u] || []).push(it);
        }
      }
    }
    rows.push([kind.label, listings.length + extra.size, ok,
               LIMIT && list.length > LIMIT ? `tim ${list.length}, cao ${ok} (--limit)` : `tim ${list.length}`]);
  }

  let statics = 0;
  for (const p of STATIC) {
    const html = await page(p, 'Trang tinh');
    if (!html) continue;
    statics++;
    index.pages[p] = { kind: 'static', file: path.relative(ROOT, onDisk(p)).replace(/\\/g, '/') };
  }
  rows.push(['Trang tinh', 0, statics, `tim ${STATIC.length}`]);

  fs.mkdirSync(path.join(ROOT, 'import'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'import', 'index.json'),
                   JSON.stringify(index, null, 1), 'utf8');

  heading('Cao bossdoor.vn');
  table(['loai', 'trang danh sach', 'muc da luu', 'chi tiet'], rows, [false, true, true, false]);

  if (problems.length) {
    heading('Cho khong doc duoc (' + problems.length + ')');
    table(['duong dan', 'khi dang', 'ly do'], problems.slice(0, 40));
    if (problems.length > 40) console.log('  ... va %d cho nua', problems.length - 40);
  }

  const total = rows.reduce((n, r) => n + r[2], 0);
  console.log('\n  %d muc tren dia (%d tai moi, %d doc lai tu dia), %d luot anh da ghi nhan.',
              total, fetched, cached, Object.keys(index.images).length);
  console.log('  HTML o import/raw/, kiem ke o import/index.json.');
  console.log('  Khong tai anh: dot 3 se tai dung nhung anh con dung sau khi chon bai.');

  // Mot cho khong doc duoc thi ghi ra, khong im lang bo qua - nhung no khong lam do ca dot cao.
  // Nguong: mot phan muoi so muc la dau hieu bo header hoac cach di sai, khong phai vai link hong.
  verdict(total > 0 && problems.length <= total / 10,
          problems.length === 0 ? `${total} muc, khong cho nao hong`
                                : `${total} muc, ${problems.length} cho khong doc duoc - xem bang tren`);
})();
