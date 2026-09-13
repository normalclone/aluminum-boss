// Checks that every page was actually composed, rather than quietly handed back as its template.
//
// PageComposer refuses to serve a page whose addresses do not all resolve: it logs the misses and
// returns the template instead, whose fallback text is still correct. That is the right behaviour
// and it is completely invisible - the page looks perfect, the words are right, and nothing on
// the site is a parameter any more.
//
// It had already happened. Every address on the home page was written `home.title` while the data
// sits at `site.home.title`; the first segment names the document and there is no home.json. The
// page fell back from the day those addresses were written. No measurement noticed: the text was
// right, the pixels matched, the crawl was clean. Only the log knew, and nobody reads the log.
//
//   node compose.js [origin] [duong-dan-wwwroot]
const fs = require('fs');
const path = require('path');
const { PAGES } = require('./lib/pages');
const { table, heading, verdict } = require('./lib/report');

const BASE = (process.argv[2] || 'http://localhost:5199').replace(/\/$/, '');
const ROOT = process.argv[3] || path.join(__dirname, '..', 'wwwroot');

/** The template on disk that answers a URL path, the way the composer resolves it. */
function templateFor(urlPath) {
  const rel = urlPath.split('?')[0].replace(/^\/|\/$/g, '');
  const file = rel ? path.join(ROOT, rel, 'index.html') : path.join(ROOT, 'index.html');
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

const ADDRESSES = /data-ab-(?:t|lead|lines|section)="/g;

(async () => {
  const rows = [];
  let bad = 0;

  for (const p of PAGES) {
    const template = templateFor(p);
    if (template === null) { rows.push([p, '-', '-', 'khong tim thay khuon']); bad++; continue; }

    const served = await (await fetch(BASE + p, { cache: 'no-store' })).text();
    const addresses = (template.match(ADDRESSES) || []).length;

    // A composed page always differs from its template: a section's contents change from nothing
    // to the markup, and that is true even when every piece of text happens to match its fallback.
    const composed = served !== template;
    if (!composed) bad++;
    rows.push([p, String(addresses), String(served.length - template.length),
               composed ? 'da ghep' : 'TRA VE KHUON']);
  }

  heading('Trang co that su duoc ghep khong — ' + BASE);
  table(['trang', 'dia chi', 'chenh ky tu', 'ket qua'], rows, [false, true, true, false]);
  console.log('\n  %d/%d trang duoc ghep.', PAGES.length - bad, PAGES.length);
  console.log('  "TRA VE KHUON" nghia la mot dia chi khong phan giai duoc — xem log may chu.');
  verdict(bad === 0, bad + ' trang khong duoc ghep');
})();
