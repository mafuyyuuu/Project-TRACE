import { fullNameFromParts, namePartsError } from '@/utils/receiptStudentName';
import AdminIcon from '@/features/admin/components/AdminIcon';
import PhoneInput from '@/components/PhoneInput';
import { normalizePhoneNumber, phoneNumberError } from '@/utils/phoneNumber';
import Button from '@/components/Button';
import { PASSWORD_REQUIREMENTS, validNewPassword } from '@/utils/passwordPolicy';
import { INPUT_LIMITS } from '@/utils/inputLimits';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useState } from 'react';
import ModalShell from '@/components/ModalShell';

const TABS = [
  { key: 'personal', label: 'Personal Information' },
  { key: 'account', label: 'Account Settings' },
];

const inputClass =
  "trace-control w-full";
const disabledInputClass =
  "trace-control w-full cursor-not-allowed";

function Label({ children }) {
  return <label className="trace-label block mb-1.5">{children}</label>;
}

function Note({ children }) {
  return <p className="text-[10px] text-gray-400 dark:text-gray-400 mt-1 leading-relaxed">{children}</p>;
}

/**
 * Edit a staff account. Only ever reachable for role !== 'student', so no
 * internal role branching is needed.
 *
 * Personal Information and Account Settings each mix real, working fields
 * (backed by PUT /api/maintenance/staff/:id) with fields the ticket asked
 * for that the schema doesn't support yet — those render disabled with a
 * short note rather than being silently dropped or faked.
 */
