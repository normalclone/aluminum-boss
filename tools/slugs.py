# Liet ke va kiem moi duong dan rieng cua tung muc.
#
# Tu Task 10, mot bai viet khong con song o /news/detail/?id=press-line-2500 ma o
# /news/press-line-2500/. Duong dan ay sinh tu `slug`, va khi khong co `slug` thi sinh tu `id` -
# nen `id` tro thanh mot phan cua URL cong khai. Hai dieu phai dung, va khong co gi trong JSON ep
# chung phai dung:
#
#   1. Moi id phai viet duoc thanh mot doan duong dan: chi chu thuong, so va dau noi.
#   2. Trong cung mot muc, hai mon khong duoc trung id. Rieng Documents gop cac danh muc lai
#      thanh mot danh sach phang, nen hai tai lieu o hai danh muc khac nhau van co the trung -
#      va khi trung thi mot trong hai bi mat URL.
#
#   python slugs.py            in bang, thoat 1 neu co cho sai
#   python slugs.py --urls     chi in danh sach URL, moi dong mot cai (cho cong cu khac dung)
import io
import json
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
DATA = os.path.join(ROOT, 'wwwroot', '_data')

OK = re.compile(r'^[a-z0-9]+(-[a-z0-9]+)*$')

# muc URL -> (file JSON, cach lay danh sach mon co trang rieng)
SECTIONS = [
    ('news', 'news', lambda d: d['items']),
    ('products', 'products', lambda d: d['categories']),
    ('projects', 'projects', lambda d: d['albums']),
    ('colors', 'colors', lambda d: d['items']),
    ('documents', 'documents', lambda d: [i for c in d['categories'] for i in c['items']]),
    ('about-us', 'about', lambda d: d['chapters']),
    ('contact', 'contact', lambda d: d['routes']),
]


def load(name):
    return json.load(io.open(os.path.join(DATA, name + '.json'), encoding='utf-8'))


def slugs():
    """[(muc, slug)] theo dung thu tu may chu doc."""
    out = []
    for seg, doc, pick in SECTIONS:
        for item in pick(load(doc)):
            out.append((seg, item.get('slug') or item['id']))
    return out


def main(argv):
    if '--urls' in argv:
        for seg, s in slugs():
            print('/%s/%s/' % (seg, s))
        return 0

    rows = []
    bad = 0
    for seg, doc, pick in SECTIONS:
        items = pick(load(doc))
        seen = {}
        wrong = []
        dup = []
        for item in items:
            s = item.get('slug') or item['id']
            if not OK.match(s):
                wrong.append(s)
            if s in seen:
                dup.append(s)
            seen[s] = 1
        note = 'dat'
        if wrong or dup:
            bad += 1
            note = ' '.join(['sai dang: ' + ', '.join(wrong)] if wrong else []
                            + (['trung: ' + ', '.join(dup)] if dup else []))
        rows.append((seg, len(items), note))

    print('  Duong dan rieng cua tung muc')
    print('  ============================')
    for seg, n, note in rows:
        print('  %-10s %3d muc   %s' % (seg, n, note))
    total = sum(r[1] for r in rows)
    print('\n  %d muc, %d muc co trang rieng.' % (len(rows), total))
    if bad:
        print('\n  KHONG DAT - %d muc co id khong dung duoc lam duong dan.' % bad)
        return 1
    print('\n  DAT - moi id viet duoc thanh doan duong dan, khong cho nao trung.')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
