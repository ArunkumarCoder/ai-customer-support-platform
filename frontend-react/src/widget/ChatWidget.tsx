import { useState } from 'react'
import { sendMessage } from '../api/chatApi'
import './ChatWidget.css'

type Sender = 'customer' | 'bot' | 'system'

interface ChatMessage {
  id: string
  sender: Sender
  text: string
}

const ESCALATION_NOTICE = 'This conversation has been flagged for a human agent.'

export default function ChatWidget() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  const appendMessage = (sender: Sender, text: string) => {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), sender, text }])
  }

  const handleSend = async () => {
    const message = input.trim()
    if (!message || sending) {
      return
    }

    appendMessage('customer', message)
    setInput('')
    setSending(true)

    try {
      const response = await sendMessage(message)
      appendMessage('bot', response.reply)

      if (response.escalated) {
        appendMessage('system', ESCALATION_NOTICE)
      }
    } catch {
      appendMessage('system', 'Something went wrong sending your message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      void handleSend()
    }
  }

  return (
    <div className="chat-widget">
      <div className="chat-widget-header">Support Chat</div>

      <div className="chat-widget-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`chat-widget__message chat-widget__message--${message.sender}`}
          >
            {message.text}
          </div>
        ))}
        {sending && <div className="typing-indicator">Assistant is typing…</div>}
      </div>

      <div className="chat-widget-input">
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={sending}
        />
        <button
          className="btn-primary"
          type="button"
          onClick={() => void handleSend()}
          disabled={sending || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  )
}
