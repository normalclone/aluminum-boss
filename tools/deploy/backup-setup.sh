#!/usr/bin/env bash
# Dat lich sao luu cho QlWeb2: cron luc 00:00 moi dem, giu 3 ban gan nhat moi loai.
# Chay TREN MAY CHU, bang root. Chay lai duoc - lan sau ghi de dung cac tep cua lan truoc.
#
#   ssh -p 24700 -i ~/.ssh/qlweb2_vps root@202.92.6.174 'bash -s' < tools/deploy/backup-setup.sh
#
# Moi lan chay ra ba tep trong /srv/qlweb2/sao-luu/:
#
#   qlweb2-YYYYMMDD-HHMM.sql.gz      CSDL (mysqldump): tai khoan + lich su sua
#   noi-dung-YYYYMMDD-HHMM.tar.gz    chu cua trang, anh, va ca App_Data (don lien he, khoa phien)
#   ma-nguon-YYYYMMDD-HHMM.tar.gz    ban ung dung dang chay (/srv/qlweb2/app) + cau hinh may chu
#                                    (unit systemd, nginx, /etc/qlweb2/db.env)
#
# Thay cho timer systemd 02:30 / 14 ban ma mysql-setup.sh dat ngay 28/09/2026 (02/10/2026: anh
# yeu cau cron, 12 gio dem, 3 ban). Timer cu bi go: hai lich cung don mot thu muc thi lich giu 3
# ban se xoa mat ban ma lich giu 14 ban dang tinh la con.
set -euo pipefail

APP=qlweb2
DB=qlweb2
SAO_LUU=/srv/$APP/sao-luu
SCRIPT=/usr/local/sbin/$APP-sao-luu
LOG=/var/log/$APP-sao-luu.log

noi() { printf '\n=== %s\n' "$*"; }

noi "kich ban sao luu"
install -d -m 0700 -o root -g root "$SAO_LUU"
cat > "$SCRIPT" <<'SH'
#!/usr/bin/env bash
# Sao luu QlWeb2: CSDL + noi dung + ma nguon. Giu 3 ban moi loai. Dat boi tools/deploy/backup-setup.sh.
#
# Moi tep duoc ghi ra ten ".dang-ghi" roi moi doi ten. Mot lan sao luu hong giua chung (dia day,
# mysqldump loi) khong de lai mot tep nua voi mot cai ten dung - tep do se dung dau danh sach
# "moi nhat" va day mot ban tot ra khoi ba ban duoc giu.
set -euo pipefail
umask 077

SAO_LUU=/srv/qlweb2/sao-luu
GIU=3
LUC=$(date +%Y%m%d-%H%M)

# Hai lan chay chong nhau (cron + chay tay) thi lan sau doi, khong ghi cung luc.
exec 9>/run/qlweb2-sao-luu.lock
flock -w 600 9

ghi() {   # ghi <ten-tep-cuoi> <lenh...>: chay lenh, dau ra vao tep tam, xong moi doi ten
  local cuoi=$1; shift
  "$@" > "$cuoi.dang-ghi"
  mv "$cuoi.dang-ghi" "$cuoi"
}

don() {   # don <tien-to>: giu GIU ban moi nhat
  ls -1t "$SAO_LUU"/"$1"-*.gz 2>/dev/null | tail -n +$((GIU + 1)) | xargs -r rm -f
}

rm -f "$SAO_LUU"/*.dang-ghi

# 1. CSDL. --single-transaction: ban chup nhat quan ma khong khoa bang luc ung dung dang chay.
ghi "$SAO_LUU/qlweb2-$LUC.sql.gz" bash -o pipefail -c \
  'mysqldump --protocol=socket -uroot --single-transaction --routines --triggers \
     --default-character-set=utf8mb4 qlweb2 | gzip -9'

# 2. Noi dung. noi-dung/ la noi THAT cua _data va _media (trong app/wwwroot chung chi la lien
#    ket). App_Data ca thu muc: don lien he, va khoa Data Protection - mat khoa thi moi phien dang
#    nhap va moi bieu mau dang mo deu hong sau khi khoi phuc.
ghi "$SAO_LUU/noi-dung-$LUC.tar.gz" tar -czf - -C /srv/qlweb2 noi-dung App_Data

# 3. Ma nguon dang chay + cau hinh may chu. Lien ket _data/_media giu nguyen la lien ket (khong
#    -h): noi dung da nam o tep 2, chep lai lan nua chi lam tep to gap doi.
cauhinh=()
for f in /etc/systemd/system/qlweb2.service /etc/systemd/system/qlweb2.service.d \
         /etc/nginx/sites-available/qlweb2 /etc/qlweb2; do
  [ -e "$f" ] && cauhinh+=("${f#/}")
done
ghi "$SAO_LUU/ma-nguon-$LUC.tar.gz" tar -czf - -C / srv/qlweb2/app "${cauhinh[@]}"

don qlweb2
don noi-dung
don ma-nguon

echo "$(date '+%F %T') xong: $(ls -1 "$SAO_LUU" | grep -c "$LUC") tep, $(du -sh "$SAO_LUU" | cut -f1) trong $SAO_LUU"
SH
chmod 700 "$SCRIPT"
echo "  $SCRIPT"

noi "go lich cu (timer systemd 02:30)"
if systemctl list-unit-files "$APP-sao-luu.timer" --no-legend 2>/dev/null | grep -q .; then
  systemctl disable --now "$APP-sao-luu.timer" >/dev/null 2>&1 || true
  rm -f /etc/systemd/system/$APP-sao-luu.timer /etc/systemd/system/$APP-sao-luu.service
  systemctl daemon-reload
  echo "  da go"
else
  echo "  khong co"
fi

noi "cron 00:00 moi dem"
# Mui gio may chu la Asia/Ho_Chi_Minh, nen 00:00 o day la 12 gio dem gio Viet Nam.
cat > /etc/cron.d/$APP-sao-luu <<CRON
# Sao luu QlWeb2 moi dem luc 00:00 (gio may chu: $(timedatectl show -p Timezone --value 2>/dev/null || echo '?')).
# Dat boi tools/deploy/backup-setup.sh. Nhat ky: $LOG
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
0 0 * * * root $SCRIPT >> $LOG 2>&1
CRON
chmod 644 /etc/cron.d/$APP-sao-luu
systemctl is-active --quiet cron || systemctl enable --now cron
echo "  /etc/cron.d/$APP-sao-luu"

# Nhat ky moi dem mot dong; logrotate cho no khoi lon mai.
cat > /etc/logrotate.d/$APP-sao-luu <<ROT
$LOG {
  monthly
  rotate 3
  missingok
  notifempty
  compress
}
ROT

noi "chay thu mot lan"
"$SCRIPT" | tee -a "$LOG"
ls -lh "$SAO_LUU"
