// Nhung thu KHONG duoc tu quyet: nhan hieu cua nguoi khac, ten khach hang, va cac con so co the
// bi doi chieu.
//
//   node claims-bossdoor.js
//
// Doc import/selected.json, quet nhung muc trang thai "giu", viet ra import/xac-nhan.md de anh
// Phuc duyet tung dong truoc khi co mot chu nao duoc dich.
//
// Vi sao phai co buoc nay. Nhap noi dung tu bossdoor.vn khong chi chuyen chu; no keo theo ba
// loai rui ro ma khong phep do ky thuat nao bat duoc:
//
//   1. Nhan hieu ben thu ba (Somfy, Kasankie, HOPO, Jotun...). "Dung mo to Somfy" tren mot site
//      xuat khau la mot tuyen bo ve chuoi cung ung - dung thi tot, con neu da doi nha cung cap
//      thi thanh sai su that voi khach nuoc ngoai.
//   2. Ten khach hang va du an (Aeon Mall, Vincom, san bay Cat Bi...). Nhieu hop dong cam neu
//      ten. Dang tren trang cong khai la viec cua nguoi ky hop dong, khong phai cua nguoi nhap
//      noi dung.
//   3. Con so kiem chung duoc (ky luc Guinness, so bang doc quyen, bao hanh 10 nam, cong suat
//      tan/nam, "hon 20 nam"). Nhung con so nay dung o nam 2020 tren mot site tieng Viet; nam
//      2026 tren mot site tieng Anh thi chung tro thanh cam ket voi khach nuoc ngoai.
//
// Cong cu nay khong bo gi ca, cung khong giu gi ca. No chi lam mot viec: khong de bat cu dong
// nao trong ba loai tren di qua ma khong ai nhin thay.
const fs = require('fs');
const path = require('path');
const { table, heading, verdict } = require('./lib/report');

const ROOT = path.join(__dirname, '..');
const EXTRACTED = path.join(ROOT, 'import', 'extracted.json');
const SELECTED = path.join(ROOT, 'import', 'selected.json');
const OUT = path.join(ROOT, 'import', 'xac-nhan.md');

/**
 * Ba nhom, va moi nhom mot cau hoi khac nhau danh cho anh Phuc:
 *   nhan-hieu  -> "con dung nha cung cap nay khong?"
 *   khach-hang -> "duoc neu ten khach nay tren trang cong khai khong?"
 *   con-so     -> "con so nay con dung nam 2026 khong?"
 */
const GROUPS = [
  {
    key: 'nhan-hieu', label: 'Nhan hieu ben thu ba',
    ask: 'Con dung nha cung cap / vat lieu nay khong? Neu doi roi thi bo ten khoi ban tieng Anh.',
    terms: ['Somfy', 'Kasankie', 'Robust', 'Xingfa', 'HOPO', 'Shinto Toa', 'Jotun', 'AkzoNobel',
            'Nippon', 'Dulux', 'Bosch', 'Siemens', 'Schneider', 'Panasonic', 'Mitsubishi',
            'Hyundai', 'Posco', 'Alcoa', 'Sapa', 'Qualicoat', 'Seaside'],
  },
  {
    key: 'nhan-hieu-cua-minh', label: 'Nhan hieu cua chinh cong ty',
    ask: 'Ban tieng Anh dung ten nao? Site hien tai la "Boss Group"; nguon viet "BossDoor", '
       + '"BossGroup", "Tan Truong Son". Ba ten nay tren cung mot trang se thanh ba cong ty.',
    terms: ['BossDoor', 'BossGroup', 'Boss Group', 'Tân Trường Sơn', 'BossMatic', 'Boss Standard',
            'Boss Elegant', 'SBright', 'S-Bright', 'Boss Premium'],
  },
  {
    key: 'khach-hang', label: 'Ten khach hang va du an',
    ask: 'Duoc neu ten cong khai khong? Nhieu hop dong cam - can nguoi ky hop dong xac nhan.',
    terms: ['Aeon Mall', 'Aeon', 'Vincom', 'Vingroup', 'Cát Bi', 'FHome', 'F Home', 'Masteri',
            'Delta River', 'Regina', 'Novaland', 'Coteccons', 'Sun Group', 'FLC', 'Phú Mỹ Hưng',
            'Nam An Khánh', 'Ecopark', 'Mường Thanh', 'Hòa Bình', 'Him Lam'],
  },
  {
    key: 'con-so', label: 'Con so va tuyen bo kiem chung duoc',
    ask: 'Con dung nam 2026 khong? Con so cu tren ban tieng Anh la cam ket voi khach nuoc ngoai.',
    terms: ['Guinness', 'kỷ lục', 'bằng độc quyền', 'độc quyền', 'sáng chế', 'ISO', 'PC66',
            'TCVN', 'bảo hành 10 năm', 'bảo hành 5 năm', 'hơn 20 năm', '20 năm', 'số 1',
            'hàng đầu', 'duy nhất', 'lớn nhất', 'đầu tiên', 'tấn/năm', 'giải thưởng',
            'thương hiệu quốc gia', 'top '],
  },
];

const flat = blocks => (blocks || []).map(b =>
  b.type === 'list' ? b.items.join(' ')
  : b.type === 'table' ? b.rows.map(r => r.join(' ')).join(' ')
  : b.text).join('\n');

const extracted = JSON.parse(fs.readFileSync(EXTRACTED, 'utf8')).items;
const selected = JSON.parse(fs.readFileSync(SELECTED, 'utf8')).chon;

