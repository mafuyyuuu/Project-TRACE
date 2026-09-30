import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import NewRequestModal from '@/features/student/components/NewRequestModal';
import ManualInputModal from '@/features/window1/components/ManualInputModal';
import StudentProfileModal from '@/components/StudentProfileModal';
import useReports from '@/features/admin/useReports';
import HelpPage from '@/pages/HelpPage';
import useStudentDashboard from '@/features/student/useStudentDashboard';
import { uploadDocument } from '@/services/documentsService';
import { getDocumentTypes, getPaymentMethods } from '@/services/referenceService';
import { lookupStudent } from '@/services/authService';
import { getDocumentReport, getAnalytics } from '@/services/reportsService';

vi.mock('@/services/authService', () => ({ lookupStudent: vi.fn() }));
vi.mock('@/services/documentsService', () => ({ uploadDocument: vi.fn(), submitPayment: vi.fn(), cancelDocument: vi.fn() }));
vi.mock('@/services/referenceService', () => ({ getDocumentTypes: vi.fn(), getPaymentMethods: vi.fn() }));
const { core } = vi.hoisted(() => ({ core: { documents: [], runAction: vi.fn(), triggerNotification: vi.fn(),
  setActiveModal: vi.fn(), selectedDoc: null, activeModal: null } }));
vi.mock('@/hooks/useDashboardCore', () => ({ default: () => core }));
vi.mock('@/services/reportsService', () => ({ getDocumentReport: vi.fn(), getAnalytics: vi.fn(), exportStudentsCsv: vi.fn(), exportDocumentsCsv: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
  getDocumentReport.mockResolvedValue({ documents: [], total: 0 });
  getAnalytics.mockResolvedValue({});
  getDocumentTypes.mockResolvedValue({ document_types: TYPES });
  getPaymentMethods.mockResolvedValue({ payment_methods: [] });
  uploadDocument.mockResolvedValue({ tracking_number: 'NEW' });
  core.runAction.mockImplementation(async action => { await action(); return true; });
});
const TYPES = [
  { id: 1, name: 'Enrollment', available_to: 'student', base_fee: 50, is_repeatable: true },
  { id: 2, name: 'Graduation Certificate', available_to: 'alumni', base_fee: 100 },
  { id: 3, name: 'Honorable Dismissal', available_to: 'both', base_fee: 100, is_repeatable: false },
  { id: 4, name: 'CTC', available_to: 'both', base_fee: 0, is_walk_in: true },
];
function request(props = {}) {
  return <NewRequestModal user={{ role: 'student', user_type: 'student' }} documentTypes={TYPES}
    selections={{}} toggleDocumentType={vi.fn()} updateSelection={vi.fn()} setActiveModal={vi.fn()}
    handleStudentSubmitRequest={vi.fn()} {...props} />;
}

describe('Batch 8b request policies and staff access', () => {
  it('closes a saved request before a slow eligibility refresh can offer resubmission', async () => {
    const { result } = renderHook(() => useStudentDashboard({ role: 'student', id: 1 }));
    await waitFor(() => expect(result.current.documentTypesLoading).toBe(false));
    act(() => result.current.toggleDocumentType('Enrollment'));
    await act(async () => result.current.handleStudentSubmitRequest({ preventDefault: vi.fn() }));
    let finish;
    getDocumentTypes.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    let pending;
    await act(async () => { pending = result.current.confirmStudentSubmission(); });
    expect(result.current.submissionToConfirm).toBeNull();
    expect(result.current.documentTypesLoading).toBe(true);
    await act(async () => result.current.confirmStudentSubmission());
    expect(uploadDocument).toHaveBeenCalledOnce();
    await act(async () => { finish({ document_types: TYPES }); await pending; });
    expect(result.current.documentTypesLoading).toBe(false);
  });
  it('keeps FAQ labels and desk reporting guidance aligned with the manual', () => {
    render(<HelpPage user={{ role: 'clerk', desk_assignment: 'Secretary' }} />);
    expect(screen.getByText(/Open Preferences in the sidebar/)).toBeInTheDocument();
    expect(screen.getByText(/Open your avatar → Edit Profile/)).toBeInTheDocument();
    expect(screen.getByText('How do I export records?')).toBeInTheDocument();
    expect(screen.getByText('How do I view a student’s full profile?')).toBeInTheDocument();
  });
  it('uses configured audience rules and keeps counter-only types out of online requests', () => {
    const { rerender } = render(request());
    expect(screen.getByRole('checkbox', { name: /Enrollment/ })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Graduation Certificate/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /CTC/ })).not.toBeInTheDocument();
    rerender(request({ user: { role: 'student', user_type: 'alumni' } }));
    expect(screen.getByRole('checkbox', { name: /Graduation Certificate/ })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Enrollment/ })).not.toBeInTheDocument();
  });

  it('shows eligibility reasons, disables blocked types, and limits Honorable Dismissal to one copy', () => {
    render(request({ documentTypes: TYPES.map(type => type.name === 'Enrollment' ? { ...type, unavailable_reason: 'Unavailable for this college.' } : type),
      selections: { 'Honorable Dismissal': { copies: 1 } } }));
    expect(screen.getByRole('checkbox', { name: /Enrollment/ })).toBeDisabled();
    expect(screen.getByText('Unavailable for this college.')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Copies' })).toHaveAttribute('max', '1');
  });

  it('allows repeatable copies and shows the rate without an estimated total', () => {
    render(request({ selections: { Enrollment: { copies: 3 } } }));
    expect(screen.getByRole('spinbutton', { name: 'Copies' })).toHaveValue(3);
    expect(screen.getAllByText('₱50.00').length).toBeGreaterThan(0);
    expect(screen.queryByText('₱150.00')).not.toBeInTheDocument();
  });

  it('uses configured counter types in the manual-entry modal', () => {
    render(<ManualInputModal open onClose={vi.fn()} handleFetchStudent={vi.fn()} handleManualInputSubmit={vi.fn()} documentTypes={TYPES} />);
    expect(screen.getByRole('option', { name: 'CTC' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Diploma' })).not.toBeInTheDocument();
  });

  it.each(['Window 1', 'Secretary'])('loads the shared report and analytics for %s', async desk => {
    renderHook(() => useReports({ role: 'clerk', desk_assignment: desk }, 'reports'));
    await waitFor(() => expect(getDocumentReport).toHaveBeenCalled());
    expect(getAnalytics).toHaveBeenCalled();
  });

  it('renders the returned full profile without staff mutation buttons', async () => {
    lookupStudent.mockResolvedValue({ student: { student_id: 'ALU1234567', full_name: 'Alumni Example', role: 'student', user_type: 'alumni',
      college_name: 'College A', email: 'example@example.test', home_address: 'Sample Address', elem_school: 'Sample Elementary' } });
    render(<StudentProfileModal open studentId="ALU1234567" onClose={vi.fn()} />);
    const dialog = await screen.findByRole('dialog', { name: 'Alumni Example' });
    expect(dialog).toHaveTextContent('Sample Address');
    expect(dialog).toHaveTextContent('Sample Elementary');
    expect(within(dialog).queryByRole('button', { name: /Edit|Deactivate|Restore/ })).not.toBeInTheDocument();
    expect(lookupStudent).toHaveBeenCalledWith('ALU1234567', { signal: expect.any(AbortSignal), timeout: 15000 });
  });
});
