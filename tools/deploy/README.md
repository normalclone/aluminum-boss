# Dua site len VPS

Tu 28/09/2026, **may chu .NET nay la ban that cua site** — khong phai GitHub Pages nua. Sua trong
trinh soan la hien ngay, khong cho deploy. Do cung la cai dong luon khe ho SEO ghi o
`docs/QUYET-DINH.md` muc 12: trang duoc ghep luc co nguoi xem, nen tieu de va mo ta rieng cua
tung muc cuoi cung cung den duoc nguoi doc that.

## May chu

| | |
|---|---|
| Dia chi | `202.92.6.174`, SSH cong `24700` |
| He dieu hanh | Ubuntu 24.04 LTS, 2 nhan, 1,9 GB RAM, 40 GB |
| Ban chay | `aspnetcore-runtime-8.0` tu kho Ubuntu |
| CSDL | **MySQL 8.0**, chi nghe `127.0.0.1` (tu 28/09/2026; truoc do la SQLite) |
| Dang nhap | **bang khoa**, `~/.ssh/qlweb2_vps` |

## Lenh

Moi lan dua ban moi len, tu may lam viec — day la lenh duy nhat dung hang ngay:

```bash
bash tools/deploy/push.sh
```

Dung mot may MOI tu dau, theo dung thu tu nay (moi script tu kiem dieu kien cua no va dung lai
neu buoc truoc chua xong):

```bash
K="-P 24700 -i ~/.ssh/qlweb2_vps"
scp $K tools/deploy/*.sh root@202.92.6.174:/tmp/
ssh -p 24700 -i ~/.ssh/qlweb2_vps root@202.92.6.174 'bash /tmp/server-setup.sh'   # may, nginx, tuong lua
bash tools/deploy/push.sh --kem-noi-dung                                          # ma nguon + noi dung
ssh -p 24700 -i ~/.ssh/qlweb2_vps root@202.92.6.174 'bash /tmp/mysql-setup.sh'    # cai MySQL, chua noi
ssh -p 24700 -i ~/.ssh/qlweb2_vps root@202.92.6.174 'bash /tmp/mysql-cutover.sh'  # chuyen sang MySQL
ssh -p 24700 -i ~/.ssh/qlweb2_vps root@202.92.6.174 'bash /tmp/https-setup.sh aluminumboss.com'
```

## Bo cuc thu muc, va vi sao no nhu vay

```
/srv/qlweb2/app/        ma nguon      <- push.sh XOA VA GHI LAI ca thu muc nay
/srv/qlweb2/App_Data/   don hang, khoa dang nhap, tep SQLite cu (CSDL that o MySQL)
/srv/qlweb2/noi-dung/   _data, _media <- noi dung that, KHONG bao gio bi push.sh cham vao
```

Hai thu muc duoi nam **ngoai** `app/` va duoc noi vao bang lien ket. Ly do la mot cach mat du
lieu rat de xay ra: tu luc may nay thay Pages, `_data/*.json` tren may chu la ban that — moi lan
khach bam Save la ghi vao day — con ban `_data` tren may lam viec chi la anh chup luc trien khai
lan truoc. Giai nen de len no se xoa sach cong sua cua khach, khong hoi mot cau, va khong ai
biet cho toi khi mo trang ra xem.

Nen `push.sh` **mac dinh khong day noi dung len**. Muon day that thi `--kem-noi-dung`, va luc do
no ghi de that.

## MySQL

Tu 28/09/2026 ung dung doc/ghi **MySQL** tren may nay thay cho tep SQLite. Trong CSDL chi co hai
bang: tai khoan dang nhap (`AdminUsers`) va lich su sua (`ContentRevisions`). **Noi dung trang
khong nam trong CSDL** — no nam trong cac tep JSON o `/srv/qlweb2/noi-dung/_data/`.

| | |
|---|---|
| CSDL / nguoi dung | `qlweb2` / `qlweb2`, chi co quyen tren CSDL cua no |
| Mat khau ket noi | chi nam trong `/etc/qlweb2/db.env` (quyen `0600`, chu root). Sinh ngay tren may, khong in ra, khong vao git |
| Noi vao ung dung | drop-in `/etc/systemd/system/qlweb2.service.d/mysql.conf` |
| Bo nho | ~150 MB — da chinh cho may 1,9 GB (`/etc/mysql/mysql.conf.d/zz-qlweb2.cnf`) |
| Tu ngoai vao | khong duoc. Chi nghe `127.0.0.1`, va tuong lua khong mo `3306` |

Root cua MySQL dang nhap bang `auth_socket`: dang nhap may chu bang root la vao duoc MySQL,
khong can mat khau nao:

```bash
ssh -p 24700 -i ~/.ssh/qlweb2_vps root@202.92.6.174 "mysql qlweb2 -e 'SELECT Id, Username, LastSignInAt FROM AdminUsers'"
```

Cach may chu chon CSDL: bien `Database__Provider` (`sqlite` hoac `mysql`). Tren may lam viec
khong dat gi nen van la SQLite nhu cu. **Ghi sai ten thi ung dung KHONG khoi dong** thay vi le
lang roi ve SQLite — co chu y: roi ve le lang tren may chu nghia la mot CSDL moi tinh, ma bo khoi
tao ghi ngay `admin` / `changeme`, tren mot dia chi cong khai.

### Sao luu

Moi dem luc 02:30, hai tep, giu 14 ban gan nhat moi loai:

```
/srv/qlweb2/sao-luu/qlweb2-YYYYMMDD-HHMM.sql.gz        CSDL: tai khoan + lich su sua (mysqldump)
/srv/qlweb2/sao-luu/noi-dung-YYYYMMDD-HHMM.tar.gz      chu cua trang, anh, don lien he
```

