import { getStageLabel } from '@/utils/documentStatus';

export default function RequestStaff({ document }) {
  return <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
    <p>Current desk: <strong>{getStageLabel(document.current_status)}</strong></p>
    <p>Assigned staff: <strong className="select-text break-words">{document.assigned_staff_name || 'Unassigned — current desk queue'}</strong>{document.assigned_staff_desk ? ` (${document.assigned_staff_desk})` : ''}</p>
    {document.routing_college_name && <p>Routing college: <span className="select-text break-words">{document.routing_college_name}</span></p>}
  </div>;
}
