import { useState, useCallback } from 'react';
import useDashboardCore from '@/hooks/useDashboardCore';
import { verifyPayment } from '@/services/documentsService';

/**
 * Finance clerk: reviews uploaded GCash receipts and approves or rejects them.
 * This is the only desk that can mark a document PAID.
 */
export default function useFinanceDashboard(user) {
  const core = useDashboardCore(user);
  const { runAction, selectedDoc, setActiveModal } = core;

  const [clerkNotes, setClerkNotes] = useState('');

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

  return { ...core, clerkNotes, setClerkNotes, handleFinanceVerify };
}
