// Chup anh cho sach huong dan - moi anh khoanh dung cai nut ma doan van dang noi toi.
//
//   node tools/guide-shots.js            # can may chu .NET dang chay o :5199
//   node tools/guide-shots.js 13 14      # chi chup lai anh so 13 va 14
//
// Ra docs/huong-dan/NN-ten.png. Chup tren may LAM VIEC (localhost), khong bao gio tren trang that:
// de chup "mot bai tin moi" thi phai them mot bai tin that, va cong cu xoa no di o cuoi roi doi
// chieu tep du lieu - phai y het truoc khi chay. Anh chup lai duoc bat cu luc nao giao dien doi;
// sau do chay tools/guide-check.js de biet sach con noi dung ten nut khong.
//
// Cach khoanh: mot vien cam 3px quanh phan tu va mot nhan nho (so buoc, hay vai chu), ve len
// trang luc chup - vi tri lay tu chinh trang, nen giao dien doi thi vong khoanh doi theo.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { launch, newCtx, wait } = require('./lib/browser');
const { signIn, USER, PASS } = require('./lib/admin');

const BASE = 'http://localhost:5199';
const GOC = path.join(__dirname, '..');
const RA = path.join(GOC, 'docs', 'huong-dan');
const TEP = ['wwwroot/_data/news.json', 'site/_data/news.json'];
const bam = () => TEP.map(t => crypto.createHash('md5').update(fs.readFileSync(path.join(GOC, t))).digest('hex'));
const CHI = process.argv.slice(2).map(Number);
const can = n => CHI.length === 0 || CHI.includes(n);

const TIEU_DE = 'New anodising line opens in Hai Phong';
const SLUG = 'new-anodising-line-opens-in-hai-phong';
const W = { width: 1280, height: 800 };
const CAM = '#e8590c';

/**
 * Vien cam quanh mot phan tu, va mot nhan tuy chon.
 *
 * Ve tren TRANG CHINH, o toa do ma Playwright do duoc, chu khong ve trong tai lieu cua phan tu:
 * khung xem trang bi thu nho (transform), nen nhan ve ben trong no nho theo - lan chup dau nhan
 * trong khung chi con 7px. Ve o ngoai thi moi nhan cung mot co, va vong khoanh khong bi mot cot
 * cuon hay overflow:hidden cat mat.
 *
 * side: 'tr' tren canh phai (mac dinh - nhan o ben trai o nhap la ten o, dung che no),
 *       'tl' tren canh trai, 'l' ben trai, 'r' ben phai, 'b' ben duoi.
 */
const tags = [];
async function mark(loc, text, side = 'tr') {
  const p = loc.page();
  const r = await loc.first().boundingBox();
  if (!r) throw new Error('khong thay de khoanh: ' + loc);
  const box = await p.evaluate(([r, text, side, cam]) => {
    const mk = css => { const e = document.createElement('div'); e.className = 'gs-x'; e.style.cssText = css; document.body.appendChild(e); return e; };
    mk('position:fixed;z-index:2147483646;pointer-events:none;border:3px solid ' + cam + ';border-radius:4px;' +
       'left:' + (r.x - 5) + 'px;top:' + (r.y - 5) + 'px;width:' + (r.width + 10) + 'px;height:' + (r.height + 10) + 'px');
    if (!text) return null;
    const t = mk('position:fixed;z-index:2147483647;pointer-events:none;background:' + cam + ';color:#fff;' +
       'font:600 13px/1 "Segoe UI",system-ui,sans-serif;padding:5px 9px;border-radius:12px;white-space:nowrap;' +
       'box-shadow:0 1px 3px rgba(0,0,0,.25)');
    t.textContent = text;
    const w = t.offsetWidth, h = t.offsetHeight, W = innerWidth, H = innerHeight;
    let x, y;
    if (side === 'l') { x = r.x - w - 12; y = r.y + r.height / 2 - h / 2; }
    else if (side === 'r') { x = r.x + r.width + 12; y = r.y + r.height / 2 - h / 2; }
    else if (side === 'b') { x = r.x - 2; y = r.y + r.height + 9; }
    else { x = side === 'tl' ? r.x - 2 : r.x + r.width - w + 2; y = r.y - h - 9; if (y < 2) y = r.y + r.height + 9; }
    x = Math.max(2, Math.min(x, W - w - 2)); y = Math.max(2, Math.min(y, H - h - 2));
    t.style.left = x + 'px'; t.style.top = y + 'px';
    return { x, y, width: w, height: h };
  }, [r, text || '', side, CAM]);
  tags.push({ x: r.x - 8, y: r.y - 8, width: r.width + 16, height: r.height + 16 });
  if (box) tags.push(box);
}

