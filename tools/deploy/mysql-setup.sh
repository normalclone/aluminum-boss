#!/usr/bin/env bash
# Cai MySQL cho QlWeb2 tren may chu. Chay TREN MAY CHU, sau server-setup.sh. Chay lai duoc.
#
#   bash mysql-setup.sh
#
# Cai, chinh cho may nho, tao CSDL + nguoi dung rieng, ghi thong tin ket noi ra /etc/qlweb2/db.env
# va dat lich sao luu hang ngay. KHONG noi ung dung vao MySQL - viec do la cua mysql-cutover.sh,
# va tach ra la co chu y: ung dung dang chay van o nguyen tren SQLite cho toi luc chuyen that.
#
# MAT KHAU cua nguoi dung MySQL duoc sinh ra NGAY TREN MAY NAY va chi nam trong db.env (quyen
# 0600, chu root). Khong in ra man hinh, khong di qua may lam viec, khong vao git. Can xem thi
# dang nhap may chu bang root ma doc tep.
#
# Tai sao db.env chu khong dat thang vao tep unit nhu Proxy__TrustedIps: tep unit o
# /etc/systemd/system co quyen 0644 - moi tai khoan tren may deu doc duoc. Mot mat khau nam do la
# mot mat khau cong khai voi bat cu ai vao duoc may.
set -euo pipefail

APP=qlweb2
DB=qlweb2
ENV_DIR=/etc/$APP
ENV_FILE=$ENV_DIR/db.env
SAO_LUU=/srv/$APP/sao-luu

noi() { printf '\n=== %s\n' "$*"; }

