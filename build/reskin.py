# Swaps the theme's mega-menu for the concept's header on every page, and makes sure every page
# loads the shared stylesheet and script.
#
# Run after build-pages.py: the generated pages inherit their chrome from the shell, so they get
# the old header too and are re-skinned here alongside the homepage.
import io, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', 'site'))
HEADER = io.open(os.path.join(HERE, 'header.html'), encoding='utf-8').read()

NAV_KEY = re.compile(r'/usa/([a-z0-9-]+)/')

# Markers that identify a script block as belonging to a third-party service rather than to the
# page. Matched against the whole <script>...</script>, so an inline loader is caught as well as
# a plain src.
THIRD_PARTY = re.compile(
    r'chatbot\.com|googletagmanager|google-analytics|gtag\(|_vwo_code|visualwebsiteoptimizer'
    r'|window\.__be|brightedge|cookiebot|abtasty|hotjar|connect\.facebook\.net'
    r'|google\.com/recaptcha|sdk\.woosmap\.com|doubleclick', re.I)

# Theme components whose markup this site replaced. The script stays in the page and throws on
# load looking for an element that is no longer there - CoreHero was reading .style off null on
# every homepage view.
DEAD_COMPONENT = re.compile(r'CoreHero/hero__|core-components/sections/home/CoreHero', re.I)


def pages():
    out = []
    for root, dirs, files in os.walk(ROOT):
        parts = root.split(os.sep)
        if '_assets' in parts or '_frames' in parts or '_ph' in parts:
            continue
        for f in files:
            if f.lower().endswith('.html'):
                out.append(os.path.join(root, f))
    return out


def depth_of(path):
    rel = os.path.relpath(path, ROOT).replace(os.sep, '/')
    return rel.count('/')


def section_of(path):
    """Which nav item this page belongs to, so the current one can be marked."""
    rel = '/' + os.path.relpath(os.path.dirname(path), ROOT).replace(os.sep, '/') + '/'
    m = NAV_KEY.search(rel)
    return m.group(1) if m else ''


def strip_leftovers(s):
    """Removes the theme's floating widgets and the dead analytics frames.

    Both float above every page: a quote button pointing at a landing page that no longer
    exists, and a chat launcher with no service behind it. On a demo they read as broken
    features rather than as leftovers.
    """
    n = 0
    # <a id="aside-menu-btn-test" ...> ... </a>
    a = s.find('id="aside-menu-btn-test"')
    if a >= 0:
        start = s.rfind('<a', 0, a)
        end = s.find('</a>', a)
        if start >= 0 and end > 0:
            s = s[:start] + s[end + 4:]
            n += 1
    # <div id="chatbot-chat"> ... </div>  (no nesting inside it)
    a = s.find('id="chatbot-chat"')
    if a >= 0:
        start = s.rfind('<div', 0, a)
        end = s.find('</div>', a)
        if start >= 0 and end > 0:
            s = s[:start] + s[end + 6:]
            n += 1
    s, k = re.subn(r'<noscript>\s*<iframe[^>]*googletagmanager[^>]*>.*?</noscript>', '', s,
                   flags=re.S | re.I)
    n += k
    s, k = re.subn(r'<!--\s*(Start|End) of ChatBot[^>]*-->', '', s)
    n += k

    # Third-party loaders. The chat widget was not in the markup at all - an inline script on the
    # homepage was fetching cdn.chatbot.com at runtime and building it - so removing the element
    # was never going to be enough. The rest go with it: a demo that phones out to five analytics
    # and testing services on load is both slower and not ours to send anyone's data to.
    out, last, dropped = [], 0, 0
    for m in re.finditer(r'<script\b[^>]*>.*?</script>', s, re.S | re.I):
        block = m.group(0)
        if THIRD_PARTY.search(block) or DEAD_COMPONENT.search(block):
            out.append(s[last:m.start()])
            last = m.end()
            dropped += 1
    out.append(s[last:])
    s = ''.join(out)
    n += dropped
    return s, n


def reskin(path):
    s = io.open(path, encoding='utf-8', errors='replace').read()
    d = depth_of(path)
    prefix = '../' * d
    s, stripped = strip_leftovers(s)

    head = HEADER.replace('{{ROOT}}', prefix)
    sec = section_of(path)
    if sec:
        head = head.replace('data-nav="%s"' % sec, 'data-nav="%s" class="is-on"' % sec, 1)

    a = s.find('<header')
    b = s.find('</header>')
    if a < 0 or b < 0:
        return False, 'khong co <header>'
    s = s[:a] + head.strip() + s[b + len('</header>'):]

    # Stamp the way back to the site root. The build knows the depth of every page; the script
    # in the browser does not, and the default it used to fall back to was one level too deep
    # for the homepage - harmless locally, a 404 once served from a subpath on Pages.
    s = re.sub(r'\sdata-ab-root="[^"]*"', '', s, count=1)
    s = re.sub(r'\sdata-ab-hero="[^"]*"', '', s, count=1)
    # A page whose hero runs to the top of the screen must not also reserve a strip at the top
    # for the header, because the header floats over it. Every other page must.
    hero = ' data-ab-hero="1"' if 'class="abhero"' in s else ''
    s = re.sub(r'<html\b', '<html data-ab-root="%s"%s' % (prefix or './', hero), s, count=1)

    # the stylesheet and helpers must be present even on pages build-pages.py did not generate
    if '_app/app.css' not in s:
        s = s.replace('</head>',
                      '<link rel="stylesheet" href="%s_app/app.css">\n'
                      '<script src="%s_app/app.js"></script>\n</head>' % (prefix, prefix), 1)
    if '_app/header.js' not in s:
        s = s.replace('</body>', '<script src="%s_app/header.js"></script>\n</body>' % prefix, 1)
        if '_app/header.js' not in s:                      # some pages have no </body>
            s += '\n<script src="%s_app/header.js"></script>\n' % prefix

    io.open(path, 'w', encoding='utf-8').write(s)
    return True, '%s (go %d widget)' % (sec or '-', stripped)


if __name__ == '__main__':
    ok = bad = 0
    for p in sorted(pages()):
        done, note = reskin(p)
        rel = os.path.relpath(p, ROOT).replace(os.sep, '/')
        if done:
            ok += 1
        else:
            bad += 1
            print('  BO QUA %-46s %s' % (rel, note))
    print('da doi header tren %d trang, bo qua %d' % (ok, bad))
