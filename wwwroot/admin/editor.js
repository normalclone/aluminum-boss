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

  function save() {
    var edits = Object.keys(dirty).map(function (a) { return { address: a, value: dirty[a] }; });
    if (!edits.length) return Promise.resolve();

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
      frame.src = moved(frame.src, r.renamed);
    }).catch(function () {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save changes';
      saveNote.textContent = 'Could not reach the server. Nothing was saved.';
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
    lang: 'language',
    // Not "intro": about.json has an "intro" of its own, and two boxes on one screen with the
    // same label is worse than one box with a word from the file.
    lede: 'opening line',
    meta: 'detail',
    n: 'name',
    output: 'capacity',
    region: 'province',
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

  function build(fields) {
    list.innerHTML = '';
    inputs = {};
    shapes = {};
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
      var g = group(f.address);
      if (!seen[g]) { seen[g] = []; ordered.push(g); }
      seen[g].push(f);
    });
    ordered.sort(function (a, b) {
      return (a === CHROME ? 1 : 0) - (b === CHROME ? 1 : 0);
    });

    // The site chrome starts closed. It is on every page, it is right where it always is, and
    // leaving it open is what pushed the page's own words off the bottom of the column.
    var box = null;
    ordered.forEach(function (name) {
      var section = document.createElement('details');
      section.className = 'ed-group';
      section.open = name !== CHROME;
      var head = document.createElement('summary');
      head.textContent = name + (name === CHROME ? ' — header and footer' : '');
      section.appendChild(head);
      box = document.createElement('div');
      section.appendChild(box);
      list.appendChild(section);
      seen[name].forEach(draw);
    });

    function draw(f) {
      var field = document.createElement('div');
      field.className = 'ed-field';
      var id = 'f-' + f.address.replace(/[^a-z0-9]+/gi, '-');

      var cap = document.createElement('label');
      cap.setAttribute('for', id);
      cap.textContent = label(f.address, only[f.address]);
      cap.title = f.address;
      field.appendChild(cap);

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
          option.textContent = o + (f.options.indexOf(o) < 0 ? ' — not on the list' : '');
          choose.appendChild(option);
        });
        choose.value = f.value;
        choose.addEventListener('change', function () {
          send({ type: 'ab:text', address: f.address, value: choose.value });
          mark(f.address, choose.value);
        });
        field.appendChild(choose);
        box.appendChild(field);
        inputs[f.address] = choose;
        return;
      }

      // A line break in the value means the address holds several lines; a long value wants room
      // to breathe. Everything else is one line, which is most of them.
      var many = f.kind === 'lines' || f.value.length > 70;
      var input = document.createElement(many ? 'textarea' : 'input');
      if (!many) input.type = 'text';
      input.id = id;
      input.value = f.value;
      input.setAttribute('data-address', f.address);
      if (many) input.rows = Math.min(6, f.value.split('\n').length + 1);
      input.addEventListener('input', function () {
        send({ type: 'ab:text', address: f.address, value: input.value });
        mark(f.address, input.value);
      });
      field.appendChild(input);

      box.appendChild(field);
      inputs[f.address] = input;
    }
  }

  function reveal(address) {
    var input = inputs[address];
    if (!input) return;
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
    if (e.data.type === 'ab:ready') build(e.data.fields || []);
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

  window.addEventListener('resize', fit);
  frame.addEventListener('load', function () {
    fit();
    // The frame may have finished before this window was listening; ask again rather than wait.
    send({ type: 'ab:list' });
  });
  fit();
}());
