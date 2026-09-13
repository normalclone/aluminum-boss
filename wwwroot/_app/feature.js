/* The full-width finish-samples panel on the homepage.
 *
 * The closing block on the same page asks for a drawing, so this one asks for the other thing
 * a specifier needs early and cannot get from a screen: the finish itself, cut on a real
 * section. Copy and destination live in /_data/feature.json, so the panel can be repointed at
 * a different offer without touching the page.
 */
(function () {
  'use strict';
  if (!window.AB) return;

  // The photograph is the panel, so the placeholder is asked for at the size the panel will
  // actually use it at: 2.4:1 is the crop, and the label tells whoever shoots it what of.
  var PH_W = 2400, PH_H = 1000;

  var host = document.getElementById('abfc-cta');
  if (!host) return;

  function link(o, cls, arrow) {
    if (!o || !o.href || !o.label) return '';
    return '<a class="' + cls + '" href="' + AB.esc(AB.root() + o.href) + '">' +
             AB.esc(o.label) + (arrow ? '<span class="arrow-link"></span>' : '') + '</a>';
  }

  AB.load('feature').then(function (d) {
    // No label on this one. It is a background, not a card picture: the headline and body copy
    // sit directly over the middle of it, and the placeholder was drawing its own text there,
    // under the scrim where no amount of contrast work could rescue it. The corner ticks and
    // the size line still identify it and still give the photographer the crop.
    var src = d.image ? AB.root() + '_media/' + d.image
                      : AB.ph(PH_W, PH_H, '');

    if (!host.firstElementChild) host.innerHTML =
      '<div class="core-cta-customizable__text-col">' +
        '<div class="core-cta-customizable__text-col__top">' +
          '<p class="core-cta-customizable__text-col__bottom__text font-16 mb-32">' +
            AB.esc(d.eyebrow) + '</p>' +
          '<h2 class="font-light font-40" id="abfc-title">' + AB.esc(d.heading) + '</h2>' +
          '<p class="abfc-text">' + AB.esc(d.text) + '</p>' +
        '</div>' +
        '<div class="core-cta-customizable__text-col__bottom">' +
          link(d.cta, 'btn btn-blanco-negro font-14', true) +
          link(d.more, 'abfc-alt', false) +
        '</div>' +
      '</div>' +
      '<div class="core-cta-customizable__image-col">' +
        '<img class="core-cta-customizable__image-col__image" src="' + src +
          '" width="' + PH_W + '" height="' + PH_H + '" alt="' + AB.esc(d.alt || '') +
          '" loading="lazy">' +
      '</div>';
  }).catch(function (e) {
    // A panel of this size with nothing written on it reads as a broken page. If the copy
    // cannot be fetched there is nothing to say, so the band goes away entirely.
    var band = document.getElementById('abfc');
    if (band) band.style.display = 'none';
    if (window.console) console.error(e);
  });
}());
