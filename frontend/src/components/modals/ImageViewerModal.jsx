

const apiBaseUrl = import.meta.env.VITE_API_URL || '';

export default function ImageViewerModal({ viewImageUrl, setViewImageUrl }) {
  if (!viewImageUrl) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-sm" onClick={() => setViewImageUrl(null)}></div>
      <button 
        onClick={() => setViewImageUrl(null)}
        className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors z-10 backdrop-blur-md"
      >
        ✕
      </button>
      <div className="relative z-10 max-w-5xl max-h-[90vh] flex items-center justify-center">
        <img 
          src={`${apiBaseUrl}${viewImageUrl}`} 
          alt="Full Screen Viewer" 
          className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
        />
      </div>
    </div>
  );
}
