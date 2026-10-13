import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { vi, beforeEach, it, expect } from 'vitest';
import AcademicProfileFields from '@/components/AcademicProfileFields';
import useProfileSettings from '@/hooks/useProfileSettings';
import { getColleges, getPrograms } from '@/services/referenceService';
vi.mock('@/services/referenceService', () => ({ getColleges: vi.fn(), getPrograms: vi.fn() }));
vi.mock('@/services/authService', () => ({ updateProfile: vi.fn(), uploadProfilePicture: vi.fn(), getMe: vi.fn() }));
vi.mock('@/services/emailVerificationService', () => ({ resendVerification: vi.fn() }));
const user = { role: 'student', college_id: 1, course: 'College A', program: 'Program A' };
function Lab({ account = user }) {
  const profile = useProfileSettings(account);
  return <AcademicProfileFields user={account} profileData={profile.profileData} setField={profile.setField} busy={profile.saving} />;
}
beforeEach(() => {
  getColleges.mockResolvedValue({ colleges: [{ id: 1, name: 'College A' }, { id: 2, name: 'College B' }] });
  getPrograms.mockResolvedValue({ programs: [{ id: 1, college_id: 1, name: 'Program A' }, { id: 2, college_id: 2, name: 'Program B' }] });
});
it('loads saved selections and filters programs when College changes, clearing the old program', async () => {
  render(<Lab />);
  await waitFor(() => expect(screen.getByLabelText('College')).toBeEnabled());
  const college = screen.getByLabelText('College'), program = screen.getByLabelText('Program/Course');
  expect(college).toHaveValue('1'); expect(program).toHaveValue('Program A');
  expect(within(program).queryByRole('option', { name: 'Program B' })).not.toBeInTheDocument();
  fireEvent.change(college, { target: { value: '2' } });
  expect(program).toHaveValue(''); expect(program).toBeRequired();
  expect(within(program).queryByRole('option', { name: 'Program A' })).not.toBeInTheDocument();
  fireEvent.change(program, { target: { value: 'Program B' } });
  expect(program).toHaveValue('Program B');
});
it('preserves a historical unmatched program and explains an empty catalog', async () => {
  getPrograms.mockResolvedValue({ programs: [] });
  render(<Lab />);
  await screen.findByText(/No active programs/);
  expect(screen.getByLabelText('Program/Course')).toHaveValue('Program A');
  expect(screen.getByText(/Your recorded academic details stay saved/)).toBeInTheDocument();
  expect(screen.getByLabelText('Program/Course')).not.toBeRequired();
});
it('preserves drafts during load failure and provides a usable retry', async () => {
  getPrograms.mockRejectedValueOnce(new Error('offline'));
  const submit = vi.fn(event => event.preventDefault());
  render(<form onSubmit={submit}><Lab /></form>);
  expect(await screen.findByRole('alert')).toHaveTextContent('could not be loaded');
  expect(screen.getByLabelText('Program/Course')).toHaveValue('Program A');
  fireEvent.click(screen.getByRole('button', { name: 'Retry Choices' }));
  expect(submit).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.getByLabelText('College')).toBeEnabled());
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
it('cancels stale catalog loading on unmount', async () => {
  let resolve;
  getPrograms.mockReturnValue(new Promise(done => { resolve = done; }));
  const view = render(<Lab />);
  const options = getPrograms.mock.calls.at(-1)[0];
  view.unmount(); expect(options.signal.aborted).toBe(true);
  await act(async () => resolve({ programs: [] }));
});
