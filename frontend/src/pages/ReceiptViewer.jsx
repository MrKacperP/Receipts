import React, { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useParams } from 'react-router-dom'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function ReceiptViewer(){
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [claimMsg, setClaimMsg] = useState('')
  const cardRef = useRef(null)

  useEffect(() => {
    axios.get(`${API}/r/${token}`).then(r => setData(r.data)).catch(()=>setData({ error: true }))
  }, [token])

  async function saveImage(){
    const canvas = await html2canvas(cardRef.current)
    const link = document.createElement('a')
    link.download = `receipt-${data.id}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  async function savePDF(){
    const canvas = await html2canvas(cardRef.current)
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' })
    const width = pdf.internal.pageSize.getWidth()
    const ratio = canvas.height / canvas.width
    pdf.addImage(imgData, 'PNG', 20, 20, width-40, (width-40)*ratio)
    pdf.save(`receipt-${data.id}.pdf`)
  }

  const storeLink = 'https://apps.apple.com' // Replace with real deep links later

  if (!data) return <div className="center-card">Loading...</div>
  if (data.error) return <div className="center-card">Invalid or expired link.</div>

  const total = data.payload?.total || 0

  return (
    <div className="viewer">
      <div className="wallet-card" ref={cardRef}>
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
      <div className="actions">
        <button className="btn" onClick={saveImage}>Save Image</button>
        <button className="btn" onClick={savePDF}>Save PDF</button>
        <a className="btn primary" href={storeLink} target="_blank" rel="noreferrer">Get the App</a>
        <button className="btn" onClick={async () => {
          setClaimMsg('')
          const jwt = localStorage.getItem('jwt')
          if (!jwt) { setClaimMsg('Login first to save to Inbox.'); return }
          try {
            const { data: res } = await axios.post(`${API}/r/${token}/claim`, {}, { headers: { Authorization: `Bearer ${jwt}` }})
            if (res.ok) setClaimMsg('Saved to your Inbox!')
            else setClaimMsg('Could not save. Try again.')
          } catch (e) {
            setClaimMsg('Could not save. Link may be expired.')
          }
        }}>Save to Inbox</button>
      </div>
      {claimMsg && <div className="muted">{claimMsg}</div>}
    </div>
  )
}
