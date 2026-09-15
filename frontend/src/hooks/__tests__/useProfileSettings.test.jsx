import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('@/services/authService', () => ({
  updateProfile: vi.fn(),
  uploadProfilePicture: vi.fn(),
}));

import { updateProfile, uploadProfilePicture } from '@/services/authService';
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
  updateProfile.mockReset();
  uploadProfilePicture.mockReset();
  localStorage.setItem('trace_user', JSON.stringify(USER));
});

describe('useProfileSettings', () => {
  it('seeds the form from the signed-in account', () => {
    const { result } = renderHook(() => useProfileSettings(USER));
    expect(result.current.profileData).toEqual({
      phone_number: '+639171234567',
      email: 'ana@plp.edu.ph',
      password: '',
    });
    expect(result.current.avatarPath).toBe('avatar-old.png');
  });

  it('reports a successful save inline instead of through alert()', async () => {
    updateProfile.mockResolvedValue({ message: 'ok' });
    const { result } = renderHook(() => useProfileSettings(USER));

    await act(async () => result.current.saveProfile());

    await waitFor(() => expect(result.current.success).toBe('Profile updated successfully.'));
    expect(result.current.error).toBe('');
  });

  it('surfaces the server message when a save fails', async () => {
    updateProfile.mockRejectedValue({ response: { data: { error: 'Email already in use.' } } });
    const { result } = renderHook(() => useProfileSettings(USER));

    await act(async () => result.current.saveProfile());

    await waitFor(() => expect(result.current.error).toBe('Email already in use.'));
    expect(result.current.success).toBe('');
  });

  // The password box is a write-only field; leaving the typed value behind
  // would re-submit it on the next save.
  it('clears the password box after a successful save', async () => {
    updateProfile.mockResolvedValue({ message: 'ok' });
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
    updateProfile.mockResolvedValue({ message: 'ok' });
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
    updateProfile.mockResolvedValue({ message: 'ok' });
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
    updateProfile.mockResolvedValue({ message: 'ok' });
    const { result } = renderHook(() => useProfileSettings(USER));

    act(() => result.current.changeAvatar(new File(['x'], 'me.png')));
    act(() => result.current.discardAvatarChange());
    expect(result.current.avatarPreviewUrl).toBeNull();

    await act(async () => result.current.saveProfile());
    expect(uploadProfilePicture).not.toHaveBeenCalled();
  });

  it('clears a stale banner when the modal is reopened', async () => {
    updateProfile.mockResolvedValue({ message: 'ok' });
    const { result } = renderHook(() => useProfileSettings(USER));

    await act(async () => result.current.saveProfile());
    await waitFor(() => expect(result.current.success).not.toBe(''));

    act(() => result.current.resetFeedback());
    expect(result.current.success).toBe('');
  });
});
