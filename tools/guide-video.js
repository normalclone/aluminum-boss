// Quay một đoạn hướng dẫn: đổi nội dung một khối trên trang chủ, từ đầu đến cuối.
//
// HANDOVER nói được cách làm, nhưng người sắp dùng site lần đầu không đọc tài liệu - họ mở màn
// hình lên và nhìn. Đoạn phim này đi đúng một đường thật, trên chính máy chủ đang chạy, và cuộn
// tới đâu thao tác tới đó: con trỏ bay tới chỗ sắp bấm, trang cuộn cho nó vào giữa màn hình, rồi
// mới bấm. Phụ đề tiếng Việt cháy sẵn vào hình - không lồng tiếng, không tệp .vtt rời để lạc.
//
//   node guide-video.js [origin] [--out <thư-mục>] [--keep-webm]
//
// Để lại: mp4 trong tools/out/. KHÔNG để lại thay đổi nội dung - highlights.json ở cả hai cây
// được chụp lại trước khi quay và ghi đè lại sau khi quay xong. Một dòng trong History thì vẫn
// còn, và đó là sự thật: đoạn phim đã bấm Save thật.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { launch, newCtx, wait } = require('./lib/browser');
const { signIn, USER } = require('./lib/admin');
const { heading, table, verdict } = require('./lib/report');

const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const BASE = (argv.find(a => a.startsWith('http')) || 'http://127.0.0.1:5117').replace(/\/$/, '');
const ROOT = path.join(__dirname, '..');
const OUT = opt('out', path.join(__dirname, 'out'));
const KEEP = argv.includes('--keep-webm');

const W = 1440, H = 900;
const DOC = 'highlights';
const TITLE = 'Dây chuyền sơn tĩnh điện thứ hai đã chạy';

// Hai cây phải luôn khớp nhau (xem trees.py), nên chụp lại và trả lại cả hai.
const TREES = ['wwwroot', 'site'].map(t => path.join(ROOT, t, '_data', DOC + '.json'));

/* ---- phụ đề và con trỏ, vẽ đè lên trang -------------------------------------------------- */
//
// Cháy thẳng vào hình chứ không xuất tệp phụ đề rời: đoạn phim này sẽ được gửi qua Telegram, dán
// vào tài liệu, chép sang USB - một tệp .vtt đi kèm sẽ lạc mất ngay lần chuyển thứ nhất.
//
// Con trỏ là một chấm tự vẽ. Chrome khi quay không vẽ con trỏ thật vào khung hình, nên không có
// nó thì mọi thứ trên phim tự xảy ra, và người xem không biết phải nhìn đâu.
const OVERLAY = `
(function () {
  if (window.__guide) return;
  var css = document.createElement('style');
  css.textContent =
    '#gd-sub{position:fixed;left:0;right:0;bottom:0;z-index:99999;padding:18px 40px 24px;' +
    'background:linear-gradient(transparent,rgba(0,0,0,.82) 38%);color:#fff;' +
    'font:500 22px/1.45 "Segoe UI",system-ui,sans-serif;text-align:center;' +
    'text-shadow:0 2px 6px rgba(0,0,0,.6);pointer-events:none;opacity:0;' +
    'transition:opacity .25s}' +
    '#gd-sub.on{opacity:1}' +
    '#gd-dot{position:fixed;z-index:99998;width:22px;height:22px;margin:-11px 0 0 -11px;' +
    'border-radius:50%;background:rgba(31,106,68,.35);border:2px solid #1f6a44;' +
    'pointer-events:none;transition:left .55s cubic-bezier(.4,0,.2,1),' +
    'top .55s cubic-bezier(.4,0,.2,1);left:-50px;top:-50px}' +
    '#gd-dot.tap{animation:gd-tap .45s ease-out}' +
    '@keyframes gd-tap{0%{box-shadow:0 0 0 0 rgba(31,106,68,.5)}' +
    '100%{box-shadow:0 0 0 26px rgba(31,106,68,0)}}';
  document.head.appendChild(css);
  var sub = document.createElement('div'); sub.id = 'gd-sub';
  var dot = document.createElement('div'); dot.id = 'gd-dot';
  document.body.appendChild(sub); document.body.appendChild(dot);
  window.__guide = {
    say: function (t) { sub.textContent = t; sub.className = t ? 'on' : ''; },
    to: function (x, y) { dot.style.left = x + 'px'; dot.style.top = y + 'px'; },
    tap: function () { dot.classList.remove('tap'); void dot.offsetWidth; dot.classList.add('tap'); }
  };
}());`;

