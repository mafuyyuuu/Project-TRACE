import { useState } from 'react';
import Button from '@/components/Button';
import ModalShell from '@/components/ModalShell';
import ConfirmDialog from '@/components/ConfirmDialog';
import RequestStaff from '@/components/RequestStaff';
import useRequestAssignment from '@/features/admin/useRequestAssignment';

export default function RequestAssignmentModal({ document, onClose, onSaved }) {
  const state = useRequestAssignment(document.id, onSaved);
  const [staffId, setStaffId] = useState(''), [reason, setReason] = useState('');
  const [collegeId, setCollegeId] = useState(''), [collegeReason, setCollegeReason] = useState('');
  const stage = () => state.stage({ kind: 'staff', payload: { staff_id: Number(staffId), reason: reason.trim(), expected_staff_id: state.context.document.assigned_clerk_id || null, expected_status: state.context.document.current_status } });
  return <>
    <ModalShell open title="Assign Processing Staff" maxWidth="max-w-[535px]" onClose={() => { if (!state.saving) onClose(); }} showCloseButton={!state.saving} busy={state.saving} closeOnEsc={!state.saving} closeOnBackdrop={!state.saving}
      footer={<div className="mx-auto flex w-full max-w-[285px] flex-col gap-2 sm:flex-row">
        <Button type="button" disabled={state.saving} onClick={onClose} className="trace-button trace-button-secondary flex-1">Cancel</Button>
        <Button type="button" disabled={state.saving || !state.context || !staffId || !reason.trim()} onClick={stage} className="trace-button trace-button-primary flex-1">Review assignment</Button>
      </div>}>
      <div className="space-y-4">
        <RequestStaff document={state.context?.document || document} />
        <p className="text-sm text-gray-600 dark:text-gray-300">Choose backup processing staff within the current desk and college. Reassignment preserves existing permissions and records your reason.</p>
        {!state.context && !state.error && <p role="status">Loading eligible staff…</p>}
        {state.error && <p role="alert" className="trace-inline-error">{state.error}</p>}
        {state.context && <>
          <label className="trace-label">Processing staff · {state.context.desk || 'Case closed'}<select className="trace-control mt-2 w-full" value={staffId} disabled={state.saving} onChange={e => setStaffId(e.target.value)}>
            <option value="">Choose staff</option>{state.context.staff.map(person => <option key={person.id} value={person.id}>{person.full_name}</option>)}
          </select></label>
          {!state.context.staff.length && <p className="text-sm">No eligible staff for this stage. Admin must reconcile missing college information or staff assignments before proceeding.</p>}
          <label className="trace-label">Reason<textarea rows={3} maxLength={1000} className="trace-control mt-2 w-full" value={reason} disabled={state.saving} onChange={e => setReason(e.target.value)} /></label>
          {state.context.can_reconcile_college && document.student_id && <details className="space-y-3 border-t border-gray-200 pt-4 dark:border-gray-700">
            <summary className="cursor-pointer text-sm font-semibold">Reconcile current / former college</summary>
            <p className="text-sm text-gray-600 dark:text-gray-300">Confirm the student’s college against institutional records. Alumni use their former college. This updates the profile and fills a missing legacy routing scope; existing snapshots and closed history remain unchanged.</p>
            <label className="trace-label">Verified college<select className="trace-control mt-2 w-full" value={collegeId} disabled={state.saving} onChange={e => setCollegeId(e.target.value)}><option value="">Choose verified college</option>{state.context.colleges.map(college => <option key={college.id} value={college.id}>{college.name}</option>)}</select></label>
            <label className="trace-label">Evidence and reason<textarea rows={3} maxLength={1000} className="trace-control mt-2 w-full" value={collegeReason} disabled={state.saving} onChange={e => setCollegeReason(e.target.value)} /></label>
            <Button type="button" className="trace-button trace-button-secondary" disabled={state.saving || !collegeId || !collegeReason.trim()} onClick={() => state.stage({kind:'college',payload:{college_id:Number(collegeId),reason:collegeReason.trim(),expected_college_id:state.context.profile_college_id}})}>Review college correction</Button>
          </details>}
        </>}
      </div>
    </ModalShell>
    <ConfirmDialog open={Boolean(state.staged)} title={state.staged?.kind === 'college' ? 'Confirm College Reconciliation' : 'Confirm Staff Assignment'} message={state.staged?.kind === 'college' ? `Record ${state.context?.colleges.find(college => college.id === state.staged.payload.college_id)?.name || 'the verified college'} as this student’s current or former college?` : `Assign this request to ${state.context?.staff.find(person => person.id === state.staged?.payload.staff_id)?.full_name || 'the selected staff member'}?`} confirmLabel={state.staged?.kind === 'college' ? 'Save college' : 'Assign staff'} loading={state.saving} onCancel={state.cancel} onConfirm={state.confirm}>
      {state.error && <p role="alert" className="trace-inline-error">{state.error}</p>}
    </ConfirmDialog>
  </>;
}
