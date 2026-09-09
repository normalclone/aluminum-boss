/* Header behaviour: the mobile menu, and the locale switch.
 *
 * Kept separate from app.js because it runs on every page including ones that have no data
 * section - the homepage among them.
 */
(function () {
  'use strict';

  var burger = document.querySelector('.abh-burger');
  var nav = document.getElementById('abh-menu');

  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    // A menu left open behind a resize back to desktop keeps the panel styles and overlaps
    // the page, so close it when the layout changes out from under it.
    var wide = window.matchMedia('(min-width: 1081px)');
    (wide.addEventListener ? wide.addEventListener.bind(wide, 'change')
                           : wide.addListener.bind(wide))(function () {
      nav.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
    });
  }


  // The bar is transparent while the hero is still behind it, and takes its background once the
  // hero has scrolled past - which is the only state the concept draws. Pages without a hero
  // never enter the transparent state.
  //
  // Watched with an observer rather than measured on scroll. The first version read
  // getBoundingClientRect on two elements every frame, which forces the browser to recompute
  // layout each time; on this page - which still carries the old theme's DOM - that was the
  // largest single cost while scrolling the hero. An observer does the same job off the
  // scrolling path and costs nothing per frame.
  var bar = document.querySelector('.abh');
  var hero = document.getElementById('abhero');
  if (bar && hero) {
    var mark = document.createElement('div');
    // one pixel at the foot of the hero: while it is below the bar, the hero still is too
    mark.setAttribute('aria-hidden', 'true');
    mark.style.cssText = 'position:absolute;left:0;bottom:0;width:1px;height:1px;pointer-events:none';
    (getComputedStyle(hero).position === 'static' ? (hero.style.position = 'relative') : 0);
    hero.appendChild(mark);

    var apply = function (over) {
      bar.classList.toggle('is-over', over);
    };

    if ('IntersectionObserver' in window) {
      var barH = Math.round(bar.offsetHeight);
      new IntersectionObserver(function (entries) {
        var e = entries[entries.length - 1];
        // rootMargin pulls the top of the watched area down by the bar's height, so the switch
        // happens exactly as the hero's foot passes under the bar.
        //
        // Not intersecting means the marker is either above that edge or below the screen, and
        // the two need opposite answers - so compare against the edge rather than against zero.
        // Comparing against zero kept the bar transparent for the whole page, because a marker
        // sitting just above the edge still has a positive top.
        var edge = e.rootBounds ? e.rootBounds.top : barH;
        apply(e.isIntersecting || e.boundingClientRect.top >= edge);
      }, { rootMargin: '-' + barH + 'px 0px 0px 0px', threshold: 0 }).observe(mark);
    } else {
      apply(true);
    }
  }

  // The Vietnamese edition is not built yet. Rather than a dead toggle that silently does
  // nothing, say so - a control that looks live and is not costs more trust than an honest one.
  var locale = document.querySelectorAll('.abh-locale button');
  Array.prototype.forEach.call(locale, function (b) {
    b.addEventListener('click', function () {
      if (b.getAttribute('aria-pressed') === 'true') return;
      var note = document.getElementById('abh-locale-note');
      if (!note) {
        note = document.createElement('div');
        note.id = 'abh-locale-note';
        note.className = 'abh-note';
        document.querySelector('.abh').appendChild(note);
      }
      note.textContent = 'The Vietnamese edition is not part of this demo yet.';
      clearTimeout(note._t);
      note._t = setTimeout(function () { note.remove(); }, 3200);
    });
  });
}());
