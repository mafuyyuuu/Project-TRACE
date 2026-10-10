import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import useWindow1Dashboard from '@/features/window1/useWindow1Dashboard';
import useSecretaryDashboard from '@/features/secretary/useSecretaryDashboard';
import useStudentDashboard from '@/features/student/useStudentDashboard';
import UserEditModal from '@/features/admin/components/UserEditModal';
import AdminTemplatesPanel from '@/features/admin/components/AdminTemplatesPanel';
import * as documents from '@/services/documentsService';
import api from '@/services/api';
import { STATUS } from '@/utils/documentStatus';

const { core } = vi.hoisted(() => ({ core: {} }));
vi.mock('@/hooks/useDashboardCore', () => ({ default: () => core }));
vi.mock('@/services/referenceService', () => ({
  getDocumentTypes: vi.fn().mockResolvedValue({ document_types: [] }),
  getPaymentMethods: vi.fn().mockResolvedValue({ payment_methods: [] }),
}));
vi.mock('@/services/authService', () => ({ lookupStudent: vi.fn() }));
vi.mock('@/services/documentsService', () => ({
  uploadDocument: vi.fn(), intakeDocument: vi.fn(), releaseDocument: vi.fn(),
  acceptForProcessing: vi.fn(), priceDocument: vi.fn(), verifyOfficialReceipt: vi.fn(),
  confirmHandoff: vi.fn(), submitPayment: vi.fn(), cancelDocument: vi.fn(),
}));
vi.mock('@/services/api', () => ({ default: { get: vi.fn(), put: vi.fn() } }));
const USER = { id: 4, full_name: 'Desk Officer', year_started: 2020, graduation_year: 2024 };
const DOC = { id: 11, tracking_number: 'TRC-11', or_number: 'OR-101', current_status: STATUS.READY_FOR_RELEASE };

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(core, { documents: [DOC], selectedDoc: DOC, activeModal: null,
    setActiveModal: vi.fn(), triggerNotification: vi.fn(),
    runAction: vi.fn(async (action) => { await action(); return true; }),
  });
  documents.uploadDocument.mockResolvedValue({ tracking_number: 'TRC-12' });
});

