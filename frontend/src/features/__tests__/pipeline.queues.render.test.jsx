import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { STATUS } from '@/utils/documentStatus';

/**
 * Each desk must show the work it owns, and only that work.
 *
 * The evaluate-first pipeline gives three of the five roles more than one
 * queue, and every one of them is a client-side slice of the same fetched list.
 * A mistake there is invisible in unit tests of the hooks — the queue simply
 * renders empty, or worse, renders another desk's documents — so the split is
 * asserted against the real components here.
 */

vi.mock('@/services/documentsService', () => ({
  getDocuments: vi.fn(),
  getDashboardStats: vi.fn(),
  getForecast: vi.fn(),
  getInsights: vi.fn(),
  getActivityLogs: vi.fn(),
  uploadDocument: vi.fn(),
  submitPayment: vi.fn(),
  verifyPayment: vi.fn(),
  intakeDocument: vi.fn(),
  acceptForProcessing: vi.fn(),
  priceDocument: vi.fn(),
  verifyOfficialReceipt: vi.fn(),
  confirmHandoff: vi.fn(),
  scanReceipt: vi.fn(),
  logWalkInPayment: vi.fn(),
  releaseDocument: vi.fn(),
  cancelDocument: vi.fn(),
}));

vi.mock('@/services/authService', () => ({
  getPendingStudents: vi.fn(),
  getUsers: vi.fn(),
  lookupStudent: vi.fn(),
}));

vi.mock('@/services/referenceService', () => ({
  getDocumentTypes: vi.fn(),
  getPaymentMethods: vi.fn(),
}));

import * as documentsService from '@/services/documentsService';
import * as referenceService from '@/services/referenceService';
import Window1Dashboard from '@/features/window1/Window1Dashboard';
import SecretaryDashboard from '@/features/secretary/SecretaryDashboard';
import FinanceDashboard from '@/features/finance/FinanceDashboard';
import StudentDashboard from '@/features/student/StudentDashboard';

/**
 * A short, unique code per stage.
 *
 * Rows display `tracking_number.slice(0, 10)`, and every PENDING_* status
 * shares its first ten characters — so the codes have to be distinct by
 * construction rather than derived from the status name.
 */
const CODE = {
  [STATUS.PENDING_W1_INTAKE]: 'INTK',
  [STATUS.PENDING_SEC_EVALUATION]: 'EVAL',
  [STATUS.SEC_PROCESSING]: 'PROC',
  [STATUS.PENDING_STUDENT_PAYMENT]: 'BILL',
  [STATUS.PENDING_FINANCE_VERIFICATION]: 'VRFY',
  [STATUS.PAID_PENDING_SEC_RELEASE]: 'HAND',
  [STATUS.SEC_OR_VERIFIED]: 'ORVF',
  [STATUS.READY_FOR_RELEASE]: 'RLSE',
  [STATUS.COMPLETED]: 'DONE',
};

/** One document parked at each stage, so every queue has exactly one member. */
const at = (status, extra = {}) => ({
  id: Math.abs(hash(status)),
  tracking_number: `TRC-${CODE[status]}`,
  request_group_id: `REQ-${CODE[status]}`,
  student_id: 'STU2024001',
  student_name: 'Ana Reyes',
  document_type: 'Transcript of Records',
  current_status: status,
  payment_status: 'UNPAID',
  amount: '200.00',
  copies: 1,
  created_at: '2026-08-20T00:00:00.000Z',
  updated_at: '2026-08-20T00:00:00.000Z',
  ...extra,
});

function hash(s) {
  return [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);
}

const ALL_STAGES = [
  at(STATUS.PENDING_W1_INTAKE),
  at(STATUS.PENDING_SEC_EVALUATION),
  at(STATUS.SEC_PROCESSING, { estimated_ready_date: '2026-09-10' }),
  at(STATUS.PENDING_STUDENT_PAYMENT, { amount: '250.00', priced_at: '2026-09-01T00:00:00.000Z' }),
  at(STATUS.PENDING_FINANCE_VERIFICATION, { payment_channel: 'digital' }),
  at(STATUS.PAID_PENDING_SEC_RELEASE, { payment_status: 'PAID', or_number: 'OR-2026-0099' }),
  at(STATUS.SEC_OR_VERIFIED, { payment_status: 'PAID', or_number: 'OR-2026-0098' }),
  at(STATUS.READY_FOR_RELEASE, { payment_status: 'PAID', or_number: 'OR-2026-0100' }),
  at(STATUS.COMPLETED, { payment_status: 'PAID' }),
];

