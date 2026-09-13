// Printing helpers.
//
// Node's console.log supports %s %d %i %f %j %o %O %c and nothing else. Width specifiers like
// %-14s are printed literally, which has quietly ruined the readability of several measurement
// runs. Everything here pads with padEnd/padStart instead.

const pad  = (v, n) => String(v).padEnd(n);
const padL = (v, n) => String(v).padStart(n);

/**
 * Prints an aligned table.
 * @param {string[]} head column titles
 * @param {Array<Array<string|number>>} rows
 * @param {boolean[]} [right] which columns to right-align (numbers)
 */
function table(head, rows, right = []) {
  const all = [head, ...rows.map(r => r.map(c => String(c)))];
  const w = head.map((_, i) => Math.max(...all.map(r => String(r[i] ?? '').length)));
  const line = r => '  ' + r.map((c, i) => (right[i] ? padL(c, w[i]) : pad(c, w[i]))).join('  ').trimEnd();
  console.log(line(head));
  console.log('  ' + w.map(n => '-'.repeat(n)).join('  '));
  rows.forEach(r => console.log(line(r.map(c => String(c)))));
}

function heading(text) {
  console.log('\n  ' + text);
  console.log('  ' + '='.repeat(text.length));
}

/** Ends the process with 1 when a measurement failed, so this works in CI. */
function verdict(ok, message) {
  console.log('\n  ' + (ok ? 'DAT — ' : 'KHONG DAT — ') + message);
  process.exitCode = ok ? 0 : 1;
  return ok;
}

module.exports = { pad, padL, table, heading, verdict };
