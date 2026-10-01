import { vi, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RequestMessagesPanel from '@/components/RequestMessagesPanel';
import api from '@/services/api';
vi.mock('@/services/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('@/services/realtimeService', () => ({ onNotification: () => () => {} }));
const threads = [11, 12].map(id => ({ id, tracking_number: `TRC-${id}`, document_type: 'TOR', current_status: 'SEC_PROCESSING' }));
beforeEach(() => {
  vi.clearAllMocks(); Element.prototype.scrollIntoView = vi.fn();
  api.get.mockImplementation(async path => ({ data: path.endsWith('/threads') ? { threads, total: 2 }
    : path.endsWith('/attachments') ? { requirements: [] } : [] }));
  api.post.mockResolvedValue({ data: { sent: { id: 1, sender_id: 3, message: 'Please check my request.', created_at: '2026-10-01T00:00:00Z' } } });
});
it('brings a selected student request composer into view and sends to that request immediately', async () => {
  const user = userEvent.setup();
  render(<RequestMessagesPanel user={{ id: 3, role: 'student', full_name: 'Synthetic Student' }} />);
  await user.selectOptions(await screen.findByRole('combobox', { name: 'Request conversation' }), '11');
  const input = await screen.findByRole('textbox', { name: 'Message' });
  expect(input).toHaveFocus();
  expect(input.scrollIntoView).toHaveBeenCalledOnce();
  expect(screen.getByText('Message to Window 1')).toBeInTheDocument();
  await user.type(input, 'Please check my request.{Enter}');
  await waitFor(() => expect(api.post).toHaveBeenCalledExactlyOnceWith('/documents/11/messages', { message: 'Please check my request.' }, { timeout: 15000 }));
  expect(input).toHaveValue('');
  // Message refresh scrolls only the history, without jumping away from the composer.
  expect(input.scrollIntoView).toHaveBeenCalledOnce();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
it('focuses the new request composer and keeps a failed draft in its original conversation', async () => {
  api.post.mockRejectedValue({ response: { data: { error: 'Delivery unavailable.' } } });
  render(<RequestMessagesPanel user={{ id: 3, role: 'student' }} />);
  const select = await screen.findByRole('combobox', { name: 'Request conversation' });
  fireEvent.change(select, { target: { value: '11' } });
  const input = await screen.findByRole('textbox', { name: 'Message' });
  fireEvent.change(input, { target: { value: 'Keep this draft' } });
  fireEvent.submit(input.closest('form'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Delivery unavailable.');
  expect(input).toHaveValue('Keep this draft');
  fireEvent.change(select, { target: { value: '12' } });
  expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue('');
  expect(screen.getByRole('textbox', { name: 'Message' })).toHaveFocus();
});
