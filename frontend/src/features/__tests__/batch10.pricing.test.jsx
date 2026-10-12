import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MaintenancePanel from '@/features/admin/components/MaintenancePanel';
import NewRequestModal from '@/features/student/components/NewRequestModal';
import PricingModal from '@/features/secretary/components/PricingModal';
import PaymentStubModal from '@/features/secretary/components/PaymentStubModal';
import FinanceVerificationModal from '@/features/finance/components/FinanceVerificationModal';
import StudentDashboard from '@/features/student/StudentDashboard';
import useSecretaryDashboard from '@/features/secretary/useSecretaryDashboard';
import useStudentDashboard from '@/features/student/useStudentDashboard';
import FeeBreakdown from '@/components/FeeBreakdown';
import { calculateBreakdown } from '@/utils/pricing';
import { STATUS } from '@/utils/documentStatus';
import * as documentsService from '@/services/documentsService';

const { core, maintenance } = vi.hoisted(() => ({ core: {}, maintenance: {} }));
vi.mock('@/hooks/useDashboardCore', () => ({ default: () => core }));
vi.mock('@/features/admin/useMaintenance', () => ({ default: () => maintenance }));
vi.mock('@/services/referenceService', () => ({
  getDocumentTypes: vi.fn().mockResolvedValue({ document_types: [] }),
  getPaymentMethods: vi.fn().mockResolvedValue({ payment_methods: [] }),
}));
vi.mock('@/services/documentsService', () => ({
  acceptForProcessing: vi.fn(), priceDocument: vi.fn(), verifyOfficialReceipt: vi.fn(), confirmHandoff: vi.fn(),
  uploadDocument: vi.fn(), submitPayment: vi.fn(), cancelDocument: vi.fn(),
}));
vi.mock('@/services/api', () => ({ default: { get: vi.fn().mockResolvedValue({ data: null }) } }));
vi.mock('@/components/RequestMessagesPanel', () => ({ default: () => null }));
vi.mock('@/components/AuthedFilePreview', () => ({ default: () => null }));

const USER = { id: 1, role: 'student', student_id: 'STU-TEST', full_name: 'Test Student', user_type: 'student', year_started: 2020, graduation_year: 2024, last_attendance_year: 2024 };
const SCHEDULE = { version: 1, document_type: 'Transcript of Records', base_fee: 100, fee_rule: 'per_semester_block',
  rental_fee: 20, special_fee: 30, fee_items: [{ label: 'Certification', amount: 10 }], source: 'college', college_id: 2 };
const BILL = calculateBreakdown(SCHEDULE, { page_count: 3, copies: 2 }, true);
const DOC = { id: 10, document_type: 'Transcript of Records', tracking_number: 'TRC-TEST', request_group_id: 'REQ-TEST',
  copies: 2, pricing_schedule: SCHEDULE, pricing_snapshot: SCHEDULE, student_id: USER.student_id, student_name: USER.full_name,
  amount: BILL.total, fee_breakdown: BILL, current_status: STATUS.PENDING_STUDENT_PAYMENT, payment_status: 'UNPAID', priced_at: '2026-01-01' };
beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(core, { documents: [], dashStats: {}, loading: false, actionLoading: false, error: '', success: '',
    selectedDoc: null, activeModal: null, setSelectedDoc: vi.fn(), setActiveModal: vi.fn(), triggerNotification: vi.fn(), dismissNotification: vi.fn(),
    runAction: vi.fn(async action => { await action(); return true; }) });
  Object.assign(maintenance, { loading: false, saving: false, accounts: [], staff: [], colleges: [{ id: 2, name: 'Science' }], paymentMethods: [],
    documentTypes: [{ id: 7, name: 'Transcript of Records', base_fee: 100, fee_rule: 'per_semester_block', is_active: true, is_repeatable: true, rental_fee: 20, special_fee: 30, fee_items: [{ label: 'Certification', amount: 10 }], college_fee_schedules: [] }],
    success: '', error: '', updateDocumentType: vi.fn().mockResolvedValue(true) });
  documentsService.uploadDocument.mockResolvedValue({ message: 'Filed.' });
});

