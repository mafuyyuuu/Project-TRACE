import { INPUT_LIMITS } from '@/utils/inputLimits';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useState } from 'react';
import ModalShell from '@/components/ModalShell';

const TABS = [
  { key: 'personal', label: 'Personal Information' },
  { key: 'account', label: 'Account Settings' },
];

const inputClass =
  'w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#15803d]/20 focus:bg-white dark:focus:bg-gray-900 transition-all';
const disabledInputClass =
  'w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-xs font-semibold text-gray-400 dark:text-gray-400 cursor-not-allowed';

function Label({ children }) {
  return <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">{children}</label>;
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
  const [editToConfirm, setEditToConfirm] = useState(null);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || '');
  const [email, setEmail] = useState(user?.email || '');
  const [collegeId, setCollegeId] = useState(user?.college_id || '');
  const [course, setCourse] = useState(user?.course || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  if (!user) return null;

  const passwordMismatch = newPassword.length > 0 && newPassword !== confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (passwordMismatch) return;

    const payload = {};
    if (fullName !== user.full_name) payload.full_name = fullName;
    if (email !== (user.email || '')) payload.email = email;
    if (phoneNumber !== (user.phone_number || '')) payload.phone_number = phoneNumber;
    if (user.role !== 'student' && newPassword) payload.password = newPassword;
    if (String(collegeId) !== String(user.college_id || '')) payload.college_id = collegeId ? Number(collegeId) : null;
    if (course !== (user.course || '')) payload.course = course;

    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }
    setEditToConfirm({ id: user.id, payload });
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Edit User"
      maxWidth="max-w-xl"
      footer={
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-5 py-3 rounded-2xl text-xs font-bold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-user-form"
            disabled={saving || passwordMismatch}
            className="flex-1 px-5 py-3 rounded-2xl text-xs font-bold bg-[#15803d] hover:bg-[#166534] text-white shadow-sm disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      }
    >
      <ConfirmDialog open={!!editToConfirm} title="Confirm User Changes"
        message={`Save changes to ${user.full_name}'s account?`} confirmLabel="Save Changes"
        loading={saving} onCancel={() => setEditToConfirm(null)}
        onConfirm={async () => {
          if (await onSave(editToConfirm.id, editToConfirm.payload)) setEditToConfirm(null);
        }} />
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={`px-5 py-2.5 text-xs font-bold rounded-t-xl transition-colors ${
              activeTab === t.key
                ? 'bg-white dark:bg-gray-900 border border-b-white border-gray-200 dark:border-gray-700 text-[#15803d] dark:text-green-300 -mb-px'
                : 'text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form id="edit-user-form" onSubmit={handleSubmit} className="space-y-4">
        {activeTab === 'personal' && (
          <>
            <div>
              <Label>Full Name</Label>
              <input maxLength={INPUT_LIMITS.name} className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-bold mb-2" htmlFor="edit-college">College / Department</label>
              <select id="edit-college" className={inputClass} value={collegeId} onChange={e => setCollegeId(e.target.value)}>
                <option value="">None</option>
                {collegeId && !colleges.some(c => String(c.id) === String(collegeId)) && <option value={collegeId}>Current college ({collegeId})</option>}
                {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-2" htmlFor="edit-program">Program</label>
              <input maxLength={INPUT_LIMITS.program} id="edit-program" className={inputClass} value={course} onChange={e => setCourse(e.target.value)} />
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
              <input maxLength={INPUT_LIMITS.phone} className={inputClass} value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
            </div>

            {user.role !== 'student' && <>
            <div>
              <Label>New Password</Label>
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
