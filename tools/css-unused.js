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
// TRANG THAI DO JAVASCRIPT BAT
//
// Mot trang nam yen khong bao gio hien het cac lop cua no. Lan chay dau tien cua cong cu nay
// do dung nhu the, va no bo mat ".abh-nav.is-open { display: flex }" - quy tac DUY NHAT lam
// menu tren dien thoai mo ra. Bo chon do chi khop khi menu dang mo, ma luc do thi khong ai bam.
//
// parity.js khong bat duoc: no chup trang o trang thai nghi, va o trang thai nghi thi menu
// dong - dung nhu truoc khi cat. Phep do "khong lech mot pixel nao" van dung, va van bo sot.
//
// Nen truoc khi hoi, PHAI bam. Moi trang, moi khung man hinh: mo menu, bam bo loc, mo moi thu
// co aria-expanded, roi hoi lai. Danh sach o POKE khong the day du; no chi can day du hon mot
// trang nam yen.
//
// ---------------------------------------------------------------------------------------------
// CHO PHEP DO NAY VAN KHONG NHIN THAY
//
// Hop thoai, thong bao loi, trang thai sau khi gui form - nhung thu can mot chuoi thao tac dai
// hon mot cu bam. Sau --apply PHAI chay parity.js VA thu tay menu + form. Mot pixel doi, hoac
// mot cu bam khong ra gi, la co quy tac bi bo nham.
const fs = require('fs');
const path = require('path');
const { launch, newCtx, wait } = require('./lib/browser');
const { serve } = require('./lib/static');
const { PAGES } = require('./lib/pages');
const { table, heading, verdict } = require('./lib/report');

const ROOT = path.join(__dirname, '..');
const SITE = path.resolve(path.join(ROOT, 'site'));
const WWW = path.resolve(path.join(ROOT, 'wwwroot'));
const APPLY = process.argv.includes('--apply');
const PORT = (() => { const i = process.argv.indexOf('--port'); return i > 0 ? +process.argv[i + 1] : 5118; })();

const SCREENS = [{ width: 1440, height: 1000 }, { width: 860, height: 1000 }, { width: 390, height: 844 }];

/**
 * KHONG dong vao _app/. Do la CSS minh tu viet (~40 KB), khong phai 1,9 MB theme tai ve, va no
 * day dac cac lop do JS bat: .abhero.is-dark (chi khi anh hero toi mau), .abh-bar.is-over (chi
 * khi da cuon), .ab-fail (chi khi tai du lieu hong). Cat ca tep nay tiet kiem ~1% va doi lai
 * dung loai loi da lam mat menu dien thoai lan truoc. Loi it, hai nhieu.
 */
const SKIP = /[\\/]_app[\\/]/;

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

/**
 * Ten lop ma JavaScript cua site tu dat vao hoac tu tim.
 *
 * POKE bam duoc den dau thi biet den do; cai nay la dang tong quat cua no. Mot lop do JS bat chi
 * ton tai trong DOM o dung khoanh khac no duoc bat, va anh chup khong bao gio trung dung khoanh
 * khac ay. Nhung ten lop thi nam san trong ma nguon. Quy tac: JS biet ten thi CSS o lai.
 *
 * Chi lay ba dau hieu, khong lay moi chuoi:
 *   1. classList.add/remove/toggle/..., addClass/removeClass/toggleClass (jQuery), className = ...
 *   2. class="..." nam trong mot chuoi — tuc la mot manh HTML do JS dung ra
 *   3. chuoi nhin nhu bo chon CSS (".abh-burger", "div.card") — querySelector, closest, matches
 *
 * Lay moi chuoi thi tap tu phinh len 9.819 va giu lai ca CSS chet, vi "active" hay "container"
 * co mat trong moi tep JS tren doi duoi dang khoa du lieu chu khong phai ten lop.
 *
 * Quet ca .js va <script> noi tuyen trong .html (trang chu giu hai khoi canvas o do).
 */
