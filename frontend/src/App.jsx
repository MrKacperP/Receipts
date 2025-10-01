import React from 'react'
import { Outlet, Link, useNavigate } from 'react-router-dom'

export default function App() {
  const navigate = useNavigate()
  const logout = () => { localStorage.removeItem('jwt'); navigate('/login') }
  return (
    <div className="container">
      <header className="header">
        <div className="brand">Boleks Receipt</div>
        <nav>
          <Link to="/">Inbox</Link>
          <Link to="/scan">Scan QR</Link>
          <Link to="/pos">POS</Link>
          <button className="btn" onClick={logout}>Logout</button>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