describe('Desk and student submission gates', () => {
  it.each([false, true])('finishes confirmed pricing without crashing (billed=%s)', async (billed) => {
    documents.priceDocument.mockResolvedValue({ billed, message: 'Priced.' });
    const { result } = renderHook(() => useSecretaryDashboard(USER));
    core.selectedDoc = { ...DOC, pricing_schedule: { base_fee: 100, fee_rule: 'flat' } };
    act(() => result.current.setPricePageCount('1'));
    act(() => result.current.handlePriceDocument());
    expect(documents.priceDocument).not.toHaveBeenCalled();
    await act(() => result.current.confirmPriceDocument());
    expect(documents.priceDocument).toHaveBeenCalledExactlyOnceWith(DOC.id, { page_count: 1, pricing_notes: '', confirm_current_rates: false });
    expect(result.current.pricingToConfirm).toBe(false);
    expect(result.current.pricePageCount).toBe('');
    expect(core.setActiveModal).toHaveBeenCalledWith(billed ? 'payment-stub' : null);
  });
  it('waits for release confirmation and leaves the ready document untouched on cancel', async () => {
    const { result } = renderHook(() => useWindow1Dashboard(USER));
    act(() => result.current.handleWindow1Release(DOC));
    expect(documents.releaseDocument).not.toHaveBeenCalled();
    act(() => result.current.cancelWindow1ReleaseConfirm());
    expect(DOC.current_status).toBe(STATUS.READY_FOR_RELEASE);
    act(() => result.current.handleWindow1Release(DOC));
    await act(() => result.current.confirmWindow1Release());
    expect(documents.releaseDocument).toHaveBeenCalledExactlyOnceWith(DOC.id);
    expect(result.current.releaseToConfirm).toBeNull();
  });

  it('blocks an intake return without notes and preserves correction notes when confirmation is cancelled', async () => {
    const { result } = renderHook(() => useWindow1Dashboard(USER));
    act(() => result.current.handleIntake('return'));
    expect(result.current.intakeActionToConfirm).toBeNull();
    expect(core.triggerNotification).toHaveBeenCalledWith('Say what the student needs to correct.', 'error');
    act(() => result.current.setIntakeNotes('Correct the student name.'));
    act(() => result.current.handleIntake('return'));
    expect(documents.intakeDocument).not.toHaveBeenCalled();
    act(() => result.current.cancelIntake());
    expect(result.current.intakeNotes).toBe('Correct the student name.');
    act(() => result.current.handleIntake('return'));
    await act(() => result.current.confirmIntake());
    const [id, payload] = documents.intakeDocument.mock.calls[0];
    expect(id).toBe(DOC.id);
    expect(payload.get('notes')).toBe('Correct the student name.');
    expect(payload.get('action')).toBe('return');
  });

  it('preserves a manual form on cancel and failed submission, resets only after success', async () => {
    const { result } = renderHook(() => useWindow1Dashboard(USER));
    const form = { studentId: { value: 'STU-001' }, fullName: { value: 'Ana Reyes' },
      docType: { value: 'Transcript of Records' }, reset: vi.fn() };
    await act(() => result.current.handleManualInputSubmit({ preventDefault: vi.fn(), target: form }));
    expect(documents.uploadDocument).not.toHaveBeenCalled();
    act(() => result.current.cancelWindow1Submission());
    expect(form.reset).not.toHaveBeenCalled();
    await act(() => result.current.handleManualInputSubmit({ preventDefault: vi.fn(), target: form }));
    core.runAction.mockResolvedValueOnce(false);
    await act(() => result.current.confirmWindow1Submission());
    expect(form.reset).not.toHaveBeenCalled();
    expect(result.current.submissionToConfirm).not.toBeNull();
    await act(() => result.current.confirmWindow1Submission());
    expect(form.reset).toHaveBeenCalledOnce();
    expect(documents.uploadDocument.mock.calls[0][0].get('student_id')).toBe('STU-001');
  });

  it('requires notes and confirmation for prior original issuance, without carrying the choice to another request', async () => {
    const { result, rerender } = renderHook(() => useWindow1Dashboard(USER));
    act(() => result.current.setOriginalIssued(true));
    act(() => result.current.handleIntake('approve'));
    expect(result.current.intakeActionToConfirm).toBeNull();
    act(() => result.current.setIntakeNotes('Checked issuance register.'));
    act(() => result.current.handleIntake('approve'));
    expect(documents.intakeDocument).not.toHaveBeenCalled();
    act(() => result.current.cancelIntake());
    expect(result.current.originalIssued).toBe(true);
    core.selectedDoc = { ...DOC, id: 12 };
    rerender();
    expect(result.current.originalIssued).toBe(false);
    act(() => result.current.handleIntake('approve'));
    await act(() => result.current.confirmIntake());
    expect(documents.intakeDocument.mock.calls[0][1].has('original_issued')).toBe(false);
  });

  it('keeps the scanned File until a confirmed upload succeeds', async () => {
    const { result } = renderHook(() => useWindow1Dashboard(USER));
    const file = new File(['scan'], 'request.png', { type: 'image/png' });
    act(() => result.current.setScanFile(file));
    await act(() => result.current.handleWindow1ScanUpload('Transcript of Records'));
    act(() => result.current.cancelWindow1Submission());
    expect(result.current.scanFile).toBe(file);
    expect(documents.uploadDocument).not.toHaveBeenCalled();
    await act(() => result.current.handleWindow1ScanUpload('Transcript of Records'));
    await act(() => result.current.confirmWindow1Submission());
    expect(documents.uploadDocument.mock.calls[0][0].get('document').name).toBe('request.png');
    expect(result.current.scanFile).toBeNull();
  });

  it('requires confirmation for Secretary evaluation and physical handoff', async () => {
    const { result } = renderHook(() => useSecretaryDashboard(USER));
    act(() => result.current.setEstimatedReadyDate('2026-10-01'));
    act(() => result.current.handleSecretaryEvaluate('approve'));
    expect(documents.acceptForProcessing).not.toHaveBeenCalled();
    act(() => result.current.cancelSecretaryEvaluate());
    expect(result.current.estimatedReadyDate).toBe('2026-10-01');
    act(() => result.current.handleSecretaryEvaluate('approve'));
    await act(() => result.current.confirmSecretaryEvaluate());
    expect(documents.acceptForProcessing).toHaveBeenCalledWith(DOC.id, expect.objectContaining({ action: 'approve' }));
    act(() => result.current.handleConfirmHandoff(DOC));
    expect(documents.confirmHandoff).not.toHaveBeenCalled();
    act(() => result.current.cancelHandoffConfirm());
    act(() => result.current.handleConfirmHandoff(DOC));
    await act(() => result.current.confirmHandoffAction());
    expect(documents.confirmHandoff).toHaveBeenCalledExactlyOnceWith(DOC.id);
  });

  it('retains a student request draft and attachment until the confirmed request succeeds', async () => {
    const { result } = renderHook(() => useStudentDashboard(USER));
    const file = new File(['id'], 'proof.png', { type: 'image/png' });
    await waitFor(() => expect(result.current.documentTypesLoading).toBe(false));
    act(() => result.current.toggleDocumentType('Transcript of Records'));
    act(() => result.current.updateSelection('Transcript of Records', { purpose: 'Employment', file, year_started: '2020', year_ended: '2024' }));
    await act(() => result.current.handleStudentSubmitRequest({ preventDefault: vi.fn() }));
    expect(documents.uploadDocument).not.toHaveBeenCalled();
    act(() => result.current.cancelStudentSubmission());
    expect(result.current.selections['Transcript of Records'].file).toBe(file);
    await act(() => result.current.handleStudentSubmitRequest({ preventDefault: vi.fn() }));
    await act(() => result.current.confirmStudentSubmission());
    const payload = documents.uploadDocument.mock.calls[0][0];
    expect(payload.get('document_0').name).toBe('proof.png');
    expect(JSON.parse(payload.get('items'))[0].purpose).toBe(JSON.stringify({ purpose: 'Employment', year_started: 2020 }));
    expect(result.current.selections).toEqual({});
  });

  it('requires confirmation before cancelling from Back to Form', async () => {
    const { result } = renderHook(() => useStudentDashboard(USER));
    await act(() => result.current.handleStudentCancelRequest(DOC.id, true));
    expect(documents.cancelDocument).not.toHaveBeenCalled();
    act(() => result.current.cancelStudentCancelConfirm());
    expect(core.setActiveModal).not.toHaveBeenCalled();
    await act(() => result.current.handleStudentCancelRequest(DOC.id, true));
    await act(() => result.current.confirmStudentCancelRequest());
    expect(documents.cancelDocument).toHaveBeenCalledExactlyOnceWith(DOC.id);
    expect(core.setActiveModal).toHaveBeenCalledWith('new-request');
  });
});

