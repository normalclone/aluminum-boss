#!/usr/bin/env bash
# Dung mot may Ubuntu tron thanh may chu chay QlWeb2. Chay MOT LAN, va chay lai duoc.
#
#   bash server-setup.sh
#
# Khong chep ma nguon - viec do la cua push.sh. Cho nay chi lo phan may: ban chay .NET, nguoi
# dung he thong, thu muc, swap, tuong lua, dich vu systemd, va nginx dung truoc cua.
#
# BO CUC THU MUC, va no co ly do:
#
#   /srv/qlweb2/app/         ma nguon. push.sh XOA VA GHI LAI CA THU MUC NAY moi lan trien khai.
#   /srv/qlweb2/App_Data/    CSDL SQLite + enquiries.jsonl
#   /srv/qlweb2/noi-dung/    _data (chu cua trang) va _media (anh khach tai len)
#
#   Hai thu muc duoi nam NGOAI app/ va duoc noi vao bang lien ket. Tu luc may nay thay GitHub
#   Pages, chung la ban THAT cua noi dung - moi lan khach bam Save la ghi vao day - nen chung
#   phai nam ngoai tam voi cua mot lenh giai nen. Do la khac biet giua "trien khai lai" va
#   "xoa sach cong sua cua khach".
#
# THU TU CUA TUONG LUA LA CHO DE MAT MAY. `ufw --force enable` bat chinh sach chan-het-mac-dinh
# ngay lap tuc, ke ca cong SSH dang noi. Nen cong SSH duoc mo TRUOC, trong cung mot lan chay, va
# so cong lay tu chinh phien dang ket noi chu khong viet cung 22 - may nay dung 24700.
set -euo pipefail

APP=qlweb2
DICH=/srv/$APP
CONG_APP=5000

noi() { printf '\n=== %s\n' "$*"; }

CONG_SSH=$(ss -tlnp 2>/dev/null | awk '/sshd/ {split($4,a,":"); print a[length(a)]; exit}')
CONG_SSH=${CONG_SSH:-22}
noi "cong SSH dang nghe: $CONG_SSH"

noi "goi he thong"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq aspnetcore-runtime-8.0 nginx curl ca-certificates >/dev/null
dotnet --list-runtimes | sed 's/^/  /'

# 1,9 GB RAM, khong co swap. .NET giu bo nho dem kha rong va nginx nam canh; het RAM giua chung
# thi tien trinh bi kernel giet, va do la mot cai chet im lang chu khong phai mot canh bao.
# 2 GB swap tren o 40 GB la bao hiem re.
noi "swap"
if swapon --show | grep -q .; then
  echo "  da co swap, de nguyen"
else
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap -q /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "  da them 2G"
fi

noi "nguoi dung va thu muc"
id -u $APP >/dev/null 2>&1 || useradd --system --home-dir $DICH --shell /usr/sbin/nologin $APP
mkdir -p $DICH/app $DICH/App_Data $DICH/noi-dung/_data $DICH/noi-dung/_media
chown -R $APP:$APP $DICH
echo "  $DICH/{app,App_Data,noi-dung}"

noi "dich vu systemd"
cat > /etc/systemd/system/$APP.service <<UNIT
[Unit]
Description=QlWeb2 - site nhom Boss Group
After=network-online.target
Wants=network-online.target

[Service]
# simple, KHONG phai notify: ung dung nay khong goi UseSystemd() nen no khong bao gio bao
# "toi san sang" cho systemd. Dat notify thi systemd cho het gio roi ket luan dich vu chet,
# trong khi no dang chay binh thuong.
Type=simple
User=$APP
Group=$APP
WorkingDirectory=$DICH/app
ExecStart=/usr/bin/dotnet $DICH/app/QlWeb2.dll
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://127.0.0.1:$CONG_APP
Environment=DOTNET_PrintTelemetryMessage=false

# Loi khai "ai duoc phep noi ho dia chi cua khach". nginx nam cung may nen chi co 127.0.0.1.
# De trong thi may chu thay MOI khach deu la 127.0.0.1, va gioi han 8 lan gui bieu mau moi gio
# se khoa bieu mau cho toan bo internet thay vi cho mot nguoi.
#
# Dat o day chu khong sua appsettings.json, vi push.sh ghi de ca thu muc app/ moi lan trien khai
# va se cuon mat cau hinh rieng cua may nay theo.
Environment=Proxy__TrustedIps__0=127.0.0.1

Restart=always
RestartSec=5
SyslogIdentifier=$APP

# Ba duong duoi day la toan bo cho ung dung duoc ghi, va cung la toan bo cho no CAN ghi. Phan
# con lai cua dia chi doc. Ghi ra duong that chu khong ra lien ket: systemd xet duong that.
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$DICH/App_Data $DICH/noi-dung/_data $DICH/noi-dung/_media

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable $APP >/dev/null 2>&1
echo "  /etc/systemd/system/$APP.service"

noi "nginx"
cat > /etc/nginx/sites-available/$APP <<NGINX
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    # Anh tai len toi da 20 MB (cung con so man hinh soan noi voi khach). Mac dinh cua nginx la
    # 1 MB, va vuot qua thi khach nhan 413 tu nginx - ung dung khong he biet co ai vua thu tai.
    client_max_body_size 45m;   # PDF cua Documents toi 40 MB (08/10/2026)

    location / {
        proxy_pass         http://127.0.0.1:$CONG_APP;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_set_header   Upgrade           \$http_upgrade;
        proxy_set_header   Connection        keep-alive;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 120s;
    }
}
NGINX
ln -sf /etc/nginx/sites-available/$APP /etc/nginx/sites-enabled/$APP
rm -f /etc/nginx/sites-enabled/default
nginx -t 2>&1 | sed 's/^/  /'
systemctl reload nginx || systemctl restart nginx

noi "tuong lua"
ufw allow "$CONG_SSH"/tcp >/dev/null      # TRUOC enable. Xem chu thich dau tep.
ufw allow 80/tcp  >/dev/null
ufw allow 443/tcp >/dev/null              # de san cho ngay co ten mien
ufw --force enable >/dev/null
ufw status | sed 's/^/  /'

noi "XONG phan may"
echo "  Gio chay push.sh de dua ma nguon len."
