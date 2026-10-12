import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import AddUserModal from '@/features/admin/components/AddUserModal';
import UserEditModal from '@/features/admin/components/UserEditModal';
import AccountVerificationModal from '@/features/admin/components/AccountVerificationModal';

it('displays the saved program separately from the college in Admin review', () => {
  render(<AccountVerificationModal studentVerifyToConfirm={{ student: {
    full_name: 'Synthetic Student', student_id: 'SYN001', program: 'BS Computer Science', course: 'College A',
  } }} cancelAdminVerifyStudent={vi.fn()} confirmAdminVerifyStudent={vi.fn()} />);
  expect(screen.getByText('Course/Program').parentElement).toHaveTextContent('BS Computer Science');
  expect(screen.getByText('College').parentElement).toHaveTextContent('College A');
});
it('does not substitute the college when a historical program is missing', () => {
  render(<AccountVerificationModal studentVerifyToConfirm={{ student: { full_name: 'Synthetic Student', course: 'College A' } }} />);
  expect(screen.getByText('Course/Program').parentElement).toHaveTextContent('Not entered');
});
it.each([['Trace_2026', true], ['temporary123_', false]])('checks Admin creation before confirmation: %s', (password, allowed) => {
  const create = vi.fn();
  render(<AddUserModal open onClose={vi.fn()} onCreate={create} />);
  for (const [placeholder, value] of [['Employee ID *', 'SYNCLERK'], ['Full Name *', 'Synthetic Clerk'], ['Temporary password *', password]]) {
    fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } });
  }
  fireEvent.submit(document.getElementById('add-user-form'));
  expect(Boolean(screen.queryByRole('dialog', { name: 'Confirm Staff Account' }))).toBe(allowed);
  if (!allowed) expect(screen.getByRole('alert')).toHaveTextContent('@$!%*?&_');
  expect(create).not.toHaveBeenCalled();
});
it.each([['Trace_2026', true], ['temporary123_', false]])('checks Admin reset before confirmation: %s', (password, allowed) => {
  const save = vi.fn();
  render(<UserEditModal open user={{ id: 4, role: 'clerk', full_name: 'Synthetic Clerk' }} onClose={vi.fn()} onSave={save} />);
  fireEvent.click(screen.getByRole('button', { name: 'Account Settings' }));
  for (const input of document.querySelectorAll('input[type="password"]')) fireEvent.change(input, { target: { value: password } });
  fireEvent.submit(document.getElementById('edit-user-form'));
  expect(Boolean(screen.queryByRole('dialog', { name: 'Confirm User Changes' }))).toBe(allowed);
  if (!allowed) expect(screen.getByRole('alert')).toHaveTextContent('@$!%*?&_');
  expect(save).not.toHaveBeenCalled();
});
