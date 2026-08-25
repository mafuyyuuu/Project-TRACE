import { useState } from 'react';
import { updateProfile, uploadProfilePicture } from '@/services/authService';

const STORED_USER_KEY = 'trace_user';

/**
 * State and actions behind the Account Settings profile card.
 *
 * `useAuth` is a plain hook rather than a context, so each caller holds its own
 * copy of `user` and there is no shared store to notify after a save. The
 * uploaded avatar is therefore written back into localStorage — which is what
 * `useAuth` seeds from — so the new picture survives a refresh, and the
 * freshly-stored filename is returned to the caller for the current render.
 *
 * Feedback is returned as `success`/`error` strings instead of the `alert()`
 * calls this replaces, so the modal can render it inline.
 */
export default function useProfileSettings(user) {
  const [profileData, setProfileData] = useState({
    phone_number: user?.phone_number || '',
    email: user?.email || '',
    password: '',
  });
  const [avatarPath, setAvatarPath] = useState(user?.profile_picture || null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  /** Keep the cached user in sync so a refresh doesn't revert the avatar. */
  const patchStoredUser = (patch) => {
    try {
      const stored = localStorage.getItem(STORED_USER_KEY);
      if (!stored) return;
      localStorage.setItem(STORED_USER_KEY, JSON.stringify({ ...JSON.parse(stored), ...patch }));
    } catch {
      // A corrupt or unavailable localStorage must not break the save.
    }
  };

  const setField = (field, value) => {
    setProfileData((current) => ({ ...current, [field]: value }));
  };

  const readError = (err) =>
    err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Something went wrong.';

  const saveProfile = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');
    try {
      await updateProfile(profileData);
      patchStoredUser({ phone_number: profileData.phone_number, email: profileData.email });
      setProfileData((current) => ({ ...current, password: '' }));
      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError(readError(err));
    } finally {
      setSaving(false);
    }
  };

  const changeAvatar = async (file) => {
    if (!file) return;
    setUploading(true);
    setSuccess('');
    setError('');
    try {
      const data = await uploadProfilePicture(file);
      setAvatarPath(data.profile_picture);
      patchStoredUser({ profile_picture: data.profile_picture });
      setSuccess('Profile picture updated.');
    } catch (err) {
      setError(readError(err));
    } finally {
      setUploading(false);
    }
  };

  /** Drop any stale banner when the modal is reopened. */
  const resetFeedback = () => {
    setSuccess('');
    setError('');
  };

  return {
    profileData,
    setField,
    avatarPath,
    saving,
    uploading,
    success,
    error,
    saveProfile,
    changeAvatar,
    resetFeedback,
  };
}
