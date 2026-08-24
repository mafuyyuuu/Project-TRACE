import { createPortal } from 'react-dom';
import { itemAmount, groupTotal, formatPeso } from '@/utils/pricing';

/**
 * Multi-document request form.
 *
 * A student ticks any number of document types and pays for the whole
 * selection once. Each ticked type expands to its own fields (copies,
 * semesters, attachment), because fees and requirements differ per type.
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
  const total = groupTotal(documentTypes, selections);

  /** TOR asks for semesters; a couple of types ask where the document is going. */
  const needsSemesters = (type) => type.fee_rule === 'per_semester_block';
  const needsRequestingSchool = (name) =>
    name === 'Transcript of Records' || name === 'Honorable Dismissal';
  const needsYearGraduated = (name) =>
    name === 'Graduation Clearance' || name === 'Diploma';

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setActiveModal(null)}></div>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 sm:p-8 z-10 border border-gray-100 relative">
        <button className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100" onClick={() => setActiveModal(null)}>✕</button>

        <h3 className="text-xl font-black text-gray-900">New Request</h3>
        <p className="text-xs text-gray-400 mt-1 font-semibold pb-5 mb-6 border-b border-gray-100">
          Select one or more documents — you only pay once for the whole request.
        </p>

        <form onSubmit={handleStudentSubmitRequest} className="space-y-6">
          {/* Auto-filled identity */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Student Name</label>
              <input type="text" value={user?.full_name || ''} disabled className="bg-transparent border-none p-0 text-sm font-bold text-gray-900" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Student ID</label>
              <input type="text" value={user?.student_id || ''} disabled className="bg-transparent border-none p-0 text-sm font-bold text-gray-900" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">
              Documents Requested {selectedNames.length > 0 && `(${selectedNames.length} selected)`}
            </label>

            {documentTypesLoading ? (
              <div className="py-8 flex justify-center">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-[#15803d] rounded-full animate-spin" />
              </div>
            ) : documentTypes.length === 0 ? (
              <p className="text-xs text-gray-400 py-4">No document types are available right now.</p>
            ) : (
              <div className="space-y-3 max-h-[22rem] overflow-y-auto pr-1">
                {documentTypes.map((type) => {
                  const selection = selections[type.name];
                  const isSelected = Boolean(selection);

                  return (
                    <div
                      key={type.name}
                      className={`rounded-2xl border transition-all ${
                        isSelected ? 'border-[#15803d] bg-emerald-50/40' : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <label className="flex items-center gap-3 p-4 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleDocumentType(type.name)}
                          className="w-4 h-4 accent-[#15803d] cursor-pointer"
                        />
                        <span className="flex-1 text-xs font-bold text-gray-800">{type.name}</span>
                        <span className="text-xs font-black text-[#15803d]">
                          {isSelected ? formatPeso(itemAmount(type, selection)) : formatPeso(type.base_fee)}
                          {type.fee_rule === 'per_semester_block' && !isSelected && (
                            <span className="text-[9px] text-gray-400 font-semibold"> /4 sems</span>
                          )}
                        </span>
                      </label>

                      {isSelected && (
                        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-emerald-100/70">
                          {needsSemesters(type) && (
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">
                                Semesters attended
                              </label>
                              <input
                                type="number" min="1" required
                                value={selection.semesters}
                                onChange={(e) => updateSelection(type.name, { semesters: e.target.value })}
                                className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#15803d]/20"
                              />
                              <p className="text-[10px] text-gray-400">
                                4 semesters = 1 page ({formatPeso(type.base_fee)}/page)
                              </p>
                            </div>
                          )}

                          {needsRequestingSchool(type.name) && (
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">
                                Requesting School / Company
                              </label>
                              <input
                                type="text" required
                                value={selection.requestingSchool}
                                onChange={(e) => updateSelection(type.name, { requestingSchool: e.target.value })}
                                placeholder="e.g. Mapua University"
                                className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#15803d]/20"
                              />
                            </div>
                          )}

                          {needsYearGraduated(type.name) && (
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">
                                Year Graduated / Last Attended
                              </label>
                              <input
                                type="text" required
                                value={selection.yearGraduated}
                                onChange={(e) => updateSelection(type.name, { yearGraduated: e.target.value })}
                                placeholder="e.g. 2025"
                                className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#15803d]/20"
                              />
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">Copies</label>
                              <input
                                type="number" min="1" required
                                value={selection.copies}
                                onChange={(e) => updateSelection(type.name, { copies: e.target.value })}
                                className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#15803d]/20"
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">Purpose</label>
                              <input
                                type="text" required
                                value={selection.purpose}
                                onChange={(e) => updateSelection(type.name, { purpose: e.target.value })}
                                placeholder="e.g. Employment"
                                className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#15803d]/20"
                              />
                            </div>
                          </div>

                          {type.requires_attachment && (
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">
                                {type.attachment_label || 'Required Attachment'}
                              </label>
                              <div className="border-2 border-dashed border-gray-300 rounded-xl p-3 bg-white flex items-center justify-center cursor-pointer hover:bg-gray-50 relative">
                                {selection.file ? (
                                  <span className="text-xs font-bold text-[#15803d] truncate max-w-full">
                                    ✓ {selection.file.name}
                                  </span>
                                ) : (
                                  <span className="text-xs font-bold text-gray-600">
                                    <span className="text-[#15803d]">Click here</span> to upload{' '}
                                    {type.attachment_helper || 'the required file'}
                                  </span>
                                )}
                                <input
                                  type="file" required
                                  onChange={(e) => updateSelection(type.name, { file: e.target.files[0] })}
                                  className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                              </div>
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

          {/* Running total for the whole request */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
            {selectedNames.length === 0 ? (
              <p className="text-xs text-gray-400 text-center font-semibold">
                Select at least one document to see your total.
              </p>
            ) : (
              <>
                <div className="space-y-1.5 pb-3 border-b border-gray-200">
                  {selectedNames.map((name) => {
                    const type = documentTypes.find((t) => t.name === name);
                    return (
                      <div key={name} className="flex justify-between text-[11px] text-gray-600 font-semibold">
                        <span>
                          {name}
                          {selections[name].copies > 1 && ` × ${selections[name].copies}`}
                        </span>
                        <span>{formatPeso(itemAmount(type, selections[name]))}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between items-center pt-3">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                    Total ({selectedNames.length} document{selectedNames.length > 1 ? 's' : ''})
                  </span>
                  <span className="text-lg font-black text-[#15803d]">{formatPeso(total)}</span>
                </div>
              </>
            )}
          </div>

          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-xs leading-relaxed text-[#15803d] font-bold flex items-center gap-2">
            <span className="w-2 h-2 bg-[#15803d] rounded-full shrink-0"></span>
            One payment covers every document in this request.
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading || selectedNames.length === 0}
              className="px-8 py-3 bg-[#15803d] hover:bg-[#166534] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md transition-all uppercase tracking-wider"
            >
              {actionLoading ? 'Submitting...' : 'Next'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
