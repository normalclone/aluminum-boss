# Hai tieu de canvas va the tally: bien chung thanh tham so.
#
# Spec goc neu dich danh: "four markets", "Five factories" va con so 5 trong the tally la nhung
# cho "so dem viet cung se noi doi" khi khach sua du lieu. Chung la ba cho cuoi cung tren site
# con nam trong HTML chu khong nam trong _data:
#
#   <h2 id="vgx-title">One origin, <em>four markets</em>.</h2>
#   <h1 id="vfx-title">Five factories, <em>one coastline</em>.</h1>
#   <b id="vfx-tally">5</b>
#
# Hai tieu de thanh cap lead/tail dung y nhu wordmark - chu nghieng khong the gop vao mot dia chi
# vi data-ab-t ghi textContent, ma ghi textContent la <em> bien mat. Con so thanh data-ab-count,
# suy ra tu so muc DANG HIEN, vi khong ai go mot con so dem vao o nhap ma no dung mai duoc.
#
# Dau cham cuoi cau nam ngoai ca hai dia chi: dua no vao <em> la in nghieng mot dau cham, va do
# la mot thay doi hinh anh that.
#
#   python canvas-titles.py           sua ca hai cay
#   python canvas-titles.py --check   chi bao da sua chua, thoat 1 neu chua
import collections
import io
import json
import os
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
TREES = ('wwwroot', 'site')

# (file JSON, lead, tail) — nguyen van nhu dang nam trong HTML, ke ca dau cach cuoi lead.
TITLES = [
    ('globe', 'One origin, ', 'four markets'),
    ('factories', 'Five factories, ', 'one coastline'),
]

EDITS = [
    ('<h2 id="vgx-title">One origin, <em>four markets</em>.</h2>',
     '<h2 id="vgx-title" data-ab-lead="globe.title.lead">One origin, '
     '<em data-ab-t="globe.title.tail">four markets</em>.</h2>'),

    ('<h1 id="vfx-title">Five factories, <em>one coastline</em>.</h1>',
     '<h1 id="vfx-title" data-ab-lead="factories.title.lead">Five factories, '
     '<em data-ab-t="factories.title.tail">one coastline</em>.</h1>'),

    ('<b id="vfx-tally">5</b>',
     '<b id="vfx-tally" data-ab-count="factories.sites">5</b>'),
]


def data(tree, name):
    return os.path.join(ROOT, tree, '_data', name + '.json')


def write_json(path, doc):
    io.open(path, 'w', encoding='utf-8', newline='\n').write(
        json.dumps(doc, ensure_ascii=False, indent=2) + '\n')


def main(check):
    done = 0
    todo = []

    for tree in TREES:
        p = os.path.join(ROOT, tree, 'index.html')
        s = io.open(p, encoding='utf-8').read()
        out = s
        for old, new in EDITS:
            if new in out:
                done += 1
                continue
            if old not in out:
                sys.exit('  khong khop, cung khong thay ban da sua: %s' % old[:50])
            out = out.replace(old, new, 1)
            todo.append('%s/index.html' % tree)
        if not check and out != s:
            io.open(p, 'w', encoding='utf-8', newline='').write(out)

        for name, lead, tail in TITLES:
            path = data(tree, name)
            doc = json.load(io.open(path, encoding='utf-8'),
                            object_pairs_hook=collections.OrderedDict)
            want = collections.OrderedDict([('lead', lead), ('tail', tail)])
            if doc.get('title') == want:
                done += 1
                continue
            todo.append('%s/_data/%s.json' % (tree, name))
            if not check:
                doc['title'] = want            # factories co san mot chuoi khong ai doc; thay luon
                write_json(path, doc)

    print('  Tieu de hai khoi canvas')
    print('  =======================')
    if check:
        for t in sorted(set(todo)):
            print('  chua sua : %s' % t)
        print('  da sua   : %d cho' % done)
        return 1 if todo else 0

    for t in sorted(set(todo)):
        print('  sua      : %s' % t)
    print('  Chay tiep: python tools/json-fallback.py')
    return 0


sys.exit(main('--check' in sys.argv))
