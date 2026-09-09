# Where the old brand still appears, split by what kind of appearance it is.
#
# A path under _assets is not the same problem as a heading: one is a file name nobody reads,
# the other is on the screen. Counting them together would make the job look bigger than it is
# and hide which part actually matters.
import io, os, re, collections

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site'))
WORD = re.compile(r'cosentino', re.I)
TAG = re.compile(r'<[^>]+>')


def classify(path):
    s = io.open(path, encoding='utf-8', errors='replace').read()
    out = collections.Counter()
    samples = collections.defaultdict(list)

    # visible text: strip scripts, styles and every tag, then look at what is left
    body = s[s.find('</header>'):] if '</header>' in s else s
    txt = re.sub(r'<(script|style)[^>]*>.*?</\1>', ' ', body, flags=re.S | re.I)
    txt = TAG.sub(' ', txt)
    for m in WORD.finditer(txt):
        out['chu hien tren trang'] += 1
        if len(samples['chu hien tren trang']) < 4:
            samples['chu hien tren trang'].append(re.sub(r'\s+', ' ', txt[max(0, m.start()-45):m.start()+45]).strip())

    m = re.search(r'<title[^>]*>(.*?)</title>', s, re.S | re.I)
    if m and WORD.search(m.group(1)):
        out['tieu de trang'] += 1
        samples['tieu de trang'].append(re.sub(r'\s+', ' ', m.group(1)).strip()[:80])

    for m in re.finditer(r'<meta[^>]+>', s, re.I):
        if WORD.search(m.group(0)):
            out['the meta'] += 1
            if len(samples['the meta']) < 3:
                samples['the meta'].append(re.sub(r'\s+', ' ', m.group(0))[:110])

    for m in re.finditer(r'(?:href|src)\s*=\s*"([^"]*cosentino[^"]*)"', s, re.I):
        out['duong dan file'] += 1
        if len(samples['duong dan file']) < 2:
            samples['duong dan file'].append(m.group(1)[:100])

    return out, samples


pages = []
for root, dirs, files in os.walk(ROOT):
    parts = root.split(os.sep)
    if '_assets' in parts:
        continue
    for f in files:
        if f.lower().endswith('.html'):
            pages.append(os.path.join(root, f))

total = collections.Counter()
per_page = collections.Counter()
all_samples = collections.defaultdict(list)
for p in sorted(pages):
    out, samples = classify(p)
    if out:
        per_page[os.path.relpath(p, ROOT).replace(os.sep, '/')] = out['chu hien tren trang']
    total.update(out)
    for k, v in samples.items():
        for x in v:
            if x not in all_samples[k] and len(all_samples[k]) < 6:
                all_samples[k].append(x)

print('%d trang HTML' % len(pages))
for k in ['chu hien tren trang', 'tieu de trang', 'the meta', 'duong dan file']:
    print('  %-22s %d lan' % (k, total[k]))
print()
print('trang co nhieu chu hien nhat:')
for p, n in per_page.most_common(8):
    print('   %4d  %s' % (n, p))
print()
for k in ['chu hien tren trang', 'tieu de trang', 'the meta']:
    if all_samples[k]:
        print('== %s ==' % k)
        for x in all_samples[k]:
            print('   ...%s...' % x)
        print()
