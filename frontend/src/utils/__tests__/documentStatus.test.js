import { describe, it, expect } from 'vitest';
import {
  getProgressVal,
  getStatusLabel,
  requiresAttachment,
  getAttachmentLabel,
  getAttachmentHelper,
} from '@/utils/documentStatus';

// The pipeline order these helpers describe, per docs/SYSTEM_WORKFLOWS.md.
const PIPELINE = [
  'pending_payment',
  'pending_payment_verification',
  'pending_secretary',
  'ready_window_1',
  'completed',
];

describe('getProgressVal', () => {
  it('increases monotonically along the pipeline', () => {
    const values = PIPELINE.map(getProgressVal);
    const sorted = [...values].sort((a, b) => a - b);
    expect(values).toEqual(sorted);
    expect(new Set(values).size).toBe(values.length);
  });

  it('reports 100% for both completed and released', () => {
    expect(getProgressVal('completed')).toBe(100);
    expect(getProgressVal('released')).toBe(100);
  });

  it('falls back to a small non-zero value for an unknown status', () => {
    expect(getProgressVal('some_new_status')).toBe(10);
    expect(getProgressVal(undefined)).toBe(10);
  });
});

describe('getStatusLabel', () => {
  it.each([
    ['pending_payment', 'Awaiting Payment'],
    ['pending_payment_verification', 'Verifying Payment'],
    ['pending_secretary', 'Secretary Evaluation'],
    ['ready_window_1', 'Ready for Release'],
  ])('renders %s as "%s"', (status, label) => {
    expect(getStatusLabel(status)).toBe(label);
  });

  it('shows both completed and released as "Completed" to the student', () => {
    expect(getStatusLabel('completed')).toBe('Completed');
    expect(getStatusLabel('released')).toBe('Completed');
  });

  it('passes an unrecognised status through unchanged', () => {
    expect(getStatusLabel('rejected')).toBe('rejected');
  });

  it('never leaks a raw snake_case status for a known pipeline step', () => {
    PIPELINE.forEach((status) => expect(getStatusLabel(status)).not.toContain('_'));
  });
});

describe('requiresAttachment', () => {
  it.each(['Honorable Dismissal', 'Graduation Clearance', 'Certificate of Good Moral'])(
    '%s requires a supporting upload',
    (docType) => {
      expect(requiresAttachment(docType)).toBe(true);
    }
  );

  it.each(['Transcript of Records', 'Diploma', 'Certification'])(
    '%s does not require one',
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
