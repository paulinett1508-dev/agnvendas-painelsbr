import type { ReactNode } from 'react'

interface MetricCardProps {
  label: string
  value: string
  sub?: string
  icon?: ReactNode
  accent?: boolean
  className?: string
  style?: React.CSSProperties
}

export default function MetricCard({ label, value, sub, icon, accent, className = '', style }: MetricCardProps) {
  return (
    <div
      className={`card p-4 ${className}`}
      style={{
        ...(accent ? { borderColor: 'var(--orange)', boxShadow: '0 0 16px var(--orange-glow)' } : {}),
        ...style,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', marginBottom: 6 }}>
            {label}
          </p>
          <p
            className="metric-value truncate"
            style={{ fontSize: 24, color: accent ? 'var(--orange)' : 'var(--text-primary)', lineHeight: 1 }}
          >
            {value}
          </p>
          {sub && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</p>
          )}
        </div>
        {icon && (
          <div
            className="shrink-0 flex items-center justify-center rounded-lg"
            style={{ width: 36, height: 36, background: accent ? 'var(--orange-soft)' : 'var(--bg-elevated)', color: accent ? 'var(--orange)' : 'var(--text-secondary)' }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
