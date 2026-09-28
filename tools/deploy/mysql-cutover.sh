#!/usr/bin/env bash
# Chuyen QlWeb2 tu SQLite sang MySQL. Chay TREN MAY CHU, sau mysql-setup.sh. Chay mot lan; chay
# lai khi da chuyen xong thi no bao "da chuyen" va thoi.
#
#   bash mysql-cutover.sh
#
# THU TU LA TOAN BO CAI SCRIPT NAY, va moi buoc o dung cho cua no vi mot cach hong cu the:
#
#   1. dung ung dung       - de khong ai ghi vao SQLite trong luc dang chep no di
#   2. chup SQLite         - ban chup nay la cai duoc chep, va cung la duong lui
#   3. tao schema          - bang mot ban ung dung chay o 127.0.0.1:5001, KHONG qua nginx.
#                            EnsureCreated tao bang roi bo khoi tao ghi ngay admin / changeme -
#                            mat khau mac dinh, co trong ma nguon cong khai. Chay o cong 5000 thi
#                            trong vai giay ay, ai tren internet cung dang nhap duoc.
#   4. chep du lieu        - xoa tai khoan bo khoi tao vua ghi, dat tai khoan that vao
#   5. doi chieu           - dem dong, va so tung truong cua tung dong. Lech la dung, khong noi.
#   6. noi vao             - bang mot drop-in, chu khong sua tep unit
#
# DUONG LUI: xoa /etc/systemd/system/qlweb2.service.d/mysql.conf, daemon-reload, khoi dong lai.
# Tep SQLite khong bi dong vao, nen ung dung quay ve dung trang thai truoc khi chuyen.
set -euo pipefail

APP=qlweb2
DICH=/srv/$APP
ENV_FILE=/etc/$APP/db.env
DROPIN_DIR=/etc/systemd/system/$APP.service.d
DROPIN=$DROPIN_DIR/mysql.conf
SQLITE=$DICH/App_Data/qlweb2.db
CONG_THU=5001

noi() { printf '\n=== %s\n' "$*"; }
dung() { echo; echo "  DUNG LAI: $*"; echo "  Ung dung: $(systemctl is-active $APP || true). Du lieu SQLite khong bi dong vao."; exit 1; }

if [ -f "$DROPIN" ]; then
  echo "Da chuyen sang MySQL tu truoc ($DROPIN co san). Khong lam gi."
  exit 0
fi

noi "kiem truoc"
[ -f "$ENV_FILE" ]            || dung "chua co $ENV_FILE - chay mysql-setup.sh truoc"
[ -f "$SQLITE" ]              || dung "khong thay $SQLITE"
systemctl is-active -q mysql  || dung "MySQL khong chay"
python3 -c 'import pymysql'   || dung "thieu python3-pymysql"
[ -f "$DICH/app/QlWeb2.dll" ] || dung "chua co ban ung dung trong $DICH/app"
grep -q 'Pomelo.EntityFrameworkCore.MySql' "$DICH/app/QlWeb2.deps.json" \
  || dung "ban ung dung tren may chua co trinh ket noi MySQL - day ban moi len bang push.sh truoc"
echo "  du"

noi "1. dung ung dung"
systemctl stop $APP
echo "  $(systemctl is-active $APP || true)"

noi "2. chup SQLite"
CHUP=$DICH/App_Data/qlweb2.cutover-$(date +%Y%m%d-%H%M%S).db
python3 - "$SQLITE" "$CHUP" <<'PY'
import sqlite3, sys
src = sqlite3.connect('file:%s?mode=ro' % sys.argv[1], uri=True)
dst = sqlite3.connect(sys.argv[2])
src.backup(dst)   # ban chup nhat quan, ke ca khi con tep -wal ben canh
dst.close()
PY
chmod 600 "$CHUP"; chown $APP:$APP "$CHUP"
echo "  $CHUP"

