import { useState, useRef } from 'react'
import { useDocumentUpload } from '../utils/hooks'

const DOCUMENT_TYPES = ['TOR', 'Clearance', 'Certification', 'Diploma', 'Good Moral', 'Honorable Dismissal', 'Other']

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024; const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export default function UploadPage() {
  const fileInputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [documentType, setDocumentType] = useState('')
  const [studentId, setStudentId] = useState('')
  const [studentName, setStudentName] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [copied, setCopied] = useState(false)

  const { submitUpload, loading, error, result, reset } = useDocumentUpload()

  const handleDrag = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(e.type === 'dragover' || e.type === 'dragenter') }
  const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]) }
  const handleFileChange = (e) => { if (e.target.files?.[0]) setFile(e.target.files[0]) }
  const removeFile = () => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await submitUpload(file, documentType, studentId, studentName)
  }

  const handleCopy = async () => {
    if (!result?.tracking_number) return
    try {
      await navigator.clipboard.writeText(result.tracking_number)
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    } catch {
      // Ignore copy errors
    }
  }

  const resetForm = () => {
    setFile(null); setDocumentType(''); setStudentId(''); setStudentName(''); setCopied(false);
    reset();
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <div className="bg-white rounded-3xl p-10 shadow-sm border border-gray-100 max-w-lg w-full text-center">
          <div className="w-20 h-20 bg-pine-50 text-pine-600 rounded-full flex items-center justify-center mx-auto mb-6"><svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
          <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">Upload Successful!</h2>
          <p className="text-gray-500 text-sm mb-4">Your document has been submitted. Please complete your payment to start processing.</p>
          
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
             <div className="text-left">
               <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Tracking Number</div>
               <div className="font-mono text-xl font-bold text-pine-600">{result.tracking_number}</div>
             </div>
             <button onClick={handleCopy} className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
               {copied ? 'Copied!' : 'Copy'}
             </button>
          </div>
          
          <div className="flex flex-col gap-3">
             <a href={result.document?.checkout_url || '#'} target="_blank" rel="noreferrer" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold transition-colors block text-center">
               Pay with GCash / QRPh
             </a>
             <button onClick={resetForm} className="w-full py-3 bg-pine-600 hover:bg-pine-700 text-white rounded-full font-bold transition-colors">
               Upload Another Document
             </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto w-full py-4">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900">Upload Document</h1>
          <p className="text-gray-500 mt-1">Submit a new document for processing and tracking in the queue.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium flex items-center gap-2"><svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>{error}</div>}

          {/* Dropzone */}
          <div
            className={`border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-colors ${dragActive ? 'border-pine-500 bg-pine-50' : 'border-gray-200 hover:border-pine-400 bg-gray-50/50'}`}
            onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}
          >
            <div className="mb-4 opacity-80"><svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg></div>
            <p className="text-gray-700 font-medium mb-1 text-lg">Drag & drop your document here</p>
            <p className="text-gray-400 text-sm">or <span className="text-pine-600 font-semibold">click to browse</span> your files</p>
            <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" />
          </div>

          {file && (
            <div className="flex items-center justify-between p-4 bg-pine-50/50 border border-pine-100 rounded-2xl">
              <div className="flex items-center gap-4">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" /></svg>
                <div>
                  <div className="text-sm font-bold text-gray-900">{file.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{formatFileSize(file.size)}</div>
                </div>
              </div>
              <button type="button" onClick={(e) => { e.stopPropagation(); removeFile() }} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors font-bold">✕</button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-800">Document Type</label>
              <select value={documentType} onChange={(e) => setDocumentType(e.target.value)} className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-pine-500 outline-none transition-all appearance-none cursor-pointer">
                <option value="" disabled>Select document type...</option>
                {DOCUMENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-800">Student ID</label>
              <input type="text" placeholder="e.g. 2024-00123" value={studentId} onChange={(e) => setStudentId(e.target.value)} className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-pine-500 outline-none transition-all" />
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-sm font-semibold text-gray-800">Student Name</label>
              <input type="text" placeholder="e.g. Juan Dela Cruz" value={studentName} onChange={(e) => setStudentName(e.target.value)} className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-pine-500 outline-none transition-all" />
            </div>
          </div>

          <button type="submit" disabled={loading} className="mt-6 w-full py-4 bg-pine-600 hover:bg-pine-700 disabled:opacity-70 disabled:cursor-not-allowed text-white rounded-full font-bold transition-all shadow-sm flex items-center justify-center gap-2">
            {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Uploading...</> : <><svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>Upload Document</>}
          </button>
        </form>
      </div>
    </div>
  )
}
