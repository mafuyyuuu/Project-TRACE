import { getStageLabel } from '@/utils/documentStatus';

export default function RequestStaff({ document, compact = false }) {
  if (compact) return <div className="space-y-1 text-[0.625rem] font-medium text-trace-ink dark:text-gray-300">
    <p className="flex items-start gap-1"><img alt="" aria-hidden="true" src="/admin-figma/desk.svg" width="12" height="12" className="mt-0.5 shrink-0" /><span><span className="sr-only">Current desk: </span>{getStageLabel(document.current_status)}</span></p>
    <p className="flex items-start gap-1"><img alt="" aria-hidden="true" src="/admin-figma/person.svg" width="12" height="12" className="mt-0.5 shrink-0" /><span className="select-text break-words"><span className="sr-only">Assigned staff: </span>{document.assigned_staff_name || 'Unassigned (current desk queue)'}{document.assigned_staff_desk ? ` (${document.assigned_staff_desk})` : ''}</span></p>
    {document.routing_college_name && <p className="select-text break-words">Routing college: {document.routing_college_name}</p>}
  </div>;
  return <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
    <p>Current desk: <strong>{getStageLabel(document.current_status)}</strong></p>
    <p>Assigned staff: <strong className="select-text break-words">{document.assigned_staff_name || 'Unassigned — current desk queue'}</strong>{document.assigned_staff_desk ? ` (${document.assigned_staff_desk})` : ''}</p>
    {document.routing_college_name && <p>Routing college: <span className="select-text break-words">{document.routing_college_name}</span></p>}
  </div>;
}
