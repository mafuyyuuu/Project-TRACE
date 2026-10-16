import { formatDateTime, formatEventLabel } from '@/utils/formatters';
import PaginatedTable from '@/components/PaginatedTable';
import { isWindowClerk } from '@/utils/windowPresentation';
import AdminProfileSecurity from '@/features/admin/components/AdminProfileSecurity';
import AdminIcon from '@/features/admin/components/AdminIcon';
import PhoneInput from '@/components/PhoneInput';
import { phoneNumberError } from '@/utils/phoneNumber';
import { namePartsError, receiptStudentName } from '@/utils/receiptStudentName';
import StudentProfilePersonal from '@/features/student/components/StudentProfilePersonal';
import StudentProfileEducation from '@/features/student/components/StudentProfileEducation';
import StudentProfileSecurity from '@/features/student/components/StudentProfileSecurity';
import StudentIcon from '@/features/student/components/StudentIcon';
import { profileEditYearErrors } from '@/utils/profileYears';
import Button from '@/components/Button';
import { PASSWORD_REQUIREMENTS, validNewPassword } from '@/utils/passwordPolicy';
import { INPUT_LIMITS } from '@/utils/inputLimits';
import FileUploadField from '@/components/FileUploadField';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useRef, useState, useMemo, useEffect } from 'react';
import ModalShell from '@/components/ModalShell';
import DashboardAlerts from '@/components/DashboardAlerts';
import { endOtherSessions } from '@/services/authService';
import { disconnectRealtime } from '@/services/realtimeService';
import UserAvatar from '@/components/UserAvatar';
import PreferencesModal from '@/components/PreferencesModal';
import ProgressFill from '@/components/ProgressFill';
import useMotion from '@/hooks/useMotion';
import { getProfileCompletion } from '@/utils/profileCompletion';
import AuthenticatorSettings from '@/components/AuthenticatorSettings';
import useSecurityLogs from '@/hooks/useSecurityLogs';
import { hasBrowserTrustPreference, forgetBrowserTrustPreference } from '@/utils/browserTrustPreference';
import EmailVerificationNotice from '@/components/EmailVerificationNotice';

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
  pendingEmail = '',
  onVerifyEmail,
  verifyingEmail = false,
  verificationMessage = '',
  verificationError = '',
}) {
  const fileInputRef = useRef(null);
  const tabContentRef = useRef(null);
  const emailInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState(initialTab);
  useMotion(tabContentRef, activeTab, 'context', { initial: false });
  const [yearFocus, setYearFocus] = useState(null);
  const receiptNameError = user?.role === 'student' ? namePartsError(profileData, user) : '';
  const editYearErrors = profileEditYearErrors(profileData, user);
  useEffect(() => {
    if (activeTab === 'educational' && yearFocus) document.getElementById(`profile-${yearFocus.field}`)?.focus();
  }, [activeTab, yearFocus]);
  const [passwordError, setPasswordError] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [emailDraft, setEmailDraft] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [personalBrowser, setPersonalBrowser] = useState(hasBrowserTrustPreference);
  const securityLogs = useSecurityLogs(activeTab === 'security', user?.id);
  const [sessionFeedback, setSessionFeedback] = useState({ success: '', error: '' });
  

  const roleLabel =
    user?.role === 'admin'
      ? 'Registrar Admin'
      : user?.role === 'clerk'
        ? `${user?.desk_assignment || 'Staff'} Clerk`
        : 'Student';
        
  const isStudent = user?.role === 'student';
  // Shared staff presentation; authorization continues to use user.role in services.
  const isAdmin = user?.role === 'admin' || isWindowClerk(user);
  const [showSecurityActivity, setShowSecurityActivity] = useState(false);
  const emailChanged = (profileData.email || '').trim().toLowerCase() !== (user?.email || '').trim().toLowerCase();
  const requestEmailVerification = () => {
    if (!emailInputRef.current?.reportValidity()) return;
    const draft = { email: profileData.email, current_password: profileData.current_password };
    if (emailChanged) { setEmailDraft(draft); setConfirmation('email'); }
    else void onVerifyEmail?.(draft);
  };
  const stageProfileSave = event => {
    event.preventDefault();
    if (profileData.password && !validNewPassword(profileData.password)) {
      setPasswordError(PASSWORD_REQUIREMENTS);
      return;
    }
    const phoneError = phoneNumberError(profileData.phone_number);
    if (phoneError) { setPasswordError(phoneError); setActiveTab('personal'); return; }
    setPasswordError('');
    if (receiptNameError && isStudent) { setActiveTab('personal'); return; }
    const invalidYear = Object.keys(editYearErrors)[0];
    if (invalidYear && isStudent) {
      setActiveTab('educational');
      setYearFocus({ field: invalidYear });
      return;
    }
    setConfirmation('profile');
  };
  const { progress, missingPersonal, missingEdu, missing } = useMemo(
    () => getProfileCompletion({ ...user, ...profileData }), [user, profileData],
  );

  const missingByField = new Map(missing.map(item => [item.field, item.label]));
  const fieldDescription = field => ({
    id: `profile-${field}`,
    'aria-describedby': missingByField.has(field) ? `profile-${field}-needed` : undefined,
  });
  const fieldWarning = (field, label = missingByField.get(field)) => missingByField.has(field) && (
    <p id={`profile-${field}-needed`} className="mt-1 text-xs text-amber-800 dark:text-amber-200">
      Required: {label}.
    </p>
  );

  if (activeTab === 'appearance') return (
    <PreferencesModal admin={user?.role === 'admin'} onClose={onClose} darkMode={darkMode} onToggleTheme={onToggleTheme}
      textSize={textSize} onTextSizeChange={onTextSizeChange} />
  );

  const confirmAction = async () => {
    if (confirmation === 'email') {
      if (await onVerifyEmail?.(emailDraft)) setConfirmation(null);
      return;
    }
    if (confirmation === 'browser') {
      forgetBrowserTrustPreference();
      setPersonalBrowser(false);
      setConfirmation(null);
      setSessionFeedback({ success: 'Shared-computer verification restored for the next login.', error: '' });
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

  const emailControl = (
    <div className={isStudent ? "min-w-0" : "min-w-0 col-span-full"}>
      <label htmlFor="profile-email" className="trace-label block mb-2">Email Address <span className="text-red-500 dark:text-red-300">*</span></label>
      <EmailVerificationNotice admin={isAdmin} student={isStudent} user={user} email={profileData.email} pendingEmail={pendingEmail} sending={verifyingEmail}
        message={verificationMessage} error={confirmation === 'email' ? '' : verificationError}
        disabled={saving || (emailChanged && !profileData.current_password)} onVerify={requestEmailVerification}>
        <input aria-describedby={missingByField.has('email') ? 'profile-email-needed' : undefined} id="profile-email" ref={emailInputRef} maxLength={INPUT_LIMITS.email} type="email" value={profileData.email} onChange={(e) => setField('email', e.target.value)} required disabled={verifyingEmail} className="trace-control min-w-0 flex-1 basis-48" />
      </EmailVerificationNotice>
      {fieldWarning('email')}
      {emailChanged && <label className="trace-label block mt-3">Current Password to Change Email
        <input type={showPasswords ? 'text' : 'password'} autoComplete="current-password" value={profileData.current_password || ''} onChange={e => setField('current_password', e.target.value)} className="trace-control mt-2 w-full" />
      </label>}
    </div>
  );

  const profileHeader = (
      <div className="trace-profile-header bg-white dark:bg-gray-900 px-4 sm:px-6 pt-4 pb-0 flex flex-col border-b border-gray-100 dark:border-gray-700">
        <div className="flex flex-wrap items-start gap-4 pb-6">
          <div className="relative shrink-0">
            {avatarPreviewUrl ? (
              <img src={avatarPreviewUrl} alt="New profile picture preview" className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-md bg-gray-100 dark:bg-gray-800" />
            ) : (
              <UserAvatar user={user} overridePath={avatarPath} className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-md bg-gray-100 dark:bg-gray-800" />
            )}
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving}
              aria-label="Change profile picture"
              className="trace-profile-camera trace-button-lift trace-action absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#15803d] enabled:hover:bg-[#166534] text-white flex items-center justify-center shadow-md transition-colors"
            >
              {isStudent ? <><span className="absolute inset-0"><StudentIcon name="profile-f6627" /></span><span className="relative"><StudentIcon name="profile-c9ee8" /></span></> : isAdmin ? <><span className="absolute inset-0"><AdminIcon name="profile-camera-badge" /></span><span className="relative"><AdminIcon name="profile-camera" /></span></> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}
            </Button>
          </div>
          <div className="flex flex-col flex-1 basis-48 min-w-0 pt-1">
            <h3 className="text-xl font-display font-black text-gray-900 dark:text-gray-100 leading-tight select-text break-words">{user?.full_name || '—'}</h3>
            {(isAdmin || isStudent) ? <div className="mt-2 flex flex-wrap gap-2"><span className="trace-admin-badge trace-admin-badge-green uppercase">{roleLabel}</span><span className="trace-admin-badge trace-admin-badge-neutral font-mono">{user?.student_id}</span></div> : <p className="text-xs font-bold text-[#15803d] dark:text-green-300 uppercase tracking-wider mt-0.5">{roleLabel} {user?.student_id && `· ${user.student_id}`}</p>}

          </div>
          {isStudent && (
              <div className="trace-student-profile-completion">
                <div className="flex flex-wrap gap-2 justify-between text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1.5">
                  <span>Profile completion</span>
                  <span className={progress === 100 ? "text-[#15803d] dark:text-green-300" : "text-amber-600 dark:text-amber-300"}>{progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <ProgressFill value={progress} className={progress === 100 ? 'bg-[#15803d]' : 'bg-amber-500 dark:bg-amber-500'} />
                </div>
              </div>
            )}
        </div>
        
        <FileUploadField pickerOnly label="Profile picture" inputRef={fileInputRef} file={avatarFile} onChange={onAvatarChange} accept="image/jpeg,image/png,image/webp" maxBytes={2 * 1024 * 1024} disabled={saving} />
        {/* Tabs */}
        {isStudent ? (
          <div className="flex flex-wrap gap-3 sm:gap-6 border-b border-gray-100 dark:border-gray-700 px-2 mt-2">
            <Button
              type="button"
              onClick={() => setActiveTab('personal')}
              aria-pressed={activeTab === 'personal'}
              className={`trace-tab trace-student-profile-tab ${activeTab === 'personal' ? 'text-[#15803d] dark:text-green-300 border-b-2 border-[#15803d]' : 'text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
            >
              Personal Info
              {missingPersonal && <>
                <span aria-hidden="true" className="ml-2 inline-flex items-center justify-center rounded-full bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200 px-1.5 text-xs font-bold">!</span>
                <span className="sr-only"> — Required information missing</span>
              </>}
            </Button>
            <Button
              type="button"
              onClick={() => setActiveTab('educational')}
              aria-pressed={activeTab === 'educational'}
              className={`trace-tab trace-student-profile-tab ${activeTab === 'educational' ? 'text-[#15803d] dark:text-green-300 border-b-2 border-[#15803d]' : 'text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
            >
              Educational Background
              {missingEdu && <>
                <span aria-hidden="true" className="ml-2 inline-flex items-center justify-center rounded-full bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200 px-1.5 text-xs font-bold">!</span>
                <span className="sr-only"> — Required information missing</span>
              </>}
            </Button>
            <Button
              type="button"
              onClick={() => setActiveTab('security')}
              aria-pressed={activeTab === 'security'}
              className={`trace-tab trace-student-profile-tab ${activeTab === 'security' ? 'text-[#15803d] dark:text-green-300 border-b-2 border-[#15803d]' : 'text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
            >
              Security
            </Button>
          </div>
        ) : (
           <div className="flex flex-wrap gap-3 sm:gap-6 border-b border-gray-100 dark:border-gray-700 px-2 mt-2">
             {['personal', 'security'].map(tab => <Button key={tab} type="button" aria-pressed={activeTab === tab} onClick={() => setActiveTab(tab)} className={isAdmin ? 'trace-action trace-admin-profile-tab ' + (activeTab === tab ? 'bg-trace-emerald text-white' : 'text-slate-500 dark:text-gray-300') : 'trace-tab relative ' + (activeTab === tab ? 'text-[#15803d] dark:text-green-300 border-b-2 border-[#15803d]' : 'text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300')}>{tab === 'personal' ? 'Personal Info' : 'Security'}</Button>)}
           </div>
        )}
      </div>

  );

  return (
    <ModalShell
      open
      onClose={onClose}
      title="Edit Profile"
      panelClassName={isStudent ? "trace-modal-panel trace-student-edit-profile max-w-[720px]" : isAdmin ? "trace-modal-panel trace-admin-main-dialog trace-admin-edit-profile max-w-[640px]" + (activeTab === 'security' ? ' trace-admin-profile-security' : '') : undefined}
      headerContent={(isAdmin || isStudent) ? profileHeader : undefined}
      maxWidth={user?.role === 'admin' ? 'max-w-[640px]' : 'max-w-xl'}
      bodyClassName={(isAdmin || isStudent) ? "trace-modal-body min-h-0 flex-1 overflow-y-auto overscroll-contain p-0" : "min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4"}
      closeButtonIcon={
        isStudent ? <StudentIcon name="profile-e5af3" /> : isAdmin ? <AdminIcon name="profile-x" /> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
      }
      closeButtonAriaLabel="Close profile"
      footer={activeTab !== 'appearance' && ((isAdmin || isStudent) ? <div className="flex flex-wrap items-center justify-between gap-3"><p className="trace-admin-caption">{activeTab !== 'security' ? '* Required' : 'Changes apply when you save'}</p><div className="trace-actions"><Button type="button" disabled={saving} onClick={onClose} className="trace-button trace-button-secondary">Cancel</Button><Button disabled={saving} type="submit" form="profile-settings-form" className="trace-button trace-button-primary">{saving ? 'Saving...' : 'Save Profile'}</Button></div></div> : <Button disabled={saving} type="submit" form="profile-settings-form" className="trace-button trace-button-primary w-full">{saving ? 'Saving...' : 'Save Profile'}</Button>)}
    >
      <ConfirmDialog open={!!confirmation}
        title={confirmation === 'email' ? 'Verify Email Address' : confirmation === 'profile' ? 'Confirm Profile Save' : confirmation === 'browser' ? 'Use Shared-Computer Verification' : 'Log Out Other Devices'}
        message={confirmation === 'profile'
          ? ['Save your profile changes and selected picture?', isStudent && profileData.first_name && profileData.last_name ? `Name on new receipts: ${receiptStudentName({ ...user, ...profileData })}` : null, error ? <span role="alert">{error}</span> : null]
          : confirmation === 'email' ? [`Send a verification link to ${emailDraft?.email}? Your current address stays active until verified. Other profile changes will remain unsaved.`, verificationError ? <span role="alert">{verificationError}</span> : null]
          : confirmation === 'browser' ? 'Forget the personal-browser preference here? Your next login will require verification. This keeps your current session open.' : 'Log out of all other active sessions?'}
        confirmLabel={confirmation === 'email' ? 'Send Verification Link' : confirmation === 'profile' ? 'Save Profile' : confirmation === 'browser' ? 'Use Shared Verification' : 'Log Out Other Devices'}
        variant={confirmation === 'sessions' ? 'destructive' : 'neutral'}
        loading={saving || verifyingEmail || loggingOut} onConfirm={confirmAction} onCancel={() => setConfirmation(null)} />
      <DashboardAlerts
        dismissalKey={activeTab}
        success={sessionFeedback.success}
        error={sessionFeedback.error}
        onDismiss={() => setSessionFeedback({ success: '', error: '' })}
      />
      {!isAdmin && !isStudent && profileHeader}

      <div className="trace-section-body">
        {success && <div className="mb-6 rounded-xl bg-green-50 dark:bg-green-950/40 border border-green-100 dark:border-green-800 px-4 py-3 text-sm font-semibold text-green-800 dark:text-green-300">{success}</div>}
        {error && <div className="trace-error mb-6">{error}</div>}

        <form ref={tabContentRef} id="profile-settings-form" onSubmit={stageProfileSave} className="space-y-6">
          {passwordError && <p role="alert" className="text-sm text-red-600 dark:text-red-300">{passwordError}</p>}
          {activeTab === 'personal' && (isStudent ? <StudentProfilePersonal user={user} profileData={profileData} setField={setField} saving={saving}>{emailControl}</StudentProfilePersonal> : (
            <div className="space-y-6">
              <div className="trace-form-grid">
                <div>
                  <label htmlFor="profile-phone_number" className="trace-label block mb-2">Phone Number <span className="text-red-500 dark:text-red-300">*</span></label>
                  <div className={isAdmin ? 'trace-admin-input-with-icon' : undefined}>{isAdmin && <AdminIcon name="profile-phone2" />}<PhoneInput {...fieldDescription('phone_number')} value={profileData.phone_number} onChange={(e) => setField('phone_number', e.target.value)} required className="trace-control w-full" /></div>
                  {fieldWarning('phone_number')}
                </div>
                {emailControl}
              </div>


              
            </div>
          ))}

          
          {activeTab === 'security' && (isStudent ? <StudentProfileSecurity user={user} profileData={profileData} setField={setField} showPasswords={showPasswords} onTogglePasswords={() => setShowPasswords(value => !value)} loggingOut={loggingOut} onLogout={() => setConfirmation('sessions')} securityLogs={securityLogs} saving={saving} /> : isAdmin ? <AdminProfileSecurity user={user} profileData={profileData} setField={setField} showPasswords={showPasswords} onTogglePasswords={() => setShowPasswords(value => !value)} personalBrowser={personalBrowser} onBrowserVerification={() => setConfirmation('browser')} loggingOut={loggingOut} onLogout={() => setConfirmation('sessions')} securityLogs={securityLogs} showActivity={showSecurityActivity} onToggleActivity={() => setShowSecurityActivity(value => !value)} saving={saving} /> : (
            <div className="space-y-6">
              <AuthenticatorSettings user={user} admin={isAdmin} />
              {['clerk', 'admin'].includes(user?.role) && <section aria-label="Browser verification" className="trace-section trace-section-body space-y-3">
                <h3 className="trace-admin-security-heading font-bold">{isAdmin && <span className="trace-admin-security-icon"><AdminIcon name="security-monitor" /></span>}Browser verification</h3>
                <p className="text-sm">{personalBrowser ? 'Personal-browser preference is saved until midnight Manila time.' : 'Shared-computer verification is the default. Verify each login; choose personal-browser trust during verification only on your own device.'}</p>
                {personalBrowser && <Button type="button" onClick={() => setConfirmation('browser')} className="trace-button trace-button-secondary">Use shared-computer verification</Button>}
              </section>}
              <div className="trace-section trace-section-body">
                <h3 className="trace-admin-security-heading text-sm font-black text-gray-900 dark:text-gray-100 mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">{isAdmin && <span className="trace-admin-security-icon"><AdminIcon name="security-lock1" /></span>}Change Password</h3>{isAdmin && <p className="trace-admin-caption mb-4">Use a strong password you don’t use anywhere else.</p>}
                <div className="trace-form-grid">
                  <div>
                    <label className="trace-label block mb-2">Current Password</label>
                    <input aria-label="Current Password" autoComplete="current-password" type={showPasswords ? 'text' : 'password'} value={profileData.current_password || ''} onChange={(e) => setField('current_password', e.target.value)} placeholder="Required to change email or password" className="trace-control w-full" />
                  </div>
                  <div>
                    <label className="trace-label block mb-2">New Password</label>
                    <input aria-label="New Password" autoComplete="new-password" maxLength={INPUT_LIMITS.password} type={showPasswords ? 'text' : 'password'} value={profileData.password} onChange={(e) => setField('password', e.target.value)} placeholder="Leave blank to keep current password" className="trace-control w-full" />
                    
                    {profileData.password && (
                      <div className="mt-2 text-[10px] font-bold uppercase tracking-widest grid grid-cols-2 gap-1">
                        <span className={profileData.password.length >= 8 ? 'text-green-600 dark:text-green-300' : 'text-gray-400 dark:text-gray-400'}>{profileData.password.length >= 8 ? '✓' : '○'} 8+ Characters</span>
                        <span className={/[A-Z]/.test(profileData.password) ? 'text-green-600 dark:text-green-300' : 'text-gray-400 dark:text-gray-400'}>{/[A-Z]/.test(profileData.password) ? '✓' : '○'} 1 Uppercase</span>
                        <span className={/[a-z]/.test(profileData.password) ? 'text-green-600 dark:text-green-300' : 'text-gray-400 dark:text-gray-400'}>{/[a-z]/.test(profileData.password) ? '✓' : '○'} 1 Lowercase</span>
                        <span className={/\d/.test(profileData.password) ? 'text-green-600 dark:text-green-300' : 'text-gray-400 dark:text-gray-400'}>{/\d/.test(profileData.password) ? '✓' : '○'} 1 Number</span>
                        <span className={/[@$!%*?&_]/.test(profileData.password) ? 'text-green-600 dark:text-green-300' : 'text-gray-400 dark:text-gray-400'}>{/[@$!%*?&_]/.test(profileData.password) ? '✓' : '○'} 1 Special Char</span>
                      </div>
                    )}
                  </div>
                </div>
                <Button type="button" aria-pressed={showPasswords} onClick={() => setShowPasswords(value => !value)} className="trace-button trace-button-secondary mt-3">{showPasswords ? 'Hide passwords' : 'Show passwords'}</Button>
                <p className="text-sm mt-3">{PASSWORD_REQUIREMENTS} You cannot reuse your current or last three passwords. Changing your password logs out other devices and keeps this browser signed in.</p>
              </div>
              <div className="trace-section trace-section-body">
                <h3 className="trace-admin-security-heading text-sm font-black text-gray-900 dark:text-gray-100 mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">{isAdmin && <span className="trace-admin-security-icon"><AdminIcon name="security-logout" /></span>}Session Management</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Log out of all other active sessions across all devices. You will remain logged in on this device.</p>
                <Button type="button" disabled={loggingOut} onClick={() => setConfirmation('sessions')} className="trace-button trace-button-danger">
                  {isAdmin && <AdminIcon name="security-logout1" />}Logout All Devices
                </Button>
              </div>
              <div className="trace-section trace-section-body">
                <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="trace-admin-security-heading text-sm font-black text-gray-900 dark:text-gray-100 mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">{isAdmin && <span className="trace-admin-security-icon"><AdminIcon name="security-activity" /></span>}Recent Security Activity</h3>{isAdmin && <Button type="button" aria-expanded={showSecurityActivity} onClick={() => setShowSecurityActivity(value => !value)} className="trace-button trace-button-secondary">{showSecurityActivity ? "Hide activity" : "View activity"}</Button>}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">View your recent logins, password changes, and other security events.</div>
                <div hidden={isAdmin && !showSecurityActivity} className="flex justify-center my-4">
                  
                <div className="mt-4 border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
                  <PaginatedTable label="security events" className="w-full text-left text-xs">
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
                        securityLogs.map((log, i) => (
                          <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{formatDateTime(log.created_at)}</td>
                            <td className="px-4 py-2 font-bold text-gray-700 dark:text-gray-300">{formatEventLabel(log.event_type)}</td>
                            <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{log.ip_address || 'Unknown'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </PaginatedTable>
                </div>

                </div>
              </div>
            </div>
          ))}

          {activeTab === 'educational' && isStudent && <StudentProfileEducation user={user} profileData={profileData} setField={setField} saving={saving} />}

        </form>
      </div>
    </ModalShell>
  );
}