async function unmark(p) {
  await p.evaluate(() => document.querySelectorAll('.gs-x').forEach(e => e.remove())).catch(() => {});
  tags.length = 0;
}

const made = [];

/** Chup. Co vung thi cat theo hop bao cac vung, vong khoanh va nhan (+ dem); khong thi ca khung. */
async function shot(p, ten, vung, dem = 16) {
  const file = path.join(RA, ten + '.png');
  let clip;
  if (vung && vung.length) {
    const hop = [...tags];
    for (const v of vung) { const b = await v.first().boundingBox(); if (b) hop.push(b); }
    const vp = p.viewportSize();
    const x0 = Math.floor(Math.max(0, Math.min(...hop.map(b => b.x)) - dem));
    const y0 = Math.floor(Math.max(0, Math.min(...hop.map(b => b.y)) - dem));
    const x1 = Math.ceil(Math.min(vp.width, Math.max(...hop.map(b => b.x + b.width)) + dem));
    const y1 = Math.ceil(Math.min(vp.height, Math.max(...hop.map(b => b.y + b.height)) + dem));
    clip = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
  }
  await wait(250);
  await p.screenshot({ path: file, clip });
  await unmark(p);
  made.push([ten, clip ? clip.width + 'x' + clip.height : 'ca man hinh']);
}

