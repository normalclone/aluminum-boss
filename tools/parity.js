// Photographs every page from two origins and subtracts them.
//
// This is the proof that a refactor changed nothing visible. It has signed off the port from a
// static clone into the .NET app, the move of the whole tree up a directory, and every content
// change since.
//
// Anti-aliasing and JPEG decoding put a few units of noise on a handful of pixels even between
// two loads of the SAME page, so the threshold that matters is "no pixel differs by more than
// 32 of 255" rather than "identical".
//
//   node parity.js <origin-A> <origin-B> [width]
//   node parity.js --save <origin> <dir> [width]     chup lam moc nen
//   node parity.js --against <origin> <dir> [width]  so voi moc nen da luu
//
// Them --only <chuoi> vao bat ky lenh nao de chi chup nhung trang co chuoi do trong duong dan.
const fs = require('fs');
const path = require('path');
const { launch, newCtx, wait } = require('./lib/browser');
const { PAGES, slug } = require('./lib/pages');
const { table, heading, verdict } = require('./lib/report');

// Everything below is non-deterministic between two loads of the same page, so leaving any of
// it in would report differences that have nothing to do with the change under test.
const FREEZE = `
  document.querySelectorAll('*').forEach(e => {
    e.style.animationPlayState = 'paused';
    e.style.transitionDuration = '0s';
  });
  document.querySelectorAll('canvas').forEach(c => { c.style.visibility = 'hidden'; });
  document.querySelectorAll('object, embed, iframe').forEach(o => { o.style.visibility = 'hidden'; });
  document.querySelectorAll('.ab-row, .keen-slider').forEach(r => { r.scrollLeft = 0; });

  // Native form controls draw their own text, and that drawing is not stable between runs:
  // measured, three shots of the same page gave two different results, differing by exactly 175
  // pixels over the 50x12 box holding a <select>'s "Select..." label. The two images look
  // identical; the glyphs simply land a fraction of a pixel apart. Making the text transparent
  // keeps the box, its border and its size in the comparison and drops only the unstable part.
  const noControlText = document.createElement('style');
  noControlText.textContent = 'select, input, textarea, option { color: transparent !important; }';
  document.head.appendChild(noControlText);

  window.scrollTo(0, 0);
`;

// A full-page screenshot does not scroll, so loading="lazy" images below the fold are still
// blank when it is taken. That is harmless while both sides defer the same way, and misleading
// the moment they do not: a server-rendered list puts its images in the initial HTML and the
// browser genuinely defers them, while a JS-built list inserts them later and they load at once.
// Measured, that difference alone reported 235,008 differing pixels on a page whose text was
// identical.
const LOAD_IMAGES = `
  (async () => {
    const imgs = [...document.images];
    imgs.forEach(i => { i.loading = 'eager'; });
    await Promise.all(imgs.map(i => i.decode().catch(() => {})));
  })()
`;

async function shoot(ctx, base, p, out) {
  const page = await ctx.newPage();
  try {
    await page.goto(base + p, { waitUntil: 'load', timeout: 90000 });
    await wait(4500);
    await page.evaluate(LOAD_IMAGES);
    await wait(600);
    await page.evaluate(FREEZE);
    await wait(400);
    await page.screenshot({ path: out, fullPage: true });
    return true;
  } catch (e) {
    console.log('  LOI %s%s: %s', base, p, e.message.split('\n')[0]);
    return false;
  } finally {
    await page.close();
  }
}

/** Byte-identical is the cheap answer and needs no image library. */
function sameBytes(a, b) {
  try { return Buffer.compare(fs.readFileSync(a), fs.readFileSync(b)) === 0; }
  catch (e) { return false; }
}

// Different bytes is NOT the question. Anti-aliasing and JPEG decoding leave a few units of noise
// on a handful of pixels between two loads of the same page, so a page can differ by thousands of
// bytes and be pixel-identical by the only threshold that matters. Reporting the byte answer and
// asking for compare.py by hand has raised a false alarm three times in one afternoon, so the
// count is fetched here instead.
function overThreshold(a, b) {
  const r = require('child_process').spawnSync(
    'python', [path.join(__dirname, 'locate-diff.py'), a, b,
               path.join(require('os').tmpdir(), 'parity-diff')],
    { encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  if (/Khong co pixel nao lech qua 32/.test(out)) return 0;
  const m = out.match(/(\d+) pixel lech qua 32/);
  return m ? +m[1] : NaN;   // NaN: khong chay duoc python, khong dam ket luan
}

(async () => {
  const args = process.argv.slice(2);

  // Task 9 changes one listing at a time, and photographing the other fourteen pages to prove
  // that one of them moved wastes four minutes per round. --only narrows the run to the paths
  // containing a substring; without it every page is shot, as before.
  const onlyAt = args.indexOf('--only');
  const only = onlyAt === -1 ? null : args.splice(onlyAt, 2)[1];
  // "=" means the whole path, because the home page is "/" and every path contains it.
  const pages = !only ? PAGES
    : only.startsWith('=') ? PAGES.filter(p => p === only.slice(1))
    : PAGES.filter(p => p.includes(only));
  if (!pages.length) { console.log('  --only %s khong khop trang nao.', only); return; }

  const mode = args[0] && args[0].startsWith('--') ? args.shift() : '--compare';
  const width = +(args[2] || args[1] && /^\d+$/.test(args[1]) ? args.pop() : 1440) || 1440;

  const b = await launch();
  const ctx = await newCtx(b, { width, height: 1000 });

  if (mode === '--save') {
    const [origin, dir] = args;
    fs.mkdirSync(dir, { recursive: true });
    for (const p of pages) {
      await shoot(ctx, origin.replace(/\/$/, ''), p, path.join(dir, slug(p) + '_' + width + '.png'));
    }
    console.log('  Da luu %d anh moc nen vao %s (rong %d)', pages.length, dir, width);
    await b.close();
    return;
  }

  const [A, B] = mode === '--against' ? [args[0], null] : args;
  const dir = mode === '--against' ? args[1] : null;
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'parity-'));

  const rows = [];
  let differing = 0;
  for (const p of pages) {
    const name = slug(p) + '_' + width + '.png';
    const shotA = path.join(tmp, 'a_' + name);
    await shoot(ctx, A.replace(/\/$/, ''), p, shotA);

    let shotB;
    if (dir) { shotB = path.join(dir, name); }
    else { shotB = path.join(tmp, 'b_' + name); await shoot(ctx, B.replace(/\/$/, ''), p, shotB); }

    if (sameBytes(shotA, shotB)) {
      rows.push([p, 'giong het']);
      continue;
    }

    const n = overThreshold(shotA, shotB);
    if (n === 0) { rows.push([p, 'giong het (chi nhieu khu rang cua)']); }
    else if (Number.isNaN(n)) { differing++; rows.push([p, 'KHAC byte — khong chay duoc python']); }
    else { differing++; rows.push([p, 'LECH ' + n + ' pixel qua 32/255']); }
  }

  heading('Doi chieu pixel (rong ' + width + ')');
  table(['trang', 'ket qua'], rows);
  console.log('\n  %d/%d trang khong lech pixel nao qua 32/255.', pages.length - differing, pages.length);
  if (differing) console.log('  Anh nam trong %s', tmp);
  await b.close();
  verdict(differing === 0, differing + ' trang lech that su');
})();
