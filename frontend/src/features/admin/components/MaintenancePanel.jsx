import FeeScheduleEditor from './FeeScheduleEditor';
import { isHonorableDismissal, isSameDayWalkInType } from '@/utils/documentPolicy';
import { INPUT_LIMITS } from '@/utils/inputLimits';
import { useState } from 'react';
import useMaintenance from '@/features/admin/useMaintenance';
import DashboardLoading from '@/components/DashboardLoading';
import DashboardAlerts from '@/components/DashboardAlerts';
import UserGrid from '@/features/admin/components/UserGrid';
import UserDetailModal from '@/features/admin/components/UserDetailModal';
import UserEditModal from '@/features/admin/components/UserEditModal';
import AddUserModal from '@/features/admin/components/AddUserModal';
import ConfirmDialog from '@/components/ConfirmDialog';

const DESKS = ['Finance', 'Window 1', 'Secretary', 'Admin Office', 'Receiving Desk', 'Records Desk'];
const TOGGLE_KIND_LABELS = {
  staff: 'User',
  documentType: 'Document Type',
  college: 'College',
  paymentMethod: 'Payment Method',
};
const SECTIONS = [
  { key: 'staff', label: 'Accounts' },
  { key: 'documentTypes', label: 'Document Types' },
  { key: 'colleges', label: 'Colleges' },
  { key: 'paymentMethods', label: 'Payment Methods' },
];

const inputClass =
  "trace-control w-full";