describe('Admin save confirmations', () => {
  it('keeps an edited name after Escape and submits only changed fields after confirmation', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(true);
    render(<UserEditModal open user={{ id: 8, full_name: 'Ana Reyes' }} onClose={vi.fn()} onSave={onSave} saving={false} />);
    const name = screen.getByDisplayValue('Ana Reyes');
    await user.clear(name);
    await user.type(name, 'Ana Cruz');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(onSave).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    expect(name).toHaveValue('Ana Cruz');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Confirm User Changes' })).getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledExactlyOnceWith(8, { full_name: 'Ana Cruz' }));
  });

  it('preserves template edits after cancelling and keeps the existing save payload', async () => {
    const user = userEvent.setup();
    api.get.mockImplementation(async (path) => ({ data: path === '/templates'
      ? [{ template_key: 'tor', name: 'Transcript' }]
      : { content: 'Original', font_family: 'serif', font_size: '12px' } }));
    api.put.mockResolvedValue({});
    render(<AdminTemplatesPanel />);
    const editor = await screen.findByDisplayValue('Original');
    fireEvent.change(editor, { target: { value: 'Updated {{STUDENT_NAME}}' } });
    await user.click(screen.getByRole('button', { name: 'Save Template' }));
    expect(api.put).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    expect(editor).toHaveValue('Updated {{STUDENT_NAME}}');
    await user.click(screen.getByRole('button', { name: 'Save Template' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Confirm Template Save' })).getByRole('button', { name: 'Save Template' }));
    await waitFor(() => expect(api.put).toHaveBeenCalledExactlyOnceWith('/templates/tor', {
      content: 'Updated {{STUDENT_NAME}}', font_family: 'serif', font_size: '12px',
    }));
  });
});
