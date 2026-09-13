// Dang sau mot proxy, ai la khach?
//
// Bieu mau lien he cho moi dia chi tam yeu cau mot gio. Dat sau nginx thi MOI yeu cau den tu
// 127.0.0.1, nen tam nguoi la het han muc cua ca Internet: nguoi thu chin trong gio bi tu choi vi
// nguoi thu tam, va tu ben ngoai khong ai doan ra chuyen gi dang xay ra.
//
// X-Forwarded-For go duoc chuyen do, va cung la mot dong tieu de ai cung go duoc, nen may chu chi
// tin no khi cau hinh goi ten proxy - Proxy:TrustedIps. Cong cu nay do chinh cho ay, bang hanh vi
// chu khong bang doc cau hinh: gui chin yeu cau, moi cai mot dia chi khac nhau, roi dem.
//
//   Proxy:TrustedIps co 127.0.0.1  -> chin dia chi la chin nguoi   -> ca chin duoc nhan
//   Proxy:TrustedIps rong          -> chin dia chi van la mot nguoi -> cai thu chin bi tu choi
//
//   node forwarded.js [origin] --expect split|shared
//
// LUU Y: bo dem han muc nam trong bo nho may chu. Chay kieu "shared" hai lan lien tiep ma khong
// khoi dong lai may chu thi lan hai that bai ngay tu yeu cau dau - do la dung, khong phai loi.
// Moi lan chay de lai chin dong trong App_Data/enquiries.jsonl, route "tools/forwarded".

const { heading, table, verdict } = require('./lib/report');

const argv = process.argv.slice(2);
const BASE = (argv.find(a => a.startsWith('http')) || 'http://127.0.0.1:5117').replace(/\/$/, '');
const EXPECT = (() => {
  const i = argv.indexOf('--expect');
  return i >= 0 ? argv[i + 1] : null;
})();

// Giong Enquiries.PerHour ben C#. Lech nhau thi phep do nay sai, nen no o day mot minh va co ten.
const PER_HOUR = 8;
const TRIES = PER_HOUR + 1;

if (EXPECT !== 'split' && EXPECT !== 'shared') {
  console.log('  Thieu --expect split (co proxy tin cay) hoac --expect shared (khong co).');
  process.exit(2);
}

/** Gui mot yeu cau lien he, gia lam mot khach o dia chi cho truoc. */
async function send(i) {
  const body = new URLSearchParams({
    route: 'tools/forwarded',
    name: 'Phep do ' + i,
    message: 'X-Forwarded-For 203.0.113.' + i,
  });
  const res = await fetch(BASE + '/contact/send', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      // 203.0.113.0/24 la dai dia chi danh rieng cho tai lieu, khong cham vao ai that.
      'x-forwarded-for': '203.0.113.' + i,
    },
    body,
  });
  return res.json();
}

(async () => {
  const out = [];
  for (let i = 1; i <= TRIES; i++) out.push(await send(i));

  const saved = out.filter(o => o.ok).length;
  const rated = out.filter(o => !o.ok && o.why === 'rate').length;
  const other = out.filter(o => !o.ok && o.why !== 'rate');

  const want = EXPECT === 'split' ? TRIES : PER_HOUR;
  const rows = [
    ['nhan', String(saved), 'mong doi ' + want],
    ['tu choi vi han muc', String(rated), 'mong doi ' + (TRIES - want)],
  ];
  if (other.length) rows.push(['tra loi khac', String(other.length), JSON.stringify(other[0])]);

  heading('Mot proxy hay ' + TRIES + ' nguoi, tren ' + BASE);
  table(['ket cuc', 'so luong', 'chi tiet'], rows, [false, true, false]);

  console.log('\n  --expect %s: %s', EXPECT, EXPECT === 'split'
    ? 'may chu tin X-Forwarded-For, nen ' + TRIES + ' dia chi la ' + TRIES + ' bo dem rieng.'
    : 'may chu bo qua X-Forwarded-For, nen ca ' + TRIES + ' chung mot bo dem.');

  verdict(saved === want && rated === TRIES - want && other.length === 0,
          'han muc dem dung so nguoi, khong phai so ket noi');
})();
