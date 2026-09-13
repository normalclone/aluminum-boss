// The pages every tool measures, and the sections of the home page.
//
// One list, so a page added to the site cannot be measured by the crawler and missed by the
// pixel comparison.

/** All 15 pages, with a representative id for each detail template. */
const PAGES = [
  '/',
  '/about-us/', '/about-us/detail/?id=history',
  '/products/', '/products/detail/?id=facade',
  '/colors/', '/colors/detail/?id=an-dark-bronze',
  '/documents/', '/documents/detail/?id=td-thermal',
  '/projects/', '/projects/detail/?id=marina-central-tower',
  '/news/', '/news/detail/?id=press-line-2500',
  '/contact/', '/contact/detail/?id=quote',
];

/** Home-page sections, top to bottom, with the selector that finds each one. */
const SECTIONS = [
  ['hero',         '.abhero'],
  ['globe',        '.vgx'],
  ['factories',    '.vfx'],
  ['highlights',   '.ab-nov'],
  ['products',     '#abhb-products'],
  ['applications', '.ab-applications'],
  ['colors',       '#abhb-colors'],
  ['feature',      '#abfc'],
  ['projects',     '#abhb-projects'],
  ['gallery',      '.abgal'],
  ['cta',          '.abhb-cta'],
];

/** Widths worth checking. 390 is the phone the layout was designed down to. */
const WIDTHS = [1440, 834, 390];

/** Turns a page path into a filename-safe slug. */
const slug = p => p.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'home';

module.exports = { PAGES, SECTIONS, WIDTHS, slug };
