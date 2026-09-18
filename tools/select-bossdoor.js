// Chon cai gi trong 307 muc da boc, va NOI RO vi sao bo phan con lai.
//
//   node select-bossdoor.js [--news N]
//
// Buoc nay ton tai vi mot con so trong ke hoach hoa ra sai. Ke hoach chot "giu ~30-40 bai tin",
// doan rang trong 227 bai co "60-80 bai SEO dia phuong" con lai dung duoc. Do het thi nguoc lai:
// bossdoor.vn viet cho CHU NHA VIET NAM mua cua cuon, site nay ban NHOM DINH HINH cho khach B2B
// xuat khau - va chi 7 bai noi ve nha may, chung nhan, hop tac, xuat khau. Con 220 bai kia khong
// phai "chat luong thap", chung thuoc ve mot site khac.
//
// Nen ket qua o day khong phai mot danh sach "bai hay", ma ba trang thai:
//   giu             - nhap duoc ngay, da co cho de vao
//   cho-quyet-dinh  - noi dung dung nhung site CHUA CO CHO cho no (kem de xuat)
//   bo              - khong nhap, kem ly do
//
// Doi nguong: --news 0 se keo tu 7 len 42 bai. Con so nam trong tep ket qua de doi xem duoc.
const fs = require('fs');
const path = require('path');
const { table, heading, verdict } = require('./lib/report');

const ROOT = path.join(__dirname, '..');
const IN = path.join(ROOT, 'import', 'extracted.json');
const OUT = path.join(ROOT, 'import', 'selected.json');

const arg = (name, dflt) => {
  const i = process.argv.indexOf('--' + name);
  return i > 0 && process.argv[i + 1] !== undefined ? +process.argv[i + 1] : dflt;
};
const NEWS_MIN = arg('news', 5);   // diem B2B toi thieu de mot bai tin duoc giu

/**
 * Ho san pham nao. Dia chi nguon phan nhom san pham chinh xac hon tieu de, vi bossdoor.vn dat
 * moi dong san pham mot thu muc rieng.
 *
 * Ba muc cuoi (barie, cong dien, cua kinh tu dong) KHONG phai cua cuon lan phu kien cua cuon -
 * do la thiet bi kiem soat loi vao. Site hien tai khong co ho nao chua duoc, va nhet chung vao
 * ho phu kien cho du danh sach la cach de nhat de mot ngay nao do khach hoi "sao minh ban
 * barie?" -> de "cho-quyet-dinh".
 */
const FAMILY = [
  [/^\/cua-cuon-/, 'roller-shutter', 'Roller shutters (ho MOI)'],
  [/^\/(phu-kien-cua-cuon|phu-kien-hopo|bo-toi-|bo-luu-dien-)/, 'door-accessory', 'Door Accessory'],
];
const NO_HOME = /^\/(barie-dien|cong-dien|cua-kinh-tu-dong)/;

/**
 * Bay trang tinh, va day la cho ban do dich trong ke hoach phai sua.
 *
 * Ke hoach viet: bao hanh + quy chuan lap dat -> documents.categories. Doc lai
 * build/bodies/documents-detail.js thi thay moi muc tai lieu ve mot nut "Download PDF" tro vao
 * mot tep that. Chung ta co CHU, khong co PDF. Nhap vao day = mot nut tai ve hong tren trang
 * that, va khong phep do nao trong bo hien tai bat duoc (crawl.js chi doi 200 tren trang HTML).
 * Nen hai trang do thanh "cho-quyet-dinh" kem de xuat, chu khong im lang nhap.
 */
