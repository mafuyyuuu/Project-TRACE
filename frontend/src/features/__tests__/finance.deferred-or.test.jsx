import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within, renderHook, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FinanceDashboard from '@/features/finance/FinanceDashboard';
import ReceiptVerificationModal from '@/features/secretary/components/ReceiptVerificationModal';
import useSecretaryDashboard from '@/features/secretary/useSecretaryDashboard';
import * as documents from '@/services/documentsService';
import { getFinanceTransactions } from '@/services/financeService';
vi.mock('@/services/financeService', () => ({ getFinanceTransactions: vi.fn(), exportFinanceTransactions: vi.fn() }));
import { STATUS } from '@/utils/documentStatus';

vi.mock('@/components/DocumentChat', () => ({ default: () => null }));
vi.mock('@/services/referenceService', () => ({
  getPaymentMethods: vi.fn().mockResolvedValue({ payment_methods: [] }),
  getDocumentTypes: vi.fn().mockResolvedValue({ document_types: [] }),
}));
vi.mock('@/services/documentsService', () => ({
  getDocuments: vi.fn(), getDashboardStats: vi.fn(), verifyPayment: vi.fn(),
  uploadDeferredOR: vi.fn(), logWalkInPayment: vi.fn(), scanReceipt: vi.fn(),
  acceptForProcessing: vi.fn(), priceDocument: vi.fn(), verifyOfficialReceipt: vi.fn(), confirmHandoff: vi.fn(),
}));
const FINANCE = { id: 4, role: 'clerk', desk_assignment: 'Finance', full_name: 'Finance Officer' };
const SECRETARY = { id: 5, role: 'clerk', desk_assignment: 'Secretary', full_name: 'Secretary' };
const DOC = { id: 11, request_group_id: 'REQ-G1', tracking_number: 'TRC-11', student_name: 'Ana Reyes',
  student_id: 'STU-001', document_type: 'Transcript of Records', amount: 100, or_number: 'OR-101',
  current_status: STATUS.PENDING_FINANCE_VERIFICATION, payment_status: 'UNPAID', updated_at: '2026-09-30T00:00:00Z' };

beforeEach(() => {
  vi.clearAllMocks();
  getFinanceTransactions.mockResolvedValue({ transactions: [{ ...DOC, payment_status: 'PAID', current_status: STATUS.COMPLETED }], total: 1, amount: 100 });
  documents.getDocuments.mockResolvedValue({ documents: [DOC] });
  documents.getDashboardStats.mockResolvedValue({});
  documents.verifyPayment.mockResolvedValue({ message: 'Verified.' });
  documents.uploadDeferredOR.mockResolvedValue({ success: true });
  documents.verifyOfficialReceipt.mockResolvedValue({ message: 'Verified.' });
});

