import io, os
from build import build, frag

for out, title, body, js in [
    ('products/index.html', 'Products', 'products-list.html', 'products-list.js'),
    ('products/detail/index.html', 'Products', 'products-detail.html', 'products-detail.js'),
]:
    p, n = build(out, title, frag(body), script=frag(js))
    print('  %-40s %4d KB' % (out, n // 1024))