const PAYMENT_METHODS = [
  { id: 1, code: 'gcash', name: 'GCash', provider: 'manual', instructions: 'Scan the QR code.',
    requires_reference: 1, reference_label: 'GCash Reference Number', requires_proof: 1, is_active: 1 },
  { id: 2, code: 'card', name: 'Credit / Debit Card', provider: 'manual',
    instructions: 'Pay at the Cashier using your card.', requires_reference: 1,
    reference_label: 'Approval / Reference Code', requires_proof: 1, is_active: 1 },
];

const USERS = {
  student: { id: 3, role: 'student', full_name: 'Ana Reyes', student_id: 'STU2024001' },
  finance: { id: 4, role: 'clerk', desk_assignment: 'Finance', full_name: 'Finance Officer' },
  window1: { id: 5, role: 'clerk', desk_assignment: 'Window 1', full_name: 'Window 1 Clerk' },
  secretary: { id: 6, role: 'clerk', desk_assignment: 'Secretary', full_name: 'CCS Secretary' },
};

beforeEach(() => {
  vi.clearAllMocks();
  documentsService.getDocuments.mockResolvedValue({ documents: ALL_STAGES, total: 8, totalPages: 1 });
  documentsService.getDashboardStats.mockResolvedValue({});
  referenceService.getDocumentTypes.mockResolvedValue({ document_types: [] });
  referenceService.getPaymentMethods.mockResolvedValue({ payment_methods: PAYMENT_METHODS });
});

async function renderDashboard(ui) {
  const utils = render(ui);
  await waitFor(() =>
    expect(screen.queryByText(/Synchronizing Command Center/i)).not.toBeInTheDocument()
  );
  return utils;
}

/** The tracking id a queue row shows, so a queue can be identified by content. */
const idFor = (status) => `#TRC-${CODE[status]}`;

describe('Window 1 — intake at the front, release at the back', () => {
  it('shows both of its queues', async () => {
    await renderDashboard(
      <Window1Dashboard user={USERS.window1} currentTab="dashboard" setViewImageUrl={vi.fn()} />
    );
    expect(await screen.findByText(/INTAKE QUEUE/i)).toBeInTheDocument();
    expect(screen.getByText(/RELEASE DESK/i)).toBeInTheDocument();
  });

  it('puts each document in exactly one of them', async () => {
    await renderDashboard(
      <Window1Dashboard user={USERS.window1} currentTab="dashboard" setViewImageUrl={vi.fn()} />
    );
    expect(await screen.findByText(idFor(STATUS.PENDING_W1_INTAKE))).toBeInTheDocument();
    expect(screen.getByText(idFor(STATUS.READY_FOR_RELEASE))).toBeInTheDocument();
    // Work belonging to another desk must not appear in either queue.
    expect(screen.queryByText(idFor(STATUS.SEC_PROCESSING))).not.toBeInTheDocument();
    expect(screen.queryByText(idFor(STATUS.PENDING_FINANCE_VERIFICATION))).not.toBeInTheDocument();
  });

  it('shows the Official Receipt a walk-in student will present', async () => {
    await renderDashboard(
      <Window1Dashboard user={USERS.window1} currentTab="dashboard" setViewImageUrl={vi.fn()} />
    );
    expect(await screen.findByText('OR-2026-0100')).toBeInTheDocument();
  });

  it('opens the intake check for a queued request', async () => {
    const user = userEvent.setup();
    await renderDashboard(
      <Window1Dashboard user={USERS.window1} currentTab="dashboard" setViewImageUrl={vi.fn()} />
    );
    await user.click(await screen.findByRole('button', { name: /^check$/i }));
    expect(await screen.findByRole('heading', { name: /Intake Check/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /route to secretary/i })).toBeInTheDocument();
  });
});

