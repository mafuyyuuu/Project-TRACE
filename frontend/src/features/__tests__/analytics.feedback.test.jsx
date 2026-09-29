import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AnalyticsPanel from '@/features/admin/components/AnalyticsPanel';
import * as reportsService from '@/services/reportsService';

vi.mock('@/services/reportsService', () => ({
  getDocumentReport: vi.fn(),
  getAnalytics: vi.fn(),
  exportStudentsCsv: vi.fn(),
  exportDocumentsCsv: vi.fn(),
}));

describe('Analytics feedback', () => {
  it('dismisses report errors while keeping successfully loaded analytics visible', async () => {
    reportsService.getDocumentReport.mockRejectedValueOnce({ response: { data: { error: 'Report temporarily unavailable.' } } });
    reportsService.getAnalytics.mockResolvedValueOnce({
      end_to_end: { avg_minutes: 0, min_minutes: 0, max_minutes: 0, completed_count: 0 },
      turnaround_by_desk: [], workload_by_clerk: [], throughput: [],
    });
    render(<AnalyticsPanel user={{ id: 1, role: 'admin' }} currentTab="admin-analytics" />);
    expect(await screen.findByRole('dialog', { name: 'Attention Needed' })).toHaveTextContent('Report temporarily unavailable.');
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Efficiency Analytics' })).toBeInTheDocument();
  });
});
