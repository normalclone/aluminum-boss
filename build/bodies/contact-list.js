(function () {
  var elO = document.getElementById('ab-offices');
  var elR = document.getElementById('ab-routes');

  AB.load('contact').then(function (d) {
    document.getElementById('ab-intro').textContent = d.intro;

    elO.innerHTML = d.offices.map(function (o) {
      return '<div class="ab-office">' +
               '<h2>' + AB.esc(o.name) + '</h2>' +
               '<p>' + o.lines.map(AB.esc).join('<br>') + '</p>' +
               '<p><a href="tel:' + AB.esc(o.phone.replace(/\s/g, '')) + '">' + AB.esc(o.phone) +
                 '</a><br><a href="mailto:' + AB.esc(o.email) + '">' + AB.esc(o.email) + '</a></p>' +
             '</div>';
    }).join('');

    elR.innerHTML = d.routes.map(function (r) {
      return '<a class="ab-route" href="detail/?id=' + encodeURIComponent(r.id) + '">' +
               '<h3>' + AB.esc(r.name) + '</h3>' +
               '<p>' + AB.esc(r.blurb) + '</p>' +
               '<span class="ab-route-cta">' + AB.esc(r.cta) + '</span>' +
             '</a>';
    }).join('');
  }).catch(function (e) { AB.fail(elR, e); });
}());
