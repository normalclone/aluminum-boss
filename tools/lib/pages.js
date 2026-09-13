// The pages every tool measures, and the sections of the home page.
//
// One list, so a page added to the site cannot be measured by the crawler and missed by the
// pixel comparison.

/**
 * All 15 pages: seven listings, one representative item page each, and the home page.
 *
 * The item pages carry their own path now. The query form they used to have still answers, with
 * a redirect, and redirects.js is what checks that - measuring here would hide behind it.
 */
const PAGES = [
  '/',
  '/about-us/', '/about-us/history/',
  '/products/', '/products/facade/',
  '/colors/', '/colors/an-dark-bronze/',
  '/documents/', '/documents/td-thermal/',
  '/projects/', '/projects/marina-central-tower/',
  '/news/', '/news/press-line-2500/',
  '/contact/', '/contact/quote/',
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
