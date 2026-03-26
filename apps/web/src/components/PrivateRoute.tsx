import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function PrivateRoute({ children }: { children: ReactNode }) {
  const { accessToken, refresh } = useAuth()
  const [checking, setChecking] = useState(!accessToken)

  useEffect(() => {
    if (accessToken) return
    refresh().finally(() => setChecking(false))
  }, [accessToken, refresh])

  if (checking) return <div className="min-h-screen flex items-center justify-center bg-dark-950" />
  if (!accessToken) return <Navigate to="/login" replace />
  return <>{children}</>
}
