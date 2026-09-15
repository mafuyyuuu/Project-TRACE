import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/services/api', () => ({
  default: { get: vi.fn(() => new Promise(() => {})) },
}));

import ProfileSettingsModal from '@/components/ProfileSettingsModal';

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
  it('presents the account as a profile card', () => {
    renderModal();
    expect(screen.getByText('Ana Reyes')).toBeInTheDocument();
    expect(screen.getByText('Student')).toBeInTheDocument();
    expect(screen.getByText('STU2024001')).toBeInTheDocument();
  });

  it('names the desk for a staff account', () => {
    renderModal({ user: CLERK });
    expect(screen.getByText('Finance Clerk')).toBeInTheDocument();
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
    expect(screen.getByText(/click save settings to apply/i)).toBeInTheDocument();
  });

  it('disables the save button while saving', () => {
    renderModal({ saving: true });
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
  });

  it('closes on the close control', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByLabelText('Close settings'));
    expect(onClose).toHaveBeenCalled();
  });
});
