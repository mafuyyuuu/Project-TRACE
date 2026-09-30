import { useState } from 'react';
import { updateProfile, uploadProfilePicture, verifyEmailChange, getMe } from '@/services/authService';

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
 *
 * A picked profile picture is staged locally (`avatarFile`/`avatarPreviewUrl`)
 * rather than uploaded on selection — it only reaches the server as part of
 * `saveProfile`, the same gate every other field already goes through, and
 * `discardAvatarChange` drops the stage without ever having called the server.
 */
export default function useProfileSettings(user) {
  const [profileData, setProfileData] = useState({
    phone_number: user?.phone_number || '',
    email: user?.email || '',
    password: '',
    current_password: '',
    extension_name: user?.extension_name || '',
    birth_date: user?.birth_date ? user.birth_date.split('T')[0] : '',
    place_of_birth: user?.place_of_birth || '',
    sex: user?.sex || '',
    civil_status: user?.civil_status || '',
    maiden_name: user?.maiden_name || '',
    home_address: user?.home_address || '',
    last_attendance_year: user?.last_attendance_year || '',
    is_transfer_student: user?.is_transfer_student || false,
    previous_school: user?.previous_school || '',
    elem_school: user?.elem_school || '',
    elem_grad_year: user?.elem_grad_year || '',
    jhs_school: user?.jhs_school || '',
    jhs_grad_year: user?.jhs_grad_year || '',
    shs_school: user?.shs_school || '',
    shs_grad_year: user?.shs_grad_year || '',
  });
  const [avatarPath, setAvatarPath] = useState(user?.profile_picture || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(null);
  const [pendingEmail, setPendingEmail] = useState(user?.pending_email || '');
  const [emailOtp, setEmailOtp] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  /** Keep the cached user in sync so a refresh doesn't revert the avatar. */
  const patchStoredUser = (patch) => {
    try {
      const stored = localStorage.getItem(STORED_USER_KEY);
      if (!stored) return;
      localStorage.setItem(STORED_USER_KEY, JSON.stringify({ ...JSON.parse(stored), ...patch }));
      window.dispatchEvent(new CustomEvent('trace-user-updated', { detail: patch }));
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

    const messages = [];
    const errors = [];

    if (avatarFile) {
      try {
        const data = await uploadProfilePicture(avatarFile);
        setAvatarPath(data.profile_picture);
        patchStoredUser({ profile_picture: data.profile_picture });
        URL.revokeObjectURL(avatarPreviewUrl);
        setAvatarFile(null);
        setAvatarPreviewUrl(null);
        messages.push('Profile picture updated.');
      } catch (err) {
        // Keep the staged file so retrying Save doesn't require re-picking the image.
        errors.push(readError(err));
      }
    }

    try {
      const result = await updateProfile(profileData);
      patchStoredUser({ phone_number: profileData.phone_number, ...(result?.email_verification_required ? {} : { email: profileData.email }) });
      if (result?.email_verification_required) setPendingEmail(result.pending_email || profileData.email);
      setProfileData((current) => ({ ...current, password: '', current_password: '' }));
      messages.push(pendingEmail || profileData.email !== user?.email ? 'Profile saved. If an email change was requested, verify the code sent to the new address.' : 'Profile updated successfully.');
    } catch (err) {
      errors.push(readError(err));
    }

    if (messages.length) setSuccess(messages.join(' '));
    if (errors.length) setError(errors.join(' '));
    setSaving(false);
    return errors.length === 0;
  };

  /** Stage a picked file as a local preview only — it uploads on Save. */
  const changeAvatar = (file) => {
    if (!file) return;
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    setAvatarFile(file);
    setAvatarPreviewUrl(URL.createObjectURL(file));
    setSuccess('');
    setError('');
  };

  /** Drop a staged, unsaved picture — closing the modal without saving. */
  const discardAvatarChange = () => {
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    setAvatarFile(null);
    setAvatarPreviewUrl(null);
  };

  /** Drop any stale banner when the modal is reopened. */
  const resetFeedback = () => {
    setSuccess('');
    setError('');
  };

  const confirmEmail = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      await verifyEmailChange(emailOtp);
      const { user: fresh } = await getMe();
      patchStoredUser(fresh);
      setProfileData(current => ({ ...current, email: fresh.email }));
      setPendingEmail(''); setEmailOtp(''); setSuccess('Email verified and updated.');
      return true;
    } catch (err) { setError(readError(err)); return false; }
    finally { setSaving(false); }
  };

  return {
    pendingEmail, emailOtp, setEmailOtp, confirmEmail, avatarFile,
    profileData,
    setField,
    avatarPath,
    avatarPreviewUrl,
    saving,
    success,
    error,
    saveProfile,
    changeAvatar,
    discardAvatarChange,
    resetFeedback,
  };
}
