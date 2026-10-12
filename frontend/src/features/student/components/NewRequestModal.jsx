import Button from '@/components/Button';
import { yearError } from '@/utils/profileYears';
import { INPUT_LIMITS } from '@/utils/inputLimits';
import { isHonorableDismissal } from '@/utils/documentPolicy';
import FileUploadField from '@/components/FileUploadField';
import ModalShell from '@/components/ModalShell';
import { formatPeso } from '@/utils/pricing';

/**
 * Multi-document request form.
 *
 * A student ticks any number of document types; the whole
 * selection once. Each ticked type expands to its own fields (copies,
 * study years, attachment), because fees and requirements differ per type.
 *
 * The list, fees and attachment rules all come from `document_types`, so the
 * Registrar can add or reprice a document without a code change.
 */
export default function NewRequestModal({
  user,
  setActiveModal,
  documentTypes,
  documentTypesLoading,
  selections,
  toggleDocumentType,
  updateSelection,
  handleStudentSubmitRequest,
  actionLoading,
}) {
  const selectedNames = Object.keys(selections);
  const availableTypes = documentTypes.filter(t => !t.is_walk_in && ((t.available_to || 'both') === 'both' || t.available_to === (user.user_type || 'student')));

  const needsStudyYears = name => ['Transcript of Records', 'Transcript of Records (TOR)'].includes(name);
  const needsRequestingSchool = (name) =>
    name === 'Transcript of Records' || name === 'Honorable Dismissal';
  const needsYearGraduated = (name) =>
    name === 'Graduation Clearance' || name === 'Diploma';

  const missingYears = selectedNames.some(name => (needsStudyYears(name) && yearError(String(user.year_started ?? ''), { label: 'Year Started', minimum: 2002, required: true }))
    || (needsYearGraduated(name) && yearError(String((user.user_type === 'alumni' ? user.graduation_year : user.graduation_year || user.last_attendance_year) ?? ''), { label: 'Year Graduated', minimum: 2002, required: true })));
  const completeStudyYears = () => {
    setActiveModal(null);
    window.dispatchEvent(new CustomEvent('open-profile-settings', { detail: { section: 'educational' } }));
  };

  return (
    <ModalShell
      open
      onClose={() => setActiveModal(null)}
      title="New Request"
      maxWidth="max-w-[535px]"
      headerClassName="shrink-0 px-5 pt-6 pb-2 pr-16"
      bodyClassName="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4"
      footerClassName="shrink-0 px-5 pb-6 pt-2"
      footer={
        <div className="mx-auto flex w-full max-w-[285px] flex-col sm:flex-row gap-2">
          <Button
            type="button"
            onClick={() => setActiveModal(null)}
            className="trace-button trace-button-secondary flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="new-request-form"
            disabled={actionLoading || documentTypesLoading || missingYears || selectedNames.length === 0 || selectedNames.some(name => !availableTypes.some(type => type.name === name && !type.unavailable_reason))}
            className="trace-button trace-button-primary flex-1"
          >
            {actionLoading ? 'Submitting...' : 'Next'}
          </Button>
        </div>
      }
    >
      <p className="text-xs text-gray-400 dark:text-gray-400 mt-1 mb-5">
        Select one or more documents. Nothing is paid now — the College Secretary sets the amount once your documents are printed.
      </p>

      <form id="new-request-form" onSubmit={handleStudentSubmitRequest} className="space-y-6">
          {/* Auto-filled identity */}
          <div className="trace-form-grid bg-gray-50/50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="request-student-name" className="trace-label">Student Name</label>
              <input id="request-student-name" type="text" value={user?.full_name || ''} disabled className="trace-control" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="request-student-id" className="trace-label">Student ID</label>
              <input id="request-student-id" type="text" value={user?.student_id || ''} disabled className="trace-control" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="trace-label">
              Documents Requested {selectedNames.length > 0 && `(${selectedNames.length} selected)`}
            </label>

            {documentTypesLoading ? (
              <div className="py-8 flex justify-center">
                <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-700 border-t-[#15803d] rounded-full animate-spin" />
              </div>
            ) : availableTypes.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-400 py-4">No document types are available right now.</p>
            ) : (
              <div className="space-y-3 max-h-[22rem] overflow-y-auto pr-1">
                {availableTypes.map((type) => {
                  const selection = selections[type.name];
                  const isSelected = Boolean(selection);
                  const yearId = `request-start-${type.id ?? type.name.replace(/[^a-z0-9]+/gi, '-')}`;

                  return (
                    <div
                      key={type.name}
                      data-card-disabled={Boolean(type.unavailable_reason) || undefined}
                      className={`trace-card-controls trace-card-inset rounded-lg border transition-colors ${
                        isSelected ? 'border-[#15803d] bg-emerald-50/40 dark:bg-emerald-950/40' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
                      }`}
                    >
                      <label className={`flex flex-wrap items-start gap-3 p-4 ${type.unavailable_reason ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                          type="checkbox"
                          disabled={Boolean(type.unavailable_reason)}
                          checked={isSelected}
                          onChange={() => toggleDocumentType(type.name)}
                          className="trace-choice w-4 h-4 accent-[#15803d] enabled:cursor-pointer disabled:cursor-not-allowed"
                        />
                        <span className="min-w-0 flex-1 basis-40 text-sm font-semibold text-gray-800 dark:text-gray-100">
                          {type.name}
                          {type.name === 'Diploma' && <span className="ml-1 text-[10px] text-gray-500 dark:text-gray-400 font-normal italic">(Reissue Fee)</span>}
                        </span>
                        <span className="w-full sm:w-auto min-w-0 text-sm font-semibold text-[#15803d] dark:text-green-300">
                          {formatPeso(type.base_fee)}
                          <span className="text-[9px] text-gray-400 dark:text-gray-400 font-semibold">{type.fee_rule === 'per_semester_block' ? ' per printed page' : ' per copy'}</span>
                        </span>
                      </label>
                      {type.unavailable_reason && <p className="px-4 pb-3 text-xs text-amber-800 dark:text-amber-300">{type.unavailable_reason}</p>}

                      {isSelected && (
                        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-emerald-100/70 dark:border-emerald-800/70">
                          <label className="trace-label flex flex-col gap-1.5">
                            Copies
                            <input type="number" min="1" max={isHonorableDismissal(type.name) ? 1 : 2147483647} step="1" required
                              value={selection.copies} onChange={e => updateSelection(type.name, { copies: e.target.value })}
                              className="trace-control w-full" />
                          </label>
                          {needsStudyYears(type.name) && <div>
                            <label htmlFor={yearId} className="trace-label">Year Started</label>
                            <input id={yearId} type="text" readOnly value={user.year_started ?? ''}
                              aria-describedby={`${yearId}-hint`} className="trace-control mt-1.5" />
                            <p id={`${yearId}-hint`} className="mt-1 text-xs text-gray-600 dark:text-gray-300">Saved in your profile. Ask Admin if a correction is needed.</p>
                          </div>}


                          {needsRequestingSchool(type.name) && (
                            <div className="flex flex-col gap-1.5">
                              <label htmlFor={`${yearId}-school`} className="trace-label">
                                Requesting School / Company
                              </label>
                              <input id={`${yearId}-school`} maxLength={INPUT_LIMITS.name}
                                type="text" required
                                value={selection.requestingSchool}
                                onChange={(e) => updateSelection(type.name, { requestingSchool: e.target.value })}
                                placeholder="e.g. Mapua University"
                                className="trace-control w-full"
                              />
                            </div>
                          )}

                          {needsYearGraduated(type.name) && <label className="trace-label">
                            {user.user_type === 'alumni' ? 'Year Graduated' : 'Year Graduated / Last Attended'}
                            <input type="text" readOnly value={(user.user_type === 'alumni' ? user.graduation_year : user.graduation_year || user.last_attendance_year) ?? ''} className="trace-control mt-1.5" />
                          </label>}


                            <div className="grid grid-cols-1 gap-3">
                              <div className="flex flex-col gap-1.5">
                                <label htmlFor={`${yearId}-purpose`} className="trace-label">Purpose</label>
                              <input id={`${yearId}-purpose`} maxLength={INPUT_LIMITS.shortText}
                                type="text" required
                                value={selection.purpose}
                                onChange={(e) => updateSelection(type.name, { purpose: e.target.value })}
                                placeholder="e.g. Employment"
                                className="trace-control w-full"
                              />
                            </div>
                          </div>

                          {type.requires_attachment ? (
                            <div className="flex flex-col gap-1.5">
                              <p className="trace-label">
                                {type.attachment_label || 'Supporting Attachment'}
                                <span className="font-normal normal-case text-gray-400 dark:text-gray-400 ml-1">
                                  · upload now, or bring it to Window 1
                                </span>
                              </p>
                              <FileUploadField showLabel={false} label={type.attachment_label || 'Supporting Attachment'} file={selection.file} onChange={file => updateSelection(type.name, { file })} />
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1.5">
                              <label className="trace-label">
                                Required Attachment: <span className="text-gray-500 dark:text-gray-400 font-normal">None</span>
                              </label>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {missingYears && <div className="trace-error space-y-2" role="alert">
            <p>Complete the required study years in Edit Profile before submitting. Saved years require Admin correction.</p>
            <Button type="button" onClick={completeStudyYears} className="trace-button trace-button-secondary flex-1">Complete Study Years</Button>
          </div>}
          <p className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-4 text-xs text-green-800 dark:text-green-300">
            Rates are for your information. After printing, the Secretary confirms the final charge.
            The full pricing breakdown and request total will appear on your dashboard before payment.
          </p>
      </form>
    </ModalShell>
  );
}
