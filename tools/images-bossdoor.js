// Dot 3: tai anh cua nhung muc da chon o import/en/, roi viet manifest cho ingest-images.py.
//
//   node tools/images-bossdoor.js            # chi liet ke se tai gi, khong tai
//   node tools/images-bossdoor.js --fetch    # tai that, vao import/media/
//   node tools/images-bossdoor.js --fetch --all   # tai het anh moi muc, khong chi tam dan
//
// Cong cu nay KHONG dong vao _data. No dung o cho tai ve va mo ta. Buoc chuyen ma va tro du
// lieu vao anh la cua tools/ingest-images.py, da co san va da dung cho anh khach gui.
//
// ---------------------------------------------------------------------------------------------
// CHON TAM NAO
//
// Nguon co 853 anh cho 36 bai tin. Khong tai het: the tin chi co MOT o `image`, va 800 tam
// con lai khong co cho dap. Mac dinh lay mot tam dan cho moi muc.
//
// "Tam dan" la tam dau tien SAU KHI bo cac tam khong phai noi dung: logo, icon, co, banner
// quang cao, anh doi tac, va anh nho hon 20 KB (gan nhu luon la icon). Danh sach o SKIP duoi
// day khong the day du — no chi can day du hon "lay tam dau tien".
//
// ---------------------------------------------------------------------------------------------
// CHU TIENG VIET IN THANG LEN ANH
//
// Nhieu anh cua bossdoor.vn la anh quang cao co chu tieng Viet in san — dung tren trang tieng
// Anh thi khong duoc. May nay KHONG co tesseract nen khong OCR duoc, va toi khong doan.
//
// Thay vao do: moi tam duoc cham mot diem `textScore` (mat do bien + do phang mau — dac diem
// cua anh do hoa co chu, khac voi anh chup), va tat ca duoc xep vao MOT to lien anh de nhin
// bang mat. Diem chi de xep thu tu cho nhung tam dang ngo len dau; quyet dinh la o mat nguoi.
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { table, heading, verdict } = require('./lib/report');

const ROOT = path.join(__dirname, '..');
const EN = path.join(ROOT, 'import', 'en');
const MEDIA = path.join(ROOT, 'import', 'media');
const ORIGIN = 'https://bossdoor.vn';
const FETCH = process.argv.includes('--fetch');
const ALL = process.argv.includes('--all');
let BLANK = new Set();   // id cua muc chu dinh KHONG co anh (moi tam nguon deu la tranh quang cao)
const REJECT = (() => {
  const i = process.argv.indexOf('--reject');
  if (i < 0) return new Set();
  const j = JSON.parse(fs.readFileSync(path.join(ROOT, process.argv[i + 1]), 'utf8'));
  // Loai theo URL, khong theo ten tep: ten tep dat theo id muc nen mot ten co the tro toi hai
  // tam khac nhau qua hai lan chay, va lan thu hai se duoc "tha" nham.
  // Chi cac nhom vong-N bi bo tu dong. Nhom "dau-chim" cho anh Phuc quyet — mot cong cu tu
  // quyet ho la mot cong cu khong ai kiem lai duoc.
  const out = new Set();
  for (const k of Object.keys(j)) {
    if (!/^vong-/.test(k)) continue;
    for (const u of (j[k].urls || [])) out.add(u.replace(ORIGIN, ''));
  }
  BLANK = new Set((j['bo-han'] && j['bo-han'].ids) || []);
  return out;
})();

/** Mot URL co nam trong danh sach loai khong (so sanh tren phan duong dan, bo ten mien). */
const rejects = u => REJECT.has(u.replace(ORIGIN, ''));

/**
 * Khong phai anh noi dung. Moi dong o day la mot tam da that su xuat hien trong nguon.
 *
 * googleusercontent/blogger: anh hotlink tu Google, TAT CA deu 404 bay gio. Mot bai (fire-shutters)
 * co 8 tam nhu vay dung dau danh sach, va vi chung khong bi loai nen phep lui chi thu 4 tam dau
 * roi bo cuoc - trong khi tam bossdoor that nam o vi tri thu 9.
 */
const SKIP = /logo|icon|favicon|banner|quang-cao|doi-tac|partner|footer|header|avatar|zalo|facebook|hotline|placeholder|no-image|watermark|googleusercontent|blogger|ggpht/i;

const KINDS = [
  { dir: 'news', bucket: 'news', doc: 'news', array: 'items' },
  { dir: 'products', bucket: 'products', doc: 'products', array: 'categories', nested: 'items' },
  { dir: 'projects', bucket: 'projects', doc: 'projects', array: 'albums' },
];

