import { useState, useRef } from 'react'
import { uploadDocument } from '../services/api'

const DOCUMENT_TYPES = [
  'TOR',
  'Clearance',
  'Certification',
  'Diploma',
  'Good Moral',
  'Honorable Dismissal',
  'Other',
]

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(false)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragover' || e.type === 'dragenter') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const removeFile = () => {
    setFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!file) {
      setError('Please select a document to upload.')
      return
    }
    if (!documentType) {
      setError('Please select a document type.')
      return
    }
    if (!studentId.trim()) {
      setError('Please enter the Student ID.')
      return
    }
    if (!studentName.trim()) {
      setError('Please enter the Student Name.')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('document', file)
      formData.append('document_type', documentType)
      formData.append('student_id', studentId.trim())
      formData.append('student_name', studentName.trim())

      const data = await uploadDocument(formData)
      setResult(data)
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Upload failed. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!result?.tracking_number) return
    try {
      await navigator.clipboard.writeText(result.tracking_number)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const textArea = document.createElement('textarea')
      textArea.value = result.tracking_number
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const resetForm = () => {
    setFile(null)
    setDocumentType('')
    setStudentId('')
    setStudentName('')
    setError('')
    setResult(null)
    setCopied(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // ── Success State ──────────────────────────────────────
  if (result) {
    return (
      <div className="upload-container">
        <div className="page-header">
          <h1 className="page-title">Upload Document</h1>
          <p className="page-subtitle">Document successfully submitted</p>
        </div>

        <div className="tracking-result glass-card">
          <span className="result-icon">✅</span>
          <h2 className="result-title">Upload Successful!</h2>
          <p className="result-message">
            Your document has been submitted and assigned a tracking number. Save this number to track its progress.
          </p>

          <div className="tracking-number-box">
            <div>
              <div className="tracking-label">Tracking Number</div>
              <div className="tracking-code">{result.tracking_number}</div>
            </div>
            <button
              className="copy-btn"
              onClick={handleCopy}
              title="Copy tracking number"
            >
              {copied ? '✅ Copied!' : '📋 Copy'}
            </button>
          </div>

          <div className="result-actions">
            <button className="btn-primary" onClick={resetForm}>
              📤 Upload Another
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Upload Form ────────────────────────────────────────
  return (
    <div className="upload-container">
      <div className="page-header">
        <h1 className="page-title">Upload Document</h1>
        <p className="page-subtitle">
          Submit a new document for processing and tracking
        </p>
      </div>

      <div className="upload-card glass-card">
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="upload-error">
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Drop Zone */}
          <div
            className={`dropzone ${dragActive ? 'dropzone-active' : ''}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                fileInputRef.current?.click()
              }
            }}
          >
            <span className="dropzone-icon">📄</span>
            <p className="dropzone-text">Drag & drop your document here</p>
            <p className="dropzone-hint">
              or <span>click to browse</span> your files
            </p>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            />
          </div>

          {file && (
            <div className="file-preview">
              <span className="file-icon">📎</span>
              <div className="file-info">
                <div className="file-name">{file.name}</div>
                <div className="file-size">{formatFileSize(file.size)}</div>
              </div>
              <button
                type="button"
                className="file-remove"
                onClick={(e) => {
                  e.stopPropagation()
                  removeFile()
                }}
                title="Remove file"
              >
                ✕
              </button>
            </div>
          )}

          <div className="upload-form">
            {/* Document Type */}
            <div className="form-group">
              <label htmlFor="documentType">Document Type</label>
              <select
                id="documentType"
                className="select-field"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
              >
                <option value="" disabled>
                  Select document type…
                </option>
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Student ID */}
            <div className="form-group">
              <label htmlFor="studentId">Student ID</label>
              <input
                id="studentId"
                className="input-field"
                type="text"
                placeholder="e.g. 2024-00123"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
            </div>

            {/* Student Name */}
            <div className="form-group">
              <label htmlFor="studentName">Student Name</label>
              <input
                id="studentName"
                className="input-field"
                type="text"
                placeholder="e.g. Juan Dela Cruz"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="upload-btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Uploading…
                </>
              ) : (
                <>📤 Upload Document</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