export default function UserEditModal({ open, onClose, user, onSave, saving, colleges = [] }) {
  const [activeTab, setActiveTab] = useState('personal');
  const [validationError, setValidationError] = useState('');
  const [editToConfirm, setEditToConfirm] = useState(null);
  const [nameParts,setNameParts] = useState({first_name:user?.first_name || '',middle_name:user?.middle_name || '',last_name:user?.last_name || ''});
  const assembledName = fullNameFromParts(nameParts);
  const fullName = assembledName ? [assembledName,user?.extension_name?.trim()].filter(Boolean).join(' ') : user?.full_name || '';
  const namesChanged = ['first_name','middle_name','last_name'].some(key => nameParts[key] !== (user?.[key] || ''));
  const [studyLoad,setStudyLoad] = useState(user?.study_load || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || '');
  const [email, setEmail] = useState(user?.email || '');
  const [collegeId, setCollegeId] = useState(user?.college_id || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  if (!user) return null;

  const passwordMismatch = newPassword.length > 0 && newPassword !== confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (passwordMismatch) return;
    if (newPassword && !validNewPassword(newPassword)) { setValidationError(PASSWORD_REQUIREMENTS); return; }
    const phoneError = phoneNumberError(phoneNumber, { required: false });
    if (phoneNumber !== (user.phone_number || '') && phoneError) { setValidationError(phoneError); return; }
    if (namesChanged) { const problem = namePartsError(nameParts,{full_name:fullName}); if (problem || !nameParts.first_name.trim() || !nameParts.last_name.trim()) { setValidationError(problem || 'Enter both First Name and Last Name.'); return; } }
    setValidationError('');

    const payload = {};
    if (namesChanged) for(const key of ['first_name','middle_name','last_name']) payload[key] = nameParts[key].trim();
    if (studyLoad !== (user.study_load || '')) payload.study_load = studyLoad;
    if (fullName !== user.full_name) payload.full_name = fullName;
    if (email !== (user.email || '')) payload.email = email;
    if (phoneNumber !== (user.phone_number || '')) payload.phone_number = normalizePhoneNumber(phoneNumber) || '';
    if (user.role !== 'student' && newPassword) payload.password = newPassword;
    if (String(collegeId) !== String(user.college_id || '')) payload.college_id = collegeId ? Number(collegeId) : null;

    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }
    setEditToConfirm({ id: user.id, payload });
  };

  return (
    <ModalShell
      closeButtonIcon={<AdminIcon name="close" />}
      open={open}
      onClose={onClose}
      title="Edit User"
      panelClassName="trace-modal-panel trace-admin-main-dialog trace-admin-edit-user max-w-[640px]"
      subtitle="Update personal information and account details."
      maxWidth="max-w-[640px]"
      footer={
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="trace-button trace-button-secondary flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-user-form"
            disabled={saving || passwordMismatch}
            className="trace-button trace-button-primary flex-1"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      }
    >
      <ConfirmDialog open={!!editToConfirm} title="Confirm User Changes"
        message={`Save changes to ${user.full_name}'s account?`} confirmLabel="Save Changes"
        loading={saving} onCancel={() => setEditToConfirm(null)}
        onConfirm={async () => {
          if (await onSave(editToConfirm.id, editToConfirm.payload)) setEditToConfirm(null);
        }} />
      <div className="trace-admin-segmented-tabs">
        {TABS.map((t) => (
          <Button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            aria-pressed={activeTab === t.key}
            className={'trace-action ' + (activeTab === t.key ? 'trace-admin-segment-active' : '')}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {validationError && <p role="alert" className="text-sm text-red-600 dark:text-red-300 mb-3">{validationError}</p>}
      <form id="edit-user-form" onSubmit={handleSubmit} className="space-y-4">
        {activeTab === 'personal' && (
          <>
            <div className="trace-form-grid">{[['first_name','First Name'],['middle_name','Middle Name (optional)'],['last_name','Last Name']].map(([key,label]) => <div key={key}><label htmlFor={'admin-edit-'+key} className="trace-label block mb-1.5">{label}</label><input id={'admin-edit-'+key} maxLength={INPUT_LIMITS.name} className={inputClass} disabled={saving} value={nameParts[key]} onChange={event => setNameParts(current => ({...current,[key]:event.target.value}))} /></div>)}</div>
            <div><label htmlFor="admin-edit-full-name" className="trace-label block mb-1.5">Full Name</label><input id="admin-edit-full-name" className={inputClass} value={fullName} readOnly /><Note>Assembled from the saved name parts. Enter compound given names and surnames together.</Note></div>
            {user.role === 'student' && user.user_type !== 'alumni' && <div><label htmlFor="admin-edit-study-load" className="trace-label block mb-1.5">Type of Student</label><select id="admin-edit-study-load" className={inputClass} value={studyLoad} disabled={saving} onChange={event => setStudyLoad(event.target.value)}><option value="" disabled>Not recorded</option><option value="regular">Regular</option><option value="irregular">Irregular</option></select></div>}
            <div>
              <label className="trace-label block mb-2" htmlFor="edit-college">College / Department</label>
              <select id="edit-college" className={inputClass} value={collegeId} onChange={e => setCollegeId(e.target.value)}>
                <option value="">None</option>
                {collegeId && !colleges.some(c => String(c.id) === String(collegeId)) && <option value={collegeId}>Current college ({collegeId})</option>}
                {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="trace-label block mb-2" htmlFor="edit-program">Program</label>
              <input maxLength={INPUT_LIMITS.program} id="edit-program" className={inputClass} value={user.program || ''} readOnly />
            </div>
          </>
        )}

        {activeTab === 'account' && (
          <>
            <div>
              <Label>Username</Label>
              <input className={disabledInputClass} disabled value={user.student_id || ''} />
              <Note>Sign-in uses the Employee/Student ID shown above.</Note>
            </div>

            <div>
              <Label>Contact Number</Label>
              <PhoneInput className={inputClass} value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
            </div>

            {user.role !== 'student' && <>
            <div>
              <Label>New Password</Label>
              <Note>{PASSWORD_REQUIREMENTS}</Note>
              <input maxLength={INPUT_LIMITS.password}
                type="password"
                className={inputClass}
                placeholder="Leave blank to keep current"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <Label>Confirm Password</Label>
              <input maxLength={INPUT_LIMITS.password}
                type="password"
                className={inputClass}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {passwordMismatch && <p className="text-[10px] text-red-600 dark:text-red-300 mt-1 font-semibold">Passwords do not match.</p>}
            </div>

            </>}

            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
              <Label>Email Address</Label>
              <input type="email" maxLength={INPUT_LIMITS.email} className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />

            </div>
          </>
        )}
      </form>
    </ModalShell>
  );
}