describe('Secretary — four passes over the same request', () => {
  // The queues now live behind a tab bar (one table visible at a time)
  // instead of stacked cards, so "showing" a queue means selecting its tab
  // first.

  it('shows all four queue tabs', async () => {
    await renderDashboard(
      <SecretaryDashboard user={USERS.secretary} currentTab="dashboard" setViewImageUrl={vi.fn()} />
    );
    expect(await screen.findByRole('tab', { name: /initial evaluation/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /processing & pricing/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /or verification/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /final handoff/i })).toBeInTheDocument();
  });

  it('separates evaluation, processing, OR verification and handoff, one queue visible at a time', async () => {
    const user = userEvent.setup();
    await renderDashboard(
      <SecretaryDashboard user={USERS.secretary} currentTab="dashboard" setViewImageUrl={vi.fn()} />
    );

    // Evaluation is the default tab.
    expect(await screen.findByText(idFor(STATUS.PENDING_SEC_EVALUATION))).toBeInTheDocument();
    expect(screen.queryByText(idFor(STATUS.SEC_PROCESSING))).not.toBeInTheDocument();
    expect(screen.queryByText(idFor(STATUS.PAID_PENDING_SEC_RELEASE))).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /processing & pricing/i }));
    expect(await screen.findByText(idFor(STATUS.SEC_PROCESSING))).toBeInTheDocument();
    expect(screen.queryByText(idFor(STATUS.PENDING_SEC_EVALUATION))).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /or verification/i }));
    expect(await screen.findByText(idFor(STATUS.PAID_PENDING_SEC_RELEASE))).toBeInTheDocument();
    expect(screen.queryByText(idFor(STATUS.SEC_OR_VERIFIED))).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /final handoff/i }));
    expect(await screen.findByText(idFor(STATUS.SEC_OR_VERIFIED))).toBeInTheDocument();
    expect(screen.queryByText(idFor(STATUS.PAID_PENDING_SEC_RELEASE))).not.toBeInTheDocument();
    expect(screen.queryByText(idFor(STATUS.SEC_PROCESSING))).not.toBeInTheDocument();

    // Money is Finance's business, not the Secretary's — never shown here.
    expect(screen.queryByText(idFor(STATUS.PENDING_STUDENT_PAYMENT))).not.toBeInTheDocument();
    expect(screen.queryByText(idFor(STATUS.PENDING_FINANCE_VERIFICATION))).not.toBeInTheDocument();
  });

  it('does not call anything in the evaluation queue PAID', async () => {
    // The old pipeline collected money first, so this queue was always paid.
    // Under evaluate-first nothing here has been billed yet, and saying
    // otherwise on screen would be a straightforward lie to the clerk.
    await renderDashboard(
      <SecretaryDashboard user={USERS.secretary} currentTab="dashboard" setViewImageUrl={vi.fn()} />
    );
    await screen.findByText(idFor(STATUS.PENDING_SEC_EVALUATION));
    expect(screen.getAllByText('UNPAID').length).toBeGreaterThan(0);
  });

  it('opens the pricing modal from the processing queue', async () => {
    const user = userEvent.setup();
    await renderDashboard(
      <SecretaryDashboard user={USERS.secretary} currentTab="dashboard" setViewImageUrl={vi.fn()} />
    );
    await user.click(await screen.findByRole('tab', { name: /processing & pricing/i }));
    await user.click(await screen.findByRole('button', { name: /set price/i }));
    expect(await screen.findByRole('heading', { name: /Set the Amount/i })).toBeInTheDocument();
    // The last document in a request bills it, so the button says so.
    expect(screen.getByRole('button', { name: /save & bill student/i })).toBeInTheDocument();
  });
});

describe('Finance — awaiting payment, then verification', () => {
  it('shows both money queues', async () => {
    await renderDashboard(<FinanceDashboard user={USERS.finance} setViewImageUrl={vi.fn()} />);
    expect(await screen.findByText(/AWAITING PAYMENT/i)).toBeInTheDocument();
    expect(screen.getByText(/VERIFICATION QUEUE/i)).toBeInTheDocument();
  });

  it('keeps billed and claimed payments apart', async () => {
    await renderDashboard(<FinanceDashboard user={USERS.finance} setViewImageUrl={vi.fn()} />);
    expect(await screen.findByText(idFor(STATUS.PENDING_STUDENT_PAYMENT))).toBeInTheDocument();
    expect(screen.getByText(idFor(STATUS.PENDING_FINANCE_VERIFICATION))).toBeInTheDocument();
    expect(screen.queryByText(idFor(STATUS.SEC_PROCESSING))).not.toBeInTheDocument();
  });

  it('opens the counter-payment form for a billed request', async () => {
    const user = userEvent.setup();
    await renderDashboard(<FinanceDashboard user={USERS.finance} setViewImageUrl={vi.fn()} />);
    await user.click(await screen.findByRole('button', { name: /log counter payment/i }));
    expect(await screen.findByRole('heading', { name: /Log Counter Payment/i })).toBeInTheDocument();
    expect(screen.getByText(/Official Receipt No/i)).toBeInTheDocument();
  });
});

