// How much of each page a crawler that does not run JavaScript can actually read.
//
// This is the measurement that overturned an architectural decision. On this site, before the
// server-side composition work, the whole of what a bot could read on an article page was the
// nav and the footer - 672 characters of chrome, and not one word of the article. The same ~680
// showed on four different pages, which is itself the giveaway: identical numbers mean identical
// content, and the only identical content is the shared chrome.
//
// GPTBot, ClaudeBot, PerplexityBot and CCBot fetch HTML and read it; they do not render.
//
//   node textmass.js [origin]
const { launch, newCtx, wait } = require('./lib/browser');
const { PAGES } = require('./lib/pages');
const { table, heading, verdict } = require('./lib/report');

const BASE = (process.argv[2] || 'http://127.0.0.1:5117').replace(/\/$/, '');

/** Visible text of a raw HTML string, with scripts and styles removed. */
function textOf(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim().length;
}

(async () => {
  const b = await launch();
  const ctx = await newCtx(b, { width: 1440, height: 1000 });
  const rows = [];
  let worstShare = 100;

  for (const path of PAGES) {
    const res = await fetch(BASE + path, { cache: 'no-store' });
    const raw = textOf(await res.text());

    const p = await ctx.newPage();
    await p.goto(BASE + path, { waitUntil: 'load', timeout: 90000 });
    await wait(3500);
    const rendered = await p.evaluate(
      () => document.body.innerText.replace(/\s+/g, ' ').trim().length);
    await p.close();

    const share = rendered ? Math.round(100 * raw / rendered) : 100;
    worstShare = Math.min(worstShare, share);
    rows.push([path, raw, rendered, share + '%']);
  }

  heading('Chu bot doc duoc — ' + BASE);
  table(['trang', 'HTML tho', 'sau khi JS chay', 'bot thay'], rows, [false, true, true, true]);

  console.log('\n  Trang te nhat: bot chi doc duoc %d%% noi dung.', worstShare);
  console.log('  Cac trang cho ra con so HTML tho GIONG NHAU nghia la chung chi co phan khung chung.');
  await b.close();

  // 60% is the line between "the chrome plus some content" and "the chrome and nothing else".
  verdict(worstShare >= 60, 'moi trang co noi dung that trong HTML tho');
})();
