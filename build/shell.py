# Lifts the chrome off an existing page so new pages inherit it exactly: same <head>, same
# stylesheets, same header and footer markup. Only the region between them is ours.
#
# Taken from a page one level under /usa/ so every relative asset path (../_assets/...) is
# already correct for the new pages, which sit at the same depth.
import io, os, re, sys

ROOT = r'D:/Code/qlweb2/cosentino-clone-js/site'
SRC = '/usa/inspirations/'          # a plain interior page: full chrome, no microsite nav


def split(url):
    p = os.path.join(ROOT, url.strip('/').replace('/', os.sep), 'index.html')
    s = io.open(p, encoding='utf-8', errors='replace').read()
    h = s.find('</header>')
    f = s.find('<footer')
    if h < 0 or f < 0 or f < h:
        raise SystemExit('khong tach duoc header/footer o %s' % url)
    return s[:h + len('</header>')], s[f:]


def clean(head_and_header):
    # the crawler froze mid-animation state into every tag; harmless on the old pages but it
    # would keep new content invisible or paused
    s = head_and_header
    s = s.replace(' style="animation-play-state: paused;"', '')
    s = re.sub(r'\s*animation-play-state:\s*paused;\s*', '', s)
    return s


if __name__ == '__main__':
    top, bottom = split(SRC)
    top, bottom = clean(top), clean(bottom)
    io.open('shell-top.html', 'w', encoding='utf-8').write(top)
    io.open('shell-bottom.html', 'w', encoding='utf-8').write(bottom)
    print('vo tren  %d KB  (den </header>)' % (len(top) // 1024))
    print('vo duoi  %d KB  (tu <footer>)' % (len(bottom) // 1024))
    m = re.search(r'<title[^>]*>(.*?)</title>', top, re.S)
    print('title hien tai:', re.sub(r'\s+', ' ', m.group(1)).strip() if m else '-')
    print('so <link rel=stylesheet>:', len(re.findall(r'<link[^>]+stylesheet', top)))
    print('so <script src>:', len(re.findall(r'<script[^>]+src=', top)) ,
          '+', len(re.findall(r'<script[^>]+src=', bottom)), 'o footer')
