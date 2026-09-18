// Boc HTML tho cua bossdoor.vn thanh JSON co cau truc.
//
// Doc import/raw/ (do crawl-bossdoor.js de lai), viet ra import/extracted.json. Khong cham vao
// mang, khong cham vao wwwroot: chay lai bao nhieu lan cung duoc.
//
// Ba khuon, doc tu chinh HTML cua ho chu khong doan:
//
//   tin      <div class="news_detail">  ->  <h1 class='title'>, <span class='news_time'>,
//            <div class='description'>
//   san pham <h1 itemprop="name">  ->  <div class="box_conten_linfo_inner" itemprop="description">
//   du an    <h1 class="product_name">  ->  <div class="summary">, <div id="prodetails_tab1">
//
// Than bai ra thanh KHOI (doan, tieu de, gach dau dong, bang) chu khong ra mot cuc chu. Site
// hien tai luu bai viet duoi dang mang doan van, va mot cuc chu thi den dot 5 lai phai cat ra -
// luc ay khong con the HTML nao de biet cho nao het doan.
//
//   node extract-bossdoor.js [--json import/extracted.json]
const fs = require('fs');
const path = require('path');
const { table, heading, verdict } = require('./lib/report');

const ROOT = path.join(__dirname, '..');
const IMPORT = path.join(ROOT, 'import');
const argv = process.argv.slice(2);
const OUT = path.join(ROOT, (argv.indexOf('--json') > -1
  ? argv[argv.indexOf('--json') + 1] : 'import/extracted.json'));

/* ---- HTML -> chu ------------------------------------------------------------------------- */

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—',
  hellip: '…', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”',
  middot: '·', bull: '•', deg: '°', laquo: '«', raquo: '»',
  // Bon ten duoi day do chinh phep dem cuoi tep nay chi ra, va ba trong so do nam trong
  // BANG THONG SO san pham: ≤ (day nan tu <=), Φ (duong kinh truc), ² (m²).
  // Bo qua thi "Φ ≤ 76mm" thanh "&Phi; &le; 76mm" - kich thuoc mat nghia chu khong chi mat dau.
  le: '≤', ge: '≥', Phi: 'Φ', phi: 'φ', reg: '®', trade: '™', copy: '©',
  sup2: '²', sup3: '³', frac12: '½', plusmn: '±', minus: '−',
};

// Bang Latin-1 (U+00C0..U+00FF, dung thu tu chuan HTML4). Trang du an va trang tinh cua
// bossdoor.vn ma hoa dau tieng Viet bang TEN thuc the - "Th&ocirc;ng tin c&#432; bản" - con
// trang tin thi ghi UTF-8 thang. Thieu bang nay thi cong cu doc dung nhung tra ve chu vo nghia,
// va khong co gi bao: 5 du an va 7 trang tinh da ra nhu vay mot lan roi.
'Agrave Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute Ecirc Euml Igrave Iacute Icirc Iuml ETH Ntilde Ograve Oacute Ocirc Otilde Ouml times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig agrave aacute acirc atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute icirc iuml eth ntilde ograve oacute ocirc otilde ouml divide oslash ugrave uacute ucirc uuml yacute thorn yuml'.split(/\s+/).forEach((n, i) => { ENTITIES[n] = String.fromCodePoint(192 + i); });

function decode(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    // Ten co chu so (&sup2; &frac12;) va ten phan biet hoa thuong (&Phi; la Φ, &phi; la φ).
    // Tra dung ten truoc, ha chu chi khi khong co - de &Phi; khong lang le thanh φ.
    .replace(/&([a-zA-Z][a-zA-Z0-9]{1,9});/g, (m, n) =>
      n in ENTITIES ? ENTITIES[n]
      : n.toLowerCase() in ENTITIES ? ENTITIES[n.toLowerCase()] : m);
}

