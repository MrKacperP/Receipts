import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function submit(e) {
    e.preventDefault()
    setError('')
    try {
      const { data } = await axios.post(`${API}/auth/signup`, { email, password })
      localStorage.setItem('jwt', data.token)
      navigate('/')
    } catch (err) {
      setError('Signup failed')
    }
  }

  return (
    <div className="center-card">
      <h1>Create account</h1>
      <form onSubmit={submit} className="form">
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        {error && <div className="error">{error}</div>}
        <button className="btn primary" type="submit">Sign up</button>
      </form>
      <div className="muted">Have an account? <Link to="/login">Log in</Link></div>
    </div>
  )
}