function jsTokens() {
  const set = new Set();
  const words = s => { for (const w of s.split(/[^\w-]+/)) if (/^[A-Za-z][\w-]*$/.test(w)) set.add(w); };

  /**
   * Cac chuoi ky tu trong mot tep JS, kem vi tri.
   *
   * Phai di tung ky tu chu khong dung bieu thuc chinh quy. Ban dung bieu thuc chinh quy chay
   * truoc no bat duoc 68 chuoi trong app.js thay vi hang tram: mot dau nhay don trong chu thich
   * ("the theme's chrome") mo mot chuoi gia keo dai den dau nhay don tiep theo, va tu do moi
   * thu lech pha. Lop ".ab-fail" bien mat vi ly do do.
   */
  function strings(src) {
    const out = [];
    let i = 0, prev = '';
    while (i < src.length) {
      const c = src[i];
      if (c === '/' && src[i + 1] === '/') { const e = src.indexOf('\n', i); i = e < 0 ? src.length : e; continue; }
      if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? src.length : e + 2; continue; }
      // Dau / con lai: bieu thuc chinh quy neu dung sau mot toan tu, con lai la phep chia.
      if (c === '/' && '(,=:[!&|?{};+-*%~^<>'.includes(prev)) {
        i++;
        while (i < src.length && src[i] !== '/' && src[i] !== '\n') {
          if (src[i] === '\\') i++;
          else if (src[i] === '[') { while (i < src.length && src[i] !== ']' && src[i] !== '\n') i += src[i] === '\\' ? 2 : 1; }
          i++;
        }
        i++; prev = '/'; continue;
      }
      if (c === '"' || c === "'" || c === '`') {
        const q = c, from = ++i;
        while (i < src.length && src[i] !== q) i += src[i] === '\\' ? 2 : 1;
        out.push(src.slice(from, i)); i++; prev = q; continue;
      }
      if (!/\s/.test(c)) prev = c;
      i++;
    }
    return out;
  }

  const add = src => {
    const all = strings(src);
    // 1. Goi ham dat lop: lay het chuoi trong cap ngoac theo sau.
    for (const m of src.matchAll(/(?:classList\s*\.\s*(?:add|remove|toggle|replace|contains)|\.\s*(?:addClass|removeClass|toggleClass|hasClass)|className\s*[+]?=|setAttribute\s*\(\s*['"]class['"]\s*,)([^;\n]{0,300})/g))
      for (const s of m[1].matchAll(/(['"`])((?:\\.|(?!\1)[^\\])*)\1/g)) words(s[2]);
    // 2 va 3. Xet tung chuoi: manh HTML co class=, hoac ban than la mot bo chon co dau cham.
    for (const s of all) {
      for (const c of s.matchAll(/class\s*=\s*(?:\\?["'])([^"'\\]{0,300})/g)) words(c[1]);
      if (/^[.#[]|[\s>+~][.]/.test(s) && s.length < 200)
        for (const c of s.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) set.add(c[1]);
    }
  };

  const walk = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (p.endsWith('.js')) add(fs.readFileSync(p, 'utf8'));
      else if (p.endsWith('.html'))
        for (const m of fs.readFileSync(p, 'utf8').matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) add(m[1]);
    }
  };
  walk(SITE);
  return set;
}

/**
 * Bam vao nhung thu bam duoc, de DOM hien ra cac lop ma JavaScript bat.
 *
 * Tra ve so lan bam duoc. Mot con so 0 o day nghia la phep do da quay ve dung cai bay lam mat
 * menu dien thoai lan truoc - nen no duoc in ra kem canh bao chu khong im lang.
 */
const POKE = () => {
  let n = 0;
  const click = el => {
    try {
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) return;          // an han thi bam cung khong doi gi
      el.click(); n++;
    } catch (e) { /* the khong bam duoc: bo qua */ }
  };
  // 1. Menu tren dien thoai, va moi thu tu khai bao la dong/mo duoc.
  document.querySelectorAll('.abh-burger, [aria-expanded], [aria-controls], summary').forEach(click);
  // 2. Bo loc va the: bam vai cai dau, du de lop "dang chon" xuat hien.
  [...document.querySelectorAll('.ab-chip, [role="tab"], [class*="filter"] button')]
    .slice(0, 4).forEach(click);
  // 3. Dua con tro vao o nhap dau tien: mot so theme to o dang nhap qua lop tren the cha.
  const f = document.querySelector('input, textarea, select');
  if (f) { try { f.focus(); n++; } catch (e) { /* */ } }
  return n;
};

(async () => {
  const server = serve(SITE, PORT);
  const base = 'http://127.0.0.1:' + PORT;
  const b = await launch();

  const files = new Map();   // url -> {file, css, tree, flat}
  let loads = 0, pokes = 0, opened = 0;

  const load = url => {
    if (files.has(url)) return files.get(url);
    const file = path.join(SITE, decodeURIComponent(new URL(url).pathname));
    if (!fs.existsSync(file) || SKIP.test(file)) { files.set(url, null); return null; }
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

        // Hoi hai lan: mot lan o trang thai nghi, mot lan sau khi da bam moi thu bam duoc.
        const ask = async () => {
          const todo = [];
          for (const rec of files.values()) {
            if (!rec) continue;
            for (const n of rec.flat) if (!n.keep) todo.push(n);
          }
          if (!todo.length) return 0;
          const yes = await page.evaluate(MATCH, todo.map(n => n.sel));
          let got = 0;
          for (let i = 0; i < yes.length; i++) if (yes[i]) { todo[i].keep = true; got++; }
          return got;
        };
        await ask();
        pokes += await page.evaluate(POKE);
        await wait(500);
        opened += await ask();
      }
      await ctx.close();
    }
  } finally {
    await b.close();
    server.close();
  }

  // --- rao thu hai: ten lop nao JS biet thi giu, khong can DOM chung minh ------------------
  const TOKENS = jsTokens();
  let byJs = 0;
  for (const rec of files.values()) {
    if (!rec) continue;
    for (const n of rec.flat) {
      if (n.keep) continue;
      for (const m of n.sel.matchAll(/\.(-?[A-Za-z_][\w-]*)/g))
        if (TOKENS.has(m[1])) { n.keep = true; byJs++; break; }
    }
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
  console.log('  Da bam %d lan; %d quy tac chi lo ra SAU khi bam (menu mo, the dang chon...).',
              pokes, opened);
  if (!pokes) console.log('  KHONG BAM DUOC GI - kiem lai POKE truoc khi tin ket qua nay.');
  console.log('  Giu them %d quy tac vi ten lop cua chung nam trong chuoi JS (%d tu). Bo qua _app/.',
              byJs, TOKENS.size);
  console.log('  Tong: %s KB -> %s KB, giam %s KB (%d%%). %d tep gan nhu rong han.',
              (before / 1024).toFixed(0), (after / 1024).toFixed(0), ((before - after) / 1024).toFixed(0),
              before ? Math.round(100 - after / before * 100) : 0, emptied);
  console.log('  Cat theo dai byte tren van ban goc: tien to -moz-/-ms- va ban rut gon con nguyen.');

  if (!APPLY) console.log('\n  Chay lai voi --apply de cat that. Ngay sau do PHAI chay parity.js.');
  else console.log('\n  Da ghi %d tep (ca hai cay). Chay parity.js NGAY BAY GIO.', wrote);
  verdict(ruleTotal > 0, `${rows.length} tep CSS, ${ruleDrop}/${ruleTotal} quy tac bo duoc, ${((before - after) / 1024).toFixed(0)} KB`);
})();
