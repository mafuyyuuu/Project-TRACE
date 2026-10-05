import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { STATUS } from '@/utils/documentStatus';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Smoke tests for the role-hook split: each command center must mount, run its
 * own hook, and paint without crashing. These would have caught a prop that
 * went missing when the shared prop bag was removed.
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
  verifyStudent: vi.fn(),
  lookupStudent: vi.fn(),
  getUsers: vi.fn(),
}));

vi.mock('@/services/reportsService', () => ({
  getAnalytics: vi.fn().mockResolvedValue({}),
}));

import * as documentsService from '@/services/documentsService';
import * as authService from '@/services/authService';
import api from '@/services/api';

import StudentDashboard from '@/features/student/StudentDashboard';
import FinanceDashboard from '@/features/finance/FinanceDashboard';
import Window1Dashboard from '@/features/window1/Window1Dashboard';
import SecretaryDashboard from '@/features/secretary/SecretaryDashboard';
import AdminDashboard from '@/features/admin/AdminDashboard';
import AdminSecurityPanel from '@/features/admin/components/AdminSecurityPanel';

afterEach(() => {
  vi.useRealTimers();
  document.documentElement.classList.remove('dark');
});

const DOC = {
  id: 1,
  tracking_number: 'TRC-TEST0001',
  student_id: 'STU2024001',
  student_name: 'Ana Reyes',
  document_type: 'Transcript of Records',
  current_status: STATUS.PENDING_W1_INTAKE,
  payment_status: 'UNPAID',
  amount: '200.00',
  copies: 1,
  created_at: '2026-08-20T00:00:00.000Z',
  updated_at: '2026-08-20T00:00:00.000Z',
};

const STATS = {
  processed_today: 2,
  cleared_by_secretary_today: 1,
  avg_processing_minutes: 30,
  avg_ocr_confidence: 90,
  backlog_count: 4,
  pending_secretary_count: 3,
  ready_window_1_count: 1,
  pending_payment_verification_count: 2,
  completed_today_count: 5,
};

const USERS = {
  student: { id: 3, role: 'student', full_name: 'Ana Reyes', student_id: 'STU2024001' },
  finance: { id: 4, role: 'clerk', desk_assignment: 'Finance', full_name: 'Finance Officer' },
  window1: { id: 5, role: 'clerk', desk_assignment: 'Window 1', full_name: 'Window 1 Clerk' },
  secretary: { id: 6, role: 'clerk', desk_assignment: 'Secretary', full_name: 'CCS Secretary' },
  admin: { id: 7, role: 'admin', full_name: 'Registrar Admin' },
};

beforeEach(() => {
  // `restoreMocks` only restores vi.spyOn spies; the vi.fn()s created by the
  // module factories above keep their call history, which would leak between
  // tests and break the "never called" assertions below.
  vi.clearAllMocks();

  documentsService.getDocuments.mockResolvedValue({ documents: [DOC], total: 1, totalPages: 1 });
  documentsService.getDashboardStats.mockResolvedValue(STATS);
  documentsService.getForecast.mockResolvedValue({
    forecast: [{ date: '2026-08-25', day: 'Mon', predicted_volume: 12 }],
  });
  documentsService.getInsights.mockResolvedValue({
    insights: [{ type: 'info', title: 'System Normal', message: 'All queues normal.' }],
  });
  documentsService.getActivityLogs.mockResolvedValue({ logs: [] });
  authService.getPendingStudents.mockResolvedValue({ pending_students: [] });
  authService.getUsers.mockResolvedValue({ users: [] });
});

/** Waits past the loading gate each dashboard renders on first paint. */
async function renderDashboard(ui) {
  const utils = render(ui);
  await waitFor(() =>
    expect(screen.queryByText(/Synchronizing Command Center/i)).not.toBeInTheDocument()
  );
  return utils;
}

