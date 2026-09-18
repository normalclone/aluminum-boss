// Do noi dung da viet lai (import/en/) vao _data cua ca hai cay.
//
//   node tools/merge-bossdoor.js          xem truoc, khong ghi gi
//   node tools/merge-bossdoor.js --apply  ghi that
//
// Day la buoc khong lui duoc tu giao dien. Anh Phuc chot "do thang" vao wwwroot/_data thay vi
// qua cay nhap, va ly do phan doi van dung: History giu 50 ban moi tep, mot lan nhap 50+ muc se
// an het, nen khong bam hoan tac tu trinh soan duoc. Duong lui la git - nen chay lenh nay khi
// cay lam viec da sach, va de lan nhap thanh mot commit rieng.
//
// Khong ghi gi khi chua co --apply. Xem truoc la mac dinh vi mot lan do sai thi phai lui bang
// git, con mot lan xem truoc thi khong mat gi.
//
// Hinh dang tep trong import/en/ (moi muc mot tep, de doc lai va doi chieu duoc tung mon):
//
//   import/en/news/<id>.json       {id, title, date, author, tags[], excerpt, body[]}
//   import/en/products/<id>.json   {id, family, name, image, spec, text}
//   import/en/families/<id>.json   {id, name, tagline, image, blurb}   <- ho san pham MOI
//   import/en/projects/<id>.json   {id, year, title, location, client, scope, products[], note, photos[]}
//
// `id` di vao URL cong khai (/news/<id>/), nen no phai qua duoc dung phep kiem cua slugs.py -
// chi chu thuong, so va dau noi - va khong duoc trung voi id da co. Kiem o day chu khong de
// slugs.py bat sau, vi luc slugs.py bat thi tep _data da bi ghi roi.
const fs = require('fs');
const path = require('path');
const { table, heading, verdict } = require('./lib/report');

const ROOT = path.join(__dirname, '..');
const EN = path.join(ROOT, 'import', 'en');
const TREES = [path.join(ROOT, 'wwwroot', '_data'), path.join(ROOT, 'site', '_data')];
const APPLY = process.argv.includes('--apply');

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Moi loai: doc nao, mang nao, can truong gi.
 *
 * `need` la nhung truong ma mot the tren trang se HONG neu thieu - khong phai nhung truong
 * "nen co". Thieu `spec` thi the san pham ve mot dong trong; thieu `excerpt` thi danh sach tin
 * ve mot khoang trang. Nen chan o day.
 */
const KINDS = {
  news: {
    doc: 'news', array: 'items',
    need: ['id', 'title', 'date', 'author', 'excerpt', 'body'],
    check(x) {
      const e = [];
      if (!DATE.test(String(x.date))) e.push('date phai dang YYYY-MM-DD');
      if (!Array.isArray(x.body) || !x.body.length) e.push('body phai la mang doan van, khong rong');
      if (!Array.isArray(x.tags)) e.push('tags phai la mang (danh sach tin loc theo tag)');
      if (String(x.excerpt || '').length > 320) e.push('excerpt dai qua 320 ky tu');
      return e;
    },
  },
  projects: {
    doc: 'projects', array: 'albums',
    need: ['id', 'year', 'title', 'location', 'client', 'scope', 'note'],
    check(x) {
      const e = [];
      if (!(x.year >= 1990 && x.year <= 2100)) e.push('year phai la so nam');
      if (!Array.isArray(x.products)) e.push('products phai la mang ten he nhom');
      if (!Array.isArray(x.photos)) e.push('photos phai la mang {c, image}');
      return e;
    },
  },
  products: {
    doc: 'products', array: null,   // vao trong categories[family].items, xu ly rieng
    need: ['id', 'family', 'name', 'spec', 'text'],
    check: () => [],
  },
  families: {
    doc: 'products', array: 'categories',
    need: ['id', 'name', 'tagline', 'blurb'],
    check: () => [],
  },
};

const readDir = kind => {
  const dir = path.join(EN, kind);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.json'))
    .map(f => ({ file: path.join(kind, f), data: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) }));
};

const load = name => JSON.parse(fs.readFileSync(path.join(TREES[0], name + '.json'), 'utf8'));

// --- doc va kiem --------------------------------------------------------------------------
const incoming = {};
const problems = [];
for (const kind of Object.keys(KINDS)) incoming[kind] = readDir(kind);

const existingIds = {
  news: new Set(load('news').items.map(x => x.id)),
  projects: new Set(load('projects').albums.map(x => x.id)),
  families: new Set(load('products').categories.map(x => x.id)),
  products: new Set(load('products').categories.flatMap(c => (c.items || []).map(x => x.id))),
};
const newFamilyIds = new Set(incoming.families.map(x => x.data.id));

