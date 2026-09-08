import { useState } from 'react';
import ModalShell from '@/components/ModalShell';

const TABS = [
  { key: 'personal', label: 'Personal Information' },
  { key: 'account', label: 'Account Settings' },
];

const inputClass =
  'w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#15803d]/20 focus:bg-white transition-all';
const disabledInputClass =
  'w-full bg-gray-100 border border-gray-200 rounded-xl p-2.5 text-xs font-semibold text-gray-400 cursor-not-allowed';

function Label({ children }) {
  return <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">{children}</label>;
}

function Note({ children }) {
  return <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">{children}</p>;
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
export default function UserEditModal({ open, onClose, user, onSave, saving }) {
  const [activeTab, setActiveTab] = useState('personal');
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || '');
  const [email, setEmail] = useState(user?.email || '');
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
    if (newPassword) payload.password = newPassword;

    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }
    await onSave(user.id, payload);
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
            className="flex-1 px-5 py-3 rounded-2xl text-xs font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
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
      <div className="flex gap-2 border-b border-gray-200 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={`px-5 py-2.5 text-xs font-bold rounded-t-xl transition-colors ${
              activeTab === t.key
                ? 'bg-white border border-b-white border-gray-200 text-[#15803d] -mb-px'
                : 'text-gray-400 hover:text-gray-600'
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
              <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>First Name</Label>
                <input className={disabledInputClass} disabled placeholder="Not tracked yet" />
              </div>
              <div>
                <Label>Middle Name</Label>
                <input className={disabledInputClass} disabled placeholder="Not tracked yet" />
              </div>
              <div>
                <Label>Last Name</Label>
                <input className={disabledInputClass} disabled placeholder="Not tracked yet" />
              </div>
              <div>
                <Label>Suffix</Label>
                <input className={disabledInputClass} disabled placeholder="Not tracked yet" />
              </div>
            </div>
            <Note>Name is stored as a single field — these will work once the schema supports split names.</Note>

            <div>
              <Label>Position</Label>
              <input className={disabledInputClass} disabled placeholder="Not tracked yet" />
            </div>
            <div>
              <Label>Department</Label>
              <select className={disabledInputClass} disabled><option>Not tracked yet</option></select>
            </div>
            <div>
              <Label>Appointment</Label>
              <select className={disabledInputClass} disabled><option>Not tracked yet</option></select>
            </div>
            <Note>Not tracked yet — these will work once the schema supports them.</Note>
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
              <input className={inputClass} value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
            </div>

            <div>
              <Label>New Password</Label>
              <input
                type="password"
                className={inputClass}
                placeholder="Leave blank to keep current"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <Label>Confirm Password</Label>
              <input
                type="password"
                className={inputClass}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {passwordMismatch && <p className="text-[10px] text-red-600 mt-1 font-semibold">Passwords do not match.</p>}
            </div>

            <div className="pt-2 border-t border-gray-100">
              <Label>Email Address</Label>
              <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
              <div className="flex items-end gap-3 mt-3">
                <button type="button" disabled className="px-4 py-2.5 rounded-xl text-xs font-bold border border-gray-200 text-gray-400 bg-gray-100 cursor-not-allowed whitespace-nowrap">
                  Resend
                </button>
                <div className="flex-1">
                  <input className={disabledInputClass} disabled placeholder="6-digit code" maxLength={6} />
                </div>
                <button type="button" disabled className="px-4 py-2.5 rounded-xl text-xs font-bold border border-gray-200 text-gray-400 bg-gray-100 cursor-not-allowed whitespace-nowrap">
                  Verify
                </button>
              </div>
              <Note>Email verification isn't available yet.</Note>
            </div>
          </>
        )}
      </form>
    </ModalShell>
  );
}
