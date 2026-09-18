// Phuc vu site/ tren mot cong, de parity.js / crawl.js / trinh duyet co origin that ma nap.
//
//   node tools/serve-site.js            -> http://127.0.0.1:5117
//   node tools/serve-site.js --port 80  -> doi cong
//   node tools/serve-site.js --dir wwwroot
//
// Ctrl+C de dung. Khong co gi thong minh o day: chi la tep tinh, dung MIME, khong cache.
const path = require('path');
const { serve } = require('./lib/static');

const arg = (name, fallback) => {
  const i = process.argv.indexOf('--' + name);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const dir = path.join(__dirname, '..', arg('dir', 'site'));
const port = +arg('port', 5117);

serve(dir, port);
console.log('Dang phuc vu %s tai http://127.0.0.1:%d — Ctrl+C de dung.', dir, port);
