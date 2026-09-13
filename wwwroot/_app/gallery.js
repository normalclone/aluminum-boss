/* The "Finished work" gallery on the home page.
 *
 * Markup is the theme's core-header + core-gallery, so the component CSS already linked on the
 * page does the styling. The theme's own CoreGallery class is not used: it builds a KeenSlider
 * and fetches the tag panels from wp-admin-ajax, neither of which exists here. What it did that
 * we do want - lightGallery over .core-gallery__content__item__image, with zoom and thumbnails -
 * is reproduced below with the same options.
 *
 * Tiles carry no real photographs yet, so both the thumbnail and the lightbox entry are AB.ph
 * placeholders: a square crop on the tile, a 3:2 frame in the lightbox, which is the shape the
 * photograph should actually be shot in.
 */
(function () {
  'use strict';
  if (!window.AB) return;

  var SECTION = 'bossgal';
  var THUMB_W = 640, THUMB_H = 640;          // the tile is aspect-ratio 1/1
  var FULL_W = 1800, FULL_H = 1200;          // what the photograph should be

  var section = document.getElementById('section-gallery-' + SECTION);
  if (!section) return;

  var itemsEl = document.getElementById('abgal-items');
  var tagsEl = document.getElementById('abgal-tags');
  var selectedEl = document.getElementById('abgal-selected');

  var data = null, active = 'all', lg = null;

  // Labelled with the category, not the caption. The tile already carries the caption in white
  // along its bottom edge, and repeating it in the middle of the same tile said everything
  // twice - which is what a placeholder is least able to get away with, since it is standing in
  // for the one part of the tile that should be doing the talking.
  function src(item, w, h) {
    if (item.image) return AB.root() + '_media/' + item.image;
    var tag = null;
    for (var i = 0; data && i < data.tags.length; i++) {
      if (data.tags[i].id === item.cat) { tag = data.tags[i].label; break; }
    }
    return AB.ph(w, h, tag || '');
  }

  // lightGallery reads data-sub-html as markup, so the caption and the description are escaped
  // here and only the wrapping tags are ours.
  function subHtml(item) {
    return '<h4>' + AB.esc(item.caption) + '</h4>' +
           '<p>' + AB.esc(item.description) + '</p>';
  }

  function tile(item) {
    return '<div class="core-gallery__content__item__image"' +
             ' data-src="' + src(item, FULL_W, FULL_H) + '"' +
             ' data-thumb="' + src(item, THUMB_W, THUMB_H) + '"' +
             ' data-sub-html="' + AB.esc(subHtml(item)) + '">' +
             '<div class="core-gallery__content__item__filter">' +
               '<div class="core-gallery__content__item__filter__cruz"></div>' +
               '<span class="abgal-cap">' + AB.esc(item.caption) + '</span>' +
             '</div>' +
             '<img class="core-gallery__thumb skip-lazy" src="' + src(item, THUMB_W, THUMB_H) +
               '" width="' + THUMB_W + '" height="' + THUMB_H + '" alt="' + AB.esc(item.caption) +
               '" draggable="false" loading="lazy">' +
           '</div>';
  }

  function visible() {
    return data.items.filter(function (i) { return active === 'all' || i.cat === active; });
  }

  function paint(first) {
    var list = visible();
    if (!first || !itemsEl.firstElementChild) itemsEl.innerHTML = list.length
      ? list.map(tile).join('')
      : '<p class="abgal-empty">Nothing under this heading yet.</p>';
    lightbox();
  }

  // Same options the theme used. lightGallery and its plugins are already on the page for the
  // project viewer and are loaded with defer, so they may not exist yet when this file runs
  // from the end of the body - hence the wait.
  function lightbox() {
    if (!window.lightGallery) return;
    if (lg) { try { lg.destroy(); } catch (e) {} lg = null; }
    var plugins = [];
    if (window.lgZoom) plugins.push(window.lgZoom);
    if (window.lgThumbnail) plugins.push(window.lgThumbnail);
    lg = window.lightGallery(section, {
      plugins: plugins,
      selector: '.core-gallery__content__item__image',
      showCloseIcon: true,
      loop: false,
      download: false,
      mobileSettings: { showCloseIcon: true }
    });
  }

  function waitForLg(tries) {
    if (window.lightGallery) { lightbox(); return; }
    if (tries <= 0) return;
    setTimeout(function () { waitForLg(tries - 1); }, 100);
  }

  function paintTags(first) {
    if (!first || !tagsEl.firstElementChild) tagsEl.innerHTML = data.tags.map(function (t, i) {
      return '<li class="core-gallery__nav__tags-item font-body-base font-normal' +
               (t.id === active ? ' active' : '') + '"' +
             ' data-index="' + i + '" data-value="' + AB.esc(t.id) + '"' +
             ' data-label="' + AB.esc(t.label) + '">' + AB.esc(t.label) + '</li>';
    }).join('');
  }

  function closeDropdown() {
    tagsEl.classList.remove('core-gallery__nav__tags--open');
    var arrow = selectedEl.querySelector('.core-gallery__nav__selected-tag__arrow');
    if (arrow) arrow.classList.remove('arrow-rotate');
  }

  function wire() {
    // Delegated: the list is redrawn whenever the active tag changes.
    tagsEl.addEventListener('click', function (e) {
      var li = e.target;
      while (li && li !== tagsEl && !/tags-item/.test(li.className || '')) li = li.parentNode;
      if (!li || li === tagsEl) return;
      active = li.getAttribute('data-value');
      var text = selectedEl.querySelector('.core-gallery__nav__selected-tag__text');
      if (text) text.textContent = li.getAttribute('data-label');
      closeDropdown();
      paintTags();
      paint();
    });

    // Below 1024px the theme hides the tag list and shows a one-line select instead; the
    // toggle for it lived in the theme's JS, so it is repeated here.
    selectedEl.addEventListener('click', function () {
      var open = tagsEl.classList.contains('core-gallery__nav__tags--open');
      tagsEl.classList.toggle('core-gallery__nav__tags--open', !open);
      var arrow = selectedEl.querySelector('.core-gallery__nav__selected-tag__arrow');
      if (arrow) arrow.classList.toggle('arrow-rotate', !open);
    });

    document.addEventListener('click', function (e) {
      if (!section.contains(e.target)) closeDropdown();
    });
  }

  AB.load('gallery').then(function (d) {
    data = d;
    var h = document.getElementById('abgal-heading');
    if (h && d.heading) h.textContent = d.heading;
    var intro = d.intro || [];
    var p1 = document.getElementById('abgal-intro-1');
    var p2 = document.getElementById('abgal-intro-2');
    if (p1) p1.textContent = intro[0] || '';
    if (p2) p2.textContent = intro[1] || '';

    paintTags(true);
    paint(true);
    wire();
    waitForLg(30);
  }).catch(function (e) {
    AB.fail(itemsEl, e);
  });
}());
