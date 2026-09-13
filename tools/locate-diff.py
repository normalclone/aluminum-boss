# Khoanh vung khac biet giua hai anh va cat ra de nhin.
#
# compare.py tra loi "lech bao nhieu"; cai nay tra loi "lech o dau". Mot con so pixel giong het
# nhau o hai be ngang khac nhau nghia la vung lech co kich thuoc co dinh - thuong la mot phan tu
# giao dien chu khong phai noi dung chay theo bo cuc.
#
#   python locate-diff.py <anh-A> <anh-B> [thu-muc-ra]
import os
import sys

try:
    from PIL import Image
    import numpy as np
except ImportError:
    sys.exit('Can Pillow va numpy: pip install pillow numpy')


def main(pa, pb, out_dir):
    a = Image.open(pa).convert('RGB')
    b = Image.open(pb).convert('RGB')
    if a.size != b.size:
        print('  Kich thuoc khac nhau: %s vs %s' % (a.size, b.size))
        return 1

    d = np.abs(np.asarray(a, np.int16) - np.asarray(b, np.int16)).max(axis=2)
    ys, xs = np.where(d > 32)
    if len(ys) == 0:
        print('  Khong co pixel nao lech qua 32.')
        return 0

    top, bottom = int(ys.min()), int(ys.max())
    left, right = int(xs.min()), int(xs.max())
    print('  %d pixel lech qua 32' % len(ys))
    print('  Vung: x %d..%d  y %d..%d  (%dx%d)' % (left, right, top, bottom,
                                                   right - left + 1, bottom - top + 1))
    print('  Anh cao %d, vung lech bat dau o %.1f%% chieu cao' % (a.size[1], 100.0 * top / a.size[1]))

    # Cat rong ra mot chut de thay ngu canh.
    pad = 60
    box = (max(0, left - pad), max(0, top - pad),
           min(a.size[0], right + pad), min(a.size[1], bottom + pad))
    os.makedirs(out_dir, exist_ok=True)
    a.crop(box).save(os.path.join(out_dir, 'A.png'))
    b.crop(box).save(os.path.join(out_dir, 'B.png'))
    print('  Da cat ra %s/A.png va %s/B.png' % (out_dir, out_dir))
    return 0


if __name__ == '__main__':
    if len(sys.argv) < 3:
        sys.exit('Dung: python locate-diff.py <anh-A> <anh-B> [thu-muc-ra]')
    sys.exit(main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else 'diff'))