noi "3. tao schema (cong $CONG_THU, khong ra internet)"
# Xoa bang cu neu mot lan chay truoc do dung giua chung. An toan: CSDL MySQL chua noi vao dau ca
# - chinh cai tep drop-in chua ton tai o tren da chung minh dieu do.
mysql --protocol=socket -uroot qlweb2 -e 'DROP TABLE IF EXISTS ContentRevisions, AdminUsers;'

# systemd-run chu khong phai `dotnet ... &`: no doc db.env bang dung bo phan tich ma dich vu that
# se dung, nen day cung la lan kiem tep moi truong. Nguon cua mot cau hinh sai la chay thu o day
# chu khong phai luc site that khoi dong.
systemctl reset-failed $APP-schema 2>/dev/null || true
systemd-run --quiet --unit=$APP-schema --uid=$APP --gid=$APP \
  --working-directory=$DICH/app \
  -p EnvironmentFile=$ENV_FILE \
  -E ASPNETCORE_ENVIRONMENT=Production \
  -E ASPNETCORE_URLS=http://127.0.0.1:$CONG_THU \
  -E DOTNET_PrintTelemetryMessage=false \
  /usr/bin/dotnet $DICH/app/QlWeb2.dll

ma=000
for _ in $(seq 1 45); do
  ma=$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 http://127.0.0.1:$CONG_THU/ || true)
  [ "$ma" = "200" ] && break
  sleep 2
done
systemctl stop $APP-schema 2>/dev/null || true
if [ "$ma" != "200" ]; then
  journalctl -u $APP-schema -n 30 --no-pager | sed 's/^/    /'
  systemctl start $APP
  dung "ban chay thu tren MySQL khong len (ma $ma). Da bat lai ung dung tren SQLite."
fi
echo "  ban chay thu tra loi 200, schema da tao"
mysql --protocol=socket -uroot qlweb2 -N -e "SELECT CONCAT('  cot SavedAt: ', COLUMN_TYPE) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='qlweb2' AND TABLE_NAME='ContentRevisions' AND COLUMN_NAME='SavedAt';"

noi "4. chep du lieu + 5. doi chieu"
python3 - "$CHUP" <<'PY' || { systemctl start $APP; dung "chep hoac doi chieu du lieu that bai. Da bat lai ung dung tren SQLite."; }
import datetime, hashlib, sqlite3, sys
import pymysql

sq = sqlite3.connect('file:%s?mode=ro' % sys.argv[1], uri=True)
my = pymysql.connect(unix_socket='/var/run/mysqld/mysqld.sock', user='root',
                     database='qlweb2', charset='utf8mb4', autocommit=False)

def thoi_gian(v):
    # EF ghi DateTime vao SQLite dang chu "yyyy-MM-dd HH:mm:ss.fffffff" - bay chu so le. Python
    # va MySQL datetime(6) chi giu sau, nen chu so thu bay (100 nano giay) bi bo. Do la gioi han
    # cua dich den, va o do chinh xac micro giay thi thu tu cac lan luu khong doi.
    if v is None or v == '':
        return None
    v = str(v).replace('T', ' ')
    if '.' in v:
        dau, le = v.split('.', 1)
        le = ''.join(ch for ch in le if ch.isdigit())[:6]
        v = dau + '.' + le
    return datetime.datetime.fromisoformat(v)

users = sq.execute('SELECT Id, Username, PasswordHash, PasswordSalt, DisplayName, LastSignInAt '
                   'FROM AdminUsers ORDER BY Id').fetchall()
revs = sq.execute('SELECT Id, Name, Json, SavedAt, SavedBy FROM ContentRevisions ORDER BY Id').fetchall()

with my.cursor() as c:
    # Bo khoi tao vua ghi admin / changeme o buoc 3. Tai khoan that thay cho no, giu nguyen Id va
    # nguyen ban bam mat khau: ai da doi mat khau van dang nhap bang mat khau cua minh.
    c.execute('DELETE FROM AdminUsers')
    c.executemany('INSERT INTO AdminUsers (Id, Username, PasswordHash, PasswordSalt, DisplayName, '
                  'LastSignInAt) VALUES (%s,%s,%s,%s,%s,%s)',
                  [(u[0], u[1], u[2], u[3], u[4], thoi_gian(u[5])) for u in users])
    c.executemany('INSERT INTO ContentRevisions (Id, Name, Json, SavedAt, SavedBy) '
                  'VALUES (%s,%s,%s,%s,%s)',
                  [(r[0], r[1], r[2], thoi_gian(r[3]), r[4]) for r in revs])
