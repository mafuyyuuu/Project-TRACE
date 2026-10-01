import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/services/authService', () => ({ updateProfile: vi.fn() }));

import { updateProfile } from '@/services/authService';
import ForcePasswordChange from '@/components/ForcePasswordChange';

const USER = { id: 21, full_name: 'New Clerk', role: 'clerk' };

beforeEach(() => {
  vi.clearAllMocks();
  updateProfile.mockResolvedValue({ message: 'Password changed.', token: 'replacement-token', user: { ...USER, must_change_password: false } });
});

const setup = () => {
  const onChanged = vi.fn();
  const onLogout = vi.fn();
  render(<ForcePasswordChange user={USER} onChanged={onChanged} onLogout={onLogout} />);
  fireEvent.change(screen.getByLabelText('Current temporary password'), { target: { value: 'temporary-password' } });
  return { onChanged, onLogout, user: userEvent.setup() };
};

describe('ForcePasswordChange', () => {
  it('explains why the change is required', () => {
    setup();
    expect(screen.getByText(/temporary password set by an administrator/i)).toBeInTheDocument();
    expect(screen.getByText(/New Clerk/)).toBeInTheDocument();
  });

  it('offers no way to dismiss or skip — only set a password or sign out', () => {
    setup();
    expect(screen.queryByRole('button', { name: /cancel|skip|later|close/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign out instead/i })).toBeInTheDocument();
  });

  it('does not submit a password shorter than the minimum', async () => {
    const { user, onChanged } = setup();
    await user.type(screen.getByLabelText('New Password'), 'short');
    await user.type(screen.getByLabelText('Confirm Password'), 'short');
    await user.click(screen.getByRole('button', { name: /set password/i }));

    // Native `minLength` blocks the submit first; the hook's own length check is
    // the backstop behind it. Either way nothing reaches the server.
    expect(updateProfile).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('states the length requirement up front', () => {
    setup();
    expect(screen.getByText(/At least 8 characters/i)).toBeInTheDocument();
  });

  it('rejects mismatched confirmation', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText('New Password'), 'Goodpassword1!');
    await user.type(screen.getByLabelText('Confirm Password'), 'a-different-one');
    await user.click(screen.getByRole('button', { name: /set password/i }));

    expect(await screen.findByText(/do not match/i)).toBeInTheDocument();
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('submits the new password and signals completion', async () => {
    const { user, onChanged } = setup();
    await user.type(screen.getByLabelText('New Password'), 'Goodpassword1!');
    await user.type(screen.getByLabelText('Confirm Password'), 'Goodpassword1!');
    await user.click(screen.getByRole('button', { name: /set password/i }));
    expect(updateProfile).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Change Password' }));

    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith({ password: 'Goodpassword1!', current_password: 'temporary-password' }));
    expect(onChanged).toHaveBeenCalled();
    expect(localStorage.getItem('trace_token')).toBe('replacement-token');
  });

  it('keeps the user here when the server rejects the change', async () => {
    updateProfile.mockRejectedValue({ response: { data: { error: 'Password too weak.' } } });
    const { user, onChanged } = setup();

    await user.type(screen.getByLabelText('New Password'), 'Goodpassword1!');
    await user.type(screen.getByLabelText('Confirm Password'), 'Goodpassword1!');
    await user.click(screen.getByRole('button', { name: /set password/i }));
    expect(updateProfile).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Change Password' }));

    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Confirm Password Change' })).toHaveTextContent('Password too weak.'));
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('confirms before signing out instead', async () => {
    const { user, onLogout } = setup();
    await user.click(screen.getByRole('button', { name: /sign out instead/i }));
    expect(onLogout).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Log Out' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Log Out' }));
    expect(onLogout).toHaveBeenCalled();
  });

  it('can cancel signing out and continue choosing a password', async () => {
    const { user, onLogout } = setup();
    await user.click(screen.getByRole('button', { name: /sign out instead/i }));
    await user.click(screen.getByRole('button', { name: 'Stay Signed In' }));
    expect(onLogout).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('New Password')).toBeInTheDocument();
  });
});
