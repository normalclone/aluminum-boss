# Which files under _assets are still reachable, and which are dead weight.
#
# Reachability is transitive: a page names a stylesheet, the stylesheet names a font and a
# background image, and that background image is as alive as the page. Walking only the HTML
# would condemn every font on the site.
import io, json, os, re, sys, collections
import urllib.parse

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site'))

REF = re.compile(r'''(?:src|href|data-src|data-lazy-src|data-bg|poster|content)\s*=\s*["']([^"']+)["']'''
                 r'''|url\(\s*["']?([^"')]+)["']?\s*\)'''
                 r'''|srcset\s*=\s*["']([^"']+)["']'''
                 # @import "x.css" carries no url(), and missing it would condemn a stylesheet
                 # that is loaded on every page
                 r'''|@import\s+["']([^"']+)["']''', re.I)
SKIP = ('http://', 'https://', '//', 'data:', 'mailto:', 'tel:', 'javascript:', '#')


def refs(text, base_dir):
    out = set()
    for m in REF.finditer(text):
        raw = m.group(1) or m.group(2) or m.group(3) or m.group(4) or ''
        srcset = bool(m.group(3))
        for part in (raw.split(',') if srcset else [raw]):
            u = part.strip()
            # only a srcset entry carries a descriptor after a space ("photo.jpg 2x"). Splitting
            # every reference on space truncates a filename that simply contains one, and the
            # real file is then reported as an orphan: "Products (2).svg" became "Products".
            if srcset:
                u = u.split(' ')[0]
            u = u.split('?')[0].split('#')[0]
            if not u or u.startswith(SKIP):
                continue
            # the reference is a URL, the file on disk is not: "Products%20(2).svg" names a
            # file called "Products (2).svg", and comparing the two raw declares it an orphan
            u = urllib.parse.unquote(u)
            p = os.path.normpath(os.path.join(base_dir, u))
            if p.startswith(ROOT):
                out.add(p)
    return out


def walk():
    seen, queue = set(), []
    # every page under site/ is an entry point, plus anything the app layer loads by name
    for root, dirs, files in os.walk(ROOT):
        if '_assets' in root.split(os.sep):
            continue
        for f in files:
            if f.lower().endswith(('.html', '.css', '.js', '.json')):
                queue.append(os.path.join(root, f))
    while queue:
        p = queue.pop()
        if p in seen or not os.path.isfile(p):
            continue
        seen.add(p)
        if not p.lower().endswith(('.html', '.css', '.js', '.json')):
            continue
        try:
            t = io.open(p, encoding='utf-8', errors='replace').read()
        except Exception:
            continue
        for q in refs(t, os.path.dirname(p)):
            if q not in seen:
                queue.append(q)
            if os.path.isdir(q):
                idx = os.path.join(q, 'index.html')
                if os.path.isfile(idx) and idx not in seen:
                    queue.append(idx)
    return seen


used = walk()
adir = os.path.join(ROOT, '_assets')
alive = dead = 0
alive_n = dead_n = 0
dead_list = []
by_ext = collections.Counter()
for root, dirs, files in os.walk(adir):
    for f in files:
        p = os.path.join(root, f)
        n = os.path.getsize(p)
        if p in used:
            alive += n
            alive_n += 1
        else:
            dead += n
            dead_n += 1
            dead_list.append(os.path.relpath(p, ROOT).replace(os.sep, '/'))
            by_ext[f.rsplit('.', 1)[-1].lower() if '.' in f else '(khong duoi)'] += n

mb = lambda b: '%.1f MB' % (b / 1048576.0)
print('_assets: %d file dang dung (%s), %d file khong ai tro toi (%s)'
      % (alive_n, mb(alive), dead_n, mb(dead)))
print()
print('phan chet, theo duoi file:')
for e, n in by_ext.most_common(10):
    print('   %-8s %10s' % (e, mb(n)))

io.open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dead-assets.json'),
        'w', encoding='utf-8').write(json.dumps(sorted(dead_list), indent=1))
print()
print('danh sach ghi vao build/dead-assets.json')
