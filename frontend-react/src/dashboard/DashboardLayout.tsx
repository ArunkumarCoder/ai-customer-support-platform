import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function DashboardLayout() {
  const { agent, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <Link to="/dashboard" className="dashboard-logo">
          Support Desk
        </Link>

        <div className="dashboard-header-right">
          <span className="agent-name">{agent?.name}</span>
          <span className="agent-role">{agent?.role}</span>
          <button type="button" className="btn-secondary" onClick={() => void handleLogout()}>
            Log out
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <Outlet />
      </main>
    </div>
  )
}
