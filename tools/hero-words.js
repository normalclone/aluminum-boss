// Bao nhieu ho san pham thi chu dau tren hero bi cat.
//
//   node tools/hero-words.js [so-ho-toi-da] [cong]
//
// Trang chu ve moi ho san pham thanh mot dong chu lon tren hero, doc tu products.json - khong
// viet cung. Nghe thi mem deo, nhung khoi hero la:
//
//     .abhero { height: 100vh; overflow: hidden; align-items: flex-end; }
//
// Cao co dinh, noi dung dan tu DUOI len, va tran ra thi bi CAT o TREN. Nen them mot ho khong
// lam trang dai ra; no day chu dau tien ra khoi khung, lang le. Sau ho hien tai vua, va khong
// ai biet con vua duoc den bao nhieu.
//
// Cau hoi nay co that ngay bay gio: nhap 39 san pham cua cuon tu bossdoor.vn can mot ho moi
// ("Roller shutters"), tuc la ho thu bay. Va man hinh laptop 1440x720 chat hon 1440x900 nen
// phai do ca hai, chu khong chi cai rong nhat.
const fs = require('fs');
const path = require('path');
const http = require('http');
const { launch, newCtx, wait } = require('./lib/browser');
const { table, heading, verdict } = require('./lib/report');

const ROOT = path.join(__dirname, '..');
const SITE = path.join(ROOT, 'site');
const FILE = path.join(SITE, '_data', 'products.json');
const MAX = +(process.argv[2] || 12);
const PORT = +(process.argv[3] || 8101);

const SCREENS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1440x720', width: 1440, height: 720 },   // laptop 14 inch, chat hon
  { name: '390x844', width: 390, height: 844 },     // o day hero la height:auto, khong cat
];

function serve() {
  const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
                  '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg',
                  '.png': 'image/png', '.woff2': 'font/woff2', '.webp': 'image/webp' };
  return http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    const full = path.join(SITE, p);
    if (!full.startsWith(SITE) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
      res.writeHead(404, { 'content-type': 'text/plain' }); res.end('404'); return;
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(full)] || 'application/octet-stream' });
    fs.createReadStream(full).pipe(res);
  }).listen(PORT);
}

/** Do tai cho, trong trang: khung hero, khoi chu, va dong chu dau tien. */
const measure = page => page.evaluate(() => {
  const hero = document.querySelector('.abhero');
  const words = document.getElementById('abhero-words');
  const first = words && words.querySelector('a');
  if (!hero || !words || !first) return null;
  const h = hero.getBoundingClientRect();
  const w = words.getBoundingClientRect();
  const f = first.getBoundingClientRect();
  const claim = document.querySelector('.abhero-claim');
  const c = claim && claim.getBoundingClientRect();
  return {
    heroTop: Math.round(h.top), heroH: Math.round(h.height),
    wordsH: Math.round(w.height), count: words.querySelectorAll('a').length,
    firstTop: Math.round(f.top), firstText: first.textContent,
    claimTop: c ? Math.round(c.top) : null,
    // Cat hay khong: do bang chinh khung hero, khong doan tu con so nao.
    room: Math.round(f.top - h.top),
  };
});

(async () => {
  const before = fs.readFileSync(FILE, 'utf8');
  const base = JSON.parse(before);
  const baseN = base.categories.length;
  const out = [];
  let bad = 0;

  const server = serve();
  const b = await launch();

  try {
    for (const s of SCREENS) {
      const ctx = await newCtx(b, { width: s.width, height: s.height });
      const page = await ctx.newPage();
      let firstClip = null;

      for (let n = baseN; n <= MAX; n++) {
        const doc = JSON.parse(before);
        for (let i = baseN; i < n; i++) {
          doc.categories.push({
            id: 'probe-' + i, name: 'Roller shutters', tagline: 'phep do, khong xuat ban',
            image: '', blurb: 'Phep do tam thoi. Tep duoc tra lai nguyen van o cuoi lan chay.',
            items: [],
          });
        }
        fs.writeFileSync(FILE, JSON.stringify(doc, null, 2) + '\n', 'utf8');

        await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 30000 });
        await wait(700);
        const m = await measure(page);
        if (!m) {
          out.push([s.name, n, '-', '-', '-', 'KHONG DOC DUOC hero']);
          bad++;
          break;
        }
        // Khong doc duoc dung so ho vua ghi = phep do dang do mot trang khac, khong phai
        // "vua du". Chan o day, neu khong ca bang duoi se la mot loi noi doi mach lac.
        if (m.count !== n) {
          out.push([s.name, n, m.heroH, m.wordsH, m.room, `ve ${m.count} chu, khong phai ${n}`]);
          bad++;
          break;
        }
        const clipped = m.room < 0;
        const claimGone = m.claimTop !== null && m.claimTop < m.heroTop;
        if (clipped && firstClip === null) firstClip = n;
        out.push([s.name, n, m.heroH, m.wordsH, m.room,
                  clipped ? `CAT "${m.firstText}" mat ${-m.room}px`
                  : claimGone ? 'chu claim bi cat'
                  : m.room < 40 ? `con ${m.room}px - sat` : 'vua']);
      }
      await ctx.close();
      if (firstClip !== null) out.push([s.name, '->', '', '', '', `bi cat tu ${firstClip} ho`]);
      else out.push([s.name, '->', '', '', '', `den ${MAX} ho van vua`]);
    }
  } finally {
    fs.writeFileSync(FILE, before, 'utf8');
    await b.close();
    server.close();
  }

  const same = fs.readFileSync(FILE, 'utf8') === before;
  heading('Hero chua duoc bao nhieu ho san pham');
  table(['man hinh', 'so ho', 'hero (px)', 'khoi chu', 'ho tro tren', 'ket qua'],
        out, [false, true, true, true, true, false]);
  console.log('\n  "ho tro tren" = khoang tu dinh khung hero xuong chu dau tien. Am la bi cat.');
  console.log('  Hero la height:100vh, overflow:hidden, noi dung dan tu duoi len - nen them mot');
  console.log('  ho khong lam trang dai ra, no day chu dau tien ra khoi khung.');
  console.log('  products.json tro lai nguyen van: %s', same ? 'dung' : 'KHONG - kiem tra git diff');
  verdict(bad === 0 && same, 'do duoc tran that su cua hero, va tra lai tep nguyen van');
})();
