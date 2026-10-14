import { describe, it, expect, vi, beforeEach } from 'vitest';
import { STATUS, LEGACY_STATUS, getStatusLabel } from '@/utils/documentStatus';
import { render, renderHook, fireEvent, act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';

/**
 * Category 2 admin panels: Maintenance CRUD, Reports/Export, and Analytics.
 *
 * The behaviours worth pinning are the ones a user could misread: that
 * "deactivate" is not a delete, that exports respect the on-screen filters, and
 * that staff figures are presented as workload rather than a ranking.
 */

vi.mock('@/services/authService', () => ({ getUsers: vi.fn(), getPendingStudents: vi.fn(), verifyStudent: vi.fn() }));
import { getUsers, getPendingStudents, verifyStudent } from '@/services/authService';
vi.mock('@/services/documentsService', () => ({
  getDocuments: vi.fn().mockResolvedValue({ documents: [] }),
  getDashboardStats: vi.fn().mockResolvedValue({}),
  getForecast: vi.fn().mockResolvedValue({ forecast: [] }),
  getInsights: vi.fn().mockResolvedValue({ insights: [] }),
  getActivityLogs: vi.fn().mockResolvedValue({ logs: [] }),
}));

vi.mock('@/services/maintenanceService', () => ({
  getStaff: vi.fn(), createStaff: vi.fn(), updateStaff: vi.fn(), setStaffActive: vi.fn(), setAccountActive:vi.fn(),
  getDocumentTypes: vi.fn(), createDocumentType: vi.fn(), updateDocumentType: vi.fn(), setDocumentTypeActive: vi.fn(),
  getColleges: vi.fn(), createCollege: vi.fn(), updateCollege: vi.fn(), setCollegeActive: vi.fn(),
  getPaymentMethods: vi.fn(), createPaymentMethod: vi.fn(), updatePaymentMethod: vi.fn(), setPaymentMethodActive: vi.fn(),
}));

vi.mock('@/services/reportsService', () => ({
  getReportFilterOptions: vi.fn().mockResolvedValue({colleges:[{id:4,name:'Synthetic College'}],document_types:[{id:1,name:'Diploma',is_active:1}],college_locked:false}),
  getDocumentReport: vi.fn(), getAnalytics: vi.fn(),
  exportStudentsCsv: vi.fn(), exportDocumentsCsv: vi.fn(),
}));

import * as maintenanceService from '@/services/maintenanceService';
import * as reportsService from '@/services/reportsService';
import MaintenancePanel from '@/features/admin/components/MaintenancePanel';
import ReportsPanel from '@/features/admin/components/ReportsPanel';
import AnalyticsPanel from '@/features/admin/components/AnalyticsPanel';
import AccountVerificationModal from '@/features/admin/components/AccountVerificationModal';
import useAdminDashboard from '@/features/admin/useAdminDashboard';
import useReports from '@/features/admin/useReports';
import { getWorkloadShares } from '@/utils/workloadShare';

const ADMIN = { id: 7, role: 'admin', full_name: 'Registrar Admin' };

const STAFF = [
  { id: 13, student_id: 'FINANCE001', full_name: 'Finance Officer', role: 'clerk', desk_assignment: 'Finance', is_active: 1, must_change_password: 0 },
  { id: 99, student_id: 'OLDCLERK', full_name: 'Retired Clerk', role: 'clerk', desk_assignment: 'Window 1', is_active: 0, must_change_password: 0 },
  { id: 7, student_id: 'ADMIN001', full_name: 'Registrar Admin', role: 'admin', desk_assignment: 'Admin Office', is_active: 1, must_change_password: 0 },
];

const DOC_TYPES = [
  { id: 1, name: 'Transcript of Records', base_fee: '100.00', fee_rule: 'per_semester_block', requires_attachment: 0, is_active: 1 },
  { id: 5, name: 'Retired Document', base_fee: '50.00', fee_rule: 'flat', requires_attachment: 0, is_active: 0 },
];

const COLLEGES = [{ id: 1, name: 'College of Computer Studies', short_code: 'CCS', is_active: 1 }];

const PAYMENT_METHODS = [
  { id: 1, code: 'gcash', name: 'GCash', provider: 'manual', instructions: 'Scan the QR code.',
    requires_reference: 1, reference_label: 'GCash Reference Number', requires_proof: 1, is_active: 1 },
  { id: 4, code: 'over_the_counter', name: 'Over-the-Counter (Cashier)', provider: 'manual',
    instructions: 'Pay in cash at the Cashier.', requires_reference: 1,
    reference_label: 'Official Receipt Number', requires_proof: 1, is_active: 0 },
];

const REPORT = {
  documents: [
    { id: 1, tracking_number: 'TRC-AAA', student_id: 'STU-001', student_name: 'Ana Reyes',
      document_type: 'Diploma', current_status: STATUS.COMPLETED, payment_status: 'PAID', amount: '50.00' },
  ],
  total: 1, page: 1, limit: 25, totalPages: 1,
  summary: { total: 1, completed: 1, rejected: 0, paid: 1, revenue: 50 },
  breakdown: { by_document_type: [], by_status: [] },
};

const ANALYTICS = {
  turnaround_by_desk: [
    { stage: STATUS.PENDING_SEC_EVALUATION, label: 'Secretary Evaluation', transitions: 4, avg_minutes: 639, avg_hours: 10.6, max_minutes: 2491 },
    { stage: STATUS.READY_FOR_RELEASE, label: 'Window 1 Release', transitions: 8, avg_minutes: 3, avg_hours: 0.1, max_minutes: 18 },
  ],
  end_to_end: { completed_count: 5, avg_minutes: 615, avg_hours: 10.2, min_minutes: 0, max_minutes: 2958 },
  throughput: [{ date: '2026-08-23', completed: 3 }],
  workload_by_clerk: [
    { id: 13, full_name: 'Finance Officer', desk_assignment: 'Finance', documents_handled: 1953, actions_taken: 1953 },
  ],
  range: { days: 30 },
};

beforeEach(() => {
  vi.clearAllMocks();
  getUsers.mockResolvedValue({ users: STAFF });
  getPendingStudents.mockResolvedValue({ pending_students: [{ id: 22, full_name: 'Alumni Applicant', student_id: 'ALU-22' }] });
  maintenanceService.getStaff.mockResolvedValue({ staff: STAFF });
  maintenanceService.getDocumentTypes.mockResolvedValue({ document_types: DOC_TYPES });
  maintenanceService.getColleges.mockResolvedValue({ colleges: COLLEGES });
  maintenanceService.getPaymentMethods.mockResolvedValue({ payment_methods: PAYMENT_METHODS });
  maintenanceService.createStaff.mockResolvedValue({ message: 'Staff account created.' });
  maintenanceService.setStaffActive.mockResolvedValue({ message: 'Staff account deactivated.' });
  maintenanceService.setAccountActive.mockResolvedValue({message:'Account deactivated.'});
  maintenanceService.setDocumentTypeActive.mockResolvedValue({ message: 'Document type deactivated.' });
  maintenanceService.createPaymentMethod.mockResolvedValue({ message: 'Payment method created.' });
  maintenanceService.createCollege.mockResolvedValue({ message: 'College created.' });
  maintenanceService.createDocumentType.mockResolvedValue({ message: 'Document type created.' });
  maintenanceService.updateDocumentType.mockResolvedValue({ message: 'Document type updated.' });
  maintenanceService.setPaymentMethodActive.mockResolvedValue({ message: 'Payment method deactivated.' });

  reportsService.getDocumentReport.mockResolvedValue(REPORT);
  reportsService.getAnalytics.mockResolvedValue(ANALYTICS);
  reportsService.exportStudentsCsv.mockResolvedValue('students-active-2026-08-24.csv');
  reportsService.exportDocumentsCsv.mockResolvedValue('documents-report-2026-08-24.csv');
});

it('edits audience, fees and college restrictions only after a confirmed save', async () => {
  const user = userEvent.setup();
  render(<MaintenancePanel user={ADMIN} currentTab="admin-maintenance" />);
  await screen.findByRole('heading', { name: 'System Maintenance' });
  await user.click(screen.getByRole('tab', { name: /Document Types/ }));
  const row = screen.getByText('Transcript of Records').closest('tr');
  await user.click(within(row).getByRole('button', { name: 'Edit' }));
  await user.selectOptions(screen.getByRole('option', { name: 'Alumni Only' }).parentElement, 'alumni');
  await user.click(screen.getByRole('checkbox', { name: 'College of Computer Studies' }));
  await user.clear(screen.getByPlaceholderText('Base fee (₱)'));
  await user.type(screen.getByPlaceholderText('Base fee (₱)'), '75');
  await user.click(screen.getByRole('button', { name: 'Save Changes' }));
  expect(maintenanceService.updateDocumentType).not.toHaveBeenCalled();
  await user.keyboard('{Escape}');
  expect(screen.getByPlaceholderText('Base fee (₱)')).toHaveValue(75);
  await user.click(screen.getByRole('button', { name: 'Save Changes' }));
  await user.click(within(screen.getByRole('dialog', { name: 'Confirm Document Type' })).getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(maintenanceService.updateDocumentType).toHaveBeenCalledWith(1,
    expect.objectContaining({ available_to: 'alumni', allowed_college_ids: [1], base_fee: '75' })));
});

it.each([true, false])('keeps document-type active=%s actions confirmed, cancellable and disabled while saving', async active => {
  maintenanceService.getDocumentTypes.mockResolvedValue({ document_types: [{ ...DOC_TYPES[0], is_active: active }] });
  let finish;
  maintenanceService.setDocumentTypeActive.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const user = userEvent.setup();
  render(<MaintenancePanel user={ADMIN} currentTab="admin-maintenance" />);
  await user.click(await screen.findByRole('tab', { name: /Document Types/ }));
  const row = (await screen.findByText('Transcript of Records')).closest('tr');
  const label = active ? 'Deactivate' : 'Restore';
  await user.click(within(row).getByRole('button', { name: label }));
  expect(maintenanceService.setDocumentTypeActive).not.toHaveBeenCalled();
  expect(screen.getByRole('dialog', { name: `${label} Document Type` })).toHaveTextContent('Transcript of Records');
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(maintenanceService.setDocumentTypeActive).not.toHaveBeenCalled();
  await user.click(within(row).getByRole('button', { name: label }));
  const dialog = screen.getByRole('dialog', { name: `${label} Document Type` });
  await user.click(within(dialog).getByRole('button', { name: label }));
  expect(maintenanceService.setDocumentTypeActive).toHaveBeenCalledExactlyOnceWith(DOC_TYPES[0].id, !active);
  expect(within(row).getByRole('button', { name: label })).toBeDisabled();
  expect(within(dialog).getByRole('button', { name: 'Saving…' })).toBeDisabled();
  await user.click(within(row).getByRole('button', { name: label }));
  expect(maintenanceService.setDocumentTypeActive).toHaveBeenCalledOnce();
  await act(async () => finish({ message: 'Saved.' }));
});

const settle = async () =>
  waitFor(() => expect(screen.queryByText(/Synchronizing Command Center/i)).not.toBeInTheDocument());

describe('Registration review', () => {
  it('opens a notification after SPA navigation and permits reopening it without submitting a decision', async () => {
    const { result, rerender } = renderHook(({ id, navigation }) => useAdminDashboard(ADMIN, 'dashboard', id, navigation), {
      initialProps: { id: null, navigation: null },
    });
    await waitFor(() => expect(result.current.pendingStudents).toHaveLength(1));
    expect(result.current.studentVerifyToConfirm).toBeNull();
    rerender({ id: '22', navigation: 'first-click' });
    await waitFor(() => expect(result.current.studentVerifyToConfirm?.student.id).toBe(22));
    act(() => result.current.cancelAdminVerifyStudent());
    expect(result.current.studentVerifyToConfirm).toBeNull();
    rerender({ id: '22', navigation: 'second-click' });
    await waitFor(() => expect(result.current.studentVerifyToConfirm?.student.id).toBe(22));
    expect(verifyStudent).not.toHaveBeenCalled();
  });

  it.each(['verify', 'reject'])('requires a separate confirmation before %s and supports cancellation', async (decision) => {
    const user = userEvent.setup();
    const confirm = vi.fn();
    render(<AccountVerificationModal studentVerifyToConfirm={{ student: { id: 22, full_name: 'Alumni Applicant', student_id: 'ALU-22' }, action: 'review' }}
      cancelAdminVerifyStudent={vi.fn()} confirmAdminVerifyStudent={confirm} actionLoading={false} setViewImageUrl={vi.fn()} />);
    const label = decision === 'verify' ? 'Verify' : 'Reject';
    await user.click(screen.getByRole('button', { name: label, exact: true }));
    expect(confirm).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog', { name: 'Review Registration' })).toBeInTheDocument();
    expect(confirm).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: label, exact: true }));
    await user.click(within(screen.getByRole('dialog', { name: `${label} Account` })).getByRole('button', { name: `${label} Account` }));
    expect(confirm).toHaveBeenCalledExactlyOnceWith(decision);
  });
});

