/** Command-center loader, with a compact variant for shared API activity. */
export default function DashboardLoading({ compact = false, label = 'Synchronizing Command Center...' }) {
  if (compact) return (
    <span role="status" className="inline-flex items-center gap-2 text-xs font-medium">
      <span aria-hidden="true" className="w-4 h-4 shrink-0 border-2 border-current border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
      <span>{label}</span>
    </span>
  );
  return (
    <div role="status" className="flex flex-col items-center justify-center min-h-[60vh] gap-4 trace-motion-feedback">
      <div aria-hidden="true" className="w-12 h-12 border-4 border-pine-500/20 border-t-pine-600 rounded-full animate-spin motion-reduce:animate-none"></div>
      <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">{label}</p>
    </div>
  );
}
