/** Dynamic submitted values occupy the Figma confirmation's review surface. */
export default function ReviewSummary({ entries }) {
  return <dl className="mt-4 space-y-3 rounded-lg bg-gray-100 p-4 sm:p-6 dark:bg-gray-800">
    {entries.map(([label, value]) => <div key={label} className="grid min-w-0 gap-1 sm:grid-cols-2 sm:gap-4">
      <dt className="text-xs font-semibold text-gray-600 dark:text-gray-300">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-trace-ink dark:text-gray-100 select-text sm:text-right">{value || 'Not provided'}</dd>
    </div>)}
  </dl>;
}