const STATIC = {
  '/ct-bossgroup.html': {
    state: 'cho-quyet-dinh', target: 'about.chapters',
    why: 'Chuyen cong ty (nam thanh lap, cong ty thanh vien, nha may). about.chapters DA CO 6 muc '
       + 'tieng Anh; day la tu lieu de SUA LAI cac muc do, khong phai muc thu 7 (se trung "Company"). '
       + 'De xuat: mot buoc rieng, doi chieu tung cau, vi no ghi de chu khach da xem.',
  },
  '/quy-chuan-lap-dat-cua-cuon-pc66.html': {
    state: 'cho-quyet-dinh', target: 'chua co cho',
    why: 'Quy chuan lap dat - bai ky thuat that. documents.categories doi mot tep PDF that (nut '
       + 'Download PDF), ma ta chi co chu. news.items thi sai the loai. De xuat: dung lam bai ky '
       + 'thuat trong news voi tag Technical, hoac them mot muc moi cho bai ky thuat.',
  },
  '/ct-bao-hanh-cua-cuon-bossdoor.html': {
    state: 'cho-quyet-dinh', target: 'chua co cho',
    why: 'Chinh sach bao hanh. Site khong co trang nao cho chinh sach; documents lai doi PDF. '
       + 'De xuat: mot muc trong about, hoac sinh PDF that roi moi dua vao documents.',
  },
  '/ct-quy-dinh-bao-hanh-va-hang-tra-lai.html': {
    state: 'cho-quyet-dinh', target: 'chua co cho',
    why: 'Quy dinh bao hanh va hang tra lai, 51 tu - gop cung trang bao hanh tren.',
  },
  '/he-thong-cua-hang.html': {
    state: 'bo', target: '-',
    why: '124 dai ly ban le trong nuoc. Ke hoach chot khong nhap, va ly do van dung: khach cua '
       + 'site nay la nha thau / nha phan phoi nuoc ngoai, khong phai nguoi di mua cua cuon o quan.',
  },
  '/lien-he.html': { state: 'bo', target: '-', why: 'Trang lien he cua site nay da co san, viet rieng.' },
  '/': { state: 'bo', target: '-', why: 'Trang chu bossdoor.vn - khong co noi dung rieng de nhap.' },
};

const data = JSON.parse(fs.readFileSync(IN, 'utf8'));
const items = data.items;
const pick = { news: [], products: [], projects: [], static: [] };

// --- tin tuc ---------------------------------------------------------------------------------
for (const it of items.news) {
  const s = it.b2b.score;
  pick.news.push({
    id: it.id, url: it.url, title: it.title, date: it.date, wordsVi: it.wordsVi,
    images: it.images.length, score: s,
    state: s >= NEWS_MIN ? 'giu' : 'bo',
    target: s >= NEWS_MIN ? 'news.items' : '-',
    why: s >= NEWS_MIN ? `diem B2B ${s} (nha may / xuat khau / chung nhan / hop tac)`
                       : `diem B2B ${s} - ban le cua cuon cho khach Viet, khac dong san pham va khac khach`,
  });
}
pick.news.sort((a, b) => b.score - a.score || (a.date < b.date ? 1 : -1));

// --- san pham --------------------------------------------------------------------------------
for (const it of items.products) {
  const hit = FAMILY.find(([re]) => re.test(it.url));
  const row = {
    id: it.id, url: it.url, title: it.title, wordsVi: it.wordsVi, images: it.images.length,
    family: hit ? hit[1] : null, familyLabel: hit ? hit[2] : '-',
  };
  if (it.wordsVi === 0) Object.assign(row, {
    state: 'bo', target: '-',
    why: 'trang nguon chi co ten va anh, khong co chu nao de viet lai - can khach cung cap mo ta',
  });
  else if (NO_HOME.test(it.url)) Object.assign(row, {
    state: 'cho-quyet-dinh', target: 'chua co ho',
    why: 'thiet bi kiem soat loi vao (barie / cong dien / cua kinh tu dong), khong phai cua cuon '
       + 'lan phu kien cua cuon - site chua co ho nao chua duoc',
  });
  else if (hit) Object.assign(row, {
    state: 'giu', target: `products.categories[${hit[1]}].items`,
    why: `thuoc ${hit[2]}, co ${it.wordsVi} tu de rut ra spec + mot doan`,
  });
  else Object.assign(row, {
    state: 'cho-quyet-dinh', target: 'chua ro', why: 'dia chi nguon khong khop nhom nao',
  });
  pick.products.push(row);
}

