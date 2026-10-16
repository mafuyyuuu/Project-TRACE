import { useState } from 'react';
import Button from '@/components/Button';
import SecretaryIcon from './SecretaryIcon';

export default function SecretaryLinkedSummary({ ticket }) {
  const [notice, setNotice] = useState('');
  const copy = async () => {
    try { await navigator.clipboard.writeText(ticket.tracking_number); setNotice('Tracking number copied.'); }
    catch { setNotice('Copy unavailable. Select the tracking number to copy it.'); }
  };
  return <><dl className="trace-secretary-linked-summary">{[['Tracking number',ticket.tracking_number,'8f7ea'],['Document',ticket.document_type || 'Recorded request','c65aa'],['Student',ticket.student_name || 'Recorded student','06df7']].map(([label,value,icon],index)=><div key={label}><dt><span className="trace-secretary-linked-row-icon"><SecretaryIcon name={icon} /></span>{label}</dt><dd className={index===0?'pr-10 font-mono select-text':'select-text'}>{value}</dd>{index===0 && <Button type="button" aria-label="Copy tracking number" onClick={copy} className="trace-icon-button absolute right-4 top-5"><SecretaryIcon name="16664" /></Button>}</div>)}</dl>{notice && <p role="status" className="text-sm">{notice}</p>}</>;
}
