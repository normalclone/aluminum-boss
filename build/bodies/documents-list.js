(function () {
  var elC = document.getElementById('ab-cats');
  var elF = document.getElementById('ab-filters');
  var elN = document.getElementById('ab-count');
  var DATA = null, cat = '', lang = '';

  function row(d, c) {
    var href = 'detail/?id=' + encodeURIComponent(d.id);
    var file = AB.root() + '_docs/' + d.id + '.pdf';
    return '<div class="ab-doc">' +
             '<a class="ab-doc-main" href="' + href + '">' +
               '<span class="ab-doc-icon" aria-hidden="true">PDF</span>' +
               '<span class="ab-doc-text">' +
                 '<span class="ab-doc-title">' + AB.esc(d.title) + '</span>' +
                 '<span class="ab-doc-blurb">' + AB.esc(d.blurb) + '</span>' +
                 '<span class="ab-doc-meta">' + AB.esc(c.name) + ' &middot; ' +
                   AB.esc(d.edition) + ' &middot; ' + AB.esc(d.lang) + ' &middot; ' +
                   d.pages + ' pages</span>' +
               '</span>' +
             '</a>' +
             '<a class="ab-doc-dl" href="' + file + '" download>Download</a>' +
           '</div>';
  }

  function draw() {
    var shown = 0;
    elC.innerHTML = DATA.categories.map(function (c) {
      if (cat && c.id !== cat) return '';
      var items = c.items.filter(function (d) { return !lang || d.lang === lang; });
      if (!items.length) return '';
      shown += items.length;
      return '<section class="ab-doccat">' +
               '<div class="ab-doccat-head"><h2>' + AB.esc(c.name) + '</h2>' +
                 '<p>' + AB.esc(c.blurb) + '</p></div>' +
               '<div class="ab-docs">' + items.map(function (d) { return row(d, c); }).join('') +
               '</div></section>';
    }).join('') || '<p class="ab-empty">Nothing matches both filters.</p>';

    var total = DATA.categories.reduce(function (n, c) { return n + c.items.length; }, 0);
    elN.textContent = shown === total ? total + ' documents'
                                      : shown + ' of ' + total + ' documents';
    var bs = elF.querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) {
      var k = bs[i].getAttribute('data-k'), v = bs[i].getAttribute('data-v');
      var on = k === 'cat' ? cat : lang;
      bs[i].className = (on === v) ? 'is-on' : '';
    }
  }

  AB.load('documents').then(function (d) {
    DATA = d;
    document.getElementById('ab-intro').textContent = d.intro;
    document.getElementById('ab-note').textContent = d.note;

    var langs = [];
    d.categories.forEach(function (c) {
      c.items.forEach(function (x) {
        if (langs.indexOf(x.lang) < 0) langs.push(x.lang);
      });
    });

    function group(label, key, opts) {
      return '<div class="ab-filter"><span class="ab-filter-label">' + AB.esc(label) +
             '</span><div class="ab-filter-opts">' + opts.map(function (o) {
               return '<button type="button" data-k="' + key + '" data-v="' + AB.esc(o.v) + '">' +
                      AB.esc(o.t) + '</button>';
             }).join('') + '</div></div>';
    }

    elF.innerHTML =
      group('Type', 'cat', [{v: '', t: 'All'}].concat(d.categories.map(function (c) {
        return {v: c.id, t: c.name};
      }))) +
      group('Language', 'lang', [{v: '', t: 'All'}].concat(langs.map(function (l) {
        return {v: l, t: l};
      })));

    elF.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      if (b.getAttribute('data-k') === 'cat') cat = b.getAttribute('data-v');
      else lang = b.getAttribute('data-v');
      draw();
    });
    draw();
  }).catch(function (e) { AB.fail(elC, e); });
}());
