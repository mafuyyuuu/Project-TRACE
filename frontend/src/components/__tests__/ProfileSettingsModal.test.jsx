import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('@/services/api', () => ({
  default: { get: vi.fn(() => new Promise(() => {})), post: vi.fn() },
}));

import ProfileSettingsModal from '@/components/ProfileSettingsModal';
import api from '@/services/api';
import { getAuthenticator } from '@/services/authenticatorService';
vi.mock('@/services/authenticatorService', () => ({ getAuthenticator: vi.fn(), beginAuthenticator: vi.fn(), updateAuthenticator: vi.fn() }));

const STUDENT = {
  id: 3,
  student_id: 'STU2024001',
  full_name: 'Ana Reyes',
  role: 'student',
};

const CLERK = {
  id: 9,
  student_id: 'FINANCE001',
  full_name: 'Mia Cruz',
  role: 'clerk',
  desk_assignment: 'Finance',
};

const baseProps = {
  user: STUDENT,
  onClose: vi.fn(),
  profileData: { phone_number: '+639171234567', email: 'ana@plp.edu.ph', password: '' },
  setField: vi.fn(),
  avatarPath: null,
  avatarPreviewUrl: null,
  saving: false,
  success: '',
  error: '',
  onSave: vi.fn(),
  onAvatarChange: vi.fn(),
};

const renderModal = (overrides = {}) => render(<ProfileSettingsModal {...baseProps} {...overrides} />);

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  getAuthenticator.mockResolvedValue({ enabled: false, available: true });
});

