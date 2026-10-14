import { useId, useRef, useState } from 'react';
import RequestStaff from '@/components/RequestStaff';
import Button from '@/components/Button';
import { INPUT_LIMITS } from '@/utils/inputLimits';
import RequestMessagesPanel from '@/components/RequestMessagesPanel';
import ModalShell from '@/components/ModalShell';
import AuthedFilePreview from '@/components/AuthedFilePreview';

function DetailPanel({ selectedDoc, evalStudentId, evalStudentName, evalDocType }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 mb-6 font-mono text-[11px] text-gray-600 dark:text-gray-300 space-y-2">
      <RequestStaff document={selectedDoc} />
      <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><span>Tracking ID</span><span className="font-bold text-gray-950 dark:text-gray-100 select-text">#{selectedDoc.tracking_number || selectedDoc.id}</span></div>
      <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><span>Student ID</span><span className="font-bold text-gray-950 dark:text-gray-100">{evalStudentId || 'N/A'}</span></div>
      <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><span>Student Name</span><span className="font-bold text-gray-950 dark:text-gray-100">{evalStudentName || 'Unknown'}</span></div>
      <div className="flex justify-between border-t border-gray-200/50 dark:border-gray-700/50 pt-2"><span>Document Type</span><span className="font-bold text-gray-950 dark:text-gray-100">{evalDocType}</span></div>
    </div>
  );
}