// Chi quet nhung muc SE duoc nhap. Quet ca 307 muc thi ra mot danh sach khong ai doc het, va
// phan lon thuoc ve 219 bai da bo - lam loang dung nhung dong can nguoi doc.
const scope = [];
for (const kind of Object.keys(selected)) {
  for (const row of selected[kind]) {
    if (row.state !== 'giu') continue;
    const src = extracted[kind].find(x => x.url === row.url);
    if (!src) continue;
    scope.push({ kind, id: row.id, title: row.title, url: row.url,
                 text: [src.title, src.summary || '', flat(src.blocks)].join('\n') });
  }
}

/** Dem khong phan biet hoa thuong, va giu lai mot cau lam vi du - de thay ngu canh, khong chi ten. */
function findTerm(term) {
  const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const where = [];
  let example = '';
  for (const it of scope) {
    if (!re.test(it.text)) continue;
    where.push(it);
    if (!example) {
      const m = re.exec(it.text);
      const from = Math.max(0, m.index - 70);
      example = (from > 0 ? '…' : '') + it.text.slice(from, m.index + term.length + 70)
                .replace(/\s+/g, ' ').trim() + '…';
    }
  }
  return { where, example };
}

const found = [];
for (const g of GROUPS) {
  for (const term of g.terms) {
    const { where, example } = findTerm(term);
    if (!where.length) continue;
    // Bo term bi trum boi mot term dai hon da khop cung cho ("Aeon" trong "Aeon Mall",
    // "20 nam" trong "hon 20 nam") - neu khong danh sach se doi hoi duyet hai lan cung mot cho.
    found.push({ group: g, term, where, example });
  }
}
const kill = new Set();
for (const a of found) for (const b of found) {
  if (a === b || a.group !== b.group) continue;
  if (b.term.toLowerCase().includes(a.term.toLowerCase()) && b.term.length > a.term.length
      && b.where.length >= a.where.length) kill.add(a.term + '|' + a.group.key);
}
const rows = found.filter(f => !kill.has(f.term + '|' + f.group.key));

// --- viet tep duyet --------------------------------------------------------------------------
const kindLabel = { news: 'tin', products: 'san pham', projects: 'du an', static: 'trang' };
const out = [];
out.push('# Cần anh Phúc xác nhận trước khi dịch');
out.push('');
out.push('Sinh tự động bởi `tools/claims-bossdoor.js` — ' + new Date().toISOString().slice(0, 10)
       + '. Quét **' + scope.length + ' mục** đã chọn để nhập (`import/selected.json`, trạng thái `giu`).');
out.push('');
out.push('Ba loại dưới đây không phải việc dịch, mà là việc **cam kết**: sau khi nhập, chúng nằm');
out.push('trên trang tiếng Anh như lời của công ty với khách nước ngoài. Nên không tự quyết —');
out.push('mỗi dòng cần một chữ **giữ** hoặc **bỏ**.');
out.push('');
out.push('Cách dùng: đánh dấu `[x]` vào ô của dòng nào được giữ, gạch bỏ dòng nào không. Dòng');
out.push('nào chưa rõ thì để trống — tôi sẽ **bỏ** khi viết lại, vì bỏ sót an toàn hơn giữ sai.');
out.push('');

for (const g of GROUPS) {
  const mine = rows.filter(r => r.group.key === g.key);
  if (!mine.length) continue;
  out.push('## ' + g.label + ' (' + mine.length + ')');
  out.push('');
  out.push('> ' + g.ask);
  out.push('');
  for (const r of mine.sort((a, b) => b.where.length - a.where.length)) {
    const by = {};
    for (const w of r.where) by[w.kind] = (by[w.kind] || 0) + 1;
    const spread = Object.entries(by).map(([k, n]) => n + ' ' + (kindLabel[k] || k)).join(', ');
    out.push('- [ ] **' + r.term + '** — ' + spread);
    out.push('  - ví dụ: *' + r.example.replace(/\*/g, '') + '*');
    out.push('  - mục: ' + r.where.slice(0, 4).map(w => '`' + w.id + '`').join(', ')
           + (r.where.length > 4 ? ' và ' + (r.where.length - 4) + ' mục nữa' : ''));
  }
  out.push('');
}

out.push('---');
out.push('');
out.push('## Hai việc không nằm trong danh sách trên, nhưng cùng loại');
out.push('');
out.push('1. **Tên gọi công ty trên bản tiếng Anh.** Site đang viết "Böss Group" (có dấu ö).');
out.push('   Nguồn viết "BossGroup", "BossDoor", "Tân Trường Sơn Group". Nếu để nguyên cả ba thì');
out.push('   một khách đọc trang sẽ thấy ba công ty khác nhau. Cần chốt một cách viết.');
out.push('2. **Dòng "Six product families" ở đầu mục Products.** Nhập cửa cuốn vào là thành bảy');
out.push('   họ, và câu đó thành sai. Anh đã chốt "để nguyên, khách tự sửa được" — nhưng lúc đó');
out.push('   chưa có họ thứ bảy. Tôi sẽ để nguyên nếu anh không đổi ý, và ghi lại ở đây rằng');
out.push('   chính lần nhập này làm nó sai.');
out.push('');

fs.writeFileSync(OUT, out.join('\n') + '\n', 'utf8');

heading('Can xac nhan truoc khi dich');
table(['nhom', 'ten', 'so muc', 'vi du'],
      rows.sort((a, b) => b.where.length - a.where.length)
          .map(r => [r.group.key, r.term, r.where.length, r.example.slice(0, 64)]),
      [false, false, true, false]);

console.log('\n  Quet %d muc se duoc nhap. Ket qua o import/xac-nhan.md (%d dong can duyet).',
            scope.length, rows.length);
console.log('  Dong nao khong duoc danh dau se bi BO khi viet lai - bo sot an toan hon giu sai.');
verdict(rows.length > 0,
        `${rows.length} dong can anh Phuc quyet giu hay bo, tren ${scope.length} muc sap nhap`);
