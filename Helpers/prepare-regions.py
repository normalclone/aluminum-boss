# One-time preparation of the home page so its bands can be reordered.
#
# Two things are wrong with the page as imported, both harmless to look at and both in the way:
#
#   1. The five lower bands share one wrapper div. Moving one out of that wrapper would strip the
#      styling the wrapper provides, so as it stands they can only be shuffled among themselves.
#      Each gets its own wrapper here, which makes every band self-contained and movable anywhere.
#
#   2. The block of five sits *inside* the factory map's comment span - between that section's
#      markup and its script - because the script that injected it anchored on the first closing
#      tag it found. It renders correctly, but the two cannot be separated while one contains the
#      other. The block is lifted out and placed after the factory map.
#
# Afterwards each band is delimited by "region:key" comments and nothing else changes. Run once;
# it refuses to run twice.
import io, re, sys, os

PAGE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'wwwroot', 'usa', 'index.html')
PAGE = os.path.normpath(PAGE)

s = io.open(PAGE, encoding='utf-8').read()

if '<!--region:' in s:
    print('Trang da co moc vung roi, khong lam gi.')
    sys.exit(0)


def wrap(text, key, start, end):
    """Puts region markers around the span from `start` to the end of `end`."""
    a = text.find(start)
    if a < 0:
        raise SystemExit('khong tim thay dau khoi %s' % key)
    b = text.find(end, a)
    if b < 0:
        raise SystemExit('khong tim thay cuoi khoi %s' % key)
    b += len(end)
    return text[:a] + '<!--region:%s-->' % key + text[a:b] + '<!--/region:%s-->' % key + text[b:]


# --- 1. lift the five lower bands out of the factory map's span -------------------------------
BLK_A, BLK_B = '<!-- ab-home-blocks -->', '<!-- /ab-home-blocks -->'
a = s.find(BLK_A)
b = s.find(BLK_B)
if a < 0 or b < 0:
    raise SystemExit('khong tim thay khoi ab-home-blocks')
block = s[a:b + len(BLK_B)]
s = s[:a] + s[b + len(BLK_B):]

# the five sections inside it, each to get its own wrapper
sections = re.findall(r'<section class="abhb-[^"]*">.*?</section>', block, re.S)
if len(sections) != 5:
    raise SystemExit('mong doi 5 section trong khoi, tim thay %d' % len(sections))

KEYS = ['products', 'colors', 'projects', 'news', 'cta']
rebuilt = []
for key, section in zip(KEYS, sections):
    rebuilt.append(
        '<!--region:%s-->\n<div class="ab abhb" data-depth="1">\n%s\n</div>\n<!--/region:%s-->'
        % (key, section, key))
rebuilt = '\n'.join(rebuilt)

# --- 2. mark the three upper bands -------------------------------------------------------------
s = wrap(s, 'hero', '<section class="abhero" id="abhero">', '<span id="abhero-next"></span>')
s = wrap(s, 'globe',
         '<!-- ============ EXPORT GLOBE',
         '<!-- ============ /EXPORT GLOBE ============ -->')
s = wrap(s, 'factories',
         '<!-- ============ FACTORY MAP',
         '<!-- ============ /FACTORY MAP ============ -->')

# --- 3. put the five back, after the factory map ------------------------------------------------
anchor = '<!--/region:factories-->'
at = s.find(anchor) + len(anchor)
s = s[:at] + '\n' + rebuilt + '\n' + s[at:]

io.open(PAGE, 'w', encoding='utf-8').write(s)

order = re.findall(r'<!--region:([a-z0-9-]+)-->', s)
print('da dat moc cho %d vung: %s' % (len(order), ', '.join(order)))
