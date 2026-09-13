/* The homepage sections below the factory map.
 *
 * Every one is a SHELF: /_data/home-products.json, home-colors.json and home-projects.json are
 * lists of ids saying which library items this page shows and in what order. What each card says
 * lives in the library it points at - products.json, colors.json, projects.json - written once,
 * so the homepage cannot drift out of step with what it is advertising.
 *
 * An empty or missing shelf is not an empty band. Each one falls back to the rule that chose
 * before shelves existed - every family, one finish per family filled to ten, the three newest
 * albums - so a tree without these files draws exactly the page it always drew. The server does
 * the same thing in SectionRenderer; both are the same arrangement written twice, because the
 * server composes the site it serves and this file draws the static copy of it.
 */
(function () {
  'use strict';
  if (!window.AB) return;

  function el(id) { return document.getElementById(id); }

  /** Draws a band once its shelf has answered, and never over markup the server already wrote. */
  function band(id, library, array, shelf, otherwise, draw, extra) {
    AB.load(library).then(function (d) {
      var t = el(id);
      if (!t) return;
      if (extra) extra(d);
      return AB.shelf(shelf, d[array], otherwise).then(function (picked) {
        if (!t.firstElementChild) t.innerHTML = picked.items.map(draw).join('');
      });
    }).catch(function () {});
  }

  band('abhb-products', 'products', 'categories', 'home-products',
    function (all) { return all; },
    function (c) {
      return '<a class="ab-tile" href="products/' + AB.href(c) + '">' +
               '<span class="ab-thumb"><img src="' +
                 (c.image ? AB.root() + '_media/' + c.image : AB.ph(340, 300, c.name)) +
                 '" width="340" height="300" alt="' + AB.esc(c.name) + '" loading="lazy"></span>' +
               '<h3>' + AB.esc(c.name) + '</h3>' +
               '<p>' + AB.esc(c.tagline) + '</p></a>';
    });

  band('abhb-colors', 'colors', 'items', 'home-colors',
    // one from each finish family, so the strip reads as a range rather than a shade card
    function (all) {
      var seen = {}, pick = [];
      all.forEach(function (c) { if (!seen[c.family]) { seen[c.family] = 1; pick.push(c); } });
      all.forEach(function (c) { if (pick.length < 10 && pick.indexOf(c) < 0) pick.push(c); });
      return pick.slice(0, 10);
    },
    function (c) {
      // A finish is a surface, not a flat colour. The hex stays as the fallback, but next to
      // photographed surfaces a plain chip reads as an empty box - so use the photograph
      // when there is one.
      var chip = c.image
        ? '<span class="ab-chip"><img src="' + AB.root() + '_media/' + AB.esc(c.image) +
          '" alt="" loading="lazy"></span>'
        : '<span class="ab-chip" style="background:' + AB.esc(c.hex) + '"></span>';
      return '<a class="ab-swatch" href="colors/' + AB.href(c) + '">' +
               chip +
               '<span class="ab-swatch-name">' + AB.esc(c.name) + '</span>' +
               '<span class="ab-swatch-meta">' + AB.esc(c.code) + '</span></a>';
    },
    function (d) {
      var intro = el('abhb-colors-intro');
      if (intro) intro.textContent = d.intro;
    });

  band('abhb-projects', 'projects', 'albums', 'home-projects',
    function (all) {
      return all.slice().sort(function (a, b) { return b.year - a.year; }).slice(0, 3);
    },
    function (a) {
      return '<a class="ab-card" href="projects/' + AB.href(a) + '">' +
               '<img src="' + (a.image ? AB.root() + '_media/' + a.image
                                        : AB.ph(420, 300, a.title)) + '" width="420" height="300" alt="' +
                 AB.esc(a.title) + '" loading="lazy">' +
               '<h3>' + AB.esc(a.title) + '</h3>' +
               '<p class="ab-card-spec">' + AB.esc(a.year + ' · ' + a.location) + '</p>' +
               '<p>' + AB.esc(a.scope) + '</p></a>';
    });

}());
