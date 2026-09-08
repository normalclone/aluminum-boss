# Replaces the homepage hero with the one drawn in the concept.
#
# Only the hero: the sections below it - the export globe and the factory map - are ours already
# and stay where they are.
import io, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', 'site'))
PAGE = os.path.join(ROOT, 'usa', 'index.html')
HERO = io.open(os.path.join(HERE, 'hero.html'), encoding='utf-8').read().strip()

OPEN = '<section class="section-hero">'
CLOSE = '</section>'


def replace_hero(s):
    a = s.find(OPEN)
    if a < 0:
        return s, 'khong tim thay section-hero'
    # walk to the matching close: the hero contains nested <section class="leyenda"> blocks, so
    # counting is required - taking the first </section> would cut it off mid-way
    i, depth = a + len(OPEN), 1
    while depth:
        o = s.find('<section', i)
        c = s.find(CLOSE, i)
        if c < 0:
            return s, 'khong tim thay the dong'
        if 0 <= o < c:
            depth += 1
            i = o + 8
        else:
            depth -= 1
            i = c + len(CLOSE)
    return s[:a] + HERO + s[i:], 'da thay %d KB hero' % ((i - a) // 1024)


s = io.open(PAGE, encoding='utf-8', errors='replace').read()
s, note = replace_hero(s)

if '_app/home.js' not in s:
    tag = '<script src="../_app/home.js"></script>'
    s = s.replace('</body>', tag + '\n</body>', 1) if '</body>' in s else s + '\n' + tag

# the claim used to be the page's only h1-equivalent; give the document a real one for anyone
# arriving by search or screen reader, without putting a second headline on the screen
if 'abhero-h1' not in s:
    s = s.replace('<section class="abhero"',
                  '<h1 id="abhero-h1" class="ab-visually-hidden">'
                  'Boss Group &mdash; aluminium extrusion, finishing and fabrication in Vietnam'
                  '</h1>\n<section class="abhero"', 1)

io.open(PAGE, 'w', encoding='utf-8').write(s)
print(note)
