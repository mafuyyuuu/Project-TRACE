import NumberInput from '@/components/NumberInput';
import { NUMBER_LIMITS } from '@/utils/inputLimits';
import ModalShell from '@/components/ModalShell';
import AdminIcon from './AdminIcon';
import QueueTabs from '@/components/QueueTabs';
import QueuePanel from '@/components/QueuePanel';
import Button from '@/components/Button';
import ProgramsPanel from './ProgramsPanel';
import SupportingDocumentsPanel from './SupportingDocumentsPanel';
import FeeScheduleEditor from './FeeScheduleEditor';
import { isHonorableDismissal, isSameDayWalkInType } from '@/utils/documentPolicy';
import { INPUT_LIMITS } from '@/utils/inputLimits';
import { useState } from 'react';
import useMaintenance from '@/features/admin/useMaintenance';
import DashboardLoading from '@/components/DashboardLoading';
import DashboardAlerts from '@/components/DashboardAlerts';
import AccountDirectory from '@/features/admin/components/AccountDirectory';
import UserDetailModal from '@/features/admin/components/UserDetailModal';
import UserEditModal from '@/features/admin/components/UserEditModal';
import AddUserModal from '@/features/admin/components/AddUserModal';
import ConfirmDialog from '@/components/ConfirmDialog';

