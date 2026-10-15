import FilterSelect from '@/components/FilterSelect';
import { useState } from 'react';
import Button from '@/components/Button';
import AdminIcon from './AdminIcon';
import { getStatusLabel, getStatusTone } from '@/utils/documentStatus';

const PAGE_SIZE = 8;
const cellClass = 'px-4 py-4 align-top whitespace-normal [overflow-wrap:anywhere]';
function eventGroup(value) {
  const event = String(value || '').toUpperCase();
  return event.includes('LOGIN') && event.includes('FAILED') ? 'failed' : event.includes('LOGOUT') ? 'logout' : event.includes('LOGIN') ? 'login' : 'other';
}

function Timestamp({ value }) {
  const date = new Date(value);
  if (!value || !Number.isFinite(date.getTime())) return '—';
  const options = { timeZone: 'Asia/Manila' };
  return <><span className="block font-medium text-gray-900 dark:text-gray-100">{date.toLocaleDateString('en-PH', { ...options, month: 'short', day: 'numeric', year: 'numeric' })}</span>
    <span className="mt-0.5 block text-xs">{date.toLocaleTimeString('en-PH', { ...options, hour: 'numeric', minute: '2-digit', second: '2-digit' })}</span></>;
}
function eventLabel(value) {
  return ({ LOGIN_SUCCESS: 'Login', LOGIN_FAILED: 'Failed login', LOGOUT: 'Logout' })[value] || value || 'Unknown';
}

