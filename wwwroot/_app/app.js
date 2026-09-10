/* Shared helpers for the data-driven sections.
 *
 * The pages inherit the theme's chrome and typography; everything below draws content from
 * /_data/*.json so a section is edited by changing a JSON file, not by editing HTML.
 */
(function (w) {
  'use strict';

  // Same greys the rest of the site's placeholders use, so a new page does not read as a
  // different mockup. Labelled with the thing it stands for rather than "Image 47", because
  // on a page nobody has seen before the label is the only clue to what belongs there.
  var BG = '#d9d6d1', EDGE = '#c2beb7', FG = '#6f6a62';

  // Greatest common divisor, so 1364x620 reads as 341:155 rather than as itself. Ratios that
  // do not reduce to something short are shown as a decimal instead - "2.2:1" tells a
  // photographer more than "341:155" does.
  function ratio(w, h) {
    var a = w, b = h, t;
    while (b) { t = b; b = a % b; a = t; }
    var rw = Math.round(w / a), rh = Math.round(h / a);
    if (rw <= 32 && rh <= 32) return rw + ':' + rh;
    // Keep the 1 on the side that makes the number bigger than 1. A portrait crop written as
    // "0.76:1" has to be worked out; "1:1.32" is read straight off.
    return w >= h ? (Math.round(w / h * 100) / 100) + ':1'
                  : '1:' + (Math.round(h / w * 100) / 100);
  }

  function ph(width, height, label) {
    var fs = Math.max(10, Math.round(Math.min(width, height) / 10));
    var words = String(label || '').split(/\s+/);
    var lines = [], line = '';
    var per = Math.max(8, Math.floor(width / (fs * 0.58)));
    for (var i = 0; i < words.length; i++) {
      if ((line + ' ' + words[i]).trim().length > per) { lines.push(line.trim()); line = words[i]; }
      else { line += ' ' + words[i]; }
    }
    if (line.trim()) lines.push(line.trim());
    lines = lines.slice(0, 2);

    var sfs = Math.max(10, Math.round(fs * 0.72));
    var spec = width + '\u00d7' + height + '  \u00b7  ' + ratio(width, height);

    // Absolute positions, not em offsets: the spec line is set in a smaller font, so an em
    // shift on it meant something different from an em shift on the label above, and a
    // two-line label ran straight through the spec.
    var lineH = fs * 1.25, specH = sfs * 1.7;
    var top = (height - (lines.length * lineH + specH)) / 2;
    var text = lines.map(function (t, i) {
      return '<tspan x="50%" y="' + Math.round(top + i * lineH + fs * 0.82) + '">' +
             esc(t) + '</tspan>';
    }).join('');
    var specY = Math.round(top + lines.length * lineH + sfs * 1.0);

    // Corner ticks: at small sizes the 1px frame disappears into whatever is behind it, and the
    // point of a placeholder is that the shape of the hole is obvious.
    var t = Math.max(6, Math.round(Math.min(width, height) * 0.07));
    var tw = Math.max(1, Math.round(Math.min(width, height) / 160));
    var ticks = [[0, 0, t, 0], [0, 0, 0, t],
                 [width, 0, -t, 0], [width, 0, 0, t],
                 [0, height, t, 0], [0, height, 0, -t],
                 [width, height, -t, 0], [width, height, 0, -t]]
      .map(function (p) {
        return '<path d="M' + p[0] + ' ' + p[1] + 'l' + p[2] + ' ' + p[3] + '"/>';
      }).join('');

    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height +
      '" viewBox="0 0 ' + width + ' ' + height + '">' +
      '<rect width="' + width + '" height="' + height + '" fill="' + BG + '"/>' +
      '<rect x="0.5" y="0.5" width="' + (width - 1) + '" height="' + (height - 1) +
      '" fill="none" stroke="' + EDGE + '"/>' +
      '<g stroke="' + FG + '" stroke-width="' + tw + '" fill="none" opacity=".5">' + ticks + '</g>' +
      '<text text-anchor="middle" font-family="Helvetica,Arial,sans-serif" ' +
      'font-size="' + fs + '" fill="' + FG + '">' + text + '</text>' +
      '<text x="50%" y="' + specY + '" text-anchor="middle" ' +
      'font-family="Helvetica,Arial,sans-serif" font-size="' + sfs + '" fill="' + FG +
      '" opacity=".72" letter-spacing="0.06em">' + esc(spec) + '</text></svg>';
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function qs(name) {
    var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(w.location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
  }

  // Every page is stamped with its own way back to the site root by the build, because pages
  // sit at three different depths and this file is shared by all of them.
  //
  // Guessing a default was wrong in a way that only showed once deployed: the site is served
  // from a subpath on Pages, and a prefix with one ../ too many resolves above the site root
  // rather than at it. A browser silently clamps that at the origin, so it worked locally,
  // where the site root and the origin root are the same directory, and 404'd in production.
  function root() {
    var el = document.querySelector('[data-ab-root]');
    if (el) return el.getAttribute('data-ab-root');
    var d = document.querySelector('[data-depth]');
    return new Array((d ? +d.getAttribute('data-depth') : 2) + 1).join('../');
  }

  function load(name) {
    return fetch(root() + '_data/' + name + '.json', { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error(name + '.json: HTTP ' + r.status);
        return r.json();
      });
  }

  function fail(el, e) {
    el.innerHTML = '<div class="ab-fail"><p>Could not load this section.</p><p>' +
      esc(e && e.message) + '</p></div>';
    if (w.console) console.error(e);
  }

  // Sets <title> and the visible page heading together, so a bookmarked detail page is named
  // after what it shows rather than after the template.
  function title(t) {
    document.title = t + ' | AluminumBoss';
  }

  w.AB = { ph: ph, esc: esc, qs: qs, load: load, root: root, fail: fail, title: title };
}(window));
