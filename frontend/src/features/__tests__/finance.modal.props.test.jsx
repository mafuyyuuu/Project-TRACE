import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

/**
 * Regression: FinanceVerificationModal destructures `triggerNotification` and
 * calls it when a clerk picks an oversized receipt, but FinanceDashboard never
 * passed it — so choosing a file over 5 MB threw
 * "triggerNotification is not a function" instead of showing the limit.
 *
 * Asserting on the modal in isolation would not catch this: the defect was in
 * what the parent handed down, so the props the parent actually passes are what
 * gets checked here.
 */

vi.mock('@/services/documentsService', () => ({
  getDocuments: vi.fn(),
  getDashboardStats: vi.fn(),
  verifyPayment: vi.fn(),
  logWalkInPayment: vi.fn(),
  scanReceipt: vi.fn(),
}));

vi.mock('@/services/authService', () => ({}));

/** Capture the props the dashboard passes, and expose the oversized-file path. */
const received = {};
vi.mock('@/features/finance/components/FinanceVerificationModal', () => ({
  default: (props) => {
    Object.assign(received, props);
    return (
      <button
        type="button"
        onClick={() => props.triggerNotification('File size exceeds 5MB limit.', 'error')}
      >
        oversized-file
      </button>
    );
  },
}));

import * as documentsService from '@/services/documentsService';
import FinanceDashboard from '@/features/finance/FinanceDashboard';
import { STATUS } from '@/utils/documentStatus';

const USER = { id: 4, full_name: 'Finance Officer', role: 'clerk', desk_assignment: 'Finance' };

const DOC = {
  id: 1,
  tracking_number: 'TRC-TEST0001',
  student_id: 'STU2024001',
  student_name: 'Ana Reyes',
  document_type: 'Transcript of Records',
  current_status: STATUS.PENDING_FINANCE_VERIFICATION,
  payment_status: 'UNPAID',
  amount: '200.00',
  copies: 1,
  created_at: '2026-08-20T00:00:00.000Z',
  updated_at: '2026-08-20T00:00:00.000Z',
};

beforeEach(() => {
  for (const key of Object.keys(received)) delete received[key];
  documentsService.getDocuments.mockResolvedValue({ documents: [DOC], total: 1 });
  documentsService.getDashboardStats.mockResolvedValue({});
});

describe('FinanceDashboard → FinanceVerificationModal', () => {
  it('passes triggerNotification down to the modal', async () => {
    render(<FinanceDashboard user={USER} setViewImageUrl={() => {}} />);

    fireEvent.click(await screen.findByRole('button', { name: /review/i }));

    await waitFor(() => expect(received.triggerNotification).toBeDefined());
    expect(typeof received.triggerNotification).toBe('function');
  });

  it('shows the size limit inline instead of throwing', async () => {
    render(<FinanceDashboard user={USER} setViewImageUrl={() => {}} />);

    fireEvent.click(await screen.findByRole('button', { name: /review/i }));

    const trigger = await screen.findByText('oversized-file');
    // Before the fix this threw "triggerNotification is not a function".
    expect(() => fireEvent.click(trigger)).not.toThrow();

    expect(await screen.findByText(/File size exceeds 5MB limit/i)).toBeInTheDocument();
  });
});
