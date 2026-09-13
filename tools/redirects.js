// Kiem moi duong dan tung cong bo van con song sau khi doi sang dang duong dan rieng.
//
// Task 10 doi cho o cua 94 trang: /news/detail/?id=press-line-2500 thanh /news/press-line-2500/.
// Doi cho thi de, giu loi hua "khong URL nao tung cong bo tra 404" moi kho - vi mot chuyen huong
// sai khong lam hong trang nao ca. No tra ve mot trang, co noi dung, trong dep; chi la khong
// phai trang nguoi ta bam vao. Khong phep do nao khac trong bo nay nhin thay dieu do.
//
// Voi tung mon trong bay muc, cong cu doi chieu ba dieu:
//   - dia chi cu tra 301 (khong phai 302, vi trinh duyet va may tim kiem doi xu khac han)
//   - noi no tro toi dung la dia chi moi cua CHINH mon do
//   - dia chi moi tra 200
// Va vai truong hop bien: /news/detail/ khong co id, thieu dau gach cuoi, va tien to /usa/ noi
// ca site tung nam.
//
//   node redirects.js [origin]
const fs = require('fs');
const path = require('path');
const { table, heading, verdict } = require('./lib/report');

const BASE = (process.argv[2] || 'http://127.0.0.1:5117').replace(/\/$/, '');
const DATA = path.join(__dirname, '..', 'wwwroot', '_data');

// muc URL -> file JSON va cach lay danh sach mon co trang rieng. Cung thu tu may chu doc.
const SECTIONS = [
  ['news', 'news', d => d.items],
  ['products', 'products', d => d.categories],
  ['projects', 'projects', d => d.albums],
  ['colors', 'colors', d => d.items],
  ['documents', 'documents', d => d.categories.flatMap(c => c.items)],
  ['about-us', 'about', d => d.chapters],
  ['contact', 'contact', d => d.routes],
];

const load = name => JSON.parse(fs.readFileSync(path.join(DATA, name + '.json'), 'utf8'));
const slugOf = item => item.slug || item.id;

/** Mot yeu cau khong di theo chuyen huong, de doc duoc chinh cai 301 do. */
async function hit(url) {
  const r = await fetch(BASE + url, { redirect: 'manual', cache: 'no-store' });
  const to = r.headers.get('location');
  return { status: r.status, to: to ? to.replace(BASE, '') : null };
}

(async () => {
  const rows = [];
  const detail = [];
  let bad = 0;

  for (const [seg, doc, pick] of SECTIONS) {
    const items = pick(load(doc));
    let moved = 0;
    for (const item of items) {
      const want = '/' + seg + '/' + slugOf(item) + '/';
      const old = '/' + seg + '/detail/?id=' + encodeURIComponent(item.id);

      const r = await hit(old);
      if (r.status !== 301 || r.to !== want) {
        bad++;
        detail.push('  ' + old + '  ->  ' + r.status + ' ' + (r.to || ''));
        continue;
      }
      const now = await hit(want);
      if (now.status !== 200) {
        bad++;
        detail.push('  ' + want + '  ->  ' + now.status);
        continue;
      }
      moved++;
    }
    rows.push([seg, items.length, moved, moved === items.length ? 'dat' : 'LECH']);
  }

  // Cac truong hop bien, moi cai tung la mot duong dan that hoac mot cach go that.
  const first = slugOf(load('news').items[0]);
  const edges = [
    ['/news/detail/', 301, '/news/' + first + '/'],          // khong co id: trang cu hien bai dau
    ['/news/detail/index.html', 301, '/news/' + first + '/'], // goi ten ca file chi muc
    ['/news/' + first, 301, '/news/' + first + '/'],          // thieu dau gach cuoi
    ['/news/detail?id=qualicoat-class-2', 301, '/news/qualicoat-class-2/'], // thieu ca gach lan id
    ['/usa/news/detail/?id=press-line-2500', 301, '/news/press-line-2500/'], // ca site tung o /usa/
    ['/usa/colors/', 301, '/colors/'],
    ['/news/khong-co-bai-nay/', 404, null],                   // slug khong ai co: phai la 404
    ['/news/', 200, null],
    ['/', 200, null],
  ];
  const edgeRows = [];
  for (const [url, code, to] of edges) {
    const r = await hit(url);
    const ok = r.status === code && (to === null || r.to === to);
    if (!ok) bad++;
    edgeRows.push([url, r.status + (r.to ? ' -> ' + r.to : ''), ok ? 'dat' : 'LECH']);
  }

  heading('Duong dan cu tren ' + BASE);
  table(['muc', 'so mon', 'chuyen dung', 'ket qua'], rows, [false, true, true, false]);
  console.log('');
  table(['duong dan', 'may chu tra', 'ket qua'], edgeRows, [false, false, false]);
  if (detail.length) {
    console.log('');
    detail.slice(0, 20).forEach(d => console.log(d));
  }

  const total = rows.reduce((n, r) => n + r[1], 0);
  console.log('\n  %d mon, %d truong hop bien.', total, edges.length);
  verdict(bad === 0, 'moi dia chi cu tra 301 toi dung trang cua no, va trang do tra 200');
})();
