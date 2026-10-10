import { profileEditYearErrors } from '@/utils/profileYears';
import { PASSWORD_REQUIREMENTS, validNewPassword } from '@/utils/passwordPolicy';
import { useRef, useState } from 'react';
import { updateProfile, uploadProfilePicture, getMe } from '@/services/authService';

import { isTransferStudent } from '@/utils/profileCompletion';
import { disconnectRealtime } from '@/services/realtimeService';
import useEmailVerification from '@/hooks/useEmailVerification';

const STORED_USER_KEY = 'trace_user';

function formFromUser(user) {
  return {
    phone_number: user?.phone_number || '',
    email: user?.pending_email || user?.email || '',
    program: user?.program || '',
    college_id: user?.college_id ? String(user.college_id) : '',
    password: '',
    current_password: '',
    extension_name: user?.extension_name || '',
    birth_date: user?.birth_date ? String(user.birth_date).split('T')[0] : '',
    place_of_birth: user?.place_of_birth || '',
    sex: user?.sex || '',
    civil_status: user?.civil_status || '',
    maiden_name: user?.maiden_name || '',
    home_address: user?.home_address || '',
    year_started: user?.year_started == null ? '' : String(user.year_started),
    graduation_year: user?.graduation_year == null ? '' : String(user.graduation_year),
    last_attendance_year: user?.last_attendance_year == null ? '' : String(user.last_attendance_year),
    is_transfer_student: isTransferStudent(user?.is_transfer_student),
    previous_school: user?.previous_school || '',
    elem_school: user?.elem_school || '',
    elem_grad_year: user?.elem_grad_year == null ? '' : String(user.elem_grad_year),
    jhs_school: user?.jhs_school || '',
    jhs_grad_year: user?.jhs_grad_year == null ? '' : String(user.jhs_grad_year),
    shs_school: user?.shs_school || '',
    shs_grad_year: user?.shs_grad_year == null ? '' : String(user.shs_grad_year),
  };
}


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
  const savingRef = useRef(false);
  const verification = useEmailVerification();
  const [profileData, setProfileData] = useState(() => formFromUser(user));
  const [dirty, setDirty] = useState(false);
  const [sourceUser, setSourceUser] = useState(user);
  const [avatarPath, setAvatarPath] = useState(user?.profile_picture || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(null);
  const [pendingEmail, setPendingEmail] = useState(user?.pending_email || '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // /auth/me can arrive after the layout mounts. Adopt saved fields without
  // overwriting a draft the user has already started editing.
  if (sourceUser !== user) {
    setSourceUser(user);
    setPendingEmail(user?.pending_email || '');
    if (!dirty) setProfileData(formFromUser(user));
  }

  /** Keep the cached user in sync so a refresh doesn't revert the avatar. */
  const patchStoredUser = (patch) => {
    try {
      const stored = localStorage.getItem(STORED_USER_KEY);
      localStorage.setItem(STORED_USER_KEY, JSON.stringify({ ...(stored ? JSON.parse(stored) : user), ...patch }));
    } catch {
      // A corrupt or unavailable localStorage must not break the save.
    }
    window.dispatchEvent(new CustomEvent('trace-user-updated', { detail: patch }));
  };

  const setField = (field, value) => {
    if (field === 'email') verification.reset();
    setDirty(true);
    setProfileData((current) => ({ ...current, [field]: value, ...(field === 'college_id' && String(value) !== String(current.college_id) ? { program: '' } : {}) }));
  };

  const readError = (err) =>
    err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Something went wrong.';

  // Send only the email action; phone, education, password and picture drafts stay local.
  const verifyEmail = async (draft = profileData) => {
    if (savingRef.current) return false;
    savingRef.current = true;
    try {
      const email = (draft.email || '').trim().toLowerCase();
      const changed = email !== (user?.email || '').trim().toLowerCase();
      const result = await verification.send(changed ? { email, current_password: draft.current_password } : {});
      if (!result) return false;
      if (changed && result.pending_email) {
        setPendingEmail(result.pending_email);
        patchStoredUser({ pending_email: result.pending_email });
        setProfileData(current => ({ ...current, current_password: '' }));
      }
      return result.email_sent !== false;
    } finally { savingRef.current = false; }
  };

  const saveProfile = async (e) => {
    if (e) e.preventDefault();
    if (savingRef.current) return false;
    if (profileData.password && !validNewPassword(profileData.password)) { setError(PASSWORD_REQUIREMENTS); return false; }
    const yearErrors = profileEditYearErrors(profileData, user);
    if (Object.keys(yearErrors).length) { setError(Object.values(yearErrors)[0]); return false; }
    const academicChanged = String(profileData.college_id || '') !== String(user?.college_id || '') || profileData.program !== (user?.program || '');
    if (academicChanged && (!/^[1-9]\d*$/.test(profileData.college_id) || !profileData.program)) {
      setError('Choose College and an active Program/Course belonging to it before saving.');
      return false;
    }
    savingRef.current = true;
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
      // An already-pending address was submitted by Verify; don't issue another
      // link (or claim the address changed) when saving unrelated profile fields.
      const payload = pendingEmail && profileData.email.trim().toLowerCase() === pendingEmail.toLowerCase()
        ? { ...profileData, email: user?.email || '' } : profileData;
      const request = { ...payload };
      for (const key of ['year_started', 'graduation_year']) {
        if (String(request[key] ?? '') === String(user?.[key] ?? '')) delete request[key];
      }
      if (!academicChanged) { delete request.college_id; delete request.program; }
      const result = await updateProfile(request);
      if (result?.token && result?.user) {
        localStorage.setItem('trace_token', result.token);
        disconnectRealtime();
        patchStoredUser(result.user);
      }
      patchStoredUser({ phone_number: payload.phone_number, ...(result?.email_verification_required ? {} : { email: payload.email }) });
      if (result?.email_verification_required) setPendingEmail(result.pending_email || profileData.email);
      setProfileData((current) => ({ ...current, password: '', current_password: '' }));
      if (!profileData.password || result?.token) {
        try {
          const { user: fresh } = await getMe();
          if (!fresh) throw new Error('Profile refresh returned no account.');
          setDirty(false);
          setProfileData(formFromUser(fresh));
          setPendingEmail(fresh.pending_email || (result?.email_verification_required ? result.pending_email : '') || '');
          patchStoredUser(fresh);
        } catch {
          // The write succeeded. Do not claim it failed or publish unsaved draft fields.
          errors.push('Profile saved, but saved details could not be refreshed. Reopen TRACE before requesting documents.');
        }
      }
      messages.push(result?.message || (pendingEmail || profileData.email !== user?.email ? 'Profile saved. If an email change was requested, open the verification link sent to the new address.' : 'Profile updated successfully.'));
      if (result?.email_sent === false) errors.push('Profile saved, but the verification link could not be delivered. Retry in 60 seconds or contact the Registrar.');
    } catch (err) {
      errors.push(readError(err));
    }

    if (messages.length) setSuccess(messages.join(' '));
    if (errors.length) setError(errors.join(' '));
    setSaving(false);
    savingRef.current = false;
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
    verification.reset();
    setSuccess('');
    setError('');
  };


  return {
    verifyEmail, verifyingEmail: verification.sending, verificationMessage: verification.message, verificationError: verification.error,
    pendingEmail, avatarFile,
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
