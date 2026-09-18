# Sinh PDF THAT - nhieu trang, co bang - tu cac tep JSON trong build/docs/.
#
#   python build/make-real-pdfs.py           # sinh, va in so trang do duoc
#   python build/make-real-pdfs.py --dry     # khong ghi gi
#
# Khac voi build/make-pdfs.py: tep kia sinh MOT trang bia ghi ro "day la ban mau" cho moi muc
# trong documents.json. Tep nay sinh tai lieu co noi dung that, tu nguon co that, cho nhung muc
# minh thuc su viet ra.
#
# ---------------------------------------------------------------------------------------------
# HAI TEP KHONG DUOC DAM VAO NHAU
#
# make-pdfs.py ghi de MOI muc trong documents.json. Neu no chay sau tep nay thi mot tai lieu 5
# trang co noi dung that bien thanh mot trang bia "ban mau", khong loi, khong ai thay - cung
# dung loai loi ma ban ghi de bossdoor da xoa mat hero-door-accessory.jpg.
#
# Nen: make-pdfs.py gio BO QUA moi id co build/docs/<id>.json, va in ra da bo qua nhung gi.
#
# ---------------------------------------------------------------------------------------------
# CHU
#
# PDF base-14 Helvetica voi /Encoding /WinAnsiEncoding phu duoc cp1252: dau gach dai, nhay cong,
# (R), (c), do C, m2 (chu so 2 tren cao). KHONG phu duoc cac ky hieu toan: <= va Phi. Nen ban
# tieng Anh viet thang "up to" va "dia." - doc ra tieng Anh cung tu nhien hon, va khong co tam
# ky tu nao am tham thanh dau hoi.
import io
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))
DOCS = os.path.join(HERE, 'docs')
TREES = [os.path.join(ROOT, 'site'), os.path.join(ROOT, 'wwwroot')]

W, H = 595, 842                 # A4 tai 72 dpi
L, R = 56, 539                  # le trai / phai
TOP, BOT = H - 130, 92          # dinh vung chu / day

# Thay ky tu khong co trong cp1252 bang chu. Lam o day chu khong o tep nguon, de tep nguon con
# doc duoc nhu van ban binh thuong.
SUBS = {'≤': 'up to ', '≥': 'min ', 'Φ': 'dia. ', 'φ': 'dia. ',
        '×': 'x', '–': '-', '—': '-', '…': '...'}


def flat(s):
    for k, v in SUBS.items():
        s = s.replace(k, v)
    return s


def esc(s):
    return flat(s).replace('\\', r'\\').replace('(', r'\(').replace(')', r'\)')


def wrap(text, per):
    words, lines, line = flat(text).split(), [], ''
    for w in words:
        if len((line + ' ' + w).strip()) > per:
            lines.append(line.strip())
            line = w
        else:
            line += ' ' + w
    if line.strip():
        lines.append(line.strip())
    return lines or ['']


class Pages(object):
    """Gom lenh ve, tu sang trang khi het cho.

    Moi lenh ve deu di qua `room()` truoc. Do la ca co che phan trang: khong co buoc "tinh
    truoc xem vua may trang", nen khong co cho nao de phep tinh do lech voi cai ve ra.
    """

    def __init__(self):
        self.pages = [[]]
        self.y = TOP

    def room(self, need):
        if self.y - need < BOT:
            self.pages.append([])
            self.y = TOP
            return True
        return False

    def add(self, s):
        self.pages[-1].append(s)

    def text(self, x, size, s, font='F1', grey=False):
        self.add('%s rg BT /%s %d Tf %d %d Td (%s) Tj ET'
                 % ('0.44 0.42 0.38' if grey else '0.11 0.11 0.10', font, size, x, self.y, esc(s)))

    def rule(self, pad=0):
        self.add('0.85 0.84 0.82 RG 0.6 w %d %d m %d %d l S' % (L, self.y - pad, R, self.y - pad))


def heading(pg, s):
    pg.room(58)
    pg.y -= 22
    pg.text(L, 15, s, 'F2')
    pg.y -= 12


