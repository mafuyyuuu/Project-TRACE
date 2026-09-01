import { createPortal } from 'react-dom';

/**
 * Simulates a hardware document scanner: progress animation, then hands the
 * captured file to the OCR intake flow.
 */
export default function HardwareScannerModal({
  activeModal,
  scanFile,
  scanProgress,
}) {
  return (
    <>
  {activeModal === 'hardware-scanner' && scanFile && createPortal(
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"></div>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 sm:p-8 z-10 border border-gray-100 flex flex-col items-center">
        <div className="animate-pulse mb-6 flex flex-col items-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-8v4h8v-4zM6 16H4m16-4V7a2 2 0 00-2-2H6a2 2 0 00-2 2v5h16z" />
            </svg>
          </div>
          <h3 className="text-xl font-black text-gray-900 text-center">
            {scanProgress < 20 ? 'Initializing Scanner...' : scanProgress < 100 ? 'Scanning Document...' : 'Processing...'}
          </h3>
          <p className="text-sm text-blue-600 mt-2 font-bold">EPSON-L3110 USB Interface</p>
        </div>

        <div className="w-full relative h-48 bg-gray-100 rounded-xl overflow-hidden border-2 border-dashed border-blue-300">
          {scanFile && <img src={URL.createObjectURL(scanFile)} alt="Preview" className="w-full h-full object-contain opacity-50 grayscale" />}

          {/* Laser effect */}
          <div 
            className="absolute left-0 w-full h-1 bg-blue-500 shadow-[0_0_20px_10px_rgba(59,130,246,0.6)]" 
            style={{ 
              top: `${scanProgress}%`, 
              transition: 'top 0.1s linear',
              display: scanProgress >= 100 ? 'none' : 'block'
            }}
          ></div>
        </div>

        <div className="w-full mt-8 bg-gray-100 rounded-full h-3">
          <div 
            className="bg-blue-600 h-3 rounded-full" 
            style={{ width: `${scanProgress}%`, transition: 'width 0.1s linear' }}
          ></div>
        </div>

        <p className="text-[10px] text-gray-400 mt-4 uppercase tracking-widest font-bold">
          Extracting text via EasyOCR PyTorch Engine...
        </p>
      </div>
    </div>,
    document.body
  )}
    </>
  );
}
