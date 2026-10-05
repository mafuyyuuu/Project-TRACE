import { act, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import useReports from '@/features/admin/useReports';
import ReportsPanel from '@/features/admin/components/ReportsPanel';
import * as service from '@/services/reportsService';
import { STATUS } from '@/utils/documentStatus';

vi.mock('@/services/reportsService', () => ({
  getDocumentReport: vi.fn(), getAnalytics: vi.fn(), exportStudentsCsv: vi.fn(), exportDocumentsCsv: vi.fn(),
}));
const ADMIN = { role: 'admin' };
const data = (name, total = 1, page = 1) => ({
  documents: [{ id: 1, student_name: name, tracking_number: name, document_type: 'Diploma', current_status: STATUS.COMPLETED, payment_status: 'PAID', amount: total * 100 }],
  total, page, totalPages: 3, summary: { total, completed: total, rejected: 0, paid: total, revenue: total * 100 },
});
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
beforeEach(() => {
  vi.clearAllMocks();
  service.getDocumentReport.mockResolvedValue(data('Initial'));
  service.getAnalytics.mockResolvedValue({});
  service.exportDocumentsCsv.mockResolvedValue('filtered.csv');
  service.exportStudentsCsv.mockResolvedValue('students.csv');
});

it('keeps KPI and table scope together across reversed responses and exports only the current loaded filters', async () => {
  const { result } = renderHook(() => useReports(ADMIN, 'admin-reports'));
  await waitFor(() => expect(result.current.loading).toBe(false));
  const old = deferred(), current = deferred();
  service.getDocumentReport.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
  act(() => result.current.updateFilter('status', STATUS.COMPLETED));
  expect(result.current.report).toBeNull();
  act(() => {
    result.current.updateFilter('paymentStatus', 'PAID');
    result.current.updateFilter('dateFrom', '2026-10-01');
    result.current.updateFilter('dateTo', '2026-10-05');
    result.current.updateFilter('documentType', 'Diploma');
  });
  await act(async () => result.current.downloadDocuments());
  expect(service.exportDocumentsCsv).not.toHaveBeenCalled();
  expect(result.current.error).toMatch(/Wait for the current report/);
  await act(async () => current.resolve(data('Current', 7)));
  expect(result.current.report.summary.total).toBe(7);
  expect(result.current.report.documents[0].student_name).toBe('Current');
  act(() => result.current.dismissNotification());
  await act(async () => old.resolve(data('Stale', 99)));
  expect(result.current.report.summary.total).toBe(7);
  expect(result.current.report.documents[0].student_name).toBe('Current');
  expect(result.current.error).toBe('');
  await act(async () => result.current.downloadDocuments());
  expect(service.exportDocumentsCsv).toHaveBeenCalledExactlyOnceWith({
    status: STATUS.COMPLETED, paymentStatus: 'PAID', dateFrom: '2026-10-01', dateTo: '2026-10-05', documentType: 'Diploma',
  });
});

it('ignores an earlier failure without clearing the newer report or showing its error', async () => {
  const { result } = renderHook(() => useReports(ADMIN, 'admin-reports'));
  await waitFor(() => expect(result.current.loading).toBe(false));
  const old = deferred();
  service.getDocumentReport.mockReturnValueOnce(old.promise).mockResolvedValueOnce(data('Latest', 3));
  act(() => result.current.updateFilter('status', STATUS.COMPLETED));
  act(() => result.current.updateFilter('paymentStatus', 'PAID'));
  await waitFor(() => expect(result.current.report?.summary.total).toBe(3));
  await act(async () => old.reject(new Error('old failure')));
  expect(result.current.error).toBe('');
  expect(result.current.report.summary.total).toBe(3);
});

it('preserves filter, KPI and Records positions during refresh/failure and offers a current-scope retry', async () => {
  const user = userEvent.setup();
  render(<ReportsPanel user={ADMIN} currentTab="admin-reports" />);
  await screen.findByText('Initial', { selector: 'button' });
  const request = deferred();
  service.getDocumentReport.mockReturnValueOnce(request.promise);
  await user.selectOptions(screen.getByDisplayValue('All statuses'), STATUS.COMPLETED);
  expect(screen.getByRole('region', { name: 'Filters' }).nextElementSibling).toBe(screen.getByRole('region', { name: 'Report summary' }));
  expect(screen.getByRole('status')).toHaveTextContent('Updating report…');
  expect(screen.queryByText('Initial', { selector: 'button' })).not.toBeInTheDocument();
  expect(within(screen.getByRole('region', { name: 'Report summary' })).getAllByText('—')).toHaveLength(5);
  await act(async () => request.reject(new Error('unavailable')));
  await user.click(screen.getByRole('button', { name: 'OK' }));
  expect(screen.getByText('Report unavailable. Apply Filters to retry.')).toBeInTheDocument();
  expect(screen.queryByText('No records match these filters.')).not.toBeInTheDocument();
  service.getDocumentReport.mockResolvedValue(data('Retried', 4));
  await user.click(screen.getByRole('button', { name: 'Apply Filters' }));
  await screen.findByText('Retried', { selector: 'button' });
  expect(service.getDocumentReport).toHaveBeenLastCalledWith(expect.objectContaining({ status: STATUS.COMPLETED, page: 1 }));
  expect(within(screen.getByRole('region', { name: 'Report summary' })).getByText('₱400.00')).toBeInTheDocument();
});

it('preserves paging, Apply/Reset and category-wide student exports', async () => {
  service.getDocumentReport.mockImplementation(async filters => data('Scoped', 60, filters.page));
  const { result } = renderHook(() => useReports(ADMIN, 'admin-reports'));
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => result.current.updateFilter('paymentStatus', 'UNPAID'));
  await waitFor(() => expect(result.current.report).not.toBeNull());
  act(() => result.current.goToPage(2));
  await waitFor(() => expect(result.current.report?.page).toBe(2));
  expect(service.getDocumentReport).toHaveBeenLastCalledWith(expect.objectContaining({ paymentStatus: 'UNPAID', page: 2 }));
  act(() => result.current.applyFilters());
  await waitFor(() => expect(result.current.report?.page).toBe(1));
  act(() => result.current.resetFilters());
  await waitFor(() => expect(result.current.report).not.toBeNull());
  expect(service.getDocumentReport).toHaveBeenLastCalledWith({ page: 1, limit: 25 });
  await act(async () => result.current.downloadDocuments());
  expect(service.exportDocumentsCsv).toHaveBeenCalledWith({});
  await act(async () => result.current.downloadStudents('alumni'));
  expect(service.exportStudentsCsv).toHaveBeenCalledWith('alumni');
});

