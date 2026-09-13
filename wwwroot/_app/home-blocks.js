/* The homepage sections below the factory map.
 *
 * Every one is drawn from the same JSON the corresponding section page uses, so the homepage
 * cannot drift out of step with what it is advertising - adding a product family or a project
 * album updates the homepage without anyone remembering to.
 */
(function () {
  'use strict';
  if (!window.AB) return;

  function el(id) { return document.getElementById(id); }

  AB.load('products').then(function (d) {
    var t = el('abhb-products');
    if (!t) return;
    if (!t.firstElementChild) t.innerHTML = d.categories.map(function (c) {
      return '<a class="ab-tile" href="products/detail/?id=' + encodeURIComponent(c.id) + '">' +
               '<span class="ab-thumb"><img src="' +
                 (c.image ? AB.root() + '_media/' + c.image : AB.ph(340, 300, c.name)) +
                 '" width="340" height="300" alt="' + AB.esc(c.name) + '" loading="lazy"></span>' +
               '<h3>' + AB.esc(c.name) + '</h3>' +
               '<p>' + AB.esc(c.tagline) + '</p></a>';
    }).join('');
  }).catch(function () {});

  AB.load('colors').then(function (d) {
    var t = el('abhb-colors');
    if (!t) return;
    var intro = el('abhb-colors-intro');
    if (intro) intro.textContent = d.intro;
    // one from each finish family, so the strip reads as a range rather than a shade card
    var seen = {}, pick = [];
    d.items.forEach(function (c) {
      if (!seen[c.family]) { seen[c.family] = 1; pick.push(c); }
    });
    d.items.forEach(function (c) { if (pick.length < 10 && pick.indexOf(c) < 0) pick.push(c); });
    if (!t.firstElementChild) t.innerHTML = pick.slice(0, 10).map(function (c) {
      // A finish is a surface, not a flat colour. The hex stays as the fallback, but next to
      // photographed surfaces a plain chip reads as an empty box - so use the photograph
      // when there is one.
      var chip = c.image
        ? '<span class="ab-chip"><img src="' + AB.root() + '_media/' + AB.esc(c.image) +
          '" alt="" loading="lazy"></span>'
        : '<span class="ab-chip" style="background:' + AB.esc(c.hex) + '"></span>';
      return '<a class="ab-swatch" href="colors/detail/?id=' + encodeURIComponent(c.id) + '">' +
               chip +
               '<span class="ab-swatch-name">' + AB.esc(c.name) + '</span>' +
               '<span class="ab-swatch-meta">' + AB.esc(c.code) + '</span></a>';
    }).join('');
  }).catch(function () {});

  AB.load('projects').then(function (d) {
    var t = el('abhb-projects');
    if (!t) return;
    if (!t.firstElementChild) t.innerHTML = d.albums.slice()
      .sort(function (a, b) { return b.year - a.year; }).slice(0, 3)
      .map(function (a) {
        return '<a class="ab-card" href="projects/detail/?id=' + encodeURIComponent(a.id) + '">' +
                 '<img src="' + (a.image ? AB.root() + '_media/' + a.image
                                          : AB.ph(420, 300, a.title)) + '" width="420" height="300" alt="' +
                   AB.esc(a.title) + '" loading="lazy">' +
                 '<h3>' + AB.esc(a.title) + '</h3>' +
                 '<p class="ab-card-spec">' + AB.esc(a.year + ' · ' + a.location) + '</p>' +
                 '<p>' + AB.esc(a.scope) + '</p></a>';
      }).join('');
  }).catch(function () {});

}());
