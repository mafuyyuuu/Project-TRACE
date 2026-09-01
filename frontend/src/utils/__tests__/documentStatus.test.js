import { describe, it, expect } from 'vitest';
import {
  STATUS,
  PIPELINE,
  LEGACY_STATUS,
  getProgressVal,
  getStatusLabel,
  getStageLabel,
  isAwaitingStudent,
  isPaid,
  isCancellable,
  requiresAttachment,
  getAttachmentLabel,
  getAttachmentHelper,
} from '@/utils/documentStatus';

describe('getProgressVal', () => {
  it('increases monotonically along the pipeline', () => {
    const values = PIPELINE.map(getProgressVal);
    expect(values).toEqual([...values].sort((a, b) => a - b));
    expect(new Set(values).size).toBe(values.length);
  });

  it('reports 100% only at the end of the pipeline', () => {
    expect(getProgressVal(STATUS.COMPLETED)).toBe(100);
    PIPELINE.slice(0, -1).forEach((s) => expect(getProgressVal(s)).toBeLessThan(100));
  });

  it('falls back to a small non-zero value for an unknown status', () => {
    expect(getProgressVal('some_new_status')).toBe(10);
    expect(getProgressVal(undefined)).toBe(10);
  });
});

describe('getStatusLabel', () => {
  it.each([
    [STATUS.PENDING_W1_INTAKE, 'Received — Awaiting Intake'],
    [STATUS.PENDING_SEC_EVALUATION, 'With the College Secretary'],
    [STATUS.SEC_PROCESSING, 'Being Processed'],
    [STATUS.PENDING_STUDENT_PAYMENT, 'Payment Required'],
    [STATUS.PENDING_FINANCE_VERIFICATION, 'Verifying Payment'],
    [STATUS.PAID_PENDING_SEC_RELEASE, 'Paid — Preparing for Release'],
    [STATUS.READY_FOR_RELEASE, 'Ready for Pick-up'],
    [STATUS.COMPLETED, 'Completed'],
  ])('renders %s as "%s"', (status, label) => {
    expect(getStatusLabel(status)).toBe(label);
  });

  it('never leaks a raw SCREAMING_CASE status for a known pipeline step', () => {
    PIPELINE.forEach((status) => expect(getStatusLabel(status)).not.toContain('_'));
  });

  it('still labels documents left on the pre-refactor pipeline', () => {
    expect(getStatusLabel(LEGACY_STATUS.REJECTED)).toBe('Rejected');
    expect(getStatusLabel(LEGACY_STATUS.APPROVED)).toBe('Approved');
  });

  it('passes an unrecognised status through unchanged', () => {
    expect(getStatusLabel('something_else')).toBe('something_else');
  });
});

describe('getStageLabel', () => {
  it('names the desk rather than addressing the student', () => {
    expect(getStageLabel(STATUS.PENDING_STUDENT_PAYMENT)).toBe('Awaiting Student Payment');
    expect(getStageLabel(STATUS.PAID_PENDING_SEC_RELEASE)).toBe('Secretary Handoff');
  });

  it('covers every pipeline status', () => {
    PIPELINE.forEach((status) => expect(getStageLabel(status)).not.toBe(status));
  });
});

describe('pipeline predicates', () => {
  it('flags only the payment step as waiting on the student', () => {
    PIPELINE.forEach((s) =>
      expect(isAwaitingStudent(s)).toBe(s === STATUS.PENDING_STUDENT_PAYMENT)
    );
  });

  it('treats everything from the Finance handoff onward as paid', () => {
    expect(isPaid(STATUS.PENDING_FINANCE_VERIFICATION)).toBe(false);
    [STATUS.PAID_PENDING_SEC_RELEASE, STATUS.READY_FOR_RELEASE, STATUS.COMPLETED].forEach((s) =>
      expect(isPaid(s)).toBe(true)
    );
  });

  it('allows cancellation only before the Secretary starts printing', () => {
    expect(isCancellable(STATUS.PENDING_W1_INTAKE)).toBe(true);
    expect(isCancellable(STATUS.PENDING_SEC_EVALUATION)).toBe(true);
    expect(isCancellable(STATUS.SEC_PROCESSING)).toBe(false);
  });

  it('never calls a paid document cancellable', () => {
    PIPELINE.filter(isPaid).forEach((s) => expect(isCancellable(s)).toBe(false));
  });
});

describe('requiresAttachment', () => {
  it.each(['Honorable Dismissal', 'Graduation Clearance', 'Certificate of Good Moral'])(
    '%s needs supporting paperwork',
    (docType) => {
      expect(requiresAttachment(docType)).toBe(true);
    }
  );

  it.each(['Transcript of Records', 'Diploma', 'Certification'])(
    '%s does not',
    (docType) => {
      expect(requiresAttachment(docType)).toBe(false);
    }
  );

  it('treats an unknown or missing type as not requiring an attachment', () => {
    expect(requiresAttachment(undefined)).toBe(false);
    expect(requiresAttachment('Something Else')).toBe(false);
  });
});

describe('attachment copy', () => {
  it('marks required document types as Required and others as Optional', () => {
    ['Honorable Dismissal', 'Graduation Clearance', 'Certificate of Good Moral'].forEach((t) => {
      expect(getAttachmentLabel(t)).toMatch(/^Required/);
    });
    expect(getAttachmentLabel('Diploma')).toMatch(/^Optional/);
  });

  it('names the specific document each type needs', () => {
    expect(getAttachmentLabel('Honorable Dismissal')).toMatch(/Clearance/i);
    expect(getAttachmentLabel('Graduation Clearance')).toMatch(/Routing Form/i);
    expect(getAttachmentLabel('Certificate of Good Moral')).toMatch(/Student ID/i);
  });

  it('stays consistent with requiresAttachment', () => {
    ['Honorable Dismissal', 'Graduation Clearance', 'Certificate of Good Moral', 'Diploma'].forEach((t) => {
      expect(getAttachmentLabel(t).startsWith('Required')).toBe(requiresAttachment(t));
    });
  });

  it('gives a short helper phrase per type', () => {
    expect(getAttachmentHelper('Honorable Dismissal')).toBe('clearance file');
    expect(getAttachmentHelper('Graduation Clearance')).toBe('signed clearance form');
    expect(getAttachmentHelper('Certificate of Good Moral')).toBe('student ID photo');
    expect(getAttachmentHelper('Diploma')).toBe('optional files');
  });
});
