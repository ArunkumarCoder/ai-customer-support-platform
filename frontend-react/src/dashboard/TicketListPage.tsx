import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchTickets } from '../api/ticketsApi'
import type { Ticket, TicketFilters } from '../api/ticketsApi'

const STATUS_OPTIONS = ['open', 'in_progress', 'escalated', 'resolved', 'closed']
const PRIORITY_OPTIONS = ['low', 'normal', 'high', 'urgent']
const SENTIMENT_OPTIONS = ['positive', 'neutral', 'negative']

export default function TicketListPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [filters, setFilters] = useState<TicketFilters>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let stale = false
    setLoading(true)
    fetchTickets(filters)
      .then((data) => {
        if (!stale) setTickets(data)
      })
      .catch(() => {
        if (!stale) setError('Failed to load tickets.')
      })
      .finally(() => {
        if (!stale) setLoading(false)
      })
    return () => {
      stale = true
    }
  }, [filters])

  const updateFilter = (key: keyof TicketFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }))
  }

  const hasActiveFilters = Object.values(filters).some(Boolean)

  return (
    <>
      <h1>Tickets</h1>

      <div className="filters">
        <label>
          Status
          <select
            value={filters.status ?? ''}
            onChange={(event) => updateFilter('status', event.target.value)}
          >
            <option value="">All</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label>
          Priority
          <select
            value={filters.priority ?? ''}
            onChange={(event) => updateFilter('priority', event.target.value)}
          >
            <option value="">All</option>
            {PRIORITY_OPTIONS.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </label>

        <label>
          Sentiment
          <select
            value={filters.sentiment ?? ''}
            onChange={(event) => updateFilter('sentiment', event.target.value)}
          >
            <option value="">All</option>
            {SENTIMENT_OPTIONS.map((sentiment) => (
              <option key={sentiment} value={sentiment}>
                {sentiment}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading && <p>Loading tickets...</p>}
      {error && <div className="form-error">{error}</div>}

      {!loading && !error && tickets.length === 0 && (
        <div className="empty-state">
          {hasActiveFilters ? 'No tickets match these filters.' : 'No tickets yet.'}
        </div>
      )}

      {!loading && !error && tickets.length > 0 && (
        <table>
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
                <td>
                  <span className={`badge badge-${ticket.status}`}>{ticket.status}</span>
                </td>
                <td>{ticket.priority}</td>
                <td>{new Date(ticket.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
