import ModalShell from '@/components/ModalShell';

/**
 * Digitizes a physical walk-in request or legacy record right from the
 * intake flow, instead of a separate sidebar tab the clerk had to navigate
 * away to. Field ids (`manual-student-id`, `manual-full-name`,
 * `manual-course`) are read by `handleFetchStudent` via `getElementById` —
 * keep them stable if this markup ever moves again.
 */
export default function ManualInputModal({
  open,
  onClose,
  handleManualInputSubmit,
  handleFetchStudent,
  actionLoading,
}) {
  return (
    <ModalShell open={open} onClose={onClose} title="Manual Input" maxWidth="max-w-3xl">
      <p className="text-sm font-semibold text-gray-500 mb-8 leading-relaxed">
        Digitize physical walk-in requests and legacy records.
      </p>

      <form onSubmit={handleManualInputSubmit} className="space-y-10">
        {/* STUDENT INFORMATION */}
        <div>
          <h3 className="text-xs font-black text-[#15803d] uppercase tracking-widest border-b border-gray-100 pb-3 mb-6">STUDENT INFORMATION</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Student ID</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="studentId"
                  id="manual-student-id"
                  placeholder="e.g. 23-23922"
                  required
                  className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={handleFetchStudent}
                  className="px-4 py-3 bg-[#15803d] text-white rounded-xl text-xs font-bold hover:bg-[#166534] transition-all shadow-sm shrink-0"
                >
                  FETCH
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Full Name</label>
              <input
                type="text"
                name="fullName"
                id="manual-full-name"
                placeholder="Last Name, First Name"
                required
                className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none transition-all"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Course / Program</label>
              <select
                name="course"
                id="manual-course"
                required
                className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none transition-all cursor-pointer"
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
          <h3 className="text-xs font-black text-[#15803d] uppercase tracking-widest border-b border-gray-100 pb-3 mb-6">DOCUMENT DETAILS</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Requested Document</label>
              <select
                name="docType"
                required
                className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none transition-all cursor-pointer"
              >
                <option value="" disabled selected>Document Type</option>
                <option>Transcript of Records</option>
                <option>Clearance</option>
                <option>Certification</option>
                <option>Diploma</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Purpose of Request</label>
              <select
                name="purpose"
                required
                className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none transition-all cursor-pointer"
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
            <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Clerk Remarks / Notes (Optional)</label>
            <textarea
              name="remarks"
              placeholder="Enter remarks..."
              className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none transition-all h-28 resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={actionLoading}
            className="px-8 py-3 bg-[#15803d] hover:bg-[#166534] disabled:opacity-75 text-white font-bold rounded-xl text-xs shadow-md transition-all uppercase tracking-wider"
          >
            {actionLoading ? 'Saving...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
