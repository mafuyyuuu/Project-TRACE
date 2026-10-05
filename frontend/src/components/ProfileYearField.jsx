import { PROFILE_YEAR_FIELDS, manilaYear, yearError } from '@/utils/profileYears';

export default function ProfileYearField({ field, value = '', required = false, missing = false, onChange, disabled = false }) {
  const definition = PROFILE_YEAR_FIELDS[field];
  const problem = yearError(value, { ...definition, required });
  const id = `profile-${field}`;
  const warning = problem || (missing ? `${definition.label} is required.` : '');
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="trace-label block mb-2">
        {definition.label}{required && <> <span className="text-red-500 dark:text-red-300">*</span></>}
      </label>
      <input id={id} type="text" inputMode="numeric" pattern="[1-9][0-9]{3}" placeholder={field === 'last_attendance_year' ? 'Last Attendance Year' : 'Year Graduated'}
        value={value} onChange={event => onChange(event.target.value)} required={required} disabled={disabled}
        aria-invalid={Boolean(problem)} aria-describedby={`${id}-hint${warning ? ` ${id}-needed` : ''}`}
        className="trace-control w-full" />
      <p id={`${id}-hint`} className="mt-1 text-xs text-gray-600 dark:text-gray-300">
        {definition.minimum === 2002 ? `2002–${manilaYear()}.` : `Four digits, no later than ${manilaYear()}.`}
        {!required && ' Optional.'}
      </p>
      {warning && <p id={`${id}-needed`} className="mt-1 text-xs text-amber-800 dark:text-amber-200">{warning}</p>}
    </div>
  );
}
