import apiClient from './client'

export interface Ticket {
  id: number
  visitor_id: string | null
  status: string
  priority: string
  created_at: string
}

export interface Message {
  id: number
  ticket_id: number
  sender: 'customer' | 'bot' | 'agent'
  body: string
  sentiment_label?: string | null
  created_at: string
}

export interface TicketDetail extends Ticket {
  messages: Message[]
}

export async function fetchTickets(): Promise<Ticket[]> {
  const response = await apiClient.get<Ticket[]>('/tickets')
  return response.data
}

export async function fetchTicket(id: number): Promise<TicketDetail> {
  const response = await apiClient.get<TicketDetail>(`/tickets/${id}`)
  return response.data
}

export async function replyToTicket(id: number, body: string): Promise<Message> {
  const response = await apiClient.post<Message>(`/tickets/${id}/messages`, { body })
  return response.data
}

export async function updateTicketStatus(id: number, status: string): Promise<Ticket> {
  const response = await apiClient.put<Ticket>(`/tickets/${id}`, { status })
  return response.data
}
