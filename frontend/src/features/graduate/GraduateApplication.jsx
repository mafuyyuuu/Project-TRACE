import { INPUT_LIMITS } from '@/utils/inputLimits';
import ConfirmDialog from '@/components/ConfirmDialog';
import useGraduateApplication from '@/features/graduate/useGraduateApplication';
import DashboardLoading from '@/components/DashboardLoading';
import DashboardAlerts from '@/components/DashboardAlerts';
import { todayLongDate } from '@/utils/formatters';

/** Colour per application status, matching the badges used elsewhere. */
const STATUS_STYLES = {
  submitted: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-800',
  under_review: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-800',
  approved: 'bg-emerald-50 dark:bg-emerald-950/40 text-[#15803d] dark:text-green-300 border-emerald-100 dark:border-emerald-800',
  rejected: 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 border-red-100 dark:border-red-800',
};

const STATUS_LABELS = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

/**
 * Renders one admin-defined field. The form has no hardcoded questions — the
 * Registrar can add, remove or reorder fields from the Maintenance module and
 * this component adapts.
 */
function DynamicField({ field, value, onChange }) {
  const shared = {
    id: field.field_key,
    value: value ?? '',
    onChange: (e) => onChange(field.field_key, e.target.value),
    required: Boolean(field.is_required),
    placeholder: field.placeholder || '',
    className:
      'trace-control',
  };

  const options = Array.isArray(field.options)
    ? field.options
    : field.options
      ? JSON.parse(field.options)
      : [];

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={field.field_key} className="trace-label">
        {field.label} {field.is_required ? <span className="text-red-500 dark:text-red-300">*</span> : null}
      </label>

      {field.field_type === 'textarea' ? (
        <textarea maxLength={INPUT_LIMITS.notes} {...shared} rows={3} />
      ) : field.field_type === 'select' ? (
        <select {...shared} className={`${shared.className} cursor-pointer`}>
          <option value="">Select...</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : (
        <input maxLength={['number', 'date'].includes(field.field_type) ? undefined : field.field_type === 'email' ? INPUT_LIMITS.email : field.field_type === 'tel' ? INPUT_LIMITS.phone : INPUT_LIMITS.shortText}
          {...shared}
          type={
            field.field_type === 'number' ? 'number'
              : field.field_type === 'date' ? 'date'
              : field.field_type === 'email' ? 'email'
              : field.field_type === 'tel' ? 'tel'
              : 'text'
          }
        />
      )}

      {field.help_text && <p className="text-[10px] text-gray-400 dark:text-gray-400">{field.help_text}</p>}
    </div>
  );
}

/**
 * Graduate application portal: submit the Registrar's application form and
 * track previous submissions.
 */
export default function GraduateApplication({ user }) {
  const {
    fields, answers, applications, loading, submitting, error, success,
    updateAnswer, handleSubmit, dismissNotification,
    answersToConfirm, confirmSubmission, cancelSubmission,
  } = useGraduateApplication(user);

  if (loading) return <DashboardLoading />;

  return (
    <>
      <ConfirmDialog open={!!answersToConfirm} title="Confirm Graduate Application"
        message="Submit this graduate application for review?" confirmLabel="Confirm Submission"
        loading={submitting} loadingLabel="Submitting…" onConfirm={confirmSubmission} onCancel={cancelSubmission} />
      <DashboardAlerts success={success} error={error} onDismiss={dismissNotification} />

      <div className="trace-page animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="trace-page-title">
              Graduate <span className="text-[#15803d] dark:text-green-300">Application</span>
            </h2>
            <p className="trace-page-description">
              Complete the Registrar&apos;s application form below.
            </p>
          </div>
          <div className="trace-date">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Today:</span>
            <span className="text-xs font-bold text-gray-800 dark:text-gray-100">{todayLongDate()}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* The form itself */}
          <div className="trace-section trace-section-body lg:col-span-2">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Application Form</h3>
            <p className="text-xs text-gray-400 dark:text-gray-400 mb-6 pb-5 border-b border-gray-100 dark:border-gray-700">
              Fields marked <span className="text-red-500 dark:text-red-300">*</span> are required.
            </p>

            {fields.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">The application form is not available yet.</p>
                <p className="text-xs text-gray-400 dark:text-gray-400 mt-1">
                  The Registrar has not published the questions. Please check back later.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {fields.map((field) => (
                  <DynamicField
                    key={field.field_key}
                    field={field}
                    value={answers[field.field_key]}
                    onChange={updateAnswer}
                  />
                ))}

                <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="trace-button trace-button-primary w-full sm:w-auto sm:px-8"
                  >
                    {submitting ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Previous submissions */}
          <div className="trace-section trace-section-body h-fit">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4">My Applications</h3>

            {applications.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-400 py-6 text-center">No applications submitted yet.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {applications.map((app) => (
                  <div key={app.id} className="border border-gray-100 dark:border-gray-700 rounded-2xl p-4 bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-100">Application #{app.id}</span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                          STATUS_STYLES[app.status] || 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        {STATUS_LABELS[app.status] || app.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 dark:text-gray-400 mt-2 font-semibold">
                      Submitted {new Date(app.submitted_at).toLocaleDateString()}
                    </p>
                    {app.notes && <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-2 leading-relaxed select-text">{app.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
