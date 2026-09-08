(function () {
  var nav = document.getElementById('ab-nav');
  var el = document.getElementById('ab-detail');

  AB.load('about').then(function (d) {
    var want = AB.qs('id'), c = null, at = 0;
    for (var i = 0; i < d.chapters.length; i++) {
      if (d.chapters[i].id === want) { c = d.chapters[i]; at = i; break; }
    }
    if (!c) { c = d.chapters[0]; at = 0; }
    AB.title(c.name + ' — About us');

    nav.innerHTML = '<div class="ab-wrap ab-chapbar">' + d.chapters.map(function (x, i) {
      return '<a class="ab-chap' + (x.id === c.id ? ' is-on' : '') + '" href="?id=' +
             encodeURIComponent(x.id) + '"><span class="ab-chap-n">' +
             ('0' + (i + 1)).slice(-2) + '.</span>' + AB.esc(x.name) + '</a>';
    }).join('') + '</div>';

    var prev = at > 0 ? d.chapters[at - 1] : null;
    var next = at < d.chapters.length - 1 ? d.chapters[at + 1] : null;
    var step = function (x, label, cls) {
      return x ? '<a class="ab-step ' + cls + '" href="?id=' + encodeURIComponent(x.id) + '">' +
                 '<span>' + label + '</span>' + AB.esc(x.title) + '</a>' : '<span></span>';
    };

    el.innerHTML =
      '<div class="ab-wrap">' +
        '<p class="ab-crumb"><a href="../">About us</a> &nbsp;/&nbsp; ' + AB.esc(c.name) + '</p>' +
        '<h1 class="ab-title ab-article-title">' + AB.esc(c.title) + '</h1>' +
        '<p class="ab-tagline">' + AB.esc(c.lede) + '</p>' +
        '<div class="ab-hero"><img src="' + AB.ph(1240, 520, c.name) +
          '" width="1240" height="520" alt="' + AB.esc(c.name) + '"></div>' +
        '<div class="ab-article">' +
          c.body.map(function (p) { return '<p>' + AB.esc(p) + '</p>'; }).join('') +
        '</div>' +
        '<nav class="ab-steps">' + step(prev, 'Previous', 'is-prev') +
          step(next, 'Next', 'is-next') + '</nav>' +
      '</div>';
  }).catch(function (e) { AB.fail(el, e); });
}());