const DESKS = ['Finance', 'Window 1', 'Secretary', 'Admin Office', 'Receiving Desk', 'Records Desk'];
const TOGGLE_KIND_LABELS = {
  staff: 'User',
  student: 'Student / Alumni Account',
  documentType: 'Document Type',
  college: 'College',
  paymentMethod: 'Payment Method',
};
const SECTIONS = [
  { key: 'staff', label: 'Accounts' },
  { key: 'documentTypes', label: 'Document Types' },
  { key: 'colleges', label: 'Colleges' },
  { key: 'programs', label: 'Programs' },
  { key: 'supportingDocuments', label: 'Supporting Documents' },
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
  const [catalogForm, setCatalogForm] = useState(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [form, setForm] = useState({});
  const [editingTypeId, setEditingTypeId] = useState(null);
  const [saveToConfirm, setSaveToConfirm] = useState(null);
  const [staffRoleFilter, setStaffRoleFilter] = useState('All');
  const [staffDeskFilter, setStaffDeskFilter] = useState('All');

  if (m.loading) return <DashboardLoading />;

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const resetForm = () => { setForm({}); setEditingTypeId(null); };

  const filteredStaff = (m.accounts || m.staff).filter((s) => {
    const matchesRole = staffRoleFilter === 'All' || s.role === staffRoleFilter;
    const matchesDesk = ['student','admin'].includes(staffRoleFilter) || staffDeskFilter === 'All' || s.desk_assignment === staffDeskFilter;
    return matchesRole && matchesDesk;
  });

  const submitDocType = async (e) => {
    e.preventDefault();
    setSaveToConfirm({ method: editingTypeId ? 'updateDocumentType' : 'createDocumentType', id: editingTypeId, label: 'Document Type', payload: {
      name: form.dt_name,
      ...(editingTypeId && form.dt_fee === '' ? {} : { base_fee: form.dt_fee }),
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
          if (await m[saveToConfirm.method](...(saveToConfirm.id ? [saveToConfirm.id, saveToConfirm.payload] : [saveToConfirm.payload]))) { resetForm(); setCatalogForm(null); setSaveToConfirm(null); }
        }} />
      <DashboardAlerts success={m.success} error={m.error} onDismiss={m.dismissNotification} dismissalKey={section} />

      <div className="trace-page">
        <div>
          <h2 className="trace-page-title break-words">
            System Maintenance
          </h2>
          <p className="trace-page-description">
            Manage accounts, document types, colleges, approved programs and payment methods.
          </p>
        </div>

        {/* Section switcher */}
      <QueueTabs idPrefix="admin-maintenance" label="Maintenance sections" showZeroCounts tabs={SECTIONS.map(item => ({...item,count:['programs','supportingDocuments'].includes(item.key) ? undefined : (item.key === 'staff' ? m.accounts : m[item.key]).length}))} activeKey={section} onChange={key => { setSection(key); setCatalogSearch(''); setCatalogForm(null); resetForm(); }} />
        <QueuePanel idPrefix="admin-maintenance" activeKey={section} className="space-y-6">

        {section === 'staff' && <p className="trace-admin-notice"><AdminIcon name="info" className="h-4 w-4" /> Deactivating hides an entry from new requests without affecting existing records.</p>}

        {section === 'programs' && <ProgramsPanel colleges={m.colleges} />}
        {section === 'supportingDocuments' && <SupportingDocumentsPanel />}

        {/* ---------------------------------------------------------------- Staff */}
        {section === 'staff' && (
          <>
            <AccountDirectory
              users={filteredStaff}
              totalCount={(m.accounts || m.staff).length}
              onSelectUser={m.setSelectedUser}
              roleFilter={staffRoleFilter}
              onRoleFilterChange={role=>{setStaffRoleFilter(role);setStaffDeskFilter('All');}}
              roleOptions={[
                { value: 'All', label: 'All Roles' },
                { value: 'student', label: 'Student / Alumni' },
                { value: 'clerk', label: 'Clerk' },
                { value: 'admin', label: 'Administrator' },
              ]}
              deskFilter={staffDeskFilter}
              onDeskFilterChange={['student','admin'].includes(staffRoleFilter)?undefined:setStaffDeskFilter}
              deskOptions={[{ value: 'All', label: 'All Desks' }, ...DESKS.map((d) => ({ value: d, label: d }))]}
              onAddUser={() => m.setAddingUser(true)}
            />

            <UserDetailModal
              adminLayout
              open={!!m.selectedUser}
              onClose={() => m.setSelectedUser(null)}
              user={m.selectedUser}
              viewerId={user.id}
              saving={m.saving}
              onEdit={() => m.setEditingUser(m.selectedUser)}
              onToggleActive={() => m.handleToggleActive(m.selectedUser)}
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
          <div className="space-y-4">
            <ModalShell open={catalogForm === 'documentTypes'} onClose={() => { if (!m.saving) setCatalogForm(null); }} title={editingTypeId ? 'Edit Document Type' : 'Add Document Type'} panelClassName="trace-modal-panel trace-admin-drawer" busy={m.saving} footer={<div className="trace-actions justify-end"><Button type="button" disabled={m.saving} onClick={() => setCatalogForm(null)} className="trace-button trace-button-secondary">Cancel</Button><Button type="submit" form="admin-document-type-form" disabled={m.saving} className="trace-button trace-button-primary">{m.saving ? 'Saving…' : editingTypeId ? 'Save Changes' : 'Create Type'}</Button></div>}><form id="admin-document-type-form" onSubmit={submitDocType} className="space-y-5">

              <section className="trace-admin-form-section"><h4 className="trace-section-title mb-4">Document details</h4><label className="trace-label">Document name<input maxLength={INPUT_LIMITS.referenceName} className={`${inputClass} mt-2`} placeholder="Name *" required
                value={form.dt_name || ''} onChange={(e) => set('dt_name', e.target.value)} /></label>
              <label className="trace-label">Base fee (₱)<NumberInput max={NUMBER_LIMITS.money} className={`${inputClass} mt-2`} min="0" step="0.01" placeholder="Base fee (₱)"
                value={form.dt_fee ?? ''} onChange={(e) => set('dt_fee', e.target.value)} /></label>

              <label className="trace-label">Fee rule<select className={`${inputClass} cursor-pointer`} value={form.dt_rule || 'flat'}
                onChange={(e) => set('dt_rule', e.target.value)}>
                <option value="flat">Flat fee per copy</option>
                <option value="per_semester_block">Legacy page estimate (semester blocks)</option>
                <option value="per_page">Per printed page per copy</option>
              </select></label></section>

              <section className="trace-admin-form-section"><h4 className="trace-section-title mb-4">Fee schedule</h4><FeeScheduleEditor colleges={m.colleges} value={{ rental_fee: form.dt_rental_fee ?? 0, special_fee: form.dt_special_fee ?? 0,
                fee_items: form.dt_fee_items || [], college_fee_schedules: form.dt_fee_schedules || [] }}
                onChange={value => setForm(previous => ({ ...previous, dt_rental_fee: value.rental_fee, dt_special_fee: value.special_fee,
                  dt_fee_items: value.fee_items, dt_fee_schedules: value.college_fee_schedules }))} /></section>
              <section className="trace-admin-form-section"><h4 className="trace-section-title mb-4">Attachment requirements</h4>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                <input type="checkbox" className="trace-choice trace-admin-switch"
                  checked={Boolean(form.dt_attach)} onChange={(e) => set('dt_attach', e.target.checked)} />
                Requires an attachment
              </label>

              {form.dt_attach && (
                <input maxLength={INPUT_LIMITS.shortText} className={`${inputClass} mt-2`} placeholder="Attachment label"
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

              </section><fieldset className="trace-admin-form-section space-y-2">
                <legend className="text-xs font-bold px-1">Allowed colleges</legend>
                <p className="text-xs text-gray-500 dark:text-gray-400">No selection allows every college.</p>
                {m.colleges.map(college => <label key={college.id} className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={(form.dt_college_ids || []).includes(college.id)} className="trace-choice" onChange={e => set('dt_college_ids', e.target.checked ? [...(form.dt_college_ids || []), college.id] : (form.dt_college_ids || []).filter(id => id !== college.id))} />
                  {college.name}
                </label>)}
              </fieldset>
              <div className="trace-admin-form-section space-y-3"><h4 className="trace-section-title mb-4">Request rules</h4>
                <label className="flex items-center gap-2 text-[11px] font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input type="checkbox" className="trace-choice trace-admin-switch"
                    disabled checked={!isHonorableDismissal(form.dt_name)} />
                  Repeat requests and quantities (Registrar policy)
                </label>
                <label className="flex items-center gap-2 text-[11px] font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input type="checkbox" className="trace-choice trace-admin-switch"
                    disabled={isSameDayWalkInType(form.dt_name)} checked={isSameDayWalkInType(form.dt_name) || Boolean(form.dt_is_walk_in)} onChange={(e) => set('dt_is_walk_in', e.target.checked)} />
                  Counter-only request type
                </label>
                <label className="flex items-center gap-2 text-[11px] font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input type="checkbox" className="trace-choice trace-admin-switch"
                    disabled={isSameDayWalkInType(form.dt_name)} checked={isSameDayWalkInType(form.dt_name) || Boolean(form.dt_requires_original)} onChange={(e) => set('dt_requires_original', e.target.checked)} />
                  Requires original document presentation
                </label>
                <label className="flex items-center gap-2 text-[11px] font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input type="checkbox" className="trace-choice trace-admin-switch"
                    disabled checked={isSameDayWalkInType(form.dt_name)} />
                  Same-day eligible when original and photocopy are presented
                </label>
              </div>
            </form></ModalShell>

            <div className="trace-section overflow-hidden">
              <div className="trace-section-header border-gray-100 dark:border-gray-700">
                <div><h3 className="trace-section-title">Document Types</h3><p className="trace-admin-caption">{m.documentTypes.length} document types</p></div><div className="trace-actions"><input aria-label="Search document types" className="trace-control w-56" placeholder="Search document types" value={catalogSearch} onChange={event => setCatalogSearch(event.target.value)} /><Button type="button" className="trace-button trace-button-primary" onClick={() => { resetForm(); setCatalogForm('documentTypes'); }}>+ Add Document Type</Button></div>
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
                    {m.documentTypes.filter(d => d.name.toLowerCase().includes(catalogSearch.toLowerCase())).map((d) => (
                      <tr key={d.id} className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-5 text-xs font-bold text-gray-900 dark:text-gray-100">{d.name}<span className="block text-[10px] text-blue-700 dark:text-blue-300">{d.available_to || 'both'} · {d.is_repeatable ? 'Repeatable' : 'One active/completed request'}{d.is_walk_in ? ' · Counter only' : ''}</span>
                          {!d.is_active && Number(d.base_fee) === 0 && <span className="block text-[10px] text-amber-700 dark:text-amber-300">Draft: configure fee before activation</span>}</td>
                        <td className="py-3 text-xs text-gray-600 dark:text-gray-300">
                          {d.fee_pending ? 'Fee not set' : `₱${Number(d.base_fee).toFixed(2)}`}
                          <span className="block text-[10px]">{(d.college_fee_schedules || []).length} college overrides · {(d.fee_items || []).length} named fees · Rental ₱{Number(d.rental_fee || 0).toFixed(2)} · Special ₱{Number(d.special_fee || 0).toFixed(2)}</span>
                          {d.name === 'Diploma' && <span className="text-[10px] text-gray-500 dark:text-gray-400 block">Reissue Fee · Secretary sets final amount</span>}
                          {['per_semester_block', 'per_page'].includes(d.fee_rule) && (
                            <span className="text-[9px] text-gray-400 dark:text-gray-400 block">per page per copy</span>
                          )}
                        </td>
                        <td className="py-3 text-xs text-gray-600 dark:text-gray-300">{d.requires_attachment ? 'Required' : '—'}</td>
                        <td className="py-3"><StatusBadge active={d.is_active} retired={d.is_retired} /></td>
                        <td className="py-3 pr-5 text-right">
                          {d.is_retired && <span className="block text-xs text-gray-500 dark:text-gray-400 mb-2">Unavailable for new requests; history retained.</span>}
                          <div className="trace-actions justify-end">
                            <Button type="button" disabled={d.is_retired} onClick={() => {
                              setEditingTypeId(d.id);
                              setCatalogForm('documentTypes');
                              setForm({ dt_name: d.name, dt_fee: d.fee_pending ? '' : d.base_fee, dt_rule: d.fee_rule,
                                dt_rental_fee: d.rental_fee ?? 0, dt_special_fee: d.special_fee ?? 0, dt_fee_items: d.fee_items || [], dt_fee_schedules: d.college_fee_schedules || [],
                                dt_attach: Boolean(d.requires_attachment), dt_label: d.attachment_label,
                                dt_available_to: d.available_to || 'both', dt_is_repeatable: Boolean(d.is_repeatable),
                                dt_is_walk_in: Boolean(d.is_walk_in), dt_requires_original: Boolean(d.requires_original),
                                dt_is_same_day: Boolean(d.is_same_day), dt_reg_attach: d.registrar_attachment_rule,
                                dt_college_ids: d.allowed_college_ids || [] });
                            }} className="trace-button trace-button-secondary">Edit</Button>
                            <Button
                              onClick={() => m.handleToggleDocumentTypeActive(d)}
                              disabled={m.saving || d.is_retired}
                              className={`trace-button ${d.is_active ? 'trace-button-danger' : 'trace-button-primary'}`}
                            >
                              {d.is_retired ? 'Retired' : d.is_active ? 'Deactivate' : 'Restore'}
                            </Button>
                          </div>
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
          <div className="space-y-4">
            <ModalShell open={catalogForm === 'colleges'} onClose={() => { if (!m.saving) setCatalogForm(null); }} title={'Add College'} subtitle="Create a college that can be used for programs and document rules." maxWidth="max-w-[640px]" busy={m.saving} footer={<div className="trace-actions justify-end"><Button type="button" disabled={m.saving} onClick={() => setCatalogForm(null)} className="trace-button trace-button-secondary">Cancel</Button><Button type="submit" form="admin-college-form" disabled={m.saving} className="trace-button trace-button-primary">{m.saving ? 'Saving…' : 'Create College'}</Button></div>}><form id="admin-college-form" onSubmit={submitCollege} className="space-y-5">
              <div className="flex justify-between"><h4 className="font-semibold">College details</h4><span className="text-xs text-gray-500">* Required</span></div>
              <label className="trace-label">College name <span className="text-red-600">*</span><input maxLength={INPUT_LIMITS.referenceName} className={`${inputClass} mt-2`} placeholder="e.g. College of Computer Studies" required
                value={form.c_name || ''} onChange={(e) => set('c_name', e.target.value)} /></label>
              <label className="trace-label">Short code <span className="text-red-600">*</span><input maxLength={INPUT_LIMITS.shortCode} className={`${inputClass} mt-2`} placeholder="e.g. CCS" required
                value={form.c_code || ''} onChange={(e) => set('c_code', e.target.value)} /><span className="trace-admin-caption block">A short label shown across the system.</span></label>
              <p className="trace-admin-notice bg-emerald-50">ⓘ You can deactivate a college later without affecting existing records.</p>
            </form></ModalShell>

            <div className="trace-section overflow-hidden">
              <div className="trace-section-header border-gray-100 dark:border-gray-700">
                <div><h3 className="trace-section-title">Colleges</h3><p className="trace-admin-caption">{m.colleges.length} colleges</p></div><div className="trace-actions"><input aria-label="Search colleges" className="trace-control w-56" placeholder="Search colleges" value={catalogSearch} onChange={event => setCatalogSearch(event.target.value)} /><Button type="button" className="trace-button trace-button-primary" onClick={() => { resetForm(); setCatalogForm('colleges'); }}>+ Add College</Button></div>
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
                    {m.colleges.filter(c => (c.name+' '+(c.short_code || '')).toLowerCase().includes(catalogSearch.toLowerCase())).map((c) => (
                      <tr key={c.id} className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-5 text-xs font-bold text-gray-900 dark:text-gray-100">{c.name}</td>
                        <td className="py-3 text-xs text-gray-600 dark:text-gray-300 font-mono">{c.short_code || '—'}</td>
                        <td className="py-3"><StatusBadge active={c.is_active} /></td>
                        <td className="py-3 pr-5 text-right">
                          <Button
                            onClick={() => m.handleToggleCollegeActive(c)}
                            disabled={m.saving}
                            className="trace-button trace-button-secondary"
                          >
                            {c.is_active ? 'Deactivate' : 'Restore'}
                          </Button>
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
          <div className="space-y-4">
            <ModalShell open={catalogForm === 'paymentMethods'} onClose={() => { if (!m.saving) setCatalogForm(null); }} title={'Add Payment Method'} maxWidth="max-w-[640px]" busy={m.saving} footer={<div className="trace-actions justify-end"><Button type="button" disabled={m.saving} onClick={() => setCatalogForm(null)} className="trace-button trace-button-secondary">Cancel</Button><Button type="submit" form="admin-payment-method-form" disabled={m.saving} className="trace-button trace-button-primary">{m.saving ? 'Saving…' : 'Create Method'}</Button></div>}><form id="admin-payment-method-form" onSubmit={submitPaymentMethod} className="space-y-5">

              <div>
                <input maxLength={INPUT_LIMITS.shortCode} className={`${inputClass} font-mono`} placeholder="Code * (e.g. paymaya)" required
                  value={form.pm_code || ''} onChange={(e) => set('pm_code', e.target.value)} />
                <p className="text-[10px] text-gray-400 dark:text-gray-400 mt-1.5">
                  Lowercase, letters/numbers/underscores only. Cannot be changed later.
                </p>
              </div>
              <input maxLength={INPUT_LIMITS.referenceName} className={`${inputClass} mt-2`} placeholder="Display name *" required
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
                <input maxLength={INPUT_LIMITS.referenceName} className={`${inputClass} mt-2`} placeholder="Reference field label (e.g. Approval Code)"
                  value={form.pm_reference_label || ''} onChange={(e) => set('pm_reference_label', e.target.value)} />
              )}

              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                <input type="checkbox" className="trace-choice accent-[#15803d]"
                  checked={form.pm_requires_proof !== false}
                  onChange={(e) => set('pm_requires_proof', e.target.checked)} />
                Requires a proof-of-payment upload
              </label>
            </form></ModalShell>

            <div className="trace-section overflow-hidden">
              <div className="trace-section-header border-gray-100 dark:border-gray-700">
                <div><h3 className="trace-section-title">Payment Methods</h3><p className="trace-admin-caption">{m.paymentMethods.length} payment methods</p></div><div className="trace-actions"><input aria-label="Search payment methods" className="trace-control w-56" placeholder="Search payment methods" value={catalogSearch} onChange={event => setCatalogSearch(event.target.value)} /><Button type="button" className="trace-button trace-button-primary" onClick={() => { resetForm(); setCatalogForm('paymentMethods'); }}>+ Add Payment Method</Button></div>
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
                    {m.paymentMethods.filter(p => (p.name+' '+p.code).toLowerCase().includes(catalogSearch.toLowerCase())).map((p) => (
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
                          <Button
                            onClick={() => m.handleTogglePaymentMethodActive(p)}
                            disabled={m.saving}
                            className="trace-button trace-button-secondary"
                          >
                            {p.is_active ? 'Deactivate' : 'Restore'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        </QueuePanel>
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
                ? m.activeToggleToConfirm.kind==='student' || m.activeToggleToConfirm.kind==='staff' ? `Deactivate "${m.activeToggleToConfirm.label}"? Sign-in and existing sessions will be blocked. Requests and history are preserved.` : `Deactivate "${m.activeToggleToConfirm.label}"? It will be hidden from new requests, but existing records are unaffected.`
                : m.activeToggleToConfirm.kind==='student' || m.activeToggleToConfirm.kind==='staff' ? `Restore "${m.activeToggleToConfirm.label}"? Sign-in will be available again. Existing verification requirements still apply.` : `Restore "${m.activeToggleToConfirm.label}"? It will be available again for new requests.`
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
