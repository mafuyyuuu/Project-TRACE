import SecretaryEvaluationModal from '@/features/secretary/components/SecretaryEvaluationModal';
import MiniSparkline from '@/components/MiniSparkline';
import { getStatusLabel } from '@/utils/documentStatus';
import { getRelativeTime } from '@/utils/formatters';

/**
 * College secretary: evaluation queue and split-screen OCR evaluation modal.
 */
export default function SecretaryDashboard({
  documents,
  dashStats,
  actionLoading,
  clerkNotes,
  setClerkNotes,
  evalStudentId,
  setEvalStudentId,
  evalStudentName,
  setEvalStudentName,
  evalDocType,
  setEvalDocType,
  activeModal,
  setActiveModal,
  selectedDoc,
  setSelectedDoc,
  setViewImageUrl,
  handleSecretaryEvaluate,
  currentTab,
  todayFormatted,
}) {
  return (
    <>
      <div className="space-y-8 animate-fade-in">
        {/* 4.1. COLLEGE SECRETARY - WORKSPACE DASHBOARD */}
        {currentTab === 'dashboard' && (
          <>
            {/* Welcome Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-3xl font-display font-black text-gray-900 tracking-tight">
                  Welcome back, <span className="text-[#15803d] font-bold">College Secretary</span>
                </h2>
              </div>
              <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-5 py-2.5 shadow-sm">
                <span className="text-xs font-semibold text-gray-500">Today:</span>
                <span className="text-xs font-bold text-gray-800">{todayFormatted}</span>
                <svg className="w-4 h-4 text-gray-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between h-44">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">PROCESSED DOCUMENT TODAY</span>
                    <span className="text-3xl font-display font-black text-gray-900 mt-2 block">{dashStats.processed_today} <span className="text-sm text-gray-400 font-medium font-sans">Documents</span></span>
                  </div>
                  <MiniSparkline trend="up" />
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 text-[10px] font-bold text-[#15803d] w-fit flex items-center gap-1.5 mt-2">
                  <span className="w-1.5 h-1.5 bg-[#15803d] rounded-full"></span>
                  Documents evaluated and routed today
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between h-44">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">PENDING DOCUMENTS</span>
                    <span className="text-3xl font-display font-black text-gray-900 mt-2 block">
                      {dashStats.pending_secretary_count} <span className="text-sm text-gray-400 font-medium font-sans">Documents</span>
                    </span>
                  </div>
                  <MiniSparkline trend="down" />
                </div>
                <div className="bg-[#15803d] rounded-xl px-4 py-2 text-[10px] font-medium text-white w-full mt-2 leading-snug">
                  Documents awaiting your verification review
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between h-44">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">APPROVED & ROUTED</span>
                    <span className="text-3xl font-display font-black text-gray-900 mt-2 block">
                      {dashStats.ready_window_1_count + dashStats.completed_today_count} <span className="text-sm text-gray-400 font-medium font-sans">Done</span>
                    </span>
                  </div>
                  <MiniSparkline trend="up" />
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 text-[10px] font-bold text-[#15803d] w-fit flex items-center gap-1.5 mt-2">
                  <span className="w-1.5 h-1.5 bg-[#15803d] rounded-full"></span>
                  Approved and routed to Window 1 for release
                </div>
              </div>
            </div>

            {/* Active Queue Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden mt-8">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <h3 className="font-bold text-gray-950 text-sm tracking-wider uppercase">ACTIVE QUEUE</h3>
              </div>
              <div className="p-6 overflow-x-auto">
                {dashStats.pending_secretary_count === 0 ? (
                  <div className="text-center py-12 text-gray-400 font-medium">Evaluation queue is empty! Beautiful.</div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100">
                        <th className="pb-4 font-bold pl-4">Document Details</th>
                        <th className="pb-4 font-bold">Category</th>
                        <th className="pb-4 font-bold">Time Received</th>
                        <th className="pb-4 font-bold">Status</th>
                        <th className="pb-4 font-bold text-right pr-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {documents.filter(d => d.current_status === 'pending_secretary').map(doc => (
                        <tr key={doc.id} className="hover:bg-gray-50/30 group">
                          <td className="py-4 pl-4">
                            <div className="font-bold text-gray-900">{doc.student_name || 'Unresolved Student'}</div>
                            <div className="text-xs font-mono text-gray-400 mt-0.5">#{doc.tracking_number ? doc.tracking_number.slice(0, 10).toUpperCase() : doc.id}</div>
                          </td>
                          <td className="py-4 text-xs font-bold text-gray-600">{doc.document_type || 'Transcript of Records'}</td>
                          <td className="py-4 text-xs text-gray-400">{getRelativeTime(doc.updated_at)}</td>
                          <td className="py-4">
                            <span className="px-3 py-1 bg-emerald-50 text-[#15803d] text-[10px] font-black rounded-full uppercase tracking-wider">PAID</span>
                          </td>
                          <td className="py-4 text-right pr-4">
                            <button 
                              onClick={() => {
                                setSelectedDoc(doc);
                                setEvalStudentId(doc.student_id || '');
                                setEvalStudentName(doc.student_name || '');
                                setEvalDocType(doc.document_type || 'Transcript of Records');
                                setActiveModal('evaluate');
                              }}
                              className="px-4 py-2 bg-[#15803d] hover:bg-[#166534] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 ml-auto"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                              Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}

        {/* 4.2. COLLEGE SECRETARY - COMPLETED LOGS */}
        {currentTab === 'completed-logs' && (
          <>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-3xl font-display font-black text-gray-900 tracking-tight">
                  Completed Logs
                </h2>
              </div>
            </div>

            {/* Completed Logs Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <h3 className="font-bold text-gray-950 text-sm tracking-wider uppercase">COMPLETED LOGS</h3>
              </div>
              <div className="p-6 overflow-x-auto">
                {documents.filter(d => ['ready_window_1', 'completed', 'released'].includes(d.current_status)).length === 0 ? (
                  <div className="text-center py-12 text-gray-400 font-medium">No completed evaluation logs found.</div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100">
                        <th className="pb-4 font-bold pl-4">Date Approved</th>
                        <th className="pb-4 font-bold">Document Details</th>
                        <th className="pb-4 font-bold">Category</th>
                        <th className="pb-4 font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {documents.filter(d => ['ready_window_1', 'completed', 'released'].includes(d.current_status)).map(doc => (
                        <tr key={doc.id} className="hover:bg-gray-50/30">
                          <td className="py-4 pl-4 text-xs font-semibold text-gray-400">{new Date(doc.updated_at).toLocaleDateString()} {new Date(doc.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                          <td className="py-4">
                            <div className="font-bold text-gray-900">{doc.student_name || 'Unknown Student'}</div>
                            <div className="text-xs font-mono text-gray-400 mt-0.5">#{doc.tracking_number ? doc.tracking_number.slice(0, 10).toUpperCase() : doc.id}</div>
                          </td>
                          <td className="py-4 text-xs font-bold text-gray-600">{doc.document_type}</td>
                          <td className="py-4">
                            <span className="px-3 py-1 bg-emerald-50 text-[#15803d] text-[10px] font-black rounded-full uppercase tracking-wider">APPROVED</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}

        {/* College Secretary Split-Screen Modal */}
        {activeModal === 'evaluate' && selectedDoc && (
          <SecretaryEvaluationModal
            selectedDoc={selectedDoc}
            setActiveModal={setActiveModal}
            getStatusLabel={getStatusLabel}
            evalStudentId={evalStudentId}
            setEvalStudentId={setEvalStudentId}
            evalStudentName={evalStudentName}
            setEvalStudentName={setEvalStudentName}
            evalDocType={evalDocType}
            setEvalDocType={setEvalDocType}
            clerkNotes={clerkNotes}
            setClerkNotes={setClerkNotes}
            actionLoading={actionLoading}
            handleSecretaryEvaluate={handleSecretaryEvaluate}
            setViewImageUrl={setViewImageUrl}
          />
        )}
      </div>
    </>
  );
}