/** Dinh danh that cua bossdoor: duoi `-n381`, `-p266`, `-dpj20`. Ben hon ca duong dan chuyen muc. */
const tail = u => (/-((?:n|p|dpj)\d+)\.html?$/i.exec(u || '') || [, ''])[1].toLowerCase();

const ext = u => {
  const m = /\.(jpe?g|png|gif|webp)(?:\?|$)/i.exec(u.split('?')[0]);
  return m ? '.' + m[1].toLowerCase().replace('jpeg', 'jpg') : '.jpg';
};

/**
 * Tai mot URL ve dia. Tra ve {bytes} hoac {err}.
 *
 * URL cua bossdoor co ky tu ® va dau tieng Viet chua ma hoa. encodeURI() de nguyen dau %
 * da co san, nen khong bi ma hoa hai lan.
 */
function get(url, dest, redirects = 0) {
  return new Promise(resolve => {
    if (redirects > 4) return resolve({ err: 'chuyen huong qua nhieu' });
    let u;
    // CHI ma hoa ky tu ngoai ASCII. encodeURI() cung ma hoa ca dau `%`, nen mot URL da co
    // `%20` san bien thanh `%2520` va tra ve 404 — do la nguyen nhan cua 4 trong 30 tam hong
    // lan dau. Cach nay xu ly duoc `®` va dau tieng Viet ma khong dung den phan da ma hoa.
    try { u = new URL(url.replace(/[^\x00-\x7F]/g, c => encodeURIComponent(c))); }
    catch (e) { return resolve({ err: 'URL hong' }); }
    const lib = u.protocol === 'http:' ? http : https;
    const req = lib.get(u, { timeout: 30000, headers: { 'user-agent': 'Mozilla/5.0 aluminum-boss-import' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(get(new URL(res.headers.location, u).href, dest, redirects + 1));
      }
      if (res.statusCode !== 200) { res.resume(); return resolve({ err: 'HTTP ' + res.statusCode }); }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        fs.writeFileSync(dest, buf);
        resolve({ bytes: buf.length });
      });
    });
    req.on('timeout', () => { req.destroy(); resolve({ err: 'het gio' }); });
    req.on('error', e => resolve({ err: e.code || e.message }));
  });
}

