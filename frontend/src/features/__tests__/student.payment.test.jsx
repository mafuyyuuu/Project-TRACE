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
  { id: 11, document_type: 'Transcript of Records', amount: '100.00', request_group_id: 'REQ-G1' },
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
    expect(screen.getAllByRole('button', { name: /^Pay / })).toHaveLength(1);
    const group = screen.getByRole('region', { name: 'Payment for request REQ-G1' });
    const items = within(group).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Transcript of Records');
    expect(items[0]).toHaveTextContent('₱100.00');
    expect(items[1]).toHaveTextContent('Diploma');
    expect(items[1]).toHaveTextContent('₱100.00');
    expect(within(screen.getByRole('table', { name: 'Active requests' })).queryByRole('button', { name: /^Pay / })).not.toBeInTheDocument();
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
