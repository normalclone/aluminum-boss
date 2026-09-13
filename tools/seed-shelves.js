// Gieo hat cho bon cai gia cua trang chu.
//
// Mot "gia" la mot danh sach id tro vao mot kho: home-products.json tro vao products.json,
// home-colors.json tro vao colors.json, va cu the. Truoc Task 21 khong co gia nao ca - moi khoi
// tu chon lay bang mot quy tac viet trong SectionRenderer, va khach khong doi duoc.
//
// Script nay viet ra dung nhung gi quy tac ay sinh ra HOM NAY. Do la ca hai viec: no lam cho gia
// co noi dung de bat dau, va no lam cho trang chu KHONG DOI MOT PIXEL sau khi doi sang co che
// gia - nen `node parity.js --against baseline/task19` ngay sau buoc nay la phep do that.
//
// Quy tac duoc viet lai o day chu khong dung chung voi C#: neu hai ben lech nhau thi parity phai
// keu len. Mot script goi thang vao renderer se hop le ca khi ca hai cung sai.
//
//   node seed-shelves.js            # chi viet vao gia dang rong
//   node seed-shelves.js --force    # ghi de ca gia da co noi dung
const fs = require('fs');
const path = require('path');
const { table, heading, verdict } = require('./lib/report');

const FORCE = process.argv.includes('--force');
const ROOT = path.join(__dirname, '..');
const TREES = [path.join(ROOT, 'wwwroot', '_data'), path.join(ROOT, 'site', '_data')];

const read = (dir, name) => JSON.parse(fs.readFileSync(path.join(dir, name + '.json'), 'utf8'));

/** Cung phep loc ma Arr() trong SectionRenderer dung: vang mat nghia la hien. */
const shown = list => (list || []).filter(x => x && x.visible !== false);

/** Bon quy tac, dung nhu ban C# ve chung truoc Task 21. */
const SHELVES = [
  {
    shelf: 'home-news', library: 'news', array: 'items',
    rule: 'sau bai dau tien',
    pick: items => items.slice(0, 6),
  },
  {
    shelf: 'home-products', library: 'products', array: 'categories',
    rule: 'tat ca cac dong san pham',
    pick: items => items,
  },
  {
    shelf: 'home-colors', library: 'colors', array: 'items',
    rule: 'moi ho mot mau, roi lap day den 10 theo thu tu tep',
    pick: items => {
      const seen = new Set(), pick = [];
      for (const c of items) if (!seen.has(c.family)) { seen.add(c.family); pick.push(c); }
      for (const c of items) { if (pick.length >= 10) break; if (!pick.includes(c)) pick.push(c); }
      return pick.slice(0, 10);
    },
  },
  {
    shelf: 'home-projects', library: 'projects', array: 'albums',
    rule: 'ba album moi nhat theo nam',
    // OrderByDescending cua LINQ on dinh: hai album cung nam giu nguyen thu tu tep.
    pick: items => items.map((a, i) => [a, i])
      .sort((x, y) => (Number(y[0].year) || 0) - (Number(x[0].year) || 0) || x[1] - y[1])
      .slice(0, 3).map(([a]) => a),
  },
];

const out = [];
let wrote = 0, bad = 0;

for (const s of SHELVES) {
  const stock = shown(read(TREES[0], s.library)[s.array]);
  const ids = s.pick(stock).map(x => x.id);

  // Gia da co noi dung la mot lua chon cua khach. Khong dam vao no.
  let existing = null;
  try { existing = read(TREES[0], s.shelf); } catch { /* chua co */ }
  const had = (existing && existing.items || []).length;
  if (had > 0 && !FORCE) {
    out.push([s.shelf, 'bo qua', `da co ${had} muc — dung --force de ghi de`]);
    continue;
  }

  // Giu lai moi truong khac cua tai lieu (heading, section) neu da co.
  const doc = Object.assign({}, existing || {}, { items: ids.map(id => ({ id })) });
  const json = JSON.stringify(doc, null, 2) + '\n';
  for (const dir of TREES) {
    if (!fs.existsSync(dir)) continue;
    fs.writeFileSync(path.join(dir, s.shelf + '.json'), json, 'utf8');
  }
  wrote++;
  if (ids.length === 0) bad++;
  out.push([s.shelf, `${ids.length} muc`, `${s.rule}: ${ids.join(', ')}`]);
}

heading('Gia trang chu: gieo bang dung quy tac cu');
table(['gia', 'ket qua', 'lay tu dau'], out, [false, true, false]);
console.log('\n  Buoc tiep theo, mot minh: node parity.js --against baseline/task19');
verdict(bad === 0, wrote === 0
  ? 'khong gia nao can gieo — tat ca deu da co noi dung'
  : `da gieo ${wrote} gia, khong gia nao rong`);
