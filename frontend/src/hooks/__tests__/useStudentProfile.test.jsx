import { beforeEach, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import useStudentProfile from '@/hooks/useStudentProfile';
import { lookupStudent } from '@/services/authService';
vi.mock('@/services/authService', () => ({ lookupStudent: vi.fn() }));
beforeEach(() => vi.clearAllMocks());

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
