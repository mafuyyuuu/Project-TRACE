const fs = require('fs');

const modalContent = `import { useRef, useState, useMemo } from 'react';
import ModalShell from '@/components/ModalShell';
import UserAvatar from '@/components/UserAvatar';

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
  const [activeTab, setActiveTab] = useState('personal');

  const roleLabel =
    user?.role === 'admin'
      ? 'Registrar Admin'
      : user?.role === 'clerk'
        ? \`\${user?.desk_assignment || 'Staff'} Clerk\`
        : 'Student';
        
  const isStudent = user?.role === 'student' || user?.user_type === 'alumni' || user?.user_type === 'student';

  // PROF-02, PROF-03: Progress Calculation
  const { progress, missingPersonal, missingEdu } = useMemo(() => {
    if (!isStudent) return { progress: 100, missingPersonal: false, missingEdu: false };
    
    const requiredPersonal = ['phone_number', 'email', 'birth_date', 'place_of_birth', 'sex', 'civil_status', 'home_address'];
    if (profileData.sex === 'Female' && profileData.civil_status === 'Married') {
      requiredPersonal.push('maiden_name');
    }
    
    const requiredEdu = ['last_attendance_year', 'elem_school', 'elem_grad_year', 'jhs_school', 'jhs_grad_year', 'shs_school', 'shs_grad_year'];
    if (profileData.is_transfer_student) {
      requiredEdu.push('previous_school');
    }
    
    let filled = 0;
    let missingP = false;
    let missingE = false;
    
    requiredPersonal.forEach(f => {
      if (profileData[f] && String(profileData[f]).trim() !== '') filled++;
      else missingP = true;
    });
    
    requiredEdu.forEach(f => {
      if (profileData[f] && String(profileData[f]).trim() !== '') filled++;
      else missingE = true;
    });
    
    const total = requiredPersonal.length + requiredEdu.length;
    return {
      progress: Math.round((filled / total) * 100),
      missingPersonal: missingP,
      missingEdu: missingE
    };
  }, [profileData, isStudent]);

  return (
    <ModalShell
      open
      onClose={onClose}
      title="Account Settings"
      maxWidth="max-w-xl"
      backdropClassName="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200"
      panelClassName="bg-gray-50 rounded-2xl shadow-2xl w-full max-w-xl max-h-[calc(100dvh-2rem)] z-10 relative animate-slide-up flex flex-col overflow-hidden"
      closeButtonIcon={
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
      }
      closeButtonAriaLabel="Close settings"
      footer={
        <button
          disabled={saving}
          type="submit"
          form="profile-settings-form"
          className="w-full bg-[#15803d] hover:bg-[#166534] text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 shadow-md"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      }
    >
      <div className="bg-white px-6 pt-4 pb-0 flex flex-col border-b border-gray-100">
        <div className="flex items-start gap-4 pb-6">
          <div className="relative shrink-0">
            {avatarPreviewUrl ? (
              <img src={avatarPreviewUrl} alt="Preview" className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md bg-gray-100" />
            ) : (
              <UserAvatar user={user} overridePath={avatarPath} className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md bg-gray-100" />
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#15803d] hover:bg-[#166534] text-white flex items-center justify-center shadow-md transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </button>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { onAvatarChange(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
          <div className="flex flex-col flex-1 pt-1">
            <h3 className="text-xl font-display font-black text-gray-900 leading-tight">{user?.full_name || '—'}</h3>
            <p className="text-xs font-bold text-[#15803d] uppercase tracking-wider mt-0.5">{roleLabel} {user?.student_id && \`· \${user.student_id}\`}</p>
            
            {isStudent && (
              <div className="mt-3 w-full max-w-xs">
                <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                  <span>Profile Completion</span>
                  <span className={progress === 100 ? "text-[#15803d]" : "text-amber-600"}>{progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className={\`h-full rounded-full transition-all duration-500 \${progress === 100 ? 'bg-[#15803d]' : 'bg-amber-500'}\`} style={{ width: \`\${progress}%\` }}></div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Tabs */}
        {isStudent ? (
          <div className="flex gap-6 border-b border-gray-100 px-2 mt-2">
            <button
              type="button"
              onClick={() => setActiveTab('personal')}
              className={\`pb-3 text-xs font-bold uppercase tracking-widest transition-colors relative flex items-center gap-1.5 \${activeTab === 'personal' ? 'text-[#15803d] border-b-2 border-[#15803d]' : 'text-gray-400 hover:text-gray-600'}\`}
            >
              Personal & Security
              {missingPersonal && <span className="w-2 h-2 rounded-full bg-red-500 absolute -top-0.5 -right-2"></span>}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('educational')}
              className={\`pb-3 text-xs font-bold uppercase tracking-widest transition-colors relative flex items-center gap-1.5 \${activeTab === 'educational' ? 'text-[#15803d] border-b-2 border-[#15803d]' : 'text-gray-400 hover:text-gray-600'}\`}
            >
              Educational Background
              {missingEdu && <span className="w-2 h-2 rounded-full bg-red-500 absolute -top-0.5 -right-2"></span>}
            </button>
          </div>
        ) : (
           <div className="flex gap-6 border-b border-gray-100 px-2 mt-2">
             <button type="button" className="pb-3 text-xs font-bold uppercase tracking-widest text-[#15803d] border-b-2 border-[#15803d]">Personal & Security</button>
           </div>
        )}
      </div>

      <div className="p-6 overflow-y-auto max-h-[50vh]">
        {success && <div className="mb-6 rounded-xl bg-green-50 border border-green-100 px-4 py-3 text-sm font-semibold text-green-800">{success}</div>}
        {error && <div className="mb-6 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

        <form id="profile-settings-form" onSubmit={onSave} className="space-y-6">
          {activeTab === 'personal' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Phone Number <span className="text-red-500">*</span></label>
                  <input type="text" value={profileData.phone_number} onChange={(e) => setField('phone_number', e.target.value)} required className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email Address <span className="text-red-500">*</span></label>
                  <input type="email" value={profileData.email} onChange={(e) => setField('email', e.target.value)} required className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none" />
                </div>
              </div>

              {isStudent && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Birth Date <span className="text-red-500">*</span></label>
                      <input type="date" value={profileData.birth_date} onChange={(e) => setField('birth_date', e.target.value)} required className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Place of Birth <span className="text-red-500">*</span></label>
                      <input type="text" value={profileData.place_of_birth} onChange={(e) => setField('place_of_birth', e.target.value)} required className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Sex <span className="text-red-500">*</span></label>
                      <select value={profileData.sex} onChange={(e) => setField('sex', e.target.value)} required className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none">
                        <option value="">Select...</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Civil Status <span className="text-red-500">*</span></label>
                      <select value={profileData.civil_status} onChange={(e) => setField('civil_status', e.target.value)} required className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none">
                        <option value="">Select...</option>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Widowed">Widowed</option>
                        <option value="Divorced">Divorced</option>
                        <option value="Separated">Separated</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Extension Name</label>
                      <input type="text" placeholder="Jr., III, etc." value={profileData.extension_name} onChange={(e) => setField('extension_name', e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none" />
                    </div>
                  </div>

                  {profileData.sex === 'Female' && profileData.civil_status === 'Married' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Maiden Name <span className="text-red-500">*</span></label>
                      <input type="text" value={profileData.maiden_name} onChange={(e) => setField('maiden_name', e.target.value)} required className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none" />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Home Address <span className="text-red-500">*</span></label>
                    <textarea value={profileData.home_address} onChange={(e) => setField('home_address', e.target.value)} required rows="2" className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none resize-none"></textarea>
                  </div>
                </>
              )}

              <div className="pt-4 border-t border-gray-200 border-dashed">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Change Password</label>
                <input type="password" value={profileData.password} onChange={(e) => setField('password', e.target.value)} placeholder="Leave blank to keep current password" className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none" />
              </div>
            </div>
          )}

          {activeTab === 'educational' && isStudent && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 border border-gray-200 rounded-2xl">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{user?.user_type === 'alumni' ? 'Graduation Year' : 'Last Attendance Year'} <span className="text-red-500">*</span></label>
                  <input type="number" min="1950" max="2100" value={profileData.last_attendance_year} onChange={(e) => setField('last_attendance_year', e.target.value)} required className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Transfer Student?</label>
                  <select value={profileData.is_transfer_student ? 'yes' : 'no'} onChange={(e) => setField('is_transfer_student', e.target.value === 'yes')} className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none">
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </div>
              </div>

              {profileData.is_transfer_student && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Previous School <span className="text-red-500">*</span></label>
                  <input type="text" value={profileData.previous_school} onChange={(e) => setField('previous_school', e.target.value)} required className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none" />
                </div>
              )}

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-widest border-b border-gray-200 pb-2">Elementary</h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="sm:col-span-3">
                    <input type="text" placeholder="School Name *" required value={profileData.elem_school} onChange={(e) => setField('elem_school', e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none" />
                  </div>
                  <div>
                    <input type="number" placeholder="Year *" required value={profileData.elem_grad_year} onChange={(e) => setField('elem_grad_year', e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none" />
                  </div>
                </div>

                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-widest border-b border-gray-200 pb-2 pt-2">Junior High School</h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="sm:col-span-3">
                    <input type="text" placeholder="School Name *" required value={profileData.jhs_school} onChange={(e) => setField('jhs_school', e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none" />
                  </div>
                  <div>
                    <input type="number" placeholder="Year *" required value={profileData.jhs_grad_year} onChange={(e) => setField('jhs_grad_year', e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none" />
                  </div>
                </div>

                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-widest border-b border-gray-200 pb-2 pt-2">Senior High School</h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="sm:col-span-3">
                    <input type="text" placeholder="School Name *" required value={profileData.shs_school} onChange={(e) => setField('shs_school', e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none" />
                  </div>
                  <div>
                    <input type="number" placeholder="Year *" required value={profileData.shs_grad_year} onChange={(e) => setField('shs_grad_year', e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none" />
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
`;

fs.writeFileSync('frontend/src/components/ProfileSettingsModal.jsx', modalContent);
