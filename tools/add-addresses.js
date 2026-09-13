// Marks the chrome of every page with the addresses the composer reads.
//
// The existing words stay in the markup as fallback text. They are identical to what the
// composer writes, so the rendered page is the same whether the composer ran or not - which is
// what lets the pixel comparison prove this step changed nothing.
//
// Only elements that contain no child elements get data-ab-t. The wordmark contains a span and
// uses data-ab-lead for its leading text node instead, because .abh-mark span is set 200 weights
// lighter and the two halves cannot share one address.
//
//   node add-addresses.js [--write]
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WRITE = process.argv.includes('--write');
const pad = (v, n) => String(v).padEnd(n);

const pages = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== '_assets') walk(p); }
    else if (e.name === 'index.html') pages.push(p);
  }
})(path.join(ROOT, 'wwwroot'));

/** Adds an attribute to a tag that does not already carry it. */
function attr(tag, name, value) {
  if (tag.includes(name + '=')) return tag;
  return tag.replace(/^<([a-z][a-z0-9]*)/i, (m, t) => `<${t} ${name}="${value}"`);
}

function markChrome(html, report) {
  let n = 0;

  // --- wordmark, header and footer -----------------------------------------------------------
  for (const [cls, base] of [['abh-mark', 'site.wordmark'], ['abf-mark', 'site.wordmark']]) {
    html = html.replace(
      new RegExp(`(<a[^>]*class="${cls}"[^>]*>)([^<]*)(<span)([^>]*)(>)([^<]*)(</span>)`, 'g'),
      (m, open, lead, spanOpen, spanAttrs, spanClose, tail, spanEnd) => {
        n += 2;
        return attr(open, 'data-ab-lead', base + '.lead')
             + lead
             + attr(spanOpen + spanAttrs + spanClose, 'data-ab-t', base + '.tail')
             + tail + spanEnd;
      });
  }

  // --- nav ------------------------------------------------------------------------------------
  let navIndex = 0;
  html = html.replace(/(<a\s+href="[^"]*"\s+data-nav="[^"]*"[^>]*>)([^<]*)(<\/a>)/g,
    (m, open, label, close) => {
      const out = attr(open, 'data-ab-t', `site.nav.${navIndex}.label`) + label + close;
      navIndex++; n++;
      return out;
    });

  // --- footer tagline -------------------------------------------------------------------------
  html = html.replace(/(<p[^>]*class="abf-line"[^>]*>)/,
    m => { n++; return attr(m, 'data-ab-lines', 'site.footer.tagline'); });

  // --- footer columns -------------------------------------------------------------------------
  let col = 0;
  // The class pattern needs a word boundary: "abf-col[^"]*" also matches the wrapper
  // class="abf-cols", and the lazy close then swallows all four columns into one block - every
  // link ends up addressed as columns.0 and the footer renders the wrong words.
  html = html.replace(/<(nav|div)\s+class="abf-col(?:\s[^"]*)?"[^>]*>[\s\S]*?<\/\1>/g, block => {
    const c = col++;
    let linkIndex = 0;

    block = block.replace(/(<h2[^>]*>)/,
      m => { n++; return attr(m, 'data-ab-t', `site.footer.columns.${c}.heading`); });

    block = block.replace(/(<a\s+href="[^"]*"[^>]*>)([^<]*)(<\/a>)/g, (m, open, label, close) => {
      const out = attr(open, 'data-ab-t',
        `site.footer.columns.${c}.links.${linkIndex}.label`) + label + close;
      linkIndex++; n++;
      return out;
    });

    // A <p> that is nothing but links carries no lines of its own.
    block = block.replace(/(<p[^>]*>)([\s\S]*?)(<\/p>)/g, (m, open, inner, close) => {
      if (!inner.replace(/<a[\s\S]*?<\/a>/g, '').replace(/<[^>]+>/g, '').trim()) return m;
      n++;
      return attr(open, 'data-ab-lines', `site.footer.columns.${c}.lines`) + inner + close;
    });

    return block;
  });

  // --- legal line -----------------------------------------------------------------------------
  html = html.replace(/(<p class="abf-legal"[^>]*>)([\s\S]*?)(<\/p>)/, (m, open, inner, close) => {
    let seenPlain = false;
    inner = inner.replace(/(<span)([^>]*)(>)([^<]*)(<\/span>)/g, (mm, so, sa, sc, txt, se) => {
      const isNote = /abf-note/.test(sa);
      const addr = isNote ? 'site.footer.demoNote' : 'site.footer.copyright';
      if (!isNote && seenPlain) return mm;
      if (!isNote) seenPlain = true;
      n++;
      return attr(so + sa + sc, 'data-ab-t', addr) + txt + se;
    });
    return open + inner + close;
  });

  report.push(n);
  return html;
}

let total = 0;
const rows = [];
for (const p of pages) {
  const before = fs.readFileSync(p, 'utf8');
  const report = [];
  const after = markChrome(before, report);
  total += report[0];
  rows.push([path.relative(path.join(ROOT, 'wwwroot'), p).replace(/\\/g, '/'), report[0],
             before === after ? 'khong doi' : 'da danh dau']);
  if (WRITE && before !== after) fs.writeFileSync(p, after, 'utf8');
}

console.log('  trang                                dia chi  ket qua');
console.log('  -----------------------------------  -------  -----------');
rows.forEach(r => console.log('  %s %s %s', pad(r[0], 35), pad(r[1], 7), r[2]));
console.log('\n  Tong %d dia chi tren %d trang.', total, pages.length);
console.log(WRITE ? '  Da ghi.' : '  Chua ghi. Them --write de ghi.');
