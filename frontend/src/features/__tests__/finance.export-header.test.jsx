import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import FinanceTransactionsPanel from '@/features/finance/components/FinanceTransactionsPanel';
import useFinanceTransactions from '@/hooks/useFinanceTransactions';
import { exportFinanceTransactions, getFinanceTransactions } from '@/services/financeService';

vi.mock('@/services/financeService', () => ({ getFinanceTransactions: vi.fn(), exportFinanceTransactions: vi.fn() }));
function Panel() {
  const state = useFinanceTransactions();
  return <FinanceTransactionsPanel state={state} onUpload={vi.fn()} onProfile={vi.fn()} />;
}
let downloads;
beforeEach(() => {
  vi.clearAllMocks();
  downloads = [];
  getFinanceTransactions.mockResolvedValue({ transactions: [], total: 0, amount: 0 });
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:synthetic-csv');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { downloads.push({ href: this.href, filename: this.download }); });
});
afterEach(() => { vi.restoreAllMocks(); });

it('exports Finance CSV with current filters and retains pending, failure and download behavior', async () => {
  const user = userEvent.setup();
  render(<Panel />);
  await waitFor(() => expect(screen.queryByText('Loading payments…')).not.toBeInTheDocument());
  await user.type(screen.getByLabelText('From (Manila)'), '2026-10-01');
  await user.type(screen.getByLabelText('Through (Manila)'), '2026-10-05');
  await user.selectOptions(screen.getByLabelText('OR status'), 'pending');
  let reject;
  exportFinanceTransactions.mockReturnValueOnce(new Promise((_, fail) => { reject = fail; }));
  const trigger = screen.getByRole('button', { name: 'Export' });
  expect(trigger.parentElement.parentElement.parentElement).toContainElement(screen.getByRole('heading', { name: 'Transactions & OR Copies' }));
  await user.click(trigger);
  expect(screen.getByRole('group', { name: 'Export options' }).querySelectorAll('button')).toHaveLength(1);
  await user.click(screen.getByRole('button', { name: 'Filtered Finance transactions (CSV)' }));
  expect(exportFinanceTransactions).toHaveBeenCalledExactlyOnceWith({ from: '2026-10-01', to: '2026-10-05', receipt: 'pending' });
  expect(screen.getByRole('button', { name: 'Exporting…' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Exporting…' }));
  expect(exportFinanceTransactions).toHaveBeenCalledTimes(1);
  await act(async () => reject(new Error('synthetic failure')));
  expect(screen.getByRole('alert')).toHaveTextContent('Could not export. Narrow the date range or try again.');
  expect(downloads).toHaveLength(0);
  exportFinanceTransactions.mockResolvedValue(new Blob(['synthetic CSV'], { type: 'text/csv' }));
  await user.click(screen.getByRole('button', { name: 'Export' }));
  await user.click(screen.getByRole('button', { name: 'Filtered Finance transactions (CSV)' }));
  await waitFor(() => expect(downloads).toEqual([{ href: 'blob:synthetic-csv', filename: 'trace-finance-transactions.csv' }]));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
