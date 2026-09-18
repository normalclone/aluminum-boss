// May chu tinh cho cay site/ — dung khi mot cong cu can mot origin that de Chrome nap vao.
//
// Bon tep trong tools/ tung chep lai cung mot doan nay. Gom vao day vi mot loi trong no da
// tung lam ca bo kiem tra 404 sach tron: SITE viet bang dau gach cheo xuoi con path.join tra
// ve gach cheo nguoc, nen full.startsWith(SITE) luon sai. path.resolve o duoi la cho vá do.
const fs = require('fs');
const path = require('path');
const http = require('http');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
  '.pdf': 'application/pdf', '.mp4': 'video/mp4', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

/**
 * @param {string} dir  thu muc goc (se duoc resolve, dung truyen chuoi gach cheo xuoi tho)
 * @param {number} port
 * @returns {http.Server}  nho goi .close() trong finally, khong thi tien trinh khong thoat
 */
function serve(dir, port) {
  const root = path.resolve(dir);
  return http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    const full = path.resolve(path.join(root, p));
    if (!full.startsWith(root) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('404 ' + p);
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(full).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(full).pipe(res);
  }).listen(port);
}

module.exports = { serve, TYPES };
