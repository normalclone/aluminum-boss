// Loads every page and records any request to our own origin that fails.
//
// Deleting 5,522 files on the strength of a static reachability scan is only safe if a browser
// agrees. Anything a script assembles at runtime - a URL built by string concatenation - is
// invisible to the scan and would show up here as a 404.
//
// External hosts are ignored: cosentino.com, Google, the chat widget and so on are unreachable
// from this machine either way, and their failures say nothing about what was deleted.
const { launch } = require('./shot.js');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8999';
const SITE = path.join(__dirname, '..', 'site');

function pages(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['_assets', '_frames', '_ph'].includes(e.name)) continue;
      pages(p, out);
    } else if (e.name === 'index.html') {
      out.push('/' + path.relative(SITE, dir).split(path.sep).join('/') + '/');
    }
  }
  return out;
}

(async () => {
  const urls = pages(SITE, []).sort();
  const b = await launch();
  const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const bad = new Map();
  let checked = 0;

  for (const u of urls) {
    const p = await c.newPage();
    const seen = [];
    p.on('response', r => {
      if (r.url().startsWith(BASE) && r.status() >= 400) seen.push(r.status() + ' ' + r.url());
    });
    p.on('pageerror', e => seen.push('JS ' + String(e.message).split(/\r?\n/)[0]));
    p.on('requestfailed', r => {
      if (r.url().startsWith(BASE)) seen.push('FAIL ' + r.url());
    });
    try {
      await p.goto(BASE + u, { waitUntil: 'networkidle', timeout: 60000 });
    } catch (e) {
      try { await p.waitForTimeout(2500); } catch (_) {}
    }
    await p.close();
    checked++;
    if (seen.length) bad.set(u, seen);
    process.stdout.write('\r  da kiem ' + checked + '/' + urls.length + '   ');
  }
  await b.close();
  fs.writeFileSync(path.join(__dirname, 'crawl-report.json'), JSON.stringify([...bad], null, 1));

  console.log('\n');
  if (!bad.size) {
    console.log('  ' + urls.length + ' trang, khong request noi bo nao that bai');
  } else {
    let n = 0;
    for (const [u, list] of bad) {
      console.log('  ' + u);
      for (const l of list.slice(0, 6)) console.log('      ' + l.replace(BASE, ''));
      if (list.length > 6) console.log('      ... them ' + (list.length - 6));
      n += list.length;
    }
    console.log('\n  ' + n + ' request hong tren ' + bad.size + ' trang');
  }
})();
