#!/usr/bin/env bash
# Bat HTTPS cho mot ten mien da tro ve may nay. Chay TREN MAY CHU, sau server-setup.sh.
#
#   bash https-setup.sh aluminumboss.com
#
# Lam ba viec, va ca ba phai di cung nhau:
#   1. nginx nhan ten mien (server_name)
#   2. certbot xin chung chi Let's Encrypt va tu them chuyen huong http -> https
#   3. `origin` trong site.json doi sang https://<ten mien>
#
# VIEC 3 KHONG PHAI PHU. `origin` la cai di vao canonical, vao @id cua JSON-LD va vao sitemap.
# Bat HTTPS ma quen no thi ca site chay https trong khi moi trang van khai minh song o http -
# tuc la tu bao voi may tim kiem rang ban that nam o mot dia chi khac. Nen no nam trong cung mot
# script chu khong phai mot dong trong tai lieu ai do se doc sau.
set -euo pipefail

TEN_MIEN=${1:-}
[ -z "$TEN_MIEN" ] && { echo "Thieu ten mien. Vi du: bash https-setup.sh aluminumboss.com"; exit 1; }

APP=qlweb2
DU_LIEU=/srv/$APP/noi-dung/_data/site.json

noi() { printf '\n=== %s\n' "$*"; }

# DNS TRUOC MOI THU KHAC, va day khong phai su can than thua.
#
# Let's Encrypt chung minh quyen so huu bang cach GOI NGUOC ve http://<ten mien>/.well-known/...
# Ten mien chua tro ve day thi cu goi do di toi may khac, hoac khong toi dau ca, va lan xin that
# bai. Ho dem so lan that bai: 5 lan mot gio cho mot ten mien la bi khoa mot tieng. Nen kiem
# truoc mot lan re hon la dot mot lan thu.
noi "kiem DNS"
IP_MAY=$(curl -s --max-time 10 https://api.ipify.org || hostname -I | awk '{print $1}')
IP_TEN=$(getent hosts "$TEN_MIEN" | awk '{print $1}' | head -1 || true)
echo "  may nay   : $IP_MAY"
echo "  $TEN_MIEN : ${IP_TEN:-(chua phan giai duoc)}"

if [ -z "$IP_TEN" ]; then
  echo
  echo "  DUNG LAI. $TEN_MIEN chua phan giai ra dia chi nao."
  echo "  Tao ban ghi A tro ve $IP_MAY roi cho DNS lan ra, sau do chay lai."
  exit 1
fi
if [ "$IP_TEN" != "$IP_MAY" ]; then
  echo
  echo "  DUNG LAI. $TEN_MIEN dang tro ve $IP_TEN, khong phai $IP_MAY."
  echo "  Sua ban ghi A roi chay lai."
  exit 1
fi
echo "  khop."

noi "nginx nhan ten mien"
sed -i "s/^\( *\)server_name .*/\1server_name $TEN_MIEN www.$TEN_MIEN;/" \
  /etc/nginx/sites-available/$APP
nginx -t 2>&1 | sed 's/^/  /'
systemctl reload nginx

noi "chung chi"
export DEBIAN_FRONTEND=noninteractive
apt-get install -y -qq certbot python3-certbot-nginx >/dev/null

# --redirect: certbot tu them khoi http -> https. Khong co no thi cong 80 van phuc vu ban khong
# ma hoa, va man hinh dang nhap van gui mat khau di duoi dang chu doc duoc - dung cai viec nay
# sinh ra de sua.
#
# Tra ve khong-phai-0 thi dung han va giu nguyen cau hinh cu: mot site chay http van hon mot
# site khong chay.
certbot --nginx --non-interactive --agree-tos --redirect \
  --register-unsafely-without-email \
  -d "$TEN_MIEN" -d "www.$TEN_MIEN" 2>&1 | tail -12

noi "origin trong du lieu"
python3 - "$DU_LIEU" "https://$TEN_MIEN" <<'PY'
import io, json, sys, collections
tep, moi = sys.argv[1], sys.argv[2]
d = json.load(io.open(tep, encoding='utf-8'), object_pairs_hook=collections.OrderedDict)
cu = d.get('origin')
d['origin'] = moi
io.open(tep, 'w', encoding='utf-8', newline='').write(
    json.dumps(d, ensure_ascii=False, indent=2) + '\n')
print('  %s -> %s' % (cu, moi))
PY
chown $APP:$APP "$DU_LIEU"
systemctl restart $APP

noi "kiem lai"
sleep 4
for d in "http://$TEN_MIEN/" "https://$TEN_MIEN/" "https://www.$TEN_MIEN/"; do
  printf '  %-34s %s\n' "$d" \
    "$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' --max-time 15 "$d" || true)"
done
echo
echo "  canonical tren mot trang muc:"
curl -s --max-time 15 "https://$TEN_MIEN/news/press-line-2500/" \
  | grep -o '<link rel="canonical"[^>]*>' | sed 's/^/    /'

noi "XONG"
echo "  Tu day man hinh dang nhap /Admin da duoc ma hoa."
echo "  certbot tu gia han; kiem bang: systemctl list-timers | grep certbot"
