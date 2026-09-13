// Loads every page in a real browser and reports anything that did not arrive.
//
// Reading a diff does not catch this class of bug. A link written relative to the page instead
// of to the site root looks perfectly normal in the source and only fails when something
// resolves it; this tool fetches every same-origin link on every page and reports what it gets.
//
// Caught in practice: 42 dead asset requests after an asset-folder rename, a product link in
// _app/home.js that had resolved one level too deep since the day it was written, and seven
// theme <link>/<script> tags pointing at files that were never mirrored.
//
//   node crawl.js [origin]
const { launch, newCtx, wait } = require('./lib/browser');
const { PAGES } = require('./lib/pages');
const { table, heading, verdict } = require('./lib/report');

const BASE = (process.argv[2] || 'http://127.0.0.1:5117').replace(/\/$/, '');

(async () => {
  const b = await launch();
  const ctx = await newCtx(b, { width: 1440, height: 1000 });

  let badReq = 0, badLink = 0, badRedir = 0, errs = 0;
  const seen = new Map();            // url -> status, so each target is fetched once
  const rows = [];
  const detail = [];

  for (const path of PAGES) {
    const p = await ctx.newPage();
    const failed = [], pageErrors = [];

    p.on('response', r => {
      if (r.status() >= 400 && r.url().startsWith(BASE)) {
        failed.push(r.status() + ' ' + r.url().slice(BASE.length));
      }
    });
    p.on('requestfailed', r => {
      if (r.url().startsWith(BASE)) failed.push('FAIL ' + r.url().slice(BASE.length));
    });
    p.on('pageerror', e => pageErrors.push(e.message.split('\n')[0]));

    await p.goto(BASE + path, { waitUntil: 'load', timeout: 90000 });
    await wait(3500);

    const links = await p.evaluate(base => [...document.querySelectorAll('a[href]')]
      .map(a => a.href)
      .filter(h => h.startsWith(base))
      .map(h => h.split('#')[0])
      .filter(h => h), BASE);

    const fresh = [...new Set(links)].filter(u => !seen.has(u));
    for (const u of fresh) {
      // Khong di theo chuyen huong. Mot lien ket noi bo tra 301 khong lam hong trang nao, nen
      // khong phep do nao khac nhin thay no - nhung no la dau vet cua mot lop lien ket bi bo quen
      // khi doi duong dan, va moi lan bam la mot vong di thua.
      const s = await p.evaluate(async u => {
        try {
          const r = await fetch(u, { cache: 'no-store', redirect: 'manual' });
          return r.type === 'opaqueredirect' ? 301 : r.status;
        } catch (e) { return 0; }
      }, u);
      seen.set(u, s);
      if (s === 301) {
        badRedir++;
        detail.push('CHUYEN HUONG  ' + u.slice(BASE.length));
      } else if (s >= 400 || s === 0) {
        badLink++;
        detail.push('LIEN KET ' + s + '  ' + u.slice(BASE.length));
      }
    }

    badReq += failed.length;
    errs += pageErrors.length;
    rows.push([path, failed.length || '-', pageErrors.length || '-', fresh.length]);
    failed.slice(0, 4).forEach(f => detail.push(path + '  ' + f));
    pageErrors.slice(0, 3).forEach(f => detail.push(path + '  JS ' + f));
    await p.close();
  }

  heading('Crawl ' + BASE);
  table(['trang', 'request hong', 'loi script', 'lien ket moi'], rows, [false, true, true, true]);
  if (detail.length) {
    console.log('');
    detail.forEach(d => console.log('    ' + d));
  }

  console.log('\n  %d trang · %d request hong · %d lien ket chet tren %d · %d lien ket phai chuyen huong · %d loi script',
    PAGES.length, badReq, badLink, seen.size, badRedir, errs);
  await b.close();
  verdict(badReq + badLink + badRedir + errs === 0,
    'moi trang tai day du, moi lien ket song va tro thang toi dich');
})();
