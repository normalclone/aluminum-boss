import io, os
from build import build, frag

PAGES = [
    ('products/index.html',        'Products', 'products-list.html',  'products-list.js'),
    ('products/detail/index.html', 'Products', 'products-detail.html','products-detail.js'),
    ('colors/index.html',          'Colors',   'colors-list.html',    'colors-list.js'),
    ('colors/detail/index.html',   'Colors',   'colors-detail.html',  'colors-detail.js'),
    ('news/index.html',            'News',     'news-list.html',      'news-list.js'),
    ('news/detail/index.html',     'News',     'news-detail.html',    'news-detail.js'),
    ('about-us/index.html',        'About us', 'about-list.html',     'about-list.js'),
    ('about-us/detail/index.html', 'About us', 'about-detail.html',   'about-detail.js'),
    ('contact/index.html',         'Contact',  'contact-list.html',   'contact-list.js'),
    ('contact/detail/index.html',  'Contact',  'contact-detail.html', 'contact-detail.js'),
    ('projects/index.html',        'Projects', 'projects-list.html',  'projects-list.js'),
    ('projects/detail/index.html', 'Projects', 'projects-detail.html','projects-detail.js'),
    ('documents/index.html',        'Documents','documents-list.html', 'documents-list.js'),
    ('documents/detail/index.html', 'Documents','documents-detail.html','documents-detail.js'),
]

if __name__ == '__main__':
    for out, title, body, js in PAGES:
        p, n = build(out, title, frag(body), script=frag(js))
        print('  %-40s %4d KB' % (out, n // 1024))
