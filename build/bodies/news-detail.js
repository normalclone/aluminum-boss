(function () {
  var el = document.getElementById('ab-detail');
  var MONTH = ['January', 'February', 'March', 'April', 'May', 'June',
               'July', 'August', 'September', 'October', 'November', 'December'];

  function longDate(iso) {
    var p = iso.split('-');
    return +p[2] + ' ' + MONTH[+p[1] - 1] + ' ' + p[0];
  }

  AB.load('news').then(function (d) {
    var want = AB.qs('id'), a = null;
    for (var i = 0; i < d.items.length; i++) {
      if (d.items[i].id === want) { a = d.items[i]; break; }
    }
    if (!a) a = d.items[0];
    AB.title(a.title);

    var more = d.items.filter(function (x) { return x.id !== a.id; })
      .sort(function (x, y) { return x.date < y.date ? 1 : -1; }).slice(0, 3)
      .map(function (x) {
        return '<a class="ab-card" href="?id=' + encodeURIComponent(x.id) + '">' +
                 '<img src="' + AB.ph(400, 260, x.title) + '" width="400" height="260" alt="' +
                   AB.esc(x.title) + '" loading="lazy">' +
                 '<h3>' + AB.esc(x.title) + '</h3>' +
                 '<p class="ab-card-spec">' + longDate(x.date) + '</p></a>';
      }).join('');

    el.innerHTML =
      '<div class="ab-wrap">' +
        '<p class="ab-crumb"><a href="../">News</a> &nbsp;/&nbsp; ' +
          a.tags.map(AB.esc).join(' &middot; ') + '</p>' +
        '<h1 class="ab-title ab-article-title">' + AB.esc(a.title) + '</h1>' +
        '<p class="ab-post-meta">' + longDate(a.date) + ' &nbsp;|&nbsp; Written by: ' +
          AB.esc(a.author) + '</p>' +
        '<div class="ab-hero"><img src="' + AB.ph(1240, 560, a.title) +
          '" width="1240" height="560" alt="' + AB.esc(a.title) + '"></div>' +
        '<div class="ab-article">' +
          '<p class="ab-standfirst">' + AB.esc(a.excerpt) + '</p>' +
          a.body.map(function (p) { return '<p>' + AB.esc(p) + '</p>'; }).join('') +
        '</div>' +
        '<div class="ab-items"><h2>More news</h2><div class="ab-grid">' + more + '</div></div>' +
      '</div>';
  }).catch(function (e) { AB.fail(el, e); });
}());
