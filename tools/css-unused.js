// CSS nao dang khong duoc dung, va bo di co an toan khong.
//
//   node tools/css-unused.js              chi bao cao, khong sua gi
//   node tools/css-unused.js --apply      xoa cac quy tac khong dung khoi tep .css
//   node tools/css-unused.js --port 5118  neu cong dang ban
//
// Site keo theo 2 MB CSS tu mot theme WordPress cu: js_composer 472 KB, b2c-child 376 KB,
// base-theme 228 KB, gravityforms 124 KB... Phan lon la cua nhung thanh phan khong con ton tai.
//
// ---------------------------------------------------------------------------------------------
// CACH DO
//
// Khong do bang cach tim ten lop trong HTML: DOM cua site nay do JavaScript dung luc chay, nen
// mot lop chi xuat hien sau khi app.js ve xong se khong nam trong tep HTML nao. Cong cu nay mo
// trang bang Chrome that, doi ve xong, roi hoi CHINH TRINH DUYET tung bo chon mot:
//
//     bo chon nay con khop phan tu nao khong?
//
// Truoc khi hoi thi cat bo gia lop TRANG THAI (:hover, :focus, :active) va gia phan tu
// (::before, ::after), vi ".nut:hover" khong bao gio khop khi khong ai tro chuot vao. Giu lai
// gia lop CAU TRUC (:nth-child, :not) vi chung do duoc tren DOM tinh.
//
// GIU neu khop o BAT CU trang nao, BAT CU khung man hinh nao. Khong chac thi giu.
//
// ---------------------------------------------------------------------------------------------
// HAI CACH DA THU VA BO
//
// 1. Dung lai tep tu document.styleSheets roi ghep r.cssText. Ngan hon nhieu, va SAI: CSSOM cua
//    Chrome chi giu nhung khai bao Chrome hieu, nen "-moz-appearance" hay "-ms-grid-column"
//    bien mat khi tuan tu hoa lai. Site van dung tren Chrome - la cho minh do - va vo tren
//    Firefox hay Safari, ma khong phep do nao o day nhin thay.
//
// 2. CSS.startRuleUsageTracking cua giao thuc DevTools. Nghe dung nhat, nhung
//    stopRuleUsageTracking chi tra ve nhung quy tac DA DUNG - quy tac khong dung khong duoc
//    nhac den. Do xong ra "0 quy tac bo duoc", mot ket qua trong nhu thanh cong.
//
// Nen: tu quet ranh gioi quy tac tren VAN BAN GOC (mot may quet dau ngoac, biet bo qua chuoi
// va chu thich), roi xoa dung nhung dai byte cua quy tac bi bo. Moi thu khac - tien to nha
// cung cap, thu tu, ban rut gon, @media boc ngoai - con nguyen tung byte.
//
// ---------------------------------------------------------------------------------------------
// CHO PHEP DO NAY KHONG NHIN THAY
//
// Phan tu chi sinh ra khi bam nut: mot hop thoai do JS tao luc bam se khong co trong DOM luc do.
// Day KHONG phai mot phep do tu chung minh duoc minh dung. Sau --apply PHAI chay parity.js;
// mot pixel doi la co quy tac bi bo nham.
const fs = require('fs');
const path = require('path');
const http = require('http');
const { launch, newCtx, wait } = require('./lib/browser');
const { PAGES } = require('./lib/pages');
const { table, heading, verdict } = require('./lib/report');

const ROOT = path.join(__dirname, '..');
const SITE = path.resolve(path.join(ROOT, 'site'));
const WWW = path.resolve(path.join(ROOT, 'wwwroot'));
const APPLY = process.argv.includes('--apply');
const PORT = (() => { const i = process.argv.indexOf('--port'); return i > 0 ? +process.argv[i + 1] : 5118; })();

const SCREENS = [{ width: 1440, height: 1000 }, { width: 860, height: 1000 }, { width: 390, height: 844 }];

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
                '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg',
                '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2',
                '.woff': 'font/woff', '.ttf': 'font/ttf', '.pdf': 'application/pdf',
                '.gif': 'image/gif', '.ico': 'image/x-icon', '.mp4': 'video/mp4' };

