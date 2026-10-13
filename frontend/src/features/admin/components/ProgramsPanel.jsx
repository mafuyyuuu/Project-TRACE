import { useState } from 'react';
import Button from '@/components/Button';
import ConfirmDialog from '@/components/ConfirmDialog';
import DashboardAlerts from '@/components/DashboardAlerts';
import usePrograms from '@/features/admin/usePrograms';

export default function ProgramsPanel({ colleges }) {
  const catalog = usePrograms();
  const [collegeId, setCollegeId] = useState('');
  const [name, setName] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const activeColleges = colleges.filter(item => Boolean(Number(item.is_active)));
  return (
    <section className="trace-section trace-section-body min-w-0" aria-label="Registrar-approved Programs">
      <h3 className="trace-section-title">Registrar-approved Programs</h3>
      <p className="trace-page-description">Add only programs approved by the Registrar. Deactivate or restore entries without changing saved student profiles. To replace a name or college, add its approved replacement and deactivate the old entry.</p>
      <form className="trace-form-grid mt-4" onSubmit={event => { event.preventDefault(); if (!collegeId || !name.trim()) return; setConfirmation({ payload: { college_id: collegeId, name: name.trim() } }); }}>
        <label className="trace-label">College
          <select className="trace-control w-full mt-1" required value={collegeId} disabled={catalog.saving} onChange={event => setCollegeId(event.target.value)}>
            <option value="">Choose College</option>
            {activeColleges.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="trace-label">Approved Program Name
          <input className="trace-control w-full mt-1" maxLength={150} required value={name} disabled={catalog.saving} onChange={event => setName(event.target.value)} />
        </label>
        <div className="col-span-full"><Button className="trace-button trace-button-primary" type="submit" disabled={catalog.saving || !activeColleges.length}>Add Program</Button></div>
      </form>
      {!activeColleges.length && <p className="mt-3 text-sm">Add or restore a College before adding programs.</p>}
      <div className="mt-5 max-h-[60vh] overflow-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm text-left min-w-[32rem]">
          <thead className="sticky top-0 z-10 bg-white dark:bg-gray-900"><tr>{['College', 'Program/Course', 'Status', 'Action'].map(label => <th className="p-3" key={label} scope="col">{label}</th>)}</tr></thead>
          <tbody>
            {catalog.programs.map(item => <tr className="border-t border-gray-200 dark:border-gray-700" key={item.id}>
              <td className="p-3 break-words max-w-64">{item.college_name}</td><td className="p-3 break-words max-w-64">{item.name}</td>
              <td className="p-3">{Number(item.is_active) ? Number(item.college_active) ? 'Active' : 'College Inactive' : 'Inactive'}</td>
              <td className="p-3"><Button className={`trace-button ${Number(item.is_active) ? 'trace-button-danger' : 'trace-button-secondary'}`} disabled={catalog.saving || (!Number(item.is_active) && !Number(item.college_active))} onClick={() => setConfirmation({ item })}>{Number(item.is_active) ? 'Deactivate' : 'Restore'}</Button></td>
            </tr>)}
            {!catalog.programs.length && <tr><td className="p-4" colSpan={4}>{catalog.loading ? 'Loading programs…' : catalog.loadError ? 'Program list unavailable.' : 'No programs loaded. Admin must add the Registrar-approved catalog.'}</td></tr>}
          </tbody>
        </table>
      </div>
      {catalog.loading && <p role="status" className="mt-3 text-sm">Loading current programs…</p>}
      {catalog.loadError && <div className="mt-3"><p role="alert" className="trace-error">{catalog.loadError}</p><Button className="trace-button trace-button-secondary mt-3" onClick={catalog.retry} disabled={catalog.saving || catalog.loading}>Retry Programs</Button></div>}
      <DashboardAlerts success={catalog.success} error={catalog.error} onDismiss={catalog.dismiss} />
      <ConfirmDialog open={!!confirmation} title={confirmation?.item ? `${Number(confirmation.item.is_active) ? 'Deactivate' : 'Restore'} Program` : 'Add Approved Program'}
        message={confirmation?.item ? `Change availability of ${confirmation.item.name}? Saved profile entries will stay intact.` : `Add ${confirmation?.payload?.name || ''} to the selected college? Confirm that the Registrar approved this program.`}
        confirmLabel={confirmation?.item ? Number(confirmation.item.is_active) ? 'Deactivate' : 'Restore' : 'Add Program'} loading={catalog.saving}
        onCancel={() => setConfirmation(null)} onConfirm={async () => {
          if (!confirmation) return;
          const ok = confirmation.item ? await catalog.toggle(confirmation.item) : await catalog.create(confirmation.payload);
          if (ok) { if (confirmation.payload) { setName(''); setCollegeId(''); } setConfirmation(null); }
        }} />
    </section>
  );
}
