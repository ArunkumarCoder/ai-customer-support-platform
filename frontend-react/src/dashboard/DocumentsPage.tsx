import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { fetchDocuments, uploadDocument } from '../api/documentsApi'
import type { Document } from '../api/documentsApi'

const DOCUMENTS_LOAD_ERROR = 'Failed to load documents. You may need admin access to view this page.'

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Split from refreshDocuments (used after a successful upload) so the
  // mount effect never calls setState synchronously in its body — the
  // initial useState(true)/useState(null) values already cover the first
  // load, avoiding the react-hooks/set-state-in-effect lint violation.
  useEffect(() => {
    fetchDocuments()
      .then(setDocuments)
      .catch(() => setError(DOCUMENTS_LOAD_ERROR))
      .finally(() => setLoading(false))
  }, [])

  const refreshDocuments = () => {
    setLoading(true)
    setError(null)
    fetchDocuments()
      .then(setDocuments)
      .catch(() => setError(DOCUMENTS_LOAD_ERROR))
      .finally(() => setLoading(false))
  }

  const handleUpload = async (event: FormEvent) => {
    event.preventDefault()
    if (!file) return

    setUploading(true)
    setUploadError(null)
    try {
      await uploadDocument(title, file)
      setTitle('')
      setFile(null)
      const input = document.getElementById('document-file-input') as HTMLInputElement | null
      if (input) input.value = ''
      refreshDocuments()
    } catch {
      setUploadError('Upload failed. Ingestion runs as part of the upload request, so this can happen if the AI service is briefly unreachable — try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <h1>Documents</h1>

      <div className="card">
        <div className="card-header">
          <h2>Upload Document</h2>
        </div>
        <div className="card-body">
          <p className="card-hint">
            Uploaded documents are chunked and embedded for the chat widget&rsquo;s knowledge base.
            Only .txt and .md files up to 5MB are accepted.
          </p>
          {uploadError && <div className="form-error">{uploadError}</div>}
          <form onSubmit={(event) => void handleUpload(event)} className="filters">
            <label>
              Title
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                maxLength={255}
              />
            </label>
            <label>
              File
              <input
                id="document-file-input"
                type="file"
                accept=".txt,.md"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                required
              />
            </label>
            <button type="submit" className="btn-primary" disabled={uploading}>
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>All Documents</h2>
          <span className="card-header__meta">{documents.length} shown</span>
        </div>

        {loading && (
          <div className="card-body">
            <p>Loading documents...</p>
          </div>
        )}
        {error && (
          <div className="card-body">
            <div className="form-error">{error}</div>
          </div>
        )}

        {!loading && !error && documents.length === 0 && (
          <div className="empty-state">No documents uploaded yet.</div>
        )}

        {!loading && !error && documents.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Uploaded By</th>
                <th>Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td>{doc.id}</td>
                  <td>{doc.title}</td>
                  <td>{doc.uploader?.name ?? `Agent #${doc.uploaded_by}`}</td>
                  <td>{new Date(doc.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
