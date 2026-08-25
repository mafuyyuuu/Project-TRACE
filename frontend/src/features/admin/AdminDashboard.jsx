import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import MiniSparkline from '@/components/MiniSparkline';
import useAdminDashboard from '@/features/admin/useAdminDashboard';
import { todayLongDate } from '@/utils/formatters';
import DashboardAlerts from '@/components/DashboardAlerts';
import DashboardLoading from '@/components/DashboardLoading';
import MaintenancePanel from '@/features/admin/components/MaintenancePanel';
import ReportsPanel from '@/features/admin/components/ReportsPanel';
import AnalyticsPanel from '@/features/admin/components/AnalyticsPanel';

/**
 * Registrar admin: ML forecasts, AI insights, account verification, users, and audit logs.
 */
export default function AdminDashboard({ user, currentTab, setViewImageUrl }) {
  const {
    loading,
    success,
    error,
    documents,
    dashStats,
    forecastData,
    aiInsights,
    pendingStudents,
    actionLoading,
    handleAdminVerifyStudent,
    adminDocPage,
    setAdminDocPage,
    itemsPerPage,
    adminDocFilter,
    setAdminDocFilter,
    forecastFilter,
    setForecastFilter,
    adminUsers,
    adminUsersFilter,
    setAdminUsersFilter,
    adminLogs,
  } = useAdminDashboard(user, currentTab);

  const todayFormatted = todayLongDate();

  if (loading) return <DashboardLoading />;

  // These three own their data via their own hooks and replace the default view.
  if (currentTab === 'admin-maintenance') return <MaintenancePanel user={user} currentTab={currentTab} />;
  if (currentTab === 'admin-reports') return <ReportsPanel user={user} currentTab={currentTab} />;
  if (currentTab === 'admin-analytics') return <AnalyticsPanel user={user} currentTab={currentTab} />;

  return (
    <>
      <DashboardAlerts success={success} error={error} />
            {currentTab === 'dashboard' && (
              <div className="space-y-8 animate-fade-in">
                {/* Welcome Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-display font-black text-gray-900 tracking-tight">
                      Welcome back, <span className="text-slate-400 font-medium">Registrar Admin</span>
                    </h2>
                  </div>
                  <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-5 py-2.5 shadow-sm">
                    <span className="text-xs font-semibold text-gray-500">Today:</span>
                    <span className="text-xs font-bold text-gray-800">{todayFormatted}</span>
                    <svg className="w-4 h-4 text-gray-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  </div>
                </div>

                {/* Metrics Overview Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between min-h-44">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">System Throughput</span>
                        <span className="text-2xl sm:text-3xl font-display font-black text-gray-900 mt-2 block">{dashStats.avg_processing_minutes > 0 ? dashStats.avg_processing_minutes.toFixed(1) : '—'} <span className="text-sm text-gray-400 font-medium font-sans">min</span></span>
                      </div>
                      <MiniSparkline trend="up" />
                    </div>
                    <div className="bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 text-[10px] font-bold text-[#15803d] w-fit flex items-center gap-1.5 mt-2">
                      <span className="w-1.5 h-1.5 bg-[#15803d] rounded-full"></span>
                      Average document processing time across all completed requests
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between min-h-44">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">AI Confidence Avg</span>
                        <span className="text-2xl sm:text-3xl font-display font-black text-gray-900 mt-2 block">{dashStats.avg_ocr_confidence > 0 ? dashStats.avg_ocr_confidence.toFixed(1) + '%' : '—'}</span>
                      </div>
                      <MiniSparkline trend="down" />
                    </div>
                    <div className="bg-[#15803d] rounded-xl px-4 py-2 text-[10px] font-medium text-white w-full mt-2 leading-snug">
                      Average extraction accuracy across all scans
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between min-h-44">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Real-time Backlog</span>
                        <span className="text-2xl sm:text-3xl font-display font-black text-gray-900 mt-2 block">
                          {dashStats.backlog_count}
                        </span>
                      </div>
                      <MiniSparkline trend="up" />
                    </div>
                    <div className="bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 text-[10px] font-bold text-[#15803d] w-fit flex items-center gap-1.5 mt-2">
                      <span className="w-1.5 h-1.5 bg-[#15803d] rounded-full"></span>
                      Documents currently pending across all desks
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* volume forecast chart */}
                  <div className="lg:col-span-2 bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-200 flex flex-col min-h-[380px]">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">7-Day Volume Forecast</h3>
                        <p className="text-xs text-gray-400 font-medium">Predicted incoming document volume via Prophet ML.</p>
                      </div>
                      <select 
                        value={forecastFilter}
                        onChange={(e) => setForecastFilter(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-700 font-bold cursor-pointer hover:bg-gray-100 transition-colors focus:outline-none focus:border-[#15803d]"
                      >
                        <option value="All">All Documents</option>
                        <option value="Transcript of Records">Transcript of Records</option>
                        <option value="Clearance">Clearance</option>
                        <option value="Diploma">Diploma</option>
                      </select>
                    </div>
                    {/* Dynamic Recharts line graph */}
                    <div className="flex-1 mt-6 relative h-64 flex flex-col justify-end">
                      {forecastData && forecastData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={forecastData.slice(-5).map(f => {
                              let multiplier = 1;
                              if (forecastFilter === 'Transcript of Records') multiplier = 0.4;
                              if (forecastFilter === 'Clearance') multiplier = 0.3;
                              if (forecastFilter === 'Diploma') multiplier = 0.2;
                              return {
                                day: f.day,
                                volume: Math.max(1, Math.floor(f.predicted_volume * multiplier))
                              };
                            })}
                            margin={{ top: 20, right: 15, left: 15, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#15803d" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#15803d" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <XAxis 
                              dataKey="day" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 'bold' }} 
                              dy={10}
                            />
                            <Tooltip 
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                              itemStyle={{ color: '#15803d', fontWeight: 'bold' }}
                              labelStyle={{ color: '#6b7280', fontWeight: 'bold', marginBottom: '4px' }}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="volume" 
                              stroke="#0f172a" 
                              strokeWidth={2.5}
                              fillOpacity={1} 
                              fill="url(#colorVolume)" 
                              activeDot={{ r: 6, fill: '#15803d', stroke: '#fff', strokeWidth: 2 }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-400 font-medium text-xs">Loading forecast data...</div>
                      )}
                    </div>
                  </div>

                  {/* Admin Insights Panel */}
                  <div className="lg:col-span-1 bg-gray-900 rounded-3xl p-6 md:p-8 shadow-sm text-white flex flex-col justify-between h-full min-h-[380px] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-36 h-36 bg-pine-600/20 blur-[50px] rounded-full"></div>
                    <div>
                      <h3 className="text-lg font-bold flex items-center gap-2">AI INSIGHTS</h3>
                      <p className="text-xs text-gray-400 mt-1 font-mono">Prescriptive actions from Random Forest model.</p>
                    </div>

                    <div className="flex flex-col gap-4 mt-6">
                      {aiInsights && aiInsights.length > 0 ? (
                        aiInsights.map((insight, idx) => (
                          <div key={idx} className={`${insight.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-white/10 border-white/15'} border rounded-2xl p-4 backdrop-blur-md`}>
                            <div className={`text-[10px] font-bold ${insight.type === 'warning' ? 'text-amber-300' : 'text-pine-300'} uppercase tracking-widest mb-1 flex items-center gap-1`}>
                              {insight.type === 'warning' && <svg className="w-3.5 h-3.5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>}{insight.title}
                            </div>
                            <div className="text-xs text-gray-200 leading-relaxed font-medium">
                              {insight.message}
                            </div>
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="bg-white/10 border border-white/15 rounded-2xl p-4 backdrop-blur-md">
                            <div className="text-[10px] font-bold text-pine-300 uppercase tracking-widest mb-1 flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg> Volume Warning</div>
                            <div className="text-xs text-gray-200 leading-relaxed font-medium">
                              Loading insights...
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Student Account Verification dashboard */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900 text-lg">Student Accounts Manual Verification Queue</h3>
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      {pendingStudents.length} Account Verification Requests
                    </span>
                  </div>
                  <div className="p-4 sm:p-6">
                    <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
                      {pendingStudents.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 font-medium">No pending student accounts requiring manual validation.</div>
                      ) : (
                        <table className="w-full text-left border-collapse">
                          <thead className="sticky top-0 bg-white z-10">
                            <tr className="text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100">
                              <th className="pb-4 font-bold pl-4 font-mono">Student ID</th>
                              <th className="pb-4 font-bold">Full Name</th>
                              <th className="pb-4 font-bold">Email</th>
                              <th className="pb-4 font-bold">Proof of Registration</th>
                              <th className="pb-4 font-bold text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {pendingStudents.map(student => (
                              <tr key={student.id} className="hover:bg-gray-50/30">
                                <td className="py-4 pl-4 font-mono text-sm font-semibold text-gray-800">{student.student_id}</td>
                                <td className="py-4 text-sm font-bold text-gray-900">{student.full_name}</td>
                                <td className="py-4 text-sm text-gray-600">{student.email || '—'}</td>
                                <td className="py-4">
                                  {student.id_proof_path ? (
                                    <button 
                                      onClick={() => setViewImageUrl(student.id_proof_path)}
                                      className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1"
                                    >
                                      <svg className="w-3.5 h-3.5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>View ID / Diploma Attachment
                                    </button>
                                  ) : (
                                    <span className="text-xs text-gray-400 italic">No proof uploaded</span>
                                  )}
                                </td>
                                <td className="py-4">
                                  <div className="flex items-center justify-center gap-2">
                                    <button 
                                      onClick={() => handleAdminVerifyStudent(student.id, 'reject')}
                                      disabled={actionLoading}
                                      className="px-3 py-1.5 bg-white border border-red-200 text-red-500 rounded-xl text-xs font-bold hover:bg-red-50 flex items-center gap-1.5"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                                      Reject
                                    </button>
                                    <button 
                                      onClick={() => handleAdminVerifyStudent(student.id, 'verify')}
                                      disabled={actionLoading}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                      Verify Student
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}

                    </div>
                  </div>
                </div>
              </div>
            )}
            {currentTab === 'admin-tracker' && (
              <div className="space-y-8 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-display font-black text-gray-900 tracking-tight">
                      System-Wide Tracker
                    </h2>
                  </div>
                </div>

                {/* All Documents Tracker */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900 text-lg">System-Wide Document Tracker</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Filter:</span>
                      <select 
                        value={adminDocFilter}
                        onChange={(e) => setAdminDocFilter(e.target.value)}
                        className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:border-[#15803d]"
                      >
                        <option value="All">All Documents</option>
                        <option value="Transcript of Records">Transcript of Records</option>
                        <option value="Honorable Dismissal">Honorable Dismissal</option>
                        <option value="Clearance">Clearance</option>
                        <option value="Certificate of Good Moral">Certificate of Good Moral</option>
                        <option value="Diploma">Diploma</option>
                        <option value="Certification">Certification</option>
                      </select>
                    </div>
                  </div>
                  <div className="p-4 sm:p-6">
                    <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
                      {documents.filter(doc => adminDocFilter === 'All' || doc.document_type === adminDocFilter).length === 0 ? (
                        <div className="text-center py-12 text-gray-400 font-medium">No documents match the current filter.</div>
                      ) : (
                        <table className="w-full text-left border-collapse">
                          <thead className="sticky top-0 bg-white z-10">
                            <tr className="text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100">
                              <th className="pb-4 font-bold pl-4">Tracking ID</th>
                              <th className="pb-4 font-bold">Student</th>
                              <th className="pb-4 font-bold">Document Type</th>
                              <th className="pb-4 font-bold">Status</th>
                              <th className="pb-4 font-bold">Date Updated</th>
                              <th className="pb-4 font-bold text-right pr-4">Attachment</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {documents
                              .filter(doc => adminDocFilter === 'All' || doc.document_type === adminDocFilter)
                              .slice((adminDocPage - 1) * itemsPerPage, adminDocPage * itemsPerPage)
                              .map(doc => (
                                <tr key={doc.id} className="hover:bg-gray-50/30">
                                  <td className="py-4 pl-4 font-mono text-xs font-bold text-gray-900">
                                    #{doc.tracking_number ? doc.tracking_number.slice(0, 10).toUpperCase() : doc.id}
                                  </td>
                                  <td className="py-4 text-sm font-bold text-gray-700">{doc.student_name || doc.student_id || 'Unknown'}</td>
                                  <td className="py-4 text-xs font-bold text-gray-600">{doc.document_type}</td>
                                  <td className="py-4">
                                    <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-wider ${
                                      doc.current_status === 'completed' || doc.current_status === 'released'
                                        ? 'bg-emerald-50 text-emerald-600'
                                        : doc.current_status === 'rejected'
                                        ? 'bg-red-50 text-red-600'
                                        : 'bg-blue-50 text-blue-600'
                                    }`}>
                                      {doc.current_status.replace('_', ' ')}
                                    </span>
                                  </td>
                                  <td className="py-4 text-xs font-semibold text-gray-400">
                                    {new Date(doc.updated_at).toLocaleDateString()} {new Date(doc.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </td>
                                  <td className="py-4 text-right pr-4">
                                    {doc.file_path ? (
                                      <button 
                                        onClick={() => setViewImageUrl(doc.file_path)}
                                        className="p-2 text-[#15803d] hover:bg-emerald-50 rounded-xl transition-colors inline-flex items-center gap-1 text-xs font-bold"
                                        title="View Attached File"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                        View
                                      </button>
                                    ) : (
                                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">No File</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      )}

                    </div>
                  </div>
                  {/* Pagination Controls */}
                  {documents.filter(doc => adminDocFilter === 'All' || doc.document_type === adminDocFilter).length > itemsPerPage && (
                    <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
                      <span className="text-xs font-semibold text-gray-500">
                        Showing Page {adminDocPage} of {Math.ceil(documents.filter(doc => adminDocFilter === 'All' || doc.document_type === adminDocFilter).length / itemsPerPage)}
                      </span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setAdminDocPage(p => Math.max(1, p - 1))}
                          disabled={adminDocPage === 1}
                          className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 disabled:opacity-50 hover:bg-gray-50 transition-colors"
                        >
                          Previous
                        </button>
                        <button 
                          onClick={() => setAdminDocPage(p => Math.min(Math.ceil(documents.filter(doc => adminDocFilter === 'All' || doc.document_type === adminDocFilter).length / itemsPerPage), p + 1))}
                          disabled={adminDocPage === Math.ceil(documents.filter(doc => adminDocFilter === 'All' || doc.document_type === adminDocFilter).length / itemsPerPage)}
                          className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 disabled:opacity-50 hover:bg-gray-50 transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {currentTab === 'admin-users' && (
              <div className="space-y-8 animate-fade-in">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-display font-black text-gray-900 tracking-tight">Registered Users</h2>
                  </div>
                </div>
                <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900 text-lg">System Users</h3>
                    <input 
                      type="text" 
                      placeholder="Search name, ID, or email..." 
                      value={adminUsersFilter}
                      onChange={(e) => setAdminUsersFilter(e.target.value)}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#15803d]"
                    />
                  </div>
                  <div className="p-4 sm:p-6">
                    <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
                      <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead className="sticky top-0 bg-white z-10">
                          <tr className="text-xs uppercase tracking-widest text-gray-400 border-b border-gray-100">
                            <th className="pb-4 font-bold pl-4">ID</th>
                            <th className="pb-4 font-bold">Name</th>
                            <th className="pb-4 font-bold">Email</th>
                            <th className="pb-4 font-bold">Role</th>
                            <th className="pb-4 font-bold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {adminUsers.filter(u => u?.full_name?.toLowerCase().includes(adminUsersFilter.toLowerCase()) || u?.student_id?.toLowerCase().includes(adminUsersFilter.toLowerCase()) || u?.email?.toLowerCase().includes(adminUsersFilter.toLowerCase())).map(u => (
                            <tr key={u.id} className="hover:bg-gray-50/30">
                              <td className="py-4 pl-4 text-sm font-semibold text-gray-800">{u.student_id || '—'}</td>
                              <td className="py-4 text-sm font-bold text-gray-900">{u.full_name}</td>
                              <td className="py-4 text-sm text-gray-600">{u.email}</td>
                              <td className="py-4 text-sm text-gray-600 capitalize">{u.role}</td>
                              <td className="py-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${(!u.verification_status || u.verification_status === 'verified') ? 'bg-emerald-100 text-emerald-700' : u.verification_status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {u.verification_status || 'verified'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                    </div>
                  </div>
                </div>
              </div>
            )}
            {currentTab === 'admin-logs' && (
              <div className="space-y-8 animate-fade-in">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-display font-black text-gray-900 tracking-tight">Activity Logs</h2>
                  </div>
                </div>
                <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900 text-lg">System-Wide Audit Log</h3>
                  </div>
                  <div className="p-4 sm:p-6">
                    <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
                      <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead className="sticky top-0 bg-white z-10">
                          <tr className="text-xs uppercase tracking-widest text-gray-400 border-b border-gray-100">
                            <th className="pb-4 font-bold pl-4">Timestamp</th>
                            <th className="pb-4 font-bold">Document</th>
                            <th className="pb-4 font-bold">Action</th>
                            <th className="pb-4 font-bold">User</th>
                            <th className="pb-4 font-bold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {adminLogs.map(log => (
                            <tr key={log.id} className="hover:bg-gray-50/30">
                              <td className="py-4 pl-4 text-xs font-semibold text-gray-500">{new Date(log.timestamp_started).toLocaleString()}</td>
                              <td className="py-4 text-sm font-bold text-gray-900">{log.document_type || 'Unknown'} <span className="text-gray-400 font-mono text-xs">#{log.tracking_number || 'N/A'}</span></td>
                              <td className="py-4 text-sm text-gray-600 capitalize">{log.step_name ? log.step_name.replace(/_/g, ' ') : 'System Action'}</td>
                              <td className="py-4 text-sm text-gray-600">{log.user_name || 'System'}</td>
                              <td className="py-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${log.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {log.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                    </div>
                  </div>
                </div>
              </div>
            )}
    </>
  );
}
