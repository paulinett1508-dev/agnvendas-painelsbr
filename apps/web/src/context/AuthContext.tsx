import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface AuthState {
  accessToken: string | null
  login: (email: string, senha: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<boolean>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null)

  const login = useCallback(async (email: string, senha: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
      credentials: 'include',
    })
    if (!res.ok) {
      const { error } = await res.json()
      throw new Error(error ?? 'Erro ao fazer login')
    }
    const { accessToken } = await res.json()
    setAccessToken(accessToken)
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: 'include',
    }).catch(() => {})
    setAccessToken(null)
  }, [accessToken])

  const refresh = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) return false
      const { accessToken } = await res.json()
      setAccessToken(accessToken)
      return true
    } catch {
      return false
    }
  }, [])

  return (
    <AuthContext.Provider value={{ accessToken, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
