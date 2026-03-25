import { useState, useMemo } from 'react'
import { usePositivacaoLatest, useVendedores } from '../hooks/useApi'
import { formatBRL, formatNum } from '../lib/format'
import { Search } from 'lucide-react'
import VendedorAvatar from '../components/VendedorAvatar'

export default function Positivacao() {
  const { data: positivacao, loading: lp } = usePositivacaoLatest()
  const { data: vendedores, loading: lv } = useVendedores()
  const [search, setSearch] = useState('')
  const loading = lp || lv

  const vendMap = useMemo(() => {
    const m: Record<string, string> = {}
    vendedores.forEach((v) => { m[v.slpcode] = v.nome ?? `Vendedor ${v.slpcode}` })
    return m
  }, [vendedores])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return positivacao
      .filter((p) => {
        if (!q) return true
        const nome = vendMap[p.slpcode] ?? ''
        return nome.toLowerCase().includes(q) || p.slpcode.includes(q)
      })
      .sort((a, b) => {
        const pctA = a.baseAtiva && a.positivacaoAtual ? a.positivacaoAtual / a.baseAtiva : 0
        const pctB = b.baseAtiva && b.positivacaoAtual ? b.positivacaoAtual / b.baseAtiva : 0
        return pctB - pctA
      })
  }, [positivacao, vendMap, search])

  return (
    <div className="flex flex-col gap-6 animate-fade-in" style={{ animationFillMode: 'forwards' }}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="section-heading" style={{ fontSize: 26, marginBottom: 4 }}>Positivação</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
            Cobertura de clientes por vendedor
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
            placeholder="Buscar vendedor…"
            style={{
              background: 'none', border: 'none', outline: 'none',
              fontSize: 13, color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif', width: 180,
            }}
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={th}>#</th>
                <th style={{ ...th, textAlign: 'left' }}>Vendedor</th>
                <th style={th}>Positivados</th>
                <th style={th}>Base Ativa</th>
                <th style={{ ...th, minWidth: 160 }}>Cobertura</th>
                <th style={th} className="hidden sm:table-cell">Qtd Vendas</th>
                <th style={th} className="hidden md:table-cell">Fat. Atual</th>
                <th style={th} className="hidden lg:table-cell">M-1</th>
                <th style={th} className="hidden lg:table-cell">M-2</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      {Array.from({ length: 9 }).map((__, j) => (
                        <td key={j} style={{ padding: '12px 16px' }}>
                          <div style={{ height: 14, width: '60%', background: 'var(--border)', borderRadius: 4, opacity: 0.5 }} />
                        </td>
                      ))}
                    </tr>
                  ))
                : filtered.map((p, i) => {
                    const nome = vendMap[p.slpcode] ?? `Vendedor ${p.slpcode}`
                    const pct = p.baseAtiva && p.positivacaoAtual
                      ? (p.positivacaoAtual / p.baseAtiva) * 100
                      : 0
                    const barColor = pct >= 70 ? '#22c55e' : pct >= 40 ? '#f97316' : '#ef4444'

                    return (
                      <tr
                        key={p.slpcode}
                        style={{ borderBottom: '1px solid var(--border-subtle)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                      >
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--text-muted)' }}>{i + 1}</span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div className="flex items-center gap-3 min-w-0">
                            <VendedorAvatar nome={nome} slpcode={p.slpcode} size={30} />
                            <div className="min-w-0">
                              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{nome}</p>
                              <p style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>#{p.slpcode}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <span className="metric-value" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{formatNum(p.positivacaoAtual)}</span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <span className="metric-value" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{formatNum(p.baseAtiva)}</span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div className="flex items-center gap-2 justify-end">
                            <div style={{ flex: 1, maxWidth: 80, minWidth: 50 }}>
                              <div className="progress-bar">
                                <div
                                  style={{
                                    width: `${Math.min(pct, 100)}%`,
                                    height: '100%',
                                    borderRadius: 2,
                                    background: barColor,
                                    transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
                                  }}
                                />
                              </div>
                            </div>
                            <span
                              className="metric-value"
                              style={{
                                fontSize: 12, fontWeight: 600,
                                color: barColor,
                                background: `${barColor}18`,
                                padding: '2px 7px', borderRadius: 6, minWidth: 50, textAlign: 'right',
                              }}
                            >
                              {pct > 0 ? `${pct.toFixed(1)}%` : '—'}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }} className="hidden sm:table-cell">
                          <span className="metric-value" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{formatNum(p.qtdVendaMesAtual)}</span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }} className="hidden md:table-cell">
                          <span className="metric-value" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{formatBRL(p.vrFatMesAtual)}</span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }} className="hidden lg:table-cell">
                          <span className="metric-value" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatBRL(p.vrFatMesAnterior1)}</span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }} className="hidden lg:table-cell">
                          <span className="metric-value" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatBRL(p.vrFatMesAnterior2)}</span>
                        </td>
                      </tr>
                    )
                  })}
            </tbody>
          </table>
        </div>
        {!loading && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-subtle)' }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
              {filtered.length} vendedores
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

const th: React.CSSProperties = {
  padding: '10px 16px',
  textAlign: 'right',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  fontFamily: 'DM Mono, monospace',
  whiteSpace: 'nowrap',
}
