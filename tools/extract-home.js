// Lifts the home page's own headings into site.json under `home`, and marks them.
//
// Only the genuinely hardcoded ones. The headings for Highlights, Applications and Gallery are
// placeholders their renderers fill from their own JSON documents already, so lifting them here
// would give one string two owners.
//
// Counts written into prose are lifted too, and then removed from the wording: "Six product
// families" is a lie the moment someone adds a seventh, and the editor exists precisely so people
// add things.
//
//   node extract-home.js [--write]
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PAGE = path.join(ROOT, 'wwwroot', 'index.html');
const SITE = path.join(ROOT, 'wwwroot', '_data', 'site.json');
const WRITE = process.argv.includes('--write');
const pad = (v, n) => String(v).padEnd(n);

let html = fs.readFileSync(PAGE, 'utf8');
const site = JSON.parse(fs.readFileSync(SITE, 'utf8'));

const decode = s => s
  .replace(/&mdash;/g, '—').replace(/&rsquo;/g, '’').replace(/&ouml;/g, 'ö')
  .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ').trim();

/** Replaces the inner text of the first element matching `open`, and records the value. */
function lift(label, openPattern, address) {
  const re = new RegExp('(' + openPattern + ')([^<]*)(</[a-z0-9]+>)', 'i');
  const m = html.match(re);
  if (!m) return { label, address, value: null, ok: false };

  const value = decode(m[2]);
  if (!m[1].includes('data-ab-t=')) {
    const marked = m[1].replace(/^<([a-z][a-z0-9]*)/i, (x, t) => `<${t} data-ab-t="${address}"`);
    html = html.replace(re, marked + m[2] + m[3]);
  }
  return { label, address, value, ok: true };
}

const home = {};
const rows = [];

const targets = [
  ['tiêu đề ẩn',     '<h1 id="abhero-h1"[^>]*>',                              'home.title'],
  ['Colors',         '<h2>(?=Colors</h2>)',                                   'home.colors.heading'],
  ['All colors',     '<a class="ab-more" href="colors/"[^>]*>',               'home.colors.more'],
  ['Recent projects','<h2>(?=Recent projects</h2>)',                          'home.projects.heading'],
  ['All projects',   '<a class="ab-more" href="projects/"[^>]*>',             'home.projects.more'],
  ['All products',   '<a class="ab-more" href="products/"[^>]*>',             'home.products.more'],
  ['CTA heading',    '<h2>(?=Send us a drawing)',                             'home.cta.heading'],
];

for (const [label, pattern, address] of targets) {
  const r = lift(label, pattern, address);
  rows.push(r);
  if (r.value !== null) {
    const parts = address.split('.').slice(1);     // drop the leading "home"
    let node = home;
    parts.slice(0, -1).forEach(p => { node[p] = node[p] || {}; node = node[p]; });
    node[parts[parts.length - 1]] = r.value;
  }
}

// --- the products heading --------------------------------------------------------------------
// Lifted word for word. The count in it is wrong the moment someone adds a seventh family, but
// changing the wording here would make the pixel comparison differ, and then a real extraction
// mistake would be indistinguishable from an intended edit. Wording changes travel separately.
rows.push(lift('Product families', '<h2>(?=Six product families</h2>)', 'home.products.heading'));
{
  const r = rows[rows.length - 1];
  if (r.value !== null) {
    home.products = home.products || {};
    home.products.heading = r.value;
  }
}

console.log('  %s %s %s', pad('nhãn', 22), pad('địa chỉ', 28), 'giá trị');
console.log('  ' + '-'.repeat(86));
rows.forEach(r => console.log('  %s %s %s%s',
  pad(r.label, 22), pad(r.address, 28), r.ok ? (r.value || '') : 'KHÔNG TÌM THẤY',
  r.note ? '   (' + r.note + ')' : ''));

const missing = rows.filter(r => !r.ok).length;
console.log('\n  %d mục, %d không tìm thấy.', rows.length, missing);

if (WRITE && missing === 0) {
  site.home = home;
  fs.writeFileSync(SITE, JSON.stringify(site, null, 2) + '\n', 'utf8');
  fs.writeFileSync(PAGE, html, 'utf8');
  console.log('  Đã ghi site.json và index.html.');
} else if (missing) {
  console.log('  Chưa ghi gì — sửa mẫu khớp trước.');
} else {
  console.log('  Chưa ghi. Thêm --write để ghi.');
}
