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
| Dang nhap | **bang khoa**, `~/.ssh/qlweb2_vps` |

## Hai lenh

```bash
# Mot lan, tren may chu: ban chay, nguoi dung, swap, systemd, nginx, tuong lua
scp -P 24700 -i ~/.ssh/qlweb2_vps tools/deploy/server-setup.sh root@202.92.6.174:/tmp/
ssh  -p 24700 -i ~/.ssh/qlweb2_vps root@202.92.6.174 'bash /tmp/server-setup.sh'

# Moi lan sau do, tu may lam viec
bash tools/deploy/push.sh
```

## Bo cuc thu muc, va vi sao no nhu vay

```
/srv/qlweb2/app/        ma nguon      <- push.sh XOA VA GHI LAI ca thu muc nay
/srv/qlweb2/App_Data/   CSDL + don hang
/srv/qlweb2/noi-dung/   _data, _media <- noi dung that, KHONG bao gio bi push.sh cham vao
```

Hai thu muc duoi nam **ngoai** `app/` va duoc noi vao bang lien ket. Ly do la mot cach mat du
lieu rat de xay ra: tu luc may nay thay Pages, `_data/*.json` tren may chu la ban that — moi lan
khach bam Save la ghi vao day — con ban `_data` tren may lam viec chi la anh chup luc trien khai
lan truoc. Giai nen de len no se xoa sach cong sua cua khach, khong hoi mot cau, va khong ai
biet cho toi khi mo trang ra xem.

Nen `push.sh` **mac dinh khong day noi dung len**. Muon day that thi `--kem-noi-dung`, va luc do
no ghi de that.

## Mat khau admin

Khong ai dat ho. Lan dang nhap dau tien dung `admin` / `changeme`, va may chu **bat doi ngay**
truoc khi cho vao bat cu man hinh nao (`Areas/Admin/FirstPassword.cs`). Mat khau do khong di qua
tay ai khac.

## Dieu phai noi ro: HTTPS chua co

May nay dang chay **HTTP tran**, theo quyet dinh ngay 28/09/2026 khi chua co ten mien tro ve
`202.92.6.174`.

Hau qua cu the, khong phai ly thuyet: **man hinh dang nhap `/Admin` gui mat khau di duoi dang
chu doc duoc.** Ai dung giua duong truyen — cung mang Wi-Fi, nha mang, may chu trung gian — deu
doc duoc. Con phan site cong khai thi khong co gi bi mat de lo.

Co ten mien roi thi vá het trong vai phut, va cong 443 da mo san:

```bash
ssh -p 24700 -i ~/.ssh/qlweb2_vps root@202.92.6.174 \
  'apt-get install -y certbot python3-certbot-nginx && certbot --nginx -d TEN.MIEN'
```

Sau do doi `Proxy__TrustedIps__0` van la `127.0.0.1` (khong can sua), va `UseHttpsRedirection`
trong `Program.cs` se bat dau lam viec that thay vi nam im.

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
