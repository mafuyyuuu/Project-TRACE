import { useState } from 'react';
import Button from '@/components/Button';
import ModalShell from '@/components/ModalShell';
import useAuthedFile, { toFilename } from '@/hooks/useAuthedFile';
import SecretaryIcon from './SecretaryIcon';

/** Preview and download only bytes obtained through the existing authorized file hook. */
export default function SecretaryRequirementPreview({ requirement }) {
  const file = useAuthedFile(requirement.file_path), [full, setFull] = useState(false);
  const name = toFilename(requirement.file_path);
  const preview = file.url && (name.toLowerCase().endsWith('.pdf') ? <iframe src={file.url} title={requirement.label} className="w-full h-full" /> : <img src={file.url} alt={requirement.label} className="max-w-full max-h-full object-contain" />);
  return <section className="trace-secretary-document-preview"><header><h4><SecretaryIcon name="dd248" />{requirement.label}</h4><div className="trace-actions"><Button type="button" disabled={!file.url} onClick={()=>setFull(true)} className="trace-button trace-button-secondary"><SecretaryIcon name="69076" />Open full size</Button>{file.url && <a href={file.url} download={name} className="trace-button trace-button-secondary"><SecretaryIcon name="8213c" />Download</a>}</div></header><div className="trace-secretary-document-stage">{file.loading ? <p role="status">Loading protected document…</p> : file.error ? <p role="alert">{file.error}</p> : preview || <p>No document uploaded.</p>}</div>
    <ModalShell open={full && Boolean(file.url)} onClose={()=>setFull(false)} title={requirement.label + ' preview'} maxWidth="max-w-5xl"><div className="flex h-[65dvh] items-center justify-center">{preview}</div></ModalShell>
  </section>;
}
