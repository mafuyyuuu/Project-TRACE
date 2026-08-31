import { describe, it, expect, vi, beforeEach } from 'vitest';
import { STATUS } from '@/utils/documentStatus';
import { render, screen, waitFor } from '@testing-library/react';

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

import * as documentsService from '@/services/documentsService';
import * as authService from '@/services/authService';

import StudentDashboard from '@/features/student/StudentDashboard';
import FinanceDashboard from '@/features/finance/FinanceDashboard';
import Window1Dashboard from '@/features/window1/Window1Dashboard';
import SecretaryDashboard from '@/features/secretary/SecretaryDashboard';
import AdminDashboard from '@/features/admin/AdminDashboard';

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
