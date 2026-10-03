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
  const [docType, setDocType] = useState('');
  const [purpose, setPurpose] = useState('');
  const isGraduate = purpose === 'Graduation Clearance' || docType === 'Graduate Clearance';
  return (
    <ModalShell open={open} onClose={onClose} title="Manual Input" maxWidth="max-w-3xl" footer={<div className="flex justify-end pt-4">
          <button
            type="submit" form="manual-input-form"
            disabled={actionLoading || isGraduate || documentTypesLoading || !documentTypes.length}
            className="trace-button trace-button-primary"
          >
            {actionLoading ? 'Saving...' : 'Submit Request'}
          </button>
        </div>}>
      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
        Digitize physical walk-in requests and legacy records.
      </p>

      <form id="manual-input-form" onSubmit={handleManualInputSubmit} className="space-y-10">
        {/* STUDENT INFORMATION */}
        <div>
          <h3 className="text-xs font-black text-[#15803d] dark:text-green-300 uppercase tracking-widest border-b border-gray-100 dark:border-gray-700 pb-3 mb-6">STUDENT INFORMATION</h3>

          <div className="trace-form-grid">
            <div className="flex flex-col gap-2">
              <label className="trace-label">Student ID</label>
              <div className="flex gap-2">
                <input maxLength={INPUT_LIMITS.id}
                  type="text"
                  name="studentId"
                  id="manual-student-id"
                  placeholder="e.g. 23-23922"
                  required
                  className="trace-control flex-1"
                />
                <button
                  type="button"
                  onClick={handleFetchStudent}
                  className="trace-button trace-button-primary shrink-0"
                >
                  FETCH
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="trace-label">Full Name</label>
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
              <label className="trace-label">Course / Program</label>
              <select
                name="course"
                id="manual-course"
                required
                className="trace-control cursor-pointer"
              >
                <option value="" disabled selected>Select Course...</option>
                <option value="BSCS">BS Computer Science</option>
                <option value="BSIT">BS Information Technology</option>
                <option value="BSCPE">BS Computer Engineering</option>
                <option value="BSA">BS Accountancy</option>
                <option value="BSBA">BS Business Administration</option>
              </select>
            </div>
          </div>
        </div>

        {/* DOCUMENT DETAILS */}
        <div>
          <h3 className="text-xs font-black text-[#15803d] dark:text-green-300 uppercase tracking-widest border-b border-gray-100 dark:border-gray-700 pb-3 mb-6">DOCUMENT DETAILS</h3>

          <div className="trace-form-grid">
            <div className="flex flex-col gap-2">
              <label className="trace-label">Requested Document</label>
              <select
                name="docType"
                value={docType} onChange={e => setDocType(e.target.value)}
                required
                className="trace-control cursor-pointer"
              >
                <option value="" disabled>Document Type</option>
                {documentTypes.map(type => <option key={type.id || type.name} value={type.name}>{type.name}</option>)}
              </select>
            </div>

            <label className="flex flex-col gap-2 text-sm font-bold">Copies
              <input name="copies" type="number" required min="1" max={isHonorableDismissal(docType) ? 1 : 2147483647} step="1" defaultValue="1" className="trace-control" />
            </label>
            {isSameDayWalkInType(docType) && <fieldset className="space-y-3 text-sm md:col-span-2">
              <legend className="font-bold">Walk-in same-day eligibility</legend>
              <p>Eligible only when the requester presents both the original document and its photocopy. Otherwise file for normal evaluation; no same-day promise.</p>
              <label className="flex items-start gap-3"><input name="originalSeen" type="checkbox" className="trace-choice mt-1 shrink-0" />Original document presented and checked</label>
              <label className="flex items-start gap-3"><input name="photocopySeen" type="checkbox" className="trace-choice mt-1 shrink-0" />Photocopy presented and checked</label>
            </fieldset>}
            <div className="flex flex-col gap-2">
              <label className="trace-label">Purpose of Request</label>
              <select
                name="purpose"
                required
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="trace-control cursor-pointer"
              >
                <option value="" disabled selected>Purpose of Request</option>
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

      </form>
    </ModalShell>
  );
}
