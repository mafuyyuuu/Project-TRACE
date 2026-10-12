import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('@/services/authService', () => ({
  updateProfile: vi.fn(),
  uploadProfilePicture: vi.fn(),
  verifyEmailChange: vi.fn(), getMe: vi.fn(),
}));

import { updateProfile, uploadProfilePicture, verifyEmailChange, getMe } from '@/services/authService';
import useProfileSettings from '@/hooks/useProfileSettings';
import { resendVerification } from '@/services/emailVerificationService';
vi.mock('@/services/emailVerificationService', () => ({ resendVerification: vi.fn() }));

const USER = {
  id: 3,
  student_id: 'STU2024001',
  full_name: 'Ana Reyes',
  email: 'ana@plp.edu.ph',
  phone_number: '+639171234567',
  profile_picture: 'avatar-old.png',
};

beforeEach(() => {
  resendVerification.mockReset();
  getMe.mockReset().mockImplementation(async () => {
    const saved = updateProfile.mock.calls.at(-1)?.[0] || {};
    const cached = JSON.parse(localStorage.getItem('trace_user'));
    return { user: { ...cached, ...saved, email: saved.email === 'new@example.test' ? USER.email : (saved.email || USER.email), password: undefined, current_password: undefined } };
  });
  verifyEmailChange.mockReset();
  updateProfile.mockReset();
  uploadProfilePicture.mockReset();
  localStorage.setItem('trace_user', JSON.stringify(USER));
});

