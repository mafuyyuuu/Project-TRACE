import { it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AnalyticsPanel from '@/features/admin/components/AnalyticsPanel';
import { getAiEvaluation } from '@/services/reportsService';
import useReports from '@/features/admin/useReports';
vi.mock('@/services/reportsService', () => ({ getAiEvaluation: vi.fn() }));
vi.mock('@/features/admin/useReports', () => ({ default: vi.fn(() => ({ loading: true })) }));
vi.mock('@/components/SupportAnalytics', () => ({ default: () => <p>Support</p> }));
const evidence = {
  dataset: { total: 10043, synthetic: 10000, unmarked: 43, first_date: '2020-01-01', last_date: '2026-07-20', ocr_field_detection: 80, ocr_samples: 10 },
  logs: { activity_events: 30000 }, live_window: { start: '2026-07-20', end: '2026-10-17' },
  evaluation: { cohort: 'all', train_start: '2026-04-15', train_end: '2026-07-12', simulated_today: '2026-07-13', train_days: 90, train_requests: 500,
    test_start: '2026-07-14', test_end: '2026-07-20', test_requests: 35, synthetic_requests: 535, status: 'evaluated',
    baseline: { mae: 1, rmse: 2, wape: 20 }, prophet: { mae: 2, rmse: 3, wape: 40 }, improvement_percent: -100,
    daily: [{ date: '2026-07-14', actual: 0, baseline: 1, prophet: 2 }] },
};
function mount() {
  return render(<MemoryRouter initialEntries={['/dashboard?tab=admin-analytics&analytics=ai']}><AnalyticsPanel user={{ role: 'admin' }} currentTab="admin-analytics" /></MemoryRouter>);
}
beforeEach(() => { vi.clearAllMocks(); getAiEvaluation.mockResolvedValue(evidence); });
it('opens the AI deep link independently and reports worse Prophet errors honestly', async () => {
  mount();
  expect(useReports).not.toHaveBeenCalled();
  expect(screen.getByRole('tab', { name: 'AI & Model Evaluation' })).toHaveAttribute('aria-selected', 'true');
  expect(await screen.findByText('10,043')).toBeVisible();
  expect(screen.getByText(/higher error/)).toHaveTextContent('-100%');
  expect(screen.getByRole('table', { name: 'Held-out daily predictions' })).toHaveTextContent('0');
  expect(screen.getByText(/Recognition accuracy:/)).toHaveTextContent('Not measured');
  expect(screen.getAllByRole('heading', { name: 'Compared with alternatives' })).toHaveLength(3);
  expect(screen.getByText(/four hand-authored examples/)).toBeVisible();
});
it('retains date drafts across tabs, guards duplicate evaluation and labels retained results after failure', async () => {
  mount(); await screen.findByText('10,043');
  fireEvent.change(screen.getByLabelText(/Test period ending/), { target: { value: '2026-06-30' } });
  fireEvent.change(screen.getByLabelText('Dataset'), { target: { value: 'unmarked' } });
  fireEvent.click(screen.getByRole('tab', { name: 'Support Analytics' }));
  fireEvent.click(screen.getByRole('tab', { name: 'AI & Model Evaluation' }));
  expect(screen.getByLabelText(/Test period ending/)).toHaveValue('2026-06-30');
  let reject;
  getAiEvaluation.mockImplementationOnce(() => new Promise((resolve, rejectRequest) => { reject = rejectRequest; }));
  fireEvent.click(screen.getByRole('button', { name: 'Evaluate period' }));
  expect(screen.getByRole('button', { name: 'Evaluating…' })).toBeDisabled();
  expect(getAiEvaluation).toHaveBeenLastCalledWith({ endDate: '2026-06-30', cohort: 'unmarked' }, expect.any(AbortSignal));
  reject(new Error('offline'));
  expect(await screen.findByRole('alert')).toHaveTextContent('previously loaded period remains');
  expect(screen.getByText(/Loaded dataset:/)).toHaveTextContent('All document rows');
  expect(screen.getByLabelText(/Test period ending/)).toHaveValue('2026-06-30');
});
it('keeps explanations accessible when measurements fail and can retry', async () => {
  getAiEvaluation.mockRejectedValueOnce(new Error('offline'));
  mount(); await screen.findByRole('alert');
  expect(screen.getByRole('heading', { name: 'EasyOCR · text extraction' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Evaluate period' }));
  expect(await screen.findByText('10,043')).toBeVisible();
});
it('labels baseline-only evaluation without displaying a Prophet measurement', async () => {
  getAiEvaluation.mockResolvedValueOnce({ ...evidence, evaluation: { ...evidence.evaluation, status: 'prophet_unavailable', prophet: null, improvement_percent: null } });
  mount(); expect(await screen.findByText(/Only the baseline was evaluated/)).toBeVisible();
  expect(screen.getByRole('table', { name: 'Forecast error comparison' })).toHaveTextContent('Not measured');
  await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
});

it('does not present an unversioned historical average as measured field detection', async () => {
  getAiEvaluation.mockResolvedValueOnce({ ...evidence, dataset: { ...evidence.dataset, ocr_field_detection: 45, ocr_samples: 2 } });
  mount(); await screen.findByText('10,043');
  expect(screen.getByText(/Recorded intake field detection:/)).toHaveTextContent('Not measured');
  expect(screen.getByText(/Excluded from this measurement:/)).toHaveTextContent('2 historical/unverified scores');
});

it('shows verified recorded-only field detection and its excluded sample counts', async () => {
  getAiEvaluation.mockResolvedValueOnce({ ...evidence, dataset: { ...evidence.dataset,
    ocr_measurement_method: 'intake_fields_v1', ocr_field_detection: 0, ocr_samples: 1,
    ocr_unverified_samples: 2, ocr_synthetic_samples: 3, ocr_total_scored: 6 } });
  mount(); await screen.findByText('10,043');
  expect(screen.getByText(/Recorded intake field detection:/)).toHaveTextContent('0% from 1 document scans');
  expect(screen.getByText(/Excluded from this measurement:/)).toHaveTextContent('2 historical/unverified scores and 3 marked synthetic scores');
  expect(screen.queryByRole('checkbox', { name: 'Include 3 demo scans' })).not.toBeInTheDocument();
});

it('explains trust and the Random Forest status in plain language without inventing accuracy',async()=>{
 mount();await screen.findByText('10,043');
 expect(screen.getByRole('region',{name:'How to judge whether the AI is useful'})).toHaveTextContent('Staff review helps catch mistakes, but it is not proof that a model is accurate');
 expect(screen.getByText(/Random Forest was intended for AI Insights/)).toHaveTextContent('It is not active now');
 expect(screen.getByLabelText('Forecast result in plain language')).toHaveTextContent('The simple average made fewer mistakes');
 expect(screen.getByText(/MAE means the average daily miss/)).toHaveTextContent('WAPE 20% does not mean 80% accuracy');
});
