import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import useLiveTracking from '@/hooks/useLiveTracking';
import api from '@/services/api';

vi.mock('@/services/api', () => ({ default: { get: vi.fn() } }));
const a = { id: 7, current_status: 'SEC_PROCESSING', tracking_number: 'SYNTHETIC-A' };
const b = { id: 8, current_status: 'SEC_PROCESSING', tracking_number: 'SYNTHETIC-B' };
beforeEach(() => vi.clearAllMocks());

it('reads authorized history only while selected and ignores an obsolete case response', async () => {
  let finish;
  api.get.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
    .mockResolvedValueOnce({ data: { document: b, step_logs: [{ to_status: b.current_status }] } });
  const { result, rerender } = renderHook(selected => useLiveTracking(selected), { initialProps: null });
  expect(api.get).not.toHaveBeenCalled();
  rerender(a);
  expect(api.get).toHaveBeenCalledWith('/documents/7/detail', { signal: expect.any(AbortSignal), timeout: 15000 });
  const signal = api.get.mock.calls[0][1].signal;
  rerender(b);
  expect(signal.aborted).toBe(true);
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => finish({ data: { document: a, step_logs: [] } }));
  expect(result.current.document.id).toBe(8);
  rerender(null);
  expect(result.current.document).toBeNull();
});

it('refreshes the recorded status and keeps the last snapshot with a retry message after an outage', async () => {
  api.get.mockResolvedValueOnce({ data: { document: { ...a, current_status: 'COMPLETED' }, step_logs: [] } })
    .mockRejectedValueOnce(new Error('Offline'));
  const { result } = renderHook(() => useLiveTracking(a));
  await waitFor(() => expect(result.current.document.current_status).toBe('COMPLETED'));
  act(() => result.current.refresh());
  await waitFor(() => expect(result.current.error).toContain('Could not refresh'));
  expect(result.current.document.current_status).toBe('COMPLETED');
  expect(result.current.loading).toBe(false);
});

it('rejects a detail response for another document instead of displaying its status or dates', async () => {
  api.get.mockResolvedValue({ data: { document: { ...b, current_status: 'COMPLETED' }, step_logs: [{ to_status: 'COMPLETED' }] } });
  const { result } = renderHook(() => useLiveTracking(a));
  await waitFor(() => expect(result.current.error).toContain('Could not refresh'));
  expect(result.current.document).toEqual(a);
});

it('checks saved history again on reopening the same case', async () => {
  api.get.mockResolvedValueOnce({ data: { document: a, step_logs: [] } })
    .mockImplementationOnce(() => new Promise(() => {}));
  const { result, rerender } = renderHook(selected => useLiveTracking(selected), { initialProps: a });
  await waitFor(() => expect(result.current.loading).toBe(false));
  rerender(null);
  rerender(a);
  expect(api.get).toHaveBeenCalledTimes(2);
  expect(result.current.loading).toBe(true);
});

it.each([403, 404])('discards the request and history when refresh returns %s', async status => {
  api.get.mockResolvedValueOnce({ data: { document: a, step_logs: [{ to_status: a.current_status }] } })
    .mockRejectedValueOnce({ response: { status } });
  const { result } = renderHook(() => useLiveTracking(a));
  await waitFor(() => expect(result.current.document.step_logs).toHaveLength(1));
  act(() => result.current.refresh());
  await waitFor(() => expect(result.current.document).toBeNull());
  expect(result.current.error).toContain('no longer available');
});
