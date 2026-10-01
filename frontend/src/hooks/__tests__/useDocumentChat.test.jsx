import { act, renderHook, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import useDocumentChat, { useMessageThreads } from '@/hooks/useDocumentChat';
import * as service from '@/services/documentMessagesService';
import { onNotification } from '@/services/realtimeService';
vi.mock('@/services/documentMessagesService', () => ({ getRequestMessages: vi.fn(), sendRequestMessage: vi.fn(), getMessageThreads: vi.fn() }));
vi.mock('@/services/realtimeService', () => ({ onNotification: vi.fn(() => () => {}) }));
beforeEach(() => { vi.clearAllMocks(); service.getRequestMessages.mockResolvedValue([]); service.getMessageThreads.mockResolvedValue({ threads: [], total: 0 }); });
it('loads immediately after a StrictMode remount instead of waiting for the polling timer', async () => {
  const { result } = renderHook(() => useDocumentChat(11, { id: 3 }), { wrapper: StrictMode });
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(service.getRequestMessages).toHaveBeenCalledTimes(2);
  expect(service.getRequestMessages.mock.calls[0][1].aborted).toBe(true);
  expect(service.getRequestMessages.mock.calls[1][1].aborted).toBe(false);
});
it('loads incoming replies on notification and unsubscribes when closed', async () => {
  const cleanup = vi.fn(); onNotification.mockReturnValueOnce(cleanup);
  const { result, unmount } = renderHook(() => useDocumentChat(11, { id: 3 }));
  await waitFor(() => expect(result.current.loading).toBe(false));
  service.getRequestMessages.mockResolvedValueOnce([{ id: 4, sender_id: 9, message: 'Reply' }]);
  await act(async () => onNotification.mock.calls[0][0]());
  expect(result.current.messages[0].message).toBe('Reply');
  unmount(); expect(cleanup).toHaveBeenCalledOnce();
});
it('ignores a stale inbox page after navigation', async () => {
  let finish;
  service.getMessageThreads.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const { result, rerender } = renderHook(({ page }) => useMessageThreads(3, page), { initialProps: { page: 1 } });
  await waitFor(() => expect(service.getMessageThreads).toHaveBeenCalledOnce());
  rerender({ page: 2 });
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => finish({ threads: [{ id: 99 }], total: 1 }));
  expect(result.current.threads).toEqual([]);
});
it('keeps a server-accepted message when its refresh fails', async () => {
  const { result } = renderHook(() => useDocumentChat(11, { id: 3 }));
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => result.current.setInput('Hello'));
  service.sendRequestMessage.mockResolvedValueOnce({ id: 8, sender_id: 3, message: 'Hello' });
  service.getRequestMessages.mockRejectedValueOnce(new Error('Unavailable'));
  await act(async () => result.current.send());
  expect(result.current.input).toBe(''); expect(result.current.messages[0].id).toBe(8);
  expect(result.current.sendError).toBe(''); expect(result.current.notice).toBe('Message sent.');
});
