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
  var hero = document.getElementById('abhero');
  if (!words || !window.AB) return;

  var at = -1, items = [];

  // Which patch of the photograph the caption sits on top of.
  //
  // The hero sets background-position:100% center and background-size:cover, so the picture's
  // right edge meets the block's right edge. The caption is 2.5vw in from the right, 4.5% up
  // from the bottom, about 40ch wide and two lines tall - which back in the picture's own
  // coordinates is roughly this box. Read the image rather than the screen: the screen has the
  // left-hand fade painted over it, and that fade is nowhere near this corner.
  var SAMPLE = { x0: 0.82, x1: 0.98, y0: 0.88, y1: 0.97 };

  /**
   * Whether that patch is dark, so the caption can change colour instead of guessing.
   *
   * The backdrop is the client's photograph now, and which photograph is theirs to choose. Five
   * of the six they sent are pale and the caption reads as it always did; one (Facade) puts
   * reflected glass under it and the line all but disappeared. Measured on the six: 22, 95, and
   * then 148 to 240 - two groups with nothing near the middle, so 128 is a safe line to draw.
   *
   * Answers once per picture and remembers. A blocked canvas answers "light", which is what the
   * page did before this existed.
   */
  var tones = {};
  function tone(src, done) {
    if (src in tones) { done(tones[src]); return; }
    var im = new Image();
    im.onload = function () {
      try {
        var n = 48, c = document.createElement('canvas');
        c.width = n; c.height = n;
        var g = c.getContext('2d');
        g.drawImage(im,
                    im.width * SAMPLE.x0, im.height * SAMPLE.y0,
                    im.width * (SAMPLE.x1 - SAMPLE.x0), im.height * (SAMPLE.y1 - SAMPLE.y0),
                    0, 0, n, n);
        var d = g.getImageData(0, 0, n, n).data, sum = 0;
        for (var i = 0; i < d.length; i += 4) {
          sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        }
        tones[src] = sum / (d.length / 4) < 128 ? 'dark' : 'light';
      } catch (e) {
        tones[src] = 'light';
      }
      done(tones[src]);
    };
    im.onerror = function () { tones[src] = 'light'; done('light'); };
    im.src = src;
  }

  function select(i) {
    if (i === at || !items[i]) return;
    at = i;
    var c = items[i];
    // A family with a photograph uses it; the rest fall back to a plain grey field.
    //
    // Khong dung AB.ph() o day. Y dinh ghi tu dau la "khong nhan tren o giu cho" - o toan man
    // hinh, chu cua no roi vao giua trang va doc nhu noi dung - va truyen mot nhan rong da co
    // ve dung. Nhung AB.ph() con ve MOT DONG THU HAI, "1920x1080 · 16:9", bat ke nhan la gi.
    // Khong ai thay, vi cho toi hom nay ca sau ho san pham deu co anh. Ho thu bay chua co anh
    // thi hero hien dung dong do, chu cao gan 140px, giua man hinh.
    var FIELD = 'data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="9">' +
      '<rect width="16" height="9" fill="#d9d6d1"/></svg>');
    var src = c.image ? AB.root() + '_media/' + c.image : FIELD;
    bg.style.backgroundImage = 'url("' + src + '")';
    // The six words still land on whatever the photograph puts under them - that part of the
    // concept holds, because the fade down the left guarantees it. The caption bottom-right has
    // no fade under it, so it asks the picture what colour to be. See tone() and .abhero.is-dark.
    if (hero) tone(src, function (t) {
      // The answer can arrive after the reader has moved to another family; only the picture
      // still on screen gets to decide.
      if (items[at] === c) hero.classList.toggle('is-dark', t === 'dark');
    });
    cap.innerHTML = '<strong>' + AB.esc(c.name) + '</strong> ' + AB.esc(c.tagline);
    var all = words.querySelectorAll('a');
    for (var k = 0; k < all.length; k++) all[k].className = k === i ? 'is-on' : '';
  }

  AB.load('products').then(function (d) {
    items = d.categories;
    if (!words.firstElementChild) words.innerHTML = items.map(function (c, i) {
      // Addressed from the site root like every other link this file writes. It used to be
      // written relative to the page, which resolved a level too deep and 404'd on click.
      return '<a href="' + AB.root() + 'products/' + AB.href(c) + '" data-i="' + i +
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
