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
  var token = document.querySelector('input[name=__RequestVerificationToken]').value;

  var inputs = {};              // address -> the input showing it
  var dirty = {};               // address -> the value waiting to be written
  var width = 1440;
  var choosing = null;          // the image field the picture shelf is open for

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
  function group(address) {
    var name = address.split('.')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  // The address is a path into a JSON file, and the client was promised they would never have to
  // look at one. "nav.0.label" is three pieces of plumbing saying one thing: the second item in
  // the menu. Number from one, because nobody outside this trade counts from zero, and drop the
  // role word when it is the same on every field in the group. The exact address stays as the
  // field's tooltip - it is what you need when something does not update and you are asking why.
  var ROLE = /^(label|lead|tail|text|title|heading|name)$/;

  function label(address) {
    var parts = address.split('.').slice(1);
    var role = parts.length > 1 && ROLE.test(parts[parts.length - 1]) ? parts.pop() : '';
    var numbered = false;
    var out = parts.map(function (p) {
      if (!/^\d+$/.test(p)) return p.replace(/[-_]/g, ' ');
      numbered = true;
      return '#' + (+p + 1);
    }).join(' ');
    if (role && !numbered) out += ' ' + role;
    return out.charAt(0).toUpperCase() + out.slice(1);
  }

  function build(fields) {
    list.innerHTML = '';
    inputs = {};
    closeShelf();
    if (!fields.length) {
      list.appendChild(note('This page has no editable text yet.'));
      return;
    }

    var current = null, box = null;
    fields.forEach(function (f) {
      if (group(f.address) !== current) {
        current = group(f.address);
        var section = document.createElement('details');
        section.className = 'ed-group';
        section.open = true;
        var head = document.createElement('summary');
        head.textContent = current;
        section.appendChild(head);
        box = document.createElement('div');
        section.appendChild(box);
        list.appendChild(section);
      }

      var field = document.createElement('div');
      field.className = 'ed-field';
      var id = 'f-' + f.address.replace(/[^a-z0-9]+/gi, '-');

      var cap = document.createElement('label');
      cap.setAttribute('for', id);
      cap.textContent = label(f.address);
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
    });
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
