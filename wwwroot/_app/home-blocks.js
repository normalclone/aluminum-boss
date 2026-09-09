/* The homepage sections below the factory map.
 *
 * Every one is drawn from the same JSON the corresponding section page uses, so the homepage
 * cannot drift out of step with what it is advertising - adding a product family or a project
 * album updates the homepage without anyone remembering to.
 */
(function () {
  'use strict';
  if (!window.AB) return;

  var MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
               'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function el(id) { return document.getElementById(id); }

  AB.load('products').then(function (d) {
    var t = el('abhb-products');
    if (!t) return;
    t.innerHTML = d.categories.map(function (c) {
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
    t.innerHTML = pick.slice(0, 10).map(function (c) {
      return '<a class="ab-swatch" href="colors/detail/?id=' + encodeURIComponent(c.id) + '">' +
               '<span class="ab-chip" style="background:' + AB.esc(c.hex) + '"></span>' +
               '<span class="ab-swatch-name">' + AB.esc(c.name) + '</span>' +
               '<span class="ab-swatch-meta">' + AB.esc(c.code) + '</span></a>';
    }).join('');
  }).catch(function () {});

  AB.load('projects').then(function (d) {
    var t = el('abhb-projects');
    if (!t) return;
    t.innerHTML = d.albums.slice()
      .sort(function (a, b) { return b.year - a.year; }).slice(0, 3)
      .map(function (a) {
        return '<a class="ab-card" href="projects/detail/?id=' + encodeURIComponent(a.id) + '">' +
                 '<img src="' + AB.ph(420, 300, a.title) + '" width="420" height="300" alt="' +
                   AB.esc(a.title) + '" loading="lazy">' +
                 '<h3>' + AB.esc(a.title) + '</h3>' +
                 '<p class="ab-card-spec">' + AB.esc(a.year + ' · ' + a.location) + '</p>' +
                 '<p>' + AB.esc(a.scope) + '</p></a>';
      }).join('');
  }).catch(function () {});

  AB.load('news').then(function (d) {
    var t = el('abhb-news');
    if (!t) return;
    t.innerHTML = d.items.slice()
      .sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 3)
      .map(function (a) {
        var p = a.date.split('-');
        return '<a class="ab-card" href="news/detail/?id=' + encodeURIComponent(a.id) + '">' +
                 '<img src="' + AB.ph(420, 280, a.title) + '" width="420" height="280" alt="' +
                   AB.esc(a.title) + '" loading="lazy">' +
                 '<h3>' + AB.esc(a.title) + '</h3>' +
                 '<p class="ab-card-spec">' + (+p[2]) + ' ' + MONTH[+p[1] - 1] + ' ' + p[0] + '</p>' +
                 '<p>' + AB.esc(a.excerpt) + '</p></a>';
      }).join('');
  }).catch(function () {});
}());
