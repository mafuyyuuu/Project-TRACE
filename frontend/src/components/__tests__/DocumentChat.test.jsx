import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DocumentChat from '@/components/DocumentChat';
import api from '@/services/api';

vi.mock('@/services/realtimeService', () => ({ onNotification: vi.fn(() => () => {}) }));
vi.mock('@/services/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue({ data: [] });
  api.post.mockResolvedValue({ data: {} });
  Element.prototype.scrollIntoView = vi.fn();
});
const chat = () => <DocumentChat documentId={11} user={{ id: 3, full_name: 'Ana Reyes' }} />;

describe('Direct document messages', () => {
  it('keeps readers in place during refresh and follows replies only when already at the bottom', async () => {
    const rows = [{ id: 1, sender_id: 9, message: 'Earlier message', created_at: '2026-10-01' }];
    api.get.mockResolvedValueOnce({ data: rows });
    render(chat());
    await screen.findByText('Earlier message');
    const history = screen.getByRole('region', { name: 'Request conversation' }).querySelector('[aria-live]');
    Object.defineProperties(history, {
      scrollHeight: { configurable: true, value: 1000 },
      clientHeight: { configurable: true, value: 200 },
    });
    history.scrollTop = 50;
    fireEvent.scroll(history);
    api.get.mockResolvedValueOnce({ data: [...rows, { id: 2, sender_id: 9, message: 'New reply', created_at: '2026-10-01' }] });
    fireEvent(window, new Event('focus'));
    await screen.findByText('New reply');
    expect(history.scrollTop).toBe(50);
    history.scrollTop = 800;
    fireEvent.scroll(history);
    api.get.mockResolvedValueOnce({ data: [...rows, { id: 3, sender_id: 9, message: 'Following reply', created_at: '2026-10-01' }] });
    fireEvent(window, new Event('focus'));
    await screen.findByText('Following reply');
    expect(history.scrollTop).toBe(1000);
  });

  it.each(['Enter', 'Send'])('submits immediately using %s without confirmation', async method => {
    const user = userEvent.setup();
    render(chat());
    const input = await screen.findByRole('textbox', { name: 'Message' });
    await user.type(input, 'Please check the receipt.');
    if (method === 'Enter') await user.keyboard('{Enter}');
    else await user.click(screen.getByRole('button', { name: 'Send message' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledExactlyOnceWith('/documents/11/messages', { message: 'Please check the receipt.' }, { timeout: 15000 }));
    expect(input).toHaveValue('');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('blocks duplicate submits while pending and retains the draft until accepted', async () => {
    let finish;
    api.post.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    render(chat());
    const input = await screen.findByRole('textbox', { name: 'Message' });
    fireEvent.change(input, { target: { value: 'My draft' } });
    const form = input.closest('form');
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue('My draft');
    expect(input).toBeDisabled();
    await act(async () => finish({ data: {} }));
    expect(input).toHaveValue('');
    expect(input).toBeEnabled();
  });

  it('keeps a failed message for correction or retry and shows the error inline', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValueOnce({ response: { data: { error: 'Messaging unavailable.' } } });
    render(chat());
    const input = await screen.findByRole('textbox', { name: 'Message' });
    await user.type(input, 'My draft{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent('Messaging unavailable.');
    expect(input).toHaveValue('My draft');
    expect(input).toBeEnabled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    await waitFor(() => expect(input).toHaveValue(''));
    expect(api.post).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not restore an accepted message when refreshing the conversation fails', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValueOnce({ data: [] }).mockRejectedValueOnce(new Error('refresh failed'));
    render(chat());
    const input = await screen.findByRole('textbox', { name: 'Message' });
    await user.type(input, 'Accepted message{Enter}');
    expect(await screen.findByRole('status')).toHaveTextContent('Message sent.');
    expect(screen.getByText('Accepted message')).toBeInTheDocument();
    expect(input).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load replies.');
    expect(screen.getByRole('button', { name: 'Retry conversation' })).toBeEnabled();
  });

  it('does not move a pending send or its draft into another request', async () => {
    let finish;
    api.post.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const user = userEvent.setup();
    const { rerender } = render(chat());
    await user.type(await screen.findByRole('textbox', { name: 'Message' }), 'First request{Enter}');
    rerender(<DocumentChat documentId={12} user={{ id: 3, full_name: 'Ana Reyes' }} />);
    const nextInput = await screen.findByRole('textbox', { name: 'Message' });
    expect(nextInput).toHaveValue('');
    await user.type(nextInput, 'New draft');
    await act(async () => finish({ data: {} }));
    expect(nextInput).toHaveValue('New draft');
    expect(nextInput).toBeEnabled();
    expect(screen.queryByText('First request')).not.toBeInTheDocument();
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/documents/11/messages', { message: 'First request' }, { timeout: 15000 });
  });

  it('does not fetch or offer sending before the account is available', () => {
    render(<DocumentChat documentId={11} />);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox', { name: 'Message' })).not.toBeInTheDocument();
  });
});
