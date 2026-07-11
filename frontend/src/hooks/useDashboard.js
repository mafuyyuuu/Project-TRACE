import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getDocuments,
  submitPayment,
  verifyPayment,
  evaluateDocument,
  releaseDocument,
  getPendingStudents,
  verifyStudent,
  uploadDocument,
  getDashboardStats,
  getForecast,
  getInsights,
  lookupStudent,
  cancelDocument
} from '../services/api';

/**
 * Hook for managing all Dashboard data fetching and action handlers.
 * Follows CODING_PREFERENCES: "Separate the fetching logic (hooks) from the presentational components."
 *
 * @param {Object} user - The authenticated user object from useAuth().
 * @returns Dashboard state, action handlers, and helper functions.
 */
export default function useDashboard(user) {
  // Core data state
  const [documents, setDocuments] = useState([]);
  const [dashStats, setDashStats] = useState({
    processed_today: 0,
    cleared_by_secretary_today: 0,
    avg_processing_minutes: 0,
    avg_ocr_confidence: 0,
    backlog_count: 0,
    pending_secretary_count: 0,
    ready_window_1_count: 0
  });
  const [forecastData, setForecastData] = useState([]);
  const [aiInsights, setAiInsights] = useState([]);
  const [pendingStudents, setPendingStudents] = useState([]);

  // Loading & feedback state
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [selectedDocType, setSelectedDocType] = useState('');
  const [semesters, setSemesters] = useState(8);
  const [reqCopies, setReqCopies] = useState(1);
  const [requestFile, setRequestFile] = useState(null);
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentFile, setPaymentFile] = useState(null);
  const [clerkNotes, setClerkNotes] = useState('');

  // Secretary Evaluation Fields
  const [evalStudentId, setEvalStudentId] = useState('');
  const [evalStudentName, setEvalStudentName] = useState('');
  const [evalDocType, setEvalDocType] = useState('Transcript of Records');
  const [scanDocType, setScanDocType] = useState('Transcript of Records');

  // Modal state
  const [activeModal, setActiveModal] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [viewImageUrl, setViewImageUrl] = useState(null);
  const [trackerProgress, setTrackerProgress] = useState(0);

  // Window 1 Intake State
  const [scanFile, setScanFile] = useState(null);
  const [scanProgress, setScanProgress] = useState(0);
  const fileInputRef = useRef(null);

  // ──────────────────────────────────────────────────────
  // DATA FETCHING
  // ──────────────────────────────────────────────────────

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      if (user.role === 'admin') {
        const docsData = await getDocuments(1, 100);
        setDocuments(docsData.documents || []);
        try { const stats = await getDashboardStats(); setDashStats(stats); } catch { console.warn('Stats unavailable'); }
        try { const fc = await getForecast(); setForecastData(fc.forecast || []); } catch { console.warn('Forecast unavailable'); }
        try { const ins = await getInsights(); setAiInsights(ins.insights || []); } catch { console.warn('Insights unavailable'); }

        const studentsData = await getPendingStudents();
        setPendingStudents(studentsData.pending_students || []);
      } else {
        const docsData = await getDocuments(1, 100);
        setDocuments(docsData.documents || []);
        try { const stats = await getDashboardStats(); setDashStats(stats); } catch { console.warn('Stats unavailable'); }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, loadDashboardData]);

  // Tracker progress animation
  useEffect(() => {
    if (activeModal === 'tracking' && selectedDoc) {
      setTrackerProgress(0);
      const timer = setTimeout(() => {
        const target = selectedDoc.current_status === 'pending_payment' ? 0 :
                       selectedDoc.current_status === 'pending_payment_verification' ? 25 :
                       selectedDoc.current_status === 'pending_secretary' ? 50 :
                       selectedDoc.current_status === 'ready_window_1' ? 75 : 100;
        setTrackerProgress(target);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeModal, selectedDoc]);

  // ──────────────────────────────────────────────────────
  // NOTIFICATION HELPER
  // ──────────────────────────────────────────────────────

  const triggerNotification = useCallback((msg, type = 'success') => {
    if (type === 'success') {
      setSuccess(msg);
      setTimeout(() => setSuccess(''), 4000);
    } else {
      setError(msg);
      setTimeout(() => setError(''), 4000);
    }
  }, []);

  // ──────────────────────────────────────────────────────
  // STUDENT ACTIONS
  // ──────────────────────────────────────────────────────

  const handleStudentSubmitRequest = useCallback(async (e) => {
    e.preventDefault();
    const docType = selectedDocType;
    const file = e.target.docFile?.files[0];

    if (!docType) {
      triggerNotification('Please select a document type.', 'error');
      return;
    }

    const purpose = e.target.purpose?.value || '';
    const copies = e.target.copies?.value || 1;
    const yearGraduated = e.target.yearGraduated?.value || '';
    const requestingSchool = e.target.requestingSchool?.value || '';
    const reason = e.target.reason?.value || '';

    const extraDataObj = {};
    if (yearGraduated) extraDataObj.year_graduated = yearGraduated;
    if (requestingSchool) extraDataObj.requesting_school = requestingSchool;
    if (purpose) extraDataObj.purpose = purpose;
    if (reason) extraDataObj.reason = reason;
    if (docType === 'Transcript of Records' || docType === 'Transcript of Records (TOR)') {
      extraDataObj.semesters = semesters;
    }
    const extraData = JSON.stringify(extraDataObj);

    try {
      setActionLoading(true);
      const formData = new FormData();
      if (file) formData.append('document', file);
      formData.append('document_type', docType);
      formData.append('student_id', user.student_id || 'STU-' + Date.now().toString().slice(-6));
      formData.append('student_name', user.full_name);
      formData.append('purpose', extraData);
      formData.append('copies', copies);
      if (docType === 'Transcript of Records' || docType === 'Transcript of Records (TOR)') {
        formData.append('semesters', semesters);
      }

      const result = await uploadDocument(formData);
      triggerNotification(`Request submitted! Tracking ID: ${result.tracking_number}. Please pay now.`);
      e.target.reset();
      setRequestFile(null);
      setSelectedDocType('');
      setSelectedDoc(result.document);
      setActiveModal('pay');
      loadDashboardData();
    } catch (err) {
      triggerNotification(err.response?.data?.error || 'Upload failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  }, [selectedDocType, semesters, user, triggerNotification, loadDashboardData]);

  const handleStudentSubmitPayment = useCallback(async (e) => {
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
  }, [paymentRef, paymentFile, selectedDoc, triggerNotification, loadDashboardData]);

  const handleStudentCancelRequest = useCallback(async (id, isBackAction = false) => {
    if (!isBackAction && !window.confirm('Are you sure you want to cancel this request? This action cannot be undone.')) return;
    try {
      setActionLoading(true);
      await cancelDocument(id);
      if (!isBackAction) triggerNotification('Request cancelled successfully.');
      loadDashboardData();
      if (isBackAction) {
        setActiveModal('new-request');
      }
    } catch (err) {
      triggerNotification(err.response?.data?.error || 'Failed to cancel request.', 'error');
    } finally {
      setActionLoading(false);
    }
  }, [triggerNotification, loadDashboardData]);

  // ──────────────────────────────────────────────────────
  // FINANCE CLERK ACTIONS
  // ──────────────────────────────────────────────────────

  const handleFinanceVerify = useCallback(async (action, file) => {
    if (!selectedDoc) return;
    try {
      setActionLoading(true);
      const formData = new FormData();
      formData.append('action', action);
      formData.append('notes', clerkNotes);
      if (file) {
        formData.append('officialReceipt', file);
      }
      
      await verifyPayment(selectedDoc.id, formData);
      triggerNotification(`Payment reference successfully ${action === 'approve' ? 'approved' : 'rejected'}.`);
      setActiveModal(null);
      setClerkNotes('');
      loadDashboardData();
    } catch (err) {
      triggerNotification(err.response?.data?.error || 'Verification action failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  }, [selectedDoc, clerkNotes, triggerNotification, loadDashboardData]);

  // ──────────────────────────────────────────────────────
  // COLLEGE SECRETARY ACTIONS
  // ──────────────────────────────────────────────────────

  const handleSecretaryEvaluate = useCallback(async (action) => {
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
  }, [selectedDoc, evalStudentId, evalStudentName, evalDocType, clerkNotes, triggerNotification, loadDashboardData]);

  // ──────────────────────────────────────────────────────
  // WINDOW 1 CLERK ACTIONS
  // ──────────────────────────────────────────────────────

  const handleWindow1Release = useCallback(async (id) => {
    if (!window.confirm("Confirm document release to student?")) return;
    try {
      setActionLoading(true);
      await releaseDocument(id);
      triggerNotification('Document successfully released.');
      loadDashboardData();
    } catch (err) {
      triggerNotification(err.response?.data?.error || 'Failed to release document.', 'error');
    } finally {
      setActionLoading(false);
    }
  }, [triggerNotification, loadDashboardData]);

  const simulateHardwareScan = useCallback((file) => {
    setScanFile(file);
    setScanDocType('Transcript of Records');
    setActiveModal('hardware-scanner');
    setScanProgress(0);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      setScanProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setActiveModal('scan-confirm');
        }, 500);
      }
    }, 100);
  }, []);

  const handleWindow1ScanUpload = useCallback(async (docType) => {
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
  }, [scanFile, triggerNotification, loadDashboardData]);

  const handleManualInputSubmit = useCallback(async (e) => {
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
  }, [triggerNotification, loadDashboardData]);

  const handleFetchStudent = useCallback(async (e) => {
    e.preventDefault();
    const studentIdInput = document.getElementById('manual-student-id')?.value;
    if (!studentIdInput) {
      triggerNotification('Please enter a Student ID first.', 'error');
      return;
    }
    try {
      const result = await lookupStudent(studentIdInput);
      const nameInput = document.getElementById('manual-full-name');
      const courseSelect = document.getElementById('manual-course');
      if (nameInput) nameInput.value = result.student?.full_name || '';
      if (courseSelect) courseSelect.value = result.student?.course || '';
      triggerNotification('Student details fetched successfully.');
    } catch (err) {
      triggerNotification(err.response?.data?.error || 'Student not found.', 'error');
    }
  }, [triggerNotification]);

  // ──────────────────────────────────────────────────────
  // ADMIN ACTIONS
  // ──────────────────────────────────────────────────────

  const handleAdminVerifyStudent = useCallback(async (userId, action) => {
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
  }, [triggerNotification, loadDashboardData]);

  // ──────────────────────────────────────────────────────
  // UI HELPER FUNCTIONS
  // ──────────────────────────────────────────────────────

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

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending_payment': return 'Awaiting Payment';
      case 'pending_payment_verification': return 'Verifying Payment';
      case 'pending_secretary': return 'Secretary Evaluation';
      case 'ready_window_1': return 'Ready for Release';
      case 'completed': return 'Completed';
      case 'released': return 'Completed';
      default: return status;
    }
  };

  const requiresAttachment = (type) => ['Honorable Dismissal', 'Graduation Clearance', 'Certificate of Good Moral'].includes(type);

  const getAttachmentLabel = (type) => {
    if (type === 'Honorable Dismissal') return 'Required Attachment (Validated Clearance)';
    if (type === 'Graduation Clearance') return 'Required Attachment (Signed Routing Form)';
    if (type === 'Certificate of Good Moral') return 'Required Attachment (Valid Student ID)';
    return 'Optional Attachment (Clearances, Old ID, etc)';
  };

  const getAttachmentHelper = (type) => {
    if (type === 'Honorable Dismissal') return 'clearance file';
    if (type === 'Graduation Clearance') return 'signed clearance form';
    if (type === 'Certificate of Good Moral') return 'student ID photo';
    return 'optional files';
  };

  const getRelativeTime = (dateStr) => {
    if (!dateStr) return '—';
    const diff = Math.round((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff} min${diff > 1 ? 's' : ''} ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)} hr${Math.floor(diff / 60) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diff / 1440)} day${Math.floor(diff / 1440) > 1 ? 's' : ''} ago`;
  };

  const getWaitTime = (dateStr) => {
    if (!dateStr) return '—';
    const diff = Math.round((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diff < 1) return '< 1 min';
    if (diff < 60) return `${diff} min${diff > 1 ? 's' : ''}`;
    return `${Math.floor(diff / 60)} hr${Math.floor(diff / 60) > 1 ? 's' : ''}`;
  };

  return {
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
    scanFile, setScanFile,
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
  };
}
