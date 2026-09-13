# Trai khuon trang chi tiet ra thanh mot thu muc cho moi muc trong ban tinh site/.
#
# Tu Task 10 mot bai viet o /news/press-line-2500/. May chu tu ghep duong dan ay tu khuon
# /news/detail/, nhung GitHub Pages khong ghep gi ca - no chi tra file co san. Khong co
# site/news/press-line-2500/index.html thi moi lien ket trong ban tinh deu 404.
#
# Ban sao la BAN SAO TUNG BYTE cua khuon, khong phai dau ra da ghep:
#
#   - Khuon dung trang bang JS, va AB.itemId() doc doan cuoi duong dan, nen mot file giong het
#     nhau dung ra 94 trang khac nhau. Ghi dau ra da ghep vao day thi dong cung bai dau tien.
#   - trees.py so HTML hai cay: ban sao van la khuon nen phep so do con dung.
#   - Git luu mot blob cho ca 94 file giong nhau.
#
#   python fanout.py            trai ra (va don thu muc cua muc da xoa)
#   python fanout.py --check    chi bao co lech khong, thoat 1 neu lech
import io
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from slugs import SECTIONS, load  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SITE = os.path.join(ROOT, 'site')


def wanted():
    """{duong-dan-tuong-doi: file khuon} cho moi muc co trang rieng."""
    out = {}
    for seg, doc, pick in SECTIONS:
        template = os.path.join(SITE, seg, 'detail', 'index.html')
        if not os.path.exists(template):
            continue
        for item in pick(load(doc)):
            slug = item.get('slug') or item['id']
            out['%s/%s/index.html' % (seg, slug)] = template
    return out


def existing(segments):
    """Nhung thu muc da trai ra truoc day, de biet muc nao vua bi xoa khoi JSON."""
    out = []
    for seg in segments:
        base = os.path.join(SITE, seg)
        if not os.path.isdir(base):
            continue
        for name in sorted(os.listdir(base)):
            d = os.path.join(base, name)
            if name == 'detail' or not os.path.isdir(d):
                continue
            f = os.path.join(d, 'index.html')
            if os.path.exists(f):
                out.append('%s/%s/index.html' % (seg, name))
    return out


def main(check):
    want = wanted()
    have = existing([s[0] for s in SECTIONS])

    stale = [rel for rel in have if rel not in want]
    missing, differing, written = [], [], 0

    for rel, template in sorted(want.items()):
        target = os.path.join(SITE, rel.replace('/', os.sep))
        src = io.open(template, 'rb').read()
        if not os.path.exists(target):
            missing.append(rel)
        elif io.open(target, 'rb').read() != src:
            differing.append(rel)
        else:
            continue
        if not check:
            os.makedirs(os.path.dirname(target), exist_ok=True)
            io.open(target, 'wb').write(src)
            written += 1

    print('  Trai khuon chi tiet ra site/')
    print('  ============================')
    for seg, doc, pick in SECTIONS:
        n = sum(1 for rel in want if rel.startswith(seg + '/'))
        print('  %-10s %3d trang' % (seg, n))
    print('\n  %d trang muc rieng trong ban tinh.' % len(want))

    if not missing and not differing and not stale:
        print('\n  DAT - ban tinh co du mot thu muc cho moi muc.')
        return 0

    for rel in missing:
        print('  thieu : %s' % rel)
    for rel in differing:
        print('  lech  : %s' % rel)
    for rel in stale:
        print('  thua  : %s' % rel)

    if check:
        print('\n  KHONG DAT - %d cho lech. Chay lai khong co --check de sua.'
              % (len(missing) + len(differing) + len(stale)))
        return 1

    for rel in stale:
        shutil.rmtree(os.path.dirname(os.path.join(SITE, rel.replace('/', os.sep))))
    print('\n  Da ghi %d trang, xoa %d thu muc thua.' % (written, len(stale)))
    return 0


if __name__ == '__main__':
    sys.exit(main('--check' in sys.argv))
