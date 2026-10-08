/*
  The editor's half of the two-column screen. Its opposite number is wwwroot/admin/edit-bridge.js,
  which carries the message contract both sides are written against.

  The left column is built from what the page reports, not from anything known here. That is what
  keeps it true: a page that gains an address gains a field, with nothing to remember to update.
*/
(function () {
  'use strict';

  var root = document.querySelector('.ed');
  var frame = document.getElementById('ed-frame');
  var stage = document.getElementById('ed-stage');
  var list = document.getElementById('ed-fields');
  var urlOut = document.getElementById('ed-url');
  var picker = document.getElementById('ed-page');
  var saveBtn = document.getElementById('ed-save');
  var saveNote = document.getElementById('ed-save-note');
  var shelf = document.getElementById('ed-shelf');
  var shelfList = document.getElementById('ed-shelf-list');
  var shelfFile = document.getElementById('ed-shelf-file');
  var shelfNote = document.getElementById('ed-shelf-note');
  var shelfFit = document.getElementById('ed-shelf-fit');
  var token = document.querySelector('input[name=__RequestVerificationToken]').value;

  var inputs = {};              // address -> the input showing it
  var shapes = {};              // address -> the slot an image field fills, when the page said
  var dirty = {};               // address -> the value waiting to be written
  var width = 1440;
  var choosing = null;          // the image field the picture shelf is open for

  // Said on the screen rather than only in the handover document, and said once: the file input
  // enforces the same list, and two lists drift.
  var FORMATS = 'JPG, PNG, WebP or GIF, up to 20 MB.';

  function send(msg) {
    if (frame.contentWindow) frame.contentWindow.postMessage(msg, location.origin);
  }

  function post(url, body) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', RequestVerificationToken: token },
      body: JSON.stringify(body),
    }).then(function (r) { return r.json(); });
  }

  /* ---- saving ------------------------------------------------------------------------ */

  function mark(address, value) {
    dirty[address] = value;
    var n = Object.keys(dirty).length;
    saveBtn.disabled = false;
    saveBtn.textContent = n === 1 ? 'Save 1 change' : 'Save ' + n + ' changes';
    saveNote.textContent = '';
  }

  function clean() {
    dirty = {};
    saveBtn.disabled = true;
    saveBtn.textContent = 'Save changes';
  }

  // The same URL with a placeholder id swapped for the slug it became. The placeholders are
  // minted by the server and cannot occur in anything else on the page, so a plain replace is
  // safe; a page with no id in it comes back untouched.
  function moved(url, renamed) {
    if (!renamed) return url;
    Object.keys(renamed).forEach(function (was) {
      url = url.split(was).join(renamed[was]);
    });
    return url;
  }

  // Resolves to the server's answer, or to null when nothing reached it - never rejects, so a
  // caller chaining something after the save can ask "did it save?" without a stray unhandled
  // rejection on the ordinary click path.
  //
  // { reload: false } skips reloading the frame. A list button saves the pending edits and THEN
  // changes the list, and each wanting its own reload is two navigations racing: the second one
  // can land before the first has finished and the column is rebuilt from a page that was
  // already out of date. The caller reloads once, at the end.
  function save(opts) {
    var reload = !(opts && opts.reload === false);
    var edits = Object.keys(dirty).map(function (a) { return { address: a, value: dirty[a] }; });
    if (!edits.length) return Promise.resolve({ saved: 0 });

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
    return post('/Admin/Edit/Save', edits).then(function (r) {
      clean();
      saveNote.textContent = r.saved + (r.saved === 1 ? ' change saved' : ' changes saved');
      if (r.rejected && r.rejected.length) {
        saveNote.textContent += ' · ' + r.rejected.length + ' could not be written';
      }
      // Reload rather than trust the patched copy. A picture that replaced a coloured square, or
      // a word that also appears in a heading built by the server, only comes out right when the
      // page is built again - and after a save the page on disk is the truth.
      //
      // Sometimes that truth is at a different address: naming a new item for the first time
      // turns new-3f9a2c into a real slug, and the frame is still pointed at the old one.
      if (reload) frame.src = moved(frame.src, r.renamed);
      return r;
    }).catch(function () {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save changes';
      saveNote.textContent = 'Could not reach the server. Nothing was saved.';
      return null;
    });
  }

  /* ---- the lists inside an item: paragraphs, tags ------------------------------------ */

  var itemLists = [];       // what the page reported: [{ address, each, multiline, first }]
  var revealNext = null;    // an address to scroll to and focus once the page comes back

  // The entry of a list that a box belongs to: "news.items.0.body.3" is entry 3 of the body,
  // and so are "projects.albums.0.photos.3.c" and ".image" - one photo, two boxes. Entries of a
  // list inside an entry (a section's photos) belong to the INNER list's entries, and to the
  // outer entry as well, which is what lets a section's buttons go after its last photo.
  function entryIn(l, address) {
    if (address.indexOf(l.address + '.') !== 0) return null;
    var rest = address.slice(l.address.length + 1);
    var m = /^(\d+)(\.|$)/.exec(rest);
    return m ? l.address + '.' + m[1] : null;
  }

  // The entries of a list, in order, each with the boxes it owns - counted from the boxes this
  // column was given, so the number and the boxes cannot disagree.
  function entriesOf(l) {
    var by = {};
    Object.keys(inputs).forEach(function (a) {
      var e = entryIn(l, a);
      if (e) (by[e] = by[e] || []).push(a);
    });
    return Object.keys(by).sort(function (a, b) { return +a.split('.').pop() - +b.split('.').pop(); })
      .map(function (e) { return { address: e, boxes: by[e] }; });
  }

  // The box that speaks for an entry: the one the table names, or the entry itself (a string).
  function headBox(l, entry) {
    return l.first && inputs[entry + '.' + l.first] ? entry + '.' + l.first : entry;
  }

  /**
   * Adds, removes or moves one entry, written straight away.
   *
   * The pending edits go first, and only if the person agrees. Rebuilding the column after the
   * list changes reads every box back from the page; an edit still waiting in `dirty` would come
   * back showing its old value while the new one sat unseen behind it, and the next Save would
   * write something the screen was not showing.
   */
  function listOp(address, op, reveal) {
    var pending = Object.keys(dirty).length;
    if (pending && !confirm('Save your ' + pending + (pending === 1 ? ' change' : ' changes') +
                            ' first? The list is changed straight away, so they have to be saved before it.')) {
      return;
    }
    (pending ? save({ reload: false }) : Promise.resolve({ saved: 0 })).then(function (r) {
      if (!r) return;                                   // the save did not reach the server
      return post('/Admin/Edit/List', { address: address, op: op }).then(function (res) {
        if (!res || !res.ok) {
          saveNote.textContent = (res && res.error) || 'That could not be changed.';
          return;
        }
        revealNext = reveal || null;
        saveNote.textContent = op === 'append' ? 'Added.' : op === 'remove' ? 'Removed.' : 'Moved.';
        // One reload, whether or not there was a save before it - and at the address the page
        // has now, if naming a new item for the first time just moved it.
        var next = moved(frame.src, r.renamed);
        if (next === frame.src) frame.contentWindow.location.reload();
        else frame.src = next;
      });
    }).catch(function () {
      saveNote.textContent = 'Could not reach the server. Nothing was changed.';
    });
  }

  function tiny(text, title, onClick, cls) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'ed-mini' + (cls ? ' ' + cls : '');
    b.textContent = text;
    b.title = title;
    b.addEventListener('click', onClick);
    return b;
  }

  // The buttons for every list the page reported: under each entry, and one "Add" after the last
  // entry - or at the end of the item's group when there are none yet, which is the brand-new
  // article's case and the reason all of this exists.
  // Where an entry's buttons go: after the last of its boxes in the column - after a photo's
  // caption, after a section's last photo - so they read as belonging to all of it.
  function lastCard(boxes) {
    var cards = boxes.map(function (a) { return inputs[a].closest('.ed-field'); }).filter(Boolean);
    cards.sort(function (x, y) { return x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1; });
    return cards[cards.length - 1];
  }

  function drawLists() {
    // Inner lists first, so that an outer entry's row lands after the inner list's "Add" button
    // rather than between its last photo and that button.
    itemLists.slice().sort(function (a, b) { return b.address.length - a.address.length; }).forEach(function (l) {
      var entries = entriesOf(l);
      var word = l.each.toLowerCase();
      var reveal = function (n) { var e = l.address + '.' + n; return l.first ? e + '.' + l.first : e; };

      entries.forEach(function (en, i) {
        var a = en.address;
        var card = lastCard(en.boxes);
        if (!card) return;
        var row = document.createElement('div');
        row.className = 'ed-listrow';
        if (l.first) row.setAttribute('data-entry', a);
        if (i > 0) row.appendChild(tiny('↑', 'Move this ' + word + ' up', function () { listOp(a, 'up', reveal(i - 1)); }));
        if (i < entries.length - 1) row.appendChild(tiny('↓', 'Move this ' + word + ' down', function () { listOp(a, 'down', reveal(i + 1)); }));
        row.appendChild(tiny('Remove', 'Remove this ' + word, function () {
          var head = inputs[headBox(l, a)];
          var v = head ? String(head.value || '').trim() : '';
          if (!confirm('Remove this ' + word + '?' + (v ? '\n\n"' + v.slice(0, 120) + (v.length > 120 ? '…' : '') + '"' : ''))) return;
          listOp(a, 'remove', null);
        }, 'ed-mini-danger'));
        // After the card, or after an inner list's own Add button that already sits there.
        var after = card;
        while (after.nextSibling && after.nextSibling.classList &&
               (after.nextSibling.classList.contains('ed-add') || after.nextSibling.classList.contains('ed-listrow')))
          after = after.nextSibling;
        if (l.first) after.parentNode.insertBefore(row, after.nextSibling);
        else card.appendChild(row);
      });

      var add = tiny('Add a ' + word, 'Add a ' + word + ' at the end', function () {
        listOp(l.address, 'append', reveal(entries.length));
      }, 'ed-add');
      add.setAttribute('data-list', l.address);

      if (entries.length) {
        var lastEn = entries[entries.length - 1];
        var last = lastCard(lastEn.boxes);
        var after = last;
        while (after.nextSibling && after.nextSibling.classList &&
               (after.nextSibling.classList.contains('ed-add') || after.nextSibling.classList.contains('ed-listrow')))
          after = after.nextSibling;
        after.parentNode.insertBefore(add, after.nextSibling);
      } else {
        // No entries. After the boxes of the item that holds the list, when it has any on the
        // screen - a section with no photos yet gets "Add a photo" under its own text, not at
        // the far end of the chapter.
        var holder = l.address.slice(0, l.address.lastIndexOf('.'));
        var own = Object.keys(inputs).filter(function (a) { return a.indexOf(holder + '.') === 0; });
        var at = own.length ? lastCard(own) : null;
        if (at) {
          var after2 = at;
          while (after2.nextSibling && after2.nextSibling.classList &&
                 (after2.nextSibling.classList.contains('ed-add') || after2.nextSibling.classList.contains('ed-listrow')))
            after2 = after2.nextSibling;
          after2.parentNode.insertBefore(add, after2.nextSibling);
          return;
        }
        // Otherwise put it in the group the list's document belongs to.
        var head = group(l.address);
        var sec = Array.prototype.find.call(list.querySelectorAll('.ed-group'), function (s) {
          return s.querySelector('summary').textContent === head;
        });
        (sec ? sec.querySelector('div') : list).appendChild(add);
      }
    });
  }

  /* ---- the picture shelf -------------------------------------------------------------- */

  function openShelf(address) {
    choosing = address;
    shelf.hidden = false;
    shelfNote.textContent = '';
    shelfList.innerHTML = '';

    // The size advice, said again at the moment it is acted on.
    //
    // It is already under the field, but this panel covers the whole preview and the field with
    // it - and this is where the file gets picked, or dragged out of a folder. Its own element
    // rather than the note below: that one is a status line, and "Uploading photo.jpg…" would
    // wipe the numbers just as somebody went looking for them.
    var s = shapes[address];
    shelfFit.textContent = s ? fits(s) + '. ' + upload(s) + '. ' + FORMATS : FORMATS;
    fetch('/Admin/Edit/Pictures', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(fillShelf)
      .catch(function () { shelfNote.textContent = 'Could not read the picture library.'; });
  }

  function closeShelf() {
    choosing = null;
    shelf.hidden = true;
  }

  function fillShelf(pictures) {
    shelfList.innerHTML = '';

    // "No picture" is a choice, not an absence: every image field starts empty and draws a
    // placeholder, and putting the wrong photograph in has to be undoable from the same place.
    shelfList.appendChild(tile({ name: '', url: '', kb: 0 }, 'No picture'));
    pictures.forEach(function (p) { shelfList.appendChild(tile(p, p.name)); });

    if (!pictures.length) {
      shelfNote.textContent = 'The library is empty. Add a picture with the button above.';
    }
  }

  function tile(picture, caption) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'ed-tile' + (picture.name ? '' : ' is-none');
    if (picture.url) {
      var img = document.createElement('img');
      img.src = picture.url;
      img.alt = '';
      img.loading = 'lazy';
      b.appendChild(img);
    }
    var cap = document.createElement('span');
    cap.textContent = caption;
    b.appendChild(cap);
    b.addEventListener('click', function () { choose(picture.name); });
    return b;
  }

  function choose(name) {
    if (!choosing) return;
    var address = choosing;
    var input = inputs[address];
    if (input) {
      input.value = name;
      showThumb(input, name);
    }
    mark(address, name);
    send({ type: 'ab:img', address: address, file: name });
    closeShelf();
  }

  function upload(file) {
    if (!file) return;
    shelfNote.textContent = 'Uploading ' + file.name + '…';
    var form = new FormData();
    form.append('file', file);
    form.append('__RequestVerificationToken', token);
    fetch('/Admin/Edit/Upload', { method: 'POST', body: form })
      .then(function (r) { return r.json(); })
      .then(function (r) {
        if (r.error) { shelfNote.textContent = r.error; return; }
        shelfNote.textContent = '';
        choose(r.name);
      })
      .catch(function () { shelfNote.textContent = 'The upload did not finish.'; });
  }

  function showThumb(input, name) {
    var box = input.parentNode.querySelector('.ed-thumb');
    if (!box) return;
    box.innerHTML = '';
    if (name) {
      var img = document.createElement('img');
      img.src = '/_media/' + name;
      img.alt = '';
      box.appendChild(img);
    } else {
      var none = document.createElement('span');
      none.textContent = 'No picture';
      box.appendChild(none);
    }
  }

  /* ---- the preview, and its width ---------------------------------------------------- */

  // The frame is a real browser window of that width, then scaled to fit the column. Narrowing
  // the column instead would tell the page it is on a 900px screen, and 390 is the whole point:
  // the layout has a phone breakpoint and the client has to be able to see it.
  function fit() {
    var room = stage.clientWidth - 2;
    var scale = Math.min(1, room / width);
    // transform-origin is the top left corner, so the element still occupies its full unscaled
    // width in the layout and centring has to be done by hand, against the width you can see.
    var shift = Math.max(0, (room - width * scale) / 2);
    frame.style.width = width + 'px';
    frame.style.transform = 'translateX(' + shift + 'px) scale(' + scale + ')';
    frame.style.height = (stage.clientHeight - 2) / scale + 'px';
  }

  function show(path) {
    root.setAttribute('data-ed-page', path);
    urlOut.textContent = path;
    document.querySelector('.ed-open').setAttribute('href', path);
    list.innerHTML = '';
    list.appendChild(note('Loading the page…'));
    inputs = {};
    frame.src = path + '?edit=1';
    history.replaceState(null, '', '?page=' + encodeURIComponent(path));
    listsFor(path);
  }

  /**
   * Khung xem truoc tu di sang trang khac - nguoi dung bam mot lien ket trong do.
   *
   * `show()` la duong di mot chieu: no DAT src cho khung. Duong nay la chieu nguoc lai, va no
   * chi duoc cap nhat nhung gi noi "dang o trang nao" - KHONG duoc dat lai frame.src, vi khung
   * da o dung cho roi; dat lai la tai trang hai lan va vut mat cuon trang cua nguoi ta.
   *
   * O chon trang cung phai doi theo. Neu trang moi khong co trong danh sach (mot bai tin le
   * chang han) thi de o chon trong: noi sai ten trang dang mo con te hon la khong noi gi.
   */
  function moved_to(path) {
    if (!path || path === root.getAttribute('data-ed-page')) return;
    root.setAttribute('data-ed-page', path);
    urlOut.textContent = path;
    document.querySelector('.ed-open').setAttribute('href', path);
    inputs = {};
    var has = false;
    for (var i = 0; i < picker.options.length; i++) {
      if (picker.options[i].value === path) { has = true; break; }
    }
    picker.value = has ? path : '';
    history.replaceState(null, '', '?page=' + encodeURIComponent(path));
    listsFor(path);
  }

  /**
   * "Danh sach nay con them/bot duoc o dau" - mot dong duoi o chon trang.
   *
   * Man hinh nay sua CAI MOT MUC NOI. Them mot muc, bo mot muc, doi thu tu la viec cua man hinh
   * Content, va do la mot chia tach hop ly: mot cai la bien tap, mot cai la quan ly danh sach.
   * Nhung nguoi dang dung mau o day khong co cach nao doan ra man hinh kia ton tai - ho nhin mot
   * trang Colors day mau va khong thay cho nao them mau. Nen noi ra, ngay o cho ho dang dung.
   *
   * Tinh lai moi lan doi trang chu khong ve mot lan luc dung trang: khung xem truoc gio tu di
   * sang trang khac duoc, va cau tra loi doi theo trang.
   */
  var KINDS = (function () {
    var el = document.getElementById('ed-kinds');
    try { return el ? JSON.parse(el.textContent) : []; } catch (e) { return []; }
  }());
  var lists = document.getElementById('ed-lists');

  function listsFor(path) {
    if (!lists) return;
    // Trang chu la trang cua NHIEU danh sach (bon ke tren trang chu, thu vien anh, cac tab...).
    // Cac trang khac thi khop theo tien to: /colors/an-dark-bronze/ van la mot mau.
    var hit = KINDS.filter(function (k) {
      return k.add && (k.page === '/' ? path === '/' : path.indexOf(k.page) === 0);
    });
    if (!hit.length) { lists.hidden = true; return; }
    lists.hidden = false;
    lists.innerHTML = 'Add, reorder or remove: ' + hit.map(function (k) {
      return '<a href="/Admin/Collection/Items?id=' + encodeURIComponent(k.key) + '">' +
             esc(k.label) + '</a>';
    }).join(', ');
  }

  function esc(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function note(text) {
    var p = document.createElement('p');
    p.className = 'ed-empty';
    p.textContent = text;
    return p;
  }

  /* ---- the fields -------------------------------------------------------------------- */

  // An address reads document.rest.of.the.path, so the first piece names the file the words live
  // in. Grouping by it turns a flat list of sixty addresses into "Site" and "Products" and
  // "About" - the same shape the client already has in their head.
  // The one group that is on every page: the wordmark, the menu, the footer. It goes last and
  // starts closed, because it is the same on all fifteen pages and what a page is ABOUT is why
  // somebody opened this screen.
  var CHROME = 'Site';

  // What a search engine shows, which is the one part of a page that is not ON the page. Three
  // boxes the composer hands over in a hidden block; see SeoFields in PageComposer.cs.
  //
  // Its own group rather than sitting among the page's words, because the address would put it
  // there under the wrong name: an article's search title addresses news.json, so it would file
  // itself under "News" between the headline and the body, and read as one more thing the page
  // displays. It does not display anywhere. The group goes after the page's own words and before
  // the chrome, and it starts OPEN: the last feature this editor grew was already built and
  // nobody could find it, which is its own kind of not working.
  var SEO = 'Search result';

  var SEO_WORDS = { title: 'Search title', description: 'Search description',
                    image: 'Share picture' };

  var SEO_HELP = {
    title: 'The whole title, exactly as the browser tab shows it. Nothing is added after it.',
    description: 'The sentence under the title in a search result.',
    image: 'Shown when somebody shares this page in a message or a post.',
  };

  // Where a search result usually cuts, which is GOOGLE'S habit and not a limit this software
  // applies: type 300 characters and all 300 are saved and served. Said as advice on the screen
  // for the same reason - a counter that reads "160 / 160" claims an enforcement that does not
  // exist, and the first client to lose a sentence to it would be right to be angry.
  var SEO_CUT = { title: 60, description: 160 };

  function group(address) {
    var name = address.split('.')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  // The address is a path into a JSON file, and the client was promised they would never have to
  // look at one. "nav.0.label" is three pieces of plumbing saying one thing: the second item in
  // the menu. Number from one, because nobody outside this trade counts from zero. The exact
  // address stays as the field's tooltip - it is what you need when something does not update
  // and you are asking why.
  //
  // The role word - label, name, title - is dropped only when the thing it belongs to has
  // nothing else: a menu item IS its label, so "Nav #1 label" says it twice. A product family
  // has a name, a tagline and a picture, and there "Categories #1" on the name box reads like a
  // heading for all three. The comment here used to claim that rule; the code dropped the word
  // whenever the path had a number in it, which is not the same thing at all.
  var ROLE = /^(label|lead|tail|text|title|heading|name)$/;

  // What each list is called, in the client's words rather than the file's.
  //
  // Numbering an item is only half the job: "Categories #1 name" still makes somebody work out
  // that a category is a product family, and "Items #3 title" appears on five different screens
  // meaning five different things. The key is the path with every index written as N, so a list
  // inside a list gets its own word - a product family holds products, a document group holds
  // documents - and the label says both: "Product family #1, Product #3 spec".
  //
  // The first ten are the same ten lists the Content screen offers, and each takes the word the
  // site itself uses for one of them - the Content screen's label, in the singular, unless
  // something else on the same screen already owns that word:
  //
  //   Products      -> Product family   the list inside it is where "Product" goes
  //   Colors        -> Color
  //   News          -> Article          "News" has no singular; the page calls them articles
  //   Projects      -> Project
  //   Documents     -> Document group   the list inside it is where "Document" goes
  //   Gallery       -> Picture          a gallery holds pictures, not "galleries"
  //   Highlights    -> Highlight
  //   Applications  -> Tab              the list IS the tabs; "Application" is one inside a tab
  //   Export routes -> Export route
  //   Factories     -> Factory
  //
  // If the Content screen's labels are ever renamed (CollectionController.Kinds), rename these
  // with them. Everything below the line is a list the Content screen does not show at all.
  //
  // A list with no entry here falls back to its key, which is what every list used to do - the
  // label stays readable, it just goes back to sounding like a database. tools/labels.js walks
  // every page and reports which lists have landed in that fallback.
  var WORDS = {
    'products.categories': 'Product family',
    'colors.items': 'Color',
    'news.items': 'Article',
    'projects.albums': 'Project',
    'documents.categories': 'Document group',
    'gallery.items': 'Picture',
    'home-news.items': 'Card',
    'home-products.items': 'Card',
    'home-colors.items': 'Card',
    'home-projects.items': 'Card',
    'applications.tabs': 'Tab',
    'globe.routes': 'Export route',
    'factories.sites': 'Factory',

    'products.categories.N.items': 'Product',
    'documents.categories.N.items': 'Document',
    'applications.tabs.N.items': 'Application',
    'news.items.N.tags': 'Tag',
    'news.items.N.body': 'Paragraph',
    'gallery.tags': 'Tag',
    'gallery.intro': 'Paragraph',
    'colors.filters': 'Filter',
    'colors.filters.N.options': 'Option',
    'projects.albums.N.photos': 'Photo',
    'contact.offices': 'Office',
    'contact.offices.N.lines': 'Line',
    'contact.routes': 'Enquiry type',
    'contact.routes.N.fields': 'Field',
    'contact.consent': 'Consent line',
    'about.chapters': 'Chapter',
    'about.chapters.N.body': 'Paragraph',
    'about.figures.tabs': 'Tab',
    'about.figures.tabs.N.rows': 'Row',
    'about.figures.tabs.N.rows.N': 'Cell',
    'site.nav': 'Menu item',
    'site.footer.columns': 'Footer column',
    'site.footer.columns.N.links': 'Link',
  };

  // The same for the keys that are not lists. Only the ones that are not already English: "spec"
  // and "lede" and "cta" are what a developer types, not what a client would say out loud.
  var LEAF = {
    blurb: 'description',
    c: 'caption',
    cta: 'call to action',
    desc: 'description',
    excerpt: 'summary',
    eyebrow: 'small heading',
    familySpecs: 'finish family',
    family: 'finish family',
    figures: 'specs table',
    // A factory's kind - Factory or Warehouse - which the map draws as a round or a square pin.
    kind: 'type',
    lang: 'language',
    // Not "intro": about.json has an "intro" of its own, and two boxes on one screen with the
    // same label is worse than one box with a word from the file.
    lede: 'opening line',
    meta: 'detail',
    n: 'name',
    output: 'capacity',
    // A document's own PDF, uploaded from the editor (08/10/2026).
    file: 'PDF file',
    // A factory's photos. The first is on its card beside the map; all three show when somebody
    // clicks its pin. Named for where they appear, since "photo 2" alone says nothing.
    photo: 'photo (card and pop-up)',
    photo2: 'photo 2 (pop-up)',
    photo3: 'photo 3 (pop-up)',
    // The one that moves the pin. "province" below is only the words printed under the name,
    // and a client who changed it to Ha Noi reasonably expected the pin to follow - it did not.
    place: 'location on the map',
    region: 'province as written',
    share: 'share of exports',
    since: 'in operation since',
    spec: 'specification',
    std: 'standard',
    // "Exposure" is what the specification table on the page calls it, and the client reads that
    // table; "use" is what the file calls it, and nobody reads the file.
    use: 'exposure',
  };

  // Read by tools/labels.js, which walks every page and names the lists with no entry above.
  window.AB_WORDS = WORDS;

  function word(shape, key) {
    return WORDS[shape] || plain(key);
  }

  // camelCase is a third vocabulary of its own - "familySpecs" is not a word in any language -
  // so a key with no entry above at least comes apart into the two words it is made of. Only the
  // capital that was joining them comes down: some keys are names the client wrote, and
  // "Anodised" has to stay "Anodised".
  function plain(key) {
    return LEAF[key] || key.replace(/[-_]/g, ' ')
      .replace(/([a-z0-9])([A-Z])/g, function (_, a, b) { return a + ' ' + b.toLowerCase(); });
  }

  /** Addresses whose parent holds nothing else - those are the ones that lose their role word. */
  function alone(fields) {
    var count = {};
    fields.forEach(function (f) {
      var parent = f.address.slice(0, f.address.lastIndexOf('.'));
      count[parent] = (count[parent] || 0) + 1;
    });
    var out = {};
    fields.forEach(function (f) {
      out[f.address] = count[f.address.slice(0, f.address.lastIndexOf('.'))] === 1;
    });
    return out;
  }

  // What to upload, in pixels, rather than leaving somebody to work it out from the slot.
  //
  // Twice the slot: a phone or a laptop with a retina screen draws two device pixels for every
  // one the layout counts, and a picture sent at slot size is visibly soft on all of them.
  //
  // Capped at 2000 on the long edge, because nothing here resizes. The server stores what it is
  // given and the page serves it; a 6000px photograph on the hero would cost every visitor
  // several megabytes to look at a 1240px band. 2000 is the number the handover document has
  // always given, and now the screen gives it too.
  //
  // Never below the slot - a background band that measured 1240 wide already needs 1240.
  var CAP = 2000;

  function advise(s) {
    var w = s.w * 2, h = s.h * 2;
    var long = Math.max(w, h);
    if (long > CAP) { w = w * CAP / long; h = h * CAP / long; }
    return { w: Math.max(s.w, tidy(w)), h: Math.max(s.h, tidy(h)) };
  }

  // To the nearest ten. "680 × 600" is a size somebody types into a cropping tool; "679 × 599"
  // reads as a measurement they have to match exactly, which is not what is being asked.
  function tidy(v) { return Math.round(v / 10) * 10; }

  function size(s) { return s.w + ' × ' + s.h + ' px'; }

  /**
   * The slot, in one line.
   *
   * "Fills" for a size the layout wrote down - it is the same at every screen width, and saying
   * it flatly is correct. "About" for one the preview measured, which is only true of the width
   * the preview happened to be showing; the same field reloaded at Phone 390 measures a third
   * as wide. Two words apart, and they are the difference between a fact and a snapshot.
   */
  function fits(s) {
    return (s.from === 'box' ? 'About ' : 'Fills ') + s.w + ' × ' + s.h + ' here · ' + ratio(s);
  }

  /**
   * What to send, in one line.
   *
   * When the slot is already past the cap - the finish-samples panel is 2400 wide - twice it is
   * not on offer and the advice comes back as the slot itself. Printing "Best upload 2400 x 1000"
   * under "Fills 2400 x 1000" reads like a fault rather than an answer, so that case says the
   * thing it actually means: this one, and no bigger.
   */
  function upload(s) {
    var rec = advise(s);
    return rec.w === s.w && rec.h === s.h
      ? 'Upload at that size, no larger'
      : 'Best upload ' + size(rec);
  }

  function line(text) {
    var b = document.createElement('span');
    b.textContent = text;
    return b;
  }

  // "4:3" rather than 1.333: the number somebody types into a cropping tool. Same rule as
  // Placeholder.Ratio on the server, so the box and the grey rectangle behind it never disagree
  // - a second rule written here would drift from that one within a month.
  function ratio(s) {
    var a = s.w, b = s.h;
    while (b) { var t = b; b = a % b; a = t; }
    var w = s.w / a, h = s.h / a;
    if (w <= 32 && h <= 32) return w + ':' + h;
    return s.w >= s.h ? round2(s.w / s.h) + ':1' : '1:' + round2(s.h / s.w);
  }

  function round2(v) { return Math.round(v * 100) / 100; }

  // Walk the address left to right, keeping the shape - the same path with every index written
  // as N - alongside it, because that shape is what names the list being counted.
  //
  // A key followed by a number is a list: emit its word and the number together. A number with
  // no key in front of it is a list inside a list with no name of its own (a table row holds
  // cells), and the shape has already grown the extra N that names it. Everything else is a
  // plain key, and the last one is the role word if it is one.
  function label(address, drop) {
    var parts = address.split('.');
    var shape = parts[0];
    var out = [];               // { text, num } - num marks a piece that ends in a number
    var tail = '';              // the last key, hung off the end rather than listed
    var droppable = false;

    for (var i = 1; i < parts.length; i++) {
      var p = parts[i];

      if (/^\d+$/.test(p)) {
        // A number with no key in front of it: a list inside a list with no name of its own,
        // such as the cells of a table row. The shape already grew the N that names it.
        out.push({ text: word(shape, last(shape)) + ' #' + (+p + 1), num: true });
        shape += '.N';
        continue;
      }

      shape += '.' + p;
      if (/^\d+$/.test(parts[i + 1] || '')) {
        out.push({ text: word(shape, p) + ' #' + (+parts[i + 1] + 1), num: true });
        shape += '.N';
        i++;
        continue;
      }

      if (i === parts.length - 1 && out.length) {
        tail = plain(p);
        droppable = ROLE.test(p);
      } else {
        out.push({ text: plain(p), num: false });
      }
    }

    // A plain key that the next piece already says: "footer" in front of "Footer column #1".
    // The key is there because the path goes through it, not because the label needs it twice.
    out = out.filter(function (piece, n) {
      var next = out[n + 1];
      return piece.num || !next
          || next.text.toLowerCase().indexOf(piece.text.toLowerCase()) !== 0;
    });

    // A comma wherever a number meets the next piece - "Tab #1 Row #2 Cell #3" is three hashes
    // in a row with nowhere for the eye to stop - and a plain space everywhere else.
    var text = '';
    out.forEach(function (piece, n) {
      if (!n) text = piece.text;
      else text += (piece.num || out[n - 1].num ? ', ' : ' ') + piece.text;
    });
    if (tail && !(drop && droppable)) text += (text ? ' ' : '') + tail;
    if (!text) text = tail;
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function last(shape) {
    var parts = shape.split('.');
    // Skip back over the Ns: the name of an unnamed inner list is the key that started it.
    while (parts.length > 1 && parts[parts.length - 1] === 'N') parts.pop();
    return parts[parts.length - 1];
  }

  function build(fields, reported) {
    // The box the person is in, carried across the rebuild. The frame says hello twice on every
    // load - once when its DOM is ready and once more when the editor asks after 'load' - and each
    // hello rebuilds the column from scratch. So a box that had just been focused ("Add a
    // paragraph" puts the cursor in the new one) was thrown away half a second later by the
    // second rebuild, and the cursor landed nowhere.
    var had = document.activeElement && document.activeElement.getAttribute
      ? document.activeElement.getAttribute('data-address') : null;
    list.innerHTML = '';
    inputs = {};
    shapes = {};
    // Known before any box is drawn: whether a box is a paragraph decides whether it gets room.
    itemLists = reported || [];
    closeShelf();
    if (!fields.length) {
      list.appendChild(note('This page has no editable text yet.'));
      return;
    }

    // One box per address, not per element. A field can appear several times on a page - the
    // wordmark is in the header and the footer, a product family's name is in the hero, in the
    // tile below it and in the band heading - and the page patches every one of them as you
    // type. Two boxes holding the same words is two places to wonder which one is real.
    //
    // And the page's own words first, the site chrome last. The page reports its fields in the
    // order they sit in the document, which puts the header before everything: somebody who
    // clicked Edit on a new product landed on the wordmark and seven menu labels, and had to
    // scroll past thirty-eight boxes to reach the thing they came for. The header and footer are
    // on every page and are edited once a year; what this page is ABOUT is the reason to be here.
    var only = alone(fields);
    var ordered = [], seen = {}, done = {};
    fields.forEach(function (f) {
      if (done[f.address]) return;
      done[f.address] = true;
      var g = f.seo ? SEO : group(f.address);
      if (!seen[g]) { seen[g] = []; ordered.push(g); }
      seen[g].push(f);
    });
    function rank(n) { return n === CHROME ? 2 : n === SEO ? 1 : 0; }
    ordered.sort(function (a, b) { return rank(a) - rank(b); });

    // The site chrome starts closed. It is on every page, it is right where it always is, and
    // leaving it open is what pushed the page's own words off the bottom of the column.
    var box = null;
    ordered.forEach(function (name) {
      var section = document.createElement('details');
      section.className = 'ed-group';
      section.open = name !== CHROME;
      var head = document.createElement('summary');
      head.textContent = name + (name === CHROME ? ' — header and footer'
                               : name === SEO ? ' — what a search engine shows' : '');
      section.appendChild(head);
      box = document.createElement('div');
      section.appendChild(box);
      list.appendChild(section);
      seen[name].forEach(draw);
    });

    // After every box exists: the list buttons hang off the boxes, and "Add" goes after the last.
    drawLists();

    if (had && inputs[had] && inputs[had].type !== 'hidden') inputs[had].focus();

    function draw(f) {
      var field = document.createElement('div');
      field.className = 'ed-field';
      var id = 'f-' + f.address.replace(/[^a-z0-9]+/gi, '-');

      var cap = document.createElement('label');
      cap.setAttribute('for', id);
      cap.textContent = f.seo ? SEO_WORDS[f.seo] : label(f.address, only[f.address]);
      cap.title = f.address;
      field.appendChild(cap);

      // A document's PDF (08/10/2026). The name of the file in use, a link to open it, and a
      // button that uploads a new one. Like a picture, the upload is stored at once and the
      // field changes only on Save - so an upload somebody walks away from changes no page.
      if (f.kind === 'file') {
        field.className = 'ed-field ed-field-file';
        var keep = document.createElement('input');
        keep.type = 'hidden';
        keep.id = id;
        keep.value = f.value;
        keep.setAttribute('data-address', f.address);
        field.appendChild(keep);
        var now = document.createElement('p');
        now.className = 'ed-file-now';
        var showFile = function (name) {
          now.innerHTML = '';
          var used = name || f.fallback;
          var link = document.createElement('a');
          link.href = '/_docs/' + encodeURIComponent(used);
          link.target = '_blank';
          link.rel = 'noopener';
          link.textContent = used;
          now.appendChild(document.createTextNode(name ? 'File: ' : 'No file uploaded yet. The page links to '));
          now.appendChild(link);
        };
        showFile(f.value);
        field.appendChild(now);
        var pick = document.createElement('label');
        pick.className = 'ed-choose ed-upload';
        pick.textContent = 'Upload a PDF';
        var chooser = document.createElement('input');
        chooser.type = 'file';
        chooser.accept = '.pdf,application/pdf';
        pick.appendChild(chooser);
        field.appendChild(pick);
        var state = document.createElement('span');
        state.className = 'ed-slot';
        state.appendChild(line('PDF only, up to 40 MB. The new file is used after Save.'));
        field.appendChild(state);
        chooser.addEventListener('change', function () {
          var file = chooser.files && chooser.files[0];
          if (!file) return;
          state.textContent = 'Uploading ' + file.name + '…';
          var form = new FormData();
          form.append('file', file);
          form.append('__RequestVerificationToken', token);
          fetch('/Admin/Edit/UploadDocument', { method: 'POST', body: form })
            .then(function (r) { return r.json(); })
            .then(function (r) {
              chooser.value = '';
              if (r.error) { state.textContent = r.error; return; }
              keep.value = r.name;
              showFile(r.name);
              state.textContent = 'Uploaded. Press Save to use it.';
              send({ type: 'ab:text', address: f.address, value: r.name });
              mark(f.address, r.name);
            })
            .catch(function () { state.textContent = 'The upload did not finish.'; });
        });
        box.appendChild(field);
        inputs[f.address] = keep;
        return;
      }

      if (f.kind === 'img') {
        field.className = 'ed-field ed-field-img';
        var thumb = document.createElement('div');
        thumb.className = 'ed-thumb';
        field.appendChild(thumb);

        var pick = document.createElement('button');
        pick.type = 'button';
        pick.className = 'ed-choose';
        pick.textContent = 'Choose picture';
        pick.addEventListener('click', function () { openShelf(f.address); });
        field.appendChild(pick);

        // The shape of the hole, so a choice is made knowing what will be cropped away, and
        // under it the size to upload. The page reports the shape rather than the editor
        // guessing: the layout is the only thing that knows, and it differs between a lead
        // article and the cards under it - the same product family is 340 wide on the home
        // page and larger on /products/. Hence "here".
        if (f.shape) {
          shapes[f.address] = f.shape;
          var slot = document.createElement('span');
          slot.className = 'ed-slot';
          slot.appendChild(line(fits(f.shape)));
          slot.appendChild(line(upload(f.shape)));
          field.appendChild(slot);
        }

        // The share picture has no slot on the page to measure - it is never drawn - so what
        // goes here is the one thing worth knowing instead: what it is for, and the shape the
        // messaging apps crop to.
        if (f.seo) {
          var why = document.createElement('span');
          why.className = 'ed-slot';
          why.appendChild(line(SEO_HELP[f.seo]));
          why.appendChild(line('Cropped to about 1.9:1 — 1200 × 630 is the usual size'));
          field.appendChild(why);
        }

        // The file's name is kept, hidden, as the field's value: the shelf writes to it, the
        // thumbnail reads from it, and nothing else has to remember what was chosen.
        var held = document.createElement('input');
        held.type = 'hidden';
        held.id = id;
        held.value = f.value;
        held.setAttribute('data-address', f.address);
        field.appendChild(held);

        box.appendChild(field);
        inputs[f.address] = held;
        showThumb(held, f.value);
        return;
      }

      // A field whose value has to be one of a set is a list, not a box. Typing "satin" where
      // the filter above the listing matches "Satin" takes that finish out of the filter, and
      // nothing anywhere says so - the only fix that holds is not offering the wrong answer.
      //
      // A value the page reports that is NOT in the list stays in the list as its first option:
      // somebody has already typed a wrong one, and hiding it would silently change their data
      // the moment they touched anything else on the page.
      if (f.kind === 'pick' && f.options && f.options.length) {
        var choose = document.createElement('select');
        choose.id = id;
        choose.setAttribute('data-address', f.address);
        var offer = f.options.slice();
        if (offer.indexOf(f.value) < 0) offer.unshift(f.value);
        offer.forEach(function (o) {
          var option = document.createElement('option');
          option.value = o;
          option.textContent = o === '' ? 'Not chosen yet'
                             : o + (f.options.indexOf(o) < 0 ? ' — not on the list' : '');
          choose.appendChild(option);
        });
        choose.value = f.value;
        choose.addEventListener('change', function () {
          send({ type: 'ab:text', address: f.address, value: choose.value });
          mark(f.address, choose.value);
        });
        field.appendChild(choose);
        // The factory map's place: say what choosing it does, because the box beside it that
        // says "province" does not move anything and looks as if it should.
        if (/^factories\.sites\.\d+\.place$/.test(f.address)) {
          var where = document.createElement('span');
          where.className = 'ed-slot';
          where.appendChild(line(f.value ? 'The pin stands in the provincial seat. Choose another province to move it.'
                                         : 'Not on the map yet. Choose a province to put a pin there.'));
          field.appendChild(where);
        }
        box.appendChild(field);
        inputs[f.address] = choose;
        return;
      }

      // An article's date: a date picker, whose value is always "2026-08-19" or empty - the only
      // two shapes the server will take, and the only two the news list can sort. The page shows
      // the same day as "19 August 2026" and changes as the picker does.
      if (f.kind === 'date') {
        var day = document.createElement('input');
        day.type = 'date';
        day.id = id;
        day.value = f.value;
        day.setAttribute('data-address', f.address);
        // Drawn always and shown only while the box is empty: a hint that stayed up after a date
        // was picked told the person the pick had not taken.
        var why = document.createElement('span');
        why.className = 'ed-slot';
        why.appendChild(line('Not dated yet. An article with no date goes to the end of the news list.'));
        why.hidden = !!f.value;
        day.addEventListener('change', function () {
          send({ type: 'ab:text', address: f.address, value: day.value });
          mark(f.address, day.value);
          why.hidden = !!day.value;
        });
        field.appendChild(day);
        field.appendChild(why);
        box.appendChild(field);
        inputs[f.address] = day;
        return;
      }

      // A line break in the value means the address holds several lines; a long value wants room
      // to breathe. Everything else is one line, which is most of them.
      //
      // A search description gets room whether or not it has any words in it yet: it is two
      // sentences by the time it is finished, and an empty one-line box invites one short one.
      //
      // A paragraph gets room whatever it holds: a new one is empty, and an empty one-line box
      // invites one short sentence where a paragraph was meant.
      // A paragraph is an entry of a multiline list; a section's text is a field named "text"
      // inside one. Both are written as sentences.
      var inList = itemLists.some(function (l) { return l.multiline && entryIn(l, f.address) === f.address; });
      var many = f.kind === 'lines' || f.value.length > 70 || f.seo === 'description'
              || inList || /\.sections\.\d+\.text$/.test(f.address);
      var input = document.createElement(many ? 'textarea' : 'input');
      if (!many) input.type = 'text';
      input.id = id;
      input.value = f.value;
      input.setAttribute('data-address', f.address);
      if (many) {
        var rows = Math.min(6, f.value.split('\n').length + 1);
        // Three for a search description even when it is empty: the automatic one sits in
        // grey behind it and runs to three lines, and a two-row box cuts it off - which is
        // the one thing this box exists to show.
        input.rows = f.seo === 'description' ? Math.max(3, rows) : rows;
        // A paragraph is one long line with no breaks in it, so counting breaks gives it two
        // rows however long it is. Size it by length instead - roughly 48 characters a row in
        // this column - between three rows and eight.
        if (inList && inList.multiline) {
          input.rows = Math.min(8, Math.max(3, Math.ceil(f.value.length / 48) + 1));
        }
      }

      // What the page says with this box empty, shown in the box in grey. An empty SEO field is
      // not an empty page - the composer derives a title from the item's own words - and without
      // this the client is deciding whether to override something they cannot see.
      if (f.seo && f.hint) input.placeholder = f.hint;

      var counter = f.seo ? count(f, input) : null;
      input.addEventListener('input', function () {
        send({ type: 'ab:text', address: f.address, value: input.value });
        mark(f.address, input.value);
        if (counter) counter.tell();
      });
      field.appendChild(input);

      if (counter) {
        var help = document.createElement('span');
        help.className = 'ed-slot ed-seo-help';
        help.appendChild(line(SEO_HELP[f.seo]));
        help.appendChild(counter.el);
        field.appendChild(help);
      }

      box.appendChild(field);
      inputs[f.address] = input;
    }
  }

  /**
   * How long what is in the box is, and what happens if it stays that way.
   *
   * Two states worth telling apart when the box is empty, and they are opposites. An item page
   * has something to fall back on - the article's own headline - and the grey text in the box is
   * it. A listing page has nothing: leave it empty and the page goes out with no title at all,
   * which is worth saying in words rather than leaving as an empty box that looks fine.
   */
  function count(f, input) {
    var out = document.createElement('span');
    out.className = 'ed-count';

    function tell() {
      var n = input.value.length;
      out.classList.remove('is-long');

      if (!n) {
        out.textContent = f.hint
          ? 'Empty — the grey words are what this page says now'
          : 'Empty — this page would go out with no ' + SEO_WORDS[f.seo].toLowerCase();
        return;
      }

      var cut = SEO_CUT[f.seo];
      out.textContent = n + (n === 1 ? ' character' : ' characters')
        + (n > cut ? ' — a search result usually cuts at about ' + cut : '');
      if (n > cut) out.classList.add('is-long');
    }

    tell();
    return { el: out, tell: tell };
  }

  // Mot dia chi chi xuat hien SAU khi trang chay xong.
  //
  // Anh nen cua hero la mot vi du: no khong co trong markup, home.js dat dia chi len no sau khi
  // doc xong products.json va chon ho dau tien - tuc la sau ab:ready. Dia chi con DOI khi nguoi
  // xem bam sang ho khac. Truoc day reveal() gap mot dia chi la len thi `return` im lang, va tu
  // phia nguoi dung thi do la "bam vao khong thay gi xay ra" - khong the phan biet voi hong.
  //
  // Nen: hoi lai trang mot lan, roi lam tiep. Dung lai danh sach o giua chung khong lam mat thay
  // doi chua luu - `dirty` giu rieng theo dia chi va khong bi build() dong vao, con gia tri hien
  // trong o thi doc tu chinh trang, ma trang da mang san thay doi dang go.
  var chotim = null;
  function reveal(address) {
    var input = inputs[address];
    if (!input) {
      if (chotim === address) { chotim = null; return; }   // hoi roi van khong co: thoi
      chotim = address;
      frame.contentWindow.postMessage({ type: 'ab:list' }, location.origin);
      return;
    }
    chotim = null;
    var group = input.closest('details');
    if (group) group.open = true;

    // An image field's input is hidden - it holds the file's name - so the thing to scroll to
    // and light up is the card around it.
    var card = input.closest('.ed-field');
    var target = input.type === 'hidden' ? card : input;
    card.scrollIntoView({ block: 'center' });
    if (input.type !== 'hidden') input.focus();
    target.classList.add('is-found');
    setTimeout(function () { target.classList.remove('is-found'); }, 900);
  }

  /* ---- wiring ------------------------------------------------------------------------- */

  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || !e.data) return;
    if (e.data.type === 'ab:ready') {
      moved_to(e.data.url);
      build(e.data.fields || [], e.data.lists || []);
      if (chotim) reveal(chotim);
      // A paragraph just added: take the person straight to its box, cursor in it. Without this
      // the column rebuilds, scrolls back to the top, and the new empty box is somewhere below.
      if (revealNext) { var at = revealNext; revealNext = null; reveal(at); }
    }
    else if (e.data.type === 'ab:pick') reveal(e.data.address);
  });

  picker.addEventListener('change', function () {
    if (Object.keys(dirty).length &&
        !confirm('There are unsaved changes on this page. Leave them behind?')) {
      picker.value = root.getAttribute('data-ed-page');
      return;
    }
    clean();
    show(picker.value);
  });

  saveBtn.addEventListener('click', save);
  document.getElementById('ed-shelf-close').addEventListener('click', closeShelf);
  shelfFile.addEventListener('change', function () { upload(shelfFile.files[0]); shelfFile.value = ''; });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeShelf(); });

  // Nothing is written until Save is pressed, so a closed tab is a lost edit. The browser's own
  // warning is the only one that still appears once the tab is going away.
  window.addEventListener('beforeunload', function (e) {
    if (Object.keys(dirty).length) { e.preventDefault(); e.returnValue = ''; }
  });

  Array.prototype.forEach.call(document.querySelectorAll('.ed-w'), function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('.ed-w').forEach(function (x) { x.classList.remove('is-on'); });
      b.classList.add('is-on');
      width = +b.getAttribute('data-w');
      fit();
    });
  });

  // Lan dau khong di qua show(): khung da mang san src tu markup. Ve mot lan o day.
  listsFor(root.getAttribute('data-ed-page'));

  window.addEventListener('resize', fit);
  frame.addEventListener('load', function () {
    fit();
    // The frame may have finished before this window was listening; ask again rather than wait.
    send({ type: 'ab:list' });
  });
  fit();
}());
