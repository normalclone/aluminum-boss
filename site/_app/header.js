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