describe('Student — asked for money only once there is an amount', () => {
  it('raises an Action Required banner for a billed request', async () => {
    await renderDashboard(
      <StudentDashboard user={USERS.student} currentTab="dashboard" setViewImageUrl={vi.fn()} />
    );
    expect(await screen.findByText(/Action Required — Payment/i)).toBeInTheDocument();
  });

  it('offers to pay the amount the Secretary set', async () => {
    await renderDashboard(
      <StudentDashboard user={USERS.student} currentTab="dashboard" setViewImageUrl={vi.fn()} />
    );
    expect((await screen.findAllByRole('button', { name: /pay ₱250\.00/i })).length).toBeGreaterThan(0);
  });

  it('never offers to pay for a request that has not been priced', async () => {
    documentsService.getDocuments.mockResolvedValue({
      documents: [at(STATUS.SEC_PROCESSING)], total: 1, totalPages: 1,
    });
    await renderDashboard(
      <StudentDashboard user={USERS.student} currentTab="dashboard" setViewImageUrl={vi.fn()} />
    );
    await waitFor(() => expect(documentsService.getDocuments).toHaveBeenCalled());
    expect(screen.queryByText(/Action Required/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^pay /i })).not.toBeInTheDocument();
  });

  it('lets a request be cancelled only before printing starts', async () => {
    documentsService.getDocuments.mockResolvedValue({
      documents: [at(STATUS.PENDING_W1_INTAKE), at(STATUS.SEC_PROCESSING)], total: 2, totalPages: 1,
    });
    await renderDashboard(
      <StudentDashboard user={USERS.student} currentTab="dashboard" setViewImageUrl={vi.fn()} />
    );
    // Exactly one of the two is cancellable: paper has been spent on the other.
    expect((await screen.findAllByRole('button', { name: /cancel/i })).length).toBe(1);
  });

  it('offers every active payment method, defaulting to the GCash QR', async () => {
    const user = userEvent.setup();
    await renderDashboard(
      <StudentDashboard user={USERS.student} currentTab="dashboard" setViewImageUrl={vi.fn()} />
    );
    const [payButton] = await screen.findAllByRole('button', { name: /pay ₱250\.00/i });
    await user.click(payButton);

    expect(await screen.findByAltText('GCash QR Code')).toBeInTheDocument();
    expect(screen.getByText('GCash Reference Number')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Credit / Debit Card' })).toBeInTheDocument();
  });

  it('switches to another method\'s own instructions and reference label', async () => {
    const user = userEvent.setup();
    await renderDashboard(
      <StudentDashboard user={USERS.student} currentTab="dashboard" setViewImageUrl={vi.fn()} />
    );
    const [payButton] = await screen.findAllByRole('button', { name: /pay ₱250\.00/i });
    await user.click(payButton);
    await user.click(await screen.findByRole('button', { name: 'Credit / Debit Card' }));

    expect(screen.queryByAltText('GCash QR Code')).not.toBeInTheDocument();
    expect(screen.getByText(/Pay at the Cashier using your card/i)).toBeInTheDocument();
    expect(screen.getByText('Approval / Reference Code')).toBeInTheDocument();
  });

  it('submits the selected method code alongside the reference and receipt', async () => {
    const user = userEvent.setup();
    documentsService.submitPayment.mockResolvedValue({ message: 'ok' });
    await renderDashboard(
      <StudentDashboard user={USERS.student} currentTab="dashboard" setViewImageUrl={vi.fn()} />
    );
    const [payButton] = await screen.findAllByRole('button', { name: /pay ₱250\.00/i });
    await user.click(payButton);
    await user.click(await screen.findByRole('button', { name: 'Credit / Debit Card' }));

    await user.type(screen.getByPlaceholderText(/5001 0293 8472/), 'APPROVE123');
    // The payment modal renders through a portal onto document.body, outside
    // the render container, so the file input has to be found there instead.
    const fileInput = document.body.querySelector('input[type="file"]');
    await user.upload(fileInput, new File(['x'], 'receipt.png', { type: 'image/png' }));

    // jsdom never reports a `required` file input as valid even with a file
    // attached (real browsers do, via the fake path they assign to `.value`),
    // so a real button click gets silently vetoed by native constraint
    // validation here. Submitting the form directly exercises the same
    // `onSubmit` handler without that jsdom-only false negative.
    fireEvent.submit(screen.getByRole('button', { name: /submit payment/i }).closest('form'));

    await waitFor(() => expect(documentsService.submitPayment).toHaveBeenCalled());
    const [, formData] = documentsService.submitPayment.mock.calls[0];
    expect(formData.get('payment_method')).toBe('card');
    expect(formData.get('gcash_reference_no')).toBe('APPROVE123');
  });
});
