import { useState } from 'react';
import ModalShell from '@/components/ModalShell';
import useReceiptPack from '@/hooks/useReceiptPack';
import ReceiptTools from './ReceiptTools';
import ReceiptPreviewModal from './ReceiptPreviewModal';

/** Keep pack audits and printer settings in the verification workflow. */
export default function ReceiptManagementWorkspace({ onClose }) {
  const pack = useReceiptPack();
  const [preview, setPreview] = useState(null);
  return <>
    <ModalShell open title="Receipt settings" maxWidth="max-w-3xl" onClose={onClose}>
      <ReceiptTools pack={pack} onPreview={setPreview} onChanged={pack.refresh} />
    </ModalShell>
    {preview && pack.state && <ReceiptPreviewModal receipt={preview} config={pack.state.print_config} onClose={() => setPreview(null)} />}
  </>;
}
