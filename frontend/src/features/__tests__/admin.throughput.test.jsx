import { cloneElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AdminDashboard from '@/features/admin/AdminDashboard';
import { getAnalytics } from '@/services/reportsService';
import { getInsights, getActivityLogs } from '@/services/documentsService';

vi.mock('@/services/documentsService', () => ({
  getDocuments: vi.fn().mockResolvedValue({ documents: [] }),
  getDashboardStats: vi.fn().mockResolvedValue({ avg_processing_minutes: 999, backlog_count: 0 }),
  getForecast: vi.fn().mockResolvedValue({ forecast: [] }),
  getInsights: vi.fn().mockResolvedValue({ insights: [] }),
  getActivityLogs: vi.fn().mockResolvedValue({ logs: [] }),
}));
vi.mock('@/services/authService', () => ({
  getPendingStudents: vi.fn().mockResolvedValue({ pending_students: [] }),
  getUsers: vi.fn().mockResolvedValue({ users: [] }),
  verifyStudent: vi.fn(),
}));
vi.mock('@/services/reportsService', () => ({
  getReportFilterOptions: vi.fn().mockResolvedValue({colleges:[{id:4,name:'Synthetic College'}],document_types:[{id:1,name:'Diploma',is_active:1}],college_locked:false}), getAnalytics: vi.fn() }));
// Give the real charts a size; jsdom has no layout/ResizeObserver measurements.
vi.mock('recharts', async () => ({
  ...await vi.importActual('recharts'),
  ResponsiveContainer: ({ children }) => cloneElement(children, { width: 420, height: 96 }),
}));

const ADMIN = { id: 7, role: 'admin', full_name: 'Registrar Admin' };
const DAYS = [{ date: '2026-09-28', completed: 3 }, { date: '2026-09-29', completed: 5 }];
beforeEach(() => {
  vi.clearAllMocks();
  getAnalytics.mockResolvedValue({ end_to_end: { completed_count: 8, avg_minutes: 45 }, throughput: DAYS });
  getInsights.mockResolvedValue({ insights: [{ type: 'info', title: 'Document workload: 60 outstanding', message: 'Secretary Processing: 60. Queue size alone does not establish efficiency.', as_of: '2026-10-12T00:00:00Z', method: 'queue_snapshot' }] });
});
async function renderCard() {
  render(<AdminDashboard user={ADMIN} currentTab="dashboard" setViewImageUrl={vi.fn()} />);
  await waitFor(() => expect(getAnalytics).toHaveBeenCalledOnce());
  return screen.findByRole('region', { name: 'System throughput' });
}

describe('System Throughput card', () => {
  it('uses the reporting average with its unit and labels the separate daily completion series', async () => {
    const card = await renderCard();
    expect(await within(card).findByText('45 min')).toBeInTheDocument();
    expect(within(card).getByText('Daily completed documents')).toBeInTheDocument();
    expect(within(card).getByText('Average document processing time across all completed requests')).toBeInTheDocument();
    expect(within(card).queryByText(/999/)).not.toBeInTheDocument();
    expect(card.querySelector('.recharts-line-curve')).toBeInTheDocument();
  });

  it('exposes the measured day and document count through the chart keyboard tooltip', async () => {
    const card = await renderCard();
    await within(card).findByText('45 min');
    const chart = within(card).getByRole('application');
    fireEvent.focus(chart);
    await waitFor(() => expect(within(card).getByText('3 docs')).toBeVisible());
    expect(within(card).getByText('2026-09-28')).toBeVisible();
    fireEvent.keyDown(chart, { key: 'ArrowRight' });
    await waitFor(() => expect(within(card).getByText('5 docs')).toBeVisible());
    expect(within(card).getByText('2026-09-29')).toBeVisible();
  });

  it('shows an explicit empty state without an illustrative completion curve', async () => {
    getAnalytics.mockResolvedValue({ end_to_end: { completed_count: 0, avg_minutes: 0 }, throughput: [] });
    const card = await renderCard();
    expect(within(card).getByText('No completed requests yet')).toBeInTheDocument();
    expect(within(card).queryByRole('application')).not.toBeInTheDocument();
    expect(within(card).queryByText('Daily completed documents')).not.toBeInTheDocument();
  });

  it('keeps a real sub-minute average and suppresses a missing daily series', async () => {
    getAnalytics.mockResolvedValue({ end_to_end: { completed_count: 1, avg_minutes: 0 }, throughput: [] });
    const card = await renderCard();
    expect(await within(card).findByText('< 1 min')).toBeInTheDocument();
    expect(within(card).queryByText('No completed requests yet')).not.toBeInTheDocument();
    expect(within(card).queryByRole('application')).not.toBeInTheDocument();
  });

  it('keeps a single measured day accessible and identifies actual neighboring measurements', async () => {
    getAnalytics.mockResolvedValue({ end_to_end: { completed_count: 12, avg_minutes: 90 }, throughput: [{ date: '2026-09-30', completed: 12 }] });
    const card = await renderCard();
    expect(await within(card).findByText('1.5 hrs')).toBeInTheDocument();
    fireEvent.focus(within(card).getByRole('application'));
    await waitFor(() => expect(within(card).getByText('12 docs')).toBeVisible());
    expect(within(card).getByText('2026-09-30')).toBeVisible();
    const detection=screen.getByRole('region',{name:'Scan field detection'});
    expect(within(detection).getByText('Fields detected · not recognition accuracy')).toBeInTheDocument();
    expect(within(detection).getByRole('button', { name: 'About scan field detection' })).toBeInTheDocument();
    expect(within(detection).queryByText('Illustrative trend')).not.toBeInTheDocument();
    for (const name of ['Real-time backlog']) {
      const neighbor = screen.getByRole('region', { name });
      expect(within(neighbor).getByText('Current saved pipeline counts')).toBeInTheDocument();
      expect(within(neighbor).queryByText('Illustrative trend')).not.toBeInTheDocument();
      expect(within(neighbor).queryByText(/docs$/)).not.toBeInTheDocument();
    }
  });
});

it('labels the current queue snapshot and clears stale advice when Refresh insights fails', async () => {
  await renderCard();
  expect(await screen.findByText('Document workload: 60 outstanding')).toBeVisible();
  expect(screen.getByText(/Observed queue counts; not a performance forecast/)).toBeVisible();
  getInsights.mockRejectedValueOnce(new Error('snapshot unavailable'));
  fireEvent.click(screen.getByRole('button', { name: 'Refresh insights' }));
  expect(await screen.findByText('Insights unavailable')).toBeVisible();
  expect(screen.queryByText('Document workload: 60 outstanding')).not.toBeInTheDocument();
  expect(screen.getByText(/No current queue or performance conclusion is inferred/)).toBeVisible();
});

it('keeps the full document, tracking and action values in separate audit-log cells', async () => {
  getActivityLogs.mockResolvedValueOnce({ logs: [{ id: 1, timestamp_started: '2026-10-12T00:00:00Z', document_type: 'Graduation Clearance', tracking_number: 'TRC-8D74321-LONG-SYNTHETIC-TRACKING', step_name: 'payment_submitted', user_name: 'Synthetic Registrar Clerk', status: 'PENDING_FINANCE_VERIFICATION' }] });
  render(<AdminDashboard user={ADMIN} currentTab="admin-logs" setViewImageUrl={vi.fn()} />);
  const table = await screen.findByRole('table', { name: 'System-wide audit log' });
  const document = await within(table).findByText('Graduation Clearance');
  expect(document.closest('td')).toContainElement(within(table).getByText('#TRC-8D74321-LONG-SYNTHETIC-TRACKING'));
  expect(within(table).getByText('Payment Submitted').closest('td')).not.toBe(document.closest('td'));
  const scroller = screen.getByRole('region', { name: 'Activity log table' });
  scroller.focus(); expect(scroller).toHaveFocus();
});

it('does not turn failed analytics or stats reads into empty measured queues',async()=>{
 const documents=await import('@/services/documentsService');
 getAnalytics.mockRejectedValue(new Error('report offline'));
 documents.getDashboardStats.mockRejectedValueOnce(new Error('stats offline'));
 render(<AdminDashboard user={{id:1,role:'admin'}} currentTab="dashboard"/>);
 await screen.findByText('Throughput unavailable');
 expect(screen.queryByText('No completed requests yet')).not.toBeInTheDocument();
 expect(within(screen.getByRole('region',{name:'Real-time backlog'})).getByText('Unavailable')).toBeVisible();
});
