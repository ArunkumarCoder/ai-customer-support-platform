import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchTickets } from '../api/ticketsApi'
import type { Ticket, TicketFilters } from '../api/ticketsApi'
import { AlertIcon, CheckCircleIcon, InboxIcon, LayersIcon } from './icons'

const STATUS_OPTIONS = ['open', 'in_progress', 'escalated', 'resolved', 'closed']
const PRIORITY_OPTIONS = ['low', 'normal', 'high', 'urgent']
const SENTIMENT_OPTIONS = ['positive', 'neutral', 'negative']
const PAGE_SIZE = 10

// Filter values stay lowercase (that's what the API expects) — this only
// affects the label shown in the dropdown, e.g. "in_progress" -> "In Progress".
function formatOptionLabel(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export default function TicketListPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [filters, setFilters] = useState<TicketFilters>({})
  const [page, setPage] = useState(1)
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
    setPage(1)
  }

  const hasActiveFilters = Object.values(filters).some(Boolean)

  // These counts reflect the currently-loaded (possibly filtered) list, not
  // platform-wide totals — there's no dedicated stats endpoint, so this is
  // computed client-side from the same data the table below already has.
  const counts = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === 'open').length,
    escalated: tickets.filter((t) => t.status === 'escalated').length,
    resolved: tickets.filter((t) => t.status === 'resolved').length,
  }

  const toggleStatusFilter = (status: string) => {
    setFilters((prev) => ({ ...prev, status: prev.status === status ? undefined : status }))
    setPage(1)
  }

  const pageCount = Math.max(1, Math.ceil(tickets.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pagedTickets = tickets.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const rangeStart = tickets.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, tickets.length)

  return (
    <>
      <h1>Tickets</h1>

      <div className="stat-boxes">
        <button
          type="button"
          className={`stat-box stat-box--total${!filters.status ? ' is-active' : ''}`}
          onClick={() => {
            setFilters((prev) => ({ ...prev, status: undefined }))
            setPage(1)
          }}
        >
          <div>
            <div className="stat-box__value">{counts.total}</div>
            <div className="stat-box__label">{hasActiveFilters ? 'Matching' : 'Total'}</div>
          </div>
          <LayersIcon className="stat-box__icon" width={30} height={30} />
        </button>

        <button
          type="button"
          className={`stat-box stat-box--open${filters.status === 'open' ? ' is-active' : ''}`}
          onClick={() => toggleStatusFilter('open')}
        >
          <div>
            <div className="stat-box__value">{counts.open}</div>
            <div className="stat-box__label">Open</div>
          </div>
          <InboxIcon className="stat-box__icon" width={30} height={30} />
        </button>

        <button
          type="button"
          className={`stat-box stat-box--escalated${filters.status === 'escalated' ? ' is-active' : ''}`}
          onClick={() => toggleStatusFilter('escalated')}
        >
          <div>
            <div className="stat-box__value">{counts.escalated}</div>
            <div className="stat-box__label">Escalated</div>
          </div>
          <AlertIcon className="stat-box__icon" width={30} height={30} />
        </button>

        <button
          type="button"
          className={`stat-box stat-box--resolved${filters.status === 'resolved' ? ' is-active' : ''}`}
          onClick={() => toggleStatusFilter('resolved')}
        >
          <div>
            <div className="stat-box__value">{counts.resolved}</div>
            <div className="stat-box__label">Resolved</div>
          </div>
          <CheckCircleIcon className="stat-box__icon" width={30} height={30} />
        </button>
      </div>

      <div className="card">
        <div className="card-body">
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
                    {formatOptionLabel(status)}
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
                    {formatOptionLabel(priority)}
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
                    {formatOptionLabel(sentiment)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>All Tickets</h2>
          <span className="card-header__meta">
            {tickets.length === 0
              ? '0 shown'
              : `${rangeStart}–${rangeEnd} of ${tickets.length}`}
          </span>
        </div>

        {loading && (
          <div className="card-body">
            <p>Loading tickets...</p>
          </div>
        )}
        {error && (
          <div className="card-body">
            <div className="form-error">{error}</div>
          </div>
        )}

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
                <th>Sentiment</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedTickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td>
                    <Link to={`/dashboard/tickets/${ticket.id}`}>{ticket.id}</Link>
                  </td>
                  <td>
                    <span className={`badge badge-${ticket.status}`}>{ticket.status}</span>
                  </td>
                  <td>{ticket.priority}</td>
                  <td>
                    {ticket.sentiment_summary ? (
                      <span className={`badge badge-sentiment-${ticket.sentiment_summary}`}>
                        {ticket.sentiment_summary}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{new Date(ticket.created_at).toLocaleString()}</td>
                  <td>
                    <Link to={`/dashboard/tickets/${ticket.id}`} className="btn-primary btn-sm" type="button">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && !error && pageCount > 1 && (
          <div className="card-footer">
            <nav className="pagination" aria-label="Ticket list pages">
              <button
                type="button"
                className="pagination__btn"
                disabled={currentPage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>

              {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  className={`pagination__btn${pageNumber === currentPage ? ' is-active' : ''}`}
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              ))}

              <button
                type="button"
                className="pagination__btn"
                disabled={currentPage === pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                Next
              </button>
            </nav>
          </div>
        )}
      </div>
    </>
  )
}
