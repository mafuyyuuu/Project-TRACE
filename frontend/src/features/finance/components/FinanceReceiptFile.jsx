import { useRef } from 'react';
import Button from '@/components/Button';
import FileUploadField from '@/components/FileUploadField';
import FinanceIcon from './FinanceIcon';

/** The shared picker validates files; this view keeps the source upload states. */
export default function FinanceReceiptFile({ file, onChange, disabled, label = 'Official Receipt scan' }) {
  const input = useRef(null);
  return <div className="space-y-2">
    <FileUploadField pickerOnly showDraftStatus={false} inputRef={input} label={label} file={file} onChange={onChange} disabled={disabled} accept="image/jpeg,image/png,application/pdf" maxBytes={5*1024*1024} />
    {file ? <div className="trace-finance-file-ready"><span className="trace-finance-file-icon"><FinanceIcon name="20959" /></span><div><strong className="font-mono break-all select-text">{file.name}</strong><p role="status"><FinanceIcon name="18446" />Ready to upload</p></div><Button type="button" aria-label="Remove selected receipt" disabled={disabled} onClick={()=>onChange(null)} className="trace-icon-button"><FinanceIcon name="c4f34" /></Button></div> : <div className="trace-finance-file-empty"><span className="trace-finance-file-icon"><FinanceIcon name="e5ed5" /></span><Button type="button" disabled={disabled} onClick={()=>input.current?.click()} className="trace-button trace-button-primary">Choose file</Button><p>No file chosen</p></div>}
    <p className="trace-admin-caption">JPEG, PNG or PDF · up to 5 MB. Uploads only after confirmation.</p>
  </div>;
}
