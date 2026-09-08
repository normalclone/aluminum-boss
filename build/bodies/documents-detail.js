(function () {
  var el = document.getElementById('ab-detail');

  AB.load('documents').then(function (data) {
    var want = AB.qs('id'), d = null, cat = null;
    data.categories.forEach(function (c) {
      c.items.forEach(function (x) {
        if (x.id === want) { d = x; cat = c; }
      });
    });
    if (!d) { cat = data.categories[0]; d = cat.items[0]; }
    AB.title(d.title + ' — Documents');

    var file = AB.root() + '_docs/' + d.id + '.pdf';
    var rows = [['Reference', d.id.toUpperCase()], ['Type', cat.name], ['Edition', d.edition],
                ['Language', d.lang], ['Pages', d.pages], ['Format', 'PDF']]
      .map(function (r) {
        return '<div class="ab-spec"><dt>' + AB.esc(r[0]) + '</dt><dd>' + AB.esc(r[1]) +
               '</dd></div>';
      }).join('');

    var siblings = cat.items.filter(function (x) { return x.id !== d.id; })
      .map(function (x) {
        return '<a class="ab-doc-mini" href="?id=' + encodeURIComponent(x.id) + '">' +
                 '<span class="ab-doc-icon" aria-hidden="true">PDF</span>' +
                 '<span><span class="ab-doc-title">' + AB.esc(x.title) + '</span>' +
                 '<span class="ab-doc-meta">' + AB.esc(x.edition) + ' &middot; ' +
                   x.pages + ' pages</span></span></a>';
      }).join('');

    el.innerHTML =
      '<div class="ab-wrap">' +
        '<p class="ab-crumb"><a href="../">Documents</a> &nbsp;/&nbsp; ' + AB.esc(cat.name) + '</p>' +
        '<h1 class="ab-title ab-article-title">' + AB.esc(d.title) + '</h1>' +
        '<p class="ab-tagline">' + AB.esc(d.blurb) + '</p>' +
        '<div class="ab-docactions">' +
          '<a class="ab-submit" href="' + file + '" download>Download PDF</a>' +
          '<a class="ab-plain" href="' + file + '" target="_blank" rel="noopener">' +
            'Open in a new tab</a>' +
        '</div>' +
        '<dl class="ab-specs">' + rows + '</dl>' +
        '<div class="ab-preview">' +
          '<object data="' + file + '" type="application/pdf">' +
            '<p class="ab-preview-fallback">Your browser will not display a PDF inline. ' +
              '<a href="' + file + '" download>Download the file</a> instead.</p>' +
          '</object>' +
        '</div>' +
        (siblings ? '<div class="ab-items"><h2>Also in ' + AB.esc(cat.name.toLowerCase()) +
          '</h2><div class="ab-docminis">' + siblings + '</div></div>' : '') +
      '</div>';
  }).catch(function (e) { AB.fail(el, e); });
}());
