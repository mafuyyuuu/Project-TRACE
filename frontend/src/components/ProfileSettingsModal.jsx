import { useRef } from 'react';
import ModalShell from '@/components/ModalShell';
import UserAvatar from '@/components/UserAvatar';

/**
 * Account Settings, presented as a profile card: identity and picture on top,
 * editable contact details and password below.
 *
 * Presentational only — every value and handler is supplied by
 * `hooks/useProfileSettings`, so this component makes no API calls.
 */
export default function ProfileSettingsModal({
  user,
  onClose,
  profileData,
  setField,
  avatarPath,
  avatarPreviewUrl,
  saving,
  success,
  error,
  onSave,
  onAvatarChange,
}) {
  const fileInputRef = useRef(null);

  const roleLabel =
    user?.role === 'admin'
      ? 'Registrar Admin'
      : user?.role === 'clerk'
        ? `${user?.desk_assignment || 'Staff'} Clerk`
        : 'Student';

  return (
    <ModalShell
      open
      onClose={onClose}
      title="Account Settings"
      maxWidth="max-w-md"
      backdropClassName="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200"
      panelClassName="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[calc(100dvh-2rem)] z-10 relative animate-slide-up flex flex-col overflow-hidden"
      closeButtonIcon={
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
      }
      closeButtonAriaLabel="Close settings"
      footer={
        <button
          disabled={saving}
          type="submit"
          form="profile-settings-form"
          className="w-full bg-[#15803d] hover:bg-[#166534] text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      }
    >
      {/* Profile card: picture + identity */}
      <div className="flex flex-col items-center text-center pb-6 mb-6 border-b border-gray-100 -mt-2">
        <div className="relative">
          {avatarPreviewUrl ? (
            <img
              src={avatarPreviewUrl}
              alt="New profile picture preview"
              className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md bg-gray-100"
            />
          ) : (
            <UserAvatar
              user={user}
              overridePath={avatarPath}
              alt="Profile picture"
              className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md bg-gray-100"
            />
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={saving}
            aria-label="Change profile picture"
            className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-[#15803d] hover:bg-[#166534] text-white flex items-center justify-center shadow-md transition-colors disabled:opacity-50"
          >
            {saving && avatarPreviewUrl ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              onAvatarChange(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>

        <h3 className="mt-4 text-lg font-display font-black text-gray-900">{user?.full_name || '—'}</h3>
        <p className="text-xs font-bold text-[#15803d] uppercase tracking-wider mt-1">{roleLabel}</p>
        {user?.student_id && (
          <p className="text-xs text-gray-400 font-semibold mt-1">{user.student_id}</p>
        )}
        {avatarPreviewUrl ? (
          <p className="text-[11px] text-amber-600 font-semibold mt-3">
            New photo selected — click Save Settings to apply, or close to discard.
          </p>
        ) : (
          <p className="text-[11px] text-gray-400 mt-3">JPG, PNG or WebP · up to 2 MB</p>
        )}
      </div>

      {success && (
        <div className="mb-4 rounded-xl bg-green-50 border border-green-100 px-4 py-3 text-sm font-semibold text-green-800">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <form id="profile-settings-form" onSubmit={onSave} className="space-y-4">
        <div>
          <label htmlFor="settings-phone" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Phone Number</label>
          <input
            id="settings-phone"
            type="text"
            value={profileData.phone_number}
            onChange={(e) => setField('phone_number', e.target.value)}
            placeholder="+639123456789"
            className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none"
          />
          <p className="text-xs text-gray-400 mt-1">Required for SMS notifications.</p>
        </div>
        <div>
          <label htmlFor="settings-email" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email Address</label>
          <input
            id="settings-email"
            type="email"
            value={profileData.email}
            onChange={(e) => setField('email', e.target.value)}
            placeholder="juan@plp.edu.ph"
            className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none"
          />
          <p className="text-xs text-gray-400 mt-1">Required for email notifications.</p>
        </div>
        <div>
          <label htmlFor="settings-password" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Change Password</label>
          <input
            id="settings-password"
            type="password"
            value={profileData.password}
            onChange={(e) => setField('password', e.target.value)}
            placeholder="Leave blank to keep current password"
            className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none"
          />
        </div>
      </form>
    </ModalShell>
  );
}
