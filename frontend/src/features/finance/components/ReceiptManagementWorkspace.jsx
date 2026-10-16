import Button from '@/components/Button';
import FinanceIcon, { FinanceHeaderIcon } from './FinanceIcon';
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
    <ModalShell open title="Receipt settings" subtitle="Manage the paper pack and issued official receipts." headerIcon={<FinanceHeaderIcon name="91f27" />} closeButtonIcon={<FinanceIcon name="04f2e" />} panelClassName="trace-modal-panel trace-secretary-dialog trace-finance-dialog max-w-[720px]" onClose={onClose} footer={<div className="trace-actions justify-end"><Button type="button" onClick={onClose} className="trace-button trace-button-secondary">Close</Button></div>}>
      <ReceiptTools pack={pack} onPreview={setPreview} onChanged={pack.refresh} />
    </ModalShell>
    {preview && pack.state && <ReceiptPreviewModal receipt={preview} config={pack.state.print_config} onClose={() => setPreview(null)} />}
  </>;
}