function EvaluationForm({
  selectedDoc,
  evalStudentId,
  setEvalStudentId,
  evalStudentName,
  setEvalStudentName,
  evalDocType,
  setEvalDocType,
  estimatedReadyDate,
  setEstimatedReadyDate,
  clerkNotes,
  documentTypes = [],
  documentTypesError,
  setClerkNotes,
}) {
  const fieldId = useId();
  return (
    <div className="space-y-6 flex-1">
      {/* Confidence Score Panel */}
      {selectedDoc.file_path && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800 p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-950/40 text-[#15803d] dark:text-green-300 rounded-xl flex items-center justify-center font-bold">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest block">CONFIDENCE SCORE</span>
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-400 block mt-0.5">Extraction successful. Please verify</span>
            </div>
          </div>
          <span className="text-2xl font-black text-[#15803d] dark:text-green-300 font-mono">{selectedDoc.ocr_confidence_score !== null && selectedDoc.ocr_confidence_score !== undefined && selectedDoc.ocr_confidence_score !== '' ? `${parseFloat(selectedDoc.ocr_confidence_score).toFixed(1)}%` : 'Unavailable'}</span>
        </div>
      )}

      {!selectedDoc.file_path && selectedDoc.purpose && (
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800 p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 rounded-xl flex items-center justify-center font-bold">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest block">STUDENT PURPOSE</span>
              <div className="text-xs font-bold text-gray-800 dark:text-gray-100 block mt-0.5 space-y-1">
                {(() => {
                  try {
                    const parsed = JSON.parse(selectedDoc.purpose);
                    return Object.entries(parsed)
                      .filter(([, value]) => value !== '' && value !== null && value !== undefined)
                      .map(([key, value]) => (
                        <div key={key} className="flex gap-2">
                          <span className="text-gray-500 dark:text-gray-400 capitalize">{key.replace('_', ' ')}:</span>
                          <span>{value}</span>
                        </div>
                      ));
                  } catch {
                    return selectedDoc.purpose ? <span>{selectedDoc.purpose}</span> : null;
                  }
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="trace-form-grid">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${fieldId}-id`} className="trace-label">Student ID</label>
            <input maxLength={INPUT_LIMITS.id}
              id={`${fieldId}-id`} type="text"
              value={evalStudentId}
              onChange={(e) => setEvalStudentId(e.target.value)}
              className="trace-control w-full"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${fieldId}-type`} className="trace-label">Document Type</label>
            <select id={`${fieldId}-type`}
              value={evalDocType}
              onChange={(e) => setEvalDocType(e.target.value)}
              className="trace-control w-full cursor-pointer"
            >
              {!documentTypes.some(type => type.name === evalDocType) && <option value={evalDocType}>{evalDocType}</option>}
              {documentTypes.map(type => <option key={type.id || type.name} value={type.name}>{type.name}</option>)}
            </select>
            {documentTypesError && <p role="alert" className="trace-inline-error">{documentTypesError}</p>}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${fieldId}-name`} className="trace-label">Student Name</label>
          <input maxLength={INPUT_LIMITS.name}
            id={`${fieldId}-name`} type="text"
            value={evalStudentName}
            onChange={(e) => setEvalStudentName(e.target.value)}
            className="trace-control w-full"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${fieldId}-ready`} className="trace-label">
            Ready By <span className="text-red-600 dark:text-red-300">*</span>
          </label>
          <input
            id={`${fieldId}-ready`} type="date"
            value={estimatedReadyDate || ''}
            onChange={(e) => setEstimatedReadyDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="trace-control w-full"
          />
          {/* The student is told this date, and the office is measured
              against it — so it is required to accept the work. */}
          <span className="text-[10px] text-gray-400 dark:text-gray-400 font-medium">
            Sent to the student. They are told the amount separately, once it is printed and priced.
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${fieldId}-notes`} className="trace-label">Secretary Notes</label>
          <textarea id={`${fieldId}-notes`} maxLength={INPUT_LIMITS.notes}
            value={clerkNotes}
            onChange={(e) => setClerkNotes(e.target.value)}
            placeholder="Add any remarks...."
            className="trace-control w-full h-24 resize-none"
          />
        </div>


      </div>
    </div>
  );
}


function EvaluationActions({ handleSecretaryEvaluate, actionLoading }) {
  return (
    <div className="trace-form-grid">
      <Button
        onClick={() => handleSecretaryEvaluate('reject')}
        disabled={actionLoading}
        className="trace-button trace-button-danger w-full text-center"
      >
        Return to Window 1
      </Button>
      <Button
        onClick={() => handleSecretaryEvaluate('approve')}
        disabled={actionLoading}
        className="trace-button trace-button-primary w-full text-center"
      >
        Accept for Processing
      </Button>
    </div>
  );
}

function DigitalEvaluation({ user,formProps,handleSecretaryEvaluate,actionLoading,onClose }) {
  const [discussionOpen,setDiscussionOpen] = useState(false);
  const toggle = useRef(null), discussionId = useId();
  return <ModalShell open onClose={() => {if(!actionLoading) onClose();}} busy={actionLoading} title="Digital Request Evaluation" panelClassName="trace-modal-panel max-w-6xl h-[85dvh]" bodyClassName="min-h-0 flex-1 overflow-hidden p-4 sm:p-6" footer={<EvaluationActions handleSecretaryEvaluate={handleSecretaryEvaluate} actionLoading={actionLoading} />}>
    <div className="flex h-full min-h-0 flex-col gap-3">
      <Button ref={toggle} type="button" aria-expanded={discussionOpen} aria-controls={discussionId} onClick={()=>{setDiscussionOpen(value=>!value);toggle.current?.focus({preventScroll:true});}} className="trace-button trace-button-secondary shrink-0 lg:hidden">{discussionOpen ? 'Back to evaluation' : 'Open discussion'}</Button>
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section aria-label="Evaluation fields" className={`min-h-0 overflow-y-auto overscroll-contain pr-1 ${discussionOpen ? 'hidden lg:block' : ''}`}>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">Evaluate and process the student's digital request. Discussion stays separate from these fields.</p>
          <DetailPanel {...formProps} /><EvaluationForm {...formProps} />
        </section>
        <section id={discussionId} aria-label="Request discussion" className={`min-h-0 min-w-0 flex-col gap-3 rounded-2xl border border-gray-200 p-3 dark:border-gray-700 ${discussionOpen ? 'flex' : 'hidden lg:flex'}`}>
          <h4 className="shrink-0 text-sm font-bold">Discussion · {formProps.selectedDoc.tracking_number || formProps.selectedDoc.id}</h4>
          <div className="min-h-0 flex-1"><RequestMessagesPanel initialDocumentId={formProps.selectedDoc.id} user={user} compact autoFocusConversation={false} /></div>
        </section>
      </div>
    </div>
  </ModalShell>;
}

export default function SecretaryEvaluationModal({
  user,
  setActiveModal,
  selectedDoc,
  evalStudentId,
  setEvalStudentId,
  evalStudentName,
  setEvalStudentName,
  evalDocType,
  setEvalDocType,
  clerkNotes,
  setClerkNotes,
  handleSecretaryEvaluate,
  actionLoading,
  setViewImageUrl,
  estimatedReadyDate,
  setEstimatedReadyDate,
  documentTypes = [],
  documentTypesError,
}) {
  if (!selectedDoc) return null;

  const formProps = {
    selectedDoc, evalStudentId, setEvalStudentId, evalStudentName, setEvalStudentName,
    evalDocType, setEvalDocType, estimatedReadyDate, setEstimatedReadyDate, clerkNotes, setClerkNotes, documentTypes, documentTypesError,
  };

  // UI-only split: parent-owned evaluation drafts survive discussion changes.
  if (!selectedDoc.file_path) {
    return <DigitalEvaluation user={user} formProps={formProps} handleSecretaryEvaluate={handleSecretaryEvaluate} actionLoading={actionLoading} onClose={()=>setActiveModal(null)} />;
  }

  // Scanned documents get a split-screen: a preview column and a form column,
  // each independently scrolling — `bare` skips ModalShell's own single-body
  // slot so the two columns can manage their own scroll/pinned-footer regions.
  return (
    <ModalShell
      open={!!selectedDoc}
      onClose={() => setActiveModal(null)}
      bare
      title="AI Data Extraction Review"
      panelClassName="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-7xl h-[85vh] z-10 border border-gray-100 dark:border-gray-700 relative flex flex-col lg:flex-row overflow-hidden"
      closeButtonClassName="trace-button-lift absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 z-20"
    >
      {/* Left: Original document scan preview */}
      <div className="lg:w-1/2 p-6 flex flex-col border-r border-gray-200 dark:border-gray-700 min-h-0 bg-gray-50/30 dark:bg-gray-800/30">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-black text-gray-800 dark:text-gray-100">Original Scan</span>
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1 font-semibold shadow-sm shrink-0">
            {selectedDoc.original_filename || 'scan_00129.jpg'}
          </span>
        </div>
        <div className="flex-1 bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-2xl overflow-hidden relative flex items-center justify-center shadow-inner">
          <AuthedFilePreview
            path={selectedDoc.file_path}
            alt="Scanned Document"
            iframeTitle="PDF Preview"
            className="w-full h-full object-contain"
            onClick={() => setViewImageUrl(selectedDoc.file_path)}
            wrapperClassName="cursor-zoom-in w-full h-full flex items-center justify-center group relative"
          />
        </div>
      </div>

      {/* Right: Secretary data form editor — its own scroll body + pinned footer,
          since two independently-scrolling columns can't share one shell body. */}
      <div className="lg:w-1/2 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          <h3 className="text-xl font-black text-gray-900 dark:text-gray-100">AI Data Extraction Review</h3>
          <p className="text-xs text-gray-400 dark:text-gray-400 mt-1 font-semibold pb-5 mb-6 border-b border-gray-100 dark:border-gray-700">
            Verify EasyOCR extraction against the original document.
          </p>
          <DetailPanel selectedDoc={selectedDoc} evalStudentId={evalStudentId} evalStudentName={evalStudentName} evalDocType={evalDocType} />
          <EvaluationForm {...formProps} />
          <section aria-label="Scanned request discussion" className="mt-6 h-[70dvh] min-h-96"><RequestMessagesPanel initialDocumentId={selectedDoc.id} user={user} compact autoFocusConversation={false} /></section>
        </div>
        <div className="shrink-0 px-6 sm:px-8 py-6 border-t border-gray-100 dark:border-gray-700">
          <EvaluationActions handleSecretaryEvaluate={handleSecretaryEvaluate} actionLoading={actionLoading} />
        </div>
      </div>
    </ModalShell>
  );
}