function serve() {
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

/** @-rule co the boc quy tac khac ben trong; phai di vao chu khong xet nhu mot khoi. */
const NESTS = new Set(['media', 'supports', 'layer', 'container', 'document', 'scope', 'starting-style']);

/**
 * Quet ranh gioi quy tac tren van ban CSS.
 *
 * Khong phai mot bo phan tich CSS - chi can biet moi quy tac bat dau va ket thuc o byte nao,
 * va phan truoc dau ngoac nhon la gi. Nen no chi phai lam dung ba viec: bo qua chu thich, bo
 * qua chuoi (ke ca url() khong nhay), va dem dau ngoac.
 *
 * Tra ve cay: {kind:'style'|'at'|'group', start, end, sel|name, kids}
 */
function scanRules(css, from, to) {
  const out = [];
  let i = from, prelude = -1;

  while (i < to) {
    const c = css[i];
    if (c === '/' && css[i + 1] === '*') { const e = css.indexOf('*/', i + 2); i = e < 0 ? to : e + 2; continue; }
    if (c === '"' || c === "'") {
      const q = c; i++;
      while (i < to && css[i] !== q) i += css[i] === '\\' ? 2 : 1;
      i++; continue;
    }
    if (c === ';') { prelude = -1; i++; continue; }   // @import, @charset: khong co khoi
    if (c === '}') { prelude = -1; i++; continue; }
    if (c === '{') {
      const head = css.slice(prelude < 0 ? i : prelude, i);
      const start = prelude < 0 ? i : prelude;
      // Tim dau ngoac dong tuong ung, van phai bo qua chuoi va chu thich.
      let d = 1, j = i + 1;
      while (j < to && d > 0) {
        const x = css[j];
        if (x === '/' && css[j + 1] === '*') { const e = css.indexOf('*/', j + 2); j = e < 0 ? to : e + 2; continue; }
        if (x === '"' || x === "'") { const q = x; j++; while (j < to && css[j] !== q) j += css[j] === '\\' ? 2 : 1; j++; continue; }
        if (x === '{') d++;
        else if (x === '}') d--;
        j++;
      }
      const end = j;                                   // sau dau ngoac dong
      const text = head.trim();
      if (text.startsWith('@')) {
        const name = (/^@([\w-]+)/.exec(text) || [, ''])[1].toLowerCase();
        if (NESTS.has(name)) out.push({ kind: 'group', start, end, name, kids: scanRules(css, i + 1, end - 1) });
        else out.push({ kind: 'at', start, end, name, text });
      } else {
        out.push({ kind: 'style', start, end, sel: text, keep: false });
      }
      i = end; prelude = -1; continue;
    }
    if (prelude < 0 && !/\s/.test(c)) prelude = i;
    i++;
  }
  return out;
}

const flatten = (nodes, acc = []) => {
  for (const n of nodes) { acc.push(n); if (n.kids) flatten(n.kids, acc); }
  return acc;
};

/** Chay trong trang: bo chon nao con khop mot phan tu sau khi cat gia lop trang thai. */
const MATCH = selectors => {
  const STATE = /::?(hover|focus|focus-within|focus-visible|active|visited|link|any-link|target|checked|indeterminate|disabled|enabled|read-only|read-write|placeholder-shown|autofill|default|valid|invalid|in-range|out-of-range|required|optional|user-invalid|user-valid|open|popover-open|modal|fullscreen|picture-in-picture|playing|paused|muted)\b(\([^)]*\))?/gi;
  const ELEMENT = /::(before|after|first-line|first-letter|placeholder|selection|marker|backdrop|file-selector-button|cue|part|slotted|details-marker|resizer|spin-button)\b(\([^)]*\))?/gi;
  const VENDOR = /::?-(webkit|moz|ms|o)-[a-z-]+(\([^)]*\))?/gi;
  return selectors.map(sel => {
    for (const raw of sel.split(/,(?![^(]*\))/)) {
      let s = raw.replace(VENDOR, '').replace(ELEMENT, '').replace(STATE, '')
                 .replace(/\s{2,}/g, ' ').replace(/([>+~])\s*$/, '').trim();
      if (!s) return true;                                  // chi con gia phan tu -> giu
      try { if (document.querySelector(s)) return true; }
      catch (e) { return true; }                            // khong phan tich duoc -> giu
    }
    return false;
  });
};

const SHEETS = () => [...document.styleSheets].map(s => s.href).filter(Boolean);

