(function () {
  var bands = document.getElementById('ab-bands');
  AB.load('products').then(function (d) {
    document.getElementById('ab-intro').textContent = d.intro;
    bands.innerHTML = d.categories.map(function (c) {
      // Bang la mot dai CUON NGANG, thiet ke cho khoang nam the. Ho Door's Accessory sau khi
      // nhap bossdoor co 40 san pham, va ca 40 the deu duoc ve: dai rong 10.060px trong mot
      // khung 1.232px — tam man cuon ngang, chi 5 the nhin thay, khong dau hieu nao bao con 35
      // cai nua. Trang cao them dung 36px nen khong phep do chieu cao nao thay.
      // Cat con 8: du de dai co cuon (bao "con nua"), khong bien thanh mot hanh lang. So that
      // van nam o lien ket "40 products" ben canh tieu de, va trang ho san pham ve du ca 40
      // trong mot luoi xuong hang binh thuong.
      var tiles = c.items.slice(0, 8).map(function (it) {
        return '<a class="ab-tile" href="detail/?id=' + encodeURIComponent(c.id) +
               '#' + encodeURIComponent(it.id) + '">' +
                 '<span class="ab-thumb"><img src="' +
                 (it.image ? AB.root() + '_media/' + it.image : AB.ph(340, 300, it.name)) +
                   '" width="340" height="300" alt="' + AB.esc(it.name) + '" loading="lazy"></span>' +
                 '<h3>' + AB.esc(it.name) + '</h3>' +
                 '<p>' + AB.esc(it.spec) + '</p>' +
               '</a>';
      }).join('');
      return '<section class="ab-band">' +
               '<div class="ab-band-head">' +
                 '<h2>' + AB.esc(c.name) + '</h2>' +
                 '<a class="ab-more" href="detail/?id=' + encodeURIComponent(c.id) + '">' +
                   AB.esc(c.items.length) + ' products</a>' +
               '</div>' +
               '<p class="ab-band-sub">' + AB.esc(c.tagline) + '</p>' +
               '<div class="ab-row">' + tiles + '</div>' +
             '</section>';
    }).join('');
  }).catch(function (e) { AB.fail(bands, e); });
}());