it('loads the legacy Secretary-cleared view and keeps export, paging and explicit Completed-only filters aligned', async () => {
  const secretary = { role: 'clerk', desk_assignment: 'Secretary' };
  service.getDocumentReport.mockImplementation(async filters => data('Secretary record', 60, filters.page));
  const { result } = renderHook(() => useReports(secretary, 'reports', 'secretary-cleared'));
  await waitFor(() => expect(result.current.report).not.toBeNull());
  expect(service.getDocumentReport).toHaveBeenLastCalledWith({ recordSet: 'secretary-cleared', page: 1, limit: 25 });
  act(() => result.current.goToPage(2));
  await waitFor(() => expect(result.current.report?.page).toBe(2));
  await act(async () => result.current.downloadDocuments());
  expect(service.exportDocumentsCsv).toHaveBeenLastCalledWith({ recordSet: 'secretary-cleared' });
  act(() => result.current.chooseRecordView('completed'));
  await waitFor(() => expect(result.current.report?.page).toBe(1));
  expect(service.getDocumentReport).toHaveBeenLastCalledWith({ status: STATUS.COMPLETED, page: 1, limit: 25 });
  act(() => result.current.chooseRecordView('all'));
  await waitFor(() => expect(result.current.report).not.toBeNull());
  expect(service.getDocumentReport).toHaveBeenLastCalledWith({ page: 1, limit: 25 });
  act(() => result.current.chooseRecordView('cleared'));
  act(() => result.current.updateFilter('status', STATUS.SEC_PROCESSING));
  await waitFor(() => expect(result.current.report).not.toBeNull());
  expect(service.getDocumentReport).toHaveBeenLastCalledWith({ status: STATUS.SEC_PROCESSING, page: 1, limit: 25 });
});

it('preserves Secretary record fields and profile actions in the combined workspace', async () => {
  const user = userEvent.setup();
  const record = data('College Student', 2);
  record.documents[0] = { ...record.documents[0], student_id: 'SYNTHETIC-STUDENT', document_sequence_number: 'Diploma – Request No. 2', document_type: 'Diploma', current_status: STATUS.READY_FOR_RELEASE, payment_status: 'PAID', created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-02T00:00:00Z' };
  service.getDocumentReport.mockResolvedValue(record);
  render(<ReportsPanel user={{ role: 'clerk', desk_assignment: 'Secretary' }} currentTab="reports" initialRecordSet="secretary-cleared" />);
  await screen.findByRole('heading', { name: 'Records & Export' });
  expect(screen.getByRole('button', { name: 'Secretary-cleared' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('Diploma – Request No. 2')).toBeInTheDocument();
  expect(screen.getByText('Ready for Pick-up', { selector: 'tbody span' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'College Student' })).toBeEnabled();
  expect(screen.getAllByRole('columnheader')).toHaveLength(8);
  await user.click(screen.getByRole('button', { name: 'Completed only' }));
  await waitFor(() => expect(service.getDocumentReport).toHaveBeenLastCalledWith(expect.objectContaining({ status: STATUS.COMPLETED })));
  expect(screen.getByRole('button', { name: 'Completed only' })).toHaveAttribute('aria-pressed', 'true');
  await user.click(screen.getByRole('button', { name: 'Export' }));
  expect(screen.getByRole('group', { name: 'Export options' }).querySelectorAll('button')).toHaveLength(5);
});
