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
      { type: 'ab:ready', url, fields: [{ address, kind, value }] }   on load
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
               ['data-ab-img', 'img']];

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

  /** The value at an address, read back the same way it was written. */
  function read(el, kind) {
    // A picture's value is the file's name, not the src: an empty field draws a placeholder,
    // whose src is a data: URI several kilobytes long and means "there is no picture here".
    if (kind === 'img') {
      var src = el.tagName === 'IMG' ? el.getAttribute('src') || '' : '';
      var cut = src.indexOf('_media/');
      return cut < 0 ? '' : src.slice(cut + 7);
    }
    if (kind === 't') return el.textContent;
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
      // Only an <img> can be shown the new picture without re-rendering. A finish with no
      // photograph is drawn as a coloured square, and turning that into a picture is the
      // server's job - the editor reloads the frame after saving, which settles both cases.
      if (el.tagName === 'IMG' && value) el.setAttribute('src', root() + '_media/' + value);
      return;
    }
    if (kind === 't') { el.textContent = value; return; }
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
    var all = d.querySelectorAll('[data-ab-t],[data-ab-lead],[data-ab-lines],[data-ab-img]');
    for (var i = 0; i < all.length; i++) {
      var a = attr(all[i]);
      if (a) fn(all[i], a.address, a.kind);
    }
  }

  function fields() {
    var out = [];
    each(function (el, address, kind) {
      out.push({ address: address, kind: kind, value: read(el, kind) });
    });
    return out;
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

    if (e.data.type === 'ab:list') { send({ type: 'ab:ready', fields: fields() }); return; }
    if (e.data.type !== 'ab:text' && e.data.type !== 'ab:img') return;

    var value = e.data.type === 'ab:img' ? e.data.file : e.data.value;
    each(function (el, address, kind) {
      if (address === e.data.address) write(el, kind, value);
    });
  });

  // Clicking text selects it in the editor instead of following the link it sits in. Links would
  // take the frame somewhere the left column knows nothing about; the page list is how you move,
  // and it is right there. A click on anything without an address behaves normally.
  d.addEventListener('click', function (e) {
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

  var marked = null;
  function mark(el) {
    if (marked) marked.removeAttribute('data-ab-on');
    marked = el;
    if (el) el.setAttribute('data-ab-on', '');
  }

  // The outline is the only thing this file adds to the page's appearance, and it is only ever
  // in the frame - a visitor who types ?edit=1 gets the script, but nothing draws until the
  // editor sends a message, and there is no editor.
  var style = d.createElement('style');
  style.textContent =
    '[data-ab-t]:hover,[data-ab-lead]:hover,[data-ab-lines]:hover' +
    '{outline:1px dashed rgba(31,106,68,.55);outline-offset:2px;cursor:text}' +
    // A picture gets a solid outline and a pointer, not a text cursor: you are not going to
    // type into it, you are going to choose one.
    '[data-ab-img]:hover{outline:2px solid rgba(31,106,68,.8);outline-offset:2px;cursor:pointer}' +
    '[data-ab-on]{outline:2px solid #1f6a44 !important;outline-offset:2px}';
  d.head.appendChild(style);

  // The editor may be listening before this runs or after; say hello, and answer ab:list too.
  if (d.readyState === 'loading') {
    d.addEventListener('DOMContentLoaded', function () { send({ type: 'ab:ready', fields: fields() }); });
  } else {
    send({ type: 'ab:ready', fields: fields() });
  }
}(window));
