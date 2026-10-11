import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import FinanceTransactionsPanel from '@/features/finance/components/FinanceTransactionsPanel';
import useFinanceTransactions from '@/hooks/useFinanceTransactions';
import { exportFinanceTransactions, getFinanceTransactions } from '@/services/financeService';

vi.mock('@/services/reportsService',()=>({getReportFilterOptions:vi.fn().mockResolvedValue({colleges:[],document_types:[],college_locked:false})}));
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
  await user.click(screen.getByRole('button',{name:'Filters'}));
  fireEvent.change(screen.getByLabelText('Payment cleared From'),{target:{value:'2026-10-01'}});
  fireEvent.change(screen.getByLabelText('Payment cleared To'),{target:{value:'2026-10-05'}});
  await user.selectOptions(screen.getByLabelText('OR status'), 'pending');
  let reject;
  exportFinanceTransactions.mockReturnValueOnce(new Promise((_, fail) => { reject = fail; }));
  await user.click(screen.getByRole('button',{name:'Apply Filters'}));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Export CSV'})).toBeEnabled());
  await user.click(screen.getByRole('button',{name:'Export CSV'}));
  expect(exportFinanceTransactions).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ from: '2026-10-01', to: '2026-10-05', receipt: 'pending' }));
  expect(screen.getByRole('button', { name: 'Exporting…' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Exporting…' }));
  expect(exportFinanceTransactions).toHaveBeenCalledTimes(1);
  await act(async () => reject(new Error('synthetic failure')));
  expect(screen.getAllByRole('alert')[0]).toHaveTextContent('Could not export. Narrow the date range or try again.');
  expect(downloads).toHaveLength(0);
  exportFinanceTransactions.mockResolvedValue(new Blob(['synthetic CSV'], { type: 'text/csv' }));
  await user.click(screen.getByRole('button', {name:'Export CSV'}));
  await waitFor(() => expect(downloads).toEqual([{ href: 'blob:synthetic-csv', filename: 'trace-finance-transactions.csv' }]));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('hides stale transactions and blocks export after a newly applied scope fails',async()=>{
  getFinanceTransactions.mockResolvedValue({transactions:[{id:1,request_group_id:'SYN-OLD',tracking_number:'TRC-OLD',student_name:'Old scope student',student_id:'SYN-OLD',amount:100,payment_cleared_at:null,or_number:'SYN-OR',official_receipt_path:'/uploads/synthetic.pdf'}],total:1,amount:100});
  render(<Panel/>);await screen.findByText('Old scope student');
  await userEvent.click(screen.getByRole('button',{name:'Filters'}));
  await userEvent.type(screen.getByLabelText('Student name'),'New scope');
  getFinanceTransactions.mockRejectedValueOnce(new Error('synthetic failure'));
  await userEvent.click(screen.getByRole('button',{name:'Apply Filters'}));
  await waitFor(()=>expect(screen.getAllByRole('alert')[0]).toHaveTextContent('Could not load Finance transactions.'));
  expect(screen.queryByText('Old scope student')).not.toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Export CSV'})).toBeDisabled();
  expect(exportFinanceTransactions).not.toHaveBeenCalled();
});
