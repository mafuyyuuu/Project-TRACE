import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StudentDashboard from '@/features/student/StudentDashboard';
import * as documentsService from '@/services/documentsService';
import * as referenceService from '@/services/referenceService';
import { STATUS } from '@/utils/documentStatus';

vi.mock('@/services/documentsService', () => ({
  getDocuments: vi.fn(), getDashboardStats: vi.fn(),
  uploadDocument: vi.fn(), submitPayment: vi.fn(), cancelDocument: vi.fn(),
}));
vi.mock('@/services/referenceService', () => ({
  getDocumentTypes: vi.fn(), getPaymentMethods: vi.fn(),
}));

const USER = { id: 3, role: 'student', student_id: 'STU-001', full_name: 'Ana Reyes' };
const DOCS = [
  { id: 11, document_type: 'Transcript of Records', amount: '100.00', request_group_id: 'REQ-G1', fee_breakdown: { stage: 'final', source: 'default', total: 100, items: [{ label: 'Printed pages', calculation: '1 copy × 1 page × ₱100.00', amount: 100 }] } },
  { id: 12, document_type: 'Diploma', amount: '100.00', request_group_id: 'REQ-G1' },
].map((doc) => ({
  ...doc, tracking_number: `TRC-${doc.id}`, student_id: USER.student_id,
  current_status: STATUS.PENDING_STUDENT_PAYMENT, payment_status: 'UNPAID',
  created_at: '2026-09-30T00:00:00Z', updated_at: '2026-09-30T00:00:00Z',
}));

const renderStudent = () => render(<StudentDashboard user={USER} currentTab="dashboard" setViewImageUrl={vi.fn()} />);

beforeEach(() => {
  vi.clearAllMocks();
  documentsService.getDocuments.mockResolvedValue({ documents: DOCS });
  documentsService.getDashboardStats.mockResolvedValue({});
  documentsService.submitPayment.mockResolvedValue({ documents_covered: 2 });
  referenceService.getDocumentTypes.mockResolvedValue({ document_types: [] });
  referenceService.getPaymentMethods.mockResolvedValue({ payment_methods: [{
    code: 'gcash', name: 'GCash', requires_reference: true, requires_proof: true,
    reference_label: 'GCash Reference Number',
  }] });
});