/** Active/Inactive pill — "deleted" entries are deactivated, never removed. */
function StatusBadge({ active, retired = false }) {
  return (
    <span
      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
        active
          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-[#15803d] dark:text-green-300 border-emerald-100 dark:border-emerald-800'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
      }`}
    >
      {retired ? 'Retired' : active ? 'Active' : 'Inactive'}
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
  const [editingTypeId, setEditingTypeId] = useState(null);
  const [saveToConfirm, setSaveToConfirm] = useState(null);
  const [staffSearch, setStaffSearch] = useState('');
  const [staffRoleFilter, setStaffRoleFilter] = useState('All');
  const [staffDeskFilter, setStaffDeskFilter] = useState('All');

  if (m.loading) return <DashboardLoading />;

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const resetForm = () => { setForm({}); setEditingTypeId(null); };

  const filteredStaff = (m.accounts || m.staff).filter((s) => {
    const q = staffSearch.toLowerCase();
    const matchesSearch =
      !q || s.full_name?.toLowerCase().includes(q) || s.student_id?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q);
    const matchesRole = staffRoleFilter === 'All' || s.role === staffRoleFilter;
    const matchesDesk = staffDeskFilter === 'All' || s.desk_assignment === staffDeskFilter;
    return matchesSearch && matchesRole && matchesDesk;
  });

  const submitDocType = async (e) => {
    e.preventDefault();
    setSaveToConfirm({ method: editingTypeId ? 'updateDocumentType' : 'createDocumentType', id: editingTypeId, label: 'Document Type', payload: {
      name: form.dt_name,
      base_fee: form.dt_fee,
      rental_fee: form.dt_rental_fee ?? 0, special_fee: form.dt_special_fee ?? 0,
      fee_items: form.dt_fee_items || [], college_fee_schedules: form.dt_fee_schedules || [],
      fee_rule: form.dt_rule || 'flat',
      requires_attachment: Boolean(form.dt_attach),
      attachment_label: form.dt_attach ? form.dt_label : null,
      available_to: form.dt_available_to || 'both',
      is_repeatable: !isHonorableDismissal(form.dt_name),
      allowed_college_ids: form.dt_college_ids || [],
      is_walk_in: isSameDayWalkInType(form.dt_name) || Boolean(form.dt_is_walk_in),
      requires_original: isSameDayWalkInType(form.dt_name) || Boolean(form.dt_requires_original),
      registrar_attachment_rule: form.dt_reg_attach || 'none',
      is_same_day: isSameDayWalkInType(form.dt_name),
    } });
  };

  const submitCollege = async (e) => {
    e.preventDefault();
    setSaveToConfirm({ method: 'createCollege', label: 'College', payload: { name: form.c_name, short_code: form.c_code } });
  };

  const submitPaymentMethod = async (e) => {
    e.preventDefault();
    setSaveToConfirm({ method: 'createPaymentMethod', label: 'Payment Method', payload: {
      code: form.pm_code,
      name: form.pm_name,
      instructions: form.pm_instructions || null,
      requires_reference: form.pm_requires_reference !== false,
      reference_label: form.pm_requires_reference !== false ? (form.pm_reference_label || null) : null,
      requires_proof: form.pm_requires_proof !== false,
    } });
  };

  return (
    <>
      <ConfirmDialog open={!!saveToConfirm} title={`Confirm ${saveToConfirm?.label || 'Save'}`}
        message={`${saveToConfirm?.id ? 'Update' : 'Create'} this ${saveToConfirm?.label?.toLowerCase() || 'record'}?`} confirmLabel="Save"
        loading={m.saving} onCancel={() => setSaveToConfirm(null)}
        onConfirm={async () => {
          if (await m[saveToConfirm.method](...(saveToConfirm.id ? [saveToConfirm.id, saveToConfirm.payload] : [saveToConfirm.payload]))) { resetForm(); setSaveToConfirm(null); }
        }} />
      <DashboardAlerts success={m.success} error={m.error} onDismiss={m.dismissNotification} dismissalKey={section} />

      <div className="trace-page animate-fade-in">
        <div>
          <h2 className="trace-page-title">
            System <span className="text-[#15803d] dark:text-green-300">Maintenance</span>
          </h2>
          <p className="trace-page-description">
            Manage accounts, document types, colleges and payment methods. Deactivating hides an
            entry from new requests without affecting existing records.
          </p>
        </div>

        {/* Section switcher */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => { setSection(s.key); resetForm(); }}
              className={`trace-tab rounded-t-xl  ${
                section === s.key
                  ? 'bg-white dark:bg-gray-900 border border-b-white border-gray-200 dark:border-gray-700 text-[#15803d] dark:text-green-300 -mb-px'
                  : 'text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              {s.label} ({(s.key === 'staff' ? m.accounts : m[s.key]).length})
            </button>
          ))}
        </div>

        {/* ---------------------------------------------------------------- Staff */}
        {section === 'staff' && (
          <>
            <UserGrid
              users={filteredStaff}
              onSelectUser={m.setSelectedUser}
              searchValue={staffSearch}
              onSearchChange={setStaffSearch}
              roleFilter={staffRoleFilter}
              onRoleFilterChange={setStaffRoleFilter}
              roleOptions={[
                { value: 'All', label: 'All Roles' },
                { value: 'student', label: 'Student / Alumni' },
                { value: 'clerk', label: 'Clerk' },
                { value: 'admin', label: 'Administrator' },
              ]}
              deskFilter={staffDeskFilter}
              onDeskFilterChange={setStaffDeskFilter}
              deskOptions={[{ value: 'All', label: 'All Desks' }, ...DESKS.map((d) => ({ value: d, label: d }))]}
              onAddUser={() => m.setAddingUser(true)}
            />

            <UserDetailModal
              open={!!m.selectedUser}
              onClose={() => m.setSelectedUser(null)}
              user={m.selectedUser}
              viewerId={user.id}
              saving={m.saving}
              onEdit={() => m.setEditingUser(m.selectedUser)}
              onToggleActive={m.selectedUser?.role === 'student' ? undefined : () => m.handleToggleActive(m.selectedUser)}
            />

            <UserEditModal
              key={m.editingUser?.id || 'none'}
              colleges={m.colleges}
              open={!!m.editingUser}
              onClose={() => m.setEditingUser(null)}
              user={m.editingUser}
              saving={m.saving}
              onSave={m.handleSaveEdit}
            />

            <AddUserModal
              open={m.addingUser}
              onClose={() => m.setAddingUser(false)}
              onCreate={m.createStaff}
              saving={m.saving}
            />
          </>
        )}

        {/* -------------------------------------------------------- Document types */}
        {section === 'documentTypes' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <form onSubmit={submitDocType} className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 space-y-3 h-fit">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">{editingTypeId ? 'Edit Document Type' : 'Add Document Type'}</h3>

              <input maxLength={INPUT_LIMITS.referenceName} className={inputClass} placeholder="Name *" required
                value={form.dt_name || ''} onChange={(e) => set('dt_name', e.target.value)} />
              <input className={inputClass} type="number" min="0" step="0.01" placeholder="Base fee (₱)"
                value={form.dt_fee ?? ''} onChange={(e) => set('dt_fee', e.target.value)} />

              <select className={`${inputClass} cursor-pointer`} value={form.dt_rule || 'flat'}
                onChange={(e) => set('dt_rule', e.target.value)}>
                <option value="flat">Flat fee per copy</option>
                <option value="per_semester_block">Per printed page per copy</option>
              </select>

              <FeeScheduleEditor colleges={m.colleges} value={{ rental_fee: form.dt_rental_fee ?? 0, special_fee: form.dt_special_fee ?? 0,
                fee_items: form.dt_fee_items || [], college_fee_schedules: form.dt_fee_schedules || [] }}
                onChange={value => setForm(previous => ({ ...previous, dt_rental_fee: value.rental_fee, dt_special_fee: value.special_fee,
                  dt_fee_items: value.fee_items, dt_fee_schedules: value.college_fee_schedules }))} />
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                <input type="checkbox" className="trace-choice accent-[#15803d]"
                  checked={Boolean(form.dt_attach)} onChange={(e) => set('dt_attach', e.target.checked)} />
                Requires an attachment
              </label>

              {form.dt_attach && (
                <input maxLength={INPUT_LIMITS.shortText} className={inputClass} placeholder="Attachment label"
                  value={form.dt_label || ''} onChange={(e) => set('dt_label', e.target.value)} />
              )}

              
              <select className={`${inputClass} cursor-pointer`} value={form.dt_available_to || 'both'}
                onChange={(e) => set('dt_available_to', e.target.value)}>
                <option value="both">Both Student & Alumni</option>
                <option value="student">Student Only</option>
                <option value="alumni">Alumni Only</option>
              </select>

              <select className={`${inputClass} cursor-pointer`} value={form.dt_reg_attach || 'none'}
                onChange={(e) => set('dt_reg_attach', e.target.value)}>
                <option value="none">No Registrar Attachment</option>
                <option value="optional">Optional Registrar Attachment</option>
                <option value="required">Required Registrar Attachment</option>
              </select>

              <fieldset className="space-y-2 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                <legend className="text-xs font-bold px-1">Allowed colleges</legend>
                <p className="text-xs text-gray-500 dark:text-gray-400">No selection allows every college.</p>
                {m.colleges.map(college => <label key={college.id} className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={(form.dt_college_ids || []).includes(college.id)} onChange={e => set('dt_college_ids', e.target.checked ? [...(form.dt_college_ids || []), college.id] : (form.dt_college_ids || []).filter(id => id !== college.id))} />
                  {college.name}
                </label>)}
              </fieldset>
              <div className="space-y-2 py-2">
                <label className="flex items-center gap-2 text-[11px] font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input type="checkbox" className="trace-choice accent-[#15803d]"
                    disabled checked={!isHonorableDismissal(form.dt_name)} />
                  Repeat requests and quantities (Registrar policy)
                </label>
                <label className="flex items-center gap-2 text-[11px] font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input type="checkbox" className="trace-choice accent-[#15803d]"
                    disabled={isSameDayWalkInType(form.dt_name)} checked={isSameDayWalkInType(form.dt_name) || Boolean(form.dt_is_walk_in)} onChange={(e) => set('dt_is_walk_in', e.target.checked)} />
                  Counter-only request type
                </label>
                <label className="flex items-center gap-2 text-[11px] font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input type="checkbox" className="trace-choice accent-[#15803d]"
                    disabled={isSameDayWalkInType(form.dt_name)} checked={isSameDayWalkInType(form.dt_name) || Boolean(form.dt_requires_original)} onChange={(e) => set('dt_requires_original', e.target.checked)} />
                  Requires original document presentation
                </label>
                <label className="flex items-center gap-2 text-[11px] font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input type="checkbox" className="trace-choice accent-[#15803d]"
                    disabled checked={isSameDayWalkInType(form.dt_name)} />
                  Same-day eligible when original and photocopy are presented
                </label>
              </div>
<button type="submit" disabled={m.saving}
                className="trace-button trace-button-primary w-full">
                {m.saving ? 'Saving...' : editingTypeId ? 'Save Changes' : 'Create Type'}
              </button>
              {editingTypeId && <button type="button" onClick={resetForm} className="trace-action w-full py-2 text-gray-600 dark:text-gray-300 focus-visible:ring-2 focus-visible:ring-green-600">Cancel Edit</button>}
            </form>

            <div className="trace-section lg:col-span-2 overflow-hidden">
              <div className="trace-section-header border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Document Types</h3>
                <p className="text-[10px] text-gray-400 dark:text-gray-400 mt-1">
                  Fees apply to new requests only. A type already used by documents cannot be renamed.
                </p>
              </div>
              <div className="max-h-[32rem] overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                    <tr className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                      <th className="py-3 px-5">Type</th>
                      <th className="py-3">Fee</th>
                      <th className="py-3">Attachment</th>
                      <th className="py-3">Status</th>
                      <th className="py-3 pr-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.documentTypes.map((d) => (
                      <tr key={d.id} className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-5 text-xs font-bold text-gray-900 dark:text-gray-100">{d.name}<span className="block text-[10px] text-blue-700 dark:text-blue-300">{d.available_to || 'both'} · {d.is_repeatable ? 'Repeatable' : 'One active/completed request'}{d.is_walk_in ? ' · Counter only' : ''}</span>
                          {!d.is_active && Number(d.base_fee) === 0 && <span className="block text-[10px] text-amber-700 dark:text-amber-300">Draft: configure fee before activation</span>}</td>
                        <td className="py-3 text-xs text-gray-600 dark:text-gray-300">
                          ₱{Number(d.base_fee).toFixed(2)}
                          <span className="block text-[10px]">{(d.college_fee_schedules || []).length} college overrides · {(d.fee_items || []).length} named fees · Rental ₱{Number(d.rental_fee || 0).toFixed(2)} · Special ₱{Number(d.special_fee || 0).toFixed(2)}</span>
                          {d.name === 'Diploma' && <span className="text-[10px] text-gray-500 dark:text-gray-400 block">Reissue Fee · Secretary sets final amount</span>}
                          {d.fee_rule === 'per_semester_block' && (
                            <span className="text-[9px] text-gray-400 dark:text-gray-400 block">per page per copy</span>
                          )}
                        </td>
                        <td className="py-3 text-xs text-gray-600 dark:text-gray-300">{d.requires_attachment ? 'Required' : '—'}</td>
                        <td className="py-3"><StatusBadge active={d.is_active} retired={d.is_retired} /></td>
                        <td className="py-3 pr-5 text-right">
                          {d.is_retired && <span className="block text-xs text-gray-500 dark:text-gray-400 mb-2">Unavailable for new requests; history retained.</span>}
                          <button type="button" disabled={d.is_retired} onClick={() => {
                            setEditingTypeId(d.id);
                            setForm({ dt_name: d.name, dt_fee: d.base_fee, dt_rule: d.fee_rule,
                              dt_rental_fee: d.rental_fee ?? 0, dt_special_fee: d.special_fee ?? 0, dt_fee_items: d.fee_items || [], dt_fee_schedules: d.college_fee_schedules || [],
                              dt_attach: Boolean(d.requires_attachment), dt_label: d.attachment_label,
                              dt_available_to: d.available_to || 'both', dt_is_repeatable: Boolean(d.is_repeatable),
                              dt_is_walk_in: Boolean(d.is_walk_in), dt_requires_original: Boolean(d.requires_original),
                              dt_is_same_day: Boolean(d.is_same_day), dt_reg_attach: d.registrar_attachment_rule,
                              dt_college_ids: d.allowed_college_ids || [] });
                          }} className="trace-action mr-2 text-xs font-bold text-blue-700 dark:text-blue-300 hover:underline disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-blue-500">Edit</button>
                          <button
                            onClick={() => m.handleToggleDocumentTypeActive(d)}
                            disabled={m.saving || d.is_retired}
                            className={`trace-button ${d.is_active ? 'trace-button-danger' : 'trace-button-primary'}`}
                          >
                            {d.is_retired ? 'Retired' : d.is_active ? 'Deactivate' : 'Restore'}
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
            <form onSubmit={submitCollege} className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 space-y-3 h-fit">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">Add College</h3>
              <input maxLength={INPUT_LIMITS.referenceName} className={inputClass} placeholder="College name *" required
                value={form.c_name || ''} onChange={(e) => set('c_name', e.target.value)} />
              <input maxLength={INPUT_LIMITS.shortCode} className={inputClass} placeholder="Short code (e.g. CCS)"
                value={form.c_code || ''} onChange={(e) => set('c_code', e.target.value)} />
              <button type="submit" disabled={m.saving}
                className="trace-button trace-button-primary w-full">
                {m.saving ? 'Saving...' : 'Create College'}
              </button>
            </form>

            <div className="trace-section lg:col-span-2 overflow-hidden">
              <div className="trace-section-header border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Colleges</h3>
              </div>
              <div className="max-h-[32rem] overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                    <tr className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                      <th className="py-3 px-5">College</th>
                      <th className="py-3">Code</th>
                      <th className="py-3">Status</th>
                      <th className="py-3 pr-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.colleges.map((c) => (
                      <tr key={c.id} className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-5 text-xs font-bold text-gray-900 dark:text-gray-100">{c.name}</td>
                        <td className="py-3 text-xs text-gray-600 dark:text-gray-300 font-mono">{c.short_code || '—'}</td>
                        <td className="py-3"><StatusBadge active={c.is_active} /></td>
                        <td className="py-3 pr-5 text-right">
                          <button
                            onClick={() => m.handleToggleCollegeActive(c)}
                            disabled={m.saving}
                            className="trace-button trace-button-secondary"
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

        {/* ---------------------------------------------------------- Payment methods */}
        {section === 'paymentMethods' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <form onSubmit={submitPaymentMethod} className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 space-y-3 h-fit">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">Add Payment Method</h3>

              <div>
                <input maxLength={INPUT_LIMITS.shortCode} className={`${inputClass} font-mono`} placeholder="Code * (e.g. paymaya)" required
                  value={form.pm_code || ''} onChange={(e) => set('pm_code', e.target.value)} />
                <p className="text-[10px] text-gray-400 dark:text-gray-400 mt-1.5">
                  Lowercase, letters/numbers/underscores only. Cannot be changed later.
                </p>
              </div>
              <input maxLength={INPUT_LIMITS.referenceName} className={inputClass} placeholder="Display name *" required
                value={form.pm_name || ''} onChange={(e) => set('pm_name', e.target.value)} />
              <textarea maxLength={INPUT_LIMITS.notes} className={`${inputClass} min-h-20`} placeholder="Instructions shown to the student"
                value={form.pm_instructions || ''} onChange={(e) => set('pm_instructions', e.target.value)} />

              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                <input type="checkbox" className="trace-choice accent-[#15803d]"
                  checked={form.pm_requires_reference !== false}
                  onChange={(e) => set('pm_requires_reference', e.target.checked)} />
                Requires a reference number
              </label>
              {form.pm_requires_reference !== false && (
                <input maxLength={INPUT_LIMITS.referenceName} className={inputClass} placeholder="Reference field label (e.g. Approval Code)"
                  value={form.pm_reference_label || ''} onChange={(e) => set('pm_reference_label', e.target.value)} />
              )}

              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                <input type="checkbox" className="trace-choice accent-[#15803d]"
                  checked={form.pm_requires_proof !== false}
                  onChange={(e) => set('pm_requires_proof', e.target.checked)} />
                Requires a proof-of-payment upload
              </label>

              <button type="submit" disabled={m.saving}
                className="trace-button trace-button-primary w-full">
                {m.saving ? 'Saving...' : 'Create Method'}
              </button>
            </form>

            <div className="trace-section lg:col-span-2 overflow-hidden">
              <div className="trace-section-header border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Payment Methods</h3>
                <p className="text-[10px] text-gray-400 dark:text-gray-400 mt-1">
                  Every method settles manually against Finance's own records — a hosted gateway can be
                  added later without changing how these are listed.
                </p>
              </div>
              <div className="max-h-[32rem] overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                    <tr className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                      <th className="py-3 px-5">Method</th>
                      <th className="py-3">Reference</th>
                      <th className="py-3">Proof</th>
                      <th className="py-3">Status</th>
                      <th className="py-3 pr-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.paymentMethods.map((p) => (
                      <tr key={p.id} className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-5">
                          <div className="text-xs font-bold text-gray-900 dark:text-gray-100">{p.name}</div>
                          <div className="text-[10px] text-gray-400 dark:text-gray-400 font-mono">{p.code}</div>
                        </td>
                        <td className="py-3 text-xs text-gray-600 dark:text-gray-300">
                          {p.requires_reference ? (p.reference_label || 'Required') : '—'}
                        </td>
                        <td className="py-3 text-xs text-gray-600 dark:text-gray-300">{p.requires_proof ? 'Required' : '—'}</td>
                        <td className="py-3"><StatusBadge active={p.is_active} /></td>
                        <td className="py-3 pr-5 text-right">
                          <button
                            onClick={() => m.handleTogglePaymentMethodActive(p)}
                            disabled={m.saving}
                            className="trace-button trace-button-secondary"
                          >
                            {p.is_active ? 'Deactivate' : 'Restore'}
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

        <ConfirmDialog
          open={!!m.activeToggleToConfirm}
          title={
            m.activeToggleToConfirm
              ? `${m.activeToggleToConfirm.active ? 'Deactivate' : 'Restore'} ${TOGGLE_KIND_LABELS[m.activeToggleToConfirm.kind]}`
              : ''
          }
          message={
            m.activeToggleToConfirm
              ? m.activeToggleToConfirm.active
                ? `Deactivate "${m.activeToggleToConfirm.label}"? It will be hidden from new requests, but existing records are unaffected.`
                : `Restore "${m.activeToggleToConfirm.label}"? It will be available again for new requests.`
              : ''
          }
          variant={m.activeToggleToConfirm?.active ? 'destructive' : 'neutral'}
          confirmLabel={m.activeToggleToConfirm?.active ? 'Deactivate' : 'Restore'}
          loadingLabel="Saving…"
          loading={m.saving}
          onConfirm={m.confirmActiveToggle}
          onCancel={m.cancelActiveToggle}
        />
      </div>
    </>
  );
}
