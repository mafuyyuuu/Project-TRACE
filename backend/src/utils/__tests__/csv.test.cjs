/**
 * CSV escaping is the part that quietly corrupts an export when it's wrong —
 * a comma in a student name shifts every following column.
 */
const { toCsv, escapeCell, csvFilename } = require('../csv');

describe('escapeCell', () => {
  it('leaves ordinary values untouched', () => {
    expect(escapeCell('Ana Reyes')).toBe('Ana Reyes');
    expect(escapeCell(250)).toBe('250');
  });

  it('renders null and undefined as empty, not "null"', () => {
    expect(escapeCell(null)).toBe('');
    expect(escapeCell(undefined)).toBe('');
  });

  it('quotes a value containing a comma', () => {
    expect(escapeCell('Dela Cruz, Juan')).toBe('"Dela Cruz, Juan"');
  });

  it('doubles embedded quotes and wraps the field', () => {
    expect(escapeCell('He said "hi"')).toBe('"He said ""hi"""');
  });

  it.each([['\n'], ['\r\n']])('quotes a value containing a newline (%j)', (nl) => {
    const out = escapeCell(`line1${nl}line2`);
    // `.` excludes newlines without the s flag, hence the explicit checks.
    expect(out.startsWith('"')).toBe(true);
    expect(out.endsWith('"')).toBe(true);
    expect(out).toContain(nl);
  });

  it('serialises dates as ISO strings', () => {
    expect(escapeCell(new Date('2026-08-24T00:00:00Z'))).toBe('2026-08-24T00:00:00.000Z');
  });

  describe('spreadsheet formula injection', () => {
    it.each(['=1+1', '+1', '-1', '@SUM(A1)'])('neutralises a value starting with %s', (payload) => {
      expect(escapeCell(payload).startsWith("'")).toBe(true);
    });

    it('neutralises a formula that would run a command', () => {
      const attack = '=cmd|\' /C calc\'!A0';
      const out = escapeCell(attack);
      expect(out.startsWith("'") || out.startsWith('"\'')).toBe(true);
      expect(out).not.toMatch(/^=/);
    });

    it('does not mangle a legitimate negative number in a text field', () => {
      // Prefixed for safety, but the digits survive intact.
      expect(escapeCell('-50')).toContain('50');
    });
  });
});

describe('toCsv', () => {
  const columns = [
    { key: 'student_id', label: 'Student ID' },
    { key: 'full_name', label: 'Full Name' },
  ];

  it('writes a header row from the column labels', () => {
    expect(toCsv(columns, []).split('\r\n')[0]).toBe('Student ID,Full Name');
  });

  it('emits one CRLF-delimited row per record, in column order', () => {
    const csv = toCsv(columns, [
      { student_id: 'STU-001', full_name: 'Ana Reyes' },
      { student_id: 'STU-002', full_name: 'Juan Cruz' },
    ]);
    expect(csv.split('\r\n')).toEqual([
      'Student ID,Full Name',
      'STU-001,Ana Reyes',
      'STU-002,Juan Cruz',
    ]);
  });

  it('keeps columns aligned when a value contains a comma', () => {
    const csv = toCsv(columns, [{ student_id: 'STU-001', full_name: 'Dela Cruz, Juan' }]);
    expect(csv.split('\r\n')[1]).toBe('STU-001,"Dela Cruz, Juan"');
  });

  it('renders a missing field as empty rather than dropping the column', () => {
    expect(toCsv(columns, [{ student_id: 'STU-001' }]).split('\r\n')[1]).toBe('STU-001,');
  });

  it('produces only a header for an empty result set', () => {
    expect(toCsv(columns, [])).toBe('Student ID,Full Name');
  });
});

describe('csvFilename', () => {
  it('appends the date', () => {
    expect(csvFilename('students-active')).toMatch(/^students-active-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it('strips characters that could escape the header or a path', () => {
    expect(csvFilename('../../etc/passwd')).not.toContain('/');
    expect(csvFilename('a"b\nc')).toMatch(/^a-b-c-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});
