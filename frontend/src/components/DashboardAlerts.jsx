import { createPortal } from 'react-dom';

/**
 * Transient success/error toasts, pinned bottom-right.
 *
 * Rendered by each command center rather than the page, because the feedback
 * state now lives in that role's own hook.
 *
 * Portaled to document.body and layered above every modal (z-[100]) — a
 * toast fired while a modal is open (e.g. a failed Window 1 "Return to
 * Student") must stay visible, not render invisibly behind it.
 */
export default function DashboardAlerts({ success, error }) {
  if (!success && !error) return null;

  return createPortal(
    <div className="fixed bottom-6 right-6 z-[110] flex flex-col gap-3 items-end">
      {success && (
        <div className="bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 border border-gray-700 animate-slide-up">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg></div>
          <span className="font-semibold text-sm">{success}</span>
        </div>
      )}
      {error && (
        <div className="bg-red-900 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 border border-red-700 animate-slide-up">
          <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg></div>
          <span className="font-semibold text-sm">{error}</span>
        </div>
      )}
    </div>,
    document.body
  );
}
