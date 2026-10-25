import { useState } from 'react';
import Button from '@/components/Button';
import PaginatedTable from '@/components/PaginatedTable';
import QueuePanel from '@/components/QueuePanel';
import QueueTabs from '@/components/QueueTabs';
import RequestStaff from '@/components/RequestStaff';
import FinanceIcon from './FinanceIcon';
import { SecretaryAvatar } from '@/features/secretary/components/SecretaryCaseSummary';
import { todayLongDate } from '@/utils/formatters';
import { formatPeso } from '@/utils/pricing';

export default function FinanceQueueOverview({ awaiting, verification, active, onQueue, onProfile, onSlip, onLog, onReview, onSettings, history, busy }) {
  const [query, setQuery] = useState('');
  const verifying = active === 'verification';
  const source = verifying ? verification : awaiting;
  const rows = source.filter(row => [row.tracking_number,row.student_name,row.student_id].some(value => String(value || '').toLowerCase().includes(query.trim().toLowerCase())));
  const payments = new Set(awaiting.map(row => row.request_group_id || row.id)).size;
  const outstanding = awaiting.reduce((sum,row) => sum + (Number(row.amount) || 0),0);
  const cards = [
    ['AWAITING PAYMENT',payments,'payments','Students paying at the counter','a68d0','67de8'],
    ['OUTSTANDING AMOUNT',formatPeso(outstanding),'to collect',`Across ${payments} awaiting payments`,'4324d','874a5'],
    ['VERIFICATION QUEUE',new Set(verification.map(row => row.request_group_id || row.id)).size,'to review','Payments waiting for review','6bbf4','55a47'],
  ];
  return <>
    <header className="trace-page-header trace-finance-greeting"><h2 className="trace-page-title trace-dashboard-greeting">Finance Office <span>Command Center</span></h2><div className="trace-date"><strong>Today:</strong><span>{todayLongDate()}</span><FinanceIcon name="45f7e" /></div></header>
    <section aria-label="Finance summary" className="trace-secretary-kpis">{cards.map(([title,value,unit,helper,icon,dot],index)=><article className="trace-secretary-kpi" key={title}><div><h3>{title}</h3><p className="trace-secretary-kpi-value">{value} <span>{unit}</span></p><span className="trace-secretary-kpi-icon"><FinanceIcon name={icon} /></span></div><p className={'trace-secretary-kpi-helper'+(index===2?' trace-secretary-kpi-helper-primary':'')}><FinanceIcon name={dot} />{helper}</p></article>)}</section>
    <QueueTabs idPrefix="finance-queue" tabs={[{key:'awaiting-payment',label:'Awaiting Payment',count:awaiting.length},{key:'verification',label:'Verification Queue',count:verification.length},{key:'official-receipts',label:'Payment History'}]} activeKey={active} onChange={value=>{setQuery('');onQueue(value);}} />
    <QueuePanel idPrefix="finance-queue" activeKey={active}>{active==='official-receipts' ? history : <section className="trace-section trace-finance-queue" aria-label={verifying ? 'Verification queue' : 'Awaiting payment queue'}>
      <header className="trace-finance-queue-heading"><div><h3>{verifying ? 'Verification Queue' : 'Awaiting Payment'}</h3><p>{verifying ? 'Review the payment proof students submitted online before confirming.' : 'Billed by the College Secretary. Log a payment here when the student pays at the counter.'}</p></div><span className="trace-finance-count">{verifying ? 'Pending request' : 'Awaiting'}: {source.length}</span><label className="trace-finance-search"><FinanceIcon name="7e094" /><input aria-label="Search tracking ID or student" type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search tracking ID or student" /></label>{verifying && <Button type="button" onClick={onSettings} className="trace-button trace-button-secondary"><FinanceIcon name="d3fdf" />Receipt settings</Button>}</header>
      <PaginatedTable label={verifying ? 'pending verifications' : 'awaiting payments'} resetKey={active+query} aria-label={verifying ? 'Verification documents' : 'Awaiting payment documents'} className="trace-finance-queue-table"><thead><tr>{['Tracking ID','Student','Document','Amount',...(verifying?['Paid via']:[]),'Action'].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.id}><td className="font-mono">#{row.tracking_number || row.id}</td><td><div className="trace-secretary-student-cell"><SecretaryAvatar name={row.student_name} /><div className="min-w-0"><Button type="button" disabled={!row.student_id} onClick={()=>onProfile(row.student_id)} className="trace-action text-left">{row.student_name || 'Unresolved student'}</Button><span className="block font-mono text-[.75rem]">{row.student_id || 'ID pending'}</span></div></div></td><td><strong>{row.document_type}</strong><span className="trace-finance-stage"><FinanceIcon name="6c111" />{verifying ? 'Finance Verification' : 'Awaiting Student Payment'}</span><RequestStaff assignmentOnly document={row} /></td><td className="font-mono font-semibold">{formatPeso(row.amount)}</td>{verifying && <td><span className="trace-finance-channel"><FinanceIcon name="b1b5c" />{row.payment_channel==='walk_in'?'Counter':'Online'}</span>{row.payment_channel==='walk_in' && row.or_number && <span className="block font-mono mt-1">{row.or_number}</span>}</td>}<td><div className="trace-actions justify-end"><Button type="button" onClick={()=>onSlip(row)} className="trace-button trace-button-secondary"><FinanceIcon name="39af8" />View Slip</Button><Button type="button" disabled={busy} onClick={()=>verifying?onReview(row):onLog(row)} className="trace-button trace-button-primary"><FinanceIcon name={verifying?'4b224':'e5229'} />{verifying?'Review':'Log Counter Payment'}</Button></div></td></tr>)}{!rows.length && <tr><td colSpan={verifying?6:5} className="text-center py-12">{query?'No payments match this search.':verifying?'No pending receipts to verify. Queue is clean!':'Nothing waiting to be paid.'}</td></tr>}</tbody></PaginatedTable>
    </section>}</QueuePanel>
  </>;
}
