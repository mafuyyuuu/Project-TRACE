import ModalShell from '@/components/ModalShell';
import AuthedFilePreview from '@/components/AuthedFilePreview';

export default function ImageViewerModal({ viewImageUrl, setViewImageUrl }) {
  if (!viewImageUrl) return null;

  const isPdf = String(viewImageUrl).toLowerCase().endsWith('.pdf');

  return (
    <ModalShell
      open={!!viewImageUrl}
      onClose={() => setViewImageUrl(null)}
      bare
      backdropClassName="absolute inset-0 bg-gray-900/90 backdrop-blur-sm transition-opacity duration-200"
      panelClassName="relative z-10 max-w-5xl w-full flex items-center justify-center animate-fade-in"
      closeButtonClassName="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors z-10 backdrop-blur-md"
    >
      <AuthedFilePreview
        path={viewImageUrl}
        alt="Full Screen Viewer"
        iframeTitle="PDF Viewer"
        className={
          isPdf
            ? 'w-full h-[calc(100dvh-2rem)] max-h-[90vh] rounded-xl shadow-2xl bg-white'
            : 'max-w-full max-h-[calc(100dvh-2rem)] object-contain rounded-xl shadow-2xl'
        }
      />
    </ModalShell>
  );
}
