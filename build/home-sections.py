# Removes the leftover sections of the old homepage and puts our own in their place.
#
# What stays: the export globe and the factory map, which are already ours. Everything else
# below the hero still belongs to the other company - its spaces, its brands, its city centres -
# and is replaced by sections built from the same JSON the rest of the site runs on.
import io, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', 'site'))
PAGE = os.path.join(ROOT, 'usa', 'index.html')

# class -> what it was. Matched on the opening tag of a <section> or <div>.
DROP = [
    'section-espacios', 'core-slider-novedades', 'section-colores', 'section-galeria',
    'section-hybriq', 'section-marcas', 'section-city',
    # three call-to-action blocks: a renovation offer, a customisable panel, and a newsletter
    # sign-up whose consent text named the other company twice and whose form posted nowhere
    'core-cta-reducido', 'core-cta-customizable', 'core-cta',
]

BLOCK = io.open(os.path.join(HERE, 'home-blocks.html'), encoding='utf-8').read().strip()


def cut_element(s, at):
    """Removes the element whose opening tag starts at `at`, counting nested tags of that name."""
    m = re.match(r'<(\w+)', s[at:])
    if not m:
        return s, 0
    tag = m.group(1)
    op, cl = '<' + tag, '</' + tag
    i = s.find('>', at) + 1
    depth = 1
    while depth:
        o = s.find(op, i)
        c = s.find(cl, i)
        if c < 0:
            return s, 0
        if 0 <= o < c:
            depth += 1
            i = o + len(op)
        else:
            depth -= 1
            i = c + len(cl)
    end = s.find('>', i) + 1
    return s[:at] + s[end:], end - at


s = io.open(PAGE, encoding='utf-8', errors='replace').read()

removed = []
for cls in DROP:
    while True:
        m = re.search(r'<(?:section|div)[^>]*\bclass="[^"]*\b%s\b[^"]*"' % re.escape(cls), s)
        if not m:
            break
        s, n = cut_element(s, m.start())
        if not n:
            print('  !! khong cat duoc %s' % cls)
            break
        removed.append((cls, n))

# our own blocks go after the factory map, which is the last thing that was already ours
anchor = s.find('<!-- ============ FACTORY MAP')
if anchor < 0:
    anchor = s.find('class="vfx"')
if anchor < 0:
    raise SystemExit('khong tim thay khoi ban do nha may de neo vao')
end = s.find('</section>', anchor)
end = s.find('>', end) + 1

s = re.sub(r'<!-- ab-home-blocks -->.*?<!-- /ab-home-blocks -->', '', s, flags=re.S)
s = s[:end] + '\n<!-- ab-home-blocks -->\n' + BLOCK + '\n<!-- /ab-home-blocks -->\n' + s[end:]

if '_app/home-blocks.js' not in s:
    tag = '<script src="../_app/home-blocks.js"></script>'
    s = s.replace('</body>', tag + '\n</body>', 1) if '</body>' in s else s + '\n' + tag

io.open(PAGE, 'w', encoding='utf-8').write(s)

print('go %d khoi cu:' % len(removed))
for cls, n in removed:
    print('   %-24s %5d KB' % (cls, n // 1024))
print('da chen khoi moi sau ban do nha may')