/** Figma audit toolbar and table; filters operate on the records already loaded. */
export default function AdminAuditLog({ logs, security = false, loading = false, error = '' }) {
  const [query, setQuery] = useState('');
  const [days, setDays] = useState('all');
  const [role, setRole] = useState('all');
  const [event, setEvent] = useState('all');
  const [page, setPage] = useState(0);
  const [snapshotTime] = useState(Date.now);
  const change = (setter, value) => { setter(value); setPage(0); };
  const cutoff = days === 'all' ? null : snapshotTime - Number(days) * 86400000;
  const matching = logs.filter(log => {
    const date = new Date(security ? log.created_at : log.timestamp_started).getTime();
    const searchable = security ? [log.full_name, log.student_id, log.ip_address, log.event_type] : [log.document_type, log.tracking_number, log.step_name, log.user_name, log.status];
    return searchable.join(' ').toLowerCase().includes(query.trim().toLowerCase()) && (cutoff === null || date >= cutoff)
      && (!security || role === 'all' || log.role === role) && (!security || event === 'all' || eventGroup(log.event_type) === event);
  });
  const lastPage = Math.max(0, Math.ceil(matching.length / PAGE_SIZE) - 1);
  const currentPage = Math.min(page, lastPage);
  const visible = matching.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const title = security ? 'Global Security Audit Log' : 'System-Wide Audit Log';
  const columns = security ? ['Timestamp', 'Event', 'User', 'Role', 'IP Address'] : ['Timestamp', 'Document', 'Action', 'User', 'Status'];
  return <section className="trace-section trace-admin-audit overflow-hidden">
    <div className={'trace-section-header' + (security ? ' trace-admin-filter-toolbar' : '')}><div><h3 className="trace-section-title">{title}</h3><p className="trace-admin-caption">Most recent events first · Filters cover loaded records.</p></div>
      <div className="trace-actions">
        <label className="trace-admin-search"><span className="sr-only">{security ? 'Search security logs' : 'Search activity logs'}</span><AdminIcon name="search" /><input type="search" maxLength={255} value={query} onChange={e => change(setQuery, e.target.value)} placeholder={security ? 'Search user, ID or IP address' : 'Search document, user or ID'} /></label>
        <label className="inline-flex min-w-0"><span className="sr-only">Log date range</span><FilterSelect value={days} onChange={e => change(setDays, e.target.value)} className="trace-control"><option value="all">All loaded history</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="1">Last 24 hours</option></FilterSelect></label>
        {security && <FilterSelect aria-label="Log role" value={role} onChange={e => change(setRole, e.target.value)} className="trace-control"><option value="all">All roles</option>{[...new Set(logs.map(log => log.role).filter(Boolean))].map(value => <option key={value} value={value}>{value}</option>)}</FilterSelect>}
      </div>
    </div>
    {security && <div className="px-6 pb-4"><FilterSelect aria-label="Security event filters" value={event} onChange={e => change(setEvent, e.target.value)}>{[['all', 'All events'], ['login', 'Logins'], ['failed', 'Failed logins'], ['logout', 'Logouts']].map(([key, label]) => <option key={key} value={key}>{label}</option>)}</FilterSelect></div>}

    {error && <p role="alert" className="trace-inline-error px-6 pb-4">{error}</p>}
    <div role="region" aria-label={security ? 'Security log table' : 'Activity log table'} tabIndex={0} className="trace-table-scroll max-h-[60vh]">
      <table aria-label={security ? 'Global security audit log' : 'System-wide audit log'} className={`trace-data-table ${security ? 'min-w-[60rem]' : 'min-w-[65rem]'}`}>
        <colgroup>{(security ? ['w-[20%]', 'w-[26%]', 'w-[24%]', 'w-[12%]', 'w-[18%]'] : ['w-[17%]', 'w-[25%]', 'w-[20%]', 'w-[20%]', 'w-[18%]']).map((width, index) => <col key={index} className={width} />)}</colgroup>
        <thead className="sticky top-0 z-10"><tr>{columns.map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
        <tbody>{loading ? <tr><td colSpan={5} className="py-8 text-center">Loading...</td></tr> : !visible.length ? <tr><td colSpan={5} className="py-8 text-center text-gray-500 dark:text-gray-400">{error ? 'Security activity is unavailable.' : security ? 'No security logs found' : 'No activity logs found'}</td></tr> : visible.map((log, index) => {
          const group = eventGroup(log.event_type);
          return <tr key={log.id ?? `${currentPage}-${index}`}>
            <td className={`${cellClass} text-gray-500 dark:text-gray-400`}><Timestamp value={security ? log.created_at : log.timestamp_started} /></td>
            <td className={cellClass}>{security ? <span title={log.event_type} className={`trace-admin-badge trace-admin-event-badge ${group === 'login' ? 'trace-admin-badge-green' : group === 'failed' ? 'trace-admin-badge-red' : 'trace-admin-badge-neutral'}`}>{group !== 'other' && <AdminIcon name={group === 'login' ? 'login-event' : group === 'failed' ? 'alert-event' : 'logout-event'} />}{eventLabel(log.event_type)}</span> : <><span className="block font-semibold">{log.document_type || 'Unknown'}</span><span className="mt-1 block font-mono text-xs text-gray-500 dark:text-gray-400">#{log.tracking_number || 'N/A'}</span></>}</td>
            <td className={cellClass}>{security ? <><span className="block font-semibold">{log.full_name}</span><span className="block select-text text-xs text-gray-500 dark:text-gray-400">{log.student_id}</span></> : log.step_name ? log.step_name.replace(/_/g, ' ') : 'System Action'}</td>
            <td className={cellClass}>{security ? <span className="trace-admin-badge trace-admin-badge-green trace-admin-role-badge">{log.role}</span> : log.user_name || 'System'}</td>
            <td className={cellClass}>{security ? <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{log.ip_address || 'Unknown'}</span> : <span className={`inline-flex max-w-full rounded-full px-3 py-1 text-xs font-bold whitespace-normal break-words ${getStatusTone(log.status)}`}>{getStatusLabel(log.status)}</span>}</td>
          </tr>;
        })}</tbody>
      </table>
    </div>
    <footer className="trace-admin-directory-footer border-t border-gray-100 dark:border-gray-700"><p className="trace-admin-caption">{matching.length ? `Showing ${currentPage * PAGE_SIZE + 1}–${Math.min((currentPage + 1) * PAGE_SIZE, matching.length)} of ${matching.length} loaded ${security ? 'events' : 'entries'}` : 'No matching loaded records'}</p><div className="trace-actions"><Button type="button" className="trace-button trace-button-secondary" disabled={loading || currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</Button><Button type="button" className="trace-button trace-button-secondary" disabled={loading || currentPage >= lastPage} onClick={() => setPage(currentPage + 1)}>Next</Button></div></footer>
  </section>;
}
