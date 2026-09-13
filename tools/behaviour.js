// Clicks the things that still have to work now that the server draws the page.
//
// The scripts no longer build the DOM - they attach behaviour to markup that arrived from the
// server. Every one of those handlers is now running against HTML it did not write, and a pixel
// comparison cannot see any of it: filters, the gallery viewer and form validation all look
// perfect in a photograph of a page nobody has touched.
//
// Already caught: skipping the first render also skipped the loop that counted the results, so
// the tally read "0 of 25 documents". That one showed in a photograph. The rest would not have.
//
//   node behaviour.js [origin]
const { launch, newCtx, wait } = require('./lib/browser');
const { table, heading, verdict } = require('./lib/report');

const BASE = (process.argv[2] || 'http://localhost:5199').replace(/\/$/, '');
const rows = [];

function record(what, ok, detail) {
  rows.push([what, ok ? 'DAT' : 'HONG', detail]);
  return ok;
}

/** A filter row must narrow the list and update the tally. */
async function filter(page, path, button, item, count) {
  await page.goto(BASE + path, { waitUntil: 'load', timeout: 60000 });
  await wait(2500);
  const read = () => page.evaluate(([i, c]) => ({
    n: document.querySelectorAll(i).length,
    text: (document.querySelector(c) || {}).textContent?.trim() || '',
  }), [item, count]);

  const before = await read();
  await page.click(button);
  await wait(600);
  const after = await read();

  return record('loc ' + path, after.n > 0 && after.n < before.n,
    before.n + ' -> ' + after.n + ' muc, "' + after.text + '"');
}

/** The contact form has nowhere to post to, so it must say so rather than sit there. */
async function form(page) {
  await page.goto(BASE + '/contact/detail/?id=quote', { waitUntil: 'load', timeout: 60000 });
  await wait(2500);
  await page.click('.ab-form .ab-submit');
  await wait(400);
  const note = await page.evaluate(() => {
    const n = document.querySelector('.ab-form-note');
    return n && !n.hidden ? n.textContent.trim() : '';
  });
  return record('bieu mau /contact/detail/', note.length > 0, note.slice(0, 46));
}

/** The home page's own three: gallery categories, application tabs, hero words. */
async function home(page) {
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 90000 });
  await wait(4000);

  const before = await page.evaluate(() =>
    document.querySelectorAll('#abgal-items .core-gallery__content__item__image').length);
  await page.click('#abgal-tags li[data-value="facades"]');
  await wait(500);
  const after = await page.evaluate(() =>
    document.querySelectorAll('#abgal-items .core-gallery__content__item__image').length);
  const okGallery = record('loc anh / (gallery)', after > 0 && after < before,
    before + ' -> ' + after + ' anh');

  const tab0 = await page.evaluate(() =>
    (document.querySelector('#abap-slider .core-slider__slide__card-body__name') || {}).textContent);
  await page.click('#abap-tablist li[data-index="2"]');
  await wait(500);
  const tab2 = await page.evaluate(() =>
    (document.querySelector('#abap-slider .core-slider__slide__card-body__name') || {}).textContent);
  const okTabs = record('doi tab / (applications)', !!tab2 && tab2 !== tab0,
    (tab0 || '?') + ' -> ' + (tab2 || '?'));

  await page.hover('#abhero-words a[data-i="3"]');
  await wait(400);
  const cap = await page.evaluate(() =>
    (document.getElementById('abhero-caption') || {}).textContent.trim());
  const okHero = record('di chuot len chu hero /', cap.length > 0, cap.slice(0, 44));

  return okGallery && okTabs && okHero;
}

/** Clicking a photograph must open the viewer over the page. */
async function gallery(page) {
  await page.goto(BASE + '/projects/detail/?id=marina-central-tower',
    { waitUntil: 'load', timeout: 60000 });
  await wait(2500);
  await page.click('.ab-shot');
  await wait(500);
  const open = await page.evaluate(() => {
    const v = document.getElementById('ab-viewer');
    return v && !v.hidden ? (document.getElementById('ab-v-count') || {}).textContent : '';
  });
  return record('bo xem anh /projects/detail/', /\d+ \/ \d+/.test(open || ''), open || 'khong mo');
}

(async () => {
  const b = await launch();
  const ctx = await newCtx(b, { width: 1440, height: 1000 });
  const page = await ctx.newPage();

  let ok = true;
  ok = await filter(page, '/colors/', '#ab-filters button[data-v="PVDF"]',
    '#ab-swatches .ab-swatch', '#ab-count') && ok;
  ok = await filter(page, '/documents/', '#ab-filters button[data-v="certificates"]',
    '#ab-cats .ab-doc', '#ab-count') && ok;
  ok = await home(page) && ok;
  ok = await gallery(page) && ok;
  ok = await form(page) && ok;

  await b.close();
  heading('Hanh vi con song sau khi may chu dung trang');
  table(['phep thu', 'ket qua', 'chi tiet'], rows);
  verdict(ok, 'moi hanh vi con hoat dong tren HTML may chu dung');
})();
