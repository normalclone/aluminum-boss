# Writes a real, valid PDF for every entry in documents.json.
#
# A documents page whose every download returns 404 demonstrates nothing. These are specimens -
# a cover page naming the document and saying plainly that it is a placeholder - but they open
# in a viewer, they print, and the browser reports a real file size, so the page behaves the way
# the finished one will.
#
# Written by hand rather than with a library: the file is a few hundred bytes and adding a
# dependency to the build for that would be worse.
import io, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', 'site'))
OUT = os.path.join(ROOT, '_docs')

W, H = 595, 842            # A4 at 72 dpi


def esc(s):
    return s.replace('\\', r'\\').replace('(', r'\(').replace(')', r'\)')


def wrap(text, per):
    words, lines, line = text.split(), [], ''
    for w in words:
        if len((line + ' ' + w).strip()) > per:
            lines.append(line.strip())
            line = w
        else:
            line += ' ' + w
    if line.strip():
        lines.append(line.strip())
    return lines


def content(doc, section):
    out = []
    add = out.append
    # rule under the wordmark
    add('0.11 0.11 0.10 rg')
    add('BT /F2 20 Tf 56 %d Td (AluminumBoss) Tj ET' % (H - 78))
    add('0.85 0.84 0.82 RG 1 w 56 %d m %d %d l S' % (H - 96, W - 56, H - 96))

    add('0.44 0.42 0.38 rg')
    add('BT /F1 10 Tf 56 %d Td (%s) Tj ET' % (H - 140, esc(section.upper())))

    y = H - 190
    add('0.11 0.11 0.10 rg')
    for ln in wrap(doc['title'], 30)[:3]:
        add('BT /F2 26 Tf 56 %d Td (%s) Tj ET' % (y, esc(ln)))
        y -= 34

    y -= 18
    add('0.44 0.42 0.38 rg')
    for ln in wrap(doc['blurb'], 74)[:5]:
        add('BT /F1 11 Tf 56 %d Td (%s) Tj ET' % (y, esc(ln)))
        y -= 17

    y -= 26
    add('0.85 0.84 0.82 RG 56 %d m %d %d l S' % (y, W - 56, y))
    y -= 26
    for k, v in [('Reference', doc['id'].upper()), ('Edition', doc['edition']),
                 ('Language', doc['lang']), ('Pages', str(doc['pages']))]:
        add('0.44 0.42 0.38 rg BT /F1 9 Tf 56 %d Td (%s) Tj ET' % (y, esc(k.upper())))
        add('0.11 0.11 0.10 rg BT /F1 12 Tf 170 %d Td (%s) Tj ET' % (y, esc(v)))
        y -= 24

    add('0.44 0.42 0.38 rg')
    for i, ln in enumerate(wrap(
            'This file is a specimen used to demonstrate the Documents section. '
            'It is a working PDF - it opens, prints and downloads - but the technical '
            'content of the real document is not included.', 78)[:4]):
        add('BT /F1 9 Tf 56 %d Td (%s) Tj ET' % (96 - i * 13, esc(ln)))
    return '\n'.join(out).encode('latin-1', 'replace')


def build(doc, section, path):
    stream = content(doc, section)
    objs = [
        b'<</Type/Catalog/Pages 2 0 R>>',
        b'<</Type/Pages/Kids[3 0 R]/Count 1>>',
        ('<</Type/Page/Parent 2 0 R/MediaBox[0 0 %d %d]/Resources<</Font<</F1 4 0 R/F2 5 0 R>>>>'
         '/Contents 6 0 R>>' % (W, H)).encode(),
        b'<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>',
        b'<</Type/Font/Subtype/Type1/BaseFont/Helvetica-Bold>>',
        b'<</Length %d>>stream\n' % len(stream) + stream + b'\nendstream',
    ]
    buf = io.BytesIO()
    buf.write(b'%PDF-1.4\n%\xe2\xe3\xcf\xd3\n')
    offsets = []
    for i, body in enumerate(objs, 1):
        offsets.append(buf.tell())
        buf.write(b'%d 0 obj\n' % i + body + b'\nendobj\n')
    xref = buf.tell()
    buf.write(b'xref\n0 %d\n' % (len(objs) + 1))
    buf.write(b'0000000000 65535 f \n')
    for off in offsets:
        buf.write(b'%010d 00000 n \n' % off)
    buf.write(b'trailer\n<</Size %d/Root 1 0 R>>\nstartxref\n%d\n%%%%EOF\n'
              % (len(objs) + 1, xref))
    io.open(path, 'wb').write(buf.getvalue())
    return len(buf.getvalue())


if __name__ == '__main__':
    data = json.load(io.open(os.path.join(ROOT, '_data', 'documents.json'), encoding='utf-8'))
    if not os.path.isdir(OUT):
        os.makedirs(OUT)
    n = 0
    sizes = {}
    for cat in data['categories']:
        for doc in cat['items']:
            size = build(doc, cat['name'], os.path.join(OUT, doc['id'] + '.pdf'))
            sizes[doc['id']] = size
            n += 1
    print('viet %d file PDF vao site/_docs/' % n)
    print('nho nhat %d B, lon nhat %d B' % (min(sizes.values()), max(sizes.values())))
