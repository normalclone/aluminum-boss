# To lien anh cho lo anh vua tai, kem mot diem doan xem tam nao co chu in san.
#
#   python tools/images-text.py                      # doc import/media/, ghi to lien anh
#   python tools/images-text.py --dir import/media/dot2   # thu muc khac
#
# ---------------------------------------------------------------------------------------------
# VI SAO KHONG OCR
#
# Nhieu anh cua bossdoor.vn la anh quang cao co CHU TIENG VIET in thang len anh. Dung chung tren
# trang tieng Anh thi sai, va phai ve lai chu khong dung duoc.
#
# May nay khong co tesseract (chi co pytesseract, la vo boc - khong co nhi phan thi vo dung).
# Nen cong cu nay KHONG tuyen bo la no doc duoc chu. No lam hai viec that tha hon:
#
#   1. Cham mot diem `text` bang hai dai luong do duoc: MAT DO BIEN (chu tao ra rat nhieu bien
#      ngan, sac net) va DO PHANG MAU (anh do hoa co it mau phang lon; anh chup thi khong).
#      Diem cao = dang ngo. Diem KHONG phai ket luan.
#
#   2. Ghep tat ca vao MOT to lien anh, xep tam dang ngo len truoc, moi o co ten va diem.
#      Nguoi nhin to nay quyet dinh, khong phai con so.
#
# Cach doc ket qua: mo tools/out/lien-anh.png, nhin tu tren xuong. Doan dau se lan lon anh do
# hoa co chu va anh san pham nen trang - ca hai deu "phang va nhieu bien". Do la gioi han that
# cua phep do nay, va vi the buoc nhin la bat buoc chu khong phai tuy chon.
#
# DA THU VA BO: mot lan da co nguong `s >= 40` ve vien do quanh cac tam dang ngo nhat. Tren lo 79
# anh cua bossdoor.vn no bat duoc 0/79, trong khi tam diem cao nhat lai la mot ban ve ky thuat
# sach khong co mot chu nao. Nguong do khong phan biet duoc gi nen da go han di: cong cu nay chi
# con XEP THU TU to lien anh, viec quyet dinh la cua nguoi nhin.
import io
import json
import math
import os
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
OUT = os.path.join(ROOT, 'tools', 'out')
CELL = 260          # canh o trong to lien anh
PAD = 26            # cho ghi ten duoi moi o
COLS = 6


def arg(name, default):
    if '--' + name in sys.argv:
        i = sys.argv.index('--' + name)
        if i + 1 < len(sys.argv):
            return sys.argv[i + 1]
    return default


def score(im):
    """Diem 0..100: cang cao cang giong anh do hoa co chu.

    Hai dai luong, ca hai deu do tren ban xam thu nho ve 256px de anh to nho khong lech nhau:

      edge  - trung binh do lon cua sai phan lan can. Chu in tao bien ngan va sac, nen chu lam
              con so nay len cao; anh chup mo hoac co do sau truong anh thi thap.
      flat  - ty le diem anh nam trong 16 muc xam pho bien nhat. Anh do hoa dung it mau phang;
              anh chup trai deu tren ca dai.

    Nhan hai lai: mot tam VUA nhieu bien VUA phang la dac diem rat rieng cua chu tren nen phang.
    Anh san pham chup tren nen trang cung phang, nhung it bien hon nhieu.
    """
    g = im.convert('L')
    g.thumbnail((256, 256), Image.LANCZOS)
    w, h = g.size
    px = g.load()

    edge = 0
    n = 0
    for y in range(0, h - 1, 2):
        for x in range(0, w - 1, 2):
            v = px[x, y]
            edge += abs(v - px[x + 1, y]) + abs(v - px[x, y + 1])
            n += 2
    edge = (edge / n) if n else 0          # 0..255, thuc te 2..40

    hist = g.histogram()
    top = sum(sorted(hist)[-16:])
    flat = top / max(1, sum(hist))          # 0..1

    e = min(1.0, edge / 24.0)
    return round(100 * e * flat)


def label_font(size):
    for name in ('arial.ttf', 'segoeui.ttf', 'DejaVuSans.ttf'):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def main():
    src = os.path.join(ROOT, arg('dir', 'import/media'))
    files = []
    for dirpath, _, names in os.walk(src):
        for nm in sorted(names):
            if nm.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp')):
                files.append(os.path.join(dirpath, nm))
    if not files:
        print('Khong thay anh nao trong', src)
        return 1

    print('Dang cham diem %d tam…' % len(files))
    rated = []
    for p in files:
        try:
            with Image.open(p) as im:
                im.load()
                s = score(im)
                rated.append((s, p, im.size, os.path.getsize(p)))
        except Exception as e:                      # tep hong thi noi ra, khong bo im
            print('  HONG  %s: %s' % (os.path.relpath(p, ROOT), e))

    rated.sort(key=lambda r: -r[0])

    os.makedirs(OUT, exist_ok=True)
    cols = COLS
    rows = math.ceil(len(rated) / cols)
    sheet = Image.new('RGB', (cols * CELL, rows * (CELL + PAD)), (250, 249, 247))
    draw = ImageDraw.Draw(sheet)
    font = label_font(13)

    for i, (s, p, size, nbytes) in enumerate(rated):
        cx = (i % cols) * CELL
        cy = (i // cols) * (CELL + PAD)
        try:
            with Image.open(p) as im:
                im = im.convert('RGB')
                im.thumbnail((CELL - 8, CELL - 8), Image.LANCZOS)
                sheet.paste(im, (cx + (CELL - im.size[0]) // 2, cy + (CELL - im.size[1]) // 2))
        except Exception:
            pass
        name = os.path.basename(p)
        if len(name) > 30:
            name = name[:28] + '…'
        draw.text((cx + 6, cy + CELL + 2), '%d  %s' % (s, name), fill=(40, 40, 40), font=font)
        draw.text((cx + 6, cy + CELL + 15), '%dx%d  %d KB' % (size[0], size[1], nbytes // 1024),
                  fill=(130, 128, 124), font=font)

    dest = os.path.join(OUT, 'lien-anh.png')
    sheet.save(dest)

    print('\n  To lien anh: %s  (%dx%d)' % (os.path.relpath(dest, ROOT), sheet.size[0], sheet.size[1]))
    print('  %d tam, xep theo diem giam dan. Diem chi de XEP THU TU, khong de loc.' % len(rated))
    print('\n  Diem cao nhat:')
    for s, p, size, nbytes in rated[:12]:
        print('    %3d  %s' % (s, os.path.relpath(p, ROOT)))
    print('\n  Diem KHONG phai ket luan. Mo to lien anh va nhin: anh san pham nen trang cung')
    print('  phang va nhieu bien nen se lan vao doan dau.')

    json.dump([{'file': os.path.relpath(p, ROOT).replace('\\', '/'), 'score': s,
                'w': size[0], 'h': size[1], 'kb': nbytes // 1024}
               for s, p, size, nbytes in rated],
              io.open(os.path.join(OUT, 'lien-anh.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=2)
    return 0


if __name__ == '__main__':
    sys.exit(main())
