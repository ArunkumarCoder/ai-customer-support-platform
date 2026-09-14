import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchTicket, replyToTicket, updateTicketStatus } from '../api/ticketsApi'
import type { Message, TicketDetail } from '../api/ticketsApi'
import { ArrowLeftIcon } from './icons'

const AVATAR_LABEL: Record<Message['sender'], string> = {
  customer: 'C',
  bot: 'AI',
  agent: 'A',
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

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
      <Link to="/dashboard">
        <ArrowLeftIcon /> Back to tickets
      </Link>

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

      {ticket.summary && (
        <div className="ai-summary-callout">
          <div className="ai-summary-callout__label">AI Summary</div>
          <p>{ticket.summary}</p>
        </div>
      )}

      <div className="ticket-detail">
        <div>
          {ticket.messages.length === 0 ? (
            <div className="empty-state">No messages yet.</div>
          ) : (
            <div className="message-thread">
              {ticket.messages.map((message) => {
                if (message.sender === 'agent') {
                  return (
                    <div className="message-row message-row--right" key={message.id}>
                      <span className="message-avatar message-avatar--agent">
                        {AVATAR_LABEL.agent}
                      </span>
                      <div className="message-body-col">
                        <div className="message-meta">
                          <span className="message-sender">Agent</span>
                          <span className="message-time">{formatTime(message.created_at)}</span>
                        </div>
                        <div className="message message-agent">{message.body}</div>
                      </div>
                    </div>
                  )
                }

                if (message.sender === 'bot' || message.sender === 'customer') {
                  return (
                    <div className="message-row" key={message.id}>
                      <span className={`message-avatar message-avatar--${message.sender}`}>
                        {AVATAR_LABEL[message.sender]}
                      </span>
                      <div className="message-body-col">
                        <div className="message-meta">
                          <span className="message-sender">
                            {message.sender === 'bot' ? 'AI Assistant' : 'Customer'}
                          </span>
                          <span className="message-time">{formatTime(message.created_at)}</span>
                          {message.sentiment_label && (
                            <span
                              className={`badge badge-sentiment-${message.sentiment_label} message-sentiment-badge`}
                            >
                              {message.sentiment_label}
                            </span>
                          )}
                        </div>
                        <div className={`message message-${message.sender}`}>{message.body}</div>
                      </div>
                    </div>
                  )
                }

                return (
                  <div className="message message-system" key={message.id}>
                    {message.body}
                  </div>
                )
              })}
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
        </div>

        <div className="info-card-wrapper">
          <div className="card">
            <div className="card-header">
              <h2>Ticket Info</h2>
            </div>
            <div className="card-body info-card">
              <div className="info-card__row">
                <span className="info-card__row-label">Status</span>
                <span className="info-card__row-value">
                  <span className={`badge badge-${ticket.status}`}>{ticket.status}</span>
                </span>
              </div>

              <div className="info-card__row">
                <span className="info-card__row-label">Priority</span>
                <span className="info-card__row-value">{ticket.priority}</span>
              </div>

              <div className="info-card__row">
                <span className="info-card__row-label">Sentiment</span>
                <span className="info-card__row-value">
                  {ticket.sentiment_summary ? (
                    <span className={`badge badge-sentiment-${ticket.sentiment_summary}`}>
                      {ticket.sentiment_summary}
                    </span>
                  ) : (
                    '—'
                  )}
                </span>
              </div>

              <div className="info-card__row">
                <span className="info-card__row-label">Assigned Agent</span>
                <span className="info-card__row-value">
                  {ticket.assigned_agent_id ? `Agent #${ticket.assigned_agent_id}` : 'Unassigned'}
                </span>
              </div>

              <div className="info-card__row">
                <span className="info-card__row-label">Visitor</span>
                <span className="info-card__row-value">{ticket.visitor_id ?? '—'}</span>
              </div>

              <div className="info-card__row">
                <span className="info-card__row-label">Created</span>
                <span className="info-card__row-value">
                  {new Date(ticket.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
