import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DocumentChat from '@/components/DocumentChat';
import api from '@/services/api';

vi.mock('@/services/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue({ data: [] });
  api.post.mockResolvedValue({ data: {} });
  Element.prototype.scrollIntoView = vi.fn();
});

describe('Document message confirmation', () => {
  it('preserves an unsent message on Escape and sends the reviewed text once on confirmation', async () => {
    const user = userEvent.setup();
    render(<DocumentChat documentId={11} user={{ id: 3, full_name: 'Ana Reyes' }} />);
    const input = await screen.findByPlaceholderText('Type a message...');
    await user.type(input, 'Please check the receipt.');
    await user.keyboard('{Enter}');
    expect(api.post).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    expect(input).toHaveValue('Please check the receipt.');
    input.focus();
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: 'Send Message' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledExactlyOnceWith('/documents/11/messages', { message: 'Please check the receipt.' }));
    expect(input).toHaveValue('');
  });

  it('keeps the failed message available for correction or retry', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue({ response: { data: { error: 'Messaging unavailable.' } } });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<DocumentChat documentId={11} user={{ id: 3, full_name: 'Ana Reyes' }} />);
    const input = await screen.findByPlaceholderText('Type a message...');
    await user.type(input, 'My draft{Enter}');
    await user.click(screen.getByRole('button', { name: 'Send Message' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Messaging unavailable.');
    await user.click(within(screen.getByRole('dialog', { name: 'Confirm Message' })).getByRole('button', { name: 'Cancel' }));
    expect(input).toHaveValue('My draft');
    log.mockRestore();
  });
});