(async () => {
  fs.mkdirSync(RA, { recursive: true });
  const truoc = bam();
  const b = await launch();

  // ---- 1. Dang nhap - mot ngu canh chua dang nhap
  if (can(1)) {
    const c0 = await newCtx(b, W);
    const p0 = await c0.newPage();
    await p0.goto(BASE + '/Admin', { waitUntil: 'networkidle' });
    await p0.fill('input[name=username]', USER);
    await p0.fill('input[name=password]', 'xxxxxxxxxx');
    const form = p0.locator('form:has(input[name=password])');
    await mark(p0.locator('input[name=username]'), '1');
    await mark(p0.locator('input[name=password]'), '2');
    await mark(p0.locator('button.ad-save'), '3');
    await shot(p0, '01-dang-nhap', [form], 28);
    await c0.close();
  }

  const ctx = await newCtx(b, W);
  const p = await ctx.newPage();
  p.on('dialog', d => d.accept());
  await signIn(p, BASE);
  const frame = () => p.frames()[1];
  const cot = p.locator('#ed-fields');
  const o = a => p.locator('[data-address="' + a + '"]');
  const doiTai = async () => { await p.waitForLoadState('networkidle'); await wait(2200); };
  const editor = async q => { await p.goto(BASE + '/Admin' + (q || ''), { waitUntil: 'networkidle' }); await wait(2500); };

  try {
    // ---- 2. Doi mat khau
    if (can(2)) {
      await p.goto(BASE + '/Admin/Account/Password', { waitUntil: 'networkidle' });
      const form = p.locator('form:has(input[name=next])');
      await mark(p.locator('input[name=current]'), '1');
      await mark(p.locator('input[name=next]'), '2');
      await mark(p.locator('input[name=confirm]'), '2');
      await mark(p.locator('button.ad-save'), '3');
      await shot(p, '02-doi-mat-khau', [form], 28);
    }

    // ---- 3. Thanh tren cung
    if (can(3)) {
      await editor();
      await mark(p.locator('.ad-nav'), 'Năm mục chính');
      await mark(p.locator('.ad-right'), 'Xem trang · mật khẩu · đăng xuất');
      await shot(p, '03-thanh-tren', [p.locator('.ad-top')], 6);
    }

    // ---- 4. Man hinh sua, ca man hinh
    if (can(4)) {
      await editor();
      await mark(p.locator('#ed-page'), '1  Chọn trang', 'tl');
      await mark(p.locator('#ed-fields'), '2  Các ô nhập', 'tl');
      await mark(p.locator('#ed-stage'), '3  Trang web thật', 'tl');
      await mark(p.locator('.ed-widths'), '4  Cỡ màn hình', 'l');
      await mark(p.locator('#ed-save'), '5  Lưu', 'r');
      await shot(p, '04-man-hinh-sua');
    }

    // ---- 5, 6. Ctrl-bam roi go - dung trang tin, chu tieu de cua bai dau
    if (can(5) || can(6)) {
      await editor('?page=%2Fnews%2F');
      const chu = frame().locator('[data-ab-t$="title"]').first();
      await chu.click({ modifiers: ['Control'] });
      await wait(300);
      // Mau xanh "tim thay" chi sang 900ms; lay o qua con tro (reveal() dat con tro vao do) roi
      // bat lai mau ay cho anh chup - dung cai nguoi dung thay trong khoanh khac do.
      const addr = await p.evaluate(() => document.activeElement.getAttribute('data-address'));
      const found = o(addr);
      await found.evaluate(e => e.classList.add('is-found'));
      if (can(5)) {
        await mark(chu, 'Ctrl + bấm vào chữ', 'tl');
        await mark(found, 'Ô của chữ đó sáng lên');
        await shot(p, '05-ctrl-bam');
      }
      if (can(6)) {
        await found.evaluate(e => e.classList.remove('is-found'));
        const cu = await o(addr).inputValue();
        await o(addr).fill(cu + ' (sửa thử)');
        await wait(600);
        await mark(o(addr), '1  Gõ vào ô');
        await mark(chu, 'Trang đổi theo ngay', 'tl');
        await mark(p.locator('#ed-save'), '2  Bấm lưu', 'r');
        await shot(p, '06-luu');
        await o(addr).fill(cu);            // tra lai, khong luu
        await wait(300);
      }
    }

    // ---- 7, 8, 9. O anh, kho anh, nhom Search result - tren trang mot bai tin
    if (can(7) || can(8) || can(9)) {
      await p.goto(BASE + '/Admin/Collection/Items/news', { waitUntil: 'networkidle' });
      const sua = await p.locator('tbody tr').first().locator('a:has-text("Edit")').getAttribute('href');
      await p.goto(BASE + sua, { waitUntil: 'networkidle' });
      await wait(2500);
      const oAnh = p.locator('.ed-field-img').first();
      await oAnh.scrollIntoViewIfNeeded();
      if (can(7)) {
        await mark(oAnh.locator('.ed-choose'), 'Bấm để chọn ảnh', 'r');
        await mark(oAnh.locator('.ed-slot'), 'Cỡ ảnh nên dùng', 'b');
        await shot(p, '07-o-anh', [oAnh], 24);
      }
      if (can(8)) {
        await oAnh.locator('.ed-choose').click();
        await wait(1500);
        await mark(p.locator('.ed-upload'), 'Tải ảnh mới lên');
        await mark(p.locator('.ed-tile').nth(1), 'Hoặc bấm một ảnh có sẵn');
        await mark(p.locator('.ed-tile.is-none'), 'Bỏ ảnh');
        await shot(p, '08-kho-anh');
        await p.click('#ed-shelf-close');
        await wait(400);
      }
      if (can(9)) {
        const nhom = p.locator('details.ed-group:has(> summary:has-text("Search result"))');
        await nhom.evaluate(d => { d.open = true; d.scrollIntoView({ block: 'start' }); });
        await wait(500);
        await mark(nhom.locator('> summary'), 'Phần hiện trên Google');
        await shot(p, '09-search-result', [nhom], 12);
      }
    }

    // ---- 10, 11. Man hinh Content, va hop hoi truoc khi xoa
    if (can(10) || can(11)) {
      await p.goto(BASE + '/Admin/Collection/Items/news', { waitUntil: 'networkidle' });
      if (can(10)) {
        const d1 = p.locator('tbody tr').first();
        await mark(p.locator('.ad-addbar button'), 'Thêm bài', 'r');
        await mark(d1.locator('.ad-state'), 'Ẩn / hiện');
        await mark(d1.locator('.ad-order'), 'Đổi thứ tự');
        await mark(d1.locator('a:has-text("Edit")'), 'Sửa');
        await mark(d1.locator('button:has-text("Delete")'), 'Xoá');
        await shot(p, '10-content', [p.locator('.ad-crumb'), p.locator('tbody tr').nth(2)], 12);
      }
      if (can(11)) {
        await p.locator('tbody tr').nth(1).locator('button:has-text("Delete")').click();
        await p.waitForLoadState('networkidle');
        const hoi = p.locator('.ad-confirm');
        await mark(hoi.locator('button:has-text("Yes, delete it")'), 'Xoá thật');
        await mark(hoi.locator('a:has-text("Keep it")'), 'Thôi, giữ lại');
        await shot(p, '11-hoi-xoa', [hoi], 20);
        await hoi.locator('a:has-text("Keep it")').click();
        await p.waitForLoadState('networkidle');
      }
    }

    // ---- 12. Ke trang chu
    if (can(12)) {
      await p.goto(BASE + '/Admin/Collection/Items/home-news', { waitUntil: 'networkidle' });
      const d1 = p.locator('tbody tr').first();
      await mark(d1.locator('.ad-pick select'), '1  Chọn bài', 'tl');
      await mark(d1.locator('.ad-pick button'), '2  Set', 'b');
      await shot(p, '12-ke-trang-chu', [p.locator('.ad-crumb'), p.locator('tbody tr').nth(1)], 12);
    }

    // ---- 13, 14. Bai tin moi: ngay, doan van, the
    if (can(13) || can(14)) {
      await p.goto(BASE + '/Admin/Collection/Items/news', { waitUntil: 'networkidle' });
      await p.click('text=Add an item');
      await p.waitForLoadState('networkidle');
      const sua = await p.locator('tbody tr').first().locator('a:has-text("Edit")').getAttribute('href');
      await p.goto(BASE + sua, { waitUntil: 'networkidle' });
      await wait(2500);
      if (can(13)) {
        await o('news.items.0.title').fill(TIEU_DE);
        await o('news.items.0.date').fill('2026-09-28');
        await o('news.items.0.date').dispatchEvent('change');
        await wait(300);
        await mark(o('news.items.0.title'), 'Tiêu đề');
        await mark(o('news.items.0.date'), 'Ngày đăng', 'r');
        await shot(p, '13-bai-moi', [o('news.items.0.title'), o('news.items.0.date').locator('xpath=..')], 14);
      }
      if (can(14)) {
        if (!can(13)) await o('news.items.0.title').fill(TIEU_DE);
        await cot.locator('button:has-text("Add a paragraph")').click();
        await doiTai();
        await o('news.items.0.body.0').fill('The line coats up to 2,500 tonnes of profile a year in 24 colours.');
        await cot.locator('button:has-text("Add a paragraph")').click();
        await doiTai();
        await o('news.items.0.body.1').fill('It runs beside the extrusion presses, so profiles no longer travel between sites.');
        await wait(300);
        const doan2 = o('news.items.0.body.1').locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ed-field ")][1]');
        await mark(doan2.locator('.ed-listrow button').first(), '↑ ↓ đổi thứ tự', 'l');
        await mark(doan2.locator('.ed-listrow button:has-text("Remove")'), 'Xoá đoạn', 'r');
        await mark(cot.locator('button:has-text("Add a paragraph")'), 'Thêm một đoạn nữa', 'b');
        await shot(p, '14-doan-van', [o('news.items.0.body.0'), cot.locator('button:has-text("Add a paragraph")')], 34);
      }
    }

    // ---- 15. Enquiries, 16. History, 17. Pictures
    if (can(15)) {
      await p.goto(BASE + '/Admin/Enquiry', { waitUntil: 'networkidle' });
      await mark(p.locator('.ad-enquiry').first(), 'Đơn mới nhất ở trên cùng');
      await shot(p, '15-enquiries', [p.locator('h1'), p.locator('.ad-enquiry').first()], 16);
    }
    if (can(16)) {
      await p.goto(BASE + '/Admin/History', { waitUntil: 'networkidle' });
      await mark(p.locator('.ad-filter'), 'Lọc theo loại nội dung');
      await mark(p.locator('tbody tr').first().locator('a:has-text("Look at it")'), 'Xem');
      await mark(p.locator('tbody tr').first().locator('button:has-text("Restore this version")'), 'Lấy lại bản này');
      await shot(p, '16-history', [p.locator('h1'), p.locator('tbody tr').nth(3)], 12);
    }
    if (can(17)) {
      await p.goto(BASE + '/Admin/Media', { waitUntil: 'networkidle' });
      await mark(p.locator('.ad-drop'), 'Tải ảnh lên');
      await mark(p.locator('.ad-media button:has-text("Delete")').first(), 'Xoá ảnh');
      await shot(p, '17-pictures');
    }

    // ---- 18. Trang lien he that, nut START
    if (can(18)) {
      await p.goto(BASE + '/contact/', { waitUntil: 'networkidle' });
      await wait(1200);
      // "text=START" thi khop ca chu an trong trang; nut that la .ab-route-cta cua o dau tien.
      const bon = p.locator('#ab-routes');
      await bon.evaluate(e => e.scrollIntoView({ block: 'center' }));
      await wait(600);
      await mark(bon.locator('.ab-route-cta').first(), 'Bấm để mở form báo giá');
      await shot(p, '18-lien-he', [bon], 24);
    }
  } catch (e) {
    console.log('  HONG giua chung: ' + e.message.split(/\r?\n/)[0]);
    process.exitCode = 1;
  } finally {
    // Don bai thu (neu co), du buoc nao o tren co hong.
    await wait(1500);
    await p.goto(BASE + '/Admin/Collection/Items/news', { waitUntil: 'networkidle' });
    const dong = p.locator('tbody tr').first();
    const h = decodeURIComponent(await dong.locator('a:has-text("Edit")').getAttribute('href'));
    if (h.includes(SLUG) || /new-[0-9a-f]{6}/.test(h)) {
      await dong.locator('button:has-text("Delete")').click();
      await p.waitForLoadState('networkidle');
      await p.locator('button:has-text("Yes, delete it")').click();
      await p.waitForLoadState('networkidle');
    }
    await b.close();
  }

  console.log('');
  for (const [n, s] of made) console.log('  ' + n.padEnd(22) + s);
  const sach = JSON.stringify(bam()) === JSON.stringify(truoc);
  console.log('');
  console.log('  ' + made.length + ' anh -> docs/huong-dan/   du lieu tin: ' + (sach ? 'y het truoc khi chay' : 'KHAC - kiem tra lai!'));
  process.exit(sach && !process.exitCode ? 0 : 1);
})();
