// Writes the composed pages out to site/, the tree GitHub Pages publishes.
//
// The server is what builds a page now, so site/ is no longer a second source of truth - it is
// the server's output, frozen. That keeps Pages serving a working site while the move to
// server-side composition is still in progress, and leaves a static copy that works as a backup
// and as something to hand over.
//
// Run with the app running. Compares what it wrote against what the server returns, because a
// publish that quietly drops a page is worse than one that fails.
//
//   node publish-static.js [origin]
const fs = require('fs');
const path = require('path');
const { PAGES } = require('./lib/pages');
const { table, heading, verdict } = require('./lib/report');

const BASE = (process.argv[2] || 'http://127.0.0.1:5117').replace(/\/$/, '');
const OUT = path.join(__dirname, '..', 'site');

/** The file in site/ that answers a URL path. */
function fileFor(urlPath) {
  const clean = urlPath.split('?')[0].replace(/^\/|\/$/g, '');
  return clean ? path.join(OUT, clean, 'index.html') : path.join(OUT, 'index.html');
}

(async () => {
  // Detail pages are one template serving many ids, so only the template is written once.
  const templates = [...new Set(PAGES.map(p => p.split('?')[0]))];
  const rows = [];
  let bad = 0;

  for (const p of templates) {
    const res = await fetch(BASE + p, { cache: 'no-store' });
    if (!res.ok) { rows.push([p, res.status, 'KHONG TAI DUOC']); bad++; continue; }

    const html = await res.text();
    const target = fileFor(p);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, html, 'utf8');

    // Read it back and compare. A publish that silently drops a page is the failure worth
    // checking for.
    const written = fs.readFileSync(target, 'utf8');
    const same = written === html;
    if (!same) bad++;
    rows.push([p, Math.round(html.length / 1024) + ' KB', same ? 'da ghi' : 'GHI KHONG KHOP']);
  }

  heading('Sinh site/ tu ' + BASE);
  table(['trang', 'kich thuoc', 'ket qua'], rows, [false, true, false]);
  console.log('\n  %d khuôn trang.', templates.length);
  verdict(bad === 0, 'moi trang ghi ra khop voi thu may chu tra ve');
})();
