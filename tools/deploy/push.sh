#!/usr/bin/env bash
# Dua ban chay moi nhat len may chu. Chay tu may lam viec, lap lai bao nhieu lan cung duoc.
#
#   bash tools/deploy/push.sh                 # chi day MA NGUON, giu nguyen noi dung tren may chu
#   bash tools/deploy/push.sh --kem-noi-dung  # day ca wwwroot/_data va wwwroot/_media, ghi de
#
# VI SAO MAC DINH KHONG DAY NOI DUNG, va day la cho de mat du lieu cua khach:
#
#   Tu luc may chu nay thay GitHub Pages, `_data/*.json` TREN MAY CHU la ban that - moi lan khach
#   bam Save trong trinh soan la ghi vao day. Ban `_data` tren may lam viec chi la anh chup luc
#   trien khai lan truoc. Giai nen de len no se xoa sach moi thay doi khach da lam ke tu do,
#   khong hoi mot cau, va khong ai biet cho toi khi mo trang ra xem.
#
#   Cung ly le voi `_media`: anh khach tai len nam tren may chu, khong nam o day.
#
#   Nen mac dinh la: ma nguon di len, noi dung o nguyen. Khi nao that su muon day noi dung tu may
#   lam viec len - lan cai dau tien, hoac vua them mot trang moi co tep du lieu rieng - thi noi
#   ro bang --kem-noi-dung.
set -euo pipefail

MAY=root@202.92.6.174
CONG=24700
KHOA=${KHOA:-$HOME/.ssh/qlweb2_vps}
DICH=/srv/qlweb2
APP=qlweb2

GOC=$(cd "$(dirname "$0")/../.." && pwd)
TAM=$(mktemp -d)
trap 'rm -rf "$TAM"' EXIT

KEM_NOI_DUNG=0
[ "${1:-}" = "--kem-noi-dung" ] && KEM_NOI_DUNG=1

ssh_() { ssh -i "$KHOA" -p "$CONG" -o BatchMode=yes -o StrictHostKeyChecking=accept-new "$MAY" "$@"; }
noi() { printf '\n=== %s\n' "$*"; }

noi "dong goi ban Release cho linux-x64"
cd "$GOC"
dotnet publish QlWeb2.csproj -c Release -r linux-x64 --self-contained false \
  -o "$TAM/publish" -v q --nologo | tail -3

if [ "$KEM_NOI_DUNG" = "0" ]; then
  rm -rf "$TAM/publish/wwwroot/_data" "$TAM/publish/wwwroot/_media"
  echo "  (bo _data va _media khoi goi - noi dung tren may chu giu nguyen)"
else
  echo "  (CO kem _data va _media - noi dung tren may chu SE bi ghi de)"
fi

( cd "$TAM/publish" && tar -czf "$TAM/goi.tar.gz" . )
echo "  goi: $(du -h "$TAM/goi.tar.gz" | cut -f1)"

noi "chep len may chu"
scp -i "$KHOA" -P "$CONG" -o BatchMode=yes -o StrictHostKeyChecking=accept-new -q \
  "$TAM/goi.tar.gz" "$MAY:/tmp/$APP-goi.tar.gz"

noi "trien khai"
ssh_ "APP=$APP DICH=$DICH bash -s" <<'XA'
set -euo pipefail
systemctl stop "$APP" 2>/dev/null || true

# Giu lai ban VUA CHAY DUOC, khong phai ban tu ba lan truoc: khi mot lan trien khai hong thi thu
# can quay ve la cai dang chay cach day nam phut.
if [ -d "$DICH/app" ] && [ -f "$DICH/app/QlWeb2.dll" ]; then
  rm -rf "$DICH/app.truoc"
  cp -a "$DICH/app" "$DICH/app.truoc"
fi

rm -rf "$DICH/app"
mkdir -p "$DICH/app"
tar -xzf "/tmp/$APP-goi.tar.gz" -C "$DICH/app"
rm -f "/tmp/$APP-goi.tar.gz"

mkdir -p "$DICH/App_Data" "$DICH/noi-dung/_data" "$DICH/noi-dung/_media"

# Noi dung co trong goi CHI khi chay voi --kem-noi-dung, va luc do y dinh la ghi de - nen `cp -a`
# chu khong phai `cp -an`. Mot co "ghi de" ma khong ghi de duoc cai dang co la mot co noi doi.
for d in _data _media; do
  if [ -d "$DICH/app/wwwroot/$d" ]; then
    cp -a "$DICH/app/wwwroot/$d/." "$DICH/noi-dung/$d/"
    rm -rf "$DICH/app/wwwroot/$d"
  fi
  ln -sfn "$DICH/noi-dung/$d" "$DICH/app/wwwroot/$d"
done

rm -rf "$DICH/app/App_Data"
ln -sfn "$DICH/App_Data" "$DICH/app/App_Data"

chown -R "$APP:$APP" "$DICH"
systemctl start "$APP"
XA

noi "cho may chu tra loi"
ma=000
for _ in $(seq 1 30); do
  ma=$(ssh_ "curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:5000/ || true")
  [ "$ma" = "200" ] && break
  sleep 2
done
echo "  trong may : $ma"
# Tu khi co HTTPS, cong 80 tra 301 sang https - do la dung, khong phai loi, nen noi ro ra.
qua_nginx=$(ssh_ "curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1/ || true")
[ "$qua_nginx" = "301" ] && qua_nginx="301 (chuyen sang https - dung)"
echo "  qua nginx : $qua_nginx"

if [ "$ma" != "200" ]; then
  noi "KHONG LEN - nhat ky 40 dong cuoi"
  ssh_ "journalctl -u $APP -n 40 --no-pager"
  exit 1
fi

noi "XONG"
ssh_ "systemctl is-active $APP nginx | tr '\n' ' '; echo"
