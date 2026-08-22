import { useState, useEffect, useCallback } from 'react';
import useDashboardCore from '@/hooks/useDashboardCore';
import { uploadDocument, submitPayment, cancelDocument } from '@/services/documentsService';

/** Progress-bar target for the live tracking modal, by pipeline stage. */
const TRACKER_TARGETS = {
  pending_payment: 0,
  pending_payment_verification: 25,
  pending_secretary: 50,
  ready_window_1: 75,
};

/**
 * Student portal: request submission, GCash checkout, cancellation, and the
 * live tracking animation.
 */
export default function useStudentDashboard(user) {
  const core = useDashboardCore(user);
  const { runAction, triggerNotification, setActiveModal, setSelectedDoc, selectedDoc, activeModal } = core;

  // New-request form
  const [selectedDocType, setSelectedDocType] = useState('');
  const [semesters, setSemesters] = useState(8);
  const [reqCopies, setReqCopies] = useState(1);
  const [requestFile, setRequestFile] = useState(null);

  // GCash checkout
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentFile, setPaymentFile] = useState(null);

  const [trackerProgress, setTrackerProgress] = useState(0);

  // Animate the tracker from 0 so the bar visibly fills when the modal opens.
  useEffect(() => {
    if (activeModal !== 'tracking' || !selectedDoc) return undefined;
    const timer = setTimeout(() => {
      setTrackerProgress(TRACKER_TARGETS[selectedDoc.current_status] ?? 100);
    }, 50);
    return () => clearTimeout(timer);
  }, [activeModal, selectedDoc]);

  // Reset to 0 whenever a different document is opened, without setting state
  // inside the effect above.
  const trackerKey = activeModal === 'tracking' ? selectedDoc?.id : null;
  const [lastTrackerKey, setLastTrackerKey] = useState(null);
  if (trackerKey !== lastTrackerKey) {
    setLastTrackerKey(trackerKey);
    if (trackerProgress !== 0) setTrackerProgress(0);
  }

  const isTOR = (docType) =>
    docType === 'Transcript of Records' || docType === 'Transcript of Records (TOR)';

  const handleStudentSubmitRequest = useCallback(
    async (e) => {
      e.preventDefault();
      const form = e.target;
      const docType = selectedDocType;

      if (!docType) {
        triggerNotification('Please select a document type.', 'error');
        return;
      }

      // The dynamic per-document fields are stored as a JSON blob in `purpose`.
      const extra = {};
      if (form.yearGraduated?.value) extra.year_graduated = form.yearGraduated.value;
      if (form.requestingSchool?.value) extra.requesting_school = form.requestingSchool.value;
      if (form.purpose?.value) extra.purpose = form.purpose.value;
      if (form.reason?.value) extra.reason = form.reason.value;
      if (isTOR(docType)) extra.semesters = semesters;

      const formData = new FormData();
      const file = form.docFile?.files[0];
      if (file) formData.append('document', file);
      formData.append('document_type', docType);
      formData.append('student_id', user.student_id || 'STU-' + Date.now().toString().slice(-6));
      formData.append('student_name', user.full_name);
      formData.append('purpose', JSON.stringify(extra));
      formData.append('copies', form.copies?.value || 1);
      if (isTOR(docType)) formData.append('semesters', semesters);

      let created = null;
      const ok = await runAction(
        async () => {
          created = await uploadDocument(formData);
          return created;
        },
        {
          successMessage: (r) => `Request submitted! Tracking ID: ${r.tracking_number}. Please pay now.`,
          errorMessage: 'Upload failed.',
        }
      );

      if (ok && created) {
        form.reset();
        setRequestFile(null);
        setSelectedDocType('');
        setSelectedDoc(created.document);
        setActiveModal('pay'); // straight into checkout
      }
    },
    [selectedDocType, semesters, user, runAction, triggerNotification, setSelectedDoc, setActiveModal]
  );

  const handleStudentSubmitPayment = useCallback(
    async (e) => {
      e.preventDefault();
      if (!paymentRef || !paymentFile || !selectedDoc) {
        triggerNotification('Reference number and receipt image are required.', 'error');
        return;
      }

      const formData = new FormData();
      formData.append('receipt', paymentFile);
      formData.append('gcash_reference_no', paymentRef);

      const ok = await runAction(() => submitPayment(selectedDoc.id, formData), {
        successMessage: 'GCash receipt submitted. Pending Finance verification!',
        errorMessage: 'Payment submission failed.',
      });

      if (ok) {
        setActiveModal(null);
        setPaymentRef('');
        setPaymentFile(null);
      }
    },
    [paymentRef, paymentFile, selectedDoc, runAction, triggerNotification, setActiveModal]
  );

  /**
   * `isBackAction` is the "go back and change my request" path: the draft is
   * discarded silently and the new-request modal reopens.
   */
  const handleStudentCancelRequest = useCallback(
    async (id, isBackAction = false) => {
      if (!isBackAction && !window.confirm('Are you sure you want to cancel this request? This action cannot be undone.')) {
        return;
      }

      const ok = await runAction(() => cancelDocument(id), {
        successMessage: isBackAction ? null : 'Request cancelled successfully.',
        errorMessage: 'Failed to cancel request.',
      });

      if (ok && isBackAction) setActiveModal('new-request');
    },
    [runAction, setActiveModal]
  );

  return {
    ...core,
    selectedDocType, setSelectedDocType,
    semesters, setSemesters,
    reqCopies, setReqCopies,
    requestFile, setRequestFile,
    paymentRef, setPaymentRef,
    paymentFile, setPaymentFile,
    trackerProgress,
    handleStudentSubmitRequest,
    handleStudentSubmitPayment,
    handleStudentCancelRequest,
  };
}