describe('useProfileSettings', () => {
  it('rejects an invalid replacement password before saving any staged photo or profile fields', async () => {
    const { result } = renderHook(() => useProfileSettings(USER));
    act(() => { result.current.setField('password', 'weak_pass'); result.current.changeAvatar(new File(['x'], 'draft.png')); });
    await act(async () => { expect(await result.current.saveProfile()).toBe(false); });
    expect(result.current.error).toContain('@$!%*?&_');
    expect(result.current.avatarFile).not.toBeNull();
    expect(updateProfile).not.toHaveBeenCalled();
    expect(uploadProfilePicture).not.toHaveBeenCalled();
  });
  it('sends the current email link without saving other drafts and blocks duplicate sends/saves', async () => {
    let resolve;
    resendVerification.mockReturnValue(new Promise(done => { resolve = done; }));
    const { result } = renderHook(() => useProfileSettings(USER));
    act(() => { result.current.setField('phone_number', 'unsaved'); result.current.changeAvatar(new File(['x'], 'draft.png')); });
    let first;
    act(() => { first = result.current.verifyEmail(); });
    await act(async () => {
      expect(await result.current.verifyEmail()).toBe(false);
      expect(await result.current.saveProfile()).toBe(false);
    });
    expect(resendVerification).toHaveBeenCalledExactlyOnceWith({});
    expect(result.current.verifyingEmail).toBe(true);
    await act(async () => { resolve({ email_sent: true, message: 'Link sent.' }); await first; });
    expect(result.current.verificationMessage).toBe('Link sent.');
    expect(result.current.profileData.phone_number).toBe('unsaved');
    expect(result.current.avatarFile).not.toBeNull();
    expect(updateProfile).not.toHaveBeenCalled();
    expect(uploadProfilePicture).not.toHaveBeenCalled();
  });
  it('stages a changed address until link confirmation, even after mail delivery fails', async () => {
    resendVerification.mockResolvedValue({ pending_email: 'new@example.test', email_sent: false, message: 'Delivery failed.' });
    const { result } = renderHook(() => useProfileSettings(USER));
    act(() => { result.current.setField('email', 'NEW@example.test'); result.current.setField('current_password', 'synthetic'); });
    await act(async () => expect(await result.current.verifyEmail()).toBe(false));
    expect(resendVerification).toHaveBeenCalledWith({ email: 'new@example.test', current_password: 'synthetic' });
    expect(result.current.verificationError).toBe('Delivery failed.');
    expect(result.current.pendingEmail).toBe('new@example.test');
    expect(JSON.parse(localStorage.getItem('trace_user'))).toMatchObject({ email: USER.email, pending_email: 'new@example.test' });
    expect(result.current.profileData.current_password).toBe('');
    expect(updateProfile).not.toHaveBeenCalled();
  });
  it('reopens a pending address and clears its notice when the server confirms verification', () => {
    const { result, rerender } = renderHook(({ user }) => useProfileSettings(user), { initialProps: { user: { ...USER, pending_email: 'new@example.test' } } });
    expect(result.current.profileData.email).toBe('new@example.test');
    rerender({ user: { ...USER, email: 'new@example.test', pending_email: null, email_verified_at: '2026-10-01' } });
    expect(result.current.pendingEmail).toBe('');
    expect(result.current.profileData.email).toBe('new@example.test');
  });
  it('does not resend a pending change or publish an unverified email during Profile Save', async () => {
    const user = { ...USER, pending_email: 'new@example.test' };
    updateProfile.mockResolvedValue({});
    getMe.mockResolvedValue({ user });
    const { result } = renderHook(() => useProfileSettings(user));
    await act(() => result.current.saveProfile());
    expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ email: USER.email }));
    expect(JSON.parse(localStorage.getItem('trace_user')).email).toBe(USER.email);
    expect(resendVerification).not.toHaveBeenCalled();
  });
  it('seeds the form from the signed-in account', () => {
    const { result } = renderHook(() => useProfileSettings(USER));
    expect(result.current.profileData).toMatchObject({
      phone_number: '+639171234567',
      email: 'ana@plp.edu.ph',
      password: '',
    });
    expect(result.current.avatarPath).toBe('avatar-old.png');
  });

  it('reports a successful save inline instead of through alert()', async () => {
    updateProfile.mockResolvedValue({ message: 'Profile updated successfully.' });
    const { result } = renderHook(() => useProfileSettings(USER));

    let saved;
    await act(async () => { saved = await result.current.saveProfile(); });
    expect(saved).toBe(true);

    await waitFor(() => expect(result.current.success).toBe('Profile updated successfully.'));
    expect(result.current.error).toBe('');
  });

  it('surfaces the server message when a save fails', async () => {
    updateProfile.mockRejectedValue({ response: { data: { error: 'Email already in use.' } } });
    const { result } = renderHook(() => useProfileSettings(USER));

    let saved;
    await act(async () => { saved = await result.current.saveProfile(); });
    expect(saved).toBe(false);

    await waitFor(() => expect(result.current.error).toBe('Email already in use.'));
    expect(result.current.success).toBe('');
  });

  // The password box is a write-only field; leaving the typed value behind
  // would re-submit it on the next save.
  it('clears the password box after a successful save', async () => {
    updateProfile.mockResolvedValue({ message: 'Profile updated successfully.' });
    const { result } = renderHook(() => useProfileSettings(USER));

    act(() => result.current.setField('password', 'Newpassword_2026'));
    await act(async () => result.current.saveProfile());

    await waitFor(() => expect(result.current.profileData.password).toBe(''));
  });

  it('stages a picked avatar as a local preview without uploading it', () => {
    const { result } = renderHook(() => useProfileSettings(USER));

    act(() => result.current.changeAvatar(new File(['x'], 'me.png')));

    expect(uploadProfilePicture).not.toHaveBeenCalled();
    expect(result.current.avatarPreviewUrl).toBeTruthy();
    expect(result.current.avatarPath).toBe('avatar-old.png');
  });

  it('uploads the staged avatar and adopts it on save', async () => {
    updateProfile.mockResolvedValue({ message: 'Profile updated successfully.' });
    uploadProfilePicture.mockResolvedValue({ profile_picture: 'avatar-new.png' });
    const { result } = renderHook(() => useProfileSettings(USER));

    act(() => result.current.changeAvatar(new File(['x'], 'me.png')));
    await act(async () => result.current.saveProfile());

    expect(uploadProfilePicture).toHaveBeenCalledWith(expect.any(File));
    await waitFor(() => expect(result.current.avatarPath).toBe('avatar-new.png'));
    expect(JSON.parse(localStorage.getItem('trace_user')).profile_picture).toBe('avatar-new.png');
    expect(result.current.avatarPreviewUrl).toBeNull();
  });

  it('reports a rejected upload, keeps the previous avatar, and keeps the staged file for a retry', async () => {
    updateProfile.mockResolvedValue({ message: 'Profile updated successfully.' });
    uploadProfilePicture.mockRejectedValue({
      response: { data: { error: 'Profile pictures must be a JPG, PNG, or WebP image.' } },
    });
    const { result } = renderHook(() => useProfileSettings(USER));

    act(() => result.current.changeAvatar(new File(['x'], 'me.gif')));
    await act(async () => result.current.saveProfile());

    await waitFor(() =>
      expect(result.current.error).toContain('Profile pictures must be a JPG, PNG, or WebP image.')
    );
    expect(result.current.avatarPath).toBe('avatar-old.png');
    // Retrying Save shouldn't require re-picking the image.
    expect(result.current.avatarPreviewUrl).toBeTruthy();
  });

  it('does nothing when the file picker is dismissed', () => {
    const { result } = renderHook(() => useProfileSettings(USER));
    act(() => result.current.changeAvatar(undefined));
    expect(uploadProfilePicture).not.toHaveBeenCalled();
    expect(result.current.avatarPreviewUrl).toBeNull();
  });

  it('discards a staged avatar without ever uploading it', async () => {
    updateProfile.mockResolvedValue({ message: 'Profile updated successfully.' });
    const { result } = renderHook(() => useProfileSettings(USER));

    act(() => result.current.changeAvatar(new File(['x'], 'me.png')));
    act(() => result.current.discardAvatarChange());
    expect(result.current.avatarPreviewUrl).toBeNull();

    await act(async () => result.current.saveProfile());
    expect(uploadProfilePicture).not.toHaveBeenCalled();
  });

  it('clears a stale banner when the modal is reopened', async () => {
    updateProfile.mockResolvedValue({ message: 'Profile updated successfully.' });
    const { result } = renderHook(() => useProfileSettings(USER));

    await act(async () => result.current.saveProfile());
    await waitFor(() => expect(result.current.success).not.toBe(''));

    act(() => result.current.resetFeedback());
    expect(result.current.success).toBe('');
  });
});


