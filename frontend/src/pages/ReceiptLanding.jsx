import React from 'react'
import { Link } from 'react-router-dom'

export default function ReceiptLanding(){
  return (
    <div className="center-card">
      <h2>Receipt Link</h2>
      <p className="muted">This link is missing a token. You likely opened <code>/r/</code> without a token.</p>
      <p>To view a receipt, use a URL like: <code>/r/&lt;token&gt;</code></p>
      <div style={{marginTop: 12}}>
        <Link className="btn" to="/">Go to Inbox</Link>
      </div>
    </div>
  )
}
