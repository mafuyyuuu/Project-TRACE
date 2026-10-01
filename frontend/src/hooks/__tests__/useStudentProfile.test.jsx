import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import useStudentProfile from '@/hooks/useStudentProfile';
import { lookupStudent } from '@/services/authService';
vi.mock('@/services/authService', () => ({ lookupStudent: vi.fn() }));
beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.useRealTimers());

it('loads only while open and does not display another student after a late response', async () => {
  let finishFirst;
  lookupStudent.mockImplementationOnce(() => new Promise(resolve => { finishFirst = resolve; }))
    .mockResolvedValueOnce({ student: { student_id: 'B', full_name: 'Bea' } });
  const { result, rerender } = renderHook(({ open, id }) => useStudentProfile(open, id),
    { initialProps: { open: false, id: 'A' } });
  expect(lookupStudent).not.toHaveBeenCalled();
  rerender({ open: true, id: 'A' });
  expect(result.current.loading).toBe(true);
  const signal = lookupStudent.mock.calls[0][1].signal;
  rerender({ open: true, id: 'B' });
  expect(signal.aborted).toBe(true);
  await waitFor(() => expect(result.current.user?.full_name).toBe('Bea'));
  await act(async () => finishFirst({ student: { student_id: 'A', full_name: 'Ana' } }));
  expect(result.current.user.student_id).toBe('B');
});

it('reports authorization failures without exposing an old profile', async () => {
  lookupStudent.mockRejectedValue({ response: { data: { error: 'Not authorized.' } } });
  const { result } = renderHook(() => useStudentProfile(true, 'A'));
  await waitFor(() => expect(result.current.error).toBe('Not authorized.'));
  expect(result.current.user).toBeNull();
});

it('does not display a successful response for a different student', async () => {
  lookupStudent.mockResolvedValue({ student: { student_id: 'B', full_name: 'Wrong student' } });
  const { result } = renderHook(() => useStudentProfile(true, 'A'));
  await waitFor(() => expect(result.current.error).toContain('Could not load'));
  expect(result.current.user).toBeNull();
});

it('explains an unidentified record without leaving the dialog loading', () => {
  const { result } = renderHook(() => useStudentProfile(true, null));
  expect(result.current.loading).toBe(false);
  expect(result.current.error).toContain('no student ID');
  expect(lookupStudent).not.toHaveBeenCalled();
});

it('rejects an empty successful response and retries the same student', async () => {
  lookupStudent.mockResolvedValueOnce({}).mockResolvedValueOnce({ student: { student_id: 'A', full_name: 'Ana' } });
  const { result } = renderHook(() => useStudentProfile(true, 'A'));
  await waitFor(() => expect(result.current.error).toContain('Could not load'));
  expect(result.current.loading).toBe(false);
  act(() => result.current.retry());
  await waitFor(() => expect(result.current.user?.full_name).toBe('Ana'));
  expect(lookupStudent).toHaveBeenCalledTimes(2);
});

it('aborts a stalled lookup, reports a deadline and ignores a late response', async () => {
  vi.useFakeTimers();
  let resolve;
  lookupStudent.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  const { result } = renderHook(() => useStudentProfile(true, 'A'));
  const options = lookupStudent.mock.calls[0][1];
  expect(options.timeout).toBe(15000);
  await act(async () => vi.advanceTimersByTime(15000));
  expect(options.signal.aborted).toBe(true);
  expect(result.current.loading).toBe(false);
  expect(result.current.error).toContain('timed out');
  await act(async () => resolve({ student: { student_id: 'A', full_name: 'Late' } }));
  expect(result.current.user).toBeNull();
});
