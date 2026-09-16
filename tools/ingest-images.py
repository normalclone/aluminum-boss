# Dua mot lo anh cua khach vao site: chuyen ma, chep sang ca hai cay, va tro du lieu vao no.
#
# Khach gui anh qua Drive hoac Zalo, theo lo, va moi lan deu la cung ba viec:
#
#   1. Chuyen sang JPEG - may chu KHONG thu nho anh, no tra dung tep nhan duoc. Mot tam PNG 1,5 MB
#      la 1,5 MB tren lung moi nguoi vao trang. Cung thong so ma build/hero-image.py da dung cho
#      tam hero dau tien: quality=82, optimize, progressive.
#   2. Chep vao ca wwwroot/_media/ VA site/_media/ - trees.py doi hai cay giong nhau tung byte.
#   3. Ghi ten tep vao dung o trong _data/*.json, o ca hai cay.
#
# Lam tay ba viec nay cho sau tam anh la sau lan co the quen mot buoc. Buoc hay quen nhat la (2):
# site/ la ban tinh GitHub Pages phuc vu, va quen chep sang do thi ban dang chay van hien o trong.
#
#   python tools/ingest-images.py tools/manifests/<ten>.json [--dry]
#
# Manifest la mot danh sach, moi dong mot tam anh:
#
#   [ { "src":   "duong/dan/toi/anh-goc.png",   # tuyet doi, hoac tuong doi voi chinh manifest
#       "doc":   "products",                    # _data/products.json
#       "array": "categories",                  # mang trong do
#       "id":    "profile",                     # tim muc theo id, KHONG theo so thu tu -
#       "field": "image",                       #   thu tu doi khi khach keo mot dong len tren
#       "as":    "hero-profile.jpg",            # ten tep trong _media/
#       "from":  "Drive AluminumBoss / 1x - Banner Header ..." } ]   # ghi chu nguon, tuy chon
#
# Truong "from" khong lam gi ca, va do la ly do no o day: sau tam anh nam trong _media/ ma khong
# ai con nho lay tu dau la sau tam khong ai dam thay.
import io
import json
import os
import sys

from PIL import Image

# Canh dai toi da. May chu khong thu nho anh nen day la tran that su, khong phai goi y; con so
# nay cung la con so tai lieu ban giao noi voi khach va la con so trinh soan in ra duoi moi o anh.
CAP = 2000

# Cung thong so build/hero-image.py da dung. Hai bo thong so khac nhau cho cung mot loai anh thi
# tam nay net hon tam kia va khong ai biet vi sao.
JPEG = dict(quality=82, optimize=True, progressive=True)

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
TREES = [os.path.join(ROOT, 'wwwroot'), os.path.join(ROOT, 'site')]


def fit(src, dst, dry=False):
    """Mo anh, ep xuong RGB, thu nho neu qua CAP, ghi JPEG. Tra ve (co cu, co moi, KB moi)."""
    im = Image.open(src)
    was = im.size

    # JPEG khong co kenh alpha. Dat len nen trang chu khong bo kenh di: bo di thi phan trong
    # suot ra mau den, va khong ai thay cho den khi anh len trang.
    if im.mode in ('RGBA', 'LA', 'P'):
        im = im.convert('RGBA')
        flat = Image.new('RGB', im.size, (255, 255, 255))
        flat.paste(im, mask=im.split()[-1])
        im = flat
    else:
        im = im.convert('RGB')

    if max(im.size) > CAP:
        scale = CAP / float(max(im.size))
        im = im.resize((round(im.size[0] * scale), round(im.size[1] * scale)), Image.LANCZOS)

    if dry:
        buf = io.BytesIO()
        im.save(buf, 'JPEG', **JPEG)
        return was, im.size, len(buf.getvalue()) / 1024.0

    im.save(dst, 'JPEG', **JPEG)
    return was, im.size, os.path.getsize(dst) / 1024.0


def point(tree, doc, array, item_id, field, value, dry=False):
    """Ghi ten tep vao dung muc. Tra ve gia tri cu, hoac nem neu khong tim thay muc."""
    path = os.path.join(tree, '_data', doc + '.json')
    data = json.load(io.open(path, encoding='utf-8'))

    items = data.get(array)
    if not isinstance(items, list):
        raise KeyError('%s.json khong co mang "%s"' % (doc, array))

    for it in items:
        if isinstance(it, dict) and it.get('id') == item_id:
            before = it.get(field)
            if not dry:
                it[field] = value
                text = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
                io.open(path, 'w', encoding='utf-8', newline='\n').write(text)
            return before

    raise KeyError('%s.json: %s khong co muc nao mang id "%s"' % (doc, array, item_id))


def main(argv):
    dry = '--dry' in argv
    args = [a for a in argv if not a.startswith('--')]
    if not args:
        print(__doc__ or 'python tools/ingest-images.py <manifest.json> [--dry]')
        return 2

    manifest_path = os.path.abspath(args[0])
    rows = json.load(io.open(manifest_path, encoding='utf-8'))
    base = os.path.dirname(manifest_path)

    out = []
    bad = 0
    for row in rows:
        src = row['src'] if os.path.isabs(row['src']) else os.path.join(base, row['src'])
        name = row['as']

        if not os.path.isfile(src):
            out.append([name, 'KHONG DAT', 'khong co tep nguon: ' + src])
            bad += 1
            continue

        try:
            first = None
            for tree in TREES:
                media = os.path.join(tree, '_media')
                if not dry:
                    os.makedirs(media, exist_ok=True)
                was, now, kb = fit(src, os.path.join(media, name), dry)
                first = first or (was, now, kb)
            was, now, kb = first

            before = None
            for tree in TREES:
                before = point(tree, row['doc'], row['array'], row['id'], row['field'], name, dry)
        except Exception as e:                       # noqa: BLE001 - bao ra, dung dung ca lo
            out.append([name, 'KHONG DAT', str(e)])
            bad += 1
            continue

        src_kb = os.path.getsize(src) / 1024.0
        out.append([name,
                    'dat',
                    '%dx%d -> %dx%d | %.0f KB -> %.0f KB | %s.%s[%s].%s%s'
                    % (was[0], was[1], now[0], now[1], src_kb, kb,
                       row['doc'], row['array'], row['id'], row['field'],
                       '' if before is None else ' (thay "%s")' % before)])

    width = [max(len(str(r[i])) for r in out + [['tep', 'ket qua', 'chi tiet']])
             for i in range(3)]
    title = 'Dua anh vao site%s' % (' (THU, khong ghi gi)' if dry else '')
    print('\n  ' + title)
    print('  ' + '=' * len(title))
    head = ['tep', 'ket qua', 'chi tiet']
    print('  ' + '  '.join(h.ljust(width[i]) for i, h in enumerate(head)))
    print('  ' + '  '.join('-' * w for w in width))
    for r in out:
        print('  ' + '  '.join(str(c).ljust(width[i]) for i, c in enumerate(r)).rstrip())

    print('\n  %d tam, ca hai cay. Buoc tiep theo: python tools/trees.py' % (len(out) - bad))
    print('\n  ' + ('DAT - ' if bad == 0 else 'KHONG DAT - ')
          + ('moi tam deu vao dung cho' if bad == 0 else '%d tam khong vao duoc' % bad))
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