my.commit()

# DOI CHIEU. Dem dong la chua du: mot chuoi tieng Viet bi hong bang ma van la mot dong. Nen so
# tung truong, va voi Json thi so ban bam cua tung byte.
with my.cursor() as c:
    c.execute('SELECT Id, Username, PasswordHash, PasswordSalt, DisplayName FROM AdminUsers ORDER BY Id')
    my_users = [tuple(r) for r in c.fetchall()]
    c.execute('SELECT Id, Name, Json, SavedBy FROM ContentRevisions ORDER BY Id')
    my_revs = [(r[0], r[1], hashlib.md5(r[2].encode('utf-8')).hexdigest(), r[3]) for r in c.fetchall()]

sq_users = [tuple(u[:5]) for u in users]
sq_revs = [(r[0], r[1], hashlib.md5(r[2].encode('utf-8')).hexdigest(), r[4]) for r in revs]

print('  tai khoan : SQLite %d, MySQL %d' % (len(sq_users), len(my_users)))
print('  lich su   : SQLite %d, MySQL %d' % (len(sq_revs), len(my_revs)))
if sq_users != my_users:
    raise SystemExit('  TAI KHOAN LECH')
if sq_revs != my_revs:
    raise SystemExit('  LICH SU LECH')
print('  tung truong, tung byte: khop')
PY

noi "6. noi vao"
install -d -m 0755 "$DROPIN_DIR"
cat > "$DROPIN" <<UNIT
# Dat boi tools/deploy/mysql-cutover.sh. Xoa tep nay + daemon-reload + restart = quay ve SQLite.
[Unit]
After=mysql.service
Wants=mysql.service

[Service]
EnvironmentFile=$ENV_FILE
UNIT
systemctl daemon-reload
systemctl start $APP

ma=000
for _ in $(seq 1 30); do
  ma=$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 http://127.0.0.1:5000/ || true)
  [ "$ma" = "200" ] && break
  sleep 2
done
if [ "$ma" != "200" ]; then
  journalctl -u $APP -n 30 --no-pager | sed 's/^/    /'
  rm -f "$DROPIN"; systemctl daemon-reload; systemctl restart $APP
  dung "ung dung khong len tren MySQL (ma $ma). Da go drop-in, quay ve SQLite."
fi

# Ba dieu phai dung SAU khi site that khoi dong tren MySQL, va ca ba deu la cach no hong ma van
# tra 200: tien trinh doc dung cau hinh, bo khoi tao KHONG them tai khoan thu hai, va khong co
# tep SQLite moi nao duoc de ra (dau hieu no dang lang le chay tren SQLite).
PID=$(systemctl show -p MainPID --value $APP)
tr '\0' '\n' < /proc/$PID/environ | grep -q '^Database__Provider=mysql$' \
  || dung "tien trinh dang chay KHONG nhan Database__Provider=mysql"
SO=$(mysql --protocol=socket -uroot qlweb2 -N -e 'SELECT COUNT(*) FROM AdminUsers')
[ "$SO" = "1" ] || dung "sau khi khoi dong co $SO tai khoan, phai la 1"
echo "  tien trinh $PID: Database__Provider=mysql"
echo "  tai khoan sau khoi dong: $SO (bo khoi tao khong them)"
echo "  qua nginx: $(curl -s -o /dev/null -w '%{http_code}' --max-time 5 -H 'Host: aluminumboss.com' http://127.0.0.1/ || true) (301 sang https la dung)"

noi "XONG - ung dung chay tren MySQL"
echo "  Tep SQLite cu van o $SQLITE, khong con ai doc. Ban chup: $CHUP"
