import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useParams } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function ReceiptDetail(){
  const { id } = useParams()
  const [data, setData] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('jwt')
    axios.get(`${API}/receipts/${id}`, { headers: { Authorization: `Bearer ${token}` }})
      .then(r => setData(r.data))
      .catch(() => setData(null))
  }, [id])

  if (!data) return <div className="muted">Loading...</div>

  const total = data.payload?.total || 0

  return (
    <div className="viewer">
      <div className="wallet-card">
        <div className="merchant">{data.payload?.merchant || `Merchant #${data.merchant_id}`}</div>
        <div className="muted">{new Date(data.created_at).toLocaleString()}</div>
        <div className="items">
          {(data.payload?.items || []).map((it, idx) => (
            <div key={idx} className="item">
              <span>{it.name}</span>
              <span>${(it.price/100).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="total">
          <span>Total</span>
          <span>${(total/100).toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}
