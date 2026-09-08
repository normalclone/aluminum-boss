(function () {
  var el = document.getElementById('ab-detail');

  function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  function field(f) {
    var id = 'f-' + slug(f.n);
    var req = f.req ? ' required' : '';
    var star = f.req ? '<abbr title="required">*</abbr>' : '';
    var input;
    if (f.t === 'textarea') {
      input = '<textarea id="' + id + '" name="' + id + '" rows="5"' + req + '></textarea>';
    } else if (f.t === 'select') {
      input = '<select id="' + id + '" name="' + id + '"' + req + '>' +
              '<option value="">Select…</option>' +
              (f.opts || []).map(function (o) {
                return '<option>' + AB.esc(o) + '</option>';
              }).join('') + '</select>';
    } else if (f.t === 'file') {
      input = '<input type="file" id="' + id + '" name="' + id + '"' + req + '>';
    } else {
      input = '<input type="' + f.t + '" id="' + id + '" name="' + id + '"' + req + '>';
    }
    return '<div class="ab-field' + (f.t === 'textarea' || f.t === 'file' ? ' is-wide' : '') + '">' +
             '<label for="' + id + '">' + AB.esc(f.n) + star + '</label>' + input +
             (f.hint ? '<span class="ab-hint">' + AB.esc(f.hint) + '</span>' : '') +
           '</div>';
  }

  AB.load('contact').then(function (d) {
    var want = AB.qs('id'), r = null;
    for (var i = 0; i < d.routes.length; i++) {
      if (d.routes[i].id === want) { r = d.routes[i]; break; }
    }
    if (!r) r = d.routes[0];
    AB.title(r.name + ' — Contact');

    var others = d.routes.filter(function (x) { return x.id !== r.id; }).map(function (x) {
      return '<a href="?id=' + encodeURIComponent(x.id) + '">' + AB.esc(x.name) + '</a>';
    }).join('<span aria-hidden="true"> · </span>');

    el.innerHTML =
      '<div class="ab-wrap">' +
        '<p class="ab-crumb"><a href="../">Contact</a> &nbsp;/&nbsp; ' + AB.esc(r.name) + '</p>' +
        '<h1 class="ab-title ab-article-title">' + AB.esc(r.name) + '</h1>' +
        '<p class="ab-tagline">' + AB.esc(r.intro) + '</p>' +
        '<form class="ab-form" novalidate>' +
          '<div class="ab-fields">' + r.fields.map(field).join('') + '</div>' +
          '<div class="ab-consent">' +
            d.consent.map(function (c, i) {
              return '<label><input type="checkbox" name="consent' + i + '"> ' +
                     AB.esc(c) + '</label>';
            }).join('') +
          '</div>' +
          '<button type="submit" class="ab-submit">' + AB.esc(r.cta) + '</button>' +
          '<p class="ab-form-note" hidden></p>' +
        '</form>' +
        '<p class="ab-band-sub" style="margin:44px 0 88px">Other enquiries: ' + others + '</p>' +
      '</div>';

    // A static site has nowhere to post to. Rather than a button that silently does nothing,
    // the form validates and then says plainly that this is a demo - a dead submit button is
    // the fastest way to lose a client's trust in the rest of the page.
    var form = el.querySelector('.ab-form');
    var note = el.querySelector('.ab-form-note');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = null;
      var req = form.querySelectorAll('[required]');
      for (var i = 0; i < req.length; i++) {
        var ok = req[i].type === 'file' ? req[i].files.length : String(req[i].value).trim();
        req[i].closest('.ab-field').classList.toggle('is-bad', !ok);
        if (!ok && !bad) bad = req[i];
      }
      if (bad) {
        note.hidden = false;
        note.className = 'ab-form-note is-bad';
        note.textContent = 'Some required fields are still empty.';
        bad.focus();
        return;
      }
      note.hidden = false;
      note.className = 'ab-form-note is-ok';
      note.textContent = 'Form complete. This demo has no server attached, so nothing was sent — ' +
                         'connecting it to an inbox or a CRM is a configuration step, not a rebuild.';
    });
  }).catch(function (e) { AB.fail(el, e); });
}());
