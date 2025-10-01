import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App'
import Login from './auth/Login'
import Signup from './auth/Signup'
import OAuthCallback from './auth/OAuthCallback'
import Inbox from './pages/Inbox'
import ReceiptDetail from './pages/ReceiptDetail'
import ReceiptViewer from './pages/ReceiptViewer'
import QRScanner from './pages/QRScanner'
import ReceiptLanding from './pages/ReceiptLanding'
import TokenRedirect from './pages/TokenRedirect'
import POS from './pages/POS'
import './styles.css'

const root = createRoot(document.getElementById('root'))

function RequireAuth({ children }) {
  const token = localStorage.getItem('jwt')
  if (!token) return <Navigate to="/login" replace />
  return children
}

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RequireAuth><App /></RequireAuth>}>
          <Route index element={<Inbox />} />
          <Route path="receipts/:id" element={<ReceiptDetail />} />
        </Route>
        <Route path="/r" element={<ReceiptLanding />} />
        <Route path="/r/:token" element={<ReceiptViewer />} />
        <Route path="/scan" element={<QRScanner />} />
        <Route path="/pos" element={<POS />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
  <Route path="/oauth/callback" element={<OAuthCallback />} />
        {/* Catch navigating directly to '/<token>' and redirect to '/r/<token>' */}
        <Route path=":maybe" element={<TokenRedirect />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
