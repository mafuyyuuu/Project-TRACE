/** Full-height spinner shown while a command center loads its first payload. */
export default function DashboardLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-12 h-12 border-4 border-pine-500/20 border-t-pine-600 rounded-full animate-spin"></div>
      <p className="text-gray-500 font-medium text-sm">Synchronizing Command Center...</p>
    </div>
  );
}
