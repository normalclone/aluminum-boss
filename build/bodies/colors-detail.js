(function () {
  var el = document.getElementById('ab-detail');

  // Coating thickness and warranty follow from the finish family, so they are derived rather
  // than repeated on all 35 entries - one place to correct when a spec changes.
  var SPEC = {
    'Anodised':      {layer: '15 µm (10 µm interior, 25 µm marine)', std: 'AS 1231 / QUALANOD', warranty: '10 years'},
    'Powder coated': {layer: '60–80 µm', std: 'AAMA 2604 / QUALICOAT Class 1', warranty: '10 years'},
    'Wood grain':    {layer: '60–80 µm powder base, sublimated film', std: 'AAMA 2604', warranty: '10 years'},
    'PVDF':          {layer: '35–45 µm, two coat', std: 'AAMA 2605 / QUALICOAT Class 2', warranty: '20 years'},
    'Mechanical':    {layer: 'Clear anodic seal, 10 µm', std: 'QUALANOD', warranty: '5 years, interior'}
  };

  AB.load('colors').then(function (d) {
    var want = AB.qs('id'), c = null;
    for (var i = 0; i < d.items.length; i++) {
      if (d.items[i].id === want) { c = d.items[i]; break; }
    }
    if (!c) c = d.items[0];
    AB.title(c.name + ' — Colors');

    var s = SPEC[c.family] || {layer: '—', std: '—', warranty: '—'};
    var rows = [
      ['Code', c.code], ['Finish', c.family], ['Gloss', c.gloss], ['Exposure', c.use],
      ['Coating', s.layer], ['Standard', s.std], ['Colour warranty', s.warranty]
    ].map(function (r) {
      return '<div class="ab-spec"><dt>' + AB.esc(r[0]) + '</dt><dd>' + AB.esc(r[1]) + '</dd></div>';
    }).join('');

    var siblings = d.items.filter(function (x) {
      return x.family === c.family && x.id !== c.id;
    }).slice(0, 8).map(function (x) {
      return '<a class="ab-swatch" href="?id=' + encodeURIComponent(x.id) + '">' +
               '<span class="ab-chip" style="background:' + AB.esc(x.hex) + '"></span>' +
               '<span class="ab-swatch-name">' + AB.esc(x.name) + '</span>' +
               '<span class="ab-swatch-meta">' + AB.esc(x.code) + '</span></a>';
    }).join('');

    el.innerHTML =
      '<div class="ab-wrap">' +
        '<p class="ab-crumb"><a href="../">Colors</a> &nbsp;/&nbsp; ' + AB.esc(c.family) + '</p>' +
        '<div class="ab-colour-head">' +
          '<div class="ab-colour-block" style="background:' + AB.esc(c.hex) + '"></div>' +
          '<div>' +
            '<h1 class="ab-title">' + AB.esc(c.name) + '</h1>' +
            '<p class="ab-tagline">' + AB.esc(c.code) + ' &middot; ' + AB.esc(c.family) + '</p>' +
            '<p class="ab-note">' + AB.esc(c.note) + '</p>' +
          '</div>' +
        '</div>' +
        '<dl class="ab-specs">' + rows + '</dl>' +
        '<div class="ab-items">' +
          '<h2>Other ' + AB.esc(c.family.toLowerCase()) + ' finishes</h2>' +
          '<div class="ab-swatches">' + siblings + '</div>' +
        '</div>' +
      '</div>';
  }).catch(function (e) { AB.fail(el, e); });
}());
