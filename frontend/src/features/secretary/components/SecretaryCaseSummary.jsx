import SecretaryIcon from './SecretaryIcon';
import { ticketInitials } from '@/utils/supportPresentation';
import { getStageLabel } from '@/utils/documentStatus';

export function SecretaryAvatar({ name }) {
  return <span aria-hidden="true" className="trace-secretary-avatar">{ticketInitials({ student_name: name })}</span>;
}

export default function SecretaryCaseSummary({ document, studentId = document.student_id, studentName = document.student_name, documentType = document.document_type, routing = false }) {
  return <section className="trace-secretary-case-summary" aria-label="Request details">
    <div className="trace-secretary-case-identity"><SecretaryAvatar name={studentName} /><div className="min-w-0 flex-1"><strong className="block break-words">{studentName || 'Unresolved student'}</strong><div className="trace-actions mt-1 text-xs"><span className="font-mono">{studentId || 'ID pending'}</span><span className="trace-secretary-document-chip">{documentType}</span></div></div><span className="trace-secretary-tracking-chip">#{document.tracking_number || document.id}</span></div>
    {routing && <dl className="trace-secretary-routing">{[
      ['Current desk', getStageLabel(document.current_status), 'c5ce2'],
      ['Assigned staff', document.assigned_staff_name || 'Unassigned — current desk queue', 'c027c'],
      ['Routing college', document.routing_college_name || 'College not recorded', '33ec6'],
    ].map(([label, value, icon]) => <div key={label}><SecretaryIcon name={icon} /><div><dt>{label}</dt><dd>{value}</dd></div></div>)}</dl>}
  </section>;
}
