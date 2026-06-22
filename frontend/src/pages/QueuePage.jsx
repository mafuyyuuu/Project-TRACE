import { useState, useEffect } from 'react'
import { getDocuments, processDocument } from '../services/api'

export default function QueuePage() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const data = await getDocuments()
      setDocuments(data.documents || [])
    } catch (err) {
      setError('Failed to load queue. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (id, action) => {
    try {
      await processDocument(id, action)
      // Optimistically remove the document from the queue
      setDocuments((prev) => prev.filter((doc) => doc.id !== id))
    } catch (err) {
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        `Failed to ${action} document.`
      setError(message)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'submitted':
        return <span className="badge badge--primary">Submitted</span>
      case 'processing':
        return <span className="badge badge--accent">Processing</span>
      case 'approved':
        return <span className="badge badge--success">Approved</span>
      case 'rejected':
        return <span className="badge badge--error">Rejected</span>
      case 'released':
        return <span className="badge badge--muted">Released</span>
      default:
        return <span className="badge badge--muted">{status}</span>
    }
  }

  return (
    <div className="queue-container">
      <div className="page-header">
        <h1 className="page-title">Document Queue</h1>
        <p className="page-subtitle">
          Manage and process documents routed to your desk
        </p>
      </div>

      <div className="queue-card glass-card">
        {error && (
          <div className="queue-error">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        <div className="table-responsive">
          <table className="queue-table">
            <thead>
              <tr>
                <th>Tracking Number</th>
                <th>Student ID</th>
                <th>Document Type</th>
                <th>Status</th>
                <th>Uploaded</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-gray-400">
                    <span className="spinner" /> Loading queue...
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-gray-400">
                    No documents currently assigned to your queue.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id}>
                    <td className="font-mono text-camp-blue-500 font-semibold">
                      {doc.tracking_number}
                    </td>
                    <td>{doc.student_id || '—'}</td>
                    <td>{doc.document_type || '—'}</td>
                    <td>{getStatusBadge(doc.current_status)}</td>
                    <td className="text-sm text-gray-400">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="text-right action-buttons">
                      <button
                        className="btn-sm btn-success"
                        onClick={() => handleAction(doc.id, 'approve')}
                      >
                        ✓ Approve
                      </button>
                      <button
                        className="btn-sm btn-danger"
                        onClick={() => handleAction(doc.id, 'reject')}
                      >
                        ✕ Reject
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
