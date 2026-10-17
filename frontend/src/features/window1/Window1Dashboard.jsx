import WindowOverview, { WindowDate } from './components/WindowOverview';
import WindowTracking from './components/WindowTracking';
import ReleaseDocumentModal from './components/ReleaseDocumentModal';
import Button from '@/components/Button';
import RequestMessagesPanel from '@/components/RequestMessagesPanel';
import FileUploadField from '@/components/FileUploadField';
import { useState } from 'react';
import HardwareScannerModal from '@/features/window1/components/HardwareScannerModal';
import IntakeReviewModal from '@/features/window1/components/IntakeReviewModal';
import ManualInputModal from '@/features/window1/components/ManualInputModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import ModalShell from '@/components/ModalShell';
import { todayLongDate } from '@/utils/formatters';
import useWindow1Dashboard from '@/features/window1/useWindow1Dashboard';
import DashboardAlerts from '@/components/DashboardAlerts';
import DashboardLoading from '@/components/DashboardLoading';
import StudentProfileModal from '@/components/StudentProfileModal';
import ReportsPanel from '@/features/admin/components/ReportsPanel';
import useElapsedClock from '@/hooks/useElapsedClock';

/**
 * Window 1 clerk: the counter at both ends of the pipeline.
 *
 * Two working queues — Intake at the front, Release at the back — plus a
 * Tracking Desk that shows every document in the system, because this is the
 * window a student walks up to and asks "where is mine?".
 */
