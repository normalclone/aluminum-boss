# Deletes the page groups that are not in the concept's navigation, and deals with the links
# that pointed at them. Deleting alone would leave 588 dead links across 134 pages.
#
# Three different answers, because one rule does not fit all of them:
#   - Where To Buy (178 links) is a header button and a call-to-action on nearly every page.
#     It gets repointed to Contact, which the concept keeps, rather than turned into dead text.
#   - Sitemap (58) is a footer line whose only content is the link, so the whole <p> goes.
#   - The rest are links inside body copy. The anchor is unwrapped and the words stay put,
#     which cannot disturb the layout around them.
import io, json, os, re, sys, collections

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site')
ROOT = os.path.normpath(ROOT).replace(os.sep, '/')

# The job file is either a bare list of pages to remove, or an object that also says where the
# links pointing at them should go instead.
_job = json.load(io.open(sys.argv[1] if len(sys.argv) > 1 else 'drop.json', encoding='utf-8'))
if isinstance(_job, list):
    _job = {'drop': _job, 'repoint': {}}
drop = set(_job['drop'])

A_OPEN = re.compile(r'<a\b[^>]*>', re.I)
HREF = re.compile(r'href\s*=\s*"([^"]*)"', re.I)
TAGS = re.compile(r'<[^>]*>')

# dropped page -> page that takes over its links, matched on the tail so the tablet and phone
# trees repoint within themselves
REPOINT = _job.get('repoint', {})


def resolve(page_dir, href):
    h = href.split('?')[0].split('#')[0]
    if not h or h.startswith(('http', 'mailto:', 'tel:', 'javascript:', 'data:', '//')):
        return None
    t = os.path.normpath(os.path.join(page_dir, h))
    rel = '/' + os.path.relpath(t, ROOT).replace(os.sep, '/')
    return (rel.rstrip('/') + '/').replace('//', '/')


def replacement_for(url, page_dir):
    """Relative href to the page that takes over `url`, or None."""
    for tail, dest in REPOINT.items():
        if url.endswith(tail):
            target = url[:-len(tail)] + dest
            if not os.path.exists(os.path.join(ROOT, target.strip('/').replace('/', os.sep),
                                               'index.html')):
                return None
            abs_t = os.path.join(ROOT, target.strip('/').replace('/', os.sep))
            rel = os.path.relpath(abs_t, page_dir).replace(os.sep, '/')
            return rel + '/'
    return None


def marks(s, tag):
    """Every <tag ...> and </tag> in the document, in order, as (position, end, is_close).

    Matched on a tag boundary: a plain substring search for '<p' also finds <path>, and '<li'
    also finds <link>, which is what silently disabled this whole branch before.
    """
    pat = re.compile(r'<(/?)%s(?=[\s/>])[^>]*>' % tag, re.I)
    return [(m.start(), m.end(), bool(m.group(1))) for m in pat.finditer(s)]


def enclosing(s, start, tag):
    """Span of the nearest `tag` element still open at `start`, or None."""
    ms = marks(s, tag)
    stack = []
    for a, b, close in ms:
        if a >= start:
            break
        if close:
            if stack:
                stack.pop()
        else:
            stack.append(a)
    if not stack:
        return None
    open_at = stack[-1]
    depth = 0
    for a, b, close in ms:
        if a <= open_at:
            continue
        if close:
            if depth == 0:
                return (open_at, b)
            depth -= 1
        else:
            depth += 1
    return None


def only_content(s, span, inner):
    """True when the element at `span` holds nothing but the text that was just unwrapped."""
    body = s[span[0]:span[1]]
    body = body[body.find('>') + 1:body.rfind('<')]
    if '<a' in body.lower() or '<img' in body.lower():
        return False
    return TAGS.sub('', body).strip() == TAGS.sub('', inner).strip() != ''


