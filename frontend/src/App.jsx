import React from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const isPOS = location.pathname === '/' || location.pathname.startsWith('/pos')
  const logout = () => { localStorage.removeItem('jwt'); navigate('/login') }
  return (
    <div className={"shell" + (isPOS ? ' pos-full' : '')}>
      <aside className="sidebar">
        <div className="brand">Boleks Receipt</div>
        <nav className="side-nav">
          <Link className="side-link" to="/pos">POS</Link>
          <Link className="side-link" to="/">Inbox</Link>
          <Link className="side-link" to="/scan">Scan QR</Link>
          <button className="btn" onClick={logout}>Logout</button>
        </nav>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
