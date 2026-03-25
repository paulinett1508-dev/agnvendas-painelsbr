import { useState, useEffect, useCallback } from 'react'
import type { Vendedor, DashboardRow, PositivacaoRow, Top5Item } from '../types'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export function useVendedores() {
  const [data, setData] = useState<Vendedor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const d = await fetchJson<Vendedor[]>('/vendedores')
      setData(d)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  return { data, loading, error, reload: load }
}

export function useDashboardLatest() {
  const [data, setData] = useState<DashboardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const raw = await fetchJson<Record<string, unknown>[]>('/dashboard/latest')
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
  }, [])

  useEffect(() => { load() }, [load])
  return { data, loading, error, reload: load }
}

export function usePositivacaoLatest() {
  const [data, setData] = useState<PositivacaoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const raw = await fetchJson<Record<string, unknown>[]>('/positivacao/latest')
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
  }, [])

  useEffect(() => { load() }, [load])
  return { data, loading, error, reload: load }
}

export function useTop5(slpcode: string | null) {
  const [data, setData] = useState<Top5Item[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!slpcode) { setData([]); return }
    setLoading(true)
    fetchJson<Top5Item[]>(`/top5itens/${slpcode}`)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [slpcode])

  return { data, loading }
}
