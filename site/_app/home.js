/* The homepage hero.
 *
 * The six words are the six product families, read from products.json rather than written into
 * the page, so adding a family to the catalogue adds it to the hero. Selecting one changes the
 * backdrop and the caption; following it goes to that family.
 */
(function () {
  'use strict';

  var words = document.getElementById('abhero-words');
  var bg = document.getElementById('abhero-bg');
  var cap = document.getElementById('abhero-caption');
  if (!words || !window.AB) return;

  var at = -1, items = [];

  function select(i) {
    if (i === at || !items[i]) return;
    at = i;
    var c = items[i];
    // A family with a photograph uses it; the rest fall back to the plain grey field. No label
    // on the placeholder: at full bleed its caption lands in the middle of the screen and reads
    // as content, and the caption below already names what is selected.
    var src = c.image ? AB.root() + '_media/' + c.image : AB.ph(1920, 1080, '');
    bg.style.backgroundImage = 'url("' + src + '")';
    // No scrim: the hero shows the photograph at its own aspect ratio, so the words land on the
    // pale wall the photograph puts under them, exactly as the concept has it.
    cap.innerHTML = '<strong>' + AB.esc(c.name) + '</strong> ' + AB.esc(c.tagline);
    var all = words.querySelectorAll('a');
    for (var k = 0; k < all.length; k++) all[k].className = k === i ? 'is-on' : '';
  }

  AB.load('products').then(function (d) {
    items = d.categories;
    words.innerHTML = items.map(function (c, i) {
      // Addressed from the site root like every other link this file writes. It used to be
      // written relative to the page, which resolved a level too deep and 404'd on click.
      return '<a href="' + AB.root() + 'products/detail/?id=' + encodeURIComponent(c.id) + '" data-i="' + i +
             '">' + AB.esc(c.name.toUpperCase()) + '</a>';
    }).join('');

    words.addEventListener('mouseover', function (e) {
      var a = e.target.closest('a[data-i]');
      if (a) select(+a.getAttribute('data-i'));
    });
    // keyboard users never fire mouseover, so the backdrop would never follow the focus ring
    words.addEventListener('focusin', function (e) {
      var a = e.target.closest('a[data-i]');
      if (a) select(+a.getAttribute('data-i'));
    });
    select(0);
  }).catch(function (e) {
    if (window.console) console.error(e);
  });
}());
