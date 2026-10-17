import { it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewRequestModal from '@/features/student/components/NewRequestModal';

it('keeps selection while searching and validates its fields on the details step', async () => {
  const user = userEvent.setup(), submit = vi.fn(event => event.preventDefault());
  render(<NewRequestModal user={{ full_name: 'Synthetic Student', student_id: 'TEST-9', user_type: 'student', year_started: 2021, last_attendance_year: 2025 }} setActiveModal={vi.fn()} documentTypes={['Graduation Clearance', 'Transcript of Records'].map((name, id) => ({ id, name, base_fee: 100, available_to: 'both' }))} selections={{ 'Graduation Clearance': { copies: 1, purpose: '' } }} toggleDocumentType={vi.fn()} updateSelection={vi.fn()} handleStudentSubmitRequest={submit} actionLoading={false} />);
  await user.type(screen.getByRole('searchbox', { name: 'Search documents' }), 'Transcript');
  await user.click(screen.getByRole('button',{name:'Next'}));
  expect(screen.getByLabelText('Purpose', { exact: true })).toBeVisible();
  expect(screen.getByLabelText('Purpose', { exact: true })).toBeRequired();
  await user.click(screen.getByRole('button', { name: 'Next' }));
  expect(submit).not.toHaveBeenCalled();
});
