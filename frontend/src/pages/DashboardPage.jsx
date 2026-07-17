import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../utils/hooks';
import useDashboard from '../hooks/useDashboard';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

// Simple helper to format files
function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Mini dynamic sparkline for stat cards
const MiniSparkline = ({ color = "#15803d", trend = 'up' }) => {
  // Generate slightly random but consistently trending mock data for visual flavor
  const data = trend === 'up' 
    ? [{v: 10}, {v: 15}, {v: 12}, {v: 22}, {v: 20}, {v: 30}, {v: 35}] 
    : [{v: 35}, {v: 30}, {v: 25}, {v: 28}, {v: 20}, {v: 15}, {v: 10}];
    
  return (
    <div className="w-20 h-10 shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={3} dot={false} isAnimationActive={true} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

const apiBaseUrl = import.meta.env.VITE_API_URL || '';

import LiveTrackingModal from '../components/modals/LiveTrackingModal';
import ImageViewerModal from '../components/modals/ImageViewerModal';
import FinanceVerificationModal from '../components/modals/FinanceVerificationModal';
import SecretaryEvaluationModal from '../components/modals/SecretaryEvaluationModal';
import NewRequestModal from '../components/modals/NewRequestModal';


export default function DashboardPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'dashboard';

  // Local pagination state for Window 1
  const [w1ReleasePage, setW1ReleasePage] = useState(1);
  const [w1ProgressPage, setW1ProgressPage] = useState(1);
  const [adminDocPage, setAdminDocPage] = useState(1);
  const itemsPerPage = 10;
  
  // Admin Document Filter
  const [adminDocFilter, setAdminDocFilter] = useState('All');
  const [forecastFilter, setForecastFilter] = useState('All');
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminUsersFilter, setAdminUsersFilter] = useState('');
  const [adminLogs, setAdminLogs] = useState([]);

  useEffect(() => {
    if (user?.role === 'admin' && currentTab === 'admin-users') {
      fetch(`${apiBaseUrl}/api/auth/users`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('trace_token')}` }
      }).then(res => res.json()).then(data => setAdminUsers(data.users || []));
    }
  }, [currentTab, user]);

  useEffect(() => {
    if (user?.role === 'admin' && currentTab === 'admin-logs') {
      fetch(`${apiBaseUrl}/api/documents/activity-logs`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('trace_token')}` }
      }).then(res => res.json()).then(data => setAdminLogs(data.logs || []));
    }
  }, [currentTab, user]);

  // All fetching logic, action handlers, and helpers are extracted
  // into the useDashboard hook per CODING_PREFERENCES.md
  const {
    // Data
    documents,
    dashStats,
    forecastData,
    aiInsights,
    pendingStudents,

    // Loading & Feedback
    loading,
    actionLoading,
    error,
    success,

    // Form State
    selectedDocType, setSelectedDocType,
    semesters, setSemesters,
    reqCopies, setReqCopies,
    requestFile, setRequestFile,
    paymentRef, setPaymentRef,
    paymentFile, setPaymentFile,
    clerkNotes, setClerkNotes,

    // Secretary Evaluation Fields
    evalStudentId, setEvalStudentId,
    evalStudentName, setEvalStudentName,
    evalDocType, setEvalDocType,
    scanDocType, setScanDocType,

    // Modal State
    activeModal, setActiveModal,
    selectedDoc, setSelectedDoc,
    viewImageUrl, setViewImageUrl,
    trackerProgress,

    // Window 1 State
    scanFile,
    scanProgress,
    fileInputRef,

    // Actions
    loadDashboardData,
    triggerNotification,
    handleStudentSubmitRequest,
    handleStudentSubmitPayment,
    handleStudentCancelRequest,
    handleFinanceVerify,
    handleSecretaryEvaluate,
    handleWindow1Release,
    simulateHardwareScan,
    handleWindow1ScanUpload,
    handleManualInputSubmit,
    handleFetchStudent,
    handleAdminVerifyStudent,

    // UI Helpers
    getProgressVal,
    getStatusLabel,
    requiresAttachment,
    getAttachmentLabel,
    getAttachmentHelper,
    getRelativeTime,
    getWaitTime,
  } = useDashboard(user);

  const todayFormatted = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // Role checks for cleaner JSX conditionals
  const isStudent = user?.role === 'student';
  const isFinance = user?.role === 'clerk' && user?.desk_assignment === 'Finance';
  const isWindow1 = user?.role === 'clerk' && user?.desk_assignment === 'Window 1';
  const isSecretary = user?.role === 'clerk' && user?.desk_assignment === 'Secretary';
  const isAdmin = user?.role === 'admin';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-pine-500/20 border-t-pine-600 rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium text-sm">Synchronizing Command Center...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in relative pb-16">
      {/* Dynamic Alerts */}
      {success && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 border border-gray-700 animate-slide-up">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg></div>
          <span className="font-semibold text-sm">{success}</span>
        </div>
      )}
      {error && (
        <div className="fixed bottom-6 right-6 z-50 bg-red-900 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 border border-red-700 animate-slide-up">
          <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg></div>
          <span className="font-semibold text-sm">{error}</span>
        </div>
      )}

      {/* =========================================================================
                                1. STUDENT PORTAL DASHBOARD
         ========================================================================= */}
      {isStudent && (
        <div className="space-y-8 animate-fade-in">
          {/* 1.1. STUDENT PORTAL - WORKSPACE DASHBOARD */}
          {currentTab === 'dashboard' && (
            <>
              {/* Welcome Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-3xl font-display font-black text-gray-900 tracking-tight">
                    Welcome back, <span className="text-[#15803d] font-bold">{user.full_name || 'Student'}</span>
                  </h2>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-5 py-2.5 shadow-sm">
                    <span className="text-xs font-semibold text-gray-500">Today:</span>
                    <span className="text-xs font-bold text-gray-800">{todayFormatted}</span>
                    <svg className="w-4 h-4 text-gray-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  </div>
                  <button 
                    onClick={() => setActiveModal('new-request')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 hover:border-gray-400 text-gray-800 text-xs font-bold rounded-full shadow-sm transition-all"
                  >
                    <span>New Request</span>
                    <svg className="w-4 h-4 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </button>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between h-44">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">TOTAL REQUESTS</span>
                      <span className="text-3xl font-display font-black text-gray-900 mt-2 block">{documents.length} <span className="text-sm text-gray-400 font-medium font-sans">Documents</span></span>
                    </div>
                    <MiniSparkline trend="up" />
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 text-[10px] font-bold text-[#15803d] w-fit flex items-center gap-1.5 mt-2">
                    <span className="w-1.5 h-1.5 bg-[#15803d] rounded-full"></span>
                    All requests submitted across your account
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between h-44">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">IN PROGRESS</span>
                      <span className="text-3xl font-display font-black text-gray-900 mt-2 block">
                        {documents.filter(d => ['pending_payment', 'pending_payment_verification', 'pending_secretary', 'ready_window_1'].includes(d.current_status)).length} <span className="text-sm text-gray-400 font-medium font-sans">in progress</span>
                      </span>
                    </div>
                    <MiniSparkline trend="down" />
                  </div>
                  <div className="bg-[#15803d] rounded-xl px-4 py-2 text-[10px] font-medium text-white w-full mt-2 leading-snug">
                    Your documents are currently being processed
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between h-44">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">READY / COMPLETED</span>
                      <span className="text-3xl font-display font-black text-gray-900 mt-2 block">
                        {documents.filter(d => ['completed', 'released'].includes(d.current_status)).length} <span className="text-sm text-gray-400 font-medium font-sans">Completed</span>
                      </span>
                    </div>
                    <MiniSparkline trend="up" />
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 text-[10px] font-bold text-[#15803d] w-fit flex items-center gap-1.5 mt-2">
                    <span className="w-1.5 h-1.5 bg-[#15803d] rounded-full"></span>
                    Available for pickup at Window 1
                  </div>
                </div>
              </div>

              {/* Active Requests Card Table */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden mt-8">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                  <h3 className="font-bold text-gray-900 text-lg">ACTIVE REQUESTS</h3>
                  <button onClick={loadDashboardData} className="text-xs text-[#15803d] font-bold hover:underline inline-flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg> Refresh</button>
                </div>
                <div className="p-6">
                  {documents.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 font-medium">No active request records. Submit one at the top!</div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100">
                          <th className="pb-4 font-bold pl-4">Date</th>
                          <th className="pb-4 font-bold">Document /Type</th>
                          <th className="pb-4 font-bold">Progress</th>
                          <th className="pb-4 font-bold">Status</th>
                          <th className="pb-4 font-bold text-right pr-4">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {documents.map(doc => (
                          <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-4 pl-4 text-xs font-semibold text-gray-400">{new Date(doc.created_at).toLocaleDateString()} {new Date(doc.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                            <td className="py-4">
                              <div className="text-sm font-bold text-gray-900">{doc.document_type}</div>
                              <div className="text-xs font-mono text-gray-400 mt-0.5">#{doc.tracking_number ? doc.tracking_number.slice(0, 10).toUpperCase() : doc.id}</div>
                            </td>
                            <td className="py-4 w-1/3">
                              <div className="flex items-center gap-3">
                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                  <div className="bg-[#15803d] h-2 rounded-full transition-all duration-500" style={{ width: `${getProgressVal(doc.current_status)}%` }}></div>
                                </div>
                                <span className="text-[11px] font-bold text-gray-600 font-mono">{getProgressVal(doc.current_status)}%</span>
                              </div>
                            </td>
                            <td className="py-4">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${doc.current_status === 'completed' || doc.current_status === 'released' ? 'bg-emerald-50 text-[#15803d]' : 'bg-amber-50 text-amber-700'}`}>
                                {getStatusLabel(doc.current_status)}
                              </span>
                            </td>
                            <td className="py-4 text-right pr-4 relative">
                              <div className="flex justify-end gap-2">
                                {doc.current_status === 'pending_payment' ? (
                                  <>
                                    <button 
                                      onClick={() => { setSelectedDoc(doc); setActiveModal('pay'); }}
                                      className="px-4 py-1.5 bg-[#15803d] text-white rounded-xl text-xs font-bold hover:bg-[#166534] transition-all shadow-sm flex items-center gap-1.5"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                      Pay GCash
                                    </button>
                                    <button 
                                      onClick={() => handleStudentCancelRequest(doc.id)}
                                      className="px-4 py-1.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-all border border-red-200 flex items-center gap-1.5"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <button 
                                    onClick={() => { setSelectedDoc(doc); setActiveModal('tracking'); }}
                                    className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all border border-blue-200 flex items-center gap-1.5"
                                    title="Track Document"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
                                    Live Track
                                  </button>
                                )}
                              </div>
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

          {/* 1.2. STUDENT PORTAL - REQUEST HISTORY */}
          {currentTab === 'request-history' && (
            <>
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-3xl font-display font-black text-gray-900 tracking-tight">
                    Request History
                  </h2>
                </div>
              </div>

              {/* History Table */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                  <h3 className="font-bold text-gray-900 text-lg">Your request history</h3>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-[#15803d] border border-emerald-100 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-all">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
                    Filters
                  </button>
                </div>
                <div className="p-6">
                  {documents.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 font-medium">No request history found.</div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100">
                          <th className="pb-4 font-bold pl-4">Docuement</th>
                          <th className="pb-4 font-bold">Date Requested</th>
                          <th className="pb-4 font-bold">Tracking ID</th>
                          <th className="pb-4 font-bold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {documents.map(doc => (
                          <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-4 pl-4 text-sm font-bold text-gray-900">{doc.document_type}</td>
                            <td className="py-4 text-xs font-semibold text-gray-400">{new Date(doc.created_at).toLocaleDateString()} {new Date(doc.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                            <td className="py-4 font-mono text-xs text-gray-800 font-bold">#{doc.tracking_number ? doc.tracking_number.slice(0, 10).toUpperCase() : doc.id}</td>
                            <td className="py-4">
                              <span className="px-3 py-1 bg-emerald-50 text-[#15803d] text-[10px] font-black rounded-full uppercase tracking-wider">
                                {doc.current_status === 'completed' || doc.current_status === 'released' ? 'Released' : 'Processing'}
                              </span>
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

          {/* 1.3. STUDENT PORTAL - PAYMENT HISTORY */}
          {currentTab === 'payment-history' && (
            <>
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-3xl font-display font-black text-gray-900 tracking-tight">
                    Payment History
                  </h2>
                </div>
              </div>

              {/* Payment Card Table */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                  <h3 className="font-bold text-gray-900 text-lg">Manage your digital transactions.</h3>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-[#15803d] border border-emerald-100 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-all">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
                    Filters
                  </button>
                </div>
                <div className="p-6">
                  {documents.filter(d => d.payment_status === 'PAID' || d.gcash_reference_no).length === 0 ? (
                    <div className="text-center py-12 text-gray-400 font-medium">No transaction payments detected.</div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100">
                          <th className="pb-4 font-bold pl-4">Date</th>
                          <th className="pb-4 font-bold">Reference Number</th>
                          <th className="pb-4 font-bold">Document</th>
                          <th className="pb-4 font-bold">Amount</th>
                          <th className="pb-4 font-bold">Status</th>
                          <th className="pb-4 font-bold text-right pr-4">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {documents.filter(d => d.payment_status === 'PAID' || d.gcash_reference_no).map(doc => (
                          <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-4 pl-4 text-xs font-semibold text-gray-400">{new Date(doc.updated_at).toLocaleDateString()} {new Date(doc.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                            <td className="py-4 font-mono text-xs text-gray-800 font-black">GC-{doc.gcash_reference_no ? doc.gcash_reference_no.slice(0, 8).toUpperCase() : '992139'}</td>
                            <td className="py-4 text-sm font-bold text-gray-700">{doc.document_type}</td>
                            <td className="py-4 text-xs font-bold text-gray-800 font-mono">P {parseFloat(doc.amount || 150).toFixed(2)}</td>
                            <td className="py-4">
                              {doc.payment_status === 'PAID' ? (
                                <span className="px-3 py-1 bg-emerald-50 text-[#15803d] text-[10px] font-black rounded-full uppercase tracking-wider">PAID</span>
                              ) : (
                                <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-black rounded-full uppercase tracking-wider">VERIFYING</span>
                              )}
                            </td>
                            <td className="py-4 text-right pr-4">
                              {doc.official_receipt_path ? (
                                <button 
                                  onClick={() => setViewImageUrl(doc.official_receipt_path)}
                                  className="p-2 text-[#15803d] hover:bg-emerald-50 rounded-xl transition-colors"
                                  title="View Official Finance Receipt"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                </button>
                              ) : (
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Pending</span>
                              )}
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

          {/* 1.4. NEW REQUEST MODAL */}
          {activeModal === 'new-request' && (
            <NewRequestModal 
              user={user}
              setActiveModal={setActiveModal}
              handleStudentSubmitRequest={handleStudentSubmitRequest}
              selectedDocType={selectedDocType}
              setSelectedDocType={setSelectedDocType}
              semesters={semesters}
              setSemesters={setSemesters}
              reqCopies={reqCopies}
              setReqCopies={setReqCopies}
              requestFile={requestFile}
              setRequestFile={setRequestFile}
              actionLoading={actionLoading}
              requiresAttachment={requiresAttachment}
              getAttachmentLabel={getAttachmentLabel}
              getAttachmentHelper={getAttachmentHelper}
            />
          )}

          {/* 1.5. COMPLETE YOUR GCASH PAYMENT MODAL */}
          {activeModal === 'pay' && selectedDoc && createPortal(
            <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
              <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setActiveModal(null)}></div>
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 sm:p-8 z-10 border border-gray-100 relative">
                
                <button 
                  onClick={() => handleStudentCancelRequest(selectedDoc.id, true)}
                  className="absolute top-4 left-4 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                  Back to Form
                </button>
                <button className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100" onClick={() => setActiveModal(null)}>✕</button>

                <div className="mt-8 mb-6 text-center">
                  <h3 className="text-xl font-black text-gray-900">Complete your Payment</h3>
                  <p className="text-xs text-gray-400 mt-1 font-semibold">Add Payment</p>
                </div>
                
                <div className="border-2 border-dashed border-[#15803d]/40 bg-gray-50/50 p-6 rounded-2xl flex flex-col items-center gap-4 mb-6">
                  <span className="text-xs font-bold text-gray-800">Scan this QR code using your GCash app to pay.</span>
                  
                  {/* GCash QR Code */}
                  <img src="/gcash-qr.jpg" alt="GCash QR Code" className="w-50 h-60 rounded-xl shadow-sm object-cover border border-gray-200" />
                </div>

                <form onSubmit={handleStudentSubmitPayment} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Document</label>
                      <input 
                        type="text" 
                        disabled 
                        value={selectedDoc.document_type} 
                        className="p-3 bg-gray-100 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Tracking ID</label>
                      <input 
                        type="text" 
                        disabled 
                        value={`TRC - ${selectedDoc.tracking_number ? selectedDoc.tracking_number.slice(0, 6).toUpperCase() : selectedDoc.id}`} 
                        className="p-3 bg-gray-100 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500"
                      />
                    </div>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs text-emerald-800">
                      <span className="font-medium">Amount per copy</span>
                      <span className="font-bold">₱{(selectedDoc.amount / selectedDoc.copies).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-emerald-800">
                      <span className="font-medium">Number of copies</span>
                      <span className="font-bold">x {selectedDoc.copies}</span>
                    </div>
                    <div className="pt-2 border-t border-emerald-200 flex justify-between items-center text-sm text-emerald-900 mt-1">
                      <span className="font-bold">Total Amount Due</span>
                      <span className="font-black text-lg">₱{selectedDoc.amount}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">GCash Reference Number</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. 5001 0293 8472" 
                        value={paymentRef}
                        onChange={(e) => setPaymentRef(e.target.value)}
                        className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Upload Receipt</label>
                      <div className="relative">
                        <input 
                          type="file" 
                          required 
                          accept="image/*"
                          onChange={(e) => setPaymentFile(e.target.files[0])}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 flex justify-between items-center pointer-events-none">
                          <span className="truncate">{paymentFile ? paymentFile.name : 'Upload your receipt...'}</span>
                          <svg className="w-4 h-4 text-[#15803d]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={actionLoading} 
                    className="w-full bg-[#15803d] hover:bg-[#166534] disabled:opacity-70 text-white font-bold py-3.5 rounded-xl transition-all shadow-md uppercase tracking-wider text-xs flex justify-center items-center"
                  >
                    {actionLoading ? 'Submitting...' : 'Submit Payment'}
                  </button>
                </form>
              </div>
            </div>,
            document.body
          )}

          {/* 1.6. PAYMENT SUCCESS SCREEN MODAL */}
          {activeModal === 'pay-success' && createPortal(
            <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
              <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setActiveModal(null)}></div>
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 sm:p-8 z-10 border border-gray-100 relative text-center">
                <h3 className="text-xl font-black text-gray-900 mb-6">Payment Submitted</h3>

                <div className="border-2 border-dashed border-[#15803d]/40 bg-gray-50/50 p-8 rounded-2xl flex flex-col items-center gap-6 mb-6">
                  <p className="text-xs font-semibold text-gray-600 leading-relaxed max-w-xs">
                    Your reference number and uploaded receipt have been securely routed to Finance Office for verification. Once cleared, your Transcript of Record will be proceed to processing.
                  </p>
                  
                  {/* Large Green Check Circle */}
                  <div className="w-16 h-16 rounded-full bg-[#15803d] text-white flex items-center justify-center shadow-md">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                  </div>
                </div>

                <button 
                  onClick={() => setActiveModal(null)}
                  className="w-full bg-[#15803d] hover:bg-[#166534] text-white font-bold py-3.5 rounded-xl transition-all shadow-md uppercase tracking-wider text-xs"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>,
            document.body
          )}

          {/* 1.7. LIVE TRACKING MODAL */}
          {activeModal === 'tracking' && selectedDoc && (
            <LiveTrackingModal 
              selectedDoc={selectedDoc}
              setActiveModal={setActiveModal}
              trackerProgress={trackerProgress}
              getStatusLabel={getStatusLabel}
            />
          )}
        </div>
      )}

      {/* =========================================================================
                                2. FINANCE CLERK DASHBOARD
         ========================================================================= */}
      {isFinance && (
        <div className="space-y-8 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-display font-black text-gray-900 tracking-tight">
                Finance Office Command Center
              </h2>
            </div>
            <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-5 py-2.5 shadow-sm">
              <span className="text-xs font-semibold text-gray-500">Today:</span>
              <span className="text-xs font-bold text-gray-800">{todayFormatted}</span>
              <svg className="w-4 h-4 text-gray-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            </div>
          </div>

          {/* Verification Queue Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h3 className="font-bold text-gray-950 text-sm tracking-wider uppercase">ACTIVE QUEUE</h3>
              <span className="text-xs text-gray-500 font-semibold">
                Pending Request: <strong className="text-gray-900">{dashStats.pending_payment_verification_count}</strong>
              </span>
            </div>
            <div className="p-6 overflow-x-auto">
              {dashStats.pending_payment_verification_count === 0 ? (
                <div className="text-center py-12 text-gray-400 font-medium">No pending receipts to verify. Queue is clean!</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100">
                      <th className="pb-4 font-bold pl-4">Tracking ID</th>
                      <th className="pb-4 font-bold">Name</th>
                      <th className="pb-4 font-bold">Document Type</th>
                      <th className="pb-4 font-bold">Amount</th>
                      <th className="pb-4 font-bold text-right pr-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {documents.filter(d => d.current_status === 'pending_payment_verification').map(doc => (
                      <tr key={doc.id} className="hover:bg-gray-50/30 group">
                        <td className="py-4 pl-4 font-mono text-xs font-semibold text-gray-500">#{doc.tracking_number ? doc.tracking_number.slice(0, 10).toUpperCase() : doc.id}</td>
                        <td className="py-4">
                          <div className="text-sm font-bold text-gray-900">{doc.student_name || 'Unknown Student'}</div>
                          <div className="text-xs font-mono text-gray-400 mt-0.5">{doc.student_id || 'ID Pending'}</div>
                        </td>
                        <td className="py-4 text-xs font-bold text-gray-600">{doc.document_type}</td>
                        <td className="py-4 text-xs font-bold text-gray-800 font-mono">P{parseFloat(doc.amount || 150).toFixed(2)}</td>
                        <td className="py-4 text-right pr-4">
                          <button 
                            onClick={() => { setSelectedDoc(doc); setActiveModal('verify-pay'); }}
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

          {/* Finance Receipt Verification Modal */}
          {/* 2.1 FINANCE VERIFICATION MODAL */}
          {activeModal === 'verify-pay' && selectedDoc && (
            <FinanceVerificationModal
              selectedDoc={selectedDoc}
              setActiveModal={setActiveModal}
              getStatusLabel={getStatusLabel}
              handleFinanceVerify={handleFinanceVerify}
              actionLoading={actionLoading}
              setViewImageUrl={setViewImageUrl}
              apiBaseUrl={apiBaseUrl}
              clerkNotes={clerkNotes}
              setClerkNotes={setClerkNotes}
            />
          )}
        </div>
      )}

      {/* =========================================================================
                                3. WINDOW 1 CLERK DASHBOARD
         ========================================================================= */}
      {isWindow1 && (
        <div className="space-y-8 animate-fade-in">
          {/* 3.1. WORKSPACE DASHBOARD VIEW */}
          {currentTab === 'dashboard' && (
            <>
              {/* Welcome Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-3xl font-display font-black text-gray-900 tracking-tight">
                    Welcome back, <span className="text-[#15803d]">Window 1 Clerk</span>
                  </h2>
                </div>
                <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-5 py-2.5 shadow-sm">
                  <span className="text-xs font-semibold text-gray-500">Today:</span>
                  <span className="text-xs font-bold text-gray-800">{todayFormatted}</span>
                  <svg className="w-4 h-4 text-gray-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                </div>
              </div>

              {/* Top KPIs Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between h-44">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">PROCESSED MANUAL DOCUMENT TODAY</span>
                      <span className="text-3xl font-display font-black text-gray-900 mt-2 block">{dashStats.processed_today} <span className="text-sm text-gray-400 font-medium font-sans">Documents</span></span>
                    </div>
                    <MiniSparkline trend="up" />
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 text-[10px] font-bold text-[#15803d] w-fit flex items-center gap-1.5 mt-2">
                    <span className="w-1.5 h-1.5 bg-[#15803d] rounded-full"></span>
                    Documents scanned and routed today
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between h-44">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">AWAITING SECRETARY</span>
                      <span className="text-3xl font-display font-black text-gray-900 mt-2 block">
                        {dashStats.pending_secretary_count} <span className="text-sm text-gray-400 font-medium font-sans">Pending</span>
                      </span>
                    </div>
                    <MiniSparkline trend="down" />
                  </div>
                  <div className="bg-[#15803d] rounded-xl px-4 py-2 text-[10px] font-medium text-white w-full mt-2 leading-snug">
                    Documents at the Secretary desk awaiting evaluation
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between h-44">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">COMPLETED TODAY</span>
                      <span className="text-3xl font-display font-black text-gray-900 mt-2 block">
                        {dashStats.completed_today_count} <span className="text-sm text-gray-400 font-medium font-sans">Completed</span>
                      </span>
                    </div>
                    <MiniSparkline trend="up" />
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 text-[10px] font-bold text-[#15803d] w-fit flex items-center gap-1.5 mt-2">
                    <span className="w-1.5 h-1.5 bg-[#15803d] rounded-full"></span>
                    Documents released to students today
                  </div>
                </div>
              </div>

              {/* Upload Document Dropzone */}
              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-200 flex flex-col justify-between mt-8">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">UPLOAD DOCUMENT</h3>
                  <p className="text-xs text-gray-400 mt-1">Upload physical papers to extract data via AI Engine.</p>
                </div>
                
                <div className="flex-1 mt-6 border-2 border-dashed border-[#15803d]/40 rounded-3xl p-8 bg-gray-50/50 flex flex-col items-center justify-center relative min-h-[250px]">
                  <span className="text-xs font-bold text-gray-900 mb-6 flex items-center gap-1">
                    <span className="text-[#15803d]">AI OCR Engine Ready</span>
                  </span>
                  
                  <div className="flex items-center justify-center w-full">
                    <button 
                      onClick={() => fileInputRef.current?.click()} 
                      className="flex flex-col items-center gap-3 group focus:outline-none"
                    >
                      <div className="w-20 h-20 bg-[#15803d] text-white rounded-3xl flex items-center justify-center shadow-lg hover:bg-[#166534] transition-all transform group-hover:scale-105 border-4 border-emerald-200">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                        </svg>
                      </div>
                      <div className="text-center">
                        <span className="text-sm font-black text-gray-900 block">UPLOAD FILE</span>
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Select image from your computer</span>
                      </div>
                    </button>
                  </div>

                  <span className="text-[10px] text-gray-400 mt-6 absolute bottom-4">System will automatically route uploaded document to AI Engine</span>
                  <input 
                    type="file" 
                    accept="image/*"
                    capture="environment"
                    id="mobile-camera-input"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        simulateHardwareScan(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        simulateHardwareScan(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                </div>
              </div>
              {/* Active release queue card */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden mt-8">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg uppercase tracking-wider">RELEASE DESK</h3>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 font-medium">
                      <span>Pending Student Pick-up: <strong className="text-gray-900">{dashStats.ready_window_1_count}</strong></span>
                      <span>Cleared by Secretary Today: <strong className="text-gray-900">{dashStats.cleared_by_secretary_today}</strong></span>
                    </div>
                  </div>
                  <button onClick={loadDashboardData} className="text-xs text-[#15803d] font-bold hover:underline inline-flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg> Refresh</button>
                </div>

                <div className="p-6">
                  {dashStats.ready_window_1_count === 0 ? (
                    <div className="text-center py-16 text-gray-400 font-medium">No documents waiting for release.</div>
                  ) : (
                    <>
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100">
                            <th className="pb-4 font-bold pl-4">Tracking Hash</th>
                            <th className="pb-4 font-bold">Student</th>
                            <th className="pb-4 font-bold">Document Type</th>
                            <th className="pb-4 font-bold">Wait Time</th>
                            <th className="pb-4 font-bold text-right pr-4">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {documents.filter(d => d.current_status === 'ready_window_1')
                            .slice((w1ReleasePage - 1) * itemsPerPage, w1ReleasePage * itemsPerPage)
                            .map(doc => (
                            <tr key={doc.id} className="hover:bg-gray-50/50 group">
                              <td className="py-4 pl-4 font-mono text-xs text-gray-500">#{doc.tracking_number ? doc.tracking_number.slice(0, 10).toUpperCase() : doc.id}</td>
                              <td className="py-4">
                                <div className="text-sm font-bold text-gray-900">{doc.student_name || 'Name Unresolved'}</div>
                                <div className="text-xs font-mono text-gray-400 mt-0.5">{doc.student_id || 'ID Pending'}</div>
                              </td>
                              <td className="py-4 text-xs font-bold text-gray-600">{doc.document_type}</td>
                              <td className="py-4 text-xs font-bold text-gray-505 font-mono">{getWaitTime(doc.updated_at)}</td>
                              <td className="py-4 text-right pr-4">
                                <button 
                                  onClick={() => handleWindow1Release(doc.id)}
                                  disabled={actionLoading}
                                  className="px-5 py-2.5 bg-[#15803d] hover:bg-[#166534] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 ml-auto"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                                  Release Doc
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      
                      {documents.filter(d => d.current_status === 'ready_window_1').length > itemsPerPage && (
                        <div className="flex justify-between items-center mt-6 border-t border-gray-100 pt-4">
                          <button 
                            disabled={w1ReleasePage === 1} 
                            onClick={() => setW1ReleasePage(p => p - 1)}
                            className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl disabled:opacity-50 transition-colors"
                          >
                            Previous
                          </button>
                          <span className="text-xs font-bold text-gray-500">
                            Page {w1ReleasePage} of {Math.ceil(documents.filter(d => d.current_status === 'ready_window_1').length / itemsPerPage)}
                          </span>
                          <button 
                            disabled={w1ReleasePage >= Math.ceil(documents.filter(d => d.current_status === 'ready_window_1').length / itemsPerPage)} 
                            onClick={() => setW1ReleasePage(p => p + 1)}
                            className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl disabled:opacity-50 transition-colors"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {/* 3.2. TRACKING DESK VIEW */}
          {currentTab === 'tracking-desk' && (
            <>
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-3xl font-display font-black text-gray-900 tracking-tight">
                    Tracking Desk
                  </h2>
                </div>
                <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-5 py-2.5 shadow-sm">
                  <span className="text-xs font-semibold text-gray-500">Today:</span>
                  <span className="text-xs font-bold text-gray-800">{todayFormatted}</span>
                  <svg className="w-4 h-4 text-gray-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                </div>
              </div>
              {/* System Documents Progress Queue */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden mt-8">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg uppercase tracking-wider">SYSTEM DOCUMENTS PROGRESS</h3>
                    <p className="text-xs text-gray-400 mt-1">Live tracking of all active requested documents in the system.</p>
                  </div>
                </div>
                <div className="p-6">
                  {documents.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 font-medium">No active document requests.</div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                          <thead>
                            <tr className="text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100">
                              <th className="pb-4 font-bold pl-4">Date Requested</th>
                              <th className="pb-4 font-bold">Document</th>
                              <th className="pb-4 font-bold">Progress</th>
                              <th className="pb-4 font-bold">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {documents.slice((w1ProgressPage - 1) * itemsPerPage, w1ProgressPage * itemsPerPage).map(doc => (
                              <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="py-4 pl-4 text-xs font-semibold text-gray-400">{new Date(doc.created_at).toLocaleDateString()}</td>
                                <td className="py-4">
                                  <div className="text-sm font-bold text-gray-900">{doc.document_type}</div>
                                  <div className="text-xs font-mono text-gray-400 mt-0.5">#{doc.tracking_number ? doc.tracking_number.slice(0, 10).toUpperCase() : doc.id}</div>
                                </td>
                                <td className="py-4 w-1/3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                      <div className="bg-[#15803d] h-2 rounded-full transition-all duration-500" style={{ width: `${getProgressVal(doc.current_status)}%` }}></div>
                                    </div>
                                    <span className="text-[11px] font-bold text-gray-600 font-mono">{getProgressVal(doc.current_status)}%</span>
                                  </div>
                                </td>
                                <td className="py-4">
                                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${['completed', 'released'].includes(doc.current_status) ? 'bg-emerald-50 text-[#15803d]' : 'bg-amber-50 text-amber-700'}`}>
                                    {getStatusLabel(doc.current_status)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      {documents.length > itemsPerPage && (
                        <div className="flex justify-between items-center mt-6 border-t border-gray-100 pt-4">
                          <button 
                            disabled={w1ProgressPage === 1} 
                            onClick={() => setW1ProgressPage(p => p - 1)}
                            className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl disabled:opacity-50 transition-colors"
                          >
                            Previous
                          </button>
                          <span className="text-xs font-bold text-gray-500">
                            Page {w1ProgressPage} of {Math.ceil(documents.length / itemsPerPage)}
                          </span>
                          <button 
                            disabled={w1ProgressPage >= Math.ceil(documents.length / itemsPerPage)} 
                            onClick={() => setW1ProgressPage(p => p + 1)}
                            className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl disabled:opacity-50 transition-colors"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          )}



          {/* 3.3. MANUAL INPUT VIEW */}
          {currentTab === 'manual-input' && (
            <>
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-3xl font-display font-black text-gray-900 tracking-tight">
                    Manual Input
                  </h2>
                </div>
                <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-5 py-2.5 shadow-sm">
                  <span className="text-xs font-semibold text-gray-500">Today:</span>
                  <span className="text-xs font-bold text-gray-800">{todayFormatted}</span>
                  <svg className="w-4 h-4 text-gray-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                </div>
              </div>

              {/* Form Card */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
                <p className="text-sm font-semibold text-gray-500 mb-8 leading-relaxed">Digitize physical walk-in requests and legacy records.</p>
                
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
              </div>
            </>
          )}

          {/* 3.4. CAMERA SCANNING MODAL */}
          {activeModal === 'scanning' && (
            <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
              <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setActiveModal(null)}></div>
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-8 z-10 border border-gray-200 relative flex flex-col h-[70vh] max-h-[calc(100dvh-2rem)] overflow-y-auto justify-between">
                <button className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100" onClick={() => setActiveModal(null)}>✕</button>
                
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">Scan Document</h3>
                </div>

                {/* Mock Camera Preview Box */}
                <div className="flex-1 bg-gray-100 border border-gray-200 rounded-2xl overflow-hidden my-4 relative flex flex-col items-center justify-center shadow-inner">
                  <span className="absolute top-4 px-4 py-1.5 bg-[#15803d]/90 text-white text-[10px] font-bold tracking-widest uppercase rounded-full shadow-sm animate-pulse">
                    Document Detected
                  </span>
                  
                  <div className="w-48 h-64 border-2 border-dashed border-[#15803d] rounded-xl flex items-center justify-center bg-white/20 select-none shadow-sm">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                  </div>

                  <span className="absolute bottom-4 text-[10px] font-bold text-gray-400 tracking-wide uppercase">
                    Align document within frame
                  </span>
                </div>

                <div className="flex items-center justify-center gap-8 pt-2">
                  <button className="w-12 h-12 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 text-gray-500 shadow-sm">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                  </button>
                  <button 
                    onClick={() => {
                      setScanFile({ name: 'scan_doc_00129.jpg', size: 245800 });
                      setScanDocType('Transcript of Records');
                      setActiveModal('scan-confirm');
                    }}
                    className="w-16 h-16 rounded-full bg-white border-8 border-gray-200 flex items-center justify-center hover:border-gray-300 transition-all shadow-md focus:outline-none"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#15803d] hover:bg-[#166534] transition-all"></div>
                  </button>
                  <div className="w-12 h-12"></div> {/* spacer */}
                </div>
              </div>
            </div>
          )}

          {/* 3.5. INTAKE SCAN CONFIRMATION MODAL */}
          {activeModal === 'scan-confirm' && scanFile && (
            <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
              <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setActiveModal(null)}></div>
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-8 z-10 border border-gray-100 relative flex flex-col h-[75vh] max-h-[calc(100dvh-2rem)] overflow-y-auto justify-between">
                <button className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100" onClick={() => setActiveModal(null)}>✕</button>
                
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">Confirm Information</h3>
                </div>

                <div className="flex flex-col gap-2 my-4">
                  <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Document Type</label>
                  <select 
                    value={scanDocType}
                    onChange={(e) => setScanDocType(e.target.value)}
                    className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none cursor-pointer"
                  >
                    <option>Transcript of Records</option>
                    <option>Clearance</option>
                    <option>Certification</option>
                    <option>Diploma</option>
                  </select>
                </div>

                {/* Scanned Image Preview Container */}
                <div className="flex-1 bg-gray-100 border border-gray-200 rounded-2xl overflow-hidden mb-6 flex items-center justify-center shadow-inner relative">
                  <div className="text-center p-6 bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/50">
                    <svg className="w-8 h-8 text-gray-400 block mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
                    <span className="text-xs font-bold text-gray-800 block truncate max-w-xs">{scanFile.name}</span>
                    <span className="text-[10px] text-gray-400 font-mono mt-0.5 block">{formatFileSize(scanFile.size)}</span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button 
                    onClick={() => {
                      setActiveModal(null);
                      handleWindow1ScanUpload(scanDocType);
                    }}
                    disabled={actionLoading}
                    className="px-8 py-3.5 bg-[#15803d] hover:bg-[#166534] disabled:opacity-75 text-white font-bold rounded-xl text-xs shadow-md transition-all uppercase tracking-wider w-full text-center"
                  >
                    {actionLoading ? 'Uploading...' : 'Create Request'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
                                4. COLLEGE SECRETARY DASHBOARD
         ========================================================================= */}
      {isSecretary && (
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
              apiBaseUrl={apiBaseUrl}
              setViewImageUrl={setViewImageUrl}
            />
          )}
        </div>
      )}

      {/* =========================================================================
                                5. REGISTRAR ADMIN DASHBOARD
         ========================================================================= */}
      {isAdmin && currentTab === 'dashboard' && (
        <div className="space-y-8 animate-fade-in">
          {/* Welcome Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-display font-black text-gray-900 tracking-tight">
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
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between h-44">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">System Throughput</span>
                  <span className="text-3xl font-display font-black text-gray-900 mt-2 block">{dashStats.avg_processing_minutes > 0 ? dashStats.avg_processing_minutes.toFixed(1) : '—'} <span className="text-sm text-gray-400 font-medium font-sans">min</span></span>
                </div>
                <MiniSparkline trend="up" />
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 text-[10px] font-bold text-[#15803d] w-fit flex items-center gap-1.5 mt-2">
                <span className="w-1.5 h-1.5 bg-[#15803d] rounded-full"></span>
                Average document processing time across all completed requests
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between h-44">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">AI Confidence Avg</span>
                  <span className="text-3xl font-display font-black text-gray-900 mt-2 block">{dashStats.avg_ocr_confidence > 0 ? dashStats.avg_ocr_confidence.toFixed(1) + '%' : '—'}</span>
                </div>
                <MiniSparkline trend="down" />
              </div>
              <div className="bg-[#15803d] rounded-xl px-4 py-2 text-[10px] font-medium text-white w-full mt-2 leading-snug">
                Average extraction accuracy across all scans
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between h-44">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Real-time Backlog</span>
                  <span className="text-3xl font-display font-black text-gray-900 mt-2 block">
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
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-lg">Student Accounts Manual Verification Queue</h3>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                {pendingStudents.length} Account Verification Requests
              </span>
            </div>
            <div className="p-6 overflow-x-auto">
              {pendingStudents.length === 0 ? (
                <div className="text-center py-12 text-gray-400 font-medium">No pending student accounts requiring manual validation.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
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
                              onClick={() => setViewImageUrl(`${apiBaseUrl}/uploads/${student.id_proof_path.split(/[\\/]/).pop()}`)}
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
      )}

      {isAdmin && currentTab === 'admin-tracker' && (
        <div className="space-y-8 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-display font-black text-gray-900 tracking-tight">
                System-Wide Tracker
              </h2>
            </div>
          </div>

          {/* All Documents Tracker */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
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
            <div className="p-6 overflow-x-auto">
              {documents.filter(doc => adminDocFilter === 'All' || doc.document_type === adminDocFilter).length === 0 ? (
                <div className="text-center py-12 text-gray-400 font-medium">No documents match the current filter.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
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
                                onClick={() => {
                                  if (doc.file_path.toLowerCase().endsWith('.pdf')) {
                                    window.open(`${apiBaseUrl}/uploads/${doc.file_path.split(/[\\/]/).pop()}`, '_blank');
                                  } else {
                                    setViewImageUrl(`/uploads/${doc.file_path.split(/[\\/]/).pop()}`);
                                  }
                                }}
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

      {isAdmin && currentTab === 'admin-users' && (
        <div className="space-y-8 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-display font-black text-gray-900 tracking-tight">Registered Users</h2>
            </div>
          </div>
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-lg">System Users</h3>
              <input 
                type="text" 
                placeholder="Search name, ID, or email..." 
                value={adminUsersFilter}
                onChange={(e) => setAdminUsersFilter(e.target.value)}
                className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#15803d]"
              />
            </div>
            <div className="p-6 overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
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
      )}

      {isAdmin && currentTab === 'admin-logs' && (
        <div className="space-y-8 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-display font-black text-gray-900 tracking-tight">Activity Logs</h2>
            </div>
          </div>
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-lg">System-Wide Audit Log</h3>
            </div>
            <div className="p-6 overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
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
      )}

      {/* HARDWARE SCANNER SIMULATION MODAL */}
          {activeModal === 'hardware-scanner' && scanFile && createPortal(
            <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
              <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-sm"></div>
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto p-8 z-10 border border-gray-100 flex flex-col items-center">
                <div className="animate-pulse mb-6 flex flex-col items-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-8v4h8v-4zM6 16H4m16-4V7a2 2 0 00-2-2H6a2 2 0 00-2 2v5h16z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-black text-gray-900 text-center">
                    {scanProgress < 20 ? 'Initializing Scanner...' : scanProgress < 100 ? 'Scanning Document...' : 'Processing...'}
                  </h3>
                  <p className="text-sm text-blue-600 mt-2 font-bold">EPSON-L3110 USB Interface</p>
                </div>

                <div className="w-full relative h-48 bg-gray-100 rounded-xl overflow-hidden border-2 border-dashed border-blue-300">
                  {scanFile && <img src={URL.createObjectURL(scanFile)} alt="Preview" className="w-full h-full object-contain opacity-50 grayscale" />}
                  
                  {/* Laser effect */}
                  <div 
                    className="absolute left-0 w-full h-1 bg-blue-500 shadow-[0_0_20px_10px_rgba(59,130,246,0.6)]" 
                    style={{ 
                      top: `${scanProgress}%`, 
                      transition: 'top 0.1s linear',
                      display: scanProgress >= 100 ? 'none' : 'block'
                    }}
                  ></div>
                </div>

                <div className="w-full mt-8 bg-gray-100 rounded-full h-3">
                  <div 
                    className="bg-blue-600 h-3 rounded-full" 
                    style={{ width: `${scanProgress}%`, transition: 'width 0.1s linear' }}
                  ></div>
                </div>
                
                <p className="text-[10px] text-gray-400 mt-4 uppercase tracking-widest font-bold">
                  Extracting text via EasyOCR PyTorch Engine...
                </p>
              </div>
            </div>,
            document.body
          )}
      
      {/* GLOBAL IMAGE VIEWER MODAL */}
      <ImageViewerModal
        viewImageUrl={viewImageUrl}
        setViewImageUrl={setViewImageUrl}
        apiBaseUrl={apiBaseUrl}
      />

    </div>
  );
}
