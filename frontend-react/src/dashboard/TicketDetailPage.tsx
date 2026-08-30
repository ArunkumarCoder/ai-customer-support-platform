import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchTicket, replyToTicket, updateTicketStatus } from '../api/ticketsApi'
import type { TicketDetail } from '../api/ticketsApi'
import './dashboard.css'

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const ticketId = Number(id)

  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resolving, setResolving] = useState(false)

  const loadTicket = useCallback(async () => {
    try {
      const data = await fetchTicket(ticketId)
      setTicket(data)
    } catch {
      setError('Failed to load ticket.')
    }
  }, [ticketId])

  useEffect(() => {
    setLoading(true)
    loadTicket().finally(() => setLoading(false))
  }, [loadTicket])

  const handleReply = async (event: FormEvent) => {
    event.preventDefault()
    const body = replyBody.trim()
    if (!body || submitting) {
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await replyToTicket(ticketId, body)
      setReplyBody('')
      await loadTicket()
    } catch {
      setError('Failed to send reply.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResolve = async () => {
    setResolving(true)
    setError(null)

    try {
      await updateTicketStatus(ticketId, 'resolved')
      await loadTicket()
    } catch {
      setError('Failed to update ticket status.')
    } finally {
      setResolving(false)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-page">
        <p>Loading ticket...</p>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="dashboard-page">
        <Link to="/dashboard">&larr; Back to tickets</Link>
        <div className="form-error">{error ?? 'Ticket not found.'}</div>
      </div>
    )
  }

  const isResolved = ticket.status === 'resolved'

  return (
    <div className="dashboard-page">
      <Link to="/dashboard">&larr; Back to tickets</Link>

      <div className="ticket-detail-header">
        <h1>Ticket #{ticket.id}</h1>
        <span className="ticket-detail-meta">
          Status: <strong>{ticket.status}</strong> &middot; Priority: <strong>{ticket.priority}</strong>
        </span>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="message-thread">
        {ticket.messages.map((message) => (
          <div key={message.id} className={`message-bubble message-bubble--${message.sender}`}>
            <div className="message-bubble__sender">{message.sender}</div>
            <div className="message-bubble__body">{message.body}</div>
          </div>
        ))}
      </div>

      {!isResolved && (
        <>
          <form className="reply-form" onSubmit={(event) => void handleReply(event)}>
            <textarea
              value={replyBody}
              onChange={(event) => setReplyBody(event.target.value)}
              placeholder="Type a reply..."
              rows={3}
              required
            />
            <button type="submit" disabled={submitting}>
              {submitting ? 'Sending...' : 'Send reply'}
            </button>
          </form>

          <button
            type="button"
            className="resolve-button"
            onClick={() => void handleResolve()}
            disabled={resolving}
          >
            {resolving ? 'Resolving...' : 'Mark resolved'}
          </button>
        </>
      )}
    </div>
  )
}
