import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { fetchTickets } from '../api/ticketsApi'
import {
  BellIcon,
  ChevronDownIcon,
  FileTextIcon,
  LogoutIcon,
  MenuIcon,
  SearchIcon,
  TicketIcon,
} from './icons'

const TICKET_DETAIL_PATTERN = /^\/dashboard\/tickets\/(\d+)/

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia('(min-width: 992px)').matches,
  )

  useEffect(() => {
    const query = window.matchMedia('(min-width: 992px)')
    const handler = (event: MediaQueryListEvent) => setIsDesktop(event.matches)
    query.addEventListener('change', handler)
    return () => query.removeEventListener('change', handler)
  }, [])

  return isDesktop
}

export default function DashboardLayout() {
  const { agent, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isDesktop = useIsDesktop()

  const [sidebarOpen, setSidebarOpen] = useState(isDesktop)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [escalatedCount, setEscalatedCount] = useState<number | null>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    // Escalated-ticket count is the one obvious "notification" signal this API
    // already exposes (via the existing status filter) — no dedicated counts
    // endpoint exists, so this is a small dedicated fetch rather than reusing
    // TicketListPage's own (possibly differently-filtered) list.
    fetchTickets({ status: 'escalated' })
      .then((tickets) => {
        if (!cancelled) setEscalatedCount(tickets.length)
      })
      .catch(() => {
        if (!cancelled) setEscalatedCount(null)
      })
    return () => {
      cancelled = true
    }
  }, [location.pathname])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const ticketDetailMatch = location.pathname.match(TICKET_DETAIL_PATTERN)
  const isDocumentsPage = location.pathname === '/dashboard/documents'
  const isSidebarMini = isDesktop && !sidebarOpen

  return (
    <div className={`app-wrapper${isSidebarMini ? ' app-wrapper--mini' : ''}`}>
      {!isDesktop && sidebarOpen && (
        <div className="app-sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`app-sidebar${!isDesktop ? (sidebarOpen ? ' is-open' : '') : ''}`}>
        <Link to="/dashboard" className="app-sidebar__brand">
          <span className="app-sidebar__brand-mark">SD</span>
          <span className="app-sidebar__brand-name">Support Desk</span>
        </Link>

        <nav className="app-sidebar__nav">
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) =>
              `app-sidebar__link${isActive ? ' is-active' : ''}`
            }
          >
            <TicketIcon className="app-sidebar__link-icon" />
            <span className="app-sidebar__link-label">Tickets</span>
          </NavLink>

          {agent?.role === 'admin' && (
            <NavLink
              to="/dashboard/documents"
              className={({ isActive }) =>
                `app-sidebar__link${isActive ? ' is-active' : ''}`
              }
            >
              <FileTextIcon className="app-sidebar__link-icon" />
              <span className="app-sidebar__link-label">Documents</span>
            </NavLink>
          )}
        </nav>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <button
            type="button"
            className="app-header__icon-btn"
            aria-label="Toggle sidebar"
            onClick={() => setSidebarOpen((open) => !open)}
          >
            <MenuIcon />
          </button>

          <div className="app-header__search">
            <SearchIcon className="app-header__search-icon" />
            <input
              type="search"
              placeholder="Search (coming soon)"
              disabled
              title="Ticket search isn't wired up to an endpoint yet"
            />
          </div>

          <div className="app-header__right">
            <Link
              to="/dashboard"
              className="app-header__icon-btn app-header__notifications"
              title={
                escalatedCount === null
                  ? 'Escalated ticket count unavailable'
                  : `${escalatedCount} escalated ticket${escalatedCount === 1 ? '' : 's'}`
              }
            >
              <BellIcon />
              {escalatedCount !== null && escalatedCount > 0 && (
                <span className="app-header__badge">{escalatedCount}</span>
              )}
            </Link>

            <div className="app-header__user" ref={userMenuRef}>
              <button
                type="button"
                className="app-header__user-trigger"
                onClick={() => setUserMenuOpen((open) => !open)}
              >
                <span className="app-header__avatar">
                  {(agent?.name ?? '?').slice(0, 1).toUpperCase()}
                </span>
                <span className="app-header__user-text">
                  <span className="app-header__user-name">{agent?.name}</span>
                  <span className="app-header__user-role">{agent?.role}</span>
                </span>
                <ChevronDownIcon className="app-header__chevron" />
              </button>

              {userMenuOpen && (
                <div className="app-header__dropdown">
                  <div className="app-header__dropdown-header">
                    <strong>{agent?.name}</strong>
                    <span>{agent?.email}</span>
                  </div>
                  <button type="button" onClick={() => void handleLogout()}>
                    <LogoutIcon />
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="app-breadcrumb">
          <span>Dashboard</span>
          <span className="app-breadcrumb__sep">/</span>
          {isDocumentsPage ? (
            <span className="app-breadcrumb__current">Documents</span>
          ) : (
            <>
              <span className={ticketDetailMatch ? '' : 'app-breadcrumb__current'}>Tickets</span>
              {ticketDetailMatch && (
                <>
                  <span className="app-breadcrumb__sep">/</span>
                  <span className="app-breadcrumb__current">Ticket #{ticketDetailMatch[1]}</span>
                </>
              )}
            </>
          )}
        </div>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