describe('email verification and persisted contact data', () => {
  it('keeps the current email cached until link verification, while saving the phone', async () => {
    updateProfile.mockResolvedValue({ email_verification_required: true, pending_email: 'new@example.test' });
    verifyEmailChange.mockResolvedValue({ message: 'Email verified.' });
    getMe.mockResolvedValueOnce({ user: { ...USER, pending_email: 'new@example.test', phone_number: '09123456789' } })
      .mockResolvedValueOnce({ user: { ...USER, email: 'new@example.test', phone_number: '09123456789' } });
    const { result } = renderHook(() => useProfileSettings(USER));
    act(() => { result.current.setField('email', 'new@example.test'); result.current.setField('phone_number', '09123456789'); });
    await act(async () => result.current.saveProfile());
    expect(JSON.parse(localStorage.getItem('trace_user'))).toMatchObject({ email: USER.email, phone_number: '09123456789' });
    expect(result.current.pendingEmail).toBe('new@example.test');
    expect(result.current.success).toContain('verification link');
  });
  it('preserves the pending address and current cached email while waiting for the link', async () => {
    updateProfile.mockResolvedValue({ email_verification_required: true, pending_email: 'new@example.test' });
    verifyEmailChange.mockRejectedValue({ response: { data: { error: 'Verification code expired.' } } });
    const { result } = renderHook(() => useProfileSettings(USER));
    act(() => result.current.setField('email', 'new@example.test'));
    await act(async () => result.current.saveProfile());
    expect(result.current.confirmEmail).toBeUndefined();
    expect(verifyEmailChange).not.toHaveBeenCalled();
    expect(result.current.pendingEmail).toBe('new@example.test');
    expect(JSON.parse(localStorage.getItem('trace_user')).email).toBe(USER.email);
  });
});

describe('saved profile refresh', () => {
  it('loads saved fields arriving after mount without overriding an edited draft', () => {
    const { result, rerender } = renderHook(({ user }) => useProfileSettings(user), { initialProps: { user: USER } });
    rerender({ user: { ...USER, birth_date: '2000-01-01T00:00:00.000Z', elem_school: 'Saved School', is_transfer_student: '0' } });
    expect(result.current.profileData).toMatchObject({ birth_date: '2000-01-01', elem_school: 'Saved School', is_transfer_student: false });
    act(() => result.current.setField('home_address', 'My draft'));
    rerender({ user: { ...USER, home_address: 'Server Address' } });
    expect(result.current.profileData.home_address).toBe('My draft');
  });
  it('publishes authoritative saved education after Save so request gating updates immediately', async () => {
    updateProfile.mockResolvedValue({});
    getMe.mockResolvedValue({ user: { ...USER, elem_school: 'Server Normalized', is_transfer_student: 1 } });
    const event = vi.fn();
    window.addEventListener('trace-user-updated', event);
    try {
      const { result } = renderHook(() => useProfileSettings(USER));
      act(() => result.current.setField('elem_school', 'Draft'));
      await act(() => result.current.saveProfile());
      expect(result.current.profileData.elem_school).toBe('Server Normalized');
      expect(result.current.profileData.is_transfer_student).toBe(true);
      expect(JSON.parse(localStorage.getItem('trace_user')).elem_school).toBe('Server Normalized');
      expect(event.mock.calls.at(-1)[0].detail.elem_school).toBe('Server Normalized');
    } finally { window.removeEventListener('trace-user-updated', event); }
  });
  it('distinguishes a successful write from a failed refresh and does not publish draft education', async () => {
    updateProfile.mockResolvedValue({});
    getMe.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useProfileSettings(USER));
    act(() => result.current.setField('elem_school', 'Unsynchronized'));
    await act(async () => expect(await result.current.saveProfile()).toBe(false));
    expect(result.current.error).toContain('Profile saved, but saved details could not be refreshed');
    expect(JSON.parse(localStorage.getItem('trace_user')).elem_school).toBeUndefined();
  });
});

