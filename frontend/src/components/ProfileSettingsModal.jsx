import { INPUT_LIMITS } from '@/utils/inputLimits';
import FileUploadField from '@/components/FileUploadField';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useRef, useState, useMemo } from 'react';
import ModalShell from '@/components/ModalShell';
import DashboardAlerts from '@/components/DashboardAlerts';
import { endOtherSessions } from '@/services/authService';
import { disconnectRealtime } from '@/services/realtimeService';
import UserAvatar from '@/components/UserAvatar';
import { TEXT_SIZES } from '@/utils/textSize';
import { getProfileCompletion } from '@/utils/profileCompletion';
import AuthenticatorSettings from '@/components/AuthenticatorSettings';
import useSecurityLogs from '@/hooks/useSecurityLogs';

export default function ProfileSettingsModal({
  user,
  onClose,
  profileData,
  setField,
  avatarPath,
  avatarPreviewUrl,
  avatarFile,
  saving,
  success,
  error,
  onSave,
  onAvatarChange,
  initialTab = 'personal',
  darkMode = false,
  onToggleTheme,
  textSize = 100, onTextSizeChange,
  pendingEmail = '', emailOtp = '', onEmailOtpChange, onVerifyEmail,
}) {
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState(initialTab);
  const [confirmation, setConfirmation] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const securityLogs = useSecurityLogs(activeTab === 'security', user?.id);
  const [sessionFeedback, setSessionFeedback] = useState({ success: '', error: '' });
  

  const roleLabel =
    user?.role === 'admin'
      ? 'Registrar Admin'
      : user?.role === 'clerk'
        ? `${user?.desk_assignment || 'Staff'} Clerk`
        : 'Student';
        
  const isStudent = user?.role === 'student';
  const { progress, missingPersonal, missingEdu, missing } = useMemo(
    () => getProfileCompletion({ ...user, ...profileData }), [user, profileData],
  );

  if (activeTab === 'appearance') return (
    <ModalShell open onClose={onClose} title="Preferences" maxWidth="max-w-xl">
      <section className="space-y-4" aria-label="Appearance">
        <h3 className="font-bold">Appearance</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">Choose how TRACE looks on this device.</p>
        <button type="button" aria-pressed={darkMode} onClick={onToggleTheme}
          className="px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 focus-visible:ring-2 focus-visible:ring-green-600">
          {darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        </button>
        <label className="block font-semibold">Text size
          <select value={textSize} onChange={event => onTextSizeChange?.(event.target.value)}
            className="mt-2 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3">
            {TEXT_SIZES.map(size => <option key={size} value={size}>{size}%{size === 100 ? ' (Default)' : ''}</option>)}
          </select>
        </label>
        <p className="text-sm text-gray-600 dark:text-gray-300">Applies across TRACE on this browser, including menus, forms, tables and chat. Saved automatically. Printed documents keep their original formatting.</p>
      </section>
    </ModalShell>
  );

  const confirmAction = async () => {
    if (confirmation === 'email') {
      if (await onVerifyEmail()) setConfirmation(null);
      return;
    }
    if (confirmation === 'profile') {
      if (await onSave()) setConfirmation(null);
      return;
    }
    setLoggingOut(true);
    try {
      const result = await endOtherSessions();
      localStorage.setItem('trace_token', result.token);
      localStorage.setItem('trace_user', JSON.stringify(result.user));
      disconnectRealtime();
      window.dispatchEvent(new CustomEvent('trace-user-updated', { detail: result.user }));
      setSessionFeedback({ success: 'Logged out of all other devices.', error: '' });
      setConfirmation(null);
    } catch {
      setSessionFeedback({ success: '', error: 'Error logging out of other devices.' });
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <ModalShell
      open
      onClose={onClose}
      title="Edit Profile"
      maxWidth="max-w-xl"
      bodyClassName="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4"
      backdropClassName="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200"
      panelClassName="bg-gray-50 dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[calc(100dvh-2rem)] z-10 relative animate-slide-up flex flex-col overflow-hidden"
      closeButtonIcon={
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
      }
      closeButtonAriaLabel="Close profile"
      footer={activeTab !== 'appearance' && (
        <button
          disabled={saving}
          type="submit"
          form="profile-settings-form"
          className="w-full bg-[#15803d] hover:bg-[#166534] text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 shadow-md"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      )}
    >
      <ConfirmDialog open={!!confirmation}
        title={confirmation === 'email' ? 'Verify New Email' : confirmation === 'profile' ? 'Confirm Profile Save' : 'Log Out Other Devices'}
        message={confirmation === 'email' ? ['Confirm this verification code to update your email address.', error ? <span role="alert">{error}</span> : null] : confirmation === 'profile'
          ? ['Save your profile changes and selected picture?', error ? <span role="alert">{error}</span> : null]
          : 'Log out of all other active sessions?'}
        confirmLabel={confirmation === 'email' ? 'Verify Email' : confirmation === 'profile' ? 'Save Profile' : 'Log Out Other Devices'}
        variant={confirmation === 'session' ? 'destructive' : 'neutral'}
        loading={saving || loggingOut} onConfirm={confirmAction} onCancel={() => setConfirmation(null)} />
      <DashboardAlerts
        dismissalKey={activeTab}
        success={sessionFeedback.success}
        error={sessionFeedback.error}
        onDismiss={() => setSessionFeedback({ success: '', error: '' })}
      />
      {pendingEmail && <section className="mb-4 p-4 rounded-xl border border-amber-200 dark:border-amber-800" aria-label="Email verification">
        <p className="text-sm mb-3">Verify the code sent to <span className="select-text break-all">{pendingEmail}</span>. Your current email stays active until verification.</p>
        <label className="block text-sm">Verification code
          <input value={emailOtp} onChange={e => onEmailOtpChange?.(e.target.value.replace(/\D/g, ''))} inputMode="numeric" maxLength={INPUT_LIMITS.otp} className="w-full rounded-xl border p-3 dark:bg-gray-900" />
        </label>
        <button type="button" disabled={saving || emailOtp.length !== 6} onClick={() => setConfirmation('email')} className="mt-3 px-4 py-2 rounded-xl bg-[#15803d] text-white disabled:opacity-50">Verify Email</button>
      </section>}
      <div className="trace-profile-header bg-white dark:bg-gray-900 px-6 pt-4 pb-0 flex flex-col border-b border-gray-100 dark:border-gray-700">
        <div className="flex flex-wrap items-start gap-4 pb-6">
          <div className="relative shrink-0">
            {avatarPreviewUrl ? (
              <img src={avatarPreviewUrl} alt="New profile picture preview" className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-md bg-gray-100 dark:bg-gray-800" />
            ) : (
              <UserAvatar user={user} overridePath={avatarPath} className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-md bg-gray-100 dark:bg-gray-800" />
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving}
              aria-label="Change profile picture"
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#15803d] hover:bg-[#166534] text-white flex items-center justify-center shadow-md transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </button>
          </div>
          <div className="flex flex-col flex-1 basis-48 min-w-0 pt-1">
            <h3 className="text-xl font-display font-black text-gray-900 dark:text-gray-100 leading-tight select-text break-words">{user?.full_name || '—'}</h3>
            <p className="text-xs font-bold text-[#15803d] dark:text-green-300 uppercase tracking-wider mt-0.5">{roleLabel} {user?.student_id && `· ${user.student_id}`}</p>
            
            {isStudent && (
              <div className="mt-3 w-full max-w-xs">
                <div className="flex flex-wrap gap-2 justify-between text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5">
                  <span>Profile Completion</span>
                  <span className={progress === 100 ? "text-[#15803d] dark:text-green-300" : "text-amber-600 dark:text-amber-300"}>{progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-200 ${progress === 100 ? 'bg-[#15803d]' : 'bg-amber-500 dark:bg-amber-500'}`} style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <FileUploadField pickerOnly label="Profile picture" inputRef={fileInputRef} file={avatarFile} onChange={onAvatarChange} accept="image/jpeg,image/png,image/webp" maxBytes={2 * 1024 * 1024} disabled={saving} />
        {user?.role === 'student' && <FileUploadField label={user.user_type === 'alumni' ? 'Registration identity / diploma proof' : 'Registration ID proof'} path={user.id_proof_path} allowReplace={false} />}
        {/* Tabs */}
        {isStudent ? (
          <div className="flex flex-wrap gap-3 sm:gap-6 border-b border-gray-100 dark:border-gray-700 px-2 mt-2">
            <button
              type="button"
              onClick={() => setActiveTab('personal')}
              className={`pb-3 text-xs font-bold uppercase tracking-widest transition-colors relative flex items-center gap-1.5 ${activeTab === 'personal' ? 'text-[#15803d] dark:text-green-300 border-b-2 border-[#15803d]' : 'text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
            >
              Personal Info
              {missingPersonal && <span className="w-2 h-2 rounded-full bg-red-500 dark:bg-red-500 absolute -top-0.5 -right-2"></span>}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('educational')}
              className={`pb-3 text-xs font-bold uppercase tracking-widest transition-colors relative flex items-center gap-1.5 ${activeTab === 'educational' ? 'text-[#15803d] dark:text-green-300 border-b-2 border-[#15803d]' : 'text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
            >
              Educational Background
              {missingEdu && <span className="w-2 h-2 rounded-full bg-red-500 dark:bg-red-500 absolute -top-0.5 -right-2"></span>}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`pb-3 text-xs font-bold uppercase tracking-widest transition-colors relative flex items-center gap-1.5 ${activeTab === 'security' ? 'text-[#15803d] dark:text-green-300 border-b-2 border-[#15803d]' : 'text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
            >
              Security
            </button>
          </div>
        ) : (
           <div className="flex flex-wrap gap-3 sm:gap-6 border-b border-gray-100 dark:border-gray-700 px-2 mt-2">
             <button type="button" onClick={() => setActiveTab('personal')} className={`pb-3 text-xs font-bold uppercase tracking-widest transition-colors relative flex items-center gap-1.5 ${activeTab === 'personal' ? 'text-[#15803d] dark:text-green-300 border-b-2 border-[#15803d]' : 'text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>Personal Info</button>
             <button type="button" onClick={() => setActiveTab('security')} className={`pb-3 text-xs font-bold uppercase tracking-widest transition-colors relative flex items-center gap-1.5 ${activeTab === 'security' ? 'text-[#15803d] dark:text-green-300 border-b-2 border-[#15803d]' : 'text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>Security</button>
           </div>
        )}
      </div>

      <div className="p-6">
        {success && <div className="mb-6 rounded-xl bg-green-50 dark:bg-green-950/40 border border-green-100 dark:border-green-800 px-4 py-3 text-sm font-semibold text-green-800 dark:text-green-300">{success}</div>}
        {error && <div className="mb-6 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-800 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-300">{error}</div>}

        {isStudent && missing.length > 0 && <p role="status" className="px-6 pt-3 text-sm text-amber-800 dark:text-amber-200">
          Still needed: {missing.map(item => item.label).join(', ')}.
        </p>}
        <form id="profile-settings-form" onSubmit={(e) => { e.preventDefault(); setConfirmation('profile'); }} className="space-y-6">
          {activeTab === 'personal' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Phone Number <span className="text-red-500 dark:text-red-300">*</span></label>
                  <input maxLength={INPUT_LIMITS.phone} type="text" value={profileData.phone_number} onChange={(e) => setField('phone_number', e.target.value)} required className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Email Address <span className="text-red-500 dark:text-red-300">*</span></label>
                  <input maxLength={INPUT_LIMITS.email} type="email" value={profileData.email} onChange={(e) => setField('email', e.target.value)} required className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none" />
                </div>
              </div>

              {isStudent && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Birth Date <span className="text-red-500 dark:text-red-300">*</span></label>
                      <input type="date" value={profileData.birth_date} onChange={(e) => setField('birth_date', e.target.value)} required className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Place of Birth <span className="text-red-500 dark:text-red-300">*</span></label>
                      <input maxLength={INPUT_LIMITS.name} type="text" value={profileData.place_of_birth} onChange={(e) => setField('place_of_birth', e.target.value)} required className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Sex <span className="text-red-500 dark:text-red-300">*</span></label>
                      <select value={profileData.sex} onChange={(e) => setField('sex', e.target.value)} required className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none">
                        <option value="">Select...</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Civil Status <span className="text-red-500 dark:text-red-300">*</span></label>
                      <select value={profileData.civil_status} onChange={(e) => setField('civil_status', e.target.value)} required className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none">
                        <option value="">Select...</option>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Widowed">Widowed</option>
                        <option value="Divorced">Divorced</option>
                        <option value="Separated">Separated</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Extension Name</label>
                      <input maxLength={INPUT_LIMITS.shortCode} type="text" placeholder="Jr., III, etc." value={profileData.extension_name} onChange={(e) => setField('extension_name', e.target.value)} className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none" />
                    </div>
                  </div>

                  {profileData.sex === 'Female' && profileData.civil_status === 'Married' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Maiden Name <span className="text-red-500 dark:text-red-300">*</span></label>
                      <input maxLength={INPUT_LIMITS.name} type="text" value={profileData.maiden_name} onChange={(e) => setField('maiden_name', e.target.value)} required className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none" />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Home Address <span className="text-red-500 dark:text-red-300">*</span></label>
                    <textarea maxLength={INPUT_LIMITS.address} value={profileData.home_address} onChange={(e) => setField('home_address', e.target.value)} required rows="2" className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none resize-none"></textarea>
                  </div>
                </>
              )}

              
            </div>
          )}

          
          {activeTab === 'security' && (
            <div className="space-y-6">
              <AuthenticatorSettings user={user} />
              <div className="bg-white dark:bg-gray-900 p-4 border border-gray-200 dark:border-gray-700 rounded-2xl">
                <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">Change Password</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Current Password</label>
                    <input type="password" value={profileData.current_password} onChange={(e) => setField('current_password', e.target.value)} placeholder="Required to change email or password" className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">New Password</label>
                    <input maxLength={INPUT_LIMITS.password} type="password" value={profileData.password} onChange={(e) => setField('password', e.target.value)} placeholder="Leave blank to keep current password" className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none" />
                    
                    {profileData.password && (
                      <div className="mt-2 text-[10px] font-bold uppercase tracking-widest grid grid-cols-2 gap-1">
                        <span className={profileData.password.length >= 8 ? 'text-green-600 dark:text-green-300' : 'text-gray-400 dark:text-gray-400'}>{profileData.password.length >= 8 ? '✓' : '○'} 8+ Characters</span>
                        <span className={/[A-Z]/.test(profileData.password) ? 'text-green-600 dark:text-green-300' : 'text-gray-400 dark:text-gray-400'}>{/[A-Z]/.test(profileData.password) ? '✓' : '○'} 1 Uppercase</span>
                        <span className={/\d/.test(profileData.password) ? 'text-green-600 dark:text-green-300' : 'text-gray-400 dark:text-gray-400'}>{/\d/.test(profileData.password) ? '✓' : '○'} 1 Number</span>
                        <span className={/[@$!%*?&]/.test(profileData.password) ? 'text-green-600 dark:text-green-300' : 'text-gray-400 dark:text-gray-400'}>{/[@$!%*?&]/.test(profileData.password) ? '✓' : '○'} 1 Special Char</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-900 p-4 border border-gray-200 dark:border-gray-700 rounded-2xl">
                <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">Session Management</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Log out of all other active sessions across all devices. You will remain logged in on this device.</p>
                <button type="button" disabled={loggingOut} onClick={() => setConfirmation('sessions')} className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 font-bold uppercase tracking-widest text-xs py-2 px-4 rounded-xl hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors border border-red-200 dark:border-red-800">
                  Logout All Devices
                </button>
              </div>
              <div className="bg-white dark:bg-gray-900 p-4 border border-gray-200 dark:border-gray-700 rounded-2xl">
                <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">Recent Security Activity</h3>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">View your recent logins, password changes, and other security events.</div>
                <div className="flex justify-center my-4">
                  
                <div className="mt-4 border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-2">Date</th>
                        <th className="px-4 py-2">Event</th>
                        <th className="px-4 py-2">IP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {securityLogs.length === 0 ? (
                        <tr><td colSpan="3" className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">No recent activity</td></tr>
                      ) : (
                        securityLogs.slice(0, 5).map((log, i) => (
                          <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{new Date(log.created_at).toLocaleString()}</td>
                            <td className="px-4 py-2 font-bold text-gray-700 dark:text-gray-300">{log.event_type}</td>
                            <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{log.ip_address || 'Unknown'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                </div>
              </div>
            </div>
          )}

          {activeTab === 'educational' && isStudent && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white dark:bg-gray-900 p-4 border border-gray-200 dark:border-gray-700 rounded-2xl">
                {user?.user_type === 'alumni' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Graduation Year <span className="text-red-500 dark:text-red-300">*</span></label>
                    <input type="number" min="1950" max="2100" value={profileData.last_attendance_year} onChange={(e) => setField('last_attendance_year', e.target.value)} required className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Transfer Student?</label>
                  <select value={profileData.is_transfer_student ? 'yes' : 'no'} onChange={(e) => setField('is_transfer_student', e.target.value === 'yes')} className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none">
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </div>
              </div>

              {profileData.is_transfer_student && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Previous School <span className="text-red-500 dark:text-red-300">*</span></label>
                  <input maxLength={INPUT_LIMITS.name} type="text" value={profileData.previous_school} onChange={(e) => setField('previous_school', e.target.value)} required className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none" />
                </div>
              )}

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-800 dark:text-gray-100 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700 pb-2">Elementary</h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="sm:col-span-3">
                    <input maxLength={INPUT_LIMITS.name} type="text" placeholder="School Name" required value={profileData.elem_school} onChange={(e) => setField('elem_school', e.target.value)} className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none" />
                  </div>
                  <div>
                    <input type="number" placeholder="Year" required value={profileData.elem_grad_year} onChange={(e) => setField('elem_grad_year', e.target.value)} className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none" />
                  </div>
                </div>

                <h4 className="text-xs font-bold text-gray-800 dark:text-gray-100 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700 pb-2 pt-2">Junior High School</h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="sm:col-span-3">
                    <input maxLength={INPUT_LIMITS.name} type="text" placeholder="School Name" required value={profileData.jhs_school} onChange={(e) => setField('jhs_school', e.target.value)} className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none" />
                  </div>
                  <div>
                    <input type="number" placeholder="Year" required value={profileData.jhs_grad_year} onChange={(e) => setField('jhs_grad_year', e.target.value)} className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none" />
                  </div>
                </div>

                <h4 className="text-xs font-bold text-gray-800 dark:text-gray-100 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700 pb-2 pt-2">Senior High School</h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="sm:col-span-3">
                    <input maxLength={INPUT_LIMITS.name} type="text" placeholder="School Name" required value={profileData.shs_school} onChange={(e) => setField('shs_school', e.target.value)} className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none" />
                  </div>
                  <div>
                    <input type="number" placeholder="Year" required value={profileData.shs_grad_year} onChange={(e) => setField('shs_grad_year', e.target.value)} className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none" />
                  </div>
                </div>
              </div>

            </div>
          )}
        </form>
      </div>
    </ModalShell>
  );
}