Tep thu hai moi la phan quy nhat, va ban dau **khong co**: CSDL chi giu mot tai khoan va lich su
sua, con chu cua trang, anh khach tai len va don lien he deu nam trong tep, ngoai MySQL. Them vao
ngay 28/09/2026 khi viet huong dan su dung phai ghi ro cai gi duoc sao luu. Da giai nen thu: 18
tep noi dung + 65 anh, ma bam toan bo khop voi ban dang chay.

(Voi SQLite, sao luu CSDL la chep mot tep. Voi MySQL thi khong: tep trong `/var/lib/mysql` chep
luc may dang chay la ban hong - nen phai qua `mysqldump`.)

Sao luu ngay bay gio: `systemctl start qlweb2-sao-luu.service`

Khoi phuc noi dung trang + anh ve mot dem (ghi de ban dang chay):

```bash
systemctl stop qlweb2
tar -xzf /srv/qlweb2/sao-luu/noi-dung-20260928-1536.tar.gz -C /srv/qlweb2
chown -R qlweb2:qlweb2 /srv/qlweb2/noi-dung /srv/qlweb2/App_Data
systemctl start qlweb2
```

Khoi phuc CSDL (ghi de CSDL dang chay — dung ung dung truoc):

```bash
systemctl stop qlweb2
gunzip -c /srv/qlweb2/sao-luu/qlweb2-20260928-1521.sql.gz | mysql qlweb2
systemctl start qlweb2
```

Da chay thu ngay 28/09/2026: sao luu, khoi phuc vao mot CSDL tam, so ma bam tai khoan — khop.

### Quay ve SQLite

Tep SQLite cu khong bi xoa (`/srv/qlweb2/App_Data/qlweb2.db`), nen quay ve la hai dong:

```bash
rm /etc/systemd/system/qlweb2.service.d/mysql.conf
systemctl daemon-reload && systemctl restart qlweb2
```

Luu y: moi thu ghi vao MySQL ke tu luc chuyen (doi mat khau, lich su sua) **khong** co trong tep
SQLite do.

## Mat khau admin

Khong ai dat ho. Lan dang nhap dau tien dung `admin` / `changeme`, va may chu **bat doi ngay**
truoc khi cho vao bat cu man hinh nao (`Areas/Admin/FirstPassword.cs`). Mat khau do khong di qua
tay ai khac.

**Quen mat khau.** Khong co "quen mat khau" tren giao dien. May chu chi tu tao lai `admin` /
`changeme` khi **khong con tai khoan nao**, nen cach cuu la xoa dong tai khoan roi khoi dong lai:

```bash
ssh -p 24700 -i ~/.ssh/qlweb2_vps root@202.92.6.174 "mysql qlweb2 -e 'DELETE FROM AdminUsers' && systemctl restart qlweb2"
```

Lich su sua con nguyen — bang lich su khong noi gi voi bang tai khoan. Da thu dung quy trinh nay
tren mot ban sao: 639 ban lich su truoc, 639 ban sau.

## HTTPS

Ten mien: **aluminumboss.com** (dang ky o portal.inet.vn).

Khi ban ghi A cua `aluminumboss.com` va `www.aluminumboss.com` da tro ve `202.92.6.174`:

```bash
scp -P 24700 -i ~/.ssh/qlweb2_vps tools/deploy/https-setup.sh root@202.92.6.174:/tmp/
ssh  -p 24700 -i ~/.ssh/qlweb2_vps root@202.92.6.174 'bash /tmp/https-setup.sh aluminumboss.com'
```

Script tu kiem DNS truoc va **tu choi chay** neu ten mien chua tro dung cho. Khong phai can than
thua: Let's Encrypt chung minh quyen so huu bang cach goi nguoc ve `http://<ten mien>/.well-known/`,
va ho dem so lan that bai - 5 lan mot gio la bi khoa mot tieng.

No lam ba viec cung luc, va viec thu ba de quen nhat: doi `origin` trong `site.json` sang
`https://aluminumboss.com`. `origin` di vao canonical, vao `@id` cua JSON-LD va vao sitemap - bat
HTTPS ma quen no thi ca site chay https trong khi moi trang van khai minh song o http.

## Trang thai HTTPS

**Da bat ngay 28/09/2026.** Chung chi Let's Encrypt cho `aluminumboss.com` va `www`, certbot tu
gia han (`systemctl list-timers | grep certbot`). Vao bang `http://` hoac bang dia chi IP deu
chuyen ve `https://aluminumboss.com`.

Neu mot ngay chung chi hong (het han ma khong gia han duoc): man hinh dang nhap `/Admin` se lai
gui mat khau di duoi dang chu doc duoc. Kiem `certbot renew --dry-run` truoc khi nghi den gi
khac.

## Khi hong

```bash
ssh -p 24700 -i ~/.ssh/qlweb2_vps root@202.92.6.174 'journalctl -u qlweb2 -n 60 --no-pager'
ssh -p 24700 -i ~/.ssh/qlweb2_vps root@202.92.6.174 'systemctl status qlweb2 nginx'
```

`push.sh` giu lai ban vua chay duoc o `/srv/qlweb2/app.truoc`. Quay ve:

```bash
ssh -p 24700 -i ~/.ssh/qlweb2_vps root@202.92.6.174 \
  'systemctl stop qlweb2 && rm -rf /srv/qlweb2/app && mv /srv/qlweb2/app.truoc /srv/qlweb2/app && systemctl start qlweb2'
```
