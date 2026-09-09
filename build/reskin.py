# Swaps the theme's mega-menu for the concept's header on every page, and makes sure every page
# loads the shared stylesheet and script.
#
# Run after build-pages.py: the generated pages inherit their chrome from the shell, so they get
# the old header too and are re-skinned here alongside the homepage.
import io, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', 'site'))
HEADER = io.open(os.path.join(HERE, 'header.html'), encoding='utf-8').read()
FOOTER = io.open(os.path.join(HERE, 'footer.html'), encoding='utf-8').read()

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
DEAD_COMPONENT = re.compile(
    r'CoreHero/hero__|core-components/sections/home/CoreHero'
    # Gravity Forms and the theme's tab component: their markup went with the old homepage
    # sections and the newsletter block, but the scripts stayed and threw on load - one reading
    # a config object that no longer exists, the other calling querySelectorAll on null.
    r'|plugins/gravityforms/|gform_theme_config|gform\.initializeOnLoaded'
    r'|core-components/core/tabs/tabs__', re.I)


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


BRAND = 'AluminumBoss'
SITE = 'Boss Group'

# What each section's page is about, for the description tags. Anything not listed falls back
# to the page title.
BLURB = {
    '': 'Aluminium extrusion, finishing and fabrication in Vietnam. Profile, facade, furniture, '
        'door and car accessories, and honeycomb panels, shipped to forty-three markets.',
    'about-us': 'Who we are: five plants between Nghe An and Binh Duong, what they can do, and '
                'what we are certified to.',
    'products': 'Six product families: profile systems, facade systems, furniture profiles, '
                'door and car accessories, and honeycomb panels.',
    'colors': 'Anodised, powder coated, wood grain, PVDF and mechanical finishes, all applied on '
              'our own lines.',
    'documents': 'Catalogues, technical data sheets, certificates and installation guides.',
    'projects': 'Buildings and programmes our aluminium went into, by year of completion.',
    'news': 'Plant, product and market news from Boss Group.',
    'contact': 'Request a quotation, order finish samples, ask an engineer, or apply to '
               'distribute.',
}

TITLE = {
    '': "Boss Group - Vietnam's Leading Aluminum Exporter",
}

DEAD_HEAD = re.compile(
    r'<meta[^>]+(?:property|name)\s*=\s*"(?:og:[^"]*|twitter:[^"]*|article:[^"]*|fb:[^"]*'
    r'|description|keywords|author|generator)"[^>]*>'
    r'|<link[^>]+rel\s*=\s*"(?:canonical|alternate|shortlink|next|prev|icon|shortcut icon'
    r'|apple-touch-icon|mask-icon)"[^>]*>'
    r'|<meta[^>]+name\s*=\s*"msapplication-[^"]*"[^>]*>'
    r'|<script[^>]+type\s*=\s*"application/ld\+json"[^>]*>.*?</script>', re.I | re.S)


PREFIX = ['']


def fix_head(s, section):
    """Replaces the old site's metadata with our own.

    The crawl brought across 122 meta tags describing a different company - open graph titles,
    canonical URLs pointing back at cosentino.com, and a JSON-LD block naming it as the
    organisation. Share this page anywhere and that is the name and link that would appear.
    """
    title = TITLE.get(section)
    if not title:
        m = re.search(r'<title[^>]*>(.*?)</title>', s, re.S | re.I)
        cur = re.sub(r'\s+', ' ', m.group(1)).strip() if m else ''
        if not cur or re.search(r'cosentino', cur, re.I):
            name = section.replace('-', ' ').title() if section else BRAND
            title = '%s | %s' % (name, BRAND)
        else:
            title = cur

    desc = BLURB.get(section) or title
    s = re.sub(r'<title[^>]*>.*?</title>', '<title>%s</title>' % title, s, count=1, flags=re.S | re.I)
    s = DEAD_HEAD.sub('', s)

    block = ('\n<meta name="description" content="%s">'
             '\n<meta property="og:type" content="website">'
             '\n<meta property="og:site_name" content="%s">'
             '\n<meta property="og:title" content="%s">'
             '\n<meta property="og:description" content="%s">'
             '\n<meta name="twitter:card" content="summary_large_image">'
             # the old favicon was the other company's logo, sitting in the browser tab on
             # every page; the whole set of icon links went with the rest of the head
             '\n<link rel="icon" href="%s_media/favicon.svg" type="image/svg+xml">\n'
             % (desc, SITE, title, desc, PREFIX[0]))
    return s.replace('</head>', block + '</head>', 1)


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
        inline_old = ' src=' not in block.split('>')[0] and 'cosentino.com' in block.lower()
        if THIRD_PARTY.search(block) or DEAD_COMPONENT.search(block) or inline_old:
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

    a = s.find('<footer')
    b = s.find('</footer>')
    if a >= 0 and b > a:
        s = s[:a] + FOOTER.replace('{{ROOT}}', prefix).strip() + s[b + len('</footer>'):]

    # Stamp the way back to the site root. The build knows the depth of every page; the script
    # in the browser does not, and the default it used to fall back to was one level too deep
    # for the homepage - harmless locally, a 404 once served from a subpath on Pages.
    s = re.sub(r'\sdata-ab-root="[^"]*"', '', s, count=1)
    s = re.sub(r'\sdata-ab-hero="[^"]*"', '', s, count=1)
    # A page whose hero runs to the top of the screen must not also reserve a strip at the top
    # for the header, because the header floats over it. Every other page must.
    hero = ' data-ab-hero="1"' if 'class="abhero"' in s else ''
    s = re.sub(r'<html\b', '<html data-ab-root="%s"%s' % (prefix or './', hero), s, count=1)

    PREFIX[0] = prefix
    s = fix_head(s, sec)

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
