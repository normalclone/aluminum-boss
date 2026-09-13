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
  var inputs = {};              // address -> the input showing it
  var width = 1440;

  function send(msg) {
    if (frame.contentWindow) frame.contentWindow.postMessage(msg, location.origin);
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
    input.scrollIntoView({ block: 'center' });
    input.focus();
    input.classList.add('is-found');
    setTimeout(function () { input.classList.remove('is-found'); }, 900);
  }

  /* ---- wiring ------------------------------------------------------------------------- */

  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || !e.data) return;
    if (e.data.type === 'ab:ready') build(e.data.fields || []);
    else if (e.data.type === 'ab:pick') reveal(e.data.address);
  });

  picker.addEventListener('change', function () { show(picker.value); });

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
