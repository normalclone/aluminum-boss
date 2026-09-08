(function () {
  var el = document.getElementById('ab-detail');
  var view = document.getElementById('ab-viewer');
  var vImg = document.getElementById('ab-v-img');
  var vCap = document.getElementById('ab-v-cap');
  var vNum = document.getElementById('ab-v-count');
  var photos = [], at = 0, opener = null;

  function show(i) {
    at = (i + photos.length) % photos.length;
    var p = photos[at];
    vImg.src = AB.ph(1600, 1060, p.c);
    vImg.alt = p.c;
    vCap.textContent = p.c;
    vNum.textContent = (at + 1) + ' / ' + photos.length;
  }

  function open(i, from) {
    opener = from || null;
    view.hidden = false;
    // Locking the page removes the scrollbar, and everything behind would jump sideways by its
    // width. The theme used to hold that space open permanently with scrollbar-gutter, which
    // left an empty strip down the right of every full-bleed section; the gutter is gone, so
    // the width is given back here for as long as the viewer is up.
    var bar = window.innerWidth - document.documentElement.clientWidth;
    if (bar > 0) document.body.style.paddingRight = bar + 'px';
    document.body.style.overflow = 'hidden';
    show(i);
    view.querySelector('.ab-v-close').focus();
  }

  function close() {
    view.hidden = true;
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    // send focus back to the thumbnail that opened it, or a keyboard user is dropped at the
    // top of the document with no idea where they were
    if (opener) opener.focus();
  }

  view.addEventListener('click', function (e) {
    if (e.target.closest('.ab-v-close') || e.target === view) return close();
    if (e.target.closest('.ab-v-prev')) return show(at - 1);
    if (e.target.closest('.ab-v-next')) return show(at + 1);
  });

  document.addEventListener('keydown', function (e) {
    if (view.hidden) return;
    if (e.key === 'Escape') { close(); }
    else if (e.key === 'ArrowLeft') { show(at - 1); }
    else if (e.key === 'ArrowRight') { show(at + 1); }
    else return;
    e.preventDefault();
  });

  AB.load('projects').then(function (d) {
    var want = AB.qs('id'), a = null;
    for (var i = 0; i < d.albums.length; i++) {
      if (d.albums[i].id === want) { a = d.albums[i]; break; }
    }
    if (!a) a = d.albums[0];
    AB.title(a.title + ' — Projects');
    photos = a.photos;

    var facts = [['Year', a.year], ['Location', a.location], ['Client', a.client],
                 ['Scope', a.scope], ['Products', a.products.join(', ')]]
      .map(function (r) {
        return '<div class="ab-spec"><dt>' + AB.esc(r[0]) + '</dt><dd>' + AB.esc(r[1]) +
               '</dd></div>';
      }).join('');

    // The opening frame runs the full width and the rest sit in a even three-column sheet;
    // the CSS sets the aspect ratios so the rows line up whatever the photograph is.
    var tiles = a.photos.map(function (p, i) {
      var w = i === 0 ? 1260 : 620, h = i === 0 ? 540 : 414;
      return '<button type="button" class="ab-shot" data-i="' + i + '">' +
               '<img src="' + AB.ph(w, h, p.c) + '" width="' + w + '" height="' + h +
                 '" alt="' + AB.esc(p.c) + '" loading="lazy">' +
               '<span class="ab-shot-cap">' + AB.esc(p.c) + '</span>' +
             '</button>';
    }).join('');

    var others = d.albums.filter(function (x) { return x.id !== a.id; })
      .sort(function (x, y) { return y.year - x.year; }).slice(0, 3).map(function (x) {
        return '<a class="ab-card" href="?id=' + encodeURIComponent(x.id) + '">' +
                 '<img src="' + AB.ph(400, 280, x.title) + '" width="400" height="280" alt="' +
                   AB.esc(x.title) + '" loading="lazy">' +
                 '<h3>' + AB.esc(x.title) + '</h3>' +
                 '<p class="ab-card-spec">' + AB.esc(x.year + ' · ' + x.location) + '</p></a>';
      }).join('');

    el.innerHTML =
      '<div class="ab-wrap">' +
        '<p class="ab-crumb"><a href="../">Projects</a> &nbsp;/&nbsp; ' + AB.esc(a.year) + '</p>' +
        '<h1 class="ab-title ab-article-title">' + AB.esc(a.title) + '</h1>' +
        '<p class="ab-tagline">' + AB.esc(a.note) + '</p>' +
        '<dl class="ab-specs">' + facts + '</dl>' +
        '<p class="ab-count">' + a.photos.length + ' photographs — select one to open the viewer</p>' +
        '<div class="ab-sheet">' + tiles + '</div>' +
        '<div class="ab-items"><h2>Other albums</h2><div class="ab-grid">' + others + '</div></div>' +
      '</div>';

    el.addEventListener('click', function (e) {
      var b = e.target.closest('.ab-shot');
      if (b) open(+b.getAttribute('data-i'), b);
    });
  }).catch(function (e) { AB.fail(el, e); });
}());
