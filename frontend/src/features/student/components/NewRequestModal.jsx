import { useState } from 'react';
import StudentIcon from './StudentIcon';
import { RequestSteps, StudentRequestReview } from './StudentRequestConfirmation';
import NumberInput from '@/components/NumberInput';
import Button from '@/components/Button';
import { yearError } from '@/utils/profileYears';
import { INPUT_LIMITS } from '@/utils/inputLimits';
import { isHonorableDismissal, needsStudyYears, needsGraduationYear, needsRequestingSchool } from '@/utils/documentPolicy';
import FileUploadField from '@/components/FileUploadField';
import ModalShell from '@/components/ModalShell';
import { formatPeso } from '@/utils/pricing';

/**
 * Multi-document request form.
 *
 * A student ticks any number of document types; the whole
 * selection once. Each ticked type expands to its own fields (copies,
 * study years, attachment), because fees and requirements differ per type.
 *
 * The list, fees and attachment rules all come from `document_types`, so the
 * Registrar can add or reprice a document without a code change.
 */
export default function NewRequestModal({
  user,
  setActiveModal,
  documentTypes,
  documentTypesLoading,
  selections,
  toggleDocumentType,
  updateSelection,
  handleStudentSubmitRequest,
  actionLoading,
  requestToConfirm,
  confirmStudentSubmission,
  cancelStudentSubmission,
}) {
  const [query, setQuery] = useState('');
  const [editingStep, setEditingStep] = useState(1);
  const [samePurpose,setSamePurpose] = useState(false);
  const step = requestToConfirm ? 3 : editingStep;
  const close = () => { if (!actionLoading) { cancelStudentSubmission?.(); setActiveModal(null); } };
  const edit = () => { cancelStudentSubmission?.(); setEditingStep(2); };
  const selectedNames = Object.keys(selections);
  const availableTypes = documentTypes.filter(t => !t.is_walk_in && ((t.available_to || 'both') === 'both' || t.available_to === (user.user_type || 'student')));

  const missingYears = selectedNames.some(name => (needsStudyYears(name) && yearError(String(user.year_started ?? ''), { label: 'Year Started', minimum: 1999, required: true }))
    || (needsGraduationYear(name, user) && yearError(String((user.graduation_year) ?? ''), { label: 'Year Graduated', minimum: 1999, required: true })));
  const completeStudyYears = () => {
    setActiveModal(null);
    window.dispatchEvent(new CustomEvent('open-profile-settings', { detail: { section: 'educational' } }));
  };

  return (
    <ModalShell
      open
      onClose={close}
      busy={actionLoading} closeOnEsc={!actionLoading} closeOnBackdrop={!actionLoading}
      title="New Request"
      maxWidth={step === 1 ? 'max-w-[611px]' : 'max-w-[860px]'}
      panelClassName={`trace-modal-panel trace-student-new-request-dialog trace-request-wizard ${step === 1 ? 'max-w-[611px]' : 'max-w-[860px]'}`}
      bodyClassName="trace-modal-body trace-request-wizard-body"
      headerIcon={<span className="trace-student-modal-heading-icon"><StudentIcon name="fplus-ef562" /></span>}
      subtitle="Select one or more documents. Nothing is paid now — the College Secretary sets the amount once your documents are printed."
      closeButtonIcon={<StudentIcon name="x-e5af3" />}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="mr-auto text-sm"><strong>{selectedNames.length} document{selectedNames.length === 1 ? '' : 's'} selected</strong><p className="trace-page-description">Final amount is set after printing.</p></div>
          {step > 1 && <Button type="button" disabled={actionLoading} onClick={step === 3 ? edit : () => setEditingStep(1)} className="trace-action flex items-center gap-2 text-sm font-semibold"><StudentIcon name="back-5e52e" />{step === 3 ? 'Edit details' : 'Back'}</Button>}
          <Button
            type="button" disabled={actionLoading}
            onClick={close}
            className="trace-button trace-button-secondary"
          >
            Cancel
          </Button>
          <Button
            type={step === 3 ? "button" : "submit"}
            form="new-request-form"
            onClick={step === 3 ? confirmStudentSubmission : undefined}
            disabled={actionLoading || documentTypesLoading || missingYears || selectedNames.length === 0 || selectedNames.some(name => !availableTypes.some(type => type.name === name && !type.unavailable_reason))}
            className="trace-button trace-button-primary"
          >
            {actionLoading ? 'Submitting...' : step === 3 ? 'Confirm Request' : 'Next'}<StudentIcon name="next-dd3ed" />
          </Button>
        </div>
      }
    >
      <RequestSteps step={step} />

      <form id="new-request-form" onSubmit={event => { if (step === 1) { event.preventDefault(); if(samePurpose) for(const name of selectedNames) updateSelection(name,{purpose:selections[selectedNames[0]]?.purpose || ''}); setEditingStep(2); } else handleStudentSubmitRequest(event); }} className="space-y-6 trace-student-request-form">
          {step === 1 && <>
          <div className="flex flex-col gap-2">
            <label className="trace-label">
              Select your request/s <span className="text-red-600">*</span> <span className="trace-student-selected-count">{selectedNames.length} selected</span>
            </label>

            <label className="trace-student-search self-end"><StudentIcon name="search-2552c" /><span className="sr-only">Search documents</span><input type="search" maxLength={255} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search documents" /></label>
            {query && <p className="text-xs text-gray-500 dark:text-gray-400">Selected documents stay visible while you search.</p>}
            {documentTypesLoading ? (
              <div className="py-8 flex justify-center">
                <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-700 border-t-[#15803d] rounded-full animate-spin" />
              </div>
            ) : availableTypes.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-400 py-4">No document types are available right now.</p>
            ) : (
              <div className="trace-student-document-choices">
                {availableTypes.filter(type => selections[type.name] || [type.name, type.catalog_description].join(' ').toLowerCase().includes(query.trim().toLowerCase())).map((type) => {
                  const selection = selections[type.name];
                  const anotherDismissal = isHonorableDismissal(type.name) && selectedNames.some(name => name !== type.name && isHonorableDismissal(name));
                  const unavailable = type.unavailable_reason || (anotherDismissal ? 'Choose only one Honorable Dismissal set.' : null);
                  const isSelected = Boolean(selection);

                  return (
                    <div
                      key={type.name}
                      data-card-disabled={Boolean(unavailable) || undefined}
                      className={`trace-student-document-choice trace-card-controls trace-card-inset rounded-lg border transition-colors ${
                        isSelected ? 'border-[#15803d] bg-emerald-50/40 dark:bg-emerald-950/40' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
                      }`}
                    >
                      <label className={`flex flex-wrap items-start gap-3 p-4 ${unavailable ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                          type="checkbox"
                          disabled={Boolean(unavailable)}
                          checked={isSelected}
                          onChange={() => toggleDocumentType(type.name)}
                          className="trace-choice w-4 h-4 accent-[#15803d] enabled:cursor-pointer disabled:cursor-not-allowed"
                        />
                        <span className="min-w-0 flex-1 basis-40 text-sm font-semibold text-gray-800 dark:text-gray-100">
                          {type.name}
                          {type.name === 'Diploma' && <span className="ml-1 text-[10px] text-gray-500 dark:text-gray-400 font-normal italic">(Reissue Fee)</span>}
                        </span>
                        <span className="w-full sm:w-auto min-w-0 text-sm font-semibold text-[#15803d] dark:text-green-300">
                          {type.fee_pending ? '' : <>{type.base_label && `${type.base_label}: `}{formatPeso(type.base_fee)}</>}
                          <span className="text-[9px] text-gray-400 dark:text-gray-400 font-semibold">{type.fee_pending ? '' : ['per_semester_block', 'per_page'].includes(type.fee_rule) ? ' per printed page' : ' per copy'}</span>
                        </span>
                      </label>
                      {type.catalog_description && <p className="px-4 pb-2 text-xs text-gray-600 dark:text-gray-300">{type.catalog_description}</p>}
                      {(type.fee_items || []).map(item => <p key={item.label} className="px-4 pb-2 text-xs text-gray-600 dark:text-gray-300">{item.label}: {formatPeso(item.amount)}{item.fee_rule === 'per_page' ? ' per printed page per copy' : ' per request'}</p>)}
                      {unavailable && <p className="px-4 pb-3 text-xs text-amber-800 dark:text-amber-300">{unavailable}</p>}


                    </div>
                  );
                })}
              </div>
            )}
          </div>

          </>}
          {step === 2 && <>
          <div className="trace-student-request-identity"><span className="trace-student-initials" aria-hidden="true">{(user.full_name || 'S').split(/\s+/).map(name => name[0]).slice(0, 2).join('')}</span><div><span>Student</span><strong>{user.full_name}</strong></div><div className="ml-auto"><span>Student ID</span><strong className="font-mono">{user.student_id}</strong></div><small className="flex items-center gap-1.5"><StudentIcon name="lock-5a599" />From your account</small></div>

          <label className="trace-request-shared-purpose"><input type="checkbox" className="trace-choice" checked={samePurpose} disabled={actionLoading} onChange={event => { setSamePurpose(event.target.checked); if(event.target.checked) for(const name of selectedNames) updateSelection(name,{purpose:selections[selectedNames[0]]?.purpose || ''}); }} /><span><strong>Use the same purpose for all documents</strong><small>When enabled, editing a purpose updates every selected document.</small></span></label>
          {availableTypes.some(type => selections[type.name]) && <section aria-label="Selected document details" className="space-y-4">
            <h3 className="trace-section-title">Selected document details</h3>
            {availableTypes.filter(type => selections[type.name]).map(type => {
              const selection = selections[type.name];
              const yearId = `request-start-${type.id ?? type.name.replace(/[^a-z0-9]+/gi, '-')}`;
              return <section key={type.name} aria-labelledby={yearId+'-heading'} className="trace-student-document-details">
                <h4 id={yearId+'-heading'} className="trace-section-title">{type.name}</h4>
                <div className="space-y-3">
                  <label className="trace-label flex flex-col gap-1.5">
                    Copies
                    <NumberInput type="number" min="1" max={isHonorableDismissal(type.name) ? 1 : 2147483647} step="1" required
                      value={selection.copies} onChange={e => updateSelection(type.name, { copies: e.target.value })}
                      className="trace-control w-full" />
                  </label>
                  {needsStudyYears(type.name) && <div>
                    <label htmlFor={yearId} className="trace-label">Year Started</label>
                    <input id={yearId} type="text" readOnly value={user.year_started ?? ''}
                      aria-describedby={`${yearId}-hint`} className="trace-control mt-1.5" />
                    <p id={`${yearId}-hint`} className="mt-1 text-xs text-gray-600 dark:text-gray-300">Saved in your profile. Ask Admin if a correction is needed.</p>
                  </div>}


                  {needsRequestingSchool(type.name) && (
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor={`${yearId}-school`} className="trace-label">
                        Requesting School / Company
                      </label>
                      <input id={`${yearId}-school`} maxLength={INPUT_LIMITS.name}
                        type="text" required
                        value={selection.requestingSchool}
                        onChange={(e) => updateSelection(type.name, { requestingSchool: e.target.value })}
                        placeholder="e.g. Mapua University"
                        className="trace-control w-full"
                      />
                    </div>
                  )}

                  {needsGraduationYear(type.name, user) && <label className="trace-label">
                    {'Year Graduated'}
                    <input type="text" readOnly value={(user.graduation_year) ?? ''} className="trace-control mt-1.5" />
                  </label>}


                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor={`${yearId}-purpose`} className="trace-label">Purpose</label>
                      <input id={`${yearId}-purpose`} maxLength={INPUT_LIMITS.shortText}
                        type="text" required
                        value={selection.purpose}
                        onChange={(e) => { for (const name of samePurpose ? selectedNames : [type.name]) updateSelection(name, {purpose:e.target.value}); }}
                        placeholder="e.g. Employment"
                        className="trace-control w-full"
                      />
                    </div>
                  </div>

                  {type.requires_attachment ? (
                    <div className="flex flex-col gap-1.5">
                      <p className="trace-label">
                        {type.attachment_label || 'Supporting Attachment'}
                        <span className="font-normal normal-case text-gray-400 dark:text-gray-400 ml-1">
                          · upload now, or bring it to Window 1
                        </span>
                      </p>
                      <FileUploadField showLabel={false} label={type.attachment_label || 'Supporting Attachment'} file={selection.file} onChange={file => updateSelection(type.name, { file })} />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <label className="trace-label">
                        Required Attachment: <span className="text-gray-500 dark:text-gray-400 font-normal">None</span>
                      </label>
                    </div>
                  )}

                </div>
              </section>;
            })}
          </section>}

          </>}
          {step === 3 && <><h3 className="trace-section-title mb-3">Confirm Document Request</h3><StudentRequestReview request={requestToConfirm} /></>}
          {missingYears && <div className="trace-error space-y-2" role="alert">
            <p>Complete the required saved year in Edit Profile before submitting. Saved years require Admin correction.</p>
            <Button type="button" onClick={completeStudyYears} className="trace-button trace-button-secondary">Complete Study Years</Button>
          </div>}
          {step === 1 && <p className="trace-student-information"><StudentIcon name="info-24570" /><span>
            Rates are for your information. After printing, the Secretary confirms the final charge.
            The full pricing breakdown and request total will appear on your dashboard before payment.</span>
          </p>}
      </form>
    </ModalShell>
  );
}
