// Temporary kill-switch for document uploads (data/token limitations).
// Flip back to true when uploads should reopen — no other code changes
// needed. The backend enforces the same restriction independently via
// the DOCUMENT_UPLOADS_ENABLED env var (config/services.php), so
// changing only this flag does not bypass the API-level gate, and vice
// versa: both must be re-enabled to actually restore uploads.
export const DOCUMENTS_UPLOAD_ENABLED = false
