import { useState, useRef, useCallback, useMemo } from 'react';
import useDashboardCore from '@/hooks/useDashboardCore';
import { uploadDocument, intakeDocument, releaseDocument } from '@/services/documentsService';
import { lookupStudent } from '@/services/authService';
import { STATUS } from '@/utils/documentStatus';

const ITEMS_PER_PAGE = 10;

/**
 * Window 1 clerk: the counter at both ends of the pipeline.
 *
 * Intake at the front — checking paperwork, scanning what a walk-in student
 * brought in, and routing to the College Secretary. Release at the back —
 * handing the finished document over against its Official Receipt.
 *
 * The queue itself is deliberately unfiltered by the backend: Window 1 is the
 * public counter, so its Tracking Desk has to be able to answer "where is my
 * document?" about anything in the system. The two working queues are carved
 * out of that list here.
 */
export default function useWindow1Dashboard(user) {
  const core = useDashboardCore(user);
  const { documents, runAction, triggerNotification, setActiveModal, selectedDoc } = core;

  const [scanDocType, setScanDocType] = useState('Transcript of Records');
  const [scanFile, setScanFile] = useState(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [intakeNotes, setIntakeNotes] = useState('');
  const [intakeFile, setIntakeFile] = useState(null);
  const fileInputRef = useRef(null);

  // Table pagination lives here rather than in the page component.
  const [w1IntakePage, setW1IntakePage] = useState(1);
  const [w1ReleasePage, setW1ReleasePage] = useState(1);
  const [w1ProgressPage, setW1ProgressPage] = useState(1);

  const intakeQueue = useMemo(
    () => documents.filter((d) => d.current_status === STATUS.PENDING_W1_INTAKE),
    [documents]
  );
  const releaseQueue = useMemo(
    () => documents.filter((d) => d.current_status === STATUS.READY_FOR_RELEASE),
    [documents]
  );

  /**
   * Clear a request through to the Secretary, or send it back to the student.
   *
   * A return does not move the document: intake is the first desk, so there is
   * no earlier queue to route it to. The note is the whole message, which is
   * why the backend refuses a return without one.
   *
   * @param {'approve'|'return'} action
   */
  const handleIntake = useCallback(
    async (action) => {
      if (!selectedDoc) return;
      if (action === 'return' && !intakeNotes.trim()) {
        triggerNotification('Say what the student needs to correct.', 'error');
        return;
      }

      const formData = new FormData();
      formData.append('action', action);
      formData.append('notes', intakeNotes);
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
        setIntakeFile(null);
      }
    },
    [selectedDoc, intakeNotes, intakeFile, runAction, setActiveModal, triggerNotification]
  );

  /**
   * Hand the physical document over and close the request.
   *
   * For a walk-in the student presents the Official Receipt Finance issued;
   * it is shown in the confirmation so the clerk checks it against the paper
   * in their hand rather than taking the system's word for it.
   */
  const handleWindow1Release = useCallback(
    async (doc) => {
      const or = doc.or_number ? `\n\nOfficial Receipt on file: ${doc.or_number}` : '';
      if (!window.confirm(`Release ${doc.document_type} to ${doc.student_name || doc.student_id}?${or}`)) return;
      await runAction(() => releaseDocument(doc.id), {
        successMessage: 'Document released.',
        errorMessage: 'Failed to release document.',
      });
    },
    [runAction]
  );

  /**
   * Stands in for a physical scanner: animates a capture, then opens the
   * confirmation step. No enterprise scanner SDK is involved.
   */
  const simulateHardwareScan = useCallback(
    (file) => {
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
          setTimeout(() => setActiveModal('scan-confirm'), 500);
        }
      }, 100);
    },
    [setActiveModal]
  );

  const handleWindow1ScanUpload = useCallback(
    async (docType) => {
      if (!scanFile) return;

      const formData = new FormData();
      formData.append('document', scanFile);
      formData.append('student_id', '');
      formData.append('student_name', '');
      formData.append('document_type', docType || '');

      const ok = await runAction(() => uploadDocument(formData), {
        successMessage: (r) => `Scan filed. Tracking: ${r.tracking_number}`,
        errorMessage: 'Scan upload failed.',
      });

      if (ok) {
        setScanFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [scanFile, runAction]
  );

  /**
   * File a walk-in request on behalf of a student standing at the counter.
   *
   * It enters the intake queue unpaid, exactly like an online submission —
   * the clerk who filed it still has to clear it through intake. Filing it as
   * already-handled would let a walk-in skip both its evaluation and its bill.
   */
  const handleManualInputSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const form = e.target;
      const studentId = form.studentId.value;

      const formData = new FormData();
      formData.append('student_id', studentId);
      formData.append('student_name', form.fullName.value);
      formData.append('document_type', form.docType.value);

      const ok = await runAction(() => uploadDocument(formData), {
        successMessage: (r) => `Walk-in request filed. Tracking: ${r.tracking_number}`,
        errorMessage: 'Walk-in intake failed.',
      });

      if (ok) form.reset();
    },
    [runAction]
  );

  /** Autofills the walk-in form from an existing student record. */
  const handleFetchStudent = useCallback(
    async (e) => {
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
    },
    [triggerNotification]
  );

  return {
    ...core,
    intakeQueue,
    releaseQueue,
    scanDocType, setScanDocType,
    scanFile, setScanFile,
    scanProgress,
    intakeNotes, setIntakeNotes,
    intakeFile, setIntakeFile,
    fileInputRef,
    w1IntakePage, setW1IntakePage,
    w1ReleasePage, setW1ReleasePage,
    w1ProgressPage, setW1ProgressPage,
    itemsPerPage: ITEMS_PER_PAGE,
    handleIntake,
    handleWindow1Release,
    simulateHardwareScan,
    handleWindow1ScanUpload,
    handleManualInputSubmit,
    handleFetchStudent,
  };
}