describe('MaintenancePanel', () => {
  const renderPanel = async () => {
    const utils = render(<MaintenancePanel user={ADMIN} currentTab="admin-maintenance" />);
    await settle();
    return utils;
  };
  it('hides desk choices for students and confirms deactivation through the account endpoint',async()=>{
    const student={id:3,role:'student',user_type:'alumni',student_id:'ALU-3',full_name:'Synthetic Alumni',is_active:1};
    getUsers.mockResolvedValue({users:[...STAFF,student]});await renderPanel();
    await userEvent.selectOptions(screen.getByLabelText('Staff desk'),'Finance');
    await userEvent.selectOptions(screen.getByLabelText('Account role'),'student');
    expect(screen.queryByLabelText('Staff desk')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button',{name:/Synthetic Alumni/}));
    const control=screen.getByRole('button',{name:'Deactivate User'});expect(control).toBeEnabled();await userEvent.click(control);
    expect(maintenanceService.setAccountActive).not.toHaveBeenCalled();
    await userEvent.click(within(screen.getByRole('dialog',{name:'Deactivate Student / Alumni Account'})).getByRole('button',{name:'Deactivate',exact:true}));
    await waitFor(()=>expect(maintenanceService.setAccountActive).toHaveBeenCalledExactlyOnceWith(3,false));
  });

  it('loads all four entity lists', async () => {
    await renderPanel();
    await waitFor(() => expect(maintenanceService.getStaff).toHaveBeenCalled());
    expect(maintenanceService.getDocumentTypes).toHaveBeenCalled();
    expect(maintenanceService.getColleges).toHaveBeenCalled();
    expect(maintenanceService.getPaymentMethods).toHaveBeenCalled();
  });

  it('shows staff with their active state', async () => {
    await renderPanel();
    expect(await screen.findByText('Finance Officer')).toBeInTheDocument();
    expect(screen.getByText('Retired Clerk')).toBeInTheDocument();
    expect(screen.getAllByText('Inactive').length).toBeGreaterThan(0);
  });

  // Staff are now cards; Deactivate/Restore live inside the detail modal a
  // card opens, not directly on the grid.

  it('offers Deactivate for active entries and Restore for inactive ones — never Delete', async () => {
    const user = userEvent.setup();
    await renderPanel();

    await user.click(await screen.findByText('Finance Officer'));
    expect(await screen.findByRole('button', { name: /deactivate user/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^delete$/i })).not.toBeInTheDocument();
    await user.keyboard('{Escape}');

    await user.click(await screen.findByText('Retired Clerk'));
    expect(await screen.findByRole('button', { name: /restore user/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^delete$/i })).not.toBeInTheDocument();
  });

  it('deactivates rather than deletes when clicked', async () => {
    const user = userEvent.setup();
    await renderPanel();

    await user.click(await screen.findByText('Finance Officer'));
    await user.click(await screen.findByRole('button', { name: /deactivate user/i }));
    // The row's own button reads "Deactivate User"; only the confirmation
    // dialog's button is the exact text "Deactivate".
    await user.click(await screen.findByRole('button', { name: 'Deactivate' }));

    await waitFor(() => expect(maintenanceService.setStaffActive).toHaveBeenCalledWith(13, false));
  });

  it("disables deactivation of the signed-in admin's own account", async () => {
    const user = userEvent.setup();
    await renderPanel();

    await user.click(await screen.findByText('Registrar Admin'));
    expect(await screen.findByRole('button', { name: /deactivate user/i })).toBeDisabled();
  });

  it('creates a staff account with the entered details', async () => {
    const user = userEvent.setup();
    await renderPanel();

    await user.click(await screen.findByRole('button', { name: /add user/i }));
    await user.type(await screen.findByPlaceholderText(/Employee ID/), 'CLERK99');
    await user.type(screen.getByPlaceholderText(/Full Name/), 'New Clerk');
    await user.type(screen.getByPlaceholderText(/Temporary password/), 'Temporary_1234');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(maintenanceService.createStaff).not.toHaveBeenCalled();
    const confirmation = await screen.findByRole('dialog', { name: /confirm staff account/i });
    await user.click(within(confirmation).getByRole('button', { name: /create account/i }));
    await waitFor(() => expect(maintenanceService.createStaff).toHaveBeenCalled());
    expect(maintenanceService.createStaff).toHaveBeenCalledWith(
      expect.objectContaining({ employee_id: 'CLERK99', full_name: 'New Clerk', role: 'clerk' })
    );
  });

  it('explains that the temporary password must be replaced', async () => {
    const user = userEvent.setup();
    await renderPanel();
    await user.click(await screen.findByRole('button', { name: /add user/i }));
    expect(await screen.findByText(/replace.* at first login/i)).toBeInTheDocument();
  });

  it('preserves a college draft after cancelling and creates it only after confirmation', async () => {
    const user = userEvent.setup();
    await renderPanel();
    await user.click(screen.getByRole('tab', { name: /Colleges/ }));
    await user.click(screen.getByRole('button', { name: 'Add College' }));
    const name = screen.getByLabelText(/College name/);
    await user.type(name, 'College of Engineering');
    await user.type(screen.getByLabelText(/Short code/), 'COE');
    await user.click(screen.getByRole('button', { name: 'Create College' }));
    expect(maintenanceService.createCollege).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    expect(name).toHaveValue('College of Engineering');
    await user.click(screen.getByRole('button', { name: 'Create College' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Confirm College' })).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(maintenanceService.createCollege).toHaveBeenCalledExactlyOnceWith({ name: 'College of Engineering', short_code: 'COE' }));
  });

  it('confirms a document type before sending its configured defaults', async () => {
    const user = userEvent.setup();
    await renderPanel();
    await user.click(screen.getByRole('tab', { name: /Document Types/ }));
    await user.click(screen.getByRole('button', { name: 'New document type' }));
    await user.type(screen.getByPlaceholderText('Name *'), 'Certification');
    await user.type(screen.getByPlaceholderText('Base fee (₱)'), '50');
    await user.click(screen.getByRole('button', { name: 'Create Type' }));
    expect(maintenanceService.createDocumentType).not.toHaveBeenCalled();
    await user.click(within(screen.getByRole('dialog', { name: 'Confirm Document Type' })).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(maintenanceService.createDocumentType).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      name: 'Certification', base_fee: '50', fee_rule: 'flat', available_to: 'both', requires_attachment: false,
    })));
  });

  it('switches to the document types section', async () => {
    const user = userEvent.setup();
    await renderPanel();
    await user.click(await screen.findByRole('tab', { name: /Document Types/ }));
    expect(await screen.findByText('Transcript of Records')).toBeInTheDocument();
    expect(screen.getByText(/cannot be renamed/i)).toBeInTheDocument();
  });

  it('switches to the payment methods section and shows both active and inactive rows', async () => {
    const user = userEvent.setup();
    await renderPanel();
    await user.click(await screen.findByRole('tab', { name: /Payment Methods/ }));
    expect(await screen.findByText('GCash')).toBeInTheDocument();
    expect(screen.getByText('Over-the-Counter (Cashier)')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('creates a payment method with the entered code and name', async () => {
    const user = userEvent.setup();
    await renderPanel();
    await user.click(await screen.findByRole('tab', { name: /Payment Methods/ }));
    await user.click(screen.getByRole('button', { name: 'Add Payment Method' }));

    await user.type(screen.getByPlaceholderText(/Code \*/), 'paymaya');
    await user.type(screen.getByPlaceholderText(/Display name/), 'PayMaya');
    await user.click(screen.getByRole('button', { name: /create method/i }));

    expect(maintenanceService.createPaymentMethod).not.toHaveBeenCalled();
    const confirmation = await screen.findByRole('dialog', { name: /confirm payment method/i });
    await user.click(within(confirmation).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(maintenanceService.createPaymentMethod).toHaveBeenCalled());
    expect(maintenanceService.createPaymentMethod).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'paymaya', name: 'PayMaya' })
    );
  });

  it('edits a payment method through confirmation and keeps its code immutable', async () => {
    const user = userEvent.setup();
    maintenanceService.updatePaymentMethod.mockResolvedValue({ message: 'Payment method updated.' });
    await renderPanel();
    await user.click(await screen.findByRole('tab', { name: /Payment Methods/ }));
    const row = (await screen.findByText('GCash')).closest('tr');
    await user.click(within(row).getByRole('button', { name: 'Edit' }));
    expect(screen.getByPlaceholderText(/Code \*/)).toBeDisabled();
    const name = screen.getByPlaceholderText(/Display name/);
    await user.clear(name);
    await user.type(name, 'GCash updated');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(maintenanceService.updatePaymentMethod).not.toHaveBeenCalled();
    const confirmation = await screen.findByRole('dialog', { name: /confirm payment method/i });
    await user.click(within(confirmation).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(maintenanceService.updatePaymentMethod).toHaveBeenCalledWith(1,
      expect.objectContaining({ code: 'gcash', name: 'GCash updated' })));
  });

  it('deactivates a payment method rather than deleting it', async () => {
    const user = userEvent.setup();
    await renderPanel();
    await user.click(await screen.findByRole('tab', { name: /Payment Methods/ }));

    const row = (await screen.findByText('GCash')).closest('tr');
    await user.click(within(row).getByRole('button', { name: /deactivate/i }));

    // Both the row's own button and the confirmation dialog's button read
    // "Deactivate" — scope to the dialog to disambiguate.
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Deactivate' }));

    await waitFor(() => expect(maintenanceService.setPaymentMethodActive).toHaveBeenCalledWith(1, false));
  });
});

describe('ReportsPanel', () => {
  it.each(['Admin','Window 1','Secretary'])('preserves shared status and payment badges for %s',async role=>{
    const examples=[[STATUS.PENDING_STUDENT_PAYMENT,'amber'],[STATUS.SEC_PROCESSING,'blue'],[STATUS.READY_FOR_RELEASE,'green'],[STATUS.COMPLETED,'green'],[LEGACY_STATUS.APPROVED,'blue'],[LEGACY_STATUS.REJECTED,'red']];
    reportsService.getDocumentReport.mockResolvedValue({...REPORT,documents:examples.map(([status],index)=>({...REPORT.documents[0],id:index,current_status:status}))});
    render(<ReportsPanel user={role==='Admin'?ADMIN:{role:'clerk',desk_assignment:role}} currentTab={role==='Admin'?'admin-reports':'reports'}/>);
    const table=await screen.findByRole('table');
    for(const [status,tone] of examples)expect(within(table).getByText(getStatusLabel(status))).toHaveClass(`bg-${tone}-50`,'rounded-full');
    expect(within(table).getAllByText('PAID')).toHaveLength(examples.length);
  });
  const renderPanel = async (account=ADMIN,tab='admin-reports') => {
    render(<ReportsPanel user={account} currentTab={tab}/>);await screen.findByText('TRC-AAA');
  };
  const open = async () => {await userEvent.click(screen.getByRole('button',{name:'Export',exact:true}));return screen.getByRole('dialog',{name:'Export'});};
  it('shows visible report filters with export configuration behind the header action',async()=>{
    await renderPanel();expect(screen.getByLabelText('Student ID / Name')).toBeVisible();expect(screen.queryByLabelText('Dataset')).not.toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(8);
  });
  it.each([['Admin',ADMIN,'admin-reports'],['Window 1',{role:'clerk',desk_assignment:'Window 1'},'reports'],['Secretary',{role:'clerk',desk_assignment:'Secretary'},'reports']])('uses inline filters and the same header Export action for %s',async(_,account,tab)=>{
    await renderPanel(account,tab);expect(screen.getByRole('button',{name:'Export',exact:true}).closest('.trace-page-header')).toBeInTheDocument();
    expect(screen.getByLabelText('College / Department')).toBeVisible();const dialog=await open();expect(within(dialog).getByLabelText('Dataset')).toBeInTheDocument();expect(within(dialog).queryByLabelText('Student ID / Name')).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button',{name:'Export CSV'})).toBeEnabled();
  });
  it('retains unapplied search on export close and exports the applied snapshot only',async()=>{
    await renderPanel();const calls=reportsService.getDocumentReport.mock.calls.length;
    await userEvent.type(screen.getByLabelText('Student ID / Name'),'Ana');expect(reportsService.getDocumentReport).toHaveBeenCalledTimes(calls);
    await open();expect(screen.getByRole('button',{name:'Export CSV'})).toBeDisabled();await userEvent.click(screen.getByRole('button',{name:'Close export',exact:true}));
    expect(screen.getByLabelText('Student ID / Name')).toHaveValue('Ana');await userEvent.click(screen.getByRole('button',{name:'Apply Filters'}));
    await waitFor(()=>expect(reportsService.getDocumentReport).toHaveBeenLastCalledWith(expect.objectContaining({studentSearch:'Ana'})));
    await open();await waitFor(()=>expect(screen.getByRole('button',{name:'Export CSV'})).toBeEnabled());await userEvent.click(screen.getByRole('button',{name:'Export CSV'}));
    expect(reportsService.exportDocumentsCsv).toHaveBeenCalledWith({studentSearch:'Ana'});
  });
  it('resets only the draft and retains every student export dataset',async()=>{
    await renderPanel();await userEvent.type(screen.getByLabelText('Student ID / Name'),'SYN-1');const calls=reportsService.getDocumentReport.mock.calls.length;
    await userEvent.click(screen.getByRole('button',{name:'Reset draft'}));expect(screen.getByLabelText('Student ID / Name')).toHaveValue('');expect(reportsService.getDocumentReport).toHaveBeenCalledTimes(calls);
    await open();for(const label of ['Active Students','Graduates / Alumni','Others','All Students'])expect(screen.getByRole('option',{name:label})).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Dataset'),'alumni');await userEvent.click(screen.getByRole('button',{name:'Export CSV'}));expect(reportsService.exportStudentsCsv).toHaveBeenCalledWith('alumni',{});
  });
  it('blocks invalid date ranges before applying',async()=>{
    await renderPanel();fireEvent.change(screen.getByLabelText('From'),{target:{value:'2026-10-10'}});fireEvent.change(screen.getByLabelText('To'),{target:{value:'2026-10-01'}});
    const calls=reportsService.getDocumentReport.mock.calls.length;await userEvent.click(screen.getByRole('button',{name:'Apply Filters'}));expect(screen.getByRole('alert')).toHaveTextContent('From must be on or before To.');expect(reportsService.getDocumentReport).toHaveBeenCalledTimes(calls);
  });
  it('blocks duplicate export and retains export configuration after a failed attempt',async()=>{
    let reject;reportsService.exportDocumentsCsv.mockReturnValueOnce(new Promise((_,fail)=>{reject=fail;}));await renderPanel();await open();
    await userEvent.click(screen.getByRole('button',{name:'Export CSV'}));expect(screen.getByRole('button',{name:'Exporting…'})).toBeDisabled();
    await act(async()=>reject(new Error('unavailable')));expect(await screen.findByRole('dialog',{name:'Attention Needed'})).toHaveTextContent('Export failed.');
    await userEvent.click(screen.getByRole('button',{name:'OK'}));expect(screen.getByRole('dialog',{name:'Export'})).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button',{name:'Export CSV'}));expect(reportsService.exportDocumentsCsv).toHaveBeenCalledTimes(2);
  });
});

describe('AnalyticsPanel', () => {
  const renderPanel = async () => {
    const utils = render(<MemoryRouter><AnalyticsPanel user={ADMIN} currentTab="admin-analytics" /></MemoryRouter>);
    await settle();
    return utils;
  };

  it('surfaces the slowest desk as the bottleneck', async () => {
    await renderPanel();
    expect(await screen.findByText('Main Bottleneck')).toBeInTheDocument();
    expect(screen.getAllByText('Secretary Evaluation').length).toBeGreaterThan(0);
  });

  it('renders durations in readable units rather than raw minutes', async () => {
    await renderPanel();
    // 615 minutes should read as hours, not "615"
    expect(await screen.findByText(/10\.3 hrs|10\.2 hrs/)).toBeInTheDocument();
  });

  it('shows per-desk turnaround with the number of moves behind it', async () => {
    await renderPanel();
    expect(await screen.findByText(/4 moves/)).toBeInTheDocument();
  });

  it('presents staff figures as workload, not a ranking', async () => {
    await renderPanel();
    expect(await screen.findByText('Workload by Staff')).toBeInTheDocument();
    expect(screen.getByText(/not a performance ranking/i)).toBeInTheDocument();
    expect(screen.getByText('1,953')).toBeInTheDocument();
  });

  it('renders 60/30/10 shares with matching numeric labels, accessible values and fills', async () => {
    reportsService.getAnalytics.mockResolvedValue({ ...ANALYTICS, workload_by_clerk: [60, 30, 10].map((documents_handled, id) => ({ id, documents_handled, full_name: `Staff ${id}`, desk_assignment: 'Secretary' })) });
    await renderPanel();
    const table = screen.getByRole('table', { name: 'Workload by Staff' });
    [60, 30, 10].forEach((share, id) => {
      const meter = within(table).getByRole('meter', { name: `Staff ${id} workload share` });
      expect(meter).toHaveAttribute('aria-valuenow', String(share));
      expect(meter).toHaveAttribute('aria-valuetext', `${share}% of total staff documents handled`);
      expect(meter.firstChild).toHaveStyle({ transform: `scaleX(${share / 100})` });
      expect(within(meter.closest('tr')).getByText(`${share}%`)).toBeInTheDocument();
    });
  });

  it('renders zero shares for staff with no handled documents', async () => {
    reportsService.getAnalytics.mockResolvedValue({ ...ANALYTICS, workload_by_clerk: [{ id: 1, full_name: 'Staff Zero', documents_handled: 0 }] });
    await renderPanel();
    const meter = screen.getByRole('meter', { name: 'Staff Zero workload share' });
    expect(meter).toHaveAttribute('aria-valuenow', '0');
    expect(meter.firstChild).toHaveStyle({ transform: 'scaleX(0)' });
    expect(within(meter.closest('tr')).getByText('0%')).toBeInTheDocument();
  });

  it('keeps the full workload denominator when the associated document report changes page', async () => {
    reportsService.getAnalytics.mockResolvedValue({ ...ANALYTICS, workload_by_clerk: [60, 30, 10].map((documents_handled, id) => ({ id, documents_handled })) });
    reportsService.getDocumentReport.mockResolvedValue({ ...REPORT, total: 100, totalPages: 4 });
    const { result } = renderHook(() => useReports(ADMIN, 'admin-analytics'));
    await waitFor(() => expect(result.current.analytics).toBeTruthy());
    await act(async () => result.current.goToPage(2));
    await waitFor(() => expect(result.current.refreshing).toBe(false));
    expect(reportsService.getDocumentReport).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
    expect(reportsService.getAnalytics).toHaveBeenLastCalledWith({});
    expect(getWorkloadShares(result.current.analytics.workload_by_clerk).map(row => row.share)).toEqual([60, 30, 10]);
  });

  it('handles an empty system without crashing', async () => {
    reportsService.getAnalytics.mockResolvedValue({
      turnaround_by_desk: [], end_to_end: { completed_count: 0, avg_minutes: 0, avg_hours: 0, min_minutes: 0, max_minutes: 0 },
      throughput: [], workload_by_clerk: [], range: { days: 30 },
    });
    await renderPanel();
    expect(await screen.findByText(/Not enough history yet/i)).toBeInTheDocument();
    expect(screen.getByText(/No recorded desk activity yet/i)).toBeInTheDocument();
  });
});

it('requires recorded evidence before missing-proof identity decisions and passes it only after confirmation', async () => {
  const user = userEvent.setup(), confirm = vi.fn();
  render(<AccountVerificationModal studentVerifyToConfirm={{ student: { id: 22, full_name: 'Synthetic Alumni', student_id: 'ALU-DEMO', registration_proof_unavailable: true, registration_proof_reason: 'Lost records' }, action: 'review' }}
    cancelAdminVerifyStudent={vi.fn()} confirmAdminVerifyStudent={confirm} actionLoading={false} setViewImageUrl={vi.fn()} />);
  expect(screen.getByRole('heading',{name:'Proof Unavailable · Identity Review'})).toBeInTheDocument();
  expect(screen.queryByText(/Defense Demo/)).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Verify', exact: true }));
  expect(screen.getByRole('alert')).toHaveTextContent('Record the evidence');
  expect(screen.queryByRole('dialog', { name: 'Verify Account' })).not.toBeInTheDocument();
  await user.type(screen.getByLabelText('Identity Review Evidence / Decision Basis'), 'Synthetic Registrar record checked');
  await user.click(screen.getByRole('button', { name: 'Verify', exact: true }));
  expect(confirm).not.toHaveBeenCalled();
  await user.click(within(screen.getByRole('dialog', { name: 'Verify Account' })).getByRole('button', { name: 'Verify Account' }));
  expect(confirm).toHaveBeenCalledExactlyOnceWith('verify', 'Synthetic Registrar record checked');
});
