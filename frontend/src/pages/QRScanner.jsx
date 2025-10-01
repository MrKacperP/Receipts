import React, { useEffect, useRef, useState } from 'react'
import { BrowserQRCodeReader } from '@zxing/browser'

export default function QRScanner(){
  const videoRef = useRef(null)
  const [error, setError] = useState('')
  const [manual, setManual] = useState('')

  useEffect(() => {
    let reader = new BrowserQRCodeReader()
    let canceled = false
    async function start(){
      try {
        const videoElem = videoRef.current
        if (!videoElem) return
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoElem,
          (result, err) => {
            if (canceled) return
            if (result) {
              const url = result.getText()
              window.location.href = url
            }
          }
        )
        return () => controls?.stop()
      } catch (e) {
        setError('Camera unavailable. Use manual input below.')
      }
    }
    const stop = start()
    return () => { canceled = true; if (typeof stop === 'function') stop() }
  }, [])

  const openManual = (e) => {
    e.preventDefault()
    if (manual) window.location.href = manual
  }

  return (
    <div className="center-card">
      <h2>Scan Receipt QR</h2>
      <div className="qr-box">
        <video ref={videoRef} style={{ width: '100%', borderRadius: 12 }} muted playsInline />
      </div>
      {error && <div className="error" style={{ marginTop: 8 }}>{error}</div>}
      <form onSubmit={openManual} className="form" style={{ marginTop: 12 }}>
        <input placeholder="https://... or /r/:token" value={manual} onChange={e=>setManual(e.target.value)} />
        <button className="btn" type="submit">Open</button>
      </form>
    </div>
  )
}
