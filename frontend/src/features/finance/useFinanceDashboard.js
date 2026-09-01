import { useState, useCallback, useMemo } from 'react';
import useDashboardCore from '@/hooks/useDashboardCore';
import { verifyPayment, logWalkInPayment, scanReceipt } from '@/services/documentsService';
import { STATUS } from '@/utils/documentStatus';

/**
 * Finance clerk: the desk money passes through, in two queues.
 *
 * **Awaiting Payment** is read-only. Finance can see what a student has been
 * billed for so it can answer someone who walks up holding a payment slip —
 * and so a counter payment can be logged against the right request.
 *
 * **Verification** is the actionable one, and it is the only place in the whole
 * system where a document becomes PAID. The College Secretary sets the price;
 * only this desk confirms the money arrived.
 */
export default function useFinanceDashboard(user) {
  const core = useDashboardCore(user);
  const { documents, runAction, selectedDoc, setActiveModal, triggerNotification } = core;

  const [clerkNotes, setClerkNotes] = useState('');

  // Walk-in logging: what the clerk reads off the Official Receipt.
  const [orNumber, setOrNumber] = useState('');
  const [orDate, setOrDate] = useState('');
  const [orFile, setOrFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanConfidence, setScanConfidence] = useState(null);

  const awaitingPaymentQueue = useMemo(
    () => documents.filter((d) => d.current_status === STATUS.PENDING_STUDENT_PAYMENT),
    [documents]
  );
  const verificationQueue = useMemo(
    () => documents.filter((d) => d.current_status === STATUS.PENDING_FINANCE_VERIFICATION),
    [documents]
  );

  /**
   * @param {'approve'|'reject'} action
   * @param {File} [file] optional official receipt to attach
   */
  const handleFinanceVerify = useCallback(
    async (action, file) => {
      if (!selectedDoc) return;

      const formData = new FormData();
      formData.append('action', action);
      formData.append('notes', clerkNotes);
      if (file) formData.append('officialReceipt', file);

      const ok = await runAction(() => verifyPayment(selectedDoc.id, formData), {
        successMessage: `Payment reference successfully ${action === 'approve' ? 'approved' : 'rejected'}.`,
        errorMessage: 'Verification action failed.',
      });

      if (ok) {
        setActiveModal(null);
        setClerkNotes('');
      }
    },
    [selectedDoc, clerkNotes, runAction, setActiveModal]
  );

  /**
   * Read an Official Receipt and pre-fill the form from it.
   *
   * Deliberately not wired to submit. The OCR is a transcription aid and its
   * output lands in editable fields the clerk still has to confirm — a misread
   * amount here would be a money error, so nothing is saved on the AI's word.
   *
   * Failure is not an error state: with the engine down the clerk simply types
   * the figures, because a student is standing at the counter either way.
   */
  const handleScanReceipt = useCallback(
    async (file) => {
      if (!file) return;
      setOrFile(file);
      setScanning(true);
      setScanConfidence(null);

      try {
        const formData = new FormData();
        formData.append('receipt', file);
        const result = await scanReceipt(formData);

        if (result.success) {
          const data = result.extracted_data || {};
          if (data.or_number) setOrNumber(data.or_number);
          if (data.or_date) setOrDate(data.or_date);
          setScanConfidence(data.confidence ?? null);
          triggerNotification(result.message);
        } else {
          triggerNotification(result.message, 'error');
        }
      } catch {
        triggerNotification('Could not read the receipt. Enter the details by hand.', 'error');
      } finally {
        setScanning(false);
      }
    },
    [triggerNotification]
  );

  /** Record a payment taken at the counter, against the whole request. */
  const handleLogWalkIn = useCallback(async () => {
    if (!selectedDoc) return;
    if (!orNumber.trim()) {
      triggerNotification('Enter the Official Receipt number.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('or_number', orNumber.trim());
    formData.append('or_date', orDate);
    formData.append('notes', clerkNotes);
    if (orFile) formData.append('officialReceipt', orFile);

    const ok = await runAction(() => logWalkInPayment(selectedDoc.id, formData), {
      successMessage: (r) =>
        `Counter payment logged for ${r.documents_covered} document${r.documents_covered > 1 ? 's' : ''}. Verify it to release.`,
      errorMessage: 'Could not log the counter payment.',
    });

    if (ok) {
      setActiveModal(null);
      setOrNumber('');
      setOrDate('');
      setOrFile(null);
      setClerkNotes('');
      setScanConfidence(null);
    }
  }, [selectedDoc, orNumber, orDate, orFile, clerkNotes, runAction, setActiveModal, triggerNotification]);

  return {
    ...core,
    awaitingPaymentQueue,
    verificationQueue,
    clerkNotes, setClerkNotes,
    orNumber, setOrNumber,
    orDate, setOrDate,
    orFile, setOrFile,
    scanning,
    scanConfidence,
    handleFinanceVerify,
    handleScanReceipt,
    handleLogWalkIn,
  };
}
