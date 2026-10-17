import { useState, useCallback } from 'react';
import { intakeDocument } from '@/services/documentsService';

/** One intake draft/action owner for Window 1 and an Admin-delegated Secretary. */
export default function useIntakeReview({ selectedDoc, runAction, triggerNotification, setActiveModal }) {
  const [intakeNotes, setIntakeNotes] = useState('');
  const [originalChoice, setOriginalChoice] = useState(null);
  const originalIssued = originalChoice?.documentId === selectedDoc?.id && originalChoice?.value === true;
  const setOriginalIssued = useCallback(value => setOriginalChoice({ documentId: selectedDoc?.id, value }), [selectedDoc?.id]);
  const [intakeFile, setIntakeFile] = useState(null);
  const [intakeActionToConfirm, setIntakeActionToConfirm] = useState(null);
  const handleIntake = useCallback(
    (action) => {
      if (!selectedDoc) return;
      if (action === 'approve' && originalIssued && !intakeNotes.trim()) {
        triggerNotification('Record how you confirmed prior original issuance in Notes.', 'error');
        return;
      }
      if (action === 'return' && !intakeNotes.trim()) {
        triggerNotification('Say what the student needs to correct.', 'error');
        return;
      }
      setIntakeActionToConfirm(action);
    },
    [selectedDoc, intakeNotes, originalIssued, triggerNotification]
  );

  const confirmIntake = useCallback(async () => {
    if (!intakeActionToConfirm || !selectedDoc) return;
    const action = intakeActionToConfirm;

    const formData = new FormData();
    formData.append('action', action);
    formData.append('notes', intakeNotes);
    if (action === 'approve' && originalIssued) formData.append('original_issued', 'true');
    if (intakeFile) formData.append('document', intakeFile);

    const ok = await runAction(() => intakeDocument(selectedDoc.id, formData), {
      successMessage:
        action === 'approve'
          ? 'Intake cleared and routed to the College Secretary.'
          : 'Returned to the student with your notes.',
      errorMessage: 'Intake action failed.',
    });

    if (ok) {
      setActiveModal(null);
      setIntakeNotes('');
      setOriginalChoice(null);
      setIntakeFile(null);
      setIntakeActionToConfirm(null);
    }
  }, [intakeActionToConfirm, selectedDoc, intakeNotes, intakeFile, originalIssued, runAction, setActiveModal]);

  const cancelIntake = useCallback(() => {
    setIntakeActionToConfirm(null);
  }, []);

  return {intakeNotes,setIntakeNotes,originalIssued,setOriginalIssued,intakeFile,setIntakeFile,intakeActionToConfirm,handleIntake,confirmIntake,cancelIntake};
}
