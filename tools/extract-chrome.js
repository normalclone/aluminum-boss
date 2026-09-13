// Lifts the header and footer text out of the page markup into wwwroot/_data/site.json.
//
// Measured first: after normalising the relative-path depth and the active nav marker, the header
// and footer of all 15 pages are ONE piece of markup. So this reads a single page and produces
// one document, rather than trying to reconcile fifteen.
//
// Run once, kept so the extraction can be redone if the markup changes.
//
//   node extract-chrome.js [--write]
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'wwwroot', 'news', 'index.html');
const OUT = path.join(ROOT, 'wwwroot', '_data', 'site.json');
const WRITE = process.argv.includes('--write');

const html = fs.readFileSync(SRC, 'utf8');
const pad = (v, n) => String(v).padEnd(n);

/** Text of a markup fragment. Entities are decoded: JSON holds characters, not HTML escapes. */
function text(s) {
  return s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&ouml;/g, 'ö').replace(/&rsquo;/g, '’').replace(/&mdash;/g, '—')
    .replace(/&amp;/g, '&').replace(/&copy;/g, '©').replace(/&nbsp;/g, ' ')
    .split('\n').map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
}

function grab(tag) {
  const m = html.match(new RegExp('<' + tag + '[\\s\\S]*?</' + tag + '>'));
  if (!m) throw new Error('Khong tim thay <' + tag + '> trong ' + SRC);
  return m[0];
}

const header = grab('header');
const footer = grab('footer');
const strip = h => h.replace(/^(\.\.\/)+/, '');

// --- wordmark ------------------------------------------------------------------------------
// Two pieces, because .abh-mark span is set 200 weights lighter than the anchor around it.
// Wrapping the lead in a span of its own would make both halves light and flatten the mark.
const mark = header.match(/class="abh-mark"[^>]*>([\s\S]*?)<\/a>/)[1];
const wordmark = {
  lead: text(mark.split('<span')[0]),
  tail: text((mark.match(/<span[^>]*>([\s\S]*?)<\/span>/) || [, ''])[1]),
};

// --- nav -----------------------------------------------------------------------------------
const nav = [...header.matchAll(/<a\s+href="([^"]*)"\s+data-nav="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)]
  .map(m => ({ key: m[2], label: text(m[3]), href: strip(m[1]) }));

if (nav.length !== 7) throw new Error('Nguyen mau PDF quy dinh 7 muc nav, tim thay ' + nav.length);

// --- footer ----------------------------------------------------------------------------------
const fmark = footer.match(/class="abf-mark"[^>]*>([\s\S]*?)<\/a>/)[1];
const tagline = text(footer.match(/class="abf-line"[^>]*>([\s\S]*?)<\/p>/)[1]).split('\n');

const columns = [...footer.matchAll(/<(?:nav|div)\s+class="abf-col[^"]*"[^>]*>([\s\S]*?)<\/(?:nav|div)>/g)]
  .map(m => {
    const body = m[1];
    const heading = text((body.match(/<h2[^>]*>([\s\S]*?)<\/h2>/) || [, ''])[1]);
    const links = [...body.matchAll(/<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)]
      .map(a => ({ label: text(a[2]), href: strip(a[1]) }))
      .filter(a => a.label);
    // A <p> made of nothing but links is already covered by `links`; keeping it in `lines`
    // too would have the composer write the phone number twice.
    const lines = [...body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)]
      .filter(p => text(p[1].replace(/<a[\s\S]*?<\/a>/g, '')).length > 0)
      .flatMap(p => text(p[1]).split('\n'))
      .filter(Boolean);
    return { heading, links, lines };
  })
  .filter(c => c.heading);

// Scoped to .abf-legal on purpose: matching every <span> in the footer also catches the one
// inside the wordmark, which then arrives as the copyright line.
const legalBlock = (footer.match(/<p class="abf-legal"[\s\S]*?<\/p>/) || [''])[0];
const legal = [...legalBlock.matchAll(/<span([^>]*)>([\s\S]*?)<\/span>/g)]
  .map(m => ({ note: /abf-note/.test(m[1]), value: text(m[2]) }))
  .filter(x => x.value);

const site = {
  _note: 'Khung cua site. Menu va cau hero theo nguyen mau PDF — khong tu doi ten.',
  wordmark,
  nav,
  footer: {
    tagline,
    columns,
    copyright: (legal.find(l => !l.note) || { value: '' }).value,
    // Kept as a field so it can be emptied from the admin before the site goes live.
    demoNote: (legal.find(l => l.note) || { value: '' }).value,
  },
};

console.log('  wordmark : %s + %s', wordmark.lead, wordmark.tail);
console.log('  nav      : %s', nav.map(n => n.label).join(' · '));
console.log('  tagline  : %d dong', tagline.length);
console.log('  footer   : %d cot', columns.length);
columns.forEach(c => console.log('             %s %s link, %s dong chu',
  pad(c.heading, 12), pad(c.links.length, 2), c.lines.length));
console.log('  copyright: %s', site.footer.copyright);
console.log('  demoNote : %s', site.footer.demoNote || '(khong co)');

if (WRITE) {
  fs.writeFileSync(OUT, JSON.stringify(site, null, 2) + '\n', 'utf8');
  console.log('\n  Da ghi %s', path.relative(ROOT, OUT));
} else {
  console.log('\n  Chua ghi. Them --write de ghi ra wwwroot/_data/site.json');
}
