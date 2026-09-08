# Wraps a body fragment in the chrome lifted by shell.py.
#
# The shell was taken from a page two levels below the site root, so every asset reference in it
# reads ../../. A page at another depth needs that prefix rewritten, otherwise it loads with no
# stylesheets and looks like a completely different site.
import io, os, re, sys

ROOT = r'D:/Code/qlweb2/cosentino-clone-js/site'
HERE = os.path.dirname(os.path.abspath(__file__))

TOP = io.open(os.path.join(HERE, 'shell-top.html'), encoding='utf-8').read()
BOTTOM = io.open(os.path.join(HERE, 'shell-bottom.html'), encoding='utf-8').read()

SHELL_DEPTH = 2


def build(out_rel, title, body, extra_head='', script=''):
    depth = out_rel.strip('/').count('/')          # index.html sits inside the page directory
    prefix = '../' * depth
    top = TOP.replace('../' * SHELL_DEPTH, prefix)
    bottom = BOTTOM.replace('../' * SHELL_DEPTH, prefix)

    top = re.sub(r'<title[^>]*>.*?</title>',
                 '<title>%s | AluminumBoss</title>' % title, top, count=1, flags=re.S)

    head = ('<link rel="stylesheet" href="%s_app/app.css">\n'
            '<script src="%s_app/app.js"></script>\n%s' % (prefix, prefix, extra_head))
    top = top.replace('</head>', head + '</head>', 1)

    html = top + '\n<main class="ab" data-depth="%d">\n%s\n</main>\n' % (depth, body)
    if script:
        html += '<script>\n%s\n</script>\n' % script
    html += bottom

    dst = os.path.join(ROOT, out_rel.replace('/', os.sep))
    d = os.path.dirname(dst)
    if not os.path.isdir(d):
        os.makedirs(d)
    io.open(dst, 'w', encoding='utf-8').write(html)
    return dst, len(html)


def frag(name):
    p = os.path.join(HERE, 'bodies', name)
    return io.open(p, encoding='utf-8').read()


if __name__ == '__main__':
    print('day la thu vien, chay build-products.py ...')
