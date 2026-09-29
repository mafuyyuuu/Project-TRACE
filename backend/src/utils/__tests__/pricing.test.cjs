const {
  calculateAmount,
  calculateGroupAmount,
  generateTrackingNumber,
  generateRequestGroupId,
} = require('../pricing');

// Rows as they come back from `document_types`, where base_fee is a string.
const TYPES = [
  { name: 'Transcript of Records', base_fee: '100.00', fee_rule: 'per_semester_block' },
  { name: 'Honorable Dismissal', base_fee: '100.00', fee_rule: 'flat' },
  { name: 'Diploma', base_fee: '50.00', fee_rule: 'flat' },
  { name: 'Graduation Clearance', base_fee: '50.00', fee_rule: 'flat' },
];

describe('calculateAmount', () => {
  describe('Transcript of Records — charged per block of 4 semesters', () => {
    it.each([
      [4, 100],   // exactly one block
      [5, 200],   // rounds up into a second block
      [8, 200],   // two full blocks
      [9, 300],
      [12, 300],
    ])('%i semesters costs %i', (semesters, expected) => {
      expect(calculateAmount('Transcript of Records', semesters, 1).amount).toBe(expected);
    });

    it('treats the "(TOR)" spelling identically', () => {
      expect(calculateAmount('Transcript of Records (TOR)', 8, 1).amount).toBe(200);
    });

    it('defaults to 8 semesters when not supplied', () => {
      expect(calculateAmount('Transcript of Records', undefined, 1).amount).toBe(200);
    });
  });

  it('charges a flat 100 for Honorable Dismissal regardless of semesters', () => {
    expect(calculateAmount('Honorable Dismissal', 12, 1).amount).toBe(100);
  });

  it.each(['Diploma', 'Certificate of Good Moral', 'Graduation Clearance', 'Anything Else'])(
    'charges the 50 base rate for %s',
    (docType) => {
      expect(calculateAmount(docType, 8, 1).amount).toBe(50);
    }
  );

  

  it('falls back to 1 copy for missing or invalid input', () => {
    expect(calculateAmount('Diploma', 8, undefined)).toEqual({ amount: 50, copies: 1 });
    expect(calculateAmount('Diploma', 8, 0)).toEqual({ amount: 50, copies: 1 });
    expect(calculateAmount('Diploma', 8, 'abc')).toEqual({ amount: 50, copies: 1 });
  });

  

  
});

describe('generateTrackingNumber', () => {
  it('matches the TRC-XXXXXXXX format', () => {
    expect(generateTrackingNumber()).toMatch(/^TRC-[0-9A-F]{8}$/);
  });

  it('does not repeat across many calls', () => {
    const seen = new Set(Array.from({ length: 500 }, generateTrackingNumber));
    expect(seen.size).toBe(500);
  });
});

describe('calculateAmount with a database-supplied type', () => {
  it('uses the row\'s base_fee rather than the hardcoded rate', () => {
    const custom = { name: 'Diploma', base_fee: '75.00', fee_rule: 'flat' };
    expect(calculateAmount('Diploma', 8, 1, custom).amount).toBe(75);
  });

  it('applies the per-semester-block rule when the row asks for it', () => {
    const tor = { name: 'Transcript of Records', base_fee: '100.00', fee_rule: 'per_semester_block' };
    expect(calculateAmount('Transcript of Records', 8, 1, tor).amount).toBe(200);
    expect(calculateAmount('Transcript of Records', 5, 1, tor).amount).toBe(200);
  });

  it('falls back to the legacy rates when no row is supplied', () => {
    expect(calculateAmount('Honorable Dismissal', 8, 1).amount).toBe(100);
    expect(calculateAmount('Diploma', 8, 1).amount).toBe(50);
    expect(calculateAmount('Transcript of Records', 8, 1).amount).toBe(200);
  });

  
});

describe('calculateGroupAmount', () => {
  it('sums a mixed group of flat and per-semester documents', () => {
    // TOR 8 semesters = 200, Diploma = 50
    const { total } = calculateGroupAmount(
      [
        { document_type: 'Transcript of Records', semesters: 8, copies: 1 },
        { document_type: 'Diploma', copies: 1 },
      ],
      TYPES
    );
    expect(total).toBe(250);
  });

  

  

  it('equals the single-item price for a group of one', () => {
    const single = calculateAmount('Transcript of Records', 8, 2, TYPES[0]).amount;
    const group = calculateGroupAmount(
      [{ document_type: 'Transcript of Records', semesters: 8, copies: 2 }],
      TYPES
    ).total;
    expect(group).toBe(single);
  });

  it('normalises missing or invalid copies to 1', () => {
    const { items, total } = calculateGroupAmount(
      [
        { document_type: 'Diploma' },
        { document_type: 'Diploma', copies: 'abc' },
        { document_type: 'Diploma', copies: 0 },
      ],
      TYPES
    );
    expect(items.every((i) => i.copies === 1)).toBe(true);
    expect(total).toBe(150);
  });

  it('handles an empty request', () => {
    expect(calculateGroupAmount([], TYPES)).toEqual({ total: 0, items: [] });
  });

  it('falls back to legacy rates for a type missing from the database', () => {
    const { total } = calculateGroupAmount([{ document_type: 'Honorable Dismissal', copies: 1 }], []);
    expect(total).toBe(100);
  });

  

  it('produces a clean two-decimal total rather than float drift', () => {
    const cents = [{ name: 'Odd', base_fee: '0.10', fee_rule: 'flat' }];
    const { total } = calculateGroupAmount(
      Array.from({ length: 3 }, () => ({ document_type: 'Odd', copies: 1 })),
      cents
    );
    expect(total).toBe(0.3);
  });
});

describe('generateRequestGroupId', () => {
  it('matches the REQ- format and is distinct from a tracking number', () => {
    const id = generateRequestGroupId();
    expect(id).toMatch(/^REQ-[0-9A-F]{12}$/);
    expect(id.startsWith('TRC-')).toBe(false);
  });

  it('does not repeat across many calls', () => {
    const seen = new Set(Array.from({ length: 500 }, generateRequestGroupId));
    expect(seen.size).toBe(500);
  });
});
