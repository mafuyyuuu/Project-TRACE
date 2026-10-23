import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SupportAnalytics from '@/components/SupportAnalytics';
import {downloadReportPdf} from '@/services/reportsService';
import { getSupportMetrics } from '@/services/supportTicketsService';

vi.mock('@/services/reportsService',()=>({downloadReportPdf:vi.fn().mockResolvedValue('trace-support-report-2026-10-17.pdf')}));
vi.mock('@/services/supportTicketsService', () => ({ getSupportMetrics: vi.fn() }));

const row = (median_minutes, p90_minutes, samples, missing) => ({ median_minutes, p90_minutes, samples, missing });
const report = overrides => ({
  period: { from: '2026-10-01T00:00:00+08:00', to_exclusive: '2026-10-08T00:00:00+08:00', timezone: 'Asia/Manila' },
  created: 12, imported: 4, escalation: { numerator: 2, denominator: 8, percent: 25 },
  categories: { linked: 9, email: 3 }, backlog: { QUEUED: 2, AWAITING_STUDENT: 1, UNKNOWN: 1 },
  durations: {
    initial_queue: row(0, 2.5, 3, 1), requeue: row(null, null, 0, 0),
    first_response: row(2, 5, 3, 1), resolution_service: row(9, 12, 2, 1),
    resolution_wall: row(60, 120, 2, 1), awaiting_student: row(null, null, 0, 1),
    student_reply: row(0, 5, 2, 1),
  },
  faq: { views: 15, helpful: 6, not_helpful: 2, feedback_denominator: 8, resolved: 3,
    topics: { email: { views: 15, helpful: 6, not_helpful: 2, resolved: 3 } } },
  workload: [{ id: 7, name: 'Synthetic clerk', assignments: 2, response_episodes: 3, response_tickets: 1 },
    { id: 8, name: 'Another synthetic clerk', assignments: 1, response_episodes: 1, response_tickets: 1 }],
  notes: ['Duration samples exclude imported histories. Missing measurements are not zeros.',
    'Resolution service time excludes Awaiting student intervals; wall time includes them.'],
  ...overrides,
});
const card = label => screen.getByText(label, { selector: 'dt' }).parentElement;

beforeEach(() => { vi.clearAllMocks(); getSupportMetrics.mockResolvedValue(report()); });

