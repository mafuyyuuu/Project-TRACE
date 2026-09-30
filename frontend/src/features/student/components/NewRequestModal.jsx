import { INPUT_LIMITS } from '@/utils/inputLimits';
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

  return (
    <ModalShell
      open
      onClose={() => setActiveModal(null)}
      title="New Request"
      maxWidth="max-w-2xl"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setActiveModal(null)}
            className="px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="new-request-form"
            disabled={actionLoading || documentTypesLoading || selectedNames.length === 0 || selectedNames.some(name => !availableTypes.some(type => type.name === name && !type.unavailable_reason))}
            className="px-8 py-3 bg-[#15803d] hover:bg-[#166534] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md transition-all uppercase tracking-wider"
          >
            {actionLoading ? 'Submitting...' : 'Next'}
          </button>
        </div>
      }
    >
      <p className="text-xs text-gray-400 dark:text-gray-400 mt-1 font-semibold pb-5 mb-6 border-b border-gray-100 dark:border-gray-700">
        Select one or more documents. Nothing is paid now — the College Secretary sets the amount once your documents are printed.
      </p>

      <form id="new-request-form" onSubmit={handleStudentSubmitRequest} className="space-y-6">
          {/* Auto-filled identity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Student Name</label>
              <input type="text" value={user?.full_name || ''} disabled className="bg-transparent border-none p-0 text-sm font-bold text-gray-900 dark:text-gray-100" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Student ID</label>
              <input type="text" value={user?.student_id || ''} disabled className="bg-transparent border-none p-0 text-sm font-bold text-gray-900 dark:text-gray-100" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-800 dark:text-gray-100 uppercase tracking-widest">
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

                  return (
                    <div
                      key={type.name}
                      className={`rounded-2xl border transition-all ${
                        isSelected ? 'border-[#15803d] bg-emerald-50/40 dark:bg-emerald-950/40' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <label className="flex items-center gap-3 p-4 cursor-pointer">
                        <input
                          type="checkbox"
                          disabled={Boolean(type.unavailable_reason)}
                          checked={isSelected}
                          onChange={() => toggleDocumentType(type.name)}
                          className="w-4 h-4 accent-[#15803d] cursor-pointer"
                        />
                        <span className="flex-1 text-xs font-bold text-gray-800 dark:text-gray-100">
                          {type.name}
                          {type.name === 'Diploma' && <span className="ml-1 text-[10px] text-gray-500 dark:text-gray-400 font-normal italic">(Reissue Fee)</span>}
                        </span>
                        <span className="text-xs font-black text-[#15803d] dark:text-green-300">
                          {formatPeso(type.base_fee)}
                          <span className="text-[9px] text-gray-400 dark:text-gray-400 font-semibold">{type.fee_rule === 'per_semester_block' ? ' per printed page' : ' per copy'}</span>
                        </span>
                      </label>
                      {type.unavailable_reason && <p className="px-4 pb-3 text-xs text-amber-800 dark:text-amber-300">{type.unavailable_reason}</p>}

                      {isSelected && (
                        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-emerald-100/70 dark:border-emerald-800/70">
                          <label className="flex flex-col gap-1.5 text-xs font-semibold">
                            Copies
                            <input type="number" min="1" max={type.is_repeatable === false || type.name === 'Honorable Dismissal' ? 1 : 2147483647} step="1" required
                              value={selection.copies} onChange={e => updateSelection(type.name, { copies: e.target.value })}
                              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2.5" />
                          </label>
                          {needsStudyYears(type.name) && <div className="grid grid-cols-2 gap-3">
                            {[['year_started', 'Year Started'], ['year_ended', 'Year Ended']].map(([key, label]) => <label key={key} className="text-xs font-semibold">
                              {label}<input type="number" required min="1900" max={new Date().getFullYear()} step="1" value={selection[key] || ''}
                                onChange={event => updateSelection(type.name, { [key]: event.target.value })}
                                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2.5" />
                            </label>)}
                          </div>}

                          {needsRequestingSchool(type.name) && (
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
                                Requesting School / Company
                              </label>
                              <input maxLength={INPUT_LIMITS.name}
                                type="text" required
                                value={selection.requestingSchool}
                                onChange={(e) => updateSelection(type.name, { requestingSchool: e.target.value })}
                                placeholder="e.g. Mapua University"
                                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#15803d]/20"
                              />
                            </div>
                          )}

                          {needsYearGraduated(type.name) && (
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
                                Year Graduated / Last Attended
                              </label>
                              <input maxLength={INPUT_LIMITS.shortText}
                                type="text" required
                                value={selection.yearGraduated}
                                onChange={(e) => updateSelection(type.name, { yearGraduated: e.target.value })}
                                placeholder="e.g. 2025"
                                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#15803d]/20"
                              />
                            </div>
                          )}

                            <div className="grid grid-cols-1 gap-3">
                              <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">Purpose</label>
                              <input maxLength={INPUT_LIMITS.shortText}
                                type="text" required
                                value={selection.purpose}
                                onChange={(e) => updateSelection(type.name, { purpose: e.target.value })}
                                placeholder="e.g. Employment"
                                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#15803d]/20"
                              />
                            </div>
                          </div>

                          {type.requires_attachment ? (
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
                                {type.attachment_label || 'Supporting Attachment'}
                                <span className="font-normal normal-case text-gray-400 dark:text-gray-400 ml-1">
                                  · upload now, or bring it to Window 1
                                </span>
                              </label>
                              <FileUploadField label={type.attachment_label || 'Supporting Attachment'} file={selection.file} onChange={file => updateSelection(type.name, { file })} />
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
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

          <p className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-4 text-xs text-green-800 dark:text-green-300">
            Rates are for your information. After printing, the Secretary confirms the final charge.
            The full pricing breakdown and request total will appear on your dashboard before payment.
          </p>
      </form>
    </ModalShell>
  );
}
