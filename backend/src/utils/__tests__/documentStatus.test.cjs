const {
  STATUS,
  LEGACY_STATUS,
  PIPELINE,
  TRANSITIONS,
  LEGACY_STATUS_MAP,
  STAGE_LABELS,
  isTerminal,
  canTransition,
  assertTransition,
} = require('../documentStatus');

const ALL = [...Object.values(STATUS), ...Object.values(LEGACY_STATUS)];

describe('pipeline shape', () => {
  it('runs from Window 1 intake to completion in eight steps', () => {
    expect(PIPELINE).toHaveLength(8);
    expect(PIPELINE[0]).toBe(STATUS.PENDING_W1_INTAKE);
    expect(PIPELINE[PIPELINE.length - 1]).toBe(STATUS.COMPLETED);
  });

  it('has a forward edge between every consecutive pair', () => {
    for (let i = 0; i < PIPELINE.length - 1; i++) {
      expect(canTransition(PIPELINE[i], PIPELINE[i + 1])).toBe(true);
    }
  });

  it('declares transitions for every known status, targeting only known statuses', () => {
    ALL.forEach((s) => expect(TRANSITIONS[s]).toBeDefined());
    Object.values(TRANSITIONS).flat().forEach((to) => expect(ALL).toContain(to));
  });

  it('labels every status for reports', () => {
    ALL.forEach((s) => expect(STAGE_LABELS[s]).toBeTruthy());
  });
});

describe('rejection edges', () => {
  it('sends a rejected document back exactly one step', () => {
    for (let i = 1; i < PIPELINE.length; i++) {
      const back = TRANSITIONS[PIPELINE[i]].filter((t) => PIPELINE.indexOf(t) < i);
      // A backward edge, where one exists, may only reach the immediately
      // preceding step — never further, or the audit trail would skip a desk.
      back.forEach((t) => expect(PIPELINE.indexOf(t)).toBe(i - 1));
    }
  });

  it('gives the first status nowhere to go back to', () => {
    // Window 1 returning a request to the student logs the reason and leaves
    // the status alone; there is no earlier desk to route it to.
    expect(TRANSITIONS[STATUS.PENDING_W1_INTAKE]).toEqual([STATUS.PENDING_SEC_EVALUATION]);
  });

  it('refuses to reverse a document once it has been paid for', () => {
    // Past this point reversal is a refund — an accounting decision made off
    // the system, not a state transition.
    expect(TRANSITIONS[STATUS.PAID_PENDING_SEC_RELEASE]).toEqual([STATUS.READY_FOR_RELEASE]);
    expect(canTransition(STATUS.PAID_PENDING_SEC_RELEASE, STATUS.PENDING_FINANCE_VERIFICATION)).toBe(false);
  });

  it('lets Finance bounce a bad receipt back to the student', () => {
    expect(canTransition(STATUS.PENDING_FINANCE_VERIFICATION, STATUS.PENDING_STUDENT_PAYMENT)).toBe(true);
  });
});

describe('isTerminal', () => {
  it('is true only for completion and the legacy terminals', () => {
    expect(isTerminal(STATUS.COMPLETED)).toBe(true);
    expect(isTerminal(LEGACY_STATUS.REJECTED)).toBe(true);
    expect(isTerminal(LEGACY_STATUS.APPROVED)).toBe(true);
    PIPELINE.slice(0, -1).forEach((s) => expect(isTerminal(s)).toBe(false));
  });
});

describe('assertTransition', () => {
  it('permits every declared move', () => {
    Object.entries(TRANSITIONS).forEach(([from, tos]) =>
      tos.forEach((to) => expect(() => assertTransition(from, to)).not.toThrow())
    );
  });

  it('rejects a skipped desk as a 400, naming both stages', () => {
    try {
      assertTransition(STATUS.PENDING_W1_INTAKE, STATUS.READY_FOR_RELEASE);
      throw new Error('should have thrown');
    } catch (err) {
      expect(err.status).toBe(400);
      expect(err.message).toContain('Window 1 Intake');
      expect(err.message).toContain('Window 1 Release');
    }
  });

  it('rejects any move out of a terminal status', () => {
    [STATUS.COMPLETED, LEGACY_STATUS.REJECTED].forEach((from) => {
      expect(() => assertTransition(from, STATUS.READY_FOR_RELEASE)).toThrow(/already at/);
    });
  });

  it('rejects an unknown status rather than silently allowing it', () => {
    expect(() => assertTransition('not_a_status', STATUS.COMPLETED)).toThrow();
    expect(() => assertTransition(STATUS.PENDING_W1_INTAKE, 'not_a_status')).toThrow();
  });

  it('never lets a document reach COMPLETED without passing through release', () => {
    ALL.filter((s) => s !== STATUS.READY_FOR_RELEASE).forEach((s) =>
      expect(canTransition(s, STATUS.COMPLETED)).toBe(false)
    );
  });
});

describe('LEGACY_STATUS_MAP', () => {
  it('covers every status the old pipeline could write', () => {
    expect(Object.keys(LEGACY_STATUS_MAP).sort()).toEqual([
      'approved',
      'completed',
      'pending_payment',
      'pending_payment_verification',
      'pending_secretary',
      'ready_window_1',
      'rejected',
      'released',
    ]);
  });

  it('maps only onto statuses that actually exist', () => {
    Object.values(LEGACY_STATUS_MAP).forEach((s) => expect(ALL).toContain(s));
  });

  it('maps pending_secretary forward, because reaching it used to mean PAID', () => {
    expect(LEGACY_STATUS_MAP.pending_secretary).toBe(STATUS.PAID_PENDING_SEC_RELEASE);
  });

  it('collapses completed and released onto one terminal', () => {
    expect(LEGACY_STATUS_MAP.completed).toBe(STATUS.COMPLETED);
    expect(LEGACY_STATUS_MAP.released).toBe(STATUS.COMPLETED);
  });

  it('preserves the off-pipeline legacy terminals instead of inventing history', () => {
    expect(LEGACY_STATUS_MAP.rejected).toBe(LEGACY_STATUS.REJECTED);
    expect(LEGACY_STATUS_MAP.approved).toBe(LEGACY_STATUS.APPROVED);
  });
});
