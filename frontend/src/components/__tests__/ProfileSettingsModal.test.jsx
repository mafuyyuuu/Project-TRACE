import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('@/services/api', () => ({
  default: { get: vi.fn(() => new Promise(() => {})), post: vi.fn() },
}));

import ProfileSettingsModal from '@/components/ProfileSettingsModal';
import api from '@/services/api';

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
});

describe('ProfileSettingsModal', () => {
  it('keeps Preferences dedicated to appearance rather than profile editing', () => {
    const toggle = vi.fn();
    renderModal({ initialTab: 'appearance', onToggleTheme: toggle });
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
    if (outcome === 'success') api.post.mockResolvedValueOnce({ data: {} });
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
    expect(api.post).toHaveBeenCalledWith('/auth/logout-all');
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
