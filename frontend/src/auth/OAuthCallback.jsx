import React, { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export default function OAuthCallback(){
  const navigate = useNavigate()
  const { search } = useLocation()
  useEffect(() => {
    const params = new URLSearchParams(search)
    const token = params.get('token')
    if (token) {
      localStorage.setItem('jwt', token)
      navigate('/', { replace: true })
    } else {
      navigate('/login', { replace: true })
    }
  }, [search, navigate])
  return <div className="center-card">Signing you in…</div>
}