(async () => {
  const server = serve();
  const base = 'http://127.0.0.1:' + PORT;
  const b = await launch();

  const files = new Map();   // url -> {file, css, tree, flat}
  let loads = 0;

  const load = url => {
    if (files.has(url)) return files.get(url);
    const file = path.join(SITE, decodeURIComponent(new URL(url).pathname));
    if (!fs.existsSync(file)) { files.set(url, null); return null; }
    const css = fs.readFileSync(file, 'utf8');
    const tree = scanRules(css, 0, css.length);
    const rec = { file, css, tree, flat: flatten(tree).filter(n => n.kind === 'style') };
    files.set(url, rec);
    return rec;
  };

  try {
    for (const s of SCREENS) {
      const ctx = await newCtx(b, s);
      const page = await ctx.newPage();
      for (const p of PAGES) {
        await page.goto(base + p, { waitUntil: 'load', timeout: 40000 });
        await wait(900);
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await wait(500);
        await page.evaluate(() => window.scrollTo(0, 0));
        await wait(200);
        loads++;

        for (const url of await page.evaluate(SHEETS)) load(url);

        // Chi hoi ve nhung bo chon chua duoc giu — moi trang tra loi them mot phan.
        const todo = [];
        for (const rec of files.values()) {
          if (!rec) continue;
          for (const n of rec.flat) if (!n.keep) todo.push(n);
        }
        if (todo.length) {
          const yes = await page.evaluate(MATCH, todo.map(n => n.sel));
          for (let i = 0; i < yes.length; i++) if (yes[i]) todo[i].keep = true;
        }
      }
      await ctx.close();
    }
  } finally {
    await b.close();
    server.close();
  }

  // --- gom cac dai byte phai xoa ---------------------------------------------------------
  /**
   * @keyframes chi bi bo khi khong con quy tac GIU nao goi ten no. Bo nham mot keyframes thi
   * hoat anh dung im - khong bao loi, khong doi bo cuc, va parity.js chup tinh cung khong thay.
   */
  function usedAnimations(rec) {
    const names = new Set();
    for (const n of rec.flat) {
      if (!n.keep) continue;
      const body = rec.css.slice(n.start, n.end);
      for (const m of body.matchAll(/animation(?:-name)?\s*:([^;}]+)/gi)) {
        for (const w of m[1].split(/[\s,]+/)) if (/^[A-Za-z_-][\w-]*$/.test(w)) names.add(w);
      }
    }
    return names;
  }

  function collect(nodes, rec, anims, dead) {
    let alive = 0;
    for (const n of nodes) {
      if (n.kind === 'style') { if (n.keep) alive++; else dead.push(n); continue; }
      if (n.kind === 'group') {
        const inner = [];
        const kidsAlive = collect(n.kids, rec, anims, inner);
        // Ca khoi @media khong con gi thi xoa nguyen khoi, chu khong xoa tung con roi de lai
        // "@media(...){}"— va khi do KHONG duoc xoa cac con nua, vi dai cua chung nam ben trong.
        if (kidsAlive === 0) dead.push(n);
        else { dead.push(...inner); alive += kidsAlive; }
        continue;
      }
      if (n.name === 'keyframes' || n.name === '-webkit-keyframes') {
        const nm = (/@[\w-]+\s+([^{\s]+)/.exec(n.text) || [, ''])[1];
        if (nm && !anims.has(nm)) { dead.push(n); continue; }
      }
      alive++;                       // @font-face, @import, @charset, @page... giu
    }
    return alive;
  }

  const rows = [];
  let before = 0, after = 0, wrote = 0, emptied = 0, ruleTotal = 0, ruleDrop = 0;

  for (const [url, rec] of [...files].sort()) {
    if (!rec) continue;
    const dead = [];
    collect(rec.tree, rec, usedAnimations(rec), dead);
    dead.sort((a, b) => a.start - b.start);

    let out = rec.css;
    for (let i = dead.length - 1; i >= 0; i--) out = out.slice(0, dead[i].start) + out.slice(dead[i].end);

    const b0 = Buffer.byteLength(rec.css, 'utf8'), b1 = Buffer.byteLength(out, 'utf8');
    before += b0; after += b1;
    ruleTotal += rec.flat.length; ruleDrop += rec.flat.filter(n => !n.keep).length;
    if (b1 < 300) emptied++;
    rows.push([url.replace(base, '').replace(/^\/_assets\/theme\/usa\/wp-content\//, '…/'),
               rec.flat.length, rec.flat.filter(n => !n.keep).length,
               +(b0 / 1024).toFixed(0), +(b1 / 1024).toFixed(0),
               b0 ? Math.round(100 - b1 / b0 * 100) + '%' : '-']);

    if (APPLY && dead.length) {
      const note = '/* ' + rec.flat.filter(n => !n.keep).length + '/' + rec.flat.length
                 + ' quy tac da bo: khong khop phan tu nao tren ' + PAGES.length + ' trang x '
                 + SCREENS.length + ' khung. tools/css-unused.js */\n';
      fs.writeFileSync(rec.file, note + out, 'utf8');
      const mirror = rec.file.replace(SITE, WWW);
      if (fs.existsSync(mirror)) fs.writeFileSync(mirror, note + out, 'utf8');
      wrote++;
    }
  }
  rows.sort((a, b) => b[3] - a[3]);

  heading(APPLY ? 'Da bo CSS khong dung' : 'CSS khong dung — chi bao cao, chua sua gi');
  table(['tep', 'quy tac', 'bo', 'KB truoc', 'KB sau', 'giam'], rows, [false, true, true, true, true, true]);
  console.log('\n  %d lan nap (%d trang x %d khung man hinh). %d quy tac, bo %d.',
              loads, PAGES.length, SCREENS.length, ruleTotal, ruleDrop);
  console.log('  Tong: %s KB -> %s KB, giam %s KB (%d%%). %d tep gan nhu rong han.',
              (before / 1024).toFixed(0), (after / 1024).toFixed(0), ((before - after) / 1024).toFixed(0),
              before ? Math.round(100 - after / before * 100) : 0, emptied);
  console.log('  Cat theo dai byte tren van ban goc: tien to -moz-/-ms- va ban rut gon con nguyen.');

  if (!APPLY) console.log('\n  Chay lai voi --apply de cat that. Ngay sau do PHAI chay parity.js.');
  else console.log('\n  Da ghi %d tep (ca hai cay). Chay parity.js NGAY BAY GIO.', wrote);
  verdict(ruleTotal > 0, `${rows.length} tep CSS, ${ruleDrop}/${ruleTotal} quy tac bo duoc, ${((before - after) / 1024).toFixed(0)} KB`);
})();
