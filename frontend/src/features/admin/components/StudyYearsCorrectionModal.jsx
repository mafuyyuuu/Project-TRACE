import Button from '@/components/Button';
import ModalShell from '@/components/ModalShell';
import ConfirmDialog from '@/components/ConfirmDialog';
import ProfileYearField from '@/components/ProfileYearField';
import ReviewSummary from '@/components/ReviewSummary';
import useStudyYearsCorrection from '@/features/admin/useStudyYearsCorrection';

export default function StudyYearsCorrectionModal({ target, onClose, onSaved }) {
  const state = useStudyYearsCorrection(target, onSaved);
  const { draft, staged, saving, profile, error } = state;
  return <>
    <ModalShell open title="Correct Study Years" maxWidth="max-w-[535px]" onClose={() => { if (!saving) onClose(); }}
      busy={saving} closeOnEsc={!saving} closeOnBackdrop={!saving} showCloseButton={!saving}
      footer={<div className="trace-actions justify-end">
        <Button type="button" disabled={saving} onClick={onClose} className="trace-button trace-button-secondary">Cancel</Button>
        <Button type="submit" form="correct-study-years" disabled={state.loading || !profile || saving} className="trace-button trace-button-primary">Review Correction</Button>
      </div>}>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">{target.full_name}. The audit keeps previous and corrected years. Existing requests keep their original values.</p>
      {state.loading && <p role="status">Loading saved study years…</p>}
      {error && <p role="alert" className="trace-error mb-4">{error}</p>}
      {!profile && !state.loading && <Button type="button" onClick={state.retry} className="trace-button trace-button-secondary">Retry</Button>}
      {profile && <form id="correct-study-years" onSubmit={state.stage} className="space-y-4">
        <ReviewSummary entries={[['Saved Year Started', String(profile.year_started ?? 'Not entered')], ['Saved Year Graduated', String(profile.graduation_year ?? 'Not entered')]]} />
        <div className="trace-form-grid">
          <ProfileYearField field="year_started" value={draft.year_started} required={profile.user_type === 'alumni'} disabled={saving} onChange={value => state.setDraft({ ...draft, year_started: value })} />
          <ProfileYearField field="graduation_year" value={draft.graduation_year} required={profile.user_type === 'alumni'} disabled={saving} onChange={value => state.setDraft({ ...draft, graduation_year: value })} />
        </div>
        <label className="trace-label">Correction Reason
          <textarea className="trace-control mt-2" required maxLength={1000} disabled={saving} value={draft.reason} onChange={event => state.setDraft({ ...draft, reason: event.target.value })} />
        </label>
      </form>}
    </ModalShell>
    <ConfirmDialog open={!!staged} title="Confirm Study-Year Correction" presentation="review" loading={saving}
      message={['Save this correction and its audit record?', error ? <span role="alert">{error}</span> : null]}
      confirmLabel="Save Correction" onCancel={state.cancel} onConfirm={state.confirm}>
      {staged && <ReviewSummary entries={[['Year Started', staged.year_started], ['Year Graduated', staged.graduation_year], ['Reason', staged.reason]]} />}
    </ConfirmDialog>
  </>;
}
