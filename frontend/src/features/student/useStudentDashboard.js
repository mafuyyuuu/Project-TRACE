import { useState, useEffect, useCallback } from 'react';
import useDashboardCore from '@/hooks/useDashboardCore';
import { uploadDocument, submitPayment, cancelDocument } from '@/services/documentsService';
import { getDocumentTypes, getPaymentMethods } from '@/services/referenceService';

/** Progress-bar target for the live tracking modal, by pipeline stage. */
const TRACKER_TARGETS = {
  pending_payment: 0,
  pending_payment_verification: 25,
  pending_secretary: 50,
  ready_window_1: 75,
};

/**
 * Student portal: request submission, checkout (GCash, card, online banking or
 * over-the-counter), cancellation, and the live tracking animation.
 */
export default function useStudentDashboard(user) {
  const core = useDashboardCore(user);
  const { runAction, triggerNotification, setActiveModal, setSelectedDoc, selectedDoc, activeModal } = core;

  // Document types come from the database so the Registrar can add or reprice
  // one without a code change.
  const [documentTypes, setDocumentTypes] = useState([]);
  const [documentTypesLoading, setDocumentTypesLoading] = useState(true);

  // New-request form: a map of type name -> that document's own fields, so a
  // single request can cover several documents.
  const [selections, setSelections] = useState({});

  // Checkout. The available methods are admin-managed reference data, so the
  // Registrar can enable Card or Online Banking without a deploy.
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState('gcash');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentFile, setPaymentFile] = useState(null);

  const [trackerProgress, setTrackerProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getPaymentMethods()
      .then((data) => {
        if (cancelled) return;
        const methods = data.payment_methods || [];
        setPaymentMethods(methods);
        if (methods.length && !methods.some((m) => m.code === 'gcash')) {
          setSelectedMethod(methods[0].code);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getDocumentTypes()
      .then((data) => {
        if (!cancelled) setDocumentTypes(data.document_types || []);
      })
      .catch(() => {
        if (!cancelled) setDocumentTypes([]);
      })
      .finally(() => {
        if (!cancelled) setDocumentTypesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Tick or untick a document type. Unticking discards its fields. */
  const toggleDocumentType = useCallback((name) => {
    setSelections((current) => {
      if (current[name]) {
        const rest = { ...current };
        delete rest[name];
        return rest;
      }
      return {
        ...current,
        [name]: { copies: 1, semesters: 8, purpose: '', requestingSchool: '', yearGraduated: '', file: null },
      };
    });
  }, []);

  /** Update one field of one selected document. */
  const updateSelection = useCallback((name, patch) => {
    setSelections((current) =>
      current[name] ? { ...current, [name]: { ...current[name], ...patch } } : current
    );
  }, []);

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

  /**
   * Submit every selected document as one request.
   *
   * The items go up as a JSON array with each document's own copies/semesters,
   * and any per-item attachment is sent as `document_<index>` so the server can
   * match files to items. The server re-prices everything — the total shown in
   * the modal is only a preview.
   */
  const handleStudentSubmitRequest = useCallback(
    async (e) => {
      e.preventDefault();

      const names = Object.keys(selections);
      if (names.length === 0) {
        triggerNotification('Please select at least one document type.', 'error');
        return;
      }

      const items = names.map((name) => {
        const selection = selections[name];
        // The dynamic per-document fields ride along as a JSON blob in `purpose`.
        const extra = {};
        if (selection.purpose) extra.purpose = selection.purpose;
        if (selection.requestingSchool) extra.requesting_school = selection.requestingSchool;
        if (selection.yearGraduated) extra.year_graduated = selection.yearGraduated;
        if (selection.semesters) extra.semesters = selection.semesters;

        return {
          document_type: name,
          copies: selection.copies,
          semesters: selection.semesters,
          purpose: JSON.stringify(extra),
        };
      });

      const formData = new FormData();
      formData.append('items', JSON.stringify(items));
      formData.append('student_name', user.full_name);
      names.forEach((name, index) => {
        const { file } = selections[name];
        if (file) formData.append(`document_${index}`, file);
      });

      let created = null;
      const ok = await runAction(
        async () => {
          created = await uploadDocument(formData);
          return created;
        },
        {
          successMessage: (r) =>
            r.documents?.length > 1
              ? `${r.documents.length} documents requested — ₱${r.total_amount} total. Please pay now.`
              : `Request submitted! Tracking ID: ${r.tracking_number}. Please pay now.`,
          errorMessage: 'Upload failed.',
        }
      );

      if (ok && created) {
        setSelections({});
        // Checkout is per group; any document in it settles the whole request.
        setSelectedDoc({ ...created.document, group_total: created.total_amount });
        setActiveModal('pay');
      }
    },
    [selections, user, runAction, triggerNotification, setSelectedDoc, setActiveModal]
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
      formData.append('payment_method', selectedMethod);

      const methodName =
        paymentMethods.find((m) => m.code === selectedMethod)?.name || 'Payment';

      const ok = await runAction(() => submitPayment(selectedDoc.id, formData), {
        successMessage: `${methodName} receipt submitted. Pending Finance verification!`,
        errorMessage: 'Payment submission failed.',
      });

      if (ok) {
        setActiveModal(null);
        setPaymentRef('');
        setPaymentFile(null);
      }
    },
    [paymentRef, paymentFile, selectedMethod, paymentMethods, selectedDoc, runAction, triggerNotification, setActiveModal]
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
    documentTypes,
    documentTypesLoading,
    selections,
    toggleDocumentType,
    updateSelection,
    paymentMethods,
    selectedMethod, setSelectedMethod,
    paymentRef, setPaymentRef,
    paymentFile, setPaymentFile,
    trackerProgress,
    handleStudentSubmitRequest,
    handleStudentSubmitPayment,
    handleStudentCancelRequest,
  };
}