for (const kind of Object.keys(KINDS)) {
  const K = KINDS[kind];
  const seen = new Set();
  for (const { file, data } of incoming[kind]) {
    const e = [];
    for (const f of K.need) {
      const v = data[f];
      if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length))
        e.push('thieu ' + f);
    }
    if (data.id && !SLUG.test(String(data.id))) e.push('id khong dung slug (chi a-z 0-9 -)');
    if (data.id && String(data.id).length > 48) e.push('id dai ' + String(data.id).length
      + ' ky tu - Windows chet o duong dan 260 ky tu, va crawler da chet vi dung ly do nay');
    if (data.id && seen.has(data.id)) e.push('trung id voi mot tep khac trong import/en/' + kind);
    if (data.id) seen.add(data.id);
    // Trung voi id DA CO tren site khong phai loi - do la ban cap nhat. Nhung phai noi ro,
    // vi ghi de mot mon khach da xem khac han them mon moi.
    const update = data.id && existingIds[kind] && existingIds[kind].has(data.id);
    if (kind === 'products' && data.family
        && !existingIds.families.has(data.family) && !newFamilyIds.has(data.family))
      e.push(`ho "${data.family}" khong co tren site va cung khong co trong import/en/families/`);
    e.push(...K.check(data));
    if (e.length) problems.push([file, e.join('; ')]);
    data.__update = !!update;
  }
}

// --- bang xem truoc -----------------------------------------------------------------------
heading(APPLY ? 'Nhap noi dung da viet lai vao _data' : 'Xem truoc - chua ghi gi');
const rows = [];
for (const kind of Object.keys(KINDS)) {
  const list = incoming[kind];
  if (!list.length) { rows.push([kind, 0, 0, 0, '-']); continue; }
  const up = list.filter(x => x.data.__update).length;
  rows.push([kind, list.length, list.length - up, up,
             kind === 'products'
               ? [...new Set(list.map(x => x.data.family))].join(', ')
               : KINDS[kind].doc + '.' + (KINDS[kind].array || '')]);
}
table(['loai', 'tep', 'them moi', 'ghi de', 'dich'], rows, [false, true, true, true, false]);

if (problems.length) {
  heading('Khong nhap duoc (' + problems.length + ')');
  table(['tep', 'vi sao'], problems);
  console.log('\n  Khong ghi gi ca. Sua nhung tep tren roi chay lai.');
  verdict(false, 'co tep khong qua duoc phep kiem - _data khong bi cham vao');
  process.exit(1);
}

const total = Object.values(incoming).reduce((n, l) => n + l.length, 0);
if (!total) {
  console.log('\n  import/en/ chua co tep nao. Buoc viet lai (dot 4) chua chay.');
  verdict(false, 'khong co gi de nhap');
  process.exit(1);
}

if (!APPLY) {
  console.log('\n  Moi thu qua duoc phep kiem. Chay lai voi --apply de ghi that.');
  console.log('  Truoc khi --apply: commit sach, de lan nhap thanh mot commit rieng (git la duong lui).');
  verdict(true, `${total} muc san sang nhap, chua ghi gi`);
  process.exit(0);
}

// --- ghi ----------------------------------------------------------------------------------
/** Them hoac thay mot mon trong mang theo id, giu nguyen thu tu khi la ban cap nhat. */
function put(arr, item) {
  const at = arr.findIndex(x => x.id === item.id);
  const clean = { ...item };
  delete clean.__update;
  delete clean.family;
  if (at >= 0) arr[at] = { ...arr[at], ...clean };
  else arr.push(clean);
}

const docs = { news: load('news'), projects: load('projects'), products: load('products') };

for (const { data } of incoming.families) {
  const at = docs.products.categories.findIndex(c => c.id === data.id);
  const body = { id: data.id, name: data.name, tagline: data.tagline,
                 image: data.image || '', blurb: data.blurb };
  if (at >= 0) docs.products.categories[at] = { ...docs.products.categories[at], ...body };
  else docs.products.categories.push({ ...body, items: [] });
}
for (const { data } of incoming.products) {
  const fam = docs.products.categories.find(c => c.id === data.family);
  fam.items = fam.items || [];
  put(fam.items, { id: data.id, name: data.name, image: data.image || '',
                   spec: data.spec, text: data.text });
}
for (const { data } of incoming.news) put(docs.news.items, data);
for (const { data } of incoming.projects) put(docs.projects.albums, data);

// Tin moi nhat len dau: /news/ in ngay tuong doi va khong tu sap xep.
docs.news.items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
docs.projects.albums.sort((a, b) => b.year - a.year);

const written = [];
for (const tree of TREES) {
  for (const [name, doc] of Object.entries(docs)) {
    const file = path.join(tree, name + '.json');
    fs.writeFileSync(file, JSON.stringify(doc, null, 2) + '\n', 'utf8');
    written.push(path.relative(ROOT, file));
  }
}

heading('Da ghi');
table(['tep'], written.map(f => [f]));
console.log('\n  Con hai viec nua, theo dung thu tu:');
console.log('    python tools/fanout.py        trai lai trang rieng cho muc moi');
console.log('    python tools/slugs.py         kiem id va duong dan');
console.log('    node tools/crawl.js           moi trang tra 200, khong loi JS');
console.log('    node tools/parity.js task23   so pixel voi moc - trang tin SE khac, do la dinh');
verdict(true, `${total} muc da vao _data cua ca hai cay`);