def fix_page(path):
    s = io.open(path, encoding='utf-8', errors='replace').read()
    page_dir = os.path.dirname(path)
    moved = dropped_wrap = unwrapped = 0

    while True:
        hit = target = None
        for m in A_OPEN.finditer(s):
            hm = HREF.search(m.group(0))
            if not hm:
                continue
            u = resolve(page_dir, hm.group(1))
            if u in drop:
                hit, target = m, u
                break
        if not hit:
            break

        new_href = replacement_for(target, page_dir)
        if new_href:
            tag = HREF.sub('href="%s"' % new_href, hit.group(0), count=1)
            s = s[:hit.start()] + tag + s[hit.end():]
            moved += 1
            continue

        close = s.find('</a>', hit.end())
        if close < 0:
            s = s[:hit.start()] + s[hit.end():]     # malformed; drop the tag itself
            continue
        a_start, a_end = hit.start(), close + 4
        inner = s[hit.end():close]

        # unwrap first, then ask whether the line the link sat on has anything left to say
        s2 = s[:a_start] + inner + s[a_end:]
        for tag in ('li', 'p'):
            span = enclosing(s2, a_start, tag)
            if span and span[0] < a_start and span[1] > a_start + len(inner) \
                    and only_content(s2, span, inner):
                s = s2[:span[0]] + s2[span[1]:]
                dropped_wrap += 1
                break
        else:
            s = s2
            unwrapped += 1

    if moved or dropped_wrap or unwrapped:
        io.open(path, 'w', encoding='utf-8').write(s)
    return moved, dropped_wrap, unwrapped


# ---- delete the pages -------------------------------------------------------
# Only the page's own index.html: four News articles live inside Spaces directories
# (/usa/kitchens/contemporary-veining/ and friends), so removing the parent folder wholesale
# takes kept pages down with it.
gone = 0
for u in sorted(drop):
    f = os.path.join(ROOT, u.strip('/').replace('/', os.sep), 'index.html')
    if os.path.isfile(f):
        os.remove(f)
        gone += 1
emptied = 0
for root, dirs, files in os.walk(ROOT, topdown=False):
    if root == ROOT:
        continue
    if not os.listdir(root):
        os.rmdir(root)
        emptied += 1
print('da xoa %d trang, don %d thu muc rong' % (gone, emptied))

# ---- deal with the links ----------------------------------------------------
pages = []
for root, dirs, files in os.walk(ROOT):
    parts = root.split(os.sep)
    if '_assets' in parts or '_frames' in parts or '_ph' in parts:
        continue
    for f in files:
        if f.lower().endswith('.html'):
            pages.append(os.path.join(root, f))

tm = tw = tu = touched = 0
for p in pages:
    a, b, c = fix_page(p)
    if a or b or c:
        touched += 1
    tm += a
    tw += b
    tu += c
print('tro lai %d lien ket, go %d dong chua moi lien ket do, thao vo %d lien ket, tren %d trang'
      % (tm, tw, tu, touched))

# ---- confirm nothing dangles -----------------------------------------------
HREF_ANY = re.compile(r'href\s*=\s*"([^"]+)"', re.I)
dangling = collections.Counter()
for p in pages:
    s = io.open(p, encoding='utf-8', errors='replace').read()
    d = os.path.dirname(p)
    for m in HREF_ANY.finditer(s):
        h = m.group(1).split('?')[0].split('#')[0]
        if not h or h.startswith(('http', 'mailto:', 'tel:', 'javascript:', 'data:', '//')):
            continue
        t = os.path.normpath(os.path.join(d, h))
        if os.path.exists(t) or os.path.exists(os.path.join(t, 'index.html')):
            continue
        rel = '/' + os.path.relpath(t, ROOT).replace(os.sep, '/')
        dangling[(rel.rstrip('/') + '/').replace('//', '/')] += 1
to_dropped = sum(n for u, n in dangling.items() if u in drop)
print('con tro toi trang da xoa: %d luot' % to_dropped)
print('lien ket noi bo hong tong cong: %d luot / %d dia chi' % (sum(dangling.values()), len(dangling)))