describe('ProfileSettingsModal', () => {
  it.each([['Trace_2026', true], ['weak_pass', false]])('checks replacement password before opening Save confirmation: %s', (password, allowed) => {
    renderModal({ initialTab: 'security', profileData: { ...baseProps.profileData, password } });
    fireEvent.submit(document.getElementById('profile-settings-form'));
    expect(Boolean(screen.queryByRole('dialog', { name: 'Confirm Profile Save' }))).toBe(allowed);
    if (!allowed) expect(screen.getAllByRole('alert').some(node => node.textContent.includes('@$!%*?&_'))).toBe(true);
    expect(baseProps.onSave).not.toHaveBeenCalled();
  });
  it.each([STUDENT, CLERK, { ...CLERK, role: 'admin' }])('offers link verification beside the profile email for $role without saving other fields', async account => {
    const onVerifyEmail = vi.fn().mockResolvedValue(true);
    renderModal({ user: { ...account, email: baseProps.profileData.email, email_verified_at: null }, onVerifyEmail });
    expect(screen.getByLabelText(/Email Address/)).toHaveValue(baseProps.profileData.email);
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
    await waitFor(() => expect(onVerifyEmail).toHaveBeenCalledWith({ email: baseProps.profileData.email, current_password: undefined }));
    expect(baseProps.onSave).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Verify Email Address' })).not.toBeInTheDocument();
  });
  it('requires the password and confirms only the changed email before sending its link', async () => {
    const onVerifyEmail = vi.fn().mockResolvedValue(true);
    const { rerender } = renderModal({ user: { ...STUDENT, email: 'old@example.test', email_verified_at: '2026-10-01' }, onVerifyEmail });
    expect(screen.getByRole('button', { name: 'Verify' })).toBeDisabled();
    rerender(<ProfileSettingsModal {...baseProps} user={{ ...STUDENT, email: 'old@example.test' }} onVerifyEmail={onVerifyEmail}
      profileData={{ ...baseProps.profileData, current_password: 'synthetic' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
    const confirm = screen.getByRole('dialog', { name: 'Verify Email Address' });
    expect(confirm).toHaveTextContent(baseProps.profileData.email);
    expect(onVerifyEmail).not.toHaveBeenCalled();
    fireEvent.click(within(confirm).getByRole('button', { name: 'Send Verification Link' }));
    await waitFor(() => expect(onVerifyEmail).toHaveBeenCalledExactlyOnceWith({ email: baseProps.profileData.email, current_password: 'synthetic' }));
    expect(baseProps.onSave).not.toHaveBeenCalled();
  });
  it('does not send a link for an invalid address', () => {
    const onVerifyEmail = vi.fn();
    renderModal({ user: { ...STUDENT, email: 'bad' }, profileData: { ...baseProps.profileData, email: 'bad' }, onVerifyEmail });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
    expect(onVerifyEmail).not.toHaveBeenCalled();
  });
  it.each([CLERK, { ...CLERK, role: 'admin' }])('lets staff forget personal-browser preference after confirmation: $role', async user => {
    localStorage.setItem('trace_clerk_browser_until', String(Date.now() + 60000));
    renderModal({ user, initialTab: 'security' });
    fireEvent.click(screen.getByRole('button', { name: 'Use shared-computer verification' }));
    expect(localStorage.getItem('trace_clerk_browser_until')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Use Shared Verification' }));
    await waitFor(() => expect(localStorage.getItem('trace_clerk_browser_until')).toBeNull());
    expect(screen.getByText(/Shared-computer verification is the default/)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });
  it.each([STUDENT])('does not offer staff browser settings to $role', user => {
    renderModal({ user, initialTab: 'security' });
    expect(screen.queryByRole('region', { name: 'Browser verification' })).not.toBeInTheDocument();
  });
  it('shows and hides both password fields in Security without saving', () => {
    renderModal({ initialTab: 'security', profileData: { ...baseProps.profileData, current_password: 'current', password: 'Newpassword1!' } });
    expect(screen.getByLabelText('Current Password')).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByRole('button', { name: 'Show passwords' }));
    expect(screen.getByLabelText('Current Password')).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('New Password')).toHaveAttribute('type', 'text');
    expect(baseProps.onSave).not.toHaveBeenCalled();
  });
  it.each([
    { ...STUDENT, user_type: 'student' }, { ...STUDENT, user_type: 'alumni' },
    { ...CLERK, role: 'admin' }, { ...CLERK, desk_assignment: 'Window 1' },
    CLERK, { ...CLERK, desk_assignment: 'Secretary' },
  ])('shows working authenticator setup in Security for $role/$user_type/$desk_assignment', async user => {
    renderModal({ user, initialTab: 'security' });
    expect(await screen.findByRole('button', { name: 'Set up authenticator app' })).toBeInTheDocument();
  });
  it('uses the avatar camera as the sole photo picker and stages without saving', () => {
    const onSave = vi.fn();
    const onAvatarChange = vi.fn();
    renderModal({ onSave, onAvatarChange });
    const input = screen.getByLabelText('Profile picture');
    const openPicker = vi.spyOn(input, 'click');
    fireEvent.click(screen.getByRole('button', { name: 'Change profile picture' }));
    expect(openPicker).toHaveBeenCalledOnce();
    expect(input).not.toBeVisible();
    expect(screen.queryByRole('region', { name: 'Profile picture' })).not.toBeInTheDocument();
    const file = new File(['x'], 'avatar.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(onAvatarChange).toHaveBeenCalledWith(file);
    expect(onSave).not.toHaveBeenCalled();
  });
  it.each([
    STUDENT, { ...STUDENT, user_type: 'alumni' }, { ...CLERK, role: 'admin' },
    { ...CLERK, desk_assignment: 'Window 1' }, CLERK, { ...CLERK, desk_assignment: 'Secretary' },
  ])('keeps Preferences dedicated to appearance for $role/$user_type/$desk_assignment', (user) => {
    const toggle = vi.fn();
    renderModal({ user, initialTab: 'appearance', onToggleTheme: toggle });
    expect(screen.getByRole('dialog', { name: 'Preferences' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save Profile' })).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('ana@plp.edu.ph')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Dark Mode' }));
    expect(toggle).toHaveBeenCalledOnce();
  });

  it('surfaces the saved registration proof without a replacement control', () => {
    renderModal({ user: { ...STUDENT, user_type: 'alumni', id_proof_path: '/uploads/id.png' } });
    const proof = screen.getByRole('region', { name: 'Registration identity / diploma proof' });
    expect(proof).toHaveTextContent('Uploaded: id.png');
    expect(proof.querySelector('input[type=file]')).toBeNull();
  });
  it('keeps Settings open on confirmation cancellation and saves only after confirmation', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    renderModal({ onSave, user: CLERK });
    const save = screen.getByRole('button', { name: 'Save Profile' });
    fireEvent.click(save);
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByDisplayValue('ana@plp.edu.ph')).toBeInTheDocument();
    fireEvent.click(save);
    const confirmation = screen.getByRole('dialog', { name: 'Confirm Profile Save' });
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Save Profile' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Confirm Profile Save' })).not.toBeInTheDocument());
  });
  it('presents the account as a profile card', () => {
    renderModal();
    expect(screen.getByText('Ana Reyes')).toBeInTheDocument();
    expect(screen.getByText(/Student/i)).toBeInTheDocument();
    expect(screen.getByText(/STU2024001/i)).toBeInTheDocument();
  });

  it('names the desk for a staff account', () => {
    renderModal({ user: CLERK });
    expect(screen.getByText(/Finance Clerk/i)).toBeInTheDocument();
  });

  it('renders the editable contact fields', () => {
    renderModal();
    expect(screen.getByDisplayValue('+639171234567')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ana@plp.edu.ph')).toBeInTheDocument();
  });

  it('shows feedback inline rather than in a browser dialog', () => {
    renderModal({ success: 'Profile updated successfully.' });
    expect(screen.getByText('Profile updated successfully.')).toBeInTheDocument();
  });

  it('shows an error banner when one is supplied', () => {
    renderModal({ error: 'Email already in use.' });
    expect(screen.getByText('Email already in use.')).toBeInTheDocument();
  });

  it('hands the chosen file to the upload handler', () => {
    // ProfileSettingsModal now renders via ModalShell's portal to
    // document.body, so the input lives outside the RTL render container.
    const onAvatarChange = vi.fn();
    renderModal({ onAvatarChange });

    const input = document.querySelector('input[type="file"]');
    const file = new File(['x'], 'me.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    expect(onAvatarChange).toHaveBeenCalledWith(file);
  });

  it('only accepts the image types the server allows', () => {
    renderModal();
    expect(document.querySelector('input[type="file"]').accept).toBe('image/jpeg,image/png,image/webp');
  });

  it('disables the picture control while saving', () => {
    renderModal({ saving: true });
    expect(screen.getByLabelText('Change profile picture')).toBeDisabled();
  });

  it('shows a local preview of a staged, not-yet-uploaded picture', () => {
    renderModal({ avatarPreviewUrl: 'blob:staged-preview' });
    expect(screen.getByAltText('New profile picture preview')).toHaveAttribute('src', 'blob:staged-preview');
    
  });

  it('disables the save button while saving', () => {
    renderModal({ saving: true });
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
  });

  it('closes on the close control', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByLabelText('Close profile'));
    expect(onClose).toHaveBeenCalled();
  });

  it.each([
    ['success', 'Success', 'Logged out of all other devices.'],
    ['error', 'Attention Needed', 'Error logging out of other devices.'],
  ])('acknowledges session logout %s above settings and restores focus', async (outcome, title, message) => {
    api.get.mockResolvedValueOnce({ data: [] });
    if (outcome === 'success') api.post.mockResolvedValueOnce({ data: { token: 'replacement', user: STUDENT } });
    else api.post.mockRejectedValueOnce(new Error('Request failed'));
    const nativeAlert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByRole('button', { name: /^Security$/ }));
    const logout = screen.getByRole('button', { name: 'Logout All Devices' });
    logout.focus();
    fireEvent.click(logout);
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Log Out Other Devices' }));

    const feedback = await screen.findByRole('dialog', { name: title });
    expect(feedback).toHaveTextContent(message);
    expect(feedback.parentElement).toHaveClass('z-[110]');
    expect(api.post).toHaveBeenCalledWith('/auth/logout-all', { preserve_current: true }, { timeout: 15000 });
    expect(nativeAlert).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'OK' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(screen.queryByRole('dialog', { name: title })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Edit Profile' })).toBeInTheDocument();
    if (outcome === 'error') {
      expect(screen.getByRole('dialog', { name: 'Log Out Other Devices' })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    }
    expect(logout).toHaveFocus();
    expect(onClose).not.toHaveBeenCalled();
    nativeAlert.mockRestore();
  });
});
