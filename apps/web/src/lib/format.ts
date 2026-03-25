export function formatBRL(value: string | number | null | undefined): string {
  if (value == null || value === '') return '—'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '—'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

export function formatPct(value: string | number | null | undefined): string {
  if (value == null || value === '') return '—'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '—'
  return `${num.toFixed(1)}%`
}

export function formatNum(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('pt-BR').format(value)
}

export function pctNum(value: string | null | undefined): number {
  if (!value) return 0
  return Math.min(parseFloat(value) * 100, 100)
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function firstName(name: string | null | undefined): string {
  if (!name) return 'Vendedor'
  return name.trim().split(' ')[0]
}

/** Cor do badge baseada no % da meta */
export function metaColor(pct: number): { bg: string; text: string } {
  if (pct >= 100) return { bg: 'rgba(34,197,94,0.12)', text: '#22c55e' }
  if (pct >= 80)  return { bg: 'rgba(249,115,22,0.12)', text: '#f97316' }
  if (pct >= 50)  return { bg: 'rgba(234,179,8,0.12)', text: '#eab308' }
  return { bg: 'rgba(239,68,68,0.1)', text: '#ef4444' }
}
