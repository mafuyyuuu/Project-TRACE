import WindowIcon from './WindowIcon';
import NumberInput from '@/components/NumberInput';
import Button from '@/components/Button';
import { isHonorableDismissal, isSameDayWalkInType } from '@/utils/documentPolicy';
import { INPUT_LIMITS } from '@/utils/inputLimits';
import ModalShell from '@/components/ModalShell';

/**
 * Digitizes a physical walk-in request or legacy record right from the
 * intake flow, instead of a separate sidebar tab the clerk had to navigate
 * away to. Field ids (`manual-student-id`, `manual-full-name`,
 * `manual-course`) are read by `handleFetchStudent` via `getElementById` —
 * keep them stable if this markup ever moves again.
 */
import { useState } from 'react';
export default function ManualInputModal({
  open,
  onClose,
  handleManualInputSubmit,
  handleFetchStudent,
  actionLoading,
  documentTypes = [], documentTypesLoading = false,
}) {
  const [copies, setCopies] = useState('1');
  const [docType, setDocType] = useState('');
  const [purpose, setPurpose] = useState('');
  const isGraduate = purpose === 'Graduation Clearance' || docType === 'Graduate Clearance';
  return (
    <ModalShell open={open} onClose={onClose} title="Manual Input" subtitle="Digitize physical walk-in requests and legacy records." busy={actionLoading}
      panelClassName="trace-modal-panel trace-admin-main-dialog trace-window-dialog trace-window-manual max-w-[760px]" closeButtonIcon={<WindowIcon name="close"/>}
      footer={<div className="trace-actions justify-end"><Button type="button" disabled={actionLoading} onClick={onClose} className="trace-button trace-button-secondary">Cancel</Button><Button type="submit" form="manual-input-form" disabled={actionLoading || isGraduate || documentTypesLoading || !documentTypes.length} className="trace-button trace-button-primary"><WindowIcon name="send"/>{actionLoading ? 'Saving…' : 'Submit Request'}</Button></div>}>
      <form id="manual-input-form" onSubmit={handleManualInputSubmit} className="space-y-6">
        {/* STUDENT INFORMATION */}
        <div>
          <div className="trace-window-manual-section-heading"><span><WindowIcon name="user"/></span><div><h3>Student information</h3><p>Look up the student, or enter the details manually.</p></div></div>

          <div className="trace-window-form-grid">
            <div className="flex flex-col gap-2">
              <label htmlFor="manual-student-id" className="trace-label">Student ID <span className="text-red-600">*</span></label>
              <div className="flex gap-2">
                <input maxLength={INPUT_LIMITS.id}
                  type="text"
                  name="studentId"
                  id="manual-student-id"
                  placeholder="e.g. 23-23922"
                  required
                  className="trace-control min-w-0 flex-1"
                />
                <Button
                  type="button"
                  onClick={handleFetchStudent}
                  className="trace-button trace-button-primary shrink-0"
                >
                  <WindowIcon name="search"/>Fetch
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="manual-full-name" className="trace-label">Full Name <span className="text-red-600">*</span></label>
              <input maxLength={INPUT_LIMITS.name}
                type="text"
                name="fullName"
                id="manual-full-name"
                placeholder="Last Name, First Name"
                required
                className="trace-control"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="manual-course" className="trace-label">Program <span className="text-red-600">*</span></label>
              <select
                name="course"
                id="manual-course"
                defaultValue="" required
                className="trace-control cursor-pointer"
              >
                <option value="" disabled>Select Program...</option>
                <option value="BSCS">BS Computer Science</option>
                <option value="BSIT">BS Information Technology</option>
                <option value="BSCPE">BS Computer Engineering</option>
                <option value="BSA">BS Accountancy</option>
                <option value="BSBA">BS Business Administration</option>
              </select>
            </div>
          </div>
          <p className="trace-admin-caption mt-3">Fetch an existing student by ID, or enter their confirmed information.</p>
        </div>

        {/* DOCUMENT DETAILS */}
        <div className="trace-window-document-section">
          <div className="trace-window-manual-section-heading"><span><WindowIcon name="file"/></span><div><h3>Document details</h3><p>What the student is requesting.</p></div></div>

          <div className="trace-window-form-grid">
            <div className="flex flex-col gap-2">
              <label htmlFor="manual-document-type" className="trace-label">Requested Document <span className="text-red-600">*</span></label>
              <select
                id="manual-document-type" name="docType"
                value={docType} onChange={e => {setDocType(e.target.value);if (isHonorableDismissal(e.target.value)) setCopies('1');}}
                required
                className="trace-control cursor-pointer"
              >
                <option value="" disabled>Document Type</option>
                {documentTypes.map(type => <option key={type.id || type.name} value={type.name}>{type.name}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-2"><label htmlFor="manual-copies" className="trace-label">Copies <span className="text-red-600">*</span></label>
              <span className="trace-window-stepper"><Button type="button" aria-label="Decrease copies" disabled={actionLoading || Number(copies) <= 1} onClick={() => setCopies(String(Math.max(1, Number(copies) - 1)))} className="trace-action"><WindowIcon name="minus"/></Button><NumberInput id="manual-copies" aria-label="Copies" name="copies" type="number" required min="1" max={isHonorableDismissal(docType) ? 1 : 2147483647} step="1" value={copies} onChange={event => setCopies(event.target.value)} className="trace-control" /><Button type="button" aria-label="Increase copies" disabled={actionLoading || isHonorableDismissal(docType) || Number(copies) >= 2147483647} onClick={() => setCopies(String(Math.max(1, Number(copies)) + 1))} className="trace-action"><WindowIcon name="add"/></Button></span>
            </div>
            {isSameDayWalkInType(docType) && <fieldset className="space-y-3 text-sm md:col-span-2">
              <legend className="font-bold">Walk-in same-day eligibility</legend>
              <p>Eligible only when the requester presents both the original document and its photocopy. Otherwise file for normal evaluation; no same-day promise.</p>
              <label className="flex items-start gap-3"><input name="originalSeen" type="checkbox" className="trace-choice mt-1 shrink-0" />Original document presented and checked</label>
              <label className="flex items-start gap-3"><input name="photocopySeen" type="checkbox" className="trace-choice mt-1 shrink-0" />Photocopy presented and checked</label>
            </fieldset>}
            <div className="flex flex-col gap-2">
              <label htmlFor="manual-purpose" className="trace-label">Purpose of Request <span className="text-red-600">*</span></label>
              <select
                id="manual-purpose" name="purpose"
                required
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="trace-control cursor-pointer"
              >
                <option value="" disabled>Purpose of Request</option>
                <option>Graduation Clearance</option>
                <option>Employment Requirements</option>
                <option>Scholarship Application</option>
                <option>Transfer of Credentials</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-6">
            <label className="trace-label">Clerk Remarks / Notes (Optional)</label>
            <textarea maxLength={INPUT_LIMITS.notes}
              name="remarks"
              placeholder="Enter remarks..."
              className="trace-control h-28 resize-none"
            />
          </div>
        </div>

        {isGraduate && <p role="status" className="trace-inline-error">Graduation clearance uses the graduate application. Choose another purpose or use the graduate application workflow.</p>}
      </form>
    </ModalShell>
  );
}