describe('Physical OR now, digital copy later', () => {
  it('disables receipt selection and OCR when counter issuance is deferred and omits a retained receipt draft', async () => {
    const user = userEvent.setup();
    documents.getDocuments.mockResolvedValue({ documents: [{ ...DOC, current_status: STATUS.PENDING_STUDENT_PAYMENT }] });
    documents.logWalkInPayment.mockResolvedValue({ documents_covered: 1 });
    render(<FinanceDashboard user={FINANCE} setViewImageUrl={vi.fn()} />);
    await user.click(await screen.findByRole('button', { name: 'Log Counter Payment' }));
    const picker = screen.getByLabelText('Official Receipt copy · optional', { selector: 'input' });
    await user.upload(picker, new File(['copy'], 'counter.png', { type: 'image/png' }));
    await user.click(screen.getByRole('checkbox', { name: /Later/ }));
    expect(picker).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Read Receipt' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Record Payment' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Record Payment' })).getByRole('button', { name: 'Record Payment' }));
    await waitFor(() => expect(documents.logWalkInPayment).toHaveBeenCalledOnce());
    const body = documents.logWalkInPayment.mock.calls[0][1];
    expect(body.get('defer_or')).toBe('true');
    expect(body.has('officialReceipt')).toBe(false);
    expect(body.has('or_number')).toBe(false);
    expect(documents.scanReceipt).not.toHaveBeenCalled();
  });

  it('keeps a counter receipt local until Read Receipt, and saves only after confirmation', async () => {
    const user = userEvent.setup();
    documents.getDocuments.mockResolvedValue({ documents: [{ ...DOC, current_status: STATUS.PENDING_STUDENT_PAYMENT }] });
    documents.scanReceipt.mockResolvedValue({ success: true, message: 'Receipt read.', extracted_data: { or_number: 'OR-SCAN', confidence: 95 } });
    documents.logWalkInPayment.mockResolvedValue({ documents_covered: 1 });
    render(<FinanceDashboard user={FINANCE} setViewImageUrl={vi.fn()} />);
    await user.click(await screen.findByRole('button', { name: 'Log Counter Payment' }));
    const file = new File(['copy'], 'counter.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Official Receipt copy · optional', { selector: 'input' }), file);
    expect(documents.scanReceipt).not.toHaveBeenCalled();
    expect(documents.logWalkInPayment).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Read Receipt' }));
    await waitFor(() => expect(documents.scanReceipt).toHaveBeenCalledOnce());
    expect(documents.scanReceipt.mock.calls[0][0].get('receipt')).toBe(file);
    await user.click(await screen.findByRole('button', { name: 'OK' }));
    await user.click(screen.getByRole('button', { name: 'Record Payment' }));
    expect(documents.logWalkInPayment).not.toHaveBeenCalled();
    await user.click(within(screen.getByRole('dialog', { name: 'Record Payment' })).getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText(/Selected: counter.png/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Record Payment' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Record Payment' })).getByRole('button', { name: 'Record Payment' }));
    await waitFor(() => expect(documents.logWalkInPayment).toHaveBeenCalledOnce());
    expect(documents.logWalkInPayment.mock.calls[0][1].get('officialReceipt')).toBe(file);
    expect(documents.logWalkInPayment.mock.calls[0][1].get('or_number')).toBe('OR-SCAN');
  });

  it('verifies with an OR number and no uploaded copy, only after confirmation', async () => {
    const user = userEvent.setup();
    render(<FinanceDashboard user={FINANCE} setViewImageUrl={vi.fn()} />);
    await user.click(await screen.findByRole('tab', { name: /Verification Queue/ }));
    await user.click(screen.getByRole('button', { name: 'Review' }));
    const modal = screen.getByRole('dialog', { name: 'Verification Details' });
    expect(within(modal).getByRole('button', { name: 'Verify Payment' })).toBeEnabled();
    await user.click(within(modal).getByRole('button', { name: 'Verify Payment' }));
    expect(documents.verifyPayment).not.toHaveBeenCalled();
    await user.click(within(screen.getByRole('dialog', { name: /Verify Payment/ })).getByRole('button', { name: /Verify/ }));
    await waitFor(() => expect(documents.verifyPayment).toHaveBeenCalledOnce());
    const [id, payload] = documents.verifyPayment.mock.calls[0];
    expect(id).toBe(DOC.id);
    expect(payload.get('or_number')).toBe('OR-101');
    expect(payload.has('officialReceipt')).toBe(false);
  });

  it('requires the OR number even when a copy will be uploaded later', async () => {
    const user = userEvent.setup();
    documents.getDocuments.mockResolvedValue({ documents: [{ ...DOC, or_number: null }] });
    render(<FinanceDashboard user={FINANCE} setViewImageUrl={vi.fn()} />);
    await user.click(await screen.findByRole('tab', { name: /Verification Queue/ }));
    await user.click(screen.getByRole('button', { name: 'Review' }));
    expect(screen.getByRole('button', { name: 'Verify Payment' })).toBeDisabled();
    expect(documents.verifyPayment).not.toHaveBeenCalled();
  });

  it('cancels a deferred upload without losing the file, then uploads it once', async () => {
    const user = userEvent.setup();
    const completed = { ...DOC, current_status: STATUS.COMPLETED, payment_status: 'PAID' };
    documents.getDocuments.mockResolvedValue({ documents: [completed] });
    render(<FinanceDashboard user={FINANCE} setViewImageUrl={vi.fn()} />);
    await user.click(await screen.findByRole('tab', { name: /Transactions & OR Copies/ }));
    expect(screen.getByRole('tab', { name: /Transactions & OR Copies/ })).toHaveTextContent('1');
    expect(screen.getByText('Issued; digital copy pending')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Upload OR copy' }));
    const file = new File(['copy'], 'or-copy.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Official POS Receipt'), file);
    const submit = screen.getByRole('button', { name: 'Upload Receipt' });
    expect(submit.form).toHaveAttribute('id', 'deferred-or-form');
    fireEvent.submit(submit.form);
    await user.click(within(screen.getByRole('dialog', { name: 'Upload Official Receipt Copy' })).getByRole('button', { name: 'Cancel' }));
    expect(documents.uploadDeferredOR).not.toHaveBeenCalled();
    expect(screen.getByText(/Selected: or-copy.png/)).toBeInTheDocument();
    fireEvent.submit(submit.form);
    await user.click(screen.getByRole('button', { name: 'Confirm Upload' }));
    await waitFor(() => expect(documents.uploadDeferredOR).toHaveBeenCalledExactlyOnceWith(DOC.id, file, expect.objectContaining({ orNumber: 'OR-101', orDate: '' })));
    expect(documents.verifyPayment).not.toHaveBeenCalled();
    expect(completed.current_status).toBe(STATUS.COMPLETED);
  });

  it('preserves the failed upload and confirmation beneath visible feedback', async () => {
    const user = userEvent.setup();
    documents.getDocuments.mockResolvedValue({ documents: [{ ...DOC, current_status: STATUS.READY_FOR_RELEASE }] });
    documents.uploadDeferredOR.mockRejectedValue({ response: { data: { error: 'Upload unavailable.' } } });
    render(<FinanceDashboard user={FINANCE} setViewImageUrl={vi.fn()} />);
    await user.click(await screen.findByRole('tab', { name: /Transactions & OR Copies/ }));
    await user.click(screen.getByRole('button', { name: 'Upload OR copy' }));
    await user.upload(screen.getByLabelText('Official POS Receipt'), new File(['copy'], 'or.png', { type: 'image/png' }));
    fireEvent.submit(screen.getByRole('button', { name: 'Upload Receipt' }).form);
    await user.click(screen.getByRole('button', { name: 'Confirm Upload' }));
    expect(await screen.findByRole('dialog', { name: 'Attention Needed' })).toHaveTextContent('Upload unavailable.');
    await user.click(screen.getByRole('button', { name: 'OK' }));
    expect(screen.getByRole('dialog', { name: 'Upload Official Receipt Copy' })).toBeInTheDocument();
    expect(screen.getByText(/Selected: or.png/)).toBeInTheDocument();
  });

  it('requires explicit physical inspection when Secretary has no digital copy', async () => {
    const confirm = vi.fn();
    const doc = { ...DOC, current_status: STATUS.PAID_PENDING_SEC_RELEASE };
    render(<ReceiptVerificationModal selectedDoc={doc} setActiveModal={vi.fn()} setViewImageUrl={vi.fn()}
      handleSecretaryVerifyReceipt={confirm} actionLoading={false} />);
    const button = screen.getByRole('button', { name: 'Confirm Receipt' });
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /I inspected the physical/ }));
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(confirm).toHaveBeenCalledExactlyOnceWith('confirm', { physicalReceiptChecked: true });
  });

  it('blocks Secretary verification with no OR number even after physical inspection', () => {
    render(<ReceiptVerificationModal selectedDoc={{ ...DOC, or_number: null }} setActiveModal={vi.fn()}
      setViewImageUrl={vi.fn()} handleSecretaryVerifyReceipt={vi.fn()} actionLoading={false} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: 'Confirm Receipt' })).toBeDisabled();
  });

  it('records physical inspection through the existing notes payload and prevents bypassing its UI guard', async () => {
    const { result } = renderHook(() => useSecretaryDashboard(SECRETARY));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.handleVerifyOfficialReceipt({ ...DOC, current_status: STATUS.PAID_PENDING_SEC_RELEASE }));
    await act(() => result.current.confirmVerifyOfficialReceiptAction('confirm'));
    expect(documents.verifyOfficialReceipt).not.toHaveBeenCalled();
    await act(() => result.current.confirmVerifyOfficialReceiptAction('confirm', { physicalReceiptChecked: true }));
    expect(documents.verifyOfficialReceipt).toHaveBeenCalledExactlyOnceWith(DOC.id, {
      notes: 'Physical Official Receipt OR-101 inspected by Secretary. Finance may upload its retained copy later.', physical_receipt_checked: true,
    });
  });
});

it('lets Finance choose Later and sends a payment acknowledgment decision without OR metadata', async () => {
  const user = userEvent.setup();
  documents.getDocuments.mockResolvedValue({ documents: [{ ...DOC, or_number: null }] });
  render(<FinanceDashboard user={FINANCE} setViewImageUrl={vi.fn()} />);
  await user.click(await screen.findByRole('tab', { name: /Verification Queue/ }));
  await user.click(screen.getByRole('button', { name: 'Review' }));
  await user.click(screen.getByRole('checkbox', { name: /Later/ }));
  await user.click(screen.getByRole('button', { name: 'Verify Payment' }));
  expect(documents.verifyPayment).not.toHaveBeenCalled();
  await user.click(within(screen.getByRole('dialog', { name: 'Verify Payment' })).getByRole('button', { name: 'Verify Payment' }));
  await waitFor(() => expect(documents.verifyPayment).toHaveBeenCalledOnce());
  const body = documents.verifyPayment.mock.calls[0][1];
  expect(body.get('defer_or')).toBe('true');
  expect(body.has('or_number')).toBe(false); expect(body.has('officialReceipt')).toBe(false);
});
