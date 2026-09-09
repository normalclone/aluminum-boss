# Renames the asset folders that still carry the old company's hostname, and rewrites every
# reference to them.
#
# Nobody reads a file path, but these show up in view-source and in the network panel, and the
# instruction was to remove the name everywhere. The rename is mechanical and checkable: after
# it, no reference to the old host should remain and no request should 404.
import io, os, re, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', 'site'))
ASSETS = os.path.join(ROOT, '_assets')

RENAME = {
    'www.cosentino.com': 'theme',        # the WordPress theme, plugins and uploads
    'assetsstatic.cosentino.com': 'media',
    'imgix.cosentino.com': 'img',
}

moved = []
for old, new in RENAME.items():
    src, dst = os.path.join(ASSETS, old), os.path.join(ASSETS, new)
    if not os.path.isdir(src):
        continue
    if os.path.isdir(dst):
        raise SystemExit('%s da ton tai, dung lai' % new)
    shutil.move(src, dst)
    moved.append((old, new))

files, edits = 0, 0
for root, dirs, filenames in os.walk(ROOT):
    for f in filenames:
        if not f.lower().endswith(('.html', '.css', '.js', '.json', '.svg')):
            continue
        p = os.path.join(root, f)
        try:
            s = io.open(p, encoding='utf-8', errors='replace').read()
        except Exception:
            continue
        before = s
        for old, new in RENAME.items():
            s = s.replace('_assets/' + old + '/', '_assets/' + new + '/')
        if s != before:
            io.open(p, 'w', encoding='utf-8').write(s)
            files += 1
            edits += sum(before.count('_assets/' + o + '/') for o in RENAME)

for old, new in moved:
    print('  %-30s -> %s' % (old, new))
print('sua %d tham chieu trong %d file' % (edits, files))

# A second pass for names nested inside the tree: the theme folder itself, and a plugin folder.
# These are plain substrings rather than whole path segments, so they are replaced as text and
# the directories renamed to match. Class names carrying the same word go with them.
NESTED = {
    'cosentino-theme': 'base-theme',
    'CosentinoShowcase': 'Showcase',
    'cosentinoShowcase': 'showcase',
    'cosentino-city': 'city',
    'cosentino-center': 'center',
}

REMAP = {}
renamed_dirs = renamed_files = 0
for _ in range(4):                     # repeat: renaming a parent changes the children's paths
    todo = []
    for root, dirs, _f in os.walk(ASSETS):
        for d in dirs:
            for old, new in NESTED.items():
                if old in d:
                    todo.append((os.path.join(root, d), os.path.join(root, d.replace(old, new))))
    if not todo:
        break
    for src, dst in todo:
        if os.path.isdir(src) and not os.path.exists(dst):
            shutil.move(src, dst)
            renamed_dirs += 1

# Files as well as folders. Renaming only the folders and then rewriting the text left every
# page asking for a stylesheet whose file still had the old name - 42 dead requests across 15
# pages, caught by the crawl rather than by reading the diff.
for root, dirs, filenames in os.walk(ASSETS):
    for f in filenames:
        new_name = f
        for old, new in NESTED.items():
            new_name = new_name.replace(old, new)
        for old, new in RENAME.items():
            new_name = new_name.replace(old, new)
        new_name = re.sub(r'[Cc]osentino[-_]?', '', new_name) if 'osentino' in new_name else new_name
        if new_name != f and not os.path.exists(os.path.join(root, new_name)):
            shutil.move(os.path.join(root, f), os.path.join(root, new_name))
            renamed_files += 1
            REMAP[f] = new_name

files2 = edits2 = 0
for root, dirs, filenames in os.walk(ROOT):
    for f in filenames:
        if not f.lower().endswith(('.html', '.css', '.js', '.json', '.svg')):
            continue
        p = os.path.join(root, f)
        try:
            s = io.open(p, encoding='utf-8', errors='replace').read()
        except Exception:
            continue
        before = s
        for old, new in NESTED.items():
            s = s.replace(old, new)
        if s != before:
            io.open(p, 'w', encoding='utf-8').write(s)
            files2 += 1
            edits2 += sum(before.count(o) for o in NESTED)

# and the references to those file names
files3 = edits3 = 0
if REMAP:
    for root, dirs, filenames in os.walk(ROOT):
        for f in filenames:
            if not f.lower().endswith(('.html', '.css', '.js', '.json', '.svg')):
                continue
            p = os.path.join(root, f)
            try:
                s = io.open(p, encoding='utf-8', errors='replace').read()
            except Exception:
                continue
            before = s
            for old, new in REMAP.items():
                s = s.replace(old, new)
            if s != before:
                io.open(p, 'w', encoding='utf-8').write(s)
                files3 += 1
                edits3 += sum(before.count(o) for o in REMAP)

print('doi ten %d thu muc long nhau, sua %d chuoi trong %d file' % (renamed_dirs, edits2, files2))
print('doi ten %d file, sua %d tham chieu trong %d file' % (renamed_files, edits3, files3))

left = [d for d in os.listdir(ASSETS) if 'cosentino' in d.lower()]
print('thu muc con mang ten cu: %s' % (left or 'khong con'))
