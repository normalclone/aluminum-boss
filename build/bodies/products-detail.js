(function () {
  var el = document.getElementById('ab-detail');
  AB.load('products').then(function (d) {
    var want = AB.qs('id');
    var c = null;
    for (var i = 0; i < d.categories.length; i++) {
      if (d.categories[i].id === want) { c = d.categories[i]; break; }
    }
    // An unknown or missing id lands on the first family rather than on an error page: the
    // section still has to be walkable when a link is mistyped or a category is renamed.
    if (!c) c = d.categories[0];
    AB.title(c.name + ' — Products');

    var others = d.categories.filter(function (x) { return x.id !== c.id; }).map(function (x) {
      return '<a href="?id=' + encodeURIComponent(x.id) + '">' + AB.esc(x.name) + '</a>';
    }).join('<span aria-hidden="true"> · </span>');

    // Split into two columns on a sentence boundary. Halving by character count reads as a
    // fault - the left column ends mid-clause and the right one starts with a lower-case word.
    //
    // A full stop BETWEEN TWO DIGITS is not the end of a sentence. Without the guard below the
    // regex cannot match from the start of the text at all once a decimal appears - it skips
    // forward and starts the first "sentence" in the middle of a number, so a blurb reading
    // "... to 2.5 mm for a 10.5 m industrial span." put the words "5 m industrial span." alone
    // in the left column. Every blurb written so far happened to avoid decimals; the first one
    // that used them broke the page, and nothing failed loudly.
    var guarded = c.blurb.replace(/(\d)\.(\d)/g, '$1\u0001$2');
    var sentences = (guarded.match(/[^.!?]+[.!?]+(\s|$)/g) || [guarded]).map(function (s) {
      return s.replace(/\u0001/g, '.');
    });
    var half = c.blurb.length / 2, run = 0, at = sentences.length;
    for (var s = 0; s < sentences.length; s++) {
      run += sentences[s].length;
      if (run >= half) { at = s + 1; break; }
    }
    if (at >= sentences.length && sentences.length > 1) at = sentences.length - 1;
    var para = [sentences.slice(0, at).join('').trim(), sentences.slice(at).join('').trim()];

    var cards = c.items.map(function (it) {
      return '<article class="ab-card" id="' + AB.esc(it.id) + '">' +
               '<img src="' + AB.ph(400, 300, it.name) + '" width="400" height="300" alt="' +
                 AB.esc(it.name) + '" loading="lazy">' +
               '<h3>' + AB.esc(it.name) + '</h3>' +
               '<p class="ab-card-spec">' + AB.esc(it.spec) + '</p>' +
               '<p>' + AB.esc(it.text) + '</p>' +
             '</article>';
    }).join('');

    el.innerHTML =
      '<div class="ab-wrap">' +
        '<p class="ab-crumb"><a href="../">Products</a> &nbsp;/&nbsp; ' + AB.esc(c.name) + '</p>' +
        '<h1 class="ab-title">' + AB.esc(c.name) + '</h1>' +
        '<p class="ab-tagline">' + AB.esc(c.tagline) + '</p>' +
      '</div>' +
      '<div class="ab-wrap"><div class="ab-hero">' +
        '<img src="' + AB.ph(1280, 520, c.name) + '" width="1280" height="520" alt="' +
          AB.esc(c.name) + '">' +
      '</div></div>' +
      '<div class="ab-wrap"><div class="ab-body">' +
        '<div><p>' + AB.esc(para[0]) + '</p></div>' +
        '<div><p>' + AB.esc(para[1]) + '</p></div>' +
      '</div></div>' +
      '<div class="ab-wrap"><div class="ab-items">' +
        '<h2>' + AB.esc(c.items.length) + ' products in this family</h2>' +
        '<div class="ab-grid">' + cards + '</div>' +
        '<p class="ab-band-sub" style="margin-top:44px">Other families: ' + others + '</p>' +
      '</div></div>';

    // arriving from a tile on the listing, go to that product rather than the top of the family
    if (location.hash.length > 1) {
      var t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (t) t.scrollIntoView();
    }
  }).catch(function (e) { AB.fail(el, e); });
}());
