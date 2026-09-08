import io, os
from build import build, frag

PAGES = [
    ('usa/products/index.html',        'Products', 'products-list.html',  'products-list.js'),
    ('usa/products/detail/index.html', 'Products', 'products-detail.html','products-detail.js'),
    ('usa/colors/index.html',          'Colors',   'colors-list.html',    'colors-list.js'),
    ('usa/colors/detail/index.html',   'Colors',   'colors-detail.html',  'colors-detail.js'),
    ('usa/news/index.html',            'News',     'news-list.html',      'news-list.js'),
    ('usa/news/detail/index.html',     'News',     'news-detail.html',    'news-detail.js'),
    ('usa/about-us/index.html',        'About us', 'about-list.html',     'about-list.js'),
    ('usa/about-us/detail/index.html', 'About us', 'about-detail.html',   'about-detail.js'),
    ('usa/contact/index.html',         'Contact',  'contact-list.html',   'contact-list.js'),
    ('usa/contact/detail/index.html',  'Contact',  'contact-detail.html', 'contact-detail.js'),
]

if __name__ == '__main__':
    for out, title, body, js in PAGES:
        p, n = build(out, title, frag(body), script=frag(js))
        print('  %-40s %4d KB' % (out, n // 1024))
