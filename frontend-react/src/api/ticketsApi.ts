import apiClient from './client'

export interface Ticket {
  id: number
  visitor_id: string | null
  status: string
  priority: string
  created_at: string
}

export async function fetchTickets(): Promise<Ticket[]> {
  const response = await apiClient.get<Ticket[]>('/tickets')
  return response.data
}
