import { useState, useCallback, useMemo } from 'react';
import useDashboardCore from '@/hooks/useDashboardCore';
import { acceptForProcessing, priceDocument, confirmHandoff } from '@/services/documentsService';
import { STATUS } from '@/utils/documentStatus';

/**
 * College Secretary: the desk that does the actual work, in three passes.
 *
 * 1. **Initial Evaluation** — check the request against the student's records,
 *    take it on, and commit to a date the student can plan around.
 * 2. **Processing** — prepare and print, then price it from what printing it
 *    actually took. The request is billed once every document in it is priced.
 * 3. **Final Handoff** — once Finance confirms the money, physically pass the
 *    printed document to Window 1.
 *
 * Pricing lives here and payment does not: the Secretary sets the amount, and
 * only Finance can ever mark it paid. Keeping those apart is what makes the
 * money trail auditable.
 */
export default function useSecretaryDashboard(user) {
  const core = useDashboardCore(user);
  const { documents, runAction, selectedDoc, setActiveModal, triggerNotification } = core;

  const [clerkNotes, setClerkNotes] = useState('');

  // Editable copies of the AI-extracted fields, corrected before acceptance.
  const [evalStudentId, setEvalStudentId] = useState('');
  const [evalStudentName, setEvalStudentName] = useState('');
  const [evalDocType, setEvalDocType] = useState('Transcript of Records');
  const [estimatedReadyDate, setEstimatedReadyDate] = useState('');

  // Pricing inputs, filled in once the document is printed and countable.
  const [priceAmount, setPriceAmount] = useState('');
  const [pricePageCount, setPricePageCount] = useState('');
  const [priceNotes, setPriceNotes] = useState('');

  const evaluationQueue = useMemo(
    () => documents.filter((d) => d.current_status === STATUS.PENDING_SEC_EVALUATION),
    [documents]
  );
  const processingQueue = useMemo(
    () => documents.filter((d) => d.current_status === STATUS.SEC_PROCESSING),
    [documents]
  );
  const handoffQueue = useMemo(
    () => documents.filter((d) => d.current_status === STATUS.PAID_PENDING_SEC_RELEASE),
    [documents]
  );
  const clearedQueue = useMemo(
    () => documents.filter((d) =>
      [STATUS.READY_FOR_RELEASE, STATUS.COMPLETED].includes(d.current_status)),
    [documents]
  );

  /**
   * Take the request on, or send it back to Window 1.
   * @param {'approve'|'reject'} action
   */
  const handleSecretaryEvaluate = useCallback(
    async (action) => {
      if (!selectedDoc) return;
      if (action === 'approve' && !estimatedReadyDate) {
        triggerNotification('Give the student a date to expect it by.', 'error');
        return;
      }
      if (action === 'reject' && !clerkNotes.trim()) {
        triggerNotification('Say why the request is being returned.', 'error');
        return;
      }

      const ok = await runAction(
        () =>
          acceptForProcessing(selectedDoc.id, {
            student_id: evalStudentId,
            student_name: evalStudentName,
            document_type: evalDocType,
            estimated_ready_date: estimatedReadyDate,
            action,
            notes: clerkNotes,
          }),
        {
          successMessage:
            action === 'approve'
              ? 'Accepted for processing. The student has been told when to expect it.'
              : 'Returned to Window 1 with your notes.',
          errorMessage: 'Evaluation action failed.',
        }
      );

      if (ok) {
        setActiveModal(null);
        setClerkNotes('');
        setEstimatedReadyDate('');
      }
    },
    [
      selectedDoc, evalStudentId, evalStudentName, evalDocType, estimatedReadyDate,
      clerkNotes, runAction, setActiveModal, triggerNotification,
    ]
  );

  /**
   * Price the printed document.
   *
   * The response says whether this was the last one — only then is the student
   * billed, and only then is there a payment slip to print.
   */
  const handlePriceDocument = useCallback(async () => {
    if (!selectedDoc) return;

    const amount = parseFloat(priceAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      triggerNotification('Enter the amount to charge.', 'error');
      return;
    }

    let billedResult = null;
    const ok = await runAction(
      async () => {
        billedResult = await priceDocument(selectedDoc.id, {
          amount,
          page_count: pricePageCount ? parseInt(pricePageCount, 10) : null,
          pricing_notes: priceNotes,
        });
        return billedResult;
      },
      {
        successMessage: (r) => r.message,
        errorMessage: 'Could not price this document.',
      }
    );

    if (ok) {
      setPriceAmount('');
      setPricePageCount('');
      setPriceNotes('');
      // When the whole request just became payable, go straight to the slip the
      // student needs to carry to Finance. Otherwise close and pick up the next.
      setActiveModal(billedResult?.billed ? 'payment-stub' : null);
    }
  }, [selectedDoc, priceAmount, pricePageCount, priceNotes, runAction, setActiveModal, triggerNotification]);

  /** Confirm the printed document has physically reached Window 1. */
  const handleConfirmHandoff = useCallback(
    async (doc) => {
      if (!window.confirm(`Confirm you have handed ${doc.document_type} to Window 1?`)) return;
      await runAction(() => confirmHandoff(doc.id), {
        successMessage: 'Handoff recorded. Window 1 and the student have been notified.',
        errorMessage: 'Could not record the handoff.',
      });
    },
    [runAction]
  );

  return {
    ...core,
    evaluationQueue,
    processingQueue,
    handoffQueue,
    clearedQueue,
    clerkNotes, setClerkNotes,
    evalStudentId, setEvalStudentId,
    evalStudentName, setEvalStudentName,
    evalDocType, setEvalDocType,
    estimatedReadyDate, setEstimatedReadyDate,
    priceAmount, setPriceAmount,
    pricePageCount, setPricePageCount,
    priceNotes, setPriceNotes,
    handleSecretaryEvaluate,
    handlePriceDocument,
    handleConfirmHandoff,
  };
}
