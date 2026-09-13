// Dang nhap that vao khu quan tri, va di qua duoc cai cong doi mat khau.
//
// Bon cong cu deu can dung mot viec nay, va truoc day moi cai giu mot ban sao. Ngay may chu bat
// dau ep doi mat khau lan dau, ca bon deu gay cung mot kieu - dang nhap duoc, roi moi man hinh
// deu nhay ve /Account/Password. Nen viec ay nam o day, mot cho.
//
// Duong di:
//   1. thu mat khau lam viec (AB_ADMIN_PASS, mac dinh PASS ben duoi)
//   2. khong duoc thi thu mat khau goc trong ma nguon ('changeme')
//   3. neu may chu day sang trang doi mat khau thi doi luon, sang mat khau lam viec
//
// Nghia la lan chay dau tien tren mot may moi SE DOI mat khau cua tai khoan admin - dung cai
// duong ma nguoi that di, chu khong phai mot cua sau danh rieng cho may do. Lan sau dang nhap
// thang bang mat khau moi. Dat AB_ADMIN_PASS neu may chu that da co mat khau rieng.

const USER = process.env.AB_ADMIN_USER || 'admin';

// Phai khac 'changeme' va dai it nhat 10 ky tu, neu khong may chu van coi la chua doi.
const PASS = process.env.AB_ADMIN_PASS || 'changeme-please';

// Giong AdminSeeder.DefaultPassword ben C#. Hai ben lech nhau thi buoc 2 truot, va bao ro.
const SEEDED = 'changeme';

const onLogin = page => page.url().includes('/Account/Login');
const onPassword = page => page.url().includes('/Account/Password');

// Nut cua BIEU MAU, khong phai nut dau tien co type=submit tren trang.
//
// Thanh tieu de mang mot bieu mau "Sign out" va no nam truoc <main> trong DOM, nen
// 'button[type=submit]' bam trung no. Tren trang doi mat khau dieu do dang nhap ra ngoai roi
// quay ve trang dang nhap - ma trang dang nhap khong phai trang doi mat khau, nen phep thu tuong
// la da doi xong. Mat khau khong he doi, va khong ai biet.
const SAVE = 'button.ad-save';

/** Dien bieu mau dang nhap dang mo va doi trang. Tra ve: co roi khoi trang dang nhap khong. */
async function submit(page, password) {
  await page.fill('input[name=username]', USER);
  await page.fill('input[name=password]', password);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load', timeout: 60000 }),
    page.click(SAVE),
  ]);
  return !onLogin(page);
}

/**
 * Dang nhap, va neu gap cong doi mat khau thi di qua no.
 *
 * Tra ve true khi da vao duoc mot man hinh lam viec that. In ra man hinh khi no doi mat khau,
 * vi do la mot thay doi con lai tren may sau khi cong cu chay xong.
 */
async function signIn(page, base) {
  const home = base.replace(/\/$/, '') + '/Admin';
  await page.goto(home, { waitUntil: 'load', timeout: 60000 });

  let used = null;
  if (onLogin(page)) {
    if (await submit(page, PASS)) used = PASS;
    else {
      await page.goto(home, { waitUntil: 'load', timeout: 60000 });
      if (!onLogin(page) || !await submit(page, SEEDED)) return false;
      used = SEEDED;
    }
  }

  if (!onPassword(page)) return true;

  // Con cong. Mat khau hien tai la cai vua dung de vao; neu vao bang cookie san co thi doan la
  // mat khau goc, vi do la truong hop duy nhat cong nay bat.
  await page.fill('input[name=current]', used || SEEDED);
  await page.fill('input[name=next]', PASS);
  await page.fill('input[name=confirm]', PASS);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load', timeout: 60000 }),
    page.click(SAVE),
  ]);
  // Van con o day nghia la may chu tu choi - mat khau cu sai, hoac mat khau moi khong dat yeu
  // cau. Ve trang dang nhap cung nghia la khong xong: chua doi duoc gi ca.
  if (onPassword(page) || onLogin(page)) return false;

  console.log('  (may chu con dung mat khau goc — da doi sang "%s". Lan sau dat AB_ADMIN_PASS.)',
              PASS);
  return true;
}

module.exports = { signIn, USER, PASS, SEEDED };