describe('Student grouped payment', () => {
  it('offers one combined action with line items and removes document-row payment buttons', async () => {
    renderStudent();
    expect(await screen.findByRole('button', { name: 'Pay ₱200.00 (2 documents)' })).toHaveClass('trace-button-warning');
    const heading = screen.getByRole('heading', { name: 'Action Required — Payment' });
    expect(heading.parentElement).toHaveClass('bg-amber-50', 'dark:bg-amber-950', 'text-amber-900', 'dark:text-amber-200');
    expect(heading.parentElement.parentElement).toHaveClass('border-amber-300', 'dark:border-amber-800');
    expect(heading.parentElement).not.toHaveClass('bg-[#15803d]');
    expect(heading.parentElement.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getAllByRole('button', { name: /^Pay / })).toHaveLength(1);
    const group = screen.getByRole('region', { name: 'Payment for request REQ-G1' });
    const items = within(group).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Transcript of Records');
    expect(items[0]).toHaveTextContent('₱100.00');
    expect(items[0].querySelector('span.font-mono')).toHaveClass('font-semibold', 'text-gray-900', 'dark:text-gray-100');
    expect(within(items[0]).getByRole('region', { name: 'Fee calculation' })).toHaveTextContent('1 copy × 1 page × ₱100.00');
    expect(items[1]).toHaveTextContent('Diploma');
    expect(items[1]).toHaveTextContent('₱100.00');
    expect(within(screen.getByRole('table', { name: 'Active requests' })).queryByRole('button', { name: /^Pay / })).not.toBeInTheDocument();
  });

  it('keeps long document labels, saved calculations and historical descriptions with their own amounts', async () => {
    const longName = 'Certificate of Transfer – Supporting Academic Records for Registrar Review';
    documentsService.getDocuments.mockResolvedValue({ documents: [DOCS[0], { ...DOCS[1], document_sequence_number: longName, amount: '75.00' }] });
    renderStudent();
    await screen.findByRole('button', { name: 'Pay ₱175.00 (2 documents)' });
    const group = screen.getByRole('region', { name: 'Payment for request REQ-G1' });
    const [saved, historical] = within(group).getAllByRole('listitem');
    expect(saved).toHaveTextContent('Transcript of Records');
    expect(within(saved).getByRole('region', { name: 'Fee calculation' })).toHaveTextContent('1 copy × 1 page × ₱100.00');
    expect(historical).toHaveTextContent(longName);
    expect(historical).toHaveTextContent('Recorded charge: ₱75.00. Detailed calculation was not saved for this older record.');
    expect(historical).not.toHaveTextContent('Printed pages');
    expect(group).toHaveTextContent('Total amount due: ₱175.00');
    expect(within(saved).queryByRole('button')).not.toBeInTheDocument();
    expect(within(historical).queryByRole('button')).not.toBeInTheDocument();
    expect(documentsService.submitPayment).not.toHaveBeenCalled();
  });

  it('places each Pay action after its saved charges and visible group total in document reading order', async () => {
    documentsService.getDocuments.mockResolvedValue({ documents: [
      ...DOCS, { ...DOCS[1], id: 21, tracking_number: 'TRC-21', request_group_id: 'REQ-G2', amount: '50.00' },
    ] });
    renderStudent();
    await screen.findByRole('button', { name: 'Pay ₱200.00 (2 documents)' });
    for (const [id, total] of [['REQ-G1', '₱200.00'], ['REQ-G2', '₱50.00']]) {
      const group = screen.getByRole('region', { name: `Payment for request ${id}` });
      const pay = within(group).getByRole('button', { name: /^Pay / });
      const charges = within(group).getByRole('list');
      const totalLabel = within(group).getByText(`Total amount due: ${total}`);
      expect(charges.compareDocumentPosition(totalLabel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(totalLabel.compareDocumentPosition(pay) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(charges).toHaveTextContent('₱');
    }
    expect(documentsService.submitPayment).not.toHaveBeenCalled();
  });

  it('keeps separate requests separate and opens only the selected group with the keyboard', async () => {
    const user = userEvent.setup();
    documentsService.getDocuments.mockResolvedValue({ documents: [
      ...DOCS, { ...DOCS[0], id: 21, tracking_number: 'TRC-21', request_group_id: 'REQ-G2', document_type: 'Certification', amount: '50.00' },
    ] });
    renderStudent();
    const secondPay = await screen.findByRole('button', { name: 'Pay ₱50.00 (1 document)' });
    expect(screen.getAllByRole('button', { name: /^Pay / })).toHaveLength(2);
    secondPay.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByLabelText('Request')).toHaveValue('REQ-G2');
    expect(screen.getByLabelText('Documents')).toHaveValue('Certification');
    const breakdown = screen.getByRole('list', { name: 'Payment breakdown' });
    expect(within(breakdown).getAllByRole('listitem')).toHaveLength(1);
    expect(breakdown).toHaveTextContent('Certification');
    expect(breakdown).toHaveTextContent('₱50.00');
    expect(breakdown).not.toHaveTextContent('Diploma');
    expect(documentsService.submitPayment).not.toHaveBeenCalled();
  });

  it('shows all covered documents and the same combined total in checkout', async () => {
    const user = userEvent.setup();
    renderStudent();
    await user.click(await screen.findByRole('button', { name: 'Pay ₱200.00 (2 documents)' }));
    expect(screen.getByText('One payment for 2 documents')).toBeInTheDocument();
    expect(screen.getByLabelText('Documents')).toHaveValue('2 documents');
    expect(screen.getByLabelText('Request')).toHaveValue('REQ-G1');
    expect(screen.getByText('Total Amount Due').parentElement).toHaveTextContent('₱200.00');
    expect(within(screen.getByRole('list', { name: 'Payment breakdown' })).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('submits one receipt through the existing representative-document API', async () => {
    const user = userEvent.setup();
    renderStudent();
    await user.click(await screen.findByRole('button', { name: 'Pay ₱200.00 (2 documents)' }));
    await user.type(screen.getByPlaceholderText(/5001 0293 8472/), 'REF-GROUP-1');
    const receipt = new File(['receipt'], 'receipt.png', { type: 'image/png' });
    await user.upload(document.querySelector('input[type="file"]'), receipt);
    // jsdom file inputs do not satisfy native required validation.
    fireEvent.submit(screen.getByRole('button', { name: 'Submit Payment' }).form);
    expect(documentsService.submitPayment).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Confirm Payment' }));
    await waitFor(() => expect(documentsService.submitPayment).toHaveBeenCalledOnce());
    const [id, payload] = documentsService.submitPayment.mock.calls[0];
    expect(id).toBe(11);
    expect(payload.get('receipt')).toBe(receipt);
    expect(payload.get('gcash_reference_no')).toBe('REF-GROUP-1');
    expect(payload.get('payment_method')).toBe('gcash');
    expect([...payload.keys()]).toEqual(['receipt', 'gcash_reference_no', 'payment_method']);
    expect(await screen.findByRole('dialog', { name: 'Success' })).toBeInTheDocument();
  });

  it('keeps the existing cancellation confirmation available on a cancellable row', async () => {
    const user = userEvent.setup();
    documentsService.getDocuments.mockResolvedValue({ documents: [
      ...DOCS, { ...DOCS[0], id: 31, tracking_number: 'TRC-31', request_group_id: 'REQ-G3', current_status: STATUS.PENDING_W1_INTAKE },
    ] });
    renderStudent();
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('dialog', { name: 'Cancel Request' })).toBeInTheDocument();
    expect(documentsService.cancelDocument).not.toHaveBeenCalled();
  });
});


it.each([
  [STATUS.PENDING_FINANCE_VERIFICATION, 'UNPAID'],
  [STATUS.PAID_PENDING_SEC_RELEASE, 'PAID'],
  [STATUS.COMPLETED, 'PAID'],
])('does not offer another pending payment action for %s/%s', async (current_status, payment_status) => {
  documentsService.getDocuments.mockResolvedValue({ documents: DOCS.map(doc => ({ ...doc, current_status, payment_status })) });
  renderStudent();
  await screen.findByRole('table', { name: 'Active requests' });
  expect(screen.queryByRole('heading', { name: 'Action Required — Payment' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^Pay / })).not.toBeInTheDocument();
  expect(documentsService.submitPayment).not.toHaveBeenCalled();
});
