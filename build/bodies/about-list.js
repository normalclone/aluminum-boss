(function () {
  // The numbered chapter bar is the one structural idea worth keeping from the page this
  // section is modelled on: it tells you how many chapters there are and where you are in them,
  // which a plain menu does not.
  function chapterNav(chapters, activeId, hrefFor) {
    return chapters.map(function (c, i) {
      var n = ('0' + (i + 1)).slice(-2);
      return '<a class="ab-chap' + (c.id === activeId ? ' is-on' : '') + '" href="' +
             hrefFor(c) + '"><span class="ab-chap-n">' + n + '.</span>' + AB.esc(c.name) + '</a>';
    }).join('');
  }
  window.AB_chapterNav = chapterNav;

  var nav = document.getElementById('ab-nav');
  var figs = document.getElementById('ab-figures');
  var list = document.getElementById('ab-chapters');

  AB.load('about').then(function (d) {
    document.getElementById('ab-lede').textContent = d.lede;
    document.getElementById('ab-intro').textContent = d.intro;
    nav.innerHTML = '<div class="ab-wrap ab-chapbar">' +
      chapterNav(d.chapters, null, function (c) {
        return 'detail/?id=' + encodeURIComponent(c.id);
      }) + '</div>';

    var f = d.figures;
    figs.innerHTML = '<div class="ab-wrap">' +
      '<h2 class="ab-fig-title">' + AB.esc(f.title) + '</h2>' +
      '<div class="ab-fig-tabs">' + f.tabs.map(function (t, i) {
        return '<button type="button" data-i="' + i + '"' + (i ? '' : ' class="is-on"') + '>' +
               AB.esc(t.label) + '</button>';
      }).join('') + '</div>' +
      '<div class="ab-fig-body" id="ab-fig-body"></div></div>';

    function drawFigs(i) {
      document.getElementById('ab-fig-body').innerHTML = f.tabs[i].rows.map(function (r) {
        return '<div class="ab-fig"><span class="ab-fig-k">' + AB.esc(r[0]) +
               '</span><span class="ab-fig-v">' + AB.esc(r[1]) + '</span></div>';
      }).join('');
    }
    figs.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-i]');
      if (!b) return;
      var on = figs.querySelectorAll('.ab-fig-tabs button');
      for (var i = 0; i < on.length; i++) on[i].className = '';
      b.className = 'is-on';
      drawFigs(+b.getAttribute('data-i'));
    });
    drawFigs(0);

    list.innerHTML = d.chapters.map(function (c, i) {
      return '<a class="ab-chapcard" href="detail/?id=' + encodeURIComponent(c.id) + '">' +
               '<img src="' + AB.ph(560, 340, c.name) + '" width="560" height="340" alt="' +
                 AB.esc(c.name) + '" loading="lazy">' +
               '<span class="ab-chap-n">' + ('0' + (i + 1)).slice(-2) + '.</span>' +
               '<h3>' + AB.esc(c.title) + '</h3>' +
               '<p>' + AB.esc(c.lede) + '</p></a>';
    }).join('');
  }).catch(function (e) { AB.fail(list, e); });
}());