describe('Support analytics presentation and report lifecycle', () => {
  it('keeps ticket cohorts, FAQ denominators, backlog cutoff and workload episodes distinct', async () => {
    render(<SupportAnalytics />);
    await screen.findByRole('table', { name: 'Measured Durations (Minutes)' });
    expect(within(card('New Tickets')).getByText('12')).toBeInTheDocument();
    expect(card('New Tickets')).toHaveTextContent('4 imported tickets, counted separately');
    expect(card('Escalations')).toHaveTextContent('25%');
    expect(card('Escalations')).toHaveTextContent('2 / 8 FAQ-assisted tickets escalated');
    expect(card('Unresolved Backlog')).toHaveTextContent('4');
    expect(card('Unresolved Backlog')).toHaveTextContent("at the reporting cutoff");
    expect(card('FAQ Views')).toHaveTextContent('6 helpful · 2 not helpful');
    expect(card('Explicit FAQ Resolutions')).toHaveTextContent('Recorded resolved actions');
    expect(card('Staff Assigned Episodes')).toHaveTextContent('3');
    expect(card('Staff Assigned Episodes')).toHaveTextContent('Volume, not a performance ranking');
    const workload = screen.getByRole('table', { name: 'Clerk Workload Episodes' });
    expect(within(workload).getByRole('row', { name: 'Synthetic clerk 2 3' })).toBeInTheDocument();
    expect(screen.getByText('UNKNOWN', { selector: 'dt' })).toBeInTheDocument();
  });

  it('retains every statistical column and renders recorded zeros separately from missing measurements', async () => {
    render(<SupportAnalytics />);
    const table = await screen.findByRole('table', { name: 'Measured Durations (Minutes)' });
    expect(within(table).getAllByRole('columnheader').map(el => el.textContent)).toEqual(['Metric', 'Median', 'p90', 'Samples', 'Missing']);
    expect(within(table).getAllByRole('rowheader')).toHaveLength(7);
    expect(within(table).getByRole('row', { name: 'Initial Queue Wait 0 2.5 3 1' })).toBeInTheDocument();
    expect(within(table).getByRole('row', { name: 'Requeue Wait No data No data 0 0' })).toBeInTheDocument();
    expect(within(table).getByRole('row', { name: 'Awaiting Student Pause No data No data 0 1' })).toBeInTheDocument();
    expect(table).toHaveAccessibleDescription(/Imported histories are excluded/);
    expect(screen.getByRole('region', { name: 'Measured duration table' })).toHaveAttribute('tabindex', '0');
  });

  it('reports an empty measured period honestly without inventing percentages or workload', async () => {
    getSupportMetrics.mockResolvedValue(report({ created: 0, imported: 0, categories: {}, backlog: {},
      escalation: { numerator: 0, denominator: 0, percent: null }, workload: [],
      faq: { views: 0, helpful: 0, not_helpful: 0, feedback_denominator: 0, resolved: 0, topics: {} } }));
    render(<SupportAnalytics />);
    await screen.findByText('No recorded FAQ actions in this period.');
    expect(card('Escalations')).toHaveTextContent('No data');
    expect(card('Escalations')).not.toHaveTextContent('%');
    expect(within(card('Unresolved Backlog')).getByText('0')).toBeInTheDocument();
    expect(card('Staff Assigned Episodes')).toHaveTextContent('Volume, not a performance ranking');
    expect(screen.getByText('No new tickets in this period.')).toBeInTheDocument();
    expect(screen.getByText('No recorded unresolved backlog.')).toBeInTheDocument();
    expect(screen.getByText('No recorded staff assignments or responses in this period.')).toBeInTheDocument();
  });

  it('does not coerce absent summary values into zero or append a percent sign to missing data', async () => {
    getSupportMetrics.mockResolvedValue(report({ created: null, backlog: { UNKNOWN: null },
      escalation: { numerator: 0, denominator: 0, percent: null },
      workload: [{ id: 7, name: 'Synthetic clerk', assignments: null, response_episodes: undefined }] }));
    render(<SupportAnalytics />);
    await screen.findByRole('table', { name: 'Measured Durations (Minutes)' });
    for (const label of ['New Tickets', 'Unresolved Backlog', 'Escalations', 'Staff Assigned Episodes']) {
      expect(within(card(label)).getAllByText('No data').length).toBeGreaterThan(0);
    }
    expect(card('Escalations')).not.toHaveTextContent('No data%');
  });

  it('loads the default period once and keeps edits as drafts until Apply', async () => {
    render(<SupportAnalytics />);
    expect(await screen.findByText(/Loaded period/)).toBeInTheDocument();
    expect(getSupportMetrics).toHaveBeenCalledTimes(1);
    expect(getSupportMetrics).toHaveBeenCalledWith({}, expect.any(AbortSignal));
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-09-01' } });
    fireEvent.change(screen.getByLabelText('Through'), { target: { value: '2026-09-30' } });
    expect(getSupportMetrics).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Apply period' }));
    await waitFor(() => expect(getSupportMetrics).toHaveBeenCalledWith({ dateFrom: '2026-09-01', dateTo: '2026-09-30' }, expect.any(AbortSignal)));
  });

  it('clears blank period fields to the server defaults rather than sending empty dates', async () => {
    render(<SupportAnalytics />);
    await screen.findByText(/Loaded period/);
    fireEvent.click(screen.getByRole('button', { name: 'Apply period' }));
    await waitFor(() => expect(getSupportMetrics).toHaveBeenLastCalledWith({ dateFrom: undefined, dateTo: undefined }, expect.any(AbortSignal)));
  });

  it('labels previous results during refresh, guards duplicate Apply and keeps a failed period draft for retry', async () => {
    let reject;
    getSupportMetrics.mockResolvedValueOnce(report()).mockImplementationOnce(() => new Promise((_, no) => { reject = no; })).mockResolvedValueOnce(report({ created: 21,
      period: { from: '2026-09-01T00:00:00+08:00', to_exclusive: '2026-09-02T00:00:00+08:00' } }));
    render(<SupportAnalytics />);
    await screen.findByText(/Loaded period/);
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-09-01' } });
    fireEvent.change(screen.getByLabelText('Through'), { target: { value: '2026-09-01' } });
    const apply = screen.getByRole('button', { name: 'Apply period' });
    fireEvent.click(apply);
    expect(apply).toBeDisabled();
    fireEvent.submit(screen.getByRole('form', { name: 'Support reporting period' }));
    expect(getSupportMetrics).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('status')).toHaveTextContent('previous loaded results');
    expect(within(card('New Tickets')).getByText('12')).toBeInTheDocument();
    await act(async () => reject({ response: { data: { error: 'Synthetic report failed.' } } }));
    expect(screen.getByRole('alert')).toHaveTextContent('Synthetic report failed.');
    expect(screen.getByRole('alert')).toHaveTextContent('previous loaded period remains');
    expect(screen.getByLabelText('From')).toHaveValue('2026-09-01');
    expect(apply).toBeEnabled();
    fireEvent.click(apply);
    await waitFor(() => expect(within(card('New Tickets')).getByText('21')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText(/Sep 1, 2026/)).toHaveTextContent('Sep 2, 2026');
  });

  it('offers an inline retry after initial report failure without rendering fabricated summary cards', async () => {
    getSupportMetrics.mockRejectedValueOnce(new Error('Network error')).mockResolvedValueOnce(report());
    render(<SupportAnalytics />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Support analytics could not load. Retry the report.');
    expect(screen.queryByLabelText('Support summary metrics')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Apply period' }));
    await screen.findByLabelText('Support summary metrics');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('aborts the report request on unmount', async () => {
    getSupportMetrics.mockImplementation(() => new Promise(() => {}));
    const { unmount } = render(<SupportAnalytics />);
    await waitFor(() => expect(getSupportMetrics).toHaveBeenCalledOnce());
    const signal = getSupportMetrics.mock.calls[0][1];
    expect(signal.aborted).toBe(false);
    unmount();
    expect(signal.aborted).toBe(true);
  });
});


it('exports only the successfully applied support period for Admin and disables exports on failed refresh',async()=>{
 render(<SupportAnalytics admin/>);await screen.findByText(/Loaded period/);
 fireEvent.change(screen.getByLabelText('From'),{target:{value:'2026-09-01'}});fireEvent.change(screen.getByLabelText('Through'),{target:{value:'2026-09-30'}});
 fireEvent.click(screen.getByRole('button',{name:'Export PDF'}));await waitFor(()=>expect(downloadReportPdf).toHaveBeenCalledWith('support',{},expect.any(AbortSignal)));
 fireEvent.click(await screen.findByRole('button',{name:'OK'}));
 fireEvent.click(screen.getByRole('button',{name:'Apply period'}));await waitFor(()=>expect(getSupportMetrics).toHaveBeenCalledWith({dateFrom:'2026-09-01',dateTo:'2026-09-30'},expect.any(AbortSignal)));
 await waitFor(()=>expect(screen.getByRole('button',{name:'Export PDF'})).toBeEnabled());fireEvent.click(screen.getByRole('button',{name:'Export PDF'}));await waitFor(()=>expect(downloadReportPdf).toHaveBeenLastCalledWith('support',{dateFrom:'2026-09-01',dateTo:'2026-09-30'},expect.any(AbortSignal)));
 fireEvent.click(await screen.findByRole('button',{name:'OK'}));getSupportMetrics.mockRejectedValueOnce(new Error('unavailable'));fireEvent.click(screen.getByRole('button',{name:'Apply period'}));await screen.findByRole('alert');expect(screen.getByRole('button',{name:'Export PDF'})).toBeDisabled();
});
it('keeps PDF controls out of non-Admin analytics presentation',async()=>{render(<SupportAnalytics/>);await screen.findByText(/Loaded period/);expect(screen.queryByRole('button',{name:'Export PDF'})).not.toBeInTheDocument();});
