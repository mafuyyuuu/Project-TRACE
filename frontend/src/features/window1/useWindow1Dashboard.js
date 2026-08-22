import { useState, useRef, useCallback } from 'react';
import useDashboardCore from '@/hooks/useDashboardCore';
import { uploadDocument, releaseDocument } from '@/services/documentsService';
import { lookupStudent } from '@/services/authService';

const ITEMS_PER_PAGE = 10;

/**
 * Window 1 clerk: AI intake of physical documents, manual digitisation of
 * legacy records, and final release to the student.
 */
export default function useWindow1Dashboard(user) {
  const core = useDashboardCore(user);
  const { runAction, triggerNotification, setActiveModal } = core;

  const [scanDocType, setScanDocType] = useState('Transcript of Records');
  const [scanFile, setScanFile] = useState(null);
  const [scanProgress, setScanProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Table pagination lives here rather than in the page component.
  const [w1ReleasePage, setW1ReleasePage] = useState(1);
  const [w1ProgressPage, setW1ProgressPage] = useState(1);

  const handleWindow1Release = useCallback(
    async (id) => {
      if (!window.confirm('Confirm document release to student?')) return;
      await runAction(() => releaseDocument(id), {
        successMessage: 'Document successfully released.',
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
        successMessage: (r) => `Intake scan complete! Routed to Secretary queue. Tracking: ${r.tracking_number}`,
        errorMessage: 'Scan upload failed.',
      });

      if (ok) {
        setScanFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [scanFile, runAction]
  );

  /** Digitises a legacy paper record; enters the pipeline already PAID. */
  const handleManualInputSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const form = e.target;
      const studentId = form.studentId.value;

      const placeholder = new Blob(['manual legacy record content'], { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('document', placeholder, `${studentId}_manual_intake.pdf`);
      formData.append('student_id', studentId);
      formData.append('student_name', form.fullName.value);
      formData.append('document_type', form.docType.value);

      const ok = await runAction(() => uploadDocument(formData), {
        successMessage: (r) => `Legacy record digitized! Routed to Secretary queue. Tracking: ${r.tracking_number}`,
        errorMessage: 'Manual intake failed.',
      });

      if (ok) form.reset();
    },
    [runAction]
  );

  /** Autofills the manual-intake form from an existing student record. */
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
    scanDocType, setScanDocType,
    scanFile, setScanFile,
    scanProgress,
    fileInputRef,
    w1ReleasePage, setW1ReleasePage,
    w1ProgressPage, setW1ProgressPage,
    itemsPerPage: ITEMS_PER_PAGE,
    handleWindow1Release,
    simulateHardwareScan,
    handleWindow1ScanUpload,
    handleManualInputSubmit,
    handleFetchStudent,
  };
}
