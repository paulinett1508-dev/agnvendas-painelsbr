import { useState, useEffect, useCallback } from 'react'
import type { Vendedor, DashboardRow, PositivacaoRow, Top5Item } from '../types'
import { useAuth } from '../context/AuthContext'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

async function fetchJson<T>(path: string, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API}${path}`, { headers, credentials: 'include' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export function useVendedores() {
  const { accessToken } = useAuth()
  const [data, setData] = useState<Vendedor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const d = await fetchJson<Vendedor[]>('/vendedores', accessToken)
      setData(d)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => { load() }, [load])
  return { data, loading, error, reload: load }
}

export function useDashboardLatest() {
  const { accessToken } = useAuth()
  const [data, setData] = useState<DashboardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const raw = await fetchJson<Record<string, unknown>[]>('/dashboard/latest', accessToken)
      // Response comes as { snapshots_dashboard: {...}, latest: {...} } when joined
      const rows = raw.map((r) => {
        const inner = (r['snapshots_dashboard'] ?? r) as DashboardRow
        return inner
      })
      setData(rows)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => { load() }, [load])
  return { data, loading, error, reload: load }
}

export function usePositivacaoLatest() {
  const { accessToken } = useAuth()
  const [data, setData] = useState<PositivacaoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const raw = await fetchJson<Record<string, unknown>[]>('/positivacao/latest', accessToken)
      const rows = raw.map((r) => {
        const inner = (r['snapshots_positivacao'] ?? r) as PositivacaoRow
        return inner
      })
      setData(rows)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => { load() }, [load])
  return { data, loading, error, reload: load }
}

export function useTop5(slpcode: string | null) {
  const { accessToken } = useAuth()
  const [data, setData] = useState<Top5Item[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!slpcode) { setData([]); return }
    setLoading(true)
    fetchJson<Top5Item[]>(`/top5itens/${slpcode}`, accessToken)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [slpcode, accessToken])

  return { data, loading }
}