it('clears the program on a college change, blocks incomplete academic saves, then adopts saved authoritative selections', async () => {
  const academicUser = { ...USER, role: 'student', college_id: 1, course: 'College A', program: 'Program A' };
  updateProfile.mockResolvedValue({ message: 'Saved' });
  getMe.mockResolvedValue({ user: { ...academicUser, college_id: 2, course: 'College B', program: 'Program B' } });
  const { result } = renderHook(() => useProfileSettings(academicUser));
  expect(result.current.profileData.college_id).toBe('1');
  act(() => result.current.setField('college_id', '2'));
  expect(result.current.profileData.program).toBe('');
  await act(async () => expect(await result.current.saveProfile()).toBe(false));
  expect(updateProfile).not.toHaveBeenCalled();
  act(() => result.current.setField('program', 'Program B'));
  await act(async () => expect(await result.current.saveProfile()).toBe(true));
  expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ college_id: '2', program: 'Program B' }));
  expect(result.current.profileData).toMatchObject({ college_id: '2', program: 'Program B' });
});
it('omits unchanged legacy academic fields while saving unrelated profile changes', async () => {
  const account = { ...USER, role: 'student', college_id: null, program: 'Recorded Program' };
  updateProfile.mockResolvedValue({ message: 'Saved' }); getMe.mockResolvedValue({ user: account });
  const { result } = renderHook(() => useProfileSettings(account));
  act(() => result.current.setField('phone_number', 'synthetic'));
  await act(async () => result.current.saveProfile());
  const payload = updateProfile.mock.calls.at(-1)[0];
  expect(payload).not.toHaveProperty('college_id'); expect(payload).not.toHaveProperty('program');
});

it('rejects invalid years before any staged photo or profile write and retains drafts', async () => {
  const user = { ...USER, role: 'student', user_type: 'alumni', year_started: 2020 };
  const { result } = renderHook(() => useProfileSettings(user));
  act(() => { result.current.setField('graduation_year', '2.026e3'); result.current.changeAvatar(new File(['x'], 'draft.png')); });
  await act(async () => expect(await result.current.saveProfile()).toBe(false));
  expect(result.current.error).toContain('exactly four digits');
  expect(result.current.profileData.graduation_year).toBe('2.026e3');
  expect(result.current.avatarFile).not.toBeNull();
  expect(updateProfile).not.toHaveBeenCalled(); expect(uploadProfilePicture).not.toHaveBeenCalled();
});
it('fills missing alumni study years once without changing historical attendance', async () => {
  const user = { ...USER, role: 'student', user_type: 'alumni', last_attendance_year: 1980, elem_grad_year: 1970, graduation_year: null, year_started: null };
  getMe.mockResolvedValue({ user: { ...user, year_started: 2020, graduation_year: 2024 } });
  const { result, unmount } = renderHook(() => useProfileSettings(user));
  expect(result.current.profileData).toMatchObject({ graduation_year: '', year_started: '', last_attendance_year: '1980', elem_grad_year: '1970' });
  act(() => { result.current.setField('year_started', '2020'); result.current.setField('graduation_year', '2024'); });
  await act(async () => expect(await result.current.saveProfile()).toBe(true));
  expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ graduation_year: '2024', last_attendance_year: '1980', elem_grad_year: '1970' }));
  const saved = JSON.parse(localStorage.getItem('trace_user')); unmount();
  const reopened = renderHook(() => useProfileSettings(saved));
  expect(reopened.result.current.profileData).toMatchObject({ graduation_year: '2024', last_attendance_year: '1980', elem_grad_year: '1970' });
});

it('rejects an attempted self-correction before uploading a staged photo', async () => {
  const account = { ...USER, role: 'student', user_type: 'alumni', year_started: 2020, graduation_year: 2024 };
  const { result } = renderHook(() => useProfileSettings(account));
  act(() => { result.current.setField('graduation_year', '2025'); result.current.changeAvatar(new File(['x'], 'draft.png')); });
  await act(async () => expect(await result.current.saveProfile()).toBe(false));
  expect(result.current.error).toContain('authorized administrator');
  expect(updateProfile).not.toHaveBeenCalled(); expect(uploadProfilePicture).not.toHaveBeenCalled();
});
it('allows unrelated profile saves to retain locked historical years', async () => {
  const account = { ...USER, role: 'student', user_type: 'alumni', year_started: 1995, graduation_year: 1999 };
  updateProfile.mockResolvedValue({ message: 'Saved' }); getMe.mockResolvedValue({ user: account });
  const { result } = renderHook(() => useProfileSettings(account));
  act(() => result.current.setField('phone_number', 'synthetic'));
  await act(async () => expect(await result.current.saveProfile()).toBe(true));
  expect(updateProfile.mock.calls[0][0]).not.toHaveProperty('year_started');
  expect(updateProfile.mock.calls[0][0]).not.toHaveProperty('graduation_year');
});
