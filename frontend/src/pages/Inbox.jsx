import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function Inbox(){
  const [items, setItems] = useState([])

  useEffect(() => {
    const token = localStorage.getItem('jwt')
    axios.get(`${API}/receipts`, { headers: { Authorization: `Bearer ${token}` }})
      .then(r => setItems(r.data.receipts || []))
      .catch(() => setItems([]))
  }, [])

  return (
    <div className="list">
      <h2>Your receipts</h2>
      {items.length === 0 && <div className="muted">No receipts yet.</div>}
      {items.map(r => (
        <Link key={r.id} to={`/receipts/${r.id}`} className="card">
          <div className="merchant">Merchant #{r.merchant_id || 'N/A'}</div>
          <div className="muted">{new Date(r.created_at).toLocaleString()}</div>
        </Link>
      ))}
    </div>
  )
}