/** Chu tran trong mot doan HTML: bo the, giai ma thuc the, gop khoang trang. */
function text(html) {
  return decode(String(html || '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ''))
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Than bai ra thanh khoi.
 *
 * Chi bon loai, vi do la bon loai site hien tai biet ve: doan van, tieu de, danh sach, bang.
 * Moi thu khac (khung quang cao, nut chia se, form) khong co cho nao de dat nen bo di ngay o
 * day chu khong de den dot dich.
 */
function blocks(html) {
  const out = [];
  const src = String(html || '')
    .replace(/<(script|style|form|iframe)[\s\S]*?<\/\1>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  const re = /<(h[1-6]|p|ul|ol|table)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(src))) {
    const tag = m[1].toLowerCase();
    const inner = m[2];

    if (tag[0] === 'h') {
      const t = text(inner);
      if (t) out.push({ type: 'heading', level: +tag[1], text: t });
    } else if (tag === 'p') {
      const t = text(inner);
      if (t) out.push({ type: 'para', text: t });
    } else if (tag === 'ul' || tag === 'ol') {
      const items = [...inner.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
        .map(x => text(x[1])).filter(Boolean);
      if (items.length) out.push({ type: 'list', ordered: tag === 'ol', items });
    } else {
      const rows = [...inner.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(r =>
        [...r[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c => text(c[1])));
      const kept = rows.filter(r => r.some(Boolean));
      if (kept.length) out.push({ type: 'table', rows: kept });
    }
  }
  return out;
}

const words = b => b.reduce((n, x) => {
  const s = x.type === 'list' ? x.items.join(' ')
          : x.type === 'table' ? x.rows.map(r => r.join(' ')).join(' ')
          : x.text;
  return n + (s.trim() ? s.trim().split(/\s+/).length : 0);
}, 0);

const imagesIn = html => [...new Set(
  [...String(html || '').matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map(m => m[1])
    .filter(u => !/^data:/.test(u)))];

/** Mot khoi HTML giua mot the mo va the dong tuong ung, dem long nhau. */
function slice(html, openRe) {
  const m = openRe.exec(html);
  if (!m) return null;
  const tag = /<(\w+)/.exec(m[0])[1];
  const open = new RegExp('<' + tag + '\\b', 'gi');
  const close = new RegExp('</' + tag + '>', 'gi');
  let depth = 0, i = m.index;
  open.lastIndex = close.lastIndex = m.index;
  for (;;) {
    open.lastIndex = Math.max(open.lastIndex, i);
    close.lastIndex = Math.max(close.lastIndex, i);
    const a = open.exec(html), b = close.exec(html);
    if (!b) return html.slice(m.index);
    if (a && a.index < b.index) { depth++; i = a.index + 1; continue; }
    depth--;
    i = b.index + 1;
    if (depth <= 0) return html.slice(m.index, b.index + b[0].length);
  }
}

const first = (html, re) => { const m = re.exec(html); return m ? text(m[1]) : ''; };

/* ---- ba khuon ----------------------------------------------------------------------------- */

function news(html, url) {
  const box = slice(html, /<div class="news_detail">/i) || html;
  const body = slice(box, /<div class=['"]description['"]/i) || '';
  const when = first(box, /<span class=['"]news_time['"]>([\s\S]*?)<\/span>/i);
  const date = (/(\d{2})\/(\d{2})\/(\d{4})/.exec(when) || []).slice(1);
  return {
    title: first(box, /<h1 class=['"]title['"]>([\s\S]*?)<\/h1>/i),
    date: date.length ? `${date[2]}-${date[1]}-${date[0]}` : '',
    author: (/Tác giả:\s*([^<\n]+)/.exec(when) || [, ''])[1].trim(),
    blocks: blocks(body),
    images: imagesIn(body),
  };
}

function product(html, url) {
  const body = slice(html, /<div class="box_conten_linfo_inner"/i) || '';
  return {
    title: first(html, /<h1 itemprop="name"[^>]*>([\s\S]*?)<\/h1>/i),
    blocks: blocks(body),
    images: imagesIn(body),
  };
}

function project(html, url) {
  const body = slice(html, /<div id="prodetails_tab1"/i) || '';
  return {
    title: first(html, /<h1 class="product_name"[^>]*>([\s\S]*?)<\/h1>/i),
    summary: first(html, /<div class="summary"[^>]*>([\s\S]*?)<\/div>/i),
    blocks: blocks(body),
    images: imagesIn(body),
  };
}

function staticPage(html, url) {
  // Trang tinh khong dung chung mot khuon nao. Lay khoi noi dung lon nhat trong so cac khuon
  // da biet, va neu khong khop cai nao thi lay ca <body> - co con hon bo trang.
  const tries = [/<div class="box_conten_linfo_inner"/i, /<div id="prodetails_tab1"/i,
                 /<div class=['"]description['"]/i, /<div class="news_detail">/i];
  let best = '';
  for (const re of tries) {
    const b = slice(html, re);
    if (b && b.length > best.length) best = b;
  }
  if (!best) best = slice(html, /<body\b/i) || html;
  return {
    title: first(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i) || first(html, /<title>([\s\S]*?)<\/title>/i),
    blocks: blocks(best),
    images: imagesIn(best),
  };
}

const SHAPE = { news, products: product, projects: project, static: staticPage };

/* ---- chay ---------------------------------------------------------------------------------- */

/**
 * Mot bai co thuoc ve site hien tai khong, cham theo diem.
 *
 * Ke hoach doan sai cho nay, va doan sai theo mot cach dang ghi lai: no cho rang trong 247 bai
 * co "60-80 bai SEO dia phuong" con lai la dung duoc. Lan viet dau tien cua cong cu nay theo
 * doan do - mot co "localSeo: true/false" do tieu de xem co chua "quan/huyen/tinh" - va tra ve
 * 29. Ca hai con so deu vo nghia, VI CUNG MOT LY DO: "SEO dia phuong" khong phai nhom that.
 *
 * Nhom that la: bossdoor.vn viet cho CHU NHA VIET NAM mua cua cuon, con site nay ban NHOM DINH
 * HINH cho khach B2B xuat khau. Do la hai thu khac nhau, va khong bo loc nao chua duoc chuyen
 * do. Nen thay vi mot cai co dung/sai, ghi han mot DIEM: bao nhieu dau hieu "thuoc ve day"
 * (billet, dun ep, xuat khau, nha may, chung nhan, ky ket) tru bao nhieu dau hieu "ban le cho
 * khach Viet" (bao gia, hotline, gia re, quan/huyen, nha pho).
 *
 * Diem nam trong extracted.json de ai cung doi duoc nguong va xem lai lua chon, thay vi phai
 * tin vao mot cai co da bi quyet ho.
 */
const PRO = /billet|đùn ép|extrusion|xuất khẩu|thị trường châu|quốc tế|nhà máy|dây chuyền|công suất|tấn\/|iso 9001|qualicoat|anodi|sơn tĩnh điện|hợp tác chiến lược|ký kết|bằng độc quyền|kỷ lục|giải thưởng|thương hiệu quốc gia/gi;
const CON = /báo giá|giá bao nhiêu|liên hệ hotline|tư vấn miễn phí|đặt hàng|quận|huyện|nhà phố|gia đình|chủ nhà|khuyến mãi|giá rẻ/gi;

const flat = b => b.map(x => x.type === 'list' ? x.items.join(' ')
                           : x.type === 'table' ? x.rows.map(r => r.join(' ')).join(' ')
                           : x.text).join(' ');

function b2b(item) {
  const t = item.title + ' ' + flat(item.blocks);
  const pro = (t.match(PRO) || []).length;
  const con = (t.match(CON) || []).length;
  return { pro, con, score: pro - con };
}

const index = JSON.parse(fs.readFileSync(path.join(IMPORT, 'index.json'), 'utf8'));
const items = { news: [], products: [], projects: [], static: [] };
const broken = [];   // cong cu boc sai
const empty = [];    // nguon that su rong - mot phat hien ve bossdoor.vn, khong phai loi o day

for (const [url, info] of Object.entries(index.pages)) {
  const file = path.join(ROOT, info.file);
  if (!fs.existsSync(file)) { broken.push([url, info.kind, 'khong co tep']); continue; }
  const html = fs.readFileSync(file, 'utf8');
  const out = SHAPE[info.kind](html, url);
  out.url = url;
  out.id = (/\/([^/]+)\.html$/.exec(url) || [, 'x'])[1];
  out.wordsVi = words(out.blocks);
  out.b2b = b2b(out);
  // Khong co tieu de = cong cu boc sai khuon. Co tieu de ma than bai rong la chuyen khac han:
  // da kiem tay mot truong hop (regina-hai-phong-dpj23) va khoi noi dung tren bossdoor.vn rong
  // that. Gop hai thu vao mot bang thi moi lan cham them mot trang rong lai trong nhu loi o day.
  if (!out.title) broken.push([url, info.kind, 'khong doc duoc tieu de']);
  else if (out.wordsVi === 0) empty.push([url, info.kind, 'trang nguon khong co noi dung']);
  items[info.kind].push(out);
}

fs.mkdirSync(IMPORT, { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ at: new Date().toISOString(), items }, null, 1), 'utf8');

const rows = [];
for (const [kind, list] of Object.entries(items)) {
  if (!list.length) { rows.push([kind, 0, 0, 0, 0, '']); continue; }
  const w = list.reduce((n, x) => n + x.wordsVi, 0);
  const img = new Set(list.flatMap(x => x.images)).size;
  const strong = list.filter(x => x.b2b.score > 5).length;
  rows.push([kind, list.length, w.toLocaleString('en-US'), Math.round(w / list.length), img,
             `${strong} muc diem B2B > 5`]);
}

heading('Boc noi dung bossdoor.vn');
table(['loai', 'muc', 'tu (VI)', 'tu/muc', 'anh', 'ghi chu'], rows, [false, true, true, true, true, false]);

if (broken.length) {
  heading('Boc khong ra (' + broken.length + ') - cong cu doc sai khuon');
  table(['duong dan', 'loai', 'ly do'], broken.slice(0, 30));
  if (broken.length > 30) console.log('  ... va %d cho nua', broken.length - 30);
}

if (empty.length) {
  heading('Rong o NGUON (' + empty.length + ') - bossdoor.vn khong co gi o day');
  table(['duong dan', 'loai', 'ly do'], empty.slice(0, 30));
  if (empty.length > 30) console.log('  ... va %d cho nua', empty.length - 30);
  console.log('  Nhung muc nay khong nhap duoc: khong co chu nao de dich.');
}

const total = Object.values(items).reduce((n, l) => n + l.length, 0);
const totalWords = Object.values(items).flat().reduce((n, x) => n + x.wordsVi, 0);
console.log('\n  %d muc, %s tu tieng Viet. Ket qua o %s',
            total, totalWords.toLocaleString('en-US'), path.relative(ROOT, OUT).replace(/\\/g, '/'));
console.log('  Dot 4 chon tu day; dot 3 tai anh cua nhung muc duoc chon.');
console.log('  Diem B2B nam tren tung muc (b2b.pro / b2b.con / b2b.score) - doi nguong duoc.');

// Thuc the con sot: bang ENTITIES la mot danh sach tay, nen no se thieu. Cau hoi khong phai
// "co thieu khong" ma "thieu cai nao" - va cau tra loi phai tu hien ra, khong doi ai di doc
// 275 nghin tu de phat hien "Th&ocirc;ng tin".
const left = {};
for (const list of Object.values(items)) for (const it of list)
  for (const m of JSON.stringify(it).matchAll(/&([a-zA-Z][a-zA-Z0-9]{1,9});/g))
    left[m[1]] = (left[m[1]] || 0) + 1;
const names = Object.entries(left).sort((a, b) => b[1] - a[1]);
if (names.length) {
  console.log('\n  THUC THE CHUA GIAI MA (%d ten): %s', names.length,
              names.slice(0, 12).map(([n, c]) => `&${n}; x${c}`).join(', '));
  console.log('  Them vao ENTITIES roi chay lai - chu nhung cho nay dang vo nghia.');
} else {
  console.log('  Khong con thuc the HTML nao chua giai ma.');
}

// Nguong: mot phan hai muoi la vai trang la khuon; nhieu hon la khuon doc sai.
verdict(total > 0 && broken.length <= total / 20,
        broken.length === 0 ? `${total} muc, cai nao cung co tieu de va than bai`
                            : `${total} muc, ${broken.length} cai boc khong ra`);
