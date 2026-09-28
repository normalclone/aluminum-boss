# Dong goi sach huong dan thanh mot tep zip de gui cho khach.
#
#   python tools/guide-zip.py            # ra dist/HuongDan-BossGroup.zip
#
# docs/huong-dan.html la mot MANH trang (khong co <html>, <head>, <body>): trang artifact tu boc
# no vao khung. Mo thang tu may thi thieu khung do - khong co charset nen tieng Viet vo, khong co
# viewport nen dien thoai hien trang thu nho. Cong cu nay boc lai cho du, roi goi cung thu muc anh.
#
# Trong zip:  huong-dan-quan-tri/index.html  +  huong-dan-quan-tri/huong-dan/*.png
# Khach giai nen roi bam dup index.html. Phong chu tai tu Google Fonts khi co mang; khong co mang
# thi trang van doc duoc bang phong cua may.
import os, sys, zipfile

GOC = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
NGUON = os.path.join(GOC, 'docs', 'huong-dan.html')
ANH = os.path.join(GOC, 'docs', 'huong-dan')
RA = os.path.join(GOC, 'dist', 'HuongDan-BossGroup.zip')
THU_MUC = 'huong-dan-quan-tri'

manh = open(NGUON, encoding='utf-8').read()
cat = manh.index('</style>') + len('</style>')
dau, than = manh[:cat], manh[cat:]

trang = ('<!doctype html>\n<html lang="vi">\n<head>\n<meta charset="utf-8">\n'
         '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
         '<style>body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>\n'
         + dau + '\n</head>\n<body>' + than + '\n</body>\n</html>\n')

# Moi anh ma trang goi toi phai co trong thu muc - thieu mot cai la khach thay mot o trong.
import re
can = sorted(set(re.findall(r'src="huong-dan/([^"]+)"', trang)))
thieu = [a for a in can if not os.path.exists(os.path.join(ANH, a))]
if thieu:
    sys.exit('Thieu anh: ' + ', '.join(thieu))

os.makedirs(os.path.dirname(RA), exist_ok=True)
with zipfile.ZipFile(RA, 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr(THU_MUC + '/index.html', trang)
    for a in can:
        z.write(os.path.join(ANH, a), THU_MUC + '/huong-dan/' + a)

print('%s  (%d anh, %.1f MB)' % (RA, len(can), os.path.getsize(RA) / 1e6))
