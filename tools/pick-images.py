# Chot anh cho tung muc: cat dai chu neu can, chep vao import/media/<loai>/, ghi manifest.
#
#   python tools/pick-images.py import/media/chon-vong3.json --dry
#   python tools/pick-images.py import/media/chon-vong3.json
#   python tools/ingest-images.py tools/manifests/vong3.json --dry
#
# ---------------------------------------------------------------------------------------------
# VI SAO CO BUOC NAY
#
# `images-bossdoor.js --khao-sat` tai HET ung vien cua nhung muc con trong vao import/media/vong3/,
# roi `images-text.py --gom` xep chung thanh mot to lien anh moi muc mot hang. Nguoi nhin chon.
# Tep JSON ma cong cu nay doc CHINH LA ket qua cua buoc nhin do — no la ban ghi duy nhat noi ai
# da chon tam nao va vi sao. Khong co buoc nay thi lua chon nam trong dau mot nguoi va mat theo.
#
# ---------------------------------------------------------------------------------------------
# CAT DAI CHU
#
# Phan lon anh cua bossdoor.vn la ANH CHUP THAT co mot dai quang cao tieng Viet dan o mot canh.
# Bo ca tam thi mat mot tam anh that; giu ca tam thi co tieng Viet tren trang tieng Anh. Cat dai
# do di la cach thu ba, va no chi dung duoc khi dai nam GON O MOT CANH — cat vao giua anh thi hong
# bo cuc, luc do phai bo tam.
#
# `cat` la bon so [trai, tren, phai, duoi] theo TI LE 0..1 cua canh tuong ung. `[0,0,0,0.16]` doc
# la "bo 16% duoi". Dung ti le chu khong dung pixel vi cung mot dai quang cao xuat hien tren nhieu
# co anh khac nhau.
#
# ---------------------------------------------------------------------------------------------
# HAI MUC KHONG DUOC DUNG CHUNG MOT TAM
#
# Truoc khi ghi, cong cu bam dHash moi tam da chon va so voi nhau VA voi nhung tam da xuat ban
# trong site/_media. Trung thi bao va dung lai. Do la loi da xay ra that: `high-speed-doors` va
# `industrial-shutters` la cung mot tam anh nha kho, khac dinh dang nen md5 khong thay.
import io
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
import dhash                                        # noqa: E402
from PIL import Image                               # noqa: E402

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
DRY = '--dry' in sys.argv

DOC = {
    'news': {'doc': 'news', 'array': 'items'},
    'products': {'doc': 'products', 'array': 'categories', 'nested': 'items'},
    'projects': {'doc': 'projects', 'array': 'albums'},
}


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not args:
        print('Dung: python tools/pick-images.py <chon.json> [--dry]')
        return 1
    chon = json.load(io.open(os.path.join(ROOT, args[0]), encoding='utf-8'))
    muc = chon['chon']

    out_files = {}
    for m in muc:
        src = os.path.join(ROOT, m['tep'])
        if not os.path.exists(src):
            print('  THIEU tep nguon: %s' % m['tep'])
            return 1
        im = Image.open(src).convert('RGB')
        w, h = im.size
        c = m.get('cat')
        if c:
            box = (int(w * c[0]), int(h * c[1]), int(w * (1 - c[2])), int(h * (1 - c[3])))
            if box[2] - box[0] < 80 or box[3] - box[1] < 80:
                print('  Cat qua sau, con lai %dx%d: %s' % (box[2] - box[0], box[3] - box[1], m['id']))
                return 1
            im = im.crop(box)
        dest_dir = os.path.join(ROOT, 'import', 'media', m['loai'])
        dest = os.path.join(dest_dir, m['id'] + '.jpg')
        out_files[m['id']] = (dest, im, m, '%dx%d' % im.size + (' (cat tu %dx%d)' % (w, h) if c else ''))

    # --- khong hai muc nao duoc dung chung mot tam -------------------------------------------
    tmp = os.path.join(ROOT, 'tools', 'out', 'tam')
    os.makedirs(tmp, exist_ok=True)
    ma = {}
    for i, (dest, im, m, _) in out_files.items():
        p = os.path.join(tmp, i + '.jpg')
        im.save(p, quality=90)
        ma[i] = (dhash.dhash(p), p)
    keys = list(ma)
    va = []
    for a in range(len(keys)):
        for b in range(a + 1, len(keys)):
            d = dhash.cach(ma[keys[a]][0], ma[keys[b]][0])
            if d <= 8:
                va.append((keys[a], keys[b], d, 'trong lan chon nay'))
    # ... va voi nhung tam da xuat ban
    med = os.path.join(ROOT, 'site', '_media')
    daco = [os.path.join(med, n) for n in sorted(os.listdir(med))] if os.path.isdir(med) else []
    for i in keys:
        if i in [os.path.basename(q).rsplit('.', 1)[0] for q in daco]:
            continue                                 # dang thay chinh no thi khong tinh la trung
        for q in daco:
            try:
                d = dhash.cach(ma[i][0], dhash.dhash(q))
            except Exception:
                continue
            if d <= 8:
                va.append((i, os.path.basename(q), d, 'da xuat ban'))

    print('')
    print('  %d muc duoc chon:' % len(out_files))
    for i, (dest, im, m, note) in out_files.items():
        print('    %-30s %-40s %s' % (i, os.path.basename(m['tep']), note))

    if va:
        print('')
        print('  TRUNG ANH — dung lai, khong ghi gi:')
        for a, b, d, where in va:
            print('    %s == %s  (lech %d bit, %s)' % (a, b, d, where))
        return 1

    if DRY:
        print('')
        print('  --dry: khong ghi gi. Bo --dry de ghi that.')
        return 0

    manifest = []
    for i, (dest, im, m, _) in out_files.items():
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        im.save(dest, quality=90)
        e = {'src': os.path.relpath(dest, os.path.join(ROOT, 'tools', 'manifests')).replace('\\', '/'),
             'doc': DOC[m['loai']]['doc'], 'array': DOC[m['loai']]['array'],
             'id': i, 'field': 'image', 'as': i + '.jpg',
             'from': m.get('nguon', 'bossdoor.vn')}
        if 'nested' in DOC[m['loai']]:
            e['nested'] = DOC[m['loai']]['nested']
        manifest.append(e)

    mf = os.path.join(ROOT, 'tools', 'manifests', 'vong3.json')
    os.makedirs(os.path.dirname(mf), exist_ok=True)
    io.open(mf, 'w', encoding='utf-8', newline='\n').write(
        json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print('')
    print('  Manifest: %s (%d dong)' % (os.path.relpath(mf, ROOT), len(manifest)))
    print('  Tiep theo: python tools/ingest-images.py tools/manifests/vong3.json --dry')
    return 0


if __name__ == '__main__':
    sys.exit(main())
