# Kiem hai cay site/ va wwwroot/ khong lech nhau.
#
# wwwroot/ la thu may chu doc; site/ la ban tinh GitHub Pages phuc vu. Hai ben phai noi cung mot
# thu, nhung khong co gi ep chung phai the - va mot lan quen dong bo da len thang ban dang chay:
# them familySpecs vao wwwroot/_data/colors.json, khong chep sang site/, nen trang chi tiet mau
# tren Pages hien "—" o ba dong thong so. Khong phep do nao bat duoc, vi moi phep do deu chi cham
# vao may chu.
#
#   python trees.py [goc-du-an]
#
# File du lieu va script phai giong nhau TUNG BYTE. File HTML thi so sau khi giai ma thuc the va
# gop khoang trang, vi ban tinh viet "Böss" con khuon viet "B&ouml;ss" - cung mot chu.
import html
import os
import re
import sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..')
A = os.path.join(ROOT, 'wwwroot')
B = os.path.join(ROOT, 'site')

# Chi co trong wwwroot: khu quan tri khong bao gio duoc phuc vu tinh.
IGNORE_DIRS = {'admin'}

EXACT = ('.json', '.js', '.css', '.pdf', '.woff', '.woff2', '.svg', '.png', '.jpg', '.webp')


def walk(base):
    out = {}
    for dirpath, dirnames, names in os.walk(base):
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
        for n in names:
            full = os.path.join(dirpath, n)
            out[os.path.relpath(full, base).replace('\\', '/')] = full
    return out


def norm_html(path):
    s = open(path, encoding='utf-8').read()
    s = html.unescape(s)
    s = re.sub(r'\s+', ' ', s)
    # Khoang trang canh the cung bo di: khuon xuong dong sau <br> cho de doc, con bo ghep noi
    # cac dong bang <br> khong xuong dong. Cung mot trang, khac moi cach trinh bay.
    s = re.sub(r'>\s+', '>', s)
    s = re.sub(r'\s+<', '<', s)
    return s.strip()


def main():
    a, b = walk(A), walk(B)
    problems = []

    for rel in sorted(set(a) - set(b)):
        problems.append(('chi co trong wwwroot', rel))
    for rel in sorted(set(b) - set(a)):
        problems.append(('chi co trong site', rel))

    for rel in sorted(set(a) & set(b)):
        if rel.lower().endswith('.html'):
            if norm_html(a[rel]) != norm_html(b[rel]):
                problems.append(('HTML khac nhau', rel))
        elif rel.lower().endswith(EXACT):
            if open(a[rel], 'rb').read() != open(b[rel], 'rb').read():
                problems.append(('khac tung byte', rel))

    print('  Doi chieu wwwroot/ va site/')
    print('  ==========================')
    print('  %d file ben wwwroot, %d ben site' % (len(a), len(b)))
    if not problems:
        print('\n  DAT - hai cay noi cung mot thu.')
        return 0

    print()
    for kind, rel in problems:
        print('  %-22s %s' % (kind, rel))
    print('\n  KHONG DAT - %d cho lech.' % len(problems))
    return 1


if __name__ == '__main__':
    sys.exit(main())
