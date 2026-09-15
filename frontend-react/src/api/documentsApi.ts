import apiClient from './client'

export interface DocumentUploader {
  id: number
  name: string
  email: string
}

export interface Document {
  id: number
  title: string
  source_file: string
  uploaded_by: number
  uploader?: DocumentUploader
  created_at: string
}

export async function fetchDocuments(): Promise<Document[]> {
  const response = await apiClient.get('/documents')
  return response.data.data ?? response.data
}

export async function uploadDocument(title: string, file: File): Promise<Document> {
  const formData = new FormData()
  formData.append('title', title)
  formData.append('file', file)

  const response = await apiClient.post<Document>('/documents', formData)
  return response.data
}
