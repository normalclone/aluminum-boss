/*
  The page's half of the editor.

  Added to a composed page only when it is asked for with ?edit=1, and only ever loaded inside the
  editor's preview frame. The point of previewing the real page - same URL, same composition - is
  that what the client sees while typing is what a visitor will get. A mock of the page would
  drift from it within a week.

  THE CONTRACT. Both halves are written against this comment; change it here first.

    editor -> page
      { type: 'ab:text', address, value }   set the text at that address
      { type: 'ab:img',  address, file }    put that picture in that image field
      { type: 'ab:list' }                   send the addresses again (after a reload)

    page -> editor
      { type: 'ab:ready', url, fields: [...], lists: [...] }
        fields: [{ address, kind, value, shape?, options?, seo?, hint? }]
                                          kind = 't' | 'lead' | 'lines' | 'img' | 'pick' | 'date'
                                          'date' = an article's date: value is "2026-08-19", what
                                            the file holds, never the "19 August 2026" on screen
        lists:  [{ address, each, multiline }]  a list inside the item that the editor may grow:
                                          address = "news.items.0.body", each = "Paragraph".
                                          Reported even when EMPTY - that is the whole point
                                          shape = { w, h, from } of an image field's slot,
                                          from = 'attr' (the layout said so) | 'box' (measured)
                                          options = the only values a 'pick' field may hold
                                          seo = 'title' | 'description' | 'image' - a field in
                                            the head rather than on the page; the editor gives
                                            these a group and its own labels
                                          hint = what the head would say with that field empty
      { type: 'ab:pick', address }                                    someone clicked it

  WHAT CAN BE PATCHED LIVE, AND WHAT CANNOT. An address written as data-ab-t, data-ab-lead or
  data-ab-lines is one element's text, and this file sets it. A data-ab-section is a list the
  server built - cards, filters, a whole article - and it cannot be patched from here without
  copying the renderer into JavaScript, which is the duplication this project spent Task 9
  removing. Changing one of those means reloading the frame, and the editor does exactly that.

  Text is set through textContent and through text nodes, never innerHTML. Same reason Esc exists
  on the server: the client is going to type a "<" one day, and it has to arrive as a "<".
*/
(function (w) {
  'use strict';

  var d = w.document;
  if (w.parent === w) return;   // Not in a frame: there is nobody to talk to.

  var KINDS = [['data-ab-t', 't'], ['data-ab-lead', 'lead'], ['data-ab-lines', 'lines'],
               ['data-ab-img', 'img'], ['data-ab-pick', 'pick'], ['data-ab-date', 'date']];

  // The same words SectionRenderer.LongDate writes, so a date typed in the editor reads on the
  // page exactly as it will after the save: "19 August 2026", not the browser's own idea.
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
                'September', 'October', 'November', 'December'];
  function longDate(iso) {
    var p = String(iso).split('-'), m = +p[1];
    if (p.length !== 3 || !(m >= 1 && m <= 12)) return iso;
    return (+p[2]) + ' ' + MONTHS[m - 1] + ' ' + p[0];
  }

  // Two kinds of address, and the leading dot says which.
  //
  // An address written into the template by hand names its document already: "site.nav.1.label".
  // One written by the renderer cannot - it is drawing one list out of one file and was never
  // told that file's name - so it writes ".items.3.title", and the composer stamps the name once
  // on the section around it.
  //
  // The dot rather than "is it inside a section": the home page puts template text inside
  // rendered sections, so that test would make "gallery.heading" into "gallery.gallery.heading".
  function full(el, address) {
    if (address.charAt(0) !== '.') return address;
    var box = el.closest ? el.closest('[data-ab-doc]') : null;
    return box ? box.getAttribute('data-ab-doc') + address : address.slice(1);
  }

  function attr(el) {
    for (var i = 0; i < KINDS.length; i++) {
      var a = el.getAttribute(KINDS[i][0]);
      if (a) return { address: full(el, a), kind: KINDS[i][1] };
    }
    return null;
  }

  /**
   * Duong dan anh cua mot phan tu ve anh bang CSS. Tra ve chuoi rong neu khong co.
   *
   * Doc `el.style.backgroundImage` chu khong doc getComputedStyle: mot tam nen dat bang bang mau
   * trong stylesheet khong phai mot o noi dung, va lay nham no vao day thi trinh soan bay ra mot
   * o "chon anh" cho mot thu khong ai dinh sua.
   */
  function cssUrl(el) {
    var m = /url\(\s*["']?([^"')]+)["']?\s*\)/.exec(el.style.backgroundImage || '');
    return m ? m[1] : '';
  }

  /** The value at an address, read back the same way it was written. */
  function read(el, kind) {
    // A picture's value is the file's name, not the src: an empty field draws a placeholder,
    // whose src is a data: URI several kilobytes long and means "there is no picture here".
    if (kind === 'img') {
      var src = el.tagName === 'IMG' ? el.getAttribute('src') || '' : cssUrl(el);
      var cut = src.indexOf('_media/');
      return cut < 0 ? '' : src.slice(cut + 7);
    }
    if (kind === 't' || kind === 'pick') return el.textContent;
    // What the file holds, not what the reader sees.
    if (kind === 'date') return el.getAttribute('data-ab-value') || '';
    if (kind === 'lead') {
      var first = el.firstChild;
      return first && first.nodeType === 3 ? first.data : '';
    }
    // lines: the pieces between the <br>s, one per line.
    var out = [], part = '';
    for (var n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 1 && n.tagName === 'BR') { out.push(part); part = ''; }
      else if (n.nodeType === 3) part += n.data;
    }
    out.push(part);
    return out.join('\n');
  }

  function write(el, kind, value) {
    if (kind === 'img') {
      // Hai cach mot tam anh nam tren trang, va ca hai deu phai doi duoc ngay khi chon anh moi.
      // Mot tam ve bang CSS thi khong co gi de sua src, nhung backgroundImage thi co - va do
      // chinh la anh nen cua hero trang chu.
      //
      // Mot o anh RONG duoc ve thanh mot o mau, va bien no thanh anh that la viec cua may chu -
      // trinh soan tai lai khung sau khi luu, cho nay giai quyet ca hai truong hop.
      if (!value) return;
      if (el.tagName === 'IMG') el.setAttribute('src', root() + '_media/' + value);
      else el.style.backgroundImage = 'url("' + root() + '_media/' + value + '")';
      return;
    }
    if (kind === 't' || kind === 'pick') { el.textContent = value; return; }
    if (kind === 'date') {
      el.setAttribute('data-ab-value', value || '');
      el.textContent = value ? longDate(value) : '';
      return;
    }
    if (kind === 'lead') {
      var first = el.firstChild;
      if (first && first.nodeType === 3) first.data = value;
      else el.insertBefore(d.createTextNode(value), el.firstChild);
      return;
    }
    var lines = String(value).split('\n');
    el.textContent = '';
    for (var i = 0; i < lines.length; i++) {
      if (i) el.appendChild(d.createElement('br'));
      el.appendChild(d.createTextNode(lines[i]));
    }
  }

  function each(fn) {
    var all = d.querySelectorAll(
      '[data-ab-t],[data-ab-lead],[data-ab-lines],[data-ab-img],[data-ab-pick],[data-ab-date]');
    for (var i = 0; i < all.length; i++) {
      var a = attr(all[i]);
      if (a) fn(all[i], a.address, a.kind);
    }
  }

  function fields() {
    var out = [];
    each(function (el, address, kind) {
      var f = { address: address, kind: kind, value: read(el, kind) };
      if (kind === 'img') f.shape = shape(el);
      // The options travel with the field. The editor has no way to know that "gloss" means one
      // of four words - the page is the only side that has read the file.
      if (kind === 'pick') f.options = (el.getAttribute('data-ab-opts') || '').split('|');

      // The three boxes that are not anywhere on the page. Nothing shows a page its own search
      // title, so the composer hands one over in a hidden block; from here it is an ordinary
      // field, and only the two attributes below say otherwise.
      var seo = el.getAttribute('data-ab-seo');
      if (seo) { f.seo = seo; f.hint = el.getAttribute('data-ab-hint') || ''; }

      out.push(f);
    });
    return out;
  }

  // The lists inside the item that the editor may grow. The composer writes one hidden marker for
  // each (PageComposer.ListMarkers), empty or not: an empty body draws no paragraph, so without the
  // marker the editor would have nothing to hang an "Add a paragraph" button on.
  function lists() {
    var out = [], all = d.querySelectorAll('[data-ab-list]');
    for (var i = 0; i < all.length; i++) {
      out.push({ address: all[i].getAttribute('data-ab-list'),
                 each: all[i].getAttribute('data-ab-each') || 'Item',
                 multiline: all[i].hasAttribute('data-ab-multiline'),
                 // A list of objects: which field of a new entry the cursor goes to.
                 first: all[i].getAttribute('data-ab-first') || null });
    }
    return out;
  }

  // One place that says hello, so the three moments it happens - load, DOMContentLoaded, and
  // the editor asking again - cannot drift into reporting different things.
  function ready() {
    send({ type: 'ab:ready', url: w.location.pathname, fields: fields(), lists: lists() });
  }

  // The size of the hole a picture goes into, so somebody choosing one knows what will be
  // cropped away. Taken from the width/height the renderer wrote, which is the shape the layout
  // reserves; a background block carries none, so its drawn box answers instead.
  //
  // Which of the two it was matters to the editor, so it is reported. A written width is the
  // layout's own promise and is the same at every screen size; a measured box is only what this
  // frame happened to be showing - reload the preview at Phone 390 and the same field measures
  // a third of the width. The editor says "about" for those rather than quoting them as fact.
  function shape(el) {
    var w = +el.getAttribute('width'), h = +el.getAttribute('height');
    if (w && h) return { w: w, h: h, from: 'attr' };
    var r = el.getBoundingClientRect();
    w = Math.round(r.width); h = Math.round(r.height);
    return w && h ? { w: w, h: h, from: 'box' } : null;
  }

  // Pages sit at three depths and each one is stamped with its own way back to the site root.
  function root() {
    var el = d.querySelector('[data-ab-root]');
    return el ? el.getAttribute('data-ab-root') : '';
  }

  function send(msg) {
    msg.url = w.location.pathname;
    w.parent.postMessage(msg, w.location.origin);
  }

  w.addEventListener('message', function (e) {
    // Only the editor, and only from this same site.
    if (e.origin !== w.location.origin || !e.data) return;

    if (e.data.type === 'ab:list') { ready(); return; }
    if (e.data.type !== 'ab:text' && e.data.type !== 'ab:img') return;

    var value = e.data.type === 'ab:img' ? e.data.file : e.data.value;
    each(function (el, address, kind) {
      if (address === e.data.address) write(el, kind, value);
    });
  });

  // CTRL DE CHON, BAM THUONG DE DUNG THU TRANG.
  //
  // Truoc day moi cu bam trong khung xem truoc deu bi bat lai de chon o soan, va lap luan cu la
  // "lien ket se dua khung di cho ma cot trai khong biet; danh sach trang la cach de di". Dung
  // ve ky thuat va sai ve cai nguoi dung dang lam: ho dang xem mot TRANG WEB. Bam vao menu thi
  // phai chuyen trang, bam vao mot tab thi phai doi tab. Khong lam duoc thi khong biet cai minh
  // vua sua trong nhung trang thai khac cua trang trong nhu the nao.
  //
  // Nen: giu Ctrl (hoac Cmd) roi bam = chon de sua. Bam thuong = trang chay dung nhu that.
  function held(e) { return e.ctrlKey || e.metaKey; }

  d.addEventListener('click', function (e) {
    if (!held(e)) return;              // de trang tu xu ly: chuyen trang, doi tab, mo dong...
    var el = e.target;
    while (el && el !== d.body) {
      var a = attr(el);
      if (a) {
        e.preventDefault();
        e.stopPropagation();
        mark(el);
        send({ type: 'ab:pick', address: a.address });
        return;
      }
      el = el.parentNode;
    }
  }, true);

  // Di sang trang khac ma van con o soan.
  //
  // Bo ghep chi gan tep nay vao trang khi duoc hoi kem ?edit=1. Mot lien ket thuong se dua khung
  // toi mot trang KHONG co tham so do, va cau noi im lang: khung van hien trang dung, con cot
  // trai dung lai o trang truoc va khong ai biet vi sao. Nen giu tham so lai khi di trong cung
  // mot site.
  //
  // Lien ket ra ngoai thi mo tab moi. Do khong phai "y nhu web that" mot cach may moc, nhung neu
  // de khung di ra mot site khac thi ca trinh soan bien mat, va chang ai co y dinh do khi bam.
  d.addEventListener('click', function (e) {
    if (held(e) || e.defaultPrevented || e.button !== 0 || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || a.hasAttribute('download') || a.getAttribute('target')) return;

    var href = a.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#') return;                 // neo trong trang: de nguyen

    var u;
    try { u = new w.URL(a.href, d.baseURI); } catch (err) { return; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return;   // mailto:, tel:, ...

    e.preventDefault();
    if (u.origin !== w.location.origin) { w.open(u.href, '_blank', 'noopener'); return; }
    u.searchParams.set('edit', '1');
    w.location.href = u.href;
  }, true);

  // Trong luc giu Ctrl thi moi ve vien quanh thu sua duoc — khong thi nguoi dung khong doan noi
  // cho nao bam duoc. Nha phim ra la vien tat, ke ca khi cua so mat tieu diem giua chung (giu
  // Ctrl roi Alt-Tab di thi keyup khong bao gio toi).
  function pickable(on) {
    if (on) d.documentElement.setAttribute('data-ab-pickable', '');
    else d.documentElement.removeAttribute('data-ab-pickable');
  }
  d.addEventListener('keydown', function (e) { if (held(e)) pickable(true); });
  d.addEventListener('keyup', function (e) { if (!held(e)) pickable(false); });
  w.addEventListener('blur', function () { pickable(false); });

  var marked = null;
  function mark(el) {
    if (marked) marked.removeAttribute('data-ab-on');
    marked = el;
    if (el) el.setAttribute('data-ab-on', '');
  }

  // The outline is the only thing this file adds to the page's appearance, and it is only ever
  // in the frame - a visitor who types ?edit=1 gets the script, but nothing draws until the
  // editor sends a message, and there is no editor.
  //
  // Moi bo chon duoi day deu bat dau bang [data-ab-pickable]: vien chi ve TRONG LUC giu Ctrl.
  // Truoc day vien ve moi luc di chuot qua, va no dung: luc ay bam la chon. Gio bam thuong la
  // dung thu trang, nen mot vien "sua duoc" ve san suot ca buoi la mot loi hua sai.
  var style = d.createElement('style');
  style.textContent =
    '[data-ab-pickable] [data-ab-t]:hover,[data-ab-pickable] [data-ab-lead]:hover,' +
    '[data-ab-pickable] [data-ab-lines]:hover,[data-ab-pickable] [data-ab-pick]:hover,' +
    '[data-ab-pickable] [data-ab-date]:hover' +
    '{outline:1px dashed rgba(31,106,68,.55);outline-offset:2px;cursor:text}' +
    // A picture gets a solid outline and a pointer, not a text cursor: you are not going to
    // type into it, you are going to choose one.
    '[data-ab-pickable] [data-ab-img]:hover' +
    '{outline:2px solid rgba(31,106,68,.8);outline-offset:2px;cursor:pointer}' +
    '[data-ab-on]{outline:2px solid #1f6a44 !important;outline-offset:2px}';
  d.head.appendChild(style);

  // The editor may be listening before this runs or after; say hello, and answer ab:list too.
  if (d.readyState === 'loading') {
    d.addEventListener('DOMContentLoaded', function () { ready(); });
  } else {
    ready();
  }
}(window));
