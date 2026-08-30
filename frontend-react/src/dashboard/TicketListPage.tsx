import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { fetchTickets } from '../api/ticketsApi'
import type { Ticket } from '../api/ticketsApi'
import './dashboard.css'

export default function TicketListPage() {
  const { agent, logout } = useAuth()
  const navigate = useNavigate()

  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTickets()
      .then(setTickets)
      .catch(() => setError('Failed to load tickets.'))
      .finally(() => setLoading(false))
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <h1>Tickets</h1>
        <div className="dashboard-header__agent">
          <span>{agent?.name}</span>
          <button type="button" onClick={() => void handleLogout()}>
            Log out
          </button>
        </div>
      </header>

      {loading && <p>Loading tickets...</p>}
      {error && <div className="form-error">{error}</div>}

      {!loading && !error && (
        <table className="ticket-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id}>
                <td>
                  <Link to={`/dashboard/tickets/${ticket.id}`}>{ticket.id}</Link>
                </td>
                <td>{ticket.status}</td>
                <td>{ticket.priority}</td>
                <td>{new Date(ticket.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
