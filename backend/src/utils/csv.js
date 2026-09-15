/**
 * Minimal RFC 4180 CSV serialisation.
 *
 * Hand-rolled rather than pulled from a package: the format is small, and
 * getting the escaping right matters more than the convenience — a stray quote
 * or newline in a student name would otherwise corrupt every following column.
 */

/**
 * Escape one value.
 *
 * A field is quoted when it contains a comma, quote, or newline, and embedded
 * quotes are doubled. Values beginning with =, +, - or @ are additionally
 * prefixed with a single quote: spreadsheet applications would otherwise treat
 * them as formulas, which is a real injection vector when the data came from a
 * user-supplied name or purpose field.
 */
function escapeCell(value) {
  if (value === null || value === undefined) return '';

  let str = value instanceof Date ? value.toISOString() : String(value);

  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Build a CSV document.
 *
 * @param {Array<{key: string, label: string}>} columns column order and headers
 * @param {Array<Object>} rows
 * @returns {string} CSV text, CRLF-delimited per the spec
 */
function toCsv(columns, rows) {
  const header = columns.map((c) => escapeCell(c.label)).join(',');
  const body = rows.map((row) => columns.map((c) => escapeCell(row[c.key])).join(','));
  return [header, ...body].join('\r\n');
}

/**
 * Filename-safe timestamped name, e.g. "students-active-2026-08-24.csv".
 * Any caller-supplied part is stripped of characters that could escape the
 * Content-Disposition header or a directory.
 */
function csvFilename(base) {
  const safe = String(base).replace(/[^a-zA-Z0-9_-]/g, '-');
  return `${safe}-${new Date().toISOString().slice(0, 10)}.csv`;
}

module.exports = { toCsv, escapeCell, csvFilename };
