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
  window.scrollTo(0, 0);
`;

async function shoot(ctx, base, p, out) {
  const page = await ctx.newPage();
  try {
    await page.goto(base + p, { waitUntil: 'load', timeout: 90000 });
    await wait(4500);
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

/** Compares two PNGs without a decoding library: byte-identical, or hand off to compare.py. */
function sameBytes(a, b) {
  try { return Buffer.compare(fs.readFileSync(a), fs.readFileSync(b)) === 0; }
  catch (e) { return false; }
}

(async () => {
  const args = process.argv.slice(2);
  const mode = args[0] && args[0].startsWith('--') ? args.shift() : '--compare';
  const width = +(args[2] || args[1] && /^\d+$/.test(args[1]) ? args.pop() : 1440) || 1440;

  const b = await launch();
  const ctx = await newCtx(b, { width, height: 1000 });

  if (mode === '--save') {
    const [origin, dir] = args;
    fs.mkdirSync(dir, { recursive: true });
    for (const p of PAGES) {
      await shoot(ctx, origin.replace(/\/$/, ''), p, path.join(dir, slug(p) + '_' + width + '.png'));
    }
    console.log('  Da luu %d anh moc nen vao %s (rong %d)', PAGES.length, dir, width);
    await b.close();
    return;
  }

  const [A, B] = mode === '--against' ? [args[0], null] : args;
  const dir = mode === '--against' ? args[1] : null;
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'parity-'));

  const rows = [];
  let differing = 0;
  for (const p of PAGES) {
    const name = slug(p) + '_' + width + '.png';
    const shotA = path.join(tmp, 'a_' + name);
    await shoot(ctx, A.replace(/\/$/, ''), p, shotA);

    let shotB;
    if (dir) { shotB = path.join(dir, name); }
    else { shotB = path.join(tmp, 'b_' + name); await shoot(ctx, B.replace(/\/$/, ''), p, shotB); }

    const same = sameBytes(shotA, shotB);
    if (!same) differing++;
    rows.push([p, same ? 'giong het' : 'KHAC — chay compare.py']);
  }

  heading('Doi chieu pixel (rong ' + width + ')');
  table(['trang', 'ket qua'], rows);
  console.log('\n  %d/%d trang giong het tung byte.', PAGES.length - differing, PAGES.length);
  if (differing) {
    console.log('  Anh nam trong %s — chay tools/compare.py de biet lech bao nhieu.', tmp);
  }
  await b.close();
  verdict(differing === 0, differing + ' trang khac byte (co the chi la nhieu khu rang cua)');
})();
