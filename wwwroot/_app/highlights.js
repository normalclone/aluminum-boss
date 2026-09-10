/* The "New" slider on the homepage.
 *
 * Same shape as the other homepage sections: the cards come from /_data/highlights.json, so
 * announcing something new is a JSON edit rather than an HTML one. The markup below is the
 * theme's own core-slider-novedades component, class for class, so the theme stylesheet
 * dresses it and nothing new has to be written for the card itself.
 *
 * Driven by the theme's SliderNovedades class when it is on the page. That class is declared
 * with `class`, not assigned to window, so it is reachable as a bare identifier only - hence
 * the typeof guards. If either it or KeenSlider is missing the cards still work as a plain
 * scroll-snap strip, because a strip that cannot be dragged is a smaller failure than six
 * full-width cards stacked on top of one another.
 */
(function () {
  'use strict';
  if (!window.AB) return;

  // The theme keys its own layout rules off id prefixes - [id^=slider-nav-], [id^=prev-btn-]
  // and so on - so these names are not free choices. Renaming them silently drops the nav out
  // of the flow and back onto the absolutely positioned fallback rule.
  var SLIDER = 'slider-abnov';
  var NAV = 'slider-nav-abnov';
  var PREV = 'prev-btn-abnov';
  var NEXT = 'next-btn-abnov';
  var COUNT = 'page-count-abnov';
  var BAR = 'progress-bar-abnov';
  var WRAP = 'ab-nov-wrap';

  // The card is 6:5 by the theme's own aspect-ratio rule, so the placeholder is cut to match
  // and does not letterbox inside its own frame.
  var IMG_W = 444, IMG_H = 370;

  // The blurred-glass "+" from the theme, minus its foreignObject/clipPath pair: those carry a
  // document-wide id, and six copies of one id on a page is five broken references.
  var PLUS =
    '<svg width="44" height="44" viewBox="0 0 44 44" fill="none" ' +
      'xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<rect width="44" height="44" rx="22" fill="white" fill-opacity="0.4"></rect>' +
      '<path d="M22 15L22 29" stroke="white" stroke-miterlimit="10"></path>' +
      '<path d="M29 22L15 22" stroke="white" stroke-miterlimit="10"></path>' +
    '</svg>';

  function el(id) { return document.getElementById(id); }

  function slide(it, i) {
    // The placeholder goes in unlabelled. AB.ph's label is normally the only clue to what
    // belongs in the hole, but here the card already prints the family and the headline over
    // the image in white - passing either to AB.ph draws the same words a second time in grey
    // down the middle of the card, and with the headline it lands straight through them. The
    // spec line alone still says "placeholder" and still gives the crop.
    var src = it.image ? AB.root() + '_media/' + it.image : AB.ph(IMG_W, IMG_H, '');
    return '<div class="core-slider-novedades__slide keen-slider__slide number-slide-' + i + '">' +
             '<a class="core-slider-novedades__slide__container" href="' +
               AB.esc(AB.root() + it.href) + '">' +
               '<div class="shadow"></div>' +
               '<img class="core-slider-novedades__slide__image" src="' + AB.esc(src) +
                 '" width="' + IMG_W + '" height="' + IMG_H + '" alt="' + AB.esc(it.title) +
                 '" loading="lazy">' +
               // The theme's own top-and-bottom scrim. The .shadow div above it sits before
               // the image in the DOM and the image carries z-index:0, so .shadow is painted
               // under the photograph and does nothing on its own - the original section gets
               // away with that because its photographs are dark. Ours are not guaranteed to
               // be, and white type needs something behind it.
               '<div class="core-slider-novedades__slide__filter"></div>' +
               '<div class="core-slider-novedades__slide__card-body">' +
                 '<div class="core-slider-novedades__slide__card-body_top">' +
                   '<div class="core-slider-novedades__slide__card-body__logo">' +
                     '<p class="core-slider-novedades__logo">' + AB.esc(it.label) + '</p>' +
                   '</div>' +
                   '<div class="cos-novedades__enlace">' +
                     '<h3 class="core-slider-novedades__slide__card-body__name font-display-sm uppercase">' +
                       AB.esc(it.title) + '</h3>' +
                   '</div>' +
                 '</div>' +
                 '<div class="extra">' + PLUS + '</div>' +
               '</div>' +
             '</a>' +
           '</div>';
  }

  // Full bleed without 100vw. The theme bleeds this section with calc(-50vw + 50%), and 100vw
  // counts the scrollbar the page is already showing, so on a scrolling page that is about
  // 15px wider than the viewport and the whole document gains a sideways scrollbar. Measuring
  // the wrapper's own distance to each viewport edge gets the same edge-to-edge result and
  // cannot overshoot. Re-measured on resize because the container is fluid.
  function bleed() {
    var w = el(WRAP);
    if (!w) return;
    w.style.marginLeft = '0px';
    w.style.marginRight = '0px';
    var r = w.getBoundingClientRect();
    var vw = document.documentElement.clientWidth;
    w.style.marginLeft = '-' + Math.max(0, Math.round(r.left)) + 'px';
    w.style.marginRight = '-' + Math.max(0, Math.round(vw - r.right)) + 'px';
  }

  function start() {
    if (typeof KeenSlider !== 'undefined' && typeof SliderNovedades !== 'undefined') {
      try {
        new SliderNovedades({
          id: 'ab-novedades',
          sliderSelector: '#' + SLIDER,
          navigationSelector: '#' + NAV,
          pageCountSelector: '#' + COUNT,
          progressBarSelector: '#' + BAR,
          numItems: 3,
          numItemsTablet: 1.6,
          numItemsMobile: 1.1,
          spacing: 16,
          spacingTablet: 16,
          spacingMobile: 8
        });
        return;
      } catch (e) {
        if (window.console) console.error(e);
      }
    }
    fallback();
  }

  // Plain overflow scroller. keen-slider's stylesheet lays the track out as a flex row with
  // overflow hidden and expects the script to translate it, so leaving it alone when the
  // script is missing hides every card after the first.
  function fallback() {
    var t = el(SLIDER);
    if (!t) return;
    t.className = 'ab-nov-fallback';

    var prev = el(PREV), next = el(NEXT), bar = el(BAR), count = el(COUNT);

    function pages() {
      var w = t.clientWidth || 1;
      return Math.max(1, Math.ceil((t.scrollWidth - 1) / w));
    }
    function page() {
      var w = t.clientWidth || 1;
      return Math.min(pages(), Math.round(t.scrollLeft / w) + 1);
    }
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function sync() {
      var c = page(), n = pages();
      if (count) count.textContent = pad(c) + '/' + pad(n);
      if (bar) bar.style.width = (c / n * 100) + '%';
      if (prev) {
        prev.style.opacity = c === 1 ? 0.3 : 1;
        prev.className = 'arrow-link__left p-2' + (c === 1 ? ' disabled' : '');
      }
      if (next) {
        next.style.opacity = c >= n ? 0.3 : 1;
        next.className = 'arrow-link__right p-2' + (c >= n ? ' disabled' : '');
      }
    }
    function go(dir) {
      t.scrollLeft += dir * (t.clientWidth || 0);
    }
    if (prev) prev.addEventListener('click', function () { go(-1); });
    if (next) next.addEventListener('click', function () { go(1); });
    t.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);
    sync();
  }

  AB.load('highlights').then(function (d) {
    var t = el(SLIDER);
    if (!t) return;

    var h = el('ab-nov-heading');
    if (h && d.heading) h.textContent = d.heading;

    var items = (d.items || []).slice(0, 6);
    t.innerHTML = items.map(slide).join('');

    bleed();
    window.addEventListener('resize', bleed);
    start();
  }).catch(function (e) {
    var t = el(SLIDER);
    if (t) AB.fail(t, e);
  });
}());