describe('command centers mount and load their own data', () => {
  it('Student', async () => {
    await renderDashboard(
      <StudentDashboard user={USERS.student} currentTab="dashboard" setViewImageUrl={vi.fn()} />
    );
    expect(documentsService.getDocuments).toHaveBeenCalled();
    expect(await screen.findByText(/Ana Reyes/)).toBeInTheDocument();
  });

  it('Finance', async () => {
    await renderDashboard(<FinanceDashboard user={USERS.finance} setViewImageUrl={vi.fn()} />);
    expect(documentsService.getDocuments).toHaveBeenCalled();
    expect(documentsService.getDashboardStats).toHaveBeenCalled();
  });

  it('Window 1', async () => {
    await renderDashboard(<Window1Dashboard user={USERS.window1} currentTab="dashboard" />);
    expect(documentsService.getDocuments).toHaveBeenCalled();
  });

  it('Secretary', async () => {
    await renderDashboard(
      <SecretaryDashboard user={USERS.secretary} currentTab="dashboard" setViewImageUrl={vi.fn()} />
    );
    expect(documentsService.getDocuments).toHaveBeenCalled();
  });

  it('Admin — also loads forecast, insights and pending registrations', async () => {
    await renderDashboard(
      <AdminDashboard user={USERS.admin} currentTab="dashboard" setViewImageUrl={vi.fn()} />
    );
    await waitFor(() => expect(documentsService.getForecast).toHaveBeenCalled());
    expect(documentsService.getInsights).toHaveBeenCalled();
    expect(authService.getPendingStudents).toHaveBeenCalled();
  });

  it('Admin — preserves warning and informational insights when the root theme changes', async () => {
    documentsService.getInsights.mockResolvedValue({ insights: [
      { type: 'warning', title: 'Queue needs attention', message: 'Review the waiting requests.' },
      { type: 'info', title: 'System Normal', message: 'All other queues normal.' },
    ] });
    await renderDashboard(<AdminDashboard user={USERS.admin} currentTab="dashboard" setViewImageUrl={vi.fn()} />);
    const panel = await screen.findByRole('region', { name: 'AI INSIGHTS' });
    const warning = await within(panel).findByRole('heading', { name: /Warning:.*Queue needs attention/ });
    const information = within(panel).getByRole('heading', { name: /Information:.*System Normal/ });
    const fetchCount = documentsService.getInsights.mock.calls.length;
    for (const dark of [true, false, true]) {
      act(() => document.documentElement.classList.toggle('dark', dark));
      expect(within(panel).getByRole('heading', { name: /Warning:.*Queue needs attention/ })).toBe(warning);
      expect(within(panel).getByRole('heading', { name: /Information:.*System Normal/ })).toBe(information);
      expect(within(panel).getByText('Review the waiting requests.')).toBeInTheDocument();
      expect(within(panel).getByText('All other queues normal.')).toBeInTheDocument();
      expect(documentsService.getInsights).toHaveBeenCalledTimes(fetchCount);
    }
    expect(warning.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(information.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('role isolation', () => {
  it('clerk dashboards never request admin-only datasets', async () => {
    await renderDashboard(<FinanceDashboard user={USERS.finance} setViewImageUrl={vi.fn()} />);
    expect(documentsService.getForecast).not.toHaveBeenCalled();
    expect(documentsService.getInsights).not.toHaveBeenCalled();
    expect(authService.getPendingStudents).not.toHaveBeenCalled();
  });

  it('the admin tab datasets stay lazy until their tab is opened', async () => {
    await renderDashboard(
      <AdminDashboard user={USERS.admin} currentTab="dashboard" setViewImageUrl={vi.fn()} />
    );
    expect(authService.getUsers).not.toHaveBeenCalled();
    expect(documentsService.getActivityLogs).not.toHaveBeenCalled();
  });

  it('opening the users tab fetches the user list', async () => {
    await renderDashboard(
      <AdminDashboard user={USERS.admin} currentTab="admin-users" setViewImageUrl={vi.fn()} />
    );
    await waitFor(() => expect(authService.getUsers).toHaveBeenCalled());
  });

  it('opening the logs tab fetches the audit trail', async () => {
    await renderDashboard(
      <AdminDashboard user={USERS.admin} currentTab="admin-logs" setViewImageUrl={vi.fn()} />
    );
    await waitFor(() => expect(documentsService.getActivityLogs).toHaveBeenCalled());
  });

  it('opening the Security tab renders the existing panel and loads its logs', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: [] });
    await renderDashboard(
      <AdminDashboard user={USERS.admin} currentTab="admin-security" setViewImageUrl={vi.fn()} />
    );
    expect(await screen.findByRole('heading', { name: 'Global Security Audit Log' })).toBeInTheDocument();
    expect(await screen.findByText('No security logs found')).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('/auth/global-security-logs');
  });

  it('preserves every long audit value in its column and exposes keyboard access to the scroll region', async () => {
    const log = {
      created_at: '2026-10-05T00:00:00Z',
      event_type: 'SECURITY_EVENT_' + 'LONG_DETAIL_'.repeat(20),
      full_name: 'Synthetic account ' + 'LongName'.repeat(20),
      student_id: 'SYNTHETIC-' + 'IDENTIFIER'.repeat(20),
      role: 'college_secretary',
      ip_address: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
    };
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: [log, { ...log, ip_address: null }] });
    render(<AdminSecurityPanel />);
    const table = await screen.findByRole('table', { name: 'Global security audit log' });
    expect(within(table).getAllByRole('columnheader').map(header => header.textContent))
      .toEqual(['Timestamp', 'Event', 'User', 'Role', 'IP Address']);
    const cells = within(within(table).getAllByRole('row')[1]).getAllByRole('cell');
    expect(cells[0]).toHaveTextContent(new Date(log.created_at).toLocaleString());
    expect(cells[1].textContent).toBe(log.event_type);
    expect(cells[2]).toHaveTextContent(log.full_name);
    expect(cells[2]).toHaveTextContent(log.student_id);
    expect(cells[3].textContent).toBe(log.role);
    expect(cells[4].textContent).toBe(log.ip_address);
    expect(within(table).getByText('Unknown')).toBeInTheDocument();
    const region = screen.getByRole('region', { name: 'Security log table' });
    expect(region).toContainElement(table);
    await userEvent.setup().tab();
    expect(region).toHaveFocus();
    expect(get).toHaveBeenCalledExactlyOnceWith('/auth/global-security-logs');
  });
});

describe('resilience', () => {
  it('still renders the student queue when the stats endpoint fails', async () => {
    documentsService.getDashboardStats.mockRejectedValue(new Error('stats down'));
    await renderDashboard(
      <StudentDashboard user={USERS.student} currentTab="dashboard" setViewImageUrl={vi.fn()} />
    );
    expect(await screen.findByText(/Ana Reyes/)).toBeInTheDocument();
  });

  it('still renders the admin dashboard when the AI engine is unavailable', async () => {
    documentsService.getForecast.mockRejectedValue(new Error('engine down'));
    documentsService.getInsights.mockRejectedValue(new Error('engine down'));
    await renderDashboard(
      <AdminDashboard user={USERS.admin} currentTab="dashboard" setViewImageUrl={vi.fn()} />
    );
    await waitFor(() => expect(authService.getPendingStudents).toHaveBeenCalled());
  });
});

describe('Admin Templates tab', () => {
  const list = [{ template_key: 'payment_slip', name: 'Payment Slip' }];
  const details = { content: '<p>{{STUDENT_NAME}} {{AMOUNT}}</p>', font_family: 'serif', font_size: '14px' };
  const dashboard = () => <AdminDashboard user={USERS.admin} currentTab="admin-templates" setViewImageUrl={vi.fn()} />;

  it('loads the existing editor and isolates template HTML from the app document', async () => {
    const content = '<p data-template-probe="true">{{STUDENT_NAME}} {{AMOUNT}}</p><script>window.templateProbe = true</script>';
    const get = vi.spyOn(api, 'get').mockImplementation(async path => ({ data: path === '/templates' ? list : { ...details, content } }));
    await renderDashboard(dashboard());
    expect(await screen.findByDisplayValue(content)).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('/templates/payment_slip', expect.objectContaining({ timeout: 15000 }));
    const preview = screen.getByTitle('Template preview');
    expect(preview.tagName).toBe('IFRAME');
    expect(preview).toHaveAttribute('sandbox', '');
    expect(preview).toHaveAttribute('referrerpolicy', 'no-referrer');
    expect(preview.getAttribute('srcdoc')).toContain('Juan Dela Cruz P150.00');
    expect(preview.getAttribute('srcdoc')).toContain("default-src 'none'");
    expect(preview.getAttribute('srcdoc')).toContain('font-family:serif');
    expect(document.querySelector('[data-template-probe]')).toBeNull();
  });

  it('reports a failed list request and retries without saving anything', async () => {
    const get = vi.spyOn(api, 'get').mockRejectedValueOnce(new Error('unavailable'))
      .mockImplementation(async path => ({ data: path === '/templates' ? list : details }));
    const put = vi.spyOn(api, 'put');
    await renderDashboard(dashboard());
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load templates');
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading templates' }));
    expect(await screen.findByDisplayValue(details.content)).toBeInTheDocument();
    expect(get.mock.calls.filter(([path]) => path === '/templates')).toHaveLength(2);
    expect(put).not.toHaveBeenCalled();
  });

  it('opens Templates even when document history never finishes loading', async () => {
    documentsService.getDocuments.mockImplementationOnce(() => new Promise(() => {}));
    vi.spyOn(api, 'get').mockImplementation(async path => ({ data: path === '/templates' ? list : details }));
    render(dashboard());
    expect(await screen.findByDisplayValue(details.content)).toBeInTheDocument();
    expect(screen.queryByText(/Synchronizing Command Center/i)).not.toBeInTheDocument();
  });

  it('rejects a malformed catalog rather than crashing or showing a blank tab', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: {} });
    render(dashboard());
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load templates');
    expect(screen.getByRole('button', { name: 'Retry loading templates' })).toBeEnabled();
  });

  it('rejects an empty detail response without enabling a blank save', async () => {
    vi.spyOn(api, 'get').mockImplementation(async path => ({ data: path === '/templates' ? list : {} }));
    render(dashboard());
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load this template');
    expect(screen.queryByRole('button', { name: 'Save Template' })).not.toBeInTheDocument();
  });

  it('ends a stalled catalog load and ignores a response after its deadline', async () => {
    vi.useFakeTimers();
    let finish;
    const get = vi.spyOn(api, 'get').mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    render(dashboard());
    await act(async () => vi.advanceTimersByTime(15000));
    expect(screen.getByRole('alert')).toHaveTextContent('timed out');
    expect(get.mock.calls[0][1].signal.aborted).toBe(true);
    await act(async () => finish({ data: list }));
    expect(screen.getByRole('alert')).toHaveTextContent('timed out');
  });

  it('shows an empty catalog without offering a blank template save', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: [] });
    await renderDashboard(dashboard());
    expect(await screen.findByText('No templates are configured.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save Template' })).not.toBeInTheDocument();
  });

  it('keeps stored style values from injecting markup into the preview wrapper', async () => {
    const hostileFont = 'serif;</style><script>window.templateProbe=true</script><style>';
    vi.spyOn(api, 'get').mockImplementation(async path => ({ data: path === '/templates' ? list : {
      ...details, font_family: hostileFont, font_size: '12px;</style><script>window.templateProbe=true</script>',
    } }));
    await renderDashboard(dashboard());
    await screen.findByDisplayValue(details.content);
    const preview = screen.getByTitle('Template preview').getAttribute('srcdoc');
    expect(preview).toContain('font-family:sans-serif;font-size:12px');
    expect(preview).not.toContain('window.templateProbe');
  });

  it('blocks saving after a detail failure and lets the selected template retry', async () => {
    let attempts = 0;
    vi.spyOn(api, 'get').mockImplementation(async path => {
      if (path === '/templates') return { data: list };
      if (++attempts === 1) throw new Error('unavailable');
      return { data: details };
    });
    await renderDashboard(dashboard());
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load this template');
    expect(screen.queryByRole('button', { name: 'Save Template' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading template' }));
    expect(await screen.findByDisplayValue(details.content)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Template' })).toBeEnabled();
  });

  it('ignores a slow previous selection and saves only the current template after confirmation', async () => {
    let finishFirst;
    const first = new Promise(resolve => { finishFirst = resolve; });
    vi.spyOn(api, 'get').mockImplementation(path => {
      if (path === '/templates') return Promise.resolve({ data: [...list, { template_key: 'email_notice', name: 'Email Notice' }] });
      if (path === '/templates/payment_slip') return first;
      return Promise.resolve({ data: { ...details, content: 'Email content' } });
    });
    const put = vi.spyOn(api, 'put').mockResolvedValue({});
    await renderDashboard(dashboard());
    fireEvent.click(await screen.findByRole('button', { name: 'Email Notice' }));
    expect(await screen.findByDisplayValue('Email content')).toBeInTheDocument();
    await act(async () => { finishFirst({ data: { ...details, content: 'Old payment content' } }); });
    expect(screen.getByRole('textbox', { name: /HTML Template/ })).toHaveValue('Email content');
    fireEvent.click(screen.getByRole('button', { name: 'Save Template' }));
    expect(put).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Confirm Template Save' })).getByRole('button', { name: 'Save Template' }));
    await waitFor(() => expect(put).toHaveBeenCalledExactlyOnceWith('/templates/email_notice', {
      content: 'Email content', font_family: 'serif', font_size: '14px',
    }));
  });
});
