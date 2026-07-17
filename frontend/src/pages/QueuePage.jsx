import { useDocuments } from '../utils/hooks'

export default function QueuePage() {
  const { 
    documents, loading, error, page, setPage, totalPages, total, 
    handleAction, stats 
  } = useDocuments(5)

  const getStatusBadge = (status) => {
    switch (status) {
      case 'submitted': return <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold uppercase tracking-wider">Submitted</span>
      case 'processing': return <span className="px-3 py-1 bg-pine-50 text-pine-600 rounded-full text-xs font-semibold uppercase tracking-wider">Processing</span>
      case 'approved': return <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-semibold uppercase tracking-wider">Approved</span>
      case 'rejected': return <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-semibold uppercase tracking-wider">Rejected</span>
      default: return <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold uppercase tracking-wider">{status}</span>
    }
  }

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="flex flex-col gap-8">
      {/* Title Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <h1 className="text-4xl font-display font-bold text-gray-900">
          Welcome back, <span className="text-gray-400 font-normal">Registrar</span>
        </h1>
        <div className="flex items-center gap-4">
          <div className="bg-white rounded-full px-5 py-2.5 shadow-sm flex items-center gap-3 text-sm font-medium text-gray-700">
            <span className="font-bold text-gray-900">Today:</span> {today}
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          </div>
          <button className="bg-white rounded-full px-5 py-2.5 shadow-sm flex items-center gap-2 text-sm font-bold text-gray-900 hover:bg-gray-50 transition-colors">
            Lorem <div className="w-5 h-5 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs">+</div>
          </button>
        </div>
      </div>

      {/* 3 Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100/50 flex flex-col hover:shadow-md transition-shadow">
           <div className="flex justify-between items-center mb-4">
             <h3 className="text-xs font-bold text-gray-800 tracking-wider uppercase">Real-Time Documents Pending</h3>
             <span className="text-gray-400">•••</span>
           </div>
           <div className="flex justify-between items-end mb-6">
             <div>
               <div className="text-4xl font-display font-bold text-gray-900 leading-none">142</div>
               <div className="text-xs text-gray-400 mt-1">Documents</div>
             </div>
             <svg className="w-24 h-12 text-pine-500" viewBox="0 0 100 40" fill="none" stroke="currentColor" strokeWidth="2"><path d="M0 30 Q 20 30, 30 20 T 50 10 T 70 15 T 100 25" strokeLinecap="round" /><circle cx="50" cy="10" r="3" fill="currentColor"/></svg>
           </div>
           <div className="bg-pine-100/60 text-pine-700 text-xs font-medium px-4 py-3 rounded-xl flex items-start gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-pine-500 mt-1 flex-shrink-0"></div>
             24 documents undergoing live OCR scanning right now
           </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100/50 flex flex-col hover:shadow-md transition-shadow">
           <div className="flex justify-between items-center mb-4">
             <h3 className="text-xs font-bold text-gray-800 tracking-wider uppercase">Smart Queue Operational</h3>
             <span className="text-gray-400">•••</span>
           </div>
           <div className="flex justify-between items-end mb-6">
             <div>
               <div className="text-4xl font-display font-bold text-gray-900 leading-none">14.8</div>
               <div className="text-xs text-gray-400 mt-1">min</div>
             </div>
             <svg className="w-24 h-12 text-pine-500" viewBox="0 0 100 40" fill="none" stroke="currentColor" strokeWidth="2"><path d="M0 25 Q 20 25, 30 15 T 60 5 T 80 10 T 100 20" strokeLinecap="round" /><circle cx="60" cy="5" r="3" fill="currentColor"/></svg>
           </div>
           <div className="bg-pine-600 text-white text-xs font-medium px-4 py-3 rounded-xl">
             +12.8% throughput improvement over historical baseline
           </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100/50 flex flex-col hover:shadow-md transition-shadow">
           <div className="flex justify-between items-center mb-4">
             <h3 className="text-xs font-bold text-gray-800 tracking-wider uppercase">Core ML Routing Confidence Average</h3>
           </div>
           <div className="flex justify-between items-end mb-6">
             <div>
               <div className="text-4xl font-display font-bold text-gray-900 leading-none">94.2%</div>
               <div className="text-xs text-gray-400 mt-1">Average</div>
             </div>
             <svg className="w-24 h-12 text-pine-500" viewBox="0 0 100 40" fill="none" stroke="currentColor" strokeWidth="2"><path d="M0 20 Q 20 30, 30 20 T 60 5 T 80 15 T 100 25" strokeLinecap="round" /><circle cx="60" cy="5" r="3" fill="currentColor"/></svg>
           </div>
           <div className="bg-pine-100/60 text-pine-700 text-xs font-medium px-4 py-3 rounded-xl flex items-start gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-pine-500 mt-1 flex-shrink-0"></div>
             OCR automation extraction target baseline stable.
           </div>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-gray-100/50">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wide">Document Queue Table</h2>
              <p className="text-sm text-gray-400">Review and action pending documents directly from your desk.</p>
            </div>
            <button className="p-2 text-gray-400 hover:text-gray-800 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>
            </button>
          </div>

          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium flex items-center gap-2"><svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>{error}</div>}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider font-semibold">
                  <th className="p-4 rounded-l-xl font-semibold">Tracking / Student</th>
                  <th className="p-4 font-semibold">Document Type</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Uploaded</th>
                  <th className="p-4 rounded-r-xl text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan="5" className="p-8 text-center text-gray-400">Loading documents...</td></tr>
                ) : documents.length === 0 ? (
                  <tr><td colSpan="5" className="p-8 text-center text-gray-400">No pending documents in your queue.</td></tr>
                ) : (
                  documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50/30 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center font-bold text-gray-600 shadow-sm border border-gray-200">
                            {doc.student_id ? doc.student_id.slice(-2) : 'S'}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{doc.student_name || 'Unknown Student'}</div>
                            <div className="text-xs text-gray-400 font-mono mt-0.5">{doc.tracking_number}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-medium text-gray-700">{doc.document_type || '—'}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(doc.current_status)}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-500">{new Date(doc.created_at).toLocaleDateString()}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleAction(doc.id, 'approve')} className="px-4 py-1.5 bg-pine-600 text-white rounded-full text-xs font-bold hover:bg-pine-700 shadow-sm hover:shadow transition-all">Approve</button>
                          <button onClick={() => handleAction(doc.id, 'reject')} className="px-4 py-1.5 bg-white border border-gray-200 text-red-500 rounded-full text-xs font-bold hover:bg-red-50 hover:border-red-200 transition-all">Reject</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 px-2">
              <div className="text-sm text-gray-500">
                Showing <span className="font-medium text-gray-900">{(page - 1) * 5 + 1}</span> to <span className="font-medium text-gray-900">{Math.min(page * 5, total)}</span> of <span className="font-medium text-gray-900">{total}</span> results
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm font-semibold bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm font-semibold bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side Stats */}
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100/50 flex-1 flex flex-col">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Processing Rate</h3>
                <p className="text-xs text-gray-400 mt-1">Last 7 days</p>
              </div>
              <button className="text-gray-400 hover:text-gray-800">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>
              </button>
            </div>
            {/* Mock Bar Chart */}
            <div className="mt-auto flex items-end justify-between h-32 gap-2">
               {[40, 60, 50, 80, 50, 100, 70, 45].map((h, i) => (
                 <div key={i} className="w-full bg-pine-300 rounded-t-sm hover:bg-pine-400 transition-colors cursor-pointer" style={{ height: `${h}%` }}></div>
               ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100/50 flex flex-col justify-center gap-6">
             <div>
               <div className="flex justify-between text-xs font-semibold mb-2">
                 <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-pine-500"></div> Approved</div>
                 <span className="text-gray-900">{stats.approvedPercentage}%</span>
               </div>
               <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-pine-500 h-1.5 rounded-full" style={{ width: `${stats.approvedPercentage}%` }}></div></div>
             </div>
             <div>
               <div className="flex justify-between text-xs font-semibold mb-2">
                 <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-dusk-500"></div> Pending</div>
                 <span className="text-gray-900">{stats.pendingPercentage}%</span>
               </div>
               <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-dusk-500 h-1.5 rounded-full" style={{ width: `${stats.pendingPercentage}%` }}></div></div>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
