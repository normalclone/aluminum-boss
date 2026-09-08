(function () {
  var el = document.getElementById('ab-years');

  AB.load('projects').then(function (d) {
    document.getElementById('ab-intro').textContent = d.intro;

    // Grouped by completion year, newest first. The year is the organising idea the client
    // asked for, so it is a heading in the page rather than a filter you have to discover.
    var years = {};
    d.albums.forEach(function (a) { (years[a.year] = years[a.year] || []).push(a); });
    var order = Object.keys(years).sort(function (a, b) { return b - a; });

    el.innerHTML = order.map(function (y) {
      var n = years[y].length;
      var cards = years[y].map(function (a) {
        return '<a class="ab-album" href="detail/?id=' + encodeURIComponent(a.id) + '">' +
                 '<span class="ab-album-cover">' +
                   '<img src="' + AB.ph(760, 520, a.title) + '" width="760" height="520" alt="' +
                     AB.esc(a.title) + '" loading="lazy">' +
                   '<span class="ab-album-count">' + a.photos.length + ' photographs</span>' +
                 '</span>' +
                 '<h3>' + AB.esc(a.title) + '</h3>' +
                 '<p class="ab-album-where">' + AB.esc(a.location) + '</p>' +
                 '<p class="ab-album-scope">' + AB.esc(a.scope) + '</p>' +
               '</a>';
      }).join('');
      return '<section class="ab-year">' +
               '<div class="ab-year-head">' +
                 '<h2>' + AB.esc(y) + '</h2>' +
                 '<span>' + n + (n === 1 ? ' album' : ' albums') + '</span>' +
               '</div>' +
               '<div class="ab-albums">' + cards + '</div>' +
             '</section>';
    }).join('');
  }).catch(function (e) { AB.fail(el, e); });
}());
