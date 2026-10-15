import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LiveTrackingModal from '@/features/student/components/LiveTrackingModal';
import { STATUS, getStatusLabel } from '@/utils/documentStatus';

const document = { id: 7, tracking_number: 'TRC-SYNTHETIC', document_type: 'Graduation Clearance', created_at: '2026-10-07T11:41:00Z', current_status: STATUS.PENDING_FINANCE_VERIFICATION };
afterEach(() => vi.unstubAllGlobals());
describe('Student live tracking', () => {
  it('copies the saved tracking identifier and announces a failed clipboard attempt', async () => {
    const writeText = vi.fn().mockRejectedValueOnce(new Error('Clipboard unavailable')).mockResolvedValueOnce();
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    render(<LiveTrackingModal selectedDoc={document} setActiveModal={vi.fn()} getStatusLabel={getStatusLabel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy tracking ID' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Copy unavailable. Select the tracking ID to copy it.');
    fireEvent.click(screen.getByRole('button', { name: 'Copy tracking ID' }));
    expect(await screen.findByText('Tracking ID copied.')).toBeInTheDocument();
    expect(writeText).toHaveBeenNthCalledWith(1, document.tracking_number);
    expect(writeText).toHaveBeenNthCalledWith(2, document.tracking_number);
  });
  it('shows the recorded stage and next step, then has no next step after completion', () => {
    const props = { setActiveModal: vi.fn(), getStatusLabel };
    const { rerender } = render(<LiveTrackingModal {...props} selectedDoc={document} />);
    expect(screen.getByText('Step 5 of 9')).toBeInTheDocument();
    expect(screen.getByText('4 of 9 completed')).toBeInTheDocument();
    expect(screen.getByText('Next step: Secretary Handoff')).toBeInTheDocument();
    rerender(<LiveTrackingModal {...props} selectedDoc={{ ...document, current_status: STATUS.COMPLETED }} />);
    expect(screen.getByText('9 of 9 completed')).toBeInTheDocument();
    expect(screen.queryByText(/^Next step:/)).not.toBeInTheDocument();
    expect(screen.queryByText('In progress')).not.toBeInTheDocument();
  });
});
