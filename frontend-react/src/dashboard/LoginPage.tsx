import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { LockIcon, MailIcon } from './icons'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await login(email, password)
      navigate('/dashboard')
    } catch {
      setError('Invalid email or password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="dashboard-page dashboard-page--centered">
      <div className="login-box">
        <div className="login-box__brand">
          <span className="login-box__brand-mark">CSD</span>
          <span className="login-box__brand-name">Customer Support Desk</span>
        </div>

        <form className="login-form" onSubmit={(event) => void handleSubmit(event)}>
          <h1>Agent Login</h1>

          {error && <div className="form-error">{error}</div>}

          <label className="form-field form-field--icon">
            <span>Email</span>
            <MailIcon width={16} height={16} />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="form-field form-field--icon">
            <span>Password</span>
            <LockIcon width={16} height={16} />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Logging in...' : 'Log in'}
          </button>
        </form>
      </div>
    </div>
  )
}
