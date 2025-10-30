// Modern POS with scanning, enrichment, discounts, NFC evergreen, and dynamic links
import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import QRCode from 'qrcode'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { DecodeHintType, BarcodeFormat } from '@zxing/library'
import { patternDataUrl } from '../lib/imageGen'

function detectApiBase(){
  const env = import.meta.env.VITE_API_URL
  if (env) return env.replace(/\/$/, '')
  return window.location.origin + '/api'
}
const INITIAL_API = detectApiBase()

const API = import.meta.env.VITE_API_URL || 'http://localhost:5050'
const DEV_POS_KEY = import.meta.env.VITE_DEV_POS_KEY || 'dev_local_pos_key'
const PUBLIC_ORIGIN = import.meta.env.VITE_PUBLIC_ORIGIN || ''

export default function POS(){
  const [merchant, setMerchant] = useState('')
  const [items, setItems] = useState([])
  const [shortUrl, setShortUrl] = useState('')
  const [viewerUrl, setViewerUrl] = useState('')
  const [dynamicSlug, setDynamicSlug] = useState('register-1')
  const [dynamicUrl, setDynamicUrl] = useState('')
  const [qr, setQr] = useState('')
  const [error, setError] = useState('')
  const [nfcStatus, setNfcStatus] = useState('')
  const [minting, setMinting] = useState(false)

  const [scanMode, setScanMode] = useState(false)
  const videoRef = useRef(null)
  const [devices, setDevices] = useState([])
  const [deviceId, setDeviceId] = useState('')
  const [scanError, setScanError] = useState('')

  const [showReceipt, setShowReceipt] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [taxPercent, setTaxPercent] = useState(0)
  const [tipPercent, setTipPercent] = useState(0)
  const [discountPercent, setDiscountPercent] = useState(0)
  const [militaryDiscount, setMilitaryDiscount] = useState(false)
  const [itemModal, setItemModal] = useState(false)
  const [itemTab, setItemTab] = useState('scan')
  const [codeInput, setCodeInput] = useState('')
  const [manualItem, setManualItem] = useState({ name: '', price: '', qty: 1 })
  const [showTaxModal, setShowTaxModal] = useState(false)
  const [showDiscountModal, setShowDiscountModal] = useState(false)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [showScanReceiptModal, setShowScanReceiptModal] = useState(false)
  const [returnMode, setReturnMode] = useState(false)
  const [pendingToken, setPendingToken] = useState('')
  const [openedPopup, setOpenedPopup] = useState(false)
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '' })
  const [receiptCode, setReceiptCode] = useState('')

  const [autoCamera, setAutoCamera] = useState(()=> localStorage.getItem('pos_auto_camera') !== '0')
  const [continuousScan, setContinuousScan] = useState(()=> localStorage.getItem('pos_cont_scan') === '1')
  const [autoWriteNfc, setAutoWriteNfc] = useState(()=> localStorage.getItem('pos_auto_write_nfc') === '1')
  const [autoClearAfterMint, setAutoClearAfterMint] = useState(()=> localStorage.getItem('pos_auto_clear') === '1')

  useEffect(() => { if (!merchant) setMerchant('Point of Sale') }, [merchant])

  const subTotal = items.reduce((s, it) => s + (Number(it.price)||0) * (Number(it.qty)||1), 0)
  const appliedDiscount = Math.round(subTotal * ((discountPercent + (militaryDiscount ? 10 : 0)) / 100))
  const taxAmt = Math.round(subTotal * (taxPercent/100))
  const tipAmt = Math.round(subTotal * (tipPercent/100))
  const total = subTotal + taxAmt + tipAmt - appliedDiscount

  function generateId(){ return Math.random().toString(36).slice(2,10) }
  function addItem(){ setItems(prev => [...prev, { id: generateId(), name: '', price: 0, qty: 1 }]) }
  function updateItem(idx, field, value){
    setItems(prev => prev.map((it,i)=>{
      if (i!==idx) return it
      if (field === 'price') {
        const numeric = Number((value || '0').toString().replace(/[^0-9.]/g, ''))
        return { ...it, price: Math.round(numeric * 100) }
      } else if (field === 'qty') {
        const q = Math.max(1, Math.round(Number(value)||1))
        return { ...it, qty: q }
      } else { return { ...it, [field]: value } }
    }))
  }
  function removeItem(idx){ setItems(prev => prev.filter((_, i) => i !== idx)) }
  function incQty(idx){ updateItem(idx,'qty',(items[idx].qty||1)+1) }
  function decQty(idx){ updateItem(idx,'qty',(items[idx].qty||1)-1) }
  function updateItemById(id, patch){ setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it)) }

  async function enrichCode(id, code){
    try {
      const r = await fetch(`${API}/products/${encodeURIComponent(code)}`)
      if (!r.ok) {
        if (r.status === 404) {
          const data = await r.json()
          updateItemById(id, { 
            pending: false, 
            notFound: true, 
            name: data.code || code,
            enrichFailed: true 
          })
          return
        }
        throw new Error('lookup_failed')
      }
      const product = await r.json()
      const patch = {
        name: product.name || code,
        price: product.msrp_cents || 0,
        image: product.image_url || null,
        sku: product.sku,
        barcode: product.barcode,
        category: product.category,
        pending: false,
        notFound: false,
        enrichFailed: false
      }
      updateItemById(id, patch)
    } catch (err) {
      console.error('Product lookup error:', err)
      updateItemById(id, { pending: false, enrichFailed: true, name: code })
    }
  }
  function addScannedCode(raw){
    if (raw.includes('|')) {
      const [n,p] = raw.split('|')
      const num = Number(p)
      const priceCents = isNaN(num) ? 0 : Math.round(num*100)
      setItems(prev => [...prev, { id: generateId(), name: n || raw, price: priceCents, qty: 1 }])
      return
    }
    const id = generateId()
    setItems(prev => [...prev, { id, name: raw, price: 0, qty: 1, code: raw, pending: true, enrichFailed:false }])
    enrichCode(id, raw)
  }

  async function mint(){
    if (minting) return
    if (!items.length) { setError('Add at least one item before minting.'); return }
    setError(''); setShortUrl(''); setViewerUrl(''); setQr(''); setMinting(true)
    try {
      const code = Math.random().toString(36).slice(2,8).toUpperCase()
      setReceiptCode(code)
      const receiptPayload = { merchant, items, subTotal, taxAmt, tipAmt, total, timestamp: new Date().toISOString(), customer, receiptCode: code, returnMode }
      const { data } = await axios.post(`${API}/devpos/mint`, { receiptPayload, dynamicSlug }, { headers: { 'X-Dev-Pos-Key': DEV_POS_KEY }})
      setShortUrl(data.shortUrl)
      if (data.dynamicUrl) setDynamicUrl(data.dynamicUrl)
      const origin = PUBLIC_ORIGIN || window.location.origin
      const viewer = `${origin}/r/${data.token}`
      setViewerUrl(viewer); setPendingToken(data.token)
      const dataUrl = await QRCode.toDataURL(viewer, { width: 256, margin: 1 })
      setQr(dataUrl); setNfcStatus('')
      setShowReceipt(true)
      if (autoWriteNfc) setTimeout(()=>{ if(dynamicUrl) writeNfc() }, 300)
      if (autoClearAfterMint) setTimeout(()=> setItems([]), 200)
    } catch (e) {
      const msg = e?.response?.status === 401 ? 'Unauthorized: check DEV_POS_KEY.' : 'Mint failed. Ensure backend is running.'
      setError(msg)
    } finally { setMinting(false) }
  }

  async function writeNfc(){
    try {
      if (!('NDEFWriter' in window)) { setNfcStatus('Web NFC not supported on this device/browser.'); return }
      if (!dynamicSlug) { setNfcStatus('Set a dynamic slug first.'); return }
      if (!dynamicUrl) { setNfcStatus('Mint a receipt first (need dynamicUrl).'); return }
      const writer = new window.NDEFWriter()
      await writer.write({ records: [{ recordType: 'url', data: dynamicUrl }] })
      setNfcStatus(`Wrote evergreen link to NFC tag (${dynamicUrl}).`)
    } catch (e) { setNfcStatus('Failed to write NFC: ' + (e?.message || 'error')) }
  }

  // Scanner lifecycle
  useEffect(() => {
    let reader; let stopped = false
    async function startScan(){
      setScanError('')
      if (!scanMode || !videoRef.current) return
      const hints = new Map()
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.QR_CODE,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.ITF,
        BarcodeFormat.DATA_MATRIX
      ])
      reader = new BrowserMultiFormatReader(hints)
      try {
        let vids = []
        try { vids = await BrowserMultiFormatReader.listVideoInputDevices() } catch { vids = [] }
        setDevices(vids)
        let chosen = deviceId
        if (!chosen && vids.length) {
          const back = vids.find(d => /back|rear|environment/i.test(d.label)) || vids[vids.length-1]
          chosen = back?.deviceId; if (chosen) setDeviceId(chosen)
        }
        videoRef.current.setAttribute('playsinline','true')
        videoRef.current.setAttribute('autoplay','true')
        videoRef.current.setAttribute('muted','true')
        await reader.decodeFromVideoDevice(chosen || undefined, videoRef.current, (result, err) => {
          if (stopped) return
          if (result) {
            const txt = result.getText()
            addScannedCode(txt)
            if (!continuousScan) { setScanMode(false); setItemModal(false); reader?.reset() }
          }
        })
      } catch (e) {
        const msg = String(e?.message || e || '')
        if (/denied|permission/i.test(msg)) setScanError('Camera permission denied. Click Allow in browser bar or retry below.')
        else if (!window.isSecureContext) setScanError('Camera requires HTTPS or localhost.')
        else setScanError('Could not start camera.')
      }
    }
    startScan(); return () => { stopped = true; try { if (reader && typeof reader.reset === 'function') reader.reset() } catch {} }
  }, [scanMode, deviceId, continuousScan])

  function closeAllModals(){ setItemModal(false); setScanMode(false); setOpenedPopup(false); setShowTaxModal(false); setShowDiscountModal(false); setShowCustomerModal(false); setShowReturnModal(false); setShowScanReceiptModal(false); setShowSettings(false) }

  return (
    <div className={`pos-grid ${returnMode ? 'return-mode' : ''}`}>
      <div className="pos-left">
        <div className="pane">
          <div className="stack">
            <button className={`btn xl control sale ${!returnMode?'return-mode-active':''}`} onClick={()=>{ setReturnMode(false) }}><span className="icon">💳</span>Sale</button>
            <button className={`btn xl control return ${returnMode?'return-mode-active':''}`} onClick={()=>{ setReturnMode(true); setShowReturnModal(true) }}><span className="icon">↩️</span>Return</button>
            <button className="btn xl control scan" onClick={()=>{ setItemModal(true); setItemTab('scan'); setScanMode(true) }}><span className="icon">📷</span>Scan / Add Item</button>
            <button className="btn xl control receipt" onClick={()=>{ setShowScanReceiptModal(true); setScanMode(true) }}><span className="icon">🧾</span>Scan Receipt</button>
            <button className="btn xl control discount" onClick={()=>setShowDiscountModal(true)}><span className="icon">🏷️</span>Discount</button>
            <button className="btn xl control tax" onClick={()=>setShowTaxModal(true)}><span className="icon">💲</span>Tax</button>
            <button className="btn xl control customer" onClick={()=>setShowCustomerModal(true)}><span className="icon">👤</span>Customer</button>
            <button className="btn xl control settings" onClick={()=>setShowSettings(true)}><span className="icon">⚙️</span>Settings</button>
            <Link className="btn xl control history" to="/"><span className="icon">📚</span>Inbox</Link>
          </div>
        </div>
      </div>
      <div className="pos-right">
        <div className="pane">
          <div className="pos-cart-head" style={{ alignItems:'flex-start', gap:14, flexWrap:'wrap' }}>
            <div style={{ display:'flex', flexDirection:'column', minWidth:180 }}>
              <div className="merchant-title">{merchant || 'Point of Sale'}</div>
              <div className="muted" style={{ fontSize:12, letterSpacing:'.5px' }}>{returnMode ? 'RETURN MODE' : 'SALE MODE'}</div>
            </div>
            <div className="grow" />
            {(customer.name || customer.phone || customer.email) ? (
              <button className="customer-add-btn" onClick={()=>setShowCustomerModal(true)} style={{ background:'#10b981', color:'#fff' }}>
                <span style={{ fontSize:18 }}>👤</span> {customer.name || customer.phone || customer.email}
              </button>
            ) : (
              <button className="customer-add-btn" onClick={()=>setShowCustomerModal(true)}>
                <span style={{ fontSize:18 }}>➕</span> Customer
              </button>
            )}
          </div>
          <div className="items">
            {items.map((it, idx) => (
              <div key={it.id || idx} className={`item ${it.pending?'pending':''} ${it.enrichFailed?'failed':''}`}>
                <img alt="thumb" style={{ width: 46, height: 46, borderRadius: 12, objectFit: 'cover', marginRight: 4, opacity: it.pending?0.5:1 }} src={it.image || patternDataUrl(it.name || 'Item', 40)} />
                {it.pending && <div className="spinner" style={{ position:'absolute', width:18, height:18 }} />}
                <input className="item-name" style={{ maxWidth:180 }} placeholder="Item" value={it.pending ? '...' : it.name} disabled={it.pending} onChange={e=>updateItem(idx,'name',e.target.value)} />
                <div className="qty inline">
                  <button className="icon-btn" onClick={()=>decQty(idx)}>-</button>
                  <input className="qty-input" value={it.qty||1} onChange={e=>updateItem(idx,'qty',e.target.value)} />
                  <button className="icon-btn" onClick={()=>incQty(idx)}>+</button>
                </div>
                <input className="item-price" style={{ width:80 }} placeholder="0.00" inputMode="decimal" value={(it.price/100).toFixed(2)} disabled={it.pending} onChange={e=>updateItem(idx,'price',e.target.value)} />
                <div className="line-total">${(((it.price||0)*(it.qty||1))/100).toFixed(2)}</div>
                {it.enrichFailed && (
                  <button className="icon-btn" title="Retry lookup" onClick={()=>{ updateItemById(it.id,{ pending:true, enrichFailed:false }); enrichCode(it.id, it.code) }}>↻</button>
                )}
                {it.notFound && <div style={{ fontSize:10, color:'#ef4444', fontWeight:600 }}>NOT FOUND</div>}
                {!it.enrichFailed && !it.notFound && it.sku && <div style={{ fontSize:10, color:'#10b981', fontWeight:600 }}>✓ {it.sku}</div>}
                <button className="icon-btn" onClick={()=>removeItem(idx)}>✖️</button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="paybar">
        <div className="pb-left">
          <div>Subtotal: ${(subTotal/100).toFixed(2)}</div>
          <div>Tax: {(taxAmt/100).toFixed(2)}{tipPercent>0?` | Tip: ${(tipAmt/100).toFixed(2)}`:''}</div>
          {appliedDiscount>0 && <div style={{ color:'#f59e0b' }}>Discount: -{(appliedDiscount/100).toFixed(2)}</div>}
        </div>
        <div className="pb-right">
          <button className="btn lg" onClick={()=>{ setItems([]) }}>Clear</button>
          <button className={`btn pay ${returnMode?'refund':''}`} disabled={minting} onClick={mint}>
            {minting ? 'Processing…' : (returnMode ? 'Refund' : 'Pay')} ${(total/100).toFixed(2)}
          </button>
        </div>
      </div>

      {error && (
        <div className="pay-error" style={{ position:'fixed', bottom: '82px', right: '14px', background:'#dc2626', color:'#fff', padding:'10px 14px', borderRadius:12, display:'flex', alignItems:'center', gap:10, maxWidth:360, boxShadow:'0 4px 14px -2px rgba(0,0,0,.4)', fontSize:13, zIndex:260 }}>
          <span style={{ fontWeight:600 }}>Error</span>
          <span style={{ flex:1 }}>{error}</span>
          <button onClick={()=>setError('')} style={{ background:'rgba(255,255,255,.15)', border:'none', color:'#fff', padding:'4px 8px', borderRadius:6, cursor:'pointer' }}>✖</button>
        </div>
      )}

      {showReceipt && (
        <div className="receipt-modal" onClick={()=>setShowReceipt(false)}>
          <div className="receipt-content" onClick={e=>e.stopPropagation()}>
            <h2>Scan to view receipt</h2>
            {qr && (
              <div style={{ marginBottom: 14 }}>
                <img src={qr} alt="qr" style={{ width: 260, height:260 }} />
                {shortUrl && <div className="muted" style={{ marginTop: 8 }}><a href={shortUrl} target="_blank" rel="noreferrer">{shortUrl}</a></div>}
              </div>
            )}
            {dynamicUrl && (
              <div style={{ fontSize:12, marginBottom:8 }}>
                <div style={{ fontWeight:600 }}>Evergreen dynamic link:</div>
                <div style={{ wordBreak:'break-all' }}><a href={dynamicUrl} target="_blank" rel="noreferrer">{dynamicUrl}</a></div>
              </div>
            )}
            {receiptCode && <div className="muted">Receipt code: {receiptCode}</div>}
            {dynamicUrl && <div style={{ display:'flex', gap: 8, justifyContent:'center', marginTop: 8 }}><button className="btn" onClick={writeNfc}>Write NFC (evergreen)</button></div>}
            <div style={{ display:'flex', gap: 10, marginTop: 12 }}>
              <button className="btn" onClick={()=>{ setShowReceipt(false) }}>Close</button>
              <button className="btn primary" onClick={()=>{ setItems([]); setShowReceipt(false); setShortUrl(''); setViewerUrl(''); setQr(''); setCustomer({ name:'', phone:'', email:'' }) }}>New transaction</button>
            </div>
          </div>
        </div>
      )}

      {itemModal && (
        <div className="receipt-modal" onClick={closeAllModals}>
          <div className="receipt-content" onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}><h3>Item</h3><button className="icon-btn" onClick={closeAllModals}>✖️</button></div>
            <div style={{ display:'flex', gap: 8, marginBottom: 10, justifyContent:'center' }}>
              <button className={`tab ${itemTab==='scan'?'active':''}`} onClick={()=>{ setItemTab('scan'); setScanMode(true) }}>Scan</button>
              <button className={`tab ${itemTab==='manual'?'active':''}`} onClick={()=>{ setItemTab('manual'); setScanMode(false) }}>Manual</button>
            </div>
            {itemTab==='scan' && (
              <>
                {devices.length>0 && (
                  <div style={{ marginBottom: 8, display:'flex', gap:8, alignItems:'center' }}>
                    <label className="muted">Camera:</label>
                    <select value={deviceId} onChange={e=>setDeviceId(e.target.value)}>
                      {devices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(-4)}`}</option>)}
                    </select>
                  </div>
                )}
                <div style={{ position:'relative' }}>
                  <video ref={videoRef} style={{ width:'100%', borderRadius:12 }} muted playsInline />
                </div>
                {!!scanError && (
                  <div className="error" style={{ marginTop:6, display:'grid', gap:6 }}>
                    <div>{scanError}</div>
                  </div>
                )}
                <div style={{ marginTop:10, display:'grid', gap:8 }}>
                  <div style={{ display:'flex', gap:8 }}>
                    <input placeholder="Paste code or URL" value={codeInput} onChange={e=>setCodeInput(e.target.value)} />
                    <button className="btn" onClick={async ()=>{ const txt = codeInput.trim(); if (!txt) return; addScannedCode(txt); setItemModal(false) }}>Lookup</button>
                  </div>
                </div>
              </>
            )}
            {itemTab==='manual' && (
              <div style={{ display:'grid', gap:8 }}>
                <input placeholder="Item name" value={manualItem.name} onChange={e=>setManualItem(v=>({...v,name:e.target.value}))} />
                <input placeholder="Price (e.g. 3.99)" inputMode="decimal" value={manualItem.price} onChange={e=>setManualItem(v=>({...v,price:e.target.value}))} />
                <div className="qty compact" style={{ justifyContent:'flex-start' }}>
                  <span className="muted">Qty</span>
                  <button className="icon-btn" onClick={()=>setManualItem(v=>({...v, qty: Math.max(1, Number(v.qty||1)-1)}))}>-</button>
                  <input className="qty-input" value={manualItem.qty} onChange={e=>setManualItem(v=>({...v, qty: Math.max(1, Number(e.target.value)||1)}))} />
                  <button className="icon-btn" onClick={()=>setManualItem(v=>({...v, qty: Number(v.qty||1)+1}))}>+</button>
                </div>
                <button className="btn primary" onClick={()=>{ const cents = Math.round((Number(String(manualItem.price).replace(/[^0-9.]/g,''))||0)*100); if(!manualItem.name||cents<=0) return; setItems(prev=>[...prev,{ id: generateId(), name: manualItem.name, price: cents, qty: Number(manualItem.qty)||1 }]); setManualItem({ name:'', price:'', qty:1 }); setItemModal(false) }}>Add Item</button>
              </div>
            )}
          </div>
        </div>
      )}

      {showDiscountModal && (
        <div className="receipt-modal" onClick={closeAllModals}>
          <div className="receipt-content" onClick={e=>e.stopPropagation()}>
            <h3>Add Discount</h3>
            <div className="items" style={{ marginTop:8 }}>
              <div className="item" style={{ alignItems:'center' }}>
                <span style={{ minWidth:100 }}>Discount %</span>
                <input inputMode="decimal" value={discountPercent} onChange={e=>setDiscountPercent(Number(e.target.value)||0)} />
                <label style={{ marginLeft:8 }}><input type="checkbox" checked={militaryDiscount} onChange={e=>setMilitaryDiscount(e.target.checked)} /> Military 10%</label>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTaxModal && (
        <div className="receipt-modal" onClick={closeAllModals}>
          <div className="receipt-content" onClick={e=>e.stopPropagation()}>
            <h3>Add Tax</h3>
            <div className="items" style={{ marginTop:8 }}>
              <div className="item" style={{ alignItems:'center' }}>
                <span style={{ minWidth:100 }}>Tax %</span>
                <input inputMode="decimal" value={taxPercent} onChange={e=>setTaxPercent(Number(e.target.value)||0)} />
              </div>
            </div>
          </div>
        </div>
      )}

      {showCustomerModal && (
        <div className="receipt-modal" onClick={closeAllModals}>
          <div className="receipt-content" onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h3>Customer Information</h3>
              <button className="icon-btn" onClick={closeAllModals}>✖️</button>
            </div>
            <div style={{ display:'grid', gap:12 }}>
              <div>
                <label className="muted" style={{ display:'block', marginBottom:4, fontSize:12 }}>Name</label>
                <input 
                  placeholder="Customer name" 
                  value={customer.name} 
                  onChange={e=>setCustomer(prev=>({...prev, name:e.target.value}))} 
                  style={{ width:'100%' }}
                />
              </div>
              <div>
                <label className="muted" style={{ display:'block', marginBottom:4, fontSize:12 }}>Phone</label>
                <input 
                  placeholder="Phone number" 
                  value={customer.phone} 
                  onChange={e=>setCustomer(prev=>({...prev, phone:e.target.value}))} 
                  style={{ width:'100%' }}
                  type="tel"
                />
              </div>
              <div>
                <label className="muted" style={{ display:'block', marginBottom:4, fontSize:12 }}>Email</label>
                <input 
                  placeholder="Email address" 
                  value={customer.email} 
                  onChange={e=>setCustomer(prev=>({...prev, email:e.target.value}))} 
                  style={{ width:'100%' }}
                  type="email"
                />
              </div>
              <div style={{ display:'flex', gap:8, marginTop:8 }}>
                <button className="btn" onClick={()=>{ setCustomer({ name:'', phone:'', email:'' }); closeAllModals() }}>Clear</button>
                <button className="btn primary" onClick={closeAllModals}>Save</button>
              </div>
            </div>
            {(customer.name || customer.phone || customer.email) && (
              <div style={{ marginTop:16, padding:12, background:'#f1f5f9', borderRadius:8 }}>
                <div className="muted" style={{ fontSize:11, marginBottom:6 }}>Current Customer:</div>
                {customer.name && <div style={{ fontSize:13 }}><strong>{customer.name}</strong></div>}
                {customer.phone && <div style={{ fontSize:13 }}>{customer.phone}</div>}
                {customer.email && <div style={{ fontSize:13 }}>{customer.email}</div>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