noi "goi"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
# python3-pymysql: cho mysql-cutover.sh chep du lieu tu SQLite sang. Nho, va khong ai goi toi no
# luc ung dung chay.
apt-get install -y -qq mysql-server python3-pymysql >/dev/null
PHIEN_BAN=$(mysqld --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
echo "  MySQL $PHIEN_BAN"

# May co 1,9 GB RAM, va MySQL mac dinh tinh cho mot may chu CSDL chuyen dung. CSDL nay co HAI
# bang - mot tai khoan va lich su sua; noi dung trang nam trong tep JSON, khong nam o day - nen
# bo dem 128 MB la du thua. performance_schema tat: no giu vai tram MB de do nhung truy van khong
# ai do. mysqlx tat: cong 33060 ma ung dung nay khong dung toi.
noi "chinh cho may nho"
cat > /etc/mysql/mysql.conf.d/zz-$APP.cnf <<'CNF'
# QlWeb2 - tools/deploy/mysql-setup.sh. May 1,9 GB RAM, hai bang, mot nguoi sua.
[mysqld]
bind-address            = 127.0.0.1
mysqlx                  = OFF
performance_schema      = OFF
innodb_buffer_pool_size = 128M
innodb_log_buffer_size  = 8M
max_connections         = 30
table_open_cache        = 200
tmp_table_size          = 16M
max_heap_table_size     = 16M
character-set-server    = utf8mb4
collation-server        = utf8mb4_0900_ai_ci
CNF
systemctl restart mysql
systemctl enable mysql >/dev/null 2>&1
echo "  $(systemctl is-active mysql), chi nghe o 127.0.0.1"

noi "CSDL va nguoi dung"
install -d -m 0700 -o root -g root "$ENV_DIR"

# Chay lai thi DUNG LAI mat khau cu. Sinh mat khau moi o lan chay thu hai se lam ung dung dang
# chay mat ket noi ngay luc tep doi, ma khong ai dinh doi gi.
if [ -f "$ENV_FILE" ] && grep -q '^ConnectionStrings__Default=' "$ENV_FILE"; then
  MK=$(grep -oE 'Password=[0-9a-f]+' "$ENV_FILE" | cut -d= -f2)
  echo "  dung lai mat khau co san trong $ENV_FILE"
else
  # Chi chu so thap luc phan: khong co ky tu nao can thoat trong chuoi ket noi (;  =  ") hay
  # trong tep moi truong cua systemd. 48 ky tu = 192 bit.
  MK=$(openssl rand -hex 24)
  echo "  sinh mat khau moi (khong in ra)"
fi

# root cua MySQL tren Ubuntu dang nhap bang auth_socket: chi chinh tai khoan root cua he dieu
# hanh moi vao duoc, khong can mat khau. Nen lenh duoi khong mang mat khau root nao.
mysql --protocol=socket -uroot <<SQL
CREATE DATABASE IF NOT EXISTS \`$DB\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER IF NOT EXISTS '$APP'@'localhost' IDENTIFIED BY '$MK';
CREATE USER IF NOT EXISTS '$APP'@'127.0.0.1' IDENTIFIED BY '$MK';
ALTER USER '$APP'@'localhost' IDENTIFIED BY '$MK';
ALTER USER '$APP'@'127.0.0.1' IDENTIFIED BY '$MK';
GRANT ALL PRIVILEGES ON \`$DB\`.* TO '$APP'@'localhost';
GRANT ALL PRIVILEGES ON \`$DB\`.* TO '$APP'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL
echo "  CSDL \`$DB\`, nguoi dung '$APP' - chi co quyen tren CSDL cua no"

# Gia tri co dau ; nen phai trong ngoac kep: systemd bo ngoac, con neu ai do `source` tep nay
# bang bash thi khong co ngoac, dau ; se cat chuoi ket noi lam doi va chay phan con lai nhu mot
# lenh.
umask 077
cat > "$ENV_FILE" <<ENV
# Doc boi systemd (EnvironmentFile) khi mysql-cutover.sh da noi vao. Quyen 0600, chu root.
Database__Provider=mysql
Database__ServerVersion=$PHIEN_BAN
ConnectionStrings__Default="Server=127.0.0.1;Port=3306;Database=$DB;User=$APP;Password=$MK;CharSet=utf8mb4"
ENV
chmod 600 "$ENV_FILE"
echo "  $ENV_FILE ($(stat -c '%a %U' "$ENV_FILE"))"

# Kiem mat khau vua ghi thuc su dang nhap duoc - bang chinh tep, khong bang bien trong script, de
# cai duoc kiem la cai ung dung se doc.
MK_TEP=$(grep -oE 'Password=[0-9a-f]+' "$ENV_FILE" | cut -d= -f2)
if MYSQL_PWD="$MK_TEP" mysql -h127.0.0.1 -u"$APP" -e "SELECT 1" "$DB" >/dev/null 2>&1; then
  echo "  dang nhap bang thong tin trong tep: duoc"
else
  echo "  KHONG dang nhap duoc bang thong tin trong tep - dung lai"; exit 1
fi
unset MK MK_TEP

# SAO LUU. Voi SQLite, sao luu la chep mot tep. Voi MySQL thi khong con dung the - tep trong
# /var/lib/mysql chep luc may dang chay la ban hong. Nen co mysqldump moi dem, giu 14 ban.
noi "sao luu hang ngay"
install -d -m 0700 -o root -g root "$SAO_LUU"
cat > /usr/local/sbin/$APP-sao-luu <<SH
#!/usr/bin/env bash
# mysqldump CSDL $DB moi dem, giu 14 ban. Dat boi tools/deploy/mysql-setup.sh.
set -euo pipefail
tep=$SAO_LUU/$DB-\$(date +%Y%m%d-%H%M).sql.gz
mysqldump --protocol=socket -uroot --single-transaction --routines --triggers \\
  --default-character-set=utf8mb4 $DB | gzip -9 > "\$tep"
chmod 600 "\$tep"
ls -1t $SAO_LUU/$DB-*.sql.gz | tail -n +15 | xargs -r rm -f
SH
chmod 700 /usr/local/sbin/$APP-sao-luu

cat > /etc/systemd/system/$APP-sao-luu.service <<UNIT
[Unit]
Description=Sao luu CSDL $DB
After=mysql.service
Requires=mysql.service

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/$APP-sao-luu
UNIT

cat > /etc/systemd/system/$APP-sao-luu.timer <<UNIT
[Unit]
Description=Sao luu CSDL $DB moi dem

[Timer]
OnCalendar=*-*-* 02:30:00
Persistent=true
RandomizedDelaySec=10m

[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemctl enable --now $APP-sao-luu.timer >/dev/null 2>&1
echo "  $(systemctl list-timers $APP-sao-luu.timer --no-legend | awk '{print $1, $2, $3}') -> $SAO_LUU"

noi "XONG phan MySQL"
echo "  Ung dung VAN dang chay tren SQLite. Chuyen that: bash mysql-cutover.sh"
