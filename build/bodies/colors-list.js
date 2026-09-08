(function () {
  var wrapF = document.getElementById('ab-filters');
  var wrapS = document.getElementById('ab-swatches');
  var elCount = document.getElementById('ab-count');
  var DATA = null;
  var picked = {};

  // The swatch is the product here, so the tile shows the actual colour rather than the grey
  // stand-in used everywhere else. A page of grey rectangles would tell a client nothing.
  function tile(c) {
    return '<a class="ab-swatch" href="detail/?id=' + encodeURIComponent(c.id) + '">' +
             '<span class="ab-chip" style="background:' + AB.esc(c.hex) + '"></span>' +
             '<span class="ab-swatch-name">' + AB.esc(c.name) + '</span>' +
             '<span class="ab-swatch-meta">' + AB.esc(c.code) + ' · ' + AB.esc(c.family) + '</span>' +
           '</a>';
  }

  function matches(c) {
    for (var k in picked) {
      if (picked[k] && c[k] !== picked[k]) return false;
    }
    return true;
  }

  function draw() {
    var hits = DATA.items.filter(matches);
    wrapS.innerHTML = hits.length ? hits.map(tile).join('')
      : '<p class="ab-empty">No finish matches all three filters. Clear one to widen the search.</p>';
    elCount.textContent = hits.length === DATA.items.length
      ? DATA.items.length + ' finishes'
      : hits.length + ' of ' + DATA.items.length + ' finishes';
    var btns = wrapF.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      var k = btns[i].getAttribute('data-k'), v = btns[i].getAttribute('data-v');
      btns[i].className = (picked[k] === v || (!picked[k] && v === '')) ? 'is-on' : '';
    }
  }

  AB.load('colors').then(function (d) {
    DATA = d;
    document.getElementById('ab-intro').textContent = d.intro;
    wrapF.innerHTML = d.filters.map(function (f) {
      var opts = [''].concat(f.options).map(function (o) {
        return '<button type="button" data-k="' + f.id + '" data-v="' + AB.esc(o) + '">' +
               (o ? AB.esc(o) : 'All') + '</button>';
      }).join('');
      return '<div class="ab-filter"><span class="ab-filter-label">' + AB.esc(f.label) +
             '</span><div class="ab-filter-opts">' + opts + '</div></div>';
    }).join('');
    wrapF.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      picked[b.getAttribute('data-k')] = b.getAttribute('data-v');
      draw();
    });
    draw();
  }).catch(function (e) { AB.fail(wrapS, e); });
}());
