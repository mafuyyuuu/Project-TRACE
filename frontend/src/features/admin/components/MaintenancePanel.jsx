import { useState } from 'react';
import useMaintenance from '@/features/admin/useMaintenance';
import DashboardLoading from '@/components/DashboardLoading';
import DashboardAlerts from '@/components/DashboardAlerts';

const DESKS = ['Finance', 'Window 1', 'Secretary', 'Admin Office', 'Receiving Desk', 'Records Desk'];
const SECTIONS = [
  { key: 'staff', label: 'Staff' },
  { key: 'documentTypes', label: 'Document Types' },
  { key: 'colleges', label: 'Colleges' },
];

const inputClass =
  'w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#15803d]/20 focus:bg-white transition-all';

/** Active/Inactive pill — "deleted" entries are deactivated, never removed. */
function StatusBadge({ active }) {
  return (
    <span
      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
        active
          ? 'bg-emerald-50 text-[#15803d] border-emerald-100'
          : 'bg-gray-100 text-gray-500 border-gray-200'
      }`}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

/**
 * Admin Maintenance: CRUD for Staff, Document Types and Colleges.
 *
 * Deactivating hides an entry from the dropdowns students and clerks see, while
 * leaving every historical record that references it intact and restorable.
 */
export default function MaintenancePanel({ user, currentTab }) {
  const m = useMaintenance(user, currentTab);
  const [section, setSection] = useState('staff');
  const [form, setForm] = useState({});

  if (m.loading) return <DashboardLoading />;

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const resetForm = () => setForm({});

  const submitStaff = async (e) => {
    e.preventDefault();
    const ok = await m.createStaff({
      employee_id: form.employee_id,
      full_name: form.full_name,
      email: form.email,
      password: form.password,
      role: form.role || 'clerk',
      desk_assignment: form.desk_assignment || 'Finance',
    });
    if (ok) resetForm();
  };

  const submitDocType = async (e) => {
    e.preventDefault();
    const ok = await m.createDocumentType({
      name: form.dt_name,
      base_fee: form.dt_fee,
      fee_rule: form.dt_rule || 'flat',
      requires_attachment: Boolean(form.dt_attach),
      attachment_label: form.dt_attach ? form.dt_label : null,
    });
    if (ok) resetForm();
  };

  const submitCollege = async (e) => {
    e.preventDefault();
    const ok = await m.createCollege({ name: form.c_name, short_code: form.c_code });
    if (ok) resetForm();
  };

  return (
    <>
      <DashboardAlerts success={m.success} error={m.error} />

      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl sm:text-3xl font-display font-black text-gray-900 tracking-tight">
            System <span className="text-[#15803d]">Maintenance</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1 font-semibold">
            Manage staff accounts, document types and colleges. Deactivating hides an entry from new
            requests without affecting existing records.
          </p>
        </div>

        {/* Section switcher */}
        <div className="flex gap-2 border-b border-gray-200">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => { setSection(s.key); resetForm(); }}
              className={`px-5 py-2.5 text-xs font-bold rounded-t-xl transition-colors ${
                section === s.key
                  ? 'bg-white border border-b-white border-gray-200 text-[#15803d] -mb-px'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {s.label} ({m[s.key].length})
            </button>
          ))}
        </div>

        {/* ---------------------------------------------------------------- Staff */}
        {section === 'staff' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <form onSubmit={submitStaff} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 space-y-3 h-fit">
              <h3 className="text-sm font-bold text-gray-900 mb-2">Add Staff Account</h3>

              <input className={inputClass} placeholder="Employee ID *" required
                value={form.employee_id || ''} onChange={(e) => set('employee_id', e.target.value)} />
              <input className={inputClass} placeholder="Full Name *" required
                value={form.full_name || ''} onChange={(e) => set('full_name', e.target.value)} />
              <input className={inputClass} type="email" placeholder="Email"
                value={form.email || ''} onChange={(e) => set('email', e.target.value)} />

              <select className={`${inputClass} cursor-pointer`} value={form.role || 'clerk'}
                onChange={(e) => set('role', e.target.value)}>
                <option value="clerk">Clerk</option>
                <option value="admin">Administrator</option>
              </select>

              <select className={`${inputClass} cursor-pointer`} value={form.desk_assignment || 'Finance'}
                onChange={(e) => set('desk_assignment', e.target.value)}>
                {DESKS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>

              <div>
                <input className={inputClass} type="password" placeholder="Temporary password *" required minLength={8}
                  value={form.password || ''} onChange={(e) => set('password', e.target.value)} />
                <p className="text-[10px] text-gray-400 mt-1.5 leading-relaxed">
                  At least 8 characters. The user must replace it at first login, so it is never a
                  permanent credential.
                </p>
              </div>

              <button type="submit" disabled={m.saving}
                className="w-full py-3 bg-[#15803d] hover:bg-[#166534] disabled:opacity-60 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all">
                {m.saving ? 'Saving...' : 'Create Account'}
              </button>
            </form>

            <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">Staff Accounts</h3>
              </div>
              <div className="max-h-[32rem] overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      <th className="py-3 px-5">Name</th>
                      <th className="py-3">Desk</th>
                      <th className="py-3">Role</th>
                      <th className="py-3">Status</th>
                      <th className="py-3 pr-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.staff.map((s) => (
                      <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="py-3 px-5">
                          <div className="text-xs font-bold text-gray-900">{s.full_name}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{s.student_id}</div>
                          {Boolean(s.must_change_password) && (
                            <span className="text-[9px] font-bold text-amber-600">Must change password</span>
                          )}
                        </td>
                        <td className="py-3 text-xs text-gray-600">{s.desk_assignment || '—'}</td>
                        <td className="py-3 text-xs text-gray-600 capitalize">{s.role}</td>
                        <td className="py-3"><StatusBadge active={s.is_active} /></td>
                        <td className="py-3 pr-5 text-right">
                          <button
                            onClick={() => m.setStaffActive(s.id, !s.is_active)}
                            disabled={m.saving || s.id === user.id}
                            title={s.id === user.id ? 'You cannot deactivate your own account' : ''}
                            className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {s.is_active ? 'Deactivate' : 'Restore'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------- Document types */}
        {section === 'documentTypes' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <form onSubmit={submitDocType} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 space-y-3 h-fit">
              <h3 className="text-sm font-bold text-gray-900 mb-2">Add Document Type</h3>

              <input className={inputClass} placeholder="Name *" required
                value={form.dt_name || ''} onChange={(e) => set('dt_name', e.target.value)} />
              <input className={inputClass} type="number" min="0" step="0.01" placeholder="Base fee (₱)"
                value={form.dt_fee ?? ''} onChange={(e) => set('dt_fee', e.target.value)} />

              <select className={`${inputClass} cursor-pointer`} value={form.dt_rule || 'flat'}
                onChange={(e) => set('dt_rule', e.target.value)}>
                <option value="flat">Flat fee</option>
                <option value="per_semester_block">Per 4-semester block</option>
              </select>

              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                <input type="checkbox" className="accent-[#15803d]"
                  checked={Boolean(form.dt_attach)} onChange={(e) => set('dt_attach', e.target.checked)} />
                Requires an attachment
              </label>

              {form.dt_attach && (
                <input className={inputClass} placeholder="Attachment label"
                  value={form.dt_label || ''} onChange={(e) => set('dt_label', e.target.value)} />
              )}

              <button type="submit" disabled={m.saving}
                className="w-full py-3 bg-[#15803d] hover:bg-[#166534] disabled:opacity-60 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all">
                {m.saving ? 'Saving...' : 'Create Type'}
              </button>
            </form>

            <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">Document Types</h3>
                <p className="text-[10px] text-gray-400 mt-1">
                  Fees apply to new requests only. A type already used by documents cannot be renamed.
                </p>
              </div>
              <div className="max-h-[32rem] overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      <th className="py-3 px-5">Type</th>
                      <th className="py-3">Fee</th>
                      <th className="py-3">Attachment</th>
                      <th className="py-3">Status</th>
                      <th className="py-3 pr-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.documentTypes.map((d) => (
                      <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="py-3 px-5 text-xs font-bold text-gray-900">{d.name}</td>
                        <td className="py-3 text-xs text-gray-600">
                          ₱{Number(d.base_fee).toFixed(2)}
                          {d.fee_rule === 'per_semester_block' && (
                            <span className="text-[9px] text-gray-400 block">per 4 sems</span>
                          )}
                        </td>
                        <td className="py-3 text-xs text-gray-600">{d.requires_attachment ? 'Required' : '—'}</td>
                        <td className="py-3"><StatusBadge active={d.is_active} /></td>
                        <td className="py-3 pr-5 text-right">
                          <button
                            onClick={() => m.setDocumentTypeActive(d.id, !d.is_active)}
                            disabled={m.saving}
                            className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40"
                          >
                            {d.is_active ? 'Deactivate' : 'Restore'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- Colleges */}
        {section === 'colleges' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <form onSubmit={submitCollege} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 space-y-3 h-fit">
              <h3 className="text-sm font-bold text-gray-900 mb-2">Add College</h3>
              <input className={inputClass} placeholder="College name *" required
                value={form.c_name || ''} onChange={(e) => set('c_name', e.target.value)} />
              <input className={inputClass} placeholder="Short code (e.g. CCS)"
                value={form.c_code || ''} onChange={(e) => set('c_code', e.target.value)} />
              <button type="submit" disabled={m.saving}
                className="w-full py-3 bg-[#15803d] hover:bg-[#166534] disabled:opacity-60 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all">
                {m.saving ? 'Saving...' : 'Create College'}
              </button>
            </form>

            <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">Colleges</h3>
              </div>
              <div className="max-h-[32rem] overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      <th className="py-3 px-5">College</th>
                      <th className="py-3">Code</th>
                      <th className="py-3">Status</th>
                      <th className="py-3 pr-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.colleges.map((c) => (
                      <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="py-3 px-5 text-xs font-bold text-gray-900">{c.name}</td>
                        <td className="py-3 text-xs text-gray-600 font-mono">{c.short_code || '—'}</td>
                        <td className="py-3"><StatusBadge active={c.is_active} /></td>
                        <td className="py-3 pr-5 text-right">
                          <button
                            onClick={() => m.setCollegeActive(c.id, !c.is_active)}
                            disabled={m.saving}
                            className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40"
                          >
                            {c.is_active ? 'Deactivate' : 'Restore'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