// --- du an -----------------------------------------------------------------------------------
for (const it of items.projects) {
  pick.projects.push({
    id: it.id, url: it.url, title: it.title, summary: it.summary || '',
    wordsVi: it.wordsVi, images: it.images.length,
    state: it.wordsVi > 0 ? 'giu' : 'bo',
    target: it.wordsVi > 0 ? 'projects.albums' : '-',
    why: it.wordsVi > 0
      ? `${it.wordsVi} tu: chu dau tu, vi tri, dien tich, he nhom - khop gan 1:1 voi truong cua album`
      : 'trang nguon rong: bossdoor.vn khong viet gi cho du an nay',
  });
}

// --- trang tinh ------------------------------------------------------------------------------
for (const it of items.static) {
  const rule = STATIC[it.url] || { state: 'cho-quyet-dinh', target: 'chua ro', why: 'chua xet' };
  pick.static.push({ id: it.id, url: it.url, title: it.title, wordsVi: it.wordsVi,
                     images: it.images.length, ...rule });
}

// ---------------------------------------------------------------------------------------------
const KINDS = Object.keys(pick);
const count = (kind, state) => pick[kind].filter(x => x.state === state).length;
const wordsOf = (kind, state) => pick[kind].filter(x => x.state === state)
                                           .reduce((n, x) => n + x.wordsVi, 0);
const total = state => KINDS.reduce((n, k) => n + count(k, state), 0);

fs.writeFileSync(OUT, JSON.stringify({
  at: new Date().toISOString(),
  nguong: { newsB2bMin: NEWS_MIN },
  ghiChu: 'Ba trang thai: giu / cho-quyet-dinh / bo. Doi --news roi chay lai de keo rong luoi tin tuc.',
  chon: pick,
}, null, 1) + '\n', 'utf8');

heading('Chon noi dung bossdoor.vn de nhap');
table(['loai', 'giu', 'tu (VI) giu', 'cho quyet dinh', 'bo', 'tong'],
      KINDS.map(k => [k, count(k, 'giu'), wordsOf(k, 'giu').toLocaleString('en-US'),
                      count(k, 'cho-quyet-dinh'), count(k, 'bo'), pick[k].length]),
      [false, true, true, true, true, true]);

const keptWords = KINDS.reduce((n, k) => n + wordsOf(k, 'giu'), 0);

heading('Tin tuc: nguong diem B2B >= ' + NEWS_MIN);
table(['ngay', 'diem', 'tu', 'tieu de'],
      pick.news.filter(x => x.state === 'giu')
               .map(x => [x.date, x.score, x.wordsVi, x.title.slice(0, 62)]),
      [false, true, true, false]);

const tier = n => pick.news.filter(x => x.score >= n).length;
console.log('  Keo nguong thi duoc: >=10 -> %d bai, >=5 -> %d, >=1 -> %d, >=0 -> %d (het 227 bai).',
            tier(10), tier(5), tier(1), tier(0));
console.log('  Ke hoach chot "giu ~30-40 bai". Muon du 30-40 phai ha nguong ve 0, tuc la dua bai');
console.log('  ban le cua cuon cho khach Viet len site xuat khau nhom. Day la mot quyet dinh, khong');
console.log('  phai mot phep loc kho tinh - xem docs/QUYET-DINH.md muc 7.');

heading('Cho quyet dinh (' + total('cho-quyet-dinh') + ')');
table(['loai', 'muc', 'dich de xuat', 'vi sao'],
      KINDS.flatMap(k => pick[k].filter(x => x.state === 'cho-quyet-dinh')
        .map(x => [k, (x.title || x.id).slice(0, 32), x.target, x.why.slice(0, 92)])));

console.log('\n  Ket qua o import/selected.json — %d muc, %s tu tieng Viet se duoc viet lai.',
            total('giu'), keptWords.toLocaleString('en-US'));
verdict(total('giu') > 0,
        `${total('giu')} muc co cho de vao ngay, ${total('cho-quyet-dinh')} muc can anh Phuc quyet`);
