import React from 'react'
import { Navigate, useParams } from 'react-router-dom'

export default function TokenRedirect(){
  const { maybe } = useParams()
  // If path is just a token (no slash), redirect to /r/:token
  if (maybe && !maybe.includes('/')) {
    return <Navigate to={`/r/${maybe}`} replace />
  }
  return <Navigate to="/" replace />
}
