(function () {
  var bands = document.getElementById('ab-bands');
  AB.load('products').then(function (d) {
    document.getElementById('ab-intro').textContent = d.intro;
    bands.innerHTML = d.categories.map(function (c) {
      var tiles = c.items.map(function (it) {
        return '<a class="ab-tile" href="detail/?id=' + encodeURIComponent(c.id) +
               '#' + encodeURIComponent(it.id) + '">' +
                 '<span class="ab-thumb"><img src="' + AB.ph(340, 300, it.name) +
                   '" width="340" height="300" alt="' + AB.esc(it.name) + '" loading="lazy"></span>' +
                 '<h3>' + AB.esc(it.name) + '</h3>' +
                 '<p>' + AB.esc(it.spec) + '</p>' +
               '</a>';
      }).join('');
      return '<section class="ab-band">' +
               '<div class="ab-band-head">' +
                 '<h2>' + AB.esc(c.name) + '</h2>' +
                 '<a class="ab-more" href="detail/?id=' + encodeURIComponent(c.id) + '">' +
                   AB.esc(c.items.length) + ' products</a>' +
               '</div>' +
               '<p class="ab-band-sub">' + AB.esc(c.tagline) + '</p>' +
               '<div class="ab-row">' + tiles + '</div>' +
             '</section>';
    }).join('');
  }).catch(function (e) { AB.fail(bands, e); });
}());
