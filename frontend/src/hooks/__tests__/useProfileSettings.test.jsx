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

  it('adopts the uploaded avatar and caches it for the next page load', async () => {
    uploadProfilePicture.mockResolvedValue({ profile_picture: 'avatar-new.png' });
    const { result } = renderHook(() => useProfileSettings(USER));

    await act(async () => result.current.changeAvatar(new File(['x'], 'me.png')));

    await waitFor(() => expect(result.current.avatarPath).toBe('avatar-new.png'));
    expect(JSON.parse(localStorage.getItem('trace_user')).profile_picture).toBe('avatar-new.png');
  });

  it('reports a rejected upload and keeps the previous avatar', async () => {
    uploadProfilePicture.mockRejectedValue({
      response: { data: { error: 'Profile pictures must be a JPG, PNG, or WebP image.' } },
    });
    const { result } = renderHook(() => useProfileSettings(USER));

    await act(async () => result.current.changeAvatar(new File(['x'], 'me.gif')));

    await waitFor(() =>
      expect(result.current.error).toBe('Profile pictures must be a JPG, PNG, or WebP image.')
    );
    expect(result.current.avatarPath).toBe('avatar-old.png');
  });

  it('does nothing when the file picker is dismissed', async () => {
    const { result } = renderHook(() => useProfileSettings(USER));
    await act(async () => result.current.changeAvatar(undefined));
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
