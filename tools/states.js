// Chup cac trang thai mot anh chup trang nam yen khong bao gio thay.
//
//   node tools/states.js                 -> anh vao tools/out/states/
//   node tools/states.js --origin http://127.0.0.1:5117
//
// Vi sao can: parity.js chup trang o trang thai nghi. Menu dien thoai dong, hero dang anh sang,
// form chua gui, header chua cuon. Lan cat CSS dau tien bo mat ".abh-nav.is-open" va parity van
// bao "15/15 khong lech pixel nao" - cau tra loi dung cho mot cau hoi khong phu duoc cho hong.
//
// Moi trang thai o day tung la mot loi that hoac mot loi suyt xay ra.
const path = require('path');
const fs = require('fs');
const { launch, newCtx, wait } = require('./lib/browser');
const { serve } = require('./lib/static');
const { heading, verdict } = require('./lib/report');

const ROOT = path.join(__dirname, '..');
const SITE = path.join(ROOT, 'site');
const OUT = path.join(__dirname, 'out', 'states');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const PORT = +arg('port', 5119);
const ORIGIN = arg('origin', null);

/**
 * Moi muc: mo trang o khung nay, lam viec nay, chup lai.
 * `check` chay trong trang sau khi `act` xong; tra ve chuoi rong la dat, khac la hong.
 */
const STATES = [
  {
    name: 'menu-mo', page: '/', w: 390, h: 844,
    act: () => document.querySelector('.abh-burger').click(),
    check: () => {
      const nav = document.querySelector('.abh-nav');
      if (!nav) return 'khong tim thay .abh-nav';
      const d = getComputedStyle(nav).display;
      return d === 'none' ? 'menu van an (display:none) sau khi bam' : '';
    },
  },
  {
    name: 'header-da-cuon', page: '/products/', w: 1440, h: 900,
    act: () => window.scrollTo(0, 600),
    check: () => {
      const bar = document.querySelector('.abh-bar');
      if (!bar) return 'khong tim thay .abh-bar';
      return bar.classList.contains('is-over') && !getComputedStyle(bar).backgroundColor
        ? 'thanh dau trang khong con nen khi cuon' : '';
    },
  },
  {
    name: 'hero-anh-toi', page: '/', w: 1440, h: 900,
    act: () => {
      const h = document.querySelector('.abhero');
      if (h) h.classList.add('is-dark');
    },
    check: () => {
      const cap = document.querySelector('.abhero-caption');
      if (!cap) return '';
      const c = getComputedStyle(cap).color;
      const m = /(\d+),\s*(\d+),\s*(\d+)/.exec(c);
      if (!m) return '';
      const lum = (+m[1] + +m[2] + +m[3]) / 3;
      return lum < 128 ? 'chu chu thich van toi mau tren anh toi (' + c + ')' : '';
    },
  },
  {
    // Gui form rong -> .ab-field.is-bad + .ab-form-note.is-bad. Hai lop nay chi ton tai trong
    // mot phan nghin giay sau cu bam, va chinh la loai quy tac de bi cat nham nhat.
    name: 'form-loi', page: '/contact/quote/', w: 1440, h: 900,
    act: () => {
      const b = document.querySelector('.ab-form button, .ab-form [type=submit]');
      if (b) b.click();
    },
    check: () => {
      const note = document.querySelector('.ab-form-note');
      if (!note) return 'khong tim thay .ab-form-note (trang co form khong?)';
      if (note.hidden) return 'form rong ma khong bao loi';
      const c = getComputedStyle(note).color;
      return /rgb\(0,\s*0,\s*0\)/.test(c) ? 'dong bao loi mat mau do (' + c + ')' : '';
    },
  },
  {
    name: 'tai-hong', page: '/news/', w: 1440, h: 900,
    act: () => {
      const host = document.querySelector('main') || document.body;
      const d = document.createElement('div');
      d.className = 'ab-fail';
      d.innerHTML = '<p>Could not load this section.</p>';
      host.prepend(d);
    },
    check: () => {
      const el = document.querySelector('.ab-fail');
      const p = getComputedStyle(el).paddingTop;
      return p === '0px' ? 'khoi bao loi mat dinh dang (padding 0)' : '';
    },
  },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const server = ORIGIN ? null : serve(SITE, PORT);
  const base = ORIGIN || 'http://127.0.0.1:' + PORT;
  const b = await launch();
  const bad = [];

  try {
    for (const s of STATES) {
      const ctx = await newCtx(b, { width: s.w, height: s.h });
      const page = await ctx.newPage();
      await page.goto(base + s.page, { waitUntil: 'load', timeout: 40000 });
      await wait(900);
      await page.evaluate(s.act);
      await wait(600);
      const err = await page.evaluate(s.check);
      const file = path.join(OUT, s.name + '.png');
      await page.screenshot({ path: file });
      console.log('  ' + s.name.padEnd(16) + (s.w + 'x' + s.h).padEnd(12) + (err ? 'HONG: ' + err : 'dat'));
      if (err) bad.push(s.name + ': ' + err);
      await ctx.close();
    }
  } finally {
    await b.close();
    if (server) server.close();
  }

  heading('Trang thai chi hien ra khi tuong tac');
  console.log('  Anh o %s — phai NHIN, vi check() chi bat duoc cai no biet hoi.', OUT);
  verdict(bad.length === 0, bad.length ? bad.join('; ') : STATES.length + '/' + STATES.length + ' trang thai con dinh dang');
})();