def para(pg, s):
    for ln in wrap(s, 92):
        pg.room(15)
        pg.text(L, 10, ln, 'F1', grey=True)
        pg.y -= 14
    pg.y -= 6


def bullets(pg, items):
    for it in items:
        for i, ln in enumerate(wrap(it, 86)):
            pg.room(15)
            if i == 0:
                pg.text(L, 10, '-', 'F1', grey=True)
            pg.text(L + 14, 10, ln, 'F1', grey=True)
            pg.y -= 14
    pg.y -= 6


def table(pg, head, rows):
    n = len(head)
    # Cot deu nhau tru cot dau, cot dau rong hon vi no mang ten dong san pham.
    first = 150 if n <= 3 else 118
    rest = (R - L - first) // max(1, n - 1)
    xs = [L] + [L + first + i * rest for i in range(n - 1)]
    per = [int(first / 5.0)] + [int(rest / 5.0)] * (n - 1)

    def row(cells, bold=False, grey=False):
        lines = [wrap(c, per[i]) for i, c in enumerate(cells)]
        tall = max(len(x) for x in lines)
        if pg.room(tall * 13 + 8):
            hdr(pg, head)                      # sang trang thi lap lai dong tieu de
        y0 = pg.y
        for i, col in enumerate(lines):
            pg.y = y0
            for ln in col:
                pg.text(xs[i], 9, ln, 'F2' if bold else 'F1', grey=grey and not bold)
                pg.y -= 12
        pg.y = y0 - tall * 12 - 4

    def hdr(p, h):
        row(h, bold=True)
        p.rule(pad=2)
        p.y -= 8

    hdr(pg, head)
    for r in rows:
        row(r, grey=True)
    pg.y -= 10


def cover(pg, doc):
    # Wordmark phai khop voi header cua site: AluminumBöss, co dau. WinAnsiEncoding co o umlaut.
    pg.add('0.11 0.11 0.10 rg BT /F2 20 Tf %d %d Td (%s) Tj ET'
           % (L, H - 78, esc('AluminumBöss')))
    pg.add('0.85 0.84 0.82 RG 1 w %d %d m %d %d l S' % (L, H - 96, R, H - 96))
    pg.y = H - 140
    pg.text(L, 10, doc['section'].upper(), 'F1', grey=True)
    pg.y -= 50
    for ln in wrap(doc['title'], 30)[:3]:
        pg.text(L, 26, ln, 'F2')
        pg.y -= 34
    pg.y -= 18
    for ln in wrap(doc['blurb'], 74)[:5]:
        pg.text(L, 11, ln, 'F1', grey=True)
        pg.y -= 17
    pg.y -= 26
    pg.rule()
    pg.y -= 26
    for k, v in [('Reference', doc['id'].upper()), ('Edition', doc['edition']),
                 ('Language', doc['lang'])]:
        pg.text(L, 9, k.upper(), 'F1', grey=True)
        pg.add('0.11 0.11 0.10 rg BT /F1 12 Tf 170 %d Td (%s) Tj ET' % (pg.y, esc(v)))
        pg.y -= 24
    pg.y -= 20


def build(doc):
    pg = Pages()
    cover(pg, doc)
    for b in doc['blocks']:
        t = b['type']
        if t == 'heading':
            heading(pg, b['text'])
        elif t == 'para':
            para(pg, b['text'])
        elif t == 'list':
            bullets(pg, b['items'])
        elif t == 'table':
            table(pg, b['head'], b['rows'])
        else:
            raise ValueError('khong biet khoi kieu "%s"' % t)
    return pg.pages


