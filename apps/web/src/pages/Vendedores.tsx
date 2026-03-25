import { useState, useMemo } from 'react'
import { useVendedores, useDashboardLatest, usePositivacaoLatest } from '../hooks/useApi'
import { formatBRL, metaColor } from '../lib/format'
import { Search } from 'lucide-react'
import VendedorAvatar from '../components/VendedorAvatar'
import VendedorDrawer from '../components/VendedorDrawer'
import type { VendedorEnriquecido } from '../types'

export default function Vendedores() {
  const { data: vendedores, loading: lv } = useVendedores()
  const { data: dashboard, loading: ld } = useDashboardLatest()
  const { data: positivacao, loading: lp } = usePositivacaoLatest()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<VendedorEnriquecido | null>(null)

  const loading = lv || ld || lp

  const enriched: VendedorEnriquecido[] = useMemo(() =>
    vendedores.map((v) => ({
      ...v,
      dashboard: dashboard.find((d) => d.slpcode === v.slpcode),
      positivacao: positivacao.find((p) => p.slpcode === v.slpcode),
    })),
    [vendedores, dashboard, positivacao]
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return enriched.filter((v) =>
      !q || (v.nome ?? '').toLowerCase().includes(q) || v.slpcode.includes(q)
    )
  }, [enriched, search])

  return (
    <div className="flex flex-col gap-6 animate-fade-in" style={{ animationFillMode: 'forwards' }}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="section-heading" style={{ fontSize: 26, marginBottom: 4 }}>Vendedores</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
            {vendedores.length} cadastrados
          </p>
        </div>
        <div
          className="flex items-center gap-2 rounded-lg px-3"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', height: 38 }}
        >
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou código…"
            style={{
              background: 'none', border: 'none', outline: 'none',
              fontSize: 13, color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif', width: 220,
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {loading
          ? Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="card p-4" style={{ opacity: 0.5 }}>
                <div style={{ height: 20, width: '60%', background: 'var(--border)', borderRadius: 4, marginBottom: 8 }} />
                <div style={{ height: 14, width: '40%', background: 'var(--border)', borderRadius: 4 }} />
              </div>
            ))
          : filtered.map((v) => {
              const d = v.dashboard
              const pctRaw = d?.percentualMes ? parseFloat(d.percentualMes) * 100 : 0
              const { bg: pctBg, text: pctText } = metaColor(pctRaw)
              const barW = Math.min(pctRaw, 100)

              return (
                <div
                  key={v.id}
                  className="card p-4 cursor-pointer"
                  onClick={() => setSelected(v)}
                  style={{ transition: 'border-color 0.15s, box-shadow 0.15s' }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--orange)'
                    ;(e.currentTarget as HTMLElement).style.boxShadow = '0 0 16px var(--orange-glow)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                    ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                  }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <VendedorAvatar nome={v.nome} slpcode={v.slpcode} size={40} />
                    <div className="min-w-0 flex-1">
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }} className="line-clamp-2">
                        {v.nome ?? `Vendedor ${v.slpcode}`}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', marginTop: 2 }}>
                        {v.funcao ?? 'Vendedor'} · #{v.slpcode}
                      </p>
                    </div>
                    {pctRaw > 0 && (
                      <span
                        className="metric-value shrink-0"
                        style={{ fontSize: 12, fontWeight: 600, color: pctText, background: pctBg, padding: '3px 8px', borderRadius: 6 }}
                      >
                        {pctRaw.toFixed(0)}%
                      </span>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="progress-bar mb-3">
                    <div
                      style={{
                        width: `${barW}%`,
                        height: '100%',
                        borderRadius: 2,
                        background: `linear-gradient(90deg, ${pctText}cc 0%, ${pctText} 100%)`,
                        transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 1 }}>Fat. Mês</p>
                      <p className="metric-value" style={{ fontSize: 15, color: 'var(--text-primary)' }}>
                        {formatBRL(d?.faturamentoMes)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 1 }}>Meta</p>
                      <p className="metric-value" style={{ fontSize: 15, color: 'var(--text-secondary)' }}>
                        {formatBRL(d?.meta)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
      </div>

      <VendedorDrawer vendedor={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