export default function Window1Dashboard({ user, currentTab, setViewImageUrl }) {
  const now = useElapsedClock();
  const [queueTab, setQueueTab] = useState('intake');
  const [viewProfileId, setViewProfileId] = useState(null);

  const {
    loading,
    success,
    dismissNotification,
    error,
    documents, documentTotal,
    intakeQueue,
    releaseQueue,
    dashStats,
    actionLoading,
    selectedDoc,
    setSelectedDoc,
    intakeNotes,
    originalIssued, setOriginalIssued,
    setIntakeNotes,
    intakeFile,
    setIntakeFile,
    handleIntake,
    intakeActionToConfirm,
    confirmIntake,
    cancelIntake,
    submissionToConfirm,
    confirmWindow1Submission,
    cancelWindow1Submission,
    w1IntakePage,
    setW1IntakePage,
    scanDocType,
    documentTypes = [], documentTypesLoading,
    setScanDocType,
    activeModal,
    setActiveModal,
    scanFile,
    setScanFile,
    scanProgress,
    loadDashboardData,
    handleWindow1Release,
    releaseToConfirm,
    confirmWindow1Release,
    cancelWindow1ReleaseConfirm,
    simulateHardwareScan,
    handleWindow1ScanUpload,
    handleManualInputSubmit,
    handleFetchStudent,
    w1ReleasePage,
    setW1ReleasePage,
    w1ProgressPage,
    setW1ProgressPage,
    itemsPerPage,
    intakePagination, releasePagination, progressPagination, progressFilter, changeProgressFilter, progressDocuments,
  } = useWindow1Dashboard(user, currentTab, queueTab);

  const todayFormatted = todayLongDate();

  if (currentTab === 'messages') return <RequestMessagesPanel user={user} initialDocumentId={new URLSearchParams(window.location.search).get('document')} />;
  if (loading) return <DashboardLoading />;
  if (currentTab === 'reports') return <ReportsPanel user={user} currentTab={currentTab} />;

  return (
    <>
      <DashboardAlerts success={success} error={error} onDismiss={dismissNotification} dismissalKey={`${currentTab}:${queueTab}`} />
      <div className="trace-page trace-window-page">
        {(currentTab === 'dashboard' || currentTab === 'tracking-desk') && <header className={`trace-page-header ${currentTab === 'tracking-desk' ? 'trace-standard-heading' : ''}`}><div><h2 className="trace-page-title">{currentTab === 'dashboard' ? <>Welcome back, <span>Window 1 Clerk</span></> : 'Tracking Desk'}</h2>{currentTab === 'tracking-desk' && <p className="trace-page-description">Monitor request progress, current processing stages and completed documents.</p>}</div><WindowDate date={todayFormatted}/></header>}
        {currentTab === 'dashboard' && <WindowOverview stats={dashStats}
          intake={{documents:intakeQueue,pagination:intakePagination,page:intakePagination?.page || w1IntakePage,onPage:setW1IntakePage,pageSize:intakePagination?.pageSize || itemsPerPage}}
          release={{documents:releaseQueue,pagination:releasePagination,page:releasePagination?.page || w1ReleasePage,onPage:setW1ReleasePage,pageSize:releasePagination?.pageSize || itemsPerPage}}
          queueTab={queueTab} onQueueTab={setQueueTab} upload={{file:scanFile,onChange:simulateHardwareScan}} onManual={() => setActiveModal('manual-input')}
          onProfile={setViewProfileId} onIntake={doc => {setSelectedDoc(doc);setActiveModal('intake-review');}} onRelease={handleWindow1Release} onPreview={setViewImageUrl} now={now} busy={actionLoading}/>
        }
        {currentTab === 'tracking-desk' && <WindowTracking documents={documents} total={documentTotal} filtered={progressDocuments} filter={progressFilter} onFilter={changeProgressFilter}
          pagination={progressPagination} page={progressPagination?.page || w1ProgressPage} pageSize={progressPagination?.pageSize || itemsPerPage} onPage={setW1ProgressPage} onRefresh={loadDashboardData}/>
        }

        {/* 3.4. CAMERA SCANNING MODAL */}
        {activeModal === 'scanning' && (
          <ModalShell open onClose={() => setActiveModal(null)} title="Scan Document" footer={<div className="flex items-center justify-center gap-8 pt-2">
                <Button type="button" aria-label="Flash" className="trace-button-lift trace-action w-12 h-12 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-center enabled:hover:bg-gray-50 dark:enabled:hover:bg-gray-800 text-gray-500 dark:text-gray-400 shadow-sm">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </Button>
                <Button type="button" aria-label="Capture document"
                  onClick={() => {
                    setScanFile({ name: 'scan_doc_00129.jpg', size: 245800 });
                    setScanDocType('Transcript of Records');
                    setActiveModal('scan-confirm');
                  }}
                  className="trace-button-lift trace-action w-16 h-16 rounded-full bg-white dark:bg-gray-900 border-8 border-gray-200 dark:border-gray-700 flex items-center justify-center enabled:hover:border-gray-300 dark:enabled:hover:border-gray-700 transition-colors shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
                >
                  <div className="w-10 h-10 rounded-full bg-[#15803d] hover:bg-[#166534] transition-colors"></div>
                </Button>
                <div className="w-12 h-12"></div> {/* spacer */}
              </div>}>
              {/* Mock Camera Preview Box */}
              <div className="min-h-80 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden my-4 relative flex flex-col items-center justify-center shadow-inner">
                <span className="absolute top-4 px-4 py-1.5 bg-[#15803d]/90 text-white text-[10px] font-bold tracking-widest uppercase rounded-full shadow-sm animate-pulse">
                  Document Detected
                </span>

                <div className="w-48 h-64 border-2 border-dashed border-[#15803d] rounded-xl flex items-center justify-center bg-white/20 dark:bg-gray-900/20 select-none shadow-sm">
                  <svg className="w-10 h-10 text-gray-400 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                </div>

                <span className="absolute bottom-4 text-[10px] font-bold text-gray-400 dark:text-gray-400 tracking-wide uppercase">
                  Align document within frame
                </span>
              </div>

          </ModalShell>
        )}

        {/* 3.5. INTAKE SCAN CONFIRMATION MODAL */}
        {activeModal === 'scan-confirm' && scanFile && (
          <ModalShell open onClose={() => setActiveModal(null)} title="Confirm Information" footer={<div className="flex justify-end pt-2">
                <Button
                  onClick={() => {
                    handleWindow1ScanUpload(scanDocType);
                  }}
                  disabled={actionLoading || documentTypesLoading || !documentTypes.some(type => type.name === scanDocType)}
                  className="trace-button trace-button-primary w-full text-center"
                >
                  {actionLoading ? 'Uploading...' : 'Create Request'}
                </Button>
              </div>}>
              <div className="flex flex-col gap-2 my-4">
                <label className="trace-label">Document Type</label>
                <select 
                  value={scanDocType}
                  onChange={(e) => setScanDocType(e.target.value)}
                  className="trace-control cursor-pointer"
                >
                  <option value="">Choose a document type</option>
                  {documentTypes.map(type => <option key={type.id || type.name} value={type.name}>{type.name}</option>)}
                </select>
              </div>

              <FileUploadField label="Selected document" file={scanFile} onChange={setScanFile} disabled={actionLoading} />

          </ModalShell>
        )}
      </div>

      <HardwareScannerModal
        open={activeModal === 'hardware-scanner' && !!scanFile}
        scanFile={scanFile}
        scanProgress={scanProgress}
      />

      {activeModal === 'intake-review' && selectedDoc && (
        <IntakeReviewModal key={selectedDoc.id} user={user}
          documentTypes={documentTypes} documentTypesLoading={documentTypesLoading}
          selectedDoc={selectedDoc}
          setActiveModal={setActiveModal}
          setViewImageUrl={setViewImageUrl}
          handleIntake={handleIntake}
          actionLoading={actionLoading}
          intakeNotes={intakeNotes}
          originalIssued={originalIssued} setOriginalIssued={setOriginalIssued}
          setIntakeNotes={setIntakeNotes}
          intakeFile={intakeFile}
          setIntakeFile={setIntakeFile}
        />
      )}

      <ManualInputModal
        documentTypes={documentTypes} documentTypesLoading={documentTypesLoading}
        open={activeModal === 'manual-input'}
        onClose={() => setActiveModal(null)}
        handleManualInputSubmit={handleManualInputSubmit}
        handleFetchStudent={handleFetchStudent}
        actionLoading={actionLoading}
      />

      <ConfirmDialog open={!!submissionToConfirm} title="Confirm Request Submission"
        message={submissionToConfirm ? `File ${submissionToConfirm.documentType}${submissionToConfirm.studentName ? ` for ${submissionToConfirm.studentName}` : ' from this scan'}?` : ''}
        confirmLabel="Submit Request" loadingLabel="Submitting…" loading={actionLoading}
        onConfirm={confirmWindow1Submission} onCancel={cancelWindow1Submission} />

      <ReleaseDocumentModal document={releaseToConfirm} busy={actionLoading} onConfirm={confirmWindow1Release} onCancel={cancelWindow1ReleaseConfirm}/>

      <ConfirmDialog
        open={!!intakeActionToConfirm}
        title={intakeActionToConfirm === 'approve' ? 'Route to Secretary' : 'Return to Student'}
        message={
          selectedDoc
            ? intakeActionToConfirm === 'approve'
              ? `Route ${selectedDoc.document_type} to the College Secretary?${originalIssued ? ' This also records your confirmation that an original was previously issued, with your notes.' : ''}`
              : `Return ${selectedDoc.document_type} to the student with your notes?`
            : ''
        }
        variant="neutral"
        confirmLabel={intakeActionToConfirm === 'approve' ? 'Route to Secretary' : 'Return to Student'}
        loadingLabel={intakeActionToConfirm === 'approve' ? 'Routing…' : 'Saving…'}
        loading={actionLoading}
        onConfirm={confirmIntake}
        onCancel={cancelIntake}
      />
      <StudentProfileModal
        open={!!viewProfileId}
        onClose={() => setViewProfileId(null)}
        studentId={viewProfileId}
      />
    </>
  );
}
