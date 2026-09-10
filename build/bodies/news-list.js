(function () {
  var el = document.getElementById('ab-news');

  // "3 months ago" is what the original listing showed and it is genuinely more useful than a
  // date on a news index - it answers "is this current" without arithmetic. The exact date is
  // on the article itself.
  function ago(iso) {
    var then = new Date(iso + 'T00:00:00'), now = new Date();
    var days = Math.round((now - then) / 86400000);
    if (days < 1) return 'today';
    if (days < 30) return days + (days === 1 ? ' day ago' : ' days ago');
    var months = Math.round(days / 30.44);
    if (months < 12) return months + (months === 1 ? ' month ago' : ' months ago');
    var years = Math.floor(months / 12);
    return years + (years === 1 ? ' year ago' : ' years ago');
  }

  AB.load('news').then(function (d) {
    document.getElementById('ab-intro').textContent = d.intro;
    var sorted = d.items.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    el.innerHTML = sorted.map(function (a, i) {
      return '<a class="ab-post' + (i === 0 ? ' is-lead' : '') + '" href="detail/?id=' +
               encodeURIComponent(a.id) + '">' +
               '<span class="ab-post-img"><img src="' +
                 (a.image ? AB.root() + '_media/' + a.image
                          : AB.ph(i === 0 ? 1240 : 600, i === 0 ? 560 : 380, a.title)) +
                 '" width="' + (i === 0 ? 1240 : 600) + '" height="' + (i === 0 ? 560 : 380) +
                 '" alt="' + AB.esc(a.title) + '" loading="lazy"></span>' +
               '<span class="ab-post-tags">' + a.tags.map(AB.esc).join(' &middot; ') + '</span>' +
               '<h2>' + AB.esc(a.title) + '</h2>' +
               '<p class="ab-post-excerpt">' + AB.esc(a.excerpt) + '</p>' +
               '<p class="ab-post-meta">' + ago(a.date) + ' &nbsp;|&nbsp; Written by: ' +
                 AB.esc(a.author) + '</p>' +
             '</a>';
    }).join('');
  }).catch(function (e) { AB.fail(el, e); });
}());
