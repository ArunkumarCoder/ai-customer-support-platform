import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchTicket, replyToTicket, updateTicketStatus } from '../api/ticketsApi'
import type { TicketDetail } from '../api/ticketsApi'

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
    return <p>Loading ticket...</p>
  }

  if (!ticket) {
    return (
      <>
        <Link to="/dashboard">&larr; Back to tickets</Link>
        <div className="form-error">{error ?? 'Ticket not found.'}</div>
      </>
    )
  }

  const isResolved = ticket.status === 'resolved'

  return (
    <>
      <Link to="/dashboard">&larr; Back to tickets</Link>

      <div className="ticket-detail-header">
        <h1>Ticket #{ticket.id}</h1>
        <span className={`badge badge-${ticket.status}`}>{ticket.status}</span>
        {ticket.sentiment_summary && (
          <span className={`badge badge-sentiment-${ticket.sentiment_summary}`}>
            {ticket.sentiment_summary}
          </span>
        )}
        <span className="ticket-detail-priority">Priority: {ticket.priority}</span>
      </div>

      {error && <div className="form-error">{error}</div>}

      {ticket.messages.length === 0 ? (
        <div className="empty-state">No messages yet.</div>
      ) : (
        <div className="message-thread">
          {ticket.messages.map((message) => (
            <div key={message.id} className={`message message-${message.sender}`}>
              <div className="message-sender">
                {message.sender}
                {message.sentiment_label && (
                  <span className={`badge badge-sentiment-${message.sentiment_label} message-sentiment-badge`}>
                    {message.sentiment_label}
                  </span>
                )}
              </div>
              <div>{message.body}</div>
            </div>
          ))}
        </div>
      )}

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
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Sending...' : 'Send reply'}
            </button>
          </form>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => void handleResolve()}
            disabled={resolving}
          >
            {resolving ? 'Resolving...' : 'Mark resolved'}
          </button>
        </>
      )}
    </>
  )
}
