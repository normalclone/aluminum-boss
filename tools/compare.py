# Quantifies how far apart two sets of screenshots are.
#
# Byte comparison answers "identical or not", which is the wrong question: anti-aliasing and JPEG
# decoding put a few units of noise on a handful of pixels even between two loads of the same
# page. The number that decides whether a refactor changed anything visible is how many pixels
# differ by MORE THAN 32 of 255 - that threshold has been zero across every change on this site,
# while the raw "differs at all" count never has been.
#
#   python compare.py <dir-A> <dir-B>
#
# Needs Pillow and numpy.
import glob
import os
import sys

try:
    from PIL import Image
    import numpy as np
except ImportError:
    sys.exit('Can Pillow va numpy: pip install pillow numpy')


def main(dir_a, dir_b):
    names = sorted(os.path.basename(p) for p in glob.glob(os.path.join(dir_a, '*.png')))
    if not names:
        sys.exit('Khong co anh nao trong ' + dir_a)

    print('  %-44s %-6s %-9s %s' % ('trang', 'max', '>8', '>32'))
    print('  ' + '-' * 70)

    identical = worst = checked = 0
    for name in names:
        pa, pb = os.path.join(dir_a, name), os.path.join(dir_b, name)
        if not os.path.exists(pb):
            print('  %-44s thieu o ben B' % name[:44])
            worst = 10 ** 9
            continue

        a = Image.open(pa).convert('RGB')
        b = Image.open(pb).convert('RGB')
        checked += 1
        if a.size != b.size:
            print('  %-44s KICH THUOC %s vs %s' % (name[:44], a.size, b.size))
            worst = 10 ** 9
            continue

        d = np.abs(np.asarray(a, np.int16) - np.asarray(b, np.int16)).max(axis=2)
        over8, over32 = int((d > 8).sum()), int((d > 32).sum())
        if d.max() == 0:
            identical += 1
        else:
            print('  %-44s %-6d %-9d %d' % (name[:44], d.max(), over8, over32))
        worst = max(worst, over32)

    print()
    print('  %d/%d trang giong het tung pixel' % (identical, checked))
    print('  Pixel lech qua 32/255: %d' % worst)
    print()
    if worst == 0:
        print('  DAT - khong co khac biet nao nhin thay duoc.')
        return 0
    print('  KHONG DAT - co khac biet that, khong phai nhieu khu rang cua.')
    return 1


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit('Dung: python compare.py <thu-muc-A> <thu-muc-B>')
    sys.exit(main(sys.argv[1], sys.argv[2]))
