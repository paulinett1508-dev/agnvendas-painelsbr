import { useMemo, useState } from 'react'
import { useDashboardLatest, usePositivacaoLatest, useVendedores } from '../hooks/useApi'
import { formatBRL, formatNum, metaColor } from '../lib/format'
import { TrendingUp, Users, DollarSign, Target, Search, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react'
import MetricCard from '../components/MetricCard'
import VendedorAvatar from '../components/VendedorAvatar'
import VendedorDrawer from '../components/VendedorDrawer'
import type { VendedorEnriquecido } from '../types'

type SortKey = 'nome' | 'meta' | 'faturamentoMes' | 'percentualMes' | 'positivacao'
type SortDir = 'asc' | 'desc'

export default function Dashboard() {
  const { data: vendedores, loading: lv } = useVendedores()
  const { data: dashboard, loading: ld, reload: reloadDash } = useDashboardLatest()
  const { data: positivacao, loading: lp } = usePositivacaoLatest()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('percentualMes')
  const [dir, setDir] = useState<SortDir>('desc')
  const [selected, setSelected] = useState<VendedorEnriquecido | null>(null)

  const loading = lv || ld || lp

  // Enrich vendedores with dashboard + positivação
  const enriched: VendedorEnriquecido[] = useMemo(() => {
    return vendedores.map((v) => ({
      ...v,
      dashboard: dashboard.find((d) => d.slpcode === v.slpcode),
      positivacao: positivacao.find((p) => p.slpcode === v.slpcode),
    }))
  }, [vendedores, dashboard, positivacao])

  // Summary metrics
  const totalFat = useMemo(() =>
    dashboard.reduce((s, d) => s + (d.faturamentoMes ? parseFloat(d.faturamentoMes) : 0), 0),
    [dashboard])
  const totalMeta = useMemo(() =>
    dashboard.reduce((s, d) => s + (d.meta ? parseFloat(d.meta) : 0), 0),
    [dashboard])
  const acimaMeta = useMemo(() =>
    dashboard.filter((d) => d.percentualMes && parseFloat(d.percentualMes) >= 1).length,
    [dashboard])
  const totalPos = useMemo(() =>
    positivacao.reduce((s, p) => s + (p.positivacaoAtual ?? 0), 0),
    [positivacao])

  // Filter + sort
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    let rows = enriched.filter((v) => {
      if (!q) return true
      return (v.nome ?? '').toLowerCase().includes(q) || v.slpcode.includes(q)
    })
    rows = [...rows].sort((a, b) => {
      let av = 0, bv = 0
      if (sort === 'nome') {
        const an = a.nome ?? '', bn = b.nome ?? ''
        return dir === 'asc' ? an.localeCompare(bn) : bn.localeCompare(an)
      }
      if (sort === 'meta')           { av = parseFloat(a.dashboard?.meta ?? '0');           bv = parseFloat(b.dashboard?.meta ?? '0') }
      if (sort === 'faturamentoMes') { av = parseFloat(a.dashboard?.faturamentoMes ?? '0'); bv = parseFloat(b.dashboard?.faturamentoMes ?? '0') }
      if (sort === 'percentualMes')  { av = parseFloat(a.dashboard?.percentualMes ?? '0');  bv = parseFloat(b.dashboard?.percentualMes ?? '0') }
      if (sort === 'positivacao')    { av = a.positivacao?.positivacaoAtual ?? 0;            bv = b.positivacao?.positivacaoAtual ?? 0 }
      return dir === 'asc' ? av - bv : bv - av
    })
    return rows
  }, [enriched, search, sort, dir])

  function toggleSort(key: SortKey) {
    if (sort === key) setDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSort(key); setDir('desc') }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sort !== col) return <ChevronUp size={12} style={{ opacity: 0.2 }} />
    return dir === 'desc'
      ? <ChevronDown size={12} style={{ color: 'var(--orange)' }} />
      : <ChevronUp size={12} style={{ color: 'var(--orange)' }} />
  }

  const capturedAt = dashboard[0]?.capturedAt
    ? new Date(dashboard[0].capturedAt).toLocaleString('pt-BR')
    : null

  return (
    <div className="flex flex-col gap-6 animate-fade-in" style={{ animationFillMode: 'forwards' }}>

      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="section-heading" style={{ fontSize: 26, marginBottom: 4 }}>Dashboard</h1>
          {capturedAt && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
              Última coleta: {capturedAt}
            </p>
          )}
        </div>
        <button
          onClick={reloadDash}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Atualizar
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Faturamento Total"
          value={formatBRL(totalFat)}
          icon={<DollarSign size={16} />}
          accent
          className="stagger-1 animate-fade-in"
        />
        <MetricCard
          label="Meta Total"
          value={formatBRL(totalMeta)}
          icon={<Target size={16} />}
          className="stagger-2 animate-fade-in"
        />
        <MetricCard
          label="Acima da Meta"
          value={`${acimaMeta} / ${vendedores.length}`}
          sub="vendedores"
          icon={<TrendingUp size={16} />}
          className="stagger-3 animate-fade-in"
        />
        <MetricCard
          label="Total Positivados"
          value={formatNum(totalPos)}
          sub="clientes"
          icon={<Users size={16} />}
          className="stagger-4 animate-fade-in"
        />
      </div>

      {/* Ranking table */}
      <div className="card overflow-hidden stagger-5 animate-fade-in">
        {/* Table header */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <h2 className="section-heading flex-1" style={{ fontSize: 15 }}>Ranking de Vendedores</h2>
          <div
            className="flex items-center gap-2 rounded-lg px-3"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', height: 36 }}
          >
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar vendedor…"
              style={{
                background: 'none',
                border: 'none',
                outline: 'none',
                fontSize: 13,
                color: 'var(--text-primary)',
                fontFamily: 'DM Sans, sans-serif',
                width: 160,
              }}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ ...th, width: 44 }}>#</th>
                <th style={{ ...th, textAlign: 'left' }}>
                  <button className="flex items-center gap-1" onClick={() => toggleSort('nome')} style={sortBtn}>
                    Vendedor <SortIcon col="nome" />
                  </button>
                </th>
                <th style={th}>
                  <button className="flex items-center gap-1 justify-end w-full" onClick={() => toggleSort('faturamentoMes')} style={sortBtn}>
                    Fat. Mês <SortIcon col="faturamentoMes" />
                  </button>
                </th>
                <th style={th}>
                  <button className="flex items-center gap-1 justify-end w-full" onClick={() => toggleSort('meta')} style={sortBtn}>
                    Meta <SortIcon col="meta" />
                  </button>
                </th>
                <th style={{ ...th, minWidth: 160 }}>
                  <button className="flex items-center gap-1 justify-end w-full" onClick={() => toggleSort('percentualMes')} style={sortBtn}>
                    % Meta <SortIcon col="percentualMes" />
                  </button>
                </th>
                <th style={th} className="hidden md:table-cell">
                  <button className="flex items-center gap-1 justify-end w-full" onClick={() => toggleSort('positivacao')} style={sortBtn}>
                    Positiv. <SortIcon col="positivacao" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {[44, undefined, undefined, undefined, undefined, undefined].map((w, j) => (
                      <td key={j} style={{ padding: '12px 16px' }}>
                        <div
                          style={{
                            height: 14,
                            width: w ?? `${40 + Math.random() * 40}%`,
                            borderRadius: 4,
                            background: 'var(--border)',
                            opacity: 0.5,
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: 14 }}>
                    Nenhum vendedor encontrado
                  </td>
                </tr>
              ) : (
                filtered.map((v, i) => {
                  const d = v.dashboard
                  const p = v.positivacao
                  const pctRaw = d?.percentualMes ? parseFloat(d.percentualMes) * 100 : 0
                  const { bg: pctBg, text: pctText } = metaColor(pctRaw)
                  const barW = Math.min(pctRaw, 100)
                  const rank = i + 1

                  return (
                    <tr
                      key={v.id}
                      onClick={() => setSelected(v)}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        transition: 'background 0.12s ease',
                      }}
                      className="hover:bg-[var(--bg-elevated)]"
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                    >
                      {/* Rank */}
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {rank <= 3 ? (
                          <span
                            style={{
                              fontFamily: 'Syne, sans-serif',
                              fontWeight: 800,
                              fontSize: 13,
                              color: rank === 1 ? '#f59e0b' : rank === 2 ? '#a0a0b2' : '#cd7c3a',
                            }}
                          >
                            {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                          </span>
                        ) : (
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--text-muted)' }}>
                            {rank}
                          </span>
                        )}
                      </td>

                      {/* Nome */}
                      <td style={{ padding: '12px 16px' }}>
                        <div className="flex items-center gap-3 min-w-0">
                          <VendedorAvatar nome={v.nome} slpcode={v.slpcode} size={32} />
                          <div className="min-w-0">
                            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>
                              {v.nome ?? `Vendedor ${v.slpcode}`}
                            </p>
                            <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
                              #{v.slpcode}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Fat Mês */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <span className="metric-value" style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                          {formatBRL(d?.faturamentoMes)}
                        </span>
                      </td>

                      {/* Meta */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <span className="metric-value" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                          {formatBRL(d?.meta)}
                        </span>
                      </td>

                      {/* % Meta */}
                      <td style={{ padding: '12px 16px' }}>
                        <div className="flex items-center gap-2 justify-end">
                          <div style={{ flex: 1, maxWidth: 80, minWidth: 50 }}>
                            <div className="progress-bar">
                              <div
                                style={{
                                  width: `${barW}%`,
                                  height: '100%',
                                  borderRadius: 2,
                                  background: `linear-gradient(90deg, ${pctText} 0%, ${pctText}99 100%)`,
                                  transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
                                }}
                              />
                            </div>
                          </div>
                          <span
                            className="metric-value"
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: pctText,
                              background: pctBg,
                              padding: '2px 7px',
                              borderRadius: 6,
                              minWidth: 52,
                              textAlign: 'right',
                            }}
                          >
                            {pctRaw > 0 ? `${pctRaw.toFixed(1)}%` : '—'}
                          </span>
                        </div>
                      </td>

                      {/* Positivação */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }} className="hidden md:table-cell">
                        <span className="metric-value" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                          {p?.positivacaoAtual != null ? formatNum(p.positivacaoAtual) : '—'}
                          {p?.baseAtiva != null && (
                            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>/{formatNum(p.baseAtiva)}</span>
                          )}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!loading && (
          <div
            style={{ padding: '10px 16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
              {filtered.length} vendedores
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Clique para ver detalhes</p>
          </div>
        )}
      </div>

      {/* Drawer */}
      <VendedorDrawer vendedor={selected} onClose={() => setSelected(null)} />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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

const sortBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'inherit',
  fontFamily: 'inherit',
  fontSize: 'inherit',
  fontWeight: 'inherit',
  letterSpacing: 'inherit',
  textTransform: 'inherit',
  padding: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
}