def write_pdf(pages, path, dry=False):
    """Mot doi tuong Page + mot doi tuong stream cho moi trang, xref tinh lai theo offset that."""
    n = len(pages)
    streams = []
    for i, cmds in enumerate(pages):
        body = '\n'.join(cmds)
        # So trang o chan moi trang.
        body += ('\n0.44 0.42 0.38 rg BT /F1 8 Tf %d %d Td (%d / %d) Tj ET'
                 % (R - 30, 52, i + 1, n))
        streams.append(body.encode('cp1252', 'replace'))

    objs = [b'<</Type/Catalog/Pages 2 0 R>>', None,
            b'<</Type/Font/Subtype/Type1/BaseFont/Helvetica/Encoding/WinAnsiEncoding>>',
            b'<</Type/Font/Subtype/Type1/BaseFont/Helvetica-Bold/Encoding/WinAnsiEncoding>>']
    first = len(objs) + 1                       # so hieu doi tuong Page dau tien
    kids = ' '.join('%d 0 R' % (first + i * 2) for i in range(n))
    objs[1] = ('<</Type/Pages/Kids[%s]/Count %d>>' % (kids, n)).encode()
    for i, st in enumerate(streams):
        objs.append(('<</Type/Page/Parent 2 0 R/MediaBox[0 0 %d %d]'
                     '/Resources<</Font<</F1 3 0 R/F2 4 0 R>>>>/Contents %d 0 R>>'
                     % (W, H, first + i * 2 + 1)).encode())
        objs.append(b'<</Length %d>>stream\n' % len(st) + st + b'\nendstream')

    buf = io.BytesIO()
    buf.write(b'%PDF-1.4\n%\xe2\xe3\xcf\xd3\n')
    off = []
    for i, o in enumerate(objs):
        off.append(buf.tell())
        buf.write(b'%d 0 obj\n' % (i + 1) + o + b'\nendobj\n')
    start = buf.tell()
    buf.write(b'xref\n0 %d\n0000000000 65535 f \n' % (len(objs) + 1))
    for o in off:
        buf.write(b'%010d 00000 n \n' % o)
    buf.write(b'trailer\n<</Size %d/Root 1 0 R>>\nstartxref\n%d\n%%%%EOF\n'
              % (len(objs) + 1, start))
    if not dry:
        with open(path, 'wb') as f:
            f.write(buf.getvalue())
    return len(buf.getvalue())


def point_pages(doc_id, pages, dry=False):
    """Ghi so trang THAT vao documents.json. Trang tai lieu in con so nay ra cho nguoi doc."""
    hits = 0
    for tree in TREES:
        path = os.path.join(tree, '_data', 'documents.json')
        if not os.path.isfile(path):
            continue
        data = json.load(io.open(path, encoding='utf-8'))
        for cat in data['categories']:
            for it in cat['items']:
                if it['id'] == doc_id:
                    it['pages'] = pages
                    hits += 1
        if not dry:
            io.open(path, 'w', encoding='utf-8', newline='\n').write(
                json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    return hits


def main(argv):
    dry = '--dry' in argv
    if not os.path.isdir(DOCS):
        print('Khong co %s' % DOCS)
        return 1
    rows = []
    for name in sorted(os.listdir(DOCS)):
        if not name.endswith('.json'):
            continue
        doc = json.load(io.open(os.path.join(DOCS, name), encoding='utf-8'))
        pages = build(doc)
        size = 0
        for tree in TREES:
            out = os.path.join(tree, '_docs')
            if not os.path.isdir(out):
                continue
            if not dry:
                os.makedirs(out, exist_ok=True)
            size = write_pdf(pages, os.path.join(out, doc['id'] + '.pdf'), dry)
        hits = point_pages(doc['id'], len(pages), dry)
        rows.append((doc['id'], len(pages), size // 1024,
                     'da tro %d cay' % hits if hits else 'CHUA CO MUC trong documents.json'))

    w = [max(len(str(r[i])) for r in rows + [('tep', 'trang', 'KB', 'documents.json')])
         for i in range(4)]
    title = 'PDF that%s' % (' (THU, khong ghi gi)' if dry else '')
    print('\n  ' + title)
    print('  ' + '=' * len(title))
    print('  ' + '  '.join(h.ljust(w[i]) for i, h in enumerate(('tep', 'trang', 'KB', 'documents.json'))))
    print('  ' + '  '.join('-' * x for x in w))
    for r in rows:
        print('  ' + '  '.join(str(c).ljust(w[i]) for i, c in enumerate(r)).rstrip())
    bad = [r for r in rows if r[3].startswith('CHUA')]
    print('\n  ' + ('DAT - %d tai lieu' % len(rows) if not bad
                    else 'KHONG DAT - %d muc chua co trong documents.json' % len(bad)))
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
