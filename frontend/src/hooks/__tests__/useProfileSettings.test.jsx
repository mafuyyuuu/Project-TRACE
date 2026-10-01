import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('@/services/authService', () => ({
  updateProfile: vi.fn(),
  uploadProfilePicture: vi.fn(),
  verifyEmailChange: vi.fn(), getMe: vi.fn(),
}));

import { updateProfile, uploadProfilePicture, verifyEmailChange, getMe } from '@/services/authService';
import useProfileSettings from '@/hooks/useProfileSettings';

const USER = {
  id: 3,
  student_id: 'STU2024001',
  full_name: 'Ana Reyes',
  email: 'ana@plp.edu.ph',
  phone_number: '+639171234567',
  profile_picture: 'avatar-old.png',
};

beforeEach(() => {
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

    act(() => result.current.setField('password', 'newpw'));
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