describe('Admin fee schedule editor', () => {
  it('preserves extras, adds a complete college override and saves only after confirmation', async () => {
    const user = userEvent.setup();
    render(<MaintenancePanel user={{ role: 'admin' }} currentTab="admin-maintenance" />);
    await user.click(screen.getByRole('tab', { name: /^Document Types/ }));
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByLabelText('Rental Fee (₱)')).toHaveValue(20);
    expect(screen.getByLabelText('Item name')).toHaveValue('Certification');
    await user.click(screen.getByRole('button', { name: 'Add college override' }));
    await user.selectOptions(screen.getByLabelText('College'), '2');
    await user.clear(screen.getByLabelText('College base rate (₱)'));
    await user.type(screen.getByLabelText('College base rate (₱)'), '80');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(maintenance.updateDocumentType).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Save', exact: true }));
    expect(maintenance.updateDocumentType).toHaveBeenCalledWith(7, expect.objectContaining({ rental_fee: 20, special_fee: 30,
      fee_items: [{ label: 'Certification', amount: 10 }], college_fee_schedules: [expect.objectContaining({ college_id: 2, base_fee: '80', fee_rule: 'flat', rental_fee: 0 })] }));
  });
});

it('shows TOR rate information and study years, without a pre-submission total or calculation', () => {
  render(<NewRequestModal user={USER} documentTypes={[{ ...SCHEDULE, name: 'Transcript of Records' }]} selections={{ 'Transcript of Records': { copies: 2, year_started: '2020', year_ended: '2024' } }}
    setActiveModal={vi.fn()} toggleDocumentType={vi.fn()} updateSelection={vi.fn()} handleStudentSubmitRequest={vi.fn()} />);
  expect(screen.getByText('₱100.00')).toBeInTheDocument();
  expect(screen.getByText('per printed page')).toBeInTheDocument();
  expect(screen.getByLabelText('Year Started')).toHaveValue('2020');
  expect(screen.getByLabelText('Year Started')).toHaveAttribute('readonly');
  expect(screen.queryByLabelText('Year Ended')).not.toBeInTheDocument();
  expect(screen.queryByText(/Semesters attended/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/How the Amount Was Worked Out|Estimate \(/)).not.toBeInTheDocument();
  expect(screen.queryByText('₱460.00')).not.toBeInTheDocument();
});

it('saves study years and attachment only after request confirmation', async () => {
  const { result } = renderHook(() => useStudentDashboard(USER));
  await waitFor(() => expect(result.current.documentTypesLoading).toBe(false));
  act(() => result.current.toggleDocumentType('Transcript of Records'));
  act(() => result.current.updateSelection('Transcript of Records', { year_started: '2020', year_ended: '2024' }));
  await act(() => result.current.handleStudentSubmitRequest({ preventDefault: vi.fn() }));
  expect(documentsService.uploadDocument).not.toHaveBeenCalled();
  await act(() => result.current.confirmStudentSubmission());
  const item = JSON.parse(documentsService.uploadDocument.mock.calls[0][0].get('items'))[0];
  expect(item).not.toHaveProperty('year_started');
  expect(item).not.toHaveProperty('year_ended');
  expect(item.semesters).toBeUndefined();
  expect(JSON.parse(item.purpose)).toEqual({ year_started: 2020 });
});
it.each(['', '2001', '9999', '2020.5'])('rejects invalid saved Year Started %s', async year_started => {
  const { result } = renderHook(() => useStudentDashboard({ ...USER, year_started }));
  act(() => result.current.toggleDocumentType('Transcript of Records'));
  act(() => result.current.updateSelection('Transcript of Records', { year_started: '2020', year_ended: '2024' }));
  await act(() => result.current.handleStudentSubmitRequest({ preventDefault: vi.fn() }));
  expect(result.current.submissionToConfirm).toBeNull();
  expect(core.triggerNotification).toHaveBeenCalledWith(expect.stringContaining('Year Started'), 'error');
});

it('derives Secretary pricing from actual pages and submits no editable amount', async () => {
  core.selectedDoc = { ...DOC, priced_at: null, current_status: STATUS.SEC_PROCESSING };
  core.documents = [core.selectedDoc]; core.activeModal = 'price';
  documentsService.priceDocument.mockResolvedValue({ billed: true, document: DOC });
  const { result } = renderHook(() => useSecretaryDashboard({ role: 'clerk' }));
  act(() => result.current.setPricePageCount('3'));
  expect(result.current.priceAmount).toBe('660.00');
  act(() => result.current.handlePriceDocument());
  expect(result.current.pricingToConfirm).toBe(true);
  expect(documentsService.priceDocument).not.toHaveBeenCalled();
  await act(() => result.current.confirmPriceDocument());
  expect(documentsService.priceDocument).toHaveBeenCalledWith(DOC.id, { page_count: 3, pricing_notes: '', confirm_current_rates: false });
  expect(core.setSelectedDoc).toHaveBeenCalledWith(DOC);
});
it('requires a review checkbox for current rates on an older request', () => {
  const onPrice = vi.fn();
  const props = { selectedDoc: { ...DOC, pricing_requires_review: true }, priceAmount: '660.00', priceBreakdown: BILL,
    pricePageCount: '3', setPricePageCount: vi.fn(), priceNotes: '', setPriceNotes: vi.fn(), setConfirmCurrentRates: vi.fn(), setActiveModal: vi.fn(), handlePriceDocument: onPrice };
  const { rerender } = render(<PricingModal {...props} confirmCurrentRates={false} />);
  expect(screen.getByRole('button', { name: 'Save & Bill Student' })).toBeDisabled();
  expect(screen.getByLabelText('Calculated amount to charge')).toHaveAttribute('readonly');
  rerender(<PricingModal {...props} confirmCurrentRates />);
  expect(screen.getByRole('button', { name: 'Save & Bill Student' })).toBeEnabled();
});

it('shows saved final calculations on the student dashboard and checkout', async () => {
  core.documents = [DOC];
  const { rerender } = render(<StudentDashboard user={USER} currentTab="dashboard" setViewImageUrl={vi.fn()} />);
  const panel = screen.getByRole('region', { name: 'Payment for request REQ-TEST' });
  expect(panel).toHaveTextContent('How the Amount Was Worked Out'); expect(panel).toHaveTextContent('₱660.00');
  expect(panel).toHaveTextContent('3 pages per copy × 2 copies × ₱100.00');
  core.selectedDoc = { ...DOC, group_total: 660, group_documents: [DOC] }; core.activeModal = 'pay';
  rerender(<StudentDashboard user={USER} currentTab="dashboard" setViewImageUrl={vi.fn()} />);
  const checkout = screen.getByRole('list', { name: 'Payment breakdown' });
  expect(checkout).toHaveTextContent('Certification'); expect(checkout).toHaveTextContent('₱660.00');
});
it('hides provisional charges in student history until final pricing', () => {
  core.documents = [{ ...DOC, priced_at: null, current_status: STATUS.SEC_PROCESSING,
    amount: 460, fee_breakdown: { ...BILL, stage: 'estimate', total: 460 } }];
  render(<StudentDashboard user={USER} currentTab="request-history" setViewImageUrl={vi.fn()} />);
  expect(screen.getByText('Pending Secretary pricing')).toBeInTheDocument();
  expect(screen.queryByText('₱460.00')).not.toBeInTheDocument();
  expect(screen.queryByText('How the Amount Was Worked Out')).not.toBeInTheDocument();
});
it('shows the same saved bill in Finance and the printed payment slip', () => {
  const { unmount } = render(<FinanceVerificationModal selectedDoc={DOC} setActiveModal={vi.fn()} handleFinanceVerify={vi.fn()} setFinanceReceiptFile={vi.fn()} triggerNotification={vi.fn()} />);
  expect(screen.getByText('3 pages per copy × 2 copies × ₱100.00')).toBeInTheDocument();
  expect(screen.getByText('Certification')).toBeInTheDocument();
  unmount();
  render(<PaymentStubModal selectedDoc={DOC} groupDocs={[DOC]} setActiveModal={vi.fn()} />);
  expect(screen.getByText('3 pages per copy × 2 copies × ₱100.00')).toBeInTheDocument();
});
it('preserves legacy totals and escapes saved item labels', () => {
  const { rerender } = render(<FeeBreakdown amount={75} />);
  const description = screen.getByText(/Recorded charge:/);
  expect(description).toHaveTextContent('Recorded charge: ₱75.00. Detailed calculation was not saved for this older record.');
  expect(description).toHaveClass('text-gray-700', 'dark:text-gray-200');
  expect(within(description).getByText('₱75.00')).toHaveClass('font-semibold', 'text-gray-900', 'dark:text-gray-100');
  rerender(<FeeBreakdown breakdown={{ ...BILL, items: [{ label: '<img src=x onerror=alert(1)>', calculation: 'saved', amount: 75 }] }} />);
  expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
  expect(document.querySelector('img')).toBeNull();
});

describe('New Request profile gate', () => {
  const complete = { ...USER, email: 'student@example.test', phone_number: '09123456789',
    birth_date: '2000-01-01', place_of_birth: 'City', sex: 'Male', civil_status: 'Single', home_address: 'Address',
    elem_school: 'Elementary', elem_grad_year: 2012, jhs_school: 'Junior High', jhs_grad_year: 2016,
    shs_school: 'Senior High', shs_grad_year: 2018 };
  it('blocks an otherwise complete unverified student before opening the request form and links to Profile', async () => {
    const opened = vi.fn();
    window.addEventListener('open-profile-settings', opened);
    try {
      render(<StudentDashboard user={{ ...complete, email_verified_at: null }} currentTab="dashboard" setViewImageUrl={vi.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: 'New Request' }));
      expect(screen.getByText('Email Address verification — choose Verify in Edit Profile')).toBeVisible();
      expect(core.setActiveModal).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Complete Profile' }));
      expect(opened).toHaveBeenCalledOnce();
    } finally { window.removeEventListener('open-profile-settings', opened); }
  });
  it('blocks a student with contacts but missing education and opens Edit Profile from the popup', async () => {
    const user = userEvent.setup(), opened = vi.fn();
    window.addEventListener('open-profile-settings', opened);
    try {
      render(<StudentDashboard user={{ ...complete, shs_grad_year: '' }} currentTab="dashboard" setViewImageUrl={vi.fn()} />);
      await user.click(screen.getByRole('button', { name: 'New Request' }));
      expect(screen.getByRole('dialog', { name: 'Profile Incomplete' })).toBeVisible();
      expect(screen.getByText('Senior High Year Graduated')).toBeVisible();
      expect(core.setActiveModal).not.toHaveBeenCalled();
      await user.click(screen.getByRole('button', { name: 'Complete Profile' }));
      expect(opened).toHaveBeenCalledOnce();
      expect(screen.queryByRole('dialog', { name: 'Profile Incomplete' })).not.toBeInTheDocument();
    } finally { window.removeEventListener('open-profile-settings', opened); }
  });
  it('opens intake for a complete saved student profile', async () => {
    render(<StudentDashboard user={complete} currentTab="dashboard" setViewImageUrl={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'New Request' }));
    expect(core.setActiveModal).toHaveBeenCalledWith('new-request');
    expect(screen.queryByRole('dialog', { name: 'Profile Incomplete' })).not.toBeInTheDocument();
  });
});