(async () => {
  const ex = JSON.parse(fs.readFileSync(path.join(ROOT, 'import', 'extracted.json'), 'utf8')).items;

  const rows = [];
  const manifest = [];
  const missing = [];
  const blanked = [];
  let want = 0, got = 0, bytes = 0, failed = 0;

  for (const k of KINDS) {
    const src = ex[k.bucket] || [];
    const byUrl = new Map(src.map(x => [x.url, x]));
    const byTail = new Map(src.map(x => [tail(x.url), x]));
    const dir = path.join(EN, k.dir);
    if (!fs.existsSync(dir)) continue;
    const out = path.join(MEDIA, k.dir);
    if (FETCH) fs.mkdirSync(out, { recursive: true });

    for (const f of fs.readdirSync(dir).filter(n => n.endsWith('.json')).sort()) {
      const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      const id = f.slice(0, -5);
      const item = byUrl.get(d.src) || byTail.get(tail(d.src));
      if (!item) { missing.push([id, 'khong tim thay trang nguon', d.src || '(khong co src)']); continue; }

      if (BLANK.has(id)) { blanked.push([id, 'moi tam nguon deu la tranh quang cao tieng Viet', 'de o giu cho']); continue; }

      const usable = (item.images || []).filter(u => !SKIP.test(u));
      if (!usable.length) { missing.push([id, 'trang nguon khong co anh dung duoc', String((item.images || []).length) + ' anh bi loai']); continue; }

      const take = ALL ? usable : usable.slice(0, 1);
      for (let i = 0; i < take.length; i++) {
        // Khi tam dau hong thi thu tam ke tiep cua CUNG MUC do. Trang san pham liet ke ban
        // /original/ truoc ban /large/, va ban /original/ hay 404 — mot lan chay khong co buoc
        // lui nay mat 30/74 tam va bao "nguon khong co anh", mot cau tra loi sai.
        const alts = ALL ? [take[i]] : usable.slice(0, 10);
        let url = (alts[0].startsWith('http') ? alts[0] : ORIGIN + alts[0]);
        const name = id + (i ? '-' + (i + 1) : '') + ext(url);
        const dest = path.join(out, name);
        want++;
        let note = '';
        if (FETCH) {
          if (fs.existsSync(dest) && fs.statSync(dest).size > 0) { note = 'da co'; got++; bytes += fs.statSync(dest).size; }
          else {
            let r = { err: 'moi phuong an deu bi loai hoac hong' };
            for (const a of alts) {
              if (rejects(a)) continue;
              const cand = a.startsWith('http') ? a : ORIGIN + a;
              r = await get(cand, dest);
              if (!r.err) { url = cand; break; }
            }
            if (r.err) { note = r.err; failed++; }
            else { note = (r.bytes / 1024).toFixed(0) + ' KB'; got++; bytes += r.bytes; }
          }
        }
        rows.push([k.dir, id, name, note || 'chua tai', url.replace(ORIGIN, '')]);
        // Chi ghi vao manifest tam THAT SU nam tren dia. Mot dong manifest tro toi tep khong co
        // se lam ingest-images.py dung giua chung, sau khi da chep mot nua so anh sang hai cay.
        if (i === 0 && (!FETCH || (fs.existsSync(dest) && fs.statSync(dest).size > 0))) {
          const entry = { src: path.relative(ROOT, dest).replace(/\\/g, '/'),
                          doc: k.doc, array: k.array, id, field: 'image',
                          as: id + '.jpg', from: 'bossdoor.vn ' + url.replace(ORIGIN, '') };
          if (k.nested) entry.nested = k.nested;
          manifest.push(entry);
        }
      }
    }
  }

  // --- bo anh TRUNG NOI DUNG ---------------------------------------------------------------
  // Khi mot muc khong co anh rieng, phep lui hay dap xuong cung mot tam chung cua trang nguon.
  // Lan chay 18/09/2026 co 8 muc dung chung MOT tam anh nha 400x224 — tam the tin nao cung mot
  // tam thi trang nhin nhu hong. Muc dau giu, cac muc sau de trong.
  const dups = [];
  if (FETCH) {
    const crypto = require('crypto');
    const seen = new Map();
    for (const e of manifest.slice()) {
      if (!fs.existsSync(e.src)) continue;
      const h = crypto.createHash('md5').update(fs.readFileSync(e.src)).digest('hex');
      if (seen.has(h)) {
        dups.push([e.id, 'trung anh voi ' + seen.get(h), 'de o giu cho']);
        fs.unlinkSync(e.src);
        manifest.splice(manifest.indexOf(e), 1);
      } else seen.set(h, e.id);
    }
  }

  heading(FETCH ? 'Da tai anh nguon' : 'Anh se tai (chua tai gi)');
  const shown = rows.slice(0, 12);
  table(['loai', 'muc', 'tep', 'ket qua', 'nguon'],
        shown.map(r => [r[0], r[1], r[2], r[3], r[4].length > 52 ? '…' + r[4].slice(-50) : r[4]]),
        [false, false, false, true, false]);
  if (rows.length > shown.length) console.log('  … va %d dong nua.', rows.length - shown.length);

  if (missing.length) {
    console.log('\n  %d muc khong co anh — the se dung o giu cho AB.ph(), trang van chay:', missing.length);
    table(['muc', 'vi sao', 'chi tiet'], missing, [false, false, false]);
  }

  console.log('\n  %d tam can tai%s.', want, FETCH ? `, ${got} xong, ${failed} hong, ${(bytes / 1024 / 1024).toFixed(1)} MB` : '');

  if (FETCH && got) {
    const mf = path.join(ROOT, 'tools', 'manifests', 'bossdoor.json');
    fs.mkdirSync(path.dirname(mf), { recursive: true });
    // ingest-images.py giai duong dan tuong doi voi CHINH TEP MANIFEST, khong voi goc kho. Ghi
    // duong dan tuong doi voi goc kho thi no di tim tools/manifests/import/media/... va bao
    // "khong co tep nguon" cho ca 47 dong — mot thong bao dung ve mot loi khong co that.
    const rel = manifest.map(e => Object.assign({}, e, {
      src: path.relative(path.dirname(mf), path.join(ROOT, e.src)).replace(/\\/g, '/'),
    }));
    fs.writeFileSync(mf, JSON.stringify(rel, null, 2) + '\n', 'utf8');
    console.log('  Manifest: %s (%d dong)', path.relative(ROOT, mf), manifest.length);
    console.log('\n  Tiep theo, theo dung thu tu:');
    console.log('    python tools/images-text.py           # to lien anh + cham diem chu tieng Viet');
    console.log('    <nhin to lien anh, bo nhung tam co chu>');
    console.log('    python tools/ingest-images.py tools/manifests/bossdoor.json --dry');
  } else if (!FETCH) {
    console.log('\n  Chay lai voi --fetch de tai that.');
  }

  verdict(want > 0 && failed === 0, `${want} tam, ${missing.length} muc khong co anh` + (FETCH ? `, ${failed} hong` : ''));
})();
