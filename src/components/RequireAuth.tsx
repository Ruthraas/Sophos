import { Navigate } from 'react-router'
import type { ReactNode } from 'react'
import { useAuth } from '../features/auth/AuthContext'

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return null
  if (!session) return <Navigate to="/entrar" replace />
  return children
}