const overlay = page => page.evaluate(OVERLAY);
const say = (page, text) => page.evaluate(t => window.__guide.say(t), text);
const point = (page, x, y) => page.evaluate(p => window.__guide.to(p.x, p.y), { x, y });
const tap = page => page.evaluate(() => window.__guide.tap());

/* ---- đưa một thứ vào giữa màn hình rồi mới chạm vào nó ----------------------------------- */

/**
 * Cuộn TỪ TỪ. Playwright tự cuộn trước khi bấm, nhưng nó nhảy một phát - trên ảnh tĩnh thì
 * không sao, trên phim thì người xem mất dấu: khung hình vừa ở chỗ này, khung sau đã ở chỗ khác.
 */
async function bring(locator) {
  await locator.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  await wait(800);
}

/** Toạ độ trên cửa sổ ngoài cùng của một phần tử, để đặt con trỏ lên nó. */
async function at(locator) {
  const box = await locator.boundingBox();
  return box ? { x: box.x + box.width / 2, y: box.y + box.height / 2 } : { x: W / 2, y: H / 2 };
}

/**
 * Toạ độ của một phần tử NẰM TRONG khung xem thử, quy về cửa sổ ngoài.
 *
 * Khung được thu nhỏ bằng transform: scale() nên toạ độ bên trong không phải toạ độ bên ngoài.
 * Lấy tỉ lệ từ chính hình chữ nhật đã biến hình của khung chia cho bề ngang thật của nó, nên
 * công thức này đúng dù fit() dựng transform kiểu gì.
 */
async function inFrame(page, selector) {
  return page.evaluate(sel => {
    var frame = document.getElementById('ed-frame');
    var outer = frame.getBoundingClientRect();
    var scale = outer.width / parseFloat(frame.style.width || frame.width || outer.width);
    var el = frame.contentDocument.querySelector(sel);
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return { x: outer.left + (r.left + r.width / 2) * scale,
             y: outer.top + (r.top + r.height / 2) * scale };
  }, selector);
}

