import apiClient from './client'

export interface Agent {
  id: number
  name: string
  email: string
  role: string
}

export interface LoginResponse {
  token: string
  agent: Agent
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/login', { email, password })
  return response.data
}

export async function logout(): Promise<void> {
  await apiClient.post('/logout')
}
