// Moi trang co noi duoc no la trang gi khong.
//
// Truoc Task 13, ca chin muoi tu trang muc rieng deu mang dung mot tieu de - cua khuon - va dung
// mot dong mo ta. Mot may tim kiem hien tam bai viet duoi cung mot dong chu la dang hien MOT ket
// qua; nguoi doc khong co gi de chon. Khong phep do nao truoc day nhin vao phan <head> ca.
//
// Bon cau hoi:
//   1. moi trang co tieu de va mo ta rieng khong - va co trung nhau cho nao khong
//   2. JSON-LD co doc duoc khong, va co noi dung loai
//   3. sitemap.xml co liet ke du moi trang, va moi dong trong do co tra 200 khong
//   4. robots.txt va llms.txt co song khong
//
//   node seo.js [origin]
const { launch, newCtx } = require('./lib/browser');
const { PAGES } = require('./lib/pages');
const { table, heading, verdict } = require('./lib/report');

const BASE = (process.argv[2] || 'http://127.0.0.1:5117').replace(/\/$/, '');

const text = async url => (await fetch(BASE + url, { cache: 'no-store' })).text();

(async () => {
  const rows = [];
  const notes = [];
  let bad = 0;
  const check = (what, ok, detail) => {
    if (!ok) bad++;
    rows.push([what, ok ? 'dat' : 'KHONG DAT', detail]);
  };

  const b = await launch();
  const ctx = await newCtx(b, { width: 1200, height: 900 });
  const page = await ctx.newPage();

  const titles = new Map();
  const descriptions = new Map();
  let noSchema = 0;
  let noCanonical = 0;
  let canonicalSai = 0;   // canonical tro sai trang, hoac hai trang khai cung mot dia chi
  let ogTuongDoi = 0;     // og:image khong phai dia chi tuyet doi
  const canonicals = new Map();

  for (const p of PAGES) {
    await page.goto(BASE + p, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const head = await page.evaluate(() => ({
      title: document.title.trim(),
      description: (document.querySelector('meta[name=description]') || {}).content || '',
      canonical: (document.querySelector('link[rel=canonical]') || {}).href || '',
      // getAttribute, khong phai .content: .content tra ve dia chi da duoc trinh duyet giai
      // thanh tuyet doi, tuc la no che dung cai loi dang di tim.
      ogImage: (document.querySelector('meta[property="og:image"]') || {})
        .getAttribute?.('content') || '',
      schema: [...document.querySelectorAll('script[type="application/ld+json"]')]
        .map(s => s.textContent),
    }));

    if (titles.has(head.title)) notes.push('tieu de trung: ' + p + ' = ' + titles.get(head.title));
    titles.set(head.title, p);
    if (head.description && descriptions.has(head.description)) {
      notes.push('mo ta trung: ' + p + ' = ' + descriptions.get(head.description));
    }
    descriptions.set(head.description, p);

    let types = [];
    for (const block of head.schema) {
      try {
        const doc = JSON.parse(block);
        types = types.concat((doc['@graph'] || [doc]).map(n => n['@type']));
      } catch (e) { notes.push('JSON-LD hong o ' + p + ': ' + e.message); }
    }
    if (types.length === 0) { noSchema++; notes.push('khong co JSON-LD: ' + p); }

    // Mot trang muc rieng phai noi duoc dia chi chinh thuc cua no: dang cu van dang chuyen huong
    // toi day, va mot trang tra loi o hai dia chi ma khong noi dia chi nao la that thi bi chia doi.
    const isItem = p.split('/').filter(Boolean).length > 1;
    if (isItem && !head.canonical) { noCanonical++; notes.push('khong co canonical: ' + p); }

    // CANONICAL PHAI TRO VE CHINH TRANG DO.
    //
    // Phep kiem o tren chi hoi "co canonical khong", va no dat suot trong khi 40 bai tin cung
    // khai mot dia chi: /news/detail/, la duong dan cua KHUON chu khong phai cua bai. Bon muoi
    // bai xin duoc lap chi muc thanh mot bai. Mot phep kiem khong the that bai theo cach no can
    // bat thi khong phai mot phep kiem - nen cho nay so duong dan, chu khong dem su ton tai.
    if (head.canonical) {
      const duong = head.canonical.replace(/^https?:\/\/[^/]+/, '');
      if (duong !== p) {
        canonicalSai++;
        notes.push('canonical tro sai cho: ' + p + ' -> ' + duong);
      }
      if (canonicals.has(head.canonical)) {
        canonicalSai++;
        notes.push('canonical trung: ' + p + ' = ' + canonicals.get(head.canonical));
      }
      canonicals.set(head.canonical, p);
    }

    // og:image phai la dia chi TUYET DOI. Open Graph doi vay, va khong bo quet nao giai mot
    // duong dan tuong doi ra tu trang - nen mot the tuong doi la mot the chia se khong co anh,
    // va cai do khong nhin thay duoc tu chinh site: no chi hien trong cua so chat cua nguoi khac.
    if (head.ogImage && !/^https?:\/\//.test(head.ogImage)) {
      ogTuongDoi++;
      notes.push('og:image tuong doi: ' + p + ' -> ' + head.ogImage);
    }
  }

  check('tieu de rieng cho tung trang', titles.size === PAGES.length,
        titles.size + '/' + PAGES.length + ' tieu de khac nhau');
  check('mo ta rieng cho tung trang', descriptions.size === PAGES.length,
        descriptions.size + '/' + PAGES.length + ' dong mo ta khac nhau');
  check('JSON-LD tren moi trang', noSchema === 0, (PAGES.length - noSchema) + '/' + PAGES.length);
  check('canonical tren trang muc rieng', noCanonical === 0,
        noCanonical === 0 ? 'du' : noCanonical + ' trang thieu');
  check('canonical tro dung ve trang cua no', canonicalSai === 0,
        canonicalSai === 0 ? 'dung het' : canonicalSai + ' cho sai');
  check('og:image la dia chi tuyet doi', ogTuongDoi === 0,
        ogTuongDoi === 0 ? 'dung het' : ogTuongDoi + ' the tuong doi');

  // sitemap
  const xml = await text('/sitemap.xml');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  const paths = locs.map(u => u.replace(/^https?:\/\/[^/]+/, ''));
  const missing = PAGES.filter(p => !paths.includes(p));
  check('sitemap.xml liet ke du', missing.length === 0,
        locs.length + ' URL' + (missing.length ? ', thieu ' + missing.join(', ') : ''));

  let dead = 0;
  for (const p of paths) {
    const r = await fetch(BASE + p, { method: 'GET', redirect: 'manual', cache: 'no-store' });
    if (r.status !== 200) { dead++; notes.push('sitemap tro toi ' + r.status + ': ' + p); }
  }
  check('moi dong trong sitemap tra 200', dead === 0, (paths.length - dead) + '/' + paths.length);

  const robots = await text('/robots.txt');
  check('robots.txt', robots.includes('Sitemap:') && robots.includes('GPTBot'),
        robots.split('User-agent:').length - 1 + ' bot duoc goi ten');

  const llms = await text('/llms.txt');
  const links = (llms.match(/\]\(https?:\/\//g) || []).length;
  check('llms.txt', llms.startsWith('# ') && links >= 20,
        Math.round(llms.length / 1024 * 10) / 10 + ' KB, ' + links + ' lien ket');

  heading('Trang co noi duoc no la trang gi khong');
  table(['phep thu', 'ket qua', 'chi tiet'], rows, [false, false, false]);
  if (notes.length) {
    console.log('');
    notes.slice(0, 12).forEach(n => console.log('    ' + n));
  }
  await b.close();
  verdict(bad === 0, 'moi trang tu mo ta duoc, va may doc co ban do de di');
})();
