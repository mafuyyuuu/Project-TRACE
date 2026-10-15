import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StudentHistory from '@/features/student/components/StudentHistory';

const documents = [
  { id: 1, tracking_number: 'TRC-FIRST', document_type: 'Transcript of Records', current_status: 'PENDING_FINANCE_VERIFICATION', payment_status: 'UNPAID', gcash_reference_no: 'REF-FIRST', amount: 50, priced_at: '2026-10-01', created_at: '2026-10-01' },
  { id: 2, tracking_number: 'TRC-PAID', document_type: 'Graduation Clearance', current_status: 'COMPLETED', payment_status: 'PAID', amount: 100, official_receipt_path: 'protected-receipt.png', created_at: '2026-10-01' },
  { id: 3, tracking_number: 'TRC-UNPRICED', document_type: 'Transcript of Records', current_status: 'PENDING_W1_INTAKE', payment_status: 'UNPAID', amount: 999, created_at: '2026-10-01' },
];
describe('Student History filters', () => {
  it('combines tracking/document search with the actual request status', async () => {
    const user = userEvent.setup();
    render(<StudentHistory documents={documents} view="all" onView={vi.fn()} onReceipt={vi.fn()} />);
    await user.type(screen.getByRole('searchbox'), 'Transcript');
    expect(screen.queryByText('TRC-PAID')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Request status' }), 'PENDING_W1_INTAKE');
    expect(screen.getByText('TRC-UNPRICED')).toBeInTheDocument();
    expect(screen.queryByText('TRC-FIRST')).not.toBeInTheDocument();
    expect(screen.getByText('Pending Secretary pricing')).toBeInTheDocument();
    expect(screen.queryByText('₱999.00')).not.toBeInTheDocument();
  });
  it('limits payment history to submitted payment records and filters references without changing receipt access', async () => {
    const user = userEvent.setup(), onReceipt = vi.fn();
    render(<StudentHistory documents={documents} view="payments" onView={vi.fn()} onReceipt={onReceipt} />);
    expect(screen.queryByText('TRC-UNPRICED')).not.toBeInTheDocument();
    await user.type(screen.getByRole('searchbox'), 'REF-FIRST');
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'View Receipt' })).not.toBeInTheDocument();
    await user.clear(screen.getByRole('searchbox'));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Payment status' }), 'PAID');
    await user.click(screen.getByRole('button', { name: 'View Receipt' }));
    expect(onReceipt).toHaveBeenCalledWith('protected-receipt.png');
    expect(screen.queryByText('REF-FIRST')).not.toBeInTheDocument();
  });
});
