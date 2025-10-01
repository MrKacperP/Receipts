import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function submit(e) {
    e.preventDefault()
    setError('')
    try {
      const { data } = await axios.post(`${API}/auth/login`, { email, password })
      localStorage.setItem('jwt', data.token)
      navigate('/')
    } catch (err) {
      setError('Login failed')
    }
  }

  return (
    <div className="center-card">
      <h1>Welcome back</h1>
      <form onSubmit={submit} className="form">
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        {error && <div className="error">{error}</div>}
        <button className="btn primary" type="submit">Login</button>
      </form>
      <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:12 }}>
        <button className="btn" onClick={async () => {
          // Dev admin quick login: email=1, password=1
          try {
            const { data } = await axios.post(`${API}/auth/login`, { email: '1', password: '1' })
            localStorage.setItem('jwt', data.token)
            navigate('/')
          } catch {
            setError('Admin quick login failed')
          }
        }}>Admin quick login</button>
        <a className="btn" href={`${API}/auth/google/start`}>Continue with Google</a>
      </div>
      <div className="muted">No account? <Link to="/signup">Sign up</Link></div>
    </div>
  )
}
