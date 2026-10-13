import { beforeEach, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import useStudyYearsCorrection from '@/features/admin/useStudyYearsCorrection';
import { lookupStudent, correctStudyYears } from '@/services/authService';
vi.mock('@/services/authService', () => ({ lookupStudent: vi.fn(), correctStudyYears: vi.fn() }));
const target = { id: 3, student_id: 'QA-003' };
beforeEach(() => {
  vi.clearAllMocks();
  lookupStudent.mockResolvedValue({ student: { ...target, user_type: 'alumni', year_started: 2020, graduation_year: 2024 } });
  correctStudyYears.mockResolvedValue({ message: 'Saved' });
});
it('loads authoritative years, snapshots corrections, and preserves the draft on cancellation and failure', async () => {
  const saved = vi.fn();
  const { result } = renderHook(() => useStudyYearsCorrection(target, saved));
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => result.current.setDraft({ year_started: '2019', graduation_year: '2024', reason: 'Checked Registrar record' }));
  act(() => result.current.stage({ preventDefault: vi.fn() }));
  expect(correctStudyYears).not.toHaveBeenCalled();
  act(() => result.current.cancel());
  expect(result.current.draft.year_started).toBe('2019');
  act(() => result.current.stage({ preventDefault: vi.fn() }));
  correctStudyYears.mockRejectedValueOnce({ response: { data: { error: 'Audit unavailable' } } });
  await act(() => result.current.confirm());
  expect(saved).not.toHaveBeenCalled(); expect(result.current.staged).not.toBeNull(); expect(result.current.error).toBe('Audit unavailable');
  await act(() => result.current.confirm());
  expect(correctStudyYears).toHaveBeenLastCalledWith(3, { year_started: '2019', graduation_year: '2024', reason: 'Checked Registrar record' });
  expect(saved).toHaveBeenCalledOnce(); expect(result.current.staged).toBeNull();
});
it('rejects an overlong study interval before staging a correction', async () => {
  const { result } = renderHook(() => useStudyYearsCorrection(target, vi.fn()));
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => result.current.setDraft({ year_started: '2010', graduation_year: '2024', reason: 'Checked record' }));
  act(() => result.current.stage({ preventDefault: vi.fn() }));
  expect(result.current.error).toContain('10 years'); expect(result.current.staged).toBeNull(); expect(correctStudyYears).not.toHaveBeenCalled();
});
