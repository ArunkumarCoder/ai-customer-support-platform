import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { fetchDocument, fetchDocuments, uploadDocument } from '../api/documentsApi'
import type { Document, DocumentDetail } from '../api/documentsApi'
import { DOCUMENTS_UPLOAD_ENABLED } from '../config/featureFlags'
import { EyeIcon, InfoIcon, XIcon } from './icons'

const DOCUMENTS_LOAD_ERROR = 'Failed to load documents. You may need admin access to view this page.'
const DOCUMENT_VIEW_ERROR = 'Failed to load this document. You may need admin access, or it may have been removed.'

// Every document accepted by the upload endpoint is .txt/.md (enforced
// server-side by StoreDocumentRequest's mimes:txt,md rule) — this just
// turns the stored filename's extension into a short display label.
function fileType(sourceFile: string): string {
  const extension = sourceFile.split('.').pop()?.toUpperCase()
  return extension || 'FILE'
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const [viewedDoc, setViewedDoc] = useState<DocumentDetail | null>(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [viewError, setViewError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)

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
    if (!DOCUMENTS_UPLOAD_ENABLED || !file) return

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

  const openDocument = (id: number) => {
    setViewedDoc(null)
    setViewError(null)
    setViewLoading(true)
    dialogRef.current?.showModal()

    fetchDocument(id)
      .then(setViewedDoc)
      .catch(() => setViewError(DOCUMENT_VIEW_ERROR))
      .finally(() => setViewLoading(false))
  }

  const closeDocument = () => {
    dialogRef.current?.close()
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

          {!DOCUMENTS_UPLOAD_ENABLED && (
            <div className="notice-info" role="status">
              <InfoIcon width={16} height={16} />
              <span>
                Document uploads are currently restricted due to data and token limitations. You
                can continue to view and chat with the documents already available below.
              </span>
            </div>
          )}

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
                disabled={!DOCUMENTS_UPLOAD_ENABLED}
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
                disabled={!DOCUMENTS_UPLOAD_ENABLED}
              />
            </label>
            <button
              type="submit"
              className="btn-primary"
              disabled={!DOCUMENTS_UPLOAD_ENABLED || uploading}
              aria-disabled={!DOCUMENTS_UPLOAD_ENABLED || uploading}
              title={DOCUMENTS_UPLOAD_ENABLED ? undefined : 'Uploads are temporarily restricted'}
            >
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Your Documents</h2>
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
                <th>Document</th>
                <th>Type</th>
                <th>Uploaded By</th>
                <th>Uploaded</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td>{doc.title}</td>
                  <td>
                    <span className="badge badge-type">{fileType(doc.source_file)}</span>
                  </td>
                  <td>{doc.uploader?.name ?? `Agent #${doc.uploaded_by}`}</td>
                  <td>{new Date(doc.created_at).toLocaleString()}</td>
                  <td>
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={() => openDocument(doc.id)}
                    >
                      <EyeIcon width={14} height={14} />
                      View
                      <span className="sr-only"> {doc.title}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <dialog ref={dialogRef} className="doc-viewer" aria-labelledby="doc-viewer-title">
        <div className="doc-viewer__header">
          <h2 className="doc-viewer__title" id="doc-viewer-title">
            {viewedDoc?.title ?? 'Document'}
          </h2>
          <button
            type="button"
            className="doc-viewer__close"
            onClick={closeDocument}
            aria-label="Close document viewer"
          >
            <XIcon width={18} height={18} />
          </button>
        </div>

        {viewedDoc && (
          <div className="doc-viewer__meta">
            <span>
              <strong>Type:</strong> {fileType(viewedDoc.source_file)}
            </span>
            <span>
              <strong>Uploaded by:</strong> {viewedDoc.uploader?.name ?? `Agent #${viewedDoc.uploaded_by}`}
            </span>
            <span>
              <strong>Uploaded:</strong> {new Date(viewedDoc.created_at).toLocaleString()}
            </span>
          </div>
        )}

        <div className="doc-viewer__body">
          {viewLoading && <p>Loading document...</p>}
          {viewError && <div className="form-error">{viewError}</div>}
          {viewedDoc && !viewLoading && !viewError && (
            viewedDoc.content_available ? (
              <pre className="doc-viewer__content">{viewedDoc.content}</pre>
            ) : (
              <div className="empty-state">
                This document&rsquo;s content isn&rsquo;t available to preview right now.
              </div>
            )
          )}
        </div>
      </dialog>
    </>
  )
}
