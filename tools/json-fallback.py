# Giu ban du phong trong the <script data-ab-json> khop voi file JSON.
#
# Hai khoi canvas doc du lieu tu mot the JSON nhung trong trang. Bo ghep dat noi dung that vao do,
# con ban nam san trong khuon la duong lui cho thu muc site/ phuc vu tinh - va duong lui do khong
# co gi ep no phai dung. Sua globe.json ma quen sua ban du phong thi may chu van dung, GitHub
# Pages van ve quy dia cau bang du lieu cu, va khong ai thay.
#
#   python json-fallback.py            ghi lai ban du phong tu file JSON
#   python json-fallback.py --check    chi bao co lech khong, thoat 1 neu lech
import io
import json
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
TAG = re.compile(r'(<script[^>]*\bdata-ab-json="([^"]+)"[^>]*>)(.*?)(</script>)', re.S)


def wanted(name):
    p = os.path.join(ROOT, 'wwwroot', '_data', name + '.json')
    doc = json.load(io.open(p, encoding='utf-8'))
    # Cung cach bo ghep viet: JSON nen chat, moi dau "<" thoat thanh < vi chuoi "</script"
    # ket thuc the script bat ke nam trong dau nhay nao.
    return json.dumps(doc, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')


def main(check):
    stale = []
    for tree in ('wwwroot', 'site'):
        p = os.path.join(ROOT, tree, 'index.html')
        s = io.open(p, encoding='utf-8').read()

        def fix(m):
            want = wanted(m.group(2))
            if m.group(3) != want:
                stale.append('%s/index.html · %s' % (tree, m.group(2)))
            return m.group(1) + want + m.group(4)

        out = TAG.sub(fix, s)
        if not check and out != s:
            io.open(p, 'w', encoding='utf-8', newline='').write(out)

    print('  Ban du phong trong the data-ab-json')
    print('  ==================================')
    if not stale:
        print('\n  DAT - moi ban du phong khop file JSON.')
        return 0
    for x in stale:
        print('  lech: %s' % x)
    if check:
        print('\n  KHONG DAT - %d cho lech. Chay lai khong co --check de sua.' % len(stale))
        return 1
    print('\n  Da ghi lai %d cho.' % len(stale))
    return 0


if __name__ == '__main__':
    sys.exit(main('--check' in sys.argv))
