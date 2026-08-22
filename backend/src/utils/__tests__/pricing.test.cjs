const { calculateAmount, generateTrackingNumber } = require('../pricing');

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

  it('multiplies by the number of copies', () => {
    expect(calculateAmount('Diploma', 8, 3).amount).toBe(150);
    // The end-to-end case: 8-semester TOR, 2 copies
    expect(calculateAmount('Transcript of Records', 8, 2).amount).toBe(400);
  });

  it('falls back to 1 copy for missing or invalid input', () => {
    expect(calculateAmount('Diploma', 8, undefined)).toEqual({ amount: 50, copies: 1 });
    expect(calculateAmount('Diploma', 8, 0)).toEqual({ amount: 50, copies: 1 });
    expect(calculateAmount('Diploma', 8, 'abc')).toEqual({ amount: 50, copies: 1 });
  });

  it('accepts numeric strings, as they arrive from multipart form fields', () => {
    expect(calculateAmount('Transcript of Records', '8', '2').amount).toBe(400);
  });

  it('reports the normalised copy count alongside the amount', () => {
    expect(calculateAmount('Diploma', 8, '4')).toEqual({ amount: 200, copies: 4 });
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
