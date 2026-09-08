// Serves site/ under a subpath, the way GitHub Pages serves a project site.
//
// This exists because a path bug hid completely on a server mounted at the origin root: a
// prefix with one ../ too many resolves above the site root, and a browser silently clamps
// that at the origin. Same directory locally, a 404 in production. Testing at the root cannot
// catch it; this can.
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'site');
const BASE = process.argv[2] || '/aluminum-boss';
const PORT = +(process.argv[3] || 8998);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.gif': 'image/gif', '.pdf': 'application/pdf',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.mp4': 'video/mp4',
};

http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  if (!url.startsWith(BASE)) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    return res.end('outside ' + BASE);
  }
  url = url.slice(BASE.length) || '/';
  let file = path.join(ROOT, url.replace(/\//g, path.sep));
  if (!path.resolve(file).startsWith(path.resolve(ROOT))) {
    res.writeHead(403); return res.end();
  }
  try {
    if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  } catch (e) {
    res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('404 ' + url);
  }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('404 ' + url); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(buf);
  });
}).listen(PORT, () => console.log('phuc vu site/ tai http://127.0.0.1:' + PORT + BASE + '/'));
