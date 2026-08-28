import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { login as loginRequest, logout as logoutRequest } from '../api/authApi'
import type { Agent } from '../api/authApi'

interface AuthContextValue {
  agent: Agent | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readStoredAgent(): Agent | null {
  const stored = localStorage.getItem('auth_agent')
  return stored ? (JSON.parse(stored) as Agent) : null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [agent, setAgent] = useState<Agent | null>(readStoredAgent)

  const login = async (email: string, password: string) => {
    const data = await loginRequest(email, password)
    localStorage.setItem('auth_token', data.token)
    localStorage.setItem('auth_agent', JSON.stringify(data.agent))
    setAgent(data.agent)
  }

  const logout = async () => {
    try {
      await logoutRequest()
    } finally {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_agent')
      setAgent(null)
    }
  }

  return (
    <AuthContext.Provider value={{ agent, isAuthenticated: !!agent, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
