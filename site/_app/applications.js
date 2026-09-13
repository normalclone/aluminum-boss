/* Applications: the theme's core-tabs + core-slider, filled from /_data/applications.json.
 *
 * The theme ships the CSS for both components and a SliderHorizontal class that wraps
 * KeenSlider, but the tab-switching script that fed it was server-rendered - the tab bar
 * fetched a fresh slider over ajax for every tab. There is no server here, so the tabs are
 * switched below and the slides for the chosen tab are written into the one slider element.
 *
 * That is deliberate rather than incidental: KeenSlider measures its track when it is created,
 * and a slider built inside a display:none panel measures zero and never recovers. Keeping a
 * single, always-visible track and swapping its children avoids the problem entirely, and
 * SliderHorizontal already watches its own children with a MutationObserver and calls
 * slider.update() when they change - which is exactly the hook the ajax version used.
 */
(function () {
  'use strict';
  if (!window.AB) return;

  var tabsEl = document.getElementById('abap-tablist');
  var sliderEl = document.getElementById('abap-slider');
  var arrowsEl = document.getElementById('abap-arrows');
  if (!tabsEl || !sliderEl) return;

  var TABS = [], current = -1, driver = null;

  function text(id, s) {
    var el = document.getElementById(id);
    if (el && s) el.textContent = s;
  }

  // A card is a photograph with a name at the top and a line of description at the bottom;
  // the theme's gradient darkens exactly those two bands, so the text stays legible whatever
  // the picture turns out to be.
  //
  // The placeholder is labelled with the tab, not the card. Labelling it with the card title
  // printed that title twice - small and white at the top, then huge and grey across the
  // middle - and the second copy was the loudest thing on the card. The tab name still tells
  // whoever shoots the photograph which family of picture belongs here, without repeating
  // anything the card already says.
  function slide(item, i, label) {
    var src = item.image ? AB.root() + '_media/' + item.image
                         : AB.ph(480, 640, label);
    return '<div class="core-slider__slide keen-slider__slide number-slide-' + i + '">' +
             '<img class="core-slider__slide__image" src="' + AB.esc(src) +
               '" alt="" loading="lazy">' +
             '<div class="core-slider__slide__filter"></div>' +
             '<div class="core-slider__slide__card-body">' +
               '<div class="core-slider__slide__card-body__block">' +
                 '<h3 class="core-slider__slide__card-body__name font-16">' +
                   AB.esc(item.title) + '</h3>' +
               '</div>' +
               '<div class="core-slider__slide__card-body__block">' +
                 '<p class="core-slider__slide__card-body__description">' +
                   AB.esc(item.text) + '</p>' +
               '</div>' +
             '</div>' +
           '</div>';
  }

  // The tag strip scrolls sideways on a narrow screen. Nudging it by hand rather than calling
  // scrollIntoView keeps the page itself still - scrollIntoView on a tab that is off to the
  // right also drags the whole document.
  function reveal(el) {
    var l = el.offsetLeft, r = l + el.offsetWidth;
    if (l < tabsEl.scrollLeft) tabsEl.scrollLeft = l - 12;
    else if (r > tabsEl.scrollLeft + tabsEl.clientWidth) {
      tabsEl.scrollLeft = r - tabsEl.clientWidth + 12;
    }
  }

  function select(i, focus) {
    if (i < 0 || i >= TABS.length) return;
    var items = tabsEl.children;
    for (var n = 0; n < items.length; n++) {
      var on = n === i;
      items[n].className = 'core-tabs__nav__tags-item font-15 font-light' + (on ? ' active' : '');
      items[n].setAttribute('aria-selected', on ? 'true' : 'false');
      items[n].setAttribute('tabindex', on ? '0' : '-1');
    }
    if (i !== current) {
      // Lan dau, may chu da dat san the cua tab dau tien - dung ve de len.
      var firstPaint = current === -1;
      current = i;
      sliderEl.setAttribute('aria-labelledby', 'abap-tab-' + TABS[i].id);
      if (!firstPaint || !sliderEl.firstElementChild) sliderEl.innerHTML = TABS[i].items.map(function (item, n) {
        return slide(item, n, TABS[i].label);
      }).join('');
      if (driver && driver.reset) driver.reset();
    }
    if (focus && items[i]) { items[i].focus(); reveal(items[i]); }
  }

  function onKey(e) {
    var k = e.key, i = current;
    if (k === 'ArrowRight' || k === 'ArrowDown') i = (current + 1) % TABS.length;
    else if (k === 'ArrowLeft' || k === 'ArrowUp') i = (current + TABS.length - 1) % TABS.length;
    else if (k === 'Home') i = 0;
    else if (k === 'End') i = TABS.length - 1;
    else if (k === 'Enter' || k === ' ') i = +e.target.getAttribute('data-index');
    else return;
    e.preventDefault();
    select(i, true);
  }

  /* The arrows are <span>s in the theme's markup, so they need the keyboard wiring a button
   * would have given us for nothing. SliderHorizontal binds their click, so firing a click is
   * enough for both the real slider and the fallback below. */
  function arrowKeys() {
    if (!arrowsEl) return;
    var a = arrowsEl.getElementsByTagName('span');
    for (var n = 0; n < a.length; n++) {
      a[n].addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.click(); }
      });
    }
  }

  /* Used when the theme's slider is not on the page - the section still has to work, so the
   * track becomes an ordinary scroll container and the arrows page it by one card. Inline
   * styles because .core-slider.keen-slider wins on specificity against anything else we
   * could add, and because this file is not allowed to ship CSS. */
  function fallback() {
    sliderEl.style.display = 'flex';
    sliderEl.style.gap = '16px';
    sliderEl.style.overflowX = 'auto';
    sliderEl.style.overflowY = 'hidden';
    sliderEl.style.scrollSnapType = 'x mandatory';
    sliderEl.style.webkitOverflowScrolling = 'touch';

    function size() {
      var per = window.innerWidth <= 600 ? 1.1 : (window.innerWidth <= 1024 ? 2.2 : 3);
      var w = (sliderEl.clientWidth - 16 * (Math.ceil(per) - 1)) / per;
      var s = sliderEl.children;
      for (var n = 0; n < s.length; n++) {
        s[n].style.flex = '0 0 ' + Math.floor(w) + 'px';
        s[n].style.scrollSnapAlign = 'start';
      }
      return w;
    }
    function page(dir) {
      sliderEl.scrollLeft += dir * (size() + 16);
    }
    if (arrowsEl) {
      var l = arrowsEl.querySelector('.arrow-link__left');
      var r = arrowsEl.querySelector('.arrow-link__right');
      if (l) l.addEventListener('click', function () { page(-1); });
      if (r) r.addEventListener('click', function () { page(1); });
    }
    window.addEventListener('resize', size);
    driver = { reset: function () { sliderEl.scrollLeft = 0; size(); } };
    size();
  }

  // The theme's class is declared with `class`, so it is a global binding rather than a
  // property of window - hence the bare typeof, guarded in case the file was pruned away.
  function haveTheme() {
    try {
      return typeof KeenSlider !== 'undefined' && typeof SliderHorizontal !== 'undefined';
    } catch (e) { return false; }
  }

  /* The theme's two slider scripts are tagged defer on the home page while this file is not,
   * so they are guaranteed to have run by DOMContentLoaded and not a moment before. The JSON
   * fetch usually outlasts them anyway, but "usually" is how a cached response ends up
   * deciding whether the section gets a slider, so wait for the event rather than the race. */
  function start() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start);
      return;
    }
    if (!haveTheme()) { fallback(); return; }
    try {
      window.abApplicationsSlider = new SliderHorizontal({
        id: 'abap',
        sliderSelector: '#abap-slider',
        navigationSelector: '#abap-arrows',
        dotsSelector: null,
        numItems: 3,
        numItemsTablet: 2.2,
        numItemsMobile: 1.1,
        hasLightshow: false,
        hasModal: false,
        spacing: 16,
        spacingTablet: 16,
        spacingMobile: 8,
        loop: false,
        ajaxUrl: null
      });
      // SliderHorizontal's own MutationObserver calls update() when the slides change, so a
      // tab switch needs nothing extra here.
      driver = { reset: function () {} };
    } catch (e) {
      if (window.console) console.error(e);
      fallback();
    }
  }

  AB.load('applications').then(function (d) {
    text('abap-eyebrow', d.eyebrow);
    text('abap-heading', d.heading);
    text('abap-intro', d.intro);

    TABS = d.tabs || [];
    if (!TABS.length) return;

    if (!tabsEl.firstElementChild) tabsEl.innerHTML = TABS.map(function (t, i) {
      return '<li class="core-tabs__nav__tags-item font-15 font-light" role="tab"' +
               ' id="abap-tab-' + AB.esc(t.id) + '" data-index="' + i + '"' +
               ' aria-controls="abap-slider" aria-selected="false" tabindex="-1">' +
               AB.esc(t.label) + '</li>';
    }).join('');

    tabsEl.addEventListener('click', function (e) {
      var li = e.target;
      while (li && li !== tabsEl && li.getAttribute && !li.hasAttribute('data-index')) {
        li = li.parentNode;
      }
      if (li && li.hasAttribute && li.hasAttribute('data-index')) {
        select(+li.getAttribute('data-index'), true);
      }
    });
    tabsEl.addEventListener('keydown', onKey);
    arrowKeys();

    select(0, false);
    start();
  }).catch(function (e) {
    AB.fail(document.getElementById('abap-tabs') || sliderEl, e);
  });
}());
