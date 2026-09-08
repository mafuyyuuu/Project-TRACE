import { useState, useEffect, useCallback, useMemo } from 'react';
import useDashboardCore from '@/hooks/useDashboardCore';
import { uploadDocument, submitPayment, cancelDocument } from '@/services/documentsService';
import { getDocumentTypes, getPaymentMethods } from '@/services/referenceService';
import { STATUS, isCancellable } from '@/utils/documentStatus';

/**
 * Progress-bar target for the live tracking modal, by pipeline stage.
 *
 * Eight stages now, and payment sits near the end rather than at the start:
 * a student who has been asked to pay is most of the way there.
 */
const TRACKER_TARGETS = {
  [STATUS.PENDING_W1_INTAKE]: 0,
  [STATUS.PENDING_SEC_EVALUATION]: 15,
  [STATUS.SEC_PROCESSING]: 35,
  [STATUS.PENDING_STUDENT_PAYMENT]: 55,
  [STATUS.PENDING_FINANCE_VERIFICATION]: 70,
  [STATUS.PAID_PENDING_SEC_RELEASE]: 85,
  [STATUS.SEC_OR_VERIFIED]: 90,
  [STATUS.READY_FOR_RELEASE]: 95,
};

/**
 * Student portal: request submission, checkout, cancellation, and the live
 * tracking animation.
 *
 * Nothing is paid at submission any more. The registrar cannot quote a price
 * until the document has been printed, so the student files first and is asked
 * for money later — which is why `actionRequired` exists as its own idea here.
 */
export default function useStudentDashboard(user) {
  const core = useDashboardCore(user);
  const { documents, runAction, triggerNotification, setActiveModal, selectedDoc, activeModal } = core;

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

  // The request id staged for a cancel confirmation, or null when the dialog is closed.
  const [cancelRequestIdToConfirm, setCancelRequestIdToConfirm] = useState(null);

  /**
   * Requests that are waiting on the student rather than on a desk.
   *
   * Everything else in the pipeline is somebody else's move; this is the one
   * state where nothing happens until the student acts, so it gets its own
   * banner rather than being one row among many.
   */
  const actionRequired = useMemo(
    () => documents.filter((d) => d.current_status === STATUS.PENDING_STUDENT_PAYMENT),
    [documents]
  );

  /** Total owed across a request, since one payment settles the whole group. */
  const groupTotalFor = useCallback(
    (doc) =>
      documents
        .filter((d) => d.request_group_id === doc.request_group_id)
        .reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0),
    [documents]
  );

  /**
   * `actionRequired`, one entry per request group rather than per document.
   *
   * Billing happens once for the whole request, so more than one of its
   * documents can land in PENDING_STUDENT_PAYMENT together — and one receipt
   * settles the whole group regardless of which document it's paid against.
   * Grouping here is what lets the banner show one total and one button per
   * request instead of a duplicate row per document.
   */
  const billableGroups = useMemo(() => {
    const groups = new Map();
    for (const doc of actionRequired) {
      if (!groups.has(doc.request_group_id)) {
        groups.set(doc.request_group_id, { groupId: doc.request_group_id, docs: [] });
      }
      groups.get(doc.request_group_id).docs.push(doc);
    }
    return Array.from(groups.values()).map((g) => ({ ...g, total: groupTotalFor(g.docs[0]) }));
  }, [actionRequired, groupTotalFor]);

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
              ? `${r.documents.length} documents requested. Tracking ID: ${r.tracking_number}. You will be told the amount once they are ready.`
              : `Request submitted! Tracking ID: ${r.tracking_number}. You will be told the amount once it is ready.`,
          errorMessage: 'Upload failed.',
        }
      );

      if (ok && created) {
        setSelections({});
        // No checkout here. Nothing is payable until the College Secretary has
        // printed the documents and priced them, which is the whole point of
        // this pipeline — a price quoted at submission would be a guess.
        setActiveModal(null);
      }
    },
    [selections, user, runAction, triggerNotification, setActiveModal]
  );

  const handleStudentSubmitPayment = useCallback(
    async (e) => {
      e.preventDefault();
      if (!selectedDoc) return;

      // Each method decides for itself whether a reference/proof is required —
      // an admin can configure either off for a given method, so the guard has
      // to check the selected method's flags rather than assume both apply.
      const method = paymentMethods.find((m) => m.code === selectedMethod);
      if (method?.requires_reference !== false && !paymentRef) {
        triggerNotification(`${method?.reference_label || 'Reference number'} is required.`, 'error');
        return;
      }
      if (method?.requires_proof !== false && !paymentFile) {
        triggerNotification('A photo or screenshot of your payment is required.', 'error');
        return;
      }

      const formData = new FormData();
      if (paymentFile) formData.append('receipt', paymentFile);
      formData.append('gcash_reference_no', paymentRef);
      formData.append('payment_method', selectedMethod);

      const methodName = method?.name || 'Payment';

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
      if (!isBackAction) {
        setCancelRequestIdToConfirm(id);
        return;
      }

      const ok = await runAction(() => cancelDocument(id), {
        successMessage: null,
        errorMessage: 'Failed to cancel request.',
      });

      if (ok) setActiveModal('new-request');
    },
    [runAction, setActiveModal]
  );

  const confirmStudentCancelRequest = useCallback(async () => {
    if (!cancelRequestIdToConfirm) return;
    const ok = await runAction(() => cancelDocument(cancelRequestIdToConfirm), {
      successMessage: 'Request cancelled successfully.',
      errorMessage: 'Failed to cancel request.',
    });
    if (ok) setCancelRequestIdToConfirm(null);
  }, [cancelRequestIdToConfirm, runAction]);

  const cancelStudentCancelConfirm = useCallback(() => {
    setCancelRequestIdToConfirm(null);
  }, []);

  return {
    ...core,
    billableGroups,
    groupTotalFor,
    isCancellable,
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
    cancelRequestIdToConfirm,
    confirmStudentCancelRequest,
    cancelStudentCancelConfirm,
  };
}
