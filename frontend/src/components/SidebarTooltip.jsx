import { createPortal } from 'react-dom';

export default function SidebarTooltip({ id, label, tooltipRef, tooltipEvents }) {
  return createPortal(
    <div ref={tooltipRef} id={id} role="tooltip" {...tooltipEvents} className="trace-sidebar-tooltip">
      <span className="block rounded-xl border border-green-200 bg-white px-3 py-2 text-sm font-semibold leading-normal text-green-950 shadow-lg dark:border-green-800 dark:bg-gray-900 dark:text-green-100">{label}</span>
    </div>,
    document.body,
  );
}
