const fs = require('fs');
let file = 'frontend/src/features/finance/FinanceDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import DeferredOrUploadModal')) {
  content = content.replace(
    "import ConfirmDialog from '@/components/ConfirmDialog';",
    "import ConfirmDialog from '@/components/ConfirmDialog';\nimport DeferredOrUploadModal from './components/DeferredOrUploadModal';"
  );
  
  content = content.replace(
    "const confirmLogWalkIn = async () => {",
    `
  const handleDeferredUpload = async (doc, file) => {
    try {
      setActionLoading(true);
      await api.uploadDeferredOR(doc.id, file);
      await fetchDocuments();
      setActiveModal(null);
    } catch (err) {
      console.error(err);
      alert('Failed to upload OR');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmLogWalkIn = async () => {`
  );
  
  content = content.replace(
    "{/* 2.1 FINANCE VERIFICATION MODAL */}",
    "{activeModal === 'upload-or-later' && selectedDoc && <DeferredOrUploadModal selectedDoc={selectedDoc} setActiveModal={setActiveModal} handleDeferredUpload={handleDeferredUpload} actionLoading={actionLoading} />}\n        {/* 2.1 FINANCE VERIFICATION MODAL */}"
  );
  
  fs.writeFileSync(file, content);
}
