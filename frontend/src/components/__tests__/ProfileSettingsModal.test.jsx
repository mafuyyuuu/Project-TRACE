import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { useState } from 'react';

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

const completeProfile = {
  ...baseProps.profileData, birth_date: '2000-01-01', place_of_birth: 'City', sex: 'Male',
  civil_status: 'Single', home_address: 'Address', maiden_name: '', extension_name: '',
  elem_school: 'Elementary', elem_grad_year: '2012', jhs_school: 'Junior High', jhs_grad_year: '2016',
  shs_school: 'Senior High', shs_grad_year: '2018', is_transfer_student: false, previous_school: '', last_attendance_year: '',
};

function DraftProfile({ draft, user = STUDENT, ...props }) {
  const [profileData, setProfileData] = useState(draft);
  return <ProfileSettingsModal {...baseProps} {...props} user={{ ...user, email: completeProfile.email }}
    profileData={profileData} setField={(field, value) => setProfileData(current => ({ ...current, [field]: value }))} />;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  getAuthenticator.mockResolvedValue({ enabled: false, available: true });
});

describe('ProfileSettingsModal', () => {
  it.each(['student', 'alumni'])('uses Title Case captions while retaining labelled required fields for %s', user_type => {
    render(<DraftProfile user={{ ...STUDENT, user_type }} draft={completeProfile} />);
    expect(screen.getByText('Profile Completion')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: user_type === 'alumni' ? 'Registration Identity / Diploma Proof' : 'Registration ID Proof' })).toBeInTheDocument();
    for (const label of ['Phone Number', 'Email Address', 'Birth Date', 'Place of Birth', 'Sex', 'Civil Status', 'Home Address']) {
      expect(screen.getByLabelText(`${label} *`)).toBeRequired();
    }
    fireEvent.click(screen.getByRole('button', { name: /Educational Background/ }));
    for (const name of ['Elementary', 'Junior High School', 'Senior High School']) {
      expect(screen.getByRole('heading', { name, level: 4 })).toBeInTheDocument();
    }
    for (const label of ['Elementary School', 'Elementary Year Graduated', 'Junior High School', 'Junior High Year Graduated', 'Senior High School', 'Senior High Year Graduated']) {
      expect(screen.getByLabelText(`${label} *`)).toBeRequired();
    }
    if (user_type === 'alumni') expect(screen.getByLabelText('PLP/College Year Graduated *')).toBeRequired();
    expect(baseProps.onSave).not.toHaveBeenCalled();
  });

  it('uses Title Case for the changed-email password label with its input association intact', () => {
    renderModal({ user: { ...STUDENT, email: 'old@example.test' }, profileData: completeProfile });
    expect(screen.getByLabelText('Current Password to Change Email')).toHaveAttribute('autoComplete', 'current-password');
    expect(baseProps.onSave).not.toHaveBeenCalled();
  });

  it('shows only the rendered tab\'s associated field warnings while keeping accessible tab indicators', () => {
    render(<DraftProfile draft={{ ...completeProfile, birth_date: '', elem_school: '' }} />);
    expect(screen.queryByText(/Still needed:/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Birth Date/)).toHaveAccessibleDescription('Required: Birth Date.');
    expect(screen.queryByText('Required: Elementary School.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Personal Info.*Required information missing/ })).toHaveAttribute('aria-pressed', 'true');
    const education = screen.getByRole('button', { name: /Educational Background.*Required information missing/ });
    fireEvent.click(education);
    expect(education).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText(/Elementary School/)).toHaveAccessibleDescription('Required: Elementary School.');
    expect(screen.queryByText('Required: Birth Date.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Security$/ }));
    expect(screen.queryByText(/^Required:/)).not.toBeInTheDocument();
  });

  it('updates warnings, tab indicators and completion from edits without a save', () => {
    render(<DraftProfile draft={{ ...completeProfile, birth_date: '', elem_school: '' }} />);
    const birth = screen.getByLabelText(/Birth Date/);
    fireEvent.change(birth, { target: { value: '2000-01-01' } });
    expect(birth).not.toHaveAttribute('aria-describedby');
    expect(screen.getByRole('button', { name: /^Personal Info$/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Educational Background/ }));
    const school = screen.getByLabelText(/Elementary School/);
    fireEvent.change(school, { target: { value: 'Completed School' } });
    expect(screen.getByRole('button', { name: /^Educational Background$/ })).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.queryByText(/^Required:/)).not.toBeInTheDocument();
    fireEvent.change(school, { target: { value: '  ' } });
    expect(school).toHaveAccessibleDescription('Required: Elementary School.');
    expect(screen.getByRole('button', { name: /Educational Background.*Required information missing/ })).toBeInTheDocument();
    expect(baseProps.onSave).not.toHaveBeenCalled();
  });

  it('keeps conditional alumni, maiden-name and transfer-school warnings in their owning tabs', () => {
    render(<DraftProfile user={{ ...STUDENT, user_type: 'alumni' }}
      draft={{ ...completeProfile, sex: 'Female', civil_status: 'Married', is_transfer_student: true }} />);
    expect(screen.getByLabelText(/Maiden Name/)).toHaveAccessibleDescription('Required: Maiden Name.');
    expect(screen.queryByText('Required: Previous School.')).not.toBeInTheDocument();
    expect(screen.queryByText('PLP/College Year Graduated is required.')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Civil Status/), { target: { value: 'Single' } });
    expect(screen.queryByLabelText(/Maiden Name/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Personal Info$/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Educational Background/ }));
    expect(screen.getByLabelText(/^PLP\/College Year Graduated/)).toHaveAccessibleDescription(expect.stringContaining('PLP/College Year Graduated is required.'));
    expect(screen.getByLabelText(/Previous School/)).toHaveAccessibleDescription('Required: Previous School.');
    fireEvent.change(screen.getByLabelText('Transfer Student?'), { target: { value: 'no' } });
    expect(screen.queryByText('Required: Previous School.')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^PLP\/College Year Graduated/), { target: { value: '2024' } });
    expect(screen.getByRole('button', { name: /^Educational Background$/ })).toBeInTheDocument();
  });

  it('retains native required validation, partial-profile confirmation and server save feedback', async () => {
    const onSave = vi.fn().mockResolvedValue(false);
    render(<DraftProfile draft={{ ...completeProfile, birth_date: '', elem_school: '' }} onSave={onSave} error="Profile could not be saved." />);
    fireEvent.click(screen.getByRole('button', { name: 'Save Profile' }));
    expect(screen.queryByRole('dialog', { name: 'Confirm Profile Save' })).not.toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Birth Date/), { target: { value: '2000-01-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Profile' }));
    const confirmation = screen.getByRole('dialog', { name: 'Confirm Profile Save' });
    expect(confirmation).toHaveTextContent('Profile could not be saved.');
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Save Profile' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(confirmation).toBeInTheDocument();
  });

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
    const proof = screen.getByRole('region', { name: 'Registration Identity / Diploma Proof' });
    expect(proof).toHaveTextContent('Uploaded: id.png');
    expect(proof.querySelector('input[type=file]')).toBeNull();
  });
  it('opens the student saved proof with download and returns to Edit Profile on Escape', async () => {
    api.get.mockResolvedValueOnce({ data: new Blob(['SYNTHETIC TEST FILE'], { type: 'image/png' }) });
    renderModal({ user: { ...STUDENT, id_proof_path: '/uploads/proof-test.png' } });
    const preview = await screen.findByRole('button', { name: 'Preview Registration ID Proof' });
    preview.focus(); fireEvent.click(preview);
    expect(screen.getByRole('dialog', { name: 'Document preview' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Save Profile' })).toBeInTheDocument();
    expect(preview).toHaveFocus();
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

it('keeps attendance separate, college graduation optional for current students and school years required', () => {
  render(<DraftProfile user={{ ...STUDENT, user_type: 'student' }} draft={{ ...completeProfile, last_attendance_year: '1980', graduation_year: '' }} initialTab="educational" />);
  expect(screen.getByLabelText('Last Attendance Year')).toHaveValue('1980');
  expect(screen.getByLabelText('PLP/College Year Graduated')).not.toBeRequired();
  expect(screen.getByLabelText('PLP/College Year Graduated')).toHaveValue('');
  for (const label of ['Elementary', 'Junior High', 'Senior High']) {
    const input = screen.getByLabelText(`${label} Year Graduated *`);
    expect(input).toBeRequired(); expect(input).toHaveAttribute('inputmode', 'numeric');
  }
});
it.each(['-2020', '2020.5', '2e3', '2001', '9999', '202', '20265'])('rejects invalid alumni graduation before staging Save and keeps the draft: %s', value => {
  render(<DraftProfile user={{ ...STUDENT, user_type: 'alumni' }} draft={{ ...completeProfile, graduation_year: value }} initialTab="educational" />);
  const input = screen.getByLabelText('PLP/College Year Graduated *');
  fireEvent.click(screen.getByRole('button', { name: 'Save Profile' }));
  expect(input).toHaveValue(value);
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(input).toHaveAccessibleDescription(expect.stringContaining('PLP/College Year Graduated must'));
  expect(screen.queryByRole('dialog', { name: 'Confirm Profile Save' })).not.toBeInTheDocument();
  expect(baseProps.onSave).not.toHaveBeenCalled();
});
it('reveals and focuses the invalid education field when saving from Personal Info, then permits a corrected draft', () => {
  render(<DraftProfile draft={{ ...completeProfile, elem_grad_year: '-1980' }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Save Profile' }));
  const input = screen.getByLabelText('Elementary Year Graduated *');
  expect(input).toHaveFocus(); expect(input).toHaveValue('-1980');
  expect(screen.queryByRole('dialog', { name: 'Confirm Profile Save' })).not.toBeInTheDocument();
  fireEvent.change(input, { target: { value: '1980' } });
  expect(input).toHaveAttribute('aria-invalid', 'false');
  expect(screen.getByRole('button', { name: /^Educational Background$/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Save Profile' }));
  expect(screen.getByRole('dialog', { name: 'Confirm Profile Save' })).toBeInTheDocument();
});