it('shows the attachment label once while retaining a named picker and selected file', async () => {
  const update = vi.fn(), label = 'Required Attachment (Signed Routing Form)';
  const user = userEvent.setup();
  render(<NewRequestModal user={USER} documentTypes={[{ name: 'Transcript of Records', requires_attachment: true, attachment_label: label }]}
    selections={{ 'Transcript of Records': { copies: 1 } }} setActiveModal={vi.fn()} toggleDocumentType={vi.fn()} updateSelection={update} handleStudentSubmitRequest={vi.fn()} />);
  expect(screen.getAllByText(label)).toHaveLength(1);
  const file = new File(['synthetic'], 'routing.png', { type: 'image/png' });
  await user.upload(screen.getByLabelText(label, { selector: 'input' }), file);
  expect(update).toHaveBeenCalledWith('Transcript of Records', { file });
});
it('routes missing saved request years to profile completion and disables submission', () => {
  const close = vi.fn(), openProfile = vi.fn();
  window.addEventListener('open-profile-settings', openProfile);
  try {
    render(<NewRequestModal user={{ ...USER, year_started: null }} documentTypes={[{ name: 'Transcript of Records' }]}
      selections={{ 'Transcript of Records': { copies: 1 } }} setActiveModal={close} toggleDocumentType={vi.fn()} updateSelection={vi.fn()} handleStudentSubmitRequest={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Complete Study Years' }));
    expect(close).toHaveBeenCalledWith(null);
    expect(openProfile.mock.calls[0][0].detail).toEqual({ section: 'educational' });
  } finally { window.removeEventListener('open-profile-settings', openProfile); }
});
