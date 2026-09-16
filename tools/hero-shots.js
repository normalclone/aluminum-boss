// Chup khoi hero voi TUNG dong san pham duoc chon, o ca hai be ngang.
//
// Nen hero la anh cua dong san pham dang chon, va home.js co mot gia dinh viet thanh loi trong
// chinh no: "khong can lop phu - chu roi xuong mang tuong nhat ma buc anh dat san duoi do".
// Gia dinh ay dung voi anh nen sang. Khach doi mot tam sang anh toi la sau chu tren hero va dong
// chu goc duoi phai co the khong doc duoc nua - va KHONG phep do nao bat duoc chuyen do. Chi co
// mat nguoi.
//
// Nen cong cu nay khong ket luan gi ca. No chi bay ra muoi hai tam anh de MO RA NHIN, va do la
// toan bo cong viec cua no.
//
//   node hero-shots.js [origin] [thu-muc-ra]
const path = require('path');
const fs = require('fs');
const { launch, newCtx, wait } = require('./lib/browser');

const BASE = (process.argv[2] || 'http://127.0.0.1:5117').replace(/\/$/, '');
const OUT = process.argv[3] || path.join(require('os').tmpdir(), 'hero-shots');

// 390 la dien thoai bo cuc duoc thiet ke xuong toi. O do hero xep anh tren, chu duoi nen nguoc
// lai ca hai deu de doc - nen mot van de chi hien o 1440 la chuyen binh thuong, khong phai lo.
const WIDTHS = [1440, 390];

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const b = await launch();
  const shots = [];
  for (const w of WIDTHS) {
    const ctx = await newCtx(b, { width: w, height: 900 });
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 });
    await wait(1500);

    const n = await page.locator('#abhero-words a').count();
    for (let i = 0; i < n; i++) {
      const a = page.locator('#abhero-words a').nth(i);
      const name = (await a.textContent()).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
      // Cung duong ma nguoi dung di: re chuot qua ten dong, nen doi anh.
      await a.hover();
      await wait(900);
      const file = path.join(OUT, `${w}-${i}-${name}.png`);
      await page.locator('#abhero').screenshot({ path: file });
      shots.push(file);
    }
    await ctx.close();
  }
  await b.close();

  console.log('\n  Hero, tung dong san pham');
  console.log('  ========================');
  shots.forEach(f => console.log('  ' + f));
  console.log('\n  %d tam trong %s — MO RA NHIN.', shots.length, OUT);
  console.log('  Cau hoi: sau chu tren hero va dong chu goc duoi phai co doc duoc tren MOI tam khong.');
})();
