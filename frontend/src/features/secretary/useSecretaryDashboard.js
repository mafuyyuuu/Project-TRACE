import { useState, useCallback } from 'react';
import useDashboardCore from '@/hooks/useDashboardCore';
import { evaluateDocument } from '@/services/documentsService';

/**
 * College secretary: verifies the OCR-extracted fields against the scan, then
 * routes the document to Window 1 or returns it to the student.
 */
export default function useSecretaryDashboard(user) {
  const core = useDashboardCore(user);
  const { runAction, selectedDoc, setActiveModal } = core;

  const [clerkNotes, setClerkNotes] = useState('');

  // Editable copies of the AI-extracted fields, corrected before approval.
  const [evalStudentId, setEvalStudentId] = useState('');
  const [evalStudentName, setEvalStudentName] = useState('');
  const [evalDocType, setEvalDocType] = useState('Transcript of Records');

  /** @param {'approve'|'reject'} action */
  const handleSecretaryEvaluate = useCallback(
    async (action) => {
      if (!selectedDoc) return;

      const ok = await runAction(
        () =>
          evaluateDocument(selectedDoc.id, {
            student_id: evalStudentId,
            student_name: evalStudentName,
            document_type: evalDocType,
            action,
            notes: clerkNotes,
          }),
        {
          successMessage: `Document successfully evaluated and ${
            action === 'approve' ? 'routed to Window 1' : 'returned'
          }.`,
          errorMessage: 'Evaluation action failed.',
        }
      );

      if (ok) {
        setActiveModal(null);
        setClerkNotes('');
      }
    },
    [selectedDoc, evalStudentId, evalStudentName, evalDocType, clerkNotes, runAction, setActiveModal]
  );

  return {
    ...core,
    clerkNotes, setClerkNotes,
    evalStudentId, setEvalStudentId,
    evalStudentName, setEvalStudentName,
    evalDocType, setEvalDocType,
    handleSecretaryEvaluate,
  };
}
