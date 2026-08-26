import apiClient from './client'
import { getVisitorId } from './visitor'

export interface ChatResponse {
  reply: string
  ticket_id: number
  escalated: boolean
}

export async function sendMessage(message: string): Promise<ChatResponse> {
  const response = await apiClient.post<ChatResponse>('/chat', {
    message,
    visitor_id: getVisitorId(),
  })

  return response.data
}
