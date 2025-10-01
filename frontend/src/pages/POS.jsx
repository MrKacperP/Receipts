import React, { useState } from 'react'
import axios from 'axios'
import QRCode from 'qrcode'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const DEV_POS_KEY = import.meta.env.VITE_DEV_POS_KEY || 'dev_local_pos_key'

export default function POS(){
  const [merchant, setMerchant] = useState('Demo Coffee')
  const [items, setItems] = useState([{ name: 'Latte', price: 525 }])
  const [shortUrl, setShortUrl] = useState('')
  const [viewerUrl, setViewerUrl] = useState('')
  const [qr, setQr] = useState('')
  const [error, setError] = useState('')
  const [nfcStatus, setNfcStatus] = useState('')

  const total = items.reduce((s, it) => s + (Number(it.price)||0), 0)

  function addItem(){
    setItems([...items, { name: '', price: 0 }])
  }
  function updateItem(idx, field, value){
    const copy = [...items]
    copy[idx] = { ...copy[idx], [field]: field === 'price' ? Number(value) : value }
    setItems(copy)
  }
  function removeItem(idx){
    setItems(items.filter((_, i) => i !== idx))
  }

  async function mint(){
    setError(''); setShortUrl(''); setViewerUrl(''); setQr('')
    try {
      const receiptPayload = { merchant, items, total, timestamp: new Date().toISOString() }
      const { data } = await axios.post(`${API}/devpos/mint`, { receiptPayload }, { headers: { 'X-Dev-Pos-Key': DEV_POS_KEY }})
      setShortUrl(data.shortUrl)
      const viewer = `${window.location.origin}/r/${data.token}`
      setViewerUrl(viewer)
      const dataUrl = await QRCode.toDataURL(viewer, { width: 256, margin: 1 })
      setQr(dataUrl)
      setNfcStatus('')
    } catch (e) {
      setError('Mint failed. Is backend running and DEV_POS_KEY set?')
    }
  }

  async function writeNfc(){
    try {
      if (!('NDEFWriter' in window)) { setNfcStatus('Web NFC not supported on this device/browser.'); return }
      if (!viewerUrl) { setNfcStatus('Mint a receipt first.'); return }
      const writer = new window.NDEFWriter()
      await writer.write({ records: [{ recordType: 'url', data: viewerUrl }] })
      setNfcStatus('Wrote link to NFC tag. Tap phone to read.')
    } catch (e) {
      setNfcStatus('Failed to write NFC: ' + (e?.message || 'error'))
    }
  }

  return (
    <div className="center-card">
      <h2>POS Terminal (Dev)</h2>
      <div className="form" style={{ gap: 8 }}>
        <input placeholder="Merchant" value={merchant} onChange={e=>setMerchant(e.target.value)} />
        <div className="items">
          {items.map((it, idx) => (
            <div key={idx} className="item">
              <input placeholder="Item name" value={it.name} onChange={e=>updateItem(idx, 'name', e.target.value)} />
              <input placeholder="Price (cents)" type="number" value={it.price} onChange={e=>updateItem(idx, 'price', e.target.value)} />
              <button className="btn" onClick={()=>removeItem(idx)}>Remove</button>
            </div>
          ))}
          <button className="btn" onClick={addItem}>Add item</button>
        </div>
        <div className="total" style={{ display:'flex', justifyContent:'space-between' }}>
          <span>Total</span>
          <span>${(total/100).toFixed(2)}</span>
        </div>
        <button className="btn primary" onClick={mint}>Pay (Generate Link)</button>
      </div>
      {error && <div className="error" style={{ marginTop: 8 }}>{error}</div>}
      {shortUrl && (
        <div style={{ marginTop: 12, textAlign:'center' }}>
          <div className="muted">Scan with your phone</div>
          {qr && <img src={qr} alt="qr" style={{ width: 256, height:256 }} />}
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div>
              <span className="muted">Backend short link: </span>
              <a href={shortUrl} target="_blank" rel="noreferrer">{shortUrl}</a>
            </div>
            {viewerUrl && (
              <div>
                <span className="muted">Viewer link: </span>
                <a href={viewerUrl} target="_blank" rel="noreferrer">{viewerUrl}</a>
              </div>
            )}
            <div style={{ marginTop: 8 }}>
              <button className="btn" onClick={writeNfc}>Write to NFC tag</button>
              {nfcStatus && <div className="muted" style={{ marginTop: 6 }}>{nfcStatus}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
