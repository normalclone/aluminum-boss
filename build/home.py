# Replaces the homepage hero with the one drawn in the concept.
#
# Only the hero: the sections below it - the export globe and the factory map - are ours already
# and stay where they are.
#
# The new hero goes directly after </header>, not where the old one sat. The old hero lived
# inside section.core-container, which carries 38px of side padding, so a full-bleed backdrop
# stopped 38px short of both edges. The concept's opening screen runs edge to edge.
import io, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', 'site'))
PAGE = os.path.join(ROOT, 'usa', 'index.html')
HERO = io.open(os.path.join(HERE, 'hero.html'), encoding='utf-8').read().strip()

H1 = ('<h1 id="abhero-h1" class="ab-visually-hidden">'
      'Boss Group &mdash; aluminium extrusion, finishing and fabrication in Vietnam</h1>')


def cut_section(s, opening):
    """Removes the element that starts at `opening`, counting nested <section> tags.

    Taking the first </section> would cut the old hero off half way: it contains four nested
    <section class="leyenda"> blocks.
    """
    a = s.find(opening)
    if a < 0:
        return s, 0
    i, depth = a + len(opening), 1
    while depth:
        o = s.find('<section', i)
        c = s.find('</section>', i)
        if c < 0:
            return s, 0
        if 0 <= o < c:
            depth += 1
            i = o + 8
        else:
            depth -= 1
            i = c + len('</section>')
    return s[:a] + s[i:], i - a


s = io.open(PAGE, encoding='utf-8', errors='replace').read()

# idempotent: drop whatever hero is there now, old or ours, then place a fresh one
s, n_old = cut_section(s, '<section class="section-hero">')
s, n_new = cut_section(s, '<section class="abhero" id="abhero">')
s = re.sub(r'<h1 id="abhero-h1".*?</h1>\s*', '', s, flags=re.S)
s = s.replace('<span id="abhero-next"></span>', '')

anchor = '</header>'
at = s.find(anchor)
if at < 0:
    raise SystemExit('khong tim thay </header>')
at += len(anchor)
s = s[:at] + '\n' + H1 + '\n' + HERO + '\n' + s[at:]

if '_app/home.js' not in s:
    tag = '<script src="../_app/home.js"></script>'
    s = s.replace('</body>', tag + '\n</body>', 1) if '</body>' in s else s + '\n' + tag

io.open(PAGE, 'w', encoding='utf-8').write(s)
print('go hero cu %d KB, hero hien tai %d KB, dat lai ngay sau </header>'
      % (n_old // 1024, n_new // 1024))