/** Cuộn một phần tử trong khung xem thử vào giữa KHUNG, rồi đợi nó dừng. */
async function bringInFrame(page, selector) {
  await page.evaluate(sel => {
    var el = document.getElementById('ed-frame').contentDocument.querySelector(sel);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, selector);
  await wait(1100);
}

/* ---- kịch bản ---------------------------------------------------------------------------- */

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const raw = path.join(os.tmpdir(), 'guide-raw-' + Date.now());
  fs.mkdirSync(raw, { recursive: true });

  const before = TREES.map(f => fs.readFileSync(f));
  const rows = [];
  let bad = 0;
  const check = (what, ok, detail) => { if (!ok) bad++; rows.push([what, ok ? 'dat' : 'KHONG DAT', detail]); };

  const b = await launch({ scrollbars: true });

  // Đăng nhập ở một ngữ cảnh khác rồi mang cookie sang: máy quay chạy ngay từ lúc ngữ cảnh được
  // tạo ra, nên đăng nhập trong đó là quay luôn cả biểu mẫu đăng nhập và mấy khung hình trắng.
  const gate = await newCtx(b, { width: W, height: H });
  const gatePage = await gate.newPage();
  if (!await signIn(gatePage, BASE)) {
    console.log('  Khong dang nhap duoc bang %s.', USER);
    await b.close();
    process.exit(1);
  }
  const cookies = await gate.cookies();
  await gate.close();

  const ctx = await newCtx(b, { width: W, height: H, video: { dir: raw } });
  await ctx.addCookies(cookies);
  const page = await ctx.newPage();

  await page.goto(BASE + '/Admin', { waitUntil: 'load', timeout: 60000 });
  await page.waitForSelector('#ed-fields .ed-field', { timeout: 30000 });
  await overlay(page);
  await wait(1400);                       // một nhịp lặng trước khi chữ đầu tiên hiện ra

  /* 1 - đây là cái gì */
  await say(page, 'Sửa nội dung: mở /Admin, màn hình mở sẵn ở trang chủ.');
  await wait(3200);
  await say(page, 'Bên phải là trang thật. Bên trái là các ô nhập của chính trang đó.');
  await wait(3600);

  /* 2 - cuộn khung xem thử tới khối "New" của trang chủ */
  await say(page, 'Cuộn khung bên phải xuống khối "New" — các thẻ tin trên trang chủ.');
  const band = '[data-ab-doc="highlights"] .core-slider-novedades__slide';
  await bringInFrame(page, band);
  await wait(1200);

  /* 3 - bấm thẳng vào tiêu đề trong khung xem thử */
  // Phải chỉ rõ tệp: ".items.0.title" là địa chỉ TƯƠNG ĐỐI, và trang chủ có mấy khối cùng dùng
  // nó - khối Applications mang ".tabs.0.items.0.title" cũng khớp nếu tìm bằng *=.
  const titleSel = '[data-ab-doc="highlights"] [data-ab-t=".items.0.title"]';
  const spot = await inFrame(page, titleSel);
  check('tim thay tieu de trong khung xem thu', !!spot, spot ? 'o ' + Math.round(spot.x) + ',' + Math.round(spot.y) : titleSel);
  if (!spot) { await ctx.close(); await b.close(); process.exit(1); }

  await say(page, 'Bấm thẳng vào dòng chữ muốn sửa — không cần biết nó nằm ở ô nào.');
  await point(page, spot.x, spot.y);
  await wait(1500);
  await tap(page);
  await page.mouse.click(spot.x, spot.y);
  await wait(1400);

  /* 4 - ô nhập tương ứng sáng lên ở cột trái */
  const box = page.locator('[data-address="highlights.items.0.title"]');
  await box.waitFor({ state: 'visible', timeout: 15000 });
  await say(page, 'Ô nhập của nó tự cuộn tới và sáng lên ở cột trái.');
  const boxAt = await at(box);
  await point(page, boxAt.x, boxAt.y);
  await wait(3000);

  /* 5 - gõ, và nhìn khung xem thử đổi theo từng phím */
  await say(page, 'Gõ chữ mới. Khung bên phải đổi ngay theo từng phím — chưa ghi gì cả.');
  await box.click();
  await box.fill('');
  await box.type(TITLE, { delay: 55 });
  await wait(1800);

  const live = await page.evaluate(sel =>
    (document.getElementById('ed-frame').contentDocument.querySelector(sel) || {}).textContent,
    titleSel);
  check('khung xem thu doi theo tung phim', (live || '').trim() === TITLE, '"' + (live || '').trim() + '"');
  await wait(1200);

  /* 6 - ô ảnh của chính thẻ ấy, và cỡ nên tải lên */
  const imgField = page.locator('.ed-field-img').filter({
    has: page.locator('[data-address="highlights.items.0.image"]'),
  });
  await say(page, 'Ảnh của thẻ ấy nằm ngay bên dưới. Hai dòng nhỏ là cỡ ô và cỡ nên tải lên.');
  await bring(imgField);
  const fieldAt = await at(imgField);
  await point(page, fieldAt.x, fieldAt.y);
  await wait(3600);

  const slot = (await imgField.locator('.ed-slot').innerText()).replace(/\n/g, ' · ');
  check('o anh noi duoc co can tai len', /\d+ × \d+/.test(slot), slot);

  /* 7 - mở bảng chọn ảnh */
  const choose = imgField.locator('.ed-choose');
  const chooseAt = await at(choose);
  await say(page, 'Bấm Choose picture — bảng ảnh nhắc lại đúng hai con số ấy.');
  await point(page, chooseAt.x, chooseAt.y);
  await wait(1300);
  await tap(page);
  await choose.click();
  await page.waitForSelector('#ed-shelf:not([hidden])', { timeout: 15000 });
  await wait(2600);

  const fit = (await page.locator('#ed-shelf-fit').textContent()).trim();
  check('bang chon anh nhac lai co anh', /\d+ × \d+/.test(fit), fit);

  /* 8 - chọn một tấm */
  const tile = page.locator('.ed-tile').nth(1);
  const tileAt = await at(tile);
  await say(page, 'Chọn một tấm có sẵn, hoặc Add a picture để tải lên từ máy.');
  await point(page, tileAt.x, tileAt.y);
  await wait(1600);
  await tap(page);
  await tile.click();
  await wait(1400);

  /* 9 - lưu */
  const save = page.locator('#ed-save');
  await bring(save);
  const saveAt = await at(save);
  await say(page, 'Chưa bấm Save thì chưa có gì được ghi. Ảnh chỉ hiện ra sau khi lưu.');
  await point(page, saveAt.x, saveAt.y);
  await wait(2800);
  await tap(page);
  await save.click();
  await page.waitForFunction(
    () => /saved/i.test(document.querySelector('#ed-save-note')?.textContent || ''),
    null, { timeout: 30000 });
  await say(page, 'Xong. Trang thật đổi ngay — không chờ build, không chờ deploy.');
  await wait(2600);

  /* 10 - và đây là trang thật, không phải bản xem thử */
  await bringInFrame(page, band);
  await wait(1500);
  await say(page, '');
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 });
  await overlay(page);
  await page.evaluate(sel => {
    var el = document.querySelector(sel);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, band);
  await wait(1600);
  await say(page, 'Đây là trang công khai, không phải bản xem thử. Sai thì vào History lấy lại bản cũ.');
  await wait(4000);
  await say(page, '');
  await wait(1200);

  await ctx.close();                      // đóng ngữ cảnh mới ghi xong tệp phim
  const webm = fs.readdirSync(raw).filter(f => f.endsWith('.webm')).map(f => path.join(raw, f))[0];
  await b.close();

  /* ---- trả lại nội dung như cũ --------------------------------------------------------- */
  TREES.forEach((f, i) => fs.writeFileSync(f, before[i]));
  const same = TREES.every((f, i) => fs.readFileSync(f).equals(before[i]));
  check('noi dung tro lai nguyen van', same, DOC + '.json o ca hai cay');

  /* ---- webm -> mp4 --------------------------------------------------------------------- */
  let out = webm;
  if (webm) {
    const mp4 = path.join(OUT, 'huong-dan-sua-noi-dung.mp4');
    try {
      execFileSync('ffmpeg', ['-y', '-i', webm, '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
                              '-crf', '24', '-movflags', '+faststart', mp4],
                   { stdio: 'ignore' });
      out = mp4;
      if (!KEEP) fs.rmSync(raw, { recursive: true, force: true });
    } catch (e) {
      fs.copyFileSync(webm, path.join(OUT, 'huong-dan-sua-noi-dung.webm'));
      out = path.join(OUT, 'huong-dan-sua-noi-dung.webm');
      console.log('  (khong chay duoc ffmpeg — giu nguyen webm)');
    }
  }
  check('co tep phim', !!out && fs.existsSync(out),
        out ? (fs.statSync(out).size / 1048576).toFixed(1) + ' MB · ' + out : 'khong ghi duoc');

  heading('Phim huong dan, ' + W + '×' + H);
  table(['phep thu', 'ket qua', 'chi tiet'], rows, [false, false, false]);
  console.log('\n  %s', out || '(khong co)');
  console.log('  MO RA XEM — phu de co doc duoc khong, con tro co dung cho khong, cuon co toi noi khong.');
  console.log('  Mot dong trong History thi van con: doan phim da bam Save that.');
  verdict(bad === 0, 'di het mot duong that va khong de lai gi trong noi dung');
})();
