import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within, renderHook, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FinanceDashboard from '@/features/finance/FinanceDashboard';
import ReceiptVerificationModal from '@/features/secretary/components/ReceiptVerificationModal';
import useSecretaryDashboard from '@/features/secretary/useSecretaryDashboard';
import * as documents from '@/services/documentsService';
import * as receiptApi from '@/services/receiptService';
vi.mock('@/utils/receiptTiming',async importOriginal=>({...await importOriginal(),receiptWindow:()=>({afterCutoff:false})}));
import { getFinanceTransactions } from '@/services/financeService';
vi.mock('@/services/receiptService',()=>({receiptState:vi.fn().mockResolvedValue({version:0,pack:null,print_config:{width_mm:150,height_mm:290,margin_mm:5,offset_x_mm:0,offset_y_mm:0}}),receiptHistory:vi.fn().mockResolvedValue({receipts:[],packs:[]}),receiptError:error=>error.message||'Receipt action failed.'}));
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
  it.each(['transactions'])('opens %s as a dedicated workspace without dashboard queries or tabs', async currentTab => {
    render(<FinanceDashboard user={FINANCE} currentTab={currentTab} setViewImageUrl={vi.fn()} />);
    await screen.findByText('Issued; digital copy pending');
    expect(screen.getByRole('heading', { name: 'Payment History' })).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(documents.getDocuments).not.toHaveBeenCalled();
    expect(documents.getDashboardStats).not.toHaveBeenCalled();
    expect(getFinanceTransactions).toHaveBeenCalledOnce();
  });
  it('keeps Dashboard on payment work without fetching transactions', async () => {
    render(<FinanceDashboard user={FINANCE} setViewImageUrl={vi.fn()} />);
    await screen.findByRole('tab', { name: /Verification Queue/ });
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(getFinanceTransactions).not.toHaveBeenCalled();
  });
  it('uses View OR only for available private copies and leaves missing/deferred states meaningful', async () => {
    const user = userEvent.setup(), view = vi.fn();
    getFinanceTransactions.mockResolvedValue({ transactions: [
      { ...DOC, official_receipt_path: '/app/uploads/synthetic-or.pdf' },
      { ...DOC, id: 12, request_group_id: 'REQ-G2' },
      { ...DOC, id: 13, request_group_id: 'REQ-G3', or_number: null },
    ], total: 3, amount: 300 });
    render(<FinanceDashboard user={FINANCE} currentTab="transactions" setViewImageUrl={view} />);
    await user.click(await screen.findByRole('button', { name: 'View OR' }));
    expect(screen.getByRole('dialog', { name: 'Document preview' })).toBeInTheDocument();
    expect(view).not.toHaveBeenCalled();
    await user.click(within(screen.getByRole('dialog', { name: 'Document preview' })).getByRole('button', { name: 'Close', exact: true }));
    expect(screen.getByText('Issued; digital copy pending')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /Issuance pending/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload OR' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Issue pending OR' })).toBeEnabled();
    expect(document.querySelector('a[href*="uploads"]')).toBeNull();
  });
  it('disables receipt selection and OCR when counter issuance is deferred and omits a retained receipt draft', async () => {
    const user = userEvent.setup();
    documents.getDocuments.mockResolvedValue({ documents: [{ ...DOC, current_status: STATUS.PENDING_STUDENT_PAYMENT }] });
    documents.logWalkInPayment.mockResolvedValue({ documents_covered: 1 });
    render(<FinanceDashboard user={FINANCE} setViewImageUrl={vi.fn()} />);
    await user.click(await screen.findByRole('button', { name: 'Log Counter Payment' }));
    await user.click(screen.getByRole('checkbox', { name: /Later/ }));
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
    await user.click(screen.getByRole('checkbox', { name: /Later/ }));
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
    render(<FinanceDashboard user={FINANCE} currentTab="transactions" setViewImageUrl={vi.fn()} />);
    await screen.findByRole('heading', { name: 'Payment History' });
    expect((await screen.findByText('cleared requests')).previousElementSibling).toHaveTextContent('1');
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.getByText('Issued; digital copy pending')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Upload OR' }));
    const file = new File(['copy'], 'or-copy.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Official POS Receipt'), file);
    const submit = screen.getByRole('button', { name: 'Upload Receipt' });
    expect(submit.form).toHaveAttribute('id', 'deferred-or-form');
    fireEvent.submit(submit.form);
    await user.click(within(screen.getByRole('dialog', { name: 'Upload Official Receipt Copy' })).getByRole('button', { name: 'Cancel' }));
    expect(documents.uploadDeferredOR).not.toHaveBeenCalled();
    expect(screen.getByText('or-copy.png', {exact:true})).toBeInTheDocument();
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
    render(<FinanceDashboard user={FINANCE} currentTab="transactions" setViewImageUrl={vi.fn()} />);
    await screen.findByRole('heading', { name: 'Payment History' });
    await user.click(screen.getByRole('button', { name: 'Upload OR' }));
    await user.upload(screen.getByLabelText('Official POS Receipt'), new File(['copy'], 'or.png', { type: 'image/png' }));
    fireEvent.submit(screen.getByRole('button', { name: 'Upload Receipt' }).form);
    await user.click(screen.getByRole('button', { name: 'Confirm Upload' }));
    expect(await screen.findByRole('dialog', { name: 'Attention Needed' })).toHaveTextContent('Upload unavailable.');
    await user.click(screen.getByRole('button', { name: 'OK' }));
    expect(screen.getByRole('dialog', { name: 'Upload Official Receipt Copy' })).toBeInTheDocument();
    expect(screen.getByText('or.png', {exact:true})).toBeInTheDocument();
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

it('Later retains pack issuance and sends only the copy-deferral flag', async () => {
  const user = userEvent.setup();
  receiptApi.receiptState.mockResolvedValueOnce({version:1,pack:{id:1,next_serial:'DEMO00001',last_serial:'DEMO00050',consumed:0},print_config:{width_mm:150,height_mm:290,margin_mm:5,offset_x_mm:0,offset_y_mm:0}});
  documents.getDocuments.mockResolvedValue({ documents: [{ ...DOC, or_number: null }] });
  render(<FinanceDashboard user={FINANCE} setViewImageUrl={vi.fn()} />);
  await user.click(await screen.findByRole('tab', { name: /Verification Queue/ }));
  await user.click(screen.getByRole('button', { name: 'Review' }));
  await screen.findByDisplayValue('DEMO00001');
  await user.click(screen.getByRole('checkbox', { name: /Later/ }));
  expect(screen.getByDisplayValue('DEMO00001')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Verify Payment' }));
  expect(documents.verifyPayment).not.toHaveBeenCalled();
  await user.click(within(screen.getByRole('dialog', { name: 'Verify Payment' })).getByRole('button', { name: 'Verify Payment' }));
  await waitFor(() => expect(documents.verifyPayment).toHaveBeenCalledOnce());
  const body = documents.verifyPayment.mock.calls[0][1];
  expect(body.get('defer_copy')).toBe('true');expect(body.get('use_pack')).toBe('true');expect(body.get('expected_serial')).toBe('DEMO00001');
  expect(body.has('defer_or')).toBe(false); expect(body.has('officialReceipt')).toBe(false);expect(body.has('payor_name')).toBe(false);
});


it('enables Print in Review after confirmed managed payment, even when the queue row disappears', async () => {
  const user = userEvent.setup();
  const receipt = { id: 3, serial: 'DEMO00001', state: 'ISSUED', snapshot: {
    payor_name: 'Reyes, Ana', items: [], total_centavos: 10000,
    amount_words: 'One Hundred Pesos and 00/100', issue_date: '2026-10-13',
  } };
  receiptApi.receiptState.mockResolvedValueOnce({version:1,pack:{id:1,next_serial:'DEMO00001',last_serial:'DEMO00050',consumed:0},print_config:{width_mm:150,height_mm:290,margin_mm:5,offset_x_mm:0,offset_y_mm:0}});
  documents.getDocuments.mockResolvedValueOnce({ documents: [{ ...DOC, or_number: null }] }).mockResolvedValue({ documents: [] });
  documents.verifyPayment.mockResolvedValue({ message: 'Verified.', receipt });
  render(<FinanceDashboard user={FINANCE} setViewImageUrl={vi.fn()} />);
  await user.click(await screen.findByRole('tab', { name: /Verification Queue/ }));
  await user.click(screen.getByRole('button', { name: 'Review' }));
  await screen.findByDisplayValue('DEMO00001');
  expect(screen.getByRole('button', { name: 'Print' })).toBeDisabled();
  await user.click(screen.getByRole('checkbox', { name: /Later/ }));
  await user.click(screen.getByRole('button', { name: 'Verify Payment' }));
  expect(documents.verifyPayment).not.toHaveBeenCalled();
  await user.click(within(screen.getByRole('dialog', { name: 'Verify Payment' })).getByRole('button', { name: 'Verify Payment' }));
  await user.click(await screen.findByRole('button', { name: 'OK' }));
  const modal = screen.getByRole('dialog', { name: 'Verification Details' });
  await waitFor(() => expect(within(modal).getByRole('button', { name: 'Print' })).toBeEnabled());
  expect(within(modal).getByLabelText('Recorded Official Receipt Number')).toHaveValue(receipt.serial);
  expect(within(modal).getByRole('button', { name: 'Payment Verified' })).toBeDisabled();
  await user.click(within(modal).getByRole('button', { name: 'Print' }));
  expect(screen.getByTitle('Official Receipt print preview')).toBeInTheDocument();
  expect(documents.verifyPayment).toHaveBeenCalledOnce();
  expect(documents.verifyPayment.mock.calls[0][1].get('defer_copy')).toBe('true');
});
