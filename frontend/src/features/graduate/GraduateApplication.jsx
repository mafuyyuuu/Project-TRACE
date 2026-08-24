import useGraduateApplication from '@/features/graduate/useGraduateApplication';
import DashboardLoading from '@/components/DashboardLoading';
import DashboardAlerts from '@/components/DashboardAlerts';
import { todayLongDate } from '@/utils/formatters';

/** Colour per application status, matching the badges used elsewhere. */
const STATUS_STYLES = {
  submitted: 'bg-blue-50 text-blue-700 border-blue-100',
  under_review: 'bg-amber-50 text-amber-700 border-amber-100',
  approved: 'bg-emerald-50 text-[#15803d] border-emerald-100',
  rejected: 'bg-red-50 text-red-600 border-red-100',
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
      'w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#15803d]/20 focus:bg-white transition-all',
  };

  const options = Array.isArray(field.options)
    ? field.options
    : field.options
      ? JSON.parse(field.options)
      : [];

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={field.field_key} className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">
        {field.label} {field.is_required ? <span className="text-red-500">*</span> : null}
      </label>

      {field.field_type === 'textarea' ? (
        <textarea {...shared} rows={3} />
      ) : field.field_type === 'select' ? (
        <select {...shared} className={`${shared.className} cursor-pointer`}>
          <option value="">Select...</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : (
        <input
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

      {field.help_text && <p className="text-[10px] text-gray-400">{field.help_text}</p>}
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
    updateAnswer, handleSubmit,
  } = useGraduateApplication(user);

  if (loading) return <DashboardLoading />;

  return (
    <>
      <DashboardAlerts success={success} error={error} />

      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-display font-black text-gray-900 tracking-tight">
              Graduate <span className="text-[#15803d]">Application</span>
            </h2>
            <p className="text-xs text-gray-400 mt-1 font-semibold">
              Complete the Registrar&apos;s application form below.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-5 py-2.5 shadow-sm">
            <span className="text-xs font-semibold text-gray-500">Today:</span>
            <span className="text-xs font-bold text-gray-800">{todayLongDate()}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* The form itself */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Application Form</h3>
            <p className="text-xs text-gray-400 mb-6 pb-5 border-b border-gray-100">
              Fields marked <span className="text-red-500">*</span> are required.
            </p>

            {fields.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm font-bold text-gray-500">The application form is not available yet.</p>
                <p className="text-xs text-gray-400 mt-1">
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

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-8 py-3 bg-[#15803d] hover:bg-[#166534] disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-md transition-all uppercase tracking-wider"
                  >
                    {submitting ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Previous submissions */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 h-fit">
            <h3 className="text-sm font-bold text-gray-900 mb-4">My Applications</h3>

            {applications.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No applications submitted yet.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {applications.map((app) => (
                  <div key={app.id} className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-gray-800">Application #{app.id}</span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                          STATUS_STYLES[app.status] || 'bg-gray-50 text-gray-600 border-gray-200'
                        }`}
                      >
                        {STATUS_LABELS[app.status] || app.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 font-semibold">
                      Submitted {new Date(app.submitted_at).toLocaleDateString()}
                    </p>
                    {app.notes && <p className="text-[11px] text-gray-600 mt-2 leading-relaxed">{app.notes}</p>}
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
