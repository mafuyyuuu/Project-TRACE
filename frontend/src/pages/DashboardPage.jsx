import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../utils/hooks';
import { 
  getDocuments, 
  submitPayment, 
  verifyPayment, 
  evaluateDocument, 
  releaseDocument, 
  getPendingStudents, 
  verifyStudent,
  uploadDocument
} from '../services/api';

// Simple helper to format files
function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'dashboard';
  
  const [documents, setDocuments] = useState([]);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'pay', 'verify-pay', 'evaluate', 'verify-student', 'scan-confirm'
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  // Forms State
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentFile, setPaymentFile] = useState(null);
  const [clerkNotes, setClerkNotes] = useState('');
  
  // Secretary Evaluation Fields
  const [evalStudentId, setEvalStudentId] = useState('');
  const [evalStudentName, setEvalStudentName] = useState('');
  const [evalDocType, setEvalDocType] = useState('Transcript of Records');
  const [scanDocType, setScanDocType] = useState('Transcript of Records');
  
  // Window 1 Intake State
  const [scanFile, setScanFile] = useState(null);
  const fileInputRef = useRef(null);

  // Load dashboard data based on user role
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (user.role === 'admin') {
        // Admins see all documents + pending students
        const docsData = await getDocuments(1, 100);
        setDocuments(docsData.documents || []);
        
        const studentsData = await getPendingStudents();
        setPendingStudents(studentsData.pending_students || []);
      } else {
        // Students and Clerks fetch standard scoped documents
        const docsData = await getDocuments(1, 100);
        setDocuments(docsData.documents || []);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const triggerNotification = (msg, type = 'success') => {
    if (type === 'success') {
      setSuccess(msg);
      setTimeout(() => setSuccess(''), 4000);
    } else {
      setError(msg);
      setTimeout(() => setError(''), 4000);
    }
  };

  // ----------------------------------------------------
  // STUDENT ACTIONS
  // ----------------------------------------------------
  const handleStudentSubmitRequest = async (e) => {
    e.preventDefault();
    const docType = e.target.docType.value;
    const file = e.target.docFile.files[0];
    
    if (!file || !docType) {
      triggerNotification('Please select a document type and upload a file.', 'error');
      return;
    }
    
    try {
      setActionLoading(true);
      const formData = new FormData();
      formData.append('document', file);
      formData.append('document_type', docType);
      formData.append('student_id', user.student_id || 'STU-' + Date.now().toString().slice(-6));
      formData.append('student_name', user.full_name);

      const result = await uploadDocument(formData);
      triggerNotification(`Request submitted! Tracking ID: ${result.tracking_number}. Please pay now.`);
      e.target.reset();
      loadDashboardData();
    } catch (err) {
      triggerNotification(err.response?.data?.error || 'Upload failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStudentSubmitPayment = async (e) => {
    e.preventDefault();
    if (!paymentRef || !paymentFile || !selectedDoc) {
      triggerNotification('Reference number and receipt image are required.', 'error');
      return;
    }

    try {
      setActionLoading(true);
      const formData = new FormData();
      formData.append('receipt', paymentFile);
      formData.append('gcash_reference_no', paymentRef);

      await submitPayment(selectedDoc.id, formData);
      triggerNotification('GCash receipt submitted. Pending Finance verification!');
      setActiveModal(null);
      setPaymentRef('');
      setPaymentFile(null);
      loadDashboardData();
    } catch (err) {
      triggerNotification(err.response?.data?.error || 'Payment submission failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ----------------------------------------------------
  // FINANCE CLERK ACTIONS
  // ----------------------------------------------------
  const handleFinanceVerify = async (action) => {
    if (!selectedDoc) return;
    try {
      setActionLoading(true);
      await verifyPayment(selectedDoc.id, action, clerkNotes);
      triggerNotification(`Payment reference successfully ${action === 'approve' ? 'approved' : 'rejected'}.`);
      setActiveModal(null);
      setClerkNotes('');
      loadDashboardData();
    } catch (err) {
      triggerNotification(err.response?.data?.error || 'Verification action failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ----------------------------------------------------
  // COLLEGE SECRETARY ACTIONS
  // ----------------------------------------------------
  const handleSecretaryEvaluate = async (action) => {
    if (!selectedDoc) return;
    try {
      setActionLoading(true);
      const payload = {
        student_id: evalStudentId,
        student_name: evalStudentName,
        document_type: evalDocType,
        action,
        notes: clerkNotes
      };
      await evaluateDocument(selectedDoc.id, payload);
      triggerNotification(`Document successfully evaluated and ${action === 'approve' ? 'routed to Window 1' : 'returned'}.`);
      setActiveModal(null);
      setClerkNotes('');
      loadDashboardData();
    } catch (err) {
      triggerNotification(err.response?.data?.error || 'Evaluation action failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ----------------------------------------------------
  // WINDOW 1 CLERK ACTIONS
  // ----------------------------------------------------
  const handleWindow1Release = async (docId) => {
    try {
      setActionLoading(true);
      await releaseDocument(docId);
      triggerNotification('Document securely marked as completed and released.');
      loadDashboardData();
    } catch (err) {
      triggerNotification(err.response?.data?.error || 'Release failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWindow1ScanUpload = async (docType) => {
    if (!scanFile) return;
    try {
      setActionLoading(true);
      const formData = new FormData();
      formData.append('document', scanFile);
      formData.append('student_id', '');
      formData.append('student_name', '');
      formData.append('document_type', docType || '');

      const result = await uploadDocument(formData);
      triggerNotification(`Intake scan complete! Routed to Secretary queue. Tracking: ${result.tracking_number}`);
      setScanFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadDashboardData();
    } catch (err) {
      triggerNotification(err.response?.data?.error || 'Scan upload failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualInputSubmit = async (e) => {
    e.preventDefault();
    const studentId = e.target.studentId.value;
    const studentName = e.target.fullName.value;
    const docType = e.target.docType.value;
    
    try {
      setActionLoading(true);
      const mockFile = new Blob(['manual legacy record content'], { type: 'text/plain' });
      const formData = new FormData();
      formData.append('document', mockFile, `${studentId}_manual_intake.txt`);
      formData.append('student_id', studentId);
      formData.append('student_name', studentName);
      formData.append('document_type', docType);

      const result = await uploadDocument(formData);
      triggerNotification(`Legacy record digitized! Routed to Secretary queue. Tracking: ${result.tracking_number}`);
      e.target.reset();
      loadDashboardData();
    } catch (err) {
      triggerNotification(err.response?.data?.error || 'Manual intake failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFetchStudent = (e) => {
    e.preventDefault();
    const studentIdInput = document.getElementById('manual-student-id')?.value;
    if (studentIdInput) {
      const nameInput = document.getElementById('manual-full-name');
      const courseSelect = document.getElementById('manual-course');
      if (nameInput) nameInput.value = 'Jimenez, Jhervin';
      if (courseSelect) courseSelect.value = 'BSCS';
      triggerNotification('Student details fetched successfully.');
    } else {
      triggerNotification('Please enter a Student ID first.', 'error');
    }
  };

  // ----------------------------------------------------
  // ADMIN ACTIONS
  // ----------------------------------------------------
  const handleAdminVerifyStudent = async (userId, action) => {
    try {
      setActionLoading(true);
      await verifyStudent(userId, action);
      triggerNotification(`Student account registration successfully ${action === 'verify' ? 'verified' : 'rejected'}.`);
      loadDashboardData();
    } catch (err) {
      triggerNotification(err.response?.data?.error || 'Verification failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ----------------------------------------------------
  // HELPERS FOR UI RENDER
  // ----------------------------------------------------
  const getProgressVal = (status) => {
    switch (status) {
      case 'pending_payment': return 20;
      case 'pending_payment_verification': return 40;
      case 'pending_secretary': return 65;
      case 'ready_window_1': return 90;
      case 'completed':
      case 'released': return 100;
      default: return 10;
    }
  };

  const getProgressColor = (status) => {
    const val = getProgressVal(status);
    if (status === 'rejected') return 'bg-red-500';
    if (val < 50) return 'bg-amber-500';
    if (val < 100) return 'bg-indigo-500';
    return 'bg-emerald-500';
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending_payment': return 'Pending Payment';
      case 'pending_payment_verification': return 'Payment Verifying';
      case 'pending_secretary': return 'Under Secretary Evaluation';
      case 'ready_window_1': return 'Ready for Pick-up (Window 1)';
      case 'completed': return 'Released / Completed';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-pine-500/20 border-t-pine-600 rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium text-sm">Synchronizing Command Center...</p>
      </div>
    );
  }

  // Determine sub-dashboard based on role & desk_assignment
  const desk = user.desk_assignment;
  const isStudent = user.role === 'student';
  const isFinance = user.role === 'clerk' && desk === 'Finance';
  const isWindow1 = user.role === 'clerk' && (desk === 'Window 1' || desk === 'Receiving Desk');
  const isSecretary = user.role === 'clerk' && desk === 'Secretary';
  const isAdmin = user.role === 'admin';

  return (
    <div className="space-y-8 animate-fade-in relative pb-16">
      {/* Dynamic Alerts */}
      {success && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 border border-gray-700 animate-slide-up">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">✔</div>
          <span className="font-semibold text-sm">{success}</span>
        </div>
      )}
      {error && (
        <div className="fixed bottom-6 right-6 z-50 bg-red-900 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 border border-red-700 animate-slide-up">
          <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">⚠</div>
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
                    <span className="text-xs font-bold text-gray-800">June 19, 2026</span>
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
                    <svg className="w-20 h-10 text-[#15803d] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 100 40">
                      <path d="M 5 30 C 20 20, 40 35, 60 10 C 80 5, 90 25, 95 15" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 text-[10px] font-bold text-[#15803d] w-fit flex items-center gap-1.5 mt-2">
                    <span className="w-1.5 h-1.5 bg-[#15803d] rounded-full"></span>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
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
                    <svg className="w-20 h-10 text-[#15803d] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 100 40">
                      <path d="M 5 25 C 25 35, 45 10, 65 20 C 80 25, 90 5, 95 15" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="bg-[#15803d] rounded-xl px-4 py-2 text-[10px] font-medium text-white w-full mt-2 leading-snug">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
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
                    <svg className="w-20 h-10 text-[#15803d] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 100 40">
                      <path d="M 5 20 C 25 10, 45 35, 65 15 C 80 5, 90 20, 95 30" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 text-[10px] font-bold text-[#15803d] w-fit flex items-center gap-1.5 mt-2">
                    <span className="w-1.5 h-1.5 bg-[#15803d] rounded-full"></span>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                  </div>
                </div>
              </div>

              {/* Active Requests Card Table */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden mt-8">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                  <h3 className="font-bold text-gray-900 text-lg">ACTIVE REQUESTS</h3>
                  <button onClick={loadDashboardData} className="text-xs text-[#15803d] font-bold hover:underline">🔄 Refresh</button>
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
                                  <button 
                                    onClick={() => { setSelectedDoc(doc); setActiveModal('pay'); }}
                                    className="px-4 py-1.5 bg-[#15803d] text-white rounded-xl text-xs font-bold hover:bg-[#166534] transition-all shadow-sm"
                                  >
                                    Pay GCash
                                  </button>
                                ) : (
                                  <button 
                                    onClick={() => { setSelectedDoc(doc); setActiveModal('tracking'); }}
                                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                                    title="Track Details"
                                  >
                                    ●●●
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
                            <td className="py-4 text-xs font-bold text-gray-800 font-mono">P 150.00</td>
                            <td className="py-4">
                              <span className="px-3 py-1 bg-emerald-50 text-[#15803d] text-[10px] font-black rounded-full uppercase tracking-wider">PAID</span>
                            </td>
                            <td className="py-4 text-right pr-4">
                              <button 
                                onClick={() => { setSelectedDoc(doc); setActiveModal('tracking'); }}
                                className="p-2 text-[#15803d] hover:bg-emerald-50 rounded-xl transition-colors"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
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

          {/* 1.4. NEW REQUEST MODAL */}
          {activeModal === 'new-request' && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setActiveModal(null)}></div>
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-8 z-10 border border-gray-100 relative">
                <button className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100" onClick={() => setActiveModal(null)}>✕</button>
                
                <h3 className="text-xl font-black text-gray-900">New Request</h3>
                <p className="text-xs text-gray-400 mt-1 font-semibold mb-6">Add New Request</p>

                <form onSubmit={handleStudentSubmitRequest} className="space-y-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Document Type</label>
                    <select name="docType" required className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-xs font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none cursor-pointer text-gray-800">
                      <option value="" disabled selected>Select Document Type...</option>
                      <option value="Transcript of Records">Transcript of Records (TOR)</option>
                      <option value="Graduation Clearance">Graduation Clearance</option>
                      <option value="Certificate of Good Moral">Certificate of Good Moral</option>
                      <option value="Honorable Dismissal">Honorable Dismissal</option>
                      <option value="Diploma">Diploma</option>
                    </select>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <div className="border-2 border-dashed border-[#15803d]/40 rounded-2xl p-8 bg-gray-50/50 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-emerald-50/10 transition-colors relative">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                      <span className="text-sm font-bold text-gray-800"><span className="text-[#15803d]">Click here</span> to upload or drop files here</span>
                      <span className="text-[10px] text-gray-400">PDF, JPG up to 5MB</span>
                      <input type="file" name="docFile" required className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-xs leading-relaxed text-[#15803d] font-bold flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#15803d] rounded-full shrink-0"></span>
                    Requests take 3-5 days. Tracking updates will be reflected instantly in the table.
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
                      disabled={actionLoading} 
                      className="px-8 py-3 bg-[#15803d] hover:bg-[#166534] disabled:opacity-70 text-white rounded-xl text-xs font-bold shadow-md transition-all uppercase tracking-wider"
                    >
                      {actionLoading ? 'Uploading...' : 'Next'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 1.5. COMPLETE YOUR GCASH PAYMENT MODAL */}
          {activeModal === 'pay' && selectedDoc && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setActiveModal(null)}></div>
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-8 z-10 border border-gray-100 relative">
                <button className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100" onClick={() => setActiveModal(null)}>✕</button>
                
                <h3 className="text-xl font-black text-gray-900">Complete your Payment</h3>
                <p className="text-xs text-gray-400 mt-1 font-semibold mb-6">Add Payment</p>
                
                <div className="border-2 border-dashed border-[#15803d]/40 bg-gray-50/50 p-6 rounded-2xl flex flex-col items-center gap-4 mb-6">
                  <span className="text-xs font-bold text-gray-800">Scan this QR code using your GCash app to pay.</span>
                  
                  {/* Mock GCash QR SVG */}
                  <svg className="w-32 h-32 text-slate-700 bg-white p-2 rounded-xl shadow-sm" viewBox="0 0 100 100" fill="none" stroke="currentColor">
                    <rect x="10" y="10" width="30" height="30" strokeWidth="6" />
                    <rect x="60" y="10" width="30" height="30" strokeWidth="6" />
                    <rect x="10" y="60" width="30" height="30" strokeWidth="6" />
                    <path d="M 20 20 L 30 20 L 30 30 L 20 30 Z M 70 20 L 80 20 L 80 30 L 70 30 Z M 20 70 L 30 70 L 30 80 L 20 80 Z" fill="currentColor" />
                    <path d="M 45 15 H 55 M 45 25 H 55 M 15 45 V 55 M 25 45 V 55 M 45 45 H 85 V 85 H 45 Z" strokeWidth="3" />
                  </svg>
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
            </div>
          )}

          {/* 1.6. PAYMENT SUCCESS SCREEN MODAL */}
          {activeModal === 'pay-success' && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setActiveModal(null)}></div>
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-8 z-10 border border-gray-100 relative text-center">
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
            </div>
          )}

          {/* 1.7. LIVE TRACKING TIMELINE MODAL */}
          {activeModal === 'tracking' && selectedDoc && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setActiveModal(null)}></div>
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-8 z-10 border border-gray-100 relative flex flex-col h-[75vh] justify-between">
                <button className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100" onClick={() => setActiveModal(null)}>✕</button>

                <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                  <h3 className="text-lg font-black text-gray-900 truncate pr-4">{selectedDoc.document_type || 'Transcript of Records (TOR)'}</h3>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${selectedDoc.current_status === 'completed' || selectedDoc.current_status === 'released' ? 'bg-emerald-50 text-[#15803d]' : 'bg-amber-50 text-amber-700'}`}>
                    {getStatusLabel(selectedDoc.current_status)}
                  </span>
                </div>

                {/* Gray detail panel */}
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 my-4 font-mono text-[11px] text-gray-600 space-y-2">
                  <div className="flex justify-between"><span>Tracking ID</span><span className="font-bold text-gray-950">#{selectedDoc.tracking_number || selectedDoc.id}</span></div>
                  <div className="flex justify-between"><span>Date Requested</span><span className="font-bold text-gray-950">{new Date(selectedDoc.created_at).toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'})}</span></div>
                  <div className="flex justify-between"><span>Copies</span><span className="font-bold text-gray-950">1</span></div>
                  <div className="flex justify-between border-t border-gray-200/50 pt-2"><span>Amount</span><span className="font-bold text-gray-950">P150.00</span></div>
                </div>

                {/* Timeline */}
                <div className="flex-1 overflow-y-auto px-6 py-2 flex flex-col justify-center">
                  <div className="relative border-l-2 border-dashed border-[#15803d]/40 pl-8 space-y-6">
                    {/* Released */}
                    {(selectedDoc.current_status === 'completed' || selectedDoc.current_status === 'released') && (
                      <div className="relative">
                        <span className="absolute -left-12 top-0.5 w-8 h-8 rounded-full bg-[#15803d] text-white flex items-center justify-center shadow-sm">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                        </span>
                        <div className="text-xs font-black text-gray-900">Released</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{new Date(selectedDoc.updated_at).toLocaleDateString()} • {new Date(selectedDoc.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                      </div>
                    )}

                    {/* Secretary Evaluation */}
                    {['pending_secretary', 'ready_window_1', 'completed', 'released'].includes(selectedDoc.current_status) && (
                      <div className="relative">
                        <span className="absolute -left-12 top-0.5 w-8 h-8 rounded-full bg-[#15803d] text-white flex items-center justify-center shadow-sm">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M21 16V10a2 2 0 00-2-2h-3V5M16 8h4"/></svg>
                        </span>
                        <div className="text-xs font-black text-gray-900">Routed to College Secretary</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{new Date(selectedDoc.updated_at).toLocaleDateString()} • {new Date(selectedDoc.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                      </div>
                    )}

                    {/* Payment Cleared */}
                    {['pending_payment_verification', 'pending_secretary', 'ready_window_1', 'completed', 'released'].includes(selectedDoc.current_status) && (
                      <div className="relative">
                        <span className="absolute -left-12 top-0.5 w-8 h-8 rounded-full bg-[#15803d] text-white flex items-center justify-center shadow-sm">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                        </span>
                        <div className="text-xs font-black text-gray-900">Payment Cleared - GCash</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{new Date(selectedDoc.updated_at).toLocaleDateString()} • {new Date(selectedDoc.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                      </div>
                    )}

                    {/* Request Submitted */}
                    <div className="relative">
                      <span className="absolute -left-12 top-0.5 w-8 h-8 rounded-full bg-[#15803d] text-white flex items-center justify-center shadow-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                      </span>
                      <div className="text-xs font-black text-gray-900">Request Submitted</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{new Date(selectedDoc.created_at).toLocaleDateString()} • {new Date(selectedDoc.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-center">
                  <button 
                    onClick={() => setActiveModal(null)}
                    className="w-full max-w-xs py-3 border border-gray-200 text-gray-800 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all text-center"
                  >
                    Back
                  </button>
                </div>
              </div>
            </div>
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
              <span className="text-xs font-bold text-gray-800">June 19, 2026</span>
              <svg className="w-4 h-4 text-gray-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            </div>
          </div>

          {/* Verification Queue Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h3 className="font-bold text-gray-950 text-sm tracking-wider uppercase">ACTIVE QUEUE</h3>
              <span className="text-xs text-gray-500 font-semibold">
                Pending Request: <strong className="text-gray-900">{documents.filter(d => d.current_status === 'pending_payment_verification').length}</strong>
              </span>
            </div>
            <div className="p-6 overflow-x-auto">
              {documents.filter(d => d.current_status === 'pending_payment_verification').length === 0 ? (
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
                        <td className="py-4 text-xs font-bold text-gray-800 font-mono">P150.00</td>
                        <td className="py-4 text-right pr-4">
                          <button 
                            onClick={() => { setSelectedDoc(doc); setActiveModal('verify-pay'); }}
                            className="px-4 py-2 bg-[#15803d] hover:bg-[#166534] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 ml-auto"
                          >
                            <span>👁</span> Review
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
          {activeModal === 'verify-pay' && selectedDoc && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setActiveModal(null)}></div>
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl p-6 sm:p-8 z-10 border border-gray-200 relative">
                <button className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100" onClick={() => setActiveModal(null)}>✕</button>
                
                <h3 className="text-xl font-black text-gray-900 mb-6">Verification Details</h3>
                
                {/* Gray detail panel */}
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 my-4 font-mono text-[11px] text-gray-600 space-y-2">
                  <div className="flex justify-between"><span>Name</span><span className="font-bold text-gray-950">{selectedDoc.student_name || 'Unknown'}</span></div>
                  <div className="flex justify-between"><span>Document Type</span><span className="font-bold text-gray-950">{selectedDoc.document_type}</span></div>
                  <div className="flex justify-between"><span>Tracking ID</span><span className="font-bold text-gray-950">#{selectedDoc.tracking_number || selectedDoc.id}</span></div>
                  <div className="flex justify-between"><span>Date Paid</span><span className="font-bold text-gray-950">{new Date(selectedDoc.updated_at).toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'})}</span></div>
                  <div className="flex justify-between"><span>Copies</span><span className="font-bold text-gray-950">1</span></div>
                  <div className="flex justify-between border-t border-gray-200/50 pt-2"><span>Amount</span><span className="font-bold text-gray-950">P150.00</span></div>
                </div>

                <div className="space-y-4">
                  <span className="text-xs font-black text-gray-900 block">Gcash Receipt Screenshot</span>
                  
                  {/* Receipt Preview */}
                  <div className="bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 h-64 relative flex items-center justify-center">
                    {selectedDoc.receipt_image_path ? (
                      <a href={`http://localhost:3000${selectedDoc.receipt_image_path}`} target="_blank" rel="noreferrer" title="Click to view full size">
                        <img 
                          src={`http://localhost:3000${selectedDoc.receipt_image_path}`} 
                          alt="GCash Receipt" 
                          className="w-full h-full object-contain cursor-zoom-in"
                        />
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">No Image Uploaded</span>
                    )}
                  </div>

                  <div className="text-center font-bold text-xs text-gray-800 py-2 border-b border-gray-100">
                    GCash Reference Number: <span className="font-mono text-gray-600 font-bold">{selectedDoc.gcash_reference_no || 'None'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-6">
                  <button 
                    onClick={() => setActiveModal(null)}
                    className="w-1/2 py-3 border border-gray-200 text-gray-800 rounded-xl font-bold hover:bg-gray-50 text-xs transition-all text-center"
                  >
                    Return
                  </button>
                  <button 
                    onClick={() => handleFinanceVerify('approve')}
                    disabled={actionLoading}
                    className="w-1/2 py-3 bg-[#15803d] hover:bg-[#166534] text-white rounded-xl font-bold text-xs shadow-md transition-all text-center"
                  >
                    Verify Payment
                  </button>
                </div>
              </div>
            </div>
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
                  <span className="text-xs font-bold text-gray-800">June 19, 2026</span>
                  <svg className="w-4 h-4 text-gray-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                </div>
              </div>

              {/* Top KPIs Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between h-44">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">PROCESSED MANUAL DOCUMENT TODAY</span>
                      <span className="text-3xl font-display font-black text-gray-900 mt-2 block">14 <span className="text-sm text-gray-400 font-medium font-sans">Documents</span></span>
                    </div>
                    <svg className="w-20 h-10 text-[#15803d] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 100 40">
                      <path d="M 5 30 C 20 20, 40 35, 60 10 C 80 5, 90 25, 95 15" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 text-[10px] font-bold text-[#15803d] w-fit flex items-center gap-1.5 mt-2">
                    <span className="w-1.5 h-1.5 bg-[#15803d] rounded-full"></span>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between h-44">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">PENDING SECRETARY</span>
                      <span className="text-3xl font-display font-black text-gray-900 mt-2 block">
                        {documents.filter(d => d.current_status === 'pending_secretary').length} <span className="text-sm text-gray-400 font-medium font-sans">Pending</span>
                      </span>
                    </div>
                    <svg className="w-20 h-10 text-[#15803d] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 100 40">
                      <path d="M 5 25 C 25 35, 45 10, 65 20 C 80 25, 90 5, 95 15" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="bg-[#15803d] rounded-xl px-4 py-2 text-[10px] font-medium text-white w-full mt-2 leading-snug">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between h-44">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">READY TO RELEASE</span>
                      <span className="text-3xl font-display font-black text-gray-900 mt-2 block">
                        {documents.filter(d => d.current_status === 'ready_window_1').length} <span className="text-sm text-gray-400 font-medium font-sans">Ready</span>
                      </span>
                    </div>
                    <svg className="w-20 h-10 text-[#15803d] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 100 40">
                      <path d="M 5 20 C 25 10, 45 35, 65 15 C 80 5, 90 20, 95 30" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 text-[10px] font-bold text-[#15803d] w-fit flex items-center gap-1.5 mt-2">
                    <span className="w-1.5 h-1.5 bg-[#15803d] rounded-full"></span>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-8">
                {/* Scan or Upload Document Dropzone */}
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-200 flex flex-col justify-between min-h-[350px]">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">SCAN OR UPLOAD DOCUMENT</h3>
                    <p className="text-xs text-gray-400 mt-1">Upload physical papers to extract data via PyTorch.</p>
                  </div>
                  
                  <div className="flex-1 mt-6 border-2 border-dashed border-[#15803d]/40 rounded-3xl p-8 bg-gray-50/50 flex flex-col items-center justify-center relative">
                    <span className="text-xs font-bold text-gray-900 mb-6 flex items-center gap-1">
                      <span className="text-[#15803d]">Click to</span> Scan or Upload Document
                    </span>
                    
                    <div className="flex items-center gap-6">
                      <button 
                        onClick={() => fileInputRef.current?.click()} 
                        className="flex flex-col items-center gap-2 group focus:outline-none"
                      >
                        <div className="w-16 h-16 bg-[#15803d] text-white rounded-2xl flex items-center justify-center shadow-md hover:bg-[#166534] transition-all transform hover:-translate-y-1">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                        </div>
                        <span className="text-xs font-bold text-[#15803d]">Upload</span>
                      </button>

                      <span className="text-sm font-black text-gray-400">OR</span>

                      <button 
                        onClick={() => setActiveModal('scanning')} 
                        className="flex flex-col items-center gap-2 group focus:outline-none"
                      >
                        <div className="w-16 h-16 bg-[#15803d] text-white rounded-2xl flex items-center justify-center shadow-md hover:bg-[#166534] transition-all transform hover:-translate-y-1">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                        </div>
                        <span className="text-xs font-bold text-[#15803d]">Scan</span>
                      </button>
                    </div>

                    <span className="text-[10px] text-gray-400 mt-6 absolute bottom-4">System will automatically route to College Secretary</span>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setScanFile(e.target.files[0]);
                          setScanDocType('Transcript of Records');
                          setActiveModal('scan-confirm');
                        }
                      }}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Release Desk Card Summary */}
                <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-200 min-h-[350px] flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg uppercase tracking-wider">RELEASE DESK</h3>
                    <p className="text-xs text-gray-400 mt-1">Pending document handovers to students.</p>
                  </div>
                  <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-100 rounded-3xl mt-6">
                    <span className="text-xs text-gray-400 font-medium">To view or release active documents, switch to the Release Queue tab.</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 3.2. RELEASE QUEUE VIEW */}
          {currentTab === 'release-queue' && (
            <>
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-3xl font-display font-black text-gray-900 tracking-tight">
                    Release Queue
                  </h2>
                </div>
                <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-5 py-2.5 shadow-sm">
                  <span className="text-xs font-semibold text-gray-500">Today:</span>
                  <span className="text-xs font-bold text-gray-800">June 19, 2026</span>
                  <svg className="w-4 h-4 text-gray-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                </div>
              </div>

              {/* Active release queue card */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">Active release queue</h3>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 font-medium">
                      <span>Pending Student Pick-up: <strong className="text-gray-900">{documents.filter(d => d.current_status === 'ready_window_1').length}</strong></span>
                      <span>Cleared by Secretary Today: <strong className="text-gray-900">86</strong></span>
                    </div>
                  </div>
                  <div className="relative w-64">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    </span>
                    <input type="text" placeholder="Search" className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#15803d]/20" />
                  </div>
                </div>

                <div className="p-6">
                  {documents.filter(d => d.current_status === 'ready_window_1').length === 0 ? (
                    <div className="text-center py-16 text-gray-400 font-medium">No documents waiting for release.</div>
                  ) : (
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
                        {documents.filter(d => d.current_status === 'ready_window_1').map(doc => (
                          <tr key={doc.id} className="hover:bg-gray-50/50 group">
                            <td className="py-4 pl-4 font-mono text-xs text-gray-500">#{doc.tracking_number ? doc.tracking_number.slice(0, 10).toUpperCase() : doc.id}</td>
                            <td className="py-4">
                              <div className="text-sm font-bold text-gray-900">{doc.student_name || 'Name Unresolved'}</div>
                              <div className="text-xs font-mono text-gray-400 mt-0.5">{doc.student_id || 'ID Pending'}</div>
                            </td>
                            <td className="py-4 text-xs font-bold text-gray-600">{doc.document_type}</td>
                            <td className="py-4 text-xs font-bold text-gray-505 font-mono">12 mins</td>
                            <td className="py-4 text-right pr-4">
                              <button 
                                onClick={() => handleWindow1Release(doc.id)}
                                disabled={actionLoading}
                                className="px-5 py-2.5 bg-[#15803d] hover:bg-[#166534] text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                              >
                                Release Doc
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
                  <span className="text-xs font-bold text-gray-800">June 19, 2026</span>
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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setActiveModal(null)}></div>
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-8 z-10 border border-gray-200 relative flex flex-col h-[70vh] justify-between">
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
                    <span className="text-4xl">📄</span>
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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setActiveModal(null)}></div>
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-8 z-10 border border-gray-100 relative flex flex-col h-[75vh] justify-between">
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
                    <span className="text-3xl block mb-2">📷</span>
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
                  <span className="text-xs font-bold text-gray-800">June 19, 2026</span>
                  <svg className="w-4 h-4 text-gray-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between h-44">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">PROCESSED DOCUMENT TODAY</span>
                      <span className="text-3xl font-display font-black text-gray-900 mt-2 block">14 <span className="text-sm text-gray-400 font-medium font-sans">Documents</span></span>
                    </div>
                    <svg className="w-20 h-10 text-[#15803d] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 100 40">
                      <path d="M 5 30 C 20 20, 40 35, 60 10 C 80 5, 90 25, 95 15" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 text-[10px] font-bold text-[#15803d] w-fit flex items-center gap-1.5 mt-2">
                    <span className="w-1.5 h-1.5 bg-[#15803d] rounded-full"></span>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between h-44">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">PENDING DOCUMENTS</span>
                      <span className="text-3xl font-display font-black text-gray-900 mt-2 block">
                        {documents.filter(d => d.current_status === 'pending_secretary').length} <span className="text-sm text-gray-400 font-medium font-sans">Documents</span>
                      </span>
                    </div>
                    <svg className="w-20 h-10 text-[#15803d] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 100 40">
                      <path d="M 5 25 C 25 35, 45 10, 65 20 C 80 25, 90 5, 95 15" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="bg-[#15803d] rounded-xl px-4 py-2 text-[10px] font-medium text-white w-full mt-2 leading-snug">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between h-44">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">READY TO RELEASE</span>
                      <span className="text-3xl font-display font-black text-gray-900 mt-2 block">
                        {documents.filter(d => d.current_status === 'ready_window_1').length} <span className="text-sm text-gray-400 font-medium font-sans">Ready</span>
                      </span>
                    </div>
                    <svg className="w-20 h-10 text-[#15803d] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 100 40">
                      <path d="M 5 20 C 25 10, 45 35, 65 15 C 80 5, 90 20, 95 30" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 text-[10px] font-bold text-[#15803d] w-fit flex items-center gap-1.5 mt-2">
                    <span className="w-1.5 h-1.5 bg-[#15803d] rounded-full"></span>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                  </div>
                </div>
              </div>

              {/* Active Queue Table */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden mt-8">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                  <h3 className="font-bold text-gray-950 text-sm tracking-wider uppercase">ACTIVE QUEUE</h3>
                </div>
                <div className="p-6 overflow-x-auto">
                  {documents.filter(d => d.current_status === 'pending_secretary').length === 0 ? (
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
                            <td className="py-4 text-xs text-gray-400">Just Now</td>
                            <td className="py-4">
                              <span className="px-3 py-1 bg-emerald-50 text-[#15803d] text-[10px] font-black rounded-full uppercase tracking-wider">PAID</span>
                            </td>
                            <td className="py-4 text-right pr-4">
                              <button 
                                onClick={() => {
                                  setSelectedDoc(doc);
                                  setEvalStudentId(doc.student_id || '23 - 02392');
                                  setEvalStudentName(doc.student_name || 'Jimenez, Jhervin');
                                  setEvalDocType(doc.document_type || 'Transcript of Records');
                                  setActiveModal('evaluate');
                                }}
                                className="px-4 py-2 bg-[#15803d] hover:bg-[#166534] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 ml-auto"
                              >
                                <span>👁</span> Review
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
                              <div className="font-bold text-gray-900">{doc.student_name || 'Jimenez, Jhervin'}</div>
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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
              <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setActiveModal(null)}></div>
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-7xl h-[85vh] flex flex-col relative z-10 overflow-hidden border border-gray-200">
                
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-white">
                  <div>
                    <h2 className="text-xl font-black text-gray-900 leading-tight">AI Data Extraction Review</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Verify EasyOCR extraction against the original document.</p>
                  </div>
                  <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100">✕</button>
                </div>

                {/* Body split screen */}
                <div className="flex flex-col lg:flex-row flex-1 min-h-0 bg-gray-50/50">
                  {/* Left: Original document scan preview */}
                  <div className="lg:w-1/2 p-6 flex flex-col border-r border-gray-200 min-h-0">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-black text-gray-800">Original Scan</span>
                      <span className="text-xs font-mono text-gray-500 bg-white border border-gray-200 rounded-xl px-3 py-1 font-semibold shadow-sm shrink-0">
                        {selectedDoc.original_filename || 'scan_00129.jpg'}
                      </span>
                    </div>
                    <div className="flex-1 bg-gray-200 border border-gray-300 rounded-3xl overflow-hidden relative flex items-center justify-center shadow-inner">
                      {selectedDoc.file_path ? (
                        <a href={`http://localhost:3000${selectedDoc.file_path}`} target="_blank" rel="noreferrer" title="Click to view full size">
                          <img 
                            src={`http://localhost:3000${selectedDoc.file_path}`} 
                            alt="Scanned Document" 
                            className="w-full h-full object-contain cursor-zoom-in"
                          />
                        </a>
                      ) : (
                        <div className="text-center p-4">
                          <span className="text-3xl block mb-2">📄</span>
                          <span className="text-xs text-gray-400">Scan document file missing</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Secretary data form editor */}
                  <div className="lg:w-1/2 bg-white p-6 md:p-8 flex flex-col justify-between overflow-y-auto min-h-0">
                    <div className="space-y-6">
                      {/* Confidence Score Panel */}
                      <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-100 text-[#15803d] rounded-xl flex items-center justify-center font-bold">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">CONFIDENCE SCORE</span>
                            <span className="text-[10px] font-bold text-gray-400 block mt-0.5">Extraction successful. Please verify</span>
                          </div>
                        </div>
                        <span className="text-2xl font-black text-[#15803d] font-mono">96.4%</span>
                      </div>

                      <div className="space-y-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-gray-800 uppercase tracking-wide"># Tracking ID</label>
                          <input 
                            type="text" 
                            disabled 
                            value={selectedDoc.tracking_number || 'TRC-9011'} 
                            className="w-full p-3 bg-gray-100 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 font-mono"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-gray-800 uppercase tracking-wide">Student ID</label>
                            <input 
                              type="text" 
                              value={evalStudentId} 
                              onChange={(e) => setEvalStudentId(e.target.value)}
                              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none" 
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-gray-800 uppercase tracking-wide">Document Tye</label>
                            <select 
                              value={evalDocType} 
                              onChange={(e) => setEvalDocType(e.target.value)}
                              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none cursor-pointer"
                            >
                              <option value="Transcript of Records">Transcript of Records</option>
                              <option value="Graduation Clearance">Graduation Clearance</option>
                              <option value="Certificate of Good Moral">Certificate of Good Moral</option>
                              <option value="Honorable Dismissal">Honorable Dismissal</option>
                              <option value="Diploma">Diploma</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-gray-800 uppercase tracking-wide">Student Name</label>
                          <input 
                            type="text" 
                            value={evalStudentName} 
                            onChange={(e) => setEvalStudentName(e.target.value)}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none" 
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-gray-800 uppercase tracking-wide">Secretary Notes</label>
                          <textarea 
                            value={clerkNotes}
                            onChange={(e) => setClerkNotes(e.target.value)}
                            placeholder="Add any remarks...."
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none h-24 resize-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 pt-6 mt-6 border-t border-gray-100 shrink-0">
                      <button 
                        onClick={() => setActiveModal(null)}
                        className="w-1/3 py-3 border border-gray-200 text-gray-800 rounded-xl font-bold hover:bg-gray-50 text-xs transition-all text-center"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => handleSecretaryEvaluate('approve')}
                        disabled={actionLoading}
                        className="w-2/3 py-3 bg-[#15803d] hover:bg-[#166534] text-white rounded-xl font-bold text-xs shadow-md transition-all text-center"
                      >
                        Approve and Route to Window 1
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
                                5. REGISTRAR ADMIN DASHBOARD
         ========================================================================= */}
      {isAdmin && (
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
              <span className="text-xs font-bold text-gray-800">June 19, 2026</span>
              <svg className="w-4 h-4 text-gray-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            </div>
          </div>

          {/* Metrics Overview Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between h-44">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">System Throughput</span>
                  <span className="text-3xl font-display font-black text-gray-900 mt-2 block">14.8 <span className="text-sm text-gray-400 font-medium font-sans">min</span></span>
                </div>
                <svg className="w-20 h-10 text-[#15803d] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 100 40">
                  <path d="M 5 30 C 20 20, 40 35, 60 10 C 80 5, 90 25, 95 15" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 text-[10px] font-bold text-[#15803d] w-fit flex items-center gap-1.5 mt-2">
                <span className="w-1.5 h-1.5 bg-[#15803d] rounded-full"></span>
                +12.8% faster than historical baseline
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between h-44">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">AI Confidence Avg</span>
                  <span className="text-3xl font-display font-black text-gray-900 mt-2 block">96.2%</span>
                </div>
                <svg className="w-20 h-10 text-[#15803d] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 100 40">
                  <path d="M 5 25 C 25 35, 45 10, 65 20 C 80 25, 90 5, 95 15" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>
              <div className="bg-[#15803d] rounded-xl px-4 py-2 text-[10px] font-medium text-white w-full mt-2 leading-snug">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit.
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between h-44">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Real-time Backlog</span>
                  <span className="text-3xl font-display font-black text-gray-900 mt-2 block">
                    {documents.filter(d => d.current_status === 'pending_secretary').length}
                  </span>
                </div>
                <svg className="w-20 h-10 text-[#15803d] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 100 40">
                  <path d="M 5 20 C 25 10, 45 35, 65 15 C 80 5, 90 20, 95 30" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 text-[10px] font-bold text-[#15803d] w-fit flex items-center gap-1.5 mt-2">
                <span className="w-1.5 h-1.5 bg-[#15803d] rounded-full"></span>
                Documents currently in PENDING_SEC state
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
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-500 font-bold cursor-pointer hover:bg-gray-100 transition-colors">
                  <span>All Document</span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                </div>
              </div>
              
              {/* Smooth spline SVG line graph */}
              <div className="flex-1 mt-6 relative h-64 flex flex-col justify-end">
                <div className="absolute inset-0 w-full h-full pb-8">
                  <svg className="w-full h-full" viewBox="0 0 600 200" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="forecast-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#15803d" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#15803d" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {/* Area under curve */}
                    <path 
                      d="M 60 200 C 115 110, 115 190, 170 170 C 225 150, 225 150, 280 140 C 335 130, 335 60, 390 70 C 445 80, 445 100, 500 90 L 500 200 Z" 
                      fill="url(#forecast-gradient)" 
                    />
                    {/* Smooth curve line */}
                    <path 
                      d="M 60 130 C 115 110, 115 190, 170 170 C 225 150, 225 150, 280 140 C 335 130, 335 60, 390 70 C 445 80, 445 100, 500 90" 
                      fill="none" 
                      stroke="#0f172a" 
                      strokeWidth="2.5" 
                    />
                    
                    {/* Data Points (circle dots) */}
                    <circle cx="60" cy="130" r="5.5" fill="white" stroke="#0f172a" strokeWidth="3" />
                    <circle cx="170" cy="170" r="5.5" fill="white" stroke="#0f172a" strokeWidth="3" />
                    <circle cx="280" cy="140" r="5.5" fill="white" stroke="#0f172a" strokeWidth="3" />
                    <circle cx="390" cy="70" r="5.5" fill="white" stroke="#0f172a" strokeWidth="3" />
                    <circle cx="500" cy="90" r="5.5" fill="white" stroke="#0f172a" strokeWidth="3" />
                  </svg>
                </div>
                
                {/* Labels at the bottom */}
                <div className="flex justify-between items-center px-12 border-t border-gray-100 pt-3 text-[10px] font-bold text-gray-400 font-mono relative z-10">
                  <span>Mon</span>
                  <span>Tues</span>
                  <span>Wed</span>
                  <span>Thurs</span>
                  <span>Fri</span>
                </div>
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
                <div className="bg-white/10 border border-white/15 rounded-2xl p-4 backdrop-blur-md">
                  <div className="text-[10px] font-bold text-pine-300 uppercase tracking-widest mb-1 flex items-center gap-1">⚠ Volume Warning</div>
                  <div className="text-xs text-gray-200 leading-relaxed font-medium">
                    Prophet predicts a 200% surge in Transcript clearance requests on Thursday due to upcoming PLP enrollment deadlines.
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Prescribed Action</div>
                  <div className="text-xs text-gray-300 leading-relaxed font-medium">
                    Temporarily assign one cross-trained Records Clerk to Window 1 on Thursday morning to maintain high release speeds.
                  </div>
                </div>
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
                      <th className="pb-4 font-bold text-right pr-4">Action</th>
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
                            <a 
                              href={`http://localhost:3000/${student.id_proof_path.replace(/\\/g, '/')}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1"
                            >
                              🔎 View ID / Diploma Attachment
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400 italic">No proof uploaded</span>
                          )}
                        </td>
                        <td className="py-4 text-right pr-4 space-x-2">
                          <button 
                            onClick={() => handleAdminVerifyStudent(student.id, 'reject')}
                            disabled={actionLoading}
                            className="px-3 py-1.5 bg-white border border-red-200 text-red-500 rounded-lg text-xs font-bold hover:bg-red-50"
                          >
                            Reject
                          </button>
                          <button 
                            onClick={() => handleAdminVerifyStudent(student.id, 'verify')}
                            disabled={actionLoading}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm"
                          >
                            Verify Student
                          </button>
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
    </div>
  );
}
